"use client";

// A page in a city you aren't in (an address typed in, an old link, a friend's party in the other city): instead of
// the page, a card saying where you are and how to get there, by air from your city's airport (lib/city/presence).

import Link from "next/link";
import { CITIES, type CityId } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";
import { SmallLoader } from "@/components/GameLoadingScreen";

/** Shows `children` only when you're in `city`. */
export function CityGate({ city, what, children }: { city: CityId; what?: string; children: React.ReactNode }) {
  const here = useCurrentCity();
  // The saved location already agrees: show the page while the server confirms (it nearly always will).
  if (here.city === city) return <>{children}</>;
  if (!here.ready) return <SmallLoader label={`Checking where you are`} />;
  return <AwayCard here={here.city} there={city} what={what} />;
}

/** "You're in Dubai. Abu Dhabi is a flight away." */
export function AwayCard({ here, there, what }: { here: CityId; there: CityId; what?: string }) {
  const from = CITIES[here], to = CITIES[there];
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-sky-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/10 backdrop-blur border border-white/15 p-6 text-center shadow-2xl">
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-2xl font-black leading-tight">You&apos;re in {from.name}</h1>
        <p className="mt-2 text-sm text-sky-100">
          {what ? <>{what} is in {to.name}. </> : null}
          {to.name} is a flight away: go to {from.name}&apos;s airport, check in with Dubai Life Airways and fly there.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href={`${from.path}?to=${from.airport}`} className="h-12 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center active:scale-95">
            🛫 Go to the airport
          </Link>
          <Link href={from.path} className="h-12 rounded-full bg-white/15 font-bold flex items-center justify-center active:scale-95">
            {from.icon} Back to the {from.name} map
          </Link>
        </div>
      </div>
    </main>
  );
}
