"use client";

// The ceiling: the roof seen from inside (homes show it in the Inside and Eye views, venues in Eye view), so looking
// up shows a roof, not sky. Homes can decorate it (HomeStyle.ceiling / ceilingColor, src/data/home/ceilings.json):
// flat plaster with downlights, a tray ceiling with a cove light, a coffered grid, timber beams, gold arabesque
// medallions, or a starlight sky. Openings (`holes`, the stairwell of a two-storey home) are left open. With `roof`
// a slab sits on top, so from outside the house reads as roofed. None of it catches taps or casts shadows.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type CeilingDesign = "flat" | "tray" | "coffered" | "beams" | "arabesque" | "stars";
/** An opening in the ceiling (metres, room-centred x/z). */
export interface CeilingHole { minX: number; maxX: number; minZ: number; maxZ: number }
type Box = { p: [number, number, number]; s: [number, number, number] };

const noRaycast = () => null;
const GOLD = "#c9a24a";
const WOOD = "#5b3a24";
const COVE = "#ffd9a0";

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (holes: CeilingHole[], minX: number, maxX: number, minZ: number, maxZ: number, pad = 0.05) =>
  holes.some((h) => maxX > h.minX - pad && minX < h.maxX + pad && maxZ > h.minZ - pad && minZ < h.maxZ + pad);
const boxClear = (holes: CeilingHole[], b: Box) => !overlaps(holes, b.p[0] - b.s[0] / 2, b.p[0] + b.s[0] / 2, b.p[2] - b.s[2] / 2, b.p[2] + b.s[2] / 2);

/** A run from a to b along x (or z), cut into pieces about a metre long so an opening only removes what it touches. */
function run(axis: "x" | "z", from: number, to: number, at: number, y: number, width: number, height: number, piece = 1): Box[] {
  const n = Math.max(1, Math.round((to - from) / piece));
  const len = (to - from) / n;
  const out: Box[] = [];
  for (let i = 0; i < n; i++) {
    const mid = from + (i + 0.5) * len;
    out.push(axis === "x" ? { p: [mid, y, at], s: [len + 0.002, height, width] } : { p: [at, y, mid], s: [width, height, len + 0.002] });
  }
  return out;
}

/** Many boxes of one material, drawn in one go. */
function Boxes({ boxes, color, glow = 0, basic = false, metal = 0, rough = 0.85 }: { boxes: Box[]; color: string; glow?: number; basic?: boolean; metal?: number; rough?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    boxes.forEach((b, i) => {
      o.position.set(...b.p);
      o.scale.set(...b.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [boxes]);
  if (!boxes.length) return null;
  return (
    <instancedMesh key={boxes.length} ref={ref} args={[undefined, undefined, boxes.length]} raycast={noRaycast}>
      <boxGeometry args={[1, 1, 1]} />
      {basic ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} metalness={metal} roughness={rough} />}
    </instancedMesh>
  );
}

/** Round recessed spotlights, facing down at height y. */
function Downlights({ spots, y, r = 0.12 }: { spots: Array<[number, number]>; y: number; r?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    o.rotation.set(Math.PI / 2, 0, 0);
    spots.forEach(([x, z], i) => {
      o.position.set(x, y, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots, y]);
  if (!spots.length) return null;
  return (
    <instancedMesh key={spots.length} ref={ref} args={[undefined, undefined, spots.length]} raycast={noRaycast}>
      <circleGeometry args={[r, 16]} />
      <meshBasicMaterial color="#fffbeb" side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/** A grid of spotlight positions across an area, skipping openings. */
function grid(minX: number, maxX: number, minZ: number, maxZ: number, step: number, holes: CeilingHole[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const nx = Math.max(1, Math.round((maxX - minX) / step)), nz = Math.max(1, Math.round((maxZ - minZ) / step));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = minX + (i + 0.5) * ((maxX - minX) / nx), z = minZ + (j + 0.5) * ((maxZ - minZ) / nz);
    if (!overlaps(holes, x - 0.15, x + 0.15, z - 0.15, z + 0.15)) out.push([x, z]);
  }
  return out;
}

/** A gilded eight-point star medallion, face down. */
function Medallion({ x, z, r }: { x: number; z: number; r: number }) {
  return (
    <group position={[x, -0.012, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh raycast={noRaycast}><ringGeometry args={[r * 0.92, r, 48]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh raycast={noRaycast} position={[0, 0, 0.002]}><ringGeometry args={[r * 0.62, r * 0.68, 48]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      {[0, Math.PI / 4].map((a) => (
        <mesh key={a} raycast={noRaycast} rotation={[0, 0, a]} position={[0, 0, 0.004]}>
          <ringGeometry args={[r * 0.5, r * 0.56, 4, 1, Math.PI / 4]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh raycast={noRaycast} position={[0, 0, 0.006]}><circleGeometry args={[r * 0.18, 24]} /><meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

/** Twinkling fibre-optic stars. */
function Stars({ w, d, holes, seed }: { w: number; d: number; holes: CeilingHole[]; seed: number }) {
  const sets = useMemo(() => {
    const rand = seeded(seed);
    const all: Array<Array<[number, number, number]>> = [[], [], []];
    const count = Math.round(w * d * 5);
    for (let i = 0; i < count; i++) {
      const x = -w / 2 + 0.1 + rand() * (w - 0.2), z = -d / 2 + 0.1 + rand() * (d - 0.2);
      if (overlaps(holes, x, x, z, z)) continue;
      all[i % 3].push([x, z, 0.008 + rand() * 0.014]);
    }
    return all;
  }, [w, d, holes, seed]);
  const mats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => { if (m) m.opacity = 0.55 + 0.45 * Math.sin(t * (1.3 + i * 0.4) + i * 2.1); });
  });
  return (
    <>
      {sets.map((set, k) => (
        <StarSet key={k} stars={set} color={k === 2 ? "#fde68a" : "#ffffff"} matRef={(m) => { mats.current[k] = m; }} />
      ))}
    </>
  );
}

function StarSet({ stars, color, matRef }: { stars: Array<[number, number, number]>; color: string; matRef: (m: THREE.MeshBasicMaterial | null) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    o.rotation.set(Math.PI / 2, 0, 0);
    stars.forEach(([x, z, r], i) => {
      o.position.set(x, -0.006, z);
      o.scale.setScalar(r);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [stars]);
  if (!stars.length) return null;
  return (
    <instancedMesh key={stars.length} ref={ref} args={[undefined, undefined, stars.length]} raycast={noRaycast}>
      <circleGeometry args={[1, 8]} />
      <meshBasicMaterial ref={matRef} color={color} transparent side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

/** A lighter or darker shade, for mouldings that read against the ceiling. */
function shade(color: string, amount: number) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.offsetHSL(0, 0, hsl.l > 0.5 ? -amount : amount).getStyle();
}

function rectShape(w: number, d: number, holes: CeilingHole[]) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h.minX, h.minZ); p.lineTo(h.minX, h.maxZ); p.lineTo(h.maxX, h.maxZ); p.lineTo(h.maxX, h.minZ); p.closePath();
    s.holes.push(p);
  }
  return s;
}

export function Ceiling({ w, d, h, color = "#f5f5f4", finish = "flat", holes, roof = false, overhang = 0, dim = false }: {
  w: number;
  d: number;
  h: number;
  color?: string;
  finish?: CeilingDesign;
  holes?: CeilingHole[];
  /** Put a roof slab on top (homes), so the house is roofed when seen from outside. */
  roof?: boolean;
  /** How far the roof slab reaches past the ceiling on each side (over the walls). */
  overhang?: number;
  /** Lights out (a party): the plaster stops glowing. */
  dim?: boolean;
}) {
  const openings = useMemo(() => holes ?? [], [holes]);
  const ceilingGeo = useMemo(() => new THREE.ShapeGeometry(rectShape(w, d, openings)), [w, d, openings]);
  const slabGeo = useMemo(
    () => (roof ? new THREE.ExtrudeGeometry(rectShape(w + overhang * 2, d + overhang * 2, openings), { depth: 0.15, bevelEnabled: false }) : null),
    [roof, w, d, overhang, openings],
  );
  useLayoutEffect(() => () => { ceilingGeo.dispose(); slabGeo?.dispose(); }, [ceilingGeo, slabGeo]);

  const trim = useMemo(() => shade(color, 0.07), [color]);
  const parts = useMemo(() => {
    const hw = w / 2, hd = d / 2;
    const out: { trim: Box[]; wood: Box[]; gold: Box[]; cove: Box[]; spots: Array<[number, number]>; spotY: number; medallions: Array<[number, number, number]> } =
      { trim: [], wood: [], gold: [], cove: [], spots: [], spotY: -0.01, medallions: [] };
    if (finish === "flat") {
      out.spots = grid(-hw, hw, -hd, hd, 3, openings);
    } else if (finish === "tray") {
      const B = Math.min(1.4, w / 5), D = 0.28, y = -D / 2;
      out.trim.push(...run("x", -hw, hw, -hd + B / 2, y, B, D), ...run("x", -hw, hw, hd - B / 2, y, B, D));
      out.trim.push(...run("z", -hd + B, hd - B, -hw + B / 2, y, B, D), ...run("z", -hd + B, hd - B, hw - B / 2, y, B, D));
      // The hidden LED strip along the inside edge of the border, washing the raised centre with warm light.
      const g = 0.05, gy = -0.06;
      out.cove.push(...run("x", -hw + B, hw - B, -hd + B + g / 2, gy, g, 0.03), ...run("x", -hw + B, hw - B, hd - B - g / 2, gy, g, 0.03));
      out.cove.push(...run("z", -hd + B, hd - B, -hw + B + g / 2, gy, g, 0.03), ...run("z", -hd + B, hd - B, hw - B - g / 2, gy, g, 0.03));
      // Spotlights in the border.
      const r = B / 2;
      out.spotY = -D - 0.005;
      for (const [x, z] of [...grid(-hw + r, hw - r, -hd + r - 0.01, -hd + r + 0.01, 2.2, []), ...grid(-hw + r, hw - r, hd - r - 0.01, hd - r + 0.01, 2.2, [])]) out.spots.push([x, z]);
      for (const z of [-hd / 3, hd / 3]) out.spots.push([-hw + r, z], [hw - r, z]);
      out.spots = out.spots.filter(([x, z]) => !overlaps(openings, x - 0.15, x + 0.15, z - 0.15, z + 0.15));
    } else if (finish === "coffered") {
      const nx = Math.max(2, Math.round(w / 1.65)), nz = Math.max(2, Math.round(d / 1.65));
      const cw = w / nx, cd = d / nz, D = 0.22, R = 0.16, y = -D / 2;
      for (let i = 0; i <= nx; i++) {
        const x = Math.min(hw - R / 2, Math.max(-hw + R / 2, -hw + i * cw));
        out.trim.push(...run("z", -hd, hd, x, y, R, D, cd));
      }
      for (let j = 0; j <= nz; j++) {
        const z = Math.min(hd - R / 2, Math.max(-hd + R / 2, -hd + j * cd));
        out.trim.push(...run("x", -hw, hw, z, y - 0.005, R, D - 0.01, cw));
      }
      out.spots = grid(-hw, hw, -hd, hd, cw, openings);
      out.spotY = -0.01;
    } else if (finish === "beams") {
      const n = Math.max(3, Math.round(w / 1.5)), D = 0.26, W = 0.22;
      for (let i = 1; i < n; i++) out.wood.push(...run("z", -hd, hd, -hw + (i * w) / n, -D / 2, W, D));
      out.wood.push(...run("x", -hw, hw, -hd + 0.09, -0.09, 0.18, 0.18), ...run("x", -hw, hw, hd - 0.09, -0.09, 0.18, 0.18));
      for (let i = 0; i < n; i++) for (const z of [-d / 4, d / 4]) out.spots.push([-hw + ((i + 0.5) * w) / n, z]);
      out.spots = out.spots.filter(([x, z]) => !overlaps(openings, x - 0.15, x + 0.15, z - 0.15, z + 0.15));
    } else if (finish === "arabesque") {
      const inset = 0.45, g = 0.05;
      out.gold.push(...run("x", -hw + inset, hw - inset, -hd + inset, -0.01, g, 0.02), ...run("x", -hw + inset, hw - inset, hd - inset, -0.01, g, 0.02));
      out.gold.push(...run("z", -hd + inset, hd - inset, -hw + inset, -0.01, g, 0.02), ...run("z", -hd + inset, hd - inset, hw - inset, -0.01, g, 0.02));
      out.trim.push(...run("x", -hw, hw, -hd + 0.08, -0.08, 0.16, 0.16), ...run("x", -hw, hw, hd - 0.08, -0.08, 0.16, 0.16));
      out.trim.push(...run("z", -hd, hd, -hw + 0.08, -0.08, 0.16, 0.16), ...run("z", -hd, hd, hw - 0.08, -0.08, 0.16, 0.16));
      const big = Math.min(1.2, w / 8), small = big * 0.55, off = Math.min(w, d) / 4;
      const cand: Array<[number, number, number]> = [[0, 0, big], [-off, -off, small], [off, -off, small], [-off, off, small], [off, off, small]];
      out.medallions = cand.filter(([x, z, r]) => !overlaps(openings, x - r, x + r, z - r, z + r));
    }
    // Openings leave the mouldings round them open too.
    out.trim = out.trim.filter((b) => boxClear(openings, b));
    out.wood = out.wood.filter((b) => boxClear(openings, b));
    out.gold = out.gold.filter((b) => boxClear(openings, b));
    out.cove = out.cove.filter((b) => boxClear(openings, b));
    return out;
  }, [finish, w, d, openings]);

  const glow = dim ? 0 : finish === "tray" ? 0.16 : 0.08;
  return (
    <group position={[0, h, 0]}>
      <mesh geometry={ceilingGeo} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <meshStandardMaterial color={color} roughness={0.95} emissive={color} emissiveIntensity={glow} side={THREE.FrontSide} />
      </mesh>
      {slabGeo && (
        <mesh geometry={slabGeo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.17, 0]} raycast={noRaycast}>
          <meshStandardMaterial color="#b9b3a8" roughness={1} />
        </mesh>
      )}
      <Boxes boxes={parts.trim} color={finish === "tray" ? color : trim} glow={dim ? 0 : 0.06} />
      <Boxes boxes={parts.wood} color={WOOD} rough={0.8} />
      <Boxes boxes={parts.gold} color={GOLD} metal={0.85} rough={0.3} />
      {!dim && <Boxes boxes={parts.cove} color={COVE} basic />}
      {parts.medallions.map(([x, z, r]) => <Medallion key={`${x}:${z}`} x={x} z={z} r={r} />)}
      {finish === "stars" && <Stars w={w} d={d} holes={openings} seed={Math.round(w * 131 + d * 17)} />}
      {!dim && <Downlights spots={parts.spots} y={parts.spotY} />}
    </group>
  );
}
