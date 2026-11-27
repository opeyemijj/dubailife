"use client";

// Family trips (src/data/flights/trips.json; the database: *_family_trips.sql): you pay at the check-in counter for
// your partner(s) and children too; each partner gets an invite (TripInviteHost) and, once they accept, flies in the
// seat beside yours; your children travel with you. What the trip is for (vacation, honeymoon, babymoon, gender
// reveal) shows on the City Feed and in the welcome when you land.

import { useEffect, useState } from "react";
import TRIPS from "@/data/flights/trips.json";
import { supabase } from "@/lib/supabase/client";
import type { CityId } from "@/lib/city/cities";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { Booking, CabinClass } from "@/lib/flights";

export { TRIPS };
export type Purpose = "vacation" | "honeymoon" | "babymoon" | "gender_reveal";
export const purposeOf = (id: string) => TRIPS.purposes.find((p) => p.id === id) ?? TRIPS.purposes[0];
interface Who { id: string; username: string; look?: AvatarLookProps | null }
export interface TripInvite { trip: number; from: CityId; to: CityId; class: CabinClass; purpose: Purpose; kids: number; by: Who; expiresAt: string }
export interface CurrentTrip {
  trip: number; purpose: Purpose; to: CityId; mine: boolean; flightStatus: string | null; booker: Who;
  guests: Array<Who & { status: "invited" | "accepted" | "declined" | "expired" }>;
  kids: Array<{ id: number; name: string | null; gender: "boy" | "girl" }>;
  reveal: "boy" | "girl" | null;
}
export interface MyTrips { invites: TripInvite[]; current: CurrentTrip | null }

const ERR: Record<string, string> = {
  not_your_partner: "You can only bring a partner you're in a relationship with.",
  not_your_child: "You can only bring your own children.",
  not_married: "A honeymoon is for a partner you're married to.",
  not_expecting: "A babymoon or gender reveal is for when you're expecting.",
  too_many: "That's too many travellers for one booking.",
  insufficient_funds: "You don't have enough AED for everyone's tickets.",
  wrong_city: "Flights leave from the city you're in: fly there first.",
  visa_required: "You need a visa for this country first.",
  no_invite: "This invite isn't open any more.",
};
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) return { error: ERR[Object.keys(ERR).find((k) => error.message.includes(k)) ?? ""] ?? error.message };
  return { data: data as T };
}
export const bookFamilyTrip = (from: CityId, to: CityId, cls: CabinClass, purpose: Purpose, partners: string[], kids: number[]) =>
  call<Booking & { trip: number }>("book_family_trip", { p_from: from, p_to: to, p_class: cls, p_purpose: purpose, p_partners: partners, p_kids: kids });
export const respondTrip = (trip: number, accept: boolean) => call<(Booking & { trip: number }) | null>("respond_trip", { p_trip: trip, p_accept: accept });
export const tripFlight = (trip: number) => call<(Booking & { trip: number }) | null>("my_trip_flight", { p_trip: trip });
/** The trip fare: everyone's seats, children at kidFare. */
export const tripTotal = (fare: number, partners: number, kids: number) => fare + fare * partners + Math.round(fare * TRIPS.kidFare) * kids;

let cache: { user: string; data: MyTrips } | null = null;
const listeners = new Set<() => void>();
export async function refreshTrips(user: string) {
  const r = await call<MyTrips>("my_trips");
  if (r.data) { cache = { user, data: r.data }; listeners.forEach((f) => f()); }
}
/** My trip invites and the trip I'm on (refreshed every minute). */
export function useTrips(user: string | null | undefined): MyTrips | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!user) return;
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    void refreshTrips(user);
    const id = setInterval(() => void refreshTrips(user), 60000);
    return () => { listeners.delete(f); clearInterval(id); };
  }, [user]);
  return user && cache?.user === user ? cache.data : null;
}
/** A child on the trip as a small traveller (looks: a boy or a girl). */
export const kidLook = (gender: "boy" | "girl"): AvatarLookProps => ({ gender: gender === "boy" ? "man" : "woman" });
