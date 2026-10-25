// Rides and water activities that are acted out in 3D (see components/interior/rides). The catalogue is
// static content in src/data/venues/rides.json; this file types it and turns rides into venue activities.

import data from "@/data/venues/rides.json";
import type { Venue, VenueActivity } from "./types";
import { hasChefGrill } from "@/components/interior/rides/paths";

export type RideKind = "drop" | "capsule" | "raft" | "race" | "tube" | "river" | "waves" | "flowrider" | "swim" | "cannonball" | "float" | "sunbathe" | "jetski" | "paddle" | "kitesurf" | "volleyball" | "sandcastle" | "skate" | "spin" | "bowling" | "karaoke" | "danceoff" | "dj" | "meal" | "chefshow" | "treatment" | "sauna" | "plunge" | "jacuzzi" | "facemask" | "observe" | "glassbridge" | "tunnel" | "waxselfie" | "vrdrop" | "stylist" | "trolley" | "perfume" | "jewelguess" | "techdemo";
export type TrackId = "drop" | "twistA" | "twistB" | "river" | "waves" | "flowrider" | "pool" | "sea" | "lounger" | "seacourse" | "net" | "sand" | "rink" | "lane" | "stage" | "dancefloor" | "decks" | "table" | "grill" | "bed1" | "bed2" | "sauna" | "plunge" | "jacuzzi" | "spalounger" | "lift" | "tunnel" | "wax" | "vr" | "boutique" | "market" | "beauty" | "jewellery" | "tech";
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
  /** Observation decks: floors the lift climbs (shown on the way up), and the landmarks to spot. */
  floors?: number;
  landmarks?: Landmark[];
  /** Aquarium tunnels: the creature to photograph. */
  target?: "shark" | "manta";
}

/** A landmark seen from an observation deck: its compass bearing (degrees), distance and height in scene
    metres, and how it's drawn. */
export interface Landmark { name: string; bearing: number; dist: number; height: number; shape: "fountain" | "dhow" | "ring" | "spire" | "frame" | "arch" | "wheel" | "sail" | "palm" }

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
  else if (layout === "rink") ids = data.venues.rink;
  else if (layout === "bowling") ids = data.venues.bowling;
  else if (layout === "club") ids = data.venues.club;
  else if (layout === "spa") ids = data.venues.spa;
  else if (layout in data.venues.shops) {
    // Shops: only ones that sell things (not "coming soon" or service-only counters).
    ids = data.venues.shops[layout as keyof typeof data.venues.shops];
  } else if (layout === "lobby") {
    // Attractions: the one experience each is famous for.
    const name = venue.name.toLowerCase();
    const hit = Object.entries(data.venues.attractions).find(([k]) => name.includes(k));
    if (hit) ids = hit[1];
  }
  else if (layout === "dining") ids = [...data.venues.dining, ...(hasChefGrill(venue) ? data.venues.diningGrill : [])];
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
