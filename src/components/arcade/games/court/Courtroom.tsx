"use client";

// A courtroom at Dubai Courts: wood-panelled walls, the judge's raised bench, the witness stand, the two counsel
// tables and the public gallery. The judge, the witness and the other side's lawyer are Locals; you stand at
// your table. The camera cuts to whoever matters in each part of the hearing, and the witness flinches when
// you catch them out.

import { useMemo, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type ArmRig } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useQuality } from "../../GameStage";
import { applyShake, useGameFrame } from "../../stage";

export type Shot = "wide" | "desk" | "witness" | "face" | "counsel" | "judge" | "docs";

const WOOD = "#7c4a24", WOOD_DARK = "#5a3417", WALL = "#e9dcc4";
export const JUDGE = { name: "Judge Al Mansoori", look: { gender: "man" as const, preset: "Male_Adult_04" } };
export const COUNSEL = { look: { gender: "woman" as const, preset: "Female_Adult_11" } };

const SHOTS: Record<Shot, { pos: [number, number, number]; look: [number, number, number] }> = {
  wide: { pos: [0, 3.1, 6.6], look: [0, 1.4, -1] },
  // Your table is at x 1.6.
  desk: { pos: [2.6, 2.5, 3.6], look: [1.2, 1.0, 0.4] },
  docs: { pos: [1.9, 1.95, 2.3], look: [1.5, 0.8, 1.1] },
  witness: { pos: [0.6, 1.9, 1.6], look: [-2.2, 1.65, -1.2] },
  face: { pos: [-1.2, 1.85, 0.0], look: [-2.2, 1.72, -1.2] },
  counsel: { pos: [-0.6, 1.8, 3.4], look: [-1.6, 1.4, 1.2] },
  judge: { pos: [0, 2.3, 1.6], look: [0, 2.15, -2.6] },
};

function Table({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 0.06, 0.8]} /><meshStandardMaterial color={WOOD} roughness={0.5} /></mesh>
      <mesh position={[0, 0.38, -0.36]}><boxGeometry args={[1.8, 0.76, 0.05]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      <mesh position={[-0.4, 0.8, 0.05]} rotation={[-Math.PI / 2, 0, 0.1]}><planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial color="#f8fafc" /></mesh>
    </group>
  );
}

function Gallery({ rows }: { rows: number }) {
  return (
    <group position={[0, 0, 4.6]}>
      {Array.from({ length: rows }).map((_, r) => (
        <group key={r} position={[0, 0, r * 0.9]}>
          {[-2.2, 2.2].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 0.45, 0]}><boxGeometry args={[3, 0.08, 0.45]} /><meshStandardMaterial color={WOOD} /></mesh>
              <mesh position={[0, 0.75, 0.22]}><boxGeometry args={[3, 0.6, 0.05]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>
              {/* People watching (simple figures) */}
              {[-1, 0, 1].map((k) => (k + r) % 2 === 0 ? (
                <group key={k} position={[k * 0.9, 0.5, -0.05]}>
                  <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.16, 0.3, 3, 8]} /><meshStandardMaterial color={["#1e293b", "#f8fafc", "#7c2d12", "#0f766e"][(k + r + 4) % 4]} /></mesh>
                  <mesh position={[0, 0.72, 0]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color={["#8d5524", "#e0ac69", "#c68642"][(k + r + 3) % 3]} /></mesh>
                </group>
              ) : null)}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Courtroom({ shot, me, witness, flinchRef }: { shot: Shot; me?: AvatarLookProps; witness?: AvatarLookProps; flinchRef: RefObject<number> }) {
  const tier = useQuality();
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(...SHOTS.wide.look), []);
  const target = useMemo(() => new THREE.Vector3(...SHOTS.wide.pos), []);
  const lookTo = useMemo(() => new THREE.Vector3(), []);
  const witnessGroup = useRef<THREE.Group>(null);
  const witnessRig = useRef<ArmRig | null>({ weight: 0, R: { upper: [-0.7, 0.5, 0.35], fore: [0.2, 0.6, -0.8] }, L: { upper: [-0.7, 0.5, 0.35], fore: [0.2, 0.6, -0.8] } });
  const myRig = useRef<ArmRig | null>({ weight: 0, R: { upper: [0.6, 0.75, 0.15], fore: [0.7, 0.7, 0.0] }, L: { upper: [-1, 0, 0.15], fore: [-0.95, 0.2, 0.05] } });

  useGameFrame((dt, t) => {
    const s = SHOTS[shot];
    target.set(...s.pos);
    lookTo.set(...s.look);
    camera.position.lerp(target, Math.min(1, dt * 3));
    look.lerp(lookTo, Math.min(1, dt * 3));
    camera.lookAt(look);
    applyShake(camera);
    // The witness: arms folded and shifting when on the spot; a jolt when caught out.
    const f = flinchRef.current;
    if (witnessRig.current) witnessRig.current.weight = shot === "face" ? 1 : 0;
    if (witnessGroup.current) {
      witnessGroup.current.rotation.x = -0.25 * f;
      witnessGroup.current.rotation.y = Math.PI / 4 + Math.sin(t * 1.7) * (shot === "face" ? 0.08 : 0.02);
    }
    flinchRef.current = Math.max(0, f - dt * 2);
    // You point at the witness while presenting evidence.
    if (myRig.current) myRig.current.weight = f > 0.2 ? 1 : 0;
  });

  return (
    <group>
      <hemisphereLight args={["#fff7ed", "#3f2a14", 0.7]} />
      <directionalLight position={[2, 6, 4]} intensity={1.5} castShadow={tier === 2} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3.5, -1.5]} intensity={8} distance={8} color="#fde68a" />
      {/* Floor, walls, panelling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[12, 14]} /><meshStandardMaterial color="#8b6b4a" roughness={0.7} /></mesh>
      <mesh position={[0, 2.5, -3.5]}><planeGeometry args={[12, 5]} /><meshStandardMaterial color={WALL} roughness={0.9} /></mesh>
      <mesh position={[0, 0.9, -3.48]}><planeGeometry args={[12, 1.8]} /><meshStandardMaterial color={WOOD} roughness={0.6} /></mesh>
      {[-6, 6].map((x) => <mesh key={x} position={[x, 2.5, 1]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}><planeGeometry args={[14, 5]} /><meshStandardMaterial color={WALL} roughness={0.9} /></mesh>)}
      {/* The flag behind the bench */}
      <group position={[1.6, 2.9, -3.45]}>
        <mesh position={[-0.5, 0, 0]}><planeGeometry args={[0.3, 0.9]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[0.15, 0.3, 0]}><planeGeometry args={[1, 0.3]} /><meshStandardMaterial color="#16a34a" /></mesh>
        <mesh position={[0.15, 0, 0]}><planeGeometry args={[1, 0.3]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <mesh position={[0.15, -0.3, 0]}><planeGeometry args={[1, 0.3]} /><meshStandardMaterial color="#111827" /></mesh>
      </group>
      {/* The judge's bench, raised */}
      <mesh position={[0, 0.25, -2.6]} receiveShadow><boxGeometry args={[4, 0.5, 1.4]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>
      <mesh position={[0, 0.95, -2.05]} castShadow><boxGeometry args={[3.6, 1.0, 0.12]} /><meshStandardMaterial color={WOOD} roughness={0.5} /></mesh>
      <group position={[0, 0.5, -2.75]}><CitizenAvatar look={JUDGE.look} animation="sit" /></group>
      {/* The witness stand */}
      <mesh position={[-2.2, 0.55, -1.2]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[0.9, 1.1, 0.9]} /><meshStandardMaterial color={WOOD} roughness={0.5} /></mesh>
      <group ref={witnessGroup} position={[-2.35, 0.15, -1.4]} rotation={[0, Math.PI / 4, 0]}>
        <CitizenAvatar look={witness} animation={shot === "witness" || shot === "face" ? "talk" : "idle"} rig={witnessRig} />
      </group>
      {/* The other side's table and lawyer; yours */}
      <Table x={-1.6} z={1.2} />
      <group position={[-1.6, 0, 1.75]} rotation={[0, Math.PI, 0]}><CitizenAvatar look={COUNSEL.look} animation={shot === "counsel" ? "talk" : "idle"} /></group>
      <Table x={1.6} z={1.2} />
      <group position={[1.6, 0, 1.75]} rotation={[0, Math.PI + 0.35, 0]}><CitizenAvatar look={me} animation="idle" rig={myRig} /></group>
      <Gallery rows={tier === 0 ? 1 : 3} />
    </group>
  );
}
