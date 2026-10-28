"use client";

// The core life loop (design spec sections 5 and 11): the Sustainability Blueprint, the 09:00 GST
// living-cost tick and the visa ladder. Options and prices come from src/data/life/*.json; the database
// keeps only each player's state (life_state) and charges the tick when the app opens (life_sync).

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import BLUEPRINT from "@/data/life/blueprint.json";
import VISAS from "@/data/life/visas.json";

export { BLUEPRINT, VISAS };
export type BlueprintKind = "housing" | "commute" | "telecom" | "fitness";
export interface Blueprint { housing: string; commute: string; telecom: string; fitness: string; remittance: number }
export type VisaTier = "VISIT" | "STUDENT" | "EMPLOYMENT" | "FREELANCE" | "GOLDEN";

export interface LifeStatus {
  blueprint: Blueprint | null;
  monthly: number;
  daily: number;
  hasHome: boolean;
  hasLicence: boolean;
  visaTier: VisaTier;
  visaDaysLeft: number;
  debt: number;
  streak: number;
  balance: number;
  nextTickAt: string;
}
/** What the last sync charged (present when one or more 09:00 ticks were settled). */
export interface LifeTick {
  ticks: number;
  charged?: number;
  livingCost?: number;
  fines?: number;
  overstayDays?: number;
  paid?: number;
  yield?: number;
  visaExpired?: VisaTier | null;
}

const RULES = BLUEPRINT.rules;
export const visaInfo = (tier: VisaTier) => VISAS.tiers.find((t) => t.id === tier)!;
export const optionsFor = (kind: BlueprintKind) => BLUEPRINT[kind] as Array<{ id: string; label: string; monthly: number; icon: string; area?: string; detail?: string; needsLicence?: boolean }>;
export const optionOf = (kind: BlueprintKind, id: string) => optionsFor(kind).find((o) => o.id === id);

/** The same sum the database charges: housing is free when the player already has a home. */
export function monthlyCost(b: Blueprint, hasHome: boolean): number {
  return (hasHome ? 0 : optionOf("housing", b.housing)?.monthly ?? 0)
    + (optionOf("commute", b.commute)?.monthly ?? 0) + (optionOf("telecom", b.telecom)?.monthly ?? 0)
    + (optionOf("fitness", b.fitness)?.monthly ?? 0) + (b.remittance || 0);
}
export const dailyBurn = (monthly: number) => Math.ceil(monthly / 30);
/** FI/RE runway: liquid cash ÷ daily burn. Infinity when nothing is spent. */
export const runwayDays = (balance: number, daily: number) => (daily > 0 ? Math.floor(balance / daily) : Infinity);
export const isExpatTrap = (runway: number) => runway < RULES.expatTrapDays;
export const earnsYield = (runway: number) => runway >= RULES.disciplineYieldDays && Number.isFinite(runway);

// ---------------------------------------------------------------- store

let status: LifeStatus | null = null;
let lastTick: LifeTick | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (s: LifeStatus | null) => { status = s; emit(); };

export function useLifeLoop(): LifeStatus | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => status, () => null);
}

let syncing: Promise<LifeTick | null> | null = null;
/** Settles any 09:00 GST ticks since the last visit. Resolves to what was charged (null when signed out). */
export function syncLife(): Promise<LifeTick | null> {
  return (syncing ??= (async () => {
    try {
      const { data, error } = await supabase().rpc("life_sync");
      if (error || !data) return null;
      const r = data as LifeStatus & LifeTick;
      set(r);
      lastTick = r.ticks > 0 ? r : null;
      if ((r.paid ?? 0) > 0 || (r.yield ?? 0) > 0) refreshCitizen();
      return r;
    } finally {
      syncing = null;
    }
  })());
}

/** The latest life state known to the app (null before the first sync). */
export const currentLife = () => status;

/** What the most recent sync settled, if anything. */
export const latestTick = () => lastTick;

/** Syncs again if a 09:00 GST tick has passed since the last sync (call when the app comes back into view). */
export function syncIfDue() {
  if (status && Date.now() >= Date.parse(status.nextTickAt)) return syncLife();
  return Promise.resolve(null);
}

const ERRORS: Record<string, string> = {
  needs_licence: "Car options need a driving license from the Driving Academy.",
  invalid_blueprint: "Pick one option in each section.",
  invalid_remittance: "Family support goes up in steps of AED 500, up to AED 10,000.",
  needs_diploma: "Graduate from a course in Academic City first.",
  needs_job: "Get hired first: find a job at a shop, café or venue in the city.",
  already_higher: "You already hold a higher visa.",
  needs_income: "You need AED 360,000 of earned income (wages, profits, bounties).",
  needs_degree: "You need a university or accelerator degree.",
  needs_golden: "You need AED 2,000,000 of property bought with earned AED, or honours plus a venture with staff.",
  coming_soon: "This visa opens soon.",
};
const explain = (m: string) => Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? "Something went wrong. Try again.";

export async function saveBlueprint(b: Blueprint): Promise<string | null> {
  const { data, error } = await supabase().rpc("set_blueprint", { p: b });
  if (error) return explain(error.message);
  set(data as LifeStatus);
  return null;
}

export async function claimVisa(tier: VisaTier): Promise<string | null> {
  const { data, error } = await supabase().rpc("claim_visa", { p_tier: tier });
  if (error) return explain(error.message);
  set(data as LifeStatus);
  return null;
}

export interface VisaProgress { earned: number; purchased: number; property: number; course: boolean; degree: boolean; honours: boolean; venture: boolean; employed: boolean }
export async function visaProgress(): Promise<VisaProgress | null> {
  const { data } = await supabase().rpc("visa_progress");
  return (data as VisaProgress) ?? null;
}
