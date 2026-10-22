-- Discover: also list the courses the player is enrolled in, so "Learn Python" or "Read Think and Grow Rich"
-- tick off on their own.
create or replace function public.my_enrolled_courses() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(distinct c), '[]'::jsonb) from (
    select course_id c from academy_enrolments where user_id = auth.uid()
    union select k from profiles p, jsonb_object_keys(case when jsonb_typeof(p.citizen -> 'academic' -> 'enrolled') = 'object' then p.citizen -> 'academic' -> 'enrolled' else '{}'::jsonb end) k
      where p.id = auth.uid()
  ) x
$$;
grant execute on function public.my_enrolled_courses() to authenticated;
