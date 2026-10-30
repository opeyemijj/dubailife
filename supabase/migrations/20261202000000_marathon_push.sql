-- A push notification to everyone signed up for the marathon, 15 minutes before the start. Every minute
-- pg_cron looks for a race starting within 15 minutes that hasn't been announced, and calls the app's
-- /api/push/marathon with a secret kept in Vault; the app fetches that race's devices (once only) and sends.
-- The minutes mirror src/data/life/marathon.json → pushMinutes (scripts/check-life-config.mjs).

create table if not exists public.marathon_push_log (
  race timestamptz primary key,
  called_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent int,
  failed int
);
alter table public.marathon_push_log enable row level security;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'marathon_push_secret') then
    perform vault.create_secret(gen_random_uuid()::text, 'marathon_push_secret');
  end if;
end $$;

create or replace function public.marathon_push_tick() returns void
language plpgsql security definer set search_path = public as $$
declare r timestamptz := public.marathon_start(); secret text;
begin
  if now() < r - interval '15 minutes' or now() >= r then return; end if;
  insert into marathon_push_log (race) values (r) on conflict do nothing;
  if not found then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'marathon_push_secret';
  perform net.http_post(
    url := 'https://mydubailife.app/api/push/marathon',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('race', r));
end $$;
revoke all on function public.marathon_push_tick() from public, anon, authenticated;

/** For the app, with the secret: this race's runners' devices, handed over once only. */
create or replace function public.marathon_push_targets(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r timestamptz := public.marathon_start();
begin
  if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'marathon_push_secret') then raise exception 'forbidden'; end if;
  update marathon_push_log set claimed_at = now() where race = r and claimed_at is null;
  if not found then return jsonb_build_object('race', r, 'targets', '[]'::jsonb); end if;
  return jsonb_build_object('race', r, 'targets', coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'bib', e.bib))
    from push_subscriptions s join marathon_entries e on e.user_id = s.user_id and e.race = r), '[]'::jsonb));
end $$;
grant execute on function public.marathon_push_targets(text) to anon, authenticated;

/** The result, and devices the push service says are gone. */
create or replace function public.marathon_push_done(p_secret text, p_race timestamptz, p_sent int, p_failed int, p_gone text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'marathon_push_secret') then raise exception 'forbidden'; end if;
  update marathon_push_log set sent = p_sent, failed = p_failed where race = p_race;
  delete from push_subscriptions where endpoint = any (p_gone);
end $$;
grant execute on function public.marathon_push_done(text, timestamptz, int, int, text[]) to anon, authenticated;

-- A race already inside the window when this is applied has been announced by hand.
insert into public.marathon_push_log (race, claimed_at)
  select public.marathon_start(), now() where now() >= public.marathon_start() - interval '15 minutes' on conflict do nothing;

select cron.schedule('marathon-push', '* * * * *', 'select public.marathon_push_tick()');
