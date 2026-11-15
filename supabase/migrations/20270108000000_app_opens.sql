-- Which phone apps people open, so the phone's home screen can put the most used first
-- (src/lib/phoneOrder.ts). One row per player, app and Dubai day, counting opens.

create table if not exists public.app_opens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  app text not null check (app ~ '^[a-z0-9:_-]{1,40}$'),
  day date not null default (now() at time zone 'Asia/Dubai')::date,
  n int not null default 1,
  primary key (user_id, app, day)
);
create index if not exists app_opens_day on public.app_opens (day);
alter table public.app_opens enable row level security;
-- Only through the functions below.

/** "I opened this app." At most 50 a day per app counted, so nobody can push one up the list. */
create or replace function public.log_app_open(p_app text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_app !~ '^[a-z0-9:_-]{1,40}$' then return; end if;
  insert into app_opens (user_id, app) values (auth.uid(), p_app)
    on conflict (user_id, app, day) do update set n = least(app_opens.n + 1, 50);
end $$;
revoke all on function public.log_app_open(text) from public, anon;
grant execute on function public.log_app_open(text) to authenticated;

/** How much each app was used in the last 14 days, across everyone: players who opened it (weighs most) and opens. */
create or replace function public.app_popularity() returns table (app text, players bigint, opens bigint)
language sql stable security definer set search_path = public as $$
  select o.app, count(distinct o.user_id), sum(o.n)
    from app_opens o
   where o.day > (now() at time zone 'Asia/Dubai')::date - 14
   group by o.app
$$;
revoke all on function public.app_popularity() from public, anon;
grant execute on function public.app_popularity() to authenticated;

-- Old rows go after 60 days (folded into the existing nightly tidy-up job's time).
do $$ begin
  perform cron.unschedule('app-opens-tidy');
exception when others then null;
end $$;
select cron.schedule('app-opens-tidy', '40 3 * * *', $$delete from public.app_opens where day < (now() at time zone 'Asia/Dubai')::date - 60$$);
