// What each building on the city map is, and what's inside.
// Directories are based on published tenant lists for each venue (2025–26); line-ups change, so
// treat them as representative. Store names are used to identify real places; product names are generic.

import { catalog, jobFor, type CatalogKey } from "./catalog";
import type { JobDef, Layout, Palette, Place, Product, Venue } from "./types";
import { menu, menuJob, type Cuisine } from "./menus";

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
  /** A job written for this venue (e.g. an outlet with its own menu). */
  job?: JobDef;
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
    job: opts.comingSoon || opts.noJob ? undefined : opts.job ?? jobFor(key, id),
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
  products: catalog("hotel", slug(name)).filter((x) => /^(spa|afternoon-tea)$/.test(x.id.split(":").pop() ?? "")),
});
const pool = (name: string) => venue(name, "Pool", "hotel", {
  role: "Pool attendant", noJob: true,
  layout: "outdoor", feature: "pool", palette: PALETTES.lobby, blurb: "Loungers, cabanas and poolside drinks.",
  products: catalog("hotel", slug(name)).filter((x) => /^(pool|room-service)$/.test(x.id.split(":").pop() ?? "")),
  activities: [{ id: "lounge", label: "Lounge by the pool", icon: "🏖️", animation: "sit" }],
});

// ---------------------------------------------------------------- places

const single = (id: string, name: string, kind: Place["kind"], v: Venue): Place => ({ id, name, kind, blurb: v.blurb, venues: [v] });

const attraction = (name: string, blurb: string, feature: Venue["feature"], products: Product[], activities?: Venue["activities"]) =>
  venue(name, "Attraction", "hotel", { layout: "lobby", feature, palette: PALETTES.lobby, blurb, products, activities, role: "Guest services", noJob: true });

// ---------------------------------------------------------------- Palm Jumeirah
// Hotels and attractions on the Palm (see lib/city/palm.ts for where each one stands). Every hotel has a
// lobby, a café, its restaurants, a pool bar, its beach and a spa, in the hotel's own colours, each with
// a menu (lib/city/menus.ts). Outlets with a real name use it (the well-known ones at each property,
// 2025–26); others are labelled by hotel and cuisine rather than given an invented brand.

interface Brand { floor: string; wall: string; accent: string; light?: string }

/** A hotel restaurant, café or lounge with its own menu and shift. */
function outlet(name: string, category: string, cuisine: Cuisine, brand: Brand, opts: VenueOpts = {}): Venue {
  const id = slug(name);
  const products = menu(id, cuisine);
  const key: CatalogKey = cuisine === "cafe" || cuisine === "wellness" ? "cafe" : "restaurant";
  return venue(name, category, key, {
    palette: { floor: brand.floor, wall: brand.wall, accent: brand.accent, light: brand.light }, products,
    job: menuJob(key === "cafe" ? "Barista" : "Server", key === "cafe" ? 320 : 360, products), ...opts,
  });
}

/** A rooftop or sky lounge: DJ, bar and bottle service. */
const lounge = (name: string, category: string, brand: Brand, blurb: string) => {
  const products = [...menu(slug(name), "lounge"), ...catalog("club", slug(name)).filter((x) => /:(bottle-service|vip-table|dj-gift|entry)$/.test(x.id))];
  return venue(name, category, "club", {
    palette: { floor: "#0b0b12", wall: "#12121c", accent: brand.accent, light: brand.light ?? brand.accent }, feature: "skyline", blurb, products,
    job: menuJob("Bartender", 380, products),
    activities: [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" }],
  });
};

const POOL_PASS = (id: string, price: number): Product[] => [
  { id: `${id}:day-pass`, name: "Pool & beach day pass", price, icon: "🏊", station: "tickets", desc: "Lounger, towel and pool access for the day.", service: true, consumable: { need: "fun", amount: 25 } },
  { id: `${id}:cabana`, name: "Private cabana", price: price * 4, icon: "⛱️", station: "tickets", desc: "Shaded cabana for four with a dedicated host.", service: true, consumable: { need: "social", amount: 25 } },
];

/** The pool with its pool bar. */
const poolBar = (name: string, brand: Brand, price: number, blurb = "Infinity pool with a swim-up bar, loungers and cabanas.") => venue(name, "Pool & pool bar", "hotel", {
  role: "Pool attendant", layout: "outdoor", feature: "pool", palette: { floor: "#e7e5e4", wall: brand.wall, accent: brand.accent }, blurb,
  products: [...POOL_PASS(slug(name), price), ...menu(slug(name), "pool", true)], noJob: true,
  activities: [{ id: "swim", label: "Go for a swim", icon: "🏊", animation: "clap", reward: 15 }, { id: "lounge", label: "Lounge by the pool", icon: "🏖️", animation: "sit" }],
});

/** The hotel's private beach and beach bar. */
const beach = (name: string, brand: Brand, blurb = "Private beach on the Arabian Gulf with a beach bar and water sports.") => venue(name, "Private beach", "hotel", {
  role: "Beach attendant", layout: "outdoor", feature: "pool", palette: { floor: "#fde68a", wall: brand.wall, accent: brand.accent }, blurb,
  products: menu(slug(name), "beach", true), noJob: true,
  activities: [{ id: "swim", label: "Swim in the sea", icon: "🌊", animation: "clap", reward: 15 }, { id: "sunbathe", label: "Sunbathe", icon: "🏖️", animation: "sit" }],
});

const brandSpa = (name: string, brand: Brand, blurb = "Treatments, hammam and relaxation lounge.") => ({ ...spa(name), palette: { floor: brand.floor, wall: brand.wall, accent: brand.accent }, blurb });

/** The lobby: check in, rooms and suites at this hotel's rates. */
const lobby = (hotelName: string, brand: Brand, room: number, suite: string, suitePrice: number): Venue => {
  const id = slug(`${hotelName} Lobby & Reception`);
  return venue(`${hotelName} Lobby & Reception`, "Reception · rooms & concierge", "hotel", {
    palette: { floor: brand.floor, wall: brand.wall, accent: brand.accent }, blurb: `Check in, book a room or ask the concierge at ${hotelName}.`,
    products: [
      { id: `${id}:room`, name: "Sea-view room, 1 night", price: room, icon: "🛏️", station: "reception", desc: "King bed and a balcony over the Arabian Gulf.", service: true },
      { id: `${id}:suite`, name: `${suite}, 1 night`, price: suitePrice, icon: "🌅", station: "reception", desc: "Separate living room, butler service and beach views.", service: true },
      { id: `${id}:transfer`, name: "Airport limousine", price: 450, icon: "🚘", station: "reception", desc: "Chauffeur transfer to or from DXB.", service: true },
    ],
  });
};

interface HotelSpec {
  id: string; name: string; short: string; blurb: string; brand: Brand;
  room: number; suite: string; suitePrice: number;
  cafe?: Venue; outlets: Venue[]; spa: string; pool?: string; beach?: string; poolPrice?: number; extra?: Venue[];
}

/** A Palm hotel with everything guests use: lobby, café, restaurants, pool bar, beach and spa. */
function palmHotel(h: HotelSpec): Place {
  return {
    id: h.id, name: h.name, kind: "hotel", blurb: h.blurb,
    venues: [
      lobby(h.name, h.brand, h.room, h.suite, h.suitePrice),
      h.cafe ?? outlet(`${h.short} · Lobby Café`, "Café · lobby lounge", "cafe", h.brand, { blurb: "Coffee, pastries and afternoon tea in the lobby." }),
      ...h.outlets,
      poolBar(h.pool ?? `${h.short} · Pool & Bar`, h.brand, h.poolPrice ?? 350),
      beach(h.beach ?? `${h.short} · Private Beach`, h.brand),
      brandSpa(h.spa, h.brand),
      ...(h.extra ?? []),
    ],
  };
}

const B = {
  atlantis: { floor: "#f3e3dc", wall: "#fff1ec", accent: "#e11d48", light: "#38bdf8" },
  royal: { floor: "#e7e5e4", wall: "#fafaf9", accent: "#0f766e", light: "#2dd4bf" },
  oneonly: { floor: "#efe6d8", wall: "#fbf7f0", accent: "#0f766e" },
  w: { floor: "#1c1917", wall: "#27272a", accent: "#ec4899", light: "#ec4899" },
  raffles: { floor: "#efe6d8", wall: "#fbf7f0", accent: "#a16207" },
  zabeel: { floor: "#5b2c1e", wall: "#f3e4cf", accent: "#b45309" },
  kempinski: { floor: "#e2e8f0", wall: "#f8fafc", accent: "#1e3a8a" },
  sixsenses: { floor: "#d6c7ad", wall: "#f5efe3", accent: "#4d7c0f" },
  waldorf: { floor: "#1c1917", wall: "#f5f5f4", accent: "#b08d57" },
  anantara: { floor: "#7c4a1e", wall: "#f3e4cf", accent: "#92400e" },
  taj: { floor: "#efe1c6", wall: "#fdf6e3", accent: "#9f1239" },
  sofitel: { floor: "#e7e5e4", wall: "#fafaf9", accent: "#1e3a8a" },
  rixos: { floor: "#e0f2fe", wall: "#f8fafc", accent: "#0369a1" },
  five: { floor: "#18181b", wall: "#27272a", accent: "#a855f7", light: "#d946ef" },
  fairmont: { floor: "#eadfcf", wall: "#f8f3ea", accent: "#a16207" },
} satisfies Record<string, Brand>;

const beachClub = (name: string, blurb: string) => venue(name, "Beach club", "club", {
  layout: "outdoor", feature: "pool", palette: PALETTES.lobby, blurb, products: menu(slug(name), "beach", true), job: menuJob("Beach host", 360, menu(slug(name), "beach", true)),
  activities: [{ id: "dance", label: "Dance by the water", icon: "💃", animation: "dance" }, { id: "lounge", label: "Sunbathe on a daybed", icon: "🏖️", animation: "sit" }],
});

const PALM_PLACES: Place[] = [
  palmHotel({
    id: "atlantis-the-palm", name: "Atlantis, The Palm", short: "Atlantis", brand: B.atlantis, room: 1950, suite: "Imperial Club suite", suitePrice: 6500, spa: "ShuiQi Spa",
    blurb: "The pink landmark at the tip of the crescent: Aquaventure, The Lost Chambers and celebrity-chef dining.",
    outlets: [
      outlet("Ossiano", "Underwater fine dining", "seafood", B.atlantis, { feature: "aquarium", palette: PALETTES.night, blurb: "Tasting menus beside the Ambassador Lagoon's floor-to-ceiling aquarium." }),
      outlet("Nobu Dubai", "Japanese restaurant", "japanese", B.atlantis, { blurb: "Nobu Matsuhisa's signature black cod and sushi." }),
      outlet("Saffron", "International buffet", "buffet", B.atlantis, { blurb: "Atlantis's big buffet, famous for Friday brunch." }),
      beachClub("White Beach", "Atlantis's beach club with DJs, pools and Arabian Gulf sunsets."),
    ],
    extra: [
      attraction("Aquaventure Waterpark", "One of the world's largest waterparks — the Leap of Faith drops through a shark lagoon.", "pool", [
        ticket("aquaventure:day", "Aquaventure day pass", 349, "Every slide and the private beach, all day.", "🌊"),
        ticket("aquaventure:leap", "Leap of Faith fast track", 150, "Skip the queue for the shark-tank slide.", "🦈"),
      ], [{ id: "leap", label: "Ride the Leap of Faith", icon: "🌊", animation: "clap", reward: 60 }]),
      attraction("The Lost Chambers Aquarium", "Walk the ruins of Atlantis among 65,000 marine animals.", "aquarium", [
        ticket("lost-chambers:entry", "The Lost Chambers entry", 135, "Self-guided tunnels and the Ambassador Lagoon.", "🐠"),
      ], [{ id: "spot-ray", label: "Spot the giant manta", icon: "🐟", animation: "clap", reward: 40 }]),
    ],
  }),
  palmHotel({
    id: "atlantis-the-royal", name: "Atlantis The Royal", short: "Atlantis The Royal", brand: B.royal, room: 3800, suite: "Sky pool suite", suitePrice: 14500, spa: "AWAKEN Spa",
    blurb: "Stacked ultra-luxury resort beside Atlantis, with the Cloud 22 sky pool and a line-up of celebrity chefs.",
    pool: "Cloud 22", poolPrice: 750,
    outlets: [
      outlet("Dinner by Heston Blumenthal", "Modern British restaurant", "british", B.royal),
      outlet("Ariana's Persian Kitchen", "Persian restaurant", "persian", B.royal),
      outlet("Jaleo by José Andrés", "Spanish tapas", "spanish", B.royal),
      outlet("La Mar by Gastón Acurio", "Peruvian restaurant", "nikkei", B.royal),
      outlet("Estiatorio Milos", "Greek seafood restaurant", "greek", B.royal),
      lounge("Ling Ling", "Asian restaurant & lounge", B.royal, "Late-night Asian lounge with DJs."),
    ],
    beach: "Nobu by the Beach",
  }),
  palmHotel({
    id: "one-and-only-the-palm", name: "One&Only The Palm", short: "One&Only The Palm", brand: B.oneonly, room: 3200, suite: "Beachfront villa", suitePrice: 12000, spa: "One&Only Spa",
    blurb: "Boutique Moorish-style resort at the west end of the crescent, facing Dubai Marina.",
    outlets: [outlet("101 Dining Lounge and Bar", "Over-water restaurant", "seafood", B.oneonly, { feature: "skyline", blurb: "Dining on a pier with the Marina skyline across the water." })],
  }),
  palmHotel({
    id: "w-dubai-the-palm", name: "W Dubai – The Palm", short: "W Dubai – The Palm", brand: B.w, room: 1600, suite: "Wow suite", suitePrice: 7500, spa: "AWAY Spa",
    blurb: "Playful resort on the west crescent with a rooftop lounge and pool parties.",
    cafe: outlet("W Lounge", "Lobby bar & café", "cafe", B.w),
    outlets: [
      outlet("Akira Back", "Japanese-Korean restaurant", "japanese", B.w),
      lounge("SoBe", "Rooftop lounge", B.w, "Sunset rooftop with DJs and Ain Dubai views."),
    ],
    pool: "WET Deck",
  }),
  palmHotel({
    id: "raffles-the-palm", name: "Raffles The Palm Dubai", short: "Raffles The Palm", brand: B.raffles, room: 2400, suite: "Raffles villa", suitePrice: 9500, spa: "Raffles Spa",
    blurb: "Palatial resort on the west crescent with villas and a long private beach.",
    outlets: [outlet("Raffles The Palm · Mediterranean Dining", "Mediterranean restaurant", "italian", B.raffles)],
  }),
  palmHotel({
    id: "jumeirah-zabeel-saray", name: "Jumeirah Zabeel Saray", short: "Zabeel Saray", brand: B.zabeel, room: 1500, suite: "Royal residence", suitePrice: 8000, spa: "Talise Ottoman Spa",
    blurb: "Ottoman-palace resort on the west crescent, home to the Talise Ottoman Spa.",
    outlets: [
      outlet("Amala", "Indian restaurant", "indian", B.zabeel),
      outlet("Zabeel Saray · Turkish Kitchen", "Turkish restaurant", "turkish", B.zabeel),
    ],
  }),
  palmHotel({
    id: "kempinski-palm-jumeirah", name: "Kempinski Hotel & Residences Palm Jumeirah", short: "Kempinski", brand: B.kempinski, room: 1300, suite: "Sea-view suite", suitePrice: 4200, spa: "Kempinski Spa",
    blurb: "Contemporary beach hotel near Atlantis on the west crescent.",
    outlets: [outlet("Kempinski · Seafood Grill", "Seafood restaurant", "seafood", B.kempinski)],
  }),
  palmHotel({
    id: "six-senses-the-palm", name: "Six Senses The Palm", short: "Six Senses", brand: B.sixsenses, room: 3500, suite: "Penthouse suite", suitePrice: 15000, spa: "Six Senses Spa",
    blurb: "Wellness-led resort of sea-facing suites on the west crescent (opened 2026).",
    cafe: outlet("Six Senses · Wellness Café", "Café · healthy menu", "wellness", B.sixsenses),
    outlets: [outlet("Six Senses · Mediterranean Dining", "Mediterranean restaurant", "greek", B.sixsenses)],
  }),
  palmHotel({
    id: "waldorf-astoria-palm", name: "Waldorf Astoria Dubai Palm Jumeirah", short: "Waldorf Astoria", brand: B.waldorf, room: 2100, suite: "Royal suite", suitePrice: 9000, spa: "Waldorf Astoria Spa",
    blurb: "Grand beach resort on the east crescent.",
    cafe: outlet("Peacock Alley", "Lobby lounge", "cafe", B.waldorf, { blurb: "The Waldorf's lobby lounge: coffee by day, afternoon tea at four." }),
    outlets: [outlet("Lao", "Southeast Asian restaurant", "thai", B.waldorf)],
  }),
  palmHotel({
    id: "anantara-the-palm", name: "Anantara The Palm Dubai Resort", short: "Anantara The Palm", brand: B.anantara, room: 1400, suite: "Over-water villa", suitePrice: 6000, spa: "Anantara Spa",
    blurb: "Thai-inspired resort on the east crescent with over-water villas.",
    outlets: [
      outlet("Mekong", "Thai, Vietnamese & Chinese restaurant", "thai", B.anantara),
      outlet("Bushman's", "Australian grill", "steak", B.anantara),
    ],
  }),
  palmHotel({
    id: "taj-exotica-the-palm", name: "Taj Exotica Resort & Spa, The Palm", short: "Taj Exotica", brand: B.taj, room: 1700, suite: "Grand Luxury suite", suitePrice: 7000, spa: "J Wellness Circle",
    blurb: "Indian-palace style resort on the east crescent.",
    outlets: [outlet("Taj Exotica · Indian Kitchen", "Indian restaurant", "indian", B.taj)],
  }),
  palmHotel({
    id: "sofitel-the-palm", name: "Sofitel Dubai The Palm", short: "Sofitel The Palm", brand: B.sofitel, room: 1100, suite: "Prestige suite", suitePrice: 3800, spa: "So SPA",
    blurb: "Polynesian-style beach resort on the east crescent.",
    outlets: [outlet("Sofitel The Palm · French Brasserie", "French restaurant", "french", B.sofitel)],
  }),
  palmHotel({
    id: "rixos-the-palm", name: "Rixos The Palm Dubai", short: "Rixos The Palm", brand: B.rixos, room: 1600, suite: "Deluxe suite", suitePrice: 4500, spa: "Anjana Spa",
    blurb: "All-inclusive beach resort at the east end of the crescent.",
    outlets: [outlet("Rixos The Palm · Turkish Kitchen", "Turkish restaurant", "turkish", B.rixos)],
  }),
  palmHotel({
    id: "five-palm-jumeirah", name: "FIVE Palm Jumeirah", short: "FIVE Palm", brand: B.five, room: 1250, suite: "Penthouse suite", suitePrice: 9000, spa: "ZEN Spa",
    blurb: "Party hotel at the base of the trunk, famous for its beach club and rooftop.",
    outlets: [
      outlet("Maiden Shanghai", "Chinese restaurant", "chinese", B.five),
      venue("The Penthouse", "Rooftop club", "club", { palette: PALETTES.club, feature: "skyline", blurb: "Rooftop nightclub with Marina views.", activities: [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" }] }),
    ],
    beach: "Beach by FIVE",
  }),
  palmHotel({
    id: "fairmont-the-palm", name: "Fairmont The Palm", short: "Fairmont The Palm", brand: B.fairmont, room: 1050, suite: "Signature suite", suitePrice: 3500, spa: "Willow Stream Spa",
    blurb: "Family resort on the west side of the trunk.",
    outlets: [
      outlet("Frevo", "Brazilian churrascaria", "brazilian", B.fairmont),
      outlet("Little Miss India", "Indian restaurant", "indian", B.fairmont),
    ],
  }),
  {
    id: "the-palm-tower", name: "The Palm Tower", kind: "attraction", blurb: "52-storey tower on the spine: St. Regis hotel, The View at The Palm and the Aura sky pool.",
    venues: [
      attraction("The View at The Palm", "Observation deck on level 52 with 360° views of the Palm and the coast.", "skyline", [
        ticket("the-view:entry", "The View at The Palm", 100, "Level 52 observation deck.", "🌴"),
      ], [{ id: "photo", label: "Take the Palm photo", icon: "📸", animation: "wave", reward: 30 }]),
      venue("St. Regis Dubai, The Palm", "Hotel reception", "hotel", { blurb: "Check in at the St. Regis, on the tower's first 18 floors." }),
      venue("AURA Skypool", "Sky pool & lounge", "club", { layout: "outdoor", feature: "pool", palette: PALETTES.lobby, blurb: "360° infinity pool about 200 m up.", activities: [{ id: "lounge", label: "Lounge at the sky pool", icon: "🏊", animation: "sit" }] }),
      venue("SUSHISAMBA", "Japanese-Brazilian-Peruvian restaurant · Level 51", "restaurant", { palette: PALETTES.night, feature: "skyline" }),
    ],
  },
  {
    id: "palm-jumeirah-mall", name: "Palm Jumeirah Mall", kind: "mall",
    blurb: "The Palm's main mall at the foot of The Palm Tower (Nakheel Mall until its 2025 relaunch).",
    venues: [
      venue("Paul Smith", "Fashion", "fashion"),
      venue("Lacoste", "Fashion", "fashion"),
      venue("Lululemon", "Sportswear", "sports"),
      venue("Kartell", "Home", "home"),
      venue("LEGO", "Toys", "toys"),
      venue("Waitrose", "Supermarket", "supermarket"),
    ],
    categories: ["Fashion", "Sportswear", "Home", "Toys", "Supermarket"],
  },
  {
    id: "golden-mile-galleria", name: "Golden Mile Galleria", kind: "mall",
    blurb: "Nakheel's community shopping and dining centre under the Golden Mile towers, with terraces over Al Ittihad Park.",
    venues: [
      venue("Spinneys", "Supermarket", "supermarket"),
      venue("Aldo", "Footwear", "fashion"),
      venue("Marina Pharmacy", "Pharmacy & health", "pharmacy"),
      venue("Magrabi", "Eyewear", "eyewear"),
      venue("Tim Hortons", "Café", "cafe"),
      venue("Caffè Nero", "Café", "cafe"),
      venue("Wagamama", "Restaurant", "restaurant"),
      venue("Nando's", "Restaurant", "restaurant"),
    ],
    categories: ["Supermarket", "Footwear", "Pharmacy & health", "Eyewear", "Café", "Restaurant"],
  },
  single("club-vista-mare", "Club Vista Mare", "food-hall", venue("Club Vista Mare", "Beachfront dining", "restaurant", {
    layout: "outdoor", feature: "pool", palette: PALETTES.lobby,
    blurb: "Nakheel's beachfront collection of restaurants and beach access on the trunk.",
  })),
  {
    id: "the-pointe", name: "The Pointe", kind: "attraction", blurb: "Restaurants and a public beach at the tip of the Palm, facing Atlantis, with a record-breaking fountain show.",
    venues: [
      venue("The Pointe", "Waterfront dining", "restaurant", {
        layout: "outdoor", feature: "pool", palette: PALETTES.lobby, noJob: true,
        blurb: "Restaurants on the promenade facing Atlantis.",
        activities: [{ id: "fountain", label: "Watch The Pointe fountain show", icon: "⛲", animation: "clap", reward: 0 }],
      }),
      venue("The Pointe Beach", "Public beach", "hotel", {
        role: "Lifeguard", noJob: true, layout: "outdoor", feature: "pool", palette: PALETTES.park, products: [],
        blurb: "Free public beach beside The Pointe, looking across the water to Atlantis.",
        activities: [{ id: "swim", label: "Go for a swim", icon: "🏊", animation: "clap", reward: 20 }, { id: "sunbathe", label: "Sunbathe", icon: "🏖️", animation: "sit" }],
      }),
    ],
  },
  {
    id: "palm-west-beach", name: "Palm West Beach", kind: "park", blurb: "A 1.6 km beach along the west shore of the trunk, lined with beach clubs, with Ain Dubai sunsets.",
    venues: [
      venue("Palm West Beach", "Beach", "hotel", {
        role: "Lifeguard", noJob: true, layout: "outdoor", feature: "pool", palette: PALETTES.park, products: [],
        blurb: "The beach itself: swim, sunbathe and watch the sun set over Ain Dubai.",
        activities: [{ id: "swim", label: "Go for a swim", icon: "🏊", animation: "clap", reward: 20 }, { id: "sunbathe", label: "Sunbathe", icon: "🏖️", animation: "sit" }],
      }),
      beachClub("Koko Bay", "Bali-inspired beachfront restaurant and club on West Beach."),
      beachClub("February 30", "Beach club from a Beirut brand, named after a day that doesn't exist."),
    ],
  },
  single("al-ittihad-park", "Al Ittihad Park", "park", venue("Al Ittihad Park", "Park", "hotel", {
    role: "Park ranger", noJob: true, layout: "outdoor", palette: PALETTES.park,
    blurb: "The UAE's first indigenous park: a linear park with a running track and outdoor gym down the middle of the trunk.",
    products: [],
    activities: [{ id: "run", label: "Run the park loop", icon: "🏃", animation: "clap", reward: 30 }, { id: "picnic", label: "Have a picnic", icon: "🧺", animation: "sit" }],
  })),
];

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
  single("dwtc", "Dubai World Trade Centre & One Central", "hotel", venue("Dubai World Trade Centre & One Central", "Business & Residences Hub", "electronics", {
    palette: PALETTES.tech,
    blurb: "Historic 39-storey Sheikh Rashid Tower & One Central metropolis — corporate offices, serviced apartments, and convention halls.",
    extraProducts: [
      ticket("dwtc:summit", "Global Tech Summit Pass", 150, "Full day access to trade exhibitions and keynote stages.", "🎟️"),
      ticket("dwtc:monkey-bar", "Monkey Bar Rooftop Sunset Drink", 85, "Craft beverage overlooking Museum of the Future.", "🍹"),
    ],
    activities: [
      { id: "dwtc:network", label: "Executive Networking at One Central", icon: "🤝", animation: "clap" },
    ],
  })),
  single("gevora", "Gevora Hotel & Residences", "hotel", venue("Gevora Hotel & Residences", "World's Tallest Hotel", "hotel", {
    palette: PALETTES.luxury,
    blurb: "World's tallest hotel (356m, 75 floors) with gleaming gold facade — 528 luxury suites, Highest View restaurant, and rooftop pool.",
    extraProducts: [
      ticket("gevora:highest-view", "Highest View Rooftop Dining & Pool", 175, "Rooftop lounge overlooking Burj Khalifa.", "🌆"),
      ticket("gevora:breakfast", "Gevora Kitchen Buffet Breakfast", 110, "International breakfast buffet.", "🍳"),
    ],
    activities: [
      { id: "gevora:gold-selfie", label: "Gold Pyramid Rooftop Selfie", icon: "📸", animation: "clap" },
    ],
  })),
  single("al-yaqoub", "Al Yaqoub Tower", "hotel", venue("Al Yaqoub Tower", "Big Ben Tower & Suites", "hotel", {
    palette: PALETTES.minimal,
    blurb: "The 328m 'Big Ben of Dubai' — mixed-use supertall with luxury hotel apartments, commercial offices, and observatory.",
    extraProducts: [
      ticket("yaqoub:deck", "Big Ben Spire Observation Entry", 95, "Panoramic views of Sheikh Zayed Road and Downtown.", "🕰️"),
      ticket("yaqoub:afternoon-tea", "Clocktower Afternoon Tea", 160, "Classic high tea with skyline vistas.", "🫖"),
    ],
    activities: [
      { id: "yaqoub:view", label: "Gaze at the 4-sided Clock Tower", icon: "⏰", animation: "wave" },
    ],
  })),
  single("the-index", "The Index Tower DIFC", "residential", venue("The Index Tower DIFC", "Offices & Sky Residences", "luxury", {
    palette: PALETTES.minimal,
    blurb: "Foster + Partners 80-storey supertall — 25 office floors, 520 luxury sky residences, Level 30 sky lobby and Index Mall.",
    extraProducts: [
      ticket("index:sky-pass", "Sky Lobby Lounge & Pool Pass", 190, "Level 30 double-height sky deck with heated indoor pool.", "🏊"),
      ticket("index:cowork", "DIFC Executive Workspace Day Pass", 120, "High-speed business lounge with DIFC views.", "💼"),
    ],
    activities: [
      { id: "index:swim", label: "Skyline Indoor Swimming Pool", icon: "🏊", animation: "sit" },
      { id: "index:admire", label: "Admire Foster + Partners Architecture", icon: "✨", animation: "clap" },
    ],
  })),
  single("emirates-towers", "Jumeirah Emirates Towers", "hotel", venue("Jumeirah Emirates Towers", "Offices, Hotel & Luxury Living", "hotel", {
    palette: PALETTES.luxury,
    blurb: "Iconic twin towers directly beside Museum of the Future — corporate headquarters, luxury suites, and The Boulevard dining.",
    extraProducts: [
      ticket("et:boulevard-pass", "The Boulevard VIP Dining Pass", 250, "Priority access to Ninive, Rib Room, and executive lounges.", "🥂"),
      ticket("et:wellness-day", "Talise Spa & Fitness Day Pass", 180, "Full access to pool, sauna, and health club.", "💆"),
    ],
    activities: [
      { id: "et:lounge", label: "Executive Sky Lounge", icon: "🍸", animation: "sit" },
      { id: "et:courtyard", label: "Walk the MOTF Connector Bridge", icon: "🏛️", animation: "wave" },
    ],
  })),
  single("one-zaabeel", "One Za'abeel & The Link", "hotel", venue("One Za'abeel & The Link", "Luxury Resort & Cantilever", "hotel", {
    palette: PALETTES.luxury,
    blurb: "Futuristic twin-tower architectural wonder featuring The Link — world's longest cantilever 100m in the air, infinity pool, and Michelin dining.",
    extraProducts: [
      ticket("oz:link-pool", "The Link Infinity Pool Day Pass", 250, "Full access to the 100m high suspended pool.", "🏊"),
      ticket("oz:tapasake", "Tapasake Poolside Lunch Set", 195, "Nikkei luxury poolside dining.", "🍣"),
    ],
    activities: [
      { id: "oz:walk", label: "Walk the Suspended Cantilever", icon: "🌉", animation: "wave" },
      { id: "oz:sunset", label: "Watch Sunset from The Link", icon: "🌅", animation: "sit" },
    ],
  })),
  single("ritz-carlton-difc", "The Ritz-Carlton DIFC", "hotel", venue("The Ritz-Carlton DIFC", "5-Star Luxury Hotel", "hotel", {
    palette: PALETTES.luxury,
    blurb: "Prestige luxury hotel in the heart of DIFC with limestone porticos, sunken courtyard, and world-class spa.",
    extraProducts: [
      ticket("rc:spa", "Ritz-Carlton Spa Relaxation Ritual", 320, "60-minute massage and hydrothermal suite.", "💆"),
      ticket("rc:belgian", "Belgian Beer Café Tasting Platter", 145, "Artisan bites and Belgian craft drinks.", "🍺"),
    ],
    activities: [
      { id: "rc:courtyard", label: "Stroll the Sunken Garden", icon: "🌿", animation: "sit" },
    ],
  })),
  single("difc-mosque", "DIFC Grand Mosque", "attraction", attraction("DIFC Grand Mosque", "Gate Avenue's modern geometric Islamic architectural masterpiece with Mashrabiya screens.", "exhibits", [
    ticket("dm:tour", "Architectural & Cultural Tour", 0, "Complimentary guided tour of the Mashrabiya design.", "🕌"),
  ], [{ id: "dm:pray", label: "Quiet Reflection & Prayer", icon: "✨", animation: "sit", reward: 20 }])),
  single("zabeel-mosque", "Za'abeel Grand Mosque", "attraction", attraction("Za'abeel Grand Mosque", "Royal Emirati grand mosque with majestic golden central dome, twin minarets and marble court.", "exhibits", [
    ticket("zm:visit", "Courtyard Cultural Visit", 0, "Explore the grand arched colonnades and dome.", "🕌"),
  ], [{ id: "zm:admire", label: "Admire Royal Islamic Architecture", icon: "🕌", animation: "clap", reward: 20 }])),
  single("zuma-difc", "Zuma Dubai DIFC", "food-hall", venue("Zuma Dubai", "Contemporary Japanese Izakaya", "restaurant", {
    palette: PALETTES.dining,
    blurb: "Perennial award-winning Japanese izakaya in Gate Village — sushi counter, robata grill, and lounge.",
    extraProducts: [
      { id: "zuma:black-cod", name: "Miso-marinated Black Cod", price: 215, icon: "🐟", station: "bar", desc: "Zuma's signature dish wrapped in hoba leaf.", consumable: { need: "hunger", amount: 65 } },
      { id: "zuma:cocktail", name: "Rubabu Craft Cocktail", price: 78, icon: "🍸", station: "bar", desc: "Rhubarb infused craft drink.", consumable: { need: "fun", amount: 30 } },
    ],
    activities: [{ id: "zuma:dine", label: "Robata Grill Experience", icon: "🥢", animation: "sit" }],
  })),
  single("amazonico-difc", "Amazónico DIFC", "food-hall", venue("Amazónico Dubai", "Rainforest Gastronomic Spectacle", "restaurant", {
    palette: PALETTES.dining,
    blurb: "3-storey Latin American rainforest dining adventure with tropical foliage, sushi bar, and rooftop beats.",
    extraProducts: [
      { id: "amz:picanha", name: "Picanha Rodizio Skewers", price: 195, icon: "🥩", station: "bar", desc: "Prime Brazilian grilled rump cap.", consumable: { need: "hunger", amount: 60 } },
      { id: "amz:caipirinha", name: "Amazónico Caipirinha", price: 75, icon: "🍹", station: "bar", desc: "Fresh lime, cachaca and passionfruit.", consumable: { need: "fun", amount: 25 } },
    ],
    activities: [{ id: "amz:rooftop", label: "Jungle Rooftop Sunset Session", icon: "🌴", animation: "dance" }],
  })),
  single("lpm-difc", "LPM Restaurant & Bar", "food-hall", venue("LPM Dubai", "French Mediterranean Riviera", "restaurant", {
    palette: PALETTES.dining,
    blurb: "French Mediterranean culinary legend in Gate Village — warm Riviera bistro atmosphere and fresh seasonal cooking.",
    extraProducts: [
      { id: "lpm:burrata", name: "Burrata et Tomates", price: 115, icon: "🧀", station: "bar", desc: "Creamy burrata with sweet baby tomatoes.", consumable: { need: "hunger", amount: 45 } },
      { id: "lpm:lamb", name: "Côtelettes d'Agneau", price: 240, icon: "🍖", station: "bar", desc: "Grilled lamb cutlets with smoked aubergine.", consumable: { need: "hunger", amount: 65 } },
    ],
    activities: [{ id: "lpm:terrace", label: "Dine on the Provencal Terrace", icon: "🥖", animation: "sit" }],
  })),
  single("kiza-difc", "KIZA Pan-African Restaurant & Lounge", "club", venue("KIZA Dubai", "Pan-African Lounge & Nightclub", "club", {
    palette: PALETTES.dining,
    blurb: "Africa's premier luxury lounge and club in Emirates Financial Towers, DIFC — Afrobeat beats, Amapiano nights, and authentic African cuisine.",
    extraProducts: [
      { id: "kiza:suya", name: "KIZA Suya Beef Skewers", price: 110, icon: "🥩", station: "bar", desc: "Spicy grilled beef suya with traditional yaji spice and red onions.", consumable: { need: "hunger", amount: 45 } },
      { id: "kiza:jollof", name: "Royal Senegalese Jollof", price: 135, icon: "🍚", station: "bar", desc: "Smoky firewood jollof rice with fried plantains.", consumable: { need: "hunger", amount: 55 } },
      { id: "kiza:champagne", name: "VIP Afrobeat Champagne", price: 320, icon: "🍾", station: "bar", desc: "Bottle service at the VIP lounge table.", consumable: { need: "fun", amount: 45 } },
    ],
    activities: [
      { id: "kiza:amapiano", label: "Dance to Afrobeat & Amapiano", icon: "💃", animation: "dance", reward: 25 },
      { id: "kiza:vip", label: "Book the Gold VIP Booth", icon: "👑", animation: "sit" }
    ],
  })),
  single("babylon-difc", "Babylon DIFC", "club", venue("Babylon Dubai", "Luxury Dinner-and-Show Cabaret", "club", {
    palette: PALETTES.club,
    blurb: "Opulent dinner-club in Gate Village inspired by ancient Babylon, with theatrical cabaret performances and late-night DJs.",
    extraProducts: [
      { id: "babylon:champagne", name: "Dom Pérignon Vintage Glass", price: 290, icon: "🍾", station: "bar", desc: "Celebration champagne.", consumable: { need: "fun", amount: 40 } },
      { id: "babylon:caviar", name: "Oscietra Caviar 30g", price: 450, icon: "🥂", station: "bar", desc: "Served with blinis and traditional accoutrements.", consumable: { need: "hunger", amount: 35 } },
    ],
    activities: [{ id: "babylon:show", label: "Watch the Cabaret Spectacular", icon: "💃", animation: "dance" }],
  })),
  single("sphere-zaabeel", "Sphere at The Link", "club", venue("Sphere at The Link", "Suspended Cantilever Sky Lounge", "club", {
    palette: PALETTES.night,
    blurb: "Futuristic nightlife destination suspended 100m above Dubai inside The Link at One Za'abeel.",
    extraProducts: [
      { id: "sphere:cocktail", name: "Zero-Gravity Mixology", price: 95, icon: "🍸", station: "bar", desc: "Molecular signature cocktail with skyline views.", consumable: { need: "fun", amount: 35 } },
    ],
    activities: [{ id: "sphere:party", label: "High-Altitude DJ Session", icon: "🎧", animation: "dance" }],
  })),
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
  ...PALM_PLACES,
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
