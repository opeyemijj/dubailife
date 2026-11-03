-- Party lights: the host can turn the lights out (the room goes dark and the decorations glow) for everyone there,
-- including people who arrive after. party_here now says whether they're out.

alter table public.invites add column if not exists lights_out boolean not null default false;

create or replace function public.party_lights(p_code text, p_out boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set lights_out = p_out
    where code = upper(trim(p_code)) and host_id = auth.uid() and not cancelled and starts_at <= now() and ends_at > now();
  if not found then raise exception 'not_your_party'; end if;
end $$;
grant execute on function public.party_lights(text, boolean) to authenticated;

create or replace function public.party_here(p_route text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'decor', to_jsonb(i.decor), 'endsAt', i.ends_at,
    'host', (select username from profiles where id = i.host_id), 'isHost', i.host_id = auth.uid(), 'lightsOut', i.lights_out,
    'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null))
  from invites i
  where i.route = p_route and not i.cancelled and i.kind in ('house_party', 'dinner', 'club_night') and i.starts_at <= now() and i.ends_at > now()
  order by i.starts_at desc limit 1
$$;
grant execute on function public.party_here(text) to anon, authenticated;
