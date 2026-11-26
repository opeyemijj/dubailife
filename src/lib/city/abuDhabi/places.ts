// Abu Dhabi's places (ids "ad-…"): what's inside each building on its map (./map.ts), built from the same kit as
// Dubai's (lib/city/places placeKit: the same shops, menus, staff, jobs, hotels with suites, yachts and races) but
// kept out of Dubai's lists (registered with registerCityPlaces, found by getPlace). Homes in its towers and villas
// are rows in the flats table like Dubai's (supabase *_abu_dhabi.sql), so renting, buying and decorating just work.

import { placeKit, registerCityPlaces } from "@/lib/city/places";
import type { Place, Venue, VenueActivity } from "@/lib/city/types";

const { venue, spa, pool, single, ticket, yacht, gymActivities, PALETTES } = placeKit;

const swim: VenueActivity[] = [{ id: "swim", label: "Swim in the Gulf", icon: "🏊", animation: "wave", need: { kind: "fun", amount: 25 } }];
/** A venue from the kit with activities of Abu Dhabi's own added. */
const plus = (v: Venue, more: VenueActivity[]): Venue => ({ ...v, activities: [...(v.activities ?? []), ...more] });
/** A beach club's daybeds and drinks (a public beach sells nothing: products []). */
const daybeds = (id: string) => [
  ticket(`${id}:daybed`, "Daybed for the day", 250, "A shaded daybed on the sand, towels included.", "🏖️"),
  ticket(`${id}:cabana`, "Private cabana", 900, "A cabana for up to six, with a host.", "⛱️"),
  { id: `${id}:coconut`, name: "Fresh coconut", price: 30, icon: "🥥", station: "bar" as const, desc: "Cold, straight from the shell.", consumable: { need: "energy" as const, amount: 12 } },
  { id: `${id}:mocktail`, name: "Sunset mocktail", price: 45, icon: "🍹", station: "bar" as const, desc: "Mango, passion fruit and mint.", consumable: { need: "social" as const, amount: 10 } },
];

export const AD_PLACES: Place[] = [
  // ---------------------------------------------------------------- the airport
  {
    // Going to the airport takes you straight into the terminal's check-in (/fly), not a room first.
    id: "ad-auh-airport", name: "Abu Dhabi International Airport (AUH)", kind: "attraction", route: "/fly?to=dubai",
    blurb: "Terminal A, with Dubai Life Airways flights back to Dubai. Taxis wait outside arrivals.",
    venues: [venue("AUH Terminal A", "Airport Terminal", "hotel", {
      palette: PALETTES.luxury, blurb: "Check in for your Dubai Life Airways flight, or grab a taxi into the city.", role: "Check-in agent", noJob: true,
      products: [ticket("auh:lounge", "Dubai Life Airways Lounge Day Pass", 550, "Buffet, showers and quiet pods before you fly.", "🥂")],
      activities: [{ id: "auh:fly-dxb", label: "Fly to Dubai: check in, board, take off", icon: "🛫", href: "/fly?from=abu-dhabi&to=dubai" }],
    })],
  },

  // ---------------------------------------------------------------- Corniche & Downtown
  single("ad-emirates-palace", "Emirates Palace Mandarin Oriental", "hotel", venue("Emirates Palace Mandarin Oriental", "Palace hotel & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "The palace on its own beach: gold domes, a 1.3 km private shore, and the famous gold-flake cappuccino.",
    extraProducts: [{ id: "ep:gold-cappuccino", name: "Gold-flake cappuccino", price: 95, icon: "☕", station: "reception", desc: "The palace's famous cappuccino, dusted with 24-carat gold.", consumable: { need: "energy", amount: 20 } }],
  })),
  {
    id: "ad-qasr-al-watan", name: "Qasr Al Watan", kind: "attraction",
    blurb: "The Presidential Palace: the Great Hall's dome, the House of Knowledge and the evening light show.",
    venues: [venue("Qasr Al Watan", "Presidential palace & museum", "hotel", {
      layout: "lobby", palette: PALETTES.luxury, role: "Palace guide", noJob: true, blurb: "Walk the Great Hall under the 37 m dome.",
      products: [ticket("qaw:entry", "Palace entry", 65, "The Great Hall, the Spirit of Collaboration and the gardens.", "🏛️"), ticket("qaw:show", "Palace in Motion light show", 35, "The evening show on the palace walls.", "✨")],
      activities: [
        { id: "qaw:tour", label: "Tour the Great Hall", icon: "🏛️", animation: "talk", reward: 30, need: { kind: "fun", amount: 25 } },
        { id: "qaw:lights", label: "Watch Palace in Motion (the light show)", icon: "✨", animation: "clap", reward: 25, need: { kind: "fun", amount: 30 }, desc: "The palace walls light up with the story of the nation after dark." },
      ],
    })],
  },
  {
    id: "ad-corniche-beach", name: "Corniche Beach", kind: "park",
    blurb: "Eight kilometres of Blue Flag beach on the island's Gulf shore, with the towers behind it.",
    venues: [venue("Corniche Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, blurb: "Sun loungers, the calm Gulf and the skyline behind you.", activities: swim })],
  },
  {
    id: "ad-wtc-mall", name: "World Trade Center Mall & Central Market", kind: "mall",
    blurb: "The mall under the twin towers and the souk beside it: carpets, oud, dates and fashion.",
    venues: [
      venue("Central Market Souk", "Souk · carpets, oud and dates", "fragrance", { blurb: "Arabesque lattices over stalls of oud, carpets and dates." }),
      venue("WTC Fashion Avenue", "Fashion", "fashion"),
      venue("Corniche Supermarket", "Supermarket", "supermarket"),
      venue("Café Arabia", "Café", "cafe"),
    ],
  },
  {
    id: "ad-etihad-towers-club", name: "Observation Deck at 300 & Sky Lounge", kind: "club",
    blurb: "High tea on the 74th floor, then cocktails-free mocktails and DJs in the lounge.",
    venues: [venue("Sky Lounge at 300", "Sky bar & lounge", "club", { feature: "skyline", blurb: "The whole city and the Gulf below you." })],
  },
  {
    id: "ad-corniche-dining", name: "Corniche Food Street", kind: "food-hall",
    blurb: "Shawarma, Lebanese grills, karak and Emirati luqaimat along the Corniche.",
    venues: [
      venue("Al Mrzab Seafood", "Emirati seafood", "restaurant"),
      venue("Lebanese Flower", "Lebanese grills", "restaurant"),
      venue("Karak House Corniche", "Karak, luqaimat & breakfasts", "cafe"),
    ],
  },

  // ---------------------------------------------------------------- Al Reem Island
  {
    id: "ad-galleria", name: "The Galleria Al Maryah Island", kind: "mall",
    blurb: "Luxury fashion, a waterfront promenade of restaurants and an ice rink.",
    venues: [
      venue("Galleria Luxury Avenue", "Luxury fashion", "luxury"),
      venue("Galleria Fashion", "Fashion", "fashion"),
      venue("Galleria Tech", "Electronics", "electronics"),
      venue("Galleria Beauty", "Beauty", "beauty"),
      venue("Galleria Jewellery", "Jewellery & watches", "jewellery"),
      venue("Waterfront Steakhouse", "Dining", "restaurant"),
      venue("Galleria Cinemas", "Cinema", "club", {
        role: "Cinema host", noJob: true, layout: "lobby", palette: PALETTES.night, feature: "stage", blurb: "The latest films in reclining seats.",
        products: [ticket("galleria-cinemas:standard", "Movie ticket", 55, "Tonight's blockbuster."), ticket("galleria-cinemas:recliner", "Recliner ticket", 150, "A reclining seat with food service.", "🍿"), { id: "galleria-cinemas:popcorn", name: "Large popcorn", price: 39, icon: "🍿", station: "counter", desc: "Salted or caramel.", consumable: { need: "fun", amount: 8 } }],
        activities: [{ id: "galleria:film", label: "Watch tonight's film", icon: "🎬", animation: "sit", reward: 20, need: { kind: "fun", amount: 40 } }],
      }),
    ],
  },
  {
    id: "ad-reem-gym", name: "Reem Fitness Club", kind: "attraction",
    blurb: "A rooftop gym with a view of the mangroves.",
    venues: [venue("Reem Fitness Club", "Gym", "sports", { role: "Personal trainer", blurb: "Treadmills, weights, a ring and spin.", activities: gymActivities("reem-fitness", true) })],
  },

  // ---------------------------------------------------------------- Saadiyat Island
  {
    id: "ad-louvre", name: "Louvre Abu Dhabi", kind: "attraction",
    blurb: "Under the 180 m dome's rain of light: galleries of art from every age, on the water.",
    venues: [venue("Louvre Abu Dhabi", "Museum", "hotel", {
      layout: "lobby", palette: { floor: "#e7e2da", wall: "#f7f5f1", accent: "#57534e" }, role: "Museum guide", noJob: true,
      blurb: "The dome's rain of light over the plaza, and the galleries.",
      products: [ticket("louvre:entry", "Museum entry", 63, "All galleries and the plaza under the dome.", "🖼️"), ticket("louvre:kayak", "Kayak under the dome", 260, "Paddle the waterways round the museum.", "🛶")],
      activities: [{ id: "louvre:tour", label: "Walk the galleries", icon: "🖼️", animation: "talk", reward: 30, need: { kind: "fun", amount: 25 } }],
    })],
  },
  single("ad-saadiyat-resort", "Saadiyat Beach Resort", "hotel", venue("Saadiyat Beach Resort", "Beach resort & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "On Saadiyat's white beach, where turtles nest and dolphins pass.",
  })),
  {
    id: "ad-saadiyat-beach-club", name: "Saadiyat Beach Club", kind: "club",
    blurb: "Day beds on the sand, a pool and sunset DJ sessions.",
    venues: [
      venue("Saadiyat Beach", "Beach club", "hotel", {
        layout: "beach", products: daybeds("saadiyat-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, blurb: "White sand and the calm Gulf, where hawksbill turtles nest.",
        activities: [...swim, { id: "saadiyat:turtles", label: "Watch the hawksbill turtles nest", icon: "🐢", animation: "talk", reward: 35, need: { kind: "fun", amount: 30 }, desc: "With a ranger, at a distance: the turtles come up the beach to nest from April to July." }],
      }),
      pool("Saadiyat Beach Club Pool"),
    ],
  },

  // ---------------------------------------------------------------- Yas Island
  {
    id: "ad-yas-marina-circuit", name: "Yas Marina Circuit", kind: "attraction", route: "/autodrome",
    blurb: "The Grand Prix circuit under the lit hotel: bring your car and race your friends, live.",
    venues: [venue("Yas Marina Circuit", "Car racing", "electronics", { blurb: "Open a race and invite friends who have cars.", role: "Race marshal", noJob: true })],
  },
  {
    id: "ad-ferrari-world", name: "Ferrari World Abu Dhabi", kind: "attraction",
    blurb: "Under the red roof: the world's fastest roller coaster, 0 to 240 km/h in 4.9 seconds.",
    venues: [venue("Ferrari World", "Theme park", "hotel", {
      // Indoors under the red roof: a theme park, not a waterpark (that's Yas Waterworld).
      layout: "lobby", feature: "exhibits", palette: { floor: "#7f1d1d", wall: "#fee2e2", accent: "#dc2626" }, role: "Ride host", noJob: true,
      blurb: "Coasters, a racing school and the simulators.",
      products: [ticket("fw:day", "Day pass", 345, "Every ride, all day.", "🎢"), ticket("fw:fast", "Quick pass", 199, "Skip the queues.", "⚡")],
      activities: [
        { id: "fw:formula-rossa", label: "Ride Formula Rossa (240 km/h)", icon: "🎢", animation: "clap", reward: 60, need: { kind: "fun", amount: 50 } },
        { id: "fw:flying-aces", label: "Ride Flying Aces", icon: "✈️", animation: "clap", reward: 40, need: { kind: "fun", amount: 40 } },
      ],
    })],
  },
  {
    id: "ad-yas-mall", name: "Yas Mall", kind: "mall",
    blurb: "Over 370 shops, a cinema, a food court and a family entertainment centre.",
    venues: [
      venue("Yas Fashion", "Fashion", "fashion"), venue("Yas Sports", "Sportswear", "sports"), venue("Yas Electronics", "Electronics", "electronics"),
      venue("Yas Beauty", "Beauty", "beauty"), venue("Yas Hypermarket", "Supermarket", "supermarket"), venue("Yas Toys", "Toys", "toys"),
      venue("Yas Food Court", "Food court", "restaurant"),
    ],
  },
  {
    id: "ad-yas-bay", name: "Yas Bay Waterfront", kind: "club",
    blurb: "The waterfront's restaurants by day and its clubs by night, beside the Etihad Arena.",
    venues: [
      venue("Yas Bay Nightclub", "Nightclub", "club", { blurb: "DJs, a light wall and the bay outside." }),
      venue("Yas Bay Rooftop", "Rooftop bar", "club", { feature: "skyline" }),
      venue("Yas Bay Grill", "Waterfront dining", "restaurant"),
    ],
  },
  {
    id: "ad-yas-marina", name: "Yas Marina", kind: "attraction",
    blurb: "Superyachts under the circuit's lit hotel: charter one with friends.",
    venues: [
      yacht("Yas Sunseeker 75", 3500, 12, "A sleek flybridge yacht for a sunset cruise round Yas."),
      yacht("Yas Superyacht Royale", 9500, 30, "The marina's biggest: a party deck and a jacuzzi on the bow."),
    ],
  },
  single("ad-w-yas", "W Abu Dhabi Yas Island", "hotel", venue("W Abu Dhabi Yas Island", "Hotel over the circuit", "hotel", {
    palette: PALETTES.night, blurb: "The hotel the circuit runs under, its lit grid roof changing colour at night.",
    activities: [{ id: "wyas:gp", label: "Watch the Grand Prix from the roof", icon: "🏁", animation: "clap", reward: 40, need: { kind: "fun", amount: 45 }, desc: "Grand Prix weekend: the cars scream through the tunnel under the hotel as the roof lights change." }],
  })),

  // ---------------------------------------------------------------- Al Raha Beach
  single("ad-raha-beach-hotel", "Al Raha Beach Hotel", "hotel", venue("Al Raha Beach Hotel", "Beach hotel & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "Low and calm on Al Raha's beach, between the island and Yas.",
  })),
  {
    id: "ad-al-bandar", name: "Al Bandar Marina & Restaurants", kind: "food-hall",
    blurb: "Waterfront cafés and grills on the marina's boardwalk.",
    venues: [venue("Al Bandar Café", "Waterfront café", "cafe"), venue("Al Bandar Seafood Grill", "Seafood", "restaurant")],
  },

  // ---------------------------------------------------------------- Grand Mosque & Al Maqtaa
  {
    id: "ad-grand-mosque", name: "Sheikh Zayed Grand Mosque", kind: "attraction",
    blurb: "82 white marble domes, four minarets and the world's largest hand-knotted carpet. Modest dress, please.",
    venues: [venue("Sheikh Zayed Grand Mosque", "Mosque", "hotel", {
      palette: { floor: "#f8fafc", wall: "#f8fafc", accent: "#c9a24a" }, role: "Mosque guide", noJob: true, products: [],
      blurb: "The prayer hall under the crystal chandeliers, and the courtyard of flowers in marble.",
      activities: [
        { id: "szgm:tour", label: "Take the guided tour", icon: "🕌", animation: "talk", reward: 40, need: { kind: "social", amount: 25 } },
        { id: "szgm:reflect", label: "Sit and reflect", icon: "🤲", animation: "sit", reward: 20, need: { kind: "energy", amount: 20 } },
      ],
    })],
  },
  {
    id: "ad-qaryat-al-beri", name: "Souk Qaryat Al Beri", kind: "mall",
    blurb: "A souk of canals and wind towers facing the Grand Mosque across the water.",
    venues: [
      venue("Souk Perfumes & Oud", "Arabian fragrance", "fragrance"), venue("Souk Gold", "Jewellery & watches", "jewellery"),
      venue("Canal Café", "Café by the canal", "cafe"), venue("Souk Grill House", "Arabic grills", "restaurant"),
    ],
  },
  single("ad-shangri-la", "Shangri-La Qaryat Al Beri", "hotel", venue("Shangri-La Qaryat Al Beri", "Resort hotel & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "Wind towers, canals and a beach facing the Grand Mosque.",
  })),

  // ---------------------------------------------------------------- Khalifa City
  {
    id: "ad-khalifa-mall", name: "Khalifa City Market", kind: "mall",
    blurb: "The neighbourhood's shops: groceries, a pharmacy, a barber and cafés.",
    venues: [venue("Khalifa Supermarket", "Supermarket", "supermarket"), venue("Khalifa Pharmacy", "Pharmacy", "pharmacy"), venue("Khalifa Karak", "Karak & sandwiches", "cafe")],
  },

  // ---------------------------------------------------------------- Al Wathba and the desert
  {
    id: "ad-al-wathba-camel-track", name: "Al Wathba Camel Racetrack", kind: "attraction", route: "/racing/camel",
    blurb: "Abu Dhabi's great camel racetrack: pick a racing camel, steer its robot jockey and race your friends, live.",
    venues: [venue("Al Wathba Camel Racetrack", "Camel racing", "electronics", { blurb: "Pick a camel from the stable and open a race.", role: "Race steward", noJob: true })],
  },
  single("ad-desert-resort", "Al Wathba Desert Resort", "hotel", venue("Al Wathba Desert Resort", "Desert resort & suites", "hotel", {
    palette: PALETTES.oud, blurb: "Tented suites in the dunes, with a pool and a firepit under the stars.",
  })),
  {
    id: "ad-desert-safari", name: "Liwa Desert Safari Camp", kind: "attraction",
    blurb: "Dune bashing in a 4x4, camel rides, sandboarding and a Bedouin dinner under the stars.",
    venues: [venue("Liwa Desert Safari Camp", "Desert camp", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Safari guide", noJob: true, blurb: "The camp at the foot of the red dunes.",
      products: [ticket("safari:evening", "Evening safari with dinner", 280, "Dune bashing, a camel ride, sandboarding and a barbecue.", "🐪")],
      activities: [
        { id: "safari:dunes", label: "Go dune bashing", icon: "🚙", animation: "clap", reward: 50, need: { kind: "fun", amount: 45 } },
        { id: "safari:camel", label: "Ride a camel", icon: "🐪", animation: "wave", reward: 30, need: { kind: "fun", amount: 30 } },
        { id: "safari:dinner", label: "Bedouin dinner by the fire", icon: "🔥", animation: "sit", reward: 20, need: { kind: "hunger", amount: 60 } },
      ],
    })],
  },
  // ---------------------------------------------------------------- more hotels
  single("ad-corniche-grand-hotel", "Corniche Grand Hotel", "hotel", venue("Corniche Grand Hotel", "Hotel tower & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "A glass tower over the Corniche with Gulf-view suites and a sky pool.",
  })),
  single("ad-reem-rosewood", "Rosewood Al Maryah", "hotel", venue("Rosewood Al Maryah", "Hotel tower & suites", "hotel", {
    palette: PALETTES.night, blurb: "Above the financial district, over the Galleria's waterfront.",
  })),
  single("ad-st-regis-saadiyat", "The St. Regis Saadiyat Island", "hotel", venue("The St. Regis Saadiyat Island", "Beach resort & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "Mediterranean-style luxury on Saadiyat's white beach, with butler service.",
  })),
  single("ad-yas-plaza-hotel", "Yas Plaza Hotel", "hotel", venue("Yas Plaza Hotel", "Hotel tower & suites", "hotel", {
    palette: PALETTES.night, blurb: "Steps from the circuit, Ferrari World and Yas Mall.",
  })),
  single("ad-yas-island-rotana", "Yas Island Rotana", "hotel", venue("Yas Island Rotana", "Hotel & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "A relaxed hotel by the golf links, with a free shuttle round the island.",
  })),
  single("ad-fairmont-bab-al-bahr", "Fairmont Bab Al Bahr", "hotel", venue("Fairmont Bab Al Bahr", "Canal-side hotel & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "On the Khor Al Maqtaa with a private beach and views of the Grand Mosque.",
  })),
  single("ad-ritz-grand-canal", "The Ritz-Carlton Grand Canal", "hotel", venue("The Ritz-Carlton Grand Canal", "Venetian-style resort & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "Venetian arches on the Grand Canal, with abra rides and a lagoon pool.",
  })),
  single("ad-qasr-al-sarab", "Qasr Al Sarab Desert Resort", "hotel", venue("Qasr Al Sarab Desert Resort", "Desert palace resort & suites", "hotel", {
    palette: PALETTES.oud, blurb: "A fort-like palace deep in the Liwa dunes, with private pool villas.",
  })),

  // ---------------------------------------------------------------- more clubs and nightlife
  {
    id: "ad-corniche-club", name: "Level 47 Nightclub", kind: "club",
    blurb: "Forty-seven floors up over the Corniche: DJs, a dancefloor and mocktails with the city below.",
    venues: [venue("Level 47 Nightclub", "Nightclub", "club", { feature: "skyline", blurb: "The DJ booth faces the Gulf; the lights face you." })],
  },
  {
    id: "ad-etihad-arena", name: "Etihad Arena", kind: "club",
    blurb: "Yas Bay's 18,000-seat arena: concerts, comedy and fight nights.",
    venues: [venue("Etihad Arena", "Concert & events arena", "club", {
      blurb: "Tonight's show on the main stage.",
      products: [ticket("arena:concert", "Concert ticket", 350, "Standing on the floor for tonight's headliner.", "🎤"), ticket("arena:fight", "Fight night ringside", 600, "Ringside for the main card.", "🥊")],
      activities: [{ id: "arena:show", label: "Watch the show", icon: "🎤", animation: "clap", reward: 40, need: { kind: "fun", amount: 45 } }],
    })],
  },

  // ---------------------------------------------------------------- more beaches and beach clubs
  {
    id: "ad-al-bateen-beach", name: "Al Bateen Beach", kind: "park",
    blurb: "A quiet local beach at the end of the Corniche, by the old dhow yards.",
    venues: [venue("Al Bateen Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, blurb: "Soft sand and shallow, calm water.", activities: swim })],
  },
  {
    id: "ad-reem-beach-club", name: "Reem Beach Club", kind: "club",
    blurb: "An island beach club facing the mangroves: daybeds, a pool and sunset sets.",
    venues: [
      venue("Reem Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("reem-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, blurb: "Daybeds on the sand.", activities: swim }),
      pool("Reem Beach Club Pool"),
    ],
  },
  {
    id: "ad-soul-beach", name: "Soul Beach", kind: "club",
    blurb: "Saadiyat's barefoot beach club: hammocks, a beach bar and live music at sunset.",
    venues: [
      venue("Soul Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("soul-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, blurb: "Hammocks and the turquoise Gulf.", activities: swim }),
      venue("Soul Beach Bar", "Bar & grill on the sand", "restaurant"),
    ],
  },
  {
    id: "ad-yas-beach", name: "Yas Beach", kind: "club",
    blurb: "Yas Island's beach: daybeds, paddleboards and DJs at the weekend.",
    venues: [
      venue("Yas Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("yas-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, blurb: "Paddleboards, kayaks and the calm bay.", activities: swim }),
      pool("Yas Beach Pool"),
    ],
  },
  {
    id: "ad-raha-public-beach", name: "Al Raha Public Beach", kind: "park",
    blurb: "A long free beach along Al Raha, with a running track behind it.",
    venues: [venue("Al Raha Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, blurb: "Families, kites and the Yas skyline.", activities: swim })],
  },
  {
    id: "ad-raha-beach-club", name: "Al Raha Beach Club", kind: "club",
    blurb: "An infinity pool on the sand and a DJ deck by the water.",
    venues: [
      venue("Al Raha Beach Club", "Beach club", "hotel", { layout: "beach", products: daybeds("al-raha-beach-club"), palette: PALETTES.park, role: "Beach host", noJob: true, blurb: "The pool, the sand and the music.", activities: swim }),
      pool("Al Raha Beach Club Pool"),
    ],
  },

  // ---------------------------------------------------------------- more marinas (yacht charters)
  {
    id: "ad-breakwater-yacht-club", name: "Breakwater Yacht Club", kind: "attraction",
    blurb: "The Breakwater's marina by Emirates Palace: charter a yacht along the Corniche.",
    venues: [
      yacht("Corniche Azimut 60", 2800, 10, "A sleek cruiser along the Corniche to Emirates Palace."),
      yacht("Breakwater Majesty 100", 7800, 25, "A three-deck superyacht with a sundeck bar."),
    ],
  },
  {
    id: "ad-saadiyat-marina", name: "Saadiyat Marina", kind: "attraction",
    blurb: "Charter a yacht from Saadiyat to look for dolphins and sail past the Louvre's dome.",
    venues: [
      plus(yacht("Saadiyat Dolphin Cruiser", 2400, 12, "A morning cruise to find the dolphins off Saadiyat."), [
        { id: "saadiyat:dolphins", label: "Spot the humpback dolphins", icon: "🐬", animation: "wave", reward: 30, need: { kind: "fun", amount: 30 } },
      ]),
      yacht("Louvre Sunset Yacht", 4200, 16, "Sail under the Louvre's dome at sunset."),
    ],
  },
  {
    id: "ad-grand-canal-marina", name: "Grand Canal Marina", kind: "attraction",
    blurb: "Boats on the Khor Al Maqtaa, under the Grand Mosque's domes.",
    venues: [yacht("Grand Canal Cruiser", 2200, 10, "A slow cruise up the canal with the mosque lit up behind you.")],
  },

  // ---------------------------------------------------------------- more shopping
  {
    id: "ad-marina-mall", name: "Marina Mall", kind: "mall",
    blurb: "The Breakwater's mall: fashion, a hypermarket, an ice rink and the sky tower.",
    venues: [
      venue("Marina Fashion", "Fashion", "fashion"), venue("Marina Luxury", "Luxury fashion", "luxury"), venue("Marina Electronics", "Electronics", "electronics"),
      venue("Marina Hypermarket", "Supermarket", "supermarket"), venue("Marina Sky Tower Restaurant", "Revolving restaurant", "restaurant"), venue("Marina Café", "Café", "cafe"),
    ],
  },
  {
    id: "ad-raha-mall", name: "Al Raha Mall", kind: "mall",
    blurb: "The neighbourhood mall for Al Raha: groceries, fashion, a gym and cafés.",
    venues: [venue("Al Raha Supermarket", "Supermarket", "supermarket"), venue("Al Raha Fashion", "Fashion", "fashion"), venue("Al Raha Pharmacy", "Pharmacy", "pharmacy"), venue("Al Raha Coffee", "Café", "cafe")],
  },

  // ---------------------------------------------------------------- culture
  {
    id: "ad-al-hosn", name: "Qasr Al Hosn", kind: "attraction",
    blurb: "The city's oldest stone building: the fort the city grew around, with its watchtower and museum.",
    venues: [venue("Qasr Al Hosn", "Fort & museum", "hotel", {
      layout: "lobby", palette: PALETTES.oud, role: "Heritage guide", noJob: true, blurb: "The watchtower, the palace rooms and the story of the city.",
      products: [ticket("hosn:entry", "Fort entry", 30, "The fort, the watchtower and the House of Artisans.", "🏰")],
      activities: [{ id: "hosn:tour", label: "Tour the fort", icon: "🏰", animation: "talk", reward: 25, need: { kind: "fun", amount: 20 } }],
    })],
  },
  {
    id: "ad-guggenheim", name: "Guggenheim Abu Dhabi", kind: "attraction",
    blurb: "The modern art museum's stacked cones and galleries on Saadiyat.",
    venues: [venue("Guggenheim Abu Dhabi", "Modern art museum", "hotel", {
      layout: "lobby", palette: { floor: "#e7e5e4", wall: "#fafaf9", accent: "#0f766e" }, role: "Museum guide", noJob: true, blurb: "Big modern pieces under the cones.",
      products: [ticket("gugg:entry", "Museum entry", 70, "All the galleries.", "🎨")],
      activities: [{ id: "gugg:tour", label: "Walk the galleries", icon: "🎨", animation: "talk", reward: 30, need: { kind: "fun", amount: 25 } }],
    })],
  },
  {
    id: "ad-yas-waterworld", name: "Yas Waterworld", kind: "attraction",
    blurb: "Over 40 slides and rides, a wave pool and a lazy river.",
    venues: [venue("Yas Waterworld", "Waterpark", "hotel", {
      layout: "waterpark", palette: PALETTES.park, role: "Lifeguard", noJob: true, blurb: "The slides, the wave pool and the lazy river.",
      products: [ticket("yww:day", "Day pass", 295, "Every slide, all day.", "🌊")],
      // Its slides, the lazy river and the wave pool are the waterpark's rides, acted out in 3D (lib/city/rides).
    })],
  },
  {
    id: "ad-wathba-wetland", name: "Al Wathba Wetland Reserve", kind: "park",
    blurb: "Lagoons where thousands of flamingos feed: a hide, trails and a birdwatching tower.",
    venues: [venue("Al Wathba Wetland Reserve", "Nature reserve", "hotel", {
      layout: "outdoor", palette: PALETTES.park, role: "Ranger", noJob: true, blurb: "Flamingos on the lagoons.",
      products: [ticket("wetland:hide", "Guided birdwatching walk", 40, "A ranger, binoculars and the flamingo hide.", "🦩")],
      activities: [{ id: "wetland:birds", label: "Watch the flamingos", icon: "🦩", animation: "wave", reward: 20, need: { kind: "fun", amount: 20 } }],
    })],
  },
  {
    id: "ad-moreeb-camp", name: "Moreeb Dune Camp", kind: "attraction",
    blurb: "At the foot of Moreeb, one of the world's tallest dunes: 4x4 hill climbs and stargazing.",
    venues: [venue("Moreeb Dune Camp", "Desert camp", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Desert guide", noJob: true, blurb: "The great dune above the camp.",
      products: [ticket("moreeb:climb", "Dune climb in a 4x4", 220, "Up Moreeb's slope with a driver.", "🚙")],
      activities: [
        { id: "moreeb:climb", label: "Climb the dune", icon: "🏜️", animation: "clap", reward: 45, need: { kind: "fun", amount: 40 } },
        { id: "moreeb:stars", label: "Stargaze by the fire", icon: "✨", animation: "sit", reward: 15, need: { kind: "energy", amount: 20 } },
      ],
    })],
  },

  // ---------------------------------------------------------------- racing
  {
    id: "ad-equestrian-club", name: "Abu Dhabi Equestrian Club", kind: "attraction", route: "/racing/horse",
    blurb: "The capital's racecourse: pick a horse from the stable and race your friends, live.",
    venues: [venue("Abu Dhabi Equestrian Club", "Horse racing", "electronics", { blurb: "Pick a horse from the stable and open a race.", role: "Race steward", noJob: true })],
  },

  // ---------------------------------------------------------------- universities (the same courses as Academic City)
  university("ad-nyuad", "NYU Abu Dhabi", "Saadiyat's liberal-arts campus: business, hospitality and law.", [
    { campus: "aud", label: "Study business, real estate, hospitality & law", icon: "🎓" },
    { campus: "onebrain", label: "Take a new-economy course: AI, coding, marketing", icon: "💡" },
  ]),
  university("ad-sorbonne", "Sorbonne University Abu Dhabi", "The Sorbonne's campus on Reem: languages, UAE studies and finance.", [
    { campus: "dc", label: "Study English, UAE studies & personal finance", icon: "📚" },
    { campus: "aud", label: "Study business & law", icon: "🎓" },
  ]),
  university("ad-khalifa-university", "Khalifa University", "The science and engineering university: cybersecurity, healthcare and tech.", [
    { campus: "ud", label: "Study cybersecurity, healthcare, accounting & logistics", icon: "🔬" },
    { campus: "onebrain", label: "Take AI, data & programming", icon: "💻" },
  ]),
  // ---------------------------------------------------------------- only in Abu Dhabi
  {
    id: "ad-mangroves", name: "Mangrove National Park", kind: "park",
    blurb: "Paddle a kayak through the mangrove channels: herons, crabs and the city's towers over the trees.",
    venues: [venue("Mangrove Kayak Launch", "Kayak tours", "hotel", {
      layout: "outdoor", palette: PALETTES.park, role: "Kayak guide", noJob: true, blurb: "The launch jetty at the edge of the mangroves.",
      products: [ticket("mangrove:kayak", "Kayak tour (90 min)", 150, "A guided paddle through the channels.", "🛶"), ticket("mangrove:sunset", "Sunset paddle", 190, "The same channels as the sun goes down.", "🌅")],
      activities: [
        { id: "mangrove:kayak", label: "Kayak through the mangroves", icon: "🛶", animation: "wave", reward: 35, need: { kind: "fun", amount: 35 }, desc: "Glide between the roots and look out for herons and crabs." },
        { id: "mangrove:sup", label: "Stand-up paddle the lagoon", icon: "🏄", animation: "wave", reward: 20, need: { kind: "fun", amount: 25 } },
      ],
    })],
  },
  {
    id: "ad-dhow-harbour", name: "Heritage Village & Dhow Harbour", kind: "attraction",
    blurb: "Life before oil: a palm-frond village, a pearl divers' boat and the wooden dhows that sail the Corniche.",
    venues: [
      venue("Heritage Village", "Heritage village", "hotel", {
        layout: "outdoor", palette: PALETTES.oud, role: "Heritage guide", noJob: true, blurb: "Barasti huts, a falaj water channel and craftsmen at work.",
        products: [
          { id: "heritage:dates", name: "Fresh khalas dates", price: 25, icon: "🌴", station: "counter", desc: "From the village's own palms.", consumable: { need: "hunger", amount: 10 } },
          { id: "heritage:gahwa", name: "Arabic coffee (gahwa)", price: 10, icon: "☕", station: "counter", desc: "Cardamom coffee in a small finjan.", consumable: { need: "energy", amount: 8 } },
          { id: "heritage:pottery", name: "Hand-thrown clay pot", price: 120, icon: "🏺", station: "counter", desc: "Made in front of you." },
        ],
        activities: [
          { id: "dhow:pearl", label: "Dive for pearls with the old divers", icon: "🦪", animation: "wave", reward: 40, need: { kind: "fun", amount: 35 }, desc: "A nose clip, a stone weight and one breath: the way the Gulf's pearls were found." },
          { id: "heritage:craft", label: "Weave palm fronds with the craftsmen", icon: "🧺", animation: "sit", reward: 15, need: { kind: "social", amount: 15 } },
        ],
      }),
      venue("Corniche Dhow Cruise", "Dhow cruise", "hotel", {
        layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true,
        blurb: "A wooden dhow along the Corniche at sunset, with dinner on deck.",
        products: [ticket("dhow:sunset", "Sunset dhow cruise with dinner", 180, "Two hours along the Corniche, a buffet on deck.", "⛵")],
        activities: [{ id: "dhow:cruise", label: "Sail the Corniche on a dhow", icon: "⛵", animation: "sit", reward: 35, need: { kind: "fun", amount: 35 }, desc: "The skyline lights up as you sail past Emirates Palace." }],
      }),
    ],
  },
  {
    id: "ad-falcon-hospital", name: "Abu Dhabi Falcon Hospital", kind: "attraction",
    blurb: "The world's biggest falcon hospital: meet the patients, hold a falcon and watch them fly.",
    venues: [venue("Abu Dhabi Falcon Hospital", "Falcon hospital & falconry", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Falconer", noJob: true, blurb: "Hooded falcons on their perches, and the flying field outside.",
      products: [ticket("falcon:tour", "Hospital tour", 170, "The wards, the vets and a falcon on your arm.", "🦅")],
      activities: [
        { id: "falcon:show", label: "Watch the falconry show", icon: "🦅", animation: "clap", reward: 35, need: { kind: "fun", amount: 35 }, desc: "The falconer swings the lure and the falcon dives." },
        { id: "falcon:hold", label: "Hold a falcon on your glove", icon: "🧤", animation: "wave", reward: 25, need: { kind: "social", amount: 20 } },
      ],
    })],
  },
  spaPlace(),
];

/** A university: its lecture hall, library café and bookshop. Courses are Academic City's (lib/city/academic),
 *  opened from the campus, so your certificates count wherever you study. */
function university(id: string, name: string, blurb: string, courses: { campus: string; label: string; icon: string }[]): Place {
  return {
    id, name, kind: "attraction", blurb,
    venues: [
      venue(`${name} Lecture Hall`, "University campus", "hotel", {
        layout: "lobby", palette: { floor: "#e7e5e4", wall: "#f8fafc", accent: "#1e3a8a" }, role: "Lecturer", noJob: true,
        products: [
          { id: `${id}:notebook`, name: "Campus notebook & pen", price: 25, icon: "📓", station: "counter", desc: `${name} branded stationery.` },
          { id: `${id}:hoodie`, name: "University hoodie", price: 140, icon: "🧥", station: "counter", desc: "Campus shop hoodie." },
        ],
        blurb: "Enrol, attend lectures and sit your exams.",
        activities: [
          ...courses.map((c, i): VenueActivity => ({ id: `${id}:study-${i}`, label: c.label, icon: c.icon, href: `/academics/${c.campus}` })),
          { id: `${id}:library`, label: "Study in the library", icon: "📖", animation: "sit", reward: 10, need: { kind: "energy", amount: 10 } },
        ],
      }),
      venue(`${name} Campus Café`, "Campus café", "cafe"),
    ],
  };
}

/** A hammam and spa at Emirates Palace's neighbour on the Corniche. */
function spaPlace(): Place {
  return { id: "ad-corniche-spa", name: "Corniche Hammam & Spa", kind: "attraction", blurb: "A Moroccan hammam, massages and a relaxation lounge.", venues: [spa("Corniche Hammam & Spa")] };
}

// Hotels, built like Dubai's (lib/city/places lobby()): a lobby with this hotel's own rooms and suite and a transfer
// from AUH, an all-day restaurant, the beach for a beach resort, and the pool. The place's one venue (`single`) gives
// the hotel its palette, blurb and any signature extras (Emirates Palace's gold cappuccino).
const ROOMS: Record<string, [room: number, suite: string, suitePrice: number]> = {
  "ad-emirates-palace": [2600, "Palace suite", 14000], "ad-st-regis-saadiyat": [1900, "Royal suite", 9500],
  "ad-ritz-grand-canal": [1500, "Venetian suite", 6800], "ad-reem-rosewood": [1600, "Al Maryah suite", 7200],
  "ad-shangri-la": [1300, "Canal-view suite", 5200], "ad-fairmont-bab-al-bahr": [1100, "Mosque-view suite", 4600],
  "ad-qasr-al-sarab": [2200, "Pool villa", 11000], "ad-saadiyat-resort": [1400, "Beach suite", 5600],
  "ad-w-yas": [1200, "Circuit-view suite", 5400], "ad-corniche-grand-hotel": [900, "Gulf-view suite", 3800],
  "ad-yas-plaza-hotel": [650, "Executive suite", 2400], "ad-yas-island-rotana": [550, "Golf-view suite", 1900],
  "ad-raha-beach-hotel": [800, "Beach suite", 3200], "ad-desert-resort": [1000, "Tented suite", 4200],
};
for (const p of AD_PLACES) {
  if (p.kind !== "hotel" || p.venues.length !== 1) continue;
  const [main] = p.venues;
  const [room, suite, suitePrice] = ROOMS[p.id] ?? [900, "Suite", 3800];
  const lobbyId = `${main.id}-lobby-reception`;
  const extras = main.products.filter((x) => !x.id.startsWith(`${main.id}:`));
  const lobbyVenue = venue(`${p.name} Lobby & Reception`, "Reception · rooms & concierge", "hotel", {
    palette: main.palette, blurb: `Check in, book a room or ask the concierge at ${p.name}. ${main.blurb}`,
    // What the hotel itself is known for (W Yas's Grand Prix view) happens from here.
    activities: main.activities?.filter((a) => !a.ride),
    products: [
      { id: `${lobbyId}:room`, name: "Deluxe room, 1 night", price: room, icon: "🛏️", station: "reception", desc: "A king bed and a view of the water.", service: true },
      { id: `${lobbyId}:suite`, name: `${suite}, 1 night`, price: suitePrice, icon: "🌅", station: "reception", desc: "A separate living room and butler service.", service: true },
      { id: `${lobbyId}:transfer`, name: "Airport limousine", price: 350, icon: "🚘", station: "reception", desc: "A chauffeur to or from AUH.", service: true },
      ...extras,
    ],
  });
  const dining = venue(`${p.name} · All-day Dining`, "All-day dining", "restaurant", { palette: main.palette });
  // A beach resort's own beach rents daybeds (not rooms).
  const beach = main.layout === "beach" ? [{ ...main, name: `${p.name} Beach`, products: daybeds(main.id) }] : [];
  p.venues = [lobbyVenue, dining, ...beach, pool(`${p.name} Pool`)];
}

// Abu Dhabi's words for what the shared kit says about Dubai (the hotel job's fountain, the yacht's course past JBR,
// Wild Wadi's ride names at Yas Waterworld, "Dubai heat" on a T-shirt). Copies: the kit's objects are Dubai's too.
const LOCAL: [RegExp, string][] = [
  [/Race the Jumeirah Sceirah/g, "Race the twin free-fall slides"], [/Ride Tantrum Alley/g, "Ride the tornado slides"],
  [/Ride Burj Surj/g, "Ride the giant bowl"], [/Float Juha's Journey/g, "Float the lazy river"], [/Wild Wadi's lazy river/g, "The lazy river"],
  [/Breakers Bay/g, "the wave pool"], [/Wipeout FlowRider/g, "FlowRider"],
  [/best Fountain show view\?/g, "best sunset view?"], [/Waterfront terrace or a fountain-view room/g, "The beach terrace or a sea-view room"],
  [/a view of the fountain/g, "a view of the sea"], [/Fountain-view suite/g, "Sea-view suite"],
  [/Burj Khalifa view/g, "sea view"], [/Burj views/g, "Gulf views"],
  [/past JBR and Ain Dubai/g, "along the Abu Dhabi coast"], [/Dubai Harbour/g, "the marina"],
  [/Dubai heat/g, "UAE heat"], [/Build Dubai's skyline/g, "Build Abu Dhabi's skyline"], [/A Dubai souvenir/g, "An Abu Dhabi souvenir"],
  [/\bDXB\b/g, "AUH"],
];
const local = (t: string) => LOCAL.reduce((x, [rx, to]) => x.replace(rx, to), t);
for (const p of AD_PLACES) {
  p.blurb = local(p.blurb);
  p.venues = p.venues.map((v) => ({
    ...v, blurb: local(v.blurb),
    staff: { ...v.staff, greeting: local(v.staff.greeting) },
    products: v.products.map((x) => ({ ...x, name: local(x.name), desc: local(x.desc) })),
    activities: v.activities?.map((a) => ({ ...a, label: local(a.label), desc: a.desc && local(a.desc) })),
    job: v.job && {
      ...v.job,
      interview: v.job.interview.map((q) => ({ ...q, q: local(q.q), options: q.options.map(local) })),
      shift: v.job.shift.map((x) => ({ ...x, customer: local(x.customer), wants: local(x.wants) })),
    },
  }));
}

registerCityPlaces(AD_PLACES);
