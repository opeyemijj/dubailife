"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ApartmentRoom, type Person } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS, type HousingTier } from "@/lib/furniture";

const ALL = ["balloons", "bunting", "lights", "flowers", "neon", "discoball"];

export function PartyPreview({ tier, guests, decor }: { tier: string; guests: number; decor: string }) {
  const housingTier = (tier in HOUSING_CONFIGS ? tier : "villa") as HousingTier;
  const people = useMemo<Person[]>(() => Array.from({ length: guests }, (_, i) => {
    const a = (i / Math.max(1, guests)) * Math.PI * 2;
    return { look: { gender: i % 2 ? "man" : "woman", outfit: "party" }, position: [Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6], rotation: -a, animation: "dance", label: `@guest${i + 1}` } as Person;
  }), [guests]);
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier={housingTier} view="above" homeStyle={{ ...HOUSING_CONFIGS[housingTier].finish, exterior: ["pool", "garden"] }}
        partyDecor={decor === "none" ? undefined : decor === "all" ? ALL : decor.split(",")} people={people} extras={<SceneCount />} />
    </main>
  );
}

/** Counts everything in the scene every 2 s onto window.__scene (meshes, skinned avatars, lights, materials, triangles). */
function SceneCount() {
  useFrame(({ scene, clock }) => {
    if (Math.floor(clock.elapsedTime * 10) % 20) return;
    let meshes = 0, skinned = 0, tris = 0, shadowCasters = 0, points = 0, otherLights = 0, instanced = 0;
    const mats = new Set<string>();
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if ((o as THREE.PointLight).isPointLight) points++;
      else if ((o as THREE.Light).isLight) otherLights++;
      if (!m.isMesh) return;
      meshes++;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      if ((m as THREE.InstancedMesh).isInstancedMesh) instanced++;
      if (m.castShadow) shadowCasters++;
      const g = m.geometry;
      const n = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
      tris += n * ((m as THREE.InstancedMesh).count ?? 1);
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x.uuid));
    });
    // What each piece of furniture costs (meshes, lights), by the item its group is tagged with.
    const items: Record<string, { meshes: number; lights: number; tris: number }> = {};
    scene.traverseVisible((o) => {
      let p: THREE.Object3D | null = o; let id: string | undefined;
      while (p && !id) { id = p.userData?.item; p = p.parent; }
      const key = id ?? "(room, grounds, people, decor)";
      const r = (items[key] ??= { meshes: 0, lights: 0, tris: 0 });
      if ((o as THREE.Light).isLight) r.lights++;
      const m = o as THREE.Mesh;
      if (m.isMesh) { r.meshes++; const g = m.geometry; r.tris += Math.round(g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3); }
    });
    (window as unknown as { __items?: unknown }).__items = items;
    (window as unknown as { __scene?: unknown }).__scene = { meshes, skinned, instanced, shadowCasters, materials: mats.size, pointLights: points, otherLights, tris: Math.round(tris) };
  });
  return null;
}
