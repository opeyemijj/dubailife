"use client";

// Flats and homes: listings, ownership and access, backed by Supabase (see supabase/migrations).

import { supabase } from "@/lib/supabase/client";
import type { OwnedFurniture } from "@/lib/furniture";

export type Access = "public" | "friends" | "invite" | "private";
export type Listing = "none" | "rent" | "sale" | "rent_or_sale";

export interface Flat {
  id: string;
  building_id: string;
  unit: string;
  floor: number | null;
  property_type: string;
  bedrooms: number;
  size_sqft: number;
  view: string | null;
  owner_id: string | null;
  owner_npc: string | null;
  tenant_id: string | null;
  tenant_npc: string | null;
  tenant_until: string | null;
  listing: Listing;
  rent_price: number | null;
  sale_price: number | null;
  access: Access;
}

export interface FlatView extends Flat {
  /** Who lives there, for display: an NPC name or a player's display name. */
  residentName: string | null;
  ownerName: string | null;
  vacant: boolean;
}

const COLUMNS = "id, building_id, unit, floor, property_type, bedrooms, size_sqft, view, owner_id, owner_npc, tenant_id, tenant_npc, tenant_until, listing, rent_price, sale_price, access";

async function withNames(rows: Flat[]): Promise<FlatView[]> {
  const ids = [...new Set(rows.flatMap((f) => [f.owner_id, f.tenant_id]).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase().from("profiles").select("id, display_name").in("id", ids);
    data?.forEach((p) => names.set(p.id, p.display_name));
  }
  return rows.map((f) => {
    const leaseActive = f.tenant_id && f.tenant_until && new Date(f.tenant_until) > new Date();
    const tenant = f.tenant_npc ?? (leaseActive ? names.get(f.tenant_id!) ?? "A resident" : null);
    const owner = f.owner_npc ?? (f.owner_id ? names.get(f.owner_id) ?? "A resident" : null);
    return {
      ...f,
      rent_price: f.rent_price === null ? null : Number(f.rent_price),
      sale_price: f.sale_price === null ? null : Number(f.sale_price),
      residentName: tenant ?? owner,
      ownerName: owner,
      vacant: !tenant && !owner,
    };
  });
}

export async function listFlats(buildingId: string): Promise<FlatView[]> {
  const { data, error } = await supabase().from("flats").select(COLUMNS).eq("building_id", buildingId).order("floor").order("unit");
  if (error) throw error;
  return withNames((data ?? []) as Flat[]);
}

export async function getFlat(flatId: string): Promise<FlatView | null> {
  const { data } = await supabase().from("flats").select(COLUMNS).eq("id", flatId).maybeSingle();
  return data ? (await withNames([data as Flat]))[0] : null;
}

export async function myFlats(userId: string): Promise<FlatView[]> {
  const { data } = await supabase().from("flats").select(COLUMNS).or(`owner_id.eq.${userId},tenant_id.eq.${userId}`);
  return withNames((data ?? []) as Flat[]);
}

/** "Apartment 1201 — Sarah's House", "Villa — Mr Dennis's House", or the unit alone when empty. */
export function flatTitle(f: Pick<FlatView, "unit" | "property_type" | "residentName">) {
  const unit = /^\d/.test(f.unit) ? `Apartment ${f.unit}` : f.unit.startsWith("PH") ? `Penthouse ${f.unit.slice(2)}` : f.property_type;
  return f.residentName ? `${unit} — ${f.residentName}'s House` : unit;
}

const ERRORS: Record<string, string> = {
  insufficient_funds: "You don't have enough D-Coins for this.",
  not_for_sale: "Sorry — this home was just taken off the market (someone may have bought it first).",
  not_for_rent: "Sorry — this home is no longer available to rent (someone may have rented it first).",
  already_rented: "Someone is already renting this home.",
  already_owner: "You already own this home.",
  not_signed_in: "Please log in first.",
  not_allowed: "You don't have permission to do that.",
  not_owner: "Only the owner can do that.",
  user_not_found: "No citizen with that username.",
  rent_price_required: "Enter a monthly rent.",
  sale_price_required: "Enter a sale price.",
};
const explain = (message: string) => ERRORS[message.split(":")[0]] ?? message;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
async function call<T>(fn: string, args: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { ok: false, error: explain(error.message) } : { ok: true, data: data as T };
}

export const buyFlat = (flatId: string) => call<Flat>("buy_flat", { p_flat: flatId });
export const rentFlat = (flatId: string, months: number) => call<Flat>("rent_flat", { p_flat: flatId, p_months: months });
export const listFlat = (flatId: string, listing: Listing, rent: number | null, sale: number | null) => call<Flat>("list_flat", { p_flat: flatId, p_listing: listing, p_rent: rent, p_sale: sale });
export const setAccess = (flatId: string, access: Access) => call<null>("set_flat_access", { p_flat: flatId, p_access: access });
export const addGuest = (flatId: string, username: string, canEdit: boolean) => call<null>("add_flat_guest", { p_flat: flatId, p_username: username, p_can_edit: canEdit });
export const requestEntry = (flatId: string, note?: string) => call<{ id: string; status: "pending" | "approved" | "denied" }>("request_entry", { p_flat: flatId, p_note: note ?? null });
export const respondEntry = (requestId: string, approve: boolean) => call<{ id: string; status: string }>("respond_entry", { p_request: requestId, p_approve: approve });

export async function getInterior(flatId: string): Promise<Result<{ interior: { furniture: OwnedFurniture[] }; can_edit: boolean; reason: string }>> {
  return call("get_flat_interior", { p_flat: flatId });
}
export const saveInterior = (flatId: string, furniture: OwnedFurniture[]) => call<null>("save_flat_interior", { p_flat: flatId, p_interior: { furniture } });

export async function listGuests(flatId: string) {
  const { data } = await supabase().from("flat_guests").select("user_id, can_edit, profiles:user_id (username, display_name)").eq("flat_id", flatId);
  return (data ?? []) as unknown as Array<{ user_id: string; can_edit: boolean; profiles: { username: string; display_name: string } | null }>;
}

export const removeGuest = (flatId: string, userId: string) => supabase().from("flat_guests").delete().eq("flat_id", flatId).eq("user_id", userId);

/** Watches one knock until the resident answers. Returns an unsubscribe function. */
export function watchRequest(requestId: string, onChange: (status: string) => void) {
  const channel = supabase()
    .channel(`entry-${requestId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "entry_requests", filter: `id=eq.${requestId}` }, (payload) => onChange((payload.new as { status: string }).status))
    .subscribe();
  return () => { supabase().removeChannel(channel); };
}

export const ACCESS_LABEL: Record<Access, string> = {
  public: "Open house — anyone can walk in",
  friends: "Friends only",
  invite: "Invited guests only",
  private: "Private — visitors knock and wait",
};

export const flatRoute = (f: Pick<Flat, "building_id" | "unit">) => `/property/${f.building_id}/${encodeURIComponent(f.unit)}`;
