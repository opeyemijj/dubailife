-- Parties at homes and venues, and invite links for asking someone out or hiring a decorator. Builds on *_invites.sql:
--   kinds: house_party (your home), dinner (your home or a restaurant), club_night (a club), ask_out and
--   hire_decorator (links with no time or place).
--   Party decorations are bought for one event and shown in 3D while it's on.
--   Arriving during the party checks you in: the host earns AED 300 a guest (AED 1,000 more for a player who joined
--   in the last 7 days), up to the guest limit, and each guest earns points. One paid arrival per guest per host a
--   day, so hosting the same friends again and again doesn't farm money.
--   A host can invite players directly (they get a notification and it's in their Invites app), and everyone going
--   gets a reminder 15 minutes before it starts.
-- Numbers mirror src/data/life/parties.json (scripts/check-life-config.mjs).

alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites add constraint invites_kind_check check (kind in ('house_party', 'dinner', 'club_night', 'ask_out', 'hire_decorator'));
alter table public.invites add column if not exists place_id text;
alter table public.invites add column if not exists venue_id text;
alter table public.invites add column if not exists decor text[] not null default '{}';
alter table public.invites add column if not exists decor_cost bigint not null default 0;
alter table public.invites add column if not exists push_called_at timestamptz;
alter table public.invites add column if not exists reminded_at timestamptz;
create index if not exists invites_route_live on public.invites (route, starts_at);

alter table public.invite_guests drop constraint if exists invite_guests_status_check;
alter table public.invite_guests add constraint invite_guests_status_check check (status in ('invited', 'going', 'no'));
alter table public.invite_guests add column if not exists arrived_at timestamptz;
alter table public.invite_guests add column if not exists reward bigint not null default 0;

/** Party decorations: price, or null if it isn't one. */
create or replace function public.party_decor_price(p_id text) returns int
language sql immutable as $$
  select case p_id when 'balloons' then 800 when 'bunting' then 600 when 'lights' then 1200 when 'flowers' then 1500
    when 'neon' then 2000 when 'discoball' then 2500 end
$$;

create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text; tries int := 0;
begin
  loop
    c := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from invites where code = c);
    tries := tries + 1;
    if tries > 20 then raise exception 'try_again'; end if;
  end loop;
  return c;
end $$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

/** Throw a party: at your home (p_flat) or a venue (p_place/p_venue), with decorations paid for now. */
create or replace function public.create_event(p_kind text, p_title text, p_starts_at timestamptz, p_label text,
  p_flat text default null, p_route text default null, p_place text default null, p_venue text default null,
  p_decor text[] default '{}', p_max int default 20) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; c text; v_route text; hours int; cost bigint := 0; d text; iid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('house_party', 'dinner', 'club_night') then raise exception 'bad_kind'; end if;
  hours := case p_kind when 'house_party' then 3 when 'dinner' then 2 else 4 end;
  if p_starts_at < now() - interval '10 minutes' or p_starts_at > now() + interval '7 days' then raise exception 'bad_time'; end if;
  if p_max < 2 or p_max > 20 then raise exception 'bad_size'; end if;
  if (select count(*) from invites where host_id = me and not cancelled and kind in ('house_party', 'dinner', 'club_night') and ends_at > now()) >= 3 then raise exception 'too_many_parties'; end if;
  foreach d in array coalesce(p_decor, '{}') loop
    if public.party_decor_price(d) is null then raise exception 'bad_decor'; end if;
    cost := cost + public.party_decor_price(d);
  end loop;
  if p_flat is not null then
    if p_kind = 'club_night' then raise exception 'bad_place'; end if;
    select * into f from flats where id = p_flat and (owner_id = me or tenant_id = me);
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
  insert into invites (code, kind, host_id, title, label, route, flat_id, place_id, venue_id, starts_at, ends_at, max_guests, decor, decor_cost)
    values (c, p_kind, me, left(coalesce(nullif(trim(p_title), ''), 'Party'), 60), left(p_label, 80), v_route, f.id, p_place, p_venue,
            p_starts_at, p_starts_at + make_interval(hours => hours), p_max, (select array(select distinct unnest(coalesce(p_decor, '{}')))), cost)
    returning id into iid;
  if cost > 0 then perform coin_move(me, -cost, 'spend', 'Party decorations', 'party-decor:' || iid); end if;
  if f.id is not null then update flats set access = 'public' where id = f.id; end if;
  return c;
end $$;
grant execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, text[], int) to authenticated;

/** Links with no time or place: "ask me out", or (decorators) "hire me". */
create or replace function public.create_link(p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text; who text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('ask_out', 'hire_decorator') then raise exception 'bad_kind'; end if;
  if p_kind = 'hire_decorator' and public.service_of(me) is distinct from 'decorator' then raise exception 'not_a_decorator'; end if;
  if p_kind = 'ask_out' and (public.my_relationship(me)).id is not null then raise exception 'you_are_taken'; end if;
  -- The same link again, while it lasts.
  select code into c from invites where host_id = me and kind = p_kind and not cancelled and ends_at > now() order by created_at desc limit 1;
  if c is not null then return c; end if;
  select username into who from profiles where id = me;
  c := public.new_invite_code();
  insert into invites (code, kind, host_id, title, label, route, starts_at, ends_at, max_guests)
    values (c, p_kind, me, case p_kind when 'ask_out' then 'Go on a date with @' || who else 'Hire @' || who || ' to decorate' end,
            case p_kind when 'ask_out' then 'Hayati' else 'Interior decorator' end,
            case p_kind when 'ask_out' then '/phone' else '/home' end, now(), now() + interval '14 days', 1);
  return c;
end $$;
grant execute on function public.create_link(text) to authenticated;

create or replace function public.invite_view(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i invites; me uuid := auth.uid();
begin
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then return null; end if;
  return jsonb_build_object(
    'code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'route', i.route,
    'startsAt', i.starts_at, 'endsAt', i.ends_at, 'maxGuests', i.max_guests, 'cancelled', i.cancelled, 'decor', to_jsonb(i.decor),
    'host', (select jsonb_build_object('username', username, 'look', citizen -> 'look', 'gender', citizen -> 'look' ->> 'gender') from profiles where id = i.host_id),
    'going', (select count(*) from invite_guests where invite_id = i.id and status = 'going'),
    'arrived', (select count(*) from invite_guests where invite_id = i.id and arrived_at is not null),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'look', p.citizen -> 'look') order by g.responded_at)
      from (select * from invite_guests where invite_id = i.id and status = 'going' order by responded_at limit 12) g join profiles p on p.id = g.user_id), '[]'::jsonb),
    'isHost', me is not null and me = i.host_id,
    'mine', (select status from invite_guests where invite_id = i.id and user_id = me));
end $$;
grant execute on function public.invite_view(text) to anon, authenticated;

create or replace function public.invite_rsvp(p_code text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare i invites; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_status not in ('going', 'no') then raise exception 'bad_status'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
  if i.kind not in ('house_party', 'dinner', 'club_night') then raise exception 'not_an_event'; end if;
  if i.host_id = me then raise exception 'your_party'; end if;
  if i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  if p_status = 'going' and not exists (select 1 from invite_guests where invite_id = i.id and user_id = me and status = 'going')
     and (select count(*) from invite_guests where invite_id = i.id and status = 'going') >= i.max_guests then
    raise exception 'full';
  end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, me, p_status)
    on conflict (invite_id, user_id) do update set status = excluded.status, responded_at = now();
end $$;
grant execute on function public.invite_rsvp(text, text) to authenticated;

/** The host invites a player directly. Returns their id (for the notification), or null if they were already on it. */
create or replace function public.invite_player(p_code text, p_username text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i invites; who uuid;
begin
  select * into i from invites where code = upper(trim(p_code)) and host_id = auth.uid();
  if i.id is null then raise exception 'not_found'; end if;
  if i.kind not in ('house_party', 'dinner', 'club_night') or i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  select id into who from profiles where username = lower(trim(both '@' from trim(p_username)));
  if who is null then raise exception 'no_such_player'; end if;
  if who = i.host_id then raise exception 'your_party'; end if;
  if (select count(*) from invite_guests where invite_id = i.id) >= i.max_guests * 3 then raise exception 'full'; end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, who, 'invited') on conflict do nothing;
  return case when found then who end;
end $$;
grant execute on function public.invite_player(text, text) to authenticated;

/** The party on here right now, if any: for the decorations and the banner. */
create or replace function public.party_here(p_route text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'decor', to_jsonb(i.decor), 'endsAt', i.ends_at,
    'host', (select username from profiles where id = i.host_id), 'isHost', i.host_id = auth.uid(),
    'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null))
  from invites i
  where i.route = p_route and not i.cancelled and i.kind in ('house_party', 'dinner', 'club_night') and i.starts_at <= now() and i.ends_at > now()
  order by i.starts_at desc limit 1
$$;
grant execute on function public.party_here(text) to anon, authenticated;

/** You're here while the party's on: checked in, and paid for (see the top of this file). */
create or replace function public.invite_arrive(p_route text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); i invites; g invite_guests; paid bigint := 0; fresh boolean; pts int := 0;
begin
  if me is null then return null; end if;
  select * into i from invites
    where route = p_route and not cancelled and kind in ('house_party', 'dinner', 'club_night') and starts_at <= now() and ends_at > now()
    order by starts_at desc limit 1 for update;
  if i.id is null or i.host_id = me then return null; end if;
  select * into g from invite_guests where invite_id = i.id and user_id = me;
  if g.arrived_at is not null then return null; end if;
  if g.user_id is null and (select count(*) from invite_guests where invite_id = i.id and status = 'going') >= i.max_guests then return null; end if;
  insert into invite_guests (invite_id, user_id, status, arrived_at) values (i.id, me, 'going', now())
    on conflict (invite_id, user_id) do update set status = 'going', arrived_at = now();
  if (select count(*) from invite_guests where invite_id = i.id and reward > 0) < i.max_guests
     and not exists (select 1 from invite_guests ig join invites o on o.id = ig.invite_id
                     where o.host_id = i.host_id and ig.user_id = me and ig.reward > 0 and public.life_day(ig.arrived_at) = public.life_day(now())) then
    fresh := exists (select 1 from profiles where id = me and created_at > now() - interval '7 days');
    paid := 300 + case when fresh then 1000 else 0 end;
    update invite_guests set reward = paid where invite_id = i.id and user_id = me;
    perform coin_move(i.host_id, paid, 'earn', 'Guest at your party', 'party-guest:' || i.id || ':' || me);
    perform public.add_points(i.host_id, 'wellbeing', 10, 'party-host:' || i.id || ':' || me);
    pts := public.add_points(me, 'wellbeing', 20, 'party-guest:' || i.id || ':' || me);
  end if;
  return jsonb_build_object('code', i.code, 'title', i.title, 'host', (select username from profiles where id = i.host_id), 'points', pts, 'hostPaid', paid);
end $$;
grant execute on function public.invite_arrive(text) to authenticated;

/** Your Invites app: what you're hosting and what you're invited to, while they're on or coming up. */
create or replace function public.my_invites() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'hosting', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'startsAt', i.starts_at, 'endsAt', i.ends_at,
        'going', (select count(*) from invite_guests g where g.invite_id = i.id and g.status = 'going'),
        'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null)) order by i.starts_at)
      from invites i where i.host_id = auth.uid() and not i.cancelled and i.ends_at > now()), '[]'::jsonb),
    'invited', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'startsAt', i.starts_at, 'endsAt', i.ends_at,
        'status', g.status, 'host', (select username from profiles where id = i.host_id)) order by i.starts_at)
      from invite_guests g join invites i on i.id = g.invite_id
      where g.user_id = auth.uid() and g.status <> 'no' and not i.cancelled and i.ends_at > now()), '[]'::jsonb))
$$;
grant execute on function public.my_invites() to authenticated;

/** "Ask me out" link, answered: you both agreed, so you're dating (and friends). Same rules as Hayati. */
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
  if (public.my_relationship(i.host_id)).id is not null then raise exception 'they_are_taken'; end if;
  if (public.my_relationship(me)).id is not null then raise exception 'you_are_taken'; end if;
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

-- ---------------------------------------------------------------- reminders, 15 minutes before

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'invite_push_secret') then
    perform vault.create_secret(gen_random_uuid()::text, 'invite_push_secret');
  end if;
end $$;

create or replace function public.invite_push_tick() returns void
language plpgsql security definer set search_path = public as $$
declare secret text;
begin
  update invites set push_called_at = now()
    where kind in ('house_party', 'dinner', 'club_night') and not cancelled and push_called_at is null
      and starts_at <= now() + interval '15 minutes' and starts_at > now() - interval '5 minutes';
  if not found then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'invite_push_secret';
  perform net.http_post(url := 'https://mydubailife.app/api/push/invites',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret), body := '{}'::jsonb);
end $$;
revoke all on function public.invite_push_tick() from public, anon, authenticated;

/** For the app, with the secret: who to remind, handed over once per party. */
create or replace function public.invite_push_targets(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'invite_push_secret') then raise exception 'forbidden'; end if;
  with due as (
    update invites set reminded_at = now() where push_called_at is not null and reminded_at is null and not cancelled returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'code', d.code, 'title', d.title,
      'host', (select username from profiles where id = d.host_id), 'isHost', s.user_id = d.host_id)), '[]'::jsonb)
    into out
    from due d join push_subscriptions s on s.user_id = d.host_id
      or s.user_id in (select user_id from invite_guests g where g.invite_id = d.id and g.status in ('going', 'invited'));
  return out;
end $$;
grant execute on function public.invite_push_targets(text) to anon, authenticated;

create or replace function public.invite_push_done(p_secret text, p_gone text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'invite_push_secret') then raise exception 'forbidden'; end if;
  delete from push_subscriptions where endpoint = any (p_gone);
end $$;
grant execute on function public.invite_push_done(text, text[]) to anon, authenticated;

select cron.schedule('invite-push', '* * * * *', 'select public.invite_push_tick()');
