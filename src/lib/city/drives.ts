// Driving real roads (components/drive, /drive): Sheikh Zayed Road and the Palm, built offline from OpenStreetMap
// (scripts/osm/build-districts.mjs → public/osm/<corridor>/). Here: which drive a trip takes (planDrive: along SZR,
// along the Palm, or SZR then onto the Palm), the road itself (a smoothed centre line each way, with its lanes,
// heights and tunnels), loading the pieces around you, and how a car moves along it (roadStep: like the Autodrome's,
// on a carriageway between barriers). Map data © OpenStreetMap contributors.

import * as THREE from "three";
import CONFIG from "@/data/city/osm-districts.json";
import { getPlace } from "@/lib/city/places";
import type { CarPerf, DriveInput } from "@/lib/autodrome";
import { decodeArea, type OsmArea, type RawArea } from "./osmDistrict";

// ---------------------------------------------------------------- planning a trip

interface ExitDef { id: string; name: string; areas: string[]; places?: string[] }
interface CorridorDef { name: string; exits: ExitDef[] }
const CORRIDORS = CONFIG.corridors as unknown as Record<string, CorridorDef>;
const LINK = CONFIG.link as Record<string, string>;

export interface Leg { c: string; a: string; b: string }
export interface Spot { area: string; place?: string }

function exitFor(c: string, at: Spot): string | null {
  const ex = CORRIDORS[c]?.exits ?? [];
  return (at.place ? ex.find((e) => e.places?.includes(at.place!)) : undefined)?.id
    ?? ex.find((e) => e.areas.includes(at.area))?.id
    ?? ex.find((e) => e.areas.includes("default"))?.id ?? null;
}
const onPalm = (at: Spot) => at.area === "palm" || !!CORRIDORS.palm?.exits.some((e) => e.places?.includes(at.place ?? ""));

/** The drive between two spots in the city, leg by leg (none: not along a road we've built; drive on the map). */
export function planDrive(from: Spot, to: Spot): Leg[] {
  const legs: Leg[] = [];
  const add = (c: string, a: string | null, b: string | null) => { if (a && b && a !== b) legs.push({ c, a, b }); };
  const fromPalm = onPalm(from), toPalm = onPalm(to);
  if (!fromPalm && !toPalm) add("szr", exitFor("szr", from), exitFor("szr", to));
  else if (!fromPalm && toPalm) { add("szr", exitFor("szr", from), LINK.szr); add("palm", LINK.palm, exitFor("palm", to)); }
  else if (fromPalm && !toPalm) { add("palm", exitFor("palm", from), LINK.palm); add("szr", LINK.szr, exitFor("szr", to)); }
  else add("palm", exitFor("palm", from), exitFor("palm", to));
  return legs;
}

export const legsParam = (legs: Leg[]) => legs.map((l) => `${l.c}:${l.a}:${l.b}`).join(",");
export const parseLegs = (v: string | null): Leg[] => (v ?? "").split(",").map((x) => x.split(":")).filter((p) => p.length === 3 && p[0] in CORRIDORS).map(([c, a, b]) => ({ c, a, b }));
export const exitName = (c: string, id: string) => CORRIDORS[c]?.exits.find((e) => e.id === id)?.name ?? id;
export const corridorName = (c: string) => CORRIDORS[c]?.name ?? "the road";

/** Where a place's page is (the same as the street's doors). */
export function placeHref(id: string) {
  const p = getPlace(id);
  if (!p) return `/explore?to=${encodeURIComponent(id)}`;
  return p.route ?? (p.venues.length > 1 ? `/explore?open=${p.id}` : `/place/${p.id}/${p.venues[0].id}`);
}

// ---------------------------------------------------------------- the road

const STEP = 2; // metres between samples
export const LANE_W = 3.65;

/** One direction of the road, sampled every 2 m and smoothed: position (with height), heading, curvature, lanes. */
export class RoadPath {
  readonly n: number; readonly length: number;
  readonly x: Float32Array; readonly z: Float32Array; readonly y: Float32Array;
  readonly tx: Float32Array; readonly tz: Float32Array; readonly curv: Float32Array;
  readonly lanes: Uint8Array; readonly tunnel: Uint8Array;

  constructor(flat: number[]) {
    // Points from the file: x, z, y (dm), lanes, tunnel.
    const pts: Array<{ x: number; z: number; y: number; lanes: number; tunnel: number; s: number }> = [];
    for (let i = 0; i < flat.length; i += 5) {
      const p = { x: flat[i] / 10, z: flat[i + 1] / 10, y: flat[i + 2] / 10, lanes: flat[i + 3], tunnel: flat[i + 4], s: 0 };
      if (pts.length) p.s = pts[pts.length - 1].s + Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z);
      pts.push(p);
    }
    const total = pts[pts.length - 1].s;
    const n = Math.max(2, Math.floor(total / STEP) + 1);
    const x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), lanes = new Uint8Array(n), tunnel = new Uint8Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      while (j < pts.length - 2 && pts[j + 1].s < s) j++;
      const a = pts[j], b = pts[j + 1], t = Math.min(1, Math.max(0, (s - a.s) / ((b.s - a.s) || 1)));
      x[i] = a.x + (b.x - a.x) * t; z[i] = a.z + (b.z - a.z) * t; y[i] = a.y + (b.y - a.y) * t;
      lanes[i] = Math.max(1, Math.min(6, t < 0.5 ? a.lanes : b.lanes)); tunnel[i] = a.tunnel && b.tunnel ? 1 : 0;
    }
    // Round the corners (OSM's straight bits meet at points): a few passes of a moving average.
    const smooth = (arr: Float32Array, k: number, passes: number) => {
      for (let p = 0; p < passes; p++) {
        const src = arr.slice();
        for (let i = 0; i < n; i++) {
          let sum = 0, c = 0;
          for (let d = -k; d <= k; d++) { const q = i + d; if (q >= 0 && q < n) { sum += src[q]; c++; } }
          arr[i] = sum / c;
        }
      }
    };
    smooth(x, 4, 3); smooth(z, 4, 3); smooth(y, 10, 3);
    const tx = new Float32Array(n), tz = new Float32Array(n), curv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const dx = x[b] - x[a], dz = z[b] - z[a], L = Math.hypot(dx, dz) || 1;
      tx[i] = dx / L; tz[i] = dz / L;
    }
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 4), b = Math.min(n - 1, i + 4);
      const ang = Math.atan2(tx[a] * tz[b] - tz[a] * tx[b], tx[a] * tx[b] + tz[a] * tz[b]);
      curv[i] = ang / (Math.max(1, b - a) * STEP);
    }
    this.n = n; this.length = (n - 1) * STEP; this.x = x; this.z = z; this.y = y; this.tx = tx; this.tz = tz; this.curv = curv; this.lanes = lanes; this.tunnel = tunnel;
  }

  /** Index and blend at a distance along. */
  private at(s: number) { const f = Math.min(this.n - 1.001, Math.max(0, s / STEP)); const i = Math.floor(f); return { i, k: f - i }; }
  /** Where a distance along and an offset across (+ is right of the way you're going) put you. */
  pose(s: number, offset = 0, out = new THREE.Vector3()) {
    const { i, k } = this.at(s);
    const tx = this.tx[i] + (this.tx[i + 1] - this.tx[i]) * k, tz = this.tz[i] + (this.tz[i + 1] - this.tz[i]) * k, L = Math.hypot(tx, tz) || 1;
    const rx = -tz / L, rz = tx / L;
    out.set(this.x[i] + (this.x[i + 1] - this.x[i]) * k + rx * offset, this.y[i] + (this.y[i + 1] - this.y[i]) * k, this.z[i] + (this.z[i + 1] - this.z[i]) * k + rz * offset);
    return { p: out, yaw: Math.atan2(tx / L, tz / L), curv: this.curv[i], lanes: this.lanes[i], tunnel: !!this.tunnel[i], pitch: (this.y[Math.min(this.n - 1, i + 2)] - this.y[Math.max(0, i - 2)]) / (4 * STEP) };
  }
  /** Half the carriageway's width here. */
  halfWidth(s: number) { return (this.lanes[this.at(s).i] * LANE_W) / 2; }
  lanesAt(s: number) { return this.lanes[this.at(s).i]; }
  /** The distance along this road nearest a point (searching near a guess). */
  nearest(px: number, pz: number, guess: number, span = 400) {
    const a = Math.max(0, Math.floor((guess - span) / STEP)), b = Math.min(this.n - 1, Math.ceil((guess + span) / STEP));
    let best = a, bd = Infinity;
    for (let i = a; i <= b; i++) { const d = (this.x[i] - px) ** 2 + (this.z[i] - pz) ** 2; if (d < bd) { bd = d; best = i; } }
    return best * STEP;
  }
  nearestAll(px: number, pz: number) { return this.nearest(px, pz, this.length / 2, this.length); }
}

export interface Corridor {
  id: string; name: string; fwd: RoadPath; back: RoadPath;
  chunks: Array<{ k: number; s0: number; s1: number }>;
  exits: Array<{ id: string; name: string; sF: number; sB: number }>;
}

const corridors = new Map<string, Promise<Corridor | null>>();
export function loadCorridor(id: string): Promise<Corridor | null> {
  let p = corridors.get(id);
  if (!p) {
    p = fetch(`/osm/${id}/index.json`).then((r) => (r.ok ? r.json() : null)).then((raw) => {
      if (!raw || raw.v !== 2) return null;
      return { id, name: raw.name, fwd: new RoadPath(raw.fwd), back: new RoadPath(raw.back), chunks: raw.chunks, exits: raw.exits } as Corridor;
    }).catch(() => null);
    corridors.set(id, p);
  }
  return p;
}
const pieces = new Map<string, Promise<OsmArea | null>>();
export function loadPiece(id: string, k: number): Promise<OsmArea | null> {
  const key = `${id}/${k}`;
  let p = pieces.get(key);
  if (!p) {
    p = fetch(`/osm/${key}.json`).then((r) => (r.ok ? r.json() : null)).then((raw: RawArea | null) => (raw ? decodeArea(raw) : null)).catch(() => null);
    pieces.set(key, p);
  }
  return p;
}

// ---------------------------------------------------------------- driving

export interface RoadState { s: number; offset: number; speed: number; wall: number }

/** One step along the road: throttle, brake and drag; steering moves you across (lane changes); bends push you
    wide when you're quick; the barriers either side stop you. */
export function roadStep(st: RoadState, input: DriveInput, perf: CarPerf, road: RoadPath, dt: number): RoadState {
  let { speed, offset } = st;
  const curv = road.pose(st.s).curv;
  const top = perf.top / 0.82; // the car's real top speed (the circuit trims it)
  if (input.throttle > 0) speed += perf.accel * input.throttle * Math.max(0, 1 - speed / top) * dt;
  if (input.brake > 0) speed -= 16 * input.brake * dt;
  speed -= (0.6 + speed * speed * 0.00045) * dt;
  speed = Math.max(0, speed);
  offset += input.steer * Math.min(speed, 30) * 0.16 * dt;
  offset -= (speed * speed * curv) / (perf.grip * 14) * dt * 0.6;
  const hw = road.halfWidth(st.s) + 1.2;
  let wall = 0;
  if (Math.abs(offset) > hw) { offset = Math.sign(offset) * hw; speed *= Math.pow(0.6, dt * 4); wall = 1; }
  return { s: Math.min(road.length, st.s + speed * dt), offset, speed, wall };
}

/** Lane centres across the carriageway (offsets, left to right). */
export const laneCentres = (lanes: number) => Array.from({ length: lanes }, (_, i) => -((lanes * LANE_W) / 2) + LANE_W * (i + 0.5));
