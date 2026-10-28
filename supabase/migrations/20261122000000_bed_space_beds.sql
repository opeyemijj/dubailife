-- Bed spaces as real shared rooms: each household of up to four players shares one room with a bed in
-- each corner, and every member has their own bed (1 north-west, 2 north-east, 3 south-west, 4
-- south-east). A new member takes the lowest free bed; leaving frees it for the next.

alter table public.household_members add column if not exists bed int check (bed between 1 and 4);

-- Existing households: beds in the order people moved in.
update public.household_members m set bed = r.n
from (select user_id, row_number() over (partition by household_id order by joined_at, user_id) as n from public.household_members) r
where r.user_id = m.user_id and m.bed is null and r.n <= 4;
create unique index if not exists household_members_bed on public.household_members (household_id, bed);

create or replace function public.household_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare shared boolean := (new.blueprint ->> 'housing') = 'bed_space'; h bigint; free int;
begin
  if not shared then
    delete from household_members where user_id = new.user_id;
    -- Empty households are tidied away.
    delete from households x where not exists (select 1 from household_members m where m.household_id = x.id);
    return new;
  end if;
  if exists (select 1 from household_members where user_id = new.user_id) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('households'));
  -- The fullest household with room whose members have played in the last 3 days, else a new one.
  select m.household_id into h from household_members m join life_state s on s.user_id = m.user_id
    group by m.household_id
    having count(*) < 4 and max(s.settled_at) > now() - interval '3 days'
    order by count(*) desc, m.household_id limit 1;
  if h is null then insert into households default values returning id into h; end if;
  select min(b) into free from generate_series(1, 4) b where not exists (select 1 from household_members where household_id = h and bed = b);
  insert into household_members (user_id, household_id, bed) values (new.user_id, h, free);
  return new;
end $$;

/** Your bed in the shared room, and your roommates: their beds, looks and when they last played. */
create or replace function public.my_bedspace() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'myBed', (select bed from household_members where user_id = auth.uid()),
    'mates', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'name', p.display_name, 'look', p.citizen -> 'look',
               'bed', m.bed, 'lastActive', s.settled_at) order by m.bed)
             from household_members m join household_members mine on mine.household_id = m.household_id and mine.user_id = auth.uid()
             join profiles p on p.id = m.user_id left join life_state s on s.user_id = m.user_id
             where m.user_id <> auth.uid()), '[]'::jsonb)
  )
$$;
grant execute on function public.my_bedspace() to authenticated;
