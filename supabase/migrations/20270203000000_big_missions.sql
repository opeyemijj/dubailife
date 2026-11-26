-- Big Missions: three one-off rewards for bringing friends in from outside the game (src/data/social/missions.json,
-- mirrored exactly by mission_config(); checked by scripts/check-life-config.mjs). Paid through pay_social_reward
-- (ledger grant, City Feed post, the celebration next time you're in), settled with the social rewards every 5 minutes.

create or replace function public.mission_config() returns jsonb
language sql immutable as $$
  select '{"joinMinutes":10,"missions":[{"id":"invite5","target":5,"aed":10000000},{"id":"party10","target":10,"aed":20000000},{"id":"chain3","target":3,"aed":30000000}]}'::jsonb
$$;

alter table public.social_rewards drop constraint if exists social_rewards_kind_check;
alter table public.social_rewards add constraint social_rewards_kind_check
  check (kind in ('party', 'space', 'invite_join', 'signup', 'game_win', 'attend', 'follow_top', 'mission'));

/** Friends who joined through p_user's link: signed up with it, verified their email and played joinMinutes. */
create or replace function public.joined_friends(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select f.invitee_id from referrals f join profiles p on p.id = f.invitee_id
   where f.inviter_id = p_user and public.email_verified(f.invitee_id)
     and coalesce(p.last_seen, p.created_at) - p.created_at >= make_interval(mins => (mission_config() ->> 'joinMinutes')::int)
$$;
revoke all on function public.joined_friends(uuid) from public, anon, authenticated;

/** Progress on each mission: invite5 (friends joined), party10 (the most of them at one party I hosted), chain3
    (joined friends who've brought in a friend who joined). */
create or replace function public.mission_progress(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with mine as (select * from joined_friends(p_user) as j(id))
  select jsonb_build_object(
    'invite5', (select count(*) from mine),
    'party10', coalesce((select max(n) from (
        select count(distinct g.user_id) as n from invites i join invite_guests g on g.invite_id = i.id
         where i.host_id = p_user and i.kind in ('house_party', 'pool_party') and not coalesce(i.cancelled, false)
           and g.user_id in (select id from mine) and g.arrived_at is not null
           and g.arrived_at + make_interval(mins => (social_rewards_config() -> 'eligibility' ->> 'stayMinutes')::int)
               <= least(coalesce(i.ends_at, i.starts_at + interval '3 hours'), now())
         group by i.id) x), 0),
    'chain3', (select count(*) from mine m where exists (select 1 from joined_friends(m.id)))
  )
$$;
revoke all on function public.mission_progress(uuid) from public, anon, authenticated;

/** Pays each mission reached, once. */
create or replace function public.settle_big_missions() returns int
language plpgsql security definer set search_path = public as $$
declare u uuid; prog jsonb; m jsonb; paid int := 0;
begin
  if not social_rewards_on() then return 0; end if;
  for u in select distinct inviter_id from referrals loop
    if not reward_eligible(u) then continue; end if;
    prog := mission_progress(u);
    for m in select * from jsonb_array_elements(mission_config() -> 'missions') loop
      if (prog ->> (m ->> 'id'))::int >= (m ->> 'target')::int
         and pay_social_reward(u, 'mission', m ->> 'id', (m ->> 'aed')::bigint,
               case m ->> 'id' when 'invite5' then 'Big Mission: 5 friends joined with your invite'
                              when 'party10' then 'Big Mission: a house party with 10 friends you invited'
                              else 'Big Mission: 3 friends each brought in a friend' end)
      then paid := paid + 1; end if;
    end loop;
  end loop;
  return paid;
end $$;
revoke all on function public.settle_big_missions() from public, anon, authenticated;

/** My missions: progress, what's been paid, and whether my account can be paid yet. */
create or replace function public.my_missions() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'progress', mission_progress(auth.uid()),
    'paid', coalesce((select jsonb_agg(ref) from social_rewards where user_id = auth.uid() and kind = 'mission'), '[]'::jsonb),
    'eligible', reward_eligible(auth.uid()),
    'verified', email_verified(auth.uid()))
  where auth.uid() is not null
$$;
revoke all on function public.my_missions() from public, anon;
grant execute on function public.my_missions() to authenticated;

do $$ begin
  perform cron.unschedule('big-missions');
exception when others then null;
end $$;
select cron.schedule('big-missions', '*/5 * * * *', $$ select public.settle_big_missions(); $$);
