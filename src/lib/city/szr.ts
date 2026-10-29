// Sheikh Zayed Road landmarks on the floor-ad strip between Sheikh Zayed Road and the coast road: the
// hotel towers by the Trade Centre with the clubs inside them standing in front, and Coca-Cola Arena.
// These are default positions: once moved and saved in the map editor, the saved copy in mapSeed.ts
// is used instead (see mapEntities.ts), and the mosaic leaves its gap wherever they stand. What's
// inside each one is in places.ts.

import { stripFront } from "./szrRoad";
import CARS from "@/data/cars/cars.json";

/** Building types that stand on the strip (the mosaic leaves a gap under each). */
export const STRIP_TYPES: string[] = ["szr-tower", "coca-cola-arena", "szr-club", "szr-cars"];

interface Default {
  id: string;
  name: string;
  type: "szr-tower" | "coca-cola-arena" | "szr-club" | "szr-cars";
  x: number;
  width: number;
  height: number;
  /** Towers stand back from the road so the clubs inside them can stand in front. */
  back?: number;
  [prop: string]: unknown;
}

const TOWER_BACK = 58;

const DEFAULTS: Default[] = [
  { id: "coca-cola-arena", name: "Coca-Cola Arena", type: "coca-cola-arena", x: 1460, width: 250, height: 140 },
  // A street cafeteria on the service road: karak, shawarma and grilled chicken (inside: places.ts).
  { id: "yalla-karak-cafeteria", name: "Yalla Karak Cafeteria", type: "szr-club", x: 1880, width: 110, height: 80, marquee: "KARAK • GRILL", colors: ["#b91c1c", "#facc15", "#16a34a"] },
  // Shangri-La, with The Avenue (42nd floor) in front
  { id: "shangri-la-dubai", name: "Shangri-La Dubai", type: "szr-tower", x: 2260, width: 120, height: 300, back: TOWER_BACK, sign: "SHANGRI-LA", glass: "#2dd4bf", frame: "#e2e8f0", accent: "#fbbf24", crown: "stepped" },
  { id: "the-avenue", name: "The Avenue · Shangri-La", type: "szr-club", x: 2260, width: 130, height: 96, marquee: "THE AVENUE", colors: ["#d4af37", "#fde68a", "#b45309"] },
  { id: "voco-dubai", name: "voco Dubai", type: "szr-tower", x: 2540, width: 110, height: 270, back: TOWER_BACK, sign: "voco", glass: "#0ea5e9", frame: "#f1f5f9", accent: "#84cc16", crown: "spire" },
  { id: "conrad-dubai", name: "Conrad Dubai", type: "szr-tower", x: 2800, width: 110, height: 290, back: TOWER_BACK, sign: "CONRAD", glass: "#1e40af", frame: "#cbd5e1", accent: "#f8fafc", crown: "slab" },
  // Fairmont, with Vibz (ground floor) in front
  { id: "fairmont-dubai", name: "Fairmont Dubai", type: "szr-tower", x: 3240, width: 120, height: 280, back: TOWER_BACK, sign: "FAIRMONT", glass: "#94a3b8", frame: "#f5f5f4", accent: "#fde047", crown: "pyramids" },
  { id: "vibz-dubai", name: "Vibz Dubai · Fairmont", type: "szr-club", x: 3240, width: 130, height: 96, marquee: "VIBZ", colors: ["#a855f7", "#22d3ee", "#ec4899"] },
  { id: "sheraton-grand-dubai", name: "Sheraton Grand Hotel Dubai", type: "szr-tower", x: 3400, width: 115, height: 310, back: TOWER_BACK, sign: "SHERATON GRAND", glass: "#b45309", frame: "#fef3c7", accent: "#f8fafc", crown: "slab" },
  // The H, with Enish (level 1) and Gambachi in front
  { id: "the-h-dubai", name: "The H Dubai", type: "szr-tower", x: 3570, width: 130, height: 300, back: TOWER_BACK, sign: "THE H DUBAI", glass: "#64748b", frame: "#e5e7eb", accent: "#f59e0b", crown: "twin" },
  { id: "enish-dubai", name: "Enish · The H Dubai", type: "szr-club", x: 3520, width: 110, height: 86, marquee: "ENISH", colors: ["#22c55e", "#ffffff", "#16a34a"] },
  { id: "gambachi-social-club", name: "Gambachi Social Club · The H Dubai", type: "szr-club", x: 3630, width: 110, height: 86, marquee: "GAMBACHI", colors: ["#facc15", "#16a34a", "#f97316"] },
];

// Car rental counters and dealership showrooms along the same stretch (data: src/data/cars/cars.json).
for (const c of [...CARS.rentals, ...CARS.dealers]) {
  const dealer = CARS.dealers.some((d) => d.id === c.id);
  // Their own showroom sprite (szr-cars), with the cars they sell or rent in the window and out front.
  const stock = ("stock" in c ? c.stock : c.fleet).map((id) => CARS.cars.find((x) => x.id === id)?.color ?? "#f8fafc");
  DEFAULTS.push({ id: c.id, name: c.name, type: "szr-cars", x: c.x, width: dealer ? 110 : 96, height: dealer ? 84 : 74, marquee: c.name.toUpperCase().replace(/ (MERCEDES-BENZ|BMW|NISSAN|TOYOTA)$/, " $1"), colors: [c.color, "#ffffff", c.color], rent: !dealer, cars: stock.slice(0, 2) });
}

/** Default entities. Sprites stand on a point 10% up from their bottom edge. */
export const SZR_DEFAULTS = DEFAULTS.map(({ x, back = 0, ...look }) => ({
  ...look,
  virtualX: x,
  virtualY: Math.round(stripFront(x) + 8 + back + 0.1 * look.height),
  interactive: true,
}));
