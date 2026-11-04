-- One home, one design (user, 2026-11-05): every home's design (furniture, floor, walls, panels, bed sheets) lives
-- once, in flats.interior, and everyone who changes it (the owner, a partner, a decorator, a guest allowed to decorate)
-- changes that one. Everyone sees the same thing.

-- The home a player lives in: the one shared with a partner first, else one they own, rent, or got for a party
-- (most recently changed).
create or replace function public.home_flat_of(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select h.flat_id from couple_homes h join relationships r on r.id = h.relationship_id
       where r.status <> 'ended' and p_user in (r.man_id, r.woman_id) order by h.created_at desc limit 1),
    (select id from flats where owner_id = p_user or (tenant_id = p_user and (tenant_until is null or tenant_until > now())) or home_of = p_user
       order by updated_at desc limit 1))
$$;
revoke all on function public.home_flat_of(uuid) from public, anon, authenticated;

-- A decorator starts from the home's design.
create or replace function public.decor_home(p_job bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j decor_jobs; c jsonb; who text; hf text; inter jsonb;
begin
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working';
  if j.id is null then raise exception 'not_working'; end if;
  select citizen, username into c, who from profiles where id = j.client_id;
  -- The home's one design, when it has one (else the client's own copy, as before).
  hf := public.home_flat_of(j.client_id);
  if hf is not null then select interior into inter from flats where id = hf; end if;
  if coalesce((inter ->> 'shared')::boolean, false) then
    return jsonb_build_object('id', j.id, 'client', who, 'tier', j.tier, 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
      'furniture', coalesce(inter -> 'furniture', '[]'::jsonb), 'style', inter -> 'style');
  end if;
  return jsonb_build_object('id', j.id, 'client', who, 'tier', j.tier, 'brief', j.studio, 'budget', j.costs, 'spent', j.spent, 'fee', j.fee, 'plan', j.plan,
    'furniture', coalesce(c -> 'furniture', '[]'::jsonb), 'style', c -> 'homeStyle' -> j.tier);
end $$;
grant execute on function public.decor_home(bigint) to authenticated;

-- …and finishing writes into it.
create or replace function public.decor_complete(p_job bigint, p_plan jsonb, p_spent bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare j decor_jobs; who text; hf text;
begin
  if p_plan is null or octet_length(p_plan::text) > 200000 then raise exception 'bad_plan'; end if;
  select * into j from decor_jobs where id = p_job and decorator_id = auth.uid() and status = 'working' for update;
  if j.id is null then raise exception 'not_working'; end if;
  if p_spent < 0 or p_spent > j.costs then raise exception 'over_budget'; end if;
  update decor_jobs set status = 'done', plan = p_plan, spent = p_spent, ready_at = now() where id = j.id;
  -- The decorator's work becomes the home's one design, for everyone who lives there or visits.
  hf := public.home_flat_of(j.client_id);
  if hf is not null and jsonb_typeof(p_plan -> 'furniture') = 'array' then
    update flats set interior = jsonb_build_object('furniture', p_plan -> 'furniture', 'style', p_plan -> 'style', 'shared', true), updated_at = now() where id = hf;
  end if;
  if j.costs > p_spent then perform coin_move(j.client_id, j.costs - p_spent, 'refund', 'Decorating budget left over', 'decor-left:' || j.id); end if;
  select username into who from profiles where id = j.client_id;
  if j.fee > 0 then perform coin_move(j.decorator_id, j.fee, 'earn', 'Decorated @' || who || '''s home', 'decor-paid:' || j.id); end if;
  perform public.add_points(j.decorator_id, 'career', 15, 'decor:' || j.id);
  return j.fee;
end $$;
grant execute on function public.decor_complete(bigint, jsonb, bigint) to authenticated;

-- A party at a home off the map never overwrites its design.
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
    -- A home's design is its own (one version for everyone): only a home that hasn't got one yet takes this.
    update flats set interior = case when coalesce((interior ->> 'shared')::boolean, false) then interior else p_interior end, updated_at = now() where id = f.id;
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
