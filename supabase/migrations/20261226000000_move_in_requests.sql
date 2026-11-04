-- Moving in together needs a yes (user, 2026-11-05): asking sends a request; your partner moves in when they accept.
-- The direct move_in_together is no longer callable by players; accepting a request does the move.

create table if not exists public.move_in_requests (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,   -- whose home it is
  to_id uuid not null references public.profiles (id) on delete cascade,     -- who's asked to move in
  relationship_id bigint not null references public.relationships (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index if not exists move_in_requests_one_pending on public.move_in_requests (relationship_id) where status = 'pending';
alter table public.move_in_requests enable row level security;
drop policy if exists "the two see their move-in requests" on public.move_in_requests;
create policy "the two see their move-in requests" on public.move_in_requests for select using (auth.uid() in (from_id, to_id));

-- The move itself (internal): the guest gets the keys to the host's home.
create or replace function public.couple_move_in(p_host uuid, p_guest uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r relationships; f text;
begin
  r := public.rel_with(p_host, p_guest);
  if r.id is null or r.status = 'ended' then raise exception 'not_together'; end if;
  select id into f from flats
    where owner_id = p_host or (tenant_id = p_host and (tenant_until is null or tenant_until > now())) or home_of = p_host
    order by (owner_id = p_host) desc, updated_at desc limit 1;
  if f is null then raise exception 'no_home'; end if;
  delete from flat_guests where user_id = p_guest and flat_id in (select flat_id from couple_homes where relationship_id = r.id and flat_id <> f);
  insert into couple_homes (relationship_id, flat_id, host_id) values (r.id, f, p_host)
    on conflict (relationship_id) do update set flat_id = excluded.flat_id, host_id = excluded.host_id, created_at = now();
  insert into flat_guests (flat_id, user_id, can_edit) values (f, p_guest, true)
    on conflict (flat_id, user_id) do update set can_edit = true;
  return f;
end $$;
revoke all on function public.couple_move_in(uuid, uuid) from public, anon, authenticated;
-- No more moving someone in without asking.
revoke execute on function public.move_in_together(uuid) from public, anon, authenticated;

-- Ask my partner to move into my home.
create or replace function public.ask_move_in(p_partner uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships; id bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  r := public.rel_with(me, p_partner);
  if r.id is null or r.status = 'ended' then raise exception 'not_together'; end if;
  if not exists (select 1 from flats where owner_id = me or (tenant_id = me and (tenant_until is null or tenant_until > now())) or home_of = me) then
    raise exception 'no_home';
  end if;
  if exists (select 1 from move_in_requests where relationship_id = r.id and status = 'pending') then raise exception 'already_asked'; end if;
  insert into move_in_requests (from_id, to_id, relationship_id) values (me, p_partner, r.id) returning move_in_requests.id into id;
  return id;
end $$;
grant execute on function public.ask_move_in(uuid) to authenticated;

-- Say yes (you move in) or no; the one who asked can take it back.
create or replace function public.respond_move_in(p_request bigint, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); q move_in_requests; f text;
begin
  select * into q from move_in_requests where id = p_request for update;
  if q.id is null or q.status <> 'pending' then raise exception 'not_found'; end if;
  if me = q.from_id and not p_accept then
    update move_in_requests set status = 'cancelled', responded_at = now() where id = q.id;
    return null;
  end if;
  if me <> q.to_id then raise exception 'not_yours'; end if;
  if p_accept then f := public.couple_move_in(q.from_id, q.to_id); end if;
  update move_in_requests set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = q.id;
  return f;
end $$;
grant execute on function public.respond_move_in(bigint, boolean) to authenticated;

-- Requests waiting on me, or on my partners.
create or replace function public.my_move_in_requests() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'incoming', q.to_id = auth.uid(),
    'partner', case when q.to_id = auth.uid() then q.from_id else q.to_id end,
    'partnerName', (select username from profiles where id = case when q.to_id = auth.uid() then q.from_id else q.to_id end),
    'createdAt', q.created_at) order by q.created_at), '[]'::jsonb)
  from move_in_requests q where q.status = 'pending' and auth.uid() in (q.from_id, q.to_id)
$$;
grant execute on function public.my_move_in_requests() to authenticated;

-- My shared homes, now with the partner's name.
create or replace function public.my_household() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'partner', public.partner_of(r, auth.uid()), 'partnerName', (select username from profiles where id = public.partner_of(r, auth.uid())),
    'flat', f.id, 'building', f.building_id, 'unit', f.unit, 'type', f.property_type,
    'host', h.host_id = auth.uid())), '[]'::jsonb)
  from couple_homes h join relationships r on r.id = h.relationship_id join flats f on f.id = h.flat_id
  where auth.uid() in (r.man_id, r.woman_id) and r.status <> 'ended'
$$;

-- Both are told at once (their own channel): the app reloads their love life.
create or replace function public.tg_move_in_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(new.from_id, 'love', tg_op);
  perform public.notify_user(new.to_id, 'love', tg_op);
  return null;
exception when others then return null;
end $$;
drop trigger if exists move_in_notify on public.move_in_requests;
create trigger move_in_notify after insert or update on public.move_in_requests for each row execute function public.tg_move_in_notify();
