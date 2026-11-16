-- "Available to chat" instead of "online": the players in the game right now who are happy to chat. Everyone is
-- available unless they switch it off (not everybody wants to chat); the list and profiles respect that.

alter table public.profiles add column if not exists chat_off boolean not null default false;

/** Show me as available to chat, or not. */
create or replace function public.set_available_to_chat(p_on boolean) returns void
language sql security definer set search_path = public as $$
  update profiles set chat_off = not coalesce(p_on, true) where id = auth.uid()
$$;
revoke all on function public.set_available_to_chat(boolean) from public, anon;
grant execute on function public.set_available_to_chat(boolean) to authenticated;

/** Available to chat: in the game right now (the last 2 minutes) and not switched off; not me, nobody I've blocked
    or who blocked me. Friends first, then the most recently active. */
create or replace function public.online_players(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'look', p.citizen -> 'look', 'placeId', o.place_id,
             'friend', friend_status(auth.uid(), p.id)) as x
      from online_now o join profiles p on p.id = o.user_id
     where o.seen_at > now() - interval '2 minutes' and not p.chat_off
       and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       and not exists (select 1 from user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
     order by (friend_status(auth.uid(), p.id) = 'friends') desc nulls last, o.seen_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100))) t
$$;
revoke all on function public.online_players(int) from public, anon;
grant execute on function public.online_players(int) to authenticated;

/** Am I available to chat? */
create or replace function public.my_available_to_chat() returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce((select chat_off from profiles where id = auth.uid()), false)
$$;
revoke all on function public.my_available_to_chat() from public, anon;
grant execute on function public.my_available_to_chat() to authenticated;
