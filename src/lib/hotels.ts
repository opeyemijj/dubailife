"use client";

// Hotel stays (src/data/hotels/suites.json; the database: *_hotels.sql): book a luxury suite at any hotel on the map,
// check in, and stay in it (src/app/hotel/[stayId]) for the nights you paid for.

import { supabase } from "@/lib/supabase/client";
import { PLACES } from "@/lib/city/places";
import HOTELS from "@/data/hotels/suites.json";

export { HOTELS };
export type Suite = (typeof HOTELS.suites)[number];
export type RoomServiceItem = (typeof HOTELS.roomService)[number];
export type SuiteActivity = (typeof HOTELS.activities)[number];

export interface Stay {
  id: number; place_id: string; hotel_name: string; suite: string; nights: number; per_night: number; total: number;
  status: "booked" | "checked_in" | "checked_out"; room: string; created_at: string; checked_in_at: string | null; check_out_by: string;
}

/** Every hotel on the map. */
export const ALL_HOTELS = PLACES.filter((p) => p.kind === "hotel").sort((a, b) => a.name.localeCompare(b.name));
export const suiteOf = (id: string) => HOTELS.suites.find((s) => s.id === id);

const ERR: Record<string, string> = {
  insufficient_funds: "You don't have enough for that. Pick fewer nights or a different suite.",
  already_staying: "You're already staying in a hotel. Check out first.",
  stay_over: "This stay has ended.",
  not_staying: "You need to be checked in for room service.",
};
const friendly = (m: string) => ERR[Object.keys(ERR).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

export const bookHotel = (placeId: string, hotel: string, suite: string, nights: number) =>
  call<number>("book_hotel", { p_place: placeId, p_hotel: hotel, p_suite: suite, p_nights: nights });
export const checkIn = (stay: number) => call<null>("hotel_check_in", { p_stay: stay });
export const checkOut = (stay: number) => call<null>("hotel_check_out", { p_stay: stay });
export const roomService = (stay: number, item: string) => call<number>("hotel_room_service", { p_stay: stay, p_item: item });
export const myStay = () => call<Stay | null>("my_hotel_stay", {});
export const stayById = (id: number) => call<Stay | null>("hotel_stay", { p_stay: id });

/** "2 nights left", "5 hours left". */
export function timeLeft(stay: Stay, now = Date.now()) {
  const ms = Date.parse(stay.check_out_by) - now;
  if (ms <= 0) return "Check-out time";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `${Math.ceil(h / 24)} night${Math.ceil(h / 24) === 1 ? "" : "s"} left` : `${Math.max(1, h)} hour${h === 1 ? "" : "s"} left`;
}
