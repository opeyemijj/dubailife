"use client";

import { useEffect, useState } from "react";
import { ApartmentRoom, type Person } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS, type HousingTier } from "@/lib/furniture";
import { babyScale, CarriedBaby, wanderFrom } from "@/components/home/Baby";

export function BabiesPreview({ carry, tier, view }: { carry: "lie" | "sit"; tier: string; view: "above" | "inside" | "eye" }) {
  const housingTier = (tier in HOUSING_CONFIGS ? tier : "one_bedroom") as HousingTier;
  const [bed, setBed] = useState<{ x: number; y: number; z: number; yaw: number } | null>(null);
  const [call, setCall] = useState<{ n: number; where: "bed"; height: number; scale: number; anyLevel: boolean } | undefined>(undefined);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setCall({ n: 1, where: "bed", height: 1.7 * babyScale(0), scale: babyScale(0), anyLevel: true }), 3000);
    const c = setInterval(() => setClock(Date.now()), 1000);
    return () => { clearTimeout(t); clearInterval(c); };
  }, []);
  const crawl = wanderFrom(2, [-2.4, 1.2], clock, "crawl", 4.6);
  const walk = wanderFrom(3, [-0.6, 2.2], clock, "walk", 4.6);
  const people: Person[] = [
    ...(bed ? [{ look: { gender: "woman" as const }, position: [bed.x, bed.y, bed.z] as [number, number, number], rotation: bed.yaw, animation: "sleep" as const, scale: babyScale(0), label: "👶 Newborn in bed" }] : []),
    { look: { gender: "man" }, position: [crawl[0], 0, crawl[1]], animation: "idle", pose: "crawl", pace: 0.22, scale: babyScale(6), label: "🍼 Crawling" },
    { look: { gender: "woman" }, position: [walk[0], 0, walk[1]], animation: "walk", pace: 0.45, scale: babyScale(11), label: "🚶 First steps" },
  ];
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier={housingTier} view={view} people={people} look={{ gender: "man" }}
        cradle={<CarriedBaby look={{ gender: "woman" }} days={carry === "lie" ? 0 : 4} pose={carry} />}
        babyCall={call} onBabyDown={(s) => setBed(s)} />
    </main>
  );
}
