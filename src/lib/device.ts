"use client";

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

/** Canvas settings for the current device. */
export function canvasQuality() {
  const low = isLowPower();
  return { dpr: (low ? [1, 1.5] : [1, 2]) as [number, number], shadows: !low };
}
