-- Every home is for real players. 219 homes were lived in by made-up residents (owner_npc / tenant_npc from the
-- original seed: "Mr Dennis", "Elena Petrova"…), so nobody could rent or buy them. They're now empty and for rent
-- or sale at the prices they already had; any furniture they had stays (a renter moves into a furnished home; a
-- buyer starts empty, as buy_flat already does). The seed generators no longer make residents up, and the check
-- below means a home can only ever be held by a real player (owner_id / tenant_id).

update public.flats
   set owner_npc = null, tenant_npc = null, listing = 'rent_or_sale', access = 'private', updated_at = now()
 where (owner_npc is not null or tenant_npc is not null)
   and owner_id is null and tenant_id is null;

alter table public.flats drop constraint if exists flats_real_residents_only;
alter table public.flats add constraint flats_real_residents_only check (owner_npc is null and tenant_npc is null);
