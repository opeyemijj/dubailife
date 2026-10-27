-- Relationships and weddings (the Hayati app). Only what UAE law allows: a man and a woman, one partner
-- at a time, and both agreeing at every step (asking out, the proposal, saying "I do").
--   dating → engaged (proposal with a ring) → married (a wedding with guests, roles and gifts)
-- Texts and numbers: src/data/life/love.json (checked by scripts/check-life-config.mjs).

create or replace function public.gender_of(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select citizen -> 'look' ->> 'gender' from profiles where id = p_user
$$;
revoke all on function public.gender_of(uuid) from public, anon, authenticated;

create table if not exists public.relationships (
  id bigint generated always as identity primary key,
  man_id uuid not null references public.profiles (id) on delete cascade,
  woman_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'dating' check (status in ('dating', 'engaged', 'married', 'ended')),
  level int not null default 0,
  ring text,
  created_at timestamptz not null default now(),
  engaged_at timestamptz,
  married_at timestamptz,
  ended_at timestamptz,
  ended_by uuid
);
-- One partner at a time.
create unique index if not exists relationships_one_man on public.relationships (man_id) where status <> 'ended';
create unique index if not exists relationships_one_woman on public.relationships (woman_id) where status <> 'ended';

create table if not exists public.love_requests (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('date', 'propose')),
  ring text,
  place text,
  message text check (char_length(message) <= 280),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists love_requests_to on public.love_requests (to_id, status);

create table if not exists public.love_days (
  relationship_id bigint not null references public.relationships (id) on delete cascade,
  day int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('love', 'date')),
  place text,
  primary key (relationship_id, day, user_id, kind)
);
create table if not exists public.love_dates_counted (
  relationship_id bigint not null references public.relationships (id) on delete cascade,
  day int not null,
  primary key (relationship_id, day)
);

create table if not exists public.weddings (
  id bigint generated always as identity primary key,
  relationship_id bigint not null references public.relationships (id) on delete cascade,
  code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  venue text not null,
  starts_at timestamptz not null,
  guests_max int not null,
  ceremony text not null check (ceremony in ('civil', 'religious')),
  cost bigint not null,
  paid_by uuid references public.profiles (id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'done', 'missed', 'cancelled')),
  i_do_man boolean not null default false,
  i_do_woman boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists weddings_one_planned on public.weddings (relationship_id) where status = 'planned';

create table if not exists public.wedding_guests (
  wedding_id bigint not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'guest' check (role in ('guest', 'best_man', 'maid_of_honour', 'bridesmaid', 'groomsman')),
  rsvp text not null default 'yes' check (rsvp in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create table if not exists public.wedding_gifts (
  id bigint generated always as identity primary key,
  wedding_id bigint not null references public.weddings (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  message text check (char_length(message) <= 200),
  created_at timestamptz not null default now()
);

alter table public.relationships enable row level security;
alter table public.love_requests enable row level security;
alter table public.love_days enable row level security;
alter table public.love_dates_counted enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_guests enable row level security;
alter table public.wedding_gifts enable row level security;
drop policy if exists "see own relationship" on public.relationships;
create policy "see own relationship" on public.relationships for select using (auth.uid() in (man_id, woman_id));
drop policy if exists "see own love requests" on public.love_requests;
create policy "see own love requests" on public.love_requests for select using (auth.uid() in (from_id, to_id));
drop policy if exists "see weddings" on public.weddings;
create policy "see weddings" on public.weddings for select using (auth.uid() is not null);
drop policy if exists "see wedding guests" on public.wedding_guests;
create policy "see wedding guests" on public.wedding_guests for select using (auth.uid() is not null);
-- Everything else goes through the functions below.

/** My current relationship (not ended). */
create or replace function public.my_relationship(p_user uuid) returns relationships
language sql stable security definer set search_path = public as $$
  select * from relationships where status <> 'ended' and p_user in (man_id, woman_id) limit 1
$$;
revoke all on function public.my_relationship(uuid) from public, anon, authenticated;

create or replace function public.partner_of(r relationships, p_user uuid) returns uuid
language sql immutable as $$ select case when r.man_id = p_user then r.woman_id else r.man_id end $$;

create or replace function public.ring_price(p_ring text) returns int
language sql immutable as $$
  select case p_ring when 'silver' then 2500 when 'gold' then 12000 when 'diamond' then 45000 when 'emerald' then 150000 end
$$;
create or replace function public.date_place(p_place text) returns boolean
language sql immutable as $$
  select p_place in ('dubai-fountain', 'the-pointe', 'kite-beach', 'address-skyview', 'madinat-jumeirah', 'dubai-frame', 'burj-al-arab', 'atlantis-the-royal')
$$;
/** {base, per guest} for each wedding venue. */
create or replace function public.venue_price(p_venue text) returns int[]
language sql immutable as $$
  select case p_venue
    when 'kite-beach' then array[5000, 150]
    when 'palace-downtown' then array[25000, 450]
    when 'madinat-jumeirah' then array[30000, 500]
    when 'atlantis-the-palm' then array[20000, 400]
    when 'one-zaabeel' then array[40000, 600]
    when 'burj-al-arab' then array[50000, 900] end
$$;
create or replace function public.ceremony_fee(p_ceremony text) returns int
language sql immutable as $$ select case p_ceremony when 'civil' then 1500 when 'religious' then 1000 end $$;

-- ---------------------------------------------------------------- asking out

/** Ask a friend out. Only a man and a woman, both single, and friends first. */
create or replace function public.ask_out(p_to uuid, p_message text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g1 text := public.gender_of(auth.uid()); g2 text := public.gender_of(p_to); rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_to = me or not public.are_friends(me, p_to) then raise exception 'friends_first'; end if;
  if g1 is null or g2 is null or g1 = g2 then raise exception 'not_allowed'; end if;
  if (public.my_relationship(me)).id is not null then raise exception 'you_are_taken'; end if;
  if (public.my_relationship(p_to)).id is not null then raise exception 'they_are_taken'; end if;
  if exists (select 1 from relationships where me in (man_id, woman_id) and status = 'ended' and ended_at > now() - interval '3 days') then raise exception 'cooling_off'; end if;
  if exists (select 1 from love_requests where from_id = me and to_id = p_to and status = 'pending') then raise exception 'already_asked'; end if;
  insert into love_requests (from_id, to_id, kind, message) values (me, p_to, 'date', nullif(trim(p_message), '')) returning id into rid;
  return rid;
end $$;
grant execute on function public.ask_out(uuid, text) to authenticated;

/** Propose: dating long enough, with a ring bought now (returned to the shop if the answer is no). */
create or replace function public.propose(p_ring text, p_place text, p_message text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid()); price int := public.ring_price(p_ring); rid bigint;
begin
  if r.id is null or r.status <> 'dating' then raise exception 'not_dating'; end if;
  if r.level < 10 then raise exception 'too_soon'; end if;
  if price is null then raise exception 'unknown_ring'; end if;
  if not public.date_place(p_place) then raise exception 'unknown_place'; end if;
  if exists (select 1 from love_requests where kind = 'propose' and status = 'pending' and (from_id, to_id) in ((r.man_id, r.woman_id), (r.woman_id, r.man_id))) then raise exception 'already_proposed'; end if;
  insert into love_requests (from_id, to_id, kind, ring, place, message) values (me, public.partner_of(r, me), 'propose', p_ring, p_place, nullif(trim(p_message), '')) returning id into rid;
  perform coin_move(me, -price, 'spend', 'Engagement ring', 'ring:' || rid);
  return rid;
end $$;
grant execute on function public.propose(text, text, text) to authenticated;

/** Say yes or no to a date or a proposal. */
create or replace function public.love_respond(p_request bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); q love_requests; r relationships;
begin
  select * into q from love_requests where id = p_request and to_id = me and status = 'pending' for update;
  if q.id is null then raise exception 'no_request'; end if;
  if not p_accept then
    update love_requests set status = 'declined' where id = q.id;
    if q.kind = 'propose' then perform coin_move(q.from_id, public.ring_price(q.ring), 'refund', 'Engagement ring returned to the shop', 'ring-refund:' || q.id); end if;
    return;
  end if;
  if q.kind = 'date' then
    if (public.my_relationship(me)).id is not null or (public.my_relationship(q.from_id)).id is not null then raise exception 'taken'; end if;
    insert into relationships (man_id, woman_id)
      values (case when public.gender_of(me) = 'man' then me else q.from_id end, case when public.gender_of(me) = 'man' then q.from_id else me end);
    -- Other people who asked either of them out are let down gently.
    update love_requests set status = 'cancelled' where status = 'pending' and kind = 'date' and id <> q.id and (to_id in (me, q.from_id) or from_id in (me, q.from_id));
  else
    r := public.my_relationship(me);
    if r.id is null or r.status <> 'dating' or public.partner_of(r, me) <> q.from_id then raise exception 'not_dating'; end if;
    update relationships set status = 'engaged', engaged_at = now(), ring = q.ring where id = r.id;
    perform public.add_points(me, 'wellbeing', 20, 'engaged:' || r.id || ':' || me);
    perform public.add_points(q.from_id, 'wellbeing', 20, 'engaged:' || r.id || ':' || q.from_id);
  end if;
  update love_requests set status = 'accepted' where id = q.id;
end $$;
grant execute on function public.love_respond(bigint, boolean) to authenticated;

create or replace function public.cancel_love_request(p_request bigint) returns void
language plpgsql security definer set search_path = public as $$
declare q love_requests;
begin
  select * into q from love_requests where id = p_request and from_id = auth.uid() and status = 'pending' for update;
  if q.id is null then raise exception 'no_request'; end if;
  update love_requests set status = 'cancelled' where id = q.id;
  if q.kind = 'propose' then perform coin_move(q.from_id, public.ring_price(q.ring), 'refund', 'Engagement ring returned to the shop', 'ring-refund:' || q.id); end if;
end $$;
grant execute on function public.cancel_love_request(bigint) to authenticated;

-- ---------------------------------------------------------------- growing closer

/** A little love every day (+1 each, once a day). */
create or replace function public.show_love() returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid()); lv int;
begin
  if r.id is null then raise exception 'single'; end if;
  insert into love_days (relationship_id, day, user_id, kind) values (r.id, public.life_day(now()), me, 'love') on conflict do nothing;
  if not found then raise exception 'already_today'; end if;
  update relationships set level = level + 1 where id = r.id returning level into lv;
  return lv;
end $$;
grant execute on function public.show_love() to authenticated;

/** Check in on a date at a place. When both of you check in at the same place on the same day, +5. */
create or replace function public.log_date(p_place text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid()); d int := public.life_day(now()); theirs text; lv int;
begin
  if r.id is null then raise exception 'single'; end if;
  if not public.date_place(p_place) then raise exception 'unknown_place'; end if;
  insert into love_days (relationship_id, day, user_id, kind, place) values (r.id, d, me, 'date', p_place)
    on conflict (relationship_id, day, user_id, kind) do update set place = excluded.place;
  select place into theirs from love_days where relationship_id = r.id and day = d and user_id = public.partner_of(r, me) and kind = 'date';
  if theirs is distinct from p_place then return jsonb_build_object('together', false); end if;
  insert into love_dates_counted (relationship_id, day) values (r.id, d) on conflict do nothing;
  if found then update relationships set level = level + 5 where id = r.id; end if;
  select level into lv from relationships where id = r.id;
  return jsonb_build_object('together', true, 'level', lv);
end $$;
grant execute on function public.log_date(text) to authenticated;

/** Breaking up (or divorcing). Either of you can; a planned wedding is cancelled. */
create or replace function public.end_relationship() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid());
begin
  if r.id is null then raise exception 'single'; end if;
  update relationships set status = 'ended', ended_at = now(), ended_by = me where id = r.id;
  update weddings set status = 'cancelled' where relationship_id = r.id and status = 'planned';
  update love_requests set status = 'cancelled' where status = 'pending' and (from_id, to_id) in ((r.man_id, r.woman_id), (r.woman_id, r.man_id));
end $$;
grant execute on function public.end_relationship() to authenticated;

-- ---------------------------------------------------------------- the wedding

/** Book the wedding: venue, a 30-minute slot between an hour and 30 days away, guests and the ceremony. */
create or replace function public.plan_wedding(p_venue text, p_starts_at timestamptz, p_guests int, p_ceremony text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid()); vp int[] := public.venue_price(p_venue); total bigint; w weddings;
begin
  if r.id is null or r.status <> 'engaged' then raise exception 'not_engaged'; end if;
  if vp is null then raise exception 'unknown_venue'; end if;
  if p_guests not in (20, 50, 100, 200) then raise exception 'bad_guests'; end if;
  if public.ceremony_fee(p_ceremony) is null then raise exception 'unknown_ceremony'; end if;
  if p_starts_at < now() + interval '1 hour' or p_starts_at > now() + interval '30 days' then raise exception 'bad_time'; end if;
  if exists (select 1 from weddings where venue = p_venue and status = 'planned' and tstzrange(starts_at, starts_at + interval '30 minutes') && tstzrange(p_starts_at, p_starts_at + interval '30 minutes')) then raise exception 'venue_booked'; end if;
  total := vp[1] + vp[2] * p_guests + public.ceremony_fee(p_ceremony);
  insert into weddings (relationship_id, venue, starts_at, guests_max, ceremony, cost, paid_by) values (r.id, p_venue, p_starts_at, p_guests, p_ceremony, total, me) returning * into w;
  perform coin_move(me, -total, 'spend', 'Wedding booking', 'wedding:' || w.id);
  return w.code;
end $$;
grant execute on function public.plan_wedding(text, timestamptz, int, text) to authenticated;

create or replace function public.cancel_wedding() returns void
language plpgsql security definer set search_path = public as $$
declare r relationships := public.my_relationship(auth.uid()); w weddings;
begin
  select * into w from weddings where relationship_id = r.id and status = 'planned' for update;
  if w.id is null then raise exception 'no_wedding'; end if;
  update weddings set status = 'cancelled' where id = w.id;
  -- Venues keep half once booked.
  if w.paid_by is not null then perform coin_move(w.paid_by, w.cost / 2, 'refund', 'Wedding cancelled (half refunded)', 'wedding-refund:' || w.id); end if;
end $$;
grant execute on function public.cancel_wedding() to authenticated;

/** A wedding past its window without both "I do"s is missed. */
create or replace function public.settle_wedding(p_wedding bigint) returns void
language sql security definer set search_path = public as $$
  update weddings set status = 'missed' where id = p_wedding and status = 'planned' and now() > starts_at + interval '45 minutes'
$$;
revoke all on function public.settle_wedding(bigint) from public, anon, authenticated;

create or replace function public.wedding_view(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w weddings; r relationships;
begin
  select * into w from weddings where code = p_code;
  if w.id is null then raise exception 'no_wedding'; end if;
  perform public.settle_wedding(w.id);
  select * into w from weddings where id = w.id;
  select * into r from relationships where id = w.relationship_id;
  return jsonb_build_object(
    'code', w.code, 'venue', w.venue, 'startsAt', w.starts_at, 'guestsMax', w.guests_max, 'ceremony', w.ceremony, 'status', w.status,
    'iDoMan', w.i_do_man, 'iDoWoman', w.i_do_woman, 'ring', r.ring,
    'man', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = r.man_id),
    'woman', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = r.woman_id),
    'me', case when me = r.man_id then 'man' when me = r.woman_id then 'woman'
               when exists (select 1 from wedding_guests where wedding_id = w.id and user_id = me and rsvp = 'yes') then 'guest' else 'none' end,
    'guests', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'role', g.role) order by g.role <> 'guest' desc, g.created_at)
               from wedding_guests g join profiles p on p.id = g.user_id where g.wedding_id = w.id and g.rsvp = 'yes'), '[]'::jsonb),
    'gifts', coalesce((select sum(amount) from wedding_gifts where wedding_id = w.id), 0)
  );
end $$;
grant execute on function public.wedding_view(text) to authenticated;

create or replace function public.rsvp_wedding(p_code text, p_yes boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w weddings; r relationships;
begin
  select * into w from weddings where code = p_code and status = 'planned' for update;
  if w.id is null then raise exception 'no_wedding'; end if;
  select * into r from relationships where id = w.relationship_id;
  if me in (r.man_id, r.woman_id) then raise exception 'its_your_wedding'; end if;
  if p_yes and (select count(*) from wedding_guests where wedding_id = w.id and rsvp = 'yes' and user_id <> me) >= w.guests_max then raise exception 'wedding_full'; end if;
  insert into wedding_guests (wedding_id, user_id, rsvp) values (w.id, me, case when p_yes then 'yes' else 'no' end)
    on conflict (wedding_id, user_id) do update set rsvp = excluded.rsvp;
end $$;
grant execute on function public.rsvp_wedding(text, boolean) to authenticated;

/** The couple gives a guest a role: best man and maid of honour (one each), bridesmaids and groomsmen (six each). */
create or replace function public.set_wedding_role(p_code text, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w weddings; r relationships; cap int;
begin
  select * into w from weddings where code = p_code and status = 'planned' for update;
  select * into r from relationships where id = w.relationship_id;
  if w.id is null or me not in (r.man_id, r.woman_id) then raise exception 'not_your_wedding'; end if;
  cap := case p_role when 'best_man' then 1 when 'maid_of_honour' then 1 when 'bridesmaid' then 6 when 'groomsman' then 6 when 'guest' then 1000 end;
  if cap is null then raise exception 'unknown_role'; end if;
  if not exists (select 1 from wedding_guests where wedding_id = w.id and user_id = p_user and rsvp = 'yes') then raise exception 'not_a_guest'; end if;
  if (select count(*) from wedding_guests where wedding_id = w.id and role = p_role and user_id <> p_user) >= cap then raise exception 'role_full'; end if;
  update wedding_guests set role = p_role where wedding_id = w.id and user_id = p_user;
end $$;
grant execute on function public.set_wedding_role(text, uuid, text) to authenticated;

/** A gift for the couple, split between them (AED 50,000 at most). */
create or replace function public.wedding_gift(p_code text, p_amount bigint, p_message text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w weddings; r relationships; half bigint;
begin
  select * into w from weddings where code = p_code and status in ('planned', 'done');
  if w.id is null then raise exception 'no_wedding'; end if;
  select * into r from relationships where id = w.relationship_id;
  if me in (r.man_id, r.woman_id) then raise exception 'its_your_wedding'; end if;
  if p_amount < 1 or p_amount > 50000 then raise exception 'amount_out_of_range'; end if;
  if exists (select 1 from cases where suspect_id = me and status = 'open') then raise exception 'account_frozen'; end if;
  half := p_amount / 2;
  perform coin_move(me, -p_amount, 'transfer_out', 'Wedding gift', 'gift:' || w.id || ':' || me || ':' || extract(epoch from clock_timestamp()));
  perform coin_move(r.man_id, half, 'transfer_in', 'Wedding gift', 'gift-in:' || w.id || ':' || me || ':' || extract(epoch from clock_timestamp()));
  perform coin_move(r.woman_id, p_amount - half, 'transfer_in', 'Wedding gift', 'gift-in2:' || w.id || ':' || me || ':' || extract(epoch from clock_timestamp()));
  insert into wedding_gifts (wedding_id, from_id, amount, message) values (w.id, me, p_amount, nullif(trim(p_message), ''));
end $$;
grant execute on function public.wedding_gift(text, bigint, text) to authenticated;

/** "I do": from 10 minutes before the start to 45 after. When both have said it, they're married. */
create or replace function public.say_i_do(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w weddings; r relationships;
begin
  select * into w from weddings where code = p_code and status = 'planned' for update;
  if w.id is null then raise exception 'no_wedding'; end if;
  select * into r from relationships where id = w.relationship_id for update;
  if me not in (r.man_id, r.woman_id) then raise exception 'not_your_wedding'; end if;
  if now() < w.starts_at - interval '10 minutes' then raise exception 'too_early'; end if;
  if now() > w.starts_at + interval '45 minutes' then raise exception 'too_late'; end if;
  if me = r.man_id then update weddings set i_do_man = true where id = w.id returning * into w;
  else update weddings set i_do_woman = true where id = w.id returning * into w; end if;
  if w.i_do_man and w.i_do_woman then
    update weddings set status = 'done' where id = w.id;
    update relationships set status = 'married', married_at = now() where id = r.id;
    perform public.add_points(r.man_id, 'wellbeing', 50, 'married:' || r.id || ':m');
    perform public.add_points(r.woman_id, 'wellbeing', 50, 'married:' || r.id || ':w');
    return jsonb_build_object('married', true);
  end if;
  return jsonb_build_object('married', false);
end $$;
grant execute on function public.say_i_do(text) to authenticated;

-- ---------------------------------------------------------------- what the app shows

create or replace function public.my_love() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.my_relationship(auth.uid()); g text := public.gender_of(auth.uid()); wid bigint; d int := public.life_day(now());
begin
  if me is null then raise exception 'not_signed_in'; end if;
  for wid in select id from weddings where relationship_id = r.id and status = 'planned' loop perform public.settle_wedding(wid); end loop;
  return jsonb_build_object(
    'gender', g,
    'relationship', case when r.id is null then null else jsonb_build_object(
      'id', r.id, 'status', r.status, 'level', r.level, 'ring', r.ring, 'since', r.created_at, 'engagedAt', r.engaged_at, 'marriedAt', r.married_at,
      'partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(r, me)),
      'lovedToday', exists (select 1 from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'love'),
      'dateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'date'),
      'partnerDateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = public.partner_of(r, me) and kind = 'date'),
      'wedding', (select code from weddings where relationship_id = r.id and status in ('planned', 'done') order by created_at desc limit 1)) end,
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'ring', q.ring, 'place', q.place, 'message', q.message,
                  'from', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look')) order by q.created_at)
                from love_requests q join profiles p on p.id = q.from_id where q.to_id = me and q.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'to', p.username) order by q.created_at)
                from love_requests q join profiles p on p.id = q.to_id where q.from_id = me and q.status = 'pending'), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('code', w.code, 'startsAt', w.starts_at, 'venue', w.venue) order by w.starts_at)
                from wedding_guests gu join weddings w on w.id = gu.wedding_id where gu.user_id = me and gu.rsvp = 'yes' and w.status = 'planned'), '[]'::jsonb),
    'candidates', case when r.id is null and g is not null then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look') order by p.username)
                from friendships f join profiles p on p.id = case when f.user_id = me then f.friend_id else f.user_id end
                where f.status = 'accepted' and me in (f.user_id, f.friend_id)
                  and p.citizen -> 'look' ->> 'gender' is not null and p.citizen -> 'look' ->> 'gender' <> g
                  and (public.my_relationship(p.id)).id is null), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
grant execute on function public.my_love() to authenticated;

do $$ begin alter publication supabase_realtime add table public.love_requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.relationships; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.weddings; exception when duplicate_object then null; end $$;
