"use client";

import { usePresenceIdentity } from "@/lib/presence";

/** Keeps this tab in the live online count for as long as the app is open. */
export function PresenceTracker() {
  usePresenceIdentity();
  return null;
}
