// Furniture catalog and the apartment's placement grid.
// The room is a square of GRID x GRID cells; floor items occupy a w x d block of cells,
// wall items occupy a run of cells along one wall.

export const ROOM_SIZE = 10; // metres
export const CELL = 0.5; // metres per grid cell
export const GRID = ROOM_SIZE / CELL; // 20
/** Homes were first drawn on a 7 m square (14 cells). Layouts below are still written in those numbers and
    spread out to the 10 m home by LAYOUT_SCALE; furniture keeps its real size, so rooms get roomier. */
export const OLD_GRID = 14;
export const LAYOUT_SCALE = ROOM_SIZE / (OLD_GRID * CELL);
export const WALL_HEIGHT = 3;

export type Wall = "north" | "south" | "east" | "west";
export type Rotation = 0 | 1 | 2 | 3; // quarter turns

export interface FloorPlacement {
  kind: "floor";
  col: number; // min x cell of the footprint
  row: number; // min z cell of the footprint
  rot: Rotation;
  /** Which floor of a two-storey home (0 downstairs, 1 upstairs); absent means 0. */
  level?: number;
  /** The grid it was placed on: absent for the old 14-cell homes (moved on load, see migratePlacement). */
  g?: number;
}

export interface WallPlacement {
  kind: "wall";
  wall: Wall;
  offset: number; // first cell along the wall
  level?: number;
  g?: number;
}

/** One coordinate of an old 14-cell placement on the 20-cell grid: things against a wall stay against it. */
function spreadCell(v: number, span: number) {
  if (v <= 0) return 0;
  if (v + span >= OLD_GRID) return GRID - span;
  return Math.max(0, Math.min(GRID - span, Math.round(v * LAYOUT_SCALE)));
}

/** Moves a placement made in the old, smaller home to the same spot in today's home. */
export function migratePlacement<P extends Placement | null | undefined>(p: P, size: [number, number]): P {
  if (!p || p.g === GRID) return p;
  if (p.kind === "wall") return { ...p, offset: spreadCell(p.offset, size[0]), g: GRID };
  const [w, d] = p.rot % 2 === 0 ? size : [size[1], size[0]];
  return { ...p, col: spreadCell(p.col, w), row: spreadCell(p.row, d), g: GRID };
}

/** The floor a placed item is on (0 when unset: every single-storey home and older saves). */
export const levelOf = (p?: Placement | null) => p?.level ?? 0;

export type Placement = FloorPlacement | WallPlacement;

/** One owned piece of furniture. `placement` is null while it sits in storage. */
export interface OwnedFurniture {
  uid: string;
  itemId: string;
  placement: Placement | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  /** "rug" items lie flat and may sit under other furniture; "ceiling" items hang overhead (chandeliers). */
  kind: "floor" | "rug" | "wall" | "ceiling";
  /** Footprint in cells: [width, depth] for floor/rug items, [width, height] for wall items. */
  size: [number, number];
  /** GLB under /public; wall art without a model is drawn in code. */
  model?: string;
  /** Extra yaw (radians) so the model's front faces +z. */
  yaw?: number;
  /** Comes with every apartment (not sold in the shop). */
  builtIn?: boolean;
  /** Tapping it does something (sit, sleep, open the fridge). */
  interaction?: Interaction;
  /** Drawn in code (components/home/LuxuryDecor) rather than from a model. */
  visual?: string;
  /** Shop section. */
  category?: ShopCategory;
  /** Part of the building (the staircase): can't be moved or stored. */
  fixed?: boolean;
}

export type ShopCategory = "living" | "bedroom" | "dining" | "lighting" | "wall" | "decor";
export const SHOP_CATEGORIES: Array<{ id: ShopCategory; label: string; icon: string }> = [
  { id: "living", label: "Living", icon: "🛋️" },
  { id: "bedroom", label: "Bedroom", icon: "🛏️" },
  { id: "dining", label: "Dining & kitchen", icon: "🍽️" },
  { id: "lighting", label: "Lighting", icon: "💡" },
  { id: "wall", label: "Wall art & mirrors", icon: "🖼️" },
  { id: "decor", label: "Decor", icon: "🏺" },
];

export const CATALOG: CatalogItem[] = [
  { id: "sofa", name: "Modern Velvet Sofa", desc: "Super comfortable for guests.", icon: "🛋️", price: 3500, kind: "floor", size: [4, 2], model: "/models/furniture/couch.glb", interaction: "chair", category: "living" },
  { id: "l-sofa", name: "L-Shaped Lounge Sofa", desc: "Room for the whole crew.", icon: "🛋️", price: 6800, kind: "floor", size: [4, 4], model: "/models/furniture/l-couch.glb", interaction: "chair", category: "living" },
  { id: "lounge-chair", name: "Designer Lounge Chair", desc: "Mid-century comfort.", icon: "💺", price: 1800, kind: "floor", size: [2, 2], model: "/models/furniture/lounge-chair.glb", interaction: "chair", category: "living" },
  { id: "tv", name: '65" Flat Screen TV with Table Stand', desc: "Ultra-thin 65-inch 4K OLED flat screen TV on a modern media table stand.", icon: "📺", price: 4200, kind: "floor", size: [4, 1], category: "living" },
  { id: "coffee-table", name: "Glass Coffee Table", desc: "Tempered glass, brushed legs.", icon: "☕", price: 1600, kind: "floor", size: [3, 2], model: "/models/furniture/coffee-table.glb", category: "living" },
  { id: "bookcase", name: "Oak Bookcase", desc: "For your growing library.", icon: "📚", price: 2100, kind: "floor", size: [2, 1], model: "/models/furniture/bookcase.glb", category: "living" },
  { id: "desk", name: "Work Desk", desc: "Run your empire from home.", icon: "🖥️", price: 1900, kind: "floor", size: [3, 2], model: "/models/furniture/desk.glb", category: "bedroom" },
  { id: "desk-chair", name: "Office Chair", desc: "Ergonomic and swivelling.", icon: "🪑", price: 1100, kind: "floor", size: [1, 1], model: "/models/furniture/desk-chair.glb", interaction: "chair", category: "bedroom" },
  { id: "side-table", name: "Side Table", desc: "Perfect next to a sofa.", icon: "🟫", price: 600, kind: "floor", size: [1, 1], model: "/models/furniture/side-table.glb", category: "living" },
  { id: "floor-lamp", name: "Arc Floor Lamp", desc: "Warm evening glow.", icon: "💡", price: 900, kind: "floor", size: [1, 1], model: "/models/furniture/floor-lamp.glb", category: "lighting" },
  { id: "plant", name: "Fiddle Leaf Plant", desc: "Brings the room to life.", icon: "🪴", price: 450, kind: "floor", size: [1, 1], model: "/models/furniture/houseplant.glb", category: "decor" },
  { id: "carpet", name: "Silk Persian Carpet", desc: "Luxurious handcrafted weave.", icon: "🧶", price: 2800, kind: "rug", size: [6, 4], model: "/models/furniture/rug.glb", category: "decor" },
  { id: "round-rug", name: "Round Majlis Rug", desc: "Soft and round.", icon: "⭕", price: 1200, kind: "rug", size: [4, 4], model: "/models/furniture/round-rug.glb", category: "decor" },
  // Luxury decor, drawn in code (components/home/LuxuryDecor.tsx).
  { id: "chandelier-crystal", name: "Crystal Chandelier", desc: "Tiers of crystal drops that catch the light.", icon: "💎", price: 9500, kind: "ceiling", size: [2, 2], visual: "chandelier-crystal", category: "lighting" },
  { id: "chandelier-ring", name: "Gold Ring Chandelier", desc: "Three brushed-gold halo rings of warm LED.", icon: "⭕", price: 7200, kind: "ceiling", size: [2, 2], visual: "chandelier-ring", category: "lighting" },
  { id: "pendant-trio", name: "Smoked Glass Pendant Trio", desc: "Three globe pendants for over an island or table.", icon: "🔮", price: 3400, kind: "ceiling", size: [3, 1], visual: "pendant-trio", category: "lighting" },
  { id: "gold-floor-lamp", name: "Brass Tripod Lamp", desc: "A tall brass tripod with a linen shade.", icon: "🪔", price: 1400, kind: "floor", size: [1, 1], visual: "tripod-lamp", category: "lighting" },
  { id: "wall-sconces", name: "Pair of Brass Wall Sconces", desc: "Warm uplights either side of art or a bed.", icon: "🕯️", price: 1600, kind: "wall", size: [3, 1], visual: "sconces", category: "lighting" },
  { id: "grand-piano", name: "Concert Grand Piano", desc: "Gloss black, lid up, ready for a recital.", icon: "🎹", price: 38000, kind: "floor", size: [3, 4], visual: "grand-piano", category: "living", interaction: "chair" },
  { id: "fireplace", name: "Marble Electric Fireplace", desc: "A sleek linear flame set in white marble.", icon: "🔥", price: 12500, kind: "floor", size: [4, 1], visual: "fireplace", category: "living" },
  { id: "aquarium", name: "Reef Aquarium", desc: "A 2-metre tank of tropical reef fish.", icon: "🐠", price: 14000, kind: "floor", size: [4, 1], visual: "aquarium", category: "living" },
  { id: "majlis", name: "Majlis Seating", desc: "Low floor cushions in an L for gahwa with guests.", icon: "🕌", price: 6500, kind: "floor", size: [4, 4], visual: "majlis", category: "living", interaction: "chair" },
  { id: "velvet-armchair", name: "Emerald Velvet Armchair", desc: "Deep-buttoned velvet on brass feet.", icon: "💚", price: 2900, kind: "floor", size: [2, 2], visual: "armchair", category: "living", interaction: "chair" },
  { id: "ottoman", name: "Tufted Leather Ottoman", desc: "A round pouf in cognac leather.", icon: "🟤", price: 900, kind: "floor", size: [1, 1], visual: "ottoman", category: "living" },
  { id: "media-wall", name: '85" Media Wall', desc: "A wall-mounted 85-inch screen in a walnut surround.", icon: "📺", price: 8800, kind: "wall", size: [5, 2], visual: "media-wall", category: "living" },
  { id: "canopy-bed", name: "Four-Poster Canopy Bed", desc: "A king bed under brass posts and sheer drapes.", icon: "👑", price: 16500, kind: "floor", size: [4, 5], visual: "canopy-bed", category: "bedroom", interaction: "bed" },
  { id: "vanity", name: "Hollywood Vanity", desc: "A dressing table with a bulb-lit mirror.", icon: "💄", price: 3600, kind: "floor", size: [2, 1], visual: "vanity", category: "bedroom" },
  { id: "wardrobe", name: "Walk-in Wardrobe Unit", desc: "Glass-fronted wardrobe with lit shelves.", icon: "👔", price: 7400, kind: "floor", size: [4, 1], visual: "wardrobe", category: "bedroom" },
  { id: "dining-set", name: "Marble Dining Set for Six", desc: "A Calacatta marble table with six velvet chairs.", icon: "🍽️", price: 11800, kind: "floor", size: [4, 3], visual: "dining-set", category: "dining" },
  { id: "kitchen-island", name: "Marble Kitchen Island", desc: "A waterfall-edge island with three stools.", icon: "🧑‍🍳", price: 13500, kind: "floor", size: [4, 2], visual: "kitchen-island", category: "dining" },
  { id: "coffee-bar", name: "Espresso & Gahwa Bar", desc: "A coffee machine, dallah and cups on a brass cart.", icon: "☕", price: 2400, kind: "floor", size: [2, 1], visual: "coffee-bar", category: "dining", interaction: "cooler" },
  { id: "wine-wall", name: "Lit Beverage Wall", desc: "A glass-fronted, back-lit drinks cabinet.", icon: "🍾", price: 5200, kind: "floor", size: [3, 1], visual: "drinks-cabinet", category: "dining" },
  { id: "mirror-gold", name: "Venetian Gold Mirror", desc: "A tall arched mirror in a gilded frame.", icon: "🪞", price: 2600, kind: "wall", size: [2, 3], visual: "mirror", category: "wall" },
  { id: "art-abstract", name: "Gold-Leaf Abstract Canvas", desc: "Sweeping navy and gold brushwork.", icon: "🎨", price: 4200, kind: "wall", size: [3, 2], visual: "art-abstract", category: "wall" },
  { id: "art-calligraphy", name: "Arabic Calligraphy Panel", desc: "Gold Thuluth script on black, framed.", icon: "🖋️", price: 5600, kind: "wall", size: [3, 2], visual: "art-calligraphy", category: "wall" },
  { id: "art-desert", name: "Desert Dunes Triptych", desc: "Three panels of golden-hour dunes.", icon: "🏜️", price: 3800, kind: "wall", size: [4, 2], visual: "art-desert", category: "wall" },
  { id: "floating-shelves", name: "Floating Oak Shelves", desc: "Two shelves with books, vases and candles.", icon: "📖", price: 1300, kind: "wall", size: [3, 2], visual: "shelves", category: "wall" },
  { id: "sculpture", name: "Bronze Falcon Sculpture", desc: "A falcon in flight on a marble plinth.", icon: "🦅", price: 6200, kind: "floor", size: [1, 1], visual: "sculpture", category: "decor" },
  { id: "vase-pampas", name: "Pampas Grass Floor Vase", desc: "A tall ceramic urn of dried pampas.", icon: "🌾", price: 750, kind: "floor", size: [1, 1], visual: "vase", category: "decor" },
  { id: "indoor-palm", name: "Indoor Date Palm", desc: "A potted palm, two metres tall.", icon: "🌴", price: 1900, kind: "floor", size: [1, 1], visual: "palm", category: "decor" },
  { id: "orchids", name: "White Orchid Arrangement", desc: "Phalaenopsis orchids in a low marble bowl.", icon: "🌸", price: 650, kind: "floor", size: [1, 1], visual: "orchids", category: "decor" },
  { id: "console", name: "Marble Console Table", desc: "For the entrance: a lamp, books and a tray.", icon: "🕰️", price: 3100, kind: "floor", size: [3, 1], visual: "console", category: "decor" },
  { id: "rug-silk-round", name: "Hand-Knotted Silk Rug", desc: "A round ivory-and-gold silk rug.", icon: "🟡", price: 4800, kind: "rug", size: [5, 5], visual: "rug-round", category: "decor" },
  { id: "rug-runner", name: "Moroccan Runner", desc: "A long Beni Ourain runner for hallways.", icon: "〰️", price: 1500, kind: "rug", size: [2, 6], visual: "rug-runner", category: "decor" },
  { id: "artwork", name: "Burj Khalifa Sunset Painting", desc: "Original high-rise acrylic artwork.", icon: "🖼️", price: 1500, kind: "wall", size: [3, 2], category: "wall" },
];

export const getCatalogItem = (id: string) => CATALOG.find((c) => c.id === id) ?? HOME_ITEMS.find((c) => c.id === id);

export type Interaction = "cooler" | "bed" | "chair" | "door" | "stairs";

/** Furniture that comes with every apartment, in its starting place. It can be moved like anything else. */
export interface BuiltIn {
  id: string;
  /** A model file, or `visual` for something drawn in code. */
  model?: string;
  visual?: string;
  size: [number, number];
  placement: FloorPlacement;
  interaction?: Interaction;
  yaw?: number;
  /** Part of the building (the staircase): it can't be moved or stored. */
  fixed?: boolean;
}

export type HousingTier = "bed_space" | "studio" | "one_bedroom" | "two_bedroom" | "three_bedroom" | "duplex" | "townhouse" | "penthouse" | "villa";

/** The home layout for a listing: its property type decides first (townhouses, villas and penthouses are
    two-storey whatever their bedrooms), then the number of bedrooms. */
export function housingTierFor(propertyType?: string | null, bedrooms?: number | null): HousingTier {
  const t = (propertyType ?? "").toLowerCase();
  if (t.includes("townhouse")) return "townhouse";
  if (t.includes("villa")) return "villa";
  if (t.includes("penthouse")) return "penthouse";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("studio")) return "studio";
  return getHousingTierFromText(bedrooms && bedrooms >= 3 ? "three_bedroom" : bedrooms === 2 ? "two_bedroom" : bedrooms === 1 ? "one_bedroom" : t);
}

export function getHousingTierFromText(text?: string | null): HousingTier {
  const raw = (text || "studio").toLowerCase();
  if (raw.includes("bed_space") || raw.includes("bed space") || raw.includes("shared")) return "bed_space";
  if (raw.includes("townhouse")) return "townhouse";
  if (raw.includes("duplex")) return "duplex";
  if (raw.includes("three_bedroom") || raw.includes("3-bedroom") || raw.includes("3 bedroom")) return "three_bedroom";
  if (raw.includes("two_bedroom") || raw.includes("2-bedroom") || raw.includes("2 bedroom")) return "two_bedroom";
  if (raw.includes("one_bedroom") || raw.includes("1-bedroom") || raw.includes("1 bedroom")) return "one_bedroom";
  if (raw.includes("penthouse")) return "penthouse";
  if (raw.includes("villa")) return "villa";
  return "studio";
}

export interface HomeActivityDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  room?: string;
  animation: "drink" | "eat" | "sit" | "talk" | "wave" | "idle";
  need: { kind: "hunger" | "energy" | "fun" | "social" | "hygiene"; amount: number };
  statBoost?: { name: string; amount: number };
  cost?: number;
}

export interface RoomZone {
  id: string;
  label: string;
  icon: string;
  desc: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: [number, number, number];
}

export interface HousingConfig {
  id: HousingTier;
  label: string;
  area: string;
  monthly: number;
  icon: string;
  wallColor: string;
  skirtingColor: string;
  floorTint?: string;
  hasDollhouseUpView?: boolean;
  rooms?: RoomZone[];
  activities: HomeActivityDef[];
  /** Two-storey homes: each floor's rooms and dividing walls (the top-level `rooms` is unused then). */
  levels?: LevelDef[];
  /** Single-floor homes: the dividing walls drawn in their layout, so walking goes through the doors. */
  walls?: LevelDef["walls"];
  /** Counters and islands built into the layout, which can't be walked through. */
  blocks?: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  /** The finishes it comes with (the owner can change them in Style). */
  finish: HomeStyle;
  /** Panelled walls, crown moulding and cove lighting. */
  luxury?: boolean;
}

/** One floor of a two-storey home. */
export interface LevelDef {
  label: string;
  icon: string;
  rooms: RoomZone[];
  /** Dividing walls, each from a to b (metres), with an optional doorway [from, to] metres along it. */
  walls: Array<{ a: [number, number]; b: [number, number]; door?: [number, number] }>;
}

// ---------------------------------------------------------------- finishes

export type FloorFinish = "oak" | "herringbone" | "walnut" | "white-marble" | "black-marble" | "travertine";
export const FLOOR_FINISHES: Array<{ id: FloorFinish; label: string; price: number }> = [
  { id: "oak", label: "Light oak planks", price: 0 },
  { id: "herringbone", label: "Herringbone parquet", price: 4500 },
  { id: "walnut", label: "Dark walnut", price: 3800 },
  { id: "travertine", label: "Travertine stone", price: 6200 },
  { id: "white-marble", label: "Calacatta white marble", price: 9500 },
  { id: "black-marble", label: "Nero Marquina black marble", price: 9500 },
];
export const WALL_PAINTS: Array<{ id: string; label: string; color: string; price: number }> = [
  { id: "ivory", label: "Warm ivory", color: "#f4efe6", price: 0 },
  { id: "greige", label: "Desert greige", color: "#d8cfc2", price: 900 },
  { id: "sage", label: "Sage green", color: "#b7c4ad", price: 900 },
  { id: "blush", label: "Rose blush", color: "#e9cfc8", price: 900 },
  { id: "navy", label: "Midnight navy", color: "#25324a", price: 1200 },
  { id: "charcoal", label: "Charcoal", color: "#33363b", price: 1200 },
  { id: "emerald", label: "Emerald", color: "#1f4d40", price: 1200 },
  { id: "terracotta", label: "Terracotta", color: "#b5654a", price: 1200 },
];
/** How a home is finished: floor, wall colour, and whether the walls are panelled with mouldings. */
export interface HomeStyle { floor: FloorFinish; wall: string; panels: boolean }
export const PANELS_PRICE = 5500;

// ---------------------------------------------------------------- two-storey floor plans
// The 7 m square is cut into rooms by walls on the grid lines (cells are 0.5 m), so furniture never
// straddles a wall. The staircase runs up the east side (cols 12–13, rows 4–8) on both floors.

const GROUND_ROOMS = (kitchen: string, living: string): RoomZone[] => [
  { id: "kitchen", label: kitchen, icon: "🍳", desc: "Kitchen island and dining table", center: [-0.5, 0, -1.8], bounds: { minX: -3.5, maxX: 2.5, minZ: -3.5, maxZ: 0 } },
  { id: "living", label: living, icon: "🛋️", desc: "Sofa, media wall and lounge", center: [-0.5, 0, 1.8], bounds: { minX: -3.5, maxX: 2.5, minZ: 0, maxZ: 3.5 } },
  { id: "hall", label: "Entrance hall & stairs", icon: "🪜", desc: "Front door and the staircase", center: [3, 0, 2.3], bounds: { minX: 2.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 } },
];
const GROUND_WALLS: LevelDef["walls"] = [{ a: [-3.5, 0], b: [2.5, 0], door: [2.5, 3.5] }];
const UPPER_THREE: Pick<LevelDef, "rooms" | "walls"> = {
  rooms: [
    { id: "master", label: "Master suite", icon: "👑", desc: "King bed, wardrobe and vanity", center: [-0.5, 0, -1.8], bounds: { minX: -3.5, maxX: 2.5, minZ: -3.5, maxZ: 0 } },
    { id: "bed2", label: "Bedroom 2", icon: "🛏️", desc: "Double bed and desk", center: [-2, 0, 1.8], bounds: { minX: -3.5, maxX: -0.5, minZ: 0, maxZ: 3.5 } },
    { id: "bed3", label: "Bedroom 3", icon: "🛏️", desc: "Guest bed", center: [1, 0, 1.8], bounds: { minX: -0.5, maxX: 2.5, minZ: 0, maxZ: 3.5 } },
    { id: "landing", label: "Landing", icon: "🪜", desc: "Top of the stairs", center: [3, 0, -2.5], bounds: { minX: 2.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 } },
  ],
  walls: [{ a: [-3.5, 0], b: [2.5, 0], door: [3, 4] }, { a: [-0.5, 0], b: [-0.5, 3.5], door: [1.2, 2.2] }],
};
const UPPER_TWO: Pick<LevelDef, "rooms" | "walls"> = {
  rooms: [
    { id: "master", label: "Master suite", icon: "👑", desc: "King bed and wardrobe", center: [-0.5, 0, -1.8], bounds: { minX: -3.5, maxX: 2.5, minZ: -3.5, maxZ: 0 } },
    { id: "bed2", label: "Bedroom 2", icon: "🛏️", desc: "Double bed and desk", center: [-0.5, 0, 1.8], bounds: { minX: -3.5, maxX: 2.5, minZ: 0, maxZ: 3.5 } },
    { id: "landing", label: "Landing", icon: "🪜", desc: "Top of the stairs", center: [3, 0, -2.5], bounds: { minX: 2.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 } },
  ],
  walls: [{ a: [-3.5, 0], b: [2.5, 0], door: [3, 4] }],
};
const twoStorey = (kitchen: string, living: string, upper: Pick<LevelDef, "rooms" | "walls">): LevelDef[] => [
  { label: "Downstairs", icon: "⬇️", rooms: GROUND_ROOMS(kitchen, living), walls: GROUND_WALLS },
  { label: "Upstairs", icon: "⬆️", ...upper },
];

const RAW_HOUSING_CONFIGS: Record<HousingTier, HousingConfig> = {
  bed_space: {
    id: "bed_space",
    finish: { floor: "white-marble", wall: "#efe9df", panels: true },
    luxury: true,
    label: "Shared Bed Space",
    area: "Deira / Bur Dubai",
    monthly: 800,
    icon: "🛏️",
    wallColor: "#e2dcd2",
    skirtingColor: "#c4b5a0",
    floorTint: "#d5c9b6",
    activities: [
      { id: "brew_karak", label: "Brew Instant Karak", icon: "☕", desc: "Boil water, mix evaporated milk & cardamom tea.", animation: "drink", need: { kind: "energy", amount: 20 }, cost: 1 },
      { id: "rest_bunk", label: "Rest in Bunk Bed", icon: "🛏️", desc: "Pull the privacy curtain for a restorative nap.", animation: "sit", need: { kind: "energy", amount: 45 } },
      { id: "suitcase_check", label: "Check Suitcase Locker", icon: "🧳", desc: "Organize cash reserve, passport and visa documents.", animation: "talk", need: { kind: "fun", amount: 15 } },
      { id: "send_remittance", label: "Send Remittance Home", icon: "📱", desc: "Send family financial support via mobile exchange app.", animation: "wave", need: { kind: "social", amount: 30 } },
    ],
  },
  studio: {
    id: "studio",
    finish: { floor: "white-marble", wall: "#f6f1e8", panels: true },
    luxury: true,
    label: "Studio Apartment",
    area: "Al Barsha / JVC",
    monthly: 2500,
    icon: "🏢",
    wallColor: "#f7f5f1",
    skirtingColor: "#e7d5b8",
    activities: [
      { id: "cook_indomie", label: "Cook Indomie on Stove", icon: "🍜", desc: "Prepare a hot bowl of spicy noodles on the induction stove.", animation: "eat", need: { kind: "hunger", amount: 35 } },
      { id: "laptop_work", label: "Freelance at Work Desk", icon: "💻", desc: "Work on remote client tasks and academic studies.", animation: "sit", need: { kind: "fun", amount: 20 }, statBoost: { name: "focus", amount: 15 } },
      { id: "balcony_coffee", label: "JVC Balcony Coffee", icon: "☕", desc: "Enjoy a fresh cup of coffee overlooking suburban rooftops.", animation: "drink", need: { kind: "energy", amount: 25 } },
      { id: "shower_groom", label: "Morning Shower", icon: "🚿", desc: "Freshen up before heading out into the city.", animation: "wave", need: { kind: "hygiene", amount: 60 } },
    ],
  },
  one_bedroom: {
    id: "one_bedroom",
    walls: [{ a: [-3.5, 0], b: [3.5, 0], door: [2.7, 4.3] }],
    blocks: [{ minX: 1.72, maxX: 2.28, minZ: 0.55, maxZ: 2.85 }],
    finish: { floor: "travertine", wall: "#f3eee6", panels: true },
    luxury: true,
    label: "1-Bedroom Apartment",
    area: "Dubai Marina / JBR · Multi-Room",
    monthly: 7000,
    icon: "🌇",
    wallColor: "#efe6d8",
    skirtingColor: "#d6c2a5",
    hasDollhouseUpView: true,
    rooms: [
      { id: "bedroom", label: "Master Bedroom", icon: "🛏️", desc: "Private queen suite with fitted wardrobe", center: [-1.6, 0, -1.8], bounds: { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: -0.2 } },
      { id: "living", label: "Living & Kitchen", icon: "🛋️", desc: "L-sofa, coffee table & breakfast island", center: [-1.4, 0, 1.8], bounds: { minX: -3.5, maxX: 3.5, minZ: 0.2, maxZ: 3.5 } },
      { id: "balcony", label: "Marina Balcony", icon: "🌇", desc: "Outdoor balcony with marina canal views", center: [0, 0, 4.1], bounds: { minX: -2.5, maxX: 2.5, minZ: 3.5, maxZ: 4.8 } },
    ],
    activities: [
      { id: "master_sleep", room: "bedroom", label: "Master Bedroom Deep Sleep", icon: "🛏️", desc: "Uninterrupted restorative sleep in your private bedroom.", animation: "sit", need: { kind: "energy", amount: 60 } },
      { id: "nespresso_shot", room: "living", label: "Double Nespresso Shot", icon: "☕", desc: "Pull a rich espresso capsule at the kitchen counter.", animation: "drink", need: { kind: "energy", amount: 30 } },
      { id: "host_friend", room: "living", label: "Host Dinner for Peer", icon: "🍽️", desc: "Invite a fellow resident or colleague over for dinner.", animation: "talk", need: { kind: "social", amount: 45 } },
      { id: "marina_balcony", room: "balcony", label: "Marina Balcony Chill", icon: "🌇", desc: "Watch yachts cruise the canal with sea breeze.", animation: "wave", need: { kind: "fun", amount: 35 } },
    ],
  },
  two_bedroom: {
    id: "two_bedroom",
    walls: [{ a: [-3.5, 0], b: [3.5, 0], door: [2.6, 4.4] }, { a: [0, -3.5], b: [0, -0.8] }],
    blocks: [{ minX: 0.52, maxX: 1.08, minZ: 0.5, maxZ: 2.9 }],
    finish: { floor: "white-marble", wall: "#ece6dc", panels: true },
    luxury: true,
    label: "2-Bedroom Apartment",
    area: "Downtown / Creek · Dollhouse Up-View",
    monthly: 11500,
    icon: "🏙️",
    wallColor: "#ece6dc",
    skirtingColor: "#c9b79c",
    hasDollhouseUpView: true,
    rooms: [
      { id: "master", label: "Master Suite", icon: "🛏️", desc: "King bed, walk-in wardrobe & en-suite", center: [-2.2, 0, -1.8], bounds: { minX: -3.5, maxX: -0.2, minZ: -3.5, maxZ: 0 } },
      { id: "study", label: "Study & Bed 2", icon: "💻", desc: "Dual monitor desk & guest twin bed", center: [1.8, 0, -1.8], bounds: { minX: 0.2, maxX: 3.5, minZ: -3.5, maxZ: 0 } },
      { id: "living", label: "Living & Dining", icon: "🛋️", desc: "L-sofa, 65\" 4K TV & dining table", center: [-1.2, 0, 1.8], bounds: { minX: -3.5, maxX: 1.0, minZ: 0, maxZ: 3.5 } },
      { id: "kitchen", label: "Open Kitchen", icon: "🍳", desc: "Granite breakfast island & espresso bar", center: [2.2, 0, 1.8], bounds: { minX: 1.0, maxX: 3.5, minZ: 0, maxZ: 3.5 } },
      { id: "balcony", label: "Skyline Balcony", icon: "🌇", desc: "Outdoor loungers overlooking Downtown", center: [0, 0, 4.1], bounds: { minX: -2.0, maxX: 2.0, minZ: 3.5, maxZ: 4.8 } },
    ],
    activities: [
      { id: "master_deep_sleep", room: "master", label: "Master Suite Deep Sleep", icon: "🛏️", desc: "Restful 8-hour sleep in the master quarters.", animation: "sit", need: { kind: "energy", amount: 65 } },
      { id: "study_workstation", room: "study", label: "Dual-Monitor Workstation", icon: "💻", desc: "Analyze markets, code freelance projects and study.", animation: "sit", need: { kind: "fun", amount: 25 }, statBoost: { name: "focus", amount: 25 } },
      { id: "living_dinner", room: "living", label: "6-Person Dinner Party", icon: "🍽️", desc: "Host a full dinner party around the dining table.", animation: "talk", need: { kind: "social", amount: 50 } },
      { id: "kitchen_salmon", room: "kitchen", label: "Gourmet Salmon & Saffron", icon: "🍳", desc: "Cook fresh salmon and saffron rice in open kitchen.", animation: "eat", need: { kind: "hunger", amount: 55 } },
      { id: "balcony_sunset", room: "balcony", label: "Skyline Sunset Meditation", icon: "🌇", desc: "Watch the sun set over the skyline from balcony loungers.", animation: "wave", need: { kind: "fun", amount: 40 } },
    ],
  },
  three_bedroom: {
    id: "three_bedroom",
    walls: [
      { a: [-3.5, 0], b: [3.5, 0], door: [2.6, 4.4] }, { a: [0, -3.5], b: [0, -0.8] },
      { a: [0.75, 0], b: [0.75, 2.2], door: [0.4, 1.2] }, { a: [0.75, 2.2], b: [3.5, 2.2] },
    ],
    blocks: [{ minX: 0.47, maxX: 1.03, minZ: 2.2, maxZ: 2.9 }],
    finish: { floor: "white-marble", wall: "#f1ede6", panels: true },
    luxury: true,
    label: "3-Bedroom Residence",
    area: "Dubai Hills / Downtown · Multi-Suite",
    monthly: 15500,
    icon: "🏰",
    wallColor: "#f1ede6",
    skirtingColor: "#bfae95",
    hasDollhouseUpView: true,
    rooms: [
      { id: "master", label: "Master Suite", icon: "👑", desc: "King bed, walk-in dressing niche & en-suite", center: [-2.2, 0, -1.8], bounds: { minX: -3.5, maxX: -0.2, minZ: -3.5, maxZ: 0 } },
      { id: "bed2", label: "Bedroom 2 (Guest)", icon: "🛏️", desc: "Plush twin bed & vanity desk", center: [2.0, 0, -1.8], bounds: { minX: 0.2, maxX: 3.5, minZ: -3.5, maxZ: 0 } },
      { id: "bed3", label: "Bedroom 3 / Studio", icon: "💻", desc: "Executive study desk & creative workspace", center: [2.0, 0, 1.8], bounds: { minX: 0.8, maxX: 3.5, minZ: 0.2, maxZ: 3.5 } },
      { id: "living", label: "Grand Living Salon", icon: "🛋️", desc: "Italian sectional sofa & 75\" entertainment wall", center: [-1.6, 0, 1.8], bounds: { minX: -3.5, maxX: 0.6, minZ: 0.2, maxZ: 3.5 } },
      { id: "balcony", label: "Panoramic Terrace", icon: "🌅", desc: "Spacious outdoor terrace overlooking the park", center: [0, 0, 4.1], bounds: { minX: -2.5, maxX: 2.5, minZ: 3.5, maxZ: 4.8 } },
    ],
    activities: [
      { id: "master_spa_sleep", room: "master", label: "Master Suite Rest", icon: "👑", desc: "Deep sleep in Egyptian cotton sheets.", animation: "sit", need: { kind: "energy", amount: 75 } },
      { id: "bed2_guest_welcome", room: "bed2", label: "Host Guest in Bed 2", icon: "🛏️", desc: "Welcome visiting family or friends into the guest bedroom.", animation: "wave", need: { kind: "social", amount: 40 } },
      { id: "bed3_creative_session", room: "bed3", label: "Studio Creative Sprint", icon: "💻", desc: "Deep work session in your dedicated 3rd bedroom studio.", animation: "sit", need: { kind: "fun", amount: 35 }, statBoost: { name: "focus", amount: 30 } },
      { id: "salon_family_gathering", room: "living", label: "Grand Salon Gathering", icon: "🛋️", desc: "Gather with family or friends for game night.", animation: "talk", need: { kind: "social", amount: 55 } },
      { id: "terrace_sunset_tea", room: "balcony", label: "Terrace Sunset Tea", icon: "🌅", desc: "Sip hot Moroccan mint tea with a panoramic sunset.", animation: "drink", need: { kind: "energy", amount: 40 } },
    ],
  },
  duplex: {
    id: "duplex",
    label: "2-Bedroom Duplex",
    area: "JVC / Business Bay · Two floors",
    monthly: 13500,
    icon: "🏬",
    wallColor: "#efe9df",
    skirtingColor: "#c8b493",
    finish: { floor: "travertine", wall: "#efe9df", panels: true },
    luxury: true,
    hasDollhouseUpView: true,
    levels: twoStorey("Kitchen & dining", "Living room", UPPER_TWO),
    activities: [
      { id: "duplex_breakfast", room: "kitchen", label: "Breakfast at the Island", icon: "🥐", desc: "Shakshuka and karak at the kitchen island.", animation: "eat", need: { kind: "hunger", amount: 45 } },
      { id: "duplex_movie", room: "living", label: "Movie Night", icon: "🍿", desc: "Popcorn and a film on the big screen downstairs.", animation: "sit", need: { kind: "fun", amount: 40 } },
      { id: "duplex_sleep", room: "master", label: "Sleep Upstairs", icon: "🛏️", desc: "A quiet night in the upstairs master suite.", animation: "sit", need: { kind: "energy", amount: 65 } },
    ],
  },
  townhouse: {
    id: "townhouse",
    label: "3-Bedroom Townhouse",
    area: "Arabian Ranches / Damac Hills · Two floors",
    monthly: 16500,
    icon: "🏡",
    wallColor: "#f3eee6",
    skirtingColor: "#bfa88a",
    finish: { floor: "travertine", wall: "#f3eee6", panels: true },
    luxury: true,
    hasDollhouseUpView: true,
    levels: twoStorey("Family kitchen & dining", "Living room", UPPER_THREE),
    activities: [
      { id: "th_bbq", room: "kitchen", label: "Family Barbecue Dinner", icon: "🍖", desc: "Grill in the garden and eat together at the dining table.", animation: "eat", need: { kind: "hunger", amount: 55 } },
      { id: "th_games", room: "living", label: "Board Games Night", icon: "🎲", desc: "Neighbours over for Ludo and karak.", animation: "talk", need: { kind: "social", amount: 50 } },
      { id: "th_sleep", room: "master", label: "Master Suite Sleep", icon: "🛏️", desc: "Deep sleep upstairs, away from the street.", animation: "sit", need: { kind: "energy", amount: 70 } },
      { id: "th_study", room: "bed3", label: "Home Office Focus", icon: "💻", desc: "A quiet session in the third bedroom.", animation: "sit", need: { kind: "fun", amount: 25 }, statBoost: { name: "focus", amount: 25 } },
    ],
  },
  penthouse: {
    id: "penthouse",
    label: "Downtown Luxury Penthouse",
    area: "Downtown Dubai",
    monthly: 18000,
    icon: "🏙️",
    wallColor: "#1a1e24",
    skirtingColor: "#d4af37",
    finish: { floor: "black-marble", wall: "#2a2d33", panels: true },
    luxury: true,
    hasDollhouseUpView: true,
    levels: twoStorey("Chef's kitchen & bar", "Grand salon", UPPER_TWO),
    activities: [
      { id: "skyline_jacuzzi", label: "Skyline Jacuzzi Soak", icon: "🧖", desc: "Heated outdoor plunge jacuzzi overlooking Burj Khalifa.", animation: "sit", need: { kind: "energy", amount: 50 } },
      { id: "artisanal_mocktail", label: "Artisanal Mocktail", icon: "🍸", desc: "Craft refreshing drinks at the marble wet bar.", animation: "drink", need: { kind: "social", amount: 35 } },
      { id: "butler_service", label: "Private Butler Dining", icon: "🛎️", desc: "Order 5-star room service straight from Downtown chefs.", animation: "eat", need: { kind: "hunger", amount: 60 } },
    ],
  },
  villa: {
    id: "villa",
    label: "Palm Jumeirah Signature Villa",
    area: "Palm Jumeirah",
    monthly: 45000,
    icon: "🌴",
    wallColor: "#faf8f5",
    skirtingColor: "#b8860b",
    finish: { floor: "white-marble", wall: "#f6f1e8", panels: true },
    luxury: true,
    hasDollhouseUpView: true,
    levels: twoStorey("Kitchen & formal dining", "Majlis & family lounge", UPPER_THREE),
    activities: [
      { id: "private_beach_swim", label: "Private Beach Swim", icon: "🏖️", desc: "Swim in the calm waters of your private Palm beach.", animation: "wave", need: { kind: "energy", amount: 60 } },
      { id: "majlis_gahwa", label: "Majlis Gahwa & Dates", icon: "🫖", desc: "Serve cardamom Arabic coffee and dates to distinguished guests.", animation: "talk", need: { kind: "social", amount: 55 } },
      { id: "supercar_garage", label: "Inspect Supercar Fleet", icon: "🏎️", desc: "Check out your dream garage before taking a highway cruise.", animation: "sit", need: { kind: "fun", amount: 50 } },
    ],
  },
};

const RAW_BUILT_INS: BuiltIn[] = [
  { id: "bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 2, row: 0, rot: 0 }, interaction: "bed" },
  { id: "bedside", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  { id: "fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
  { id: "chair", model: "/models/furniture/chair.glb", size: [2, 2], placement: { kind: "floor", col: 9, row: 5, rot: 2 }, interaction: "chair" },
];

const RAW_BUILT_INS_BY_TIER: Record<HousingTier, BuiltIn[]> = {
  bed_space: [
    { id: "bunk_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "locker", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "mini_kettle", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 11, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "stool", model: "/models/furniture/chair.glb", size: [2, 2], placement: { kind: "floor", col: 8, row: 4, rot: 2 }, interaction: "chair" },
    { id: "lx_bs_chandelier", visual: "chandelier-ring", size: [2, 2], placement: { kind: "floor", col: 6, row: 6, rot: 0 } },
    { id: "lx_bs_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 0, row: 13, rot: 0 } },
    { id: "lx_bs_orchids", visual: "orchids", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  ],
  studio: [...RAW_BUILT_INS,
    { id: "lx_st_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 6, row: 7, rot: 0 } },
    { id: "lx_st_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 4, row: 7, rot: 0 } },
    { id: "lx_st_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 0, row: 13, rot: 0 } },
    { id: "lx_st_vase", visual: "vase", size: [1, 1], placement: { kind: "floor", col: 7, row: 0, rot: 0 } },
  ],
  one_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "lounge_sofa", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 7, row: 6, rot: 2 }, interaction: "chair" },
    { id: "tv_table", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 7, row: 10, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "lx_ob_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 3, row: 9, rot: 0 } },
    { id: "lx_ob_bed_light", visual: "chandelier-ring", size: [2, 2], placement: { kind: "floor", col: 2, row: 1, rot: 0 } },
    { id: "lx_ob_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 1, row: 8, rot: 0 } },
    { id: "lx_ob_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 0, row: 13, rot: 0 } },
    { id: "lx_ob_orchids", visual: "orchids", size: [1, 1], placement: { kind: "floor", col: 0, row: 7, rot: 0 } },
    { id: "lx_ob_falcon", visual: "sculpture", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  ],
  two_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "study_desk", model: "/models/furniture/desk.glb", size: [3, 2], placement: { kind: "floor", col: 9, row: 0, rot: 0 }, interaction: "chair" },
    { id: "study_chair", model: "/models/furniture/desk-chair.glb", size: [1, 1], placement: { kind: "floor", col: 10, row: 2, rot: 0 }, interaction: "chair" },
    { id: "bookcase", model: "/models/furniture/bookcase.glb", size: [2, 1], placement: { kind: "floor", col: 12, row: 0, rot: 0 } },
    { id: "guest_bed", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 7, row: 3, rot: 0 }, interaction: "bed" },
    { id: "living_couch", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "living_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "living_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 7, rot: 0 }, interaction: "cooler" },
    { id: "balcony_chair", model: "/models/furniture/lounge-chair.glb", size: [2, 2], placement: { kind: "floor", col: 6, row: 12, rot: 0 }, interaction: "chair" },
    { id: "lx_tb_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
    { id: "lx_tb_bed_light", visual: "chandelier-ring", size: [2, 2], placement: { kind: "floor", col: 2, row: 1, rot: 0 } },
    { id: "lx_tb_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 0, row: 8, rot: 0 } },
    { id: "lx_tb_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 0, row: 13, rot: 0 } },
    { id: "lx_tb_falcon", visual: "sculpture", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  ],
  three_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "bed2_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 9, row: 0, rot: 0 }, interaction: "bed" },
    { id: "study_desk", model: "/models/furniture/desk.glb", size: [3, 2], placement: { kind: "floor", col: 8, row: 6, rot: 0 }, interaction: "chair" },
    { id: "study_chair", model: "/models/furniture/desk-chair.glb", size: [1, 1], placement: { kind: "floor", col: 10, row: 8, rot: 0 }, interaction: "chair" },
    { id: "bookcase", model: "/models/furniture/bookcase.glb", size: [2, 1], placement: { kind: "floor", col: 12, row: 6, rot: 0 } },
    { id: "living_couch", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "living_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "living_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 5, row: 10, rot: 0 }, interaction: "cooler" },
    { id: "balcony_chair", model: "/models/furniture/lounge-chair.glb", size: [2, 2], placement: { kind: "floor", col: 4, row: 13, rot: 0 }, interaction: "chair" },
    { id: "lx_hb_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
    { id: "lx_hb_bed_light", visual: "chandelier-ring", size: [2, 2], placement: { kind: "floor", col: 2, row: 1, rot: 0 } },
    { id: "lx_hb_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 0, row: 8, rot: 0 } },
    { id: "lx_hb_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 0, row: 13, rot: 0 } },
    { id: "lx_hb_vase", visual: "vase", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  ],
  duplex: [
    { id: "stairs", visual: "staircase", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0 }, interaction: "stairs", fixed: true },
    { id: "stairwell", visual: "stairwell", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0, level: 1 }, interaction: "stairs", fixed: true },
    { id: "dx_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 0, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "dx_island", visual: "kitchen-island", size: [4, 2], placement: { kind: "floor", col: 2, row: 3, rot: 0 } },
    { id: "dx_dining", visual: "dining-set", size: [4, 3], placement: { kind: "floor", col: 7, row: 1, rot: 0 } },
    { id: "dx_sofa", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "dx_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "dx_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "dx_lamp", visual: "tripod-lamp", size: [1, 1], placement: { kind: "floor", col: 6, row: 7, rot: 0 } },
    { id: "dx_plant", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 10, row: 12, rot: 0 } },
    { id: "dx_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0, level: 1 }, interaction: "bed" },
    { id: "dx_nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0, level: 1 } },
    { id: "dx_wardrobe", visual: "wardrobe", size: [4, 1], placement: { kind: "floor", col: 7, row: 0, rot: 0, level: 1 } },
    { id: "dx_bed2", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "dx_desk", model: "/models/furniture/desk.glb", size: [3, 2], placement: { kind: "floor", col: 7, row: 11, rot: 0, level: 1 }, interaction: "chair" },
    { id: "lx_dx_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
    { id: "lx_dx_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 1, row: 8, rot: 0 } },
  ],
  townhouse: [
    { id: "stairs", visual: "staircase", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0 }, interaction: "stairs", fixed: true },
    { id: "stairwell", visual: "stairwell", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0, level: 1 }, interaction: "stairs", fixed: true },
    { id: "th_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 0, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "th_island", visual: "kitchen-island", size: [4, 2], placement: { kind: "floor", col: 2, row: 3, rot: 0 } },
    { id: "th_dining", visual: "dining-set", size: [4, 3], placement: { kind: "floor", col: 7, row: 1, rot: 0 } },
    { id: "th_sofa", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "th_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "th_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "th_lamp", visual: "tripod-lamp", size: [1, 1], placement: { kind: "floor", col: 6, row: 7, rot: 0 } },
    { id: "th_armchair", visual: "armchair", size: [2, 2], placement: { kind: "floor", col: 9, row: 9, rot: 0 }, interaction: "chair" },
    { id: "th_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0, level: 1 }, interaction: "bed" },
    { id: "th_nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0, level: 1 } },
    { id: "th_wardrobe", visual: "wardrobe", size: [4, 1], placement: { kind: "floor", col: 7, row: 0, rot: 0, level: 1 } },
    { id: "th_bed2", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 0, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "th_bed3", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 7, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "lx_th_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
    { id: "lx_th_rug", visual: "rug-round", size: [5, 5], placement: { kind: "floor", col: 1, row: 8, rot: 0 } },
  ],
  penthouse: [
    { id: "stairs", visual: "staircase", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0 }, interaction: "stairs", fixed: true },
    { id: "stairwell", visual: "stairwell", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0, level: 1 }, interaction: "stairs", fixed: true },
    { id: "ph_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 0, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "ph_island", visual: "kitchen-island", size: [4, 2], placement: { kind: "floor", col: 2, row: 3, rot: 0 } },
    { id: "ph_dining", visual: "dining-set", size: [4, 3], placement: { kind: "floor", col: 7, row: 1, rot: 0 } },
    { id: "ph_sofa", model: "/models/furniture/l-couch.glb", size: [4, 4], placement: { kind: "floor", col: 0, row: 7, rot: 2 }, interaction: "chair" },
    { id: "ph_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 4, row: 10, rot: 0 } },
    { id: "ph_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "ph_lamp", visual: "tripod-lamp", size: [1, 1], placement: { kind: "floor", col: 6, row: 7, rot: 0 } },
    { id: "ph_piano", visual: "grand-piano", size: [3, 4], placement: { kind: "floor", col: 9, row: 8, rot: 0 }, interaction: "chair" },
    { id: "ph_bed", visual: "canopy-bed", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0, level: 1 }, interaction: "bed" },
    { id: "ph_vanity", visual: "vanity", size: [2, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0, level: 1 } },
    { id: "ph_wardrobe", visual: "wardrobe", size: [4, 1], placement: { kind: "floor", col: 8, row: 0, rot: 0, level: 1 } },
    { id: "ph_bed2", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "ph_chair", visual: "armchair", size: [2, 2], placement: { kind: "floor", col: 8, row: 9, rot: 0, level: 1 }, interaction: "chair" },
    { id: "lx_ph_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
  ],
  villa: [
    { id: "stairs", visual: "staircase", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0 }, interaction: "stairs", fixed: true },
    { id: "stairwell", visual: "stairwell", size: [2, 5], placement: { kind: "floor", col: 12, row: 4, rot: 0, level: 1 }, interaction: "stairs", fixed: true },
    { id: "vl_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 0, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "vl_island", visual: "kitchen-island", size: [4, 2], placement: { kind: "floor", col: 2, row: 3, rot: 0 } },
    { id: "vl_dining", visual: "dining-set", size: [4, 3], placement: { kind: "floor", col: 7, row: 1, rot: 0 } },
    { id: "vl_majlis", visual: "majlis", size: [4, 4], placement: { kind: "floor", col: 1, row: 8, rot: 0 }, interaction: "chair" },
    { id: "vl_aquarium", visual: "aquarium", size: [4, 1], placement: { kind: "floor", col: 6, row: 13, rot: 0 } },
    { id: "vl_coffee", visual: "coffee-bar", size: [2, 1], placement: { kind: "floor", col: 9, row: 8, rot: 0 }, interaction: "cooler" },
    { id: "vl_palm", visual: "palm", size: [1, 1], placement: { kind: "floor", col: 11, row: 12, rot: 0 } },
    { id: "vl_bed", visual: "canopy-bed", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0, level: 1 }, interaction: "bed" },
    { id: "vl_vanity", visual: "vanity", size: [2, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0, level: 1 } },
    { id: "vl_wardrobe", visual: "wardrobe", size: [4, 1], placement: { kind: "floor", col: 8, row: 0, rot: 0, level: 1 } },
    { id: "vl_bed2", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 0, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "vl_bed3", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 7, row: 8, rot: 0, level: 1 }, interaction: "bed" },
    { id: "lx_vl_chandelier", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 2, row: 9, rot: 0 } },
  ],
};

const HOME_NAMES: Record<string, [string, string]> = {
  lx_bs_chandelier: ["Gold Ring Chandelier", "⭕"], lx_bs_palm: ["Indoor Date Palm", "🌴"], lx_bs_orchids: ["White Orchids", "🌸"], lx_st_chandelier: ["Crystal Chandelier", "💎"], lx_st_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_st_palm: ["Indoor Date Palm", "🌴"], lx_st_vase: ["Pampas Floor Vase", "🌾"], lx_ob_chandelier: ["Crystal Chandelier", "💎"], lx_ob_bed_light: ["Gold Ring Chandelier", "⭕"], lx_ob_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_ob_palm: ["Indoor Date Palm", "🌴"], lx_ob_orchids: ["White Orchids", "🌸"], lx_ob_falcon: ["Bronze Falcon Sculpture", "🦅"], lx_tb_chandelier: ["Crystal Chandelier", "💎"], lx_tb_bed_light: ["Gold Ring Chandelier", "⭕"], lx_tb_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_tb_palm: ["Indoor Date Palm", "🌴"], lx_tb_falcon: ["Bronze Falcon Sculpture", "🦅"], lx_hb_chandelier: ["Crystal Chandelier", "💎"], lx_hb_bed_light: ["Gold Ring Chandelier", "⭕"], lx_hb_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_hb_palm: ["Indoor Date Palm", "🌴"], lx_hb_vase: ["Pampas Floor Vase", "🌾"], lx_dx_chandelier: ["Crystal Chandelier", "💎"], lx_dx_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_th_chandelier: ["Crystal Chandelier", "💎"], lx_th_rug: ["Hand-Knotted Silk Rug", "🟡"], lx_ph_chandelier: ["Crystal Chandelier", "💎"], lx_vl_chandelier: ["Crystal Chandelier", "💎"],
  bed: ["Bed", "🛏️"], bedside: ["Bedside table", "🟫"], fridge: ["Fridge", "🧊"], chair: ["Armchair", "🪑"],
  bunk_bed: ["Bunk Bed", "🛏️"], locker: ["Suitcase Stand", "🧳"], mini_kettle: ["Kettle & Mini-Fridge", "☕"], stool: ["Stool", "🪑"],
  master_bed: ["Master Bed", "🛏️"], nightstand: ["Nightstand", "🟫"], lounge_sofa: ["Lounge Sofa", "🛋️"], tv_table: ["65\" 4K TV", "📺"], kitchen_fridge: ["Kitchen Fridge", "🧊"],
  study_desk: ["Executive Work Desk", "🖥️"], study_chair: ["Ergonomic Chair", "🪑"], bookcase: ["Oak Bookcase", "📚"], guest_bed: ["Guest Daybed", "🛏️"], bed2_bed: ["Guest Bedroom Bed", "🛏️"],
  living_couch: ["Sectional Sofa", "🛋️"], living_table: ["Glass Coffee Table", "☕"], living_tv: ["4K Smart TV", "📺"], balcony_chair: ["Balcony Lounge Chair", "💺"],
  pent_bed: ["King Suite Bed", "🛏️"], pent_sofa: ["L-Shaped Velvet Lounge", "🛋️"], pent_tv: ["OLED Entertainment Wall", "📺"], pent_fridge: ["Wet Bar Fridge", "🧊"], pent_lamp: ["Arc Designer Lamp", "💡"],
  stairs: ["Staircase", "🪜"], stairwell: ["Stairs down", "🪜"],
  dx_fridge: ["Fridge", "🧊"], dx_island: ["Kitchen Island", "🧑‍🍳"], dx_dining: ["Dining Table", "🍽️"], dx_sofa: ["Sofa", "🛋️"], dx_table: ["Coffee Table", "☕"], dx_tv: ["TV", "📺"], dx_lamp: ["Brass Lamp", "🪔"], dx_plant: ["Indoor Palm", "🌴"],
  dx_bed: ["Master Bed", "🛏️"], dx_nightstand: ["Nightstand", "🟫"], dx_wardrobe: ["Wardrobe", "👔"], dx_bed2: ["Bedroom 2 Bed", "🛏️"], dx_desk: ["Desk", "🖥️"],
  th_fridge: ["Fridge", "🧊"], th_island: ["Kitchen Island", "🧑‍🍳"], th_dining: ["Family Dining Table", "🍽️"], th_sofa: ["Sofa", "🛋️"], th_table: ["Coffee Table", "☕"], th_tv: ["TV", "📺"], th_lamp: ["Brass Lamp", "🪔"], th_armchair: ["Velvet Armchair", "💚"],
  th_bed: ["Master Bed", "🛏️"], th_nightstand: ["Nightstand", "🟫"], th_wardrobe: ["Wardrobe", "👔"], th_bed2: ["Bedroom 2 Bed", "🛏️"], th_bed3: ["Bedroom 3 Bed", "🛏️"],
  ph_fridge: ["Wet Bar Fridge", "🧊"], ph_island: ["Marble Island", "🧑‍🍳"], ph_dining: ["Dining for Six", "🍽️"], ph_sofa: ["L-Shaped Velvet Lounge", "🛋️"], ph_table: ["Coffee Table", "☕"], ph_tv: ["OLED TV", "📺"], ph_lamp: ["Brass Lamp", "🪔"], ph_piano: ["Grand Piano", "🎹"],
  ph_bed: ["Four-Poster Canopy Bed", "👑"], ph_vanity: ["Vanity", "💄"], ph_wardrobe: ["Wardrobe", "👔"], ph_bed2: ["Guest Bed", "🛏️"], ph_chair: ["Velvet Armchair", "💚"],
  vl_fridge: ["Gourmet Fridge", "🧊"], vl_island: ["Marble Island", "🧑‍🍳"], vl_dining: ["Formal Dining", "🍽️"], vl_majlis: ["Majlis", "🕌"], vl_aquarium: ["Reef Aquarium", "🐠"], vl_coffee: ["Gahwa Bar", "☕"], vl_palm: ["Date Palm", "🌴"],
  vl_bed: ["Palatial Canopy Bed", "👑"], vl_vanity: ["Vanity", "💄"], vl_wardrobe: ["Walk-in Wardrobe", "👔"], vl_bed2: ["Bedroom 2 Bed", "🛏️"], vl_bed3: ["Bedroom 3 Bed", "🛏️"],
  villa_bed: ["Palatial Suite Bed", "🛏️"], villa_couch: ["Majlis Sofa", "🛋️"], villa_table: ["Glass Coffee Table", "☕"], villa_fridge: ["Gourmet Fridge", "🧊"], villa_plant: ["Fiddle Leaf Plant", "🪴"],
};

// ---------------------------------------------------------------- the 10 m home
// Layouts above are written for the old 7 m square; here they're spread out to today's home. Walls drawn
// from data snap to the half-metre grid; the single-storey layouts' walls (drawn in ApartmentRoom, scaled
// the same way) and room zones scale exactly.

const k = LAYOUT_SCALE;
const pt = ([x, z]: [number, number], snap: boolean): [number, number] => snap ? [Math.round(x * k * 2) / 2, Math.round(z * k * 2) / 2] : [x * k, z * k];
const spreadWalls = (walls: LevelDef["walls"], snap: boolean): LevelDef["walls"] =>
  walls.map((w) => ({ a: pt(w.a, snap), b: pt(w.b, snap), ...(w.door ? { door: [w.door[0] * k, w.door[1] * k] as [number, number] } : {}) }));
const spreadRooms = (rooms: RoomZone[]): RoomZone[] => rooms.map((r) => ({
  ...r,
  center: [r.center[0] * k, r.center[1], r.center[2] * k],
  bounds: { minX: r.bounds.minX * k, maxX: r.bounds.maxX * k, minZ: r.bounds.minZ * k, maxZ: r.bounds.maxZ * k },
}));

export const HOUSING_CONFIGS = Object.fromEntries(Object.entries(RAW_HOUSING_CONFIGS).map(([id, c]) => [id, {
  ...c,
  rooms: c.rooms && spreadRooms(c.rooms),
  walls: c.walls && spreadWalls(c.walls, false),
  blocks: c.blocks?.map((b) => ({ minX: b.minX * k, maxX: b.maxX * k, minZ: b.minZ * k, maxZ: b.maxZ * k })),
  levels: c.levels?.map((l) => ({ ...l, rooms: spreadRooms(l.rooms), walls: spreadWalls(l.walls, true) })),
}])) as Record<HousingTier, HousingConfig>;

const spreadBuiltIn = (b: BuiltIn): BuiltIn => ({ ...b, placement: migratePlacement(b.placement as Placement, b.size) as BuiltIn["placement"] });
export const BUILT_INS: BuiltIn[] = RAW_BUILT_INS.map(spreadBuiltIn);
export const BUILT_INS_BY_TIER = Object.fromEntries(Object.entries(RAW_BUILT_INS_BY_TIER).map(([id, list]) => [id, list.map(spreadBuiltIn)])) as Record<HousingTier, BuiltIn[]>;

/** All potential built-ins across tiers as catalog items */
const ALL_BUILT_IN_LIST = [
  ...BUILT_INS,
  ...BUILT_INS_BY_TIER.bed_space,
  ...BUILT_INS_BY_TIER.studio,
  ...BUILT_INS_BY_TIER.one_bedroom,
  ...BUILT_INS_BY_TIER.two_bedroom,
  ...BUILT_INS_BY_TIER.three_bedroom,
  ...BUILT_INS_BY_TIER.duplex,
  ...BUILT_INS_BY_TIER.townhouse,
  ...BUILT_INS_BY_TIER.penthouse,
  ...BUILT_INS_BY_TIER.villa,
];
const DEDUPED_BUILT_INS = Array.from(new Map(ALL_BUILT_IN_LIST.map((b) => [b.id, b])).values());

/** The built-ins as furniture items (so they can be moved, rotated and stored). */
export const HOME_ITEMS: CatalogItem[] = DEDUPED_BUILT_INS.map((b) => ({
  id: `home-${b.id}`,
  name: HOME_NAMES[b.id]?.[0] ?? b.id,
  icon: HOME_NAMES[b.id]?.[1] ?? "📦",
  desc: "Came with your home.",
  price: 0,
  // Chandeliers hang from the ceiling and rugs lie flat, like the same pieces in the shop.
  kind: (b.visual && CATALOG.find((c) => c.visual === b.visual)?.kind) || "floor",
  size: b.size,
  model: b.model,
  visual: b.visual,
  yaw: b.yaw,
  builtIn: true,
  interaction: b.interaction,
  fixed: b.fixed,
  category: "living" as ShopCategory,
}));

/** A home's furniture including the built-ins for that tier (in their starting place until they're moved). */
export function withHomeItems(furniture: OwnedFurniture[], tier: HousingTier = "studio"): OwnedFurniture[] {
  // Pieces placed in the old, smaller home move to the same spot in today's.
  furniture = furniture.map((f) => {
    if (!f.placement || f.placement.g === GRID) return f;
    const item = getCatalogItem(f.itemId);
    return item ? { ...f, placement: migratePlacement(f.placement, item.size) } : f;
  });
  const tierBuiltIns = BUILT_INS_BY_TIER[tier] ?? BUILT_INS;
  const validBuiltInUids = new Set(tierBuiltIns.map((b) => `builtin:${b.id}`));
  
  // Clean out built-ins that belonged to another housing tier
  const cleanedFurniture = furniture.filter((f) => !f.uid.startsWith("builtin:") || validBuiltInUids.has(f.uid));

  const missing = tierBuiltIns
    .filter((b) => !cleanedFurniture.some((f) => f.uid === `builtin:${b.id}`))
    .map((b) => ({ uid: `builtin:${b.id}`, itemId: `home-${b.id}`, placement: b.placement as Placement }));

  return [...cleanedFurniture, ...missing];
}

/** Door and window spans on the walls, in cells. */
export const DOOR = { wall: "west" as Wall, offset: 13, width: 2, height: 4.4 };
export const WINDOW = { wall: "north" as Wall, offset: 11, width: 6 };

/** Cells kept clear: in front of the door, and where the citizen stands. */
const RESERVED_CELLS: Array<[number, number]> = [
  [0, 5], [0, 6], [1, 5], [1, 6],
  [11, 12], [11, 13], [12, 12], [12, 13],
];

export const AVATAR_SPOT = { x: -ROOM_SIZE / 2 + 12 * CELL, z: -ROOM_SIZE / 2 + 13 * CELL };

/** Footprint size after rotation. */
export function rotatedSize(size: [number, number], rot: Rotation): [number, number] {
  return rot % 2 === 0 ? size : [size[1], size[0]];
}

/** World-space centre of a floor footprint. */
export function floorCenter(size: [number, number], p: FloorPlacement) {
  const [w, d] = rotatedSize(size, p.rot);
  return {
    x: -ROOM_SIZE / 2 + (p.col + w / 2) * CELL,
    z: -ROOM_SIZE / 2 + (p.row + d / 2) * CELL,
  };
}

/** World position (centre) and facing yaw of a wall item. */
export function wallTransform(size: [number, number], p: WallPlacement) {
  const half = ROOM_SIZE / 2;
  const along = -half + (p.offset + size[0] / 2) * CELL;
  const y = 1.7;
  const inset = 0.08;
  switch (p.wall) {
    case "north": return { x: along, y, z: -half + inset, yaw: 0 };
    case "south": return { x: -along, y, z: half - inset, yaw: Math.PI };
    case "west": return { x: -half + inset, y, z: -along, yaw: Math.PI / 2 };
    case "east": return { x: half - inset, y, z: along, yaw: -Math.PI / 2 };
  }
}

/** Converts a hit point on a wall into the offset of a wall item centred there. */
export function wallOffsetAt(wall: Wall, point: { x: number; z: number }, width: number) {
  const half = ROOM_SIZE / 2;
  const along = wall === "north" ? point.x : wall === "south" ? -point.x : wall === "west" ? -point.z : point.z;
  const offset = Math.round((along + half) / CELL - width / 2);
  return Math.max(0, Math.min(GRID - width, offset));
}

/** Converts a hit point on the floor into the placement of an item centred there (on floor `level`). */
export function floorPlacementAt(size: [number, number], rot: Rotation, point: { x: number; z: number }, level = 0): FloorPlacement {
  const [w, d] = rotatedSize(size, rot);
  const col = Math.round((point.x + ROOM_SIZE / 2) / CELL - w / 2);
  const row = Math.round((point.z + ROOM_SIZE / 2) / CELL - d / 2);
  return {
    kind: "floor",
    rot,
    col: Math.max(0, Math.min(GRID - w, col)),
    row: Math.max(0, Math.min(GRID - d, row)),
    ...(level ? { level } : {}),
    g: GRID,
  };
}

/** Rugs lie under things, ceiling lights hang over them, everything else is solid: each only clashes with its own layer. */
const layerOf = (kind: CatalogItem["kind"]) => (kind === "rug" ? "rug" : kind === "ceiling" ? "ceiling" : "solid");

function floorCells(size: [number, number], p: FloorPlacement): string[] {
  const [w, d] = rotatedSize(size, p.rot);
  const cells: string[] = [];
  for (let c = p.col; c < p.col + w; c++) for (let r = p.row; r < p.row + d; r++) cells.push(`${c},${r}`);
  return cells;
}

function spansOverlap(a: number, aw: number, b: number, bw: number) {
  return a < b + bw && b < a + aw;
}

/** Whether `item` can go at `placement` given everything else already in the room. */
export function isPlacementValid(item: CatalogItem, placement: Placement, others: OwnedFurniture[], ignoreUid?: string): boolean {
  // Only what's on the same floor matters.
  const level = levelOf(placement);
  const placed = others.filter((o) => o.uid !== ignoreUid && o.placement && levelOf(o.placement) === level);

  if (placement.kind === "wall") {
    if (item.kind !== "wall") return false;
    const w = item.size[0];
    if (placement.offset < 0 || placement.offset + w > GRID) return false;
    // The front door is downstairs only.
    if (level === 0 && placement.wall === DOOR.wall && spansOverlap(placement.offset, w, DOOR.offset, DOOR.width)) return false;
    if (placement.wall === WINDOW.wall && spansOverlap(placement.offset, w, WINDOW.offset, WINDOW.width)) return false;
    return !placed.some((o) => {
      const p = o.placement!;
      const other = getCatalogItem(o.itemId);
      return p.kind === "wall" && other && p.wall === placement.wall && spansOverlap(placement.offset, w, p.offset, other.size[0]);
    });
  }

  if (item.kind === "wall") return false;
  const [w, d] = rotatedSize(item.size, placement.rot);
  if (placement.col < 0 || placement.row < 0 || placement.col + w > GRID || placement.row + d > GRID) return false;

  const mine = new Set(floorCells(item.size, placement));
  const layer = layerOf(item.kind);

  // Solid furniture keeps clear of the doorway and where the citizen stands (downstairs).
  if (layer === "solid" && level === 0) {
    for (const [c, r] of RESERVED_CELLS) if (mine.has(`${c},${r}`)) return false;
  }
  return !placed.some((o) => {
    const p = o.placement!;
    const other = getCatalogItem(o.itemId);
    if (!other || p.kind !== "floor" || layerOf(other.kind) !== layer) return false;
    return floorCells(other.size, p).some((k) => mine.has(k));
  });
}

/** First free spot for an item, scanning from the room centre outwards (optionally at a fixed rotation). */
export function findFreePlacement(item: CatalogItem, others: OwnedFurniture[], rot?: Rotation, level = 0): Placement | null {
  const lv = level ? { level } : {};
  if (item.kind === "wall") {
    for (const wall of ["north", "east", "south", "west"] as Wall[]) {
      for (let offset = 0; offset <= GRID - item.size[0]; offset++) {
        const p: WallPlacement = { kind: "wall", wall, offset, ...lv, g: GRID };
        if (isPlacementValid(item, p, others)) return p;
      }
    }
    return null;
  }
  const candidates: FloorPlacement[] = [];
  for (const r of rot === undefined ? ([0, 1] as Rotation[]) : [rot]) {
    const [w, d] = rotatedSize(item.size, r);
    for (let col = 0; col <= GRID - w; col++) for (let row = 0; row <= GRID - d; row++) candidates.push({ kind: "floor", col, row, rot: r, ...lv, g: GRID });
  }
  const dist = (p: FloorPlacement) => {
    const c = floorCenter(item.size, p);
    return Math.hypot(c.x, c.z - 1);
  };
  candidates.sort((a, b) => dist(a) - dist(b));
  return candidates.find((p) => isPlacementValid(item, p, others)) ?? null;
}
