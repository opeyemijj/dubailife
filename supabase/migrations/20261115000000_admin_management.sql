-- Admin management for super admins (Admin console → Admins): list the admin team, add an admin (an
-- existing account by email, or a new login created with a password), change roles and remove admins.
-- Every change is written to the audit log. The last super admin can't be removed or demoted, and no
-- one can remove themselves.

alter table public.admins add column if not exists added_by uuid references auth.users (id) on delete set null;

/** The admin team, for super admins. */
create or replace function public.admin_list() returns table (
  user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz, username text, added_by_email text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin(array[]::text[]);   -- super admins only
  return query
    select a.user_id, u.email::text, a.role, a.created_at, u.last_sign_in_at, p.username, b.email::text
    from admins a join auth.users u on u.id = a.user_id
    left join profiles p on p.id = a.user_id
    left join auth.users b on b.id = a.added_by
    order by case a.role when 'super_admin' then 0 when 'admin' then 1 when 'finance' then 2 else 3 end, a.created_at;
end $$;
revoke all on function public.admin_list() from public, anon;
grant execute on function public.admin_list() to authenticated;

/** Makes someone an admin. An email with no account gets a new login with the given password
    (at least 10 characters). Returns 'added', 'updated' (role changed) or 'created' (new login). */
create or replace function public.admin_add(p_email text, p_role text, p_password text default null) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare em text := lower(trim(coalesce(p_email, ''))); uid uuid; was text; result text;
begin
  perform public.require_admin(array[]::text[]);
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if p_role not in ('super_admin', 'admin', 'finance', 'moderator') then raise exception 'invalid_role'; end if;

  select u.id into uid from auth.users u where lower(u.email) = em;
  if uid is null then
    if char_length(coalesce(p_password, '')) < 10 then raise exception 'password_too_short'; end if;
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
    result := 'created';
  end if;

  select a.role into was from admins a where a.user_id = uid;
  if was = 'super_admin' and p_role <> 'super_admin' and (select count(*) from admins where role = 'super_admin') <= 1 then
    raise exception 'last_super_admin';
  end if;
  insert into admins (user_id, role, added_by) values (uid, p_role, auth.uid())
    on conflict (user_id) do update set role = excluded.role;
  result := coalesce(result, case when was is null then 'added' else 'updated' end);
  perform public.log_audit('admin_' || result, em, jsonb_build_object('role', p_role, 'previous_role', was));
  return result;
end $$;
revoke all on function public.admin_add(text, text, text) from public, anon;
grant execute on function public.admin_add(text, text, text) to authenticated;

/** Changes an admin's role. */
create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare was text; em text;
begin
  perform public.require_admin(array[]::text[]);
  if p_role not in ('super_admin', 'admin', 'finance', 'moderator') then raise exception 'invalid_role'; end if;
  select a.role into was from admins a where a.user_id = p_user for update;
  if was is null then raise exception 'not_an_admin'; end if;
  if was = 'super_admin' and p_role <> 'super_admin' and (select count(*) from admins where role = 'super_admin') <= 1 then
    raise exception 'last_super_admin';
  end if;
  update admins set role = p_role where user_id = p_user;
  select email into em from auth.users where id = p_user;
  perform public.log_audit('admin_role_changed', em, jsonb_build_object('role', p_role, 'previous_role', was));
end $$;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

/** Removes admin access (the login itself stays, so they can still play if they have a citizen). */
create or replace function public.admin_remove(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare was text; em text;
begin
  perform public.require_admin(array[]::text[]);
  if p_user = auth.uid() then raise exception 'cannot_remove_self'; end if;
  select a.role into was from admins a where a.user_id = p_user for update;
  if was is null then raise exception 'not_an_admin'; end if;
  if was = 'super_admin' and (select count(*) from admins where role = 'super_admin') <= 1 then raise exception 'last_super_admin'; end if;
  delete from admins where user_id = p_user;
  select email into em from auth.users where id = p_user;
  perform public.log_audit('admin_removed', em, jsonb_build_object('previous_role', was));
end $$;
revoke all on function public.admin_remove(uuid) from public, anon;
grant execute on function public.admin_remove(uuid) to authenticated;
