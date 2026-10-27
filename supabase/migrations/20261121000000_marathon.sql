-- The Dubai Life Marathon: every Friday at 19:00 Dubai time, free to enter. Players sign up during the week
-- (each gets a bib number), gather at the start line, and run the course together live; progress is
-- checked against the fastest possible pace so it can't be faked. The top three share a prize the game
-- pays, once, after the race. Locals run alongside in the app but never enter, rank or win.
-- Numbers: src/data/life/marathon.json (checked by scripts/check-life-config.mjs).

/** The start of the next race whose 15-minute window hasn't closed (Fridays, 19:00 GST). */
create or replace function public.marathon_start(p_at timestamptz default now()) returns timestamptz
language sql stable as $$
  select s from (
    select ((date_trunc('day', p_at at time zone 'Asia/Dubai') + make_interval(days => d) + interval '19 hours') at time zone 'Asia/Dubai') as s
    from generate_series(-7, 7) d
  ) x
  where extract(isodow from s at time zone 'Asia/Dubai') = 5 and s + interval '15 minutes' > p_at
  order by s limit 1
$$;

create table if not exists public.marathon_entries (
  race timestamptz not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  bib int not null,
  distance numeric not null default 0,
  finish_ms int,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (race, user_id)
);
create index if not exists marathon_entries_race on public.marathon_entries (race, finish_ms nulls last, distance desc);
alter table public.marathon_entries enable row level security;
drop policy if exists "race entries are public" on public.marathon_entries;
create policy "race entries are public" on public.marathon_entries for select using (auth.uid() is not null);

create table if not exists public.marathon_payouts (
  race timestamptz not null,
  rank int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  primary key (race, rank)
);
alter table public.marathon_payouts enable row level security;

/** Sign up for the next race (free). Returns your bib number. */
create or replace function public.marathon_register() returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r timestamptz := public.marathon_start(); b int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if now() >= r then raise exception 'race_started'; end if;
  select bib into b from marathon_entries where race = r and user_id = me;
  if b is not null then return b; end if;
  perform pg_advisory_xact_lock(hashtext('marathon:' || r::text));
  select coalesce(max(bib), 0) + 1 into b from marathon_entries where race = r;
  insert into marathon_entries (race, user_id, bib) values (r, me, b);
  return b;
end $$;
grant execute on function public.marathon_register() to authenticated;

/** Report how far you've run. Capped at the fastest possible pace since the gun; finishing records your time. */
create or replace function public.marathon_progress(p_distance numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r timestamptz := public.marathon_start(); e marathon_entries; elapsed numeric; d numeric;
begin
  if now() < r then raise exception 'not_started'; end if;
  select * into e from marathon_entries where race = r and user_id = me for update;
  if e.user_id is null then raise exception 'not_registered'; end if;
  if e.finish_ms is not null then return jsonb_build_object('distance', e.distance, 'finishMs', e.finish_ms); end if;
  elapsed := extract(epoch from now() - r);
  -- 12 m/s is the fastest the run allows; a little slack for the network.
  d := greatest(e.distance, least(p_distance, elapsed * 12 + 25, 4220));
  if d >= 4220 then
    update marathon_entries set distance = 4220, finish_ms = round(elapsed * 1000), updated_at = now() where race = r and user_id = me returning * into e;
    perform public.add_points(me, 'wellbeing', 30, 'marathon:' || r::text || ':' || me);
  else
    update marathon_entries set distance = d, updated_at = now() where race = r and user_id = me returning * into e;
  end if;
  return jsonb_build_object('distance', e.distance, 'finishMs', e.finish_ms);
end $$;
grant execute on function public.marathon_progress(numeric) to authenticated;

/** After a race: the top three finishers are paid, once. */
create or replace function public.marathon_settle(p_race timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare e record; prizes bigint[] := array[50000, 25000, 10000];
begin
  if now() < p_race + interval '15 minutes' then return; end if;
  for e in select user_id, row_number() over (order by finish_ms) as rank from marathon_entries where race = p_race and finish_ms is not null order by finish_ms limit 3 loop
    insert into marathon_payouts (race, rank, user_id, amount) values (p_race, e.rank, e.user_id, prizes[e.rank]) on conflict do nothing;
    if found then perform coin_move(e.user_id, prizes[e.rank], 'earn', 'Dubai Life Marathon · place ' || e.rank, 'marathon-prize:' || p_race::text || ':' || e.rank); end if;
  end loop;
end $$;
revoke all on function public.marathon_settle(timestamptz) from public, anon, authenticated;

/** The next race, who's in it, how they're doing, and last week's podium (paid out first if it's due). */
create or replace function public.marathon_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r timestamptz := public.marathon_start(); last timestamptz;
begin
  select max(race) into last from marathon_entries where race < r;
  if last is not null then perform public.marathon_settle(last); end if;
  return jsonb_build_object(
    'race', r, 'now', now(),
    'entrants', (select count(*) from marathon_entries where race = r),
    'me', (select jsonb_build_object('bib', bib, 'distance', distance, 'finishMs', finish_ms) from marathon_entries where race = r and user_id = me),
    'runners', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'bib', e.bib, 'distance', e.distance, 'finishMs', e.finish_ms)
                 order by e.finish_ms nulls last, e.distance desc, e.bib)
                 from marathon_entries e join profiles p on p.id = e.user_id where e.race = r), '[]'::jsonb),
    'last', case when last is null then null else jsonb_build_object('race', last,
      'podium', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'finishMs', e.finish_ms) order by e.finish_ms)
                 from (select * from marathon_entries where race = last and finish_ms is not null order by finish_ms limit 3) e join profiles p on p.id = e.user_id), '[]'::jsonb),
      'finishers', (select count(*) from marathon_entries where race = last and finish_ms is not null)) end
  );
end $$;
grant execute on function public.marathon_overview() to authenticated;

do $$ begin alter publication supabase_realtime add table public.marathon_entries; exception when duplicate_object then null; end $$;
