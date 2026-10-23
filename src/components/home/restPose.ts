// Where the citizen sits or lies on a piece of furniture, wherever it has been moved or turned to.
// Seat spots are measured from each model as fitted into its footprint (front = +z before turning).

import { CELL, floorCenter, type CatalogItem, type Interaction, type Placement } from "@/lib/furniture";

export type RestPose = {
  /** Feet point (sitting) or foot end (lying), in room coordinates. */
  position: [number, number, number];
  yaw: number;
  /** Lying on the back, head towards the headboard. */
  lie?: boolean;
  /** Where the citizen stands before sitting down and after getting up. */
  stand: [number, number];
};

// The sit clip lowers the hips to about this height above the feet, slightly behind them.
const CLIP_SEAT_HEIGHT = 0.46;
const CLIP_SEAT_BACK = 0.12;
// How far the back of a lying body is below its feet line once laid flat.
const LYING_BACK = 0.11;

type Seat = { x: number; z: number; h: number; face: 1 | -1 };
type Bed = { along: "z" | "x"; h: number; across: number };

/** Seats by model, in the model's own fitted frame (face 1 = looks towards +z). */
const SEATS: Record<string, Seat> = {
  "/models/furniture/chair.glb": { x: 0, z: 0.08, h: 0.34, face: 1 },
  "/models/furniture/couch.glb": { x: -0.4, z: 0.12, h: 0.4, face: 1 },
  "/models/furniture/l-couch.glb": { x: -0.45, z: -0.22, h: 0.33, face: 1 },
  "/models/furniture/lounge-chair.glb": { x: 0, z: -0.12, h: 0.44, face: -1 },
  "/models/furniture/desk-chair.glb": { x: 0, z: -0.02, h: 0.33, face: -1 },
  // Tapping a desk sits the citizen at it, in the chair that stands in front of it.
  "/models/furniture/desk.glb": { x: 0, z: 0.75, h: 0.33, face: -1 },
};
/** Beds by model: which way the body lies (head at the negative end) and the mattress height. */
const BEDS: Record<string, Bed> = {
  "/models/furniture/bed.glb": { along: "z", h: 0.42, across: 0 },
  "/models/furniture/couch.glb": { along: "x", h: 0.4, across: 0.12 },
};

function toRoom(item: CatalogItem, placement: Placement & { kind: "floor" }, x: number, z: number): [number, number] {
  const c = floorCenter(item.size, placement);
  const turn = -placement.rot * (Math.PI / 2);
  const cos = Math.cos(turn), sin = Math.sin(turn);
  return [c.x + x * cos + z * sin, c.z - x * sin + z * cos];
}

/** The sit or lie pose for a chair- or bed-type item, or undefined when it has none. */
export function restPose(item: CatalogItem, placement: Placement | null | undefined, kind: Interaction, height = 1.75): RestPose | undefined {
  if (!placement || placement.kind !== "floor" || !item.model) return undefined;
  const turn = -placement.rot * (Math.PI / 2);

  if (kind === "bed") {
    const bed = BEDS[item.model] ?? { along: "z", h: 0.42, across: 0 };
    const half = ((bed.along === "z" ? item.size[1] : item.size[0]) * CELL * 0.94) / 2;
    const head = -half + 0.1;                              // top of the head, just short of the headboard
    const feet = Math.min(half - 0.05, head + height);
    const side = ((bed.along === "z" ? item.size[0] : item.size[1]) * CELL * 0.94) / 2 + 0.35;
    const [fx, fz] = bed.along === "z" ? toRoom(item, placement, 0, feet) : toRoom(item, placement, feet, bed.across);
    const stand = bed.along === "z" ? toRoom(item, placement, side, 0) : toRoom(item, placement, 0, side);
    // Laid flat, the body's head points along its -z, so the yaw turns that towards the headboard end.
    const yaw = turn + (bed.along === "z" ? 0 : Math.PI / 2);
    return { position: [fx, bed.h + LYING_BACK, fz], yaw, lie: true, stand };
  }

  if (kind === "chair") {
    const seat = SEATS[item.model] ?? { x: 0, z: 0, h: 0.42, face: 1 };
    const [sx, sz] = toRoom(item, placement, seat.x, seat.z + seat.face * CLIP_SEAT_BACK);
    const depth = (item.size[1] * CELL) / 2;
    const stand = toRoom(item, placement, seat.x, seat.face * (depth + 0.35));
    const yaw = turn + (seat.face === 1 ? 0 : Math.PI);
    return { position: [sx, seat.h - CLIP_SEAT_HEIGHT, sz], yaw, stand };
  }
  return undefined;
}
