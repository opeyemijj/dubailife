// Abu Dhabi's map (/abu-dhabi): its districts as plains on the same lattice as Dubai's (depth slant 0.2355, rows
// dropping 0.01667 a unit to the right, a ~70-unit street between plains), with the islands out in the Gulf at the
// top and the mainland below. Every id starts "ad-" (lib/city/cities), so places and homes know their city.
// What's inside each building is in ./places.ts; the sea, beaches, bridges and highways are AbuDhabiBackground.

const H = 2600;
/** The plains' sides slant across this much for each unit up, so a row further back starts and ends further right. */
const SLANT = 0.2355;
/** Rendered (screen) y to the map's virtual y, keeping each row on the lattice's tilt. */
const row = (x: number, screenY: number) => Math.round(H - screenY - (x - 2000) * 0.01667);

export interface AdPlain { id: string; name: string; x: number; y: number; w: number; h: number; color?: string; island?: boolean }

/** The districts: the islands (row A, and Abu Dhabi island itself in row B) and the mainland (rows C and D). */
export const AD_PLAINS: AdPlain[] = [
  // Row A: out in the Gulf.
  { id: "ad-tile-saadiyat", name: "Saadiyat Island", x: 980, y: 640, w: 1180, h: 380, island: true },
  { id: "ad-tile-yas", name: "Yas Island", x: 2880, y: 640, w: 1500, h: 380, island: true },
  // Row B: Abu Dhabi island (the Corniche and downtown), Al Reem Island, Al Raha Beach on the shore.
  { id: "ad-tile-corniche", name: "Corniche & Downtown", x: 860, y: 1110, w: 1240, h: 380, island: true },
  { id: "ad-tile-reem", name: "Al Reem Island", x: 1880, y: 1110, w: 640, h: 380, island: true },
  { id: "ad-tile-raha", name: "Al Raha Beach", x: 2880, y: 1110, w: 1180, h: 380 },
  // Row C: the mainland.
  { id: "ad-tile-mosque", name: "Grand Mosque & Al Maqtaa", x: 800, y: 1590, w: 1180, h: 420 },
  { id: "ad-tile-khalifa", name: "Khalifa City", x: 1840, y: 1590, w: 760, h: 420 },
  { id: "ad-tile-auh", name: "Abu Dhabi International Airport (AUH)", x: 2930, y: 1590, w: 1280, h: 420 },
  // Row D: out to the desert.
  { id: "ad-tile-wathba", name: "Al Wathba", x: 1010, y: 2080, w: 1600, h: 420 },
  { id: "ad-tile-desert", name: "Liwa Desert Gateway", x: 2780, y: 2080, w: 1800, h: 420, color: "#e6cf9f" },
];

/** A plain's centre on the map, and a spot along it (`dx` from its centre, `up` into it) for what stands on it. */
export const plainAt = (id: string, dx = 0, up = 0) => {
  const p = AD_PLAINS.find((q) => q.id === id)!;
  return { virtualX: Math.round(p.x + dx), virtualY: row(p.x + dx, p.y) + up };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AD_TILES: any[] = AD_PLAINS.map((p) => ({
  id: p.id, name: p.name, type: "floor-tile", virtualX: p.x, virtualY: row(p.x, p.y), width: p.w, height: p.h,
  // Warmer than Dubai's green: sage on the islands, sand-sage on the mainland (the desert plain has its own sand).
  color: p.color ?? (p.island ? "#c9d9a4" : "#d6d2a0"), upperColor: p.color ?? (p.island ? "#c9d9a4" : "#d6d2a0"), showGrid: true, showLabel: true, rotate: 0, interactive: false, city: "abu-dhabi",
}));

/** A building on a plain: `dx` from its centre along its row (measured from the plain's slanted centre line, so the
 *  same dx lines up from row to row like the plain's sides), `up` into it. Rows are back (70), middle (-40) and front
 *  (-150); a building's base must stay within the plain's width (|dx| + width/2 <= w/2 - h*SLANT/2 - 12): see
 *  adOutOfPlain below. */
const b = (id: string, name: string, type: string, plain: string, dx: number, up: number, width: number, height: number) =>
  ({ id, name, type, ...plainAt(plain, dx + up * SLANT, up), width, height, interactive: true, plain });
/** A home (a tower of flats, a villa or a townhouse: their units are in the flats table). */
const home = (id: string, name: string, type: "tall-building" | "dubai-villa" | "small-house", plain: string, dx: number, up: number) =>
  b(id, name, type, plain, dx, up, type === "tall-building" ? 110 : 120, type === "tall-building" ? 220 : 95);

/** A planned community: homes in straight rows (`rows` from the back of the plain to the front), one per column.
 *  Ids are `<prefix>-<n>` counting from 1 along the rows, so they match their flats rows. */
const community = (prefix: string, name: string, type: "dubai-villa" | "small-house", plain: string, cols: number[], ups: number[], start = 1) =>
  ups.flatMap((up, r) => cols.map((dx, c) => home(`${prefix}-${start + r * cols.length + c}`, name, type, plain, dx, up)));

/** The billboards: ads are booked on them like Dubai's (components/commerce/BillboardAds), by their ids. */
const billboard = (id: string, name: string, plain: string, dx: number, up: number, billboardStyle = "mega-led") =>
  ({ id, name, type: "giant-billboard", ...plainAt(plain, dx + up * SLANT, up), width: 140, height: 90, billboardStyle, interactive: true, plain });
const AD_BILLBOARDS = [
  billboard("ad-bb-corniche", "Corniche Road LED Screen", "ad-tile-corniche", -15, -150, "luxury-curved"),
  billboard("ad-bb-yas", "Yas Island Mega Screen", "ad-tile-yas", 41, -40),
  billboard("ad-bb-raha", "Al Raha Highway Billboard", "ad-tile-raha", -389, -40, "classic-highway"),
  billboard("ad-bb-mosque", "Sheikh Zayed Bridge Billboard", "ad-tile-mosque", 60, -150, "classic-highway"),
  billboard("ad-bb-airport", "AUH Arrivals Screen", "ad-tile-auh", 480, -170),
  billboard("ad-bb-e11", "E11 Dubai Road Billboard", "ad-tile-wathba", -569, -160, "classic-highway"),
  billboard("ad-bb-wathba", "Al Wathba Road Billboard", "ad-tile-wathba", -329, -160, "classic-highway"),
  billboard("ad-bb-shamkha", "Al Shamkha Gate Screen", "ad-tile-wathba", -89, -160),
  billboard("ad-bb-desert", "Liwa Road Billboard", "ad-tile-desert", 0, -150, "classic-highway"),
];

/** What stands on the plains (what's inside each is ./places.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AD_BUILDINGS: any[] = [
  // The airport: you arrive and leave here (its sprite is the full-plain airport, set a little into the plain so it sits centred).
  { id: "ad-auh-airport", name: "Abu Dhabi International Airport (AUH)", type: "airport", ...plainAt("ad-tile-auh", 0, 30), width: 1200, height: 400, interactive: true },
  // Corniche & Downtown: the palace, the presidential palace, the towers, the souk and the beach.
  b("ad-emirates-palace", "Emirates Palace Mandarin Oriental", "ad-palace", "ad-tile-corniche", -384, -40, 300, 200),
  b("ad-qasr-al-watan", "Qasr Al Watan", "ad-qasr", "ad-tile-corniche", -70, 70, 240, 170),
  b("ad-etihad-towers-club", "Etihad Towers", "ad-etihad-towers", "ad-tile-corniche", 170, 70, 200, 260),
  b("ad-wtc-mall", "World Trade Center Mall & Central Market", "mall", "ad-tile-corniche", 284, -40, 220, 160),
  b("ad-corniche-beach", "Corniche Beach", "ad-beach", "ad-tile-corniche", -224, -150, 240, 90),
  b("ad-corniche-dining", "Corniche Food Street", "ad-dining", "ad-tile-corniche", 145, -150, 140, 100),
  b("ad-corniche-spa", "Corniche Hammam & Spa", "ad-dining", "ad-tile-corniche", 294, -150, 120, 90),
  home("ad-corniche-tower-1", "Corniche Residence Tower", "tall-building", "ad-tile-corniche", 479, -40),
  home("ad-corniche-tower-2", "Nation Towers Residences", "tall-building", "ad-tile-corniche", 346, 70),
  // More of the Corniche: Marina Mall and the Breakwater, Qasr Al Hosn, a hotel tower, a club and the city's billboards.
  b("ad-marina-mall", "Marina Mall", "mall", "ad-tile-corniche", -442, 70, 200, 140),
  b("ad-breakwater-yacht-club", "Breakwater Yacht Club", "ad-marina", "ad-tile-corniche", -454, -150, 180, 100),
  b("ad-al-hosn", "Qasr Al Hosn", "ad-fort", "ad-tile-corniche", -119, -40, 170, 115),
  { ...b("ad-corniche-grand-hotel", "Corniche Grand Hotel", "ad-hotel-tower", "ad-tile-corniche", 482, 70, 120, 190), tint: "#0e7490" },
  b("ad-corniche-club", "Level 47 Nightclub", "szr-club", "ad-tile-corniche", 70, -40, 150, 110),
  b("ad-al-bateen-beach", "Al Bateen Beach", "ad-beach", "ad-tile-corniche", 459, -150, 170, 80),
  home("ad-corniche-tower-3", "Al Bateen Residences", "tall-building", "ad-tile-corniche", -266, 70),
  // Al Reem Island: the Galleria, towers and the gym.
  b("ad-galleria", "The Galleria Al Maryah Island", "mall", "ad-tile-reem", -139, -40, 200, 150),
  b("ad-reem-gym", "Reem Fitness Club", "ad-dining", "ad-tile-reem", 179, -40, 120, 90),
  home("ad-reem-sky-tower", "Sky Tower", "tall-building", "ad-tile-reem", -68, 70),
  home("ad-reem-sun-tower", "Sun Tower", "tall-building", "ad-tile-reem", 58, 70),
  home("ad-reem-gate-tower", "The Gate Tower", "tall-building", "ad-tile-reem", 40, -40),
  // More of Reem: the Sorbonne campus, a hotel tower, the island's beach club and a park.
  b("ad-sorbonne", "Sorbonne University Abu Dhabi", "ad-university", "ad-tile-reem", -114, -150, 200, 140),
  { ...b("ad-reem-rosewood", "Rosewood Al Maryah", "ad-hotel-tower", "ad-tile-reem", 188, 70, 120, 190), tint: "#1e293b" },
  b("ad-reem-beach-club", "Reem Beach Club", "ad-beach-club", "ad-tile-reem", 124, -150, 180, 90),
  home("ad-reem-marina-tower", "Marina Square Residences", "tall-building", "ad-tile-reem", -193, 70),
  // Saadiyat Island: the Louvre, the beach resort and club, and beach villas.
  b("ad-louvre", "Louvre Abu Dhabi", "ad-louvre", "ad-tile-saadiyat", -337, -40, 300, 180),
  b("ad-saadiyat-resort", "Saadiyat Beach Resort", "hotel", "ad-tile-saadiyat", -24, 70, 220, 170),
  b("ad-saadiyat-beach-club", "Saadiyat Beach Club", "ad-beach", "ad-tile-saadiyat", -132, -150, 240, 90),
  // More of Saadiyat: NYU Abu Dhabi, the St. Regis, Soul Beach, the Guggenheim and more villas.
  b("ad-nyuad", "NYU Abu Dhabi", "ad-university", "ad-tile-saadiyat", -31, -40, 220, 150),
  { ...b("ad-st-regis-saadiyat", "The St. Regis Saadiyat Island", "ad-hotel-tower", "ad-tile-saadiyat", -234, 70, 120, 190), tint: "#a16207" },
  b("ad-soul-beach", "Soul Beach", "ad-beach-club", "ad-tile-saadiyat", -392, -150, 200, 90),
  b("ad-saadiyat-marina", "Saadiyat Marina", "ad-marina", "ad-tile-saadiyat", 119, -150, 180, 100),
  b("ad-guggenheim", "Guggenheim Abu Dhabi", "ad-fort", "ad-tile-saadiyat", -414, 70, 160, 110),
  // Yas Island: the circuit and its hotel, Ferrari World, Yas Mall, the bay and the marina.
  { ...b("ad-yas-marina-circuit", "Yas Marina Circuit", "race-circuit", "ad-tile-yas", -436, 70, 400, 220), sign: "YAS MARINA" },
  b("ad-w-yas", "W Abu Dhabi Yas Island", "ad-w-yas", "ad-tile-yas", -542, -40, 220, 120),
  b("ad-ferrari-world", "Ferrari World Abu Dhabi", "ad-ferrari", "ad-tile-yas", -230, -40, 320, 190),
  b("ad-yas-mall", "Yas Mall", "mall", "ad-tile-yas", 120, 70, 240, 160),
  b("ad-yas-bay", "Yas Bay Waterfront", "szr-club", "ad-tile-yas", 155, -150, 200, 140),
  b("ad-yas-marina", "Yas Marina", "ad-marina", "ad-tile-yas", 474, -150, 220, 110),
  home("ad-yas-acres-villa", "Yas Acres Villa", "dubai-villa", "ad-tile-yas", 625, 70),
  // More of Yas: Etihad Arena, Yas Waterworld, Yas Beach, two more hotels, the links and more homes.
  b("ad-etihad-arena", "Etihad Arena", "ad-arena", "ad-tile-yas", -165, -150, 220, 120),
  b("ad-yas-waterworld", "Yas Waterworld", "wild-wadi", "ad-tile-yas", 399, -40, 190, 130),
  b("ad-yas-beach", "Yas Beach", "ad-beach-club", "ad-tile-yas", -484, -150, 200, 90),
  { ...b("ad-yas-plaza-hotel", "Yas Plaza Hotel", "ad-hotel-tower", "ad-tile-yas", -118, 70, 120, 190), tint: "#7c3aed" },
  b("ad-yas-island-rotana", "Yas Island Rotana", "hotel", "ad-tile-yas", 388, 70, 180, 130),
  home("ad-yas-acres-villa-2", "Yas Acres Villa", "dubai-villa", "ad-tile-yas", 625, -40),
  home("ad-yas-bay-residences", "Yas Bay Residences", "tall-building", "ad-tile-yas", 207, -40),
  // Al Raha Beach: villas, towers, the hotel and the marina.
  b("ad-raha-beach-hotel", "Al Raha Beach Hotel", "hotel", "ad-tile-raha", -386, 70, 220, 160),
  b("ad-al-bandar", "Al Bandar Marina & Restaurants", "ad-marina", "ad-tile-raha", -189, -150, 200, 110),
  home("ad-raha-tower-1", "Al Raha Lofts", "tall-building", "ad-tile-raha", -189, -40),
  home("ad-raha-tower-2", "Al Muneera Tower", "tall-building", "ad-tile-raha", -4, -40),
  // More of Al Raha: the public beach, a beach club, the mall and more homes.
  b("ad-raha-public-beach", "Al Raha Public Beach", "ad-beach", "ad-tile-raha", -411, -150, 200, 80),
  b("ad-raha-beach-club", "Al Raha Beach Club", "ad-beach-club", "ad-tile-raha", 18, -150, 170, 90),
  b("ad-raha-mall", "Al Raha Mall", "mall", "ad-tile-raha", -2, 70, 180, 130),
  home("ad-raha-tower-3", "Al Hadeel Tower", "tall-building", "ad-tile-raha", -184, 70),
  // The mainland: the Grand Mosque and Al Maqtaa's souk and resort.
  b("ad-grand-mosque", "Sheikh Zayed Grand Mosque", "ad-mosque", "ad-tile-mosque", -254, 70, 420, 260),
  b("ad-qaryat-al-beri", "Souk Qaryat Al Beri", "mall", "ad-tile-mosque", 120, 70, 200, 140),
  b("ad-shangri-la", "Shangri-La Qaryat Al Beri", "hotel", "ad-tile-mosque", 330, -150, 200, 150),
  // More of Al Maqtaa: two canal-side hotels, the Grand Canal marina and homes.
  b("ad-fairmont-bab-al-bahr", "Fairmont Bab Al Bahr", "hotel", "ad-tile-mosque", 374, 70, 180, 130),
  { ...b("ad-ritz-grand-canal", "The Ritz-Carlton Grand Canal", "ad-hotel-tower", "ad-tile-mosque", -110, -150, 120, 190), tint: "#b45309" },
  b("ad-grand-canal-marina", "Grand Canal Marina", "ad-marina", "ad-tile-mosque", -436, -150, 180, 100),
  home("ad-maqtaa-residences", "Al Maqtaa Residences", "tall-building", "ad-tile-mosque", -250, -150),
  // Khalifa City: family villas, townhouses and the market.
  b("ad-khalifa-mall", "Khalifa City Market", "mall", "ad-tile-khalifa", 45, 85, 200, 140),
  home("ad-khalifa-apartments", "Khalifa City Apartments", "tall-building", "ad-tile-khalifa", 232, 85),
  // Khalifa University and more family homes.
  b("ad-khalifa-university", "Khalifa University", "ad-university", "ad-tile-khalifa", -187, 85, 200, 140),
  // Al Wathba and the desert.
  { ...b("ad-al-wathba-camel-track", "Al Wathba Camel Racetrack", "camel-track", "ad-tile-wathba", -526, -20, 400, 220), sign: "AL WATHBA" },
  b("ad-desert-resort", "Al Wathba Desert Resort", "hotel", "ad-tile-desert", -475, 70, 220, 160),
  // Horse racing at the equestrian club, the flamingo wetland and Al Shamkha's villas.
  { ...b("ad-equestrian-club", "Abu Dhabi Equestrian Club", "racecourse", "ad-tile-wathba", -122, -20, 380, 210), sign: "ABU DHABI" },
  b("ad-wathba-wetland", "Al Wathba Wetland Reserve", "ad-wetland", "ad-tile-desert", 489, -40, 220, 130),
  b("ad-desert-safari", "Liwa Desert Safari Camp", "ad-camp", "ad-tile-desert", 10, -40, 260, 150),
  b("ad-falcon-hospital", "Abu Dhabi Falcon Hospital", "ad-falcon", "ad-tile-desert", -1, 70, 220, 150),
  b("ad-qasr-al-sarab", "Qasr Al Sarab Desert Resort", "hotel", "ad-tile-desert", 473, 70, 220, 160),
  b("ad-moreeb-camp", "Moreeb Dune Camp", "ad-camp", "ad-tile-desert", -479, -40, 240, 140),

  // The planned communities: villas behind, townhouses along the front, in straight rows.
  // Saadiyat's beach villas (and the Signature Mansion at the head of the street).
  home("ad-saadiyat-mansion", "Saadiyat Signature Mansion", "dubai-villa", "ad-tile-saadiyat", 340, 70),
  home("ad-saadiyat-villa-1", "Saadiyat Beach Villa", "dubai-villa", "ad-tile-saadiyat", 215, 70),
  home("ad-saadiyat-villa-2", "Saadiyat Beach Villa", "dubai-villa", "ad-tile-saadiyat", 465, 70),
  ...community("ad-saadiyat-villa", "Saadiyat Beach Villa", "dubai-villa", "ad-tile-saadiyat", [215, 340, 465], [-40], 3),
  ...community("ad-saadiyat-townhouse", "Saadiyat Townhouse", "small-house", "ad-tile-saadiyat", [340, 465], [-150]),
  // Al Raha Gardens.
  ...community("ad-raha-villa", "Al Raha Gardens Villa", "dubai-villa", "ad-tile-raha", [215, 340, 465], [70, -40]),
  ...community("ad-raha-townhouse", "Al Raha Townhouse", "small-house", "ad-tile-raha", [215, 340, 465], [-150]),
  // Khalifa City: a street of villas behind a row of townhouses.
  ...community("ad-khalifa-villa", "Khalifa City Villa", "dubai-villa", "ad-tile-khalifa", [-250, -125, 0, 125, 250], [-35]),
  ...community("ad-khalifa-townhouse", "Khalifa City Townhouse", "small-house", "ad-tile-khalifa", [-250, -125, 0, 125, 250], [-150]),
  // Al Shamkha (Al Wathba): the big family community off the E11.
  ...community("ad-shamkha-villa", "Al Shamkha Villa", "dubai-villa", "ad-tile-wathba", [171, 296, 421, 546, 671], [70, -40]),
  ...community("ad-shamkha-townhouse", "Al Shamkha Townhouse", "small-house", "ad-tile-wathba", [171, 296, 421, 546, 671], [-150]),

  // On the water between Saadiyat and Yas (off the plains, so no `plain`): kayaks in the mangroves, and the dhow
  // harbour with the Heritage Village on its jetty.
  { id: "ad-mangroves", name: "Mangrove National Park", type: "ad-mangrove", virtualX: 1760, virtualY: row(1760, 600), width: 200, height: 120, interactive: true },
  { id: "ad-dhow-harbour", name: "Heritage Village & Dhow Harbour", type: "ad-dhow", virtualX: 1965, virtualY: row(1965, 800), width: 200, height: 130, interactive: true },

  // Billboards along the highways and the waterfronts: the same paid ads as Dubai's (book a slot, it rotates).
  ...AD_BILLBOARDS,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AD_ENTITIES: any[] = [...AD_TILES, ...AD_BUILDINGS.map((e) => ({ ...e, city: "abu-dhabi" }))];

/** Buildings whose base runs past their plain's slanted sides or edges (should be none: each row has to fit). */
export const adOutOfPlain = () => AD_BUILDINGS.filter((e) => {
  const p = AD_PLAINS.find((q) => q.id === e.plain);
  if (!p) return false;
  const up = e.virtualY - row(e.virtualX, p.y), dx = e.virtualX - p.x - up * SLANT, room = p.w / 2 - (p.h / 2) * SLANT - 12;
  return Math.abs(dx) + (e.width ?? 120) / 2 > room + 1 || up > p.h / 2 - 60 || up < -p.h / 2 + 15;
}).map((e) => e.id);

/** Shared types drawn in Abu Dhabi's own style on its map (components/map/AbuDhabiSprites). */
export const AD_STYLED_TYPES = new Set(["tall-building", "dubai-villa", "small-house", "mall", "hotel"]);
