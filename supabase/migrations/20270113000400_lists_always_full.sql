-- Top users and Big Givers are always full: this week's first, then last week's, then the weeks before (up to 12
-- weeks back), then all-time, until the list has its 10 (Top users then adds the most recently active players).
-- Nobody appears twice; each row says which week it's from ('period': this_week, last_week, weeks_ago:N, ever,
-- active), so the screen can say so.

create or replace function public.top_users_week(p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 10), 50));
  wk timestamptz := dubai_week_start(); out jsonb := '[]'::jsonb; ids uuid[] := '{}'; rows jsonb; r jsonb; w int; period text;
begin
  for w in 0..12 loop
    exit when jsonb_array_length(out) >= lim;
    if w = 0 then rows := top_users_range(wk, now() + interval '1 minute', 50); period := 'this_week';
    else rows := top_users_range(wk - make_interval(days => 7 * w), wk - make_interval(days => 7 * (w - 1)), 50);
         period := case when w = 1 then 'last_week' else 'weeks_ago:' || w end; end if;
    for r in select * from jsonb_array_elements(rows) loop
      exit when jsonb_array_length(out) >= lim;
      if not ((r ->> 'id')::uuid = any (ids)) then
        out := out || jsonb_build_array(r || jsonb_build_object('period', period));
        ids := ids || (r ->> 'id')::uuid;
      end if;
    end loop;
  end loop;
  -- Still short: the most recently active players.
  if jsonb_array_length(out) < lim then
    for r in
      select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'score', 0,
               'friend', friend_status(auth.uid(), p.id), 'period', 'active') as x
        from profiles p
       where p.username is not null and not off_leaderboard(p.id) and not (p.id = any (ids))
       order by p.last_seen desc nulls last
       limit lim - jsonb_array_length(out)
    loop
      out := out || jsonb_build_array(r);
    end loop;
  end if;
  return out;
end $$;
revoke all on function public.top_users_week(int) from public, anon;
grant execute on function public.top_users_week(int) to authenticated;

create or replace function public.big_givers_week(p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 10), 50));
  wk timestamptz := dubai_week_start(); out jsonb := '[]'::jsonb; ids uuid[] := '{}'; rows jsonb; r jsonb; w int; period text;
begin
  for w in 0..13 loop
    exit when jsonb_array_length(out) >= lim;
    if w = 0 then rows := big_givers_range(wk, now() + interval '1 minute', 50); period := 'this_week';
    elsif w = 13 then rows := big_givers_range('-infinity', now() + interval '1 minute', 50); period := 'ever';
    else rows := big_givers_range(wk - make_interval(days => 7 * w), wk - make_interval(days => 7 * (w - 1)), 50);
         period := case when w = 1 then 'last_week' else 'weeks_ago:' || w end; end if;
    for r in select * from jsonb_array_elements(rows) loop
      exit when jsonb_array_length(out) >= lim;
      if not ((r ->> 'id')::uuid = any (ids)) then
        out := out || jsonb_build_array(r || jsonb_build_object('period', period));
        ids := ids || (r ->> 'id')::uuid;
      end if;
    end loop;
  end loop;
  return out;
end $$;
revoke all on function public.big_givers_week(int) from public, anon;
grant execute on function public.big_givers_week(int) to authenticated;
