"use client";

// Food and grocery orders from the phone's apps (src/data/phone/apps.json). Paid when placed; the order is
// prepared and ridden over in game time (well under a minute). Food feeds you wherever you are; groceries
// go into the pantry at home. Either way it arrives even with the phone closed.

import { useSyncExternalStore } from "react";
import { adjustBalance, boostNeed, updateCitizen, type NeedKey } from "@/lib/citizenStore";
import { pantryOf } from "@/lib/homeFixtures";
import { lifeEvent } from "@/lib/life";
import { gameAudio } from "@/utils/gameAudio";

export interface Order {
  id: number;
  store: string;
  icon: string;
  total: number;
  placedAt: number;
  arriveAt: number;
  eta: number; // the minutes shown to the player
  feeds: Array<{ need: NeedKey; amount: number }>;
  /** Groceries for the pantry at home. */
  stock?: Record<string, number>;
  meal: boolean;
  delivered: boolean;
}

let orders: Order[] = [];
const listeners = new Set<() => void>();
const emit = () => { orders = [...orders]; listeners.forEach((l) => l()); };

/** Places an order: false if the wallet can't cover it. */
export function placeOrder({ minutes, ...o }: Omit<Order, "id" | "placedAt" | "arriveAt" | "delivered" | "eta"> & { minutes: number[] }, seconds: number): boolean {
  if (!adjustBalance(-o.total)) return false;
  gameAudio.playCoinSound();
  const eta = minutes[0] + Math.floor(Math.random() * (minutes[1] - minutes[0] + 1));
  const order: Order = { ...o, eta, id: Date.now(), placedAt: Date.now(), arriveAt: Date.now() + seconds * 1000, delivered: false };
  orders = [order, ...orders].slice(0, 10);
  emit();
  setTimeout(() => deliver(order.id), seconds * 1000);
  return true;
}

function deliver(id: number) {
  const o = orders.find((x) => x.id === id);
  if (!o || o.delivered) return;
  o.delivered = true;
  for (const f of o.feeds) boostNeed(f.need, f.amount);
  if (o.stock) {
    const add = o.stock;
    updateCitizen((c) => {
      const pantry: Record<string, number> = { ...pantryOf(c) };
      for (const [k, n] of Object.entries(add)) pantry[k] = (pantry[k] ?? 0) + n;
      return { ...c, pantry };
    });
  }
  if (o.meal) lifeEvent("meal");
  gameAudio.playCoinSound();
  window.dispatchEvent(new CustomEvent("dubai:toast", { detail: o.stock ? `${o.icon} Your ${o.store} groceries are in your kitchen.` : `${o.icon} Your ${o.store} order has arrived. Enjoy!` }));
  emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const NONE: Order[] = [];
export const useOrders = () => useSyncExternalStore(subscribe, () => orders, () => NONE);
