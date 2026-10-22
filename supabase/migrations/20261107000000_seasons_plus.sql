-- Season pass, Dubai Plus and cosmetics (design spec 19.5, US-7.4; Phase 5).
--
-- Cosmetics (titles, avatar frames, badges) are owned on the server; names live in
-- src/data/seasons/seasons.json. Season XP is the league points a player scores during the season
-- (score_events), so nothing new is tracked. 20 levels of 150 XP. Free track: a title every 5th level,
-- AED 300 on the others. Premium track (season pass or Dubai Plus): frames, titles and the season badge,
-- cosmetic only.
--
-- Dubai Plus (monthly): premium track included, 2 streak freezes a week instead of 1, a Plus badge and a
-- monthly frame. Both are bought through the payments pipeline (fulfilled when the payment is confirmed).

insert into public.app_settings (key, value) values ('premium', '{"season_pass_aed": 29, "plus_monthly_aed": 19}')
on conflict (key) do nothing;

alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments add constraint payments_purpose_check check (purpose in ('coins', 'venue_subscription', 'ad_campaign', 'season_pass', 'plus'));

create table if not exists public.player_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,                          -- title:<season>:<n> | frame:<season>:<n> | badge:<season> | badge:plus | frame:plus:<yyyymm>
  source text not null,
  equipped boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.player_cosmetics enable row level security;
drop policy if exists "cosmetics are public" on public.player_cosmetics;
create policy "cosmetics are public" on public.player_cosmetics for select using (true);

create table if not exists public.season_passes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id text not null,
  bought_at timestamptz not null default now(),
  primary key (user_id, season_id)
);
create table if not exists public.season_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id text not null,
  level int not null,
  track text not null check (track in ('free', 'premium')),
  created_at timestamptz not null default now(),
  primary key (user_id, season_id, level, track)
);
create table if not exists public.plus_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  active_until timestamptz not null,
  started_at timestamptz not null default now()
);
alter table public.season_passes enable row level security;
alter table public.season_claims enable row level security;
alter table public.plus_members enable row level security;
drop policy if exists "see own passes" on public.season_passes;
create policy "see own passes" on public.season_passes for select using (user_id = auth.uid());
drop policy if exists "see own claims" on public.season_claims;
create policy "see own claims" on public.season_claims for select using (user_id = auth.uid());
drop policy if exists "see own plus" on public.plus_members;
create policy "see own plus" on public.plus_members for select using (user_id = auth.uid());

/** Season dates (mirror of seasons.json). */
create or replace function public.season_window(p_season text) returns tstzrange
language sql immutable as $$
  select case p_season
    when 's1' then tstzrange('2026-10-19T05:00:00Z', '2026-12-14T05:00:00Z')
    when 's2' then tstzrange('2026-12-14T05:00:00Z', '2027-02-08T05:00:00Z')
  end
$$;
create or replace function public.current_season() returns text
language sql stable as $$
  select s from unnest(array['s1', 's2']) s where public.season_window(s) @> now() limit 1
$$;

/** The reward for a level on a track: {"item": id} or {"aed": n}. */
create or replace function public.season_reward(p_season text, p_level int, p_track text) returns jsonb
language sql immutable as $$
  select case
    when p_level < 1 or p_level > 20 then null
    when p_track = 'free' and p_level % 5 = 0 then jsonb_build_object('item', 'title:' || p_season || ':' || (p_level / 5 - 1))
    when p_track = 'free' then '{"aed": 300}'::jsonb
    when p_level = 20 then jsonb_build_object('item', 'badge:' || p_season)
    when p_level % 2 = 0 then jsonb_build_object('item', 'frame:' || p_season || ':' || (p_level / 2 - 1))
    else jsonb_build_object('item', 'title:' || p_season || ':' || (4 + (p_level - 1) / 2))
  end
$$;

create or replace function public.is_plus(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plus_members where user_id = p_user and active_until > now())
$$;
grant execute on function public.is_plus(uuid) to authenticated;

create or replace function public.has_premium(p_user uuid, p_season text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_plus(p_user) or exists (select 1 from season_passes where user_id = p_user and season_id = p_season)
$$;

create or replace function public.season_xp(p_user uuid, p_season text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from score_events where user_id = p_user and public.season_window(p_season) @> created_at
$$;

/** The current season for the signed-in player: XP, level, what's claimed, premium status, cosmetics. */
create or replace function public.my_season() returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (select public.current_season() id)
  select jsonb_build_object(
    'season', (select id from s),
    'xp', public.season_xp(auth.uid(), (select id from s)),
    'premium', public.has_premium(auth.uid(), (select id from s)),
    'plus', public.is_plus(auth.uid()),
    'plusUntil', (select active_until from plus_members where user_id = auth.uid()),
    'claimed', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'track', track)) from season_claims where user_id = auth.uid() and season_id = (select id from s)), '[]'::jsonb),
    'cosmetics', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'equipped', equipped) order by created_at) from player_cosmetics where user_id = auth.uid()), '[]'::jsonb),
    'prices', setting('premium')
  )
$$;
grant execute on function public.my_season() to authenticated;

create or replace function public.grant_cosmetic(p_user uuid, p_item text, p_source text) returns void
language sql security definer set search_path = public as $$
  insert into player_cosmetics (user_id, item_id, source) values (p_user, p_item, p_source) on conflict do nothing
$$;
revoke all on function public.grant_cosmetic(uuid, text, text) from public, anon, authenticated;

create or replace function public.claim_season_reward(p_level int, p_track text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); sid text := public.current_season(); r jsonb;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if sid is null then raise exception 'no_season'; end if;
  if p_track not in ('free', 'premium') then raise exception 'invalid_track'; end if;
  if p_track = 'premium' and not public.has_premium(me, sid) then raise exception 'needs_premium'; end if;
  if public.season_xp(me, sid) < p_level * 150 then raise exception 'level_locked'; end if;
  r := public.season_reward(sid, p_level, p_track);
  if r is null then raise exception 'invalid_level'; end if;
  insert into season_claims (user_id, season_id, level, track) values (me, sid, p_level, p_track) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  if r ? 'aed' then perform coin_move(me, (r ->> 'aed')::bigint, 'grant', 'Season reward: level ' || p_level, 'season:' || sid || ':' || p_level || ':' || p_track);
  else perform public.grant_cosmetic(me, r ->> 'item', 'season:' || sid); end if;
  return r;
end $$;
grant execute on function public.claim_season_reward(int, text) to authenticated;

/** Wear a title or frame (one of each kind at a time). Null item takes it off. */
create or replace function public.equip_cosmetic(p_kind text, p_item text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if p_kind not in ('title', 'frame', 'badge') then raise exception 'invalid_kind'; end if;
  if p_item is not null and (split_part(p_item, ':', 1) <> p_kind or not exists (select 1 from player_cosmetics where user_id = me and item_id = p_item)) then
    raise exception 'not_owned';
  end if;
  update player_cosmetics set equipped = (item_id = p_item) where user_id = me and split_part(item_id, ':', 1) = p_kind;
end $$;
grant execute on function public.equip_cosmetic(text, text) to authenticated;

/** Monthly Plus frame. */
create or replace function public.claim_plus_frame() returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); item text := 'frame:plus:' || to_char(now() at time zone 'Asia/Dubai', 'YYYYMM');
begin
  if not public.is_plus(me) then raise exception 'needs_plus'; end if;
  perform public.grant_cosmetic(me, item, 'plus');
  return item;
end $$;
grant execute on function public.claim_plus_frame() to authenticated;

-- ---------------------------------------------------------------- buying

create or replace function public.create_season_pass_payment() returns uuid
language plpgsql security definer set search_path = public as $$
declare sid text := public.current_season(); price numeric := (setting('premium') ->> 'season_pass_aed')::numeric; p uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if sid is null then raise exception 'no_season'; end if;
  if public.has_premium(auth.uid(), sid) then raise exception 'already_premium'; end if;
  insert into payments (user_id, purpose, ref, description, amount_aed) values (auth.uid(), 'season_pass', sid, 'Season pass · ' || sid, price) returning id into p;
  return p;
end $$;
grant execute on function public.create_season_pass_payment() to authenticated;

create or replace function public.create_plus_payment() returns uuid
language plpgsql security definer set search_path = public as $$
declare price numeric := (setting('premium') ->> 'plus_monthly_aed')::numeric; p uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into payments (user_id, purpose, ref, description, amount_aed) values (auth.uid(), 'plus', 'month', 'Dubai Plus · 1 month', price) returning id into p;
  return p;
end $$;
grant execute on function public.create_plus_payment() to authenticated;

create or replace function public.fulfill_payment(p_payment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare pay payments;
begin
  select * into pay from payments where id = p_payment for update;
  if pay.id is null then raise exception 'payment_missing'; end if;
  if pay.status <> 'paid' or pay.fulfilled_at is not null then return; end if;  -- idempotent
  if pay.purpose = 'coins' then
    perform coin_move(pay.user_id, (pay.meta ->> 'coins')::bigint + coalesce((pay.meta ->> 'bonus')::bigint, 0), 'purchase', pay.description, pay.id::text);
  elsif pay.purpose = 'venue_subscription' then
    update venue_subscriptions set status = 'active', cancel_at_period_end = false,
      current_period_end = greatest(coalesce(current_period_end, now()), now()) + interval '1 month'
    where id = pay.ref::uuid;
  elsif pay.purpose = 'ad_campaign' then
    update ad_campaigns set status = 'pending_review' where id = pay.ref::uuid and status = 'pending_payment';
  elsif pay.purpose = 'season_pass' then
    insert into season_passes (user_id, season_id) values (pay.user_id, pay.ref) on conflict do nothing;
  elsif pay.purpose = 'plus' then
    insert into plus_members (user_id, active_until) values (pay.user_id, now() + interval '1 month')
      on conflict (user_id) do update set active_until = greatest(plus_members.active_until, now()) + interval '1 month';
    perform public.grant_cosmetic(pay.user_id, 'badge:plus', 'plus');
  end if;
  update payments set fulfilled_at = now() where id = p_payment;
end $$;
revoke all on function public.fulfill_payment(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- streak freezes

alter table public.life_state add column if not exists freeze_week int;
alter table public.life_state add column if not exists freezes_used int not null default 0;

/** Streak after a tick: +1 for consecutive days; missed days are covered by streak freezes (1 a week,
    2 with Dubai Plus); otherwise the streak keeps half. */
create or replace function public.apply_streak() returns trigger
language plpgsql security definer set search_path = public as $$
declare ticks int := public.life_day(new.settled_at) - public.life_day(old.settled_at); missed int; allowed int; w int := public.league_week(new.settled_at);
begin
  if ticks <= 0 then return new; end if;
  if coalesce(new.freeze_week, -1) <> w then new.freeze_week := w; new.freezes_used := 0; end if;
  missed := ticks - 1;
  allowed := case when public.is_plus(new.user_id) then 2 else 1 end - new.freezes_used;
  if missed = 0 then new.streak := old.streak + 1;
  elsif missed <= allowed then new.streak := old.streak + 1; new.freezes_used := new.freezes_used + missed;
  else new.streak := greatest(1, old.streak / 2);
  end if;
  return new;
end $$;
drop trigger if exists apply_streak on public.life_state;
create trigger apply_streak before update of settled_at on public.life_state for each row execute function public.apply_streak();
