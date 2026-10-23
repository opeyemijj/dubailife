// Furniture catalog and the apartment's placement grid.
// The room is a square of GRID x GRID cells; floor items occupy a w x d block of cells,
// wall items occupy a run of cells along one wall.

export const ROOM_SIZE = 7; // metres
export const CELL = 0.5; // metres per grid cell
export const GRID = ROOM_SIZE / CELL; // 14
export const WALL_HEIGHT = 3;

export type Wall = "north" | "south" | "east" | "west";
export type Rotation = 0 | 1 | 2 | 3; // quarter turns

export interface FloorPlacement {
  kind: "floor";
  col: number; // min x cell of the footprint
  row: number; // min z cell of the footprint
  rot: Rotation;
}

export interface WallPlacement {
  kind: "wall";
  wall: Wall;
  offset: number; // first cell along the wall
}

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
  /** "rug" items lie flat and may sit under other furniture. */
  kind: "floor" | "rug" | "wall";
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
}

export const CATALOG: CatalogItem[] = [
  { id: "sofa", name: "Modern Velvet Sofa", desc: "Super comfortable for guests.", icon: "🛋️", price: 3500, kind: "floor", size: [4, 2], model: "/models/furniture/couch.glb" },
  { id: "l-sofa", name: "L-Shaped Lounge Sofa", desc: "Room for the whole crew.", icon: "🛋️", price: 6800, kind: "floor", size: [4, 4], model: "/models/furniture/l-couch.glb" },
  { id: "lounge-chair", name: "Designer Lounge Chair", desc: "Mid-century comfort.", icon: "💺", price: 1800, kind: "floor", size: [2, 2], model: "/models/furniture/lounge-chair.glb" },
  { id: "tv", name: '65" Flat Screen TV with Table Stand', desc: "Ultra-thin 65-inch 4K OLED flat screen TV on a modern media table stand.", icon: "📺", price: 4200, kind: "floor", size: [4, 1] },
  { id: "coffee-table", name: "Glass Coffee Table", desc: "Tempered glass, brushed legs.", icon: "☕", price: 1600, kind: "floor", size: [3, 2], model: "/models/furniture/coffee-table.glb" },
  { id: "bookcase", name: "Oak Bookcase", desc: "For your growing library.", icon: "📚", price: 2100, kind: "floor", size: [2, 1], model: "/models/furniture/bookcase.glb" },
  { id: "desk", name: "Work Desk", desc: "Run your empire from home.", icon: "🖥️", price: 1900, kind: "floor", size: [3, 2], model: "/models/furniture/desk.glb" },
  { id: "desk-chair", name: "Office Chair", desc: "Ergonomic and swivelling.", icon: "🪑", price: 1100, kind: "floor", size: [1, 1], model: "/models/furniture/desk-chair.glb" },
  { id: "side-table", name: "Side Table", desc: "Perfect next to a sofa.", icon: "🟫", price: 600, kind: "floor", size: [1, 1], model: "/models/furniture/side-table.glb" },
  { id: "floor-lamp", name: "Arc Floor Lamp", desc: "Warm evening glow.", icon: "💡", price: 900, kind: "floor", size: [1, 1], model: "/models/furniture/floor-lamp.glb" },
  { id: "plant", name: "Fiddle Leaf Plant", desc: "Brings the room to life.", icon: "🪴", price: 450, kind: "floor", size: [1, 1], model: "/models/furniture/houseplant.glb" },
  { id: "carpet", name: "Silk Persian Carpet", desc: "Luxurious handcrafted weave.", icon: "🧶", price: 2800, kind: "rug", size: [6, 4], model: "/models/furniture/rug.glb" },
  { id: "round-rug", name: "Round Majlis Rug", desc: "Soft and round.", icon: "⭕", price: 1200, kind: "rug", size: [4, 4], model: "/models/furniture/round-rug.glb" },
  { id: "artwork", name: "Burj Khalifa Sunset Painting", desc: "Original high-rise acrylic artwork.", icon: "🖼️", price: 1500, kind: "wall", size: [3, 2] },
];

export const getCatalogItem = (id: string) => CATALOG.find((c) => c.id === id) ?? HOME_ITEMS.find((c) => c.id === id);

export type Interaction = "cooler" | "bed" | "chair" | "door";

/** Furniture that comes with every apartment, in its starting place. It can be moved like anything else. */
export interface BuiltIn {
  id: string;
  model: string;
  size: [number, number];
  placement: FloorPlacement;
  interaction?: Interaction;
  yaw?: number;
}

export type HousingTier = "bed_space" | "studio" | "one_bedroom" | "two_bedroom" | "three_bedroom" | "penthouse" | "villa";

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
}

export const HOUSING_CONFIGS: Record<HousingTier, HousingConfig> = {
  bed_space: {
    id: "bed_space",
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
  penthouse: {
    id: "penthouse",
    label: "Downtown Luxury Penthouse",
    area: "Downtown Dubai",
    monthly: 18000,
    icon: "🏙️",
    wallColor: "#1a1e24",
    skirtingColor: "#d4af37",
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
    activities: [
      { id: "private_beach_swim", label: "Private Beach Swim", icon: "🏖️", desc: "Swim in the calm waters of your private Palm beach.", animation: "wave", need: { kind: "energy", amount: 60 } },
      { id: "majlis_gahwa", label: "Majlis Gahwa & Dates", icon: "🫖", desc: "Serve cardamom Arabic coffee and dates to distinguished guests.", animation: "talk", need: { kind: "social", amount: 55 } },
      { id: "supercar_garage", label: "Inspect Supercar Fleet", icon: "🏎️", desc: "Check out your dream garage before taking a highway cruise.", animation: "sit", need: { kind: "fun", amount: 50 } },
    ],
  },
};

export const BUILT_INS: BuiltIn[] = [
  { id: "bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 2, row: 0, rot: 0 }, interaction: "bed" },
  { id: "bedside", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  { id: "fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
  { id: "chair", model: "/models/furniture/chair.glb", size: [2, 2], placement: { kind: "floor", col: 9, row: 5, rot: 2 }, interaction: "chair" },
];

export const BUILT_INS_BY_TIER: Record<HousingTier, BuiltIn[]> = {
  bed_space: [
    { id: "bunk_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "locker", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "mini_kettle", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 11, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "stool", model: "/models/furniture/chair.glb", size: [2, 2], placement: { kind: "floor", col: 8, row: 4, rot: 2 }, interaction: "chair" },
  ],
  studio: BUILT_INS,
  one_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "lounge_sofa", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 7, row: 6, rot: 2 }, interaction: "chair" },
    { id: "tv_table", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 7, row: 10, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
  ],
  two_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "study_desk", model: "/models/furniture/desk.glb", size: [3, 2], placement: { kind: "floor", col: 9, row: 0, rot: 0 }, interaction: "chair" },
    { id: "study_chair", model: "/models/furniture/desk-chair.glb", size: [1, 1], placement: { kind: "floor", col: 10, row: 2, rot: 2 }, interaction: "chair" },
    { id: "bookcase", model: "/models/furniture/bookcase.glb", size: [2, 1], placement: { kind: "floor", col: 12, row: 0, rot: 0 } },
    { id: "guest_bed", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 8, row: 4, rot: 0 }, interaction: "bed" },
    { id: "living_couch", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "living_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "living_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 7, rot: 0 }, interaction: "cooler" },
    { id: "balcony_chair", model: "/models/furniture/lounge-chair.glb", size: [2, 2], placement: { kind: "floor", col: 6, row: 12, rot: 0 }, interaction: "chair" },
  ],
  three_bedroom: [
    { id: "master_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "nightstand", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 5, row: 0, rot: 0 } },
    { id: "bed2_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 9, row: 0, rot: 0 }, interaction: "bed" },
    { id: "study_desk", model: "/models/furniture/desk.glb", size: [3, 2], placement: { kind: "floor", col: 9, row: 6, rot: 0 }, interaction: "chair" },
    { id: "study_chair", model: "/models/furniture/desk-chair.glb", size: [1, 1], placement: { kind: "floor", col: 10, row: 8, rot: 2 }, interaction: "chair" },
    { id: "bookcase", model: "/models/furniture/bookcase.glb", size: [2, 1], placement: { kind: "floor", col: 12, row: 6, rot: 0 } },
    { id: "living_couch", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 1, row: 7, rot: 2 }, interaction: "chair" },
    { id: "living_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 1, row: 9, rot: 0 } },
    { id: "living_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 1, row: 12, rot: 0 } },
    { id: "kitchen_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 7, row: 12, rot: 0 }, interaction: "cooler" },
    { id: "balcony_chair", model: "/models/furniture/lounge-chair.glb", size: [2, 2], placement: { kind: "floor", col: 4, row: 13, rot: 0 }, interaction: "chair" },
  ],
  penthouse: [
    { id: "pent_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "pent_sofa", model: "/models/furniture/l-couch.glb", size: [4, 4], placement: { kind: "floor", col: 7, row: 5, rot: 2 }, interaction: "chair" },
    { id: "pent_tv", model: "/models/furniture/tv.glb", size: [4, 1], placement: { kind: "floor", col: 7, row: 11, rot: 0 } },
    { id: "pent_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "pent_lamp", model: "/models/furniture/floor-lamp.glb", size: [1, 1], placement: { kind: "floor", col: 6, row: 5, rot: 0 } },
  ],
  villa: [
    { id: "villa_bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 1, row: 0, rot: 0 }, interaction: "bed" },
    { id: "villa_couch", model: "/models/furniture/couch.glb", size: [4, 2], placement: { kind: "floor", col: 7, row: 6, rot: 2 }, interaction: "chair" },
    { id: "villa_table", model: "/models/furniture/coffee-table.glb", size: [3, 2], placement: { kind: "floor", col: 7, row: 9, rot: 0 } },
    { id: "villa_fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
    { id: "villa_plant", model: "/models/furniture/houseplant.glb", size: [1, 1], placement: { kind: "floor", col: 12, row: 4, rot: 0 } },
  ],
};

const HOME_NAMES: Record<string, [string, string]> = {
  bed: ["Bed", "🛏️"], bedside: ["Bedside table", "🟫"], fridge: ["Fridge", "🧊"], chair: ["Armchair", "🪑"],
  bunk_bed: ["Bunk Bed", "🛏️"], locker: ["Suitcase Stand", "🧳"], mini_kettle: ["Kettle & Mini-Fridge", "☕"], stool: ["Stool", "🪑"],
  master_bed: ["Master Bed", "🛏️"], nightstand: ["Nightstand", "🟫"], lounge_sofa: ["Lounge Sofa", "🛋️"], tv_table: ["65\" 4K TV", "📺"], kitchen_fridge: ["Kitchen Fridge", "🧊"],
  study_desk: ["Executive Work Desk", "🖥️"], study_chair: ["Ergonomic Chair", "🪑"], bookcase: ["Oak Bookcase", "📚"], guest_bed: ["Guest Daybed", "🛏️"], bed2_bed: ["Guest Bedroom Bed", "🛏️"],
  living_couch: ["Sectional Sofa", "🛋️"], living_table: ["Glass Coffee Table", "☕"], living_tv: ["4K Smart TV", "📺"], balcony_chair: ["Balcony Lounge Chair", "💺"],
  pent_bed: ["King Suite Bed", "🛏️"], pent_sofa: ["L-Shaped Velvet Lounge", "🛋️"], pent_tv: ["OLED Entertainment Wall", "📺"], pent_fridge: ["Wet Bar Fridge", "🧊"], pent_lamp: ["Arc Designer Lamp", "💡"],
  villa_bed: ["Palatial Suite Bed", "🛏️"], villa_couch: ["Majlis Sofa", "🛋️"], villa_table: ["Glass Coffee Table", "☕"], villa_fridge: ["Gourmet Fridge", "🧊"], villa_plant: ["Fiddle Leaf Plant", "🪴"],
};

/** All potential built-ins across tiers as catalog items */
const ALL_BUILT_IN_LIST = [
  ...BUILT_INS,
  ...BUILT_INS_BY_TIER.bed_space,
  ...BUILT_INS_BY_TIER.one_bedroom,
  ...BUILT_INS_BY_TIER.two_bedroom,
  ...BUILT_INS_BY_TIER.three_bedroom,
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
  kind: "floor",
  size: b.size,
  model: b.model,
  yaw: b.yaw,
  builtIn: true,
  interaction: b.interaction,
}));

/** A home's furniture including the built-ins for that tier (in their starting place until they're moved). */
export function withHomeItems(furniture: OwnedFurniture[], tier: HousingTier = "studio"): OwnedFurniture[] {
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
export const WINDOW = { wall: "north" as Wall, offset: 8, width: 4 };

/** Cells kept clear: in front of the door, and where the citizen stands. */
const RESERVED_CELLS: Array<[number, number]> = [
  [0, 3], [0, 4], [1, 3], [1, 4],
  [7, 8], [7, 9], [8, 8], [8, 9],
];

export const AVATAR_SPOT = { x: -3.5 + 8 * CELL, z: -3.5 + 9 * CELL };

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

/** Converts a hit point on the floor into the placement of an item centred there. */
export function floorPlacementAt(size: [number, number], rot: Rotation, point: { x: number; z: number }): FloorPlacement {
  const [w, d] = rotatedSize(size, rot);
  const col = Math.round((point.x + ROOM_SIZE / 2) / CELL - w / 2);
  const row = Math.round((point.z + ROOM_SIZE / 2) / CELL - d / 2);
  return {
    kind: "floor",
    rot,
    col: Math.max(0, Math.min(GRID - w, col)),
    row: Math.max(0, Math.min(GRID - d, row)),
  };
}

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
  const placed = others.filter((o) => o.uid !== ignoreUid && o.placement);

  if (placement.kind === "wall") {
    if (item.kind !== "wall") return false;
    const w = item.size[0];
    if (placement.offset < 0 || placement.offset + w > GRID) return false;
    if (placement.wall === DOOR.wall && spansOverlap(placement.offset, w, DOOR.offset, DOOR.width)) return false;
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
  const isRug = item.kind === "rug";

  // Rugs only clash with rugs; everything else clashes with solid furniture and reserved cells.
  if (!isRug) {
    for (const [c, r] of RESERVED_CELLS) if (mine.has(`${c},${r}`)) return false;
  }
  return !placed.some((o) => {
    const p = o.placement!;
    const other = getCatalogItem(o.itemId);
    if (!other || p.kind !== "floor" || (other.kind === "rug") !== isRug) return false;
    return floorCells(other.size, p).some((k) => mine.has(k));
  });
}

/** First free spot for an item, scanning from the room centre outwards (optionally at a fixed rotation). */
export function findFreePlacement(item: CatalogItem, others: OwnedFurniture[], rot?: Rotation): Placement | null {
  if (item.kind === "wall") {
    for (const wall of ["north", "east", "south", "west"] as Wall[]) {
      for (let offset = 0; offset <= GRID - item.size[0]; offset++) {
        const p: WallPlacement = { kind: "wall", wall, offset };
        if (isPlacementValid(item, p, others)) return p;
      }
    }
    return null;
  }
  const candidates: FloorPlacement[] = [];
  for (const r of rot === undefined ? ([0, 1] as Rotation[]) : [rot]) {
    const [w, d] = rotatedSize(item.size, r);
    for (let col = 0; col <= GRID - w; col++) for (let row = 0; row <= GRID - d; row++) candidates.push({ kind: "floor", col, row, rot: r });
  }
  const dist = (p: FloorPlacement) => {
    const c = floorCenter(item.size, p);
    return Math.hypot(c.x, c.z - 1);
  };
  candidates.sort((a, b) => dist(a) - dist(b));
  return candidates.find((p) => isPlacementValid(item, p, others)) ?? null;
}
