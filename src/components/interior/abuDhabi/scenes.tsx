"use client";

// Abu Dhabi's landmark interiors: each one built for its venue alone (Venue.scene), in place of its layout's usual
// room, so going in feels like being there and not like a Dubai room with another name. Drawn light for phones:
// repeated pieces (columns, crystals, arches) are instanced, patterns (carpets, inlay, calligraphy) are painted once
// into canvas textures, and each scene adds at most one light of its own. Domes and ceilings appear only in the
// first-person view (from the usual view above, a roof would hide the room).
//
// The scenes are built with layouts.tsx's plan() (passed in), so stations, seats and staff work as everywhere.

import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { StationKind, Venue } from "@/lib/city/types";
import type { FloorKind } from "../materials";
import type { Plan } from "../layouts";
import { useInteriorEye } from "../viewContext";
import SZGM from "@/data/abuDhabi/grand-mosque.json";

type Slot = { kind: StationKind; position: [number, number]; rotation?: number; label?: string; visual: (i: number) => ReactNode; rides?: string[] };
export type PlanFn = (venue: Venue, size: [number, number], floor: FloorKind, slots: Slot[], decor: ReactNode, walls?: boolean) => Plan;

// ---------------------------------------------------------------- shared pieces

/** A canvas texture, painted once per key (they're the same for everyone who goes in). */
const TEX = new Map<string, THREE.CanvasTexture>();
function paint(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const hit = TEX.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  TEX.set(key, t);
  return t;
}

/** A seeded random (the same pattern every time). */
const rng = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** A pointed (Islamic) arch as a flat outline: `w` wide, springing at `spring`, apex at `h`. */
function archShape(w: number, spring: number, h: number, inset = 0) {
  const s = new THREE.Shape();
  const x = w / 2 - inset, y0 = 0, sp = spring - inset * 0.3, top = h - inset;
  s.moveTo(-x, y0); s.lineTo(-x, sp);
  s.quadraticCurveTo(-x, top - (top - sp) * 0.25, 0, top);
  s.quadraticCurveTo(x, top - (top - sp) * 0.25, x, sp);
  s.lineTo(x, y0); s.lineTo(-x, y0);
  return s;
}
/** An arch frame (the arch with its opening cut out): for arcades between columns. */
function archFrame(w: number, spring: number, h: number, band: number) {
  const outer = new THREE.Shape();
  outer.moveTo(-w / 2, 0); outer.lineTo(-w / 2, h + band); outer.lineTo(w / 2, h + band); outer.lineTo(w / 2, 0);
  outer.lineTo(w / 2 - band, 0); outer.lineTo(w / 2 - band, spring);
  outer.quadraticCurveTo(w / 2 - band, h - (h - spring) * 0.25, 0, h);
  outer.quadraticCurveTo(-w / 2 + band, h - (h - spring) * 0.25, -w / 2 + band, spring);
  outer.lineTo(-w / 2 + band, 0); outer.lineTo(-w / 2, 0);
  return outer;
}

/** Many copies of one mesh (columns, crystals): one draw call. */
function Instances({ geometry, material, at, scale, rotY }: { geometry: THREE.BufferGeometry; material: THREE.Material; at: Array<[number, number, number]>; scale?: number | ((i: number) => number); rotY?: (i: number) => number }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, at.length);
    const o = new THREE.Object3D();
    at.forEach((p, i) => {
      o.position.set(...p);
      o.rotation.set(0, rotY ? rotY(i) : 0, 0);
      const s = typeof scale === "function" ? scale(i) : scale ?? 1;
      o.scale.set(s, s, s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = false;
    return m;
  }, [geometry, material, at, scale, rotY]);
  return <primitive object={mesh} />;
}

const gold = () => new THREE.MeshStandardMaterial({ color: SZGM.colours.gold, metalness: 0.85, roughness: 0.28 });
const marble = (color = SZGM.colours.marble) => new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.05 });

// ---------------------------------------------------------------- the Grand Mosque: textures

/** The prayer hall's carpet: a green field of floral medallions in ivory, gold and red, with a three-band border
 *  (the real one, the world's largest hand-knotted carpet, is a field of Persian medallions in green). */
const carpetTexture = () => paint("szgm-carpet", 1024, 768, (g, w, h) => {
  const c = SZGM.colours;
  g.fillStyle = c.carpetBorder; g.fillRect(0, 0, w, h);
  g.fillStyle = c.carpetIvory; g.fillRect(18, 18, w - 36, h - 36);
  g.fillStyle = c.carpetBorder; g.fillRect(34, 34, w - 68, h - 68);
  g.fillStyle = c.carpetField; g.fillRect(52, 52, w - 104, h - 104);
  // A lattice of small rosettes over the field.
  const rosette = (x: number, y: number, r: number, petals: number, colA: string, colB: string) => {
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * Math.PI * 2;
      g.fillStyle = k % 2 ? colA : colB;
      g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.2, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = c.gold; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
  };
  for (let y = 100; y < h - 80; y += 64) for (let x = 100 + ((y / 64) % 2) * 32; x < w - 80; x += 64) rosette(x, y, 18, 8, c.carpetIvory, "#6f9a63");
  // Vines between them.
  g.strokeStyle = "#5c8a52"; g.lineWidth = 2;
  for (let y = 132; y < h - 80; y += 64) { g.beginPath(); for (let x = 70; x < w - 70; x += 8) g.lineTo(x, y + Math.sin(x / 22) * 8); g.stroke(); }
  // The great central medallion.
  const cx = w / 2, cy = h / 2;
  g.fillStyle = c.carpetIvory; g.beginPath(); g.ellipse(cx, cy, 190, 150, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = c.carpetBorder; g.beginPath(); g.ellipse(cx, cy, 172, 134, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#24492e"; g.beginPath(); g.ellipse(cx, cy, 150, 114, 0, 0, Math.PI * 2); g.fill();
  rosette(cx, cy, 110, 16, c.carpetIvory, c.gold);
  rosette(cx, cy, 52, 12, c.carpetBorder, c.carpetIvory);
  // Its pendants above and below.
  [-1, 1].forEach((s) => { g.fillStyle = c.carpetIvory; g.beginPath(); g.moveTo(cx - 40, cy + s * 140); g.lineTo(cx, cy + s * 215); g.lineTo(cx + 40, cy + s * 140); g.fill(); });
  // Corner quarter-medallions.
  [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]].forEach(([x, y]) => { g.fillStyle = c.carpetIvory; g.beginPath(); g.arc(x, y, 90, 0, Math.PI * 2); g.fill(); rosette(x, y, 60, 12, c.carpetBorder, c.gold); });
});

/** The columns' inlay: white marble with mother-of-pearl vines and flowers climbing it (green leaves, red, gold
 *  and violet blooms), as on the prayer hall's 96 columns. Repeats round and up the shaft. */
const inlayTexture = () => paint("szgm-inlay", 256, 512, (g, w, h) => {
  const c = SZGM.colours;
  g.fillStyle = c.marble; g.fillRect(0, 0, w, h);
  const r = rng(7);
  for (let k = 0; k < 2; k++) {
    // Two vines winding up, with leaves and flowers along them.
    g.strokeStyle = "#7f8f55"; g.lineWidth = 3; g.beginPath();
    for (let y = 0; y <= h; y += 6) { const x = w / 2 + Math.sin(y / 40 + k * Math.PI) * w * 0.32; if (y === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    for (let y = 20; y < h; y += 44) {
      const x = w / 2 + Math.sin(y / 40 + k * Math.PI) * w * 0.32;
      g.fillStyle = c.inlay[0];
      g.beginPath(); g.ellipse(x + 14, y - 6, 12, 5, 0.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x - 14, y + 6, 12, 5, -0.6, 0, Math.PI * 2); g.fill();
      const col = c.inlay[1 + Math.floor(r() * 3)];
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * 7, y + 18 + Math.sin(a) * 7, 5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#f3e6b8"; g.beginPath(); g.arc(x, y + 18, 3.5, 0, Math.PI * 2); g.fill();
    }
  }
}, [2, 3]);

/** The qibla wall: the 99 Names of Allah in gold on white marble, each in its own panel, glowing softly from behind
 *  (the real wall is lit by fibre optics behind the calligraphy). */
const qiblaTexture = () => paint("szgm-qibla", 2048, 640, (g, w, h) => {
  const c = SZGM.colours;
  g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, w, h);
  const cols = 11, rows = 9, mx = 40, my = 30;
  const cw = (w - mx * 2) / cols, ch = (h - my * 2) / rows;
  g.textAlign = "center"; g.textBaseline = "middle";
  SZGM.names.forEach((name, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = mx + col * cw, y = my + row * ch;
    // The panel: a pale gold frame and a soft glow behind the name.
    const grad = g.createRadialGradient(x + cw / 2, y + ch / 2, 4, x + cw / 2, y + ch / 2, cw * 0.6);
    grad.addColorStop(0, "#fff6d8"); grad.addColorStop(1, "#fbfaf6");
    g.fillStyle = grad; g.fillRect(x + 3, y + 3, cw - 6, ch - 6);
    g.strokeStyle = "#e3cf98"; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
    g.fillStyle = c.gold;
    const size = name.length > 9 ? 20 : name.length > 6 ? 26 : 32;
    g.font = `700 ${size}px "Geeza Pro", "Noto Naskh Arabic", "Amiri", "Arial", sans-serif`;
    g.fillText(name, x + cw / 2, y + ch / 2 + 2);
  });
});

/** The courtyard (the Sahn): white marble inlaid with big flowers in coloured marble, the world's largest marble
 *  mosaic. */
const sahnTexture = () => paint("szgm-sahn", 1024, 1024, (g, w, h) => {
  const c = SZGM.colours;
  g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let k = 0; k < 9; k++) {
    const x = (k % 3) * (w / 3) + w / 6, y = Math.floor(k / 3) * (h / 3) + h / 6;
    // A long stem curling across the tile, with leaves and a big bloom.
    g.strokeStyle = "#5f8f4e"; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 120, y + 120); g.quadraticCurveTo(x - 40, y - 30, x + 10, y - 10); g.stroke();
    g.fillStyle = "#4e8a46";
    [[-80, 70, 0.8], [-40, 20, -0.4], [-100, 30, 0.2]].forEach(([dx, dy, a]) => { g.beginPath(); g.ellipse(x + dx, y + dy, 36, 13, a, 0, Math.PI * 2); g.fill(); });
    const petal = c.inlay[1 + Math.floor(r() * 3)];
    for (let p = 0; p < 8; p++) { const a = (p / 8) * Math.PI * 2; g.fillStyle = p % 2 ? petal : "#f0c35a"; g.beginPath(); g.ellipse(x + 10 + Math.cos(a) * 34, y - 10 + Math.sin(a) * 34, 30, 14, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#8a3b2c"; g.beginPath(); g.arc(x + 10, y - 10, 15, 0, Math.PI * 2); g.fill();
  }
  // Fine grey veining in the marble.
  g.strokeStyle = "rgba(120,120,120,0.08)"; g.lineWidth = 1.2;
  for (let k = 0; k < 40; k++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let s = 0; s < 12; s++) { x += (r() - 0.4) * 50; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
}, [3, 2]);

// ---------------------------------------------------------------- the Grand Mosque: pieces

/** A prayer-hall column: a white marble shaft with the vine inlay, a gilded base ring, and the gilded palm-leaf
 *  capital that opens out at the top like a date palm. Instanced across all `at`. */
function SzgmColumns({ at, height = 8.5, radius = 0.42 }: { at: Array<[number, number, number]>; height?: number; radius?: number }) {
  const parts = useMemo(() => {
    const shaft = new THREE.CylinderGeometry(radius, radius * 1.05, height, 20, 1, true);
    shaft.translate(0, height / 2, 0);
    const shaftMat = new THREE.MeshStandardMaterial({ map: inlayTexture(), roughness: 0.25, metalness: 0.05 });
    const base = new THREE.CylinderGeometry(radius * 1.35, radius * 1.45, 0.45, 20);
    base.translate(0, 0.22, 0);
    const ring = new THREE.TorusGeometry(radius * 1.08, 0.06, 6, 20);
    ring.rotateX(Math.PI / 2); ring.translate(0, height - 0.5, 0);
    // The palm capital: eight fronds flaring out and up.
    const fronds: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 8; k++) {
      const f = new THREE.ConeGeometry(0.26, 1.2, 4, 1, true);
      f.rotateZ(Math.PI * 0.62); f.translate(radius + 0.35, height + 0.2, 0); f.rotateY((k / 8) * Math.PI * 2);
      fronds.push(f);
    }
    const cap = mergeGeometries(fronds);
    const neck = new THREE.CylinderGeometry(radius * 1.25, radius, 0.6, 16); neck.translate(0, height - 0.1, 0);
    return { shaft, shaftMat, base, ring, cap, neck, gold: gold() };
  }, [height, radius]);
  return (
    <group>
      <Instances geometry={parts.shaft} material={parts.shaftMat} at={at} />
      <Instances geometry={parts.base} material={parts.gold} at={at} />
      <Instances geometry={parts.ring} material={parts.gold} at={at} />
      <Instances geometry={parts.neck} material={parts.gold} at={at} />
      <Instances geometry={parts.cap} material={parts.gold} at={at} />
    </group>
  );
}

/** Merge geometries that share attributes (positions, normals, uvs) into one. */
function mergeGeometries(list: THREE.BufferGeometry[]) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

/** The great chandelier: gold tiers hung with strands of coloured crystal (gold, green, red and clear), narrowing to
 *  a crystal point, as the prayer hall's 12 m Swarovski chandelier. Scaled down for the smaller ones. */
function SzgmChandelier({ scale = 1, light = true, hang = 14 }: { scale?: number; light?: boolean; hang?: number }) {
  const parts = useMemo(() => {
    const tiers = [3.0, 2.45, 1.85, 1.25, 0.7];
    const crystals: Array<[number, number, number]> = [];
    const colour: number[] = [];
    tiers.forEach((r, t) => {
      const y = -t * 0.75;
      const n = Math.round(r * 16);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        for (let d = 0; d < 3; d++) { crystals.push([Math.cos(a) * r, y - 0.15 - d * 0.2, Math.sin(a) * r]); colour.push((t + d) % 4); }
      }
    });
    const geo = new THREE.OctahedronGeometry(0.075, 0);
    const mats = SZGM.colours.crystals.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.1 }));
    const byColour = mats.map((_, ci) => crystals.filter((_, i) => colour[i] === ci));
    const ringGeos = tiers.map((r, t) => { const g = new THREE.TorusGeometry(r, 0.07, 6, 40); g.rotateX(Math.PI / 2); g.translate(0, -t * 0.75, 0); return g; });
    const rings = mergeGeometries(ringGeos);
    const tip = new THREE.ConeGeometry(0.6, 1.6, 12); tip.rotateX(Math.PI); tip.translate(0, -tiers.length * 0.75 - 0.6, 0);
    return { geo, mats, byColour, rings, tip, gold: gold() };
  }, []);
  return (
    <group scale={scale}>
      {/* The chain up into the dome. */}
      <mesh position={[0, hang / 2 + 0.4, 0]} material={parts.gold}><cylinderGeometry args={[0.05, 0.05, hang, 6]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={parts.gold}><sphereGeometry args={[0.55, 16, 12]} /></mesh>
      <mesh geometry={parts.rings} material={parts.gold} />
      {parts.byColour.map((at, ci) => <Instances key={ci} geometry={parts.geo} material={parts.mats[ci]} at={at} />)}
      <mesh geometry={parts.tip}><meshStandardMaterial color="#fff7dd" emissive="#fde68a" emissiveIntensity={1.1} transparent opacity={0.85} /></mesh>
      {light && <pointLight position={[0, -1.5, 0]} intensity={14} distance={26} decay={1.6} color="#fff0cf" />}
    </group>
  );
}

/** The mihrab: the gilded niche in the qibla wall, framed by a pointed arch, its inside deep turquoise and gold. */
function SzgmMihrab() {
  const geo = useMemo(() => ({
    frame: new THREE.ShapeGeometry(archShape(3.6, 4.2, 6.4)),
    inner: new THREE.ShapeGeometry(archShape(3.6, 4.2, 6.4, 0.32)),
    deep: new THREE.ShapeGeometry(archShape(3.6, 4.2, 6.4, 0.62)),
  }), []);
  return (
    <group>
      <mesh geometry={geo.frame} position={[0, 0, 0.02]}><meshStandardMaterial color={SZGM.colours.gold} metalness={0.9} roughness={0.22} emissive="#8a6a1f" emissiveIntensity={0.35} /></mesh>
      <mesh geometry={geo.inner} position={[0, 0, 0.04]}><meshStandardMaterial color="#f4ead0" emissive="#f7e3a8" emissiveIntensity={0.25} /></mesh>
      <mesh geometry={geo.deep} position={[0, 0, 0.06]}><meshStandardMaterial color="#1f6f6a" emissive="#0f4f4a" emissiveIntensity={0.4} roughness={0.4} /></mesh>
      {/* Gold bands of inscription across the niche. */}
      {[1.2, 2.4, 3.6].map((y) => <mesh key={y} position={[0, y, 0.08]}><planeGeometry args={[2.1, 0.12]} /><meshStandardMaterial color={SZGM.colours.gold} metalness={0.9} roughness={0.25} /></mesh>)}
    </group>
  );
}

/** A floor cushion (the majlis seat where you sit and reflect). */
function FloorCushion() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[1.6, 0.2, 0.8]} /><meshStandardMaterial color="#7a1f2b" roughness={0.8} /></mesh>
      <mesh position={[0, 0.35, -0.32]}><boxGeometry args={[1.6, 0.5, 0.18]} /><meshStandardMaterial color="#8c2a36" roughness={0.8} /></mesh>
    </group>
  );
}

/** A wooden Quran stand (rehal). */
function Rehal() {
  return (
    <group>
      {[-0.25, 0.25].map((r) => <mesh key={r} position={[0, 0.18, 0]} rotation={[r * 2.2, 0, 0]}><boxGeometry args={[0.45, 0.5, 0.03]} /><meshStandardMaterial color="#7c4a21" /></mesh>)}
    </group>
  );
}

/** A visitor desk in white marble with a gold top band (visitor information, the abaya and kandura loan). */
function MarbleDesk({ sign }: { sign?: string }) {
  const tex = useMemo(() => sign ? paint(`desk:${sign}`, 512, 96, (g, w, h) => {
    g.fillStyle = "#0f5f5a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f8f1d8"; g.font = "700 40px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(sign, w / 2, h / 2);
  }) : null, [sign]);
  return (
    <group>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[2.6, 1.1, 0.8]} /><meshStandardMaterial color="#f7f5f0" roughness={0.2} /></mesh>
      <mesh position={[0, 1.13, 0]}><boxGeometry args={[2.7, 0.06, 0.9]} /><meshStandardMaterial color={SZGM.colours.gold} metalness={0.8} roughness={0.3} /></mesh>
      {tex && <mesh position={[0, 2.2, -0.2]}><planeGeometry args={[2.4, 0.45]} /><meshStandardMaterial map={tex} /></mesh>}
    </group>
  );
}

/** The prayer hall's walls: the qibla wall at the back (the Names and the mihrab) and arcaded white marble sides with
 *  lattice windows. Only the back and sides (the camera looks in from the front). */
function SzgmHallWalls({ w, d, h = 10 }: { w: number; d: number; h?: number }) {
  const m = useMemo(() => ({
    wall: marble("#f8f6f1"),
    qibla: new THREE.MeshStandardMaterial({ map: qiblaTexture(), emissive: "#fff1c9", emissiveMap: qiblaTexture(), emissiveIntensity: 0.35, roughness: 0.3 }),
    gold: gold(),
    arch: new THREE.ShapeGeometry(archShape(2.4, 3.2, 5.2)),
    lattice: new THREE.MeshStandardMaterial({ color: "#fdf3d6", emissive: "#fbe3a1", emissiveIntensity: 0.6 }),
  }), []);
  const sideArches = [-d / 2 + 3, -d / 2 + 7.5, -d / 2 + 12, -d / 2 + 16.5].filter((z) => z < d / 2 - 1);
  return (
    <group>
      {/* The qibla wall. */}
      <mesh position={[0, h / 2, -d / 2]} material={m.wall}><boxGeometry args={[w, h, 0.4]} /></mesh>
      <mesh position={[0, 6.6, -d / 2 + 0.22]} material={m.qibla}><planeGeometry args={[w - 3, 4.6]} /></mesh>
      <mesh position={[0, 8.95, -d / 2 + 0.23]} material={m.gold}><planeGeometry args={[w - 2.6, 0.12]} /></mesh>
      <mesh position={[0, 4.25, -d / 2 + 0.23]} material={m.gold}><planeGeometry args={[w - 2.6, 0.12]} /></mesh>
      <group position={[0, 0, -d / 2 + 0.22]}><SzgmMihrab /></group>
      {/* The side walls, each with tall arches holding lit lattice windows. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * w / 2, h / 2, 0]} material={m.wall}><boxGeometry args={[0.4, h, d]} /></mesh>
          {sideArches.map((z) => (
            <group key={z} position={[side * (w / 2 - 0.22), 0.6, z]} rotation={[0, -side * Math.PI / 2, 0]}>
              <mesh geometry={m.arch} material={m.gold} position={[0, 0, 0]} scale={[1.08, 1.04, 1]} />
              <mesh geometry={m.arch} material={m.lattice} position={[0, 0, 0.02]} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Overhead in the first-person view: the white dome with its gold rings and the coffered ceiling round it. */
function SzgmDomeOverhead({ w, d, h = 10 }: { w: number; d: number; h?: number }) {
  const eye = useInteriorEye();
  const m = useMemo(() => ({ dome: new THREE.MeshStandardMaterial({ color: "#fbfaf6", side: THREE.BackSide, roughness: 0.5 }), gold: gold(), ceil: marble("#f4f1ea") }), []);
  if (!eye) return null;
  return (
    <group>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.ceil}><planeGeometry args={[w, d]} /></mesh>
      <mesh position={[0, h - 0.02, -1]} material={m.dome}><sphereGeometry args={[7.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {[7.4, 5.6, 3.6].map((r, i) => <mesh key={r} position={[0, h + (i + 1) * 1.4, -1]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}><torusGeometry args={[r * (1 - i * 0.12), 0.07, 6, 48]} /></mesh>)}
    </group>
  );
}

// ---------------------------------------------------------------- the Grand Mosque: the courtyard's backdrop

/** The prayer hall seen across the courtyard: its white façade of arches, the great central dome and the rows of
 *  smaller domes, all with gold crescent finials, and the four minarets at the corners. */
function SzgmSkyline({ w }: { w: number }) {
  const m = useMemo(() => ({ white: marble("#fbfbf8"), gold: gold(), arch: new THREE.ShapeGeometry(archShape(1.6, 2.6, 4)), shade: marble("#e9e6de") }), []);
  const small = useMemo(() => Array.from({ length: 9 }, (_, i) => [(i - 4) * (w / 10), 9.4, -1.2] as [number, number, number]), [w]);
  const domeGeo = useMemo(() => new THREE.SphereGeometry(1.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), []);
  return (
    <group>
      <mesh position={[0, 4.5, -1.5]} material={m.white}><boxGeometry args={[w, 9, 3]} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} geometry={m.arch} material={m.shade} position={[(i - 6) * (w / 14), 0.8, 0.02]} />)}
      <Instances geometry={domeGeo} material={m.white} at={small} />
      {/* The great dome on its drum. */}
      <mesh position={[0, 10.4, -1.5]} material={m.white}><cylinderGeometry args={[4, 4, 2, 32]} /></mesh>
      <mesh position={[0, 11.4, -1.5]} material={m.white}><sphereGeometry args={[4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 16.2, -1.5]} material={m.gold}><cylinderGeometry args={[0.08, 0.08, 1.6, 6]} /></mesh>
      <mesh position={[0, 17.2, -1.5]} rotation={[0, 0, Math.PI / 2]} material={m.gold}><torusGeometry args={[0.35, 0.07, 6, 16, Math.PI * 1.4]} /></mesh>
      {/* The minarets. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 1.5), 0, -1]}>
          <mesh position={[0, 12, 0]} material={m.white}><cylinderGeometry args={[0.85, 1.05, 24, 12]} /></mesh>
          {[9, 16, 21].map((y) => <mesh key={y} position={[0, y, 0]} material={m.shade}><cylinderGeometry args={[1.3, 1.3, 0.4, 12]} /></mesh>)}
          <mesh position={[0, 25.5, 0]} material={m.white}><sphereGeometry args={[0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 27, 0]} material={m.gold}><cylinderGeometry args={[0.06, 0.06, 1.6, 6]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the scenes

export const AD_SCENES: Record<string, (venue: Venue, plan: PlanFn) => Plan> = {
  /** The main prayer hall. */
  "szgm-prayer-hall": (venue, plan) => {
    const Wd = 26, D = 20;
    const columns: Array<[number, number, number]> = [-9.5, -4.6, 4.6, 9.5].flatMap((x) => [-3.2, 3.4].map((z) => [x, 0, z] as [number, number, number]));
    return plan(venue, [Wd, D], "marble", [
      { kind: "reception", position: [-10.6, 8], rotation: Math.PI / 2, label: "Visitor centre · modest dress", visual: () => <MarbleDesk sign="Visitor centre" /> },
      { kind: "tickets", position: [10.6, 8], rotation: -Math.PI / 2, label: "Guided tours", visual: () => <MarbleDesk sign="Guided tours" /> },
      { kind: "exhibit", position: [0, 0.8], label: "🕌 The prayer hall", visual: () => null },
      { kind: "booth", position: [-6.6, -6.2], label: "Sit and reflect", visual: () => <FloorCushion /> },
      { kind: "booth", position: [6.6, -6.2], label: "Sit and reflect", visual: () => <FloorCushion /> },
    ], <>
      {/* The carpet over the marble, the whole hall bar a margin round the walls. */}
      <mesh position={[0, 0.012, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Wd - 3, D - 3.4]} />
        <meshStandardMaterial map={carpetTexture()} roughness={0.95} />
      </mesh>
      <SzgmHallWalls w={Wd} d={D} />
      <SzgmColumns at={columns} />
      <group position={[0, 8.2, -1]}><SzgmChandelier /></group>
      <group position={[-8.2, 7.4, -6]}><SzgmChandelier scale={0.5} light={false} hang={5} /></group>
      <group position={[8.2, 7.4, -6]}><SzgmChandelier scale={0.5} light={false} hang={5} /></group>
      {[-1.6, 0, 1.6].map((x) => <group key={x} position={[x, 0, -7.6]}><Rehal /></group>)}
      <SzgmDomeOverhead w={Wd} d={D} />
    </>, false);
  },

  /** The Sahn: the courtyard of floral marble, the reflecting pools along it, the arcades and the hall behind. */
  "szgm-courtyard": (venue, plan) => {
    const Wd = 30, D = 22;
    const arcade: Array<[number, number, number]> = [
      ...Array.from({ length: 9 }, (_, i) => [-13.5, 0, -8 + i * 2.2] as [number, number, number]),
      ...Array.from({ length: 9 }, (_, i) => [13.5, 0, -8 + i * 2.2] as [number, number, number]),
    ];
    return plan(venue, [Wd, D], "marble", [
      { kind: "exhibit", position: [0, 2], label: "🌸 The courtyard", visual: () => null },
      { kind: "booth", position: [-8, 6.4], label: "By the reflecting pool", visual: () => <FloorCushion /> },
      { kind: "booth", position: [8, 6.4], label: "By the reflecting pool", visual: () => <FloorCushion /> },
    ], <>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Wd, D]} />
        <meshStandardMaterial map={sahnTexture()} roughness={0.25} />
      </mesh>
      {/* The reflecting pools, dark blue-tiled, along each arcade. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 10.6, 0, 0]}>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 18]} /><meshStandardMaterial color="#1f5f8a" metalness={0.4} roughness={0.05} /></mesh>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.8, 17.6]} /><meshStandardMaterial color="#3a8fc4" transparent opacity={0.75} metalness={0.6} roughness={0.02} /></mesh>
        </group>
      ))}
      <SzgmColumns at={arcade} height={5.2} radius={0.34} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 13.5, 5.9, 0.8]}><boxGeometry args={[0.9, 0.7, 19]} /><meshStandardMaterial color="#fbfbf8" /></mesh>)}
      <group position={[0, 0, -D / 2 - 1.5]}><SzgmSkyline w={Wd - 4} /></group>
    </>, false);
  },
};
