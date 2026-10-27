"use client";

// The finish every walled venue gets, like the homes: panelled walls with a chair rail and crown
// moulding, gold-capped pilasters, a warm cove light, brass sconces, chandeliers over the floor, palms
// in the corners clear of the stations, and a runner at the door. Clubs keep their own lighting and get
// a darker panel; open-air venues (beaches, pool decks, waterparks) are left as they are.

import { useMemo } from "react";
import type { Venue } from "@/lib/city/types";
import { LuxuryDecor } from "@/components/home/LuxuryDecor";
import { WALL_HEIGHT } from "@/lib/furniture";
import type { Plan } from "./layouts";

const GOLD = "#c9a24b";
// Layouts where hanging chandeliers suit the room.
const CHANDELIERS = new Set(["boutique", "jewellery", "beauty", "dining", "lobby", "bar", "spa", "theatre", "market", "tech", "mosque"]);

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** One wall's dressing, in the wall's frame: x along it, z out into the room. */
function WallDress({ len, h, color, dark, sconces }: { len: number; h: number; color: string; dark: boolean; sconces: boolean }) {
  const trim = dark ? "#3a2f22" : shade(color, 0.92);
  const panels = Math.max(1, Math.round(len / 1.6));
  const pw = len / panels;
  const pilasters = Math.max(2, Math.round(len / 3.2) + 1);
  return (
    <group>
      {/* raised panels below and above the chair rail */}
      {Array.from({ length: panels }, (_, i) => {
        const x = -len / 2 + pw * (i + 0.5);
        return (
          <group key={i} position={[x, 0, 0]}>
            {[[0.35, 0.95], [1.25, h - 0.75]].map(([y0, y1]) => (
              <group key={y0}>
                {[[0, (y1 + y0) / 2, pw - 0.36, 0.03], [0, y0, pw - 0.3, 0.03], [0, y1, pw - 0.3, 0.03]].map(([px, py, sx, sy], k) => k === 0 ? null : (
                  <mesh key={k} position={[px, py, 0.02]}><boxGeometry args={[sx, sy, 0.02]} /><meshStandardMaterial color={trim} roughness={0.5} /></mesh>
                ))}
                {[-(pw - 0.3) / 2, (pw - 0.3) / 2].map((sx) => (
                  <mesh key={sx} position={[sx, (y0 + y1) / 2, 0.02]}><boxGeometry args={[0.03, y1 - y0, 0.02]} /><meshStandardMaterial color={trim} roughness={0.5} /></mesh>
                ))}
              </group>
            ))}
          </group>
        );
      })}
      {/* chair rail, skirting and crown moulding */}
      <mesh position={[0, 1.1, 0.03]}><boxGeometry args={[len, 0.05, 0.04]} /><meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.08, 0.03]}><boxGeometry args={[len, 0.16, 0.04]} /><meshStandardMaterial color={dark ? "#1c1917" : shade(color, 0.8)} roughness={0.6} /></mesh>
      <mesh position={[0, h - 0.12, 0.05]}><boxGeometry args={[len, 0.2, 0.1]} /><meshStandardMaterial color={dark ? "#1c1917" : "#f8f5ee"} roughness={0.5} /></mesh>
      <mesh position={[0, h - 0.24, 0.1]}><boxGeometry args={[len, 0.025, 0.02]} /><meshStandardMaterial color="#fff1d6" emissive="#ffe4b5" emissiveIntensity={1.4} /></mesh>
      {/* pilasters with gold capitals */}
      {Array.from({ length: pilasters }, (_, i) => {
        const x = -len / 2 + 0.2 + ((len - 0.4) * i) / (pilasters - 1);
        return (
          <group key={i} position={[x, 0, 0.06]}>
            <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[0.32, h - 0.3, 0.12]} /><meshStandardMaterial color={dark ? "#26201a" : "#f5f0e6"} roughness={0.45} /></mesh>
            <mesh position={[0, h - 0.32, 0.01]}><boxGeometry args={[0.42, 0.14, 0.16]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} /></mesh>
            <mesh position={[0, 0.12, 0.01]}><boxGeometry args={[0.4, 0.24, 0.16]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} /></mesh>
          </group>
        );
      })}
      {/* brass sconces between the pilasters */}
      {sconces && Array.from({ length: pilasters - 1 }, (_, i) => {
        const x = -len / 2 + 0.2 + ((len - 0.4) * (i + 0.5)) / (pilasters - 1);
        return (
          <group key={i} position={[x, 2.15, 0.08]}>
            <mesh><boxGeometry args={[0.08, 0.22, 0.04]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} /></mesh>
            <mesh position={[0, 0.16, 0.08]}><cylinderGeometry args={[0.07, 0.1, 0.16, 16, 1, true]} /><meshStandardMaterial color="#fff7e6" emissive="#ffe8c2" emissiveIntensity={1.1} side={2} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

export function VenueLuxury({ venue, plan, wallH }: { venue: Venue; plan: Plan; wallH: number }) {
  const [w, d] = plan.size;
  const club = venue.layout === "club";
  const dark = club || parseInt(venue.palette.wall.slice(1, 3), 16) < 90;
  const free = (x: number, z: number, r: number) => plan.stations.every((s) => Math.hypot(s.position[0] - x, s.position[1] - z) > r + 1.1)
    && Math.hypot(plan.staff.position[0] - x, plan.staff.position[1] - z) > r + 0.8;

  // Chandeliers on a grid over the floor (two across in narrow rooms, more in big ones).
  const lights = useMemo(() => {
    if (club || !CHANDELIERS.has(venue.layout)) return [];
    const cols = Math.max(1, Math.round(w / 5)), rows = Math.max(1, Math.round(d / 5));
    return Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return { x: -w / 2 + (w / cols) * (c + 0.5), z: -d / 2 + (d / rows) * (r + 0.5), crystal: (c + r) % 2 === 0 };
    });
  }, [club, venue.layout, w, d]);

  const plants = useMemo(() => ([[-w / 2 + 0.6, -d / 2 + 0.6], [w / 2 - 0.6, -d / 2 + 0.6], [-w / 2 + 0.6, d / 2 - 0.8], [w / 2 - 0.6, d / 2 - 0.8]] as Array<[number, number]>)
    .filter(([x, z]) => free(x, z, 0.4)), [w, d, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const [ex, ez] = plan.entrance;
  const runner = free(ex, ez - 1, 0.6);
  const wallColor = venue.palette.wall;

  return (
    <group>
      {/* back wall, then the two sides */}
      <group position={[0, 0, -d / 2 + 0.06]}><WallDress len={w} h={wallH} color={wallColor} dark={dark} sconces={!club} /></group>
      <group position={[-w / 2 + 0.06, 0, 0]} rotation={[0, Math.PI / 2, 0]}><WallDress len={d} h={wallH} color={wallColor} dark={dark} sconces={!club} /></group>
      <group position={[w / 2 - 0.06, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><WallDress len={d} h={wallH} color={wallColor} dark={dark} sconces={!club} /></group>

      {lights.map((l, i) => (
        // Home chandeliers hang from a 3 m ceiling: raised to this room's.
        <group key={i} position={[l.x, wallH - WALL_HEIGHT, l.z]}>
          <LuxuryDecor visual={l.crystal ? "chandelier-crystal" : "chandelier-ring"} size={[2, 2]} />
          {/* Real lights are costly on phones: only the first two chandeliers cast light, the rest just glow. */}
          {i < 2 && <pointLight position={[0, WALL_HEIGHT - 1.1, 0]} intensity={2.2} distance={6} color="#ffe6bf" />}
        </group>
      ))}
      {plants.map(([x, z], i) => (
        <group key={i} position={[x - 0.25, 0, z - 0.25]}>
          <LuxuryDecor visual={i % 2 ? "vase" : "palm"} size={[1, 1]} />
        </group>
      ))}
      {runner && (
        <group position={[ex, 0.01, ez - 1.2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}><planeGeometry args={[1.4, 2.4]} /><meshStandardMaterial color={club ? "#3b0764" : "#7f1d1d"} roughness={0.9} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} raycast={() => null}><ringGeometry args={[0.62, 0.66, 4, 1, Math.PI / 4]} /><meshStandardMaterial color={GOLD} /></mesh>
        </group>
      )}
    </group>
  );
}
