"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MapPin, Navigation, Zap } from "lucide-react";
import { getPlace } from "@/lib/city/places";
import { entranceOf } from "@/lib/city/geo";
import { updateCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { VenueExperience } from "./VenueExperience";
import { SmallLoader } from "@/components/GameLoadingScreen";

/** Resolves a place/venue URL, checks the citizen has actually travelled there, then opens the interior. */
export function VenueRoute({ placeId, venueId }: { placeId: string; venueId?: string }) {
  const router = useRouter();
  const { citizen, hydrated } = useRequireCitizen();
  const place = getPlace(placeId);
  const venue = place && (venueId ? place.venues.find((v) => v.id === venueId) : place.venues.length === 1 ? place.venues[0] : null);

  // A multi-venue place without a venue picked: show its directory on the map.
  useEffect(() => {
    if (place && !venueId && place.venues.length > 1) router.replace(`/explore?open=${place.id}`);
  }, [place, venueId, router]);

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

  // Travel is part of the world: arrive at the building before going in (or skip on purpose).
  if (citizen.location?.placeId !== place.id) {
    const goDirectly = () => {
      const at = entranceOf(place.id);
      updateCitizen((c) => ({ ...c, location: { ...(at ?? c.location ?? { x: 0, y: 0 }), placeId: place.id } }));
    };
    return (
      <Shell>
        <MapPin className="w-8 h-8 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-black mt-2">You&apos;re not at {place.name} yet</h1>
        <p className="text-sm text-slate-500 mt-1">Head there through the city first, or skip the trip.</p>
        <div className="mt-4 space-y-2">
          <Link href={`/explore?to=${place.id}${venueId ? `&venue=${venueId}` : ""}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-black"><Navigation className="w-4 h-4" /> Plan the journey</Link>
          <button onClick={goDirectly} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"><Zap className="w-4 h-4" /> Go directly (skip travel)</button>
        </div>
      </Shell>
    );
  }

  return <VenueExperience place={place} venue={venue} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">{children}</div>
    </main>
  );
}
