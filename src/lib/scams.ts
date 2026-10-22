"use client";

// The anti-scam phone simulator (design spec section 7). Scripts come from src/data/scams/scams.json; the
// server decides when a scam arrives (scam_due) and what it costs or pays (scam_resolve).

import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import SCAMS from "@/data/scams/scams.json";

export type Scam = (typeof SCAMS.scams)[number];
export interface OpenScam { id: number; template: string; sentAt: string; scam: Scam }
export interface ScamOutcome { outcome: "reported" | "avoided" | "fell"; loss: number; bounty: number; template: string }

export const scamById = (id: string) => SCAMS.scams.find((s) => s.id === id);
export const SCAM_POINTS = SCAMS.points;

/** Today's scam if one has arrived for this player. */
export async function scamDue(): Promise<OpenScam | null> {
  const { data, error } = await supabase().rpc("scam_due");
  if (error || !data) return null;
  const d = data as { id: number; template: string; sentAt: string };
  const scam = scamById(d.template);
  return scam ? { ...d, scam } : null;
}

export async function resolveScam(id: number, action: "comply" | "report" | "ignore"): Promise<ScamOutcome | null> {
  const { data, error } = await supabase().rpc("scam_resolve", { p_event: id, p_action: action });
  if (error) return null;
  refreshCitizen();
  return data as ScamOutcome;
}
