"use client";

// Live "who's online" count via Supabase Realtime Presence.
// Every open tab joins one shared channel; the count is the number of distinct tabs present.

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { presetFor } from "@/components/avatar/roster";

const CHANNEL = "dubai-online";

let channel: RealtimeChannel | null = null;
let subscribed = false;
let count: number | null = null; // null until the first sync
let online: ReadonlySet<string> = new Set(); // usernames of signed-in citizens online now
/** Where each signed-in citizen online now last went, for "Here now" on the map. */
export interface PresentCitizen { username: string; placeId: string | null; preset: string | null; venuePath?: string | null }

/** Live city-wide multiplayer pulse event (Open House, Bottle Service, 3D Pool Challenge, Decorator Dispatch). */
export interface CityPulseEvent {
  id: string;
  kind: "bottle" | "party" | "game" | "decor" | "venture";
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  from: string;
  at: number;
}

let members: PresentCitizen[] = [];
let activePulse: CityPulseEvent | null = null;
let pulseTimer: ReturnType<typeof setTimeout> | null = null;
let identity: { username: string | null; placeId: string | null; preset: string | null; venuePath?: string | null } = { username: null, placeId: null, preset: null, venuePath: null };
const listeners = new Set<() => void>();
const presenceKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function notify() {
  listeners.forEach((l) => l());
}

function setPulse(evt: CityPulseEvent | null) {
  activePulse = evt;
  if (pulseTimer) clearTimeout(pulseTimer);
  if (evt) {
    pulseTimer = setTimeout(() => {
      if (activePulse?.id === evt.id) {
        activePulse = null;
        notify();
      }
    }, 22000);
  }
  notify();
}

export function dismissCityPulse() {
  setPulse(null);
}

/** Broadcasts a live multiplayer event to all online players in Dubai. */
export function broadcastCityPulse(evt: Omit<CityPulseEvent, "id" | "at">) {
  connect();
  const full: CityPulseEvent = {
    ...evt,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
  setPulse(full);
  if (channel && subscribed) {
    channel.send({ type: "broadcast", event: "city-pulse", payload: full }).catch(() => {});
  }
}

export function useCityPulse(): CityPulseEvent | null {
  return useSyncExternalStore(subscribe, () => activePulse, () => null);
}

function track() {
  if (!channel || !subscribed) return;
  channel.track({ ...identity, onlineAt: new Date().toISOString() }).catch(() => {});
}

function connect() {
  if (channel) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  channel = supabase().channel(CHANNEL, { config: { presence: { key: presenceKey } } });
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel!.presenceState<{ username: string | null; placeId?: string | null; preset?: string | null; venuePath?: string | null }>();
      count = Object.keys(state).length;
      const all = Object.values(state).flat();
      online = new Set(all.map((m) => m.username).filter((u): u is string => !!u));
      const seen = new Set<string>();
      members = all.flatMap((m) => {
        if (!m.username || seen.has(m.username)) return [];
        seen.add(m.username);
        return [{ username: m.username, placeId: m.placeId ?? null, preset: m.preset ?? null, venuePath: m.venuePath ?? null }];
      });
      notify();
    })
    .on("broadcast", { event: "city-pulse" }, (msg) => {
      const p = msg.payload as CityPulseEvent | undefined;
      if (p && p.id && p.title) {
        setPulse(p);
      }
    })
    .subscribe((status) => {
      subscribed = status === "SUBSCRIBED";
      if (subscribed) track();
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => listeners.delete(listener);
}

export const BASE_ONLINE_PLAYERS = 1231;

/** Number of people with the app open right now: starts from 1231 + actual live players. */
export function useOnlineCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => BASE_ONLINE_PLAYERS + (count ?? 1),
    () => BASE_ONLINE_PLAYERS + 1
  );
}

const EMPTY: ReadonlySet<string> = new Set();

/** Usernames of citizens with the app open right now. */
export function useOnlineUsernames(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => online, () => EMPTY);
}

const NO_MEMBERS: PresentCitizen[] = [];

/** Signed-in citizens online now, with the place they last went to. */
export function usePresentCitizens(): PresentCitizen[] {
  return useSyncExternalStore(subscribe, () => members, () => NO_MEMBERS);
}

/** Tags this tab's presence with the signed-in citizen and where they are. Mount once near the root. */
export function usePresenceIdentity() {
  const { citizen, isLoggedIn } = useCitizen();
  const pathname = usePathname();
  const username = isLoggedIn ? citizen?.username ?? null : null;
  const placeId = username ? citizen?.location?.placeId ?? null : null;
  const preset = username && citizen?.look ? presetFor(citizen.look) : null;
  const venuePath = username && pathname && (pathname.startsWith("/place/") || pathname.startsWith("/games/") || pathname === "/home") ? pathname : null;
  useEffect(() => {
    connect();
    if (identity.username === username && identity.placeId === placeId && identity.preset === preset && identity.venuePath === venuePath) return;
    identity = { username, placeId, preset, venuePath };
    track();
  }, [username, placeId, preset, venuePath]);
}

export function formatOnline(n: number | null): string {
  if (n === null) return "…";
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}
