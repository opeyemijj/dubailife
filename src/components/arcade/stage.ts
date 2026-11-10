// What every 3D game's stage shares while a round runs: slow motion, camera shake and the quality tier the
// frame-rate monitor has settled on. A plain mutable object read every frame (no re-renders), like rideIO.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type * as THREE from "three";

/** 2 = full (shadows, full crowds), 1 = reduced, 0 = lowest (no shadows, fewest extras). */
export type QualityTier = 0 | 1 | 2;

export const stageFx = {
  /** How fast game time runs (1 normal; below 1 in slow motion). */
  timeScale: 1,
  /** Seconds of slow motion left (real time). */
  slowLeft: 0,
  slowScale: 1,
  /** Camera shake strength, fading out (metres of jitter). */
  shake: 0,
  quality: 2 as QualityTier,
  /** Game seconds since the round started (scaled by slow motion, frozen while paused). */
  clock: 0,
  paused: false,
};

/** Slow game time to `scale` for `seconds` of real time (a knockout, a perfect catch). */
export function slowMo(scale = 0.25, seconds = 1.2) {
  stageFx.slowScale = scale;
  stageFx.slowLeft = Math.max(stageFx.slowLeft, seconds);
}

/** A jolt of camera shake (0.05 a tap, 0.3 a knockout). */
export function shake(amount = 0.08) {
  stageFx.shake = Math.min(0.5, stageFx.shake + amount);
}

/**
 * Jitters the camera by the current shake. Call it last in the game's own camera code each frame, after placing
 * the camera (a frame callback with a positive priority would stop React Three Fiber's automatic rendering, so
 * the stage can't do this itself afterwards).
 */
export function applyShake(camera: THREE.Camera) {
  const s = stageFx.shake;
  if (s < 0.002) return;
  camera.position.x += (Math.random() - 0.5) * s;
  camera.position.y += (Math.random() - 0.5) * s;
  camera.position.z += (Math.random() - 0.5) * s * 0.5;
}

/** Resets the effects for a new round. */
export function resetStage() {
  Object.assign(stageFx, { timeScale: 1, slowLeft: 0, slowScale: 1, shake: 0, clock: 0, paused: false });
}

/**
 * Advances the shared effects once per frame. GameStage runs it at priority -1 (negative: runs first and keeps
 * automatic rendering on) so every game frame after it sees this frame's time scale.
 */
export function useStageTicker() {
  useFrame((_, dt) => {
    const real = Math.min(dt, 0.1);
    if (stageFx.slowLeft > 0) stageFx.slowLeft = Math.max(0, stageFx.slowLeft - real);
    // Ease out of slow motion rather than snapping back.
    const target = stageFx.slowLeft > 0 ? stageFx.slowScale : 1;
    stageFx.timeScale += (target - stageFx.timeScale) * Math.min(1, real * (stageFx.slowLeft > 0 ? 18 : 5));
    stageFx.shake *= Math.exp(-real * 7);
    if (!stageFx.paused) stageFx.clock += real * stageFx.timeScale;
  }, -1);
}

/**
 * useFrame with game time: dt is scaled by slow motion, capped so a dropped frame can't tunnel through things,
 * and zero while paused. `t` is the round clock.
 */
export function useGameFrame(cb: (dt: number, t: number) => void, priority = 0) {
  const ref = useRef(cb);
  useLayoutEffect(() => { ref.current = cb; });
  useFrame((_, dt) => {
    if (stageFx.paused) return;
    ref.current(Math.min(dt, 1 / 20) * stageFx.timeScale, stageFx.clock);
  }, priority);
}
