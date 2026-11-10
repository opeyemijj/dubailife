// Furniture catalog and the apartment's placement grid.
// The room is a square of GRID x GRID cells; floor items occupy a w x d block of cells,
// wall items occupy a run of cells along one wall.

import FLOORPLANS from "@/data/home/floorplans.json";
import EXTERIOR_DATA from "@/data/home/exterior.json";
import CEILING_DATA from "@/data/home/ceilings.json";

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
  /** Which shows on top where pieces overlap (higher sits a little above): Bring forward / Send back. */
  layer?: number;
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
  /** Player-chosen custom hex color tint (#18, #22). */
  customColor?: string;
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
  /** The main colour of a code-drawn piece (the same armchair in navy, blush…). */
  tint?: string;
  /** Part of the building (the staircase): can't be moved or stored. */
  fixed?: boolean;
  /** Star quality tier (1, 2, or 3 stars) */
  stars?: 1 | 2 | 3;
  /** Stat benefit pill (e.g. "+Fun", "+Energy", "+Food x1.1", "+Hygiene", "+Social", "+Toilet") */
  statBadge?: string;
  /** Number of customisable colour palettes (e.g. 4, 5, 8, 10, 13) */
  paletteCount?: number;
  /** Shows NEW badge on item card */
  isNew?: boolean;
  /** Custom badge tag for card top-left (e.g. "1x1", "2x1", "2x2", "1x2", "wall", "yard") */
  placementTag?: string;
}

export type ShopCategory =
  | "living"
  | "bedroom"
  | "dining"
  | "nursery"
  | "lighting"
  | "wall"
  | "decor"
  | "sleep"
  | "kitchen"
  | "bath"
  | "comfort"
  | "fun"
  | "skills"
  | "pets"
  | "luxury"
  | "events";

export interface DecorCategoryTab {
  id: string;
  label: string;
  icon: string;
}

export const DECOR_CATEGORIES: DecorCategoryTab[] = [
  { id: "new", label: "New", icon: "✨" },
  { id: "storage", label: "Storage", icon: "📦" },
  { id: "all", label: "All", icon: "⊞" },
  { id: "design", label: "Design", icon: "📌" },
  { id: "styles", label: "Styles", icon: "🪄" },
  { id: "sleep", label: "Sleep", icon: "🛏️" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bath", label: "Bath", icon: "🚿" },
  { id: "comfort", label: "Comfort", icon: "🛋️" },
  { id: "fun", label: "Fun", icon: "📺" },
  { id: "skills", label: "Skills", icon: "🎸" },
  { id: "lighting", label: "Light", icon: "💡" },
  { id: "decor", label: "Deco", icon: "🌸" },
  { id: "pets", label: "Pets", icon: "🐾" },
  { id: "luxury", label: "Luxury", icon: "💎" },
];

export const SHOP_CATEGORIES: Array<{ id: ShopCategory; label: string; icon: string }> = [
  { id: "comfort", label: "Comfort", icon: "🛋️" },
  { id: "sleep", label: "Sleep", icon: "🛏️" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bath", label: "Bath", icon: "🚿" },
  { id: "fun", label: "Fun", icon: "📺" },
  { id: "skills", label: "Skills", icon: "🎸" },
  { id: "lighting", label: "Light", icon: "💡" },
  { id: "decor", label: "Deco", icon: "🌸" },
  { id: "pets", label: "Pets", icon: "🐾" },
  { id: "luxury", label: "Luxury", icon: "💎" },
  { id: "living", label: "Living", icon: "🛋️" },
  { id: "bedroom", label: "Bedroom", icon: "🛏️" },
  { id: "dining", label: "Dining & kitchen", icon: "🍽️" },
  { id: "nursery", label: "Nursery & Baby", icon: "👶" },
  { id: "events", label: "Events & weddings", icon: "🎊" },
  { id: "wall", label: "Wall art & mirrors", icon: "🖼️" },
];

export interface CuratedStyle {
  id: string;
  name: string;
  desc: string;
  price: number;
  icon: string;
  wallColor: string;
  floorFinish: FloorFinish;
  furnitureIds: string[];
}

export const CURATED_STYLES: CuratedStyle[] = [
  {
    id: "lagos-minimal",
    name: "Lagos Minimal",
    desc: "Clean lines, white wood and one good plant. Nothing...",
    price: 402000,
    icon: "🤍",
    wallColor: "#faf8f3",
    floorFinish: "white-oak",
    furnitureIds: ["sofa", "coffee-table", "plant", "floor-lamp"],
  },
  {
    id: "afro-luxe",
    name: "Afro-Luxe",
    desc: "Mustard and emerald, Aso-Oke runners and art from...",
    price: 1400000,
    icon: "🌍",
    wallColor: "#d8cfc2",
    floorFinish: "walnut",
    furnitureIds: ["royal-gold-throne", "carpet", "majlis-emerald", "art-abstract"],
  },
  {
    id: "lekki-penthouse",
    name: "Lekki Penthouse",
    desc: "Charcoal walls, white marble, a big L sofa and a...",
    price: 8500000,
    icon: "🏙️",
    wallColor: "#33363b",
    floorFinish: "white-marble",
    furnitureIds: ["l-sofa", "chandelier-ring", "fireplace", "media-wall"],
  },
  {
    id: "cosy-mainland",
    name: "Cosy Dubai",
    desc: "Soft chairs, a family sofa and warm ambient lighting.",
    price: 337000,
    icon: "🏡",
    wallColor: "#c7dbea",
    floorFinish: "oak",
    furnitureIds: ["lounge-chair", "sofa", "coffee-table", "plant"],
  },
  {
    id: "boho",
    name: "Boho Chic",
    desc: "Warm rugs, plush seating and desert art.",
    price: 364000,
    icon: "🪴",
    wallColor: "#f4efe6",
    floorFinish: "teak",
    furnitureIds: ["velvet-armchair", "carpet", "round-rug", "plant", "art-desert"],
  },
  {
    id: "royal-gold",
    name: "Royal Gold Palace",
    desc: "Gold walls, a gold sofa, silk curtains and crystal.",
    price: 6400000,
    icon: "👑",
    wallColor: "#d4af37",
    floorFinish: "white-marble",
    furnitureIds: ["royal-gold-majlis", "royal-gold-throne", "chandelier-crystal", "sculpture"],
  },
];

export interface SavedLook {
  id: string;
  name: string;
  date: string;
  wall: string;
  floor: FloorFinish;
  bedding?: string;
  panels?: boolean;
  ceiling?: CeilingFinish;
  ceilingColor?: string;
}

export const CATALOG: CatalogItem[] = [
  // Events and weddings (drawn in components/home/EventDecor): for the hotel ballrooms, and parties at home.
  { id: "ev-banquet-table", name: "Banquet Table for Eight", desc: "Round table dressed to the floor, gold-sashed chairs, flowers and candles.", icon: "🍽️", price: 2500, kind: "floor", size: [6, 6], visual: "banquet-table", category: "events", interaction: "chair" },
  { id: "ev-banquet-table-blush", name: "Blush Banquet Table", desc: "The same table in blush linen.", icon: "🌸", price: 2600, kind: "floor", size: [6, 6], visual: "banquet-table", tint: "#fbcfe8", category: "events", interaction: "chair" },
  { id: "ev-banquet-table-gold", name: "Gold Banquet Table", desc: "Gold linen for a royal theme.", icon: "✨", price: 2800, kind: "floor", size: [6, 6], visual: "banquet-table", tint: "#e9cf8a", category: "events", interaction: "chair" },
  { id: "ev-kosha", name: "Kosha Stage", desc: "A raised stage with a gilded arch and a sofa for the couple.", icon: "👑", price: 18000, kind: "floor", size: [8, 4], visual: "kosha", category: "events", interaction: "chair" },
  { id: "ev-kosha-emerald", name: "Emerald Kosha Stage", desc: "The kosha in emerald velvet.", icon: "💚", price: 18500, kind: "floor", size: [8, 4], visual: "kosha", tint: "#1f5a45", category: "events", interaction: "chair" },
  { id: "ev-floral-arch", name: "White Floral Arch", desc: "An arch of white and blush flowers.", icon: "💐", price: 12000, kind: "floor", size: [5, 1], visual: "floral-arch", category: "events" },
  { id: "ev-led-wall", name: "LED Wall", desc: "A wall-sized screen washing the room in colour.", icon: "🟪", price: 15000, kind: "wall", size: [8, 3], visual: "led-wall", category: "events" },
  { id: "ev-dance-floor", name: "Lit Dance Floor", desc: "Chequered tiles that pulse with the music.", icon: "🪩", price: 9000, kind: "rug", size: [8, 8], visual: "dance-floor", category: "events" },
  { id: "ev-aisle-runner", name: "Petal Aisle Runner", desc: "A long runner scattered with rose petals.", icon: "🌹", price: 3000, kind: "rug", size: [2, 10], visual: "aisle-runner", category: "events" },
  { id: "ev-lantern", name: "Brass Lantern", desc: "A glowing lantern to line the aisle.", icon: "🏮", price: 800, kind: "floor", size: [1, 1], visual: "lantern", category: "events" },
  { id: "ev-rose-wall", name: "Rose Photo Wall", desc: "A wall of roses for the photos.", icon: "📸", price: 6000, kind: "wall", size: [5, 3], visual: "rose-wall", category: "events" },
  { id: "ev-cake-table", name: "Five-Tier Cake", desc: "A white five-tier cake on a gold stand.", icon: "🎂", price: 4500, kind: "floor", size: [2, 2], visual: "cake-table", category: "events" },
  { id: "ev-dj-booth", name: "DJ Booth", desc: "Decks and a lit front for the DJ.", icon: "🎧", price: 6000, kind: "floor", size: [3, 2], visual: "dj-booth", category: "events" },
  { id: "ev-gold-gate", name: "Gilded Entrance Gate", desc: "A gold arch to walk in under.", icon: "⛩️", price: 7000, kind: "floor", size: [4, 1], visual: "gold-gate", category: "events" },
  { id: "ev-fairy-canopy", name: "Fairy-Light Canopy", desc: "Hundreds of warm lights under the ceiling.", icon: "✨", price: 9000, kind: "ceiling", size: [8, 8], visual: "fairy-canopy", category: "events" },
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
  // Colour choices of the code-drawn pieces (tint), and more paintings.
  { id: "velvet-armchair-blush", name: "Blush Velvet Armchair", desc: "Deep-buttoned rose velvet on brass feet.", icon: "🩷", price: 2900, kind: "floor", size: [2, 2], visual: "armchair", tint: "#c98b8b", category: "living", interaction: "chair" },
  { id: "velvet-armchair-navy", name: "Navy Velvet Armchair", desc: "Deep-buttoned midnight velvet on brass feet.", icon: "💙", price: 2900, kind: "floor", size: [2, 2], visual: "armchair", tint: "#1e2a4a", category: "living", interaction: "chair" },
  { id: "velvet-armchair-mustard", name: "Mustard Velvet Armchair", desc: "Deep-buttoned saffron velvet on brass feet.", icon: "💛", price: 2900, kind: "floor", size: [2, 2], visual: "armchair", tint: "#c9952b", category: "living", interaction: "chair" },
  { id: "velvet-armchair-ivory", name: "Ivory Bouclé Armchair", desc: "Soft cream bouclé on brass feet.", icon: "🤍", price: 3200, kind: "floor", size: [2, 2], visual: "armchair", tint: "#ece4d6", category: "living", interaction: "chair" },
  { id: "ottoman-ivory", name: "Ivory Bouclé Pouf", desc: "A round pouf in cream bouclé.", icon: "⚪", price: 900, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#ece4d6", category: "living" },
  { id: "ottoman-emerald", name: "Emerald Velvet Pouf", desc: "A round pouf in emerald velvet.", icon: "🟢", price: 950, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#1f5a45", category: "living" },
  { id: "ottoman-black", name: "Black Leather Pouf", desc: "A round pouf in black leather.", icon: "⚫", price: 950, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#1c1c1f", category: "living" },
  { id: "majlis-navy", name: "Navy Majlis Seating", desc: "Low floor cushions in deep navy, with gold bolsters.", icon: "🕌", price: 6500, kind: "floor", size: [4, 4], visual: "majlis", tint: "#1e2a4a", category: "living", interaction: "chair" },
  { id: "majlis-emerald", name: "Emerald Majlis Seating", desc: "Low floor cushions in emerald, with gold bolsters.", icon: "🕌", price: 6500, kind: "floor", size: [4, 4], visual: "majlis", tint: "#1f5a45", category: "living", interaction: "chair" },
  { id: "majlis-ivory", name: "Ivory Majlis Seating", desc: "Low floor cushions in cream linen.", icon: "🕌", price: 6800, kind: "floor", size: [4, 4], visual: "majlis", tint: "#e7dcc8", category: "living", interaction: "chair" },
  { id: "rug-round-sage", name: "Sage Round Rug", desc: "A soft round rug in sage green.", icon: "🟩", price: 2600, kind: "rug", size: [5, 5], visual: "rug-round", tint: "#b7c4ad", category: "decor" },
  { id: "rug-round-navy", name: "Navy Round Rug", desc: "A soft round rug in deep navy.", icon: "🟦", price: 2600, kind: "rug", size: [5, 5], visual: "rug-round", tint: "#2a3a5c", category: "decor" },
  { id: "rug-round-terracotta", name: "Terracotta Round Rug", desc: "A soft round rug in sun-baked terracotta.", icon: "🟧", price: 2600, kind: "rug", size: [5, 5], visual: "rug-round", tint: "#b5654a", category: "decor" },
  { id: "art-skyline", name: "Dubai Skyline at Night", desc: "The towers lit up over the Creek.", icon: "🌃", price: 5200, kind: "wall", size: [4, 2], visual: "art-skyline", category: "wall" },
  { id: "art-sunset", name: "Desert Sunset Canvas", desc: "A low sun over rolling dunes.", icon: "🌅", price: 3600, kind: "wall", size: [3, 2], visual: "art-sunset", category: "wall" },
  { id: "art-ocean", name: "Arabian Gulf Seascape", desc: "Layered blues of the Gulf at noon.", icon: "🌊", price: 3400, kind: "wall", size: [3, 2], visual: "art-ocean", category: "wall" },
  { id: "art-geometric", name: "Islamic Geometric Star", desc: "An eight-point star pattern in teal and gold.", icon: "✴️", price: 4600, kind: "wall", size: [2, 2], visual: "art-geometric", category: "wall" },
  { id: "art-botanical", name: "Tropical Botanical Print", desc: "Big green leaves on cream.", icon: "🌿", price: 2200, kind: "wall", size: [2, 3], visual: "art-botanical", category: "wall" },
  { id: "art-pop", name: "Colour-Block Modern Art", desc: "Bold primaries in a gallery frame.", icon: "🟥", price: 3900, kind: "wall", size: [3, 3], visual: "art-pop", category: "wall" },
  // 4 New Designer Collections (#18): Arabian Royal Gold, Nordic Japandi, Palm Beach Resort, Cyberpunk Penthouse
  { id: "royal-gold-majlis", name: "24K Royal Gold Palace Majlis", desc: "Hand-embroidered gold brocade cushions for VIP guests.", icon: "👑", price: 8800, kind: "floor", size: [4, 4], visual: "majlis", tint: "#d4af37", category: "living", interaction: "chair" },
  { id: "royal-gold-throne", name: "Emirati Velvet & Brass Throne Chair", desc: "Regal amber-gold velvet armchair.", icon: "🪑", price: 4200, kind: "floor", size: [2, 2], visual: "armchair", tint: "#b45309", category: "living", interaction: "chair" },
  { id: "japandi-boucle-chair", name: "Japandi Warm Sand Bouclé Lounge", desc: "Minimalist Nordic-Japanese organic comfort.", icon: "🤍", price: 3100, kind: "floor", size: [2, 2], visual: "armchair", tint: "#d6d3d1", category: "living", interaction: "chair" },
  { id: "japandi-linen-bed", name: "Japandi Floating Ash Canopy Bed", desc: "Serene natural linen four-poster bed.", icon: "🛏️", price: 14500, kind: "floor", size: [4, 5], visual: "canopy-bed", tint: "#e7e5e4", category: "bedroom", interaction: "bed" },
  { id: "resort-turquoise-sofa", name: "Palm Lagoon Velvet Armchair", desc: "Breezy Arabian Gulf turquoise resort seating.", icon: "🏖️", price: 3300, kind: "floor", size: [2, 2], visual: "armchair", tint: "#0d9488", category: "living", interaction: "chair" },
  { id: "resort-coral-rug", name: "Sunset Coral Silk Round Rug", desc: "Hand-tufted Palm Jumeirah coral motif.", icon: "🌺", price: 3800, kind: "rug", size: [5, 5], visual: "rug-round", tint: "#f43f5e", category: "decor" },
  { id: "cyber-violet-armchair", name: "Neon Violet Penthouse Pod Chair", desc: "Futuristic Downtown Dubai lounge seat.", icon: "🔮", price: 3900, kind: "floor", size: [2, 2], visual: "armchair", tint: "#7c3aed", category: "living", interaction: "chair" },
  { id: "cyber-obsidian-bed", name: "Obsidian Indigo Canopy Bed", desc: "Sleek midnight penthouse master bed.", icon: "🌌", price: 17500, kind: "floor", size: [4, 5], visual: "canopy-bed", tint: "#312e81", category: "bedroom", interaction: "bed" },
  // 3D Nursery & Baby Collection (#19)
  { id: "nursery-crib-gold", name: "Royal Canopy Baby Crib & Mobile", desc: "Interactive baby crib with lullaby mobile & soothing rock.", icon: "👶", price: 3200, kind: "floor", size: [2, 3], visual: "canopy-bed", tint: "#fef3c7", category: "nursery", interaction: "bed" },
  { id: "nursery-changing-table", name: "Smart Baby Changing & Diaper Station", desc: "Equipped with warmers, wipes & baby care mini-games.", icon: "🍼", price: 1850, kind: "floor", size: [2, 1], visual: "vanity", tint: "#e0f2fe", category: "nursery", interaction: "cooler" },
  { id: "nursery-rocking-chair", name: "Velvet Nursing Glider Chair", desc: "Plush pastel glider for midnight bottle feeds & lullabies.", icon: "🩷", price: 2100, kind: "floor", size: [2, 2], visual: "armchair", tint: "#fbcfe8", category: "nursery", interaction: "chair" },
  { id: "nursery-playmat", name: "Soft Cloud Baby Playmat Rug", desc: "Cushioned sensory tummy-time mat for crawlers.", icon: "☁️", price: 1100, kind: "rug", size: [4, 4], visual: "rug-round", tint: "#bae6fd", category: "nursery" },
  { id: "nursery-toy-chest", name: "Montessori Storybook & Toy Shelf", desc: "Wall-mounted nursery books, plushies & blocks.", icon: "🧸", price: 1250, kind: "wall", size: [3, 2], visual: "shelves", tint: "#fde68a", category: "nursery" },
  { id: "nursery-nightlight", name: "Starlight Lullaby Nursery Lamp", desc: "Projects gentle stars across the nursery ceiling.", icon: "🌟", price: 850, kind: "floor", size: [1, 1], visual: "tripod-lamp", tint: "#c084fc", category: "nursery" },

  // --- Props & Furniture with Verified 3D GLB Models ---
  { id: "chair", name: "Nordic Wooden Chair", desc: "Solid natural wood dining chair.", icon: "🪑", price: 500, kind: "floor", size: [1, 1], model: "/models/furniture/chair.glb", interaction: "chair", category: "dining", stars: 1, statBadge: "+Social", placementTag: "1×1" },
  { id: "master-bed", name: "Comfort Master Bed", desc: "Spacious master bed with customizable bedding.", icon: "🛏️", price: 4500, kind: "floor", size: [4, 4], model: "/models/furniture/bed.glb", interaction: "bed", category: "bedroom", stars: 2, statBadge: "+Energy ×1.1", placementTag: "2×2" },
  { id: "kitchen-fridge", name: "Double-Door Smart Fridge", desc: "Energy-efficient stainless steel refrigerator with freezer.", icon: "🧊", price: 3800, kind: "floor", size: [2, 2], model: "/models/furniture/fridge.glb", interaction: "cooler", category: "dining", stars: 2, statBadge: "+Food", placementTag: "1×1" },
  { id: "audio-speaker", name: "Party Club Speaker", desc: "High-power floor-standing audio speaker.", icon: "🔊", price: 2800, kind: "floor", size: [1, 1], model: "/models/props/speaker.glb", category: "living", stars: 2, statBadge: "+Fun", placementTag: "1×1" },
  { id: "kitchen-counter", name: "Modern Kitchen Counter", desc: "Hardwood kitchen counter for cooking and food prep.", icon: "🗄️", price: 3200, kind: "floor", size: [2, 1], model: "/models/props/counter.glb", category: "dining", stars: 2, statBadge: "+Food", placementTag: "2×1" },
  { id: "cafe-table", name: "Bistro Cafe Table", desc: "Compact modern dining and coffee table.", icon: "☕", price: 1400, kind: "floor", size: [2, 2], model: "/models/props/cafe-table.glb", category: "dining", stars: 1, statBadge: "+Food", placementTag: "2×2" },
  { id: "coffee-machine", name: "Espresso Machine", desc: "Professional countertop barista espresso coffee maker.", icon: "☕", price: 1800, kind: "floor", size: [1, 1], model: "/models/props/coffee-machine.glb", category: "dining", stars: 2, statBadge: "+Energy", placementTag: "1×1", interaction: "cooler" },
  { id: "shelf-tall", name: "Tall Display Bookshelf", desc: "Floor-to-ceiling modern display shelving unit.", icon: "📚", price: 2400, kind: "floor", size: [2, 1], model: "/models/props/shelf-tall.glb", category: "living", stars: 2, statBadge: "+Fun", placementTag: "2×1" },

  // --- Luxury Collection (Screenshots & Procedural 3D Visuals) ---
  { id: "pool-plunge", name: "Plunge Pool", desc: "Refreshing compact outdoor plunge pool with lounge chair.", icon: "🏊", price: 28000000, kind: "floor", size: [4, 4], visual: "pool-plunge", category: "luxury", stars: 3, statBadge: "+Fun ×1.4", placementTag: "yard" },
  { id: "pool-family", name: "Family Pool", desc: "Spacious family swimming pool with deck umbrella and chair.", icon: "🏊", price: 75000000, kind: "floor", size: [6, 4], visual: "pool-family", category: "luxury", stars: 3, statBadge: "+Fun ×1.4", placementTag: "yard" },
  { id: "pool-lap", name: "Infinity Lap Pool", desc: "Long outdoor infinity lap pool with blue water and edge.", icon: "🏊", price: 150000000, kind: "floor", size: [8, 3], visual: "pool-lap", category: "luxury", stars: 3, statBadge: "+Fun ×1.6", placementTag: "yard" },
  { id: "diamond-throne", name: "Diamond-Studded Throne", desc: "24K solid gold and velvet throne chair.", icon: "👑", price: 250000000, kind: "floor", size: [2, 2], visual: "armchair", tint: "#b45309", category: "luxury", stars: 3, statBadge: "+Fun ×1.6", placementTag: "1×1", interaction: "chair" },
  { id: "old-master-painting", name: "Old Master Painting", desc: "Historical Renaissance museum-grade gold-framed oil painting.", icon: "🖼️", price: 400000000, kind: "wall", size: [3, 2], visual: "art-abstract", category: "luxury", stars: 3, statBadge: "+Fun ×1.6", placementTag: "wall" },
  { id: "gold-bullion-vault", name: "Gold Bullion Vault", desc: "Heavy steel safe stacked with certified pure gold bars.", icon: "🏦", price: 500000000, kind: "floor", size: [3, 1], visual: "drinks-cabinet", category: "luxury", stars: 3, statBadge: "+Fun ×1.6", placementTag: "1×1" },

  // --- Pets Collection ---
  { id: "pet-cat", name: "Mimi the Cat", desc: "Friendly dark grey domestic cat with tail.", icon: "🐱", price: 15000, kind: "floor", size: [1, 1], visual: "pet-cat", category: "pets", stars: 1, statBadge: "+Fun ×1.1", placementTag: "1×1" },
  { id: "pet-dog", name: "Bingo the Local Dog", desc: "Energetic loyal caramel-coloured dog with wagging tail.", icon: "🐶", price: 25000, kind: "floor", size: [1, 1], visual: "pet-dog", category: "pets", stars: 1, statBadge: "+Fun ×1.1", placementTag: "1×1" },
  { id: "pet-parrot", name: "African Grey Parrot", desc: "Intelligent talking grey parrot on a standing wooden perch.", icon: "🦜", price: 45000, kind: "floor", size: [1, 1], visual: "pet-parrot", category: "pets", stars: 2, statBadge: "+Fun ×1.1", placementTag: "1×1" },

  // --- Deco Collection ---
  { id: "wall-calendar", name: "Wall Calendar", desc: "Yearly paper wall planner with dates.", icon: "📅", price: 300, kind: "wall", size: [1, 2], visual: "art-pop", category: "decor", stars: 1, statBadge: "+Fun", placementTag: "wall" },
  { id: "poster-fela", name: "Fela Poster", desc: "Afrobeats icon vintage wall poster.", icon: "🖼️", price: 600, kind: "wall", size: [1, 2], visual: "art-abstract", category: "decor", stars: 1, statBadge: "+Fun", placementTag: "wall" },
  { id: "potted-plant", name: "Potted Plant", desc: "Bushy potted room plant with green leaves.", icon: "🪴", price: 700, kind: "floor", size: [1, 1], model: "/models/furniture/houseplant.glb", category: "decor", stars: 1, statBadge: "+Fun", placementTag: "1×1" },
  { id: "plant-small", name: "Small Potted Plant", desc: "Mini evergreen plant in a hexagonal wooden pot.", icon: "🌱", price: 700, kind: "floor", size: [1, 1], visual: "orchids", category: "decor", stars: 1, statBadge: "+Fun", placementTag: "1×1" },
  { id: "plant-succulent", name: "Succulent Pot", desc: "Jade succulent in a geometric pot.", icon: "🌵", price: 700, kind: "floor", size: [1, 1], visual: "vase", category: "decor", stars: 1, statBadge: "+Fun", placementTag: "1×1" },
  { id: "bin-bags", name: "Bin Bags", desc: "Durable black plastic rubbish bags.", icon: "🗑️", price: 1000, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#111827", category: "decor", isNew: true, statBadge: "+Fun", placementTag: "1×1" },

  // --- Fun Collection ---
  { id: "radio-transistor", name: "Transistor Radio", desc: "Retro FM/AM analog tuner on wooden legs.", icon: "📻", price: 1000, kind: "floor", size: [1, 1], visual: "coffee-bar", category: "fun", stars: 1, statBadge: "+Fun", placementTag: "1×1" },
  { id: "party-speakers", name: "Party Speakers", desc: "Dual high-bass floor standing speakers.", icon: "🔊", price: 7200, kind: "floor", size: [1, 1], model: "/models/props/speaker.glb", category: "fun", stars: 2, statBadge: "+Fun", placementTag: "1×1" },
  { id: "toy-box", name: "Toy Box", desc: "Colorful plastic chest filled with toys.", icon: "🧸", price: 7500, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#2563eb", category: "fun", stars: 1, statBadge: "+Fun", paletteCount: 5, placementTag: "1×1" },
  { id: "toy-blocks", name: "Building Blocks & Dino", desc: "Educational building bricks and dinosaur toys.", icon: "🧩", price: 9000, kind: "floor", size: [1, 1], visual: "shelves", category: "fun", isNew: true, statBadge: "+Fun", placementTag: "1×1" },
  { id: "tv-32", name: '32" Flat TV', desc: "Crisp HD flat screen television on wood media stand.", icon: "📺", price: 10800, kind: "floor", size: [2, 1], model: "/models/furniture/tv.glb", category: "fun", stars: 3, statBadge: "+Fun ×1.1", placementTag: "1×1" },
  { id: "toy-cars", name: "Toy Truck & Cars", desc: "Die-cast military trucks and race cars set.", icon: "🚗", price: 12000, kind: "floor", size: [1, 1], visual: "sculpture", category: "fun", isNew: true, statBadge: "+Fun ×1.1", placementTag: "1×1" },

  // --- Comfort Collection ---
  { id: "plastic-chair", name: "Plastic Chair", desc: "Everyday durable stackable plastic chair.", icon: "🪑", price: 500, kind: "floor", size: [1, 1], model: "/models/furniture/chair.glb", interaction: "chair", category: "comfort", stars: 1, statBadge: "+Social", paletteCount: 5, placementTag: "1×1" },
  { id: "standing-fan", name: "Standing Fan", desc: "Adjustable oscillating fan with cool breeze.", icon: "💨", price: 2200, kind: "floor", size: [1, 1], visual: "tripod-lamp", category: "comfort", stars: 2, statBadge: "+Fun", placementTag: "1×1" },
  { id: "dining-table-round", name: "Dining Table", desc: "Round dining table with two wooden chairs.", icon: "🍽️", price: 6600, kind: "floor", size: [2, 2], model: "/models/props/cafe-table.glb", category: "comfort", stars: 2, statBadge: "+Food", placementTag: "2×2" },
  { id: "lounge-armchair", name: "Lounge Armchair", desc: "Plush mustard armchair with tufted back.", icon: "🛋️", price: 8500, kind: "floor", size: [1, 1], visual: "armchair", tint: "#d49b28", category: "comfort", stars: 2, statBadge: "+Fun", paletteCount: 8, placementTag: "1×1", interaction: "chair" },
  { id: "velvet-sofa-2x1", name: "Velvet Sofa", desc: "Emerald two-seater sofa with gold legs.", icon: "🛋️", price: 10200, kind: "floor", size: [2, 1], model: "/models/furniture/couch.glb", category: "comfort", stars: 2, statBadge: "+Fun ×1.1", paletteCount: 8, placementTag: "2×1", interaction: "chair" },
  { id: "bean-bag", name: "Bean Bag", desc: "Ergonomic slouch bean bag in cognac leather.", icon: "🟤", price: 12000, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#d97706", category: "comfort", stars: 1, statBadge: "+Fun ×1.1", paletteCount: 10, placementTag: "1×1" },

  // --- Bath Collection ---
  { id: "bucket-bowl", name: "Bucket & Bowl", desc: "Traditional blue water bucket and red wash bowl.", icon: "🪣", price: 400, kind: "floor", size: [1, 1], visual: "vase", category: "bath", stars: 1, statBadge: "+Hygiene", placementTag: "1×1" },
  { id: "water-drum", name: "Water Drum & Jerrycans", desc: "Sturdy blue drum with yellow water jerrycans.", icon: "🛢️", price: 800, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#1d4ed8", category: "bath", stars: 1, statBadge: "+Hygiene", placementTag: "1×1" },
  { id: "wc-toilet", name: "WC Toilet", desc: "Ceramic flush toilet with cistern.", icon: "🚽", price: 3000, kind: "floor", size: [1, 1], visual: "wc-toilet", category: "bath", stars: 2, statBadge: "+Toilet", placementTag: "1×1" },
  { id: "laundry-hamper", name: "Laundry Hamper", desc: "Dark wood slatted hamper with white cloth liner.", icon: "🧺", price: 6500, kind: "floor", size: [1, 1], visual: "drinks-cabinet", category: "bath", isNew: true, statBadge: "+Fun", placementTag: "1×1" },
  { id: "rain-shower", name: "Rain Shower", desc: "Enclosed glass shower stall with rainfall head.", icon: "🚿", price: 11400, kind: "floor", size: [1, 1], visual: "rain-shower", category: "bath", stars: 3, statBadge: "+Hygiene ×1.1", placementTag: "1×1" },
  { id: "baby-bath", name: "Baby Bath", desc: "Elevated cushioned changing and wash tub.", icon: "🛁", price: 12000, kind: "floor", size: [1, 1], visual: "coffee-bar", category: "bath", stars: 1, statBadge: "+Fun ×1.1", placementTag: "1×1" },

  // --- Kitchen Collection ---
  { id: "cooler-box", name: "Cooler Box", desc: "Insulated picnic cooler box for cold drinks.", icon: "🧊", price: 700, kind: "floor", size: [1, 1], visual: "ottoman", tint: "#2563eb", category: "kitchen", stars: 1, statBadge: "+Food", placementTag: "1×1", interaction: "cooler" },
  { id: "kerosene-stove", name: "Kerosene Stove", desc: "Single-burner classic green cooking stove on table.", icon: "🍳", price: 1100, kind: "floor", size: [1, 1], visual: "coffee-bar", category: "kitchen", stars: 1, statBadge: "+Food", placementTag: "1×1" },
  { id: "pedal-dustbin", name: "Pedal Dustbin", desc: "Stainless steel foot pedal rubbish bin.", icon: "🗑️", price: 2500, kind: "floor", size: [1, 1], visual: "vase", category: "kitchen", stars: 1, statBadge: "+Fun", placementTag: "1×1" },
  { id: "kitchen-counter-1x1", name: "Kitchen Counter", desc: "Wooden cabinet unit with granite countertop.", icon: "🗄️", price: 4200, kind: "floor", size: [1, 1], model: "/models/props/counter.glb", category: "kitchen", stars: 1, statBadge: "+Food", paletteCount: 5, placementTag: "1×1" },
  { id: "kitchen-sink", name: "Kitchen Sink", desc: "Deep basin wash sink with chrome mixer tap.", icon: "🚰", price: 4800, kind: "floor", size: [1, 1], visual: "coffee-bar", category: "kitchen", stars: 2, statBadge: "+Hygiene", placementTag: "1×1" },
  { id: "gas-cooker", name: "Gas Cooker", desc: "4-burner stainless steel gas stove with baking oven.", icon: "🔥", price: 8400, kind: "floor", size: [1, 1], visual: "drinks-cabinet", category: "kitchen", stars: 2, statBadge: "+Food ×1.15", placementTag: "1×1" },

  // --- Sleep Collection ---
  { id: "mattress-floor", name: "Mattress on Floor", desc: "Simple foam mattress on floor for resting.", icon: "🛏️", price: 1200, kind: "floor", size: [2, 1], model: "/models/furniture/bed.glb", category: "sleep", stars: 1, statBadge: "+Energy", placementTag: "2×1", interaction: "bed" },
  { id: "bed-single", name: "Single Wooden Bed", desc: "Compact single bed frame with comfortable mattress.", icon: "🛏️", price: 3500, kind: "floor", size: [2, 2], model: "/models/furniture/bed.glb", category: "sleep", stars: 1, statBadge: "+Energy", placementTag: "2×2", interaction: "bed" },
];

export const getCatalogItem = (id: string) => CATALOG.find((c) => c.id === id) ?? HOME_ITEMS.find((c) => c.id === id);

export type Interaction = "cooler" | "bed" | "chair" | "door" | "stairs";

/** Things in the home you use rather than sit or lie on: the TV, the aquarium, the dining table, the kitchen counter.
    Each opens its actions (src/data/home/fixtures.json, kinds "tv", "aquarium", "dining", "island"). */
export type HomeObject = "tv" | "aquarium" | "dining" | "island";
export function homeObjectOf(item: { id: string; visual?: string; model?: string }): HomeObject | null {
  if (item.visual === "aquarium") return "aquarium";
  if (item.visual === "dining-set") return "dining";
  if (item.visual === "kitchen-island") return "island";
  if (item.id === "tv" || /(^|_)tv$/.test(item.id) || item.model?.endsWith("/tv.glb")) return "tv";
  return null;
}

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

/** A home layout, or (ballroom) a hotel event hall: an open room decorated with the same tools (lib/halls). */
export type HousingTier = "bed_space" | "studio" | "one_bedroom" | "two_bedroom" | "three_bedroom" | "duplex" | "townhouse" | "penthouse" | "villa" | "ballroom";

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

export type FloorFinish = "oak" | "herringbone" | "walnut" | "white-marble" | "black-marble" | "travertine"
  | "white-oak" | "grey-oak" | "teak" | "herringbone-white" | "green-marble" | "rose-marble" | "terrazzo" | "slate";
export const FLOOR_FINISHES: Array<{ id: FloorFinish; label: string; price: number }> = [
  { id: "oak", label: "Light oak planks", price: 0 },
  { id: "herringbone", label: "Herringbone parquet", price: 4500 },
  { id: "walnut", label: "Dark walnut", price: 3800 },
  { id: "travertine", label: "Travertine stone", price: 6200 },
  { id: "white-marble", label: "Calacatta white marble", price: 9500 },
  { id: "black-marble", label: "Nero Marquina black marble", price: 9500 },
  { id: "white-oak", label: "Scandi white oak", price: 3600 },
  { id: "grey-oak", label: "Smoked grey oak", price: 3600 },
  { id: "teak", label: "Golden teak", price: 4200 },
  { id: "herringbone-white", label: "Whitewashed herringbone", price: 5200 },
  { id: "green-marble", label: "Verde emerald marble", price: 11000 },
  { id: "rose-marble", label: "Rosa Portogallo marble", price: 10500 },
  { id: "terrazzo", label: "Venetian terrazzo", price: 6800 },
  { id: "slate", label: "Charcoal slate tiles", price: 5400 },
];

export const FLOOR_SWATCH: Record<string, string> = {
  oak: "repeating-linear-gradient(0deg,#c8935f 0 10px,#b98250 10px 11px)",
  walnut: "repeating-linear-gradient(0deg,#5b3a24 0 10px,#3f2818 10px 11px)",
  herringbone:
    "repeating-linear-gradient(45deg,#b98a57 0 8px,#a97a49 8px 16px),#b98a57",
  "white-oak":
    "repeating-linear-gradient(0deg,#e6d6bb 0 10px,#d8c4a5 10px 11px)",
  "grey-oak":
    "repeating-linear-gradient(0deg,#a8a198 0 10px,#8f887e 10px 11px)",
  teak: "repeating-linear-gradient(0deg,#a86b35 0 10px,#8f5729 10px 11px)",
  "herringbone-white":
    "repeating-linear-gradient(45deg,#e8dcc6 0 8px,#d9caae 8px 16px),#e8dcc6",
  "green-marble": "linear-gradient(135deg,#1f4d3a 40%,#e1f0e6 45%,#1f4d3a 50%)",
  "rose-marble": "linear-gradient(135deg,#e8c8c0 40%,#a8786f 45%,#e8c8c0 50%)",
  terrazzo:
    "radial-gradient(circle at 20% 30%,#c97b63 2px,transparent 3px),radial-gradient(circle at 70% 60%,#7a8b99 2px,transparent 3px),radial-gradient(circle at 45% 80%,#d9b44a 2px,transparent 3px),#ece6dc",
  slate: "linear-gradient(90deg,#3b3f45 49%,#2c2f34 50%,#3b3f45 51%)",
  travertine: "repeating-linear-gradient(0deg,#dfcfb3 0 6px,#d3c09f 6px 8px)",
  "white-marble": "linear-gradient(135deg,#f5f3ef 40%,#c9c9cf 45%,#f5f3ef 50%)",
  "black-marble": "linear-gradient(135deg,#17171a 40%,#d9d9d9 44%,#17171a 48%)",
};
export const WALL_PAINTS: Array<{ id: string; label: string; color: string; price: number }> = [
  { id: "classic-cream", label: "Classic Cream", color: "#f4eedc", price: 3000 },
  { id: "dubai-sky", label: "Lagos Sky", color: "#90c1e7", price: 3000 },
  { id: "mint-fresh", label: "Mint Fresh", color: "#9bd7ba", price: 3000 },
  { id: "peach-glow", label: "Peach Glow", color: "#f7ba97", price: 3000 },
  { id: "soft-lilac", label: "Soft Lilac", color: "#c4b2e6", price: 3000 },
  { id: "desert-green", label: "Naija Green", color: "#43a66b", price: 4000 },
  { id: "charcoal-deep", label: "Lekki Charcoal", color: "#474f59", price: 5000 },
  { id: "royal-ochre", label: "Owambe Gold", color: "#d49b28", price: 6000 },
  { id: "ivory", label: "Warm ivory", color: "#f4efe6", price: 0 },
  { id: "greige", label: "Desert greige", color: "#d8cfc2", price: 900 },
  { id: "sage", label: "Sage green", color: "#b7c4ad", price: 900 },
  { id: "blush", label: "Rose blush", color: "#e9cfc8", price: 900 },
  { id: "navy", label: "Midnight navy", color: "#25324a", price: 1200 },
  { id: "charcoal", label: "Charcoal", color: "#33363b", price: 1200 },
  { id: "emerald", label: "Emerald", color: "#1f4d40", price: 1200 },
  { id: "terracotta", label: "Terracotta", color: "#b5654a", price: 1200 },
  { id: "chalk", label: "Chalk white", color: "#faf8f3", price: 600 },
  { id: "sand", label: "Desert sand", color: "#e6d3b3", price: 900 },
  { id: "dove", label: "Dove grey", color: "#c9c6c1", price: 900 },
  { id: "lilac", label: "Soft lilac", color: "#d9cfe3", price: 900 },
  { id: "sky", label: "Sky blue", color: "#c7dbea", price: 900 },
  { id: "mint", label: "Fresh mint", color: "#cfe5d6", price: 900 },
  { id: "butter", label: "Butter yellow", color: "#f3e3a8", price: 900 },
  { id: "peach", label: "Peach", color: "#f1c9b0", price: 900 },
  { id: "teal", label: "Deep teal", color: "#1f5560", price: 1200 },
  { id: "plum", label: "Plum", color: "#4e2a45", price: 1200 },
  { id: "olive", label: "Olive", color: "#6b6b3f", price: 1200 },
  { id: "burgundy", label: "Burgundy", color: "#6a1f2b", price: 1200 },
  { id: "ochre", label: "Ochre", color: "#c08a2e", price: 1200 },
  { id: "forest", label: "Forest green", color: "#2f4a35", price: 1200 },
  { id: "graphite", label: "Graphite", color: "#4a4d52", price: 1200 },
  { id: "black", label: "Soft black", color: "#1f2023", price: 1400 },
];
/** How a home is finished: floor, wall colour, and whether the walls are panelled with mouldings. */
export interface HomeStyle { floor: FloorFinish; wall: string; panels: boolean; /** Pieces outside the house (pool, garage, garden…: src/data/home/exterior.json). */ exterior?: string[]; /** Bed sheets: the colour of the duvet on every bed (pillows a paler shade). */ bedding?: string; /** The ceiling's design (src/data/home/ceilings.json finishes; absent means "flat"). */ ceiling?: CeilingFinish; /** The ceiling's paint colour (absent means ceiling white). */ ceilingColor?: string }

/** Ceiling designs and paints (the roof seen from inside): src/data/home/ceilings.json. */
export type CeilingFinish = "flat" | "tray" | "coffered" | "beams" | "arabesque" | "stars";
export const CEILING_FINISHES = CEILING_DATA.finishes as Array<{ id: CeilingFinish; label: string; icon: string; desc: string; price: number }>;
export const CEILING_PAINTS = CEILING_DATA.paints as Array<{ id: string; label: string; color: string; price: number }>;
export const DEFAULT_CEILING_COLOR = CEILING_PAINTS[0].color;

/** Bed sheets to choose from. */
export const BEDDING: Array<{ id: string; label: string; color: string; price: number }> = [
  { id: "plum", label: "Plum satin (as it came)", color: "#6b2f4f", price: 0 },
  { id: "white", label: "Hotel white cotton", color: "#f1f5f9", price: 350 },
  { id: "navy", label: "Navy linen", color: "#1e3a5f", price: 350 },
  { id: "sage", label: "Sage green linen", color: "#8aa38b", price: 350 },
  { id: "blush", label: "Blush pink", color: "#e8b4b8", price: 350 },
  { id: "gold", label: "Gold silk", color: "#c9a227", price: 600 },
  { id: "charcoal", label: "Charcoal jersey", color: "#374151", price: 350 },
  { id: "terracotta", label: "Terracotta", color: "#b5654a", price: 350 },
];

/** What can be added outside a house, and which homes have a plot for it. */
export const EXTERIOR = EXTERIOR_DATA as { tiers: string[]; items: Array<{ id: string; name: string; icon: string; price: number; desc: string }> };
export const hasPlot = (tier: HousingTier) => EXTERIOR.tiers.includes(tier);
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
  // A hotel event hall (src/data/venues/halls.json): one open room, no kitchen or bathroom, for parties.
  ballroom: {
    id: "ballroom",
    finish: { floor: "white-marble", wall: "#f5efe3", panels: true, ceiling: "coffered", ceilingColor: "#f4efe6" },
    luxury: true,
    label: "Event hall",
    area: "Hotel ballroom",
    monthly: 0,
    icon: "🎊",
    wallColor: "#f5efe3",
    skirtingColor: "#c9a24a",
    activities: [
      { id: "hall_dance", label: "Dance", icon: "💃", desc: "Hit the dance floor with the guests.", animation: "wave", need: { kind: "fun", amount: 25 } },
      { id: "hall_mingle", label: "Mingle", icon: "🥂", desc: "Say hello round the tables.", animation: "talk", need: { kind: "social", amount: 25 } },
    ],
  },
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
  // The hall as it comes: tables round a dance floor under chandeliers (all movable). On the 20-cell grid.
  ballroom: [
    { id: "hall_dance_floor", visual: "dance-floor", size: [8, 8], placement: { kind: "floor", col: 6, row: 6, rot: 0, g: GRID } },
    { id: "hall_table_1", visual: "banquet-table", size: [6, 6], placement: { kind: "floor", col: 0, row: 0, rot: 0, g: GRID }, interaction: "chair" },
    { id: "hall_table_2", visual: "banquet-table", size: [6, 6], placement: { kind: "floor", col: 14, row: 0, rot: 0, g: GRID }, interaction: "chair" },
    { id: "hall_table_3", visual: "banquet-table", size: [6, 6], placement: { kind: "floor", col: 0, row: 14, rot: 0, g: GRID }, interaction: "chair" },
    { id: "hall_table_4", visual: "banquet-table", size: [6, 6], placement: { kind: "floor", col: 14, row: 14, rot: 0, g: GRID }, interaction: "chair" },
    { id: "hall_chandelier_1", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 9, row: 4, rot: 0, g: GRID } },
    { id: "hall_chandelier_2", visual: "chandelier-crystal", size: [2, 2], placement: { kind: "floor", col: 9, row: 14, rot: 0, g: GRID } },
  ],
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
  hall_dance_floor: ["Lit Dance Floor", "🪩"], hall_table_1: ["Banquet Table for Eight", "🍽️"], hall_table_2: ["Banquet Table for Eight", "🍽️"], hall_table_3: ["Banquet Table for Eight", "🍽️"], hall_table_4: ["Banquet Table for Eight", "🍽️"], hall_chandelier_1: ["Crystal Chandelier", "💎"], hall_chandelier_2: ["Crystal Chandelier", "💎"],
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

// Standard Dubai floor plans (src/data/home/floorplans.json), drawn for the 10 m home: these replace the
// older layouts' rooms, walls and furniture wherever a plan exists.
type PlanFurniture = { id: string; name: string; icon: string; size: number[]; col: number; row: number; rot: number; model?: string; visual?: string; interaction?: string; level?: number; fixed?: boolean };
type Plan = { rooms?: RoomZone[]; walls?: LevelDef["walls"]; levels?: LevelDef[]; furniture: PlanFurniture[] };
const PLANS = FLOORPLANS as unknown as Record<string, Plan>;
const planIdOf = (tier: string, id: string) => `fp_${tier}_${id}`;

export const HOUSING_CONFIGS = Object.fromEntries(Object.entries(RAW_HOUSING_CONFIGS).map(([id, c]) => [id, PLANS[id] ? {
  ...c,
  rooms: PLANS[id].rooms,
  walls: PLANS[id].walls,
  blocks: undefined,
  levels: PLANS[id].levels,
} : {
  ...c,
  rooms: c.rooms && spreadRooms(c.rooms),
  walls: c.walls && spreadWalls(c.walls, false),
  blocks: c.blocks?.map((b) => ({ minX: b.minX * k, maxX: b.maxX * k, minZ: b.minZ * k, maxZ: b.maxZ * k })),
  levels: c.levels?.map((l) => ({ ...l, rooms: spreadRooms(l.rooms), walls: spreadWalls(l.walls, true) })),
}])) as Record<HousingTier, HousingConfig>;

const spreadBuiltIn = (b: BuiltIn): BuiltIn => ({ ...b, placement: migratePlacement(b.placement as Placement, b.size) as BuiltIn["placement"] });
export const BUILT_INS: BuiltIn[] = RAW_BUILT_INS.map(spreadBuiltIn);
export const BUILT_INS_BY_TIER = Object.fromEntries(Object.entries(RAW_BUILT_INS_BY_TIER).map(([id, list]) => [id, PLANS[id]
  ? PLANS[id].furniture.map((p): BuiltIn => ({
      id: planIdOf(id, p.id), model: p.model, visual: p.visual, size: p.size as [number, number],
      placement: { kind: "floor", col: p.col, row: p.row, rot: p.rot as Rotation, ...(p.level ? { level: p.level } : {}), g: GRID },
      interaction: p.interaction as Interaction | undefined, fixed: p.fixed,
    }))
  : list.map(spreadBuiltIn)])) as Record<HousingTier, BuiltIn[]>;
const PLAN_NAMES: Record<string, [string, string]> = Object.fromEntries(Object.entries(PLANS).flatMap(([tier, p]) => p.furniture?.map((f) => [planIdOf(tier, f.id), [f.name, f.icon]]) ?? []));

/** All potential built-ins across tiers as catalog items */
const ALL_BUILT_IN_LIST = [
  ...BUILT_INS,
  ...Object.values(RAW_BUILT_INS_BY_TIER).flat().map(spreadBuiltIn),
  ...Object.values(BUILT_INS_BY_TIER).flat(),
];
const DEDUPED_BUILT_INS = Array.from(new Map(ALL_BUILT_IN_LIST.map((b) => [b.id, b])).values());

/** The built-ins as furniture items (so they can be moved, rotated and stored). */
export const HOME_ITEMS: CatalogItem[] = DEDUPED_BUILT_INS.map((b) => ({
  id: `home-${b.id}`,
  name: PLAN_NAMES[b.id]?.[0] ?? HOME_NAMES[b.id]?.[0] ?? b.id,
  icon: PLAN_NAMES[b.id]?.[1] ?? HOME_NAMES[b.id]?.[1] ?? "📦",
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
export const DOOR = { wall: "west" as Wall, offset: 9, width: 2, height: 4.4 };
export const WINDOW = { wall: "north" as Wall, offset: 11, width: 6 };

/** Cells kept clear: in front of the door, and where the citizen stands. */
const RESERVED_CELLS: Array<[number, number]> = [
  [0, 9], [0, 10], [1, 9], [1, 10],
  [3, 9], [3, 10],
];

// Just inside the front door, in the entrance hall.
export const AVATAR_SPOT = { x: -ROOM_SIZE / 2 + 3.5 * CELL, z: 0 };

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
  // Sub-grid quarter-step (12.5 cm) allows fine wall positioning without big jumps
  const offset = Math.round(((along + half) / CELL - width / 2) * 4) / 4;
  return Math.max(0, Math.min(GRID - width, offset));
}

/** Converts a hit point on the floor into the placement of an item centred there, aligning to fine grid and snapping to nearby items. */
export function floorPlacementAt(
  size: [number, number],
  rot: Rotation,
  point: { x: number; z: number },
  level = 0,
  others?: OwnedFurniture[],
  ignoreUid?: string
): FloorPlacement {
  const [w, d] = rotatedSize(size, rot);
  const rawCol = (point.x + ROOM_SIZE / 2) / CELL - w / 2;
  const rawRow = (point.z + ROOM_SIZE / 2) / CELL - d / 2;

  // Fine sub-grid resolution (0.25 CELL = 12.5 cm) enables small, delicate movements without giant leaps
  const GRID_STEP = 0.25;
  let col = Math.round(rawCol / GRID_STEP) * GRID_STEP;
  let row = Math.round(rawRow / GRID_STEP) * GRID_STEP;

  // Magnetic snapping to neighboring furniture items
  if (others && others.length > 0) {
    const SNAP_DIST = 0.45; // snap threshold in cells (~22.5 cm)
    let bestDistX = SNAP_DIST;
    let snappedCol = col;
    let bestDistZ = SNAP_DIST;
    let snappedRow = row;

    for (const o of others) {
      if (o.uid === ignoreUid || !o.placement || o.placement.kind !== "floor" || levelOf(o.placement) !== level) continue;
      const otherItem = getCatalogItem(o.itemId);
      if (!otherItem) continue;
      const [ow, od] = rotatedSize(otherItem.size, o.placement.rot);
      const ocol = o.placement.col;
      const orow = o.placement.row;

      // Only snap if within nearby range along the orthogonal axis
      const overlapZ = spansOverlap(rawRow - 0.4, d + 0.8, orow, od);
      const overlapX = spansOverlap(rawCol - 0.4, w + 0.8, ocol, ow);

      if (overlapZ) {
        // Snap targets along X axis:
        // 1. Flush left (directly to the left of other piece)
        // 2. Flush right (directly to the right of other piece)
        // 3. Aligned left edges
        // 4. Aligned right edges
        // 5. Aligned centers
        const xTargets = [
          ocol - w,
          ocol + ow,
          ocol,
          ocol + ow - w,
          ocol + (ow - w) / 2,
        ];

        for (const target of xTargets) {
          const dist = Math.abs(rawCol - target);
          if (dist < bestDistX) {
            bestDistX = dist;
            snappedCol = target;
          }
        }
      }

      if (overlapX) {
        // Snap targets along Z axis:
        // 1. Flush front
        // 2. Flush back
        // 3. Aligned front edges
        // 4. Aligned back edges
        // 5. Aligned centers
        const zTargets = [
          orow - d,
          orow + od,
          orow,
          orow + od - d,
          orow + (od - d) / 2,
        ];

        for (const target of zTargets) {
          const dist = Math.abs(rawRow - target);
          if (dist < bestDistZ) {
            bestDistZ = dist;
            snappedRow = target;
          }
        }
      }
    }

    col = snappedCol;
    row = snappedRow;
  }

  // Clamp within bounds and round to 2 decimal places
  const finalCol = Math.round(Math.max(0, Math.min(GRID - w, col)) * 100) / 100;
  const finalRow = Math.round(Math.max(0, Math.min(GRID - d, row)) * 100) / 100;

  return {
    kind: "floor",
    rot,
    col: finalCol,
    row: finalRow,
    ...(level ? { level } : {}),
    g: GRID,
  };
}

/** Rugs lie under things, ceiling lights hang over them, everything else is solid: each only clashes with its own layer. */
const layerOf = (kind: CatalogItem["kind"]) => (kind === "rug" ? "rug" : kind === "ceiling" ? "ceiling" : "solid");

function floorCells(size: [number, number], p: FloorPlacement): string[] {
  const [w, d] = rotatedSize(size, p.rot);
  const cells: string[] = [];
  for (let c = Math.floor(p.col); c < Math.ceil(p.col + w); c++) {
    for (let r = Math.floor(p.row); r < Math.ceil(p.row + d); r++) {
      cells.push(`${c},${r}`);
    }
  }
  return cells;
}

function spansOverlap(a: number, aw: number, b: number, bw: number) {
  return a < b + bw && b < a + aw;
}

/** Whether `item` can go at `placement` given everything else already in the room. */
/**
 * Whether a piece can go there. By hand (`loose`), pieces may overlap and stand close (a chair on a rug, a lamp by
 * the sofa; the layer decides which shows on top): only the room's bounds, the doorway and the window count. Placing
 * automatically keeps everything apart.
 */
export function isPlacementValid(item: CatalogItem, placement: Placement, others: OwnedFurniture[], ignoreUid?: string, loose = false): boolean {
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
    if (loose) return true;
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
  if (loose) return true;
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
