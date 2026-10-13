-- One-to-one chat between citizens, kept for a week.

create table if not exists public.messages (
  -- Chosen by the sender's app, so the live copy and the saved copy share one id.
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  -- Where it was said (a venue or home), for context.
  place text check (char_length(place) <= 120),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists messages_pair_idx on public.messages (least(from_id, to_id), greatest(from_id, to_id), created_at desc);
create index if not exists messages_to_idx on public.messages (to_id, created_at desc);
create index if not exists messages_created_idx on public.messages (created_at);
alter table public.messages enable row level security;

-- Only the two people in a conversation can read it, and only for a week (even before the purge runs).
drop policy if exists "read own messages" on public.messages;
create policy "read own messages" on public.messages for select
  using (auth.uid() in (from_id, to_id) and created_at > now() - interval '7 days');

-- You can only send as yourself, and only with the current time.
drop policy if exists "send messages" on public.messages;
create policy "send messages" on public.messages for insert
  with check (from_id = auth.uid() and created_at > now() - interval '1 minute' and created_at < now() + interval '1 minute');

-- Either side may delete a message from the conversation.
drop policy if exists "delete own messages" on public.messages;
create policy "delete own messages" on public.messages for delete using (auth.uid() in (from_id, to_id));

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- Delete anything older than a week, every hour.
create extension if not exists pg_cron;
select cron.unschedule('purge-old-messages') where exists (select 1 from cron.job where jobname = 'purge-old-messages');
select cron.schedule('purge-old-messages', '0 * * * *', $$delete from public.messages where created_at < now() - interval '7 days'$$);
