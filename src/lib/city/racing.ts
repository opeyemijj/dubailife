// The race days (src/app/racing) side by side on the Global Village & Desert Horizon plain (unlabelled): the
// Autodrome's car circuit, Meydan Racecourse for horses, the Al Marmoom camel racetrack and the superbike circuit.
// Placed from the plain's centre (src/data/mapSeed.ts), so they move with it; laid out in code (like the Palm), so
// the map editor doesn't save copies of them. What's inside each is in places.ts. (The Autodrome also keeps its
// building on Sheikh Zayed Road.)

import { mapSeed } from "@/data/mapSeed";

const PLAIN = (mapSeed as { id: string; virtualX: number; virtualY: number }[]).find((e) => e.id === "tile-global-village-desert") ?? { virtualX: 2906, virtualY: 166 };
/** Along the plain's long edge (which drops 0.01667 for each unit across), from its centre. */
const at = (dx: number) => ({ virtualX: Math.round(PLAIN.virtualX + dx), virtualY: Math.round(PLAIN.virtualY - 55 - dx * 0.01667) });

export const RACING_ENTITIES = [
  { id: "autodrome-circuit", name: "Dubai Autodrome Circuit", type: "race-circuit", ...at(-840), width: 400, height: 220, interactive: true, generated: true },
  { id: "meydan-racecourse", name: "Meydan Racecourse", type: "racecourse", ...at(-285), width: 400, height: 220, interactive: true, generated: true },
  { id: "al-marmoom-camel-racetrack", name: "Al Marmoom Camel Racetrack", type: "camel-track", ...at(270), width: 400, height: 220, interactive: true, generated: true },
  { id: "superbike-circuit", name: "Superbike Circuit", type: "bike-circuit", ...at(825), width: 400, height: 220, interactive: true, generated: true },
];
