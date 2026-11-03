-- The host can end a party that's on: it ends now (kept in history as ended, not called off), the lights come back on,
-- and party_here stops finding it, so the decorations, banner and party Space go for everyone there.

create or replace function public.end_party(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set ends_at = now(), lights_out = false
    where code = upper(trim(p_code)) and host_id = auth.uid() and not cancelled
      and kind in ('house_party', 'dinner', 'club_night') and starts_at <= now() and ends_at > now();
  if not found then raise exception 'not_your_party'; end if;
end $$;
revoke execute on function public.end_party(text) from public, anon;
grant execute on function public.end_party(text) to authenticated;
