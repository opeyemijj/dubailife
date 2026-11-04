"use client";

// The local shops on the street outside (karak, baqala, grill, gym…), different by area. Data in
// src/data/city/street-shops.json.

import SHOPS from "@/data/city/street-shops.json";
import { adjustBalance, boostNeed, updateCitizen } from "@/lib/citizenStore";
import { pantryOf } from "@/lib/homeFixtures";
import { WORLD_HEIGHT } from "./geo";

type NeedKey = Parameters<typeof boostNeed>[0];
export type ShopKind = keyof typeof SHOPS.kinds;
export interface ShopItem { id: string; label: string; icon: string; price: number; need?: string; amount?: number; say?: string; pantry?: Record<string, number>; costs?: Record<string, number> }
export interface ShopKindDef { icon: string; label: string; color: string; names: string[]; items: ShopItem[] }
interface AreaDef { label: string; match: string[]; box?: number[]; shops: string[] }

const KINDS = SHOPS.kinds as unknown as Record<ShopKind, ShopKindDef>;
const AREAS = SHOPS.areas as unknown as Record<string, AreaDef>;

export const shopKind = (k: ShopKind) => KINDS[k];

/** Which area a street is in: by the home's area name ("Deira / Bur Dubai"), else by where on the map. */
export function streetArea(at: { x: number; y: number } | null, areaName?: string): string {
  const name = (areaName ?? "").toLowerCase();
  if (name) for (const [id, a] of Object.entries(AREAS)) if (a.match.some((m) => name.includes(m))) return id;
  if (at) {
    const vx = at.x, vy = WORLD_HEIGHT - at.y;
    for (const [id, a] of Object.entries(AREAS)) {
      const b = a.box;
      if (b && vx >= b[0] && vx <= b[1] && vy >= b[2] && vy <= b[3]) return id;
    }
  }
  return "default";
}
export const areaLabel = (id: string) => AREAS[id]?.label ?? "Dubai";

/** The local shops along this street, in order, each with a name (the same street always has the same shops). */
export function streetShops(area: string, count: number, seed: string): Array<{ kind: ShopKind; name: string }> {
  const list = (AREAS[area] ?? AREAS.default).shops as ShopKind[];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return Array.from({ length: count }, (_, i) => {
    const kind = list[(i + h) % list.length];
    const names = KINDS[kind].names;
    return { kind, name: names[(h + i * 7) % names.length] };
  });
}

/** Buys one thing: paid from your balance, then it fills a need (and may tire you) or goes into your pantry. */
export function buyAtShop(item: ShopItem): { ok: boolean; message: string } {
  if (!adjustBalance(-item.price)) return { ok: false, message: `You need AED ${item.price} for that.` };
  if (item.need && item.amount) boostNeed(item.need as NeedKey, item.amount);
  for (const [k, n] of Object.entries(item.costs ?? {})) boostNeed(k as NeedKey, -n);
  if (item.pantry) {
    updateCitizen((c) => {
      const pantry: Record<string, number> = { ...pantryOf(c) };
      for (const [k, n] of Object.entries(item.pantry!)) pantry[k] = (pantry[k] ?? 0) + n;
      return { ...c, pantry };
    });
    return { ok: true, message: `${item.icon} ${item.label} is in your pantry at home.` };
  }
  return { ok: true, message: item.say ?? `${item.icon} ${item.label}` };
}
