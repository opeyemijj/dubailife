// Everything on the city map: the saved map (src/data/mapSeed.ts, edited in the admin map editor)
// plus Palm Jumeirah and the Jumeirah coastline, laid out in code (lib/city/palm.ts, lib/city/coast.ts),
// which replace any saved copies.

import { mapSeed } from "@/data/mapSeed";
import { PALM_ENTITIES } from "./palm";
import { COAST_ENTITIES } from "./coast";
import { DISTRICT_NAMES, GAME_TILES } from "./gameCity";
import { ACADEMIC_TILES } from "./academic";
import { SZR_DEFAULTS } from "./szr";

const SEED_IDS = new Set(mapSeed.map((e) => e.id));
const PALM_IDS = new Set([...PALM_ENTITIES, ...COAST_ENTITIES, ...GAME_TILES, ...ACADEMIC_TILES].map((e) => e.id));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CITY_ENTITIES: any[] = [
  ...mapSeed.filter((e) => !PALM_IDS.has(e.id)).map((e) => (DISTRICT_NAMES[e.id] ? { ...e, name: DISTRICT_NAMES[e.id] } : e)),
  ...PALM_ENTITIES, ...COAST_ENTITIES, ...GAME_TILES, ...ACADEMIC_TILES,
  // Sheikh Zayed Road hotels and clubs: editable, so a copy saved in the map editor replaces the default.
  ...SZR_DEFAULTS.filter((e) => !SEED_IDS.has(e.id)),
];

/** What the map editor saves: the Palm is generated, so it's left out. */
export const savableEntities = <T extends { id: string; generated?: boolean }>(list: T[]) => list.filter((e) => !e.generated && !PALM_IDS.has(e.id));

