// Event halls: the hotels' ballrooms (src/data/venues/halls.json), booking one for an event, and its design.
// The server checks prices and availability and creates the party invite at the hall (book_hall).

import HALLS from "@/data/venues/halls.json";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import type { AvatarLookProps } from "@/components/avatar/roster";

export type Hall = (typeof HALLS.halls)[number];
export type EventType = (typeof HALLS.types)[number];
export type Theme = (typeof HALLS.themes)[number];
export type Prop = (typeof HALLS.props)[number];
export const hallById = (id: string) => HALLS.halls.find((h) => h.id === id) ?? null;

export interface HallBooking {
  id: number; hall: string; type: string; title: string; startsAt: string; endsAt: string; guests: number; vendors: string[]; cost: number;
  code: string | null; design: HallDesign | null; score: number | null;
}
/** What the host chose: the theme, a prop per slot, and who sits where. */
export interface HallDesign { theme: string; props: Record<string, string>; tables: string[][] }

/** What a booking will cost: the hall, the guests and the vendors (the server charges the same). */
export function bookingCost(hall: Hall, guests: number, vendors: string[]) {
  return hall.base + hall.perGuest * guests + vendors.reduce((sum, id) => {
    const v = HALLS.vendors.find((x) => x.id === id);
    return sum + (v ? ("perGuest" in v && v.perGuest ? v.perGuest * guests : ("price" in v ? v.price ?? 0 : 0)) : 0);
  }, 0);
}

const ERRORS: Record<string, string> = {
  hall_booked: "The hall is booked then. Try another time.",
  bad_time: "Pick a time between an hour and 30 days from now.",
  bad_guests: "That's more guests than the hall holds.",
  insufficient_funds: "You don't have enough AED for that booking.",
  not_your_booking: "That isn't your booking.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

/** The event on at a hall right now (anyone there can watch it live). */
export interface LiveHallEvent { id: number; title: string; type: string; design: HallDesign | null; startsAt: string; endsAt: string; host: { id: string; username: string; look?: AvatarLookProps } }
export const hallEventLive = (hall: string) => call<LiveHallEvent | null>("hall_event_live", { p_hall: hall });
/** Window event carrying hall moments from the venue's live room to the event screens. */
export const HALL_EVENT = "dubailife:hall-moment";

/** A hall booking as a space (/hall/<id>): for its host, its decorator and its guests. */
export interface HallSpace {
  id: number; hall: string; title: string; type: string; startsAt: string; endsAt: string; guests: number; code: string | null;
  design: { furniture?: import("@/lib/furniture").OwnedFurniture[]; style?: import("@/lib/furniture").HomeStyle } | null;
  isHost: boolean; host: { id: string; username: string; look?: AvatarLookProps };
  decorating: { id: number; status: string; decorator: string | null } | null;
}
export const hallSpace = (id: number) => call<HallSpace | null>("hall_space", { p_booking: id });
export const saveHallSpace = (id: number, design: { furniture: import("@/lib/furniture").OwnedFurniture[]; style: import("@/lib/furniture").HomeStyle }) => call<null>("save_hall_space", { p_booking: id, p_design: design });

export const myHallBookings = () => call<HallBooking[]>("my_hall_bookings");
export async function bookHall(hall: string, type: string, startsAt: Date, guests: number, vendors: string[], title: string) {
  const r = await call<{ id: number; code: string; cost: number }>("book_hall", { p_hall: hall, p_type: type, p_starts_at: startsAt.toISOString(), p_guests: guests, p_vendors: vendors, p_title: title });
  if (r.data) void refreshCitizen();
  return r;
}
export const saveHallDesign = (booking: number, design: HallDesign, score: number) => call<null>("save_hall_design", { p_booking: booking, p_design: design, p_score: score });
export async function cancelHallBooking(booking: number) {
  const r = await call<number>("cancel_hall_booking", { p_booking: booking });
  if (r.data) void refreshCitizen();
  return r;
}
