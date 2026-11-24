"use client";

import { useMemo } from "react";
import { InteriorScene } from "@/components/interior/InteriorScene";
import { buildPlan } from "@/components/interior/layouts";
import { getPlace } from "@/lib/city/places";
import type { Peer } from "@/lib/room";

export function YachtPreview({ night, view }: { night: boolean; view: string }) {
  const venue = useMemo(() => getPlace("dubai-harbour-marina")!.venues.find((v) => v.name === "Royal Pearl superyacht")!, []);
  const plan = useMemo(() => buildPlan(venue), [venue]);
  // Guests dancing on the deck.
  const peers = useMemo<Peer[]>(() => Array.from({ length: 8 }, (_, i) => ({
    userId: `g${i}`, username: `guest${i + 1}`, name: `Guest ${i + 1}`, look: { gender: i % 2 ? "man" : "woman", outfit: "party" },
    x: -2 + (i % 4) * 1.3, z: -0.4 + Math.floor(i / 4) * 2, face: i, animation: "dance",
  }) as Peer), []);
  return (
    <main className="fixed inset-0">
      <InteriorScene venue={venue} plan={plan} look={{ gender: "man" }} playerAnimation="dance" walkTo={null} onArrive={() => {}}
        onStation={() => {}} onStaff={() => {}} staffAnimation="idle" served={[]} deliveries={[]} onPlaced={() => {}} onDeliveryDone={() => {}}
        peers={peers} dim={night} inside={view === "inside"} eye={view === "eye"} boat={view === "boat"} drone={view === "drone"} />
    </main>
  );
}
