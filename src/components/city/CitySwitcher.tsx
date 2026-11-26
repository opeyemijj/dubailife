"use client";

// The cities, under the top bar on the maps: Dubai, Abu Dhabi, and the ones on the way (Saudi Arabia, Qatar). Your
// city is lit. Another open city is a flight away (go to your airport and book one); the coming ones say so.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, CITY_LIST, COMING_CITIES, type CityId } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { airportOf } from "@/lib/flights";
import { countryOf, visaCountryFor } from "@/lib/visas";

type Picked = { kind: "fly"; to: CityId } | { kind: "soon"; name: string; icon: string; city: string } | null;

export function CitySwitcher() {
  const router = useRouter();
  const here = useCurrentCity();
  const [picked, setPicked] = useState<Picked>(null);
  const from = CITIES[here.city];

  return (
    <>
      {/* One row that always fits a phone (down to 320 px): equal buttons, the flag over a short name, 48 px tall;
          on wider screens the flag beside the full name. */}
      <nav aria-label="Cities" style={{ gridTemplateColumns: `repeat(${CITY_LIST.length + COMING_CITIES.length}, minmax(0, 1fr))` }}
        className="max-w-lg mx-auto mt-1.5 pointer-events-auto grid gap-0.5 sm:gap-1 p-1 rounded-[22px] sm:rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-[0_6px_20px_rgba(15,23,42,0.18)]">
        {CITY_LIST.map((c) => {
          const mine = c.id === here.city;
          return (
            <button key={c.id} aria-current={mine ? "true" : undefined} aria-label={mine ? `${c.name}, you're here` : `${c.name}: fly there`}
              onClick={() => { gameAudio.playClickSound(); if (!mine) setPicked({ kind: "fly", to: c.id }); }}
              className={`relative h-12 sm:h-10 min-w-0 rounded-[18px] sm:rounded-full px-0.5 sm:px-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 text-[10.5px] sm:text-sm font-black leading-tight active:scale-95 transition-transform ${mine ? "bg-emerald-600 text-white shadow" : "text-slate-800 hover:bg-slate-100"}`}>
              <span className="text-lg sm:text-base leading-none shrink-0">{c.icon}</span>
              <span className="max-w-full truncate">{c.name}</span>
              {mine && <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
          );
        })}
        {COMING_CITIES.map((c) => (
          <button key={c.id} aria-label={`${c.name}: coming soon`}
            onClick={() => { gameAudio.playClickSound(); setPicked({ kind: "soon", name: c.name, icon: c.icon, city: c.city }); }}
            className="relative h-12 sm:h-10 min-w-0 rounded-[18px] sm:rounded-full px-0.5 sm:px-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 text-[10.5px] sm:text-sm font-black leading-tight text-slate-500 hover:bg-slate-100 active:scale-95 transition-transform">
            <span className="text-lg sm:text-base leading-none shrink-0 opacity-80">{c.icon}</span>
            <span className="max-w-full truncate"><span className="sm:hidden">{c.short}</span><span className="hidden sm:inline">{c.name}</span></span>
            <span className="absolute top-0.5 right-0.5 sm:-top-1 px-1 rounded-full bg-amber-400 text-slate-950 text-[7.5px] sm:text-[8px] font-black leading-[12px]">SOON</span>
          </button>
        ))}
      </nav>

      {/* At the top of the page (not inside the top bar), so it sits above the bottom menu, the map's chips and
          every banner and notification. */}
      {picked && <ModalPortal>
        <div className="fixed inset-0 z-[300] pointer-events-auto flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/50" onClick={() => setPicked(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white text-slate-900 px-5 pt-3 sm:pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl">
            <div className="sm:hidden mx-auto mb-3 w-10 h-1.5 rounded-full bg-slate-200" aria-hidden />
            {picked.kind === "fly" ? (
              <>
                <div className="text-5xl">✈️</div>
                <h2 className="mt-2 text-xl font-black">{CITIES[picked.to].name} is a flight away</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Go to {airportOf(from.id).code} {airportOf(from.id).terminal}, check in with Dubai Life Airways and fly to {CITIES[picked.to].name}.
                </p>
                {visaCountryFor(picked.to) && (
                  <p className="mt-2 text-sm font-bold text-[#8a1538]">{countryOf(visaCountryFor(picked.to)!).flag} {CITIES[picked.to].name} is in {countryOf(visaCountryFor(picked.to)!).name}: you&apos;ll need a visa. Apply at the check-in counter, or now.</p>
                )}
                {visaCountryFor(picked.to) && (
                  <button onClick={() => { const c = visaCountryFor(picked.to)!; setPicked(null); router.push(`/visa/${c}`); }}
                    className="mt-3 w-full h-12 rounded-full bg-[#8a1538] text-white font-black active:scale-95">🛂 Apply for the visa</button>
                )}
                <button onClick={() => { const to = picked.to; setPicked(null); try { sessionStorage.setItem("fly-to", to); } catch { /* storage blocked */ } router.push(`${from.path}?to=${from.airport}`); }}
                  className="mt-4 w-full h-14 rounded-full bg-amber-400 text-base text-slate-950 font-black active:scale-95">🛫 Go to the airport</button>
              </>
            ) : (
              <>
                <div className="text-5xl">{picked.icon}</div>
                <h2 className="mt-2 text-xl font-black">{picked.name} is coming soon</h2>
                <p className="mt-1 text-sm text-slate-600">{picked.city} is being built. Soon you&apos;ll fly there from the airport with Dubai Life Airways, like Abu Dhabi.</p>
              </>
            )}
            <button onClick={() => setPicked(null)} className="mt-2 w-full h-12 rounded-full bg-slate-100 font-bold active:scale-95">{picked.kind === "fly" ? "Not now" : "OK"}</button>
          </div>
        </div>
      </ModalPortal>}
    </>
  );
}
