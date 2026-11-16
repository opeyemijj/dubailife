-- Autodrome races: an entry fee and prizes, instead of betting. The host opens a race with an entry fee (free, or one
-- of the set amounts) and a prize split: winner takes all, or 1st / 2nd / 3rd. Every driver pays the fee to join (the
-- host too), up to 10 drivers; the fees make the pot, all of it paid out, nothing kept. Prizes are paid as each place
-- crosses the line; any share nobody claims (fewer than three finish) goes to the winner. A driver leaving the grid
-- gets their fee back; a race closed or that nobody finishes refunds everyone. Rules: src/data/autodrome/entry.json,
-- mirrored in race_entry_rules() (checked by scripts/check-life-config.mjs). Replaces the betting of
-- 20270114000100_race_bets.sql (no bets were ever placed).

drop function if exists public.place_bet(text, uuid, bigint);
drop function if exists public.race_bets_view(text);
drop function if exists public.settle_race_bets(bigint);
drop function if exists public.race_bet_rules();
drop table if exists public.race_bets;

create or replace function public.race_entry_rules() returns jsonb
language sql immutable as $$
  select '{"fees":[0,100000,1000000,5000000,10000000,50000000],"split":[60,30,10],"maxRacers":10,"bigWinFeed":1000000}'::jsonb
$$;

alter table public.races add column if not exists entry_fee bigint not null default 0 check (entry_fee >= 0);
alter table public.races add column if not exists prize_mode text not null default 'winner' check (prize_mode in ('winner', 'top3'));
alter table public.races add column if not exists pot bigint not null default 0;
alter table public.races add column if not exists prize_paid bigint not null default 0;
do $$ begin
  alter table public.races rename column bets_settled to prize_settled;
exception when undefined_column then null;
end $$;
alter table public.races add column if not exists prize_settled boolean not null default false;
alter table public.race_entries add column if not exists fee_paid bigint not null default 0;
alter table public.race_entries add column if not exists prize bigint;

/** A place's share of the pot (before the end-of-race top-up to the winner). */
create or replace function public.race_place_share(p_pot bigint, p_mode text, p_place int) returns bigint
language sql immutable as $$
  select case
    when p_mode = 'winner' then case when p_place = 1 then p_pot else 0 end
    when p_place between 1 and 3 then p_pot * ((race_entry_rules() -> 'split' ->> (p_place - 1))::int) / 100
    else 0 end
$$;

/** Pays a finisher their place's prize (once). */
create or replace function public.pay_race_place(p_race bigint, p_user uuid, p_place int) returns void
language plpgsql security definer set search_path = public as $$
declare r races; amt bigint;
begin
  select * into r from races where id = p_race for update;
  amt := race_place_share(r.pot, r.prize_mode, p_place);
  if amt <= 0 or exists (select 1 from race_entries where race_id = p_race and user_id = p_user and prize is not null) then return; end if;
  update race_entries set prize = amt where race_id = p_race and user_id = p_user;
  update races set prize_paid = prize_paid + amt where id = p_race;
  perform coin_move(p_user, amt, 'earn', 'Dubai Autodrome: ' || case p_place when 1 then '1st' when 2 then '2nd' else '3rd' end || ' place prize', 'race:' || p_race || ':' || p_user);
end $$;
revoke all on function public.pay_race_place(bigint, uuid, int) from public, anon, authenticated;

/** At the end (everyone finished, timed out or closed): anything unpaid goes to the winner; no winner, everyone's
    entry fee back. Once. */
create or replace function public.settle_race_prizes(p_race bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r races; winner uuid; left_over bigint; e race_entries;
begin
  select * into r from races where id = p_race for update;
  if r.id is null or r.prize_settled or r.status in ('lobby', 'racing') then return; end if;
  update races set prize_settled = true where id = r.id;
  if r.pot <= 0 then return; end if;
  select user_id into winner from race_entries where race_id = r.id and place = 1;
  if winner is null then
    for e in select * from race_entries where race_id = r.id and fee_paid > 0 loop
      perform coin_move(e.user_id, e.fee_paid, 'refund', 'Dubai Autodrome: entry fee back (' || case when r.status = 'cancelled' then 'the race was closed' else 'nobody finished' end || ')', 'race:' || r.id || ':' || e.user_id || ':back');
    end loop;
    return;
  end if;
  left_over := r.pot - r.prize_paid;
  if left_over > 0 then
    update race_entries set prize = coalesce(prize, 0) + left_over where race_id = r.id and user_id = winner;
    update races set prize_paid = prize_paid + left_over where id = r.id;
    perform coin_move(winner, left_over, 'earn', 'Dubai Autodrome: the rest of the pot (nobody else placed)', 'race:' || r.id || ':' || winner || ':rest');
  end if;
end $$;
revoke all on function public.settle_race_prizes(bigint) from public, anon, authenticated;

-- Opening a race: the car, laps, entry fee and prize split. The host pays the fee too.
drop function if exists public.create_race(bigint, int);
create or replace function public.create_race(p_car bigint, p_laps int default 3, p_fee bigint default 0, p_mode text default 'winner') returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rid bigint; old races;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  if not (race_entry_rules() -> 'fees') @> to_jsonb(coalesce(p_fee, 0)) then raise exception 'bad_fee'; end if;
  if coalesce(p_mode, 'winner') not in ('winner', 'top3') then raise exception 'bad_mode'; end if;
  -- One open race of my own at a time: an old lobby is closed (and its fees go back).
  for old in select * from races where host_id = me and status = 'lobby' loop
    update races set status = 'cancelled', ended_at = now() where id = old.id;
    perform settle_race_prizes(old.id);
  end loop;
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from races where code = c);
  end loop;
  insert into races (code, host_id, laps, entry_fee, prize_mode, pot)
    values (c, me, greatest(1, least(coalesce(p_laps, 3), 5)), coalesce(p_fee, 0), coalesce(p_mode, 'winner'), coalesce(p_fee, 0))
    returning id into rid;
  insert into race_entries (race_id, user_id, owned_car_id, fee_paid) values (rid, me, p_car, coalesce(p_fee, 0));
  if coalesce(p_fee, 0) > 0 then perform coin_move(me, -p_fee, 'spend', 'Dubai Autodrome: entry fee', 'race:' || rid || ':' || me || ':fee'); end if;
  return c;
end $$;
revoke all on function public.create_race(bigint, int, bigint, text) from public, anon;
grant execute on function public.create_race(bigint, int, bigint, text) to authenticated;

/** Join with one of my cars (paying the entry fee the first time), or change the car I'm in. */
create or replace function public.join_race(p_code text, p_car bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; host text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from races where code = upper(p_code) for update;
  if r.id is null then raise exception 'no_race'; end if;
  if r.status <> 'lobby' then raise exception 'race_started'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  if exists (select 1 from race_entries where race_id = r.id and user_id = me) then
    update race_entries set owned_car_id = p_car where race_id = r.id and user_id = me;
    return;
  end if;
  if (select count(*) from race_entries where race_id = r.id) >= r.max_racers then raise exception 'race_full'; end if;
  insert into race_entries (race_id, user_id, owned_car_id, fee_paid) values (r.id, me, p_car, r.entry_fee);
  update races set pot = pot + r.entry_fee where id = r.id;
  if r.entry_fee > 0 then
    select username into host from profiles where id = r.host_id;
    perform coin_move(me, -r.entry_fee, 'spend', 'Dubai Autodrome: entry fee for @' || coalesce(host, 'a host') || '''s race', 'race:' || r.id || ':' || me || ':fee');
  end if;
end $$;
revoke all on function public.join_race(text, bigint) from public, anon;
grant execute on function public.join_race(text, bigint) to authenticated;

/** Leave the grid (fee back), or the host closes the race (everyone's fee back). */
create or replace function public.leave_race(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; e race_entries;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.status <> 'lobby' then return; end if;
  if r.host_id = me then
    update races set status = 'cancelled', ended_at = now() where id = r.id;
    perform settle_race_prizes(r.id);
    return;
  end if;
  select * into e from race_entries where race_id = r.id and user_id = me;
  if e.user_id is null then return; end if;
  delete from race_entries where race_id = r.id and user_id = me;
  update races set pot = pot - e.fee_paid where id = r.id;
  if e.fee_paid > 0 then perform coin_move(me, e.fee_paid, 'refund', 'Dubai Autodrome: entry fee back (left the grid)', 'race:' || r.id || ':' || me || ':left'); end if;
end $$;
revoke all on function public.leave_race(text) from public, anon;
grant execute on function public.leave_race(text) to authenticated;

/** I crossed the line after my last lap: my time (ms). Prizes as places are decided; the end settles the rest. */
create or replace function public.finish_race(p_code text, p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; pl int; e race_entries; car text; won bigint;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.status <> 'racing' then raise exception 'not_racing'; end if;
  select * into e from race_entries where race_id = r.id and user_id = me;
  if e.user_id is null then raise exception 'not_in_race'; end if;
  if e.finish_ms is not null then return e.place; end if;
  if p_ms < r.laps * 25000 or now() < r.starts_at + make_interval(secs => p_ms / 1000.0 - 3) then raise exception 'bad_time'; end if;
  pl := (select count(*) from race_entries where race_id = r.id and finish_ms is not null) + 1;
  update race_entries set finish_ms = p_ms, place = pl where race_id = r.id and user_id = me;
  perform pay_race_place(r.id, me, pl);
  if not exists (select 1 from race_entries where race_id = r.id and finish_ms is null) then
    update races set status = 'done', ended_at = now() where id = r.id;
    perform settle_race_prizes(r.id);
  end if;
  -- The winner in the City Feed once a second car is home (with what they won).
  if pl = 2 or (pl = 1 and (select count(*) from race_entries where race_id = r.id) = 1) then
    select c.car, x.prize into car, won from race_entries x join owned_cars c on c.id = x.owned_car_id where x.race_id = r.id and x.place = 1;
    perform feed_post((select user_id from race_entries where race_id = r.id and place = 1), 'race',
      jsonb_build_object('code', r.code, 'laps', r.laps, 'racers', (select count(*) from race_entries where race_id = r.id), 'car', car,
        'ms', (select finish_ms from race_entries where race_id = r.id and place = 1), 'prize', coalesce(won, 0), 'pot', r.pot, 'mode', r.prize_mode),
      null, 'race:' || r.id);
  end if;
  return pl;
end $$;
revoke all on function public.finish_race(text, int) from public, anon;
grant execute on function public.finish_race(text, int) to authenticated;

/** A race, who's in it (with prizes won), the pot and the split, with the server's clock. */
create or replace function public.race_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', r.code, 'hostId', r.host_id, 'host', h.username, 'laps', r.laps, 'max', r.max_racers,
           'status', r.status, 'startsAt', r.starts_at, 'now', now(),
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot, 'split', race_entry_rules() -> 'split',
           'racers', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
                                 'car', c.car, 'plate', c.plate, 'finishMs', e.finish_ms, 'place', e.place, 'prize', e.prize) order by e.joined_at)
                               from race_entries e join profiles p on p.id = e.user_id join owned_cars c on c.id = e.owned_car_id
                              where e.race_id = r.id), '[]'::jsonb))
    from races r join profiles h on h.id = r.host_id
   where r.code = upper(p_code)
$$;
revoke all on function public.race_view(text) from public, anon;
grant execute on function public.race_view(text) to authenticated;

create or replace function public.open_races() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'host', h.username, 'look', h.citizen -> 'look', 'laps', r.laps,
           'status', r.status, 'racers', (select count(*) from race_entries e where e.race_id = r.id), 'max', r.max_racers,
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot) order by r.created_at desc), '[]'::jsonb)
    from races r join profiles h on h.id = r.host_id
   where (r.status = 'lobby' and r.created_at > now() - interval '2 hours') or (r.status = 'racing' and r.starts_at > now() - interval '15 minutes')
$$;
revoke all on function public.open_races() from public, anon;
grant execute on function public.open_races() to authenticated;

do $$ begin
  perform cron.unschedule('races-tidy');
exception when others then null;
end $$;
select cron.schedule('races-tidy', '*/10 * * * *', $$
  update public.races set status = 'cancelled', ended_at = now() where status = 'lobby' and created_at < now() - interval '2 hours';
  update public.races set status = 'done', ended_at = now() where status = 'racing' and starts_at < now() - interval '30 minutes';
  select public.settle_race_prizes(id) from public.races where not prize_settled and status in ('cancelled', 'done');
$$);

create or replace function public.feed_category(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('home', 'car', 'gift', 'reward', 'rain', 'hotel') then 'money'
    when p_kind in ('win', 'race') then 'games'
    when p_kind in ('party') then 'parties'
    else 'life' end
$$;
