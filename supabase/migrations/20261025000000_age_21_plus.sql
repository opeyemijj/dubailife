-- Come To Dubai is 21+. Sign-up now takes a date of birth and refuses anyone under 21; the date is kept
-- in the account's metadata. The old four-argument sign-up is removed in the next migration, once the
-- app that sends a date of birth is live.

create or replace function public.register_account(p_email text, p_password text, p_username text, p_display_name text, p_dob date) returns uuid
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
  -- Come To Dubai is 21+.
  if p_dob is null or p_dob > (current_date - interval '21 years')::date or p_dob < date '1900-01-01' then raise exception 'too_young'; end if;
  -- A brake on scripted sign-ups: at most 60 new accounts a minute across the app.
  if (select count(*) from signup_attempts where at > now() - interval '1 minute') >= 60 then raise exception 'too_many_signups'; end if;
  insert into signup_attempts default values;
  if exists (select 1 from profiles where lower(username) = uname) then raise exception 'username_taken'; end if;
  -- An account that never finished joining (no citizen yet) is picked up again with the new details.
  select u.id into uid from auth.users u where lower(u.email) = em;
  if uid is not null then
    if exists (select 1 from profiles where id = uid) or exists (select 1 from admins where user_id = uid) then raise exception 'already_registered'; end if;
    update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', uname, 'display_name', trim(p_display_name), 'date_of_birth', p_dob),
      updated_at = now()
    where id = uid;
    if not exists (select 1 from auth.identities where user_id = uid and provider = 'email') then
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
    end if;
    return uid;
  end if;

  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('username', uname, 'display_name', trim(p_display_name), 'date_of_birth', p_dob),
          now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  return uid;
end $$;
revoke all on function public.register_account(text, text, text, text, date) from public;
grant execute on function public.register_account(text, text, text, text, date) to anon, authenticated;

