"use client";

import { useState } from "react";
import { RaceScene } from "@/components/autodrome/RaceScene";
import { raceAudio } from "@/lib/raceAudio";
import type { Racer } from "@/lib/autodrome";

const RACERS: Racer[] = [
  { id: "me", username: "you", look: null, car: "lamborghini-huracan", plate: "L 10", finishMs: null, place: null },
  { id: "b", username: "maryam", look: null, car: "lamborghini-urus", plate: "K 4171", finishMs: null, place: null },
  { id: "c", username: "diva_kim", look: null, car: "mercedes-g63", plate: "O 8518", finishMs: null, place: null },
];

export function AutodromePreview() {
  const [start, setStart] = useState<number | null>(null);
  if (start === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <button onClick={() => { raceAudio(); setStart(Date.now() + 4000); }} className="h-14 px-8 rounded-full bg-white font-black">Start your engine</button>
      </div>
    );
  }
  // ?watch=1: as a spectator (not in the race).
  const watch = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("watch") === "1";
  return <RaceScene code="DEVTEST" me={watch ? "spectator" : "me"} racers={RACERS} laps={1} startsAt={start} onFinish={() => {}} onLeave={() => setStart(null)} />;
}
