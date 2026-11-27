"use client";

// The arrivals walk, after you land (DXB, AUH or DOH; src/data/flights/airport-walk.json `arrival`): you walk it
// yourself, the way you would for real, with directions painted on the floor:
//   1. passport control: step into an e-gate, scan your passport, and it opens;
//   2. baggage claim: the screens say which belt has your flight; bags go round the carousel and you take yours
//      (by its colour and tag: taking someone else's tells you so);
//   3. customs: read the customs sign (a quick question on what must be declared), then the green channel
//      (nothing to declare) or the red one;
//   4. out through the arrivals hall to the taxis.
// Walls, gates, carousels and the channels' dividers are solid; travellers walk about and wait at the belts.
// Scores are kept on this device only; nothing here pays money.
/* eslint-disable react-hooks/immutability */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import WALK from "@/data/flights/airport-walk.json";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { ROSTER } from "@/components/avatar/roster";
import { MoveStick, type Controls } from "@/components/street/StreetWorld";
import { CITIES, type CityId } from "@/lib/city/cities";
import { airportOf, AIRLINE } from "@/lib/flights";
import { canvasQuality } from "@/lib/device";
import { gameAudio } from "@/utils/gameAudio";
import { FadeContext, FloorGuide, Followers, Sheet, Sign, Suitcase, type Route } from "./AirportWalk";
import type { Companion } from "./Flight";

type Look = Parameters<typeof CitizenAvatar>[0]["look"];
type Arr = (typeof WALK.airports)["dubai"]["arrival"];
type StepId = "immigration" | "baggage" | "customs" | "exit";
const STEPS: { id: StepId; title: string; icon: string }[] = [
  { id: "immigration", title: "Passport control", icon: "🛂" },
  { id: "baggage", title: "Baggage claim", icon: "🧳" },
  { id: "customs", title: "Customs", icon: "🛃" },
  { id: "exit", title: "Arrivals hall", icon: "🚕" },
];

const R = 0.35, WALK_SPEED = 3.2, RUN_SPEED = 5.6, WALL_H = 6;
const EGATES = [-4.5, -1.5, 1.5, 4.5];
/** The three carousels (x of each; they run z 22–34), and the belt numbers on their screens. */
const BELTS = [-12, 0, 12];
const BELT = { z1: 22, z2: 34, half: 1.5 };
const LOOP = { x: BELT.half + 0.05, z1: BELT.z1 - 0.05, z2: BELT.z2 + 0.05 };
/** Bags on each belt, going round: yours is on your flight's belt. */
const PER_BELT = 9, BELT_SPEED = 0.9;
const BAG_COLOURS = ["#1e293b", "#b91c1c", "#334155", "#7c3aed", "#a16207", "#0f766e", "#be185d", "#111827", "#475569"];

interface Box { x1: number; z1: number; x2: number; z2: number; h: number; c: string; id?: string; glass?: boolean }

function layout() {
  const boxes: Box[] = [];
  const wall = "#f7f5f0";
  const add = (x1: number, z1: number, x2: number, z2: number, h = WALL_H, c = wall, extra: Partial<Box> = {}) => boxes.push({ x1, z1, x2, z2, h, c, ...extra });
  // The corridor from the plane (z 0–9).
  add(-6, -0.4, 6, 0, WALL_H, "#9fc7dd", { glass: true }); add(-6.4, 0, -6, 9); add(6, 0, 6.4, 9);
  // Passport control (z 9–16): the e-gates across the middle and officers' desks either side (the gates' barriers open).
  add(-14, 9, -6, 9.4); add(6, 9, 14, 9.4); add(-14.4, 9, -14, 16); add(14, 9, 14.4, 16);
  let from = -8.1;
  for (const g of EGATES) { add(from, 12.8, g - 0.5, 13.2, 1.3, "#94a3b8"); add(g - 0.5, 12.9, g + 0.5, 13.1, 1.0, "#7dd3fc", { id: `egate:${g}`, glass: true }); from = g + 0.5; }
  add(from, 12.8, 8.1, 13.2, 1.3, "#94a3b8");
  add(-14, 12.6, -8.1, 13.4, 1.2, "#cbd5e1"); add(8.1, 12.6, 14, 13.4, 1.2, "#cbd5e1");
  // The baggage hall (z 16–40) and its carousels.
  add(-22, 16, -14, 16.4); add(14, 16, 22, 16.4); add(-22.4, 16, -22, 40); add(22, 16, 22.4, 40);
  for (const x of BELTS) add(x - BELT.half, BELT.z1, x + BELT.half, BELT.z2, 0.7, "#1f2937");
  // Customs (z 40–50): the green and red channels either side of the divider; then the arrivals hall (z 50–62).
  add(-22, 40, -8, 40.4); add(8, 40, 22, 40.4); add(-8.4, 40, -8, 50); add(8, 40, 8.4, 50);
  add(-1, 42.5, 1, 50, 2.4, "#cbd5e1");
  add(-20, 50, -8.4, 50.4); add(8.4, 50, 20, 50.4); add(-20.4, 50, -20, 62); add(20, 50, 20.4, 62);
  add(-20, 62, -3, 62.4); add(3, 62, 20, 62.4); add(-3, 62, 3, 62.4, WALL_H, "#9fc7dd", { glass: true });
  // People waiting at the belts.
  for (const [x, z] of WAITING) add(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 0, "#64748b", { id: "person" });
  const pillars: Array<[number, number]> = [[-17, 20], [17, 20], [-17, 36], [17, 36], [-12, 56], [12, 56]];
  for (const [x, z] of pillars) boxes.push({ x1: x - 0.45, z1: z - 0.45, x2: x + 0.45, z2: z + 0.45, h: WALL_H, c: "#d9d2c3", id: "pillar" });
  return { boxes, pillars };
}
const WAITING: Array<[number, number]> = [[-14.3, 25], [-14.3, 30], [2.3, 24], [-2.3, 31], [14.3, 27], [9.7, 32]];
const WALKERS: Array<{ a: [number, number]; b: [number, number]; speed: number }> = [
  { a: [-19, 18], b: [-19, 38], speed: 1.2 }, { a: [19, 38], b: [19, 18], speed: 1.3 }, { a: [-20, 38.5], b: [20, 38.5], speed: 1.15 },
  { a: [-16, 53], b: [16, 53], speed: 1.25 }, { a: [16, 59], b: [-16, 59], speed: 1.1 },
];
const lookOf = (i: number) => { const r = ROSTER[(i * 5 + 4) % ROSTER.length]; return { gender: r.gender, preset: r.id }; };
const walkerAt = (w: (typeof WALKERS)[number], t: number) => {
  const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = (t * w.speed) % (2 * len), f = (d < len ? d : 2 * len - d) / len;
  return { x: w.a[0] + (w.b[0] - w.a[0]) * f, z: w.a[1] + (w.b[1] - w.a[1]) * f, dir: d < len ? 1 : -1 };
};
/** Where a bag is on its belt's loop (0–1 round it). */
function loopAt(x0: number, u: number) {
  const w = 2 * LOOP.x, h = LOOP.z2 - LOOP.z1, per = 2 * (w + h);
  let d = ((u % 1) + 1) % 1 * per;
  if (d < h) return { x: x0 + LOOP.x, z: LOOP.z1 + d };
  d -= h; if (d < w) return { x: x0 + LOOP.x - d, z: LOOP.z2 };
  d -= w; if (d < h) return { x: x0 - LOOP.x, z: LOOP.z2 - d };
  d -= h; return { x: x0 - LOOP.x + d, z: LOOP.z1 };
}

interface Live { x: number; z: number; yaw: number; moving: boolean; t: number; step: number; carryBig: boolean; open: Set<string>; bumpCool: number; bumps: number; hint: boolean; quizDone: boolean; channel: "green" | "red" | null }

function targetOf(s: Live, mine: number): [number, number] {
  switch (STEPS[s.step]?.id) {
    case "immigration": return s.z < 12.8 ? [-1.5, 12.2] : [-1.5, 15];
    case "baggage": return [BELTS[mine] - LOOP.x - 0.9, 28];
    case "customs": return s.quizDone ? [-4, 49] : [0, 41.5];
    case "exit": return [0, 60.5];
    default: return [s.x, s.z];
  }
}

function World({ look, mine, myBag, code, beltNo, to, live, controls, onNear, onEvent, companions }: {
  look: Look; companions: Companion[]; mine: number; myBag: number; code: string; beltNo: number[]; to: string; live: React.RefObject<Live>; controls: React.RefObject<Controls>;
  onNear: (id: string | null) => void; onEvent: (e: { kind: "bump" | "pass" | "channel"; text?: string; channel?: "green" | "red" }) => void;
}) {
  const { boxes, pillars } = useMemo(() => layout(), []);
  const camera = useThree((s) => s.camera);
  const orbit = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const me = useRef<THREE.Group>(null), big = useRef<THREE.Group>(null), small = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null);
  const bags = useRef<Array<THREE.Group | null>>([]);
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
    s.t += dt; s.bumpCool = Math.max(0, s.bumpCool - dt);
    const k = keys.current;
    const ix = controls.current.x + (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const iy = controls.current.y + (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const len = Math.hypot(ix, iy);
    let moving = false;
    if (len > 0.05) {
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const sp = (k.has("shift") || controls.current.sprint ? RUN_SPEED : WALK_SPEED) * Math.min(1, len);
      const vx = (right.x * ix + fwd.x * iy) / len * sp, vz = (right.z * ix + fwd.z * iy) / len * sp;
      const prevZ = s.z;
      if (!solid(s.x + vx * dt, s.z)) s.x += vx * dt;
      if (!solid(s.x, s.z + vz * dt)) s.z += vz * dt;
      s.yaw = Math.atan2(vx, vz); moving = true;
      const id = STEPS[s.step]?.id;
      if (id === "immigration" && s.z > 13.6) onEvent({ kind: "pass" });
      // Customs: through a channel (green on the left, red on the right) once you've read the sign.
      if (id === "customs" && prevZ < 47 && s.z >= 47) {
        if (!s.quizDone) { s.z = 46.5; onEvent({ kind: "channel", text: "Read the customs sign first: it tells you what has to be declared." }); }
        else onEvent({ kind: "channel", channel: s.x < 0 ? "green" : "red" });
      }
    }
    if (moving !== s.moving) { s.moving = moving; setAnim(moving ? "walk" : "idle"); }

    // Travellers walking about: bumping into one.
    WALKERS.forEach((w, i) => {
      const at = walkerAt(w, s.t + i * 5), g = walkers.current[i];
      if (g) { g.position.set(at.x, 0, at.z); g.rotation.y = Math.atan2(w.b[0] - w.a[0], w.b[1] - w.a[1]) + (at.dir < 0 ? Math.PI : 0); }
      const dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz), min = 0.35 + R;
      if (d < min && d > 0.001) {
        const px = at.x + (dx / d) * min, pz = at.z + (dz / d) * min;
        if (!solid(px, pz)) { s.x = px; s.z = pz; }
        if (s.bumpCool <= 0) { s.bumpCool = 1.2; s.bumps++; onEvent({ kind: "bump", text: "Oops! “Excuse me!” Watch where you're walking." }); }
      }
    });

    // The bags going round the carousels (yours is on your flight's belt, until you take it).
    let nearBag: number | null = null, nearD = 1.4;
    BELTS.forEach((x0, b) => {
      for (let i = 0; i < PER_BELT; i++) {
        const n = b * PER_BELT + i, g = bags.current[n];
        const at = loopAt(x0, s.t * BELT_SPEED / (2 * (2 * LOOP.x + LOOP.z2 - LOOP.z1)) + i / PER_BELT);
        const taken = n === myBag && s.carryBig;
        if (g) { g.position.set(at.x, 0.7, at.z); g.visible = !taken; }
        if (!taken && STEPS[s.step]?.id === "baggage") { const d = Math.hypot(s.x - at.x, s.z - at.z); if (d < nearD) { nearD = d; nearBag = n; } }
      }
    });

    me.current?.position.set(s.x, 0, s.z);
    if (me.current) me.current.rotation.y = s.yaw;
    const side = (off: number, back: number) => [s.x + Math.cos(s.yaw) * off - Math.sin(s.yaw) * back, s.z - Math.sin(s.yaw) * off - Math.cos(s.yaw) * back] as const;
    if (small.current) { const [bx, bz] = side(0.45, 0.15); small.current.position.set(bx, 0, bz); small.current.rotation.y = s.yaw; }
    if (big.current) { big.current.visible = s.carryBig; const [bx, bz] = side(-0.45, 0.3); big.current.position.set(bx, 0, bz); big.current.rotation.y = s.yaw; }
    for (const [id, m] of Object.entries(barriers.current)) if (m) m.visible = !s.open.has(id);

    const at = new THREE.Vector3(s.x, 1.4, s.z);
    if (orbit) {
      if (!last.current) { camera.position.set(s.x, 6.5, s.z - 8); last.current = at.clone(); }
      camera.position.add(at.clone().sub(last.current));
      orbit.target.copy(at); orbit.update(); last.current.copy(at);
    }
    // Walls and signs between the camera and you fade.
    const walls = tall.current.filter((m): m is THREE.Mesh => !!m);
    const toCam = camera.position.clone().sub(at), dist = toCam.length();
    ray.set(at, toCam.normalize()); ray.far = dist;
    const hit = new Set<THREE.Object3D>(ray.intersectObjects(walls, false).map((h) => h.object));
    const lookDir = at.clone().sub(camera.position), meDepth = lookDir.length(); lookDir.normalize();
    for (const m of signs.current) { const d = m.position.clone().sub(camera.position).dot(lookDir); if (d > 0 && d < meDepth + 1) hit.add(m); }
    for (const m of [...walls, ...signs.current]) {
      const mat = m.material as THREE.Material, base = mat.userData.base ?? (mat.userData.base = mat.opacity);
      mat.opacity += ((hit.has(m) ? 0.12 : base) - mat.opacity) * Math.min(1, dt * 10);
      mat.depthWrite = mat.opacity > 0.9;
    }

    const [tx, tz] = targetOf(s, mine);
    if (arrow.current) { arrow.current.visible = s.hint; arrow.current.position.set(s.x, 0.06, s.z); arrow.current.rotation.y = Math.atan2(tx - s.x, tz - s.z); }
    if (ring.current) { ring.current.visible = s.hint; ring.current.position.set(tx, 0.05, tz); }

    let near: string | null = null;
    const id = STEPS[s.step]?.id;
    if (id === "immigration") { const g = EGATES.find((g) => Math.abs(s.x - g) < 0.7 && s.z > 11.6 && s.z < 12.8); if (g !== undefined && !s.open.has(`egate:${g}`)) near = `egate:${g}`; }
    else if (id === "baggage" && nearBag !== null) near = `bag:${nearBag}`;
    else if (id === "customs" && !s.quizDone && Math.hypot(s.x, s.z - 41.5) < 2.2) near = "customs-sign";
    else if (id === "exit" && Math.hypot(s.x, s.z - 60.5) < 2) near = "exit";
    if (near !== nearId.current) { nearId.current = near; onNear(near); }
  });

  const routes: Route[] = [
    { pts: [[0, 2], [0, 10.5], [-1.5, 12], [-1.5, 15.2]], color: "#2563eb", label: "PASSPORT CONTROL" },
    { pts: [[-1.5, 15.2], [BELTS[mine] - LOOP.x - 1.1, 19.5], [BELTS[mine] - LOOP.x - 1.1, 28]], color: "#d97706", label: `BAGGAGE · BELT ${beltNo[mine]}` },
    { pts: [[BELTS[mine] - LOOP.x - 1.1, 35.5], [-4, 39.5], [-4, 49]], color: "#16a34a", label: "CUSTOMS" },
    { pts: [[-4, 50.5], [0, 54], [0, 60.5]], color: "#7c3aed", label: "EXIT · TAXIS" },
  ];

  return (
    <FadeContext.Provider value={addSign}>
      <color attach="background" args={["#dbeaf5"]} />
      <hemisphereLight args={["#ffffff", "#c7b9a0", 1.1]} />
      <directionalLight position={[20, 40, 10]} intensity={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 31]}><planeGeometry args={[46, 66]} /><meshStandardMaterial color="#ece6da" roughness={0.35} /></mesh>
      {boxes.filter((b) => b.id !== "pillar" && b.id !== "person").map((b, i) => {
        const isBarrier = b.id?.startsWith("egate:");
        return (
          <mesh key={i} ref={isBarrier ? (m) => { barriers.current[b.id!] = m; } : b.h >= 2.2 ? (m) => { tall.current[i] = m; } : undefined} position={[(b.x1 + b.x2) / 2, b.h / 2, (b.z1 + b.z2) / 2]}>
            <boxGeometry args={[b.x2 - b.x1, b.h, b.z2 - b.z1]} />
            <meshStandardMaterial color={b.c} transparent opacity={b.glass ? 0.45 : 1} roughness={0.6} />
          </mesh>
        );
      })}
      {pillars.map(([x, z], i) => <mesh key={`p${i}`} position={[x, WALL_H / 2, z]}><cylinderGeometry args={[0.45, 0.45, WALL_H, 16]} /><meshStandardMaterial color="#d9d2c3" /></mesh>)}
      <FloorGuide routes={routes} />

      <Sign at={[0, 4.6, 8.8]} size={[8, 1.1]} rotY={Math.PI} lines={[{ t: `Welcome to ${to} · Arrivals ↑`, s: 84 }]} bg="#0f172a" />
      <Sign at={[0, 4.4, 12]} size={[8, 1.1]} rotY={Math.PI} lines={[{ t: `🛂 ${code} Passport control ↑`, s: 84 }]} bg="#1e3a8a" />
      {/* The belt screens: each belt's flight. */}
      {BELTS.map((x, b) => (
        <Sign key={x} at={[x, 3.2, 20.6]} size={[3.2, 1.3]} rotY={Math.PI} bg={b === mine ? AIRLINE.colors.tail : "#1f2937"}
          lines={[{ t: `BELT ${beltNo[b]}`, s: 120 }, { t: b === mine ? `${AIRLINE.code} 107 · bags arriving` : ["GW 221 · LONDON", "SO 452 · MUMBAI", "FA 903 · CAIRO"][b], s: 66, c: "#e2e8f0" }]} />
      ))}
      <Sign at={[0, 4.2, 41.2]} size={[7, 1.6]} rotY={Math.PI} bg="#14532d" lines={[{ t: "🛃 CUSTOMS", s: 110 }, { t: "← Nothing to declare · Goods to declare →", s: 62, c: "#e2e8f0" }]} />
      <Sign at={[-4.5, 3, 43]} size={[4, 0.9]} rotY={Math.PI} bg="#16a34a" lines={[{ t: "NOTHING TO DECLARE", s: 92 }]} />
      <Sign at={[4.5, 3, 43]} size={[4, 0.9]} rotY={Math.PI} bg="#dc2626" lines={[{ t: "GOODS TO DECLARE", s: 92 }]} />
      <Sign at={[0, 4.4, 61.8]} size={[8, 1.1]} rotY={Math.PI} bg="#0f172a" lines={[{ t: "🚕 Taxis · Metro · Ride apps ↑", s: 84 }]} />

      {/* The bags on the carousels. */}
      {BELTS.flatMap((_, b) => Array.from({ length: PER_BELT }, (_, i) => b * PER_BELT + i)).map((n) => (
        <group key={n} ref={(g) => { bags.current[n] = g; }}>
          <Suitcase big color={n === myBag ? AIRLINE.colors.tail : BAG_COLOURS[(n * 4) % BAG_COLOURS.length]} />
          {n === myBag && <mesh position={[0, 0.72, 0.15]}><boxGeometry args={[0.12, 0.18, 0.02]} /><meshBasicMaterial color="#facc15" /></mesh>}
        </group>
      ))}
      <Suspense fallback={null}>
        {WALKERS.map((_, i) => (
          <group key={`w${i}`} ref={(g) => { walkers.current[i] = g; }}>
            <CitizenAvatar look={lookOf(i)} animation="walk" pace={WALKERS[i].speed} />
            <group position={[0.4, 0, -0.2]}><Suitcase big={i % 2 === 0} color={BAG_COLOURS[i % BAG_COLOURS.length]} /></group>
          </group>
        ))}
        {WAITING.map(([x, z], i) => (
          <group key={`q${i}`} position={[x, 0, z]} rotation={[0, x < BELTS[Math.round((x + 12) / 12)] ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <CitizenAvatar look={lookOf(i + 20)} animation={i % 2 ? "idle" : "talk"} />
          </group>
        ))}
      </Suspense>
      <group ref={big}><Suitcase big color={AIRLINE.colors.tail} /></group>
      <group ref={small}><Suitcase big={false} color="#1e293b" /></group>
      <group ref={arrow}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.2]}><circleGeometry args={[0.45, 3]} /><meshBasicMaterial color="#10b981" /></mesh></group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.7, 0.95, 32]} /><meshBasicMaterial color="#10b981" transparent opacity={0.85} /></mesh>
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} pace={anim === "walk" ? WALK_SPEED : undefined} /></Suspense></group>
      <Followers companions={companions} live={live} walking={anim === "walk"} />
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3.5} maxDistance={16} minPolarAngle={0.4} maxPolarAngle={1.35} />
    </FadeContext.Provider>
  );
}

export function ArrivalWalk({ city, look, seed, onDone, onSkip, companions = [] }: { city: CityId; look: Look; seed: number; onDone: () => void; onSkip: () => void;
  /** Who's travelling with you (family trips): they walk behind you. */
  companions?: Companion[] }) {
  const arr = (WALK.airports[city] as { arrival: Arr }).arrival;
  const cityName = CITIES[city].name;
  const code = airportOf(city).code;
  // Your flight's belt is the screens' highlighted one; the other two belts have other flights.
  const mine = arr.belt % 3;
  const beltNo = BELTS.map((_, b) => (b === mine ? arr.belt : arr.belt + (b - mine) * 2 + (b < mine ? -1 : 1)));
  const myBag = mine * PER_BELT + (Math.abs(seed) % PER_BELT);
  const quality = useMemo(() => canvasQuality(), []);
  const controls = useRef<Controls>({ x: 0, y: 0 });
  const live = useRef<Live>({ x: 0, z: 2, yaw: 0, moving: false, t: 0, step: 0, carryBig: false, open: new Set(), bumpCool: 0, bumps: 0, hint: false, quizDone: false, channel: null });
  const [step, setStep] = useState(0);
  const [near, setNear] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "info" | "bad" | "good" } | null>(null);
  const [hint, setHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [bumps, setBumps] = useState(0);
  const [done, setDone] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(true);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (text: string, tone: "info" | "bad" | "good" = "info", ms = 3200) => {
    setToast({ text, tone });
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), ms);
  };
  const next = () => { const s = live.current; s.step++; setStep(s.step); setShowTip(true); gameAudio.sfx?.("chime"); };
  const onEvent = (e: { kind: string; text?: string; channel?: "green" | "red" }) => {
    const s = live.current;
    if (e.kind === "bump") { gameAudio.sfx?.("mgThud"); setBumps(s.bumps); say(e.text!, "bad", 1800); }
    if (e.kind === "pass" && STEPS[s.step]?.id === "immigration") { say(`Welcome to ${cityName} ✓ Next: find your bag. Your flight is on belt ${arr.belt}.`, "good", 4200); next(); }
    if (e.kind === "channel") {
      if (e.text) { say(e.text, "bad"); return; }
      if (s.channel) return;
      s.channel = e.channel!;
      if (e.channel === "green") say("Green channel ✓ Nothing to declare: straight through to arrivals.", "good");
      else { setMistakes((m) => m + 1); say("“Anything to declare?” “No…” The red channel is for goods or cash you need to declare: you could have used the green one.", "bad", 5200); }
      next();
    }
  };
  const act = () => {
    const s = live.current;
    if (!near) return;
    gameAudio.playClickSound();
    if (near.startsWith("egate:")) {
      say("📷 Look at the camera…", "info", 1400);
      setTimeout(() => { s.open.add(near); gameAudio.sfx?.("open"); say("✓ Passport read. Walk through.", "good"); }, 1300);
      return;
    }
    if (near.startsWith("bag:")) {
      const n = Number(near.split(":")[1]);
      if (n !== myBag) { setMistakes((m) => m + 1); gameAudio.sfx?.("error"); say(`That's not yours: the tag says someone else's name. Yours is the ${AIRLINE.name} teal case with a yellow tag, on belt ${arr.belt}.`, "bad", 4200); return; }
      s.carryBig = true; say("Got your bag ✓ Tag checked. Now through customs.", "good"); next(); return;
    }
    if (near === "customs-sign") { setQuiz(true); return; }
    if (near === "exit") {
      let stars = 3;
      if (bumps > 3 || mistakes > 1) stars--;
      if (hintUsed) stars--;
      gameAudio.sfx?.("levelup");
      setDone(Math.max(1, stars));
    }
  };
  const answer = (right: boolean) => {
    if (!right) { setMistakes((m) => m + 1); gameAudio.sfx?.("error"); say(arr.customsQuiz.why, "bad", 5600); return; }
    gameAudio.playClickSound(); setQuiz(false); live.current.quizDone = true;
    say("Right ✓ You've nothing to declare: take the green channel on the left.", "good", 3600);
  };

  const cur = STEPS[step];
  const tip = cur ? (arr.tips as Record<StepId, string>)[cur.id] : "";
  const instruction = cur?.id === "immigration" ? "Step into an e-gate and scan your passport."
    : cur?.id === "baggage" ? `Go to belt ${arr.belt} and take your bag: the teal case with the yellow tag.`
    : cur?.id === "customs" ? "Read the customs sign, then pick your channel."
    : cur?.id === "exit" ? "Out through the arrivals hall to the taxis." : "";
  const label = !near ? null : near.startsWith("egate:") ? "🛂 Scan your passport" : near.startsWith("bag:") ? "🧳 Take this bag" : near === "customs-sign" ? "🛃 Read the customs sign" : near === "exit" ? "🚕 Out to the taxis" : null;

  return (
    <main className="fixed inset-0 z-[60] bg-slate-950 select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ position: [0, 6.5, -6], fov: 60, near: 0.1, far: 400 }} gl={{ powerPreference: quality.powerPreference }}>
        <World companions={companions} look={look} mine={mine} myBag={myBag} code={code} beltNo={beltNo} to={cityName} live={live} controls={controls} onNear={setNear} onEvent={onEvent} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-2xl bg-slate-950/85 text-white px-3 py-2 max-w-[78%] pointer-events-auto">
            <p className="text-[11px] font-bold text-teal-300">{code} · Arrivals · step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</p>
            <p className="text-sm font-black">{cur ? `${cur.icon} ${cur.title}` : "🚕 Welcome!"}</p>
            <p className="text-xs text-white/80">{instruction}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
            <span className="rounded-full bg-slate-950/85 text-white text-xs font-black px-3 py-1.5">💥 {bumps}</span>
            <button onClick={() => { const v = !hint; setHint(v); live.current.hint = v; if (v) setHintUsed(true); }} className={`rounded-full text-xs font-black px-3 py-1.5 ${hint ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-900"}`}>🧭 {hint ? "Hide the way" : "Show me the way"}</button>
            <button onClick={onSkip} className="rounded-full bg-white/20 text-white text-[11px] font-black px-3 py-1">Skip ›</button>
          </div>
        </div>
        {tip && showTip && (
          <button onClick={() => setShowTip(false)} className="self-start max-w-md text-left rounded-2xl bg-amber-50/95 text-slate-900 px-3 py-2 text-xs pointer-events-auto">
            <b>💡 Real-life tip:</b> {tip} <span className="text-slate-400">(tap to hide)</span>
          </button>
        )}
        {toast && <p className={`self-center max-w-md rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-lg ${toast.tone === "bad" ? "bg-rose-600" : toast.tone === "good" ? "bg-emerald-600" : "bg-slate-900"}`}>{toast.text}</p>}
      </div>
      {done === null && !quiz && (
        <>
          <div className="absolute left-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))]"><MoveStick controls={controls} /></div>
          {label && <button onClick={act} className="absolute right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+11rem)] sm:bottom-[max(2rem,env(safe-area-inset-bottom))] max-w-[60%] min-h-14 py-2 px-5 rounded-2xl bg-teal-600 text-white font-black shadow-xl animate-pulse">{label}</button>}
        </>
      )}
      {quiz && (
        <Sheet title="🛃 Customs" sub="You're carrying your own laptop and phone, and a duty-free perfume.">
          <p className="font-black">{arr.customsQuiz.q}</p>
          {arr.customsQuiz.options.map((o) => <button key={o.text} onClick={() => answer(o.right)} className="w-full h-12 rounded-2xl bg-slate-100 font-black text-slate-900">{o.text}</button>)}
        </Sheet>
      )}
      {done !== null && (
        <Sheet title={`🎉 Welcome to ${cityName}!`} sub={`${airportOf(city).name} · arrivals`}>
          <p className="text-4xl text-center">{"⭐".repeat(done)}{"☆".repeat(3 - done)}</p>
          <p className="text-center text-sm text-slate-600">{bumps} bump{bumps === 1 ? "" : "s"} · {mistakes} mistake{mistakes === 1 ? "" : "s"}{hintUsed ? " · used the guide" : ""}</p>
          <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
            <li>Passport control first: e-gates or the officer&apos;s desk.</li>
            <li>The screens show your flight&apos;s belt; check the tag before you take a bag.</li>
            <li>Green channel if you&apos;ve nothing to declare; red for goods or large amounts of cash.</li>
          </ul>
          <p className="text-xs text-slate-600">💡 {arr.tips.exit}</p>
          <button onClick={onDone} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black">Out to the arrivals hall ›</button>
        </Sheet>
      )}
    </main>
  );
}
