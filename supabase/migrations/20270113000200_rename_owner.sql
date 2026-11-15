-- The owner's account is renamed @lakuku → @brain, and goes back on the leaderboards (Richest, Big Givers, Top users).
-- Old money-history notes keep the old name (it's a record of what happened).

do $$
declare uid uuid;
begin
  select id into uid from public.profiles where username = 'lakuku';
  if uid is null then return; end if;
  if exists (select 1 from public.profiles where username = 'brain') then raise exception 'brain is taken'; end if;
  update public.profiles set username = 'brain' where id = uid;
  update public.online_now set username = 'brain' where user_id = uid;
  update auth.users set raw_user_meta_data = raw_user_meta_data || '{"username": "brain"}'::jsonb where id = uid;
  update public.invites set title = regexp_replace(title, 'lakuku', 'brain', 'gi') where host_id = uid and title ilike '%lakuku%';
  update public.app_settings set value = jsonb_set(value, '{exclude}', coalesce((value -> 'exclude') - uid::text, '[]'::jsonb))
   where key = 'leaderboards';
end $$;
