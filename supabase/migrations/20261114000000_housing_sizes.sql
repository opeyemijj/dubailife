-- 2- and 3-bedroom homes join the Blueprint housing options (mirror of src/data/life/blueprint.json).
create or replace function public.blueprint_price(p_kind text, p_id text) returns int
language sql immutable as $$
  select case p_kind
    when 'housing' then case p_id when 'bed_space' then 800 when 'studio' then 2500 when 'one_bedroom' then 7000 when 'two_bedroom' then 11500 when 'three_bedroom' then 15500 when 'penthouse' then 18000 when 'villa' then 45000 end
    when 'commute' then case p_id when 'metro_card' then 350 when 'economy_rental' then 1500 when 'leased_sedan' then 4500 when 'supercar' then 8000 end
    when 'telecom' then case p_id when 'prepaid' then 75 when 'postpaid_5g' then 450 end
    when 'fitness' then case p_id when 'calisthenics' then 0 when 'gym' then 350 when 'spa' then 1200 end
  end
$$;
