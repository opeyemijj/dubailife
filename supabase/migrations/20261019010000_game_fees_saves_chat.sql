-- Game City: a fee per game (virtual AED), saved games to continue later, and chat in game rooms.

-- ---------------------------------------------------------------- fee per game

insert into public.app_settings (key, value) values ('game_fee', '{"aed": 1000}') on conflict (key) do nothing;

create or replace function public.game_fee() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce((setting('game_fee') ->> 'aed')::bigint, 1000);
$$;
grant execute on function public.game_fee() to anon, authenticated;

-- A game against the computer: pay the fee (resuming a saved game doesn't charge again).
create or replace function public.pay_game_fee(p_game text) returns bigint
language plpgsql security definer set search_path = public as $$
declare fee bigint := game_fee();
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if fee <= 0 then return (select balance from profiles where id = auth.uid()); end if;
  return coin_move(auth.uid(), -fee, 'spend', 'Game City: ' || p_game, 'game:' || p_game);
end $$;
grant execute on function public.pay_game_fee(text) to authenticated;

-- Starting a room charges every player once; if anyone can't pay, nobody is charged and it doesn't start.
create or replace function public.start_game_room(p_room uuid, p_state jsonb) returns public.game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms; fee bigint := game_fee(); p jsonb; broke text;
begin
  select * into r from game_rooms where id = p_room and host_id = auth.uid() and status = 'lobby' for update;
  if r.id is null or jsonb_array_length(r.players) < 2 then raise exception 'cannot_start'; end if;
  if fee > 0 then
    select string_agg('@' || pr.username, ', ') into broke
      from jsonb_array_elements(r.players) x join profiles pr on pr.id = (x ->> 'id')::uuid where pr.balance < fee;
    if broke is not null then raise exception 'cant_pay:%', broke; end if;
    for p in select * from jsonb_array_elements(r.players) loop
      perform coin_move((p ->> 'id')::uuid, -fee, 'spend', 'Game City: ' || r.game, 'game_room:' || r.id);
    end loop;
  end if;
  update game_rooms set status = 'playing', state = p_state, version = version + 1, updated_at = now() where id = p_room returning * into r;
  return r;
end $$;
grant execute on function public.start_game_room(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- saved games against the computer

create table if not exists public.game_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  seats int not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);
alter table public.game_saves enable row level security;
drop policy if exists "own saves" on public.game_saves;
create policy "own saves" on public.game_saves for all using (user_id = auth.uid()) with check (user_id = auth.uid() and length(state::text) < 200000);

-- Rooms I'm still in, to rejoin.
create or replace function public.my_open_rooms() returns setof public.game_rooms
language sql stable security definer set search_path = public as $$
  select * from game_rooms
  where players @> jsonb_build_array(jsonb_build_object('id', auth.uid())) and status in ('lobby', 'playing') and updated_at > now() - interval '2 days'
  order by updated_at desc limit 10;
$$;
grant execute on function public.my_open_rooms() to authenticated;

-- ---------------------------------------------------------------- chat in game rooms

create table if not exists public.game_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists game_messages_room on public.game_messages (room_id, created_at);
alter table public.game_messages enable row level security;
create or replace function public.in_game_room(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from game_rooms where id = p_room and players @> jsonb_build_array(jsonb_build_object('id', auth.uid())));
$$;
drop policy if exists "room members read chat" on public.game_messages;
create policy "room members read chat" on public.game_messages for select using (in_game_room(room_id));
drop policy if exists "room members send chat" on public.game_messages;
create policy "room members send chat" on public.game_messages for insert with check (
  user_id = auth.uid() and in_game_room(room_id)
  and username = (select username from profiles where id = auth.uid())
  and (select count(*) from game_messages m where m.user_id = auth.uid() and m.created_at > now() - interval '10 seconds') < 8
);
grant select, insert on public.game_messages to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.game_messages;
exception when duplicate_object then null; end $$;
