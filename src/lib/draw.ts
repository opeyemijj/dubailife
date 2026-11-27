"use client";

// The invite draw (src/data/social/draw.json; the database: *_invite_draw.sql): returning players invite friends on
// WhatsApp with their link, and every `target` friends who join is an entry in the draw. What players do with the
// invite (seeing it, tapping WhatsApp, copying the link) is logged for the back office (/admin/draw).

import { useEffect, useState } from "react";
import DRAW from "@/data/social/draw.json";
import { supabase } from "@/lib/supabase/client";

export { DRAW };
export interface MyDraw { joined: number; pending: number; entries: number; open: boolean }

export const drawOpen = (now = Date.now()) => now >= Date.parse(DRAW.startsAt) && now <= Date.parse(DRAW.endsAt);
/** Returning players see it: accounts older than returningAfterHours. */
export const isReturning = (createdAt?: string | null, now = Date.now()) =>
  !!createdAt && now - Date.parse(createdAt) > DRAW.returningAfterHours * 3600 * 1000;

export const logInvite = (kind: "view" | "whatsapp" | "copy" | "later") => { void supabase().rpc("log_invite_event", { p_kind: kind }); };

let cache: { user: string; data: MyDraw } | null = null;
const listeners = new Set<() => void>();
export async function refreshDraw(user: string) {
  const { data } = await supabase().rpc("my_draw");
  if (data && typeof (data as MyDraw).joined === "number") { cache = { user, data: data as MyDraw }; listeners.forEach((f) => f()); }
}
/** My progress in the draw (refreshed every minute while shown). */
export function useDraw(user: string | null | undefined): MyDraw | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!user || !drawOpen()) return;
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    void refreshDraw(user);
    const id = setInterval(() => void refreshDraw(user), 60000);
    return () => { listeners.delete(f); clearInterval(id); };
  }, [user]);
  return user && cache?.user === user ? cache.data : null;
}

const OPEN = "dubai:invite-draw";
export const openDraw = () => window.dispatchEvent(new CustomEvent(OPEN));
export const DRAW_EVENT = OPEN;
/** Set for the visit when the draw popup is shown, so Big Missions doesn't pop up on top of it the same visit. */
export const DRAW_SESSION_KEY = "dl_draw_shown";
