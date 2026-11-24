"use client";

// Party decorations in 3D, for the room a party is in (a home or a venue): balloons in the corners, bunting and fairy
// lights along the walls, flowers, a neon sign and a turning disco ball. Room size in metres, centred on the origin,
// with the back wall at -d/2 and the left wall at -w/2.
//
// Drawn light, as a party already has a houseful of guests to draw: each kind of decoration is one instanced mesh
// (all the balloons in one draw, all the flags in another…) rather than a mesh and a material per piece, and none of
// them adds a real light. The fairy bulbs and the neon glow by themselves, and the disco ball throws its coloured
// spots across the floor as glowing patches that sweep round, instead of three moving point lights (every light is
// shaded on every pixel of every lit surface). Measured on a villa: from ~195 meshes and 6 lights to 10 and none.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLOURS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];
const tmp = new THREE.Object3D();
const col = new THREE.Color();

/** Places an instanced mesh's pieces once (and colours them), then leaves it alone unless `animate` moves them. */
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, n: number, place: (i: number, o: THREE.Object3D) => void, colour?: (i: number) => string) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < n; i++) {
      tmp.position.set(0, 0, 0); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1);
      place(i, tmp);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      if (colour) m.setColorAt(i, col.set(colour(i)));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ref, n, place, colour]);
}

function Balloons({ w, d }: { w: number; d: number }) {
  const balls = useRef<THREE.InstancedMesh>(null);
  const strings = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const corners: [number, number][] = [[-w / 2 + 0.6, -d / 2 + 0.6], [w / 2 - 0.6, -d / 2 + 0.6], [-w / 2 + 0.6, d / 2 - 0.9], [w / 2 - 0.6, d / 2 - 0.9]];
    return corners.flatMap(([x, z], ci) => [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return { x: x + Math.cos(a) * 0.22, z: z + Math.sin(a) * 0.22, sx: x + Math.cos(a) * 0.11, sz: z + Math.sin(a) * 0.11, top: 1.7 + (i % 3) * 0.22, colour: COLOURS[(ci + i) % COLOURS.length] };
    }));
  }, [w, d]);
  const placeString = useMemo(() => (i: number, o: THREE.Object3D) => { const s = spots[i]; o.position.set(s.sx, s.top / 2, s.sz); o.scale.set(1, s.top, 1); }, [spots]);
  useInstances(strings, spots.length, placeString);
  const colour = useMemo(() => (i: number) => spots[i].colour, [spots]);
  const placeBall = useMemo(() => (i: number, o: THREE.Object3D) => { const s = spots[i]; o.position.set(s.x, s.top, s.z); o.scale.set(1, 1.18, 1); }, [spots]);
  useInstances(balls, spots.length, placeBall, colour);
  // They bob, gently (twenty matrices a frame).
  useFrame(({ clock }) => {
    const m = balls.current;
    if (!m) return;
    spots.forEach((s, i) => {
      tmp.position.set(s.x, s.top + Math.sin(clock.elapsedTime * 1.3 + i) * 0.05, s.z); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1.18, 1);
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={balls} args={[undefined, undefined, spots.length]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial roughness={0.25} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={strings} args={[undefined, undefined, spots.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.004, 0.004, 1, 4]} />
        <meshBasicMaterial color="#e5e7eb" />
      </instancedMesh>
    </group>
  );
}

/** A row along a wall: from (x0, z0) to (x1, z1) at height y. */
function along(x0: number, z0: number, x1: number, z1: number, step: number) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / step));
  return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n] as [number, number]);
}

function Bunting({ w, d, h }: { w: number; d: number; h: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const flag = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.13, 0); s.lineTo(0.13, 0); s.lineTo(0, -0.28); s.lineTo(-0.13, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  const flags = useMemo(() => {
    const y = h - 0.45;
    const back = along(-w / 2 + 0.2, -d / 2 + 0.12, w / 2 - 0.2, -d / 2 + 0.12, 0.34);
    const left = along(-w / 2 + 0.12, -d / 2 + 0.2, -w / 2 + 0.12, d / 2 - 0.4, 0.34);
    return [
      ...back.map(([x, z], i) => ({ x, z, y: y - Math.sin((i / back.length) * Math.PI) * 0.25, yaw: 0, colour: COLOURS[i % COLOURS.length] })),
      ...left.map(([x, z], i) => ({ x, z, y: y - Math.sin((i / left.length) * Math.PI) * 0.25, yaw: Math.PI / 2, colour: COLOURS[(i + 3) % COLOURS.length] })),
    ];
  }, [w, d, h]);
  const place = useMemo(() => (i: number, o: THREE.Object3D) => { const f = flags[i]; o.position.set(f.x, f.y, f.z); o.rotation.set(0, f.yaw, 0); }, [flags]);
  const colour = useMemo(() => (i: number) => flags[i].colour, [flags]);
  useInstances(ref, flags.length, place, colour);
  return (
    <instancedMesh ref={ref} args={[flag, undefined, flags.length]} frustumCulled={false}>
      <meshStandardMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function FairyLights({ w, d, h }: { w: number; d: number; h: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dots = useMemo(() => {
    const y = h - 0.18;
    return [...along(-w / 2 + 0.1, -d / 2 + 0.08, w / 2 - 0.1, -d / 2 + 0.08, 0.3), ...along(-w / 2 + 0.08, -d / 2 + 0.1, -w / 2 + 0.08, d / 2 - 0.3, 0.3)]
      .map(([x, z], i) => [x, y - (i % 2) * 0.06, z] as const);
  }, [w, d, h]);
  const place = useMemo(() => (i: number, o: THREE.Object3D) => o.position.set(...dots[i]), [dots]);
  const warm = useMemo(() => () => "#ffd27a", []);
  useInstances(ref, dots.length, place, warm);
  // They twinkle: each bulb's brightness, a few times a second (not every frame).
  const last = useRef(0);
  useFrame(({ clock }) => {
    const m = ref.current, t = clock.elapsedTime;
    if (!m || t - last.current < 0.12) return;
    last.current = t;
    for (let i = 0; i < dots.length; i++) m.setColorAt(i, col.set("#ffd27a").multiplyScalar(1.2 + Math.sin(t * 3 + i * 0.7) * 0.6));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, dots.length]} frustumCulled={false}>
      <sphereGeometry args={[0.035, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Flowers({ w, d }: { w: number; d: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots: [number, number][] = useMemo(() => [[-w / 2 + 1.3, -d / 2 + 0.45], [w / 2 - 1.3, -d / 2 + 0.45]], [w, d]);
  const blooms = useMemo(() => spots.flatMap(([x, z]) => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2, r = i % 3 === 0 ? 0 : 0.16;
    return { p: [x + Math.cos(a) * r, 0.86 + (i % 3) * 0.07, z + Math.sin(a) * r] as const, colour: ["#f472b6", "#fb7185", "#fde68a", "#f9a8d4"][i % 4] };
  })), [spots]);
  const place = useMemo(() => (i: number, o: THREE.Object3D) => o.position.set(...blooms[i].p), [blooms]);
  const colour = useMemo(() => (i: number) => blooms[i].colour, [blooms]);
  useInstances(ref, blooms.length, place, colour);
  return (
    <group>
      {spots.map(([x, z], s) => <mesh key={s} position={[x, 0.35, z]}><cylinderGeometry args={[0.16, 0.12, 0.7, 16]} /><meshStandardMaterial color="#f8fafc" roughness={0.2} /></mesh>)}
      <instancedMesh ref={ref} args={[undefined, undefined, blooms.length]} frustumCulled={false}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
    </group>
  );
}

/** A soft round glow, painted once: for the neon's halo and the disco ball's spots. */
function useGlow() {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,0.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Neon({ d, h }: { d: number; h: number }) {
  const glow = useGlow();
  const texture = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 512, 160);
    g.font = "bold 104px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#ff2fd0"; g.shadowBlur = 28; g.fillStyle = "#ffd6f5";
    g.fillText("PARTY", 256, 84); g.fillText("PARTY", 256, 84);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[0, h * 0.62, -d / 2 + 0.09]}>
      {/* Its pink halo on the wall, in place of a light. */}
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[3.2, 1.6]} /><meshBasicMaterial map={glow} color="#ff4fd8" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh><planeGeometry args={[1.8, 0.56]} /><meshBasicMaterial map={texture} transparent toneMapped={false} /></mesh>
    </group>
  );
}

function DiscoBall({ h, w, d }: { h: number; w: number; d: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const spots = useRef<THREE.InstancedMesh>(null);
  const glow = useGlow();
  const N = 14;
  const colours = useMemo(() => Array.from({ length: N }, (_, i) => ["#f43f5e", "#3b82f6", "#22c55e", "#facc15", "#a855f7"][i % 5]), []);
  const colour = useMemo(() => (i: number) => colours[i], [colours]);
  const flat = useMemo(() => (_: number, o: THREE.Object3D) => { o.rotation.set(-Math.PI / 2, 0, 0); }, []);
  useInstances(spots, N, flat, colour);
  // The ball turns, and its spots sweep round the floor in rings, as the light off its mirrors would.
  useFrame(({ clock }, dt) => {
    if (ball.current) ball.current.rotation.y += dt * 0.8;
    const m = spots.current;
    if (!m) return;
    const t = clock.elapsedTime * 0.5, R = Math.min(w, d) * 0.42;
    for (let i = 0; i < N; i++) {
      const ring = 0.35 + (i % 3) * 0.3, a = (i / N) * Math.PI * 2 + t * (i % 2 ? 1 : -0.8);
      tmp.position.set(Math.cos(a) * R * ring, 0.03, Math.sin(a) * R * ring);
      tmp.rotation.set(-Math.PI / 2, 0, 0);
      const s = 0.55 + (i % 3) * 0.18; tmp.scale.set(s, s, s);
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <group position={[0, h - 0.55, 0]}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.008, 0.008, 0.5, 4]} /><meshBasicMaterial color="#9ca3af" /></mesh>
        <mesh ref={ball}><icosahedronGeometry args={[0.3, 2]} /><meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.08} flatShading emissive="#64748b" emissiveIntensity={0.4} /></mesh>
      </group>
      <instancedMesh ref={spots} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function PartyDecor({ decor, w, d, h }: { decor: string[]; w: number; d: number; h: number }) {
  if (!decor.length) return null;
  return (
    <group>
      {decor.includes("balloons") && <Balloons w={w} d={d} />}
      {decor.includes("bunting") && <Bunting w={w} d={d} h={h} />}
      {decor.includes("lights") && <FairyLights w={w} d={d} h={h} />}
      {decor.includes("flowers") && <Flowers w={w} d={d} />}
      {decor.includes("neon") && <Neon d={d} h={h} />}
      {decor.includes("discoball") && <DiscoBall h={h} w={w} d={d} />}
    </group>
  );
}
