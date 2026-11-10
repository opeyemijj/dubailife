"use client";
/* eslint-disable react-hooks/immutability */

// The plot round a house (townhouses and villas): whatever the owner or their decorator added from
// src/data/home/exterior.json. The house is the 10 m square in the middle (x and z from -5 to 5); the front door
// faces south (+z). Pool to the east, garage and driveway to the west, BBQ and majlis in the front garden.

import { Suspense, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "@/components/cars/CarModel";
import type { Car } from "@/lib/cars";

/** Where things are on the plot (room coordinates), shared with the room so people go to the right spot. */
export const GROUNDS = {
  pool: { x: 10.5, z: 1, w: 4, l: 8, water: -0.08, floor: -1.4 },
  loungers: [[13.6, -1.4], [13.6, 1.4]] as Array<[number, number]>,
  driveway: { x: -10.5, z: 9 },
};

const noRay = () => null;

export function HomeGrounds({ items, car, onUse, onGroundClick, activity, poolCovered }: {
  items: string[];
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
  // The plot, with a hole where the pool is sunk into it.
  const plot = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-17, -17); shape.lineTo(17, -17); shape.lineTo(17, 13); shape.lineTo(-17, 13); shape.lineTo(-17, -17);
    if (pool) {
      const P = GROUNDS.pool, hole = new THREE.Path();
      // Shape y is world -z once laid flat.
      hole.moveTo(P.x - P.w / 2 - 2, -(P.z - P.l / 2 - 2)); hole.lineTo(P.x + P.w / 2 + 2, -(P.z - P.l / 2 - 2));
      hole.lineTo(P.x + P.w / 2 + 2, -(P.z + P.l / 2 + 2)); hole.lineTo(P.x - P.w / 2 - 2, -(P.z + P.l / 2 + 2)); hole.lineTo(P.x - P.w / 2 - 2, -(P.z - P.l / 2 - 2));
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [pool]);
  if (!items.length) return null;
  const tap = (what: "pool" | "car") => onUse ? (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onUse(what); } : undefined;
  const tapGround = onGroundClick ? (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    // Ignore clicks inside the 10x10 indoor floor square so indoor floor handler handles those
    if (Math.abs(e.point.x) < 4.95 && Math.abs(e.point.z) < 4.95) return;
    e.stopPropagation();
    onGroundClick(e.point);
  } : undefined;
  const parked = car;
  const isGaragePos = has("garage") && !has("carpark");
  return (
    <group>
      {/* the plot: sand by default, a lawn with the garden — tappable to walk outside */}
      <mesh geometry={plot} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} onClick={tapGround} receiveShadow>
        <meshStandardMaterial color={has("garden") ? "#6fa356" : "#e2cfa6"} roughness={1} />
      </mesh>
      {/* the boundary wall */}
      {([[0, -13, 34, 0.3], [0, 17, 34, 0.3], [-17, 2, 0.3, 30], [17, 2, 0.3, 30]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.9, z]} raycast={noRay}><boxGeometry args={[w, 1.8, d]} /><meshStandardMaterial color="#efe6d4" roughness={0.9} /></mesh>
      ))}
      {has("garden") && <Garden />}
      {pool && <group onClick={tap("pool")} onPointerOver={onUse ? () => (document.body.style.cursor = "pointer") : undefined} onPointerOut={() => (document.body.style.cursor = "")}><Pool covered={poolCovered} /></group>}
      {/* No stand-in cars: only the car you own or have rented is ever parked here. */}
      {has("garage") && <Garage />}
      {has("carpark") && <CarPark onGroundClick={onGroundClick} />}
      {/* Paved driveway parking bay if carpark exterior item is not yet purchased */}
      {!has("carpark") && !has("garage") && (
        <group position={[GROUNDS.driveway.x, 0.01, GROUNDS.driveway.z]} onClick={onGroundClick ? (e) => { e.stopPropagation(); onGroundClick(e.point); } : undefined}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[6.4, 7.2]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
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
      {/* Your car: on the driveway (or in the garage); tap it to drive or interact. */}
      {parked && (
        <group position={isGaragePos ? [-11.7, 0, -1.4] : [GROUNDS.driveway.x, 0, GROUNDS.driveway.z]} onClick={tap("car")}
          onPointerOver={onUse ? () => (document.body.style.cursor = "pointer") : undefined} onPointerOut={() => (document.body.style.cursor = "")}>
          <Suspense fallback={null}><CarModel car={parked.car} plate={parked.plate} /></Suspense>
          {activity === "wash" && <Foam />}
        </group>
      )}
      {has("bbq") && <Bbq onGroundClick={onGroundClick} />}
      {has("majlis") && <Majlis onGroundClick={onGroundClick} />}
    </group>
  );
}

function Palm({ x, z, h = 5 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} raycast={noRay}><cylinderGeometry args={[0.14, 0.22, h, 8]} /><meshStandardMaterial color="#8b6b4a" /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[0.9, (i / 7) * Math.PI * 2, 0]} raycast={noRay}>
          <boxGeometry args={[0.35, 0.05, 2.4]} /><meshStandardMaterial color="#2f7d32" />
        </mesh>
      ))}
    </group>
  );
}

function Garden() {
  return (
    <group>
      {/* hedges along the boundary and flower beds by the door */}
      {[-12.5, 16.5].map((z) => <mesh key={z} position={[0, 0.5, z]} raycast={noRay}><boxGeometry args={[33, 1, 0.8]} /><meshStandardMaterial color="#2e6b2f" roughness={1} /></mesh>)}
      {[-3.5, 3.5].map((x) => (
        <group key={x} position={[x, 0, 6.2]}>
          <mesh position={[0, 0.2, 0]} raycast={noRay}><boxGeometry args={[3, 0.4, 0.9]} /><meshStandardMaterial color="#7c5a3a" /></mesh>
          {[-1, 0, 1].map((k) => <mesh key={k} position={[k * 0.9, 0.55, 0]} raycast={noRay}><sphereGeometry args={[0.32, 10, 8]} /><meshStandardMaterial color={["#e11d48", "#f59e0b", "#d946ef"][k + 1]} /></mesh>)}
        </group>
      ))}
      {[[-15, -11], [15, -11], [-15, 15], [15, 15], [-6.5, 14], [6.5, 14]].map(([x, z]) => <Palm key={`${x}${z}`} x={x} z={z} />)}
      {/* a stepping-stone path from the door to the gate */}
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 6 + i * 1.3]} raycast={noRay}><circleGeometry args={[0.45, 16]} /><meshStandardMaterial color="#d6d3d1" /></mesh>)}
    </group>
  );
}

function Pool({ covered }: { covered?: boolean }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = water.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.22 + Math.sin(clock.elapsedTime * 1.4) * 0.06;
  });
  const P = GROUNDS.pool, depth = -P.floor;
  return (
    <group position={[P.x, 0, P.z]}>
      {/* stone deck round the pool (a frame: the pool is sunk into the ground) */}
      {([[0, -(P.l / 2 + 1), P.w + 4, 2], [0, P.l / 2 + 1, P.w + 4, 2], [-(P.w / 2 + 1), 0, 2, P.l], [P.w / 2 + 1, 0, 2, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={i} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, l]} /><meshStandardMaterial color="#e7dfcf" roughness={0.8} /></mesh>
      ))}
      {/* white coping on the edge */}
      {([[0, -P.l / 2, P.w + 0.3, 0.3], [0, P.l / 2, P.w + 0.3, 0.3], [-P.w / 2, 0, 0.3, P.l], [P.w / 2, 0, 0.3, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={`c${i}`} position={[x, 0.04, z]}><boxGeometry args={[w, 0.08, l]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      ))}
      {/* the tiled basin, down to the floor */}
      {([[0, -P.l / 2, P.w, 0.05], [0, P.l / 2, P.w, 0.05], [-P.w / 2, 0, 0.05, P.l], [P.w / 2, 0, 0.05, P.l]] as const).map(([x, z, w, l], i) => (
        <mesh key={`w${i}`} position={[x, -depth / 2, z]}><boxGeometry args={[w, depth, l]} /><meshStandardMaterial color="#38bdf8" roughness={0.3} /></mesh>
      ))}
      <mesh position={[0, P.floor, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[P.w, P.l]} /><meshStandardMaterial color="#0ea5e9" roughness={0.4} /></mesh>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, P.water, 0]}>
        <planeGeometry args={[P.w, P.l]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.22} transparent opacity={0.55} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* steps down at one end */}
      {[0, 1, 2].map((k) => <mesh key={`s${k}`} position={[-P.w / 2 + 0.6, -0.3 - k * 0.3, -P.l / 2 + 0.3 + k * 0.4]}><boxGeometry args={[1, 0.08, 0.4]} /><meshStandardMaterial color="#e0f2fe" /></mesh>)}
      {/* loungers and an umbrella on the deck */}
      {GROUNDS.loungers.map(([lx, lz]) => (
        <group key={lz} position={[lx - P.x, 0, lz - P.z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.7, 0.12, 1.8]} /><meshStandardMaterial color="#fafafa" /></mesh>
          <mesh position={[0, 0.55, -0.75]} rotation={[0.6, 0, 0]}><boxGeometry args={[0.7, 0.1, 0.6]} /><meshStandardMaterial color="#fafafa" /></mesh>
        </group>
      ))}
      {!covered && <mesh position={[3.1, 1.3, 0]}><cylinderGeometry args={[0.04, 0.04, 2.6, 8]} /><meshStandardMaterial color="#78716c" /></mesh>}
      {!covered && <mesh position={[3.1, 2.55, 0]}><coneGeometry args={[1.5, 0.6, 12]} /><meshStandardMaterial color="#0e7490" /></mesh>}
    </group>
  );
}

/** Soap suds on the car while it's being washed. */
function Foam() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { g.current?.children.forEach((m, i) => { m.position.y = 0.9 + Math.sin(clock.elapsedTime * 2 + i) * 0.1; }); });
  return (
    <group ref={g}>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.1) * 0.8, 0.9, Math.cos(i * 1.3) * 2]} raycast={noRay}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#f8fafc" transparent opacity={0.85} /></mesh>)}
    </group>
  );
}

function Garage() {
  return (
    <group position={[-10.5, 0, -2]}>
      <mesh position={[0, 1.6, 0]} raycast={noRay} castShadow><boxGeometry args={[6.4, 3.2, 6.6]} /><meshStandardMaterial color="#efe6d4" /></mesh>
      <mesh position={[0, 3.3, 0]} raycast={noRay}><boxGeometry args={[6.8, 0.25, 7]} /><meshStandardMaterial color="#8a5a3b" /></mesh>
      {/* the roll-up door, half open, and the car inside */}
      <mesh position={[0, 2.2, 3.31]} raycast={noRay}><planeGeometry args={[5.2, 1.6]} /><meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, 0.7, 3.3]} raycast={noRay}><planeGeometry args={[5.2, 1.4]} /><meshStandardMaterial color="#111827" /></mesh>

    </group>
  );
}

function CarPark({ onGroundClick }: { onGroundClick?: (point: THREE.Vector3) => void }) {
  const lines = useMemo(() => [-12.6, -10.5, -8.4], []);
  return (
    <group>
      {/* paving from the gate to the garage, with two bays */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10.5, 0.005, 9]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(e.point); }}><planeGeometry args={[6.4, 14]} /><meshStandardMaterial color="#a8a29e" roughness={0.9} /></mesh>
      {lines.map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 9]} raycast={noRay}><planeGeometry args={[0.12, 5]} /><meshBasicMaterial color="#fafafa" /></mesh>)}
      {/* the gate in the front wall */}
      <mesh position={[-10.5, 1, 17]} raycast={noRay}><boxGeometry args={[6, 2, 0.15]} /><meshStandardMaterial color="#44403c" metalness={0.6} /></mesh>
    </group>
  );
}

function Bbq({ onGroundClick }: { onGroundClick?: (point: THREE.Vector3) => void }) {
  return (
    <group position={[8.5, 0, 10]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(new THREE.Vector3(8.5, 0, 8.8)); }}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.2, 1, 0.8]} /><meshStandardMaterial color="#a8a29e" /></mesh>
      <mesh position={[0, 1.02, 0]} raycast={noRay}><boxGeometry args={[1.2, 0.05, 0.6]} /><meshStandardMaterial color="#1c1917" emissive="#ea580c" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 0.4, 2.2]} raycast={noRay}><boxGeometry args={[2.6, 0.08, 1.2]} /><meshStandardMaterial color="#8b6b4a" /></mesh>
      {[-1, 1].map((x) => <mesh key={x} position={[x, 0.2, 2.2]} raycast={noRay}><boxGeometry args={[0.08, 0.4, 1]} /><meshStandardMaterial color="#57534e" /></mesh>)}
    </group>
  );
}

function Majlis({ onGroundClick }: { onGroundClick?: (point: THREE.Vector3) => void }) {
  return (
    <group position={[0, 0, 12.5]} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onGroundClick?.(new THREE.Vector3(0, 0, 11.5)); }}>
      <mesh position={[0, 2.4, 0]} raycast={noRay}><coneGeometry args={[3.4, 1.4, 4]} /><meshStandardMaterial color="#f5f0e6" side={THREE.DoubleSide} /></mesh>
      {[[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.85, z]} raycast={noRay}><cylinderGeometry args={[0.06, 0.06, 1.7, 8]} /><meshStandardMaterial color="#8b6b4a" /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[4.4, 4.4]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
      {[[0, -1.8, 3.6, 0.7], [-1.8, 0, 0.7, 3.6], [1.8, 0, 0.7, 3.6]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.18, z]} raycast={noRay}><boxGeometry args={[w, 0.36, d]} /><meshStandardMaterial color="#b45309" /></mesh>
      ))}
    </group>
  );
}
