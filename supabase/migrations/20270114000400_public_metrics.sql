-- Real numbers for the Investors page (src/app/investors): totals and activity, never anything about a single player,
-- and never padded (Locals aren't accounts, so they're never counted; the "online" figure the game shows is not used
-- here). Readable by anyone.

create or replace function public.public_metrics() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'asOf', now(),
    'citizens', (select count(*) from profiles where username is not null),
    'active7', (select count(*) from profiles where last_seen > now() - interval '7 days'),
    'active30', (select count(*) from profiles where last_seen > now() - interval '30 days'),
    'active1', (select count(*) from profiles where last_seen > now() - interval '1 day'),
    'signups30', (select count(*) from profiles where created_at > now() - interval '30 days'),
    'signups7', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'firstSignup', (select min(created_at) from profiles),
    'parties', (select count(*) from invites where kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(cancelled, false)),
    'gamesPlayed', (select count(*) from game_results),
    'messages', (select count(*) from messages),
    'friendships', (select count(*) from friendships where status = 'accepted'),
    'homesOwned', (select count(*) from flats where owner_id is not null),
    'carsOwned', (select count(*) from owned_cars),
    'races', (select count(*) from races where status = 'done'),
    'hotelStays', (select count(*) from hotel_stays),
    'timeZones', (select count(distinct tz) from email_prefs where tz is not null)
  )
$$;
revoke all on function public.public_metrics() from public;
grant execute on function public.public_metrics() to anon, authenticated;
