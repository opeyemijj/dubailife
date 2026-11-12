"use client";

import { useEffect, useState } from "react";

// A rough "is this a phone or a modest device?" check, used to render 3D more lightly
// (lower resolution, no shadows) so taps stay responsive.

let cached: boolean | null = null;

export function isLowPower(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  // A small window only counts on touch screens: a short laptop browser window isn't a phone.
  const fine = window.matchMedia?.("(pointer: fine)").matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700 && !fine;
  const cores = navigator.hardwareConcurrency ?? 8;
  cached = coarse || small || cores <= 4;
  return cached;
}

let webglCached: boolean | null = null;

/** Checks if WebGL is supported and available in the current browser/webview context. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (webglCached !== null) return webglCached;
  try {
    const canvas = document.createElement("canvas");
    // Suppress context creation console error events during availability probe
    const suppressErr = (e: Event) => {
      e.preventDefault?.();
      e.stopPropagation?.();
    };
    canvas.addEventListener("webglcontextcreationerror", suppressErr, false);

    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });

    canvas.removeEventListener("webglcontextcreationerror", suppressErr);
    webglCached = !!gl;
    return webglCached;
  } catch {
    webglCached = false;
    return false;
  }
}

/** Reset WebGL cache for retry attempts */
export function resetWebGLCache(): void {
  webglCached = null;
}

const ECO_MODE_KEY = "dl_eco_battery_saver_v1";

/** Check if Battery Saver / Eco Mode is active */
export function isEcoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ECO_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Set Battery Saver / Eco Mode */
export function setEcoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ECO_MODE_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("dl:eco-mode-changed", { detail: { enabled } }));
  } catch {}
}

/** Toggle Battery Saver / Eco Mode */
export function toggleEcoMode(): boolean {
  const next = !isEcoMode();
  setEcoMode(next);
  return next;
}

/** Hook to track document visibility (screen off / app in background) */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => (typeof document !== "undefined" ? document.visibilityState === "visible" : true));
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handle = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);
  return visible;
}

/** Canvas settings for the current device and energy mode. */
export function canvasQuality() {
  const low = isLowPower();
  const eco = isEcoMode();
  // On high-density Retina/OLED displays (300-460 PPI), rendering above 1.5x gives zero noticeable
  // sharpness benefit to human eyes, but increases fragment shader calculations by up to 77%.
  // Clamping DPR to 1.5 (or 1.25 in Eco/Low-power mode) preserves razor-sharp 3D models while
  // dramatically reducing GPU heating, battery drain, and thermal throttling.
  const maxDpr = eco ? 1.25 : (low ? 1.35 : 1.5);
  return {
    dpr: [1, maxDpr] as [number, number],
    shadows: !low && !eco,
    shadowMapSize: (eco ? [512, 512] : low ? [1024, 1024] : [1024, 1024]) as [number, number],
    powerPreference: (eco || low ? "low-power" : "default") as "low-power" | "default" | "high-performance",
    eco,
  };
}

// ---------------------------------------------------------------- how strong this device is

let gpuCached: string | null = null;
/** The graphics chip's name, where the browser says ("Apple GPU", "Adreno (TM) 640", "Mali-G52"…), else "". */
export function gpuName(): string {
  if (gpuCached !== null) return gpuCached;
  gpuCached = "";
  if (typeof document === "undefined") return gpuCached;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    gpuCached = (ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "") || "";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { /* blocked */ }
  return gpuCached;
}

/**
 * A rough strength score for this device (about 4 for an old budget phone to 20+ for a recent iPhone or a laptop
 * with a proper graphics card), from its processor cores, memory and graphics chip. Used to pick which phone runs
 * a live match (the stronger) and, with what the frame rate does, the 3D quality tier.
 */
export function deviceScore(): number {
  if (typeof navigator === "undefined") return 10;
  const cores = Math.min(12, navigator.hardwareConcurrency ?? 4);
  const memory = Math.min(8, (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4);
  const g = gpuName().toLowerCase();
  let chip = 0;
  if (/apple|nvidia|geforce|radeon|rtx|arc\b|m1|m2|m3|m4/.test(g)) chip = 6;
  else if (/adreno.*(7\d\d|6[4-9]\d)|mali-g(7[1-9]|[89]\d|7\d\d)|immortalis|xclipse/.test(g)) chip = 4;
  else if (/adreno.*(6[0-3]\d|5[3-9]\d)|mali-g(5\d|6\d)|powervr|intel/.test(g)) chip = 2;
  else if (/adreno.*([1-4]\d\d|50\d|51\d)|mali-(4|t)|swiftshader|llvmpipe|software/.test(g)) chip = -2;
  return Math.round(cores * 0.8 + memory * 1.2 + chip);
}
