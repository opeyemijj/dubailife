"use client";

// The flight: pushback onto the runway at the departure airport, the take-off roll, rotation and climb over the
// skyline, the cruise above the clouds along the Gulf coast, the descent past the islands and the touchdown at the
// arrival airport. About a minute of real time for the 45-minute hop. Two views: outside (a chase camera you can
// drag round the jet) and inside (your seat at the window, look around by dragging). The world runs along +z:
// departure runway at z = 0, arrival runway at z = LAND; sea to the east (+x), the desert coast to the west.

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { Airliner } from "./Airliner";
import type { CabinClass } from "@/lib/flights";

/** Seconds for each part of the flight. */
export const PHASES = { roll: 10, climb: 14, cruise: 16, descent: 15, landing: 7 };
export const FLIGHT_SECONDS = Object.values(PHASES).reduce((a, b) => a + b, 0);
const CRUISE = 900;

/** Where the jet is (z along the route, y height), its pitch and its speed (m/s), at time t (seconds). */
export function flightAt(t: number) {
  const { roll, climb, cruise, descent, landing } = PHASES;
  const T1 = roll, T2 = T1 + climb, T3 = T2 + cruise, T4 = T3 + descent, T5 = T4 + landing;
  const ease = (x: number) => x * x * (3 - 2 * x);
  // Ground speed: up to 85 on the roll, 260 cruising (sped-up), back to 80 at touchdown, then braking.
  const speed = t < T1 ? 85 * (t / T1) : t < T2 ? 85 + 175 * ease((t - T1) / climb) : t < T3 ? 260 : t < T4 ? 260 - 180 * ease((t - T3) / descent) : 80 * (1 - Math.min(1, (t - T4) / landing));
  // Distance travelled: integrate the same speeds (closed forms for the linear parts, sampled for the eased ones).
  const dist = (x: number) => {
    let d = 0;
    const step = 0.05;
    for (let s = 0; s < x; s += step) d += (s < T1 ? 85 * (s / T1) : s < T2 ? 85 + 175 * ease((s - T1) / climb) : s < T3 ? 260 : s < T4 ? 260 - 180 * ease((s - T3) / descent) : 80 * (1 - Math.min(1, (s - T4) / landing))) * Math.min(step, x - s);
    return d;
  };
  const y = t < T1 ? 0 : t < T2 ? CRUISE * ease((t - T1) / climb) : t < T3 ? CRUISE : t < T4 ? CRUISE * (1 - ease((t - T3) / descent)) : 0;
  const pitch = t < T1 ? (t > T1 - 2 ? 0.12 * ((t - (T1 - 2)) / 2) : 0) : t < T2 ? 0.16 * Math.sin(Math.PI * Math.min(1, (t - T1) / climb)) + 0.02 : t < T3 ? 0 : t < T4 ? -0.05 * Math.sin(Math.PI * (t - T3) / descent) + (t > T4 - 2 ? 0.07 : 0) : 0;
  return { z: dist(t), y, pitch, speed, phase: t < T1 ? "Take-off roll" : t < T2 ? "Climbing" : t < T3 ? "Cruising at 32,000 ft" : t < T4 ? "Descending" : t < T5 ? "Landed" : "At the gate", total: dist(T5) };
}

/** Where the arrival runway starts: just short of where the flight path touches down. */
const LAND = Math.round(flightAt(PHASES.roll + PHASES.climb + PHASES.cruise + PHASES.descent).z - 250);

/** A runway: tarmac, centre line, edge lights and the touchdown blocks. */
function Runway({ z0 }: { z0: number }) {
  return (
    <group position={[0, 0.03, z0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1600]} receiveShadow><planeGeometry args={[60, 4000]} /><meshStandardMaterial color="#374151" roughness={0.9} /></mesh>
      {Array.from({ length: 70 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -300 + i * 60]}><planeGeometry args={[1, 30]} /><meshBasicMaterial color="#f8fafc" /></mesh>)}
      {[-1, 1].map((s) => Array.from({ length: 50 }, (_, i) => <mesh key={`${s}${i}`} position={[s * 31, 0.3, -300 + i * 80]}><sphereGeometry args={[0.6, 6, 4]} /><meshBasicMaterial color="#fde68a" /></mesh>))}
      {Array.from({ length: 8 }, (_, i) => <mesh key={`tz${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-14 + i * 4, 0.02, 0]}><planeGeometry args={[2.4, 40]} /><meshBasicMaterial color="#f8fafc" /></mesh>)}
    </group>
  );
}

/** Towers of a skyline (one instanced mesh), and a spire for the tallest. */
function Skyline({ x, z, spread, count, tallest, seed }: { x: number; z: number; spread: [number, number]; count: number; tallest: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const st = { s: seed };
    const r = () => { st.s = (st.s * 9301 + 49297) % 233280; return st.s / 233280; };
    return Array.from({ length: count }, () => ({ x: x + (r() - 0.5) * spread[0], z: z + (r() - 0.5) * spread[1], h: 40 + Math.pow(r(), 2) * tallest * 0.55, w: 18 + r() * 26, c: r() }));
  }, [x, z, spread, count, tallest, seed]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D(), col = new THREE.Color();
    items.forEach((b, i) => { o.position.set(b.x, b.h / 2, b.z); o.scale.set(b.w, b.h, b.w); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.setHSL(0.58, 0.15, 0.55 + b.c * 0.3)); });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, items.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.3} metalness={0.4} /></instancedMesh>
      <mesh position={[x, tallest / 2, z]}><cylinderGeometry args={[4, 26, tallest, 6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.25} /></mesh>
    </group>
  );
}

/** Clouds: soft white puffs (instanced), a layer under the cruise height. */
function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => Array.from({ length: 160 }, (_, i) => ({ x: ((i * 7919) % 4000) - 2000, y: 560 + ((i * 131) % 160), z: 1500 + ((i * 3571) % 11000), s: 40 + ((i * 97) % 90) })), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((c, i) => { o.position.set(c.x, c.y, c.z); o.scale.set(c.s * 1.8, c.s * 0.55, c.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.45} transparent opacity={0.9} roughness={1} /></instancedMesh>;
}

/** The ground: desert along the west, the Gulf to the east, islands near the arrival, and both cities. */
function World({ to }: { to: string }) {
  const toAbuDhabi = to === "abu-dhabi", toDoha = to === "doha";
  return (
    <group>
      {/* The Gulf (east) and the desert coast (west), with a beach line between */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6000, -0.5, 7000]}><planeGeometry args={[12000, 30000]} /><meshStandardMaterial color="#1f8fc9" roughness={0.25} metalness={0.15} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6000 + 200, -0.4, 7000]}><planeGeometry args={[12000, 30000]} /><meshStandardMaterial color="#d8c08e" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[200, -0.35, 7000]}><planeGeometry args={[60, 30000]} /><meshStandardMaterial color="#f3dfa6" roughness={1} /></mesh>
      {/* The airport aprons */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-120, 0, 1500]}><planeGeometry args={[160, 4200]} /><meshStandardMaterial color="#9ca3af" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-120, 0, LAND + 1500]}><planeGeometry args={[160, 4200]} /><meshStandardMaterial color="#9ca3af" roughness={1} /></mesh>
      <Runway z0={0} />
      <Runway z0={LAND} />
      {/* Departure city skyline off to the west of the runway, arrival city by the islands */}
      <Skyline x={-900} z={2600} spread={[900, 3000]} count={140} tallest={toAbuDhabi ? 820 : 320} seed={7} />
      <Skyline x={-800} z={LAND - 1800} spread={[800, 2200]} count={toDoha ? 110 : 90} tallest={toAbuDhabi ? 320 : toDoha ? 560 : 820} seed={toDoha ? 31 : 19} />
      {/* Islands in the Gulf off the arrival city */}
      {[[700, LAND - 2600, 900, 500], [1300, LAND - 1200, 700, 450], [600, LAND - 300, 500, 300]].map(([x, z, w, d], i) => (
        <group key={i} position={[x, -0.3, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1, 40]} /><meshStandardMaterial color="#f3dfa6" /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]}><circleGeometry args={[1, 40]} /><meshStandardMaterial color="#7fae6a" /></mesh>
        </group>
      ))}
      {/* The Grand Mosque's white domes and minarets (on the way into Abu Dhabi) */}
      {toAbuDhabi && (
        <group position={[-500, 0, LAND - 900]}>
          <mesh position={[0, 8, 0]}><boxGeometry args={[260, 16, 200]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          {[[0, 0, 34], [-60, -40, 20], [60, -40, 20], [-60, 40, 20], [60, 40, 20]].map(([x, z, r], i) => (
            <mesh key={i} position={[x, 16, z]}><sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          ))}
          {[[-125, -95], [125, -95], [-125, 95], [125, 95]].map(([x, z], i) => (
            <mesh key={`mn${i}`} position={[x, 55, z]}><cylinderGeometry args={[4, 5, 110, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          ))}
        </group>
      )}
      {/* Into Doha: The Pearl's ring of islands offshore, and West Bay's towers with the cylindrical Doha Tower. */}
      {toDoha && (
        <group>
          <group position={[1100, -0.2, LAND - 1500]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[260, 420, 48]} /><meshStandardMaterial color="#f3dfa6" /></mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[290, 390, 48]} /><meshStandardMaterial color="#9ccc7a" /></mesh>
          </group>
          <group position={[-700, 0, LAND - 1500]}>
            <mesh position={[0, 120, 0]}><cylinderGeometry args={[28, 30, 240, 20]} /><meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.35} /></mesh>
            <mesh position={[0, 250, 0]}><sphereGeometry args={[28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} /></mesh>
            <mesh position={[80, 100, 60]}><cylinderGeometry args={[18, 26, 200, 16]} /><meshStandardMaterial color="#38bdf8" metalness={0.4} roughness={0.2} /></mesh>
          </group>
        </group>
      )}
      <Clouds />
    </group>
  );
}

/** Seat rows for each cabin (z of each row, cabin coordinates) and the seat positions across (x). */
const CABIN_LAYOUT = {
  first: { from: 18.6, to: 23.4, pitch: 2.4, xs: [-2.0, 0, 2.0], width: 1.1 },
  business: { from: 9.4, to: 17.2, pitch: 1.55, xs: [-2.15, -0.42, 0.42, 2.15], width: 0.78 },
  economy: { from: -22.5, to: 8.2, pitch: 0.82, xs: [-2.45, -1.99, -1.53, -0.46, 0, 0.46, 1.53, 1.99, 2.45], width: 0.45 },
} as const;
/** Your seat: the window seat on the left, a few rows into your cabin (cabin coordinates: x, z). */
export function mySeat(cabin: CabinClass): [number, number] {
  const c = CABIN_LAYOUT[cabin];
  const rows = Math.floor((c.to - c.from) / c.pitch);
  return [c.xs[0], c.from + c.pitch * Math.min(rows - 1, cabin === "economy" ? 9 : 1)];
}

/** One instanced mesh for a part of every seat (cushions, backs, headrests, screens…): hundreds of seats, a few draws. */
function SeatPart({ items, geo, color, emissive, map }: { items: Array<{ p: THREE.Vector3Tuple; s: THREE.Vector3Tuple; r?: number }>; geo: "box" | "sphere"; color: string; emissive?: string; map?: THREE.Texture | null }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(...it.p); o.rotation.set(it.r ?? 0, 0, 0); o.scale.set(...it.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {geo === "box" ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 14, 10]} />}
      {map ? <meshBasicMaterial map={map} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={0.7} emissive={emissive ?? color} emissiveIntensity={emissive ? 0.9 : 0.12} />}
    </instancedMesh>
  );
}

/**
 * The cabin, seen from your seat: a curved sidewall with rounded windows (cut out, so you see the real sky and sea
 * going by), overhead bins with reading lights, the arched ceiling and its mood lighting, carpeted aisles, and every
 * row of seats (economy 3-3-3, business 1-2-1, first suites), some with passengers.
 */
function Cabin({ cabin }: { cabin: CabinClass }) {
  const R = 3.1, L = 64, LEN = 50;
  const windows = useMemo(() => Array.from({ length: 46 }, (_, i) => -L / 2 + 14 + i * 0.95), []);
  const mood = cabin === "economy" ? "#a78bfa" : "#fbbf24";
  // The window band's cut-outs: white is wall, black is window.
  const wallAlpha = useMemo(() => {
    if (typeof document === "undefined") return null;
    const px = 48;
    const c = document.createElement("canvas"); c.width = Math.round(LEN * px); c.height = Math.round(1.0 * px);
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#000000";
    for (const z of windows) {
      const u = (z + LEN / 2) * px, w = 0.25 * px, h = 0.36 * px;
      g.beginPath(); g.roundRect(u - w / 2, c.height / 2 - h / 2, w, h, w / 2); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }, [windows]);
  // The cross-section's pieces (x outwards, y up), extruded along the cabin: the dado panel, the band above the
  // windows curving in to the bins, the bins' undersides and the ceiling arch.
  const strip = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return { mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number], len: Math.hypot(dx, dy), tilt: Math.atan2(dx, dy) };
  };
  const pieces = [strip([2.62, 0], [2.82, 0.72]), strip([2.82, 1.6], [2.45, 2.0]), strip([2.45, 2.0], [1.45, 2.05])];
  const seats = useMemo(() => {
    type Part = Array<{ p: THREE.Vector3Tuple; s: THREE.Vector3Tuple; r?: number }>;
    const out: Record<"cushion" | "back" | "head" | "screen" | "arm" | "pod" | "people" | "hair", Part> = { cushion: [], back: [], head: [], screen: [], arm: [], pod: [], people: [], hair: [] };
    const me = mySeat(cabin);
    for (const [cls, c] of Object.entries(CABIN_LAYOUT) as Array<[CabinClass, (typeof CABIN_LAYOUT)[CabinClass]]>) {
      let row = 0;
      for (let z = c.from; z <= c.to; z += c.pitch, row++) {
        c.xs.forEach((x, k) => {
          const w = c.width, big = cls !== "economy";
          out.cushion.push({ p: [x, 0.45, z], s: [w * 0.9, 0.14, big ? 1.1 : 0.48] });
          out.back.push({ p: [x, 0.95, z - (big ? 0.55 : 0.26)], s: [w * 0.9, big ? 1.05 : 0.95, 0.12], r: -0.12 });
          out.head.push({ p: [x, big ? 1.5 : 1.42, z - (big ? 0.6 : 0.3)], s: [w * 0.7, 0.2, 0.13], r: -0.12 });
          // The screen on the back of the seat (facing the row behind), glowing with the moving map.
          out.screen.push({ p: [x, 1.08, z - (big ? 0.63 : 0.33)], s: [w * 0.55, 0.26, 0.02], r: -0.12 });
          out.arm.push({ p: [x - w / 2, 0.62, z], s: [0.06, 0.08, big ? 0.9 : 0.42] });
          if (k === c.xs.length - 1 || cls !== "economy") out.arm.push({ p: [x + w / 2, 0.62, z], s: [0.06, 0.08, big ? 0.9 : 0.42] });
          // Business and first: the pod's shell round each seat; first's has a sliding door.
          if (big) out.pod.push({ p: [x + (x < 0 ? w * 0.62 : -w * 0.62), 0.7, z], s: [0.06, cls === "first" ? 1.4 : 1.05, 1.5] });
          // Passengers in about half the seats (never yours).
          const mine = cls === cabin && Math.abs(x - me[0]) < 0.01 && Math.abs(z - me[1]) < 0.01;
          if (!mine && ((row * 7 + k * 3) % 5) < 3) {
            out.people.push({ p: [x, 1.2, z - 0.05], s: [w * 0.32, 0.36, 0.17] });
            out.hair.push({ p: [x, 1.6, z - 0.08], s: [0.11, 0.12, 0.12] });
          }
        });
      }
    }
    return out;
  }, [cabin]);
  const bulkheads = [CABIN_LAYOUT.business.from - 0.9, CABIN_LAYOUT.first.from - 0.9];
  // The seat-back screens' moving map: the Gulf coast, the route and the little jet on it.
  const screenMap = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas"); c.width = 256; c.height = 160;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0c4a6e"; g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#d6bc8a"; g.beginPath(); g.moveTo(0, 160); g.lineTo(0, 70); g.quadraticCurveTo(120, 95, 256, 40); g.lineTo(256, 160); g.fill();
    g.strokeStyle = "#facc15"; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(210, 62); g.quadraticCurveTo(130, 70, 50, 92); g.stroke();
    g.setLineDash([]); g.fillStyle = "#f8fafc"; g.font = "bold 16px system-ui"; g.fillText("DXB", 200, 52); g.fillText("AUH", 30, 84);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 72, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#94a3b8"; g.font = "12px system-ui"; g.fillText("32,000 ft · 830 km/h · 24 min to go", 12, 150);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group position={[0, -0.69, 0]}>
      {/* Floor and the aisles' carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5.3, LEN]} /><meshStandardMaterial color="#334155" roughness={1} emissive="#334155" emissiveIntensity={0.2} /></mesh>
      {[-1, 1].map((s) => <mesh key={`a${s}`} rotation={[-Math.PI / 2, 0, 0]} position={[s * 1.0, 0.005, 0]}><planeGeometry args={[0.7, LEN]} /><meshStandardMaterial color="#1e3a8a" roughness={1} emissive="#1e3a8a" emissiveIntensity={0.25} /></mesh>)}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* The window band, cut out for the windows, with a recessed shade line over each */}
          <mesh position={[s * 2.82, 1.16, 0]} rotation={[0, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} scale={[s < 0 ? -1 : 1, 1, 1]}>
            <planeGeometry args={[LEN, 0.88]} />
            <meshStandardMaterial color="#f1f5f9" emissive="#f8fafc" emissiveIntensity={0.25} alphaMap={wallAlpha ?? undefined} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.6} />
          </mesh>
          {windows.map((z) => (
            <mesh key={z} position={[s * 2.81, 1.16, z]} rotation={[0, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} scale={[0.7, 1, 1]}><ringGeometry args={[0.16, 0.2, 24, 1]} /><meshStandardMaterial color="#cbd5e1" side={THREE.DoubleSide} /></mesh>
          ))}
          {/* The curved panels: dado below the windows, the shoulder up to the bins, the bins' undersides */}
          {pieces.map((pc, i) => (
            <mesh key={i} position={[s * pc.mid[0], pc.mid[1], 0]} rotation={[0, 0, s * -pc.tilt]}>
              <boxGeometry args={[0.04, pc.len, LEN]} /><meshStandardMaterial color={i === 2 ? "#e2e8f0" : "#eef2f7"} emissive="#f8fafc" emissiveIntensity={0.22} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* Overhead bins: their doors facing the aisle, a grey latch strip, and the reading lights under them */}
          <mesh position={[s * 1.95, 2.28, 0]}><boxGeometry args={[1.0, 0.5, LEN]} /><meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.18} /></mesh>
          <mesh position={[s * 1.44, 2.28, 0]}><boxGeometry args={[0.02, 0.1, LEN]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <mesh position={[s * 1.95, 2.02, 0]}><boxGeometry args={[0.9, 0.02, LEN]} /><meshBasicMaterial color="#fef9c3" /></mesh>
          {/* The middle bins over the centre seats */}
          <mesh position={[s * 0.45, 2.3, 0]}><boxGeometry args={[0.85, 0.45, LEN]} /><meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.18} /></mesh>
          {/* Mood light strip along the top of the sidewall */}
          <mesh position={[s * 2.5, 1.95, 0]}><boxGeometry args={[0.02, 0.04, LEN]} /><meshBasicMaterial color={mood} /></mesh>
        </group>
      ))}
      {/* The ceiling arch over the aisles, with its mood lighting */}
      <mesh position={[0, 2.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.22]}>
        <cylinderGeometry args={[1.5, 1.5, LEN, 32, 1, true, Math.PI, Math.PI]} /><meshStandardMaterial color="#f8fafc" emissive={mood} emissiveIntensity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => <mesh key={`cl${s}`} position={[s * 0.95, 2.53, 0]}><boxGeometry args={[0.05, 0.02, LEN]} /><meshBasicMaterial color={mood} /></mesh>)}
      {/* Bulkheads between the cabins, with the exit signs */}
      {bulkheads.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-1.9, 1.9].map((x) => <mesh key={x} position={[x, 1.1, 0]}><boxGeometry args={[1.6, 2.2, 0.08]} /><meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0" emissiveIntensity={0.2} /></mesh>)}
          <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.8, 2.2, 0.08]} /><meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0" emissiveIntensity={0.2} /></mesh>
          {[-1, 1].map((s) => <mesh key={`ex${s}`} position={[s * 1.0, 2.15, -0.06]}><boxGeometry args={[0.35, 0.12, 0.02]} /><meshBasicMaterial color="#22c55e" /></mesh>)}
        </group>
      ))}
      {/* The seats (cushions in the cabin's colour, white headrest covers, glowing seat-back screens) and passengers */}
      <SeatPart items={seats.cushion} geo="box" color={cabin === "first" ? "#7f1d1d" : "#1e293b"} />
      <SeatPart items={seats.back} geo="box" color={cabin === "economy" ? "#0f766e" : "#1f2937"} />
      <SeatPart items={seats.head} geo="box" color="#f8fafc" />
      <SeatPart items={seats.screen} geo="box" color="#0369a1" emissive="#38bdf8" map={screenMap} />
      <SeatPart items={seats.arm} geo="box" color="#64748b" />
      {seats.pod.length > 0 && <SeatPart items={seats.pod} geo="box" color="#c9a24a" />}
      <SeatPart items={seats.people} geo="box" color="#475569" />
      <SeatPart items={seats.hair} geo="sphere" color="#3b2a1e" />
      <pointLight position={[0, 2.0, mySeat(cabin)[1] + 2]} intensity={6} distance={12} color="#fff7e6" />
    </group>
  );
}

export interface FlightView { inside: boolean }

/** The flight scene; `t` (seconds since push-back) is advanced here and reported. */
export function FlightScene({ to, cabin, view, timeRef, onPhase }: {
  to: string; cabin: CabinClass; view: FlightView;
  timeRef: React.MutableRefObject<number>;
  onPhase?: (phase: string, t: number) => void;
}) {
  const plane = useRef<THREE.Group>(null);
  const spin = useRef(40);
  const gear = useRef(1);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const last = useRef(new THREE.Vector3());
  const lastPhase = useRef("");
  // Inside: where you look from your seat (dragged), as yaw and pitch.
  // Starts looking forward down the cabin and out of the window on your left.
  const look = useRef({ yaw: 0.75, pitch: -0.1 });
  const [seatX, seatZ] = mySeat(cabin);
  useEffect(() => {
    if (!view.inside) return;
    const el = document.querySelector("canvas");
    if (!el) return;
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      look.current.yaw -= (e.clientX - drag.x) * 0.005;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - (e.clientY - drag.y) * 0.004, -0.6, 0.5);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    el.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [view.inside]);

  // eslint-disable-next-line react-hooks/immutability -- the camera, jet and walker are three.js objects and refs, moved every frame
  useFrame((_, dt) => {
    // eslint-disable-next-line react-hooks/immutability -- the flight clock is a ref the page reads
    timeRef.current = Math.min(FLIGHT_SECONDS + 1, timeRef.current + Math.min(dt, 0.1));
    const f = flightAt(timeRef.current);
    const g = plane.current;
    if (!g) return;
    g.position.set(0, f.y, f.z);
    g.rotation.set(-f.pitch, 0, 0);
    // Now, not after this frame's render: the seat camera rides with the jet (at 260 m/s a frame's lag is metres).
    g.updateMatrixWorld(true);
    // Gear up after take-off, down for the approach; fans spool up for the roll and the climb.
    const wantGear = f.y > 60 && f.phase !== "Descending" ? 0 : f.phase === "Descending" && f.y > 250 ? 0 : 1;
    gear.current = THREE.MathUtils.damp(gear.current, wantGear, 2, dt);
    spin.current = 20 + f.speed * 0.5;
    if (f.phase !== lastPhase.current) { lastPhase.current = f.phase; onPhase?.(f.phase, timeRef.current); }

    if (view.inside) {
      // From your seat: eye height, looking where you've turned.
      const eye = new THREE.Vector3(seatX + 0.2, 6.5, seatZ - 0.3).applyMatrix4(g.matrixWorld);
      const ahead = new THREE.Vector3(Math.sin(look.current.yaw) * -1, Math.sin(look.current.pitch), Math.cos(look.current.yaw)).applyQuaternion(g.quaternion);
      camera.position.copy(eye);
      camera.lookAt(eye.clone().add(ahead));
      // eslint-disable-next-line react-hooks/immutability -- the three.js camera is changed in place
      if (camera.fov !== 78) { camera.fov = 78; camera.updateProjectionMatrix(); }
      return;
    }
    // eslint-disable-next-line react-hooks/immutability -- the three.js camera is changed in place
    if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); last.current.set(0, 0, 0); }
    // Outside: the camera keeps its angle and distance on the jet as it flies (drag to circle it).
    const at = g.position.clone().add(new THREE.Vector3(0, 6, 0));
    if (controls) {
      if (last.current.lengthSq() === 0) { camera.position.copy(at).add(new THREE.Vector3(-55, 18, -70)); last.current.copy(at); }
      camera.position.add(at.clone().sub(last.current));
      controls.target.copy(at);
      controls.update();
    }
    last.current.copy(at);
  });
  return (
    <group>
      <Sky sunPosition={[1, 0.4, 0.6]} turbidity={6} rayleigh={1.2} distance={45000} />
      <fog attach="fog" args={["#cfe3f1", 1500, 9000]} />
      <hemisphereLight args={["#ffffff", "#d8c08e", 1.0]} />
      <directionalLight position={[2000, 3000, 1000]} intensity={1.8} />
      <World to={to} />
      <group ref={plane}>
        <GearScale gear={gear}>
          <Airliner spin={spin} gear={1} inside={view.inside}>
            {view.inside && <Cabin cabin={cabin} />}
          </Airliner>
        </GearScale>
      </group>
    </group>
  );
}

/** Passes the live gear position into the jet (read every frame). */
function GearScale({ gear, children }: { gear: React.RefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const wheels = g.current?.getObjectByName("gear");
    if (wheels) { wheels.scale.y = Math.max(0.01, gear.current ?? 1); wheels.visible = (gear.current ?? 1) > 0.05; }
  });
  return <group ref={g}>{children}</group>;
}
