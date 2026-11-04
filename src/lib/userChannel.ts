"use client";

// My own live channel ("user:<my id>"): the database tells me, and only me, about things that concern me (a message,
// money, a friend request, a knock, a game invite, love and family, doctors and courts). One private channel instead
// of a channel per feature, so far fewer subscriptions per player. See supabase/migrations/*_user_channel.sql.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/** What changed: a table and the kind of change, with the row when it's mine to see. */
export interface UserEvent<T = Record<string, unknown>> {
  table: "messages" | "transfers" | "game_invites" | "friendships" | "entry_requests" | "love" | "services";
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T | null;
}
type Listener = (e: UserEvent) => void;

let me: string | null = null;
let channel: RealtimeChannel | null = null;
const listeners = new Map<string, Set<Listener>>();

function open(user: string) {
  if (me === user && channel) return;
  close();
  me = user;
  channel = supabase().channel(`user:${user}`, { config: { private: true } });
  channel.on("broadcast", { event: "db" }, ({ payload }) => {
    const e = payload as UserEvent;
    listeners.get(e.table)?.forEach((l) => l(e));
  });
  // A private channel needs the signed-in token; the client sends it (and refreshes it) for us.
  void supabase().realtime.setAuth().finally(() => channel?.subscribe());
}
function close() {
  if (channel) void supabase().removeChannel(channel);
  channel = null;
  me = null;
}

/** Calls back for changes to `table` that concern me, until the returned function is called. */
export function onUserEvent<T = Record<string, unknown>>(user: string, table: UserEvent["table"], cb: (e: UserEvent<T>) => void) {
  open(user);
  let set = listeners.get(table);
  if (!set) listeners.set(table, (set = new Set()));
  const l = cb as Listener;
  set.add(l);
  return () => {
    set!.delete(l);
    if ([...listeners.values()].every((s) => s.size === 0)) close();
  };
}
