-- League standings show each player's equipped season title.
create or replace function public.my_league() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select * from league_members where week = public.league_week() and user_id = auth.uid()),
  prev as (select week, tier, coalesce(result, public.league_result(week, user_id)) res from league_members
           where user_id = auth.uid() and week < public.league_week() order by week desc limit 1)
  select jsonb_build_object(
    'week', public.league_week(),
    'endsAt', to_timestamp(((public.league_week() + 1) * 7 + 4) * 86400 + 5 * 3600),
    'joined', exists (select 1 from me),
    'tier', coalesce((select tier from me), (select least(5, greatest(1, tier + case res when 'up' then 1 when 'down' then -1 else 0 end)) from prev), 1),
    'lastResult', (select res from prev),
    'standings', coalesce((
      select jsonb_agg(jsonb_build_object('username', p.username, 'points', m.points, 'me', m.user_id = auth.uid(),
          'title', (select item_id from player_cosmetics c where c.user_id = m.user_id and c.equipped and c.item_id like 'title:%' limit 1),
          'plus', public.is_plus(m.user_id))
        order by m.points desc, m.joined_at)
      from league_members m join me on m.week = me.week and m.tier = me.tier and m.bracket = me.bracket
      join profiles p on p.id = m.user_id), '[]'::jsonb)
  )
$$;
