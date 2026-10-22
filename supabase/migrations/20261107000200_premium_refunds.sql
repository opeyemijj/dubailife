-- Refunding a season pass removes the pass; refunding Dubai Plus takes a month off membership.
create or replace function public.admin_refund(p_payment uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare pay payments; coins bigint; bal bigint;
begin
  perform require_admin(array['finance']);
  select * into pay from payments where id = p_payment for update;
  if pay.status <> 'paid' then raise exception 'not_refundable'; end if;
  if pay.purpose = 'coins' then
    coins := (pay.meta ->> 'coins')::bigint + coalesce((pay.meta ->> 'bonus')::bigint, 0);
    select balance into bal from profiles where id = pay.user_id;
    -- Take back what's left of the purchase (they may have spent some).
    perform coin_move(pay.user_id, -least(coins, coalesce(bal, 0)), 'refund', p_note, pay.id::text);
  elsif pay.purpose = 'venue_subscription' then
    update venue_subscriptions set status = 'cancelled' where id = pay.ref::uuid;
  elsif pay.purpose = 'ad_campaign' then
    update ad_campaigns set status = 'cancelled' where id = pay.ref::uuid;
  elsif pay.purpose = 'season_pass' then
    delete from season_passes where user_id = pay.user_id and season_id = pay.ref;
  elsif pay.purpose = 'plus' then
    update plus_members set active_until = active_until - interval '1 month' where user_id = pay.user_id;
  end if;
  update payments set status = 'refunded', refunded_at = now() where id = p_payment;
  perform log_audit('payment.refund', p_payment::text, jsonb_build_object('note', p_note, 'amount', pay.amount_aed));
end $$;
grant execute on function public.admin_refund(uuid, text) to authenticated;
