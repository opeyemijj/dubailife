-- Club promoters: a player job. The Dubai Nightlife Collective hires Club promoters (Job Board, with an interview).
-- Promoters run events at any venue with bigger guest lists (up to 200) and more at once (6), and earn AED 150 for
-- every guest who turns up (on top of the usual host reward, for the same guests: one paid arrival per guest per
-- host a day), plus career points.
-- Numbers mirror src/data/economy/promoters.json (scripts/check-life-config.mjs).

alter table public.venture_jobs drop constraint if exists venture_jobs_service_check;
alter table public.venture_jobs add constraint venture_jobs_service_check check (service in ('doctor', 'police', 'lawyer', 'decorator', 'promoter'));

with c(name, title, wage, shifts, req, service) as (values
  ('Dubai Nightlife Collective', 'Club promoter', 2200, 4, 'none', 'promoter'))
, v as (
  insert into public.ventures (type, name, system)
  select 'system', c.name, true from c where not exists (select 1 from public.ventures x where x.system and x.name = c.name)
  returning id, name)
insert into public.venture_jobs (venture_id, title, weekly_wage, shifts_per_week, requirement, service)
select v.id, c.title, c.wage, c.shifts, c.req, c.service from v join c on c.name = v.name;

insert into public.interview_keys (set_id, answers) values ('Dubai Nightlife Collective', '{1,0,2}')
on conflict (set_id) do update set answers = excluded.answers;

alter table public.invites add column if not exists promoted boolean not null default false;

create or replace function public.create_event(p_kind text, p_title text, p_starts_at timestamptz, p_label text,
  p_flat text default null, p_route text default null, p_place text default null, p_venue text default null,
  p_decor text[] default '{}', p_max int default 20) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; c text; v_route text; hours int; cost bigint := 0; d text; iid bigint;
  promoter boolean := public.service_of(auth.uid()) = 'promoter';
  -- Promoters run bigger events (up to 200 guests) and more of them at once (6).
  max_size int := case when public.service_of(auth.uid()) = 'promoter' then 200 else 20 end;
  max_events int := case when public.service_of(auth.uid()) = 'promoter' then 6 else 3 end;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('house_party', 'dinner', 'club_night', 'pool_party') then raise exception 'bad_kind'; end if;
  hours := case p_kind when 'house_party' then 3 when 'dinner' then 2 else 4 end;
  if p_starts_at < now() - interval '10 minutes' or p_starts_at > now() + interval '7 days' then raise exception 'bad_time'; end if;
  if p_max < 2 or p_max > max_size then raise exception 'bad_size'; end if;
  if (select count(*) from invites where host_id = me and not cancelled and kind in ('house_party', 'dinner', 'club_night', 'pool_party') and ends_at > now()) >= max_events then raise exception 'too_many_parties'; end if;
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
  -- A promoter's event at a venue is promoted: they earn a commission for every guest who turns up.
  if f.id is null and promoter then update invites set promoted = true where id = iid; end if;
  if f.id is not null then update flats set access = 'public' where id = f.id; end if;
  return c;
end $$;

-- The commission: when a guest's arrival at a promoted event is paid, the promoter earns AED 150 and career points.
create or replace function public.promoter_commission() returns trigger
language plpgsql security definer set search_path = public as $$
declare i invites;
begin
  if coalesce(old.reward, 0) > 0 or coalesce(new.reward, 0) <= 0 then return new; end if;
  select * into i from invites where id = new.invite_id;
  if i.id is null or not i.promoted or new.user_id = i.host_id then return new; end if;
  perform coin_move(i.host_id, 150, 'earn', 'Promoter commission', 'promoter:' || i.id || ':' || new.user_id);
  perform public.add_points(i.host_id, 'career', 5, 'promoter:' || i.id || ':' || new.user_id);
  return new;
end $$;
revoke all on function public.promoter_commission() from public, anon, authenticated;
drop trigger if exists promoter_commission on public.invite_guests;
create trigger promoter_commission after update of reward on public.invite_guests
  for each row execute function public.promoter_commission();

/** A promoter's numbers: events run, guests who came, and commission earned. */
create or replace function public.my_promotions() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'events', (select count(*) from invites where host_id = auth.uid() and promoted),
    'guests', (select count(*) from invite_guests g join invites i on i.id = g.invite_id where i.host_id = auth.uid() and i.promoted and g.reward > 0),
    'earned', (select count(*) * 150 from invite_guests g join invites i on i.id = g.invite_id where i.host_id = auth.uid() and i.promoted and g.reward > 0))
$$;
grant execute on function public.my_promotions() to authenticated;
