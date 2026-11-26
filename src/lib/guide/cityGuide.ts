// Discover's lists for the city you're in (components/guide/Discover, lib/discover): Dubai's own To do and Places to
// visit (src/data/guide), and for the other cities, their own. A city's To do is its own things to do
// (src/data/guide/city-todo.json) then the game-wide ones (career, friends, games, learning: not Dubai's venues or
// driving); its Places to visit are built from its places (where each is, what you do there).

import ACTIVITIES from "@/data/guide/activities.json";
import VISIT from "@/data/guide/places-to-visit.json";
import CITY_TODO from "@/data/guide/city-todo.json";
import { AD_BUILDINGS, AD_PLAINS } from "@/lib/city/abuDhabi/map";
import { DQ_BUILDINGS, DQ_PLAINS } from "@/lib/city/doha/map";
import { getPlace, placesWithPrefix } from "@/lib/city/places";
import { CITIES, type CityId } from "@/lib/city/cities";
import type { Place } from "@/lib/city/types";

export type Activity = (typeof ACTIVITIES.items)[number];
export type Spot = (typeof VISIT.places)[number];
export interface CityGuide { todo: { categories: string[]; items: Activity[] }; visit: { categories: string[]; places: Spot[] } }

/** Dubai's items that are about Dubai's own places or driving there (left out of the other cities' lists). */
const dubaiOnly = (a: Activity) => a.cat === "Driving" || a.cat === "Going out" || /^\/(place|explore|driving)\b/.test(a.href ?? "");

/** Where a place is in its city (its district's name), from its building on the map. */
function districtOf(placeId: string) {
  const ad = AD_BUILDINGS.find((b) => b.id === placeId);
  if (ad) return AD_PLAINS.find((p) => p.id === ad.plain)?.name ?? "Abu Dhabi";
  const dq = DQ_BUILDINGS.find((b) => b.id === placeId);
  if (dq) return DQ_PLAINS.find((p) => p.id === dq.plain)?.name ?? "Doha";
  return "";
}

/** Which Places-to-visit group a place belongs in (the same groups as Dubai's). */
function categoryOf(p: Place) {
  const text = `${p.name} ${p.blurb}`.toLowerCase();
  if (p.route?.startsWith("/autodrome") || p.route?.startsWith("/racing")) return "Cars & racing";
  if (p.kind === "hotel") return "Hotels & pools";
  if (p.kind === "club") return /beach/.test(text) ? "Beaches & parks" : "Clubs & lounges";
  if (p.kind === "food-hall") return "Food";
  if (p.kind === "mall") return "Shopping";
  if (p.kind === "park") return "Beaches & parks";
  if (/museum|mosque|fort|heritage|library|souq|qasr|louvre|calligraph|falcon/.test(text)) return "Culture";
  if (/stadium|theme park|waterpark|coaster|wave pool|fun fair|arena|jet ski|yacht|kayak|safari|dune/.test(text)) return "Fun & shows";
  return "Landmarks";
}
const ICON: Record<string, string> = { "Cars & racing": "🏁", "Hotels & pools": "🏨", "Clubs & lounges": "🪩", "Food": "🍽️", "Shopping": "🛍️", "Beaches & parks": "🏖️", "Culture": "🏛️", "Fun & shows": "🎡", "Landmarks": "📍" };

const cache = new Map<CityId, CityGuide>();
export function guideFor(city: CityId): CityGuide {
  if (city === "dubai") return { todo: ACTIVITIES, visit: VISIT } as CityGuide;
  const hit = cache.get(city);
  if (hit) return hit;
  const own = (CITY_TODO as unknown as Record<string, { categories: string[]; items: Activity[] }>)[city] ?? { categories: [], items: [] };
  const shared = ACTIVITIES.items.filter((a) => !dubaiOnly(a));
  const places = placesWithPrefix(CITIES[city].prefix)
    .filter((p) => p.id !== CITIES[city].airport && p.kind !== "home" && p.kind !== "residential")
    .map((p): Spot => {
      const category = categoryOf(p);
      const firstThing = p.venues.flatMap((v) => v.activities ?? []).find((a) => !a.ride && !a.href)?.label;
      return { id: p.id, category, icon: ICON[category], where: districtOf(p.id), what: p.blurb, why: firstThing ? `${firstThing}.` : `${p.venues.length} place${p.venues.length === 1 ? "" : "s"} inside.` };
    });
  const guide: CityGuide = {
    todo: { categories: [...own.categories, ...ACTIVITIES.categories.filter((c) => c !== "Driving" && c !== "Going out")], items: [...own.items, ...shared] },
    visit: { categories: VISIT.categories.filter((c) => places.some((p) => p.category === c)), places },
  };
  cache.set(city, guide);
  return guide;
}

/** A place's name for its row (any city's). */
export const spotPlace = (id: string) => getPlace(id.split("/")[0]);
