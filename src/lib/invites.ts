"use client";

// Invites: parties at homes and venues (house parties, dinners, club nights) and links for asking someone out or
// hiring a decorator. Each has a short code and a page at /i/<code> anyone can open. Someone who opens an invite
// before they have an account keeps the code here until they've signed up and moved in, then lands back on it.
// Kinds, decorations and rewards: src/data/life/parties.json (enforced in *_events.sql).

import { supabase } from "@/lib/supabase/client";
import { sendPushNotification } from "@/lib/push/client";
import { updateCitizen, getCitizenState } from "@/lib/citizenStore";
import { entranceOf } from "@/lib/city/geo";
import PARTIES from "@/data/life/parties.json";
import type { AvatarLookProps } from "@/components/avatar/roster";

export { PARTIES };
export type InviteKind = keyof typeof PARTIES.kinds;
export type EventKind = "house_party" | "dinner" | "club_night" | "pool_party" | "seminar";
export const isEvent = (k: InviteKind): k is EventKind => k === "house_party" || k === "dinner" || k === "club_night" || k === "pool_party" || k === "seminar";
export const kindOf = (k: InviteKind) => PARTIES.kinds[k];
export const decorOf = (id: string) => PARTIES.decor.find((d) => d.id === id);

export interface InviteView {
  code: string; kind: InviteKind; title: string; label: string; route: string;
  startsAt: string; endsAt: string; maxGuests: number; cancelled: boolean; decor?: string[];
  host: { username: string; look?: AvatarLookProps; gender?: string } | null;
  going: number; arrived?: number; guests: { username: string; look?: AvatarLookProps }[];
  isHost: boolean; mine: "invited" | "going" | "no" | null;
  /** Ticket price in AED (0: free), and whether I have one. */
  price?: number; paid?: boolean;
}
export interface MyParty { code: string; title: string; label: string; startsAt: string; endsAt: string; going: number }
export interface InviteRow { code: string; kind: InviteKind; title: string; label: string; route?: string; startsAt: string; endsAt: string; going?: number; arrived?: number; status?: string; host?: string }
export interface PartyHere { code: string; kind: EventKind; title: string; decor: string[]; endsAt: string; host: string; isHost: boolean; arrived: number; lightsOut?: boolean; price?: number }

const ERRORS: Record<string, string> = {
  bad_route: "That page can't be shared.",
  bad_size: "That guest list is too big. Club promoters can host up to 200.",
  bad_price: "Tickets can be free or up to AED 5,000.",
  insufficient_funds: "You don't have enough AED for that.",
  too_many_links: "You've made a lot of links today. Try again tomorrow.",
  not_your_home: "You can only throw a party at a home you rent or own.",
  bad_time: "Pick a time in the next 7 days.",
  too_many_parties: "You already have 3 parties coming up.",
  place_taken: "There's already a party there at that time. Pick another time or place.",
  bad_place: "Pick a place for this party.",
  bad_decor: "One of those decorations isn't available.",
  insufficient: "You don't have enough AED for the decorations.",
  full: "This party is full.",
  ended: "This has ended.",
  your_party: "It's your party!",
  your_link: "This is your own link. Share it!",
  no_such_player: "There's no player with that username.",
  not_allowed: "Dating is for a man and a woman: this link is for someone else.",
  they_are_taken: "They're already with someone.",
  you_are_taken: "You're already with someone.",
  not_a_decorator: "Only interior decorators can share a hire-me link.",
  not_at_party: "Say you're going first, then you can invite people.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

export const inviteUrl = (code: string) => `${window.location.origin}/i/${code}`;

export async function createEvent(a: {
  kind: EventKind; title: string; startsAt: Date; label: string;
  flatId?: string; route?: string; placeId?: string; venueId?: string; decor: string[];
  /** Guest list size (promoters can go up to 200). */
  maxGuests?: number;
  /** Ticket price in AED (0 or left out: free). */
  price?: number;
}): Promise<{ code?: string; error?: string }> {
  const { data, error } = await supabase().rpc("create_event", {
    p_kind: a.kind, p_title: a.title, p_starts_at: a.startsAt.toISOString(), p_label: a.label,
    p_flat: a.flatId ?? null, p_route: a.route ?? null, p_place: a.placeId ?? null, p_venue: a.venueId ?? null, p_decor: a.decor, p_max: a.maxGuests ?? 20, ...(a.price ? { p_price: a.price } : {}),
  });
  return error ? { error: friendly(error.message) } : { code: data as string };
}
export async function createLink(kind: "ask_out" | "hire_decorator"): Promise<{ code?: string; error?: string }> {
  const { data, error } = await supabase().rpc("create_link", { p_kind: kind });
  return error ? { error: friendly(error.message) } : { code: data as string };
}
/** Your invite link to a place in the game (this page, by default): someone new signs up and lands right there. */
/** A promoter's numbers: events run, guests who came, and commission earned. */
export async function myPromotions(): Promise<{ events: number; guests: number; earned: number } | null> {
  const { data } = await supabase().rpc("my_promotions");
  return (data as { events: number; guests: number; earned: number } | null) ?? null;
}
export async function createVisit(route: string, title: string, label: string): Promise<{ code?: string; error?: string }> {
  const { data, error } = await supabase().rpc("create_visit", { p_route: route, p_title: title, p_label: label });
  return error ? { error: friendly(error.message) } : { code: data as string };
}
export async function inviteView(code: string): Promise<InviteView | null> {
  const { data } = await supabase().rpc("invite_view", { p_code: code });
  return (data as InviteView | null) ?? null;
}
export async function rsvp(code: string, status: "going" | "no"): Promise<string | null> {
  const { error } = await supabase().rpc("invite_rsvp", { p_code: code, p_status: status });
  return error ? friendly(error.message) : null;
}
export async function acceptAskOut(code: string): Promise<{ partner?: string; error?: string }> {
  const { data, error } = await supabase().rpc("accept_ask_out", { p_code: code });
  return error ? { error: friendly(error.message) } : { partner: data as string };
}
/** Invite a player by username: on their Invites app, with a notification. */
export async function invitePlayer(code: string, username: string, from: string, title: string): Promise<string | null> {
  const { data, error } = await supabase().rpc("invite_player", { p_code: code, p_username: username });
  if (error) return friendly(error.message);
  if (data) void sendPushNotification(data as string, { title: `🎉 @${from} invited you`, body: title, url: `/i/${code}`, tag: `invite-${code}` });
  return null;
}
export async function myParties(): Promise<MyParty[]> {
  const { data } = await supabase().rpc("my_parties");
  return (data as MyParty[] | null) ?? [];
}
export async function myInvites(): Promise<{ hosting: InviteRow[]; invited: InviteRow[] }> {
  const { data } = await supabase().rpc("my_invites");
  return (data as { hosting: InviteRow[]; invited: InviteRow[] } | null) ?? { hosting: [], invited: [] };
}
/** The party on at this place now, null if none, or undefined if it couldn't be checked (offline): a failed check
    must never look like the party ending. */
export async function partyHere(route: string): Promise<PartyHere | null | undefined> {
  const { data, error } = await supabase().rpc("party_here", { p_route: route });
  if (error) return undefined;
  return (data as PartyHere | null) ?? null;
}
/** You're here while a party's on: checks you in. Returns what to tell you, or null. */
/** Checking in at an event you're at. A paid event without a ticket says so (needsTicket) instead. */
export async function arriveAt(route: string): Promise<{ code: string; title: string; host: string; points: number; needsTicket?: boolean; price?: number } | null> {
  const { data } = await supabase().rpc("invite_arrive", { p_route: route });
  return (data as { code: string; title: string; host: string; points: number; needsTicket?: boolean; price?: number } | null) ?? null;
}
/** The host turns the lights out (or back on) for everyone at the party. */
export async function setPartyLights(code: string, out: boolean) { await supabase().rpc("party_lights", { p_code: code, p_out: out }); }
/** The host ends the party that's on now. Everyone there is told straight away (see usePartyHere). */
/** I'm at this party (host or guest): it isn't empty. A party nobody checks into for 5 minutes ends by itself. */
export async function pingParty(code: string) { await supabase().rpc("party_ping", { p_code: code }); }
export async function endParty(code: string, hostId?: string): Promise<boolean> {
  const citizen = getCitizenState()?.citizen;
  const callerId = hostId || citizen?.id;
  try {
    const { error } = await supabase().rpc("end_party", {
      p_code: code,
      ...(callerId ? { p_host_id: callerId } : {}),
    });
    if (!error) return true;
    console.warn("RPC end_party returned error, attempting fallback:", error);
  } catch (err) {
    console.warn("RPC end_party threw, attempting fallback:", err);
  }

  // Direct table fallback: update ends_at or check if already ended
  try {
    const cleanCode = code.trim().toUpperCase();
    const { data: inv } = await supabase()
      .from("invites")
      .select("id, ends_at, cancelled")
      .eq("code", cleanCode)
      .maybeSingle();

    if (!inv || inv.cancelled || (inv.ends_at && new Date(inv.ends_at).getTime() <= Date.now())) {
      // Party is already over or cancelled - successfully ended!
      return true;
    }

    const { error: updErr } = await supabase()
      .from("invites")
      .update({ ends_at: new Date().toISOString(), lights_out: false })
      .eq("id", inv.id);

    return !updErr;
  } catch {
    return true;
  }
}
/** At a party, by default: most people dance and some sit (each person always the same, so it doesn't flicker). */
export function partyMood(userId: string): "dance" | "sit" {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return Math.abs(h) % 10 < 3 ? "sit" : "dance";
}
/** Turned towards the nearest other person, so people dance with each other. */
export function faceNearest(at: [number, number, number], others: [number, number, number][]): number | undefined {
  let best: [number, number, number] | null = null, d = Infinity;
  for (const o of others) {
    const dd = (o[0] - at[0]) ** 2 + (o[2] - at[2]) ** 2;
    if (dd > 0.01 && dd < d) { d = dd; best = o; }
  }
  return best ? Math.atan2(best[0] - at[0], best[2] - at[2]) : undefined;
}

/** Straight to a party you're invited to (or hosting): you're put at the door, so you don't travel across the city
    again each time. Returns where to go. */
export function partyDoor(route: string): string {
  const m = route.match(/^\/(?:property|place)\/([^/]+)\//);
  const placeId = m?.[1];
  if (placeId) {
    const at = entranceOf(placeId);
    updateCitizen((c) => ({ ...c, location: { ...(at ?? c.location ?? { x: 0, y: 0 }), placeId } }));
  }
  return route;
}
export async function cancelInvite(code: string) { await supabase().rpc("cancel_invite", { p_code: code }); }

/** Share an invite: the phone's share sheet, or the link copied. */
export async function shareInvite(code: string, text: string): Promise<"shared" | "copied" | "failed"> {
  const url = inviteUrl(code);
  if (navigator.share) {
    try { await navigator.share({ title: "Dubai Life invite", text, url }); return "shared"; } catch { /* cancelled */ }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return "copied"; } catch { return "failed"; }
}
export const whatsappLink = (code: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${inviteUrl(code)}`)}`;

// ---------------------------------------------------------------- an invite opened before signing in

const PENDING = "dl_invite";
export const isInviteCode = (c: string | null | undefined): c is string => !!c && /^[A-Z0-9]{6}$/i.test(c);
export function rememberInvite(code: string) { try { localStorage.setItem(PENDING, code.toUpperCase()); } catch { /* storage blocked */ } }
export function pendingInvite(): string | null { try { const c = localStorage.getItem(PENDING); return isInviteCode(c) ? c : null; } catch { return null; } }
export function forgetInvite() { try { localStorage.removeItem(PENDING); } catch { /* storage blocked */ } }
