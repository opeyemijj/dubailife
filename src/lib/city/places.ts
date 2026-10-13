// What each building on the city map is, and what's inside.
// Directories are based on published tenant lists for each venue (2025–26); line-ups change, so
// treat them as representative. Store names are used to identify real places; product names are generic.

import { catalog, jobFor, type CatalogKey } from "./catalog";
import type { Layout, Palette, Place, Product, Venue } from "./types";

const PALETTES = {
  minimal: { floor: "#e7e2da", wall: "#f7f5f1", accent: "#111111" },
  luxury: { floor: "#eadfcf", wall: "#efe6d8", accent: "#8b6b3e" },
  sports: { floor: "#3f3f46", wall: "#e4e4e7", accent: "#f97316" },
  tech: { floor: "#d6d3d1", wall: "#fafafa", accent: "#0a84ff" },
  beauty: { floor: "#f5f5f5", wall: "#fafafa", accent: "#111111" },
  oud: { floor: "#3b2a1e", wall: "#5a3e2b", accent: "#c9a227" },
  jewel: { floor: "#1f1b18", wall: "#2a2420", accent: "#d4af37" },
  grocer: { floor: "#e8e4dc", wall: "#f2efe8", accent: "#4d7c0f" },
  toys: { floor: "#fde68a", wall: "#fef3c7", accent: "#dc2626" },
  books: { floor: "#c8a77e", wall: "#f3ead8", accent: "#7c2d12" },
  cafe: { floor: "#a47148", wall: "#efe3d0", accent: "#14532d" },
  dining: { floor: "#6b4f3a", wall: "#d8c3a5", accent: "#9a3412" },
  club: { floor: "#0b0b12", wall: "#12121c", accent: "#d946ef", light: "#a855f7" },
  lobby: { floor: "#ece6dc", wall: "#f4efe6", accent: "#b08d57" },
  night: { floor: "#1e293b", wall: "#0f172a", accent: "#38bdf8" },
  park: { floor: "#86efac", wall: "#bbf7d0", accent: "#15803d" },
} satisfies Record<string, Palette>;

const STAFF = {
  woman: ["Female_Adult_05", "Female_Party_02", "Female_Adult_06", "Female_Adult_11"],
  man: ["Male_Adult_08", "Male_Adult_04", "Male_Adult_12", "Male_Adult_21"],
};

let staffTurn = 0;
function staffFor(role: string, greeting: string) {
  const gender = staffTurn % 2 === 0 ? "woman" : "man";
  const preset = STAFF[gender][Math.floor(staffTurn / 2) % 4];
  staffTurn++;
  return { role, gender, preset, greeting } as Venue["staff"];
}

const ROLE: Partial<Record<CatalogKey, string>> = {
  fashion: "Sales associate", luxury: "Client advisor", sports: "Sports advisor", electronics: "Tech specialist",
  beauty: "Beauty advisor", fragrance: "Fragrance consultant", jewellery: "Jewellery consultant", supermarket: "Cashier",
  books: "Bookseller", toys: "Toy expert", eyewear: "Optician", home: "Home stylist", pharmacy: "Pharmacist",
  cafe: "Barista", restaurant: "Host", club: "VIP host", hotel: "Front desk agent",
};

const LAYOUT: Record<CatalogKey, Layout> = {
  fashion: "boutique", luxury: "boutique", sports: "boutique", electronics: "tech", beauty: "beauty", fragrance: "beauty",
  jewellery: "jewellery", supermarket: "market", books: "market", toys: "market", eyewear: "jewellery", home: "market",
  pharmacy: "market", cafe: "dining", restaurant: "dining", club: "club", hotel: "lobby",
};

const PALETTE_FOR: Record<CatalogKey, Palette> = {
  fashion: PALETTES.minimal, luxury: PALETTES.luxury, sports: PALETTES.sports, electronics: PALETTES.tech, beauty: PALETTES.beauty,
  fragrance: PALETTES.oud, jewellery: PALETTES.jewel, supermarket: PALETTES.grocer, books: PALETTES.books, toys: PALETTES.toys,
  eyewear: PALETTES.jewel, home: PALETTES.luxury, pharmacy: PALETTES.grocer, cafe: PALETTES.cafe, restaurant: PALETTES.dining,
  club: PALETTES.club, hotel: PALETTES.lobby,
};

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface VenueOpts {
  zone?: string;
  comingSoon?: boolean;
  palette?: Palette;
  layout?: Layout;
  feature?: Venue["feature"];
  products?: Product[];
  extraProducts?: Product[];
  activities?: Venue["activities"];
  blurb?: string;
  /** Staff role when it differs from the business type's usual one. */
  role?: string;
  /** No job vacancy here (e.g. attractions without a staff job written yet). */
  noJob?: boolean;
}

function venue(name: string, category: string, key: CatalogKey, opts: VenueOpts = {}): Venue {
  const id = slug(name);
  const greeting = key === "club" ? "Welcome! Ticket and table bookings are with me." : key === "hotel" ? "Welcome — how may I help you today?" : "Hi! Let me know if you need any help.";
  return {
    id,
    name,
    category,
    layout: opts.layout ?? LAYOUT[key],
    blurb: opts.blurb ?? `${category} at ${name}.`,
    palette: opts.palette ?? PALETTE_FOR[key],
    zone: opts.zone,
    comingSoon: opts.comingSoon,
    feature: opts.feature,
    products: [...(opts.products ?? catalog(key, id)), ...(opts.extraProducts ?? [])],
    staff: staffFor(opts.role ?? ROLE[key] ?? "Staff", opts.role ? "Welcome! Tickets and information are with me." : greeting),
    job: opts.comingSoon || opts.noJob ? undefined : jobFor(key, id),
    activities: opts.activities,
  };
}

const ticket = (id: string, name: string, price: number, desc: string, icon = "🎟️"): Product => ({ id, name, price, icon, desc, station: "tickets", service: true, consumable: { need: "fun", amount: 25 } });

// ---------------------------------------------------------------- The Dubai Mall

const fashion = (n: string, opts?: VenueOpts) => venue(n, "Fashion", "fashion", opts);
const lux = (n: string) => venue(n, "Luxury fashion", "luxury", { zone: "Fashion Avenue" });
const DUBAI_MALL: Venue[] = [
  // Fashion
  ...["Zara", "H&M", "Uniqlo", "Mango", "Massimo Dutti", "Bershka", "Pull&Bear", "Marks & Spencer", "Gap", "Tommy Hilfiger", "Calvin Klein", "Hugo Boss"].map((n) => fashion(n)),
  // Luxury
  ...["Louis Vuitton", "Chanel", "Dior", "Gucci", "Prada", "Hermès", "Valentino", "Balenciaga", "Burberry", "Saint Laurent"].map(lux),
  // Footwear & sports
  venue("Level Shoes", "Footwear", "luxury", { blurb: "One of the world's largest shoe stores." }),
  ...["Nike", "Adidas", "Puma", "Lululemon", "Under Armour", "Sun & Sand Sports"].map((n) => venue(n, "Sportswear", "sports")),
  // Electronics
  venue("Apple", "Electronics", "electronics", { blurb: "Flagship tech store with expert help and setup." }),
  ...["Samsung", "Sharaf DG", "Virgin Megastore", "Bose", "Bang & Olufsen", "Dyson", "Huawei"].map((n) => venue(n, "Electronics", "electronics")),
  // Beauty & fragrance
  ...["Sephora", "Faces", "Bath & Body Works", "MAC Cosmetics", "Jo Malone London", "Huda Beauty", "Kiko Milano"].map((n) => venue(n, "Beauty", "beauty")),
  ...["Arabian Oud", "Ajmal Perfumes", "Amouage"].map((n) => venue(n, "Arabian fragrance", "fragrance")),
  // Jewellery & watches
  ...["Cartier", "Tiffany & Co.", "Bvlgari", "Van Cleef & Arpels", "Graff", "Damas", "Swarovski", "Pandora", "Ahmed Seddiqi & Sons"].map((n) => venue(n, "Jewellery & watches", "jewellery")),
  // Department stores, grocery, books, toys, home, eyewear, pharmacy
  venue("Galeries Lafayette", "Department store", "fashion", { blurb: "Parisian department store — fashion, beauty and gourmet.", extraProducts: catalog("beauty", "galeries-lafayette-beauty").slice(0, 4) }),
  venue("Bloomingdale's", "Department store", "fashion", { blurb: "American department store with fashion and home.", extraProducts: catalog("home", "bloomingdales-home") }),
  venue("Waitrose", "Supermarket", "supermarket", { zone: "Lower Ground", blurb: "British supermarket — groceries, bakery and fresh food." }),
  venue("Kinokuniya", "Books", "books", { zone: "Level 2", blurb: "Huge bookstore with Arabic, English and Japanese titles." }),
  ...["Hamleys"].map((n) => venue(n, "Toys", "toys", { blurb: "Legendary toy shop with live demos." })),
  venue("Pottery Barn", "Home", "home"),
  ...["Sunglass Hut", "Magrabi Optical"].map((n) => venue(n, "Eyewear", "eyewear")),
  venue("Boots", "Pharmacy & health", "pharmacy"),
  // Dining
  ...["Starbucks", "Tim Hortons", "Magnolia Bakery", "Angelina"].map((n) => venue(n, "Café", "cafe")),
  ...["The Cheesecake Factory", "Eataly", "Shake Shack", "Five Guys", "Nando's", "Wagamama", "P.F. Chang's", "Social House"].map((n) => venue(n, "Restaurant", "restaurant")),
  // Entertainment
  venue("Dubai Ice Rink", "Entertainment", "club", {
    role: "Rink attendant", noJob: true,
    zone: "Ground Floor", layout: "lobby", palette: PALETTES.night, blurb: "Olympic-size ice rink with public skating sessions.",
    products: [ticket("dubai-ice-rink:session", "Public skating session (incl. skates)", 105, "90 minutes on the ice.", "⛸️")],
    activities: [{ id: "skate", label: "Skate a lap", icon: "⛸️", animation: "dance", reward: 0 }],
  }),
  venue("Reel Cinemas", "Entertainment", "club", {
    role: "Cinema host", noJob: true,
    zone: "Level 2", layout: "lobby", palette: PALETTES.night, feature: "stage", blurb: "Multi-screen cinema with a premium Dine-in option.",
    products: [ticket("reel-cinemas:standard", "Standard movie ticket", 55, "Tonight's blockbuster."), ticket("reel-cinemas:dine-in", "Dine-in recliner ticket", 165, "Recliner seat with food service.", "🍿"), { id: "reel-cinemas:popcorn", name: "Large popcorn", price: 39, icon: "🍿", station: "counter", desc: "Salted or caramel.", consumable: { need: "fun", amount: 8 } }],
  }),
  venue("VR Park", "Entertainment", "club", {
    role: "Ride operator", noJob: true,
    zone: "Level 2", layout: "lobby", palette: PALETTES.night, blurb: "Virtual-reality rides and arcade games.",
    products: [ticket("vr-park:day", "All-day VR pass", 300, "Unlimited rides and games.", "🥽"), ticket("vr-park:single", "Single VR ride", 45, "One ride of your choice.", "🎢")],
  }),
  venue("KidZania", "Entertainment", "toys", { zone: "Level 2", comingSoon: true, blurb: "Kids' city of role-play jobs." }),
  venue("Emirates NBD", "Bank", "fashion", { comingSoon: true, blurb: "Branch and ATMs. Virtual banking features are planned." }),
];

// ---------------------------------------------------------------- Souk Al Bahar

const SOUK: Venue[] = [
  venue("Karma Kafé", "Restaurant & lounge", "restaurant", { blurb: "Pan-Asian lounge with a fountain-facing terrace." }),
  venue("Abd El Wahab", "Lebanese restaurant", "restaurant", { blurb: "Classic Lebanese mezze and grills." }),
  venue("Mango Tree Bistro", "Thai restaurant", "restaurant"),
  venue("Rivington Grill", "British grill", "restaurant"),
  venue("Souk Arts & Crafts", "Souvenirs", "fragrance", { blurb: "Arabian lanterns, oud, textiles and souvenirs from the souk's stalls." }),
];

// ---------------------------------------------------------------- Time Out Market (opening line-up; vendors rotate)

const tom = (n: string, cuisine: string, key: CatalogKey = "restaurant") => venue(n, cuisine, key, { layout: "dining", blurb: `${cuisine} counter at Time Out Market Dubai.` });
const TIME_OUT: Venue[] = [
  tom("Masti", "Modern Indian"), tom("BB Social Dining", "Asian small plates"), tom("Vietnamese Foodies", "Vietnamese"),
  tom("Pickl", "Burgers"), tom("Pitfire Pizza", "Pizza"), tom("Brix", "Desserts", "cafe"), tom("Nightjar Coffee", "Coffee roasters", "cafe"),
  tom("Reif Japanese Kushiyaki", "Japanese skewers"), tom("Little Erth", "Healthy bowls"), tom("Scoopi Café", "Ice cream", "cafe"),
  tom("Long Teng", "Chinese"), tom("Al Fanar", "Emirati"),
];

// ---------------------------------------------------------------- The Guild

const GUILD: Venue[] = [
  venue("The Nursery", "Coffee shop", "cafe", { blurb: "All-day coffee and patisserie." }),
  venue("The Potting Shed", "Greenhouse lounge", "cafe", { blurb: "Greenhouse-style meeting place." }),
  venue("The Aviary", "Cocktail bar", "club", { layout: "dining", palette: PALETTES.dining, blurb: "Sophisticated late-night bar with a piano." }),
  venue("Rockpool", "Seafood restaurant", "restaurant", { blurb: "Dine around a central indoor pool." }),
  venue("The Salon", "Grand dining room", "restaurant", { blurb: "Open kitchen and a shared menu with Rockpool." }),
];

// ---------------------------------------------------------------- hotels

const hotel = (hotelName: string, extra: Venue[]) => [
  venue(`${hotelName} Lobby & Reception`, "Reception · rooms & concierge", "hotel", { blurb: `Check in, book a room or ask the concierge at ${hotelName}.` }),
  ...extra,
];
const spa = (name: string) => venue(name, "Spa", "hotel", {
  role: "Spa therapist", noJob: true,
  layout: "lobby", feature: "spa", palette: PALETTES.luxury, blurb: "Treatments, hammam and relaxation lounge.",
  products: catalog("hotel", slug(name)).filter((x) => /spa|tea/.test(x.id)),
});
const pool = (name: string) => venue(name, "Pool", "hotel", {
  role: "Pool attendant", noJob: true,
  layout: "outdoor", feature: "pool", palette: PALETTES.lobby, blurb: "Loungers, cabanas and poolside drinks.",
  products: catalog("hotel", slug(name)).filter((x) => /pool|room-service/.test(x.id)),
  activities: [{ id: "lounge", label: "Lounge by the pool", icon: "🏖️", animation: "sit" }],
});

// ---------------------------------------------------------------- places

const single = (id: string, name: string, kind: Place["kind"], v: Venue): Place => ({ id, name, kind, blurb: v.blurb, venues: [v] });

const attraction = (name: string, blurb: string, feature: Venue["feature"], products: Product[], activities?: Venue["activities"]) =>
  venue(name, "Attraction", "hotel", { layout: "lobby", feature, palette: PALETTES.lobby, blurb, products, activities, role: "Guest services", noJob: true });

export const PLACES: Place[] = [
  {
    id: "dubai-mall", name: "The Dubai Mall", kind: "mall",
    blurb: "1,200+ shops, an aquarium, ice rink and cinema at the foot of Burj Khalifa.",
    venues: DUBAI_MALL,
    categories: ["Fashion", "Luxury fashion", "Footwear", "Sportswear", "Electronics", "Beauty", "Arabian fragrance", "Jewellery & watches", "Department store", "Supermarket", "Books", "Toys", "Home", "Eyewear", "Pharmacy & health", "Café", "Restaurant", "Entertainment", "Bank"],
  },
  { id: "souk-al-bahar", name: "Souk Al Bahar", kind: "mall", blurb: "Arabian-style souk on the Burj Lake with fountain-view dining.", venues: SOUK },
  { id: "timeout-market", name: "Time Out Market Dubai", kind: "food-hall", blurb: "Food hall with Dubai's best-reviewed chefs under one roof, overlooking the fountain.", venues: TIME_OUT },
  { id: "the-guild", name: "The Guild", kind: "food-hall", blurb: "A multi-venue dining collective — lunch, drinks, dinner and a nightcap by the piano.", venues: GUILD },
  {
    id: "address-downtown", name: "Address Downtown", kind: "hotel", blurb: "Five-star hotel next to Burj Khalifa with the Neos lounge on level 63.",
    venues: hotel("Address Downtown", [
      venue("Neos", "Lounge bar · Level 63", "club", { layout: "dining", palette: PALETTES.night, feature: "skyline", blurb: "Lounge on the 63rd floor with fountain and Burj views." }),
      venue("Zeta", "Asian-Californian restaurant", "restaurant", { palette: PALETTES.dining }),
      spa("The Spa at Address Downtown"),
      pool("Address Downtown Pool"),
    ]),
  },
  {
    id: "palace-downtown", name: "Palace Downtown", kind: "hotel", blurb: "Arabian palace-style hotel on the lake facing the Dubai Fountain.",
    venues: hotel("Palace Downtown", [
      venue("Thiptara", "Thai restaurant", "restaurant", { blurb: "Thai dining on the water facing the fountain." }),
      venue("Asado", "Argentinian steakhouse", "restaurant"),
      spa("The Palace Spa"),
      pool("Palace Downtown Pool"),
    ]),
  },
  {
    id: "address-skyview", name: "Address Sky View", kind: "hotel", blurb: "Twin towers linked by a sky bridge, with Sky Views Observatory and CÉ LA VI.",
    venues: hotel("Address Sky View", [
      attraction("Sky Views Observatory", "Glass slide and Edge Walk, 220 m up.", "skyline", [
        ticket("sky-views:observatory", "Sky Views Observatory + Glass Slide", 95, "Observation deck and the glass slide."),
        ticket("sky-views:edge-walk", "Edge Walk", 549, "Walk around the outside of the 52nd floor, harnessed.", "🧗"),
      ]),
      venue("CÉ LA VI", "Rooftop restaurant & bar", "restaurant", { palette: PALETTES.night, feature: "skyline" }),
      pool("Address Sky View Pool"),
    ]),
  },
  single("blu-dubai", "BLU Dubai Nightclub", "club", venue("BLU Dubai", "Nightclub", "club", {
    blurb: "Hip-hop and R&B nights.", activities: [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" }],
  })),
  single("armani-prive", "Armani/Privé", "club", venue("Armani/Privé", "Nightclub", "club", {
    blurb: "Glamorous club inside Armani Hotel, Burj Khalifa.", activities: [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" }],
  })),
  single("one-oak", "1OAK Dubai", "club", venue("1OAK Dubai", "Nightclub", "club", {
    blurb: "Celebrity-DJ nightclub.", activities: [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" }],
  })),
  single("ting-irie", "Ting Irie", "club", venue("Ting Irie", "Jamaican restaurant & lounge", "club", {
    palette: { floor: "#14532d", wall: "#1c1917", accent: "#facc15", light: "#22c55e" },
    blurb: "Jamaican food, reggae and dancehall nights.",
    extraProducts: [{ id: "ting-irie:jerk", name: "Jerk chicken", price: 85, icon: "🍗", station: "bar", desc: "Smoky jerk chicken with rice and peas.", consumable: { need: "hunger", amount: 40 } }],
    activities: [{ id: "dance", label: "Dance to the dancehall set", icon: "💃", animation: "dance" }],
  })),
  single("burj-khalifa", "Burj Khalifa", "attraction", attraction("At the Top, Burj Khalifa", "Observation decks on levels 124, 125 and 148 of the world's tallest building.", "skyline", [
    ticket("at-the-top:124", "At the Top — Levels 124 & 125", 169, "Non-prime hours. Prime sunset slots cost more."),
    ticket("at-the-top:prime", "At the Top — prime hours", 250, "Sunset entry, Levels 124 & 125."),
    ticket("at-the-top:sky", "At the Top SKY — Level 148", 399, "Lounge, refreshments and guided tour.", "🌆"),
  ], [{ id: "telescope", label: "Look through the telescope", icon: "🔭", animation: "wave", reward: 0 }])),
  single("dubai-aquarium", "Dubai Aquarium & Underwater Zoo", "attraction", attraction("Dubai Aquarium & Underwater Zoo", "A 10-million-litre tank with sharks and rays, plus the Underwater Zoo.", "aquarium", [
    ticket("aquarium:entry", "Aquarium Tunnel + Underwater Zoo", 175, "Online price; AED 200 at the gate.", "🐠"),
    ticket("aquarium:boat", "Glass-bottom boat ride", 45, "Float over the sharks.", "🚤"),
  ], [{ id: "spot-shark", label: "Spot the sand tiger shark", icon: "🦈", animation: "clap", reward: 50 }])),
  single("motf", "Museum of the Future", "attraction", attraction("Museum of the Future", "Immersive exhibitions imagining life in 2071.", "exhibits", [
    ticket("motf:entry", "General admission", 149, "Timed entry to all floors.", "🔮"),
  ], [{ id: "explore", label: "Complete the discovery trail", icon: "🧭", animation: "clap", reward: 100 }])),
  single("dubai-frame", "Dubai Frame", "attraction", attraction("Dubai Frame", "150 m picture frame with a glass-floored sky bridge between old and new Dubai.", "frame", [
    ticket("dubai-frame:entry", "Dubai Frame entry", 50, "Sky deck and the glass bridge.", "🖼️"),
  ], [{ id: "glass-floor", label: "Step onto the glass floor", icon: "😱", animation: "clap", reward: 25 }])),
  single("dubai-opera", "Dubai Opera", "attraction", attraction("Dubai Opera", "Dhow-shaped performing-arts venue for opera, ballet and concerts.", "stage", [
    ticket("opera:stalls", "Show ticket — Stalls", 450, "Tonight's performance.", "🎭"),
    ticket("opera:balcony", "Show ticket — Balcony", 250, "Great view from above.", "🎭"),
    ticket("opera:tour", "Backstage architectural tour", 120, "Behind the scenes of the dhow.", "🏛️"),
  ], [{ id: "applaud", label: "Give a standing ovation", icon: "👏", animation: "clap" }])),
  single("dubai-fountain", "The Dubai Fountain", "park", venue("The Dubai Fountain", "Attraction", "hotel", {
    role: "Boardwalk guide", noJob: true,
    layout: "outdoor", palette: PALETTES.park, feature: "pool", blurb: "World's largest choreographed fountain — shows every 30 minutes in the evening.",
    products: [ticket("fountain:abra", "Lake abra ride", 68, "Traditional boat ride during the show.", "🛶"), ticket("fountain:boardwalk", "Fountain Boardwalk", 20, "Walk out onto the lake, metres from the jets.", "🌊")],
    activities: [{ id: "watch", label: "Watch the fountain show (free)", icon: "⛲", animation: "clap", reward: 0 }],
  })),
  single("burj-park", "Burj Park", "park", venue("Burj Park", "Park", "hotel", {
    role: "Park ranger", noJob: true,
    layout: "outdoor", palette: PALETTES.park, blurb: "Lawns beside Burj Khalifa — picnics, fitness and events.",
    products: [ticket("burj-park:bike", "Bike rental (1 hour)", 50, "Cycle the boulevard loop.", "🚲")],
    activities: [
      { id: "picnic", label: "Have a picnic", icon: "🧺", animation: "sit" },
      { id: "workout", label: "Fitness challenge", icon: "🏋️", animation: "clap", reward: 40 },
    ],
  })),
];

const BY_ID = new Map(PLACES.map((p) => [p.id, p]));

/** The place a map entity represents, if it can be visited. */
export function placeForEntity(entity: { id: string; type: string; name?: string }): Place | null {
  const named = BY_ID.get(entity.id);
  if (named) return named;
  if (entity.type === "tall-building") return { id: entity.id, name: entity.name ?? "Residential tower", kind: "residential", blurb: "Residential tower — browse its flats.", venues: [] };
  if (entity.type === "dubai-villa" || entity.type === "small-house") return { id: entity.id, name: entity.name ?? "Home", kind: "home", blurb: "Private home.", venues: [] };
  return null;
}

export const getPlace = (id: string) => BY_ID.get(id) ?? null;
export const getVenue = (placeId: string, venueId: string) => getPlace(placeId)?.venues.find((v) => v.id === venueId) ?? null;
