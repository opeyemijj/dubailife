// The 3D attraction games' progress, results and leaderboards (src/components/arcade). Reward rules are static
// content in src/data/arcade/games.json, mirrored by public.arcade_rule(); the server keeps each player's
// best, level, streak and weekly best, and pays the AED (capped per Dubai day). Skills and needs are paid here
// on the device, as other activities do.

import { useEffect, useSyncExternalStore } from "react";
import DATA from "@/data/arcade/games.json";
import { supabase } from "@/lib/supabase/client";
import { boostNeed, refreshCitizen } from "@/lib/citizenStore";
import { gainSkill, type SkillId } from "@/lib/life";

export type ArcadeGameId = "boxing" | "gym" | "scan" | "labour" | "court" | "hall" | "bridal" | "nails" | "goldsouk";
type NeedKind = "hunger" | "energy" | "fun" | "social" | "hygiene";

export interface ArcadeGame {
  id: ArcadeGameId;
  name: string;
  icon: string;
  perStar: number;
  dailyCap: number;
  maxScore: number;
  maxLevel: number;
  skill?: SkillId;
  need?: { kind: NeedKind; amount: number };
}

export const ARCADE_GAMES = DATA.games as ArcadeGame[];
export const arcadeGame = (id: ArcadeGameId) => ARCADE_GAMES.find((g) => g.id === id)!;

export interface GameProgress { best: number; level: number; plays: number; streak: number; earnedToday: number }
export interface RoundOutcome { best: number; isBest: boolean; level: number; streak: number; plays: number; weekBest: number; reward: number; capped: boolean }
export interface LeaderRow { username: string; name: string; score: number; place: number }
export interface Leaderboard { top: LeaderRow[]; me: { score: number; place: number } | null }

const EMPTY: GameProgress = { best: 0, level: 0, plays: 0, streak: 0, earnedToday: 0 };

// ---------------------------------------------------------------- live store of my progress

let progress: Partial<Record<ArcadeGameId, GameProgress>> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function reloadGameProgress() {
  loading ??= (async () => {
    const { data, error } = await supabase().rpc("my_game_progress");
    // Before the arcade tables exist (or offline), start everyone at zero rather than failing.
    progress = error ? (progress ?? {}) : ((data ?? {}) as typeof progress);
    loading = null;
    emit();
  })();
  return loading;
}

/** My progress in one game; zeros until it has loaded (or for a game never played). */
export function useGameProgress(id: ArcadeGameId): GameProgress {
  useEffect(() => { if (!progress) void reloadGameProgress(); }, []);
  const all = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => progress, () => null);
  return all?.[id] ?? EMPTY;
}

// ---------------------------------------------------------------- results

/** Stars for a score against the game's three thresholds (each game chooses its own). */
export const starsFor = (score: number, [one, two, three]: [number, number, number]) => (score >= three ? 3 : score >= two ? 2 : score >= one ? 1 : 0);

/**
 * Records a finished round: the server keeps the best and pays the AED; the skill and need are paid here.
 * Offline or before the tables exist, the round still counts on this device (no AED).
 */
export async function recordGameResult(id: ArcadeGameId, score: number, stars: number, level = 0): Promise<RoundOutcome> {
  const game = arcadeGame(id);
  const s = Math.max(0, Math.min(game.maxScore, Math.round(score)));
  const st = Math.max(0, Math.min(3, Math.round(stars)));
  const lv = Math.max(0, Math.min(game.maxLevel, Math.round(level)));
  if (game.need && st > 0) boostNeed(game.need.kind, game.need.amount);
  if (game.skill && st > 0) gainSkill(game.skill, 4 + st * 4);

  const before = progress?.[id] ?? EMPTY;
  const { data, error } = await supabase().rpc("record_game_result", { p_game: id, p_score: s, p_stars: st, p_level: lv });
  const out: RoundOutcome = error || !data
    ? { best: Math.max(before.best, s), isBest: s > before.best, level: Math.max(before.level, lv), streak: before.streak, plays: before.plays + 1, weekBest: s, reward: 0, capped: false }
    : (data as RoundOutcome);
  progress = { ...(progress ?? {}), [id]: { best: out.best, level: out.level, plays: out.plays, streak: out.streak, earnedToday: before.earnedToday + out.reward } };
  emit();
  if (out.reward > 0) void refreshCitizen();
  return out;
}

export async function fetchLeaderboard(id: ArcadeGameId): Promise<Leaderboard> {
  const { data, error } = await supabase().rpc("game_leaderboard", { p_game: id });
  return error || !data ? { top: [], me: null } : (data as Leaderboard);
}
