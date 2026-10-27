"use client";

// The weekly Dubai Life Marathon (src/data/life/marathon.json, enforced in *_marathon.sql): sign up, the
// countdown, the live race (everyone's progress arrives as it's saved) and the results.

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import MARATHON from "@/data/life/marathon.json";

export { MARATHON };
type Look = { gender: "woman" | "man"; preset?: string } | null;
export interface Runner { id: string; username: string; look: Look; bib: number; distance: number; finishMs: number | null }
export interface Overview {
  race: string; now: string; entrants: number;
  me: { bib: number; distance: number; finishMs: number | null } | null;
  runners: Runner[];
  last: { race: string; podium: Array<{ username: string; finishMs: number }>; finishers: number } | null;
}

const ERRORS: Record<string, string> = {
  race_started: "This week's race has started. Sign up for next Friday's.",
  not_registered: "You're not signed up for this race.",
  not_started: "The race hasn't started yet.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

let state: Overview | null = null;
/** Server time minus this device's clock, so countdowns agree for everyone. */
let skew = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function reloadMarathon() {
  const { data } = await supabase().rpc("marathon_overview");
  if (!data) return;
  state = data as Overview;
  skew = Date.parse(state.now) - Date.now();
  emit();
}
export const serverNow = () => Date.now() + skew;

let live: { users: number; stop: () => void } | null = null;
function watch() {
  if (live) { live.users++; return; }
  void reloadMarathon();
  const db = supabase();
  const ch = db.channel(`marathon-${Math.random().toString(36).slice(2, 7)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "marathon_entries" }, (p) => {
      // Progress updates patch the runner in place; new sign-ups reload the list.
      const row = p.new as { race: string; user_id: string; distance: number; finish_ms: number | null } | undefined;
      if (!state || !row?.user_id) return;
      const r = state.runners.find((x) => x.id === row.user_id);
      if (!r || Date.parse(row.race) !== Date.parse(state.race)) { void reloadMarathon(); return; }
      state = { ...state, runners: state.runners.map((x) => (x.id === row.user_id ? { ...x, distance: Number(row.distance), finishMs: row.finish_ms } : x)) };
      emit();
    })
    .subscribe();
  const t = setInterval(() => void reloadMarathon(), 60_000);
  live = { users: 1, stop: () => { clearInterval(t); void db.removeChannel(ch); } };
}
function unwatch() {
  if (!live || --live.users > 0) return;
  live.stop();
  live = null;
}

export function useMarathon(me: string | null | undefined): Overview | null {
  useEffect(() => {
    if (!me) return;
    watch();
    return unwatch;
  }, [me]);
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => null);
}

export async function register(): Promise<{ bib?: number; error?: string }> {
  const { data, error } = await supabase().rpc("marathon_register");
  if (error) return { error: friendly(error.message) };
  await reloadMarathon();
  return { bib: data as number };
}

export async function reportProgress(distance: number): Promise<{ distance: number; finishMs: number | null } | null> {
  const { data, error } = await supabase().rpc("marathon_progress", { p_distance: Math.round(distance) });
  if (error) return null;
  if ((data as { finishMs: number | null }).finishMs) void refreshCitizen();
  return data as { distance: number; finishMs: number | null };
}

export type Phase = "open" | "soon" | "live" | "over";
/** Where the race is: sign-ups open, starting within 15 minutes, running, or just over. */
export function phaseOf(o: Overview | null, now = serverNow()): Phase {
  if (!o) return "open";
  const start = Date.parse(o.race);
  if (now >= start + MARATHON.windowMinutes * 60_000) return "over";
  if (now >= start) return "live";
  if (start - now <= 15 * 60_000) return "soon";
  return "open";
}

export const shownKm = (metres: number) => ((metres * MARATHON.displayScale) / 1000).toFixed(1);
export const raceClock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const raceDate = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
export const raceLink = (ref?: string) => `${typeof window === "undefined" ? "" : window.location.origin}/marathon${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
