-- Daily missions, the mystery box, savings and payday. Every game day (09:00 GST to 09:00, life_day) you
-- get three missions picked from where you are: one for your current goal, one for work or study, one social.
-- Each is checked against what you did that day and pays 20 XP; doing all three opens the daily mystery box
-- (AED 100 at 50%, 250 at 30%, 500 at 15%, 1,000 at 5%, plus 40 XP; the odds are shown in the game).
-- The savings jar holds money moved out of your wallet; it counts toward the Save up goal. Payday: when
-- Friday's wages arrive the game offers to move a share into the jar.
-- Numbers mirror src/data/life/missions.json (scripts/check-life-config.mjs).

create table if not exists public.mission_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day int not null,
  mission text not null,
  amount bigint not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, day, mission)
);
alter table public.mission_claims enable row level security;
drop policy if exists "see own mission claims" on public.mission_claims;
create policy "see own mission claims" on public.mission_claims for select using (user_id = auth.uid());

create table if not exists public.player_savings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  amount bigint not null default 0 check (amount >= 0),
  payday_seen text,
  updated_at timestamptz not null default now()
);
alter table public.player_savings enable row level security;
drop policy if exists "see own savings" on public.player_savings;
create policy "see own savings" on public.player_savings for select using (user_id = auth.uid());

/** Did you do this mission on game day d? */
create or replace function public.mission_done(p_user uuid, p_mission text, d int) returns boolean
language sql stable security definer set search_path = public as $$
  select case p_mission
    when 'shift' then exists (select 1 from venture_staff where user_id = p_user and last_shift_day = d)
    when 'apply' then exists (select 1 from job_applications where user_id = p_user and public.life_day(created_at) = d)
                   or exists (select 1 from venture_staff where user_id = p_user and public.life_day(hired_at) = d)
    when 'lesson' then exists (select 1 from score_events where user_id = p_user and source like 'lesson:%' and public.life_day(created_at) = d)
    when 'driving' then exists (select 1 from score_events where user_id = p_user and source like 'driving-theory:%' and public.life_day(created_at) = d)
                     or exists (select 1 from driving_progress where user_id = p_user and d in (public.life_day(eye_passed_at), public.life_day(theory_passed_at), public.life_day(yard_passed_at), public.life_day(issued_at)))
    when 'drive' then exists (select 1 from car_parkings where user_id = p_user and public.life_day(parked_at) = d)
    when 'friend' then exists (select 1 from friendships where p_user in (user_id, friend_id) and public.life_day(created_at) = d)
    when 'message' then exists (select 1 from messages where from_id = p_user and public.life_day(created_at) = d)
    when 'game' then exists (select 1 from game_results where user_id = p_user and public.life_day(created_at) = d)
    when 'date' then exists (select 1 from love_dates_counted c join relationships r on r.id = c.relationship_id where p_user in (r.man_id, r.woman_id) and c.day = d)
    else false end
$$;

/** Today's three missions: one for your current goal, one for work or study, one social. */
create or replace function public.mission_picks(p_user uuid, d int) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare cur text; working boolean; has_car boolean; dating boolean; m1 text; m2 text; m3 text; social text[] := array['game', 'message', 'friend']; i int;
begin
  select g into cur from player_goals p, unnest(p.goal_order) with ordinality as o(g, n)
    where p.user_id = p_user and not exists (select 1 from goal_claims c where c.user_id = p_user and c.goal_id = o.g) order by o.n limit 1;
  working := exists (select 1 from venture_staff where user_id = p_user);
  has_car := public.has_licence(p_user) and (exists (select 1 from owned_cars where user_id = p_user and coalesce(impounded_until < now(), true))
             or exists (select 1 from car_rentals where user_id = p_user and returned_at is null and ends_at > now()));
  dating := exists (select 1 from relationships where p_user in (man_id, woman_id) and status in ('dating', 'engaged', 'married'));
  m1 := case coalesce(cur, 'job')
    when 'school' then 'lesson'
    when 'license' then 'driving'
    when 'car' then case when has_car then 'drive' else 'driving' end
    when 'friends' then 'friend'
    when 'love' then case when dating then 'date' else 'message' end
    else case when working then 'shift' else 'apply' end end;
  m2 := case when working then 'shift' else 'apply' end;
  if m2 = m1 then m2 := 'lesson'; end if;
  if m2 = m1 then m2 := 'shift'; end if;
  i := d % 3;
  for k in 0..2 loop
    m3 := social[((i + k) % 3) + 1];
    exit when m3 <> m1 and m3 <> m2;
  end loop;
  return array[m1, m2, m3];
end $$;

/** Today's missions, which are done and collected, and the mystery box. */
create or replace function public.my_missions() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); d int := public.life_day(now()); picks text[]; out jsonb := '[]'::jsonb; m text; all_done boolean := true; done boolean;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  picks := public.mission_picks(me, d);
  foreach m in array picks loop
    done := public.mission_done(me, m, d);
    all_done := all_done and done;
    out := out || jsonb_build_object('id', m, 'done', done, 'claimed', exists (select 1 from mission_claims where user_id = me and day = d and mission = m));
  end loop;
  return jsonb_build_object('day', d, 'missions', out,
    'box', jsonb_build_object('ready', all_done, 'claimed', exists (select 1 from mission_claims where user_id = me and day = d and mission = 'box'),
      'aed', (select amount from mission_claims where user_id = me and day = d and mission = 'box')),
    'nextAt', to_timestamp((d + 1) * 86400 + 5 * 3600));
end $$;
grant execute on function public.my_missions() to authenticated;

/** Collect today's finished missions (20 XP each) and, once all three are done, the mystery box. Returns {xp, box}. */
create or replace function public.claim_missions() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d int := public.life_day(now()); picks text[]; m text; xp int := 0; all_done boolean := true; r numeric; prize bigint := null;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  picks := public.mission_picks(me, d);
  foreach m in array picks loop
    if public.mission_done(me, m, d) then
      insert into mission_claims (user_id, day, mission) values (me, d, m) on conflict do nothing;
      if found then
        xp := xp + public.add_points(me, case when m in ('shift', 'apply') then 'career' when m in ('lesson', 'driving') then 'learning' else 'wellbeing' end,
                                     20, 'mission:' || d || ':' || m || ':' || me);
      end if;
    else all_done := false;
    end if;
  end loop;
  if all_done and not exists (select 1 from mission_claims where user_id = me and day = d and mission = 'box') then
    r := random() * 100;
    prize := case when r < 50 then 100 when r < 80 then 250 when r < 95 then 500 else 1000 end;
    insert into mission_claims (user_id, day, mission, amount) values (me, d, 'box', prize);
    perform coin_move(me, prize, 'grant', 'Daily mystery box', 'box:' || d || ':' || me);
    xp := xp + public.add_points(me, 'wellbeing', 40, 'box:' || d || ':' || me);
  end if;
  return jsonb_build_object('xp', xp, 'box', prize);
end $$;
grant execute on function public.claim_missions() to authenticated;

-- ---------------------------------------------------------------- savings and payday

/** Your savings jar, and your latest wages (with whether you've seen that payday yet). */
create or replace function public.my_savings() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'amount', coalesce((select amount from player_savings where user_id = auth.uid()), 0),
    'payday', (select jsonb_build_object('ref', l.ref, 'amount', l.delta, 'reason', l.reason, 'at', l.created_at,
                 'seen', l.ref = (select payday_seen from player_savings where user_id = auth.uid()))
               from coin_ledger l where l.user_id = auth.uid() and l.ref like 'payroll:%' and l.created_at > now() - interval '7 days'
               order by l.created_at desc limit 1)
  )
$$;
grant execute on function public.my_savings() to authenticated;

/** Move money from your wallet into savings (positive) or back out (negative). */
create or replace function public.move_savings(p_amount bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cur bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_amount = 0 then raise exception 'bad_amount'; end if;
  insert into player_savings (user_id) values (me) on conflict do nothing;
  select amount into cur from player_savings where user_id = me for update;
  if p_amount < 0 and -p_amount > cur then raise exception 'not_enough_saved'; end if;
  perform coin_move(me, -p_amount, case when p_amount > 0 then 'transfer_out' else 'transfer_in' end,
                    case when p_amount > 0 then 'Moved to savings' else 'Taken from savings' end, 'savings:' || me || ':' || extract(epoch from clock_timestamp()));
  update player_savings set amount = amount + p_amount, updated_at = now() where user_id = me returning amount into cur;
  return cur;
end $$;
grant execute on function public.move_savings(bigint) to authenticated;

/** You've seen this payday (whether or not you saved some of it). */
create or replace function public.seen_payday(p_ref text) returns void
language sql security definer set search_path = public as $$
  insert into player_savings (user_id, payday_seen) values (auth.uid(), p_ref)
  on conflict (user_id) do update set payday_seen = excluded.payday_seen
$$;
grant execute on function public.seen_payday(text) to authenticated;

-- The goal checks from *_goals.sql stay as the base; savings are layered on top (renamed once, so re-runs are safe).
do $$ begin
  if to_regprocedure('public.goal_checks_base()') is null then alter function public.goal_checks() rename to goal_checks_base; end if;
end $$;

/** Savings now count toward the Save up goal: wallet plus jar against the target. */
create or replace function public.goal_checks() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id)
  select public.goal_checks_base() || jsonb_build_object(
    'saved', (select balance from profiles where id = me.id) + coalesce((select amount from player_savings where user_id = me.id), 0) >= public.goal_save_target(me.id),
    'savings', coalesce((select amount from player_savings where user_id = me.id), 0)
  ) from me
$$;
grant execute on function public.goal_checks() to authenticated;
