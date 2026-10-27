-- Inviting someone to a game room by name: the invite reaches them live (and by push) with a Join button
-- that opens the room (/games/<game>?room=<code>). Only players in a room still in its lobby can invite,
-- a room can't invite more people than it has seats for, and nobody can be spammed.

create table if not exists public.game_invites (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  code text not null,
  status text not null default 'sent' check (status in ('sent', 'joined', 'declined')),
  created_at timestamptz not null default now(),
  unique (room_id, to_id)
);
create index if not exists game_invites_to on public.game_invites (to_id, created_at desc);
alter table public.game_invites enable row level security;
drop policy if exists "see own game invites" on public.game_invites;
create policy "see own game invites" on public.game_invites for select using (auth.uid() in (from_id, to_id));

create or replace function public.invite_to_game(p_room uuid, p_to uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r game_rooms; iid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from game_rooms where id = p_room;
  if r.id is null or r.status <> 'lobby' then raise exception 'room_closed'; end if;
  if not exists (select 1 from jsonb_array_elements(r.players) p where (p ->> 'id')::uuid = me) then raise exception 'not_in_room'; end if;
  if p_to = me or not exists (select 1 from profiles where id = p_to) then raise exception 'no_such_player'; end if;
  if exists (select 1 from jsonb_array_elements(r.players) p where (p ->> 'id')::uuid = p_to) then raise exception 'already_in_room'; end if;
  if (select count(*) from game_invites where room_id = p_room) >= r.max_players * 4 then raise exception 'too_many_invites'; end if;
  if (select count(*) from game_invites where from_id = me and created_at > now() - interval '1 hour') >= 40 then raise exception 'too_many_invites'; end if;
  insert into game_invites (room_id, from_id, to_id, game, code) values (p_room, me, p_to, r.game, r.code)
    on conflict (room_id, to_id) do update set created_at = now(), status = 'sent'
    returning id into iid;
  return iid;
end $$;
grant execute on function public.invite_to_game(uuid, uuid) to authenticated;

create or replace function public.answer_game_invite(p_invite bigint, p_join boolean) returns void
language sql security definer set search_path = public as $$
  update game_invites set status = case when p_join then 'joined' else 'declined' end where id = p_invite and to_id = auth.uid()
$$;
grant execute on function public.answer_game_invite(bigint, boolean) to authenticated;

do $$ begin alter publication supabase_realtime add table public.game_invites; exception when duplicate_object then null; end $$;
