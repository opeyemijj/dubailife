-- Visas for flying to another country (src/data/flights/visas.json). You live in the UAE, so Dubai and Abu Dhabi need
-- none; to fly to Doha you need a Qatar visa first:
--   - apply_visa: pick the visa, say why you're going and where you'll stay, pay the fee; it's under review;
--   - my_visa: your visa for a country; after the review time an application is approved (with its e-visa number)
--     and valid for its days;
--   - book_flight refuses a flight to a country you have no valid visa for.
-- Fees, validity and the review time are mirrored in visas.json and checked by scripts/check-life-config.mjs.

create or replace function public.visa_rule(p_country text, p_kind text) returns jsonb
language sql immutable as $$
  select case p_country
    when 'qatar' then case p_kind
      when 'tourist' then '{"fee": 100, "days": 30, "review": 60}'::jsonb
      when 'multiple' then '{"fee": 1500, "days": 365, "review": 60}'::jsonb
    end
  end
$$;

/** The country whose visa a city needs (null: none, the UAE is home). */
create or replace function public.visa_country(p_city text) returns text
language sql immutable as $$ select case p_city when 'doha' then 'qatar' end $$;

create table if not exists public.visas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  kind text not null,
  fee bigint not null,
  purpose text not null,
  stay text not null,
  status text not null default 'review' check (status in ('review', 'approved')),
  number text,
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  valid_until timestamptz
);
create index if not exists visas_user on public.visas (user_id, country, id desc);
alter table public.visas enable row level security;
drop policy if exists "own visas" on public.visas;
create policy "own visas" on public.visas for select using (user_id = auth.uid());

/** Approves what's done its review (approval when it's next looked at), and returns my current visa for a country. */
create or replace function public.my_visa(p_country text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v visas; rule jsonb;
begin
  if me is null then return null; end if;
  select * into v from visas where user_id = me and country = p_country and (status = 'review' or valid_until > now()) order by id desc limit 1;
  if not found then return null; end if;
  rule := visa_rule(v.country, v.kind);
  if v.status = 'review' and now() >= v.applied_at + make_interval(secs => (rule ->> 'review')::int) then
    update visas set status = 'approved', decided_at = now(), valid_until = now() + make_interval(days => (rule ->> 'days')::int),
      number = upper(left(p_country, 2)) || '-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 1000000))::int::text, 6, '0')
     where id = v.id returning * into v;
  end if;
  return jsonb_build_object('id', v.id, 'country', v.country, 'kind', v.kind, 'status', v.status, 'number', v.number, 'purpose', v.purpose, 'stay', v.stay,
    'applied_at', v.applied_at, 'ready_at', v.applied_at + make_interval(secs => (rule ->> 'review')::int), 'valid_until', v.valid_until);
end $$;
revoke all on function public.my_visa(text) from public, anon;
grant execute on function public.my_visa(text) to authenticated;

/** Applies for a visa and pays for it. One at a time per country (an application under review, or a valid visa). */
create or replace function public.apply_visa(p_country text, p_kind text, p_purpose text, p_stay text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rule jsonb := visa_rule(p_country, p_kind); vid bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if rule is null then raise exception 'bad_visa'; end if;
  if coalesce(length(trim(p_purpose)), 0) < 3 or coalesce(length(trim(p_stay)), 0) < 3 then raise exception 'incomplete'; end if;
  if exists (select 1 from visas where user_id = me and country = p_country and (status = 'review' or valid_until > now())) then raise exception 'already_have'; end if;
  insert into visas (user_id, country, kind, fee, purpose, stay) values (me, p_country, p_kind, (rule ->> 'fee')::bigint, left(trim(p_purpose), 80), left(trim(p_stay), 120)) returning id into vid;
  perform coin_move(me, -((rule ->> 'fee')::bigint), 'spend', 'Visa: ' || initcap(p_country) || ' ' || p_kind, 'visa:' || vid);
  return my_visa(p_country);
end $$;
revoke all on function public.apply_visa(text, text, text, text) from public, anon;
grant execute on function public.apply_visa(text, text, text, text) to authenticated;

/** A valid (approved, unexpired) visa for this country? */
create or replace function public.has_visa(p_user uuid, p_country text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from visas where user_id = p_user and country = p_country and status = 'approved' and valid_until > now())
$$;
revoke all on function public.has_visa(uuid, text) from public, anon, authenticated;

/** Books a seat and pays for it, from the city you're in, with a visa for where you're going. */
create or replace function public.book_flight(p_from text, p_to text, p_class text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fare bigint := flight_fare(p_from, p_to, p_class); fid bigint; seat text; need text := visa_country(p_to);
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if fare is null then raise exception 'bad_route'; end if;
  if p_from <> player_city(me) then raise exception 'wrong_city'; end if;
  if need is not null then
    perform my_visa(need); -- an application whose review is done is approved now
    if not has_visa(me, need) then raise exception 'visa_required'; end if;
  end if;
  update flights set status = 'cancelled' where user_id = me and status in ('booked', 'boarded');
  seat := case p_class
    when 'first' then (1 + floor(random() * 3))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    when 'business' then (6 + floor(random() * 8))::int || (array['A','D','G','K'])[1 + floor(random() * 4)::int]
    else (20 + floor(random() * 40))::int || (array['A','B','C','D','E','F','G','H','K'])[1 + floor(random() * 9)::int] end;
  insert into flights (user_id, from_city, to_city, class, fare, seat) values (me, p_from, p_to, p_class, fare, seat) returning id into fid;
  perform coin_move(me, -fare, 'spend', 'Flight: Dubai Life Airways, ' || initcap(replace(p_from, '-', ' ')) || ' to ' || initcap(replace(p_to, '-', ' ')) || ' (' || p_class || ')', 'flight:' || fid);
  return jsonb_build_object('id', fid, 'seat', seat, 'fare', fare, 'class', p_class, 'from', p_from, 'to', p_to);
end $$;
revoke all on function public.book_flight(text, text, text) from public, anon;
grant execute on function public.book_flight(text, text, text) to authenticated;
