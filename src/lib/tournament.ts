"use client";

// The monthly tournament (design spec section 13): standings from server-recorded points only, frozen at
// 23:59:59 GST on the last day of the month. Winners verify their ID before any prize is paid.

import { supabase } from "@/lib/supabase/client";

export interface TournamentView {
  month: string;
  freezesAt: string;
  prize: { kind: "cash"; aed: number } | { kind: "noncash"; text: string };
  cashFrom: string;
  standings: Array<{ rank: number; username: string; total: number; me: boolean }>;
  mine: { rank: number; learning: number; scam: number; wellbeing: number; career: number; total: number } | null;
  lastWinner: { month: string; username: string | null; status: string; mine: boolean; prize: "cash" | "noncash"; aed: number | null } | null;
}

export async function tournamentView(): Promise<TournamentView | null> {
  const { data } = await supabase().rpc("tournament_view");
  return (data as TournamentView) ?? null;
}

export const monthName = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/** The winner sends their details and a photo of their ID (stored privately; only admins can open it). */
export async function submitPrizeDetails(month: string, fullName: string, country: string, payout: string, idFile: File): Promise<string | null> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return "Log in first.";
  if (idFile.size > 10 * 1024 * 1024) return "The ID photo must be under 10 MB.";
  const ext = (idFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/tournament-${month}-${Date.now()}.${ext}`;
  const up = await supabase().storage.from("claim-docs").upload(path, idFile, { contentType: idFile.type, upsert: false });
  if (up.error) return "Couldn't upload the ID photo. Use a JPG, PNG or PDF under 10 MB.";
  const { error } = await supabase().rpc("submit_prize_details", { p_month: month, p_full_name: fullName, p_country: country, p_payout: payout, p_id_ref: `claim-docs:${path}` });
  if (error) return /email_not_verified/.test(error.message) ? "Verify your email first (Settings → Verify your email)." : "Couldn't send your details. Try again.";
  return null;
}
