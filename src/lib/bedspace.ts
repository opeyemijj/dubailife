"use client";

// The shared bed-space room: your bed and your roommates' (up to four real players per room, matched by
// the server). Each bed is a corner of the room (src/data/home/floorplans.json: 1 NW, 2 NE, 3 SW, 4 SE).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Person } from "@/components/home/ApartmentRoom";

export interface Mate { id: string; username: string; name: string; look: Person["look"] | null; bed: number | null; lastActive: string | null }
export interface Bedspace { myBed: number | null; mates: Mate[] }

/** Where someone stands beside each bed (facing into the room), and where they sit on its edge. */
const BEDS: Record<number, { x: number; z: number; face: number; west: boolean }> = {
  1: { x: -4.5, z: -4, face: Math.PI / 2, west: true }, 2: { x: 4.5, z: -4, face: -Math.PI / 2, west: false },
  3: { x: -4.5, z: 1.5, face: Math.PI / 2, west: true }, 4: { x: 4.5, z: 1.5, face: -Math.PI / 2, west: false },
};

export function useBedspace(active: boolean): Bedspace | null {
  const [data, setData] = useState<Bedspace | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    const load = () => void supabase().rpc("my_bedspace").then(({ data: d }) => { if (live && d) setData(d as Bedspace); });
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, [active]);
  return active ? data : null;
}

/** Roommates in the room: standing by their bed when they're online, sitting on it while they're away. */
export function matesInRoom(b: Bedspace | null, online: ReadonlySet<string>, open: (m: Mate) => void): Person[] {
  if (!b) return [];
  return b.mates.filter((m) => m.bed && BEDS[m.bed]).map((m) => {
    const spot = BEDS[m.bed!];
    const here = online.has(m.username);
    const side = spot.west ? 1 : -1;
    return {
      look: m.look ?? { gender: "woman" },
      position: [spot.x + side * (here ? 1.15 : 0.15), 0, spot.z] as [number, number, number],
      rotation: spot.face,
      animation: here ? "idle" : "sit",
      label: `@${m.username} · bed ${m.bed}${here ? "" : " · away"}`,
      onClick: () => open(m),
    };
  });
}
