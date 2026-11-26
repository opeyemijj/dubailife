"use client";

import { FlyJourney, type Stage } from "@/components/fly/FlyJourney";
import { AirportWalk } from "@/components/fly/AirportWalk";

type City = "dubai" | "abu-dhabi" | "doha";
export function FlyPreview({ stage, inside, t, to, from: fromQ }: { stage: string; inside: boolean; t: number; to: City; from?: City }) {
  const from: City = fromQ && fromQ !== to ? fromQ : to === "dubai" ? "abu-dhabi" : "dubai";
  // ?stage=walk&to=…: the airport walk on its own (from the other city's airport), with a made-up booking.
  if (stage === "walk") return <AirportWalk from={from} to={to} seat="23A" seed={13} look={{ gender: "woman" }} onDone={() => location.reload()} onSkip={() => location.reload()} />;
  return <FlyJourney from={from} to={to} dev={{ stage: stage as Stage, inside, t }} />;
}
