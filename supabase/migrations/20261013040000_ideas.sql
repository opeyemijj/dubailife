-- Community ideas: citizens suggest improvements, vote on each other's, and see what the team does
-- with them.

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 4 and 100),
  body text check (char_length(body) <= 1500),
  category text not null default 'general' check (category in ('general', 'places', 'avatars', 'social', 'economy', 'bugs')),
  status text not null default 'open' check (status in ('open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  team_note text check (char_length(team_note) <= 600),
  votes int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ideas_rank_idx on public.ideas (hidden, votes desc, created_at desc);

create table if not exists public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;

drop policy if exists "ideas are public" on public.ideas;
create policy "ideas are public" on public.ideas for select using (not hidden or author_id = auth.uid() or public.is_admin());
drop policy if exists "see own votes" on public.idea_votes;
create policy "see own votes" on public.idea_votes for select using (user_id = auth.uid());

create or replace function public.post_idea(p_title text, p_body text, p_category text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i uuid;
begin
  if auth.uid() is null or not exists (select 1 from profiles where id = auth.uid()) then raise exception 'not_signed_in'; end if;
  if (select count(*) from ideas where author_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too_many_ideas'; end if;
  insert into ideas (author_id, title, body, category) values (auth.uid(), trim(p_title), nullif(trim(p_body), ''), coalesce(p_category, 'general')) returning id into i;
  insert into idea_votes (idea_id, user_id) values (i, auth.uid());
  update ideas set votes = 1 where id = i;
  return i;
end $$;
grant execute on function public.post_idea(text, text, text) to authenticated;

-- One vote per citizen per idea; calling again removes it. Returns the new count.
create or replace function public.toggle_idea_vote(p_idea uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from idea_votes where idea_id = p_idea and user_id = auth.uid()) then
    delete from idea_votes where idea_id = p_idea and user_id = auth.uid();
  else
    insert into idea_votes (idea_id, user_id) values (p_idea, auth.uid());
  end if;
  select count(*) into n from idea_votes where idea_id = p_idea;
  update ideas set votes = n where id = p_idea;
  return n;
end $$;
grant execute on function public.toggle_idea_vote(uuid) to authenticated;

create or replace function public.admin_update_idea(p_idea uuid, p_status text, p_note text, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin(array['moderator']);
  update ideas set status = coalesce(p_status, status), team_note = p_note, hidden = coalesce(p_hidden, hidden), updated_at = now() where id = p_idea;
  perform log_audit('idea.update', p_idea::text, jsonb_build_object('status', p_status, 'hidden', p_hidden));
end $$;
grant execute on function public.admin_update_idea(uuid, text, text, boolean) to authenticated;
