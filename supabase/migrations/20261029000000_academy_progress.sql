-- Academic City progress on the server (design spec sections 6 and 13.6). Course content and answer keys
-- stay in src/data/courses and src/data/books (JSON); the database records only each player's progress
-- in academy_enrolments: lessons in order, one new lesson (or the exam) per course every 20 hours, and
-- graduation. That row is what the student visa checks.
--
-- Grading: /api/academy/grade marks answers on the server against the JSON and calls academy_record with
-- the service key. Until SUPABASE_SERVICE_ROLE_KEY is set in production, the app may report its own
-- result through academy_record_self (setting academy.self_grading, on by default); admins switch it off
-- once the key is live so results can't be faked.

-- The course catalogue lives in JSON, so enrolments no longer need a row in academy_courses.
alter table public.academy_enrolments drop constraint if exists academy_enrolments_course_id_fkey;

-- The old self-reported entry points are retired.
revoke execute on function public.academy_enrol(text), public.academy_start(text, int), public.academy_submit(text, int, int, int) from authenticated;

update public.app_settings set value = value || '{"self_grading": true}'::jsonb where key = 'academy' and not (value ? 'self_grading');

/** Records one graded try. p_step is the lesson number, or lessons + 1 for the final exam. p_catch_up is
    how many lessons the player had passed before progress moved to the server (used once, capped). */
create or replace function public.academy_record(p_user uuid, p_course text, p_lessons int, p_step int, p_passed boolean,
  p_score int, p_catch_up int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e academy_enrolments; unlock timestamptz; hours int := coalesce((setting('academy') ->> 'unlock_hours')::int, 20);
begin
  if p_lessons < 1 or p_lessons > 60 or p_step < 1 or p_step > p_lessons + 1 then raise exception 'bad_step'; end if;
  select * into e from academy_enrolments where user_id = p_user and course_id = p_course for update;
  if e.user_id is null then
    insert into academy_enrolments (user_id, course_id, passed) values (p_user, p_course, least(greatest(coalesce(p_catch_up, 0), 0), p_lessons))
      returning * into e;
  end if;
  if e.graduated_at is not null then return jsonb_build_object('status', 'graduated', 'passed', e.passed); end if;
  if p_step <= e.passed then return jsonb_build_object('status', 'already', 'passed', e.passed); end if;
  if p_step <> e.passed + 1 then return jsonb_build_object('status', 'out_of_order', 'passed', e.passed, 'next', e.passed + 1); end if;
  unlock := e.last_passed_at + make_interval(hours => hours);
  if unlock > now() then return jsonb_build_object('status', 'locked', 'passed', e.passed, 'unlockAt', unlock); end if;
  if not p_passed then
    update academy_enrolments set attempts = attempts + 1 where user_id = p_user and course_id = p_course;
    return jsonb_build_object('status', 'failed', 'passed', e.passed);
  end if;
  if p_step <= p_lessons then
    update academy_enrolments set passed = p_step, attempts = 0, last_passed_at = now()
      where user_id = p_user and course_id = p_course returning * into e;
    return jsonb_build_object('status', 'passed', 'passed', e.passed, 'unlockAt', now() + make_interval(hours => hours));
  end if;
  update academy_enrolments set passed = p_step, attempts = 0, last_passed_at = now(), exam_score = greatest(0, least(100, p_score)), graduated_at = now()
    where user_id = p_user and course_id = p_course returning * into e;
  return jsonb_build_object('status', 'graduated_now', 'passed', e.passed, 'score', e.exam_score);
end $$;
revoke all on function public.academy_record(uuid, text, int, int, boolean, int, int) from public, anon, authenticated;

/** The app reports its own result. Only while academy.self_grading is on (until the server grader is live). */
create or replace function public.academy_record_self(p_course text, p_lessons int, p_step int, p_passed boolean, p_score int, p_catch_up int default 0)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not coalesce((setting('academy') ->> 'self_grading')::boolean, false) then raise exception 'server_grading_only'; end if;
  return public.academy_record(auth.uid(), p_course, p_lessons, p_step, p_passed, p_score, p_catch_up);
end $$;
revoke all on function public.academy_record_self(text, int, int, boolean, int, int) from public, anon;
grant execute on function public.academy_record_self(text, int, int, boolean, int, int) to authenticated;
