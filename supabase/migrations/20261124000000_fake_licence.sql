-- Renting a car with a fake driving licence. Without a licence, a rental counter will look at a fake one;
-- usually the agent spots it and calls Dubai Police (75%): you're arrested on the spot, held in custody
-- for 3 hours (a lawyer gets you out on bail straight away), and the court rules within 24 hours. Guilty:
-- an AED 25,000 fine; cleared: nothing. If the fake isn't spotted the car is yours for the rental, but
-- the agent may still report it later (it's checked when you return the car). The arrest is a real case
-- in the existing police and courts system (Dubai Police app), with a player officer if one is on duty.
-- Numbers mirror src/data/cars/cars.json → fakeLicence (checked by scripts/check-life-config.mjs).

alter table public.cases add column if not exists kind text not null default 'transfer' check (kind in ('transfer', 'fake_licence'));
alter table public.cases add column if not exists jail_until timestamptz;
alter table public.car_rentals add column if not exists fake boolean not null default false;

/** Try to rent with a fake licence. Returns what happened: {caught, caseId} or {caught: false, rentalId}. */
create or replace function public.rent_car_fake(p_company text, p_car text, p_days int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); daily int := (public.car_price(p_car))[2]; cost bigint; rid bigint; cid bigint; officer uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if public.has_licence(me) then raise exception 'has_licence'; end if;
  if public.car_offered(p_company, p_car) is distinct from 'rent' then raise exception 'not_offered'; end if;
  if p_days not in (1, 7, 30) then raise exception 'bad_days'; end if;
  if exists (select 1 from cases where suspect_id = me and status = 'open') then raise exception 'already_charged'; end if;
  if exists (select 1 from car_rentals where user_id = me and returned_at is null and ends_at > now()) then raise exception 'already_renting'; end if;
  if random() < 0.75 then
    select s.user_id into officer from venture_staff s join venture_jobs j on j.id = s.job_id where j.service = 'police' and s.user_id <> me order by random() limit 1;
    insert into cases (suspect_id, officer_id, held, reason, kind, jail_until)
      values (me, officer, 0, 'Tried to rent a car with a fake driving licence', 'fake_licence', now() + interval '3 hours') returning id into cid;
    return jsonb_build_object('caught', true, 'caseId', cid);
  end if;
  cost := round(daily * p_days * case p_days when 7 then 0.85 when 30 then 0.65 else 1 end);
  insert into car_rentals (user_id, car, company, days, cost, deposit, ends_at, fake) values (me, p_car, p_company, p_days, cost, 1500, now() + make_interval(days => p_days), true) returning id into rid;
  perform coin_move(me, -(cost + 1500), 'spend', 'Car rental and deposit', 'rental:' || rid);
  return jsonb_build_object('caught', false, 'rentalId', rid);
end $$;
grant execute on function public.rent_car_fake(text, text, int) to authenticated;

/** Returning a car: the deposit comes back, unless it was rented on a fake licence and that's now noticed. */
drop function if exists public.return_car();
create or replace function public.return_car() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r car_rentals; cid bigint;
begin
  select * into r from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1 for update;
  if r.id is null then raise exception 'no_rental'; end if;
  update car_rentals set returned_at = now() where id = r.id;
  if r.fake and random() < 0.5 then
    insert into cases (suspect_id, held, reason, kind, jail_until)
      values (r.user_id, r.deposit, 'Rented a car with a fake driving licence (found on return)', 'fake_licence', now() + interval '3 hours') returning id into cid;
    return jsonb_build_object('caught', true, 'caseId', cid);
  end if;
  perform coin_move(r.user_id, r.deposit, 'refund', 'Rental deposit returned', 'deposit:' || r.id);
  return jsonb_build_object('caught', false);
end $$;
grant execute on function public.return_car() to authenticated;


/** The judge. Transfer cases as before; a fake licence: cleared, or guilty with an AED 25,000 fine. */
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
    v_fine := least(bal, case when c.kind = 'fake_licence' then 25000 else c.held * 10 / 100 end);
    if v_fine > 0 then perform coin_move(c.suspect_id, -v_fine, 'spend', 'Court fine', 'fine:' || c.id); end if;
    if c.officer_id is not null then perform coin_move(c.officer_id, 500, 'earn', 'Arrest bounty', 'bounty:' || c.id); end if;
    update cases set status = 'guilty', fine = v_fine, verdict_at = now() where id = c.id returning * into c;
  end if;
  return c;
end $$;
revoke all on function public.judge_case(bigint) from public, anon, authenticated;

/** Pay bail to leave custody early (AED 5,000); the case still goes to court. */
create or replace function public.pay_bail(p_case bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  select * into c from cases where id = p_case and suspect_id = auth.uid() and status = 'open' and jail_until > now() for update;
  if c.id is null then raise exception 'not_in_custody'; end if;
  perform coin_move(c.suspect_id, -5000, 'spend', 'Bail', 'bail:' || c.id);
  update cases set jail_until = now() where id = c.id;
end $$;
grant execute on function public.pay_bail(bigint) to authenticated;

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
  -- A lawyer gets you out on bail: custody ends as soon as one takes the case.
  update cases set jail_until = least(jail_until, now()) where id = c.id and jail_until is not null;
end $$;
grant execute on function public.hire_lawyer(bigint, text, uuid) to authenticated;

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
                'officer', (select username from profiles where id = c.officer_id), 'hearingAt', c.hearing_at, 'verdictAt', c.verdict_at, 'createdAt', c.created_at,
                'kind', c.kind, 'jailUntil', c.jail_until)
                order by c.created_at desc) from cases c where c.suspect_id = me and (c.status = 'open' or c.verdict_at > now() - interval '7 days')), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'client', p.username, 'held', c.held, 'reason', c.reason, 'defence', c.defence,
                'status', c.status, 'hearingAt', c.hearing_at) order by c.created_at desc)
                from cases c join profiles p on p.id = c.suspect_id where c.lawyer_id = me and (c.status = 'open' or c.verdict_at > now() - interval '7 days')), '[]'::jsonb),
    'arrests', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'suspect', p.username, 'held', c.held, 'status', c.status) order by c.created_at desc)
                from cases c join profiles p on p.id = c.suspect_id where c.officer_id = me and c.created_at > now() - interval '7 days'), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_services() to authenticated;
