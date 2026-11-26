"use client";

// Flying between cities (?from=dubai&to=abu-dhabi): the terminal, the flight and the arrival (components/fly).
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRequireCitizen } from "@/lib/citizenStore";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { FlyJourney } from "@/components/fly/FlyJourney";
import { CITIES, type CityId } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";
import { routeOf, routesFrom } from "@/lib/flights";

export default function FlyPage() {
  return <Suspense fallback={<SmallLoader label="Opening the terminal" />}><Fly /></Suspense>;
}

const isCity = (c: string | null): c is CityId => !!c && c in CITIES;

function Fly() {
  const params = useSearchParams();
  const { hydrated, isLoggedIn } = useRequireCitizen();
  const here = useCurrentCity();
  // The trip, fixed when the journey starts: landing moves you to the other city (here.city changes), and the
  // arrival screen must still be this flight's (the hotels and homes where you landed), not a flight back.
  const [trip, setTrip] = useState<{ from: CityId; to: CityId } | null>(null);
  if (!trip && here.ready) {
    // Always from the airport of the city you're in (a link from the other city's airport doesn't move you there),
    // to the other city unless the link says.
    const from = here.city;
    // Where to: the link's ?to=, else the city tapped on the cities strip (layout CitySwitcher), else the first
    // route from here. It can still be changed at the check-in counter.
    let picked: string | null = params.get("to");
    if (!isCity(picked) || picked === from) { try { picked = sessionStorage.getItem("fly-to"); } catch { picked = null; } }
    const to: CityId = isCity(picked) && picked !== from && routeOf(from, picked) ? picked : (routesFrom(from)[0]?.to as CityId) ?? "dubai";
    setTrip({ from, to });
  }
  if (!hydrated || !isLoggedIn || !trip) return <SmallLoader label="Opening the terminal" />;
  return <FlyJourney from={trip.from} to={trip.to} />;
}
