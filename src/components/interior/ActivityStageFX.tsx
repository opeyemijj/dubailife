"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ActivityCategory } from "./ActivityExperienceOverlay";

export interface ActivityStageFXProps {
  active: boolean;
  type: ActivityCategory;
  playerPos: [number, number];
  combo: number;
  burstKey: number;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: number;
  rotSpeed: number;
  scale: number;
  color: string;
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = [
  "#f43f5e", "#ec4899", "#d946ef", "#a855f7",
  "#3b82f6", "#06b6d4", "#10b981", "#eab308", "#f97316"
];

export function ActivityStageFX({
  active,
  type,
  playerPos,
  combo,
  burstKey,
}: ActivityStageFXProps) {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const confettiGroupRef = useRef<THREE.Group>(null);

  // Spot light target dummy
  const targetObj = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(playerPos[0], 0, playerPos[1]);
    return o;
  }, [playerPos]);

  // Color theme by activity
  const themeColor = useMemo(() => {
    if (type === "dance") return combo > 4 ? "#ec4899" : "#a855f7";
    if (type === "workout") return "#f97316";
    if (type === "taste") return "#f59e0b";
    return "#0ea5e9";
  }, [type, combo]);

  // Confetti particles system
  const particles = useRef<Particle[]>([]);

  // Trigger burst on burstKey change
  const lastBurst = useRef(burstKey);
  useEffect(() => {
    if (!active || burstKey === lastBurst.current) return;
    lastBurst.current = burstKey;

    const count = 24;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.2 + Math.random() * 2.5;
      newParticles.push({
        pos: new THREE.Vector3(playerPos[0], 0.2 + Math.random() * 0.4, playerPos[1]),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed * 0.8,
          2.5 + Math.random() * 3.0,
          Math.sin(angle) * speed * 0.8
        ),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        scale: 0.08 + Math.random() * 0.08,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
      });
    }
    particles.current = [...particles.current, ...newParticles].slice(-60);
  }, [burstKey, active, playerPos]);

  useFrame((state, dt) => {
    if (!active) return;
    const t = state.clock.elapsedTime;

    // 1. Move target object to player
    targetObj.position.set(playerPos[0], 0, playerPos[1]);

    // 2. Animate Floor Rings (pulsing scale & rotation)
    const rg = ringGroupRef.current;
    if (rg) {
      rg.position.set(playerPos[0], 0.02, playerPos[1]);
      rg.rotation.y = t * 0.8;
      const pulseScale = 1 + Math.sin(t * (type === "dance" ? 6 : 3.5)) * 0.12;
      rg.scale.set(pulseScale, pulseScale, pulseScale);
    }

    // 3. Animate Confetti Particles
    if (particles.current.length > 0) {
      for (const p of particles.current) {
        p.life += dt;
        p.vel.y -= 5.5 * dt; // gravity
        p.pos.addScaledVector(p.vel, dt);
        p.rot += p.rotSpeed * dt;
        if (p.pos.y < 0.02) {
          p.pos.y = 0.02;
          p.vel.set(0, 0, 0);
        }
      }
      particles.current = particles.current.filter((p) => p.life < p.maxLife);
    }
  });

  if (!active) return null;

  return (
    <group>
      <primitive object={targetObj} />

      {/* 1. Dramatic Follow Spotlight */}
      <spotLight
        ref={spotLightRef}
        position={[playerPos[0], 6.0, playerPos[1] + 0.5]}
        target={targetObj}
        angle={0.5}
        penumbra={0.7}
        intensity={type === "dance" ? 3.5 : 2.5}
        color={themeColor}
        distance={12}
        castShadow
      />

      {/* 2. Concentric Holographic Floor Stage Rings */}
      <group ref={ringGroupRef}>
        {/* Outer glowing border ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[1.1, 1.25, 32]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.65} depthWrite={false} />
        </mesh>
        {/* Inner pulsing energy disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[0.3, 0.9, 32]} />
          <meshBasicMaterial color={themeColor} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        {/* Four orbit tick accents */}
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 1.35, 0.01, Math.sin(angle) * 1.35]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <planeGeometry args={[0.15, 0.15]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* 3. Confetti Particles Quads */}
      <group ref={confettiGroupRef}>
        {particles.current.map((p, idx) => {
          const alpha = 1 - p.life / p.maxLife;
          return (
            <mesh
              key={idx}
              position={[p.pos.x, p.pos.y, p.pos.z]}
              rotation={[p.rot, p.rot * 0.7, 0]}
              scale={p.scale}
            >
              <planeGeometry args={[1, 0.6]} />
              <meshBasicMaterial color={p.color} transparent opacity={alpha} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

