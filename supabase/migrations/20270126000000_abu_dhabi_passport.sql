-- The Abu Dhabi Passport (src/data/abuDhabi/passport.json): a stamp for each landmark's signature thing, done there.
-- The game stamps it when you finish that activity (or buy the one thing) in Abu Dhabi; filling the book pays
-- rewards at 4, 8, 12 and all 16 stamps, the last with the "Abu Dhabi Explorer" title. The stamps and rewards are
-- mirrored here (passport_stamp_ok, passport_reward) and checked by scripts/check-life-config.mjs.
--   - Only in Abu Dhabi (public.player_city): a stamp is collected where the landmark is.
--   - Each stamp once; at most one stamp every 20 seconds (the activities themselves take longer than that).

create or replace function public.passport_stamp_ok(p_id text) returns boolean
language sql immutable as $$
  select p_id in ('grand-mosque', 'qasr-al-watan', 'louvre', 'emirates-palace', 'al-hosn', 'heritage', 'mangroves', 'turtles',
                  'formula-rossa', 'waterworld', 'grand-prix', 'etihad-arena', 'falcons', 'flamingos', 'desert-safari', 'moreeb')
$$;

/** The reward for reaching `p_count` stamps (0 when that count isn't a milestone). */
create or replace function public.passport_reward(p_count int) returns bigint
language sql immutable as $$
  select case p_count when 4 then 500 when 8 then 1500 when 12 then 3000 when 16 then 10000 else 0 end::bigint
$$;

/** How many stamps fill the book (the last reward, and the title). */
create or replace function public.passport_size() returns int
language sql immutable as $$ select 16 $$;

create table if not exists public.passport_stamps (
  user_id uuid not null references auth.users(id) on delete cascade,
  stamp text not null,
  stamped_at timestamptz not null default now(),
  primary key (user_id, stamp)
);
alter table public.passport_stamps enable row level security;
drop policy if exists "own stamps" on public.passport_stamps;
create policy "own stamps" on public.passport_stamps for select using (user_id = auth.uid());

/** Stamps the passport. Returns {stamp, new, count, reward, complete}; `new` is false for one you already have. */
create or replace function public.collect_passport_stamp(p_stamp text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; pay bigint := 0;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not passport_stamp_ok(p_stamp) then raise exception 'bad_stamp'; end if;
  if player_city(me) <> 'abu-dhabi' then raise exception 'not_in_city'; end if;
  if exists (select 1 from passport_stamps where user_id = me and stamp = p_stamp) then
    select count(*) into n from passport_stamps where user_id = me;
    return jsonb_build_object('stamp', p_stamp, 'new', false, 'count', n, 'reward', 0, 'complete', n >= passport_size());
  end if;
  if exists (select 1 from passport_stamps where user_id = me and stamped_at > now() - interval '20 seconds') then raise exception 'too_soon'; end if;
  insert into passport_stamps (user_id, stamp) values (me, p_stamp);
  select count(*) into n from passport_stamps where user_id = me;
  pay := passport_reward(n);
  if pay > 0 then
    perform coin_move(me, pay, 'earn', 'Abu Dhabi Passport: ' || n || ' stamps', 'passport:' || n);
  end if;
  return jsonb_build_object('stamp', p_stamp, 'new', true, 'count', n, 'reward', pay, 'complete', n >= passport_size());
end $$;
revoke all on function public.collect_passport_stamp(text) from public, anon;
grant execute on function public.collect_passport_stamp(text) to authenticated;

/** My stamps, oldest first. */
create or replace function public.my_passport() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('stamp', stamp, 'at', stamped_at) order by stamped_at), '[]'::jsonb)
    from passport_stamps where user_id = auth.uid()
$$;
revoke all on function public.my_passport() from public, anon;
grant execute on function public.my_passport() to authenticated;

/** Anyone's count (the Abu Dhabi Explorer title on profiles). */
create or replace function public.passport_count(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from passport_stamps where user_id = p_user
$$;
grant execute on function public.passport_count(uuid) to anon, authenticated;
