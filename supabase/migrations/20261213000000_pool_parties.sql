-- Pool parties: a party at a pool or beach club, alongside house parties, dinners and club nights. Every function that
-- knows which invites are parties now counts pool_party too (otherwise unchanged from their latest versions).

alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites add constraint invites_kind_check check (kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'ask_out', 'hire_decorator'));

-- from 20261209000000_events.sql
create or replace function public.create_event(p_kind text, p_title text, p_starts_at timestamptz, p_label text,
  p_flat text default null, p_route text default null, p_place text default null, p_venue text default null,
  p_decor text[] default '{}', p_max int default 20) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; c text; v_route text; hours int; cost bigint := 0; d text; iid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('house_party', 'dinner', 'club_night', 'pool_party') then raise exception 'bad_kind'; end if;
  hours := case p_kind when 'house_party' then 3 when 'dinner' then 2 else 4 end;
  if p_starts_at < now() - interval '10 minutes' or p_starts_at > now() + interval '7 days' then raise exception 'bad_time'; end if;
  if p_max < 2 or p_max > 20 then raise exception 'bad_size'; end if;
  if (select count(*) from invites where host_id = me and not cancelled and kind in ('house_party', 'dinner', 'club_night', 'pool_party') and ends_at > now()) >= 3 then raise exception 'too_many_parties'; end if;
  foreach d in array coalesce(p_decor, '{}') loop
    if public.party_decor_price(d) is null then raise exception 'bad_decor'; end if;
    cost := cost + public.party_decor_price(d);
  end loop;
  if p_flat is not null then
    if p_kind in ('club_night', 'pool_party') then raise exception 'bad_place'; end if;
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

-- from 20261209000000_events.sql
create or replace function public.invite_rsvp(p_code text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare i invites; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_status not in ('going', 'no') then raise exception 'bad_status'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
  if i.kind not in ('house_party', 'dinner', 'club_night', 'pool_party') then raise exception 'not_an_event'; end if;
  if i.host_id = me then raise exception 'your_party'; end if;
  if i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  if p_status = 'going' and not exists (select 1 from invite_guests where invite_id = i.id and user_id = me and status = 'going')
     and (select count(*) from invite_guests where invite_id = i.id and status = 'going') >= i.max_guests then
    raise exception 'full';
  end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, me, p_status)
    on conflict (invite_id, user_id) do update set status = excluded.status, responded_at = now();
end $$;

-- from 20261211000000_party_invites_by_guests.sql
create or replace function public.invite_player(p_code text, p_username text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i invites; who uuid; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
  if i.host_id <> me and not exists (select 1 from invite_guests where invite_id = i.id and user_id = me and status = 'going') then
    raise exception 'not_at_party';
  end if;
  if i.kind not in ('house_party', 'dinner', 'club_night', 'pool_party') or i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  select id into who from profiles where username = lower(trim(both '@' from trim(p_username)));
  if who is null then raise exception 'no_such_player'; end if;
  if who = i.host_id or who = me then raise exception 'your_party'; end if;
  if (select count(*) from invite_guests where invite_id = i.id) >= i.max_guests * 3 then raise exception 'full'; end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, who, 'invited') on conflict do nothing;
  return case when found then who end;
end $$;

-- from 20261210000000_party_actions.sql
create or replace function public.party_here(p_route text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'decor', to_jsonb(i.decor), 'endsAt', i.ends_at,
    'host', (select username from profiles where id = i.host_id), 'isHost', i.host_id = auth.uid(), 'lightsOut', i.lights_out,
    'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null))
  from invites i
  where i.route = p_route and not i.cancelled and i.kind in ('house_party', 'dinner', 'club_night', 'pool_party') and i.starts_at <= now() and i.ends_at > now()
  order by i.starts_at desc limit 1
$$;

-- from 20261209000000_events.sql
create or replace function public.invite_arrive(p_route text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); i invites; g invite_guests; paid bigint := 0; fresh boolean; pts int := 0;
begin
  if me is null then return null; end if;
  select * into i from invites
    where route = p_route and not cancelled and kind in ('house_party', 'dinner', 'club_night', 'pool_party') and starts_at <= now() and ends_at > now()
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

-- from 20261209000000_events.sql
create or replace function public.invite_push_tick() returns void
language plpgsql security definer set search_path = public as $$
declare secret text;
begin
  update invites set push_called_at = now()
    where kind in ('house_party', 'dinner', 'club_night', 'pool_party') and not cancelled and push_called_at is null
      and starts_at <= now() + interval '15 minutes' and starts_at > now() - interval '5 minutes';
  if not found then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'invite_push_secret';
  perform net.http_post(url := 'https://mydubailife.app/api/push/invites',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret), body := '{}'::jsonb);
end $$;

-- from 20261212000000_end_party.sql
create or replace function public.end_party(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set ends_at = now(), lights_out = false
    where code = upper(trim(p_code)) and host_id = auth.uid() and not cancelled
      and kind in ('house_party', 'dinner', 'club_night', 'pool_party') and starts_at <= now() and ends_at > now();
  if not found then raise exception 'not_your_party'; end if;
end $$;
