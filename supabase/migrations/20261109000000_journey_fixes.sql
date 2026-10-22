-- Customer-journey fixes: visa_progress also says whether the player has any course (for the student
-- visa button), and the first-day "work a shift" step counts shifts at player ventures too.

create or replace function public.visa_progress(p_user uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = public as $$
  with own as (
    select distinct on (pp.flat_id) pp.price from property_purchases pp join flats f on f.id = pp.flat_id and f.owner_id = p_user
    where pp.user_id = p_user order by pp.flat_id, pp.bought_at desc)
  select jsonb_build_object(
    'earned', coalesce((select sum(delta) from coin_ledger where user_id = p_user and kind = 'earn' and delta > 0), 0),
    'purchased', coalesce((select sum(delta) from coin_ledger where user_id = p_user and kind = 'purchase' and delta > 0), 0),
    'property', coalesce((select sum(price) from own), 0),
    'course', public.has_course(p_user),
    'degree', public.has_degree(p_user),
    'honours', exists (select 1 from academy_enrolments where user_id = p_user and graduated_at is not null and exam_score >= 95 and course_id !~ '^(dc|gems|gw)-'),
    'venture', exists (select 1 from venture_members m join venture_staff s on s.venture_id = m.venture_id where m.user_id = p_user and m.role in ('owner', 'partner')),
    'employed', exists (select 1 from venture_staff where user_id = p_user)
      or exists (select 1 from profiles where id = p_user and citizen ? 'job' and citizen->'job' <> 'null'::jsonb)
  )
$$;

create or replace function public.first_day_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'blueprint', exists (select 1 from life_state where user_id = auth.uid() and blueprint is not null),
    'shift', exists (select 1 from profiles where id = auth.uid() and citizen -> 'job' ->> 'lastShiftAt' is not null)
          or exists (select 1 from venture_staff where user_id = auth.uid() and last_shift_day is not null),
    'lesson', exists (select 1 from academy_enrolments where user_id = auth.uid() and passed > 0),
    'friend', exists (select 1 from friendships where auth.uid() in (user_id, friend_id)),
    'push', exists (select 1 from push_subscriptions where user_id = auth.uid()),
    'claimed', exists (select 1 from app_bonuses where user_id = auth.uid() and kind = 'first_day'),
    'reward', coalesce((setting('app_bonus') ->> 'first_day')::bigint, 0)
  )
$$;
