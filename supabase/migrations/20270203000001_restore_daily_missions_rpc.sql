-- The first Big Missions migration reused the name my_missions() and replaced the daily missions RPC, which broke
-- the map rail and Daily Vault. Big Missions now uses my_big_missions(); this puts the daily one back exactly as it was
-- (20261128000000_missions.sql). Harmless if the old version never ran.

create or replace function public.my_missions() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); d int := public.life_day(now()); picks text[]; out jsonb := '[]'::jsonb; m text; all_done boolean := true; done boolean;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  picks := public.mission_picks(me, d);
  foreach m in array picks loop
    done := public.mission_done(me, m, d);
    all_done := all_done and done;
    out := out || jsonb_build_object('id', m, 'done', done, 'claimed', exists (select 1 from mission_claims where user_id = me and day = d and mission = m));
  end loop;
  return jsonb_build_object('day', d, 'missions', out,
    'box', jsonb_build_object('ready', all_done, 'claimed', exists (select 1 from mission_claims where user_id = me and day = d and mission = 'box'),
      'aed', (select amount from mission_claims where user_id = me and day = d and mission = 'box')),
    'nextAt', to_timestamp((d + 1) * 86400 + 5 * 3600));
end $$;
grant execute on function public.my_missions() to authenticated;

