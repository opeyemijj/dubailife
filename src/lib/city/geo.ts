// Map geometry for travel: building entrances and real-world distances.

import { mapSeed } from "@/data/mapSeed";

/** Matches WORLD_HEIGHT in components/map/Icons (map y is flipped for rendering). */
export const WORLD_HEIGHT = 2600;
/** Downtown spans ~2,000 map units across its ~2.5 km width. */
export const METRES_PER_UNIT = 1.25;

type Entity = { id: string; type: string; name?: string; virtualX: number; virtualY: number };
const ENTITIES = new Map((mapSeed as Entity[]).map((e) => [e.id, e]));

export const getEntity = (id: string) => ENTITIES.get(id) ?? null;

/** Where you arrive at a building, in rendered map coordinates (just in front of it). */
export function entranceOf(placeId: string): { x: number; y: number } | null {
  const e = ENTITIES.get(placeId);
  if (!e) return null;
  return { x: e.virtualX, y: WORLD_HEIGHT - e.virtualY + 45 };
}

export const distanceMetres = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) * METRES_PER_UNIT;

/** Default spot when a citizen has never moved: outside The Dubai Mall. */
export const HOME_SPOT = { x: 2087, y: WORLD_HEIGHT - 711 + 60 };
