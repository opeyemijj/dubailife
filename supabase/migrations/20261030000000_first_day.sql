-- "Your first day in Dubai" (design spec section 19.4): a short checklist for new players, paid once when
-- the four core steps are done. Steps and copy live in src/data/life/first-day.json; the server only checks
-- the facts it already has and records the one-time payment in app_bonuses.

update public.app_settings set value = value || '{"first_day": 10000}'::jsonb where key = 'app_bonus' and not (value ? 'first_day');

alter table public.app_bonuses drop constraint if exists app_bonuses_kind_check;
alter table public.app_bonuses add constraint app_bonuses_kind_check check (kind in ('install', 'push', 'first_day'));

/** Which first-day steps are done, plus whether the reward was claimed. */
create or replace function public.first_day_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'blueprint', exists (select 1 from life_state where user_id = auth.uid() and blueprint is not null),
    'shift', exists (select 1 from profiles where id = auth.uid() and citizen -> 'job' ->> 'lastShiftAt' is not null),
    'lesson', exists (select 1 from academy_enrolments where user_id = auth.uid() and passed > 0),
    'friend', exists (select 1 from friendships where auth.uid() in (user_id, friend_id)),
    'push', exists (select 1 from push_subscriptions where user_id = auth.uid()),
    'claimed', exists (select 1 from app_bonuses where user_id = auth.uid() and kind = 'first_day'),
    'reward', coalesce((setting('app_bonus') ->> 'first_day')::bigint, 0)
  )
$$;
grant execute on function public.first_day_status() to authenticated;

/** Pays the first-day reward once the Blueprint, a shift, a lesson and a friend are done. Returns AED paid. */
create or replace function public.claim_first_day() returns bigint
language plpgsql security definer set search_path = public as $$
declare s jsonb := public.first_day_status(); amt bigint; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (s ->> 'claimed')::boolean then return 0; end if;
  if not ((s ->> 'blueprint')::boolean and (s ->> 'shift')::boolean and (s ->> 'lesson')::boolean and (s ->> 'friend')::boolean) then
    raise exception 'not_done';
  end if;
  amt := (s ->> 'reward')::bigint;
  if amt <= 0 then return 0; end if;
  insert into app_bonuses (user_id, kind, amount) values (me, 'first_day', amt) on conflict do nothing;
  if not found then return 0; end if;
  perform coin_move(me, amt, 'grant', 'Bonus: first day in Dubai', 'app_bonus:first_day');
  return amt;
end $$;
grant execute on function public.claim_first_day() to authenticated;
