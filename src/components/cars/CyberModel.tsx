"use client";

// The Cybertruck: no GLB fits its shape, so it's built here. One angular side profile (the nose, the single line up
// to the roof peak, the long slope down to the tailgate, the trapezoid wheel arches) extruded across the width in
// brushed stainless steel, a dark glass band over the windscreen and roof, side windows, the full-width light bars
// front and back, and big aero-covered wheels. Front faces +z, wheels on the ground, like CarModel.

import { useMemo } from "react";
import * as THREE from "three";

export const CYBER_LENGTH = 5.68;
const W = 2.0;

const shape = (pts: Array<[number, number]>) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
const extrude = (pts: Array<[number, number]>, depth: number) => { const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g; };

// x along the truck (front +), y up.
const BODY: Array<[number, number]> = [
  [-2.84, 0.5], [-2.52, 0.5], [-2.3, 0.98], [-1.5, 0.98], [-1.28, 0.5], [1.28, 0.5], [1.5, 0.98], [2.3, 0.98], [2.52, 0.5],
  [2.84, 0.56], [2.84, 1.0], [0.3, 1.79], [-2.84, 1.25],
];
const ROOF_GLASS: Array<[number, number]> = [[1.6, 1.36], [1.6, 1.405], [0.3, 1.81], [-0.9, 1.605], [-0.9, 1.56], [0.3, 1.77]];
const SIDE_GLASS: Array<[number, number]> = [[1.45, 1.38], [0.3, 1.73], [-1.05, 1.52], [-1.05, 1.2], [1.45, 1.2]];

export function CyberModel({ color, plateMap }: { color: string; plateMap: THREE.Texture }) {
  const g = useMemo(() => ({
    body: extrude(BODY, W), roof: extrude(ROOF_GLASS, W - 0.14), side: extrude(SIDE_GLASS, W + 0.02),
    steel: new THREE.MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.38, clearcoat: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#0b1220", metalness: 0.4, roughness: 0.03 }),
  }), [color]);
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={g.body} material={g.steel} castShadow receiveShadow />
      <mesh geometry={g.roof} material={g.glass} />
      <mesh geometry={g.side} material={g.glass} />
      {/* The light bars: white right across the nose, red right across the tailgate. */}
      <mesh position={[2.835, 0.99, 0]}><boxGeometry args={[0.03, 0.035, W - 0.06]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} /></mesh>
      <mesh position={[-2.845, 1.2, 0]}><boxGeometry args={[0.03, 0.035, W - 0.06]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></mesh>
      {/* The bumpers' dark cladding and the arches. */}
      <mesh position={[0, 0.53, 0]}><boxGeometry args={[5.66, 0.08, W + 0.01]} /><meshStandardMaterial color="#1f2937" roughness={0.9} /></mesh>
      {[-1.9, 1.9].flatMap((x) => [-1, 1].map((s) => (
        <group key={`${x}${s}`} position={[x, 0.43, s * (W / 2 - 0.12)]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow><cylinderGeometry args={[0.43, 0.43, 0.3, 24]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          <mesh position={[0, s * -0.155, 0]}><cylinderGeometry args={[0.3, 0.3, 0.02, 6]} /><meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      )))}
      {/* The plate on the tailgate. */}
      <mesh position={[-2.85, 0.78, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.52, 0.13]} /><meshStandardMaterial map={plateMap} /></mesh>
    </group>
  );
}
