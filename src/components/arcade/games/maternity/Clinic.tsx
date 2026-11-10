"use client";

// What the scan room and the delivery suite share: the room (soft walls, a window, ceiling lights), the
// hospital bed, a wall monitor that shows a canvas (the ultrasound, or the baby's heartbeat), and the
// expecting family: which baby, its parents, and what the pregnancy allows today.

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FAMILY from "@/data/life/family.json";
import type { Child } from "@/lib/love";
import { useQuality } from "../../GameStage";

export const HOSPITAL_NAMES: Record<string, string> = { "latifa-hospital": "Latifa Women and Children Hospital", "dubai-hospital": "Dubai Hospital" };
const DAY = 86_400_000;

/** The baby on the way that this player is a parent of (the most recent), if any. */
export function expecting(children: Child[] | undefined, me: string | undefined) {
  return [...(children ?? [])].reverse().find((c) => !c.born && me && (c.mother.id === me || c.father.id === me)) ?? null;
}

/**
 * Development only (the /dev/arcade preview, never in production): a pretend pregnancy, so the scan and birth
 * can be played without one. `scans` sets which scans are done; the due date is an hour away.
 */
export function demoChild(params: Record<string, unknown> | undefined, me: string | undefined, scans: number[]): Child | null {
  if (process.env.NODE_ENV === "production" || !params?.demo || !me) return null;
  const now = Date.now();
  return {
    id: -1, name: null, gender: "girl", conceivedAt: new Date(now - 6.9 * DAY).toISOString(), dueAt: new Date(now + 3_600_000).toISOString(), born: false, nannyUntil: null,
    mother: { id: me, username: "you" }, father: { id: "demo-partner", username: "partner" }, careToday: [], careRecent: 0, scans,
  };
}

/** The next scan the pregnancy is ready for (1–3), the day the next one opens, or null when all are done. */
export function nextScan(c: Child, now: number): { stage: number } | { opensAt: number } | null {
  const done = c.scans ?? [];
  const conceived = Date.parse(c.conceivedAt);
  for (let s = 1; s <= 3; s++) {
    if (done.includes(s)) continue;
    const opens = conceived + FAMILY.maternity.scanFromDay[s - 1] * DAY;
    return now >= opens ? { stage: s } : { opensAt: opens };
  }
  return null;
}

/** When the mother can deliver at the hospital (a day before the due date). */
export const labourOpensAt = (c: Child) => Date.parse(c.dueAt) - FAMILY.maternity.deliverHoursBefore * 3_600_000;

export function ClinicRoom({ accent = "#db2777", wide = 7 }: { accent?: string; wide?: number }) {
  const tier = useQuality();
  return (
    <group>
      <hemisphereLight args={["#fdf2f8", "#cbd5e1", 0.9]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.4} castShadow={tier === 2} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 2.6, 0.5]} intensity={6} distance={7} color="#fff7ed" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[wide, 6]} /><meshStandardMaterial color="#e2e8f0" roughness={0.6} /></mesh>
      <mesh position={[0, 1.5, -2]}><planeGeometry args={[wide, 3]} /><meshStandardMaterial color="#f8fafc" roughness={0.9} /></mesh>
      <mesh position={[0, 0.5, -1.99]}><planeGeometry args={[wide, 1]} /><meshStandardMaterial color={accent} roughness={0.9} opacity={0.18} transparent /></mesh>
      <mesh position={[-wide / 2, 1.5, 1]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[6, 3]} /><meshStandardMaterial color="#f1f5f9" roughness={0.9} /></mesh>
      {/* A window onto the city */}
      <mesh position={[-wide / 2 + 0.01, 1.6, 0.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.6, 1.1]} /><meshBasicMaterial color="#bae6fd" toneMapped={false} /></mesh>
      {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 2.98, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.1, 0.4]} /><meshBasicMaterial color="#fffbeb" toneMapped={false} /></mesh>)}
    </group>
  );
}

/** A hospital bed with its head raised, the foot towards +x. */
export function Bed({ position = [0, 0, 0] as [number, number, number] }) {
  const frame = <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />;
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[2, 0.16, 0.95]} /><meshStandardMaterial color="#f8fafc" roughness={0.8} /></mesh>
      <mesh position={[-0.75, 0.82, 0]} rotation={[0, 0, -0.75]}><boxGeometry args={[0.7, 0.1, 0.9]} /><meshStandardMaterial color="#e0f2fe" roughness={0.8} /></mesh>
      <mesh position={[0.25, 0.65, 0]}><boxGeometry args={[1.2, 0.05, 0.92]} /><meshStandardMaterial color="#bfdbfe" roughness={0.9} /></mesh>
      {[-0.9, 0.9].map((x) => [-0.4, 0.4].map((z) => <mesh key={`${x}${z}`} position={[x, 0.26, z]}><cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />{frame}</mesh>))}
      <mesh position={[1.02, 0.78, 0]}><boxGeometry args={[0.05, 0.5, 0.95]} />{frame}</mesh>
    </group>
  );
}

/** A monitor on an arm, showing a canvas drawn elsewhere: re-uploaded whenever `version` changes. */
export function Monitor({ canvasRef, position, rotation = [0, 0, 0], size = [1.1, 0.8], version }: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  version: RefObject<number>;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const seenRef = useRef(-1);
  useEffect(() => {
    const c = canvasRef.current, m = matRef.current;
    if (!c || !m) return;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texRef.current = t;
    m.map = t;
    m.needsUpdate = true;
    return () => { t.dispose(); texRef.current = null; };
  }, [canvasRef]);
  useFrame(() => {
    if (texRef.current && version.current !== seenRef.current) { seenRef.current = version.current; texRef.current.needsUpdate = true; }
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}><boxGeometry args={[size[0] + 0.08, size[1] + 0.08, 0.05]} /><meshStandardMaterial color="#1f2937" roughness={0.5} /></mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial ref={matRef} toneMapped={false} color="#ffffff" />
      </mesh>
    </group>
  );
}
