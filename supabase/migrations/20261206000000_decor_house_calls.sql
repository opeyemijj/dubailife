-- Decorators do the work themselves. You send a request with a budget to any player with the Interior decorator job;
-- the budget and their fee are held. They accept (or decline), walk into your home, buy from the store with your
-- budget and arrange things. Their work is saved on the job, not in your home, so you see it all when it's finished;
-- what they didn't spend comes back to you and they're paid. If they take your key and don't finish within 24 hours,
-- you can cancel and get everything back. Numbers mirror src/data/home/decorators.json (scripts/check-life-config.mjs).

alter table public.decor_jobs alter column studio drop not null;
alter table public.decor_jobs add column if not exists spent bigint not null default 0;
alter table public.decor_jobs add column if not exists plan jsonb;

/** Send a request: p_costs in decor_jobs is the budget. p_brief is an optional look from decorators.json. */
create or replace function public.request_decorator(p_decorator uuid, p_tier text, p_budget bigint, p_brief text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint; jid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_budget < 1000 or p_budget > 500000 then raise exception 'bad_budget'; end if;
  if exists (select 1 from decor_jobs where client_id = me and not applied and status <> 'cancelled') then raise exception 'already_decorating'; end if;
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

create or replace function public.my_decor() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j decor_jobs;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into j from decor_jobs where client_id = me and not applied and status <> 'cancelled' order by created_at desc limit 1 for update;
  if j.id is null then return null; end if;
  return jsonb_build_object('id', j.id, 'studio', j.studio, 'tier', j.tier, 'status', j.status, 'touch', j.touch, 'fallback', j.fallback,
    'readyAt', j.ready_at, 'fee', j.fee, 'createdAt', j.created_at, 'budget', j.costs, 'spent', j.spent, 'plan', j.plan, 'acceptedAt', j.accepted_at,
    'decorator', (select username from profiles where id = j.decorator_id),
    'decoratorLook', (select citizen -> 'look' from profiles where id = j.decorator_id),
    'ready', j.status = 'done' or (j.status = 'working' and j.decorator_id is null and j.ready_at <= now()));
end $$;
grant execute on function public.my_decor() to authenticated;

/** You can take it back before they've accepted, or if they've had your key for 24 hours without finishing. */
create or replace function public.cancel_decor(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
declare j decor_jobs;
begin
  select * into j from decor_jobs where id = p_job and client_id = auth.uid() for update;
  if j.id is null or not (j.status = 'requested' or (j.status = 'working' and j.decorator_id is not null and j.accepted_at < now() - interval '24 hours')) then
    raise exception 'not_cancellable';
  end if;
  update decor_jobs set status = 'cancelled' where id = j.id;
  perform coin_move(j.client_id, j.costs + j.fee, 'refund', 'Decorator job cancelled', 'decor-cancel:' || j.id);
end $$;
grant execute on function public.cancel_decor(bigint) to authenticated;

create or replace function public.decor_jobs_for_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'client', p.username, 'clientLook', p.citizen -> 'look', 'studio', j.studio,
    'tier', j.tier, 'fee', j.fee, 'budget', j.costs, 'spent', j.spent, 'status', j.status, 'createdAt', j.created_at) order by j.created_at), '[]'::jsonb)
  from decor_jobs j join profiles p on p.id = j.client_id
  where j.decorator_id = auth.uid() and j.status in ('requested', 'working')
$$;
grant execute on function public.decor_jobs_for_me() to authenticated;

/** Turn a job down: the client gets everything back. */
create or replace function public.decor_decline(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
declare j decor_jobs;
begin
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'requested' for update;
  if j.id is null then raise exception 'not_available'; end if;
  update decor_jobs set status = 'cancelled' where id = j.id;
  perform coin_move(j.client_id, j.costs + j.fee, 'refund', 'Decorator declined the job', 'decor-cancel:' || j.id);
end $$;
grant execute on function public.decor_decline(bigint) to authenticated;

/** The client's home, for the decorator who has their key, and only while the job is on. */
create or replace function public.decor_home(p_job bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j decor_jobs; c jsonb; who text;
begin
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working';
  if j.id is null then raise exception 'not_working'; end if;
  select citizen, username into c, who from profiles where id = j.client_id;
  return jsonb_build_object('id', j.id, 'client', who, 'tier', j.tier, 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
    'furniture', coalesce(c -> 'furniture', '[]'::jsonb), 'style', c -> 'homeStyle' -> j.tier);
end $$;
grant execute on function public.decor_home(bigint) to authenticated;

/** Work in progress, so a decorator can leave and come back. */
create or replace function public.decor_save(p_job bigint, p_plan jsonb, p_spent bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if octet_length(p_plan::text) > 200000 then raise exception 'too_big'; end if;
  update decor_jobs set plan = p_plan, spent = p_spent
    where id = p_job and decorator_id = auth.uid() and status = 'working' and p_spent between 0 and costs;
  if not found then raise exception 'not_working'; end if;
end $$;
grant execute on function public.decor_save(bigint, jsonb, bigint) to authenticated;

/** Finished: the client's home is ready, what's left of the budget goes back, and the decorator is paid. */
create or replace function public.decor_complete(p_job bigint, p_plan jsonb, p_spent bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare j decor_jobs; who text;
begin
  if p_plan is null or octet_length(p_plan::text) > 200000 then raise exception 'bad_plan'; end if;
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working' for update;
  if j.id is null then raise exception 'not_working'; end if;
  if p_spent < 0 or p_spent > j.costs then raise exception 'over_budget'; end if;
  update decor_jobs set status = 'done', plan = p_plan, spent = p_spent, ready_at = now() where id = j.id;
  if j.costs > p_spent then perform coin_move(j.client_id, j.costs - p_spent, 'refund', 'Decorating budget left over', 'decor-left:' || j.id); end if;
  select username into who from profiles where id = j.client_id;
  if j.fee > 0 then perform coin_move(j.decorator_id, j.fee, 'earn', 'Decorated @' || who || '''s home', 'decor-paid:' || j.id); end if;
  perform public.add_points(j.decorator_id, 'career', 15, 'decor:' || j.id);
  return j.fee;
end $$;
grant execute on function public.decor_complete(bigint, jsonb, bigint) to authenticated;
