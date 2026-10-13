"use client";

// "Install the app": keeps the browser's install prompt (Android / desktop Chrome and Edge) so a
// button can show it later, and works out when to show iPhone's Add-to-Home-Screen steps instead.

import { useSyncExternalStore } from "react";

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; notify(); });
  window.addEventListener("appinstalled", () => { installed = true; deferred = null; notify(); });
}

const standalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
// iPhones and iPads (iPadOS reports itself as a Mac with touch) have no install prompt.
const ios = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

type State = "installed" | "prompt" | "ios" | "unavailable";
function compute(): State {
  if (installed || standalone()) return "installed";
  if (deferred) return "prompt";
  if (ios()) return "ios";
  return "unavailable";
}

export function useInstallState(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    compute,
    () => "unavailable",
  );
}

/** Shows the browser's install prompt. Resolves true if the person installed. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}
