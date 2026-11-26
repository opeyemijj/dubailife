"use client";

// The column of round icon buttons down the left of the map: the goal (components/goals/NextStep), then the daily
// Vault, an expiring visa, a health or police alert and a live event (components/layout/BottomNav MapRail). Each is
// one icon with a badge, so the map stays clear; tapping it opens what it's about. Under the Search chip, below the
// cities strip.

import type { ReactNode } from "react";

/** The top of the n-th button in the column (0 is the goal). */
export const railTop = (n: number) => `calc(max(11.1rem, env(safe-area-inset-top) + 10.5rem) + ${n * 3.5}rem)`;

/** One round button in the column: an icon, a badge in its corner, a glow when it wants you. */
export function RailButton({ n, icon, badge, label, tone = "bg-white text-slate-900", alert = false, onClick }: {
  n: number; icon: ReactNode; badge?: string | null; label: string; tone?: string; alert?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={{ top: railTop(n) }}
      className={`fixed left-3 z-[58] w-12 h-12 rounded-full shadow-xl border border-white/70 flex items-center justify-center text-2xl active:scale-90 transition-transform pointer-events-auto ${tone} ${alert ? "ring-4 ring-amber-300/70 animate-pulse" : ""}`}>
      <span className="leading-none">{icon}</span>
      {badge && (
        <span className="absolute -top-1 -right-1.5 min-w-[22px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white tabular-nums">{badge}</span>
      )}
    </button>
  );
}
