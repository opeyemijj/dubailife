// Doha's map (/doha): Qatar's capital in the same lattice as Dubai's and Abu Dhabi's (plains on one tilt, rows dropping
// 0.01667 a unit to the right, a ~70-unit street between plains). The Gulf across the top with The Pearl and Lusail on
// the coast, West Bay's towers, Katara and the Corniche round Doha Bay below them, the old town (Souq Waqif, Msheireb),
// Aspire Zone and Hamad International on the mainland, then Education City, the racetracks and the Inland Sea desert.
// Every id starts "dq-" (lib/city/cities), so places and homes know their city. Inside each building: ./places.ts; the
// sea, the bay, the islands and the roads: components/map/DohaBackground.

const H = 2600;
/** The plains' sides slant across this much for each unit up, so a row further back starts and ends further right. */
const SLANT = 0.2355;
/** Rendered (screen) y to the map's virtual y, keeping each row on the lattice's tilt. */
const row = (x: number, screenY: number) => Math.round(H - screenY - (x - 2000) * 0.01667);

export interface DqPlain { id: string; name: string; x: number; y: number; w: number; h: number; color?: string; island?: boolean }

export const DQ_PLAINS: DqPlain[] = [
  // Row A: out on the Gulf: The Pearl's island and Lusail's waterfront.
  { id: "dq-tile-pearl", name: "The Pearl-Qatar", x: 1000, y: 640, w: 1200, h: 380, island: true },
  { id: "dq-tile-lusail", name: "Lusail City", x: 2900, y: 640, w: 1500, h: 380, island: true },
  // Row B: the coast: West Bay's skyline, Katara, and the Corniche round Doha Bay.
  { id: "dq-tile-westbay", name: "West Bay", x: 860, y: 1110, w: 1240, h: 380 },
  { id: "dq-tile-katara", name: "Katara Cultural Village", x: 1880, y: 1110, w: 640, h: 380 },
  { id: "dq-tile-corniche", name: "Corniche & Doha Bay", x: 2880, y: 1110, w: 1180, h: 380 },
  // Row C: the old town, Aspire Zone and the airport.
  { id: "dq-tile-souq", name: "Souq Waqif & Msheireb", x: 760, y: 1590, w: 1100, h: 420 },
  { id: "dq-tile-aspire", name: "Aspire Zone", x: 1820, y: 1590, w: 900, h: 420 },
  { id: "dq-tile-doh", name: "Hamad International Airport (DOH)", x: 2960, y: 1590, w: 1220, h: 420 },
  // Row D: Education City and the racetracks, and the desert to the Inland Sea.
  { id: "dq-tile-education", name: "Education City & Al Rayyan", x: 1010, y: 2080, w: 1600, h: 420 },
  { id: "dq-tile-desert", name: "Inland Sea & Desert", x: 2780, y: 2080, w: 1800, h: 420, color: "#e9bf98" },
];

/** A plain's centre on the map, and a spot along it (`dx` from its centre, `up` into it). */
export const plainAt = (id: string, dx = 0, up = 0) => {
  const p = DQ_PLAINS.find((q) => q.id === id)!;
  return { virtualX: Math.round(p.x + dx), virtualY: row(p.x + dx, p.y) + up };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DQ_TILES: any[] = DQ_PLAINS.map((p) => ({
  id: p.id, name: p.name, type: "floor-tile", virtualX: p.x, virtualY: row(p.x, p.y), width: p.w, height: p.h,
  // Qatar's own ground, unlike the UAE's greens: pearl white on the islands, rose limestone on the mainland, and a
  // rosy desert (so you know you've landed in another country).
  color: p.color ?? (p.island ? "#f4e8e1" : "#ecd3c8"), upperColor: p.color ?? (p.island ? "#f4e8e1" : "#ecd3c8"),
  showGrid: true, showLabel: true, rotate: 0, interactive: false, city: "doha",
}));

/** A building on a plain: `dx` along its row from the plain's slanted centre line, `up` into it. Rows are back (70),
 *  middle (-40) and front (-150); its base stays within the plain (|dx| + width/2 <= w/2 - h*SLANT/2 - 12). */
const b = (id: string, name: string, type: string, plain: string, dx: number, up: number, width: number, height: number) =>
  ({ id, name, type, ...plainAt(plain, dx + up * SLANT, up), width, height, interactive: true, plain });
/** A home: a tower of flats, a villa or a townhouse (their units are in the flats table). */
const home = (id: string, name: string, type: "tall-building" | "dubai-villa" | "small-house", plain: string, dx: number, up: number) =>
  b(id, name, type, plain, dx, up, type === "tall-building" ? 110 : 120, type === "tall-building" ? 220 : 95);
/** A planned community: homes in straight rows (`ups` from the back), one per column; ids `<prefix>-<n>`. */
const community = (prefix: string, name: string, type: "dubai-villa" | "small-house", plain: string, cols: number[], ups: number[], start = 1) =>
  ups.flatMap((up, r) => cols.map((dx, c) => home(`${prefix}-${start + r * cols.length + c}`, name, type, plain, dx, up)));
/** A billboard: ads are booked on it like Dubai's (components/commerce/BillboardAds), by its id. */
const billboard = (id: string, name: string, plain: string, dx: number, up: number, billboardStyle = "mega-led") =>
  ({ id, name, type: "giant-billboard", ...plainAt(plain, dx + up * SLANT, up), width: 140, height: 90, billboardStyle, interactive: true, plain });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DQ_BUILDINGS: any[] = [
  // The airport: Hamad International.
  { id: "dq-hamad-airport", name: "Hamad International Airport (DOH)", type: "airport", ...plainAt("dq-tile-doh", 0, 30), width: 1200, height: 400, interactive: true },

  // The Pearl-Qatar: Porto Arabia's towers and marina, Qanat Quartier's canals, the Medina Centrale.
  home("dq-pearl-tower-1", "Porto Arabia Tower", "tall-building", "dq-tile-pearl", -470, 70),
  home("dq-pearl-tower-2", "Porto Arabia Residences", "tall-building", "dq-tile-pearl", -330, 70),
  b("dq-marsa-arabia", "The St. Regis Marsa Arabia Island", "dq-hotel-tower", "dq-tile-pearl", -180, 70, 120, 190),
  b("dq-medina-centrale", "Medina Centrale", "mall", "dq-tile-pearl", 0, 70, 200, 140),
  home("dq-pearl-tower-3", "Viva Bahriya Tower", "tall-building", "dq-tile-pearl", 180, 70),
  b("dq-qanat-quartier", "Qanat Quartier", "dq-qanat", "dq-tile-pearl", -330, -40, 240, 140),
  b("dq-la-croisette", "La Croisette Promenade", "dq-dining", "dq-tile-pearl", -60, -40, 140, 100),
  b("dq-porto-arabia-marina", "Porto Arabia Marina", "dq-marina", "dq-tile-pearl", -380, -150, 220, 110),
  b("dq-pearl-beach-club", "Pearl Beach Club", "dq-beach-club", "dq-tile-pearl", -110, -150, 200, 90),
  ...community("dq-qanat-townhouse", "Qanat Quartier Townhouse", "small-house", "dq-tile-pearl", [225, 350, 475], [70 - 110, -150]),

  // Lusail: the golden stadium, the Katara Towers, Place Vendôme, the marina and boulevard, the circuit, Fox Hills.
  b("dq-lusail-stadium", "Lusail Stadium", "dq-stadium", "dq-tile-lusail", -480, 70, 300, 190),
  { ...b("dq-katara-towers", "Katara Towers (Raffles & Fairmont)", "dq-katara-towers", "dq-tile-lusail", -200, 70, 200, 240) },
  b("dq-place-vendome", "Place Vendôme", "dq-vendome", "dq-tile-lusail", 60, 70, 240, 150),
  home("dq-lusail-tower-1", "Lusail Marina Tower", "tall-building", "dq-tile-lusail", 260, 70),
  home("dq-lusail-tower-2", "Lusail Boulevard Residences", "tall-building", "dq-tile-lusail", 390, 70),
  b("dq-lusail-boulevard", "Lusail Boulevard", "dq-dining", "dq-tile-lusail", -560, -40, 140, 100),
  b("dq-lusail-marina", "Lusail Marina", "dq-marina", "dq-tile-lusail", -360, -40, 220, 110),
  b("dq-qetaifan-waterpark", "Qetaifan Island Waterpark", "wild-wadi", "dq-tile-lusail", -130, -40, 190, 130),
  { ...b("dq-lusail-circuit", "Lusail International Circuit", "race-circuit", "dq-tile-lusail", -420, -150, 400, 220), sign: "LUSAIL" },
  b("dq-lusail-beach", "Lusail Beach", "dq-beach", "dq-tile-lusail", -50, -150, 200, 80),
  ...community("dq-foxhills-villa", "Fox Hills Villa", "dubai-villa", "dq-tile-lusail", [375, 500, 625], [-40]),
  ...community("dq-foxhills-townhouse", "Fox Hills Townhouse", "small-house", "dq-tile-lusail", [250, 375, 500, 625], [-150]),

  // West Bay: the skyline (Doha Tower, the Tornado Tower, the Sheraton's pyramid), City Center and the beach.
  b("dq-doha-tower", "Doha Tower", "dq-doha-tower", "dq-tile-westbay", -470, 70, 110, 240),
  b("dq-tornado-tower", "Tornado Tower", "dq-tornado", "dq-tile-westbay", -330, 70, 110, 220),
  b("dq-sheraton", "Sheraton Grand Doha", "dq-pyramid", "dq-tile-westbay", -130, 70, 200, 140),
  b("dq-city-center", "City Center Doha", "mall", "dq-tile-westbay", 110, 70, 220, 150),
  home("dq-westbay-tower-1", "West Bay Sky Residences", "tall-building", "dq-tile-westbay", 300, 70),
  home("dq-westbay-tower-2", "Burj Al Mana", "tall-building", "dq-tile-westbay", 450, 70),
  home("dq-westbay-tower-3", "Zig Zag Towers", "tall-building", "dq-tile-westbay", -470, -40),
  { ...b("dq-w-doha", "W Doha", "dq-hotel-tower", "dq-tile-westbay", -320, -40, 120, 190), tint: "#7e1e3a" },
  b("dq-westbay-lounge", "Sky Lounge West Bay", "szr-club", "dq-tile-westbay", -130, -40, 150, 110),
  home("dq-westbay-tower-4", "Al Fardan Residences", "tall-building", "dq-tile-westbay", 60, -40),
  b("dq-westbay-beach", "West Bay Beach", "dq-beach", "dq-tile-westbay", -400, -150, 220, 80),
  b("dq-westbay-dining", "West Bay Waterfront Dining", "dq-dining", "dq-tile-westbay", -170, -150, 140, 100),

  // Katara: the amphitheatre, the blue mosque, the pigeon towers, the plaza and the beach.
  b("dq-katara-amphitheatre", "Katara Amphitheatre", "dq-amphitheatre", "dq-tile-katara", -110, 70, 200, 140),
  b("dq-katara-mosque", "Katara Mosque", "dq-blue-mosque", "dq-tile-katara", 130, 70, 120, 140),
  b("dq-pigeon-towers", "Katara Pigeon Towers", "dq-pigeon", "dq-tile-katara", -150, -40, 120, 120),
  b("dq-katara-plaza", "Katara Plaza", "mall", "dq-tile-katara", 90, -40, 200, 130),
  b("dq-katara-beach", "Katara Beach", "dq-beach-club", "dq-tile-katara", 0, -150, 200, 90),

  // The Corniche round Doha Bay: the Museum of Islamic Art and its park, the National Museum, the dhows.
  b("dq-mia", "Museum of Islamic Art", "dq-mia", "dq-tile-corniche", -330, 70, 260, 200),
  b("dq-nmoq", "National Museum of Qatar", "dq-nmoq", "dq-tile-corniche", 120, 70, 260, 170),
  b("dq-mia-park", "MIA Park & Bazaar", "dq-park", "dq-tile-corniche", -370, -40, 200, 120),
  b("dq-corniche-dining", "Corniche Seafood Grills", "dq-dining", "dq-tile-corniche", -120, -40, 140, 100),
  b("dq-banana-island-pier", "Banana Island Ferry", "dq-dhow", "dq-tile-corniche", 120, -40, 200, 120),
  b("dq-dhow-harbour", "Dhow Harbour", "dq-dhow", "dq-tile-corniche", -380, -150, 220, 120),
  b("dq-corniche-promenade", "Corniche Promenade", "dq-park", "dq-tile-corniche", -110, -150, 200, 110),

  // Souq Waqif and Msheireb: the old market, the falcon souq, the gold souq, the State Grand Mosque, Msheireb.
  b("dq-souq-waqif", "Souq Waqif", "dq-souq", "dq-tile-souq", -320, 70, 300, 170),
  b("dq-state-mosque", "Imam Muhammad ibn Abd al-Wahhab Mosque", "dq-mosque", "dq-tile-souq", 20, 70, 260, 190),
  b("dq-msheireb", "Msheireb Downtown", "dq-msheireb", "dq-tile-souq", 300, 70, 200, 150),
  b("dq-falcon-souq", "Falcon Souq & Falcon Hospital", "dq-falcon", "dq-tile-souq", -350, -40, 180, 120),
  b("dq-gold-souq", "Gold Souq", "dq-souq-small", "dq-tile-souq", -150, -40, 150, 100),
  b("dq-souq-hotel", "Souq Waqif Boutique Hotels", "hotel", "dq-tile-souq", 40, -40, 180, 130),
  home("dq-msheireb-tower", "Msheireb Residences", "tall-building", "dq-tile-souq", 230, -40),
  b("dq-souq-dining", "Souq Waqif Restaurants", "dq-dining", "dq-tile-souq", -350, -150, 140, 100),
  { ...b("dq-mandarin-msheireb", "Mandarin Oriental Doha", "dq-hotel-tower", "dq-tile-souq", -170, -150, 120, 190), tint: "#a16207" },

  // Aspire Zone: the Torch, Khalifa International Stadium, Villaggio, Aspire Park, the sports museum, the gym.
  { ...b("dq-torch", "The Torch Doha", "dq-torch", "dq-tile-aspire", -270, 70, 110, 240) },
  b("dq-khalifa-stadium", "Khalifa International Stadium", "dq-stadium", "dq-tile-aspire", 20, 70, 260, 160),
  b("dq-villaggio", "Villaggio Mall", "dq-villaggio", "dq-tile-aspire", -200, -40, 240, 140),
  b("dq-aspire-park", "Aspire Park", "dq-park", "dq-tile-aspire", 110, -40, 180, 120),
  b("dq-sports-museum", "Qatar Olympic & Sports Museum", "dq-sports-museum", "dq-tile-aspire", -200, -150, 160, 110),
  b("dq-aspire-gym", "Aspire Active Gym", "dq-dining", "dq-tile-aspire", 20, -150, 140, 100),

  // Education City and Al Rayyan: the library, the universities, horse racing, camel racing, the villas.
  b("dq-qnl", "Qatar National Library", "dq-library", "dq-tile-education", -560, 70, 220, 140),
  b("dq-education-city", "Education City Campus", "dq-university", "dq-tile-education", -310, 70, 220, 150),
  { ...b("dq-al-rayyan-racecourse", "Al Rayyan Racecourse", "racecourse", "dq-tile-education", 0, 70, 380, 210), sign: "AL RAYYAN" },
  { ...b("dq-shahaniya-camel-track", "Al Shahaniya Camel Racetrack", "camel-track", "dq-tile-education", -480, -150, 400, 220), sign: "SHAHANIYA" },
  ...community("dq-alwaab-villa", "Al Waab Villa", "dubai-villa", "dq-tile-education", [296, 421, 546, 671], [70, -40]),
  ...community("dq-alwaab-townhouse", "Al Waab Townhouse", "small-house", "dq-tile-education", [171, 296, 421, 546, 671], [-150]),

  // The desert: the Inland Sea camp, a desert resort, Al Zubarah fort, Sealine Beach and the dunes.
  b("dq-inland-sea-camp", "Inland Sea Desert Camp", "dq-camp", "dq-tile-desert", -520, 70, 260, 150),
  b("dq-desert-resort", "Sealine Desert Resort", "hotel", "dq-tile-desert", -130, 70, 220, 160),
  b("dq-zubarah", "Al Zubarah Fort", "dq-fort", "dq-tile-desert", 250, 70, 170, 115),
  b("dq-sealine-beach", "Sealine Beach", "dq-beach", "dq-tile-desert", -480, -40, 220, 80),
  b("dq-dunes", "Singing Sand Dunes", "dq-camp", "dq-tile-desert", -110, -40, 240, 140),

  // On the water off the Corniche (no plain): Banana Island, the resort island in the bay.
  { id: "dq-banana-island", name: "Banana Island Resort", type: "dq-banana", virtualX: 2620, virtualY: row(2620, 870), width: 220, height: 120, interactive: true },

  // Billboards: the same paid ads as Dubai's and Abu Dhabi's.
  billboard("dq-bb-pearl", "The Pearl Gateway Screen", "dq-tile-pearl", 80, -150, "luxury-curved"),
  billboard("dq-bb-lusail", "Lusail Expressway Billboard", "dq-tile-lusail", 115, -150, "classic-highway"),
  billboard("dq-bb-westbay", "West Bay Mega Screen", "dq-tile-westbay", 60, -150),
  billboard("dq-bb-corniche", "Corniche LED Screen", "dq-tile-corniche", 120, -150, "luxury-curved"),
  billboard("dq-bb-souq", "Msheireb Billboard", "dq-tile-souq", 40, -150, "hoarding-banner"),
  billboard("dq-bb-aspire", "Aspire Zone Screen", "dq-tile-aspire", 230, -150),
  billboard("dq-bb-doh", "DOH Arrivals Screen", "dq-tile-doh", 470, -170),
  billboard("dq-bb-salwa", "Salwa Road Billboard", "dq-tile-education", -60, -150, "classic-highway"),
  billboard("dq-bb-desert", "Desert Road Billboard", "dq-tile-desert", 450, -150, "classic-highway"),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DQ_ENTITIES: any[] = [...DQ_TILES, ...DQ_BUILDINGS.map((e) => ({ ...e, city: "doha" }))];

/** Shared types drawn in Doha's own style on its map (components/map/DohaSprites). */
export const DQ_STYLED_TYPES = new Set(["tall-building", "dubai-villa", "small-house", "mall", "hotel"]);

/** Buildings whose base runs past their plain's slanted sides or edges (should be none: each row has to fit). */
export const dqOutOfPlain = () => DQ_BUILDINGS.filter((e) => {
  const p = DQ_PLAINS.find((q) => q.id === e.plain);
  if (!p) return false;
  const up = e.virtualY - row(e.virtualX, p.y), dx = e.virtualX - p.x - up * SLANT, room = p.w / 2 - (p.h / 2) * SLANT - 12;
  return Math.abs(dx) + (e.width ?? 120) / 2 > room + 1 || up > p.h / 2 - 60 || up < -p.h / 2 + 15;
}).map((e) => e.id);
