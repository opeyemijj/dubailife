-- Moderation (design spec section 15.1): admins review player reports and can dismiss, warn, mute
-- (no chat for 7 days) or ban. Chat hides phone numbers, emails and links so nobody is pulled off the app.
-- Storage: one row per sanctioned player only.

create table if not exists public.user_sanctions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  muted_until timestamptz,
  warnings int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_sanctions enable row level security;
drop policy if exists "see own sanctions" on public.user_sanctions;
create policy "see own sanctions" on public.user_sanctions for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.is_muted(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_sanctions where user_id = p_user and muted_until > now())
$$;

/** Hides contact details in chat: phone numbers, emails, links and payment handles. */
create or replace function public.mask_contacts(t text) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(t,
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '•••', 'g'),            -- emails
    '(https?://|www\.)\S+|\m[a-z0-9-]+\.(com|net|org|ae|me|io|ly|gg|link|xyz|top|cc)\M\S*', '•••', 'gi'),  -- links
    '\+?\d[\d\s().-]{6,}\d', '•••', 'g')                                       -- phone numbers
$$;

create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if tg_table_name = 'messages' then who := new.from_id; else who := new.user_id; end if;
  if public.is_muted(who) then raise exception 'muted'; end if;
  new.body := public.mask_contacts(new.body);
  return new;
end $$;
drop trigger if exists chat_guard on public.messages;
create trigger chat_guard before insert on public.messages for each row execute function public.chat_guard();
drop trigger if exists chat_guard on public.game_messages;
create trigger chat_guard before insert on public.game_messages for each row execute function public.chat_guard();

/** Reviews a report. p_action: dismiss | warn | mute | ban. Every decision goes in the audit log. */
create or replace function public.admin_review_report(p_report bigint, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = public, auth as $$
declare r reports;
begin
  perform require_admin(array['moderator']);
  select * into r from reports where id = p_report for update;
  if r.id is null then raise exception 'report_missing'; end if;
  if p_action not in ('dismiss', 'warn', 'mute', 'ban') then raise exception 'invalid_action'; end if;
  if p_action <> 'dismiss' and r.target_id is null then raise exception 'player_gone'; end if;
  if p_action = 'warn' then
    insert into user_sanctions (user_id, warnings) values (r.target_id, 1)
      on conflict (user_id) do update set warnings = user_sanctions.warnings + 1, updated_at = now();
  elsif p_action = 'mute' then
    insert into user_sanctions (user_id, muted_until) values (r.target_id, now() + interval '7 days')
      on conflict (user_id) do update set muted_until = now() + interval '7 days', updated_at = now();
  elsif p_action = 'ban' then
    if exists (select 1 from admins where user_id = r.target_id) then raise exception 'cannot_ban_admin'; end if;
    update auth.users set banned_until = 'infinity' where id = r.target_id;
    delete from auth.sessions where user_id = r.target_id;
  end if;
  -- Close every open report about the same player with the same decision.
  update reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, reviewed_at = now()
    where status = 'open' and (id = p_report or (p_action <> 'dismiss' and target_id = r.target_id));
  perform log_audit('report.' || p_action, r.target_id::text, jsonb_build_object('report', p_report, 'reason', r.reason, 'note', p_note));
end $$;
revoke all on function public.admin_review_report(bigint, text, text) from public;
grant execute on function public.admin_review_report(bigint, text, text) to authenticated;
