"use client";

// Loading indicators. Everywhere in the game they're a small pill at the top of the screen that never
// blocks what's underneath — the page stays visible and usable while things load.

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/** What's loading, in friendly words, from the asset URL. */
function describe(item: string) {
  if (/rocketbox\/anims/.test(item)) return "Rehearsing the moves";
  if (/rocketbox|avatar/.test(item)) return "Dressing the citizens";
  if (/furniture/.test(item)) return "Furnishing the rooms";
  if (/props/.test(item)) return "Stocking the shelves";
  return null;
}

/**
 * The pill itself. `progress` (0–100) shows a bar; omit it for a plain spinner.
 * `fixed` pins it to the viewport; otherwise it sits at the top of its positioned parent.
 */
export function LoadingPill({ label, progress, detail, fixed = true, fading = false }: { label: string; progress?: number; detail?: string | null; fixed?: boolean; fading?: boolean }) {
  const pct = progress === undefined ? null : Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`${fixed ? "fixed" : "absolute"} top-16 left-1/2 -translate-x-1/2 z-[150] pointer-events-none transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md text-white rounded-full pl-2 pr-3.5 py-1.5 shadow-xl">
        <span className="w-5 h-5 shrink-0 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        <div className="min-w-[140px]">
          <div className="text-[11px] font-black leading-tight truncate max-w-[240px]">{label}{detail ? <span className="font-semibold text-white/70"> · {detail}</span> : null}</div>
          {pct !== null && <div className="mt-1 h-1 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${Math.max(6, pct)}%` }} /></div>}
        </div>
        {pct !== null && <span className="text-[10px] font-mono font-bold text-white/80">{pct}%</span>}
      </div>
    </div>
  );
}

/** For short waits and page loads: just the pill. */
export function SmallLoader({ label = "Loading" }: { label?: string }) {
  return <LoadingPill label={label} />;
}

/**
 * Shows progress while a 3D scene's models download, then fades away. Doesn't appear when everything
 * is already cached. Place it next to (not inside) the <Canvas>; it sits at the top of the parent.
 */
export function SceneLoadingOverlay({ label }: { label?: string }) {
  const { active, progress, item } = useProgress();
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");

  useEffect(() => {
    if (active) return;
    // Wait a beat: Suspense may start the next download right after this one finishes.
    const settle = setTimeout(() => setPhase((p) => (p === "loading" ? "fading" : p)), 450);
    return () => clearTimeout(settle);
  }, [active]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 500);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;
  return <LoadingPill fixed={false} label={label ?? "Loading"} detail={describe(item ?? "")} progress={active ? progress : 100} fading={phase === "fading"} />;
}

/**
 * Fullscreen luxury splash loader shown until the entire 3D city / UI finishes rendering.
 */
export function FullGameLoadingScreen({ 
  ready = false, 
  title = "Come To Dubai",
  subtitle = "Entering the city..." 
}: { 
  ready?: boolean; 
  title?: string;
  subtitle?: string;
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + Math.floor(Math.random() * 12) + 6;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ready) {
      setProgress(100);
      const timer = setTimeout(() => setVisible(false), 550);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#d6bc8a] transition-opacity duration-500 ease-out ${
        ready ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Luxury gold & sand gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e7d2aa]/80 via-[#d6bc8a] to-[#c5a669] pointer-events-none" />

      {/* Center Branded Loader Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-2xl border border-white/60 flex items-center justify-center mb-5 ring-8 ring-white/20 animate-pulse">
          <span className="text-3xl sm:text-4xl">👑</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
          {title}
        </h1>
        <p className="text-xs sm:text-sm font-bold text-slate-700 mb-6">
          {subtitle}
        </p>

        {/* Luxury Progress Bar */}
        <div className="w-64 sm:w-72 h-2 rounded-full bg-slate-900/15 overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-64 sm:w-72 mt-2 text-[10px] sm:text-[11px] font-bold text-slate-600 font-mono">
          <span>Loading districts & skyline</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
