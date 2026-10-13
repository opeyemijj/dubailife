"use client";

// What a venue's verified owner publishes (through the business portal) and how it changes the
// venue in the game: their description, hours and links, a promotion shown while the venue loads,
// offers, and their own menu items alongside the venue's standard range.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Product, StationKind, Venue } from "@/lib/city/types";

export interface VenueContent {
  tagline?: string;
  description?: string;
  hours?: string;
  phone?: string;
  website?: string;
  /** External booking or enquiry page (we never claim a booking is confirmed ourselves). */
  reservation_url?: string;
  logo_url?: string;
  promo?: { image_url?: string; headline?: string; text?: string; cta_label?: string; cta_url?: string };
  offers?: Array<{ title: string; detail?: string }>;
  /** The owner's own items, priced in D-Coins, sold at the venue's main counter. */
  items?: Array<{ name: string; price: number; desc?: string; icon?: string }>;
}

export interface VenuePublic { claimed: boolean; content: VenueContent | null }

export const venueKey = (placeId: string, venueId: string) => `${placeId}/${venueId}`;

/** Whether a venue is claimed, and its owner's published content (null while loading). */
export function useVenuePublic(key: string): VenuePublic | null {
  const [state, setState] = useState<VenuePublic | null>(null);
  useEffect(() => {
    let alive = true;
    supabase().rpc("venue_public", { p_venue: key }).then(({ data }) => {
      if (alive) setState((data as VenuePublic) ?? { claimed: false, content: null });
    });
    return () => { alive = false; };
  }, [key]);
  return state;
}

const PAY_POINTS: StationKind[] = ["menu", "counter", "till", "bar", "reception", "tickets"];

/** The venue as visitors see it, with the owner's description and items folded in. */
export function withOwnerContent(venue: Venue, content: VenueContent | null | undefined): Venue {
  if (!content) return venue;
  const station = PAY_POINTS.find((k) => venue.products.some((p) => p.station === k)) ?? venue.products[0]?.station ?? "counter";
  const food = venue.layout === "dining" || venue.layout === "club";
  const items: Product[] = (content.items ?? [])
    .filter((i) => i.name?.trim() && Number(i.price) >= 0)
    .slice(0, 30)
    .map((i, n) => ({
      id: `${venue.id}:owner-${n}`,
      name: i.name.trim().slice(0, 60),
      price: Math.round(Number(i.price)),
      icon: i.icon || "⭐",
      desc: (i.desc ?? "").slice(0, 160) || "From the venue's own menu.",
      station,
      ...(food ? { consumable: { need: "hunger" as const, amount: 15 } } : {}),
    }));
  return { ...venue, blurb: content.tagline || content.description?.slice(0, 140) || venue.blurb, products: [...items, ...venue.products] };
}

/** Counts a visit for the owner's analytics (once per venue per browser session). */
export function countVisit(key: string) {
  try {
    const k = `visit:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch { /* storage blocked: count anyway */ }
  void supabase().rpc("track_venue_visit", { p_venue: key });
}
