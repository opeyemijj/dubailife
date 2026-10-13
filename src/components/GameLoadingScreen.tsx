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
