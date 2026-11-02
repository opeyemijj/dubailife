-- Interior decorators are real players only: a Local studio can no longer be hired. Jobs a Local studio
-- already took finish as before (my_decor and decor_applied still handle them).

create or replace function public.hire_decor(p_decorator uuid, p_studio text, p_tier text, p_costs bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint; jid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if public.decor_touches(p_studio) is null then raise exception 'bad_studio'; end if;
  if p_costs < 0 or p_costs > 500000 then raise exception 'bad_costs'; end if;
  if exists (select 1 from decor_jobs where client_id = me and not applied and status <> 'cancelled') then raise exception 'already_decorating'; end if;
  if p_decorator is null or p_decorator = me or public.service_of(p_decorator) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
  f := public.fee_of(p_decorator, 'decorator');
  insert into decor_jobs (client_id, decorator_id, studio, tier, fee, costs, status)
    values (me, p_decorator, p_studio, left(p_tier, 40), f, p_costs, 'requested')
    returning id into jid;
  if p_costs > 0 then perform coin_move(me, -p_costs, 'spend', 'Interior decorator: finish and pieces', 'decor:' || jid); end if;
  if f > 0 then perform coin_move(me, -f, 'spend', 'Decorator fee (held)', 'decor-fee:' || jid); end if;
  return jsonb_build_object('id', jid, 'fee', f);
end $$;
grant execute on function public.hire_decor(uuid, text, text, bigint) to authenticated;
