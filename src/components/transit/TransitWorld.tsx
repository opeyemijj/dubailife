"use client";

// The world a metro or taxi journey travels through: Sheikh Zayed Road with traffic, the elevated metro
// viaduct beside it, city blocks that change by district (Downtown towers, Al Barsha, the Marina), the
// Burj Khalifa, Salik gates, metro stations with platform screen doors, and the light of the time of day.
//
// The route runs along -z. Everything is placed by its distance along the route (p, metres) relative to
// how far the traveller has gone (s): z = s - p. Buildings, pillars and lamps are recycled as they pass.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type District = "burj" | "towers" | "lowrise" | "mall" | "marina";
/** How far along the route the traveller is, read every frame. */
export type Travel = React.RefObject<{ s: number; speed: number }>;

/** Each carriageway is five 3.5 m lanes either side of a 4 m median; pavements run along the outside. */
export const ROAD = { half: 17.5, laneW: 3.5, median: 4, pavement: 4 };
/** The metro viaduct runs beside the road on its left (x), its deck this high. */
export const VIADUCT = { x: -27, deck: 9 };

const hash = (i: number, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- time of day

export type Sky = "day" | "sunset" | "night";
export function dubaiSky(now = new Date()): Sky {
  const h = (now.getUTCHours() + 4 + now.getUTCMinutes() / 60) % 24;
  return h >= 6.2 && h < 17 ? "day" : h >= 17 && h < 18.6 ? "sunset" : "night";
}
const SKY_COLOR: Record<Sky, string> = { day: "#9fd3f5", sunset: "#f6a66b", night: "#0b1026" };

export function SkyAndLight({ sky }: { sky: Sky }) {
  return (
    <>
      <color attach="background" args={[SKY_COLOR[sky]]} />
      <fog attach="fog" args={[SKY_COLOR[sky], 140, 420]} />
      <hemisphereLight args={[sky === "night" ? "#3b4a7a" : "#ffffff", sky === "night" ? "#0b0b16" : "#c2a878", sky === "night" ? 0.45 : 0.9]} />
      <directionalLight position={sky === "sunset" ? [-80, 25, -120] : [40, 90, 30]} intensity={sky === "night" ? 0.25 : sky === "sunset" ? 1.4 : 2.2} color={sky === "sunset" ? "#ffb070" : "#ffffff"} />
      {sky !== "night" && <mesh position={sky === "sunset" ? [-160, 30, -380] : [120, 220, -360]}><sphereGeometry args={[sky === "sunset" ? 18 : 10, 24, 16]} /><meshBasicMaterial color={sky === "sunset" ? "#ffcf8a" : "#fffbe8"} fog={false} /></mesh>}
    </>
  );
}

// ---------------------------------------------------------------- textures

function windowTexture(night: boolean) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = night ? "#0f172a" : "#7c93ad"; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
    const lit = night ? hash(x, y + 3) > 0.45 : true;
    g.fillStyle = night ? (lit ? "#fde68a" : "#1e293b") : (hash(x, y) > 0.5 ? "#bcd7ef" : "#9fbbd6");
    g.fillRect(x * 21 + 3, y * 16 + 3, 16, 11);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function laneTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3a3f47"; g.fillRect(0, 0, 64, 256);
  g.fillStyle = "#e5e7eb"; g.fillRect(29, 0, 6, 120);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------- the road

/** Sheikh Zayed Road: six lanes each way, the median with palms, kerbs and streetlights. */
export function Road({ travel, sky }: { travel: Travel; sky: Sky }) {
  const tex = useMemo(() => { const t = laneTexture(); t.repeat.set(1, 60); return t; }, []);
  const lanesRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = travel.current?.s ?? 0;
    // The lane dashes slide past (texture scroll), 8 m per repeat. (They all share the one texture.)
    const map = ((lanesRef.current?.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined)?.map;
    if (map) map.offset.y = -(s / 8) % 1;
  });
  const lanes = [-1, 1].flatMap((side) => [0, 1, 2, 3].map((k) => side * (ROAD.median / 2 + ROAD.laneW * (k + 1))));
  return (
    <group>
      <mesh position={[0, -0.05, -150]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[400, 900]} /><meshStandardMaterial color="#cdb68a" roughness={1} /></mesh>
      <mesh position={[0, 0.0, -150]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[ROAD.half * 2 + ROAD.median, 900]} /><meshStandardMaterial color="#3a3f47" roughness={0.9} /></mesh>
      <group ref={lanesRef}>
        {lanes.map((x, i) => <mesh key={i} position={[x, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.18, 900]} /><meshStandardMaterial map={tex} transparent opacity={0.9} /></mesh>)}
      </group>
      {/* pavements with kerbs */}
      {[-1, 1].map((k) => <mesh key={k} position={[k * (ROAD.half + ROAD.median / 2 + ROAD.pavement / 2), 0.08, -150]}><boxGeometry args={[ROAD.pavement, 0.16, 900]} /><meshStandardMaterial color="#e7e0d2" roughness={0.95} /></mesh>)}
      {/* the median, with its low wall */}
      <mesh position={[0, 0.25, -150]}><boxGeometry args={[ROAD.median, 0.5, 900]} /><meshStandardMaterial color="#d6d3d1" /></mesh>
      <mesh position={[0, 0.52, -150]}><boxGeometry args={[ROAD.median - 0.6, 0.06, 900]} /><meshStandardMaterial color="#65a30d" /></mesh>
      <Recycled travel={travel} spacing={22} count={26} render={(i) => <MedianPalm seed={i} />} x={0} />
      <Recycled travel={travel} spacing={30} count={20} render={() => <StreetLamp on={sky !== "day"} />} x={ROAD.half + ROAD.median / 2 + 1.2} />
      <Recycled travel={travel} spacing={30} count={20} render={() => <StreetLamp on={sky !== "day"} flip />} x={-(ROAD.half + ROAD.median / 2 + 1.2)} offset={15} />
    </group>
  );
}

function MedianPalm({ seed }: { seed: number }) {
  const h = 5 + hash(seed, 7) * 2;
  return (
    <group>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.16, 0.24, h, 8]} /><meshStandardMaterial color="#8b6b4a" /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 7) * Math.PI * 2) * 1, h - 0.1, Math.sin((i / 7) * Math.PI * 2) * 1]} rotation={[Math.sin((i / 7) * Math.PI * 2) * 0.7, 0, -Math.cos((i / 7) * Math.PI * 2) * 0.7]}>
          <boxGeometry args={[0.35, 0.05, 2.4]} /><meshStandardMaterial color="#3f7d3a" />
        </mesh>
      ))}
    </group>
  );
}

function StreetLamp({ on, flip = false }: { on: boolean; flip?: boolean }) {
  const k = flip ? 1 : -1;
  return (
    <group>
      <mesh position={[0, 5, 0]}><cylinderGeometry args={[0.08, 0.12, 10, 8]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} /></mesh>
      <mesh position={[k * 1.4, 9.9, 0]}><boxGeometry args={[2.8, 0.1, 0.18]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} /></mesh>
      <mesh position={[k * 2.7, 9.75, 0]}><boxGeometry args={[0.7, 0.18, 0.3]} /><meshStandardMaterial color={on ? "#fff3c4" : "#e5e7eb"} emissive={on ? "#ffd27a" : "#000000"} emissiveIntensity={on ? 2 : 0} /></mesh>
    </group>
  );
}

/** A row of identical things along the route, recycled as they pass (every `spacing` metres). */
export function Recycled({ travel, spacing, count, render, x, y = 0, offset = 0 }: {
  travel: Travel; spacing: number; count: number; render: (i: number) => React.ReactNode; x: number; y?: number; offset?: number;
}) {
  const g = useRef<THREE.Group>(null);
  const span = spacing * count;
  useFrame(() => {
    const s = travel.current?.s ?? 0;
    g.current?.children.forEach((c, i) => {
      // Place each slot in the window [s - 40, s - 40 + span).
      let p = i * spacing + offset;
      p += Math.ceil((s - 40 - p) / span) * span;
      c.position.set(x, y, s - p);
    });
  });
  return <group ref={g}>{Array.from({ length: count }, (_, i) => <group key={i}>{render(i)}</group>)}</group>;
}

// ---------------------------------------------------------------- buildings

/** City blocks either side, in the style of the district they're in (`districtAt(p)`). */
export function CityBlocks({ travel, sky, districtAt, sides = [1, -1] }: { travel: Travel; sky: Sky; districtAt: (p: number) => District; sides?: number[] }) {
  const night = sky === "night";
  const tex = useMemo(() => windowTexture(night), [night]);
  const COUNT = 28, SPACING = 26;
  const slots = useMemo(() => sides.flatMap((side) => Array.from({ length: COUNT }, (_, i) => ({ side, i }))), [sides]);
  const mats = useMemo(() => ["#cbd5e1", "#94a3b8", "#e2e8f0", "#a5b4fc", "#d6c7a8"].map((c) => new THREE.MeshStandardMaterial({
    color: c, map: tex, metalness: 0.35, roughness: 0.45,
    emissive: night ? "#ffd27a" : "#000000", emissiveMap: night ? tex : null, emissiveIntensity: night ? 0.6 : 0,
  })), [tex, night]);
  const group = useRef<THREE.Group>(null);
  const span = SPACING * COUNT;
  // Each slot's building is rebuilt (resized) when it's recycled into a new district.
  const lastKey = useRef<string[]>([]);
  useFrame(() => {
    const s = travel.current?.s ?? 0;
    group.current?.children.forEach((child, n) => {
      const { side, i } = slots[n];
      let p = i * SPACING + (side > 0 ? 0 : SPACING / 2);
      const k = Math.ceil((s - 50 - p) / span);
      p += k * span;
      const d = districtAt(p);
      const seed = i * 31 + k * 7 + (side > 0 ? 0 : 3);
      const key = `${d}:${seed}`;
      const mesh = child as THREE.Mesh;
      if (lastKey.current[n] !== key) {
        lastKey.current[n] = key;
        const tall = d === "burj" || d === "towers" || d === "marina";
        const h = d === "lowrise" ? 8 + hash(seed, 1) * 16 : d === "mall" ? 12 + hash(seed, 1) * 10 : tall ? 35 + hash(seed, 1) * (d === "marina" ? 110 : 85) : 20;
        const w = d === "mall" ? 30 : 10 + hash(seed, 2) * 10;
        mesh.scale.set(w, h, 10 + hash(seed, 3) * 8);
        mesh.material = mats[Math.floor(hash(seed, 4) * mats.length)];
        mesh.userData.h = h;
      }
      // Back from the pavement (further on the metro side, behind the viaduct).
      const setback = ROAD.half + ROAD.median / 2 + ROAD.pavement + 8 + hash(seed, 5) * 10 + (side < 0 ? 14 : 0);
      mesh.position.set(side * setback, (mesh.userData.h as number) / 2, s - p);
    });
  });
  // A unit box with its UVs tiled so window texture repeats sensibly across any size.
  const geo = useMemo(() => { const g = new THREE.BoxGeometry(1, 1, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 8); return g; }, []);
  return <group ref={group}>{slots.map((_, n) => <mesh key={n} geometry={geo} material={mats[0]} />)}</group>;
}

/** The Burj Khalifa, standing beside the road at route position p. */
export function BurjKhalifa({ travel, p, x = 70 }: { travel: Travel; p: number; x?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.position.z = (travel.current?.s ?? 0) - p; });
  const tiers = [[14, 60], [11, 60], [8.5, 55], [6.5, 50], [4.8, 45], [3.2, 40], [2, 35]];
  let y = 0;
  return (
    <group ref={g} position={[x, 0, 0]}>
      {tiers.map(([r, h], i) => {
        const m = <mesh key={i} position={[0, y + h / 2, 0]}><cylinderGeometry args={[r * 0.8, r, h, 6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} /></mesh>;
        y += h;
        return m;
      })}
      <mesh position={[0, y + 30, 0]}><cylinderGeometry args={[0.3, 1.6, 60, 6]} /><meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} /></mesh>
    </group>
  );
}

/** A Salik toll gantry across the road at route position p. */
export function SalikGate({ travel, p }: { travel: Travel; p: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.position.z = (travel.current?.s ?? 0) - p; });
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 96;
    const x = c.getContext("2d")!;
    x.fillStyle = "#065f46"; x.fillRect(0, 0, 512, 96);
    x.fillStyle = "#fff"; x.font = "bold 52px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("SALIK  سالك", 256, 50);
    return new THREE.CanvasTexture(c);
  }, []);
  const w = ROAD.half * 2 + ROAD.median;
  return (
    <group ref={g}>
      {[-1, 1].map((k) => <mesh key={k} position={[k * (w / 2 + 0.5), 4, 0]}><boxGeometry args={[0.6, 8, 0.6]} /><meshStandardMaterial color="#e5e7eb" /></mesh>)}
      <mesh position={[0, 7.6, 0]}><boxGeometry args={[w + 1.6, 1.2, 0.8]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
      <mesh position={[0, 7.6, 0.42]}><planeGeometry args={[9, 1.1]} /><meshStandardMaterial map={tex} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-w / 2 + 2 + i * (w - 4) / 7, 6.9, 0.2]}><boxGeometry args={[0.5, 0.3, 0.3]} /><meshStandardMaterial color="#1f2937" /></mesh>)}
    </group>
  );
}

// ---------------------------------------------------------------- traffic

type Car = { lane: number; p: number; v: number; color: string; taxi: boolean; roof: string };
/** The middle of a lane: 0–4 are our direction (lane 0 by the median), 5–9 the oncoming side. */
export const laneX = (lane: number) => (lane < 5 ? 1 : -1) * (ROAD.median / 2 + ROAD.laneW * ((lane % 5) + 0.5));

/** Other cars on the road: our direction overtakes or falls behind; the other side streams past. */
export function Traffic({ travel, avoid }: { travel: Travel; avoid?: React.RefObject<{ lane: number }> }) {
  const cars = useMemo<Car[]>(() => Array.from({ length: 26 }, (_, i) => {
    const ours = i < 16;
    const lane = ours ? Math.floor(hash(i, 1) * 5) : 5 + Math.floor(hash(i, 1) * 5);
    const taxi = hash(i, 2) < 0.3;
    return {
      lane, p: hash(i, 3) * 220 - 40, v: ours ? 15 + hash(i, 4) * 12 : -(18 + hash(i, 4) * 10), taxi,
      color: taxi ? "#f5e6c8" : ["#f8fafc", "#111827", "#9ca3af", "#1e3a8a", "#7f1d1d", "#d4d4d8"][Math.floor(hash(i, 5) * 6)],
      roof: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#f97316"][Math.floor(hash(i, 6) * 5)],
    };
  }), []);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const s = travel.current?.s ?? 0;
    g.current?.children.forEach((child, i) => {
      const c = cars[i];
      c.p += c.v * Math.min(dt, 0.05);
      // Keep them around us: wrap anything far behind or ahead.
      if (c.p - s < -60) c.p += 300;
      if (c.p - s > 240) c.p -= 300;
      // UAE traffic keeps right: our direction (towards -z) uses the +x lanes, oncoming traffic the -x ones.
      const ours = c.lane < 5;
      // Nothing drives through our own vehicle's lane next to it.
      const avoidLane = avoid?.current?.lane;
      if (ours && avoidLane !== undefined && c.lane === avoidLane && Math.abs(c.p - s) < 14) c.p = s + (c.p > s ? 14 : -14);
      child.position.set(laneX(c.lane), 0, s - c.p);
      child.rotation.y = ours ? 0 : Math.PI;
    });
  });
  return <group ref={g}>{cars.map((c, i) => <group key={i}><Sedan color={c.color} taxiRoof={c.taxi ? c.roof : undefined} /></group>)}</group>;
}

/** A saloon car (a Dubai taxi when it has a roof colour), front towards -z. */
export function Sedan({ color, taxiRoof }: { color: string; taxiRoof?: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.8, 0.7, 4.6]} /><meshStandardMaterial color={color} metalness={0.4} roughness={0.35} /></mesh>
      <mesh position={[0, 1.15, 0.25]}><boxGeometry args={[1.6, 0.55, 2.4]} /><meshStandardMaterial color={taxiRoof ?? color} metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[0, 1.15, 0.25]}><boxGeometry args={[1.62, 0.42, 2.0]} /><meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.15} /></mesh>
      {taxiRoof && <mesh position={[0, 1.55, 0.25]}><boxGeometry args={[0.7, 0.22, 0.25]} /><meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.4} /></mesh>}
      {[[-0.8, -1.5], [0.8, -1.5], [-0.8, 1.5], [0.8, 1.5]].map(([x, z], i) => <mesh key={i} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.33, 0.33, 0.25, 14]} /><meshStandardMaterial color="#111827" /></mesh>)}
      {/* lights */}
      {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.65, -2.31]}><boxGeometry args={[0.35, 0.12, 0.02]} /><meshStandardMaterial color="#fffbeb" emissive="#fffbeb" emissiveIntensity={0.8} /></mesh>)}
      {[-0.6, 0.6].map((x) => <mesh key={`r${x}`} position={[x, 0.65, 2.31]}><boxGeometry args={[0.35, 0.12, 0.02]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.8} /></mesh>)}
    </group>
  );
}

// ---------------------------------------------------------------- the metro

/** The elevated viaduct: a concrete deck on pillars, with the guideway on top. */
export function Viaduct({ travel }: { travel: Travel }) {
  return (
    <group>
      <mesh position={[VIADUCT.x, VIADUCT.deck - 0.6, -150]}><boxGeometry args={[9, 1.2, 900]} /><meshStandardMaterial color="#d6d3d1" roughness={0.8} /></mesh>
      {[-1.5, 1.5].map((x) => <mesh key={x} position={[VIADUCT.x + x, VIADUCT.deck + 0.05, -150]}><boxGeometry args={[0.25, 0.12, 900]} /><meshStandardMaterial color="#6b7280" metalness={0.7} /></mesh>)}
      <Recycled travel={travel} spacing={28} count={18} x={VIADUCT.x} render={() => (
        <mesh position={[0, (VIADUCT.deck - 1.2) / 2, 0]}><boxGeometry args={[2.2, VIADUCT.deck - 1.2, 1.6]} /><meshStandardMaterial color="#e7e5e4" roughness={0.8} /></mesh>
      )} />
    </group>
  );
}

/** One metro car body (length along z), with sliding doors on the right (+x) side that open by `open`. */
/** The Dubai Metro livery: a silver body with a blue band (the Red Line's red is only on signs and maps). */
const METRO_SILVER = "#c9ced4";
const METRO_BLUE = "#0a5ea8";
const METRO_GLASS = "#16202c";

function MetroCar({ front = false, gold = false, open }: { front?: boolean; gold?: boolean; open: React.RefObject<number> }) {
  const doors = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = open.current ?? 0;
    doors.current?.children.forEach((d, i) => { d.position.z = (d.userData.z as number) + (i % 2 ? 1 : -1) * k * 0.65; });
  });
  const L = 16.5;
  return (
    <group>
      <mesh position={[0, 2.0, 0]}><boxGeometry args={[2.9, 3.0, L]} /><meshStandardMaterial color={METRO_SILVER} metalness={0.75} roughness={0.28} /></mesh>
      {/* the tinted window band, the blue band beneath it, and a thin gold line on the Gold Class car */}
      {[-1, 1].map((k) => <mesh key={k} position={[k * 1.46, 2.45, 0]}><boxGeometry args={[0.02, 1.0, L - 1]} /><meshStandardMaterial color={METRO_GLASS} metalness={0.6} roughness={0.12} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={`s${k}`} position={[k * 1.461, 1.72, 0]}><boxGeometry args={[0.02, 0.32, L - 1]} /><meshStandardMaterial color={METRO_BLUE} metalness={0.35} roughness={0.35} /></mesh>)}
      {gold && [-1, 1].map((k) => <mesh key={`g${k}`} position={[k * 1.462, 1.53, 0]}><boxGeometry args={[0.02, 0.05, L - 1]} /><meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.25} /></mesh>)}
      {front && (
        <group position={[0, 2.0, -L / 2]}>
          <mesh position={[0, 0, -0.9]} scale={[1, 1, 0.8]}><sphereGeometry args={[1.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={METRO_SILVER} metalness={0.75} roughness={0.28} /></mesh>
          <mesh position={[0, 0.45, -1.55]} rotation={[0.5, 0, 0]}><planeGeometry args={[2.2, 1.0]} /><meshStandardMaterial color={METRO_GLASS} metalness={0.7} roughness={0.1} /></mesh>
          <mesh position={[0, -0.6, -1.3]}><boxGeometry args={[2.6, 0.32, 0.4]} /><meshStandardMaterial color={METRO_BLUE} metalness={0.35} roughness={0.35} /></mesh>
        </group>
      )}
      {/* two pairs of doors on the platform side */}
      <group ref={doors}>
        {[-L / 4, L / 4].flatMap((z) => [-0.35, 0.35].map((dz) => (
          <mesh key={`${z}${dz}`} userData={{ z: z + dz }} position={[1.465, 1.7, z + dz]}><boxGeometry args={[0.03, 2.2, 0.7]} /><meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.25} /></mesh>
        )))}
      </group>
    </group>
  );
}

/** A five-car Dubai Metro train: the front car leading towards -z, the Gold Class cabin at the front. */
export function MetroTrain({ doorOpen }: { doorOpen: React.RefObject<number> }) {
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} position={[0, 0, i * 17]}><MetroCar front={i === 0} gold={i === 0} open={doorOpen} /></group>
      ))}
    </group>
  );
}

/** An elevated station: the platform on the train's right, platform screen doors, the shell-shaped roof and
    the station's name in English and Arabic. Placed at route position p (its middle). */
export function MetroStation({ travel, p, en, ar, doorOpen }: { travel: Travel; p: number; en: string; ar: string; doorOpen: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null);
  const psd = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.position.z = (travel.current?.s ?? 0) - p;
    const k = doorOpen.current ?? 0;
    psd.current?.children.forEach((d) => { d.position.z = (d.userData.z as number) + (d.userData.dir as number) * k * 0.65; });
  });
  const sign = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 160;
    const x = c.getContext("2d")!;
    x.fillStyle = "#0b3b2e"; x.fillRect(0, 0, 1024, 160);
    x.fillStyle = "#ffffff"; x.textBaseline = "middle";
    x.font = "bold 58px sans-serif"; x.textAlign = "left"; x.fillText(en, 30, 82);
    x.font = "bold 58px sans-serif"; x.textAlign = "right"; x.fillText(ar, 994, 82);
    x.fillStyle = "#dc2626"; x.fillRect(0, 150, 1024, 10);
    return new THREE.CanvasTexture(c);
  }, [en, ar]);
  const LEN = 90, platX = VIADUCT.x + 1.65;
  // Door pairs line up with the train's doors (cars every 17 m, two door pairs per car).
  const doorZs = [0, 1, 2, 3, 4].flatMap((car) => [-16.5 / 4, 16.5 / 4].map((dz) => car * 17 + dz - 34));
  return (
    <group ref={g}>
      {/* the platform */}
      <mesh position={[platX + 2.6, VIADUCT.deck + 0.55, 0]}><boxGeometry args={[5.4, 1.1, LEN]} /><meshStandardMaterial color="#e7e5e4" roughness={0.6} /></mesh>
      <mesh position={[platX + 0.35, VIADUCT.deck + 1.11, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, LEN]} /><meshStandardMaterial color="#facc15" /></mesh>
      {/* platform screen doors: glass panels, with doors in line with the train's */}
      <mesh position={[platX + 0.12, VIADUCT.deck + 2.25, 0]}><boxGeometry args={[0.06, 2.3, LEN]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.25} depthWrite={false} /></mesh>
      <group ref={psd}>
        {doorZs.flatMap((z) => [-1, 1].map((dir) => (
          <mesh key={`${z}${dir}`} userData={{ z: z + dir * 0.35, dir }} position={[platX + 0.16, VIADUCT.deck + 2.25, z + dir * 0.35]}>
            <boxGeometry args={[0.05, 2.25, 0.7]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.5} metalness={0.4} depthWrite={false} />
          </mesh>
        )))}
      </group>
      <mesh position={[platX + 0.14, VIADUCT.deck + 3.55, 0]}><boxGeometry args={[0.2, 0.35, LEN]} /><meshStandardMaterial color="#1f2937" /></mesh>
      {/* the shell roof over track and platform */}
      {Array.from({ length: 6 }, (_, i) => (
        // A vault arching over the track and platform (a half tube lying along the line, squashed low).
        <mesh key={i} position={[VIADUCT.x + 1.5, VIADUCT.deck + 3.6, -LEN / 2 + 8 + i * 15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.42]}>
          <cylinderGeometry args={[7.5, 7.5, 13, 24, 1, true, -Math.PI / 2, Math.PI]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* the name, twice along the platform */}
      {[-20, 20].map((z) => <mesh key={z} position={[platX + 0.3, VIADUCT.deck + 4.1, z]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[7, 1.1]} /><meshStandardMaterial map={sign} /></mesh>)}
      {/* columns under the station */}
      {[-30, -10, 10, 30].map((z) => <mesh key={z} position={[VIADUCT.x + 3, VIADUCT.deck / 2, z]}><boxGeometry args={[6, VIADUCT.deck, 1.8]} /><meshStandardMaterial color="#e7e5e4" /></mesh>)}
    </group>
  );
}
