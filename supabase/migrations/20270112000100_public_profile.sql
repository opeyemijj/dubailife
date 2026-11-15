-- A player's public profile (/u/<username>): who they are, their net worth, their homes (address in the city),
-- cars, job, who they're married to, followers, how they rank, and what they've been doing. Nothing if either of
-- you has blocked the other. Where they are right now is never shown.

create or replace function public.public_profile(p_username text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles; me uuid := auth.uid(); homes_v bigint; cars_v bigint; out jsonb;
begin
  select * into p from profiles where username = lower(trim(p_username));
  if p.id is null then return null; end if;
  if me is not null and exists (select 1 from user_blocks b where (b.blocker_id = me and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = me)) then
    return null;
  end if;

  select coalesce(sum(coalesce((select pp.price from property_purchases pp where pp.flat_id = f.id and pp.user_id = p.id order by pp.bought_at desc limit 1), f.sale_price, 0)), 0)
    into homes_v from flats f where f.owner_id = p.id;
  select coalesce(sum(coalesce(c.price, 0)), 0) into cars_v from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false);

  out := jsonb_build_object(
    'id', p.id, 'username', p.username, 'name', p.display_name, 'look', p.citizen -> 'look',
    'joined', p.created_at,
    'online', exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes'),
    'lastSeen', p.last_seen,
    'isMe', p.id = me,
    'worth', jsonb_build_object('total', p.balance + homes_v + cars_v, 'cash', p.balance, 'homes', homes_v, 'cars', cars_v),
    'homes', coalesce((select jsonb_agg(jsonb_build_object('buildingId', f.building_id, 'unit', f.unit, 'type', f.property_type,
                         'bedrooms', f.bedrooms, 'view', f.view, 'owned', f.owner_id = p.id) order by (f.owner_id = p.id) desc)
                       from flats f where f.owner_id = p.id or (f.tenant_id = p.id and (f.tenant_until is null or f.tenant_until > now()))), '[]'::jsonb),
    'starterHome', nullif(p.citizen ->> 'home', ''),
    'cars', coalesce((select jsonb_agg(jsonb_build_object('car', c.car, 'price', c.price, 'plate', c.plate) order by c.price desc nulls last)
                      from owned_cars c where c.user_id = p.id and not coalesce(c.is_stolen, false)), '[]'::jsonb),
    'job', (select jsonb_build_object('title', s.title, 'venture', v.name) from venture_staff s left join ventures v on v.id = s.venture_id
             where s.user_id = p.id order by s.hired_at desc limit 1),
    'partner', (select jsonb_build_object('username', o.username, 'status', r.status)
                  from relationships r join profiles o on o.id = case when r.man_id = p.id then r.woman_id else r.man_id end
                 where p.id in (r.man_id, r.woman_id) and r.status <> 'ended' order by r.created_at desc limit 1),
    'followers', (select count(*) from follows where followee_id = p.id),
    'following', (select count(*) from follows where follower_id = p.id),
    'friends', (select count(*) from friendships where status = 'accepted' and p.id in (user_id, friend_id)),
    'iFollow', exists (select 1 from follows where follower_id = me and followee_id = p.id),
    'friend', friend_status(me, p.id),
    'generous', is_generous(p.id),
    'wins', (select count(*) from game_results where user_id = p.id and outcome = 'win' and mode = 'multiplayer'),
    'partiesHosted', (select count(*) from invites where host_id = p.id and kind in ('house_party', 'pool_party', 'club_night', 'seminar') and not coalesce(cancelled, false)),
    'topRank', (select r.n from (select (x ->> 'id')::uuid as id, row_number() over () as n from jsonb_array_elements(top_users_week(10)) x) r where r.id = p.id),
    'richRank', (select r.n from (select (x ->> 'id')::uuid as id, row_number() over () as n from jsonb_array_elements(richest_users(50)) x) r where r.id = p.id),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'n', f.n, 'at', f.created_at,
                          'other', case when o.id is null then null else jsonb_build_object('id', o.id, 'username', o.username) end) order by f.id desc)
                        from (select * from feed_posts where actor_id = p.id order by id desc limit 8) f left join profiles o on o.id = f.other_id), '[]'::jsonb)
  );
  return out;
end $$;
revoke all on function public.public_profile(text) from public, anon;
grant execute on function public.public_profile(text) to authenticated;
