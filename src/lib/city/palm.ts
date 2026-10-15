// Palm Jumeirah: the existing island drawing (PalmCommunityBlock, a 520×440 picture) enlarged, moved out
// to sea, and everything that stands on it placed onto its trunk, fronds and crescent.
//
// On the map the coast runs left–right with the sea at the top, so the trunk heads straight out to sea
// from Al Sufouh (in reality it points north-west, at right angles to the coast); Dubai Marina and Dubai
// Harbour are to its left (west), Jumeirah and Downtown to its right (east).
//
// What's where (Nakheel; Britannica; Bayut and Dubai-Online area guides; hotel addresses, 2025–26):
//  - Trunk: FIVE Palm and Fairmont near the base, Golden Mile (west) and Shoreline (east) apartments,
//    Al Ittihad Park and the monorail down the middle, Palm West Beach on the west shore.
//  - Spine: Palm Jumeirah Mall (Nakheel Mall until Sept 2025) with The Palm Tower (St. Regis; The View on level 52), Tiara Residences, and
//    The Pointe at the tip facing Atlantis.
//  - 16 fronds of villas (17 counting the spine).
//  - Crescent (~11 km breakwater in three sections), Atlantis at the apex. West: Atlantis The Royal,
//    Kempinski, Raffles, Jumeirah Zabeel Saray, W Dubai, Six Senses, One&Only (west end). East: Waldorf
//    Astoria, Anantara, Taj Exotica, Sofitel, Rixos (east end).

const WORLD_HEIGHT = 2600;

/** The island on the map (rendered px): its centre and drawn size. */
export const PALM_ISLAND = { cx: 900, cy: 75, width: 1900, height: 1600 };
/** Rendered y of the top of the world (the open sea above the Palm can be scrolled to). */
export const WORLD_TOP = -1080;
/** Where the island's bridge reaches the causeway from the coast (rendered px). */
export const PALM_BRIDGE_END = { x: 900, y: PALM_ISLAND.cy + (400 - 220) * (PALM_ISLAND.height / 440) };

/** The causeway from the Jumeirah coast road (virtual y) out to the Palm's bridge. */
export const PALM_CAUSEWAY = { x: 900, fromVirtualY: 1247, toVirtualY: Math.round(WORLD_HEIGHT - PALM_BRIDGE_END.y) + 4 };

/** A point in the island picture (its 520×440 viewBox) to rendered map px. */
export const islandXY = (lx: number, ly: number) => ({
  x: PALM_ISLAND.cx + (lx - 260) * (PALM_ISLAND.width / 520),
  y: PALM_ISLAND.cy + (ly - 220) * (PALM_ISLAND.height / 440),
});

const at = (lx: number, ly: number) => {
  const p = islandXY(lx, ly);
  return { virtualX: Math.round(p.x), virtualY: Math.round(WORLD_HEIGHT - p.y) };
};

// ---------------------------------------------------------------- the picture's shapes

type Pt = [number, number];
const bezier2 = (a: Pt, c: Pt, b: Pt, t: number): Pt => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
const bezier3 = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const s = 1 - t;
  return [
    s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0],
    s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1],
  ];
};

/** A point along a frond (i = 0 nearest the crescent … 7 nearest the trunk; side −1 west, 1 east). */
export function frondPoint(i: number, side: -1 | 1, t: number): Pt {
  const cy = 115 + i * 26;
  const span = 135 - i * 5;
  const end: Pt = [260 + side * (span + (8 - i) * 5), cy - 22];
  return bezier2([260 + side * 8, cy + 2], [260 + side * span * 0.6, cy + 12], end, t);
}

/** A point along the middle of the crescent's sand: t = 0 at its end, 1 at the apex (Atlantis). */
export function crescentPoint(side: -1 | 1, t: number): Pt {
  const [x, y] = bezier3([52, 230], [52, 165], [133, 60], [260, 60], t);
  return [side < 0 ? x : 520 - x, y];
}


// ---------------------------------------------------------------- what's on it

export interface PalmEntity {
  id: string;
  name: string;
  type: string;
  virtualX: number;
  virtualY: number;
  width?: number;
  height?: number;
  scale?: number;
  interactive?: boolean;
  /** Built from this file, not saved by the map editor. */
  generated: true;
  [key: string]: unknown;
}

const resortOn = (side: -1 | 1, t: number, id: string, name: string, theme: string, roof: string): PalmEntity => {
  const [x, y] = crescentPoint(side, t);
  return { id, name, type: "hotel-palm-resort", theme, roof, ...at(x, y + 4), width: 130, height: 90, generated: true, interactive: true };
};

const tower = (id: string, name: string, lx: number, ly: number, floors: number, color: string): PalmEntity => ({
  id, name, type: "tall-building", ...at(lx, ly), width: 42, height: 84, floors, shape: "stepped", color, roofType: "flat", hasPlot: false, generated: true, interactive: true,
});

const villa = (id: string, name: string, lx: number, ly: number, signature: boolean): PalmEntity => ({
  id, name, type: "dubai-villa", ...at(lx, ly), width: 95, height: 75, scale: 0.42,
  wallColor: signature ? "#fffbeb" : "#f5f5f4", accentColor: signature ? "#c08a3e" : "#a8a29e",
  hasPool: true, hasPalm: signature, plotColor: "#fde68a", generated: true, interactive: true,
});

const PALM_LAYOUT: PalmEntity[] = [
  // The island itself, enlarged and further out to sea (drawn under everything; not clickable).
  { id: "palm", name: "Palm Jumeirah", type: "community-palm", ...at(260, 220), width: PALM_ISLAND.width, height: PALM_ISLAND.height, bare: true, layer: "ground", generated: true, interactive: false },

  // Crescent: Atlantis at the apex, Atlantis The Royal beside it to the west.
  { id: "atlantis-the-palm", name: "Atlantis, The Palm", type: "hotel-atlantis", ...at(260, 66), width: 180, height: 135, generated: true, interactive: true },
  { id: "atlantis-the-royal", name: "Atlantis The Royal", type: "hotel-atlantis-royal", ...at(...(crescentPoint(-1, 0.86).map((n, i) => n + (i ? 5 : 0)) as Pt)), width: 120, height: 120, generated: true, interactive: true },
  // West crescent, Atlantis to the west end (the gap in the breakwater is near t≈0.62).
  resortOn(-1, 0.73, "kempinski-palm-jumeirah", "Kempinski Palm Jumeirah", "modern", "#1e3a8a"),
  resortOn(-1, 0.52, "raffles-the-palm", "Raffles The Palm Dubai", "palace", "#b08d57"),
  resortOn(-1, 0.4, "jumeirah-zabeel-saray", "Jumeirah Zabeel Saray", "ottoman", "#7c2d12"),
  resortOn(-1, 0.28, "w-dubai-the-palm", "W Dubai – The Palm", "modern", "#db2777"),
  resortOn(-1, 0.16, "six-senses-the-palm", "Six Senses The Palm", "eco", "#4d7c0f"),
  resortOn(-1, 0.04, "one-and-only-the-palm", "One&Only The Palm", "moorish", "#0f766e"),
  // East crescent, Atlantis to the east end.
  resortOn(1, 0.84, "waldorf-astoria-palm", "Waldorf Astoria Palm Jumeirah", "palace", "#a16207"),
  resortOn(1, 0.72, "anantara-the-palm", "Anantara The Palm", "thai", "#92400e"),
  resortOn(1, 0.5, "taj-exotica-the-palm", "Taj Exotica The Palm", "palace", "#9f1239"),
  resortOn(1, 0.36, "sofitel-the-palm", "Sofitel Dubai The Palm", "polynesian", "#a16207"),
  villa("xxii-carat-villa", "XXII Carat Villa", ...crescentPoint(1, 0.22), true),
  resortOn(1, 0.06, "rixos-the-palm", "Rixos The Palm Dubai", "modern", "#0369a1"),

  // Trunk (below the fronds): FIVE and Golden Mile on the west, Oceana and Shoreline on the east,
  // Al Ittihad Park down the middle, Fairmont and Palm West Beach on the west shore.
  // FIVE: the Palm's party hotel, drawn big as a landmark at the base of the trunk.
  { id: "five-palm-jumeirah", name: "FIVE Palm Jumeirah", type: "hotel-five", ...at(287, 368), width: 210, height: 180, generated: true, interactive: true },
  tower("golden-mile-1", "Golden Mile 1", 241, 340, 12, "#f5d0a9"),
  tower("golden-mile-2", "Golden Mile 2", 241, 323, 12, "#f5d0a9"),
  tower("oceana-residences", "Oceana Residences", 281, 345, 11, "#bae6fd"),
  tower("shoreline-al-das", "Al Das · Shoreline Apartments", 280, 330, 9, "#fde68a"),
  tower("shoreline-al-hamri", "Al Hamri · Shoreline Apartments", 279, 315, 9, "#fde68a"),
  { id: "al-ittihad-park", name: "Al Ittihad Park", type: "park-palm", ...at(260, 346), width: 74, height: 54, generated: true, interactive: true },
  { id: "fairmont-the-palm", name: "Fairmont The Palm", type: "hotel-palm-resort", theme: "palace", roof: "#7c2d12", ...at(244, 306), width: 110, height: 76, generated: true, interactive: true },
  // Palm West Beach: the ~1.6 km public beach along the west shore of the trunk, with its beach clubs.
  { id: "palm-west-beach", name: "Palm West Beach", type: "palm-beach", ...at(225, 370), width: 150, height: 320, generated: true, interactive: true },
  // Golden Mile Galleria: Nakheel's community retail & dining centre under the Golden Mile towers, by the park.
  { id: "golden-mile-galleria", name: "Golden Mile Galleria", type: "mall", ...at(262, 322), width: 210, height: 150, scale: 0.38, generated: true, interactive: true },
  // Club Vista Mare: Nakheel's beachfront dining destination on the trunk.
  { id: "club-vista-mare", name: "Club Vista Mare", type: "the-pointe", ...at(297, 318), width: 120, height: 64, generated: true, interactive: true },

  // Spine: Palm Jumeirah Mall with The Palm Tower, Tiara Residences, and The Pointe at the tip.
  { id: "palm-jumeirah-mall", name: "Palm Jumeirah Mall", type: "mall", ...at(262, 252), width: 210, height: 150, scale: 0.5, generated: true, interactive: true },
  { id: "the-palm-tower", name: "The Palm Tower", type: "palm-tower", ...at(250, 236), width: 58, height: 190, generated: true, interactive: true },
  tower("tiara-residences", "Tiara Residences", 274, 232, 15, "#e9d5ff"),
  { id: "the-pointe", name: "The Pointe", type: "the-pointe", ...at(260, 112), width: 130, height: 70, generated: true, interactive: true },

  // Frond villas: 4 luxury beachfront villas per wing of the Palm (Fronds A-P, 16 fronds)
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => ([-1, 1] as const).flatMap((side) => {
    const n = side < 0 ? 8 - i : 9 + i;
    const frondLetter = String.fromCharCode(64 + n);
    // Four per frond. Ids 1–2 are the original pair, so homes already in the database keep their place.
    // Spread along the middle of the frond, stopping short of the tip so the crescent hotels have room.
    return ([[1, 0.3, false], [3, 0.46, false], [4, 0.62, true], [2, 0.77, true]] as const).map(([id, t, signature]) => {
      // The top fronds reach right up to the crescent, so their villas stay further back.
      const [x, y] = frondPoint(i, side, i < 2 ? t * 0.86 : t);
      return villa(`palm-frond-${n}-${id}`, signature ? `Signature Villa (Frond ${frondLetter})` : `Garden Home (Frond ${frondLetter})`, x, y - 1.5, signature);
    });
  })),
];

/** How big the Palm's buildings are drawn, relative to their base sizes above. */
export const PALM_BUILDING_SIZE = 1.25;
/** Not resized: the island itself and the West Beach strip, which are drawn to the island's scale. */
const FIXED_SIZE = new Set(["palm", "palm-west-beach"]);

export const PALM_ENTITIES: PalmEntity[] = PALM_LAYOUT.map((e) => {
  if (FIXED_SIZE.has(e.id)) return e;
  // Entities drawn with a scale grow by scale; the rest by their width and height.
  if (e.scale !== undefined) return { ...e, scale: e.scale * PALM_BUILDING_SIZE };
  return { ...e, width: e.width && Math.round(e.width * PALM_BUILDING_SIZE), height: e.height && Math.round(e.height * PALM_BUILDING_SIZE) };
});

/** Where the Palm button centres the map (virtual coordinates): the middle of the island. */
export const PALM_VIEW = { x: PALM_ISLAND.cx, y: Math.round(WORLD_HEIGHT - islandXY(260, 290).y) };
