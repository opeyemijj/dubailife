"use client";

// Live "who's online" count via Supabase Realtime Presence.
// Every open tab joins one shared channel; the count is the number of distinct tabs present.

import { useEffect, useSyncExternalStore } from "react";
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
export interface PresentCitizen { username: string; placeId: string | null; preset: string | null }
let members: PresentCitizen[] = [];
let identity: { username: string | null; placeId: string | null; preset: string | null } = { username: null, placeId: null, preset: null };
const listeners = new Set<() => void>();
const presenceKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function notify() {
  listeners.forEach((l) => l());
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
      const state = channel!.presenceState<{ username: string | null; placeId?: string | null; preset?: string | null }>();
      count = Object.keys(state).length;
      const all = Object.values(state).flat();
      online = new Set(all.map((m) => m.username).filter((u): u is string => !!u));
      const seen = new Set<string>();
      members = all.flatMap((m) => {
        if (!m.username || seen.has(m.username)) return [];
        seen.add(m.username);
        return [{ username: m.username, placeId: m.placeId ?? null, preset: m.preset ?? null }];
      });
      notify();
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
  const username = isLoggedIn ? citizen?.username ?? null : null;
  const placeId = username ? citizen?.location?.placeId ?? null : null;
  const preset = username && citizen?.look ? presetFor(citizen.look) : null;
  useEffect(() => {
    connect();
    if (identity.username === username && identity.placeId === placeId && identity.preset === preset) return;
    identity = { username, placeId, preset };
    track();
  }, [username, placeId, preset]);
}

export function formatOnline(n: number | null): string {
  if (n === null) return "…";
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}
