"use client";

// A car: a 3D model (public/models/cars, by Quaternius; see public/models/CREDITS.md) chosen by its kind,
// sized to the car's real length, its body repainted in the car's colour with a clear-coat finish, and a
// Dubai plate on the back. Front faces +z, wheels on the ground.

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Car } from "@/lib/cars";

function plateTexture(plate: string) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = "#111827"; g.lineWidth = 4; g.strokeRect(2, 2, 252, 60);
  g.fillStyle = "#b91c1c"; g.fillRect(6, 6, 46, 52);
  g.fillStyle = "#ffffff"; g.font = "900 22px sans-serif"; g.textAlign = "center"; g.fillText("DXB", 29, 40);
  g.fillStyle = "#111827"; g.font = "900 38px sans-serif"; g.fillText(plate, 154, 46);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const LENGTH: Record<string, number> = { sedan: 4.7, compact: 4.6, "sport-sedan": 4.85, suv: 5.0, supercar: 4.5 };
/** How long a car is in the scene (metres). */
export const carLength = (car: { model3d?: string }) => LENGTH[car.model3d ?? "sedan"] ?? 4.7;
/** The paint: each model's body material (the rest is glass, tyres, trim and lights). */
const BODY = /^(LightBlue|Blue|White|Main)$/;

export function CarModel({ car, plate = "DUBAI" }: { car: Car & { model3d?: string }; plate?: string }) {
  const kind = car.model3d ?? "sedan";
  const { scene } = useGLTF(`/models/cars/${kind}.glb`);
  const tex = useMemo(() => plateTexture(plate), [plate]);
  const built = useMemo(() => {
    const s = scene.clone(true);
    const paint = new THREE.MeshPhysicalMaterial({ color: car.color, metalness: 0.5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((mat) => (BODY.test(mat.name) ? paint : mat.name === "Windows" ? new THREE.MeshPhysicalMaterial({ color: "#0b1220", metalness: 0.4, roughness: 0.03 }) : mat));
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    // Size it to the car's length, wheels on the ground, centred; the models' length runs along one axis.
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const alongX = size.x > size.z;
    const k = (LENGTH[kind] ?? 4.7) / Math.max(size.x, size.z);
    const holder = new THREE.Group();
    holder.add(s);
    s.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(s);
    const c = b2.getCenter(new THREE.Vector3());
    s.position.set(-c.x, -b2.min.y, -c.z);
    return { holder, alongX, height: b2.max.y - b2.min.y, length: LENGTH[kind] ?? 4.7 };
  }, [scene, car.color, kind]);

  return (
    <group>
      {/* The models face +x or +z depending on how they were made: turned to face +z. */}
      <group rotation={[0, built.alongX ? -Math.PI / 2 : 0, 0]}><primitive object={built.holder} /></group>
      <mesh position={[0, built.height * 0.32, -built.length / 2 - 0.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.52, 0.13]} /><meshStandardMaterial map={tex} /></mesh>
    </group>
  );
}

for (const k of Object.keys(LENGTH)) useGLTF.preload(`/models/cars/${k}.glb`);
