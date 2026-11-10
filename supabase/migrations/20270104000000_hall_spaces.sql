-- Event halls as interactive spaces, like homes (/hall/<booking>): the booking holds the hall's interior
-- (furniture and style, decorated with the home's tools), guests walk in live from the invite, and the host can
-- hire a player interior decorator to do it, exactly as for a home: the budget and fee are held, the decorator
-- walks in and decorates, and finishing writes their work into the booking. Hall jobs never touch the client's
-- home and don't block a home job.

-- Decorator jobs can be for a hall booking (added first: hall_space below reads it).
alter table public.decor_jobs add column if not exists hall_booking bigint references public.hall_bookings (id) on delete cascade;

/** A hall booking's space, for anyone at the event: what it is, when, who's hosting, and how it's decorated. */
create or replace function public.hall_space(p_booking bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'hall', b.hall, 'title', b.title, 'type', b.event_type, 'startsAt', b.starts_at, 'endsAt', b.ends_at,
    'guests', b.guests, 'code', b.invite_code, 'design', b.design, 'isHost', b.host_id = auth.uid(),
    'host', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look'),
    'decorating', (select jsonb_build_object('id', j.id, 'status', j.status, 'decorator', (select username from profiles where id = j.decorator_id))
                   from decor_jobs j where j.hall_booking = b.id and j.status in ('requested', 'working') order by j.created_at desc limit 1))
  from hall_bookings b join profiles p on p.id = b.host_id
  where b.id = p_booking and b.status = 'booked'
$$;
grant execute on function public.hall_space(bigint) to authenticated;

/** The host saves the hall's interior ({furniture, style}). */
create or replace function public.save_hall_space(p_booking bigint, p_design jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_design is null or jsonb_typeof(p_design -> 'furniture') <> 'array' or octet_length(p_design::text) > 200000 then raise exception 'bad_design'; end if;
  update hall_bookings set design = p_design where id = p_booking and host_id = auth.uid() and status = 'booked';
  if not found then raise exception 'not_your_booking'; end if;
end $$;
grant execute on function public.save_hall_space(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------- decorators for halls


/** Hire a decorator for a hall booking: the same budget and fee as for a home, held until they finish. */
create or replace function public.request_hall_decorator(p_decorator uuid, p_booking bigint, p_budget bigint, p_brief text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint; jid bigint; b hall_bookings;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into b from hall_bookings where id = p_booking and host_id = me and status = 'booked';
  if b.id is null then raise exception 'not_your_booking'; end if;
  if b.ends_at < now() then raise exception 'event_over'; end if;
  if p_budget < 1000 or p_budget > 500000 then raise exception 'bad_budget'; end if;
  if exists (select 1 from decor_jobs where hall_booking = p_booking and status in ('requested', 'working')) then raise exception 'already_decorating'; end if;
  if p_decorator is null or p_decorator = me or public.service_of(p_decorator) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
  f := public.fee_of(p_decorator, 'decorator');
  insert into decor_jobs (client_id, decorator_id, studio, tier, fee, costs, status, hall_booking)
    values (me, p_decorator, left(p_brief, 40), 'ballroom', f, p_budget, 'requested', p_booking)
    returning id into jid;
  perform coin_move(me, -p_budget, 'spend', 'Hall decorating budget (held)', 'decor:' || jid);
  if f > 0 then perform coin_move(me, -f, 'spend', 'Decorator fee (held)', 'decor-fee:' || jid); end if;
  return jsonb_build_object('id', jid, 'fee', f);
end $$;
grant execute on function public.request_hall_decorator(uuid, bigint, bigint, text) to authenticated;

/** Home jobs only block home jobs (a hall job is separate). */
create or replace function public.request_decorator(p_decorator uuid, p_tier text, p_budget bigint, p_brief text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint; jid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_budget < 1000 or p_budget > 500000 then raise exception 'bad_budget'; end if;
  if exists (select 1 from decor_jobs where client_id = me and hall_booking is null and not applied and status <> 'cancelled') then raise exception 'already_decorating'; end if;
  if p_decorator is null or p_decorator = me or public.service_of(p_decorator) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
  f := public.fee_of(p_decorator, 'decorator');
  insert into decor_jobs (client_id, decorator_id, studio, tier, fee, costs, status)
    values (me, p_decorator, left(p_brief, 40), left(p_tier, 40), f, p_budget, 'requested')
    returning id into jid;
  perform coin_move(me, -p_budget, 'spend', 'Decorating budget (held)', 'decor:' || jid);
  if f > 0 then perform coin_move(me, -f, 'spend', 'Decorator fee (held)', 'decor-fee:' || jid); end if;
  return jsonb_build_object('id', jid, 'fee', f);
end $$;
grant execute on function public.request_decorator(uuid, text, bigint, text) to authenticated;

/** The client's current home job (hall jobs are shown in the hall, not applied to the home). */
create or replace function public.my_decor() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j decor_jobs;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into j from decor_jobs where client_id = me and hall_booking is null and not applied and status <> 'cancelled' order by created_at desc limit 1 for update;
  if j.id is null then return null; end if;
  return jsonb_build_object('id', j.id, 'studio', j.studio, 'tier', j.tier, 'status', j.status, 'touch', j.touch, 'fallback', j.fallback,
    'readyAt', j.ready_at, 'fee', j.fee, 'createdAt', j.created_at, 'budget', j.costs, 'spent', j.spent, 'plan', j.plan, 'acceptedAt', j.accepted_at,
    'decorator', (select username from profiles where id = j.decorator_id),
    'decoratorLook', (select citizen -> 'look' from profiles where id = j.decorator_id),
    'ready', j.status = 'done' or (j.status = 'working' and j.decorator_id is null and j.ready_at <= now()));
end $$;
grant execute on function public.my_decor() to authenticated;

/** A decorator's requests, now saying which are halls. */
create or replace function public.decor_jobs_for_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'client', p.username, 'clientLook', p.citizen -> 'look', 'studio', j.studio,
    'tier', j.tier, 'fee', j.fee, 'budget', j.costs, 'spent', j.spent, 'status', j.status, 'createdAt', j.created_at,
    'hall', (select jsonb_build_object('title', b.title, 'hall', b.hall, 'startsAt', b.starts_at) from hall_bookings b where b.id = j.hall_booking)) order by j.created_at), '[]'::jsonb)
  from decor_jobs j join profiles p on p.id = j.client_id
  where j.decorator_id = auth.uid() and j.status in ('requested', 'working')
$$;
grant execute on function public.decor_jobs_for_me() to authenticated;

/** The space a decorator works in: the client's home, or the hall booking's interior. */
create or replace function public.decor_home(p_job bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j decor_jobs; c jsonb; who text; hf text; inter jsonb; b hall_bookings;
begin
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working';
  if j.id is null then raise exception 'not_working'; end if;
  select citizen, username into c, who from profiles where id = j.client_id;
  if j.hall_booking is not null then
    select * into b from hall_bookings where id = j.hall_booking;
    return jsonb_build_object('id', j.id, 'client', who, 'tier', 'ballroom', 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
      'furniture', coalesce(b.design -> 'furniture', '[]'::jsonb), 'style', b.design -> 'style', 'hall', jsonb_build_object('title', b.title, 'hall', b.hall));
  end if;
  -- The home's one design, when it has one (else the client's own copy, as before).
  hf := public.home_flat_of(j.client_id);
  if hf is not null then select interior into inter from flats where id = hf; end if;
  if coalesce((inter ->> 'shared')::boolean, false) then
    return jsonb_build_object('id', j.id, 'client', who, 'tier', j.tier, 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
      'furniture', coalesce(inter -> 'furniture', '[]'::jsonb), 'style', inter -> 'style');
  end if;
  return jsonb_build_object('id', j.id, 'client', who, 'tier', j.tier, 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
    'furniture', coalesce(c -> 'furniture', '[]'::jsonb), 'style', c -> 'homeStyle' -> j.tier);
end $$;
grant execute on function public.decor_home(bigint) to authenticated;

/** Finished: a hall's work goes into the booking (a home's into the home), the rest of the budget back, the decorator paid. */
create or replace function public.decor_complete(p_job bigint, p_plan jsonb, p_spent bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare j decor_jobs; who text; hf text;
begin
  if p_plan is null or octet_length(p_plan::text) > 200000 then raise exception 'bad_plan'; end if;
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working' for update;
  if j.id is null then raise exception 'not_working'; end if;
  if p_spent < 0 or p_spent > j.costs then raise exception 'over_budget'; end if;
  update decor_jobs set status = 'done', plan = p_plan, spent = p_spent, ready_at = now(), applied = j.hall_booking is not null where id = j.id;
  if j.hall_booking is not null then
    if jsonb_typeof(p_plan -> 'furniture') = 'array' then
      update hall_bookings set design = jsonb_build_object('furniture', p_plan -> 'furniture', 'style', p_plan -> 'style') where id = j.hall_booking;
    end if;
  else
    -- The decorator's work becomes the home's one design, for everyone who lives there or visits.
    hf := public.home_flat_of(j.client_id);
    if hf is not null and jsonb_typeof(p_plan -> 'furniture') = 'array' then
      update flats set interior = jsonb_build_object('furniture', p_plan -> 'furniture', 'style', p_plan -> 'style', 'shared', true), updated_at = now() where id = hf;
    end if;
  end if;
  if j.costs > p_spent then perform coin_move(j.client_id, j.costs - p_spent, 'refund', 'Decorating budget left over', 'decor-left:' || j.id); end if;
  select username into who from profiles where id = j.client_id;
  if j.fee > 0 then perform coin_move(j.decorator_id, j.fee, 'earn', case when j.hall_booking is not null then 'Decorated @' || who || '''s event hall' else 'Decorated @' || who || '''s home' end, 'decor-paid:' || j.id); end if;
  perform public.add_points(j.decorator_id, 'career', 15, 'decor:' || j.id);
  return j.fee;
end $$;
grant execute on function public.decor_complete(bigint, jsonb, bigint) to authenticated;
