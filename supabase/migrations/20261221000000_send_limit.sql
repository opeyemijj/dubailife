-- Higher sending limits (user, 2026-11-04): AED 50,000,000 a day, up to AED 20,000,000 in one transfer (enough for
-- the dearest home on the map, AED 14.9M). Both now live in app_settings.limits so they can be changed without code.
update app_settings set value = value || '{"max_daily_send": 50000000, "max_per_send": 20000000}'::jsonb where key = 'limits';

-- Sending money: the same as before, with the per-transfer cap read from app_settings.
create or replace function public.send_money(p_to uuid, p_amount bigint, p_note text default null, p_place text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_balance bigint;
  sent bigint;
begin
  if v_from is null then raise exception 'not_signed_in'; end if;
  if p_to is null or p_to = v_from then raise exception 'invalid_recipient'; end if;
  if p_amount is null or p_amount < 1 or p_amount > coalesce((setting('limits') ->> 'max_per_send')::bigint, 20000000) then raise exception 'amount_out_of_range'; end if;
  if exists (select 1 from cases where suspect_id = v_from and status = 'open') then raise exception 'account_frozen'; end if;
  if (select count(*) from transfers where from_id = v_from and created_at > now() - interval '1 minute') >= 30 then raise exception 'too_many_transfers'; end if;
  select coalesce(sum(amount), 0) into sent from transfers where from_id = v_from and created_at > now() - interval '1 day';
  if sent + p_amount > coalesce((setting('limits') ->> 'max_daily_send')::bigint, 50000000) then raise exception 'daily_send_limit'; end if;
  perform 1 from profiles where id in (v_from, p_to) order by id for update;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'recipient_missing'; end if;
  v_balance := coin_move(v_from, -p_amount, 'transfer_out', p_place, p_to::text);
  perform coin_move(p_to, p_amount, 'transfer_in', p_place, v_from::text);
  insert into transfers (from_id, to_id, amount, note, place) values (v_from, p_to, p_amount, nullif(trim(p_note), ''), p_place);
  perform public.screen_transfer(v_from, p_to, p_amount);
  return v_balance;
end $$;
