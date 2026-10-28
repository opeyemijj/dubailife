"use client";

// Getting there, in 3D: the last few metres of every trip, before the doors open. Out of the taxi (or off
// the pavement) and up to the entrance, which looks like the place: a club has its neon sign, a velvet rope
// and a bouncer who checks you before unhooking it, with a queue of Locals; a hotel has its canopy, a
// doorman and a car at valet; a mall its glass doors; a street cafeteria has plastic chairs on the
// pavement, karak brewing and chicken turning in the rotisserie outside. A few seconds, skippable.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight, Sedan } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm } from "@/components/home/RunJourney";
import { footstep, doorThud } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { CarModel } from "@/components/cars/CarModel";
import type { Car } from "@/lib/cars";
import type { Place } from "@/lib/city/types";

export type ArrivalKind = "club" | "hotel" | "mall" | "cafeteria" | "attraction" | "restaurant";

export function arrivalKindOf(place: Place): ArrivalKind {
  if (/cafeteria|karak|shawarma/i.test(`${place.id} ${place.name}`)) return "cafeteria";
  // Car showrooms and rental counters: a glass front like a mall's.
  if (place.route?.startsWith("/cars/")) return "mall";
  if (place.kind === "club") return "club";
  if (place.kind === "hotel") return "hotel";
  if (place.kind === "mall") return "mall";
  if (place.kind === "food-hall") return "restaurant";
  return "attraction";
}

const FACADE_Z = 7;       // the building's front, facing the street
const DOOR: [number, number] = [0, FACADE_Z - 0.2];

function signTexture(text: string, neon: boolean, color: string) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = neon ? "#0b0b14" : color; g.fillRect(0, 0, 1024, 256);
  g.font = `900 ${text.length > 18 ? 84 : 110}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  if (neon) { g.shadowColor = color; g.shadowBlur = 40; g.fillStyle = color; } else g.fillStyle = "#ffffff";
  g.fillText(text.toUpperCase(), 512, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- the entrances

function Facade({ name, kind, night }: { name: string; kind: ArrivalKind; night: boolean }) {
  const look = {
    club: { wall: "#111827", sign: "#e879f9", neon: true, glass: "#1e1b4b" },
    hotel: { wall: "#e7e0d4", sign: "#a16207", neon: false, glass: "#1e3a5f" },
    mall: { wall: "#f1f5f9", sign: "#0f172a", neon: false, glass: "#7dd3fc" },
    cafeteria: { wall: "#fef3c7", sign: "#b91c1c", neon: false, glass: "#334155" },
    restaurant: { wall: "#f5f0e6", sign: "#065f46", neon: false, glass: "#1e3a5f" },
    attraction: { wall: "#e2e8f0", sign: "#0369a1", neon: false, glass: "#1e3a5f" },
  }[kind];
  const sign = useMemo(() => signTexture(name, look.neon || night, look.neon ? look.sign : night ? "#fde68a" : look.sign), [name, look, night]);
  const tall = kind === "hotel" ? 40 : kind === "mall" ? 14 : kind === "cafeteria" ? 6 : 10;
  return (
    <group>
      <mesh position={[0, tall / 2, FACADE_Z + 4]} castShadow receiveShadow><boxGeometry args={[kind === "cafeteria" ? 9 : 22, tall, 8]} /><meshStandardMaterial color={look.wall} roughness={0.7} /></mesh>
      {/* shopfront glass and the doorway */}
      {/* the glass shopfront, lit softly from inside after dark, with metal frames between the panes */}
      <mesh position={[0, 1.6, FACADE_Z - 0.01]} rotation={[0, Math.PI, 0]}><planeGeometry args={[kind === "cafeteria" ? 8 : 12, 3.2]} /><meshStandardMaterial color={look.glass} emissive={night ? (kind === "club" ? "#6d28d9" : "#b45309") : "#000"} emissiveIntensity={night ? 0.12 : 0} roughness={0.05} metalness={0.6} /></mesh>
      {Array.from({ length: kind === "cafeteria" ? 6 : 9 }, (_, i) => {
        const w = kind === "cafeteria" ? 8 : 12, n = kind === "cafeteria" ? 6 : 9;
        return <mesh key={i} position={[-w / 2 + (w / (n - 1)) * i, 1.6, FACADE_Z - 0.04]}><boxGeometry args={[0.08, 3.2, 0.06]} /><meshStandardMaterial color={kind === "club" ? "#a21caf" : "#334155"} metalness={0.8} roughness={0.3} /></mesh>;
      })}
      <mesh position={[0, 3.24, FACADE_Z - 0.04]}><boxGeometry args={[kind === "cafeteria" ? 8.1 : 12.1, 0.1, 0.08]} /><meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 1.3, FACADE_Z - 0.03]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.9, 2.6]} /><meshStandardMaterial color={kind === "club" ? "#000" : "#e0f2fe"} emissive={kind === "club" ? "#7c3aed" : "#000"} emissiveIntensity={0.4} transparent opacity={0.85} /></mesh>
      {/* the sign above the door */}
      <mesh position={[0, 3.9, FACADE_Z - 0.05]} rotation={[0, Math.PI, 0]}><planeGeometry args={[kind === "cafeteria" ? 7 : 9, 1.6]} /><meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={look.neon || night ? 1 : 0.15} /></mesh>
      {kind === "hotel" && (
        <>
          {/* a canopy over the drop-off, on gold columns */}
          <mesh position={[0, 3.6, FACADE_Z - 3]} castShadow><boxGeometry args={[8, 0.3, 6]} /><meshStandardMaterial color="#f8f5ee" /></mesh>
          {[-3.6, 3.6].map((x) => <mesh key={x} position={[x, 1.8, FACADE_Z - 5.6]}><cylinderGeometry args={[0.16, 0.16, 3.6, 12]} /><meshStandardMaterial color="#c9a24b" metalness={0.8} roughness={0.25} /></mesh>)}
          <mesh position={[0, 0.02, FACADE_Z - 3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 6]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
        </>
      )}
      {kind === "mall" && <mesh position={[0, 4.6, FACADE_Z - 1.2]}><boxGeometry args={[14, 0.2, 2.4]} /><meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} /></mesh>}
    </group>
  );
}

function VelvetRope({ open }: { open: React.RefObject<number> }) {
  const post = useRef<THREE.Group>(null);
  useFrame(() => { if (post.current) post.current.position.x = 0.9 + open.current * 1.4; });
  const brass = <meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.2} />;
  return (
    <group position={[0, 0, FACADE_Z - 1.6]}>
      <mesh position={[-0.9, 0.5, 0]}><cylinderGeometry args={[0.05, 0.12, 1, 12]} />{brass}</mesh>
      <group ref={post}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.12, 1, 12]} />{brass}</mesh>
      </group>
      {/* the red carpet to the door */}
      <mesh position={[0, 0.015, 0.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.8, 3.2]} /><meshStandardMaterial color="#991b1b" /></mesh>
      <RopeSag open={open} />
    </group>
  );
}

function RopeSag({ open }: { open: React.RefObject<number> }) {
  const rope = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!rope.current) return;
    const len = 1.8 + open.current * 1.4;
    rope.current.scale.x = len / 1.8;
    rope.current.position.x = -0.9 + len / 2;
    rope.current.visible = open.current < 0.95;
  });
  return <mesh ref={rope} position={[0, 0.82, 0]} rotation={[0, 0, 0]}><boxGeometry args={[1.8, 0.05, 0.05]} /><meshStandardMaterial color="#b91c1c" roughness={0.6} /></mesh>;
}

/** The glass rotisserie on the pavement: three spits of chickens turning over an orange glow. */
function Rotisserie() {
  const spits = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => spits.current.forEach((s, i) => { if (s) s.rotation.x += dt * (1.6 + i * 0.15); }));
  const steel = <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />;
  return (
    <group position={[2.9, 0, FACADE_Z - 1.6]}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.8, 0.9, 0.9]} />{steel}</mesh>
      {/* the glass cabinet */}
      <mesh position={[0, 1.55, 0]}><boxGeometry args={[1.8, 1.3, 0.85]} /><meshStandardMaterial color="#fde68a" transparent opacity={0.18} roughness={0.05} /></mesh>
      {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 1.55, 0]}><boxGeometry args={[0.05, 1.32, 0.88]} />{steel}</mesh>)}
      <mesh position={[0, 2.22, 0]}><boxGeometry args={[1.86, 0.06, 0.9]} />{steel}</mesh>
      <mesh position={[0, 1.55, 0.36]}><boxGeometry args={[1.7, 1.2, 0.02]} /><meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} /></mesh>
      <pointLight position={[0, 1.6, -0.3]} intensity={6} distance={4} color="#fb923c" />
      {[1.95, 1.55, 1.15].map((y, i) => (
        <group key={y} position={[0, y, -0.05]} ref={(g) => { if (g) spits.current[i] = g; }} rotation={[0, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 1.75, 6]} />{steel}</mesh>
          {[-0.6, -0.2, 0.2, 0.6].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh scale={[1, 0.85, 0.85]}><sphereGeometry args={[0.16, 14, 10]} /><meshStandardMaterial color="#b45309" roughness={0.45} /></mesh>
              {/* drumsticks */}
              <mesh position={[0.08, -0.09, 0.08]} rotation={[0.6, 0, 0.5]}><capsuleGeometry args={[0.045, 0.12, 4, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
              <mesh position={[0.08, -0.09, -0.08]} rotation={[-0.6, 0, 0.5]}><capsuleGeometry args={[0.045, 0.12, 4, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** The karak counter: a steaming urn, paper cups and a shawarma spit. */
function KarakCounter() {
  const spit = useRef<THREE.Mesh>(null);
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (spit.current) spit.current.rotation.y += dt * 0.8;
    if (steam.current) steam.current.children.forEach((c, i) => { const t = (clock.getElapsedTime() * 0.6 + i / 3) % 1; c.position.y = 2.0 + t * 0.6; (c as THREE.Mesh).scale.setScalar(0.06 + t * 0.12); ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - t); });
  });
  return (
    <group position={[-2.9, 0, FACADE_Z - 1.2]}>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[2, 1.1, 0.8]} /><meshStandardMaterial color="#e5e7eb" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[-0.55, 1.45, 0]}><cylinderGeometry args={[0.22, 0.22, 0.7, 16]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>
      <group ref={steam}>{[0, 1, 2].map((i) => <mesh key={i} position={[-0.55, 2, 0]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} /></mesh>)}</group>
      {[-0.05, 0.1, 0.25].map((x) => <mesh key={x} position={[x, 1.17, 0.15]}><cylinderGeometry args={[0.045, 0.035, 0.1, 10]} /><meshStandardMaterial color="#fafafa" /></mesh>)}
      {/* the shawarma spit, slowly turning */}
      <mesh ref={spit} position={[0.6, 1.55, -0.1]}><coneGeometry args={[0.22, 0.85, 14]} /><meshStandardMaterial color="#a16207" roughness={0.6} /></mesh>
    </group>
  );
}

function PavementSeating() {
  return (
    <group>
      {[[-1.2, FACADE_Z - 3.6], [1.4, FACADE_Z - 3.9]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.45, 0.45, 0.04, 16]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.04, 0.04, 0.72, 6]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          {[0, Math.PI].map((a) => (
            <group key={a} position={[Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7]} rotation={[0, -a + Math.PI / 2, 0]}>
              <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.42, 0.04, 0.42]} /><meshStandardMaterial color={i ? "#16a34a" : "#dc2626"} /></mesh>
              <mesh position={[0, 0.7, -0.2]}><boxGeometry args={[0.42, 0.5, 0.04]} /><meshStandardMaterial color={i ? "#16a34a" : "#dc2626"} /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- you, the host and the queue

const STAFF_LOOK: Record<ArrivalKind, AvatarLookProps> = {
  club: { gender: "man", preset: "Business_Male_01" }, hotel: { gender: "man", preset: "Business_Male_04" },
  mall: { gender: "woman", preset: "Business_Female_01" }, cafeteria: { gender: "man", preset: "Male_Adult_10" },
  restaurant: { gender: "woman", preset: "Business_Female_02" }, attraction: { gender: "man", preset: "Business_Male_05" },
};

interface Beat { at: number; to: [number, number]; anim: AvatarAnimation; staff?: AvatarAnimation; rope?: boolean; say?: string }

function scriptFor(kind: ArrivalKind, taxi: boolean): { beats: Beat[]; length: number } {
  const start: [number, number] = taxi ? [-1.4, -1.2] : [-7, 1.5];
  if (kind === "club") return { length: 8.5, beats: [
    { at: 0, to: start, anim: "idle" },
    { at: taxi ? 1.2 : 0.2, to: [0.2, FACADE_Z - 2.6], anim: "walk" },
    { at: 3.4, to: [0.2, FACADE_Z - 2.6], anim: "idle", staff: "talk", say: "Evening. Name on the list?" },
    { at: 5.2, to: [0.2, FACADE_Z - 2.6], anim: "wave", staff: "wave", rope: true, say: "You're good. Enjoy your night." },
    { at: 6.3, to: DOOR, anim: "walk", rope: true },
  ] };
  if (kind === "cafeteria") return { length: 7.5, beats: [
    { at: 0, to: start, anim: "idle" },
    { at: taxi ? 1.2 : 0.2, to: [1.4, FACADE_Z - 3], anim: "walk" },
    { at: 3.6, to: [1.4, FACADE_Z - 3], anim: "talk", staff: "talk", say: "Habibi! Karak? Chicken fresh off the grill!" },
    { at: 5.6, to: DOOR, anim: "walk", staff: "wave" },
  ] };
  return { length: 6.5, beats: [
    { at: 0, to: start, anim: "idle" },
    { at: taxi ? 1.2 : 0.2, to: [0, FACADE_Z - 2.4], anim: "walk" },
    { at: 3.4, to: [0, FACADE_Z - 2.4], anim: "wave", staff: "wave", say: kind === "hotel" ? "Welcome. Let me get the door." : "Welcome in!" },
    { at: 4.6, to: DOOR, anim: "walk" },
  ] };
}

/** Your own car, parked at the kerb where you got out. */
export type ParkedCar = { car: Car; plate: string };

function Scene({ kind, name, look, taxi, own, onSay, onDone }: { kind: ArrivalKind; name: string; look?: AvatarLookProps; taxi: boolean; own?: ParkedCar; onSay: (s: string | null) => void; onDone: () => void }) {
  const camera = useThree((s) => s.camera);
  const me = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  const rope = useRef(0);
  const t = useRef(0);
  const beatIdx = useRef(-1);
  const stride = useRef(0);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night" || kind === "club";
  const { beats, length } = useMemo(() => scriptFor(kind, taxi), [kind, taxi]);
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  const [staffAnim, setStaffAnim] = useState<AvatarAnimation>("idle");
  const look3 = useRef(new THREE.Vector3(0, 1.4, FACADE_Z));
  const done = useRef(false);

  useEffect(() => { if (taxi) doorThud(); }, [taxi]);

  useFrame((_, dt) => {
    t.current += dt;
    const g = me.current;
    if (!g) return;
    // The current beat, and the next one's start.
    let i = 0;
    while (i + 1 < beats.length && beats[i + 1].at <= t.current) i++;
    const b = beats[i];
    if (i !== beatIdx.current) {
      beatIdx.current = i;
      setAnim(b.anim);
      if (b.staff) setStaffAnim(b.staff);
      onSay(b.say ?? null);
      if (i === 0) g.position.set(b.to[0], 0, b.to[1]);
    }
    if (b.rope) rope.current = Math.min(1, rope.current + dt * 1.2);
    // Walk toward this beat's spot.
    const dx = b.to[0] - g.position.x, dz = b.to[1] - g.position.z, dist = Math.hypot(dx, dz);
    if (dist > 0.05 && b.anim === "walk") {
      const step = Math.min(dist, dt * 1.5);
      g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
      const yaw = Math.atan2(dx, dz);
      let d = yaw - g.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += d * Math.min(1, dt * 8);
      const before = Math.floor(stride.current); stride.current += dt * 1.8;
      if (Math.floor(stride.current) !== before) footstep("stone", 0.2);
    } else if (b.anim !== "walk") {
      // Face whoever is greeting you.
      let d = 0 - g.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += d * Math.min(1, dt * 5);
    }
    // The taxi pulls away once you're out.
    if (car.current && taxi) car.current.position.x = t.current < 1.4 ? 0 : -3 * (t.current - 1.4) ** 2;
    // Behind and to one side, high enough to take in the street and the whole entrance as you walk up.
    const p = g.position;
    camera.position.lerp(new THREE.Vector3(p.x * 0.5 + 3.2, 3.4, Math.min(p.z, FACADE_Z - 3) - 6.5), Math.min(1, dt * 2));
    look3.current.lerp(new THREE.Vector3(p.x * 0.4, 1.5, (p.z + FACADE_Z) / 2), Math.min(1, dt * 2.5));
    camera.lookAt(look3.current);
    if (t.current >= length && !done.current) { done.current = true; onDone(); }
  });

  const queue = kind === "club" ? [0, 1, 2].map((i) => LOCALS[(i * 11 + name.length) % LOCALS.length]) : [];
  return (
    <>
      <SkyAndLight sky={night ? "night" : sky} />
      <ambientLight intensity={night ? 0.8 : 0.3} color={night ? "#c7d2fe" : "#fff"} />
      <pointLight position={[0, 4.2, FACADE_Z - 3]} intensity={night ? 30 : 6} distance={14} color={kind === "club" ? "#e879f9" : "#ffe2b0"} />
      {/* road, kerb and pavement */}
      <mesh position={[0, 0, -4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 10]} /><meshStandardMaterial color="#3f3f46" roughness={0.9} /></mesh>
      <mesh position={[0, 0.06, 3.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 7]} /><meshStandardMaterial color="#d6cdb8" roughness={0.85} /></mesh>
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[120, 0.16, 0.25]} /><meshStandardMaterial color="#a8a29e" /></mesh>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-45 + i * 10, 0.01, -4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 0.18]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
      <Facade name={name} kind={kind} night={night} />
      {[-16, 16].map((x, i) => <Building key={x} x={x} z={FACADE_Z + 5} w={10} d={10} h={kind === "cafeteria" ? 12 : 26} color={["#e7e1d6", "#d6d3d1"][i]} facing={-1} night={night} />)}
      {[-8, 8].map((x) => <StreetPalm key={x} x={x} z={1.2} h={6.5} />)}
      {[-12, 12].map((x) => <Lamp key={x} x={x} z={0.8} night={night} />)}
      {kind === "club" && <VelvetRope open={rope} />}
      {kind === "cafeteria" && <><Rotisserie /><KarakCounter /><PavementSeating /></>}
      {taxi && !own && <group ref={car} position={[0, 0, -1.9]} rotation={[0, Math.PI / 2, 0]}><Sedan color="#f8fafc" taxiRoof="#e11d48" /></group>}
      {own && <group position={[-0.6, 0, -1.7]} rotation={[0, Math.PI / 2, 0]}><Suspense fallback={null}><CarModel car={own.car} plate={own.plate} /></Suspense></group>}
      {/* the bouncer, doorman or the man at the counter */}
      <group position={kind === "club" ? [-1.4, 0, FACADE_Z - 1.4] : kind === "cafeteria" ? [2.9, 0, FACADE_Z - 0.6] : [1.6, 0, FACADE_Z - 1.2]} rotation={[0, Math.PI, 0]}>
        <Suspense fallback={null}><CitizenAvatar look={STAFF_LOOK[kind]} animation={staffAnim} /></Suspense>
      </group>
      {queue.map((l, i) => (
        <group key={l.id} position={[-3.2 - i * 0.9, 0, FACADE_Z - 2.2 - i * 0.3]} rotation={[0, Math.PI / 2 + 0.3, 0]}>
          <Suspense fallback={null}><CitizenAvatar look={l.look} animation={i === 1 ? "talk" : "idle"} /></Suspense>
        </group>
      ))}
      {kind === "cafeteria" && [0, 1].map((i) => (
        <group key={i} position={[-1.2 + (i ? 0.7 : -0.7), 0, FACADE_Z - 3.6]} rotation={[0, i ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <Suspense fallback={null}><CitizenAvatar look={LOCALS[(i * 17 + 3) % LOCALS.length].look} animation="sit" /></Suspense>
        </group>
      ))}
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
    </>
  );
}

export function ArrivalScene({ place, label, look, taxi, own, onDone }: { place: Place; label: string; look?: AvatarLookProps; taxi: boolean; own?: ParkedCar; onDone: () => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const kind = arrivalKindOf(place);
  const [say, setSay] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[190] bg-black">
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [1.5, 3.4, -7], fov: 55 }}>
        <Scene kind={kind} name={place.name.split("·")[0].trim()} look={look} taxi={taxi || !!own} own={own} onSay={setSay} onDone={onDone} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[22px] shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-2xl">{{ club: "🪩", hotel: "🏨", mall: "🛍️", cafeteria: "☕", restaurant: "🍽️", attraction: "🎡" }[kind]}</span>
          <div className="min-w-0"><p className="font-black leading-tight truncate">{label}</p><p className="text-xs text-slate-500 truncate">Arriving at {place.name}</p></div>
        </div>
      </div>
      {say && (
        <div className="absolute bottom-28 inset-x-3 pointer-events-none flex justify-center">
          <p className="max-w-sm rounded-2xl bg-white text-slate-900 px-4 py-2.5 font-semibold shadow-xl animate-[sheetUp_0.2s_ease-out]">💬 {say}</p>
        </div>
      )}
      <button onClick={onDone} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 h-11 px-5 rounded-full bg-white/90 font-bold text-slate-800 shadow-lg">Skip ›</button>
    </div>
  );
}
