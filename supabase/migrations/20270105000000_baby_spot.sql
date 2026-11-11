-- Babies at home: where each child is in the home, shared by both parents. A parent can pick a baby up and carry
-- them round the house (upstairs too), and put them down in a bed, on a chair or sofa, or on the floor. The spot
-- is one small object, written by either parent:
--   { "carriedBy": <parent id> }                                  while a parent is carrying them, or
--   { "flat", "level", "x", "y", "z", "yaw", "on": "bed" | "chair" | "floor" }   where they were put down.
-- The live room tells the other parent at once (src/app/home, a "baby" event); this keeps it for next time.

alter table public.children add column if not exists spot jsonb;

/** A parent sets where their child is (carried by them, or put down somewhere in the home). */
create or replace function public.set_child_spot(p_child bigint, p_spot jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_spot is not null and (jsonb_typeof(p_spot) <> 'object' or octet_length(p_spot::text) > 600) then raise exception 'bad_spot'; end if;
  -- Carrying: only as yourself.
  if p_spot ? 'carriedBy' and (p_spot ->> 'carriedBy') is distinct from me::text then raise exception 'not_you'; end if;
  update children set spot = p_spot where id = p_child and me in (mother_id, father_id) and due_at <= now();
  if not found then raise exception 'not_your_child'; end if;
end $$;
grant execute on function public.set_child_spot(bigint, jsonb) to authenticated;

-- The family, now with each child's spot.
create or replace function public.my_family() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d int := public.life_day(now());
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return jsonb_build_object(
    -- What each relative is to me: from my side, their relation as asked; from theirs, the inverse.
    'relatives', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'status', f.status, 'mine', f.from_id = me,
                  'relation', case when f.from_id = me then f.relation
                                   else case f.relation when 'parent' then 'child' when 'child' then 'parent' else f.relation end end,
                  'person', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = case when f.from_id = me then f.to_id else f.from_id end))
                  order by f.status, f.created_at)
                from family_links f where me in (f.from_id, f.to_id) and f.status <> 'declined'), '[]'::jsonb),
    'children', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'gender', c.gender, 'conceivedAt', c.conceived_at, 'dueAt', c.due_at,
                  'born', c.due_at <= now(), 'nannyUntil', c.nanny_until,
                  'scans', to_jsonb(c.scans), 'deliveredAt', c.delivered_at, 'bornAt', c.born_at, 'birthScore', c.birth_score,
                  'spot', c.spot,
                  'mother', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = c.mother_id),
                  'father', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = c.father_id),
                  'careToday', coalesce((select jsonb_agg(action) from child_care where child_id = c.id and day = d), '[]'::jsonb),
                  -- Care given over the last 3 days (of 9 possible), for how happy they are.
                  'careRecent', (select count(*) from child_care where child_id = c.id and day > d - 3)) order by c.conceived_at)
                from children c where me in (c.mother_id, c.father_id)), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_family() to authenticated;
