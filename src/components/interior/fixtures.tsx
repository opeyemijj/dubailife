"use client";

// Shop, restaurant and venue fixtures at real-world scale (metres). Built from simple geometry with
// physical materials, plus a few CC0 models (see public/models/CREDITS.md).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mat, menuTexture, skylineTexture } from "./materials";

export const PROP = (name: string) => `/models/props/${name}.glb`;
["counter", "coffee-machine", "shelf-tall", "laptop", "screen", "speaker", "cafe-table", "dining-chair", "bar-stool", "couch", "plant", "lounge-chair", "frappe", "cup", "bench"].forEach((n) =>
  useGLTF.preload(n === "couch" ? "/models/furniture/couch.glb" : n === "plant" ? "/models/furniture/houseplant.glb" : n === "lounge-chair" ? "/models/furniture/lounge-chair.glb" : PROP(n)),
);

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** A GLB scaled to fit a width × depth footprint (and optional height), resting on the floor. */
/**
 * A loaded model fitted inside a footprint (and height). With `exactHeight` it's also stretched to
 * exactly that height, for furniture whose top other things are placed on.
 */
export function Model({ url, size, height, position, rotation = 0, tint, exactHeight = false }: { url: string; size: [number, number]; height?: number; position?: [number, number, number]; rotation?: number; tint?: string; exactHeight?: boolean }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const model = scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const dims = box.getSize(new THREE.Vector3());
    let s = Math.min(size[0] / dims.x, size[1] / dims.z);
    if (height) s = Math.min(s, height / dims.y);
    const sy = exactHeight && height ? height / dims.y : s;
    const g = new THREE.Group();
    model.scale.set(s, sy, s);
    model.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * sy, -((box.min.z + box.max.z) / 2) * s);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (tint) {
        m.material = (m.material as THREE.MeshStandardMaterial).clone();
        (m.material as THREE.MeshStandardMaterial).color.lerp(new THREE.Color(tint), 0.6);
      }
    });
    g.add(model);
    return g;
  }, [scene, size, height, tint, exactHeight]);
  return <primitive object={object} position={position} rotation={[0, rotation, 0]} />;
}

const Box = ({ args, position, color, material, rotation }: { args: [number, number, number]; position: [number, number, number]; color?: string; material?: THREE.Material; rotation?: [number, number, number] }) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow material={material}>
    <boxGeometry args={args} />
    {!material && <meshStandardMaterial color={color} roughness={0.6} />}
  </mesh>
);

// ---------------------------------------------------------------- retail

/** Chrome clothing rail with garments on hangers. */
export function Rack({ colors, seed = 1 }: { colors: string[]; seed?: number }) {
  const chrome = useMemo(() => mat.chrome(), []);
  const r = seeded(seed);
  return (
    <group>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.75, 0]} material={chrome} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 1.5, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.6, 12]} />
      </mesh>
      {[-0.75, 0.75].map((x) => <Box key={x} args={[0.06, 0.03, 0.5]} position={[x, 0.015, 0]} material={chrome} />)}
      {Array.from({ length: 9 }, (_, i) => {
        const len = 0.7 + r() * 0.35;
        return (
          <group key={i} position={[-0.64 + i * 0.16, 1.47, 0]} rotation={[0, (r() - 0.5) * 0.25, 0]}>
            <mesh position={[0, -len / 2 - 0.04, 0]} castShadow>
              <boxGeometry args={[0.06, len, 0.42]} />
              <meshStandardMaterial color={colors[Math.floor(r() * colors.length)]} roughness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Low table with folded stacks and a few accessories. */
export function DisplayTable({ top = "#f5f5f4", colors, seed = 2 }: { top?: string; colors: string[]; seed?: number }) {
  const r = seeded(seed);
  return (
    <group>
      <Box args={[1.6, 0.06, 0.9]} position={[0, 0.78, 0]} color={top} />
      <Box args={[1.5, 0.74, 0.8]} position={[0, 0.37, 0]} color={top} />
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} position={[-0.55 + (i % 3) * 0.55, 0.81, i < 3 ? -0.2 : 0.2]}>
          {Array.from({ length: 2 + Math.floor(r() * 3) }, (_, k) => (
            <Box key={k} args={[0.32, 0.045, 0.26]} position={[0, 0.025 + k * 0.047, 0]} color={colors[(i + k) % colors.length]} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Wall bays with spot-lit products on shelves (luxury bags, shoes, accessories). */
export function WallDisplay({ wood = "#8b6b3e", colors, width = 3, seed = 3 }: { wood?: string; colors: string[]; width?: number; seed?: number }) {
  const r = seeded(seed);
  const gold = useMemo(() => mat.gold(), []);
  const cols = Math.round(width / 0.75);
  return (
    <group>
      <Box args={[width, 2.6, 0.4]} position={[0, 1.3, -0.2]} color={wood} />
      {[0.55, 1.2, 1.85].map((y) => (
        <group key={y}>
          <Box args={[width - 0.1, 0.03, 0.42]} position={[0, y, 0.02]} color="#f5f5f4" />
          {Array.from({ length: cols }, (_, i) => {
            const x = -width / 2 + 0.375 + i * 0.75;
            const c = colors[Math.floor(r() * colors.length)];
            return (
              <group key={i} position={[x, y + 0.015, 0.05]}>
                <Box args={[0.34, 0.24, 0.14]} position={[0, 0.12, 0]} color={c} />
                <mesh position={[0, 0.27, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold}>
                  <torusGeometry args={[0.07, 0.008, 6, 16, Math.PI]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** Glass-topped display case with spot-lit jewellery or watches on velvet. */
export function GlassCase({ base = "#2a2420", velvet = "#1e1b4b", seed = 4 }: { base?: string; velvet?: string; seed?: number }) {
  const r = seeded(seed);
  const glass = useMemo(() => mat.glass(), []);
  const gold = useMemo(() => mat.gold(), []);
  const silver = useMemo(() => mat.chrome(), []);
  return (
    <group>
      <Box args={[1.4, 0.85, 0.6]} position={[0, 0.425, 0]} color={base} />
      <Box args={[1.32, 0.02, 0.52]} position={[0, 0.87, 0]} color={velvet} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-0.52 + (i % 4) * 0.35, 0.9, i < 4 ? -0.12 : 0.12]} rotation={[Math.PI / 2, 0, r() * 3]} material={r() < 0.5 ? gold : silver}>
          <torusGeometry args={[0.035, 0.009, 8, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 1.05, 0]} material={glass}>
        <boxGeometry args={[1.4, 0.36, 0.6]} />
      </mesh>
      <pointLight position={[0, 1.4, 0]} intensity={0.6} distance={1.6} color="#fff7e6" />
    </group>
  );
}

/** Beauty island: white gondola with a mirrored top and rows of testers. */
export function Gondola({ colors, seed = 5 }: { colors: string[]; seed?: number }) {
  const r = seeded(seed);
  const mirror = useMemo(() => mat.mirror(), []);
  return (
    <group>
      <Box args={[1.8, 0.9, 0.8]} position={[0, 0.45, 0]} color="#fafafa" />
      <Box args={[1.8, 0.02, 0.8]} position={[0, 0.91, 0]} material={mirror} />
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-0.78 + (i % 7) * 0.26, 0.98, i < 7 ? -0.2 : 0.2]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.13 + r() * 0.06, 12]} />
          <meshStandardMaterial color={colors[Math.floor(r() * colors.length)]} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      <Box args={[0.5, 0.42, 0.04]} position={[0, 1.15, 0]} material={mirror} />
    </group>
  );
}

/** Supermarket / bookshop shelving unit filled with product boxes. */
export function StockedShelf({ colors, seed = 6, width = 2 }: { colors: string[]; seed?: number; width?: number }) {
  const r = seeded(seed);
  return (
    <group>
      <Box args={[width, 1.9, 0.5]} position={[0, 0.95, -0.02]} color="#e5e7eb" />
      {[0.15, 0.6, 1.05, 1.5].map((y) => (
        <group key={y}>
          <Box args={[width, 0.03, 0.55]} position={[0, y, 0.02]} color="#d1d5db" />
          {Array.from({ length: Math.floor(width / 0.14) }, (_, i) => {
            const h = 0.18 + r() * 0.2;
            return <Box key={i} args={[0.11, h, 0.26]} position={[-width / 2 + 0.08 + i * 0.14, y + h / 2 + 0.015, 0.1]} color={colors[Math.floor(r() * colors.length)]} />;
          })}
        </group>
      ))}
    </group>
  );
}

/** Market-style crates of fruit and vegetables. */
export function ProduceTable({ seed = 7 }: { seed?: number }) {
  const r = seeded(seed);
  const fruit = ["#dc2626", "#f97316", "#facc15", "#65a30d", "#7c2d12"];
  return (
    <group>
      <Box args={[1.8, 0.75, 1]} position={[0, 0.375, 0]} color="#a16207" />
      {Array.from({ length: 6 }, (_, c) => (
        <group key={c} position={[-0.6 + (c % 3) * 0.6, 0.8, c < 3 ? -0.24 : 0.24]}>
          <Box args={[0.52, 0.1, 0.42]} position={[0, 0, 0]} color="#ca8a04" />
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[-0.17 + (i % 3) * 0.17, 0.1, -0.13 + Math.floor(i / 3) * 0.13]} castShadow>
              <sphereGeometry args={[0.055 + r() * 0.015, 12, 10]} />
              <meshStandardMaterial color={fruit[c % fruit.length]} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Pay point: counter with a till screen. */
export function Till({ color }: { color: string }) {
  return (
    <group>
      <Box args={[1.8, 1.0, 0.7]} position={[0, 0.5, 0]} color={color} />
      <Box args={[1.9, 0.05, 0.8]} position={[0, 1.02, 0]} color="#f5f5f4" />
      <Box args={[0.36, 0.26, 0.03]} position={[0.4, 1.2, -0.05]} rotation={[-0.25, 0, 0]} color="#111827" />
      <Box args={[0.3, 0.05, 0.3]} position={[-0.4, 1.07, 0]} color="#e5e7eb" />
    </group>
  );
}

/** Fitting room with curtain and full-length mirror. */
export function FittingRoom({ accent }: { accent: string }) {
  const mirror = useMemo(() => mat.mirror(), []);
  return (
    <group>
      <Box args={[1.4, 2.3, 0.08]} position={[0, 1.15, -0.6]} color="#f5f5f4" />
      {[-0.7, 0.7].map((x) => <Box key={x} args={[0.08, 2.3, 1.2]} position={[x, 1.15, 0]} color="#f5f5f4" />)}
      <Box args={[0.7, 1.7, 0.02]} position={[0, 1.15, -0.55]} material={mirror} />
      {Array.from({ length: 6 }, (_, i) => <Box key={i} args={[0.2, 2.0, 0.05]} position={[-0.55 + i * 0.2, 1.1, 0.6 + (i % 2) * 0.04]} color={accent} />)}
    </group>
  );
}

/** Store mannequin wearing a garment. */
export function Mannequin({ garment }: { garment: string }) {
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.2, metalness: 0.1 }), []);
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={white}><cylinderGeometry args={[0.22, 0.24, 0.04, 24]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={white}><cylinderGeometry args={[0.015, 0.015, 1, 8]} /></mesh>
      <mesh position={[0, 1.3, 0]} castShadow><capsuleGeometry args={[0.17, 0.5, 6, 16]} /><meshStandardMaterial color={garment} roughness={0.8} /></mesh>
      <mesh position={[0, 1.78, 0]} material={white} castShadow><sphereGeometry args={[0.11, 20, 16]} /></mesh>
    </group>
  );
}

/** Long light-wood tech table with laptops and phones. */
export function TechTable({ seed = 8 }: { seed?: number }) {
  const r = seeded(seed);
  return (
    <group>
      <Box args={[2.6, 0.05, 1.0]} position={[0, 0.88, 0]} color="#d6b88a" />
      {[-1.15, 1.15].map((x) => <Box key={x} args={[0.08, 0.86, 0.8]} position={[x, 0.43, 0]} color="#c4a574" />)}
      {[-0.8, 0, 0.8].map((x, i) => (
        <group key={i} position={[x, 0.905, -0.15]}>
          <Model url={PROP("laptop")} size={[0.36, 0.26]} rotation={Math.PI} />
        </group>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Box key={i} args={[0.08, 0.008, 0.16]} position={[-0.9 + i * 0.6, 0.91, 0.25]} rotation={[0, r() * 0.4 - 0.2, 0]} color="#0f172a" />
      ))}
    </group>
  );
}

/** Big wall screen showing a glowing product image. */
export function WallScreen({ color = "#0a84ff" }: { color?: string }) {
  return (
    <group>
      <Box args={[3.2, 1.8, 0.06]} position={[0, 1.9, 0]} color="#0b0b0b" />
      <mesh position={[0, 1.9, 0.035]}>
        <planeGeometry args={[3.1, 1.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- hospitality

/** Counter with espresso machine and a menu board behind. */
export function MenuCounter({ title, items, color }: { title: string; items: Array<{ name: string; price: number }>; color: string }) {
  const tex = useMemo(() => menuTexture(title, items), [title, items]);
  return (
    <group>
      <Box args={[2.4, 1.0, 0.7]} position={[0, 0.5, 0]} color={color} />
      <Box args={[2.5, 0.05, 0.8]} position={[0, 1.02, 0]} color="#f5f5f4" />
      <group position={[-0.6, 1.045, -0.1]}><Model url={PROP("coffee-machine")} size={[0.5, 0.4]} height={0.5} /></group>
      <group position={[0.5, 1.045, 0.1]}><Model url={PROP("frappe")} size={[0.12, 0.12]} height={0.2} /></group>
      <mesh position={[0, 2.25, -0.55]}>
        <planeGeometry args={[1.3, 1.6]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Refrigerated pastry / dessert display. */
export function PastryCase() {
  const glass = useMemo(() => mat.glass(), []);
  const pastries = ["#d97706", "#fde68a", "#7c2d12", "#fca5a5", "#fef3c7"];
  return (
    <group>
      <Box args={[1.4, 0.95, 0.65]} position={[0, 0.475, 0]} color="#f5f5f4" />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-0.5 + (i % 4) * 0.33, 1.0, i < 4 ? -0.12 : 0.14]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.07, 16]} />
          <meshStandardMaterial color={pastries[i % pastries.length]} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.12, 0]} material={glass}><boxGeometry args={[1.4, 0.35, 0.65]} /></mesh>
    </group>
  );
}

/** Bar with back-lit bottle shelves and stools. */
export function Bar({ glow, width = 3.2 }: { glow: string; width?: number }) {
  const r = seeded(9);
  return (
    <group>
      <Box args={[width, 1.1, 0.7]} position={[0, 0.55, 0]} color="#1f2937" />
      <Box args={[width + 0.1, 0.05, 0.8]} position={[0, 1.12, 0]} color="#e7e5e4" />
      <mesh position={[0, 0.3, 0.36]}>
        <planeGeometry args={[width, 0.04]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} />
      </mesh>
      {/* Back bar */}
      <group position={[0, 0, -1.2]}>
        <Box args={[width, 2.4, 0.3]} position={[0, 1.2, 0]} color="#111827" />
        {[1.3, 1.75, 2.2].map((y) => (
          <group key={y}>
            <mesh position={[0, y - 0.02, 0.16]}><planeGeometry args={[width - 0.1, 0.04]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} /></mesh>
            {Array.from({ length: Math.floor(width / 0.16) }, (_, i) => (
              <mesh key={i} position={[-width / 2 + 0.12 + i * 0.16, y + 0.12, 0.2]}>
                <cylinderGeometry args={[0.03, 0.035, 0.24, 10]} />
                <meshStandardMaterial color={["#14532d", "#78350f", "#e5e7eb", "#1e3a8a", "#7f1d1d"][Math.floor(r() * 5)]} roughness={0.15} transparent opacity={0.85} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {Array.from({ length: Math.floor(width / 0.8) }, (_, i) => (
        <group key={i} position={[-width / 2 + 0.5 + i * 0.8, 0, 0.75]}><Model url={PROP("bar-stool")} size={[0.45, 0.45]} height={0.8} /></group>
      ))}
    </group>
  );
}

/** Café or restaurant table with two chairs. */
export function DiningSet({ cloth }: { cloth?: string }) {
  return (
    <group>
      <Model url={PROP("cafe-table")} size={[0.8, 0.8]} height={0.76} exactHeight />
      {cloth && <mesh position={[0, 0.77, 0]}><cylinderGeometry args={[0.42, 0.42, 0.01, 24]} /><meshStandardMaterial color={cloth} roughness={0.9} /></mesh>}
      <group position={[0, 0, -0.65]}><Model url={PROP("dining-chair")} size={[0.48, 0.48]} height={0.95} /></group>
      <group position={[0, 0, 0.65]}><Model url={PROP("dining-chair")} size={[0.48, 0.48]} height={0.95} rotation={Math.PI} /></group>
      <group position={[0.15, 0.77, 0.05]}><Model url={PROP("cup")} size={[0.1, 0.1]} height={0.1} /></group>
    </group>
  );
}

/** Lounge booth: sofa facing a low table. */
export function Booth({ tint }: { tint?: string }) {
  return (
    <group>
      <Model url="/models/furniture/couch.glb" size={[2, 0.9]} tint={tint} />
      <Box args={[1.1, 0.42, 0.55]} position={[0, 0.21, 1.0]} color="#292524" />
    </group>
  );
}

/** DJ stage with decks and speakers. */
export function DJBooth({ glow }: { glow: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(s.clock.elapsedTime * 6) * 0.8;
  });
  return (
    <group>
      <Box args={[4, 0.4, 2.2]} position={[0, 0.2, 0]} color="#18181b" />
      <Box args={[1.8, 1.0, 0.7]} position={[0, 0.9, 0.2]} color="#0a0a0a" />
      <mesh ref={ref} position={[0, 0.9, 0.56]}><planeGeometry args={[1.7, 0.6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} /></mesh>
      {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 1.42, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.02, 24]} /><meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.3} /></mesh>)}
      {[-1.7, 1.7].map((x) => <group key={x} position={[x, 0.4, 0]}><Model url={PROP("speaker")} size={[0.6, 0.6]} height={1.6} /></group>)}
    </group>
  );
}

/** LED dance floor whose tiles pulse with the music. */
export function DanceFloor({ colors, size = 5 }: { colors: string[]; size?: number }) {
  const n = 6;
  const tiles = useRef<THREE.Mesh[]>([]);
  const palette = useMemo(() => colors.map((c) => new THREE.Color(c)), [colors]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const k = Math.floor(t * 2 + (i % n) * 0.7 + Math.floor(i / n) * 1.3);
      const material = m.material as THREE.MeshStandardMaterial;
      material.emissive.copy(palette[k % palette.length]);
      material.emissiveIntensity = 0.6 + 0.5 * Math.max(0, Math.sin(t * 4 + i));
    });
  });
  const cell = size / n;
  return (
    <group position={[0, 0.012, 0]}>
      {Array.from({ length: n * n }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) tiles.current[i] = m; }} position={[-size / 2 + cell / 2 + (i % n) * cell, 0, -size / 2 + cell / 2 + Math.floor(i / n) * cell]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cell * 0.94, cell * 0.94]} />
          <meshStandardMaterial color="#000" emissive={colors[0]} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Moving coloured spotlights for clubs. */
export function SweepingLights({ colors }: { colors: string[] }) {
  const refs = useRef<THREE.SpotLight[]>([]);
  const targets = useMemo(() => colors.map(() => new THREE.Object3D()), [colors]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    targets.forEach((o, i) => {
      o.position.set(Math.sin(t * 0.8 + i * 2) * 3, 0, Math.cos(t * 0.6 + i) * 2);
      o.updateMatrixWorld();
    });
  });
  return (
    <>
      {colors.map((c, i) => (
        <group key={i}>
          <primitive object={targets[i]} />
          <spotLight ref={(l) => { if (l) { refs.current[i] = l; l.target = targets[i]; } }} position={[-3 + i * 3, 4.5, -1]} color={c} intensity={40} angle={0.35} penumbra={0.5} distance={12} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- lobbies & attractions

/** Marble reception desk. */
export function Reception({ accent }: { accent: string }) {
  const gold = useMemo(() => mat.gold(), []);
  return (
    <group>
      <Box args={[3, 1.1, 0.8]} position={[0, 0.55, 0]} color="#f5f0e8" />
      <Box args={[3.1, 0.05, 0.9]} position={[0, 1.13, 0]} color="#e7dfd3" />
      <mesh position={[0, 0.6, 0.41]} material={gold}><planeGeometry args={[2.6, 0.04]} /></mesh>
      <Box args={[0.36, 0.26, 0.03]} position={[0.8, 1.3, -0.1]} rotation={[-0.25, 0, 0]} color="#111827" />
      <mesh position={[-0.9, 1.25, 0]}><cylinderGeometry args={[0.1, 0.08, 0.2, 16]} /><meshStandardMaterial color={accent} /></mesh>
    </group>
  );
}

/** Ticket kiosk with a lit canopy. */
export function TicketKiosk({ accent }: { accent: string }) {
  return (
    <group>
      <Box args={[1.8, 1.1, 0.8]} position={[0, 0.55, 0]} color="#1f2937" />
      <Box args={[1.9, 0.05, 0.9]} position={[0, 1.13, 0]} color="#e5e7eb" />
      <mesh position={[0, 2.4, 0]}><boxGeometry args={[2, 0.35, 0.9]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} /></mesh>
      {[-0.9, 0.9].map((x) => <Box key={x} args={[0.06, 1.25, 0.06]} position={[x, 1.78, 0]} color="#9ca3af" />)}
    </group>
  );
}

/** Exhibit pedestal with a slowly turning, glowing sculpture. */
export function Exhibit({ color, shape = 0 }: { color: string; shape?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.5; });
  return (
    <group>
      <Box args={[0.8, 1.0, 0.8]} position={[0, 0.5, 0]} color="#f8fafc" />
      <mesh ref={ref} position={[0, 1.45, 0]} castShadow>
        {shape % 3 === 0 ? <torusKnotGeometry args={[0.22, 0.07, 96, 12]} /> : shape % 3 === 1 ? <icosahedronGeometry args={[0.3, 0]} /> : <octahedronGeometry args={[0.32, 0]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Floor-to-ceiling windows onto the skyline. */
export function SkylineWindow({ width, height = 3.2 }: { width: number; height?: number }) {
  const tex = useMemo(() => skylineTexture(), []);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {Array.from({ length: Math.floor(width / 1.5) + 1 }, (_, i) => <Box key={i} args={[0.06, height, 0.06]} position={[-width / 2 + i * 1.5, height / 2, 0.03]} color="#cbd5e1" />)}
    </group>
  );
}

/** Aquarium wall with schooling fish. */
export function AquariumWall({ width, height = 3.2 }: { width: number; height?: number }) {
  const fish = useRef<THREE.Group>(null);
  const r = seeded(11);
  const school = useMemo(() => Array.from({ length: 26 }, () => ({ y: 0.4 + r() * (height - 0.8), speed: 0.3 + r() * 0.6, phase: r() * 10, size: 0.08 + r() * 0.12, color: ["#f97316", "#fde047", "#38bdf8", "#e5e7eb", "#94a3b8"][Math.floor(r() * 5)] })), [height, r]);
  useFrame((s) => {
    fish.current?.children.forEach((f, i) => {
      const d = school[i];
      const x = ((s.clock.elapsedTime * d.speed + d.phase) % (width + 1)) - width / 2 - 0.5;
      f.position.set(x, d.y + Math.sin(s.clock.elapsedTime + d.phase) * 0.1, 0.15);
    });
  });
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#0e7490" toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} />
      </mesh>
      <group ref={fish}>
        {school.map((d, i) => (
          <mesh key={i} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[d.size * 0.45, d.size * 1.6, 8]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
        ))}
      </group>
      {/* A shark gliding past */}
      <mesh position={[0, height * 0.6, 0.12]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.18, 1.3, 10]} />
        <meshBasicMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

/** Raised stage with red curtains. */
export function Stage({ width }: { width: number }) {
  return (
    <group>
      <Box args={[width, 0.6, 2.4]} position={[0, 0.3, 0]} color="#3f2a1d" />
      {Array.from({ length: 10 }, (_, i) => <Box key={i} args={[width / 10, 3.4, 0.1]} position={[-width / 2 + width / 20 + i * (width / 10), 2.3, -1.1 + (i % 2) * 0.08]} color="#7f1d1d" />)}
    </group>
  );
}

/** Calm water (pools, spa plunge, fountain lake). */
export function Water({ w, d }: { w: number; d: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + Math.sin(s.clock.elapsedTime * 1.5) * 0.06;
  });
  return (
    <group>
      <Box args={[w + 0.3, 0.3, d + 0.3]} position={[0, 0.15, 0]} color="#e7e5e4" />
      <mesh ref={ref} position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#38bdf8" emissiveIntensity={0.25} metalness={0.3} roughness={0.08} transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

/** Fountain jets that rise and fall. */
export function FountainJets({ width }: { width: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    ref.current?.children.forEach((c, i) => {
      const h = 0.6 + Math.max(0, Math.sin(s.clock.elapsedTime * 1.6 + i * 0.5)) * 2.6;
      c.scale.y = h;
      c.position.y = 0.3 + h / 2;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.5 + i * ((width - 1) / 10), 1, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 1, 10]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.6} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Date palm built from simple shapes. */
export function Palm({ height = 4 }: { height?: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, height, 10]} /><meshStandardMaterial color="#78716c" roughness={0.9} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * 0.7, height - 0.1, Math.sin((i / 8) * Math.PI * 2) * 0.7]} rotation={[0, -(i / 8) * Math.PI * 2, 0.6]} castShadow>
          <boxGeometry args={[1.6, 0.03, 0.35]} />
          <meshStandardMaterial color="#15803d" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function Plant() {
  return <Model url="/models/furniture/houseplant.glb" size={[0.6, 0.6]} height={1.4} />;
}
