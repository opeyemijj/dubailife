"use client";

// Locals: Dubai Life's hosts, so a venue is never empty. They are not accounts and never count as
// citizens; the game always labels them "Local". Each phone works out the same thing from the clock:
// which 20 venues the 100 Locals are at (5 each, changing every 15 minutes) and where in the room
// each one stands, sits or dances. What they give away is real virtual AED, paid out of their purses
// on the server (claim_local_gift) with fixed amounts and per-citizen limits.

import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import { PLACES } from "@/lib/city/places";
import type { Place, Venue } from "@/lib/city/types";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { rosterFor } from "@/components/avatar/roster";
import { BODY_TYPES } from "@/components/avatar/bodyShape";

export interface Local {
  id: string;
  username: string;
  name: string;
  look: AvatarLookProps;
}

const WOMEN = [
  "Layla", "Maya", "Sara", "Noor", "Aisha", "Hana", "Zara", "Lina", "Mira", "Yasmin", "Amira", "Dana", "Rania", "Salma", "Farah",
  "Leen", "Reem", "Jana", "Nadia", "Sofia", "Elena", "Chloe", "Priya", "Ananya", "Meera", "Kavya", "Tala", "Mariam", "Huda", "Ines",
  "Lara", "Nina", "Ava", "Mia", "Isla", "Emma", "Olivia", "Grace", "Jade", "Ruby", "Alya", "Dima", "Joud", "Lujain", "Ghala",
  "Shamma", "Latifa", "Mahra", "Hessa", "Moza", "Fatima", "Amal", "Rasha", "Nour", "Malak", "Celine", "Camila", "Valentina", "Anya", "Daria",
  "Kiki", "Ama", "Zainab", "Aaliyah", "Sana", "Ritu", "Tanvi", "Bella", "Luna", "Skye",
];
const MEN = [
  "Omar", "Khalid", "Rashid", "Saeed", "Hamdan", "Zayed", "Faisal", "Yousef", "Karim", "Tariq", "Adam", "Ali", "Hassan", "Rayan", "Nabil",
  "Arjun", "Rohan", "Dev", "Luca", "Marco", "James", "Leo", "Noah", "Ethan", "Daniel", "Kofi", "Tunde", "Ivan", "Sami", "Majid",
];
const TAGS = ["dxb", "uae", "971", "jbr", "marina", "downtown", "palm", "ae", "nights", "vibes"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A repeatable pseudo-random number in [0, 1) for a key. */
export const rand = (key: string) => hash(key) / 4294967296;

function build(names: string[], gender: "woman" | "man", start: number): Local[] {
  const looks = rosterFor(gender).map((r) => r.id);
  const bodies = BODY_TYPES[gender];
  return names.map((name, i) => {
    const n = start + i;
    const preset = looks[i % looks.length];
    // Same face, different clothes: every Local looks a little different.
    const wear = looks[(i + Math.floor(i / looks.length) + 1) % looks.length];
    return {
      id: `local:l${n.toString().padStart(3, "0")}`,
      username: `${name.toLowerCase()}.${TAGS[hash(name) % TAGS.length]}`,
      name,
      look: { gender, preset, wear: wear === preset ? undefined : wear, bodyType: bodies[hash(`${name}:${n}`) % bodies.length] },
    };
  });
}

export const LOCALS: Local[] = [...build(WOMEN, "woman", 1), ...build(MEN, "man", WOMEN.length + 1)];

export const isLocalId = (id: string) => id.startsWith("local:");
export const getLocal = (id: string) => LOCALS.find((l) => l.id === id) ?? null;

// ---------------------------------------------------------------- who's where

const PER_VENUE = 5;
export const SLOT_MS = 15 * 60 * 1000;
/** Where Locals like to be: nightlife and food first. */
const WEIGHT: Record<string, number> = { club: 6, dining: 4, lobby: 3, outdoor: 3 };

const OPEN = PLACES.flatMap((place) => place.venues.filter((v) => !v.comingSoon).map((venue) => ({ place, venue })));

export interface Gathering {
  place: Place;
  venue: Venue;
  key: string;
  locals: Local[];
}

const cache = new Map<number, Gathering[]>();

/** The venues with Locals in a 15-minute slot, busiest kinds first. */
export function gatherings(slot: number): Gathering[] {
  const hit = cache.get(slot);
  if (hit) return hit;
  // Weighted pick without repeats: lowest -log(u)/w wins.
  const picked = OPEN
    .map((o) => ({ o, k: -Math.log(1 - rand(`${slot}:${o.place.id}/${o.venue.id}`)) / (WEIGHT[o.venue.layout] ?? 1) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.floor(LOCALS.length / PER_VENUE))
    .map((x) => x.o);
  const order = LOCALS.slice().sort((a, b) => rand(`${slot}:${a.id}`) - rand(`${slot}:${b.id}`));
  const list = picked.map((o, i) => ({ ...o, key: `${o.place.id}/${o.venue.id}`, locals: order.slice(i * PER_VENUE, (i + 1) * PER_VENUE) }));
  cache.clear();
  cache.set(slot, list);
  return list;
}

export const slotOf = (now: number) => Math.floor(now / SLOT_MS);

/** The Locals in a venue right now (none in most venues). */
export function localsAt(placeId: string, venueId: string, now: number): Local[] {
  return gatherings(slotOf(now)).find((g) => g.key === `${placeId}/${venueId}`)?.locals ?? [];
}

/** Somewhere else with Locals to send someone, preferring a club or restaurant. */
export function elsewhere(placeId: string, venueId: string, now: number, seed = ""): Gathering | null {
  const here = `${placeId}/${venueId}`;
  const others = gatherings(slotOf(now)).filter((g) => g.key !== here);
  if (!others.length) return null;
  const lively = others.filter((g) => g.venue.layout === "club" || g.venue.layout === "dining");
  const pool = lively.length ? lively : others;
  return pool[hash(`${seed}:${slotOf(now)}`) % pool.length];
}

// ---------------------------------------------------------------- what they say

const GREETINGS = [
  "Welcome to {venue}! 👋", "Hey @{you}! First time here?", "Ahlan! The vibe is good tonight ✨", "Love your fit @{you} 🔥",
  "Hi! Grab a drink, it's a good night 🍹", "@{you}! Come say hi 😄",
];
const CHAT = [
  "Have you tried the club yet? The DJ is amazing 🎧", "I just moved to the Marina, still exploring 🌊", "Dubai never sleeps 😅",
  "My favourite spot? Rooftop at sunset 🌅", "Tap the dance floor and show me your moves 💃", "This place gets packed on weekends!",
  "Order something and it comes to your table 🍽️", "Rent a flat and decorate it, it's so fun 🏠",
];
const INVITES = ["We're heading to {venue} next — come with us! 🎉", "Everyone's at {venue}, let's go 🔥", "Meet me at {venue}? 💃"];

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const pick = <T,>(list: T[], key: string) => list[hash(key) % list.length];

export const greeting = (local: Local, you: string, venue: string) => fill(pick(GREETINGS, `${local.id}:hi`), { you, venue });
export const chatLine = (local: Local, n: number) => pick(CHAT, `${local.id}:${n}`);
export const inviteLine = (local: Local, venue: string, n = 0) => fill(pick(INVITES, `${local.id}:inv:${n}`), { venue });

// ---------------------------------------------------------------- gifts (real virtual AED)

export type GiftKind = "welcome" | "daily" | "hop";
export const GIFT_AMOUNT: Record<GiftKind, number> = { welcome: 100000, daily: 25000, hop: 10000 };
export interface GiftStatus { welcome: boolean; daily: boolean; hops: number }

export async function giftStatus(): Promise<GiftStatus | null> {
  const { data, error } = await supabase().rpc("local_gift_status");
  return error ? null : (data as GiftStatus);
}

/** Collects a gift from a Local. Returns null on success, or what went wrong. */
export async function claimGift(local: Local, kind: GiftKind, ref?: string): Promise<string | null> {
  const { error } = await supabase().rpc("claim_local_gift", { p_local: local.id, p_kind: kind, p_ref: ref ?? null });
  if (!error) { refreshCitizen(); return null; }
  return /duplicate|unique/.test(error.message) ? "already"
    : /hop_limit/.test(error.message) ? "That's all the rewards for following Locals today."
    : /local_out/.test(error.message) ? `@${local.username} has given everything away today — try another Local.`
    : "That didn't go through. Please try again.";
}

// Following a Local to another venue earns a reward on arrival.
const HOP_KEY = "dubailife:hop";

export function rememberHop(venueKey: string, localId: string) {
  try { localStorage.setItem(HOP_KEY, JSON.stringify({ venueKey, localId, at: Date.now() })); } catch { /* storage off */ }
}

/** Is a Local taking me to this venue? (Read without clearing.) */
export function hopPending(venueKey: string): boolean {
  try {
    const raw = localStorage.getItem(HOP_KEY);
    const hop = raw ? (JSON.parse(raw) as { venueKey: string; at: number }) : null;
    return !!hop && hop.venueKey === venueKey && Date.now() - hop.at < 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** The Local who sent me here (within the last hour), cleared once read. */
export function takeHop(venueKey: string): Local | null {
  try {
    const raw = localStorage.getItem(HOP_KEY);
    if (!raw) return null;
    const hop = JSON.parse(raw) as { venueKey: string; localId: string; at: number };
    if (hop.venueKey !== venueKey) return null;
    localStorage.removeItem(HOP_KEY);
    return Date.now() - hop.at < 60 * 60 * 1000 ? getLocal(hop.localId) : null;
  } catch {
    return null;
  }
}
