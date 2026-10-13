"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { canvasQuality } from "@/lib/device";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import { CitizenAvatar, StudioEnvironment } from "@/components/avatar/CitizenAvatar";

export type { AvatarLookProps } from "@/components/avatar/roster";
import type { AvatarLookProps } from "@/components/avatar/roster";

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

export function AvatarCanvas({ look }: { look: AvatarLookProps }) {
  const [rotation, setRotation] = useState(0);
  // Start the 3D a moment after the page is up, so the first taps on the page respond at once.
  const [ready, setReady] = useState(false);
  const quality = useMemo(() => canvasQuality(), []);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setReady(true), { timeout: 1200 }); return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id); }
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);
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
      className="relative w-full h-full md:min-h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      // Up/down swipes scroll the page; sideways drags spin the avatar.
      style={{ touchAction: "pan-y" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {!ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={rosterThumb(presetFor(look))} alt="" className="absolute inset-0 m-auto h-[80%] object-contain opacity-80" />
      )}
      {ready && <Canvas
        camera={{ position: [0, -0.55, 3.4], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.85, 0)}
        style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
        shadows={quality.shadows}
        dpr={quality.dpr}
      >
        <StudioEnvironment intensity={0.7} />
        <hemisphereLight args={["#fff7ed", "#94a3b8", 0.6]} />
        <directionalLight position={[3, 5, 4]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#bfdbfe" />

        <group rotation={[0, rotation, 0]}>
          <Pedestal />
          <Suspense fallback={null}>
            <CitizenAvatar look={look} position={[0, -1.7, 0]} />
          </Suspense>
          <ContactShadows position={[0, -1.69, 0]} scale={3} blur={2.4} opacity={0.45} far={2} />
        </group>
      </Canvas>}

      <SceneLoadingOverlay label="Preparing your citizen" />

      {/* Floating Drag Indicator hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
        Drag to spin
      </div>
    </div>
  );
}
