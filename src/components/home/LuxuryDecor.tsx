"use client";

// Luxury furniture and decor drawn in code, each fitted to its footprint (`size` in grid cells, front
// facing +z): chandeliers, a grand piano, the fireplace, an aquarium, majlis seating, a canopy bed, the
// dining set and kitchen island, art, mirrors and the staircase of two-storey homes. Wall pieces are
// centred where the wall puts them (about 1.7 m up); ceiling pieces hang from the ceiling.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL, WALL_HEIGHT } from "@/lib/furniture";

type Ghost = "valid" | "invalid" | undefined;
const GOLD = "#c9a24a", BRASS = "#b8892e", MARBLE = "#f2efe9", WALNUT = "#5b3a24", VELVET = "#1f5c4a", IVORY = "#f3ead9";

/** A material, or the placement ghost's tint. */
function M({ color, ghost, metal = 0, rough = 0.6, emissive, glow = 0, opacity }: { color: string; ghost: Ghost; metal?: number; rough?: number; emissive?: string; glow?: number; opacity?: number }) {
  if (ghost) return <meshStandardMaterial color={ghost === "valid" ? "#34d399" : "#f87171"} transparent opacity={0.5} depthWrite={false} />;
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} emissive={emissive ?? "#000000"} emissiveIntensity={glow} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}

function B({ s, p, c, ghost, metal, rough, r, glow, emissive }: { s: [number, number, number]; p: [number, number, number]; c: string; ghost: Ghost; metal?: number; rough?: number; r?: [number, number, number]; glow?: number; emissive?: string }) {
  return (
    <mesh position={p} rotation={r} castShadow={!ghost} receiveShadow={!ghost} raycast={ghost ? () => null : undefined}>
      <boxGeometry args={s} />
      <M color={c} ghost={ghost} metal={metal} rough={rough} glow={glow} emissive={emissive} />
    </mesh>
  );
}

function Cyl({ r, h, p, c, ghost, metal, rough, top, seg = 16, rot }: { r: number; h: number; p: [number, number, number]; c: string; ghost: Ghost; metal?: number; rough?: number; top?: number; seg?: number; rot?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={rot} castShadow={!ghost} raycast={ghost ? () => null : undefined}>
      <cylinderGeometry args={[top ?? r, r, h, seg]} />
      <M color={c} ghost={ghost} metal={metal} rough={rough} />
    </mesh>
  );
}

/** A canvas texture drawn once. */
function useCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, [key]);
}

// ---------------------------------------------------------------- lighting

function ChandelierCrystal({ ghost }: { ghost: Ghost }) {
  const top = WALL_HEIGHT - 0.02;
  const drops = useMemo(() => [0.62, 0.44, 0.26].flatMap((r, tier) => Array.from({ length: 10 - tier * 2 }, (_, i) => {
    const a = (i / (10 - tier * 2)) * Math.PI * 2;
    return [Math.cos(a) * r, top - 0.95 + tier * 0.22, Math.sin(a) * r] as [number, number, number];
  })), [top]);
  return (
    <group>
      <Cyl r={0.02} h={0.55} p={[0, top - 0.28, 0]} c={GOLD} ghost={ghost} metal={0.9} rough={0.25} />
      {[0.62, 0.44, 0.26].map((r, i) => (
        <mesh key={r} position={[0, top - 0.88 + i * 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.015, 8, 40]} /><M color={GOLD} ghost={ghost} metal={0.9} rough={0.25} /></mesh>
      ))}
      {drops.map((p, i) => (
        <mesh key={i} position={p}><octahedronGeometry args={[0.04, 0]} /><M color="#ffffff" ghost={ghost} metal={0.1} rough={0.02} emissive="#fff7e0" glow={0.8} /></mesh>
      ))}
      {!ghost && <pointLight position={[0, top - 0.9, 0]} intensity={4} distance={6} color="#ffe7b0" />}
    </group>
  );
}

function ChandelierRing({ ghost }: { ghost: Ghost }) {
  const top = WALL_HEIGHT - 0.02;
  return (
    <group>
      {[0, 1, 2].map((i) => <Cyl key={i} r={0.006} h={0.5 + i * 0.25} p={[(i - 1) * 0.3, top - 0.25 - i * 0.125, 0]} c="#9ca3af" ghost={ghost} />)}
      {[0.55, 0.42, 0.3].map((r, i) => (
        <mesh key={r} position={[(i - 1) * 0.1, top - 0.6 - i * 0.25, 0]} rotation={[Math.PI / 2 - 0.2 * (i - 1), 0, 0]}>
          <torusGeometry args={[r, 0.022, 10, 48]} /><M color={GOLD} ghost={ghost} metal={0.9} rough={0.2} emissive="#ffd88a" glow={0.6} />
        </mesh>
      ))}
      {!ghost && <pointLight position={[0, top - 0.9, 0]} intensity={3.5} distance={6} color="#ffe2a8" />}
    </group>
  );
}

function PendantTrio({ w, ghost }: { w: number; ghost: Ghost }) {
  const top = WALL_HEIGHT - 0.02;
  return (
    <group>
      <B s={[w * 0.9, 0.03, 0.12]} p={[0, top - 0.02, 0]} c={BRASS} ghost={ghost} metal={0.8} />
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[k * w * 0.3, 0, 0]}>
          <Cyl r={0.005} h={0.9} p={[0, top - 0.45, 0]} c="#111827" ghost={ghost} />
          <mesh position={[0, top - 1.05, 0]}><sphereGeometry args={[0.16, 20, 14]} /><M color="#3f3a36" ghost={ghost} metal={0.3} rough={0.1} emissive="#ffcf87" glow={0.5} opacity={0.85} /></mesh>
        </group>
      ))}
      {!ghost && <pointLight position={[0, top - 1.1, 0]} intensity={2.5} distance={5} color="#ffd59a" />}
    </group>
  );
}

function TripodLamp({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <Cyl key={i} r={0.012} h={1.55} p={[Math.cos(a) * 0.12, 0.76, Math.sin(a) * 0.12]} c={BRASS} ghost={ghost} metal={0.85} rough={0.3} rot={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} />;
      })}
      <Cyl r={0.2} top={0.15} h={0.28} p={[0, 1.6, 0]} c={IVORY} ghost={ghost} rough={0.9} seg={20} />
      {!ghost && <pointLight position={[0, 1.5, 0]} intensity={1.2} distance={3} color="#ffd08a" />}
    </group>
  );
}

function Sconces({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      {[-1, 1].map((k) => (
        <group key={k} position={[k * (w / 2 - 0.15), 0.3, 0]}>
          <B s={[0.08, 0.2, 0.04]} p={[0, 0, 0.02]} c={BRASS} ghost={ghost} metal={0.85} />
          <Cyl r={0.07} top={0.05} h={0.16} p={[0, 0.12, 0.1]} c={IVORY} ghost={ghost} />
          {!ghost && <pointLight position={[0, 0.25, 0.15]} intensity={0.6} distance={1.6} color="#ffd08a" />}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- living

function GrandPiano({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  // The curved case from above: a straight left side and a bulging right side.
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = w * 0.42, hd = d * 0.46;
    s.moveTo(-hw, hd); s.lineTo(hw, hd); s.lineTo(hw, hd * 0.2);
    s.bezierCurveTo(hw, -hd * 0.3, hw * 0.1, -hd * 0.1, 0, -hd); s.lineTo(-hw, -hd); s.lineTo(-hw, hd);
    return s;
  }, [w, d]);
  return (
    <group>
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow={!ghost}><extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: false }]} /><M color="#0b0b0d" ghost={ghost} rough={0.12} metal={0.3} /></mesh>
      {/* the raised lid, keys and legs */}
      <mesh position={[0.1, 1.35, -0.05]} rotation={[-Math.PI / 2 + 0.75, 0, 0.35]}><shapeGeometry args={[shape]} /><M color="#0b0b0d" ghost={ghost} rough={0.12} metal={0.3} /></mesh>
      <B s={[w * 0.8, 0.04, 0.16]} p={[0, 0.72, d * 0.46 + 0.06]} c="#f8fafc" ghost={ghost} rough={0.3} />
      <B s={[w * 0.8, 0.03, 0.06]} p={[0, 0.745, d * 0.46 + 0.02]} c="#111111" ghost={ghost} />
      {[[-w * 0.36, d * 0.36], [w * 0.36, d * 0.36], [0, -d * 0.38]].map(([x, z], i) => <Cyl key={i} r={0.05} h={0.72} p={[x, 0.36, z]} c="#0b0b0d" ghost={ghost} />)}
      {/* bench */}
      <B s={[w * 0.5, 0.06, 0.32]} p={[0, 0.48, d / 2 - 0.05]} c="#0b0b0d" ghost={ghost} rough={0.2} />
      {[-1, 1].map((k) => <B key={k} s={[0.05, 0.46, 0.28]} p={[k * w * 0.22, 0.23, d / 2 - 0.05]} c="#0b0b0d" ghost={ghost} />)}
    </group>
  );
}

function Fireplace({ w, ghost }: { w: number; ghost: Ghost }) {
  const flameRef = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (flameRef.current) (flameRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(s.clock.elapsedTime * 7) * 0.4 + Math.sin(s.clock.elapsedTime * 13) * 0.2; });
  return (
    <group>
      <B s={[w, 1.2, 0.4]} p={[0, 0.6, -0.04]} c={MARBLE} ghost={ghost} rough={0.25} />
      <B s={[w * 0.8, 0.36, 0.02]} p={[0, 0.45, 0.17]} c="#111111" ghost={ghost} rough={0.2} />
      {!ghost && <mesh ref={flameRef} position={[0, 0.42, 0.185]}><planeGeometry args={[w * 0.72, 0.16]} /><meshStandardMaterial color="#ff8a1f" emissive="#ff6a00" emissiveIntensity={1.8} /></mesh>}
      <B s={[w + 0.1, 0.05, 0.46]} p={[0, 1.22, -0.04]} c={MARBLE} ghost={ghost} rough={0.25} />
      {!ghost && <pointLight position={[0, 0.5, 0.6]} intensity={1.2} distance={3} color="#ff9a3d" />}
    </group>
  );
}

function Aquarium({ w, ghost }: { w: number; ghost: Ghost }) {
  const fishRef = useRef<THREE.Group>(null);
  useFrame((s) => {
    fishRef.current?.children.forEach((f, i) => {
      const t = s.clock.elapsedTime * (0.4 + i * 0.07) + i * 1.3;
      f.position.set(Math.sin(t) * w * 0.4, 0.95 + (i % 4) * 0.12 + Math.sin(t * 2) * 0.03, Math.cos(t * 0.7) * 0.08);
      f.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI;
    });
  });
  return (
    <group>
      <B s={[w, 0.7, 0.45]} p={[0, 0.35, 0]} c={WALNUT} ghost={ghost} rough={0.5} />
      <mesh position={[0, 1.08, 0]}><boxGeometry args={[w, 0.75, 0.42]} /><M color="#0ea5e9" ghost={ghost} rough={0.05} opacity={0.42} emissive="#38bdf8" glow={0.25} /></mesh>
      <B s={[w, 0.05, 0.45]} p={[0, 0.74, 0]} c="#e9d8b4" ghost={ghost} />
      <B s={[w + 0.02, 0.06, 0.46]} p={[0, 1.48, 0]} c={WALNUT} ghost={ghost} />
      {!ghost && (
        <group ref={fishRef}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.03, 0.1, 6]} /><meshStandardMaterial color={["#f97316", "#facc15", "#38bdf8", "#f472b6"][i % 4]} emissive={["#f97316", "#facc15", "#38bdf8", "#f472b6"][i % 4]} emissiveIntensity={0.3} /></mesh>
          ))}
        </group>
      )}
      {[-0.3, 0.1, 0.4].map((x, i) => <Cyl key={i} r={0.04} top={0.01} h={0.25 + i * 0.08} p={[x * w, 0.88 + i * 0.04, -0.08]} c="#22c55e" ghost={ghost} />)}
    </group>
  );
}

function Majlis({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  const cushion = "#7f1d1d", back = "#b45309";
  return (
    <group>
      {/* an L of low seats along the back and left, with bolster backs, and a brass tray table */}
      <B s={[w, 0.22, 0.7]} p={[0, 0.11, -d / 2 + 0.35]} c={cushion} ghost={ghost} rough={0.9} />
      <B s={[0.7, 0.22, d - 0.7]} p={[-w / 2 + 0.35, 0.11, 0.35]} c={cushion} ghost={ghost} rough={0.9} />
      <B s={[w, 0.4, 0.18]} p={[0, 0.42, -d / 2 + 0.09]} c={back} ghost={ghost} rough={0.9} />
      <B s={[0.18, 0.4, d - 0.18]} p={[-w / 2 + 0.09, 0.42, 0.09]} c={back} ghost={ghost} rough={0.9} />
      {Array.from({ length: 4 }, (_, i) => <B key={i} s={[0.4, 0.3, 0.12]} p={[-w / 2 + 0.6 + i * 0.45, 0.37, -d / 2 + 0.24]} c={i % 2 ? GOLD : "#14532d"} ghost={ghost} rough={0.8} />)}
      <Cyl r={0.42} h={0.04} p={[0.3, 0.3, 0.3]} c={BRASS} ghost={ghost} metal={0.85} rough={0.3} seg={28} />
      <Cyl r={0.28} h={0.28} p={[0.3, 0.14, 0.3]} c={WALNUT} ghost={ghost} seg={8} />
      {/* a dallah coffee pot and cups */}
      <Cyl r={0.06} top={0.03} h={0.2} p={[0.3, 0.42, 0.3]} c={GOLD} ghost={ghost} metal={0.9} />
    </group>
  );
}

function Armchair({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.7, 0.18, d * 0.62]} p={[0, 0.38, 0.04]} c={VELVET} ghost={ghost} rough={0.85} />
      <B s={[w * 0.7, 0.62, 0.16]} p={[0, 0.66, -d * 0.3]} c={VELVET} ghost={ghost} rough={0.85} r={[-0.12, 0, 0]} />
      {[-1, 1].map((k) => <B key={k} s={[0.12, 0.3, d * 0.58]} p={[k * w * 0.36, 0.52, 0.02]} c={VELVET} ghost={ghost} rough={0.85} />)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} r={0.02} h={0.3} p={[x * w * 0.3, 0.15, z * d * 0.24]} c={BRASS} ghost={ghost} metal={0.9} />)}
    </group>
  );
}

function Ottoman({ ghost }: { ghost: Ghost }) {
  return <Cyl r={0.22} h={0.4} p={[0, 0.2, 0]} c="#8b4a2b" ghost={ghost} rough={0.5} seg={24} />;
}

function MediaWall({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w, 1.25, 0.05]} p={[0, -0.1, 0.02]} c={WALNUT} ghost={ghost} rough={0.5} />
      <B s={[w * 0.82, 1.0, 0.04]} p={[0, -0.05, 0.06]} c="#05070b" ghost={ghost} rough={0.15} emissive="#1d4ed8" glow={0.15} />
      <B s={[w * 0.9, 0.04, 0.02]} p={[0, -0.68, 0.06]} c="#ffd08a" ghost={ghost} emissive="#ffd08a" glow={1.2} />
    </group>
  );
}

// ---------------------------------------------------------------- bedroom

function CanopyBed({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  return (
    <group>
      {/* frame, mattress, duvet, pillows and the upholstered headboard */}
      <B s={[w * 0.9, 0.3, d * 0.86]} p={[0, 0.15, 0.05]} c={WALNUT} ghost={ghost} />
      <B s={[w * 0.86, 0.2, d * 0.82]} p={[0, 0.38, 0.06]} c="#fafaf9" ghost={ghost} rough={0.9} />
      <B s={[w * 0.88, 0.06, d * 0.5]} p={[0, 0.5, 0.3]} c="#e7dccb" ghost={ghost} rough={0.95} />
      {[-1, 1].map((k) => <B key={k} s={[w * 0.32, 0.12, 0.3]} p={[k * w * 0.2, 0.54, -d * 0.32]} c="#ffffff" ghost={ghost} rough={0.95} />)}
      <B s={[w * 0.9, 1.1, 0.12]} p={[0, 0.85, -d * 0.43]} c="#cbb79a" ghost={ghost} rough={0.9} />
      {/* brass posts, the top frame and sheer drapes at the corners */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} r={0.03} h={2.3} p={[x * w * 0.45, 1.15, z * d * 0.44 + 0.03]} c={BRASS} ghost={ghost} metal={0.9} rough={0.25} />)}
      {[-1, 1].map((k) => <B key={`x${k}`} s={[w * 0.92, 0.04, 0.04]} p={[0, 2.3, k * d * 0.44 + 0.03]} c={BRASS} ghost={ghost} metal={0.9} />)}
      {[-1, 1].map((k) => <B key={`z${k}`} s={[0.04, 0.04, d * 0.9]} p={[k * w * 0.45, 2.3, 0.03]} c={BRASS} ghost={ghost} metal={0.9} />)}
      {!ghost && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={`d${i}`} position={[x * w * 0.45 - x * 0.12, 1.4, z * d * 0.44 + 0.03]}><planeGeometry args={[0.28, 1.8]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      ))}
    </group>
  );
}

function Vanity({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.9, 0.06, 0.42]} p={[0, 0.76, 0]} c="#f5f5f4" ghost={ghost} rough={0.3} />
      {[-1, 1].map((k) => <B key={k} s={[0.05, 0.74, 0.38]} p={[k * w * 0.42, 0.37, 0]} c={GOLD} ghost={ghost} metal={0.8} />)}
      <B s={[w * 0.6, 0.8, 0.03]} p={[0, 1.3, -0.18]} c="#dbeafe" ghost={ghost} metal={0.9} rough={0.05} />
      {Array.from({ length: 8 }, (_, i) => {
        const left = i < 4, k = i % 4;
        return <mesh key={i} position={[left ? -w * 0.33 : w * 0.33, 0.98 + k * 0.18, -0.16]}><sphereGeometry args={[0.03, 10, 8]} /><M color="#fff7e0" ghost={ghost} emissive="#fff3c4" glow={1.5} /></mesh>;
      })}
      <Cyl r={0.17} h={0.45} p={[0, 0.23, 0.38]} c="#f9a8d4" ghost={ghost} rough={0.8} />
    </group>
  );
}

function Wardrobe({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.96, 2.3, 0.45]} p={[0, 1.15, 0]} c="#2b2522" ghost={ghost} rough={0.4} />
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i} position={[-w * 0.36 + i * w * 0.24, 0, 0.23]}>
          <B s={[w * 0.22, 2.1, 0.02]} p={[0, 1.15, 0]} c="#1e293b" ghost={ghost} metal={0.4} rough={0.1} />
          {[0.6, 1.1, 1.6].map((y) => <B key={y} s={[w * 0.2, 0.02, 0.02]} p={[0, y, 0.01]} c="#ffd08a" ghost={ghost} emissive="#ffd08a" glow={0.9} />)}
          <B s={[0.02, 0.3, 0.03]} p={[w * 0.09, 1.15, 0.02]} c={GOLD} ghost={ghost} metal={0.9} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- dining & kitchen

function DiningSet({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  const chairs: Array<[number, number, number]> = [[-0.6, -1, 0], [0, -1, 0], [0.6, -1, 0], [-0.6, 1, Math.PI], [0, 1, Math.PI], [0.6, 1, Math.PI]];
  return (
    <group>
      <B s={[w * 0.72, 0.05, d * 0.42]} p={[0, 0.76, 0]} c={MARBLE} ghost={ghost} rough={0.2} />
      {[-1, 1].map((k) => <B key={k} s={[0.1, 0.72, d * 0.3]} p={[k * w * 0.28, 0.37, 0]} c={GOLD} ghost={ghost} metal={0.85} rough={0.3} />)}
      {chairs.map(([x, z, yaw], i) => (
        <group key={i} position={[x * w * 0.42, 0, z * d * 0.36]} rotation={[0, yaw, 0]}>
          <B s={[0.44, 0.08, 0.44]} p={[0, 0.48, 0]} c="#6b2737" ghost={ghost} rough={0.85} />
          <B s={[0.44, 0.5, 0.06]} p={[0, 0.76, -0.2]} c="#6b2737" ghost={ghost} rough={0.85} />
          {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([lx, lz], j) => <Cyl key={j} r={0.015} h={0.46} p={[lx, 0.23, lz]} c={GOLD} ghost={ghost} metal={0.9} />)}
        </group>
      ))}
      {/* a centrepiece */}
      <Cyl r={0.08} top={0.05} h={0.22} p={[0, 0.9, 0]} c="#f5f5f4" ghost={ghost} />
    </group>
  );
}

function KitchenIsland({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.9, 0.86, d * 0.5]} p={[0, 0.43, -d * 0.12]} c="#e7e1d8" ghost={ghost} rough={0.4} />
      <B s={[w * 0.94, 0.05, d * 0.62]} p={[0, 0.89, -d * 0.06]} c={MARBLE} ghost={ghost} rough={0.15} />
      {/* waterfall ends */}
      {[-1, 1].map((k) => <B key={k} s={[0.05, 0.89, d * 0.62]} p={[k * w * 0.47, 0.445, -d * 0.06]} c={MARBLE} ghost={ghost} rough={0.15} />)}
      <B s={[0.4, 0.02, 0.3]} p={[w * 0.2, 0.92, -d * 0.12]} c="#1f2937" ghost={ghost} metal={0.6} />
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[k * w * 0.28, 0, d * 0.36]}>
          <Cyl r={0.17} h={0.06} p={[0, 0.66, 0]} c="#c4b5a0" ghost={ghost} />
          <Cyl r={0.02} h={0.63} p={[0, 0.32, 0]} c={GOLD} ghost={ghost} metal={0.9} />
          <Cyl r={0.15} h={0.02} p={[0, 0.01, 0]} c={GOLD} ghost={ghost} metal={0.9} />
        </group>
      ))}
    </group>
  );
}

function CoffeeBar({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.9, 0.04, 0.4]} p={[0, 0.85, 0]} c={WALNUT} ghost={ghost} />
      <B s={[w * 0.9, 0.04, 0.4]} p={[0, 0.35, 0]} c={WALNUT} ghost={ghost} />
      {[-1, 1].map((k) => <B key={k} s={[0.04, 0.85, 0.4]} p={[k * w * 0.44, 0.43, 0]} c={BRASS} ghost={ghost} metal={0.85} />)}
      <B s={[0.3, 0.34, 0.3]} p={[-w * 0.18, 1.04, 0]} c="#9ca3af" ghost={ghost} metal={0.8} rough={0.3} />
      <Cyl r={0.07} top={0.03} h={0.24} p={[w * 0.15, 0.99, 0]} c={GOLD} ghost={ghost} metal={0.9} />
      {[0, 1, 2].map((i) => <Cyl key={i} r={0.03} h={0.04} p={[w * 0.3, 0.89, -0.1 + i * 0.1]} c="#fafaf9" ghost={ghost} />)}
    </group>
  );
}

function DrinksCabinet({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.95, 2.1, 0.42]} p={[0, 1.05, 0]} c="#1c1917" ghost={ghost} rough={0.4} />
      <B s={[w * 0.88, 1.9, 0.02]} p={[0, 1.07, 0.21]} c="#0f172a" ghost={ghost} rough={0.05} metal={0.3} emissive="#f59e0b" glow={0.12} />
      {[0.5, 1.0, 1.5].map((y) => (
        <group key={y}>
          <B s={[w * 0.86, 0.02, 0.36]} p={[0, y, 0]} c="#ffd08a" ghost={ghost} emissive="#ffd08a" glow={0.9} />
          {Array.from({ length: 6 }, (_, i) => <Cyl key={i} r={0.035} h={0.3} p={[-w * 0.36 + i * w * 0.145, y + 0.16, 0]} c={["#166534", "#7f1d1d", "#f59e0b"][i % 3]} ghost={ghost} rough={0.1} />)}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- walls

function Frame({ w, h, ghost, children, gold = true }: { w: number; h: number; ghost: Ghost; children?: React.ReactNode; gold?: boolean }) {
  return (
    <group>
      <B s={[w, h, 0.04]} p={[0, 0, 0.02]} c={gold ? GOLD : "#111111"} ghost={ghost} metal={gold ? 0.85 : 0.2} rough={0.3} />
      {children}
    </group>
  );
}

function Mirror({ w, h, ghost }: { w: number; h: number; ghost: Ghost }) {
  return (
    <group position={[0, -0.25, 0]}>
      <B s={[w, h, 0.05]} p={[0, 0, 0.025]} c={GOLD} ghost={ghost} metal={0.9} rough={0.25} />
      <mesh position={[0, 0, 0.055]}><planeGeometry args={[w * 0.84, h * 0.88]} /><M color="#dbeafe" ghost={ghost} metal={1} rough={0.03} /></mesh>
      <mesh position={[0, h / 2, 0.03]} rotation={[0, 0, 0]}><cylinderGeometry args={[w / 2, w / 2, 0.05, 24, 1, false, -Math.PI / 2, Math.PI]} /><M color={GOLD} ghost={ghost} metal={0.9} rough={0.25} /></mesh>
    </group>
  );
}

function Art({ kind, w, h, ghost }: { kind: string; w: number; h: number; ghost: Ghost }) {
  const tex = useCanvas(512, Math.round((512 * h) / w), (g) => {
    const W = 512, H = Math.round((512 * h) / w);
    if (kind === "art-calligraphy") {
      g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "#d4af37"; g.lineWidth = 7; g.lineCap = "round";
      // Flowing gold strokes suggesting Thuluth script (not real text).
      for (let i = 0; i < 9; i++) {
        g.beginPath(); const x = 60 + i * 46;
        g.moveTo(x, H * 0.7); g.bezierCurveTo(x + 20, H * 0.2, x + 50, H * 0.25, x + 30, H * 0.75 - (i % 3) * 20); g.stroke();
      }
      g.beginPath(); g.moveTo(40, H * 0.78); g.bezierCurveTo(W * 0.3, H * 0.95, W * 0.7, H * 0.6, W - 40, H * 0.8); g.stroke();
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(90 + i * 70, H * 0.3, 6, 0, Math.PI * 2); g.fillStyle = "#d4af37"; g.fill(); }
    } else if (kind === "art-desert") {
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#f6b26b"); grad.addColorStop(0.45, "#f9d9a6"); grad.addColorStop(1, "#c98a4b");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff4d6"; g.beginPath(); g.arc(W * 0.7, H * 0.3, 30, 0, Math.PI * 2); g.fill();
      ["#d9984f", "#c27b3c", "#a8622b"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(W * (0.3 + i * 0.2), H * (0.45 + i * 0.12), W, H * (0.7 + i * 0.08)); g.lineTo(W, H); g.fill(); });
      g.fillStyle = "#111"; [W / 3, (2 * W) / 3].forEach((x) => g.fillRect(x - 2, 0, 4, H));
    } else {
      g.fillStyle = "#13233f"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = i % 3 ? "rgba(212,175,55,0.85)" : "rgba(255,255,255,0.6)"; g.lineWidth = 10 + (i % 4) * 8;
        g.beginPath(); g.moveTo(-20, H * (0.1 + i * 0.07)); g.bezierCurveTo(W * 0.3, H * (i % 2 ? 0.9 : 0.1), W * 0.6, H * 0.5, W + 20, H * (0.2 + i * 0.05)); g.stroke();
      }
    }
  }, `${kind}:${w}:${h}`);
  return (
    <Frame w={w} h={h} ghost={ghost} gold={kind !== "art-calligraphy"}>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w - 0.08, h - 0.08]} />
        {ghost ? <M color="" ghost={ghost} /> : <meshStandardMaterial map={tex} roughness={0.85} />}
      </mesh>
    </Frame>
  );
}

function Shelves({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      {[0.25, -0.25].map((y, k) => (
        <group key={y} position={[0, y, 0]}>
          <B s={[w, 0.04, 0.24]} p={[0, -0.1, 0.12]} c="#b48a5a" ghost={ghost} />
          {Array.from({ length: 5 }, (_, i) => <B key={i} s={[0.05, 0.22 + (i % 2) * 0.05, 0.16]} p={[-w * 0.4 + i * 0.07, 0.03, 0.12]} c={["#1e3a8a", "#7f1d1d", "#14532d", "#f5f5f4", "#b45309"][i]} ghost={ghost} />)}
          <Cyl r={0.06} top={0.04} h={0.2 + k * 0.05} p={[w * 0.25, 0.02, 0.12]} c={k ? GOLD : "#f5f5f4"} ghost={ghost} metal={k ? 0.9 : 0} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- decor

function Sculpture({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <B s={[0.36, 0.9, 0.36]} p={[0, 0.45, 0]} c={MARBLE} ghost={ghost} rough={0.2} />
      <group position={[0, 1.1, 0]}>
        <mesh scale={[1, 0.7, 1.6]}><sphereGeometry args={[0.08, 12, 10]} /><M color="#8c5a2b" ghost={ghost} metal={0.85} rough={0.3} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[k * 0.15, 0.06, 0]} rotation={[0, 0, k * 0.5]} scale={[1.6, 0.1, 0.8]}><sphereGeometry args={[0.12, 10, 8]} /><M color="#8c5a2b" ghost={ghost} metal={0.85} rough={0.3} /></mesh>)}
        <Cyl r={0.012} h={0.2} p={[0, -0.12, 0]} c="#8c5a2b" ghost={ghost} metal={0.85} />
      </group>
    </group>
  );
}

function Vase({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <Cyl r={0.16} top={0.1} h={0.7} p={[0, 0.35, 0]} c="#e7e1d8" ghost={ghost} rough={0.6} seg={20} />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.12, 1.15, Math.sin(a) * 0.12]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]}><coneGeometry args={[0.06, 0.6, 6]} /><M color="#e8d5b0" ghost={ghost} rough={1} /></mesh>;
      })}
    </group>
  );
}

function Palm({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <Cyl r={0.2} top={0.24} h={0.42} p={[0, 0.21, 0]} c="#2b2522" ghost={ghost} rough={0.5} />
      <Cyl r={0.05} top={0.04} h={1.4} p={[0, 1.1, 0]} c="#8b6b4a" ghost={ghost} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.35, 1.78, Math.sin(a) * 0.35]} rotation={[Math.sin(a) * 0.9, -a, -Math.cos(a) * 0.9]}><boxGeometry args={[0.7, 0.02, 0.16]} /><M color="#3f7d3a" ghost={ghost} /></mesh>;
      })}
    </group>
  );
}

function Orchids({ ghost }: { ghost: Ghost }) {
  return (
    <group>
      <Cyl r={0.18} top={0.2} h={0.5} p={[0, 0.25, 0]} c={MARBLE} ghost={ghost} rough={0.2} />
      {[-0.06, 0.06].map((x, k) => (
        <group key={x} position={[x, 0, 0]}>
          <Cyl r={0.006} h={0.55} p={[0, 0.78, 0]} c="#3f6212" ghost={ghost} />
          {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0.04 * (i % 2 ? 1 : -1), 0.85 + i * 0.06, 0.03 * k]}><sphereGeometry args={[0.035, 8, 6]} /><M color="#ffffff" ghost={ghost} emissive="#fdf2f8" glow={0.1} /></mesh>)}
        </group>
      ))}
    </group>
  );
}

function Console({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <B s={[w * 0.92, 0.05, 0.36]} p={[0, 0.82, 0]} c={MARBLE} ghost={ghost} rough={0.2} />
      {[-1, 1].map((k) => <B key={k} s={[0.04, 0.8, 0.3]} p={[k * w * 0.42, 0.4, 0]} c={GOLD} ghost={ghost} metal={0.9} />)}
      <Cyl r={0.08} top={0.06} h={0.34} p={[-w * 0.3, 1.02, 0]} c="#e7e1d8" ghost={ghost} />
      <Cyl r={0.14} top={0.1} h={0.18} p={[-w * 0.3, 1.27, 0]} c={IVORY} ghost={ghost} />
      <B s={[0.3, 0.06, 0.22]} p={[w * 0.15, 0.88, 0]} c="#1e3a8a" ghost={ghost} />
      <B s={[0.28, 0.05, 0.2]} p={[w * 0.15, 0.93, 0]} c="#f5f5f4" ghost={ghost} />
      {!ghost && <pointLight position={[-w * 0.3, 1.3, 0.2]} intensity={0.6} distance={2} color="#ffd08a" />}
    </group>
  );
}

function RugRound({ w, ghost }: { w: number; ghost: Ghost }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[w / 2, 48]} /><M color="#efe6d4" ghost={ghost} rough={1} /></mesh>
      {[0.85, 0.6, 0.35].map((k) => <mesh key={k} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[(w / 2) * k - 0.04, (w / 2) * k, 48]} /><M color={GOLD} ghost={ghost} rough={1} /></mesh>)}
    </group>
  );
}

function RugRunner({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  const tex = useCanvas(128, 384, (g) => {
    g.fillStyle = "#f3eee4"; g.fillRect(0, 0, 128, 384);
    g.strokeStyle = "#2b2522"; g.lineWidth = 4;
    for (let y = 0; y < 384; y += 48) { g.beginPath(); g.moveTo(20, y); g.lineTo(64, y + 24); g.lineTo(108, y); g.moveTo(20, y + 48); g.lineTo(64, y + 24); g.lineTo(108, y + 48); g.stroke(); }
  }, "runner");
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w * 0.92, d * 0.95]} />
      {ghost ? <M color="" ghost={ghost} /> : <meshStandardMaterial map={tex} roughness={1} />}
    </mesh>
  );
}

// ---------------------------------------------------------------- the staircase

/** Stairs up from the hall: ten oak treads on a stringer with a glass balustrade, rising towards -z. */
function Staircase({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  const steps = 10, rise = WALL_HEIGHT / steps, run = d / steps;
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => (
        <group key={i} position={[0, rise * (i + 1), d / 2 - run * (i + 0.5)]}>
          <B s={[w * 0.9, 0.05, run * 1.02]} p={[0, -0.025, 0]} c="#b48a5a" ghost={ghost} rough={0.5} />
          <B s={[w * 0.9, rise - 0.05, 0.02]} p={[0, -rise / 2, run / 2]} c="#f5f5f4" ghost={ghost} />
        </group>
      ))}
      {/* the stringer and a glass balustrade on the open side */}
      <mesh position={[-w * 0.47, WALL_HEIGHT / 2, 0]} rotation={[Math.atan2(WALL_HEIGHT, d), 0, 0]}><boxGeometry args={[0.06, 0.25, Math.hypot(WALL_HEIGHT, d)]} /><M color="#f5f5f4" ghost={ghost} /></mesh>
      <mesh position={[-w * 0.45, WALL_HEIGHT / 2 + 0.5, 0]} rotation={[Math.atan2(WALL_HEIGHT, d), 0, 0]}><boxGeometry args={[0.02, 0.9, Math.hypot(WALL_HEIGHT, d)]} /><M color="#bae6fd" ghost={ghost} opacity={0.3} rough={0.05} /></mesh>
      <mesh position={[-w * 0.45, WALL_HEIGHT / 2 + 0.95, 0]} rotation={[Math.atan2(WALL_HEIGHT, d), 0, 0]}><boxGeometry args={[0.04, 0.04, Math.hypot(WALL_HEIGHT, d)]} /><M color={GOLD} ghost={ghost} metal={0.9} /></mesh>
      {!ghost && <pointLight position={[0, 1.2, 0]} intensity={0.6} distance={2.5} color="#ffd08a" />}
    </group>
  );
}

/** Upstairs: the opening over the stairs (the top treads seen going down into it) with a railing round it. */
function Stairwell({ w, d, ghost }: { w: number; d: number; ghost: Ghost }) {
  // Nothing hangs below the floor (it would show past the cut-away walls): the treads are drawn on the
  // dark opening, getting darker as they go down.
  const steps = 6, run = d / 10;
  return (
    <group>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.92, d * 0.92]} /><M color="#1c1917" ghost={ghost} /></mesh>
      {!ghost && Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, 0.007, -d / 2 + run * (i + 0.6)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.84, run * 0.8]} />
          <meshStandardMaterial color="#b48a5a" transparent opacity={1 - i * 0.15} />
        </mesh>
      ))}
      {/* glass railing on three sides, open at the top of the stairs */}
      {[[-w / 2 + 0.03, 0, 0.04, d], [w / 2 - 0.03, 0, 0.04, d], [0, d / 2 - 0.03, w, 0.04]].map(([x, z, sx, sz], i) => (
        <group key={i}>
          <mesh position={[x, 0.5, z]}><boxGeometry args={[sx, 0.9, sz]} /><M color="#bae6fd" ghost={ghost} opacity={0.3} rough={0.05} /></mesh>
          <B s={[sx + 0.02, 0.04, sz + 0.02]} p={[x, 0.97, z]} c={GOLD} ghost={ghost} metal={0.9} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- dispatcher

/** The code-drawn look for a decor `visual`, fitted to `size` (grid cells). */
export function LuxuryDecor({ visual, size, ghost }: { visual: string; size: [number, number]; ghost?: Ghost }) {
  const w = size[0] * CELL, d = size[1] * CELL;
  switch (visual) {
    case "chandelier-crystal": return <ChandelierCrystal ghost={ghost} />;
    case "chandelier-ring": return <ChandelierRing ghost={ghost} />;
    case "pendant-trio": return <PendantTrio w={w} ghost={ghost} />;
    case "tripod-lamp": return <TripodLamp ghost={ghost} />;
    case "sconces": return <Sconces w={w} ghost={ghost} />;
    case "grand-piano": return <GrandPiano w={w} d={d} ghost={ghost} />;
    case "fireplace": return <Fireplace w={w} ghost={ghost} />;
    case "aquarium": return <Aquarium w={w} ghost={ghost} />;
    case "majlis": return <Majlis w={w} d={d} ghost={ghost} />;
    case "armchair": return <Armchair w={w} d={d} ghost={ghost} />;
    case "ottoman": return <Ottoman ghost={ghost} />;
    case "media-wall": return <MediaWall w={w} ghost={ghost} />;
    case "canopy-bed": return <CanopyBed w={w} d={d} ghost={ghost} />;
    case "vanity": return <Vanity w={w} ghost={ghost} />;
    case "wardrobe": return <Wardrobe w={w} ghost={ghost} />;
    case "dining-set": return <DiningSet w={w} d={d} ghost={ghost} />;
    case "kitchen-island": return <KitchenIsland w={w} d={d} ghost={ghost} />;
    case "coffee-bar": return <CoffeeBar w={w} ghost={ghost} />;
    case "drinks-cabinet": return <DrinksCabinet w={w} ghost={ghost} />;
    case "mirror": return <Mirror w={w} h={d} ghost={ghost} />;
    case "art-abstract": case "art-calligraphy": case "art-desert": return <Art kind={visual} w={w} h={d} ghost={ghost} />;
    case "shelves": return <Shelves w={w} ghost={ghost} />;
    case "sculpture": return <Sculpture ghost={ghost} />;
    case "vase": return <Vase ghost={ghost} />;
    case "palm": return <Palm ghost={ghost} />;
    case "orchids": return <Orchids ghost={ghost} />;
    case "console": return <Console w={w} ghost={ghost} />;
    case "rug-round": return <RugRound w={w} ghost={ghost} />;
    case "rug-runner": return <RugRunner w={w} d={d} ghost={ghost} />;
    case "staircase": return <Staircase w={w} d={d} ghost={ghost} />;
    case "stairwell": return <Stairwell w={w} d={d} ghost={ghost} />;
  }
  return null;
}
