-- Trust and safety (design spec section 15, Phase 0): block and report players, delete your own account,
-- and give a date of birth if the account was made before the 21+ age gate.
-- Only transactional rows live here (who blocked whom, each report); report reasons are a fixed list in the app.

-- ---------------------------------------------------------------- blocks

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
drop policy if exists "see own blocks" on public.user_blocks;
create policy "see own blocks" on public.user_blocks for select using (blocker_id = auth.uid());

/** True when either player has blocked the other. */
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function public.block_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_user = auth.uid() then raise exception 'cannot_block_self'; end if;
  insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
  -- Blocking ends any friendship or pending request between the two.
  delete from friendships where (user_id = auth.uid() and friend_id = p_user) or (user_id = p_user and friend_id = auth.uid());
end $$;

create or replace function public.unblock_user(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from user_blocks where blocker_id = auth.uid() and blocked_id = p_user
$$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid) from public;
grant execute on function public.block_user(uuid), public.unblock_user(uuid) to authenticated;

-- Blocked players can't message, friend, pay or knock on each other.
create or replace function public.refuse_if_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'messages' then a := new.from_id; b := new.to_id;
  elsif tg_table_name = 'transfers' then a := new.from_id; b := new.to_id;
  elsif tg_table_name = 'friendships' then a := new.user_id; b := new.friend_id;
  elsif tg_table_name = 'entry_requests' then
    a := new.visitor_id;
    if exists (select 1 from flats f where f.id = new.flat_id
               and (public.is_blocked(a, f.owner_id) or public.is_blocked(a, f.tenant_id))) then
      raise exception 'blocked';
    end if;
    return new;
  end if;
  if a is not null and b is not null and public.is_blocked(a, b) then raise exception 'blocked'; end if;
  return new;
end $$;

drop trigger if exists refuse_blocked on public.messages;
create trigger refuse_blocked before insert on public.messages for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_blocked on public.transfers;
create trigger refuse_blocked before insert on public.transfers for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_blocked on public.friendships;
create trigger refuse_blocked before insert on public.friendships for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_blocked on public.entry_requests;
create trigger refuse_blocked before insert on public.entry_requests for each row execute function public.refuse_if_blocked();

-- ---------------------------------------------------------------- reports

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  target_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('harassment', 'hate', 'sexual', 'scam', 'spam', 'underage', 'other')),
  context text check (char_length(context) <= 120),     -- where it happened, e.g. 'chat', 'venue:white-dubai'
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists reports_open_idx on public.reports (created_at) where status = 'open';
alter table public.reports enable row level security;
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports for select using (public.is_admin());
drop policy if exists "admins review reports" on public.reports;
create policy "admins review reports" on public.reports for update using (public.is_admin());

create or replace function public.report_user(p_user uuid, p_reason text, p_context text default null, p_details text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_user = auth.uid() then raise exception 'cannot_report_self'; end if;
  -- A brake on report spam: 10 a day per player.
  if (select count(*) from reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_reports';
  end if;
  insert into reports (reporter_id, target_id, reason, context, details)
  values (auth.uid(), p_user, p_reason, left(p_context, 120), left(p_details, 500));
end $$;
revoke all on function public.report_user(uuid, text, text, text) from public;
grant execute on function public.report_user(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------- delete my account (PDPL, App Store 5.1.1(v))

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from admins where user_id = uid) then raise exception 'admins_cannot_self_delete'; end if;
  -- Everything the player owns cascades from auth.users; flats they owned or rented go back on the market.
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- date of birth for accounts made before the gate

/** Saves a date of birth once (it can't be changed after, so a refused player can't retry with another
    date). Returns whether the player is 21 or older. */
create or replace function public.set_my_dob(p_dob date) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from auth.users where id = uid and raw_user_meta_data ? 'date_of_birth') then raise exception 'already_set'; end if;
  if p_dob is null or p_dob < date '1900-01-01' then raise exception 'invalid_dob'; end if;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('date_of_birth', p_dob),
    updated_at = now() where id = uid;
  return p_dob <= (current_date - interval '21 years')::date;
end $$;
revoke all on function public.set_my_dob(date) from public;
grant execute on function public.set_my_dob(date) to authenticated;
