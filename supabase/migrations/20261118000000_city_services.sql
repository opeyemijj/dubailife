-- City services: job interviews, illness and doctors, police and the courts.
--   * Every job needs a passed interview (3 questions, 2 right) before applying; player ventures still review.
--   * Three new careers serve other players: doctors treat the sick, police officers make arrests, lawyers
--     defend. Players in those jobs come first; a Local steps in when none is free.
--   * A large or unusual transfer may be flagged: the money is held and a judge rules within 24 hours.
-- Texts, questions and numbers live in src/data/economy/city-services.json (checked by
-- scripts/check-life-config.mjs against the values below).

-- ---------------------------------------------------------------- careers

alter table public.venture_jobs add column if not exists service text check (service in ('doctor', 'police', 'lawyer'));

with c(name, title, wage, shifts, req, service) as (values
  ('Dubai Health', 'Doctor', 4000, 5, 'degree', 'doctor'),
  ('Dubai Police', 'Police officer', 3200, 5, 'licence', 'police'),
  ('Dubai Courts', 'Lawyer', 3800, 5, 'degree', 'lawyer'))
, v as (
  insert into public.ventures (type, name, system)
  select 'system', c.name, true from c where not exists (select 1 from public.ventures x where x.system and x.name = c.name)
  returning id, name)
insert into public.venture_jobs (venture_id, title, weekly_wage, shifts_per_week, requirement, service)
select v.id, c.title, c.wage, c.shifts, c.req, c.service from v join c on c.name = v.name;

/** The service a player's current job provides, if any. */
create or replace function public.service_of(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select j.service from venture_staff s join venture_jobs j on j.id = s.job_id where s.user_id = p_user
$$;
revoke all on function public.service_of(uuid) from public, anon, authenticated;

/** What doctors and lawyers charge; set by themselves within the limits. */
create table if not exists public.service_fees (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  fee bigint not null
);
alter table public.service_fees enable row level security;

create or replace function public.fee_limits(p_service text) returns int[]
language sql immutable as $$
  -- {min, max, default}
  select case p_service when 'doctor' then array[50, 5000, 250] when 'lawyer' then array[100, 50000, 1500] end
$$;

create or replace function public.fee_of(p_user uuid, p_service text) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce((select fee from service_fees where user_id = p_user), (public.fee_limits(p_service))[3])
$$;

create or replace function public.set_service_fee(p_fee bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); svc text := public.service_of(auth.uid()); lim int[];
begin
  if svc not in ('doctor', 'lawyer') then raise exception 'not_a_professional'; end if;
  lim := public.fee_limits(svc);
  if p_fee < lim[1] or p_fee > lim[2] then raise exception 'fee_out_of_range'; end if;
  insert into service_fees (user_id, fee) values (me, p_fee) on conflict (user_id) do update set fee = excluded.fee;
end $$;
grant execute on function public.set_service_fee(bigint) to authenticated;

/** Players working a service, with what they charge (the app shows who's online). */
create or replace function public.professionals(p_service text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
    'fee', public.fee_of(p.id, p_service))), '[]'::jsonb)
  from venture_staff s join venture_jobs j on j.id = s.job_id join profiles p on p.id = s.user_id
  where j.service = p_service and p.id <> auth.uid()
$$;
grant execute on function public.professionals(text) to authenticated;

-- ---------------------------------------------------------------- interviews

create table if not exists public.interview_keys (
  set_id text primary key,
  answers int[] not null
);
alter table public.interview_keys enable row level security;
insert into public.interview_keys (set_id, answers) values
  ('City Metro', '{1,0,1}'),
  ('Marina Mall Group', '{0,1,2}'),
  ('Gulf Hotels', '{1,0,2}'),
  ('Desert Tours', '{1,0,2}'),
  ('Swift Delivery', '{1,0,2}'),
  ('Falcon Analytics', '{1,0,2}'),
  ('Dubai Health', '{0,1,2}'),
  ('Dubai Police', '{1,0,2}'),
  ('Dubai Courts', '{1,0,2}'),
  ('_player', '{0,1,2}'),
  ('_defence', '{0,1,2}')
on conflict (set_id) do update set answers = excluded.answers;

create table if not exists public.job_interviews (
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id bigint not null references public.venture_jobs (id) on delete cascade,
  passed boolean not null,
  day int not null,
  primary key (user_id, job_id)
);
alter table public.job_interviews enable row level security;
drop policy if exists "see own interviews" on public.job_interviews;
create policy "see own interviews" on public.job_interviews for select using (user_id = auth.uid());

/** Right answers out of three. */
create or replace function public.quiz_score(p_set text, p_answers int[]) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from interview_keys k, generate_subscripts(k.answers, 1) i
  where k.set_id = p_set and p_answers[i] = k.answers[i]
$$;
revoke all on function public.quiz_score(text, int[]) from public, anon, authenticated;

/** Sit the interview for a job: 2 of 3 right passes. A failed interview can be retaken the next day. */
create or replace function public.take_interview(p_job bigint, p_answers int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j venture_jobs; v ventures; d int := public.life_day(now()); prev job_interviews; score int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into j from venture_jobs where id = p_job and open;
  if j.id is null then raise exception 'job_closed'; end if;
  select * into v from ventures where id = j.venture_id;
  select * into prev from job_interviews where user_id = me and job_id = p_job;
  if prev.passed then return jsonb_build_object('passed', true, 'score', 3); end if;
  if prev.day = d then raise exception 'retry_tomorrow'; end if;
  score := public.quiz_score(case when v.system then v.name else '_player' end, p_answers);
  insert into job_interviews (user_id, job_id, passed, day) values (me, p_job, score >= 2, d)
    on conflict (user_id, job_id) do update set passed = excluded.passed, day = excluded.day;
  return jsonb_build_object('passed', score >= 2, 'score', score);
end $$;
grant execute on function public.take_interview(bigint, int[]) to authenticated;

/** Applying needs a passed interview. System companies then hire on the spot; player ventures review. */
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
  if not exists (select 1 from job_interviews where user_id = me and job_id = p_job and passed) then raise exception 'needs_interview'; end if;
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
    'requirement', j.requirement, 'venture', v.name, 'ventureType', v.type, 'system', v.system, 'mine', public.is_venture_member(v.id),
    'service', j.service,
    'interview', (select case when i.passed then 'passed' when i.day = public.life_day(now()) then 'failed' end
                  from job_interviews i where i.user_id = auth.uid() and i.job_id = j.id))
    order by v.system, j.created_at desc), '[]'::jsonb)
  from venture_jobs j join ventures v on v.id = j.venture_id where j.open
$$;

-- ---------------------------------------------------------------- illness and doctors

create table if not exists public.illnesses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('food-poisoning', 'flu', 'heatstroke')),
  since timestamptz not null default now()
);
create table if not exists public.consults (
  id bigint generated always as identity primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  fee bigint not null,
  status text not null default 'waiting' check (status in ('waiting', 'treated', 'cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists consults_doctor on public.consults (doctor_id, status);
create index if not exists consults_patient on public.consults (patient_id, status);
alter table public.illnesses enable row level security;
alter table public.consults enable row level security;
drop policy if exists "see own illness" on public.illnesses;
create policy "see own illness" on public.illnesses for select using (user_id = auth.uid());
drop policy if exists "see own consults" on public.consults;
create policy "see own consults" on public.consults for select using (auth.uid() in (patient_id, doctor_id));

/** The right treatment for each illness (the index into the treatments list). */
create or replace function public.treatment_for(p_kind text) returns int
language sql immutable as $$
  select case p_kind when 'food-poisoning' then 1 when 'flu' then 0 when 'heatstroke' then 2 end
$$;

/** The app reports when the citizen falls ill (after a bad meal, when run down, or in the heat). */
create or replace function public.fall_ill(p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if public.treatment_for(p_kind) is null then raise exception 'unknown_illness'; end if;
  insert into illnesses (user_id, kind) values (auth.uid(), p_kind) on conflict (user_id) do nothing;
end $$;
grant execute on function public.fall_ill(text) to authenticated;

/** See a Local doctor straight away at the clinic's fixed price. */
create or replace function public.local_clinic() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text;
begin
  select kind into k from illnesses where user_id = me for update;
  if k is null then raise exception 'not_ill'; end if;
  perform coin_move(me, -350, 'spend', 'Clinic visit (Local doctor)', 'clinic:' || me || ':' || extract(epoch from now())::bigint);
  delete from illnesses where user_id = me;
  -- Any player doctors still waiting are released, and the fees held for them returned.
  perform public.cancel_consults(me);
end $$;
grant execute on function public.local_clinic() to authenticated;

create or replace function public.cancel_consults(p_patient uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c consults;
begin
  for c in select * from consults where patient_id = p_patient and status = 'waiting' for update loop
    perform coin_move(p_patient, c.fee, 'refund', 'Doctor visit cancelled', 'consult-refund:' || c.id);
    update consults set status = 'cancelled', closed_at = now() where id = c.id;
  end loop;
end $$;
revoke all on function public.cancel_consults(uuid) from public, anon, authenticated;

/** Ask a player doctor to treat you. Their fee is held until they treat you (or you cancel). */
create or replace function public.request_doctor(p_doctor uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text; f bigint; cid bigint;
begin
  select kind into k from illnesses where user_id = me;
  if k is null then raise exception 'not_ill'; end if;
  if p_doctor = me or public.service_of(p_doctor) is distinct from 'doctor' then raise exception 'not_a_doctor'; end if;
  if exists (select 1 from consults where patient_id = me and status = 'waiting') then raise exception 'already_waiting'; end if;
  f := public.fee_of(p_doctor, 'doctor');
  insert into consults (patient_id, doctor_id, kind, fee) values (me, p_doctor, k, f) returning consults.id into cid;
  perform coin_move(me, -f, 'spend', 'Doctor visit (held)', 'consult:' || cid);
  return cid;
end $$;
grant execute on function public.request_doctor(uuid) to authenticated;

create or replace function public.cancel_consult(p_consult bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from consults where id = p_consult and patient_id = auth.uid() and status = 'waiting') then raise exception 'not_waiting'; end if;
  perform public.cancel_consults(auth.uid());
end $$;
grant execute on function public.cancel_consult(bigint) to authenticated;

/** The doctor prescribes: the right treatment cures the patient and pays the doctor. */
create or replace function public.treat_patient(p_consult bigint, p_treatment int) returns boolean
language plpgsql security definer set search_path = public as $$
declare c consults; who text;
begin
  select * into c from consults where id = p_consult and doctor_id = auth.uid() and status = 'waiting' for update;
  if c.id is null then raise exception 'not_waiting'; end if;
  if public.treatment_for(c.kind) <> p_treatment then return false; end if;
  select username into who from profiles where id = c.patient_id;
  perform coin_move(c.doctor_id, c.fee, 'earn', 'Treated @' || who, 'treated:' || c.id);
  update consults set status = 'treated', closed_at = now() where id = c.id;
  delete from illnesses where user_id = c.patient_id;
  perform public.add_points(c.doctor_id, 'career', 15, 'treat:' || c.id);
  return true;
end $$;
grant execute on function public.treat_patient(bigint, int) to authenticated;

-- ---------------------------------------------------------------- police and courts

create table if not exists public.cases (
  id bigint generated always as identity primary key,
  suspect_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  officer_id uuid references public.profiles (id) on delete set null,   -- null: a Local officer
  held bigint not null check (held >= 0),
  reason text not null,
  lawyer_id uuid references public.profiles (id) on delete set null,
  lawyer_kind text check (lawyer_kind in ('player', 'aid', 'senior')),
  lawyer_fee bigint,
  defence int,                                                           -- 0..3
  status text not null default 'open' check (status in ('open', 'cleared', 'guilty')),
  fine bigint,
  hearing_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  verdict_at timestamptz
);
create index if not exists cases_suspect on public.cases (suspect_id, status);
create index if not exists cases_lawyer on public.cases (lawyer_id, status);
alter table public.cases enable row level security;
drop policy if exists "see own cases" on public.cases;
create policy "see own cases" on public.cases for select using (auth.uid() in (suspect_id, lawyer_id, officer_id));

/** After a transfer lands: is it big or odd enough to look into, and does the police pick it up? */
create or replace function public.screen_transfer(p_from uuid, p_to uuid, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
declare received bigint; young boolean; why text; chance numeric; officer uuid; open_case bigint;
begin
  select coalesce(sum(amount), 0) into received from transfers where to_id = p_to and created_at > now() - interval '1 day';
  select created_at > now() - interval '2 days' into young from profiles where id = p_from;
  why := case
    when p_amount > 200000 then 'A single transfer of AED ' || p_amount
    when received > 500000 then 'AED ' || received || ' received in a day'
    when young and p_amount > 50000 then 'AED ' || p_amount || ' from an account under 2 days old'
  end;
  if why is null then return; end if;
  chance := least(0.9, 0.35 + 0.4 * p_amount / 1000000.0);
  if random() >= chance then return; end if;
  -- An officer on the force makes the arrest when there is one; otherwise a Local officer.
  select s.user_id into officer from venture_staff s join venture_jobs j on j.id = s.job_id
    where j.service = 'police' and s.user_id not in (p_from, p_to) order by random() limit 1;
  perform coin_move(p_to, -p_amount, 'spend', 'Held by Dubai Police pending a hearing', 'held:' || p_from || ':' || p_to || ':' || extract(epoch from now())::bigint);
  select id into open_case from cases where suspect_id = p_to and status = 'open' order by created_at desc limit 1;
  if open_case is not null then
    update cases set held = held + p_amount where id = open_case;
  else
    insert into cases (suspect_id, sender_id, officer_id, held, reason) values (p_to, p_from, officer, p_amount, why);
  end if;
end $$;
revoke all on function public.screen_transfer(uuid, uuid, bigint) from public, anon, authenticated;

/** Sending money, now refused while your own case is open, and screened by the police. */
create or replace function public.send_money(p_to uuid, p_amount bigint, p_note text default null, p_place text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_balance bigint;
  sent bigint;
begin
  if v_from is null then raise exception 'not_signed_in'; end if;
  if p_to is null or p_to = v_from then raise exception 'invalid_recipient'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'amount_out_of_range'; end if;
  if exists (select 1 from cases where suspect_id = v_from and status = 'open') then raise exception 'account_frozen'; end if;
  if (select count(*) from transfers where from_id = v_from and created_at > now() - interval '1 minute') >= 30 then raise exception 'too_many_transfers'; end if;
  select coalesce(sum(amount), 0) into sent from transfers where from_id = v_from and created_at > now() - interval '1 day';
  if sent + p_amount > coalesce((setting('limits') ->> 'max_daily_send')::bigint, 20000) then raise exception 'daily_send_limit'; end if;
  perform 1 from profiles where id in (v_from, p_to) order by id for update;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'recipient_missing'; end if;
  v_balance := coin_move(v_from, -p_amount, 'transfer_out', p_place, p_to::text);
  perform coin_move(p_to, p_amount, 'transfer_in', p_place, v_from::text);
  insert into transfers (from_id, to_id, amount, note, place) values (v_from, p_to, p_amount, nullif(trim(p_note), ''), p_place);
  perform public.screen_transfer(v_from, p_to, p_amount);
  return v_balance;
end $$;

/** Hire a lawyer for your case: a player lawyer (their fee), Legal Aid or Senior Counsel (Locals). */
create or replace function public.hire_lawyer(p_case bigint, p_kind text, p_lawyer uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c cases; f bigint; who text;
begin
  select * into c from cases where id = p_case and suspect_id = me and status = 'open' for update;
  if c.id is null then raise exception 'no_open_case'; end if;
  if c.lawyer_kind is not null then raise exception 'already_represented'; end if;
  if p_kind = 'player' then
    if p_lawyer is null or p_lawyer = me or public.service_of(p_lawyer) is distinct from 'lawyer' then raise exception 'not_a_lawyer'; end if;
    f := public.fee_of(p_lawyer, 'lawyer');
    select username into who from profiles where id = me;
    perform coin_move(me, -f, 'spend', 'Lawyer fee', 'lawyer:' || c.id);
    perform coin_move(p_lawyer, f, 'earn', 'Defending @' || who, 'lawyer-fee:' || c.id);
    update cases set lawyer_kind = 'player', lawyer_id = p_lawyer, lawyer_fee = f where id = c.id;
  elsif p_kind = 'aid' then
    perform coin_move(me, -500, 'spend', 'Legal Aid (Local lawyer)', 'lawyer:' || c.id);
    update cases set lawyer_kind = 'aid', lawyer_fee = 500, defence = 1 where id = c.id;
  elsif p_kind = 'senior' then
    perform coin_move(me, -15000, 'spend', 'Senior Counsel (Local lawyer)', 'lawyer:' || c.id);
    update cases set lawyer_kind = 'senior', lawyer_fee = 15000, defence = 2 where id = c.id;
  else raise exception 'unknown_lawyer';
  end if;
end $$;
grant execute on function public.hire_lawyer(bigint, text, uuid) to authenticated;

/** The hired lawyer prepares the defence: three questions, each right answer a point. */
create or replace function public.prepare_defence(p_case bigint, p_answers int[]) returns int
language plpgsql security definer set search_path = public as $$
declare c cases; score int;
begin
  select * into c from cases where id = p_case and lawyer_id = auth.uid() and status = 'open' for update;
  if c.id is null then raise exception 'not_your_case'; end if;
  if c.defence is not null then raise exception 'already_prepared'; end if;
  score := public.quiz_score('_defence', p_answers);
  update cases set defence = score where id = c.id;
  perform public.add_points(auth.uid(), 'career', 10 + 5 * score, 'defence:' || c.id);
  return score;
end $$;
grant execute on function public.prepare_defence(bigint, int[]) to authenticated;

/** The judge (a Local) rules: a better defence makes clearing more likely. Cleared returns the money;
    guilty keeps it and fines 10% of it, and the arresting officer (if a player) earns a bounty. */
create or replace function public.judge_case(p_case bigint) returns cases
language plpgsql security definer set search_path = public as $$
declare c cases; bal bigint; v_fine bigint;
begin
  select * into c from cases where id = p_case and status = 'open' for update;
  if c.id is null then select * into c from cases where id = p_case; return c; end if;
  if random() < 0.2 + 0.2 * coalesce(c.defence, 0) then
    perform coin_move(c.suspect_id, c.held, 'refund', 'Released by the court', 'cleared:' || c.id);
    update cases set status = 'cleared', verdict_at = now() where id = c.id returning * into c;
  else
    select balance into bal from profiles where id = c.suspect_id for update;
    v_fine := least(bal, c.held * 10 / 100);
    if v_fine > 0 then perform coin_move(c.suspect_id, -v_fine, 'spend', 'Court fine', 'fine:' || c.id); end if;
    if c.officer_id is not null then perform coin_move(c.officer_id, 500, 'earn', 'Arrest bounty', 'bounty:' || c.id); end if;
    update cases set status = 'guilty', fine = v_fine, verdict_at = now() where id = c.id returning * into c;
  end if;
  return c;
end $$;
revoke all on function public.judge_case(bigint) from public, anon, authenticated;

/** Go to court now (once you have a lawyer and the defence is ready), or when the hearing is due. */
create or replace function public.go_to_court(p_case bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  select * into c from cases where id = p_case and suspect_id = auth.uid();
  if c.id is null then raise exception 'no_case'; end if;
  if c.status = 'open' and c.defence is null and now() < c.hearing_at then raise exception 'defence_not_ready'; end if;
  c := public.judge_case(c.id);
  return to_jsonb(c);
end $$;
grant execute on function public.go_to_court(bigint) to authenticated;

-- ---------------------------------------------------------------- what the app shows

/** Everything the phone's Clinic and Court apps need, with overdue hearings ruled on first. */
create or replace function public.my_services() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  for cid in select cases.id from cases where suspect_id = me and status = 'open' and hearing_at <= now() loop perform public.judge_case(cid); end loop;
  return jsonb_build_object(
    'service', public.service_of(me),
    'fee', case when public.service_of(me) in ('doctor', 'lawyer') then public.fee_of(me, public.service_of(me)) end,
    'illness', (select jsonb_build_object('kind', kind, 'since', since) from illnesses where user_id = me),
    'waiting', (select jsonb_build_object('id', c.id, 'doctor', p.username, 'fee', c.fee, 'since', c.created_at)
                from consults c join profiles p on p.id = c.doctor_id where c.patient_id = me and c.status = 'waiting'),
    'patients', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'patient', p.username, 'kind', c.kind, 'fee', c.fee, 'since', c.created_at) order by c.created_at)
                from consults c join profiles p on p.id = c.patient_id where c.doctor_id = me and c.status = 'waiting'), '[]'::jsonb),
    'cases', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'held', c.held, 'reason', c.reason, 'status', c.status, 'fine', c.fine,
                'lawyerKind', c.lawyer_kind, 'lawyer', (select username from profiles where id = c.lawyer_id), 'defence', c.defence,
                'officer', (select username from profiles where id = c.officer_id), 'hearingAt', c.hearing_at, 'verdictAt', c.verdict_at, 'createdAt', c.created_at)
                order by c.created_at desc) from cases c where c.suspect_id = me and (c.status = 'open' or c.verdict_at > now() - interval '7 days')), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'client', p.username, 'held', c.held, 'reason', c.reason, 'defence', c.defence,
                'status', c.status, 'hearingAt', c.hearing_at) order by c.created_at desc)
                from cases c join profiles p on p.id = c.suspect_id where c.lawyer_id = me and (c.status = 'open' or c.verdict_at > now() - interval '7 days')), '[]'::jsonb),
    'arrests', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'suspect', p.username, 'held', c.held, 'status', c.status) order by c.created_at desc)
                from cases c join profiles p on p.id = c.suspect_id where c.officer_id = me and c.created_at > now() - interval '7 days'), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_services() to authenticated;

-- Live updates for patients, doctors, suspects and lawyers.
do $$ begin alter publication supabase_realtime add table public.consults; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.cases; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.illnesses; exception when duplicate_object then null; end $$;
