"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AvatarLookProps } from "../onboarding/AvatarCanvas";

interface ApartmentRoomProps {
  look?: AvatarLookProps;
  onInteractObject?: (type: "cooler" | "bed" | "chair" | "door") => void;
}

function RoomEnvironment({ onInteractObject }: { onInteractObject?: (type: "cooler" | "bed" | "chair" | "door") => void }) {
  return (
    <group position={[0, -1.2, 0]}>
      {/* Floor - Tiled Wooden Parquet */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#c28854" roughness={0.7} />
      </mesh>

      {/* Grid line accents for tiles */}
      <gridHelper args={[7, 7, "#a36e3c", "#a36e3c"]} position={[0, 0.005, 0]} />

      {/* Back Left Wall */}
      <group position={[-3.5, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow castShadow position={[0, 0, 0]}>
          <boxGeometry args={[7, 3.6, 0.2]} />
          <meshStandardMaterial color="#d4a359" roughness={0.8} />
        </mesh>

        {/* Door */}
        <mesh 
          position={[-1.8, -0.4, 0.12]} 
          onClick={(e) => { e.stopPropagation(); onInteractObject?.("door"); }}
        >
          <boxGeometry args={[1, 2.4, 0.08]} />
          <meshStandardMaterial color="#5c3818" roughness={0.6} />
        </mesh>
        {/* Door Knob */}
        <mesh position={[-1.4, -0.4, 0.18]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Back Right Wall */}
      <group position={[0, 1.8, -3.5]}>
        <mesh receiveShadow castShadow position={[0, 0, 0]}>
          <boxGeometry args={[7, 3.6, 0.2]} />
          <meshStandardMaterial color="#d4a359" roughness={0.8} />
        </mesh>

        {/* Window with Glass & Slats */}
        <group position={[1.8, 0.4, 0.12]}>
          <mesh>
            <boxGeometry args={[2.2, 1.5, 0.06]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} />
          </mesh>
          {/* Window Slats */}
          {[-0.5, -0.2, 0.1, 0.4].map((y, i) => (
            <mesh key={i} position={[0, y, 0.04]}>
              <boxGeometry args={[2.1, 0.04, 0.02]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          ))}
        </group>

        {/* Wall Lamps */}
        {[-1.6, 0.2].map((x, i) => (
          <group key={i} position={[x, 1.1, 0.14]}>
            <mesh>
              <boxGeometry args={[0.12, 0.2, 0.08]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, -0.1, 0.06]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Bed (Back corner) */}
      <group 
        position={[-0.8, 0, -2.4]} 
        onClick={(e) => { e.stopPropagation(); onInteractObject?.("bed"); }}
      >
        {/* Frame */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.4, 2.2]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
        {/* Mattress / Red Quilt */}
        <mesh position={[0, 0.5, 0.1]} castShadow>
          <boxGeometry args={[1.5, 0.2, 1.8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
        {/* White Pillow */}
        <mesh position={[0, 0.55, -0.75]}>
          <boxGeometry args={[1.2, 0.14, 0.45]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* Bedside Table with Lamp */}
      <group position={[0.7, 0, -2.8]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        {/* Vintage Radio / Clock */}
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[0.35, 0.16, 0.15]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
      </group>

      {/* Blue Cooler Box / Mini Fridge (Right wall) */}
      <group 
        position={[1.6, 0, -1.8]} 
        onClick={(e) => { e.stopPropagation(); onInteractObject?.("cooler"); }}
      >
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.9, 0.56, 0.7]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
        {/* White Lid */}
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[0.94, 0.08, 0.74]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* Red Wooden Chair (Center-left) */}
      <group 
        position={[-0.4, 0, 0.2]} 
        rotation={[0, 0.3, 0]}
        onClick={(e) => { e.stopPropagation(); onInteractObject?.("chair"); }}
      >
        {/* Seat */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, -0.22]}>
          <boxGeometry args={[0.48, 0.65, 0.06]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        {/* Legs */}
        {[-0.2, 0.2].map((x, i) =>
          [-0.2, 0.2].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.24, z]}>
              <cylinderGeometry args={[0.03, 0.025, 0.48, 8]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          ))
        )}
      </group>

      {/* Small Table with Coffee Cup */}
      <group position={[1.4, 0, -0.6]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.7, 0.06, 0.7]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        {/* Legs */}
        {[-0.28, 0.28].map((x, i) =>
          [-0.28, 0.28].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.22, z]}>
              <cylinderGeometry args={[0.03, 0.025, 0.44, 8]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
          ))
        )}
        {/* Ceramic Mug */}
        <mesh position={[0, 0.53, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 12]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
      </group>

      {/* Potted Indoor Plant (Far corner) */}
      <group position={[2.7, 0, -1.2]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {/* Leaves */}
        <mesh position={[0, 0.55, 0]} rotation={[0.1, 0, 0.1]}>
          <cylinderGeometry args={[0.08, 0.02, 0.7, 8]} />
          <meshStandardMaterial color="#15803d" roughness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.48, 0.05]} rotation={[-0.2, 0.4, -0.1]}>
          <cylinderGeometry args={[0.06, 0.02, 0.55, 8]} />
          <meshStandardMaterial color="#16a34a" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function CitizenAvatarInRoom({ look }: { look?: AvatarLookProps }) {
  const groupRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);

  const skinColor = look?.skinTone || "#8d5524";
  const outfitColor = look?.outfitColor || "#f59e0b";
  const bottomsColor = look?.bottomsColor || "#0f172a";
  const hairColor = look?.hairColor || "#18181b";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = -1.18 + Math.sin(t * 2) * 0.02;
    }
    if (crownRef.current) {
      crownRef.current.rotation.y = t * 1.5;
    }
  });

  return (
    <group ref={groupRef} position={[0.2, -1.18, 0.2]}>
      {/* Floating Crown / Citizen Halo Above Head */}
      <group ref={crownRef} position={[0, 2.9, 0]}>
        <mesh>
          <torusGeometry args={[0.16, 0.03, 8, 24]} />
          <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[0.34, 0.38, 0.32]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[0.38, 0.18, 0.36]} />
        <meshStandardMaterial color={hairColor} roughness={0.4} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[0.48, 0.65, 0.28]} />
        <meshStandardMaterial color={outfitColor} roughness={0.5} />
      </mesh>

      {/* Skirt / Pants */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.42, 0.55, 16]} />
        <meshStandardMaterial color={bottomsColor} roughness={0.6} />
      </mesh>

      {/* Legs & Shoes */}
      <mesh position={[-0.12, 0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.12, 0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[-0.12, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.25]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
      <mesh position={[0.12, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.25]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
    </group>
  );
}

export function ApartmentRoom({ look, onInteractObject }: ApartmentRoomProps) {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: [5.5, 4.8, 5.5], fov: 38 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        {/* Soft Isometric Room Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[4, 8, 5]} 
          intensity={1.6} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        <pointLight position={[0.5, 2.5, 0.5]} intensity={0.8} color="#fef08a" />

        <RoomEnvironment onInteractObject={onInteractObject} />
        <CitizenAvatarInRoom look={look} />
      </Canvas>
    </div>
  );
}
