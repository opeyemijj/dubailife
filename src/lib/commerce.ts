"use client";

// Prices, features and checkout plumbing shared by the wallet, billboards and the business portal.
// Prices live in the database (app_settings) so admins change them without a release; the server
// re-reads them when an order is created, so nothing here is trusted for the amount charged.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getVenue, getPlace } from "@/lib/city/places";

export interface CoinPackage { id: string; coins: number; bonus: number; price_aed: number; tag?: string }
export interface VenuePlan { price_aed: number; interval: string; benefits: string[]; terms: string }
export interface BillboardPlan { slots: number; price_aed_per_week: number; max_weeks: number; rotation_seconds: number }
export interface Features { coin_purchases: boolean; venue_claims: boolean; billboard_ads: boolean; gifts: boolean; creator_payouts: boolean }
export interface Settings { coin_packages: CoinPackage[]; venue_subscription: VenuePlan; billboard: BillboardPlan; features: Features }

let cached: Promise<Settings> | null = null;
function loadSettings(): Promise<Settings> {
  cached ??= Promise.resolve(supabase().from("app_settings").select("key, value")).then(({ data }) => Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as unknown as Settings);
  return cached;
}

/** Live prices and feature switches (null while loading). */
export function useSettings(): Settings | null {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { loadSettings().then(setS); }, []);
  return s;
}

export const formatAED = (n: number) => `AED ${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** "dubai-mall/zara" → "Zara · The Dubai Mall". */
export function venueName(key: string) {
  const [placeId, venueId] = key.split("/");
  const v = getVenue(placeId, venueId);
  const p = getPlace(placeId);
  if (!v) return key;
  return p && p.venues.length > 1 ? `${v.name} · ${p.name}` : v.name;
}

/** Turns a database refusal into something a person can act on. */
export function commerceError(message: string) {
  const known: Record<string, string> = {
    not_signed_in: "Please log in first.",
    feature_disabled: "This isn't available right now.",
    placement_full: "All ad slots on this billboard are taken. Try another billboard.",
    already_claimed: "This venue has already been claimed by a verified business.",
    claim_pending: "You already have a claim waiting for review for this venue.",
    claim_required: "Submit a claim for this venue first.",
    not_member: "You're not part of that business account.",
    weeks_out_of_range: "Choose a shorter campaign.",
    creative_required: "Upload your ad image first.",
    not_manager: "Your venue plan needs to be verified and active to edit this venue.",
  };
  const code = Object.keys(known).find((k) => message.includes(k));
  return code ? known[code] : "Something went wrong. Please try again.";
}

/** Uploads an image to a public bucket under the user's folder; returns its public URL. */
export async function uploadImage(bucket: "ad-creatives" | "venue-media", file: File): Promise<{ url: string } | { error: string }> {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return { error: "Use a PNG, JPG, WebP or GIF image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images must be 5 MB or smaller." };
  const db = supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Please log in first." };
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "Upload failed. Please try again." };
  return { url: db.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
