"use client";

// The kitchen and bathroom built into the home, drawn in code: a kitchen run (cabinets, sink, hob and
// oven, microwave, blender, wall cabinets and a hood), a washing machine, a toilet, a glass walk-in
// shower and vanities with mirrors, plus the bathroom's walls. Each fixture's back is local -z (the wall)
// and its front +z, like the rest of the furniture. Tapping one asks to use it.

import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { CELL, floorCenter } from "@/lib/furniture";
import { fixtureRect, type Fixture, type FixtureWall } from "@/lib/homeFixtures";

const WHITE = "#f5f5f4", STEEL = "#cbd5e1", DARK = "#1f2937", GRANITE = "#334155", TILE = "#e7ebee", GLASS = "#bae6fd";

function Box({ p, s, c, r = 0.6, m = 0, o }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; m?: number; o?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} transparent={o !== undefined} opacity={o ?? 1} />
    </mesh>
  );
}

function KitchenRun({ w }: { w: number }) {
  const d = CELL * 0.95, back = -d / 2;
  const h = 0.88;
  const x = (f: number) => -w / 2 + w * f;
  return (
    <group>
      {/* base cabinets with door lines and handles */}
      <Box p={[0, h / 2, 0]} s={[w, h, d]} c={WHITE} />
      {[0.25, 0.5, 0.75].map((f) => <Box key={f} p={[x(f), h / 2, d / 2 + 0.002]} s={[0.01, h - 0.1, 0.004]} c="#d6d3d1" />)}
      {[0.12, 0.37, 0.62, 0.87].map((f) => <Box key={f} p={[x(f), h - 0.12, d / 2 + 0.015]} s={[0.12, 0.015, 0.02]} c={STEEL} m={0.8} r={0.3} />)}
      {/* oven door under the hob */}
      <Box p={[x(0.62), 0.42, d / 2 + 0.006]} s={[0.56, 0.5, 0.012]} c={DARK} r={0.2} m={0.3} />
      <Box p={[x(0.62), 0.42, d / 2 + 0.014]} s={[0.4, 0.3, 0.004]} c="#0f172a" r={0.05} />
      {/* worktop */}
      <Box p={[0, h + 0.02, 0.01]} s={[w + 0.02, 0.04, d + 0.03]} c={GRANITE} r={0.25} m={0.1} />
      {/* sink and tap */}
      <Box p={[x(0.3), h + 0.03, 0.02]} s={[0.42, 0.012, 0.32]} c="#94a3b8" m={0.9} r={0.25} />
      <Box p={[x(0.3), h + 0.13, back + 0.06]} s={[0.025, 0.2, 0.025]} c={STEEL} m={0.9} r={0.2} />
      <Box p={[x(0.3), h + 0.22, back + 0.13]} s={[0.025, 0.025, 0.14]} c={STEEL} m={0.9} r={0.2} />
      {/* five-burner hob */}
      <Box p={[x(0.62), h + 0.045, 0.02]} s={[0.58, 0.01, 0.4]} c="#0b1220" r={0.1} />
      {[[-0.18, -0.09], [0.18, -0.09], [-0.18, 0.11], [0.18, 0.11], [0, 0.01]].map(([dx, dz], i) => (
        <mesh key={i} position={[x(0.62) + dx, h + 0.053, 0.02 + dz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.035, i === 4 ? 0.07 : 0.055, 24]} />
          <meshStandardMaterial color="#475569" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* microwave and blender on the worktop */}
      <Box p={[x(0.1), h + 0.17, back + 0.18]} s={[0.4, 0.26, 0.3]} c={WHITE} />
      <Box p={[x(0.08), h + 0.17, back + 0.335]} s={[0.26, 0.18, 0.005]} c="#0f172a" r={0.05} />
      <mesh position={[x(0.9), h + 0.16, back + 0.15]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.22, 16]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.75} roughness={0.1} />
      </mesh>
      <Box p={[x(0.9), h + 0.05, back + 0.15]} s={[0.12, 0.06, 0.12]} c={DARK} />
      {/* wall cabinets, and the hood over the hob */}
      <Box p={[x(0.2), 1.85, back + 0.17]} s={[w * 0.4, 0.62, 0.34]} c={WHITE} />
      <Box p={[x(0.9), 1.85, back + 0.17]} s={[w * 0.2, 0.62, 0.34]} c={WHITE} />
      <Box p={[x(0.62), 1.62, back + 0.2]} s={[0.6, 0.12, 0.4]} c={STEEL} m={0.8} r={0.3} />
      <Box p={[x(0.62), 1.98, back + 0.12]} s={[0.24, 0.6, 0.22]} c={STEEL} m={0.8} r={0.3} />
      {/* splashback tiles */}
      <Box p={[0, h + 0.36, back + 0.005]} s={[w, 0.66, 0.01]} c="#e2e8f0" r={0.3} />
    </group>
  );
}

function Washer() {
  const s = CELL * 0.92;
  return (
    <group>
      <Box p={[0, 0.43, 0]} s={[s, 0.86, s]} c={WHITE} r={0.4} />
      <Box p={[0, 0.8, s / 2 + 0.004]} s={[s - 0.04, 0.07, 0.008]} c="#e5e7eb" />
      <mesh position={[0, 0.42, s / 2 + 0.01]}>
        <torusGeometry args={[0.15, 0.025, 12, 32]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.42, s / 2 + 0.008]}>
        <circleGeometry args={[0.135, 32]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.85} roughness={0.05} />
      </mesh>
    </group>
  );
}

function Toilet() {
  return (
    <group>
      <Box p={[0, 0.55, -0.17]} s={[0.36, 0.36, 0.16]} c="#fafafa" r={0.25} />
      <mesh position={[0, 0.2, 0.02]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.4, 24]} />
        <meshStandardMaterial color="#fafafa" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.41, 0.03]} scale={[1, 1, 1.25]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.03, 24]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
      </mesh>
      {/* bidet shower on the wall */}
      <Box p={[0.22, 0.6, -0.23]} s={[0.04, 0.12, 0.04]} c={STEEL} m={0.8} r={0.3} />
    </group>
  );
}

function Shower({ w, d }: { w: number; d: number }) {
  return (
    <group>
      <Box p={[0, 0.03, 0]} s={[w, 0.06, d]} c="#f8fafc" r={0.3} />
      {/* tiled back and side walls */}
      <Box p={[0, 1.15, -d / 2 + 0.01]} s={[w, 2.3, 0.02]} c={TILE} r={0.3} />
      <Box p={[w / 2 - 0.01, 1.15, 0]} s={[0.02, 2.3, d]} c={TILE} r={0.3} />
      {/* glass front and side, with a steel frame */}
      <Box p={[0, 1.05, d / 2 - 0.02]} s={[w, 2.0, 0.015]} c={GLASS} o={0.28} r={0.05} />
      <Box p={[-w / 2 + 0.02, 1.05, 0]} s={[0.015, 2.0, d]} c={GLASS} o={0.28} r={0.05} />
      <Box p={[0, 2.06, d / 2 - 0.02]} s={[w, 0.03, 0.03]} c={STEEL} m={0.9} r={0.2} />
      <Box p={[-w / 2 + 0.02, 2.06, 0]} s={[0.03, 0.03, d]} c={STEEL} m={0.9} r={0.2} />
      {/* rain head and mixer */}
      <Box p={[w / 4, 2.1, -d / 2 + 0.3]} s={[0.25, 0.02, 0.25]} c={STEEL} m={0.9} r={0.2} />
      <Box p={[w / 4, 2.15, -d / 2 + 0.15]} s={[0.02, 0.02, 0.3]} c={STEEL} m={0.9} r={0.2} />
      <Box p={[w / 4, 1.1, -d / 2 + 0.03]} s={[0.12, 0.12, 0.03]} c={STEEL} m={0.9} r={0.2} />
    </group>
  );
}

function Basin({ w, double }: { w: number; double?: boolean }) {
  const d = CELL * 0.9, back = -d / 2;
  const sinks = double ? [-w / 4, w / 4] : [0];
  return (
    <group>
      <Box p={[0, 0.4, 0]} s={[w, 0.8, d]} c="#3f2a1d" r={0.5} />
      <Box p={[0, 0.82, 0.01]} s={[w + 0.02, 0.04, d + 0.02]} c="#e7e5e4" r={0.3} />
      {sinks.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.85, 0.02]} scale={[1, 0.35, 0.8]}>
            <sphereGeometry args={[0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#fafafa" roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          <Box p={[x, 0.95, back + 0.06]} s={[0.025, 0.18, 0.025]} c={STEEL} m={0.9} r={0.2} />
        </group>
      ))}
      {/* the mirror */}
      <Box p={[0, 1.55, back + 0.01]} s={[w - 0.06, 0.8, 0.02]} c="#cbd5e1" m={0.95} r={0.05} />
      <Box p={[0, 1.55, back]} s={[w, 0.86, 0.015]} c="#78716c" />
    </group>
  );
}

function FixtureVisual({ f }: { f: Fixture }) {
  const w = f.size[0] * CELL, d = f.size[1] * CELL;
  switch (f.kind) {
    case "kitchen-run": return <KitchenRun w={w} />;
    case "washer": return <Washer />;
    case "toilet": return <Toilet />;
    case "shower": return <Shower w={w - 0.02} d={d - 0.02} />;
    case "basin": return <Basin w={w * 0.92} />;
    case "basin-double": return <Basin w={w * 0.95} double />;
  }
}

export function HomeFixtures({ fixtures, walls, wallColor, skirtingColor, wallH, onUse }: {
  fixtures: Fixture[]; walls: FixtureWall[]; wallColor: string; skirtingColor: string; wallH: number;
  onUse?: (f: Fixture) => void;
}) {
  const pieces = walls.flatMap((w) => {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len;
    const along = (t0: number, t1: number, y0: number, y1: number) => ({ x: w.a[0] + ux * (t0 + t1) / 2, z: w.a[1] + uz * (t0 + t1) / 2, len: t1 - t0, y0, y1, yaw: Math.atan2(-uz, ux) });
    if (!w.door) return [along(0, len, 0, wallH)];
    return [along(0, w.door[0], 0, wallH), along(w.door[1], len, 0, wallH), ...(wallH > 2.3 ? [along(w.door[0], w.door[1], 2.2, wallH)] : [])].filter((p) => p.len > 0.01);
  });
  const tap = (f: Fixture) => (e: ThreeEvent<MouseEvent>) => { if (!onUse) return; e.stopPropagation(); onUse(f); };
  return (
    <group>
      {pieces.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
          <mesh position={[0, (p.y0 + p.y1) / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[p.len, p.y1 - p.y0, 0.1]} />
            <meshStandardMaterial color={wallColor} roughness={0.85} />
          </mesh>
          {p.y0 === 0 && <mesh position={[0, 0.06, 0]}><boxGeometry args={[p.len, 0.12, 0.13]} /><meshStandardMaterial color={skirtingColor} roughness={0.7} /></mesh>}
        </group>
      ))}
      {/* Bathroom floor tiles under the shower, toilet and vanity area. */}
      {fixtures.map((f) => {
        const c = floorCenter(f.size, f.placement);
        const r = fixtureRect(f);
        return (
          <group key={f.id}>
            <group position={[c.x, 0, c.z]} rotation={[0, -f.placement.rot * (Math.PI / 2), 0]} onClick={tap(f)}
              onPointerOver={() => { if (onUse) document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
              <FixtureVisual f={f} />
            </group>
            {f.kind !== "kitchen-run" && f.kind !== "washer" && (
              <mesh position={[(r.minX + r.maxX) / 2, 0.004, (r.minZ + r.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
                <planeGeometry args={[r.maxX - r.minX + 0.3, r.maxZ - r.minZ + 0.3]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
