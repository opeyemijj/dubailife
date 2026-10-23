-- Admin passwords from the admin console: a super admin can set a new password for any admin (Admins
-- page), and every admin can change their own (My account, current password required). Both are
-- audited, need at least 10 characters, and sign the account out everywhere else.

/** Super admins: sets a new password for an admin and signs them out of every device. */
create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare em text;
begin
  perform public.require_admin(array[]::text[]);   -- super admins only
  if not exists (select 1 from admins where user_id = p_user) then raise exception 'not_an_admin'; end if;
  if char_length(coalesce(p_password, '')) < 10 then raise exception 'password_too_short'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
    where id = p_user returning email into em;
  -- Your own other devices are signed out; this session stays signed in.
  delete from auth.sessions where user_id = p_user
    and (p_user <> auth.uid() or id::text is distinct from (auth.jwt() ->> 'session_id'));
  perform public.log_audit('admin_password_set', em, '{}');
end $$;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

/** Any admin: changes their own password after confirming the current one. */
create or replace function public.admin_change_my_password(p_current text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid := auth.uid(); hash text; em text;
begin
  perform public.require_admin();
  select encrypted_password, email into hash, em from auth.users where id = uid;
  if hash is null or hash <> crypt(coalesce(p_current, ''), hash) then raise exception 'wrong_password'; end if;
  if char_length(coalesce(p_new, '')) < 10 then raise exception 'password_too_short'; end if;
  if p_new = p_current then raise exception 'same_password'; end if;
  update auth.users set encrypted_password = crypt(p_new, gen_salt('bf')), updated_at = now() where id = uid;
  delete from auth.sessions where user_id = uid and id::text is distinct from (auth.jwt() ->> 'session_id');
  perform public.log_audit('admin_password_changed', em, '{}');
end $$;
revoke all on function public.admin_change_my_password(text, text) from public, anon;
grant execute on function public.admin_change_my_password(text, text) to authenticated;
