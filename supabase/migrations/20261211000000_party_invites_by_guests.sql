-- Anyone at a party can bring people: guests who are going (or have arrived) can invite players by username, not
-- only the host. The invited player gets a notification and it's in their Invites app, as before.

create or replace function public.invite_player(p_code text, p_username text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i invites; who uuid; me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into i from invites where code = upper(trim(p_code));
  if i.id is null then raise exception 'not_found'; end if;
  if i.host_id <> me and not exists (select 1 from invite_guests where invite_id = i.id and user_id = me and status = 'going') then
    raise exception 'not_at_party';
  end if;
  if i.kind not in ('house_party', 'dinner', 'club_night') or i.cancelled or i.ends_at < now() then raise exception 'ended'; end if;
  select id into who from profiles where username = lower(trim(both '@' from trim(p_username)));
  if who is null then raise exception 'no_such_player'; end if;
  if who = i.host_id or who = me then raise exception 'your_party'; end if;
  if (select count(*) from invite_guests where invite_id = i.id) >= i.max_guests * 3 then raise exception 'full'; end if;
  insert into invite_guests (invite_id, user_id, status) values (i.id, who, 'invited') on conflict do nothing;
  return case when found then who end;
end $$;
grant execute on function public.invite_player(text, text) to authenticated;

-- The Invites app (and the "back to the party" button) can take you straight there: each row says where it is.
create or replace function public.my_invites() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'hosting', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'route', i.route, 'startsAt', i.starts_at, 'endsAt', i.ends_at,
        'going', (select count(*) from invite_guests g where g.invite_id = i.id and g.status = 'going'),
        'arrived', (select count(*) from invite_guests g where g.invite_id = i.id and g.arrived_at is not null)) order by i.starts_at)
      from invites i where i.host_id = auth.uid() and not i.cancelled and i.ends_at > now()), '[]'::jsonb),
    'invited', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'kind', i.kind, 'title', i.title, 'label', i.label, 'route', i.route, 'startsAt', i.starts_at, 'endsAt', i.ends_at,
        'status', g.status, 'host', (select username from profiles where id = i.host_id)) order by i.starts_at)
      from invite_guests g join invites i on i.id = g.invite_id
      where g.user_id = auth.uid() and g.status <> 'no' and not i.cancelled and i.ends_at > now()), '[]'::jsonb))
$$;
grant execute on function public.my_invites() to authenticated;
