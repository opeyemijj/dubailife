-- Away players and requests that wait for them.
--   * A player who goes idle (2 minutes without a tap, or the app in the background) drops their live connection to
--     save capacity. Before they do, they leave an "away" note here: where they are and what they look like, so people
--     who arrive later still see them standing there (with a 💤), for up to 15 minutes.
--   * Asking an away player to dance, sit at your table or come over saves the request here (with a push
--     notification). When they're back, it pops up like any invite. Requests last 5 minutes.

create table if not exists public.room_away (
  room text not null check (char_length(room) <= 200),
  user_id uuid not null references public.profiles (id) on delete cascade,
  state jsonb not null,
  away_since timestamptz not null default now(),
  primary key (room, user_id)
);
create index if not exists room_away_room on public.room_away (room, away_since);
alter table public.room_away enable row level security;
drop policy if exists "see who's away" on public.room_away;
create policy "see who's away" on public.room_away for select using (auth.uid() is not null);
drop policy if exists "my away note" on public.room_away;
create policy "my away note" on public.room_away for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.live_requests (
  id bigint generated always as identity primary key,
  room text not null check (char_length(room) <= 200),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('join', 'dance', 'table')),
  table_id text check (table_id is null or char_length(table_id) <= 80),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
create index if not exists live_requests_to on public.live_requests (to_id, status, expires_at);
alter table public.live_requests enable row level security;

/** Ask an away player: saved for 5 minutes (one waiting request per person and room). */
create or replace function public.send_live_request(p_room text, p_to uuid, p_kind text, p_table text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_to = me then raise exception 'not_yourself'; end if;
  if p_kind not in ('join', 'dance', 'table') then raise exception 'bad_kind'; end if;
  if (select count(*) from live_requests where from_id = me and created_at > now() - interval '10 minutes') >= 20 then raise exception 'too_many_requests'; end if;
  update live_requests set status = 'expired' where from_id = me and to_id = p_to and room = p_room and status = 'pending';
  insert into live_requests (room, from_id, to_id, kind, table_id) values (left(p_room, 200), me, p_to, p_kind, left(p_table, 80)) returning id into rid;
  return rid;
end $$;
revoke execute on function public.send_live_request(text, uuid, text, text) from public, anon;
grant execute on function public.send_live_request(text, uuid, text, text) to authenticated;

/** Back from being away: the requests waiting for me in this room (handed over once). */
create or replace function public.take_live_requests(p_room text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); out jsonb;
begin
  if me is null then return '[]'::jsonb; end if;
  update live_requests set status = 'expired' where to_id = me and status = 'pending' and expires_at <= now();
  with taken as (
    update live_requests set status = 'delivered' where to_id = me and room = p_room and status = 'pending' and expires_at > now()
    returning id, from_id, kind, table_id, created_at)
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'table', t.table_id, 'at', t.created_at,
           'from', (select jsonb_build_object('id', p.id, 'username', p.username) from profiles p where p.id = t.from_id)) order by t.created_at), '[]'::jsonb)
    into out from taken t;
  return out;
end $$;
revoke execute on function public.take_live_requests(text) from public, anon;
grant execute on function public.take_live_requests(text) to authenticated;

/** Did they come back in time? (for the one who asked) */
create or replace function public.live_request_status(p_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select case when status = 'pending' and expires_at <= now() then 'expired' else status end from live_requests where id = p_id and from_id = auth.uid()
$$;
revoke execute on function public.live_request_status(bigint) from public, anon;
grant execute on function public.live_request_status(bigint) to authenticated;
