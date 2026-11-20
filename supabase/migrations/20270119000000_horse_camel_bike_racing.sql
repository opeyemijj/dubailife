-- Horse racing at Meydan, camel racing at Al Marmoom and superbike racing at the Autodrome: the same races as the cars
-- (a lobby, the host's start, entry fees, prizes, dead heats), with a sport on each race. Riders don't need to own
-- anything: each picks a mount from the venue's stable or paddock (src/data/racing/sports.json), and their entry holds
-- the mount instead of a car. Horses race the Meydan courses, camels Al Marmoom's, superbikes the five circuits
-- (src/data/autodrome/tracks.json). The sports, their tracks and mounts are mirrored in the sport rules below, and each
-- new track's fastest possible lap in the track rules (both checked by scripts/check-life-config.mjs).

create or replace function public.race_track_rules() returns jsonb
language sql immutable as $$
  select '{"grand-prix":25000,"marina-street":18000,"qudra-oval":21000,"jebel-jais":26000,"palm-crescent":27000,"meydan-turf":104000,"meydan-dirt":74000,"marmoom-sprint":94000,"marmoom-classic":138000}'::jsonb
$$;

create or replace function public.race_sport_rules() returns jsonb
language sql immutable as $$
  select '{"car":{"tracks":["grand-prix","marina-street","qudra-oval","jebel-jais","palm-crescent"]},"horse":{"tracks":["meydan-turf","meydan-dirt"],"mounts":["thunder-road","desert-crown","silver-mirage","midnight-falcon"]},"camel":{"tracks":["marmoom-sprint","marmoom-classic"],"mounts":["bint-al-reeh","al-asfar","najmat-al-layl","mubaraka"]},"bike":{"tracks":["grand-prix","marina-street","qudra-oval","jebel-jais","palm-crescent"],"mounts":["ducati-panigale-v4r","bmw-m1000rr","kawasaki-zx10rr","yamaha-r1m","honda-fireblade-sp"]}}'::jsonb
$$;

alter table public.races add column if not exists sport text not null default 'car';
alter table public.races drop constraint if exists races_sport_check;
alter table public.races add constraint races_sport_check check (sport in ('car', 'bike', 'horse', 'camel'));
create index if not exists races_open_sport on public.races (sport, status, created_at desc);

alter table public.race_entries alter column owned_car_id drop not null;
alter table public.race_entries add column if not exists mount text;
alter table public.race_entries drop constraint if exists race_entries_ride_check;
alter table public.race_entries add constraint race_entries_ride_check check (owned_car_id is not null or mount is not null);

/** Closes my open lobbies (fees back): one open race of my own at a time, whatever the sport. */
create or replace function public.race_close_my_lobbies(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare old races;
begin
  for old in select * from races where host_id = p_user and status = 'lobby' loop
    update races set status = 'cancelled', ended_at = now() where id = old.id;
    perform settle_race_prizes(old.id);
  end loop;
end $$;
revoke all on function public.race_close_my_lobbies(uuid) from public, anon, authenticated;

-- Car races: on a circuit only, and only cars join them.
create or replace function public.create_race(p_car bigint, p_laps int default 3, p_fee bigint default 0, p_mode text default 'winner', p_track text default 'grand-prix') returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not race_car_ok(me, p_car) then raise exception 'no_car'; end if;
  if not (race_entry_rules() -> 'fees') @> to_jsonb(coalesce(p_fee, 0)) then raise exception 'bad_fee'; end if;
  if coalesce(p_mode, 'winner') not in ('winner', 'top3') then raise exception 'bad_mode'; end if;
  if not (race_sport_rules() -> 'car' -> 'tracks') ? coalesce(p_track, 'grand-prix') then raise exception 'bad_track'; end if;
  perform race_close_my_lobbies(me);
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from races where code = c);
  end loop;
  insert into races (code, host_id, laps, entry_fee, prize_mode, pot, track, sport)
    values (c, me, greatest(1, least(coalesce(p_laps, 3), 5)), coalesce(p_fee, 0), coalesce(p_mode, 'winner'), coalesce(p_fee, 0), coalesce(p_track, 'grand-prix'), 'car')
    returning id into rid;
  insert into race_entries (race_id, user_id, owned_car_id, fee_paid) values (rid, me, p_car, coalesce(p_fee, 0));
  if coalesce(p_fee, 0) > 0 then perform coin_move(me, -p_fee, 'spend', 'Dubai Autodrome: entry fee', 'race:' || rid || ':' || me || ':fee'); end if;
  return c;
end $$;
revoke all on function public.create_race(bigint, int, bigint, text, text) from public, anon;
grant execute on function public.create_race(bigint, int, bigint, text, text) to authenticated;

create or replace function public.join_race(p_code text, p_car bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; host text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from races where code = upper(p_code) for update;
  if r.id is null then raise exception 'no_race'; end if;
  if r.sport <> 'car' then raise exception 'wrong_sport'; end if;
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

/** Where a sport races, for the money's labels. */
create or replace function public.race_venue(p_sport text) returns text
language sql immutable as $$
  select case p_sport when 'horse' then 'Meydan Racecourse' when 'camel' then 'Al Marmoom Camel Racetrack' else 'Dubai Autodrome' end
$$;

-- Prizes and refunds say where the race was.
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
      perform coin_move(e.user_id, amt, 'earn', race_venue(r.sport) || ': ' || label, 'race:' || p_race || ':' || e.user_id);
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
        perform coin_move(e.user_id, e.fee_paid, 'refund', race_venue(r.sport) || ': entry fee back (' || case when r.status = 'cancelled' then 'the race was closed' else 'nobody finished' end || ')', 'race:' || r.id || ':' || e.user_id || ':back');
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
      perform coin_move(e.user_id, amt, 'earn', race_venue(r.sport) || ': the rest of the pot (nobody else placed)', 'race:' || r.id || ':' || e.user_id || ':rest');
    end loop;
    perform race_feed(r.id);
  end if;
end $$;
revoke all on function public.settle_race_prizes(bigint) from public, anon, authenticated;

/** Open a horse, camel or superbike race on a mount from the stable. Returns its code. */
create or replace function public.create_sport_race(p_sport text, p_mount text, p_laps int default 1, p_fee bigint default 0, p_mode text default 'winner', p_track text default null) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rid bigint; rules jsonb := race_sport_rules() -> p_sport; trk text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_sport not in ('bike', 'horse', 'camel') or rules is null then raise exception 'bad_sport'; end if;
  if not (rules -> 'mounts') ? coalesce(p_mount, '') then raise exception 'bad_mount'; end if;
  trk := coalesce(p_track, rules -> 'tracks' ->> 0);
  if not (rules -> 'tracks') ? trk then raise exception 'bad_track'; end if;
  if not (race_entry_rules() -> 'fees') @> to_jsonb(coalesce(p_fee, 0)) then raise exception 'bad_fee'; end if;
  if coalesce(p_mode, 'winner') not in ('winner', 'top3') then raise exception 'bad_mode'; end if;
  perform race_close_my_lobbies(me);
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from races where code = c);
  end loop;
  insert into races (code, host_id, laps, entry_fee, prize_mode, pot, track, sport)
    values (c, me, greatest(1, least(coalesce(p_laps, 1), 5)), coalesce(p_fee, 0), coalesce(p_mode, 'winner'), coalesce(p_fee, 0), trk, p_sport)
    returning id into rid;
  insert into race_entries (race_id, user_id, mount, fee_paid) values (rid, me, p_mount, coalesce(p_fee, 0));
  if coalesce(p_fee, 0) > 0 then perform coin_move(me, -p_fee, 'spend', race_venue(p_sport) || ': entry fee', 'race:' || rid || ':' || me || ':fee'); end if;
  return c;
end $$;
revoke all on function public.create_sport_race(text, text, int, bigint, text, text) from public, anon;
grant execute on function public.create_sport_race(text, text, int, bigint, text, text) to authenticated;

/** Join a horse, camel or superbike race on a mount from the stable (paying the entry fee the first time), or change mount. */
create or replace function public.join_sport_race(p_code text, p_mount text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r races; host text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from races where code = upper(p_code) for update;
  if r.id is null then raise exception 'no_race'; end if;
  if r.sport = 'car' then raise exception 'wrong_sport'; end if;
  if r.status <> 'lobby' then raise exception 'race_started'; end if;
  if not (race_sport_rules() -> r.sport -> 'mounts') ? coalesce(p_mount, '') then raise exception 'bad_mount'; end if;
  if exists (select 1 from race_entries where race_id = r.id and user_id = me) then
    update race_entries set mount = p_mount where race_id = r.id and user_id = me;
    return;
  end if;
  if (select count(*) from race_entries where race_id = r.id) >= r.max_racers then raise exception 'race_full'; end if;
  insert into race_entries (race_id, user_id, mount, fee_paid) values (r.id, me, p_mount, r.entry_fee);
  update races set pot = pot + r.entry_fee where id = r.id;
  if r.entry_fee > 0 then
    select username into host from profiles where id = r.host_id;
    perform coin_move(me, -r.entry_fee, 'spend', race_venue(r.sport) || ': entry fee for @' || coalesce(host, 'a host') || '''s race', 'race:' || r.id || ':' || me || ':fee');
  end if;
end $$;
revoke all on function public.join_sport_race(text, text) from public, anon;
grant execute on function public.join_sport_race(text, text) to authenticated;

/** The winner in the City Feed (the sport, and the car or mount; "deadHeat" when the win was shared). */
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
    jsonb_build_object('code', r.code, 'laps', r.laps, 'track', r.track, 'sport', r.sport, 'mount', w.mount,
      'racers', (select count(*) from race_entries where race_id = r.id), 'car', car,
      'ms', w.finish_ms, 'prize', coalesce(w.prize, 0), 'pot', r.pot, 'mode', r.prize_mode, 'deadHeat', n),
    null, 'race:' || r.id);
end $$;
revoke all on function public.race_feed(bigint) from public, anon, authenticated;

/** A race (its sport and track), who's in it (each one's car with its colour and tuning, or mount), prizes, the pot
    and the split, with the server's clock. */
create or replace function public.race_view(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', r.code, 'hostId', r.host_id, 'host', h.username, 'laps', r.laps, 'max', r.max_racers,
           'status', r.status, 'startsAt', r.starts_at, 'now', now(), 'track', r.track, 'sport', r.sport,
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot, 'split', race_entry_rules() -> 'split',
           'racers', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
                                 'car', coalesce(c.car, ''), 'mount', e.mount, 'color', c.color, 'plate', c.plate, 'finishMs', e.finish_ms, 'place', e.place, 'prize', e.prize,
                                 'tune', case when c.id is not null then jsonb_build_object('engine', c.tune_engine, 'turbo', c.tune_turbo, 'tyres', c.tune_tyres) end) order by e.joined_at)
                               from race_entries e join profiles p on p.id = e.user_id left join owned_cars c on c.id = e.owned_car_id
                              where e.race_id = r.id), '[]'::jsonb))
    from races r join profiles h on h.id = r.host_id
   where r.code = upper(p_code)
$$;

/** Races open to join now, and ones racing (each with its sport). */
create or replace function public.open_races() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'host', h.username, 'look', h.citizen -> 'look', 'laps', r.laps, 'track', r.track, 'sport', r.sport,
           'status', r.status, 'racers', (select count(*) from race_entries e where e.race_id = r.id), 'max', r.max_racers,
           'entryFee', r.entry_fee, 'prizeMode', r.prize_mode, 'pot', r.pot) order by r.created_at desc), '[]'::jsonb)
    from races r join profiles h on h.id = r.host_id
   where (r.status = 'lobby' and r.created_at > now() - interval '2 hours') or (r.status = 'racing' and r.starts_at > now() - interval '15 minutes')
$$;

/** My friends to invite to a horse, camel or superbike race: anyone can ride (online first). */
create or replace function public.race_friends() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look',
             'online', not p.chat_off and exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes'),
             'car', null) as x
      from friendships f join profiles p on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
     where f.status = 'accepted' and auth.uid() in (f.user_id, f.friend_id)
     order by exists (select 1 from online_now o where o.user_id = p.id and o.seen_at > now() - interval '2 minutes') desc, p.username) t
$$;
revoke all on function public.race_friends() from public, anon;
grant execute on function public.race_friends() to authenticated;

-- Leaving the grid: the refund says where.
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
  if e.fee_paid > 0 then perform coin_move(me, e.fee_paid, 'refund', race_venue(r.sport) || ': entry fee back (left the grid)', 'race:' || r.id || ':' || me || ':left'); end if;
end $$;
revoke all on function public.leave_race(text) from public, anon;
grant execute on function public.leave_race(text) to authenticated;
