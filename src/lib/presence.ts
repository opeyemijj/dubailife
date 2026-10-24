"use client";

// Live "who's online" count via Supabase Realtime Presence.
// Every open tab joins one shared channel; the count is the number of distinct tabs present.

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";

const CHANNEL = "dubai-online";

let channel: RealtimeChannel | null = null;
let subscribed = false;
let count: number | null = null; // null until the first sync
let online: ReadonlySet<string> = new Set(); // usernames of signed-in citizens online now
let identity: { username: string | null } = { username: null };
const listeners = new Set<() => void>();
const presenceKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function notify() {
  listeners.forEach((l) => l());
}

function track() {
  if (!channel || !subscribed) return;
  channel.track({ username: identity.username, onlineAt: new Date().toISOString() }).catch(() => {});
}

function connect() {
  if (channel) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  channel = supabase().channel(CHANNEL, { config: { presence: { key: presenceKey } } });
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel!.presenceState<{ username: string | null }>();
      count = Object.keys(state).length;
      online = new Set(Object.values(state).flat().map((m) => m.username).filter((u): u is string => !!u));
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

/** Tags this tab's presence with the signed-in citizen. Mount once near the root. */
export function usePresenceIdentity() {
  const { citizen, isLoggedIn } = useCitizen();
  const username = isLoggedIn ? citizen?.username ?? null : null;
  useEffect(() => {
    connect();
    if (identity.username === username) return;
    identity = { username };
    track();
  }, [username]);
}

export function formatOnline(n: number | null): string {
  if (n === null) return "…";
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}
