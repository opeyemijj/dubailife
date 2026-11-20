"use client";

import { useState } from "react";
import { RaceScene } from "@/components/autodrome/RaceScene";
import { raceAudio } from "@/lib/raceAudio";
import { SPORTS, tracksFor, type Racer, type Sport } from "@/lib/autodrome";

const RACERS: Racer[] = [
  { id: "me", username: "you", look: null, car: "lamborghini-huracan", plate: "L 10", finishMs: null, place: null },
  { id: "b", username: "maryam", look: null, car: "lamborghini-urus", plate: "K 4171", finishMs: null, place: null },
  { id: "c", username: "diva_kim", look: null, car: "mercedes-g63", plate: "O 8518", finishMs: null, place: null },
  { id: "d", username: "omar", look: null, car: "bmw-x5", plate: "D 7781", finishMs: null, place: null },
  { id: "e", username: "leila", look: null, car: "toyota-camry", plate: "F 2210", finishMs: null, place: null },
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
  // ?track=<id>: one of the tracks (lib/autodrome TRACKS).
  const track = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("track") ?? undefined : undefined;
  // ?sport=horse|camel|bike: on a mount from the stable (each racer a different one), on that sport's first track.
  const sport = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("sport") : null) as Sport | null;
  const def = SPORTS.find((s) => s.id === sport);
  const racers = def ? RACERS.map((r, i) => ({ ...r, car: "", mount: def.mounts[i % def.mounts.length].id })) : RACERS;
  return <RaceScene code="DEVTEST" me={watch ? "spectator" : "me"} racers={racers} laps={1} sport={def ? def.id : "car"} track={track ?? (def ? tracksFor(def.id)[0].id : undefined)} startsAt={start} onFinish={() => {}} onLeave={() => setStart(null)}
    devBots={new URLSearchParams(window.location.search).get("bots") === "1"} devStart={Number(new URLSearchParams(window.location.search).get("at") ?? 0) || undefined} />;
}
