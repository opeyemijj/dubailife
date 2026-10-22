-- The Driving Academy (design spec section 8, Phase 2): stage 1 eye & reflex test, stage 2 theory exam
-- (20 questions, 80% to pass, graded on the server from src/data/driving/theory.json), stage 3 Smart Yard.
-- Passing all three issues a provisional in-game licence; stage 4 (highway road test) comes later.
-- Storage: one row per learner. The licence unlocks car options in the Blueprint.

create table if not exists public.driving_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  eye_passed_at timestamptz,
  theory_passed_at timestamptz,
  theory_score int,
  yard_passed_at timestamptz,
  road_passed_at timestamptz,
  licence_no text unique,
  issued_at timestamptz,
  attempts int not null default 0
);
alter table public.driving_progress enable row level security;
drop policy if exists "see own driving" on public.driving_progress;
create policy "see own driving" on public.driving_progress for select using (user_id = auth.uid());

create or replace function public.has_licence(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from driving_progress where user_id = p_user and issued_at is not null)
$$;

/** Records a stage result. Stages go in order: eye, theory, yard. Issues the licence after the yard. */
create or replace function public.driving_record(p_user uuid, p_stage text, p_passed boolean, p_score int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d driving_progress;
begin
  insert into driving_progress (user_id) values (p_user) on conflict do nothing;
  select * into d from driving_progress where user_id = p_user for update;
  if p_stage = 'theory' and d.eye_passed_at is null then raise exception 'eye_first'; end if;
  if p_stage = 'yard' and d.theory_passed_at is null then raise exception 'theory_first'; end if;
  if p_stage not in ('eye', 'theory', 'yard') then raise exception 'invalid_stage'; end if;
  if not p_passed then
    update driving_progress set attempts = attempts + 1 where user_id = p_user returning * into d;
  elsif p_stage = 'eye' then
    update driving_progress set eye_passed_at = coalesce(eye_passed_at, now()) where user_id = p_user returning * into d;
  elsif p_stage = 'theory' then
    update driving_progress set theory_passed_at = coalesce(theory_passed_at, now()), theory_score = greatest(coalesce(theory_score, 0), p_score) where user_id = p_user returning * into d;
  else
    update driving_progress set yard_passed_at = coalesce(yard_passed_at, now()),
      issued_at = coalesce(issued_at, now()),
      licence_no = coalesce(licence_no, 'DL-' || lpad((floor(random() * 1000000))::int::text, 6, '0'))
    where user_id = p_user returning * into d;
  end if;
  return to_jsonb(d) - 'user_id';
end $$;
revoke all on function public.driving_record(uuid, text, boolean, int) from public, anon, authenticated;

/** The app reports a stage. The eye test and Smart Yard are played in the app; the theory exam may only be
    self-reported while academy.self_grading is on (until /api/driving/theory has the service key). */
create or replace function public.driving_record_self(p_stage text, p_passed boolean, p_score int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_stage = 'theory' and not coalesce((setting('academy') ->> 'self_grading')::boolean, false) then raise exception 'server_grading_only'; end if;
  return public.driving_record(auth.uid(), p_stage, p_passed, p_score);
end $$;
revoke all on function public.driving_record_self(text, boolean, int) from public, anon;
grant execute on function public.driving_record_self(text, boolean, int) to authenticated;

-- The Blueprint's car options now check the licence on the server.
create or replace function public.set_blueprint(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rem int; clean jsonb;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if public.blueprint_price('housing', p->>'housing') is null or public.blueprint_price('commute', p->>'commute') is null
     or public.blueprint_price('telecom', p->>'telecom') is null or public.blueprint_price('fitness', p->>'fitness') is null then
    raise exception 'invalid_blueprint';
  end if;
  if p->>'commute' <> 'metro_card' and not public.has_licence(uid) then raise exception 'needs_licence'; end if;
  rem := coalesce((p->>'remittance')::int, 0);
  if rem < 0 or rem > 10000 or rem % 500 <> 0 then raise exception 'invalid_remittance'; end if;
  clean := jsonb_build_object('housing', p->>'housing', 'commute', p->>'commute', 'telecom', p->>'telecom', 'fitness', p->>'fitness', 'remittance', rem);
  insert into life_state (user_id, blueprint) values (uid, clean)
    on conflict (user_id) do update set blueprint = excluded.blueprint,
      settled_at = case when life_state.blueprint is null then now() else life_state.settled_at end;
  return public.life_status(uid);
end $$;

-- life_status also reports the licence, so the app can unlock car options.
create or replace function public.life_status(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'blueprint', s.blueprint,
    'monthly', public.blueprint_monthly(s.user_id, s.blueprint),
    'daily', ceil(public.blueprint_monthly(s.user_id, s.blueprint) / 30.0)::int,
    'hasHome', public.has_home(s.user_id),
    'hasLicence', public.has_licence(s.user_id),
    'visaTier', s.visa_tier,
    'visaDaysLeft', s.visa_days_left,
    'debt', s.debt,
    'streak', s.streak,
    'balance', p.balance,
    'nextTickAt', to_timestamp(((public.life_day(now()) + 1) * 86400) + 5 * 3600)
  )
  from life_state s join profiles p on p.id = s.user_id where s.user_id = p_user
$$;
