-- The monthly tournament (design spec section 13, Phase 6).
--
-- Score: the four pillars from score_events (learning, scam, wellbeing, career), each capped at 2,500 a
-- month, total 10,000. Only server-recorded actions score; purchases and balances never do. The month
-- runs on GST and freezes at 23:59:59 GST on its last day. Closed months are snapshotted once (lazily,
-- the first time anyone looks after the freeze) for the audit.
--
-- Prize: non-cash before the cash start month (setting tournament.cash_from = '2027-01'), then AED 5,000.
-- The provisional winner must be 21+, pass an ID check and hold one account; a finance admin verifies
-- and pays, or disqualifies and the next player in the audit order becomes the winner.

insert into public.app_settings (key, value) values ('tournament', jsonb_build_object(
  'cash_from', '2027-01', 'cash_aed', 5000,
  'noncash_prize', 'A Dubai experience for two (dinner and an attraction), arranged by the Come To Dubai team',
  'audit_top', 20, 'min_account_days', 14, 'transfer_flag_aed', 50000))
on conflict (key) do nothing;

/** Month key (YYYY-MM) in GST. */
create or replace function public.tournament_month(t timestamptz default now()) returns text
language sql immutable as $$ select to_char(t at time zone 'Asia/Dubai', 'YYYY-MM') $$;

/** The month's window: from 00:00:00 GST on the 1st to 23:59:59 GST on the last day. */
create or replace function public.tournament_window(p_month text) returns tstzrange
language sql immutable as $$
  select tstzrange((p_month || '-01 00:00:00')::timestamp at time zone 'Asia/Dubai',
                   ((p_month || '-01')::date + interval '1 month')::timestamp at time zone 'Asia/Dubai', '[)')
$$;

/** Live standings for a month: per-pillar points capped at 2,500. */
create or replace function public.tournament_scores(p_month text)
returns table (user_id uuid, learning int, scam int, wellbeing int, career int, total int)
language sql stable security definer set search_path = public as $$
  with p as (
    select e.user_id,
      least(2500, coalesce(sum(points) filter (where pillar = 'learning'), 0))::int learning,
      least(2500, coalesce(sum(points) filter (where pillar = 'scam'), 0))::int scam,
      least(2500, coalesce(sum(points) filter (where pillar = 'wellbeing'), 0))::int wellbeing,
      least(2500, coalesce(sum(points) filter (where pillar = 'career'), 0))::int career
    from score_events e where public.tournament_window(p_month) @> e.created_at group by e.user_id)
  select user_id, learning, scam, wellbeing, career, learning + scam + wellbeing + career from p
$$;
revoke all on function public.tournament_scores(text) from public, anon, authenticated;

create table if not exists public.tournament_results (
  month text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank int not null,
  learning int not null, scam int not null, wellbeing int not null, career int not null, total int not null,
  flags jsonb not null default '[]'::jsonb,
  primary key (month, user_id)
);
create table if not exists public.tournament_winners (
  month text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  prize text not null,                    -- 'cash' | 'noncash'
  amount_aed numeric(12, 2),
  status text not null default 'awaiting_details' check (status in ('awaiting_details', 'under_review', 'verified', 'paid', 'disqualified', 'no_winner')),
  full_name text, country text, payout_details text,   -- given by the winner
  id_document_ref text,                                  -- private storage path (claim-docs bucket)
  disqualified jsonb not null default '[]'::jsonb,       -- [{user_id, reason}]
  review_note text, reviewed_by uuid references auth.users (id) on delete set null, updated_at timestamptz not null default now()
);
alter table public.tournament_results enable row level security;
alter table public.tournament_winners enable row level security;
drop policy if exists "admins read results" on public.tournament_results;
create policy "admins read results" on public.tournament_results for select using (public.is_admin());
drop policy if exists "winner or admin reads" on public.tournament_winners;
create policy "winner or admin reads" on public.tournament_winners for select using (user_id = auth.uid() or public.is_admin());

/** Fair-play flags for a player in a month: new account, large money flows, admin, no date of birth. */
create or replace function public.tournament_flags(p_user uuid, p_month text) returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select coalesce(jsonb_agg(f), '[]'::jsonb) from (
    select 'new_account' f where (select created_at from profiles where id = p_user) > upper(public.tournament_window(p_month)) - make_interval(days => coalesce((setting('tournament') ->> 'min_account_days')::int, 14))
    union all select 'large_transfers' where coalesce((select sum(amount) from transfers where (from_id = p_user or to_id = p_user) and public.tournament_window(p_month) @> created_at), 0)
                                              >= coalesce((setting('tournament') ->> 'transfer_flag_aed')::bigint, 50000)
    union all select 'admin_account' where exists (select 1 from admins where user_id = p_user)
    union all select 'no_date_of_birth' where not exists (select 1 from auth.users where id = p_user and raw_user_meta_data ? 'date_of_birth')
    union all select 'muted_or_reported' where exists (select 1 from user_sanctions where user_id = p_user and (warnings > 0 or muted_until > lower(public.tournament_window(p_month))))
  ) x
$$;
revoke all on function public.tournament_flags(uuid, text) from public, anon, authenticated;

/** Snapshots a finished month (once) and names the provisional winner: the best-ranked unflagged player. */
create or replace function public.close_tournament(p_month text) returns void
language plpgsql security definer set search_path = public as $$
declare cfg jsonb := setting('tournament'); w uuid; cash boolean;
begin
  if upper(public.tournament_window(p_month)) > now() then return; end if;   -- not frozen yet
  perform pg_advisory_xact_lock(hashtext('tournament:' || p_month));
  if exists (select 1 from tournament_winners where month = p_month) then return; end if;
  insert into tournament_results (month, user_id, rank, learning, scam, wellbeing, career, total, flags)
  select p_month, s.user_id, rank() over (order by s.total desc, s.user_id), s.learning, s.scam, s.wellbeing, s.career, s.total,
         case when row_number() over (order by s.total desc, s.user_id) <= coalesce((cfg ->> 'audit_top')::int, 20)
              then public.tournament_flags(s.user_id, p_month) else '[]'::jsonb end
  from public.tournament_scores(p_month) s where s.total > 0
  on conflict do nothing;
  select user_id into w from tournament_results where month = p_month and flags = '[]'::jsonb order by rank, user_id limit 1;
  cash := p_month >= coalesce(cfg ->> 'cash_from', '9999-12');
  insert into tournament_winners (month, user_id, prize, amount_aed, status)
  values (p_month, w, case when cash then 'cash' else 'noncash' end, case when cash then (cfg ->> 'cash_aed')::numeric end,
          case when w is null then 'no_winner' else 'awaiting_details' end);
end $$;
revoke all on function public.close_tournament(text) from public, anon, authenticated;

/** The tournament as a player sees it: this month's top 50, my row, the prize, last month's winner. */
create or replace function public.tournament_view() returns jsonb
language plpgsql security definer set search_path = public as $$
declare m text := public.tournament_month(); last text := public.tournament_month(now() - interval '1 month'); cfg jsonb := setting('tournament'); cash boolean;
begin
  perform public.close_tournament(last);
  cash := m >= coalesce(cfg ->> 'cash_from', '9999-12');
  return jsonb_build_object(
    'month', m,
    'freezesAt', upper(public.tournament_window(m)) - interval '1 second',
    'prize', case when cash then jsonb_build_object('kind', 'cash', 'aed', (cfg ->> 'cash_aed')::numeric) else jsonb_build_object('kind', 'noncash', 'text', cfg ->> 'noncash_prize') end,
    'cashFrom', cfg ->> 'cash_from',
    'standings', coalesce((select jsonb_agg(jsonb_build_object('rank', r.rk, 'username', p.username, 'total', r.total, 'me', r.user_id = auth.uid()) order by r.rk)
      from (select s.*, rank() over (order by s.total desc) rk from public.tournament_scores(m) s where s.total > 0) r join profiles p on p.id = r.user_id where r.rk <= 50), '[]'::jsonb),
    'mine', (select jsonb_build_object('rank', r.rk, 'learning', r.learning, 'scam', r.scam, 'wellbeing', r.wellbeing, 'career', r.career, 'total', r.total)
      from (select s.*, rank() over (order by s.total desc) rk from public.tournament_scores(m) s where s.total > 0) r where r.user_id = auth.uid()),
    'lastWinner', (select jsonb_build_object('month', w.month, 'username', p.username, 'status', w.status, 'mine', w.user_id = auth.uid(), 'prize', w.prize, 'aed', w.amount_aed)
      from tournament_winners w left join profiles p on p.id = w.user_id where w.month = last)
  );
end $$;
grant execute on function public.tournament_view() to authenticated;

/** The winner sends their details for verification (name as on ID, country, payout details, ID upload path). */
create or replace function public.submit_prize_details(p_month text, p_full_name text, p_country text, p_payout text, p_id_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update tournament_winners set full_name = left(trim(p_full_name), 120), country = left(trim(p_country), 60),
    payout_details = left(trim(p_payout), 300), id_document_ref = p_id_ref, status = 'under_review', updated_at = now()
  where month = p_month and user_id = auth.uid() and status in ('awaiting_details', 'under_review');
  if not found then raise exception 'not_winner'; end if;
end $$;
grant execute on function public.submit_prize_details(text, text, text, text, text) to authenticated;

/** Finance admins: verify, mark paid, or disqualify (the next unflagged player in rank order becomes the winner). */
create or replace function public.admin_tournament_decide(p_month text, p_action text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare w tournament_winners; nxt uuid;
begin
  perform require_admin(array['finance']);
  select * into w from tournament_winners where month = p_month for update;
  if w.month is null then raise exception 'no_month'; end if;
  if p_action = 'verify' then
    update tournament_winners set status = 'verified', review_note = p_note, reviewed_by = auth.uid(), updated_at = now() where month = p_month;
  elsif p_action = 'paid' then
    if w.status <> 'verified' then raise exception 'verify_first'; end if;
    update tournament_winners set status = 'paid', review_note = coalesce(p_note, review_note), reviewed_by = auth.uid(), updated_at = now() where month = p_month;
  elsif p_action = 'disqualify' then
    select r.user_id into nxt from tournament_results r
      where r.month = p_month and r.flags = '[]'::jsonb and r.user_id <> w.user_id
        and not exists (select 1 from jsonb_array_elements(w.disqualified) d where (d ->> 'user_id')::uuid = r.user_id)
        and r.rank > coalesce((select rank from tournament_results where month = p_month and user_id = w.user_id), 0)
      order by r.rank limit 1;
    update tournament_winners set disqualified = disqualified || jsonb_build_array(jsonb_build_object('user_id', w.user_id, 'reason', p_note)),
      user_id = nxt, status = case when nxt is null then 'no_winner' else 'awaiting_details' end,
      full_name = null, country = null, payout_details = null, id_document_ref = null, review_note = p_note, reviewed_by = auth.uid(), updated_at = now()
    where month = p_month;
  else raise exception 'invalid_action'; end if;
  perform log_audit('tournament.' || p_action, p_month, jsonb_build_object('winner', w.user_id, 'note', p_note));
end $$;
grant execute on function public.admin_tournament_decide(text, text, text) to authenticated;

/** Admin view of a month: snapshot (or live standings if open), flags, winner, and the self-grading warning. */
create or replace function public.admin_tournament(p_month text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(array['finance', 'moderator']);
  perform public.close_tournament(p_month);
  return jsonb_build_object(
    'month', p_month, 'closed', upper(public.tournament_window(p_month)) <= now(),
    'selfGrading', coalesce((setting('academy') ->> 'self_grading')::boolean, false),
    'settings', setting('tournament'),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', r.rank, 'userId', r.user_id, 'username', p.username, 'learning', r.learning, 'scam', r.scam,
        'wellbeing', r.wellbeing, 'career', r.career, 'total', r.total, 'flags', r.flags) order by r.rank)
      from tournament_results r join profiles p on p.id = r.user_id where r.month = p_month and r.rank <= 50),
      (select jsonb_agg(jsonb_build_object('rank', x.rk, 'userId', x.user_id, 'username', p.username, 'learning', x.learning, 'scam', x.scam,
        'wellbeing', x.wellbeing, 'career', x.career, 'total', x.total, 'flags', public.tournament_flags(x.user_id, p_month)) order by x.rk)
       from (select s.*, rank() over (order by s.total desc) rk from public.tournament_scores(p_month) s where s.total > 0) x join profiles p on p.id = x.user_id where x.rk <= 50),
      '[]'::jsonb),
    'winner', (select to_jsonb(w) || jsonb_build_object('username', p.username) from tournament_winners w left join profiles p on p.id = w.user_id where w.month = p_month)
  );
end $$;
grant execute on function public.admin_tournament(text) to authenticated;

-- ---------------------------------------------------------------- multiplayer wins must be confirmed

-- A win scores only once the opponent's loss in the same room is recorded too, so one account can't
-- report wins alone.
create or replace function public.points_from_games() returns trigger
language plpgsql security definer set search_path = public as $$
declare winner game_results;
begin
  if new.mode <> 'multiplayer' or new.room_id is null then return new; end if;
  if new.outcome = 'win' and exists (select 1 from game_results where room_id = new.room_id and user_id <> new.user_id and outcome = 'loss') then
    perform public.add_points(new.user_id, 'career', 30, 'win:' || new.id);
  elsif new.outcome = 'loss' then
    for winner in select * from game_results where room_id = new.room_id and user_id <> new.user_id and outcome = 'win' loop
      perform public.add_points(winner.user_id, 'career', 30, 'win:' || winner.id);
    end loop;
  end if;
  return new;
end $$;
