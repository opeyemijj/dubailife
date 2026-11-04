"use client";

// House parties for anyone with a room, even when their home isn't on the map (a starter studio, a 1-bed in JVC…).
// The first party gives that home a generic address ("Apt 1204, Al Barsha") in a "home-<area>" building that isn't on
// the map; guests visit it at /property/home-<area>/<unit> like any other home. Not a tenancy: no rent, never listed.
// See supabase/migrations/20261222000000_party_homes.sql.

import { supabase } from "@/lib/supabase/client";
import { HOUSING_CONFIGS, withHomeItems, type HousingTier, type OwnedFurniture } from "@/lib/furniture";
import { flatRoute, getFlat, type FlatView } from "./flats";

/** Generic homes live in buildings named "home-<area>", which aren't on the map. */
export const isGenericHome = (buildingId: string) => buildingId.startsWith("home-");

/** "home-al-barsha" → "Al Barsha". */
export const genericArea = (buildingId: string) =>
  buildingId.replace(/^home-/, "").split("-").map((w) => (w.length <= 3 && w !== "al" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ");

/** Every home off the map is a flat in a residential tower: "Al Barsha Residences". */
export const towerName = (buildingId: string) => `${genericArea(buildingId)} Residences`;

/** The first area named for a home type: "Al Barsha / JVC" → "Al Barsha". */
export const areaFor = (tier: HousingTier) => (HOUSING_CONFIGS[tier]?.area ?? "Al Barsha").split(/[/·]/)[0].trim();

/** A shared bed space isn't a room of your own. */
export const hasRoom = (tier: HousingTier) => tier !== "bed_space";

/** Makes (or refreshes, with today's furniture) my generic home and returns where guests go. */
export async function preparePartyHome(tier: HousingTier, furniture: OwnedFurniture[], interior?: { furniture: OwnedFurniture[]; style?: unknown; shared?: boolean }): Promise<{ id: string; route: string } | { error: string }> {
  if (!hasRoom(tier)) return { error: "A shared bed space isn't a room of your own. Move to a studio or bigger to host." };
  const placed = withHomeItems(furniture, tier).filter((f) => f.placement);
  // A shared home keeps its one copy (with its look); otherwise my placed furniture.
  const { data, error } = await supabase().rpc("party_home", { p_tier: tier, p_area: areaFor(tier), p_interior: interior ?? { furniture: placed } });
  if (error || typeof data !== "string") {
    return { error: /need_a_room/.test(error?.message ?? "") ? "A shared bed space isn't a room of your own. Move to a studio or bigger to host."
      : /function .*party_home|schema cache/i.test(error?.message ?? "") ? "House parties at homes off the map are coming in the next update."
      : "Couldn't open your home for a party. Please try again." };
  }
  const [building, ...unit] = data.split(":");
  return { id: data, route: flatRoute({ building_id: building, unit: unit.join(":") }) };
}

/** My generic home (the latest used), if I've had a party at it. */
export async function myPartyHome(): Promise<FlatView | null> {
  const { data, error } = await supabase().rpc("my_party_home");
  if (error || typeof data !== "string") return null;
  return getFlat(data);
}
