// Everything on the city map: the saved map (src/data/mapSeed.ts, edited in the admin map editor)
// plus Palm Jumeirah, which is laid out in code (lib/city/palm.ts) and replaces any saved copy.

import { mapSeed } from "@/data/mapSeed";
import { PALM_ENTITIES } from "./palm";

const PALM_IDS = new Set(PALM_ENTITIES.map((e) => e.id));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CITY_ENTITIES: any[] = [...mapSeed.filter((e) => !PALM_IDS.has(e.id)), ...PALM_ENTITIES];

/** What the map editor saves: the Palm is generated, so it's left out. */
export const savableEntities = <T extends { id: string; generated?: boolean }>(list: T[]) => list.filter((e) => !e.generated && !PALM_IDS.has(e.id));
