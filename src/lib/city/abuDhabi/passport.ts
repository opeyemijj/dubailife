"use client";

// The Abu Dhabi Passport (src/data/abuDhabi/passport.json): a stamp for each landmark's signature thing. A venue
// stamps it when you finish that activity or buy that thing there (components/interior/VenueExperience); the server
// gives each stamp once, only in Abu Dhabi, and pays the rewards (public.collect_passport_stamp).

import { useEffect, useSyncExternalStore } from "react";
import PASSPORT_DATA from "@/data/abuDhabi/passport.json";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";

export interface Stamp { id: string; place: string; name: string; icon: string; how: string; activities?: string[]; products?: string[] }
export const PASSPORT = PASSPORT_DATA as { title: string; stamps: Stamp[]; rewards: { at: number; aed: number; title?: boolean }[] };
export const PASSPORT_SIZE = PASSPORT.stamps.length;

/** The stamp that finishing this activity (or buying this product) at this place collects, if any. */
export const stampFor = (placeId: string, done: { activity?: string; product?: string }) =>
  PASSPORT.stamps.find((s) => s.place === placeId
    && ((!!done.activity && !!s.activities?.includes(done.activity)) || (!!done.product && !!s.products?.includes(done.product)))) ?? null;

export interface StampResult { stamp: Stamp; isNew: boolean; count: number; reward: number; complete: boolean }

// My stamps (ids), shared by every screen that shows them.
let mine: Set<string> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadPassport() {
  const { data, error } = await supabase().rpc("my_passport");
  if (error) return;
  mine = new Set(((data ?? []) as { stamp: string }[]).map((r) => r.stamp));
  emit();
}

/** My stamps: the ids, once loaded. */
export function usePassport(): Set<string> | null {
  const v = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => mine, () => null);
  useEffect(() => { if (mine === null) void loadPassport(); }, []);
  return v;
}

/** Collects the stamp for what was just done here, if it is one. Null when there's no stamp for it (or it failed). */
export async function collectStamp(placeId: string, done: { activity?: string; product?: string }): Promise<StampResult | null> {
  const stamp = stampFor(placeId, done);
  if (!stamp || mine?.has(stamp.id)) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase().rpc("collect_passport_stamp", { p_stamp: stamp.id });
    if (!error && data) {
      const r = data as { new: boolean; count: number; reward: number; complete: boolean };
      mine = new Set(mine ?? []).add(stamp.id);
      emit();
      if (r.reward > 0) void refreshCitizen();
      return { stamp, isNew: r.new, count: r.count, reward: Number(r.reward), complete: r.complete };
    }
    // Two stamps within seconds of each other: the second waits its turn.
    if (error?.message.includes("too_soon") && attempt === 0) { await new Promise((ok) => setTimeout(ok, 21_000)); continue; }
    return null;
  }
  return null;
}

/** What to say when a stamp is collected. */
export const stampLine = (r: StampResult) =>
  `🛂 Passport stamp: ${r.stamp.icon} ${r.stamp.name} (${r.count}/${PASSPORT_SIZE})`
  + (r.reward ? ` · +AED ${r.reward.toLocaleString()}` : "")
  + (r.complete ? ` · You're an ${PASSPORT.title}!` : "");
