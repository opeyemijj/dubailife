-- Invite friends (design spec 19.3, US-7.2). A share link carries the sharer's username (?ref=); the new
-- player is linked once they have a citizen, and both are paid when the new player reaches 3 active days.
-- An inviter is rewarded at most 20 times a calendar month. Referral AED never scores tournament points.

update public.app_settings set value = value || '{"referral": 10000}'::jsonb where key = 'app_bonus' and not (value ? 'referral');

create table if not exists public.referrals (
  invitee_id uuid primary key references public.profiles (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  amount bigint,
  check (invitee_id <> inviter_id)
);
create index if not exists referrals_inviter on public.referrals (inviter_id, rewarded_at);
alter table public.referrals enable row level security;
drop policy if exists "see own referrals" on public.referrals;
create policy "see own referrals" on public.referrals for select using (inviter_id = auth.uid() or invitee_id = auth.uid());

alter table public.life_state add column if not exists active_days int not null default 0;

/** Links the signed-in (new) player to whoever invited them. Only within a week of joining. */
create or replace function public.claim_referral(p_username text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inviter uuid;
begin
  if me is null then return false; end if;
  select id into inviter from profiles where username = lower(trim(p_username));
  if inviter is null or inviter = me then return false; end if;
  if not exists (select 1 from profiles where id = me and created_at > now() - interval '7 days') then return false; end if;
  insert into referrals (invitee_id, inviter_id) values (me, inviter) on conflict do nothing;
  return found;
end $$;
grant execute on function public.claim_referral(text) to authenticated;

/** Pays both players once the invitee has played 3 days. */
create or replace function public.pay_referral(p_invitee uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r referrals; amt bigint := coalesce((setting('app_bonus') ->> 'referral')::bigint, 0); invitee_name text;
begin
  select * into r from referrals where invitee_id = p_invitee and rewarded_at is null for update;
  if r.invitee_id is null or amt <= 0 then return; end if;
  if (select count(*) from referrals where inviter_id = r.inviter_id and rewarded_at >= date_trunc('month', now())) >= 20 then return; end if;
  select username into invitee_name from profiles where id = p_invitee;
  update referrals set rewarded_at = now(), amount = amt where invitee_id = p_invitee;
  perform coin_move(r.inviter_id, amt, 'grant', 'Invite reward: @' || invitee_name || ' joined', 'referral:' || p_invitee);
  perform coin_move(p_invitee, amt, 'grant', 'Welcome reward: joined with a friend''s invite', 'referral:' || p_invitee || ':invitee');
end $$;
revoke all on function public.pay_referral(uuid) from public, anon, authenticated;

-- Counts active days as the 09:00 tick settles; the third pays any referral.
create or replace function public.count_active_day() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.life_day(new.settled_at) > public.life_day(old.settled_at) then
    new.active_days := old.active_days + 1;
    if new.active_days = 3 then perform public.pay_referral(new.user_id); end if;
  end if;
  return new;
end $$;
drop trigger if exists count_active_day on public.life_state;
create trigger count_active_day before update on public.life_state for each row execute function public.count_active_day();

create or replace function public.my_referrals() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reward', coalesce((setting('app_bonus') ->> 'referral')::bigint, 0),
    'invited', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'rewarded', r.rewarded_at is not null) order by r.created_at desc)
      from referrals r join profiles p on p.id = r.invitee_id where r.inviter_id = auth.uid()), '[]'::jsonb)
  )
$$;
grant execute on function public.my_referrals() to authenticated;
