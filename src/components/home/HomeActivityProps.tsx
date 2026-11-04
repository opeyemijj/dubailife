"use client";
/* eslint-disable react-hooks/immutability */

// What appears while you do things at home: a proper meal on the dining table (a whole roast chicken, a bowl of
// rice, beef stew, salad, bread), flakes falling into the aquarium, cooking or cleaning at the kitchen counter, and
// steam rising off hot food. Drawn in code, positioned on top of the furniture they belong to.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const noRay = () => null;

/** A shallow white dish (plate or platter); `oval` stretches it. */
function Dish({ r = 0.13, oval = 1, color = "#fafafa", y = 0 }: { r?: number; oval?: number; color?: string; y?: number }) {
  return (
    <group position={[0, y, 0]} scale={[oval, 1, 1]}>
      <mesh position={[0, 0.008, 0]} raycast={noRay}><cylinderGeometry args={[r, r * 0.82, 0.016, 32]} /><meshStandardMaterial color={color} roughness={0.25} /></mesh>
      <mesh position={[0, 0.017, 0]} raycast={noRay}><torusGeometry args={[r * 0.92, 0.008, 6, 32]} /><meshStandardMaterial color={color} roughness={0.25} /></mesh>
    </group>
  );
}

/** A bowl (open at the top) with something in it. */
function Bowl({ r = 0.09, color = "#f8fafc", fill, mound = 0.035 }: { r?: number; color?: string; fill: React.ReactNode; mound?: number }) {
  const geo = useMemo(() => {
    const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r * 0.55, 0), new THREE.Vector2(r * 0.85, r * 0.35), new THREE.Vector2(r, r * 0.7), new THREE.Vector2(r * 1.02, r * 0.72)];
    return new THREE.LatheGeometry(pts, 28);
  }, [r]);
  return (
    <group>
      <mesh geometry={geo} raycast={noRay}><meshStandardMaterial color={color} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      <group position={[0, r * 0.62, 0]} scale={[1, mound / (r * 0.9), 1]}>{fill}</group>
    </group>
  );
}

/** Basmati rice with saffron grains: a mound. */
function Rice({ r = 0.085 }: { r?: number }) {
  const grains = useMemo(() => Array.from({ length: 18 }, (_, i) => [Math.cos(i * 2.4) * r * 0.6 * ((i % 3) / 3 + 0.3), Math.sin(i * 2.4) * r * 0.6 * ((i % 3) / 3 + 0.3)] as [number, number]), [r]);
  return (
    <group>
      <mesh raycast={noRay}><sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f5ecd7" roughness={0.9} /></mesh>
      {grains.map(([x, z], i) => <mesh key={i} position={[x, r * 0.75, z]} raycast={noRay}><sphereGeometry args={[0.006, 6, 4]} /><meshStandardMaterial color={i % 2 ? "#f59e0b" : "#fbbf24"} /></mesh>)}
    </group>
  );
}

/** A whole roast chicken: golden-brown body, two drumsticks with bone tips, wings, a lemon and herbs on the platter. */
function RoastChicken() {
  const skin = "#b8651f", crisp = "#8a4513";
  return (
    <group>
      <Dish r={0.2} oval={1.35} />
      <group position={[0, 0.07, 0]}>
        <mesh scale={[1.25, 0.72, 0.95]} raycast={noRay}><sphereGeometry args={[0.085, 24, 16]} /><meshStandardMaterial color={skin} roughness={0.45} metalness={0.05} /></mesh>
        {/* the breast ridge, a little darker where it crisped */}
        <mesh position={[0, 0.045, 0]} scale={[1.1, 0.35, 0.55]} raycast={noRay}><sphereGeometry args={[0.07, 16, 10]} /><meshStandardMaterial color={crisp} roughness={0.5} /></mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[0.07, -0.005, s * 0.055]} rotation={[0, 0, -0.5]}>
            <mesh scale={[1.5, 0.85, 0.85]} raycast={noRay}><sphereGeometry args={[0.035, 14, 10]} /><meshStandardMaterial color={skin} roughness={0.45} /></mesh>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} raycast={noRay}><cylinderGeometry args={[0.008, 0.01, 0.05, 8]} /><meshStandardMaterial color="#f5f0e1" /></mesh>
            <mesh position={[0.088, 0, 0]} raycast={noRay}><sphereGeometry args={[0.012, 8, 6]} /><meshStandardMaterial color="#f5f0e1" /></mesh>
          </group>
        ))}
        {[-1, 1].map((s) => <mesh key={`w${s}`} position={[-0.055, 0.005, s * 0.075]} scale={[1.2, 0.6, 0.7]} raycast={noRay}><sphereGeometry args={[0.028, 12, 8]} /><meshStandardMaterial color={crisp} roughness={0.5} /></mesh>)}
      </group>
      {/* lemon wedges and rosemary */}
      {[[-0.17, 0.06], [-0.15, -0.07]].map(([x, z], i) => <mesh key={i} position={[x, 0.03, z]} rotation={[0, i, Math.PI / 2]} raycast={noRay}><cylinderGeometry args={[0.025, 0.025, 0.02, 12, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#facc15" /></mesh>)}
      {Array.from({ length: 6 }, (_, i) => <mesh key={`h${i}`} position={[0.16 + (i % 2) * 0.02, 0.025, -0.08 + i * 0.03]} rotation={[0, i, 0]} raycast={noRay}><boxGeometry args={[0.04, 0.006, 0.008]} /><meshStandardMaterial color="#15803d" /></mesh>)}
    </group>
  );
}

/** Beef stew in a cast-iron pot: chunks of beef, carrots and potatoes in a rich sauce. */
function BeefStew() {
  const chunks = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: Math.cos(i * 2.2) * 0.06 * ((i % 4) / 4 + 0.4), z: Math.sin(i * 2.2) * 0.06 * ((i % 4) / 4 + 0.4), k: i % 4 })), []);
  return (
    <group>
      <mesh position={[0, 0.045, 0]} raycast={noRay}><cylinderGeometry args={[0.11, 0.1, 0.09, 28, 1, true]} /><meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.002, 0]} raycast={noRay}><cylinderGeometry args={[0.1, 0.1, 0.004, 28]} /><meshStandardMaterial color="#1f2937" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.125, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} raycast={noRay}><torusGeometry args={[0.018, 0.006, 6, 12]} /><meshStandardMaterial color="#111827" /></mesh>)}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}><circleGeometry args={[0.1, 28]} /><meshStandardMaterial color="#7c2d12" roughness={0.35} /></mesh>
      {chunks.map((c, i) => (
        <mesh key={i} position={[c.x, 0.088, c.z]} rotation={[i, i * 0.7, 0]} raycast={noRay}>
          {c.k === 3 ? <cylinderGeometry args={[0.012, 0.012, 0.01, 10]} /> : <boxGeometry args={[0.028, 0.02, 0.024]} />}
          <meshStandardMaterial color={c.k === 3 ? "#f97316" : c.k === 2 ? "#e7d6a8" : "#5b2a14"} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** A green salad: leaves, tomato and cucumber. */
function Salad() {
  return (
    <Bowl r={0.075} color="#e2e8f0" mound={0.03} fill={
      <group>
        <mesh raycast={noRay}><sphereGeometry args={[0.065, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#4d7c0f" roughness={0.8} /></mesh>
        {[[0.02, 0.02], [-0.025, 0.01], [0.005, -0.03]].map(([x, z], i) => <mesh key={i} position={[x, 0.05, z]} raycast={noRay}><sphereGeometry args={[0.013, 10, 8]} /><meshStandardMaterial color="#dc2626" /></mesh>)}
      </group>
    } />
  );
}

/** Steam rising off hot food. */
function Steam({ spread = 0.08 }: { spread?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.35 + i / 5) % 1;
      m.position.set(Math.sin(i * 2 + t * 4) * spread * 0.4, 0.05 + t * 0.35, Math.cos(i * 3) * spread * 0.3);
      m.scale.setScalar(0.5 + t * 1.4);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - t);
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} raycast={noRay}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>)}
    </group>
  );
}

/** A place setting: a plate, a fork and knife, and a glass of juice. */
function Setting({ juice = "#f59e0b" }: { juice?: string }) {
  return (
    <group>
      <Dish r={0.11} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.14, 0.004, 0]} raycast={noRay}><boxGeometry args={[0.012, 0.004, 0.17]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>)}
      <group position={[0.17, 0, -0.12]}>
        <mesh position={[0, 0.06, 0]} raycast={noRay}><cylinderGeometry args={[0.028, 0.024, 0.12, 16, 1, true]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.045, 0]} raycast={noRay}><cylinderGeometry args={[0.025, 0.022, 0.085, 16]} /><meshStandardMaterial color={juice} transparent opacity={0.85} /></mesh>
      </group>
    </group>
  );
}

/** The meal laid out on a dining table top (centred at 0; the table is `w` × `d` metres, top at `y`). */
export function TableMeal({ kind, w, d, y }: { kind: string; w: number; d: number; y: number }) {
  const rowZ = d * 0.13;
  return (
    <group position={[0, y, 0]}>
      {/* two places set, facing each other */}
      <group position={[-w * 0.12, 0, rowZ]}><Setting /></group>
      <group position={[w * 0.12, 0, -rowZ]} rotation={[0, Math.PI, 0]}><Setting juice="#be123c" /></group>
      {kind === "roast" && (
        <>
          <group position={[0, 0, 0]}><RoastChicken /><Steam /></group>
          <group position={[-w * 0.22, 0, -rowZ * 0.6]}><Bowl fill={<Rice />} /></group>
          <group position={[w * 0.22, 0, rowZ * 0.6]}><Salad /></group>
          <mesh position={[w * 0.2, 0.008, -rowZ * 0.9]} scale={[1, 0.15, 0.8]} raycast={noRay}><sphereGeometry args={[0.07, 16, 10]} /><meshStandardMaterial color="#d6a35c" roughness={0.9} /></mesh>
        </>
      )}
      {kind === "stew" && (
        <>
          <group position={[0, 0, 0]}><BeefStew /><Steam /></group>
          <group position={[-w * 0.2, 0, -rowZ * 0.5]}><Bowl fill={<Rice />} /></group>
          <group position={[w * 0.2, 0, rowZ * 0.5]}><Bowl fill={<Rice />} /></group>
          <mesh position={[0.2, 0.008, -0.12]} scale={[1, 0.15, 0.8]} raycast={noRay}><sphereGeometry args={[0.07, 16, 10]} /><meshStandardMaterial color="#d6a35c" roughness={0.9} /></mesh>
        </>
      )}
      {kind === "breakfast" && (
        <>
          {[[-w * 0.12, rowZ], [w * 0.12, -rowZ]].map(([x, z], i) => (
            <group key={i} position={[x, 0.018, z]}>
              {[[-0.03, 0], [0.035, 0.02]].map(([ex, ez], j) => (
                <group key={j} position={[ex, 0, ez]}>
                  <mesh scale={[1, 0.12, 0.85]} raycast={noRay}><sphereGeometry args={[0.04, 16, 8]} /><meshStandardMaterial color="#fafafa" /></mesh>
                  <mesh position={[0, 0.006, 0]} scale={[1, 0.6, 1]} raycast={noRay}><sphereGeometry args={[0.015, 12, 8]} /><meshStandardMaterial color="#f59e0b" roughness={0.3} /></mesh>
                </group>
              ))}
              <mesh position={[0, 0.006, -0.06]} raycast={noRay}><boxGeometry args={[0.08, 0.012, 0.07]} /><meshStandardMaterial color="#c2864a" /></mesh>
            </group>
          ))}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.04, 0]} raycast={noRay}><cylinderGeometry args={[0.05, 0.06, 0.08, 20]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
            <mesh position={[0.06, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} raycast={noRay}><torusGeometry args={[0.02, 0.005, 6, 12]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
            <Steam spread={0.04} />
          </group>
        </>
      )}
    </group>
  );
}

/** Cooking or cleaning at the kitchen counter (top at `y`). */
export function CounterWork({ kind, w, y }: { kind: string; w: number; y: number }) {
  const sponge = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (sponge.current) { sponge.current.position.x = Math.sin(clock.elapsedTime * 4) * w * 0.25; sponge.current.position.z = Math.cos(clock.elapsedTime * 2.7) * 0.08; }
  });
  if (kind === "clean") {
    return (
      <group position={[0, y, 0]}>
        <group ref={sponge}>
          <mesh position={[0, 0.02, 0]} raycast={noRay}><boxGeometry args={[0.1, 0.035, 0.06]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[0, 0.042, 0]} raycast={noRay}><boxGeometry args={[0.1, 0.01, 0.06]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </group>
        <Sparkles w={w} />
      </group>
    );
  }
  // Cooking: a chopping board with chicken and herbs, a pan, and a pot on the go.
  return (
    <group position={[0, y, 0]}>
      <mesh position={[-w * 0.18, 0.01, 0]} raycast={noRay}><boxGeometry args={[0.36, 0.02, 0.24]} /><meshStandardMaterial color="#b07a44" roughness={0.8} /></mesh>
      <group position={[-w * 0.18, 0.035, 0]} scale={0.7}><mesh scale={[1.25, 0.72, 0.95]} raycast={noRay}><sphereGeometry args={[0.085, 18, 12]} /><meshStandardMaterial color="#f3c6a8" roughness={0.6} /></mesh></group>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[-w * 0.18 + 0.1, 0.024, -0.08 + i * 0.035]} raycast={noRay}><boxGeometry args={[0.03, 0.006, 0.01]} /><meshStandardMaterial color="#15803d" /></mesh>)}
      <mesh position={[-w * 0.18 - 0.13, 0.024, 0.06]} rotation={[0, 0.4, 0]} raycast={noRay}><boxGeometry args={[0.16, 0.004, 0.025]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>
      <group position={[w * 0.15, 0, 0]}>
        <mesh position={[0, 0.07, 0]} raycast={noRay}><cylinderGeometry args={[0.1, 0.09, 0.14, 24, 1, true]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.25} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}><circleGeometry args={[0.095, 24]} /><meshStandardMaterial color="#c2410c" roughness={0.4} /></mesh>
        <group position={[0, 0.1, 0]}><Steam spread={0.06} /></group>
      </group>
    </group>
  );
}

function Sparkles({ w }: { w: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 1.3 + i / 7) % 1;
      m.position.set(Math.sin(i * 3.1) * w * 0.35, 0.03 + t * 0.12, Math.cos(i * 1.7) * 0.12);
      m.scale.setScalar(Math.sin(t * Math.PI) * 1.2);
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} raycast={noRay}><octahedronGeometry args={[0.012, 0]} /><meshBasicMaterial color="#e0f2fe" /></mesh>)}
    </group>
  );
}

/** Feeding (flakes drifting down) or cleaning (bubbles rising) in a tank `w` wide, water from y0 to y1. */
export function TankActivity({ kind, w, y0, y1 }: { kind: string; w: number; y0: number; y1: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * (kind === "clean" ? 0.6 : 0.25) + i / 14) % 1;
      const x = Math.sin(i * 2.3) * w * 0.12 + Math.sin(clock.elapsedTime + i) * 0.02;
      m.position.set(x, kind === "clean" ? y0 + t * (y1 - y0) : y1 - t * (y1 - y0) * 0.8, Math.cos(i * 1.9) * 0.08);
    });
  });
  if (kind === "watch") return null;
  return (
    <group ref={g}>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} raycast={noRay}>
          {kind === "clean" ? <sphereGeometry args={[0.012, 8, 6]} /> : <boxGeometry args={[0.012, 0.003, 0.012]} />}
          <meshBasicMaterial color={kind === "clean" ? "#e0f2fe" : i % 2 ? "#f97316" : "#a16207"} transparent opacity={kind === "clean" ? 0.6 : 1} />
        </mesh>
      ))}
    </group>
  );
}
