// Dubai Metro and taxi journeys: the stations (in Red Line order), fares and announcement wording live in
// src/data/transit/transit.json; this types them and works out routes and fares.

import data from "@/data/transit/transit.json";

export interface MetroStation { id: string; en: string; ar: string; landmark: "burj" | "towers" | "lowrise" | "mall" | "marina"; map?: string }

export const METRO = data.metro;
export const STATIONS = METRO.stations as MetroStation[];
export const TAXI = data.taxi;

/** The stations from one map station to another, in the order the train calls at them. */
export function metroRoute(fromMap: string, toMap: string): { stops: MetroStation[]; towards: { en: string; ar: string } } | null {
  const a = STATIONS.findIndex((s) => s.map === fromMap), b = STATIONS.findIndex((s) => s.map === toMap);
  if (a < 0 || b < 0 || a === b) return null;
  const stops = a < b ? STATIONS.slice(a, b + 1) : STATIONS.slice(b, a + 1).reverse();
  // Heading towards the Marina the trains run to Life Pharmacy; the other way, to Centrepoint.
  return { stops, towards: a < b ? METRO.towards : { en: "Centrepoint", ar: "سنتربوينت" } };
}

/** Nol fare for a trip of `stops` stops: Silver by zones (1, 2, 3+), Gold Class double. */
export function metroFare(stops: number, gold: boolean) {
  const zones = Math.min(3, Math.ceil(stops / METRO.fares.stopsPerZone));
  const silver = METRO.fares.silver[Math.max(1, zones) - 1];
  return gold ? silver * METRO.fares.goldMultiplier : silver;
}

/** Fills {en}, {ar}, {towards}, {towardsAr} in an announcement phrase. */
export const phrase = (key: keyof typeof METRO.phrases, vars: Record<string, string> = {}) =>
  METRO.phrases[key].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/** Dubai time is night for taxi tariffs (10 pm – 6 am). */
export const taxiNight = (now = new Date()) => { const h = (now.getUTCHours() + 4) % 24; return h >= 22 || h < 6; };

/** A street-hail taxi fare: flag-fall, per km, the minimum, and Salik when the trip is long enough to cross a gate. */
export function taxiQuote(metres: number, now = new Date()) {
  const km = metres / 1000;
  const flag = taxiNight(now) ? TAXI.flagNight : TAXI.flagDay;
  const salik = km >= TAXI.salikOverKm ? TAXI.salik : 0;
  const meter = Math.max(TAXI.minimum, Math.round((flag + TAXI.perKm * km) * 2) / 2);
  return { flag, km, salik, meter, total: meter + salik };
}
