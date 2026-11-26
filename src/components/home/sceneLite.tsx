"use client";

// Keeping big homes light on older phones (a 30 m mansion floor was ~1,300 meshes, ~1,240 materials, 8 lights):
//  - sharedStd: one material per look (colour, roughness, metalness, glow) instead of one per mesh;
//  - MergeStatic: the furniture's code-drawn parts that never move are baked into a few big meshes, one per
//    material, so the GPU draws dozens of things instead of a thousand (the pieces stay, hidden, for tapping);
//  - LightPool: lamps don't each light the room; a few real lights follow the lamps nearest to where you're
//    looking, so the number of lights (and the shaders) never changes as you walk round.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------- shared materials

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** The one material for this look (never changed after it's made: anything animated keeps its own). */
export function sharedStd(o: { color: string; metal?: number; rough?: number; emissive?: string; glow?: number; opacity?: number }) {
  const key = `${o.color}|${o.metal ?? 0}|${o.rough ?? 0.6}|${o.emissive ?? ""}|${o.glow ?? 0}|${o.opacity ?? 1}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: o.color, metalness: o.metal ?? 0, roughness: o.rough ?? 0.6,
      emissive: o.emissive ?? "#000000", emissiveIntensity: o.glow ?? 0,
      transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1,
    });
    m.userData.shared = true;
    cache.set(key, m);
  }
  return m;
}

const ghosts = {
  valid: new THREE.MeshStandardMaterial({ color: "#34d399", transparent: true, opacity: 0.5, depthWrite: false }),
  invalid: new THREE.MeshStandardMaterial({ color: "#f87171", transparent: true, opacity: 0.5, depthWrite: false }),
};
/** The placement ghost's tint (shared, never merged). */
export const ghostMat = (g: "valid" | "invalid") => ghosts[g];

/** A shared material as a mesh's child: `<mesh><Std color="#fff" /></mesh>`. */
export function Std(props: Parameters<typeof sharedStd>[0]) {
  return <primitive object={sharedStd(props)} attach="material" dispose={null} />;
}

// ---------------------------------------------------------------- merging what doesn't move

/**
 * Bakes the still, code-drawn meshes under it (shared materials only; not instanced, skinned or under a group marked
 * `userData.live`) into one mesh per material and hides the originals, which stay for taps and for moving pieces.
 * Re-bakes when `version` changes; off while `enabled` is false (decorating, when pieces are picked up and moved).
 */
export function MergeStatic({ version, enabled, children }: { version: string; enabled: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const root = group.current;
    if (!enabled || !root) return;
    let made: THREE.Mesh[] = [];
    let hidden: THREE.Object3D[] = [];
    // Once the pieces have mounted and stopped changing (models and Suspense settle first): checked every 0.4 s
    // until the count of meshes holds steady.
    let last = -1, tries = 0;
    const countMeshes = () => { let n = 0; root.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.merged) n++; }); return n; };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const check = () => {
      const n = countMeshes();
      if ((n !== last || n === 0) && tries++ < 15) { last = n; timer = setTimeout(check, 400); return; }
      bake();
    };
    timer = setTimeout(check, 300);
    const bake = () => {
        root.updateWorldMatrix(true, true);
        const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
        const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
        // `userData.bake` on a group: everything under it is still (parked cars), whatever its materials.
        const walk = (o: THREE.Object3D, live: boolean, bakeAll = false) => {
          if (!o.visible) return;
          const isLive = live || !!o.userData?.live;
          const all = bakeAll || !!o.userData?.bake;
          const m = o as THREE.Mesh;
          if (m.isMesh && !isLive && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) {
            const mat = m.material as THREE.Material;
            if (!Array.isArray(m.material) && (mat?.userData?.shared || all) && !mat.transparent && m.geometry?.attributes.position) {
              const g = m.geometry.clone();
              // Models without texture coordinates (car bodies) or normals get them, so all merge alike.
              if (!g.attributes.normal) g.computeVertexNormals();
              if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
              // Gems and other non-indexed shapes get an index, so everything merges the same way.
              if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
              if (g.morphAttributes && Object.keys(g.morphAttributes).length) g.morphAttributes = {};
              for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
              g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
              const b = buckets.get(mat) ?? { geos: [], shadow: false };
              b.geos.push(g);
              // Only bigger pieces cast shadows (a book or a ball doesn't need its own).
              if (m.castShadow) { m.geometry.computeBoundingSphere(); if ((m.geometry.boundingSphere?.radius ?? 0) > 0.18) b.shadow = true; }
              buckets.set(mat, b);
              hidden.push(m);
            }
          }
          for (const c of o.children) walk(c, isLive, all);
        };
        for (const c of root.children) walk(c, false);
        for (const [mat, b] of buckets) {
          const geo = mergeGeometries(b.geos, false);
          b.geos.forEach((g) => g.dispose());
          if (!geo) continue;
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = b.shadow;
          mesh.receiveShadow = true;
          // The baked copy isn't tapped: the hidden originals are.
          mesh.raycast = () => {};
          mesh.userData.merged = true;
          root.add(mesh);
          made.push(mesh);
        }
        for (const m of hidden) m.visible = false;
    };
    return () => {
      if (timer) clearTimeout(timer);
      for (const m of made) { root.remove(m); m.geometry.dispose(); }
      for (const m of hidden) m.visible = true;
      made = []; hidden = [];
    };
  }, [version, enabled]);
  return <group ref={group}>{children}</group>;
}

// ---------------------------------------------------------------- a few real lights for many lamps

type Lamp = { obj: THREE.Object3D; intensity: number; distance: number; color: THREE.Color };
const PoolContext = createContext<Set<Lamp> | null>(null);

/** Inside a LightPool: this lamp's light, as a spot the pool's lights can sit at. */
export function usePooledLamp() {
  return useContext(PoolContext);
}
export function PooledLamp({ pool, position, intensity = 1, distance = 0, color = "#ffffff" }: { pool: Set<Lamp>; position?: THREE.Vector3Tuple | THREE.Vector3; intensity?: number; distance?: number; color?: THREE.ColorRepresentation }) {
  const ref = useRef<THREE.Object3D>(null);
  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    const lamp: Lamp = { obj, intensity, distance, color: new THREE.Color(color) };
    pool.add(lamp);
    return () => { pool.delete(lamp); };
  }, [pool, intensity, distance, color]);
  return <object3D ref={ref} position={position as THREE.Vector3Tuple} />;
}

/**
 * `count` real point lights that move to the lamps nearest the camera's aim (checked a few times a second).
 * Lamps inside it (RoomLight) register here instead of lighting the room themselves.
 */
export function LightPool({ count, children }: { count: number; children: ReactNode }) {
  const [lamps] = useState(() => new Set<Lamp>());
  const lights = useRef<Array<THREE.PointLight | null>>([]);
  const t = useRef(0);
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
  const aim = useRef(new THREE.Vector3());
  const p = useRef(new THREE.Vector3());
  useFrame(({ camera }, dt) => {
    t.current -= dt;
    if (t.current > 0) return;
    t.current = 0.3;
    aim.current.copy(controls?.target ?? camera.position);
    const near = [...lamps].map((l) => ({ l, d: l.obj.getWorldPosition(p.current).distanceToSquared(aim.current), at: p.current.clone() }))
      .sort((a, b) => a.d - b.d).slice(0, count);
    lights.current.forEach((light, i) => {
      if (!light) return;
      const n = near[i];
      // An unused light stays (so the shaders don't change) but gives no light.
      if (!n) { light.intensity = 0; return; }
      light.position.copy(n.at);
      light.intensity = n.l.intensity;
      light.distance = n.l.distance;
      light.color.copy(n.l.color);
    });
  });
  return (
    <PoolContext.Provider value={lamps}>
      {Array.from({ length: count }, (_, i) => <pointLight key={i} ref={(l) => { lights.current[i] = l; }} intensity={0} />)}
      {children}
    </PoolContext.Provider>
  );
}
