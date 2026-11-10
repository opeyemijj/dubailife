"use client";

// On-screen pieces every attraction game uses over its 3D stage: the 3-2-1 countdown, score and stat pills,
// meters (health, stamina, patience…), and the pop-up callouts for combos and big moments.

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 3, 2, 1, GO! Calls onDone once GO has shown. */
export function Countdown({ onDone, from = 3, go = "GO!" }: { onDone: () => void; from?: number; go?: string }) {
  const [n, setN] = useState(from);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    if (n < 0) { done.current(); return; }
    const id = setTimeout(() => setN((x) => x - 1), n === 0 ? 550 : 750);
    return () => clearTimeout(id);
  }, [n]);
  if (n < 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <span key={n} className="text-white font-black text-8xl drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)] animate-[arcade-pop_0.7s_ease-out]">
        {n === 0 ? go : n}
      </span>
    </div>
  );
}

/** A small rounded read-out: an icon, a label and a value. */
export function Pill({ icon, label, value, tone = "dark" }: { icon?: ReactNode; label?: string; value: ReactNode; tone?: "dark" | "gold" }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-md text-xs font-black shadow ${tone === "gold" ? "bg-amber-400/90 text-amber-950" : "bg-black/55 text-white"}`}>
      {icon && <span className="text-sm leading-none">{icon}</span>}
      {label && <span className="opacity-70 font-bold uppercase tracking-wider text-[10px]">{label}</span>}
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** A horizontal meter, 0 to 1 (health, stamina, patience, coverage). `flip` fills from the right. */
export function Meter({ value, label, color = "#22c55e", flip = false, warnBelow = 0.25 }: { value: number; label?: string; color?: string; flip?: boolean; warnBelow?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const low = v <= warnBelow;
  return (
    <div className="w-full">
      {label && <div className={`text-[10px] font-black uppercase tracking-wider text-white/80 mb-0.5 ${flip ? "text-right" : ""}`}>{label}</div>}
      <div className="h-3 rounded-full bg-black/50 border border-white/15 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${low ? "animate-pulse" : ""} ${flip ? "ml-auto" : ""}`}
          style={{ width: `${v * 100}%`, background: low ? "#ef4444" : color }}
        />
      </div>
    </div>
  );
}

export interface Callout { id: number; text: string; tone?: "good" | "great" | "bad" | "info" }
let calloutId = 0;

/** Big centred callouts that pop and fade ("PERFECT!", "x5 COMBO", "KNOCKDOWN!"). Push with useCallouts().push. */
export function useCallouts() {
  const [items, setItems] = useState<Callout[]>([]);
  const push = (text: string, tone: Callout["tone"] = "good") => {
    const id = ++calloutId;
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 1100);
  };
  const node = (
    <div className="absolute inset-x-0 top-[28%] flex flex-col items-center gap-1 pointer-events-none z-20">
      {items.map((c) => (
        <span
          key={c.id}
          className={`font-black text-3xl sm:text-4xl tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)] animate-[arcade-pop_1.1s_ease-out_forwards] ${
            c.tone === "great" ? "text-amber-300" : c.tone === "bad" ? "text-rose-400" : c.tone === "info" ? "text-sky-200" : "text-emerald-300"
          }`}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
  return { push, node };
}

/** Stars out of three. */
export function Stars({ n, size = "text-4xl" }: { n: number; size?: string }) {
  return (
    <div className={`flex gap-1 ${size}`} aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "opacity-25 grayscale"} style={{ animationDelay: `${i * 140}ms` }}>
          ⭐
        </span>
      ))}
    </div>
  );
}
