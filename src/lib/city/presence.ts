"use client";

// Which city you're in. The server decides (public.my_city: where your last flight landed, Dubai if you've never
// flown), so typing /abu-dhabi into the address bar doesn't take you there: you fly. Until the server answers, the
// saved location's city stands in. If the saved location disagrees with the server (an old save, or one edited by
// hand), it's put back at the airport of the city you're really in.

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { updateCitizen, useCitizen } from "@/lib/citizenStore";
import { CITIES, cityOfLocation, type CityId } from "@/lib/city/cities";
import { entranceOf } from "@/lib/city/geo";

let known: CityId | null = null;
/** Whose city `known` is (signing in as someone else asks again). */
let knownFor: string | null = null;
let asking: Promise<CityId | null> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Ask the server again (after landing, or signing in). */
export function refreshCity(): Promise<CityId | null> {
  asking = (async () => {
    const { data, error } = await supabase().rpc("my_city");
    asking = null;
    if (error || !data || !(data in CITIES)) return known;
    known = data as CityId;
    emit();
    return known;
  })();
  return asking;
}

/** The city you're in: `city` (the server's word once `ready`, the saved location's until then). */
export function useCurrentCity(): { city: CityId; ready: boolean } {
  const { citizen } = useCitizen();
  const server = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => known,
    () => null,
  );
  const me = citizen?.id ?? null;
  useEffect(() => {
    if (!me || (knownFor === me && (known !== null || asking))) return;
    knownFor = me; known = null; emit();
    void refreshCity();
  }, [me]);
  // Keep the saved location in the city you're really in.
  const saved = cityOfLocation(citizen?.location);
  useEffect(() => {
    if (!server || saved === server) return;
    const placeId = CITIES[server].airport;
    const at = entranceOf(placeId) ?? { x: 2000, y: 1300 };
    updateCitizen((c) => ({ ...c, location: { ...at, placeId, city: server } }));
  }, [server, saved]);
  return { city: server ?? saved, ready: server !== null };
}

/** The map page of the city you're in. */
export function useCityMapPath() {
  return CITIES[useCurrentCity().city].path;
}
