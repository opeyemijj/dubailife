"use client";

// Which pages already have a phone button (the bottom bar, the home bar). Everywhere else (venues, places, journeys)
// the floating phone button shows instead, so the phone is always one tap away.

import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** This page has its own phone button while mounted. */
export function usePhoneButtonHere(on = true) {
  useEffect(() => {
    if (!on) return;
    count += 1;
    notify();
    return () => { count -= 1; notify(); };
  }, [on]);
}

export function usePhoneButtonsShown() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => count, () => 0);
}
