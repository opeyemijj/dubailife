-- Landing no longer depends on the "boarded" call having reached the server (it's sent without waiting, and a
-- dropped one left players stuck on the runway: "That booking isn't open any more"). A flight still open (booked or
-- boarded) can land once it's been in the air long enough: 45 s after boarding, or, when boarding never arrived,
-- 45 s after booking (every journey takes longer than that: the walk to the gate, then the 62 s flight).
-- A booking that was replaced by a newer one (booked again, e.g. in another tab) now says so: 'flight_replaced'.

create or replace function public.flight_progress(p_flight bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if p_status = 'boarded' then
    update flights set status = 'boarded', boarded_at = now() where id = p_flight and user_id = auth.uid() and status = 'booked';
  elsif p_status = 'landed' then
    update flights set status = 'landed', landed_at = now(), boarded_at = coalesce(boarded_at, now())
     where id = p_flight and user_id = auth.uid() and status in ('booked', 'boarded')
       and coalesce(boarded_at, created_at) <= now() - interval '45 seconds';
  else
    raise exception 'bad_status';
  end if;
  if not found then
    select status into st from flights where id = p_flight and user_id = auth.uid();
    if st = 'cancelled' then raise exception 'flight_replaced'; end if;
    -- Landing a flight that already landed (a retry after a dropped reply): fine.
    if st = 'landed' and p_status = 'landed' then return; end if;
    raise exception 'no_flight';
  end if;
end $$;
revoke all on function public.flight_progress(bigint, text) from public, anon;
grant execute on function public.flight_progress(bigint, text) to authenticated;
