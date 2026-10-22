-- Winners' ID documents are deleted once the prize is paid: admins may remove claim-docs files, and the
-- 'paid' decision clears the stored reference.
drop policy if exists "admins delete claim docs" on storage.objects;
create policy "admins delete claim docs" on storage.objects for delete using (bucket_id = 'claim-docs' and public.is_admin());

create or replace function public.admin_tournament_decide(p_month text, p_action text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare w tournament_winners; nxt uuid;
begin
  perform require_admin(array['finance']);
  select * into w from tournament_winners where month = p_month for update;
  if w.month is null then raise exception 'no_month'; end if;
  if p_action = 'verify' then
    update tournament_winners set status = 'verified', review_note = p_note, reviewed_by = auth.uid(), updated_at = now() where month = p_month;
  elsif p_action = 'paid' then
    if w.status <> 'verified' then raise exception 'verify_first'; end if;
    update tournament_winners set status = 'paid', id_document_ref = null, review_note = coalesce(p_note, review_note), reviewed_by = auth.uid(), updated_at = now() where month = p_month;
  elsif p_action = 'disqualify' then
    select r.user_id into nxt from tournament_results r
      where r.month = p_month and r.flags = '[]'::jsonb and r.user_id <> w.user_id
        and not exists (select 1 from jsonb_array_elements(w.disqualified) d where (d ->> 'user_id')::uuid = r.user_id)
        and r.rank > coalesce((select rank from tournament_results where month = p_month and user_id = w.user_id), 0)
      order by r.rank limit 1;
    update tournament_winners set disqualified = disqualified || jsonb_build_array(jsonb_build_object('user_id', w.user_id, 'reason', p_note)),
      user_id = nxt, status = case when nxt is null then 'no_winner' else 'awaiting_details' end,
      full_name = null, country = null, payout_details = null, id_document_ref = null, review_note = p_note, reviewed_by = auth.uid(), updated_at = now()
    where month = p_month;
  else raise exception 'invalid_action'; end if;
  perform log_audit('tournament.' || p_action, p_month, jsonb_build_object('winner', w.user_id, 'note', p_note));
end $$;
grant execute on function public.admin_tournament_decide(text, text, text) to authenticated;
