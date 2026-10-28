"use client";

// Daily missions, the mystery box, the savings jar and payday (src/data/life/missions.json, enforced in
// *_missions.sql). The server picks today's missions and decides what's done; this reads and collects.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import { reloadGoals } from "@/lib/goals";
import MISSIONS from "@/data/life/missions.json";

export { MISSIONS };
export type MissionId = keyof typeof MISSIONS.missions;
export interface Missions {
  day: number;
  missions: Array<{ id: MissionId; done: boolean; claimed: boolean }>;
  box: { ready: boolean; claimed: boolean; aed: number | null };
  nextAt: string;
}
export interface Savings { amount: number; payday: { ref: string; amount: number; reason: string; at: string; seen: boolean } | null }

export const missionOf = (id: string) => (MISSIONS.missions as Record<string, { icon: string; title: string; href: string; pillar: string }>)[id];
/** Anything to collect now: finished missions not yet collected, or the box. */
export const collectable = (m: Missions | null) => !!m && (m.missions.some((x) => x.done && !x.claimed) || (m.box.ready && !m.box.claimed));

let cache: Missions | null = null;
const subs = new Set<() => void>();
let inflight: Promise<void> | null = null;
export function reloadMissions() {
  inflight ??= (async () => {
    const { data } = await supabase().rpc("my_missions");
    if (data) { cache = data as Missions; subs.forEach((f) => f()); }
    inflight = null;
  })();
  return inflight;
}
export function useMissions(me: string | null | undefined) {
  const missions = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => cache, () => null);
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => void reloadMissions(), 0);
    const again = () => { if (document.visibilityState === "visible") void reloadMissions(); };
    document.addEventListener("visibilitychange", again);
    const every = setInterval(again, 60000);
    return () => { clearTimeout(t); clearInterval(every); document.removeEventListener("visibilitychange", again); };
  }, [me]);
  return { missions, reload: useCallback(() => reloadMissions(), []) };
}

export async function claimMissions() {
  const { data, error } = await supabase().rpc("claim_missions");
  if (error) return { error: "Couldn't collect right now. Try again." };
  void refreshCitizen();
  await Promise.all([reloadMissions(), reloadGoals()]);
  return { data: data as { xp: number; box: number | null } };
}

export async function mySavings() {
  const { data } = await supabase().rpc("my_savings");
  return (data as Savings | null) ?? null;
}
/** Move money into the jar (positive) or back to your wallet (negative). Returns the new jar total. */
export async function moveSavings(amount: number) {
  const { data, error } = await supabase().rpc("move_savings", { p_amount: Math.round(amount) });
  if (error) return { error: error.message.includes("insufficient") ? "You don't have that much in your wallet." : error.message.includes("not_enough_saved") ? "You don't have that much saved." : "Couldn't move the money. Try again." };
  void refreshCitizen();
  void reloadGoals();
  return { data: Number(data) };
}
export const seenPayday = (ref: string) => supabase().rpc("seen_payday", { p_ref: ref });
