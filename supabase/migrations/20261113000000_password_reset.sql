-- Forgot password: request a reset link by email or @username, then set a new password with it.
-- The email goes out through Postmark from the database (same setup as email verification: token in Vault
-- 'postmark_server_token', From in app_settings.email). Links are random, stored as a SHA-256 hash, last
-- 1 hour and work once. Requests never reveal whether an account exists. Resetting signs out every other
-- device and counts as verifying the email (the player proved they own the inbox).

create table if not exists public.password_resets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash bytea,
  expires_at timestamptz,
  sent_count int not null default 0,
  sent_day date,
  last_sent_at timestamptz,
  last_request_id bigint,
  used_at timestamptz
);
alter table public.password_resets enable row level security;   -- no client access; functions only

create table if not exists public.reset_attempts (at timestamptz not null default now());
create index if not exists reset_attempts_at on public.reset_attempts (at);
alter table public.reset_attempts enable row level security;

/** Sends one email through Postmark. Returns the pg_net request id. */
create or replace function public.postmark_send(p_to text, p_subject text, p_html text, p_text text, p_tag text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare cfg jsonb := setting('email'); secret text; req bigint;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'postmark_server_token';
  if secret is null then raise exception 'email_not_configured'; end if;
  select net.http_post(
    url := 'https://api.postmarkapp.com/email',
    headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json', 'X-Postmark-Server-Token', secret),
    body := jsonb_build_object('From', cfg ->> 'from', 'To', p_to, 'Subject', p_subject, 'HtmlBody', p_html, 'TextBody', p_text,
      'MessageStream', coalesce(cfg ->> 'stream', 'outbound'), 'Tag', p_tag, 'TrackLinks', 'None')) into req;
  return req;
end $$;
revoke all on function public.postmark_send(text, text, text, text, text) from public, anon, authenticated;

/** Emails a reset link if the email or username belongs to an account. Always returns 'ok' (no account
    probing); quietly does nothing when rate-limited. */
create or replace function public.request_password_reset(p_identifier text) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare ident text := lower(trim(regexp_replace(coalesce(p_identifier, ''), '^@', ''))); uid uuid; addr text; who text;
        r password_resets; token text; link text; html text; req bigint;
begin
  -- A brake on scripted requests: 30 a minute across the app.
  if (select count(*) from reset_attempts where at > now() - interval '1 minute') >= 30 then return 'ok'; end if;
  insert into reset_attempts default values;
  delete from reset_attempts where at < now() - interval '1 hour';

  if ident ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    select u.id, u.email into uid, addr from auth.users u where lower(u.email) = ident;
  else
    select u.id, u.email into uid, addr from profiles p join auth.users u on u.id = p.id where lower(p.username) = ident;
  end if;
  if uid is null or addr is null then return 'ok'; end if;

  select * into r from password_resets where user_id = uid for update;
  if r.last_sent_at > now() - interval '60 seconds' or (r.sent_day = current_date and r.sent_count >= 5) then return 'ok'; end if;

  select coalesce(display_name, username) into who from profiles where id = uid;
  token := encode(gen_random_bytes(32), 'hex');
  link := (setting('email') ->> 'app_url') || '/reset-password?token=' || token;
  html := format($h$
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:22px;margin:0 0 8px">Reset your password%s</h1>
  <p style="font-size:15px;line-height:1.5;color:#334155">Someone (hopefully you) asked to reset the password for your Dubai Life account. Tap the button to choose a new one.</p>
  <p style="margin:24px 0"><a href="%s" style="background:#059669;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#64748b">This link works once, for 1 hour. If you didn't ask for this, ignore this email: your password stays the same.</p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px">Dubai Life · mydubailife.app</p>
</div>$h$, case when who is null then '' else ', ' || who end, link);
  req := public.postmark_send(addr, 'Reset your Dubai Life password', html,
    'Reset your Dubai Life password: ' || link || E'\n\nThis link works once, for 1 hour. If you didn''t ask for this, ignore this email.', 'password-reset');

  insert into password_resets (user_id, token_hash, expires_at, sent_count, sent_day, last_sent_at, last_request_id, used_at)
  values (uid, digest(token, 'sha256'), now() + interval '1 hour', 1, current_date, now(), req, null)
  on conflict (user_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at,
    sent_count = case when password_resets.sent_day = current_date then password_resets.sent_count + 1 else 1 end,
    sent_day = current_date, last_sent_at = now(), last_request_id = req, used_at = null;
  return 'ok';
end $$;
grant execute on function public.request_password_reset(text) to anon, authenticated;

/** Checks a reset link before showing the form. Returns 'ok', 'expired' or 'invalid'. */
create or replace function public.check_password_reset(p_token text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select case when p_token !~ '^[0-9a-f]{64}$' then 'invalid'
    else coalesce((select case when used_at is not null then 'invalid' when expires_at < now() then 'expired' else 'ok' end
                   from password_resets where token_hash = digest(p_token, 'sha256')), 'invalid') end
$$;
grant execute on function public.check_password_reset(text) to anon, authenticated;

/** Sets a new password with a reset link. Returns the account email (so the app can sign straight in). */
create or replace function public.reset_password(p_token text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare r password_resets; addr text;
begin
  if p_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid_link'; end if;
  if char_length(coalesce(p_password, '')) < 8 then raise exception 'weak_password'; end if;
  select * into r from password_resets where token_hash = digest(p_token, 'sha256') for update;
  if r.user_id is null or r.used_at is not null then raise exception 'invalid_link'; end if;
  if r.expires_at < now() then raise exception 'expired_link'; end if;

  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = r.user_id returning email into addr;
  update password_resets set used_at = now(), token_hash = null where user_id = r.user_id;
  -- Every existing session is signed out.
  delete from auth.sessions where user_id = r.user_id;
  -- Opening the link proved they own the inbox.
  insert into email_verifications (user_id, email, verified_at) values (r.user_id, addr, now())
    on conflict (user_id) do update set email = excluded.email, verified_at = coalesce(email_verifications.verified_at, now()), token_hash = null;
  return addr;
end $$;
grant execute on function public.reset_password(text, text) to anon, authenticated;
