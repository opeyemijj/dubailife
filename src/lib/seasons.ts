"use client";

// Season pass, Dubai Plus and cosmetics (design spec 19.5). Names come from src/data/seasons/seasons.json;
// the server owns XP (league points in the season), claims, passes and cosmetics.

import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import SEASONS from "@/data/seasons/seasons.json";

export { SEASONS };
export type Season = (typeof SEASONS.seasons)[number];
export interface MySeason {
  season: string | null; xp: number; premium: boolean; plus: boolean; plusUntil: string | null;
  claimed: Array<{ level: number; track: "free" | "premium" }>;
  cosmetics: Array<{ id: string; equipped: boolean }>;
  prices: { season_pass_aed: number; plus_monthly_aed: number };
}
export const seasonById = (id: string | null) => SEASONS.seasons.find((s) => s.id === id) ?? null;

/** The same reward rules as public.season_reward(). */
export function rewardFor(seasonId: string, level: number, track: "free" | "premium"): { item?: string; aed?: number } {
  if (track === "free") return level % 5 === 0 ? { item: `title:${seasonId}:${level / 5 - 1}` } : { aed: 300 };
  if (level === 20) return { item: `badge:${seasonId}` };
  if (level % 2 === 0) return { item: `frame:${seasonId}:${level / 2 - 1}` };
  return { item: `title:${seasonId}:${4 + (level - 1) / 2}` };
}

/** Human name for a cosmetic id. */
export function cosmeticName(id: string): { kind: "title" | "frame" | "badge"; name: string } {
  const [kind, sid, n] = id.split(":") as ["title" | "frame" | "badge", string, string?];
  if (sid === "plus") return { kind, name: kind === "badge" ? SEASONS.plus.badge : `${SEASONS.plus.monthlyFrame} ${n ? `${n.slice(4)}/${n.slice(0, 4)}` : ""}`.trim() };
  const s = seasonById(sid);
  if (!s) return { kind, name: id };
  if (kind === "badge") return { kind, name: s.badge };
  const list = kind === "title" ? s.titles : s.frames;
  return { kind, name: list[Number(n)] ?? id };
}

/** Ring colours for frames (by index), so an equipped frame shows round the avatar. */
export const FRAME_RINGS = ["#f59e0b", "#f97316", "#0ea5e9", "#d946ef", "#94a3b8", "#f8fafc", "#ef4444", "#22c55e", "#a16207"];
export const frameColour = (id?: string | null) => {
  if (!id) return null;
  const [, sid, n] = id.split(":");
  return sid === "plus" ? "#10b981" : FRAME_RINGS[Number(n) % FRAME_RINGS.length];
};

export async function mySeason(): Promise<MySeason | null> {
  const { data } = await supabase().rpc("my_season");
  return (data as MySeason) ?? null;
}
export async function claimReward(level: number, track: "free" | "premium"): Promise<string | null> {
  const { error } = await supabase().rpc("claim_season_reward", { p_level: level, p_track: track });
  if (!error) { refreshCitizen(); return null; }
  return /level_locked/.test(error.message) ? "Earn more points to reach that level." : /needs_premium/.test(error.message) ? "That's on the premium track." : /already/.test(error.message) ? "Already claimed." : "Couldn't claim it. Try again.";
}
export async function equip(kind: "title" | "frame" | "badge", item: string | null) {
  const { error } = await supabase().rpc("equip_cosmetic", { p_kind: kind, p_item: item });
  return error ? "Couldn't change it." : null;
}
export async function claimPlusFrame() {
  const { error } = await supabase().rpc("claim_plus_frame");
  return error ? "Dubai Plus members only." : null;
}
