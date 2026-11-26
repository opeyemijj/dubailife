"use client";

import { useMemo } from "react";
import { InteriorScene } from "@/components/interior/InteriorScene";
import { buildPlan } from "@/components/interior/layouts";
import { getPlace } from "@/lib/city/places";
import "@/lib/city/cities";

export function VenuePreview({ place, index, eye = false }: { place: string; index: number; eye?: boolean }) {
  const venue = useMemo(() => getPlace(place)?.venues[index] ?? null, [place, index]);
  const plan = useMemo(() => (venue ? buildPlan(venue) : null), [venue]);
  if (!venue || !plan) return <main className="p-6">No venue {index} at {place}.</main>;
  return (
    <main className="fixed inset-0">
      <InteriorScene venue={venue} plan={plan} look={{ gender: "man" }} playerAnimation="idle" walkTo={null} onArrive={() => {}}
        onStation={() => {}} onStaff={() => {}} staffAnimation="idle" served={[]} deliveries={[]} onPlaced={() => {}} onDeliveryDone={() => {}}
        peers={[]} eye={eye} />
      <p id="venue-label" className="absolute top-2 left-2 rounded bg-black/70 text-white text-xs font-bold px-2 py-1">{place} · {venue.name} · {venue.layout}</p>
    </main>
  );
}
