-- Player-to-player money. Balances only ever change through set_balance_internal; this moves AED
-- from the caller to another citizen in one transaction and records it for both of them.

create table if not exists public.transfers (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount > 0),
  note text check (char_length(note) <= 140),
  place text check (char_length(place) <= 120),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists transfers_to_idx on public.transfers (to_id, created_at desc);
create index if not exists transfers_from_idx on public.transfers (from_id, created_at desc);
alter table public.transfers enable row level security;

-- Each side can see their own transfers; nobody writes to the table directly.
drop policy if exists "see own transfers" on public.transfers;
create policy "see own transfers" on public.transfers for select using (auth.uid() in (from_id, to_id));

create or replace function public.send_money(p_to uuid, p_amount bigint, p_note text default null, p_place text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_balance bigint;
begin
  if v_from is null then raise exception 'not_signed_in'; end if;
  if p_to is null or p_to = v_from then raise exception 'invalid_recipient'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'amount_out_of_range'; end if;
  -- A brake on runaway clients: at most 30 transfers a minute.
  if (select count(*) from transfers where from_id = v_from and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too_many_transfers';
  end if;
  -- Lock both wallets in a fixed order so two people paying each other can't deadlock.
  perform 1 from profiles where id in (v_from, p_to) order by id for update;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'recipient_missing'; end if;
  v_balance := set_balance_internal(v_from, -p_amount);
  perform set_balance_internal(p_to, p_amount);
  insert into transfers (from_id, to_id, amount, note, place) values (v_from, p_to, p_amount, nullif(trim(p_note), ''), p_place);
  return v_balance;
end $$;
revoke all on function public.send_money(uuid, bigint, text, text) from public, anon;
grant execute on function public.send_money(uuid, bigint, text, text) to authenticated;

-- Recipients hear about money as it lands.
do $$ begin
  alter publication supabase_realtime add table public.transfers;
exception when duplicate_object then null;
end $$;
