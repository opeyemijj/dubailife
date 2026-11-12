"use client";

// Performance numbers for each 3D scene on screen (frame rate, slowest frames, draw calls, triangles, graphics
// memory), for the measuring overlay (components/perf). Off unless asked for: ?perf=1 on any page turns it on
// (remembered on this device, ?perf=0 turns it off), so it can be used on a real phone, on the live site too.

import { useSyncExternalStore } from "react";
import { deviceScore, gpuName } from "@/lib/device";

export interface SceneStats {
  scene: string;
  /** Frames a second over the last second, and the slowest frame in it (ms). */
  fps: number; worstMs: number;
  /** What the last frame drew. */
  calls: number; triangles: number;
  /** Graphics memory in use: geometries and textures held. */
  geometries: number; textures: number;
  /** Device pixel ratio the scene renders at, and its size in pixels. */
  dpr: number; width: number; height: number;
  at: number;
}

const KEY = "dl_perf";
let enabled: boolean | null = null;
export function perfEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("perf");
    if (q === "1") localStorage.setItem(KEY, "1");
    if (q === "0") localStorage.removeItem(KEY);
    enabled = localStorage.getItem(KEY) === "1";
  } catch { enabled = false; }
  return enabled;
}

const scenes = new Map<string, SceneStats>();
const listeners = new Set<() => void>();
let snapshot: SceneStats[] = [];
export function reportScene(s: SceneStats) {
  scenes.set(s.scene, s);
  // Scenes not heard from for 3 s have closed.
  for (const [k, v] of scenes) if (s.at - v.at > 3000) scenes.delete(k);
  snapshot = [...scenes.values()];
  (window as unknown as { __perf?: unknown }).__perf = { device: { score: deviceScore(), gpu: gpuName() }, scenes: snapshot };
  listeners.forEach((l) => l());
}
export const usePerfScenes = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot, () => snapshot);
