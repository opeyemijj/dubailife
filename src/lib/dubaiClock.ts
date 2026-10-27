"use client";

// Dubai time for the HUD: the clock, whether it's night, a typical temperature for the month and hour,
// and the citizen's mood from their needs.

import { useSyncExternalStore } from "react";
import { DEFAULT_NEEDS, type Citizen } from "@/lib/citizenStore";

const listeners = new Set<() => void>();
let now = typeof window === "undefined" ? 0 : Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    now = Date.now();
    // Ticks on the minute so the clock never lags.
    timer = setInterval(() => { now = Date.now(); listeners.forEach((f) => f()); }, 15_000);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) { clearInterval(timer); timer = null; }
  };
}

/** The current time, updated every 15 seconds (0 on the server). */
export const useNow = () => useSyncExternalStore(subscribe, () => now, () => 0);

const parts = (t: number) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "numeric", minute: "2-digit", hour12: false, month: "numeric" }).formatToParts(t);
  const get = (k: string) => Number(p.find((x) => x.type === k)?.value ?? 0);
  return { hour: get("hour") % 24, minute: get("minute"), month: get("month") - 1 };
};

export function dubaiTime(t: number) {
  const { hour, minute, month } = parts(t);
  const h12 = hour % 12 || 12;
  return {
    hour,
    clock: `${h12}:${String(minute).padStart(2, "0")}`,
    ampm: hour < 12 ? "AM" : "PM",
    date: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "long" }).format(t),
    night: hour < 6 || hour >= 19,
    tempC: temperature(month, hour),
  };
}

// Dubai's average daily highs by month; nights run about 8° cooler.
const HIGHS = [24, 25, 28, 33, 37, 39, 41, 41, 39, 35, 30, 26];
function temperature(month: number, hour: number) {
  const warmth = Math.max(0, Math.cos(((hour - 15) / 24) * Math.PI * 2)); // warmest mid-afternoon
  return Math.round(HIGHS[month] - 8 + 8 * warmth);
}

export type Mood = { label: string; face: "happy" | "fine" | "low" | "miserable" | "sick"; tone: string };

/** The citizen's mood: the average of their needs, dragged down by the lowest one. */
export function moodOf(c: Citizen | null | undefined, ill = false): Mood {
  if (ill) return { label: "Sick", face: "sick", tone: "text-lime-600" };
  const needs = Object.values({ ...DEFAULT_NEEDS, ...c?.needs }) as number[];
  const avg = needs.reduce((a, b) => a + b, 0) / needs.length;
  const score = (avg + Math.min(...needs)) / 2;
  if (score >= 65) return { label: "Happy", face: "happy", tone: "text-emerald-600" };
  if (score >= 45) return { label: "Fine", face: "fine", tone: "text-amber-500" };
  if (score >= 25) return { label: "Low", face: "low", tone: "text-orange-500" };
  return { label: "Miserable", face: "miserable", tone: "text-rose-500" };
}
