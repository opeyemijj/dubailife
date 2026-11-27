-- Family trips (src/data/flights/trips.json, mirrored exactly by trip_rule(); checked by scripts/check-life-config.mjs):
-- the booker pays for everyone (children at kidFare), each partner accepts an invite within inviteHours and then flies
-- in the seat beside the booker's (a declined or expired invite refunds their fare to the booker); children always
-- travel with the booker. A honeymoon needs a partner you're married to; a babymoon or gender reveal, a baby on the way.

create or replace function public.trip_rule() returns jsonb
language sql immutable as $$
  select '{"kidFare":0.5,"inviteHours":24}'::jsonb
$$;

/** A seat in this cabin (as book_flight gives). */
create or replace function public.random_seat(p_class text) returns text
language sql volatile as $$
  select case p_class
    when 'first' then (1 + floor(random() * 3))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    when 'business' then (6 + floor(random() * 8))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    else (20 + floor(random() * 40))::int || (array['A','B','C','D','E','F','G','H'])[1 + floor(random() * 8)::int] end
$$;
/** The n-th seat beside this one in the same row (23A → 23B, 23C…). */
create or replace function public.seat_beside(p_seat text, p_n int) returns text
language sql immutable as $$
  select regexp_replace(p_seat, '[A-Z]$', '') || chr(least(ascii('K'), ascii(right(p_seat, 1)) + p_n))
$$;

create table if not exists public.trips (
  id bigint generated always as identity primary key,
  booker_id uuid not null references public.profiles (id) on delete cascade,
  flight_id bigint not null references public.flights (id) on delete cascade,
  from_city text not null,
  to_city text not null,
  class text not null,
  purpose text not null check (purpose in ('vacation', 'honeymoon', 'babymoon', 'gender_reveal')),
  kids bigint[] not null default '{}',
  -- A gender reveal: the baby whose news it is.
  reveal_child bigint references public.children (id) on delete set null,
  fare bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists trips_booker on public.trips (booker_id, id desc);
create index if not exists trips_flight on public.trips (flight_id);
alter table public.trips enable row level security;

create table if not exists public.trip_guests (
  trip_id bigint not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'expired')),
  fare bigint not null,
  seat text not null,
  flight_id bigint references public.flights (id) on delete set null,
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (trip_id, user_id)
);
create index if not exists trip_guests_user on public.trip_guests (user_id, status);
alter table public.trip_guests enable row level security;

/** Partners in a relationship that hasn't ended. */
create or replace function public.are_partners(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from relationships where status <> 'ended' and (man_id, woman_id) in ((a, b), (b, a)))
$$;
revoke all on function public.are_partners(uuid, uuid) from public, anon, authenticated;

/** Book a family trip: my flight, a seat held for each partner (their invite), my children with me. Returns my
    booking (as book_flight does) and the trip. */
create or replace function public.book_family_trip(p_from text, p_to text, p_class text, p_purpose text, p_partners uuid[], p_kids bigint[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fare bigint := flight_fare(p_from, p_to, p_class); need text := visa_country(p_to);
        partners uuid[] := coalesce(p_partners, '{}'); kids bigint[] := coalesce(p_kids, '{}');
        kid_fare bigint; total bigint; fid bigint; seat text; tid bigint; p uuid; n int := 0; reveal bigint; first_partner uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if fare is null then raise exception 'bad_route'; end if;
  if p_from <> player_city(me) then raise exception 'wrong_city'; end if;
  if p_purpose not in ('vacation', 'honeymoon', 'babymoon', 'gender_reveal') then raise exception 'bad_purpose'; end if;
  if need is not null then
    perform my_visa(need);
    if not has_visa(me, need) then raise exception 'visa_required'; end if;
  end if;
  if cardinality(partners) > 4 or cardinality(kids) > 8 then raise exception 'too_many'; end if;
  foreach p in array partners loop
    if p = me or not are_partners(me, p) then raise exception 'not_your_partner'; end if;
  end loop;
  -- Children of mine who've been born.
  if exists (select 1 from unnest(kids) k where not exists (select 1 from children c where c.id = k and me in (c.mother_id, c.father_id) and c.due_at <= now())) then
    raise exception 'not_your_child';
  end if;
  if p_purpose = 'honeymoon' and not exists (select 1 from relationships where status = 'married' and (man_id = me or woman_id = me)
       and (cardinality(partners) = 0 or (case when man_id = me then woman_id else man_id end) = any (partners))) then
    raise exception 'not_married';
  end if;
  if p_purpose in ('babymoon', 'gender_reveal') then
    select id into reveal from children where me in (mother_id, father_id) and due_at > now() order by due_at limit 1;
    if reveal is null then raise exception 'not_expecting'; end if;
  end if;

  kid_fare := round(fare * (trip_rule() ->> 'kidFare')::numeric);
  total := fare + fare * cardinality(partners) + kid_fare * cardinality(kids);
  update flights set status = 'cancelled' where user_id = me and status in ('booked', 'boarded');
  seat := random_seat(p_class);
  insert into flights (user_id, from_city, to_city, class, fare, seat) values (me, p_from, p_to, p_class, fare + kid_fare * cardinality(kids), seat) returning id into fid;
  insert into trips (booker_id, flight_id, from_city, to_city, class, purpose, kids, reveal_child, fare)
    values (me, fid, p_from, p_to, p_class, p_purpose, kids, case when p_purpose = 'gender_reveal' then reveal end, total) returning id into tid;
  foreach p in array partners loop
    n := n + 1;
    first_partner := coalesce(first_partner, p);
    insert into trip_guests (trip_id, user_id, fare, seat) values (tid, p, fare, seat_beside(seat, n + cardinality(kids)));
  end loop;
  perform coin_move(me, -total, 'spend', 'Family trip: Dubai Life Airways, ' || initcap(replace(p_from, '-', ' ')) || ' to ' || initcap(replace(p_to, '-', ' '))
    || ' (' || 1 + cardinality(partners) + cardinality(kids) || ' travellers, ' || p_class || ')', 'trip:' || tid);
  if cardinality(partners) > 0 or cardinality(kids) > 0 or p_purpose <> 'vacation' then
    perform feed_post(me, 'trip', jsonb_build_object('purpose', p_purpose, 'to', p_to, 'kids', cardinality(kids), 'partners', cardinality(partners)), first_partner, 'trip:' || tid);
  end if;
  return jsonb_build_object('id', fid, 'seat', seat, 'fare', total, 'class', p_class, 'from', p_from, 'to', p_to, 'trip', tid);
end $$;
revoke all on function public.book_family_trip(text, text, text, text, uuid[], bigint[]) from public, anon;
grant execute on function public.book_family_trip(text, text, text, text, uuid[], bigint[]) to authenticated;

/** Invites nobody answered in time: their fare goes back to the booker. */
create or replace function public.expire_trip_invites() returns void
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  for g in update trip_guests set status = 'expired', responded_at = now()
            where status = 'invited' and invited_at < now() - make_interval(hours => (trip_rule() ->> 'inviteHours')::int)
          returning trip_id, user_id, fare loop
    perform coin_move((select booker_id from trips where id = g.trip_id), g.fare, 'refund', 'Family trip: an invite wasn''t answered', 'trip-refund:' || g.trip_id || ':' || g.user_id);
  end loop;
end $$;
revoke all on function public.expire_trip_invites() from public, anon, authenticated;

/** Answer a trip invite. Accepting books my seat beside the booker's (already paid; I must be in the city it leaves
    from, with a visa if it needs one) and returns my booking; declining refunds my fare to the booker. */
create or replace function public.respond_trip(p_trip bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t trips; g trip_guests; fid bigint; need text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform expire_trip_invites();
  select * into g from trip_guests where trip_id = p_trip and user_id = me for update;
  if g.trip_id is null or g.status <> 'invited' then raise exception 'no_invite'; end if;
  select * into t from trips where id = p_trip;
  if not p_accept then
    update trip_guests set status = 'declined', responded_at = now() where trip_id = p_trip and user_id = me;
    perform coin_move(t.booker_id, g.fare, 'refund', 'Family trip: an invite was declined', 'trip-refund:' || p_trip || ':' || me);
    return null;
  end if;
  if player_city(me) <> t.from_city then raise exception 'wrong_city'; end if;
  need := visa_country(t.to_city);
  if need is not null then
    perform my_visa(need);
    if not has_visa(me, need) then raise exception 'visa_required'; end if;
  end if;
  update flights set status = 'cancelled' where user_id = me and status in ('booked', 'boarded');
  insert into flights (user_id, from_city, to_city, class, fare, seat) values (me, t.from_city, t.to_city, t.class, g.fare, g.seat) returning id into fid;
  update trip_guests set status = 'accepted', responded_at = now(), flight_id = fid where trip_id = p_trip and user_id = me;
  return jsonb_build_object('id', fid, 'seat', g.seat, 'fare', g.fare, 'class', t.class, 'from', t.from_city, 'to', t.to_city, 'trip', p_trip);
end $$;
revoke all on function public.respond_trip(bigint, boolean) from public, anon;
grant execute on function public.respond_trip(bigint, boolean) to authenticated;

/** My trip booking still to fly (as the booker or a guest who accepted), for the journey to start from. */
create or replace function public.my_trip_flight(p_trip bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', f.id, 'seat', f.seat, 'fare', f.fare, 'class', f.class, 'from', f.from_city, 'to', f.to_city, 'trip', t.id)
    from trips t join flights f on f.id = coalesce((select flight_id from trip_guests where trip_id = t.id and user_id = auth.uid() and status = 'accepted'),
                                                    case when t.booker_id = auth.uid() then t.flight_id end)
   where t.id = p_trip and f.status in ('booked', 'boarded') and f.user_id = auth.uid()
$$;
revoke all on function public.my_trip_flight(bigint) from public, anon;
grant execute on function public.my_trip_flight(bigint) to authenticated;

/** My trips: invites waiting for me, and the trip of my latest flight (who's with me: partners with their looks,
    children, and a gender reveal's news). */
create or replace function public.my_trips() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cur trips; latest bigint;
begin
  if me is null then return null; end if;
  perform expire_trip_invites();
  select id into latest from flights where user_id = me and status <> 'cancelled' order by id desc limit 1;
  select * into cur from trips where flight_id = latest or id = (select trip_id from trip_guests where flight_id = latest limit 1) limit 1;
  return jsonb_build_object(
    'invites', coalesce((select jsonb_agg(jsonb_build_object('trip', t.id, 'from', t.from_city, 'to', t.to_city, 'class', t.class, 'purpose', t.purpose,
        'kids', cardinality(t.kids), 'by', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look'),
        'expiresAt', g.invited_at + make_interval(hours => (trip_rule() ->> 'inviteHours')::int)) order by t.id desc)
      from trip_guests g join trips t on t.id = g.trip_id join profiles p on p.id = t.booker_id
     where g.user_id = me and g.status = 'invited'), '[]'::jsonb),
    'current', case when cur.id is null then null else jsonb_build_object(
      'trip', cur.id, 'purpose', cur.purpose, 'to', cur.to_city, 'mine', cur.booker_id = me,
      'flightStatus', (select status from flights where id = latest),
      'booker', (select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look') from profiles p where p.id = cur.booker_id),
      'guests', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'status', g.status, 'look', p.citizen -> 'look'))
                            from trip_guests g join profiles p on p.id = g.user_id where g.trip_id = cur.id), '[]'::jsonb),
      'kids', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'gender', c.gender)) from children c where c.id = any (cur.kids)), '[]'::jsonb),
      'reveal', (select c.gender from children c where c.id = cur.reveal_child)) end
  );
end $$;
revoke all on function public.my_trips() from public, anon;
grant execute on function public.my_trips() to authenticated;
