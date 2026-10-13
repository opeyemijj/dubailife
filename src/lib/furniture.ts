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
}

export const CATALOG: CatalogItem[] = [
  { id: "sofa", name: "Modern Velvet Sofa", desc: "Super comfortable for guests.", icon: "🛋️", price: 3500, kind: "floor", size: [4, 2], model: "/models/furniture/couch.glb" },
  { id: "l-sofa", name: "L-Shaped Lounge Sofa", desc: "Room for the whole crew.", icon: "🛋️", price: 6800, kind: "floor", size: [4, 4], model: "/models/furniture/l-couch.glb" },
  { id: "lounge-chair", name: "Designer Lounge Chair", desc: "Mid-century comfort.", icon: "💺", price: 1800, kind: "floor", size: [2, 2], model: "/models/furniture/lounge-chair.glb" },
  { id: "tv", name: "65-Inch Smart 4K TV", desc: "Watch live Dubai City broadcasts.", icon: "📺", price: 4200, kind: "floor", size: [3, 1], model: "/models/furniture/tv.glb" },
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

export const getCatalogItem = (id: string) => CATALOG.find((c) => c.id === id);

export type Interaction = "cooler" | "bed" | "chair" | "door";

/** Furniture that comes with every apartment. It can't be moved, but blocks placement. */
export interface BuiltIn {
  id: string;
  model: string;
  size: [number, number];
  placement: FloorPlacement;
  interaction?: Interaction;
  yaw?: number;
}

export const BUILT_INS: BuiltIn[] = [
  { id: "bed", model: "/models/furniture/bed.glb", size: [4, 5], placement: { kind: "floor", col: 2, row: 0, rot: 0 }, interaction: "bed" },
  { id: "bedside", model: "/models/furniture/side-table.glb", size: [1, 1], placement: { kind: "floor", col: 6, row: 0, rot: 0 } },
  { id: "fridge", model: "/models/furniture/fridge.glb", size: [2, 2], placement: { kind: "floor", col: 12, row: 0, rot: 0 }, interaction: "cooler" },
  { id: "chair", model: "/models/furniture/chair.glb", size: [2, 2], placement: { kind: "floor", col: 9, row: 5, rot: 2 }, interaction: "chair" },
];

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
    for (const b of BUILT_INS) if (floorCells(b.size, b.placement).some((k) => mine.has(k))) return false;
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
