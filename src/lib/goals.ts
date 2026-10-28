"use client";

// Life goals (src/data/life/goals.json, enforced in *_goals.sql): the player's plan in order, what each step
// needs, and claiming a goal's reward. The server decides what's done; this only reads and shows it.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import GOALS from "@/data/life/goals.json";

export { GOALS };
export type Goal = (typeof GOALS.goals)[number];
export type GoalStep = Goal["steps"][number] & { href?: string; action?: string };
export type GoalId = Goal["id"];
export interface GoalStatus {
  order: GoalId[] | null;
  setAt: string | null;
  checks: Record<string, boolean | number>;
  claimed: GoalId[];
}

export const goalOf = (id: string) => GOALS.goals.find((g) => g.id === id) as Goal | undefined;
export const DEFAULT_ORDER = GOALS.goals.map((g) => g.id) as GoalId[];

/** Why an order can't be used (or null when it's fine): a home and a job first, a license before a car. */
export function orderProblem(order: string[]): string | null {
  if (order[0] !== GOALS.pinned[0] || order[1] !== GOALS.pinned[1]) return "A home and a job come first.";
  for (const [later, first] of GOALS.after) {
    if (order.indexOf(later) < order.indexOf(first)) return `${goalOf(later)?.title} has to come after ${goalOf(first)?.title.toLowerCase()}.`;
  }
  return null;
}

export const stepDone = (s: GoalStatus | null, step: GoalStep) => !!s?.checks[step.done];
export const goalDone = (s: GoalStatus | null, g: Goal) => g.steps.every((st) => stepDone(s, st));
export const goalClaimed = (s: GoalStatus | null, id: string) => !!s?.claimed.includes(id as GoalId);
/** The goal to work on now: the first in your order you haven't claimed. */
export function currentGoal(s: GoalStatus | null): Goal | undefined {
  const order = s?.order ?? DEFAULT_ORDER;
  return order.map(goalOf).find((g): g is Goal => !!g && !goalClaimed(s, g.id));
}
/** How far through your Dubai story you are: steps done across every goal (claimed goals count in full). */
export function lifeProgress(s: GoalStatus | null) {
  let done = 0, all = 0;
  for (const g of GOALS.goals) for (const st of g.steps) { all++; if (goalClaimed(s, g.id) || stepDone(s, st)) done++; }
  return all ? done / all : 0;
}

const ERRORS: Record<string, string> = {
  bad_order: "That order doesn't work: a home and a job first, and a license before a car.",
  not_done: "Finish every step first.",
  already_claimed: "You've already collected this one.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

/** Shared across the app: one fetch, every card and screen sees the same status. */
let cache: GoalStatus | null = null;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
export function reloadGoals() {
  inflight ??= (async () => {
    const { data } = await supabase().rpc("goal_status");
    if (data) { cache = data as GoalStatus; listeners.forEach((l) => l()); }
    inflight = null;
  })();
  return inflight;
}

export function useGoals(me: string | null | undefined) {
  // The server never has it, so the first render matches; then the shared copy.
  const status = useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => cache, () => null);
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => void reloadGoals(), 0);
    // Steps get done all over the game: look again when you come back to the tab, and every minute.
    const again = () => { if (document.visibilityState === "visible") void reloadGoals(); };
    document.addEventListener("visibilitychange", again);
    const every = setInterval(again, 60000);
    return () => { clearTimeout(t); clearInterval(every); document.removeEventListener("visibilitychange", again); };
  }, [me]);
  return { status, reload: useCallback(() => reloadGoals(), []) };
}

export async function setGoals(order: string[]) {
  const { error } = await supabase().rpc("set_goals", { p_order: order });
  if (error) return { error: friendly(error.message) };
  await reloadGoals();
  return {};
}
export async function claimGoal(id: string) {
  const { data, error } = await supabase().rpc("claim_goal", { p_goal: id });
  if (error) return { error: friendly(error.message) };
  void refreshCitizen();
  await reloadGoals();
  return { data: data as { aed: number; xp: number } };
}

/** A board job's monthly pay (paid weekly, on Fridays). */
export const monthlyPay = (weekly: number) => Math.round((weekly * 52) / 12 / 100) * 100;
/** Whether you meet a job's requirement, from your goal checks (the server checks again when you apply). */
export function qualifiesFor(requirement: string, s: GoalStatus | null): boolean | null {
  if (requirement === "none") return true;
  if (!s) return null;
  const key = requirement === "course" ? "graduated" : requirement === "degree" ? "degree" : "licence";
  return !!s.checks[key];
}
/** What to study for a job you don't qualify for: a link and its name. */
export function studyFor(title: string): { href: string; label: string } | null {
  const c = (GOALS.careers as Record<string, { course?: string; href?: string; label: string } | string>)[title];
  if (!c || typeof c === "string") return null;
  return { href: c.course ? `/academics/course/${c.course}` : c.href ?? "/academics", label: c.label };
}
