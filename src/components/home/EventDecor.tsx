"use client";

// Event pieces for the hotel ballrooms (and any home party): drawn in code and fitted to their footprint
// (`w` x `d` metres, front facing +z), like LuxuryDecor. Banquet tables with their chairs and centrepiece, the
// kosha stage, a floral arch, an LED wall, a lit dance floor, the aisle runner, lanterns, the rose photo wall,
// the cake table, the DJ booth, a gilded gate and a fairy-light canopy. `tint` recolours the linens and accents.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WALL_HEIGHT } from "@/lib/furniture";

type Ghost = "valid" | "invalid" | undefined;
const GOLD = "#c9a24a";

function M({ color, ghost, metal = 0, rough = 0.6, glow = 0, emissive, opacity, side }: { color: string; ghost: Ghost; metal?: number; rough?: number; glow?: number; emissive?: string; opacity?: number; side?: THREE.Side }) {
  if (ghost) return <meshStandardMaterial color={ghost === "valid" ? "#34d399" : "#f87171"} transparent opacity={0.5} depthWrite={false} />;
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} emissive={emissive ?? "#000000"} emissiveIntensity={glow} transparent={opacity !== undefined} opacity={opacity ?? 1} side={side} />;
}

/** A round table for eight, dressed: cloth to the floor, chairs with sashes, a centrepiece of flowers and candles. */
export function BanquetTable({ w, d, ghost, tint = "#f8fafc" }: { w: number; d: number; ghost: Ghost; tint?: string }) {
  const r = Math.min(w, d) * 0.28;
  return (
    <group>
      <mesh position={[0, 0.74, 0]} castShadow={!ghost}><cylinderGeometry args={[r, r, 0.04, 32]} /><M color={tint} ghost={ghost} rough={0.9} /></mesh>
      <mesh position={[0, 0.37, 0]}><cylinderGeometry args={[r + 0.02, r + 0.08, 0.74, 32, 1, true]} /><M color={tint} ghost={ghost} rough={0.95} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2, cr = r + 0.38;
        return (
          <group key={i} position={[Math.cos(a) * cr, 0, Math.sin(a) * cr]} rotation={[0, -a - Math.PI / 2, 0]}>
            <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.42, 0.06, 0.42]} /><M color="#f5f5f4" ghost={ghost} /></mesh>
            <mesh position={[0, 0.78, -0.19]}><boxGeometry args={[0.42, 0.62, 0.05]} /><M color="#f5f5f4" ghost={ghost} /></mesh>
            <mesh position={[0, 0.7, -0.17]}><boxGeometry args={[0.44, 0.1, 0.07]} /><M color={GOLD} ghost={ghost} metal={0.5} rough={0.4} /></mesh>
            {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.22, z]}><cylinderGeometry args={[0.015, 0.015, 0.44, 6]} /><M color={GOLD} ghost={ghost} metal={0.7} /></mesh>)}
          </group>
        );
      })}
      <group position={[0, 0.76, 0]}>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.04, 0.09, 0.4, 12]} /><M color={GOLD} ghost={ghost} metal={0.8} rough={0.25} /></mesh>
        {Array.from({ length: 7 }).map((_, k) => <mesh key={k} position={[Math.cos(k) * 0.12, 0.45 + (k % 2) * 0.04, Math.sin(k) * 0.12]}><sphereGeometry args={[0.08, 8, 6]} /><M color={k % 3 ? "#fbcfe8" : "#f8fafc"} ghost={ghost} /></mesh>)}
        {[0, 2, 4].map((k) => <mesh key={k} position={[Math.cos(k) * 0.35, 0.06, Math.sin(k) * 0.35]}><cylinderGeometry args={[0.025, 0.025, 0.12, 8]} /><M color="#fffbeb" ghost={ghost} emissive="#fbbf24" glow={1.2} /></mesh>)}
      </group>
    </group>
  );
}

/** The kosha: a raised stage with a gilded arch and a sofa for the couple. */
export function Kosha({ w, d, ghost, tint = "#7f1d1d" }: { w: number; d: number; ghost: Ghost; tint?: string }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} receiveShadow={!ghost}><boxGeometry args={[w, 0.3, d]} /><M color="#f5f5f4" ghost={ghost} rough={0.4} /></mesh>
      <mesh position={[0, 0.31, d * 0.1]}><boxGeometry args={[w * 0.9, 0.02, d * 0.6]} /><M color={tint} ghost={ghost} rough={0.9} /></mesh>
      <mesh position={[0, 0.3, -d * 0.35]}><torusGeometry args={[w * 0.36, 0.08, 10, 40, Math.PI]} /><M color={GOLD} ghost={ghost} metal={0.8} rough={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.36, 0.3 + 0.0, -d * 0.35]}><cylinderGeometry args={[0.07, 0.07, 0.05, 10]} /><M color={GOLD} ghost={ghost} metal={0.8} /></mesh>)}
      <group position={[0, 0.3, -d * 0.18]}>
        <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.8, 0.4, 0.7]} /><M color={tint} ghost={ghost} rough={0.7} /></mesh>
        <mesh position={[0, 0.65, -0.3]}><boxGeometry args={[1.9, 0.6, 0.15]} /><M color={GOLD} ghost={ghost} metal={0.6} rough={0.35} /></mesh>
      </group>
      {Array.from({ length: 10 }).map((_, i) => { const a = (i / 9) * Math.PI; return <mesh key={i} position={[Math.cos(a) * w * 0.36, 0.3 + Math.sin(a) * w * 0.36, -d * 0.33]}><sphereGeometry args={[0.13, 8, 6]} /><M color={i % 2 ? "#fbcfe8" : "#f8fafc"} ghost={ghost} /></mesh>; })}
    </group>
  );
}

export function FloralArch({ w, ghost, tint = "#fbcfe8" }: { w: number; ghost: Ghost; tint?: string }) {
  const r = w * 0.45;
  return (
    <group>
      <mesh position={[0, 0, 0]}><torusGeometry args={[r, 0.06, 8, 40, Math.PI]} /><M color="#f8fafc" ghost={ghost} /></mesh>
      {Array.from({ length: 22 }).map((_, i) => { const a = (i / 21) * Math.PI; return <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0.05]}><sphereGeometry args={[0.13 + (i % 3) * 0.03, 8, 6]} /><M color={i % 3 ? tint : "#f8fafc"} ghost={ghost} /></mesh>; })}
      {[-1, 1].map((s) => <mesh key={s} position={[s * r, 0.05, 0]}><cylinderGeometry args={[0.18, 0.22, 0.1, 12]} /><M color="#e7e5e4" ghost={ghost} /></mesh>)}
    </group>
  );
}

/** A wall-mounted LED screen showing a slow colour wash (a wall piece: centred about 1.7 m up). */
export function LedWall({ w, h, ghost, tint = "#db2777" }: { w: number; h: number; ghost: Ghost; tint?: string }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current || ghost) return;
    mat.current.color.set(tint).offsetHSL(Math.sin(clock.elapsedTime * 0.3) * 0.08, 0, Math.sin(clock.elapsedTime * 0.9) * 0.08);
  });
  return (
    <group position={[0, -0.2, 0.04]}>
      <mesh position={[0, 0, -0.02]}><boxGeometry args={[w + 0.1, h + 0.1, 0.06]} /><M color="#111827" ghost={ghost} /></mesh>
      {ghost ? <mesh><planeGeometry args={[w, h]} /><M color="#000" ghost={ghost} /></mesh> : <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial ref={mat} color={tint} toneMapped={false} /></mesh>}
    </group>
  );
}

/** A dance floor of lit tiles, chequered and pulsing (a rug: it lies flat and can sit under people). */
export function DanceFloor({ w, d, ghost, tint = "#7c3aed" }: { w: number; d: number; ghost: Ghost; tint?: string }) {
  const tiles = useRef<THREE.Group>(null);
  const n = Math.max(2, Math.round(w / 0.5)), m = Math.max(2, Math.round(d / 0.5));
  useFrame(({ clock }) => {
    if (!tiles.current || ghost) return;
    const t = clock.elapsedTime;
    tiles.current.children.forEach((c, i) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + 0.6 * Math.max(0, Math.sin(t * 3 + (i % n) * 0.7 + Math.floor(i / n) * 0.9));
    });
  });
  return (
    <group ref={tiles} position={[0, 0.012, 0]}>
      {Array.from({ length: n * m }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + ((i % n) + 0.5) * (w / n), 0, -d / 2 + (Math.floor(i / n) + 0.5) * (d / m)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w / n - 0.02, d / m - 0.02]} />
          {ghost ? <M color="#000" ghost={ghost} /> : <meshStandardMaterial color={(i % n + Math.floor(i / n)) % 2 ? "#111827" : "#f8fafc"} emissive={tint} emissiveIntensity={0.4} roughness={0.2} metalness={0.3} />}
        </mesh>
      ))}
    </group>
  );
}

export function AisleRunner({ w, d, ghost, tint = "#f8fafc" }: { w: number; d: number; ghost: Ghost; tint?: string }) {
  return (
    <group position={[0, 0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.8, d]} /><M color={tint} ghost={ghost} rough={0.95} /></mesh>
      {Array.from({ length: Math.floor(d * 3) }).map((_, i) => <mesh key={i} position={[((i * 37) % 10) / 10 * w * 0.6 - w * 0.3, 0.004, -d / 2 + i / 3]} rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.05, 6]} /><M color="#f472b6" ghost={ghost} /></mesh>)}
    </group>
  );
}

export function Lantern({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.13, 0.16, 0.5, 6]} /><M color="#fef3c7" ghost={ghost} emissive="#f59e0b" glow={1.4} opacity={0.85} /></mesh>
      <mesh position={[0, 0.6, 0]}><coneGeometry args={[0.17, 0.15, 6]} /><M color={GOLD} ghost={ghost} metal={0.8} /></mesh>
      {!ghost && <pointLight position={[0, 0.35, 0]} intensity={0.8} distance={2.5} color="#fbbf24" />}
    </group>
  );
}

/** A wall of roses to have your photo taken against (a wall piece). */
export function RoseWall({ w, h, ghost, tint = "#f9a8d4" }: { w: number; h: number; ghost: Ghost; tint?: string }) {
  return (
    <group position={[0, -0.2, 0.06]}>
      <mesh><boxGeometry args={[w, h, 0.1]} /><M color={tint} ghost={ghost} rough={1} /></mesh>
      {Array.from({ length: 40 }).map((_, i) => <mesh key={i} position={[((i * 53) % 100) / 100 * w - w / 2, ((i * 29) % 100) / 100 * h - h / 2, 0.07]}><sphereGeometry args={[0.07, 6, 5]} /><M color={i % 4 ? "#f472b6" : "#f8fafc"} ghost={ghost} /></mesh>)}
    </group>
  );
}

/** The cake table: a five-tier cake on a gold stand. */
export function CakeTable({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.45, 0.45, 0.8, 24]} /><M color="#f8fafc" ghost={ghost} rough={0.9} /></mesh>
      <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.18, 0.22, 0.05, 16]} /><M color={GOLD} ghost={ghost} metal={0.8} /></mesh>
      {[0.32, 0.27, 0.22, 0.17, 0.12].map((r, i) => <mesh key={i} position={[0, 0.92 + i * 0.13, 0]}><cylinderGeometry args={[r, r, 0.13, 24]} /><M color={i % 2 ? "#fdf2f8" : "#ffffff"} ghost={ghost} rough={0.8} /></mesh>)}
      <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.06, 8, 6]} /><M color="#f472b6" ghost={ghost} /></mesh>
    </group>
  );
}

export function DjBooth({ w, ghost, tint = "#22d3ee" }: { w: number; ghost: Ghost; tint?: string }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow={!ghost}><boxGeometry args={[w * 0.9, 1, 0.7]} /><M color="#111827" ghost={ghost} /></mesh>
      <mesh position={[0, 0.5, 0.36]}><planeGeometry args={[w * 0.85, 0.5]} /><M color={tint} ghost={ghost} emissive={tint} glow={1.2} /></mesh>
      {[-0.35, 0.35].map((x) => <mesh key={x} position={[x, 1.02, 0]}><cylinderGeometry args={[0.18, 0.18, 0.03, 20]} /><M color="#374151" ghost={ghost} /></mesh>)}
    </group>
  );
}

export function GoldGate({ w, ghost }: { w: number; ghost: Ghost }) {
  const r = w * 0.42;
  return (
    <group>
      <mesh><torusGeometry args={[r, 0.07, 8, 32, Math.PI]} /><M color={GOLD} ghost={ghost} metal={0.85} rough={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r, 0.5, 0]}><cylinderGeometry args={[0.06, 0.06, 1, 10]} /><M color={GOLD} ghost={ghost} metal={0.85} /></mesh>)}
    </group>
  );
}

/** A canopy of fairy lights hung under the ceiling (a ceiling piece). */
export function FairyCanopy({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  return (
    <group position={[0, WALL_HEIGHT - 0.35, 0]}>
      {Array.from({ length: 90 }).map((_, i) => (
        <mesh key={i} position={[((i * 53) % 100) / 100 * w - w / 2, Math.sin(i) * 0.12, ((i * 31) % 100) / 100 * d - d / 2]}>
          <sphereGeometry args={[0.035, 6, 4]} />
          {ghost ? <M color="#000" ghost={ghost} /> : <meshBasicMaterial color="#fef9c3" toneMapped={false} />}
        </mesh>
      ))}
    </group>
  );
}

/** The dispatcher, called from LuxuryDecor for these visuals (null for anything else). */
export function eventDecor(visual: string, w: number, d: number, ghost: Ghost, tint?: string) {
  switch (visual) {
    case "banquet-table": return <BanquetTable w={w} d={d} ghost={ghost} tint={tint} />;
    case "kosha": return <Kosha w={w} d={d} ghost={ghost} tint={tint} />;
    case "floral-arch": return <FloralArch w={w} ghost={ghost} tint={tint} />;
    case "led-wall": return <LedWall w={w} h={d} ghost={ghost} tint={tint} />;
    case "dance-floor": return <DanceFloor w={w} d={d} ghost={ghost} tint={tint} />;
    case "aisle-runner": return <AisleRunner w={w} d={d} ghost={ghost} tint={tint} />;
    case "lantern": return <Lantern ghost={ghost} />;
    case "rose-wall": return <RoseWall w={w} h={d} ghost={ghost} tint={tint} />;
    case "cake-table": return <CakeTable ghost={ghost} />;
    case "dj-booth": return <DjBooth w={w} ghost={ghost} tint={tint} />;
    case "gold-gate": return <GoldGate w={w} ghost={ghost} />;
    case "fairy-canopy": return <FairyCanopy w={w} d={d} ghost={ghost} />;
  }
  return null;
}
