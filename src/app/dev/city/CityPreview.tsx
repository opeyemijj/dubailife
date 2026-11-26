"use client";

import dynamic from "next/dynamic";
import type { CityId } from "@/lib/city/cities";

const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap").then((m) => m.InteractiveMap), { ssr: false });

export function CityPreview({ city }: { city: CityId }) {
  return <main className="fixed inset-0 bg-[#d6bc8a]"><InteractiveMap city={city} hideTopHUD onAttemptInteract={() => {}} /></main>;
}
