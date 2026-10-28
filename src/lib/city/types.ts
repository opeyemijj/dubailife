// Shared types for places on the city map and the venues inside them.

/** How a venue's interior is laid out (see components/interior). */
export type Layout =
  | "boutique" | "tech" | "beauty" | "jewellery" | "market" | "dining" | "club" | "lobby" | "outdoor"
  // Places that aren't rooms: what the venue really is, built in 3D (see components/interior/layouts).
  | "beach" | "pooldeck" | "waterpark" | "spa" | "theatre" | "bar" | "mosque" | "rink" | "bowling";

/** Interactive spots inside an interior. Products and services are grouped by these. */
export type StationKind =
  | "rack" | "table" | "shelf" | "case" | "wall" | "till" | "fitting"
  | "counter" | "menu" | "bar" | "dj" | "dancefloor" | "booth"
  | "reception" | "tickets" | "exhibit" | "service" | "staff";

export type Accessory = "cap" | "sunglasses" | "headphones" | "watch" | "handbag" | "necklace";

export interface Product {
  id: string;
  name: string;
  price: number; // AED
  icon: string;
  desc: string;
  station: StationKind;
  specs?: Record<string, string>;
  /** Can be previewed and worn on the avatar. */
  wearable?: Accessory;
  /** Experiences/services rather than items (tickets, bookings, treatments). */
  service?: boolean;
  /** Food & drink restores the citizen's needs when consumed. */
  consumable?: { need: "hunger" | "energy" | "fun" | "social"; amount: number };
}

export interface JobDef {
  role: string;
  wage: number; // AED per shift
  /** Interview: pick the best answer; two of three right gets the job. */
  interview: Array<{ q: string; options: string[]; answer: number }>;
  /** Shift task: match each customer to what they asked for. */
  shift: Array<{ customer: string; wants: string; productId: string }>;
}

export interface Palette {
  floor: string;
  wall: string;
  accent: string;
  light?: string;
}

export interface VenueActivity {
  id: string;
  label: string;
  icon: string;
  animation?: "dance" | "sit" | "clap" | "wave" | "talk" | "idle";
  reward?: number;
  need?: { kind: "hunger" | "energy" | "fun" | "social" | "hygiene"; amount: number };
  desc?: string;
  price?: number;
  /** Acted out in 3D as a ride or water activity (src/data/venues/rides.json). */
  ride?: string;
}

export interface Venue {
  id: string;
  name: string;
  category: string;
  layout: Layout;
  blurb: string;
  palette: Palette;
  /** Where it is inside the building, when known. */
  zone?: string;
  /** Not built yet: shown in directories but can't be entered. */
  comingSoon?: boolean;
  products: Product[];
  staff: { role: string; gender: "woman" | "man"; preset?: string; greeting: string };
  job?: JobDef;
  /** Signature feature of the room: big windows on the skyline, an aquarium wall, a stage… */
  feature?: "skyline" | "aquarium" | "exhibits" | "stage" | "pool" | "spa" | "frame";
  /** Extra things you can do here besides buying (dance, sit, explore exhibits, local rituals…). */
  activities?: VenueActivity[];
}

export type PlaceKind = "mall" | "food-hall" | "hotel" | "club" | "attraction" | "park" | "residential" | "home";

export interface Place {
  id: string; // map entity id
  name: string;
  kind: PlaceKind;
  blurb: string;
  /** Venues inside (stores, restaurants, hotel facilities…). Single-venue places have one. */
  venues: Venue[];
  /** Category chips for the directory, in display order. */
  categories?: string[];
  /** Opens its own page instead of a venue interior (e.g. a car showroom). */
  route?: string;
}
