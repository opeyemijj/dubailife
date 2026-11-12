"use client";

// One popup at a time, in order. Every popup that opens by itself (the morning scene, payday, What's new, a knock at
// the door, a game invite…) asks for a turn here instead of checking the screen for itself; the most important one
// waiting goes first (then whoever asked first), and only when the screen is clear: no other popup, nothing the
// player has opened (a menu, a sheet, the wardrobe, the phone, a game, a journey: they say so with useScreenBusy),
// and no dialog on screen. Nothing is dropped: a popup that's waiting just waits its turn. Between one closing and
// the next a short pause, so they don't land on top of each other's closing.

import { useEffect, useId, useSyncExternalStore } from "react";

/** Which goes first (lower first). */
export const POPUP = {
  /** The age check: before anything. */
  system: 0,
  /** Can't wait: labour starting, held in custody. */
  urgent: 1,
  /** Someone's waiting on you: a knock, a game or boxing invite, a proposal, the decorator, a friend request. */
  live: 2,
  /** Today's: the morning, payday, setting goals, app setup, the move-in guide, the scam call, a fine. */
  daily: 3,
  /** News and asks: What's new, Discover, turning on notifications. */
  promo: 4,
  /** Tips: the two-finger slide. */
  hint: 5,
} as const;

interface Ask { id: string; priority: number; at: number }
const queue = new Map<string, Ask>();
const busy = new Set<string>();
let current: string | null = null;
let gapUntil = 0;
let retry: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const GAP_MS = 600;

/** A dialog on screen that hasn't come through here (marked role="dialog" or aria-modal, and actually showing). */
function dialogShowing(): boolean {
  if (typeof document === "undefined") return false;
  for (const el of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
    if ((el as HTMLElement).getClientRects().length > 0) return true;
  }
  return false;
}

/** Looks for the next turn in a moment, not at once: everything asking at the same time (several popups at app
    open, or a popup and the menu the player just opened) is in line first, so the order is right. */
const SETTLE_MS = 50;
function schedule(ms = SETTLE_MS) {
  if (retry) clearTimeout(retry);
  retry = setTimeout(pump, ms);
}

/** Gives the next turn if the screen is clear; otherwise looks again shortly. */
function pump() {
  if (retry) { clearTimeout(retry); retry = null; }
  if (current || !queue.size) return;
  const now = Date.now();
  if (busy.size || now < gapUntil || dialogShowing()) {
    schedule(Math.max(250, gapUntil - now));
    return;
  }
  let next: Ask | null = null;
  for (const a of queue.values()) if (!next || a.priority < next.priority || (a.priority === next.priority && a.at < next.at)) next = a;
  if (!next) return;
  queue.delete(next.id);
  current = next.id;
  notify();
}

function request(id: string, priority: number) {
  if (current === id || queue.has(id)) return;
  queue.set(id, { id, priority, at: Date.now() });
  schedule();
}

function release(id: string) {
  queue.delete(id);
  if (current === id) {
    current = null;
    gapUntil = Date.now() + GAP_MS;
    notify();
  }
  schedule();
}

/**
 * A popup that opens by itself asks for its turn while `want` is true, and shows only when it gets it (the hook
 * returns true). It gives the turn back as soon as `want` goes false (closed) or it unmounts. `want` must cover
 * everything that decides whether it would show, so a turn is never held by something that isn't on screen.
 */
export function usePopupTurn(id: string, want: boolean, priority: number): boolean {
  const mine = useSyncExternalStore(subscribe, () => current === id, () => false);
  useEffect(() => {
    if (!want) { release(id); return; }
    request(id, priority);
    return () => release(id);
  }, [id, want, priority]);
  return want && mine;
}

/** Something the player has open (a menu, a sheet, a game, a journey): popups wait until it's closed. */
export function useScreenBusy(active: boolean) {
  const id = useId();
  useEffect(() => {
    if (!active) return;
    busy.add(id);
    return () => { busy.delete(id); schedule(); };
  }, [id, active]);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Is a popup showing or waiting, or the screen busy (for older checks that ask "is anything open?"). */
export const popupsActive = () => !!current || busy.size > 0;
