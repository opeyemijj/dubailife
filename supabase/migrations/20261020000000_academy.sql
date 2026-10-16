-- Academic City: courses at two universities and two secondary schools. Enrol (tuition in virtual AED),
-- pass one lesson a day (a short read and a quiz), then a final exam to graduate. Graduates get a
-- certificate, a place on the institution's Dean's List and a one-time award (part of their tuition back).
-- The lessons themselves live in the app (src/lib/academy); the database keeps progress and money.

insert into public.app_settings (key, value) values
  ('academy', '{"school_fee": 5000, "uni_fee": 20000, "school_discount_pct": 20, "award_pct": 25, "retake_fee": 500, "unlock_hours": 20, "pass_pct": 70}')
on conflict (key) do nothing;

create or replace function public.academy_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(setting('academy'), '{}'::jsonb);
$$;
grant execute on function public.academy_settings() to anon, authenticated;

-- ---------------------------------------------------------------- courses

create table if not exists public.academy_courses (
  id text primary key,
  institution text not null,
  kind text not null check (kind in ('school', 'university', 'accelerator')),
  title text not null,
  lessons int not null check (lessons between 1 and 20),
  open boolean not null default false
);
alter table public.academy_courses enable row level security;
drop policy if exists "courses are public" on public.academy_courses;
create policy "courses are public" on public.academy_courses for select using (true);

insert into public.academy_courses (id, institution, kind, title, lessons, open) values
  ('onebrain-ai', 'onebrain', 'accelerator', 'Applied AI & Prompt Engineering', 6, true),
  ('onebrain-crypto', 'onebrain', 'accelerator', 'Crypto, Web3 & VARA Compliance', 6, true),
  ('onebrain-forex', 'onebrain', 'accelerator', 'Forex & Algorithmic Trading', 6, true),
  ('onebrain-programming', 'onebrain', 'accelerator', 'Modern Full-Stack & Python Automation', 6, true),
  ('onebrain-marketing', 'onebrain', 'accelerator', 'Performance Marketing & Viral Growth', 6, true),
  ('onebrain-ecommerce', 'onebrain', 'accelerator', 'Cross-Border E-commerce & Brand Building', 6, true),
  ('onebrain-cyber', 'onebrain', 'accelerator', 'Ethical Hacking & Bug Bounty Hunting', 6, true),
  ('onebrain-content', 'onebrain', 'accelerator', 'High-Value Content Creation & Personal Branding', 6, true),
  ('onebrain-data', 'onebrain', 'accelerator', 'Data Analytics & AI Business Intelligence', 6, true),
  ('onebrain-sales', 'onebrain', 'accelerator', 'High-Ticket Closing & B2B Negotiation', 6, true),
  ('aud-business', 'aud', 'university', 'Business & Entrepreneurship in Dubai', 6, true),
  ('aud-real-estate', 'aud', 'university', 'Real Estate & Property Investment', 6, true),
  ('ud-cybersecurity', 'university-of-dubai', 'university', 'Cybersecurity Essentials', 6, true),
  ('dc-uae-studies', 'dubai-college', 'school', 'UAE Studies & National Heritage', 6, true),
  ('gems-arabic', 'wellington', 'school', 'Arabic for Newcomers & Dubai Etiquette', 6, true)
on conflict (id) do update set institution = excluded.institution, kind = excluded.kind, title = excluded.title, lessons = excluded.lessons, open = excluded.open;

-- ---------------------------------------------------------------- enrolments

create table if not exists public.academy_enrolments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.academy_courses (id) on delete cascade,
  fee_paid bigint not null default 0,
  -- Lessons passed so far (the exam is the step after the last lesson).
  passed int not null default 0,
  -- Tries at the current step: the first is free, each retake costs the retake fee.
  attempts int not null default 0,
  last_passed_at timestamptz,
  exam_score int,
  graduated_at timestamptz,
  award bigint,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index if not exists academy_enrolments_graduates on public.academy_enrolments (course_id, exam_score desc) where graduated_at is not null;
alter table public.academy_enrolments enable row level security;
drop policy if exists "own enrolments" on public.academy_enrolments;
create policy "own enrolments" on public.academy_enrolments for select using (user_id = auth.uid());

/** What a course costs this player (school graduates get a discount at the universities). */
create or replace function public.academy_fee(p_course text) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare c academy_courses; s jsonb := academy_settings(); fee bigint;
begin
  select * into c from academy_courses where id = p_course;
  if c.id is null then return null; end if;
  fee := case c.kind when 'school' then coalesce((s ->> 'school_fee')::bigint, 5000) else coalesce((s ->> 'uni_fee')::bigint, 20000) end;
  if c.kind = 'university' and auth.uid() is not null and exists (
    select 1 from academy_enrolments e join academy_courses k on k.id = e.course_id
    where e.user_id = auth.uid() and k.kind = 'school' and e.graduated_at is not null
  ) then
    fee := fee * (100 - coalesce((s ->> 'school_discount_pct')::int, 20)) / 100;
  end if;
  return fee;
end $$;
grant execute on function public.academy_fee(text) to anon, authenticated;

create or replace function public.academy_enrol(p_course text) returns public.academy_enrolments
language plpgsql security definer set search_path = public as $$
declare c academy_courses; fee bigint; e academy_enrolments;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into c from academy_courses where id = p_course;
  if c.id is null or not c.open then raise exception 'course_closed'; end if;
  if exists (select 1 from academy_enrolments where user_id = auth.uid() and course_id = p_course) then raise exception 'already_enrolled'; end if;
  fee := academy_fee(p_course);
  if fee > 0 then perform coin_move(auth.uid(), -fee, 'spend', 'Academic City tuition: ' || c.title, 'academy:' || c.id); end if;
  insert into academy_enrolments (user_id, course_id, fee_paid) values (auth.uid(), p_course, fee) returning * into e;
  return e;
end $$;
grant execute on function public.academy_enrol(text) to authenticated;

/**
 * Starts a try at the next step (lesson n + 1, or the exam). Lessons unlock one a day; the first try at
 * each step is free and every retake costs the retake fee.
 */
create or replace function public.academy_start(p_course text, p_step int) returns public.academy_enrolments
language plpgsql security definer set search_path = public as $$
declare e academy_enrolments; s jsonb := academy_settings(); unlock timestamptz; fee bigint;
begin
  select * into e from academy_enrolments where user_id = auth.uid() and course_id = p_course for update;
  if e.user_id is null then raise exception 'not_enrolled'; end if;
  if e.graduated_at is not null then raise exception 'already_graduated'; end if;
  if p_step <> e.passed + 1 then raise exception 'wrong_step'; end if;
  unlock := e.last_passed_at + make_interval(hours => coalesce((s ->> 'unlock_hours')::int, 20));
  if e.passed > 0 and unlock > now() then raise exception 'locked_until:%', to_char(unlock at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'); end if;
  if e.attempts > 0 then
    fee := coalesce((s ->> 'retake_fee')::bigint, 500);
    if fee > 0 then perform coin_move(auth.uid(), -fee, 'spend', 'Academic City retake', 'academy:' || p_course || ':' || p_step); end if;
  end if;
  update academy_enrolments set attempts = attempts + 1 where user_id = auth.uid() and course_id = p_course returning * into e;
  return e;
end $$;
grant execute on function public.academy_start(text, int) to authenticated;

/** Hands in a quiz or the exam. Passing a lesson unlocks the next one tomorrow; passing the exam graduates. */
create or replace function public.academy_submit(p_course text, p_step int, p_correct int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e academy_enrolments; c academy_courses; s jsonb := academy_settings(); ok boolean; v_award bigint;
begin
  select * into e from academy_enrolments where user_id = auth.uid() and course_id = p_course for update;
  if e.user_id is null then raise exception 'not_enrolled'; end if;
  if e.graduated_at is not null then raise exception 'already_graduated'; end if;
  if p_step <> e.passed + 1 or e.attempts < 1 then raise exception 'wrong_step'; end if;
  if p_total < 1 or p_total > 30 or p_correct < 0 or p_correct > p_total then raise exception 'bad_score'; end if;
  select * into c from academy_courses where id = p_course;
  ok := p_correct * 100 >= coalesce((s ->> 'pass_pct')::int, 70) * p_total;
  if not ok then return jsonb_build_object('passed', false, 'enrolment', to_jsonb(e)); end if;
  if p_step <= c.lessons then
    update academy_enrolments set passed = p_step, attempts = 0, last_passed_at = now()
      where user_id = auth.uid() and course_id = p_course returning * into e;
  else
    v_award := e.fee_paid * coalesce((s ->> 'award_pct')::int, 25) / 100;
    if v_award > 0 then perform coin_move(auth.uid(), v_award, 'earn', 'Graduation award: ' || c.title, 'academy:' || c.id || ':graduated'); end if;
    update academy_enrolments set passed = p_step, attempts = 0, last_passed_at = now(), exam_score = round(p_correct * 100.0 / p_total), graduated_at = now(), award = v_award
      where user_id = auth.uid() and course_id = p_course returning * into e;
  end if;
  return jsonb_build_object('passed', true, 'enrolment', to_jsonb(e));
end $$;
grant execute on function public.academy_submit(text, int, int, int) to authenticated;

/** An institution's Dean's List: its graduates, best exam scores first. */
create or replace function public.academy_dean_list(p_institution text, p_limit int default 20)
returns table (user_id uuid, username text, name text, look jsonb, course_id text, course text, exam_score int, graduated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.user_id, p.username, p.display_name, p.citizen -> 'look', c.id, c.title, e.exam_score, e.graduated_at
  from academy_enrolments e join academy_courses c on c.id = e.course_id join profiles p on p.id = e.user_id
  where c.institution = p_institution and e.graduated_at is not null
  order by e.exam_score desc, e.graduated_at asc
  limit least(p_limit, 50);
$$;
grant execute on function public.academy_dean_list(text, int) to anon, authenticated;

/** Someone's certificates, for their profile. */
create or replace function public.academy_certificates(p_user uuid)
returns table (course_id text, course text, institution text, kind text, exam_score int, graduated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.institution, c.kind, e.exam_score, e.graduated_at
  from academy_enrolments e join academy_courses c on c.id = e.course_id
  where e.user_id = p_user and e.graduated_at is not null
  order by e.graduated_at desc;
$$;
grant execute on function public.academy_certificates(uuid) to anon, authenticated;
