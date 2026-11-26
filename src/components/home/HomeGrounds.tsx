"use client";
/* eslint-disable react-hooks/immutability */

// The plot round a house (townhouses and villas): whatever the owner or their decorator added from
// src/data/home/exterior.json. The house is the square in the middle (10 m for townhouses, 18 m villas, 30 m
// mansions; x and z from -S/2 to S/2); the garden door faces south (+z). Pool to the east, garage and driveway to
// the west, BBQ and majlis in the front garden. Everything is laid out for the 10 m house and moved out by how much
// wider the house is (`grow`), so each piece keeps the same gap from the walls.

import { Suspense, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "@/components/cars/CarModel";
import { Std } from "./sceneLite";
import type { Car } from "@/lib/cars";

/** Where things are on the plot (room coordinates) round a house S metres wide, shared with the room so people
    go to the right spot. Bigger houses get a bigger pool. */
export function groundsFor(S = 10) {
  const e = (S - 10) / 2;
  const big = S >= 24;
  const pool = big ? { x: 12 + e, z: 1, w: 6, l: 14, water: -0.08, floor: -1.6 } : { x: 10.5 + e, z: 1, w: 4, l: 8, water: -0.08, floor: -1.4 };
  return {
    e,
    pool,
    loungers: (big ? [[-4.2, -2.6], [-1.4, -2.6], [1.4, -2.6], [4.2, -2.6]].map(([z]) => [pool.x + pool.w / 2 + 3.1, z]) : [[13.6 + e, -1.4], [13.6 + e, 1.4]]) as Array<[number, number]>,
    driveway: { x: -10.5 - e, z: 9 + e },
    /** The plot's edge: x from -edge to edge, z from -north to south. */
    edge: 17 + e + (big ? 3 : 0), north: 13 + e, south: 17 + e + (big ? 3 : 0),
  };
}
export const GROUNDS = groundsFor(10);

/**
 * Where each car sits in the garage of a house S metres wide holding `cars` cars: its middle (room coordinates),
 * which way it faces, and where to stand beside it in the aisle to get in. The car gallery (villas, mansions) has
 * two rows facing a middle aisle and grows two bays at a time; the townhouse garage holds two.
 */
/** The cars in the garage, in bay order (with a car park too, the car you'll drive first waits on the driveway). */
export function garagedCars<C extends { plate: string }>(items: string[], car: C | null | undefined, fleet: C[]): C[] {
  if (!items.includes("garage")) return [];
  const inGarage = !items.includes("carpark");
  return fleet.filter((c) => !car || c.plate !== car.plate || inGarage);
}

export function garageLayout(S: number, cars: number) {
  const bays = S >= 14 ? Math.max(S >= 24 ? 8 : 4, Math.ceil(cars / 2) * 2) : 2;
  if (bays <= 2) {
    const x = -10.5 - (S - 10) / 2;
    return { bays, width: 6.4, x, z: -2, slots: [{ x: x - 1.2, z: -2.4, yaw: 0, door: [x - 1.2, 1.9] as [number, number], aisleYaw: Math.PI }] };
  }
  const perRow = bays / 2, BL = 6, width = perRow * BAY_W + 1, L = 2 * BL + 3, x = -S / 2 - 2 - width / 2, z = -1;
  const slots = Array.from({ length: bays }, (_, i) => {
    const row = i % 2 === 0 ? -1 : 1, k = Math.floor(i / 2);
    const cx = x - width / 2 + 0.5 + (k + 0.5) * BAY_W, cz = z + row * (L / 2 - BL / 2);
    // The aisle is between the rows: stand there, beside the car's door, facing it.
    return { x: cx, z: cz, yaw: row < 0 ? 0 : Math.PI, door: [cx + 1.25, z - row * 0.2] as [number, number], aisleYaw: row < 0 ? Math.PI : 0 };
  });
  return { bays, width, x, z, length: L, slots };
}

const noRay = () => null;
/** A car gallery bay's width (metres). */
const BAY_W = 3.2;

export function HomeGrounds({ items, car, fleet = [], onUse, onCar, onGroundClick, activity, poolCovered, size = 10 }: {
  /** Tapping a car parked in the garage: walk to it and get in. */
  onCar?: (plate: string) => void;
  items: string[];
  /** How wide the house is (metres). */
  size?: number;
  /** Every car you own: parked in the garage's bays (the first one is `car`, ready to drive). */
  fleet?: Array<{ car: Car; plate: string }>;
  /** A party game laid over the pool: the umbrella is folded away so it doesn't hide the game. */
  poolCovered?: boolean;
  /** Your own car (its model, colour and plate), parked in the driveway or the garage. */
  car?: { car: Car; plate: string } | null;
  /** Tapping the pool or the car: go and use it. */
  onUse?: (what: "pool" | "car") => void;
  /** Tapping anywhere on the lawn, garden, patio, BBQ, majlis, or car park: walk there through the doorway. */
  onGroundClick?: (point: THREE.Vector3) => void;
  /** What's happening outside (someone washing the car…). */
  activity?: string;
}) {
  const has = (id: string) => items.includes(id);
  const pool = has("pool");
  const G = useMemo(() => groundsFor(size), [size]);
  const { e, north, south } = G;
  const parked = car;
  const isGaragePos = has("garage") && !has("carpark");
  // The garage holds two cars by a townhouse, at least four by a villa and eight by a mansion, and the car gallery
  // (villas and mansions) grows a pair of bays at a time so every car you own has its own bay. It stands off the
  // house's west wall and runs west, and the plot widens to fit it.
  const inGarage = garagedCars(items, car, fleet);
  const layout = garageLayout(size, inGarage.length);
  const bays = layout.bays;
  const garaged = inGarage.slice(0, bays);
  const galleryW = bays > 2 ? layout.width : 0;
  const galleryX = layout.x;
  const edge = Math.max(G.edge, size / 2 + 3.5 + galleryW);
  // The plot, with a hole where the pool is sunk into it.
  const plot = useMemo(() => {
    const shape = new THREE.Shape();
    // Shape y is world -z once laid flat.
    shape.moveTo(-edge, -south); shape.lineTo(edge, -south); shape.lineTo(edge, north); shape.lineTo(-edge, north); shape.lineTo(-edge, -south);
    if (pool) {
      const P = G.pool, hole = new THREE.Path();
      // Shape y is world -z once laid flat.
      hole.moveTo(P.x - P.w / 2 - 2, -(P.z - P.l / 2 - 2)); hole.lineTo(P.x + P.w / 2 + 2, -(P.z - P.l / 2 - 2));
      hole.lineTo(P.x + P.w / 2 + 2, -(P.z + P.l / 2 + 2)); hole.lineTo(P.x - P.w / 2 - 2, -(P.z + P.l / 2 + 2)); hole.lineTo(P.x - P.w / 2 - 2, -(P.z - P.l / 2 - 2));
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [pool, G, edge, north, south]);
  if (!items.length) return null;
  const tap = (what: "pool" | "car") => onUse ? (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onUse(what); } : undefined;
  const tapGround = onGroundClick ? (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    // Ignore clicks on the indoor floor so the room's own floor handler takes those.
    if (Math.abs(e.point.x) < size / 2 - 0.05 && Math.abs(e.point.z) < size / 2 - 0.05) return;
    e.stopPropagation();
    onGroundClick(e.point);
  } : undefined;
  return (
    <group>
      {/* the plot: sand by default, a lawn with the garden — tappable to walk outside */}
      <mesh geometry={plot} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} onClick={tapGround} receiveShadow>
        <Std color={has("garden") ? "#6fa356" : "#e2cfa6"} rough={1} />
      </mesh>
      {/* the boundary wall */}
      {([[0, -north, edge * 2, 0.3], [0, south, edge * 2, 0.3], [-edge, (south - north) / 2, 0.3, north + south], [edge, (south - north) / 2, 0.3, north + south]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.9, z]} raycast={noRay}><boxGeometry args={[w, 1.8, d]} /><Std color="#efe6d4" rough={0.9} /></mesh>
      ))}
      {has("garden") && <Garden e={e} edge={edge} north={north} south={south} />}
      {pool && <group onClick={tap("pool")} onPointerOver={onUse ? () => (document.body.style.cursor = "pointer") : undefined} onPointerOut={() => (document.body.style.cursor = "")}><Pool covered={poolCovered} G={G} /></group>}
      {/* No stand-in cars: only cars you own or have rented are ever parked here. */}
      {has("garage") && <Garage x={bays > 2 ? galleryX : -10.5 - e} bays={bays} cars={garaged}
        onCar={(plate) => onCar ? (ev: ThreeEvent<MouseEvent>) => { if (ev.delta > 6) return; ev.stopPropagation(); onCar(plate); } : tap("car")} />}
      <group position={[-e, 0, e]}>
      {has("carpark") && <CarPark onGroundClick={onGroundClick} />}
      {/* Paved driveway parking bay if carpark exterior item is not yet purchased */}
      {!has("carpark") && !has("garage") && (
        <group position={[-10.5, 0.01, 9]} onClick={onGroundClick ? (e) => { e.stopPropagation(); onGroundClick(e.point); } : undefined}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[6.4, 7.2]} />
            <Std color="#334155" rough={0.9} />
          </mesh>
          {/* Driveway boundary lines */}
          <mesh position={[-2.8, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 6.8]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[2.8, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 6.8]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}
      </group>
      {/* Your car: on the driveway (or in the garage); tap it to drive or interact. */}
      {parked && !(isGaragePos && garaged.length) && (
        <group position={isGaragePos ? [-11.7 - e, 0, -1.4] : [G.driveway.x, 0, G.driveway.z]} onClick={tap("car")}
          onPointerOver={onUse ? () => (document.body.style.cursor = "pointer") : undefined} onPointerOut={() => (document.body.style.cursor = "")}>
          <Suspense fallback={null}><CarModel car={parked.car} plate={parked.plate} /></Suspense>
          {activity === "wash" && <Foam />}
        </group>
      )}
      <group position={[e, 0, e]}>{has("bbq") && <Bbq onGroundClick={onGroundClick} at={[8.5 + e, 8.8 + e]} />}</group>
      <group position={[0, 0, e]}>{has("majlis") && <Majlis onGroundClick={onGroundClick} at={[0, 11.5 + e]} />}</group>
    </group>
  );
}

function Palm({ x, z, h = 5 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} raycast={noRay}><cylinderGeometry args={[0.14, 0.22, h, 8]} /><Std color="#8b6b4a" /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[0.9, (i / 7) * Math.PI * 2, 0]} raycast={noRay}>
          <boxGeometry args={[0.35, 0.05, 2.4]} /><Std color="#2f7d32" />
        </mesh>
      ))}
    </group>
  );
}

function Garden({ e, edge, north, south }: { e: number; edge: number; north: number; south: number }) {
  return (
    <group>
      {/* hedges along the boundary and flower beds by the door */}
      {[-north + 0.5, south - 0.5].map((z) => <mesh key={z} position={[0, 0.5, z]} raycast={noRay}><boxGeometry args={[edge * 2 - 1, 1, 0.8]} /><Std color="#2e6b2f" rough={1} /></mesh>)}
      {[-3.5, 3.5].map((x) => (
        <group key={x} position={[x, 0, 6.2 + e]}>
          <mesh position={[0, 0.2, 0]} raycast={noRay}><boxGeometry args={[3, 0.4, 0.9]} /><Std color="#7c5a3a" /></mesh>
          {[-1, 0, 1].map((k) => <mesh key={k} position={[k * 0.9, 0.55, 0]} raycast={noRay}><sphereGeometry args={[0.32, 10, 8]} /><Std color={["#e11d48", "#f59e0b", "#d946ef"][k + 1]} /></mesh>)}
        </group>
      ))}
      {[[-edge + 2, -north + 2], [edge - 2, -north + 2], [-edge + 2, south - 2], [edge - 2, south - 2], [-6.5, south - 3], [6.5, south - 3]].map(([x, z]) => <Palm key={`${x}${z}`} x={x} z={z} />)}
      {/* a stepping-stone path from the door to the gate */}
      {Array.from({ length: Math.max(8, Math.floor((south - 6 - e) / 1.3)) }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 6 + e + i * 1.3]} raycast={noRay}><circleGeometry args={[0.45, 16]} /><Std color="#d6d3d1" /></mesh>)}
    </group>
  );
}

function Pool({ covered, G }: { covered?: boolean; G: ReturnType<typeof groundsFor> }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = water.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.22 + Math.sin(clock.elapsedTime * 1.4) * 0.06;
  });
  const P = G.pool, depth = -P.floor;
  return (
    <group position={[P.x, 0, P.z]}>
      {/* stone deck round the pool (a frame: the pool is sunk into the ground) */}
      {([[0, -(P.l / 2 + 1), P.w + 4, 2], [0, P.l / 2 + 1, P.w + 4, 2], [-(P.w / 2 + 1), 0, 2, P.l], [P.w / 2 + 1, 0, 2, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={i} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, l]} /><Std color="#e7dfcf" rough={0.8} /></mesh>
      ))}
      {/* white coping on the edge */}
      {([[0, -P.l / 2, P.w + 0.3, 0.3], [0, P.l / 2, P.w + 0.3, 0.3], [-P.w / 2, 0, 0.3, P.l], [P.w / 2, 0, 0.3, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={`c${i}`} position={[x, 0.04, z]}><boxGeometry args={[w, 0.08, l]} /><Std color="#f8fafc" /></mesh>
      ))}
      {/* the tiled basin, down to the floor */}
      {([[0, -P.l / 2, P.w, 0.05], [0, P.l / 2, P.w, 0.05], [-P.w / 2, 0, 0.05, P.l], [P.w / 2, 0, 0.05, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={`w${i}`} position={[x, -depth / 2, z]}><boxGeometry args={[w, depth, l]} /><Std color="#38bdf8" rough={0.3} /></mesh>
      ))}
      <mesh position={[0, P.floor, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[P.w, P.l]} /><Std color="#0ea5e9" rough={0.4} /></mesh>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, P.water, 0]}>
        <planeGeometry args={[P.w, P.l]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.22} transparent opacity={0.55} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* steps down at one end */}
      {[0, 1, 2].map((k) => <mesh key={`s${k}`} position={[-P.w / 2 + 0.6, -0.3 - k * 0.3, -P.l / 2 + 0.3 + k * 0.4]}><boxGeometry args={[1, 0.08, 0.4]} /><Std color="#e0f2fe" /></mesh>)}
      {/* loungers and an umbrella on the deck */}
      {G.loungers.map(([lx, lz]) => (
        <group key={lz} position={[lx - P.x, 0, lz - P.z]} rotation={[0, -Math.PI / 2, 0]}>
          {/* A flat sun bed with a pillow at the far end (lying flat fits it: ApartmentRoom's sunbathe pose). */}
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.7, 0.12, 1.8]} /><Std color="#fafafa" /></mesh>
          <mesh position={[0, 0.41, -0.72]} rotation={[0.18, 0, 0]}><boxGeometry args={[0.58, 0.1, 0.34]} /><Std color="#e0f2fe" /></mesh>
          {[[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.12, z]}><boxGeometry args={[0.05, 0.24, 0.05]} /><Std color="#a8a29e" /></mesh>)}
        </group>
      ))}
      {!covered && <mesh position={[P.w / 2 + 1.1, 1.3, 0]}><cylinderGeometry args={[0.04, 0.04, 2.6, 8]} /><Std color="#78716c" /></mesh>}
      {!covered && <mesh position={[P.w / 2 + 1.1, 2.55, 0]}><coneGeometry args={[1.5, 0.6, 12]} /><Std color="#0e7490" /></mesh>}
    </group>
  );
}

/** Soap suds on the car while it's being washed. */
function Foam() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { g.current?.children.forEach((m, i) => { m.position.y = 0.9 + Math.sin(clock.elapsedTime * 2 + i) * 0.1; }); });
  return (
    <group ref={g}>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.1) * 0.8, 0.9, Math.cos(i * 1.3) * 2]} raycast={noRay}><sphereGeometry args={[0.18, 10, 8]} /><Std color="#f8fafc" opacity={0.85} /></mesh>)}
    </group>
  );
}

/**
 * The garage: a closed two-car garage by a townhouse; by a villa or mansion an open-sided car gallery (a pergola
 * roof over lit bays, like a showroom) with every car you own parked in its own bay. Tap a car to drive.
 */
function Garage({ x, bays, cars, onCar }: { x: number; bays: number; cars: Array<{ car: Car; plate: string }>; onCar: (plate: string) => ((e: ThreeEvent<MouseEvent>) => void) | undefined }) {
  const cursor = { onPointerOver: () => (document.body.style.cursor = "pointer"), onPointerOut: () => (document.body.style.cursor = "") };
  if (bays <= 2) {
    return (
      <group position={[x, 0, -2]}>
        <mesh position={[0, 1.6, 0]} raycast={noRay} castShadow><boxGeometry args={[6.4, 3.2, 6.6]} /><Std color="#efe6d4" /></mesh>
        <mesh position={[0, 3.3, 0]} raycast={noRay}><boxGeometry args={[6.8, 0.25, 7]} /><Std color="#8a5a3b" /></mesh>
        {/* the roll-up door, half open, and the car inside */}
        <mesh position={[0, 2.2, 3.31]} raycast={noRay}><planeGeometry args={[5.2, 1.6]} /><Std color="#9ca3af" metal={0.5} rough={0.4} /></mesh>
        <mesh position={[0, 0.7, 3.3]} raycast={noRay}><planeGeometry args={[5.2, 1.4]} /><Std color="#111827" /></mesh>
        {cars[0] && (
          <group position={[-1.2, 0, -0.4]} onClick={onCar(cars[0].plate)} {...cursor}><Suspense fallback={null}><CarModel car={cars[0].car} plate={cars[0].plate} /></Suspense></group>
        )}
      </group>
    );
  }
  // Bays 3.2 m wide in two rows facing a central aisle (z), cars nose-in.
  const rows = 2, perRow = bays / rows, BW = BAY_W, BL = 6;
  const W = perRow * BW + 1, L = rows * BL + 3;
  return (
    <group position={[x, 0, -1]}>
      {/* polished floor, bay lines and the pergola roof on slim columns */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} raycast={noRay} receiveShadow><planeGeometry args={[W, L]} /><Std color="#d6d3d1" rough={0.35} metal={0.1} /></mesh>
      {Array.from({ length: perRow + 1 }, (_, i) => [-1, 1].map((side) => (
        <mesh key={`${i}${side}`} rotation={[-Math.PI / 2, 0, 0]} position={[-W / 2 + 0.5 + i * BW, 0.02, side * (L / 2 - BL / 2)]} raycast={noRay}><planeGeometry args={[0.1, BL - 0.6]} /><meshBasicMaterial color="#fafafa" /></mesh>
      )))}
      {[[-W / 2, -L / 2], [W / 2, -L / 2], [-W / 2, L / 2], [W / 2, L / 2], [0, -L / 2], [0, L / 2]].map(([cx, cz], i) => (
        <mesh key={`p${i}`} position={[cx, 1.6, cz]} raycast={noRay}><boxGeometry args={[0.18, 3.2, 0.18]} /><Std color="#f8fafc" /></mesh>
      ))}
      {Array.from({ length: Math.round(W / 0.9) }, (_, i) => (
        <mesh key={`s${i}`} position={[-W / 2 + 0.45 + i * 0.9, 3.25, 0]} raycast={noRay}><boxGeometry args={[0.12, 0.12, L]} /><Std color="#f8fafc" /></mesh>
      ))}
      <mesh position={[0, 3.36, 0]} raycast={noRay}><boxGeometry args={[W + 0.3, 0.1, L + 0.3]} /><Std color="#e2e8f0" opacity={0.35} /></mesh>
      {/* warm strip lights over each row */}
      {[-1, 1].map((side) => <mesh key={`l${side}`} position={[0, 3.15, side * (L / 2 - BL / 2)]} raycast={noRay}><boxGeometry args={[W - 0.6, 0.04, 0.12]} /><meshBasicMaterial color="#fde68a" /></mesh>)}
      {cars.map((c, i) => {
        const row = i % rows === 0 ? -1 : 1, k = Math.floor(i / rows);
        return (
          <group key={c.plate} position={[-W / 2 + 0.5 + (k + 0.5) * BW, 0, row * (L / 2 - BL / 2)]} rotation={[0, row < 0 ? 0 : Math.PI, 0]} onClick={onCar(c.plate)} {...cursor} userData={{ bake: true }}>
            <Suspense fallback={null}><CarModel car={c.car} plate={c.plate} /></Suspense>
          </group>
        );
      })}
    </group>
  );
}

function CarPark({ onGroundClick }: { onGroundClick?: (point: THREE.Vector3) => void }) {
  const lines = useMemo(() => [-12.6, -10.5, -8.4], []);
  return (
    <group>
      {/* paving from the gate to the garage, with two bays */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10.5, 0.005, 9]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(e.point); }}><planeGeometry args={[6.4, 14]} /><Std color="#a8a29e" rough={0.9} /></mesh>
      {lines.map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 9]} raycast={noRay}><planeGeometry args={[0.12, 5]} /><meshBasicMaterial color="#fafafa" /></mesh>)}
      {/* the gate in the front wall */}
      <mesh position={[-10.5, 1, 17]} raycast={noRay}><boxGeometry args={[6, 2, 0.15]} /><Std color="#44403c" metal={0.6} /></mesh>
    </group>
  );
}

function Bbq({ onGroundClick, at }: { onGroundClick?: (point: THREE.Vector3) => void; at: [number, number] }) {
  return (
    <group position={[8.5, 0, 10]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(new THREE.Vector3(at[0], 0, at[1])); }}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.2, 1, 0.8]} /><Std color="#a8a29e" /></mesh>
      <mesh position={[0, 1.02, 0]} raycast={noRay}><boxGeometry args={[1.2, 0.05, 0.6]} /><Std color="#1c1917" emissive="#ea580c" glow={0.4} /></mesh>
      <mesh position={[0, 0.4, 2.2]} raycast={noRay}><boxGeometry args={[2.6, 0.08, 1.2]} /><Std color="#8b6b4a" /></mesh>
      {[-1, 1].map((x) => <mesh key={x} position={[x, 0.2, 2.2]} raycast={noRay}><boxGeometry args={[0.08, 0.4, 1]} /><Std color="#57534e" /></mesh>)}
    </group>
  );
}

function Majlis({ onGroundClick, at }: { onGroundClick?: (point: THREE.Vector3) => void; at: [number, number] }) {
  return (
    <group position={[0, 0, 12.5]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(new THREE.Vector3(at[0], 0, at[1])); }}>
      <mesh position={[0, 2.4, 0]} raycast={noRay}><coneGeometry args={[3.4, 1.4, 4]} /><meshStandardMaterial color="#f5f0e6" side={THREE.DoubleSide} /></mesh>
      {[[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.85, z]} raycast={noRay}><cylinderGeometry args={[0.06, 0.06, 1.7, 8]} /><Std color="#8b6b4a" /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[4.4, 4.4]} /><Std color="#7f1d1d" /></mesh>
      {[[0, -1.8, 3.6, 0.7], [-1.8, 0, 0.7, 3.6], [1.8, 0, 0.7, 3.6]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.18, z]} raycast={noRay}><boxGeometry args={[w, 0.36, d]} /><Std color="#b45309" /></mesh>
      ))}
    </group>
  );
}
