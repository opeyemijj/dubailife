-- Life goals: the newcomer's path (a home, a job, school for a better job, a license, a car, friends,
-- savings, an investment, love and family), set in order after signup. Each goal's steps are checked here
-- from what the player has actually done; a goal with every step done can be claimed once for AED and XP
-- (league points, which also move the season pass). Setting the plan gives a small XP bonus once.
-- Goals, steps, rewards and the order rules mirror src/data/life/goals.json (scripts/check-life-config.mjs).

create table if not exists public.player_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  goal_order text[] not null,
  set_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.goal_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, goal_id)
);
alter table public.player_goals enable row level security;
alter table public.goal_claims enable row level security;
drop policy if exists "see own goals" on public.player_goals;
create policy "see own goals" on public.player_goals for select using (user_id = auth.uid());
drop policy if exists "see own goal claims" on public.goal_claims;
create policy "see own goal claims" on public.goal_claims for select using (user_id = auth.uid());

/** The step checks each goal needs, in order. */
create or replace function public.goal_steps(p_goal text) returns text[]
language sql immutable as $$
  select case p_goal
    when 'home' then array['home']
    when 'job' then array['blueprint', 'job', 'shift']
    when 'school' then array['course', 'lesson', 'graduated', 'betterJob']
    when 'license' then array['eye', 'theory', 'yard', 'licence']
    when 'car' then array['car', 'drove']
    when 'friends' then array['friend', 'friends3', 'game']
    when 'save' then array['blueprint', 'saved']
    when 'invest' then array['invested']
    when 'love' then array['dating', 'engaged', 'married'] end
$$;

/** {AED, XP} for each goal, and the league pillar its XP goes to. */
create or replace function public.goal_reward(p_goal text) returns int[]
language sql immutable as $$
  select case p_goal
    when 'home' then array[200, 50]
    when 'job' then array[500, 100]
    when 'school' then array[1500, 150]
    when 'license' then array[750, 100]
    when 'car' then array[500, 100]
    when 'friends' then array[300, 100]
    when 'save' then array[1000, 150]
    when 'invest' then array[2000, 200]
    when 'love' then array[1000, 150] end
$$;
create or replace function public.goal_pillar(p_goal text) returns text
language sql immutable as $$
  select case p_goal when 'school' then 'learning' when 'license' then 'learning'
    when 'home' then 'wellbeing' when 'friends' then 'wellbeing' when 'love' then 'wellbeing' else 'career' end
$$;

/** The savings target: three months of your budget, or AED 15,000 before you've planned one. */
create or replace function public.goal_save_target(p_user uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce((select 3 * public.blueprint_monthly(p_user, blueprint) from life_state where user_id = p_user and blueprint is not null), 15000)::bigint
$$;

/** Everything a goal step can check, for the signed-in player. */
create or replace function public.goal_checks() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id)
  select jsonb_build_object(
    'home', public.has_home(me.id),
    'blueprint', exists (select 1 from life_state where user_id = me.id and blueprint is not null),
    'job', exists (select 1 from venture_staff where user_id = me.id),
    'shift', exists (select 1 from venture_staff where user_id = me.id and last_shift_day is not null)
          or exists (select 1 from profiles where id = me.id and citizen -> 'job' ->> 'lastShiftAt' is not null),
    'course', exists (select 1 from academy_enrolments where user_id = me.id),
    'lesson', exists (select 1 from academy_enrolments where user_id = me.id and passed > 0),
    'graduated', public.has_course(me.id),
    'degree', public.has_degree(me.id),
    'betterJob', exists (select 1 from venture_staff s join venture_jobs j on j.id = s.job_id where s.user_id = me.id and j.requirement <> 'none'),
    'eye', exists (select 1 from driving_progress where user_id = me.id and eye_passed_at is not null),
    'theory', exists (select 1 from driving_progress where user_id = me.id and theory_passed_at is not null),
    'yard', exists (select 1 from driving_progress where user_id = me.id and yard_passed_at is not null),
    'licence', public.has_licence(me.id),
    'car', exists (select 1 from owned_cars where user_id = me.id) or exists (select 1 from car_rentals where user_id = me.id),
    'drove', exists (select 1 from car_parkings where user_id = me.id),
    'friend', exists (select 1 from friendships where me.id in (user_id, friend_id)),
    'friends3', (select count(*) from friendships where me.id in (user_id, friend_id)) >= 3,
    'game', exists (select 1 from game_results where user_id = me.id),
    'saved', (select balance from profiles where id = me.id) >= public.goal_save_target(me.id),
    'invested', exists (select 1 from property_purchases where user_id = me.id)
             or exists (select 1 from venture_members where user_id = me.id and role in ('owner', 'partner')),
    'dating', exists (select 1 from relationships where me.id in (man_id, woman_id)),
    'engaged', exists (select 1 from relationships where me.id in (man_id, woman_id) and engaged_at is not null),
    'married', exists (select 1 from relationships where me.id in (man_id, woman_id) and married_at is not null),
    'saveTarget', public.goal_save_target(me.id)
  ) from me
$$;
grant execute on function public.goal_checks() to authenticated;

/** Your plan (null until you've set one), what you've done, and which goals you've claimed. */
create or replace function public.goal_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order', (select to_jsonb(goal_order) from player_goals where user_id = auth.uid()),
    'setAt', (select set_at from player_goals where user_id = auth.uid()),
    'checks', public.goal_checks(),
    'claimed', coalesce((select jsonb_agg(goal_id) from goal_claims where user_id = auth.uid()), '[]'::jsonb)
  )
$$;
grant execute on function public.goal_status() to authenticated;

/** Set (or change) the order of your goals: every goal once, a home then a job first, a license before a car. */
create or replace function public.set_goals(p_order text[]) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); all_goals text[] := array['home', 'job', 'school', 'license', 'car', 'friends', 'save', 'invest', 'love'];
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if array_length(p_order, 1) is distinct from array_length(all_goals, 1)
     or not (p_order @> all_goals and all_goals @> p_order) then raise exception 'bad_goals'; end if;
  if p_order[1] <> 'home' or p_order[2] <> 'job' then raise exception 'bad_order'; end if;
  if array_position(p_order, 'car') < array_position(p_order, 'license') then raise exception 'bad_order'; end if;
  insert into player_goals (user_id, goal_order) values (me, p_order)
    on conflict (user_id) do update set goal_order = excluded.goal_order, updated_at = now();
  -- Setting your plan the first time: 50 XP.
  perform public.add_points(me, 'career', 50, 'goal:plan:' || me);
end $$;
grant execute on function public.set_goals(text[]) to authenticated;

/** Claim a goal once all its steps are done: its AED and XP. Returns {aed, xp}. */
create or replace function public.claim_goal(p_goal text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c jsonb := public.goal_checks(); steps text[] := public.goal_steps(p_goal); r int[] := public.goal_reward(p_goal); k text; xp int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if steps is null then raise exception 'bad_goal'; end if;
  foreach k in array steps loop
    if not coalesce((c ->> k)::boolean, false) then raise exception 'not_done'; end if;
  end loop;
  insert into goal_claims (user_id, goal_id) values (me, p_goal) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  if r[1] > 0 then perform coin_move(me, r[1], 'grant', 'Goal reached', 'goal:' || p_goal); end if;
  xp := public.add_points(me, public.goal_pillar(p_goal), r[2], 'goal:' || p_goal || ':' || me);
  return jsonb_build_object('aed', r[1], 'xp', xp);
end $$;
grant execute on function public.claim_goal(text) to authenticated;
