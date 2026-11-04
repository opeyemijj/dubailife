"use client";

// Saving live connections. A player who's gone quiet (no tap for 2 minutes, or the app in the background for 30
// seconds) is "away": the rooms they're in say so (others keep seeing them, with a 💤), then the live connection is
// dropped, which frees their slot on the realtime plan. The next tap (or coming back to the app) reconnects, and
// every channel rejoins by itself. Never while a live Space is on: voice needs the connection.
//
// Rooms listen for AWAY_EVENT (true: going away, false: back) to update what others see (see lib/room.ts).

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSpacesStore } from "@/lib/spaces";

const IDLE_MS = 2 * 60_000;
const HIDDEN_MS = 30_000;
/** Time for the "I'm away" note to reach the room before the connection goes. */
const SETTLE_MS = 800;
export const AWAY_EVENT = "dubai:away";

let idle = false;
const listeners = new Set<() => void>();
const setIdle = (v: boolean) => {
  if (idle === v) return;
  idle = v;
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent(AWAY_EVENT, { detail: v }));
};
/** Away right now (the live connection is, or is about to be, dropped). */
export const isIdle = () => idle;
export function useIdle() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => idle, () => false);
}

/** Mounted once for the whole app. */
export function ConnectionSaver() {
  const { activeSpaceId } = useSpacesStore();
  const inSpace = !!activeSpaceId;
  useEffect(() => {
    let lastInput = Date.now();
    let hiddenSince = document.visibilityState === "hidden" ? Date.now() : 0;
    let dropTimer: ReturnType<typeof setTimeout> | undefined;

    const back = () => {
      lastInput = Date.now();
      if (!idle) return;
      clearTimeout(dropTimer);
      setIdle(false);
      // Channels rejoin by themselves once the socket is back.
      if (!supabase().realtime.isConnected()) supabase().realtime.connect();
    };
    const away = () => {
      if (idle || inSpace) return;
      setIdle(true);
      dropTimer = setTimeout(() => { if (idle) void supabase().realtime.disconnect(); }, SETTLE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { hiddenSince = 0; back(); }
      else hiddenSince = Date.now();
    };
    const check = () => {
      const now = Date.now();
      if ((hiddenSince && now - hiddenSince > HIDDEN_MS) || now - lastInput > IDLE_MS) away();
    };
    const opts = { capture: true, passive: true } as const;
    const inputs = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    inputs.forEach((t) => window.addEventListener(t, back, opts));
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(check, 5000);
    return () => {
      inputs.forEach((t) => window.removeEventListener(t, back, opts));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
      clearTimeout(dropTimer);
    };
  }, [inSpace]);

  // Joining a Space while away (from a notification) brings the connection back.
  useEffect(() => {
    if (inSpace && idle) { setIdle(false); if (!supabase().realtime.isConnected()) supabase().realtime.connect(); }
  }, [inSpace]);
  return null;
}
