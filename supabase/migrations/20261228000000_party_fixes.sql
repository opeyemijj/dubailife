-- Party fixes (user, 2026-11-05).
-- 1. "There's already a party there" was wrong: a shared visit link for the home (kind 'visit', valid a month) counted
--    as a party at that time. Only events count now.
-- 2. The host can end any party now (pool parties and seminars too).
-- 3. A party nobody is at ends by itself: everyone there checks in every minute (party_ping); one empty for 5 minutes
--    is ended (every minute, by cron).

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
  -- Only events count (not the month-long visit links people share for a home).
  if exists (select 1 from invites where invites.route = v_route and not cancelled and invites.kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar')
             and starts_at < p_starts_at + make_interval(hours => hours) and ends_at > p_starts_at) then
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

create or replace function public.end_party(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set ends_at = now(), lights_out = false
    where code = upper(trim(p_code)) and host_id = auth.uid() and not cancelled
      and kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar') and starts_at <= now() and ends_at > now();
  if not found then raise exception 'not_your_party'; end if;
end $$;
revoke execute on function public.end_party(text) from public, anon;
grant execute on function public.end_party(text) to authenticated;

alter table public.invites add column if not exists last_seen_at timestamptz;

-- Someone is at the party (the host or a guest): it's not empty.
create or replace function public.party_ping(p_code text) returns void
language sql security definer set search_path = public as $$
  update invites set last_seen_at = now()
  where code = upper(trim(p_code)) and auth.uid() is not null and not cancelled and starts_at <= now() and ends_at > now()
    and kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar')
$$;
revoke execute on function public.party_ping(text) from public, anon;
grant execute on function public.party_ping(text) to authenticated;

-- Parties nobody has been at for 5 minutes (and on for at least 5) end.
create or replace function public.end_empty_parties() returns int
language sql security definer set search_path = public as $$
  with done as (
    update invites set ends_at = now(), lights_out = false
    where kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'seminar') and not cancelled
      and starts_at <= now() - interval '5 minutes' and ends_at > now()
      and coalesce(last_seen_at, starts_at) < now() - interval '5 minutes'
    returning 1)
  select count(*)::int from done
$$;
revoke all on function public.end_empty_parties() from public, anon, authenticated;
select cron.unschedule('end-empty-parties') where exists (select 1 from cron.job where jobname = 'end-empty-parties');
select cron.schedule('end-empty-parties', '* * * * *', 'select public.end_empty_parties()');
