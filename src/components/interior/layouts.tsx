"use client";

// Floor plans for each kind of venue. Stations (the clickable spots) are derived from what the venue
// actually offers, so every station opens something real. Units: metres; back wall at -depth/2,
// entrance at +depth/2. A fixture's front faces +z before rotation.

import type { ReactNode } from "react";
import type { Product, StationKind, Venue } from "@/lib/city/types";
import type { FloorKind } from "./materials";
import { signTexture } from "./materials";
import { BuoyLine, EntranceArch, FlowRider, JetSki, OpenSea, SharkLagoon, SlideMountain, Slides, ThatchRoof, VolleyballNet, WavePool } from "./scenery";
import { BEACH, isKidsPool, isSkyPool, poolDeckPool, SPLASH_POOLS, WATERPARK } from "./rides/paths";
import { hasVolleyball, parkOf, RIDES } from "@/lib/city/rides";
import { Cabana, CinemaScreen, DockWithAbra, FoodTruck, IceRink, Kites, LazyRiver, LifeguardTower, Lounger, LoungerSet, Mihrab, Pool, RingChandelier, Candle, Sea, Seating, SignPost, SlideTower, TreatmentBed, } from "./scenery";
import {
  AquariumWall, Bar, Booth, DJBooth, DanceFloor, DiningSet, DisplayTable, Exhibit, FittingRoom, FountainJets, GlassCase, Gondola,
  Mannequin, MenuCounter, Model, PROP, Palm, PastryCase, Plant, ProduceTable, Rack, Reception, SkylineWindow, Stage, StockedShelf,
  SweepingLights, TechTable, Till, TicketKiosk, WallDisplay, WallScreen, Water,
} from "./fixtures";

export interface StationDef {
  id: string;
  kind: StationKind;
  label: string;
  position: [number, number];
  rotation: number;
  visual: ReactNode;
  /** Rides started from here (their activities are listed at this station). */
  rides?: string[];
}

export interface Plan {
  size: [number, number];
  floor: FloorKind;
  walls: boolean;
  stations: StationDef[];
  decor: ReactNode;
  staff: { position: [number, number]; rotation: number };
  entrance: [number, number];
}

const LABEL: Record<StationKind, string> = {
  rack: "Clothing rail", table: "Display table", shelf: "Shelves", case: "Display case", wall: "Wall display", till: "Pay & collect",
  fitting: "Fitting room", counter: "Counter", menu: "Order here", bar: "Bar", dj: "DJ booth", dancefloor: "Dance floor",
  booth: "Take a seat", reception: "Reception", tickets: "Tickets", exhibit: "Explore", service: "Services", staff: "Staff",
};

/** Where a station's customer stands: just in front of it. */
export function approachPoint(s: StationDef, distance = 1.0): [number, number] {
  return [s.position[0] + Math.sin(s.rotation) * distance, s.position[1] + Math.cos(s.rotation) * distance];
}

/** A point in a station's own frame (front faces +z) turned into room coordinates. */
export function toRoom(s: StationDef, [x, y, z]: [number, number, number]): [number, number, number] {
  const c = Math.cos(s.rotation), n = Math.sin(s.rotation);
  return [s.position[0] + x * c + z * n, y, s.position[1] - x * n + z * c];
}

export interface Seat {
  /** Where the citizen stands to sit (station frame); the sit clip puts the hips ~0.2 m behind. */
  local: [number, number];
  facing: number;
  /** Raises the sitter for seats higher than a dining chair (the clip's seat height). */
  lift: number;
}

/**
 * The seats at a table or booth: dining sets have a chair each side; sofas seat three; benches two.
 * Each person takes a free one, so nobody sits on anyone.
 */
/** Venues whose seats are benches, loungers or theatre-style chairs: two places side by side, no sofa lift. */
const OPEN_SEATING = new Set(["outdoor", "beach", "pooldeck", "waterpark", "spa", "theatre", "mosque", "rink"]);

export function seatsAt(venue: Venue, s: StationDef): Seat[] {
  if (s.kind !== "booth") return [];
  if (venue.layout === "dining") return [{ local: [0, 0.86], facing: s.rotation + Math.PI, lift: 0 }, { local: [0, -0.86], facing: s.rotation, lift: 0 }];
  if (OPEN_SEATING.has(venue.layout)) return [-0.45, 0.45].map((x) => ({ local: [x, 0.2] as [number, number], facing: s.rotation, lift: 0 }));
  return [0, -0.6, 0.6].map((x) => ({ local: [x, -0.05] as [number, number], facing: s.rotation, lift: 0.11 }));
}

/** The first seat (kept for callers that only need one). */
export function seatAt(venue: Venue, s: StationDef, opposite = false): Seat | null {
  const seats = seatsAt(venue, s);
  return seats[opposite && seats.length > 1 ? 1 : 0] ?? null;
}

/**
 * The spot on a station's top where the n-th thing served there is put down, in its own frame.
 * Counters get a row along the front edge; tables a small cluster on the citizen's side.
 */
export function servingSpot(venue: Venue, s: StationDef, n: number, seatIndex = 0, seats?: Seat[]): [number, number, number] {
  // Centre first (where the citizen stands), then alternating either side.
  const row = (top: number, z: number, step = 0.22): [number, number, number] => [[0, 1, -1, 2, -2][n % 5] * step, top, z - Math.floor(n / 5) * 0.16];
  switch (s.kind) {
    case "booth": {
      // In front of the person's own seat (seat 0 when not given).
      const seat = seats?.[seatIndex] ?? seatsAt(venue, s)[seatIndex] ?? seatsAt(venue, s)[0];
      if (venue.layout === "dining") {
        const side = seat && seat.local[1] < 0 ? -1 : 1;
        return [[0, -0.16, 0.16][n % 3], 0.775, side * (0.2 - Math.floor(n / 3) * 0.12)];
      }
      if (OPEN_SEATING.has(venue.layout)) return [(seat?.local[0] ?? 0) + (n % 2 ? 0.18 : -0.18), 0.45, 0.25];
      return [(seat?.local[0] ?? 0) + [0, -0.14, 0.14][n % 3], 0.42, 0.95 + (n >= 3 ? 0.12 : 0)];
    }
    case "bar": return venue.layout === "outdoor" ? row(1.155, 0.25) : row(1.145, 0.22);
    case "menu": return row(1.045, 0.24);
    case "counter": return venue.layout === "dining" ? row(1.295, 0.05, 0.2) : row(1.045, 0.22);
    case "reception": return venue.layout === "dining" ? row(1.045, 0.22) : row(1.155, 0.28);
    case "tickets": return row(1.155, 0.28);
    case "till": return row(1.045, 0.22);
    default: return row(1.1, 0.22);
  }
}

/** Station kinds a venue needs, from its products and activities. */
export function stationKindsFor(venue: Venue): Set<StationKind> {
  const kinds = new Set<StationKind>(venue.products.map((p: Product) => p.station));
  for (const a of venue.activities ?? []) {
    // Rides bring their own stations (see plan()); one ridden from a lounger still needs the loungers.
    if (a.ride) { const st = RIDES[a.ride]?.station; if (st) kinds.add(st); continue; }
    kinds.add(a.animation === "dance" ? "dancefloor" : a.animation === "sit" ? "booth" : "exhibit");
  }
  if (venue.layout === "boutique" && venue.products.some((p) => !p.service)) kinds.add("fitting");
  if (venue.layout === "dining") kinds.add("booth");
  return kinds;
}

type Slot = { kind: StationKind; position: [number, number]; rotation?: number; label?: string; visual: (i: number) => ReactNode; rides?: string[] };

function plan(venue: Venue, size: [number, number], floor: FloorKind, slots: Slot[], decor: ReactNode, walls = true): Plan {
  const kinds = stationKindsFor(venue);
  const offered = new Set((venue.activities ?? []).map((a) => a.ride).filter(Boolean));
  // A ride station (an "exhibit" spot for rides) appears only when the venue offers one of its rides, and
  // lists just those; other stations (loungers) keep their rides only when offered.
  const used = slots
    .map((s) => {
      const rides = s.rides?.filter((r) => offered.has(r));
      return { ...s, rides: rides?.length ? rides : undefined, rideSpot: !!s.rides && s.kind === "exhibit" };
    })
    .filter((s) => (s.rideSpot ? !!s.rides : kinds.has(s.kind)));
  // Anything offered at a station this layout has no slot for is sold at the till/counter instead.
  const stations: StationDef[] = used.map((s, i) => ({
    id: `${s.kind}-${i}`,
    kind: s.kind,
    label: s.label ?? LABEL[s.kind],
    position: s.position,
    rotation: s.rotation ?? 0,
    visual: s.visual(i),
    rides: s.rides,
  }));
  const anchor = stations.find((s) => ["till", "reception", "menu", "counter", "bar", "tickets"].includes(s.kind)) ?? stations[0];
  const behind: [number, number] = anchor ? [anchor.position[0] - Math.sin(anchor.rotation) * 0.9, anchor.position[1] - Math.cos(anchor.rotation) * 0.9] : [0, -size[1] / 2 + 1.5];
  return { size, floor, walls, stations, decor, staff: { position: behind, rotation: anchor?.rotation ?? 0 }, entrance: [0, size[1] / 2 - 1] };
}

const garments = (accent: string) => [accent, "#f5f5f4", "#1f2937", "#d6d3d1", "#7c2d12", "#1e3a8a", "#e5e7eb"];

export function buildPlan(venue: Venue): Plan {
  const { accent, floor: floorColor, light } = venue.palette;
  const W = (n: number) => n;

  switch (venue.layout) {
    case "boutique": {
      const luxury = /luxury|footwear/i.test(venue.category);
      const colors = garments(accent);
      const D = 11, Wd = W(14);
      return plan(venue, [Wd, D], luxury ? "marble" : "concrete", [
        { kind: "wall", position: [0, -D / 2 + 0.45], visual: () => <WallDisplay wood={luxury ? "#8b6b3e" : "#e7e5e4"} colors={colors} width={4.5} /> },
        { kind: "rack", position: [-4.6, -1.6], rotation: Math.PI / 2, visual: (i) => <Rack colors={colors} seed={i + 1} /> },
        { kind: "rack", position: [4.6, -1.6], rotation: -Math.PI / 2, visual: (i) => <Rack colors={colors} seed={i + 5} /> },
        { kind: "rack", position: [-4.6, 1.2], rotation: Math.PI / 2, visual: (i) => <Rack colors={colors} seed={i + 9} /> },
        { kind: "table", position: [-1.7, 1.2], visual: (i) => <DisplayTable colors={colors} seed={i} top={luxury ? "#efe6d8" : "#fafaf9"} /> },
        { kind: "table", position: [1.7, 1.2], visual: (i) => <DisplayTable colors={colors} seed={i + 3} top={luxury ? "#efe6d8" : "#fafaf9"} /> },
        { kind: "case", position: [2.6, -2.8], visual: () => <GlassCase base={luxury ? "#efe6d8" : "#f5f5f4"} velvet="#292524" /> },
        { kind: "fitting", position: [5.9, 2.6], rotation: -Math.PI / 2, visual: () => <FittingRoom accent={accent} /> },
        { kind: "till", position: [-3.2, -3.9], visual: () => <Till color={luxury ? "#efe6d8" : accent} /> },
        { kind: "service", position: [4.6, 1.2], rotation: -Math.PI / 2, visual: () => <DisplayTable colors={colors} seed={11} /> },
      ], <>
        <group position={[-1.2, 0, D / 2 - 2]}><Mannequin garment={colors[0]} /></group>
        <group position={[1.2, 0, D / 2 - 2]}><Mannequin garment={colors[5]} /></group>
        {luxury && <group position={[0, 0, -0.6]}><Booth tint="#e7dfd3" /></group>}
        <group position={[-6.2, 0, -4.5]}><Plant /></group>
      </>);
    }

    case "tech": {
      const D = 11, Wd = 14;
      return plan(venue, [Wd, D], "concrete", [
        { kind: "table", position: [-3.2, 0.4], visual: (i) => <TechTable seed={i} /> },
        { kind: "table", position: [0, 0.4], visual: (i) => <TechTable seed={i + 3} /> },
        { kind: "table", position: [3.2, 0.4], visual: (i) => <TechTable seed={i + 6} /> },
        { kind: "wall", position: [0, -D / 2 + 0.3], visual: () => <><WallScreen color={accent} /><group position={[3.8, 0, 0.1]}><StockedShelf colors={["#111827", "#e5e7eb", "#9ca3af", accent]} width={2.4} /></group></> },
        { kind: "case", position: [-5.2, 2.6], rotation: Math.PI / 2, visual: () => <GlassCase base="#e7e5e4" velvet="#111827" /> },
        { kind: "service", position: [4.4, -3.4], visual: () => <Reception accent={accent} /> },
        { kind: "till", position: [-4.4, -3.6], visual: () => <Till color="#e7e5e4" /> },
      ], <>
        <group position={[-6.3, 0, 4.2]}><Plant /></group><group position={[6.3, 0, 4.2]}><Plant /></group>
      </>);
    }

    case "beauty": {
      const D = 10, Wd = 12;
      const bottles = [accent, "#be123c", "#fda4af", "#f5d0fe", "#fde68a", "#e5e7eb", "#111827"];
      return plan(venue, [Wd, D], venue.palette.floor === "#3b2a1e" ? "wood" : "tiles", [
        { kind: "shelf", position: [-3, 0], visual: (i) => <Gondola colors={bottles} seed={i} /> },
        { kind: "shelf", position: [0, 0], visual: (i) => <Gondola colors={bottles} seed={i + 4} /> },
        { kind: "shelf", position: [3, 0], visual: (i) => <Gondola colors={bottles} seed={i + 8} /> },
        { kind: "wall", position: [-2.6, -D / 2 + 0.3], visual: () => <StockedShelf colors={bottles} width={4} /> },
        { kind: "counter", position: [3.4, -3.3], visual: () => <GlassCase base={accent === "#111111" ? "#111111" : "#3b2a1e"} velvet="#fafafa" /> },
        { kind: "case", position: [-4.2, 2.6], rotation: Math.PI / 2, visual: () => <GlassCase base="#3b2a1e" velvet="#7c2d12" /> },
        { kind: "table", position: [0, 2.6], visual: (i) => <DisplayTable colors={bottles} seed={i + 2} top="#fafafa" /> },
        { kind: "service", position: [4.4, 2.4], rotation: -Math.PI / 2, visual: () => <><Model url={PROP("bar-stool")} size={[0.5, 0.5]} height={0.8} /><mesh position={[0, 1.4, -0.5]}><planeGeometry args={[0.7, 0.9]} /><meshStandardMaterial color="#fff" metalness={1} roughness={0.05} /></mesh></> },
        { kind: "till", position: [1.6, -3.9], visual: () => <Till color={accent === "#111111" ? "#111111" : "#5a3e2b"} /> },
      ], <><group position={[-5.4, 0, -3.8]}><Plant /></group></>);
    }

    case "jewellery": {
      const D = 10, Wd = 12;
      return plan(venue, [Wd, D], "marble", [
        { kind: "case", position: [-3.2, -1.2], rotation: Math.PI / 2, visual: (i) => <GlassCase seed={i} /> },
        { kind: "case", position: [-3.2, 1.4], rotation: Math.PI / 2, visual: (i) => <GlassCase seed={i + 3} /> },
        { kind: "case", position: [3.2, -1.2], rotation: -Math.PI / 2, visual: (i) => <GlassCase seed={i + 6} /> },
        { kind: "case", position: [3.2, 1.4], rotation: -Math.PI / 2, visual: (i) => <GlassCase seed={i + 9} /> },
        { kind: "service", position: [0, -3.2], visual: () => <><GlassCase velvet="#7f1d1d" /><group position={[0, 0, 1]}><Model url={PROP("bar-stool")} size={[0.45, 0.45]} height={0.75} /></group></> },
        { kind: "till", position: [-3.8, -3.9], visual: () => <Till color="#2a2420" /> },
      ], <><group position={[5.2, 0, -3.9]}><Plant /></group><group position={[0, 0, 2.5]}><Booth tint="#d4af37" /></group></>);
    }

    case "market": {
      const D = 13, Wd = 16;
      const grocery = venue.category === "Supermarket" || /pharmacy/i.test(venue.category);
      const colors = grocery ? ["#dc2626", "#f59e0b", "#16a34a", "#2563eb", "#f5f5f4", "#7c2d12", "#a855f7"] : [accent, "#1e3a8a", "#065f46", "#f5f5f4", "#b45309", "#7c3aed"];
      return plan(venue, [Wd, D], grocery ? "tiles" : "wood", [
        { kind: "shelf", position: [-4.5, -2.2], visual: (i) => <StockedShelf colors={colors} seed={i} width={3.2} /> },
        { kind: "shelf", position: [0, -2.2], visual: (i) => <StockedShelf colors={colors} seed={i + 4} width={3.2} /> },
        { kind: "shelf", position: [4.5, -2.2], visual: (i) => <StockedShelf colors={colors} seed={i + 8} width={3.2} /> },
        { kind: "shelf", position: [-4.5, 1.2], visual: (i) => <StockedShelf colors={colors} seed={i + 12} width={3.2} /> },
        { kind: "shelf", position: [4.5, 1.2], visual: (i) => <StockedShelf colors={colors} seed={i + 16} width={3.2} /> },
        { kind: "table", position: [0, 1.4], visual: (i) => grocery ? <ProduceTable seed={i} /> : <DisplayTable colors={colors} seed={i} /> },
        { kind: "service", position: [-6.6, 4.4], rotation: Math.PI / 2, visual: () => <Reception accent={accent} /> },
        { kind: "till", position: [5.4, 4.6], rotation: Math.PI, visual: () => <Till color={accent} /> },
      ], <><group position={[-7.2, 0, -5.6]}><Plant /></group></>);
    }

    case "dining": {
      const D = 11, Wd = 13;
      const menu = venue.products.filter((p) => !p.service).map((p) => ({ name: p.name, price: p.price }));
      const cloth = venue.palette.accent;
      return plan(venue, [Wd, D], "wood", [
        { kind: "menu", position: [0, -4.1], visual: () => <MenuCounter title={venue.name} items={menu} color={cloth} /> },
        { kind: "counter", position: [2.6, -4.1], visual: () => <PastryCase /> },
        { kind: "bar", position: [-4.6, -3.0], rotation: Math.PI / 2, visual: () => <Bar glow={venue.palette.light ?? "#f59e0b"} width={3} /> },
        { kind: "reception", position: [4.8, 3.9], rotation: Math.PI, visual: () => <Till color={cloth} /> },
        ...([[-2.6, 0.2], [0.4, 0.2], [3.4, 0.2], [-2.6, 2.6], [0.4, 2.6]] as Array<[number, number]>).map(([x, z]) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: Math.PI / 2, visual: () => <DiningSet cloth="#f5f5f4" />,
        })),
      ], <>
        <group position={[5.7, 0, -4.4]}><Plant /></group><group position={[-5.7, 0, 4.1]}><Plant /></group>
        {/* Restaurants known for their view: the aquarium (Ossiano, Al Mahara) or the sea and skyline. */}
        {venue.feature === "aquarium" && <group position={[0, 0, -D / 2 + 0.06]}><AquariumWall width={Wd - 0.4} /></group>}
        {venue.feature === "skyline" && <group position={[0, 0, -D / 2 + 0.06]}><SkylineWindow width={Wd - 0.4} /></group>}
      </>);
    }

    case "beach": {
      // Sand sloping down to the sea, which runs out to the horizon. Loungers face the water; the bar is
      // a thatched beach hut. Clubs add a DJ and a dance spot on the sand.
      // Swimming, water sports, sunbathing, volleyball and sandcastles are acted out in 3D (rides/); where
      // they happen is in rides/paths.ts (BEACH).
      const [Wd, D] = BEACH.size;
      const name = `${venue.name} ${venue.category}`;
      const colors = ["#f43f5e", "#0ea5e9", "#f59e0b", "#10b981", accent];
      const sign = signTexture(venue.name, "#ffffff", null);
      const shore = BEACH.shore; // sea beyond this line
      return plan(venue, [Wd, D], "sand", [
        // The swim spot is on the sand by the lifeguard (staff stand by the first station if there's no bar).
        // Other things to do here (a jog, a workout, a photo…): only when the venue has some.
        { kind: "exhibit", position: [BEACH.swimX - 1.4, shore + 5], label: "✨ Things to do", visual: () => null },
        { kind: "exhibit", position: [BEACH.swimX, shore + 2.2], label: "🏊 Sea", rides: ["sea-swim"], visual: () => null },
        { kind: "exhibit", position: [BEACH.sportsX, shore + 1.3], label: "🚤 Water sports", rides: ["jet-ski", "paddleboard", "kitesurf"], visual: () => null },
        { kind: "exhibit", position: [BEACH.castle[0] + 1.3, BEACH.castle[1] + 0.9], label: "🏰 Sandcastle", rides: ["sandcastle"], visual: () => null },
        { kind: "exhibit", position: [BEACH.net[0] - 3.9, BEACH.net[1] + 1.6], label: "🏐 Volleyball", rides: ["beach-volleyball"], visual: () => null },
        { kind: "bar", position: [-8.4, 3], rotation: Math.PI / 2, label: "Beach bar", visual: () => <><Bar glow={light ?? "#f59e0b"} width={3} /><group position={[0.4, 0, 0]}><ThatchRoof width={2.4} depth={4} /></group></> },
        { kind: "menu", position: [-8.4, 7], rotation: Math.PI / 2, label: "Order here", visual: () => <MenuCounter title={venue.name} items={venue.products.filter((p) => !p.service).map((p) => ({ name: p.name, price: p.price }))} color={accent} /> },
        { kind: "tickets", position: [8.4, 6.4], rotation: -Math.PI / 2, label: "Daybeds & hire", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "service", position: [8.4, 3.4], rotation: -Math.PI / 2, visual: () => <TicketKiosk accent="#0ea5e9" /> },
        { kind: "dancefloor", position: [-2.8, 6.2], visual: () => <DanceFloor colors={[accent, "#22d3ee", "#facc15"]} size={3.4} /> },
        { kind: "dj", position: [-2.8, 8.6], rotation: Math.PI, visual: () => <><DJBooth glow={light ?? accent} /><group position={[0, 0, 0.2]}><ThatchRoof width={3} depth={2} /></group></> },
        // loungers in a row along the sand, facing the sea
        ...BEACH.loungers.map(([x, z], i) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: 0, rides: ["sunbathe"], visual: () => <LoungerSet color={colors[i % colors.length]} />,
        })),
      ], <>
        {/* wet sand at the waterline, then the sea out to the horizon */}
        <mesh position={[0, 0.012, shore + 0.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[Wd, 1.6]} /><meshStandardMaterial color="#d9b77a" roughness={0.4} /></mesh>
        <group position={[0, 0, shore - (D / 2 + shore) / 2]}><Sea width={Wd} depth={D / 2 + shore} /></group>
        <OpenSea z={-D / 2} />
        <group position={[0, 0, BEACH.buoyZ]}><BuoyLine width={Wd - 2} /></group>
        <group position={[-6, 0, shore - 8]} rotation={[0, 0.6, 0]}><JetSki /></group>
        <group position={[7, 0, shore - 9.5]} rotation={[0, -0.4, 0]}><JetSki color="#2563eb" /></group>
        <group position={[9.4, 0, shore + 1.6]} rotation={[0, -Math.PI / 2, 0]}><LifeguardTower /></group>
        {([[-10.2, 9], [-10.4, -0.4], [10.4, 9.2], [5.6, 9.4], [-6.2, 9.6]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Palm height={4.4 + (i % 2) * 0.7} /></group>)}
        <group position={[3.6, 0, 9]}><SignPost map={sign} /></group>
        {hasVolleyball(venue) && <group position={[BEACH.net[0], 0, BEACH.net[1]]}><VolleyballNet /></group>}
        {/kite/i.test(name) && <group position={[0, 0, shore - 7]}><Kites /></group>}
        {/truck/i.test(name) && <group position={[-3.4, 0, 7.2]}><FoodTruck color="#ffffff" accent={accent} /></group>}
        {/abra/i.test(name) && <group position={[5, 0, shore - 2]} rotation={[0, Math.PI / 2, 0]}><DockWithAbra /></group>}
      </>, false);
    }

    case "pooldeck": {
      // A stone deck around a big pool, loungers, cabanas and the pool bar. Sky pools look out over the city.
      const D = 15, Wd = 18;
      const kids = isKidsPool(venue);
      const sky = isSkyPool(venue);
      const pool = poolDeckPool(sky, kids);
      const colors = ["#f43f5e", "#0ea5e9", "#f59e0b", "#10b981", accent];
      const sign = signTexture(venue.name, "#ffffff", null);
      return plan(venue, [Wd, D], "deck", [
        { kind: "exhibit", position: [0, 1.2], label: kids ? "Splash pool" : "Swim", visual: () => <mesh position={[0, 0.15, 0]}><torusGeometry args={[0.3, 0.1, 8, 16]} /><meshStandardMaterial color="#f97316" /></mesh> },
        ...(kids ? [] : [{ kind: "exhibit" as StationKind, position: [-pool.w / 2 + 1.2, pool.at[1] + pool.d / 2 + 1.1] as [number, number], label: "🏊 Pool", rides: ["pool-swim", "pool-cannonball", "pool-float"], visual: () => null }]),
        { kind: "bar", position: [7.2, -0.8], rotation: -Math.PI / 2, label: "Pool bar", visual: () => <Bar glow={light ?? "#38bdf8"} width={3} /> },
        { kind: "menu", position: [7.2, 3.2], rotation: -Math.PI / 2, label: "Order here", visual: () => <MenuCounter title={venue.name} items={venue.products.filter((p) => !p.service).map((p) => ({ name: p.name, price: p.price }))} color={accent} /> },
        { kind: "tickets", position: [-7.2, 4.4], rotation: Math.PI / 2, label: kids ? "Sign up" : "Day pass & cabanas", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "service", position: [-7.2, 1.2], rotation: Math.PI / 2, visual: () => <TicketKiosk accent="#0ea5e9" /> },
        { kind: "dancefloor", position: [0, 5.4], visual: () => <DanceFloor colors={[accent, "#22d3ee", "#facc15"]} size={3} /> },
        ...([[-4.6, 3.4], [-1.6, 3.6], [1.6, 3.6], [4.6, 3.4]] as Array<[number, number]>).map(([x, z], i) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: Math.PI, visual: () => <LoungerSet color={colors[i % colors.length]} />,
        })),
      ], <>
        <group position={[0, 0, pool.at[1]]}><Pool w={pool.w} d={pool.d} color={kids ? "#22d3ee" : "#0ea5e9"} /></group>
        {kids && <group position={[4.4, 0, -4.6]} scale={0.4}><SlideTower /></group>}
        {!sky && ([[-7.4, -5.6], [7.4, -5.6]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Cabana color={i ? accent : "#f5f5f4"} /></group>)}
        {sky
          ? <group position={[0, 0, -D / 2 - 0.5]}><SkylineWindow width={Wd + 6} height={6} /></group>
          : ([[-8.6, 6.4], [8.6, 6.4], [-8.6, -1], [8.6, -3]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Palm height={4.4} /></group>)}
        <group position={[-3.6, 0, 6.6]}><SignPost map={sign} /></group>
      </>, false);
    }

    case "waterpark": {
      // The slide tower (Aquaventure's stepped temple, or Wild Wadi's rock), its slides landing in
      // splash pools, the drop slide's clear tube through a shark lagoon, a wave pool and a lazy river,
      // all on sand like the real parks, behind an entrance arch with the park's name. Every ride is
      // ridden in 3D (rides/), starting from the station at its entrance. Shapes are in rides/paths.ts.
      const [Wd, D] = WATERPARK.size;
      const atlantis = parkOf(venue) === "aquaventure";
      const sign = signTexture(venue.name.toUpperCase(), "#ffffff", null);
      const T = WATERPARK.tower;
      const { wavePool: wp, river, smallRiver, flowRider: fr } = WATERPARK;
      const towerRides = Object.values(RIDES).filter((r) => ["drop", "twistA", "twistB"].includes(r.track)).map((r) => r.id);
      const ridesOn = (track: string) => Object.values(RIDES).filter((r) => r.track === track).map((r) => r.id);
      return plan(venue, [Wd, D], "sand", [
        { kind: "exhibit", position: [T[0] - 2.6, T[1] + 6.6], label: atlantis ? "🗼 Tower of Neptune" : "🗼 Slide tower", rides: towerRides, visual: () => null },
        { kind: "exhibit", position: [river.at[0] + river.radius + 0.5, river.at[1]], rotation: Math.PI / 2, label: "🛟 Lazy river", rides: ridesOn("river"), visual: () => null },
        { kind: "exhibit", position: [wp.at[0], wp.at[1] + wp.d / 2 + 1], label: "🌊 Wave pool", rides: ridesOn("waves"), visual: () => null },
        { kind: "exhibit", position: [fr.at[0], fr.at[1] + fr.d / 2 + 1.4], label: "🏄 FlowRider", rides: ridesOn("flowrider"), visual: () => null },
        { kind: "tickets", position: [-12.4, 10], rotation: Math.PI / 2, label: "Tickets", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "bar", position: [12.4, 8], rotation: -Math.PI / 2, label: "Snack bar", visual: () => <><Bar glow="#f59e0b" width={3} /><group position={[-0.4, 0, 0]}><ThatchRoof width={2.4} depth={4} /></group></> },
        ...([[-3, 9.4], [0.4, 9.6], [3.8, 9.4]] as Array<[number, number]>).map(([x, z], i) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: Math.PI, visual: () => <LoungerSet color={["#f97316", "#0ea5e9", "#facc15"][i]} />,
        })),
      ], <>
        <group position={[T[0], 0, T[1]]}>
          <SlideMountain kind={atlantis ? "ziggurat" : "rock"} />
          <Slides through={atlantis} />
          {atlantis && <group position={[0, 0, 4.6]}><SharkLagoon /></group>}
          {/* splash pools where the slides come out */}
          {Object.values(SPLASH_POOLS).map((p, i) => <group key={i} position={[p.at[0], 0, p.at[1]]}><Pool w={p.w} d={p.d} color="#22d3ee" /></group>)}
        </group>
        {/* wave pool, lazy river and (at Wild Wadi) the FlowRider */}
        <group position={[wp.at[0], 0, wp.at[1]]}><WavePool w={wp.w} d={wp.d} /></group>
        <group position={[river.at[0], 0, river.at[1]]}><LazyRiver radius={river.radius} /></group>
        <group position={[river.at[0], 0, river.at[1]]}><Palm height={4.8} /></group>
        <group position={[smallRiver.at[0], 0, smallRiver.at[1]]}><LazyRiver radius={smallRiver.radius} /></group>
        {!atlantis && <group position={[fr.at[0], 0, fr.at[1]]}><FlowRider w={fr.w} d={fr.d} /></group>}
        {([[-13, -12], [13, -12], [13, -2], [-13, -1], [13, 12], [-13, 12]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Palm height={4.6} /></group>)}
        {/* the entrance arch on the side, so it doesn't hide the slides */}
        <group position={[-12.6, 0, 9.6]} rotation={[0, Math.PI / 2, 0]}><EntranceArch map={sign} color={atlantis ? "#e11d48" : "#b45309"} /></group>
      </>, false);
    }

    case "spa": {
      // Treatment rooms, a plunge pool and relaxation loungers in candlelight.
      const D = 12, Wd = 14;
      return plan(venue, [Wd, D], "wood", [
        { kind: "reception", position: [-4.4, -3.6], visual: () => <Reception accent={accent} /> },
        { kind: "service", position: [4.2, -2.6], rotation: -Math.PI / 2, label: "Treatment room", visual: () => <TreatmentBed /> },
        { kind: "bar", position: [-5.6, 2.4], rotation: Math.PI / 2, label: "Tea lounge", visual: () => <Bar glow="#f59e0b" width={2.6} /> },
        ...([[-1.6, 3.2], [1.6, 3.2]] as Array<[number, number]>).map(([x, z]) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: Math.PI, visual: () => <Lounger towel="#e7d3a8" />,
        })),
      ], <>
        <group position={[4.2, 0, 1]} rotation={[0, -Math.PI / 2, 0]}><TreatmentBed /></group>
        <group position={[-0.6, 0, -2.4]}><Water w={4.2} d={2.2} /></group>
        {([[-6.2, -5], [6.2, -5], [-2.2, -0.6], [1.2, -0.6], [6.2, 4.6]] as Array<[number, number]>).map(([x, z], i) => <Candle key={i} position={[x, 0, z]} />)}
        {([[-6.4, -5.2], [6.4, 5.2]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Plant /></group>)}
        <pointLight position={[0, 2.6, 0]} intensity={4} distance={10} color="#fcd9a8" />
      </>);
    }

    case "theatre": {
      // Rows of seats rising towards the back, facing the stage (or the screen, in a cinema).
      const D = 15, Wd = 16;
      const cinema = /cinema|reel/i.test(venue.name);
      return plan(venue, [Wd, D], "concrete", [
        { kind: "tickets", position: [-6.8, 5.8], rotation: Math.PI / 2, label: "Box office", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "bar", position: [6.8, 5.6], rotation: -Math.PI / 2, label: cinema ? "Popcorn & snacks" : "Bar", visual: () => <Bar glow={accent} width={3} /> },
        { kind: "exhibit", position: [0, 6.2], label: "Find your seat", visual: () => <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.42, 24]} /><meshStandardMaterial color={accent} /></mesh> },
        { kind: "service", position: [6.8, 2.4], rotation: -Math.PI / 2, visual: () => <TicketKiosk accent="#a855f7" /> },
      ], <>
        {cinema ? <group position={[0, 0, -D / 2 + 0.2]}><CinemaScreen width={10} /></group> : <group position={[0, 0, -D / 2 + 1.3]}><Stage width={9} /></group>}
        <group position={[0, 0, -0.6]}><Seating rows={5} perRow={12} color={cinema ? "#1e3a8a" : "#9f1239"} /></group>
      </>);
    }

    case "bar": {
      // A cocktail bar: the long bar, lounge sofas, a small dance spot and the view it's known for.
      const D = 11, Wd = 13;
      const f = venue.feature;
      return plan(venue, [Wd, D], "wood", [
        { kind: "bar", position: [-5.4, -0.6], rotation: Math.PI / 2, visual: () => <Bar glow={light ?? accent} width={4} /> },
        { kind: "menu", position: [5.4, -3.4], rotation: -Math.PI / 2, visual: () => <MenuCounter title={venue.name} items={venue.products.filter((p) => !p.service).map((p) => ({ name: p.name, price: p.price }))} color={accent} /> },
        { kind: "dancefloor", position: [0, -2.4], visual: () => <DanceFloor colors={[accent, "#22d3ee", "#facc15"]} size={2.6} /> },
        { kind: "dj", position: [0, -4.6], visual: () => <DJBooth glow={light ?? accent} /> },
        ...([[-2.4, 1], [2.4, 1], [-2.4, 3.6], [2.4, 3.6]] as Array<[number, number]>).map(([x, z]) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: Math.PI, label: "Lounge", visual: () => <Booth tint="#3f2a1e" />,
        })),
        { kind: "reception", position: [5.4, 4.2], rotation: -Math.PI / 2, visual: () => <TicketKiosk accent={accent} /> },
      ], <>
        {f === "aquarium" ? <group position={[0, 0, -D / 2 + 0.06]}><AquariumWall width={Wd - 0.4} /></group> : <group position={[0, 0, -D / 2 + 0.06]}><SkylineWindow width={Wd - 0.4} /></group>}
        {([[-6, 5], [6, -5]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Plant /></group>)}
      </>);
    }

    case "mosque": {
      // A prayer hall: carpet, the mihrab on the qibla wall and ring chandeliers.
      const D = 14, Wd = 18;
      return plan(venue, [Wd, D], "carpet", [
        { kind: "reception", position: [-7, 5.2], rotation: Math.PI / 2, label: "Visitor information", visual: () => <Reception accent={accent} /> },
        { kind: "tickets", position: [7, 5.2], rotation: -Math.PI / 2, label: "Guided tours", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "exhibit", position: [0, 0], label: "Prayer hall", visual: () => <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.42, 24]} /><meshStandardMaterial color="#d4af37" /></mesh> },
        { kind: "service", position: [7, 1.6], rotation: -Math.PI / 2, visual: () => <TicketKiosk accent="#0f766e" /> },
        { kind: "booth", position: [-5.4, 5.6], rotation: Math.PI, visual: () => <Model url={PROP("bench")} size={[1.8, 0.6]} height={0.9} /> },
      ], <>
        <group position={[0, 0, -D / 2 + 0.06]}><Mihrab /></group>
        <group position={[-3.5, 4.4, -1]}><RingChandelier /></group>
        <group position={[3.5, 4.4, -1]}><RingChandelier /></group>
      </>);
    }

    case "rink": {
      // An ice rink with boards and glass, skate hire and a café.
      const D = 14, Wd = 18;
      return plan(venue, [Wd, D], "concrete", [
        { kind: "exhibit", position: [0, -1], label: "Skate", visual: () => null },
        { kind: "tickets", position: [-7.6, 5], rotation: Math.PI / 2, label: "Skate hire", visual: () => <TicketKiosk accent={accent} /> },
        { kind: "bar", position: [7.6, 4.6], rotation: -Math.PI / 2, label: "Café", visual: () => <Bar glow="#38bdf8" width={3} /> },
        { kind: "booth", position: [0, 5.6], rotation: Math.PI, visual: () => <Model url={PROP("bench")} size={[1.8, 0.6]} height={0.9} /> },
      ], <>
        <group position={[0, 0, -1]}><IceRink w={13} d={7} /></group>
      </>);
    }

    case "club": {
      const D = 13, Wd = 16;
      const glow = light ?? accent;
      const colors = [accent, glow, "#22d3ee", "#facc15"];
      return plan(venue, [Wd, D], "concrete", [
        { kind: "dj", position: [0, -5.0], visual: () => <DJBooth glow={glow} /> },
        { kind: "dancefloor", position: [0, -0.6], visual: () => <DanceFloor colors={colors} size={5} /> },
        { kind: "bar", position: [-6.3, -0.6], rotation: Math.PI / 2, visual: () => <Bar glow={glow} width={4} /> },
        // VIP booths along both side walls and the back corners, all with a view of the dance floor.
        ...([
          [6.4, -4.4, -Math.PI / 2], [6.4, -1.4, -Math.PI / 2], [6.4, 1.6, -Math.PI / 2],
          [-6.4, 3.6, Math.PI / 2], [-6.4, -4.6, Math.PI / 2],
          [-3.9, -5.4, 0], [3.9, -5.4, 0],
        ] as Array<[number, number, number]>).map(([x, z, r]) => ({
          kind: "booth" as StationKind, position: [x, z] as [number, number], rotation: r, label: "VIP booth", visual: () => <Booth tint="#3f0f3f" />,
        })),
        { kind: "reception", position: [4.6, 5.2], rotation: Math.PI, visual: () => <TicketKiosk accent={accent} /> },
      ], <SweepingLights colors={colors.slice(0, 3)} />);
    }

    case "outdoor": {
      const D = 15, Wd = 18;
      return plan(venue, [Wd, D], "grass", [
        { kind: "exhibit", position: [0, 1.4], visual: () => <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 32]} /><meshStandardMaterial color="#e7e5e4" /></mesh> },
        { kind: "tickets", position: [5.5, 3.8], rotation: Math.PI, visual: () => <TicketKiosk accent={accent} /> },
        { kind: "service", position: [-5.5, 3.8], rotation: Math.PI, visual: () => <TicketKiosk accent="#0ea5e9" /> },
        { kind: "bar", position: [-2.4, 4.6], rotation: Math.PI, visual: () => <TicketKiosk accent="#f59e0b" /> },
        { kind: "booth", position: [3.2, 0.6], rotation: -Math.PI / 2, visual: () => <Model url={PROP("bench")} size={[1.8, 0.6]} height={0.9} /> },
      ], <>
        {venue.feature === "pool" ? (
          <group position={[0, 0, -3.8]}><Water w={10} d={4} />{/fountain/i.test(venue.name) && <FountainJets width={10} />}</group>
        ) : (
          <mesh position={[0, 0.01, -3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 9]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
        )}
        {([[-7, -5.5], [7, -5.5], [-7.5, 0], [7.5, 0], [-6.5, 5.5], [6.5, 5.5]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Palm height={4 + (i % 3) * 0.6} /></group>)}
        <group position={[0, 0, -D / 2 - 0.5]}><SkylineWindow width={Wd + 6} height={6} /></group>
      </>, false);
    }

    case "lobby":
    default: {
      const D = 13, Wd = 16;
      const f = venue.feature;
      const features: ReactNode = f === "skyline" ? <group position={[0, 0, -D / 2 + 0.06]}><SkylineWindow width={Wd - 0.4} /></group>
        : f === "aquarium" ? <group position={[0, 0, -D / 2 + 0.06]}><AquariumWall width={Wd - 0.4} /></group>
        : f === "stage" ? <group position={[0, 0, -D / 2 + 1.3]}><Stage width={8} /></group>
        : f === "spa" ? <group position={[0, 0, -2.6]}><Water w={5} d={2.4} /></group>
        : f === "frame" ? <group position={[0, 0, -D / 2 + 0.3]}><mesh position={[0, 2.2, 0]}><boxGeometry args={[6, 4.2, 0.3]} /><meshStandardMaterial color="#d4af37" metalness={1} roughness={0.3} /></mesh><group position={[0, 0, 0.17]}><SkylineWindow width={5.2} height={3.4} /></group></group>
        : null;
      const exhibitColors = [accent, "#38bdf8", "#a78bfa"];
      return plan(venue, [Wd, D], "marble", [
        { kind: "reception", position: [-3.4, -3.4], visual: () => <Reception accent={accent} /> },
        { kind: "tickets", position: [3.4, -3.4], visual: () => <TicketKiosk accent={accent} /> },
        { kind: "counter", position: [6.2, -3.6], rotation: -Math.PI / 2, visual: () => <Till color={accent} /> },
        { kind: "exhibit", position: [0, 0.6], visual: (i) => <Exhibit color={exhibitColors[i % 3]} shape={i} /> },
        { kind: "bar", position: [6.6, 1.2], rotation: -Math.PI / 2, visual: () => <Bar glow={accent} width={3.2} /> },
        { kind: "service", position: [-6.4, 1.2], rotation: Math.PI / 2, visual: () => <Reception accent={accent} /> },
        { kind: "booth", position: [-2.8, 3.4], rotation: Math.PI, visual: () => <Booth tint="#e7dfd3" /> },
      ], <>
        {features}
        {f === "exhibits" && ([-3.5, 3.5] as number[]).map((x, i) => <group key={x} position={[x, 0, 0.6]}><Exhibit color={exhibitColors[(i + 1) % 3]} shape={i + 1} /></group>)}
        <group position={[2.8, 0, 3.4]} rotation={[0, Math.PI, 0]}><Booth tint="#e7dfd3" /></group>
        {([[-7.2, -5.6], [7.2, -5.6], [-7.2, 5.4], [7.2, 5.4]] as Array<[number, number]>).map(([x, z], i) => <group key={i} position={[x, 0, z]}><Plant /></group>)}
        {/* Chandelier */}
        <group position={[0, 4.2, 0]}>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[Math.cos((i / 12) * Math.PI * 2) * 0.8, -Math.abs(Math.sin(i)) * 0.4, Math.sin((i / 12) * Math.PI * 2) * 0.8]}>
              <sphereGeometry args={[0.08, 12, 10]} />
              <meshStandardMaterial color="#fff7e6" emissive="#fde68a" emissiveIntensity={1.5} />
            </mesh>
          ))}
          <pointLight intensity={8} distance={14} color="#fff1d6" />
        </group>
        <mesh position={[0, 0.006, 1.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5, 7]} /><meshStandardMaterial color={floorColor === "#ece6dc" ? "#7c2d12" : accent} roughness={0.95} /></mesh>
      </>);
    }
  }
}
