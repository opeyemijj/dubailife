-- Loosen end_party so the host, spouse or property co-resident can end the party at any time as they like
create or replace function public.end_party(p_code text, p_host_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  caller uuid := coalesce(auth.uid(), p_host_id);
  inv record;
begin
  select * into inv from invites where code = upper(trim(p_code)) and not cancelled;
  if inv.id is null then
    -- Not found or already cancelled, nothing to end
    return;
  end if;

  -- Verify host or spouse / co-resident permission
  if caller is not null then
    if inv.host_id <> caller
       and not exists (
         select 1 from couple_homes ch
         where ch.flat_id = inv.flat_id
           and (ch.citizen_id = caller or ch.partner_id = caller)
       )
       and not exists (
         select 1 from flats f
         where f.id = inv.flat_id
           and (f.owner_id = caller or f.tenant_id = caller)
       ) then
       raise exception 'not_your_party';
    end if;
  end if;

  -- End the party: set ends_at = now() and lights_out = false
  update invites set ends_at = now(), lights_out = false where id = inv.id;
end $$;

grant execute on function public.end_party(text, uuid) to anon, authenticated;
grant execute on function public.end_party(text) to anon, authenticated;
