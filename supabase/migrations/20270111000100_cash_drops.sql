-- Cash drops at parties and the Big Givers list (requirements R6).
--
-- Anyone at a live party (the host, or a guest who has arrived) can make it rain: they put in an amount and a number
-- of shares, the money leaves their account at once, and everyone else at the party can grab one share for the next
-- 2 minutes. What's not grabbed goes back to the giver. Each drop is a City Feed post. Gifts are only ever offered:
-- there's no way to ask for money.
--
-- Big Givers: this week's players who gave the most to others (gifts sent, and cash-drop shares grabbed by others),
-- with a Generous badge for the top 3. Admin and excluded accounts never appear. Cash drops given also count toward
-- the weekly top users' score (10 per million, up to 200), like gifts.

create table if not exists public.cash_drops (
  id bigint generated always as identity primary key,
  giver_id uuid not null references public.profiles (id) on delete cascade,
  invite_id bigint not null references public.invites (id) on delete cascade,
  total bigint not null check (total > 0),
  shares int not null check (shares between 2 and 50),
  per_share bigint not null check (per_share > 0),
  claimed int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  settled boolean not null default false
);
create index if not exists cash_drops_invite on public.cash_drops (invite_id, expires_at desc);
create index if not exists cash_drops_open on public.cash_drops (expires_at) where not settled;
alter table public.cash_drops enable row level security;

create table if not exists public.cash_drop_claims (
  drop_id bigint not null references public.cash_drops (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);
alter table public.cash_drop_claims enable row level security;

/** At this live party right now: the host, or a guest who has arrived. */
create or replace function public.at_party(p_invite bigint, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from invites i where i.id = p_invite and not coalesce(i.cancelled, false)
                   and i.starts_at <= now() and coalesce(i.ends_at, i.starts_at + interval '3 hours') > now()
                   and (i.host_id = p_user or exists (select 1 from invite_guests g where g.invite_id = i.id and g.user_id = p_user and g.arrived_at is not null)))
$$;

/** Make it rain at the party (by its invite code): p_total split into p_shares. Returns the drop's id. */
create or replace function public.make_it_rain(p_code text, p_total bigint, p_shares int) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); i invites; d bigint; per bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into i from invites where code = upper(p_code);
  if i.id is null or not at_party(i.id, me) then raise exception 'not_at_party'; end if;
  if p_shares is null or p_shares < 2 or p_shares > 50 then raise exception 'bad_shares'; end if;
  if p_total is null or p_total < 100000 or p_total > 1000000000 then raise exception 'bad_amount'; end if;
  per := p_total / p_shares;
  if per < 10000 then raise exception 'bad_amount'; end if;
  -- One drop at a time per party.
  if exists (select 1 from cash_drops where invite_id = i.id and not settled and expires_at > now() and claimed < shares) then raise exception 'drop_running'; end if;
  insert into cash_drops (giver_id, invite_id, total, shares, per_share) values (me, i.id, p_total, p_shares, per) returning id into d;
  perform coin_move(me, -p_total, 'transfer_out', 'Made it rain at ' || coalesce(i.title, i.label, 'a party'), 'rain:' || d);
  perform feed_post(me, 'rain', jsonb_build_object('total', p_total, 'shares', p_shares, 'route', i.route, 'title', coalesce(i.title, i.label),
    'code', i.code), i.host_id, 'rain:' || d);
  return d;
end $$;
revoke all on function public.make_it_rain(text, bigint, int) from public, anon;
grant execute on function public.make_it_rain(text, bigint, int) to authenticated;

/** Grab a share of a cash drop at the party you're at. Returns the amount (0 if it's gone or not for you). */
create or replace function public.grab_cash(p_drop bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d cash_drops; giver text;
begin
  if me is null then return 0; end if;
  select * into d from cash_drops where id = p_drop for update;
  if d.id is null or d.settled or d.expires_at <= now() or d.claimed >= d.shares or d.giver_id = me then return 0; end if;
  if not at_party(d.invite_id, me) then return 0; end if;
  insert into cash_drop_claims (drop_id, user_id, amount) values (d.id, me, d.per_share) on conflict do nothing;
  if not found then return 0; end if;
  update cash_drops set claimed = claimed + 1 where id = d.id;
  select username into giver from profiles where id = d.giver_id;
  perform coin_move(me, d.per_share, 'transfer_in', 'Grabbed @' || coalesce(giver, 'someone') || '''s cash drop', 'rain:' || d.id || ':' || me);
  return d.per_share;
end $$;
revoke all on function public.grab_cash(bigint) from public, anon;
grant execute on function public.grab_cash(bigint) to authenticated;

/** The party's cash drop going on now, if any (by invite code). */
create or replace function public.party_cash_drop(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', d.id, 'giver', p.username, 'giverId', d.giver_id, 'perShare', d.per_share, 'total', d.total,
           'left', d.shares - d.claimed, 'shares', d.shares, 'expiresAt', d.expires_at,
           'mine', exists (select 1 from cash_drop_claims c where c.drop_id = d.id and c.user_id = auth.uid()))
    from cash_drops d join invites i on i.id = d.invite_id join profiles p on p.id = d.giver_id
   where i.code = upper(p_code) and not d.settled and d.expires_at > now() and d.claimed < d.shares
   order by d.id desc limit 1
$$;
revoke all on function public.party_cash_drop(text) from public, anon;
grant execute on function public.party_cash_drop(text) to authenticated;

/** Drops that have run out of time: what wasn't grabbed goes back to the giver. Run every minute. */
create or replace function public.settle_cash_drops() returns int
language plpgsql security definer set search_path = public as $$
declare d cash_drops; back bigint; n int := 0;
begin
  for d in select * from cash_drops where not settled and (expires_at <= now() or claimed >= shares) for update skip locked loop
    back := d.total - d.claimed * d.per_share;
    update cash_drops set settled = true where id = d.id;
    if back > 0 then perform coin_move(d.giver_id, back, 'refund', 'Cash drop: what nobody grabbed', 'rain:' || d.id || ':back'); end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.settle_cash_drops() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('cash-drops');
exception when others then null;
end $$;
select cron.schedule('cash-drops', '* * * * *', $$select public.settle_cash_drops()$$);

-- 'rain' posts are about money.
create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward', 'rain') then 'money'
    when p_kind in ('win') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;

-- ---------------------------------------------------------------- Big Givers

/** What each player gave to others this week: gifts sent and cash-drop shares grabbed by others. */
create or replace function public.given_this_week() returns table (id uuid, gifts bigint, drops bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with wk as (select dubai_week_start() as s),
  g as (select t.from_id as id, sum(t.amount) as amt from transfers t, wk where t.created_at >= wk.s and t.from_id <> t.to_id group by 1),
  r as (select d.giver_id as id, sum(c.amount) as amt from cash_drop_claims c join cash_drops d on d.id = c.drop_id, wk
         where c.created_at >= wk.s group by 1)
  select coalesce(g.id, r.id), coalesce(g.amt, 0)::bigint, coalesce(r.amt, 0)::bigint, (coalesce(g.amt, 0) + coalesce(r.amt, 0))::bigint
    from g full join r on r.id = g.id
$$;
revoke all on function public.given_this_week() from public, anon, authenticated;

create or replace function public.big_givers_week(p_limit int default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'total')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'total', w.total, 'gifts', w.gifts, 'drops', w.drops,
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from given_this_week() w join profiles p on p.id = w.id
     where w.total > 0 and p.username is not null and not off_leaderboard(p.id)
     order by w.total desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.big_givers_week(int) from public, anon;
grant execute on function public.big_givers_week(int) to authenticated;

/** The Generous badge: one of this week's top 3 givers. */
create or replace function public.is_generous(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user in (select w.id from given_this_week() w where w.total > 0 and not off_leaderboard(w.id) order by w.total desc limit 3)
$$;
revoke all on function public.is_generous(uuid) from public, anon;
grant execute on function public.is_generous(uuid) to authenticated;

-- Top users: giving now includes cash drops grabbed by others.
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
  gifts as (select g.id, g.total as amt from given_this_week() g),
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
