-- "While you were away" emails (requirements R8): what other people did for you, bundled, only when you're away.
--
-- Events are queued by triggers (friend requests, new followers, party invites, game invites, live requests,
-- proposals and date asks, move-in asks, direct messages, money received). Every 15 minutes the database sends one
-- bundle to each player who:
--   * has events at least an hour old that they haven't been back since (coming back cancels them),
--   * hasn't been seen for 30 minutes,
--   * hasn't had a bundle in 2 hours, nor 2 emails of any kind today,
--   * isn't in quiet hours (23:00 to 08:00 in their own time zone, which the app records), and
--   * hasn't turned that kind off (email_prefs.digest_off) or unsubscribed.
-- Messages count only if still unread when the bundle goes. Sent through Postmark with the Vault token, like the
-- other emails, logged as campaign 'social_digest'. Off until app_settings 'social_emails' has enabled: true.

insert into public.app_settings (key, value) values ('social_emails', '{"enabled": false}'::jsonb) on conflict (key) do nothing;

alter table public.email_prefs add column if not exists tz text;
alter table public.email_prefs add column if not exists digest_off text[] not null default '{}';

/** The app tells the database the player's time zone (for quiet hours). */
create or replace function public.set_my_timezone(p_tz text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from pg_timezone_names where name = p_tz) then return; end if;
  insert into email_prefs (user_id, tz) values (auth.uid(), p_tz)
    on conflict (user_id) do update set tz = excluded.tz where email_prefs.tz is distinct from excluded.tz;
end $$;
revoke all on function public.set_my_timezone(text) from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated;

/** Which kinds of "while you were away" email I get: the kinds turned off. */
create or replace function public.set_digest_off(p_off text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into email_prefs (user_id, digest_off) values (auth.uid(), coalesce(p_off, '{}'))
    on conflict (user_id) do update set digest_off = excluded.digest_off, updated_at = now();
end $$;
revoke all on function public.set_digest_off(text[]) from public, anon;
grant execute on function public.set_digest_off(text[]) to authenticated;

-- ---------------------------------------------------------------- the queue

create table if not exists public.email_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friend', 'follow', 'invite', 'game', 'live', 'love', 'move_in', 'message', 'money')),
  actor_id uuid references public.profiles (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_events_pending on public.email_events (user_id, created_at) where sent_at is null;
alter table public.email_events enable row level security;

create or replace function public.queue_email_event(p_user uuid, p_kind text, p_actor uuid, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into email_events (user_id, kind, actor_id, data) values (p_user, p_kind, p_actor, coalesce(p_data, '{}'::jsonb));
end $$;
revoke all on function public.queue_email_event(uuid, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.ev_friend() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.status = 'pending' then perform queue_email_event(new.friend_id, 'friend', new.user_id); end if; return new; end $$;
drop trigger if exists ev_friend on public.friendships;
create trigger ev_friend after insert on public.friendships for each row execute function public.ev_friend();

create or replace function public.ev_follow() returns trigger language plpgsql security definer set search_path = public as $$
begin perform queue_email_event(new.followee_id, 'follow', new.follower_id); return new; end $$;
drop trigger if exists ev_follow on public.follows;
create trigger ev_follow after insert on public.follows for each row execute function public.ev_follow();

create or replace function public.ev_invite() returns trigger language plpgsql security definer set search_path = public as $$
declare i invites;
begin
  if new.status <> 'invited' then return new; end if;
  select * into i from invites where id = new.invite_id;
  if i.id is null or coalesce(i.cancelled, false) or coalesce(i.ends_at, i.starts_at + interval '3 hours') < now() then return new; end if;
  perform queue_email_event(new.user_id, 'invite', i.host_id,
    jsonb_build_object('code', i.code, 'title', coalesce(i.title, i.label), 'startsAt', i.starts_at, 'endsAt', i.ends_at));
  return new;
end $$;
drop trigger if exists ev_invite on public.invite_guests;
create trigger ev_invite after insert on public.invite_guests for each row execute function public.ev_invite();

create or replace function public.ev_game() returns trigger language plpgsql security definer set search_path = public as $$
begin perform queue_email_event(new.to_id, 'game', new.from_id, jsonb_build_object('game', new.game)); return new; end $$;
drop trigger if exists ev_game on public.game_invites;
create trigger ev_game after insert on public.game_invites for each row execute function public.ev_game();

create or replace function public.ev_live() returns trigger language plpgsql security definer set search_path = public as $$
begin perform queue_email_event(new.to_id, 'live', new.from_id, jsonb_build_object('kind', new.kind)); return new; end $$;
drop trigger if exists ev_live on public.live_requests;
create trigger ev_live after insert on public.live_requests for each row execute function public.ev_live();

create or replace function public.ev_love() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('propose', 'date') then perform queue_email_event(new.to_id, 'love', new.from_id, jsonb_build_object('kind', new.kind)); end if;
  return new;
end $$;
drop trigger if exists ev_love on public.love_requests;
create trigger ev_love after insert on public.love_requests for each row execute function public.ev_love();

create or replace function public.ev_move_in() returns trigger language plpgsql security definer set search_path = public as $$
begin perform queue_email_event(new.to_id, 'move_in', new.from_id); return new; end $$;
drop trigger if exists ev_move_in on public.move_in_requests;
create trigger ev_move_in after insert on public.move_in_requests for each row execute function public.ev_move_in();

create or replace function public.ev_message() returns trigger language plpgsql security definer set search_path = public as $$
begin perform queue_email_event(new.to_id, 'message', new.from_id, jsonb_build_object('id', new.id)); return new; end $$;
drop trigger if exists ev_message on public.messages;
create trigger ev_message after insert on public.messages for each row execute function public.ev_message();

create or replace function public.ev_money() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.amount >= 100000 then perform queue_email_event(new.to_id, 'money', new.from_id, jsonb_build_object('amount', new.amount)); end if;
  return new;
end $$;
drop trigger if exists ev_money on public.transfers;
create trigger ev_money after insert on public.transfers for each row execute function public.ev_money();

-- ---------------------------------------------------------------- sending

/** One player's bundle lines (plain text, HTML-escaped), newest kinds first, at most 8 lines. */
create or replace function public.digest_lines(p_user uuid, p_ids bigint[]) returns text[]
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.*, coalesce(a.username, 'someone') as who
      from email_events e left join profiles a on a.id = e.actor_id
     where e.id = any (p_ids)
  ),
  lines as (
    select 1 as ord, max(created_at) as at,
           case when count(*) = 1 then '@' || max(who) || ' sent you a friend request'
                else count(*) || ' friend requests, from @' || string_agg(distinct who, ', @') end as line
      from ev where kind = 'friend' having count(*) > 0
    union all
    select 2, max(created_at), '@' || who || ' invited you to "' || coalesce(data ->> 'title', 'a party') || '"'
      from ev where kind = 'invite' group by who, data ->> 'title'
    union all
    select 3, max(created_at), case when kind = 'love' and max(data ->> 'kind') = 'propose' then '@' || who || ' proposed to you'
                                    when kind = 'love' then '@' || who || ' asked you out on a date'
                                    else '@' || who || ' asked to move in with you' end
      from ev where kind in ('love', 'move_in') group by who, kind
    union all
    select 4, max(created_at), case when count(*) = 1 then '1 unread message from @' || who else count(*) || ' unread messages from @' || who end
      from ev e where kind = 'message'
       and exists (select 1 from messages m where m.id::text = e.data ->> 'id' and m.read_at is null)
     group by who
    union all
    select 5, max(created_at), '@' || who || ' sent you AED ' || to_char(sum((data ->> 'amount')::bigint), 'FM999,999,999,999')
      from ev where kind = 'money' group by who
    union all
    select 6, max(created_at), '@' || who || ' wants to play ' || initcap(replace(coalesce(max(data ->> 'game'), 'a game'), '-', ' ')) || ' with you'
      from ev where kind = 'game' group by who
    union all
    select 7, max(created_at), '@' || who || ' wanted to ' || case max(data ->> 'kind') when 'dance' then 'dance with you' when 'table' then 'join your table' else 'join you' end
      from ev where kind = 'live' group by who
    union all
    select 8, max(created_at), case when count(*) = 1 then '@' || max(who) || ' started following you'
                                    else count(*) || ' new followers, including @' || max(who) end
      from ev where kind = 'follow' having count(*) > 0
  )
  select coalesce(array_agg(replace(replace(replace(line, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') order by ord, at desc), '{}')
    from (select * from lines order by ord, at desc limit 8) l
$$;
revoke all on function public.digest_lines(uuid, bigint[]) from public, anon, authenticated;

/** Sends the bundles that are due. Run every 15 minutes by pg_cron. Returns how many went. */
create or replace function public.send_social_digests() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg jsonb := setting('email'); secret text; r record; ids bigint[]; ls text[]; html text; txt text; req bigint;
  base text := 'https://www.mydubailife.app'; n int := 0; token text; who text;
begin
  if not coalesce((setting('social_emails') ->> 'enabled')::boolean, false) then return 0; end if;
  if not pg_try_advisory_xact_lock(hashtext('social_digest')) then return 0; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'postmark_server_token';
  if secret is null then return 0; end if;

  -- Events they've been back since are seen: done with.
  update email_events e set sent_at = now()
    from profiles p where p.id = e.user_id and e.sent_at is null and p.last_seen > e.created_at;

  for r in
    select e.user_id, u.email, p.username, coalesce(p.display_name, p.username) as name, ep.digest_off, ep.tz
      from email_events e
      join profiles p on p.id = e.user_id
      join auth.users u on u.id = e.user_id
      left join email_prefs ep on ep.user_id = e.user_id
     where e.sent_at is null
       and u.email is not null and u.email not ilike '%.test'
       and coalesce(p.last_seen, p.created_at) < now() - interval '30 minutes'
       and (ep.opted_out_at is null)
     group by e.user_id, u.email, p.username, p.display_name, ep.digest_off, ep.tz
    having min(e.created_at) < now() - interval '60 minutes'
     limit 100
  loop
    -- Quiet hours in their own time zone (Dubai until the app has told us theirs).
    if extract(hour from now() at time zone coalesce(r.tz, 'Asia/Dubai')) >= 23
       or extract(hour from now() at time zone coalesce(r.tz, 'Asia/Dubai')) < 8 then continue; end if;
    -- Not more than one bundle every 2 hours, nor 2 emails of any kind today.
    if exists (select 1 from email_campaign_logs l where l.user_id = r.user_id and l.campaign_id = 'social_digest'
                and l.status in ('queued', 'sent') and l.sent_at > now() - interval '2 hours') then continue; end if;
    if (select count(*) from email_campaign_logs l where l.user_id = r.user_id and l.status in ('queued', 'sent')
         and l.sent_at > now() - interval '24 hours') >= 2 then continue; end if;

    select array_agg(id) into ids from email_events
     where user_id = r.user_id and sent_at is null and not (kind = any (coalesce(r.digest_off, '{}')));
    -- Everything pending is dealt with now, sent or turned off.
    update email_events set sent_at = now() where user_id = r.user_id and sent_at is null;
    if ids is null then continue; end if;
    ls := digest_lines(r.user_id, ids);
    if coalesce(array_length(ls, 1), 0) = 0 then continue; end if;

    insert into email_prefs (user_id) values (r.user_id) on conflict (user_id) do nothing;
    select unsub_token into token from email_prefs where user_id = r.user_id;
    who := replace(replace(coalesce(r.name, 'there'), '<', ''), '>', '');
    html := format($h$
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:22px;margin:0 0 8px">While you were away, %s</h1>
  <ul style="font-size:15px;line-height:1.6;color:#334155;padding-left:18px;margin:12px 0">%s</ul>
  <p style="margin:24px 0"><a href="%s/home?utm_source=email&amp;utm_campaign=social_digest" style="background:#059669;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">Open Dubai Life</a></p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px">You get this when people reach out while you're away, at most twice a day. <a href="%s/unsubscribe?t=%s" style="color:#94a3b8">Stop these emails</a> · choose which in Settings.</p>
</div>$h$, who, (select string_agg('<li>' || x || '</li>', '') from unnest(ls) x), base, base, token);
    txt := 'While you were away:' || E'\n' || array_to_string(array(select '- ' || x from unnest(ls) x), E'\n')
           || E'\n\nOpen Dubai Life: ' || base || '/home' || E'\n\nStop these emails: ' || base || '/unsubscribe?t=' || token;

    select net.http_post(
      url := 'https://api.postmarkapp.com/email',
      headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json', 'X-Postmark-Server-Token', secret),
      body := jsonb_build_object(
        'From', cfg ->> 'from', 'To', r.email,
        'Subject', case when array_length(ls, 1) = 1 then replace(replace(replace(ls[1], '&amp;', '&'), '&lt;', '<'), '&gt;', '>')
                        else array_length(ls, 1) || ' things happened while you were away' end,
        'HtmlBody', html, 'TextBody', txt,
        'MessageStream', coalesce(cfg ->> 'stream', 'outbound'), 'Tag', 'social_digest', 'TrackLinks', 'None',
        'Headers', jsonb_build_array(jsonb_build_object('Name', 'List-Unsubscribe', 'Value', '<' || base || '/unsubscribe?t=' || token || '>')))
    ) into req;
    insert into email_campaign_logs (user_id, email, campaign_id, subject, status, provider, provider_message_id, metadata)
      values (r.user_id, r.email, 'social_digest', left(ls[1], 200), 'sent', 'postmark', 'pg_net:' || req, jsonb_build_object('lines', array_length(ls, 1)));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.send_social_digests() from public, anon, authenticated;

/** Who would get a bundle right now and what it would say (the admin's preview). Sends nothing. */
create or replace function public.preview_social_digests() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  perform require_admin();
  select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'lines', digest_lines(g.user_id, g.ids))), '[]'::jsonb) into out
    from (select e.user_id, array_agg(e.id) as ids
            from email_events e join profiles p2 on p2.id = e.user_id
           where e.sent_at is null and coalesce(p2.last_seen, p2.created_at) < e.created_at
           group by e.user_id limit 50) g
    join profiles p on p.id = g.user_id;
  return out;
end $$;
revoke all on function public.preview_social_digests() from public, anon;
grant execute on function public.preview_social_digests() to authenticated;

do $$ begin
  perform cron.unschedule('social-digests');
exception when others then null;
end $$;
select cron.schedule('social-digests', '*/15 * * * *', $$
  select public.send_social_digests();
  delete from public.email_events where created_at < now() - interval '14 days';
$$);
