-- Pregnancy and birth at the hospital (src/components/arcade/games/maternity): the three scans during the 7-day
-- pregnancy, and the delivery, played by the mother at Latifa Women and Children Hospital or Dubai Hospital. A
-- baby is still born on time without any of this (due_at passing is the birth, as before); delivering at the
-- hospital can bring the birth forward by up to a day and records the hospital and the birth story.
-- The windows are mirrored from src/data/life/family.json "maternity" (scripts/check-life-config.mjs).

alter table public.children add column if not exists scans int[] not null default '{}';
alter table public.children add column if not exists delivered_at timestamptz;
alter table public.children add column if not exists born_at text;
alter table public.children add column if not exists birth_score int check (birth_score is null or birth_score between 0 and 100);

create or replace function public.maternity_hospital(p_id text) returns boolean
language sql immutable as $$ select p_id in ('latifa-hospital', 'dubai-hospital') $$;

/** A scan done (1 first scan, 2 anatomy scan, 3 growth scan): by either parent, each from its day of the pregnancy. */
create or replace function public.record_scan(p_child bigint, p_stage int, p_hospital text) returns int[]
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c children; elapsed numeric;
begin
  select * into c from children where id = p_child for update;
  if c.id is null or me not in (c.mother_id, c.father_id) then raise exception 'not_your_child'; end if;
  if c.due_at <= now() then raise exception 'already_born'; end if;
  if not public.maternity_hospital(p_hospital) then raise exception 'not_a_hospital'; end if;
  if p_stage not between 1 and 3 then raise exception 'bad_stage'; end if;
  elapsed := extract(epoch from now() - c.conceived_at) / 86400;
  if elapsed < (array[0, 2, 4])[p_stage] then raise exception 'scan_too_early'; end if;
  if not (p_stage = any(c.scans)) then
    update children set scans = array(select distinct unnest(scans || p_stage) order by 1) where id = p_child returning scans into c.scans;
  end if;
  return c.scans;
end $$;
grant execute on function public.record_scan(bigint, int, text) to authenticated;

/** The delivery: the mother, at a maternity hospital, from 24 hours before the due date. The baby is born now. */
create or replace function public.deliver_baby(p_child bigint, p_hospital text, p_score int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c children;
begin
  select * into c from children where id = p_child for update;
  if c.id is null or me <> c.mother_id then raise exception 'not_the_mother'; end if;
  if c.delivered_at is not null or c.due_at <= now() then raise exception 'already_born'; end if;
  if now() < c.due_at - interval '24 hours' then raise exception 'labour_too_early'; end if;
  if not public.maternity_hospital(p_hospital) then raise exception 'not_a_hospital'; end if;
  update children set delivered_at = now(), due_at = least(due_at, now()), born_at = p_hospital,
         birth_score = greatest(0, least(100, coalesce(p_score, 0)))
    where id = p_child returning * into c;
  return jsonb_build_object('id', c.id, 'bornAt', c.born_at, 'dueAt', c.due_at);
end $$;
grant execute on function public.deliver_baby(bigint, text, int) to authenticated;

/** My family, now with each child's scans and birth story. */
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
                  'mother', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = c.mother_id),
                  'father', (select jsonb_build_object('id', id, 'username', username, 'look', citizen -> 'look') from profiles where id = c.father_id),
                  'careToday', coalesce((select jsonb_agg(action) from child_care where child_id = c.id and day = d), '[]'::jsonb),
                  -- Care given over the last 3 days (of 9 possible), for how happy they are.
                  'careRecent', (select count(*) from child_care where child_id = c.id and day > d - 3)) order by c.conceived_at)
                from children c where me in (c.mother_id, c.father_id)), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_family() to authenticated;
