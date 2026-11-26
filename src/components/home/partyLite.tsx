"use client";

// A house party runs lighter (measured on a villa: 13 point lights and ~690 meshes with eight guests): the home's own
// lamps put their lights out (the party's lighting takes over, and every extra light is shaded on every pixel), and
// the pieces in the way of a dance floor are put away. Provided inside the room's Canvas by ApartmentRoom.

import { createContext, useContext } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { CatalogItem } from "@/lib/furniture";
import type * as THREE from "three";
import { PooledLamp, usePooledLamp } from "./sceneLite";

/** A party is on in this room. */
export const PartyOn = createContext(false);

/** A lamp's light: off while a party is on (the lamp itself still glows). In a room with a light pool (homes: see
    sceneLite), one of a few shared lights comes to it when it's among the nearest lamps. */
export function RoomLight(props: ThreeElements["pointLight"]) {
  const party = useContext(PartyOn);
  const pool = usePooledLamp();
  if (party) return null;
  if (pool) return <PooledLamp pool={pool} position={props.position as THREE.Vector3Tuple} intensity={props.intensity} distance={props.distance} color={props.color as THREE.ColorRepresentation} />;
  return <pointLight {...props} />;
}

/** Put away for a party, to clear a dance floor: the TV, coffee tables, rugs and the aquarium. Never a seat. */
export function clearedForParty(item: Pick<CatalogItem, "id" | "kind" | "visual" | "model">): boolean {
  const what = `${item.id} ${item.visual ?? ""} ${item.model ?? ""}`.toLowerCase();
  return item.kind === "rug" || /(^|[^a-z])tv([^a-z]|$)|\btv\.glb|media-wall|coffee-table|aquarium/.test(what);
}
