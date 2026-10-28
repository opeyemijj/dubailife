"use client";

// Driving your own car (or your rental) to where you're going: you pull out onto Sheikh Zayed Road and drive
// it yourself, with the accelerator, the brake and the wheel, among traffic that drives like considerate
// people do. Every other car keeps a safe gap and brakes for whoever is in front (you included), signals
// for a second and a half before changing lanes and only moves over when there's room, lets you in when you
// indicate towards it, and keeps right when it isn't overtaking; it leans on the horn if you cut in too
// close. Speed cameras flash over 120 (the limit is 100), and the fine comes with the drive. If you asked to
// fill up, the car pulls into an ENOC station on the way (an attendant fills it) or a Tesla Supercharger.
// Hit another car and it's over: Dubai Police come, you're arrested and the car is taken (*_driving.sql).
// The satnav counts down the distance and tells you when you're nearly there; at the destination you turn
// off into its car park and park it yourself (real steering, reverse with the brake, parking sensors) in a
// free marked bay, then pay the RTA meter. Skip paying or park across the lines and a parking inspector's
// fine turns up a few minutes later (*_parking.sql).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { BurjKhalifa, CityBlocks, dubaiSky, laneX, ROAD, Road, SkyAndLight, type Sky } from "@/components/transit/TransitWorld";
import { announce, crash, doorThud, horn, indicatorTick, sensorBeep, setLoopSpeed, startLoop, stopLoops, stopSpeech } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { CARS, aed, carAccident, finishDrive, fuelFor, parkCar, refuel, refuelCost, type Car, type Drivable } from "@/lib/cars";
import { CarModel, carLength } from "./CarModel";
import { ArrestScene, accidentArrest } from "./ArrestScene";
import { SteeringWheel } from "./SteeringWheel";

const DR = CARS.driving;
const RADAR = DR.radarOver / 3.6;
/** Where the fuel station is along the drive (metres), when you're filling up. */
const STATION_P = 230;
const ROAD_EDGE = ROAD.median / 2 + ROAD.half;
const MIN_X = ROAD.median / 2 + 1.15, MAX_X = ROAD_EDGE - 1.05;
/** Where the car stops at the pump, off the road. */
const PUMP_X = ROAD_EDGE + 7;
/** Two cars closer than this sideways are in the same lane. */
const WIDE = 2.3;
/** The car park at the destination (x across, z along the road from its middle): marked 90° bays at the back. */
const LOT = { x1: ROAD_EDGE + 24.5, half: 24, bayX0: ROAD_EDGE + 14.5, bayX1: ROAD_EDGE + 20.5, bayW: 2.9, bays: 8 };
const bayZ = (i: number) => (i - (LOT.bays - 1) / 2) * LOT.bayW;
const BAY_CX = (LOT.bayX0 + LOT.bayX1) / 2;
/** Where you turn off for the car park (how far before the end of the drive the steering goes free). */
const PARK_FROM = 70;
const hash = (i: number, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

type Phase = "ready" | "drive" | "station" | "fill" | "leave" | "park" | "parked" | "crash";
interface Sim {
  phase: Phase; s: number; v: number; x: number; lat: number;
  /** In the car park the road stops moving and the car drives freely: z along the road, heading h (0 = ahead). */
  z: number; h: number; bay: number; sensor: number;
  /** The wheel: -1 full left .. 1 full right (analog). */
  steer: number; gas: boolean; brake: boolean; t: number; view: "chase" | "far";
  speeding: boolean; radarIdx: number; shake: number;
}
interface Ai {
  p: number; x: number; lane: number; target: number; v: number; vd: number; signal: number; moving: boolean;
  brake: boolean; honk: number; next: number; stopped: boolean; car: Car; plate: string; taxi: string | null; len: number;
}

// ---------------------------------------------------------------- traffic

const PAINT = ["#f8fafc", "#f8fafc", "#e5e7eb", "#9ca3af", "#111827", "#1f2937", "#1e3a8a", "#7f1d1d", "#d6d3d1"];
const TAXI_ROOFS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];
const EVERYDAY = CARS.cars.filter((c) => !("low" in c) || !c.low) as Car[];
/** The speed a driver wants in each lane: faster on the left, steadier on the right. */
const wantFor = (lane: number, seed: number) => 29.5 - lane * 2.3 + hash(seed, 9) * 2.5;

function trafficCar(i: number): Pick<Ai, "car" | "plate" | "taxi" | "len"> {
  const taxi = hash(i, 2) < 0.22;
  const base = taxi ? (CARS.cars.find((c) => c.id === "toyota-camry") as Car) : EVERYDAY[Math.floor(hash(i, 3) * EVERYDAY.length)];
  const car = { ...base, color: taxi ? "#efe3c8" : PAINT[Math.floor(hash(i, 4) * PAINT.length)] } as Car;
  const plate = `${String.fromCharCode(65 + Math.floor(hash(i, 5) * 26))} ${String(Math.floor(hash(i, 6) * 99999)).padStart(5, "0")}`;
  return { car, plate, taxi: taxi ? TAXI_ROOFS[Math.floor(hash(i, 7) * TAXI_ROOFS.length)] : null, len: carLength(car) };
}

function makeTraffic(): Ai[] {
  return Array.from({ length: 16 }, (_, i) => {
    const lane = i % 5;
    let p = -70 + Math.floor(i / 5) * 95 + hash(i, 1) * 45 + lane * 11;
    // Leave room around where you pull out (the right-hand lane).
    if (lane >= 3 && Math.abs(p) < 30) p += 60;
    const vd = wantFor(lane, i);
    return { p, x: laneX(lane), lane, target: lane, v: vd * 0.9, vd, signal: 0, moving: false, brake: false, honk: 0, next: hash(i, 8) * 2, stopped: false, ...trafficCar(i) };
  });
}

/** Brake lights and indicators on a car (rear at +z, its right side at +x): children 0 brake, 1 left, 2 right. */
function Lamps({ len, high }: { len: number; high?: boolean }) {
  const red = <meshStandardMaterial color="#b91c1c" emissive="#ff0000" emissiveIntensity={1.6} />;
  const amber = <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.2} />;
  const y = high ? 1.0 : 0.8;
  return (
    <>
      <group visible={false}>{[-0.66, 0.66].map((x) => <mesh key={x} position={[x, y, len / 2 + 0.03]}><boxGeometry args={[0.3, 0.09, 0.03]} />{red}</mesh>)}</group>
      {[-1, 1].map((side) => (
        <group key={side} visible={false}>
          <mesh position={[side * 0.86, y - 0.04, len / 2 + 0.03]}><boxGeometry args={[0.14, 0.08, 0.03]} />{amber}</mesh>
          <mesh position={[side * 0.86, y - 0.1, -len / 2 - 0.03]}><boxGeometry args={[0.14, 0.08, 0.03]} />{amber}</mesh>
        </group>
      ))}
    </>
  );
}
function setLamps(g: THREE.Object3D, brake: boolean, dir: number, blink: boolean) {
  g.children[1].visible = brake;
  g.children[2].visible = dir < 0 && blink;
  g.children[3].visible = dir > 0 && blink;
}

/** A car on the road: the model (turned to face -z, the way traffic goes), its lamps, a taxi's roof sign. */
function RoadCar({ ai }: { ai: Pick<Ai, "car" | "plate" | "taxi" | "len"> }) {
  return (
    <group>
      <group rotation={[0, Math.PI, 0]}>
        <CarModel car={ai.car} plate={ai.plate} />
        {ai.taxi && <mesh position={[0, 1.5, 0.1]}><boxGeometry args={[0.75, 0.2, 0.28]} /><meshStandardMaterial color={ai.taxi} emissive={ai.taxi} emissiveIntensity={0.4} /></mesh>}
      </group>
      <Lamps len={ai.len} high={ai.car.suv} />
    </group>
  );
}

// ---------------------------------------------------------------- roadside

function signTexture(lines: Array<{ text: string; size: number; color?: string }>, bg: string, w = 512, h = 256, stripe?: string) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (stripe) { g.fillStyle = stripe; g.fillRect(0, h - h * 0.14, w, h * 0.14); }
  g.textAlign = "center"; g.textBaseline = "middle";
  const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
  let y = (h - (stripe ? h * 0.14 : 0)) / 2 - total / 2;
  for (const l of lines) { g.fillStyle = l.color ?? "#ffffff"; g.font = `900 ${l.size}px sans-serif`; g.fillText(l.text, w / 2, y + l.size * 0.6); y += l.size * 1.15; }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Something beside the road at route position p (it scrolls past as you drive). */
function AtP({ simRef, p, children }: { simRef: React.RefObject<Sim>; p: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.position.z = simRef.current.s - p; });
  return <group ref={g}>{children}</group>;
}

function SpeedSign() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#dc2626"; g.lineWidth = 14; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#111827"; g.font = "900 46px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(DR.speedLimit), 64, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group position={[ROAD_EDGE + 1.2, 0, 0]}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.05, 3.2, 8]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} /></mesh>
      <mesh position={[0, 3.4, 0.03]}><circleGeometry args={[0.6, 32]} /><meshStandardMaterial map={tex} transparent /></mesh>
    </group>
  );
}

/** A speed camera on its pole, flashing white when it catches someone. */
function Radar({ flashRef }: { flashRef: React.RefObject<number> }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => { if (light.current) light.current.intensity = flashRef.current * 220; });
  return (
    <group position={[ROAD_EDGE + 1.5, 0, 0]}>
      <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[0.09, 0.12, 5.6, 10]} /><meshStandardMaterial color="#6b7280" metalness={0.6} /></mesh>
      <mesh position={[-0.2, 5.6, 0]}><boxGeometry args={[0.7, 0.55, 0.9]} /><meshStandardMaterial color="#d4d4d8" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[-0.2, 5.6, 0.46]}><circleGeometry args={[0.16, 16]} /><meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.1} /></mesh>
      <pointLight ref={light} position={[-1.5, 5.4, 2]} intensity={0} distance={30} color="#ffffff" />
    </group>
  );
}

/** The overhead sign for your exit. */
function ExitGantry({ name }: { name: string }) {
  const tex = useMemo(() => signTexture([{ text: "P  PARKING ↗", size: 54, color: "#fde047" }, { text: name.length > 22 ? `${name.slice(0, 21)}…` : name, size: 46 }], "#1d4ed8", 640, 220), [name]);
  const w = ROAD.half + 1.2;
  return (
    <group>
      {[ROAD.median / 2 + 0.3, ROAD_EDGE + 0.8].map((x) => <mesh key={x} position={[x, 4, 0]}><boxGeometry args={[0.45, 8, 0.45]} /><meshStandardMaterial color="#d1d5db" metalness={0.5} /></mesh>)}
      <mesh position={[ROAD.median / 2 + w / 2, 7.6, 0]}><boxGeometry args={[w, 0.4, 0.4]} /><meshStandardMaterial color="#d1d5db" metalness={0.5} /></mesh>
      <mesh position={[ROAD_EDGE - 5.2, 6.4, 0.25]}><planeGeometry args={[8.5, 2.9]} /><meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.15} /></mesh>
    </group>
  );
}

/** An ENOC station (with a ZOOM shop and an attendant) or a Tesla Supercharger, beside the road. */
function Station({ electric, filling }: { electric: boolean; filling: boolean }) {
  const fascia = useMemo(() => electric
    ? signTexture([{ text: "T  SUPERCHARGER", size: 70, color: "#e31937" }], "#18181b", 1024, 128)
    : signTexture([{ text: "ENOC", size: 86 }], "#0b4ea2", 1024, 128, "#16a34a"), [electric]);
  const pylon = useMemo(() => electric
    ? signTexture([{ text: "TESLA", size: 60, color: "#e31937" }, { text: "Supercharger", size: 40 }, { text: `AED ${CARS.fuel.chargePerKwh.toFixed(2)} / kWh`, size: 36, color: "#fde047" }], "#18181b", 320, 420)
    : signTexture([{ text: "ENOC", size: 74 }, { text: "SPECIAL 95", size: 36 }, { text: CARS.fuel.petrolPerLitre.toFixed(2), size: 70, color: "#fde047" }], "#0b4ea2", 320, 420, "#16a34a"), [electric]);
  const shop = useMemo(() => signTexture([{ text: electric ? "Lounge" : "ZOOM", size: 90, color: electric ? "#ffffff" : "#ef4444" }], electric ? "#27272a" : "#ffffff", 512, 160), [electric]);
  const attendant = LOCALS[7 % LOCALS.length].look;
  return (
    <group>
      {/* the forecourt, over the pavement */}
      <mesh position={[ROAD_EDGE + 10, 0.09, 0]} receiveShadow><boxGeometry args={[20, 0.18, 64]} /><meshStandardMaterial color={electric ? "#52525b" : "#71717a"} roughness={0.85} /></mesh>
      {/* the canopy on four columns, lit underneath */}
      {[[-5, -9], [5, -9], [-5, 9], [5, 9]].map(([dx, dz], i) => <mesh key={i} position={[PUMP_X + 2 + dx, 2.7, dz]}><boxGeometry args={[0.45, 5.4, 0.45]} /><meshStandardMaterial color="#e5e7eb" /></mesh>)}
      <mesh position={[PUMP_X + 2, 5.6, 0]}><boxGeometry args={[12, 0.7, 22]} /><meshStandardMaterial color={electric ? "#27272a" : "#f8fafc"} emissive={electric ? "#000" : "#ffffff"} emissiveIntensity={0.08} /></mesh>
      <mesh position={[PUMP_X + 2 - 6.02, 5.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[22, 0.7]} /><meshStandardMaterial map={fascia} emissive="#ffffff" emissiveMap={fascia} emissiveIntensity={0.35} /></mesh>
      <pointLight position={[PUMP_X + 1, 4.8, 0]} intensity={60} distance={20} color="#f8fafc" />
      {electric ? (
        // charging stalls: slim white posts with a red light strip, a cable to your car's port
        [-6, -2, 2, 6].map((z) => (
          <group key={z} position={[PUMP_X - 1.7, 0, z + 2.4]}>
            <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.28, 1.6, 0.22]} /><meshStandardMaterial color="#f4f4f5" metalness={0.3} roughness={0.3} /></mesh>
            <mesh position={[0.15, 1.1, 0]}><boxGeometry args={[0.02, 0.9, 0.06]} /><meshStandardMaterial color="#e31937" emissive="#e31937" emissiveIntensity={2} /></mesh>
          </group>
        ))
      ) : (
        // the pump island beside the car, and another across from it
        [PUMP_X + 2.3, PUMP_X + 7.3].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.9, 0.25, 7]} /><meshStandardMaterial color="#d4d4d8" /></mesh>
            {[-1.5, 1.5].map((z) => (
              <group key={z} position={[0, 0, z]}>
                <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.6, 1.9, 0.9]} /><meshStandardMaterial color="#0b4ea2" /></mesh>
                <mesh position={[-0.31, 1.55, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.6, 0.35]} /><meshStandardMaterial color="#86efac" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>
                <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.62, 0.18, 0.92]} /><meshStandardMaterial color="#16a34a" /></mesh>
              </group>
            ))}
          </group>
        ))
      )}
      {/* the hose or the cable to your car while it fills */}
      {filling && (electric
        ? <mesh position={[PUMP_X - 1.3, 0.85, 1.9]} rotation={[0, 0, Math.PI / 2.4]}><cylinderGeometry args={[0.035, 0.035, 0.9, 6]} /><meshStandardMaterial color="#18181b" /></mesh>
        : <mesh position={[PUMP_X + 1.55, 1.0, 1.35]} rotation={[0, 0, Math.PI / 2.6]}><cylinderGeometry args={[0.04, 0.04, 1.4, 6]} /><meshStandardMaterial color="#111827" /></mesh>)}
      {!electric && (
        <group position={[PUMP_X + 1.55, 0, filling ? 2.0 : 3.6]} rotation={[0, filling ? -Math.PI / 2 : -Math.PI * 0.8, 0]}>
          <Suspense fallback={null}><CitizenAvatar look={attendant} animation={filling ? "talk" : "idle"} /></Suspense>
        </group>
      )}
      {/* someone else filling up across the way */}
      <group position={[PUMP_X + 4.9, 0, -1]} rotation={[0, Math.PI, 0]}>
        <CarModel car={{ ...(CARS.cars.find((c) => c.id === (electric ? "tesla-model-y" : "toyota-land-cruiser")) as Car), color: electric ? "#111827" : "#f8fafc" }} plate="K 41077" />
      </group>
      {/* the shop */}
      <mesh position={[PUMP_X + 13.5, 2.2, 6]}><boxGeometry args={[7, 4.4, 16]} /><meshStandardMaterial color={electric ? "#3f3f46" : "#f1f5f9"} /></mesh>
      <mesh position={[PUMP_X + 9.98, 1.6, 6]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[13, 2.6]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.1} emissive="#fde68a" emissiveIntensity={0.15} /></mesh>
      <mesh position={[PUMP_X + 9.97, 3.6, 6]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[4.5, 1.2]} /><meshStandardMaterial map={shop} emissive="#ffffff" emissiveMap={shop} emissiveIntensity={0.3} /></mesh>
      {/* the price pylon by the road */}
      <group position={[ROAD_EDGE + 1.8, 0, -24]}>
        <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.3, 5, 0.3]} /><meshStandardMaterial color="#d4d4d8" /></mesh>
        <mesh position={[0, 5.6, 0.02]}><boxGeometry args={[2.4, 3.2, 0.3]} /><meshStandardMaterial color="#0f172a" /></mesh>
        <mesh position={[0, 5.6, 0.18]}><planeGeometry args={[2.3, 3.0]} /><meshStandardMaterial map={pylon} emissive="#ffffff" emissiveMap={pylon} emissiveIntensity={0.3} /></mesh>
      </group>
    </group>
  );
}

/** Which bays are taken by Locals' cars at this destination (the same each visit), always leaving three free. */
function takenBays(name: string) {
  let seed = 0;
  for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  const taken = new Set<number>();
  for (let i = 0; i < LOT.bays; i++) if (hash(seed, i) < 0.55 && taken.size < LOT.bays - 3) taken.add(i);
  return taken;
}
export const zoneOf = (name: string) => { let n = 0; for (const ch of name) n = (n * 17 + ch.charCodeAt(0)) % 997; return `${100 + (n % 800)}${"ABCDF"[n % 5]}`; };

/** The destination's car park: tarmac off the road, marked bays with wheel stops, Locals' cars, the RTA meter,
    the blue P sign, and the place itself behind. */
function CarPark({ name, taken }: { name: string; taken: Set<number> }) {
  const pSign = useMemo(() => signTexture([{ text: "P", size: 150 }, { text: `Zone ${zoneOf(name)}`, size: 34 }], "#1d4ed8", 256, 300), [name]);
  const facade = useMemo(() => signTexture([{ text: name.length > 26 ? `${name.slice(0, 25)}…` : name, size: 54 }], "#0f172a", 1024, 128), [name]);
  const meter = useMemo(() => signTexture([{ text: "RTA", size: 40, color: "#ef4444" }, { text: "PARKING", size: 26 }, { text: `AED ${CARS.parking.perHour}/hr`, size: 26, color: "#fde047" }], "#1f2937", 160, 200), []);
  const len = LOT.x1 - ROAD_EDGE;
  return (
    <group>
      <mesh position={[ROAD_EDGE + len / 2, 0.09, 0]} receiveShadow><boxGeometry args={[len, 0.18, LOT.half * 2]} /><meshStandardMaterial color="#4b5563" roughness={0.9} /></mesh>
      {/* the bay lines and the line across the back */}
      {Array.from({ length: LOT.bays + 1 }, (_, i) => (
        <mesh key={i} position={[BAY_CX, 0.19, bayZ(i) - LOT.bayW / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[LOT.bayX1 - LOT.bayX0, 0.13]} /><meshBasicMaterial color="#f8fafc" /></mesh>
      ))}
      <mesh position={[LOT.bayX1, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.13, LOT.bays * LOT.bayW]} /><meshBasicMaterial color="#f8fafc" /></mesh>
      {Array.from({ length: LOT.bays }, (_, i) => (
        <group key={i} position={[0, 0, bayZ(i)]}>
          {/* wheel stop */}
          <mesh position={[LOT.bayX1 - 0.6, 0.26, 0]}><boxGeometry args={[0.22, 0.14, 1.7]} /><meshStandardMaterial color="#facc15" /></mesh>
          {taken.has(i) ? (
            <group position={[BAY_CX, 0.18, 0]} rotation={[0, Math.PI / 2, 0]}><CarModel car={trafficCar(i + 70).car} plate={trafficCar(i + 70).plate} /></group>
          ) : (
            <mesh position={[BAY_CX, 0.195, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[LOT.bayX1 - LOT.bayX0 - 0.3, LOT.bayW - 0.3]} /><meshBasicMaterial color="#22c55e" transparent opacity={0.22} /></mesh>
          )}
        </group>
      ))}
      {/* low walls at the ends and the back */}
      {[-1, 1].map((k) => <mesh key={k} position={[ROAD_EDGE + 4 + (len - 4) / 2, 0.45, k * LOT.half]}><boxGeometry args={[len - 4, 0.9, 0.35]} /><meshStandardMaterial color="#d6d3d1" /></mesh>)}
      <mesh position={[LOT.x1, 0.45, 0]}><boxGeometry args={[0.35, 0.9, LOT.half * 2]} /><meshStandardMaterial color="#d6d3d1" /></mesh>
      {/* the RTA meter and the P sign */}
      <group position={[LOT.bayX0 - 1.2, 0.18, bayZ(0) - LOT.bayW - 1]}>
        <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.12, 1.2, 0.12]} /><meshStandardMaterial color="#6b7280" /></mesh>
        <mesh position={[0, 1.45, 0]}><boxGeometry args={[0.5, 0.7, 0.35]} /><meshStandardMaterial color="#1f2937" /></mesh>
        <mesh position={[-0.26, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.32, 0.4]} /><meshStandardMaterial map={meter} emissive="#ffffff" emissiveMap={meter} emissiveIntensity={0.4} /></mesh>
      </group>
      <group position={[ROAD_EDGE + 1.6, 0, -LOT.half + 2]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.06, 0.06, 3.2, 8]} /><meshStandardMaterial color="#9ca3af" /></mesh>
        <mesh position={[0, 3.4, 0.04]}><planeGeometry args={[0.9, 1.05]} /><meshStandardMaterial map={pSign} emissive="#ffffff" emissiveMap={pSign} emissiveIntensity={0.25} /></mesh>
      </group>
      {/* the place */}
      <mesh position={[LOT.x1 + 7, 6, 0]}><boxGeometry args={[12, 12, 40]} /><meshStandardMaterial color="#e7e1d6" /></mesh>
      <mesh position={[LOT.x1 + 0.98, 7.5, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[18, 2.2]} /><meshStandardMaterial map={facade} emissive="#ffffff" emissiveMap={facade} emissiveIntensity={0.5} /></mesh>
      <mesh position={[LOT.x1 + 0.97, 2, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[14, 3.4]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.1} emissive="#fde68a" emissiveIntensity={0.2} /></mesh>
      {[-12, 0, 12].map((z) => <pointLight key={z} position={[ROAD_EDGE + 12, 7, z]} intensity={45} distance={22} color="#fff1d6" />)}
    </group>
  );
}

// ---------------------------------------------------------------- the drive

interface Events {
  onPhase: (p: Phase) => void;
  onHud: (kmh: number, s: number, park: { bay: number; stopped: boolean; onLot: boolean; reverse: boolean }) => void;
  onCrash: () => void;
  onPark: () => void;
  onBump: () => void;
  onRadar: (caught: boolean) => void;
  onHonk: () => void;
}

function Drive({ d, length, stationAt, radars, simRef, flashRef, ev, sky, taken }: {
  d: Drivable; length: number; stationAt: number | null; radars: number[]; simRef: React.RefObject<Sim>; flashRef: React.RefObject<number>; ev: Events; sky: Sky; taken: Set<number>;
}) {
  const traffic = useMemo(() => makeTraffic(), []);
  const oncoming = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ lane: 5 + (i % 5), p: -60 + i * 33 + hash(i, 11) * 20, v: -(22 + hash(i, 12) * 8), ...trafficCar(i + 40) })), []);
  const ours = useRef<THREE.Group>(null);
  const theirs = useRef<THREE.Group>(null);
  const me = useRef<THREE.Group>(null);
  const last = useRef(0);
  const tick = useRef(0);
  const beepAt = useRef(0);
  const bumpAt = useRef(-9);
  const myLen = carLength(d.car);
  const vmax = (Math.min(d.car.top, 250) / 3.6) * 0.8;
  const accel = d.car.low ? 8.5 : d.car.electric ? 7.5 : d.car.suv ? 5 : 6;
  const look = useRef(new THREE.Vector3());
  const debris = useRef<THREE.Group>(null);
  const bits = useMemo(() => Array.from({ length: 16 }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: 0 })), []);

  useFrame(({ clock, camera: cam }, rawDt) => {
    const camera = cam as THREE.PerspectiveCamera;
    const dt = Math.min(rawDt, 0.05);
    const S = simRef.current;
    const setPhase = (p: Phase) => { S.phase = p; S.t = 0; ev.onPhase(p); };
    S.t += dt;
    let lat = 0;
    /** Sideways speed to steer towards x, at most `rate` m/s. */
    const toward = (x: number, rate: number) => { const dx = x - S.x; return Math.sign(dx) * Math.min(Math.abs(dx) / dt, rate); };

    // ---- you
    switch (S.phase) {
      case "drive": {
        S.v = S.gas ? S.v + accel * (1 - S.v / vmax) * dt : S.brake ? S.v - 10 * dt : S.v - (0.5 + S.v * 0.012) * dt;
        if (Math.abs(S.steer) > 0.04) lat = S.steer * Math.min(4.4, 0.6 + S.v * 0.2);
        else {
          // Let go of the wheel and it settles into the nearest lane.
          const lane = Math.max(0, Math.min(4, Math.round((S.x - ROAD.median / 2) / ROAD.laneW - 0.5)));
          if (S.v > 1) lat = toward(laneX(lane), 1.2);
        }
        if (stationAt !== null && S.s > stationAt - 140 && S.s < stationAt) setPhase("station");
        if (S.s > length - PARK_FROM) { S.z = 0; S.h = lat / Math.max(S.v, 3); setPhase("park"); ev.onPark(); }
        break;
      }
      case "station": {
        // Over to the right-hand lane, then off the road and onto the forecourt, stopping at the pump.
        const left = stationAt! - S.s;
        S.v = Math.min(S.v + 2 * dt, Math.sqrt(2 * 3.2 * Math.max(0, left)), 22);
        lat = toward(left > 50 ? laneX(4) : PUMP_X, left > 50 ? 1.5 : 3);
        if (left < 0.4 && S.v < 0.4) { S.v = 0; setPhase("fill"); }
        break;
      }
      case "fill": S.v = 0; if (S.t > 4.6) setPhase("leave"); break;
      case "leave": {
        S.v = Math.min(16, S.v + 3.5 * dt);
        if (S.s > stationAt! + 10) lat = toward(laneX(4), 2.2);
        if (Math.abs(S.x - laneX(4)) < 0.1) setPhase("drive");
        break;
      }
      case "park": {
        // Free steering at parking speeds: the gas pulls forward, the brake slows and then reverses.
        if (S.gas) S.v = S.v < -0.2 ? S.v + 8 * dt : Math.min(10, S.v + 3.4 * dt);
        else if (S.brake) S.v = S.v > 0.2 ? S.v - 9 * dt : Math.max(-3.5, S.v - 2.6 * dt);
        else S.v -= Math.sign(S.v) * Math.min(Math.abs(S.v), (S.v > 6 ? 1.2 : 2.6) * dt);
        break;
      }
      case "crash": S.v = Math.sign(S.v) * Math.max(0, Math.abs(S.v) - 24 * dt); break;
      default: S.v = 0;
    }
    if (S.phase !== "park" && S.phase !== "crash") S.v = Math.max(0, Math.min(vmax, S.v));
    // In the car park: a bicycle model (the front wheels turn up to 35°), and you can't go through walls or cars.
    const lotZ = S.s - length;
    const corners = (x: number, z: number, h: number, hl: number, hw: number) => {
      const fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
      return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [x + fx * hl * a + rx * hw * b, z + fz * hl * a + rz * hw * b]);
    };
    const parkedHit = (x: number, z: number) => [...taken].some((i) => Math.abs(x - BAY_CX) < 2.4 && Math.abs(z - (lotZ + bayZ(i))) < 1.0);
    const allowed = (x: number, z: number) => {
      const zl = z - lotZ;
      if (x < MIN_X - 0.3) return false;
      if (x <= ROAD_EDGE - 0.2) return zl > -LOT.half - 60 && z < 30;
      if (x > LOT.x1 - 0.3 || Math.abs(zl) > LOT.half - 0.3) return false;
      // the walls at the ends run from just off the road
      return !(Math.abs(zl) > LOT.half - 0.6 && x > ROAD_EDGE + 4);
    };
    if (S.phase === "park" || (S.phase === "crash" && S.z !== 0)) {
      const h = S.h + (S.v / 2.8) * Math.tan(S.steer * 0.62) * dt;
      const nx = S.x + S.v * Math.sin(h) * dt, nz = S.z - S.v * Math.cos(h) * dt;
      const fits = (x: number, z: number, hh: number) => corners(x, z, hh, myLen / 2, 0.95).every(([cx, cz]) => allowed(cx, cz) && !parkedHit(cx, cz));
      const hitCar = corners(nx, nz, h, myLen / 2, 0.95).some(([x, z]) => parkedHit(x, z));
      if (fits(nx, nz, h)) { S.x = nx; S.z = nz; S.h = h; }
      else if (S.phase === "park") {
        if (hitCar && Math.abs(S.v) > 4.5) {
          S.shake = 1; crash();
          bits.forEach((b) => { b.pos.set(nx, 0.8, nz); b.vel.set((Math.random() - 0.5) * 7, 2 + Math.random() * 4, (Math.random() - 0.5) * 7); b.spin = Math.random() * 12; });
          setPhase("crash"); ev.onCrash();
        } else if (!hitCar && fits(S.x, nz, S.h)) {
          // Scraping along a kerb or wall: you slide along it, slower.
          S.z = nz; S.v *= 1 - dt * 2.5; S.shake = Math.max(S.shake, 0.08);
        } else {
          if (Math.abs(S.v) > 1.2 && clock.elapsedTime - bumpAt.current > 2) { bumpAt.current = clock.elapsedTime; S.shake = 0.25; ev.onBump(); }
          S.v = 0;
        }
      }
      // Parking sensors: beeping faster the closer the nearest car or wall is.
      let near = 9;
      for (const [x, z] of corners(S.x, S.z, S.h, myLen / 2 + 0.1, 1.05)) {
        for (let r = 0.25; r <= 2; r += 0.25) {
          const fx = S.v >= 0 ? Math.sin(S.h) : -Math.sin(S.h), fz = S.v >= 0 ? -Math.cos(S.h) : Math.cos(S.h);
          if (!allowed(x + fx * r, z + fz * r) || parkedHit(x + fx * r, z + fz * r)) { near = Math.min(near, r); break; }
        }
      }
      S.sensor = near;
      if (S.phase === "park" && Math.abs(S.v) > 0.05 && near < 2 && clock.elapsedTime - beepAt.current > Math.max(0.07, near * 0.32)) { beepAt.current = clock.elapsedTime; sensorBeep(); }
      // Which free bay you're in: all four corners inside its lines, and straight (within 15°) in either direction.
      S.bay = -1;
      if (Math.abs(Math.sin(S.h)) > 0.966) {
        const inside = corners(S.x, S.z, S.h, myLen / 2, 0.92);
        for (let i = 0; i < LOT.bays; i++) {
          if (taken.has(i)) continue;
          const z0 = lotZ + bayZ(i);
          if (inside.every(([x, z]) => x > LOT.bayX0 - 0.15 && x < LOT.bayX1 + 0.15 && Math.abs(z - z0) < LOT.bayW / 2 + 0.05)) { S.bay = i; break; }
        }
      }
    }
    S.x += lat * dt;
    if (S.phase === "drive") {
      if (S.x < MIN_X || S.x > MAX_X) { S.v *= 1 - dt * 1.5; S.shake = Math.max(S.shake, 0.15); }
      S.x = Math.max(MIN_X, Math.min(MAX_X, S.x));
    }
    S.lat = lat;
    if (S.phase !== "park" && S.phase !== "parked" && S.z === 0) S.s += S.v * dt;
    /** Where you are along the road (in the car park you move; the road doesn't). */
    const myP = S.s - S.z;

    // Speed cameras: caught over 120 means a fine.
    if (S.radarIdx < radars.length && S.s >= radars[S.radarIdx]) {
      const caught = S.v > RADAR;
      if (caught) { S.speeding = true; flashRef.current = 1; }
      S.radarIdx++;
      ev.onRadar(caught);
    }
    flashRef.current = Math.max(0, flashRef.current - dt * 3);

    // ---- everyone else (our side of the road)
    const occupies = (o: { x: number; target: number; signal: number; moving: boolean }, tx: number) =>
      Math.abs(o.x - tx) < WIDE || ((o.signal > 0 || o.moving) && Math.abs(laneX(o.target) - tx) < 0.1);
    const offRoad = S.x > MAX_X + 1.5;
    const safe = (c: Ai, lane: number) => {
      const tx = laneX(lane);
      const room = (op: number, ov: number) => {
        const gap = op - c.p;
        return gap >= 0 ? gap - 4.8 > Math.max(12, (c.v - ov) * 2.5 + 10) : -gap - 4.8 > Math.max(9, (ov - c.v) * 3 + 7);
      };
      for (const o of traffic) if (o !== c && occupies(o, tx) && !room(o.p, o.v)) return false;
      if (!offRoad && Math.abs(S.x - tx) < WIDE + 0.3 && !room(myP, S.v)) return false;
      return true;
    };
    const blink = Math.floor(clock.elapsedTime * 3) % 2 === 0;
    traffic.forEach((c, i) => {
      // Who's in front: the nearest car ahead in this lane, or you.
      let gap = Infinity, lv = 0, you = false;
      for (const o of traffic) {
        if (o === c || o.p <= c.p || !occupies(o, c.x)) continue;
        const g = o.p - c.p - (o.len + c.len) / 2;
        if (g < gap) { gap = g; lv = o.v; }
      }
      // You count as in their lane a little sooner when you're indicating towards it: they let you in.
      const reach = Math.abs(S.steer) > 0.15 && Math.sign(c.x - S.x) === Math.sign(S.steer) ? 3.6 : WIDE;
      if (!offRoad && myP > c.p && Math.abs(S.x - c.x) < reach) {
        const g = myP - c.p - (myLen + c.len) / 2;
        if (g < gap) { gap = g; lv = S.v; you = true; }
      }
      // A gentle car-following model: cruise at the speed they like, keep about 1.3 s behind, brake smoothly.
      const a = 2.2, b = 3;
      const want = 3 + c.v * 1.3 + (c.v * (c.v - lv)) / (2 * Math.sqrt(a * b));
      let acc = a * (1 - (c.v / c.vd) ** 4 - (gap === Infinity ? 0 : (Math.max(0, want) / Math.max(gap, 0.1)) ** 2));
      acc = Math.max(-9, Math.min(a, acc));
      if (c.stopped) { c.v = 0; acc = -9; }
      c.v = Math.max(0, c.v + acc * dt);
      c.brake = acc < -1.2 || c.v < 0.5;
      c.honk -= dt;
      if (you && acc < -4.5 && c.honk <= 0 && (S.phase === "drive" || S.phase === "park")) { c.honk = 8; horn(); ev.onHonk(); }

      // Changing lanes: blocked by someone slower (try the left first), or moving back right when it's clear.
      c.next -= dt;
      if (!c.stopped && !c.moving && c.signal <= 0 && c.next <= 0) {
        c.next = 0.7 + Math.random() * 0.9;
        const blocked = gap < 45 && lv < c.vd - 2.5;
        const options = blocked ? [c.lane - 1, c.lane + 1] : c.lane < 4 && Math.random() < 0.1 ? [c.lane + 1] : [];
        for (const l of options) if (l >= 0 && l <= 4 && safe(c, l)) { c.target = l; c.signal = 1.5; break; }
      }
      if (c.signal > 0) {
        c.signal -= dt;
        if (!safe(c, c.target)) { c.signal = 0; c.target = c.lane; }
        else if (c.signal <= 0) c.moving = true;
      }
      let clat = 0;
      if (c.moving) {
        const dx = laneX(c.target) - c.x;
        clat = Math.sign(dx) * Math.min(Math.abs(dx) / dt, 1.5);
        c.x += clat * dt;
        if (Math.abs(dx) < 0.02) { c.x = laneX(c.target); c.lane = c.target; c.moving = false; }
      }
      c.p += c.v * dt;

      // Out of sight behind or far ahead: back into the traffic somewhere with room.
      const rel = c.p - S.s;
      if ((rel < -90 || rel > 280) && !c.stopped) {
        const ahead = rel < 0;
        for (let k = 0; k < 6; k++) {
          const lane = Math.floor(Math.random() * 5);
          const p = S.s + (ahead ? 230 + Math.random() * 40 : -80 - Math.random() * 8);
          if (traffic.every((o) => o === c || Math.abs(o.x - laneX(lane)) > WIDE || Math.abs(o.p - p) > 28)) {
            Object.assign(c, { p, lane, target: lane, x: laneX(lane), signal: 0, moving: false, vd: wantFor(lane, i + Math.random() * 99) });
            c.v = c.vd * (ahead ? 0.85 : 1);
            break;
          }
        }
      }

      // You hit them (or they had nowhere to go).
      if ((S.phase === "drive" || S.phase === "park") && Math.abs(c.x - S.x) < 1.85 && Math.abs(c.p - myP) < (c.len + myLen) / 2 - 0.15) {
        c.stopped = true;
        S.shake = 1;
        // Glass and bits of bumper fly from where you touched.
        const at = new THREE.Vector3((c.x + S.x) / 2, 0.8, (S.s - c.p + S.z) / 2);
        bits.forEach((b) => { b.pos.copy(at); b.vel.set((Math.random() - 0.5) * 9, 2 + Math.random() * 5, (Math.random() - 0.5) * 9); b.spin = Math.random() * 12; });
        setPhase("crash");
        crash();
        ev.onCrash();
      }

      const g = ours.current?.children[i];
      if (g) {
        g.position.set(c.x, 0, S.s - c.p);
        g.rotation.y = -clat / Math.max(c.v, 3);
        setLamps(g, c.brake, c.signal > 0 || c.moving ? Math.sign(c.target - c.lane) : c.stopped ? 2 : 0, blink);
        if (c.stopped) { g.children[2].visible = g.children[3].visible = blink; }
      }
    });
    // Debris: thrown up, falling and bouncing on the tarmac (fixed to the road, so it slides back as you roll on).
    bits.forEach((b, i) => {
      const m = debris.current?.children[i];
      if (!m || b.spin === 0) return;
      b.vel.y -= 18 * dt;
      b.pos.addScaledVector(b.vel, dt);
      if (S.z === 0) b.pos.z += S.v * dt;
      if (b.pos.y < 0.03) { b.pos.y = 0.03; b.vel.multiplyScalar(0.4); b.vel.y = Math.abs(b.vel.y) * 0.3; }
      m.position.copy(b.pos);
      m.rotation.x += b.spin * dt; m.rotation.z += b.spin * 0.7 * dt;
      m.visible = true;
    });
    // The other side of the road streams past.
    oncoming.forEach((c, i) => {
      c.p += c.v * dt;
      if (c.p - S.s < -80) c.p += 420;
      if (c.p - S.s > 340) c.p -= 420;
      const g = theirs.current?.children[i];
      if (g) g.position.set(laneX(c.lane), 0, S.s - c.p);
    });

    // ---- your car, its lamps and the indicator ticking
    if (me.current) {
      // Up the kerb onto the forecourt at the station.
      me.current.position.set(S.x, S.x > ROAD_EDGE - 0.6 ? 0.18 : 0, S.z);
      me.current.rotation.y = S.phase === "park" || S.phase === "parked" || S.z !== 0 ? -S.h : -lat / Math.max(S.v, 3);
      const dir = S.phase === "crash" ? 2 : S.phase === "station" ? 1 : S.phase === "leave" ? -1 : S.phase === "parked" ? 0 : Math.abs(S.steer) > 0.15 ? Math.sign(S.steer) : 0;
      setLamps(me.current, S.brake || S.phase === "station" || Math.abs(S.v) < 0.3, dir, blink);
      if (dir === 2) { me.current.children[2].visible = me.current.children[3].visible = blink; }
      if (dir && Math.floor(clock.elapsedTime * 3) !== tick.current) { tick.current = Math.floor(clock.elapsedTime * 3); indicatorTick(); }
    }
    // The engine: revs climbing through the gears (or an electric car's hum on the road noise).
    const k = Math.abs(S.v) / vmax;
    const off = S.phase === "crash" || S.phase === "parked";
    setLoopSpeed("engine", off ? 0 : 0.25 + ((k * 5) % 1) * 0.55 + k * 0.2);
    setLoopSpeed("road", off ? 0 : k);

    // ---- the camera
    const shake = S.shake > 0 ? (Math.random() - 0.5) * S.shake * 0.6 : 0;
    S.shake = Math.max(0, S.shake - dt * 1.2);
    let pos: THREE.Vector3, at: THREE.Vector3;
    if (S.phase === "fill") {
      // A slow turn round the car at the pump.
      const ang = -0.9 + S.t * 0.28;
      pos = new THREE.Vector3(S.x + Math.sin(ang) * 8.5, 3.2, Math.cos(ang) * 8.5); at = new THREE.Vector3(S.x + 0.6, 1, 0);
    } else if (S.phase === "crash") {
      pos = new THREE.Vector3(S.x - 6, 3.2, S.z + 7); at = new THREE.Vector3(S.x, 0.8, S.z - 2);
    } else if (S.phase === "park" || S.phase === "parked") {
      // Behind the car whichever way it's facing, high enough to see the lines; or straight down from above.
      const fx = Math.sin(S.h), fz = -Math.cos(S.h);
      if (S.view === "far") { pos = new THREE.Vector3(S.x - fx * 2.5, 22, S.z - fz * 2.5 + 0.01); at = new THREE.Vector3(S.x + fx * 1.5, 0, S.z + fz * 1.5); }
      else { pos = new THREE.Vector3(S.x - fx * 7.5, 5.6, S.z - fz * 7.5); at = new THREE.Vector3(S.x + fx * 4, 0.4, S.z + fz * 4); }
    } else if (S.view === "far") {
      pos = new THREE.Vector3(S.x * 0.7 + 3, 12, 17); at = new THREE.Vector3(S.x * 0.8, 0, -16);
    } else {
      pos = new THREE.Vector3(S.x - lat * 0.25, 3.5 + S.v * 0.01, 9.6 + S.v * 0.06); at = new THREE.Vector3(S.x + lat * 0.4, 0.9, -14);
    }
    camera.position.lerp(pos, Math.min(1, dt * (S.phase === "fill" ? 1.5 : 3)));
    camera.position.add(new THREE.Vector3(shake, shake * 0.5, 0));
    look.current.lerp(at, Math.min(1, dt * 4));
    camera.lookAt(look.current);
    const fov = 56 + Math.min(14, Math.abs(S.v) * 0.28);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix(); }

    if (clock.elapsedTime - last.current > 0.1) {
      last.current = clock.elapsedTime;
      ev.onHud(Math.abs(S.v) * 3.6, S.s - S.z, { bay: S.bay, stopped: Math.abs(S.v) < 0.3, onLot: S.x > ROAD_EDGE + 1, reverse: S.v < -0.05 });
    }
  });

  const night = sky === "night";
  return (
    <>
      <group ref={ours}>{traffic.map((c, i) => <RoadCar key={i} ai={c} />)}</group>
      <group ref={theirs}>{oncoming.map((c, i) => <group key={i}><CarModel car={c.car} plate={c.plate} /></group>)}</group>
      <group ref={debris}>
        {bits.map((_, i) => (
          <mesh key={i} visible={false}>
            <boxGeometry args={i % 3 ? [0.12, 0.03, 0.09] : [0.32, 0.06, 0.2]} />
            <meshStandardMaterial color={i % 3 ? "#cbd5e1" : d.car.color} metalness={i % 3 ? 0.9 : 0.5} roughness={0.15} transparent={i % 3 > 0} opacity={0.85} />
          </mesh>
        ))}
      </group>
      <group ref={me}>
        <group rotation={[0, Math.PI, 0]}><CarModel car={d.car} plate={d.plate} /></group>
        <Lamps len={myLen} high={d.car.suv} />
        {/* Street light on your car, and your headlights after dark. */}
        <pointLight position={[0, 4, 1]} intensity={30} distance={12} color="#fff3dc" />
        <pointLight position={[0, 2.6, 5.5]} intensity={sky === "day" ? 6 : 18} distance={9} color="#e0e7ff" />
        {night && <pointLight position={[0, 1.2, -8]} intensity={40} distance={26} color="#fff7e0" />}
      </group>
    </>
  );
}

// ---------------------------------------------------------------- the screen

/** Press and hold a pedal; it lets go when your thumb lifts or slides off. */
function Hold({ simRef, control, label, className, children }: {
  simRef: React.RefObject<Sim>; control: "gas" | "brake"; label: string; className: string; children: React.ReactNode;
}) {
  return (
    <button aria-label={label} className={className} onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); simRef.current[control] = true; }}
      onPointerUp={() => { simRef.current[control] = false; }}
      onPointerLeave={() => { simRef.current[control] = false; }}
      onPointerCancel={() => { simRef.current[control] = false; }}>
      {children}
    </button>
  );
}

export function DriveJourney({ drivables, metres, destination, look, balance, onArrive, onArrested, onCancel }: {
  drivables: Drivable[]; metres: number; destination: string; look?: AvatarLookProps; balance: number;
  onArrive: (d: Drivable) => void; onArrested: () => void; onCancel: () => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const [pick, setPick] = useState(0);
  const d = drivables[Math.min(pick, drivables.length - 1)];
  const length = Math.round(Math.min(DR.maxGameMetres, Math.max(DR.minGameMetres, metres * DR.gameScale)));
  const need = fuelFor(d.car, metres);
  const cost = refuelCost(d.car, d.fuel);
  const mustFill = d.fuel < need + 1;
  const [wantFill, setWantFill] = useState(false);
  const fill = (wantFill || mustFill) && cost > 0;
  const stationAt = fill ? STATION_P : null;
  const radars = useMemo(() => (length > 1100 ? [length * 0.42, length * 0.8] : [length * 0.6]), [length]);
  const sim = useRef<Sim>({ phase: "ready", s: 0, v: 0, x: laneX(4), lat: 0, steer: 0, gas: false, brake: false, t: 0, view: "chase", speeding: false, radarIdx: 0, shake: 0, z: 0, h: 0, bay: -1, sensor: 9 });
  const flash = useRef(0);
  const clear = useRef<Array<[number, number]>>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ kmh: 0, s: 0, bay: -1, stopped: true, onLot: false, reverse: false });
  const taken = useMemo(() => takenBays(destination), [destination]);
  const [parked, setParked] = useState<{ good: boolean; bay: number } | null>(null);
  const spoken = useRef(new Set<string>());
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "bad" | "good" } | null>(null);
  const [flashOn, setFlashOn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ fuel: number; fine: number; hours: number; cost: number; good: boolean } | null>(null);
  const [arrest, setArrest] = useState(false);
  const filled = phase === "leave" || (stationAt !== null && hud.s > STATION_P + 5);

  useEffect(() => { clear.current = stationAt !== null ? [[STATION_P - 35, STATION_P + 35]] : []; }, [stationAt]);
  useEffect(() => () => { stopLoops(); stopSpeech(); }, []);
  // The satnav: how far to go (in real metres) and a spoken heads-up as you get close.
  const toGo = Math.max(0, ((length - 15 - hud.s) / length) * metres);
  useEffect(() => {
    if (phase !== "drive") return;
    const say = (key: string, text: string) => {
      if (spoken.current.has(key)) return;
      spoken.current.add(key);
      void announce([{ text, lang: "en" }], undefined, "driver");
    };
    if (metres > 900 && toGo <= 500 && toGo > 200) say("500", `In 500 metres, ${destination} is on your right. Move into the right-hand lane.`);
    if (toGo <= 150) say("near", `${destination} is just ahead on the right. Slow down for the car park.`);
  }, [phase, toGo, metres, destination]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t); }, [msg]);
  useEffect(() => { if (!flashOn) return; const t = setTimeout(() => setFlashOn(0), 260); return () => clearTimeout(t); }, [flashOn]);
  // Keyboard: arrows or WASD, space to brake, H for the horn.
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const S = sim.current, k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") S.steer = on ? -1 : S.steer === -1 ? 0 : S.steer;
      else if (k === "arrowright" || k === "d") S.steer = on ? 1 : S.steer === 1 ? 0 : S.steer;
      else if (k === "arrowup" || k === "w") S.gas = on;
      else if (k === "arrowdown" || k === "s" || k === " ") S.brake = on;
      else if (k === "h" && on) horn();
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => set(e, true), up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const start = async () => {
    setError(null);
    if (fill) {
      if (balance < cost) { setError(`Filling up costs ${aed(cost)}. You don't have enough AED.`); return; }
      setBusy(true);
      const r = await refuel(d);
      setBusy(false);
      if (r.error) { setError(r.error); return; }
    }
    doorThud();
    if (!d.car.electric) startLoop("engine", 0.1);
    startLoop("road", 0.08);
    sim.current.phase = "drive";
    setPhase("drive");
  };
  const quit = () => {
    const S = sim.current;
    if (S.phase !== "ready") void finishDrive(d, (metres * S.s) / length, S.speeding);
    onCancel();
  };

  const ev: Events = {
    onPhase: setPhase,
    onHud: (kmh, s, park) => setHud({ kmh: Math.round(kmh), s, ...park }),
    onRadar: (caught) => {
      if (caught) { setFlashOn((n) => n + 1); setMsg({ text: `📸 Speed camera! Over ${DR.radarOver} km/h: ${aed(DR.speedingFine)} fine`, tone: "bad" }); }
      else setMsg({ text: "📸 Speed camera. You were within the limit 👍", tone: "good" });
    },
    onHonk: () => setMsg({ text: "📯 Beeep! Leave them a gap when you change lanes.", tone: "info" }),
    onCrash: () => {
      setMsg({ text: "💥 Crash!", tone: "bad" });
      setTimeout(async () => {
        const r = await carAccident(d);
        if (r.error) { setError(r.error); onCancel(); return; }
        stopLoops();
        setArrest(true);
      }, 2400);
    },
    onPark: () => {
      setMsg({ text: "🏁 You've arrived! Turn right into the car park.", tone: "good" });
      void announce([{ text: `You have arrived at ${destination}. Turn right into the car park, and park in a free bay.`, lang: "en" }], undefined, "driver");
    },
    onBump: () => setMsg({ text: "🚧 Bump! Careful: back off and try again.", tone: "info" }),
  };

  const switchOff = () => {
    const S = sim.current;
    S.phase = "parked"; S.v = 0; S.gas = S.brake = false;
    setPhase("parked");
    setParked({ good: S.bay >= 0, bay: S.bay });
    setLoopSpeed("engine", 0); setLoopSpeed("road", 0);
    doorThud();
  };
  const repark = () => { sim.current.phase = "park"; setPhase("park"); setParked(null); };
  /** Pay the meter for some hours (0: drive off without paying) and go in. */
  const pay = async (hours: number) => {
    if (!parked) return;
    setBusy(true); setError(null);
    const drove = await finishDrive(d, metres, sim.current.speeding);
    const r = await parkCar(d, destination, hours, parked.good);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    stopLoops();
    setSummary({ fuel: drove.data?.fuel ?? d.fuel, fine: drove.data?.fine ?? 0, hours, cost: r.data?.cost ?? 0, good: parked.good });
    setTimeout(() => onArrive(d), 3200);
  };

  if (arrest) return <ArrestScene look={look} story={accidentArrest(d.car, d.plate)} onDone={onArrested} />;

  const kmh = hud.kmh;
  const fuelNow = Math.max(0, (filled ? 100 : d.fuel) - need * Math.min(1, hud.s / length));
  const over = kmh > DR.speedLimit;
  const driving = phase === "drive" || phase === "park";
  const P = CARS.parking;
  const icon = d.car.electric ? "⚡" : "⛽";

  return (
    <div className="fixed inset-0 z-[180] bg-black select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ position: [laneX(4), 3, 8], fov: 56, near: 0.1, far: 900 }}>
        <SkyAndLight sky={sky} />
        <Road travel={sim as unknown as React.RefObject<{ s: number; speed: number }>} sky={sky} />
        <CityBlocks travel={sim as unknown as React.RefObject<{ s: number; speed: number }>} sky={sky} clearRef={clear}
          districtAt={(p) => (p < 700 ? "burj" : p < 1500 ? "towers" : "marina")} />
        <BurjKhalifa travel={sim as unknown as React.RefObject<{ s: number; speed: number }>} p={520} />
        <Suspense fallback={null}>
          {[40, length * 0.5].map((p) => <AtP key={p} simRef={sim} p={p}><SpeedSign /></AtP>)}
          {radars.map((p) => <AtP key={p} simRef={sim} p={p}><Radar flashRef={flash} /></AtP>)}
          <AtP simRef={sim} p={length - 200}><ExitGantry name={destination} /></AtP>
          <AtP simRef={sim} p={length}><CarPark name={destination} taken={taken} /></AtP>
          {stationAt !== null && <AtP simRef={sim} p={stationAt}><Station electric={!!d.car.electric} filling={phase === "fill"} /></AtP>}
          <Drive key={`${d.kind}:${d.id}`} d={d} length={length} stationAt={stationAt} radars={radars} simRef={sim} flashRef={flash} ev={ev} sky={sky} taken={taken} />
        </Suspense>
      </Canvas>

      {flashOn > 0 && <div className="absolute inset-0 bg-white/80 pointer-events-none" />}

      {/* where you're going, how far, and the fuel */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[22px] shadow-xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">{destination}</p>
              <p className="text-xs text-slate-500 truncate">{d.car.make} {d.car.model} · {d.plate === "RENTAL" ? "rental" : d.plate} · {phase === "park" || phase === "parked" ? "arrived" : `${(toGo / 1000).toFixed(1)} km to go`}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400">{icon} {d.car.electric ? "BATTERY" : "FUEL"}</p>
              <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full ${fuelNow < 15 ? "bg-rose-500" : d.car.electric ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${fuelNow}%` }} /></div>
              <p className="text-[10px] font-bold tabular-nums">{Math.round(fuelNow)}%</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (hud.s / length) * 100)}%` }} /></div>
        </div>
        {msg && <p className={`mx-auto mt-2 w-fit max-w-[92%] rounded-2xl px-4 py-2 text-sm font-black shadow-xl ${msg.tone === "bad" ? "bg-rose-600 text-white" : msg.tone === "good" ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950"}`}>{msg.text}</p>}
        {(phase === "station" || phase === "fill") && (
          <p className="mx-auto mt-2 w-fit rounded-2xl bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow-xl">
            {phase === "station" ? (d.car.electric ? "⚡ Pulling into the Tesla Supercharger…" : "⛽ Pulling into ENOC…") : d.car.electric ? "⚡ Charging… plugged in and topping up." : "💬 “Full tank? Special 95, coming right up.”"}
          </p>
        )}
        {/* the satnav card */}
        {phase === "drive" && (
          <div className="mx-auto mt-2 w-fit max-w-[92%] rounded-2xl bg-blue-700 text-white px-4 py-2 shadow-xl flex items-center gap-3">
            <span className="text-2xl leading-none">{toGo < 300 ? "↗" : "↑"}</span>
            <div>
              <p className="text-xl font-black tabular-nums leading-none">{toGo >= 1000 ? `${(toGo / 1000).toFixed(1)} km` : `${Math.round(toGo / 10) * 10} m`}</p>
              <p className="text-[11px] font-bold text-blue-100">{toGo < 300 ? "Car park on the right. Keep right" : `to ${destination}`}</p>
            </div>
          </div>
        )}
        {phase === "park" && (
          <div className={`mx-auto mt-2 w-fit max-w-[92%] rounded-2xl px-4 py-2 shadow-xl text-sm font-black ${hud.bay >= 0 ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
            {hud.bay >= 0
              ? `✅ Inside bay ${hud.bay + 1}. ${hud.stopped ? "Switch off to park." : "Stop here."}`
              : hud.onLot ? "🅿️ Park inside a green bay: all four wheels within the lines, straight." : "↪ Turn right into the car park."}
            {hud.reverse && <span className="ml-2 rounded bg-slate-900 text-white px-1.5">R</span>}
          </div>
        )}
      </div>

      {/* the speedometer */}
      {phase !== "ready" && phase !== "parked" && !summary && (
        <div className={`absolute left-1/2 -translate-x-1/2 ${driving ? "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)]" : "bottom-[max(1rem,env(safe-area-inset-bottom))]"} flex items-end gap-2 pointer-events-none`}>
          <div className={`w-20 h-20 rounded-full border-4 ${over ? "border-rose-500 bg-rose-950/80" : "border-white/80 bg-slate-950/70"} text-white flex flex-col items-center justify-center shadow-2xl`}>
            <span className="text-[28px] font-black tabular-nums leading-none">{hud.reverse ? "R" : kmh}</span>
            <span className="text-[10px] font-bold text-white/70">km/h</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-white border-[5px] border-red-600 flex items-center justify-center text-[11px] font-black text-slate-900 mb-1">{DR.speedLimit}</div>
        </div>
      )}

      {/* the controls: the wheel on the left, pedals on the right */}
      {driving && (
        <>
          <div className="absolute left-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))]">
            <SteeringWheel size={140} className="bg-white/30 backdrop-blur-sm ring-1 ring-white/40" onSteer={(v) => { sim.current.steer = v; }} />
          </div>
          <div className="absolute right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] flex items-end gap-2">
            <Hold simRef={sim} control="brake" label="Brake" className="w-16 h-16 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-[inset_0_-5px_0_rgba(0,0,0,0.3)] active:scale-95">BRAKE</Hold>
            <Hold simRef={sim} control="gas" label="Accelerate" className="w-[72px] h-24 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-[inset_0_-6px_0_rgba(0,0,0,0.3)] active:scale-95">GAS</Hold>
          </div>
          {phase === "park" && hud.stopped && hud.onLot && (
            <button onClick={switchOff} className="absolute left-1/2 -translate-x-1/2 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+12rem)] h-12 px-5 rounded-full bg-slate-900 text-white font-black shadow-2xl">🔑 Switch off &amp; park</button>
          )}
          <div className="absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+7.5rem)] flex flex-col gap-2">
            <button onClick={() => horn()} className="w-11 h-11 rounded-full bg-white/85 shadow-lg text-lg" aria-label="Horn">📯</button>
            <button onClick={() => { sim.current.view = sim.current.view === "chase" ? "far" : "chase"; }} className="w-11 h-11 rounded-full bg-white/85 shadow-lg text-lg" aria-label="Change camera">🎥</button>
            <button onClick={quit} className="w-11 h-11 rounded-full bg-white/85 shadow-lg text-sm font-black text-slate-700" aria-label="Pull over and stop">✕</button>
          </div>
        </>
      )}

      {/* before you set off: which car, the fuel, and filling up on the way */}
      {phase === "ready" && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white rounded-[26px] shadow-2xl p-4 space-y-3 text-slate-900">
            <div>
              <p className="font-black text-lg leading-tight">Drive to {destination}</p>
              <p className="text-xs text-slate-500">{(metres / 1000).toFixed(1)} km · speed limit {DR.speedLimit} km/h · cameras flash over {DR.radarOver}</p>
            </div>
            {drivables.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {drivables.map((x, i) => (
                  <button key={`${x.kind}:${x.id}`} onClick={() => { setPick(i); setWantFill(false); }} className={`shrink-0 h-9 px-3 rounded-xl text-xs font-black ${i === pick ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                    {x.car.make} {x.car.model}{x.kind === "rental" ? " (rental)" : ""}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold"><span>{d.car.electric ? "Battery" : "Fuel"} {Math.round(d.fuel)}%</span><span className="text-slate-500">this trip uses ≈ {Math.max(1, Math.round(need))}%</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-200 overflow-hidden relative">
                  <div className={`h-full ${d.fuel < 15 ? "bg-rose-500" : d.car.electric ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${d.fuel}%` }} />
                </div>
              </div>
            </div>
            {cost > 0 && (
              <button onClick={() => setWantFill((w) => !w)} disabled={mustFill} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${fill ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-black ${fill ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>{fill ? "✓" : ""}</span>
                <div className="flex-1">
                  <p className="font-black text-sm">{d.car.electric ? `Charge at a ${CARS.fuel.charger} on the way` : `Fill up at ${CARS.fuel.station} on the way`}</p>
                  <p className="text-[11px] text-slate-500">{mustFill ? "Not enough for this trip: you'll need to stop. " : ""}{d.car.electric ? `AED ${CARS.fuel.chargePerKwh.toFixed(2)}/kWh` : `AED ${CARS.fuel.petrolPerLitre.toFixed(2)}/L`} · to full {aed(cost)}</p>
                </div>
              </button>
            )}
            <p className="text-[11px] text-slate-500">At {destination} you park it yourself: hold <b>BRAKE</b> when stopped to reverse, 🎥 to see from above, and pay the RTA meter. Hold <b>GAS</b> to go and <b>BRAKE</b> to slow; turn the wheel to change lanes (the indicator comes on). Other drivers keep their distance and let you in. Hit someone and Dubai Police take you in, and the car.</p>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onCancel} className="h-12 px-4 rounded-2xl bg-slate-100 font-black text-slate-700">Back</button>
              <button onClick={start} disabled={busy} className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-60">{busy ? "Paying…" : fill ? `${icon} ${aed(cost)} · Start the engine` : "🔑 Start the engine"}</button>
            </div>
          </div>
        </div>
      )}

      {/* parked: the RTA meter */}
      {phase === "parked" && parked && !summary && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white rounded-[26px] shadow-2xl p-4 space-y-3 text-slate-900">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center text-2xl font-black">P</span>
              <div className="flex-1">
                <p className="font-black text-lg leading-tight">RTA paid parking</p>
                <p className="text-xs text-slate-500">Zone {zoneOf(destination)} · {aed(P.perHour)} an hour</p>
              </div>
            </div>
            {parked.good
              ? <p className="text-sm font-bold text-emerald-700">✅ Neatly parked in bay {parked.bay + 1}.</p>
              : (
                <div className="rounded-2xl bg-amber-50 p-3 text-sm">
                  <p className="font-bold text-amber-800">⚠️ You&apos;re not inside a bay&apos;s lines. Inspectors fine {aed(P.badParkingFine)} for that.</p>
                  <button onClick={repark} className="mt-2 h-9 px-4 rounded-full bg-amber-500 text-white font-black text-xs">Start the engine and re-park</button>
                </div>
              )}
            <div className="grid grid-cols-3 gap-2">
              {P.hours.map((h) => (
                <button key={h} disabled={busy || balance < h * P.perHour} onClick={() => pay(h)} className="h-14 rounded-2xl bg-blue-700 text-white font-black disabled:opacity-50 leading-tight">
                  {h} hour{h > 1 ? "s" : ""}<br /><span className="text-xs font-bold text-blue-100">{aed(h * P.perHour)}</span>
                </button>
              ))}
            </div>
            <button disabled={busy} onClick={() => pay(0)} className="w-full text-xs font-bold text-slate-500 underline">Don&apos;t pay (inspectors fine {aed(P.unpaidFine)})</button>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          </div>
        </div>
      )}

      {/* you're there */}
      {summary && (
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white rounded-[26px] shadow-2xl p-4 text-slate-900 space-y-1">
            <p className="font-black text-lg">🅿️ Parked at {destination}</p>
            <p className="text-sm text-slate-600">{summary.hours ? `Paid ${aed(summary.cost)} for ${summary.hours} hour${summary.hours > 1 ? "s" : ""}.` : "⚠️ Not paid: watch out for the inspector."}{summary.good ? "" : " ⚠️ Outside the lines."}</p>
            <p className="text-sm text-slate-600">{icon} {d.car.electric ? "Battery" : "Fuel"} {Math.round(summary.fuel)}%{summary.fine ? ` · 📸 Speed camera fine ${aed(summary.fine)}` : summary.hours && summary.good ? " · No fines. Nice driving." : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}
