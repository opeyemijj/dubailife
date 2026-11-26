-- Which city you're in, decided by the server: where your last flight landed (Dubai if you've never flown). The
-- browser's saved location (profiles.citizen.location) is the player's own to write, so it can't be trusted to say
-- they've arrived somewhere. Everything that puts you somewhere in a city checks this:
--   - flights leave from the city you're in, and land only after the flight's time in the air;
--   - a hotel stay is booked and checked into in the hotel's own city;
--   - a home is rented or bought in its own city (renewing a lease you already hold works from anywhere).
-- A place's city is its id's prefix, as in src/lib/city/cities.ts ("ad-" is Abu Dhabi, anything else Dubai).

create or replace function public.city_of_place(p_id text) returns text
language sql immutable as $$
  select case when p_id like 'ad-%' then 'abu-dhabi' else 'dubai' end
$$;

create or replace function public.player_city(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select to_city from flights where user_id = p_user and status = 'landed' order by landed_at desc nulls last, id desc limit 1),
    'dubai')
$$;
revoke all on function public.player_city(uuid) from public, anon, authenticated;

/** The city I'm in (the maps, home and venue pages ask this). */
create or replace function public.my_city() returns text
language sql stable security definer set search_path = public as $$
  select player_city(auth.uid())
$$;
revoke all on function public.my_city() from public, anon;
grant execute on function public.my_city() to authenticated;

-- ---------------------------------------------------------------- flights
alter table public.flights add column if not exists boarded_at timestamptz;

/** Books a seat and pays for it, from the city you're in. One open booking at a time (an unfinished one is replaced,
 *  without a refund). */
create or replace function public.book_flight(p_from text, p_to text, p_class text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fare bigint := flight_fare(p_from, p_to, p_class); fid bigint; seat text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if fare is null then raise exception 'bad_route'; end if;
  if p_from <> player_city(me) then raise exception 'wrong_city'; end if;
  update flights set status = 'cancelled' where user_id = me and status in ('booked', 'boarded');
  -- A seat to match the cabin: first at the front, business behind it, economy from row 20.
  seat := case p_class
    when 'first' then (1 + floor(random() * 3))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    when 'business' then (6 + floor(random() * 8))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    else (20 + floor(random() * 40))::int || (array['A','B','C','D','E','F','G','H','K'])[1 + floor(random() * 9)::int] end;
  insert into flights (user_id, from_city, to_city, class, fare, seat) values (me, p_from, p_to, p_class, fare, seat) returning id into fid;
  perform coin_move(me, -fare, 'spend', 'Flight: Dubai Life Airways, ' || initcap(replace(p_from, '-', ' ')) || ' to ' || initcap(replace(p_to, '-', ' ')) || ' (' || p_class || ')', 'flight:' || fid);
  return jsonb_build_object('id', fid, 'seat', seat, 'fare', fare, 'class', p_class, 'from', p_from, 'to', p_to);
end $$;
revoke all on function public.book_flight(text, text, text) from public, anon;
grant execute on function public.book_flight(text, text, text) to authenticated;

/** Boarding, then landing (the flight scene calls these as it goes). Landing needs you to have boarded, and the
 *  flight to have been in the air: it takes 62 s (components/fly/Flight PHASES), so not under 45 s after boarding. */
create or replace function public.flight_progress(p_flight bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status = 'boarded' then
    update flights set status = 'boarded', boarded_at = now() where id = p_flight and user_id = auth.uid() and status = 'booked';
  elsif p_status = 'landed' then
    update flights set status = 'landed', landed_at = now()
     where id = p_flight and user_id = auth.uid() and status = 'boarded' and boarded_at <= now() - interval '45 seconds';
  else
    raise exception 'bad_status';
  end if;
  if not found then raise exception 'no_flight'; end if;
end $$;
revoke all on function public.flight_progress(bigint, text) from public, anon;
grant execute on function public.flight_progress(bigint, text) to authenticated;

-- ---------------------------------------------------------------- hotels: book and check in where the hotel is
create or replace function public.hotel_stay_in_city() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' or (new.status = 'checked_in' and old.status is distinct from 'checked_in'))
     and city_of_place(new.place_id) <> player_city(new.user_id) then
    raise exception 'not_in_city';
  end if;
  return new;
end $$;
drop trigger if exists hotel_stay_in_city on public.hotel_stays;
create trigger hotel_stay_in_city before insert or update of status on public.hotel_stays
  for each row execute function public.hotel_stay_in_city();

-- ---------------------------------------------------------------- homes: rent or buy where the home is
-- Only when the signed-in player takes a home for themselves (rent_flat, buy_flat, and anything else that makes them
-- its owner or tenant); a lease they already hold, a partner's home and the server's own jobs are untouched.
create or replace function public.flat_in_city() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is not null
     and ((new.owner_id = me and old.owner_id is distinct from me) or (new.tenant_id = me and old.tenant_id is distinct from me))
     and city_of_place(new.building_id) <> player_city(me) then
    raise exception 'not_in_city';
  end if;
  return new;
end $$;
drop trigger if exists flat_in_city on public.flats;
create trigger flat_in_city before update of owner_id, tenant_id on public.flats
  for each row execute function public.flat_in_city();
