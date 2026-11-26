"use client";

import { FlyJourney, type Stage } from "@/components/fly/FlyJourney";

export function FlyPreview({ stage, inside, t, to }: { stage: string; inside: boolean; t: number; to: "dubai" | "abu-dhabi" | "doha" }) {
  return <FlyJourney from={to === "dubai" ? "abu-dhabi" : "dubai"} to={to} dev={{ stage: stage as Stage, inside, t }} />;
}
