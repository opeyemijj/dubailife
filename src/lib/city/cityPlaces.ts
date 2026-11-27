// The places of one city, for every "where to?" and every list of places to go: Dubai's (PLACES), or another city's
// (its own places, lib/city/<city>/places, which register themselves when loaded: they're loaded here). Anything that
// lists destinations uses this, so in Abu Dhabi or Doha you only ever see that city.

import { PLACES, placesWithPrefix } from "@/lib/city/places";
import { CITIES, type CityId } from "@/lib/city/cities";
import type { Place } from "@/lib/city/types";
import "@/lib/city/abuDhabi/places";
import "@/lib/city/doha/places";

const cache = new Map<CityId, Place[]>();
export function placesIn(city: CityId): Place[] {
  if (city === "dubai") return PLACES;
  let list = cache.get(city);
  if (!list) { list = placesWithPrefix(CITIES[city].prefix); cache.set(city, list); }
  return list;
}
