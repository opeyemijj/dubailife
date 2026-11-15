-- Top users always shows people, the lists offer Add friend and Message instead of Follow, and "Available to chat":
-- the real players online right now.
--
-- Top users: this week's; when nobody has done anything yet this week, last week's; then the last 30 days; and at the
-- very least the most recently active players. Each row says which ('period'), so the screen can say so.

/** Me and another player: 'friends', 'requested' (I asked), 'incoming' (they asked me), or null. */
create or replace function public.friend_status(p_me uuid, p_other uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from friendships where status = 'accepted' and ((user_id = p_me and friend_id = p_other) or (user_id = p_other and friend_id = p_me))) then 'friends'
    when exists (select 1 from friendships where status = 'pending' and user_id = p_me and friend_id = p_other) then 'requested'
    when exists (select 1 from friendships where status = 'pending' and user_id = p_other and friend_id = p_me) then 'incoming'
  end
$$;

/** Send a friend request, or accept theirs if they already asked me. Returns the status now. */
create or replace function public.add_friend(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_user is null or p_user = me or not exists (select 1 from profiles where id = p_user) then return null; end if;
  if exists (select 1 from user_blocks where (blocker_id = me and blocked_id = p_user) or (blocker_id = p_user and blocked_id = me)) then return null; end if;
  if exists (select 1 from friendships where user_id = p_user and friend_id = me and status = 'pending') then
    update friendships set status = 'accepted' where user_id = p_user and friend_id = me;
    return 'friends';
  end if;
  insert into friendships (user_id, friend_id, status) values (me, p_user, 'pending') on conflict do nothing;
  return friend_status(me, p_user);
end $$;
revoke all on function public.add_friend(uuid) from public, anon;
grant execute on function public.add_friend(uuid) to authenticated;

/** Top users over a period: the same score as the weekly list (parties, guests, Spaces, listeners, wins, invites,
    giving). */
create or replace function public.top_users_range(p_from timestamptz, p_to timestamptz, p_limit int default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  with parties as (
    select i.host_id as id, count(*) as hosted,
           sum((select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null)) as guests
      from invites i
     where i.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(i.cancelled, false)
       and i.starts_at >= p_from and i.starts_at < least(p_to, now())
     group by i.host_id
  ),
  spaces as (
    select s.host_id as id, count(*) as hosted,
           sum((select count(*) from space_listeners l where l.space_id = s.id and l.last_seen_at - l.joined_at >= interval '10 minutes')) as listeners
      from space_sessions s where s.started_at >= p_from and s.started_at < p_to group by s.host_id
  ),
  wins as (select r.user_id as id, count(*) as n from game_results r where r.outcome = 'win' and r.mode = 'multiplayer' and r.created_at >= p_from and r.created_at < p_to group by 1),
  refs as (select f.inviter_id as id, count(*) as n from referrals f where f.created_at >= p_from and f.created_at < p_to group by 1),
  gifts as (
    select x.id, sum(x.amt) as amt from (
      select t.from_id as id, t.amount as amt from transfers t where t.created_at >= p_from and t.created_at < p_to and t.from_id <> t.to_id
      union all
      select d.giver_id, c.amount from cash_drop_claims c join cash_drops d on d.id = c.drop_id where c.created_at >= p_from and c.created_at < p_to
    ) x group by x.id
  ),
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
             'invited', s.invited, 'gave', s.gave, 'friend', friend_status(auth.uid(), p.id),
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from scored s join profiles p on p.id = s.id
     where s.score > 0
     order by s.score desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.top_users_range(timestamptz, timestamptz, int) from public, anon, authenticated;

/** Top users, never empty: this week, else last week, else the last 30 days, else the most recently active. */
create or replace function public.top_users_week(p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare wk timestamptz := dubai_week_start(); rows jsonb; period text;
begin
  rows := top_users_range(wk, now() + interval '1 minute', p_limit); period := 'this_week';
  if jsonb_array_length(rows) = 0 then rows := top_users_range(wk - interval '7 days', wk, p_limit); period := 'last_week'; end if;
  if jsonb_array_length(rows) = 0 then rows := top_users_range(now() - interval '30 days', now() + interval '1 minute', p_limit); period := 'month'; end if;
  if jsonb_array_length(rows) = 0 then
    period := 'active';
    select coalesce(jsonb_agg(x), '[]'::jsonb) into rows from (
      select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'score', 0,
               'lastSeen', p.last_seen, 'friend', friend_status(auth.uid(), p.id)) as x
        from profiles p
       where p.username is not null and not off_leaderboard(p.id) and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       order by p.last_seen desc nulls last
       limit greatest(1, least(coalesce(p_limit, 10), 50))) t;
  end if;
  return coalesce((select jsonb_agg(r || jsonb_build_object('period', period)) from jsonb_array_elements(rows) r), '[]'::jsonb);
end $$;
revoke all on function public.top_users_week(int) from public, anon;
grant execute on function public.top_users_week(int) to authenticated;

/** The richest, with my friend status for each. */
create or replace function public.richest_users(p_limit int default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  with homes as (
    select f.owner_id as id, sum(coalesce(
             (select pp.price from property_purchases pp where pp.flat_id = f.id and pp.user_id = f.owner_id order by pp.bought_at desc limit 1),
             f.sale_price, 0)) as v
      from flats f where f.owner_id is not null group by 1
  ),
  cars as (select c.user_id as id, sum(coalesce(c.price, 0)) as v from owned_cars c where not coalesce(c.is_stolen, false) group by 1),
  worth as (
    select p.id, p.balance as cash, coalesce(h.v, 0) as homes, coalesce(c.v, 0) as cars,
           p.balance + coalesce(h.v, 0) + coalesce(c.v, 0) as total
      from profiles p left join homes h on h.id = p.id left join cars c on c.id = p.id
     where p.username is not null and not off_leaderboard(p.id)
  )
  select coalesce(jsonb_agg(x order by (x ->> 'total')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'total', w.total, 'cash', w.cash, 'homes', w.homes, 'cars', w.cars, 'friend', friend_status(auth.uid(), p.id),
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from worth w join profiles p on p.id = w.id
     order by w.total desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.richest_users(int) from public, anon;
grant execute on function public.richest_users(int) to authenticated;

create or replace function public.big_givers_week(p_limit int default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'total')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'total', w.total, 'gifts', w.gifts, 'drops', w.drops, 'friend', friend_status(auth.uid(), p.id),
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from given_this_week() w join profiles p on p.id = w.id
     where w.total > 0 and p.username is not null and not off_leaderboard(p.id)
     order by w.total desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.big_givers_week(int) from public, anon;
grant execute on function public.big_givers_week(int) to authenticated;

/** Available to chat: real players online right now (the last 2 minutes), not me, nobody I've blocked or who
    blocked me. Friends first, then the most recently active. */
create or replace function public.online_players(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'placeId', o.place_id,
             'friend', friend_status(auth.uid(), p.id)) as x
      from online_now o join profiles p on p.id = o.user_id
     where o.seen_at > now() - interval '2 minutes'
       and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       and not exists (select 1 from user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
     order by (friend_status(auth.uid(), p.id) = 'friends') desc nulls last, o.seen_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100))) t
$$;
revoke all on function public.online_players(int) from public, anon;
grant execute on function public.online_players(int) to authenticated;

/** The sign-up reward: adding 5 or more top users as friends (friend requests count once sent). */
create or replace function public.claim_follow_reward() returns bigint
language plpgsql security definer set search_path = public as $$
declare cfg jsonb := social_rewards_config(); amt bigint := (cfg -> 'followTop' ->> 'aed')::bigint;
begin
  if auth.uid() is null or not social_rewards_on() then return 0; end if;
  if (select count(*) from friendships where user_id = auth.uid()) + (select count(*) from follows where follower_id = auth.uid())
     < (cfg -> 'followTop' ->> 'follows')::int then return 0; end if;
  if not exists (select 1 from profiles where id = auth.uid() and created_at > now() - interval '14 days') then return 0; end if;
  if pay_social_reward(auth.uid(), 'follow_top', 'once', amt, 'added the top users as friends') then return amt; end if;
  return 0;
end $$;
revoke all on function public.claim_follow_reward() from public, anon;
grant execute on function public.claim_follow_reward() to authenticated;
