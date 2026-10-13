-- Business portal support: private ownership documents and basic venue analytics.

-- Ownership proof (trade licences etc.) is private: the uploader and admins only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('claim-docs', 'claim-docs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "upload own claim docs" on storage.objects;
create policy "upload own claim docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'claim-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "read own claim docs" on storage.objects;
create policy "read own claim docs" on storage.objects for select to authenticated
  using (bucket_id = 'claim-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Visits per venue per day.
create table if not exists public.venue_stats (
  venue_key text not null,
  day date not null default current_date,
  visits int not null default 0,
  primary key (venue_key, day)
);
alter table public.venue_stats enable row level security;
drop policy if exists "admins read stats" on public.venue_stats;
create policy "admins read stats" on public.venue_stats for select using (public.is_admin());

create or replace function public.track_venue_visit(p_venue text) returns void
language sql security definer set search_path = public as $$
  insert into venue_stats (venue_key, day, visits) values (left(p_venue, 120), current_date, 1)
  on conflict (venue_key, day) do update set visits = venue_stats.visits + 1;
$$;
grant execute on function public.track_venue_visit(text) to anon, authenticated;

-- Owners see their own venue's numbers.
create or replace function public.venue_analytics(p_venue text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from venue_claims c where c.venue_key = p_venue and c.status = 'verified' and is_business_member(c.business_id)) and not is_admin() then
    raise exception 'not_manager';
  end if;
  return jsonb_build_object(
    'visits_30d', (select coalesce(sum(visits), 0) from venue_stats where venue_key = p_venue and day > current_date - 30),
    'visits_7d', (select coalesce(sum(visits), 0) from venue_stats where venue_key = p_venue and day > current_date - 7),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'visits', visits) order by day), '[]') from venue_stats where venue_key = p_venue and day > current_date - 30)
  );
end $$;
grant execute on function public.venue_analytics(text) to authenticated;

-- A business member can read their venue's draft through the members policy; give the editor a
-- single call that returns draft + publish state.
create or replace function public.get_venue_editor(p_venue text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when can_manage_venue(p_venue) is null then null else
    (select jsonb_build_object('draft', coalesce(vc.draft, '{}'), 'published', vc.published, 'published_at', vc.published_at)
     from (select 1) x left join venue_content vc on vc.venue_key = p_venue) end;
$$;
grant execute on function public.get_venue_editor(text) to authenticated;
