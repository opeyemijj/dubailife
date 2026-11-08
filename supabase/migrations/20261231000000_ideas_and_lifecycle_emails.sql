-- Migration: Dual-direction Idea voting and Automated Lifecycle Email logs

-- 1. Dual-direction Idea Votes (Upvote = 1, Downvote = -1)
alter table public.idea_votes add column if not exists direction smallint not null default 1 check (direction in (1, -1));

-- Function to cast or toggle an upvote/downvote
create or replace function public.vote_idea(p_idea uuid, p_direction int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cur int;
  v_new_dir int;
  v_net_score int;
  v_user_vote int := 0;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_direction not in (1, -1) then raise exception 'invalid_direction'; end if;

  select direction into v_cur from public.idea_votes where idea_id = p_idea and user_id = v_uid;

  if v_cur is null then
    -- New vote
    insert into public.idea_votes (idea_id, user_id, direction) values (p_idea, v_uid, p_direction::smallint);
    v_user_vote := p_direction;
  elsif v_cur = p_direction then
    -- Toggling same direction off
    delete from public.idea_votes where idea_id = p_idea and user_id = v_uid;
    v_user_vote := 0;
  else
    -- Switching direction (e.g. from -1 to 1)
    update public.idea_votes set direction = p_direction::smallint where idea_id = p_idea and user_id = v_uid;
    v_user_vote := p_direction;
  end if;

  -- Recalculate net votes score
  select coalesce(sum(direction), 0) into v_net_score from public.idea_votes where idea_id = p_idea;
  update public.ideas set votes = v_net_score, updated_at = now() where id = p_idea;

  return jsonb_build_object('votes', v_net_score, 'user_vote', v_user_vote);
end $$;
grant execute on function public.vote_idea(uuid, int) to authenticated;

-- Function to list community ideas with author details and current user vote
create or replace function public.list_community_ideas(
  p_category text default null,
  p_status text default null,
  p_sort text default 'top',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  body text,
  category text,
  status text,
  team_note text,
  votes int,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_display_name text,
  user_vote int
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
    select
      i.id,
      i.title,
      i.body,
      i.category,
      i.status,
      i.team_note,
      i.votes,
      i.created_at,
      i.author_id,
      p.username as author_username,
      coalesce(p.display_name, p.username) as author_display_name,
      coalesce((select iv.direction from public.idea_votes iv where iv.idea_id = i.id and iv.user_id = v_uid), 0)::int as user_vote
    from public.ideas i
    join public.profiles p on p.id = i.author_id
    where (not i.hidden or i.author_id = v_uid or public.is_admin())
      and (p_category is null or p_category = '' or p_category = 'all' or i.category = p_category)
      and (p_status is null or p_status = '' or p_status = 'all' or i.status = p_status)
    order by
      case when p_sort = 'top' then i.votes end desc nulls last,
      case when p_sort = 'newest' then i.created_at end desc nulls last,
      case when p_sort = 'oldest' then i.created_at end asc nulls last,
      i.created_at desc
    limit least(coalesce(p_limit, 50), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end $$;
grant execute on function public.list_community_ideas(text, text, text, int, int) to public, anon, authenticated;

-- 2. Email Campaign Logs Table (Tracks automated retention & drip sends)
create table if not exists public.email_campaign_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null,
  campaign text not null,
  status text not null default 'sent',
  error text,
  metadata jsonb default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  constraint unq_user_campaign unique (user_id, campaign)
);

create index if not exists idx_email_logs_sent on public.email_campaign_logs (sent_at desc);
create index if not exists idx_email_logs_campaign on public.email_campaign_logs (campaign, sent_at desc);

alter table public.email_campaign_logs enable row level security;
drop policy if exists "admins read email logs" on public.email_campaign_logs;
create policy "admins read email logs" on public.email_campaign_logs for select using (public.is_admin());
drop policy if exists "admins write email logs" on public.email_campaign_logs;
create policy "admins write email logs" on public.email_campaign_logs for all using (public.is_admin());

-- 3. Default Email Campaigns Setting in app_settings
insert into public.app_settings (key, value) values ('email_campaigns', jsonb_build_object(
  'provider', 'resend',
  'api_key', '',
  'from_name', 'Dubai Life',
  'from_email', 'noreply@mydubailife.app',
  'reply_to', 'support@mydubailife.app',
  'signup_abandoned', jsonb_build_object('enabled', true, 'subject', 'Your keys are at reception! 🔑 Complete your Dubai avatar', 'delay_hours', 2),
  'inactive_3d', jsonb_build_object('enabled', true, 'subject', 'Your Dubai 09:00 GST Settlement 🏙️ — Check your Blueprint', 'delay_days', 3),
  'inactive_7d', jsonb_build_object('enabled', true, 'subject', 'A gift in your Dubai apartment: +AED 2,500 waiting on your desk 🎁', 'delay_days', 7, 'bonus_aed', 2500),
  'drip_day_1', jsonb_build_object('enabled', true, 'subject', 'Welcome to Dubai Life: 3 things to do on your first day 🏙️'),
  'drip_day_4', jsonb_build_object('enabled', true, 'subject', 'Yacht Parties, VIP Clubs & Live Audio Spaces with Friends 🛥️'),
  'drip_day_7', jsonb_build_object('enabled', true, 'subject', 'AED 50,000 Friday Night Marathon & Live Tournaments 🏃'),
  'drip_day_10', jsonb_build_object('enabled', true, 'subject', 'From Driving School to Yacht Charters: Building a Dubai Empire 💼'),
  'drip_day_14', jsonb_build_object('enabled', true, 'subject', 'The Golden Visa: Upgrading to a Palm Jumeirah Signature Villa 🌴')
))
on conflict (key) do nothing;
