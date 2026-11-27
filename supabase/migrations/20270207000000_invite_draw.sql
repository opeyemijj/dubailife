-- The invite draw (src/data/social/draw.json, mirrored exactly by draw_config(); checked by
-- scripts/check-life-config.mjs): returning players invite friends on WhatsApp with their link; a friend counts once
-- they signed up with it during the campaign, verified their email and played joinMinutes. Every `target` friends is
-- one entry. Every popup view, WhatsApp tap and link copy is logged (invite_events) so the funnel shows in the admin
-- back office (admin_draw_report), and the winner is picked at random by entries after the draw closes.

create or replace function public.draw_config() returns jsonb
language sql immutable as $$
  select '{"id":"jan-2027","prizeAed":5000,"target":10,"joinMinutes":10,"startsAt":"2026-11-27T00:00:00+04:00","endsAt":"2027-01-31T23:59:59+04:00"}'::jsonb
$$;

-- ---------------------------------------------------------------- what players do with the invite

create table if not exists public.invite_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign text not null,
  kind text not null check (kind in ('view', 'whatsapp', 'copy', 'later')),
  created_at timestamptz not null default now()
);
create index if not exists invite_events_campaign on public.invite_events (campaign, kind, created_at);
create index if not exists invite_events_user on public.invite_events (user_id, campaign);
alter table public.invite_events enable row level security;

/** Logs what I did with the invite (at most one of each kind a minute, so a busy button can't flood it). */
create or replace function public.log_invite_event(p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := draw_config() ->> 'id';
begin
  if me is null or p_kind not in ('view', 'whatsapp', 'copy', 'later') then return; end if;
  if exists (select 1 from invite_events where user_id = me and campaign = c and kind = p_kind and created_at > now() - interval '1 minute') then return; end if;
  insert into invite_events (user_id, campaign, kind) values (me, c, p_kind);
end $$;
revoke all on function public.log_invite_event(text) from public, anon;
grant execute on function public.log_invite_event(text) to authenticated;

-- ---------------------------------------------------------------- who counts

/** The friends who signed up with p_user's link during the campaign, and whether each counts yet (verified email,
    played joinMinutes). */
create or replace function public.draw_friends(p_user uuid)
returns table (invitee_id uuid, joined_at timestamptz, counts boolean)
language sql stable security definer set search_path = public as $$
  select f.invitee_id, f.created_at,
         public.email_verified(f.invitee_id)
           and coalesce(p.last_seen, p.created_at) - p.created_at >= make_interval(mins => (draw_config() ->> 'joinMinutes')::int)
    from referrals f join profiles p on p.id = f.invitee_id
   where f.inviter_id = p_user
     and f.created_at >= (draw_config() ->> 'startsAt')::timestamptz
     and f.created_at <= (draw_config() ->> 'endsAt')::timestamptz
$$;
revoke all on function public.draw_friends(uuid) from public, anon, authenticated;

/** My draw: friends that count, friends still to count (signed up, not yet verified or played enough), my entries. */
create or replace function public.my_draw() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'joined', count(*) filter (where counts),
    'pending', count(*) filter (where not counts),
    'entries', (count(*) filter (where counts)) / (draw_config() ->> 'target')::int,
    'open', now() <= (draw_config() ->> 'endsAt')::timestamptz)
  from draw_friends(auth.uid())
  where auth.uid() is not null
$$;
revoke all on function public.my_draw() from public, anon;
grant execute on function public.my_draw() to authenticated;

-- ---------------------------------------------------------------- the back office

create table if not exists public.draw_winners (
  campaign text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  entries int not null,
  picked_at timestamptz not null default now(),
  picked_by uuid references public.profiles (id) on delete set null
);
alter table public.draw_winners enable row level security;

/** The funnel (views, sharers, sign-ups through links, friends that count, entrants), day by day for the last
    14 days, and the top inviters. Admins only. */
create or replace function public.admin_draw_report(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c text := draw_config() ->> 'id'; s timestamptz := (draw_config() ->> 'startsAt')::timestamptz; e timestamptz := (draw_config() ->> 'endsAt')::timestamptz;
        t int := (draw_config() ->> 'target')::int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    with refs as (
      select f.inviter_id, f.invitee_id, f.created_at,
             public.email_verified(f.invitee_id) and coalesce(p.last_seen, p.created_at) - p.created_at >= make_interval(mins => (draw_config() ->> 'joinMinutes')::int) as counts
        from referrals f join profiles p on p.id = f.invitee_id
       where f.created_at between s and e
    ), per as (
      select inviter_id, count(*) as signups, count(*) filter (where counts) as joined from refs group by inviter_id
    ), ev as (
      select user_id, count(*) filter (where kind = 'view') as views, count(*) filter (where kind = 'whatsapp') as whatsapp, count(*) filter (where kind = 'copy') as copies
        from invite_events where campaign = c group by user_id
    )
    select jsonb_build_object(
      'campaign', c, 'startsAt', s, 'endsAt', e, 'target', t, 'prizeAed', (draw_config() ->> 'prizeAed')::int,
      'totals', jsonb_build_object(
        'viewers', (select count(*) from ev where views > 0),
        'views', (select coalesce(sum(views), 0) from ev),
        'sharers', (select count(*) from ev where whatsapp > 0 or copies > 0),
        'whatsapp', (select coalesce(sum(whatsapp), 0) from ev),
        'copies', (select coalesce(sum(copies), 0) from ev),
        'signups', (select count(*) from refs),
        'joined', (select count(*) from refs where counts),
        'inviters', (select count(*) from per),
        'entrants', (select count(*) from per where joined >= t),
        'entries', (select coalesce(sum(joined / t), 0) from per),
        'players', (select count(*) from profiles),
        'newPlayers', (select count(*) from profiles where created_at between s and e)),
      'daily', coalesce((select jsonb_agg(d order by d ->> 'day' desc) from (
          select jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'),
            'views', (select count(*) from invite_events where campaign = c and kind = 'view' and (created_at at time zone 'Asia/Dubai')::date = day),
            'shares', (select count(*) from invite_events where campaign = c and kind in ('whatsapp', 'copy') and (created_at at time zone 'Asia/Dubai')::date = day),
            'signups', (select count(*) from refs where (created_at at time zone 'Asia/Dubai')::date = day),
            'newPlayers', (select count(*) from profiles where (created_at at time zone 'Asia/Dubai')::date = day)) as d
          from generate_series((now() at time zone 'Asia/Dubai')::date - 13, (now() at time zone 'Asia/Dubai')::date, interval '1 day') as g(day)) x), '[]'::jsonb),
      'top', coalesce((select jsonb_agg(r order by (r ->> 'joined')::int desc, (r ->> 'signups')::int desc) from (
          select jsonb_build_object('userId', p.id, 'username', p.username, 'email', u.email,
            'views', coalesce(ev.views, 0), 'whatsapp', coalesce(ev.whatsapp, 0), 'copies', coalesce(ev.copies, 0),
            'signups', coalesce(per.signups, 0), 'joined', coalesce(per.joined, 0), 'entries', coalesce(per.joined, 0) / t) as r
            from profiles p
            left join per on per.inviter_id = p.id
            left join ev on ev.user_id = p.id
            left join auth.users u on u.id = p.id
           where per.inviter_id is not null or ev.whatsapp > 0 or ev.copies > 0
           order by coalesce(per.joined, 0) desc, coalesce(per.signups, 0) desc, coalesce(ev.whatsapp, 0) desc
           limit greatest(1, least(p_limit, 500))) y), '[]'::jsonb),
      'winner', (select jsonb_build_object('userId', w.user_id, 'username', p.username, 'email', u.email, 'entries', w.entries, 'pickedAt', w.picked_at)
                   from draw_winners w left join profiles p on p.id = w.user_id left join auth.users u on u.id = w.user_id where w.campaign = c)
    )
  );
end $$;
revoke all on function public.admin_draw_report(int) from public, anon;
grant execute on function public.admin_draw_report(int) to authenticated;

/** Picks the winner once the draw has closed: at random, weighted by entries (once only). Admins only. */
create or replace function public.admin_draw_pick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := draw_config() ->> 'id'; s timestamptz := (draw_config() ->> 'startsAt')::timestamptz; e timestamptz := (draw_config() ->> 'endsAt')::timestamptz;
        t int := (draw_config() ->> 'target')::int; w uuid; n int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if now() <= e then raise exception 'draw_still_open'; end if;
  if exists (select 1 from draw_winners where campaign = c) then raise exception 'already_picked'; end if;
  -- One ticket per entry; a random ticket wins. Staff accounts can't win.
  select inviter_id, entries into w, n from (
    select f.inviter_id, (count(*) / t)::int as entries
      from referrals f join profiles p on p.id = f.invitee_id
     where f.created_at between s and e
       and public.email_verified(f.invitee_id)
       and coalesce(p.last_seen, p.created_at) - p.created_at >= make_interval(mins => (draw_config() ->> 'joinMinutes')::int)
       and not public.is_admin(f.inviter_id)
     group by f.inviter_id having count(*) >= t
  ) q, generate_series(1, q.entries) order by random() limit 1;
  if w is null then raise exception 'no_entrants'; end if;
  insert into draw_winners (campaign, user_id, entries, picked_by) values (c, w, n, auth.uid());
  return jsonb_build_object('userId', w, 'entries', n);
end $$;
revoke all on function public.admin_draw_pick() from public, anon;
grant execute on function public.admin_draw_pick() to authenticated;
