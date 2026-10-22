-- System-company jobs (design spec section 11, tier 3). Six fictional city companies always hiring, so the
-- Job Board is never empty before players open ventures. Applying is an instant hire (no owner to review);
-- wages are paid at the Friday payroll by the game itself, not from a treasury. Names and icons live in
-- src/data/economy/system-jobs.json (checked by scripts/check-life-config.mjs).

alter table public.ventures add column if not exists system boolean not null default false;

with c(name, title, wage, shifts, req) as (values
  ('City Metro', 'Station assistant', 1500, 3, 'none'),
  ('Marina Mall Group', 'Retail associate', 1800, 4, 'none'),
  ('Gulf Hotels', 'Front desk host', 2200, 4, 'course'),
  ('Desert Tours', 'Tour guide', 2000, 3, 'course'),
  ('Swift Delivery', 'Delivery driver', 2500, 4, 'licence'),
  ('Falcon Analytics', 'Junior analyst', 3500, 5, 'degree'))
, v as (
  insert into public.ventures (type, name, system)
  select 'system', c.name, true from c where not exists (select 1 from public.ventures x where x.system and x.name = c.name)
  returning id, name)
insert into public.venture_jobs (venture_id, title, weekly_wage, shifts_per_week, requirement)
select v.id, c.title, c.wage, c.shifts, c.req from v join c on c.name = v.name;

/** Brings a venture up to date. System companies earn nothing and pay wages in full from the game. */
create or replace function public.venture_settle(p_venture bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v ventures; days int; daily int; s venture_staff; pw int := public.payroll_week(); pay bigint; amt bigint;
begin
  select * into v from ventures where id = p_venture for update;
  if v.id is null then return; end if;
  days := least(3, public.life_day(now()) - public.life_day(v.settled_at));
  if days > 0 and not v.system then
    daily := (public.venture_rule(v.type) ->> 'daily')::int;
    update ventures set treasury = treasury + round(daily * public.venture_multiplier(v.id) * days), settled_at = now() where id = v.id;
  end if;
  if v.payroll_week < pw then
    for s in select * from venture_staff where venture_id = v.id and week < pw for update loop
      pay := s.weekly_wage * least(s.shifts, s.shifts_per_week) / s.shifts_per_week + s.owed;
      if v.system then amt := pay; else select least(pay, treasury) into amt from ventures where id = v.id; end if;
      if amt > 0 then
        if not v.system then update ventures set treasury = treasury - amt where id = v.id; end if;
        perform coin_move(s.user_id, amt, 'earn', 'Wages: ' || s.title || ' at ' || v.name, 'payroll:' || v.id || ':' || s.week || ':' || s.user_id);
      end if;
      update venture_staff set owed = pay - amt, last_week_shifts = s.shifts, shifts = 0, week = pw where user_id = s.user_id;
    end loop;
    update ventures set payroll_week = pw where id = v.id;
  end if;
end $$;
revoke all on function public.venture_settle(bigint) from public, anon, authenticated;

/** Applying to a system company is an instant hire; player ventures review applications. */
create or replace function public.apply_job(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j venture_jobs; sys boolean;
begin
  select * into j from venture_jobs where id = p_job and open;
  if j.id is null then raise exception 'job_closed'; end if;
  select system into sys from ventures where id = j.venture_id;
  if public.is_venture_member(j.venture_id, me) then raise exception 'own_venture'; end if;
  if exists (select 1 from venture_staff where user_id = me) then raise exception 'already_employed'; end if;
  if j.requirement = 'course' and not public.has_course(me) then raise exception 'needs_course'; end if;
  if j.requirement = 'degree' and not public.has_degree(me) then raise exception 'needs_degree'; end if;
  if j.requirement = 'licence' and not public.has_licence(me) then raise exception 'needs_licence'; end if;
  if sys then
    insert into venture_staff (user_id, venture_id, job_id, title, weekly_wage, shifts_per_week)
    values (me, j.venture_id, j.id, j.title, j.weekly_wage, j.shifts_per_week);
    insert into job_applications (job_id, user_id, status) values (p_job, me, 'hired')
      on conflict (job_id, user_id) do update set status = 'hired', created_at = now();
    update job_applications set status = 'rejected' where user_id = me and status = 'pending';
    return;
  end if;
  if (select count(*) from job_applications where user_id = me and status = 'pending') >= 5 then raise exception 'too_many_applications'; end if;
  insert into job_applications (job_id, user_id) values (p_job, me) on conflict (job_id, user_id) do update set status = 'pending', created_at = now()
    where job_applications.status = 'rejected';
end $$;

create or replace function public.job_board() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'weeklyWage', j.weekly_wage, 'shiftsPerWeek', j.shifts_per_week,
    'requirement', j.requirement, 'venture', v.name, 'ventureType', v.type, 'system', v.system, 'mine', public.is_venture_member(v.id))
    order by v.system, j.created_at desc), '[]'::jsonb)
  from venture_jobs j join ventures v on v.id = j.venture_id where j.open
$$;

-- Employees of system companies can quit; there's no crew to let them go.
