-- The Family app (was Hayati): partners, relatives, babies and nannies.
--   * A couple is always a man and a woman, both agreeing at every step. A man may have up to 4 partners at once;
--     a woman has one. Each relationship is separate (its own hearts, dates, proposal and wedding).
--   * Other partners are hidden from each other, but each day there's a chance of finding out.
--   * Relatives (brother, sister, parent, child, cousin) are added when both agree.
--   * A couple decides together to have a baby: 7 days of pregnancy, then the baby grows a stage a week.
--     Daily care keeps them happy; a nanny covers it.
-- Numbers: src/data/life/family.json (checked by scripts/check-life-config.mjs).

-- ---------------------------------------------------------------- partners

-- A woman still has one partner; a man up to 4 (checked in the functions below).
drop index if exists public.relationships_one_man;

create or replace function public.partner_count(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from relationships where status <> 'ended' and p_user in (man_id, woman_id)
$$;
revoke all on function public.partner_count(uuid) from public, anon, authenticated;

/** Can this person start a new relationship? Women: when single. Men: with fewer than 4 partners. */
create or replace function public.can_date(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.gender_of(p_user) when 'man' then public.partner_count(p_user) < 4 when 'woman' then public.partner_count(p_user) = 0 else false end
$$;
revoke all on function public.can_date(uuid) from public, anon, authenticated;

/** My relationship with a given partner, or my only one when no partner is given (more than one: say which). */
create or replace function public.rel_with(p_user uuid, p_partner uuid) returns relationships
language plpgsql stable security definer set search_path = public as $$
declare r relationships;
begin
  if p_partner is null and public.partner_count(p_user) > 1 then raise exception 'which_partner'; end if;
  select * into r from relationships
    where status <> 'ended' and p_user in (man_id, woman_id) and (p_partner is null or (p_partner in (man_id, woman_id) and p_partner <> p_user))
    order by created_at limit 1;
  return r;
end $$;
revoke all on function public.rel_with(uuid, uuid) from public, anon, authenticated;

alter table public.love_requests drop constraint if exists love_requests_kind_check;
alter table public.love_requests add constraint love_requests_kind_check check (kind in ('date', 'propose', 'baby'));

/** Ask a friend out. A man and a woman, friends first; she must be single, he must have fewer than 4 partners. */
create or replace function public.ask_out(p_to uuid, p_message text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g1 text := public.gender_of(auth.uid()); g2 text := public.gender_of(p_to); rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_to = me or not public.are_friends(me, p_to) then raise exception 'friends_first'; end if;
  if g1 is null or g2 is null or g1 = g2 then raise exception 'not_allowed'; end if;
  if not public.can_date(me) then raise exception 'you_are_taken'; end if;
  if not public.can_date(p_to) then raise exception 'they_are_taken'; end if;
  if exists (select 1 from relationships where status <> 'ended' and (man_id, woman_id) in ((me, p_to), (p_to, me))) then raise exception 'already_together'; end if;
  if exists (select 1 from relationships where me in (man_id, woman_id) and status = 'ended' and ended_at > now() - interval '3 days') then raise exception 'cooling_off'; end if;
  if exists (select 1 from love_requests where from_id = me and to_id = p_to and status = 'pending') then raise exception 'already_asked'; end if;
  insert into love_requests (from_id, to_id, kind, message) values (me, p_to, 'date', nullif(trim(p_message), '')) returning id into rid;
  return rid;
end $$;
grant execute on function public.ask_out(uuid, text) to authenticated;

/** Say yes or no to a date, a proposal or having a baby. */
create or replace function public.love_respond(p_request bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); q love_requests; r relationships; mum uuid;
begin
  select * into q from love_requests where id = p_request and to_id = me and status = 'pending' for update;
  if q.id is null then raise exception 'no_request'; end if;
  if not p_accept then
    update love_requests set status = 'declined' where id = q.id;
    if q.kind = 'propose' then perform coin_move(q.from_id, public.ring_price(q.ring), 'refund', 'Engagement ring returned to the shop', 'ring-refund:' || q.id); end if;
    return;
  end if;
  if q.kind = 'date' then
    if not public.can_date(me) or not public.can_date(q.from_id) then raise exception 'taken'; end if;
    insert into relationships (man_id, woman_id)
      values (case when public.gender_of(me) = 'man' then me else q.from_id end, case when public.gender_of(me) = 'man' then q.from_id else me end);
    -- Whoever can't date anyone else now has their other date requests let down gently.
    update love_requests set status = 'cancelled' where status = 'pending' and kind = 'date' and id <> q.id
      and ((not public.can_date(me) and me in (to_id, from_id)) or (not public.can_date(q.from_id) and q.from_id in (to_id, from_id)));
  elsif q.kind = 'propose' then
    r := public.rel_with(me, q.from_id);
    if r.id is null or r.status <> 'dating' then raise exception 'not_dating'; end if;
    update relationships set status = 'engaged', engaged_at = now(), ring = q.ring where id = r.id;
    perform public.add_points(me, 'wellbeing', 20, 'engaged:' || r.id || ':' || me);
    perform public.add_points(q.from_id, 'wellbeing', 20, 'engaged:' || r.id || ':' || q.from_id);
  else
    -- A baby: you both said yes. Seven days of pregnancy start now.
    r := public.rel_with(me, q.from_id);
    if r.id is null then raise exception 'not_together'; end if;
    mum := r.woman_id;
    if exists (select 1 from children where mother_id = mum and due_at > now()) then raise exception 'already_expecting'; end if;
    insert into children (mother_id, father_id, relationship_id, gender, conceived_at, due_at)
      values (mum, r.man_id, r.id, case when random() < 0.5 then 'boy' else 'girl' end, now(), now() + interval '7 days');
    perform public.add_points(r.man_id, 'wellbeing', 25, 'expecting:' || r.id || ':' || public.life_day(now()) || ':m');
    perform public.add_points(r.woman_id, 'wellbeing', 25, 'expecting:' || r.id || ':' || public.life_day(now()) || ':w');
  end if;
  update love_requests set status = 'accepted' where id = q.id;
end $$;
grant execute on function public.love_respond(bigint, boolean) to authenticated;

-- The functions below now take the partner (a man with more than one partner says which).
drop function if exists public.show_love();
create or replace function public.show_love(p_partner uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner); lv int;
begin
  if r.id is null then raise exception 'single'; end if;
  insert into love_days (relationship_id, day, user_id, kind) values (r.id, public.life_day(now()), me, 'love') on conflict do nothing;
  if not found then raise exception 'already_today'; end if;
  update relationships set level = level + 1 where id = r.id returning level into lv;
  return lv;
end $$;
grant execute on function public.show_love(uuid) to authenticated;

drop function if exists public.log_date(text);
create or replace function public.log_date(p_place text, p_partner uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner); d int := public.life_day(now()); theirs text; lv int;
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
grant execute on function public.log_date(text, uuid) to authenticated;

drop function if exists public.propose(text, text, text);
create or replace function public.propose(p_ring text, p_place text, p_message text default null, p_partner uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner); price int := public.ring_price(p_ring); rid bigint;
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
grant execute on function public.propose(text, text, text, uuid) to authenticated;

drop function if exists public.end_relationship();
create or replace function public.end_relationship(p_partner uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner);
begin
  if r.id is null then raise exception 'single'; end if;
  update relationships set status = 'ended', ended_at = now(), ended_by = me where id = r.id;
  update weddings set status = 'cancelled' where relationship_id = r.id and status = 'planned';
  update love_requests set status = 'cancelled' where status = 'pending' and (from_id, to_id) in ((r.man_id, r.woman_id), (r.woman_id, r.man_id));
end $$;
grant execute on function public.end_relationship(uuid) to authenticated;

drop function if exists public.plan_wedding(text, timestamptz, int, text);
create or replace function public.plan_wedding(p_venue text, p_starts_at timestamptz, p_guests int, p_ceremony text, p_partner uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner); vp int[] := public.venue_price(p_venue); total bigint; w weddings;
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
grant execute on function public.plan_wedding(text, timestamptz, int, text, uuid) to authenticated;

drop function if exists public.cancel_wedding();
create or replace function public.cancel_wedding(p_partner uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare r relationships := public.rel_with(auth.uid(), p_partner); w weddings;
begin
  select * into w from weddings where relationship_id = r.id and status = 'planned' for update;
  if w.id is null then raise exception 'no_wedding'; end if;
  update weddings set status = 'cancelled' where id = w.id;
  if w.paid_by is not null then perform coin_move(w.paid_by, w.cost / 2, 'refund', 'Wedding cancelled (half refunded)', 'wedding-refund:' || w.id); end if;
end $$;
grant execute on function public.cancel_wedding(uuid) to authenticated;

/** "Ask me out" link, answered: the same rules as asking in the app. */
create or replace function public.accept_ask_out(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); i invites; g1 text; g2 text; who text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into i from invites where code = upper(trim(p_code)) and kind = 'ask_out' for update;
  if i.id is null or i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  if i.host_id = me then raise exception 'your_link'; end if;
  g1 := public.gender_of(i.host_id); g2 := public.gender_of(me);
  if g1 is null or g2 is null or g1 = g2 then raise exception 'not_allowed'; end if;
  if not public.can_date(i.host_id) then raise exception 'they_are_taken'; end if;
  if not public.can_date(me) then raise exception 'you_are_taken'; end if;
  if exists (select 1 from relationships where status <> 'ended' and (man_id, woman_id) in ((me, i.host_id), (i.host_id, me))) then raise exception 'already_together'; end if;
  insert into friendships (user_id, friend_id, status) values (i.host_id, me, 'accepted')
    on conflict (user_id, friend_id) do update set status = 'accepted';
  insert into relationships (man_id, woman_id, status)
    values (case when g1 = 'man' then i.host_id else me end, case when g1 = 'man' then me else i.host_id end, 'dating');
  insert into invite_guests (invite_id, user_id, status) values (i.id, me, 'going') on conflict (invite_id, user_id) do update set status = 'going';
  update invites set cancelled = true where id = i.id;
  select username into who from profiles where id = i.host_id;
  return who;
end $$;
grant execute on function public.accept_ask_out(text) to authenticated;

-- "Ask me out" links: only while you can still date.
create or replace function public.create_link(p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text; who text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('ask_out', 'hire_decorator') then raise exception 'bad_kind'; end if;
  if p_kind = 'hire_decorator' and public.service_of(me) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
  if p_kind = 'ask_out' and not public.can_date(me) then raise exception 'you_are_taken'; end if;
  select code into c from invites where host_id = me and kind = p_kind and not cancelled and ends_at > now() order by created_at desc limit 1;
  if c is not null then return c; end if;
  select username into who from profiles where id = me;
  c := public.new_invite_code();
  insert into invites (code, kind, host_id, title, label, route, starts_at, ends_at, max_guests)
    values (c, p_kind, me, case p_kind when 'ask_out' then 'Go on a date with @' || who else 'Hire @' || who || ' to decorate' end,
            case p_kind when 'ask_out' then 'Family' else 'Interior decorator' end,
            case p_kind when 'ask_out' then '/phone' else '/home' end, now(), now() + interval '14 days', 1);
  return c;
end $$;
grant execute on function public.create_link(text) to authenticated;

-- ---------------------------------------------------------------- finding out

-- Who has found out about which of their partner's other relationships, and what they did about it.
create table if not exists public.love_discoveries (
  viewer uuid not null references public.profiles (id) on delete cascade,
  relationship_id bigint not null references public.relationships (id) on delete cascade,
  found_at timestamptz not null default now(),
  resolved text check (resolved in ('forgave', 'left')),
  primary key (viewer, relationship_id)
);
alter table public.love_discoveries enable row level security;

/** Each day, for every other partner of your partner you don't know about, a 10% chance you find out
    (the same answer all day, so opening the app again doesn't reroll it). Finding out costs 10 hearts. */
create or replace function public.check_discoveries(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare mine relationships; other relationships; d int := public.life_day(now());
begin
  for mine in select * from relationships where status <> 'ended' and p_user in (man_id, woman_id) loop
    for other in select * from relationships o where o.status <> 'ended' and o.id <> mine.id
                   and public.partner_of(mine, p_user) in (o.man_id, o.woman_id) and p_user not in (o.man_id, o.woman_id)
                   and not exists (select 1 from love_discoveries x where x.viewer = p_user and x.relationship_id = o.id) loop
      if (('x' || substr(md5(p_user::text || ':' || other.id || ':' || d), 1, 7))::bit(28)::int % 100) < 10 then
        insert into love_discoveries (viewer, relationship_id) values (p_user, other.id) on conflict do nothing;
        update relationships set level = greatest(0, level - 10) where id = mine.id;
      end if;
    end loop;
  end loop;
end $$;
revoke all on function public.check_discoveries(uuid) from public, anon, authenticated;

/** After finding out: forgive, or leave (which ends your relationship with them). */
create or replace function public.resolve_discovery(p_relationship bigint, p_forgive boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); x love_discoveries; other relationships; cheat uuid;
begin
  select * into x from love_discoveries where viewer = me and relationship_id = p_relationship and resolved is null for update;
  if x.viewer is null then raise exception 'nothing_found'; end if;
  select * into other from relationships where id = p_relationship;
  -- The partner they share.
  select public.partner_of(r, me) into cheat from relationships r where r.status <> 'ended' and me in (r.man_id, r.woman_id) and public.partner_of(r, me) in (other.man_id, other.woman_id) limit 1;
  update love_discoveries set resolved = case when p_forgive then 'forgave' else 'left' end where viewer = me and relationship_id = p_relationship;
  if not p_forgive and cheat is not null then
    update relationships set status = 'ended', ended_at = now(), ended_by = me where status <> 'ended' and me in (man_id, woman_id) and cheat in (man_id, woman_id);
  end if;
end $$;
grant execute on function public.resolve_discovery(bigint, boolean) to authenticated;

-- ---------------------------------------------------------------- relatives

create table if not exists public.family_links (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  -- What the other person is to the one who asked: their sibling, cousin, parent or child.
  relation text not null check (relation in ('sibling', 'cousin', 'parent', 'child')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create unique index if not exists family_links_pair on public.family_links (least(from_id, to_id), greatest(from_id, to_id)) where status <> 'declined';
alter table public.family_links enable row level security;

create or replace function public.add_relative(p_to uuid, p_relation text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_relation not in ('sibling', 'cousin', 'parent', 'child') then raise exception 'bad_relation'; end if;
  if p_to = me or not public.are_friends(me, p_to) then raise exception 'friends_first'; end if;
  if exists (select 1 from relationships where status <> 'ended' and (man_id, woman_id) in ((me, p_to), (p_to, me))) then raise exception 'already_partners'; end if;
  if exists (select 1 from family_links where status <> 'declined' and least(from_id, to_id) = least(me, p_to) and greatest(from_id, to_id) = greatest(me, p_to)) then raise exception 'already_family'; end if;
  if (select count(*) from family_links where from_id = me and created_at > now() - interval '1 day') >= 20 then raise exception 'too_many_requests'; end if;
  insert into family_links (from_id, to_id, relation) values (me, p_to, p_relation);
end $$;
grant execute on function public.add_relative(uuid, text) to authenticated;

create or replace function public.respond_relative(p_link bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update family_links set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_link and to_id = auth.uid() and status = 'pending';
  if not found then raise exception 'no_request'; end if;
end $$;
grant execute on function public.respond_relative(bigint, boolean) to authenticated;

create or replace function public.remove_relative(p_link bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update family_links set status = 'declined' where id = p_link and auth.uid() in (from_id, to_id) and status <> 'declined';
  if not found then raise exception 'no_request'; end if;
end $$;
grant execute on function public.remove_relative(bigint) to authenticated;

-- ---------------------------------------------------------------- babies

create table if not exists public.children (
  id bigint generated always as identity primary key,
  mother_id uuid not null references public.profiles (id) on delete cascade,
  father_id uuid not null references public.profiles (id) on delete cascade,
  relationship_id bigint references public.relationships (id) on delete set null,
  gender text not null check (gender in ('boy', 'girl')),
  name text check (name is null or char_length(name) between 1 and 24),
  conceived_at timestamptz not null default now(),
  -- Born when this passes (7 days of pregnancy).
  due_at timestamptz not null,
  nanny_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists children_mother on public.children (mother_id);
create index if not exists children_father on public.children (father_id);
alter table public.children enable row level security;
drop policy if exists "parents see their children" on public.children;
create policy "parents see their children" on public.children for select using (auth.uid() in (mother_id, father_id));

create table if not exists public.child_care (
  child_id bigint not null references public.children (id) on delete cascade,
  day int not null,
  action text not null check (action in ('feed', 'play', 'bath')),
  by_id uuid not null references public.profiles (id) on delete cascade,
  primary key (child_id, day, action)
);
alter table public.child_care enable row level security;

/** Ask your partner to have a baby together (they say yes in Family). */
create or replace function public.ask_for_baby(p_partner uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r relationships := public.rel_with(auth.uid(), p_partner); rid bigint;
begin
  if r.id is null then raise exception 'single'; end if;
  if exists (select 1 from children where mother_id = r.woman_id and due_at > now()) then raise exception 'already_expecting'; end if;
  if exists (select 1 from love_requests where kind = 'baby' and status = 'pending' and (from_id, to_id) in ((r.man_id, r.woman_id), (r.woman_id, r.man_id))) then raise exception 'already_asked'; end if;
  insert into love_requests (from_id, to_id, kind) values (me, public.partner_of(r, me), 'baby') returning id into rid;
  return rid;
end $$;
grant execute on function public.ask_for_baby(uuid) to authenticated;

/** Name your baby (either parent, any time; the last name chosen sticks). */
create or replace function public.name_child(p_child bigint, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if char_length(n) < 1 or char_length(n) > 24 then raise exception 'bad_name'; end if;
  update children set name = n where id = p_child and auth.uid() in (mother_id, father_id);
  if not found then raise exception 'not_your_child'; end if;
end $$;
grant execute on function public.name_child(bigint, text) to authenticated;

/** Feed, play or bath time: once a day each, by either parent, once the baby is born. */
create or replace function public.care_for_child(p_child bigint, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c children;
begin
  select * into c from children where id = p_child and me in (mother_id, father_id);
  if c.id is null then raise exception 'not_your_child'; end if;
  if c.due_at > now() then raise exception 'not_born_yet'; end if;
  if p_action not in ('feed', 'play', 'bath') then raise exception 'bad_action'; end if;
  insert into child_care (child_id, day, action, by_id) values (c.id, public.life_day(now()), p_action, me) on conflict do nothing;
  if not found then raise exception 'already_today'; end if;
  perform public.add_points(me, 'wellbeing', 3, 'care:' || c.id || ':' || public.life_day(now()) || ':' || p_action);
end $$;
grant execute on function public.care_for_child(bigint, text) to authenticated;

/** A nanny looks after the child: a week (AED 1,500) or a month (AED 5,000), paid by whoever hires. */
create or replace function public.hire_nanny(p_child bigint, p_plan text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c children; days int; price int; until timestamptz;
begin
  select * into c from children where id = p_child and me in (mother_id, father_id) for update;
  if c.id is null then raise exception 'not_your_child'; end if;
  days := case p_plan when 'week' then 7 when 'month' then 30 end;
  price := case p_plan when 'week' then 1500 when 'month' then 5000 end;
  if days is null then raise exception 'bad_plan'; end if;
  perform coin_move(me, -price, 'spend', 'Nanny for ' || coalesce(c.name, 'your baby'), 'nanny:' || c.id || ':' || extract(epoch from clock_timestamp()));
  until := greatest(coalesce(c.nanny_until, now()), now(), c.due_at) + make_interval(days => days);
  update children set nanny_until = until where id = c.id;
  return until;
end $$;
grant execute on function public.hire_nanny(bigint, text) to authenticated;

-- ---------------------------------------------------------------- what the Family app shows

create or replace function public.my_love() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g text := public.gender_of(auth.uid()); d int := public.life_day(now()); wid bigint; rels jsonb;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform public.check_discoveries(me);
  for wid in select w.id from weddings w join relationships r on r.id = w.relationship_id where me in (r.man_id, r.woman_id) and r.status <> 'ended' and w.status = 'planned' loop
    perform public.settle_wedding(wid);
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'status', r.status, 'level', r.level, 'ring', r.ring, 'since', r.created_at, 'engagedAt', r.engaged_at, 'marriedAt', r.married_at,
      'partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(r, me)),
      'lovedToday', exists (select 1 from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'love'),
      'dateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'date'),
      'partnerDateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = public.partner_of(r, me) and kind = 'date'),
      'wedding', (select code from weddings where relationship_id = r.id and status in ('planned', 'done') order by created_at desc limit 1)) order by r.created_at), '[]'::jsonb)
    into rels from relationships r where r.status <> 'ended' and me in (r.man_id, r.woman_id);
  return jsonb_build_object(
    'gender', g,
    'canDate', public.can_date(me),
    'relationships', rels,
    'relationship', rels -> 0,
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'ring', q.ring, 'place', q.place, 'message', q.message,
                  'from', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look')) order by q.created_at)
                from love_requests q join profiles p on p.id = q.from_id where q.to_id = me and q.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'to', p.username) order by q.created_at)
                from love_requests q join profiles p on p.id = q.to_id where q.from_id = me and q.status = 'pending'), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('code', w.code, 'startsAt', w.starts_at, 'venue', w.venue) order by w.starts_at)
                from wedding_guests gu join weddings w on w.id = gu.wedding_id where gu.user_id = me and gu.rsvp = 'yes' and w.status = 'planned'), '[]'::jsonb),
    -- What I found out about my partner, not yet dealt with.
    'discoveries', coalesce((select jsonb_agg(jsonb_build_object('relationship', o.id, 'status', o.status, 'foundAt', x.found_at,
                  'partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(mine, me)),
                  'other', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles
                            where id = case when o.man_id = public.partner_of(mine, me) then o.woman_id else o.man_id end)) order by x.found_at)
                from love_discoveries x join relationships o on o.id = x.relationship_id
                join relationships mine on mine.status <> 'ended' and me in (mine.man_id, mine.woman_id) and public.partner_of(mine, me) in (o.man_id, o.woman_id)
                where x.viewer = me and x.resolved is null and o.status <> 'ended'), '[]'::jsonb),
    -- Partners of mine who found out about another of my relationships (and haven't decided yet).
    'caught', coalesce((select jsonb_agg(jsonb_build_object('by', (select username from profiles where id = x.viewer),
                  'about', (select username from profiles where id = public.partner_of(o, me))) order by x.found_at)
                from love_discoveries x join relationships o on o.id = x.relationship_id
                where me in (o.man_id, o.woman_id) and x.resolved is null and o.status <> 'ended'), '[]'::jsonb),
    'candidates', case when public.can_date(me) and g is not null then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look') order by p.username)
                from friendships f join profiles p on p.id = case when f.user_id = me then f.friend_id else f.user_id end
                where f.status = 'accepted' and me in (f.user_id, f.friend_id)
                  and p.citizen -> 'look' ->> 'gender' is not null and p.citizen -> 'look' ->> 'gender' <> g
                  and public.can_date(p.id)
                  and not exists (select 1 from relationships r2 where r2.status <> 'ended' and (r2.man_id, r2.woman_id) in ((me, p.id), (p.id, me)))
                  and not exists (select 1 from family_links fl where fl.status = 'accepted' and least(fl.from_id, fl.to_id) = least(me, p.id) and greatest(fl.from_id, fl.to_id) = greatest(me, p.id))), '[]'::jsonb)
                else '[]'::jsonb end
  );
end $$;
grant execute on function public.my_love() to authenticated;

/** Relatives (and requests) and children, for the Family app. */
create or replace function public.my_family() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d int := public.life_day(now());
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return jsonb_build_object(
    -- What each relative is to me: from my side, their relation as asked; from theirs, the inverse.
    'relatives', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'status', f.status, 'mine', f.from_id = me,
                  'relation', case when f.from_id = me then f.relation
                                   else case f.relation when 'parent' then 'child' when 'child' then 'parent' else f.relation end end,
                  'person', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = case when f.from_id = me then f.to_id else f.from_id end))
                  order by f.status, f.created_at)
                from family_links f where me in (f.from_id, f.to_id) and f.status <> 'declined'), '[]'::jsonb),
    'children', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'gender', c.gender, 'conceivedAt', c.conceived_at, 'dueAt', c.due_at,
                  'born', c.due_at <= now(), 'nannyUntil', c.nanny_until,
                  'mother', (select jsonb_build_object('id', id, 'username', username) from profiles where id = c.mother_id),
                  'father', (select jsonb_build_object('id', id, 'username', username) from profiles where id = c.father_id),
                  'careToday', coalesce((select jsonb_agg(action) from child_care where child_id = c.id and day = d), '[]'::jsonb),
                  -- Care given over the last 3 days (of 9 possible), for how happy they are.
                  'careRecent', (select count(*) from child_care where child_id = c.id and day > d - 3)) order by c.conceived_at)
                from children c where me in (c.mother_id, c.father_id)), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_family() to authenticated;

do $$ begin alter publication supabase_realtime add table public.family_links; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.children; exception when duplicate_object then null; end $$;
