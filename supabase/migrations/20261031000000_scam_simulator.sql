-- The anti-scam phone simulator (design spec section 7, Phase 2). Scripts, choices and debriefs live in
-- src/data/scams/scams.json; the database stores one row per scam actually delivered, and mirrors only
-- the money rules (scam_rule) so losses and bounties are decided on the server.
--
-- Fair schedule: every player gets the same scam on the same day (Mon, Tue, Thu, Fri), from 15:00 GST,
-- at most one a day, none in a player's first 3 days. Delivery is lazy (when the app is open), so idle
-- players cost nothing. Losses are capped at 10% of the balance and AED 5,000.

create table if not exists public.scam_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  template text not null,
  day int not null,                                   -- life_day() it was sent on
  sent_at timestamptz not null default now(),
  outcome text check (outcome in ('reported', 'avoided', 'fell')),
  loss bigint not null default 0,
  bounty bigint not null default 0,
  resolved_at timestamptz,
  unique (user_id, day)
);
alter table public.scam_events enable row level security;
drop policy if exists "see own scams" on public.scam_events;
create policy "see own scams" on public.scam_events for select using (user_id = auth.uid());

alter table public.life_state add column if not exists transfers_frozen_until timestamptz;
alter table public.life_state add column if not exists phone_hacked_until timestamptz;

/** Money rules per scam (mirror of src/data/scams/scams.json). */
create or replace function public.scam_rule(p_template text) returns jsonb
language sql immutable as $$
  select case p_template
    when 'police_otp'  then '{"pct": 10, "fixed": null, "bounty": 1000, "freezeHours": 1}'::jsonb
    when 'toll_sms'    then '{"pct": null, "fixed": 1800, "bounty": 500}'::jsonb
    when 'parcel_sms'  then '{"pct": null, "fixed": 2500, "bounty": 500}'::jsonb
    when 'chat_code'   then '{"pct": null, "fixed": 0, "bounty": 750, "hackHours": 2}'::jsonb
    when 'review_task' then '{"pct": null, "fixed": 2000, "bounty": 500}'::jsonb
  end
$$;

/** Today's scam for everyone (null on scam-free days). Same order as the JSON. */
create or replace function public.scam_for_day(d int) returns text
language sql immutable as $$
  select case when ((d + 4) % 7) in (1, 2, 4, 5)
    then (array['police_otp', 'toll_sms', 'parcel_sms', 'chat_code', 'review_task'])[(d % 5) + 1] end
$$;

/** Delivers today's scam if one is due (from 15:00 GST). Returns the open scam, or null. */
create or replace function public.scam_due() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d int := public.life_day(now()); t text; e scam_events;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  -- Anything left open from an earlier day counts as avoided.
  update scam_events set outcome = 'avoided', resolved_at = now() where user_id = uid and outcome is null and day < d;
  if not exists (select 1 from life_state where user_id = uid and created_at < now() - interval '3 days') then return null; end if;
  t := public.scam_for_day(d);
  if t is null then return null; end if;
  -- The GST day starts at 09:00; scams arrive from 15:00.
  if (extract(epoch from now())::bigint - 5 * 3600) % 86400 < 6 * 3600 then return null; end if;
  insert into scam_events (user_id, template, day) values (uid, t, d) on conflict (user_id, day) do nothing;
  select * into e from scam_events where user_id = uid and day = d;
  if e.outcome is not null then return null; end if;
  return jsonb_build_object('id', e.id, 'template', e.template, 'sentAt', e.sent_at);
end $$;

/** The player's choice: 'comply' (falls for it), 'report' (bounty) or 'ignore' (avoided). */
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
    if v_loss > 0 then perform coin_move(uid, -v_loss, 'spend', 'Scam simulation: ' || e.template, 'scam:' || e.id); end if;
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
  else
    raise exception 'invalid_action';
  end if;
  update scam_events set outcome = v_outcome, loss = v_loss, bounty = v_bounty, resolved_at = now() where id = e.id;
  return jsonb_build_object('outcome', v_outcome, 'loss', v_loss, 'bounty', v_bounty, 'template', e.template);
end $$;

revoke all on function public.scam_due(), public.scam_resolve(bigint, text) from public;
grant execute on function public.scam_due(), public.scam_resolve(bigint, text) to authenticated;

-- Effects of falling for a scam: a "hacked" phone can't send chat; frozen accounts can't send money.
create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if tg_table_name = 'messages' then who := new.from_id; else who := new.user_id; end if;
  if public.is_muted(who) then raise exception 'muted'; end if;
  if exists (select 1 from life_state where user_id = who and phone_hacked_until > now()) then raise exception 'phone_hacked'; end if;
  new.body := public.mask_contacts(new.body);
  return new;
end $$;

create or replace function public.refuse_if_frozen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from life_state where user_id = new.from_id and transfers_frozen_until > now()) then raise exception 'transfers_frozen'; end if;
  return new;
end $$;
drop trigger if exists refuse_frozen on public.transfers;
create trigger refuse_frozen before insert on public.transfers for each row execute function public.refuse_if_frozen();
