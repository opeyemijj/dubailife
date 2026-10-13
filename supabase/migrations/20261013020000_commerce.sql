-- Commerce foundation: admins and audit, configurable settings, a D-Coin ledger, real-money
-- payments (gateway-agnostic), businesses claiming venues on a monthly subscription, owner-managed
-- venue content, and ad campaigns (billboards first).
--
-- Money rules:
--   * D-Coins (profiles.balance) are a closed-loop virtual currency. Every change is written to
--     coin_ledger. Purchased coins are a liability until spent; reports treat them that way.
--   * Real money only ever arrives through `payments`, priced on the server from app_settings and
--     fulfilled once (idempotent) when the payment is confirmed — by a gateway webhook, or for now
--     by an admin.

-- ---------------------------------------------------------------- admins and audit

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('super_admin', 'admin', 'finance', 'moderator')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = p_user);
$$;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.admin_role() returns text
language sql stable security definer set search_path = public as $$
  select role from admins where user_id = auth.uid();
$$;
grant execute on function public.admin_role() to authenticated;

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins for select using (public.is_admin());

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "admins read audit" on public.audit_log;
create policy "admins read audit" on public.audit_log for select using (public.is_admin());

create or replace function public.log_audit(p_action text, p_target text, p_details jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into audit_log (actor, action, target, details) values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'));
$$;
revoke all on function public.log_audit(text, text, jsonb) from public, anon, authenticated;

create or replace function public.require_admin(p_roles text[] default null) returns void
language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  select role into r from admins where user_id = auth.uid();
  if r is null then raise exception 'not_admin'; end if;
  if p_roles is not null and r <> 'super_admin' and not (r = any (p_roles)) then raise exception 'not_permitted'; end if;
end $$;
revoke all on function public.require_admin(text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------- settings (prices without deploys)

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.app_settings enable row level security;
drop policy if exists "settings are public" on public.app_settings;
create policy "settings are public" on public.app_settings for select using (true);

insert into public.app_settings (key, value) values
  ('venue_subscription', '{"price_aed": 1000, "interval": "month", "benefits": ["Verified owner badge and control of your venue", "Edit name, description, hours, contact and photos", "Manage menus, products, prices and offers", "Your promotion shown while the venue loads", "Reservation or enquiry link", "Basic visit analytics"], "terms": "Billed monthly in advance. Cancel any time; access continues to the end of the paid month. Advertising campaigns are sold separately."}'),
  ('coin_packages', '[{"id": "starter", "coins": 1000, "bonus": 0, "price_aed": 9.99}, {"id": "popular", "coins": 5000, "bonus": 500, "price_aed": 44.99, "tag": "Most popular"}, {"id": "big", "coins": 12000, "bonus": 2000, "price_aed": 99.99}, {"id": "whale", "coins": 30000, "bonus": 7500, "price_aed": 229.99, "tag": "Best value"}]'),
  ('billboard', '{"slots": 10, "price_aed_per_week": 250, "max_weeks": 12, "rotation_seconds": 6}'),
  ('features', '{"coin_purchases": true, "venue_claims": true, "billboard_ads": true, "gifts": false, "creator_payouts": false}'),
  ('limits', '{"max_credit_per_call": 5000, "max_daily_earn": 25000, "max_daily_send": 20000}')
on conflict (key) do nothing;

create or replace function public.setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$ select value from app_settings where key = p_key $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare old jsonb;
begin
  perform require_admin(array['finance']);
  select value into old from app_settings where key = p_key;
  insert into app_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  perform log_audit('setting.update', p_key, jsonb_build_object('before', old, 'after', p_value));
end $$;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;

-- ---------------------------------------------------------------- D-Coin ledger

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta bigint not null,
  balance_after bigint not null,
  -- purchase: bought with real money · earn: gameplay · spend: in-world purchases · transfer_in/out:
  -- between citizens · grant: starting balance and promotions · admin: manual adjustment · refund
  kind text not null check (kind in ('purchase', 'earn', 'spend', 'transfer_in', 'transfer_out', 'grant', 'admin', 'refund')),
  reason text,
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists coin_ledger_user_idx on public.coin_ledger (user_id, created_at desc);
create index if not exists coin_ledger_kind_idx on public.coin_ledger (kind, created_at);
alter table public.coin_ledger enable row level security;
drop policy if exists "own ledger" on public.coin_ledger;
create policy "own ledger" on public.coin_ledger for select using (user_id = auth.uid() or public.is_admin());

-- Every balance change now leaves a ledger line. Callers can label it via coin_move; older callers
-- (flat rent/purchase) are labelled spend/earn by sign.
create or replace function public.set_balance_internal(p_user uuid, p_delta bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_balance bigint; v_kind text; v_reason text; v_ref text;
begin
  perform set_config('app.balance_change', 'on', true);
  update profiles set balance = balance + p_delta where id = p_user returning balance into v_balance;
  perform set_config('app.balance_change', 'off', true);
  if v_balance is null then raise exception 'profile_missing'; end if;
  if v_balance < 0 then raise exception 'insufficient_funds'; end if;
  v_kind := coalesce(nullif(current_setting('app.coin_kind', true), ''), case when p_delta < 0 then 'spend' else 'earn' end);
  v_reason := nullif(current_setting('app.coin_reason', true), '');
  v_ref := nullif(current_setting('app.coin_ref', true), '');
  insert into coin_ledger (user_id, delta, balance_after, kind, reason, ref) values (p_user, p_delta, v_balance, v_kind, v_reason, v_ref);
  perform set_config('app.coin_kind', '', true);
  perform set_config('app.coin_reason', '', true);
  perform set_config('app.coin_ref', '', true);
  return v_balance;
end $$;
revoke all on function public.set_balance_internal(uuid, bigint) from public, anon, authenticated;

create or replace function public.coin_move(p_user uuid, p_delta bigint, p_kind text, p_reason text default null, p_ref text default null) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.coin_kind', p_kind, true);
  perform set_config('app.coin_reason', coalesce(p_reason, ''), true);
  perform set_config('app.coin_ref', coalesce(p_ref, ''), true);
  return set_balance_internal(p_user, p_delta);
end $$;
revoke all on function public.coin_move(uuid, bigint, text, text, text) from public, anon, authenticated;

-- Starting balances are recorded as grants.
create or replace function public.ledger_opening_balance() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.balance > 0 then
    insert into coin_ledger (user_id, delta, balance_after, kind, reason) values (new.id, new.balance, new.balance, 'grant', 'Starting balance');
  end if;
  return new;
end $$;
drop trigger if exists profiles_opening_balance on public.profiles;
create trigger profiles_opening_balance after insert on public.profiles for each row execute function public.ledger_opening_balance();

-- Gameplay spending and earning. Spending is unlimited (it can't create coins); earning is capped
-- per call and per day so a tampered client can't print money.
drop function if exists public.adjust_balance(bigint);
create or replace function public.adjust_balance(p_delta bigint, p_reason text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare lim jsonb := setting('limits'); earned bigint;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_delta = 0 then return (select balance from profiles where id = auth.uid()); end if;
  if p_delta < 0 then
    if -p_delta > 100000000 then raise exception 'amount_out_of_range'; end if;
    return coin_move(auth.uid(), p_delta, 'spend', left(p_reason, 120));
  end if;
  if p_delta > coalesce((lim ->> 'max_credit_per_call')::bigint, 5000) then raise exception 'credit_too_large'; end if;
  select coalesce(sum(delta), 0) into earned from coin_ledger
    where user_id = auth.uid() and kind = 'earn' and created_at > now() - interval '1 day';
  if earned + p_delta > coalesce((lim ->> 'max_daily_earn')::bigint, 25000) then raise exception 'daily_earn_limit'; end if;
  return coin_move(auth.uid(), p_delta, 'earn', left(p_reason, 120));
end $$;
grant execute on function public.adjust_balance(bigint, text) to authenticated;

-- Citizen-to-citizen D-Coins: labelled, and capped per day (closed-loop currency, not a wallet).
create or replace function public.send_money(p_to uuid, p_amount bigint, p_note text default null, p_place text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_balance bigint;
  sent bigint;
begin
  if v_from is null then raise exception 'not_signed_in'; end if;
  if p_to is null or p_to = v_from then raise exception 'invalid_recipient'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'amount_out_of_range'; end if;
  if (select count(*) from transfers where from_id = v_from and created_at > now() - interval '1 minute') >= 30 then raise exception 'too_many_transfers'; end if;
  select coalesce(sum(amount), 0) into sent from transfers where from_id = v_from and created_at > now() - interval '1 day';
  if sent + p_amount > coalesce((setting('limits') ->> 'max_daily_send')::bigint, 20000) then raise exception 'daily_send_limit'; end if;
  perform 1 from profiles where id in (v_from, p_to) order by id for update;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'recipient_missing'; end if;
  v_balance := coin_move(v_from, -p_amount, 'transfer_out', p_place, p_to::text);
  perform coin_move(p_to, p_amount, 'transfer_in', p_place, v_from::text);
  insert into transfers (from_id, to_id, amount, note, place) values (v_from, p_to, p_amount, nullif(trim(p_note), ''), p_place);
  return v_balance;
end $$;

create or replace function public.admin_adjust_coins(p_user uuid, p_delta bigint, p_reason text) returns bigint
language plpgsql security definer set search_path = public as $$
declare b bigint;
begin
  perform require_admin(array['finance']);
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  b := coin_move(p_user, p_delta, 'admin', p_reason);
  perform log_audit('coins.adjust', p_user::text, jsonb_build_object('delta', p_delta, 'reason', p_reason, 'balance_after', b));
  return b;
end $$;
grant execute on function public.admin_adjust_coins(uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------- businesses and venues

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  trade_license text check (char_length(trade_license) <= 60),
  contact_email text,
  contact_phone text,
  website text,
  created_at timestamptz not null default now()
);
create table if not exists public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

create or replace function public.is_business_member(p_business uuid, p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members where business_id = p_business and user_id = p_user);
$$;

drop policy if exists "members see business" on public.businesses;
create policy "members see business" on public.businesses for select using (public.is_business_member(id) or public.is_admin());
drop policy if exists "owner edits business" on public.businesses;
create policy "owner edits business" on public.businesses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "members see members" on public.business_members;
create policy "members see members" on public.business_members for select using (public.is_business_member(business_id) or public.is_admin());

create or replace function public.register_business(p_name text, p_license text, p_email text, p_phone text, p_website text) returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into businesses (owner_id, name, trade_license, contact_email, contact_phone, website)
    values (auth.uid(), trim(p_name), nullif(trim(p_license), ''), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_website), ''))
    returning id into b;
  insert into business_members (business_id, user_id, role) values (b, auth.uid(), 'owner');
  return b;
end $$;
grant execute on function public.register_business(text, text, text, text, text) to authenticated;

create table if not exists public.venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_key text not null,                 -- "placeId/venueId"
  business_id uuid not null references public.businesses (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'revoked')),
  applicant_role text,
  evidence text check (char_length(evidence) <= 2000),
  document_url text,
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- A venue has at most one verified owner.
create unique index if not exists venue_claims_one_verified on public.venue_claims (venue_key) where status = 'verified';
create index if not exists venue_claims_business on public.venue_claims (business_id);
alter table public.venue_claims enable row level security;
drop policy if exists "members see claims" on public.venue_claims;
create policy "members see claims" on public.venue_claims for select using (public.is_business_member(business_id) or public.is_admin());

create or replace function public.submit_claim(p_business uuid, p_venue text, p_role text, p_evidence text, p_document text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if not is_business_member(p_business) then raise exception 'not_member'; end if;
  if exists (select 1 from venue_claims where venue_key = p_venue and status = 'verified') then raise exception 'already_claimed'; end if;
  if exists (select 1 from venue_claims where venue_key = p_venue and business_id = p_business and status = 'pending') then raise exception 'claim_pending'; end if;
  insert into venue_claims (venue_key, business_id, applicant_role, evidence, document_url)
    values (p_venue, p_business, left(p_role, 80), left(p_evidence, 2000), nullif(p_document, '')) returning id into c;
  return c;
end $$;
grant execute on function public.submit_claim(uuid, text, text, text, text) to authenticated;

create or replace function public.admin_review_claim(p_claim uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare cl venue_claims;
begin
  perform require_admin(array['moderator']);
  select * into cl from venue_claims where id = p_claim for update;
  if cl.id is null then raise exception 'claim_missing'; end if;
  if p_approve and exists (select 1 from venue_claims where venue_key = cl.venue_key and status = 'verified' and id <> cl.id) then raise exception 'already_claimed'; end if;
  update venue_claims set status = case when p_approve then 'verified' else 'rejected' end, review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_claim;
  perform log_audit(case when p_approve then 'claim.verify' else 'claim.reject' end, cl.venue_key, jsonb_build_object('claim', p_claim, 'business', cl.business_id, 'note', p_note));
end $$;
grant execute on function public.admin_review_claim(uuid, boolean, text) to authenticated;

create table if not exists public.venue_subscriptions (
  id uuid primary key default gen_random_uuid(),
  venue_key text not null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'past_due', 'cancelled', 'expired')),
  price_aed numeric(12, 2) not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists venue_subscriptions_one on public.venue_subscriptions (venue_key, business_id);
alter table public.venue_subscriptions enable row level security;
drop policy if exists "members see subscriptions" on public.venue_subscriptions;
create policy "members see subscriptions" on public.venue_subscriptions for select using (public.is_business_member(business_id) or public.is_admin());

create or replace function public.cancel_subscription(p_sub uuid, p_cancel boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare s venue_subscriptions;
begin
  select * into s from venue_subscriptions where id = p_sub;
  if s.id is null or not is_business_member(s.business_id) then raise exception 'not_member'; end if;
  update venue_subscriptions set cancel_at_period_end = p_cancel where id = p_sub;
end $$;
grant execute on function public.cancel_subscription(uuid, boolean) to authenticated;

-- What a business owner publishes for their venue. Drafts stay private to the business.
create table if not exists public.venue_content (
  venue_key text primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  draft jsonb not null default '{}',
  published jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.venue_content enable row level security;
drop policy if exists "members see content" on public.venue_content;
create policy "members see content" on public.venue_content for select using (public.is_business_member(business_id) or public.is_admin());

-- Can this business manage this venue? Verified claim and a paid-up subscription.
create or replace function public.can_manage_venue(p_venue text, p_user uuid default auth.uid()) returns uuid
language sql stable security definer set search_path = public as $$
  select c.business_id from venue_claims c
  join venue_subscriptions s on s.venue_key = c.venue_key and s.business_id = c.business_id
  where c.venue_key = p_venue and c.status = 'verified' and s.status = 'active'
    and is_business_member(c.business_id, p_user)
  limit 1;
$$;

create or replace function public.save_venue_draft(p_venue text, p_draft jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare b uuid := can_manage_venue(p_venue);
begin
  if b is null then raise exception 'not_manager'; end if;
  if octet_length(p_draft::text) > 200000 then raise exception 'content_too_large'; end if;
  insert into venue_content (venue_key, business_id, draft, updated_at) values (p_venue, b, p_draft, now())
  on conflict (venue_key) do update set draft = excluded.draft, business_id = excluded.business_id, updated_at = now();
end $$;
grant execute on function public.save_venue_draft(text, jsonb) to authenticated;

create or replace function public.publish_venue_content(p_venue text) returns void
language plpgsql security definer set search_path = public as $$
declare b uuid := can_manage_venue(p_venue);
begin
  if b is null then raise exception 'not_manager'; end if;
  update venue_content set published = draft, published_at = now() where venue_key = p_venue;
end $$;
grant execute on function public.publish_venue_content(text) to authenticated;

-- What every visitor sees: is it claimed, and the owner's published content (if their plan is live).
create or replace function public.venue_public(p_venue text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'claimed', exists (select 1 from venue_claims where venue_key = p_venue and status = 'verified'),
    'content', (select vc.published from venue_content vc
                where vc.venue_key = p_venue
                  and exists (select 1 from venue_subscriptions s where s.venue_key = p_venue and s.business_id = vc.business_id and s.status = 'active'))
  );
$$;
grant execute on function public.venue_public(text) to anon, authenticated;

-- ---------------------------------------------------------------- real-money payments

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('coins', 'venue_subscription', 'ad_campaign')),
  ref text,
  description text not null,
  amount_aed numeric(12, 2) not null check (amount_aed > 0),
  meta jsonb not null default '{}',
  status text not null default 'requires_payment' check (status in ('requires_payment', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  provider text,
  provider_ref text unique,
  fee_aed numeric(12, 2),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  refunded_at timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select using (user_id = auth.uid() or public.is_admin());

-- Buying D-Coins: the price comes from the package list, never from the client.
create or replace function public.create_coin_payment(p_package text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pkg jsonb; p uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not coalesce((setting('features') ->> 'coin_purchases')::boolean, false) then raise exception 'feature_disabled'; end if;
  select x into pkg from jsonb_array_elements(setting('coin_packages')) x where x ->> 'id' = p_package;
  if pkg is null then raise exception 'unknown_package'; end if;
  insert into payments (user_id, purpose, ref, description, amount_aed, meta)
    values (auth.uid(), 'coins', p_package,
            format('%s D-Coins%s', (pkg ->> 'coins'), case when coalesce((pkg ->> 'bonus')::int, 0) > 0 then format(' + %s bonus', pkg ->> 'bonus') else '' end),
            (pkg ->> 'price_aed')::numeric, jsonb_build_object('coins', (pkg ->> 'coins')::bigint, 'bonus', coalesce((pkg ->> 'bonus')::bigint, 0)))
    returning id into p;
  return p;
end $$;
grant execute on function public.create_coin_payment(text) to authenticated;

-- Venue subscription: needs a claim (pending or verified) by a business you belong to.
create or replace function public.create_subscription_payment(p_business uuid, p_venue text) returns uuid
language plpgsql security definer set search_path = public as $$
declare price numeric := (setting('venue_subscription') ->> 'price_aed')::numeric; s uuid; p uuid;
begin
  if not is_business_member(p_business) then raise exception 'not_member'; end if;
  if not exists (select 1 from venue_claims where venue_key = p_venue and business_id = p_business and status in ('pending', 'verified')) then raise exception 'claim_required'; end if;
  insert into venue_subscriptions (venue_key, business_id, price_aed) values (p_venue, p_business, price)
    on conflict (venue_key, business_id) do update set price_aed = excluded.price_aed
    returning id into s;
  insert into payments (user_id, purpose, ref, description, amount_aed, meta)
    values (auth.uid(), 'venue_subscription', s::text, format('Venue subscription — %s (1 month)', p_venue), price, jsonb_build_object('venue', p_venue, 'business', p_business))
    returning id into p;
  return p;
end $$;
grant execute on function public.create_subscription_payment(uuid, text) to authenticated;

-- ---------------------------------------------------------------- advertising

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  placement text not null,                 -- "billboard:<map entity id>"
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  subtitle text check (char_length(subtitle) <= 80),
  link_url text check (char_length(link_url) <= 300),
  creative_url text not null,
  weeks int not null check (weeks between 1 and 52),
  price_aed numeric(12, 2) not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'pending_review', 'active', 'paused', 'rejected', 'ended', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists ad_campaigns_placement on public.ad_campaigns (placement, status);
alter table public.ad_campaigns enable row level security;
drop policy if exists "live ads are public" on public.ad_campaigns;
create policy "live ads are public" on public.ad_campaigns for select
  using ((status = 'active' and now() between starts_at and ends_at) or owner_id = auth.uid() or public.is_admin());

-- Slots taken on a placement: live, awaiting review, or paid-for and waiting.
create or replace function public.ad_slots_taken(p_placement text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from ad_campaigns
  where placement = p_placement
    and (status in ('pending_review', 'paused') or (status = 'active' and ends_at > now())
         or (status = 'pending_payment' and created_at > now() - interval '1 day'));
$$;
grant execute on function public.ad_slots_taken(text) to anon, authenticated;

create or replace function public.create_ad_campaign(p_placement text, p_title text, p_subtitle text, p_link text, p_creative text, p_weeks int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cfg jsonb := setting('billboard'); price numeric; c uuid; p uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not coalesce((setting('features') ->> 'billboard_ads')::boolean, false) then raise exception 'feature_disabled'; end if;
  if p_placement !~ '^billboard:[A-Za-z0-9_-]+$' then raise exception 'unknown_placement'; end if;
  if p_weeks < 1 or p_weeks > coalesce((cfg ->> 'max_weeks')::int, 12) then raise exception 'weeks_out_of_range'; end if;
  if p_creative !~ '^https://' then raise exception 'creative_required'; end if;
  if ad_slots_taken(p_placement) >= coalesce((cfg ->> 'slots')::int, 10) then raise exception 'placement_full'; end if;
  price := (cfg ->> 'price_aed_per_week')::numeric * p_weeks;
  insert into ad_campaigns (placement, owner_id, title, subtitle, link_url, creative_url, weeks, price_aed)
    values (p_placement, auth.uid(), trim(p_title), nullif(trim(p_subtitle), ''), nullif(trim(p_link), ''), p_creative, p_weeks, price)
    returning id into c;
  insert into payments (user_id, purpose, ref, description, amount_aed, meta)
    values (auth.uid(), 'ad_campaign', c::text, format('Billboard ad "%s" — %s week%s', trim(p_title), p_weeks, case when p_weeks = 1 then '' else 's' end), price, jsonb_build_object('placement', p_placement))
    returning id into p;
  return jsonb_build_object('campaign', c, 'payment', p);
end $$;
grant execute on function public.create_ad_campaign(text, text, text, text, text, int) to authenticated;

create or replace function public.track_ad(p_campaign uuid, p_click boolean default false) returns void
language sql security definer set search_path = public as $$
  update ad_campaigns set impressions = impressions + case when p_click then 0 else 1 end, clicks = clicks + case when p_click then 1 else 0 end
  where id = p_campaign and status = 'active';
$$;
grant execute on function public.track_ad(uuid, boolean) to anon, authenticated;

create or replace function public.admin_review_campaign(p_campaign uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c ad_campaigns;
begin
  perform require_admin(array['moderator']);
  select * into c from ad_campaigns where id = p_campaign for update;
  if c.id is null then raise exception 'campaign_missing'; end if;
  if p_status not in ('active', 'paused', 'rejected', 'ended') then raise exception 'bad_status'; end if;
  update ad_campaigns set
    status = p_status,
    review_note = coalesce(p_note, review_note),
    -- The paid weeks start when it first goes live.
    starts_at = case when p_status = 'active' and starts_at is null then now() else starts_at end,
    ends_at = case when p_status = 'active' and ends_at is null then now() + make_interval(weeks => weeks) else ends_at end
  where id = p_campaign;
  perform log_audit('campaign.' || p_status, p_campaign::text, jsonb_build_object('note', p_note));
end $$;
grant execute on function public.admin_review_campaign(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- fulfilment (once per payment)

create or replace function public.fulfill_payment(p_payment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare pay payments;
begin
  select * into pay from payments where id = p_payment for update;
  if pay.id is null then raise exception 'payment_missing'; end if;
  if pay.status <> 'paid' or pay.fulfilled_at is not null then return; end if;  -- idempotent
  if pay.purpose = 'coins' then
    perform coin_move(pay.user_id, (pay.meta ->> 'coins')::bigint + coalesce((pay.meta ->> 'bonus')::bigint, 0), 'purchase', pay.description, pay.id::text);
  elsif pay.purpose = 'venue_subscription' then
    update venue_subscriptions set status = 'active', cancel_at_period_end = false,
      current_period_end = greatest(coalesce(current_period_end, now()), now()) + interval '1 month'
    where id = pay.ref::uuid;
  elsif pay.purpose = 'ad_campaign' then
    update ad_campaigns set status = 'pending_review' where id = pay.ref::uuid and status = 'pending_payment';
  end if;
  update payments set fulfilled_at = now() where id = p_payment;
end $$;
revoke all on function public.fulfill_payment(uuid) from public, anon, authenticated;

-- Until a gateway is connected, finance admins confirm payments they've received by hand.
create or replace function public.admin_mark_paid(p_payment uuid, p_provider text, p_provider_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(array['finance']);
  update payments set status = 'paid', paid_at = now(), provider = p_provider, provider_ref = nullif(p_provider_ref, '')
    where id = p_payment and status in ('requires_payment', 'processing', 'failed');
  if not found then raise exception 'not_payable'; end if;
  perform fulfill_payment(p_payment);
  perform log_audit('payment.mark_paid', p_payment::text, jsonb_build_object('provider', p_provider, 'ref', p_provider_ref));
end $$;
grant execute on function public.admin_mark_paid(uuid, text, text) to authenticated;

create or replace function public.admin_refund(p_payment uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare pay payments; coins bigint; bal bigint;
begin
  perform require_admin(array['finance']);
  select * into pay from payments where id = p_payment for update;
  if pay.status <> 'paid' then raise exception 'not_refundable'; end if;
  if pay.purpose = 'coins' then
    coins := (pay.meta ->> 'coins')::bigint + coalesce((pay.meta ->> 'bonus')::bigint, 0);
    select balance into bal from profiles where id = pay.user_id;
    -- Take back what's left of the purchase (they may have spent some).
    perform coin_move(pay.user_id, -least(coins, coalesce(bal, 0)), 'refund', p_note, pay.id::text);
  elsif pay.purpose = 'venue_subscription' then
    update venue_subscriptions set status = 'cancelled' where id = pay.ref::uuid;
  elsif pay.purpose = 'ad_campaign' then
    update ad_campaigns set status = 'cancelled' where id = pay.ref::uuid;
  end if;
  update payments set status = 'refunded', refunded_at = now() where id = p_payment;
  perform log_audit('payment.refund', p_payment::text, jsonb_build_object('note', p_note, 'amount', pay.amount_aed));
end $$;
grant execute on function public.admin_refund(uuid, text) to authenticated;

-- ---------------------------------------------------------------- reporting

create or replace function public.admin_report() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform require_admin();
  select jsonb_build_object(
    'revenue_by_purpose', (select coalesce(jsonb_object_agg(purpose, total), '{}') from (select purpose, sum(amount_aed) total from payments where status = 'paid' group by purpose) x),
    'revenue_30d', (select coalesce(sum(amount_aed), 0) from payments where status = 'paid' and paid_at > now() - interval '30 days'),
    'refunds_total', (select coalesce(sum(amount_aed), 0) from payments where status = 'refunded'),
    'payments_pending', (select count(*) from payments where status in ('requires_payment', 'processing')),
    'mrr', (select coalesce(sum(price_aed), 0) from venue_subscriptions where status = 'active'),
    'active_subscriptions', (select count(*) from venue_subscriptions where status = 'active'),
    'claims_pending', (select count(*) from venue_claims where status = 'pending'),
    'venues_claimed', (select count(distinct venue_key) from venue_claims where status = 'verified'),
    'campaigns', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from ad_campaigns group by status) x),
    'ad_impressions', (select coalesce(sum(impressions), 0) from ad_campaigns),
    'ad_clicks', (select coalesce(sum(clicks), 0) from ad_campaigns),
    -- D-Coins: what's out there, and how much of it was bought (a liability until spent).
    'coins_outstanding', (select coalesce(sum(balance), 0) from profiles),
    'coins_purchased', (select coalesce(sum(delta), 0) from coin_ledger where kind = 'purchase'),
    'coins_earned_30d', (select coalesce(sum(delta), 0) from coin_ledger where kind = 'earn' and created_at > now() - interval '30 days'),
    'coins_spent_30d', (select coalesce(-sum(delta), 0) from coin_ledger where kind = 'spend' and created_at > now() - interval '30 days'),
    'citizens', (select count(*) from profiles),
    'businesses', (select count(*) from businesses)
  ) into r;
  return r;
end $$;
grant execute on function public.admin_report() to authenticated;

-- Admins can read everything they manage.
drop policy if exists "admins read transfers" on public.transfers;
create policy "admins read transfers" on public.transfers for select using (public.is_admin());
drop policy if exists "admins read requests" on public.entry_requests;
create policy "admins read requests" on public.entry_requests for select using (public.is_admin());

-- ---------------------------------------------------------------- uploads (ad creatives, venue media)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-creatives', 'ad-creatives', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
       ('venue-media', 'venue-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "upload own creatives" on storage.objects;
create policy "upload own creatives" on storage.objects for insert to authenticated
  with check (bucket_id in ('ad-creatives', 'venue-media') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "read creatives" on storage.objects;
create policy "read creatives" on storage.objects for select using (bucket_id in ('ad-creatives', 'venue-media'));

-- ---------------------------------------------------------------- housekeeping

create or replace function public.expire_commerce() returns void language plpgsql security definer set search_path = public as $$
begin
  update ad_campaigns set status = 'ended' where status = 'active' and ends_at < now();
  update ad_campaigns set status = 'cancelled' where status = 'pending_payment' and created_at < now() - interval '1 day';
  update venue_subscriptions set status = case when cancel_at_period_end then 'cancelled' else 'past_due' end
    where status = 'active' and current_period_end < now();
  update venue_subscriptions set status = 'expired' where status = 'past_due' and current_period_end < now() - interval '14 days';
end $$;
select cron.unschedule('expire-commerce') where exists (select 1 from cron.job where jobname = 'expire-commerce');
select cron.schedule('expire-commerce', '*/15 * * * *', 'select public.expire_commerce()');
