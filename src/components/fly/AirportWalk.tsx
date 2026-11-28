"use client";

// The airport walk: you walk the departures terminal yourself, the way you would for real (DXB Terminal 3, AUH
// Terminal A or Doha's Hamad International, each with its own look, gate letter, landmark and real-life tips:
// src/data/flights/airport-walk.json). Steer with the stick (or WASD); walls, pillars, counters, belts and barriers are
// solid, and luggage carts and a floor cleaner come past to dodge. The steps:
//   1. the departures board: find your flight's check-in row;
//   2. check-in: take your suitcase to your airline's row and put it on the belt (a quick question first);
//   3. passport control: step into an e-gate, scan your passport, and it opens;
//   4. security: sort your things (tray, bin or bag), put your cabin bag on the X-ray belt, walk through the arch
//      (carrying the bag beeps you back) and pick your bag up at the end of the belt;
//   5. find your gate from your boarding pass (the signs point the way) and scan your boarding pass to board.
// Stars for time, bumps and not using "Show me the way"; your best is kept on this device. Nothing here pays money.
//
// Like every scene here, it moves three.js objects (and the camera) frame by frame, outside React's render.
/* eslint-disable react-hooks/immutability */

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import WALK from "@/data/flights/airport-walk.json";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { ROSTER } from "@/components/avatar/roster";
import type { Companion } from "./Flight";
import { MoveStick, type Controls } from "@/components/street/StreetWorld";
import { CITIES, type CityId } from "@/lib/city/cities";
import { airportOf, AIRLINE, type CabinClass } from "@/lib/flights";
import { adjustBalance, useCitizen } from "@/lib/citizenStore";
import { canvasQuality } from "@/lib/device";
import { gameAudio } from "@/utils/gameAudio";

type Look = Parameters<typeof CitizenAvatar>[0]["look"];
type Cfg = (typeof WALK.airports)["dubai"];
type StepId = "board" | "checkin" | "passport" | "security" | "gate";
const STEPS: { id: StepId; title: string; icon: string }[] = [
  { id: "board", title: "Find your flight", icon: "🖥️" },
  { id: "checkin", title: "Check in your bag", icon: "🧳" },
  { id: "passport", title: "Passport control", icon: "🛂" },
  { id: "security", title: "Security", icon: "🛡️" },
  { id: "gate", title: "Find your gate", icon: "🚪" },
];
type Sec = "sort" | "drop" | "arch" | "pickup";

const R = 0.35, WALK_SPEED = 3.2, RUN_SPEED = 5.6, NEAR = 1.4, WALL_H = 6;
const ISLANDS = [-12, -4, 4, 12];
const EGATES = [-4.5, -1.5, 1.5, 4.5];
const LANES = [-5.4, 0, 5.4];
const gateX = (n: number) => (n <= 10 ? -9 - (n - 1) * 6 : 9 + (n - 11) * 6);
const BELT_SECONDS = 5;
/** Half the width of an e-gate's (and the arch's) way through: wide enough to walk through without lining up exactly. */
const GAP = 0.75;

/** A solid box on the floor: you can't walk into it. `id` marks the e-gate barriers, which open. */
interface Box { x1: number; z1: number; x2: number; z2: number; h: number; c: string; id?: string; glass?: boolean }

function layout(p: Cfg["palette"]) {
  const boxes: Box[] = [];
  const add = (x1: number, z1: number, x2: number, z2: number, h = WALL_H, c = p.wall, extra: Partial<Box> = {}) => boxes.push({ x1, z1, x2, z2, h, c, ...extra });
  // The check-in hall (z 0–26): the entrance wall, its sides, the end wall with the way through to passport control.
  add(-20, -0.4, 20, 0, WALL_H, p.glass, { glass: true }); add(-20.4, 0, -20, 26); add(20, 0, 20.4, 26);
  add(-20, 26, -8.1, 26.4); add(8.1, 26, 20, 26.4);
  // Passport control and security (z 26–44), between their side walls.
  add(-8.5, 26, -8.1, 44); add(8.1, 26, 8.5, 44);
  // The duty-free hall (z 44–70) and the concourse (z 70–82) with its glass wall on the apron.
  add(-22, 44, -8.5, 44.4); add(8.5, 44, 22, 44.4); add(-22.4, 44, -22, 70); add(22, 44, 22.4, 70);
  add(-70, 70, -6, 70.4); add(6, 70, 70, 70.4); add(-70.4, 70, -70, 82); add(70, 70, 70.4, 82);
  add(-70, 82, 70, 82.4, WALL_H, p.glass, { glass: true });
  // Check-in islands (one per row) and the departures board.
  for (const x of ISLANDS) add(x - 0.8, 9, x + 0.8, 21, 1.1, "#e2e8f0");
  add(-3, 5.6, 3, 6, 3.4, "#0b1220");
  // People queueing at the other counters.
  for (const [x, z] of QUEUE) add(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 0, "#64748b", { id: "person" });
  // Passport control: officers' booths, and the e-gates (cabinets between the gates; each gate's barrier opens).
  add(-7.2, 26.6, -6, 27.8, 2.2, "#cbd5e1"); add(6, 26.6, 7.2, 27.8, 2.2, "#cbd5e1");
  let from = -8.1;
  for (const g of EGATES) { add(from, 28.4, g - GAP, 28.8, 1.3, "#94a3b8"); add(g - GAP, 28.5, g + GAP, 28.7, 1.0, "#7dd3fc", { id: `egate:${g}`, glass: true }); from = g + GAP; }
  add(from, 28.4, 8.1, 28.8, 1.3, "#94a3b8");
  // Security: three lanes, each with its X-ray belt and the walk-through arch (only the arch's gap lets you past).
  add(-2.8, 32, -2.6, 44, 1.2, "#cbd5e1"); add(2.6, 32, 2.8, 44, 1.2, "#cbd5e1");
  for (const L of LANES) {
    add(L + 0.8, 33.4, L + 1.8, 43, 0.85, "#1f2937");
    add(L - 2.6, 37.8, L - 0.5 - GAP, 38.2, 2.2, "#cbd5e1"); add(L - 0.5 + GAP, 37.8, L + 0.8, 38.2, 2.2, "#cbd5e1"); add(L + 1.8, 37.8, L + 2.6, 38.2, 2.2, "#cbd5e1");
  }
  // Duty free: shops, and the landmark in the middle of the hall.
  for (const [x1, z1, x2, z2] of [[-12, 52, -9, 54.5], [9, 52, 12, 54.5], [-12, 60, -9, 62.5], [9, 60, 12, 62.5]]) add(x1, z1, x2, z2, 2.4, p.accent);
  add(-2, 55, 2, 59, 0.6, p.pillar);
  // The gates: each desk, and a row of seats in front of it.
  for (let n = 1; n <= 20; n++) { const x = gateX(n); add(x - 0.9, 80.4, x + 0.9, 81, 1.1, "#e2e8f0"); add(x - 1.8, 77, x + 1.8, 77.5, 0.5, "#475569"); }
  // The pillars (round, but solid as squares).
  const pillars: Array<[number, number]> = [[-8, 5], [8, 5], [-8, 24], [8, 24], [-16, 15], [16, 15], [-7, 49], [7, 49], [-15, 49], [15, 49], [-7, 65], [7, 65], [-15, 65], [15, 65], [-15, 57], [15, 57]];
  for (const x of [12, 30, 48, 64]) pillars.push([x, 73.2], [-x, 73.2]);
  for (const [x, z] of SEATED) add(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, "#64748b", { id: "person" });
  for (const [x, z] of pillars) boxes.push({ x1: x - 0.45, z1: z - 0.45, x2: x + 0.45, z2: z + 0.45, h: WALL_H, c: p.pillar, id: "pillar" });
  return { boxes, pillars };
}

/** People queueing at the other counters, and travellers waiting at the gates (solid; drawn as real people). */
const QUEUE: Array<[number, number]> = [[-13.6, 10.5], [-13.6, 11.4], [-5.6, 19.6], [2.4, 10.5], [10.4, 19.6], [10.4, 20.5]];
const SEATED: Array<[number, number]> = [[-9.6, 77.25], [-14.2, 77.25], [9.6, 77.25], [21.2, 77.25], [-33.6, 77.25], [39.2, 77.25]];
/** Travellers walking to and fro along the open walkways (each line keeps clear of the walls, pillars and counters),
 *  pulling their bags: the terminal's busy, and you have to dodge them too. */
const WALKERS: Array<{ a: [number, number]; b: [number, number]; speed: number }> = [
  { a: [-9.5, 2], b: [-9.5, 25], speed: 1.3 }, { a: [0, 25], b: [0, 7.2], speed: 1.2 }, { a: [9.5, 3], b: [9.5, 25], speed: 1.4 },
  { a: [-15, 25], b: [-15, 2], speed: 1.1 }, { a: [18, 3], b: [-18, 3], speed: 1.25 },
  { a: [-20, 51], b: [20, 51], speed: 1.3 }, { a: [20, 63.5], b: [-20, 63.5], speed: 1.2 }, { a: [-4, 45.5], b: [-4, 68.5], speed: 1.35 }, { a: [4.5, 68.5], b: [4.5, 45.5], speed: 1.2 },
  { a: [-66, 74.2], b: [66, 74.2], speed: 1.4 }, { a: [40, 74.2], b: [-40, 74.2], speed: 1.25 }, { a: [-30, 72.35], b: [30, 72.35], speed: 1.3 },
];
const lookOf = (i: number) => { const r = ROSTER[(i * 7 + 1) % ROSTER.length]; return { gender: r.gender, preset: r.id }; };

/** Luggage carts and a floor cleaner going back and forth: dodge them. */
const MOVERS = [
  { a: [-18, 3], b: [-18, 24], speed: 2, kind: "cart" },
  { a: [18, 24], b: [18, 3], speed: 1.8, kind: "cart" },
  { a: [-20, 47], b: [20, 47], speed: 2.2, kind: "cart" },
  { a: [20, 67], b: [-20, 67], speed: 2.6, kind: "cleaner" },
  { a: [-60, 75.4], b: [60, 75.4], speed: 3, kind: "cleaner" },
  { a: [50, 71.3], b: [-50, 71.3], speed: 2.2, kind: "cart" },
] as const;
function moverAt(m: { a: readonly number[]; b: readonly number[]; speed: number }, t: number) {
  const len = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
  const d = (t * m.speed) % (2 * len), f = (d < len ? d : 2 * len - d) / len;
  return { x: m.a[0] + (m.b[0] - m.a[0]) * f, z: m.a[1] + (m.b[1] - m.a[1]) * f, dir: d < len ? 1 : -1 };
}

/** A canvas texture with lines of text, for signs and screens. */
export function useText(lines: Array<{ t: string; c?: string; s?: number }>, w = 1024, h = 256, bg = "#0b1220") {
  const key = JSON.stringify(lines);
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d")!;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const total = lines.reduce((s, l) => s + (l.s ?? 56) * 1.25, 0);
    let y = (h - total) / 2;
    for (const l of lines) {
      const s = l.s ?? 56; y += s * 1.1;
      g.font = `800 ${s}px system-ui, sans-serif`; g.fillStyle = l.c ?? "#ffffff"; g.textAlign = "center";
      g.fillText(l.t, w / 2, y); y += s * 0.15;
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  }, [key, w, h, bg]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** Signs fade like walls when they come between the camera and you (the scene collects them in FadeContext). */
export const FadeContext = createContext<((m: THREE.Mesh | null) => void) | null>(null);
export function Sign({ lines, at, size, bg, rotY = 0 }: { lines: Array<{ t: string; c?: string; s?: number }>; at: [number, number, number]; size: [number, number]; bg?: string; rotY?: number }) {
  const tex = useText(lines, 1024, Math.round(1024 * size[1] / size[0]), bg);
  const fade = useContext(FadeContext);
  if (!tex) return null;
  return <mesh ref={fade ?? undefined} position={at} rotation={[0, rotY, 0]}><planeGeometry args={size} /><meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} transparent /></mesh>;
}

export function Suitcase({ big, color }: { big: boolean; color: string }) {
  const [w, h, d] = big ? [0.5, 0.7, 0.28] : [0.36, 0.48, 0.22];
  return (
    <group>
      <mesh position={[0, h / 2 + 0.05, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <mesh position={[0, h + 0.2, 0]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh position={[0, h + 0.36, 0]}><boxGeometry args={[0.22, 0.04, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>
    </group>
  );
}

/** Your family walking behind you, in your footsteps (family trips): each a little further back along the way you
 *  came, children drawn smaller. */
export function Followers({ companions, live, walking }: { companions: Companion[]; live: React.RefObject<{ x: number; z: number }>; walking: boolean }) {
  const trail = useRef<Array<[number, number]>>([]);
  const groups = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const s = live.current, t = trail.current;
    const last = t[t.length - 1];
    if (!last || Math.hypot(s.x - last[0], s.z - last[1]) > 0.2) { t.push([s.x, s.z]); if (t.length > 80) t.shift(); }
    companions.forEach((_, i) => {
      const g = groups.current[i];
      if (!g || !t.length) return;
      // About 1.1 m apart: 5–6 trail points each.
      const k = Math.max(0, t.length - 1 - (i + 1) * 6), p = t[k], q = t[Math.min(t.length - 1, k + 1)];
      g.position.set(p[0], 0, p[1]);
      if (q[0] !== p[0] || q[1] !== p[1]) g.rotation.y = Math.atan2(q[0] - p[0], q[1] - p[1]);
    });
  });
  if (!companions.length) return null;
  return (
    <Suspense fallback={null}>
      {companions.map((c, i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }}>
          <group scale={c.child ? 0.62 : 1}><CitizenAvatar look={c} animation={walking ? "walk" : "idle"} pace={walking ? WALK_SPEED * (c.child ? 0.62 : 1) : undefined} /></group>
        </group>
      ))}
    </Suspense>
  );
}

/** Directions painted on the floor, like a real terminal's wayfinding: a coloured line along each route with arrows
 *  every couple of metres pointing the way, and the name of where it leads painted at its start. */
export interface Route { pts: Array<[number, number]>; color: string; label?: string }
export function FloorGuide({ routes }: { routes: Route[] }) {
  const parts = useMemo(() => routes.flatMap((r) => r.pts.slice(1).map((b, i) => {
    const a = r.pts[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const arrows = Array.from({ length: Math.max(1, Math.floor(len / 2.4)) }, (_, k) => (k + 0.5) / Math.max(1, Math.floor(len / 2.4)));
    return { a, dx, dz, len, yaw, arrows, color: r.color };
  })), [routes]);
  return (
    <group>
      {parts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.a[0] + p.dx / 2, 0.012, p.a[1] + p.dz / 2]} rotation={[-Math.PI / 2, 0, p.yaw]}>
            <planeGeometry args={[0.16, p.len]} /><meshBasicMaterial color={p.color} transparent opacity={0.85} />
          </mesh>
          {p.arrows.map((f, k) => (
            <mesh key={k} position={[p.a[0] + p.dx * f, 0.014, p.a[1] + p.dz * f]} rotation={[-Math.PI / 2, 0, p.yaw - Math.PI / 2]}>
              <circleGeometry args={[0.32, 3]} /><meshBasicMaterial color={p.color} />
            </mesh>
          ))}
        </group>
      ))}
      {routes.filter((r) => r.label).map((r, i) => <FloorLabel key={`l${i}`} text={r.label!} color={r.color} at={r.pts[0]} toward={r.pts[1]} />)}
    </group>
  );
}
/** Words painted on the floor, reading the way you walk. */
function FloorLabel({ text, color, at, toward }: { text: string; color: string; at: [number, number]; toward: [number, number] }) {
  // Sized to fit: long names in smaller letters.
  const tex = useText([{ t: text, c: color, s: Math.min(120, Math.floor(1300 / Math.max(1, text.length))) }], 1024, 192, "rgba(0,0,0,0)");
  if (!tex) return null;
  const yaw = Math.atan2(toward[0] - at[0], toward[1] - at[1]);
  return (
    <mesh position={[at[0] + Math.sin(yaw) * 1.2, 0.016, at[1] + Math.cos(yaw) * 1.2]} rotation={[-Math.PI / 2, 0, yaw + Math.PI]}>
      <planeGeometry args={[4, 0.75]} /><meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** The departures routes: round the board to the check-in rows, through an e-gate, down a security lane and its
 *  arch, round the duty-free landmark to the concourse, then left and right to the gates. */
const DEPARTURE_ROUTES: Route[] = [
  { pts: [[0, 2.2], [-3.6, 3.8], [-3.6, 7.6], [0, 8.6], [0, 25.4]], color: "#0d9488", label: "CHECK-IN" },
  { pts: [[0, 25.4], [-1.5, 27.2], [-1.5, 30.4]], color: "#2563eb", label: "PASSPORT CONTROL" },
  { pts: [[-1.5, 30.4], [-0.5, 32.6], [-0.5, 44.2]], color: "#d97706", label: "SECURITY" },
  { pts: [[-0.5, 44.2], [-3.4, 48.5], [-3.4, 64.5], [0, 69], [0, 71.4]], color: "#7c3aed", label: "GATES" },
  { pts: [[0, 71.4], [-5, 72.6], [-14, 74.6]], color: "#7c3aed" },
  { pts: [[0, 71.4], [5, 72.6], [14, 74.6]], color: "#7c3aed" },
];

function Landmark({ kind, p }: { kind: string; p: Cfg["palette"] }) {
  if (kind === "bear") return (
    // A giant yellow teddy bear sitting under a desk lamp.
    <group position={[0, 0.6, 57]}>
      <mesh position={[0, 1.6, 0]}><sphereGeometry args={[1.5, 24, 16]} /><meshStandardMaterial color="#facc15" roughness={0.8} /></mesh>
      <mesh position={[0, 3.6, 0]}><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#facc15" roughness={0.8} /></mesh>
      {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 4.4, 0]}><sphereGeometry args={[0.35, 16, 12]} /><meshStandardMaterial color="#eab308" /></mesh>)}
      {[-1.1, 1.1].map((x) => <mesh key={`a${x}`} position={[x * 1.3, 1.8, 0.4]}><sphereGeometry args={[0.55, 16, 12]} /><meshStandardMaterial color="#facc15" /></mesh>)}
      <mesh position={[1.8, 3, -0.6]}><cylinderGeometry args={[0.08, 0.08, 6, 8]} /><meshStandardMaterial color="#1f2937" /></mesh>
      <mesh position={[1.2, 6, -0.6]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.9, 1.2, 16, 1, true]} /><meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} /></mesh>
    </group>
  );
  if (kind === "arch") return (
    // A sweeping white arch over a pool of light, under Terminal A's curved roof.
    <group position={[0, 0.6, 57]}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}><torusGeometry args={[3.2, 0.25, 12, 48, Math.PI]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2, 32]} /><meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={0.25} /></mesh>
    </group>
  );
  // A gold palm tree in the middle of the duty-free hall.
  return (
    <group position={[0, 0.6, 57]}>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.35, 0.5, 6, 12]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.25} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.785) * 1.4, 6, Math.sin(i * 0.785) * 1.4]} rotation={[Math.sin(i * 0.785) * 0.9, 0, -Math.cos(i * 0.785) * 0.9]}>
          <boxGeometry args={[0.5, 0.08, 2.6]} /><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

interface Live {
  x: number; z: number; yaw: number; moving: boolean; /** The scene's clock (seconds), for the belts. */ t: number;
  step: number; sec: Sec; carryBig: boolean; carrySmall: boolean;
  bigOnBelt: number | null; smallOnBelt: { lane: number; at: number } | null;
  open: Set<string>; bumpCool: number; bumps: number; hint: boolean;
}

/** Where the next thing to do is. */
function targetOf(s: Live, cfg: Cfg, gate: number): [number, number] {
  const ix = ISLANDS[cfg.row - 1];
  switch (STEPS[s.step]?.id) {
    case "board": return [0, 4.6];
    case "checkin": return [ix - 1.6, 15];
    case "passport": return s.z < 28.4 ? [-1.5, 27.8] : [0, 31];
    case "security": {
      const lane = s.smallOnBelt?.lane ?? LANES.reduce((a, l) => (Math.abs(l - s.x) < Math.abs(a - s.x) ? l : a), LANES[1]);
      if (s.sec === "sort" || s.sec === "drop") return [lane + 0.25, 34.4];
      if (s.sec === "arch") return [lane - 0.5, 38.6];
      return [lane + 0.25, 43.6];
    }
    case "gate": return s.z < 70.2 ? [0, 71.4] : [gateX(gate), 79.8];
    default: return [s.x, s.z];
  }
}

function World({ look, cfg, code, gate, gateDest, to, live, controls, onNear, onEvent, companions }: {
  look: Look; cfg: Cfg; code: string; companions: Companion[]; gate: number; gateDest: Record<number, string>; to: string; live: React.RefObject<Live>; controls: React.RefObject<Controls>;
  onNear: (id: string | null) => void; onEvent: (e: { kind: "bump" | "beep" | "clear" | "board" | "pass"; text?: string }) => void;
}) {
  const p = cfg.palette;
  const { boxes, pillars } = useMemo(() => layout(p), [p]);
  const camera = useThree((s) => s.camera);
  const orbit = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const me = useRef<THREE.Group>(null);
  const big = useRef<THREE.Group>(null), small = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null);
  const movers = useRef<Array<THREE.Group | null>>([]);
  const walkers = useRef<Array<THREE.Group | null>>([]);
  const barriers = useRef<Record<string, THREE.Mesh | null>>({});
  const tall = useRef<Array<THREE.Mesh | null>>([]);
  const signs = useRef(new Set<THREE.Mesh>());
  const addSign = useCallback((m: THREE.Mesh | null) => { if (m) signs.current.add(m); }, []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const keys = useRef(new Set<string>());
  const last = useRef<THREE.Vector3 | null>(null);
  const nearId = useRef<string | null>(null);
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  const ix = ISLANDS[cfg.row - 1];

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const solid = (x: number, z: number) => {
    const s = live.current;
    for (const b of boxes) {
      if (b.id?.startsWith("egate:") && s.open.has(b.id)) continue;
      if (x > b.x1 - R && x < b.x2 + R && z > b.z1 - R && z < b.z2 + R) return true;
    }
    return false;
  };

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), s = live.current;
    s.t += dt;
    s.bumpCool = Math.max(0, s.bumpCool - dt);
    // Move: the stick or the keys, relative to where the camera looks; slide along walls instead of stopping dead.
    const k = keys.current;
    const ix2 = controls.current.x + (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const iy2 = controls.current.y + (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const len = Math.hypot(ix2, iy2);
    let moving = false;
    if (len > 0.05) {
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const sp = (k.has("shift") || controls.current.sprint ? RUN_SPEED : WALK_SPEED) * Math.min(1, len);
      const vx = (right.x * ix2 + fwd.x * iy2) / len * sp, vz = (right.z * ix2 + fwd.z * iy2) / len * sp;
      const nx = s.x + vx * dt, nz = s.z + vz * dt;
      const prevZ = s.z;
      if (!solid(nx, s.z)) s.x = nx;
      if (!solid(s.x, nz)) s.z = nz;
      // Close to an open e-gate or an arch: you're steered into the gap, so you don't snag on its edge.
      const open = EGATES.find((g) => s.open.has(`egate:${g}`) && Math.abs(s.x - g) < 1.3 && s.z > 27.3 && s.z < 29.6);
      const arch = LANES.find((L) => Math.abs(s.x - (L - 0.5)) < 1.1 && s.z > 37.1 && s.z < 38.9);
      const mid = open ?? (arch !== undefined ? arch - 0.5 : undefined);
      if (mid !== undefined) { const fx = s.x + (mid - s.x) * Math.min(1, dt * 9); if (!solid(fx, s.z)) s.x = fx; }
      s.yaw = Math.atan2(vx, vz);
      moving = true;
      // Security's arch: carrying your bag through beeps you back.
      if (STEPS[s.step]?.id === "security") {
        const lane = LANES.find((L) => Math.abs(s.x - (L - 0.5)) < 0.7);
        if (lane !== undefined && prevZ < 38 && s.z >= 38) {
          if (s.carrySmall) { s.z = 37; onEvent({ kind: "beep", text: "Beep! 🚨 Your bag goes on the X-ray belt first, not through the arch with you." }); }
          else if (s.sec === "arch") { s.sec = "pickup"; onEvent({ kind: "clear", text: "No beep ✓ Now pick up your bag at the end of the belt." }); }
        }
      }
      // Passport control done once you're through the e-gate.
      if (STEPS[s.step]?.id === "passport" && s.z > 29.3) onEvent({ kind: "pass" });
    }
    if (moving !== s.moving) { s.moving = moving; setAnim(moving ? "walk" : "idle"); }

    // The carts and the cleaner: bumping into one pushes you aside.
    MOVERS.forEach((m, i) => {
      const at = moverAt(m, s.t), g = movers.current[i];
      if (g) { g.position.set(at.x, 0, at.z); g.rotation.y = Math.atan2(m.b[0] - m.a[0], m.b[1] - m.a[1]) + (at.dir < 0 ? Math.PI : 0); }
      const dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz), min = 0.75 + R;
      if (d < min && d > 0.001) {
        const px = at.x + (dx / d) * min, pz = at.z + (dz / d) * min;
        if (!solid(px, pz)) { s.x = px; s.z = pz; }
        if (s.bumpCool <= 0) { s.bumpCool = 1.2; s.bumps++; onEvent({ kind: "bump", text: m.kind === "cleaner" ? "Oops! Mind the floor cleaner." : "Oops! Watch out for the luggage cart." }); }
      }
    });

    // The travellers walking about: their places, and bumping into one.
    WALKERS.forEach((w, i) => {
      const at = moverAt(w, s.t + i * 7), g = walkers.current[i];
      if (g) { g.position.set(at.x, 0, at.z); g.rotation.y = Math.atan2(w.b[0] - w.a[0], w.b[1] - w.a[1]) + (at.dir < 0 ? Math.PI : 0); }
      const dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz), min = 0.35 + R;
      if (d < min && d > 0.001) {
        const px = at.x + (dx / d) * min, pz = at.z + (dz / d) * min;
        if (!solid(px, pz)) { s.x = px; s.z = pz; }
        if (s.bumpCool <= 0) { s.bumpCool = 1.2; s.bumps++; onEvent({ kind: "bump", text: "Oops! “Excuse me!” Watch where you're walking." }); }
      }
    });

    // You, your bags and the camera following you.
    me.current?.position.set(s.x, 0, s.z);
    if (me.current) me.current.rotation.y = s.yaw;
    const side = (off: number, back: number) => [s.x + Math.cos(s.yaw) * off - Math.sin(s.yaw) * back, s.z - Math.sin(s.yaw) * off - Math.cos(s.yaw) * back] as const;
    if (big.current) {
      if (s.carryBig) { const [bx, bz] = side(-0.45, 0.3); big.current.position.set(bx, 0, bz); big.current.rotation.y = s.yaw; }
      else if (s.bigOnBelt !== null) { const t = Math.min(1, (s.t - s.bigOnBelt) / 3); big.current.position.set(ix + 0.2 - t * 0.2, 1.1 - t * 0.6, 15 + t * 0.3); big.current.visible = t < 1; }
    }
    if (small.current) {
      if (s.carrySmall) { small.current.visible = true; const [bx, bz] = side(0.45, 0.15); small.current.position.set(bx, 0, bz); small.current.rotation.y = s.yaw; }
      else if (s.smallOnBelt) {
        const t = Math.min(1, (s.t - s.smallOnBelt.at) / BELT_SECONDS);
        small.current.visible = true;
        small.current.position.set(s.smallOnBelt.lane + 1.3, 0.85, 33.8 + t * 8.8);
      } else small.current.visible = false;
    }
    for (const [id, m] of Object.entries(barriers.current)) if (m) m.visible = !s.open.has(id);

    const at = new THREE.Vector3(s.x, 1.4, s.z);
    if (orbit) {
      if (!last.current) { camera.position.set(s.x, 6.5, s.z - 8); last.current = at.clone(); }
      camera.position.add(at.clone().sub(last.current));
      orbit.target.copy(at); orbit.update(); last.current.copy(at);
    }
    // Walls and pillars between the camera and you fade, so you can always see yourself.
    const walls = tall.current.filter((m): m is THREE.Mesh => !!m);
    const toCam = camera.position.clone().sub(at), dist = toCam.length();
    ray.set(at, toCam.normalize()); ray.far = dist;
    const hit = new Set<THREE.Object3D>(ray.intersectObjects(walls, false).map((h) => h.object));
    // Signs: any nearer the camera than you are (they hang overhead, across the view rather than on the line to you).
    const look = at.clone().sub(camera.position), meDepth = look.length(); look.normalize();
    for (const m of signs.current) { const d = m.position.clone().sub(camera.position).dot(look); if (d > 0 && d < meDepth + 1) hit.add(m); }
    for (const m of [...walls, ...signs.current]) {
      const mat = m.material as THREE.Material, base = mat.userData.base ?? (mat.userData.base = mat.opacity);
      const want = hit.has(m) ? 0.12 : base;
      mat.opacity += (want - mat.opacity) * Math.min(1, dt * 10);
      mat.depthWrite = mat.opacity > 0.9;
    }

    // Show the way: an arrow at your feet, and a ring where you're going.
    const [tx, tz] = targetOf(s, cfg, gate);
    if (arrow.current) { arrow.current.visible = s.hint; arrow.current.position.set(s.x, 0.06, s.z); arrow.current.rotation.y = Math.atan2(tx - s.x, tz - s.z); }
    if (ring.current) { ring.current.visible = s.hint; ring.current.position.set(tx, 0.05, tz); const sc = 1 + Math.sin(s.t * 4) * 0.12; ring.current.scale.set(sc, sc, sc); }

    // What you're next to: the action button for it.
    let near: string | null = null;
    const id = STEPS[s.step]?.id;
    const close = (x: number, z: number, r = NEAR) => Math.hypot(s.x - x, s.z - z) < r;
    if (id === "board" && close(0, 4.6, 1.8)) near = "board";
    else if (id === "checkin" && close(ix - 1.6, 15)) near = "checkin";
    else if (id === "passport") { const g = EGATES.find((g) => Math.abs(s.x - g) < 1 && s.z > 27.2 && s.z < 28.4); if (g !== undefined && !s.open.has(`egate:${g}`)) near = `egate:${g}`; }
    else if (id === "security") {
      const lane = LANES.find((L) => close(L + 0.25, 34.4, 1.2));
      if ((s.sec === "sort" || s.sec === "drop") && lane !== undefined) near = `${s.sec}:${lane}`;
      if (s.sec === "pickup" && s.smallOnBelt && close(s.smallOnBelt.lane + 0.25, 43.6, 1.3) && s.t - s.smallOnBelt.at >= BELT_SECONDS) near = "pickup";
    } else if (id === "gate") {
      for (let n = 1; n <= 20; n++) if (close(gateX(n), 79.8, 1.3)) { near = `gate:${n}`; break; }
    }
    if (near !== nearId.current) { nearId.current = near; onNear(near); }
  });

  const L = cfg.gateLetter;
  return (
    <FadeContext.Provider value={addSign}>
      <color attach="background" args={["#dbeaf5"]} />
      <hemisphereLight args={["#ffffff", "#c7b9a0", 1.1]} />
      <directionalLight position={[20, 40, 10]} intensity={1.1} />
      {/* The floor, and the apron outside the glass. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 41]}><planeGeometry args={[142, 84]} /><meshStandardMaterial color={p.floor} roughness={0.35} metalness={0.05} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 110]}><planeGeometry args={[300, 56]} /><meshStandardMaterial color="#9ca3af" /></mesh>
      {boxes.filter((b) => b.id !== "pillar" && b.id !== "person").map((b, i) => {
        const isBarrier = b.id?.startsWith("egate:");
        return (
          <mesh key={i} ref={isBarrier ? (m) => { barriers.current[b.id!] = m; } : b.h >= 2.2 ? (m) => { tall.current[i] = m; } : undefined} position={[(b.x1 + b.x2) / 2, b.h / 2, (b.z1 + b.z2) / 2]}>
            <boxGeometry args={[b.x2 - b.x1, b.h, b.z2 - b.z1]} />
            <meshStandardMaterial color={b.c} transparent opacity={b.glass ? 0.45 : 1} roughness={0.6} />
          </mesh>
        );
      })}
      {pillars.map(([x, z], i) => <mesh key={`p${i}`} position={[x, WALL_H / 2, z]}><cylinderGeometry args={[0.45, 0.45, WALL_H, 16]} /><meshStandardMaterial color={p.pillar} /></mesh>)}

      {/* The departures board. */}
      <Sign at={[0, 2.2, 5.55]} size={[5.8, 3]} rotY={Math.PI} lines={[
        { t: `DEPARTURES · ${code}`, c: "#fbbf24", s: 70 },
        { t: `${AIRLINE.code} 107  ${to.toUpperCase()}   CHECK-IN ROW ${cfg.row}`, c: "#ffffff", s: 46 },
        { t: "GW 220  LONDON  ROW 1   ·   SO 451  MUMBAI  ROW 2", c: "#94a3b8", s: 34 },
        { t: "FA 902  CAIRO  ROW 4   ·   GW 318  ISTANBUL  ROW 1", c: "#94a3b8", s: 34 },
      ]} />
      {/* Each row's sign over its counters. */}
      {ISLANDS.map((x, i) => (
        <Sign key={x} at={[x, 3.4, 15]} size={[2.6, 1]} rotY={-Math.PI / 2} bg={i + 1 === cfg.row ? AIRLINE.colors.tail : "#334155"}
          lines={[{ t: `ROW ${i + 1}`, s: 120 }, { t: i + 1 === cfg.row ? AIRLINE.name : ["Gulf Wings", "Sky Oasis", "Falcon Air", "Gulf Wings"][i], s: 64, c: "#e2e8f0" }]} />
      ))}
      <Sign at={[0, 4.4, 26.5]} size={[8, 1.1]} rotY={Math.PI} lines={[{ t: `🛂 Passport control · ${cfg.eGates}  ↑`, s: 84 }]} bg="#1e3a8a" />
      <Sign at={[0, 4.4, 32]} size={[8, 1.1]} rotY={Math.PI} lines={[{ t: "Security screening  ↑", s: 90 }]} bg="#1e3a8a" />
      <Sign at={[0, 4.6, 69.6]} size={[12, 1.4]} lines={[{ t: `← Gates ${L}1–${L}10     ✈     Gates ${L}11–${L}20 →`, s: 96 }]} bg="#0b1220" rotY={Math.PI} />
      {LANES.map((x) => (
        <group key={x}>
          {/* The arch's frame round its gap. */}
          <mesh position={[x - 0.5 - GAP - 0.05, 1.1, 38]}><boxGeometry args={[0.12, 2.2, 0.5]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[x - 0.5 + GAP + 0.05, 1.1, 38]}><boxGeometry args={[0.12, 2.2, 0.5]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[x - 0.5, 2.25, 38]}><boxGeometry args={[GAP * 2 + 0.25, 0.15, 0.5]} /><meshStandardMaterial color="#64748b" /></mesh>
          {/* The X-ray tunnel over the belt. */}
          <mesh position={[x + 1.3, 1.4, 38]}><boxGeometry args={[1.2, 1.2, 2.4]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        </group>
      ))}
      <Landmark kind={cfg.landmark} p={p} />
      <FloorGuide routes={DEPARTURE_ROUTES} />
      {[[-10.5, 53.2, "Perfume"], [10.5, 53.2, "Chocolates"], [-10.5, 61.2, "Electronics"], [10.5, 61.2, "Gold & watches"]].map(([x, z, t]) => (
        <Sign key={t as string} at={[x as number, 3, z as number]} size={[3, 0.7]} lines={[{ t: `Duty free · ${t}`, s: 90 }]} bg="#111827" rotY={Math.PI} />
      ))}
      {/* Gate numbers over each desk; your flight on yours. */}
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
        <Sign key={n} at={[gateX(n), 3.2, 81.6]} size={[3, 1.1]} rotY={Math.PI} bg={n === gate ? AIRLINE.colors.tail : "#1f2937"}
          lines={[{ t: `${L}${n}`, s: 150 }, { t: n === gate ? `${AIRLINE.code} 107 · ${to}` : gateDest[n], s: 70, c: "#e2e8f0" }]} />
      ))}

      {MOVERS.map((m, i) => (
        <group key={i} ref={(g) => { movers.current[i] = g; }}>
          {m.kind === "cart"
            ? <><mesh position={[0, 0.5, 0]}><boxGeometry args={[0.9, 0.6, 1.6]} /><meshStandardMaterial color="#94a3b8" metalness={0.5} /></mesh>
                <mesh position={[0, 1.05, 0.2]}><boxGeometry args={[0.7, 0.5, 0.9]} /><meshStandardMaterial color="#b45309" /></mesh></>
            : <><mesh position={[0, 0.55, 0]}><boxGeometry args={[1.1, 1.1, 1.4]} /><meshStandardMaterial color="#f59e0b" /></mesh>
                <mesh position={[0, 1.25, -0.3]}><boxGeometry args={[0.5, 0.4, 0.5]} /><meshStandardMaterial color="#1f2937" /></mesh></>}
        </group>
      ))}

      {/* The people: travellers walking with their bags, queues at the other counters, and passengers at the gates. */}
      <Suspense fallback={null}>
        {WALKERS.map((_, i) => (
          <group key={`w${i}`} ref={(g) => { walkers.current[i] = g; }}>
            <CitizenAvatar look={lookOf(i)} animation="walk" pace={WALKERS[i].speed} />
            <group position={[0.4, 0, -0.2]}><Suitcase big={i % 3 === 0} color={["#1e293b", "#b91c1c", "#0f766e", "#7c3aed"][i % 4]} /></group>
          </group>
        ))}
        {QUEUE.map(([x, z], i) => (
          <group key={`q${i}`} position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
            <CitizenAvatar look={lookOf(i + 20)} animation={i % 3 === 0 ? "talk" : "idle"} />
            <group position={[0.4, 0, 0]}><Suitcase big color={["#334155", "#be185d", "#a16207"][i % 3]} /></group>
          </group>
        ))}
        {SEATED.map(([x, z], i) => (
          <group key={`s${i}`} position={[x, 0, z - 0.1]} rotation={[0, 0, 0]}><CitizenAvatar look={lookOf(i + 40)} animation="sit" /></group>
        ))}
      </Suspense>
      <group ref={big}><Suitcase big color={AIRLINE.colors.tail} /></group>
      <group ref={small}><Suitcase big={false} color="#1e293b" /></group>
      <group ref={arrow}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.2]}><circleGeometry args={[0.45, 3]} /><meshBasicMaterial color="#10b981" /></mesh></group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.7, 0.95, 32]} /><meshBasicMaterial color="#10b981" transparent opacity={0.85} /></mesh>
      <group ref={me}>
        <Suspense fallback={null}><CitizenAvatar look={look} animation={anim} pace={anim === "walk" ? WALK_SPEED : undefined} /></Suspense>
      </group>
      <Followers companions={companions} live={live} walking={anim === "walk"} />
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3.5} maxDistance={16} minPolarAngle={0.4} maxPolarAngle={1.35} />
    </FadeContext.Provider>
  );
}

const DESTS = ["London", "Mumbai", "Cairo", "Istanbul", "Riyadh", "Karachi", "Manila", "Paris", "Nairobi", "Colombo", "Muscat", "Bangkok", "Lagos", "Delhi", "Amman", "Kuwait", "Bahrain", "Dhaka", "Tbilisi", "Baku"];

export function AirportWalk({ from, to, seat, seed, look, onDone, onSkip, cabin = "economy", companions = [] }: {
  /** Who's travelling with you (family trips): they walk behind you. */
  companions?: Companion[];
  from: CityId; to: CityId; seat: string; seed: number; look: Look; onDone: () => void; onSkip: () => void;
  /** Your cabin: its baggage allowance at the scale. */
  cabin?: CabinClass;
}) {
  const cfg = WALK.airports[from] as Cfg;
  const gate = (Math.abs(seed) % 20) + 1;
  const gateDest = useMemo(() => Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, DESTS[(i * 7 + seed) % DESTS.length]])), [seed]);
  const toName = CITIES[to].name;
  const quality = useMemo(() => canvasQuality(), []);
  const controls = useRef<Controls>({ x: 0, y: 0 });
  const live = useRef<Live>({ x: 0, z: 1.4, yaw: 0, moving: false, t: 0, step: 0, sec: "sort", carryBig: true, carrySmall: true, bigOnBelt: null, smallOnBelt: null, open: new Set(), bumpCool: 0, bumps: 0, hint: false });
  const [step, setStep] = useState(0);
  const [near, setNear] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "info" | "bad" | "good" } | null>(null);
  const [hint, setHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [quiz, setQuiz] = useState<"checkin" | "scale" | "security" | null>(null);
  // Check-in's scale: your suitcase (seeded, so the same trip weighs the same) against your cabin's allowance, and the
  // cabin bag you can repack into.
  const BAG = WALK.baggage;
  const allowance = BAG.allowance[cabin];
  const [bagKg, setBagKg] = useState(() => 18 + ((Math.abs(seed) * 7) % 13));
  const [cabinKg, setCabinKg] = useState<number>(BAG.cabinStart);
  const { citizen } = useCitizen();
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [boardingPass, setBoardingPass] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<{ stars: number; best: boolean } | null>(null);
  const [showTip, setShowTip] = useState(true);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  // Mirrors of the scene's state that the screen shows (the scene keeps the live copies in `live`).
  const [bumps, setBumps] = useState(0);
  const [sec, setSec] = useState<Sec>("sort");

  useEffect(() => {
    if (done) return;
    if (!started.current) started.current = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [done]);
  const say = (text: string, tone: "info" | "bad" | "good" = "info", ms = 3200) => {
    setToast({ text, tone });
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), ms);
  };
  const next = () => {
    const s = live.current;
    s.step++; setStep(s.step); setShowTip(true);
    gameAudio.sfx?.("chime");
  };
  const finish = () => {
    const secs = seconds;
    let stars = 3;
    if (secs > WALK.parSeconds) stars--;
    if (bumps > 3 || mistakes > 1) stars--;
    if (hintUsed) stars--;
    stars = Math.max(1, stars);
    const key = `dl_airport_best:${from}`;
    let best = false;
    try { const prev = Number(localStorage.getItem(key) ?? 0); if (stars > prev) { localStorage.setItem(key, String(stars)); best = true; } } catch { /* storage blocked */ }
    gameAudio.sfx?.("levelup");
    setDone({ stars, best });
  };
  const onEvent = (e: { kind: string; text?: string }) => {
    if (e.kind === "bump") { gameAudio.sfx?.("mgThud"); setBumps(live.current.bumps); say(e.text!, "bad", 1800); }
    if (e.kind === "beep") { gameAudio.sfx?.("error"); say(e.text!, "bad"); }
    if (e.kind === "clear") { gameAudio.sfx?.("chime"); setSec(live.current.sec); say(e.text!, "good"); }
    if (e.kind === "pass" && STEPS[live.current.step]?.id === "passport") { say(`Welcome through, enjoy your trip ✓ Next: security.`, "good"); next(); }
  };

  const act = () => {
    const s = live.current;
    if (!near) return;
    gameAudio.playClickSound();
    if (near === "board") { say(`Your flight: ${AIRLINE.code} 107 to ${toName}, check-in row ${cfg.row}.`, "good"); next(); return; }
    if (near === "checkin") { setQuiz("checkin"); return; }
    if (near.startsWith("egate:")) {
      say("📷 Look at the camera…", "info", 1400);
      setTimeout(() => { s.open.add(near); gameAudio.sfx?.("open"); say("✓ Passport read. The gate is open: walk through.", "good"); }, 1300);
      return;
    }
    if (near.startsWith("sort:")) { setQuiz("security"); return; }
    if (near.startsWith("drop:")) {
      const lane = Number(near.split(":")[1]);
      s.carrySmall = false; s.smallOnBelt = { lane, at: s.t };
      s.sec = "arch"; setSec("arch");
      say("Bag on the belt ✓ Now walk through the arch.", "good");
      return;
    }
    if (near === "pickup") { s.carrySmall = true; s.smallOnBelt = null; say("Got your bag ✓ Now find your gate on your boarding pass.", "good"); next(); return; }
    if (near.startsWith("gate:")) {
      const n = Number(near.split(":")[1]);
      if (n !== gate) { gameAudio.sfx?.("error"); say(`This is gate ${cfg.gateLetter}${n} to ${gateDest[n]}. Check your boarding pass: you're at ${cfg.gateLetter}${gate}.`, "bad", 3600); setMistakes((m) => m + 1); return; }
      say("Boarding pass scanned ✓ Enjoy your flight!", "good");
      finish();
    }
  };
  const answerCheckin = (right: boolean) => {
    if (!right) { setMistakes((m) => m + 1); gameAudio.sfx?.("error"); say(WALK.checkinQuiz.why, "bad", 5200); return; }
    gameAudio.playClickSound();
    setQuiz("scale");
  };
  /** Over the allowance: pay for each kg over, or move some into your cabin bag (up to its limit). */
  const over = Math.max(0, bagKg - allowance);
  const fee = over * BAG.excessPerKg;
  const canMove = Math.min(over, BAG.cabinLimit - cabinKg);
  const repack = () => { gameAudio.playClickSound(); setBagKg((k) => k - canMove); setCabinKg((k) => k + canMove); say(`Moved ${canMove} kg into your cabin bag (now ${cabinKg + canMove} kg of ${BAG.cabinLimit}).`, "info", 3200); };
  const payExcess = () => {
    if (!adjustBalance(-fee)) { gameAudio.sfx?.("error"); say(`You need AED ${fee.toLocaleString()} for the excess. Try repacking.`, "bad"); return; }
    gameAudio.playCoinSound();
    say(`Paid AED ${fee.toLocaleString()} for ${over} kg excess.`, "info", 2600);
    bagAccepted();
  };
  const bagAccepted = () => {
    const s = live.current;
    setQuiz(null);
    s.carryBig = false; s.bigOnBelt = s.t;
    setBoardingPass(true);
    say(`Bag tagged to ${airportOf(to).code} ✓ Boarding pass: gate ${cfg.gateLetter}${gate}, seat ${seat}.`, "good", 4200);
    next();
  };
  const sortItem = (id: string, where: string) => {
    const item = WALK.securityItems.find((i) => i.id === id)!;
    if (item.answer !== where) { setMistakes((m) => m + 1); gameAudio.sfx?.("error"); say(item.why, "bad", 4200); return; }
    gameAudio.playClickSound();
    const nextSorted = { ...sorted, [id]: where };
    setSorted(nextSorted);
    if (WALK.securityItems.every((i) => nextSorted[i.id])) { setQuiz(null); live.current.sec = "drop"; setSec("drop"); say("All sorted ✓ Now put your bag on the belt.", "good"); }
  };

  const cur = STEPS[step];
  const tip = cur ? (cfg.tips as Record<StepId, string>)[cur.id] : "";
  const instruction = (() => {
    const s = { sec };
    switch (cur?.id) {
      case "board": return "Walk to the departures screen ahead and find your flight.";
      case "checkin": return `Take your suitcase to row ${cfg.row}, ${AIRLINE.name}'s counters.`;
      case "passport": return `Step into one of the ${cfg.eGates} and scan your passport.`;
      case "security": return s.sec === "sort" ? "Go to a security lane and get your things ready for the tray." : s.sec === "drop" ? "Put your bag on the X-ray belt." : s.sec === "arch" ? "Walk through the arch (without your bag)." : "Pick up your bag at the end of the belt.";
      case "gate": return `Find gate ${cfg.gateLetter}${gate}: follow the signs for gates ${gate <= 10 ? `${cfg.gateLetter}1–${cfg.gateLetter}10, left` : `${cfg.gateLetter}11–${cfg.gateLetter}20, right`}.`;
      default: return "";
    }
  })();
  const actionLabel = !near ? null
    : near === "board" ? "🖥️ Read the departures screen"
    : near === "checkin" ? "🧳 Put your suitcase on the scale"
    : near.startsWith("egate:") ? "🛂 Scan your passport"
    : near.startsWith("sort:") ? "🧺 Get your things ready"
    : near.startsWith("drop:") ? "🛄 Put your bag on the belt"
    : near === "pickup" ? "🎒 Pick up your bag"
    : near.startsWith("gate:") ? "🎫 Scan your boarding pass" : null;

  return (
    <main className="fixed inset-0 z-[60] bg-slate-950 select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ position: [0, 6.5, -7], fov: 60, near: 0.1, far: 600 }} gl={{ powerPreference: quality.powerPreference }}>
        <World companions={companions} look={look} cfg={cfg} code={airportOf(from).code} gate={gate} gateDest={gateDest} to={toName} live={live} controls={controls} onNear={setNear} onEvent={onEvent} />
      </Canvas>

      {/* Top: the step, the timer and the tip. */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-2xl bg-slate-950/85 text-white px-3 py-2 max-w-[78%] pointer-events-auto">
            <p className="text-[11px] font-bold text-teal-300">{airportOf(from).code} · {cfg.terminal} · step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</p>
            <p className="text-sm font-black">{cur ? `${cur.icon} ${cur.title}` : "✈️ Ready to board"}</p>
            <p className="text-xs text-white/80">{instruction}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
            <span className="rounded-full bg-slate-950/85 text-white text-xs font-black px-3 py-1.5 tabular-nums">⏱ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} · 💥 {bumps}</span>
            <button onClick={() => { const v = !hint; setHint(v); live.current.hint = v; if (v) setHintUsed(true); }} className={`rounded-full text-xs font-black px-3 py-1.5 ${hint ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-900"}`}>🧭 {hint ? "Hide the way" : "Show me the way"}</button>
            <button onClick={onSkip} className="rounded-full bg-white/20 text-white text-[11px] font-black px-3 py-1">Skip the walk ›</button>
          </div>
        </div>
        {tip && showTip && (
          <button onClick={() => setShowTip(false)} className="self-start max-w-md text-left rounded-2xl bg-amber-50/95 text-slate-900 px-3 py-2 text-xs pointer-events-auto">
            <b>💡 Real-life tip:</b> {tip} <span className="text-slate-400">(tap to hide)</span>
          </button>
        )}
        {boardingPass && (
          <div className="self-start rounded-xl bg-white/95 text-slate-900 px-3 py-1.5 text-[11px] font-black pointer-events-auto">
            🎫 {AIRLINE.code} 107 · {airportOf(from).code}→{airportOf(to).code} · Gate {cfg.gateLetter}{gate} · Seat {seat}
          </div>
        )}
        {toast && (
          <p className={`self-center max-w-md rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-lg ${toast.tone === "bad" ? "bg-rose-600" : toast.tone === "good" ? "bg-emerald-600" : "bg-slate-900"}`}>{toast.text}</p>
        )}
      </div>

      {/* Bottom: the stick, and the action for whatever you're next to. */}
      {!done && !quiz && (
        <>
          <div className="absolute left-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))]"><MoveStick controls={controls} /></div>
          {actionLabel && (
            <button onClick={act} className="absolute right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+11rem)] sm:bottom-[max(2rem,env(safe-area-inset-bottom))] max-w-[60%] min-h-14 py-2 px-5 rounded-2xl bg-teal-600 text-white font-black shadow-xl animate-pulse">{actionLabel}</button>
          )}
        </>
      )}

      {/* The questions: the check-in one and security's tray. */}
      {quiz === "checkin" && (
        <Sheet title={`🧳 ${AIRLINE.name} · row ${cfg.row}`} sub="“Any batteries in your suitcase?” the agent asks.">
          <p className="font-black">{WALK.checkinQuiz.q}</p>
          {WALK.checkinQuiz.options.map((o) => (
            <button key={o.text} onClick={() => answerCheckin(o.right)} className="w-full h-12 rounded-2xl bg-slate-100 font-black text-slate-900">{o.text}</button>
          ))}
        </Sheet>
      )}
      {quiz === "scale" && (
        <Sheet title="⚖️ On the scale" sub={`${AIRLINE.name} · ${cabin === "economy" ? "Economy" : cabin === "business" ? "Business" : "First"} allowance: ${allowance} kg`}>
          <div className={`rounded-2xl p-3 text-center ${over ? "bg-rose-50" : "bg-emerald-50"}`}>
            <p className={`font-mono text-4xl font-black tabular-nums ${over ? "text-rose-600" : "text-emerald-700"}`}>{bagKg}.0 kg</p>
            <p className="text-xs font-bold text-slate-600">{over ? `${over} kg over your ${allowance} kg allowance` : `Within your ${allowance} kg allowance ✓`}</p>
          </div>
          {over === 0 ? (
            <button onClick={bagAccepted} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black">🧳 Tag it and send it down the belt</button>
          ) : (
            <>
              <button onClick={payExcess} disabled={(citizen?.balance ?? 0) < fee} className="w-full h-12 rounded-2xl bg-rose-600 text-white font-black disabled:opacity-50">💳 Pay excess: AED {fee.toLocaleString()} ({over} kg × AED {BAG.excessPerKg})</button>
              {canMove > 0
                ? <button onClick={repack} className="w-full h-12 rounded-2xl bg-slate-100 text-slate-900 font-black">🎒 Repack {canMove} kg into your cabin bag ({cabinKg} → {cabinKg + canMove} kg of {BAG.cabinLimit})</button>
                : <p className="text-xs text-slate-500 text-center">Your cabin bag is full ({cabinKg} of {BAG.cabinLimit} kg): the rest has to be paid for.</p>}
            </>
          )}
          <p className="text-[11px] text-slate-500">💡 {BAG.tip}</p>
        </Sheet>
      )}
      {quiz === "security" && (
        <Sheet title="🛡️ Get ready for security" sub="Tap where each thing goes: in the tray, in the bin, or left in your bag.">
          <SecurityTray sorted={sorted} onSort={sortItem} />
        </Sheet>
      )}

      {done && (
        <Sheet title="✈️ You made it to the gate!" sub={`${airportOf(from).name} · ${cfg.terminal}`}>
          <p className="text-4xl text-center">{"⭐".repeat(done.stars)}{"☆".repeat(3 - done.stars)}</p>
          <p className="text-center text-sm text-slate-600">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} · {bumps} bump{bumps === 1 ? "" : "s"} · {mistakes} mistake{mistakes === 1 ? "" : "s"}{hintUsed ? " · used the guide" : ""}{done.best ? " · new best! 🏆" : ""}</p>
          <p className="text-xs text-slate-600">{cfg.intro}</p>
          <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
            <li>Find your check-in row on the departures screens.</li>
            <li>Drop your bag at your airline&apos;s counter; batteries stay with you.</li>
            <li>Passport control, then security: laptop, liquids and metal in the tray.</li>
            <li>Your gate is on your boarding pass: follow the signs, and check the screens.</li>
          </ul>
          <button onClick={onDone} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black">Board the plane ›</button>
        </Sheet>
      )}
    </main>
  );
}

/** Security's tray: each thing goes in the tray, in the bin, or stays in your bag. */
function SecurityTray({ sorted, onSort }: { sorted: Record<string, string>; onSort: (id: string, where: string) => void }) {
  return (
    <>
          {WALK.securityItems.map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <span className="text-2xl">{i.icon}</span>
              <span className="flex-1 text-sm font-bold">{i.label}</span>
              {sorted[i.id] ? <span className="text-xs font-black text-emerald-600">✓ {sorted[i.id]}</span> : (["tray", "bin", "bag"] as const).map((w) => (
                <button key={w} onClick={() => onSort(i.id, w)} className="h-9 px-2.5 rounded-xl bg-slate-100 text-xs font-black capitalize">{w === "tray" ? "🧺 Tray" : w === "bin" ? "🗑️ Bin" : "🎒 Bag"}</button>
              ))}
            </div>
          ))}
    </>
  );
}

export function Sheet({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 space-y-2.5 shadow-2xl max-h-[70dvh] overflow-y-auto">
        <div><p className="text-lg font-black text-slate-900">{title}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
        {children}
      </div>
    </div>
  );
}
