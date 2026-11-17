"use client";

// /drive?legs=szr:downtown:marina,palm:gateway:trunk&to=<place>&car=<car id>&plate=<plate> : driving there, leg by
// leg (DriveScene), then in through the door of where you were going. If a road can't load, straight there.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlace } from "@/lib/city/places";
import { corridorName, exitName, loadCorridor, parseLegs, placeHref, type Corridor } from "@/lib/city/drives";
import { gameAudio } from "@/utils/gameAudio";
import { DriveScene } from "./DriveScene";

export function DrivePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const legs = parseLegs(sp.get("legs"));
  const to = sp.get("to") ?? "";
  const carId = sp.get("car") ?? "nissan-sunny";
  const plate = sp.get("plate") ?? "DUBAI";
  const destination = getPlace(to)?.name ?? "your destination";
  const href = placeHref(to);
  const [leg, setLeg] = useState(0);
  const [road, setRoad] = useState<{ i: number; c: Corridor | null } | null>(null);
  const [between, setBetween] = useState<string | null>(null);
  const current = legs[leg];

  useEffect(() => {
    if (!current) return;
    let live = true;
    loadCorridor(current.c).then((c) => { if (live) setRoad({ i: leg, c }); });
    return () => { live = false; };
  }, [current, leg]);
  // Nothing to drive, or the road isn't there: straight to the place.
  const failed = !current || (road?.i === leg && !road.c);
  useEffect(() => { if (failed) router.replace(href); }, [failed, href, router]);

  const arrive = () => {
    gameAudio.playClickSound();
    const next = legs[leg + 1];
    if (next) {
      setBetween(`Onto ${corridorName(next.c)}…`);
      setTimeout(() => { setBetween(null); setLeg(leg + 1); }, 1400);
    } else {
      setBetween(`You've arrived at ${destination}`);
      setTimeout(() => router.push(href), 1400);
    }
  };

  const ready = road?.i === leg && road.c && current;
  return (
    <main className="fixed inset-0 bg-sky-200">
      {!ready && !failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-700">
          <p className="text-4xl animate-bounce">🚗</p>
          <p className="font-black">Pulling onto {current ? corridorName(current.c) : "the road"}…</p>
          {current && <p className="text-xs">From {exitName(current.c, current.a)} to {exitName(current.c, current.b)}</p>}
        </div>
      )}
      {ready && <DriveScene key={leg} corridor={road.c!} leg={current} carId={carId} plate={plate} destination={destination} onArrive={arrive} onSkip={() => router.push(href)} />}
      {between && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 pointer-events-none">
          <p className="rounded-3xl bg-white px-6 py-4 text-lg font-black text-slate-900 shadow-2xl">{between}</p>
        </div>
      )}
    </main>
  );
}
