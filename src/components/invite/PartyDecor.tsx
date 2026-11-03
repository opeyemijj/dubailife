"use client";

// Party decorations in 3D, for the room a party is in (a home or a venue): balloons in the corners, bunting and fairy
// lights along the walls, flowers, a neon sign and a turning disco ball with coloured lights. Room size in metres,
// centred on the origin, with the back wall at -d/2 and the left wall at -w/2.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLOURS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

function Balloons({ w, d }: { w: number; d: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => { c.position.y = Math.sin(clock.elapsedTime * 1.3 + i) * 0.05; });
  });
  const corners: [number, number][] = [[-w / 2 + 0.6, -d / 2 + 0.6], [w / 2 - 0.6, -d / 2 + 0.6], [-w / 2 + 0.6, d / 2 - 0.9], [w / 2 - 0.6, d / 2 - 0.9]];
  return (
    <group ref={group}>
      {corners.map(([x, z], ci) => (
        <group key={ci} position={[x, 0, z]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2, top = 1.7 + (i % 3) * 0.22;
            return (
              <group key={i}>
                <mesh position={[Math.cos(a) * 0.22, top, Math.sin(a) * 0.22]} scale={[1, 1.18, 1]}>
                  <sphereGeometry args={[0.2, 18, 14]} />
                  <meshStandardMaterial color={COLOURS[(ci + i) % COLOURS.length]} roughness={0.25} metalness={0.1} />
                </mesh>
                <mesh position={[Math.cos(a) * 0.11, top / 2, Math.sin(a) * 0.11]}>
                  <cylinderGeometry args={[0.004, 0.004, top, 4]} />
                  <meshBasicMaterial color="#e5e7eb" />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** A row along a wall: from (x0, z0) to (x1, z1) at height y. */
function along(x0: number, z0: number, x1: number, z1: number, step: number) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / step));
  return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n] as [number, number]);
}

function Bunting({ w, d, h }: { w: number; d: number; h: number }) {
  const flag = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.13, 0); s.lineTo(0.13, 0); s.lineTo(0, -0.28); s.lineTo(-0.13, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  const y = h - 0.45;
  const back = along(-w / 2 + 0.2, -d / 2 + 0.12, w / 2 - 0.2, -d / 2 + 0.12, 0.34);
  const left = along(-w / 2 + 0.12, -d / 2 + 0.2, -w / 2 + 0.12, d / 2 - 0.4, 0.34);
  return (
    <group>
      {back.map(([x, z], i) => <mesh key={`b${i}`} geometry={flag} position={[x, y - Math.sin((i / back.length) * Math.PI) * 0.25, z]}><meshStandardMaterial color={COLOURS[i % COLOURS.length]} side={THREE.DoubleSide} /></mesh>)}
      {left.map(([x, z], i) => <mesh key={`l${i}`} geometry={flag} rotation={[0, Math.PI / 2, 0]} position={[x, y - Math.sin((i / left.length) * Math.PI) * 0.25, z]}><meshStandardMaterial color={COLOURS[(i + 3) % COLOURS.length]} side={THREE.DoubleSide} /></mesh>)}
    </group>
  );
}

function FairyLights({ w, d, h }: { w: number; d: number; h: number }) {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    mats.current.forEach((m, i) => { if (m) m.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 3 + i * 0.7) * 0.9; });
  });
  const y = h - 0.18;
  const dots = [...along(-w / 2 + 0.1, -d / 2 + 0.08, w / 2 - 0.1, -d / 2 + 0.08, 0.3), ...along(-w / 2 + 0.08, -d / 2 + 0.1, -w / 2 + 0.08, d / 2 - 0.3, 0.3)];
  return (
    <group>
      {dots.map(([x, z], i) => (
        <mesh key={i} position={[x, y - (i % 2) * 0.06, z]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial ref={(m) => { if (m) mats.current[i] = m; }} color="#fff7d6" emissive="#ffd27a" emissiveIntensity={2} />
        </mesh>
      ))}
      <pointLight position={[0, h - 0.4, -d / 2 + 0.6]} intensity={4} distance={6} color="#ffd27a" />
    </group>
  );
}

function Flowers({ w, d }: { w: number; d: number }) {
  const spots: [number, number][] = [[-w / 2 + 1.3, -d / 2 + 0.45], [w / 2 - 1.3, -d / 2 + 0.45]];
  return (
    <group>
      {spots.map(([x, z], s) => (
        <group key={s} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.16, 0.12, 0.7, 16]} /><meshStandardMaterial color="#f8fafc" roughness={0.2} /></mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2, r = i % 3 === 0 ? 0 : 0.16;
            return <mesh key={i} position={[Math.cos(a) * r, 0.86 + (i % 3) * 0.07, Math.sin(a) * r]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color={["#f472b6", "#fb7185", "#fde68a", "#f9a8d4"][i % 4]} /></mesh>;
          })}
        </group>
      ))}
    </group>
  );
}

function Neon({ d, h }: { d: number; h: number }) {
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
      <mesh><planeGeometry args={[1.8, 0.56]} /><meshBasicMaterial map={texture} transparent toneMapped={false} /></mesh>
      <pointLight position={[0, 0, 0.4]} intensity={3} distance={4} color="#ff4fd8" />
    </group>
  );
}

function DiscoBall({ h }: { h: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const lights = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ball.current) ball.current.rotation.y += dt * 0.8;
    if (lights.current) lights.current.rotation.y -= dt * 0.6;
  });
  return (
    <group position={[0, h - 0.55, 0]}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.008, 0.008, 0.5, 4]} /><meshBasicMaterial color="#9ca3af" /></mesh>
      <mesh ref={ball}><icosahedronGeometry args={[0.3, 2]} /><meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.08} flatShading /></mesh>
      <group ref={lights}>
        {["#f43f5e", "#3b82f6", "#22c55e"].map((c, i) => (
          <pointLight key={c} position={[Math.cos((i / 3) * Math.PI * 2) * 1.6, -0.8, Math.sin((i / 3) * Math.PI * 2) * 1.6]} intensity={5} distance={6} color={c} />
        ))}
      </group>
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
      {decor.includes("discoball") && <DiscoBall h={h} />}
    </group>
  );
}
