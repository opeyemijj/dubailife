-- Your car, your colour: pick the paint when you buy (free), or respray it later at the paint shop (Phone → Cars).
-- The palette and the respray price are src/data/cars/cars.json → paints, mirrored here in car_paint_rule()
-- (checked by scripts/check-life-config.mjs). owned_cars.color is the hex; null is the car's factory colour.
-- Every place a car is read now carries its colour: the garage, the car parked at a home, races and profiles.

alter table public.owned_cars add column if not exists color text;

create or replace function public.car_paint_rule() returns jsonb
language sql immutable set search_path = public as $$
  select '{"respray":2500,"colors":["#f8fafc","#cbd5e1","#4b5563","#0f172a","#d6c3a1","#c8a96a","#b91c1c","#ea580c","#facc15","#15803d","#2563eb","#1e3a8a","#6d28d9","#e8a598"]}'::jsonb
$$;

/** Is this one of the paints on offer (null: the factory colour)? */
create or replace function public.car_paint_ok(p_color text) returns boolean
language sql immutable set search_path = public as $$
  select p_color is null or (car_paint_rule() -> 'colors') ? lower(p_color)
$$;

-- Buying, now with a colour.
drop function if exists public.buy_car(text, text);
create or replace function public.buy_car(p_dealer text, p_car text, p_color text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); price int := (public.car_price(p_car))[1]; ins bigint; plate text; cid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.has_licence(me) then raise exception 'needs_licence'; end if;
  if public.car_offered(p_dealer, p_car) is distinct from 'buy' then raise exception 'not_offered'; end if;
  if not public.car_paint_ok(p_color) then raise exception 'unknown_color'; end if;
  ins := greatest(1500, price * 3 / 100);
  -- A Dubai plate: a letter code and five digits.
  plate := chr(65 + floor(random() * 26)::int) || ' ' || lpad((floor(random() * 99999) + 1)::text, 5, '0');
  insert into owned_cars (user_id, car, dealer, price, plate, registered_until, insured_until, color)
    values (me, p_car, p_dealer, price, plate, now() + interval '1 year', now() + interval '1 year', lower(p_color)) returning id into cid;
  perform coin_move(me, -(price + ins + 420), 'spend', 'Car purchase, insurance and registration', 'car:' || cid);
  return jsonb_build_object('id', cid, 'plate', plate, 'insurance', ins, 'registration', 420, 'total', price + ins + 420, 'color', lower(p_color));
end $$;
grant execute on function public.buy_car(text, text, text) to authenticated;

-- A respray: your own car (not stolen, not in the impound), a different colour, paid for.
create or replace function public.set_car_color(p_car bigint, p_color text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c owned_cars; cost int := (car_paint_rule() ->> 'respray')::int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into c from owned_cars where id = p_car and user_id = me for update;
  if c.id is null then raise exception 'not_your_car'; end if;
  if coalesce(c.is_stolen, false) then raise exception 'car_stolen'; end if;
  if c.impounded_until is not null and c.impounded_until > now() then raise exception 'car_impounded'; end if;
  if not car_paint_ok(p_color) then raise exception 'unknown_color'; end if;
  if c.color is not distinct from lower(p_color) then raise exception 'same_color'; end if;
  perform coin_move(me, -cost, 'spend', 'Car respray', 'car:' || c.id);
  update owned_cars set color = lower(p_color) where id = c.id;
  return jsonb_build_object('id', c.id, 'color', lower(p_color), 'cost', cost);
end $$;
grant execute on function public.set_car_color(bigint, text) to authenticated;

-- The garage, with each car's colour.
create or replace function public.my_garage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'licence', (select jsonb_build_object('number', licence_no, 'issuedAt', issued_at) from driving_progress where user_id = auth.uid() and issued_at is not null),
    'accidents', public.accidents_on_licence(auth.uid()),
    'revokedAt', (select revoked_at from driving_progress where user_id = auth.uid() and issued_at is null),
    'owned', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price, 'color', color,
                'registeredUntil', registered_until, 'insuredUntil', insured_until, 'boughtAt', bought_at,
                'fuel', fuel,
                'impoundedUntil', case when impounded_until > now() then impounded_until end,
                'isStolen', coalesce(is_stolen, false),
                'stolenAt', stolen_at,
                'reportedStolenAt', reported_stolen_at,
                'recoveredAt', recovered_at,
                'stolenBy', stolen_by,
                'stolenByUsername', (select username from profiles where id = owned_cars.stolen_by)
              ) order by bought_at desc)
              from owned_cars where user_id = auth.uid()), '[]'::jsonb),
    'stolen', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'car', car, 'dealer', dealer, 'plate', plate, 'price', price, 'color', color,
                'fuel', fuel,
                'ownerId', user_id,
                'ownerUsername', (select username from profiles where id = owned_cars.user_id),
                'isStolen', true,
                'isReportedStolen', reported_stolen_at is not null,
                'stolenAt', stolen_at
              )) from owned_cars where stolen_by = auth.uid() and is_stolen = true), '[]'::jsonb),
    'rental', (select jsonb_build_object('id', id, 'car', car, 'company', company, 'days', days, 'endsAt', ends_at, 'deposit', deposit, 'fuel', fuel)
                from car_rentals where user_id = auth.uid() and returned_at is null order by starts_at desc limit 1)
  )
$$;

-- The car parked at a home, in its colour.
create or replace function public.get_flat_parked_car(p_flat_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f record;
  c record;
  res_id uuid;
  res_name text;
  caller uuid := auth.uid();
begin
  select * into f from flats where id = p_flat_id;
  if f.id is not null then
    res_id := coalesce(f.tenant_id, f.owner_id);
  end if;

  -- First check if a car is explicitly parked at this flat
  select * into c from owned_cars
    where parked_flat_id = p_flat_id
      and (impounded_until is null or impounded_until <= now())
    order by bought_at desc limit 1;

  -- Otherwise, find resident's latest non-impounded car
  if c.id is null and res_id is not null then
    select * into c from owned_cars
      where user_id = res_id
        and (impounded_until is null or impounded_until <= now())
      order by bought_at desc limit 1;
  end if;

  if c.id is null then
    return null;
  end if;

  select username into res_name from profiles where id = c.user_id;

  return jsonb_build_object(
    'id', c.id,
    'car', c.car,
    'color', c.color,
    'plate', c.plate,
    'dealer', c.dealer,
    'price', c.price,
    'fuel', c.fuel,
    'ownerId', c.user_id,
    'ownerUsername', coalesce(res_name, 'Resident'),
    'isStolen', coalesce(c.is_stolen, false),
    'stolenBy', c.stolen_by,
    'stolenByUsername', (select username from profiles where id = c.stolen_by),
    'isReportedStolen', c.reported_stolen_at is not null,
    'canDrive', (caller = c.user_id or exists (select 1 from couple_homes ch where ch.flat_id = p_flat_id and (ch.citizen_id = caller or ch.partner_id = caller))),
    'canSteal', (caller is not null and caller <> c.user_id and not coalesce(c.is_stolen, false) and not exists (select 1 from couple_homes ch where ch.flat_id = p_flat_id and (ch.citizen_id = caller or ch.partner_id = caller)))
  );
end $$;

-- Racing in your own colour.
create or replace function public.my_race_cars() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'car', c.car, 'plate', c.plate, 'color', c.color) order by c.price desc nulls last), '[]'::jsonb)
    from owned_cars c where c.user_id = auth.uid() and race_car_ok(auth.uid(), c.id)
$$;

create or replace function public.race_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', r.code, 'hostId', r.host_id, 'host', h.username, 'laps', r.laps, 'max', r.max_racers,
           'status', r.status, 'startsAt', r.starts_at, 'now', now(),
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot, 'split', race_entry_rules() -> 'split',
           'racers', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
                                 'car', c.car, 'color', c.color, 'plate', c.plate, 'finishMs', e.finish_ms, 'place', e.place, 'prize', e.prize) order by e.joined_at)
                               from race_entries e join profiles p on p.id = e.user_id join owned_cars c on c.id = e.owned_car_id
                              where e.race_id = r.id), '[]'::jsonb))
    from races r join profiles h on h.id = r.host_id
   where r.code = upper(p_code)
$$;

-- Profiles: each car with its colour (the rest exactly as before).
create or replace function public.public_profile(p_username text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles; me uuid := auth.uid(); homes_v bigint; cars_v bigint; out jsonb;
begin
  select * into p from profiles where username = lower(trim(p_username));
  if p.id is null then return null; end if;
  if me is not null and exists (select 1 from user_blocks b where (b.blocker_id = me and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = me)) then
    return null;
  end if;

  select coalesce(sum(coalesce((select pp.price from property_purchases pp where pp.flat_id = f.id and pp.user_id = p.id order by pp.bought_at desc limit 1), f.sale_price, 0)), 0)
    into homes_v from flats f where f.owner_id = p.id;
  select coalesce(sum(coalesce(c.price, 0)), 0) into cars_v from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false);

  out := jsonb_build_object(
    'id', p.id, 'username', p.username, 'name', p.display_name, 'look', p.citizen -> 'look',
    'joined', p.created_at,
    'online', not p.chat_off and exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes'),
    'lastSeen', p.last_seen,
    'isMe', p.id = me,
    'worth', jsonb_build_object('total', p.balance + homes_v + cars_v, 'cash', p.balance, 'homes', homes_v, 'cars', cars_v),
    'homes', coalesce((select jsonb_agg(jsonb_build_object('buildingId', f.building_id, 'unit', f.unit, 'type', f.property_type,
                         'bedrooms', f.bedrooms, 'view', f.view, 'owned', f.owner_id = p.id) order by (f.owner_id = p.id) desc)
                       from flats f where f.owner_id = p.id or (f.tenant_id = p.id and (f.tenant_until is null or f.tenant_until > now()))), '[]'::jsonb),
    'starterHome', nullif(p.citizen ->> 'home', ''),
    'cars', coalesce((select jsonb_agg(jsonb_build_object('car', c.car, 'price', c.price, 'plate', c.plate, 'color', c.color) order by c.price desc nulls last)
                      from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false)), '[]'::jsonb),
    'job', (select jsonb_build_object('title', s.title, 'venture', v.name) from venture_staff s left join ventures v on v.id = s.venture_id
             where s.user_id = p.id order by s.hired_at desc limit 1),
    'partner', (select jsonb_build_object('username', o.username, 'status', r.status)
                  from relationships r join profiles o on o.id = case when r.man_id = p.id then r.woman_id else r.man_id end
                 where p.id in (r.man_id, r.woman_id) and r.status <> 'ended' order by r.created_at desc limit 1),
    'followers', (select count(*) from follows where followee_id = p.id),
    'following', (select count(*) from follows where follower_id = p.id),
    'friends', (select count(*) from friendships where status = 'accepted' and p.id in (user_id, friend_id)),
    'iFollow', exists (select 1 from follows where follower_id = me and followee_id = p.id),
    'friend', friend_status(me, p.id),
    'generous', is_generous(p.id),
    'wins', (select count(*) from game_results where user_id = p.id and outcome = 'win' and mode = 'multiplayer'),
    'partiesHosted', (select count(*) from invites where host_id = p.id and kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(cancelled, false)),
    'topRank', (select r.n from (select (x ->> 'id')::uuid as id, row_number() over () as n from jsonb_array_elements(top_users_week(10)) x) r where r.id = p.id),
    'richRank', (select r.n from (select (x ->> 'id')::uuid as id, row_number() over () as n from jsonb_array_elements(richest_users(50)) x) r where r.id = p.id),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'n', f.n, 'at', f.created_at,
                          'other', case when o.id is null then null else jsonb_build_object('id', o.id, 'username', o.username) end) order by f.id desc)
                        from (select * from feed_posts where actor_id = p.id order by id desc limit 8) f left join profiles o on o.id = f.other_id), '[]'::jsonb)
  );
  return out;
end $$;
