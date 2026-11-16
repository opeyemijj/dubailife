-- Dubai Autodrome: races between players in their own cars (src/app/autodrome). A host opens a race (2 to 12 cars,
-- 1 to 5 laps), friends who own cars join with one of theirs, the host starts it, and everyone's finishing time is
-- recorded. During the race the cars' positions go player to player over a Realtime channel (race:<code>); the
-- database keeps the lobby, the start time everyone counts down to, and the results.
--
-- Fair play: only cars you own (not stolen or impounded); a finishing time can't be faster than the track allows
-- (every lap at least 25 seconds) nor earlier than the real time since the start. The winner of a race with at
-- least 2 finishers is posted to the City Feed.

create table if not exists public.races (
  id bigint generated always as identity primary key,
  code text not null unique,
  host_id uuid not null references public.profiles (id) on delete cascade,
  laps int not null default 3 check (laps between 1 and 5),
  max_racers int not null default 12 check (max_racers between 2 and 12),
  status text not null default 'lobby' check (status in ('lobby', 'racing', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  ended_at timestamptz
);
create index if not exists races_open on public.races (status, created_at desc);
alter table public.races enable row level security;

create table if not exists public.race_entries (
  race_id bigint not null references public.races (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  owned_car_id bigint not null references public.owned_cars (id) on delete cascade,
  joined_at timestamptz not null default now(),
  finish_ms int,
  place int,
  primary key (race_id, user_id)
);
alter table public.race_entries enable row level security;

/** A car I can race: mine, not stolen, not impounded. */
create or replace function public.race_car_ok(p_user uuid, p_car bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from owned_cars c where c.id = p_car and c.user_id = p_user and not coalesce(c.is_stolen, false)
                   and (c.impounded_until is null or c.impounded_until < now()))
$$;

/** My cars that can race. */
create or replace function public.my_race_cars() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'car', c.car, 'plate', c.plate) order by c.price desc nulls last), '[]'::jsonb)
    from owned_cars c where c.user_id = auth.uid() and race_car_ok(auth.uid(), c.id)
$$;
revoke all on function public.my_race_cars() from public, anon;
grant execute on function public.my_race_cars() to authenticated;

/** Open a race. Returns its code. */
create or replace function public.create_race(p_car bigint, p_laps int default 3) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  -- One open race of my own at a time: an old lobby is closed.
  update races set status = 'cancelled', ended_at = now() where host_id = me and status = 'lobby';
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from races where code = c);
  end loop;
  insert into races (code, host_id, laps) values (c, me, greatest(1, least(coalesce(p_laps, 3), 5))) returning id into rid;
  insert into race_entries (race_id, user_id, owned_car_id) values (rid, me, p_car);
  return c;
end $$;
revoke all on function public.create_race(bigint, int) from public, anon;
grant execute on function public.create_race(bigint, int) to authenticated;

/** Join a race in its lobby with one of my cars (or change the car I'm in). */
create or replace function public.join_race(p_code text, p_car bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from races where code = upper(p_code) for update;
  if r.id is null then raise exception 'no_race'; end if;
  if r.status <> 'lobby' then raise exception 'race_started'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  if not exists (select 1 from race_entries where race_id = r.id and user_id = me)
     and (select count(*) from race_entries where race_id = r.id) >= r.max_racers then raise exception 'race_full'; end if;
  insert into race_entries (race_id, user_id, owned_car_id) values (r.id, me, p_car)
    on conflict (race_id, user_id) do update set owned_car_id = excluded.owned_car_id;
end $$;
revoke all on function public.join_race(text, bigint) from public, anon;
grant execute on function public.join_race(text, bigint) to authenticated;

/** Leave a lobby (the host leaving closes it). */
create or replace function public.leave_race(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races;
begin
  select * into r from races where code = upper(p_code);
  if r.id is null or r.status <> 'lobby' then return; end if;
  if r.host_id = me then update races set status = 'cancelled', ended_at = now() where id = r.id;
  else delete from race_entries where race_id = r.id and user_id = me; end if;
end $$;
revoke all on function public.leave_race(text) from public, anon;
grant execute on function public.leave_race(text) to authenticated;

/** The host starts it: everyone counts down to the same moment, 6 seconds from now. */
create or replace function public.start_race(p_code text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.host_id <> me then raise exception 'not_host'; end if;
  if r.status <> 'lobby' then raise exception 'race_started'; end if;
  if (select count(*) from race_entries where race_id = r.id) < 2 then raise exception 'need_two'; end if;
  update races set status = 'racing', starts_at = now() + interval '6 seconds' where id = r.id;
  return now() + interval '6 seconds';
end $$;
revoke all on function public.start_race(text) from public, anon;
grant execute on function public.start_race(text) to authenticated;

/** I crossed the line after my last lap: my time (ms). Returns my place. */
create or replace function public.finish_race(p_code text, p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; pl int; e race_entries; winner text; car text;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.status <> 'racing' then raise exception 'not_racing'; end if;
  select * into e from race_entries where race_id = r.id and user_id = me;
  if e.user_id is null then raise exception 'not_in_race'; end if;
  if e.finish_ms is not null then return e.place; end if;
  -- Possible times only: at least 25 seconds a lap, and no earlier than the real time since the start allows.
  if p_ms < r.laps * 25000 or now() < r.starts_at + make_interval(secs => p_ms / 1000.0 - 3) then raise exception 'bad_time'; end if;
  pl := (select count(*) from race_entries where race_id = r.id and finish_ms is not null) + 1;
  update race_entries set finish_ms = p_ms, place = pl where race_id = r.id and user_id = me;
  if pl = 2 then
    -- A race with at least two finishers: the winner goes in the City Feed.
    select p.username, c.car into winner, car from race_entries x join profiles p on p.id = x.user_id join owned_cars c on c.id = x.owned_car_id
     where x.race_id = r.id and x.place = 1;
    perform feed_post((select user_id from race_entries where race_id = r.id and place = 1), 'race',
      jsonb_build_object('code', r.code, 'laps', r.laps, 'racers', (select count(*) from race_entries where race_id = r.id), 'car', car,
        'ms', (select finish_ms from race_entries where race_id = r.id and place = 1)), null, 'race:' || r.id);
  end if;
  if not exists (select 1 from race_entries where race_id = r.id and finish_ms is null) then
    update races set status = 'done', ended_at = now() where id = r.id;
  end if;
  return pl;
end $$;
revoke all on function public.finish_race(text, int) from public, anon;
grant execute on function public.finish_race(text, int) to authenticated;

/** A race and who's in it, with the server's clock so everyone counts down together. */
create or replace function public.race_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', r.code, 'hostId', r.host_id, 'host', h.username, 'laps', r.laps, 'max', r.max_racers,
           'status', r.status, 'startsAt', r.starts_at, 'now', now(),
           'racers', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
                                 'car', c.car, 'plate', c.plate, 'finishMs', e.finish_ms, 'place', e.place) order by e.joined_at)
                               from race_entries e join profiles p on p.id = e.user_id join owned_cars c on c.id = e.owned_car_id
                              where e.race_id = r.id), '[]'::jsonb))
    from races r join profiles h on h.id = r.host_id
   where r.code = upper(p_code)
$$;
revoke all on function public.race_view(text) from public, anon;
grant execute on function public.race_view(text) to authenticated;

/** Races open to join now, and ones racing. */
create or replace function public.open_races() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'host', h.username, 'look', h.citizen -> 'look', 'laps', r.laps,
           'status', r.status, 'racers', (select count(*) from race_entries e where e.race_id = r.id), 'max', r.max_racers) order by r.created_at desc), '[]'::jsonb)
    from races r join profiles h on h.id = r.host_id
   where (r.status = 'lobby' and r.created_at > now() - interval '2 hours') or (r.status = 'racing' and r.starts_at > now() - interval '15 minutes')
$$;
revoke all on function public.open_races() from public, anon;
grant execute on function public.open_races() to authenticated;

/** My friends who own a car, to invite (online first). */
create or replace function public.friends_with_cars() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'online', not p.chat_off and exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes'),
             'car', (select c.car from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false) order by c.price desc nulls last limit 1)) as x
      from friendships f join profiles p on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
     where f.status = 'accepted' and auth.uid() in (f.user_id, f.friend_id)
       and exists (select 1 from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false))
     order by exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes') desc, p.username) t
$$;
revoke all on function public.friends_with_cars() from public, anon;
grant execute on function public.friends_with_cars() to authenticated;

-- Lobbies nobody started close after 2 hours; races nobody finished close after 30 minutes.
do $$ begin
  perform cron.unschedule('races-tidy');
exception when others then null;
end $$;
select cron.schedule('races-tidy', '*/10 * * * *', $$
  update public.races set status = 'cancelled', ended_at = now() where status = 'lobby' and created_at < now() - interval '2 hours';
  update public.races set status = 'done', ended_at = now() where status = 'racing' and starts_at < now() - interval '30 minutes';
$$);

-- Race wins are games.
create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward', 'rain') then 'money'
    when p_kind in ('win', 'race') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;

-- Up to 12 cars a race (tables made before this allowed 6).
alter table public.races drop constraint if exists races_max_racers_check;
alter table public.races add constraint races_max_racers_check check (max_racers between 2 and 12);
alter table public.races alter column max_racers set default 12;
update public.races set max_racers = 12 where status = 'lobby';
