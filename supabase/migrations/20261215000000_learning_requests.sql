-- Players ask for the books and courses they want added. Each request is kept (who, what, why); the most requested
-- show to everyone so they can back one instead of asking again. Only through these functions.

create table if not exists public.learning_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('book', 'course')),
  title text not null check (char_length(title) between 2 and 120),
  note text check (note is null or char_length(note) <= 500),
  institution text check (institution is null or char_length(institution) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists learning_requests_title on public.learning_requests (kind, lower(title));
alter table public.learning_requests enable row level security;

create or replace function public.request_learning(p_kind text, p_title text, p_note text default null, p_institution text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('book', 'course') then raise exception 'bad_kind'; end if;
  if char_length(t) < 2 or char_length(t) > 120 then raise exception 'bad_title'; end if;
  if (select count(*) from learning_requests where user_id = me and created_at > now() - interval '1 day') >= 10 then raise exception 'too_many_requests'; end if;
  -- Asking for the same thing twice counts once.
  if exists (select 1 from learning_requests where user_id = me and kind = p_kind and lower(title) = lower(t)) then return; end if;
  insert into learning_requests (user_id, kind, title, note, institution)
    values (me, p_kind, t, nullif(left(trim(coalesce(p_note, '')), 500), ''), nullif(left(trim(coalesce(p_institution, '')), 40), ''));
end $$;
revoke execute on function public.request_learning(text, text, text, text) from public, anon;
grant execute on function public.request_learning(text, text, text, text) to authenticated;

-- What players are asking for most (last 90 days), and whether I've asked for it.
create or replace function public.top_learning_requests() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by r.n desc, r.title), '[]'::jsonb) from (
    select kind, min(title) as title, count(*)::int as n, bool_or(user_id = auth.uid()) as mine
    from learning_requests where created_at > now() - interval '90 days'
    group by kind, lower(title) order by count(*) desc, min(title) limit 12
  ) r
$$;
grant execute on function public.top_learning_requests() to authenticated;
