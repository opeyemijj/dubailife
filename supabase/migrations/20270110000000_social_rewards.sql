-- Rewards for taking part with other players (requirements R5, R9), and Spaces recorded on the server so hosting
-- and listening can count.
--
-- Amounts and rules: src/data/social/rewards.json, mirrored exactly in social_rewards_config() below (checked by
-- scripts/check-life-config.mjs). The database settles every 5 minutes (settle_social_rewards), so a host who has
-- closed the app is still paid; each payout is a ledger grant, a City Feed post, and a celebration the player sees
-- next time they're in (my_unseen_rewards).
--
-- Who counts: real accounts only (at least 3 days old, verified email, not an admin or leaderboard-excluded
-- account); a guest or listener counts once they've stayed 10 minutes; a guest counts toward one host's party
-- reward a day.

-- The switch: nothing is paid until app_settings 'social_rewards' has enabled: true (turned on once the app update
-- that shows the rewards is live).
insert into public.app_settings (key, value) values ('social_rewards', '{"enabled": false}'::jsonb) on conflict (key) do nothing;
create or replace function public.social_rewards_on() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((setting('social_rewards') ->> 'enabled')::boolean, false)
$$;

create or replace function public.social_rewards_config() returns jsonb
language sql immutable as $$
  select '{"eligibility":{"minAccountDays":3,"verifiedEmail":true,"stayMinutes":10},"party":{"tiers":[{"count":3,"aed":1000000},{"count":5,"aed":3000000},{"count":10,"aed":10000000}]},"space":{"tiers":[{"count":5,"aed":1000000},{"count":10,"aed":5000000},{"count":20,"aed":10000000}]},"inviteJoin":{"aed":1000000,"perDay":10},"signup":{"aed":2000000,"playMinutes":10},"gameWin":{"aed":1000000,"perDay":5},"attend":{"aed":1000000,"perDay":1},"followTop":{"aed":1000000,"follows":5}}'::jsonb
$$;

create or replace function public.dubai_day(t timestamptz default now()) returns date
language sql stable as $$ select (t at time zone 'Asia/Dubai')::date $$;

/** A real account that can earn and count: old enough, email verified, not an admin or excluded account. */
create or replace function public.reward_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = p_user
                   and p.created_at <= now() - make_interval(days => (social_rewards_config() -> 'eligibility' ->> 'minAccountDays')::int))
     and public.email_verified(p_user)
     and not public.off_leaderboard(p_user)
$$;

-- ---------------------------------------------------------------- what's been paid

create table if not exists public.social_rewards (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('party', 'space', 'invite_join', 'signup', 'game_win', 'attend', 'follow_top')),
  ref text not null,
  day date not null default public.dubai_day(),
  amount bigint not null check (amount > 0),
  why text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists social_rewards_user_day on public.social_rewards (user_id, day);
alter table public.social_rewards enable row level security;
drop policy if exists "see own rewards" on public.social_rewards;
create policy "see own rewards" on public.social_rewards for select using (user_id = auth.uid());

/** Pays once per (player, kind, ref): the ledger, the record, and a City Feed post. Returns whether it paid. */
create or replace function public.pay_social_reward(p_user uuid, p_kind text, p_ref text, p_amount bigint, p_why text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount <= 0 then return false; end if;
  insert into social_rewards (user_id, kind, ref, amount, why) values (p_user, p_kind, p_ref, p_amount, p_why)
    on conflict (user_id, kind, ref) do nothing;
  if not found then return false; end if;
  perform coin_move(p_user, p_amount, 'grant', 'Reward: ' || p_why, 'social:' || p_kind || ':' || p_ref);
  perform feed_post(p_user, 'reward', jsonb_build_object('amount', p_amount, 'why', p_why), null, 'reward:' || p_kind || ':' || p_ref || ':' || p_user);
  return true;
end $$;
revoke all on function public.pay_social_reward(uuid, text, text, bigint, text) from public, anon, authenticated;

-- 'reward' posts are about money.
create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward') then 'money'
    when p_kind in ('win') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;

-- ---------------------------------------------------------------- Spaces on the server

create table if not exists public.space_sessions (
  id text primary key check (length(id) between 4 and 80),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists space_sessions_host on public.space_sessions (host_id, started_at desc);
alter table public.space_sessions enable row level security;

create table if not exists public.space_listeners (
  space_id text not null references public.space_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
alter table public.space_listeners enable row level security;

/** The host started a Space (or it's still going: a heartbeat). */
create or replace function public.space_started(p_id text, p_title text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into space_sessions (id, host_id, title) values (p_id, auth.uid(), left(p_title, 120))
    on conflict (id) do update set last_seen_at = now(), title = coalesce(excluded.title, space_sessions.title)
      where space_sessions.host_id = auth.uid() and space_sessions.ended_at is null;
end $$;
revoke all on function public.space_started(text, text) from public, anon;
grant execute on function public.space_started(text, text) to authenticated;

/** I'm in this Space (sent every minute while in it). */
create or replace function public.space_here(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from space_sessions where id = p_id and ended_at is null) then return; end if;
  if exists (select 1 from space_sessions where id = p_id and host_id = auth.uid()) then
    update space_sessions set last_seen_at = now() where id = p_id;
    return;
  end if;
  insert into space_listeners (space_id, user_id) values (p_id, auth.uid())
    on conflict (space_id, user_id) do update set last_seen_at = now();
end $$;
revoke all on function public.space_here(text) from public, anon;
grant execute on function public.space_here(text) to authenticated;

create or replace function public.space_ended(p_id text) returns void
language sql security definer set search_path = public as $$
  update space_sessions set ended_at = now() where id = p_id and host_id = auth.uid() and ended_at is null
$$;
revoke all on function public.space_ended(text) from public, anon;
grant execute on function public.space_ended(text) to authenticated;

-- ---------------------------------------------------------------- came through an invite

create table if not exists public.invite_joins (
  host_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('party', 'space')),
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (guest_id, kind, ref)
);
alter table public.invite_joins enable row level security;

/** A player opened a host's invite link to a party or Space (?via=host). Counted once they've stayed. */
create or replace function public.came_via(p_host text, p_kind text, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare h uuid; ref text;
begin
  if auth.uid() is null or p_kind not in ('party', 'space') then return; end if;
  select id into h from profiles where username = lower(trim(p_host));
  if h is null or h = auth.uid() then return; end if;
  -- A party link carries its invite code; parties are counted by id.
  if p_kind = 'party' and p_ref !~ '^\d+$' then
    select id::text into ref from invites where code = upper(p_ref);
    if ref is null then return; end if;
  else
    ref := left(p_ref, 80);
  end if;
  insert into invite_joins (host_id, guest_id, kind, ref) values (h, auth.uid(), p_kind, ref) on conflict do nothing;
end $$;
revoke all on function public.came_via(text, text, text) from public, anon;
grant execute on function public.came_via(text, text, text) to authenticated;

-- ---------------------------------------------------------------- settling

/** Guests who count at a party: real accounts, not the host, stayed 10 minutes. */
create or replace function public.party_counted_guests(p_invite bigint) returns setof uuid
language sql stable security definer set search_path = public as $$
  select g.user_id from invite_guests g join invites i on i.id = g.invite_id
   where g.invite_id = p_invite and g.arrived_at is not null and g.user_id <> i.host_id
     and g.arrived_at + make_interval(mins => (social_rewards_config() -> 'eligibility' ->> 'stayMinutes')::int)
         <= least(coalesce(i.ends_at, i.starts_at + interval '3 hours'), now())
     and reward_eligible(g.user_id)
     -- One host a day: the first party they went to that day.
     and not exists (select 1 from invite_guests g2 join invites i2 on i2.id = g2.invite_id
                      where g2.user_id = g.user_id and i2.host_id <> i.host_id and g2.arrived_at is not null
                        and dubai_day(g2.arrived_at) = dubai_day(g.arrived_at) and g2.arrived_at < g.arrived_at)
$$;

/** Listeners who count in a Space: real accounts, not the host, there 10 minutes. */
create or replace function public.space_counted_listeners(p_space text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select l.user_id from space_listeners l join space_sessions s on s.id = l.space_id
   where l.space_id = p_space and l.user_id <> s.host_id
     and l.last_seen_at - l.joined_at >= make_interval(mins => (social_rewards_config() -> 'eligibility' ->> 'stayMinutes')::int)
     and reward_eligible(l.user_id)
     -- One host a day: the first Space they joined that day.
     and not exists (select 1 from space_listeners l2 join space_sessions s2 on s2.id = l2.space_id
                      where l2.user_id = l.user_id and s2.host_id <> s.host_id
                        and dubai_day(l2.joined_at) = dubai_day(l.joined_at) and l2.joined_at < l.joined_at)
$$;

/** The tier's amount reached by a count (0 below the first tier). */
create or replace function public.tier_amount(p_tiers jsonb, p_count bigint) returns bigint
language sql immutable as $$
  select coalesce(max((t ->> 'aed')::bigint), 0) from jsonb_array_elements(p_tiers) t where (t ->> 'count')::bigint <= p_count
$$;

/** Settles everything due today. Run every 5 minutes by pg_cron; safe to run any number of times. */
create or replace function public.settle_social_rewards() returns int
language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := social_rewards_config(); today date := dubai_day(); paid int := 0;
  r record; best bigint; already bigint; n bigint;
begin
  if not social_rewards_on() then return 0; end if;
  -- Hosting parties: the best single party today sets the day's amount; the difference from what's been paid is paid.
  for r in
    select i.host_id, max((select count(*) from party_counted_guests(i.id))) as guests
      from invites i
     where i.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(i.cancelled, false)
       and dubai_day(i.starts_at) = today and i.starts_at <= now()
     group by i.host_id
  loop
    if not reward_eligible(r.host_id) then continue; end if;
    best := tier_amount(cfg -> 'party' -> 'tiers', r.guests);
    select coalesce(sum(amount), 0) into already from social_rewards where user_id = r.host_id and kind = 'party' and day = today;
    if best > already and pay_social_reward(r.host_id, 'party', today || ':' || best, best - already,
         'hosted a party with ' || r.guests || ' friends') then paid := paid + 1; end if;
  end loop;

  -- Hosting Spaces: the same, by listeners.
  for r in
    select s.host_id, max((select count(*) from space_counted_listeners(s.id))) as listeners
      from space_sessions s where dubai_day(s.started_at) = today group by s.host_id
  loop
    if not reward_eligible(r.host_id) then continue; end if;
    best := tier_amount(cfg -> 'space' -> 'tiers', r.listeners);
    select coalesce(sum(amount), 0) into already from social_rewards where user_id = r.host_id and kind = 'space' and day = today;
    if best > already and pay_social_reward(r.host_id, 'space', today || ':' || best, best - already,
         'hosted a Space with ' || r.listeners || ' listeners') then paid := paid + 1; end if;
  end loop;

  -- Friends who came through the host's invite and stayed.
  for r in
    select j.* from invite_joins j
     where dubai_day(j.created_at) = today
       and ((j.kind = 'party' and j.ref ~ '^\d+$' and j.guest_id in (select party_counted_guests(j.ref::bigint)))
         or (j.kind = 'space' and j.guest_id in (select space_counted_listeners(j.ref))))
  loop
    if not reward_eligible(r.host_id) then continue; end if;
    select count(*) into n from social_rewards where user_id = r.host_id and kind = 'invite_join' and day = today;
    if n >= (cfg -> 'inviteJoin' ->> 'perDay')::int then continue; end if;
    if pay_social_reward(r.host_id, 'invite_join', r.kind || ':' || r.ref || ':' || r.guest_id, (cfg -> 'inviteJoin' ->> 'aed')::bigint,
         'a friend joined from their invite') then paid := paid + 1; end if;
  end loop;

  -- Going to a party or a Space for 10 minutes: once a day.
  for r in
    select distinct g.user_id from invites i, party_counted_guests(i.id) g(user_id)
     where i.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and dubai_day(i.starts_at) = today
    union
    select distinct l.user_id from space_sessions s, space_counted_listeners(s.id) l(user_id) where dubai_day(s.started_at) = today
  loop
    if pay_social_reward(r.user_id, 'attend', today::text, (cfg -> 'attend' ->> 'aed')::bigint, 'joined a party or Space') then paid := paid + 1; end if;
  end loop;

  -- New players who signed up through a link and played 10 minutes: their inviter is paid.
  for r in
    select f.inviter_id, f.invitee_id, p.username from referrals f join profiles p on p.id = f.invitee_id
     where f.created_at > now() - interval '14 days'
       -- Only sign-ups since the rewards were switched on (the switch records when: 'since').
       and f.created_at >= coalesce((setting('social_rewards') ->> 'since')::timestamptz, now())
       and coalesce(p.last_seen, p.created_at) - p.created_at >= make_interval(mins => (cfg -> 'signup' ->> 'playMinutes')::int)
  loop
    if not reward_eligible(r.inviter_id) then continue; end if;
    if pay_social_reward(r.inviter_id, 'signup', r.invitee_id::text, (cfg -> 'signup' ->> 'aed')::bigint,
         '@' || coalesce(r.username, 'someone') || ' joined Dubai Life with their link') then paid := paid + 1; end if;
  end loop;

  return paid;
end $$;
revoke all on function public.settle_social_rewards() from public, anon, authenticated;

-- Game wins against real players: paid as they happen, first 5 a day.
create or replace function public.reward_on_game() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg jsonb := social_rewards_config(); n int;
begin
  if not social_rewards_on() or new.outcome <> 'win' or new.mode <> 'multiplayer' or not reward_eligible(new.user_id) then return new; end if;
  select count(*) into n from social_rewards where user_id = new.user_id and kind = 'game_win' and day = dubai_day();
  if n < (cfg -> 'gameWin' ->> 'perDay')::int then
    perform pay_social_reward(new.user_id, 'game_win', new.id::text, (cfg -> 'gameWin' ->> 'aed')::bigint, 'won a game against a real player');
  end if;
  return new;
end $$;
drop trigger if exists reward_on_game on public.game_results;
create trigger reward_on_game after insert on public.game_results for each row execute function public.reward_on_game();

/** Following the top users when you join: once, for following at least 5. Returns the amount paid (0 if not). */
create or replace function public.claim_follow_reward() returns bigint
language plpgsql security definer set search_path = public as $$
declare cfg jsonb := social_rewards_config(); amt bigint := (cfg -> 'followTop' ->> 'aed')::bigint;
begin
  if auth.uid() is null or not social_rewards_on() then return 0; end if;
  if (select count(*) from follows where follower_id = auth.uid()) < (cfg -> 'followTop' ->> 'follows')::int then return 0; end if;
  if not exists (select 1 from profiles where id = auth.uid() and created_at > now() - interval '14 days') then return 0; end if;
  if pay_social_reward(auth.uid(), 'follow_top', 'once', amt, 'followed the top users') then return amt; end if;
  return 0;
end $$;
revoke all on function public.claim_follow_reward() from public, anon;
grant execute on function public.claim_follow_reward() to authenticated;

/** Rewards I haven't seen celebrated yet; marks them seen. */
create or replace function public.my_unseen_rewards() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  with u as (
    update social_rewards set seen = true where user_id = auth.uid() and not seen
    returning id, kind, amount, why, created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'amount', amount, 'why', why) order by created_at), '[]'::jsonb) into out from u;
  return out;
end $$;
revoke all on function public.my_unseen_rewards() from public, anon;
grant execute on function public.my_unseen_rewards() to authenticated;

/** My progress today, for the host screen and the goal pill. */
create or replace function public.my_reward_progress() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'eligible', reward_eligible(auth.uid()),
    'partyGuests', coalesce((select max((select count(*) from party_counted_guests(i.id))) from invites i
                              where i.host_id = auth.uid() and dubai_day(i.starts_at) = dubai_day() and i.starts_at <= now()), 0),
    'spaceListeners', coalesce((select max((select count(*) from space_counted_listeners(s.id))) from space_sessions s
                                 where s.host_id = auth.uid() and dubai_day(s.started_at) = dubai_day()), 0),
    'paidToday', coalesce((select sum(amount) from social_rewards where user_id = auth.uid() and day = dubai_day()), 0),
    'wins', (select count(*) from social_rewards where user_id = auth.uid() and kind = 'game_win' and day = dubai_day()),
    'attended', exists (select 1 from social_rewards where user_id = auth.uid() and kind = 'attend' and day = dubai_day()),
    'followClaimed', exists (select 1 from social_rewards where user_id = auth.uid() and kind = 'follow_top'))
$$;
revoke all on function public.my_reward_progress() from public, anon;
grant execute on function public.my_reward_progress() to authenticated;

-- Hosting Spaces counts toward this week's top users: 100 a Space, 30 a listener who stayed.
create or replace function public.top_users_week(p_limit int default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  with wk as (select dubai_week_start() as s),
  parties as (
    select i.host_id as id, count(*) as hosted,
           sum((select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null)) as guests
      from invites i, wk
     where i.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(i.cancelled, false)
       and i.starts_at >= wk.s and i.starts_at <= now()
     group by i.host_id
  ),
  spaces as (
    select s.host_id as id, count(*) as hosted,
           sum((select count(*) from space_listeners l where l.space_id = s.id and l.last_seen_at - l.joined_at >= interval '10 minutes')) as listeners
      from space_sessions s, wk where s.started_at >= wk.s group by s.host_id
  ),
  wins as (select r.user_id as id, count(*) as n from game_results r, wk where r.outcome = 'win' and r.mode = 'multiplayer' and r.created_at >= wk.s group by 1),
  refs as (select f.inviter_id as id, count(*) as n from referrals f, wk where f.created_at >= wk.s group by 1),
  gifts as (select t.from_id as id, sum(t.amount) as amt from transfers t, wk where t.created_at >= wk.s group by 1),
  scored as (
    select p.id,
           coalesce(pa.hosted, 0) as hosted, coalesce(pa.guests, 0) as guests, coalesce(sp.hosted, 0) as spaces,
           coalesce(sp.listeners, 0) as listeners, coalesce(w.n, 0) as wins,
           coalesce(rf.n, 0) as invited, coalesce(gf.amt, 0) as gave,
           coalesce(pa.hosted, 0) * 100 + coalesce(pa.guests, 0) * 30 + coalesce(sp.hosted, 0) * 100 + coalesce(sp.listeners, 0) * 30
             + coalesce(w.n, 0) * 20 + coalesce(rf.n, 0) * 50 + least(floor(coalesce(gf.amt, 0) / 1000000) * 10, 200)::bigint as score
      from profiles p
      left join parties pa on pa.id = p.id
      left join spaces sp on sp.id = p.id
      left join wins w on w.id = p.id
      left join refs rf on rf.id = p.id
      left join gifts gf on gf.id = p.id
     where p.username is not null and not off_leaderboard(p.id)
  )
  select coalesce(jsonb_agg(x order by (x ->> 'score')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'score', s.score,
             'hosted', s.hosted, 'guests', s.guests, 'spaces', s.spaces, 'listeners', s.listeners, 'wins', s.wins,
             'invited', s.invited, 'gave', s.gave,
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from scored s join profiles p on p.id = s.id
     where s.score > 0
     order by s.score desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.top_users_week(int) from public, anon;
grant execute on function public.top_users_week(int) to authenticated;

-- Every 5 minutes; Spaces with no heartbeat for 3 minutes are closed.
do $$ begin
  perform cron.unschedule('social-rewards');
exception when others then null;
end $$;
select cron.schedule('social-rewards', '*/5 * * * *', $$
  update public.space_sessions set ended_at = last_seen_at where ended_at is null and last_seen_at < now() - interval '3 minutes';
  select public.settle_social_rewards();
$$);
