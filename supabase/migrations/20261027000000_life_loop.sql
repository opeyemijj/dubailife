-- The core life loop (design spec sections 5 and 11, Phase 1): the Sustainability Blueprint, the daily
-- 09:00 GST living-cost tick (charged only for active days, at most 3 days per absence), the visa clock
-- with overstay fines, and visa tiers 1-3.
--
-- Storage: one small row per player (life_state). Options, prices and visa lengths are static config in
-- src/data/life/*.json; the database keeps only the prices it must charge, in blueprint_monthly() below
-- (scripts/check-life-config.mjs checks they match the JSON).
--
-- The tick is settled lazily when the player opens the app (life_sync), so absent players cost nothing:
-- no cron, no rows written for inactive accounts.

create table if not exists public.life_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  blueprint jsonb,                                  -- {housing, commute, telecom, fitness, remittance}; null until chosen
  visa_tier text not null default 'VISIT' check (visa_tier in ('VISIT', 'STUDENT', 'EMPLOYMENT', 'FREELANCE', 'GOLDEN')),
  visa_days_left int not null default 30,           -- active days left on the visa
  debt bigint not null default 0 check (debt >= 0), -- unpaid living costs (no interest)
  streak int not null default 0,                    -- consecutive active days
  settled_at timestamptz not null default now(),    -- last 09:00 GST boundary charged
  last_yield_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.life_state enable row level security;
drop policy if exists "see own life" on public.life_state;
create policy "see own life" on public.life_state for select using (user_id = auth.uid());

/** Monthly AED for one Blueprint option (mirror of src/data/life/blueprint.json). Null = unknown option. */
create or replace function public.blueprint_price(p_kind text, p_id text) returns int
language sql immutable as $$
  select case p_kind
    when 'housing' then case p_id when 'bed_space' then 800 when 'studio' then 2500 when 'one_bedroom' then 7000 when 'penthouse' then 18000 when 'villa' then 45000 end
    when 'commute' then case p_id when 'metro_card' then 350 when 'economy_rental' then 1500 when 'leased_sedan' then 4500 when 'supercar' then 8000 end
    when 'telecom' then case p_id when 'prepaid' then 75 when 'postpaid_5g' then 450 end
    when 'fitness' then case p_id when 'calisthenics' then 0 when 'gym' then 350 when 'spa' then 1200 end
  end
$$;

/** Days a visa tier lasts (mirror of src/data/life/visas.json). */
create or replace function public.visa_days(p_tier text) returns int
language sql immutable as $$
  select case p_tier when 'VISIT' then 30 when 'STUDENT' then 90 when 'EMPLOYMENT' then 730 when 'FREELANCE' then 1825 when 'GOLDEN' then 3650 end
$$;

/** True when the player owns or rents a home in the city; their real rent replaces Blueprint housing. */
create or replace function public.has_home(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from flats where owner_id = p_user or (tenant_id = p_user and (tenant_until is null or tenant_until > now())))
$$;

/** Monthly living cost for a Blueprint. Housing is free when the player already has a home. */
create or replace function public.blueprint_monthly(p_user uuid, p jsonb) returns int
language sql stable security definer set search_path = public as $$
  select case when p is null then 0 else
    (case when public.has_home(p_user) then 0 else coalesce(public.blueprint_price('housing', p->>'housing'), 0) end)
    + coalesce(public.blueprint_price('commute', p->>'commute'), 0)
    + coalesce(public.blueprint_price('telecom', p->>'telecom'), 0)
    + coalesce(public.blueprint_price('fitness', p->>'fitness'), 0)
    + coalesce((p->>'remittance')::int, 0)
  end
$$;

/** Index of the GST "day" that starts at 09:00 GST (05:00 UTC). */
create or replace function public.life_day(t timestamptz) returns int
language sql immutable as $$
  select floor((extract(epoch from t) - 5 * 3600) / 86400)::int
$$;

/** The player's life state, as the app shows it. */
create or replace function public.life_status(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'blueprint', s.blueprint,
    'monthly', public.blueprint_monthly(s.user_id, s.blueprint),
    'daily', ceil(public.blueprint_monthly(s.user_id, s.blueprint) / 30.0)::int,
    'hasHome', public.has_home(s.user_id),
    'visaTier', s.visa_tier,
    'visaDaysLeft', s.visa_days_left,
    'debt', s.debt,
    'streak', s.streak,
    'balance', p.balance,
    'nextTickAt', to_timestamp(((public.life_day(now()) + 1) * 86400) + 5 * 3600)
  )
  from life_state s join profiles p on p.id = s.user_id where s.user_id = p_user
$$;

/** Settles every 09:00 GST tick since the last visit and returns what happened plus the current state.
    Called when the app opens. Away time is charged for at most 3 days, and the visa clock pauses too. */
create or replace function public.life_sync() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s life_state;
  ticks int; charged int; daily int; fines int := 0; cost bigint; paid bigint; bal bigint;
  overstay_days int := 0; yield bigint := 0; expired text := null;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from profiles where id = uid) then return null; end if;
  insert into life_state (user_id) values (uid) on conflict do nothing;
  select * into s from life_state where user_id = uid for update;

  ticks := public.life_day(now()) - public.life_day(s.settled_at);
  if ticks <= 0 then
    return jsonb_build_object('ticks', 0) || public.life_status(uid);
  end if;

  -- Never chose a Blueprint: after 3 days the default (studio, metro card) is set for them.
  if s.blueprint is null and s.created_at < now() - interval '3 days' then
    s.blueprint := '{"housing":"studio","commute":"metro_card","telecom":"prepaid","fitness":"calisthenics","remittance":0}'::jsonb;
  end if;
  if s.blueprint is null then
    -- Nothing is charged (and the visa clock doesn't run) until there is a Blueprint.
    update life_state set settled_at = now() where user_id = uid;
    return jsonb_build_object('ticks', ticks, 'charged', 0) || public.life_status(uid);
  end if;

  charged := least(ticks, 3);
  daily := ceil(public.blueprint_monthly(uid, s.blueprint) / 30.0)::int;

  -- Visa clock: counts active days only. Visit and student visas run into overstay fines; employment and
  -- freelance visas fall back to a visit visa (a 30-day grace) when they run out.
  if s.visa_tier in ('VISIT', 'STUDENT') then
    overstay_days := greatest(0, charged - s.visa_days_left);
    fines := overstay_days * 50;
    s.visa_days_left := greatest(0, s.visa_days_left - charged);
  elsif s.visa_tier in ('EMPLOYMENT', 'FREELANCE') then
    s.visa_days_left := s.visa_days_left - charged;
    if s.visa_days_left <= 0 then expired := s.visa_tier; s.visa_tier := 'VISIT'; s.visa_days_left := 30; end if;
  end if;

  cost := daily::bigint * charged + fines + s.debt;
  select balance into bal from profiles where id = uid;
  paid := least(bal, cost);
  if paid > 0 then
    perform coin_move(uid, -paid, 'spend',
      format('Living costs, %s day%s%s', charged, case when charged = 1 then '' else 's' end,
             case when fines > 0 then format(' + overstay fines AED %s', fines) else '' end),
      'life:tick:' || to_char(now() at time zone 'Asia/Dubai', 'YYYY-MM-DD'));
  end if;
  s.debt := cost - paid;

  -- Streak: +1 for each consecutive day; an absence keeps half (spec section 14.2).
  s.streak := case when ticks = 1 then s.streak + 1 else greatest(1, s.streak / 2) end;

  -- Financial Discipline Yield: 90+ days of runway earns 10% a year on savings, paid weekly, max AED 5,000.
  bal := bal - paid;
  if daily > 0 and s.debt = 0 and bal / daily >= 90 and (s.last_yield_at is null or s.last_yield_at < now() - interval '7 days') then
    yield := least(5000, floor(bal * 0.10 / 52));
    if yield > 0 then
      perform coin_move(uid, yield, 'earn', 'Financial Discipline Yield (90+ days of runway)', 'life:yield:' || to_char(now(), 'IYYY-IW'));
      s.last_yield_at := now();
    end if;
  end if;

  update life_state set blueprint = s.blueprint, visa_tier = s.visa_tier, visa_days_left = s.visa_days_left, debt = s.debt,
    streak = s.streak, last_yield_at = s.last_yield_at, settled_at = now()
  where user_id = uid;

  return jsonb_build_object('ticks', ticks, 'charged', charged, 'livingCost', daily::bigint * charged, 'fines', fines,
    'overstayDays', overstay_days, 'paid', paid, 'yield', yield, 'visaExpired', expired) || public.life_status(uid);
end $$;

/** Saves the Blueprint. Car options need a driving licence (coming with the Driving Academy). */
create or replace function public.set_blueprint(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rem int; clean jsonb;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if public.blueprint_price('housing', p->>'housing') is null or public.blueprint_price('commute', p->>'commute') is null
     or public.blueprint_price('telecom', p->>'telecom') is null or public.blueprint_price('fitness', p->>'fitness') is null then
    raise exception 'invalid_blueprint';
  end if;
  if p->>'commute' <> 'metro_card'
     and not exists (select 1 from profiles where id = uid and citizen ? 'drivingLicence') then
    raise exception 'needs_licence';
  end if;
  rem := coalesce((p->>'remittance')::int, 0);
  if rem < 0 or rem > 10000 or rem % 500 <> 0 then raise exception 'invalid_remittance'; end if;
  clean := jsonb_build_object('housing', p->>'housing', 'commute', p->>'commute', 'telecom', p->>'telecom', 'fitness', p->>'fitness', 'remittance', rem);
  insert into life_state (user_id, blueprint) values (uid, clean)
    on conflict (user_id) do update set blueprint = excluded.blueprint,
      -- The first Blueprint starts the clock now, so days before it are never charged.
      settled_at = case when life_state.blueprint is null then now() else life_state.settled_at end;
  return public.life_status(uid);
end $$;

/** Moves up the visa ladder when the player qualifies. Tiers 4-5 arrive with the Phase 4 economy. */
create or replace function public.claim_visa(p_tier text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur text; rank_now int; rank_new int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into life_state (user_id) values (uid) on conflict do nothing;
  select visa_tier into cur from life_state where user_id = uid;
  rank_now := array_position(array['VISIT','STUDENT','EMPLOYMENT','FREELANCE','GOLDEN'], cur);
  rank_new := array_position(array['VISIT','STUDENT','EMPLOYMENT','FREELANCE','GOLDEN'], p_tier);
  if rank_new is null then raise exception 'invalid_tier'; end if;
  if p_tier = 'STUDENT' then
    -- Renewing a student visa is allowed; the course must be graduated.
    if rank_now > rank_new then raise exception 'already_higher'; end if;
    if not exists (select 1 from academy_enrolments where user_id = uid and graduated_at is not null) then raise exception 'needs_diploma'; end if;
  elsif p_tier = 'EMPLOYMENT' then
    if rank_now >= rank_new then raise exception 'already_higher'; end if;
    if not exists (select 1 from profiles where id = uid and citizen ? 'job' and citizen->'job' <> 'null'::jsonb) then raise exception 'needs_job'; end if;
  else
    raise exception 'coming_soon';
  end if;
  update life_state set visa_tier = p_tier, visa_days_left = public.visa_days(p_tier) where user_id = uid;
  return public.life_status(uid);
end $$;

revoke all on function public.life_sync(), public.set_blueprint(jsonb), public.claim_visa(text) from public;
grant execute on function public.life_sync(), public.set_blueprint(jsonb), public.claim_visa(text) to authenticated;
revoke all on function public.life_status(uuid), public.blueprint_monthly(uuid, jsonb), public.has_home(uuid) from public, anon, authenticated;
