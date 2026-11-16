-- Hotel stays: book a luxury suite at any hotel on the map, check in, and live in it (src/app/hotel/[stayId]) for the
-- nights you paid for. Prices: src/data/hotels/suites.json, mirrored exactly below (checked by
-- scripts/check-life-config.mjs). One stay at a time; it ends when you check out or your nights run out.

/** A suite's price per night (AED), or null for one that doesn't exist. Mirrors suites.json. */
create or replace function public.hotel_suite_rule(p_suite text) returns bigint
language sql immutable as $$
  select case p_suite
    when 'deluxe' then 25000
    when 'royal' then 60000
    when 'presidential' then 150000
  end::bigint
$$;

/** A room-service item's price (AED), or null. Mirrors suites.json. */
create or replace function public.hotel_service_price(p_item text) returns bigint
language sql immutable as $$
  select case p_item
    when 'breakfast' then 450
    when 'wagyu' then 1200
    when 'sushi' then 900
    when 'mocktails' then 350
    when 'dessert' then 300
  end::bigint
$$;

create table if not exists public.hotel_stays (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null check (place_id ~ '^[a-z0-9-]{2,60}$'),
  hotel_name text not null,
  suite text not null,
  nights int not null check (nights in (1, 2, 3, 7)),
  per_night bigint not null,
  total bigint not null,
  status text not null default 'booked' check (status in ('booked', 'checked_in', 'checked_out')),
  room text not null,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  check_out_by timestamptz not null
);
create index if not exists hotel_stays_user on public.hotel_stays (user_id, created_at desc);
alter table public.hotel_stays enable row level security;
drop policy if exists "see own stays" on public.hotel_stays;
create policy "see own stays" on public.hotel_stays for select using (user_id = auth.uid());

/** Book a suite (paid now). Returns the stay's id. */
create or replace function public.book_hotel(p_place text, p_hotel text, p_suite text, p_nights int) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); per bigint := hotel_suite_rule(p_suite); sid bigint; floor_no int; room text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if per is null then raise exception 'bad_suite'; end if;
  if p_nights not in (1, 2, 3, 7) then raise exception 'bad_nights'; end if;
  if p_place !~ '^[a-z0-9-]{2,60}$' then raise exception 'bad_hotel'; end if;
  if exists (select 1 from hotel_stays where user_id = me and status in ('booked', 'checked_in') and check_out_by > now()) then raise exception 'already_staying'; end if;
  -- A room number to match the suite: the higher the suite, the higher the floor.
  floor_no := case p_suite when 'presidential' then 60 + floor(random() * 10)::int when 'royal' then 40 + floor(random() * 15)::int else 20 + floor(random() * 15)::int end;
  room := floor_no || lpad((1 + floor(random() * 12))::int::text, 2, '0');
  insert into hotel_stays (user_id, place_id, hotel_name, suite, nights, per_night, total, room, check_out_by)
    values (me, p_place, left(coalesce(p_hotel, p_place), 80), p_suite, p_nights, per, per * p_nights, room, now() + make_interval(days => p_nights))
    returning id into sid;
  perform coin_move(me, -(per * p_nights), 'spend', 'Hotel: ' || p_suite || ' suite at ' || left(coalesce(p_hotel, p_place), 60) || ', ' || p_nights || ' night' || case when p_nights = 1 then '' else 's' end, 'hotel:' || sid);
  return sid;
end $$;
revoke all on function public.book_hotel(text, text, text, int) from public, anon;
grant execute on function public.book_hotel(text, text, text, int) to authenticated;

/** Check in at the front desk (and the City Feed hears about it). */
create or replace function public.hotel_check_in(p_stay bigint) returns void
language plpgsql security definer set search_path = public as $$
declare s hotel_stays;
begin
  select * into s from hotel_stays where id = p_stay and user_id = auth.uid() for update;
  if s.id is null then raise exception 'no_stay'; end if;
  if s.status = 'checked_out' or s.check_out_by <= now() then raise exception 'stay_over'; end if;
  if s.status = 'booked' then
    update hotel_stays set status = 'checked_in', checked_in_at = now() where id = s.id;
    perform feed_post(s.user_id, 'hotel', jsonb_build_object('hotel', s.hotel_name, 'suite', s.suite, 'nights', s.nights, 'placeId', s.place_id), null, 'hotel:' || s.id);
  end if;
end $$;
revoke all on function public.hotel_check_in(bigint) from public, anon;
grant execute on function public.hotel_check_in(bigint) to authenticated;

create or replace function public.hotel_check_out(p_stay bigint) returns void
language sql security definer set search_path = public as $$
  update hotel_stays set status = 'checked_out', check_out_by = least(check_out_by, now()) where id = p_stay and user_id = auth.uid() and status <> 'checked_out'
$$;
revoke all on function public.hotel_check_out(bigint) from public, anon;
grant execute on function public.hotel_check_out(bigint) to authenticated;

/** Room service, charged to me. Returns my balance after. */
create or replace function public.hotel_room_service(p_stay bigint, p_item text) returns bigint
language plpgsql security definer set search_path = public as $$
declare s hotel_stays; price bigint := hotel_service_price(p_item);
begin
  if price is null then raise exception 'bad_item'; end if;
  select * into s from hotel_stays where id = p_stay and user_id = auth.uid();
  if s.id is null or s.status <> 'checked_in' or s.check_out_by <= now() then raise exception 'not_staying'; end if;
  return coin_move(auth.uid(), -price, 'spend', 'Room service: ' || p_item || ' at ' || s.hotel_name, 'hotel:' || s.id || ':' || p_item);
end $$;
revoke all on function public.hotel_room_service(bigint, text) from public, anon;
grant execute on function public.hotel_room_service(bigint, text) to authenticated;

/** My current stay (booked or checked in, nights not over), or null. */
create or replace function public.my_hotel_stay() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(s) - 'user_id' from hotel_stays s
   where s.user_id = auth.uid() and s.status in ('booked', 'checked_in') and s.check_out_by > now()
   order by s.created_at desc limit 1
$$;
revoke all on function public.my_hotel_stay() from public, anon;
grant execute on function public.my_hotel_stay() to authenticated;

/** One of my stays by id (for the suite page). */
create or replace function public.hotel_stay(p_stay bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(s) - 'user_id' from hotel_stays s where s.id = p_stay and s.user_id = auth.uid()
$$;
revoke all on function public.hotel_stay(bigint) from public, anon;
grant execute on function public.hotel_stay(bigint) to authenticated;

-- Stays whose nights are over are checked out.
do $$ begin
  perform cron.unschedule('hotel-checkouts');
exception when others then null;
end $$;
select cron.schedule('hotel-checkouts', '*/15 * * * *', $$update public.hotel_stays set status = 'checked_out' where status <> 'checked_out' and check_out_by <= now()$$);

-- Checking into a hotel is money news in the feed.
create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward', 'rain', 'hotel') then 'money'
    when p_kind in ('win', 'race') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;
