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
  // The wider city: west to Hudayriyat, Al Khalidiyah, MBZ City and Mussafah; east to Al Jubail, Al Maryah, Masdar and
  // Al Shahama; south to Mina Zayed, Al Reem's Shams towers and Al Samha (beyond the first map's edges, like Dubai's).
  { id: "ad-tile-hudayriyat", name: "Hudayriyat Island", x: -330, y: 640, w: 1300, h: 380, island: true },
  { id: "ad-tile-khalidiyah", name: "Al Khalidiyah & Al Bateen", x: -480, y: 1110, w: 1300, h: 380, island: true },
  { id: "ad-tile-mbz", name: "Mohammed Bin Zayed City", x: -510, y: 1590, w: 1300, h: 420 },
  { id: "ad-tile-mussafah", name: "Mussafah & Shakhbout City", x: -510, y: 2080, w: 1300, h: 420 },
  { id: "ad-tile-jubail", name: "Al Jubail Island", x: 4450, y: 640, w: 1500, h: 380, island: true },
  { id: "ad-tile-maryah", name: "Al Maryah Island", x: 4290, y: 1110, w: 1500, h: 380, island: true },
  { id: "ad-tile-masdar", name: "Masdar City & Al Reef", x: 4390, y: 1590, w: 1500, h: 420 },
  { id: "ad-tile-shahama", name: "Al Shahama & Al Rahba", x: 4500, y: 2080, w: 1500, h: 420 },
  { id: "ad-tile-mina", name: "Mina Zayed & Al Zahiyah", x: 400, y: 2570, w: 1500, h: 420 },
  { id: "ad-tile-shams", name: "Al Reem: Shams Abu Dhabi", x: 1970, y: 2570, w: 1500, h: 420 },
  { id: "ad-tile-samha", name: "Al Samha & Al Falah", x: 3540, y: 2570, w: 1500, h: 420 },
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

  // Hudayriyat Island: Surf Abu Dhabi's wave pool, Marsana's beach dining, the bike park, jet skis and villas.
  home("ad-hudayriyat-villa-1", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 275, 70),
  home("ad-hudayriyat-villa-2", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 400, 70),
  home("ad-hudayriyat-villa-3", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 525, 70),
  b("ad-surf-abu-dhabi", "Surf Abu Dhabi", "ad-surf", "ad-tile-hudayriyat", -414, 70, 260, 150),
  b("ad-marsana", "Marsana Beach Dining", "ad-dining", "ad-tile-hudayriyat", -164, 70, 140, 100),
  b("ad-hudayriyat-bike", "Hudayriyat Bike Park", "ad-park", "ad-tile-hudayriyat", 46, 70, 180, 120),
  home("ad-hudayriyat-villa-4", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 275, -40),
  home("ad-hudayriyat-villa-5", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 400, -40),
  home("ad-hudayriyat-villa-6", "Hudayriyat Villa", "dubai-villa", "ad-tile-hudayriyat", 525, -40),
  b("ad-hudayriyat-beach", "Hudayriyat Beach", "ad-beach", "ad-tile-hudayriyat", -367, -40, 200, 80),
  b("ad-hudayriyat-jetski", "Hudayriyat Jet Ski & Watersports", "ad-jetski", "ad-tile-hudayriyat", -41, -40, 200, 100),
  home("ad-hudayriyat-townhouse-1", "Hudayriyat Townhouse", "small-house", "ad-tile-hudayriyat", 275, -150),
  home("ad-hudayriyat-townhouse-2", "Hudayriyat Townhouse", "small-house", "ad-tile-hudayriyat", 400, -150),
  home("ad-hudayriyat-townhouse-3", "Hudayriyat Townhouse", "small-house", "ad-tile-hudayriyat", 525, -150),
  b("ad-hudayriyat-marina", "Hudayriyat Marina", "ad-marina", "ad-tile-hudayriyat", -344, -150, 220, 110),
  billboard("ad-bb-hudayriyat", "Hudayriyat Bridge Screen", "ad-tile-hudayriyat", -24, -150, "luxury-curved"),
  // Al Khalidiyah & Al Bateen: the towers of the west island, Khalidiyah Mall, Al Bateen Marina and Bateen Wharf.
  home("ad-khalidiyah-tower-1", "Khalidiyah Tower 1", "tall-building", "ad-tile-khalidiyah", -451, 70),
  home("ad-khalidiyah-tower-2", "Khalidiyah Tower 2", "tall-building", "ad-tile-khalidiyah", -253, 70),
  home("ad-khalidiyah-tower-3", "Khalidiyah Tower 3", "tall-building", "ad-tile-khalidiyah", -55, 70),
  b("ad-khalidiyah-mall", "Khalidiyah Mall", "mall", "ad-tile-khalidiyah", 198, 70, 220, 150),
  home("ad-khalidiyah-tower-4", "Khalidiyah Tower 4", "tall-building", "ad-tile-khalidiyah", 451, 70),
  b("ad-bateen-marina", "Al Bateen Marina", "ad-marina", "ad-tile-khalidiyah", -416, -40, 220, 110),
  b("ad-bateen-wharf", "Bateen Wharf", "ad-dining", "ad-tile-khalidiyah", -168, -40, 140, 100),
  home("ad-khalidiyah-tower-5", "Khalidiyah Tower 5", "tall-building", "ad-tile-khalidiyah", 25, -40),
  home("ad-khalidiyah-tower-6", "Khalidiyah Tower 6", "tall-building", "ad-tile-khalidiyah", 203, -40),
  b("ad-khalidiyah-centre", "Khalidiyah Neighbourhood Centre", "mall", "ad-tile-khalidiyah", 426, -40, 200, 130),
  b("ad-khalidiyah-beach", "Khalidiyah Beach", "ad-beach", "ad-tile-khalidiyah", -422, -150, 200, 80),
  b("ad-khalidiyah-jetski", "Khalidiyah Jet Ski", "ad-jetski", "ad-tile-khalidiyah", -151, -150, 200, 100),
  home("ad-khalidiyah-tower-7", "Khalidiyah Tower 7", "tall-building", "ad-tile-khalidiyah", 75, -150),
  home("ad-khalidiyah-tower-8", "Khalidiyah Tower 8", "tall-building", "ad-tile-khalidiyah", 256, -150),
  billboard("ad-bb-khalidiyah", "Corniche West Screen", "ad-tile-khalidiyah", 452, -150),
  // Mohammed Bin Zayed City: Mazyad Mall, the neighbourhood centre, the central park, the clinic and the villas.
  home("ad-mbz-villa-1", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 396, 70),
  home("ad-mbz-villa-2", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 521, 70),
  b("ad-mazyad-mall", "Mazyad Mall", "mall", "ad-tile-mbz", -428, 70, 220, 150),
  b("ad-mbz-centre", "MBZ Neighbourhood Centre", "mall", "ad-tile-mbz", -167, 70, 200, 130),
  home("ad-mbz-tower-1", "MBZ City Tower 1", "tall-building", "ad-tile-mbz", 39, 70),
  home("ad-mbz-tower-2", "MBZ City Tower 2", "tall-building", "ad-tile-mbz", 200, 70),
  home("ad-mbz-villa-3", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 146, -40),
  home("ad-mbz-villa-4", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 271, -40),
  home("ad-mbz-villa-5", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 396, -40),
  home("ad-mbz-villa-6", "MBZ City Villa", "dubai-villa", "ad-tile-mbz", 521, -40),
  b("ad-mbz-park", "MBZ Central Park", "ad-park", "ad-tile-mbz", -401, -40, 200, 120),
  b("ad-mbz-clinic", "MBZ Family Clinic", "hospital", "ad-tile-mbz", -122, -40, 180, 140),
  home("ad-mbz-townhouse-1", "MBZ City Townhouse", "small-house", "ad-tile-mbz", -104, -150),
  home("ad-mbz-townhouse-2", "MBZ City Townhouse", "small-house", "ad-tile-mbz", 21, -150),
  home("ad-mbz-townhouse-3", "MBZ City Townhouse", "small-house", "ad-tile-mbz", 146, -150),
  home("ad-mbz-townhouse-4", "MBZ City Townhouse", "small-house", "ad-tile-mbz", 271, -150),
  home("ad-mbz-townhouse-5", "MBZ City Townhouse", "small-house", "ad-tile-mbz", 396, -150),
  home("ad-mbz-townhouse-6", "MBZ City Townhouse", "small-house", "ad-tile-mbz", 521, -150),
  billboard("ad-bb-mbz", "Mussafah Road Billboard", "ad-tile-mbz", -392, -150, "classic-highway"),
  // Mussafah & Shakhbout City: apartment blocks, the hypermarket, the centre and the park.
  home("ad-mussafah-tower-1", "Mussafah Residences 1", "tall-building", "ad-tile-mussafah", -444, 70),
  home("ad-mussafah-tower-2", "Mussafah Residences 2", "tall-building", "ad-tile-mussafah", -245, 70),
  home("ad-mussafah-tower-3", "Mussafah Residences 3", "tall-building", "ad-tile-mussafah", -45, 70),
  home("ad-mussafah-tower-4", "Mussafah Residences 4", "tall-building", "ad-tile-mussafah", 155, 70),
  b("ad-mussafah-hyper", "Mussafah Hypermarket", "mall", "ad-tile-mussafah", 399, 70, 200, 140),
  home("ad-mussafah-tower-5", "Mussafah Residences 5", "tall-building", "ad-tile-mussafah", -456, -40),
  home("ad-mussafah-tower-6", "Mussafah Residences 6", "tall-building", "ad-tile-mussafah", -268, -40),
  home("ad-mussafah-tower-7", "Mussafah Residences 7", "tall-building", "ad-tile-mussafah", -80, -40),
  b("ad-shakhbout-centre", "Shakhbout Neighbourhood Centre", "mall", "ad-tile-mussafah", 153, -40, 200, 130),
  b("ad-shakhbout-park", "Shakhbout Park", "ad-park", "ad-tile-mussafah", 421, -40, 180, 120),
  home("ad-shakhbout-townhouse-1", "Shakhbout Townhouse", "small-house", "ad-tile-mussafah", 21, -150),
  home("ad-shakhbout-townhouse-2", "Shakhbout Townhouse", "small-house", "ad-tile-mussafah", 146, -150),
  home("ad-shakhbout-townhouse-3", "Shakhbout Townhouse", "small-house", "ad-tile-mussafah", 271, -150),
  home("ad-shakhbout-townhouse-4", "Shakhbout Townhouse", "small-house", "ad-tile-mussafah", 396, -150),
  home("ad-shakhbout-townhouse-5", "Shakhbout Townhouse", "small-house", "ad-tile-mussafah", 521, -150),
  billboard("ad-bb-mussafah", "E30 Billboard", "ad-tile-mussafah", -329, -150, "classic-highway"),
  // Al Jubail Island: the mangrove park, the golf club, the beach club, the marina, jet skis and island villas.
  home("ad-jubail-villa-1", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 250, 70),
  home("ad-jubail-villa-2", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 375, 70),
  home("ad-jubail-villa-3", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 500, 70),
  home("ad-jubail-villa-4", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 625, 70),
  b("ad-jubail-mangroves", "Jubail Mangrove Park", "ad-mangrove", "ad-tile-jubail", -439, 70, 220, 120),
  b("ad-jubail-golf", "Jubail Island Golf Club", "ad-park", "ad-tile-jubail", -84, 70, 200, 120),
  home("ad-jubail-villa-5", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 250, -40),
  home("ad-jubail-villa-6", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 375, -40),
  home("ad-jubail-villa-7", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 500, -40),
  home("ad-jubail-villa-8", "Jubail Island Villa", "dubai-villa", "ad-tile-jubail", 625, -40),
  b("ad-jubail-beach-club", "Jubail Beach Club", "ad-beach-club", "ad-tile-jubail", -449, -40, 200, 90),
  b("ad-jubail-marina", "Jubail Marina", "ad-marina", "ad-tile-jubail", -94, -40, 220, 110),
  home("ad-jubail-townhouse-1", "Jubail Island Townhouse", "small-house", "ad-tile-jubail", 250, -150),
  home("ad-jubail-townhouse-2", "Jubail Island Townhouse", "small-house", "ad-tile-jubail", 375, -150),
  home("ad-jubail-townhouse-3", "Jubail Island Townhouse", "small-house", "ad-tile-jubail", 500, -150),
  home("ad-jubail-townhouse-4", "Jubail Island Townhouse", "small-house", "ad-tile-jubail", 625, -150),
  b("ad-jubail-jetski", "Jubail Island Jet Ski", "ad-jetski", "ad-tile-jubail", -422, -150, 200, 100),
  billboard("ad-bb-jubail", "Jubail Island Screen", "ad-tile-jubail", -81, -150, "luxury-curved"),
  // Al Maryah Island: the financial district's towers, the Four Seasons, Maryah Plaza, Cleveland Clinic, the promenade.
  home("ad-maryah-tower-1", "Maryah Tower 1", "tall-building", "ad-tile-maryah", -552, 70),
  home("ad-maryah-tower-2", "Maryah Tower 2", "tall-building", "ad-tile-maryah", -355, 70),
  { ...b("ad-four-seasons-ad", "Four Seasons Abu Dhabi", "ad-hotel-tower", "ad-tile-maryah", -153, 70, 120, 190), tint: "#334155" },
  b("ad-maryah-plaza", "Maryah Plaza", "mall", "ad-tile-maryah", 103, 70, 220, 140),
  home("ad-maryah-tower-3", "Maryah Tower 3", "tall-building", "ad-tile-maryah", 355, 70),
  home("ad-maryah-tower-4", "Maryah Tower 4", "tall-building", "ad-tile-maryah", 552, 70),
  b("ad-cleveland-clinic", "Cleveland Clinic Abu Dhabi", "hospital", "ad-tile-maryah", -515, -40, 220, 150),
  home("ad-maryah-tower-5", "Maryah Tower 5", "tall-building", "ad-tile-maryah", -282, -40),
  home("ad-maryah-tower-6", "Maryah Tower 6", "tall-building", "ad-tile-maryah", -104, -40),
  home("ad-maryah-tower-7", "Maryah Tower 7", "tall-building", "ad-tile-maryah", 74, -40),
  b("ad-maryah-promenade", "Maryah Promenade Dining", "ad-dining", "ad-tile-maryah", 267, -40, 140, 100),
  b("ad-maryah-pier", "Maryah Yacht Pier", "ad-marina", "ad-tile-maryah", 515, -40, 220, 110),
  b("ad-maryah-beach-club", "Maryah Island Beach Club", "ad-beach-club", "ad-tile-maryah", -489, -150, 200, 90),
  home("ad-maryah-tower-8", "Maryah Tower 8", "tall-building", "ad-tile-maryah", -229, -150),
  home("ad-maryah-tower-9", "Maryah Tower 9", "tall-building", "ad-tile-maryah", -15, -150),
  b("ad-maryah-centre", "Maryah Neighbourhood Centre", "mall", "ad-tile-maryah", 244, -150, 200, 130),
  billboard("ad-bb-maryah", "Al Maryah Screen", "ad-tile-maryah", 519, -150),
  // Masdar City & Al Reef: the low-carbon city, its towers, park and centre, and Al Reef's villas.
  home("ad-reef-villa-1", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 371, 70),
  home("ad-reef-villa-2", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 496, 70),
  home("ad-reef-villa-3", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 621, 70),
  b("ad-masdar-city", "Masdar City", "ad-masdar", "ad-tile-masdar", -489, 70, 240, 150),
  home("ad-masdar-tower-1", "Masdar Residences 1", "tall-building", "ad-tile-masdar", -234, 70),
  home("ad-masdar-tower-2", "Masdar Residences 2", "tall-building", "ad-tile-masdar", -44, 70),
  home("ad-masdar-tower-3", "Masdar Residences 3", "tall-building", "ad-tile-masdar", 146, 70),
  home("ad-reef-villa-4", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 246, -40),
  home("ad-reef-villa-5", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 371, -40),
  home("ad-reef-villa-6", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 496, -40),
  home("ad-reef-villa-7", "Al Reef Villa", "dubai-villa", "ad-tile-masdar", 621, -40),
  b("ad-masdar-centre", "Masdar Neighbourhood Centre", "mall", "ad-tile-masdar", -434, -40, 200, 130),
  b("ad-masdar-park", "Masdar Park", "ad-park", "ad-tile-masdar", -89, -40, 180, 120),
  home("ad-reef-townhouse-1", "Al Reef Townhouse", "small-house", "ad-tile-masdar", -4, -150),
  home("ad-reef-townhouse-2", "Al Reef Townhouse", "small-house", "ad-tile-masdar", 121, -150),
  home("ad-reef-townhouse-3", "Al Reef Townhouse", "small-house", "ad-tile-masdar", 246, -150),
  home("ad-reef-townhouse-4", "Al Reef Townhouse", "small-house", "ad-tile-masdar", 371, -150),
  home("ad-reef-townhouse-5", "Al Reef Townhouse", "small-house", "ad-tile-masdar", 496, -150),
  home("ad-reef-townhouse-6", "Al Reef Townhouse", "small-house", "ad-tile-masdar", 621, -150),
  billboard("ad-bb-masdar", "Masdar Road Billboard", "ad-tile-masdar", -392, -150, "classic-highway"),
  // Al Shahama & Al Rahba: family villas round Deerfields Mall and the hospital.
  home("ad-shahama-villa-1", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 121, 70),
  home("ad-shahama-villa-2", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 246, 70),
  home("ad-shahama-villa-3", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 371, 70),
  home("ad-shahama-villa-4", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 496, 70),
  home("ad-shahama-villa-5", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 621, 70),
  b("ad-deerfields", "Deerfields Mall", "mall", "ad-tile-shahama", -329, 70, 220, 150),
  home("ad-shahama-villa-6", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 121, -40),
  home("ad-shahama-villa-7", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 246, -40),
  home("ad-shahama-villa-8", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 371, -40),
  home("ad-shahama-villa-9", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 496, -40),
  home("ad-shahama-villa-10", "Al Shahama Villa", "dubai-villa", "ad-tile-shahama", 621, -40),
  b("ad-rahba-hospital", "Al Rahba Hospital", "hospital", "ad-tile-shahama", -329, -40, 200, 150),
  home("ad-shahama-townhouse-1", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", -4, -150),
  home("ad-shahama-townhouse-2", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", 121, -150),
  home("ad-shahama-townhouse-3", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", 246, -150),
  home("ad-shahama-townhouse-4", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", 371, -150),
  home("ad-shahama-townhouse-5", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", 496, -150),
  home("ad-shahama-townhouse-6", "Al Shahama Townhouse", "small-house", "ad-tile-shahama", 621, -150),
  billboard("ad-bb-shahama", "Dubai Road Billboard", "ad-tile-shahama", -392, -150, "classic-highway"),
  // Mina Zayed & Al Zahiyah: Abu Dhabi Mall, the Beach Rotana, the fish market, the Iranian souq, the dhows, towers.
  b("ad-abu-dhabi-mall", "Abu Dhabi Mall", "mall", "ad-tile-mina", -498, 70, 240, 150),
  b("ad-beach-rotana", "Beach Rotana", "hotel", "ad-tile-mina", -207, 70, 200, 140),
  home("ad-zahiyah-tower-1", "Zahiyah Tower 1", "tall-building", "ad-tile-mina", 19, 70),
  home("ad-zahiyah-tower-2", "Zahiyah Tower 2", "tall-building", "ad-tile-mina", 201, 70),
  home("ad-zahiyah-tower-3", "Zahiyah Tower 3", "tall-building", "ad-tile-mina", 382, 70),
  home("ad-zahiyah-tower-4", "Zahiyah Tower 4", "tall-building", "ad-tile-mina", 563, 70),
  b("ad-mina-fish-market", "Mina Zayed Fish Market", "ad-souq", "ad-tile-mina", -499, -40, 200, 120),
  b("ad-iranian-souq", "Iranian Souq", "ad-souq", "ad-tile-mina", -210, -40, 200, 120),
  b("ad-mina-dhows", "Mina Zayed Dhow Harbour", "ad-dhow", "ad-tile-mina", 90, -40, 220, 130),
  home("ad-zahiyah-tower-5", "Zahiyah Tower 5", "tall-building", "ad-tile-mina", 345, -40),
  home("ad-zahiyah-tower-6", "Zahiyah Tower 6", "tall-building", "ad-tile-mina", 544, -40),
  b("ad-mina-yachts", "Mina Zayed Yacht Club", "ad-marina", "ad-tile-mina", -479, -150, 220, 110),
  b("ad-zahiyah-centre", "Zahiyah Neighbourhood Centre", "mall", "ad-tile-mina", -170, -150, 200, 130),
  home("ad-zahiyah-tower-7", "Zahiyah Tower 7", "tall-building", "ad-tile-mina", 85, -150),
  home("ad-zahiyah-tower-8", "Zahiyah Tower 8", "tall-building", "ad-tile-mina", 295, -150),
  billboard("ad-bb-mina", "Mina Road Billboard", "ad-tile-mina", 519, -150, "hoarding-banner"),
  // Al Reem's Shams Abu Dhabi: a forest of apartment towers round Reem Central Park, Boutik Mall and the clinic.
  home("ad-shams-tower-1", "Shams Tower 1", "tall-building", "ad-tile-shams", -569, 70),
  home("ad-shams-tower-2", "Shams Tower 2", "tall-building", "ad-tile-shams", -394, 70),
  home("ad-shams-tower-3", "Shams Tower 3", "tall-building", "ad-tile-shams", -220, 70),
  home("ad-shams-tower-4", "Shams Tower 4", "tall-building", "ad-tile-shams", -45, 70),
  home("ad-shams-tower-5", "Shams Tower 5", "tall-building", "ad-tile-shams", 130, 70),
  home("ad-shams-tower-6", "Shams Tower 6", "tall-building", "ad-tile-shams", 304, 70),
  b("ad-boutik-mall", "Boutik Mall", "mall", "ad-tile-shams", 524, 70, 200, 140),
  home("ad-shams-tower-7", "Shams Tower 7", "tall-building", "ad-tile-shams", -544, -40),
  home("ad-shams-tower-8", "Shams Tower 8", "tall-building", "ad-tile-shams", -344, -40),
  home("ad-shams-tower-9", "Shams Tower 9", "tall-building", "ad-tile-shams", -145, -40),
  home("ad-shams-tower-10", "Shams Tower 10", "tall-building", "ad-tile-shams", 55, -40),
  home("ad-shams-tower-11", "Shams Tower 11", "tall-building", "ad-tile-shams", 254, -40),
  b("ad-reem-central-park", "Reem Central Park", "ad-park", "ad-tile-shams", 499, -40, 200, 120),
  home("ad-shams-tower-12", "Shams Tower 12", "tall-building", "ad-tile-shams", -599, -150),
  home("ad-shams-tower-13", "Shams Tower 13", "tall-building", "ad-tile-shams", -455, -150),
  home("ad-shams-tower-14", "Shams Tower 14", "tall-building", "ad-tile-shams", -311, -150),
  home("ad-shams-tower-15", "Shams Tower 15", "tall-building", "ad-tile-shams", -167, -150),
  home("ad-shams-tower-16", "Shams Tower 16", "tall-building", "ad-tile-shams", -23, -150),
  b("ad-shams-centre", "Shams Neighbourhood Centre", "mall", "ad-tile-shams", 166, -150, 200, 130),
  b("ad-shams-clinic", "Shams Medical Centre", "hospital", "ad-tile-shams", 390, -150, 180, 140),
  billboard("ad-bb-shams", "Shams Boulevard Screen", "ad-tile-shams", 584, -150),
  // Al Samha & Al Falah: the big family villa suburbs, their neighbourhood centre and park.
  home("ad-samha-villa-1", "Al Samha Villa", "dubai-villa", "ad-tile-samha", -4, 70),
  home("ad-samha-villa-2", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 121, 70),
  home("ad-samha-villa-3", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 246, 70),
  home("ad-samha-villa-4", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 371, 70),
  home("ad-samha-villa-5", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 496, 70),
  home("ad-samha-villa-6", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 621, 70),
  b("ad-falah-centre", "Al Falah Neighbourhood Centre", "mall", "ad-tile-samha", -392, 70, 200, 130),
  home("ad-samha-villa-7", "Al Samha Villa", "dubai-villa", "ad-tile-samha", -4, -40),
  home("ad-samha-villa-8", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 121, -40),
  home("ad-samha-villa-9", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 246, -40),
  home("ad-samha-villa-10", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 371, -40),
  home("ad-samha-villa-11", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 496, -40),
  home("ad-samha-villa-12", "Al Samha Villa", "dubai-villa", "ad-tile-samha", 621, -40),
  b("ad-falah-park", "Al Falah Park", "ad-park", "ad-tile-samha", -392, -40, 180, 120),
  home("ad-samha-townhouse-1", "Al Samha Townhouse", "small-house", "ad-tile-samha", -129, -150),
  home("ad-samha-townhouse-2", "Al Samha Townhouse", "small-house", "ad-tile-samha", -4, -150),
  home("ad-samha-townhouse-3", "Al Samha Townhouse", "small-house", "ad-tile-samha", 121, -150),
  home("ad-samha-townhouse-4", "Al Samha Townhouse", "small-house", "ad-tile-samha", 246, -150),
  home("ad-samha-townhouse-5", "Al Samha Townhouse", "small-house", "ad-tile-samha", 371, -150),
  home("ad-samha-townhouse-6", "Al Samha Townhouse", "small-house", "ad-tile-samha", 496, -150),
  home("ad-samha-townhouse-7", "Al Samha Townhouse", "small-house", "ad-tile-samha", 621, -150),
  billboard("ad-bb-samha", "Al Falah Billboard", "ad-tile-samha", -454, -150, "classic-highway"),

  // Out on the open Gulf (no plain): the floating superyacht marinas where yacht parties are held.
  { id: "ad-saadiyat-party-marina", name: "Saadiyat Superyacht Party Marina", type: "ad-party-marina", virtualX: 980, virtualY: row(980, 380), width: 240, height: 130, interactive: true },
  { id: "ad-yas-party-marina", name: "Yas Floating Party Marina", type: "ad-party-marina", virtualX: 2880, virtualY: row(2880, 380), width: 240, height: 130, interactive: true },

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
