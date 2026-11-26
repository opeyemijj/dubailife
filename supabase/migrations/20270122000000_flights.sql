-- Flights between the cities (Dubai Life Airways, fictional): book a seat (the fare is charged here, from
-- flight_fare(), mirrored in src/data/flights/flights.json and checked by scripts/check-life-config.mjs), board, and
-- land. Where you are (which city) is kept on the client like the rest of your location; a flight is the record.
-- Duty free is bought at the terminal (duty_free_price(), also mirrored).

create or replace function public.flight_fare(p_from text, p_to text, p_class text) returns bigint
language sql immutable as $$
  select case
    when (p_from, p_to) in (('dubai', 'abu-dhabi'), ('abu-dhabi', 'dubai')) then
      case p_class when 'economy' then 450 when 'business' then 1800 when 'first' then 4500 end
  end::bigint
$$;

create or replace function public.duty_free_price(p_item text) returns bigint
language sql immutable as $$
  select case p_item when 'oud-perfume' then 650 when 'gold-watch' then 12500 when 'aviators' then 890
    when 'dates-box' then 120 when 'chocolate' then 75 when 'headphones' then 1499 end::bigint
$$;

create table if not exists public.flights (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_city text not null,
  to_city text not null,
  class text not null,
  fare bigint not null,
  seat text not null,
  status text not null default 'booked' check (status in ('booked', 'boarded', 'landed', 'cancelled')),
  created_at timestamptz not null default now(),
  landed_at timestamptz
);
create index if not exists flights_user on public.flights (user_id, id desc);
alter table public.flights enable row level security;
drop policy if exists "own flights" on public.flights;
create policy "own flights" on public.flights for select using (user_id = auth.uid());

/** Books a seat and pays for it. One open booking at a time (an unfinished one is replaced, without a refund). */
create or replace function public.book_flight(p_from text, p_to text, p_class text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fare bigint := flight_fare(p_from, p_to, p_class); fid bigint; seat text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if fare is null then raise exception 'bad_route'; end if;
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

/** Boarding, then landing (the flight scene calls these as it goes). */
create or replace function public.flight_progress(p_flight bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('boarded', 'landed') then raise exception 'bad_status'; end if;
  update flights set status = p_status, landed_at = case when p_status = 'landed' then now() else landed_at end
   where id = p_flight and user_id = auth.uid() and status in ('booked', 'boarded');
  if not found then raise exception 'no_flight'; end if;
end $$;
revoke all on function public.flight_progress(bigint, text) from public, anon;
grant execute on function public.flight_progress(bigint, text) to authenticated;

/** Duty free at the terminal: pays for it (what you bought goes in your bag on the client). */
create or replace function public.buy_duty_free(p_item text) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); price bigint := duty_free_price(p_item);
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if price is null then raise exception 'bad_item'; end if;
  perform coin_move(me, -price, 'spend', 'Duty free: ' || replace(p_item, '-', ' '), 'duty-free:' || p_item);
  return price;
end $$;
revoke all on function public.buy_duty_free(text) from public, anon;
grant execute on function public.buy_duty_free(text) to authenticated;
