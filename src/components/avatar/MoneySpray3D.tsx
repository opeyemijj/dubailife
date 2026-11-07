"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NoteParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

/**
 * High-performance 3D Money Spray effect:
 * Erupts a fountain of fluttering AED 500 banknotes from the sprayer's hand forward towards their target.
 */
export function MoneySpray3D({
  active = true,
  origin = [0.25, 1.15, 0.28],
  targetDirection = [0, 0, 1],
}: {
  active?: boolean;
  origin?: [number, number, number];
  targetDirection?: [number, number, number];
}) {
  if (!active) return null;

  const count = 36;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const stackRef = useRef<THREE.Group>(null);

  const [dirX, dirY, dirZ] = targetDirection;
  const forward = useMemo(() => new THREE.Vector3(dirX, dirY, dirZ).normalize(), [dirX, dirY, dirZ]);

  // Procedural canvas texture for crisp AED 500 banknote
  const noteTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Banknote background
    ctx.fillStyle = "#047857"; // Emerald Green
    ctx.fillRect(0, 0, 256, 128);

    // Inner gold guilloche border
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 112);
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 228, 100);

    // UAE Falcon / Crescent gold emblem in center
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(128, 64, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#047857";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("500", 128, 64);

    // Currency markings
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("AED 500", 50, 32);
    ctx.fillText("AED 500", 206, 102);

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#d1fae5";
    ctx.fillText("CENTRAL BANK OF UAE", 128, 26);
    ctx.fillText("DUBAI LIFE LUXURY", 128, 106);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const noteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: noteTexture ?? undefined,
        color: "#ffffff",
        roughness: 0.35,
        metalness: 0.15,
        side: THREE.DoubleSide,
      }),
    [noteTexture]
  );

  const particles = useMemo<NoteParticle[]>(() => {
    const list: NoteParticle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        pos: new THREE.Vector3(...origin),
        vel: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(0, 0, 0),
        rotVel: new THREE.Vector3(0, 0, 0),
        life: (i / count) * 1.8,
        maxLife: 1.6 + Math.random() * 0.6,
        scale: 0.85 + Math.random() * 0.3,
      });
    }
    return list;
  }, [count, origin]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const timeStep = Math.min(dt, 0.05);

    particles.forEach((p, idx) => {
      p.life += timeStep;

      // Reset expired banknote back to the hand emitter
      if (p.life >= p.maxLife) {
        if (!active) {
          // Hide when inactive
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);
          return;
        }

        p.life = 0;
        p.pos.set(
          origin[0] + (Math.random() - 0.5) * 0.08,
          origin[1] + (Math.random() - 0.5) * 0.06,
          origin[2] + (Math.random() - 0.5) * 0.08
        );

        // Spray velocity: strong upward and forward burst with slight lateral cone spread
        const speed = 2.4 + Math.random() * 1.6;
        const spreadX = (Math.random() - 0.5) * 0.65;
        const spreadY = 1.1 + Math.random() * 0.9;
        const spreadZ = 1.4 + Math.random() * 0.7;

        p.vel.set(
          forward.x * speed * spreadZ + spreadX,
          spreadY * 1.8,
          forward.z * speed * spreadZ + (Math.random() - 0.5) * 0.4
        );

        p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        p.rotVel.set(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 12
        );
      }

      if (p.life > 0) {
        // Physics: gravity + air drag + fluttering turbulence
        p.vel.y -= 3.8 * timeStep;
        p.vel.x *= 0.96;
        p.vel.z *= 0.96;

        // Aerodynamic fluttering oscillation
        const flutter = Math.sin(p.life * 12 + idx) * 0.25;
        p.pos.x += (p.vel.x + flutter) * timeStep;
        p.pos.y += p.vel.y * timeStep;
        p.pos.z += p.vel.z * timeStep;

        p.rot.x += p.rotVel.x * timeStep;
        p.rot.y += p.rotVel.y * timeStep;
        p.rot.z += p.rotVel.z * timeStep;

        dummy.position.copy(p.pos);
        dummy.rotation.copy(p.rot);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* 3D Banknote Stack held in left hand */}
      {active && (
        <group ref={stackRef} position={[-0.22, 1.05, 0.22]} rotation={[0.4, 0.2, -0.3]}>
          {/* Thick brick of 500 AED banknotes */}
          <mesh castShadow>
            <boxGeometry args={[0.075, 0.045, 0.14]} />
            <meshStandardMaterial color="#047857" roughness={0.4} />
          </mesh>
          {/* Gold currency wrapper band */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.078, 0.047, 0.04]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Instanced Mesh of 36 flying AED 500 Banknotes */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={noteMaterial}>
        <planeGeometry args={[0.13, 0.068]} />
      </instancedMesh>
    </group>
  );
}

