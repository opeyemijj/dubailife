"use client";
/* eslint-disable react-hooks/immutability */

// The plot round a house (townhouses and villas): whatever the owner or their decorator added from
// src/data/home/exterior.json. The house is the 10 m square in the middle (x and z from -5 to 5); the front door
// faces south (+z). Pool to the east, garage and driveway to the west, BBQ and majlis in the front garden.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const noRay = () => null;

export function HomeGrounds({ items }: { items: string[] }) {
  const has = (id: string) => items.includes(id);
  if (!items.length) return null;
  return (
    <group>
      {/* the plot: sand by default, a lawn with the garden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 2]} raycast={noRay} receiveShadow>
        <planeGeometry args={[34, 30]} /><meshStandardMaterial color={has("garden") ? "#6fa356" : "#e2cfa6"} roughness={1} />
      </mesh>
      {/* the boundary wall */}
      {([[0, -13, 34, 0.3], [0, 17, 34, 0.3], [-17, 2, 0.3, 30], [17, 2, 0.3, 30]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.9, z]} raycast={noRay}><boxGeometry args={[w, 1.8, d]} /><meshStandardMaterial color="#efe6d4" roughness={0.9} /></mesh>
      ))}
      {has("garden") && <Garden />}
      {has("pool") && <Pool />}
      {has("garage") && <Garage />}
      {has("carpark") && <CarPark withCar={!has("garage")} />}
      {has("bbq") && <Bbq />}
      {has("majlis") && <Majlis />}
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

function Pool() {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = water.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.18 + Math.sin(clock.elapsedTime * 1.4) * 0.05;
  });
  return (
    <group position={[10.5, 0, 1]}>
      {/* stone deck, the pool sunk into it, a step ladder, loungers and an umbrella */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={noRay}><planeGeometry args={[8, 12]} /><meshStandardMaterial color="#e7dfcf" roughness={0.8} /></mesh>
      <mesh position={[0, 0.06, 0]} raycast={noRay}><boxGeometry args={[4.6, 0.12, 8.6]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]} raycast={noRay}>
        <planeGeometry args={[4, 8]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.2} transparent opacity={0.85} roughness={0.05} metalness={0.2} />
      </mesh>
      {[-0.35, 0.35].map((x) => <mesh key={x} position={[x - 1.6, 0.6, -3.6]} raycast={noRay}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshStandardMaterial color="#d1d5db" metalness={0.8} /></mesh>)}
      {[-1.4, 1.4].map((z) => (
        <group key={z} position={[3.1, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.3, 0]} raycast={noRay}><boxGeometry args={[0.7, 0.12, 1.8]} /><meshStandardMaterial color="#fafafa" /></mesh>
          <mesh position={[0, 0.55, -0.75]} rotation={[0.6, 0, 0]} raycast={noRay}><boxGeometry args={[0.7, 0.1, 0.6]} /><meshStandardMaterial color="#fafafa" /></mesh>
        </group>
      ))}
      <mesh position={[3.1, 1.3, 0]} raycast={noRay}><cylinderGeometry args={[0.04, 0.04, 2.6, 8]} /><meshStandardMaterial color="#78716c" /></mesh>
      <mesh position={[3.1, 2.55, 0]} raycast={noRay}><coneGeometry args={[1.5, 0.6, 12]} /><meshStandardMaterial color="#0e7490" /></mesh>
    </group>
  );
}

function Car({ color = "#f8fafc" }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} raycast={noRay}><boxGeometry args={[1.8, 0.7, 4.3]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.3} /></mesh>
      <mesh position={[0, 1.1, -0.2]} raycast={noRay}><boxGeometry args={[1.6, 0.5, 2.2]} /><meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.5} /></mesh>
      {[[-0.8, 1.4], [0.8, 1.4], [-0.8, -1.4], [0.8, -1.4]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]} raycast={noRay}><cylinderGeometry args={[0.32, 0.32, 0.22, 10]} /><meshStandardMaterial color="#111" /></mesh>
      ))}
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
      <group position={[-1.2, 0, 0.6]}><Car color="#0f172a" /></group>
    </group>
  );
}

function CarPark({ withCar }: { withCar: boolean }) {
  const lines = useMemo(() => [-12.6, -10.5, -8.4], []);
  return (
    <group>
      {/* paving from the gate to the garage, with two bays */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10.5, 0.005, 9]} raycast={noRay}><planeGeometry args={[6.4, 14]} /><meshStandardMaterial color="#a8a29e" roughness={0.9} /></mesh>
      {lines.map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 9]} raycast={noRay}><planeGeometry args={[0.12, 5]} /><meshBasicMaterial color="#fafafa" /></mesh>)}
      {/* the gate in the front wall */}
      <mesh position={[-10.5, 1, 17]} raycast={noRay}><boxGeometry args={[6, 2, 0.15]} /><meshStandardMaterial color="#44403c" metalness={0.6} /></mesh>
      {withCar && <group position={[-11.55, 0, 9]}><Car color="#f8fafc" /></group>}
    </group>
  );
}

function Bbq() {
  return (
    <group position={[8.5, 0, 10]}>
      <mesh position={[0, 0.5, 0]} raycast={noRay}><boxGeometry args={[2.2, 1, 0.8]} /><meshStandardMaterial color="#a8a29e" /></mesh>
      <mesh position={[0, 1.02, 0]} raycast={noRay}><boxGeometry args={[1.2, 0.05, 0.6]} /><meshStandardMaterial color="#1c1917" emissive="#ea580c" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 0.4, 2.2]} raycast={noRay}><boxGeometry args={[2.6, 0.08, 1.2]} /><meshStandardMaterial color="#8b6b4a" /></mesh>
      {[-1, 1].map((x) => <mesh key={x} position={[x, 0.2, 2.2]} raycast={noRay}><boxGeometry args={[0.08, 0.4, 1]} /><meshStandardMaterial color="#57534e" /></mesh>)}
    </group>
  );
}

function Majlis() {
  return (
    <group position={[0, 0, 12.5]}>
      <mesh position={[0, 2.4, 0]} raycast={noRay}><coneGeometry args={[3.4, 1.4, 4]} /><meshStandardMaterial color="#f5f0e6" side={THREE.DoubleSide} /></mesh>
      {[[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.85, z]} raycast={noRay}><cylinderGeometry args={[0.06, 0.06, 1.7, 8]} /><meshStandardMaterial color="#8b6b4a" /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={noRay}><planeGeometry args={[4.4, 4.4]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
      {[[0, -1.8, 3.6, 0.7], [-1.8, 0, 0.7, 3.6], [1.8, 0, 0.7, 3.6]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.18, z]} raycast={noRay}><boxGeometry args={[w, 0.36, d]} /><meshStandardMaterial color="#b45309" /></mesh>
      ))}
    </group>
  );
}
