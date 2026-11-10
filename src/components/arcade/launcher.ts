// Opens an attraction game from anywhere (a venue's activity, a profile's Challenge button, a notification).
// ArcadeHost (mounted once in the root layout) shows it; each game's code, models and physics engine load
// only then, so no page carries them until a game is played.

import { useSyncExternalStore } from "react";
import type { ArcadeGameId } from "@/lib/arcade";

export interface ArcadeLaunch {
  game: ArcadeGameId;
  /** What the game needs to start (the opponent to fight, the case to try, the hall booked…). */
  params?: Record<string, unknown>;
  /** Told the round's share line, so the page that opened it can announce it (the venue chat, the party). */
  onShare?: (text: string) => void;
  onClose?: () => void;
}

let current: ArcadeLaunch | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openArcade(launch: ArcadeLaunch) {
  current = launch;
  emit();
}

export function closeArcade() {
  const was = current;
  current = null;
  emit();
  was?.onClose?.();
}

export function useArcadeLaunch() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current, () => null);
}

/** Starts fetching the physics engine (about 2 MB) ahead of time, e.g. while an intro card is showing. */
export const preloadPhysics = () => import("@react-three/rapier");
