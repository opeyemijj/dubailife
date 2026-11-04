-- House parties for anyone with a room (user, 2026-11-04). Players whose home isn't on the map (a starter studio,
-- a 1-bed in JVC…) get a generic address the first time they throw a party: a flat high up in a residential tower
-- ("Apt 2204", floor 22, "<Area> Residences") in a "home-<area>" building that isn't on the map, tied to them by
-- `home_of`. Guests arrive in the tower's lobby and take the lift up to the door. It is not a tenancy: no rent, it doesn't count as "has a home"
-- for living costs, and it's never listed. Their furniture is copied in so guests see their real home.
-- A shared bed space isn't a room: those players are asked to move first.

alter table public.flats add column if not exists home_of uuid references public.profiles (id) on delete cascade;
create index if not exists flats_home_of on public.flats (home_of) where home_of is not null;
grant select (home_of) on public.flats to anon, authenticated;

-- Their own generic home: created on first use (with a made-up but believable address), refreshed after that with
-- today's layout and furniture. Returns the flat id.
create or replace function public.party_home(p_tier text, p_area text, p_interior jsonb default '{"furniture": []}')
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; v_type text; v_beds int; v_size int; v_building text; v_unit text; v_id text; v_floor int; tries int := 0;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_tier = 'bed_space' then raise exception 'need_a_room'; end if;
  select t, b, s into v_type, v_beds, v_size from (values
    ('studio', 'Studio', 0, 450), ('one_bedroom', 'Apartment', 1, 800), ('two_bedroom', 'Apartment', 2, 1200),
    ('three_bedroom', 'Apartment', 3, 1700), ('duplex', 'Duplex', 2, 1900), ('townhouse', 'Townhouse', 3, 2600),
    ('penthouse', 'Penthouse', 4, 5200), ('villa', 'Villa', 5, 9000)) as x(k, t, b, s) where k = p_tier;
  if v_type is null then raise exception 'bad_tier'; end if;
  if p_area is null or p_area !~ '^[A-Za-z][A-Za-z '']{1,39}$' then raise exception 'bad_area'; end if;
  if p_interior is null or jsonb_typeof(p_interior -> 'furniture') <> 'array' or length(p_interior::text) > 200000 then raise exception 'bad_interior'; end if;

  -- One address per home type and area (moving from a studio to a villa gives you a villa address).
  v_building := 'home-' || trim(both '-' from regexp_replace(lower(trim(p_area)), '[^a-z]+', '-', 'g'));
  select * into f from flats where home_of = me and building_id = v_building and property_type = v_type for update;
  if f.id is not null then
    update flats set interior = p_interior, updated_at = now() where id = f.id;
    return f.id;
  end if;

  loop
    tries := tries + 1;
    -- All in towers: higher floors for the bigger homes (sky villas and penthouses near the top).
    v_floor := case when v_type in ('Villa', 'Penthouse') then 40 + floor(random() * 20) when v_type in ('Townhouse', 'Duplex') then 20 + floor(random() * 20)
                    else 3 + floor(random() * 30) end;
    v_unit := 'Apt ' || v_floor || lpad((1 + floor(random() * 12))::int::text, 2, '0');
    v_id := v_building || ':' || v_unit;
    exit when not exists (select 1 from flats where id = v_id) or tries > 20;
  end loop;
  if tries > 20 then raise exception 'try_again'; end if;
  insert into flats (id, building_id, unit, floor, property_type, bedrooms, size_sqft, listing, access, interior, home_of)
    values (v_id, v_building, v_unit, v_floor, v_type, v_beds, v_size, 'none', 'private', p_interior, me);
  return v_id;
end $$;
revoke all on function public.party_home(text, text, jsonb) from public, anon;
grant execute on function public.party_home(text, text, jsonb) to authenticated;

-- My generic home, if I have one (the latest used).
create or replace function public.my_party_home() returns text
language sql stable security definer set search_path = public as $$
  select id from flats where home_of = auth.uid() order by updated_at desc limit 1
$$;
grant execute on function public.my_party_home() to authenticated;

-- The person whose generic home it is counts as its resident (manages guests, gets the knocks).
create or replace function public.is_flat_manager(p_flat text, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from flats f where f.id = p_flat and (f.owner_id = p_user or f.tenant_id = p_user or f.home_of = p_user))
$$;

-- Whether a user may walk into a flat right now, and whether they may change it.
create or replace function public.flat_permissions(p_flat text, p_user uuid)
returns table (can_enter boolean, can_edit boolean, reason text)
language plpgsql stable security definer set search_path = public as $$
declare f flats; g flat_guests; resident uuid;
begin
  select * into f from flats where id = p_flat;
  if not found then return query select false, false, 'not_found'; return; end if;
  if p_user is not null and (f.owner_id = p_user or f.tenant_id = p_user or f.home_of = p_user) then
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

-- Throwing a party at your generic home works like any other home.
create or replace function public.create_event(p_kind text, p_title text, p_starts_at timestamptz, p_label text,
  p_flat text default null, p_route text default null, p_place text default null, p_venue text default null,
  p_decor text[] default '{}', p_max int default 20, p_price int default 0) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; c text; v_route text; hours int; cost bigint := 0; d text; iid bigint;
  promoter boolean := public.service_of(auth.uid()) = 'promoter';
  -- Promoters run bigger events (up to 200 guests) and more of them at once (6).
  max_size int := case when public.service_of(auth.uid()) = 'promoter' then 200 else 20 end;
  max_events int := case when public.service_of(auth.uid()) = 'promoter' then 6 else 3 end;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar') then raise exception 'bad_kind'; end if;
  hours := case p_kind when 'house_party' then 3 when 'dinner' then 2 when 'seminar' then 2 else 4 end;
  if p_starts_at < now() - interval '10 minutes' or p_starts_at > now() + interval '7 days' then raise exception 'bad_time'; end if;
  if p_max < 2 or p_max > max_size then raise exception 'bad_size'; end if;
  -- Free, or a ticket of up to AED 5,000.
  if p_price is null or p_price < 0 or p_price > 5000 then raise exception 'bad_price'; end if;
  if (select count(*) from invites where host_id = me and not cancelled and kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar') and ends_at > now()) >= max_events then raise exception 'too_many_parties'; end if;
  foreach d in array coalesce(p_decor, '{}') loop
    if public.party_decor_price(d) is null then raise exception 'bad_decor'; end if;
    cost := cost + public.party_decor_price(d);
  end loop;
  if p_flat is not null then
    if p_kind in ('club_night', 'pool_party', 'seminar') then raise exception 'bad_place'; end if;
    select * into f from flats where id = p_flat and (owner_id = me or tenant_id = me or home_of = me);
    if f.id is null then raise exception 'not_your_home'; end if;
    if p_route is null or left(p_route, length('/property/' || f.building_id || '/')) <> '/property/' || f.building_id || '/' then raise exception 'bad_route'; end if;
    v_route := p_route;
  else
    if p_kind = 'house_party' then raise exception 'bad_place'; end if;
    if p_place !~ '^[a-z0-9-]{2,60}$' or p_venue !~ '^[a-z0-9-]{2,60}$' then raise exception 'bad_place'; end if;
    v_route := '/place/' || p_place || '/' || p_venue;
  end if;
  -- Only one party at a time in a place, so everyone arriving knows whose it is.
  if exists (select 1 from invites where invites.route = v_route and not cancelled and starts_at < p_starts_at + make_interval(hours => hours) and ends_at > p_starts_at) then
    raise exception 'place_taken';
  end if;
  c := public.new_invite_code();
  insert into invites (code, kind, host_id, title, label, route, flat_id, place_id, venue_id, starts_at, ends_at, max_guests, decor, decor_cost, ticket_price)
    values (c, p_kind, me, left(coalesce(nullif(trim(p_title), ''), 'Party'), 60), left(p_label, 80), v_route, f.id, p_place, p_venue,
            p_starts_at, p_starts_at + make_interval(hours => hours), p_max, (select array(select distinct unnest(coalesce(p_decor, '{}')))), cost, p_price)
    returning id into iid;
  if cost > 0 then perform coin_move(me, -cost, 'spend', 'Party decorations', 'party-decor:' || iid); end if;
  -- A promoter's event at a venue is promoted: they earn a commission for every guest who turns up.
  if f.id is null and promoter then update invites set promoted = true where id = iid; end if;
  if f.id is not null then update flats set access = 'public' where id = f.id; end if;
  return c;
end $$;
grant execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, text[], int, int) to authenticated;

-- Knocks at a home off the map reach the person whose home it is.
create or replace function public.tg_notify_users() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record := coalesce(new, old); who uuid; rel relationships; f flats;
begin
  case tg_table_name
    -- Rows the recipient can read anyway: sent whole.
    when 'messages' then perform public.notify_user(r.to_id, 'messages', tg_op, to_jsonb(r));
    when 'transfers' then perform public.notify_user(r.to_id, 'transfers', tg_op, to_jsonb(r));
    when 'game_invites' then perform public.notify_user(r.to_id, 'game_invites', tg_op, to_jsonb(r));
    when 'friendships' then
      -- A request goes to who it's for; an acceptance to who asked.
      if tg_op = 'INSERT' then perform public.notify_user(r.friend_id, 'friendships', tg_op, to_jsonb(r));
      else perform public.notify_user(r.user_id, 'friendships', tg_op, to_jsonb(r)); end if;
    when 'entry_requests' then
      -- A knock goes to whoever lives there; the answer to the visitor.
      if tg_op = 'INSERT' then
        select * into f from flats where id = r.flat_id;
        perform public.notify_user(f.owner_id, 'entry_requests', tg_op, to_jsonb(r));
        if f.tenant_id is distinct from f.owner_id then perform public.notify_user(f.tenant_id, 'entry_requests', tg_op, to_jsonb(r)); end if;
        if f.home_of is not null then perform public.notify_user(f.home_of, 'entry_requests', tg_op, to_jsonb(r)); end if;
      else
        perform public.notify_user(r.visitor_id, 'entry_requests', tg_op, to_jsonb(r));
      end if;
    -- The rest: just "something changed" (the app reloads what it may see), so nothing leaks, like a partner's
    -- other relationships.
    when 'love_requests' then perform public.notify_user(r.from_id, 'love', tg_op); perform public.notify_user(r.to_id, 'love', tg_op);
    when 'relationships' then perform public.notify_user(r.man_id, 'love', tg_op); perform public.notify_user(r.woman_id, 'love', tg_op);
    when 'weddings' then
      select * into rel from relationships where id = r.relationship_id;
      perform public.notify_user(rel.man_id, 'love', tg_op); perform public.notify_user(rel.woman_id, 'love', tg_op);
    when 'family_links' then perform public.notify_user(r.from_id, 'love', tg_op); perform public.notify_user(r.to_id, 'love', tg_op);
    when 'children' then perform public.notify_user(r.mother_id, 'love', tg_op); perform public.notify_user(r.father_id, 'love', tg_op);
    when 'consults' then perform public.notify_user(r.patient_id, 'services', tg_op); perform public.notify_user(r.doctor_id, 'services', tg_op);
    when 'cases' then
      perform public.notify_user(r.suspect_id, 'services', tg_op);
      if r.lawyer_id is distinct from r.suspect_id then perform public.notify_user(r.lawyer_id, 'services', tg_op); end if;
      if r.officer_id is distinct from r.suspect_id and r.officer_id is distinct from r.lawyer_id then perform public.notify_user(r.officer_id, 'services', tg_op); end if;
    when 'illnesses' then perform public.notify_user(r.user_id, 'services', tg_op);
    else null;
  end case;
  return null;
exception when others then
  -- A notification must never break the change itself.
  return null;
end $$;
