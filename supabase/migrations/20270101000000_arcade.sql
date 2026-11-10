-- The 3D attraction games (src/components/arcade): each player's progress per game, their weekly best for the
-- leaderboards, and the AED a finished round pays, capped per Dubai day. The rules are mirrored from
-- src/data/arcade/games.json (scripts/check-life-config.mjs checks they match).

create table if not exists public.game_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  best int not null default 0,
  level int not null default 0,
  plays int not null default 0,
  streak int not null default 0,
  -- The Dubai day of the last finished round (streaks) and what was earned on it (the daily cap).
  last_day date,
  day_earned int not null default 0,
  -- The week (Monday, Dubai time) of week_best, for the weekly leaderboard.
  week_start date,
  week_best int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);
alter table public.game_progress enable row level security;
drop policy if exists "own game progress" on public.game_progress;
create policy "own game progress" on public.game_progress for select using (user_id = auth.uid());
create index if not exists game_progress_week on public.game_progress (game, week_start, week_best desc);

/** A game's reward rules (src/data/arcade/games.json), null for an unknown game. */
create or replace function public.arcade_rule(p_game text) returns jsonb
language sql immutable set search_path = public as $$
  select (case p_game
    when 'boxing'   then '{"perStar":150,"dailyCap":1500,"maxScore":100000,"maxLevel":30}'
    when 'gym'      then '{"perStar":40,"dailyCap":400,"maxScore":100000,"maxLevel":30}'
    when 'scan'     then '{"perStar":50,"dailyCap":300,"maxScore":100000,"maxLevel":3}'
    when 'labour'   then '{"perStar":300,"dailyCap":900,"maxScore":100000,"maxLevel":1}'
    when 'court'    then '{"perStar":200,"dailyCap":1200,"maxScore":100000,"maxLevel":30}'
    when 'hall'     then '{"perStar":150,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'bridal'   then '{"perStar":100,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'nails'    then '{"perStar":60,"dailyCap":600,"maxScore":100000,"maxLevel":30}'
    when 'goldsouk' then '{"perStar":80,"dailyCap":640,"maxScore":100000,"maxLevel":30}'
  end)::jsonb
$$;

/**
 * A finished round: keeps the best score, the level reached, the daily streak and the weekly best, and pays
 * perStar × stars AED, up to what is left of the game's daily cap. Returns what changed.
 */
create or replace function public.record_game_result(p_game text, p_score int, p_stars int, p_level int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  rule jsonb := public.arcade_rule(p_game);
  today date := (now() at time zone 'Asia/Dubai')::date;
  wk date := date_trunc('week', (now() at time zone 'Asia/Dubai'))::date;
  g game_progress;
  earned int;
  pay int;
  was_best int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if rule is null then raise exception 'unknown_game'; end if;
  if p_stars not between 0 and 3 then raise exception 'bad_stars'; end if;
  if p_score < 0 or p_score > (rule ->> 'maxScore')::int then raise exception 'bad_score'; end if;
  if p_level < 0 or p_level > (rule ->> 'maxLevel')::int then raise exception 'bad_level'; end if;

  insert into game_progress (user_id, game) values (me, p_game) on conflict do nothing;
  select * into g from game_progress where user_id = me and game = p_game for update;
  was_best := g.best;

  earned := case when g.last_day = today then g.day_earned else 0 end;
  pay := greatest(0, least(p_stars * (rule ->> 'perStar')::int, (rule ->> 'dailyCap')::int - earned));

  update game_progress set
    best = greatest(best, p_score),
    level = greatest(level, p_level),
    plays = plays + 1,
    streak = case when last_day = today then streak when last_day = today - 1 then streak + 1 else 1 end,
    last_day = today,
    day_earned = earned + pay,
    week_best = case when week_start = wk then greatest(week_best, p_score) else p_score end,
    week_start = wk,
    updated_at = now()
  where user_id = me and game = p_game
  returning * into g;

  if pay > 0 then perform coin_move(me, pay, 'earn', 'Game: ' || p_game, 'game:' || p_game); end if;

  return jsonb_build_object('best', g.best, 'isBest', p_score > was_best, 'level', g.level, 'streak', g.streak,
    'plays', g.plays, 'weekBest', g.week_best, 'reward', pay, 'capped', pay < p_stars * (rule ->> 'perStar')::int);
end $$;
grant execute on function public.record_game_result(text, int, int, int) to authenticated;

/** My progress in every game I've played. */
create or replace function public.my_game_progress() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(game, jsonb_build_object('best', best, 'level', level, 'plays', plays,
    'streak', case when last_day >= (now() at time zone 'Asia/Dubai')::date - 1 then streak else 0 end,
    'earnedToday', case when last_day = (now() at time zone 'Asia/Dubai')::date then day_earned else 0 end)), '{}'::jsonb)
  from game_progress where user_id = auth.uid()
$$;
grant execute on function public.my_game_progress() to authenticated;

/** This week's top ten in a game (real players only: Locals aren't accounts), and my own place. */
create or replace function public.game_leaderboard(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  with wk as (select date_trunc('week', (now() at time zone 'Asia/Dubai'))::date as d),
  ranked as (
    select gp.user_id, p.username, p.display_name, gp.week_best as score,
           rank() over (order by gp.week_best desc) as place
    from game_progress gp join profiles p on p.id = gp.user_id, wk
    where gp.game = p_game and gp.week_start = wk.d and gp.week_best > 0
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('username', username, 'name', display_name, 'score', score, 'place', place) order by place, username)
                     from (select * from ranked order by place, username limit 10) t), '[]'::jsonb),
    'me', (select jsonb_build_object('score', score, 'place', place) from ranked where user_id = auth.uid()))
$$;
grant execute on function public.game_leaderboard(text) to authenticated;
