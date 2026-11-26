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
  // Doha is big: west of West Bay (the lagoon, Al Dafna, Al Sadd, Al Gharrafa), east to Al Khor, Gewan Island, Al Hilal
  // and Al Wakrah, and south (Umm Salal, Al Thumama, Simaisma), beyond the first map's edges like Dubai's districts.
  { id: "dq-tile-lagoon", name: "West Bay Lagoon (Legtaifiya)", x: -320, y: 640, w: 1300, h: 380, island: true },
  { id: "dq-tile-dafna", name: "Al Dafna & Diplomatic Area", x: -480, y: 1110, w: 1300, h: 380 },
  { id: "dq-tile-sadd", name: "Al Sadd & Al Mirqab", x: -510, y: 1590, w: 1300, h: 420 },
  { id: "dq-tile-gharrafa", name: "Al Gharrafa & Mall of Qatar", x: -510, y: 2080, w: 1300, h: 420 },
  { id: "dq-tile-alkhor", name: "Al Khor & Purple Island", x: 4470, y: 640, w: 1500, h: 380, island: true },
  { id: "dq-tile-gewan", name: "Gewan Island & Qetaifan North", x: 4290, y: 1110, w: 1500, h: 380, island: true },
  { id: "dq-tile-hilal", name: "Old Airport & Al Hilal", x: 4390, y: 1590, w: 1500, h: 420 },
  { id: "dq-tile-wakrah", name: "Al Wakrah", x: 4500, y: 2080, w: 1500, h: 420 },
  { id: "dq-tile-ummsalal", name: "Umm Salal & Doha Festival City", x: 400, y: 2570, w: 1500, h: 420 },
  { id: "dq-tile-thumama", name: "Al Thumama & Ain Khaled", x: 1970, y: 2570, w: 1500, h: 420 },
  { id: "dq-tile-simaisma", name: "Simaisma & Al Thakhira", x: 3540, y: 2570, w: 1500, h: 420 },
  { id: "dq-tile-mansoura", name: "Fereej Bin Mahmoud & Al Mansoura", x: -1170, y: 2570, w: 1500, h: 420 },
  { id: "dq-tile-lusailmarina", name: "Lusail Marina District", x: 5110, y: 2570, w: 1500, h: 420 },
  { id: "dq-tile-duhail", name: "Al Duhail & Al Markhiya", x: 400, y: 3060, w: 1500, h: 420 },
  { id: "dq-tile-wukair", name: "Al Wukair & Al Mashaf", x: 1970, y: 3060, w: 1500, h: 420 },
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
/** Billboards stand half as big again as their footprint, like Dubai's giant screens (the layout gives them room). */
export const BILLBOARD_SCALE = 1.5;
/** A billboard: ads are booked on it like Dubai's (components/commerce/BillboardAds), by its id. */
const billboard = (id: string, name: string, plain: string, dx: number, up: number, billboardStyle = "mega-led", scale = BILLBOARD_SCALE) =>
  ({ id, name, type: "giant-billboard", ...plainAt(plain, dx + up * SLANT, up), width: 140, height: 90, billboardStyle, interactive: true, plain, scale });

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
  b("dq-lusail-beach", "Lusail Beach", "dq-beach", "dq-tile-lusail", -118, -150, 200, 80),
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

  // West Bay Lagoon (Legtaifiya): villas along the lagoon's canals, Lagoona Mall, the marina and the jet skis.
  home("dq-lagoon-villa-1", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 275, 70),
  home("dq-lagoon-villa-2", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 400, 70),
  home("dq-lagoon-villa-3", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 525, 70),
  home("dq-lagoon-tower-1", "Lagoon Waterfront Tower", "tall-building", "dq-tile-lagoon", -454, 70),
  b("dq-lagoona-mall", "Lagoona Mall", "mall", "dq-tile-lagoon", -204, 70, 220, 150),
  home("dq-lagoon-tower-2", "Zigzag Lagoon Residences", "tall-building", "dq-tile-lagoon", 46, 70),
  home("dq-lagoon-villa-4", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 275, -40),
  home("dq-lagoon-villa-5", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 400, -40),
  home("dq-lagoon-villa-6", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 525, -40),
  b("dq-lagoon-marina", "West Bay Lagoon Marina", "dq-marina", "dq-tile-lagoon", -364, -40, 220, 110),
  b("dq-lagoon-jetski", "Lagoon Jet Ski & Watersports", "dq-jetski", "dq-tile-lagoon", -34, -40, 200, 100),
  home("dq-lagoon-villa-7", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 275, -150),
  home("dq-lagoon-villa-8", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 400, -150),
  home("dq-lagoon-villa-9", "Lagoon Waterfront Villa", "dubai-villa", "dq-tile-lagoon", 525, -150),
  b("dq-lagoon-beach", "Legtaifiya Beach", "dq-beach", "dq-tile-lagoon", -347, -150, 200, 80),
  billboard("dq-bb-lagoon", "Lagoon Road Screen", "dq-tile-lagoon", -31, -150, "luxury-curved"),
  // Al Dafna: the beach hotels and towers at the tip of West Bay, the Dafna marina and its jet skis, Al Bidda Park.
  { ...b("dq-four-seasons", "Four Seasons Doha", "dq-hotel-tower", "dq-tile-dafna", -444, 70, 120, 190), tint: "#334155" },
  home("dq-dafna-tower-1", "Dafna Sky Residences", "tall-building", "dq-tile-dafna", -239, 70),
  b("dq-intercontinental", "InterContinental Doha Beach", "hotel", "dq-tile-dafna", 5, 70, 200, 140),
  home("dq-dafna-tower-2", "Diplomatic Area Tower", "tall-building", "dq-tile-dafna", 249, 70),
  home("dq-dafna-tower-3", "Corniche Heights", "tall-building", "dq-tile-dafna", 449, 70),
  b("dq-dafna-beach-club", "Dafna Beach Club", "dq-beach-club", "dq-tile-dafna", -380, -40, 200, 90),
  b("dq-al-bidda-park", "Al Bidda Park", "dq-park", "dq-tile-dafna", -67, -40, 200, 120),
  home("dq-dafna-tower-4", "Bidda Park Tower", "tall-building", "dq-tile-dafna", 202, -40),
  home("dq-dafna-tower-5", "Dafna Bay Residences", "tall-building", "dq-tile-dafna", 425, -40),
  b("dq-dafna-marina", "Dafna Marina", "dq-marina", "dq-tile-dafna", -380, -150, 220, 110),
  b("dq-dafna-jetski", "Dafna Jet Ski & Flyboard", "dq-jetski", "dq-tile-dafna", -67, -150, 200, 100),
  billboard("dq-bb-dafna", "Dafna Corniche Screen", "dq-tile-dafna", 207, -150),
  home("dq-dafna-tower-6", "Dafna Marina Tower", "tall-building", "dq-tile-dafna", 435, -150),
  // Al Sadd & Al Mirqab: the dense heart of town: towers, Royal Plaza, Doha Oasis and Doha Quest, the hospital.
  home("dq-sadd-tower-1", "Al Sadd Tower", "tall-building", "dq-tile-sadd", -459, 70),
  b("dq-royal-plaza", "Royal Plaza", "mall", "dq-tile-sadd", -230, 70, 200, 140),
  home("dq-sadd-tower-2", "Mirqab Residences", "tall-building", "dq-tile-sadd", 0, 70),
  b("dq-hamad-hospital", "Hamad General Hospital", "hospital", "dq-tile-sadd", 230, 70, 200, 150),
  home("dq-sadd-tower-3", "Al Sadd Heights", "tall-building", "dq-tile-sadd", 459, 70),
  b("dq-doha-quest", "Doha Quest (Doha Oasis)", "dq-funfair", "dq-tile-sadd", -375, -40, 220, 140),
  home("dq-sadd-tower-4", "Doha Oasis Residences", "tall-building", "dq-tile-sadd", -107, -40),
  b("dq-jassim-stadium", "Jassim bin Hamad Stadium", "dq-stadium", "dq-tile-sadd", 162, -40, 220, 140),
  home("dq-sadd-tower-5", "Al Mirqab Tower", "tall-building", "dq-tile-sadd", 430, -40),
  b("dq-sadd-dining", "Al Sadd Street Restaurants", "dq-dining", "dq-tile-sadd", -426, -150, 140, 100),
  home("dq-sadd-tower-6", "Royal Plaza Residences", "tall-building", "dq-tile-sadd", -208, -150),
  { ...b("dq-millennium-sadd", "Millennium Hotel Doha", "dq-hotel-tower", "dq-tile-sadd", 0, -150, 120, 190), tint: "#7e1e3a" },
  home("dq-sadd-tower-7", "Sadd Gardens Tower", "tall-building", "dq-tile-sadd", 208, -150),
  billboard("dq-bb-sadd", "C Ring Road Billboard", "dq-tile-sadd", 426, -150, "classic-highway"),
  // Al Gharrafa & Mall of Qatar: the big mall, Ahmad bin Ali Stadium, the park, and villa compounds.
  home("dq-gharrafa-villa-1", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 271, 70),
  home("dq-gharrafa-villa-2", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 396, 70),
  home("dq-gharrafa-villa-3", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 521, 70),
  b("dq-mall-of-qatar", "Mall of Qatar", "mall", "dq-tile-gharrafa", -379, 70, 240, 150),
  b("dq-ahmad-stadium", "Ahmad bin Ali Stadium", "dq-stadium", "dq-tile-gharrafa", -39, 70, 260, 160),
  home("dq-gharrafa-villa-4", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 271, -40),
  home("dq-gharrafa-villa-5", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 396, -40),
  home("dq-gharrafa-villa-6", "Al Gharrafa Compound Villa", "dubai-villa", "dq-tile-gharrafa", 521, -40),
  b("dq-gharrafa-park", "Al Gharrafa Park", "dq-park", "dq-tile-gharrafa", -346, -40, 200, 120),
  b("dq-gharrafa-dining", "Gharrafa Family Restaurants", "dq-dining", "dq-tile-gharrafa", -32, -40, 140, 100),
  home("dq-gharrafa-townhouse-1", "Al Gharrafa Townhouse", "small-house", "dq-tile-gharrafa", 146, -150),
  home("dq-gharrafa-townhouse-2", "Al Gharrafa Townhouse", "small-house", "dq-tile-gharrafa", 271, -150),
  home("dq-gharrafa-townhouse-3", "Al Gharrafa Townhouse", "small-house", "dq-tile-gharrafa", 396, -150),
  home("dq-gharrafa-townhouse-4", "Al Gharrafa Townhouse", "small-house", "dq-tile-gharrafa", 521, -150),
  b("dq-driving-school", "Doha Driving School", "dq-driving-school", "dq-tile-gharrafa", -55, -150, 190, 130),
  billboard("dq-bb-gharrafa", "Dukhan Highway Billboard", "dq-tile-gharrafa", -266, -150, "classic-highway"),
  // Al Khor & Purple Island: Al Bayt's tent stadium, the mangroves of Purple Island, the fishing harbour and the beach.
  home("dq-alkhor-villa-1", "Al Khor Villa", "dubai-villa", "dq-tile-alkhor", 375, 70),
  home("dq-alkhor-villa-2", "Al Khor Villa", "dubai-villa", "dq-tile-alkhor", 500, 70),
  home("dq-alkhor-villa-3", "Al Khor Villa", "dubai-villa", "dq-tile-alkhor", 625, 70),
  b("dq-al-bayt", "Al Bayt Stadium", "dq-tent", "dq-tile-alkhor", -474, 70, 300, 170),
  b("dq-alkhor-park", "Al Khor Corniche Park", "dq-park", "dq-tile-alkhor", -154, 70, 200, 120),
  b("dq-alkhor-resort", "Al Khor Resort", "hotel", "dq-tile-alkhor", 116, 70, 200, 140),
  b("dq-purple-island", "Purple Island Mangroves", "dq-mangrove", "dq-tile-alkhor", -397, -40, 220, 120),
  b("dq-alkhor-harbour", "Al Khor Fishing Harbour", "dq-dhow", "dq-tile-alkhor", 10, -40, 220, 120),
  b("dq-alkhor-beach", "Al Khor Beach", "dq-beach", "dq-tile-alkhor", 407, -40, 200, 80),
  home("dq-alkhor-townhouse-1", "Al Khor Townhouse", "small-house", "dq-tile-alkhor", 250, -150),
  home("dq-alkhor-townhouse-2", "Al Khor Townhouse", "small-house", "dq-tile-alkhor", 375, -150),
  home("dq-alkhor-townhouse-3", "Al Khor Townhouse", "small-house", "dq-tile-alkhor", 500, -150),
  home("dq-alkhor-townhouse-4", "Al Khor Townhouse", "small-house", "dq-tile-alkhor", 625, -150),
  billboard("dq-bb-alkhor", "Al Khor Coastal Road Billboard", "dq-tile-alkhor", -266, -150, "classic-highway"),
  // Gewan Island & Qetaifan North: Crystal Residences, the Rixos, the beach club, Winter Wonderland, flyboards.
  home("dq-gewan-tower-1", "Crystal Residences", "tall-building", "dq-tile-gewan", -506, 70),
  home("dq-gewan-tower-2", "Crystal Residences II", "tall-building", "dq-tile-gewan", -263, 70),
  { ...b("dq-rixos-qetaifan", "Rixos Gulf Qetaifan", "dq-hotel-tower", "dq-tile-gewan", -15, 70, 120, 190), tint: "#0f766e" },
  home("dq-gewan-tower-3", "Gewan Sky Villas", "tall-building", "dq-tile-gewan", 233, 70),
  b("dq-gewan-boulevard", "Gewan Island Boulevard", "dq-dining", "dq-tile-gewan", 491, 70, 140, 100),
  b("dq-gewan-beach-club", "Gewan Beach Club", "dq-beach-club", "dq-tile-gewan", -412, -40, 200, 90),
  b("dq-gewan-marina", "Gewan Marina", "dq-marina", "dq-tile-gewan", -20, -40, 220, 110),
  b("dq-winter-wonderland", "Winter Wonderland (Al Maha Island)", "dq-funfair", "dq-tile-gewan", 392, -40, 240, 140),
  home("dq-gewan-villa-1", "Gewan Island Villa", "dubai-villa", "dq-tile-gewan", 250, -150),
  home("dq-gewan-villa-2", "Gewan Island Villa", "dubai-villa", "dq-tile-gewan", 375, -150),
  home("dq-gewan-villa-3", "Gewan Island Villa", "dubai-villa", "dq-tile-gewan", 500, -150),
  home("dq-gewan-villa-4", "Gewan Island Villa", "dubai-villa", "dq-tile-gewan", 625, -150),
  b("dq-gewan-jetski", "Gewan Jet Ski, Flyboard & Parasail", "dq-jetski", "dq-tile-gewan", -422, -150, 200, 100),
  billboard("dq-bb-gewan", "Gewan Island Screen", "dq-tile-gewan", -81, -150, "luxury-curved"),
  // Old Airport & Al Hilal: the container stadium, towers, the hypermarket, karak street and villa compounds.
  home("dq-hilal-villa-1", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 371, 70),
  home("dq-hilal-villa-2", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 496, 70),
  home("dq-hilal-villa-3", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 621, 70),
  home("dq-hilal-tower-1", "Old Airport Tower", "tall-building", "dq-tile-hilal", -579, 70),
  home("dq-hilal-tower-2", "Al Hilal Residences", "tall-building", "dq-tile-hilal", -414, 70),
  b("dq-hilal-hypermarket", "Al Hilal Hypermarket", "mall", "dq-tile-hilal", -204, 70, 200, 140),
  home("dq-hilal-tower-3", "Matar Qadeem Tower", "tall-building", "dq-tile-hilal", 6, 70),
  home("dq-hilal-tower-4", "Hilal Gardens Tower", "tall-building", "dq-tile-hilal", 171, 70),
  home("dq-hilal-villa-4", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 371, -40),
  home("dq-hilal-villa-5", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 496, -40),
  home("dq-hilal-villa-6", "Al Hilal Compound Villa", "dubai-villa", "dq-tile-hilal", 621, -40),
  b("dq-974-stadium", "Stadium 974", "dq-974", "dq-tile-hilal", -372, -40, 240, 140),
  b("dq-hilal-dining", "Old Airport Karak Street", "dq-dining", "dq-tile-hilal", 14, -40, 140, 100),
  home("dq-hilal-townhouse-1", "Al Hilal Townhouse", "small-house", "dq-tile-hilal", 246, -150),
  home("dq-hilal-townhouse-2", "Al Hilal Townhouse", "small-house", "dq-tile-hilal", 371, -150),
  home("dq-hilal-townhouse-3", "Al Hilal Townhouse", "small-house", "dq-tile-hilal", 496, -150),
  home("dq-hilal-townhouse-4", "Al Hilal Townhouse", "small-house", "dq-tile-hilal", 621, -150),
  billboard("dq-bb-hilal", "Old Airport Road Billboard", "dq-tile-hilal", -266, -150, "hoarding-banner"),
  // Al Wakrah: Al Janoub Stadium, the old souq on the sea, the family beach, the dhows and the jet skis.
  home("dq-wakrah-villa-1", "Al Wakrah Villa", "dubai-villa", "dq-tile-wakrah", 371, 70),
  home("dq-wakrah-villa-2", "Al Wakrah Villa", "dubai-villa", "dq-tile-wakrah", 496, 70),
  home("dq-wakrah-villa-3", "Al Wakrah Villa", "dubai-villa", "dq-tile-wakrah", 621, 70),
  b("dq-al-janoub", "Al Janoub Stadium", "dq-stadium", "dq-tile-wakrah", -496, 70, 260, 160),
  b("dq-wakrah-souq", "Al Wakrah Souq", "dq-souq", "dq-tile-wakrah", -174, 70, 260, 160),
  b("dq-wakrah-resort", "Al Wakrah Beach Resort", "hotel", "dq-tile-wakrah", 118, 70, 200, 140),
  b("dq-wakrah-harbour", "Al Wakrah Dhow Harbour", "dq-dhow", "dq-tile-wakrah", -389, -40, 220, 120),
  b("dq-wakrah-jetski", "Al Wakrah Jet Ski Beach", "dq-jetski", "dq-tile-wakrah", 10, -40, 200, 100),
  b("dq-wakrah-beach", "Al Wakrah Family Beach", "dq-beach", "dq-tile-wakrah", 399, -40, 200, 80),
  home("dq-wakrah-townhouse-1", "Al Wakrah Townhouse", "small-house", "dq-tile-wakrah", 246, -150),
  home("dq-wakrah-townhouse-2", "Al Wakrah Townhouse", "small-house", "dq-tile-wakrah", 371, -150),
  home("dq-wakrah-townhouse-3", "Al Wakrah Townhouse", "small-house", "dq-tile-wakrah", 496, -150),
  home("dq-wakrah-townhouse-4", "Al Wakrah Townhouse", "small-house", "dq-tile-wakrah", 621, -150),
  b("dq-wakrah-fish", "Al Wakrah Fish Market Grill", "dq-dining", "dq-tile-wakrah", -431, -150, 140, 100),
  billboard("dq-bb-wakrah", "Al Wakrah Road Billboard", "dq-tile-wakrah", -102, -150, "classic-highway"),
  // Umm Salal & Doha Festival City: the big mall and its theme park, the old fort, and the villas.
  home("dq-ummsalal-villa-1", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 371, 70),
  home("dq-ummsalal-villa-2", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 496, 70),
  home("dq-ummsalal-villa-3", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 621, 70),
  b("dq-festival-city", "Doha Festival City", "mall", "dq-tile-ummsalal", -484, 70, 260, 160),
  b("dq-festival-park", "Festival City Theme Park", "dq-funfair", "dq-tile-ummsalal", -159, 70, 240, 140),
  b("dq-umm-salal-fort", "Umm Salal Mohammed Fort", "dq-fort", "dq-tile-ummsalal", 121, 70, 170, 115),
  home("dq-ummsalal-villa-4", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 121, -40),
  home("dq-ummsalal-villa-5", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 246, -40),
  home("dq-ummsalal-villa-6", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 371, -40),
  home("dq-ummsalal-villa-7", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 496, -40),
  home("dq-ummsalal-villa-8", "Umm Salal Villa", "dubai-villa", "dq-tile-ummsalal", 621, -40),
  b("dq-ummsalal-dining", "Umm Salal Family Diner", "dq-dining", "dq-tile-ummsalal", -329, -40, 140, 100),
  home("dq-ummsalal-townhouse-1", "Umm Salal Townhouse", "small-house", "dq-tile-ummsalal", 121, -150),
  home("dq-ummsalal-townhouse-2", "Umm Salal Townhouse", "small-house", "dq-tile-ummsalal", 246, -150),
  home("dq-ummsalal-townhouse-3", "Umm Salal Townhouse", "small-house", "dq-tile-ummsalal", 371, -150),
  home("dq-ummsalal-townhouse-4", "Umm Salal Townhouse", "small-house", "dq-tile-ummsalal", 496, -150),
  home("dq-ummsalal-townhouse-5", "Umm Salal Townhouse", "small-house", "dq-tile-ummsalal", 621, -150),
  billboard("dq-bb-ummsalal", "Al Shamal Road Billboard", "dq-tile-ummsalal", -329, -150, "classic-highway"),
  // Al Thumama & Ain Khaled: the gahfiya-capped stadium and the big family villa compounds.
  home("dq-thumama-villa-1", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", -4, 70),
  home("dq-thumama-villa-2", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 121, 70),
  home("dq-thumama-villa-3", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 246, 70),
  home("dq-thumama-villa-4", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 371, 70),
  home("dq-thumama-villa-5", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 496, 70),
  home("dq-thumama-villa-6", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 621, 70),
  b("dq-al-thumama", "Al Thumama Stadium", "dq-gahfiya", "dq-tile-thumama", -392, 70, 260, 160),
  home("dq-thumama-villa-7", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", -4, -40),
  home("dq-thumama-villa-8", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 121, -40),
  home("dq-thumama-villa-9", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 246, -40),
  home("dq-thumama-villa-10", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 371, -40),
  home("dq-thumama-villa-11", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 496, -40),
  home("dq-thumama-villa-12", "Ain Khaled Compound Villa", "dubai-villa", "dq-tile-thumama", 621, -40),
  b("dq-thumama-park", "Ain Khaled Park", "dq-park", "dq-tile-thumama", -392, -40, 180, 120),
  home("dq-thumama-townhouse-1", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", -4, -150),
  home("dq-thumama-townhouse-2", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", 121, -150),
  home("dq-thumama-townhouse-3", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", 246, -150),
  home("dq-thumama-townhouse-4", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", 371, -150),
  home("dq-thumama-townhouse-5", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", 496, -150),
  home("dq-thumama-townhouse-6", "Al Thumama Townhouse", "small-house", "dq-tile-thumama", 621, -150),
  billboard("dq-bb-thumama", "E Ring Road Billboard", "dq-tile-thumama", -392, -150, "classic-highway"),
  // Simaisma & Al Thakhira: the mangroves, the beach, kitesurfing and jet skis, a desert camp and the villas.
  home("dq-simaisma-villa-1", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 371, 70),
  home("dq-simaisma-villa-2", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 496, 70),
  home("dq-simaisma-villa-3", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 621, 70),
  b("dq-thakhira", "Al Thakhira Mangroves", "dq-mangrove", "dq-tile-simaisma", -491, 70, 220, 120),
  b("dq-simaisma-beach", "Simaisma Beach", "dq-beach", "dq-tile-simaisma", -194, 70, 200, 80),
  b("dq-zulal-resort", "Zulal Wellness Resort", "hotel", "dq-tile-simaisma", 93, 70, 200, 140),
  home("dq-simaisma-villa-4", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 371, -40),
  home("dq-simaisma-villa-5", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 496, -40),
  home("dq-simaisma-villa-6", "Simaisma Beach Villa", "dubai-villa", "dq-tile-simaisma", 621, -40),
  b("dq-simaisma-jetski", "Simaisma Kitesurf & Jet Ski", "dq-jetski", "dq-tile-simaisma", -399, -40, 200, 100),
  b("dq-simaisma-harbour", "Simaisma Dhow Harbour", "dq-dhow", "dq-tile-simaisma", -9, -40, 200, 120),
  home("dq-simaisma-townhouse-1", "Simaisma Townhouse", "small-house", "dq-tile-simaisma", 371, -150),
  home("dq-simaisma-townhouse-2", "Simaisma Townhouse", "small-house", "dq-tile-simaisma", 496, -150),
  home("dq-simaisma-townhouse-3", "Simaisma Townhouse", "small-house", "dq-tile-simaisma", 621, -150),
  b("dq-simaisma-camp", "Simaisma Desert Camp", "dq-camp", "dq-tile-simaisma", -376, -150, 220, 140),
  billboard("dq-bb-simaisma", "Coastal Highway Billboard", "dq-tile-simaisma", 8, -150, "classic-highway"),

  // Fereej Bin Mahmoud & Al Mansoura: Doha's busy apartment quarter: towers, the centre, a park and a clinic.
  home("dq-mansoura-tower-1", "Mansoura Tower 1", "tall-building", "dq-tile-mansoura", -569, 70),
  home("dq-mansoura-tower-2", "Mansoura Tower 2", "tall-building", "dq-tile-mansoura", -394, 70),
  home("dq-mansoura-tower-3", "Mansoura Tower 3", "tall-building", "dq-tile-mansoura", -220, 70),
  home("dq-mansoura-tower-4", "Mansoura Tower 4", "tall-building", "dq-tile-mansoura", -45, 70),
  home("dq-mansoura-tower-5", "Mansoura Tower 5", "tall-building", "dq-tile-mansoura", 130, 70),
  home("dq-mansoura-tower-6", "Mansoura Tower 6", "tall-building", "dq-tile-mansoura", 304, 70),
  b("dq-mansoura-centre", "Mansoura Neighbourhood Centre", "mall", "dq-tile-mansoura", 524, 70, 200, 130),
  home("dq-mansoura-tower-7", "Mansoura Tower 7", "tall-building", "dq-tile-mansoura", -544, -40),
  home("dq-mansoura-tower-8", "Mansoura Tower 8", "tall-building", "dq-tile-mansoura", -344, -40),
  home("dq-mansoura-tower-9", "Mansoura Tower 9", "tall-building", "dq-tile-mansoura", -145, -40),
  home("dq-mansoura-tower-10", "Mansoura Tower 10", "tall-building", "dq-tile-mansoura", 55, -40),
  home("dq-mansoura-tower-11", "Mansoura Tower 11", "tall-building", "dq-tile-mansoura", 254, -40),
  b("dq-mansoura-park", "Fereej Bin Mahmoud Park", "dq-park", "dq-tile-mansoura", 499, -40, 200, 120),
  home("dq-mansoura-tower-12", "Mansoura Tower 12", "tall-building", "dq-tile-mansoura", -593, -150),
  home("dq-mansoura-tower-13", "Mansoura Tower 13", "tall-building", "dq-tile-mansoura", -442, -150),
  home("dq-mansoura-tower-14", "Mansoura Tower 14", "tall-building", "dq-tile-mansoura", -291, -150),
  home("dq-mansoura-tower-15", "Mansoura Tower 15", "tall-building", "dq-tile-mansoura", -140, -150),
  home("dq-mansoura-tower-16", "Mansoura Tower 16", "tall-building", "dq-tile-mansoura", 10, -150),
  b("dq-mansoura-clinic", "Al Mansoura Health Centre", "hospital", "dq-tile-mansoura", 196, -150, 180, 140),
  b("dq-mansoura-dining", "Mansoura Night Market", "dq-dining", "dq-tile-mansoura", 397, -150, 140, 100),
  billboard("dq-bb-mansoura", "Al Mansoura Screen", "dq-tile-mansoura", 578, -150),
  // Lusail Marina District: towers on the water, the yacht club and jet skis.
  home("dq-lmarina-tower-1", "Lusail Marina Residences 1", "tall-building", "dq-tile-lusailmarina", -547, 70),
  home("dq-lmarina-tower-2", "Lusail Marina Residences 2", "tall-building", "dq-tile-lusailmarina", -350, 70),
  home("dq-lmarina-tower-3", "Lusail Marina Residences 3", "tall-building", "dq-tile-lusailmarina", -153, 70),
  home("dq-lmarina-tower-4", "Lusail Marina Residences 4", "tall-building", "dq-tile-lusailmarina", 43, 70),
  home("dq-lmarina-tower-5", "Lusail Marina Residences 5", "tall-building", "dq-tile-lusailmarina", 240, 70),
  b("dq-lusail-marina-centre", "Lusail Marina Promenade", "mall", "dq-tile-lusailmarina", 492, 70, 220, 140),
  home("dq-lmarina-tower-6", "Lusail Marina Residences 6", "tall-building", "dq-tile-lusailmarina", -551, -40),
  home("dq-lmarina-tower-7", "Lusail Marina Residences 7", "tall-building", "dq-tile-lusailmarina", -359, -40),
  home("dq-lmarina-tower-8", "Lusail Marina Residences 8", "tall-building", "dq-tile-lusailmarina", -166, -40),
  home("dq-lmarina-tower-9", "Lusail Marina Residences 9", "tall-building", "dq-tile-lusailmarina", 26, -40),
  b("dq-lusail-yacht-club", "Lusail Yacht Club", "dq-marina", "dq-tile-lusailmarina", 274, -40, 220, 110),
  b("dq-lusail-marina-dining", "Marina Promenade Dining", "dq-dining", "dq-tile-lusailmarina", 536, -40, 140, 100),
  home("dq-lmarina-tower-10", "Lusail Marina Residences 10", "tall-building", "dq-tile-lusailmarina", -548, -150),
  home("dq-lmarina-tower-11", "Lusail Marina Residences 11", "tall-building", "dq-tile-lusailmarina", -353, -150),
  home("dq-lmarina-tower-12", "Lusail Marina Residences 12", "tall-building", "dq-tile-lusailmarina", -158, -150),
  home("dq-lmarina-tower-13", "Lusail Marina Residences 13", "tall-building", "dq-tile-lusailmarina", 38, -150),
  b("dq-lusail-jetski", "Lusail Marina Jet Ski", "dq-jetski", "dq-tile-lusailmarina", 278, -150, 200, 100),
  billboard("dq-bb-lmarina", "Lusail Marina Screen", "dq-tile-lusailmarina", 533, -150, "luxury-curved"),
  // Al Duhail & Al Markhiya: family villas round the neighbourhood centre and the park.
  home("dq-duhail-villa-1", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", -4, 70),
  home("dq-duhail-villa-2", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 121, 70),
  home("dq-duhail-villa-3", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 246, 70),
  home("dq-duhail-villa-4", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 371, 70),
  home("dq-duhail-villa-5", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 496, 70),
  home("dq-duhail-villa-6", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 621, 70),
  b("dq-duhail-centre", "Al Duhail Neighbourhood Centre", "mall", "dq-tile-duhail", -392, 70, 200, 130),
  home("dq-duhail-villa-7", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", -4, -40),
  home("dq-duhail-villa-8", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 121, -40),
  home("dq-duhail-villa-9", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 246, -40),
  home("dq-duhail-villa-10", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 371, -40),
  home("dq-duhail-villa-11", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 496, -40),
  home("dq-duhail-villa-12", "Al Duhail Villa", "dubai-villa", "dq-tile-duhail", 621, -40),
  b("dq-markhiya-park", "Al Markhiya Park", "dq-park", "dq-tile-duhail", -392, -40, 180, 120),
  home("dq-markhiya-townhouse-1", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", -129, -150),
  home("dq-markhiya-townhouse-2", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", -4, -150),
  home("dq-markhiya-townhouse-3", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", 121, -150),
  home("dq-markhiya-townhouse-4", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", 246, -150),
  home("dq-markhiya-townhouse-5", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", 371, -150),
  home("dq-markhiya-townhouse-6", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", 496, -150),
  home("dq-markhiya-townhouse-7", "Al Markhiya Townhouse", "small-house", "dq-tile-duhail", 621, -150),
  billboard("dq-bb-duhail", "Al Shamal Road Screen", "dq-tile-duhail", -454, -150, "classic-highway"),
  // Al Wukair & Al Mashaf: the new family town in the south: its mall, clinic, villas and townhouses.
  home("dq-wukair-villa-1", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", -4, 70),
  home("dq-wukair-villa-2", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 121, 70),
  home("dq-wukair-villa-3", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 246, 70),
  home("dq-wukair-villa-4", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 371, 70),
  home("dq-wukair-villa-5", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 496, 70),
  home("dq-wukair-villa-6", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 621, 70),
  b("dq-wukair-mall", "Al Wukair Mall", "mall", "dq-tile-wukair", -392, 70, 220, 140),
  home("dq-wukair-villa-7", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", -4, -40),
  home("dq-wukair-villa-8", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 121, -40),
  home("dq-wukair-villa-9", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 246, -40),
  home("dq-wukair-villa-10", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 371, -40),
  home("dq-wukair-villa-11", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 496, -40),
  home("dq-wukair-villa-12", "Al Wukair Villa", "dubai-villa", "dq-tile-wukair", 621, -40),
  b("dq-wukair-clinic", "Al Wukair Health Centre", "hospital", "dq-tile-wukair", -392, -40, 180, 140),
  home("dq-mashaf-townhouse-1", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", -129, -150),
  home("dq-mashaf-townhouse-2", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", -4, -150),
  home("dq-mashaf-townhouse-3", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", 121, -150),
  home("dq-mashaf-townhouse-4", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", 246, -150),
  home("dq-mashaf-townhouse-5", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", 371, -150),
  home("dq-mashaf-townhouse-6", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", 496, -150),
  home("dq-mashaf-townhouse-7", "Al Mashaf Townhouse", "small-house", "dq-tile-wukair", 621, -150),
  billboard("dq-bb-wukair", "Mesaieed Road Billboard", "dq-tile-wukair", -454, -150, "classic-highway"),

  // Out on the open Gulf (no plain): the floating superyacht marinas where yacht parties are held.
  { id: "dq-pearl-party-marina", name: "Pearl Superyacht Party Marina", type: "dq-party-marina", virtualX: 1000, virtualY: row(1000, 380), width: 240, height: 130, interactive: true },
  { id: "dq-lusail-party-marina", name: "Lusail Floating Party Marina", type: "dq-party-marina", virtualX: 2900, virtualY: row(2900, 380), width: 240, height: 130, interactive: true },

  // Billboards: the same paid ads as Dubai's and Abu Dhabi's.
  billboard("dq-bb-pearl", "The Pearl Gateway Screen", "dq-tile-pearl", 80, -150, "luxury-curved", 1.2),
  billboard("dq-bb-lusail", "Lusail Expressway Billboard", "dq-tile-lusail", 88, -150, "classic-highway", 1.2),
  b("dq-game-city", "Game City Doha", "dq-game-city", "dq-tile-westbay", 300, -40, 220, 150),
  billboard("dq-bb-westbay", "West Bay Mega Screen", "dq-tile-westbay", 60, -150),
  billboard("dq-bb-corniche", "Corniche LED Screen", "dq-tile-corniche", 120, -150, "luxury-curved"),
  billboard("dq-bb-souq", "Msheireb Billboard", "dq-tile-souq", 40, -150, "hoarding-banner"),
  billboard("dq-bb-aspire", "Aspire Zone Screen", "dq-tile-aspire", 230, -150),
  billboard("dq-bb-doh", "DOH Arrivals Screen", "dq-tile-doh", 420, -170),
  billboard("dq-bb-salwa", "Salwa Road Billboard", "dq-tile-education", -60, -150, "classic-highway"),
  billboard("dq-bb-desert", "Desert Road Billboard", "dq-tile-desert", 450, -150, "classic-highway"),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/** Ground ads: flat ad tiles on the empty ground in each district's rows (in the gaps between what stands there),
 *  booked like Dubai's floor ads ("floor:<id>", priced per 18 px cell: the id ends in its size, …-w5h3). Worked out
 *  from the layout, so they follow it. */
const CELL = 18;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groundAds(): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const p of DQ_PLAINS) {
    // Not on the airport (its own drawing covers its ground).
    if (/airport/i.test(p.name)) continue;
    const room = p.w / 2 - (p.h / 2) * SLANT - 12;
    for (const up of [70, -40, -150]) {
      const taken = DQ_BUILDINGS.filter((e) => e.plain === p.id && Math.abs(e.virtualY - row(e.virtualX, p.y) - up) < 30).map((e) => {
        const dx = e.virtualX - p.x - up * SLANT, half = ((e.width ?? 120) * (e.scale ?? 1)) / 2 + 10;
        return [dx - half, dx + half] as [number, number];
      }).sort((a, b) => a[0] - b[0]);
      let x = -room, k = 0;
      for (const [a, b2] of [...taken, [room, room] as [number, number]]) {
        const gap = a - x;
        if (gap >= 100) {
          const cols = Math.min(9, Math.floor((gap - 20) / CELL)), w = cols * CELL, c = x + gap / 2;
          out.push({ id: `dq-ga-${p.id.replace("dq-tile-", "")}-${up < 0 ? "m" + -up : up}-${k++}-w${cols}h3`, name: `Ground ad · ${cols * 3} cells`, type: "floor-ad",
            ...plainAt(p.id, c + up * SLANT, up + 12), width: w, height: 3 * CELL, interactive: true });
        }
        x = Math.max(x, b2);
      }
    }
  }
  return out;
}
const GROUND_ADS = groundAds();

export const DQ_ENTITIES: any[] = [
  ...GROUND_ADS.map((e) => ({ ...e, city: "doha" })),...DQ_TILES, ...DQ_BUILDINGS.map((e) => ({ ...e, city: "doha" }))];

/** Shared types drawn in Doha's own style on its map (components/map/DohaSprites). */
export const DQ_STYLED_TYPES = new Set(["tall-building", "dubai-villa", "small-house", "mall", "hotel"]);

/** Buildings whose base runs past their plain's slanted sides or edges (should be none: each row has to fit). */
export const dqOutOfPlain = () => DQ_BUILDINGS.filter((e) => {
  const p = DQ_PLAINS.find((q) => q.id === e.plain);
  if (!p) return false;
  const up = e.virtualY - row(e.virtualX, p.y), dx = e.virtualX - p.x - up * SLANT, room = p.w / 2 - (p.h / 2) * SLANT - 12;
  return Math.abs(dx) + (e.width ?? 120) / 2 > room + 1 || up > p.h / 2 - 60 || up < -p.h / 2 + 15;
}).map((e) => e.id);
