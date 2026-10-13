-- ComeToDubai: shared city state — citizens, flats, access and knocking.
-- Every table has row-level security. Money and ownership only change through the
-- SECURITY DEFINER functions below, which lock the rows they touch so concurrent
-- purchases of the same flat can't both succeed.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- citizens

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  balance bigint not null default 50000 check (balance >= 0),
  -- look, traits, dream, starter-home furniture, inventory, job… (client-owned game state)
  citizen jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Balance changes go through adjust_balance / property functions only.
create or replace function public.protect_balance() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    -- Starting grants depend on the starter home (AED 30k–100k); nothing above that.
    new.balance := least(greatest(new.balance, 0), 100000);
  elsif current_setting('app.balance_change', true) is distinct from 'on' then
    new.balance := old.balance;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_protect_balance on public.profiles;
create trigger profiles_protect_balance before insert or update on public.profiles
  for each row execute function public.protect_balance();

create or replace function public.set_balance_internal(p_user uuid, p_delta bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  perform set_config('app.balance_change', 'on', true);
  update profiles set balance = balance + p_delta where id = p_user returning balance into v_balance;
  if v_balance is null then raise exception 'profile_missing'; end if;
  if v_balance < 0 then raise exception 'insufficient_funds'; end if;
  perform set_config('app.balance_change', 'off', true);
  return v_balance;
end $$;
revoke all on function public.set_balance_internal(uuid, bigint) from public, anon, authenticated;

-- Game spending/earning (shops, fares, wages, top-ups). Returns the new balance.
create or replace function public.adjust_balance(p_delta bigint) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if abs(p_delta) > 100000000 then raise exception 'amount_out_of_range'; end if;
  return set_balance_internal(auth.uid(), p_delta);
end $$;
grant execute on function public.adjust_balance(bigint) to authenticated;

-- ---------------------------------------------------------------- friends

create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select using (auth.uid() in (user_id, friend_id));
drop policy if exists "send friend request" on public.friendships;
create policy "send friend request" on public.friendships for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "accept friend request" on public.friendships;
create policy "accept friend request" on public.friendships for update using (friend_id = auth.uid()) with check (friend_id = auth.uid());
drop policy if exists "remove friendship" on public.friendships;
create policy "remove friendship" on public.friendships for delete using (auth.uid() in (user_id, friend_id));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted' and ((user_id = a and friend_id = b) or (user_id = b and friend_id = a))
  )
$$;

-- ---------------------------------------------------------------- flats

create table if not exists public.flats (
  id text primary key,                         -- '<building-id>:<unit>'
  building_id text not null,                   -- id of the building on the city map
  unit text not null,                          -- '1201', or 'Villa' for single homes
  floor int,
  property_type text not null,                 -- Studio · 1 Bedroom · … · Penthouse · Villa
  bedrooms int not null default 0,
  size_sqft int not null,
  view text,
  -- Ownership: a player, an NPC (seeded neighbour) or the developer (both null).
  owner_id uuid references public.profiles (id) on delete set null,
  owner_npc text,
  -- Tenancy: who lives there if not the owner.
  tenant_id uuid references public.profiles (id) on delete set null,
  tenant_npc text,
  tenant_until timestamptz,
  listing text not null default 'none' check (listing in ('none', 'rent', 'sale', 'rent_or_sale')),
  rent_price bigint check (rent_price is null or rent_price > 0),   -- AED per month
  sale_price bigint check (sale_price is null or sale_price > 0),   -- AED
  access text not null default 'private' check (access in ('public', 'friends', 'invite', 'private')),
  interior jsonb not null default '{"furniture": []}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (building_id, unit)
);
create index if not exists flats_building on public.flats (building_id);
alter table public.flats enable row level security;

-- Listing information is public; interiors are only served through get_flat_interior.
drop policy if exists "flats are listed publicly" on public.flats;
create policy "flats are listed publicly" on public.flats for select using (true);
-- Column-level: everything except the interior.
revoke select on public.flats from anon, authenticated;
grant select (id, building_id, unit, floor, property_type, bedrooms, size_sqft, view, owner_id, owner_npc,
  tenant_id, tenant_npc, tenant_until, listing, rent_price, sale_price, access, updated_at) on public.flats to anon, authenticated;
revoke insert, update, delete on public.flats from anon, authenticated;

create table if not exists public.flat_guests (
  flat_id text not null references public.flats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (flat_id, user_id)
);
alter table public.flat_guests enable row level security;

create table if not exists public.entry_requests (
  id uuid primary key default gen_random_uuid(),
  flat_id text not null references public.flats (id) on delete cascade,
  visitor_id uuid not null references public.profiles (id) on delete cascade,
  visitor_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists entry_requests_flat on public.entry_requests (flat_id, status);
alter table public.entry_requests enable row level security;

create or replace function public.is_flat_manager(p_flat text, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from flats f where f.id = p_flat and (f.owner_id = p_user or f.tenant_id = p_user))
$$;

drop policy if exists "managers see guests" on public.flat_guests;
create policy "managers see guests" on public.flat_guests for select
  using (user_id = auth.uid() or public.is_flat_manager(flat_id, auth.uid()));
drop policy if exists "managers add guests" on public.flat_guests;
create policy "managers add guests" on public.flat_guests for insert with check (public.is_flat_manager(flat_id, auth.uid()));
drop policy if exists "managers change guests" on public.flat_guests;
create policy "managers change guests" on public.flat_guests for update using (public.is_flat_manager(flat_id, auth.uid()));
drop policy if exists "managers remove guests" on public.flat_guests;
create policy "managers remove guests" on public.flat_guests for delete using (public.is_flat_manager(flat_id, auth.uid()));

drop policy if exists "visitor or manager sees requests" on public.entry_requests;
create policy "visitor or manager sees requests" on public.entry_requests for select
  using (visitor_id = auth.uid() or public.is_flat_manager(flat_id, auth.uid()));

-- Whether a user may walk into a flat right now, and whether they may change it.
create or replace function public.flat_permissions(p_flat text, p_user uuid)
returns table (can_enter boolean, can_edit boolean, reason text)
language plpgsql stable security definer set search_path = public as $$
declare f flats; g flat_guests; resident uuid;
begin
  select * into f from flats where id = p_flat;
  if not found then return query select false, false, 'not_found'; return; end if;
  if p_user is not null and (f.owner_id = p_user or f.tenant_id = p_user) then
    return query select true, true, 'resident'; return;
  end if;
  select * into g from flat_guests where flat_id = p_flat and user_id = p_user;
  if found and g.can_edit then return query select true, true, 'editor'; return; end if;
  -- Empty flats on the market can be inspected.
  if f.owner_id is null and f.owner_npc is null and f.tenant_id is null and f.tenant_npc is null then
    return query select f.listing <> 'none', false, case when f.listing <> 'none' then 'viewing' else 'not_listed' end; return;
  end if;
  if exists (select 1 from entry_requests r where r.flat_id = p_flat and r.visitor_id = p_user
             and r.status = 'approved' and r.responded_at > now() - interval '2 hours') then
    return query select true, false, 'approved'; return;
  end if;
  if f.access = 'public' then return query select true, false, 'public'; return; end if;
  resident := coalesce(f.tenant_id, f.owner_id);
  if f.access = 'friends' and resident is not null and are_friends(resident, p_user) then
    return query select true, false, 'friend'; return;
  end if;
  if f.access in ('invite', 'friends') and g.user_id is not null then
    return query select true, false, 'invited'; return;
  end if;
  -- Visitors may inspect an occupied flat whose owner has listed it for sale.
  if f.listing in ('sale', 'rent_or_sale') and f.tenant_id is null and f.tenant_npc is null then
    return query select true, false, 'viewing'; return;
  end if;
  return query select false, false, f.access;
end $$;
grant execute on function public.flat_permissions(text, uuid) to anon, authenticated;

create or replace function public.get_flat_interior(p_flat text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; v jsonb;
begin
  select * into p from flat_permissions(p_flat, auth.uid());
  if not p.can_enter then raise exception 'access_denied:%', p.reason; end if;
  select interior into v from flats where id = p_flat;
  return jsonb_build_object('interior', v, 'can_edit', p.can_edit, 'reason', p.reason);
end $$;
grant execute on function public.get_flat_interior(text) to anon, authenticated;

create or replace function public.save_flat_interior(p_flat text, p_interior jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from flat_permissions(p_flat, auth.uid());
  if not p.can_edit then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_interior -> 'furniture') is distinct from 'array' then raise exception 'bad_interior'; end if;
  update flats set interior = p_interior, updated_at = now() where id = p_flat;
end $$;
grant execute on function public.save_flat_interior(text, jsonb) to authenticated;

-- Buy a flat that is for sale. Locks the row; pays the selling player if there is one.
create or replace function public.buy_flat(p_flat text) returns public.flats
language plpgsql security definer set search_path = public as $$
declare f flats; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into f from flats where id = p_flat for update;
  if not found then raise exception 'not_found'; end if;
  if f.listing not in ('sale', 'rent_or_sale') or f.sale_price is null then raise exception 'not_for_sale'; end if;
  if f.owner_id = me then raise exception 'already_owner'; end if;
  perform set_balance_internal(me, -f.sale_price);
  if f.owner_id is not null then perform set_balance_internal(f.owner_id, f.sale_price); end if;
  update flats set owner_id = me, owner_npc = null, listing = 'none',
    -- A buyer moves in unless a player tenant still has a running lease.
    tenant_id = case when tenant_id is not null and tenant_until > now() then tenant_id else null end,
    tenant_npc = null,
    tenant_until = case when tenant_id is not null and tenant_until > now() then tenant_until else null end,
    interior = case when owner_npc is not null or owner_id is null then '{"furniture": []}'::jsonb else interior end,
    updated_at = now()
  where id = p_flat returning * into f;
  delete from flat_guests where flat_id = p_flat;
  return f;
end $$;
grant execute on function public.buy_flat(text) to authenticated;

-- Rent a flat that is for rent, for a number of months paid up front.
create or replace function public.rent_flat(p_flat text, p_months int default 1) returns public.flats
language plpgsql security definer set search_path = public as $$
declare f flats; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_months not between 1 and 12 then raise exception 'bad_term'; end if;
  select * into f from flats where id = p_flat for update;
  if not found then raise exception 'not_found'; end if;
  if f.listing not in ('rent', 'rent_or_sale') or f.rent_price is null then raise exception 'not_for_rent'; end if;
  if (f.tenant_id is not null and f.tenant_until > now()) or f.tenant_npc is not null then raise exception 'already_rented'; end if;
  if f.owner_id = me then raise exception 'already_owner'; end if;
  perform set_balance_internal(me, -(f.rent_price * p_months));
  if f.owner_id is not null then perform set_balance_internal(f.owner_id, f.rent_price * p_months); end if;
  update flats set tenant_id = me, tenant_npc = null, tenant_until = now() + make_interval(days => 30 * p_months),
    listing = case when listing = 'rent_or_sale' then 'sale' else 'none' end, updated_at = now()
  where id = p_flat returning * into f;
  return f;
end $$;
grant execute on function public.rent_flat(text, int) to authenticated;

-- Owners list their flat for rent and/or sale (or take it off the market).
create or replace function public.list_flat(p_flat text, p_listing text, p_rent bigint, p_sale bigint) returns public.flats
language plpgsql security definer set search_path = public as $$
declare f flats;
begin
  select * into f from flats where id = p_flat for update;
  if f.owner_id is distinct from auth.uid() then raise exception 'not_owner'; end if;
  if p_listing not in ('none', 'rent', 'sale', 'rent_or_sale') then raise exception 'bad_listing'; end if;
  if p_listing in ('rent', 'rent_or_sale') and (p_rent is null or p_rent <= 0) then raise exception 'rent_price_required'; end if;
  if p_listing in ('sale', 'rent_or_sale') and (p_sale is null or p_sale <= 0) then raise exception 'sale_price_required'; end if;
  if p_listing in ('rent', 'rent_or_sale') and f.tenant_id is not null and f.tenant_until > now() then raise exception 'already_rented'; end if;
  update flats set listing = p_listing,
    rent_price = case when p_listing in ('rent', 'rent_or_sale') then p_rent else rent_price end,
    sale_price = case when p_listing in ('sale', 'rent_or_sale') then p_sale else sale_price end,
    updated_at = now()
  where id = p_flat returning * into f;
  return f;
end $$;
grant execute on function public.list_flat(text, text, bigint, bigint) to authenticated;

create or replace function public.set_flat_access(p_flat text, p_access text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_flat_manager(p_flat, auth.uid()) then raise exception 'not_allowed'; end if;
  if p_access not in ('public', 'friends', 'invite', 'private') then raise exception 'bad_access'; end if;
  update flats set access = p_access, updated_at = now() where id = p_flat;
end $$;
grant execute on function public.set_flat_access(text, text) to authenticated;

-- Invite (or grant editing to) a player by username.
create or replace function public.add_flat_guest(p_flat text, p_username text, p_can_edit boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not is_flat_manager(p_flat, auth.uid()) then raise exception 'not_allowed'; end if;
  select id into v from profiles where username = lower(trim(leading '@' from p_username));
  if v is null then raise exception 'user_not_found'; end if;
  insert into flat_guests (flat_id, user_id, can_edit) values (p_flat, v, p_can_edit)
  on conflict (flat_id, user_id) do update set can_edit = excluded.can_edit;
end $$;
grant execute on function public.add_flat_guest(text, text, boolean) to authenticated;

-- Knock on a flat. Returns the request; NPC residents answer straight away.
create or replace function public.request_entry(p_flat text, p_note text default null) returns public.entry_requests
language plpgsql security definer set search_path = public as $$
declare f flats; me uuid := auth.uid(); r entry_requests; who text; npc text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into f from flats where id = p_flat;
  if not found then raise exception 'not_found'; end if;
  select display_name into who from profiles where id = me;
  -- Don't stack knocks: reuse a recent pending one.
  select * into r from entry_requests where flat_id = p_flat and visitor_id = me and status = 'pending'
    and created_at > now() - interval '10 minutes' order by created_at desc limit 1;
  if found then return r; end if;
  insert into entry_requests (flat_id, visitor_id, visitor_name, note) values (p_flat, me, coalesce(who, 'A visitor'), left(p_note, 140))
  returning * into r;
  npc := coalesce(f.tenant_npc, case when f.tenant_id is null then f.owner_npc end);
  if npc is not null then
    -- NPC neighbours are friendly most of the time.
    update entry_requests set status = case when random() < 0.8 then 'approved' else 'denied' end, responded_at = now()
    where id = r.id returning * into r;
  end if;
  return r;
end $$;
grant execute on function public.request_entry(text, text) to authenticated;

create or replace function public.respond_entry(p_request uuid, p_approve boolean) returns public.entry_requests
language plpgsql security definer set search_path = public as $$
declare r entry_requests;
begin
  select * into r from entry_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if not is_flat_manager(r.flat_id, auth.uid()) then raise exception 'not_allowed'; end if;
  if r.status <> 'pending' then return r; end if;
  update entry_requests set status = case when p_approve then 'approved' else 'denied' end, responded_at = now()
  where id = p_request returning * into r;
  return r;
end $$;
grant execute on function public.respond_entry(uuid, boolean) to authenticated;

-- Live updates for knocks (flats are not broadcast: rows include private interiors).
do $$ begin
  begin alter publication supabase_realtime add table public.entry_requests; exception when duplicate_object then null; end;
end $$;
