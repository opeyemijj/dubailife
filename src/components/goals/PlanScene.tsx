"use client";

// The plan ceremony's backdrop: your avatar on a rooftop terrace at sunset, looking out over the towers to
// the Burj Khalifa, the camera drifting slowly round. The goal cards sit over it as the screen's UI.

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { BurjKhalifa, CityBlocks, SkyAndLight } from "@/components/transit/TransitWorld";
import { canvasQuality } from "@/lib/device";

const ROOF = 34;

function Rooftop({ look, animation }: { look?: AvatarLookProps; animation: AvatarAnimation }) {
  const t = useRef(0);
  useFrame(({ camera }, dt) => {
    t.current += dt;
    // A slow drift round behind your shoulder.
    const a = Math.sin(t.current * 0.15) * 0.22;
    // Tilted down a little so you stand in the upper half of the screen, above the plan's card.
    camera.position.set(0.7 + Math.sin(a) * 1.6, ROOF + 2.4, 2.2);
    camera.lookAt(-0.3, ROOF - 7, -40);
  });
  return (
    <>
      {/* the terrace: stone floor, glass balustrade, planters */}
      <mesh position={[0, ROOF - 0.3, -1]}><boxGeometry args={[14, 0.6, 12]} /><meshStandardMaterial color="#d6cfc2" roughness={0.8} /></mesh>
      <mesh position={[0, ROOF + 0.55, -6.9]}><boxGeometry args={[14, 1.1, 0.06]} /><meshPhysicalMaterial color="#bfe3ff" transparent opacity={0.35} roughness={0.05} /></mesh>
      <mesh position={[0, ROOF + 1.12, -6.9]}><boxGeometry args={[14, 0.06, 0.12]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} /></mesh>
      {[-5.5, 5.5].map((x) => (
        <group key={x} position={[x, ROOF, -5.6]}>
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[1.4, 0.7, 1]} /><meshStandardMaterial color="#57534e" /></mesh>
          <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.7, 12, 10]} /><meshStandardMaterial color="#3f7d3a" /></mesh>
        </group>
      ))}
      <pointLight position={[0, ROOF + 3, 1]} intensity={20} distance={10} color="#ffd9a8" />
      <group position={[0, ROOF, -2.2]} rotation={[0, Math.PI, 0]}>
        <Suspense fallback={null}><CitizenAvatar look={look} animation={animation} /></Suspense>
      </group>
    </>
  );
}

export function PlanScene({ look, celebrating }: { look?: AvatarLookProps; celebrating: boolean }) {
  const quality = useMemo(() => canvasQuality(), []);
  // A still road for the city blocks to stand along (nothing moves in this scene).
  const travel = useRef({ s: 0, speed: 0 });
  return (
    <Canvas dpr={quality.dpr} camera={{ position: [0, ROOF + 2.6, 7], fov: 55, near: 0.1, far: 1200 }} className="!absolute inset-0">
      <SkyAndLight sky="sunset" />
      <ambientLight intensity={0.35} color="#ffd8b0" />
      <group position={[0, 0, -40]}>
        <CityBlocks travel={travel} sky="sunset" districtAt={() => "towers"} />
        <BurjKhalifa travel={travel} p={300} x={-6} />
      </group>
      <Rooftop look={look} animation={celebrating ? "wave" : "idle"} />
    </Canvas>
  );
}
