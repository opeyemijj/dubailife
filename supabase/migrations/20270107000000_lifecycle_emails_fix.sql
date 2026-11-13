-- Lifecycle and retention emails, made to work.
--
-- Before this, none were ever sent: the log table the code writes to didn't exist, there was no "last seen" for a
-- player, the cron looked at the same 30 profiles every hour, only counted renting as having a home, and never sent
-- the welcome series. Now:
--   * profiles.last_seen is kept by the "I'm here" ping the app already sends every minute (written at most every
--     10 minutes);
--   * the database decides who is due which email (lifecycle_due), at most one email per player a day, each kind
--     once per absence (or once ever for the welcome series), never to someone who unsubscribed, and claims them so
--     two runs can't both send;
--   * the website renders the templates and hands them back (lifecycle_send), and the database sends them through
--     Postmark with the same Vault token as the verification email, and logs them;
--   * the hourly job lives in pg_cron and only runs when app_settings 'lifecycle_emails' has enabled: true. It's
--     off until it's switched on.
-- The callers prove who they are with the cron key (its sha-256 is kept in cron_keys, the key itself in Vault as
-- 'lifecycle_cron_key' for the pg_cron job), or are an admin, or the service role.

-- ---------------------------------------------------------------- 0. no secrets in public settings

-- app_settings is readable by everyone; the Postmark token lives in Vault and in the server's environment only.
update public.app_settings set value = value - 'apiKey' where key = 'email_config' and value ? 'apiKey';

insert into public.app_settings (key, value) values ('lifecycle_emails', '{"enabled": false}'::jsonb)
  on conflict (key) do nothing;

-- ---------------------------------------------------------------- 1. last seen

alter table public.profiles add column if not exists last_seen timestamptz;

-- From what we know: when they last signed in, are online now, or their profile last changed (that leans recent,
-- which only ever means one email fewer).
update public.profiles p set last_seen = greatest(p.created_at, p.updated_at, u.last_sign_in_at, o.seen_at)
  from auth.users u left join public.online_now o on o.user_id = u.id
  where u.id = p.id and p.last_seen is null;

-- Anything they did in the game counts as being seen.
update public.profiles p set last_seen = greatest(p.last_seen, a.at)
  from (select user_id, max(created_at) at from (
          select user_id, created_at from public.local_gifts
          union all select user_id, created_at from public.coin_ledger
          union all select user_id, created_at from public.score_events
          union all select user_id, created_at from public.game_results
          union all select user_id, created_at from public.game_messages
          union all select user_id, created_at from public.fun_log
          union all select user_id, created_at from public.friendships
        ) x where user_id is not null group by user_id) a
 where a.user_id = p.id and (p.last_seen is null or a.at > p.last_seen);

create index if not exists profiles_last_seen on public.profiles (last_seen);

create or replace function public.ping_online(p_place text default null, p_preset text default null, p_venue text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); who text;
begin
  if me is null then return; end if;
  select username into who from profiles where id = me;
  if who is null then return; end if;
  insert into online_now (user_id, username, place_id, preset, venue_path, seen_at)
    values (me, who, left(p_place, 80), left(p_preset, 80), left(p_venue, 200), now())
    on conflict (user_id) do update set username = excluded.username, place_id = excluded.place_id, preset = excluded.preset,
      venue_path = excluded.venue_path, seen_at = now();
  update profiles set last_seen = now() where id = me and (last_seen is null or last_seen < now() - interval '10 minutes');
end $$;
revoke execute on function public.ping_online(text, text, text) from public, anon;
grant execute on function public.ping_online(text, text, text) to authenticated;

-- ---------------------------------------------------------------- 2. the log

create table if not exists public.email_campaign_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null,
  campaign_id text not null,
  subject text,
  status text not null default 'sent' check (status in ('queued', 'sent', 'simulated', 'failed', 'skipped')),
  provider text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now()
);
create index if not exists email_campaign_logs_campaign on public.email_campaign_logs (campaign_id, sent_at desc);
create index if not exists email_campaign_logs_user on public.email_campaign_logs (user_id, campaign_id, sent_at desc);
create index if not exists email_campaign_logs_recent on public.email_campaign_logs (sent_at desc);
alter table public.email_campaign_logs enable row level security;
drop policy if exists "admins read email logs" on public.email_campaign_logs;
create policy "admins read email logs" on public.email_campaign_logs for select using (public.is_admin());
drop policy if exists "admins write email logs" on public.email_campaign_logs;
create policy "admins write email logs" on public.email_campaign_logs for insert with check (public.is_admin());

-- ---------------------------------------------------------------- 3. unsubscribing

create table if not exists public.email_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unsub_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  opted_out_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.email_prefs enable row level security;
drop policy if exists "see own email prefs" on public.email_prefs;
create policy "see own email prefs" on public.email_prefs for select using (user_id = auth.uid());

/** The link at the bottom of every lifecycle email. Returns true if that token was found. */
create or replace function public.email_unsubscribe(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update email_prefs set opted_out_at = coalesce(opted_out_at, now()), updated_at = now() where unsub_token = p_token;
  return found;
end $$;
revoke all on function public.email_unsubscribe(text) from public;
grant execute on function public.email_unsubscribe(text) to anon, authenticated;

/** Signed in: turn the reminder emails off or back on. */
create or replace function public.set_email_reminders(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into email_prefs (user_id, opted_out_at) values (auth.uid(), case when p_on then null else now() end)
    on conflict (user_id) do update set opted_out_at = case when p_on then null else coalesce(email_prefs.opted_out_at, now()) end, updated_at = now();
end $$;
revoke all on function public.set_email_reminders(boolean) from public, anon;
grant execute on function public.set_email_reminders(boolean) to authenticated;

-- ---------------------------------------------------------------- 4. who may run it

create table if not exists public.cron_keys (
  name text primary key,
  hash bytea not null
);
alter table public.cron_keys enable row level security;
-- No policies: only the functions here read it.

create or replace function public.lifecycle_key_ok(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(auth.role() = 'service_role', false)
      or public.is_admin()
      or exists (select 1 from cron_keys where name = 'lifecycle' and hash = digest(coalesce(p_key, ''), 'sha256'))
$$;
revoke all on function public.lifecycle_key_ok(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. who's due what

/**
 * The players due an email now, at most one each, most urgent first:
 *   incomplete_signup  joined 2 hours to 7 days ago and has no home yet (own, rented, roommate, partner's or
 *                      starter); once ever
 *   inactive_7d        last seen 7 to 30 days ago (after 30 days we stop); once per absence
 *   inactive_3d        last seen 3 to 7 days ago; once per absence
 *   drip_day1/3/6/10/14  has a home, N to N+2 days since joining, seen in the last 3 days; each once ever
 * Never: someone who unsubscribed, a test address, or anyone emailed in the last 20 hours. p_campaigns is the
 * kinds switched on in the back office. With p_dry false the rows are claimed (logged as 'queued') and the
 * unsubscribe tokens made, so a second run can't pick the same people.
 */
create or replace function public.lifecycle_due(p_key text, p_campaigns text[], p_limit int default 50, p_dry boolean default true)
returns table (log_id uuid, user_id uuid, email text, username text, display_name text, campaign_id text, unsub_token text)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
begin
  if not lifecycle_key_ok(p_key) then raise exception 'not_allowed'; end if;
  if not p_dry then
    if not coalesce((setting('lifecycle_emails') ->> 'enabled')::boolean, false) then return; end if;
    -- One run at a time.
    if not pg_try_advisory_xact_lock(hashtext('lifecycle_emails')) then return; end if;
    -- Claimed but never handed back (the website failed half way): let them go.
    update email_campaign_logs l set status = 'failed', metadata = l.metadata || '{"error": "not sent within an hour"}'::jsonb
      where l.status = 'queued' and l.sent_at < now() - interval '1 hour';
  end if;

  return query
  with people as (
    select p.id, p.username, p.display_name, u.email, p.created_at,
           coalesce(p.last_seen, p.created_at) as seen,
           ( public.has_home(p.id)
             or coalesce(p.citizen ->> 'home', '') <> ''
             or exists (select 1 from household_members h where h.user_id = p.id)
             or exists (select 1 from couple_homes c join relationships r on r.id = c.relationship_id
                        where r.status <> 'ended' and p.id in (r.man_id, r.woman_id)) ) as housed
      from profiles p
      join auth.users u on u.id = p.id
     where u.email is not null and u.email like '%@%.%'
       and u.email not ilike '%.test' and u.email not ilike '%@example.%'
       and not exists (select 1 from email_prefs e where e.user_id = p.id and e.opted_out_at is not null)
       and not exists (select 1 from email_campaign_logs l where l.user_id = p.id and l.status in ('queued', 'sent')
                        and l.sent_at > now() - interval '20 hours')
  ),
  sent as (
    select l.user_id, l.campaign_id, max(l.sent_at) as last_at
      from email_campaign_logs l where l.status in ('queued', 'sent') group by 1, 2
  ),
  pick as (
    select pe.*,
      case
        when not pe.housed and pe.created_at between now() - interval '7 days' and now() - interval '2 hours'
             and not exists (select 1 from sent s where s.user_id = pe.id and s.campaign_id = 'incomplete_signup')
          then 'incomplete_signup'
        when pe.seen between now() - interval '30 days' and now() - interval '7 days'
             and not exists (select 1 from sent s where s.user_id = pe.id and s.campaign_id = 'inactive_7d' and s.last_at > pe.seen)
          then 'inactive_7d'
        when pe.seen between now() - interval '7 days' and now() - interval '3 days'
             and not exists (select 1 from sent s where s.user_id = pe.id and s.campaign_id in ('inactive_3d', 'inactive_7d') and s.last_at > pe.seen)
          then 'inactive_3d'
        when pe.housed and pe.seen > now() - interval '3 days' then (
          select 'drip_day' || d from unnest(array[14, 10, 6, 3, 1]) d
           where pe.created_at between now() - make_interval(days => d + 2) and now() - make_interval(days => d)
             and not exists (select 1 from sent s where s.user_id = pe.id and s.campaign_id = 'drip_day' || d)
           limit 1)
      end as campaign
      from people pe
  ),
  chosen as (
    select pk.id, pk.email, pk.username, pk.display_name, pk.campaign
      from pick pk
     where pk.campaign is not null and pk.campaign = any (p_campaigns)
     order by array_position(array['incomplete_signup', 'inactive_7d', 'inactive_3d', 'drip_day1', 'drip_day3', 'drip_day6', 'drip_day10', 'drip_day14'], pk.campaign),
              pk.seen desc
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  ),
  prefs as (
    insert into email_prefs (user_id) select c.id from chosen c where not p_dry
      on conflict (user_id) do update set updated_at = email_prefs.updated_at
      returning email_prefs.user_id, email_prefs.unsub_token
  ),
  claimed as (
    insert into email_campaign_logs (user_id, email, campaign_id, status, provider)
      select c.id, c.email, c.campaign, 'queued', 'postmark' from chosen c where not p_dry
      returning email_campaign_logs.id, email_campaign_logs.user_id
  )
  select cl.id, c.id, c.email::text, c.username::text, c.display_name::text, c.campaign::text, pr.unsub_token::text
    from chosen c
    left join claimed cl on cl.user_id = c.id
    left join prefs pr on pr.user_id = c.id;
end $$;
revoke all on function public.lifecycle_due(text, text[], int, boolean) from public;
grant execute on function public.lifecycle_due(text, text[], int, boolean) to anon, authenticated, service_role;

/**
 * Sends the claimed emails the website rendered: [{logId, subject, html, text, unsubscribeUrl}]. Each goes through
 * Postmark (Vault token, the app's From) and its log row becomes 'sent'. Returns how many went.
 */
create or replace function public.lifecycle_send(p_key text, p_items jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  it jsonb; l email_campaign_logs; cfg jsonb := setting('email'); secret text; req bigint; n int := 0; reply text;
begin
  if not lifecycle_key_ok(p_key) then raise exception 'not_allowed'; end if;
  if not coalesce((setting('lifecycle_emails') ->> 'enabled')::boolean, false) then raise exception 'lifecycle_disabled'; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'postmark_server_token';
  if secret is null then raise exception 'email_not_configured'; end if;
  reply := coalesce(nullif(setting('email_config') ->> 'replyTo', ''), 'support@mydubailife.app');

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select * into l from email_campaign_logs where id = (it ->> 'logId')::uuid and status = 'queued' for update;
    if l.id is null then continue; end if;
    if coalesce(it ->> 'html', '') = '' or coalesce(it ->> 'subject', '') = '' then
      update email_campaign_logs set status = 'failed', metadata = metadata || '{"error": "nothing to send"}'::jsonb where id = l.id;
      continue;
    end if;
    select net.http_post(
      url := 'https://api.postmarkapp.com/email',
      headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json', 'X-Postmark-Server-Token', secret),
      body := jsonb_build_object(
        'From', cfg ->> 'from', 'To', l.email, 'ReplyTo', reply,
        'Subject', left(it ->> 'subject', 200), 'HtmlBody', it ->> 'html', 'TextBody', coalesce(it ->> 'text', ''),
        'MessageStream', coalesce(cfg ->> 'stream', 'outbound'), 'Tag', l.campaign_id, 'TrackLinks', 'None',
        'Headers', case when coalesce(it ->> 'unsubscribeUrl', '') <> ''
                        then jsonb_build_array(jsonb_build_object('Name', 'List-Unsubscribe', 'Value', '<' || (it ->> 'unsubscribeUrl') || '>'))
                        else '[]'::jsonb end)
    ) into req;
    update email_campaign_logs set status = 'sent', subject = left(it ->> 'subject', 200), provider = 'postmark',
           provider_message_id = 'pg_net:' || req, sent_at = now()
     where id = l.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.lifecycle_send(text, jsonb) from public;
grant execute on function public.lifecycle_send(text, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- 6. every hour

/** pg_cron: asks the website to run the emails (it has the templates), only while they're switched on. */
create or replace function public.lifecycle_tick() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare key text; base text := coalesce(setting('lifecycle_emails') ->> 'url', 'https://www.mydubailife.app');
begin
  if not coalesce((setting('lifecycle_emails') ->> 'enabled')::boolean, false) then return; end if;
  select decrypted_secret into key from vault.decrypted_secrets where name = 'lifecycle_cron_key';
  if key is null then return; end if;
  perform net.http_get(url := base || '/api/cron/lifecycle-emails',
                       headers := jsonb_build_object('x-cron-secret', key), timeout_milliseconds := 60000);
end $$;
revoke all on function public.lifecycle_tick() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('lifecycle-emails');
exception when others then null;
end $$;
-- 10:05, 11:05 … Dubai time; quiet overnight (no emails 23:00–08:00 in Dubai = 19:00–04:00 UTC).
select cron.schedule('lifecycle-emails', '5 4-18 * * *', $$select public.lifecycle_tick()$$);
