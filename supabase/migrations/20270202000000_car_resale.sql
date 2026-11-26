-- Selling a car: back to the dealer, when you own at least two (you always keep one). Mirrors cars.json → resale
-- (scripts/check-life-config.mjs compares car_resale_rule() with it).

create or replace function public.car_resale_rule() returns jsonb
language sql immutable as $$
  select '{"minCars": 2, "newPercent": 80, "monthlyDrop": 2, "floorPercent": 50}'::jsonb
$$;

/** What the dealer pays for a car bought at p_price on p_bought. */
create or replace function public.car_resale_value(p_price bigint, p_bought timestamptz) returns bigint
language sql stable as $$
  select (round(p_price * greatest((r ->> 'floorPercent')::numeric,
            (r ->> 'newPercent')::numeric - (r ->> 'monthlyDrop')::numeric * floor(extract(epoch from now() - p_bought) / (30 * 86400))) / 100 / 100) * 100)::bigint
  from (select public.car_resale_rule() as r) x
$$;

-- Race history survives a sale: the entry keeps the model it was raced in.
alter table public.race_entries add column if not exists sold_car text;
alter table public.race_entries drop constraint if exists race_entries_ride_check;
alter table public.race_entries add constraint race_entries_ride_check check (owned_car_id is not null or mount is not null or sold_car is not null);
alter table public.race_entries drop constraint if exists race_entries_owned_car_id_fkey;
alter table public.race_entries add constraint race_entries_owned_car_id_fkey foreign key (owned_car_id) references public.owned_cars (id) on delete set null;

create or replace function public.sell_car(p_car bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c owned_cars; n int; v bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into c from owned_cars where id = p_car and user_id = me for update;
  if c.id is null then raise exception 'not_your_car'; end if;
  select count(*) into n from owned_cars where user_id = me and not coalesce(is_stolen, false);
  if n < (car_resale_rule() ->> 'minCars')::int then raise exception 'keep_one_car'; end if;
  if coalesce(c.is_stolen, false) then raise exception 'car_stolen'; end if;
  if c.impounded_until is not null and c.impounded_until > now() then raise exception 'car_impounded'; end if;
  if exists (select 1 from race_entries e join races r on r.id = e.race_id where e.owned_car_id = c.id and r.status in ('lobby', 'racing')) then
    raise exception 'car_in_race';
  end if;
  v := car_resale_value(c.price, c.bought_at);
  update race_entries set sold_car = c.car where owned_car_id = c.id;
  delete from owned_cars where id = c.id;
  perform coin_move(me, v, 'earn', 'Car sold back to the dealer', 'car:' || c.id);
  return jsonb_build_object('id', c.id, 'car', c.car, 'value', v);
end $$;
grant execute on function public.sell_car(bigint) to authenticated;
