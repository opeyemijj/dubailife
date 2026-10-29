-- Penalties. In custody (an open case with time still to serve) you can't take a job: no interviews, no
-- applications, no being hired, until you're released (bail, a lawyer, or the time runs out). And a third
-- traffic accident since your driving licence was issued revokes it: the licence is gone, and you pass the
-- theory and the Smart Yard again for a new one (your eye test still counts).
-- The accident limit mirrors src/data/cars/cars.json → driving.revokeAfterAccidents (scripts/check-life-config.mjs).

-- ---------------------------------------------------------------- no job while in custody

create or replace function public.in_custody(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cases where suspect_id = p_user and status = 'open' and jail_until > now())
$$;

create or replace function public.block_job_in_custody() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.in_custody(new.user_id) then raise exception 'in_custody'; end if;
  return new;
end $$;
drop trigger if exists block_job_in_custody on public.job_interviews;
create trigger block_job_in_custody before insert on public.job_interviews for each row execute function public.block_job_in_custody();
drop trigger if exists block_job_in_custody on public.job_applications;
create trigger block_job_in_custody before insert on public.job_applications for each row execute function public.block_job_in_custody();
drop trigger if exists block_job_in_custody on public.venture_staff;
create trigger block_job_in_custody before insert on public.venture_staff for each row execute function public.block_job_in_custody();

-- ---------------------------------------------------------------- three accidents and the licence is revoked

alter table public.driving_progress add column if not exists revoked_at timestamptz;
alter table public.driving_progress add column if not exists revocations int not null default 0;

/** Accidents since your current licence was issued (all of them if you have none). */
create or replace function public.accidents_on_licence(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from cases
  where suspect_id = p_user and kind = 'accident'
    and created_at >= coalesce((select issued_at from driving_progress where user_id = p_user), (select revoked_at from driving_progress where user_id = p_user), '-infinity')
$$;

/** A crash: Dubai Police open an accident case (3 hours' custody) and the car is taken; the third accident on
    a licence revokes it. Returns {caseId, accidents, revoked}. */
create or replace function public.car_accident(p_kind text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d record; cid bigint; officer uuid; n int; revoked boolean := false;
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
  n := public.accidents_on_licence(me);
  if n >= 3 and public.has_licence(me) then
    revoked := true;
    update cases set reason = 'Caused a traffic accident (third on this licence: licence revoked)' where id = cid;
    update driving_progress set issued_at = null, licence_no = null, theory_passed_at = null, yard_passed_at = null, road_passed_at = null,
      revoked_at = now(), revocations = revocations + 1
      where user_id = me;
  end if;
  return jsonb_build_object('caseId', cid, 'accidents', n, 'revoked', revoked);
end $$;
grant execute on function public.car_accident(text, bigint) to authenticated;

/** Your licence (with its accident count, or when it was revoked), your cars and your current rental. */
create or replace function public.my_garage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'licence', (select jsonb_build_object('number', licence_no, 'issuedAt', issued_at) from driving_progress where user_id = auth.uid() and issued_at is not null),
    'accidents', public.accidents_on_licence(auth.uid()),
    'revokedAt', (select revoked_at from driving_progress where user_id = auth.uid() and issued_at is null),
    'owned', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price,
                'registeredUntil', registered_until, 'insuredUntil', insured_until, 'boughtAt', bought_at,
                'fuel', fuel, 'impoundedUntil', case when impounded_until > now() then impounded_until end) order by bought_at desc)
                from owned_cars where user_id = auth.uid()), '[]'::jsonb),
    'rental', (select jsonb_build_object('id', id, 'car', car, 'company', company, 'days', days, 'endsAt', ends_at, 'deposit', deposit, 'fuel', fuel)
                from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1)
  )
$$;
grant execute on function public.my_garage() to authenticated;
