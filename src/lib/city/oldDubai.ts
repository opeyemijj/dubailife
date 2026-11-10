// Bur Dubai and Deira: old Dubai on the city map, either side of Dubai Creek. Bur Dubai stands behind Dubai
// Frame (virtual y grows up the map, towards the sea), and Deira beside and behind it across the Creek, along
// the coast as it curves north-east. Real places, in their real order:
//   Bur Dubai: Dubai Courts (Riyadh Street, Umm Hurair 2, next to Al Maktoum Bridge), Latifa Women and
//   Children Hospital (Oud Metha Road), Meena Bazaar, the Al Fahidi Historical District, BurJuman, Grand
//   Hyatt Dubai and the Bur Dubai abra station.
//   Deira: the Gold Souk and Spice Souk in Al Ras, the Al Ahmadiya School, the Deira Clocktower, City Centre
//   Deira, Al Ghurair Centre, Dubai Hospital and Hyatt Regency Dubai on the Corniche, and the Deira abra station.
// The Creek, Al Maktoum Bridge and the abras crossing are drawn in components/map/MapBackground (CREEK below).

/** Each district's plot: its centre (virtual), size, and how its rows and columns lean (like Game City's). */
const SLANT = 0.2355, TILT = 0.01667;
export const BUR_DUBAI = { id: "tile-bur-dubai", name: "Bur Dubai", x: 5060, y: 1400, width: 720, height: 380 };
export const DEIRA = { id: "tile-deira", name: "Deira", x: 5900, y: 1880, width: 700, height: 380 };

/** Dubai Creek's centre line, from its mouth on the coast inland (virtual coordinates), and its width. */
export const CREEK = {
  path: [[5150, 2095], [5360, 1820], [5520, 1600], [5610, 1380], [5700, 1100]] as Array<[number, number]>,
  width: 64,
  /** Al Maktoum Bridge: where it crosses (on the path between its 3rd and 4th points) and the abra crossing. */
  bridge: [5566, 1490] as [number, number],
  /** The abra crossing, bank to bank (Bur Dubai side first), square to the water just upstream of the stations. */
  abra: [[5455, 1620], [5521, 1668]] as Array<[number, number]>,
};

const onPlot = (plot: { x: number; y: number }, u: number, v: number) => ({ virtualX: Math.round(plot.x + u + v * SLANT), virtualY: Math.round(plot.y + v - u * TILT) });

type Entity = { id: string; name: string; type: string; virtualX: number; virtualY: number; width?: number; height?: number; generated: true; interactive: boolean; [k: string]: unknown };
type Placed = { id: string; name: string; type: string; interactive: boolean; width?: number; height?: number; [k: string]: unknown };
const at = (plot: typeof BUR_DUBAI, u: number, v: number, e: Placed): Entity => ({ ...e, ...onPlot(plot, u, v), generated: true });

export const OLD_DUBAI_ENTITIES: Entity[] = [
  // The two districts' ground.
  { id: BUR_DUBAI.id, name: BUR_DUBAI.name, type: "floor-tile", virtualX: BUR_DUBAI.x, virtualY: BUR_DUBAI.y, width: BUR_DUBAI.width, height: BUR_DUBAI.height, color: "#e3cfa4", generated: true, interactive: false },
  { id: DEIRA.id, name: DEIRA.name, type: "floor-tile", virtualX: DEIRA.x, virtualY: DEIRA.y, width: DEIRA.width, height: DEIRA.height, color: "#e6d2a2", generated: true, interactive: false },

  // The abra stations, one on each bank at the crossing.
  { id: "bur-dubai-abra", name: "Bur Dubai Abra Station", type: "od-abra", virtualX: 5400, virtualY: 1588, width: 90, height: 70, generated: true, interactive: true },
  { id: "deira-abra", name: "Deira Old Souk Abra Station", type: "od-abra", virtualX: 5585, virtualY: 1690, width: 90, height: 70, generated: true, interactive: true },

  // Bur Dubai, back row (by the water) to front row (towards the Frame).
  at(BUR_DUBAI, -230, 130, { id: "al-fahidi", name: "Al Fahidi Historical District", type: "od-heritage", width: 150, height: 110, interactive: true }),
  at(BUR_DUBAI, 20, 130, { id: "meena-bazaar", name: "Meena Bazaar", type: "od-bazaar", width: 160, height: 110, interactive: true }),
  at(BUR_DUBAI, -150, 5, { id: "burjuman", name: "BurJuman", type: "mall", width: 170, height: 120, interactive: true }),
  at(BUR_DUBAI, 150, 10, { id: "grand-hyatt-dubai", name: "Grand Hyatt Dubai", type: "szr-tower", sign: "GRAND HYATT", glass: "#7dd3fc", frame: "#e7e5e4", accent: "#b45309", crown: "slab", width: 110, height: 230, scale: 0.7, interactive: true }),
  at(BUR_DUBAI, -235, -125, { id: "latifa-hospital", name: "Latifa Women and Children Hospital", type: "od-hospital", accent: "#db2777", width: 130, height: 130, interactive: true }),
  at(BUR_DUBAI, 130, -120, { id: "dubai-courts", name: "Dubai Courts", type: "od-courts", width: 170, height: 120, interactive: true }),

  // Deira, back row (the Al Ras souks by the water) to front row.
  at(DEIRA, -180, 130, { id: "gold-souk", name: "Dubai Gold Souk", type: "od-gold-souk", width: 180, height: 120, interactive: true }),
  at(DEIRA, 60, 135, { id: "spice-souk", name: "Spice Souk", type: "od-spice-souk", width: 130, height: 90, interactive: true }),
  at(DEIRA, 250, 140, { id: "al-ahmadiya", name: "Al Ahmadiya School & Heritage House", type: "od-heritage", width: 140, height: 104, interactive: true }),
  at(DEIRA, -262, 5, { id: "hyatt-regency-dubai", name: "Hyatt Regency Dubai", type: "szr-tower", sign: "HYATT REGENCY", glass: "#93c5fd", frame: "#f1f5f9", accent: "#1d4ed8", crown: "slab", width: 110, height: 230, scale: 0.7, interactive: true }),
  at(DEIRA, 20, 0, { id: "deira-clocktower", name: "Deira Clocktower", type: "od-clocktower", width: 90, height: 130, interactive: true }),
  at(DEIRA, 220, -5, { id: "city-centre-deira", name: "City Centre Deira", type: "mall", width: 170, height: 120, interactive: true }),
  at(DEIRA, -150, -130, { id: "dubai-hospital", name: "Dubai Hospital", type: "od-hospital", accent: "#0284c7", width: 130, height: 130, interactive: true }),
  at(DEIRA, 140, -135, { id: "al-ghurair-centre", name: "Al Ghurair Centre", type: "mall", width: 160, height: 115, interactive: true }),
];
