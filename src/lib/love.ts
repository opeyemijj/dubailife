"use client";

// Relationships and weddings (the Hayati app). Only what UAE law allows: a man and a woman, one partner at
// a time, both agreeing at every step. Rules: src/data/life/love.json, enforced in *_love.sql.

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import LOVE from "@/data/life/love.json";

export { LOVE };
type Look = { gender: "woman" | "man"; preset?: string } | null;
export interface Person { id: string; username: string; look: Look }
export interface LoveRequest { id: number; kind: "date" | "propose"; ring: string | null; place: string | null; message: string | null; from: Person }
export interface Relationship {
  id: number; status: "dating" | "engaged" | "married"; level: number; ring: string | null; since: string; engagedAt: string | null; marriedAt: string | null;
  partner: Person; lovedToday: boolean; dateToday: string | null; partnerDateToday: string | null; wedding: string | null;
}
export interface MyLove {
  gender: "man" | "woman" | null;
  relationship: Relationship | null;
  incoming: LoveRequest[];
  outgoing: Array<{ id: number; kind: "date" | "propose"; to: string }>;
  invitations: Array<{ code: string; startsAt: string; venue: string }>;
  candidates: Person[];
}
export interface WeddingView {
  code: string; venue: string; startsAt: string; guestsMax: number; ceremony: "civil" | "religious"; status: "planned" | "done" | "missed" | "cancelled";
  iDoMan: boolean; iDoWoman: boolean; ring: string | null; man: Person; woman: Person; me: "man" | "woman" | "guest" | "none";
  guests: Array<Person & { role: keyof typeof LOVE.roles }>; gifts: number;
}

export const ringOf = (id?: string | null) => LOVE.rings.find((r) => r.id === id) ?? null;
export const venueOf = (id?: string | null) => LOVE.venues.find((v) => v.id === id) ?? null;
export const datePlaceOf = (id?: string | null) => LOVE.datePlaces.find((d) => d.id === id) ?? null;
export const ceremonyOf = (id?: string | null) => LOVE.ceremonies.find((c) => c.id === id) ?? null;
export const weddingCost = (venue: string, guests: number, ceremony: string) => {
  const v = venueOf(venue), c = ceremonyOf(ceremony);
  return v && c ? v.base + v.perGuest * guests + c.fee : 0;
};

const ERRORS: Record<string, string> = {
  friends_first: "Be friends first. Add them in Phone → People.",
  not_allowed: "Relationships on Dubai Life follow UAE law: a man and a woman.",
  you_are_taken: "You're already in a relationship.",
  they_are_taken: "They're already in a relationship.",
  cooling_off: "Take a few days after a breakup before asking someone new.",
  already_asked: "You've already asked. Wait for their answer.",
  too_soon: `Get closer first: you need ${LOVE.levels.propose} hearts to propose.`,
  already_proposed: "A proposal is already waiting for an answer.",
  already_today: "You've already shown your love today.",
  insufficient_funds: "You don't have enough AED for that.",
  venue_booked: "That venue is booked then. Try another time.",
  bad_time: "Pick a time between an hour and 30 days from now.",
  wedding_full: "This wedding's guest list is full.",
  too_early: "The ceremony hasn't started yet. Come back 10 minutes before.",
  too_late: "The ceremony window has passed.",
  role_full: "That role is already taken.",
  account_frozen: "Your account is frozen while your court case is open.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

// ---------------------------------------------------------------- live store

let state: MyLove | null = null;
const listeners = new Set<() => void>();
export const reloadLove = () => call<MyLove>("my_love").then((r) => { if (r.data) { state = r.data; listeners.forEach((l) => l()); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

let live: { me: string; users: number; stop: () => void } | null = null;
function watch(me: string) {
  if (live?.me === me) { live.users++; return; }
  live?.stop();
  void reloadLove();
  const db = supabase();
  const ch = db.channel(`love:${me}`);
  for (const table of ["love_requests", "relationships", "weddings"]) ch.on("postgres_changes", { event: "*", schema: "public", table }, () => void reloadLove());
  ch.subscribe();
  live = { me, users: 1, stop: () => void db.removeChannel(ch) };
}
function unwatch(me: string) {
  if (live?.me !== me || --live.users > 0) return;
  live.stop();
  live = null;
}

export function useLove(me: string | null | undefined): MyLove | null {
  useEffect(() => {
    if (!me) return;
    watch(me);
    return () => unwatch(me);
  }, [me]);
  return useSyncExternalStore(subscribe, () => state, () => null);
}

const after = async <T,>(p: Promise<{ data?: T; error?: string }>) => { const r = await p; await Promise.all([reloadLove(), refreshCitizen()]); return r; };
export const askOut = (to: string, message?: string) => after(call<number>("ask_out", { p_to: to, p_message: message ?? null }));
export const respond = (id: number, accept: boolean) => after(call<null>("love_respond", { p_request: id, p_accept: accept }));
export const cancelRequest = (id: number) => after(call<null>("cancel_love_request", { p_request: id }));
export const showLove = () => after(call<number>("show_love"));
export const logDate = (place: string) => after(call<{ together: boolean; level?: number }>("log_date", { p_place: place }));
export const propose = (ring: string, place: string, message?: string) => after(call<number>("propose", { p_ring: ring, p_place: place, p_message: message ?? null }));
export const endRelationship = () => after(call<null>("end_relationship"));
export const planWedding = (venue: string, startsAt: Date, guests: number, ceremony: string) =>
  after(call<string>("plan_wedding", { p_venue: venue, p_starts_at: startsAt.toISOString(), p_guests: guests, p_ceremony: ceremony }));
export const cancelWedding = () => after(call<null>("cancel_wedding"));
export const weddingView = (code: string) => call<WeddingView>("wedding_view", { p_code: code });
export const rsvp = (code: string, yes: boolean) => call<null>("rsvp_wedding", { p_code: code, p_yes: yes });
export const setRole = (code: string, user: string, role: string) => call<null>("set_wedding_role", { p_code: code, p_user: user, p_role: role });
export const giveGift = (code: string, amount: number, message?: string) => after(call<null>("wedding_gift", { p_code: code, p_amount: amount, p_message: message ?? null }));
export const sayIDo = (code: string) => after(call<{ married: boolean }>("say_i_do", { p_code: code }));

export const weddingLink = (code: string, ref?: string) => `${typeof window === "undefined" ? "" : window.location.origin}/wedding/${code}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
