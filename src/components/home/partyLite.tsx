"use client";

// A house party runs lighter (measured on a villa: 13 point lights and ~690 meshes with eight guests): the home's own
// lamps put their lights out (the party's lighting takes over, and every extra light is shaded on every pixel), and
// the pieces in the way of a dance floor are put away. Provided inside the room's Canvas by ApartmentRoom.

import { createContext, useContext } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { CatalogItem } from "@/lib/furniture";

/** A party is on in this room. */
export const PartyOn = createContext(false);

/** A lamp's light: off while a party is on (the lamp itself still glows). */
export function RoomLight(props: ThreeElements["pointLight"]) {
  return useContext(PartyOn) ? null : <pointLight {...props} />;
}

/** Put away for a party, to clear a dance floor: the TV, coffee tables, rugs and the aquarium. Never a seat. */
export function clearedForParty(item: Pick<CatalogItem, "id" | "kind" | "visual" | "model">): boolean {
  const what = `${item.id} ${item.visual ?? ""} ${item.model ?? ""}`.toLowerCase();
  return item.kind === "rug" || /(^|[^a-z])tv([^a-z]|$)|\btv\.glb|media-wall|coffee-table|aquarium/.test(what);
}
