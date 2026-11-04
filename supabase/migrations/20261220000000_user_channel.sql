-- Fewer, cheaper live connections.
--
-- 1. One private channel per player ("user:<id>"), fed by the database. Before, each player kept ~8 channels and
--    ~15 "postgres changes" subscriptions (messages, money, friends, knocks, game invites, love and family, services),
--    several unfiltered: every change anywhere was checked against every online player. Now each change is sent, by
--    triggers below, only to the players it concerns, on their own channel. Only that player can listen to it.
--    Rows a player may read anyway are sent whole (a message to them); for the rest only "something changed" is
--    sent, and the app reloads what it's allowed to see.
--
-- 2. Who's online, from a small table instead of one city-wide presence channel (where every join or leave went to
--    everyone). Active players ping every minute; the app reads a snapshot now and then.

-- ---------------------------------------------------------------- 1. the personal channel

-- Only you can listen to your own channel; nobody can send on it from the app (only the database does).
drop policy if exists "listen to my own channel" on realtime.messages;
create policy "listen to my own channel" on realtime.messages for select to authenticated
  using (realtime.topic() = 'user:' || auth.uid()::text and extension = 'broadcast');

/** Tells one player something changed. Never fails the write that caused it. */
create or replace function public.notify_user(p_user uuid, p_table text, p_op text, p_new jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  perform realtime.send(jsonb_build_object('table', p_table, 'eventType', p_op, 'new', p_new), 'db', 'user:' || p_user::text, true);
exception when others then null;
end $$;
revoke all on function public.notify_user(uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.tg_notify_users() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record := coalesce(new, old); who uuid; rel relationships; f flats;
begin
  case tg_table_name
    -- Rows the recipient can read anyway: sent whole.
    when 'messages' then perform public.notify_user(r.to_id, 'messages', tg_op, to_jsonb(r));
    when 'transfers' then perform public.notify_user(r.to_id, 'transfers', tg_op, to_jsonb(r));
    when 'game_invites' then perform public.notify_user(r.to_id, 'game_invites', tg_op, to_jsonb(r));
    when 'friendships' then
      -- A request goes to who it's for; an acceptance to who asked.
      if tg_op = 'INSERT' then perform public.notify_user(r.friend_id, 'friendships', tg_op, to_jsonb(r));
      else perform public.notify_user(r.user_id, 'friendships', tg_op, to_jsonb(r)); end if;
    when 'entry_requests' then
      -- A knock goes to whoever lives there; the answer to the visitor.
      if tg_op = 'INSERT' then
        select * into f from flats where id = r.flat_id;
        perform public.notify_user(f.owner_id, 'entry_requests', tg_op, to_jsonb(r));
        if f.tenant_id is distinct from f.owner_id then perform public.notify_user(f.tenant_id, 'entry_requests', tg_op, to_jsonb(r)); end if;
      else
        perform public.notify_user(r.visitor_id, 'entry_requests', tg_op, to_jsonb(r));
      end if;
    -- The rest: just "something changed" (the app reloads what it may see), so nothing leaks, like a partner's
    -- other relationships.
    when 'love_requests' then perform public.notify_user(r.from_id, 'love', tg_op); perform public.notify_user(r.to_id, 'love', tg_op);
    when 'relationships' then perform public.notify_user(r.man_id, 'love', tg_op); perform public.notify_user(r.woman_id, 'love', tg_op);
    when 'weddings' then
      select * into rel from relationships where id = r.relationship_id;
      perform public.notify_user(rel.man_id, 'love', tg_op); perform public.notify_user(rel.woman_id, 'love', tg_op);
    when 'family_links' then perform public.notify_user(r.from_id, 'love', tg_op); perform public.notify_user(r.to_id, 'love', tg_op);
    when 'children' then perform public.notify_user(r.mother_id, 'love', tg_op); perform public.notify_user(r.father_id, 'love', tg_op);
    when 'consults' then perform public.notify_user(r.patient_id, 'services', tg_op); perform public.notify_user(r.doctor_id, 'services', tg_op);
    when 'cases' then
      perform public.notify_user(r.suspect_id, 'services', tg_op);
      if r.lawyer_id is distinct from r.suspect_id then perform public.notify_user(r.lawyer_id, 'services', tg_op); end if;
      if r.officer_id is distinct from r.suspect_id and r.officer_id is distinct from r.lawyer_id then perform public.notify_user(r.officer_id, 'services', tg_op); end if;
    when 'illnesses' then perform public.notify_user(r.user_id, 'services', tg_op);
    else null;
  end case;
  return null;
exception when others then
  -- A notification must never break the change itself.
  return null;
end $$;
revoke all on function public.tg_notify_users() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['messages', 'transfers', 'game_invites', 'friendships', 'entry_requests', 'love_requests', 'relationships',
                           'weddings', 'family_links', 'children', 'consults', 'cases', 'illnesses'] loop
    execute format('drop trigger if exists notify_users on public.%I', t);
    execute format('create trigger notify_users after insert or update or delete on public.%I for each row execute function public.tg_notify_users()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. who's online

create table if not exists public.online_now (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  username text not null,
  place_id text,
  preset text,
  venue_path text,
  seen_at timestamptz not null default now()
);
create index if not exists online_now_seen on public.online_now (seen_at desc);
alter table public.online_now enable row level security;
-- Only through the functions below.

/** "I'm here" (every minute while active, and when I move somewhere). */
create or replace function public.ping_online(p_place text default null, p_preset text default null, p_venue text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); who text;
begin
  if me is null then return; end if;
  select username into who from profiles where id = me;
  if who is null then return; end if;
  insert into online_now (user_id, username, place_id, preset, venue_path, seen_at)
    values (me, who, left(p_place, 80), left(p_preset, 80), left(p_venue, 200), now())
    on conflict (user_id) do update set username = excluded.username, place_id = excluded.place_id, preset = excluded.preset,
      venue_path = excluded.venue_path, seen_at = now();
end $$;
revoke execute on function public.ping_online(text, text, text) from public, anon;
grant execute on function public.ping_online(text, text, text) to authenticated;

/** Who's online now (seen in the last 2 minutes): how many, and the most recent 300 with where they are. */
create or replace function public.online_snapshot() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'count', (select count(*) from online_now where seen_at > now() - interval '2 minutes'),
    'members', coalesce((select jsonb_agg(jsonb_build_object('username', username, 'placeId', place_id, 'preset', preset, 'venuePath', venue_path))
                from (select * from online_now where seen_at > now() - interval '2 minutes' order by seen_at desc limit 300) o), '[]'::jsonb))
$$;
grant execute on function public.online_snapshot() to anon, authenticated;

/** Signing out or closing: off the list straight away. */
create or replace function public.leave_online() returns void
language sql security definer set search_path = public as $$
  delete from online_now where user_id = auth.uid()
$$;
revoke execute on function public.leave_online() from public, anon;
grant execute on function public.leave_online() to authenticated;

-- Old rows tidied up every hour.
do $$ begin
  perform cron.unschedule('online-now-tidy');
exception when others then null;
end $$;
select cron.schedule('online-now-tidy', '17 * * * *', $$delete from public.online_now where seen_at < now() - interval '1 hour'$$);
