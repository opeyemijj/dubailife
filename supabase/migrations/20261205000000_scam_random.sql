-- Scams arrive at random: each player's day is rolled on its own (whether one comes, which one, and when, between
-- 10:00 and midnight GST) instead of everyone getting the same scam at 15:00. Still at most one a day, and none in
-- a player's first 3 days. Rejecting a scam now pays a reward, smaller than reporting it. The wallet entry no longer
-- says "simulation". Numbers mirror src/data/scams/scams.json (scripts/check-life-config.mjs).

/** A steady roll of 0 to 999 for this player, day and purpose. */
create or replace function public.scam_roll(p_user uuid, p_day int, p_for text) returns int
language sql immutable as $$
  select (('x' || substr(md5(p_user::text || ':' || p_day || ':' || p_for), 1, 7))::bit(28)::int) % 1000
$$;
revoke all on function public.scam_roll(uuid, int, text) from public;

create or replace function public.scam_due() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d int := public.life_day(now()); t text; e scam_events; since_start bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  -- Anything left open from an earlier day counts as avoided.
  update scam_events set outcome = 'avoided', resolved_at = now() where user_id = uid and outcome is null and day < d;
  if not exists (select 1 from life_state where user_id = uid and created_at < now() - interval '3 days') then return null; end if;
  select * into e from scam_events where user_id = uid and day = d;
  if e.id is null then
    if public.scam_roll(uid, d, 'chance') / 10 >= 60 then return null; end if;
    -- The GST day starts at 09:00: this player's scam comes at its own moment after that (roll * 36 / 10 is seconds in an hour).
    since_start := (extract(epoch from now())::bigint - 5 * 3600) % 86400;
    if since_start < 1 * 3600 + public.scam_roll(uid, d, 'when') * 14 * 36 / 10 then return null; end if;
    t := (array['police_otp', 'toll_sms', 'parcel_sms', 'chat_code', 'review_task'])[public.scam_roll(uid, d, 'which') % 5 + 1];
    insert into scam_events (user_id, template, day) values (uid, t, d) on conflict (user_id, day) do nothing;
    select * into e from scam_events where user_id = uid and day = d;
  end if;
  if e.outcome is not null then return null; end if;
  return jsonb_build_object('id', e.id, 'template', e.template, 'sentAt', e.sent_at);
end $$;

create or replace function public.scam_resolve(p_event bigint, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e scam_events; r jsonb; bal bigint; v_loss bigint := 0; v_bounty bigint := 0; v_outcome text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into e from scam_events where id = p_event and user_id = uid for update;
  if e.id is null then raise exception 'scam_missing'; end if;
  if e.outcome is not null then raise exception 'already_resolved'; end if;
  r := public.scam_rule(e.template);
  if p_action = 'comply' then
    v_outcome := 'fell';
    select balance into bal from profiles where id = uid;
    v_loss := coalesce((r ->> 'fixed')::bigint, bal * coalesce((r ->> 'pct')::int, 10) / 100);
    v_loss := greatest(0, least(v_loss, bal / 10, 5000));
    if v_loss > 0 then perform coin_move(uid, -v_loss, 'spend', 'Scammed: ' || e.template, 'scam:' || e.id); end if;
    if r ? 'freezeHours' then
      update life_state set transfers_frozen_until = now() + make_interval(hours => (r ->> 'freezeHours')::int) where user_id = uid;
    end if;
    if r ? 'hackHours' then
      update life_state set phone_hacked_until = now() + make_interval(hours => (r ->> 'hackHours')::int) where user_id = uid;
    end if;
  elsif p_action = 'report' then
    v_outcome := 'reported';
    v_bounty := (r ->> 'bounty')::bigint;
    perform coin_move(uid, v_bounty, 'earn', 'e-Crime bounty: scam reported', 'scam:' || e.id);
  elsif p_action = 'ignore' then
    v_outcome := 'avoided';
    v_bounty := 200;
    perform coin_move(uid, v_bounty, 'earn', 'Reward: scam rejected', 'scam:' || e.id);
  else
    raise exception 'invalid_action';
  end if;
  update scam_events set outcome = v_outcome, loss = v_loss, bounty = v_bounty, resolved_at = now() where id = e.id;
  return jsonb_build_object('outcome', v_outcome, 'loss', v_loss, 'bounty', v_bounty, 'template', e.template);
end $$;
