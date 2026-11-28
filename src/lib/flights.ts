"use client";

// Flying between the cities with Dubai Life Airways (fictional): the routes, cabins and fares
// (src/data/flights/flights.json, charged by public.book_flight), and duty free at the terminal. The journey itself
// (check-in, passport control, the gate, boarding, the flight, landing) is src/app/fly; landing moves you to the
// other city's map (your location's city, lib/city/cities).

import FLIGHTS from "@/data/flights/flights.json";
import { supabase } from "@/lib/supabase/client";
import { updateCitizen } from "@/lib/citizenStore";
import { CITIES, type CityId } from "@/lib/city/cities";
import { entranceOf } from "@/lib/city/geo";
import { refreshCity } from "@/lib/city/presence";

export { FLIGHTS };
export type CabinClass = "economy" | "business" | "first";
export type Route = (typeof FLIGHTS.routes)[number];
export interface Booking { id: number; seat: string; fare: number; class: CabinClass; from: CityId; to: CityId }

export const AIRLINE = FLIGHTS.airline;
export const airportOf = (city: CityId) => FLIGHTS.airports[city];
export const routeOf = (from: CityId, to: CityId) => FLIGHTS.routes.find((r) => r.from === from && r.to === to) ?? null;
export const routesFrom = (from: CityId) => FLIGHTS.routes.filter((r) => r.from === from);
export const cabinOf = (id: CabinClass) => FLIGHTS.classes.find((c) => c.id === id)!;
/** A flight number for the route (stable, so it reads the same every time). */
export const flightNumber = (from: CityId, to: CityId) => {
  const order = Object.keys(FLIGHTS.airports);
  return `${AIRLINE.code} ${(order.indexOf(from) + 1) * 100 + (order.indexOf(to) + 1) * 7}`;
};

const ERRORS: Record<string, string> = {
  insufficient_funds: "You don't have enough AED for this ticket.",
  bad_route: "There's no flight on that route.",
  wrong_city: "Flights leave from the city you're in.",
  visa_required: "You need a visa for this country first.",
  not_in_city: "You can only do that in the city you're in.",
  not_signed_in: "Please log in first.",
  no_flight: "That booking isn't open any more.",
  flight_replaced: "You booked another flight after this one (maybe in another tab), so this booking was replaced.",
};
async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) return { error: ERRORS[error.message.split(":")[0]] ?? error.message };
  return { data: data as T };
}

export const bookFlight = (from: CityId, to: CityId, cls: CabinClass) => call<Booking>("book_flight", { p_from: from, p_to: to, p_class: cls });
export const flightProgress = (id: number, status: "boarded" | "landed") => call<null>("flight_progress", { p_flight: id, p_status: status });
export const buyDutyFree = (item: string) => call<number>("buy_duty_free", { p_item: item });

/** Landed: you're now outside the arrival airport in the other city (and the server agrees: lib/city/presence). */
export async function arriveIn(city: CityId) {
  const placeId = CITIES[city].airport;
  const at = entranceOf(placeId) ?? { x: 2000, y: 1300 };
  updateCitizen((c) => ({ ...c, location: { ...at, placeId, city } }));
  await refreshCity();
}
