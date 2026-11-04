"use client";

// Who's online, and the city-wide pulse.
//   * Online: each signed-in player pings the database every minute while they're active (public.ping_online), and
//     the app reads a snapshot every 45 seconds (public.online_snapshot). This used to be one presence channel with
//     every online player in it, where each join or leave went to everyone: that grows with the square of the
//     number of players. A ping and a small read each minute stay cheap at any size.
//   * The pulse ("@x is throwing a party!") is a broadcast-only channel: no presence, so joining costs nothing extra.

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { presetFor } from "@/components/avatar/roster";
import { AWAY_EVENT, isIdle } from "@/lib/idle";

const PULSE_CHANNEL = "dubai-city-pulse";
const PING_MS = 60_000;
const SNAPSHOT_MS = 30_000;

let channel: RealtimeChannel | null = null;
let subscribed = false;
let count: number | null = null; // null until the first snapshot
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

// ---------------------------------------------------------------- online: pings and snapshots

let lastPing = 0;
/** Whether others have been told I'm here (this session, or since I came back from being away). */
let announced = false;
/** Adds (or updates) someone on the list right away. */
function addMember(m: PresentCitizen) {
  if (!m.username) return;
  const known = online.has(m.username);
  members = [m, ...members.filter((x) => x.username !== m.username)];
  online = new Set(members.map((x) => x.username));
  if (!known) count = (count ?? 0) + 1;
  notify();
}
function removeMember(username: string) {
  if (!online.has(username)) return;
  members = members.filter((x) => x.username !== username);
  online = new Set(members.map((x) => x.username));
  count = Math.max(0, (count ?? 1) - 1);
  notify();
}
/** "I'm here" (signed in and active only). The first time (and on coming back), everyone's told at once. */
function ping(force = false) {
  if (!identity.username || isIdle() || typeof document === "undefined" || document.visibilityState === "hidden") return;
  const now = Date.now();
  if (!force && now - lastPing < PING_MS - 1000) return;
  // At most every 15 seconds, even when moving around a lot.
  if (now - lastPing < 15_000) return;
  lastPing = now;
  const me: PresentCitizen = { username: identity.username, placeId: identity.placeId, preset: identity.preset, venuePath: identity.venuePath ?? null };
  void supabase().rpc("ping_online", { p_place: me.placeId, p_preset: me.preset, p_venue: me.venuePath ?? null }).then(() => {
    if (announced) return;
    announced = true;
    // On my own screen straight away, and on everyone else's (one message, only when I arrive).
    addMember(me);
    if (channel && subscribed) channel.send({ type: "broadcast", event: "online", payload: me }).catch(() => {});
    void snapshot();
  });
}
let snapping = false;
async function snapshot() {
  if (snapping || isIdle() || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
  snapping = true;
  const { data } = await supabase().rpc("online_snapshot");
  snapping = false;
  const d = data as { count: number; members: PresentCitizen[] } | null;
  if (!d) return;
  count = d.count;
  const seen = new Set<string>();
  members = d.members.filter((m) => m.username && !seen.has(m.username) && !!seen.add(m.username));
  online = new Set(members.map((m) => m.username));
  notify();
}

function connect() {
  if (channel) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  channel = supabase().channel(PULSE_CHANNEL);
  channel
    .on("broadcast", { event: "city-pulse" }, (msg) => {
      const p = msg.payload as CityPulseEvent | undefined;
      if (p && p.id && p.title) setPulse(p);
    })
    // Someone just came online, or signed out: show it now rather than at the next snapshot.
    .on("broadcast", { event: "online" }, (msg) => { const m = msg.payload as PresentCitizen | undefined; if (m?.username) addMember(m); })
    .on("broadcast", { event: "offline" }, (msg) => { const u = (msg.payload as { username?: string } | undefined)?.username; if (u) removeMember(u); })
    .subscribe((status) => {
      subscribed = status === "SUBSCRIBED";
      // Joined after the first ping: say hello now.
      if (subscribed && !announced && lastPing) { lastPing = 0; ping(true); }
    });
  // Coming back from being away counts as arriving again.
  window.addEventListener(AWAY_EVENT, (e) => { if (!(e as CustomEvent<boolean>).detail) { announced = false; lastPing = 0; ping(true); } });
  void snapshot();
  // For the life of the app: a snapshot every 45 seconds, and a ping check every 10 (it pings once a minute).
  setInterval(() => void snapshot(), SNAPSHOT_MS);
  setInterval(() => ping(), 10_000);
  // Back to the app: fresh numbers straight away.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { ping(true); void snapshot(); } });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => listeners.delete(listener);
}

export const BASE_ONLINE_PLAYERS = 1231;

/** Number of people online right now: starts from 1231 + signed-in players active in the last 2 minutes. */
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
    const signedOut = !!identity.username && !username;
    const before = identity.username;
    identity = { username, placeId, preset, venuePath };
    // Signing out: off the online list now. Otherwise: tell it where I am (at most every 15 seconds).
    if (signedOut) {
      void supabase().rpc("leave_online");
      if (channel && subscribed && before) channel.send({ type: "broadcast", event: "offline", payload: { username: before } }).catch(() => {});
      if (before) removeMember(before);
      announced = false;
    } else ping(true);
  }, [username, placeId, preset, venuePath]);
}

export function formatOnline(n: number | null): string {
  if (n === null) return "…";
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}
