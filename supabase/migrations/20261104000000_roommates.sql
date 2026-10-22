-- Roommates (design spec 20.1): players who choose a shared bed space in their Blueprint are matched into a
-- household of up to 4, preferring households whose members played recently, so new arrivals start with a
-- small group. Leaving shared housing leaves the household. One row per household member.

create table if not exists public.households (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  household_id bigint not null references public.households (id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists household_members_house on public.household_members (household_id);
alter table public.households enable row level security;
alter table public.household_members enable row level security;
drop policy if exists "see own household" on public.household_members;
-- Roommates are read through my_roommates(); the table itself shows only your own row.
create policy "see own household" on public.household_members for select using (user_id = auth.uid());

create or replace function public.household_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare shared boolean := (new.blueprint ->> 'housing') = 'bed_space'; h bigint;
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
  insert into household_members (user_id, household_id) values (new.user_id, h);
  return new;
end $$;
drop trigger if exists household_sync on public.life_state;
create trigger household_sync after insert or update of blueprint on public.life_state
  for each row when (new.blueprint is not null) execute function public.household_sync();

/** The signed-in player's roommates. */
create or replace function public.my_roommates() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'name', p.display_name,
           'lastActive', s.settled_at, 'friend', exists (select 1 from friendships f where f.status = 'accepted'
             and ((f.user_id = auth.uid() and f.friend_id = p.id) or (f.friend_id = auth.uid() and f.user_id = p.id))))
         order by s.settled_at desc), '[]'::jsonb)
  from household_members m join household_members mine on mine.household_id = m.household_id and mine.user_id = auth.uid()
  join profiles p on p.id = m.user_id left join life_state s on s.user_id = m.user_id
  where m.user_id <> auth.uid()
$$;
grant execute on function public.my_roommates() to authenticated;
