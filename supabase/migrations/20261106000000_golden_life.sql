-- Life after the Golden Visa (design spec 19.4 and US-5.5): the Hall of Residents (everyone who reached
-- Golden) and mentoring: Golden players see recently arrived players to befriend and guide.

/** The newest Golden residents and how many there are. */
create or replace function public.hall_of_residents() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'count', (select count(*) from life_state where visa_tier = 'GOLDEN'),
    'residents', coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('username', p.username, 'name', p.display_name) x
      from life_state s join profiles p on p.id = s.user_id where s.visa_tier = 'GOLDEN'
      order by s.created_at limit 30) t), '[]'::jsonb)
  )
$$;
grant execute on function public.hall_of_residents() to authenticated;

/** For Golden players: up to 5 players who joined in the last week, played recently and aren't friends yet. */
create or replace function public.mentor_matches() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'name', p.display_name, 'visa', s.visa_tier)), '[]'::jsonb)
  from (select s.* from life_state s join profiles p on p.id = s.user_id
        where exists (select 1 from life_state me where me.user_id = auth.uid() and me.visa_tier = 'GOLDEN')
          and p.created_at > now() - interval '7 days' and s.settled_at > now() - interval '2 days' and s.user_id <> auth.uid()
          and not exists (select 1 from friendships f where (f.user_id = auth.uid() and f.friend_id = s.user_id) or (f.friend_id = auth.uid() and f.user_id = s.user_id))
          and not public.is_blocked(auth.uid(), s.user_id)
        order by s.settled_at desc limit 5) s
  join profiles p on p.id = s.user_id
$$;
grant execute on function public.mentor_matches() to authenticated;
