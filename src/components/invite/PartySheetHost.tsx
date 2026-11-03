"use client";

// Throw a party from anywhere: the phone's Invites app, a venue ("host a party here"), the map. Opens the party sheet
// with your home (for a house party) if you rent or own one; anyone can throw a club night, pool party or dinner.

import { useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { flatRoute, myFlats, type FlatView } from "@/lib/city/flats";
import { getEntity } from "@/lib/city/geo";
import { PartySheet, type PartyStart } from "./PartySheet";

const OPEN = "dubai:open-party";
/** Opens the party sheet, starting on a kind of party or a venue if given. */
export const openPartySheet = (start?: PartyStart) => window.dispatchEvent(new CustomEvent(OPEN, { detail: start ?? {} }));

export function PartySheetHost() {
  const { citizen } = useCitizen();
  const [start, setStart] = useState<PartyStart | null>(null);
  const [flats, setFlats] = useState<FlatView[] | null>(null);
  useEffect(() => {
    const show = (e: Event) => setStart((e as CustomEvent<PartyStart>).detail ?? {});
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);
  const opened = !!start;
  useEffect(() => {
    if (!opened || !citizen?.id) return;
    let live = true;
    void myFlats(citizen.id).then((list) => { if (live) setFlats(list); });
    return () => { live = false; };
  }, [opened, citizen?.id]);

  if (!start || !citizen?.id || !flats) return null;
  // The home you're living in now, or the first you have.
  const f = flats.find((x) => x.id === citizen.activeFlatId) ?? flats[0];
  const flat = f ? {
    id: f.id,
    route: flatRoute(f),
    title: /^\d/.test(f.unit) ? `${f.property_type} ${f.unit}` : f.property_type,
    area: `${getEntity(f.building_id)?.name ?? f.building_id.replace(/-/g, " ")}${f.owner_id === citizen.id ? " · Owned" : " · Rented"}`,
  } : null;
  return <PartySheet flat={flat} start={start} onClose={() => { setStart(null); setFlats(null); }} />;
}
