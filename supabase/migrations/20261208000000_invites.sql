-- Invites (house parties first). A host creates an invite with a short code; anyone can open mydubailife.app/i/<code>
-- and see who, what, where and when, signed in or not. The page then walks them through: log in or sign up, finish
-- their profile, head to the party. Replies (going / not going) are kept per guest. Guests get into a house party
-- because the host's home is opened to visitors when the party is made.

create table if not exists public.invites (
  id bigint generated always as identity primary key,
  code text not null unique,
  kind text not null check (kind in ('house_party')),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  label text not null,              -- where, as shown: "2-bedroom apartment · Dubai Marina"
  route text not null,              -- where in the game it happens
  flat_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_guests int not null default 20,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists invites_host on public.invites (host_id, starts_at desc);
alter table public.invites enable row level security;

create table if not exists public.invite_guests (
  invite_id bigint not null references public.invites (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'no')),
  responded_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);
alter table public.invite_guests enable row level security;

/** Throw a house party at a home you own or rent. Returns the invite code. */
create or replace function public.create_house_party(p_flat text, p_route text, p_label text, p_title text, p_starts_at timestamptz, p_max int default 20)
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f flats; c text; tries int := 0;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into f from flats where id = p_flat and (owner_id = me or tenant_id = me);
  if f.id is null then raise exception 'not_your_home'; end if;
  if p_route is null or left(p_route, length('/property/' || f.building_id || '/')) <> '/property/' || f.building_id || '/' then raise exception 'bad_route'; end if;
  if p_starts_at < now() - interval '10 minutes' or p_starts_at > now() + interval '7 days' then raise exception 'bad_time'; end if;
  if p_max < 2 or p_max > 50 then raise exception 'bad_size'; end if;
  if (select count(*) from invites where host_id = me and not cancelled and ends_at > now()) >= 3 then raise exception 'too_many_parties'; end if;
  loop
    -- Six letters and digits people can read out loud (no 0/O, 1/I/L).
    c := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from invites where code = c);
    tries := tries + 1;
    if tries > 20 then raise exception 'try_again'; end if;
  end loop;
  insert into invites (code, kind, host_id, title, label, route, flat_id, starts_at, ends_at, max_guests)
    values (c, 'house_party', me, left(coalesce(nullif(trim(p_title), ''), 'House party'), 60), left(p_label, 80), p_route, f.id, p_starts_at, p_starts_at + interval '3 hours', p_max);
  update flats set access = 'public' where id = f.id;
  return c;
end $$;
grant execute on function public.create_house_party(text, text, text, text, timestamptz, int) to authenticated;

/** Everything the invite page shows. Works signed out; signed in it adds your own reply. */
create or replace function public.invite_view(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i invites; me uuid := auth.uid();
begin
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then return null; end if;
  return jsonb_build_object(
    'code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'route', i.route,
    'startsAt', i.starts_at, 'endsAt', i.ends_at, 'maxGuests', i.max_guests, 'cancelled', i.cancelled,
    'host', (select jsonb_build_object('username', username, 'look', citizen -> 'look') from profiles where id = i.host_id),
    'going', (select count(*) from invite_guests where invite_id = i.id and status = 'going'),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'look', p.citizen -> 'look') order by g.responded_at)
      from (select * from invite_guests where invite_id = i.id and status = 'going' order by responded_at limit 12) g join profiles p on p.id = g.user_id), '[]'::jsonb),
    'isHost', me is not null and me = i.host_id,
    'mine', (select status from invite_guests where invite_id = i.id and user_id = me));
end $$;
grant execute on function public.invite_view(text) to anon, authenticated;

/** Going or not. */
create or replace function public.invite_rsvp(p_code text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare i invites; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_status not in ('going', 'no') then raise exception 'bad_status'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
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

/** Parties you're hosting that haven't ended. */
create or replace function public.my_parties() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', i.code, 'title', i.title, 'label', i.label, 'startsAt', i.starts_at, 'endsAt', i.ends_at,
    'going', (select count(*) from invite_guests g where g.invite_id = i.id and g.status = 'going')) order by i.starts_at), '[]'::jsonb)
  from invites i where i.host_id = auth.uid() and not i.cancelled and i.ends_at > now()
$$;
grant execute on function public.my_parties() to authenticated;

create or replace function public.cancel_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set cancelled = true where code = upper(trim(p_code)) and host_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
end $$;
grant execute on function public.cancel_invite(text) to authenticated;
