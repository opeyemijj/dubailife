-- Email verification via Postmark. Sign-up stays instant (players start playing right away); a verification
-- link is emailed and a verified email is required for tournament prizes and invite rewards.
--
-- The database sends the email itself with pg_net, so the Postmark token never reaches the browser or the
-- repo: it lives in Supabase Vault under the name 'postmark_server_token' (set once, outside migrations):
--   select vault.create_secret('<server token>', 'postmark_server_token', 'Postmark server API token');
-- Links carry a random token; only its SHA-256 hash is stored. One row per player.

create extension if not exists pg_net with schema extensions;

insert into public.app_settings (key, value) values ('email', jsonb_build_object(
  'from', 'Dubai Life <noreply@mydubailife.app>',
  'app_url', 'https://cometodubai.app',
  'stream', 'outbound'))
on conflict (key) do nothing;

create table if not exists public.email_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  token_hash bytea,
  expires_at timestamptz,
  sent_count int not null default 0,      -- today's sends (reset daily)
  sent_day date,
  last_sent_at timestamptz,
  last_request_id bigint,                 -- pg_net request, for checking delivery
  verified_at timestamptz
);
alter table public.email_verifications enable row level security;
drop policy if exists "see own verification" on public.email_verifications;
create policy "see own verification" on public.email_verifications for select using (user_id = auth.uid());

create or replace function public.email_verified(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from email_verifications v join auth.users u on u.id = v.user_id
                 where v.user_id = p_user and v.verified_at is not null and lower(v.email) = lower(u.email))
$$;
revoke all on function public.email_verified(uuid) from public, anon;
grant execute on function public.email_verified(uuid) to authenticated;

/** Emails a fresh verification link. Returns 'sent', 'already_verified', 'too_soon' or 'daily_limit'. */
create or replace function public.send_verification_email() returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  uid uuid := auth.uid(); addr text; who text; v email_verifications; cfg jsonb := setting('email');
  token text; link text; secret text; req bigint; html text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select u.email, coalesce(p.display_name, u.raw_user_meta_data ->> 'display_name', 'there') into addr, who
    from auth.users u left join profiles p on p.id = u.id where u.id = uid;
  if addr is null then raise exception 'no_email'; end if;
  if public.email_verified(uid) then return 'already_verified'; end if;

  select * into v from email_verifications where user_id = uid for update;
  if v.last_sent_at > now() - interval '60 seconds' then return 'too_soon'; end if;
  if v.sent_day = current_date and v.sent_count >= 5 then return 'daily_limit'; end if;

  select decrypted_secret into secret from vault.decrypted_secrets where name = 'postmark_server_token';
  if secret is null then raise exception 'email_not_configured'; end if;

  token := encode(gen_random_bytes(32), 'hex');
  link := (cfg ->> 'app_url') || '/verify-email?token=' || token;
  html := format($h$
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:22px;margin:0 0 8px">Confirm your email, %s</h1>
  <p style="font-size:15px;line-height:1.5;color:#334155">Tap the button to verify your email for Dubai Life. It keeps your account safe and makes you eligible for tournament prizes and invite rewards.</p>
  <p style="margin:24px 0"><a href="%s" style="background:#059669;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">Verify my email</a></p>
  <p style="font-size:13px;color:#64748b">This link works for 24 hours. If you didn't sign up for Dubai Life, you can ignore this email.</p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px">Dubai Life · cometodubai.app · a game for players aged 21+</p>
</div>$h$, who, link);

  select net.http_post(
    url := 'https://api.postmarkapp.com/email',
    headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json', 'X-Postmark-Server-Token', secret),
    body := jsonb_build_object(
      'From', cfg ->> 'from', 'To', addr, 'Subject', 'Confirm your email for Dubai Life',
      'HtmlBody', html,
      'TextBody', 'Confirm your email for Dubai Life: ' || link || E'\n\nThis link works for 24 hours.',
      'MessageStream', coalesce(cfg ->> 'stream', 'outbound'), 'Tag', 'verify-email', 'TrackLinks', 'None')
  ) into req;

  insert into email_verifications (user_id, email, token_hash, expires_at, sent_count, sent_day, last_sent_at, last_request_id)
  values (uid, addr, digest(token, 'sha256'), now() + interval '24 hours', 1, current_date, now(), req)
  on conflict (user_id) do update set email = excluded.email, token_hash = excluded.token_hash, expires_at = excluded.expires_at,
    sent_count = case when email_verifications.sent_day = current_date then email_verifications.sent_count + 1 else 1 end,
    sent_day = current_date, last_sent_at = now(), last_request_id = req, verified_at = null;
  return 'sent';
end $$;
revoke all on function public.send_verification_email() from public, anon;
grant execute on function public.send_verification_email() to authenticated;

/** Opens a verification link (works signed in or not, on any device). Returns the username, or raises. */
create or replace function public.verify_email(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v email_verifications; uname text;
begin
  if p_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid_link'; end if;
  select * into v from email_verifications where token_hash = digest(p_token, 'sha256') for update;
  if v.user_id is null then raise exception 'invalid_link'; end if;
  if v.verified_at is null then
    if v.expires_at < now() then raise exception 'expired_link'; end if;
    update email_verifications set verified_at = now(), token_hash = null where user_id = v.user_id;
    -- An invite waiting on this player's verification is paid now (if they've played 3 days).
    if exists (select 1 from life_state where user_id = v.user_id and active_days >= 3) then perform public.pay_referral(v.user_id); end if;
  end if;
  select username into uname from profiles where id = v.user_id;
  return coalesce(uname, '');
end $$;
grant execute on function public.verify_email(text) to anon, authenticated;

create or replace function public.my_email_status() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object('email', u.email, 'verified', public.email_verified(u.id),
    'sentAt', (select last_sent_at from email_verifications where user_id = u.id))
  from auth.users u where u.id = auth.uid()
$$;
grant execute on function public.my_email_status() to authenticated;

-- Invite rewards need a verified email (stops farming rewards with throwaway accounts).
create or replace function public.pay_referral(p_invitee uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r referrals; amt bigint := coalesce((setting('app_bonus') ->> 'referral')::bigint, 0); invitee_name text;
begin
  select * into r from referrals where invitee_id = p_invitee and rewarded_at is null for update;
  if r.invitee_id is null or amt <= 0 then return; end if;
  if not public.email_verified(p_invitee) then return; end if;   -- paid later, when they verify
  if (select count(*) from referrals where inviter_id = r.inviter_id and rewarded_at >= date_trunc('month', now())) >= 20 then return; end if;
  select username into invitee_name from profiles where id = p_invitee;
  update referrals set rewarded_at = now(), amount = amt where invitee_id = p_invitee;
  perform coin_move(r.inviter_id, amt, 'grant', 'Invite reward: @' || invitee_name || ' joined', 'referral:' || p_invitee);
  perform coin_move(p_invitee, amt, 'grant', 'Welcome reward: joined with a friend''s invite', 'referral:' || p_invitee || ':invitee');
end $$;
revoke all on function public.pay_referral(uuid) from public, anon, authenticated;

-- Tournament prizes need a verified email.
create or replace function public.submit_prize_details(p_month text, p_full_name text, p_country text, p_payout text, p_id_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.email_verified(auth.uid()) then raise exception 'email_not_verified'; end if;
  update tournament_winners set full_name = left(trim(p_full_name), 120), country = left(trim(p_country), 60),
    payout_details = left(trim(p_payout), 300), id_document_ref = p_id_ref, status = 'under_review', updated_at = now()
  where month = p_month and user_id = auth.uid() and status in ('awaiting_details', 'under_review');
  if not found then raise exception 'not_winner'; end if;
end $$;
grant execute on function public.submit_prize_details(text, text, text, text, text) to authenticated;
