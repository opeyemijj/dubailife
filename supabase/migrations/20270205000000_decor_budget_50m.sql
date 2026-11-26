-- Decorating budgets up to AED 50,000,000 (src/data/home/decorators.json budget.max; checked by
-- scripts/check-life-config.mjs), for homes and event halls alike. Otherwise as in *_hall_spaces.sql.

/** Hire a decorator for a hall booking: the same budget and fee as for a home, held until they finish. */
create or replace function public.request_hall_decorator(p_decorator uuid, p_booking bigint, p_budget bigint, p_brief text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint; jid bigint; b hall_bookings;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into b from hall_bookings where id = p_booking and host_id = me and status = 'booked';
  if b.id is null then raise exception 'not_your_booking'; end if;
  if b.ends_at < now() then raise exception 'event_over'; end if;
  if p_budget < 1000 or p_budget > 50000000 then raise exception 'bad_budget'; end if;
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
  if p_budget < 1000 or p_budget > 50000000 then raise exception 'bad_budget'; end if;
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
