import { SECTIONS } from "./floorMosaic";
import { CELL, MOSAIC_OFFSET, ROWS, e11 } from "./szrRoad";

// The Jumeirah coastline: Burj Al Arab and its neighbours, and the public beaches, placed along the
// shore drawn in components/map/MapBackground (sea at the top, coast road ~240 units inland).
//
// Real order along the coast, west to east (2025–26 guides; Wikipedia; Dubai Municipality):
//   JBR The Beach (west of Dubai Harbour) · Palm Jumeirah · Madinat Jumeirah · Burj Al Arab (on its own
//   island ~280 m offshore, joined by a private curved bridge) · Jumeirah Beach Hotel and Wild Wadi ·
//   Sunset Beach, Umm Suqeim (the classic Burj Al Arab view) · Kite Beach · Jumeirah Public Beach ·
//   Jumeirah Beach 1 (redeveloped, reopened 2026).
// Spacing is roughly proportional to the real distances, squeezed to fit the map.

/** Virtual y of the water's edge at a given x (the coastline is a gentle curve). */
export function shoreAt(x: number): number {
  // Matches "M -200,1485 Q 2000,1505 4200,1412" in MapBackground.
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const t = (lo + hi) / 2;
    const px = (1 - t) ** 2 * -200 + 2 * (1 - t) * t * 2000 + t * t * 4200;
    if (px < x) lo = t; else hi = t;
  }
  const t = lo;
  return (1 - t) ** 2 * 1485 + 2 * (1 - t) * t * 1505 + t * t * 1412;
}

/** Virtual y of the water's edge west of x = -200, where the shore curves north towards the Marina. */
export function westShore(x: number): number {
  // Matches "M -1500,2600 C -1100,1950 -600,1481 -200,1485" in MapBackground.
  const P = [[-1500, 2600], [-1100, 1950], [-600, 1481], [-200, 1485]];
  const at = (t: number) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]); };
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (at(m)[0] < x) lo = m; else hi = m; }
  return at(lo)[1];
}

/** A standalone club or restaurant: the lit lounge building with its name on the sign. */
const venueSpot = (id: string, name: string, x: number, y: number, marquee: string, colors: string[]): CoastEntity => ({
  id, name, type: "szr-club", marquee, colors, virtualX: x, virtualY: y, width: 130, height: 96, generated: true, interactive: true,
});

/** The water's edge anywhere along the coast: the curved western shore, then the gentle main curve. */
const shoreY = (x: number) => (x < -200 ? westShore(x) : shoreAt(x));

export interface CoastEntity {
  id: string;
  name: string;
  type: string;
  virtualX: number;
  virtualY: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  generated: true;
  [key: string]: unknown;
}

/**
 * A public beach along the shore. Sprites stand on a point 90% of the way down them; a beach drawing
 * has its strip of shallow water in the top fifth, so that point sits 0.7 × its height below the shore.
 */
const beach = (id: string, name: string, x: number, variant: string, width = 300): CoastEntity => {
  const height = Math.round(width * 0.36);
  return { id, name, type: "coast-beach", variant, virtualX: x, virtualY: Math.round(shoreY(x) - 0.7 * height), width, height, generated: true, interactive: true };
};

/** A billboard standing in the water just off the beach, facing the shore. */
const billboard = (id: string, name: string, x: number, billboardStyle: string): CoastEntity => ({
  id, name, type: "giant-billboard", billboardStyle, virtualX: x, virtualY: Math.round(shoreAt(x) + 200), width: 140, height: 90, scale: 1.95, generated: true, interactive: true,
});

export const COAST_ENTITIES: CoastEntity[] = [
  // West of the Palm
  // Just behind JBR's towers (its sand starts where they end), with its water strip on the shore.
  { ...beach("jbr-the-beach", "JBR · The Beach", -420, "jbr", 320), virtualY: 1466 },
  // Dubai Marina and JBR, laid out as they really are from the city side: Sheikh Zayed Road · the Marina
  // (Dubai Marina Mall and Pier 7 on the canal) · the road behind JBR · JBR's towers with The Walk at
  // their feet · JBR Beach · the sea, with Bluewaters offshore opposite JBR and joined by its footbridge.
  // Mina Seyahi (Barasti) and Grosvenor House (Buddha-Bar) are at the north-east end, by Dubai Harbour.
  { id: "dubai-marina-mall", name: "Dubai Marina Mall", type: "marina-mall", virtualX: -800, virtualY: 1092, width: 250, height: 140, generated: true, interactive: true },
  { id: "pier-7", name: "Pier 7", type: "pier-7", virtualX: -1000, virtualY: 1098, width: 80, height: 165, generated: true, interactive: true },
  { id: "jbr", name: "JBR · The Walk", type: "jbr-district", virtualX: -430, virtualY: 1292, width: 360, height: 180, generated: true, interactive: true },
  venueSpot("lock-stock-barrel-jbr", "Lock, Stock & Barrel JBR", -705, 1318, "LSB", ["#facc15", "#a16207", "#dc2626"]),
  venueSpot("hurricanes-grill", "Hurricane's Grill & Bar", -180, 1314, "HURRICANE'S", ["#f97316", "#fde68a", "#0ea5e9"]),
  venueSpot("bla-bla-dubai", "Bla Bla Dubai", -660, 1478, "BLA BLA", ["#22d3ee", "#f472b6", "#facc15"]),
  venueSpot("buddha-bar", "Buddha-Bar · Grosvenor House", -50, 1306, "BUDDHA-BAR", ["#dc2626", "#fbbf24", "#7f1d1d"]),
  venueSpot("barasti", "Barasti Beach Bar", 80, Math.round(shoreAt(80) - 75), "BARASTI", ["#f59e0b", "#0ea5e9", "#16a34a"]),
  { id: "bluewaters", name: "Bluewaters · Ain Dubai", type: "bluewaters-island", virtualX: -470, virtualY: Math.round(westShore(-470) + 215), width: 320, height: 300, generated: true, interactive: true },

  // Umm Suqeim's landmarks
  { id: "madinat-jumeirah", name: "Madinat Jumeirah", type: "madinat-jumeirah", virtualX: 1420, virtualY: Math.round(shoreAt(1420) - 95), width: 240, height: 150, generated: true, interactive: true },
  // On its own island in the sea, with the bridge back to the shore.
  { id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab-island", virtualX: 1640, virtualY: Math.round(shoreAt(1640) + 120), width: 200, height: 330, generated: true, interactive: true },
  { id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", type: "hotel-jumeirah-beach", virtualX: 1790, virtualY: Math.round(shoreAt(1790) - 12), width: 220, height: 150, generated: true, interactive: true },
  { id: "wild-wadi", name: "Wild Wadi Waterpark", type: "wild-wadi", virtualX: 1800, virtualY: Math.round(shoreAt(1800) - 150), width: 170, height: 130, generated: true, interactive: true },

  // Public beaches, west to east
  beach("sunset-beach", "Sunset Beach, Umm Suqeim", 2070, "sunset"),
  beach("kite-beach", "Kite Beach", 2450, "kite", 330),
  beach("jumeirah-public-beach", "Jumeirah Public Beach", 2850, "public"),
  beach("jumeirah-beach-1", "Jumeirah Beach 1", 3250, "j1", 310),

  // Billboards in the sea just off the beaches, between them. Each takes ads
  // like every billboard (10 rotating slots), booked as "billboard:<id>".
  billboard("billboard-beach-jbr", "JBR Beachfront LED Billboard", -150, "mega-led"),
  billboard("billboard-beach-sufouh", "Al Sufouh Beach Billboard", 1180, "luxury-curved"),
  billboard("billboard-beach-umm-suqeim", "Umm Suqeim Beach Billboard", 1930, "mega-led"),
  billboard("billboard-beach-kite", "Kite Beach LED Billboard", 2260, "luxury-curved"),
  billboard("billboard-beach-jumeirah", "Jumeirah Beach Road Billboard", 2660, "mega-led"),
  billboard("billboard-beach-j1", "Jumeirah 1 Beach Billboard", 3050, "luxury-curved"),

  ...floorAds(),
];

/** The floor-ad mosaic: two stretches either side of the Palm causeway, filling the strip between the roads. */
function floorAds(): CoastEntity[] {
  // Centre line of Sheikh Zayed Road (virtual y), which runs slightly downhill to the east. Its edge is
  // 30 units north of that, and the coast road's edge 220 units north: the strip between them is 190 deep.
  const h = ROWS * CELL;
  return SECTIONS.map((s) => {
    const w = s.cols * CELL;
    const cx = s.x0 + w / 2;
    return {
      id: `floor-ad-mosaic-${s.key}`, name: "Floor ads", type: "floor-mosaic", section: s.key,
      virtualX: Math.round(cx), virtualY: Math.round(e11(cx) + MOSAIC_OFFSET), width: w, height: h, generated: true, interactive: true,
    };
  });
}
