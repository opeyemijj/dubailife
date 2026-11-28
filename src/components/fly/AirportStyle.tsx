"use client";

// What makes each airport look like itself (src/data/flights/airport-walk.json `style`), for the departures and
// arrivals walks (components/fly/AirportWalk, ArrivalWalk):
//   dxb: Dubai International's Terminal 3, a long hall of silver vaulted arches with gold trim and date palms;
//   auh: Abu Dhabi's Terminal A, a white rippling roof held up by branching "tree" columns, and desert planters;
//   doh: Doha's Hamad International, a sweeping roof that rises and falls like a wave, slender flared columns, and
//        an indoor tropical garden (planted beds of trees) in the duty-free hall.
// The roofs are drawn as open ribs, not solid ceilings, so the camera (which looks down at you) always sees through.

import { useMemo } from "react";
import * as THREE from "three";

export type AirportStyleId = "dxb" | "auh" | "doh";
/** A hall to roof over (its floor, in metres). */
export interface Hall { x1: number; z1: number; x2: number; z2: number }
/** Something planted on the floor: solid (the walks add it to their collision boxes). */
export interface Planter { x1: number; z1: number; x2: number; z2: number }

const WALL_H = 6;

/** The roof is up where the camera flies (it looks down at you from behind), so any part of it within a few metres of
 *  the camera isn't drawn: a rib or the trim can never sit across your view. */
const NEAR_FADE = 5;
export function hideNearCamera(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <clipping_planes_fragment>",
    `#include <clipping_planes_fragment>\n  if (length(vViewPosition) < ${NEAR_FADE.toFixed(1)}) discard;`,
  );
}

/** One rib: a tube through points. */
function Rib({ pts, r, color, metal }: { pts: THREE.Vector3[]; r: number; color: string; metal: number }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 6, false), [pts, r]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} metalness={metal} roughness={0.35} onBeforeCompile={hideNearCamera} /></mesh>;
}

/** The ribs across a hall's short side, every `step` metres along its long side; `y(t, u)` is the height at t (0–1
 *  across) and u (metres along). */
function ribsOver(h: Hall, step: number, y: (t: number, u: number) => number) {
  const wide = h.x2 - h.x1 >= h.z2 - h.z1;
  const len = wide ? h.x2 - h.x1 : h.z2 - h.z1;
  const n = Math.max(1, Math.floor(len / step));
  const ribs: THREE.Vector3[][] = [];
  for (let i = 0; i <= n; i++) {
    const u = (len * i) / n;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      pts.push(wide ? new THREE.Vector3(h.x1 + u, y(t, u), h.z1 + (h.z2 - h.z1) * t) : new THREE.Vector3(h.x1 + (h.x2 - h.x1) * t, y(t, u), h.z1 + u));
    }
    ribs.push(pts);
  }
  return ribs;
}
/** The lines along a hall's long side (for the rippling roof's lattice). */
function stringersOver(h: Hall, count: number, y: (t: number, u: number) => number) {
  const wide = h.x2 - h.x1 >= h.z2 - h.z1;
  const len = wide ? h.x2 - h.x1 : h.z2 - h.z1;
  const out: THREE.Vector3[][] = [];
  for (let j = 1; j < count; j++) {
    const t = j / count, pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const u = (len * k) / 24;
      pts.push(wide ? new THREE.Vector3(h.x1 + u, y(t, u), h.z1 + (h.z2 - h.z1) * t) : new THREE.Vector3(h.x1 + (h.x2 - h.x1) * t, y(t, u), h.z1 + u));
    }
    out.push(pts);
  }
  return out;
}

export function Roof({ style, halls, accent }: { style: AirportStyleId; halls: Hall[]; accent: string }) {
  const ribs = useMemo(() => halls.flatMap((h) => {
    const short = Math.min(h.x2 - h.x1, h.z2 - h.z1);
    if (style === "dxb") {
      // Vaulted arches, one every 3 m, rising from the wall tops.
      const rise = Math.min(5, short * 0.22);
      return ribsOver(h, 3, (t) => WALL_H + rise * Math.sin(Math.PI * t)).map((pts) => ({ pts, r: 0.09, color: "#cbd5e1", metal: 0.75 }));
    }
    if (style === "doh") {
      // The wave: each rib a shallow arch, the whole roof rising and falling along the hall.
      const y = (t: number, u: number) => WALL_H + 0.8 + 1.8 * (0.5 + 0.5 * Math.sin(u * 0.16)) + 1.1 * Math.sin(Math.PI * t);
      return ribsOver(h, 2.5, y).map((pts) => ({ pts, r: 0.07, color: "#f1f5f9", metal: 0.2 }));
    }
    // AUH: a white lattice over a rippling surface.
    const y = (t: number, u: number) => WALL_H + 1.4 + 0.9 * Math.sin(u * 0.22) * Math.cos(t * Math.PI * 1.5) + 0.8 * Math.sin(Math.PI * t);
    return [
      ...ribsOver(h, 3.5, y).map((pts) => ({ pts, r: 0.07, color: "#ffffff", metal: 0.1 })),
      ...stringersOver(h, Math.max(3, Math.round(short / 4)), y).map((pts) => ({ pts, r: 0.06, color: "#ffffff", metal: 0.1 })),
    ];
  }), [style, halls]);
  return (
    <group>
      {ribs.map((r, i) => <Rib key={i} {...r} />)}
      {/* Dubai's gold trim along the tops of the walls. */}
      {style === "dxb" && halls.map((h, i) => (
        <group key={`g${i}`}>
          <mesh position={[(h.x1 + h.x2) / 2, WALL_H + 0.05, h.z1]}><boxGeometry args={[h.x2 - h.x1, 0.12, 0.12]} /><meshStandardMaterial color={accent} metalness={0.8} roughness={0.3} onBeforeCompile={hideNearCamera} /></mesh>
          <mesh position={[(h.x1 + h.x2) / 2, WALL_H + 0.05, h.z2]}><boxGeometry args={[h.x2 - h.x1, 0.12, 0.12]} /><meshStandardMaterial color={accent} metalness={0.8} roughness={0.3} onBeforeCompile={hideNearCamera} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** A column in the airport's style (solid as a 0.9 m square, whatever it looks like). */
export function Column({ style, x, z, color, accent }: { style: AirportStyleId; x: number; z: number; color: string; accent: string }) {
  if (style === "auh") return (
    // A white "tree": a trunk that branches into four arms holding up the roof.
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.38, 0.5, 4.8, 16]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.9, 5.6, Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.9]}
          rotation={[Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.7, 0, -Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.7]}>
          <cylinderGeometry args={[0.12, 0.22, 2.4, 10]} /><meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
  if (style === "doh") return (
    // Slender, flaring out at the top like a trumpet into the wave roof.
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[0.3, 0.36, 5.2, 16]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 5.7, 0]}><cylinderGeometry args={[1.1, 0.3, 1.2, 20, 1, true]} /><meshStandardMaterial color="#f1f5f9" side={THREE.DoubleSide} /></mesh>
    </group>
  );
  // DXB: polished silver with a gold band.
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, WALL_H / 2, 0]}><cylinderGeometry args={[0.45, 0.45, WALL_H, 20]} /><meshStandardMaterial color="#d6dbe1" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.48, 0.48, 0.25, 20]} /><meshStandardMaterial color={accent} metalness={0.85} roughness={0.25} /></mesh>
    </group>
  );
}

/** Each airport's planting: date palms in pots (DXB), desert planters (AUH) or the indoor garden's beds (DOH). */
export function Planting({ style, beds }: { style: AirportStyleId; beds: Planter[] }) {
  return (
    <group>
      {beds.map((b, i) => {
        const cx = (b.x1 + b.x2) / 2, cz = (b.z1 + b.z2) / 2, w = b.x2 - b.x1, d = b.z2 - b.z1;
        if (style === "doh") {
          // A raised bed with trees and a strip of water, like the terminal's indoor garden.
          const trees = Math.max(1, Math.round(d / 2.4));
          return (
            <group key={i}>
              <mesh position={[cx, 0.25, cz]}><boxGeometry args={[w, 0.5, d]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
              <mesh position={[cx, 0.51, cz]}><boxGeometry args={[w - 0.3, 0.02, d - 0.3]} /><meshStandardMaterial color="#3f6212" /></mesh>
              <mesh position={[cx + (cx > 0 ? -w / 2 + 0.35 : w / 2 - 0.35), 0.53, cz]}><boxGeometry args={[0.35, 0.02, d - 0.6]} /><meshStandardMaterial color="#38bdf8" metalness={0.3} roughness={0.1} /></mesh>
              {Array.from({ length: trees }, (_, k) => {
                const tz = b.z1 + (d * (k + 0.5)) / trees;
                return (
                  <group key={k} position={[cx, 0.5, tz]}>
                    <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.12, 0.18, 3.2, 8]} /><meshStandardMaterial color="#78350f" /></mesh>
                    <mesh position={[0, 3.6, 0]}><sphereGeometry args={[1.05, 14, 10]} /><meshStandardMaterial color={k % 2 ? "#15803d" : "#16a34a"} roughness={0.9} /></mesh>
                  </group>
                );
              })}
            </group>
          );
        }
        if (style === "auh") return (
          // A low white planter of desert grasses and a ghaf-like tree.
          <group key={i} position={[cx, 0, cz]}>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[w, 0.6, d]} /><meshStandardMaterial color="#f8fafc" /></mesh>
            <mesh position={[0, 0.62, 0]}><boxGeometry args={[w - 0.2, 0.04, d - 0.2]} /><meshStandardMaterial color="#d6c7a1" /></mesh>
            <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.1, 0.15, 2, 8]} /><meshStandardMaterial color="#6b4f2a" /></mesh>
            <mesh position={[0, 2.8, 0]} scale={[1.4, 0.6, 1.4]}><sphereGeometry args={[0.9, 12, 8]} /><meshStandardMaterial color="#65a30d" roughness={0.9} /></mesh>
          </group>
        );
        // DXB: a date palm in a big round pot.
        return (
          <group key={i} position={[cx, 0, cz]}>
            <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2.4, 0.8, 16]} /><meshStandardMaterial color="#a16207" metalness={0.4} roughness={0.4} /></mesh>
            <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.12, 0.18, 3.4, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
            {Array.from({ length: 7 }, (_, k) => {
              const a = (k / 7) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(a) * 0.7, 4.0, Math.sin(a) * 0.7]} rotation={[Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8]}>
                  <boxGeometry args={[0.32, 0.05, 1.8]} /><meshStandardMaterial color="#15803d" />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Dubai's golden palm-tree columns (in the duty-free hall): a gold trunk with fronds spreading into the roof. */
export function PalmColumn({ x, z, h = WALL_H }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2 - 0.4, 0]}><cylinderGeometry args={[0.3, 0.45, h - 0.8, 14]} /><meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.25} /></mesh>
      {Array.from({ length: 6 }, (_, i) => h * 0.12 + i * h * 0.13).map((y) => (
        <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.42, 0.04, 6, 16]} /><meshStandardMaterial color="#a16207" metalness={0.8} /></mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.1, h - 0.5, Math.sin(a) * 1.1]} rotation={[Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]}>
            <boxGeometry args={[0.45, 0.06, 2.4]} /><meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

const GLASS = ["#5b7c99", "#6b8fb0", "#7d9bb5", "#4f6b85", "#8aa5bd"];
/** Plain towers either side of the landmarks, so it reads as a city. */
function Towers({ from, to, count, max, seed }: { from: number; to: number; count: number; max: number; seed: number }) {
  const t = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = (k: number) => { const v = Math.sin((i + 1) * 12.9898 * (k + 1) + seed * 78.233) * 43758.5453; return v - Math.floor(v); };
    return { x: from + (to - from) * (i + r(0) * 0.6) / count, z: r(1) * 40, w: 6 + r(2) * 8, h: max * (0.3 + r(3) * 0.7), c: GLASS[i % GLASS.length] };
  }), [from, to, count, max, seed]);
  return <group>{t.map((b, i) => <mesh key={i} position={[b.x, b.h / 2, b.z]}><boxGeometry args={[b.w, b.h, b.w]} /><meshStandardMaterial color={b.c} metalness={0.4} roughness={0.35} /></mesh>)}</group>;
}

/** The city outside the windows, so you know where you are: Dubai's Burj Khalifa, Burj Al Arab and Emirates Towers;
 *  Abu Dhabi's Grand Mosque, the round Aldar HQ and the Etihad Towers; Doha's West Bay, with Doha Tower, the
 *  Tornado Tower and the Museum of Islamic Art. Placed far off (`at`), facing back towards the terminal. */
export function CitySkyline({ style, at, rotY = 0 }: { style: AirportStyleId; at: [number, number, number]; rotY?: number }) {
  return (
    <group position={at} rotation={[0, rotY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 20]}><planeGeometry args={[520, 140]} /><meshStandardMaterial color="#d6c7a6" roughness={1} /></mesh>
      {style === "dxb" && <>
        {/* Burj Khalifa: setbacks spiralling up to the spire. */}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[0, 7 + i * 13, 0]}><cylinderGeometry args={[11 - i * 1.15, 12 - i * 1.15, 14, 6]} /><meshStandardMaterial color="#b8c4cf" metalness={0.7} roughness={0.25} /></mesh>
        ))}
        <mesh position={[0, 140, 0]}><cylinderGeometry args={[0.4, 1.8, 30, 8]} /><meshStandardMaterial color="#d1d9e0" metalness={0.8} /></mesh>
        {/* Burj Al Arab: the sail on its island. */}
        <group position={[-120, 0, 30]}>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[14, 14, 2, 24]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
          <mesh position={[0, 34, 0]} scale={[1, 1, 0.35]}><coneGeometry args={[14, 66, 3]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[-6, 36, 0]}><boxGeometry args={[1.2, 72, 1.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        </group>
        {/* Emirates Towers: two triangular towers. */}
        {[[70, 0, 64], [86, 8, 52]].map(([x, z, h]) => (
          <mesh key={x} position={[x, h / 2, z]}><cylinderGeometry args={[6, 8, h, 3]} /><meshStandardMaterial color="#9fb3c4" metalness={0.6} roughness={0.25} /></mesh>
        ))}
        <Towers from={-90} to={-25} count={8} max={55} seed={3} />
        <Towers from={22} to={140} count={10} max={45} seed={5} />
      </>}
      {style === "auh" && <>
        {/* Sheikh Zayed Grand Mosque: white domes and four minarets. */}
        <group position={[-40, 0, 10]}>
          <mesh position={[0, 6, 0]}><boxGeometry args={[80, 12, 50]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 12, 0]}><sphereGeometry args={[13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 30, 0]}><coneGeometry args={[0.6, 5, 8]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} /></mesh>
          {[-22, 22].map((x) => <mesh key={x} position={[x, 12, 0]}><sphereGeometry args={[8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
          {[-30, -18, -6, 6, 18, 30].map((x) => [-18, 18].map((z) => <mesh key={`${x}${z}`} position={[x, 12, z]}><sphereGeometry args={[3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ffffff" /></mesh>))}
          {[[-42, -27], [42, -27], [-42, 27], [42, 27]].map(([x, z]) => (
            <group key={`${x}${z}`} position={[x, 0, z]}>
              <mesh position={[0, 24, 0]}><cylinderGeometry args={[1.6, 2, 48, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
              <mesh position={[0, 50, 0]}><coneGeometry args={[1.8, 5, 12]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} /></mesh>
            </group>
          ))}
        </group>
        {/* Aldar HQ: the round, coin-shaped building. */}
        <mesh position={[60, 24, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[23, 23, 7, 40]} /><meshStandardMaterial color="#7b9db8" metalness={0.6} roughness={0.25} /></mesh>
        {/* Etihad Towers: five slim curved towers. */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[100 + i * 9, 30 + i * 5, 10 - i * 3]} rotation={[0, 0, 0.04 * (i - 2)]}><cylinderGeometry args={[3.2, 4.2, 60 + i * 10, 16]} /><meshStandardMaterial color="#8fb1c9" metalness={0.6} roughness={0.2} /></mesh>
        ))}
        <Towers from={-150} to={-95} count={6} max={40} seed={11} />
        <Towers from={150} to={200} count={5} max={45} seed={13} />
      </>}
      {style === "doh" && <>
        {/* West Bay across the water. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, -20]}><planeGeometry args={[520, 30]} /><meshStandardMaterial color="#2b6f9a" roughness={0.2} metalness={0.2} /></mesh>
        {/* Doha Tower: a tall cylinder with a domed crown. */}
        <mesh position={[10, 50, 10]}><cylinderGeometry args={[7, 7, 100, 24]} /><meshStandardMaterial color="#9aa7b4" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[10, 100, 10]}><sphereGeometry args={[7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9aa7b4" metalness={0.6} /></mesh>
        <mesh position={[10, 110, 10]}><cylinderGeometry args={[0.3, 0.8, 14, 8]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
        {/* The Tornado Tower: an hourglass. */}
        <group position={[-30, 0, 16]}>
          <mesh position={[0, 20, 0]}><cylinderGeometry args={[5, 8, 40, 24]} /><meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.25} /></mesh>
          <mesh position={[0, 58, 0]}><cylinderGeometry args={[8, 5, 36, 24]} /><meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.25} /></mesh>
        </group>
        {/* The Museum of Islamic Art: stacked stone cubes by the water. */}
        <group position={[-120, 0, -6]}>
          <mesh position={[0, 7, 0]}><boxGeometry args={[30, 14, 30]} /><meshStandardMaterial color="#efe6d6" /></mesh>
          <mesh position={[0, 18, 0]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[18, 8, 18]} /><meshStandardMaterial color="#efe6d6" /></mesh>
          <mesh position={[0, 25, 0]}><boxGeometry args={[10, 6, 10]} /><meshStandardMaterial color="#efe6d6" /></mesh>
        </group>
        <Towers from={-80} to={-40} count={5} max={60} seed={17} />
        <Towers from={25} to={130} count={11} max={70} seed={19} />
      </>}
    </group>
  );
}
