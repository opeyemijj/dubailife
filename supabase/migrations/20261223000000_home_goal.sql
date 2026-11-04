-- "Move into your home" (goal step 'home') ticks for the home you chose when you signed up, not only for one you
-- rent or own on the map (user, 2026-11-04: "I already moved in but it hasn't ticked"). Same as before otherwise.
create or replace function public.goal_checks() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id)
  select public.goal_checks_base() || jsonb_build_object(
    'saved', (select balance from profiles where id = me.id) + coalesce((select amount from player_savings where user_id = me.id), 0) >= public.goal_save_target(me.id),
    'savings', coalesce((select amount from player_savings where user_id = me.id), 0),
    'home', public.has_home(me.id) or exists (select 1 from life_state where user_id = me.id and blueprint ->> 'housing' is not null)
  ) from me
$$;
grant execute on function public.goal_checks() to authenticated;
