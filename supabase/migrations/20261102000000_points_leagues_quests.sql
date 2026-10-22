-- Points, weekly leagues and friend quests (design spec sections 13.2, 19.4, US-7.3; Phase 3).
--
-- score_events: one row per scored action, written only by triggers on things the server already records
-- (a lesson or exam passed, a scam reported or avoided, a multiplayer win, an active day at Peak
-- Performer). Daily caps per pillar. This is the ledger the monthly tournament will read too.
--
-- Leagues: each week players who score are placed in a bracket of up to 30 in their tier (Bronze to
-- Diamond). At the end of the week the top 7 move up and the bottom 5 move down. Worked out lazily when the
-- player next scores, so nothing runs for idle players.
--
-- Friend quests: each week, two friends who both score 100+ points can each claim a reward once.

-- ---------------------------------------------------------------- points

/** League week: Monday 09:00 GST to Monday 09:00 GST. */
create or replace function public.league_week(t timestamptz default now()) returns int
language sql immutable as $$ select floor((public.life_day(t) - 4) / 7.0)::int $$;

create table if not exists public.score_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week int not null,
  pillar text not null check (pillar in ('learning', 'scam', 'wellbeing', 'career')),
  points int not null check (points > 0),
  source text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists score_events_user_week on public.score_events (user_id, week);
alter table public.score_events enable row level security;
drop policy if exists "see own points" on public.score_events;
create policy "see own points" on public.score_events for select using (user_id = auth.uid());

/** Adds points once per source, within the pillar's daily cap (learning 200, scam 100, wellbeing 100, career 200). */
create or replace function public.add_points(p_user uuid, p_pillar text, p_points int, p_source text) returns int
language plpgsql security definer set search_path = public as $$
declare cap int := case p_pillar when 'learning' then 200 when 'scam' then 100 when 'wellbeing' then 100 else 200 end;
        today int; give int;
begin
  select coalesce(sum(points), 0) into today from score_events
    where user_id = p_user and pillar = p_pillar and public.life_day(created_at) = public.life_day(now());
  give := least(p_points, cap - today);
  if give <= 0 then return 0; end if;
  insert into score_events (user_id, week, pillar, points, source) values (p_user, public.league_week(), p_pillar, give, p_source)
    on conflict (source) do nothing;
  if not found then return 0; end if;
  perform public.league_add(p_user, give);
  return give;
end $$;
revoke all on function public.add_points(uuid, text, int, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- leagues

create table if not exists public.league_members (
  week int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier int not null check (tier between 1 and 5),     -- 1 Bronze, 2 Silver, 3 Gold, 4 Platinum, 5 Diamond
  bracket int not null,
  points int not null default 0,
  result text check (result in ('up', 'down', 'stay')),  -- set when the next week starts for this player
  joined_at timestamptz not null default now(),
  primary key (week, user_id)
);
create index if not exists league_members_bracket on public.league_members (week, tier, bracket);
alter table public.league_members enable row level security;
drop policy if exists "see own league" on public.league_members;
create policy "see own league" on public.league_members for select using (user_id = auth.uid());

/** Where a player finished in a past week: up, down or stay. */
create or replace function public.league_result(p_week int, p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  with me as (select * from league_members where week = p_week and user_id = p_user),
  br as (
    select m.user_id, m.points, rank() over (order by m.points desc, m.joined_at) rk, count(*) over () n
    from league_members m join me on m.week = me.week and m.tier = me.tier and m.bracket = me.bracket
  )
  select case
    when (select tier from me) < 5 and rk <= 7 and points > 0 then 'up'
    when (select tier from me) > 1 and n >= 10 and rk > n - 5 then 'down'
    else 'stay' end
  from br where user_id = p_user
$$;

/** Puts the player in this week's league (if needed) and adds points. */
create or replace function public.league_add(p_user uuid, p_points int) returns void
language plpgsql security definer set search_path = public as $$
declare w int := public.league_week(); last league_members; t int := 1; res text; b int;
begin
  if not exists (select 1 from league_members where week = w and user_id = p_user) then
    select * into last from league_members where user_id = p_user and week < w order by week desc limit 1;
    if last.user_id is not null then
      res := coalesce(last.result, public.league_result(last.week, p_user));
      update league_members set result = res where week = last.week and user_id = p_user and result is null;
      t := least(5, greatest(1, last.tier + case res when 'up' then 1 when 'down' then -1 else 0 end));
    end if;
    -- First bracket in this tier with room, else a new one. Locked so two joins can't overfill a bracket.
    perform pg_advisory_xact_lock(hashtext('league:' || w || ':' || t));
    select bracket into b from league_members where week = w and tier = t group by bracket having count(*) < 30 order by bracket limit 1;
    if b is null then select coalesce(max(bracket), 0) + 1 into b from league_members where week = w and tier = t; end if;
    insert into league_members (week, user_id, tier, bracket) values (w, p_user, t, b) on conflict do nothing;
  end if;
  update league_members set points = points + p_points where week = w and user_id = p_user;
end $$;
revoke all on function public.league_add(uuid, int), public.league_result(int, uuid) from public, anon, authenticated;

/** This week's bracket for the signed-in player, plus last week's result. */
create or replace function public.my_league() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select * from league_members where week = public.league_week() and user_id = auth.uid()),
  prev as (select week, tier, coalesce(result, public.league_result(week, user_id)) res from league_members
           where user_id = auth.uid() and week < public.league_week() order by week desc limit 1)
  select jsonb_build_object(
    'week', public.league_week(),
    'endsAt', to_timestamp(((public.league_week() + 1) * 7 + 4) * 86400 + 5 * 3600),
    'joined', exists (select 1 from me),
    'tier', coalesce((select tier from me), (select least(5, greatest(1, tier + case res when 'up' then 1 when 'down' then -1 else 0 end)) from prev), 1),
    'lastResult', (select res from prev),
    'standings', coalesce((
      select jsonb_agg(jsonb_build_object('username', p.username, 'points', m.points, 'me', m.user_id = auth.uid()) order by m.points desc, m.joined_at)
      from league_members m join me on m.week = me.week and m.tier = me.tier and m.bracket = me.bracket
      join profiles p on p.id = m.user_id), '[]'::jsonb)
  )
$$;
grant execute on function public.my_league() to authenticated;

-- ---------------------------------------------------------------- what scores

-- Learning: +20 for each lesson passed, +200 for graduating.
create or replace function public.points_from_academy() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.graduated_at is not null and old.graduated_at is null then
    perform public.add_points(new.user_id, 'learning', 200, 'grad:' || new.course_id || ':' || new.user_id);
  elsif new.passed > coalesce(old.passed, 0) then
    perform public.add_points(new.user_id, 'learning', 20, 'lesson:' || new.course_id || ':' || new.passed || ':' || new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists points_from_academy on public.academy_enrolments;
create trigger points_from_academy after update on public.academy_enrolments for each row execute function public.points_from_academy();

-- Learning: +50 for passing the driving theory exam.
create or replace function public.points_from_driving() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.theory_passed_at is not null and old.theory_passed_at is null then
    perform public.add_points(new.user_id, 'learning', 50, 'driving-theory:' || new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists points_from_driving on public.driving_progress;
create trigger points_from_driving after update on public.driving_progress for each row execute function public.points_from_driving();

-- Scam defence: +50 reported, +20 avoided.
create or replace function public.points_from_scams() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.outcome in ('reported', 'avoided') and old.outcome is null then
    perform public.add_points(new.user_id, 'scam', case new.outcome when 'reported' then 50 else 20 end, 'scam:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists points_from_scams on public.scam_events;
create trigger points_from_scams after update on public.scam_events for each row execute function public.points_from_scams();

-- Career & play: +30 for a multiplayer win in a game room.
create or replace function public.points_from_games() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.outcome = 'win' and new.mode = 'multiplayer' and new.room_id is not null then
    perform public.add_points(new.user_id, 'career', 30, 'win:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists points_from_games on public.game_results;
create trigger points_from_games after insert on public.game_results for each row execute function public.points_from_games();

-- Wellbeing: +100 for a day played at Peak Performer (average needs 85%+), counted at the daily tick.
create or replace function public.points_from_tick() returns trigger
language plpgsql security definer set search_path = public as $$
declare avg_need numeric;
begin
  if new.settled_at > old.settled_at and public.life_day(new.settled_at) > public.life_day(old.settled_at) then
    select avg(value::numeric) into avg_need from profiles p, jsonb_each_text(coalesce(p.citizen -> 'needs', '{}'::jsonb))
      where p.id = new.user_id and value ~ '^[0-9.]+$';
    if avg_need >= 85 then
      perform public.add_points(new.user_id, 'wellbeing', 100, 'peak:' || public.life_day(new.settled_at) || ':' || new.user_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists points_from_tick on public.life_state;
create trigger points_from_tick after update on public.life_state for each row execute function public.points_from_tick();

-- ---------------------------------------------------------------- friend quests

insert into public.app_settings (key, value) values ('friend_quest', '{"target": 100, "reward": 2000, "max_claims": 3}')
on conflict (key) do nothing;

create table if not exists public.friend_quest_claims (
  week int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  created_at timestamptz not null default now(),
  primary key (week, user_id, friend_id)
);
alter table public.friend_quest_claims enable row level security;
drop policy if exists "see own quest claims" on public.friend_quest_claims;
create policy "see own quest claims" on public.friend_quest_claims for select using (user_id = auth.uid());

/** This week's friend quest with each accepted friend: both score the target to claim. */
create or replace function public.friend_quests() returns jsonb
language sql stable security definer set search_path = public as $$
  with cfg as (select setting('friend_quest') c),
  fr as (select case when f.user_id = auth.uid() then f.friend_id else f.user_id end id from friendships f
         where auth.uid() in (f.user_id, f.friend_id) and f.status = 'accepted'),
  pts as (select user_id, sum(points) s from score_events where week = public.league_week() group by user_id)
  select jsonb_build_object(
    'target', (select (c ->> 'target')::int from cfg), 'reward', (select (c ->> 'reward')::int from cfg),
    'claimsLeft', greatest(0, (select (c ->> 'max_claims')::int from cfg) - (select count(*) from friend_quest_claims where week = public.league_week() and user_id = auth.uid())),
    'me', coalesce((select s from pts where user_id = auth.uid()), 0),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('id', fr.id, 'username', p.username, 'points', coalesce(pts.s, 0),
        'claimed', exists (select 1 from friend_quest_claims q where q.week = public.league_week() and q.user_id = auth.uid() and q.friend_id = fr.id))
        order by coalesce(pts.s, 0) desc)
      from fr join profiles p on p.id = fr.id left join pts on pts.user_id = fr.id), '[]'::jsonb)
  )
$$;
grant execute on function public.friend_quests() to authenticated;

create or replace function public.claim_friend_quest(p_friend uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c jsonb := setting('friend_quest'); w int := public.league_week(); target int; amt bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  target := (c ->> 'target')::int; amt := (c ->> 'reward')::bigint;
  if not exists (select 1 from friendships where status = 'accepted' and ((user_id = me and friend_id = p_friend) or (user_id = p_friend and friend_id = me))) then
    raise exception 'not_friends';
  end if;
  if (select count(*) from friend_quest_claims where week = w and user_id = me) >= (c ->> 'max_claims')::int then raise exception 'max_claims'; end if;
  if coalesce((select sum(points) from score_events where week = w and user_id = me), 0) < target
     or coalesce((select sum(points) from score_events where week = w and user_id = p_friend), 0) < target then
    raise exception 'not_done';
  end if;
  insert into friend_quest_claims (week, user_id, friend_id, amount) values (w, me, p_friend, amt) on conflict do nothing;
  if not found then return 0; end if;
  perform coin_move(me, amt, 'grant', 'Friend quest reward', 'quest:' || w || ':' || p_friend);
  return amt;
end $$;
grant execute on function public.claim_friend_quest(uuid) to authenticated;
