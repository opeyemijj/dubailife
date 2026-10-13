-- Locals: Dubai Life's hosts. They're simulated on each phone (not accounts, never counted as
-- citizens) and clearly labelled "Local" in the game. What they hand out is real virtual AED, so it
-- goes through the ledger: each Local has a purse of 1,000,000 AED, topped back up every night, and
-- every citizen can only receive so much (a welcome gift once, a daily gift, and a few rewards a day
-- for following a Local to another venue).

create table if not exists public.local_purses (
  local_id text primary key check (local_id ~ '^local:[a-z0-9]{1,8}$'),
  balance bigint not null default 1000000 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.local_purses enable row level security;
drop policy if exists "admins read purses" on public.local_purses;
create policy "admins read purses" on public.local_purses for select using (public.is_admin());

create table if not exists public.local_gifts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_id text not null,
  kind text not null check (kind in ('welcome', 'daily', 'hop')),
  ref text,
  amount bigint not null,
  day date not null default (now() at time zone 'Asia/Dubai')::date,
  created_at timestamptz not null default now()
);
create unique index if not exists local_gifts_welcome on public.local_gifts (user_id) where kind = 'welcome';
create unique index if not exists local_gifts_daily on public.local_gifts (user_id, day) where kind = 'daily';
create unique index if not exists local_gifts_hop on public.local_gifts (user_id, day, ref) where kind = 'hop';
create index if not exists local_gifts_user_day on public.local_gifts (user_id, day);
alter table public.local_gifts enable row level security;
drop policy if exists "own gifts" on public.local_gifts;
create policy "own gifts" on public.local_gifts for select using (user_id = auth.uid() or public.is_admin());

-- Which gifts I can still get today.
create or replace function public.local_gift_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'welcome', exists (select 1 from local_gifts where user_id = auth.uid() and kind = 'welcome'),
    'daily', exists (select 1 from local_gifts where user_id = auth.uid() and kind = 'daily' and day = (now() at time zone 'Asia/Dubai')::date),
    'hops', (select count(*) from local_gifts where user_id = auth.uid() and kind = 'hop' and day = (now() at time zone 'Asia/Dubai')::date)
  );
$$;
grant execute on function public.local_gift_status() to authenticated;

-- A Local gives me AED. Amounts are fixed here, not by the caller.
create or replace function public.claim_local_gift(p_local text, p_kind text, p_ref text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_amount bigint := case p_kind when 'welcome' then 100000 when 'daily' then 25000 when 'hop' then 10000 end;
  v_name text := split_part(p_local, ':', 2);
  v_left bigint;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if v_amount is null then raise exception 'bad_kind'; end if;
  if p_local !~ '^local:[a-z0-9]{1,8}$' then raise exception 'bad_local'; end if;
  if p_kind = 'hop' then
    if p_ref is null or length(p_ref) > 120 then raise exception 'bad_ref'; end if;
    if (select count(*) from local_gifts where user_id = v_user and kind = 'hop' and day = (now() at time zone 'Asia/Dubai')::date) >= 5 then
      raise exception 'hop_limit';
    end if;
  end if;
  -- Throws on a repeat (unique indexes), so each gift is given once.
  insert into local_gifts (user_id, local_id, kind, ref, amount) values (v_user, p_local, p_kind, case when p_kind = 'hop' then p_ref end, v_amount);
  insert into local_purses (local_id) values (p_local) on conflict (local_id) do nothing;
  update local_purses set balance = balance - v_amount, updated_at = now() where local_id = p_local and balance >= v_amount returning balance into v_left;
  if v_left is null then raise exception 'local_out'; end if;
  return coin_move(v_user, v_amount, 'grant',
    case p_kind when 'welcome' then 'Welcome gift from a Local' when 'daily' then 'Daily gift from a Local' else 'Reward for following a Local' end,
    p_local);
end $$;
grant execute on function public.claim_local_gift(text, text, text) to authenticated;

-- Every night the purses are full again.
create or replace function public.refill_local_purses() returns void
language sql security definer set search_path = public as $$
  update local_purses set balance = 1000000, updated_at = now() where balance < 1000000;
$$;
revoke all on function public.refill_local_purses() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('refill-local-purses') where exists (select 1 from cron.job where jobname = 'refill-local-purses');
  perform cron.schedule('refill-local-purses', '0 20 * * *', 'select public.refill_local_purses()');
end $$;
