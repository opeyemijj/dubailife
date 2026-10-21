-- Web Push notification subscriptions and realtime social events

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

drop policy if exists "see own push subscriptions" on public.push_subscriptions;
create policy "see own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "insert own push subscriptions" on public.push_subscriptions;
create policy "insert own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own push subscriptions" on public.push_subscriptions;
create policy "update own push subscriptions" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own push subscriptions" on public.push_subscriptions;
create policy "delete own push subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Ensure friendships are broadcast in realtime so live popups appear instantly
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end $$;

