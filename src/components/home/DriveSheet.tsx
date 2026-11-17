"use client";

// Getting into your car at home: where to? Picking a place opens the trip on the map with your car (Drive).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { PLACES } from "@/lib/city/places";
import type { Car } from "@/lib/cars";

export function DriveSheet({ car, onClose }: { car: Car | null; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return PLACES.filter((p) => !t || p.name.toLowerCase().includes(t)).slice(0, 40);
  }, [q]);
  return (
    <div className="fixed inset-0 z-[210] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Drive somewhere" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-black">🚗 Where to?</p>
            <p className="text-xs text-slate-500">{car ? `In your ${car.make} ${car.model}` : "In your car"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <label className="flex items-center gap-2 h-11 rounded-xl bg-slate-50 border border-slate-200 px-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Dubai" className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold" autoFocus />
        </label>
        {list.map((p) => (
          <button key={p.id} onClick={() => router.push(`/explore?to=${encodeURIComponent(p.id)}`)} className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-left">
            <span className="text-xl">📍</span>
            <span className="flex-1 min-w-0 font-black text-sm truncate">{p.name}</span>
            <span className="text-xs font-black text-emerald-700">Drive ›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
