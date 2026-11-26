-- Quick courses at Abu Dhabi's and Doha's universities (src/data/academy/quick-courses.json, src/app/academy/quick):
-- enrol in the city the campus is in and pay; study the three lessons (at least 90 seconds); answer the quiz,
-- two of three right to pass, and the certificate is yours (retakes are free). Fees, cities and the answer key are
-- mirrored here from the JSON and checked by scripts/check-life-config.mjs.

create or replace function public.quick_course_rule(p_course text) returns jsonb
language sql immutable as $$
  select case p_course
    when 'qc-emirati-arabic' then '{"fee": 150, "city": "abu-dhabi", "key": [0, 1, 1]}'::jsonb
    when 'qc-gulf-hospitality' then '{"fee": 120, "city": "abu-dhabi", "key": [1, 0, 2]}'::jsonb
    when 'qc-ad-heritage' then '{"fee": 150, "city": "abu-dhabi", "key": [0, 1, 2]}'::jsonb
    when 'qc-french-basics' then '{"fee": 120, "city": "abu-dhabi", "key": [1, 0, 1]}'::jsonb
    when 'qc-clean-energy' then '{"fee": 180, "city": "abu-dhabi", "key": [1, 0, 1]}'::jsonb
    when 'qc-ai-prompts' then '{"fee": 200, "city": "abu-dhabi", "key": [1, 1, 1]}'::jsonb
    when 'qc-qatar-history' then '{"fee": 150, "city": "doha", "key": [0, 1, 0]}'::jsonb
    when 'qc-event-management' then '{"fee": 180, "city": "doha", "key": [1, 0, 0]}'::jsonb
    when 'qc-football-coaching' then '{"fee": 150, "city": "doha", "key": [0, 1, 1]}'::jsonb
    when 'qc-gulf-cuisine' then '{"fee": 140, "city": "doha", "key": [0, 0, 1]}'::jsonb
    when 'qc-arabic-calligraphy' then '{"fee": 140, "city": "doha", "key": [1, 0, 0]}'::jsonb
    when 'qc-phone-photography' then '{"fee": 100, "city": "doha", "key": [1, 0, 0]}'::jsonb
  end
$$;

/** The shortest time from enrolling to the quiz (the lessons have to be read). */
create or replace function public.quick_course_min_seconds() returns int
language sql immutable as $$ select 90 $$;

create table if not exists public.quick_course_enrolments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  fee bigint not null,
  enrolled_at timestamptz not null default now(),
  attempts int not null default 0,
  score int,
  completed_at timestamptz,
  primary key (user_id, course_id)
);
alter table public.quick_course_enrolments enable row level security;
drop policy if exists "own quick courses" on public.quick_course_enrolments;
create policy "own quick courses" on public.quick_course_enrolments for select using (user_id = auth.uid());

/** Enrols (and pays), in the course's city. Enrolling again returns the enrolment you have. */
create or replace function public.enroll_quick_course(p_course text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rule jsonb := quick_course_rule(p_course); e quick_course_enrolments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if rule is null then raise exception 'bad_course'; end if;
  select * into e from quick_course_enrolments where user_id = me and course_id = p_course;
  if found then return to_jsonb(e); end if;
  if player_city(me) <> rule ->> 'city' then raise exception 'not_in_city'; end if;
  insert into quick_course_enrolments (user_id, course_id, fee) values (me, p_course, (rule ->> 'fee')::bigint) returning * into e;
  perform coin_move(me, -((rule ->> 'fee')::bigint), 'spend', 'Quick course: ' || p_course, 'quick-course:' || p_course);
  return to_jsonb(e);
end $$;
revoke all on function public.enroll_quick_course(text) from public, anon;
grant execute on function public.enroll_quick_course(text) to authenticated;

/** Marks the quiz: two of three right passes (the certificate). Returns {passed, score, certificate_at}. */
create or replace function public.complete_quick_course(p_course text, p_answers int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rule jsonb := quick_course_rule(p_course); e quick_course_enrolments; right_n int := 0; k int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if rule is null then raise exception 'bad_course'; end if;
  select * into e from quick_course_enrolments where user_id = me and course_id = p_course for update;
  if not found then raise exception 'not_enrolled'; end if;
  if e.completed_at is not null then return jsonb_build_object('passed', true, 'score', e.score, 'certificate_at', e.completed_at, 'already', true); end if;
  if now() < e.enrolled_at + make_interval(secs => quick_course_min_seconds()) then raise exception 'too_fast'; end if;
  for k in 0 .. jsonb_array_length(rule -> 'key') - 1 loop
    if p_answers[k + 1] = (rule -> 'key' ->> k)::int then right_n := right_n + 1; end if;
  end loop;
  if right_n >= 2 then
    update quick_course_enrolments set score = right_n, completed_at = now(), attempts = attempts + 1 where user_id = me and course_id = p_course returning * into e;
    return jsonb_build_object('passed', true, 'score', right_n, 'certificate_at', e.completed_at);
  end if;
  update quick_course_enrolments set attempts = attempts + 1 where user_id = me and course_id = p_course;
  return jsonb_build_object('passed', false, 'score', right_n);
end $$;
revoke all on function public.complete_quick_course(text, int[]) from public, anon;
grant execute on function public.complete_quick_course(text, int[]) to authenticated;

/** My quick courses: enrolled and completed. */
create or replace function public.my_quick_courses() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('course', course_id, 'enrolled_at', enrolled_at, 'completed_at', completed_at, 'score', score) order by enrolled_at), '[]'::jsonb)
    from quick_course_enrolments where user_id = auth.uid()
$$;
revoke all on function public.my_quick_courses() from public, anon;
grant execute on function public.my_quick_courses() to authenticated;
