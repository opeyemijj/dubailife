"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface AvatarLookProps {
  gender: "woman" | "man";
  hairstyle: string;
  outfit: string;
  fabric: string;
  skinTone: string;
  hairColor: string;
  outfitColor: string;
  bottomsColor: string;
}

function Pedestal() {
  return (
    <group position={[0, -1.8, 0]}>
      {/* Upper Pedestal Disc */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.2, 48]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Lower Shadow Rim */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.65, 1.7, 0.08, 48]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>
    </group>
  );
}

function StylizedCharacter({ look }: { look: AvatarLookProps }) {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle breathing / idle bounce animation
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = -1.65 + Math.sin(t * 2) * 0.025;
    }
  });

  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: look.skinTone,
    roughness: 0.6,
  }), [look.skinTone]);

  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: look.hairColor,
    roughness: 0.4,
  }), [look.hairColor]);

  const topMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: look.outfitColor,
    roughness: look.fabric === "Silk" ? 0.2 : look.fabric === "Linen" ? 0.8 : 0.5,
    metalness: look.fabric === "Gold Thread" || look.fabric === "Silk" ? 0.25 : 0,
  }), [look.outfitColor, look.fabric]);

  const bottomMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: look.bottomsColor,
    roughness: 0.6,
  }), [look.bottomsColor]);

  const shoesMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#7f1d1d",
    roughness: 0.4,
  }), []);

  const isWoman = look.gender === "woman";
  const isKandura = look.outfit === "Traditional / Kandura";

  return (
    <group ref={groupRef} position={[0, -1.65, 0]}>
      {/* Head */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[0.38, 0.44, 0.36]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.18, 16]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Hair Styles */}
      <group position={[0, 2.65, 0]}>
        {look.hairstyle === "Afro" && (
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.36, 16, 16]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
        )}
        {look.hairstyle === "Bun" && (
          <>
            <mesh position={[0, 0.05, -0.05]}>
              <boxGeometry args={[0.42, 0.25, 0.4]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.3, -0.15]}>
              <sphereGeometry args={[0.16, 16, 16]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </>
        )}
        {look.hairstyle === "Ponytail" && (
          <>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.42, 0.25, 0.38]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.05, -0.32]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.05, 0.45, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </>
        )}
        {look.hairstyle === "Kandura & Ghutra" && (
          <group position={[0, 0.05, 0]}>
            {/* White/Red Ghutra cloth drape */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.26, 0.3, 0.18, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            {/* Black Agal head rope ring */}
            <mesh position={[0, 0.18, 0]}>
              <torusGeometry args={[0.22, 0.035, 12, 24]} />
              <meshStandardMaterial color="#18181b" roughness={0.5} />
            </mesh>
            {/* Side cloth falls */}
            <mesh position={[-0.22, -0.25, 0]}>
              <boxGeometry args={[0.08, 0.65, 0.28]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0.22, -0.25, 0]}>
              <boxGeometry args={[0.08, 0.65, 0.28]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        )}
        {look.hairstyle === "Low cut" && (
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.4, 0.12, 0.38]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
        )}
        {(look.hairstyle === "Braids" || look.hairstyle === "Long" || look.hairstyle === "Locs" || look.hairstyle === "Classic") && (
          <>
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.42, 0.2, 0.4]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Left drop */}
            <mesh position={[-0.22, -0.25, 0]}>
              <boxGeometry args={[0.08, 0.6, 0.32]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Right drop */}
            <mesh position={[0.22, -0.25, 0]}>
              <boxGeometry args={[0.08, 0.6, 0.32]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Back drop */}
            <mesh position={[0, -0.25, -0.19]}>
              <boxGeometry args={[0.38, 0.6, 0.08]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </>
        )}
      </group>

      {/* Torso / Upper Body */}
      {isKandura ? (
        // Full length flowing Emirati Kandura
        <mesh position={[0, 1.25, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.44, 1.7, 16]} />
          <primitive object={topMat} attach="material" />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 1.7, 0]} castShadow>
            <boxGeometry args={[0.55, 0.75, 0.3]} />
            <primitive object={topMat} attach="material" />
          </mesh>

          {/* Waist Band / Belt */}
          <mesh position={[0, 1.28, 0]}>
            <boxGeometry args={[0.54, 0.08, 0.31]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.4} roughness={0.3} />
          </mesh>
        </>
      )}

      {/* Arms & Hands */}
      <group position={[-0.36, 1.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.07, 0.065, 0.7, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.73, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      <group position={[0.36, 1.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.07, 0.065, 0.7, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.73, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* Bottoms / Legs */}
      {!isKandura && (
        <>
          {isWoman && look.outfit !== "Office" && look.outfit !== "Site work" ? (
            // Skirt
            <mesh position={[0, 0.95, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.48, 0.65, 16]} />
              <primitive object={bottomMat} attach="material" />
            </mesh>
          ) : (
            // Pants / Trousers
            <group position={[0, 0.8, 0]}>
              <mesh position={[-0.15, -0.2, 0]}>
                <cylinderGeometry args={[0.13, 0.11, 0.75, 12]} />
                <primitive object={bottomMat} attach="material" />
              </mesh>
              <mesh position={[0.15, -0.2, 0]}>
                <cylinderGeometry args={[0.13, 0.11, 0.75, 12]} />
                <primitive object={bottomMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Bare Legs (under skirt) */}
          {isWoman && look.outfit !== "Office" && look.outfit !== "Site work" && (
            <group position={[0, 0.35, 0]}>
              <mesh position={[-0.14, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.065, 0.65, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              <mesh position={[0.14, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.065, 0.65, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Shoes */}
          <group position={[0, 0.04, 0]}>
            <mesh position={[-0.14, 0, 0.05]} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.28]} />
              <primitive object={shoesMat} attach="material" />
            </mesh>
            <mesh position={[0.14, 0, 0.05]} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.28]} />
              <primitive object={shoesMat} attach="material" />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

export function AvatarCanvas({ look }: { look: AvatarLookProps }) {
  const [rotation, setRotation] = useState(0);
  const isDragging = useRef(false);
  const previousX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    previousX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - previousX.current;
    previousX.current = e.clientX;
    setRotation((prev) => prev + delta * 0.015);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <div
      className="relative w-full h-full min-h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0.4, 4.2], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#bfdbfe" />

        <group rotation={[0, rotation, 0]}>
          <Pedestal />
          <StylizedCharacter look={look} />
        </group>
      </Canvas>

      {/* Floating Drag Indicator hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
        Drag to spin
      </div>
    </div>
  );
}
