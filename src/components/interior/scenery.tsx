"use client";

// Scenery for open-air and special venues: beaches, pool decks, waterparks, spas, theatres, mosques
// and the ice rink. Built from simple geometry at real-world scale (metres), like fixtures.tsx.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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
export function IceRink({ w, d }: { w: number; d: number }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f0f9ff" roughness={0.05} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1, 32]} /><meshStandardMaterial color="#ef4444" /></mesh>
      <Box args={[w, 0.03, 0.08]} position={[0, 0.03, 0]} color="#ef4444" />
      {[[0, -d / 2, w, 0.1], [0, d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d]].map(([x, z, bw, bd], i) => (
        <group key={i}>
          <Box args={[bw as number, 0.9, bd as number]} position={[x as number, 0.45, z as number]} color="#ffffff" />
          <mesh position={[x as number, 1.3, z as number]}><boxGeometry args={[bw as number, 0.8, bd as number]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.3} /></mesh>
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
      <Box args={[1.2, 0.2, 6.4]} position={[0, 3.6, 3.2]} rotation={[-1.05, 0, 0]} color="#c08a52" />
    </group>
  );
}

/** Slides from the top of the tower: two twisting tubes and the near-vertical drop slide. */
export function Slides({ through = false }: { through?: boolean }) {
  const slides = useMemo(() => {
    const make = (pts: Array<[number, number, number]>) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 90, 0.34, 10, false);
    return [
      { geo: make([[0.7, 7.8, 0], [3, 6.8, 0.6], [3.8, 5, -1.4], [2.2, 3.4, -2.6], [3.6, 1.6, -1.2], [5.4, 0.45, 0.8]]), color: "#f97316" },
      { geo: make([[-0.7, 7.8, 0], [-3, 6.6, -0.8], [-3.8, 4.6, 1.2], [-2.2, 3, 2.6], [-3.8, 1.4, 3.4], [-5.4, 0.45, 4.4]]), color: "#facc15" },
      // the drop slide: almost straight down, then out through the shark lagoon
      { geo: make([[0, 7.8, 0.8], [0, 7.2, 1.6], [0, 3, 3.4], [0, 0.9, 5.2], [0, 0.45, 7.6]]), color: through ? "#bae6fd" : "#ec4899" },
    ];
  }, [through]);
  return (
    <group>
      {slides.map((s, i) => (
        <mesh key={i} geometry={s.geo} castShadow>
          <meshStandardMaterial color={s.color} roughness={0.3} side={THREE.DoubleSide} transparent opacity={i === 2 && through ? 0.45 : 0.95} />
        </mesh>
      ))}
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
      const z = ((s.clock.elapsedTime * 1.2 + i * (d / 3)) % d) - d / 2;
      c.position.z = z;
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.75 * (1 - (z + d / 2) / d);
    });
  });
  return (
    <group>
      <Pool w={w} d={d} color="#0891b2" />
      <mesh position={[0, 0.035, d / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, 1.2]} /><meshStandardMaterial color="#5eead4" transparent opacity={0.8} /></mesh>
      <group ref={waves}>
        {[0, 1, 2].map((i) => (
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
      <Box args={[0.08, 2.4, 0.08]} position={[-3, 1.2, 0]} color="#e5e7eb" />
      <Box args={[0.08, 2.4, 0.08]} position={[3, 1.2, 0]} color="#e5e7eb" />
      <mesh position={[0, 2, 0]}><planeGeometry args={[6, 0.9]} /><meshStandardMaterial color="#f8fafc" transparent opacity={0.55} side={THREE.DoubleSide} wireframe /></mesh>
      <mesh position={[1, 0.15, 1.6]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#fde047" /></mesh>
    </group>
  );
}
