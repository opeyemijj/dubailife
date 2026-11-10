-- Event halls in the hotels (src/components/arcade/games/events): book a hall for a 4-hour slot, pay the hall,
-- guests and vendors, and a party invite is created at the hall so guests RSVP and come as they do to parties.
-- The host then designs the hall and runs the day in the game; the design and its score are saved here.
-- Prices, capacities, vendors, the slot and guest options are mirrored from src/data/venues/halls.json
-- (scripts/check-life-config.mjs).

create table if not exists public.hall_bookings (
  id bigint generated always as identity primary key,
  host_id uuid not null references public.profiles (id) on delete cascade,
  hall text not null,
  event_type text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  guests int not null,
  vendors text[] not null default '{}',
  cost bigint not null,
  invite_code text,
  design jsonb,
  score int check (score is null or score between 0 and 100000),
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists hall_bookings_hall on public.hall_bookings (hall, starts_at);
create index if not exists hall_bookings_host on public.hall_bookings (host_id, starts_at desc);
alter table public.hall_bookings enable row level security;
drop policy if exists "own hall bookings" on public.hall_bookings;
create policy "own hall bookings" on public.hall_bookings for select using (host_id = auth.uid());

/** A hall: its hotel (place), name, base price, price per guest and capacity; null if unknown. */
create or replace function public.hall_rule(p_hall text) returns jsonb
language sql immutable as $$
  select (case p_hall
    when 'baniyas-ballroom'           then '{"place":"grand-hyatt-dubai","name":"Baniyas Ballroom","base":18000,"perGuest":300,"capacity":2500}'
    when 'hyatt-regency-ballroom'     then '{"place":"hyatt-regency-dubai","name":"Hyatt Regency Ballroom","base":12000,"perGuest":250,"capacity":800}'
    when 'atlantis-grand-ballroom'    then '{"place":"atlantis-the-palm","name":"Atlantis Grand Ballroom","base":20000,"perGuest":400,"capacity":1500}'
    when 'palace-fountain-terrace'    then '{"place":"palace-downtown","name":"Palace Fountain Terrace","base":25000,"perGuest":450,"capacity":300}'
    when 'madinat-waterside'          then '{"place":"madinat-jumeirah","name":"Madinat Waterside Hall","base":30000,"perGuest":500,"capacity":600}'
    when 'one-zaabeel-sky-ballroom'   then '{"place":"one-zaabeel","name":"One Za''abeel Sky Ballroom","base":40000,"perGuest":600,"capacity":500}'
    when 'samaya-ballroom'            then '{"place":"ritz-carlton-difc","name":"Samaya Ballroom","base":30000,"perGuest":500,"capacity":1000}'
    when 'burj-al-arab-royal-terrace' then '{"place":"burj-al-arab","name":"Burj Al Arab Royal Terrace","base":50000,"perGuest":900,"capacity":200}'
  end)::jsonb
$$;

/** What a vendor costs for this many guests; null if unknown. */
create or replace function public.hall_vendor_price(p_vendor text, p_guests int) returns int
language sql immutable as $$
  select case p_vendor
    when 'catering' then 180 * p_guests
    when 'dj' then 6000 when 'band' then 8000 when 'photographer' then 7000 when 'cake' then 4500 when 'florist' then 5000
  end
$$;

create or replace function public.book_hall(p_hall text, p_type text, p_starts_at timestamptz, p_guests int, p_vendors text[], p_title text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); h jsonb := public.hall_rule(p_hall); total bigint; v text; b hall_bookings; c text;
  ends timestamptz := p_starts_at + interval '4 hours';
  route text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if h is null then raise exception 'unknown_hall'; end if;
  if p_type not in ('wedding', 'engagement', 'mehndi', 'birthday', 'baby-shower', 'gender-reveal', 'graduation', 'anniversary', 'gala', 'eid') then raise exception 'bad_event_type'; end if;
  if p_guests not in (20, 50, 100, 200) or p_guests > (h ->> 'capacity')::int then raise exception 'bad_guests'; end if;
  if p_starts_at < now() + interval '1 hour' or p_starts_at > now() + interval '30 days' then raise exception 'bad_time'; end if;
  -- Free unless another booking, or a party someone made at the hall's venue, overlaps.
  if exists (select 1 from hall_bookings where hall = p_hall and status = 'booked' and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, ends))
     or exists (select 1 from invites where invites.place_id = h ->> 'place' and invites.venue_id = p_hall and not cancelled and starts_at < ends and ends_at > p_starts_at) then
    raise exception 'hall_booked';
  end if;
  total := (h ->> 'base')::int + (h ->> 'perGuest')::int * p_guests;
  foreach v in array coalesce(p_vendors, '{}') loop
    if public.hall_vendor_price(v, p_guests) is null then raise exception 'bad_vendor'; end if;
    total := total + public.hall_vendor_price(v, p_guests);
  end loop;
  insert into hall_bookings (host_id, hall, event_type, title, starts_at, ends_at, guests, vendors, cost)
    values (me, p_hall, p_type, left(coalesce(nullif(trim(p_title), ''), 'Our event'), 60), p_starts_at, ends, p_guests,
            (select array(select distinct unnest(coalesce(p_vendors, '{}')))), total)
    returning * into b;
  perform coin_move(me, -total, 'spend', 'Hall booking: ' || (h ->> 'name'), 'hall:' || b.id);
  -- The party invite: guests RSVP and arrive in the hall itself (/hall/<booking>), as they do to any party.
  route := '/hall/' || b.id;
  c := public.new_invite_code();
  insert into invites (code, kind, host_id, title, label, route, place_id, venue_id, starts_at, ends_at, max_guests)
    values (c, 'dinner', me, b.title, left((h ->> 'name'), 80), route, h ->> 'place', p_hall, p_starts_at, ends, p_guests);
  update hall_bookings set invite_code = c where id = b.id;
  return jsonb_build_object('id', b.id, 'code', c, 'cost', total);
end $$;
grant execute on function public.book_hall(text, text, timestamptz, int, text[], text) to authenticated;

/** The host saves the hall's design and how the day went. */
create or replace function public.save_hall_design(p_booking bigint, p_design jsonb, p_score int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update hall_bookings set design = p_design, score = greatest(0, least(100000, coalesce(p_score, 0)))
    where id = p_booking and host_id = auth.uid() and status = 'booked';
  if not found then raise exception 'not_your_booking'; end if;
end $$;
grant execute on function public.save_hall_design(bigint, jsonb, int) to authenticated;

/** Cancel: half the cost back if it's more than a day away, nothing after that; the invite is called off. */
create or replace function public.cancel_hall_booking(p_booking bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare b hall_bookings; back bigint := 0;
begin
  select * into b from hall_bookings where id = p_booking and host_id = auth.uid() and status = 'booked' for update;
  if b.id is null then raise exception 'not_your_booking'; end if;
  if b.starts_at > now() + interval '24 hours' then back := b.cost / 2; end if;
  update hall_bookings set status = 'cancelled' where id = b.id;
  update invites set cancelled = true where code = b.invite_code;
  if back > 0 then perform coin_move(auth.uid(), back, 'refund', 'Hall booking cancelled', 'hall-cancel:' || b.id); end if;
  return back;
end $$;
grant execute on function public.cancel_hall_booking(bigint) to authenticated;

/** My bookings that are coming up or ended in the last week. */
create or replace function public.my_hall_bookings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'hall', hall, 'type', event_type, 'title', title, 'startsAt', starts_at, 'endsAt', ends_at,
    'guests', guests, 'vendors', to_jsonb(vendors), 'cost', cost, 'code', invite_code, 'design', design, 'score', score) order by starts_at), '[]'::jsonb)
  from hall_bookings where host_id = auth.uid() and status = 'booked' and ends_at > now() - interval '7 days'
$$;
grant execute on function public.my_hall_bookings() to authenticated;

/** The event on at a hall right now, for everyone there (guests watch it live): its title, type, design and host. */
create or replace function public.hall_event_live(p_hall text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'title', b.title, 'type', b.event_type, 'design', b.design, 'startsAt', b.starts_at, 'endsAt', b.ends_at,
    'host', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look'))
  from hall_bookings b join profiles p on p.id = b.host_id
  where b.hall = p_hall and b.status = 'booked' and now() between b.starts_at and b.ends_at
  order by b.starts_at desc limit 1
$$;
grant execute on function public.hall_event_live(text) to authenticated;
