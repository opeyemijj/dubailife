-- Married when the wedding's over, divorced when a marriage ends.
-- Until now a planned wedding only married the couple if both said "I do" in the 55 minutes round its start; if
-- they didn't, it was "missed" and they stayed engaged for ever. Now a wedding that's happened marries them: at
-- its end (45 minutes after the start) a planned wedding is done and the couple married (unless they've split).
-- A wedding held in an event hall they booked (src/components/arcade/games/events) marries them when it ends too.
-- And the family app can show a past relationship as a divorce (they'd married) or a break-up: my_love's "past".

create or replace function public.marry(p_relationship bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r relationships;
begin
  update relationships set status = 'married', married_at = now() where id = p_relationship and status = 'engaged' returning * into r;
  if r.id is null then return; end if;
  perform public.add_points(r.man_id, 'wellbeing', 50, 'married:' || r.id || ':m');
  perform public.add_points(r.woman_id, 'wellbeing', 50, 'married:' || r.id || ':w');
end $$;
revoke all on function public.marry(bigint) from public, anon, authenticated;

/** "I do" from both still marries them on the spot; a wedding nobody finished is done (and they're married) at its end. */
create or replace function public.settle_wedding(p_wedding bigint) returns void
language plpgsql security definer set search_path = public as $$
declare w weddings;
begin
  update weddings set status = 'done' where id = p_wedding and status = 'planned' and now() > starts_at + interval '45 minutes' returning * into w;
  if w.id is not null then perform public.marry(w.relationship_id); end if;
end $$;
revoke all on function public.settle_wedding(bigint) from public, anon, authenticated;

/** An engaged couple's wedding in a hall one of them booked, after they got engaged: married once it's ended. */
create or replace function public.settle_hall_weddings(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r relationships;
begin
  for r in select * from relationships where status = 'engaged' and p_user in (man_id, woman_id) loop
    if exists (select 1 from hall_bookings b where b.host_id in (r.man_id, r.woman_id) and b.event_type = 'wedding' and b.status = 'booked'
               and b.ends_at < now() and b.starts_at > coalesce(r.engaged_at, r.created_at)) then
      perform public.marry(r.id);
    end if;
  end loop;
end $$;
revoke all on function public.settle_hall_weddings(uuid) from public, anon, authenticated;

-- Weddings already "missed" (nobody said "I do" in time) count as held: those couples are married now.
do $$ declare w record; begin
  for w in select id, relationship_id from weddings where status = 'missed' loop
    update weddings set status = 'done' where id = w.id;
    perform public.marry(w.relationship_id);
  end loop;
end $$;

-- my_love, now settling hall weddings and listing past relationships ("past").
create or replace function public.my_love() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g text := public.gender_of(auth.uid()); d int := public.life_day(now()); wid bigint; rels jsonb;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform public.check_discoveries(me);
  for wid in select w.id from weddings w join relationships r on r.id = w.relationship_id where me in (r.man_id, r.woman_id) and r.status <> 'ended' and w.status = 'planned' loop
    perform public.settle_wedding(wid);
  end loop;
  -- A wedding held in a hall the couple booked (after they got engaged) marries them once it's over too.
  perform public.settle_hall_weddings(me);
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'status', r.status, 'level', r.level, 'ring', r.ring, 'since', r.created_at, 'engagedAt', r.engaged_at, 'marriedAt', r.married_at,
      'partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(r, me)),
      'lovedToday', exists (select 1 from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'love'),
      'dateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = me and kind = 'date'),
      'partnerDateToday', (select place from love_days where relationship_id = r.id and day = d and user_id = public.partner_of(r, me) and kind = 'date'),
      'wedding', (select code from weddings where relationship_id = r.id and status in ('planned', 'done') order by created_at desc limit 1)) order by r.created_at), '[]'::jsonb)
    into rels from relationships r where r.status <> 'ended' and me in (r.man_id, r.woman_id);
  return jsonb_build_object(
    'gender', g,
    'canDate', public.can_date(me),
    'relationships', rels,
    'relationship', rels -> 0,
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'ring', q.ring, 'place', q.place, 'message', q.message,
                  'from', jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look')) order by q.created_at)
                from love_requests q join profiles p on p.id = q.from_id where q.to_id = me and q.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'to', p.username) order by q.created_at)
                from love_requests q join profiles p on p.id = q.to_id where q.from_id = me and q.status = 'pending'), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('code', w.code, 'startsAt', w.starts_at, 'venue', w.venue) order by w.starts_at)
                from wedding_guests gu join weddings w on w.id = gu.wedding_id where gu.user_id = me and gu.rsvp = 'yes' and w.status = 'planned'), '[]'::jsonb),
    -- What I found out about my partner, not yet dealt with.
    'discoveries', coalesce((select jsonb_agg(jsonb_build_object('relationship', o.id, 'status', o.status, 'foundAt', x.found_at,
                  'partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(mine, me)),
                  'other', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles
                            where id = case when o.man_id = public.partner_of(mine, me) then o.woman_id else o.man_id end)) order by x.found_at)
                from love_discoveries x join relationships o on o.id = x.relationship_id
                join relationships mine on mine.status <> 'ended' and me in (mine.man_id, mine.woman_id) and public.partner_of(mine, me) in (o.man_id, o.woman_id)
                where x.viewer = me and x.resolved is null and o.status <> 'ended'), '[]'::jsonb),
    -- Partners of mine who found out about another of my relationships (and haven't decided yet).
    'caught', coalesce((select jsonb_agg(jsonb_build_object('by', (select username from profiles where id = x.viewer),
                  'about', (select username from profiles where id = public.partner_of(o, me))) order by x.found_at)
                from love_discoveries x join relationships o on o.id = x.relationship_id
                where me in (o.man_id, o.woman_id) and x.resolved is null and o.status <> 'ended'), '[]'::jsonb),
    'candidates', case when public.can_date(me) and g is not null then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look') order by p.username)
                from friendships f join profiles p on p.id = case when f.user_id = me then f.friend_id else f.user_id end
                where f.status = 'accepted' and me in (f.user_id, f.friend_id)
                  and p.citizen -> 'look' ->> 'gender' is not null and p.citizen -> 'look' ->> 'gender' <> g
                  and public.can_date(p.id)
                  and not exists (select 1 from relationships r2 where r2.status <> 'ended' and (r2.man_id, r2.woman_id) in ((me, p.id), (p.id, me)))
                  and not exists (select 1 from family_links fl where fl.status = 'accepted' and least(fl.from_id, fl.to_id) = least(me, p.id) and greatest(fl.from_id, fl.to_id) = greatest(me, p.id))), '[]'::jsonb)
                else '[]'::jsonb end,
    -- Relationships that ended, newest first: a divorce when they'd married, else a break-up.
    'past', coalesce((select jsonb_agg(jsonb_build_object('partner', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = public.partner_of(r, me)),
                  'divorced', r.married_at is not null, 'since', r.created_at, 'marriedAt', r.married_at, 'endedAt', r.ended_at, 'endedByMe', r.ended_by = me) order by r.ended_at desc)
                from (select * from relationships where status = 'ended' and me in (man_id, woman_id) order by ended_at desc limit 5) r), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_love() to authenticated;
