// Dubai International (DXB) on the open plain on the top row of the map (where the aviation plain used to be):
// the airport's full-tile sprite and its three terminals, placed from the plain's centre (src/data/mapSeed.ts) so
// they move with it, and laid out in code (like the race days), so the map editor doesn't save copies of them.
// What's inside each terminal is in places.ts; flying from Terminal 3 is in lib/flights.

import { mapSeed } from "@/data/mapSeed";

const PLAIN = (mapSeed as { id: string; virtualX: number; virtualY: number }[]).find((e) => e.id === "tile-open-plain-1") ?? { virtualX: 2789, virtualY: -333 };
/** Along the plain's long edge (which drops 0.01667 for each unit across), from its centre; `up` is into the plain. */
// Sprites stand on a point near their foot; the full-plain airport is set a little into the plain to sit centred on it.
const at = (dx: number, up = 0) => ({ virtualX: Math.round(PLAIN.virtualX + dx), virtualY: Math.round(PLAIN.virtualY - dx * 0.01667 + up) });

export const AIRPORT_ENTITIES = [
  { id: "dxb-international-airport", name: "Dubai International Airport (DXB)", type: "airport", ...at(0, 30), width: 1400, height: 450, interactive: true, generated: true },
  { id: "dxb-terminal-1", name: "DXB Terminal 1 (Concourse D)", type: "airport-terminal", ...at(-320, -25), interactive: true, generated: true },
  { id: "dxb-terminal-2", name: "DXB Terminal 2 (Executive)", type: "airport-terminal", ...at(-220, 185), interactive: true, generated: true },
  { id: "dxb-terminal-3", name: "DXB Terminal 3 (Dubai Life Airways)", type: "airport-terminal", ...at(240, -25), interactive: true, generated: true },
];
