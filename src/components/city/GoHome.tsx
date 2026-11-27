"use client";

// Going home from wherever you are, the way you go anywhere else: your home in this city opens its trip on the map
// (walk, taxi, or your car in Dubai: CityNavigator). A starter home that isn't on the map is straight home; a home
// in another city is a flight away.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { myFlats, type FlatView } from "@/lib/city/flats";
import { CITIES, cityOfPlace } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";
import { gameAudio } from "@/utils/gameAudio";

export function GoHome({ onGo }: { onGo?: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const { city } = useCurrentCity();
  const [flats, setFlats] = useState<FlatView[] | null>(null);
  useEffect(() => {
    let live = true;
    if (citizen?.id) void myFlats(citizen.id).then((f) => { if (live) setFlats(f); });
    return () => { live = false; };
  }, [citizen?.id]);
  if (!citizen || flats === null) return null;

  const mine = flats.filter((f) => f.owner_id === citizen.id || f.tenant_id === citizen.id);
  const here = mine.find((f) => cityOfPlace(f.building_id) === city);
  const elsewhere = mine.find((f) => cityOfPlace(f.building_id) !== city);
  const go = (href: string) => { gameAudio.playClickSound(); onGo?.(); router.push(href); };

  if (here) {
    return (
      <button onClick={() => go(`${CITIES[city].path}?to=${encodeURIComponent(here.building_id)}`)} className="w-full flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-left">
        <span className="text-2xl">🏠</span>
        <span className="flex-1 min-w-0"><span className="block font-black truncate">Go home</span><span className="block text-xs text-slate-500">{city === "dubai" ? "Walk, take a taxi or drive your car" : "Walk or take a taxi"}</span></span>
        <span className="text-xs font-black text-emerald-700">🚕 🚗 ›</span>
      </button>
    );
  }
  if (elsewhere) {
    const there = cityOfPlace(elsewhere.building_id);
    return (
      <button onClick={() => go(`/fly?to=${there}`)} className="w-full flex items-center gap-3 rounded-2xl bg-sky-50 border border-sky-200 px-3 py-2.5 text-left">
        <span className="text-2xl">✈️</span>
        <span className="flex-1 min-w-0"><span className="block font-black truncate">Go home to {CITIES[there].name}</span><span className="block text-xs text-slate-500">Your home is in {CITIES[there].name}: take a taxi to the airport and fly back</span></span>
        <span className="text-xs font-black text-sky-700">›</span>
      </button>
    );
  }
  // A starter home (not on the map) in Dubai: straight home.
  if (city === "dubai" && citizen.home) {
    return (
      <button onClick={() => go("/home")} className="w-full flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-left">
        <span className="text-2xl">🏠</span>
        <span className="flex-1 min-w-0"><span className="block font-black truncate">Go home</span><span className="block text-xs text-slate-500">Back to your place</span></span>
        <span className="text-xs font-black text-emerald-700">›</span>
      </button>
    );
  }
  return null;
}
