// The cities you can be in. Dubai is the main map (/explore); the others are their own maps at their own pages,
// drawn in the same isometric style (plains on one lattice, sprites on the same angle), whose places and
// homes use the same systems as Dubai's. Their ids start with the city's prefix (Abu Dhabi: "ad-"), so anything
// with a place id knows which city it's in. You get between cities by air (lib/flights).

// Other cities' places register themselves with lib/city/places when loaded (kept out of Dubai's own lists).
import "./abuDhabi/places";

export type CityId = "dubai" | "abu-dhabi";

export interface CityDef {
  id: CityId;
  name: string;
  /** The map page. */
  path: string;
  /** Ids of this city's places and buildings start with this (none for Dubai). */
  prefix: string;
  /** Where you arrive (its airport's place id; the spot outside it is lib/city/geo entranceOf). */
  airport: string;
  icon: string;
}

export const CITIES: Record<CityId, CityDef> = {
  dubai: { id: "dubai", name: "Dubai", path: "/explore", prefix: "", airport: "dxb-terminal-3", icon: "🏙️" },
  "abu-dhabi": { id: "abu-dhabi", name: "Abu Dhabi", path: "/abu-dhabi", prefix: "ad-", airport: "ad-auh-airport", icon: "🕌" },
};

export const CITY_LIST = Object.values(CITIES);

/** Cities on the way: shown beside the open ones (the city strip under the top bar), not yet flown to. `short` is
 *  the name on a phone, where every city has to fit one row. */
export const COMING_CITIES = [
  { id: "saudi-arabia", name: "Saudi Arabia", short: "Saudi", icon: "🇸🇦", city: "Riyadh" },
  { id: "qatar", name: "Qatar", short: "Qatar", icon: "🇶🇦", city: "Doha" },
  { id: "china", name: "China", short: "China", icon: "🇨🇳", city: "Shanghai" },
] as const;

/** Which city a place (or building) is in, by its id. */
export const cityOfPlace = (id?: string | null): CityId =>
  (CITY_LIST.find((c) => c.prefix && id?.startsWith(c.prefix))?.id ?? "dubai");

/** Which city a saved location is in (older saves have no city: Dubai, unless the place says otherwise). */
export const cityOfLocation = (loc?: { city?: CityId; placeId?: string } | null): CityId =>
  loc?.city ?? cityOfPlace(loc?.placeId);

/** The map page a place (or building) is on. */
export const mapPathFor = (id?: string | null) => CITIES[cityOfPlace(id)].path;
