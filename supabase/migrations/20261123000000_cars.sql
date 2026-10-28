-- Renting and buying cars at the rental companies and dealerships on Sheikh Zayed Road. Both need a
-- driving licence from the Driving Academy (has_licence). Buying registers the car (Mulkiya) and insures
-- it for a year; renting is by the day, week or month with a refundable deposit. Prices and fees mirror
-- src/data/cars/cars.json (checked by scripts/check-life-config.mjs).

/** {price to buy, price per day to rent} for each car. */
create or replace function public.car_price(p_car text) returns int[]
language sql immutable as $$
  select case p_car
    when 'nissan-sunny' then array[62000, 90]
    when 'toyota-corolla' then array[82000, 110]
    when 'toyota-camry' then array[115000, 150]
    when 'nissan-patrol' then array[260000, 380]
    when 'toyota-land-cruiser' then array[320000, 450]
    when 'bmw-5' then array[260000, 420]
    when 'bmw-x5' then array[340000, 520]
    when 'mercedes-e' then array[280000, 450]
    when 'mercedes-g63' then array[950000, 1500]
    when 'lamborghini-urus' then array[1100000, 2800]
    when 'lamborghini-huracan' then array[1050000, 3200] end
$$;

/** Which cars each rental company and dealer has. */
create or replace function public.car_offered(p_place text, p_car text) returns text
language sql immutable as $$
  select case
    when p_place = 'sixt-szr' and p_car in ('nissan-sunny', 'toyota-camry', 'bmw-5', 'mercedes-g63') then 'rent'
    when p_place = 'hertz-szr' and p_car in ('nissan-sunny', 'toyota-corolla', 'nissan-patrol', 'mercedes-e') then 'rent'
    when p_place = 'europcar-szr' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser', 'bmw-x5') then 'rent'
    when p_place = 'budget-szr' and p_car in ('nissan-sunny', 'toyota-corolla', 'nissan-patrol') then 'rent'
    when p_place = 'autostrad-szr' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser', 'lamborghini-urus') then 'rent'
    when p_place = 'al-futtaim-toyota' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser') then 'buy'
    when p_place = 'arabian-automobiles-nissan' and p_car in ('nissan-sunny', 'nissan-patrol') then 'buy'
    when p_place = 'agmc-bmw' and p_car in ('bmw-5', 'bmw-x5') then 'buy'
    when p_place = 'gargash-mercedes' and p_car in ('mercedes-e', 'mercedes-g63') then 'buy'
    when p_place = 'lamborghini-dubai' and p_car in ('lamborghini-urus', 'lamborghini-huracan') then 'buy'
  end
$$;

create table if not exists public.owned_cars (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  car text not null,
  dealer text not null,
  price bigint not null,
  plate text not null,
  registered_until timestamptz not null,
  insured_until timestamptz not null,
  bought_at timestamptz not null default now()
);
create index if not exists owned_cars_user on public.owned_cars (user_id);

create table if not exists public.car_rentals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  car text not null,
  company text not null,
  days int not null,
  cost bigint not null,
  deposit bigint not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  returned_at timestamptz
);
create index if not exists car_rentals_user on public.car_rentals (user_id, ends_at desc);
alter table public.owned_cars enable row level security;
alter table public.car_rentals enable row level security;
drop policy if exists "see own cars" on public.owned_cars;
create policy "see own cars" on public.owned_cars for select using (user_id = auth.uid());
drop policy if exists "see own rentals" on public.car_rentals;
create policy "see own rentals" on public.car_rentals for select using (user_id = auth.uid());

/** Rent a car: by the day, week (15% off) or month (35% off), plus a deposit returned when it comes back. */
create or replace function public.rent_car(p_company text, p_car text, p_days int) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); daily int := (public.car_price(p_car))[2]; cost bigint; rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.has_licence(me) then raise exception 'needs_licence'; end if;
  if public.car_offered(p_company, p_car) is distinct from 'rent' then raise exception 'not_offered'; end if;
  if p_days not in (1, 7, 30) then raise exception 'bad_days'; end if;
  if exists (select 1 from car_rentals where user_id = me and returned_at is null and ends_at > now()) then raise exception 'already_renting'; end if;
  cost := round(daily * p_days * case p_days when 7 then 0.85 when 30 then 0.65 else 1 end);
  insert into car_rentals (user_id, car, company, days, cost, deposit, ends_at) values (me, p_car, p_company, p_days, cost, 1500, now() + make_interval(days => p_days)) returning id into rid;
  perform coin_move(me, -(cost + 1500), 'spend', 'Car rental and deposit', 'rental:' || rid);
  return rid;
end $$;
grant execute on function public.rent_car(text, text, int) to authenticated;

/** Return a rental (early or on time): the deposit comes back. */
create or replace function public.return_car() returns void
language plpgsql security definer set search_path = public as $$
declare r car_rentals;
begin
  select * into r from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1 for update;
  if r.id is null then raise exception 'no_rental'; end if;
  update car_rentals set returned_at = now() where id = r.id;
  perform coin_move(r.user_id, r.deposit, 'refund', 'Rental deposit returned', 'deposit:' || r.id);
end $$;
grant execute on function public.return_car() to authenticated;

/** Buy a car: the price, a year's insurance (3%, at least AED 1,500) and RTA registration (AED 420). */
create or replace function public.buy_car(p_dealer text, p_car text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); price int := (public.car_price(p_car))[1]; ins bigint; plate text; cid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.has_licence(me) then raise exception 'needs_licence'; end if;
  if public.car_offered(p_dealer, p_car) is distinct from 'buy' then raise exception 'not_offered'; end if;
  ins := greatest(1500, price * 3 / 100);
  -- A Dubai plate: a letter code and five digits.
  plate := chr(65 + floor(random() * 26)::int) || ' ' || lpad((floor(random() * 99999) + 1)::text, 5, '0');
  insert into owned_cars (user_id, car, dealer, price, plate, registered_until, insured_until)
    values (me, p_car, p_dealer, price, plate, now() + interval '1 year', now() + interval '1 year') returning id into cid;
  perform coin_move(me, -(price + ins + 420), 'spend', 'Car purchase, insurance and registration', 'car:' || cid);
  return jsonb_build_object('id', cid, 'plate', plate, 'insurance', ins, 'registration', 420, 'total', price + ins + 420);
end $$;
grant execute on function public.buy_car(text, text) to authenticated;

/** Your licence, the cars you own and your current rental. */
create or replace function public.my_garage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'licence', (select jsonb_build_object('number', licence_no, 'issuedAt', issued_at) from driving_progress where user_id = auth.uid() and issued_at is not null),
    'owned', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price,
                'registeredUntil', registered_until, 'insuredUntil', insured_until, 'boughtAt', bought_at) order by bought_at desc)
                from owned_cars where user_id = auth.uid()), '[]'::jsonb),
    'rental', (select jsonb_build_object('id', id, 'car', car, 'company', company, 'days', days, 'endsAt', ends_at, 'deposit', deposit)
                from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1)
  )
$$;
grant execute on function public.my_garage() to authenticated;
