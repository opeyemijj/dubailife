"use client";

// Floor plans for each kind of venue. Stations (the clickable spots) are derived from what the venue
// actually offers, so every station opens something real. Units: metres; back wall at -depth/2,
// entrance at +depth/2. A fixture's front faces +z before rotation.

import type { ReactNode } from "react";
import type { Product, StationKind, Venue } from "@/lib/city/types";
import type { FloorKind } from "./materials";
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

/** Where a citizen sits at a table or booth, in the station's frame, and which way they face. */
export function seatAt(venue: Venue, s: StationDef): { local: [number, number]; facing: number; lift: number } | null {
  if (s.kind !== "booth") return null;
  // Dining sets: the chair nearest the aisle, facing the table. Sofas and benches: the seat, facing out.
  // The sit clip puts the hips ~0.2 m behind where the feet stand, so the stand point is that far ahead.
  // `lift` raises the sitter for seats higher than a dining chair (the clip's seat height).
  if (venue.layout === "dining") return { local: [0, 0.86], facing: s.rotation + Math.PI, lift: 0 };
  if (venue.layout === "outdoor") return { local: [0, 0.2], facing: s.rotation, lift: 0 };
  return { local: [0, -0.05], facing: s.rotation, lift: 0.11 };
}

/**
 * The spot on a station's top where the n-th thing served there is put down, in its own frame.
 * Counters get a row along the front edge; tables a small cluster on the citizen's side.
 */
export function servingSpot(venue: Venue, s: StationDef, n: number): [number, number, number] {
  // Centre first (where the citizen stands), then alternating either side.
  const row = (top: number, z: number, step = 0.22): [number, number, number] => [[0, 1, -1, 2, -2][n % 5] * step, top, z - Math.floor(n / 5) * 0.16];
  switch (s.kind) {
    case "booth":
      if (venue.layout === "dining") return [[0, -0.16, 0.16][n % 3], 0.775, 0.2 - Math.floor(n / 3) * 0.17];
      if (venue.layout === "outdoor") return [0.55 + (n % 2) * 0.18, 0.45, 0];
      return [[-0.3, 0.3, 0, -0.12, 0.15][n % 5], 0.42, 1.0 + (n >= 5 ? -0.12 : 0.06)];
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
  for (const a of venue.activities ?? []) kinds.add(a.animation === "dance" ? "dancefloor" : a.animation === "sit" ? "booth" : "exhibit");
  if (venue.layout === "boutique" && venue.products.some((p) => !p.service)) kinds.add("fitting");
  if (venue.layout === "dining") kinds.add("booth");
  return kinds;
}

type Slot = { kind: StationKind; position: [number, number]; rotation?: number; label?: string; visual: (i: number) => ReactNode };

function plan(venue: Venue, size: [number, number], floor: FloorKind, slots: Slot[], decor: ReactNode, walls = true): Plan {
  const kinds = stationKindsFor(venue);
  const used = slots.filter((s) => kinds.has(s.kind));
  // Anything offered at a station this layout has no slot for is sold at the till/counter instead.
  const stations: StationDef[] = used.map((s, i) => ({
    id: `${s.kind}-${i}`,
    kind: s.kind,
    label: s.label ?? LABEL[s.kind],
    position: s.position,
    rotation: s.rotation ?? 0,
    visual: s.visual(i),
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
      ], <><group position={[5.7, 0, -4.4]}><Plant /></group><group position={[-5.7, 0, 4.1]}><Plant /></group></>);
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
