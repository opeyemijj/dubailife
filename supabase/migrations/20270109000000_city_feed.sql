-- Follow and the City Feed (requirements R3, R4).
--
-- Follow is one way (no accepting); friends stay mutual. The feed is written by the database itself, from what really
-- happened (a party set up, a game won, a home or car bought, a big gift, a wedding, a new job, a new arrival), so
-- nothing in it can be made up from the app. Players choose what of theirs is shared (feed_prefs). Admin accounts'
-- money never shows. Posts older than 7 days drop off the feed and are tidied away after 30.

-- ---------------------------------------------------------------- follows

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee on public.follows (followee_id);
alter table public.follows enable row level security;
drop policy if exists "see own follows" on public.follows;
create policy "see own follows" on public.follows for select using (auth.uid() in (follower_id, followee_id));

/** Follow one or more players (at most 50 at once). Returns how many were newly followed. */
create or replace function public.follow_users(p_users uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into follows (follower_id, followee_id)
    select auth.uid(), u from unnest(p_users[1:50]) u
     where u <> auth.uid() and exists (select 1 from profiles where id = u)
       and not exists (select 1 from user_blocks b where (b.blocker_id = u and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = u))
    on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.follow_users(uuid[]) from public, anon;
grant execute on function public.follow_users(uuid[]) to authenticated;

create or replace function public.unfollow_user(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from follows where follower_id = auth.uid() and followee_id = p_user
$$;
revoke all on function public.unfollow_user(uuid) from public, anon;
grant execute on function public.unfollow_user(uuid) to authenticated;

/** Followers and following for a player, and whether I follow them. */
create or replace function public.follow_counts(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'followers', (select count(*) from follows where followee_id = p_user),
    'following', (select count(*) from follows where follower_id = p_user),
    'iFollow', exists (select 1 from follows where follower_id = auth.uid() and followee_id = p_user))
$$;
grant execute on function public.follow_counts(uuid) to authenticated;

-- ---------------------------------------------------------------- the feed

create table if not exists public.feed_posts (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  other_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  -- Repeats within the hour fold into one post ("won 3 games of Ludo").
  merge_key text unique,
  n int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_recent on public.feed_posts (created_at desc);
create index if not exists feed_posts_actor on public.feed_posts (actor_id, created_at desc);
alter table public.feed_posts enable row level security;
-- Only through the functions below.

create table if not exists public.feed_likes (
  post_id bigint not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.feed_likes enable row level security;

/** What a player keeps out of the feed: any of 'money' (homes, cars, gifts), 'games', 'parties', 'life'. */
create table if not exists public.feed_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  hide text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.feed_prefs enable row level security;
drop policy if exists "see own feed prefs" on public.feed_prefs;
create policy "see own feed prefs" on public.feed_prefs for select using (user_id = auth.uid());

create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift') then 'money'
    when p_kind in ('win') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;

/** Writes a post, unless the player keeps that kind out, or it's an admin account's money. */
create or replace function public.feed_post(p_actor uuid, p_kind text, p_data jsonb, p_other uuid default null, p_merge text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cat text := feed_category(p_kind);
begin
  if p_actor is null then return; end if;
  if exists (select 1 from feed_prefs where user_id = p_actor and cat = any (hide)) then return; end if;
  if cat = 'money' and exists (select 1 from admins where user_id in (p_actor, p_other)) then return; end if;
  insert into feed_posts (actor_id, other_id, kind, data, merge_key)
    values (p_actor, p_other, p_kind, coalesce(p_data, '{}'::jsonb), p_merge)
    on conflict (merge_key) do update set n = feed_posts.n + 1, data = excluded.data, created_at = now();
end $$;
revoke all on function public.feed_post(uuid, text, jsonb, uuid, text) from public, anon, authenticated;

-- What writes the posts ---------------------------------------------------------------------------------------------

create or replace function public.feed_on_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(new.cancelled, false) then
    perform feed_post(new.host_id, 'party', jsonb_build_object('inviteId', new.id, 'title', new.title, 'label', new.label,
      'partyKind', new.kind, 'route', new.route, 'startsAt', new.starts_at, 'endsAt', new.ends_at, 'placeId', new.place_id),
      null, 'party:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists feed_on_invite on public.invites;
create trigger feed_on_invite after insert on public.invites for each row execute function public.feed_on_invite();

create or replace function public.feed_on_game() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.outcome = 'win' and new.mode = 'multiplayer' then
    perform feed_post(new.user_id, 'win', jsonb_build_object('game', new.game), null,
      'win:' || new.user_id || ':' || new.game || ':' || to_char(now() at time zone 'Asia/Dubai', 'YYYYMMDDHH24'));
  end if;
  return new;
end $$;
drop trigger if exists feed_on_game on public.game_results;
create trigger feed_on_game after insert on public.game_results for each row execute function public.feed_on_game();

create or replace function public.feed_on_arrival() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform feed_post(new.id, 'arrived', '{}'::jsonb, null, 'arrived:' || new.id);
  return new;
end $$;
drop trigger if exists feed_on_arrival on public.profiles;
create trigger feed_on_arrival after insert on public.profiles for each row execute function public.feed_on_arrival();

create or replace function public.feed_on_home() returns trigger
language plpgsql security definer set search_path = public as $$
declare f flats;
begin
  select * into f from flats where id = new.flat_id;
  perform feed_post(new.user_id, 'home', jsonb_build_object('flatId', new.flat_id, 'price', new.price,
    'buildingId', f.building_id, 'unit', f.unit, 'type', f.property_type), null, 'home:' || new.id);
  return new;
end $$;
drop trigger if exists feed_on_home on public.property_purchases;
create trigger feed_on_home after insert on public.property_purchases for each row execute function public.feed_on_home();

create or replace function public.feed_on_car() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform feed_post(new.user_id, 'car', jsonb_build_object('car', new.car, 'price', new.price), null, 'car:' || new.id);
  return new;
end $$;
drop trigger if exists feed_on_car on public.owned_cars;
create trigger feed_on_car after insert on public.owned_cars for each row execute function public.feed_on_car();

create or replace function public.feed_on_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.amount >= 1000000 then
    perform feed_post(new.from_id, 'gift', jsonb_build_object('amount', new.amount, 'place', new.place), new.to_id, 'gift:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists feed_on_transfer on public.transfers;
create trigger feed_on_transfer after insert on public.transfers for each row execute function public.feed_on_transfer();

create or replace function public.feed_on_marriage() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'married' and old.status is distinct from 'married' then
    perform feed_post(new.man_id, 'married', '{}'::jsonb, new.woman_id, 'married:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists feed_on_marriage on public.relationships;
create trigger feed_on_marriage after update on public.relationships for each row execute function public.feed_on_marriage();

create or replace function public.feed_on_hired() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  select name into v from ventures where id = new.venture_id;
  perform feed_post(new.user_id, 'hired', jsonb_build_object('title', new.title, 'venture', v), null,
    'hired:' || new.user_id || ':' || new.venture_id || ':' || to_char(new.hired_at, 'YYYYMMDD'));
  return new;
exception when undefined_column then
  perform feed_post(new.user_id, 'hired', jsonb_build_object('title', new.title), null,
    'hired:' || new.user_id || ':' || new.venture_id || ':' || to_char(new.hired_at, 'YYYYMMDD'));
  return new;
end $$;
drop trigger if exists feed_on_hired on public.venture_staff;
create trigger feed_on_hired after insert on public.venture_staff for each row execute function public.feed_on_hired();

-- Reading it --------------------------------------------------------------------------------------------------------

/**
 * The feed, newest first: p_scope 'all' (everyone) or 'following' (people I follow and my friends). Last 7 days,
 * never from or about someone I've blocked or who blocked me. p_before = the last id I have, for the next page.
 */
create or replace function public.city_feed(p_scope text default 'all', p_before bigint default null, p_limit int default 30)
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select followee_id as id from follows where follower_id = auth.uid()
    union select case when f.user_id = auth.uid() then f.friend_id else f.user_id end
      from friendships f where auth.uid() in (f.user_id, f.friend_id) and f.status = 'accepted'
    union select auth.uid()
  ),
  blocked as (
    select blocked_id as id from user_blocks where blocker_id = auth.uid()
    union select blocker_id from user_blocks where blocked_id = auth.uid()
  ),
  posts as (
    select p.* from feed_posts p
     where p.created_at > now() - interval '7 days'
       and (p_before is null or p.id < p_before)
       and (coalesce(p_scope, 'all') <> 'following' or p.actor_id in (select id from mine))
       and p.actor_id not in (select id from blocked)
       and (p.other_id is null or p.other_id not in (select id from blocked))
     order by p.id desc
     limit greatest(1, least(coalesce(p_limit, 30), 60))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'kind', p.kind, 'data', p.data, 'n', p.n, 'at', p.created_at,
      'actor', jsonb_build_object('id', a.id, 'username', a.username, 'name', a.display_name, 'look', a.citizen -> 'look'),
      'other', case when o.id is null then null else jsonb_build_object('id', o.id, 'username', o.username) end,
      'likes', (select count(*) from feed_likes l where l.post_id = p.id),
      'liked', exists (select 1 from feed_likes l where l.post_id = p.id and l.user_id = auth.uid()),
      'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.actor_id)
    ) order by p.id desc), '[]'::jsonb)
    from posts p
    join profiles a on a.id = p.actor_id
    left join profiles o on o.id = p.other_id
   where a.username is not null
$$;
revoke all on function public.city_feed(text, bigint, int) from public, anon;
grant execute on function public.city_feed(text, bigint, int) to authenticated;

/** Parties happening right now, with how many have arrived (the City Feed's "Live now"). */
create or replace function public.live_parties() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x ->> 'arrived' desc), '[]'::jsonb) from (
    select jsonb_build_object('inviteId', i.id, 'title', coalesce(i.title, i.label), 'partyKind', i.kind, 'route', i.route,
             'host', h.username, 'hostId', h.id, 'look', h.citizen -> 'look',
             'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null)) as x
      from invites i join profiles h on h.id = i.host_id
     where i.kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(i.cancelled, false)
       and i.starts_at <= now() and coalesce(i.ends_at, i.starts_at + interval '3 hours') > now()
     limit 20) s
$$;
revoke all on function public.live_parties() from public, anon;
grant execute on function public.live_parties() to authenticated;

/** Like or unlike a post. Returns whether I like it now. */
create or replace function public.like_post(p_post bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from feed_likes where post_id = p_post and user_id = auth.uid();
  if found then return false; end if;
  insert into feed_likes (post_id, user_id) values (p_post, auth.uid()) on conflict do nothing;
  return true;
end $$;
revoke all on function public.like_post(bigint) from public, anon;
grant execute on function public.like_post(bigint) to authenticated;

/** What of mine is kept out of the feed. */
create or replace function public.set_feed_hidden(p_hide text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into feed_prefs (user_id, hide) values (auth.uid(), coalesce(p_hide, '{}'))
    on conflict (user_id) do update set hide = excluded.hide, updated_at = now();
end $$;
revoke all on function public.set_feed_hidden(text[]) from public, anon;
grant execute on function public.set_feed_hidden(text[]) to authenticated;

-- Tidy: posts over 30 days old go.
do $$ begin
  perform cron.unschedule('feed-tidy');
exception when others then null;
end $$;
select cron.schedule('feed-tidy', '50 3 * * *', $$delete from public.feed_posts where created_at < now() - interval '30 days'$$);

-- A start: this week's homes, cars and arrivals (at the time they happened), so the feed isn't empty on day one.
insert into public.feed_posts (actor_id, kind, data, merge_key, created_at)
  select p.id, 'arrived', '{}'::jsonb, 'arrived:' || p.id, p.created_at from public.profiles p
   where p.created_at > now() - interval '7 days'
on conflict (merge_key) do nothing;
insert into public.feed_posts (actor_id, kind, data, merge_key, created_at)
  select c.user_id, 'car', jsonb_build_object('car', c.car, 'price', c.price), 'car:' || c.id, c.bought_at from public.owned_cars c
   where c.bought_at > now() - interval '7 days' and c.user_id not in (select user_id from public.admins)
on conflict (merge_key) do nothing;
insert into public.feed_posts (actor_id, kind, data, merge_key, created_at)
  select pp.user_id, 'home', jsonb_build_object('flatId', pp.flat_id, 'price', pp.price, 'buildingId', f.building_id, 'unit', f.unit, 'type', f.property_type),
         'home:' || pp.id, pp.bought_at
    from public.property_purchases pp left join public.flats f on f.id = pp.flat_id
   where pp.bought_at > now() - interval '7 days' and pp.user_id not in (select user_id from public.admins)
on conflict (merge_key) do nothing;

/** The newest post's id, for the City tab's "something new" dot. */
create or replace function public.city_latest() returns bigint
language sql stable security definer set search_path = public as $$
  select max(id) from feed_posts where created_at > now() - interval '7 days'
$$;
revoke all on function public.city_latest() from public, anon;
grant execute on function public.city_latest() to authenticated;
