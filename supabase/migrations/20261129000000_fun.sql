-- Life & Fun goals, next to the ordered life path: love (a boyfriend or girlfriend, dates, every date spot),
-- nightlife (the club, weekend parties, brunch), beach and outdoors (beaches, waterparks) and staycations and
-- treats (hotel nights, attractions). The game logs a fun visit when you go into one of those venues or book
-- a hotel night (once per kind, place and Dubai day); love goals read Hayati. Each goal is collected once for
-- XP. The weekend card: do two different fun things on a Saturday or Sunday (Dubai time) for 60 XP; weekends
-- in a row make the weekend streak. Dating moves here, so the life path's last goal is Marriage and family.
-- Numbers mirror src/data/life/fun.json and goals.json (scripts/check-life-config.mjs).

create table if not exists public.fun_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('beach', 'club', 'hotel', 'staycation', 'brunch', 'attraction', 'waterpark')),
  place text not null,
  venue text,
  item text,
  dday date not null default (now() at time zone 'Asia/Dubai')::date,
  created_at timestamptz not null default now(),
  unique (user_id, kind, place, dday)
);
create index if not exists fun_log_user on public.fun_log (user_id, kind, dday);
create table if not exists public.fun_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, claim)
);
alter table public.fun_log enable row level security;
alter table public.fun_claims enable row level security;
drop policy if exists "see own fun" on public.fun_log;
create policy "see own fun" on public.fun_log for select using (user_id = auth.uid());
drop policy if exists "see own fun claims" on public.fun_claims;
create policy "see own fun claims" on public.fun_claims for select using (user_id = auth.uid());

/** Log a fun visit (called by the game as you go in). Brunch only counts on a Friday, Saturday or Sunday. */
create or replace function public.log_fun(p_kind text, p_place text, p_venue text default null, p_item text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Dubai')::date;
begin
  if auth.uid() is null then return; end if;
  if p_kind = 'brunch' and extract(isodow from d) not in (5, 6, 7) then return; end if;
  insert into fun_log (user_id, kind, place, venue, item) values (auth.uid(), p_kind, left(p_place, 120), left(p_venue, 120), left(p_item, 120))
    on conflict do nothing;
end $$;
grant execute on function public.log_fun(text, text, text, text) to authenticated;

/** {check, count, XP} for each fun goal. */
create or replace function public.fun_goal(p_id text) returns text[]
language sql immutable as $$
  select case p_id
    when 'partner' then array['dating', '1', '100']
    when 'first-date' then array['dates', '1', '50']
    when 'date-spots' then array['date-spots', '8', '200']
    when 'first-club' then array['club', '1', '50']
    when 'party-weekends' then array['club-weekends', '4', '150']
    when 'brunch' then array['brunch', '1', '50']
    when 'beach-day' then array['beach', '1', '50']
    when 'beaches' then array['beach-places', '4', '150']
    when 'waterpark' then array['waterpark', '1', '75']
    when 'staycation' then array['staycation', '1', '100']
    when 'hotels' then array['staycation-places', '3', '200']
    when 'sights' then array['attraction-places', '3', '100'] end
$$;

/** How far along a fun check you are. */
create or replace function public.fun_progress(p_user uuid, p_check text) returns int
language sql stable security definer set search_path = public as $$
  select case p_check
    when 'dating' then (exists (select 1 from relationships where p_user in (man_id, woman_id)))::int
    when 'dates' then (select count(*) from love_days where user_id = p_user and kind = 'date')::int
    when 'date-spots' then (select count(distinct place) from love_days where user_id = p_user and kind = 'date' and place is not null)::int
    when 'club-weekends' then (select count(distinct date_trunc('week', dday)) from fun_log where user_id = p_user and kind = 'club' and extract(isodow from dday) in (6, 7))::int
    when 'beach-places' then (select count(distinct place) from fun_log where user_id = p_user and kind = 'beach')::int
    when 'staycation-places' then (select count(distinct place) from fun_log where user_id = p_user and kind = 'staycation')::int
    when 'attraction-places' then (select count(distinct place) from fun_log where user_id = p_user and kind = 'attraction')::int
    else (select count(*) from fun_log where user_id = p_user and kind = p_check)::int end
$$;

/** The Saturday of the weekend that's on now (or the coming one, Monday to Friday). */
create or replace function public.fun_weekend(d date) returns date
language sql immutable as $$
  select case when extract(isodow from d) = 7 then d - 1 when extract(isodow from d) = 6 then d else d + (6 - extract(isodow from d))::int end
$$;

/** Which weekend options you did on the weekend starting Saturday p_sat. */
create or replace function public.fun_weekend_done(p_user uuid, p_sat date) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct k), '{}') from (
    select kind as k from fun_log where user_id = p_user and dday in (p_sat, p_sat + 1) and kind in ('club', 'beach', 'brunch', 'staycation', 'attraction', 'waterpark')
    union all
    select 'date' from love_days where user_id = p_user and kind = 'date'
      and day in (public.life_day((p_sat + time '12:00') at time zone 'Asia/Dubai'), public.life_day((p_sat + 1 + time '12:00') at time zone 'Asia/Dubai'))
  ) x
$$;

/** Your fun goals, this weekend's card and your weekend streak. */
create or replace function public.fun_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'Asia/Dubai')::date; sat date; done text[]; streak int := 0; w date;
        ids text[] := array['partner', 'first-date', 'date-spots', 'first-club', 'party-weekends', 'brunch', 'beach-day', 'beaches', 'waterpark', 'staycation', 'hotels', 'sights'];
        goals jsonb := '[]'::jsonb; g text; spec text[];
begin
  if me is null then raise exception 'not_signed_in'; end if;
  foreach g in array ids loop
    spec := public.fun_goal(g);
    goals := goals || jsonb_build_object('id', g, 'progress', least(public.fun_progress(me, spec[1]), spec[2]::int),
                                         'claimed', exists (select 1 from fun_claims where user_id = me and claim = 'goal:' || g));
  end loop;
  sat := public.fun_weekend(today);
  done := public.fun_weekend_done(me, sat);
  -- The streak: weekends in a row with two or more, counting this one only once it's done.
  w := case when coalesce(array_length(done, 1), 0) >= 2 then sat else sat - 7 end;
  while streak < 52 and coalesce(array_length(public.fun_weekend_done(me, w), 1), 0) >= 2 loop streak := streak + 1; w := w - 7; end loop;
  return jsonb_build_object('goals', goals,
    'weekend', jsonb_build_object('saturday', sat, 'now', extract(isodow from today) in (6, 7), 'done', to_jsonb(done),
      'claimed', exists (select 1 from fun_claims where user_id = me and claim = 'weekend:' || sat)),
    'streak', streak);
end $$;
grant execute on function public.fun_status() to authenticated;

/** Collect a fun goal ('goal:<id>') or this weekend's card ('weekend'). Returns the XP. */
create or replace function public.claim_fun(p_claim text) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); spec text[]; sat date; id text; xp int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_claim = 'weekend' then
    sat := public.fun_weekend((now() at time zone 'Asia/Dubai')::date);
    if coalesce(array_length(public.fun_weekend_done(me, sat), 1), 0) < 2 then raise exception 'not_done'; end if;
    id := 'weekend:' || sat; xp := 60;
  else
    spec := public.fun_goal(substr(p_claim, 6));
    if p_claim not like 'goal:%' or spec is null then raise exception 'bad_claim'; end if;
    if public.fun_progress(me, spec[1]) < spec[2]::int then raise exception 'not_done'; end if;
    id := p_claim; xp := spec[3]::int;
  end if;
  insert into fun_claims (user_id, claim) values (me, id) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  return public.add_points(me, 'wellbeing', xp, 'fun:' || id || ':' || me);
end $$;
grant execute on function public.claim_fun(text) to authenticated;

-- The life path's last goal is now Marriage and family (dating is a Life & Fun goal).
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
    when 'love' then array['engaged', 'married'] end
$$;
