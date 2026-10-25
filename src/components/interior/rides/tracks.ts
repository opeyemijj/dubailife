// Where each ride goes in a venue, in venue coordinates: where the citizen walks to first, the stairs
// they climb, the line they ride, and the water they come out in. Built from the same shapes the scenery
// draws (paths.ts), so riders stay in the slides and pools on screen.

import * as THREE from "three";
import type { Venue } from "@/lib/city/types";
import type { RideDef } from "@/lib/city/rides";
import type { StationDef } from "../layouts";
import { BEACH, BOWLING, CLUB, DINING, LOBBY, RINK, SHOPS, SPA, isKidsPool, isSkyPool, poolDeckPool, SLIDE_POINTS, SPLASH_POOLS, STAIRS, TWIN_LANE, WATERPARK, type P3 } from "./paths";

export interface Water { at: [number, number]; w: number; d: number }

export interface Track {
  /** Where the citizen walks to on the ground before the ride starts. */
  approach: [number, number];
  /** Walked up after the approach (stairs to the top of the slide tower). */
  climb?: THREE.Vector3[];
  /** The line ridden (slides, river) or the line swum/floated (pools). */
  path?: THREE.CatmullRomCurve3;
  /** The other lane of a twin race slide. */
  lane2?: THREE.CatmullRomCurve3;
  /** The middle of the slide tower: the ride camera stays on the far side from it. */
  centre?: [number, number];
  /** How far along the path riders get on (0..1): the first point clear of the temple on top of the tower. */
  startU?: number;
  /** Tube radius of the slide (riders lie or sit on its bottom). */
  radius?: number;
  /** The water they end up in, and where they climb out onto the ground. */
  water?: Water;
  exit: [number, number];
  /** Walked into the water from a beach rather than jumped in from a pool edge. */
  wade?: boolean;
  /** Where a jet ski, paddleboard or kite board waits at the water's edge. */
  start?: [number, number];
  /** Buoys to steer round, in order (jet ski slalom, paddleboard course). */
  gates?: Array<[number, number]>;
  /** Lying on a lounger: where the feet go (y included) and which way the head points (yaw). */
  lie?: { feet: P3; yaw: number };
  /** Volleyball: my side and the other side of the net; the sandcastle's spot. */
  spots?: { me: [number, number]; them?: [number, number]; centre?: [number, number] };
  /** A seat: where to sit (the sit clip's feet point) and which way to face; the table it's at. */
  seat?: { at: [number, number]; yaw: number; table: [number, number] };
  /** Where staff come from (the host's desk, the kitchen pass, behind the grill or the decks). */
  staffFrom?: [number, number];
}

/** Half the width of the temple on top of the tower (plus a margin). */
const TEMPLE_HALF = 0.95;
const curve = (pts: THREE.Vector3[], closed = false) => new THREE.CatmullRomCurve3(pts, closed, "centripetal");

/** The nearest point just outside a pool's edge (towards the venue's middle), for climbing out. */
function edgeExit(water: Water, from: [number, number], venueCentre: [number, number] = [0, 0]): [number, number] {
  const [cx, cz] = water.at;
  const dx = venueCentre[0] - cx, dz = venueCentre[1] - cz;
  // Climb out on the side facing the middle of the venue.
  if (Math.abs(dx) / water.w > Math.abs(dz) / water.d) return [cx + Math.sign(dx || 1) * (water.w / 2 + 0.55), THREE.MathUtils.clamp(from[1], cz - water.d / 2 + 0.3, cz + water.d / 2 - 0.3)];
  return [THREE.MathUtils.clamp(from[0], cx - water.w / 2 + 0.3, cx + water.w / 2 - 0.3), cz + Math.sign(dz || 1) * (water.d / 2 + 0.55)];
}

function waterparkTrack(ride: RideDef): Track | null {
  const [tx, tz] = WATERPARK.tower;
  const T = (p: P3): THREE.Vector3 => new THREE.Vector3(p[0] + tx, p[1], p[2] + tz);
  if (ride.track === "drop" || ride.track === "twistA" || ride.track === "twistB") {
    const pts = SLIDE_POINTS[ride.track];
    const pool = SPLASH_POOLS[ride.track];
    const water: Water = { at: [pool.at[0] + tx, pool.at[1] + tz], w: pool.w, d: pool.d };
    // The slide runs on into the middle of its splash pool.
    const line = [...pts.map(T), new THREE.Vector3(water.at[0], 0.05, water.at[1])];
    const foot = T(STAIRS.foot), top = T(STAIRS.top);
    const path = curve(line);
    // The slides start inside the little temple on top; riders get on where the tube comes out of it.
    let startU = 0;
    while (startU < 0.3) {
      const p = path.getPointAt(startU);
      if (Math.max(Math.abs(p.x - tx), Math.abs(p.z - tz)) > TEMPLE_HALF) break;
      startU += 0.01;
    }
    return {
      startU,
      approach: [foot.x, foot.z],
      climb: [foot, top, T([pts[0][0], pts[0][1], Math.max(pts[0][2], 0.6)])],
      path,
      lane2: ride.kind === "race" ? curve(line.map((p) => p.clone().add(new THREE.Vector3(TWIN_LANE, 0, 0)))) : undefined,
      radius: ride.kind === "raft" ? 0.62 : 0.34,
      centre: [tx, tz],
      water,
      exit: edgeExit(water, water.at, [tx, tz + 10]),
    };
  }
  if (ride.track === "river") {
    const { at, radius } = WATERPARK.river;
    const mid = radius - 0.45;
    // Round the island anticlockwise, starting (and ending) on the side nearest the river's station.
    const pts = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return new THREE.Vector3(at[0] + Math.cos(a) * mid, 0.03, at[1] - Math.sin(a) * mid);
    });
    return { approach: [at[0] + radius + 0.55, at[1]], path: curve(pts, true), exit: [at[0] + radius + 0.55, at[1]] };
  }
  if (ride.track === "waves") {
    const { at, w, d } = WATERPARK.wavePool;
    const water: Water = { at, w, d };
    return { approach: [at[0], at[1] + d / 2 + 0.5], water, exit: [at[0], at[1] + d / 2 + 0.5], path: curve([new THREE.Vector3(at[0], 0, at[1] + d / 2 + 0.3), new THREE.Vector3(at[0], 0, at[1] + d / 2 - 1.6)]) };
  }
  if (ride.track === "flowrider") {
    const { at, w, d } = WATERPARK.flowRider;
    return { approach: [at[0], at[1] + d / 2 + 0.9], water: { at, w, d }, exit: [at[0], at[1] + d / 2 + 0.9] };
  }
  return null;
}

function poolTrack(venue: Venue): Track {
  const { at, w, d } = poolDeckPool(isSkyPool(venue), isKidsPool(venue));
  const water: Water = { at, w, d };
  const z = at[1] + d / 4;
  // Laps run the length of the pool and back, a little in from the front edge.
  const lap = curve([new THREE.Vector3(at[0] - w / 2 + 0.7, 0, z), new THREE.Vector3(at[0] + w / 2 - 0.7, 0, z)]);
  return { approach: [at[0] - w / 2 + 0.9, at[1] + d / 2 + 0.55], path: lap, water, exit: [at[0] - w / 2 + 0.9, at[1] + d / 2 + 0.55] };
}

const COURSES: Record<string, Array<[number, number]>> = {
  // A slalom out to sea, round the far buoy and back in towards the beach.
  jetski: [[-8, -8], [-4, -14], [1, -20], [6, -26], [9.5, -19], [5, -13], [0, -8.5]],
  // Three buoys close in.
  paddle: [[-7.5, -7], [-4.5, -10], [-2, -6.8]],
};

function beachTrack(ride: RideDef, at?: StationDef): Track | null {
  const { shore, buoyZ, swimX, sportsX, castle, net, loungers } = BEACH;
  switch (ride.track) {
    case "sea":
      return {
        approach: [swimX, shore + 0.6], wade: true, exit: [swimX, shore + 0.6],
        path: curve([new THREE.Vector3(swimX, 0, shore - 0.9), new THREE.Vector3(swimX - 1.5, 0, buoyZ + 0.6)]),
      };
    case "lounger": {
      // The left lounger of the set tapped (or the first set), lying with the head on the backrest.
      const [x, z] = at?.kind === "booth" ? at.position : loungers[0];
      return { approach: [x - 1.15, z + 0.5], exit: [x - 1.15, z + 0.5], lie: { feet: [x - 0.5, 0.47, z + 0.85], yaw: at?.rotation ?? 0 } };
    }
    case "seacourse": {
      const start: [number, number] = [sportsX, shore - 0.7];
      return { approach: [sportsX, shore + 0.5], start, exit: [sportsX, shore + 0.5], gates: COURSES[ride.kind] ?? [] };
    }
    case "net":
      // The camera watches from behind the player, over the net (away from its middle).
      return { approach: [net[0], net[1] + 2.2], exit: [net[0] - 1.2, net[1] + 2.6], centre: [net[0], net[1]], spots: { me: [net[0], net[1] + 2.2], them: [net[0], net[1] - 2.2], centre: net } };
    case "sand":
      return { approach: [castle[0], castle[1] + 0.95], exit: [castle[0] + 0.9, castle[1] + 1.2], spots: { me: [castle[0], castle[1] + 0.95], centre: castle } };
  }
  return null;
}

function rinkTrack(): Track {
  const { ice, loop, gate } = RINK;
  // Anticlockwise round the oval, starting by the gate (where cos θ puts the skater level with it).
  const t0 = Math.PI - Math.acos(Math.min(1, Math.abs(gate[0] - ice.at[0]) / loop.rx));
  const pts = Array.from({ length: 36 }, (_, i) => {
    const a = t0 - (i / 36) * Math.PI * 2;
    return new THREE.Vector3(ice.at[0] + Math.cos(a) * loop.rx, 0, ice.at[1] + Math.sin(a) * loop.rz);
  });
  const outside: [number, number] = [gate[0], gate[1] + 0.8];
  return { approach: outside, exit: outside, path: curve(pts, true), spots: { me: [gate[0], gate[1] - 0.6], centre: ice.at }, centre: ice.at };
}

function bowlingTrack(ride: RideDef): Track | null {
  const { lanes, foulZ, headPinZ, stage } = BOWLING;
  if (ride.track === "lane") {
    const stand: [number, number] = [lanes[0], foulZ + 1.9];
    return { approach: stand, exit: [lanes[0] + 1.2, foulZ + 2.6], spots: { me: stand, centre: [lanes[0], headPinZ] } };
  }
  if (ride.track === "stage") {
    const front: [number, number] = [stage.at[0] - 0.6, stage.at[1] + stage.d / 2 + 0.7];
    return { approach: front, exit: front, spots: { me: [stage.at[0], stage.at[1] + 0.2], centre: stage.at } };
  }
  return null;
}

function clubTrack(ride: RideDef): Track | null {
  const { floor, dj } = CLUB;
  if (ride.track === "dancefloor") {
    const me: [number, number] = [floor.at[0] + 0.9, floor.at[1]];
    return { approach: [floor.at[0] + 0.9, floor.at[1] + floor.size / 2 + 0.4], exit: [floor.at[0] - 1.6, floor.at[1] + floor.size / 2 + 1.4], spots: { me, them: [floor.at[0] - 0.9, floor.at[1]], centre: floor.at } };
  }
  if (ride.track === "decks") {
    // Behind the booth, facing the floor.
    return { approach: [dj[0] + 1.6, dj[1] + 0.9], exit: [dj[0] + 2.3, dj[1] + 1.6], spots: { me: [dj[0], dj[1] - 0.65], centre: floor.at } };
  }
  return null;
}

function diningTrack(ride: RideDef): Track | null {
  if (ride.track === "table") {
    // The middle table; the chair on its far side, facing the table.
    const [tx, tz] = DINING.tables[1];
    const r = DINING.tableTurn;
    const at: [number, number] = [tx + Math.sin(r) * 0.86, tz + Math.cos(r) * 0.86];
    return {
      approach: [DINING.reception[0] - 1.2, DINING.reception[1]], exit: [DINING.reception[0] - 1.6, DINING.reception[1] + 0.6],
      seat: { at, yaw: r + Math.PI, table: [tx, tz] }, staffFrom: [DINING.menu[0], DINING.menu[1] + 1],
    };
  }
  if (ride.track === "grill") {
    const [gx, gz] = DINING.grill;
    return { approach: [gx, gz + 1.1], exit: [gx + 0.9, gz + 1.6], spots: { me: [gx, gz + 0.85], centre: [gx, gz] }, staffFrom: [gx, gz - 0.65] };
  }
  return null;
}

function spaTrack(ride: RideDef, at?: StationDef): Track | null {
  const { beds, bedTop, bedLength, plunge, sauna, jacuzzi, loungers } = SPA;
  switch (ride.track) {
    case "bed1":
    case "bed2": {
      const [bx, bz] = beds[ride.track === "bed1" ? 0 : 1];
      // Face down, head on the pillow end (-x), feet towards +x; the therapist stands on the near side.
      const head = bx - bedLength / 2 + 0.1;
      return {
        approach: [bx, bz + 0.85], exit: [bx - 0.4, bz + 1.1],
        lie: { feet: [head + 1.72, bedTop + 0.1, bz], yaw: -Math.PI / 2 }, staffFrom: [bx + 0.2, bz + 0.75], centre: [bx, bz],
      };
    }
    case "sauna":
      return { approach: [sauna.at[0], sauna.at[1] + sauna.d / 2 + 0.6], exit: [sauna.at[0] + 0.3, sauna.at[1] + sauna.d / 2 + 0.9], spots: { me: [sauna.at[0] - 0.3, sauna.at[1] - sauna.d / 2 + 0.55], centre: sauna.at } };
    case "plunge": {
      const water: Water = { at: plunge.at, w: plunge.w, d: plunge.d };
      return { approach: [plunge.at[0] + 1.3, plunge.at[1] + plunge.d / 2 + 0.55], water, exit: [plunge.at[0] + 1.3, plunge.at[1] + plunge.d / 2 + 0.55] };
    }
    case "jacuzzi":
      return { approach: [jacuzzi.at[0] - jacuzzi.r - 0.5, jacuzzi.at[1]], exit: [jacuzzi.at[0] - jacuzzi.r - 0.5, jacuzzi.at[1] + 0.4], spots: { me: [jacuzzi.at[0] - 0.35, jacuzzi.at[1]], centre: jacuzzi.at } };
    case "spalounger": {
      // Spa loungers face the room (rotation π): lie with the head on the backrest.
      const [x, z] = at?.kind === "booth" ? at.position : loungers[0];
      return { approach: [x + 0.9, z - 0.4], exit: [x + 0.9, z - 0.4], lie: { feet: [x, 0.47, z - 0.85], yaw: Math.PI } };
    }
  }
  return null;
}

function attractionTrack(ride: RideDef): Track | null {
  const { lift, tunnel, wax, vrSpot } = LOBBY;
  switch (ride.track) {
    case "lift": return { approach: [lift[0] + 1.2, lift[1] + 0.4], exit: [lift[0] + 1.3, lift[1] + 1], spots: { me: lift } };
    case "tunnel": return { approach: tunnel.door, exit: [tunnel.door[0] + 1, tunnel.door[1] + 1.2], spots: { me: tunnel.start, them: tunnel.end, centre: tunnel.centre } };
    case "wax": return { approach: [wax[0][0] + 1, wax[0][1] + 0.8], exit: [wax[2][0] + 1, wax[2][1] + 1.6] };
    case "vr": return { approach: vrSpot, exit: [vrSpot[0] + 0.8, vrSpot[1]], spots: { me: vrSpot } };
  }
  return null;
}

function shopTrack(ride: RideDef): Track | null {
  switch (ride.track) {
    case "boutique": { const b = SHOPS.boutique; return { approach: [b.runway[0] + 0.8, b.runway[1]], exit: [b.runway[0] + 1, b.runway[1] + 0.8], spots: { me: b.runway, them: b.door, centre: b.fitting }, staffFrom: b.stylist }; }
    case "market": { const m = SHOPS.market; return { approach: m.start, exit: [m.till[0] - 1.2, m.till[1] - 0.4], spots: { me: m.start, centre: m.till } }; }
    // The beauty advisor stands at the end of the counter (the shop's own staff are behind the till).
    case "beauty": { const c = SHOPS.beauty.counter; return { approach: [c[0], c[1] + 1], exit: [c[0] - 1, c[1] + 1.6], spots: { me: [c[0], c[1] + 0.95], centre: c }, staffFrom: [c[0] - 1.15, c[1] + 0.25] }; }
    case "jewellery": { const c = SHOPS.jewellery.counter; return { approach: [c[0] + 0.6, c[1] + 1.4], exit: [c[0] + 1, c[1] + 1.8], spots: { me: [c[0], c[1] + 1.15], centre: c }, staffFrom: [c[0], c[1] - 0.8] }; }
    case "tech": { const t = SHOPS.tech.table; return { approach: [t[0], t[1] + 1.4], exit: [t[0] + 1, t[1] + 1.8], spots: { me: [t[0], t[1] + 0.9], centre: t } }; }
  }
  return null;
}

/** The track for a ride in this venue, or null when the venue has nowhere to ride it. `at` is the station it
    was started from (which lounger, for sunbathing). */
export function trackFor(venue: Venue, ride: RideDef, at?: StationDef): Track | null {
  if (venue.layout === "waterpark") return waterparkTrack(ride);
  if (venue.layout === "pooldeck" && ride.track === "pool") return poolTrack(venue);
  if (venue.layout === "beach") return beachTrack(ride, at);
  if (venue.layout === "rink") return rinkTrack();
  if (venue.layout === "bowling") return bowlingTrack(ride);
  if (venue.layout === "club") return clubTrack(ride);
  if (venue.layout === "dining") return diningTrack(ride);
  if (venue.layout === "spa") return spaTrack(ride, at);
  if (venue.layout === "lobby") return attractionTrack(ride);
  if (["boutique", "market", "beauty", "jewellery", "tech"].includes(venue.layout)) return shopTrack(ride);
  return null;
}

