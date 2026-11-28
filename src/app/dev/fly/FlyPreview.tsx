"use client";

import { FlyJourney, type Stage } from "@/components/fly/FlyJourney";
import { AirportWalk } from "@/components/fly/AirportWalk";
import { ArrivalWalk } from "@/components/fly/ArrivalWalk";

type City = "dubai" | "abu-dhabi" | "doha";
// ?family=1: travelling with a partner and a child (family trips).
const FAMILY = [{ gender: "man" as const, preset: "Male_Adult_21" }, { gender: "woman" as const, child: true }];
export function FlyPreview({ stage, inside, t, to, from: fromQ, seed = 13, family = false }: { stage: string; inside: boolean; t: number; to: City; from?: City; seed?: number; family?: boolean }) {
  const from: City = fromQ && fromQ !== to ? fromQ : to === "dubai" ? "abu-dhabi" : "dubai";
  // ?stage=walk&to=…: the airport walk on its own (from the other city's airport), with a made-up booking.
  // ?stage=arrival&to=…: the arrivals walk at that city's airport.
  if (stage === "arrival") return <ArrivalWalk companions={family ? FAMILY : []} from={from} city={to} look={{ gender: "woman" }} seed={seed} onDone={() => location.reload()} onSkip={() => location.reload()} />;
  if (stage === "walk") return <AirportWalk companions={family ? FAMILY : []} from={from} to={to} seat="23A" seed={seed} look={{ gender: "woman" }} onDone={() => location.reload()} onSkip={() => location.reload()} />;
  return <FlyJourney from={from} to={to} dev={{ stage: stage as Stage, inside, t }} />;
}
