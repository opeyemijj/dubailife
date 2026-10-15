"use client";

// Food and drink as they arrive in the room: glasses, cups, plates and champagne bottles with
// bottle sparklers. Built in code, in metres, origin at the base so they sit on any surface.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import type { Product } from "@/lib/city/types";

export type ServeKind = "cocktail" | "mocktail" | "soda" | "coffee" | "tea" | "smoothie" | "plate" | "dessert" | "pastry" | "teaset" | "bottle";

const BY_ICON: Record<string, ServeKind> = {
  "🍸": "cocktail", "🍹": "mocktail", "🥤": "soda", "☕": "coffee", "🥛": "coffee", "🍵": "tea", "🥭": "smoothie",
  "🫓": "plate", "🍽️": "plate", "🍖": "plate", "🍝": "plate", "🥪": "plate", "🍰": "dessert", "🍮": "dessert",
  "🥐": "pastry", "🫖": "teaset", "🍾": "bottle",
  // Hotel menus on the Palm
  "🍔": "plate", "🥗": "plate", "🍉": "plate", "🦞": "plate", "🍣": "plate", "🍟": "plate", "🫛": "plate", "🐟": "plate",
  "🍤": "plate", "🌮": "plate", "🍗": "plate", "🍛": "plate", "🍊": "plate", "🥩": "plate", "🍜": "plate", "🦆": "plate",
  "🍲": "plate", "🍕": "plate", "🦪": "plate", "🥟": "plate", "🥘": "plate", "🍆": "plate", "🍳": "plate", "🥧": "plate",
  "🥣": "dessert", "🍨": "dessert", "🍦": "dessert", "🍪": "dessert", "🍬": "dessert", "🥂": "cocktail",
  "🌯": "plate", "🧀": "plate",
};

/** What a purchase looks like when it's served, or null for things that aren't brought to you. */
export function serveKindOf(p: Product): ServeKind | null {
  if (p.station === "booth" && p.icon === "🍾") return "bottle";
  if (!p.consumable || p.service) return null;
  return BY_ICON[p.icon] ?? null;
}

export interface ServedDef {
  id: string;
  kind: ServeKind;
  position: [number, number, number];
  rotation: number;
  /** Seconds the bottle sparkler keeps burning after it's put down. */
  sparkle?: number;
  /** A colour so two of the same drink don't look identical. */
  tint?: string;
}

// ---------------------------------------------------------------- materials

function useMats() {
  return useMemo(() => ({
    glass: new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    china: new THREE.MeshStandardMaterial({ color: "#fafaf9", roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: "#d4d4d8", roughness: 0.2, metalness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: "#d4af37", roughness: 0.25, metalness: 1 }),
    bottle: new THREE.MeshStandardMaterial({ color: "#0b3d2e", roughness: 0.12, metalness: 0.35 }),
    label: new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.5 }),
  }), []);
}

const Liquid = ({ color, ...props }: { color: string } & ThreeElements["mesh"]) => (
  <mesh {...props}><meshStandardMaterial color={color} roughness={0.15} transparent opacity={0.85} /></mesh>
);

// ---------------------------------------------------------------- champagne and sparkler

const BOTTLE_PROFILE = [[0, 0], [0.045, 0], [0.047, 0.012], [0.047, 0.2], [0.04, 0.235], [0.021, 0.27], [0.015, 0.3], [0.017, 0.33], [0, 0.33]]
  .map(([r, y]) => new THREE.Vector2(r, y));

/** A champagne bottle, 33 cm, with foil and label. The sparkler clips onto the neck. */
export function ChampagneBottle({ sparkler = false }: { sparkler?: boolean }) {
  const m = useMats();
  const body = useMemo(() => new THREE.LatheGeometry(BOTTLE_PROFILE, 28), []);
  useEffect(() => () => body.dispose(), [body]);
  return (
    <group>
      <mesh geometry={body} material={m.bottle} castShadow />
      <mesh position={[0, 0.3, 0]} material={m.gold}><cylinderGeometry args={[0.019, 0.024, 0.065, 20]} /></mesh>
      <mesh position={[0, 0.12, 0]} material={m.label}><cylinderGeometry args={[0.0478, 0.0478, 0.07, 28, 1, true]} /></mesh>
      <mesh position={[0, 0.12, 0]} material={m.gold}><cylinderGeometry args={[0.048, 0.048, 0.008, 28, 1, true]} /></mesh>
      {sparkler && <group position={[0, 0.335, 0]}><Sparkler /></group>}
    </group>
  );
}

const SPARKS = 160;

/** A bottle sparkler: a fountain of sparks with a flickering glow. */
export function Sparkler({ burning = true }: { burning?: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3).fill(-50), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    return g;
  }, []);
  const sim = useMemo(() => ({ vel: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS), max: new Float32Array(SPARKS).fill(1) }), []);
  const light = useRef<THREE.PointLight>(null);
  const core = useRef<THREE.Mesh>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Particles are simulated in place on the buffers three.js draws from.
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const { vel, life, max } = sim;
    for (let i = 0; i < SPARKS; i++) {
      const j = i * 3;
      life[i] -= dt;
      if (life[i] <= 0) {
        if (!burning) { pos[j + 1] = -50; continue; }
        // Respawn at the tip, shooting up in a narrow cone.
        const a = Math.random() * Math.PI * 2;
        const spread = Math.random() * 0.5;
        const speed = 1.1 + Math.random() * 1.7;
        vel[j] = Math.cos(a) * Math.sin(spread) * speed;
        vel[j + 1] = Math.cos(spread) * speed;
        vel[j + 2] = Math.sin(a) * Math.sin(spread) * speed;
        pos[j] = pos[j + 1] = pos[j + 2] = 0;
        life[i] = max[i] = 0.25 + Math.random() * 0.45;
      }
      const drag = 1 - 2.2 * dt;
      vel[j] *= drag; vel[j + 2] *= drag;
      vel[j + 1] = vel[j + 1] * drag - 4 * dt;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      // White-hot when fresh, cooling to orange as it fades.
      const k = life[i] / max[i];
      col[j] = k * 1.0; col[j + 1] = k * (0.55 + 0.45 * k); col[j + 2] = k * (0.15 + 0.75 * k * k);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    const flicker = burning ? 2.2 + Math.random() * 1.8 : 0;
    if (light.current) light.current.intensity = flicker;
    if (core.current) core.current.scale.setScalar(burning ? 0.8 + Math.random() * 0.5 : 0.001);
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      <mesh position={[0, -0.03, 0]}><cylinderGeometry args={[0.004, 0.004, 0.07, 6]} /><meshStandardMaterial color="#3f3f46" metalness={0.8} roughness={0.4} /></mesh>
      <mesh ref={core}><sphereGeometry args={[0.014, 10, 8]} /><meshBasicMaterial color="#fff7d6" toneMapped={false} /></mesh>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.028} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      <pointLight ref={light} color="#ffb04a" distance={4} decay={2} intensity={0} />
    </group>
  );
}

// ---------------------------------------------------------------- everything else on the menu

function Drink({ kind, tint }: { kind: Exclude<ServeKind, "bottle">; tint?: string }) {
  const m = useMats();
  switch (kind) {
    case "cocktail":
      return (
        <group>
          <mesh position={[0, 0.003, 0]} material={m.glass}><cylinderGeometry args={[0.035, 0.035, 0.006, 20]} /></mesh>
          <mesh position={[0, 0.05, 0]} material={m.glass}><cylinderGeometry args={[0.004, 0.004, 0.09, 8]} /></mesh>
          <mesh position={[0, 0.13, 0]} material={m.glass}><cylinderGeometry args={[0.065, 0.004, 0.08, 24, 1, true]} /></mesh>
          <Liquid color={tint ?? "#f472b6"} position={[0, 0.125, 0]}><cylinderGeometry args={[0.052, 0.004, 0.064, 24]} /></Liquid>
          <mesh position={[0.05, 0.165, 0]} rotation={[0, 0, 0.5]}><torusGeometry args={[0.018, 0.005, 6, 16]} /><meshStandardMaterial color="#facc15" /></mesh>
        </group>
      );
    case "mocktail":
    case "smoothie":
      return (
        <group>
          <Liquid color={tint ?? (kind === "smoothie" ? "#fbbf24" : "#fb923c")} position={[0, 0.055, 0]}><cylinderGeometry args={[0.031, 0.029, 0.1, 20]} /></Liquid>
          <mesh position={[0, 0.07, 0]} material={m.glass}><cylinderGeometry args={[0.036, 0.033, 0.14, 20, 1, true]} /></mesh>
          <mesh position={[0.012, 0.13, 0]} rotation={[0, 0, -0.18]}><cylinderGeometry args={[0.003, 0.003, 0.16, 6]} /><meshStandardMaterial color={kind === "smoothie" ? "#22c55e" : "#ef4444"} /></mesh>
          {kind === "mocktail" && <mesh position={[-0.03, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.022, 0.005, 16]} /><meshStandardMaterial color="#84cc16" /></mesh>}
          {kind === "mocktail" && <mesh position={[0.008, 0.112, 0.01]}><sphereGeometry args={[0.012, 8, 6]} /><meshStandardMaterial color="#15803d" /></mesh>}
        </group>
      );
    case "soda":
      return (
        <group>
          <mesh position={[0, 0.061, 0]} castShadow><cylinderGeometry args={[0.033, 0.033, 0.122, 20]} /><meshStandardMaterial color={tint ?? "#dc2626"} metalness={0.5} roughness={0.3} /></mesh>
          <mesh position={[0, 0.123, 0]} material={m.steel}><cylinderGeometry args={[0.029, 0.033, 0.004, 20]} /></mesh>
        </group>
      );
    case "coffee":
    case "tea":
      return (
        <group>
          <mesh position={[0, 0.004, 0]} material={m.china}><cylinderGeometry args={[0.07, 0.06, 0.008, 24]} /></mesh>
          <mesh position={[0, 0.04, 0]} material={kind === "tea" ? m.glass : m.china} castShadow><cylinderGeometry args={[0.042, 0.032, 0.065, 20]} /></mesh>
          <Liquid color={kind === "tea" ? "#c08a4a" : "#6b3e1f"} position={[0, kind === "tea" ? 0.036 : 0.071, 0]}><cylinderGeometry args={[0.038, 0.032, kind === "tea" ? 0.055 : 0.002, 20]} /></Liquid>
          {kind === "coffee" && <mesh position={[0.05, 0.045, 0]} rotation={[0, 0, Math.PI / 2]} material={m.china}><torusGeometry args={[0.014, 0.004, 6, 14]} /></mesh>}
        </group>
      );
    case "plate":
    case "dessert":
    case "pastry": {
      const r = kind === "plate" ? 0.13 : 0.085;
      return (
        <group>
          <mesh position={[0, 0.006, 0]} material={m.china} receiveShadow castShadow><cylinderGeometry args={[r, r * 0.75, 0.012, 32]} /></mesh>
          {kind === "plate" && ([["#b45309", -0.04, -0.02], ["#65a30d", 0.045, 0.01], ["#f5f5f4", -0.005, 0.05], ["#dc2626", 0.02, -0.05]] as Array<[string, number, number]>).map(([c, x, z], i) => (
            <mesh key={i} position={[x, 0.028, z]} scale={[1, 0.55, 1]} castShadow><sphereGeometry args={[0.038, 12, 8]} /><meshStandardMaterial color={c} roughness={0.8} /></mesh>
          ))}
          {kind === "dessert" && <mesh position={[0, 0.042, 0]} rotation={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.06, 16, 1, false, 0, 0.9]} /><meshStandardMaterial color={tint ?? "#fde68a"} roughness={0.7} /></mesh>}
          {kind === "pastry" && <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0.4]} scale={[1, 1, 0.8]} castShadow><torusGeometry args={[0.04, 0.022, 10, 20, Math.PI * 1.3]} /><meshStandardMaterial color="#d97706" roughness={0.6} /></mesh>}
        </group>
      );
    }
    case "teaset":
      return (
        <group>
          <mesh position={[0, 0.06, 0]} material={m.china} castShadow scale={[1, 0.85, 1]}><sphereGeometry args={[0.065, 20, 14]} /></mesh>
          <mesh position={[0, 0.118, 0]} material={m.gold}><sphereGeometry args={[0.012, 10, 8]} /></mesh>
          <mesh position={[0.075, 0.07, 0]} rotation={[0, 0, -0.9]} material={m.china}><cylinderGeometry args={[0.006, 0.012, 0.06, 8]} /></mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.06, 0, 0.12]}>
              <mesh position={[0, 0.004, 0]} material={m.china}><cylinderGeometry args={[0.05, 0.045, 0.008, 20]} /></mesh>
              <mesh position={[0, 0.03, 0]} material={m.china}><cylinderGeometry args={[0.035, 0.026, 0.045, 18]} /></mesh>
            </group>
          ))}
        </group>
      );
  }
}

/** Ice bucket with the bottle in it, its sparkler still burning for a while. */
function BottleOnIce({ sparkle }: { sparkle: number }) {
  const m = useMats();
  const [burning, setBurning] = useState(sparkle > 0);
  useEffect(() => {
    if (sparkle <= 0) return;
    const t = setTimeout(() => setBurning(false), sparkle * 1000);
    return () => clearTimeout(t);
  }, [sparkle]);
  return (
    <group>
      <mesh position={[0, 0.09, 0]} material={m.steel} castShadow><cylinderGeometry args={[0.1, 0.075, 0.18, 24, 1, true]} /></mesh>
      <mesh position={[0, 0.005, 0]} material={m.steel}><cylinderGeometry args={[0.075, 0.075, 0.01, 24]} /></mesh>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.092, 0.092, 0.02, 20]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.7} roughness={0.1} /></mesh>
      <group position={[0, 0.03, 0]} rotation={[0, 0, 0.18]}>
        <ChampagneBottle />
        <group position={[0, 0.335, 0]}><Sparkler burning={burning} /></group>
      </group>
    </group>
  );
}

/** One served item, popping into place. Larger than life so it reads from the camera across the room. */
export function ServedItem({ def }: { def: ServedDef }) {
  const g = useRef<THREE.Group>(null);
  const grow = useRef(0);
  useFrame((_, dt) => {
    if (!g.current || grow.current >= 1) return;
    grow.current = Math.min(1, grow.current + dt * 4);
    const t = grow.current;
    g.current.scale.setScalar(1.8 * (1 + Math.sin(t * Math.PI) * 0.25) * t);
  });
  return (
    <group ref={g} position={def.position} rotation={[0, def.rotation, 0]} scale={0.001}>
      {def.kind === "bottle" ? <BottleOnIce sparkle={def.sparkle ?? 0} /> : <Drink kind={def.kind} tint={def.tint} />}
    </group>
  );
}
