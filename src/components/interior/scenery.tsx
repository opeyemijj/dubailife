"use client";

// Scenery for open-air and special venues: beaches, pool decks, waterparks, spas, theatres, mosques
// and the ice rink. Built from simple geometry at real-world scale (metres), like fixtures.tsx.

import { Suspense, useEffect, useMemo, useRef } from "react";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOWLING, LANE_IN_USE, LIFT_IN_USE, LOBBY, PIN_SPOTS, WAX_IN_USE, RAFT_RADIUS, SLIDE_POINTS, SLIDE_RADIUS, STAIRS_X, TWIN_LANE, waveZ, WAVE_COUNT, type P3 } from "./rides/paths";

const Box = ({ args, position, color, rotation, emissive }: { args: [number, number, number]; position: [number, number, number]; color: string; rotation?: [number, number, number]; emissive?: string }) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.6} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.6 : 0} />
  </mesh>
);

// ---------------------------------------------------------------- beach and pool

/** The open sea: a wide animated water plane with a line of surf where it meets the sand. */
export function Sea({ width, depth }: { width: number; depth: number }) {
  const surf = useRef<THREE.Mesh>(null);
  const water = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (surf.current) surf.current.position.z = depth / 2 - 0.2 + Math.sin(t * 0.8) * 0.25;
    if (water.current) (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.18 + Math.sin(t * 1.2) * 0.05;
  });
  return (
    <group>
      <mesh ref={water} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={0.2} metalness={0.25} roughness={0.12} />
      </mesh>
      {/* shallow turquoise band near the shore */}
      <mesh position={[0, 0.025, depth / 2 - 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 1.8]} />
        <meshStandardMaterial color="#5eead4" transparent opacity={0.7} roughness={0.2} />
      </mesh>
      <mesh ref={surf} position={[0, 0.04, depth / 2 - 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 0.35]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/** A sun lounger with a towel. */
export function Lounger({ towel = "#f43f5e" }: { towel?: string }) {
  return (
    <group>
      <Box args={[0.7, 0.08, 1.9]} position={[0, 0.32, 0]} color="#f8fafc" />
      <Box args={[0.7, 0.08, 0.7]} position={[0, 0.55, -0.75]} rotation={[-0.7, 0, 0]} color="#f8fafc" />
      <Box args={[0.6, 0.02, 1.2]} position={[0, 0.37, 0.15]} color={towel} />
      {[[-0.3, -0.85], [0.3, -0.85], [-0.3, 0.85], [0.3, 0.85]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.05, 0.3, 0.05]} position={[x, 0.15, z]} color="#a8a29e" />)}
    </group>
  );
}

/** A beach umbrella. */
export function Umbrella({ color = "#0ea5e9" }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 2.4, 8]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh position={[0, 2.35, 0]} castShadow><coneGeometry args={[1.3, 0.5, 12, 1, true]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} /></mesh>
    </group>
  );
}

/** A pair of loungers under one umbrella. */
export function LoungerSet({ color }: { color: string }) {
  return (
    <group>
      <group position={[-0.5, 0, 0]}><Lounger towel={color} /></group>
      <group position={[0.5, 0, 0]}><Lounger towel="#f8fafc" /></group>
      <group position={[0, 0, -0.4]}><Umbrella color={color} /></group>
    </group>
  );
}

/** A private cabana: four posts, a canopy, curtains and a daybed. */
export function Cabana({ color = "#f5f5f4" }: { color?: string }) {
  return (
    <group>
      <Box args={[2, 0.35, 1.6]} position={[0, 0.18, 0]} color="#e7e5e4" />
      <Box args={[1.8, 0.15, 1.4]} position={[0, 0.42, 0]} color="#ffffff" />
      {[[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.08, 2.4, 0.08]} position={[x, 1.2, z]} color="#d6d3d1" />)}
      <Box args={[2.2, 0.08, 1.8]} position={[0, 2.42, 0]} color={color} />
      <mesh position={[-1, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.6, 2]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

/** A red-and-white lifeguard tower. */
export function LifeguardTower() {
  return (
    <group>
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.1, 1.6, 0.1]} position={[x, 0.8, z]} color="#e7e5e4" />)}
      <Box args={[1.4, 1, 1.4]} position={[0, 2.1, 0]} color="#dc2626" />
      <Box args={[1.6, 0.1, 1.6]} position={[0, 2.65, 0]} color="#f8fafc" />
      <Box args={[0.9, 0.4, 0.05]} position={[0, 2.15, 0.71]} color="#fef3c7" />
    </group>
  );
}

/** A swimming pool sunk into the deck: water, a stone coping and steps at one end. */
export function Pool({ w, d, color = "#0ea5e9" }: { w: number; d: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(s.clock.elapsedTime * 1.4) * 0.07;
  });
  return (
    <group>
      {/* coping around the edge */}
      <Box args={[w + 0.6, 0.08, 0.3]} position={[0, 0.04, -d / 2 - 0.15]} color="#f5f5f4" />
      <Box args={[w + 0.6, 0.08, 0.3]} position={[0, 0.04, d / 2 + 0.15]} color="#f5f5f4" />
      <Box args={[0.3, 0.08, d]} position={[-w / 2 - 0.15, 0.04, 0]} color="#f5f5f4" />
      <Box args={[0.3, 0.08, d]} position={[w / 2 + 0.15, 0.04, 0]} color="#f5f5f4" />
      <mesh ref={ref} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} emissive="#38bdf8" emissiveIntensity={0.3} metalness={0.2} roughness={0.08} />
      </mesh>
      {/* the steps and a ladder */}
      {[0, 1, 2].map((k) => <Box key={k} args={[1.6, 0.02, 0.3]} position={[-w / 2 + 1.2, 0.035, d / 2 - 0.2 - k * 0.3]} color="#bae6fd" />)}
      <mesh position={[w / 2 - 0.4, 0.45, -d / 2 + 0.05]}><torusGeometry args={[0.25, 0.025, 6, 12, Math.PI]} /><meshStandardMaterial color="#e5e7eb" metalness={0.8} roughness={0.2} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- waterpark

/** A slide tower with twisting tube slides running down into the splash pool. */
export function SlideTower() {
  const slides = useMemo(() => {
    const make = (pts: Array<[number, number, number]>) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 80, 0.32, 10, false);
    return [
      { geo: make([[0.6, 7.6, 0], [2.6, 6.6, 0.8], [3.4, 4.8, -1.2], [1.6, 3.4, -2.4], [2.8, 1.6, -1], [4.6, 0.5, 1.6]]), color: "#f97316" },
      { geo: make([[-0.6, 7.6, 0], [-2.8, 6.4, -0.8], [-3.6, 4.4, 1.2], [-2, 2.8, 2.6], [-3.4, 1.2, 3.6], [-5, 0.5, 4.4]]), color: "#facc15" },
      // The near-vertical drop slide (like the Leap of Faith or Jumeirah Sceirah)
      { geo: make([[0, 7.6, 0.6], [0, 6, 2.2], [0, 2.2, 4.4], [0, 0.6, 6.4], [0, 0.4, 7.4]]), color: "#ec4899" },
    ];
  }, []);
  return (
    <group>
      {/* tower: four legs, decks and the top platform with a roof */}
      {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.25, 8, 0.25]} position={[x, 4, z]} color="#b45309" />)}
      {[2.5, 5, 7.5].map((y) => <Box key={y} args={[2.4, 0.15, 2.4]} position={[0, y, 0]} color="#d6bc8a" />)}
      <mesh position={[0, 8.6, 0]} castShadow><coneGeometry args={[1.9, 1.2, 4]} /><meshStandardMaterial color="#0e7490" /></mesh>
      {slides.map((s, i) => (
        <mesh key={i} geometry={s.geo} castShadow>
          <meshStandardMaterial color={s.color} roughness={0.35} side={THREE.DoubleSide} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

/** A lazy river: a ring of water around an island of palms. */
export function LazyRiver({ radius = 3.2 }: { radius?: number }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.9, radius, 48]} />
        <meshStandardMaterial color="#22d3ee" emissive="#38bdf8" emissiveIntensity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.25, 48]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      {[0, 1.6, 3.4, 5].map((a) => (
        <mesh key={a} position={[Math.cos(a) * (radius - 0.45), 0.12, Math.sin(a) * (radius - 0.45)]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.12, 8, 16]} /><meshStandardMaterial color={["#f97316", "#facc15", "#22c55e", "#ec4899"][Math.round(a) % 4]} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- spa

/** A massage table with a folded towel, between two candles. */
export function TreatmentBed() {
  return (
    <group>
      <Box args={[0.8, 0.12, 2]} position={[0, 0.75, 0]} color="#f5f5f4" />
      {[[-0.3, -0.85], [0.3, -0.85], [-0.3, 0.85], [0.3, 0.85]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.06, 0.7, 0.06]} position={[x, 0.35, z]} color="#a16207" />)}
      <Box args={[0.6, 0.06, 0.4]} position={[0, 0.84, 0.7]} color="#e7d3a8" />
      {[-0.7, 0.7].map((x) => <Candle key={x} position={[x, 0, -0.9]} />)}
    </group>
  );
}

export function Candle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.06, 0.06, 0.3, 10]} /><meshStandardMaterial color="#fefce8" /></mesh>
      <mesh position={[0, 0.34, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- theatre and cinema

/** Rows of theatre seats facing the stage (the -z direction). */
export function Seating({ rows = 5, perRow = 10, color = "#9f1239" }: { rows?: number; perRow?: number; color?: string }) {
  return (
    <group>
      {Array.from({ length: rows }, (_, r) => (
        <group key={r} position={[0, r * 0.12, r * 1.1]}>
          {Array.from({ length: perRow }, (_, i) => (
            <group key={i} position={[(i - (perRow - 1) / 2) * 0.75, 0, 0]}>
              <Box args={[0.6, 0.12, 0.55]} position={[0, 0.45, 0]} color={color} />
              <Box args={[0.6, 0.6, 0.1]} position={[0, 0.8, 0.25]} color={color} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A cinema screen showing a soft glow. */
export function CinemaScreen({ width }: { width: number }) {
  return (
    <group>
      <Box args={[width + 0.4, width * 0.45 + 0.4, 0.1]} position={[0, 2.6, 0]} color="#0f172a" />
      <mesh position={[0, 2.6, 0.06]}>
        <planeGeometry args={[width, width * 0.45]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#93c5fd" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- mosque

/** The mihrab: a pointed arch niche on the qibla wall, with gold trim. */
export function Mihrab() {
  const arch = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.9, 0);
    s.lineTo(-0.9, 2);
    s.quadraticCurveTo(-0.9, 3.1, 0, 3.6);
    s.quadraticCurveTo(0.9, 3.1, 0.9, 2);
    s.lineTo(0.9, 0);
    s.lineTo(-0.9, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <group>
      <mesh geometry={arch} position={[0, 0, 0.02]} scale={[1.25, 1.1, 1]}><meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} /></mesh>
      <mesh geometry={arch} position={[0, 0.1, 0.04]}><meshStandardMaterial color="#0f766e" /></mesh>
    </group>
  );
}

/** A large ring chandelier of warm lights. */
export function RingChandelier({ radius = 1.6 }: { radius?: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.05, 6, 32]} /><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} /></mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 16) * Math.PI * 2) * radius, -0.12, Math.sin((i / 16) * Math.PI * 2) * radius]}>
          <sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#fff7e6" emissive="#fde68a" emissiveIntensity={1.6} />
        </mesh>
      ))}
      <pointLight intensity={6} distance={12} color="#fff1d6" />
    </group>
  );
}

// ---------------------------------------------------------------- ice rink

/** An ice rink: the ice surface with boards and a glass top around it. */
export function IceRink({ w, d, gateX }: { w: number; d: number; gateX?: number }) {
  // The boards round the ice, with a 1.2 m gap at the front where skaters step on.
  const gap = 1.2;
  const front: Array<[number, number]> = gateX === undefined ? [[-w / 2, w / 2]] : [[-w / 2, gateX - gap / 2], [gateX + gap / 2, w / 2]];
  const boards: Array<[number, number, number, number]> = [
    [0, -d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d],
    ...front.map(([a, b]) => [(a + b) / 2, d / 2, b - a, 0.1] as [number, number, number, number]),
  ];
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f0f9ff" roughness={0.05} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1, 32]} /><meshStandardMaterial color="#ef4444" /></mesh>
      <Box args={[w, 0.03, 0.08]} position={[0, 0.03, 0]} color="#ef4444" />
      {boards.map(([x, z, bw, bd], i) => (
        <group key={i}>
          <Box args={[bw, 0.9, bd]} position={[x, 0.45, z]} color="#ffffff" />
          <mesh position={[x, 1.3, z]}><boxGeometry args={[bw, 0.8, bd]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.3} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- waterfront

/** A wooden dock with a traditional abra moored alongside. */
export function DockWithAbra() {
  return (
    <group>
      <Box args={[1.6, 0.15, 5]} position={[0, 0.25, 0]} color="#a16207" />
      {[-2.2, 0, 2.2].map((z) => [-0.75, 0.75].map((x) => <Box key={`${x}${z}`} args={[0.14, 0.7, 0.14]} position={[x, 0.2, z]} color="#78350f" />))}
      {/* the abra: a long wooden boat with a canopy */}
      <group position={[1.9, 0.18, 0]}>
        <Box args={[1.1, 0.35, 4.2]} position={[0, 0, 0]} color="#92400e" />
        <Box args={[0.9, 0.06, 3.6]} position={[0, 0.2, 0]} color="#d6a76c" />
        {[-1.4, 1.4].map((z) => [-0.4, 0.4].map((x) => <Box key={`${x}${z}`} args={[0.05, 0.9, 0.05]} position={[x, 0.65, z]} color="#78350f" />))}
        <Box args={[1.1, 0.05, 3.2]} position={[0, 1.12, 0]} color="#f5f5f4" />
      </group>
    </group>
  );
}

/** A food truck with a serving hatch. */
export function FoodTruck({ color = "#f8fafc", accent = "#0f172a" }: { color?: string; accent?: string }) {
  return (
    <group>
      <Box args={[4, 2.2, 2]} position={[0, 1.4, 0]} color={color} />
      <Box args={[1.2, 1.4, 2]} position={[2.6, 1, 0]} color={color} />
      <Box args={[2.6, 0.8, 0.05]} position={[-0.2, 1.7, 1.03]} color="#1f2937" />
      <Box args={[2.8, 0.12, 0.6]} position={[-0.2, 1.25, 1.3]} color={accent} />
      <Box args={[2.8, 0.1, 0.8]} position={[-0.2, 2.25, 1.35]} rotation={[0.3, 0, 0]} color={accent} />
      {[[-1.3, 1], [1.3, 1], [-1.3, -1], [1.3, -1], [2.6, 1], [2.6, -1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.2, 14]} /><meshStandardMaterial color="#111827" /></mesh>
      ))}
    </group>
  );
}

/** Kitesurfers' kites flying over the sea. */
export function Kites() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    ref.current?.children.forEach((c, i) => { c.position.y = 6 + i + Math.sin(s.clock.elapsedTime * 0.9 + i * 2) * 0.6; });
  });
  return (
    <group ref={ref}>
      {[[-5, "#f43f5e"], [1, "#facc15"], [6, "#22c55e"]].map(([x, c]) => (
        <mesh key={x as number} position={[x as number, 6, 0]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[1.2, 0.18, 6, 16, Math.PI]} /><meshStandardMaterial color={c as string} />
        </mesh>
      ))}
    </group>
  );
}

/** A sign standing on a post, for venues without walls to hang a name on. */
export function SignPost({ map }: { map: THREE.Texture }) {
  return (
    <group>
      <Box args={[0.12, 2.6, 0.12]} position={[-1.6, 1.3, 0]} color="#78716c" />
      <Box args={[0.12, 2.6, 0.12]} position={[1.6, 1.3, 0]} color="#78716c" />
      <mesh position={[0, 2.3, 0.07]}>
        <planeGeometry args={[3.4, 0.64]} />
        <meshStandardMaterial map={map} transparent />
      </mesh>
      <Box args={[3.5, 0.72, 0.06]} position={[0, 2.3, 0]} color="#0f172a" />
    </group>
  );
}

// ---------------------------------------------------------------- waterpark landmarks

/** A stepped sandstone temple (Aquaventure's Ziggurat) or a rocky mountain (Wild Wadi), ~8 m high. */
export function SlideMountain({ kind = "ziggurat" }: { kind?: "ziggurat" | "rock" }) {
  if (kind === "rock") {
    return (
      <group>
        {[[0, 1.6, 0, 3.2, 3.2], [0.4, 4.4, -0.2, 2.4, 2.6], [-0.2, 6.6, 0.1, 1.6, 2]].map(([x, y, z, r, h], i) => (
          <mesh key={i} position={[x, y, z]} castShadow receiveShadow><dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color={["#b45309", "#c2410c", "#d97706"][i]} roughness={0.95} flatShading /></mesh>
        ))}
        <Box args={[2, 0.2, 2]} position={[0, 7.7, 0]} color="#d6bc8a" />
        {/* the stairs riders climb */}
        <Box args={[1.2, 0.2, 6.4]} position={[STAIRS_X, 3.6, 3.2]} rotation={[-1.05, 0, 0]} color="#92400e" />
      </group>
    );
  }
  const tiers: Array<[number, number]> = [[6, 2], [4.8, 2], [3.6, 2], [2.4, 1.8]];
  let y = 0;
  return (
    <group>
      {tiers.map(([size, h], i) => {
        const g = (
          <group key={i}>
            <Box args={[size, h, size]} position={[0, y + h / 2, 0]} color={i % 2 ? "#e2c18f" : "#d6a76c"} />
            {/* carved band around each tier */}
            <Box args={[size + 0.06, 0.18, size + 0.06]} position={[0, y + h - 0.2, 0]} color="#0e7490" />
          </group>
        );
        y += h;
        return g;
      })}
      {/* the temple on top, with a teal roof */}
      <Box args={[1.6, 1, 1.6]} position={[0, y + 0.5, 0]} color="#f2e2bf" />
      <mesh position={[0, y + 1.4, 0]} castShadow><coneGeometry args={[1.3, 0.9, 4]} /><meshStandardMaterial color="#0e7490" /></mesh>
      {/* the stairs up the front */}
      <Box args={[1.2, 0.2, 6.4]} position={[STAIRS_X, 3.6, 3.2]} rotation={[-1.05, 0, 0]} color="#c08a52" />
    </group>
  );
}

/**
 * Slides from the top of the tower (shapes in rides/paths.ts, so riders follow them exactly): two twisting
 * tubes and the near-vertical drop slide. Aquaventure's second tube is the wide raft slide and its first
 * starts in a clear launch capsule; Wild Wadi's drop slide has a twin lane for racing.
 */
export function Slides({ through = false }: { through?: boolean }) {
  const slides = useMemo(() => {
    const make = (pts: P3[], r = SLIDE_RADIUS) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 90, r, 12, false);
    const list = [
      { geo: make(SLIDE_POINTS.twistA), color: "#f97316", clear: false },
      { geo: make(SLIDE_POINTS.twistB, through ? RAFT_RADIUS : SLIDE_RADIUS), color: "#facc15", clear: false },
      { geo: make(SLIDE_POINTS.drop), color: through ? "#bae6fd" : "#ec4899", clear: through },
    ];
    if (!through) list.push({ geo: make(SLIDE_POINTS.drop.map(([x, y, z]) => [x + TWIN_LANE, y, z] as P3)), color: "#a855f7", clear: false });
    return list;
  }, [through]);
  const [cx, cy, cz] = SLIDE_POINTS.twistA[0];
  return (
    <group>
      {slides.map((s, i) => (
        // Tinted, see-through plastic, so riders can be watched all the way down.
        <mesh key={i} geometry={s.geo} castShadow>
          <meshStandardMaterial color={s.color} roughness={0.25} side={THREE.DoubleSide} transparent opacity={s.clear ? 0.4 : 0.62} depthWrite={false} />
        </mesh>
      ))}
      {through && (
        // Poseidon's Revenge: the clear capsule riders stand in before the floor drops.
        <group position={[cx + 0.35, cy, cz + 0.55]}>
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.45, 0.45, 2.2, 20, 1, true]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.3} side={THREE.DoubleSide} roughness={0.05} /></mesh>
          <mesh position={[0, 2.25, 0]}><cylinderGeometry args={[0.5, 0.5, 0.12, 20]} /><meshStandardMaterial color="#0e7490" /></mesh>
          <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.5, 0.5, 0.06, 20]} /><meshStandardMaterial color="#0e7490" /></mesh>
        </group>
      )}
    </group>
  );
}

/** A glass-walled shark lagoon the drop slide's clear tube runs through, with sharks circling. */
export function SharkLagoon() {
  const fish = useRef<THREE.Group>(null);
  useFrame((s) => {
    fish.current?.children.forEach((c, i) => {
      const a = s.clock.elapsedTime * (0.5 + i * 0.12) + i * 2;
      c.position.set(Math.cos(a) * (1.3 + i * 0.2), 0.7 + (i % 3) * 0.5, Math.sin(a) * 1.1);
      c.rotation.y = -a;
    });
  });
  return (
    <group>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[4, 2.4, 3]} /><meshStandardMaterial color="#0369a1" transparent opacity={0.45} roughness={0.05} /></mesh>
      <Box args={[4.2, 0.2, 3.2]} position={[0, 0.1, 0]} color="#d6bc8a" />
      <group ref={fish}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i}>
            <mesh rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.16, 0.9, 8]} /><meshStandardMaterial color={i < 2 ? "#64748b" : "#f59e0b"} /></mesh>
            {i < 2 && <mesh position={[0, 0.18, 0]}><coneGeometry args={[0.08, 0.25, 4]} /><meshStandardMaterial color="#475569" /></mesh>}
          </group>
        ))}
      </group>
    </group>
  );
}

/** A wave pool: a big pool with a sloping beach entry and waves rolling in. */
export function WavePool({ w, d }: { w: number; d: number }) {
  const waves = useRef<THREE.Group>(null);
  useFrame((s) => {
    waves.current?.children.forEach((c, i) => {
      const z = waveZ(s.clock.elapsedTime, i, d);
      c.position.z = z;
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.75 * (1 - (z + d / 2) / d);
    });
  });
  return (
    <group>
      <Pool w={w} d={d} color="#0891b2" />
      <mesh position={[0, 0.035, d / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, 1.2]} /><meshStandardMaterial color="#5eead4" transparent opacity={0.8} /></mesh>
      <group ref={waves}>
        {Array.from({ length: WAVE_COUNT }, (_, i) => (
          <mesh key={i} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w - 0.2, 0.3]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.6} /></mesh>
        ))}
      </group>
    </group>
  );
}

/** An entrance arch with the park's name across it. */
export function EntranceArch({ map, color = "#0e7490" }: { map: THREE.Texture; color?: string }) {
  return (
    <group>
      <Box args={[0.6, 4, 0.6]} position={[-3, 2, 0]} color="#d6a76c" />
      <Box args={[0.6, 4, 0.6]} position={[3, 2, 0]} color="#d6a76c" />
      <Box args={[7, 0.9, 0.5]} position={[0, 4.3, 0]} color={color} />
      <mesh position={[0, 4.3, 0.26]}><planeGeometry args={[6.4, 0.75]} /><meshStandardMaterial map={map} transparent /></mesh>
      {[-3, 3].map((x) => <mesh key={x} position={[x, 4.6, 0]}><coneGeometry args={[0.5, 0.8, 4]} /><meshStandardMaterial color={color} /></mesh>)}
    </group>
  );
}

// ---------------------------------------------------------------- beach landmarks

/** The sea running out to the horizon: a huge water plane past the edge of the beach. */
export function OpenSea({ z = 0 }: { z?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + Math.sin(s.clock.elapsedTime * 0.9) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0.015, z - 60]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[220, 120]} />
      <meshStandardMaterial color="#0369a1" emissive="#0ea5e9" emissiveIntensity={0.15} metalness={0.2} roughness={0.15} />
    </mesh>
  );
}

/** A thatched beach hut over the bar. */
export function ThatchRoof({ width = 4, depth = 2.6 }: { width?: number; depth?: number }) {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <Box key={`${x}${z}`} args={[0.14, 2.8, 0.14]} position={[(x * width) / 2, 1.4, (z * depth) / 2]} color="#78350f" />)}
      <mesh position={[0, 3.2, 0]} castShadow><coneGeometry args={[Math.max(width, depth) * 0.8, 1.1, 4]} /><meshStandardMaterial color="#ca8a04" roughness={1} flatShading /></mesh>
    </group>
  );
}

/** A line of floating buoys marking the swim zone. */
export function BuoyLine({ width }: { width: number }) {
  return (
    <group>
      {Array.from({ length: Math.floor(width / 1.2) }, (_, i) => (
        <mesh key={i} position={[-width / 2 + i * 1.2, 0.12, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={i % 2 ? "#f8fafc" : "#f97316"} /></mesh>
      ))}
    </group>
  );
}

/** A jet ski bobbing on the water. */
export function JetSki({ color = "#e11d48" }: { color?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = 0.1 + Math.sin(s.clock.elapsedTime * 1.6) * 0.05; });
  return (
    <group ref={ref}>
      <Box args={[0.8, 0.35, 2.2]} position={[0, 0.15, 0]} color={color} />
      <Box args={[0.5, 0.25, 0.8]} position={[0, 0.42, 0.2]} color="#111827" />
      <Box args={[0.6, 0.08, 0.1]} position={[0, 0.65, -0.4]} color="#334155" />
    </group>
  );
}

/** A beach volleyball net. */
export function VolleyballNet() {
  return (
    <group>
      {[-3, 3].map((x) => <Box key={x} args={[0.1, 2.5, 0.1]} position={[x, 1.25, 0]} color="#e5e7eb" />)}
      {/* white tape along the top, dark netting below it */}
      <Box args={[6, 0.08, 0.03]} position={[0, 2.4, 0]} color="#f8fafc" />
      <mesh position={[0, 2.0, 0]}><planeGeometry args={[6, 0.75]} /><meshStandardMaterial color="#1e293b" transparent opacity={0.45} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 2.0, 0.001]}><planeGeometry args={[6, 0.75, 30, 4]} /><meshBasicMaterial color="#e2e8f0" wireframe side={THREE.DoubleSide} /></mesh>
      {/* court lines in the sand */}
      {[[-3, 0, 0.05, 8], [3, 0, 0.05, 8], [0, -4, 6, 0.05], [0, 4, 6, 0.05]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.014, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color="#38bdf8" /></mesh>
      ))}
    </group>
  );
}

/** A FlowRider surf machine: a curved foam slope with a sheet of water racing up it, and a deck at the top. */
export function FlowRider({ w, d }: { w: number; d: number }) {
  const sheet = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0ea5e9"; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + (i % 3) * 0.15})`; g.fillRect((i * 23) % 64, (i * 37) % 256, 2 + (i % 4) * 3, 14 + (i % 5) * 6); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  }, []);
  // The water races up the slope (the texture scrolls; reached through the mesh, not the memo).
  useFrame((_, dt) => {
    const map = (sheet.current?.material as THREE.MeshStandardMaterial | undefined)?.map;
    if (map) map.offset.y -= dt * 1.6;
  });
  // The slope rises from the front (+z) to the back (-z) along a quarter curve.
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d, 1, 24);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = THREE.MathUtils.clamp((pos.getY(i) + d / 2) / d, 0, 1); // 0 at the front, 1 at the back
      pos.setXYZ(i, pos.getX(i), 0.15 + Math.pow(v, 2.2) * 1.6, d / 2 - v * d);
    }
    g.computeVertexNormals();
    return g;
  }, [w, d]);
  return (
    <group>
      <mesh ref={sheet} geometry={geo} receiveShadow><meshStandardMaterial map={tex} color="#7dd3fc" emissive="#0284c7" emissiveIntensity={0.25} roughness={0.15} side={THREE.DoubleSide} /></mesh>
      {/* padded side walls and the deck riders drop in from */}
      {[-1, 1].map((k) => <Box key={k} args={[0.25, 1.9, d]} position={[k * (w / 2 + 0.12), 0.95, 0]} color="#1e3a8a" />)}
      <Box args={[w + 0.5, 0.2, 1]} position={[0, 1.85, -d / 2 - 0.5]} color="#e2e8f0" />
      <Box args={[w + 0.5, 0.14, 0.6]} position={[0, 0.07, d / 2 + 0.3]} color="#e2e8f0" />
    </group>
  );
}

/** A flamingo pool float (the one riders lie back on). */
export function FlamingoFloat() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} scale={[1, 1.45, 1]}><torusGeometry args={[0.55, 0.2, 10, 24]} /><meshStandardMaterial color="#f472b6" roughness={0.35} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} scale={[1, 1.45, 1]}><circleGeometry args={[0.55, 24]} /><meshStandardMaterial color="#fbcfe8" roughness={0.4} /></mesh>
      {/* neck and head at the back */}
      <mesh position={[0, 0.55, -0.85]} rotation={[0.35, 0, 0]}><cylinderGeometry args={[0.07, 0.11, 0.8, 10]} /><meshStandardMaterial color="#f472b6" /></mesh>
      <mesh position={[0, 0.95, -0.72]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color="#f472b6" /></mesh>
      <mesh position={[0, 0.92, -0.56]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.05, 0.16, 8]} /><meshStandardMaterial color="#1f2937" /></mesh>
    </group>
  );
}

/** A ring tube for lazy rivers and ring slides. */
export function RingTube({ color = "#f97316", radius = 0.42 }: { color?: string; radius?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.15, 10, 24]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
  );
}

/** A sandcastle built up in stages: 1 mound, 2 walls, 3 towers, 4 moat, 5 flag. */
export function SandCastle({ stage }: { stage: number }) {
  const sand = "#e8c88a", dark = "#d4b06f";
  return (
    <group>
      {stage >= 1 && <mesh position={[0, 0.12, 0]} castShadow receiveShadow><cylinderGeometry args={[0.5, 0.62, 0.24, 14]} /><meshStandardMaterial color={sand} roughness={1} /></mesh>}
      {stage >= 2 && (
        <group position={[0, 0.24, 0]}>
          {[[0, -0.34, 0.6, 0.08], [0, 0.34, 0.6, 0.08], [-0.34, 0, 0.08, 0.6], [0.34, 0, 0.08, 0.6]].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x, 0.09, z]} castShadow><boxGeometry args={[w, 0.18, d]} /><meshStandardMaterial color={dark} roughness={1} /></mesh>
          ))}
          <mesh position={[0, 0.16, 0]} castShadow><boxGeometry args={[0.36, 0.32, 0.36]} /><meshStandardMaterial color={sand} roughness={1} /></mesh>
        </group>
      )}
      {stage >= 3 && [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]].map(([x, z], i) => (
        <group key={i} position={[x, 0.24, z]}>
          <mesh position={[0, 0.17, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 0.34, 10]} /><meshStandardMaterial color={sand} roughness={1} /></mesh>
          <mesh position={[0, 0.39, 0]} castShadow><coneGeometry args={[0.1, 0.12, 10]} /><meshStandardMaterial color={dark} roughness={1} /></mesh>
        </group>
      ))}
      {stage >= 4 && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.66, 0.84, 28]} /><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.2} roughness={0.1} /></mesh>}
      {stage >= 5 && (
        <group position={[0, 0.56, 0]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.01, 0.01, 0.4, 6]} /><meshStandardMaterial color="#78350f" /></mesh>
          <mesh position={[0.09, 0.34, 0]}><planeGeometry args={[0.18, 0.11]} /><meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} /></mesh>
        </group>
      )}
    </group>
  );
}

/** A stand-up paddleboard (length along z) with the paddle. */
export function Paddleboard() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} scale={[0.36, 0.06, 1.5]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#f8fafc" roughness={0.4} /></mesh>
      <mesh position={[0, 0.085, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.4, 1.4]} /><meshStandardMaterial color="#0ea5e9" /></mesh>
    </group>
  );
}

/** A kite with its two lines down to the rider's hands (the rig places it: lines run to the origin). */
export function SurfKite({ to }: { to: [number, number, number] }) {
  const lines = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.6, 0, 0), new THREE.Vector3(...to), new THREE.Vector3(0.6, 0, 0), new THREE.Vector3(...to)]), [to]);
  return (
    <group>
      <mesh rotation={[0.25, 0, 0]}><torusGeometry args={[1.6, 0.22, 6, 18, Math.PI]} /><meshStandardMaterial color="#f43f5e" side={THREE.DoubleSide} /></mesh>
      <lineSegments geometry={lines}><lineBasicMaterial color="#1f2937" /></lineSegments>
    </group>
  );
}

/** A floating buoy marking a course gate; the next one to reach glows and bobs higher. */
export function CourseBuoy({ next, done }: { next: boolean; done: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = (next ? 0.25 : 0.12) + Math.sin(s.clock.elapsedTime * 2.4) * 0.05; });
  return (
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={done ? "#22c55e" : next ? "#facc15" : "#f97316"} emissive={next ? "#facc15" : "#000000"} emissiveIntensity={next ? 0.6 : 0} /></mesh>
      {next && <mesh position={[0, 1.4, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.22, 0.5, 4]} /><meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} /></mesh>}
    </group>
  );
}

// ---------------------------------------------------------------- bowling and karaoke

/** One bowling pin (12-inch spacing, ~38 cm tall): white with red neck stripes. */
export function Pin() {
  const geo = useMemo(() => new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.055, 0.08], [0.06, 0.14], [0.04, 0.24], [0.022, 0.28], [0.032, 0.33], [0.03, 0.37], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 14), []);
  return (
    <group>
      <mesh geometry={geo} castShadow><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
      {[0.255, 0.285].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.024, 0.026, 0.012, 12]} /><meshStandardMaterial color="#dc2626" /></mesh>)}
    </group>
  );
}

/** A bowling ball. */
export function BowlingBall({ color = "#7c3aed" }: { color?: string }) {
  return <mesh castShadow><sphereGeometry args={[0.11, 20, 16]} /><meshStandardMaterial color={color} roughness={0.15} metalness={0.3} /></mesh>;
}

/** The lane's pins at rest; lane 1 hides them while the player bowls (the ride draws live ones). */
function RestingPins({ live }: { live: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.visible = !(live && LANE_IN_USE.current); });
  return <group ref={ref}>{PIN_SPOTS.map(([x, z], i) => <group key={i} position={[x, 0, z]}><Pin /></group>)}</group>;
}

/** The lanes: polished wood with arrows, gutters, the pin deck, ball return and the score screen above. */
export function BowlingLanes({ accent = "#d97706" }: { accent?: string }) {
  const { lanes, laneWidth: w, foulZ, headPinZ } = BOWLING;
  const len = foulZ - headPinZ + 1.6;
  const mid = (foulZ + headPinZ - 1.6) / 2;
  return (
    <group>
      {lanes.map((x, li) => (
        <group key={li} position={[x, 0, 0]}>
          <mesh position={[0, 0.02, mid]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, len]} /><meshStandardMaterial color="#e0b47a" roughness={0.18} metalness={0.05} /></mesh>
          {/* guide arrows and the foul line */}
          {[-2, -1, 0, 1, 2].map((k) => <mesh key={k} position={[k * 0.17, 0.025, foulZ - 4.6]} rotation={[-Math.PI / 2, 0, Math.PI]}><circleGeometry args={[0.05, 3]} /><meshBasicMaterial color="#7c2d12" /></mesh>)}
          <mesh position={[0, 0.025, foulZ]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, 0.03]} /><meshBasicMaterial color="#111827" /></mesh>
          {/* gutters */}
          {[-1, 1].map((k) => <mesh key={k} position={[k * (w / 2 + 0.12), 0.01, mid]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.24, len]} /><meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.3} /></mesh>)}
          <group position={[0, 0.02, headPinZ]}><RestingPins live={li === 0} /></group>
          {/* the dark pit behind the pins and the hood over it */}
          <mesh position={[0, 0.6, headPinZ - 1.5]}><boxGeometry args={[w + 0.5, 1.2, 0.1]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, 1.35, headPinZ - 0.9]}><boxGeometry args={[w + 0.5, 0.3, 1.3]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} /></mesh>
          {/* ball return between the lanes, and the score screen */}
          <mesh position={[w / 2 + 0.55, 0.3, foulZ + 1.6]}><boxGeometry args={[0.35, 0.6, 1]} /><meshStandardMaterial color="#1f2937" /></mesh>
          {[0, 1].map((b) => <mesh key={b} position={[w / 2 + 0.55, 0.68, foulZ + 1.35 + b * 0.25]}><sphereGeometry args={[0.1, 14, 10]} /><meshStandardMaterial color={["#2563eb", "#16a34a"][b]} roughness={0.2} /></mesh>)}
          <mesh position={[0, 2.6, foulZ - 0.6]} rotation={[0.25, 0, 0]}><planeGeometry args={[0.9, 0.5]} /><meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={0.35} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** The karaoke stage: a low platform, a screen behind and a mic on its stand. */
export function KaraokeStage({ accent = "#d97706" }: { accent?: string }) {
  const { w, d, h } = BOWLING.stage;
  const screen = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 512, 256); grad.addColorStop(0, "#4c1d95"); grad.addColorStop(1, "#be185d");
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#ffffff"; g.font = "bold 54px sans-serif"; g.textAlign = "center"; g.fillText("🎤 KARAOKE", 256, 110);
    g.font = "32px sans-serif"; g.fillStyle = "#fde68a"; g.fillText("♪  sing along  ♪", 256, 170);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group>
      <Box args={[w, h, d]} position={[0, h / 2, 0]} color="#1c1917" />
      <mesh position={[0, h + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w - 0.1, d - 0.1]} /><meshStandardMaterial color="#292524" roughness={0.4} /></mesh>
      <mesh position={[0, h + 1.6, -d / 2 + 0.05]}><planeGeometry args={[2.6, 1.3]} /><meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.5} /></mesh>
      {/* the edge of the stage glows */}
      <mesh position={[0, h, d / 2]}><boxGeometry args={[w, 0.04, 0.04]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} /></mesh>
      <group position={[0, h, d / 2 - 0.7]}><MicStand /></group>
    </group>
  );
}

export function Microphone() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.018, 0.014, 0.14, 10]} /><meshStandardMaterial color="#111827" metalness={0.5} /></mesh>
      <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.03, 12, 10]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  );
}

function MicStand() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.012, 0.012, 1.5, 8]} /><meshStandardMaterial color="#111827" metalness={0.6} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.18, 0.18, 0.03, 16]} /><meshStandardMaterial color="#111827" /></mesh>
      <group position={[0, 1.42, 0.03]} rotation={[0.5, 0, 0]}><Microphone /></group>
    </group>
  );
}

// ---------------------------------------------------------------- ice rink

/** A penguin skating aid (the kind beginners push round the rink). */
export function SkatePenguin() {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} scale={[1, 1.35, 0.9]}><sphereGeometry args={[0.28, 16, 12]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0.42, 0.13]} scale={[0.8, 1.15, 0.6]}><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      <mesh position={[0, 0.88, 0]}><sphereGeometry args={[0.17, 14, 12]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0.86, 0.17]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.04, 0.1, 8]} /><meshStandardMaterial color="#f59e0b" /></mesh>
      {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0.92, 0.14]}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      {/* the handle bar skaters hold */}
      <mesh position={[0, 0.95, -0.22]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.5, 8]} /><meshStandardMaterial color="#ef4444" /></mesh>
      {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.8, -0.18]}><cylinderGeometry args={[0.015, 0.015, 0.3, 6]} /><meshStandardMaterial color="#ef4444" /></mesh>)}
    </group>
  );
}

/** Disco night on the ice: a mirror ball and coloured lights sweeping the rink. */
export function DiscoLights({ w, d }: { w: number; d: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const spots = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ball.current) ball.current.rotation.y = t * 0.6;
    spots.current?.children.forEach((c, i) => {
      const a = t * (0.5 + i * 0.13) + i * 1.7;
      c.position.set(Math.cos(a) * w * 0.35, 0.035, Math.sin(a * 1.3) * d * 0.35);
    });
  });
  return (
    <group>
      <mesh ref={ball} position={[0, 5, 0]}><icosahedronGeometry args={[0.45, 1]} /><meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.15} flatShading /></mesh>
      <group ref={spots}>
        {["#f43f5e", "#22d3ee", "#a855f7", "#facc15", "#22c55e"].map((c) => (
          <mesh key={c} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.9, 24]} /><meshBasicMaterial color={c} transparent opacity={0.45} depthWrite={false} /></mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- restaurants

/** A teppanyaki grill counter: a steel hotplate the chef cooks on, facing the diners. */
export function GrillCounter() {
  const plate = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (plate.current) (plate.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + Math.sin(s.clock.elapsedTime * 3) * 0.05;
  });
  return (
    <group>
      <Box args={[1.9, 0.86, 0.8]} position={[0, 0.43, 0]} color="#292524" />
      <mesh ref={plate} position={[0, 0.875, 0]}><boxGeometry args={[1.7, 0.03, 0.6]} /><meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.3} emissive="#f97316" emissiveIntensity={0.15} /></mesh>
      {/* the diners' ledge */}
      <Box args={[1.9, 0.05, 0.3]} position={[0, 0.9, 0.52]} color="#a16207" />
      <mesh position={[0, 1.95, -0.1]}><boxGeometry args={[2, 0.25, 0.9]} /><meshStandardMaterial color="#44403c" metalness={0.6} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- spa

/** A steady pseudo-random number in 0..1 for particle i (the same every render). */
const hash = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/** A wooden sauna cabin with benches, hot stones and a glass door on its front (+z). */
export function SaunaCabin({ w, d }: { w: number; d: number }) {
  const stones = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (stones.current) (stones.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(s.clock.elapsedTime * 2) * 0.2;
  });
  const wood = "#b7793f", dark = "#8a5a2b", h = 2.3;
  return (
    <group>
      {/* back and side walls */}
      <Box args={[w, h, 0.08]} position={[0, h / 2, -d / 2]} color={wood} />
      {[-1, 1].map((k) => <Box key={k} args={[0.08, h, d]} position={[k * w / 2, h / 2, 0]} color={wood} />)}
      <Box args={[w, 0.08, d]} position={[0, h, 0]} color={dark} />
      {/* the front: wood either side of a glass door */}
      {[-1, 1].map((k) => <Box key={k} args={[w / 2 - 0.45, h, 0.08]} position={[k * (w / 4 + 0.225), h / 2, d / 2]} color={wood} />)}
      <mesh position={[0, h / 2, d / 2]}><boxGeometry args={[0.9, h, 0.03]} /><meshStandardMaterial color="#fde68a" transparent opacity={0.25} /></mesh>
      {/* two tiers of bench along the back, and the heater */}
      <Box args={[w - 0.2, 0.08, 0.5]} position={[0, 0.45, -d / 2 + 0.3]} color={dark} />
      <Box args={[w - 0.2, 0.08, 0.45]} position={[0, 0.85, -d / 2 + 0.27]} color={dark} />
      <Box args={[0.45, 0.6, 0.45]} position={[w / 2 - 0.35, 0.3, d / 2 - 0.4]} color="#374151" />
      <mesh ref={stones} position={[w / 2 - 0.35, 0.65, d / 2 - 0.4]}><dodecahedronGeometry args={[0.2, 0]} /><meshStandardMaterial color="#57534e" emissive="#ea580c" emissiveIntensity={0.5} flatShading /></mesh>
      <pointLight position={[0, 1.8, 0]} intensity={2} distance={3} color="#fdba74" />
    </group>
  );
}

/** A round jacuzzi with bubbling water. */
export function Jacuzzi({ r }: { r: number }) {
  const bubbles = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: 22 }, (_, i) => [hash(i, 1) * Math.PI * 2, hash(i, 2) * r * 0.85, hash(i, 3)]), [r]);
  useFrame((s) => {
    bubbles.current?.children.forEach((c, i) => {
      const [a, rad, ph] = seeds[i];
      const k = (s.clock.elapsedTime * 0.9 + ph) % 1;
      c.position.set(Math.cos(a) * rad, 0.45 + k * 0.06, Math.sin(a) * rad);
      c.scale.setScalar(0.4 + k);
    });
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[r + 0.18, r + 0.22, 0.5, 32, 1, true]} /><meshStandardMaterial color="#e7e5e4" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r, r + 0.2, 32]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
      <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r, 32]} /><meshStandardMaterial color="#5eead4" emissive="#14b8a6" emissiveIntensity={0.35} transparent opacity={0.85} /></mesh>
      <group ref={bubbles}>{seeds.map((_, i) => <mesh key={i}><sphereGeometry args={[0.035, 6, 5]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.7} /></mesh>)}</group>
    </group>
  );
}

/** Steam rising (sauna, hammam, jacuzzi). */
export function Steam({ w = 1, d = 1, rate = 1 }: { w?: number; d?: number; rate?: number }) {
  const ref = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: 14 }, (_, i) => [hash(i, 4) - 0.5, hash(i, 5) - 0.5, hash(i, 6)]), []);
  useFrame((s) => {
    ref.current?.children.forEach((c, i) => {
      const [x, z, ph] = seeds[i];
      const k = (s.clock.elapsedTime * 0.25 * rate + ph) % 1;
      c.position.set(x * w + Math.sin(k * 6 + i) * 0.1, k * 2, z * d);
      c.scale.setScalar(0.15 + k * 0.45);
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.35 * (1 - k);
    });
  });
  return <group ref={ref}>{seeds.map((_, i) => <mesh key={i} raycast={() => null}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>)}</group>;
}

// ---------------------------------------------------------------- attractions

const LANDMARK_GOLD = "#fbbf24";

/** One landmark as seen from an observation deck, in a recognisable silhouette, with a glowing beacon. */
export function LandmarkModel({ shape, height }: { shape: string; height: number }) {
  const glass = <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.25} />;
  return (
    <group>
      {shape === "fountain" && <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[9, 32]} /><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.5} /></mesh>}
      {shape === "fountain" && Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[(i - 3) * 2, 3, 0]}><cylinderGeometry args={[0.15, 0.5, 6, 8]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.8} /></mesh>)}
      {shape === "dhow" && <mesh position={[0, height / 2, 0]} rotation={[0, 0, 0.3]}><coneGeometry args={[6, height, 4]} />{glass}</mesh>}
      {shape === "ring" && <mesh position={[0, height / 2 + 2, 0]}><torusGeometry args={[height / 2, height / 5, 12, 32]} /><meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} /></mesh>}
      {shape === "spire" && <><mesh position={[0, height * 0.35, 0]}><cylinderGeometry args={[3, 6, height * 0.7, 6]} />{glass}</mesh><mesh position={[0, height * 0.85, 0]}><cylinderGeometry args={[0.3, 2.5, height * 0.3, 6]} />{glass}</mesh></>}
      {shape === "frame" && <><mesh position={[-6, height / 2, 0]}><boxGeometry args={[3, height, 3]} /><meshStandardMaterial color={LANDMARK_GOLD} metalness={1} roughness={0.3} /></mesh><mesh position={[6, height / 2, 0]}><boxGeometry args={[3, height, 3]} /><meshStandardMaterial color={LANDMARK_GOLD} metalness={1} roughness={0.3} /></mesh><mesh position={[0, height - 1.5, 0]}><boxGeometry args={[15, 3, 3]} /><meshStandardMaterial color={LANDMARK_GOLD} metalness={1} roughness={0.3} /></mesh></>}
      {shape === "arch" && <><mesh position={[-7, height / 2, 0]}><boxGeometry args={[6, height, 6]} /><meshStandardMaterial color="#fda4af" /></mesh><mesh position={[7, height / 2, 0]}><boxGeometry args={[6, height, 6]} /><meshStandardMaterial color="#fda4af" /></mesh><mesh position={[0, height - 3, 0]}><boxGeometry args={[20, 6, 6]} /><meshStandardMaterial color="#fb7185" /></mesh></>}
      {shape === "wheel" && <><mesh position={[0, height / 2 + 4, 0]}><torusGeometry args={[height / 2, 0.8, 8, 40]} /><meshStandardMaterial color="#e2e8f0" metalness={0.8} /></mesh>{[-1, 1].map((k) => <mesh key={k} position={[k * 4, height / 4 + 2, 0]} rotation={[0, 0, k * 0.25]}><boxGeometry args={[1, height / 2 + 4, 1]} /><meshStandardMaterial color="#cbd5e1" /></mesh>)}</>}
      {shape === "sail" && <mesh position={[0, height / 2, 0]} scale={[1, 1, 0.35]}><coneGeometry args={[8, height, 3]} /><meshStandardMaterial color="#f8fafc" /></mesh>}
      {shape === "palm" && <>{Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[(i - 3.5) * 5, 0.1, -10]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.5, 26]} /><meshStandardMaterial color="#fde68a" /></mesh>)}<mesh position={[0, 0.1, 6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6, 20]} /><meshStandardMaterial color="#fde68a" /></mesh></>}
      {/* the beacon marking it */}
      <mesh position={[0, Math.max(height, 4) + 5, 0]}><sphereGeometry args={[1.6, 14, 10]} /><meshStandardMaterial color={LANDMARK_GOLD} emissive={LANDMARK_GOLD} emissiveIntensity={1.4} /></mesh>
    </group>
  );
}

/** A city spread out around a point, seen from high up: towers, roads, the sea on one side, and named
    landmarks. Only drawn during rides that go up (it's far bigger than any room). */
export function CityBelow({ landmarks = [], seaBearing = 300 }: { landmarks?: Array<{ name: string; bearing: number; dist: number; height: number; shape: string }>; seaBearing?: number }) {
  const towers = useRef<THREE.InstancedMesh>(null);
  const N = 170;
  const spots = useMemo(() => {
    const out: Array<[number, number, number, number]> = [];
    for (let i = 0; out.length < N && i < N * 4; i++) {
      const a = hash(i, 11) * Math.PI * 2, r = 32 + hash(i, 12) * 150;
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      // Not in the sea, and not on top of a landmark.
      const bearing = ((a * 180) / Math.PI + 360) % 360;
      if (Math.abs(((bearing - seaBearing + 540) % 360) - 180) < 50 && r > 60) continue;
      if (landmarks.some((l) => Math.hypot(x - Math.sin((l.bearing * Math.PI) / 180) * l.dist, z + Math.cos((l.bearing * Math.PI) / 180) * l.dist) < 16)) continue;
      // Towers get taller further out, so nothing nearby rises past the deck and blocks the view.
      out.push([x, z, Math.min(6 + hash(i, 13) ** 2 * 60, 4 + (r - 32) * 0.45), 3 + hash(i, 14) * 5]);
    }
    return out;
  }, [landmarks, seaBearing]);
  useEffect(() => {
    const m = towers.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    spots.forEach(([x, z, h, w], i) => {
      d.position.set(x, h / 2, z); d.scale.set(w, h, w); d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(["#94a3b8", "#cbd5e1", "#64748b", "#a5b4fc", "#e2e8f0"][i % 5]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spots]);
  const sea = ((seaBearing * Math.PI) / 180);
  return (
    <group>
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[240, 48]} /><meshStandardMaterial color="#d6c7a8" roughness={1} /></mesh>
      <mesh position={[Math.sin(sea) * 210, -0.04, -Math.cos(sea) * 210]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[160, 48]} /><meshStandardMaterial color="#0369a1" emissive="#0ea5e9" emissiveIntensity={0.15} /></mesh>
      {/* a couple of big roads */}
      {[0, Math.PI / 2].map((r) => <mesh key={r} position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, r]}><planeGeometry args={[6, 460]} /><meshStandardMaterial color="#475569" /></mesh>)}
      <instancedMesh ref={towers} args={[undefined, undefined, spots.length]} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" metalness={0.35} roughness={0.4} />
      </instancedMesh>
      {landmarks.map((l) => {
        const b = (l.bearing * Math.PI) / 180;
        return <group key={l.name} position={[Math.sin(b) * l.dist, 0, -Math.cos(b) * l.dist]}><LandmarkModel shape={l.shape} height={l.height} /></group>;
      })}
    </group>
  );
}

/** A glass lift cabin (or an observation-wheel capsule). */
export function GlassLift({ capsule = false }: { capsule?: boolean }) {
  return capsule ? (
    <group>
      <mesh position={[0, 1.2, 0]} scale={[1, 0.75, 1]}><sphereGeometry args={[1.5, 24, 16]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.28} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[1.35, 1.35, 0.06, 24]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
    </group>
  ) : (
    <group>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[1.5, 2.5, 1.5]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.22} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[1.5, 0.06, 1.5]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} /></mesh>
      <mesh position={[0, 2.52, 0]}><boxGeometry args={[1.55, 0.06, 1.55]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} /></mesh>
    </group>
  );
}

/** The Dubai Frame's glass bridge: a walkway with a see-through floor and rails (runs along -x). */
export function GlassBridge({ length, cracks = 0 }: { length: number; cracks?: number }) {
  return (
    <group>
      <mesh position={[-length / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[length, 2.2]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={cracks ? 0.55 : 0.18} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[-1.1, 1.1].map((z) => <mesh key={z} position={[-length / 2, 1, z]}><boxGeometry args={[length, 0.05, 0.05]} /><meshStandardMaterial color={LANDMARK_GOLD} metalness={1} /></mesh>)}
      {[-1.1, 1.1].map((z) => <mesh key={`g${z}`} position={[-length / 2, 0.5, z]}><planeGeometry args={[length, 1]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    </group>
  );
}

/** A glass crack under the feet (the bridge's cracking effect). */
export function GlassCrack() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + hash(i, 21);
      let x = 0, z = 0;
      for (let k = 0; k < 4; k++) {
        pts.push(new THREE.Vector3(x, 0, z));
        x += Math.cos(a + (hash(i, k) - 0.5) * 0.8) * 0.18; z += Math.sin(a + (hash(i, k + 5) - 0.5) * 0.8) * 0.18;
        pts.push(new THREE.Vector3(x, 0, z));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return <lineSegments geometry={geo} position={[0, 0.02, 0]}><lineBasicMaterial color="#ffffff" /></lineSegments>;
}

/** An aquarium tunnel: an acrylic arch through a big tank, fish schools, and the star creature. */
export function AquariumTunnel({ length, target }: { length: number; target: "shark" | "manta" }) {
  const fish = useRef<THREE.Group>(null);
  const star = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    fish.current?.children.forEach((c, i) => {
      const a = t * (0.3 + hash(i, 31) * 0.3) + i;
      c.position.set(Math.sin(a) * (2.6 + hash(i, 32) * 2), 1 + hash(i, 33) * 4, ((hash(i, 34) - 0.5) * length) + Math.cos(a) * 2);
      c.rotation.y = a + Math.PI / 2;
    });
    if (star.current) {
      // Nose first along its loop (the models' noses point -x); a manta's wings flap.
      star.current.position.copy(tunnelCreatureAt(t, length));
      const a = t * 0.32, vx = Math.cos(a) * 2.2, vz = -Math.sin(a) * (length / 2 - 1.5);
      star.current.rotation.set(0, Math.atan2(vz, -vx), target === "manta" ? Math.sin(t * 2) * 0.2 : 0);
    }
  });
  return (
    <group>
      {/* the tank, lit blue, seen from inside */}
      <mesh position={[0, 3.5, 0]}><boxGeometry args={[11, 7, length + 2]} /><meshStandardMaterial color="#0c4a6e" side={THREE.BackSide} emissive="#075985" emissiveIntensity={0.5} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[11, length + 2]} /><meshStandardMaterial color="#c2b280" /></mesh>
      {/* the acrylic arch and its walkway */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.7, 1.7, length, 32, 1, true, -Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.8, length]} /><meshStandardMaterial color="#334155" /></mesh>
      <group ref={fish}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.08, 0.32, 6]} /><meshStandardMaterial color={["#fbbf24", "#f97316", "#38bdf8", "#e2e8f0"][i % 4]} /></mesh>
        ))}
      </group>
      <group ref={star}>
        {target === "shark" ? (
          <group>
            <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.7]}><coneGeometry args={[0.32, 2.3, 10]} /><meshStandardMaterial color="#64748b" /></mesh>
            <mesh position={[0.1, 0.32, 0]}><coneGeometry args={[0.12, 0.45, 4]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.18, 0.55, 4]} /><meshStandardMaterial color="#475569" /></mesh>
          </group>
        ) : (
          <group>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}><planeGeometry args={[1.9, 1.9]} /><meshStandardMaterial color="#1e293b" side={THREE.DoubleSide} /></mesh>
            <mesh position={[1.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 1.2, 4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          </group>
        )}
      </group>
      <pointLight position={[0, 4, 0]} intensity={8} distance={18} color="#7dd3fc" />
    </group>
  );
}

/** Where the star creature is at time t (matches AquariumTunnel), relative to the tunnel's centre. */
export function tunnelCreatureAt(t: number, length: number) {
  const a = t * 0.32;
  return new THREE.Vector3(Math.sin(a) * 2.2, 2.7 + Math.sin(t * 0.6) * 0.35, Math.cos(a) * (length / 2 - 1.5));
}

/** A marble plinth for a wax figure. */
export function Plinth() {
  return <group><Box args={[0.9, 0.35, 0.9]} position={[0, 0.175, 0]} color="#f5f5f4" /><Box args={[0.95, 0.04, 0.95]} position={[0, 0.37, 0]} color={LANDMARK_GOLD} /></group>;
}

/** The lobby's lift waiting at the ground floor (hidden while a ride is using it). */
export function WaitingLift({ capsule = false }: { capsule?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.visible = !LIFT_IN_USE.current; });
  return <group ref={ref}><GlassLift capsule={capsule} /></group>;
}

/** Wax figures on their plinths (they step aside while the selfie game uses its own). */
export function WaxGallery() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.visible = !WAX_IN_USE.current; });
  const figures = [
    { gender: "woman" as const, preset: "Female_Adult_01", pose: "armsUp" as const },
    { gender: "man" as const, preset: "Male_Adult_08", pose: "armsCrossed" as const },
    { gender: "man" as const, preset: "Male_Adult_04", pose: "balance" as const },
  ];
  return (
    <group ref={ref}>
      {LOBBY.wax.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Plinth />
          <group position={[0, 0.39, 0]}><Suspense fallback={null}><CitizenAvatar look={{ gender: figures[i].gender, preset: figures[i].preset }} animation="idle" pose={figures[i].pose} /></Suspense></group>
        </group>
      ))}
    </group>
  );
}
