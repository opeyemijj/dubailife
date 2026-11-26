"use client";

// Home, in a city where you have no home (you flew to Abu Dhabi; your homes are in Dubai): where to sleep here (your
// hotel suite, or a hotel to book), finding a home here, and the flight back to the homes you have.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CITIES, cityOfPlace, type CityId } from "@/lib/city/cities";
import { getEntity } from "@/lib/city/geo";
import { myStay, type Stay } from "@/lib/hotels";
import type { FlatView } from "@/lib/city/flats";

export function AwayFromHome({ city, homes }: { city: CityId; homes: FlatView[] }) {
  const here = CITIES[city];
  const [stay, setStay] = useState<Stay | null>(null);
  useEffect(() => {
    let live = true;
    void myStay().then((r) => { if (live) setStay(r.data && cityOfPlace(r.data.place_id) === city && Date.parse(r.data.check_out_by) > Date.now() ? r.data : null); });
    return () => { live = false; };
  }, [city]);
  // Where my homes are (the home I started in is in Dubai).
  const homeCities = [...new Set(["dubai" as CityId, ...homes.map((f) => cityOfPlace(f.building_id))])].filter((c) => c !== city);
  const back = CITIES[homeCities[0] ?? "dubai"];
  return (
    <div className="fixed inset-0 z-[45] bg-gradient-to-b from-sky-800 via-slate-900 to-slate-950 text-white overflow-y-auto pointer-events-auto touch-auto">
      <div className="max-w-md mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-32 space-y-4">
        <header className="text-center pt-6">
          <div className="text-5xl">{here.icon}</div>
          <h1 className="mt-2 text-2xl font-black leading-tight">You&apos;re in {here.name}</h1>
          <p className="mt-1 text-sm text-sky-100">Your home is in {back.name}. Stay in a hotel here, find a home of your own, or fly back.</p>
        </header>

        {stay ? (
          <Link href={`/hotel/${stay.id}`} className="block rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-300 text-slate-950 p-4 active:scale-[0.99]">
            <p className="text-[10px] font-black uppercase tracking-widest">Your stay</p>
            <p className="text-lg font-black leading-tight">{stay.hotel_name}</p>
            <p className="text-sm font-bold">Room {stay.room} · go up to your suite ›</p>
          </Link>
        ) : (
          <Link href="/hotels" className="block rounded-3xl bg-white/10 border border-white/15 p-4 active:scale-[0.99]">
            <p className="text-lg font-black">🏨 Book a hotel in {here.name}</p>
            <p className="text-sm text-white/70">A suite for a night or a week, with room service.</p>
          </Link>
        )}

        {city === "abu-dhabi" && (
          <Link href="/abu-dhabi/passport" className="block rounded-3xl bg-teal-800/60 border border-amber-300/30 p-4 active:scale-[0.99]">
            <p className="text-lg font-black">🛂 Your Abu Dhabi Passport</p>
            <p className="text-sm text-white/70">Collect a stamp at every landmark: rewards at 4, 8, 12 and 16 stamps.</p>
          </Link>
        )}

        <Link href={`${here.path}?filter=towers`} className="block rounded-3xl bg-white/10 border border-white/15 p-4 active:scale-[0.99]">
          <p className="text-lg font-black">🔑 Find a home in {here.name}</p>
          <p className="text-sm text-white/70">Rent or buy a flat, a villa or a townhouse here, and it&apos;s home whenever you&apos;re in {here.name}.</p>
        </Link>

        {homes.length > 0 && (
          <section className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-2">Your homes</p>
            <ul className="space-y-1.5">
              {homes.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{f.property_type}{/^\d/.test(f.unit) ? ` ${f.unit}` : ""} · {getEntity(f.building_id)?.name ?? f.building_id}</span>
                  <span className="shrink-0 text-xs font-bold text-sky-200">✈️ {CITIES[cityOfPlace(f.building_id)].name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href={`${here.path}?to=${here.airport}`} className="h-12 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center active:scale-95">
          🛫 Fly home to {back.name}
        </Link>
      </div>
    </div>
  );
}
