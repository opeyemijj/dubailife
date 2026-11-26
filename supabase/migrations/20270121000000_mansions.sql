-- Mansions: the 30 m two-storey home (src/data/home/floorplans.json "mansion": gym, cinema, library, games room
-- and bar, indoor pool, five en-suite bedrooms, a car gallery outside). The eight biggest Palm frond villas that no
-- player owns or rents become Signature Mansions (property type 'Mansion': the app opens the mansion layout), priced
-- above the villas; and a party at a mansion gets a mansion address.

update flats set
  property_type = 'Mansion',
  bedrooms = 6,
  size_sqft = round(size_sqft * 2.45 / 5) * 5,
  sale_price = round(sale_price * 1.38 / 50000) * 50000,
  rent_price = round(greatest(rent_price, 100000) * 2.3 / 500) * 500
where id in ('palm-frond-8-4:Villa', 'palm-frond-4-2:Villa', 'palm-frond-2-2:Villa', 'palm-frond-9-4:Villa',
             'palm-frond-4-4:Villa', 'palm-frond-7-2:Villa', 'palm-frond-10-2:Villa', 'palm-frond-1-2:Villa')
  and property_type = 'Villa' and owner_id is null and tenant_id is null;

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
    ('penthouse', 'Penthouse', 4, 5200), ('villa', 'Villa', 5, 9000), ('mansion', 'Mansion', 6, 19500)) as x(k, t, b, s) where k = p_tier;
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
    v_floor := case when v_type in ('Villa', 'Penthouse', 'Mansion') then 40 + floor(random() * 20) when v_type in ('Townhouse', 'Duplex') then 20 + floor(random() * 20)
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

