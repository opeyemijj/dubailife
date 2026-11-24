-- Social, phase 1: players post too. Until now the City feed was written only by the game (homes, races, parties…);
-- now a player can post a caption with a snap taken in the game (never an upload from the phone) and the place they
-- were, comment and reply, like comments, mention people (@username), and get told when someone likes, comments,
-- replies, mentions or follows them. Their posts stay on their profile; the feed shows the last week as before.
-- Rules (lengths, rate limits, links, phone numbers, blocked words): src/data/social/rules.json, mirrored in the social
-- rules below (checked by scripts/check-life-config.mjs). Blocked players never see each other's posts or comments.

create or replace function public.social_rules() returns jsonb
language sql immutable as $$
  select '{"postMax":500,"commentMax":300,"postsPerDay":20,"commentsPerHour":60,"mentionsMax":10,"blocked":["fuck","fucking","fucker","motherfucker","shit","bitch","bastard","cunt","dick","pussy","whore","slut","faggot","retard","nigger","nigga","kill yourself","kys"]}'::jsonb
$$;

/** Refuses a post or comment that is too long, has a link or a phone number, or a blocked word. */
create or replace function public.social_text_check(p_text text, p_max int) returns text
language plpgsql immutable as $$
declare t text := btrim(coalesce(p_text, '')); w text;
begin
  if length(t) > p_max then raise exception 'too_long'; end if;
  if t ~* '(https?://|www\.|\.(com|net|org|io|app|me|ly|gg)(/|\s|$))' then raise exception 'no_links'; end if;
  if regexp_replace(t, '[\s\-\.\(\)]', '', 'g') ~ '\+?\d{8,}' then raise exception 'no_numbers'; end if;
  for w in select jsonb_array_elements_text(social_rules() -> 'blocked') loop
    if lower(t) ~ ('(^|[^a-z])' || w || '([^a-z]|$)') then raise exception 'blocked_words'; end if;
  end loop;
  return t;
end $$;

-- ---------------------------------------------------------------- posts

-- A player's own posts stay (the tidy-up only clears the game's posts after 30 days).
do $$ begin
  perform cron.unschedule('feed-tidy');
exception when others then null;
end $$;
select cron.schedule('feed-tidy', '50 3 * * *', $$delete from public.feed_posts where kind <> 'post' and created_at < now() - interval '30 days'$$);

create index if not exists feed_posts_actor_posts on public.feed_posts (actor_id, id desc) where kind = 'post';

/** Two players who have blocked each other (either way). */
create or replace function public.social_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- ---------------------------------------------------------------- notifications

create table if not exists public.social_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'comment', 'reply', 'mention', 'follow', 'comment_like')),
  post_id bigint references public.feed_posts (id) on delete cascade,
  comment_id bigint,
  snippet text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists social_notifications_user on public.social_notifications (user_id, id desc);
-- One notice per like or follow (liking twice doesn't notify twice).
create unique index if not exists social_notifications_once on public.social_notifications (user_id, actor_id, kind, post_id, comment_id) nulls not distinct
  where kind in ('like', 'follow', 'comment_like');
alter table public.social_notifications enable row level security;
drop policy if exists "see own social notifications" on public.social_notifications;
create policy "see own social notifications" on public.social_notifications for select using (user_id = auth.uid());

/** Tells a player something happened (never about themselves, never from someone they've blocked). */
create or replace function public.social_notify(p_user uuid, p_actor uuid, p_kind text, p_post bigint, p_comment bigint, p_snippet text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor or social_blocked(p_user, p_actor) then return; end if;
  insert into social_notifications (user_id, actor_id, kind, post_id, comment_id, snippet)
    values (p_user, p_actor, p_kind, p_post, p_comment, left(p_snippet, 120))
    on conflict do nothing;
end $$;
revoke all on function public.social_notify(uuid, uuid, text, bigint, bigint, text) from public, anon, authenticated;

/** The players @mentioned in a text (real usernames only, at most mentionsMax). */
create or replace function public.social_mentions(p_text text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(p.id), '{}') from (
    select distinct lower(m[1]) as u from regexp_matches(coalesce(p_text, ''), '@([A-Za-z0-9_.]{3,24})', 'g') m
    limit (social_rules() ->> 'mentionsMax')::int
  ) x join profiles p on p.username = x.u
$$;

/** Post a caption and/or a snap from the game, with the place it was taken. Returns the post's id. */
create or replace function public.create_post(p_text text, p_image text default null, p_place text default null, p_place_name text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t text; pid bigint; u uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  t := social_text_check(p_text, (social_rules() ->> 'postMax')::int);
  -- A snap must be one of mine, in the snaps bucket.
  if p_image is not null and p_image !~ ('^snaps/' || me::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|webp)$') then raise exception 'bad_image'; end if;
  if t = '' and p_image is null then raise exception 'empty'; end if;
  if (select count(*) from feed_posts where actor_id = me and kind = 'post' and created_at > now() - interval '1 day') >= (social_rules() ->> 'postsPerDay')::int then
    raise exception 'slow_down';
  end if;
  insert into feed_posts (actor_id, kind, data)
    values (me, 'post', jsonb_strip_nulls(jsonb_build_object('text', nullif(t, ''), 'image', p_image, 'place', p_place, 'placeName', left(p_place_name, 80))))
    returning id into pid;
  foreach u in array social_mentions(t) loop perform social_notify(u, me, 'mention', pid, null, t); end loop;
  return pid;
end $$;
revoke all on function public.create_post(text, text, text, text) from public, anon;
grant execute on function public.create_post(text, text, text, text) to authenticated;

/** Delete one of my posts (any kind: a game post about me too). */
create or replace function public.delete_post(p_post bigint) returns void
language sql security definer set search_path = public as $$
  delete from feed_posts where id = p_post and actor_id = auth.uid()
$$;
revoke all on function public.delete_post(bigint) from public, anon;
grant execute on function public.delete_post(bigint) to authenticated;

/** Like or unlike a post (and tell its author the first time). */
create or replace function public.like_post(p_post bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from feed_likes where post_id = p_post and user_id = auth.uid();
  if found then return false; end if;
  select actor_id into author from feed_posts where id = p_post;
  if author is null then raise exception 'no_post'; end if;
  if social_blocked(author, auth.uid()) then raise exception 'blocked'; end if;
  insert into feed_likes (post_id, user_id) values (p_post, auth.uid()) on conflict do nothing;
  perform social_notify(author, auth.uid(), 'like', p_post, null, null);
  return true;
end $$;

-- ---------------------------------------------------------------- comments

create table if not exists public.feed_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id bigint references public.feed_comments (id) on delete cascade,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists feed_comments_post on public.feed_comments (post_id, id);
create index if not exists feed_comments_user on public.feed_comments (user_id, created_at desc);
alter table public.feed_comments enable row level security;

create table if not exists public.feed_comment_likes (
  comment_id bigint not null references public.feed_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.feed_comment_likes enable row level security;

/** Comment on a post, or reply to a comment on it. Returns the new comment's id. */
create or replace function public.add_comment(p_post bigint, p_text text, p_parent bigint default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t text; author uuid; parent_author uuid; cid bigint; u uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  t := social_text_check(p_text, (social_rules() ->> 'commentMax')::int);
  if t = '' then raise exception 'empty'; end if;
  select actor_id into author from feed_posts where id = p_post;
  if author is null then raise exception 'no_post'; end if;
  if social_blocked(author, me) then raise exception 'blocked'; end if;
  if p_parent is not null then
    -- Replies hang off the top comment, one level deep.
    select coalesce(c.parent_id, c.id), c.user_id into p_parent, parent_author from feed_comments c where c.id = p_parent and c.post_id = p_post;
    if p_parent is null then raise exception 'no_comment'; end if;
    if social_blocked(parent_author, me) then raise exception 'blocked'; end if;
  end if;
  if (select count(*) from feed_comments where user_id = me and created_at > now() - interval '1 hour') >= (social_rules() ->> 'commentsPerHour')::int then
    raise exception 'slow_down';
  end if;
  insert into feed_comments (post_id, user_id, parent_id, body) values (p_post, me, p_parent, t) returning id into cid;
  perform social_notify(author, me, 'comment', p_post, cid, t);
  if parent_author is not null and parent_author <> author then perform social_notify(parent_author, me, 'reply', p_post, cid, t); end if;
  foreach u in array social_mentions(t) loop
    if u <> author and u is distinct from parent_author then perform social_notify(u, me, 'mention', p_post, cid, t); end if;
  end loop;
  return cid;
end $$;
revoke all on function public.add_comment(bigint, text, bigint) from public, anon;
grant execute on function public.add_comment(bigint, text, bigint) to authenticated;

/** Delete a comment: my own, or any on my post. */
create or replace function public.delete_comment(p_comment bigint) returns void
language sql security definer set search_path = public as $$
  delete from feed_comments c using feed_posts p
   where c.id = p_comment and p.id = c.post_id and auth.uid() in (c.user_id, p.actor_id)
$$;
revoke all on function public.delete_comment(bigint) from public, anon;
grant execute on function public.delete_comment(bigint) to authenticated;

/** Like or unlike a comment. Returns whether I like it now. */
create or replace function public.like_comment(p_comment bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare c feed_comments;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from feed_comment_likes where comment_id = p_comment and user_id = auth.uid();
  if found then return false; end if;
  select * into c from feed_comments where id = p_comment;
  if c.id is null then raise exception 'no_comment'; end if;
  if social_blocked(c.user_id, auth.uid()) then raise exception 'blocked'; end if;
  insert into feed_comment_likes (comment_id, user_id) values (p_comment, auth.uid()) on conflict do nothing;
  perform social_notify(c.user_id, auth.uid(), 'comment_like', c.post_id, c.id, c.body);
  return true;
end $$;
revoke all on function public.like_comment(bigint) from public, anon;
grant execute on function public.like_comment(bigint) to authenticated;

/** A post's comments, oldest first (replies carry their parent's id), without anyone either side has blocked. */
create or replace function public.post_comments(p_post bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'parentId', c.parent_id, 'body', c.body, 'at', c.created_at,
      'user', jsonb_build_object('id', u.id, 'username', u.username, 'name', u.display_name, 'look', u.citizen -> 'look'),
      'likes', (select count(*) from feed_comment_likes l where l.comment_id = c.id),
      'liked', exists (select 1 from feed_comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()),
      'mine', c.user_id = auth.uid()
    ) order by c.id), '[]'::jsonb)
    from feed_comments c join profiles u on u.id = c.user_id
   where c.post_id = p_post and not social_blocked(c.user_id, auth.uid())
$$;
revoke all on function public.post_comments(bigint) from public, anon;
grant execute on function public.post_comments(bigint) to authenticated;

-- ---------------------------------------------------------------- reading posts

/** One post as the feed shows it (for opening a post from a notification or a link). */
create or replace function public.post_json(p feed_posts) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
      'id', p.id, 'kind', p.kind, 'data', p.data, 'n', p.n, 'at', p.created_at,
      'actor', jsonb_build_object('id', a.id, 'username', a.username, 'name', a.display_name, 'look', a.citizen -> 'look'),
      'other', case when o.id is null then null else jsonb_build_object('id', o.id, 'username', o.username) end,
      'likes', (select count(*) from feed_likes l where l.post_id = p.id),
      'liked', exists (select 1 from feed_likes l where l.post_id = p.id and l.user_id = auth.uid()),
      'comments', (select count(*) from feed_comments c where c.post_id = p.id and not social_blocked(c.user_id, auth.uid())),
      'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.actor_id),
      'mine', p.actor_id = auth.uid())
    from profiles a left join profiles o on o.id = p.other_id
   where a.id = p.actor_id
$$;
revoke all on function public.post_json(feed_posts) from public, anon, authenticated;

create or replace function public.get_post(p_post bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select post_json(p) from feed_posts p where p.id = p_post and not social_blocked(p.actor_id, auth.uid())
$$;
revoke all on function public.get_post(bigint) from public, anon;
grant execute on function public.get_post(bigint) to authenticated;

/** The City feed (last week), with comment counts and whether each is mine. */
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
       and (coalesce(p_scope, 'all') <> 'posts' or p.kind = 'post')
       and p.actor_id not in (select id from blocked)
       and (p.other_id is null or p.other_id not in (select id from blocked))
     order by p.id desc
     limit greatest(1, least(coalesce(p_limit, 30), 60))
  )
  select coalesce(jsonb_agg(post_json(fp) order by fp.id desc), '[]'::jsonb)
    from feed_posts fp join profiles a on a.id = fp.actor_id
   where fp.id in (select id from posts) and a.username is not null
$$;

/** A player's own posts (all of them, newest first), for their profile. */
create or replace function public.user_posts(p_user uuid, p_before bigint default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(post_json(fp) order by fp.id desc), '[]'::jsonb) from feed_posts fp
   where fp.id in (
    select id from feed_posts
     where actor_id = p_user and kind = 'post' and (p_before is null or id < p_before) and not social_blocked(p_user, auth.uid())
     order by id desc limit 30)
$$;
revoke all on function public.user_posts(uuid, bigint) from public, anon;
grant execute on function public.user_posts(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------- my notifications

create or replace function public.my_social_notifications(p_limit int default 40) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'postId', n.post_id, 'commentId', n.comment_id, 'snippet', n.snippet, 'at', n.created_at, 'read', n.read_at is not null,
      'actor', jsonb_build_object('id', a.id, 'username', a.username, 'look', a.citizen -> 'look'),
      'image', (select p.data ->> 'image' from feed_posts p where p.id = n.post_id)
    ) order by n.id desc), '[]'::jsonb)
    from (select * from social_notifications where user_id = auth.uid() order by id desc limit greatest(1, least(coalesce(p_limit, 40), 100))) n
    join profiles a on a.id = n.actor_id
$$;
revoke all on function public.my_social_notifications(int) from public, anon;
grant execute on function public.my_social_notifications(int) to authenticated;

create or replace function public.social_unread() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from social_notifications where user_id = auth.uid() and read_at is null
$$;
revoke all on function public.social_unread() from public, anon;
grant execute on function public.social_unread() to authenticated;

create or replace function public.mark_social_read() returns void
language sql security definer set search_path = public as $$
  update social_notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;
revoke all on function public.mark_social_read() from public, anon;
grant execute on function public.mark_social_read() to authenticated;

-- A new follower is a notice too.
create or replace function public.social_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform social_notify(new.followee_id, new.follower_id, 'follow', null, null, null);
  return new;
end $$;
drop trigger if exists social_on_follow on public.follows;
create trigger social_on_follow after insert on public.follows for each row execute function public.social_on_follow();

-- Notices over 60 days old go.
do $$ begin
  perform cron.unschedule('social-notifications-tidy');
exception when others then null;
end $$;
select cron.schedule('social-notifications-tidy', '20 4 * * *', $$delete from public.social_notifications where created_at < now() - interval '60 days'$$);

-- ---------------------------------------------------------------- snaps (photos taken in the game)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snaps', 'snaps', true, 3145728, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "upload own snaps" on storage.objects;
create policy "upload own snaps" on storage.objects for insert to authenticated
  with check (bucket_id = 'snaps' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "read snaps" on storage.objects;
create policy "read snaps" on storage.objects for select using (bucket_id = 'snaps');
drop policy if exists "delete own snaps" on storage.objects;
create policy "delete own snaps" on storage.objects for delete to authenticated
  using (bucket_id = 'snaps' and (storage.foldername(name))[1] = auth.uid()::text);
