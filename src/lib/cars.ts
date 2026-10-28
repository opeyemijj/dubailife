"use client";

// Renting and buying cars (src/data/cars/cars.json, enforced in *_cars.sql). Both need the driving
// licence the Driving Academy issues when you pass.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import CARS from "@/data/cars/cars.json";

export { CARS };
export type Car = (typeof CARS.cars)[number] & { suv?: boolean; low?: boolean };
export type Shop = { id: string; name: string; icon: string; color: string; blurb: string; rent: boolean; cars: Car[] };
export interface Garage {
  licence: { number: string; issuedAt: string } | null;
  owned: Array<{ id: number; car: string; dealer: string; plate: string; price: number; registeredUntil: string; insuredUntil: string; boughtAt: string }>;
  rental: { id: number; car: string; company: string; days: number; endsAt: string; deposit: number } | null;
}

export const carOf = (id: string) => CARS.cars.find((c) => c.id === id) as Car | undefined;
export function shopOf(id: string): Shop | null {
  const r = CARS.rentals.find((x) => x.id === id);
  if (r) return { ...r, rent: true, cars: r.fleet.map(carOf).filter((c): c is Car => !!c) };
  const d = CARS.dealers.find((x) => x.id === id);
  if (d) return { ...d, rent: false, cars: d.stock.map(carOf).filter((c): c is Car => !!c) };
  return null;
}
export const rentCost = (car: Car, days: number) => Math.round(car.day * days * (days === 7 ? 1 - CARS.weekDiscount : days === 30 ? 1 - CARS.monthDiscount : 1));
export const insuranceFor = (car: Car) => Math.max(CARS.minInsurance, Math.floor((car.price * CARS.insurancePercent) / 100));
export const buyTotal = (car: Car) => car.price + insuranceFor(car) + CARS.registration;

const ERRORS: Record<string, string> = {
  needs_licence: "You need a driving licence. Pass your test at the Driving Academy first.",
  already_renting: "You already have a rental. Return it first.",
  insufficient_funds: "You don't have enough AED for that.",
  not_offered: "That car isn't available here.",
  no_rental: "You don't have a rental to return.",
  already_charged: "You already have a case open with Dubai Police.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  if (!error) void refreshCitizen();
  return error ? { error: friendly(error.message) } : { data: data as T };
}

export function useGarage(me: string | null | undefined) {
  const [garage, setGarage] = useState<Garage | null>(null);
  const reload = useCallback(async () => {
    const { data } = await supabase().rpc("my_garage");
    if (data) setGarage(data as Garage);
  }, []);
  useEffect(() => { if (me) { const t = setTimeout(() => void reload(), 0); return () => clearTimeout(t); } }, [me, reload]);
  return { garage, reload };
}

export const rentCar = (company: string, car: string, days: number) => call<number>("rent_car", { p_company: company, p_car: car, p_days: days });
export const returnCar = () => call<{ caught: boolean; caseId?: number }>("return_car");
/** Renting on a fake licence: usually spotted, and then the police are called. */
export const rentCarFake = (company: string, car: string, days: number) => call<{ caught: boolean; caseId?: number; rentalId?: number }>("rent_car_fake", { p_company: company, p_car: car, p_days: days });
export const buyCar = (dealer: string, car: string) => call<{ plate: string; total: number; insurance: number }>("buy_car", { p_dealer: dealer, p_car: car });
export const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
