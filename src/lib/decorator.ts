"use client";

// Interior decorators (src/data/home/decorators.json, enforced in *_decorators.sql). Players with the
// Interior decorator job do the work: you pick a look and a decorator, pay the finish and pieces (and their
// fee, held until they finish), they pick up your key, choose a finishing touch and finish. If no player is
// free, or none picks up your key in time, a Local studio does it. The new look is applied to your home
// here, when you're next there.

import { useCallback, useEffect, useState } from "react";
import DECORATORS from "@/data/home/decorators.json";
import { refreshCitizen, updateCitizen } from "@/lib/citizenStore";
import { LOCALS } from "@/lib/locals";
import { supabase } from "@/lib/supabase/client";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import {
  CATALOG, FLOOR_FINISHES, findFreePlacement, PANELS_PRICE, WALL_PAINTS, withHomeItems,
  type FloorFinish, type HomeStyle, type HousingTier, type OwnedFurniture,
} from "@/lib/furniture";

export { DECORATORS };
export type Studio = (typeof DECORATORS.studios)[number];
export const studioOf = (id: string) => DECORATORS.studios.find((s) => s.id === id);
/** A Local decorator in person: the Local of that name. */
export const localDecoratorLook = (s: Studio) => (LOCALS.find((l) => l.name === s.decorator) ?? LOCALS[0]).look;

const paintOf = (id: string) => WALL_PAINTS.find((w) => w.id === id);
/** What the look costs in this home: each finish only if it changes, and the pieces (plus a player's fee). */
export function quote(s: Studio, current: HomeStyle) {
  const floor = s.floor === current.floor ? 0 : FLOOR_FINISHES.find((f) => f.id === s.floor)?.price ?? 0;
  const wall = paintOf(s.wall)?.color.toLowerCase() === current.wall.toLowerCase() ? 0 : paintOf(s.wall)?.price ?? 0;
  const panels = s.panels && !current.panels ? PANELS_PRICE : 0;
  const pieces = s.items.reduce((sum, id) => sum + (CATALOG.find((c) => c.id === id)?.price ?? 0), 0);
  return { finish: floor + wall + panels, pieces, costs: floor + wall + panels + pieces };
}

export interface DecorJob {
  id: number; studio: string; tier: HousingTier; status: "requested" | "working" | "done";
  touch: string | null; fallback: boolean; readyAt: string | null; fee: number; createdAt: string;
  decorator: string | null; decoratorLook: AvatarLookProps | null; ready: boolean;
}
export interface DecoratorPro { id: string; username: string; look?: AvatarLookProps; fee: number }
export interface DecorRequest { id: number; client: string; clientLook?: AvatarLookProps; studio: string; tier: string; fee: number; status: "requested" | "working"; createdAt: string }

const ERRORS: Record<string, string> = {
  insufficient: "You don't have enough AED for that.",
  already_decorating: "A decorator is already working on your home.",
  not_a_decorator: "That player isn't a decorator any more. Choose someone else.",
  not_available: "That job has gone to a Local: the client waited too long.",
  not_cancellable: "Your decorator has already picked up the key.",
};
const friendly = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  if (!error) void refreshCitizen();
  return error ? { error: friendly(error.message) } : { data: data as T };
}

export const decorators = () => call<DecoratorPro[]>("professionals", { p_service: "decorator" });
export const hireDecor = (decorator: string | null, studio: string, tier: HousingTier, costs: number) =>
  call<{ id: number; fee: number }>("hire_decor", { p_decorator: decorator, p_studio: studio, p_tier: tier, p_costs: costs });
export const cancelDecor = (job: number) => call<null>("cancel_decor", { p_job: job });
export const decorJobsForMe = () => call<DecorRequest[]>("decor_jobs_for_me");
export const acceptDecor = (job: number) => call<null>("decor_accept", { p_job: job });
export const finishDecor = (job: number, touch: string) => call<number>("decor_finish", { p_job: job, p_touch: touch });

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

/** The job is done: the studio's floor, paint and panelling, its pieces and the decorator's finishing touch
    placed (or stored when there's no room), then the job is closed on the server. */
export async function applyDecor(job: DecorJob): Promise<{ studio: Studio; placed: number; stored: number } | null> {
  const s = studioOf(job.studio);
  if (!s) return null;
  const { error } = await supabase().rpc("decor_applied", { p_job: job.id });
  if (error) return null;
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
  return { studio: s, placed, stored };
}
