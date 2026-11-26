"use client";

// The departures terminal (DXB Terminal 3, or AUH on the way back), drawn in code, upstairs on the departures
// level (floor at the jet's door height) so the jet bridge runs level to the plane. You walk it front to back
// along +z: the check-in hall (z 0–26), passport control's e-gates (z 26–36), duty free round a gold palm
// (z 36–64) and the gate (z 64–92), whose glass wall looks out on the apron where the jet waits.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FLIGHTS from "@/data/flights/flights.json";
import { Airliner, DOOR_HEIGHT, FRONT_DOOR } from "./Airliner";

export const FLOOR = DOOR_HEIGHT;
const W = 16, H = 9, END = 92;
const C = FLIGHTS.airline.colors;

/** Where things are, for walking the journey (x, z on the terminal floor). */
export const SPOTS = {
  entrance: [0, 3] as [number, number],
  counter: [0, 12.6] as [number, number],
  gatesFront: [0, 29.5] as [number, number],
  gatesThrough: [0, 34.5] as [number, number],
  dutyFree: [0, 50] as [number, number],
  gate: [9, 80] as [number, number],
  bridge: [W + 0.5, 84] as [number, number],
};
/** The jet on the apron beside the gate: its door lines up with the jet bridge. */
export const PLANE_AT = { x: W + 30, z: 84 - FRONT_DOOR.z };

function useTextTexture(lines: Array<{ text: string; color?: string; size?: number; bold?: boolean }>, w = 1024, h = 256, bg = "#0b1220") {
  const key = JSON.stringify(lines);
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    let y = 0;
    for (const l of lines) {
      const size = l.size ?? 48;
      y += size * 1.25;
      g.font = `${l.bold ? "bold " : ""}${size}px system-ui, sans-serif`; g.fillStyle = l.color ?? "#f8fafc";
      g.fillText(l.text, 24, y);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h, bg]);
}

function Sign({ position, rotation, w, h, lines, bg }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; w: number; h: number; lines: Parameters<typeof useTextTexture>[0]; bg?: string }) {
  const tex = useTextTexture(lines, 1024, Math.round(1024 * (h / w)), bg);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      {tex ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshBasicMaterial color={bg ?? "#0b1220"} />}
    </mesh>
  );
}

/** The departures board: flights, gates and their status. */
function DeparturesBoard({ position, rotation, from, to }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; from: string; to: string }) {
  const lines = [
    { text: "DEPARTURES  ·  المغادرة", color: "#facc15", size: 44, bold: true },
    { text: `DL 109   ${to.toUpperCase().padEnd(14)} B12   BOARDING`, color: "#4ade80", size: 36 },
    { text: "DL 214   LONDON         A3    ON TIME", size: 36 },
    { text: "DL 331   RIYADH         C21   ON TIME", size: 36 },
    { text: "DL 418   CAPE TOWN      B7    GATE OPENS 21:40", size: 36 },
    { text: "DL 502   DOHA           A9    DELAYED", color: "#f87171", size: 36 },
    { text: `${from.toUpperCase()}  ·  DUBAI LIFE AIRWAYS`, color: "#94a3b8", size: 30 },
  ];
  return <Sign position={position} rotation={rotation} w={7} h={3.4} lines={lines} />;
}

function Floor() {
  // Polished stone with a soft grid, one texture repeated over the hall.
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e9e4da"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#d6cfc2"; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(10, 10, 110, 110);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 2, END / 4); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, END / 2]} receiveShadow>
      <planeGeometry args={[W * 2, END]} />
      <meshStandardMaterial map={tex ?? undefined} color={tex ? undefined : "#e9e4da"} roughness={0.25} metalness={0.05} />
    </mesh>
  );
}

/** The building: walls, the wave roof on white tree columns, skylights and the glass wall at the gate. */
function Shell() {
  const cols = useMemo(() => Array.from({ length: 8 }, (_, i) => 6 + i * 12), []);
  return (
    <group>
      {/* Back (entrance) wall with the doors, and the far wall */}
      {[0, END].map((z) => (
        <mesh key={z} position={[0, FLOOR + H / 2, z]}><boxGeometry args={[W * 2, H, 0.3]} /><meshStandardMaterial color="#f1f5f9" roughness={0.7} /></mesh>
      ))}
      {/* Landside wall (x = -W): stone, with the airline's wall of light */}
      <mesh position={[-W, FLOOR + H / 2, END / 2]}><boxGeometry args={[0.3, H, END]} /><meshStandardMaterial color="#efe9df" roughness={0.8} /></mesh>
      {/* Airside wall (x = +W): solid up to the gate, then floor-to-ceiling glass looking out at the jet */}
      <mesh position={[W, FLOOR + H / 2, 32]}><boxGeometry args={[0.3, H, 64]} /><meshStandardMaterial color="#efe9df" roughness={0.8} /></mesh>
      <mesh position={[W, FLOOR + H / 2, 78]}><boxGeometry args={[0.06, H, 28]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.18} roughness={0.05} metalness={0.3} depthWrite={false} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`m${i}`} position={[W, FLOOR + H / 2, 64 + i * 4]}><boxGeometry args={[0.2, H, 0.15]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} /></mesh>
      ))}
      {/* The roof: a gentle wave of white slats over the whole hall, with skylight strips */}
      <mesh position={[0, FLOOR + H + 0.2, END / 2]}><boxGeometry args={[W * 2 + 0.4, 0.4, END + 0.4]} /><meshStandardMaterial color="#f8fafc" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={`s${i}`} position={[0, FLOOR + H - 0.35 - Math.sin(i * 0.5) * 0.25, 2 + i * 4.2]}><boxGeometry args={[W * 2, 0.12, 0.5]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
      ))}
      {[-6, 6].map((x) => (
        <mesh key={`sk${x}`} position={[x, FLOOR + H - 0.05, END / 2]}><boxGeometry args={[2, 0.04, END - 4]} /><meshBasicMaterial color="#fef9c3" /></mesh>
      ))}
      {/* Tree columns: a white trunk branching into the roof */}
      {cols.map((z) => [-8, 8].map((x) => (
        <group key={`c${x}${z}`} position={[x, FLOOR, z]}>
          <mesh position={[0, H / 2 - 0.7, 0]}><cylinderGeometry args={[0.32, 0.45, H - 1.4, 14]} /><meshStandardMaterial color="#f8fafc" roughness={0.5} /></mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[Math.cos(k * Math.PI / 2) * 0.8, H - 0.9, Math.sin(k * Math.PI / 2) * 0.8]} rotation={[Math.sin(k * Math.PI / 2) * 0.7, 0, -Math.cos(k * Math.PI / 2) * 0.7]}>
              <cylinderGeometry args={[0.12, 0.22, 1.9, 8]} /><meshStandardMaterial color="#f8fafc" />
            </mesh>
          ))}
        </group>
      )))}
    </group>
  );
}

/** The check-in hall: the airline's island of counters with bag belts, queue lines, the board and signs. */
function CheckIn({ from, to }: { from: string; to: string }) {
  return (
    <group>
      <Sign position={[0, FLOOR + 6.8, 15.5]} rotation={[0, Math.PI, 0]} w={14} h={1.6} lines={[{ text: `${FLIGHTS.airline.name.toUpperCase()}  ·  CHECK-IN  ·  تسجيل الوصول`, color: "#f8fafc", size: 64, bold: true }]} bg={C.tail} />
      {/* The island of counters */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = -7.5 + i * 3;
        return (
          <group key={i} position={[x, FLOOR, 14]}>
            <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[2.4, 1.1, 0.9]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
            <mesh position={[0, 1.12, 0]}><boxGeometry args={[2.5, 0.06, 1]} /><meshStandardMaterial color={C.accent} metalness={0.35} roughness={0.25} /></mesh>
            {/* Its screen with the class it serves */}
            <Sign position={[0, 2.3, -0.25]} rotation={[0, Math.PI, 0]} w={1.6} h={0.55} lines={[{ text: i < 1 ? "FIRST" : i < 2 ? "BUSINESS" : `ECONOMY ${i - 1}`, color: i < 2 ? "#facc15" : "#f8fafc", size: 120, bold: true }]} bg="#0f172a" />
            <mesh position={[0, 1.7, -0.2]}><cylinderGeometry args={[0.04, 0.04, 1.2, 8]} /><meshStandardMaterial color="#94a3b8" metalness={0.35} /></mesh>
            {/* The bag scale and belt beside it */}
            <mesh position={[1.45, 0.25, 0.15]}><boxGeometry args={[0.6, 0.5, 1.1]} /><meshStandardMaterial color="#334155" roughness={0.5} /></mesh>
            <mesh position={[1.45, 0.51, 0.15]}><boxGeometry args={[0.55, 0.02, 1.05]} /><meshStandardMaterial color="#111827" roughness={0.9} /></mesh>
          </group>
        );
      })}
      {/* The wall behind the counters, with the falcon in gold */}
      <mesh position={[0, FLOOR + 2, 15.2]}><boxGeometry args={[19, 4, 0.4]} /><meshStandardMaterial color={C.tail} roughness={0.5} /></mesh>
      <mesh position={[0, FLOOR + 2.4, 14.99]} rotation={[0, Math.PI, 0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color={C.accent} metalness={0.35} roughness={0.25} /></mesh>
      {/* Queue lines: chrome posts and teal tape */}
      {Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, k) => (
        <mesh key={`p${r}${k}`} position={[-9 + k * 3, FLOOR + 0.5, 7 + r * 1.4]}><cylinderGeometry args={[0.04, 0.06, 1, 8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.2} /></mesh>
      )))}
      {Array.from({ length: 5 }, (_, r) => (
        <mesh key={`t${r}`} position={[0, FLOOR + 0.92, 7 + r * 1.4]}><boxGeometry args={[18, 0.06, 0.02]} /><meshStandardMaterial color={C.tail} /></mesh>
      ))}
      <DeparturesBoard position={[-15.8, FLOOR + 4.5, 8]} rotation={[0, Math.PI / 2, 0]} from={from} to={to} />
      <DeparturesBoard position={[15.8, FLOOR + 4.5, 8]} rotation={[0, -Math.PI / 2, 0]} from={from} to={to} />
      {/* Trolleys and a few bags */}
      {[[-12, 4], [12, 5], [-11, 20]].map(([x, z], i) => (
        <group key={`tr${i}`} position={[x, FLOOR, z]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.7, 0.05, 1.2]} /><meshStandardMaterial color="#94a3b8" metalness={0.35} /></mesh>
          <mesh position={[0, 0.75, 0.1]}><boxGeometry args={[0.5, 0.55, 0.75]} /><meshStandardMaterial color={["#7c3aed", "#b91c1c", "#0f766e"][i]} roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Passport control: officers' booths and a row of e-gates whose glass flaps open as you pass. */
function PassportControl({ open }: { open: React.RefObject<number> }) {
  const flaps = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = flaps.current;
    if (!g) return;
    g.children.forEach((c, i) => { const k = i % 2 ? -1 : 1; c.rotation.y = THREE.MathUtils.damp(c.rotation.y, k * (open.current ?? 0) * 1.4, 6, dt); });
  });
  return (
    <group>
      <Sign position={[0, FLOOR + 6.5, 26.5]} rotation={[0, Math.PI, 0]} w={12} h={1.4} lines={[{ text: "PASSPORT CONTROL  ·  SMART GATES  ·  الجوازات", color: "#f8fafc", size: 64, bold: true }]} bg="#1e3a8a" />
      {Array.from({ length: 6 }, (_, i) => {
        const x = -7.5 + i * 3;
        return (
          <group key={i} position={[x, FLOOR, 32]}>
            {[-0.8, 0.8].map((dx) => (
              <mesh key={dx} position={[dx, 0.55, 0]}><boxGeometry args={[0.25, 1.1, 1.6]} /><meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.3} /></mesh>
            ))}
            {/* The scanner screen glowing green */}
            <mesh position={[-0.8, 1.25, -0.5]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.24, 0.3, 0.04]} /><meshBasicMaterial color="#22c55e" /></mesh>
          </group>
        );
      })}
      {/* The flaps of every gate (the middle pair opens for you) */}
      <group ref={flaps}>
        {Array.from({ length: 6 }, (_, i) => [-1, 1].map((k) => (
          <group key={`${i}${k}`} position={[-7.5 + i * 3 + k * 0.65, FLOOR + 0.6, 32.6]}>
            <mesh position={[-k * 0.3, 0, 0]}><boxGeometry args={[0.6, 0.7, 0.03]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.6} /></mesh>
          </group>
        )))}
      </group>
      {/* Officers' booths at the sides */}
      {[-13, 13].map((x) => (
        <group key={x} position={[x, FLOOR, 31]}>
          <mesh position={[0, 0.8, 0]}><boxGeometry args={[2.4, 1.6, 2]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 1.9, 0]}><boxGeometry args={[2.4, 0.6, 2]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.35} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Duty free: lit shopfronts down both sides, and the gold palm in the middle. */
function DutyFree() {
  const shops = [
    { name: "PERFUMES & OUD", color: "#7c2d12" }, { name: "GOLD & WATCHES", color: "#a16207" }, { name: "SUNGLASSES", color: "#0f172a" },
    { name: "DATES & SWEETS", color: "#14532d" }, { name: "ELECTRONICS", color: "#1e3a8a" }, { name: "FASHION", color: "#831843" },
  ];
  return (
    <group>
      <Sign position={[0, FLOOR + 6.5, 37]} rotation={[0, Math.PI, 0]} w={10} h={1.3} lines={[{ text: "DUTY FREE  ·  السوق الحرة", color: "#facc15", size: 72, bold: true }]} bg="#111827" />
      {shops.map((s, i) => {
        const side = i % 2 ? 1 : -1, z = 42 + Math.floor(i / 2) * 7.5;
        return (
          <group key={s.name} position={[side * (W - 2.2), FLOOR, z]}>
            <mesh position={[0, 2, 0]}><boxGeometry args={[4, 4, 6.6]} /><meshStandardMaterial color="#f8fafc" roughness={0.4} /></mesh>
            {/* Shop window glowing, and its sign */}
            <mesh position={[-side * 2.01, 1.7, 0]} rotation={[0, -side * Math.PI / 2, 0]}><planeGeometry args={[5.6, 2.6]} /><meshStandardMaterial color="#fff7ed" emissive="#fde68a" emissiveIntensity={0.55} /></mesh>
            <Sign position={[-side * 2.02, 3.6, 0]} rotation={[0, -side * Math.PI / 2, 0]} w={5} h={0.7} lines={[{ text: s.name, color: "#f8fafc", size: 110, bold: true }]} bg={s.color} />
            {/* Shelves of goods in the window */}
            {[0.9, 1.6, 2.3].map((y) => (
              <mesh key={y} position={[-side * 1.8, y, 0]}><boxGeometry args={[0.3, 0.06, 5]} /><meshStandardMaterial color={C.accent} metalness={0.6} /></mesh>
            ))}
          </group>
        );
      })}
      {/* The gold palm in the atrium */}
      <group position={[0, FLOOR, 50]}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[2.2, 2.4, 0.6, 32]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.25, 0.4, 5, 12]} /><meshStandardMaterial color={C.accent} metalness={0.35} roughness={0.35} emissive={C.accent} emissiveIntensity={0.15} /></mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[0, 5.5, 0]} rotation={[0.9, (i / 9) * Math.PI * 2, 0]}>
            <boxGeometry args={[0.5, 0.06, 3.4]} /><meshStandardMaterial color={C.accent} metalness={0.35} roughness={0.35} emissive={C.accent} emissiveIntensity={0.15} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The gate: rows of seats facing the glass, the gate desk, and the jet bridge out to the plane. */
function Gate({ bridge }: { bridge: React.RefObject<number> }) {
  return (
    <group>
      <Sign position={[0, FLOOR + 6.5, 65]} rotation={[0, Math.PI, 0]} w={10} h={1.3} lines={[{ text: "GATES B1–B12  ·  البوابات", color: "#f8fafc", size: 72, bold: true }]} bg="#0f172a" />
      <Sign position={[11, FLOOR + 3.2, 77]} rotation={[0, -Math.PI / 2, 0]} w={3.6} h={1.2} lines={[
        { text: "B12  DL 109", color: "#facc15", size: 90, bold: true }, { text: "BOARDING", color: "#4ade80", size: 80, bold: true },
      ]} />
      {/* The gate desk */}
      <group position={[11, FLOOR, 80]}>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[1, 1.1, 3]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        <mesh position={[0, 1.12, 0]}><boxGeometry args={[1.1, 0.06, 3.1]} /><meshStandardMaterial color={C.accent} metalness={0.35} /></mesh>
      </group>
      {/* Seats in rows facing the window */}
      {Array.from({ length: 5 }, (_, r) => Array.from({ length: 8 }, (_, k) => (
        <group key={`${r}${k}`} position={[-12 + r * 3.6, FLOOR, 70 + k * 1.1]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.55, 0.08, 0.55]} /><meshStandardMaterial color="#0f766e" roughness={0.5} /></mesh>
          <mesh position={[0, 0.75, -0.26]}><boxGeometry args={[0.55, 0.6, 0.06]} /><meshStandardMaterial color="#0f766e" roughness={0.5} /></mesh>
          <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.06, 0.45, 0.06]} /><meshStandardMaterial color="#94a3b8" metalness={0.35} /></mesh>
        </group>
      )))}
      <JetBridge extend={bridge} />
    </group>
  );
}

/** The jet bridge: a glazed tunnel from the gate out to the plane's front door (it reaches out as you board). */
function JetBridge({ extend }: { extend: React.RefObject<number> }) {
  const tube = useRef<THREE.Group>(null);
  const len = PLANE_AT.x + FRONT_DOOR.x - W;
  useFrame(() => { if (tube.current) tube.current.scale.x = 0.55 + 0.45 * (extend.current ?? 1); });
  return (
    <group position={[W, FLOOR, 84]}>
      <group ref={tube}>
        <mesh position={[len / 2, 1.3, 0]}><boxGeometry args={[len, 2.6, 2.6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} side={THREE.BackSide} /></mesh>
        <mesh position={[len / 2, 0.02, 0]}><boxGeometry args={[len, 0.04, 2.4]} /><meshStandardMaterial color="#334155" roughness={0.9} /></mesh>
        {/* Windows down its side */}
        {Array.from({ length: Math.floor(len / 2) }, (_, i) => (
          <mesh key={i} position={[1 + i * 2, 1.6, 1.31]}><planeGeometry args={[1.2, 0.8]} /><meshBasicMaterial color="#bae6fd" /></mesh>
        ))}
        <Sign position={[len / 2, 3.0, 1.32]} w={6} h={0.6} lines={[{ text: FLIGHTS.airline.name.toUpperCase(), color: "#f8fafc", size: 100, bold: true }]} bg={C.tail} />
      </group>
      {/* Its legs down to the apron */}
      <mesh position={[len * 0.65, -FLOOR / 2, 0]}><boxGeometry args={[0.4, FLOOR, 0.4]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} /></mesh>
    </group>
  );
}

/** The apron outside the glass: tarmac, markings, the jet, and a tug and a baggage cart beside it. */
function Apron({ spin }: { spin: React.RefObject<number> }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W + 60, 0, 60]} receiveShadow><planeGeometry args={[140, 240]} /><meshStandardMaterial color="#6b7280" roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PLANE_AT.x, 0.02, PLANE_AT.z]}><planeGeometry args={[0.4, 90]} /><meshBasicMaterial color="#facc15" /></mesh>
      <group position={[PLANE_AT.x, 0, PLANE_AT.z]}><Airliner spin={spin} /></group>
      {/* A second jet on the next stand, and the runway lights far out */}
      <group position={[PLANE_AT.x + 70, 0, PLANE_AT.z - 30]} rotation={[0, 0.4, 0]}><Airliner spin={spin} /></group>
      <group position={[PLANE_AT.x - 12, 0, PLANE_AT.z + 30]}>
        <mesh position={[0, 0.8, 0]}><boxGeometry args={[2.4, 1.2, 4]} /><meshStandardMaterial color="#facc15" roughness={0.5} /></mesh>
        <mesh position={[0, 1.7, -1]}><boxGeometry args={[2.2, 0.8, 1.4]} /><meshStandardMaterial color="#1f2937" /></mesh>
      </group>
    </group>
  );
}

/** The whole terminal and what's outside it. */
export function Terminal({ from, to, gatesOpen, bridge, spin }: { from: string; to: string; gatesOpen: React.RefObject<number>; bridge: React.RefObject<number>; spin: React.RefObject<number> }) {
  return (
    <group>
      {/* The ground floor under the departures level (the arrivals road and the forecourt) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, 0, 40]}><planeGeometry args={[80, 200]} /><meshStandardMaterial color="#d6c7a6" roughness={1} /></mesh>
      <mesh position={[0, FLOOR / 2, END / 2]}><boxGeometry args={[W * 2, FLOOR, END]} /><meshStandardMaterial color="#cbd5e1" roughness={0.8} /></mesh>
      <Floor />
      <Shell />
      <CheckIn from={from} to={to} />
      <PassportControl open={gatesOpen} />
      <DutyFree />
      <Gate bridge={bridge} />
      <Apron spin={spin} />
      {/* Lighting: the hall is bright and even, like an airport by day */}
      <hemisphereLight args={["#ffffff", "#c7b99b", 1.1]} />
      <directionalLight position={[60, 80, 20]} intensity={1.6} />
      <pointLight position={[0, FLOOR + 7, 14]} intensity={30} distance={40} color="#fff7e6" />
      <pointLight position={[0, FLOOR + 7, 50]} intensity={30} distance={40} color="#fff7e6" />
      <pointLight position={[0, FLOOR + 7, 80]} intensity={30} distance={40} color="#fff7e6" />
    </group>
  );
}
