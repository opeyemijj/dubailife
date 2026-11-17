"use client";

// Out on the real streets: the part of Dubai you stepped out into, built from OpenStreetMap (lib/city/osmDistrict):
// every building at its real footprint and height (with windows, lit at night), the real roads, pavements and
// footpaths, the water and the parks, palms along the main roads, traffic keeping right, and Locals out walking.
// Walk anywhere with the stick (buildings are solid); the doors of the places nearby are on the buildings closest
// to you, nearest first. "Where to?" walks you there along the streets. Other players are here too, live.
// Map data © OpenStreetMap contributors (shown on screen by StreetPage, and in /credits).
//
// Like every scene here, it moves three.js objects (and the camera) frame by frame, outside React's render.
/* eslint-disable react-hooks/immutability */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { Flies } from "@/components/avatar/Flies";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { canvasQuality } from "@/lib/device";
import type { Peer } from "@/lib/room";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { blocked, ROAD_CLASSES, type District, type OsmArea } from "@/lib/city/osmDistrict";
import { Walker, type AutoWalk, type Controls, type StreetDoor } from "./StreetWorld";

const WALK = 1.8, RUN = 5.2;
const GROUND_Y = 0.06;

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- geometry

/** A flat polygon (water, a park) at height y. */
function flatPolys(rings: Float32Array[], y: number) {
  const pos: number[] = [];
  for (const r of rings) {
    const contour: THREE.Vector2[] = [];
    for (let i = 0; i < r.length; i += 2) contour.push(new THREE.Vector2(r[i], r[i + 1]));
    if (contour.length < 3) continue;
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const t of tris) {
      // Facing up only: from below (driving through a cutting or a tunnel) you see the sky, not the underside.
      const [a, b, c] = t.map((k) => contour[k]);
      const up = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y) > 0;
      for (const p of up ? [a, b, c] : [a, c, b]) pos.push(p.x, y, p.y);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return g;
}

/** Ribbons along polylines (roads, pavements, lane dashes), with round joints so corners close up. */
/** A point along a road: x, z and its height (up on a flyover, down in a tunnel). */
export type RoadPt = [number, number, number];
function ribbons(lines: Array<{ pts: RoadPt[]; w: number }>, y: number, dash?: { on: number; off: number }) {
  const pos: number[] = [];
  const quad = (ax: number, az: number, ay: number, bx: number, bz: number, by: number, hw: number) => {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * hw, nz = (dx / L) * hw;
    ay += y; by += y;
    pos.push(ax + nx, ay, az + nz, bx + nx, by, bz + nz, bx - nx, by, bz - nz, ax + nx, ay, az + nz, bx - nx, by, bz - nz, ax - nx, ay, az - nz);
  };
  const disc = (x: number, z: number, h: number, r: number) => {
    const n = 10, yy = h + y;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
      pos.push(x, yy, z, x + Math.cos(b) * r, yy, z + Math.sin(b) * r, x + Math.cos(a) * r, yy, z + Math.sin(a) * r);
    }
  };
  for (const { pts, w } of lines) {
    const hw = w / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az, ah] = pts[i], [bx, bz, bh] = pts[i + 1];
      if (!dash) { quad(ax, az, ah, bx, bz, bh, hw); continue; }
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s + dash.on <= L; s += dash.on + dash.off) {
        const t0 = s / L, t1 = (s + dash.on) / L;
        quad(ax + (bx - ax) * t0, az + (bz - az) * t0, ah + (bh - ah) * t0, ax + (bx - ax) * t1, az + (bz - az) * t1, ah + (bh - ah) * t1, hw);
      }
    }
    if (!dash) for (const [x, z, h] of pts) disc(x, z, h, hw);
  }
  // Every triangle faces up whichever way it was wound (the material is double-sided; normals are set straight up).
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return g;
}

const LOW_TONES = ["#efe6d6", "#e8dcc6", "#f3efe7", "#e2d3b8", "#ede4d3", "#d9cdb7"];
const TALL_TONES = ["#c9d6e0", "#b9cad8", "#dfe5ea", "#aebfcd", "#e9e5dc", "#c4cfd6"];

/** Every building's walls (with window UVs) in one geometry, and every roof in another. */
function buildingGeometry(d: OsmArea) {
  const wp: number[] = [], wuv: number[] = [], wc: number[] = [], rp: number[] = [], rc: number[] = [];
  const col = new THREE.Color();
  d.buildings.forEach((b, bi) => {
    const r = b.ring, n = r.length / 2, h = b.h;
    let area2 = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area2 += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1]; }
    const tones = h > 30 ? TALL_TONES : LOW_TONES;
    col.set(tones[Math.floor(hash(bi) * tones.length)]);
    const shade = 0.92 + hash(bi + 7) * 0.08;
    const cr = col.r * shade, cg = col.g * shade, cb = col.b * shade;
    // Walls: one quad per edge, wound so it faces out.
    let along = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = r[i * 2], az = r[i * 2 + 1], bx = r[j * 2], bz = r[j * 2 + 1];
      const L = Math.hypot(bx - ax, bz - az);
      const u0 = along / 3.5 / 8, u1 = (along + L) / 3.5 / 8, v1 = h / 3.4 / 8;
      along += L;
      const A0 = [ax, 0, az], B0 = [bx, 0, bz], B1 = [bx, h, bz], A1 = [ax, h, az];
      const uvA0 = [u0, 0], uvB0 = [u1, 0], uvB1 = [u1, v1], uvA1 = [u0, v1];
      const tris = area2 > 0 ? [[A0, B1, B0, uvA0, uvB1, uvB0], [A0, A1, B1, uvA0, uvA1, uvB1]] : [[A0, B0, B1, uvA0, uvB0, uvB1], [A0, B1, A1, uvA0, uvB1, uvA1]];
      for (const t of tris) {
        wp.push(...t[0], ...t[1], ...t[2]);
        wuv.push(...t[3], ...t[4], ...t[5]);
        for (let k = 0; k < 3; k++) wc.push(cr, cg, cb);
      }
    }
    // The roof.
    const contour: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(r[i * 2], r[i * 2 + 1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const roof = h > 30 ? 0.62 : 0.8;
    for (const t of tris) {
      // Wound to face up (so it's solid from above and see-through from below).
      const [a, b, c] = t.map((k) => contour[k]);
      const up = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y) > 0;
      for (const p of up ? [a, b, c] : [a, c, b]) { rp.push(p.x, h, p.y); rc.push(cr * roof, cg * roof, cb * roof); }
    }
  });
  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
  walls.setAttribute("uv", new THREE.Float32BufferAttribute(wuv, 2));
  walls.setAttribute("color", new THREE.Float32BufferAttribute(wc, 3));
  walls.computeVertexNormals();
  const roofs = new THREE.BufferGeometry();
  roofs.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  roofs.setAttribute("color", new THREE.Float32BufferAttribute(rc, 3));
  const nrm = new Float32Array(rp.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  roofs.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return { walls, roofs };
}

/** 8 × 8 storeys of windows (white wall, so the building's colour tints it); at night some are lit. */
function windowTextures(night: boolean) {
  const S = 512, c = document.createElement("canvas"), e = document.createElement("canvas");
  c.width = c.height = e.width = e.height = S;
  const g = c.getContext("2d")!, ge = e.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, S, S);
  ge.fillStyle = "#000000"; ge.fillRect(0, 0, S, S);
  const cell = S / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const px = x * cell + cell * 0.16, py = y * cell + cell * 0.22, w = cell * 0.68, h = cell * 0.52;
    g.fillStyle = hash(x * 13 + y) > 0.5 ? "#7d97b0" : "#6a849e"; g.fillRect(px, py, w, h);
    if (night && hash(x * 7 + y * 31 + 3) > 0.42) { ge.fillStyle = hash(x + y * 3) > 0.3 ? "#ffd98a" : "#cfe8ff"; ge.fillRect(px, py, w, h); }
  }
  const map = new THREE.CanvasTexture(c), emissive = new THREE.CanvasTexture(e);
  for (const t of [map, emissive]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
  return { map, emissive };
}

/** Pillars under the flyovers, every ~28 m. */
function pillarSpots(d: OsmArea) {
  const out: Array<[number, number, number]> = [];
  for (const r of d.roads) {
    if (!r.bridge) continue;
    for (let i = 0; i < r.idx.length - 1 && out.length < 1500; i++) {
      const a = r.idx[i], b = r.idx[i + 1];
      const ax = d.nodes[a * 2], az = d.nodes[a * 2 + 1], bx = d.nodes[b * 2], bz = d.nodes[b * 2 + 1], ah = d.heights[a], bh = d.heights[b];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = 14; s < L; s += 28) { const t = s / L, h = ah + (bh - ah) * t; if (h > 2.5) out.push([ax + (bx - ax) * t, az + (bz - az) * t, h]); }
    }
  }
  return out;
}

export function City({ d, night, ground = true }: { d: OsmArea; night: boolean; /** The sand underfoot (a drive brings its own, following the car). */ ground?: boolean }) {
  const parts = useMemo(() => {
    const line = (idx: number[]) => idx.map((i): RoadPt => [d.nodes[i * 2], d.nodes[i * 2 + 1], d.heights[i] ?? 0]);
    const car = d.roads.filter((r) => !ROAD_CLASSES[r.cls]?.foot).map((r) => ({ pts: line(r.idx), w: ROAD_CLASSES[r.cls].w }));
    const foot = d.roads.filter((r) => ROAD_CLASSES[r.cls]?.foot).map((r) => ({ pts: line(r.idx), w: ROAD_CLASSES[r.cls].w }));
    // Pavements along the town's roads (a strip each side of the carriageway; not up on the flyovers).
    const pave = d.roads.filter((r) => r.cls >= 1 && r.cls <= 3 && !r.bridge && !r.tunnel).map((r) => ({ pts: line(r.idx), w: ROAD_CLASSES[r.cls].w + 5 }));
    const dashes = d.roads.filter((r) => r.cls <= 2).map((r) => ({ pts: line(r.idx), w: 0.18 }));
    const { walls, roofs } = buildingGeometry(d);
    return {
      walls, roofs,
      water: flatPolys(d.water, 0.02), land: flatPolys(d.land, 0.03), green: flatPolys(d.green, 0.04),
      foot: ribbons([...pave, ...foot], 0.05), roads: ribbons(car, 0.07), dashes: ribbons(dashes, 0.09, { on: 3, off: 5 }),
    };
  }, [d]);
  const pillars = useMemo(() => pillarSpots(d), [d]);
  const pillarRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    pillars.forEach(([x, z, h], i) => pillarRef.current?.setMatrixAt(i, m.compose(p.set(x, h / 2, z), q, sc.set(1, h, 1))));
    if (pillarRef.current) pillarRef.current.instanceMatrix.needsUpdate = true;
  }, [pillars]);
  const tex = useMemo(() => windowTextures(night), [night]);
  useEffect(() => () => { Object.values(parts).forEach((g) => g.dispose()); }, [parts]);
  useEffect(() => () => { tex.map.dispose(); tex.emissive.dispose(); }, [tex]);
  const flat = (color: string, offset: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
    <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={offset} polygonOffsetUnits={offset} {...extra} />
  );
  const sand = night ? "#8a7f6a" : "#e4d5b7";
  const size = "r" in d ? (d as District).r * 2 + 900 : 0;
  return (
    <group>
      {ground && size > 0 && <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><planeGeometry args={[size, size]} /><meshStandardMaterial color={sand} roughness={1} /></mesh>}
      <mesh geometry={parts.water} raycast={() => null}>{flat(night ? "#1d4f78" : "#3aa0d0", -1, { roughness: 0.35, side: THREE.FrontSide })}</mesh>
      <mesh geometry={parts.land} raycast={() => null}>{flat(sand, -2, { side: THREE.FrontSide })}</mesh>
      <mesh geometry={parts.green} raycast={() => null}>{flat(night ? "#2f4a2a" : "#86b85a", -3, { side: THREE.FrontSide })}</mesh>
      <mesh geometry={parts.foot} raycast={() => null}>{flat(night ? "#9a9284" : "#d9cfbf", -4)}</mesh>
      <mesh geometry={parts.roads} raycast={() => null}>{flat(night ? "#3a3d44" : "#3d424a", -5)}</mesh>
      <mesh geometry={parts.dashes} raycast={() => null}>{flat("#f1f5f9", -6, { emissive: night ? "#555" : "#000" })}</mesh>
      {pillars.length > 0 && (
        <instancedMesh ref={pillarRef} args={[undefined, undefined, pillars.length]} raycast={() => null}>
          <boxGeometry args={[1.6, 1, 1.6]} /><meshStandardMaterial color={night ? "#77736b" : "#cfc8bb"} roughness={0.9} />
        </instancedMesh>
      )}
      <mesh geometry={parts.walls} raycast={() => null}>
        <meshStandardMaterial vertexColors map={tex.map} emissiveMap={night ? tex.emissive : null} emissive={night ? "#ffffff" : "#000000"} emissiveIntensity={night ? 1.1 : 0} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh geometry={parts.roofs} raycast={() => null}><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
    </group>
  );
}

/** Palms along the main roads, both sides, as two instanced meshes. */
export function Palms({ d, solid }: { d: OsmArea; /** Is a spot taken (inside a building)? */ solid?: (x: number, z: number) => boolean }) {
  const spots = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (const r of d.roads) {
      if (r.cls < 1 || r.cls > 3 || r.bridge || r.tunnel) continue;
      const off = ROAD_CLASSES[r.cls].w / 2 + 1.6;
      for (let i = 0; i < r.idx.length - 1 && out.length < 320; i++) {
        const ax = d.nodes[r.idx[i] * 2], az = d.nodes[r.idx[i] * 2 + 1], bx = d.nodes[r.idx[i + 1] * 2], bz = d.nodes[r.idx[i + 1] * 2 + 1];
        const L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
        for (let s = 8; s < L - 4; s += 24) {
          const t = s / L, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          for (const side of [1, -1]) {
            const px = x + nx * off * side, pz = z + nz * off * side;
            if (!solid?.(px, pz)) out.push([px, pz, hash(px * 3 + pz)]);
          }
        }
      }
    }
    return out;
  }, [d, solid]);
  const trunk = useRef<THREE.InstancedMesh>(null), crown = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    spots.forEach(([x, z, k], i) => {
      const h = 5.5 + k * 2.5;
      trunk.current?.setMatrixAt(i, m.compose(p.set(x, h / 2, z), q.identity(), s.set(1, h / 6.5, 1)));
      crown.current?.setMatrixAt(i, m.compose(p.set(x, h + 0.3, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * 6), s.set(1, 1, 1)));
    });
    if (trunk.current) trunk.current.instanceMatrix.needsUpdate = true;
    if (crown.current) crown.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  if (!spots.length) return null;
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, spots.length]} raycast={() => null}><cylinderGeometry args={[0.16, 0.26, 6.5, 6]} /><meshStandardMaterial color="#8b6b4a" roughness={1} /></instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, spots.length]} raycast={() => null}><coneGeometry args={[2.4, 1.6, 7, 1, true]} /><meshStandardMaterial color="#3f7d3a" roughness={0.9} side={THREE.DoubleSide} /></instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------- doors and signs

function signTexture(text: string, bg: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 112;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, 504, 104, 22); g.fill();
  g.fillStyle = "#ffffff"; g.font = "800 46px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  let t = text;
  while (g.measureText(t).width > 470 && t.length > 4) t = t.slice(0, -2);
  g.fillText(t === text ? t : `${t.trimEnd()}…`, 256, 58);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

function Door({ door, night }: { door: StreetDoor & { yaw?: number }; night: boolean }) {
  const bg = door.mine ? "#059669" : door.prop ? "#d97706" : door.shop ? (door.color ?? "#0f172a") : "#0f172a";
  const tex = useMemo(() => signTexture(`${door.icon} ${door.name}`, bg), [door.icon, door.name, bg]);
  useEffect(() => () => tex.dispose(), [tex]);
  // In the door's frame +z points at the wall, which is 1.6 m in front of the spot.
  return (
    <group position={[door.x, GROUND_Y, door.z]} rotation={[0, door.yaw ?? 0, 0]}>
      {!door.prop && (
        <>
          <mesh position={[0, 1.3, 1.5]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.9, 2.6]} /><meshStandardMaterial color="#0b1220" roughness={0.2} metalness={0.6} emissive={night ? "#3b2a10" : "#000"} /></mesh>
          <mesh position={[0, 1.3, 1.52]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.2, 2.85]} /><meshStandardMaterial color={bg} /></mesh>
        </>
      )}
      <mesh position={[0, door.prop ? 2.4 : 3.45, door.prop ? 0 : 1.45]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.4, 0.96]} />
        <meshBasicMaterial map={tex} transparent side={door.prop ? THREE.DoubleSide : THREE.FrontSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><ringGeometry args={[0.9, 1.15, 32]} /><meshBasicMaterial color={door.mine ? "#34d399" : "#facc15"} transparent opacity={0.85} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- traffic and Locals

/** Walks a graph node to node, never straight back unless it's a dead end. */
function nextNode(adj: number[][], from: number, at: number, seed: number) {
  const opts = adj[at].filter((n) => n !== from);
  if (!opts.length) return from;
  return opts[Math.floor(hash(seed) * opts.length) % opts.length];
}

export function Traffic({ d }: { d: OsmArea }) {
  // Cars only on the roads (not service lanes or paths), keeping right.
  const carAdj = useMemo(() => {
    const adj: number[][] = Array.from({ length: d.nodes.length / 2 }, () => []);
    const width = new Map<string, number>();
    for (const r of d.roads) {
      if (r.cls > 3) continue;
      for (let i = 0; i < r.idx.length - 1; i++) {
        const a = r.idx[i], b = r.idx[i + 1];
        adj[a].push(b); adj[b].push(a);
        width.set(`${a}-${b}`, ROAD_CLASSES[r.cls].w); width.set(`${b}-${a}`, ROAD_CLASSES[r.cls].w);
      }
    }
    return { adj, width };
  }, [d]);
  const cars = useMemo(() => {
    const starts = carAdj.adj.map((n, i) => (n.length ? i : -1)).filter((i) => i >= 0);
    if (!starts.length) return [];
    return Array.from({ length: Math.min(16, Math.ceil(starts.length / 6)) }, (_, i) => {
      const a = starts[Math.floor(hash(i + 1) * starts.length)];
      return { from: a, to: carAdj.adj[a][0], t: hash(i + 9), speed: 8 + hash(i + 3) * 6, taxi: i % 4 === 0, color: ["#f8fafc", "#0f172a", "#9ca3af", "#1e3a8a", "#7f1d1d"][i % 5], seed: i * 101 };
    });
  }, [carAdj]);
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    cars.forEach((c, i) => {
      const ax = d.nodes[c.from * 2], az = d.nodes[c.from * 2 + 1], bx = d.nodes[c.to * 2], bz = d.nodes[c.to * 2 + 1];
      const L = Math.hypot(bx - ax, bz - az) || 1;
      c.t += (c.speed * dt) / L;
      if (c.t >= 1) { c.seed++; const n = nextNode(carAdj.adj, c.from, c.to, c.seed); c.from = c.to; c.to = n; c.t = 0; return; }
      const w = carAdj.width.get(`${c.from}-${c.to}`) ?? 7;
      const dx = (bx - ax) / L, dz = (bz - az) / L, off = w * 0.25;
      const g = refs.current[i];
      if (g) { g.position.set(ax + (bx - ax) * c.t - dz * off, GROUND_Y + d.heights[c.from] + (d.heights[c.to] - d.heights[c.from]) * c.t, az + (bz - az) * c.t + dx * off); g.rotation.y = Math.atan2(dx, dz); }
    });
  });
  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}>
          <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.8, 0.7, 4.3]} /><meshStandardMaterial color={c.taxi ? "#efe2c2" : c.color} metalness={0.4} roughness={0.35} /></mesh>
          <mesh position={[0, 1.1, -0.2]}><boxGeometry args={[1.6, 0.5, 2.2]} /><meshStandardMaterial color={c.taxi ? "#b91c1c" : "#1e293b"} roughness={0.2} metalness={0.5} /></mesh>
          {[[-0.8, 1.4], [0.8, 1.4], [-0.8, -1.4], [0.8, -1.4]].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.22, 10]} /><meshStandardMaterial color="#111" /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

let localTag: THREE.CanvasTexture | null = null;
function localTagTexture() {
  if (localTag) return localTag;
  const c = document.createElement("canvas"); c.width = 128; c.height = 44;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f59e0b"; g.beginPath(); g.roundRect(2, 2, 124, 40, 20); g.fill();
  g.fillStyle = "#fff"; g.font = "900 24px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Local", 64, 23);
  localTag = new THREE.CanvasTexture(c); localTag.colorSpace = THREE.SRGBColorSpace;
  return localTag;
}

/** Locals (the game's hosts, always labelled) out for a walk round the streets near you. */
function Locals({ d, near }: { d: District; near: [number, number] }) {
  const people = useMemo(() => {
    const close = d.adj.map((n, i) => (n.length && Math.hypot(d.nodes[i * 2] - near[0], d.nodes[i * 2 + 1] - near[1]) < 160 ? i : -1)).filter((i) => i >= 0);
    if (!close.length) return [];
    return Array.from({ length: Math.min(8, close.length) }, (_, i) => {
      const a = close[Math.floor(hash(i + 50) * close.length)];
      return { from: a, to: d.adj[a][0], t: hash(i), speed: 1.1 + hash(i + 2) * 0.4, seed: i * 37, look: { gender: i % 3 === 0 ? "woman" : "man" } as AvatarLookProps };
    });
  }, [d, near]);
  const refs = useRef<Array<THREE.Group | null>>([]);
  const tag = useMemo(() => localTagTexture(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    people.forEach((p, i) => {
      const ax = d.nodes[p.from * 2], az = d.nodes[p.from * 2 + 1], bx = d.nodes[p.to * 2], bz = d.nodes[p.to * 2 + 1];
      const L = Math.hypot(bx - ax, bz - az) || 1;
      p.t += (p.speed * dt) / L;
      if (p.t >= 1) { p.seed++; const n = nextNode(d.adj, p.from, p.to, p.seed); p.from = p.to; p.to = n; p.t = 0; return; }
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      const g = refs.current[i];
      // On the right-hand edge of the path, like the pavement.
      if (g) { g.position.set(ax + (bx - ax) * p.t - dz * 1.2, GROUND_Y, az + (bz - az) * p.t + dx * 1.2); g.rotation.y = Math.atan2(dx, dz); }
    });
  });
  return (
    <group>
      {people.map((p, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}>
          <Suspense fallback={null}><CitizenAvatar look={p.look} animation="walk" /></Suspense>
          <sprite position={[0, 2.2, 0]} scale={[0.9, 0.31, 1]}><spriteMaterial map={tag} depthWrite={false} /></sprite>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- me

function Me({ d, look, dirty, controls, run, auto, start, onMove, onNear, doors }: {
  d: District; look?: AvatarLookProps; dirty: boolean; controls: React.RefObject<Controls>; run: boolean; auto: React.RefObject<AutoWalk | null>;
  start: { x: number; z: number; yaw: number }; onMove: (x: number, z: number, yaw: number, moving: boolean, running: boolean) => void;
  onNear: (door: StreetDoor | null) => void; doors: StreetDoor[];
}) {
  const g = useRef<THREE.Group>(null);
  const pos = useRef({ x: start.x, z: start.z, yaw: start.yaw });
  const vel = useRef({ x: 0, z: 0 });
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  const keys = useRef(new Set<string>());
  const near = useRef<string | null>(null);
  const lastSent = useRef({ t: 0, moving: false });
  const controlsObj = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (!(e.target instanceof HTMLInputElement)) keys.current.add(e.key.toLowerCase()); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), P = pos.current, o = g.current;
    if (!o) return;
    const k = keys.current;
    const kx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const ky = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const ix = controls.current.x + kx, iy = controls.current.y + ky, inputLen = Math.hypot(ix, iy);
    const running = run || k.has("shift") || !!controls.current.sprint;
    let tvx = 0, tvz = 0, guided = false;
    if (inputLen > 0.04) {
      auto.current = null; // taking the stick takes over from "Where to?"
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const speed = (running ? RUN : WALK) * Math.min(1, inputLen);
      tvx = (right.x * ix + fwd.x * iy) / inputLen * speed;
      tvz = (right.z * ix + fwd.z * iy) / inputLen * speed;
    } else if (auto.current?.points.length) {
      guided = true;
      const [tx, tz] = auto.current.points[0];
      const dx = tx - P.x, dz = tz - P.z, dd = Math.hypot(dx, dz), speed = auto.current.run ? RUN : WALK;
      if (dd < 0.35) {
        auto.current.points.shift();
        if (!auto.current.points.length) { const then = auto.current.then; auto.current = null; then?.(); }
      } else { tvx = (dx / dd) * speed; tvz = (dz / dd) * speed; }
    }
    const rate = tvx || tvz ? 14 : 12;
    vel.current.x += (tvx - vel.current.x) * Math.min(1, dt * rate);
    vel.current.z += (tvz - vel.current.z) * Math.min(1, dt * rate);
    if (Math.hypot(vel.current.x, vel.current.z) < 0.005) vel.current.x = vel.current.z = 0;
    const vx = vel.current.x, vz = vel.current.z;
    const moving = Math.hypot(vx, vz) > 0.02;
    const ox = P.x, oz = P.z;
    // Buildings are solid: slide along a wall rather than stopping dead. ("Where to?" follows the streets, so it's trusted.)
    const nx = P.x + vx * dt, nz = P.z + vz * dt;
    if (guided || !blocked(d, nx, nz)) { P.x = nx; P.z = nz; }
    else if (!blocked(d, nx, P.z)) P.x = nx;
    else if (!blocked(d, P.x, nz)) P.z = nz;
    if (moving) {
      const want = Math.atan2(vx, vz), diff = Math.atan2(Math.sin(want - P.yaw), Math.cos(want - P.yaw));
      P.yaw += diff * Math.min(1, dt * 12);
    }
    o.position.set(P.x, GROUND_Y, P.z);
    o.rotation.y = P.yaw;
    if (controlsObj) {
      const dx = P.x - ox, dz = P.z - oz;
      controlsObj.target.x += dx; controlsObj.target.z += dz;
      camera.position.x += dx; camera.position.z += dz;
      controlsObj.update();
    }
    const nextAnim: AvatarAnimation = moving ? (running ? "run" : "walk") : "idle";
    if (nextAnim !== anim) setAnim(nextAnim);
    const now = performance.now();
    if (!lastSent.current.t || moving !== lastSent.current.moving || (moving && now - lastSent.current.t > 800)) {
      lastSent.current = { t: now, moving };
      onMove(P.x, P.z, P.yaw, moving, running);
    }
    let best: StreetDoor | null = null, bd = 2.4;
    for (const door of doors) { const dd = Math.hypot(P.x - door.x, P.z - door.z); if (dd < bd) { bd = dd; best = door; } }
    if ((best?.id ?? null) !== near.current) { near.current = best?.id ?? null; onNear(best); }
  });

  return (
    <group ref={g} position={[start.x, GROUND_Y, start.z]} rotation={[0, start.yaw, 0]}>
      <Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense>
      {dirty && <Flies />}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><ringGeometry args={[0.38, 0.46, 32]} /><meshBasicMaterial color="#facc15" transparent opacity={0.8} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the scene

export function OsmScene({ district, doors, look, dirty, controls, run, auto, peers, onMove, onNear }: {
  district: District; doors: Array<StreetDoor & { yaw?: number }>; look?: AvatarLookProps; dirty: boolean; controls: React.RefObject<Controls>; run: boolean;
  auto: React.RefObject<AutoWalk | null>; peers: Peer[]; onMove: (x: number, z: number, yaw: number, moving: boolean, running: boolean) => void; onNear: (d: StreetDoor | null) => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  // Out of your own door, a step into the street, facing it; the camera out in the street looking back at you and
  // the door you came out of.
  const mine = doors.find((d) => d.mine);
  const start = useMemo(() => {
    const yaw = (mine?.yaw ?? 0) + Math.PI;
    return { x: (mine?.x ?? district.start[0]) + Math.sin(yaw) * 1.2, z: (mine?.z ?? district.start[1]) + Math.cos(yaw) * 1.2, yaw };
  }, [mine, district]);
  const cam: [number, number, number] = [start.x + Math.sin(start.yaw) * 15, 11, start.z + Math.cos(start.yaw) * 15];
  const near = useMemo<[number, number]>(() => [start.x, start.z], [start]);
  const solid = useCallback((x: number, z: number) => blocked(district, x, z, 1), [district]);
  return (
    <Canvas dpr={quality.dpr} camera={{ position: cam, fov: 62, near: 0.3, far: 3000 }}>
      <PerfProbe scene="OsmWorld" />
      <SkyAndLight sky={sky} />
      <fog attach="fog" args={[night ? "#16213a" : "#dbe7f3", 160, 900]} />
      {/* Street lighting: the city never really goes dark. */}
      <ambientLight intensity={night ? 0.9 : 0.35} color={night ? "#9fb3d9" : "#ffffff"} />
      <City d={district} night={night} />
      <Palms d={district} solid={solid} />
      <Traffic d={district} />
      <Locals d={district} near={near} />
      {doors.map((door) => <Door key={door.id} door={door} night={night} />)}
      {peers.map((p) => <Walker key={p.userId} peer={p} />)}
      <Me d={district} look={look} dirty={dirty} controls={controls} run={run} auto={auto} start={start} onMove={onMove} onNear={onNear} doors={doors} />
      <OrbitControls makeDefault target={[start.x, 1.4, start.z]} enablePan={false} enableDamping minDistance={4} maxDistance={60} minPolarAngle={0.3} maxPolarAngle={1.45} />
    </Canvas>
  );
}
