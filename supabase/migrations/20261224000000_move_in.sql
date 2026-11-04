-- Family, phase 2 (user, 2026-11-04): partners can move in together. The one moving in becomes a resident of the
-- other's home (a flat_guests editor: they come and go freely and can decorate). One shared home per couple.

create table if not exists public.couple_homes (
  relationship_id bigint primary key references public.relationships (id) on delete cascade,
  flat_id text not null references public.flats (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.couple_homes enable row level security;
drop policy if exists "the couple sees their home" on public.couple_homes;
create policy "the couple sees their home" on public.couple_homes for select
  using (exists (select 1 from relationships r where r.id = relationship_id and auth.uid() in (r.man_id, r.woman_id)));

-- Move my partner into my home (the one I live in now: owned, rented, or my home off the map).
create or replace function public.move_in_together(p_partner uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships; f text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  r := public.rel_with(me, p_partner);
  if r.id is null or r.status = 'ended' then raise exception 'not_together'; end if;
  select id into f from flats
    where owner_id = me or (tenant_id = me and (tenant_until is null or tenant_until > now())) or home_of = me
    order by (owner_id = me) desc, updated_at desc limit 1;
  if f is null then raise exception 'no_home'; end if;
  insert into couple_homes (relationship_id, flat_id, host_id) values (r.id, f, me)
    on conflict (relationship_id) do update set flat_id = excluded.flat_id, host_id = excluded.host_id, created_at = now();
  -- A couple living together: the partner is at home there too.
  delete from flat_guests where user_id = public.partner_of(r, me) and flat_id in (select flat_id from couple_homes where relationship_id = r.id and flat_id <> f);
  insert into flat_guests (flat_id, user_id, can_edit) values (f, public.partner_of(r, me), true)
    on conflict (flat_id, user_id) do update set can_edit = true;
  return f;
end $$;
grant execute on function public.move_in_together(uuid) to authenticated;

-- Either of them can end living together: the guest's keys go.
create or replace function public.move_out(p_partner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships; h couple_homes;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  r := public.rel_with(me, p_partner);
  select * into h from couple_homes where relationship_id = r.id;
  if h.relationship_id is null then return; end if;
  delete from flat_guests where flat_id = h.flat_id and user_id = case when h.host_id = r.man_id then r.woman_id else r.man_id end;
  delete from couple_homes where relationship_id = r.id;
end $$;
grant execute on function public.move_out(uuid) to authenticated;

-- My shared homes: with whom, where, and whose home it is.
create or replace function public.my_household() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'partner', public.partner_of(r, auth.uid()), 'flat', f.id, 'building', f.building_id, 'unit', f.unit, 'type', f.property_type,
    'host', h.host_id = auth.uid())), '[]'::jsonb)
  from couple_homes h join relationships r on r.id = h.relationship_id join flats f on f.id = h.flat_id
  where auth.uid() in (r.man_id, r.woman_id) and r.status <> 'ended'
$$;
grant execute on function public.my_household() to authenticated;
