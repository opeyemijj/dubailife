"use client";

// What makes a hotel suite more than a flat, in 3D inside the room (ApartmentRoom's `extras`): a jacuzzi on the
// terrace with the water moving and bubbles rising, a spa corner (massage table, towels, candles and a glass steam
// room), a gaming lounge (big screen, console and gaming chair) and a lit minibar. Positions are in the room's metres
// (the 1-bedroom layout, 10 × 10 m: the master bedroom at the back right, the living room at the front left, the
// closed kitchen at the front right made over as the spa room, and the balcony beyond the living room). Each stands
// on floor the built-in furniture leaves free (src/data/home/floorplans.json). `active` lights up the one in use
// (the jacuzzi bubbles harder, the steam rises, the screen plays).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SUITE_SPOTS = {
  jacuzzi: [0, 5.75] as [number, number],
  massage: [3.0, 2.5] as [number, number],
  steam: [3.0, 4.15] as [number, number],
  games: [0.9, 4.1] as [number, number],
  minibar: [-4.77, 3.75] as [number, number],
  bed: [1.5, -3.75] as [number, number],
};

export function SuiteExtras({ active, gold = false }: { active?: string | null; gold?: boolean }) {
  return (
    <group>
      <Jacuzzi on={active === "jacuzzi"} gold={gold} />
      <Spa on={active === "massage" || active === "steam"} steam={active === "steam"} />
      <GamingLounge on={active === "games"} />
      <Minibar gold={gold} />
    </group>
  );
}

function Jacuzzi({ on, gold }: { on: boolean; gold: boolean }) {
  const water = useRef<THREE.Mesh>(null);
  const bubbles = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ a: (i * 2.39996) % (Math.PI * 2), r: 0.1 + ((i * 37) % 10) / 20, s: 0.5 + ((i * 13) % 7) / 7 })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (water.current) water.current.position.y = 0.52 + Math.sin(t * (on ? 6 : 2)) * (on ? 0.012 : 0.004);
    bubbles.current?.children.forEach((b, i) => {
      const s = seeds[i];
      const k = ((t * s.s * (on ? 1.6 : 0.6)) + i * 0.17) % 1;
      b.position.set(Math.cos(s.a) * s.r, 0.2 + k * 0.34, Math.sin(s.a) * s.r);
      b.scale.setScalar(on ? 1 : 0.6);
    });
  });
  const [x, z] = SUITE_SPOTS.jacuzzi;
  return (
    // Scaled to the balcony (1.5 m deep).
    <group position={[x, 0, z]} scale={[0.68, 1, 0.68]}>
      {/* The shell and its rim. */}
      <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.95, 0.95, 0.56, 40, 1, true]} /><meshStandardMaterial color={gold ? "#e7d3a1" : "#f1f5f9"} side={THREE.DoubleSide} roughness={0.3} /></mesh>
      <mesh position={[0, 0.57, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.85, 1.05, 40]} /><meshStandardMaterial color={gold ? "#c9a227" : "#e2e8f0"} metalness={gold ? 0.6 : 0.1} roughness={0.25} /></mesh>
      <mesh ref={water} position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.88, 40]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.05} metalness={0.2} emissive="#0ea5e9" emissiveIntensity={on ? 0.35 : 0.15} /></mesh>
      <group ref={bubbles} position={[0, 0.2, 0]}>
        {seeds.map((_, i) => <mesh key={i}><sphereGeometry args={[0.022, 6, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.8} /></mesh>)}
      </group>
      {/* An underwater light and two rolled towels on the rim. */}
      <pointLight position={[0, 0.35, 0]} color="#7dd3fc" intensity={on ? 1.6 : 0.6} distance={2.5} />
      {[[-0.75, 0.62], [0.75, 0.62]].map(([tx, ty], i) => (
        <mesh key={i} position={[tx, ty, -0.55]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.3, 12]} /><meshStandardMaterial color="#fafafa" /></mesh>
      ))}
    </group>
  );
}

function Spa({ on, steam }: { on: boolean; steam: boolean }) {
  const puffs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.current?.children.forEach((p, i) => {
      const k = (t * 0.25 + i / 8) % 1;
      p.position.y = 0.3 + k * 1.7;
      const m = (p as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.opacity = (steam ? 0.45 : 0.12) * (1 - k);
    });
  });
  const [mx, mz] = SUITE_SPOTS.massage, [sx, sz] = SUITE_SPOTS.steam;
  return (
    <group>
      {/* Massage table with a towel, a rolled headrest, and candles. */}
      <group position={[mx, 0, mz]} rotation={[0, Math.PI / 2, 0]}>{/* Lengthwise down the spa room. */}
        <mesh position={[0, 0.72, 0]}><boxGeometry args={[1.9, 0.12, 0.72]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
        <mesh position={[0, 0.79, 0]}><boxGeometry args={[1.5, 0.03, 0.74]} /><meshStandardMaterial color="#d6c7b0" /></mesh>
        <mesh position={[0.82, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.5, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
        {[[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]].map(([lx, lz], i) => <mesh key={i} position={[lx, 0.35, lz]}><cylinderGeometry args={[0.04, 0.04, 0.7, 8]} /><meshStandardMaterial color="#a16207" /></mesh>)}
        {[-0.4, 0, 0.4].map((cx) => (
          <group key={cx} position={[cx, 0.02, -0.65]}>
            <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.05, 0.05, 0.12, 10]} /><meshStandardMaterial color="#fef3c7" /></mesh>
            <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2} /></mesh>
          </group>
        ))}
        <pointLight position={[0, 0.5, -0.6]} color="#fbbf24" intensity={on ? 0.9 : 0.4} distance={2.2} />
      </group>
      {/* The steam room: a glass box with a bench, and steam rising inside. */}
      <group position={[sx, 0, sz]}>
        <mesh position={[0, 1.1, 0]}><boxGeometry args={[1.1, 2.2, 1.1]} /><meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.22} roughness={0.05} transmission={0.6} /></mesh>
        <mesh position={[0, 0.45, -0.3]}><boxGeometry args={[1.0, 0.12, 0.4]} /><meshStandardMaterial color="#78350f" /></mesh>
        <group ref={puffs}>
          {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.sin(i) * 0.25, 0.3, Math.cos(i * 1.7) * 0.25]}><sphereGeometry args={[0.18, 8, 8]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.1} depthWrite={false} /></mesh>)}
        </group>
      </group>
    </group>
  );
}

function GamingLounge({ on }: { on: boolean }) {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    const t = clock.elapsedTime;
    // While playing, the screen flickers through colours; otherwise a calm glow.
    screen.current.emissive.setHSL(on ? (t * 0.2) % 1 : 0.6, on ? 0.8 : 0.4, on ? 0.45 : 0.18);
  });
  const [x, z] = SUITE_SPOTS.games;
  return (
    // The screen against the balcony wall, the chair facing it from the room.
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      {/* A big screen on a stand, a console with a glowing strip, and a racing-style gaming chair facing it. */}
      <mesh position={[0, 1.35, -0.55]}><boxGeometry args={[2.0, 1.15, 0.06]} /><meshStandardMaterial color="#020617" /></mesh>
      <mesh position={[0, 1.35, -0.515]}><planeGeometry args={[1.9, 1.05]} /><meshStandardMaterial ref={screen} color="#0f172a" emissive="#1e3a8a" emissiveIntensity={1} /></mesh>
      <mesh position={[0, 0.3, -0.5]}><boxGeometry args={[1.6, 0.6, 0.4]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0.61, -0.45]}><boxGeometry args={[0.4, 0.08, 0.3]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
      <mesh position={[0, 0.55, -0.29]}><boxGeometry args={[1.6, 0.03, 0.02]} /><meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={on ? 3 : 1.5} /></mesh>
      <group position={[0, 0, 0.75]}>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.6, 0.12, 0.6]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[0, 0.95, 0.27]} rotation={[-0.15, 0, 0]}><boxGeometry args={[0.58, 0.95, 0.12]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[0, 1.2, 0.2]} rotation={[-0.15, 0, 0]}><boxGeometry args={[0.3, 0.2, 0.05]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4, 8]} /><meshStandardMaterial color="#334155" /></mesh>
      </group>
    </group>
  );
}

function Minibar({ gold }: { gold: boolean }) {
  const [x, z] = SUITE_SPOTS.minibar;
  const bottles = ["#14532d", "#7f1d1d", "#fde68a", "#1e3a8a", "#f8fafc", "#78350f"];
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.3, 1.0, 0.45]} /><meshStandardMaterial color={gold ? "#3f2a14" : "#1f2937"} roughness={0.4} /></mesh>
      <mesh position={[0, 1.01, 0]}><boxGeometry args={[1.35, 0.03, 0.5]} /><meshStandardMaterial color={gold ? "#c9a227" : "#e5e7eb"} metalness={0.6} roughness={0.2} /></mesh>
      {bottles.map((c, i) => (
        <mesh key={i} position={[-0.5 + i * 0.2, 1.17, 0]}><cylinderGeometry args={[0.035, 0.045, 0.3, 10]} /><meshStandardMaterial color={c} transparent opacity={0.85} roughness={0.1} /></mesh>
      ))}
      <mesh position={[0, 0.5, 0.228]}><planeGeometry args={[1.2, 0.85]} /><meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.35} transparent opacity={0.35} /></mesh>
    </group>
  );
}
