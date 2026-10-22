"use client";

// Discover: everything a player can do (src/data/guide/activities.json). Items tick themselves off from what
// the server knows (my_activity_status) or once the player taps Go ("seen"). The bottom-nav badge counts
// everything still to try, minus anything the player hid; the Places badge counts places not yet visited.

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import ACTIVITIES from "@/data/guide/activities.json";
import VISIT from "@/data/guide/places-to-visit.json";

export type Activity = (typeof ACTIVITIES.items)[number];
export interface ActivityView { item: Activity; done: boolean; hidden: boolean }

const SEEN = "dl_discover_seen";
const HIDDEN = "dl_discover_hidden";
const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

let facts: Record<string, boolean> | null = null;
let enrolled = new Set<string>();
let version = 0;
const subs = new Set<() => void>();
const bump = () => { version++; subs.forEach((f) => f()); };

let loading: Promise<void> | null = null;
let loadedAt = 0;
/** Refreshes what the player has done (at most once a minute unless forced). */
export function refreshDiscover(force = false) {
  if (!force && Date.now() - loadedAt < 60_000) return loading ?? Promise.resolve();
  loadedAt = Date.now();
  return (loading = (async () => {
    const [status, courses] = await Promise.all([supabase().rpc("my_activity_status"), supabase().rpc("my_enrolled_courses")]);
    if (courses.data) enrolled = new Set(courses.data as string[]);
    if (status.data) { facts = status.data as Record<string, boolean>; bump(); }
  })());
}

export function activities(): ActivityView[] {
  const seen = new Set(read(SEEN)), hidden = new Set(read(HIDDEN));
  return ACTIVITIES.items.map((item) => ({
    item,
    done: item.done === "seen" ? seen.has(item.id)
      : item.done.startsWith("enrolled:") ? enrolled.has(item.done.slice("enrolled:".length))
      : !!facts?.[item.done],
    hidden: hidden.has(item.id),
  }));
}

/** Things still to try (shown on the badge). 0 until the first refresh, so the badge never flashes wrong. */
/** The "To do" badge: everything still to try (not hidden). 0 until loaded, so it never flashes wrong. */
export function toTryCount() {
  if (!facts) return 0;
  return activities().filter((a) => !a.done && !a.hidden).length;
}

/** The "Places" badge: places to visit you haven't been inside yet. */
export function placesLeftCount(visited: string[] | undefined) {
  const v = visited ?? [];
  return VISIT.places.filter((sp) => !v.some((k) => (sp.id.includes("/") ? k === sp.id : k === sp.id || k.startsWith(`${sp.id}/`)))).length;
}

export function useDiscover() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => version, () => 0);
}

export function markSeen(id: string) { write(SEEN, [...new Set([...read(SEEN), id])]); bump(); }
export function setHidden(id: string, hide: boolean) {
  const h = new Set(read(HIDDEN)); if (hide) h.add(id); else h.delete(id);
  write(HIDDEN, [...h]); bump();
}

/** Opens Discover on "Things to do" or "Places to visit". */
export const openDiscover = (tab: "do" | "places" = "do") => window.dispatchEvent(new CustomEvent("dubai:open-discover", { detail: tab }));
