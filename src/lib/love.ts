"use client";

// Relationships, weddings and family (the Family app, once called Hayati). A couple is a man and a woman, both
// agreeing at every step; a man may have up to 4 partners, a woman one, and other partners are hidden (but can be
// found out). Relatives, babies and nannies too. Rules: src/data/life/love.json and family.json, enforced in
// *_love.sql and *_family.sql.

import { onUserEvent } from "@/lib/userChannel";
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { refreshCitizen } from "@/lib/citizenStore";
import LOVE from "@/data/life/love.json";
import FAMILY from "@/data/life/family.json";

export { LOVE, FAMILY };
type Look = { gender: "woman" | "man"; preset?: string } | null;
export interface Person { id: string; username: string; look: Look }
export interface LoveRequest { id: number; kind: "date" | "propose" | "baby"; ring: string | null; place: string | null; message: string | null; from: Person }
export interface Relationship {
  id: number; status: "dating" | "engaged" | "married"; level: number; ring: string | null; since: string; engagedAt: string | null; marriedAt: string | null;
  partner: Person; lovedToday: boolean; dateToday: string | null; partnerDateToday: string | null; wedding: string | null;
}
export interface Discovery { relationship: number; status: string; foundAt: string; partner: Person; other: Person }
export interface MyLove {
  gender: "man" | "woman" | null;
  /** Can start another relationship (a woman when single, a man with fewer than 4 partners). */
  canDate: boolean;
  relationships: Relationship[];
  /** The first of them (most people have one). */
  relationship: Relationship | null;
  /** What I found out about my partner and haven't dealt with yet. */
  discoveries: Discovery[];
  /** Partners of mine who found out about another of my relationships. */
  caught: Array<{ by: string; about: string }>;
  incoming: LoveRequest[];
  outgoing: Array<{ id: number; kind: "date" | "propose" | "baby"; to: string }>;
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
  no_home: "You need a home to move in together: rent or buy one, or throw a house party at yours first.",
  not_together: "You're not together any more.",
  "function public.ask_move_in": "Moving in together is coming in the next update.",
  friends_first: "Be friends first. Add them in Phone → People.",
  not_allowed: "Relationships on Dubai Life follow UAE law: a man and a woman.",
  you_are_taken: "You can't start another relationship right now.",
  they_are_taken: "They're already taken.",
  already_together: "You're already together.",
  which_partner: "Choose which partner.",
  already_expecting: "You're already expecting a baby.",
  not_born_yet: "The baby isn't born yet.",
  already_family: "You're already family.",
  already_partners: "You're partners, not relatives.",
  bad_name: "Give your baby a name (1 to 24 characters).",
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
  scan_too_early: "It's too early in the pregnancy for that scan. Come back in a day or two.",
  labour_too_early: "Not yet: labour can start from a day before the due date.",
  not_the_mother: "The mother delivers the baby. Be there with her.",
  already_born: "The baby's already born.",
  not_a_hospital: "Scans and births happen at Latifa Hospital or Dubai Hospital.",
  not_your_child: "That isn't your baby.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

// ---------------------------------------------------------------- live store

let state: MyLove | null = null;
const listeners = new Set<() => void>();
/** Fills in what an older database doesn't send yet (one relationship, no discoveries), so the app never breaks. */
function normalise(d: MyLove): MyLove {
  const relationships = d.relationships ?? (d.relationship ? [d.relationship] : []);
  return { ...d, relationships, relationship: d.relationship ?? relationships[0] ?? null, canDate: d.canDate ?? relationships.length === 0,
    discoveries: d.discoveries ?? [], caught: d.caught ?? [], incoming: d.incoming ?? [], outgoing: d.outgoing ?? [], invitations: d.invitations ?? [], candidates: d.candidates ?? [] };
}
export const reloadLove = () => call<MyLove>("my_love").then((r) => { if (r.data) { state = normalise(r.data); listeners.forEach((l) => l()); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

let live: { me: string; users: number; stop: () => void } | null = null;
function watch(me: string) {
  if (live?.me === me) { live.users++; return; }
  live?.stop();
  void reloadLove();
  // On my own channel: the database says when anything in my love life or family changed.
  const stop = onUserEvent(me, "love", () => { void reloadLove(); void reloadFamily(); });
  live = { me, users: 1, stop };
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

/** The partner, only when there's one to name (works with the database before and after Family). */
const who = (partner?: string) => (partner ? { p_partner: partner } : {});
const after = async <T,>(p: Promise<{ data?: T; error?: string }>) => { const r = await p; await Promise.all([reloadLove(), refreshCitizen()]); return r; };
export const askOut = (to: string, message?: string) => after(call<number>("ask_out", { p_to: to, p_message: message ?? null }));
export const respond = (id: number, accept: boolean) => after(call<null>("love_respond", { p_request: id, p_accept: accept }));
export const cancelRequest = (id: number) => after(call<null>("cancel_love_request", { p_request: id }));
export const showLove = (partner?: string) => after(call<number>("show_love", who(partner)));

/** Living together (family phase 2): your partner moves into your home, or you into theirs. */
export interface SharedHome { partner: string; partnerName?: string; flat: string; building: string; unit: string; type: string; host: boolean }
export interface MoveInRequest { id: number; incoming: boolean; partner: string; partnerName: string; createdAt: string }
export const myHousehold = async (): Promise<SharedHome[]> => (await call<SharedHome[]>("my_household")).data ?? [];
/** Ask your partner to move into your home: they move in when they accept. */
export const askMoveIn = (partner: string) => call<number>("ask_move_in", { p_partner: partner });
/** Accept (you move in) or decline; the one who asked can take it back with `accept: false`. */
export const respondMoveIn = (id: number, accept: boolean) => call<string | null>("respond_move_in", { p_request: id, p_accept: accept });
export const myMoveInRequests = async (): Promise<MoveInRequest[]> => (await call<MoveInRequest[]>("my_move_in_requests")).data ?? [];
export const moveOut = (partner: string) => call<null>("move_out", { p_partner: partner });
export const logDate = (place: string, partner?: string) => after(call<{ together: boolean; level?: number }>("log_date", { p_place: place, ...who(partner) }));
export const propose = (ring: string, place: string, message?: string, partner?: string) => after(call<number>("propose", { p_ring: ring, p_place: place, p_message: message ?? null, ...who(partner) }));
export const endRelationship = (partner?: string) => after(call<null>("end_relationship", who(partner)));
export const planWedding = (venue: string, startsAt: Date, guests: number, ceremony: string, partner?: string) =>
  after(call<string>("plan_wedding", { p_venue: venue, p_starts_at: startsAt.toISOString(), p_guests: guests, p_ceremony: ceremony, ...who(partner) }));
export const cancelWedding = (partner?: string) => after(call<null>("cancel_wedding", who(partner)));
export const resolveDiscovery = (relationship: number, forgive: boolean) => after(call<null>("resolve_discovery", { p_relationship: relationship, p_forgive: forgive }));

// ---------------------------------------------------------------- family: relatives and children

export type Relation = "sibling" | "cousin" | "parent" | "child";
export interface Relative { id: number; status: "pending" | "accepted"; mine: boolean; relation: Relation; person: Person }
export interface Child {
  id: number; name: string | null; gender: "boy" | "girl"; conceivedAt: string; dueAt: string; born: boolean; nannyUntil: string | null;
  mother: { id: string; username: string; look?: AvatarLookProps }; father: { id: string; username: string; look?: AvatarLookProps };
  /** Hospital scans done (1 first, 2 anatomy, 3 growth), and the birth at the hospital, if it happened there. */
  scans?: number[]; deliveredAt?: string | null; bornAt?: string | null; birthScore?: number | null;
  careToday: Array<"feed" | "play" | "bath">; careRecent: number;
}
export interface MyFamily { relatives: Relative[]; children: Child[] }

/** What a relative is called, by their gender: a sibling who's a man is a brother. */
export const relationLabel = (relation: Relation, gender?: string | null) => {
  const r = FAMILY.relations.find((x) => x.id === relation);
  return r ? (gender === "woman" ? r.woman : r.man) : relation;
};
/** A child's stage now: newborn, crawling, first steps… a new one each week after birth. */
export function stageOf(child: Pick<Child, "dueAt">, now: number) {
  const weeks = Math.max(0, Math.floor((now - Date.parse(child.dueAt)) / (7 * 86_400_000)));
  const stage = [...FAMILY.stages].reverse().find((s) => weeks >= s.week) ?? FAMILY.stages[0];
  const next = FAMILY.stages.find((s) => s.week > weeks) ?? null;
  return { weeks, stage, next };
}
/** How happy a child is (0 to 100): the care they've had over the last 3 days, or full with a nanny. */
export function happinessOf(child: Pick<Child, "careRecent" | "nannyUntil" | "deliveredAt">, now: number) {
  if (child.nannyUntil && Date.parse(child.nannyUntil) > now) return 100;
  // Born at the hospital: a healthy start, happier for the first days.
  const healthy = child.deliveredAt && now - Date.parse(child.deliveredAt) < FAMILY.maternity.healthyStartDays * 86_400_000 ? FAMILY.maternity.healthyStartBonus : 0;
  return Math.min(100, Math.round((child.careRecent / (FAMILY.care.length * FAMILY.careWindowDays)) * 100) + healthy);
}

export interface PregnancyProgress {
  trimester: 1 | 2 | 3;
  trimesterLabel: string;
  daysLeft: number;
  totalDays: number;
  elapsedDays: number;
  progressPct: number;
  dueAtFormatted: string;
}

/** Automatically defines pregnancy trimester based on total duration and remaining days */
export function calculatePregnancyStage(child: Pick<Child, "conceivedAt" | "dueAt">, now: number): PregnancyProgress {
  const due = Date.parse(child.dueAt);
  const conceived = child.conceivedAt ? Date.parse(child.conceivedAt) : due - (FAMILY.pregnancyDays || 7) * 86_400_000;
  const totalMs = Math.max(86_400_000, due - conceived);
  const totalDays = Math.max(1, Math.round(totalMs / 86_400_000));
  const elapsedMs = Math.max(0, Math.min(totalMs, now - conceived));
  const remainingMs = Math.max(0, due - now);
  const daysLeft = Math.max(0, Math.ceil(remainingMs / 86_400_000));
  const elapsedDays = Math.min(totalDays, Math.floor(elapsedMs / 86_400_000));
  const progressRatio = Math.min(1, Math.max(0, elapsedMs / totalMs));
  const progressPct = Math.min(100, Math.round(progressRatio * 100));

  let trimester: 1 | 2 | 3 = 1;
  if (progressRatio >= 2 / 3 || daysLeft <= Math.ceil(totalDays / 3)) {
    trimester = 3;
  } else if (progressRatio >= 1 / 3 || daysLeft <= Math.ceil((2 * totalDays) / 3)) {
    trimester = 2;
  }

  const trimesterLabel =
    trimester === 1 ? "1st Trimester" : trimester === 2 ? "2nd Trimester" : "3rd Trimester";

  const dueAtFormatted = new Date(due).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return {
    trimester,
    trimesterLabel,
    daysLeft,
    totalDays,
    elapsedDays,
    progressPct,
    dueAtFormatted,
  };
}

let family: MyFamily | null = null;
const familyListeners = new Set<() => void>();
// Without the family tables yet (or offline), show an empty family rather than loading forever.
export const reloadFamily = () => call<MyFamily>("my_family").then((r) => { family = { relatives: r.data?.relatives ?? [], children: r.data?.children ?? [] }; familyListeners.forEach((l) => l()); });
export function useFamily(me: string | null | undefined): MyFamily | null {
  useEffect(() => { if (me) void reloadFamily(); }, [me]);
  return useSyncExternalStore((l) => { familyListeners.add(l); return () => { familyListeners.delete(l); }; }, () => family, () => null);
}
const afterFamily = async <T,>(p: Promise<{ data?: T; error?: string }>) => { const r = await p; await Promise.all([reloadFamily(), reloadLove(), refreshCitizen()]); return r; };
export const askForBaby = (partner?: string) => afterFamily(call<number>("ask_for_baby", who(partner)));
export const nameChild = (child: number, name: string) => afterFamily(call<null>("name_child", { p_child: child, p_name: name }));
export const careForChild = (child: number, action: string) => afterFamily(call<null>("care_for_child", { p_child: child, p_action: action }));
export const recordScan = (child: number, stage: number, hospital: string) => afterFamily(call<number[]>("record_scan", { p_child: child, p_stage: stage, p_hospital: hospital }));
export const deliverBaby = (child: number, hospital: string, score: number) => afterFamily(call<{ id: number; bornAt: string; dueAt: string }>("deliver_baby", { p_child: child, p_hospital: hospital, p_score: score }));
export const hireNanny = (child: number, plan: string) => afterFamily(call<string>("hire_nanny", { p_child: child, p_plan: plan }));
export const addRelative = (to: string, relation: Relation) => afterFamily(call<null>("add_relative", { p_to: to, p_relation: relation }));
export const respondRelative = (id: number, accept: boolean) => afterFamily(call<null>("respond_relative", { p_link: id, p_accept: accept }));
export const removeRelative = (id: number) => afterFamily(call<null>("remove_relative", { p_link: id }));
export const weddingView = (code: string) => call<WeddingView>("wedding_view", { p_code: code });
export const rsvp = (code: string, yes: boolean) => call<null>("rsvp_wedding", { p_code: code, p_yes: yes });
export const setRole = (code: string, user: string, role: string) => call<null>("set_wedding_role", { p_code: code, p_user: user, p_role: role });
export const giveGift = (code: string, amount: number, message?: string) => after(call<null>("wedding_gift", { p_code: code, p_amount: amount, p_message: message ?? null }));
export const sayIDo = (code: string) => after(call<{ married: boolean }>("say_i_do", { p_code: code }));

export const weddingLink = (code: string, ref?: string) => `${typeof window === "undefined" ? "" : window.location.origin}/wedding/${code}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
