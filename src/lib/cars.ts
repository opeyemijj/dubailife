"use client";

// Renting and buying cars (src/data/cars/cars.json, enforced in *_cars.sql). Both need the driving
// license the Driving Academy issues when you pass.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import CARS from "@/data/cars/cars.json";

export { CARS };
export type Car = (typeof CARS.cars)[number] & { suv?: boolean; low?: boolean; electric?: boolean };
export type Shop = { id: string; name: string; icon: string; color: string; blurb: string; rent: boolean; cars: Car[] };
export interface Garage {
  licence: { number: string; issuedAt: string } | null;
  /** Accidents on your current licence (the third revokes it), and when it was revoked if it was. */
  accidents?: number;
  revokedAt?: string | null;
  owned: Array<{ id: number; car: string; dealer: string; plate: string; price: number; registeredUntil: string; insuredUntil: string; boughtAt: string; fuel: number; impoundedUntil: string | null }>;
  rental: { id: number; car: string; company: string; days: number; endsAt: string; deposit: number; fuel: number } | null;
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
  needs_licence: "You need a driving license. Pass your test at the Driving Academy first.",
  already_renting: "You already have a rental. Return it first.",
  insufficient_funds: "You don't have enough AED for that.",
  not_offered: "That car isn't available here.",
  no_rental: "You don't have a rental to return.",
  already_charged: "You already have a case open with Dubai Police.",
  in_custody: "You're in police custody. Get released first (bail, a lawyer, or wait out the time).",
  no_car: "That car isn't yours to drive any more.",
  impounded: "That car is in the police impound.",
  not_impounded: "That car isn't impounded.",
  bad_hours: "Choose 1, 2 or 4 hours.",
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
/** Renting on a fake license: usually spotted, and then the police are called. */
export const rentCarFake = (company: string, car: string, days: number) => call<{ caught: boolean; caseId?: number; rentalId?: number }>("rent_car_fake", { p_company: company, p_car: car, p_days: days });
export const buyCar = (dealer: string, car: string) => call<{ plate: string; total: number; insurance: number }>("buy_car", { p_dealer: dealer, p_car: car });
export const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

/** A car you can drive: one of yours (not impounded) or your rental. */
export interface Drivable { kind: "owned" | "rental"; id: number; car: Car; plate: string; fuel: number }
export function drivables(g: Garage | null, now: number): Drivable[] {
  if (!g) return [];
  const out: Drivable[] = [];
  for (const o of g.owned) {
    const car = carOf(o.car);
    if (car && !(o.impoundedUntil && Date.parse(o.impoundedUntil) > now)) out.push({ kind: "owned", id: o.id, car, plate: o.plate, fuel: Number(o.fuel) });
  }
  const r = g.rental, rc = r && carOf(r.car);
  if (r && rc && Date.parse(r.endsAt) > now) out.push({ kind: "rental", id: r.id, car: rc, plate: "RENTAL", fuel: Number(r.fuel) });
  return out;
}
/** Fuel (% of the tank) a trip of this many metres uses (it stands for more driving than the map distance). */
export const fuelFor = (car: Car, metres: number) => ((Math.min(metres, 60000) / 1000) * CARS.driving.fuelGameFactor * (car.per100 / 100) / car.tank) * 100;
/** What filling up from this level costs (AED). */
export const refuelCost = (car: Car, fuel: number) => Math.ceil(Math.round(car.tank * (100 - fuel) / 10) / 10 * (car.electric ? CARS.fuel.chargePerKwh : CARS.fuel.petrolPerLitre));

export const refuel = (d: Drivable) => call<{ added: number; cost: number; electric: boolean }>("refuel", { p_kind: d.kind, p_id: d.id });
export const finishDrive = (d: Drivable, metres: number, speeding: boolean) => call<{ fuel: number; fine: number }>("finish_drive", { p_kind: d.kind, p_id: d.id, p_metres: Math.round(metres), p_speeding: speeding });
export const carAccident = (d: Drivable) => call<{ caseId: number; accidents: number; revoked: boolean }>("car_accident", { p_kind: d.kind, p_id: d.id });
export const releaseCar = (id: number) => call<null>("release_car", { p_id: id });

/** Parking at the destination: pay for some hours (0: didn't pay), and whether you parked inside the bay. */
export const parkCar = (d: Drivable, place: string, hours: number, good: boolean) => call<{ cost: number; paidUntil: string | null }>("park_car", { p_kind: d.kind, p_id: d.id, p_place: place, p_hours: hours, p_good: good });
export interface Fine { id: number; kind: "speeding" | "parking_unpaid" | "bad_parking"; amount: number; paid: number; reason: string; place: string | null; issuedAt: string; seen: boolean }
/** Your RTA fines from the last 30 days (any that have just come due are charged). */
export const myFines = () => call<Fine[]>("my_fines");
export const seenFines = (ids: number[]) => call<null>("seen_fines", { p_ids: ids });
