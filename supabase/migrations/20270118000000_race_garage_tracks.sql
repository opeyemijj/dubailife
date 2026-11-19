-- Racing upgrades, more circuits, and dead heats.
--  1. The tuning garage: engine, turbo and tyres for a car you own, three stages each, bought a stage at a time
--     (src/data/cars/tuning.json, mirrored in the tuning rule below). The stages go with the car into a race (race_view, my_race_cars).
--  2. Five tracks: the host picks one when opening a race (src/data/autodrome/tracks.json, mirrored in the track rules below: each
--     track's fastest possible lap, which the finish time is checked against).
--  3. A draw splits the money: cars that finish on the same time to a tenth of a second (what the board shows) share
--     the place, and share equally what those places pay (two tied 1sts in a top-3 race get (60 + 30) / 2 each, the next
--     car is 3rd). A place's prize is paid once the next car home shows it wasn't tied (or the race ends), so nothing
--     has to be clawed back.

-- ---------------------------------------------------------------- 1. tuning

create or replace function public.car_tuning_rule() returns jsonb
language sql immutable as $$
  select '{"minCost":2000,"engine":[3,6,10],"turbo":[3,6,10],"tyres":[2,4,6]}'::jsonb
$$;

alter table public.owned_cars add column if not exists tune_engine smallint not null default 0 check (tune_engine between 0 and 3);
alter table public.owned_cars add column if not exists tune_turbo smallint not null default 0 check (tune_turbo between 0 and 3);
alter table public.owned_cars add column if not exists tune_tyres smallint not null default 0 check (tune_tyres between 0 and 3);

/** What the next stage of a part costs for this car (null: it's at the top stage). */
create or replace function public.car_tune_cost(p_car text, p_part text, p_stage int) returns int
language sql immutable as $$
  select case when p_stage between 0 and 2 then
    greatest((car_tuning_rule() ->> 'minCost')::int,
             (round((car_price(p_car))[1] * ((car_tuning_rule() -> p_part ->> p_stage)::numeric) / 100 / 100) * 100)::int)
  end
$$;

/** Buy the next stage of engine, turbo or tyres for one of my cars. */
create or replace function public.tune_car(p_car bigint, p_part text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c owned_cars; stage int; cost int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_part not in ('engine', 'turbo', 'tyres') then raise exception 'unknown_part'; end if;
  select * into c from owned_cars where id = p_car and user_id = me for update;
  if c.id is null then raise exception 'not_your_car'; end if;
  if coalesce(c.is_stolen, false) then raise exception 'car_stolen'; end if;
  if c.impounded_until is not null and c.impounded_until > now() then raise exception 'car_impounded'; end if;
  stage := case p_part when 'engine' then c.tune_engine when 'turbo' then c.tune_turbo else c.tune_tyres end;
  if stage >= 3 then raise exception 'max_stage'; end if;
  cost := car_tune_cost(c.car, p_part, stage);
  perform coin_move(me, -cost, 'spend', 'Tuning garage: ' || case p_part when 'engine' then 'engine' when 'turbo' then 'turbo' else 'tyres' end || ' stage ' || (stage + 1), 'car:' || c.id || ':tune:' || p_part || ':' || (stage + 1));
  update owned_cars set
    tune_engine = tune_engine + (p_part = 'engine')::int,
    tune_turbo = tune_turbo + (p_part = 'turbo')::int,
    tune_tyres = tune_tyres + (p_part = 'tyres')::int
   where id = c.id;
  return jsonb_build_object('id', c.id, 'part', p_part, 'stage', stage + 1, 'cost', cost);
end $$;
revoke all on function public.tune_car(bigint, text) from public, anon;
grant execute on function public.tune_car(bigint, text) to authenticated;

/** The stages on each of my cars. */
create or replace function public.my_car_tuning() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'engine', c.tune_engine, 'turbo', c.tune_turbo, 'tyres', c.tune_tyres)), '[]'::jsonb)
    from owned_cars c where c.user_id = auth.uid()
$$;
revoke all on function public.my_car_tuning() from public, anon;
grant execute on function public.my_car_tuning() to authenticated;

-- ---------------------------------------------------------------- 2. tracks

create or replace function public.race_track_rules() returns jsonb
language sql immutable as $$
  select '{"grand-prix":25000,"marina-street":18000,"qudra-oval":21000,"jebel-jais":26000,"palm-crescent":27000}'::jsonb
$$;

alter table public.races add column if not exists track text not null default 'grand-prix';

-- ---------------------------------------------------------------- 3. dead heats

create or replace function public.race_entry_rules() returns jsonb
language sql immutable as $$
  select '{"fees":[0,100000,1000000,5000000,10000000,50000000],"split":[60,30,10],"maxRacers":10,"bigWinFeed":1000000,"drawMs":100}'::jsonb
$$;

/** The winner in the City Feed (with what they won; "deadHeat" when the win was shared). Updated in place if posted again. */
create or replace function public.race_feed(p_race bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r races; w race_entries; car text; n int;
begin
  select * into r from races where id = p_race;
  select * into w from race_entries where race_id = p_race and place = 1 order by finish_ms, joined_at limit 1;
  if w.user_id is null then return; end if;
  select count(*) into n from race_entries where race_id = p_race and place = 1;
  select c.car into car from owned_cars c where c.id = w.owned_car_id;
  perform feed_post(w.user_id, 'race',
    jsonb_build_object('code', r.code, 'laps', r.laps, 'track', r.track, 'racers', (select count(*) from race_entries where race_id = r.id), 'car', car,
      'ms', w.finish_ms, 'prize', coalesce(w.prize, 0), 'pot', r.pot, 'mode', r.prize_mode, 'deadHeat', n),
    null, 'race:' || r.id);
end $$;
revoke all on function public.race_feed(bigint) from public, anon, authenticated;

/** Pays everyone sharing a place (once): the shares of the places they cover, split equally. */
create or replace function public.race_pay_group(p_race bigint, p_place int) returns void
language plpgsql security definer set search_path = public as $$
declare r races; m int; total bigint; each bigint; rest bigint; e race_entries; amt bigint; first boolean := true; label text;
begin
  select * into r from races where id = p_race for update;
  select count(*) into m from race_entries where race_id = p_race and place = p_place and prize is null;
  if m = 0 then return; end if;
  select coalesce(sum(race_place_share(r.pot, r.prize_mode, k)), 0) into total from generate_series(p_place, p_place + m - 1) k;
  each := total / m; rest := total - each * m;
  label := case p_place when 1 then '1st' when 2 then '2nd' when 3 then '3rd' else p_place || 'th' end || ' place prize' || case when m > 1 then ' (dead heat, shared ' || m || ' ways)' else '' end;
  for e in select * from race_entries where race_id = p_race and place = p_place and prize is null order by finish_ms, joined_at loop
    amt := each + case when first then rest else 0 end;
    first := false;
    update race_entries set prize = amt where race_id = p_race and user_id = e.user_id;
    if amt > 0 then
      update races set prize_paid = prize_paid + amt where id = p_race;
      perform coin_move(e.user_id, amt, 'earn', 'Dubai Autodrome: ' || label, 'race:' || p_race || ':' || e.user_id);
    end if;
  end loop;
  if p_place = 1 then perform race_feed(p_race); end if;
end $$;
revoke all on function public.race_pay_group(bigint, int) from public, anon, authenticated;

/** At the end (everyone finished, timed out or closed): places still open are paid, anything unpaid is shared by the
    winner(s); no winner, everyone's entry fee back. Once. */
create or replace function public.settle_race_prizes(p_race bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r races; left_over bigint; e race_entries; g int; n int; each bigint; first boolean := true; amt bigint;
begin
  select * into r from races where id = p_race for update;
  if r.id is null or r.prize_settled or r.status in ('lobby', 'racing') then return; end if;
  update races set prize_settled = true where id = r.id;
  if not exists (select 1 from race_entries where race_id = r.id and place = 1) then
    if r.pot > 0 then
      for e in select * from race_entries where race_id = r.id and fee_paid > 0 loop
        perform coin_move(e.user_id, e.fee_paid, 'refund', 'Dubai Autodrome: entry fee back (' || case when r.status = 'cancelled' then 'the race was closed' else 'nobody finished' end || ')', 'race:' || r.id || ':' || e.user_id || ':back');
      end loop;
    end if;
    return;
  end if;
  for g in select distinct place from race_entries where race_id = r.id and place is not null and prize is null order by place loop
    perform race_pay_group(r.id, g);
  end loop;
  select * into r from races where id = p_race;
  left_over := r.pot - r.prize_paid;
  if left_over > 0 then
    select count(*) into n from race_entries where race_id = r.id and place = 1;
    each := left_over / n;
    for e in select * from race_entries where race_id = r.id and place = 1 order by finish_ms, joined_at loop
      amt := each + case when first then left_over - each * n else 0 end;
      first := false;
      update race_entries set prize = coalesce(prize, 0) + amt where race_id = r.id and user_id = e.user_id;
      update races set prize_paid = prize_paid + amt where id = r.id;
      perform coin_move(e.user_id, amt, 'earn', 'Dubai Autodrome: the rest of the pot (nobody else placed)', 'race:' || r.id || ':' || e.user_id || ':rest');
    end loop;
    perform race_feed(r.id);
  end if;
end $$;
revoke all on function public.settle_race_prizes(bigint) from public, anon, authenticated;

drop function if exists public.pay_race_place(bigint, uuid, int);

-- ---------------------------------------------------------------- races: the track, the finish, the views

drop function if exists public.create_race(bigint, int, bigint, text);
create or replace function public.create_race(p_car bigint, p_laps int default 3, p_fee bigint default 0, p_mode text default 'winner', p_track text default 'grand-prix') returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rid bigint; old races;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  if not (race_entry_rules() -> 'fees') @> to_jsonb(coalesce(p_fee, 0)) then raise exception 'bad_fee'; end if;
  if coalesce(p_mode, 'winner') not in ('winner', 'top3') then raise exception 'bad_mode'; end if;
  if not race_track_rules() ? coalesce(p_track, 'grand-prix') then raise exception 'bad_track'; end if;
  -- One open race of my own at a time: an old lobby is closed (and its fees go back).
  for old in select * from races where host_id = me and status = 'lobby' loop
    update races set status = 'cancelled', ended_at = now() where id = old.id;
    perform settle_race_prizes(old.id);
  end loop;
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from races where code = c);
  end loop;
  insert into races (code, host_id, laps, entry_fee, prize_mode, pot, track)
    values (c, me, greatest(1, least(coalesce(p_laps, 3), 5)), coalesce(p_fee, 0), coalesce(p_mode, 'winner'), coalesce(p_fee, 0), coalesce(p_track, 'grand-prix'))
    returning id into rid;
  insert into race_entries (race_id, user_id, owned_car_id, fee_paid) values (rid, me, p_car, coalesce(p_fee, 0));
  if coalesce(p_fee, 0) > 0 then perform coin_move(me, -p_fee, 'spend', 'Dubai Autodrome: entry fee', 'race:' || rid || ':' || me || ':fee'); end if;
  return c;
end $$;
revoke all on function public.create_race(bigint, int, bigint, text, text) from public, anon;
grant execute on function public.create_race(bigint, int, bigint, text, text) to authenticated;

/** I crossed the line after my last lap: my time (ms). The same time to a tenth as the last car home shares its place;
    otherwise the places before mine are decided, and paid. */
create or replace function public.finish_race(p_code text, p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; pl int; last_pl int; e race_entries; g int; tick int := (race_entry_rules() ->> 'drawMs')::int;
begin
  select * into r from races where code = upper(p_code) for update;
  if r.id is null or r.status <> 'racing' then raise exception 'not_racing'; end if;
  select * into e from race_entries where race_id = r.id and user_id = me;
  if e.user_id is null then raise exception 'not_in_race'; end if;
  if e.finish_ms is not null then return e.place; end if;
  if p_ms < r.laps * coalesce((race_track_rules() ->> r.track)::int, 25000) or now() < r.starts_at + make_interval(secs => p_ms / 1000.0 - 3) then raise exception 'bad_time'; end if;
  select max(place) into last_pl from race_entries where race_id = r.id and finish_ms is not null;
  if last_pl is not null and exists (select 1 from race_entries where race_id = r.id and place = last_pl and prize is null and finish_ms / tick = p_ms / tick) then
    pl := last_pl;
  else
    pl := (select count(*) from race_entries where race_id = r.id and finish_ms is not null) + 1;
  end if;
  update race_entries set finish_ms = p_ms, place = pl where race_id = r.id and user_id = me;
  for g in select distinct place from race_entries where race_id = r.id and place < pl and prize is null order by place loop
    perform race_pay_group(r.id, g);
  end loop;
  if not exists (select 1 from race_entries where race_id = r.id and finish_ms is null) then
    update races set status = 'done', ended_at = now() where id = r.id;
    perform settle_race_prizes(r.id);
  end if;
  return pl;
end $$;
revoke all on function public.finish_race(text, int) from public, anon;
grant execute on function public.finish_race(text, int) to authenticated;

create or replace function public.my_race_cars() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'car', c.car, 'plate', c.plate, 'color', c.color,
           'tune', jsonb_build_object('engine', c.tune_engine, 'turbo', c.tune_turbo, 'tyres', c.tune_tyres)) order by c.price desc nulls last), '[]'::jsonb)
    from owned_cars c where c.user_id = auth.uid() and race_car_ok(auth.uid(), c.id)
$$;

/** A race (its track), who's in it (each car's colour and tuning, prizes won), the pot and the split, with the server's clock. */
create or replace function public.race_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', r.code, 'hostId', r.host_id, 'host', h.username, 'laps', r.laps, 'max', r.max_racers,
           'status', r.status, 'startsAt', r.starts_at, 'now', now(), 'track', r.track,
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot, 'split', race_entry_rules() -> 'split',
           'racers', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
                                 'car', c.car, 'color', c.color, 'plate', c.plate, 'finishMs', e.finish_ms, 'place', e.place, 'prize', e.prize,
                                 'tune', jsonb_build_object('engine', c.tune_engine, 'turbo', c.tune_turbo, 'tyres', c.tune_tyres)) order by e.joined_at)
                               from race_entries e join profiles p on p.id = e.user_id join owned_cars c on c.id = e.owned_car_id
                              where e.race_id = r.id), '[]'::jsonb))
    from races r join profiles h on h.id = r.host_id
   where r.code = upper(p_code)
$$;

create or replace function public.open_races() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'host', h.username, 'look', h.citizen -> 'look', 'laps', r.laps, 'track', r.track,
           'status', r.status, 'racers', (select count(*) from race_entries e where e.race_id = r.id), 'max', r.max_racers,
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot) order by r.created_at desc), '[]'::jsonb)
    from races r join profiles h on h.id = r.host_id
   where (r.status = 'lobby' and r.created_at > now() - interval '2 hours') or (r.status = 'racing' and r.starts_at > now() - interval '15 minutes')
$$;
