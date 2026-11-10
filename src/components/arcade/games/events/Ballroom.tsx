"use client";

// A hotel ballroom dressed for an event: the stage at the far end (gold kosha, floral arch, LED wall or majlis
// tent), the aisle (petals, lanterns or a mirror runway), round tables in the theme's colours with their
// centrepieces, the ceiling (chandeliers, a fairy-light canopy or starlit drapes) and the entrance. Guests sit
// at the tables. For the bouquet toss, a real physics bouquet (Rapier) flies from the stage.

import { useMemo, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Physics, RigidBody, BallCollider, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useQuality } from "../../GameStage";
import { applyShake, useGameFrame } from "../../stage";

export type Shot = "design" | "stage" | "tables" | "toss";
export const TABLES: Array<[number, number]> = [[-3, 1], [0, 1.4], [3, 1], [-3, 4], [0, 4.4], [3, 4]];
const SHOTS: Record<Shot, { pos: [number, number, number]; look: [number, number, number] }> = {
  design: { pos: [0, 7.5, 11], look: [0, 0.5, 0] },
  stage: { pos: [0, 2.2, 3.2], look: [0, 1.4, -4.2] },
  tables: { pos: [0, 6.5, 8.5], look: [0, 0.5, 2.5] },
  toss: { pos: [0, 3.2, -0.5], look: [0, 1, 4] },
};

function Stage({ prop, c }: { prop?: string; c: string[] }) {
  const gold = <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />;
  return (
    <group position={[0, 0, -5]}>
      <mesh position={[0, 0.2, 0]} receiveShadow><boxGeometry args={[6, 0.4, 2.6]} /><meshStandardMaterial color="#f5f5f4" roughness={0.6} /></mesh>
      {prop === "kosha-gold" && (
        <group position={[0, 0.4, -0.6]}>
          <mesh position={[0, 1.6, -0.4]}><torusGeometry args={[1.6, 0.12, 10, 40, Math.PI]} />{gold}</mesh>
          {[-1.6, 1.6].map((x) => <mesh key={x} position={[x, 0.8, -0.4]}><cylinderGeometry args={[0.12, 0.12, 1.6, 12]} />{gold}</mesh>)}
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[2, 0.7, 0.8]} /><meshStandardMaterial color={c[1]} roughness={0.5} /></mesh>
        </group>
      )}
      {prop === "floral-arch" && (
        <group position={[0, 0.4, -0.6]}>
          <mesh position={[0, 0, 0]}><torusGeometry args={[1.7, 0.18, 10, 40, Math.PI]} /><meshStandardMaterial color="#f8fafc" roughness={0.9} /></mesh>
          {Array.from({ length: 18 }).map((_, i) => { const a = (i / 17) * Math.PI; return <mesh key={i} position={[Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.12]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color={i % 3 ? "#fbcfe8" : c[1]} /></mesh>; })}
        </group>
      )}
      {prop === "led-wall" && <mesh position={[0, 1.9, -1.1]}><planeGeometry args={[5.4, 3]} /><meshBasicMaterial color={c[0]} toneMapped={false} /></mesh>}
      {prop === "tent-majlis" && (
        <group position={[0, 0.4, -0.5]}>
          <mesh position={[0, 1.6, 0]}><coneGeometry args={[2.2, 2.2, 6, 1, true]} /><meshStandardMaterial color={c[0]} side={THREE.DoubleSide} roughness={0.8} /></mesh>
          <mesh position={[0, 0.25, 0]}><boxGeometry args={[2.6, 0.5, 0.9]} /><meshStandardMaterial color={c[2]} /></mesh>
        </group>
      )}
    </group>
  );
}

function Aisle({ prop, c }: { prop?: string; c: string[] }) {
  return (
    <group position={[0, 0.012, 0.3]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.4, 8]} /><meshStandardMaterial color={prop === "mirror-aisle" ? "#e2e8f0" : c[2]} metalness={prop === "mirror-aisle" ? 0.9 : 0} roughness={prop === "mirror-aisle" ? 0.05 : 0.9} /></mesh>
      {prop === "petal-aisle" && Array.from({ length: 40 }).map((_, i) => <mesh key={i} position={[((i * 37) % 13) / 10 - 0.6, 0.01, -3.8 + (i * 0.19)]} rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.05, 6]} /><meshBasicMaterial color="#f472b6" /></mesh>)}
      {prop === "lantern-aisle" && Array.from({ length: 8 }).map((_, i) => [-0.9, 0.9].map((x) => (
        <group key={`${i}${x}`} position={[x, 0.25, -3.6 + i]}><mesh><cylinderGeometry args={[0.1, 0.12, 0.4, 6]} /><meshStandardMaterial color={c[0]} emissive="#fbbf24" emissiveIntensity={1} /></mesh></group>
      )))}
    </group>
  );
}

function Tables({ prop, c, guests }: { prop?: string; c: string[]; guests: number }) {
  return (
    <group>
      {TABLES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow><cylinderGeometry args={[0.8, 0.8, 0.06, 28]} /><meshStandardMaterial color={c[2]} roughness={0.8} /></mesh>
          <mesh position={[0, 0.37, 0]}><cylinderGeometry args={[0.82, 0.86, 0.74, 28, 1, true]} /><meshStandardMaterial color={c[2]} roughness={0.9} side={THREE.DoubleSide} /></mesh>
          {prop && (
            <group position={[0, 0.78, 0]}>
              <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.05, 0.1, 0.36, 10]} /><meshStandardMaterial color={prop === "glass-shells" ? "#bae6fd" : c[0]} metalness={0.5} roughness={0.3} transparent={prop === "glass-shells"} opacity={0.8} /></mesh>
              {Array.from({ length: 6 }).map((_, k) => <mesh key={k} position={[Math.cos(k) * 0.12, 0.4, Math.sin(k) * 0.12]}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color={prop === "gold-chargers" ? "#b91c1c" : prop === "white-peonies" ? "#f8fafc" : prop === "brass-lamps" ? "#fbbf24" : "#e0f2fe"} emissive={prop === "brass-lamps" ? "#f59e0b" : "#000000"} emissiveIntensity={0.6} /></mesh>)}
            </group>
          )}
          {/* Guests round the table (fewer for a small event) */}
          {Array.from({ length: Math.min(6, Math.max(2, Math.round(guests / 30))) }).map((_, k) => {
            const a = (k / 6) * Math.PI * 2;
            return (
              <group key={k} position={[Math.cos(a) * 1.15, 0.45, Math.sin(a) * 1.15]}>
                <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.15, 0.3, 3, 8]} /><meshStandardMaterial color={["#0f172a", "#f8fafc", "#7c2d12", "#be185d", "#0f766e"][(i + k) % 5]} /></mesh>
                <mesh position={[0, 0.72, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color={["#8d5524", "#e0ac69", "#c68642", "#f1c27d"][(i * 3 + k) % 4]} /></mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Ceiling({ prop, c }: { prop?: string; c: string[] }) {
  if (!prop) return null;
  if (prop === "crystal-chandeliers") return (
    <group>{[[-3, 2.5], [0, 2.5], [3, 2.5]].map(([x, z]) => (
      <group key={x} position={[x, 4.2, z]}>
        <mesh><coneGeometry args={[0.6, 0.9, 12, 1, true]} /><meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.8} transparent opacity={0.75} side={THREE.DoubleSide} /></mesh>
        <pointLight intensity={4} distance={6} color="#fde68a" />
      </group>
    ))}</group>
  );
  return (
    <group>
      {Array.from({ length: prop === "fairy-canopy" ? 120 : 70 }).map((_, i) => (
        <mesh key={i} position={[((i * 53) % 100) / 100 * 10 - 5, 4.3 + ((i * 7) % 5) / 20, ((i * 31) % 100) / 100 * 9 - 2.5]}>
          <sphereGeometry args={[prop === "fairy-canopy" ? 0.04 : 0.03, 6, 4]} />
          <meshBasicMaterial color={prop === "fairy-canopy" ? "#fef9c3" : "#ffffff"} toneMapped={false} />
        </mesh>
      ))}
      {prop === "star-ceiling" && <mesh position={[0, 4.6, 1]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[11, 10]} /><meshStandardMaterial color={c[0]} side={THREE.DoubleSide} /></mesh>}
    </group>
  );
}

function Entrance({ prop, c }: { prop?: string; c: string[] }) {
  if (!prop) return null;
  return (
    <group position={[0, 0, 6.6]}>
      {prop === "rose-wall" && <mesh position={[2.6, 1.3, 0]}><boxGeometry args={[2, 2.6, 0.2]} /><meshStandardMaterial color="#f9a8d4" roughness={1} /></mesh>}
      {prop === "gold-gate" && <mesh position={[0, 1.6, 0]}><torusGeometry args={[1.3, 0.1, 8, 32, Math.PI]} /><meshStandardMaterial color={c[0]} metalness={0.8} roughness={0.25} /></mesh>}
      {prop === "wave-tunnel" && Array.from({ length: 5 }).map((_, i) => <mesh key={i} position={[0, 0, -i * 0.5]}><torusGeometry args={[1.4, 0.04, 6, 32, Math.PI]} /><meshBasicMaterial color={c[0]} toneMapped={false} /></mesh>)}
    </group>
  );
}

/** The bouquet: a physics body tossed from the stage when `throwRef` holds a throw. */
function Bouquet({ throwRef, landRef }: { throwRef: RefObject<{ dir: number; power: number; at: number } | null>; landRef: RefObject<[number, number] | null> }) {
  const body = useRef<RapierRigidBody>(null);
  const done = useRef(-1);
  useGameFrame(() => {
    const t = throwRef.current, b = body.current;
    if (!b) return;
    if (t && t.at !== done.current) {
      done.current = t.at;
      b.setTranslation({ x: 0, y: 1.8, z: -4.2 }, true);
      b.setLinvel({ x: t.dir * 3, y: 4 + t.power * 2, z: 4 + t.power * 7 }, true);
      b.setAngvel({ x: 6, y: 2, z: 0 }, true);
      landRef.current = null;
    }
    const p = b.translation();
    if (t && !landRef.current && p.y < 0.3 && Math.abs(b.linvel().y) < 0.5) landRef.current = [p.x, p.z];
  });
  return (
    <RigidBody ref={body} position={[0, -5, -4.2]} colliders={false} restitution={0.2} friction={0.8} linearDamping={0.15} angularDamping={0.6}>
      <BallCollider args={[0.18]} />
      <mesh><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#fbcfe8" /></mesh>
      <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.04, 0.03, 0.25, 8]} /><meshStandardMaterial color="#166534" /></mesh>
    </RigidBody>
  );
}

export function Ballroom({ shot, theme, props, guests, hosts, throwRef, landRef, paused }: {
  shot: Shot; theme: string[]; props: Record<string, string>; guests: number;
  hosts: AvatarLookProps[];
  throwRef: RefObject<{ dir: number; power: number; at: number } | null>; landRef: RefObject<[number, number] | null>;
  paused: boolean;
}) {
  const tier = useQuality();
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0, 0.5, 0), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const lookTo = useMemo(() => new THREE.Vector3(), []);
  useGameFrame((dt) => {
    const s = SHOTS[shot];
    target.set(...s.pos); lookTo.set(...s.look);
    camera.position.lerp(target, Math.min(1, dt * 2.5));
    look.lerp(lookTo, Math.min(1, dt * 2.5));
    camera.lookAt(look);
    applyShake(camera);
  });
  return (
    <group>
      <hemisphereLight args={["#fff7ed", "#44403c", 0.7]} />
      <directionalLight position={[3, 8, 6]} intensity={1.3} castShadow={tier === 2} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3.5, -4]} intensity={10} distance={9} color={theme[0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 16]} /><meshStandardMaterial color="#e7e5e4" roughness={0.25} metalness={0.1} /></mesh>
      <mesh position={[0, 2.5, -6.4]}><planeGeometry args={[14, 5]} /><meshStandardMaterial color="#f5f0e6" /></mesh>
      {[-7, 7].map((x) => <mesh key={x} position={[x, 2.5, 0.5]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}><planeGeometry args={[14, 5]} /><meshStandardMaterial color="#f5f0e6" /></mesh>)}
      <Stage prop={props.stage} c={theme} />
      <Aisle prop={props.aisle} c={theme} />
      <Tables prop={props.tables} c={theme} guests={guests} />
      <Ceiling prop={props.ceiling} c={theme} />
      <Entrance prop={props.entrance} c={theme} />
      {/* The hosts on the stage */}
      {hosts.slice(0, 2).map((h, i) => <group key={i} position={[i ? 0.45 : -0.45, 0.4, -4.4]}><CitizenAvatar look={h} animation={shot === "stage" ? "dance" : "idle"} /></group>)}
      <Physics paused={paused} gravity={[0, -9.81, 0]}>
        <CuboidCollider args={[7, 0.05, 8]} position={[0, -0.05, 1]} />
        <Bouquet throwRef={throwRef} landRef={landRef} />
      </Physics>
    </group>
  );
}
