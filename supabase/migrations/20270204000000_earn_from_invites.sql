-- Inviting friends is how you get rich (src/data/life/earnings.json, mirrored exactly by earn_rule(); checked by
-- scripts/check-life-config.mjs). Money the game creates ('earn' / 'grant') pays `factor` of its amount unless its ref
-- starts with one of `fullPay`: invites and Big Missions, house parties, new-player rewards, and money that comes from
-- another player. Social rewards pay in full only for `socialFullPay` kinds. Transfers and refunds are never touched.

create or replace function public.earn_rule() returns jsonb
language sql immutable as $$
  select '{"factor":0.1,"fullPay":["referral:","social:","party-guest:","ticket-sale:","promoter:","app_bonus:","decor-paid:","treated:","lawyer-fee:","bet:","race:","car:"],"socialFullPay":["mission","invite_join","signup","party","follow_top"]}'::jsonb
$$;

/** What a payout of p_amount with this ref actually pays. */
create or replace function public.earn_scaled(p_amount bigint, p_ref text) returns bigint
language sql immutable as $$
  select case
    when p_amount is null or p_amount <= 0 then p_amount
    when exists (select 1 from jsonb_array_elements_text(earn_rule() -> 'fullPay') x where coalesce(p_ref, '') like x || '%') then p_amount
    else greatest(1, round(p_amount * (earn_rule() ->> 'factor')::numeric))::bigint
  end
$$;

create or replace function public.coin_move(p_user uuid, p_delta bigint, p_kind text, p_reason text default null, p_ref text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare d bigint := p_delta;
begin
  if p_kind in ('earn', 'grant') and p_delta > 0 then d := earn_scaled(p_delta, p_ref); end if;
  perform set_config('app.coin_kind', p_kind, true);
  perform set_config('app.coin_reason', coalesce(p_reason, ''), true);
  perform set_config('app.coin_ref', coalesce(p_ref, ''), true);
  return set_balance_internal(p_user, d);
end $$;
revoke all on function public.coin_move(uuid, bigint, text, text, text) from public, anon, authenticated;

-- Social rewards: the kinds about inviting and parties pay in full; the rest pay `factor`, and the reward recorded
-- (what the celebration shows) is what was actually paid.
create or replace function public.pay_social_reward(p_user uuid, p_kind text, p_ref text, p_amount bigint, p_why text)
returns boolean language plpgsql security definer set search_path = public as $$
declare amt bigint := case when earn_rule() -> 'socialFullPay' ? p_kind then p_amount else earn_scaled(p_amount, null) end;
begin
  if amt is null or amt <= 0 then return false; end if;
  insert into social_rewards (user_id, kind, ref, amount, why) values (p_user, p_kind, p_ref, amt, p_why)
    on conflict (user_id, kind, ref) do nothing;
  if not found then return false; end if;
  perform coin_move(p_user, amt, 'grant', 'Reward: ' || p_why, 'social:' || p_kind || ':' || p_ref);
  perform feed_post(p_user, 'reward', jsonb_build_object('amount', amt, 'why', p_why), null, 'reward:' || p_kind || ':' || p_ref || ':' || p_user);
  return true;
end $$;
revoke all on function public.pay_social_reward(uuid, text, text, bigint, text) from public, anon, authenticated;
