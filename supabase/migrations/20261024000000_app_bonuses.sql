-- One-time AED bonuses for installing the app and turning on push notifications. Each is paid once per
-- player. The push bonus is only paid once a push subscription for the player is saved on the server.

insert into public.app_settings (key, value) values ('app_bonus', '{"install": 50000, "push": 50000}')
on conflict (key) do nothing;

create table if not exists public.app_bonuses (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('install', 'push')),
  amount bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.app_bonuses enable row level security;
drop policy if exists "own bonuses" on public.app_bonuses;
create policy "own bonuses" on public.app_bonuses for select using (user_id = auth.uid());

/** Pays the bonus if it hasn't been paid yet. Returns the amount paid (0 if already claimed or not earned). */
create or replace function public.claim_app_bonus(p_kind text) returns bigint
language plpgsql security definer set search_path = public as $$
declare amt bigint := coalesce((setting('app_bonus') ->> p_kind)::bigint, 0); me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('install', 'push') or amt <= 0 then return 0; end if;
  if exists (select 1 from app_bonuses where user_id = me and kind = p_kind) then return 0; end if;
  if p_kind = 'push' and not exists (select 1 from push_subscriptions where user_id = me)
     and coalesce(jsonb_array_length((select citizen -> 'push_subscriptions' from profiles where id = me)), 0) = 0 then
    return 0;
  end if;
  insert into app_bonuses (user_id, kind, amount) values (me, p_kind, amt) on conflict do nothing;
  if not found then return 0; end if;
  perform coin_move(me, amt, 'grant', case p_kind when 'push' then 'Bonus: notifications on' else 'Bonus: app installed' end, 'app_bonus:' || p_kind);
  return amt;
end $$;
grant execute on function public.claim_app_bonus(text) to authenticated;

create or replace function public.app_bonus_amounts() returns jsonb
language sql stable security definer set search_path = public as $$ select coalesce(setting('app_bonus'), '{}'::jsonb) $$;
grant execute on function public.app_bonus_amounts() to anon, authenticated;

create or replace function public.my_app_bonuses() returns setof text
language sql stable security definer set search_path = public as $$ select kind from app_bonuses where user_id = auth.uid() $$;
grant execute on function public.my_app_bonuses() to authenticated;
