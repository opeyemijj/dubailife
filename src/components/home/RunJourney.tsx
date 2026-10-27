"use client";

// Going for a run: out of your front door, along City Walk or the JBR Beach Walk and back, or once round
// the block, with a close camera behind you, other joggers on the path, and the distance and pace live.
// Routes and effects: src/data/life/runs.json. The run plays faster than real time; the pace shown is a
// realistic jog.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight, Sedan, type Sky } from "@/components/transit/TransitWorld";
import { canvasQuality } from "@/lib/device";
import { DEFAULT_NEEDS, updateCitizen, type NeedKey } from "@/lib/citizenStore";
import { gainSkill, lifeEvent } from "@/lib/life";
import { gameAudio } from "@/utils/gameAudio";
import { footstep } from "@/components/transit/transitAudio";
import RUNS from "@/data/life/runs.json";

export type RouteId = "citywalk" | "jbr" | "block";
export { RUNS };

// ---------------------------------------------------------------- the route

const STREET_Z = 4;      // the path runs along z = 4, your front door is at the origin facing it
type Pt = [number, number];

/** The whole trip as a line: front door → path → (out and back, or round the block) → front door. */
function routeLine(route: RouteId, d: number): { pts: Pt[]; walkTo: number; walkFrom: number; turnAt: number } {
  const door: Pt = [0, -2.2], street: Pt = [0, STREET_Z];
  if (route === "block") {
    const a = d * 0.6, b = d * 0.4;
    return { pts: [door, street, [a, STREET_Z], [a, STREET_Z + b], [0, STREET_Z + b], street, door], walkTo: 1, walkFrom: 5, turnAt: -1 };
  }
  return { pts: [door, street, [d, STREET_Z], street, door], walkTo: 1, walkFrom: 3, turnAt: 2 };
}

function measure(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
}

/** Point and heading at distance s along the line, and which leg it's on. */
function at(pts: Pt[], cum: number[], s: number) {
  const total = cum[cum.length - 1];
  const t = Math.max(0, Math.min(total, s));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < t) i++;
  const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
  const len = cum[i] - cum[i - 1] || 1;
  const k = (t - cum[i - 1]) / len;
  return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, yaw: Math.atan2(bx - ax, bz - az), leg: i - 1 };
}

// ---------------------------------------------------------------- scenery

const rand = (i: number, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

export function StreetPalm({ x, z, h = 6 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.14, 0.22, h, 8]} /><meshStandardMaterial color="#8b6b4a" roughness={0.9} /></mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.1, h - 0.15, Math.sin(a) * 1.1]} rotation={[Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5 + 0.2]} castShadow>
            <boxGeometry args={[2.4, 0.05, 0.5]} /><meshStandardMaterial color={i % 2 ? "#3f8f3a" : "#2f7a32"} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Lamp({ x, z, night }: { x: number; z: number; night: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.05, 0.07, 4.4, 8]} /><meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 4.45, 0]}><sphereGeometry args={[0.22, 12, 10]} /><meshStandardMaterial color="#fff7e0" emissive="#ffe0a3" emissiveIntensity={night ? 2 : 0.3} /></mesh>
    </group>
  );
}

export function Building({ x, z, w, d, h, color, facing = 1, night, awning }: { x: number; z: number; w: number; d: number; h: number; color: string; facing?: 1 | -1; night: boolean; awning?: string }) {
  const rows = Math.max(1, Math.floor((h - 4) / 3.2));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
      {/* the glass shopfront at street level, and lit windows above */}
      <mesh position={[0, 1.6, (facing * d) / 2 + facing * 0.01]} rotation={[0, facing > 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[w * 0.82, 2.6]} /><meshStandardMaterial color="#1e3a5f" emissive={night ? "#f8d48a" : "#000"} emissiveIntensity={night ? 0.5 : 0} roughness={0.15} metalness={0.4} />
      </mesh>
      {Array.from({ length: rows }, (_, r) => (
        <mesh key={r} position={[0, 4.6 + r * 3.2, (facing * d) / 2 + facing * 0.01]} rotation={[0, facing > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[w * 0.86, 1.3]} /><meshStandardMaterial color="#334155" emissive={night ? "#fde68a" : "#000"} emissiveIntensity={night ? 0.35 : 0} roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
      {awning && <mesh position={[0, 3.1, (facing * d) / 2 + facing * 0.7]} rotation={[facing * 0.35, 0, 0]}><boxGeometry args={[w * 0.86, 0.06, 1.5]} /><meshStandardMaterial color={awning} /></mesh>}
    </group>
  );
}

function Villa({ x, z, facing = 1, color = "#efe6d6" }: { x: number; z: number; facing?: 1 | -1; color?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, facing > 0 ? 0 : Math.PI, 0]}>
      <mesh position={[0, 0.4, 0]} receiveShadow><boxGeometry args={[11, 0.8, 11]} /><meshStandardMaterial color="#9ab973" /></mesh>
      <mesh position={[0, 3.4, -1]} castShadow><boxGeometry args={[8, 5.2, 6]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
      <mesh position={[0, 6.3, -1]} castShadow><boxGeometry args={[8.6, 0.6, 6.6]} /><meshStandardMaterial color="#8a5a3b" /></mesh>
      <mesh position={[0, 2, 2.01]}><planeGeometry args={[1.2, 2.2]} /><meshStandardMaterial color="#5b3a22" /></mesh>
      {[-2.6, 2.6].map((wx) => <mesh key={wx} position={[wx, 3.6, 2.01]}><planeGeometry args={[1.6, 1.4]} /><meshStandardMaterial color="#334155" roughness={0.2} metalness={0.3} /></mesh>)}
      <mesh position={[0, 0.9, 5.4]}><boxGeometry args={[11, 1, 0.2]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
    </group>
  );
}

/** Your building, with the front door you run out of. */
function Home({ open, night }: { open: React.RefObject<number>; night: boolean }) {
  const door = useRef<THREE.Group>(null);
  useFrame(() => { if (door.current) door.current.rotation.y = -open.current * 1.4; });
  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 7, 0]} castShadow receiveShadow><boxGeometry args={[14, 14, 10]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
      {/* glazed lobby, canopy and the door */}
      <mesh position={[0, 1.7, 5.01]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#1e3a5f" emissive="#f8d48a" emissiveIntensity={night ? 0.6 : 0.12} roughness={0.1} metalness={0.4} /></mesh>
      <mesh position={[0, 3.6, 6.2]} castShadow><boxGeometry args={[7, 0.2, 2.6]} /><meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.3} /></mesh>
      {Array.from({ length: 3 }, (_, r) => (
        <mesh key={r} position={[0, 6 + r * 3, 5.01]}><planeGeometry args={[12, 1.6]} /><meshStandardMaterial color="#334155" emissive={night ? "#fde68a" : "#000"} emissiveIntensity={night ? 0.3 : 0} roughness={0.2} metalness={0.3} /></mesh>
      ))}
      <group ref={door} position={[-0.6, 0, 5.05]}>
        <mesh position={[0.6, 1.15, 0]}><boxGeometry args={[1.2, 2.3, 0.06]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.45} roughness={0.05} /></mesh>
      </group>
      <mesh position={[0, 0.02, 7.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 5]} /><meshStandardMaterial color="#9ca3af" /></mesh>
      {[-3.6, 3.6].map((x) => <StreetPalm key={x} x={x} z={7} h={4.5} />)}
    </group>
  );
}

function CityWalk({ len, night }: { len: number; night: boolean }) {
  const shops = ["#fef3c7", "#e0e7ff", "#fce7f3", "#dcfce7", "#f1f5f9", "#ffedd5"];
  const awnings = ["#0f766e", "#b91c1c", "#1d4ed8", "#a16207", "#111827", "#7c3aed"];
  return (
    <group>
      {/* stone paving with a darker band, and planted verges */}
      <mesh position={[len / 2, 0.01, STREET_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len + 80, 8]} /><meshStandardMaterial color="#e7dccb" roughness={0.8} /></mesh>
      <mesh position={[len / 2, 0.015, STREET_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[len + 80, 1.2]} /><meshStandardMaterial color="#c9b79c" /></mesh>
      {Array.from({ length: Math.ceil((len + 60) / 14) }, (_, i) => {
        const x = -20 + i * 14;
        return (
          <group key={i}>
            <Building x={x} z={STREET_Z + 10} w={12} d={8} h={9 + rand(i) * 8} color={shops[i % shops.length]} facing={-1} night={night} awning={awnings[i % awnings.length]} />
            {Math.abs(x) > 12 && <Building x={x} z={STREET_Z - 11} w={12} d={8} h={10 + rand(i, 2) * 10} color={shops[(i + 3) % shops.length]} night={night} awning={awnings[(i + 2) % awnings.length]} />}
            <StreetPalm x={x + 7} z={STREET_Z + 4.6} />
            {Math.abs(x + 7) > 6 && <StreetPalm x={x + 7} z={STREET_Z - 4.6} />}
            <Lamp x={x} z={STREET_Z + 4.4} night={night} />
            {i % 2 === 0 && <mesh position={[x + 3, 0.25, STREET_Z + 3.6]} castShadow><boxGeometry args={[1.8, 0.5, 0.5]} /><meshStandardMaterial color="#8b6b4a" /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

function JbrWalk({ len, night }: { len: number; night: boolean }) {
  return (
    <group>
      {/* the boardwalk, the sand and the sea on one side, the towers on the other */}
      <mesh position={[len / 2, 0.02, STREET_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len + 80, 5]} /><meshStandardMaterial color="#c08a5a" roughness={0.7} /></mesh>
      {Array.from({ length: Math.ceil((len + 80) / 1.2) }, (_, i) => (
        <mesh key={i} position={[-40 + i * 1.2, 0.025, STREET_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.04, 5]} /><meshStandardMaterial color="#8a5a33" /></mesh>
      ))}
      <mesh position={[len / 2, 0.005, STREET_Z + 22]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len + 200, 36]} /><meshStandardMaterial color="#f2dfb4" roughness={0.95} /></mesh>
      <mesh position={[len / 2, -0.05, STREET_Z + 120]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[len + 600, 160]} /><meshStandardMaterial color={night ? "#0c2a4a" : "#1aa3c9"} roughness={0.15} metalness={0.3} /></mesh>
      {Array.from({ length: Math.ceil((len + 60) / 18) }, (_, i) => {
        const x = -20 + i * 18;
        return (
          <group key={i}>
            {Math.abs(x) > 14 && <Building x={x} z={STREET_Z - 16} w={14} d={14} h={38 + rand(i) * 55} color={["#e7e1d6", "#d6d3d1", "#f1ece3"][i % 3]} night={night} />}
            <StreetPalm x={x + 9} z={STREET_Z - 3.4} h={7} />
            {/* umbrellas and loungers on the sand */}
            <group position={[x + 4, 0, STREET_Z + 12 + rand(i, 3) * 6]}>
              <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.03, 0.03, 2.4, 6]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
              <mesh position={[0, 2.35, 0]}><coneGeometry args={[1.4, 0.5, 12]} /><meshStandardMaterial color={["#f43f5e", "#0ea5e9", "#f59e0b", "#10b981"][i % 4]} /></mesh>
              <mesh position={[1.1, 0.25, 0.4]}><boxGeometry args={[0.7, 0.15, 1.8]} /><meshStandardMaterial color="#fafafa" /></mesh>
            </group>
            <Lamp x={x} z={STREET_Z - 2.8} night={night} />
          </group>
        );
      })}
    </group>
  );
}

function Block({ d, night }: { d: number; night: boolean }) {
  const a = d * 0.6, b = d * 0.4;
  const road = (x: number, z: number, w: number, l: number) => (
    <mesh position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, l]} /><meshStandardMaterial color="#d6d3d1" roughness={0.85} /></mesh>
  );
  return (
    <group>
      {/* the pavement round the block, a grass verge inside it, and villas facing the street */}
      {road(a / 2, STREET_Z, a + 4, 3)}{road(a / 2, STREET_Z + b, a + 4, 3)}{road(0, STREET_Z + b / 2, 3, b + 3)}{road(a, STREET_Z + b / 2, 3, b + 3)}
      <mesh position={[a / 2, 0.005, STREET_Z + b / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[a - 3, b - 3]} /><meshStandardMaterial color="#86b06a" /></mesh>
      {Array.from({ length: Math.max(1, Math.floor((a - 6) / 13)) }, (_, i) => (
        <group key={i}>
          <Villa x={8 + i * 13} z={STREET_Z + 7.5} facing={-1} color={["#efe6d6", "#e7ddcb", "#f5efe3"][i % 3]} />
          {b > 24 && <Villa x={8 + i * 13} z={STREET_Z + b - 7.5} color={["#f5efe3", "#efe6d6", "#e7ddcb"][i % 3]} />}
          <StreetPalm x={2 + i * 13} z={STREET_Z + 2} h={5} />
          <Lamp x={6 + i * 13} z={STREET_Z - 1.8} night={night} />
        </group>
      ))}
      {/* the road outside, with a few parked cars */}
      <mesh position={[a / 2, 0.008, STREET_Z - 5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[a + 60, 6]} /><meshStandardMaterial color="#3f3f46" /></mesh>
      {[12, 34, 61].filter((x) => x < a + 10).map((x, i) => <group key={x} position={[x, 0, STREET_Z - 6.5]} rotation={[0, Math.PI / 2, 0]} scale={0.8}><Sedan color={["#f8fafc", "#0f172a", "#b91c1c"][i % 3]} /></group>)}
      {Array.from({ length: Math.ceil((a + 40) / 16) }, (_, i) => Math.abs(-10 + i * 16) > 12 && <Villa key={`o${i}`} x={-10 + i * 16} z={STREET_Z - 18} color="#ece4d4" />)}
    </group>
  );
}

// ---------------------------------------------------------------- runners

const JOGGERS: AvatarLookProps[] = [{ gender: "woman", preset: "Female_Adult_01" }, { gender: "man", preset: "Male_Adult_10" }, { gender: "woman", preset: "Female_Adult_05" }];

function Jogger({ look, pts, cum, offset, phase }: { look: AvatarLookProps; pts: Pt[]; cum: number[]; offset: number; phase: number }) {
  const g = useRef<THREE.Group>(null);
  const s = useRef(phase);
  const total = cum[cum.length - 1];
  useFrame((_, dt) => {
    if (!g.current) return;
    s.current = (s.current + dt * 3.4) % total;
    // Coming the other way round the course.
    const p = at(pts, cum, total - s.current);
    g.current.position.set(p.x + Math.cos(p.yaw) * offset, 0, p.z - Math.sin(p.yaw) * offset);
    g.current.rotation.y = p.yaw + Math.PI;
  });
  return <group ref={g}><group rotation={[0.15, 0, 0]}><Suspense fallback={null}><CitizenAvatar look={look} animation="run" /></Suspense></group></group>;
}

// ---------------------------------------------------------------- you, and the camera

interface Live { s: number; done: boolean }

function Runner({ look, line, night, surface, onProgress, onFinish }: {
  look?: AvatarLookProps; line: ReturnType<typeof routeLine>; night: boolean; surface: "stone" | "wood" | "pavement"; onProgress: (s: number, total: number) => void; onFinish: () => void;
}) {
  const me = useRef<THREE.Group>(null);
  const door = useRef(0);
  const camera = useThree((s) => s.camera);
  const cum = useMemo(() => measure(line.pts), [line]);
  const total = cum[cum.length - 1];
  const [anim, setAnim] = useState<AvatarAnimation>("walk");
  const lastReport = useRef(0);
  const look3 = useRef(new THREE.Vector3());
  const live = useRef<Live>({ s: 0, done: false });
  // The body inside the walker: bounces with each stride and leans into the run.
  const body = useRef<THREE.Group>(null);
  const stride = useRef(0);

  useFrame((_, dt) => {
    const L = live.current;
    if (!me.current) return;
    const leg = at(line.pts, cum, L.s).leg;
    const walking = leg < line.walkTo || leg >= line.walkFrom;
    if (!L.done) {
      L.s = Math.min(total, L.s + dt * (walking ? RUNS.walkSpeed : RUNS.playSpeed));
      if (L.s >= total) { L.done = true; onFinish(); }
    }
    const want: AvatarAnimation = L.done ? "wave" : walking ? "walk" : "run";
    if (want !== anim) setAnim(want);
    // Steps: about three a second running, under two walking, each one heard.
    if (!L.done) {
      const before = Math.floor(stride.current);
      stride.current += dt * (walking ? 1.8 : 2.9);
      if (Math.floor(stride.current) !== before) footstep(walking ? "pavement" : surface, walking ? 0.15 : 0.8);
    }
    if (body.current) {
      const lift = Math.abs(Math.sin(stride.current * Math.PI));
      body.current.position.y = L.done ? 0 : lift * (walking ? 0.02 : 0.04);
      body.current.rotation.x += ((L.done ? 0 : walking ? 0.03 : 0.17) - body.current.rotation.x) * Math.min(1, dt * 6);
    }
    const p = at(line.pts, cum, L.s);
    me.current.position.set(p.x, 0, p.z);
    // Turn smoothly into each new direction (and right round at the far end).
    let diff = p.yaw - me.current.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    me.current.rotation.y += diff * Math.min(1, dt * 7);
    // The front door opens as you leave and as you come back.
    const nearDoor = L.s < cum[1] + 1 || L.s > total - (cum[cum.length - 1] - cum[cum.length - 2]) - 1;
    door.current += ((nearDoor && !L.done ? 1 : 0) - door.current) * Math.min(1, dt * 4);

    // Close behind and a little above, looking a few metres ahead.
    const yaw = me.current.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const back = walking ? 3.2 : 3.8;
    camera.position.lerp(new THREE.Vector3(p.x - fx * back, walking ? 2.1 : 2.3, p.z - fz * back), Math.min(1, dt * 3.2));
    look3.current.lerp(new THREE.Vector3(p.x + fx * 3, 1.25, p.z + fz * 3), Math.min(1, dt * 4));
    camera.lookAt(look3.current);

    if (performance.now() - lastReport.current > 120) { lastReport.current = performance.now(); onProgress(L.s, total); }
  });

  return (
    <>
      <Home open={door} night={night} />
      <group ref={me}>
        <group ref={body}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
        {/* Street lighting round you, so you're never a silhouette after dark. */}
        <pointLight position={[0, 4, -1.5]} intensity={night ? 40 : 8} distance={22} decay={1.6} color={night ? "#ffe2b0" : "#ffffff"} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------- the whole journey

export interface RunResult { metres: number; seconds: number; fraction: number }

export function RunJourney({ route, distance, look, onDone }: { route: RouteId; distance: number; look?: AvatarLookProps; onDone: (r: RunResult) => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky: Sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const line = useMemo(() => routeLine(route, distance), [route, distance]);
  const cum = useMemo(() => measure(line.pts), [line]);
  // The run itself (excluding the walk to and from the door), for the counter.
  const runStart = cum[line.walkTo], runEnd = cum[line.walkFrom];
  const runTotal = runEnd - runStart;
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const info = RUNS.routes.find((r) => r.id === route)!;

  const metres = Math.max(0, Math.min(runTotal, progress - runStart));
  const seconds = Math.round((metres / 1000) * RUNS.paceSecondsPerKm);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const turn = line.turnAt >= 0 && progress >= cum[line.turnAt] && progress < cum[line.turnAt] + 6;

  useEffect(() => { gameAudio.playClickSound(); }, []);
  const end = () => onDone({ metres: Math.round(metres), seconds, fraction: runTotal ? metres / runTotal : 0 });

  return (
    <div className="fixed inset-0 z-[180] bg-black">
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [0, 2.2, -4], fov: 55 }}>
        <SkyAndLight sky={sky} />
        {/* Night in Dubai is lit: street lights, shopfronts and towers keep the walk bright. */}
        <ambientLight intensity={night ? 0.9 : 0.25} color={night ? "#c7d2fe" : "#ffffff"} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[distance / 2, -0.01, 0]} receiveShadow><planeGeometry args={[distance + 400, 400]} /><meshStandardMaterial color={route === "jbr" ? "#e8d3a6" : "#cdbf9f"} roughness={1} /></mesh>
        {route === "citywalk" && <CityWalk len={distance} night={night} />}
        {route === "jbr" && <JbrWalk len={distance} night={night} />}
        {route === "block" && <Block d={distance} night={night} />}
        {line.turnAt >= 0 && (
          <group position={[distance, 0, STREET_Z]}>
            <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.06, 0.06, 2.8, 8]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
            <mesh position={[0, 2.6, 0]}><boxGeometry args={[1.4, 0.6, 0.06]} /><meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.3} /></mesh>
            {[-1, 1].map((k) => <mesh key={k} position={[0, 0.3, k * 1.6]}><coneGeometry args={[0.25, 0.6, 12]} /><meshStandardMaterial color="#f97316" /></mesh>)}
          </group>
        )}
        {JOGGERS.map((j, i) => <Jogger key={i} look={j} pts={line.pts.slice(line.walkTo, line.walkFrom + 1)} cum={measure(line.pts.slice(line.walkTo, line.walkFrom + 1))} offset={i % 2 ? 1.3 : -1.3} phase={(i * runTotal) / JOGGERS.length} />)}
        <Runner look={look} line={line} night={night} surface={route === "jbr" ? "wood" : route === "citywalk" ? "stone" : "pavement"} onProgress={(s) => setProgress(s)} onFinish={() => { gameAudio.playCoinSound(); setFinished(true); }} />
      </Canvas>

      {/* Distance, time and the route */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-start gap-2 pointer-events-none">
        <div className="flex-1 max-w-md mx-auto bg-white/95 text-slate-900 rounded-[24px] shadow-xl px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{info.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">{info.name}</p>
              <p className="text-xs text-slate-500">{progress < runStart ? "Heading out the door…" : progress >= runEnd ? "Back home…" : turn ? "Turn around!" : route === "block" ? "Round the block" : progress < cum[line.turnAt] ? "Running out" : "Running back"}</p>
            </div>
            <div className="text-right tabular-nums">
              <p className="font-black text-lg leading-none">{Math.round(metres)}<span className="text-xs text-slate-500"> / {Math.round(runTotal)} m</span></p>
              <p className="text-xs text-slate-500">{clock}</p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${(metres / runTotal) * 100}%` }} /></div>
        </div>
      </div>
      {!finished && (
        <button onClick={end} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 h-12 px-6 rounded-full bg-white/95 shadow-xl font-black text-slate-800 active:scale-95">End run</button>
      )}
      {finished && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-[28px] shadow-2xl p-5 space-y-3 text-center animate-[sheetUp_0.25s_ease-out]">
            <div className="text-5xl">🏃</div>
            <p className="text-2xl font-black">Run complete!</p>
            <p className="text-slate-500">{Math.round(runTotal)} m on {info.name} in {clock}</p>
            <div className="flex flex-wrap justify-center gap-1.5 text-sm font-semibold">
              {(Object.entries(RUNS.effects) as Array<[NeedKey, number]>).map(([k, v]) => <span key={k} className={`px-2.5 py-1 rounded-full ${v > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{v > 0 ? "+" : ""}{v} {k}</span>)}
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">+{RUNS.fitnessXp} fitness</span>
            </div>
            <button onClick={() => onDone({ metres: Math.round(runTotal), seconds, fraction: 1 })} className="w-full h-14 rounded-full bg-emerald-700 text-white text-lg font-semibold shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]">Back inside</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What a run does to you: the full effects for a full run, a share of them for a run cut short. */
export function applyRun(r: RunResult) {
  if (r.fraction <= 0.05) return;
  updateCitizen((c) => {
    const needs = { ...DEFAULT_NEEDS, ...c.needs };
    for (const [k, v] of Object.entries(RUNS.effects) as Array<[NeedKey, number]>) needs[k] = Math.max(0, Math.min(100, needs[k] + Math.round(v * r.fraction)));
    return { ...c, needs };
  });
  gainSkill("fitness", Math.round(RUNS.fitnessXp * r.fraction));
  lifeEvent("workout");
}
