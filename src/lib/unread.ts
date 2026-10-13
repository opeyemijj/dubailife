"use client";

// Unread direct messages across the app (for badges and alerts). Counts come from the database
// (messages not yet read, this week) and refresh as new messages arrive.

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { onIncoming, type Message } from "@/lib/messages";

let counts: Record<string, number> = {};
let total = 0;
const listeners = new Set<() => void>();
const newMessageListeners = new Set<(m: Message) => void>();
let started: string | null = null;
let stop: (() => void) | null = null;

const notify = () => listeners.forEach((l) => l());

export async function refreshUnread() {
  const { data } = await supabase().rpc("unread_messages");
  counts = Object.fromEntries(((data ?? []) as Array<{ from_id: string; n: number }>).map((r) => [r.from_id, r.n]));
  total = Object.values(counts).reduce((a, b) => a + b, 0);
  notify();
}

/** Marks a conversation read (the person's messages to me). */
export async function markRead(from: string) {
  if (!counts[from]) return;
  counts = { ...counts, [from]: 0 };
  total = Object.values(counts).reduce((a, b) => a + b, 0);
  notify();
  await supabase().rpc("mark_messages_read", { p_from: from });
}

function start(me: string) {
  if (started === me) return;
  stop?.();
  started = me;
  void refreshUnread();
  stop = onIncoming(me, (m) => {
    counts = { ...counts, [m.from_id]: (counts[m.from_id] ?? 0) + 1 };
    total += 1;
    notify();
    newMessageListeners.forEach((l) => l(m));
  });
}

/** Total unread messages for the signed-in citizen (0 when signed out). */
export function useUnreadTotal(me: string | null | undefined) {
  useEffect(() => { if (me) start(me); }, [me]);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => (me ? total : 0), () => 0);
}

export function useUnreadCounts(me: string | null | undefined) {
  useEffect(() => { if (me) start(me); }, [me]);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => counts, () => counts);
}

/** Calls back when a new message arrives (for pop-up alerts). */
export function onNewMessage(cb: (m: Message) => void) {
  newMessageListeners.add(cb);
  return () => { newMessageListeners.delete(cb); };
}
