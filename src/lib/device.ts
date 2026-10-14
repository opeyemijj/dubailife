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

/** Canvas settings for the current device. */
export function canvasQuality() {
  const low = isLowPower();
  return { dpr: (low ? [1, 1.5] : [1, 2]) as [number, number], shadows: !low };
}
