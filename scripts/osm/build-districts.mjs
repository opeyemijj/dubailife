#!/usr/bin/env node
// Builds the game's real streets and roads from OpenStreetMap, once, offline (the game never calls OpenStreetMap):
//   node scripts/osm/build-districts.mjs              every district and corridor in src/data/city/osm-districts.json
//   node scripts/osm/build-districts.mjs marina       just one (a district or a corridor id)
// Politely: one Overpass query at a time, a few seconds apart; raw answers are cached for a day in the system temp
// folder so re-running while tuning doesn't ask again. Map data © OpenStreetMap contributors, ODbL.
//
// Files (lengths in decimetres, integers; x east, z south):
//   districts  public/osm/<id>.json           origin at the district centre
//   corridors  public/osm/<id>/index.json     the route both ways, its pieces and exits; origin at the first waypoint
//              public/osm/<id>/<k>.json       piece k (the k-th ~1 km along the route)
// Area data (district or piece):
//   b: buildings [h, x0, z0, x1, z1, ...]      outer ring, no repeat of the first point
//   n: road nodes [x0, z0, ...]; ny: their heights (bridges up, tunnels down, ramps in between)
//   rd: roads [class | flags << 4, i0, i1, ...] class as ROAD below; flags 1 bridge, 2 tunnel
//   w: water rings (lakes, the marina, the sea), l: land rings on top of the water (islands), g: green rings
//   districts also: s door slots [x, z, yaw, height of that building], start [x, z]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/city/osm-districts.json"), "utf8"));
const OUT = path.join(ROOT, "public/osm");
const UA = "DubaiLifeGame/1.0 (game map build; contact support@mydubailife.app)";
const ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Road classes: index = class id in the file. Width in metres; foot = paths only people use. */
const ROAD = [
  { k: ["motorway", "motorway_link", "trunk", "trunk_link"], w: 15 },
  { k: ["primary", "primary_link"], w: 12 },
  { k: ["secondary", "secondary_link", "tertiary", "tertiary_link"], w: 9 },
  { k: ["residential", "unclassified", "living_street", "road"], w: 7 },
  { k: ["service"], w: 4.5 },
  { k: ["pedestrian"], w: 5, foot: true },
  { k: ["footway", "path", "cycleway", "steps", "corridor", "track", "bridleway"], w: 2.4, foot: true },
];
const roadClass = (hw) => ROAD.findIndex((c) => c.k.includes(hw));
const BRIDGE_H = 7, TUNNEL_D = -7.5, RAMP = 0.055;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dm = (v) => Math.round(v * 10);

// ------------------------------------------------------------------ fetching

const AREA_QUERY = (b) => `[out:json][timeout:120];
(
  way["building"](${b}); relation["building"](${b});
  way["highway"](${b});
  way["natural"="water"](${b}); relation["natural"="water"](${b}); way["waterway"~"canal|riverbank|dock"](${b});
  way["leisure"~"park|garden|pitch|golf_course|playground"](${b}); relation["leisure"~"park|garden|golf_course"](${b});
  way["landuse"~"grass|recreation_ground|meadow|village_green"](${b});
  way["natural"="coastline"](${b});
);
(._;>;);
out body qt;`;

async function overpass(key, query) {
  const cache = path.join(os.tmpdir(), `dubailife-osm-${key}.json`);
  if (fs.existsSync(cache) && Date.now() - fs.statSync(cache).mtimeMs < 86_400_000) return JSON.parse(fs.readFileSync(cache, "utf8"));
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(query) });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync(cache, JSON.stringify(data));
        await sleep(4000);
        return data;
      }
      console.warn(`  overpass ${res.status}, retrying…`);
    } catch (e) { console.warn(`  overpass ${e.message}, retrying…`); }
    await sleep(15000 + attempt * 10000);
  }
  throw new Error("overpass failed");
}

/** A local frame in metres around (lat0, lng0). */
function frameAt(lat0, lng0) {
  const mLat = 110540, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    xz: (lat, lng) => [(lng - lng0) * mLng, -(lat - lat0) * mLat],
    /** Overpass bbox (s,w,n,e) for a box in metres. */
    bbox: ([x0, z0, x1, z1]) => [lat0 - z1 / mLat, lng0 + x0 / mLng, lat0 - z0 / mLat, lng0 + x1 / mLng].map((v) => v.toFixed(5)).join(","),
  };
}

// ------------------------------------------------------------------ geometry helpers

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bi = -1;
    const [ax, az] = pts[a], [bx, bz] = pts[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L;
      if (d > best) { best = d; bi = i; }
    }
    if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/** A closed ring (no repeated first point): split at the point furthest from the first, simplify both halves. */
function closedSimplify(pts, tol) {
  if (pts.length < 4) return pts;
  let k = 1, bd = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > bd) { bd = d; k = i; } }
  const a = simplify(pts.slice(0, k + 1), tol), b = simplify(pts.slice(k).concat([pts[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const area = (ring) => { let s = 0; for (let i = 0; i < ring.length; i++) { const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % ring.length]; s += x1 * z2 - x2 * z1; } return s / 2; };
function inside(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function nearestOnSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
  return [ax + dx * t, az + dz * t, t];
}
/** Joins open ways (arrays of node ids) into closed rings. */
function joinRings(ways) {
  const rings = [], open = ways.map((w) => w.slice());
  while (open.length) {
    let cur = open.pop();
    let grew = true;
    while (cur[0] !== cur[cur.length - 1] && grew) {
      grew = false;
      for (let i = 0; i < open.length; i++) {
        const w = open[i], end = cur[cur.length - 1], start = cur[0];
        if (w[0] === end) cur = cur.concat(w.slice(1));
        else if (w[w.length - 1] === end) cur = cur.concat(w.slice(0, -1).reverse());
        else if (w[w.length - 1] === start) cur = w.concat(cur.slice(1));
        else if (w[0] === start) cur = w.slice().reverse().concat(cur.slice(1));
        else continue;
        open.splice(i, 1); grew = true; break;
      }
    }
    if (cur.length > 3 && cur[0] === cur[cur.length - 1]) rings.push(cur.slice(0, -1));
  }
  return rings;
}
/** Joins directed ways (the coastline) end to start into the longest chains. */
function joinChains(ways) {
  const chains = [], open = ways.map((w) => w.slice());
  while (open.length) {
    let cur = open.pop(), grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < open.length; i++) {
        const w = open[i];
        if (w[0] === cur[cur.length - 1]) { cur = cur.concat(w.slice(1)); open.splice(i, 1); grew = true; break; }
        if (w[w.length - 1] === cur[0]) { cur = w.concat(cur.slice(1)); open.splice(i, 1); grew = true; break; }
      }
    }
    chains.push(cur);
  }
  return chains;
}

class Heap {
  constructor() { this.a = []; }
  push(p, v) { const a = this.a; a.push([p, v]); let i = a.length - 1; while (i) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

function parseHeight(tags, seed, footprint = 0) {
  const h = parseFloat(String(tags.height ?? "").replace(/[^0-9.]/g, ""));
  if (h > 0) return Math.min(h, 830);
  const lv = parseFloat(tags["building:levels"]);
  if (lv > 0) return Math.min(lv * 3.3 + 1.5, 830);
  const t = tags.building;
  const r = ((seed * 2654435761) >>> 0) / 4294967296;
  if (["house", "detached", "villa", "semidetached_house", "terrace", "bungalow"].includes(t)) return 7 + r * 2;
  if (["garage", "garages", "shed", "kiosk", "roof", "carport", "hut"].includes(t)) return 3 + r;
  if (["mosque", "retail", "supermarket", "warehouse", "industrial"].includes(t)) return 9 + r * 5;
  if (["apartments", "hotel", "office", "commercial", "tower"].includes(t)) return 24 + r * 40;
  // Just "a building": guess from its size: a villa-sized footprint is two storeys, a block a few more.
  if (footprint && footprint < 450) return 6.5 + r * 3;
  if (footprint && footprint < 1500) return 9 + r * 8;
  return 12 + r * 18;
}

const isBridge = (t) => !!t.bridge && t.bridge !== "no";
const isTunnel = (t) => t.tunnel === "yes" || t.tunnel === "building_passage" || t.covered === "yes" && false;

/** Heights for road nodes: bridges up (by layer), tunnels down, and every road joined to one ramping back to the
    ground at ~5.5%. `known` (node id → height) wins (the corridor's own route, worked out once over its whole length). */
function elevations(roadWays, known = new Map()) {
  const elev = new Map(known), fixed = new Set(known.keys());
  const adj = new Map();
  const link = (a, b, d) => { (adj.get(a) ?? adj.set(a, []).get(a)).push([b, d]); };
  for (const w of roadWays) {
    const t = w.tags, s = isBridge(t) ? 1 : isTunnel(t) ? -1 : 0;
    const layer = Math.abs(parseFloat(t.layer)) || 1;
    if (s) for (const n of w.nodes) {
      if (fixed.has(n)) continue;
      const e = s > 0 ? BRIDGE_H * Math.min(layer, 3) : TUNNEL_D * Math.min(layer, 2);
      if (Math.abs(e) > Math.abs(elev.get(n) ?? 0)) elev.set(n, e);
      fixed.add(n);
    }
    if (!s) for (let i = 0; i < w.nodes.length - 1; i++) { const d = w.len[i]; link(w.nodes[i], w.nodes[i + 1], d); link(w.nodes[i + 1], w.nodes[i], d); }
  }
  // Ramps: spread out from the structures along the ordinary roads, losing height with distance.
  const heap = new Heap();
  for (const [n, e] of elev) if (e) heap.push(-Math.abs(e), n);
  while (heap.size) {
    const [, n] = heap.pop(), e = elev.get(n);
    for (const [m, d] of adj.get(n) ?? []) {
      if (fixed.has(m)) continue;
      const c = Math.sign(e) * Math.max(0, Math.abs(e) - RAMP * d);
      if (Math.abs(c) > 0.2 && Math.abs(c) > Math.abs(elev.get(m) ?? 0)) { elev.set(m, c); heap.push(-Math.abs(c), m); }
    }
  }
  return elev;
}

// ------------------------------------------------------------------ one area (a district or a corridor piece)

/** Everything inside `box` ([x0, z0, x1, z1] metres): buildings, roads, water, land and green.
    keep(x, z): is this point wanted (corridors keep a band either side of the road); owns(x, z): does this area own
    a building centred here (so a building in two overlapping pieces is drawn once). */
function processArea(data, frame, box, { keep = () => true, owns = () => true, tunnels = false, knownElev } = {}) {
  const [bx0, bz0, bx1, bz1] = box;
  const nodes = new Map(), ways = new Map(), rels = [];
  for (const el of data.elements) {
    if (el.type === "node") nodes.set(el.id, frame.xz(el.lat, el.lon));
    else if (el.type === "way") ways.set(el.id, el);
    else if (el.type === "relation") rels.push(el);
  }
  const P = (nid) => nodes.get(nid);
  const inBox = ([x, z], m = 0) => x >= bx0 - m && x <= bx1 + m && z >= bz0 - m && z <= bz1 + m;
  const ringOf = (ids, tol) => closedSimplify(ids.map(P).filter(Boolean), tol);

  // Buildings.
  const buildings = [];
  const addBuilding = (ids, tags, seed) => {
    if (tags.building === "construction" || tags.building === "no" || tags.building === "roof") return;
    const ring = ringOf(ids, 0.5);
    if (ring.length < 3 || Math.abs(area(ring)) < 6) return;
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    if (!inBox([cx, cz]) || !keep(cx, cz) || !owns(cx, cz)) return;
    if (area(ring) < 0) ring.reverse();
    buildings.push({ ring, h: parseHeight(tags, seed, area(ring)), cx, cz });
  };
  for (const w of ways.values()) { const t = w.tags ?? {}; if (t.building && w.nodes[0] === w.nodes[w.nodes.length - 1]) addBuilding(w.nodes.slice(0, -1), t, w.id); }
  const outerRings = (r) => joinRings((r.members ?? []).filter((m) => m.type === "way" && (m.role === "outer" || m.role === "")).map((m) => ways.get(m.ref)?.nodes).filter(Boolean));
  for (const r of rels) if (r.tags?.building) for (const ids of outerRings(r)) addBuilding(ids, r.tags, r.id);

  // Water and green.
  const water = [], green = [], land = [];
  const addArea = (list, ids) => { const ring = ringOf(ids, 1.2); if (ring.length >= 3 && ring.some((p) => inBox(p, 200)) && Math.abs(area(ring)) > 30) list.push(ring); };
  const isWater = (t) => t.natural === "water" || ["canal", "riverbank", "dock"].includes(t.waterway);
  const isGreen = (t) => /^(park|garden|pitch|golf_course|playground)$/.test(t.leisure ?? "") || /^(grass|recreation_ground|meadow|village_green)$/.test(t.landuse ?? "");
  for (const w of ways.values()) {
    const t = w.tags ?? {};
    if (w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    if (isWater(t)) addArea(water, w.nodes.slice(0, -1));
    else if (isGreen(t) && !t.building) addArea(green, w.nodes.slice(0, -1));
  }
  for (const r of rels) {
    if (r.tags && isWater(r.tags)) for (const ids of outerRings(r)) addArea(water, ids);
    else if (r.tags && isGreen(r.tags)) for (const ids of outerRings(r)) addArea(green, ids);
  }

  // The sea: the coastline (land on its left), clipped to the box (a little larger than it) and closed round the
  // box's edge on the sea side. Coastline rings wholly inside (islands) are land on top of the sea.
  const coast = [...ways.values()].filter((w) => w.tags?.natural === "coastline").map((w) => w.nodes);
  if (coast.length) {
    const M = 40, X0 = bx0 - M, Z0 = bz0 - M, X1 = bx1 + M, Z1 = bz1 + M, W = X1 - X0, H = Z1 - Z0, PER = 2 * (W + H);
    const near = (a, b) => Math.abs(a - b) < 1e-3;
    // Distance clockwise round the edge (seen from above, north up) from the north-west corner.
    const perim = ([x, z]) => near(z, Z0) ? x - X0 : near(x, X1) ? W + (z - Z0) : near(z, Z1) ? W + H + (X1 - x) : 2 * W + H + (Z1 - z);
    const corners = [[[X1, Z0], W], [[X1, Z1], W + H], [[X0, Z1], 2 * W + H], [[X0, Z0], PER]];
    const inR = ([x, z]) => x >= X0 && x <= X1 && z >= Z0 && z <= Z1;
    const cross = (a, b) => { // a inside, b outside: where a→b leaves the box
      let t = 1;
      const dx = b[0] - a[0], dz = b[1] - a[1];
      if (b[0] > X1) t = Math.min(t, (X1 - a[0]) / dx); if (b[0] < X0) t = Math.min(t, (X0 - a[0]) / dx);
      if (b[1] > Z1) t = Math.min(t, (Z1 - a[1]) / dz); if (b[1] < Z0) t = Math.min(t, (Z0 - a[1]) / dz);
      const p = [a[0] + dx * t, a[1] + dz * t];
      for (const [k, lo, hi] of [[0, X0, X1], [1, Z0, Z1]]) { if (Math.abs(p[k] - lo) < 1e-3) p[k] = lo; if (Math.abs(p[k] - hi) < 1e-3) p[k] = hi; }
      return p;
    };
    const onEdge = ([x, z]) => near(x, X0) || near(x, X1) || near(z, Z0) || near(z, Z1);
    const runs = [];
    let islands = 0;
    for (const chain of joinChains(coast)) {
      let pts = chain.map(P).filter(Boolean);
      if (chain[0] === chain[chain.length - 1]) {
        if (pts.every(inR)) {
          const ring = closedSimplify(pts.slice(0, -1), 1.5);
          if (ring.length >= 3) { land.push(ring); islands++; }
          continue;
        }
        // A closed coastline (an island bigger than the box): start it outside the box, so every crossing is whole.
        const o = pts.findIndex((p) => !inR(p));
        const ring = pts.slice(0, -1);
        pts = ring.slice(o).concat(ring.slice(0, o), [ring[o]]);
      }
      let run = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (inR(p)) { if (!run.length && i > 0) run.push(cross(p, pts[i - 1])); run.push(p); }
        else if (run.length) { run.push(cross(pts[i - 1], p)); runs.push(run); run = []; }
        else if (i > 0) {
          // Straight through the box between two points outside it: the two crossings make a run of their own.
          const a = pts[i - 1], dx = p[0] - a[0], dz = p[1] - a[1];
          let t0 = 0, t1 = 1, ok = true;
          for (const [pp, q] of [[-dx, a[0] - X0], [dx, X1 - a[0]], [-dz, a[1] - Z0], [dz, Z1 - a[1]]]) {
            if (pp === 0) { if (q < 0) ok = false; continue; }
            const r = q / pp;
            if (pp < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
          }
          if (ok && t0 < t1) {
            const snapE = (q) => { for (const [k, lo, hi] of [[0, X0, X1], [1, Z0, Z1]]) { if (Math.abs(q[k] - lo) < 1e-3) q[k] = lo; if (Math.abs(q[k] - hi) < 1e-3) q[k] = hi; } return q; };
            runs.push([snapE([a[0] + dx * t0, a[1] + dz * t0]), snapE([a[0] + dx * t1, a[1] + dz * t1])]);
          }
        }
      }
      if (run.length) runs.push(run);
    }
    const edgeRuns = runs.filter((r) => r.length >= 2 && onEdge(r[0]) && onEdge(r[r.length - 1])).map((pts) => ({ pts, ta: perim(pts[0]), tb: perim(pts[pts.length - 1]) }));
    const used = new Set();
    for (const r0 of edgeRuns) {
      if (used.has(r0)) continue;
      used.add(r0);
      const ring = r0.pts.slice();
      let cur = r0, guard = 0;
      while (guard++ < 400) {
        const tb = cur.tb;
        let next = null, nd = Infinity;
        for (const r of edgeRuns) {
          if (used.has(r) && r !== r0) continue;
          const dd = (r.ta - tb + PER) % PER;
          if (dd < nd) { nd = dd; next = r; }
        }
        if (!next) break;
        for (let lap = 0; lap < 2; lap++) for (const [c, ct] of corners) { const rel = ct + lap * PER - tb; if (rel > 0 && rel < nd) ring.push(c); }
        if (next === r0) break;
        used.add(next); ring.push(...next.pts); cur = next;
      }
      const sm = closedSimplify(ring, 1.5);
      if (sm.length >= 3) water.push(sm);
    }
    // Only islands in view: everything round them is sea.
    if (!edgeRuns.length && islands) water.push([[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]]);
  }

  // Roads: runs of nodes in the box (and wanted), with their heights.
  const roadWays = [];
  for (const w of ways.values()) {
    const t = w.tags ?? {};
    if (!t.highway || t.area === "yes" || t.indoor === "yes") continue;
    if (["construction", "proposed", "platform", "elevator", "raceway", "abandoned"].includes(t.highway)) continue;
    if (isTunnel(t) && !tunnels) continue;
    const cls = roadClass(t.highway);
    if (cls < 0) continue;
    const pts = w.nodes.map(P);
    if (pts.some((p) => !p)) continue;
    roadWays.push({ id: w.id, tags: t, cls, nodes: w.nodes, len: w.nodes.slice(1).map((_, i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])) });
  }
  const elev = elevations(roadWays, knownElev);
  const nodeIndex = new Map(), nodeList = [];
  const idx = (nid) => { if (!nodeIndex.has(nid)) { nodeIndex.set(nid, nodeList.length); nodeList.push(nid); } return nodeIndex.get(nid); };
  const runsOut = [];
  for (const w of roadWays) {
    const flags = (isBridge(w.tags) ? 1 : 0) | (isTunnel(w.tags) ? 2 : 0);
    let run = [];
    const flush = () => { if (run.length >= 2) runsOut.push({ cls: w.cls, flags, ids: run }); run = []; };
    for (const nid of w.nodes) { const p = P(nid); if (inBox(p, 40) && keep(p[0], p[1])) run.push(nid); else flush(); }
    flush();
  }
  const uses = new Map();
  for (const r of runsOut) for (const nid of r.ids) uses.set(nid, (uses.get(nid) ?? 0) + 1);
  const rd = runsOut.map((r) => {
    const keepI = new Set([0, r.ids.length - 1]);
    r.ids.forEach((nid, i) => { if (uses.get(nid) > 1) keepI.add(i); });
    const ks = [...keepI].sort((a, b) => a - b), out = [];
    for (let k = 0; k < ks.length - 1; k++) {
      const seg = r.ids.slice(ks[k], ks[k + 1] + 1).map((nid) => [...P(nid), nid]);
      const s = simplify(seg, 0.8);
      for (let j = k === 0 ? 0 : 1; j < s.length; j++) out.push(idx(s[j][2]));
    }
    return [r.cls | (r.flags << 4), ...out];
  });
  const xyz = nodeList.map((nid) => [...P(nid), elev.get(nid) ?? 0]);
  return { buildings, water, green, land, rd, xyz };
}

const ringsOut = (list) => list.map((ring) => ring.flatMap(([x, z]) => [dm(x), dm(z)]));
function areaOut(a) {
  return {
    b: a.buildings.map((b) => [Math.round(b.h * 10), ...b.ring.flatMap(([x, z]) => [dm(x), dm(z)])]),
    n: a.xyz.flatMap(([x, z]) => [dm(x), dm(z)]),
    ny: a.xyz.map(([, , y]) => dm(y)),
    rd: a.rd, w: ringsOut(a.water), l: ringsOut(a.land), g: ringsOut(a.green),
  };
}

// ------------------------------------------------------------------ districts

async function buildDistrict(id, d) {
  const R = d.r, frame = frameAt(d.lat, d.lng), box = [-R, -R, R, R];
  console.log(`${id}: district`);
  const data = await overpass(`d-${id}-${R}-${d.lat}-${d.lng}`, AREA_QUERY(frame.bbox([-R - 60, -R - 60, R + 60, R + 60])));
  const a = processArea(data, frame, box);
  const { buildings } = a;

  // Collisions for the door slots.
  const grid = new Map(), cell = 40;
  buildings.forEach((b, i) => { const seen = new Set(); for (const [x, z] of b.ring) { const k = `${Math.floor(x / cell)},${Math.floor(z / cell)}`; if (!seen.has(k)) { seen.add(k); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); } } });
  const inAnyBuilding = (x, z) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const i of grid.get(`${Math.floor(x / cell) + dx},${Math.floor(z / cell) + dz}`) ?? []) if (inside(buildings[i].ring, x, z)) return true;
    return false;
  };
  const walkSegs = [];
  for (const r of a.rd) {
    const cls = r[0] & 15;
    if (cls === 0 || (r[0] >> 4) & 1) continue; // not on the motorway or up on a bridge
    for (let i = 1; i < r.length - 1; i++) walkSegs.push([a.xyz[r[i]], a.xyz[r[i + 1]]]);
  }
  const nearestWalk = (x, z) => {
    let best = null, bd = Infinity;
    for (const [p, q] of walkSegs) { const n = nearestOnSeg(x, z, p[0], p[1], q[0], q[1]); const dd = Math.hypot(n[0] - x, n[1] - z); if (dd < bd) { bd = dd; best = n; } }
    return best ? { p: best, d: bd } : null;
  };
  // Door slots: points along building walls facing a street, just outside, every ~10 m; the nearest the centre
  // first, at least 14 m apart (a big building gets several doors, like a mall's shopfronts).
  const cand = [];
  for (const b of buildings) {
    if (Math.hypot(b.cx, b.cz) > Math.min(R - 30, 380) || Math.abs(area(b.ring)) < 40) continue;
    for (let i = 0; i < b.ring.length; i++) {
      const p = b.ring[i], q = b.ring[(i + 1) % b.ring.length];
      const ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez);
      if (L < 4) continue;
      let nx = ez / L, nz = -ex / L;
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (inside(b.ring, mid[0] + nx * 0.5, mid[1] + nz * 0.5)) { nx = -nx; nz = -nz; }
      const k = Math.max(1, Math.floor(L / 10));
      for (let j = 0; j < k; j++) {
        const t = (j + 0.5) / k, x = p[0] + ex * t + nx * 1.6, z = p[1] + ez * t + nz * 1.6;
        const nw = nearestWalk(x, z);
        if (!nw || nw.d > 30 || inAnyBuilding(x, z)) continue;
        cand.push({ x, z, yaw: Math.atan2(-nx, -nz), d: Math.hypot(x, z) + nw.d * 0.5, h: b.h });
      }
    }
  }
  cand.sort((p, q) => p.d - q.d);
  const slots = [];
  for (const c of cand) {
    if (slots.length >= 64) break;
    if (slots.some((s) => Math.hypot(s[0] - c.x, s[1] - c.z) < 14)) continue;
    slots.push([c.x, c.z, c.yaw, c.h]);
  }
  const start = slots[0] ? [slots[0][0] - Math.sin(slots[0][2]) * 1.4, slots[0][1] - Math.cos(slots[0][2]) * 1.4] : (nearestWalk(0, 0)?.p ?? [0, 0]);
  const out = {
    v: 2, id, name: d.name, r: R, attribution: CONFIG.attribution, built: new Date().toISOString().slice(0, 10),
    start: [dm(start[0]), dm(start[1])], ...areaOut(a),
    s: slots.map(([x, z, yaw, h]) => [dm(x), dm(z), Math.round(yaw * 100) / 100, dm(h)]),
  };
  const file = path.join(OUT, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`  ${buildings.length} buildings, ${a.rd.length} roads, ${a.water.length} water, ${a.land.length} islands, ${a.green.length} green, ${slots.length} doors → ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

// ------------------------------------------------------------------ corridors

/** The route through the waypoints over the road network (one way: oneways respected), keeping to `prefer` roads. */
function routeThrough(graph, waypoints, prefer) {
  const { node, out, isPref } = graph;
  const path = [];
  for (let w = 0; w < waypoints.length - 1; w++) {
    const [ax, az] = waypoints[w], [bx, bz] = waypoints[w + 1];
    const dir = [bx - ax, bz - az], dl = Math.hypot(...dir);
    const snap = (x, z, travel) => {
      let best = null, bs = Infinity;
      for (const [id, p] of node) {
        const d = Math.hypot(p[0] - x, p[1] - z);
        if (d > 250) continue;
        const edges = out.get(id) ?? [];
        if (!edges.length) continue;
        let align = -1, pref = false;
        for (const e of edges) { const q = node.get(e.to); const ex = q[0] - p[0], ez = q[1] - p[1], el = Math.hypot(ex, ez) || 1; align = Math.max(align, (ex * travel[0] + ez * travel[1]) / (el * dl)); pref ||= e.pref; }
        const score = d + (1 - align) * 120 + (pref ? 0 : 150);
        if (score < bs) { bs = score; best = id; }
      }
      return best;
    };
    const a = w === 0 ? snap(ax, az, dir) : path[path.length - 1].id;
    const b = snap(bx, bz, dir);
    if (a == null || b == null) throw new Error(`can't find the road near waypoint ${w}`);
    // A*.
    const g = new Map([[a, 0]]), prev = new Map(), heap = new Heap();
    const h = (id) => Math.hypot(node.get(id)[0] - node.get(b)[0], node.get(id)[1] - node.get(b)[1]);
    heap.push(h(a), a);
    while (heap.size) {
      const [, u] = heap.pop();
      if (u === b) break;
      for (const e of out.get(u) ?? []) {
        const c = g.get(u) + e.cost;
        if (c < (g.get(e.to) ?? Infinity)) { g.set(e.to, c); prev.set(e.to, { from: u, way: e.way }); heap.push(c + h(e.to), e.to); }
      }
    }
    if (!prev.has(b) && a !== b) throw new Error(`no route from waypoint ${w} to ${w + 1}`);
    const seg = [];
    for (let u = b; u !== a; u = prev.get(u).from) seg.unshift({ id: u, way: prev.get(u).way });
    if (!path.length) path.push({ id: a, way: seg[0]?.way });
    path.push(...seg);
  }
  void prefer; void isPref;
  return path;
}

async function buildCorridor(id, c) {
  console.log(`${id}: corridor`);
  const [lat0, lng0] = c.waypoints[0];
  const frame = frameAt(lat0, lng0);
  const wp = c.waypoints.map(([la, ln]) => frame.xz(la, ln));
  const pad = 1500;
  const xs = wp.map((p) => p[0]), zs = wp.map((p) => p[1]);
  const big = [Math.min(...xs) - pad, Math.min(...zs) - pad, Math.max(...xs) + pad, Math.max(...zs) + pad];
  const roadsRe = `^(${c.roads})$`;
  const net = await overpass(`c-${id}-net-${big.map(Math.round).join("_")}`, `[out:json][timeout:180];
(way["highway"~"${roadsRe}"](${frame.bbox(big)}););
(._;>;);
out body qt;`);
  const node = new Map(), ways = [];
  for (const el of net.elements) {
    if (el.type === "node") node.set(el.id, frame.xz(el.lat, el.lon));
    else if (el.type === "way") ways.push(el);
  }
  const prefRe = new RegExp(c.prefer, "i");
  const out = new Map();
  const roadWays = [];
  const wayInfo = new Map();
  for (const w of ways) {
    const t = w.tags ?? {};
    const pts = w.nodes.map((n) => node.get(n));
    if (pts.some((p) => !p)) continue;
    const len = w.nodes.slice(1).map((_, i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
    roadWays.push({ id: w.id, tags: t, nodes: w.nodes, len });
    const pref = prefRe.test(`${t.name ?? ""} ${t["name:en"] ?? ""} ${t.ref ?? ""}`);
    const link = /_link$/.test(t.highway);
    const factor = (pref ? 1 : 3) * (link ? 1.4 : 1);
    const lanes = parseInt(t.lanes) || (/motorway|trunk/.test(t.highway) ? 3 : 2);
    wayInfo.set(w.id, { lanes, tunnel: isTunnel(t), bridge: isBridge(t), pref });
    const oneway = t.oneway === "yes" || t.oneway === "1" || t.junction === "roundabout" || /^motorway/.test(t.highway) && t.oneway !== "no";
    const reverse = t.oneway === "-1";
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const [a, b] = reverse ? [w.nodes[i + 1], w.nodes[i]] : [w.nodes[i], w.nodes[i + 1]];
      const cost = len[i] * factor;
      (out.get(a) ?? out.set(a, []).get(a)).push({ to: b, cost, way: w.id, pref });
      if (!oneway && !reverse) (out.get(b) ?? out.set(b, []).get(b)).push({ to: a, cost, way: w.id, pref });
    }
  }
  const elev = elevations(roadWays);
  const graph = { node, out };
  const toPath = (route) => {
    const pts = [];
    for (const r of route) {
      const p = node.get(r.id), info = wayInfo.get(r.way) ?? { lanes: 3, tunnel: false };
      if (pts.length && Math.hypot(p[0] - pts[pts.length - 1].x, p[1] - pts[pts.length - 1].z) < 3) continue;
      pts.push({ x: p[0], z: p[1], y: elev.get(r.id) ?? 0, lanes: info.lanes, tunnel: info.tunnel, id: r.id });
    }
    let s = 0;
    pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.s = s; });
    return pts;
  };
  const fwd = toPath(routeThrough(graph, wp));
  const back = toPath(routeThrough(graph, wp.slice().reverse()));
  console.log(`  route: ${(fwd[fwd.length - 1].s / 1000).toFixed(1)} km one way, ${(back[back.length - 1].s / 1000).toFixed(1)} km back`);
  const nearestS = (pts, x, z, from = 0, to = Infinity) => {
    let best = { s: 0, d: Infinity };
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i + 1].s < from || pts[i].s > to) continue;
      const [nx, nz, t] = nearestOnSeg(x, z, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      const d = Math.hypot(nx - x, nz - z);
      if (d < best.d) best = { s: pts[i].s + t * (pts[i + 1].s - pts[i].s), d };
    }
    return best;
  };
  // The route's own nodes keep the heights worked out over the whole network.
  const known = new Map();
  for (const p of [...fwd, ...back]) known.set(p.id, p.y);
  for (const [n, e] of elev) if (e) known.set(n, e);

  const total = fwd[fwd.length - 1].s, piece = c.piece, count = Math.ceil(total / piece), W = c.width;
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const chunks = [];
  for (let k = 0; k < count; k++) {
    const s0 = k * piece, s1 = Math.min(total, (k + 1) * piece);
    const near = fwd.filter((p) => p.s >= s0 - 150 && p.s <= s1 + 150);
    const bx = near.map((p) => p.x), bz = near.map((p) => p.z);
    const box = [Math.min(...bx) - W - 30, Math.min(...bz) - W - 30, Math.max(...bx) + W + 30, Math.max(...bz) + W + 30].map(Math.round);
    const data = await overpass(`c-${id}-${k}-${box.join("_")}`, AREA_QUERY(frame.bbox(box)));
    const keep = (x, z) => nearestS(fwd, x, z, s0 - 400, s1 + 400).d < W + 40 || nearestS(back, x, z).d < 60;
    const owns = (x, z) => { const n = nearestS(fwd, x, z); return n.s >= s0 && (n.s < s1 || k === count - 1); };
    const a = processArea(data, frame, box, { keep, owns, tunnels: true, knownElev: known });
    const file = path.join(dir, `${k}.json`);
    fs.writeFileSync(file, JSON.stringify({ v: 2, k, ...areaOut(a) }));
    chunks.push({ k, s0: Math.round(s0), s1: Math.round(s1), box: box.map(dm) });
    console.log(`  piece ${k + 1}/${count}: ${a.buildings.length} buildings, ${a.rd.length} roads, ${a.water.length} water → ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  const pathOut = (pts) => pts.flatMap((p) => [dm(p.x), dm(p.z), dm(p.y), p.lanes, p.tunnel ? 1 : 0]);
  const exits = c.exits.map((e) => {
    const [x, z] = frame.xz(e.lat, e.lng);
    return { id: e.id, name: e.name, sF: Math.round(nearestS(fwd, x, z).s), sB: Math.round(nearestS(back, x, z).s), areas: e.areas, places: e.places ?? [] };
  });
  const index = {
    v: 2, id, name: c.name, attribution: CONFIG.attribution, built: new Date().toISOString().slice(0, 10), piece,
    fwd: pathOut(fwd), back: pathOut(back), length: [Math.round(total), Math.round(back[back.length - 1].s)], chunks, exits,
  };
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(index));
  console.log(`  exits: ${exits.map((e) => `${e.id} ${(e.sF / 1000).toFixed(1)}/${(e.sB / 1000).toFixed(1)} km`).join(", ")}`);
}

const only = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
for (const [id, d] of Object.entries(CONFIG.districts)) if (!only || only === id) await buildDistrict(id, d);
for (const [id, c] of Object.entries(CONFIG.corridors ?? {})) if (!only || only === id) await buildCorridor(id, c);
