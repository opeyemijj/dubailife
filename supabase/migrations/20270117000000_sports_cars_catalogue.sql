-- Sports cars and supercars: three new showrooms on Sheikh Zayed Road (Al Tayer Motors Ferrari, McLaren Dubai,
-- Porsche Centre Dubai) and new models at Gargash (Mercedes-AMG GT 63) and Lamborghini Dubai (Revuelto). Prices,
-- who sells what and each car's tank mirror src/data/cars/cars.json (scripts/check-life-config.mjs compares them
-- with the newest definition of each of these three functions).

/** {price to buy, price per day to rent} for each car. */
create or replace function public.car_price(p_car text) returns int[]
language sql immutable as $$
  select case p_car
    when 'nissan-sunny' then array[62000, 90]
    when 'toyota-corolla' then array[82000, 110]
    when 'toyota-camry' then array[115000, 150]
    when 'nissan-patrol' then array[260000, 380]
    when 'toyota-land-cruiser' then array[320000, 450]
    when 'bmw-5' then array[260000, 420]
    when 'bmw-x5' then array[340000, 520]
    when 'mercedes-e' then array[280000, 450]
    when 'mercedes-g63' then array[950000, 1500]
    when 'lamborghini-urus' then array[1100000, 2800]
    when 'lamborghini-huracan' then array[1050000, 3200]
    when 'tesla-model-y' then array[190000, 450]
    when 'ferrari-roma' then array[920000, 2900]
    when 'ferrari-296-gtb' then array[1250000, 3800]
    when 'ferrari-sf90' then array[2050000, 5800]
    when 'mclaren-artura' then array[1000000, 3200]
    when 'mclaren-750s' then array[1400000, 4200]
    when 'porsche-911-turbo-s' then array[1050000, 2900]
    when 'porsche-911-gt3-rs' then array[1300000, 3600]
    when 'porsche-taycan-turbo-s' then array[850000, 2400]
    when 'mercedes-amg-gt' then array[760000, 2300]
    when 'lamborghini-revuelto' then array[2300000, 6500] end
$$;

create or replace function public.car_offered(p_place text, p_car text) returns text
language sql immutable as $$
  select case
    when p_place = 'sixt-szr' and p_car in ('nissan-sunny', 'toyota-camry', 'bmw-5', 'mercedes-g63') then 'rent'
    when p_place = 'hertz-szr' and p_car in ('nissan-sunny', 'toyota-corolla', 'nissan-patrol', 'mercedes-e') then 'rent'
    when p_place = 'europcar-szr' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser', 'bmw-x5') then 'rent'
    when p_place = 'budget-szr' and p_car in ('nissan-sunny', 'toyota-corolla', 'nissan-patrol') then 'rent'
    when p_place = 'autostrad-szr' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser', 'lamborghini-urus') then 'rent'
    when p_place = 'al-futtaim-toyota' and p_car in ('toyota-corolla', 'toyota-camry', 'toyota-land-cruiser') then 'buy'
    when p_place = 'arabian-automobiles-nissan' and p_car in ('nissan-sunny', 'nissan-patrol') then 'buy'
    when p_place = 'agmc-bmw' and p_car in ('bmw-5', 'bmw-x5') then 'buy'
    when p_place = 'gargash-mercedes' and p_car in ('mercedes-e', 'mercedes-g63', 'mercedes-amg-gt') then 'buy'
    when p_place = 'lamborghini-dubai' and p_car in ('lamborghini-urus', 'lamborghini-huracan', 'lamborghini-revuelto') then 'buy'
    when p_place = 'tesla-dubai' and p_car in ('tesla-model-y') then 'buy'
    when p_place = 'al-tayer-ferrari' and p_car in ('ferrari-roma', 'ferrari-296-gtb', 'ferrari-sf90') then 'buy'
    when p_place = 'mclaren-dubai' and p_car in ('mclaren-artura', 'mclaren-750s') then 'buy'
    when p_place = 'porsche-centre-dubai' and p_car in ('porsche-911-turbo-s', 'porsche-911-gt3-rs', 'porsche-taycan-turbo-s') then 'buy'
  end
$$;

/** {tank (litres, or kWh), use per 100 km, electric 1/0} for each car. */
create or replace function public.car_energy(p_car text) returns numeric[]
language sql immutable as $$
  select case p_car
    when 'nissan-sunny' then array[42, 6.5, 0]
    when 'toyota-corolla' then array[50, 6.8, 0]
    when 'toyota-camry' then array[60, 7.5, 0]
    when 'nissan-patrol' then array[100, 14, 0]
    when 'toyota-land-cruiser' then array[110, 13, 0]
    when 'bmw-5' then array[68, 8, 0]
    when 'bmw-x5' then array[83, 10, 0]
    when 'mercedes-e' then array[66, 8, 0]
    when 'mercedes-g63' then array[100, 15, 0]
    when 'lamborghini-urus' then array[85, 14, 0]
    when 'lamborghini-huracan' then array[83, 15, 0]
    when 'tesla-model-y' then array[75, 17, 1]
    when 'ferrari-roma' then array[80, 12, 0]
    when 'ferrari-296-gtb' then array[65, 11, 0]
    when 'ferrari-sf90' then array[68, 13, 0]
    when 'mclaren-artura' then array[66, 11, 0]
    when 'mclaren-750s' then array[72, 13, 0]
    when 'porsche-911-turbo-s' then array[67, 12, 0]
    when 'porsche-911-gt3-rs' then array[64, 13, 0]
    when 'porsche-taycan-turbo-s' then array[105, 22, 1]
    when 'mercedes-amg-gt' then array[70, 13, 0]
    when 'lamborghini-revuelto' then array[75, 17, 0] end::numeric[]
$$;
