-- Driving your own car (or your rental) around the city. Every car has a tank (litres; kWh for the
-- electric Tesla) and burns fuel per 100 km; a drive uses fuel for the distance (15× the map distance, for the driving around town it stands for), and you fill up at an
-- ENOC station (AED 2.95/L) or charge at a Tesla Supercharger (AED 0.70/kWh). A speed camera fines
-- AED 600 for going over 120 km/h on the 100 limit. Crash into another car and Dubai Police arrive: an
-- 'accident' case (3 hours' custody, AED 5,000 if the court finds you guilty), your own car is
-- impounded for 3 days (AED 3,000 to release it early) and a rental goes back to the company with the
-- deposit kept. Numbers mirror src/data/cars/cars.json → cars, fuel, driving (scripts/check-life-config.mjs).

/** {price to buy, price per day to rent} for each car (now with the Tesla). */
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
    when 'lamborghini-huracan' then array[1050000, 3200]
    when 'tesla-model-y' then array[190000, 450] end
$$;

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
    when p_place = 'tesla-dubai' and p_car in ('tesla-model-y') then 'buy'
  end
$$;

/** {tank (litres, or kWh), use per 100 km, electric 1/0} for each car. */
create or replace function public.car_energy(p_car text) returns numeric[]
language sql immutable as $$
  select case p_car
    when 'nissan-sunny' then array[42, 6.5, 0]
    when 'toyota-corolla' then array[50, 6.8, 0]
    when 'toyota-camry' then array[60, 7.5, 0]
    when 'nissan-patrol' then array[100, 14, 0]
    when 'toyota-land-cruiser' then array[110, 13, 0]
    when 'bmw-5' then array[68, 8, 0]
    when 'bmw-x5' then array[83, 10, 0]
    when 'mercedes-e' then array[66, 8, 0]
    when 'mercedes-g63' then array[100, 15, 0]
    when 'lamborghini-urus' then array[85, 14, 0]
    when 'lamborghini-huracan' then array[83, 15, 0]
    when 'tesla-model-y' then array[75, 17, 1] end::numeric[]
$$;

-- Fuel is kept as a percentage of the tank; cars come full.
alter table public.owned_cars add column if not exists fuel numeric not null default 100 check (fuel between 0 and 100);
alter table public.owned_cars add column if not exists impounded_until timestamptz;
alter table public.car_rentals add column if not exists fuel numeric not null default 100 check (fuel between 0 and 100);
alter table public.cases drop constraint if exists cases_kind_check;
alter table public.cases add constraint cases_kind_check check (kind in ('transfer', 'fake_licence', 'accident'));

/** The car you're driving: 'owned' (one of yours, by id) or 'rental' (your current rental). Locked for update. */
create or replace function public.drive_car(p_kind text, p_id bigint, out car text, out fuel numeric, out impounded boolean)
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'owned' then
    select o.car, o.fuel, coalesce(o.impounded_until > now(), false) into car, fuel, impounded from owned_cars o where o.id = p_id and o.user_id = auth.uid() for update;
  elsif p_kind = 'rental' then
    select r.car, r.fuel, false into car, fuel, impounded from car_rentals r where r.id = p_id and r.user_id = auth.uid() and r.returned_at is null and r.ends_at > now() for update;
  end if;
  if car is null then raise exception 'no_car'; end if;
end $$;
revoke all on function public.drive_car(text, bigint) from public, anon, authenticated;

/** Fill up (petrol) or charge (electric) to full. Returns {added, cost}. */
create or replace function public.refuel(p_kind text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record; e numeric[]; added numeric; cost bigint;
begin
  select * into d from public.drive_car(p_kind, p_id);
  e := public.car_energy(d.car);
  added := round(e[1] * (100 - d.fuel) / 100, 1);
  cost := ceil(added * case when e[3] = 1 then 0.7 else 2.95 end);
  if cost > 0 then perform coin_move(auth.uid(), -cost, 'spend', case when e[3] = 1 then 'Tesla Supercharger' else 'ENOC fuel' end, 'fuel:' || p_kind || ':' || p_id); end if;
  if p_kind = 'owned' then update owned_cars set fuel = 100 where id = p_id; else update car_rentals set fuel = 100 where id = p_id; end if;
  return jsonb_build_object('added', added, 'cost', cost, 'electric', e[3] = 1);
end $$;
grant execute on function public.refuel(text, bigint) to authenticated;

/** A drive ends: fuel used for the distance (metres), and a speed-camera fine if you were caught over 120. */
create or replace function public.finish_drive(p_kind text, p_id bigint, p_metres int, p_speeding boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record; e numeric[]; used numeric; left_ numeric; fine bigint := 0;
begin
  select * into d from public.drive_car(p_kind, p_id);
  if d.impounded then raise exception 'impounded'; end if;
  e := public.car_energy(d.car);
  -- A trip on the map stands for the driving around town that goes with it: 15× the map distance.
  used := least(greatest(p_metres, 0), 60000) / 1000.0 * 15 * e[2] / 100;
  left_ := greatest(0, round(d.fuel - used / e[1] * 100, 1));
  if p_kind = 'owned' then update owned_cars set fuel = left_ where id = p_id; else update car_rentals set fuel = left_ where id = p_id; end if;
  if p_speeding then
    fine := 600;
    perform coin_move(auth.uid(), -fine, 'spend', 'Speed camera fine (RTA)', 'radar:' || p_kind || ':' || p_id || ':' || extract(epoch from now())::bigint);
  end if;
  return jsonb_build_object('fuel', left_, 'fine', fine);
end $$;
grant execute on function public.finish_drive(text, bigint, int, boolean) to authenticated;

/** A crash: Dubai Police open an accident case (3 hours' custody), and the car is taken. Returns {caseId}. */
create or replace function public.car_accident(p_kind text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d record; cid bigint; officer uuid;
begin
  select * into d from public.drive_car(p_kind, p_id);
  select s.user_id into officer from venture_staff s join venture_jobs j on j.id = s.job_id where j.service = 'police' and s.user_id <> me order by random() limit 1;
  insert into cases (suspect_id, officer_id, held, reason, kind, jail_until)
    values (me, officer, 0, 'Caused a traffic accident', 'accident', now() + interval '3 hours') returning id into cid;
  if p_kind = 'owned' then
    update owned_cars set impounded_until = now() + interval '3 days' where id = p_id;
  else
    -- The rental company takes the car back and keeps the deposit for the damage.
    update car_rentals set returned_at = now() where id = p_id;
  end if;
  return jsonb_build_object('caseId', cid);
end $$;
grant execute on function public.car_accident(text, bigint) to authenticated;

/** Get an impounded car back early: AED 3,000 to the police pound. */
create or replace function public.release_car(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from owned_cars where id = p_id and user_id = auth.uid() and impounded_until > now()) then raise exception 'not_impounded'; end if;
  perform coin_move(auth.uid(), -3000, 'spend', 'Car released from the impound', 'impound:' || p_id);
  update owned_cars set impounded_until = null where id = p_id;
end $$;
grant execute on function public.release_car(bigint) to authenticated;

/** The judge: an accident is cleared, or guilty with an AED 5,000 fine (transfer and fake licence as before). */
create or replace function public.judge_case(p_case bigint) returns cases
language plpgsql security definer set search_path = public as $$
declare c cases; bal bigint; v_fine bigint;
begin
  select * into c from cases where id = p_case and status = 'open' for update;
  if c.id is null then select * into c from cases where id = p_case; return c; end if;
  if random() < 0.2 + 0.2 * coalesce(c.defence, 0) then
    if c.held > 0 then perform coin_move(c.suspect_id, c.held, 'refund', 'Released by the court', 'cleared:' || c.id); end if;
    update cases set status = 'cleared', verdict_at = now(), jail_until = least(jail_until, now()) where id = c.id returning * into c;
  else
    select balance into bal from profiles where id = c.suspect_id for update;
    v_fine := least(bal, case when c.kind = 'fake_licence' then 25000 when c.kind = 'accident' then 5000 else c.held * 10 / 100 end);
    if v_fine > 0 then perform coin_move(c.suspect_id, -v_fine, 'spend', 'Court fine', 'fine:' || c.id); end if;
    if c.officer_id is not null then perform coin_move(c.officer_id, 500, 'earn', 'Arrest bounty', 'bounty:' || c.id); end if;
    update cases set status = 'guilty', fine = v_fine, verdict_at = now() where id = c.id returning * into c;
  end if;
  return c;
end $$;
revoke all on function public.judge_case(bigint) from public, anon, authenticated;

/** Your licence, your cars (with fuel and impound) and your current rental. */
create or replace function public.my_garage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'licence', (select jsonb_build_object('number', licence_no, 'issuedAt', issued_at) from driving_progress where user_id = auth.uid() and issued_at is not null),
    'owned', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price,
                'registeredUntil', registered_until, 'insuredUntil', insured_until, 'boughtAt', bought_at,
                'fuel', fuel, 'impoundedUntil', case when impounded_until > now() then impounded_until end) order by bought_at desc)
                from owned_cars where user_id = auth.uid()), '[]'::jsonb),
    'rental', (select jsonb_build_object('id', id, 'car', car, 'company', company, 'days', days, 'endsAt', ends_at, 'deposit', deposit, 'fuel', fuel)
                from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1)
  )
$$;
grant execute on function public.my_garage() to authenticated;
