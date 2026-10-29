-- Interior decorators: a real job for players. Dubai Design District hires Interior decorators (Job Board,
-- with an interview); they set their own fee (AED 200 to 20,000, default 1,500). At home you choose a look
-- and who does it: a player decorator, or a Local studio. With a player, you pay the finish and pieces up
-- front and their fee is held; they accept your key and finish the job by choosing one of the look's three
-- finishing touches, and the fee is paid to them (+15 career points). If no one picks up your key within 30
-- minutes, a Local takes over (ready 10 minutes later) and the held fee comes back. A Local studio is ready
-- 20 minutes after you hire it. The new look is applied in your home when you're next there.
-- Numbers mirror src/data/home/decorators.json (scripts/check-life-config.mjs).

alter table public.venture_jobs drop constraint if exists venture_jobs_service_check;
alter table public.venture_jobs add constraint venture_jobs_service_check check (service in ('doctor', 'police', 'lawyer', 'decorator'));

with c(name, title, wage, shifts, req, service) as (values
  ('Dubai Design District', 'Interior decorator', 2600, 4, 'none', 'decorator'))
, v as (
  insert into public.ventures (type, name, system)
  select 'system', c.name, true from c where not exists (select 1 from public.ventures x where x.system and x.name = c.name)
  returning id, name)
insert into public.venture_jobs (venture_id, title, weekly_wage, shifts_per_week, requirement, service)
select v.id, c.title, c.wage, c.shifts, c.req, c.service from v join c on c.name = v.name;

insert into public.interview_keys (set_id, answers) values ('Dubai Design District', '{1,0,2}')
on conflict (set_id) do update set answers = excluded.answers;

-- Decorators set their fee like doctors and lawyers.
create or replace function public.fee_limits(p_service text) returns int[]
language sql immutable as $$
  -- {min, max, default}
  select case p_service when 'doctor' then array[50, 5000, 250] when 'lawyer' then array[100, 50000, 1500]
    when 'decorator' then array[200, 20000, 1500] end
$$;

create or replace function public.set_service_fee(p_fee bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); svc text := public.service_of(auth.uid()); lim int[];
begin
  if svc not in ('doctor', 'lawyer', 'decorator') then raise exception 'not_a_professional'; end if;
  lim := public.fee_limits(svc);
  if p_fee < lim[1] or p_fee > lim[2] then raise exception 'fee_out_of_range'; end if;
  insert into service_fees (user_id, fee) values (me, p_fee) on conflict (user_id) do update set fee = excluded.fee;
end $$;
grant execute on function public.set_service_fee(bigint) to authenticated;

/** Each look's three finishing touches (the decorator picks one). */
create or replace function public.decor_touches(p_studio text) returns text[]
language sql immutable as $$
  select case p_studio
    when 'noor-interiors' then array['sculpture', 'vase-pampas', 'rug-runner']
    when 'maison-lumiere' then array['sculpture', 'indoor-palm', 'console']
    when 'nest-and-oak' then array['bookcase', 'orchids', 'side-table']
    when 'noir-studio' then array['indoor-palm', 'orchids', 'console'] end
$$;

create table if not exists public.decor_jobs (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  decorator_id uuid references public.profiles (id) on delete set null,   -- null: a Local studio
  studio text not null,
  tier text not null,
  fee bigint not null default 0,      -- the player decorator's fee, held until they finish
  costs bigint not null,              -- the finish and the pieces, paid when hiring
  status text not null default 'requested' check (status in ('requested', 'working', 'done', 'cancelled')),
  touch text,
  fallback boolean not null default false,
  ready_at timestamptz,
  applied boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists decor_jobs_client on public.decor_jobs (client_id, created_at desc);
create index if not exists decor_jobs_decorator on public.decor_jobs (decorator_id, status);
alter table public.decor_jobs enable row level security;
drop policy if exists "see own decor jobs" on public.decor_jobs;
create policy "see own decor jobs" on public.decor_jobs for select using (auth.uid() in (client_id, decorator_id));

/** Hire a decorator: a player (p_decorator) or a Local studio (null). Pays the finish and pieces now; a
    player's fee is held. Returns {id, fee}. */
create or replace function public.hire_decor(p_decorator uuid, p_studio text, p_tier text, p_costs bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f bigint := 0; jid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if public.decor_touches(p_studio) is null then raise exception 'bad_studio'; end if;
  if p_costs < 0 or p_costs > 500000 then raise exception 'bad_costs'; end if;
  if exists (select 1 from decor_jobs where client_id = me and not applied and status <> 'cancelled') then raise exception 'already_decorating'; end if;
  if p_decorator is not null then
    if p_decorator = me or public.service_of(p_decorator) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
    f := public.fee_of(p_decorator, 'decorator');
  end if;
  insert into decor_jobs (client_id, decorator_id, studio, tier, fee, costs, status, ready_at)
    values (me, p_decorator, p_studio, left(p_tier, 40), f, p_costs,
            case when p_decorator is null then 'working' else 'requested' end,
            case when p_decorator is null then now() + interval '20 minutes' end)
    returning id into jid;
  if p_costs > 0 then perform coin_move(me, -p_costs, 'spend', 'Interior decorator: finish and pieces', 'decor:' || jid); end if;
  if f > 0 then perform coin_move(me, -f, 'spend', 'Decorator fee (held)', 'decor-fee:' || jid); end if;
  return jsonb_build_object('id', jid, 'fee', f);
end $$;
grant execute on function public.hire_decor(uuid, text, text, bigint) to authenticated;

/** Your decorator job (the latest not yet in your home). A player who hasn't picked up your key within 30
    minutes is replaced by a Local, and their held fee comes back. */
create or replace function public.my_decor() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); j decor_jobs;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into j from decor_jobs where client_id = me and not applied and status <> 'cancelled' order by created_at desc limit 1 for update;
  if j.id is null then return null; end if;
  if j.status = 'requested' and j.created_at < now() - interval '30 minutes' then
    if j.fee > 0 then perform coin_move(me, j.fee, 'refund', 'Decorator fee back: a Local took over', 'decor-refund:' || j.id); end if;
    update decor_jobs set decorator_id = null, fee = 0, status = 'working', fallback = true, ready_at = now() + interval '10 minutes'
      where id = j.id returning * into j;
  end if;
  return jsonb_build_object('id', j.id, 'studio', j.studio, 'tier', j.tier, 'status', j.status, 'touch', j.touch, 'fallback', j.fallback,
    'readyAt', j.ready_at, 'fee', j.fee, 'createdAt', j.created_at,
    'decorator', (select username from profiles where id = j.decorator_id),
    'decoratorLook', (select citizen -> 'look' from profiles where id = j.decorator_id),
    'ready', j.status = 'done' or (j.status = 'working' and j.decorator_id is null and j.ready_at <= now()));
end $$;
grant execute on function public.my_decor() to authenticated;

/** The new look is in your home: the job is closed. */
create or replace function public.decor_applied(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update decor_jobs set applied = true, status = 'done'
    where id = p_job and client_id = auth.uid() and (status = 'done' or (status = 'working' and decorator_id is null and ready_at <= now()));
  if not found then raise exception 'not_ready'; end if;
end $$;
grant execute on function public.decor_applied(bigint) to authenticated;

/** Changed your mind before a player picked up the key: everything comes back. */
create or replace function public.cancel_decor(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
declare j decor_jobs;
begin
  select * into j from decor_jobs where id = p_job and client_id = auth.uid() and status = 'requested' for update;
  if j.id is null then raise exception 'not_cancellable'; end if;
  update decor_jobs set status = 'cancelled' where id = j.id;
  perform coin_move(j.client_id, j.costs + j.fee, 'refund', 'Decorator job cancelled', 'decor-cancel:' || j.id);
end $$;
grant execute on function public.cancel_decor(bigint) to authenticated;

-- ---------------------------------------------------------------- the decorator's side

/** Jobs waiting for you or under way, if you're a decorator. */
create or replace function public.decor_jobs_for_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'client', p.username, 'clientLook', p.citizen -> 'look', 'studio', j.studio,
    'tier', j.tier, 'fee', j.fee, 'status', j.status, 'createdAt', j.created_at) order by j.created_at), '[]'::jsonb)
  from decor_jobs j join profiles p on p.id = j.client_id
  where j.decorator_id = auth.uid()
    and ((j.status = 'requested' and j.created_at > now() - interval '30 minutes') or j.status = 'working')
$$;
grant execute on function public.decor_jobs_for_me() to authenticated;

/** Pick up the client's key. */
create or replace function public.decor_accept(p_job bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update decor_jobs set status = 'working', accepted_at = now()
    where id = p_job and decorator_id = auth.uid() and status = 'requested' and created_at > now() - interval '30 minutes';
  if not found then raise exception 'not_available'; end if;
end $$;
grant execute on function public.decor_accept(bigint) to authenticated;

/** Finish the job with your finishing touch: the client's home is ready, and you're paid. */
create or replace function public.decor_finish(p_job bigint, p_touch text) returns bigint
language plpgsql security definer set search_path = public as $$
declare j decor_jobs; who text;
begin
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working' for update;
  if j.id is null then raise exception 'not_working'; end if;
  if not (p_touch = any (public.decor_touches(j.studio))) then raise exception 'bad_touch'; end if;
  update decor_jobs set status = 'done', touch = p_touch, ready_at = now() where id = j.id;
  select username into who from profiles where id = j.client_id;
  if j.fee > 0 then perform coin_move(j.decorator_id, j.fee, 'earn', 'Decorated @' || who || '''s home', 'decor-paid:' || j.id); end if;
  perform public.add_points(j.decorator_id, 'career', 15, 'decor:' || j.id);
  return j.fee;
end $$;
grant execute on function public.decor_finish(bigint, text) to authenticated;
