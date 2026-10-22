-- The player economy (design spec sections 10, 11, 12 and 19.4; Phase 4).
--
-- Ventures: a player buys a business (types in src/data/economy/ventures.json). It earns daily revenue into
-- its own treasury, settled lazily (at most 3 days at a time, like the living-cost tick). Qualified staff
-- who work shifts raise revenue by 0.5x each, up to 3x. Crews: up to 5 friends co-own a venture and split
-- the profit. Job Board: ventures post jobs, players apply and are hired, staff clock in one shift a day,
-- and payroll runs every Friday 17:00 GST from the treasury only (bought AED can never become wages).
--
-- Visa tiers 4-5: Freelance needs AED 360,000 earned plus a degree; Golden needs AED 2,000,000 of property
-- equity net of any AED ever bought, or honours (95%+ on a degree) plus a running venture with staff.
-- Flat purchases are now recorded so property value is known.

-- ---------------------------------------------------------------- rules (mirror of ventures.json)

create or replace function public.venture_rule(p_type text) returns jsonb
language sql immutable as $$
  select case p_type
    when 'karak_cafe'    then '{"cost": 50000, "daily": 1200}'::jsonb
    when 'food_truck'    then '{"cost": 80000, "daily": 1800}'::jsonb
    when 'barbershop'    then '{"cost": 120000, "daily": 2600}'::jsonb
    when 'bistro'        then '{"cost": 400000, "daily": 7500}'::jsonb
    when 'tech_agency'   then '{"cost": 1000000, "daily": 18000}'::jsonb
    when 'yacht_charter' then '{"cost": 2500000, "daily": 42000}'::jsonb
  end
$$;

/** Payroll week: Friday 17:00 GST (13:00 UTC) to the next Friday 17:00 GST. */
create or replace function public.payroll_week(t timestamptz default now()) returns int
language sql immutable as $$ select floor((extract(epoch from t) - 86400 - 13 * 3600) / 604800)::int $$;

create or replace function public.has_course(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from academy_enrolments where user_id = p_user and graduated_at is not null)
$$;
/** A university or accelerator graduate (not a foundation diploma). */
create or replace function public.has_degree(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from academy_enrolments where user_id = p_user and graduated_at is not null
                 and course_id !~ '^(dc|gems|gw)-')
$$;

-- ---------------------------------------------------------------- tables

create table if not exists public.ventures (
  id bigint generated always as identity primary key,
  type text not null,
  name text not null check (char_length(name) between 2 and 40),
  treasury bigint not null default 0 check (treasury >= 0),
  settled_at timestamptz not null default now(),
  payroll_week int not null default public.payroll_week(),
  created_at timestamptz not null default now()
);
create table if not exists public.venture_members (
  venture_id bigint not null references public.ventures (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'partner', 'invited')),
  joined_at timestamptz not null default now(),
  primary key (venture_id, user_id)
);
create table if not exists public.venture_jobs (
  id bigint generated always as identity primary key,
  venture_id bigint not null references public.ventures (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 40),
  weekly_wage bigint not null check (weekly_wage between 100 and 50000),
  shifts_per_week int not null check (shifts_per_week between 1 and 7),
  requirement text not null default 'none' check (requirement in ('none', 'course', 'degree', 'licence')),
  open boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.job_applications (
  job_id bigint not null references public.venture_jobs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'hired', 'rejected')),
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create table if not exists public.venture_staff (
  user_id uuid primary key references public.profiles (id) on delete cascade,  -- one job at a time
  venture_id bigint not null references public.ventures (id) on delete cascade,
  job_id bigint references public.venture_jobs (id) on delete set null,
  title text not null,
  weekly_wage bigint not null,
  shifts_per_week int not null,
  week int not null default public.payroll_week(),
  shifts int not null default 0,
  last_week_shifts int not null default 0,
  last_shift_day int,
  owed bigint not null default 0,
  hired_at timestamptz not null default now()
);
create table if not exists public.property_purchases (
  id bigint generated always as identity primary key,
  flat_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  price bigint not null,
  bought_at timestamptz not null default now()
);
create index if not exists property_purchases_user on public.property_purchases (user_id);
create index if not exists venture_members_user on public.venture_members (user_id);
create index if not exists venture_jobs_open on public.venture_jobs (open, created_at);

alter table public.ventures enable row level security;
alter table public.venture_members enable row level security;
alter table public.venture_jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.venture_staff enable row level security;
alter table public.property_purchases enable row level security;
drop policy if exists "open jobs are public" on public.venture_jobs;
create policy "open jobs are public" on public.venture_jobs for select using (open);
drop policy if exists "see own purchases" on public.property_purchases;
create policy "see own purchases" on public.property_purchases for select using (user_id = auth.uid());
-- Everything else is read through the functions below.

-- Record the price whenever a flat changes hands to a player.
create or replace function public.record_flat_purchase() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null and new.owner_id is distinct from old.owner_id and old.sale_price is not null then
    insert into property_purchases (flat_id, user_id, price) values (new.id, new.owner_id, old.sale_price);
  end if;
  return new;
end $$;
drop trigger if exists record_flat_purchase on public.flats;
create trigger record_flat_purchase after update of owner_id on public.flats for each row execute function public.record_flat_purchase();

-- ---------------------------------------------------------------- settlement

create or replace function public.venture_multiplier(p_venture bigint) returns numeric
language sql stable security definer set search_path = public as $$
  select least(3.0, 1.0 + 0.5 * count(*))
  from venture_staff s where s.venture_id = p_venture and (s.shifts > 0 or s.last_week_shifts > 0) and public.has_course(s.user_id)
$$;

/** Brings a venture up to date: revenue for up to 3 days, then any payroll weeks that have passed. */
create or replace function public.venture_settle(p_venture bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v ventures; days int; daily int; s venture_staff; pw int := public.payroll_week(); pay bigint; amt bigint;
begin
  select * into v from ventures where id = p_venture for update;
  if v.id is null then return; end if;
  days := least(3, public.life_day(now()) - public.life_day(v.settled_at));
  if days > 0 then
    daily := (public.venture_rule(v.type) ->> 'daily')::int;
    update ventures set treasury = treasury + round(daily * public.venture_multiplier(v.id) * days), settled_at = now() where id = v.id;
  end if;
  if v.payroll_week < pw then
    for s in select * from venture_staff where venture_id = v.id and week < pw for update loop
      -- Paid for the shifts worked in the week that just ended (missed weeks pay nothing).
      pay := s.weekly_wage * least(s.shifts, s.shifts_per_week) / s.shifts_per_week + s.owed;
      select least(pay, treasury) into amt from ventures where id = v.id;
      if amt > 0 then
        update ventures set treasury = treasury - amt where id = v.id;
        perform coin_move(s.user_id, amt, 'earn', 'Wages: ' || s.title || ' at ' || v.name, 'payroll:' || v.id || ':' || s.week || ':' || s.user_id);
      end if;
      update venture_staff set owed = pay - amt, last_week_shifts = s.shifts, shifts = 0, week = pw where user_id = s.user_id;
    end loop;
    update ventures set payroll_week = pw where id = v.id;
  end if;
end $$;
revoke all on function public.venture_settle(bigint), public.venture_multiplier(bigint), public.venture_rule(text) from public, anon, authenticated;

create or replace function public.is_venture_member(p_venture bigint, p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from venture_members where venture_id = p_venture and user_id = p_user and role in ('owner', 'partner'))
$$;

-- ---------------------------------------------------------------- ventures and crews

create or replace function public.buy_venture(p_type text, p_name text) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r jsonb := public.venture_rule(p_type); vid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if r is null then raise exception 'invalid_type'; end if;
  if (select count(*) from venture_members where user_id = me and role in ('owner', 'partner')) >= 3 then raise exception 'too_many_ventures'; end if;
  perform coin_move(me, -(r ->> 'cost')::bigint, 'spend', 'Bought a venture: ' || left(trim(p_name), 40), 'venture:' || p_type);
  insert into ventures (type, name) values (p_type, left(trim(p_name), 40)) returning id into vid;
  insert into venture_members (venture_id, user_id, role) values (vid, me, 'owner');
  return vid;
end $$;

create or replace function public.venture_invite(p_venture bigint, p_friend uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_venture_member(p_venture, me) then raise exception 'not_member'; end if;
  if not exists (select 1 from friendships where status = 'accepted' and ((user_id = me and friend_id = p_friend) or (user_id = p_friend and friend_id = me))) then raise exception 'not_friends'; end if;
  if (select count(*) from venture_members where venture_id = p_venture) >= 5 then raise exception 'crew_full'; end if;
  insert into venture_members (venture_id, user_id, role) values (p_venture, p_friend, 'invited') on conflict do nothing;
end $$;

create or replace function public.venture_answer_invite(p_venture bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (select 1 from venture_members where venture_id = p_venture and user_id = me and role = 'invited') then raise exception 'no_invite'; end if;
  if p_accept then
    if (select count(*) from venture_members where user_id = me and role in ('owner', 'partner')) >= 3 then raise exception 'too_many_ventures'; end if;
    update venture_members set role = 'partner', joined_at = now() where venture_id = p_venture and user_id = me;
  else
    delete from venture_members where venture_id = p_venture and user_id = me;
  end if;
end $$;

/** Splits the treasury, minus a week's wages kept back for payroll, equally among the crew. */
create or replace function public.collect_profit(p_venture bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); reserve bigint; t bigint; n int; share bigint; m record; vname text;
begin
  if not public.is_venture_member(p_venture, me) then raise exception 'not_member'; end if;
  perform public.venture_settle(p_venture);
  select coalesce(sum(weekly_wage), 0) into reserve from venture_staff where venture_id = p_venture;
  select treasury, name into t, vname from ventures where id = p_venture for update;
  select count(*) into n from venture_members where venture_id = p_venture and role in ('owner', 'partner');
  share := greatest(0, t - reserve) / n;
  if share <= 0 then return 0; end if;
  update ventures set treasury = treasury - share * n where id = p_venture;
  for m in select user_id from venture_members where venture_id = p_venture and role in ('owner', 'partner') loop
    perform coin_move(m.user_id, share, 'earn', 'Profit share: ' || vname, 'profit:' || p_venture || ':' || extract(epoch from now())::bigint || ':' || m.user_id);
  end loop;
  return share;
end $$;

-- ---------------------------------------------------------------- job board

create or replace function public.post_job(p_venture bigint, p_title text, p_wage bigint, p_shifts int, p_requirement text) returns bigint
language plpgsql security definer set search_path = public as $$
declare jid bigint;
begin
  if not public.is_venture_member(p_venture) then raise exception 'not_member'; end if;
  if (select count(*) from venture_jobs where venture_id = p_venture and open) >= 10 then raise exception 'too_many_jobs'; end if;
  insert into venture_jobs (venture_id, title, weekly_wage, shifts_per_week, requirement)
  values (p_venture, left(trim(p_title), 40), p_wage, p_shifts, p_requirement) returning id into jid;
  return jid;
end $$;

create or replace function public.close_job(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_venture_member((select venture_id from venture_jobs where id = p_job)) then raise exception 'not_member'; end if;
  update venture_jobs set open = false where id = p_job;
end $$;

create or replace function public.apply_job(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j venture_jobs;
begin
  select * into j from venture_jobs where id = p_job and open;
  if j.id is null then raise exception 'job_closed'; end if;
  if public.is_venture_member(j.venture_id, me) then raise exception 'own_venture'; end if;
  if exists (select 1 from venture_staff where user_id = me) then raise exception 'already_employed'; end if;
  if j.requirement = 'course' and not public.has_course(me) then raise exception 'needs_course'; end if;
  if j.requirement = 'degree' and not public.has_degree(me) then raise exception 'needs_degree'; end if;
  if j.requirement = 'licence' and not public.has_licence(me) then raise exception 'needs_licence'; end if;
  if (select count(*) from job_applications where user_id = me and status = 'pending') >= 5 then raise exception 'too_many_applications'; end if;
  insert into job_applications (job_id, user_id) values (p_job, me) on conflict (job_id, user_id) do update set status = 'pending', created_at = now()
    where job_applications.status = 'rejected';
end $$;

create or replace function public.review_application(p_job bigint, p_user uuid, p_hire boolean) returns void
language plpgsql security definer set search_path = public as $$
declare j venture_jobs;
begin
  select * into j from venture_jobs where id = p_job;
  if not public.is_venture_member(j.venture_id) then raise exception 'not_member'; end if;
  if not exists (select 1 from job_applications where job_id = p_job and user_id = p_user and status = 'pending') then raise exception 'no_application'; end if;
  if p_hire then
    if exists (select 1 from venture_staff where user_id = p_user) then raise exception 'already_employed'; end if;
    insert into venture_staff (user_id, venture_id, job_id, title, weekly_wage, shifts_per_week)
    values (p_user, j.venture_id, j.id, j.title, j.weekly_wage, j.shifts_per_week);
    update job_applications set status = 'hired' where job_id = p_job and user_id = p_user;
    update job_applications set status = 'rejected' where user_id = p_user and status = 'pending';
  else
    update job_applications set status = 'rejected' where job_id = p_job and user_id = p_user;
  end if;
end $$;

/** Ends a job: the employee quits, or a crew member lets them go. Owed wages are paid first if possible. */
create or replace function public.end_job(p_user uuid default auth.uid()) returns void
language plpgsql security definer set search_path = public as $$
declare s venture_staff;
begin
  select * into s from venture_staff where user_id = p_user;
  if s.user_id is null then return; end if;
  if p_user <> auth.uid() and not public.is_venture_member(s.venture_id) then raise exception 'not_member'; end if;
  perform public.venture_settle(s.venture_id);
  delete from venture_staff where user_id = p_user;
end $$;

/** Clock in for today's shift (one a day). */
create or replace function public.work_shift() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s venture_staff; d int := public.life_day(now());
begin
  select * into s from venture_staff where user_id = me;
  if s.user_id is null then raise exception 'no_job'; end if;
  perform public.venture_settle(s.venture_id);
  select * into s from venture_staff where user_id = me;
  if s.last_shift_day = d then raise exception 'already_worked'; end if;
  update venture_staff set shifts = shifts + 1, last_shift_day = d where user_id = me returning * into s;
  perform public.add_points(me, 'career', 20, 'shift:' || me || ':' || d);
  return jsonb_build_object('shifts', s.shifts, 'shiftsPerWeek', s.shifts_per_week, 'weeklyWage', s.weekly_wage);
end $$;

-- ---------------------------------------------------------------- reads

create or replace function public.venture_view(p_venture bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', v.id, 'type', v.type, 'name', v.name, 'treasury', v.treasury,
    'daily', (public.venture_rule(v.type) ->> 'daily')::int, 'multiplier', public.venture_multiplier(v.id),
    'nextPayroll', to_timestamp((public.payroll_week() + 1) * 604800 + 86400 + 13 * 3600),
    'members', (select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'role', m.role) order by m.joined_at)
                from venture_members m join profiles p on p.id = m.user_id where m.venture_id = v.id),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'title', s.title, 'weeklyWage', s.weekly_wage,
                'shifts', s.shifts, 'shiftsPerWeek', s.shifts_per_week, 'qualified', public.has_course(s.user_id), 'owed', s.owed))
                from venture_staff s join profiles p on p.id = s.user_id where s.venture_id = v.id), '[]'::jsonb),
    'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'weeklyWage', j.weekly_wage, 'shiftsPerWeek', j.shifts_per_week,
                'requirement', j.requirement,
                'applicants', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'qualified', public.has_course(p.id), 'licence', public.has_licence(p.id)))
                  from job_applications a join profiles p on p.id = a.user_id where a.job_id = j.id and a.status = 'pending'), '[]'::jsonb))
                order by j.created_at desc) from venture_jobs j where j.venture_id = v.id and j.open), '[]'::jsonb)
  ) from ventures v where v.id = p_venture
$$;
revoke all on function public.venture_view(bigint) from public, anon, authenticated;

/** My ventures (brought up to date), invites to crews, and my job. */
create or replace function public.my_economy() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); vid bigint; s venture_staff;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  for vid in select venture_id from venture_members where user_id = me and role in ('owner', 'partner') loop perform public.venture_settle(vid); end loop;
  select * into s from venture_staff where user_id = me;
  if s.user_id is not null then perform public.venture_settle(s.venture_id); select * into s from venture_staff where user_id = me; end if;
  return jsonb_build_object(
    'ventures', coalesce((select jsonb_agg(public.venture_view(venture_id) order by joined_at) from venture_members where user_id = me and role in ('owner', 'partner')), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'type', v.type)) from venture_members m join ventures v on v.id = m.venture_id
                         where m.user_id = me and m.role = 'invited'), '[]'::jsonb),
    'job', case when s.user_id is null then null else jsonb_build_object('title', s.title, 'venture', (select name from ventures where id = s.venture_id),
             'ventureType', (select type from ventures where id = s.venture_id), 'weeklyWage', s.weekly_wage, 'shifts', s.shifts, 'shiftsPerWeek', s.shifts_per_week,
             'workedToday', s.last_shift_day = public.life_day(now()), 'owed', s.owed,
             'nextPayroll', to_timestamp((public.payroll_week() + 1) * 604800 + 86400 + 13 * 3600)) end,
    'applications', coalesce((select jsonb_agg(jsonb_build_object('jobId', a.job_id, 'status', a.status)) from job_applications a where a.user_id = me and a.created_at > now() - interval '14 days'), '[]'::jsonb)
  );
end $$;

create or replace function public.job_board() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'weeklyWage', j.weekly_wage, 'shiftsPerWeek', j.shifts_per_week,
    'requirement', j.requirement, 'venture', v.name, 'ventureType', v.type, 'mine', public.is_venture_member(v.id)) order by j.created_at desc), '[]'::jsonb)
  from venture_jobs j join ventures v on v.id = j.venture_id where j.open
$$;

-- ---------------------------------------------------------------- visas 3-5

/** Progress toward the higher visas. */
create or replace function public.visa_progress(p_user uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = public as $$
  with own as (
    select distinct on (pp.flat_id) pp.price from property_purchases pp join flats f on f.id = pp.flat_id and f.owner_id = p_user
    where pp.user_id = p_user order by pp.flat_id, pp.bought_at desc)
  select jsonb_build_object(
    'earned', coalesce((select sum(delta) from coin_ledger where user_id = p_user and kind = 'earn' and delta > 0), 0),
    'purchased', coalesce((select sum(delta) from coin_ledger where user_id = p_user and kind = 'purchase' and delta > 0), 0),
    'property', coalesce((select sum(price) from own), 0),
    'degree', public.has_degree(p_user),
    'honours', exists (select 1 from academy_enrolments where user_id = p_user and graduated_at is not null and exam_score >= 95 and course_id !~ '^(dc|gems|gw)-'),
    'venture', exists (select 1 from venture_members m join venture_staff s on s.venture_id = m.venture_id where m.user_id = p_user and m.role in ('owner', 'partner')),
    'employed', exists (select 1 from venture_staff where user_id = p_user)
  )
$$;
grant execute on function public.visa_progress(uuid) to authenticated;

create or replace function public.claim_visa(p_tier text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur text; rank_now int; rank_new int; vp jsonb;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into life_state (user_id) values (uid) on conflict do nothing;
  select visa_tier into cur from life_state where user_id = uid;
  rank_now := array_position(array['VISIT','STUDENT','EMPLOYMENT','FREELANCE','GOLDEN'], cur);
  rank_new := array_position(array['VISIT','STUDENT','EMPLOYMENT','FREELANCE','GOLDEN'], p_tier);
  if rank_new is null then raise exception 'invalid_tier'; end if;
  vp := public.visa_progress(uid);
  if p_tier = 'STUDENT' then
    if rank_now > rank_new then raise exception 'already_higher'; end if;
    if not exists (select 1 from academy_enrolments where user_id = uid and graduated_at is not null) then raise exception 'needs_diploma'; end if;
  elsif p_tier = 'EMPLOYMENT' then
    if rank_now > rank_new then raise exception 'already_higher'; end if;
    if not ((vp ->> 'employed')::boolean
            or exists (select 1 from profiles where id = uid and citizen ? 'job' and citizen->'job' <> 'null'::jsonb)) then raise exception 'needs_job'; end if;
  elsif p_tier = 'FREELANCE' then
    if rank_now > rank_new then raise exception 'already_higher'; end if;
    if (vp ->> 'earned')::bigint < 360000 then raise exception 'needs_income'; end if;
    if not (vp ->> 'degree')::boolean then raise exception 'needs_degree'; end if;
  elsif p_tier = 'GOLDEN' then
    if rank_now >= rank_new then raise exception 'already_higher'; end if;
    if not (((vp ->> 'property')::bigint - (vp ->> 'purchased')::bigint >= 2000000)
            or ((vp ->> 'honours')::boolean and (vp ->> 'venture')::boolean)) then raise exception 'needs_golden'; end if;
  else
    raise exception 'invalid_tier';
  end if;
  update life_state set visa_tier = p_tier, visa_days_left = public.visa_days(p_tier) where user_id = uid;
  return public.life_status(uid);
end $$;

revoke all on function public.buy_venture(text, text), public.venture_invite(bigint, uuid), public.venture_answer_invite(bigint, boolean),
  public.collect_profit(bigint), public.post_job(bigint, text, bigint, int, text), public.close_job(bigint), public.apply_job(bigint),
  public.review_application(bigint, uuid, boolean), public.end_job(uuid), public.work_shift(), public.my_economy(), public.job_board() from public, anon;
grant execute on function public.buy_venture(text, text), public.venture_invite(bigint, uuid), public.venture_answer_invite(bigint, boolean),
  public.collect_profit(bigint), public.post_job(bigint, text, bigint, int, text), public.close_job(bigint), public.apply_job(bigint),
  public.review_application(bigint, uuid, boolean), public.end_job(uuid), public.work_shift(), public.my_economy(), public.job_board() to authenticated;
