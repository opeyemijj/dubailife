// The kitchen and bathroom built into every home (src/data/home/fixtures.json, written in the old 7 m home's
// cells and spread out to today's 10 m one): where each fixture sits,
// the bathroom's walls, what you can do with each fixture, and the pantry its recipes use.

import FIXTURES from "@/data/home/fixtures.json";
import { CELL, LAYOUT_SCALE, migratePlacement, ROOM_SIZE, type FloorPlacement, type HousingTier, type Rotation } from "@/lib/furniture";
import type { Citizen, NeedKey } from "@/lib/citizenStore";

export { FIXTURES };
export type FixtureKind = keyof typeof FIXTURES.kinds;
export type PantryItem = keyof typeof FIXTURES.pantry;
export interface FixtureAction { id: string; label: string; icon: string; seconds: number; needs: Partial<Record<NeedKey, number>>; uses: Partial<Record<PantryItem, number>>; meal?: boolean; skill?: string }
export interface Fixture { id: string; kind: FixtureKind; size: [number, number]; placement: FloorPlacement }
export interface FixtureWall { a: [number, number]; b: [number, number]; door?: [number, number] }

type Layout = { fixtures: Array<{ kind: string; col: number; row: number; rot: number; level?: number }>; walls: Array<FixtureWall & { level?: number }> };
const layoutOf = (tier: HousingTier): Layout => {
  const all = FIXTURES.layouts as unknown as Record<string, Partial<Layout> & { twoStorey?: boolean }>;
  const l = all[tier];
  return ((l?.twoStorey ? all._twoStorey : l) as Layout | undefined) ?? { fixtures: [], walls: [] };
};

export const kindOf = (kind: FixtureKind) => FIXTURES.kinds[kind] as { name: string; icon: string; size: number[]; desc: string; actions: FixtureAction[] };

/** The fixtures on one floor of a home. */
export function fixturesFor(tier: HousingTier, level = 0): Fixture[] {
  return layoutOf(tier).fixtures
    .filter((f) => (f.level ?? 0) === level)
    .map((f, i) => ({
      id: `${tier}:${level}:${i}`,
      kind: f.kind as FixtureKind,
      size: kindOf(f.kind as FixtureKind).size as [number, number],
      // Written for the old 7 m home: spread out like the rest of the layout, keeping wall-side pieces at the wall.
      placement: migratePlacement({ kind: "floor", col: f.col, row: f.row, rot: f.rot as Rotation, level } as FloorPlacement, kindOf(f.kind as FixtureKind).size as [number, number]),
    }));
}

/** The bathroom's walls on one floor of a home. */
const snap = (v: number) => Math.round(v * LAYOUT_SCALE * 2) / 2;
export const fixtureWallsFor = (tier: HousingTier, level = 0): FixtureWall[] =>
  (layoutOf(tier).walls ?? []).filter((w) => (w.level ?? 0) === level).map(({ a, b, door }) => ({
    a: [snap(a[0]), snap(a[1])], b: [snap(b[0]), snap(b[1])], ...(door ? { door: [door[0] * LAYOUT_SCALE, door[1] * LAYOUT_SCALE] as [number, number] } : {}),
  }));

/** Footprint of a fixture in metres. */
export function fixtureRect(f: Fixture) {
  const [w, d] = f.placement.rot % 2 === 0 ? f.size : [f.size[1], f.size[0]];
  const minX = -ROOM_SIZE / 2 + f.placement.col * CELL, minZ = -ROOM_SIZE / 2 + f.placement.row * CELL;
  return { minX, maxX: minX + w * CELL, minZ, maxZ: minZ + d * CELL };
}

/** Where to stand to use a fixture: just in front of it, facing it. */
export function fixtureSpot(f: Fixture): { x: number; z: number; yaw: number } {
  const r = fixtureRect(f);
  const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
  const off = 0.45;
  // Fronts face south (rot 0), west (1), north (2) or east (3); stand there and face back at it.
  switch (f.placement.rot) {
    case 1: return { x: r.minX - off, z: cz, yaw: Math.PI / 2 };
    case 2: return { x: cx, z: r.minZ - off, yaw: 0 };
    case 3: return { x: r.maxX + off, z: cz, yaw: -Math.PI / 2 };
    default: return { x: cx, z: r.maxZ + off, yaw: Math.PI };
  }
}

// ---------------------------------------------------------------- the pantry

export const pantryOf = (c: Citizen | null | undefined): Partial<Record<PantryItem, number>> =>
  (c?.pantry as Partial<Record<PantryItem, number>> | undefined) ?? (FIXTURES.starterPantry as Partial<Record<PantryItem, number>>);

/** What an action is missing from the pantry (empty when it can be done). */
export function missingFor(action: FixtureAction, pantry: Partial<Record<PantryItem, number>>): PantryItem[] {
  return (Object.entries(action.uses) as Array<[PantryItem, number]>).filter(([k, n]) => (pantry[k] ?? 0) < n).map(([k]) => k);
}

export function afterUsing(action: FixtureAction, pantry: Partial<Record<PantryItem, number>>) {
  const next = { ...pantry };
  for (const [k, n] of Object.entries(action.uses) as Array<[PantryItem, number]>) next[k] = Math.max(0, (next[k] ?? 0) - n);
  return next;
}
