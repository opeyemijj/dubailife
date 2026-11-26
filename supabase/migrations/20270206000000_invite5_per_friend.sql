-- "Invite 5 friends, get AED 10M" is paid per friend: each friend who joins with your link and plays 10 minutes
-- pays you AED 2M as they join (the 'signup' social reward, settle_social_rewards every 5 minutes), so five friends
-- make the 10M. Big Missions no longer pays a separate 10M lump for invite5; its progress is the friends paid for.

/** Pays each mission reached, once (invite5 is paid per friend by the signup rewards). */
create or replace function public.settle_big_missions() returns int
language plpgsql security definer set search_path = public as $$
declare u uuid; prog jsonb; m jsonb; paid int := 0;
begin
  if not social_rewards_on() then return 0; end if;
  for u in select distinct inviter_id from referrals loop
    if not reward_eligible(u) then continue; end if;
    prog := mission_progress(u);
    for m in select * from jsonb_array_elements(mission_config() -> 'missions') loop
      if m ->> 'id' = 'invite5' then continue; end if;
      if (prog ->> (m ->> 'id'))::int >= (m ->> 'target')::int
         and pay_social_reward(u, 'mission', m ->> 'id', (m ->> 'aed')::bigint,
               case m ->> 'id' when 'party10' then 'Big Mission: a house party with 10 friends you invited'
                              else 'Big Mission: 3 friends each brought in a friend' end)
      then paid := paid + 1; end if;
    end loop;
  end loop;
  return paid;
end $$;
revoke all on function public.settle_big_missions() from public, anon, authenticated;

/** My Big Missions: progress, what's been paid, whether my account can be paid yet, and what my invites have
    earned so far (invite5: friends paid for, and the AED they brought in). */
create or replace function public.my_big_missions() returns jsonb
language sql stable security definer set search_path = public as $$
  with inv as (
    select count(*)::int as n, coalesce(sum(amount), 0)::bigint as aed
      from social_rewards where user_id = auth.uid() and kind = 'signup'
  )
  select jsonb_build_object(
    'progress', mission_progress(auth.uid()) || jsonb_build_object('invite5', (select n from inv)),
    'paid', coalesce((select jsonb_agg(ref) from social_rewards where user_id = auth.uid() and kind = 'mission'), '[]'::jsonb)
            || case when (select n from inv) >= 5 then '["invite5"]'::jsonb else '[]'::jsonb end,
    'inviteEarned', (select aed from inv),
    'eligible', reward_eligible(auth.uid()),
    'verified', email_verified(auth.uid()))
  where auth.uid() is not null
$$;
revoke all on function public.my_big_missions() from public, anon;
grant execute on function public.my_big_missions() to authenticated;
