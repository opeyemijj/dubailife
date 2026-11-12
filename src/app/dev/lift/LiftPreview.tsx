"use client";

import { useEffect, useState } from "react";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS } from "@/lib/furniture";

export function LiftPreview() {
  const [level, setLevel] = useState(0);
  const [call, setCall] = useState<{ n: number } | undefined>(undefined);
  const [focus, setFocus] = useState<{ n: number; at: [number, number] } | undefined>(undefined);
  useEffect(() => { const t = setTimeout(() => setFocus({ n: 1, at: [3.2, -3.2] }), 4000); return () => clearTimeout(t); }, []);
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier="villa" view={typeof window !== "undefined" && window.location.search.includes("above") ? "above" : "inside"} homeStyle={HOUSING_CONFIGS.villa.finish} level={level} onChangeLevel={setLevel} liftCall={call} focus={focus} look={{ gender: "man" }} />
      <button onClick={() => setCall((c) => ({ n: (c?.n ?? 0) + 1 }))} className="fixed left-3 top-3 z-50 h-11 px-4 rounded-full bg-amber-400 font-black">🛗 Take the lift</button>
      <div className="fixed right-3 top-3 z-50 rounded-full bg-black/70 px-3 py-2 text-xs font-black text-white" data-level={level}>Floor {level === 0 ? "G" : level}</div>
    </main>
  );
}
