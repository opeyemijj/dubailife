-- Household permissions: ensure co-resident spouses and partners in couple_homes
-- have identical full permissions (can_enter = true, can_edit = true) to buy, place,
-- decorate, customize and save flat interiors.

create or replace function public.flat_permissions(p_flat text, p_user uuid)
returns table (can_enter boolean, can_edit boolean, reason text)
language plpgsql stable security definer set search_path = public as $$
declare f flats; g flat_guests; resident uuid;
begin
  select * into f from flats where id = p_flat;
  if not found then return query select false, false, 'not_found'; return; end if;

  -- Residents and co-resident spouses/partners living together in couple_homes
  if p_user is not null and (
    f.owner_id = p_user or f.tenant_id = p_user or f.home_of = p_user or
    exists (
      select 1 from couple_homes ch
      join relationships r on r.id = ch.relationship_id
      where ch.flat_id = p_flat and p_user in (r.man_id, r.woman_id) and r.status <> 'ended'
    )
  ) then
    return query select true, true, 'resident'; return;
  end if;

  select * into g from flat_guests where flat_id = p_flat and user_id = p_user;
  if found and g.can_edit then return query select true, true, 'editor'; return; end if;

  -- Empty flats on the market can be inspected.
  if f.owner_id is null and f.owner_npc is null and f.tenant_id is null and f.tenant_npc is null and f.home_of is null then
    return query select f.listing <> 'none', false, case when f.listing <> 'none' then 'viewing' else 'not_listed' end; return;
  end if;

  if exists (select 1 from entry_requests r where r.flat_id = p_flat and r.visitor_id = p_user
             and r.status = 'approved' and r.responded_at > now() - interval '2 hours') then
    return query select true, false, 'approved'; return;
  end if;

  if f.access = 'public' then return query select true, false, 'public'; return; end if;

  resident := coalesce(f.tenant_id, f.owner_id, f.home_of);
  if f.access = 'friends' and resident is not null and are_friends(resident, p_user) then
    return query select true, false, 'friend'; return;
  end if;

  if f.access in ('invite', 'friends') and g.user_id is not null then
    return query select true, false, 'invited'; return;
  end if;

  -- Visitors may inspect an occupied flat whose owner has listed it for sale.
  if f.listing in ('sale', 'rent_or_sale') and f.tenant_id is null and f.tenant_npc is null and f.home_of is null then
    return query select true, false, 'viewing'; return;
  end if;

  return query select false, false, f.access;
end $$;

grant execute on function public.flat_permissions(text, uuid) to anon, authenticated;
