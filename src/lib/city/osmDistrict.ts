// The real streets outside (components/street/OsmWorld): one district of Dubai from OpenStreetMap, made offline by
// scripts/osm/build-districts.mjs into public/osm/<id>.json (decimetres; x east, z south, from the district centre).
// The same area format makes the pieces of a road to drive (lib/city/drives, components/drive).
// Here: which district a street area is in, loading one (cached), what's solid (building footprints) and the way
// along the streets from one point to another (A* over the road network). Map data © OpenStreetMap contributors.

import CONFIG from "@/data/city/osm-districts.json";

export const OSM_ATTRIBUTION = CONFIG.attribution;
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

/** Road classes, as the build script numbers them: width (m) and whether only people use it. */
export const ROAD_CLASSES = [
  { w: 15, foot: false }, { w: 12, foot: false }, { w: 9, foot: false }, { w: 7, foot: false },
  { w: 4.5, foot: false }, { w: 5, foot: true }, { w: 2.4, foot: true },
] as const;

export interface OsmBuilding { h: number; ring: Float32Array; minX: number; maxX: number; minZ: number; maxZ: number }
export interface OsmRoad { cls: number; idx: number[]; bridge: boolean; tunnel: boolean }
export interface DoorSlot { x: number; z: number; yaw: number; /** How tall the building is (a villa's door goes on a low one). */ h: number }
/** Buildings, roads, water, islands and parks: a district, or a piece of a road to drive. */
export interface OsmArea {
  buildings: OsmBuilding[]; nodes: Float32Array; /** Each road node's height (bridges, tunnels, ramps). */ heights: Float32Array;
  roads: OsmRoad[]; water: Float32Array[]; land: Float32Array[]; green: Float32Array[];
}
export interface District extends OsmArea {
  id: string; name: string; r: number; start: [number, number]; slots: DoorSlot[];
  /** Buildings by 25 m cell, for collisions. */ grid: Map<string, number[]>;
  /** Neighbours of each road node (not motorways), for walking routes. */ adj: number[][];
}

export type RawArea = { v: number; b: number[][]; n: number[]; ny?: number[]; rd: number[][]; w: number[][]; l?: number[][]; g: number[][] };
type Raw = RawArea & { id: string; name: string; r: number; start: number[]; s: number[][] };

/** The district you step out into (null: the classic boulevard): by the place itself, then (from a villa) the
    area's villa district, then the area's. */
export function districtFor(area: string, opts: { villas?: boolean; place?: string } = {}): string | null {
  const places = CONFIG.places as Record<string, string>, villas = CONFIG.villas as Record<string, string>, areas = CONFIG.areas as Record<string, string>;
  const id = (opts.place && places[opts.place]) || (opts.villas && villas[area]) || areas[area] || areas.default;
  return id && id in CONFIG.districts ? id : null;
}
export const districtName = (id: string) => (CONFIG.districts as Record<string, { name: string }>)[id]?.name ?? "Dubai";

const CELL = 25;
const cellKey = (cx: number, cz: number) => `${cx},${cz}`;
const ring = (a: number[], from = 0) => { const f = new Float32Array(a.length - from); for (let i = from; i < a.length; i++) f[i - from] = a[i] / 10; return f; };

/** Buildings (with their bounds), roads, heights, water, islands and parks from a file. */
export function decodeArea(raw: RawArea): OsmArea {
  const buildings: OsmBuilding[] = raw.b.map((b) => {
    const r = ring(b, 1);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < r.length; i += 2) { minX = Math.min(minX, r[i]); maxX = Math.max(maxX, r[i]); minZ = Math.min(minZ, r[i + 1]); maxZ = Math.max(maxZ, r[i + 1]); }
    return { h: b[0] / 10, ring: r, minX, maxX, minZ, maxZ };
  });
  const nodes = ring(raw.n);
  const heights = raw.ny ? ring(raw.ny) : new Float32Array(nodes.length / 2);
  const roads = raw.rd.map(([c, ...idx]) => ({ cls: c & 15, idx, bridge: !!((c >> 4) & 1), tunnel: !!((c >> 4) & 2) }));
  return { buildings, nodes, heights, roads, water: raw.w.map((w) => ring(w)), land: (raw.l ?? []).map((l) => ring(l)), green: raw.g.map((g) => ring(g)) };
}

function decode(raw: Raw): District {
  const area = decodeArea(raw);
  const grid = new Map<string, number[]>();
  area.buildings.forEach((b, i) => {
    for (let cx = Math.floor(b.minX / CELL); cx <= Math.floor(b.maxX / CELL); cx++)
      for (let cz = Math.floor(b.minZ / CELL); cz <= Math.floor(b.maxZ / CELL); cz++) {
        const k = cellKey(cx, cz);
        const list = grid.get(k);
        if (list) list.push(i); else grid.set(k, [i]);
      }
  });
  const adj: number[][] = Array.from({ length: area.nodes.length / 2 }, () => []);
  for (const r of area.roads) {
    if (r.cls === 0 || r.bridge || r.tunnel) continue; // nobody walks the motorway, or up on a flyover
    for (let i = 0; i < r.idx.length - 1; i++) { adj[r.idx[i]].push(r.idx[i + 1]); adj[r.idx[i + 1]].push(r.idx[i]); }
  }
  return {
    ...area, id: raw.id, name: raw.name, r: raw.r, start: [raw.start[0] / 10, raw.start[1] / 10],
    slots: raw.s.map(([x, z, yaw, h]) => ({ x: x / 10, z: z / 10, yaw, h: (h ?? 0) / 10 })), grid, adj,
  };
}

const cache = new Map<string, Promise<District | null>>();
/** Loads a district (once per visit); null if it isn't there. */
export function loadDistrict(id: string): Promise<District | null> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/osm/${id}.json`).then((r) => (r.ok ? r.json() : null))
      .then((raw: Raw | null) => (raw && raw.v === 2 ? decode(raw) : null))
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}

function insideRing(r: Float32Array, x: number, z: number) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], zi = r[i + 1], xj = r[j], zj = r[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** Is this spot inside a building (or off the edge of the district)? */
export function blocked(d: District, x: number, z: number, pad = 0.3): boolean {
  if (Math.abs(x) > d.r || Math.abs(z) > d.r) return true;
  const list = d.grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return false;
  for (const i of list) {
    const b = d.buildings[i];
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    if (insideRing(b.ring, x, z) || (pad > 0 && (insideRing(b.ring, x + pad, z) || insideRing(b.ring, x - pad, z) || insideRing(b.ring, x, z + pad) || insideRing(b.ring, x, z - pad)))) return true;
  }
  return false;
}

function nearestNode(d: District, x: number, z: number): number {
  let best = -1, bd = Infinity;
  for (let i = 0; i < d.adj.length; i++) {
    if (!d.adj[i].length) continue;
    const dd = (d.nodes[i * 2] - x) ** 2 + (d.nodes[i * 2 + 1] - z) ** 2;
    if (dd < bd) { bd = dd; best = i; }
  }
  return best;
}

/** The way there along the streets: from where you are, onto the nearest street, along it, and up to the door. */
export function route(d: District, from: [number, number], to: [number, number]): Array<[number, number]> {
  const a = nearestNode(d, from[0], from[1]), b = nearestNode(d, to[0], to[1]);
  if (a < 0 || b < 0 || a === b) return [to];
  const N = d.adj.length, g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const hx = d.nodes[b * 2], hz = d.nodes[b * 2 + 1];
  const h = (i: number) => Math.hypot(d.nodes[i * 2] - hx, d.nodes[i * 2 + 1] - hz);
  const open: Array<[number, number]> = [[h(a), a]];
  g[a] = 0;
  while (open.length) {
    // Small graphs (a few thousand nodes): a sorted array is plenty.
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, u] = open.splice(bi, 1)[0];
    if (done[u]) continue;
    if (u === b) break;
    done[u] = 1;
    for (const v of d.adj[u]) {
      const w = g[u] + Math.hypot(d.nodes[u * 2] - d.nodes[v * 2], d.nodes[u * 2 + 1] - d.nodes[v * 2 + 1]);
      if (w < g[v]) { g[v] = w; prev[v] = u; open.push([w + h(v), v]); }
    }
  }
  if (prev[b] < 0) return [to];
  const path: Array<[number, number]> = [];
  for (let u = b; u >= 0; u = prev[u]) path.unshift([d.nodes[u * 2], d.nodes[u * 2 + 1]]);
  path.push(to);
  return path;
}

/** Metres along a route (for "n min walk"). */
export const routeLength = (from: [number, number], pts: Array<[number, number]>) =>
  pts.reduce((s, p, i) => s + Math.hypot(p[0] - (i ? pts[i - 1][0] : from[0]), p[1] - (i ? pts[i - 1][1] : from[1])), 0);
