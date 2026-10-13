-- Operations: real visit counts, message read receipts, username sign-in, admin citizen tools,
-- and scheduled clean-up of stale data.

-- ---------------------------------------------------------------- site visits

create table if not exists public.site_stats (
  day date primary key default current_date,
  visits int not null default 0
);
alter table public.site_stats enable row level security;

create or replace function public.track_site_visit() returns void
language sql security definer set search_path = public as $$
  insert into site_stats (day, visits) values (current_date, 1)
  on conflict (day) do update set visits = site_stats.visits + 1;
$$;
grant execute on function public.track_site_visit() to anon, authenticated;

create or replace function public.site_visits_total() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(visits), 0) from site_stats;
$$;
grant execute on function public.site_visits_total() to anon, authenticated;

-- ---------------------------------------------------------------- message read receipts

alter table public.messages add column if not exists read_at timestamptz;
create index if not exists messages_unread_idx on public.messages (to_id) where read_at is null;

-- Marks everything someone sent me as read.
create or replace function public.mark_messages_read(p_from uuid) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now() where to_id = auth.uid() and from_id = p_from and read_at is null;
$$;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- Unread counts per sender (this week).
create or replace function public.unread_messages() returns table (from_id uuid, n int)
language sql stable security definer set search_path = public as $$
  select from_id, count(*)::int from messages
  where to_id = auth.uid() and read_at is null and created_at > now() - interval '7 days'
  group by from_id;
$$;
grant execute on function public.unread_messages() to authenticated;

-- ---------------------------------------------------------------- sign in with @username

-- Failed attempts, to slow down password guessing through this route.
create table if not exists public.login_attempts (
  username text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts (username, at);
alter table public.login_attempts enable row level security;

-- Returns the account email for a username only when the password is right, so the client can
-- then sign in normally. Never reveals whether a username exists.
create or replace function public.email_for_login(p_username text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  u text := lower(regexp_replace(trim(p_username), '^@', ''));
  em text;
  hash text;
begin
  if (select count(*) from login_attempts where username = u and at > now() - interval '15 minutes') >= 10 then
    raise exception 'too_many_attempts';
  end if;
  select au.email, au.encrypted_password into em, hash
  from profiles p join auth.users au on au.id = p.id
  where lower(p.username) = u;
  if em is null or hash is null or crypt(p_password, hash) <> hash then
    insert into login_attempts (username) values (u);
    return null;
  end if;
  return em;
end $$;
grant execute on function public.email_for_login(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- admin: citizens

create or replace function public.admin_list_citizens(p_query text default null, p_limit int default 100)
returns table (id uuid, username text, display_name text, email text, balance bigint, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin();
  return query
    select p.id, p.username, p.display_name, au.email::text, p.balance, p.created_at, au.last_sign_in_at
    from profiles p join auth.users au on au.id = p.id
    where p_query is null or p_query = ''
       or p.username ilike '%' || p_query || '%' or p.display_name ilike '%' || p_query || '%' or au.email ilike '%' || p_query || '%'
    order by p.created_at desc
    limit least(coalesce(p_limit, 100), 500);
end $$;
grant execute on function public.admin_list_citizens(text, int) to authenticated;

-- Deletes a citizen completely (for testing and account removal). Their homes go back on the
-- market; payments and transfers they were part of are removed with them.
create or replace function public.admin_delete_citizen(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  perform require_admin(array['super_admin']);
  if exists (select 1 from admins where user_id = p_user) then raise exception 'cannot_delete_admin'; end if;
  select username into who from profiles where id = p_user;
  update flats set owner_id = null, tenant_id = null, interior = '{}'::jsonb,
    listing = case when rent_price is not null then 'rent' else 'sale' end
  where owner_id = p_user or tenant_id = p_user;
  delete from auth.users where id = p_user;
  perform log_audit('citizen.delete', p_user::text, jsonb_build_object('username', who));
end $$;
grant execute on function public.admin_delete_citizen(uuid) to authenticated;

-- ---------------------------------------------------------------- stale data clean-up (daily)

create or replace function public.purge_stale_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from entry_requests where created_at < now() - interval '30 days';
  delete from login_attempts where at < now() - interval '1 day';
  delete from ad_campaigns where status in ('cancelled', 'rejected') and created_at < now() - interval '90 days'
    and not exists (select 1 from payments p where p.ref = ad_campaigns.id::text and p.status in ('paid', 'refunded'));
  delete from payments where status in ('requires_payment', 'cancelled', 'failed') and created_at < now() - interval '30 days';
  delete from venue_stats where day < current_date - 400;
  delete from site_stats where day < current_date - 800;
  delete from idea_votes v using ideas i where v.idea_id = i.id and i.hidden and i.updated_at < now() - interval '90 days';
  delete from ideas where hidden and updated_at < now() - interval '90 days';
  delete from audit_log where created_at < now() - interval '2 years';
end $$;
select cron.unschedule('purge-stale-data') where exists (select 1 from cron.job where jobname = 'purge-stale-data');
select cron.schedule('purge-stale-data', '30 3 * * *', 'select public.purge_stale_data()');
