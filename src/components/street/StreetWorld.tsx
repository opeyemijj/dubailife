"use client";

// Out on the street: step out of your home or a venue onto a Dubai boulevard (three lanes each way, a palm
// median, paved pavements with striped kerbs, street lamps, towers, passing traffic with cream-and-red taxis)
// and walk or run wherever you like with the stick (WASD and Shift on a computer). The real places nearby line
// the street in the order they really are, each a shopfront with its name and a door: walk up to it to go in.
// "Where to?" walks you to one by itself, or (for somewhere further) fast-forwards the walk or calls a taxi.
// Other players out on the same street are there too, live.
//
// Like every scene here, it moves three.js objects (and the camera) frame by frame, outside React's render.
/* eslint-disable react-hooks/immutability */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { Flies } from "@/components/avatar/Flies";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm, Villa } from "@/components/home/RunJourney";
import { CarModel } from "@/components/cars/CarModel";
import type { Car } from "@/lib/cars";
import { canvasQuality } from "@/lib/device";
import type { Peer } from "@/lib/room";

export interface StreetDoor { id: string; name: string; icon: string; metres: number; href: string; x: number; z: number; mine?: boolean; /** A local shop (karak, baqala…): opens its counter instead of a page. */ shop?: string; color?: string;
  /** Not a building: your own car or pool out front (drawn by your villa's plot). */ prop?: "car" | "pool" }
export interface Controls { x: number; y: number; /** Pushed to the rim: run. */ sprint?: boolean }

const HALF_ROAD = 9, KERB = 9.3, PAVE_OUT = 15;
const WALK = 1.8, RUN = 5.2;
export const STREET_LIMIT_X = 14.6;

// ---------------------------------------------------------------- the street

function paversTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#cfc8bc"; g.fillRect(0, 0, 128, 128);
  // Interlocking pavers in two tones, like Dubai's pavements.
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 3 === 0 ? "#b9a993" : (x * y) % 2 ? "#d8d2c6" : "#c9c0b1";
    g.fillRect(x * 32 + (y % 2 ? 16 : 0), y * 16, 30, 14);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function kerbTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 8;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#f8fafc" : "#111827"; g.fillRect(i * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Street({ from, to, night }: { from: number; to: number; night: boolean }) {
  const len = from - to, mid = (from + to) / 2;
  const pavers = useMemo(() => { const t = paversTexture(); t.repeat.set(3, len / 2); return t; }, [len]);
  const kerb = useMemo(() => { const t = kerbTexture(); t.repeat.set(len / 2, 1); return t; }, [len]);
  const palms = useMemo(() => Array.from({ length: Math.floor(len / 18) }, (_, i) => from - 9 - i * 18), [from, len]);
  const lamps = useMemo(() => Array.from({ length: Math.floor(len / 30) }, (_, i) => from - 15 - i * 30), [from, len]);
  const dashes = useMemo(() => Array.from({ length: Math.floor(len / 9) }, (_, i) => from - 4 - i * 9), [from, len]);
  return (
    <group>
      {/* sand beyond the city blocks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, mid]} receiveShadow><planeGeometry args={[400, len + 200]} /><meshStandardMaterial color="#e3d3b4" roughness={1} /></mesh>
      {/* the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, mid]} receiveShadow><planeGeometry args={[HALF_ROAD * 2, len]} /><meshStandardMaterial color="#474c55" roughness={0.95} /></mesh>
      {/* lane dashes */}
      {dashes.map((z) => [-5.5, -2.5, 2.5, 5.5].map((x) => (
        <mesh key={`${x}:${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]}><planeGeometry args={[0.15, 3]} /><meshBasicMaterial color="#e5e7eb" /></mesh>
      )))}
      {/* the median, with palms */}
      <mesh position={[0, 0.12, mid]} receiveShadow><boxGeometry args={[1.6, 0.24, len]} /><meshStandardMaterial color="#7aa35a" roughness={1} /></mesh>
      {palms.map((z) => <StreetPalm key={z} x={0} z={z} h={6.5} />)}
      {/* striped kerbs and paved pavements both sides */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * KERB, 0.09, mid]}><boxGeometry args={[0.6, 0.18, len]} /><meshStandardMaterial map={kerb} roughness={0.8} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * (KERB + PAVE_OUT) / 2 + s * 0.15, 0.17, mid]} receiveShadow>
            <planeGeometry args={[PAVE_OUT - KERB - 0.3, len]} /><meshStandardMaterial map={pavers} roughness={0.9} />
          </mesh>
          {lamps.map((z) => <Lamp key={z} x={s * (KERB + 0.6)} z={z + (s > 0 ? 0 : 15)} night={night} />)}
        </group>
      ))}
    </group>
  );
}

/** Towers between the shops, and the shopfronts themselves with their signs and doors. */
function Blocks({ doors, from, to, night, villas = false, lot }: { doors: StreetDoor[]; from: number; to: number; night: boolean; villas?: boolean;
  /** Your villa's plot: the pool and your car beside it. */ lot?: { pool: boolean; car: { car: Car; plate: string } | null } }) {
  // A villa community (Palm Jumeirah, Arabian Ranches…): walled villas with gardens either side, no towers.
  const homes = useMemo(() => {
    if (!villas) return [];
    const out: Array<{ s: number; z: number; color: string }> = [];
    const colors = ["#efe6d6", "#e7ddcb", "#f5efe3", "#ede3cf"];
    for (const s of [-1, 1]) for (let z = from - 6, i = 0; z > to; z -= 16, i++) {
      // Room round each door; more round your own villa, for its pool and driveway.
      if (doors.some((d) => Math.sign(d.x) === s && Math.abs(d.z - z) < (d.mine ? 24 : 12))) continue;
      out.push({ s, z, color: colors[(i + (s > 0 ? 1 : 0)) % colors.length] });
    }
    return out;
  }, [villas, doors, from, to]);
  const towers = useMemo(() => {
    if (villas) return [];
    const out: Array<{ x: number; z: number; w: number; h: number; color: string }> = [];
    const colors = ["#cbd5e1", "#e2e8f0", "#b6c4d4", "#d6d3d1", "#9fb3c8", "#e7e0d2"];
    for (const s of [-1, 1]) {
      for (let z = from - 10, i = 0; z > to; z -= 24, i++) {
        // Leave room for the shopfronts.
        if (doors.some((d) => Math.sign(d.x) === s && Math.abs(d.z - z) < 16)) continue;
        out.push({ x: s * 26, z, w: 18, h: 24 + ((i * 37 + (s > 0 ? 11 : 0)) % 9) * 10, color: colors[(i + (s > 0 ? 2 : 0)) % colors.length] });
      }
    }
    return out;
  }, [doors, from, to, villas]);
  return (
    <group>
      {homes.map((v) => (
        <group key={`${v.s}:${v.z}`} position={[v.s * 21, 0, v.z]} rotation={[0, v.s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <Villa x={0} z={0} color={v.color} />
          <StreetPalm x={-6.5} z={4} h={6} /><StreetPalm x={6.5} z={4} h={5.5} />
        </group>
      ))}
      {towers.map((t, i) => <Building key={i} x={t.x} z={t.z} w={t.w} d={18} h={t.h} color={t.color} facing={t.x > 0 ? -1 : 1} night={night} />)}
      {doors.map((d) => {
        const s = Math.sign(d.x);
        // Your car and pool: drawn with your villa's plot, only their label here.
        if (d.prop) return (
          <Html key={d.id} position={[s * 15.2, 2.6, d.z]} center zIndexRange={[10, 0]} distanceFactor={14}>
            <div className="whitespace-nowrap rounded-xl px-3 py-1.5 shadow-xl bg-amber-400 text-slate-950 text-sm font-black pointer-events-none">{d.icon} {d.name}</div>
          </Html>
        );
        return (
          <group key={d.id}>
            {d.mine && villas ? (
              <group position={[s * (lot ? 22.6 : 21), 0, d.z]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
                {lot ? <><VillaPlot /><ModernVilla /></> : <Villa x={0} z={0} color="#f3ead8" />}
                {/* Your plot beside it: the pool on one side, the driveway with your car on the other. */}
                {lot?.pool && <VillaPool />}
                {lot && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8.5, 0.02, 2]}><planeGeometry args={[5, 9]} /><meshStandardMaterial color="#a8a29e" /></mesh>}
                {lot?.car && <group position={[-8.5, 0, 2.5]}><Suspense fallback={null}><CarModel car={lot.car.car} plate={lot.car.plate} /></Suspense></group>}
              </group>
            ) : <Building x={s * 22} z={d.z} w={13} d={13} h={d.mine ? 18 : d.shop ? 14 + (d.name.length % 3) * 8 : 9 + (d.name.length % 4) * 3} color={d.mine ? "#e7e0d2" : d.shop ? "#e9e2d4" : "#f1ede4"} facing={s > 0 ? -1 : 1} night={night} awning={d.mine ? undefined : d.color ?? ["#0f766e", "#b91c1c", "#1d4ed8", "#a16207"][d.name.length % 4]} />}
            {/* the door, glowing so it's easy to find (your own villa has its real front door) */}
            <mesh visible={!(d.mine && lot)} position={[s * 15.4, 1.2, d.z]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <planeGeometry args={[1.8, 2.4]} /><meshStandardMaterial color={d.mine ? "#7c2d12" : "#0f172a"} emissive={d.mine ? "#f59e0b" : "#38bdf8"} emissiveIntensity={0.35} />
            </mesh>
            <Html position={[s * 15.2, 3.3, d.z]} center zIndexRange={[10, 0]} distanceFactor={14}>
              <div className={`whitespace-nowrap rounded-xl px-3 py-1.5 shadow-xl text-center pointer-events-none ${d.mine ? "bg-amber-400 text-slate-950" : "bg-white text-slate-900"}`}>
                <div className="text-sm font-black">{d.icon} {d.name}</div>
                {!d.mine && !d.shop && <div className="text-[10px] font-bold text-slate-500">{d.metres < 1000 ? `${Math.round(d.metres / 10) * 10} m` : `${(d.metres / 1000).toFixed(1)} km`} away</div>}
                {d.shop && <div className="text-[10px] font-bold text-slate-500">Open now · tap to buy</div>}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------- traffic

const CAR_COLORS = ["#f8fafc", "#0f172a", "#9ca3af", "#1e3a8a", "#7f1d1d", "#f8fafc"];
function Traffic({ from, to }: { from: number; to: number }) {
  const cars = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const lane = [-7, -4.5, -2, 2, 4.5, 7][i % 6];
    // Keep right: one side of the median goes each way.
    const dir = lane < 0 ? 1 : -1;
    return { lane, dir, speed: 9 + (i % 5) * 2.5, z: from - ((i * 53) % (from - to)), taxi: i % 4 === 0, color: CAR_COLORS[i % CAR_COLORS.length] };
  }), [from, to]);
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame((_, dt) => {
    cars.forEach((c, i) => {
      c.z += c.dir * c.speed * Math.min(dt, 0.05);
      if (c.z < to) c.z = from; if (c.z > from) c.z = to;
      const g = refs.current[i];
      if (g) g.position.z = c.z;
    });
  });
  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} position={[c.lane, 0, c.z]} rotation={[0, c.dir > 0 ? 0 : Math.PI, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.8, 0.7, 4.3]} /><meshStandardMaterial color={c.taxi ? "#efe2c2" : c.color} metalness={0.4} roughness={0.35} /></mesh>
          <mesh position={[0, 1.1, -0.2]}><boxGeometry args={[1.6, 0.5, 2.2]} /><meshStandardMaterial color={c.taxi ? "#b91c1c" : "#1e293b"} roughness={0.2} metalness={0.5} /></mesh>
          {[[-0.8, 1.4], [0.8, 1.4], [-0.8, -1.4], [0.8, -1.4]].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.22, 10]} /><meshStandardMaterial color="#111" /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}


/** Your villa's whole plot as one walled unit: a lawn under the house, the pool and the driveway, a garden wall all
    the way round, a small gate to the front door and a sliding gate where the car drives out. In the villa's frame
    (street towards +z; the driveway is on the -x side, the pool on the +x side). */
const PLOT = { minX: -12.5, maxX: 12.5, back: -6.2, front: 6.6, h: 1.8 };
function VillaPlot() {
  const wall = "#efe6d4", cap = "#d6cbb5";
  const { minX, maxX, back, front, h } = PLOT;
  // Front wall pieces between the car gate (x -11…-6) and the door gate (x -4.3…-2.5).
  const fronts: Array<[number, number]> = [[minX, -11], [-6, -4.3], [-2.5, maxX]];
  const seg = (x0: number, z0: number, x1: number, z1: number, key: string) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    return (
      <group key={key} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={alongX ? [len, h, 0.28] : [0.28, h, len]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
        <mesh position={[0, h + 0.05, 0]}><boxGeometry args={alongX ? [len + 0.1, 0.1, 0.4] : [0.4, 0.1, len + 0.1]} /><meshStandardMaterial color={cap} /></mesh>
      </group>
    );
  };
  const pillar = (x: number, z: number, lamp = false) => (
    <group key={`p${x}:${z}`} position={[x, 0, z]}>
      <mesh position={[0, (h + 0.3) / 2, 0]}><boxGeometry args={[0.55, h + 0.3, 0.55]} /><meshStandardMaterial color={cap} /></mesh>
      {lamp && <mesh position={[0, h + 0.5, 0]}><boxGeometry args={[0.25, 0.3, 0.25]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.9} /></mesh>}
    </group>
  );
  return (
    <group>
      {/* one lawn for the whole plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(minX + maxX) / 2, 0.03, (back + front) / 2]} receiveShadow>
        <planeGeometry args={[maxX - minX, front - back]} /><meshStandardMaterial color="#6fa356" roughness={1} />
      </mesh>
      {/* the wall: back, sides, and the front either side of the two gates */}
      {seg(minX, back, maxX, back, "back")}
      {seg(minX, back, minX, front, "left")}
      {seg(maxX, back, maxX, front, "right")}
      {fronts.map(([a, b], i) => seg(a, front, b, front, `f${i}`))}
      {[[minX, back], [maxX, back], [minX, front], [maxX, front]].map(([x, z]) => pillar(x, z))}
      {/* the sliding car gate: dark metal bars, closed, the driveway behind it */}
      {pillar(-11, front, true)}{pillar(-6, front, true)}
      <group position={[-8.5, 0, front]}>
        <mesh position={[0, 0.12, 0]}><boxGeometry args={[4.9, 0.08, 0.12]} /><meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.35} /></mesh>
        <mesh position={[0, 1.55, 0]}><boxGeometry args={[4.9, 0.08, 0.12]} /><meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.35} /></mesh>
        {Array.from({ length: 15 }, (_, i) => <mesh key={i} position={[-2.35 + i * 0.335, 0.83, 0]}><boxGeometry args={[0.06, 1.45, 0.06]} /><meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.35} /></mesh>)}
      </group>
      {/* the small gate to the front door */}
      {pillar(-4.3, front, true)}{pillar(-2.5, front, true)}
      <group position={[-3.4, 0, front]}>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[-0.6 + i * 0.3, 0.7, 0]}><boxGeometry args={[0.05, 1.3, 0.05]} /><meshStandardMaterial color="#1f2937" metalness={0.7} /></mesh>)}
        <mesh position={[0, 1.35, 0]}><boxGeometry args={[1.5, 0.06, 0.08]} /><meshStandardMaterial color="#1f2937" metalness={0.7} /></mesh>
      </group>
    </group>
  );
}

/** Your own villa as you step out of it: a modern two-storey Dubai villa (white render, tall glass, a flat roof with
    a deep overhang, a balcony, an entrance canopy with lights), on a lawn with palms. Its front faces +z (the street). */
function ModernVilla() {
  const glass = <meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.08} emissive="#f8d48a" emissiveIntensity={0.08} />;
  return (
    <group>
      {/* the path from the gate to the front door */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.4, 0.045, 4.5]}><planeGeometry args={[1.6, 4.2]} /><meshStandardMaterial color="#d6d3d1" /></mesh>
      {/* ground floor: white, mostly glass at the front */}
      <mesh position={[0, 1.7, -1.2]} castShadow receiveShadow><boxGeometry args={[9, 3.4, 7]} /><meshStandardMaterial color="#f8f6f1" roughness={0.6} /></mesh>
      <mesh position={[0.6, 1.5, 2.32]}><planeGeometry args={[6.4, 2.6]} />{glass}</mesh>
      {[-2.6, -0.4, 1.8, 3.8].map((x) => <mesh key={x} position={[x, 1.5, 2.34]}><boxGeometry args={[0.08, 2.6, 0.04]} /><meshStandardMaterial color="#d1d5db" metalness={0.7} /></mesh>)}
      {/* the front door with its canopy and two lights */}
      <mesh position={[-3.4, 1.3, 2.33]}><planeGeometry args={[1.2, 2.5]} /><meshStandardMaterial color="#5b3a22" roughness={0.5} /></mesh>
      <mesh position={[-3.4, 2.8, 2.9]}><boxGeometry args={[2.2, 0.15, 1.4]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
      {[-4.25, -2.55].map((x) => <mesh key={x} position={[x, 2.1, 2.4]}><boxGeometry args={[0.12, 0.3, 0.12]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.8} /></mesh>)}
      {/* upper floor, set back, with a glass balcony */}
      <mesh position={[1, 4.9, -2]} castShadow><boxGeometry args={[7, 3, 5.4]} /><meshStandardMaterial color="#f4f1ea" roughness={0.6} /></mesh>
      <mesh position={[1, 4.8, 0.72]}><planeGeometry args={[5.4, 2.2]} />{glass}</mesh>
      <mesh position={[1, 3.45, 1.6]}><boxGeometry args={[7.4, 0.12, 1.8]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh position={[1, 3.95, 2.48]}><boxGeometry args={[7.4, 0.9, 0.04]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.4} /></mesh>
      {/* flat roofs with deep overhangs, and wooden slats on the side */}
      <mesh position={[0, 3.45, -1.2]}><boxGeometry args={[9.6, 0.25, 7.8]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh position={[1, 6.5, -1.6]}><boxGeometry args={[8, 0.25, 6.6]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-2.35, 4.9, -0.2 - i * 0.45]}><boxGeometry args={[0.06, 2.8, 0.18]} /><meshStandardMaterial color="#a16207" /></mesh>)}
      {/* palms and planting along the front */}
      {[[-5.4, 4.6], [5.4, 4.6]].map(([x, z]) => <StreetPalm key={x} x={x} z={z} h={6} />)}
      {[-1.6, 1.6].map((x) => <mesh key={x} position={[x, 0.35, 4.6]}><sphereGeometry args={[0.5, 12, 8]} /><meshStandardMaterial color="#2f7d32" roughness={1} /></mesh>)}
    </group>
  );
}

/** A villa's pool, beside the house (in the villa's own frame: the street is towards +z). */
function VillaPool() {
  return (
    <group position={[8.5, 0, 0.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><planeGeometry args={[6, 9]} /><meshStandardMaterial color="#e7dfcf" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><planeGeometry args={[3.6, 6.6]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.25} roughness={0.05} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[2.4, 0.3, k * 1.6]}><boxGeometry args={[0.7, 0.12, 1.8]} /><meshStandardMaterial color="#fafafa" /></mesh>)}
      <mesh position={[2.4, 1.3, 0]}><cylinderGeometry args={[0.04, 0.04, 2.6, 8]} /><meshStandardMaterial color="#78716c" /></mesh>
      <mesh position={[2.4, 2.55, 0]}><coneGeometry args={[1.4, 0.6, 12]} /><meshStandardMaterial color="#0e7490" /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- street life

/** Zebra crossings across the boulevard every couple of blocks. */
function Crossings({ from, to }: { from: number; to: number }) {
  const at = useMemo(() => Array.from({ length: Math.floor((from - to) / 68) }, (_, i) => from - 20 - i * 68), [from, to]);
  return (
    <group>
      {at.map((z) => Array.from({ length: 16 }, (_, k) => -8.25 + k * 1.1).filter((x) => Math.abs(x) > 0.9).map((x) => (
        <mesh key={`${z}:${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, z]}><planeGeometry args={[0.6, 3.2]} /><meshBasicMaterial color="#f1f5f9" /></mesh>
      )))}
    </group>
  );
}

/** Air-conditioned bus shelters (a Dubai thing): roof, glass back, bench and the RTA sign. */
function BusStops({ from, to, night }: { from: number; to: number; night: boolean }) {
  const at = useMemo(() => Array.from({ length: Math.floor((from - to) / 95) }, (_, i) => ({ z: from - 48 - i * 95, s: i % 2 ? -1 : 1 })), [from, to]);
  return (
    <group>
      {at.map(({ z, s }) => (
        <group key={z} position={[s * 12.4, 0.17, z]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 1.3, -0.9]}><boxGeometry args={[4.2, 2.6, 0.08]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.45} emissive={night ? "#e0f2fe" : "#000"} emissiveIntensity={night ? 0.4 : 0} /></mesh>
          <mesh position={[0, 2.65, -0.4]}><boxGeometry args={[4.6, 0.14, 1.4]} /><meshStandardMaterial color="#e5e7eb" metalness={0.5} roughness={0.3} /></mesh>
          {[-2.1, 2.1].map((x) => <mesh key={x} position={[x, 1.3, -0.9]}><boxGeometry args={[0.1, 2.6, 0.1]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} /></mesh>)}
          <mesh position={[0, 0.45, -0.6]}><boxGeometry args={[3, 0.1, 0.45]} /><meshStandardMaterial color="#78716c" /></mesh>
          <mesh position={[2.6, 1.6, 0]}><cylinderGeometry args={[0.05, 0.05, 3.2, 8]} /><meshStandardMaterial color="#6b7280" /></mesh>
          <mesh position={[2.6, 2.95, 0]}><boxGeometry args={[0.7, 0.5, 0.06]} /><meshStandardMaterial color="#b91c1c" emissive="#b91c1c" emissiveIntensity={0.3} /></mesh>
          <Html position={[0, 3.1, 0]} center zIndexRange={[5, 0]} distanceFactor={16}>
            <div className="whitespace-nowrap rounded-full bg-red-700 text-white px-2 py-0.5 text-[10px] font-black pointer-events-none">🚌 Bus stop</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

/** Locals out walking on the pavements, up and down the street. Always tagged "Local" (they aren't players). */
function Locals({ from, to }: { from: number; to: number }) {
  const people = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: (i % 2 ? -1 : 1) * (11.3 + (i % 3) * 0.6), z0: from - 15 - ((i * 47) % Math.max(40, from - to - 30)),
    span: 24 + (i % 4) * 8, speed: 1.1 + (i % 3) * 0.25, phase: i * 1.7,
    look: { gender: i % 3 === 0 ? "woman" : "man" } as AvatarLookProps,
  })), [from, to]);
  return <group>{people.map((p, i) => <LocalWalker key={i} {...p} />)}</group>;
}
function LocalWalker({ x, z0, span, speed, phase, look }: { x: number; z0: number; span: number; speed: number; phase: number; look: AvatarLookProps }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const o = g.current;
    if (!o) return;
    // Back and forth along their stretch of pavement, turning at each end.
    const t = (clock.elapsedTime * speed) / span + phase;
    const f = t % 2, along = f < 1 ? f : 2 - f;
    o.position.z = z0 - along * span;
    o.rotation.y = f < 1 ? Math.PI : 0;
  });
  return (
    <group ref={g} position={[x, 0.17, z0]}>
      <Suspense fallback={null}><CitizenAvatar look={look} animation="walk" /></Suspense>
      <Html position={[0, 2.2, 0]} center zIndexRange={[5, 0]} distanceFactor={14}>
        <div className="whitespace-nowrap rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black pointer-events-none">Local</div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------- people

function Walker({ peer }: { peer: Peer }) {
  const g = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const dx = peer.x - o.position.x, dz = peer.z - o.position.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const step = d > 30 ? d : Math.min(d, (peer.animation === "run" ? RUN : WALK) * 1.1 * dt);
      o.position.x += (dx / d) * step; o.position.z += (dz / d) * step;
      o.rotation.y = Math.atan2(dx, dz);
      if (!moving) setMoving(true);
    } else if (moving) setMoving(false);
  });
  return (
    <group ref={g} position={[peer.x, 0.17, peer.z]}>
      <Suspense fallback={null}><CitizenAvatar look={peer.look} animation={moving ? (peer.animation === "run" ? "run" : "walk") : "idle"} /></Suspense>
      {peer.dirty && <Flies />}
      <Html position={[0, 2.25, 0]} center zIndexRange={[10, 0]}>
        <div className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-black shadow pointer-events-none ${peer.away ? "bg-slate-500 text-white" : "bg-sky-500 text-white"}`}>{peer.away ? "💤 " : ""}@{peer.username}</div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------- me

/** Where I'm walking to by myself ("Where to?"), point by point. */
export interface AutoWalk { points: Array<[number, number]>; run: boolean; then?: () => void }

function Me({ look, dirty, controls, run, auto, start, limits, onMove, onNear, doors }: {
  look?: AvatarLookProps; dirty: boolean; controls: React.RefObject<Controls>; run: boolean; auto: React.RefObject<AutoWalk | null>;
  start: [number, number]; limits: [number, number]; onMove: (x: number, z: number, yaw: number, moving: boolean, running: boolean) => void;
  onNear: (door: StreetDoor | null) => void; doors: StreetDoor[];
}) {
  const g = useRef<THREE.Group>(null);
  const pos = useRef({ x: start[0], z: start[1], yaw: Math.PI });
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
    // Input: the stick, or the keys, relative to where the camera looks.
    const k = keys.current;
    let ix = controls.current.x + (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    let iy = controls.current.y + (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const mag = Math.min(1, Math.hypot(ix, iy));
    let vx = 0, vz = 0, running = run || k.has("shift") || !!controls.current.sprint;
    if (mag > 0.04) {
      auto.current = null;   // taking the stick takes over from "Where to?"
      const fwd = new THREE.Vector3(P.x - camera.position.x, 0, P.z - camera.position.z).normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const l = Math.hypot(ix, iy); ix /= l; iy /= l;
      const speed = (running ? RUN : WALK) * mag;
      vx = (fwd.x * iy + right.x * ix) * speed; vz = (fwd.z * iy + right.z * ix) * speed;
    } else if (auto.current?.points.length) {
      const [tx, tz] = auto.current.points[0];
      const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
      running = auto.current.run;
      const speed = running ? RUN : WALK;
      if (d < 0.25) {
        auto.current.points.shift();
        if (!auto.current.points.length) { const then = auto.current.then; auto.current = null; then?.(); }
      } else { vx = (dx / d) * speed; vz = (dz / d) * speed; }
    }
    const moving = Math.hypot(vx, vz) > 0.01;
    const ox = P.x, oz = P.z;
    P.x = THREE.MathUtils.clamp(P.x + vx * dt, -STREET_LIMIT_X, STREET_LIMIT_X);
    P.z = THREE.MathUtils.clamp(P.z + vz * dt, limits[1], limits[0]);
    if (moving) {
      const want = Math.atan2(vx, vz);
      let diff = want - P.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      P.yaw += diff * Math.min(1, dt * 10);
    }
    // Up on the pavement, down on the road.
    const onPave = Math.abs(P.x) > KERB;
    o.position.set(P.x, onPave ? 0.17 : 0, P.z);
    o.rotation.y = P.yaw;
    // The camera comes along.
    if (controlsObj) {
      const dx = P.x - ox, dz = P.z - oz;
      controlsObj.target.x += dx; controlsObj.target.z += dz;
      camera.position.x += dx; camera.position.z += dz;
      controlsObj.update();
    }
    const nextAnim: AvatarAnimation = moving ? (running ? "run" : "walk") : "idle";
    if (nextAnim !== anim) setAnim(nextAnim);
    // Others see me: when I set off or stop, and every 0.8 s while moving.
    const now = performance.now();
    if (moving !== lastSent.current.moving || (moving && now - lastSent.current.t > 800)) {
      lastSent.current = { t: now, moving };
      onMove(P.x, P.z, P.yaw, moving, running);
    }
    // Near a door?
    let best: StreetDoor | null = null;
    for (const d of doors) if (Math.hypot(P.x - Math.sign(d.x) * 14.6, P.z - d.z) < 2.6) best = d;
    if ((best?.id ?? null) !== near.current) { near.current = best?.id ?? null; onNear(best); }
  });

  return (
    <group ref={g} position={[start[0], 0.17, start[1]]}>
      <Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense>
      {dirty && <Flies />}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><ringGeometry args={[0.38, 0.46, 32]} /><meshBasicMaterial color="#facc15" transparent opacity={0.8} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the scene

export function StreetScene({ doors, look, dirty, controls, run, auto, peers, onMove, onNear, villas, lot }: {
  doors: StreetDoor[]; look?: AvatarLookProps; dirty: boolean; controls: React.RefObject<Controls>; run: boolean; auto: React.RefObject<AutoWalk | null>;
  peers: Peer[]; onMove: (x: number, z: number, yaw: number, moving: boolean, running: boolean) => void; onNear: (d: StreetDoor | null) => void;
  /** A villa community street instead of towers. */ villas?: boolean;
  /** Your villa's plot (pool, your car). */ lot?: { pool: boolean; car: { car: Car; plate: string } | null };
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const mine = doors.find((d) => d.mine);
  const start: [number, number] = [12.8, (mine?.z ?? 6) - 1.5];
  const from = 40, to = Math.min(...doors.map((d) => d.z)) - 60;
  // From your own villa: framed on your house, its pool and your car. Otherwise behind you, down the street.
  return (
    <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: lot ? [start[0] - 26, 13, start[1] + 2] : [start[0] - 10, 10, start[1] + 13], fov: 66 }}>
      <SkyAndLight sky={sky} />
      <fog attach="fog" args={[night ? "#0b1324" : "#dbe7f3", 110, 420]} />
      <Street from={from} to={to} night={night} />
      <Blocks doors={doors} from={from} to={to} night={night} villas={villas} lot={lot} />
      <Traffic from={from} to={to} />
      <Crossings from={from} to={to} />
      <BusStops from={from} to={to} night={night} />
      <Locals from={from} to={to} />
      {peers.map((p) => <Walker key={p.userId} peer={p} />)}
      <Me look={look} dirty={dirty} controls={controls} run={run} auto={auto} start={start} limits={[from - 5, to + 5]} onMove={onMove} onNear={onNear} doors={doors} />
      {/* A wide view behind you: drag to look around, pinch to zoom. */}
      <OrbitControls makeDefault target={lot ? [start[0] + 3, 2.4, start[1]] : [start[0], 1.4, start[1]]} enablePan={false} enableDamping minDistance={4} maxDistance={lot ? 40 : 22} minPolarAngle={0.35} maxPolarAngle={1.45} />
    </Canvas>
  );
}

/**
 * The stick, like a PlayStation analog stick: put your thumb on it and push the way you want to go. A small push
 * walks slowly with fine precision, further walks faster, and pushing it all the way to the rim runs that way.
 * Uses a dynamic touch anchor and exponential sensitivity curve so it never snaps or jerks out of control.
 */
export const STICK_DEAD = 0.15;
export const STICK_SPRINT = 0.88;
export function MoveStick({ controls, allowRun = true }: { controls: React.RefObject<Controls>; run?: boolean; onRun?: () => void; allowRun?: boolean }) {
  const knob = useRef<HTMLSpanElement>(null);
  const rim = useRef<HTMLSpanElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const R = 54;

  const set = (rawX: number, rawY: number, springBack = false) => {
    const m = Math.hypot(rawX, rawY);
    // Exponential sensitivity curve with 15% dead zone:
    // When m <= STICK_DEAD: 0 movement (no jitter or drift).
    // Above dead zone: normalized range (0..1) raised to power of 1.7.
    // Provides silky-smooth, calm precision for micro-adjustments,
    // scaling gracefully to full speed at the rim.
    if (m <= STICK_DEAD) {
      controls.current.x = 0;
      controls.current.y = 0;
      controls.current.sprint = false;
    } else {
      const norm = Math.min(1, (m - STICK_DEAD) / (1 - STICK_DEAD));
      const speedFactor = Math.pow(norm, 1.7) / m;
      controls.current.x = rawX * speedFactor;
      controls.current.y = rawY * speedFactor;
      controls.current.sprint = allowRun && m >= STICK_SPRINT;
    }

    if (knob.current) {
      knob.current.style.transition = springBack ? "transform 0.14s cubic-bezier(0.2, 0.9, 0.3, 1)" : "none";
      knob.current.style.transform = `translate(${rawX * R}px, ${-rawY * R}px)`;
    }
    if (rim.current) rim.current.dataset.sprint = controls.current.sprint ? "1" : "0";
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    // Anchor movement to where the thumb touched down so the stick never jerks on initial touch
    originRef.current = { x: e.clientX, y: e.clientY };
    set(0, 0, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (!originRef.current) {
      originRef.current = { x: e.clientX, y: e.clientY };
    }
    const deltaX = e.clientX - originRef.current.x;
    const deltaY = -(e.clientY - originRef.current.y);
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > R) {
      // Dynamic follow anchor: clamp knob to R and smoothly pull the anchor along
      // so reversing thumb direction responds immediately without dead travel.
      const angle = Math.atan2(e.clientY - originRef.current.y, e.clientX - originRef.current.x);
      originRef.current.x = e.clientX - Math.cos(angle) * R;
      originRef.current.y = e.clientY - Math.sin(angle) * R;
      set(Math.cos(angle), -Math.sin(angle), false);
    } else {
      set(deltaX / R, deltaY / R, false);
    }
  };

  const release = () => {
    originRef.current = null;
    set(0, 0, true);
  };

  return (
    <div aria-label={allowRun ? "Move: push the stick the way you want to go, all the way to the edge to run" : "Move: push the stick the way you want to walk"}
      className="relative w-40 h-40 rounded-full touch-none select-none flex items-center justify-center"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      {/* the base, its rim (yellow while running outdoors) and the RUN/WALK hint round the top */}
      <span className="absolute inset-0 rounded-full bg-black/25 backdrop-blur-sm" />
      <span ref={rim} data-sprint="0" className="absolute inset-0 rounded-full ring-[3px] ring-white/60 transition-[box-shadow,background-color] data-[sprint='1']:ring-amber-400 data-[sprint='1']:bg-amber-400/25 data-[sprint='1']:shadow-[0_0_24px_rgba(251,191,36,0.8)]" />
      {allowRun ? (
        <span className="absolute top-1.5 text-[9px] font-black tracking-widest text-white/80 pointer-events-none">RUN</span>
      ) : (
        <span className="absolute top-1.5 text-[9px] font-black tracking-widest text-white/65 pointer-events-none">WALK</span>
      )}
      <span className="absolute w-[4.5rem] h-[4.5rem] rounded-full ring-1 ring-white/25 pointer-events-none" />
      <span ref={knob} className="relative w-16 h-16 rounded-full bg-gradient-to-b from-white to-slate-200 shadow-[0_6px_16px_rgba(0,0,0,0.35)] ring-2 ring-white pointer-events-none" />
    </div>
  );
}
