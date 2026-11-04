"use client";

// The map's middle-right bar (user, 2026-11-04: keep the screen clean, put things in icons on the middle right):
//  📍 Places: a popup to fly to an area (Downtown, Palm, Marina, Academic City…) and to show one kind of place.
//  🔥 Hotspot: where people are right now (it used to be the orange pill above the bottom bar), with Go.
// One popup open at a time; tapping the map or the icon again closes it.

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { gameAudio } from "@/utils/gameAudio";
import { usePresentCitizens } from "@/lib/presence";
import { gatherings, SLOT_MS } from "@/lib/locals";
import { PLACES } from "@/lib/city/places";

export interface District { id: string; icon: string; label: string; go: () => void }
export interface MapFilter { id: string; label: string; icon: ReactNode }

export function MapSideBar({ districts, filters, activeFilter, onFilter }: {
  districts: District[];
  filters?: MapFilter[];
  activeFilter?: string;
  onFilter?: (id: string) => void;
}) {
  const [open, setOpen] = useState<"places" | "hotspot" | null>(null);
  const hot = useHotspot();
  const router = useRouter();
  const toggle = (k: "places" | "hotspot") => { gameAudio.playClickSound(); setOpen((o) => (o === k ? null : k)); };
  const filtered = !!activeFilter && activeFilter !== "all";

  return (
    <>
      {open && <button aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(null)} />}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 pointer-events-auto">
        <button onClick={() => toggle("places")} aria-label="Places" aria-expanded={open === "places"}
          className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 ${open === "places" ? "bg-emerald-600 text-white" : "bg-white/95 text-emerald-700"}`}>
          <MapPin className="w-6 h-6" />
          {filtered && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-white" />}
        </button>
        <button onClick={() => toggle("hotspot")} aria-label={`Hotspot: ${hot.name}, ${hot.count} here`} aria-expanded={open === "hotspot"}
          className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-95 ${open === "hotspot" ? "bg-orange-500" : "bg-gradient-to-br from-amber-400 to-orange-500"}`}>
          🔥
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">{hot.count}</span>
        </button>
      </div>

      {open === "places" && (
        <div role="dialog" aria-label="Places" className="fixed right-[4.25rem] top-1/2 -translate-y-1/2 z-40 w-[min(17rem,calc(100vw-5.5rem))] max-h-[min(70dvh,32rem)] overflow-y-auto rounded-3xl bg-white/97 shadow-2xl p-3 text-slate-900 pointer-events-auto">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Go to an area</p>
            <button onClick={() => setOpen(null)} aria-label="Close places" className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {districts.map((d) => (
              <button key={d.id} onClick={() => { setOpen(null); d.go(); }}
                className="h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-left text-xs font-black flex items-center gap-1.5">
                <span className="text-base">{d.icon}</span><span className="truncate">{d.label}</span>
              </button>
            ))}
          </div>
          {filters && onFilter && (
            <>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 mt-3 mb-1.5">Show on the map</p>
              <div className="flex flex-col gap-1">
                {filters.map((f) => {
                  const on = (activeFilter ?? "all") === f.id;
                  return (
                    <button key={f.id} onClick={() => { gameAudio.playClickSound(); onFilter(on && f.id !== "all" ? "all" : f.id); }}
                      className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 ${on ? "bg-emerald-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-700"}`}>
                      {f.icon}<span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {open === "hotspot" && (
        <div role="dialog" aria-label="Hotspot" className="fixed right-[4.25rem] top-1/2 -translate-y-1/2 z-40 w-[min(16rem,calc(100vw-5.5rem))] rounded-3xl bg-slate-950/95 text-white shadow-2xl p-3.5 pointer-events-auto">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">🔥 Where people are</p>
          <p className="mt-1 font-black text-lg leading-tight">{hot.name}</p>
          <p className="text-xs text-slate-300">{hot.count} here now · 1.5× crowd bonus</p>
          <button onClick={() => { gameAudio.playClickSound(); setOpen(null); router.push(hot.href); }}
            className="mt-3 w-full h-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm active:scale-95">
            Go there ›
          </button>
        </div>
      )}
    </>
  );
}

/** The busiest venue right now: where real players are, or the Locals' happy-hour hotspot. */
export function useHotspot() {
  const present = usePresentCitizens();
  // The Locals' hotspot changes every slot.
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / SLOT_MS));
  useEffect(() => {
    const id = setInterval(() => setSlot(Math.floor(Date.now() / SLOT_MS)), 30_000);
    return () => clearInterval(id);
  }, []);
  const top = gatherings(slot)[0];
  const counts: Record<string, number> = {};
  for (const p of present) {
    if (p.venuePath && p.venuePath.startsWith("/place/")) {
      counts[p.venuePath] = (counts[p.venuePath] ?? 0) + 1;
    } else if (p.placeId) {
      const place = PLACES.find((x) => x.id === p.placeId);
      const first = place?.venues.find((v) => !v.comingSoon);
      if (place && first) counts[`/place/${place.id}/${first.id}`] = (counts[`/place/${place.id}/${first.id}`] ?? 0) + 1;
    }
  }
  let href = top ? `/place/${top.place.id}/${top.venue.id}` : "/explore";
  let name = top?.venue.name ?? "Dubai Mall";
  let live = 0;
  for (const [vp, c] of Object.entries(counts)) {
    if (c > live) {
      live = c;
      href = vp;
      const [, , pid, vid] = vp.split("/");
      const vn = PLACES.find((x) => x.id === pid)?.venues.find((v) => v.id === vid);
      if (vn) name = vn.name;
    }
  }
  // The Locals hosting there (5) plus real players.
  return { href, name, count: live + 5 };
}
