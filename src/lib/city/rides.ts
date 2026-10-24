// Rides and water activities that are acted out in 3D (see components/interior/rides). The catalogue is
// static content in src/data/venues/rides.json; this file types it and turns rides into venue activities.

import data from "@/data/venues/rides.json";
import type { Venue, VenueActivity } from "./types";

export type RideKind = "drop" | "capsule" | "raft" | "race" | "tube" | "river" | "waves" | "flowrider" | "swim" | "cannonball" | "float" | "sunbathe" | "jetski" | "paddle" | "kitesurf" | "volleyball" | "sandcastle";
export type TrackId = "drop" | "twistA" | "twistB" | "river" | "waves" | "flowrider" | "pool" | "sea" | "lounger" | "seacourse" | "net" | "sand";
type Need = NonNullable<VenueActivity["need"]>;

export interface RideDef {
  id: string;
  label: string;
  icon: string;
  kind: RideKind;
  track: TrackId;
  desc: string;
  fact?: string;
  /** The real ride's height in metres: speeds are shown as if riding the real thing. */
  realHeight?: number;
  reward?: number;
  need?: Need;
  /** What it costs to do (hire, lesson), in AED. */
  price?: number;
  /** The kind of station it's started from when that isn't its own ride spot (sunbathing: a lounger). */
  station?: "booth";
}

export const RIDES: Record<string, RideDef> = Object.fromEntries(
  Object.entries(data.rides).map(([id, r]) => [id, { id, ...r } as RideDef]),
);

export const rideFor = (a: Pick<VenueActivity, "ride"> | null | undefined): RideDef | undefined => (a?.ride ? RIDES[a.ride] : undefined);

/** Which park's rides a waterpark venue has. */
export const parkOf = (venue: Pick<Venue, "name" | "blurb">) => (/aquaventure|atlantis/i.test(`${venue.name} ${venue.blurb}`) ? "aquaventure" : "wildwadi");

/** The ride activities for a venue's scene: waterparks get their park's rides, pools get swimming, beaches
    get the sea, water sports, sunbathing and sandcastles (volleyball where there's a net). */
export function rideActivities(layout: Venue["layout"], venue: Pick<Venue, "name" | "blurb" | "category">): VenueActivity[] {
  let ids: string[] = [];
  if (layout === "waterpark") ids = data.venues[parkOf(venue)];
  else if (layout === "pooldeck" && !/kids/i.test(venue.name)) ids = data.venues.pooldeck;
  else if (layout === "beach") {
    if (/kitesurf/i.test(venue.name)) ids = data.venues.kitesurf;
    // The abra ride and food trucks are on the beach but aren't beaches to swim from.
    else if (!/abra/i.test(venue.name) && !/truck/i.test(venue.category)) ids = [...data.venues.beach, ...(hasVolleyball(venue) ? data.venues.beachVolleyball : [])];
  }
  return ids.map((id) => {
    const r = RIDES[id];
    return { id: `ride:${id}`, ride: id, label: r.label, icon: r.icon, reward: r.reward, need: r.need, desc: r.desc, price: r.price };
  });
}

/** Beaches with a volleyball net: public beaches (not clubs). Shared with the beach scene. */
export const hasVolleyball = (v: Pick<Venue, "name" | "category">) => !/club/i.test(v.category) && /public|jbr|beach 1/i.test(`${v.name} ${v.category}`);
