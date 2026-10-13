-- Instant sign-up: creates a confirmed account straight away (no confirmation email), so new
-- citizens go from the sign-up form into the game. The app signs them in right after.
-- To bring back email confirmation later, stop calling this and use Supabase's normal sign-up.

create table if not exists public.signup_attempts (at timestamptz not null default now());
create index if not exists signup_attempts_at_idx on public.signup_attempts (at);
alter table public.signup_attempts enable row level security;

create or replace function public.register_account(p_email text, p_password text, p_username text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  em text := lower(trim(p_email));
  uname text := lower(regexp_replace(trim(p_username), '^@', ''));
  uid uuid;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if char_length(coalesce(p_password, '')) < 8 then raise exception 'weak_password'; end if;
  if uname !~ '^[a-z0-9_.]{3,24}$' then raise exception 'invalid_username'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) < 1 then raise exception 'name_required'; end if;
  -- A brake on scripted sign-ups: at most 60 new accounts a minute across the app.
  if (select count(*) from signup_attempts where at > now() - interval '1 minute') >= 60 then raise exception 'too_many_signups'; end if;
  insert into signup_attempts default values;
  if exists (select 1 from auth.users where lower(email) = em) then raise exception 'already_registered'; end if;
  if exists (select 1 from profiles where lower(username) = uname) then raise exception 'username_taken'; end if;

  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('username', uname, 'display_name', trim(p_display_name)),
          now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  return uid;
end $$;
revoke all on function public.register_account(text, text, text, text) from public;
grant execute on function public.register_account(text, text, text, text) to anon, authenticated;

-- Old attempts aren't needed.
create or replace function public.purge_signup_attempts() returns void language sql security definer set search_path = public as $$
  delete from signup_attempts where at < now() - interval '1 hour';
$$;
select cron.unschedule('purge-signup-attempts') where exists (select 1 from cron.job where jobname = 'purge-signup-attempts');
select cron.schedule('purge-signup-attempts', '15 * * * *', 'select public.purge_signup_attempts()');
