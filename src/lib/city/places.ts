// What each building on the city map is, and what's inside.
// Directories are based on published tenant lists for each venue (2025–26); line-ups change, so
// treat them as representative. Store names are used to identify real places; product names are generic.

import { catalog, jobFor, type CatalogKey } from "./catalog";
import type { JobDef, Layout, Palette, Place, Product, Venue, VenueActivity } from "./types";
import { menu, menuJob, type Cuisine } from "./menus";
import { rideActivities } from "./rides";

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

/**
 * What a venue really is, as a 3D space: a waterpark has slides and pools, a beach has sand and sea, a
 * spa has treatment rooms… Worked out from its name, category and feature, so every place (including
 * ones added elsewhere) gets the right scene without each one saying so.
 */
function sceneFor(name: string, category: string, layout: Layout, feature: Venue["feature"]): { layout: Layout; feature: Venue["feature"] } {
  const text = `${name} ${category}`;
  if (/waterpark|aquaventure|wild wadi/i.test(text)) return { layout: "waterpark", feature: "pool" };
  // A beach by what it is (not by a name like "Jumeirah Beach Hotel").
  if (/beach|truck/i.test(category) || /abra|kitesurf/i.test(name)) return { layout: "beach", feature: "pool" };
  if (/^spa$/i.test(category) || /\bspa\b/i.test(category)) return { layout: "spa", feature: "spa" };
  if (/kids club/i.test(name) || (/pool/i.test(text) && layout === "outdoor")) return { layout: "pooldeck", feature: /sky/i.test(text) ? "skyline" : "pool" };
  if (feature === "stage" || /theatre|theater|cinema|opera/i.test(name)) return { layout: "theatre", feature: "stage" };
  if (/mosque/i.test(name)) return { layout: "mosque", feature };
  if (/ice rink/i.test(name)) return { layout: "rink", feature };
  if (/bowling/i.test(category)) return { layout: "bowling", feature };
  // Cocktail and sky bars are bars, not nightclubs.
  if (layout === "club" && /\bbar\b|tiki/i.test(category) && !/nightclub|\bclub\b/i.test(category)) return { layout: "bar", feature: feature ?? "skyline" };
  // Waterfront dining is a restaurant with a view, not a lawn.
  if (layout === "outdoor" && /dining/i.test(category)) return { layout: "dining", feature: "skyline" };
  return { layout, feature };
}

function venue(name: string, category: string, key: CatalogKey, opts: VenueOpts = {}): Venue {
  const id = slug(name);
  const scene = sceneFor(name, category, opts.layout ?? LAYOUT[key], opts.feature);
  const greeting = key === "club" ? "Welcome! Ticket and table bookings are with me." : key === "hotel" ? "Welcome — how may I help you today?" : "Hi! Let me know if you need any help.";
  return {
    id,
    name,
    category,
    layout: scene.layout,
    blurb: opts.blurb ?? `${category} at ${name}.`,
    palette: opts.palette ?? PALETTE_FOR[key],
    zone: opts.zone,
    comingSoon: opts.comingSoon,
    feature: scene.feature,
    products: [...(opts.products ?? catalog(key, id)), ...(opts.extraProducts ?? [])],
    staff: staffFor(opts.role ?? ROLE[key] ?? "Staff", opts.role ? "Welcome! Tickets and information are with me." : greeting),
    job: opts.comingSoon || opts.noJob ? undefined : opts.job ?? jobFor(key, id),
    activities: withRides(scene.layout, name, category, opts),
  };
}

/** Waterparks, pools and beaches get their rides and water activities, acted out in 3D. */
function withRides(layout: Layout, name: string, category: string, opts: VenueOpts): Venue["activities"] {
  const rides = rideActivities(layout, { name, category, blurb: opts.blurb ?? "" });
  if (!rides.length) return opts.activities;
  // The 3D versions replace the old one-tap swim, sunbathe, lounger, kitesurf, volleyball and slide entries.
  const replaced = layout === "beach" ? /(^|:)(swim|sunbathe|lounge|kite|volleyball)$/ : /^(swim|leap|sceirah)$/;
  const kept = (opts.activities ?? []).filter((a) => !replaced.test(a.id));
  return [...rides, ...kept];
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
  venue("Waitrose", "Supermarket", "supermarket", {
    zone: "Lower Ground",
    blurb: "British supermarket — groceries, bakery and fresh food.",
    activities: [
      { id: "waitrose:croissant", label: "Bakery Warm Za'atar Croissant & Juice", icon: "🥐", animation: "sit", price: 18, need: { kind: "hunger", amount: 25 }, desc: "Fresh flaky croissant with savory za'atar herbs." },
      { id: "waitrose:groceries", label: "Weekly Healthy Pantry Restock", icon: "🛒", animation: "sit", price: 65, need: { kind: "hunger", amount: 50 }, desc: "Fresh berries, labneh, organic sourdough and fresh greens." },
      { id: "waitrose:scan", label: "Express Self-Checkout Quick Scan", icon: "⚡", animation: "clap", price: 0, reward: 15, need: { kind: "energy", amount: 10 }, desc: "Scan groceries and pack eco tote bag." },
    ],
  }),
  venue("Kinokuniya", "Books", "books", {
    zone: "Level 2",
    blurb: "Huge bookstore with Arabic, English and Japanese titles.",
    activities: [
      { id: "kino:browse", label: "Browse Architecture & Design Books", icon: "📚", animation: "sit", price: 0, need: { kind: "fun", amount: 20 }, desc: "Peruse rare art tomes, architecture monographs and Japanese manga." },
      { id: "kino:stationery", label: "Curate Japanese Stationery Haul", icon: "✏️", animation: "clap", price: 35, need: { kind: "fun", amount: 25 }, desc: "Minimalist gel pens, grid notebooks and washi tape." },
    ],
  }),
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
    activities: [
      { id: "skate", label: "Public Ice Skating Session", icon: "⛸️", animation: "dance", price: 105, need: { kind: "fun", amount: 35 }, desc: "Glide across the Olympic-size indoor ice sheet under snowfall FX." },
      { id: "skate:spin", label: "Figure 8 Ice Spin Challenge", icon: "❄️", animation: "dance", price: 0, reward: 30, need: { kind: "fun", amount: 25 }, desc: "Show off ice skating technique and balance." },
    ],
  }),
  venue("Reel Cinemas", "Entertainment", "club", {
    role: "Cinema host", noJob: true,
    zone: "Level 2", layout: "lobby", palette: PALETTES.night, feature: "stage", blurb: "Multi-screen cinema with a premium Dine-in option.",
    products: [ticket("reel-cinemas:standard", "Standard movie ticket", 55, "Tonight's blockbuster."), ticket("reel-cinemas:dine-in", "Dine-in recliner ticket", 165, "Recliner seat with food service.", "🍿"), { id: "reel-cinemas:popcorn", name: "Large popcorn", price: 39, icon: "🍿", station: "counter", desc: "Salted or caramel.", consumable: { need: "fun", amount: 8 } }],
    activities: [
      { id: "reel:blockbuster", label: "Watch IMAX 3D Blockbuster Premiere", icon: "🎬", animation: "sit", price: 75, need: { kind: "fun", amount: 50 }, desc: "Sink into premium theater seats with surround sound and warm popcorn." },
      { id: "reel:dine-in", label: "VIP Dine-In Recliner Experience", icon: "🍿", animation: "sit", price: 165, need: { kind: "hunger", amount: 40 }, desc: "Gourmet hot sliders, truffle popcorn and butler service in plush leather recliner." },
    ],
  }),
  venue("VR Park", "Entertainment", "club", {
    role: "Ride operator", noJob: true,
    zone: "Level 2", layout: "lobby", palette: PALETTES.night, blurb: "Virtual-reality rides and arcade games.",
    products: [ticket("vr-park:day", "All-day VR pass", 300, "Unlimited rides and games.", "🥽"), ticket("vr-park:single", "Single VR ride", 45, "One ride of your choice.", "🎢")],
    activities: [
      { id: "vr:drone", label: "Dubai Drone 2071 Hyper-Chase", icon: "🥽", animation: "clap", price: 45, need: { kind: "fun", amount: 40 }, desc: "Fly a supersonic drone between futuristic Burj Khalifa spires." },
      { id: "vr:burj-drop", label: "Burj Drop 828m VR Freefall", icon: "🎢", animation: "wave", price: 40, need: { kind: "fun", amount: 45 }, desc: "Heart-pounding simulated parachute leap off the world's tallest tower." },
    ],
  }),
  venue("KidZania", "Entertainment", "toys", { zone: "Level 2", comingSoon: true, blurb: "Kids' city of role-play jobs." }),
  venue("Emirates NBD", "Bank", "fashion", { comingSoon: true, blurb: "Branch and ATMs. Virtual banking features are planned." }),
];

// ---------------------------------------------------------------- Souk Al Bahar

const SOUK: Venue[] = [
  venue("Karma Kafé", "Restaurant & lounge", "restaurant", {
    blurb: "Pan-Asian lounge with a fountain-facing terrace.",
    activities: [
      { id: "karma:terrace", label: "Fountain Show Terrace Dining", icon: "🍱", animation: "sit", price: 180, need: { kind: "hunger", amount: 45 }, desc: "Dine on dragon rolls right as the Dubai Fountain dances." },
      { id: "karma:mocktail", label: "Toast Asian Lychee Mocktail", icon: "🍹", animation: "wave", price: 45, need: { kind: "fun", amount: 20 }, desc: "Chilled mocktail under the lantern-lit terrace." },
    ],
  }),
  venue("Abd El Wahab", "Lebanese restaurant", "restaurant", {
    blurb: "Classic Lebanese mezze and grills.",
    activities: [
      { id: "abdelwahab:mezze", label: "Grand Mezze Feast on Lake Terrace", icon: "🧆", animation: "sit", price: 140, need: { kind: "hunger", amount: 50 }, desc: "Creamy hummus, piping hot falafel, tabouleh and fresh saj bread." },
    ],
  }),
  venue("Mango Tree Bistro", "Thai restaurant", "restaurant"),
  venue("Rivington Grill", "British grill", "restaurant"),
  venue("Souk Arts & Crafts", "Souvenirs", "fragrance", {
    blurb: "Arabian lanterns, oud, textiles and souvenirs from the souk's stalls.",
    activities: [
      { id: "souk:haggle", label: "Haggle for Brass Lantern & Incense Burner", icon: "🏮", animation: "clap", price: 65, need: { kind: "fun", amount: 25 }, desc: "Bargain with local merchant over handcrafted Arabian brassware." },
      { id: "souk:frankincense", label: "Sample Frankincense & Bukhoor Aromas", icon: "✨", animation: "wave", price: 0, reward: 15, need: { kind: "energy", amount: 15 }, desc: "Breathe in sweet warm burning frankincense and rich amber resins." },
    ],
  }),
];

// ---------------------------------------------------------------- Time Out Market (opening line-up; vendors rotate)

const tom = (n: string, cuisine: string, key: CatalogKey = "restaurant", activities?: VenueActivity[]) =>
  venue(n, cuisine, key, { layout: "dining", blurb: `${cuisine} counter at Time Out Market Dubai.`, activities });

const TIME_OUT: Venue[] = [
  tom("Masti", "Modern Indian"), tom("BB Social Dining", "Asian small plates"), tom("Vietnamese Foodies", "Vietnamese"),
  tom("Pickl", "Burgers", "restaurant", [
    { id: "pickl:reaper", label: "Nashville Hot Chicken Sando", icon: "🍔", animation: "sit", price: 52, need: { kind: "hunger", amount: 50 }, desc: "Crispy fried chicken breast dipped in house secret spice with dill pickles." },
  ]),
  tom("Pitfire Pizza", "Pizza", "restaurant", [
    { id: "pitfire:slice", label: "Bills Truffle & Spianata Sourdough Slice", icon: "🍕", animation: "sit", price: 48, need: { kind: "hunger", amount: 45 }, desc: "Blistered 72-hour fermented crust with fragrant black truffle." },
  ]),
  tom("Brix", "Desserts", "cafe"),
  tom("Nightjar Coffee", "Coffee roasters", "cafe", [
    { id: "nightjar:nitro", label: "Signature Nitro Cold Brew Draft", icon: "☕", animation: "sit", price: 28, need: { kind: "energy", amount: 35 }, desc: "Cold draft coffee pulled like a stout with thick velvety crema." },
  ]),
  tom("Reif Japanese Kushiyaki", "Japanese skewers"), tom("Little Erth", "Healthy bowls"), tom("Scoopi Café", "Ice cream", "cafe"),
  tom("Long Teng", "Chinese"),
  tom("Al Fanar", "Emirati", "restaurant", [
    { id: "fanar:luqaimat", label: "Luqaimat with Cardamom Gahwa", icon: "☕", animation: "sit", price: 35, need: { kind: "hunger", amount: 35 }, desc: "Crispy golden dough balls drizzled in date molasses with Emirati spiced coffee." },
    { id: "fanar:machboos", label: "Machboos Deyay Spiced Rice Pot", icon: "🍲", animation: "sit", price: 65, need: { kind: "hunger", amount: 55 }, desc: "Slow-simmered chicken with fragrant saffron rice and black dried lime." },
  ]),
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
  const key: CatalogKey = ["cafe", "wellness", "gelato", "desserts"].includes(cuisine) ? "cafe" : "restaurant";
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
const lobby = (hotelName: string, brand: Brand, room: number, suite: string, suitePrice: number, roomName = "Sea-view room"): Venue => {
  const id = slug(`${hotelName} Lobby & Reception`);
  return venue(`${hotelName} Lobby & Reception`, "Reception · rooms & concierge", "hotel", {
    palette: { floor: brand.floor, wall: brand.wall, accent: brand.accent }, blurb: `Check in, book a room or ask the concierge at ${hotelName}.`,
    products: [
      { id: `${id}:room`, name: `${roomName}, 1 night`, price: room, icon: "🛏️", station: "reception", desc: "King bed and a balcony over the Arabian Gulf.", service: true },
      { id: `${id}:suite`, name: `${suite}, 1 night`, price: suitePrice, icon: "🌅", station: "reception", desc: "Separate living room, butler service and beach views.", service: true },
      { id: `${id}:transfer`, name: "Airport limousine", price: 450, icon: "🚘", station: "reception", desc: "Chauffeur transfer to or from DXB.", service: true },
    ],
  });
};

interface HotelSpec {
  id: string; name: string; short: string; blurb: string; brand: Brand;
  room: number; suite: string; suitePrice: number; roomName?: string;
  cafe?: Venue; outlets: Venue[]; spa: string; pool?: string; beach?: string; poolPrice?: number; extra?: Venue[];
}

/** A Palm hotel with everything guests use: lobby, café, restaurants, pool bar, beach and spa. */
function palmHotel(h: HotelSpec): Place {
  return {
    id: h.id, name: h.name, kind: "hotel", blurb: h.blurb,
    venues: [
      lobby(h.name, h.brand, h.room, h.suite, h.suitePrice, h.roomName),
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


// ---------------------------------------------------------------- the Jumeirah coastline
// Burj Al Arab and its neighbours in Umm Suqeim, and the public beaches (see lib/city/coast.ts).

/** A public beach: free to visit, with things to do on the sand. */
const publicBeach = (id: string, name: string, blurb: string, extra: Venue[] = [], activities: Venue["activities"] = []): Place => ({
  id, name, kind: "park", blurb,
  venues: [
    venue(name, "Public beach", "hotel", {
      role: "Lifeguard", noJob: true, layout: "outdoor", feature: "pool", palette: PALETTES.park, products: [], blurb,
      activities: [{ id: "swim", label: "Go for a swim", icon: "🏊", animation: "clap", reward: 20 }, { id: "sunbathe", label: "Sunbathe", icon: "🏖️", animation: "sit" }, ...(activities ?? [])],
    }),
    ...extra,
  ],
});

/**
 * Madinat Jumeirah: the resort town of four hotels around Souk Madinat Jumeirah. The souk's 21 places to
 * eat and drink are its official dining list (soukmadinatjumeirah.ae, 2026); the hotels' outlets are the
 * well-known ones. Menus are representative of each cuisine.
 */
function madinatJumeirah(): Place {
  const brand: Brand = { floor: "#d6bc8a", wall: "#f5efe3", accent: "#b08d57" };
  const souk = (name: string, category: string, cuisine: Cuisine, blurb?: string) => outlet(name, category, cuisine, brand, { zone: "Souk Madinat Jumeirah", ...(blurb ? { blurb } : {}) });
  const hotel = (name: string, room: number, roomName: string, suite: string, suitePrice: number, blurb: string) => ({ ...lobby(name, brand, room, suite, suitePrice, roomName), blurb, zone: "Hotels" });
  return {
    id: "madinat-jumeirah", name: "Madinat Jumeirah", kind: "attraction",
    blurb: "A walled Arabian resort town of wind towers, souk lanes and waterways by Burj Al Arab: four hotels, Souk Madinat Jumeirah, Talise Spa and the Madinat Theatre.",
    venues: [
      // Hotels
      hotel("Jumeirah Al Qasr", 2200, "Ocean deluxe room", "Royal suite", 12000, "The palace hotel at the heart of Madinat, with its own private beach."),
      hotel("Jumeirah Mina A'Salam", 1600, "Ocean deluxe room", "Ocean suite", 6500, "The 'harbour of peace' hotel on the waterways, facing Burj Al Arab."),
      hotel("Jumeirah Dar Al Masyaf", 2400, "Arabian summer house room", "Malakiya villa", 25000, "Arabian summer houses set around shared courtyards and pools."),
      hotel("Jumeirah Al Naseem", 1800, "Ocean deluxe room", "Ocean suite", 7000, "The light, contemporary beach hotel closest to Burj Al Arab."),
      // Resort restaurants and bars
      outlet("Pierchic", "Seafood restaurant on the pier", "seafood", brand, { zone: "Al Qasr", feature: "skyline", blurb: "At the end of a wooden pier, facing Burj Al Arab." }),
      outlet("Pai Thai", "Thai restaurant", "thai", brand, { zone: "Dar Al Masyaf", blurb: "Thai dining by the canal: guests arrive by abra." }),
      lounge("Bahri Bar", "Bar with Burj Al Arab views", brand, "Terrace bar at Mina A'Salam looking out to Burj Al Arab."),
      outlet("Shimmers", "Greek beach restaurant", "greek", brand, { zone: "Mina A'Salam", blurb: "Greek dishes and seafood on the beach." }),
      // Souk Madinat Jumeirah: restaurants, cafés and bars
      souk("AMARU Restaurant & Lounge", "Latin American restaurant", "nikkei"),
      souk("Al Makan", "Emirati & Arabic restaurant", "lebanese"),
      souk("Anar", "Persian restaurant", "persian"),
      souk("Ushna", "Indian restaurant", "indian"),
      souk("The Meat Co.", "Steakhouse", "steak"),
      souk("Trattoria", "Italian restaurant", "italian"),
      souk("Taverna Greek Restaurant", "Greek restaurant", "greek"),
      souk("Sushiyaki", "Sushi & yakitori", "japanese"),
      souk("The Noodle House", "Pan-Asian noodles", "chinese"),
      souk("Maria Bonita Taco Shop & Grill", "Mexican taco shop", "mexican"),
      souk("McGettigan's", "Irish pub & restaurant", "gastropub"),
      souk("Belgian Beer Café", "Belgian café", "gastropub"),
      lounge("Trader Vic's", "Tiki bar & restaurant", brand, "The tiki classic in the souk: tropical drinks and island food."),
      lounge("Mezzanine Bar & Kitchen", "Bar & kitchen", brand, "Bar and kitchen above the souk lanes."),
      souk("Starbucks", "Café", "cafe"),
      souk("Costa Coffee", "Café", "cafe"),
      souk("AGK Refreshments", "Juices & refreshments", "wellness"),
      souk("Amorino", "Gelato café", "gelato"),
      souk("Gelato Divino", "Gelato", "gelato"),
      souk("Hafiz Mustafa 1864", "Turkish desserts", "desserts", "Istanbul's dessert house since 1864: baklava, künefe and Turkish delight."),
      souk("Velvet Sweets", "Desserts", "desserts"),
      // Shopping
      venue("Souk Madinat Jumeirah", "Souk · gifts & crafts", "home", { zone: "Souk Madinat Jumeirah", palette: { floor: brand.floor, wall: brand.wall, accent: brand.accent }, blurb: "Covered souk lanes with lanterns, textiles, art and gifts." }),
      // Amenities
      { ...brandSpa("Talise Spa", brand, "Award-winning spa of 26 treatment villas by the waterways, with steam rooms, saunas and plunge pools."), zone: "Al Qasr" },
      poolBar("Al Qasr Pool & Bar", brand, 450, "The palace's long pool, loungers and cabanas."),
      beach("Madinat Jumeirah Private Beach", brand, "A long private beach shared by the resort's hotels, facing Burj Al Arab."),
      attraction("Madinat Theatre", "The resort's theatre: musicals, comedy and concerts.", "stage", [
        ticket("madinat-theatre:show", "Show ticket", 250, "Tonight's performance.", "🎭"),
      ], [{ id: "applaud", label: "Give a standing ovation", icon: "👏", animation: "clap" }]),
      attraction("Abra waterway ride", "A traditional abra ride through Madinat's canals.", "pool", [
        ticket("madinat:abra", "Abra ride", 85, "About 20 minutes on the waterways.", "🛶"),
      ], [{ id: "wave", label: "Wave from the abra", icon: "🛶", animation: "wave" }]),
      attraction("Sinbad's Kids Club", "Kids' club beside Al Qasr's pool: activities, crafts and a splash area.", "pool", [
        ticket("madinat:kids-club", "Kids club half day", 150, "Supervised activities for ages 4–12.", "🧒"),
      ], [{ id: "play", label: "Join the treasure hunt", icon: "🏴‍☠️", animation: "clap", reward: 20 }]),
    ],
    categories: ["Reception · rooms & concierge", "Seafood restaurant on the pier", "Thai restaurant", "Persian restaurant", "Indian restaurant", "Steakhouse", "Italian restaurant", "Greek restaurant", "Mexican taco shop", "Irish pub & restaurant", "Café", "Gelato café", "Turkish desserts", "Souk · gifts & crafts", "Spa", "Pool & pool bar", "Private beach", "Attraction"],
  };
}

// ---------------------------------------------------------------- Sheikh Zayed Road
// Hotels by the Trade Centre, Coca-Cola Arena and the Nigerian and Afrobeats spots on the floor-ad strip
// (lib/city/szr.ts). Outlets with a well-known name use it; the rest are labelled by hotel and cuisine.

/** A city hotel: lobby, café, restaurants, rooftop pool and spa (no beach on Sheikh Zayed Road). */
function cityHotel(h: { id: string; name: string; short: string; blurb: string; brand: Brand; room: number; suitePrice: number; outlets: Venue[]; spa: string }): Place {
  const lobbyId = slug(`${h.name} Lobby & Reception`);
  return {
    id: h.id, name: h.name, kind: "hotel", blurb: h.blurb,
    venues: [
      venue(`${h.name} Lobby & Reception`, "Reception · rooms & concierge", "hotel", {
        palette: { floor: h.brand.floor, wall: h.brand.wall, accent: h.brand.accent }, blurb: `Check in, book a room or ask the concierge at ${h.name}.`,
        products: [
          { id: `${lobbyId}:room`, name: "City-view room, 1 night", price: h.room, icon: "🛏️", station: "reception", desc: "King bed with floor-to-ceiling views of Sheikh Zayed Road.", service: true },
          { id: `${lobbyId}:suite`, name: "Burj Khalifa-view suite, 1 night", price: h.suitePrice, icon: "🌆", station: "reception", desc: "Separate living room facing the Burj Khalifa.", service: true },
          { id: `${lobbyId}:transfer`, name: "Airport limousine", price: 350, icon: "🚘", station: "reception", desc: "Chauffeur transfer to or from DXB.", service: true },
        ],
      }),
      outlet(`${h.short} · Lobby Café`, "Café · lobby lounge", "cafe", h.brand, { blurb: "Coffee, pastries and afternoon tea in the lobby." }),
      ...h.outlets,
      poolBar(`${h.short} · Rooftop Pool`, h.brand, 250, "Rooftop pool above Sheikh Zayed Road with loungers and a pool bar."),
      brandSpa(h.spa, h.brand),
    ],
  };
}

const AFRO_BRAND: Brand = { floor: "#0b0b12", wall: "#12121c", accent: "#facc15", light: "#22c55e" };
const DANCE = (label = "Dance") => [{ id: "dance", label, icon: "💃", animation: "dance" as const }];

// The clubs and restaurants inside the hotels: each is its own place on the map (standing in front of
// its hotel) and also listed among the hotel's venues.
const THE_AVENUE = lounge("The Avenue", "Nightclub & lounge · 42nd floor", { floor: "#0b0b12", wall: "#12121c", accent: "#d4af37", light: "#f59e0b" }, "Oriental-style club and terrace on the 42nd floor of Shangri-La.");
const VIBZ = { ...lounge("Vibz Dubai", "Nightclub · Fairmont ground floor", { ...AFRO_BRAND, accent: "#a855f7", light: "#22d3ee" }, "Nightclub at Fairmont Dubai: hip-hop, Afro, Bollywood and R&B nights."), activities: DANCE("Dance on Afro night") };
const ENISH = outlet("Enish Dubai", "Nigerian restaurant & lounge · The H, level 1", "nigerian", AFRO_BRAND, {
  layout: "dining", blurb: "Nigerian restaurant and lounge on level 1 of The H Dubai: jollof, suya, pounded yam and egusi, with Afrobeats.",
  activities: DANCE("Dance to Afrobeats"),
});
const GAMBACHI = { ...lounge("Gambachi Social Club", "Nightclub & social club · The H", { ...AFRO_BRAND, accent: "#facc15" }, "Nightclub and social club at The H Dubai: international DJs, live shows, VIP tables and fine dining."), activities: DANCE() };

// ---------------------------------------------------------------- Dubai Marina and JBR standalone venues
// Dubai Marina Mall's tenants (Waitrose, Reel Cinemas, H&M, Mango…) and Pier 7's dining tower are as listed
// by Bayut and Emaar (2025–26); the clubs and restaurants are well-known Marina/JBR names in 2026 guides.

const DANCE_HERE = [{ id: "dance", label: "Dance", icon: "💃", animation: "dance" as const }];
const clubVenue = (name: string, category: string, blurb: string, accent: string, light: string, activities: VenueActivity[] = DANCE_HERE) => ({
  ...lounge(name, category, { floor: "#0b0b12", wall: "#12121c", accent, light }, blurb), activities,
});

const MARINA_PLACES: Place[] = [
  {
    id: "dubai-marina-mall", name: "Dubai Marina Mall", kind: "mall",
    blurb: "Waterside mall on the marina with Waitrose, Reel Cinemas and Pier 7's dining tower next door.",
    categories: ["Supermarket", "Fashion", "Footwear", "Jewellery & watches", "Café", "Restaurant", "Entertainment"],
    venues: [
      venue("Waitrose", "Supermarket", "supermarket", {
        zone: "Level P",
        blurb: "British supermarket on the promenade level — fresh bakery, sandwiches and British groceries.",
        activities: [
          { id: "waitrose-marina:snack", label: "Grab Marina Boardwalk Meal Deal", icon: "🥪", animation: "sit", price: 22, need: { kind: "hunger", amount: 25 }, desc: "Chilled sandwich, crisps and fresh juice for a marina stroll." },
          { id: "waitrose-marina:groceries", label: "Restock Apartment Kitchen Supplies", icon: "🛒", animation: "sit", price: 65, need: { kind: "hunger", amount: 45 }, desc: "Essential groceries for home cooking in Marina." },
        ],
      }),
      venue("H&M", "Fashion", "fashion"), venue("Mango", "Fashion", "fashion"), venue("River Island", "Fashion", "fashion"),
      venue("Charles & Keith", "Footwear", "fashion"), venue("Aldo", "Footwear", "fashion"),
      venue("Pandora", "Jewellery & watches", "jewellery"),
      venue("Starbucks", "Café", "cafe"), venue("Caffè Nero", "Café", "cafe"), venue("Le Pain Quotidien", "Café", "cafe"),
      venue("Shakespeare and Co.", "Restaurant", "restaurant", { zone: "Level P", blurb: "All-day café-restaurant with a marina-view breakfast." }),
      venue("Five Guys", "Restaurant", "restaurant"),
      venue("Reel Cinemas", "Entertainment", "club", {
        role: "Cinema host", noJob: true, layout: "lobby", palette: PALETTES.night, feature: "stage", blurb: "Multiplex on the top level, including a Dolby Cinema screen.",
        products: [ticket("reel-marina:standard", "Standard movie ticket", 45, "Tonight's film in 2D."), ticket("reel-marina:dolby", "Dolby Cinema ticket", 75, "Dolby Vision and Atmos.", "🎬"),
          { id: "reel-marina:popcorn", name: "Large popcorn", price: 39, icon: "🍿", station: "counter", desc: "Salted or caramel.", consumable: { need: "fun", amount: 8 } }],
        activities: [
          { id: "reel-marina:dolby-show", label: "Watch Dolby Atmos Blockbuster", icon: "🎬", animation: "sit", price: 75, need: { kind: "fun", amount: 45 }, desc: "Crystal clear projection and immersive audio." },
        ],
      }),
    ],
  },
  {
    id: "pier-7", name: "Pier 7", kind: "food-hall",
    blurb: "Seven floors of restaurants and lounges in a glass tower on the marina, by Dubai Marina Mall.",
    venues: [
      outlet("Asia Asia", "Pan-Asian restaurant & lounge · 6th floor", "japanese", { floor: "#1c1917", wall: "#292524", accent: "#dc2626", light: "#f59e0b" }, { blurb: "Pan-Asian dining with marina views on the sixth floor." }),
      outlet("Mama Zonia", "African-inspired restaurant & lounge", "nigerian", { floor: "#14532d", wall: "#1c1917", accent: "#facc15", light: "#22c55e" }, { blurb: "Jungle-themed dining room with African-inspired plates.", activities: DANCE_HERE }),
      lounge("Pier 7 · Rooftop Lounge", "Rooftop lounge", { floor: "#0b0b12", wall: "#12121c", accent: "#38bdf8", light: "#38bdf8" }, "Cocktails over the marina at the top of Pier 7."),
    ],
  },
  single("buddha-bar", "Buddha-Bar · Grosvenor House", "club", clubVenue("Buddha-Bar", "Asian restaurant & lounge · Grosvenor House", "Dimly lit Asian dining room and lounge with a giant Buddha and resident DJs.", "#dc2626", "#fbbf24")),
  single("hurricanes-grill", "Hurricane's Grill & Bar", "club", outlet("Hurricane's Grill & Bar", "Steakhouse & bar · opposite JBR", "steak", { floor: "#292524", wall: "#e7e5e4", accent: "#f97316" }, { blurb: "Ribs, steaks and sports on the screens, across from JBR." })),
  single("lock-stock-barrel-jbr", "Lock, Stock & Barrel JBR", "club", clubVenue("Lock, Stock & Barrel JBR", "Party bar & live music", "Big-energy bar with live bands and DJs, packed on weekends.", "#facc15", "#dc2626")),
  single("bla-bla-dubai", "Bla Bla Dubai", "club", clubVenue("Bla Bla Dubai", "Beach club & bars · JBR", "Beachfront venue with several bars, live bands and a pool.", "#22d3ee", "#f472b6", [
    { id: "blabla:dance", label: "Poolside DJ Beat Drop", icon: "🎧", animation: "dance", need: { kind: "fun", amount: 35 }, desc: "Dance on the sun deck to the house DJ set." },
    { id: "blabla:cocktail", label: "Sunset Spritz & Mediterranean Bites", price: 65, icon: "🍹", animation: "sit", need: { kind: "hunger", amount: 20 }, desc: "Refreshing beach spritz and tapas by the cabana." },
    { id: "blabla:swim", label: "Beach Club Pool Dip", price: 100, icon: "🏊", animation: "clap", need: { kind: "hygiene", amount: 25 }, desc: "Cool off in the turquoise day-club infinity pool." },
  ])),
  single("barasti", "Barasti Beach Bar", "club", clubVenue("Barasti", "Beach club & sports bar · Mina Seyahi", "Dubai's classic beach bar: sundowners, live sport and DJs on the sand.", "#f59e0b", "#0ea5e9", [
    { id: "barasti:cheer", label: "Cheer Live Sports on Giant Screen", icon: "⚽", animation: "clap", reward: 15, need: { kind: "social", amount: 25 }, desc: "Chant along with football fans right on the sand." },
    { id: "barasti:dance", label: "Barefoot Sand Dance Party", icon: "💃", animation: "dance", need: { kind: "fun", amount: 35 }, desc: "Dance under the stars with sand beneath your feet." },
    { id: "barasti:burger", label: "Barasti Loaded Beach Burger", price: 58, icon: "🍔", animation: "sit", need: { kind: "hunger", amount: 40 }, desc: "Classic beach club pub burger and seasoned chips." },
  ])),
];

// ---------------------------------------------------------------- JBR and Bluewaters
// JBR: the residences on the beach west of Dubai Harbour, with The Walk promenade and its beach hotels.
// Bluewaters: the island just offshore, joined to JBR by a footbridge, home to Ain Dubai (the 250 m
// observation wheel), Madame Tussauds Dubai and Banyan Tree Dubai (formerly Caesars Palace, rebranded
// in 2023). Named outlets are ones reported at each place in 2025–26 guides; others are labelled by cuisine.

const JBR_PLACES: Place[] = [
  {
    id: "jbr", name: "JBR · The Walk", kind: "mall",
    blurb: "Jumeirah Beach Residence: 40 beachfront towers with The Walk, a 1.7 km promenade of cafés, shops and beach hotels.",
    categories: ["Hotels", "Restaurant", "Café", "Entertainment"],
    venues: [
      ...palmHotel({
        id: "address-beach-resort", name: "Address Beach Resort", short: "Address Beach", blurb: "",
        brand: { floor: "#e7e5e4", wall: "#fafaf9", accent: "#0f766e" }, room: 1400, suite: "Sea-view suite", suitePrice: 4800,
        pool: "Zeta Seventy Seven · Infinity Pool", poolPrice: 600, spa: "The Spa at Address Beach Resort",
        outlets: [outlet("Address Beach · Japanese Restaurant", "Japanese restaurant", "japanese", { floor: "#1c1917", wall: "#f5f5f4", accent: "#0f766e" })],
      }).venues,
      ...palmHotel({
        id: "rixos-premium-jbr", name: "Rixos Premium Dubai JBR", short: "Rixos Premium", blurb: "",
        brand: { floor: "#efe6d8", wall: "#fbf7f0", accent: "#b45309" }, room: 1100, suite: "Premium suite", suitePrice: 3600,
        spa: "Anjana Spa", beach: "Rixos Beach",
        outlets: [outlet("Rixos Premium · Turkish Restaurant", "Turkish restaurant", "turkish", { floor: "#7c2d12", wall: "#fef3c7", accent: "#b45309" })],
      }).venues,
      ...palmHotel({
        id: "sofitel-jbr", name: "Sofitel Dubai Jumeirah Beach", short: "Sofitel JBR", blurb: "",
        brand: { floor: "#e2e8f0", wall: "#f8fafc", accent: "#1e3a8a" }, room: 850, suite: "Prestige suite", suitePrice: 2800,
        spa: "Sofitel Spa",
        outlets: [outlet("Sofitel JBR · French Brasserie", "French brasserie", "french", { floor: "#1e293b", wall: "#f8fafc", accent: "#1e3a8a" })],
      }).venues,
      outlet("The Walk · Lebanese Grill", "Lebanese restaurant · The Walk", "lebanese", { floor: "#7c2d12", wall: "#fef3c7", accent: "#16a34a" }),
      outlet("The Walk · Burger & Shakes", "Burger joint · The Walk", "gastropub", { floor: "#1f2937", wall: "#fef3c7", accent: "#dc2626" }),
      outlet("The Walk · Seafood Terrace", "Seafood restaurant · The Walk", "seafood", { floor: "#0c4a6e", wall: "#f0f9ff", accent: "#0284c7" }),
      outlet("The Walk · Gelato Bar", "Gelato · The Walk", "gelato", { floor: "#fdf2f8", wall: "#fff7ed", accent: "#db2777" }),
      outlet("The Walk · Seaside Café", "Café · The Walk", "cafe", { floor: "#a47148", wall: "#efe3d0", accent: "#0f766e" }),
      venue("The Beach · Open-air Cinema", "Outdoor cinema", "club", {
        role: "Cinema host", noJob: true, feature: "stage", palette: PALETTES.night, blurb: "Films on a big screen under the stars at The Beach.",
        products: [ticket("jbr-cinema:ticket", "Open-air cinema ticket", 60, "Tonight's film on beanbags by the sea.", "🎬"), { id: "jbr-cinema:popcorn", name: "Popcorn", price: 25, icon: "🍿", station: "bar", desc: "Salted or caramel.", consumable: { need: "fun", amount: 8 } }],
      }),
    ],
  },
  {
    id: "bluewaters", name: "Bluewaters", kind: "mall",
    blurb: "The island off JBR, joined by a footbridge: Ain Dubai, Madame Tussauds, beachfront dining and Banyan Tree Dubai.",
    categories: ["Attraction", "Restaurant", "Hotels"],
    venues: [
      attraction("Ain Dubai", "The world's tallest observation wheel, about 250 m, with 48 cabins and views over JBR, the Marina and the Palm.", "skyline", [
        ticket("ain-dubai:standard", "Ain Dubai · shared cabin", 145, "One rotation (about 38 minutes) in a shared cabin."),
        ticket("ain-dubai:sunset", "Ain Dubai · sunset cabin", 210, "Shared cabin timed for sunset.", "🌅"),
        ticket("ain-dubai:private", "Ain Dubai · private cabin", 1800, "A cabin for your group of up to 10.", "🥂"),
      ], [{ id: "view", label: "Take in the view", icon: "🎡", animation: "wave", reward: 0 }]),
      attraction("Madame Tussauds Dubai", "Wax figures of global and Arab stars, from film and music to sport.", "exhibits", [
        ticket("tussauds:entry", "Madame Tussauds entry", 150, "All zones, take as many photos as you like."),
      ], [{ id: "selfie", label: "Selfie with a star", icon: "🤳", animation: "wave", reward: 10 }]),
      outlet("The London Project", "British restaurant & bar", "british", { floor: "#14532d", wall: "#f0fdf4", accent: "#15803d" }, { blurb: "Greenhouse-style dining room with British plates and cocktails." }),
      outlet("Alici", "Italian seafood restaurant", "italian", { floor: "#0c4a6e", wall: "#f0f9ff", accent: "#0369a1" }, { blurb: "Amalfi-coast seafood by the water." }),
      venue("Brass Monkey", "Bowling, games & bar", "club", {
        role: "Lane host", noJob: true, feature: "stage", palette: { floor: "#1c1917", wall: "#292524", accent: "#d97706", light: "#f59e0b" },
        blurb: "Bowling lanes, arcade games, karaoke and a bar.",
        products: [ticket("brass-monkey:bowling", "Bowling lane, 1 game", 60, "Shoes included.", "🎳"), ...menu("brass-monkey", "gastropub")],
        activities: [{ id: "bowl", label: "Bowl a frame", icon: "🎳", animation: "clap", reward: 15 }, { id: "karaoke", label: "Sing karaoke", icon: "🎤", animation: "dance" }],
      }),
      ...palmHotel({
        id: "banyan-tree-dubai", name: "Banyan Tree Dubai", short: "Banyan Tree", blurb: "",
        brand: { floor: "#3f2a1e", wall: "#f5efe3", accent: "#78350f" }, room: 1500, suite: "Sea-view suite", suitePrice: 5200,
        spa: "Banyan Tree Spa", beach: "Banyan Tree Beach",
        outlets: [outlet("Banyan Tree · Mediterranean Kitchen", "Mediterranean restaurant", "greek", { floor: "#3f2a1e", wall: "#f5efe3", accent: "#78350f" })],
      }).venues,
    ],
  },
];

const SZR_PLACES: Place[] = [
  cityHotel({
    id: "shangri-la-dubai", name: "Shangri-La Dubai", short: "Shangri-La", blurb: "Five-star tower on Sheikh Zayed Road with Shang Palace, Hoi An and The Avenue on the 42nd floor.",
    brand: { floor: "#efe6d8", wall: "#fbf7f0", accent: "#b45309" }, room: 950, suitePrice: 3800, spa: "CHI, The Spa",
    outlets: [
      outlet("Shang Palace", "Cantonese restaurant", "chinese", { floor: "#7f1d1d", wall: "#fef3c7", accent: "#b91c1c" }, { blurb: "Cantonese classics and dim sum." }),
      outlet("Hoi An", "Vietnamese restaurant", "vietnamese", { floor: "#3f2a1e", wall: "#f5efe3", accent: "#a16207" }, { blurb: "Vietnamese and French-colonial cooking." }),
      THE_AVENUE,
    ],
  }),
  cityHotel({
    id: "voco-dubai", name: "voco Dubai", short: "voco", blurb: "IHG's voco hotel on Sheikh Zayed Road, a short walk from the Trade Centre.",
    brand: { floor: "#e2e8f0", wall: "#f8fafc", accent: "#65a30d" }, room: 550, suitePrice: 1900, spa: "voco Dubai Spa",
    outlets: [outlet("voco · All-Day Dining", "International restaurant", "buffet", { floor: "#e2e8f0", wall: "#f8fafc", accent: "#65a30d" })],
  }),
  cityHotel({
    id: "conrad-dubai", name: "Conrad Dubai", short: "Conrad", blurb: "Hilton's luxury tower opposite the Dubai World Trade Centre.",
    brand: { floor: "#1e293b", wall: "#f1f5f9", accent: "#1e40af" }, room: 850, suitePrice: 3200, spa: "Conrad Dubai Spa",
    outlets: [
      outlet("Conrad · Italian Restaurant", "Italian restaurant", "italian", { floor: "#1e293b", wall: "#f1f5f9", accent: "#1e40af" }),
      outlet("Conrad · Steakhouse", "Steakhouse", "steak", { floor: "#292524", wall: "#e7e5e4", accent: "#9a3412" }),
    ],
  }),
  cityHotel({
    id: "fairmont-dubai", name: "Fairmont Dubai", short: "Fairmont", blurb: "The tower with four lit pyramids on top, next to the World Trade Centre, with Vibz on the ground floor.",
    brand: { floor: "#efe6d8", wall: "#fbf7f0", accent: "#a16207" }, room: 800, suitePrice: 2900, spa: "Willow Stream Spa",
    outlets: [outlet("Spectrum on One", "International buffet", "buffet", { floor: "#efe6d8", wall: "#fbf7f0", accent: "#a16207" }, { blurb: "Eight open kitchens from around the world." }), VIBZ],
  }),
  cityHotel({
    id: "sheraton-grand-dubai", name: "Sheraton Grand Hotel Dubai", short: "Sheraton Grand", blurb: "Marriott's Sheraton Grand tower on Sheikh Zayed Road, by the Trade Centre.",
    brand: { floor: "#efe1c6", wall: "#fdf6e3", accent: "#b45309" }, room: 600, suitePrice: 2200, spa: "Sheraton Grand Spa",
    outlets: [
      outlet("Sheraton Grand · All-Day Dining", "International buffet", "buffet", { floor: "#efe1c6", wall: "#fdf6e3", accent: "#b45309" }),
      outlet("Sheraton Grand · Indian Restaurant", "Indian restaurant", "indian", { floor: "#7c2d12", wall: "#fef3c7", accent: "#c2410c" }),
    ],
  }),
  cityHotel({
    id: "the-h-dubai", name: "The H Dubai", short: "The H", blurb: "Twin towers at One Sheikh Zayed Road, home to Enish and Gambachi Social Club.",
    brand: { floor: "#e5e7eb", wall: "#f9fafb", accent: "#b45309" }, room: 650, suitePrice: 2400, spa: "The H Dubai Spa",
    outlets: [outlet("The H · Lebanese Restaurant", "Lebanese restaurant", "lebanese", { floor: "#e5e7eb", wall: "#f9fafb", accent: "#b45309" }), ENISH, GAMBACHI],
  }),
  single("coca-cola-arena", "Coca-Cola Arena", "attraction", venue("Coca-Cola Arena", "Concerts & events arena", "club", {
    role: "Arena host", noJob: true, feature: "stage", palette: { floor: "#1c1917", wall: "#0f172a", accent: "#dc2626", light: "#f43f5e" },
    blurb: "Dubai's biggest indoor arena at City Walk: concerts, comedy and fights.",
    products: [
      ticket("coca-cola-arena:standing", "Concert ticket · standing", 295, "Tonight's headliner, general admission."),
      ticket("coca-cola-arena:seated", "Concert ticket · seated", 450, "Reserved seat in the bowl."),
      ticket("coca-cola-arena:vip", "VIP box", 1500, "Private box with food and drinks.", "🥂"),
      { id: "coca-cola-arena:cola", name: "Coca-Cola", price: 15, icon: "🥤", station: "bar", desc: "Ice cold.", consumable: { need: "energy", amount: 8 } },
      { id: "coca-cola-arena:nachos", name: "Loaded nachos", price: 45, icon: "🌮", station: "bar", desc: "Cheese, jalapeños, salsa.", consumable: { need: "hunger", amount: 20 } },
    ],
    activities: [{ id: "dance", label: "Dance at the show", icon: "💃", animation: "dance" }, { id: "cheer", label: "Cheer the headliner", icon: "🙌", animation: "clap" }],
  })),
  single("the-avenue", "The Avenue · Shangri-La", "club", THE_AVENUE),
  single("vibz-dubai", "Vibz Dubai · Fairmont", "club", VIBZ),
  single("enish-dubai", "Enish · The H Dubai", "club", ENISH),
  single("gambachi-social-club", "Gambachi Social Club · The H Dubai", "club", GAMBACHI),
];

const COAST_PLACES: Place[] = [
  palmHotel({
    id: "burj-al-arab", name: "Burj Al Arab", short: "Burj Al Arab", brand: { floor: "#7f1d1d", wall: "#fef3c7", accent: "#d4af37" },
    room: 8500, roomName: "Deluxe one-bedroom suite", suite: "Royal two-bedroom suite", suitePrice: 95000, spa: "Talise Spa", pool: "The Terrace", poolPrice: 1500,
    beach: "Burj Al Arab Private Beach",
    blurb: "The sail-shaped hotel on its own island off Umm Suqeim. A major restoration began in April 2026 and is expected to take about 18 months.",
    cafe: outlet("Sahn Eddar", "Atrium lounge · afternoon tea", "cafe", { floor: "#7f1d1d", wall: "#fef3c7", accent: "#d4af37" }, { blurb: "Afternoon tea in the atrium, under the golden balconies." }),
    outlets: [
      outlet("Ristorante L'Olivo at Al Mahara", "Seafood fine dining", "seafood", { floor: "#0c1a3a", wall: "#0f172a", accent: "#d4af37" }, { feature: "aquarium", palette: PALETTES.night, blurb: "Fine dining around a 990,000-litre aquarium." }),
      outlet("Al Muntaha", "French & Italian fine dining · Level 27", "french", { floor: "#1e1b4b", wall: "#f5f5f4", accent: "#d4af37" }, { feature: "skyline", blurb: "Michelin-starred dining 200 m above the Gulf." }),
      lounge("Skyview Bar", "Sky bar · Level 27", { floor: "#0b0b12", wall: "#12121c", accent: "#d4af37" }, "Cocktails and afternoon tea on the 27th floor."),
      lounge("Gilt", "Bar · Level 27", { floor: "#0b0b12", wall: "#12121c", accent: "#eab308" }, "Gold-lined bar at the top of the sail."),
    ],
  }),
  palmHotel({
    id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", short: "Jumeirah Beach Hotel", brand: { floor: "#e0f2fe", wall: "#f8fafc", accent: "#0369a1" },
    room: 1400, suite: "Ocean suite", suitePrice: 5200, spa: "Jumeirah Beach Hotel Spa",
    blurb: "The wave-shaped beach resort beside Burj Al Arab, next to Wild Wadi.",
    outlets: [outlet("Rockfish", "Seafood restaurant", "seafood", { floor: "#e0f2fe", wall: "#f8fafc", accent: "#0369a1" }, { blurb: "Mediterranean seafood looking across to Burj Al Arab." })],
  }),
  madinatJumeirah(),
  single("wild-wadi", "Wild Wadi Waterpark", "attraction", attraction("Wild Wadi Waterpark", "Waterpark beside Jumeirah Beach Hotel, famous for the Jumeirah Sceirah drop slide. Reported closed until further notice in 2026.", "pool", [
    ticket("wild-wadi:day", "Wild Wadi day pass", 299, "All slides and pools for the day.", "🌊"),
  ], [{ id: "sceirah", label: "Ride the Jumeirah Sceirah", icon: "🌊", animation: "clap", reward: 50 }])),
  publicBeach("sunset-beach", "Sunset Beach, Umm Suqeim", "The free beach with the classic Burj Al Arab view, best at sunset.", [], [
    { id: "photo", label: "Photograph Burj Al Arab at Golden Hour", icon: "📸", animation: "wave", reward: 30, need: { kind: "fun", amount: 25 }, desc: "Snap iconic photos with pink and golden skies behind the 7-star sail." },
    { id: "sunset:swim", label: "Sunset Arabian Gulf Ocean Dip", icon: "🌊", animation: "clap", reward: 15, need: { kind: "hygiene", amount: 25 }, desc: "Wash off the sand and stress in the warm Gulf waters." },
    { id: "sunset:yoga", label: "Beachfront Sunset Meditation & Yoga", icon: "🧘", animation: "sit", reward: 20, need: { kind: "energy", amount: 25 }, desc: "Unwind on the shore as the sun dips below the horizon." },
  ]),
  publicBeach("kite-beach", "Kite Beach", "Free beach for kitesurfing and beach sports, with a running track, skate park and food trucks.", [
    attraction("Kite Beach Kitesurf School", "Kitesurf and paddleboard lessons off Kite Beach.", "pool", [
      ticket("kite-beach:kitesurf", "Kitesurf lesson (1 hour)", 400, "With an instructor and all the gear.", "🪁"),
      ticket("kite-beach:sup", "Paddleboard hire (1 hour)", 100, "Board, paddle and life vest.", "🏄"),
    ], [{ id: "kite", label: "Kitesurf", icon: "🪁", animation: "clap", reward: 40, need: { kind: "fun", amount: 35 }, desc: "Harness the sea breeze and catch air over the waves." }]),
    venue("SALT", "Burger truck", "restaurant", {
      layout: "outdoor", palette: PALETTES.lobby, noJob: true, blurb: "The Kite Beach food truck famous for its sliders.",
      products: [
        { id: "salt:sliders", name: "Wagyu sliders", price: 55, icon: "🍔", station: "bar", desc: "Two sliders, the classic.", consumable: { need: "hunger", amount: 30 } },
        { id: "salt:fries", name: "Cheese fries", price: 25, icon: "🍟", station: "bar", desc: "", consumable: { need: "hunger", amount: 12 } },
        { id: "salt:ice-cream", name: "Soft-serve ice cream", price: 20, icon: "🍦", station: "bar", desc: "", consumable: { need: "fun", amount: 10 } },
        { id: "salt:lemonade", name: "Fresh lemonade", price: 18, icon: "🥤", station: "bar", desc: "", consumable: { need: "energy", amount: 8 } },
      ],
      activities: [
        { id: "salt:order", label: "Order Double Wagyu Sliders & Truffle Fries", icon: "🍔", animation: "sit", price: 55, need: { kind: "hunger", amount: 45 }, desc: "Hot off the grill sliders under the beach umbrellas." },
        { id: "salt:shake", label: "Soft-Serve Lotus Shake in the Sun", icon: "🍦", animation: "sit", price: 25, need: { kind: "fun", amount: 20 }, desc: "Creamy iced shake looking out onto the waves." },
      ],
    }),
  ], [
    { id: "run", label: "Tartan Track 5K Oceanfront Jog", icon: "🏃", animation: "clap", reward: 25, need: { kind: "energy", amount: 25 }, desc: "Run on the rubberized track with Burj Al Arab on the horizon." },
    { id: "muscle-beach", label: "Calisthenics Workout at Muscle Beach Rig", icon: "💪", animation: "clap", reward: 20, need: { kind: "energy", amount: 30 }, desc: "Dips, muscle-ups and pull-ups under the Dubai sunshine." },
    { id: "swim", label: "Arabian Gulf Sea Swim", icon: "🌊", animation: "clap", reward: 15, need: { kind: "hygiene", amount: 25 }, desc: "Cool off in the azure waters of the Arabian Gulf." },
  ]),
  publicBeach("jumeirah-public-beach", "Jumeirah Public Beach", "Free, open beach on Jumeirah Road with lifeguards and Burj Al Arab views."),
  publicBeach("jumeirah-beach-1", "Jumeirah Beach 1", "The 1.4 km stretch of Jumeirah 1 beach, redeveloped and reopened in 2026, with a boardwalk and cafés.", [
    outlet("Jumeirah Beach 1 · Boardwalk Café", "Café", "cafe", { floor: "#d6a76c", wall: "#fdf6e3", accent: "#0f766e" }),
  ]),
  publicBeach("jbr-the-beach", "JBR · The Beach", "The 1.7 km beach in front of Jumeirah Beach Residence and The Walk.", [], [
    { id: "volleyball", label: "Play beach volleyball", icon: "🏐", animation: "clap", reward: 25 },
  ]),
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
  ], [
    { id: "explore", label: "Complete the Discovery Trail", icon: "🧭", animation: "clap", reward: 100, need: { kind: "fun", amount: 40 }, desc: "Interactive journey through future sustainability, space and AI." },
    { id: "motf:dna", label: "Heal Institute Digital DNA Vault", icon: "🧬", animation: "sit", reward: 35, need: { kind: "fun", amount: 30 }, desc: "Explore thousands of illuminated specimen jars cataloging Earth's ecology." },
  ])),
  single("dubai-frame", "Dubai Frame", "attraction", attraction("Dubai Frame", "150 m picture frame with a glass-floored sky bridge between old and new Dubai.", "frame", [
    ticket("dubai-frame:entry", "Dubai Frame entry", 50, "Sky deck and the glass bridge.", "🖼️"),
  ], [
    { id: "glass-floor", label: "Step onto 150m Glass Bridge", icon: "😱", animation: "clap", reward: 25, need: { kind: "fun", amount: 30 }, desc: "Liquid crystal panels turn transparent beneath your feet 150m high." },
    { id: "frame:contrast", label: "Compare Old Deira vs Futuristic Skyline", icon: "🔭", animation: "wave", reward: 20, need: { kind: "fun", amount: 20 }, desc: "Look north to the historic Creek, and south to the soaring towers of SZR." },
  ])),
  single("dubai-opera", "Dubai Opera", "attraction", attraction("Dubai Opera", "Dhow-shaped performing-arts venue for opera, ballet and concerts.", "stage", [
    ticket("opera:stalls", "Show ticket — Stalls", 450, "Tonight's performance.", "🎭"),
    ticket("opera:balcony", "Show ticket — Balcony", 250, "Great view from above.", "🎭"),
    ticket("opera:tour", "Backstage architectural tour", 120, "Behind the scenes of the dhow.", "🏛️"),
  ], [{ id: "applaud", label: "Give a standing ovation", icon: "👏", animation: "clap", reward: 15, need: { kind: "fun", amount: 35 }, desc: "Applaud world-class orchestral and theatrical headliners." }])),
  single("dubai-fountain", "The Dubai Fountain", "park", venue("The Dubai Fountain", "Attraction", "hotel", {
    role: "Boardwalk guide", noJob: true,
    layout: "outdoor", palette: PALETTES.park, feature: "pool", blurb: "World's largest choreographed fountain — shows every 30 minutes in the evening.",
    products: [ticket("fountain:abra", "Lake abra ride", 68, "Traditional boat ride during the show.", "🛶"), ticket("fountain:boardwalk", "Fountain Boardwalk", 20, "Walk out onto the lake, metres from the jets.", "🌊")],
    activities: [
      { id: "watch", label: "Watch the fountain show (free)", icon: "⛲", animation: "clap", reward: 10, need: { kind: "fun", amount: 20 }, desc: "Choreographed lights and music soaring 140m into the sky." },
      { id: "fountain:abra", label: "Lake Abra Traditional Crossing", icon: "🛶", animation: "sit", price: 68, need: { kind: "fun", amount: 35 }, desc: "Float across Burj Lake right beside the soaring illuminated water jets." },
      { id: "fountain:boardwalk", label: "Fountain Boardwalk Water Spray Selfie", icon: "📸", animation: "clap", price: 20, need: { kind: "fun", amount: 25 }, desc: "Get misted by the water shooters from the floating boardwalk." },
    ],
  })),
  single("burj-park", "Burj Park", "park", venue("Burj Park", "Park", "hotel", {
    role: "Park ranger", noJob: true,
    layout: "outdoor", palette: PALETTES.park, blurb: "Lawns beside Burj Khalifa — picnics, fitness and events.",
    products: [ticket("burj-park:bike", "Bike rental (1 hour)", 50, "Cycle the boulevard loop.", "🚲")],
    activities: [
      { id: "picnic", label: "Lawn Picnic under Burj Khalifa", icon: "🧺", animation: "sit", price: 30, need: { kind: "hunger", amount: 30 }, desc: "Relax on the green grass overlooking the world's tallest skyscraper." },
      { id: "workout", label: "Burj Boulevard Cycling Loop", icon: "🚲", animation: "clap", price: 50, reward: 35, need: { kind: "energy", amount: 30 }, desc: "Pedal the illuminated 3.5km boulevard loop around Downtown." },
      { id: "park:stretch", label: "Calisthenics & Stretching on the Green", icon: "🧘", animation: "clap", price: 0, reward: 20, need: { kind: "energy", amount: 20 }, desc: "Push-ups and core workout on the park lawn." },
    ],
  })),
  single("dxb-terminal-1", "DXB Terminal 1 (Concourse D)", "attraction", venue("DXB Terminal 1 (Sheikh Rashid Concourse)", "Airport Terminal", "hotel", {
    palette: PALETTES.tech,
    blurb: "International gateway hosting 60+ global airlines including British Airways, Singapore Airlines, and Lufthansa.",
    products: [
      ticket("dxb:ba-heathrow", "British Airways Club World to London", 4800, "Direct international flight from Concourse D.", "🇬🇧"),
      ticket("dxb:sq-singapore", "Singapore Airlines First Class to Singapore", 7900, "World-renowned private enclosed luxury cabin.", "🇸🇬"),
      ticket("dxb:ahlan-lounge", "Ahlan Business Lounge Access", 280, "International buffet, barista coffee & shower suites.", "🛋️"),
      ticket("dxb:limousine", "DXB Chauffeur Airport Limousine", 350, "Direct luxury transfer across Dubai.", "🚘"),
    ],
    activities: [
      { id: "dxb:concourse-walk", label: "Stroll Concourse D Glass Walkway", icon: "🧳", animation: "clap", reward: 20 },
      { id: "dxb:plane-spot", label: "Plane Spotting on Apron", icon: "🔭", animation: "sit", reward: 25 },
    ],
  })),
  single("dxb-terminal-2", "DXB Terminal 2 (flydubai & Executive)", "attraction", venue("DXB Terminal 2 (flydubai & Executive)", "Airport Terminal", "hotel", {
    palette: PALETTES.dining,
    blurb: "Regional flight hub for flydubai and VIP executive business jets with apron tarmac boarding.",
    products: [
      ticket("dxb:fz-maldives", "flydubai Business Class to Maldives (MLE)", 2900, "Lie-flat seats on the Boeing 737 MAX 8.", "🏖️"),
      ticket("dxb:fz-salalah", "flydubai Weekend Getaway to Salalah (SLL)", 650, "Direct flight to the Khareef mist mountains.", "🌴"),
      ticket("dxb:exec-jet", "Private Charter Flight (Executive Stand)", 12500, "VIP Gulfstream G650 private terminal boarding.", "🛩️"),
      ticket("dxb:marhaba", "Marhaba Bronze Meet & Greet", 160, "Fast-track security and baggage escort.", "🤝"),
    ],
    activities: [
      { id: "dxb:t2-tarmac", label: "Board via Tarmac Airstairs", icon: "🚶", animation: "clap", reward: 15 },
      { id: "dxb:exec-lounge", label: "Executive VIP Flight Lounge", icon: "🍸", animation: "sit", reward: 30 },
    ],
  })),
  single("dxb-terminal-3", "DXB Terminal 3 (Emirates Megahub)", "attraction", venue("DXB Terminal 3 (Emirates Megahub)", "Airport Terminal", "hotel", {
    palette: PALETTES.luxury,
    blurb: "World's largest airport terminal, home of Emirates Airbus A380 superjumbos and luxury first-class lounges.",
    products: [
      ticket("dxb:a380-london", "Emirates First Class to London Heathrow (A380)", 8500, "Private suite with sliding doors, onboard shower spa & lounge bar.", "✈️"),
      ticket("dxb:a380-jfk", "Emirates Business Class to New York JFK", 5200, "Lie-flat bed, multi-course dining & Dom Pérignon.", "🗽"),
      ticket("dxb:lounge-t3", "Emirates First Class Lounge Day Pass", 650, "Full buffet, private quiet room, sommelier tasting & spa treatment.", "🥂"),
      { id: "dxb:duty-free-gold", name: "Dubai Duty Free 24K Gold Bar (10g)", price: 3200, icon: "🪙", station: "reception", desc: "Certified 999.9 pure Swiss gold bullion.", service: false },
      { id: "dxb:duty-free-oud", name: "Royal Arabian Oud & Amber Perfume", price: 420, icon: "✨", station: "reception", desc: "Signature DXB Duty Free luxury fragrance.", consumable: { need: "fun", amount: 40 } },
    ],
    activities: [
      { id: "dxb:board-a380", label: "Board the A380 Upper Deck", icon: "🛫", animation: "clap", reward: 50 },
      { id: "dxb:lounge-relax", label: "Relax in First Class Lounge", icon: "☕", animation: "sit", reward: 20 },
    ],
  })),
  {
    id: "dxb-international-airport",
    name: "Dubai International Airport (DXB)",
    kind: "attraction",
    blurb: "World's busiest international airport hub connecting 250+ global destinations across Terminals 1, 2 and 3.",
    venues: [
      venue("DXB Terminal 3 (Emirates Megahub)", "Airport Terminal", "hotel", {
        palette: PALETTES.luxury,
        blurb: "World's largest airport terminal, home of Emirates Airbus A380 superjumbos and luxury first-class lounges.",
        products: [
          ticket("dxb:a380-london", "Emirates First Class to London Heathrow (A380)", 8500, "Private suite with sliding doors, onboard shower spa & lounge bar.", "✈️"),
          ticket("dxb:a380-jfk", "Emirates Business Class to New York JFK", 5200, "Lie-flat bed, multi-course dining & Dom Pérignon.", "🗽"),
          ticket("dxb:lounge-t3", "Emirates First Class Lounge Day Pass", 650, "Full buffet, private quiet room, sommelier tasting & spa treatment.", "🥂"),
          { id: "dxb:duty-free-gold", name: "Dubai Duty Free 24K Gold Bar (10g)", price: 3200, icon: "🪙", station: "reception", desc: "Certified 999.9 pure Swiss gold bullion.", service: false },
          { id: "dxb:duty-free-oud", name: "Royal Arabian Oud & Amber Perfume", price: 420, icon: "✨", station: "reception", desc: "Signature DXB Duty Free luxury fragrance.", consumable: { need: "fun", amount: 40 } },
        ],
        activities: [
          { id: "dxb:board-a380", label: "Board the A380 Upper Deck", icon: "🛫", animation: "clap", reward: 50 },
          { id: "dxb:lounge-relax", label: "Relax in First Class Lounge", icon: "☕", animation: "sit", reward: 20 },
        ],
      }),
      venue("DXB Terminal 1 (Sheikh Rashid Concourse)", "Airport Terminal", "hotel", {
        palette: PALETTES.tech,
        blurb: "International gateway hosting 60+ global airlines including British Airways, Singapore Airlines, and Lufthansa.",
        products: [
          ticket("dxb:ba-heathrow", "British Airways Club World to London", 4800, "Direct international flight from Concourse D.", "🇬🇧"),
          ticket("dxb:sq-singapore", "Singapore Airlines First Class to Singapore", 7900, "World-renowned private enclosed luxury cabin.", "🇸🇬"),
          ticket("dxb:ahlan-lounge", "Ahlan Business Lounge Access", 280, "International buffet, barista coffee & shower suites.", "🛋️"),
          ticket("dxb:limousine", "DXB Chauffeur Airport Limousine", 350, "Direct luxury transfer across Dubai.", "🚘"),
        ],
        activities: [
          { id: "dxb:concourse-walk", label: "Stroll Concourse D Glass Walkway", icon: "🧳", animation: "clap", reward: 20 },
          { id: "dxb:plane-spot", label: "Plane Spotting on Apron", icon: "🔭", animation: "sit", reward: 25 },
        ],
      }),
      venue("DXB Terminal 2 (flydubai & Executive)", "Airport Terminal", "hotel", {
        palette: PALETTES.dining,
        blurb: "Regional flight hub for flydubai and VIP executive business jets with apron tarmac boarding.",
        products: [
          ticket("dxb:fz-maldives", "flydubai Business Class to Maldives (MLE)", 2900, "Lie-flat seats on the Boeing 737 MAX 8.", "🏖️"),
          ticket("dxb:fz-salalah", "flydubai Weekend Getaway to Salalah (SLL)", 650, "Direct flight to the Khareef mist mountains.", "🌴"),
          ticket("dxb:exec-jet", "Private Charter Flight (Executive Stand)", 12500, "VIP Gulfstream G650 private terminal boarding.", "🛩️"),
          ticket("dxb:marhaba", "Marhaba Bronze Meet & Greet", 160, "Fast-track security and baggage escort.", "🤝"),
        ],
        activities: [
          { id: "dxb:t2-tarmac", label: "Board via Tarmac Airstairs", icon: "🚶", animation: "clap", reward: 15 },
          { id: "dxb:exec-lounge", label: "Executive VIP Flight Lounge", icon: "🍸", animation: "sit", reward: 30 },
        ],
      }),
    ],
  },
  ...PALM_PLACES,
  ...COAST_PLACES,
  ...SZR_PLACES,
  ...JBR_PLACES,
  ...MARINA_PLACES,
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
