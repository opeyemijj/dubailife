// Traffic on a real road (components/drive): every car keeps its distance from the one ahead in its lane (the
// Intelligent Driver Model: it eases off as the gap closes and brakes hard if it has to), changes lane only when
// there's room in the next one (ahead and behind), drifts back right when it can, and never overlaps another car
// or you. You count as a car to everyone behind you.

import CARS from "@/data/cars/cars.json";
import { laneCentres, type RoadPath } from "./drives";

export interface Vehicle {
  s: number; offset: number; target: number; speed: number;
  /** The speed it likes to do. */ want: number; len: number;
  /** When it last thought about changing lane. */ think: number;
}
/** What a traffic car looks like: one of the city's cars, its paint and plate. */
export interface TrafficLook { id: string; color: string; plate: string; taxi: boolean }

const A = 1.8, B = 3.5, S0 = 3, T = 1.25, LAT = 1.6; // m/s², m/s², m, s, lane change m/s
const LANE_HALF = 1.6; // two cars closer than this across are in the same lane

/** Is u in (or moving into or out of) the lane at this offset? */
const inLane = (u: Vehicle, offset: number) => Math.abs(u.offset - offset) < LANE_HALF || Math.abs(u.target - offset) < LANE_HALF;

/** The nearest car ahead of v in the lane at `offset` (or behind, with dir -1). */
function neighbour(v: Vehicle, all: Vehicle[], offset: number, dir: 1 | -1) {
  let best: Vehicle | null = null, bd = Infinity;
  for (const u of all) {
    if (u === v || !inLane(u, offset)) continue;
    const d = (u.s - v.s) * dir;
    if (d > 0 && d < bd) { bd = d; best = u; }
  }
  return best;
}
const gapTo = (back: Vehicle, front: Vehicle) => front.s - front.len / 2 - (back.s + back.len / 2);

/** How hard v accelerates (or brakes) behind `lead` (none: open road). */
function idm(v: Vehicle, lead: Vehicle | null) {
  const free = 1 - Math.pow(v.speed / v.want, 4);
  if (!lead) return A * free;
  const gap = Math.max(0.1, gapTo(v, lead));
  const sStar = S0 + Math.max(0, v.speed * T + (v.speed * (v.speed - lead.speed)) / (2 * Math.sqrt(A * B)));
  return Math.max(-9, A * (free - (sStar / gap) ** 2));
}

/** Room to pull into the lane at `offset`: enough gap ahead, and the car behind won't have to brake hard. */
function roomIn(v: Vehicle, all: Vehicle[], offset: number) {
  const ahead = neighbour(v, all, offset, 1), behind = neighbour(v, all, offset, -1);
  if (ahead && gapTo(v, ahead) < S0 + v.speed * 0.9) return null;
  if (behind && (gapTo(behind, v) < S0 + behind.speed * 0.9 || idm(behind, v) < -3)) return null;
  return { ahead };
}

/** One step for every car on this road. `others` (you) aren't moved, but everyone keeps clear of them. */
export function stepTraffic(cars: Vehicle[], road: RoadPath, dt: number, others: Vehicle[] = [], now = 0) {
  const all = [...cars, ...others];
  // Accelerations first (from where everyone is now), then move.
  const acc = cars.map((v) => idm(v, neighbour(v, all, v.offset, 1)));
  cars.forEach((v, i) => {
    v.speed = Math.max(0, v.speed + acc[i] * dt);
    v.s += v.speed * dt;
    // Lanes: keep to one that exists here (a lane ending: merge), and think about changing every second or so.
    const lanes = laneCentres(road.lanesAt(v.s));
    if (!lanes.some((o) => Math.abs(o - v.target) < 0.3)) v.target = lanes.reduce((b, o) => (Math.abs(o - v.target) < Math.abs(b - v.target) ? o : b), lanes[0]);
    const settled = Math.abs(v.offset - v.target) < 0.05;
    if (settled && now - v.think > 1.2) {
      v.think = now + (v.s % 1) * 0.6;
      const k = lanes.findIndex((o) => Math.abs(o - v.target) < 0.3);
      const here = idm(v, neighbour(v, all, v.target, 1));
      // Overtake on the left if it's quicker there; otherwise move back right when there's room.
      const left = lanes[k - 1], right = lanes[k + 1];
      if (left !== undefined && here < 0.2 && v.speed < v.want - 2) {
        const r = roomIn(v, all, left);
        if (r && idm(v, r.ahead) > here + 0.4) v.target = left;
      } else if (right !== undefined && here > -0.2) {
        const r = roomIn(v, all, right);
        if (r && idm(v, r.ahead) > -0.3) v.target = right;
      }
    }
    v.offset += Math.max(-LAT * dt, Math.min(LAT * dt, v.target - v.offset));
  });
  // Never through each other: anyone too close to the car ahead in their lane drops back behind it.
  const order = [...cars].sort((a, b) => b.s - a.s);
  for (const v of order) {
    const lead = neighbour(v, all, v.offset, 1);
    if (lead) {
      const g = gapTo(v, lead);
      if (g < 0.8) { v.s -= 0.8 - g; v.speed = Math.min(v.speed, lead.speed); }
    }
  }
}

/** A free spot in some lane near `s` (nobody within `clear` metres in that lane), for a car joining. */
export function freeSpot(cars: Vehicle[], road: RoadPath, s: number, others: Vehicle[] = [], clear = 30, seed = 0) {
  const lanes = laneCentres(road.lanesAt(Math.max(0, s)));
  const all = [...cars, ...others];
  for (let k = 0; k < lanes.length; k++) {
    const o = lanes[(k + seed) % lanes.length];
    if (!all.some((u) => inLane(u, o) && Math.abs(u.s - s) < clear)) return o;
  }
  return null;
}

/** Cars along a stretch of road, spaced out lane by lane. */
export function spawnTraffic(road: RoadPath, from: number, to: number, perLane: number, seed: number): Vehicle[] {
  const out: Vehicle[] = [];
  const lanes = laneCentres(road.lanesAt(Math.max(0, (from + to) / 2)));
  lanes.forEach((o, li) => {
    let s = from + rnd(seed + li) * 40;
    for (let k = 0; k < perLane && s < to; k++) {
      const want = 23 + rnd(seed + li * 31 + k) * 9 - li * 1.2 + (li === 0 ? 3 : 0); // the fast lane on the left
      out.push({ s, offset: o, target: o, speed: want * 0.9, want, len: 4.8, think: rnd(seed + k) * 2 });
      s += 45 + rnd(seed + li * 7 + k * 3) * 90;
    }
  });
  return out;
}

const rnd = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Mostly what Dubai drives (white, silver, black; Land Cruisers and Patrols), some taxis, the odd supercar.
const MIX = ["toyota-land-cruiser", "nissan-patrol", "toyota-camry", "nissan-sunny", "toyota-corolla", "mercedes-e", "bmw-5", "bmw-x5", "tesla-model-y", "mercedes-g63", "lamborghini-urus", "lamborghini-huracan"];
const PAINT = ["#f8fafc", "#f8fafc", "#e5e7eb", "#cbd5e1", "#9ca3af", "#111827", "#0f172a", "#1e3a8a", "#7f1d1d", "#d6d3d1"];
const KNOWN = new Set((CARS.cars as Array<{ id: string }>).map((c) => c.id));
export function trafficLooks(n: number, seed: number): TrafficLook[] {
  return Array.from({ length: n }, (_, i) => {
    const taxi = rnd(seed + i * 13) > 0.8;
    const pick = MIX[Math.floor(Math.pow(rnd(seed + i * 5), 1.6) * MIX.length)];
    const id = taxi ? "toyota-camry" : KNOWN.has(pick) ? pick : "toyota-camry";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return {
      id, taxi,
      color: taxi ? "#efe2c2" : PAINT[Math.floor(rnd(seed + i * 17) * PAINT.length)],
      plate: `${letters[Math.floor(rnd(seed + i) * 26)]} ${10000 + Math.floor(rnd(seed + i * 3) * 89999)}`,
    };
  });
}
