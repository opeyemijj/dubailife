-- Accounts kept off the leaderboards besides admins (the owner's own account, test accounts): app_settings
-- 'leaderboards' = {"exclude": [<profile ids>]}.
insert into public.app_settings (key, value)
  select 'leaderboards', jsonb_build_object('exclude', coalesce(jsonb_agg(id), '[]'::jsonb)) from public.profiles where username in ('lakuku')
on conflict (key) do nothing;

create or replace function public.off_leaderboard(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = p_user)
      or coalesce((setting('leaderboards') -> 'exclude') ? p_user::text, false)
$$;

-- Top users this week and the richest users (requirements R6), shown at sign-up, at each player's first visit of the
-- week, and to players back after a week away (src/components/social/TopUsers.tsx). Admin and owner accounts never
-- appear on either list; Locals aren't accounts.

/** The week's start, Monday 00:00 Dubai time. */
create or replace function public.dubai_week_start(t timestamptz default now()) returns timestamptz
language sql stable as $$ select date_trunc('week', t at time zone 'Asia/Dubai') at time zone 'Asia/Dubai' $$;

/**
 * This week's top users, by what they did with other players: each party hosted 100, each guest who came 30, each
 * multiplayer win 20, each friend who joined through their invite 50, and 10 per million given away (up to 200).
 * Hosting Spaces joins the score once Spaces are recorded on the server.
 */
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
  wins as (select r.user_id as id, count(*) as n from game_results r, wk where r.outcome = 'win' and r.mode = 'multiplayer' and r.created_at >= wk.s group by 1),
  refs as (select f.inviter_id as id, count(*) as n from referrals f, wk where f.created_at >= wk.s group by 1),
  gifts as (select t.from_id as id, sum(t.amount) as amt from transfers t, wk where t.created_at >= wk.s group by 1),
  scored as (
    select p.id,
           coalesce(pa.hosted, 0) as hosted, coalesce(pa.guests, 0) as guests, coalesce(w.n, 0) as wins,
           coalesce(rf.n, 0) as invited, coalesce(gf.amt, 0) as gave,
           coalesce(pa.hosted, 0) * 100 + coalesce(pa.guests, 0) * 30 + coalesce(w.n, 0) * 20 + coalesce(rf.n, 0) * 50
             + least(floor(coalesce(gf.amt, 0) / 1000000) * 10, 200)::bigint as score
      from profiles p
      left join parties pa on pa.id = p.id
      left join wins w on w.id = p.id
      left join refs rf on rf.id = p.id
      left join gifts gf on gf.id = p.id
     where p.username is not null and not off_leaderboard(p.id)
  )
  select coalesce(jsonb_agg(x order by (x ->> 'score')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'score', s.score,
             'hosted', s.hosted, 'guests', s.guests, 'wins', s.wins, 'invited', s.invited, 'gave', s.gave,
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from scored s join profiles p on p.id = s.id
     where s.score > 0
     order by s.score desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.top_users_week(int) from public, anon;
grant execute on function public.top_users_week(int) to authenticated;

/** The richest: money plus the homes they own (what they paid) and their cars. */
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
             'total', w.total, 'cash', w.cash, 'homes', w.homes, 'cars', w.cars,
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from worth w join profiles p on p.id = w.id
     order by w.total desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.richest_users(int) from public, anon;
grant execute on function public.richest_users(int) to authenticated;
