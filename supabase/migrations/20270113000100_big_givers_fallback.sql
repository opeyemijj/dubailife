-- Big Givers always shows people: this week's givers, else last week's, else the last 30 days', else all-time. Each
-- row says which ('period'), like the top users list.

create or replace function public.given_between(p_from timestamptz, p_to timestamptz) returns table (id uuid, gifts bigint, drops bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with g as (select t.from_id as id, sum(t.amount) as amt from transfers t where t.created_at >= p_from and t.created_at < p_to and t.from_id <> t.to_id group by 1),
  r as (select d.giver_id as id, sum(c.amount) as amt from cash_drop_claims c join cash_drops d on d.id = c.drop_id where c.created_at >= p_from and c.created_at < p_to group by 1)
  select coalesce(g.id, r.id), coalesce(g.amt, 0)::bigint, coalesce(r.amt, 0)::bigint, (coalesce(g.amt, 0) + coalesce(r.amt, 0))::bigint
    from g full join r on r.id = g.id
$$;
revoke all on function public.given_between(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.big_givers_range(p_from timestamptz, p_to timestamptz, p_limit int) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'total')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'total', w.total, 'gifts', w.gifts, 'drops', w.drops, 'friend', friend_status(auth.uid(), p.id),
             'iFollow', exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.id)) as x
      from given_between(p_from, p_to) w join profiles p on p.id = w.id
     where w.total > 0 and p.username is not null and not off_leaderboard(p.id)
     order by w.total desc
     limit greatest(1, least(coalesce(p_limit, 10), 50))) t
$$;
revoke all on function public.big_givers_range(timestamptz, timestamptz, int) from public, anon, authenticated;

create or replace function public.big_givers_week(p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare wk timestamptz := dubai_week_start(); rows jsonb; period text;
begin
  rows := big_givers_range(wk, now() + interval '1 minute', p_limit); period := 'this_week';
  if jsonb_array_length(rows) = 0 then rows := big_givers_range(wk - interval '7 days', wk, p_limit); period := 'last_week'; end if;
  if jsonb_array_length(rows) = 0 then rows := big_givers_range(now() - interval '30 days', now() + interval '1 minute', p_limit); period := 'month'; end if;
  if jsonb_array_length(rows) = 0 then rows := big_givers_range('-infinity', now() + interval '1 minute', p_limit); period := 'ever'; end if;
  return coalesce((select jsonb_agg(r || jsonb_build_object('period', period)) from jsonb_array_elements(rows) r), '[]'::jsonb);
end $$;
revoke all on function public.big_givers_week(int) from public, anon;
grant execute on function public.big_givers_week(int) to authenticated;
