"use client";

// The 3D stage every attraction game plays on: one Canvas sized for the device (lib/device canvasQuality), a
// frame-rate monitor that steps quality down when a phone struggles (resolution first, then shadows, then
// extras) and back up when it recovers, the shared slow-motion and shake effects, and pausing when the tab is
// hidden or the game is paused. Games read the tier with useQuality() to thin crowds and props.

import { createContext, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { canvasQuality, isWebGLAvailable, useDocumentVisible } from "@/lib/device";
import { StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { stageFx, useStageTicker, type QualityTier } from "./stage";

const QualityContext = createContext<QualityTier>(2);
/** The stage's quality tier: 2 full, 1 reduced, 0 lowest. */
export const useQuality = () => useContext(QualityContext);

/** Applies the tier's resolution and runs the shared effects clock. */
function StageEffects({ tier, maxDpr }: { tier: QualityTier; maxDpr: number }) {
  useStageTicker();
  const setDpr = useThree((s) => s.setDpr);
  const dpr = tier === 2 ? Math.min(maxDpr, window.devicePixelRatio || 1) : tier === 1 ? Math.min(1.15, maxDpr) : 1;
  useEffect(() => { setDpr(dpr); }, [setDpr, dpr]);
  return null;
}

export function GameStage({ children, camera, background = "#0b1020", paused = false, environment = 0.45 }: {
  children: ReactNode;
  /** Where the camera starts (games usually move it every frame). */
  camera?: { position: [number, number, number]; fov?: number };
  background?: string;
  /** Stops drawing (pause menu, result card). */
  paused?: boolean;
  /** Soft studio lighting strength (0 for none, when a game lights itself). */
  environment?: number;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const visible = useDocumentVisible();
  // Start one step down on low-power phones; the monitor moves it from there.
  const [tier, setTier] = useState<QualityTier>(quality.shadows ? 2 : 1);
  useEffect(() => { stageFx.quality = tier; }, [tier]);
  if (typeof window !== "undefined" && !isWebGLAvailable()) {
    return <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm p-6 text-center">This game needs 3D graphics, which this browser has turned off.</div>;
  }
  return (
    <Canvas
      frameloop={paused || !visible ? "never" : "always"}
      shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false}
      dpr={quality.dpr}
      camera={{ position: camera?.position ?? [0, 2, 6], fov: camera?.fov ?? 50 }}
      gl={{ powerPreference: quality.powerPreference, antialias: tier === 2, failIfMajorPerformanceCaveat: false }}
      className="!absolute inset-0 touch-none"
    >
      <color attach="background" args={[background]} />
      {environment > 0 && <StudioEnvironment intensity={environment} />}
      <PerformanceMonitor
        // Aim for a steady frame rate: below ~45 fps step down, above ~58 step back up; give up flip-flopping after 3 swaps.
        bounds={(refresh) => (refresh > 90 ? [50, 80] : [45, 58])}
        flipflops={3}
        onDecline={() => setTier((t) => (t > 0 ? ((t - 1) as QualityTier) : t))}
        onIncline={() => setTier((t) => (t < 2 && quality.shadows ? ((t + 1) as QualityTier) : t))}
        onFallback={() => setTier(0)}
      >
        <StageEffects tier={tier} maxDpr={quality.dpr[1]} />
        <QualityContext.Provider value={tier}>
          <Suspense fallback={null}>{children}</Suspense>
        </QualityContext.Provider>
      </PerformanceMonitor>
    </Canvas>
  );
}
