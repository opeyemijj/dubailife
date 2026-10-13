-- Admins see every account, including sign-ups that never finished onboarding (no citizen yet).
drop function if exists public.admin_list_citizens(text, int);
create or replace function public.admin_list_citizens(p_query text default null, p_limit int default 100)
returns table (id uuid, username text, display_name text, email text, balance bigint, created_at timestamptz, last_sign_in_at timestamptz, finished boolean, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin();
  return query
    select au.id, p.username, coalesce(p.display_name, au.raw_user_meta_data ->> 'display_name'), au.email::text, coalesce(p.balance, 0)::bigint,
           au.created_at, au.last_sign_in_at, p.id is not null, exists (select 1 from admins a where a.user_id = au.id)
    from auth.users au left join profiles p on p.id = au.id
    where p_query is null or p_query = ''
       or p.username ilike '%' || p_query || '%' or p.display_name ilike '%' || p_query || '%' or au.email ilike '%' || p_query || '%'
    order by au.created_at desc
    limit least(coalesce(p_limit, 100), 500);
end $$;
grant execute on function public.admin_list_citizens(text, int) to authenticated;
