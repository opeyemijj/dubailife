-- Invite anyone anywhere: a link to a place in the game (a venue, a course, a campus, the marathon…). Someone new
-- lands on the invite page, signs up (crediting whoever invited them), finishes their profile and goes straight there.
-- Players can also be invited by username, from friends or chats: it's in their Invites app with a notification.

alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites add constraint invites_kind_check
  check (kind in ('house_party', 'dinner', 'club_night', 'pool_party', 'ask_out', 'hire_decorator', 'visit'));

-- Your link to a place: the same one again while it lasts (30 days), so sharing twice doesn't make two.
create or replace function public.create_visit(p_route text, p_title text, p_label text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text; r text := trim(p_route);
begin
  if me is null then raise exception 'not_signed_in'; end if;
  -- A page in the game, not a link off it.
  if r !~ '^/[A-Za-z0-9/_%.=&?-]{0,200}$' or r like '//%' then raise exception 'bad_route'; end if;
  select code into c from invites where host_id = me and kind = 'visit' and route = r and not cancelled and ends_at > now() + interval '1 day'
    order by created_at desc limit 1;
  if c is not null then return c; end if;
  if (select count(*) from invites where host_id = me and kind = 'visit' and created_at > now() - interval '1 day') >= 50 then raise exception 'too_many_links'; end if;
  c := public.new_invite_code();
  insert into invites (code, kind, host_id, title, label, route, starts_at, ends_at, max_guests)
    values (c, 'visit', me, left(coalesce(nullif(trim(p_title), ''), 'Dubai Life'), 80), left(coalesce(trim(p_label), ''), 120), r, now(), now() + interval '30 days', 200);
  return c;
end $$;
revoke execute on function public.create_visit(text, text, text) from public, anon;
grant execute on function public.create_visit(text, text, text) to authenticated;

-- Inviting a player by username now works for these links too (only by whoever made the link).
create or replace function public.invite_player(p_code text, p_username text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i invites; who uuid; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
  if i.host_id <> me and (i.kind = 'visit' or not exists (select 1 from invite_guests where invite_id = i.id and user_id = me and status = 'going')) then
    raise exception 'not_at_party';
  end if;
  if i.kind not in ('house_party', 'dinner', 'club_night', 'pool_party', 'visit') or i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  select id into who from profiles where username = lower(trim(both '@' from trim(p_username)));
  if who is null then raise exception 'no_such_player'; end if;
  if who = i.host_id or who = me then raise exception 'your_party'; end if;
  if (select count(*) from invite_guests where invite_id = i.id) >= i.max_guests * 3 then raise exception 'full'; end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, who, 'invited') on conflict do nothing;
  return case when found then who end;
end $$;
