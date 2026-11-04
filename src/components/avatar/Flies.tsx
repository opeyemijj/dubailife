"use client";

// Flies buzzing round someone who hasn't washed (hygiene below 25%): a few dark specks circling the head on
// wobbly paths, with a faint green haze. They go when you shower. Others in the room see them too.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Below this hygiene, the flies come. */
export const DIRTY_BELOW = 25;
export const isDirty = (hygiene: number | undefined) => typeof hygiene === "number" && hygiene < DIRTY_BELOW;

const COUNT = 7;

export function Flies({ height = 1.7 }: { height?: number }) {
  const flies = useRef<THREE.InstancedMesh>(null);
  const haze = useRef<THREE.Mesh>(null);
  // Each fly: its own orbit radius, speed, height and wobble.
  const paths = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    r: 0.28 + (i % 3) * 0.12, speed: 2.2 + (i * 0.37) % 1.6, y: height - 0.25 + ((i * 0.53) % 0.6), phase: i * 1.7, wobble: 0.08 + (i % 4) * 0.03, dir: i % 2 ? 1 : -1,
  })), [height]);
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mesh = flies.current;
    if (!mesh) return;
    paths.forEach((p, i) => {
      const a = p.phase + t * p.speed * p.dir;
      m.position.set(Math.cos(a) * p.r + Math.sin(t * 7 + i) * p.wobble, p.y + Math.sin(t * 5.3 + p.phase) * 0.12, Math.sin(a) * p.r + Math.cos(t * 6 + i) * p.wobble);
      // Wings blur: a slight flicker in size.
      const s = 0.9 + Math.sin(t * 40 + i) * 0.15;
      m.scale.set(s, s, s);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (haze.current) (haze.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 1.5) * 0.04;
  });
  return (
    <group raycast={() => null}>
      <instancedMesh ref={flies} args={[undefined, undefined, COUNT]} raycast={() => null}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <meshBasicMaterial color="#111827" />
      </instancedMesh>
      <mesh ref={haze} position={[0, height - 0.35, 0]} raycast={() => null}>
        <sphereGeometry args={[0.55, 12, 8]} />
        <meshBasicMaterial color="#84cc16" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
