-- Game City: free games (Ludo, Chess, Dominoes, Pool, Word Tile Challenge, Trivia Quiz) with rooms for
-- playing together, recorded results and a Hall of Fame per game.
--
-- Rooms hold the whole game state as JSON; players take turns writing the next state with a version
-- check (so two moves can't overwrite each other), and everyone watches the row through Realtime.
-- Game rules run in the players' browsers; these are free games with no money at stake.

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('ludo', 'chess', 'dominoes', 'pool', 'word', 'trivia')),
  code text not null unique,                       -- 6 letters, for joining by code / invite link
  is_public boolean not null default true,         -- public rooms appear in quick match
  host_id uuid not null references public.profiles (id) on delete cascade,
  max_players int not null default 2 check (max_players between 2 and 4),
  -- [{ id, username, name, look }], in seat order
  players jsonb not null default '[]'::jsonb,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'done')),
  state jsonb,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_rooms_lobby on public.game_rooms (game, status, is_public, created_at desc);
alter table public.game_rooms enable row level security;
drop policy if exists "rooms are visible" on public.game_rooms;
create policy "rooms are visible" on public.game_rooms for select using (auth.uid() is not null);
revoke insert, update, delete on public.game_rooms from anon, authenticated;
do $$ begin
  alter publication supabase_realtime add table public.game_rooms;
exception when duplicate_object then null; end $$;

create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('ludo', 'chess', 'dominoes', 'pool', 'word', 'trivia')),
  mode text not null check (mode in ('ai', 'multiplayer')),
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  score int not null default 0 check (score between -1000 and 100000),
  room_id uuid references public.game_rooms (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists game_results_board on public.game_results (game, user_id);
create unique index if not exists game_results_once_per_room on public.game_results (room_id, user_id) where room_id is not null;
alter table public.game_results enable row level security;
drop policy if exists "own results" on public.game_results;
create policy "own results" on public.game_results for select using (user_id = auth.uid());

-- ---------------------------------------------------------------- rooms

create or replace function public.game_player_json() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'username', p.username, 'name', p.display_name, 'look', p.citizen -> 'look')
  from profiles p where p.id = auth.uid();
$$;
revoke all on function public.game_player_json() from public, anon, authenticated;

create or replace function public.create_game_room(p_game text, p_public boolean, p_max int) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms; c text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  -- Leave any lobby you're still waiting in for this game.
  delete from game_rooms where host_id = auth.uid() and game = p_game and status = 'lobby';
  loop
    -- 6 letters/digits, without look-alikes (0/O, 1/I/L).
    c := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from game_rooms where code = c);
  end loop;
  insert into game_rooms (game, code, is_public, host_id, max_players, players)
    values (p_game, c, p_public, auth.uid(), greatest(2, least(coalesce(p_max, 2), 4)), jsonb_build_array(game_player_json()))
    returning * into r;
  return r;
end $$;
grant execute on function public.create_game_room(text, boolean, int) to authenticated;

create or replace function public.join_game_room(p_code text) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into r from game_rooms where code = upper(trim(p_code)) for update;
  if r.id is null then raise exception 'room_not_found'; end if;
  if r.players @> jsonb_build_array(jsonb_build_object('id', auth.uid())) then return r; end if;
  if r.status <> 'lobby' then raise exception 'room_started'; end if;
  if jsonb_array_length(r.players) >= r.max_players then raise exception 'room_full'; end if;
  update game_rooms set players = players || jsonb_build_array(game_player_json()), updated_at = now()
    where id = r.id returning * into r;
  return r;
end $$;
grant execute on function public.join_game_room(text) to authenticated;

-- Quick match: join the oldest open public room for this game, or open a new one and wait.
create or replace function public.quick_match(p_game text, p_max int default 2) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into r from game_rooms
    where game = p_game and status = 'lobby' and is_public and host_id <> auth.uid()
      and jsonb_array_length(players) < max_players and updated_at > now() - interval '10 minutes'
    order by created_at limit 1 for update skip locked;
  if r.id is null then return create_game_room(p_game, true, p_max); end if;
  update game_rooms set players = players || jsonb_build_array(game_player_json()), updated_at = now()
    where id = r.id returning * into r;
  return r;
end $$;
grant execute on function public.quick_match(text, int) to authenticated;

create or replace function public.leave_game_room(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update game_rooms set players = (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(players) x where x ->> 'id' <> auth.uid()::text), updated_at = now()
    where id = p_room and status = 'lobby';
  delete from game_rooms where id = p_room and status = 'lobby' and (host_id = auth.uid() or jsonb_array_length(players) = 0);
end $$;
grant execute on function public.leave_game_room(uuid) to authenticated;

-- The host starts the game with its first state.
create or replace function public.start_game_room(p_room uuid, p_state jsonb) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  update game_rooms set status = 'playing', state = p_state, version = version + 1, updated_at = now()
    where id = p_room and host_id = auth.uid() and status = 'lobby' and jsonb_array_length(players) >= 2
    returning * into r;
  if r.id is null then raise exception 'cannot_start'; end if;
  return r;
end $$;
grant execute on function public.start_game_room(uuid, jsonb) to authenticated;

-- A player writes the next state. p_version must match, so moves never overwrite each other.
create or replace function public.game_move(p_room uuid, p_version int, p_state jsonb, p_done boolean default false) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  if length(p_state::text) > 200000 then raise exception 'state_too_large'; end if;
  update game_rooms set state = p_state, version = version + 1, status = case when p_done then 'done' else status end, updated_at = now()
    where id = p_room and status = 'playing' and version = p_version
      and players @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
    returning * into r;
  if r.id is null then raise exception 'stale_move'; end if;
  return r;
end $$;
grant execute on function public.game_move(uuid, int, jsonb, boolean) to authenticated;

-- ---------------------------------------------------------------- results and Hall of Fame

create or replace function public.record_game_result(p_game text, p_mode text, p_outcome text, p_score int, p_room uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_mode = 'multiplayer' and not exists (
    select 1 from game_rooms where id = p_room and game = p_game and players @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
  ) then raise exception 'not_in_room'; end if;
  -- A generous cap on games against the computer, so the boards stay meaningful.
  if p_mode = 'ai' and (select count(*) from game_results where user_id = auth.uid() and game = p_game and mode = 'ai' and created_at > now() - interval '1 day') >= 100 then
    raise exception 'daily_limit';
  end if;
  insert into game_results (user_id, game, mode, outcome, score, room_id)
    values (auth.uid(), p_game, p_mode, p_outcome, greatest(-1000, least(coalesce(p_score, 0), 100000)), case when p_mode = 'multiplayer' then p_room end)
    on conflict do nothing;
end $$;
grant execute on function public.record_game_result(text, text, text, int, uuid) to authenticated;

-- Top players for a game: multiplayer wins count three times an AI win; ties broken by best score.
create or replace function public.game_hall_of_fame(p_game text, p_limit int default 20)
returns table (user_id uuid, username text, name text, look jsonb, wins bigint, played bigint, best_score int, points bigint)
language sql stable security definer set search_path = public as $$
  select r.user_id, p.username, p.display_name, p.citizen -> 'look',
    count(*) filter (where r.outcome = 'win'), count(*), max(r.score),
    sum(case when r.outcome = 'win' then case when r.mode = 'multiplayer' then 3 else 1 end when r.outcome = 'draw' then 1 else 0 end)
  from game_results r join profiles p on p.id = r.user_id
  where r.game = p_game
  group by r.user_id, p.username, p.display_name, p.citizen
  order by 8 desc, 7 desc
  limit least(p_limit, 50);
$$;
grant execute on function public.game_hall_of_fame(text, int) to anon, authenticated;

create or replace function public.my_game_stats(p_game text)
returns table (wins bigint, losses bigint, draws bigint, best_score int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where outcome = 'win'), count(*) filter (where outcome = 'loss'), count(*) filter (where outcome = 'draw'), max(score)
  from game_results where user_id = auth.uid() and game = p_game;
$$;
grant execute on function public.my_game_stats(text) to authenticated;

-- Old lobbies and finished rooms are cleared out daily.
do $$ begin
  perform cron.unschedule('purge-game-rooms') where exists (select 1 from cron.job where jobname = 'purge-game-rooms');
  perform cron.schedule('purge-game-rooms', '30 3 * * *', $c$delete from public.game_rooms where (status = 'lobby' and updated_at < now() - interval '1 hour') or updated_at < now() - interval '2 days'$c$);
end $$;
