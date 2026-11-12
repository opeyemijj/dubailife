"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlace } from "@/lib/city/places";
import { entranceOf } from "@/lib/city/geo";
import { updateCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { VenueExperience } from "./VenueExperience";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { hopPending } from "@/lib/locals";
import { TowerArrival } from "@/components/property/TowerArrival";
import HIGHRISE from "@/data/venues/highrise.json";

/** The floor a venue is on, when it's up a tower (src/data/venues/highrise.json). */
const venueFloor = (name: string): number | undefined => (HIGHRISE.floors as Record<string, number>)[name];

/** Resolves a place/venue URL, and opens the interior once the citizen has travelled there. */
export function VenueRoute({ placeId, venueId }: { placeId: string; venueId?: string }) {
  const router = useRouter();
  const { citizen, hydrated } = useRequireCitizen();
  const place = getPlace(placeId);
  const venue = place && (venueId ? place.venues.find((v) => v.id === venueId) : place.venues.length === 1 ? place.venues[0] : null);
  // A venue up a tower: the lift up to it first, once per visit.
  const [rodeUp, setRodeUp] = useState<string | null>(null);

  // A multi-venue place without a venue picked: show its directory on the map.
  useEffect(() => {
    if (place && !venueId && place.venues.length > 1) router.replace(`/explore?open=${place.id}`);
  }, [place, venueId, router]);

  // Going along with a Local: no need to travel there first.
  const away = !!place && !!citizen && citizen.location?.placeId !== place.id;
  useEffect(() => {
    if (!away || !place || !hopPending(`${place.id}/${venueId ?? place.venues[0]?.id}`)) return;
    const at = entranceOf(place.id);
    updateCitizen((c) => ({ ...c, location: { ...(at ?? c.location ?? { x: 0, y: 0 }), placeId: place.id } }));
  }, [away, place, venueId]);

  // Otherwise travel is part of the world: the place's description on the map, with its Go button.
  const canVisit = !!venue && !venue.comingSoon;
  useEffect(() => {
    if (!away || !place || !canVisit || hopPending(`${place.id}/${venueId ?? place.venues[0]?.id}`)) return;
    router.replace(`/explore?open=${place.id}`);
  }, [away, place, venueId, canVisit, router]);

  if (!hydrated || !citizen) return <SmallLoader label="Getting you there…" />;

  if (!place || (venueId && !venue)) {
    return (
      <Shell>
        <h1 className="text-xl font-black">This place doesn&apos;t exist</h1>
        <Link href="/explore" className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">Back to the city</Link>
      </Shell>
    );
  }
  if (!venue) return <SmallLoader label={`Opening ${place.name}…`} />;

  if (venue.comingSoon) {
    return (
      <Shell>
        <div className="text-4xl">🚧</div>
        <h1 className="text-xl font-black mt-2">{venue.name} isn&apos;t open in the game yet</h1>
        <p className="text-sm text-slate-500 mt-1">{venue.blurb} We&apos;re still building this one.</p>
        <Link href={`/explore?open=${place.id}`} className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">Back to {place.name}</Link>
      </Shell>
    );
  }

  // Not there yet: the effect above opens this place's description on the map.
  if (citizen.location?.placeId !== place.id) return <SmallLoader label={`Opening ${place.name}…`} />;

  const floor = venueFloor(venue.name);
  const visit = `${place.id}/${venue.id}`;
  if (floor && rodeUp !== visit) {
    return <TowerArrival floor={floor} unit={venue.name} tower={place.name} look={citizen.look} onDone={() => setRodeUp(visit)} />;
  }

  return <VenueExperience key={`${place.id}/${venue.id}`} place={place} venue={venue} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">{children}</div>
    </main>
  );
}
