-- Zero-limit money transfers (user, 2026-11-07): players can send any amount of money without per-transfer, daily, or balance restrictions (even 50,000,000,000).
update app_settings
set value = (value - 'max_daily_send' - 'max_per_send') || '{"max_daily_send": null, "max_per_send": null}'::jsonb
where key = 'limits';

create or replace function public.send_money(p_to uuid, p_amount bigint, p_note text default null, p_place text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_balance bigint;
  v_from_bal bigint;
begin
  if v_from is null then raise exception 'not_signed_in'; end if;
  if p_to is null or p_to = v_from then raise exception 'invalid_recipient'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'amount_out_of_range'; end if;
  perform 1 from profiles where id in (v_from, p_to) order by id for update;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'recipient_missing'; end if;

  -- Unlimited sending: auto top-up sender if their balance is lower than the transfer amount
  select balance into v_from_bal from profiles where id = v_from;
  if coalesce(v_from_bal, 0) < p_amount then
    perform coin_move(v_from, p_amount - coalesce(v_from_bal, 0), 'grant', 'Unlimited send grant', 'unlimited_transfer');
  end if;

  v_balance := coin_move(v_from, -p_amount, 'transfer_out', p_place, p_to::text);
  perform coin_move(p_to, p_amount, 'transfer_in', p_place, v_from::text);
  insert into transfers (from_id, to_id, amount, note, place) values (v_from, p_to, p_amount, nullif(trim(p_note), ''), p_place);
  return v_balance;
end $$;

