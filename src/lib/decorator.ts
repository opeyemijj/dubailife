"use client";

// Interior decorators (src/data/home/decorators.json, enforced in *_decor_house_calls.sql). Only players do the work:
// you send one a request with a budget (it and their fee are held). They accept, walk into your home in 3D, buy from
// the store with your budget and arrange things; that's saved on the job, and applied to your home when they've
// finished and you're next there. What they don't spend comes back to you.

import { useCallback, useEffect, useState } from "react";
import DECORATORS from "@/data/home/decorators.json";
import { refreshCitizen, updateCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import {
  CATALOG, findFreePlacement, WALL_PAINTS, withHomeItems,
  type FloorFinish, type HomeStyle, type HousingTier, type OwnedFurniture,
} from "@/lib/furniture";

export { DECORATORS };
export type Studio = (typeof DECORATORS.studios)[number];
export const studioOf = (id: string) => DECORATORS.studios.find((s) => s.id === id);

const paintOf = (id: string) => WALL_PAINTS.find((w) => w.id === id);

/** What a decorator has done so far: everything in the home, the style, and what they bought (to return it). */
export interface DecorPlan { furniture: OwnedFurniture[]; style: HomeStyle; bought: Record<string, number> }

export interface DecorJob {
  id: number; studio: string | null; tier: HousingTier; status: "requested" | "working" | "done";
  touch: string | null; fallback: boolean; readyAt: string | null; fee: number; createdAt: string;
  decorator: string | null; decoratorLook: AvatarLookProps | null; ready: boolean;
  budget: number; spent: number; plan: DecorPlan | null; acceptedAt: string | null;
}
export interface DecoratorPro { id: string; username: string; look?: AvatarLookProps; fee: number }
export interface DecorHome { id: number; client: string; tier: HousingTier; brief: string | null; budget: number; spent: number; fee: number; plan: DecorPlan | null; furniture: OwnedFurniture[]; style: HomeStyle | null }
export interface DecorRequest { id: number; client: string; clientLook?: AvatarLookProps; studio: string | null; tier: string; fee: number; budget: number; spent: number; status: "requested" | "working"; createdAt: string }

const ERRORS: Record<string, string> = {
  insufficient: "You don't have enough AED for that.",
  already_decorating: "A decorator is already working on your home.",
  not_a_decorator: "That player isn't a decorator any more. Choose someone else.",
  not_available: "The client cancelled that request.",
  not_cancellable: "Your decorator has your key. You can cancel if they haven't finished after 24 hours.",
  bad_budget: "Choose a budget between AED 1,000 and AED 500,000.",
  over_budget: "That's over the client's budget.",
  not_working: "This job is no longer open.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  if (!error) void refreshCitizen();
  return error ? { error: friendly(error.message) } : { data: data as T };
}

export const decorators = () => call<DecoratorPro[]>("professionals", { p_service: "decorator" });
export const requestDecorator = (decorator: string, tier: HousingTier, budget: number, brief: string | null) =>
  call<{ id: number; fee: number }>("request_decorator", { p_decorator: decorator, p_tier: tier, p_budget: budget, p_brief: brief });
export const cancelDecor = (job: number) => call<null>("cancel_decor", { p_job: job });
export const decorJobsForMe = () => call<DecorRequest[]>("decor_jobs_for_me");
export const acceptDecor = (job: number) => call<null>("decor_accept", { p_job: job });
export const declineDecor = (job: number) => call<null>("decor_decline", { p_job: job });
export const decorHome = (job: number) => call<DecorHome>("decor_home", { p_job: job });
export const saveDecor = async (job: number, plan: DecorPlan, spent: number) => { await supabase().rpc("decor_save", { p_job: job, p_plan: plan, p_spent: spent }); };
export const completeDecor = (job: number, plan: DecorPlan, spent: number) => call<number>("decor_complete", { p_job: job, p_plan: plan, p_spent: spent });

/** Your current decorator job, checked now and then (and when you come back to the tab). */
export function useMyDecor(me: string | null | undefined) {
  const [job, setJob] = useState<DecorJob | null>(null);
  const reload = useCallback(async () => {
    const { data } = await supabase().rpc("my_decor");
    setJob((data as DecorJob | null) ?? null);
  }, []);
  useEffect(() => {
    if (!me) return;
    const first = setTimeout(() => void reload(), 0);
    const every = setInterval(() => void reload(), 30000);
    const again = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", again);
    return () => { clearTimeout(first); clearInterval(every); document.removeEventListener("visibilitychange", again); };
  }, [me, reload]);
  return { job, reload };
}

/** The job is done: the decorator's work goes into your home (anything you've added since stays), or for an older job
    the studio's look; then the job is closed on the server. */
export async function applyDecor(job: DecorJob): Promise<{ title: string; placed: number; stored: number } | null> {
  const { error } = await supabase().rpc("decor_applied", { p_job: job.id });
  if (error) return null;
  const plan = job.plan;
  if (plan) {
    const placed = Object.keys(plan.bought).filter((uid) => plan.furniture.some((f) => f.uid === uid && f.placement)).length;
    updateCitizen((cur) => {
      const theirs = new Map(plan.furniture.map((f) => [f.uid, f]));
      const mine = withHomeItems(cur.furniture ?? [], job.tier);
      const kept = mine.map((f) => theirs.get(f.uid) ?? f);
      const added = plan.furniture.filter((f) => !mine.some((m) => m.uid === f.uid));
      return { ...cur, furniture: [...kept, ...added], homeStyle: { ...cur.homeStyle, [job.tier]: plan.style } };
    });
    return { title: "Your new home", placed, stored: Object.keys(plan.bought).length - placed };
  }
  const s = job.studio ? studioOf(job.studio) : null;
  if (!s) return null;
  let placed = 0, stored = 0;
  updateCitizen((cur) => {
    let furniture: OwnedFurniture[] = withHomeItems(cur.furniture ?? [], job.tier);
    for (const id of [...s.items, ...(job.touch ? [job.touch] : [])]) {
      const item = CATALOG.find((x) => x.id === id);
      if (!item) continue;
      const placement = findFreePlacement(item, furniture.filter((f) => f.placement));
      if (placement) placed++; else stored++;
      furniture = [...furniture, { uid: `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, itemId: id, placement }];
    }
    const style: HomeStyle = { floor: s.floor as FloorFinish, wall: paintOf(s.wall)?.color ?? "#f4efe6", panels: s.panels };
    return { ...cur, furniture, homeStyle: { ...cur.homeStyle, [job.tier]: style } };
  });
  return { title: `${s.icon} ${s.title}`, placed, stored };
}
