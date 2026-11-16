-- Betting on Autodrome races (up to 10 cars): a pool shared by everyone who bets on a race. Anyone can bet on any
-- driver until the race starts; drivers can only back themselves (so nobody throws a race for a bet). When the
-- winner crosses the line, the pot (less a 5% Autodrome fee, which leaves the economy) is shared between everyone who
-- backed the winner, in proportion to their stakes. Nobody backed the winner, or the race never finished: every stake
-- comes back. Rules: src/data/autodrome/betting.json, mirrored in race_bet_rules() (checked by
-- scripts/check-life-config.mjs).

create or replace function public.race_bet_rules() returns jsonb
language sql immutable as $$
  select '{"minBet":10000,"maxBet":50000000,"feePct":5,"maxRacers":10,"bigWinFeed":1000000}'::jsonb
$$;

-- Up to 10 cars a race.
update public.races set max_racers = 10 where max_racers > 10;
alter table public.races drop constraint if exists races_max_racers_check;
alter table public.races add constraint races_max_racers_check check (max_racers between 2 and 10);
alter table public.races alter column max_racers set default 10;

create table if not exists public.race_bets (
  race_id bigint not null references public.races (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  racer_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  -- What came back: winnings, or the stake refunded. Null until settled.
  paid bigint,
  primary key (race_id, user_id)
);
create index if not exists race_bets_racer on public.race_bets (race_id, racer_id);
alter table public.race_bets enable row level security;
drop policy if exists "see own bets" on public.race_bets;
create policy "see own bets" on public.race_bets for select using (user_id = auth.uid());

alter table public.races add column if not exists bets_settled boolean not null default false;

/** Back a driver (or add to my bet on them) before the race starts. Returns my total stake on them. */
create or replace function public.place_bet(p_code text, p_racer uuid, p_amount bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; cfg jsonb := race_bet_rules(); mine race_bets; who text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from races where code = upper(p_code) for update;
  if r.id is null then raise exception 'no_race'; end if;
  if r.status <> 'lobby' then raise exception 'bets_closed'; end if;
  if not exists (select 1 from race_entries where race_id = r.id and user_id = p_racer) then raise exception 'not_a_racer'; end if;
  -- Drivers can only back themselves.
  if exists (select 1 from race_entries where race_id = r.id and user_id = me) and p_racer <> me then raise exception 'drivers_back_themselves'; end if;
  select * into mine from race_bets where race_id = r.id and user_id = me for update;
  if mine.user_id is not null and mine.racer_id <> p_racer then raise exception 'one_driver'; end if;
  if p_amount < (cfg ->> 'minBet')::bigint or coalesce(mine.amount, 0) + p_amount > (cfg ->> 'maxBet')::bigint then raise exception 'bad_amount'; end if;
  select username into who from profiles where id = p_racer;
  perform coin_move(me, -p_amount, 'spend', 'Bet on @' || coalesce(who, 'a driver') || ' at Dubai Autodrome', 'bet:' || r.id || ':' || me || ':' || extract(epoch from now())::bigint);
  insert into race_bets (race_id, user_id, racer_id, amount) values (r.id, me, p_racer, p_amount)
    on conflict (race_id, user_id) do update set amount = race_bets.amount + excluded.amount;
  return coalesce(mine.amount, 0) + p_amount;
end $$;
revoke all on function public.place_bet(text, uuid, bigint) from public, anon;
grant execute on function public.place_bet(text, uuid, bigint) to authenticated;

/** Pays out a race's bets, once: the pot (less the fee) to whoever backed the winner, pro rata; or every stake back
    if nobody backed the winner or there is no winner (cancelled, or nobody finished). */
create or replace function public.settle_race_bets(p_race bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  r races; cfg jsonb := race_bet_rules(); winner uuid; winner_name text; pot bigint; on_winner bigint; share bigint; b race_bets; prize bigint;
begin
  select * into r from races where id = p_race for update;
  if r.id is null or r.bets_settled then return; end if;
  select user_id into winner from race_entries where race_id = r.id and place = 1;
  -- Not over yet: wait (a race still running with no winner yet).
  if winner is null and r.status in ('lobby', 'racing') then return; end if;
  update races set bets_settled = true where id = r.id;
  select coalesce(sum(amount), 0) into pot from race_bets where race_id = r.id;
  if pot = 0 then return; end if;
  select coalesce(sum(amount), 0) into on_winner from race_bets where race_id = r.id and racer_id = winner;
  if winner is null or on_winner = 0 then
    for b in select * from race_bets where race_id = r.id loop
      perform coin_move(b.user_id, b.amount, 'refund', 'Autodrome bet refunded: ' || case when winner is null then 'the race didn''t finish' else 'nobody backed the winner' end, 'bet:' || r.id || ':' || b.user_id || ':back');
      update race_bets set paid = b.amount where race_id = r.id and user_id = b.user_id;
    end loop;
    return;
  end if;
  prize := pot - (pot * (cfg ->> 'feePct')::int / 100);
  select username into winner_name from profiles where id = winner;
  for b in select * from race_bets where race_id = r.id loop
    if b.racer_id = winner then
      share := (prize * b.amount) / on_winner;
      perform coin_move(b.user_id, share, 'earn', 'Autodrome bet won on @' || coalesce(winner_name, 'the winner') || ' (' || round(prize::numeric / on_winner, 2) || '×)', 'bet:' || r.id || ':' || b.user_id || ':win');
      update race_bets set paid = share where race_id = r.id and user_id = b.user_id;
      if share - b.amount >= (cfg ->> 'bigWinFeed')::bigint then
        perform feed_post(b.user_id, 'bet', jsonb_build_object('won', share, 'stake', b.amount, 'winner', winner_name, 'code', r.code), winner, 'bet:' || r.id || ':' || b.user_id);
      end if;
    else
      update race_bets set paid = 0 where race_id = r.id and user_id = b.user_id;
    end if;
  end loop;
end $$;
revoke all on function public.settle_race_bets(bigint) from public, anon, authenticated;

-- The winner crossing the line settles the bets at once.
create or replace function public.finish_race(p_code text, p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; pl int; e race_entries; winner text; car text;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.status <> 'racing' then raise exception 'not_racing'; end if;
  select * into e from race_entries where race_id = r.id and user_id = me;
  if e.user_id is null then raise exception 'not_in_race'; end if;
  if e.finish_ms is not null then return e.place; end if;
  if p_ms < r.laps * 25000 or now() < r.starts_at + make_interval(secs => p_ms / 1000.0 - 3) then raise exception 'bad_time'; end if;
  pl := (select count(*) from race_entries where race_id = r.id and finish_ms is not null) + 1;
  update race_entries set finish_ms = p_ms, place = pl where race_id = r.id and user_id = me;
  if pl = 1 then perform settle_race_bets(r.id); end if;
  if pl = 2 then
    select p.username, c.car into winner, car from race_entries x join profiles p on p.id = x.user_id join owned_cars c on c.id = x.owned_car_id
     where x.race_id = r.id and x.place = 1;
    perform feed_post((select user_id from race_entries where race_id = r.id and place = 1), 'race',
      jsonb_build_object('code', r.code, 'laps', r.laps, 'racers', (select count(*) from race_entries where race_id = r.id), 'car', car,
        'ms', (select finish_ms from race_entries where race_id = r.id and place = 1)), null, 'race:' || r.id);
  end if;
  if not exists (select 1 from race_entries where race_id = r.id and finish_ms is null) then
    update races set status = 'done', ended_at = now() where id = r.id;
  end if;
  return pl;
end $$;
revoke all on function public.finish_race(text, int) from public, anon;
grant execute on function public.finish_race(text, int) to authenticated;

-- Leaving: a driver who leaves the lobby has their backers refunded; the host closing it refunds everyone.
create or replace function public.leave_race(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; b race_bets;
begin
  select * into r from races where code = upper(p_code);
  if r.id is null or r.status <> 'lobby' then return; end if;
  if r.host_id = me then
    update races set status = 'cancelled', ended_at = now() where id = r.id;
    perform settle_race_bets(r.id);
  else
    for b in select * from race_bets where race_id = r.id and racer_id = me loop
      perform coin_move(b.user_id, b.amount, 'refund', 'Autodrome bet refunded: the driver left', 'bet:' || r.id || ':' || b.user_id || ':left');
      delete from race_bets where race_id = r.id and user_id = b.user_id;
    end loop;
    delete from race_entries where race_id = r.id and user_id = me;
  end if;
end $$;
revoke all on function public.leave_race(text) from public, anon;
grant execute on function public.leave_race(text) to authenticated;

/** The betting on a race: the pot, what's on each driver and the payout per AED if they win, and my bet. */
create or replace function public.race_bets_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (select * from races where code = upper(p_code)),
  pot as (select coalesce(sum(b.amount), 0) as total, count(*) as bettors from race_bets b, r where b.race_id = r.id),
  per as (select b.racer_id, sum(b.amount) as amt, count(*) as n from race_bets b, r where b.race_id = r.id group by b.racer_id)
  select jsonb_build_object(
    'pot', (select total from pot), 'bettors', (select bettors from pot), 'feePct', (race_bet_rules() ->> 'feePct')::int,
    'minBet', (race_bet_rules() ->> 'minBet')::bigint, 'maxBet', (race_bet_rules() ->> 'maxBet')::bigint,
    'open', (select status = 'lobby' from r), 'settled', (select bets_settled from r),
    'on', coalesce((select jsonb_object_agg(per.racer_id, jsonb_build_object('amount', per.amt, 'bettors', per.n)) from per), '{}'::jsonb),
    'mine', (select jsonb_build_object('racer', b.racer_id, 'amount', b.amount, 'paid', b.paid) from race_bets b, r where b.race_id = r.id and b.user_id = auth.uid()))
$$;
revoke all on function public.race_bets_view(text) from public, anon;
grant execute on function public.race_bets_view(text) to authenticated;

-- Tidying: lobbies that close by themselves and races nobody finished settle their bets (refunds).
do $$ begin
  perform cron.unschedule('races-tidy');
exception when others then null;
end $$;
select cron.schedule('races-tidy', '*/10 * * * *', $$
  update public.races set status = 'cancelled', ended_at = now() where status = 'lobby' and created_at < now() - interval '2 hours';
  update public.races set status = 'done', ended_at = now() where status = 'racing' and starts_at < now() - interval '30 minutes';
  select public.settle_race_bets(id) from public.races where not bets_settled and status in ('cancelled', 'done');
$$);

-- Winning big on a bet is money news.
create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward', 'rain', 'hotel', 'bet') then 'money'
    when p_kind in ('win', 'race') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;
