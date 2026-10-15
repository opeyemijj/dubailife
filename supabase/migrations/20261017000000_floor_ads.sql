-- Floor ads: a mosaic of ad blocks of mixed sizes laid on the ground between the roads on the city map.
-- Each block shows one ad at a time for exactly 7 days, booked like a billboard ad as placement
-- "floor:<block id>". Block ids end in their size (…-w4h3), and blocks are priced per cell.

insert into public.app_settings (key, value) values
  ('floor_ad', '{"slots": 1, "price_aed_per_week": 25, "max_weeks": 1, "rotation_seconds": 6}')
on conflict (key) do update set value = excluded.value;

create or replace function public.create_ad_campaign(p_placement text, p_title text, p_subtitle text, p_link text, p_creative text, p_weeks int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  floor boolean := p_placement ~ '^floor:';
  cfg jsonb := setting(case when p_placement ~ '^floor:' then 'floor_ad' else 'billboard' end);
  price numeric; c uuid; p uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not coalesce((setting('features') ->> 'billboard_ads')::boolean, false) then raise exception 'feature_disabled'; end if;
  if p_placement !~ '^(billboard|floor):[A-Za-z0-9_-]+$' then raise exception 'unknown_placement'; end if;
  if p_weeks < 1 or p_weeks > coalesce((cfg ->> 'max_weeks')::int, 12) then raise exception 'weeks_out_of_range'; end if;
  if p_creative !~ '^https://' then raise exception 'creative_required'; end if;
  if ad_slots_taken(p_placement) >= coalesce((cfg ->> 'slots')::int, 10) then raise exception 'placement_full'; end if;
  -- Floor blocks: the per-cell price × the block's cells (from its id, capped at 8 × 8).
  price := (cfg ->> 'price_aed_per_week')::numeric * p_weeks * case when floor then
    least(coalesce((regexp_match(p_placement, '-w([0-9]+)h[0-9]+$'))[1]::int, 1), 8) * least(coalesce((regexp_match(p_placement, '-w[0-9]+h([0-9]+)$'))[1]::int, 1), 8)
    else 1 end;
  insert into ad_campaigns (placement, owner_id, title, subtitle, link_url, creative_url, weeks, price_aed)
    values (p_placement, auth.uid(), trim(p_title), nullif(trim(p_subtitle), ''), nullif(trim(p_link), ''), p_creative, p_weeks, price)
    returning id into c;
  insert into payments (user_id, purpose, ref, description, amount_aed, meta)
    values (auth.uid(), 'ad_campaign', c::text,
      case when floor then format('Floor ad "%s" — 7 days', trim(p_title))
           else format('Billboard ad "%s" — %s week%s', trim(p_title), p_weeks, case when p_weeks = 1 then '' else 's' end) end,
      price, jsonb_build_object('placement', p_placement))
    returning id into p;
  return jsonb_build_object('campaign', c, 'payment', p);
end $$;
grant execute on function public.create_ad_campaign(text, text, text, text, text, int) to authenticated;
