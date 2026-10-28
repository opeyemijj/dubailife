"use client";

// Life & Fun goals (src/data/life/fun.json, enforced in *_fun.sql): logging a fun visit as you go into a
// venue, your progress on each goal, this weekend's card and the weekend streak.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Place, Venue } from "@/lib/city/types";
import FUN from "@/data/life/fun.json";

export { FUN };
export type FunKind = "beach" | "club" | "hotel" | "staycation" | "brunch" | "attraction" | "waterpark";
export type FunGoal = (typeof FUN.goals)[number];
export interface FunStatus {
  goals: Array<{ id: string; progress: number; claimed: boolean }>;
  weekend: { saturday: string; now: boolean; done: string[]; claimed: boolean };
  streak: number;
}

/** What kind of fun going into this venue is (or null for an ordinary shop or office). */
export function funKindOf(place: Place, venue: Venue): FunKind | null {
  if (venue.layout === "waterpark") return "waterpark";
  if (venue.layout === "beach" || /beach/i.test(venue.category)) return "beach";
  if (venue.layout === "club" && /club|night/i.test(venue.category)) return "club";
  if (venue.layout === "dining") return "brunch";
  if (place.kind === "attraction") return "attraction";
  if (place.kind === "hotel") return "hotel";
  return null;
}
/** A hotel room or suite bought at reception is a staycation. */
export const isStaycation = (productId: string) => /:(room|suite)$/.test(productId);

/** Logged once per kind, place and day on the server; brunch only counts Friday to Sunday. */
export function logFun(kind: FunKind, place: string, venue?: string, item?: string) {
  void supabase().rpc("log_fun", { p_kind: kind, p_place: place, p_venue: venue ?? null, p_item: item ?? null }).then(() => void reloadFun());
}

let cache: FunStatus | null = null;
/** True when the last load failed (so screens can say so instead of loading forever). */
let failed = false;
const subs = new Set<() => void>();
let inflight: Promise<void> | null = null;
export function reloadFun() {
  inflight ??= (async () => {
    const { data, error } = await supabase().rpc("fun_status");
    failed = !!error || !data;
    if (data) cache = data as FunStatus;
    subs.forEach((f) => f());
    inflight = null;
  })();
  return inflight;
}
export function useFun(me: string | null | undefined) {
  const status = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => cache, () => null);
  const error = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => failed, () => false);
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => void reloadFun(), 0);
    const again = () => { if (document.visibilityState === "visible") void reloadFun(); };
    document.addEventListener("visibilitychange", again);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", again); };
  }, [me]);
  return { status, error, reload: useCallback(() => reloadFun(), []) };
}

export async function claimFun(claim: string) {
  const { data, error } = await supabase().rpc("claim_fun", { p_claim: claim });
  if (error) return { error: error.message.includes("already") ? "Already collected." : error.message.includes("not_done") ? "Not done yet." : "Couldn't collect. Try again." };
  await reloadFun();
  return { data: Number(data) };
}
