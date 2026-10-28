-- Parking at the end of a drive. Every destination has an RTA paid car park with marked bays: you pull in,
-- park, switch off and pay at the meter (AED 4 an hour; 1, 2 or 4 hours). Don't pay, and a parking
-- inspector fines you AED 150 a few minutes later (3–10); park outside the lines and it's AED 200 (1–5
-- minutes later). Fines go in traffic_fines, along with speed-camera fines; a fine is charged when it's
-- issued (my_fines, called by the fine notification, charges any that have come due) and shown once as a
-- notification. Numbers mirror src/data/cars/cars.json → parking (scripts/check-life-config.mjs).

create table if not exists public.traffic_fines (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('speeding', 'parking_unpaid', 'bad_parking')),
  amount bigint not null,
  reason text not null,
  place text,
  issued_at timestamptz not null default now(),
  charged boolean not null default false,
  paid bigint not null default 0,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists traffic_fines_user on public.traffic_fines (user_id, issued_at desc);
alter table public.traffic_fines enable row level security;
drop policy if exists "see own fines" on public.traffic_fines;
create policy "see own fines" on public.traffic_fines for select using (user_id = auth.uid());

create table if not exists public.car_parkings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  car_kind text not null,
  car_id bigint not null,
  place text not null,
  hours int not null,
  cost bigint not null,
  good boolean not null,
  parked_at timestamptz not null default now(),
  paid_until timestamptz
);
create index if not exists car_parkings_user on public.car_parkings (user_id, parked_at desc);
alter table public.car_parkings enable row level security;
drop policy if exists "see own parking" on public.car_parkings;
create policy "see own parking" on public.car_parkings for select using (user_id = auth.uid());

/** Park at the end of a drive: pay for 1, 2 or 4 hours (0: you didn't pay), parked inside the bay or not. */
create or replace function public.park_car(p_kind text, p_id bigint, p_place text, p_hours int, p_good boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d record; cost bigint; until timestamptz;
begin
  select * into d from public.drive_car(p_kind, p_id);
  if p_hours not in (0, 1, 2, 4) then raise exception 'bad_hours'; end if;
  cost := p_hours * 4;
  if cost > 0 then
    until := now() + make_interval(hours => p_hours);
    perform coin_move(me, -cost, 'spend', 'RTA parking', 'parking:' || p_place || ':' || extract(epoch from now())::bigint);
  end if;
  insert into car_parkings (user_id, car_kind, car_id, place, hours, cost, good, paid_until) values (me, p_kind, p_id, left(p_place, 120), p_hours, cost, p_good, until);
  -- The inspector comes round a few minutes later.
  if p_hours = 0 then
    insert into traffic_fines (user_id, kind, amount, reason, place, issued_at)
      values (me, 'parking_unpaid', 150, 'Parked without paying', left(p_place, 120), now() + make_interval(mins => 3 + floor(random() * 8)::int));
  end if;
  if not p_good then
    insert into traffic_fines (user_id, kind, amount, reason, place, issued_at)
      values (me, 'bad_parking', 200, 'Parked outside the marked bay', left(p_place, 120), now() + make_interval(mins => 1 + floor(random() * 5)::int));
  end if;
  return jsonb_build_object('cost', cost, 'paidUntil', until);
end $$;
grant execute on function public.park_car(text, bigint, text, int, boolean) to authenticated;

/** Your fines from the last 30 days, charging any that have just been issued. */
create or replace function public.my_fines() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f traffic_fines; bal bigint; amt bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  for f in select * from traffic_fines where user_id = me and not charged and issued_at <= now() order by issued_at for update loop
    select balance into bal from profiles where id = me for update;
    amt := least(greatest(bal, 0), f.amount);
    if amt > 0 then perform coin_move(me, -amt, 'spend', 'RTA fine: ' || f.reason, 'fine:rta:' || f.id); end if;
    update traffic_fines set charged = true, paid = amt where id = f.id;
  end loop;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'amount', amount, 'paid', paid, 'reason', reason,
           'place', place, 'issuedAt', issued_at, 'seen', seen) order by issued_at desc)
         from traffic_fines where user_id = me and issued_at <= now() and issued_at > now() - interval '30 days'), '[]'::jsonb);
end $$;
grant execute on function public.my_fines() to authenticated;

create or replace function public.seen_fines(p_ids bigint[]) returns void
language sql security definer set search_path = public as $$
  update traffic_fines set seen = true where user_id = auth.uid() and id = any (p_ids)
$$;
grant execute on function public.seen_fines(bigint[]) to authenticated;

/** A drive ends (as before), and a speed-camera fine is now also on your fines list. */
create or replace function public.finish_drive(p_kind text, p_id bigint, p_metres int, p_speeding boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record; e numeric[]; used numeric; left_ numeric; fine bigint := 0; fid bigint;
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
    insert into traffic_fines (user_id, kind, amount, reason, charged, paid, seen)
      values (auth.uid(), 'speeding', fine, 'Speed camera: over 120 km/h on Sheikh Zayed Road', true, fine, true) returning id into fid;
    perform coin_move(auth.uid(), -fine, 'spend', 'Speed camera fine (RTA)', 'fine:rta:' || fid);
  end if;
  return jsonb_build_object('fuel', left_, 'fine', fine);
end $$;
grant execute on function public.finish_drive(text, bigint, int, boolean) to authenticated;
