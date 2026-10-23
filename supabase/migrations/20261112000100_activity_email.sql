-- Discover: "Verify your email" ticks off on its own.
create or replace function public.my_activity_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'course', exists (select 1 from academy_enrolments where user_id = auth.uid())
           or exists (select 1 from profiles where id = auth.uid() and jsonb_typeof(citizen -> 'academic' -> 'enrolled') = 'object'
                      and citizen -> 'academic' -> 'enrolled' <> '{}'::jsonb),
    'studentVisa', exists (select 1 from life_state where user_id = auth.uid() and visa_tier <> 'VISIT'),
    'game', exists (select 1 from game_results where user_id = auth.uid()),
    'job', exists (select 1 from venture_staff where user_id = auth.uid())
        or exists (select 1 from profiles where id = auth.uid() and citizen ? 'job' and citizen -> 'job' <> 'null'::jsonb),
    'workVisa', exists (select 1 from life_state where user_id = auth.uid() and visa_tier in ('EMPLOYMENT', 'FREELANCE', 'GOLDEN')),
    'driving', exists (select 1 from driving_progress where user_id = auth.uid() and eye_passed_at is not null),
    'licence', public.has_licence(auth.uid()),
    'friend', exists (select 1 from friendships where auth.uid() in (user_id, friend_id)),
    'invite', exists (select 1 from referrals where inviter_id = auth.uid()),
    'scam', exists (select 1 from scam_events where user_id = auth.uid() and outcome is not null),
    'venture', exists (select 1 from venture_members where user_id = auth.uid() and role in ('owner', 'partner')),
    'home', public.has_home(auth.uid()),
    'points', exists (select 1 from score_events where user_id = auth.uid()),
    'season', exists (select 1 from season_claims where user_id = auth.uid()),
    'blueprint', exists (select 1 from life_state where user_id = auth.uid() and blueprint is not null),
    'emailVerified', public.email_verified(auth.uid())
  )
$$;
grant execute on function public.my_activity_status() to authenticated;
