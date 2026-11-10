"use client";

// Coca-Cola Arena on fight night: the ring (canvas, apron, red and blue corners, three ropes a side), a
// spotlight over it, coloured rim lights and LED rings, and a crowd round it that cheers harder on big
// moments. The crowd is two instanced meshes (bodies and heads), thinned on slower phones.

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useQuality } from "../../GameStage";
import { stageFx, useGameFrame } from "../../stage";

const RING = 5.2; // canvas width, metres
const POST_H = 1.35;

function Ropes() {
  const half = RING / 2;
  const posts: Array<[number, number, string]> = [[-half, -half, "#dc2626"], [half, -half, "#e5e7eb"], [half, half, "#1d4ed8"], [-half, half, "#e5e7eb"]];
  const sides = [0, 1, 2, 3].map((i) => [posts[i], posts[(i + 1) % 4]] as const);
  const colours = ["#dc2626", "#f8fafc", "#1d4ed8"];
  return (
    <group>
      {posts.map(([x, z, c], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, POST_H / 2 + 0.2, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, POST_H, 10]} /><meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, POST_H * 0.62 + 0.2, 0]}><boxGeometry args={[0.2, POST_H * 0.8, 0.2]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
        </group>
      ))}
      {sides.map(([[x1, z1], [x2, z2]], i) =>
        colours.map((c, k) => {
          const y = 0.55 + k * 0.38;
          const len = Math.hypot(x2 - x1, z2 - z1);
          return (
            <mesh key={`${i}-${k}`} position={[(x1 + x2) / 2, y, (z1 + z2) / 2]} rotation={[0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2]}>
              <cylinderGeometry args={[0.025, 0.025, len, 8]} />
              <meshStandardMaterial color={c} roughness={0.4} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function Crowd({ count, hypeRef }: { count: number; hypeRef: RefObject<number> }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const seats = useMemo(() => {
    const out: Array<{ x: number; z: number; y: number; phase: number; yaw: number }> = [];
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const sideIdx = i % 4, row = Math.floor(i / 4) % 6, along = (rand() - 0.5) * 10;
      const dist = 4.6 + row * 0.75;
      const y = 0.25 + row * 0.42;
      const [x, z] = sideIdx === 0 ? [along, -dist] : sideIdx === 1 ? [dist, along] : sideIdx === 2 ? [along, dist] : [-dist, along];
      out.push({ x, z, y, phase: rand() * Math.PI * 2, yaw: Math.atan2(-x, -z) });
    }
    return out;
  }, [count]);
  useLayoutEffect(() => {
    const palette = ["#ef4444", "#f8fafc", "#0f172a", "#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#e11d48"];
    const skin = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#5c3a21"];
    const c = new THREE.Color();
    seats.forEach((_, i) => {
      bodies.current?.setColorAt(i, c.set(palette[i % palette.length]));
      heads.current?.setColorAt(i, c.set(skin[(i * 7) % skin.length]));
    });
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [seats]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useGameFrame((dt, t) => {
    hypeRef.current = Math.max(0, hypeRef.current - dt * 0.6);
    const b = bodies.current, h = heads.current;
    if (!b || !h) return;
    const jump = 0.03 + hypeRef.current * 0.16;
    seats.forEach((s, i) => {
      const lift = Math.max(0, Math.sin(t * (5 + hypeRef.current * 4) + s.phase)) * jump;
      // Seated on the tier (its top is at s.y), bouncing up when the crowd gets loud.
      o.position.set(s.x, s.y + 0.25 + lift, s.z); o.rotation.set(0, s.yaw, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      b.setMatrixAt(i, o.matrix);
      o.position.y += 0.42; o.updateMatrix();
      h.setMatrixAt(i, o.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, seats.length]} frustumCulled={false}>
        <capsuleGeometry args={[0.17, 0.32, 3, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, seats.length]} frustumCulled={false}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

/** Tiered seating on all four sides, where the crowd sits (rows match Crowd's). */
function Stands() {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <group>
      {[0, 1, 2, 3].map((side) => (
        <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
          {rows.map((r) => (
            <mesh key={r} position={[0, (0.25 + r * 0.42) / 2, -(4.6 + r * 0.75)]} receiveShadow>
              <boxGeometry args={[11, 0.25 + r * 0.42, 0.75]} />
              <meshStandardMaterial color={r % 2 ? "#111827" : "#0f172a"} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Arena({ hypeRef }: { hypeRef: RefObject<number> }) {
  const tier = useQuality();
  const crowd = tier === 2 ? 240 : tier === 1 ? 120 : 48;
  const rims = useRef<THREE.Group>(null);
  useGameFrame((_, t) => {
    if (rims.current) rims.current.rotation.y = t * 0.15 + stageFx.shake * 2;
  });
  return (
    <group>
      <fog attach="fog" args={["#05070d", 9, 22]} />
      <hemisphereLight args={["#c7d2fe", "#0b1020", 0.45]} />
      <spotLight position={[0, 7.5, 0.6]} angle={0.62} penumbra={0.55} intensity={tier === 0 ? 70 : 95} castShadow={tier === 2} shadow-mapSize={[1024, 1024]} color="#fff7ed" />
      <group ref={rims}>
        <pointLight position={[5, 3.2, 0]} intensity={14} distance={12} color="#ef4444" />
        <pointLight position={[-5, 3.2, 0]} intensity={14} distance={12} color="#3b82f6" />
      </group>

      {/* The arena floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0b0f19" roughness={0.9} /></mesh>
      {/* Ring: apron, canvas and the centre logo ring */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow><boxGeometry args={[RING + 0.9, 0.2, RING + 0.9]} /><meshStandardMaterial color="#111827" roughness={0.7} /></mesh>
      <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[RING, RING]} /><meshStandardMaterial color="#1e3a8a" roughness={0.85} /></mesh>
      <mesh position={[0, 0.207, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.05, 48]} /><meshStandardMaterial color="#f8fafc" roughness={0.6} /></mesh>
      <mesh position={[0, 0.207, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.45, 32]} /><meshStandardMaterial color="#dc2626" roughness={0.6} /></mesh>
      <group position={[0, 0.2, 0]}><Ropes /></group>

      {/* LED rings over the ring and round the bowl */}
      <mesh position={[0, 6.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.2, 0.08, 8, 64]} /><meshBasicMaterial color="#f43f5e" toneMapped={false} /></mesh>
      <mesh position={[0, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[9.5, 0.12, 8, 96]} /><meshBasicMaterial color="#fbbf24" toneMapped={false} /></mesh>

      <Stands />
      <Crowd count={crowd} hypeRef={hypeRef} />
    </group>
  );
}
