"use client";

// Visas for flying to another country (src/data/flights/visas.json): you live in the UAE, so Dubai and Abu Dhabi need
// none; Doha needs a Qatar visa. Apply (public.apply_visa), wait for the review, and the server lets you book
// (public.book_flight refuses a flight there without one).

import VISAS from "@/data/flights/visas.json";
import { supabase } from "@/lib/supabase/client";
import type { CityId } from "@/lib/city/cities";

export { VISAS };
export type VisaCountry = keyof typeof VISAS.countries;
export interface Visa { id: number; country: string; kind: string; status: "review" | "approved"; number: string | null; purpose: string; stay: string; applied_at: string; ready_at: string; valid_until: string | null }

/** The country whose visa flying to this city needs (none for the UAE, home). */
export const visaCountryFor = (city: CityId): VisaCountry | null => ((VISAS.cityCountry as Record<string, VisaCountry>)[city] ?? null);
export const countryOf = (c: VisaCountry) => VISAS.countries[c];

const ERR: Record<string, string> = {
  already_have: "You already have a visa (or an application) for this country.",
  insufficient_funds: "You don't have enough AED for the visa fee.",
  incomplete: "Please fill in why you're going and where you'll stay.",
  bad_visa: "That visa isn't available.",
};

export async function myVisa(country: VisaCountry): Promise<Visa | null> {
  const { data } = await supabase().rpc("my_visa", { p_country: country });
  return (data as Visa | null) ?? null;
}
export async function applyVisa(country: VisaCountry, kind: string, purpose: string, stay: string): Promise<{ data?: Visa; error?: string }> {
  const { data, error } = await supabase().rpc("apply_visa", { p_country: country, p_kind: kind, p_purpose: purpose, p_stay: stay });
  if (error) return { error: ERR[error.message.split(":")[0]] ?? error.message };
  return { data: data as Visa };
}
