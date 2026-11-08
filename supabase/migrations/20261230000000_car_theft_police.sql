-- Interactive Vehicle Theft, Driving Licence Enforcement, 3D Police Pursuit and Stolen Car Recovery

-- 1. Ensure owned_cars columns exist for tracking vehicle theft, reporting and recovery
alter table public.owned_cars add column if not exists is_stolen boolean not null default false;
alter table public.owned_cars add column if not exists stolen_by uuid references public.profiles(id) on delete set null;
alter table public.owned_cars add column if not exists stolen_at timestamptz;
alter table public.owned_cars add column if not exists reported_stolen_at timestamptz;
alter table public.owned_cars add column if not exists recovered_at timestamptz;
alter table public.owned_cars add column if not exists parked_flat_id text;
alter table public.owned_cars add column if not exists theft_attempts int not null default 0;

-- 2. Update RLS policy so visitors and authorized drivers can view the vehicle
drop policy if exists "see own cars" on public.owned_cars;
create policy "see own cars" on public.owned_cars for select using (
  user_id = auth.uid() 
  or stolen_by = auth.uid()
  or auth.uid() is not null
);

-- 3. Get parked car at a flat (for visitors and owners)
create or replace function public.get_flat_parked_car(p_flat_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f record;
  c record;
  res_id uuid;
  res_name text;
  caller uuid := auth.uid();
begin
  select * into f from flats where id = p_flat_id;
  if f.id is not null then
    res_id := coalesce(f.tenant_id, f.owner_id);
  end if;

  -- First check if a car is explicitly parked at this flat
  select * into c from owned_cars
    where parked_flat_id = p_flat_id
      and (impounded_until is null or impounded_until <= now())
    order by bought_at desc limit 1;

  -- Otherwise, find resident's latest non-impounded car
  if c.id is null and res_id is not null then
    select * into c from owned_cars
      where user_id = res_id
        and (impounded_until is null or impounded_until <= now())
      order by bought_at desc limit 1;
  end if;

  if c.id is null then
    return null;
  end if;

  select username into res_name from profiles where id = c.user_id;

  return jsonb_build_object(
    'id', c.id,
    'car', c.car,
    'plate', c.plate,
    'dealer', c.dealer,
    'price', c.price,
    'fuel', c.fuel,
    'ownerId', c.user_id,
    'ownerUsername', coalesce(res_name, 'Resident'),
    'isStolen', coalesce(c.is_stolen, false),
    'stolenBy', c.stolen_by,
    'stolenByUsername', (select username from profiles where id = c.stolen_by),
    'isReportedStolen', c.reported_stolen_at is not null,
    'canDrive', (caller = c.user_id or exists (select 1 from couple_homes ch where ch.flat_id = p_flat_id and (ch.citizen_id = caller or ch.partner_id = caller))),
    'canSteal', (caller is not null and caller <> c.user_id and not coalesce(c.is_stolen, false) and not exists (select 1 from couple_homes ch where ch.flat_id = p_flat_id and (ch.citizen_id = caller or ch.partner_id = caller)))
  );
end $$;
grant execute on function public.get_flat_parked_car(text) to anon, authenticated;

-- 4. Attempt to steal a parked vehicle
create or replace function public.attempt_steal_car(p_flat_id text, p_car_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c record;
  owner_name text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into c from owned_cars where id = p_car_id for update;
  if c.id is null then raise exception 'no_car'; end if;
  if c.user_id = me then raise exception 'cannot_steal_own_car'; end if;
  if c.is_stolen then raise exception 'already_stolen'; end if;
  if c.impounded_until > now() then raise exception 'impounded'; end if;

  select username into owner_name from profiles where id = c.user_id;

  -- Flag car as stolen and possessed by thief
  update owned_cars
    set is_stolen = true,
        stolen_by = me,
        stolen_at = now(),
        theft_attempts = theft_attempts + 1,
        parked_flat_id = p_flat_id
    where id = c.id;

  return jsonb_build_object(
    'success', true,
    'carId', c.id,
    'car', c.car,
    'plate', c.plate,
    'fuel', c.fuel,
    'ownerId', c.user_id,
    'ownerUsername', coalesce(owner_name, 'Owner')
  );
end $$;
grant execute on function public.attempt_steal_car(text, bigint) to authenticated;

-- 5. Report a stolen vehicle to Dubai Police
create or replace function public.report_stolen_car(p_car_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c record;
  cid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into c from owned_cars where id = p_car_id and user_id = me for update;
  if c.id is null then raise exception 'not_your_car'; end if;
  if not coalesce(c.is_stolen, false) then raise exception 'not_stolen'; end if;

  update owned_cars set reported_stolen_at = now() where id = c.id;

  -- If suspect is known, file case in cases table for Dubai Police
  if c.stolen_by is not null then
    insert into cases (suspect_id, sender_id, held, reason, status)
      values (c.stolen_by, me, 1500, 'Grand Theft Auto: Reported stolen vehicle ' || c.plate || ' (' || c.car || ')', 'open')
      returning id into cid;
  end if;

  return jsonb_build_object('success', true, 'reportedAt', now(), 'caseId', cid);
end $$;
grant execute on function public.report_stolen_car(bigint) to authenticated;

-- 6. Dubai Police intercepts and arrests driver of stolen vehicle
create or replace function public.arrest_stolen_car_driver(p_car_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  thief uuid := auth.uid();
  c record;
  cid bigint;
  owner_id uuid;
begin
  if thief is null then raise exception 'not_signed_in'; end if;
  select * into c from owned_cars where id = p_car_id for update;
  if c.id is null then raise exception 'no_car'; end if;

  owner_id := c.user_id;

  -- Record police arrest and fine
  insert into cases (suspect_id, sender_id, held, reason, status, fine)
    values (thief, owner_id, 2000, 'Grand Theft Auto: Apprehended driving reported stolen vehicle ' || c.plate, 'open', 5000)
    returning id into cid;

  -- Vehicle recovered! Return car to owner's driveway, reset stolen flags, refill tank as police impound recovery courtesy
  update owned_cars
    set is_stolen = false,
        stolen_by = null,
        recovered_at = now(),
        reported_stolen_at = null,
        fuel = 100,
        impounded_until = null
    where id = c.id;

  return jsonb_build_object(
    'arrested', true,
    'caseId', cid,
    'carId', c.id,
    'ownerId', owner_id,
    'plate', c.plate,
    'car', c.car
  );
end $$;
grant execute on function public.arrest_stolen_car_driver(bigint) to authenticated;

-- 7. Arrest unlicensed driver
create or replace function public.arrest_unlicensed_driver(p_car_id bigint, p_kind text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if public.has_licence(me) then
    return jsonb_build_object('hasLicence', true);
  end if;

  insert into cases (suspect_id, held, reason, status, fine)
    values (me, 1000, 'Driving without a valid driving licence (unlicensed operator on public road)', 'open', 3000)
    returning id into cid;

  if p_kind = 'owned' and p_car_id is not null then
    update owned_cars set impounded_until = now() + interval '3 days' where id = p_car_id and user_id = me;
  end if;

  return jsonb_build_object('arrested', true, 'caseId', cid, 'impounded', true);
end $$;
grant execute on function public.arrest_unlicensed_driver(bigint, text) to authenticated;

-- 8. Enhance my_garage to include stolen cars (owned or possessed)
create or replace function public.my_garage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'licence', (select jsonb_build_object('number', licence_no, 'issuedAt', issued_at) from driving_progress where user_id = auth.uid() and issued_at is not null),
    'accidents', public.accidents_on_licence(auth.uid()),
    'revokedAt', (select revoked_at from driving_progress where user_id = auth.uid() and issued_at is null),
    'owned', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price,
                'registeredUntil', registered_until, 'insuredUntil', insured_until, 'boughtAt', bought_at,
                'fuel', fuel,
                'impoundedUntil', case when impounded_until > now() then impounded_until end,
                'isStolen', coalesce(is_stolen, false),
                'stolenAt', stolen_at,
                'reportedStolenAt', reported_stolen_at,
                'recoveredAt', recovered_at,
                'stolenBy', stolen_by,
                'stolenByUsername', (select username from profiles where id = owned_cars.stolen_by)
              ) order by bought_at desc)
              from owned_cars where user_id = auth.uid()), '[]'::jsonb),
    'stolen', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price,
                'fuel', fuel,
                'ownerId', user_id,
                'ownerUsername', (select username from profiles where id = owned_cars.user_id),
                'isStolen', true,
                'isReportedStolen', reported_stolen_at is not null,
                'stolenAt', stolen_at
              )) from owned_cars where stolen_by = auth.uid() and is_stolen = true), '[]'::jsonb),
    'rental', (select jsonb_build_object('id', id, 'car', car, 'company', company, 'days', days, 'endsAt', ends_at, 'deposit', deposit, 'fuel', fuel)
                from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1)
  )
$$;
grant execute on function public.my_garage() to authenticated;
