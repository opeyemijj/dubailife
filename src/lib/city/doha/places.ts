// Doha's places (ids "dq-…"): what's inside each building on its map (./map.ts), from the same kit as Dubai's and
// Abu Dhabi's (lib/city/places placeKit: shops, menus, staff, jobs, yachts, pools, spas) but kept out of their lists
// (registerCityPlaces). Homes are rows in the flats table (supabase *_doha.sql). Every amenity: the airport, hotels
// and suites, malls and souqs, restaurants and cafés, clubs and lounges, beaches and beach clubs, marinas and yachts,
// museums and culture, mosques, parks, a waterpark, stadiums, the circuit, horse and camel racing, a gym, a spa,
// universities and the library, and the desert.

import { placeKit, registerCityPlaces } from "@/lib/city/places";
import type { Place, Venue, VenueActivity } from "@/lib/city/types";

const { venue, spa, pool, single, ticket, yacht, gymActivities, PALETTES } = placeKit;

const MAROON = "#8a1538";
const swim: VenueActivity[] = [{ id: "swim", label: "Swim in the Gulf", icon: "🏊", animation: "wave", need: { kind: "fun", amount: 25 } }];
/** A beach club's daybeds and drinks (a public beach sells nothing). */
const daybeds = (id: string) => [
  ticket(`${id}:daybed`, "Daybed for the day", 250, "A shaded daybed on the sand, towels included.", "🏖️"),
  ticket(`${id}:cabana`, "Private cabana", 900, "A cabana for up to six, with a host.", "⛱️"),
  { id: `${id}:karak`, name: "Iced karak", price: 25, icon: "🧋", station: "bar" as const, desc: "Doha's favourite: spiced milk tea, over ice.", consumable: { need: "energy" as const, amount: 10 } },
  { id: `${id}:lemon-mint`, name: "Lemon mint", price: 30, icon: "🍹", station: "bar" as const, desc: "Frozen lemon and mint.", consumable: { need: "social" as const, amount: 10 } },
];
const plus = (v: Venue, more: VenueActivity[]): Venue => ({ ...v, activities: [...(v.activities ?? []), ...more] });
const show = (id: string, label: string, icon: string, reward = 30, kind: "fun" | "social" | "energy" = "fun", animation: VenueActivity["animation"] = "talk", desc?: string): VenueActivity =>
  ({ id, label, icon, animation, reward, need: { kind, amount: 25 }, desc });

export const DQ_PLACES: Place[] = [
  // ---------------------------------------------------------------- the airport
  {
    id: "dq-hamad-airport", name: "Hamad International Airport (DOH)", kind: "attraction", route: "/fly",
    blurb: "Doha's airport: Dubai Life Airways flights to Dubai and Abu Dhabi. Taxis wait outside arrivals.",
    venues: [venue("Hamad International", "Airport Terminal", "hotel", { palette: PALETTES.luxury, role: "Check-in agent", noJob: true, products: [ticket("doh:lounge", "Airport lounge day pass", 600, "A quiet lounge with a buffet before you fly.", "🥂")] })],
  },

  // ---------------------------------------------------------------- The Pearl-Qatar
  single("dq-marsa-arabia", "The St. Regis Marsa Arabia Island", "hotel", venue("The St. Regis Marsa Arabia Island", "Island resort & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "On its own island off The Pearl, with a private beach and butler service.",
  })),
  {
    id: "dq-medina-centrale", name: "Medina Centrale", kind: "mall",
    blurb: "The Pearl's open-air town centre: boutiques, cafés and a square with fountains.",
    venues: [venue("Medina Fashion", "Fashion", "fashion"), venue("Medina Beauty", "Beauty", "beauty"), venue("Medina Café", "Café", "cafe"), venue("Pearl Supermarket", "Supermarket", "supermarket")],
  },
  {
    id: "dq-qanat-quartier", name: "Qanat Quartier", kind: "attraction",
    blurb: "Canals between pastel houses in Venetian colours, little bridges and waterside cafés.",
    venues: [
      venue("Qanat Quartier Canals", "Canals & bridges", "hotel", {
        layout: "outdoor", palette: { floor: "#f5e6d0", wall: "#f7c6b0", accent: "#0e7490" }, role: "Quartier guide", noJob: true, products: [],
        blurb: "Pastel houses in pink, yellow and blue along the canals.",
        activities: [show("qanat:walk", "Walk the canals and the bridges", "🌉", 25), show("qanat:photo", "Photograph the coloured houses", "📸", 20, "fun", "clap")],
      }),
      venue("Qanat Gelato", "Gelato & café", "cafe"),
    ],
  },
  {
    id: "dq-la-croisette", name: "La Croisette Promenade", kind: "food-hall",
    blurb: "Porto Arabia's boardwalk of restaurants facing the yachts.",
    venues: [venue("Croisette Grill", "Waterfront grill", "restaurant"), venue("Croisette Patisserie", "Patisserie", "cafe"), venue("Porto Sushi", "Japanese", "restaurant")],
  },
  {
    id: "dq-porto-arabia-marina", name: "Porto Arabia Marina", kind: "attraction",
    blurb: "Superyachts below Porto Arabia's arc of towers: charter one round The Pearl.",
    venues: [yacht("Pearl Sunseeker 80", 3800, 12, "A sleek flybridge yacht round The Pearl's coast."), yacht("Porto Arabia Royale", 9800, 30, "The marina's biggest, with a party deck and a jacuzzi.")],
  },
  {
    id: "dq-pearl-beach-club", name: "Pearl Beach Club", kind: "club",
    blurb: "Daybeds, an infinity pool and sunset DJ sets on The Pearl.",
    venues: [venue("Pearl Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("pearl-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), pool("Pearl Beach Club Pool")],
  },

  // ---------------------------------------------------------------- Lusail
  {
    id: "dq-lusail-stadium", name: "Lusail Stadium", kind: "attraction",
    blurb: "The golden bowl that hosted the 2022 World Cup final: stadium tours and match nights.",
    venues: [venue("Lusail Stadium", "Stadium", "hotel", {
      layout: "lobby", palette: { floor: "#3b2a12", wall: "#e9c46a", accent: MAROON }, role: "Stadium guide", noJob: true,
      products: [ticket("lusail:tour", "Stadium tour", 90, "The pitch, the dressing rooms and the trophy room.", "🏟️"), ticket("lusail:match", "Match night ticket", 300, "Tonight's game under the golden roof.", "⚽")],
      activities: [show("lusail:tour", "Tour the stadium", "🏟️", 35), show("lusail:match", "Watch the match", "⚽", 40, "fun", "clap"), { id: "lusail:penalty", label: "Take a penalty on the pitch", icon: "🥅", animation: "clap", reward: 25, need: { kind: "fun", amount: 25 } }],
    })],
  },
  single("dq-katara-towers", "Katara Towers (Raffles & Fairmont)", "hotel", venue("Katara Towers", "Crescent towers hotel & suites", "hotel", {
    palette: PALETTES.luxury, blurb: "Two crescent towers on Lusail's shore, shaped like Qatar's crossed swords: Raffles in one, Fairmont in the other.",
  })),
  {
    id: "dq-place-vendome", name: "Place Vendôme", kind: "mall",
    blurb: "A Parisian palace of a mall on Lusail's canal, with its dancing fountain.",
    venues: [
      venue("Vendôme Luxury Avenue", "Luxury fashion", "luxury"), venue("Vendôme Fashion", "Fashion", "fashion"), venue("Vendôme Jewellery", "Jewellery & watches", "jewellery"),
      venue("Vendôme Beauty", "Beauty", "beauty"), venue("Vendôme Tech", "Electronics", "electronics"), venue("Vendôme Food Court", "Food court", "restaurant"),
      venue("Vendôme Cinemas", "Cinema", "club", { role: "Cinema host", noJob: true, layout: "lobby", palette: PALETTES.night, feature: "stage", blurb: "The latest films.", products: [ticket("vendome-cinemas:ticket", "Movie ticket", 50, "Tonight's film."), ticket("vendome-cinemas:recliner", "Recliner ticket", 140, "A recliner with food service.", "🍿")] }),
    ],
  },
  {
    id: "dq-lusail-boulevard", name: "Lusail Boulevard", kind: "food-hall",
    blurb: "The tree-lined boulevard of restaurants and terraces under the towers.",
    venues: [venue("Boulevard Steakhouse", "Steakhouse", "restaurant"), venue("Boulevard Karak", "Karak & chapati", "cafe"), venue("Boulevard Lebanese", "Lebanese", "restaurant")],
  },
  {
    id: "dq-lusail-marina", name: "Lusail Marina", kind: "attraction",
    blurb: "Yachts on Lusail's marina promenade, below the Katara Towers.",
    venues: [yacht("Lusail Azimut 60", 2900, 10, "A cruise past the Katara Towers and Qetaifan Island.")],
  },
  {
    id: "dq-qetaifan-waterpark", name: "Qetaifan Island Waterpark", kind: "attraction",
    blurb: "Slides and a wave pool on Lusail's island, one of them twisting round a tower.",
    venues: [venue("Qetaifan Waterpark", "Waterpark", "hotel", {
      layout: "waterpark", palette: PALETTES.park, role: "Lifeguard", noJob: true, blurb: "The slides, the wave pool and the lazy river.",
      products: [ticket("qetaifan:day", "Day pass", 280, "Every slide, all day.", "🌊")],
    })],
  },
  {
    id: "dq-lusail-circuit", name: "Lusail International Circuit", kind: "attraction", route: "/autodrome",
    blurb: "The floodlit Grand Prix circuit: bring your car and race your friends, live.",
    venues: [venue("Lusail International Circuit", "Car racing", "electronics", { role: "Race marshal", noJob: true })],
  },
  {
    id: "dq-lusail-beach", name: "Lusail Beach", kind: "park",
    blurb: "A long public beach on Lusail's shore.",
    venues: [venue("Lusail Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },

  // ---------------------------------------------------------------- West Bay
  {
    id: "dq-doha-tower", name: "Doha Tower", kind: "attraction",
    blurb: "West Bay's lattice-wrapped cylinder: a viewing floor over the bay and a sky restaurant.",
    venues: [venue("Doha Tower Sky Deck", "Viewing deck & restaurant", "hotel", {
      layout: "lobby", feature: "skyline", palette: PALETTES.night, role: "Sky deck host", noJob: true,
      products: [ticket("dohatower:deck", "Sky deck entry", 80, "The whole bay from the top.", "🌆")],
      activities: [show("dohatower:view", "Look out over the bay", "🌆", 25)],
    })],
  },
  {
    id: "dq-tornado-tower", name: "Tornado Tower", kind: "club",
    blurb: "The hourglass tower that lights up in colours at night, with a lounge at the top.",
    venues: [venue("Tornado Sky Lounge", "Sky lounge", "club", { feature: "skyline", blurb: "Mocktails and DJs inside the lit hourglass." })],
  },
  single("dq-sheraton", "Sheraton Grand Doha", "hotel", venue("Sheraton Grand Doha", "Pyramid resort & suites", "hotel", {
    palette: PALETTES.lobby, blurb: "Doha's pyramid hotel at the end of the Corniche, with its own beach and gardens.",
  })),
  {
    id: "dq-city-center", name: "City Center Doha", kind: "mall",
    blurb: "West Bay's big mall: shops, a hypermarket, an ice rink and a bowling alley.",
    venues: [
      venue("City Center Fashion", "Fashion", "fashion"), venue("City Center Sports", "Sportswear", "sports"), venue("City Center Electronics", "Electronics", "electronics"),
      venue("City Center Hypermarket", "Supermarket", "supermarket"), venue("City Center Toys", "Toys", "toys"), venue("City Center Food Court", "Food court", "restaurant"),
      venue("Winter Wonderland Ice Rink", "Ice rink", "club", { layout: "rink", role: "Rink host", noJob: true, blurb: "Skate under the mall's atrium." }),
    ],
  },
  single("dq-w-doha", "W Doha", "hotel", venue("W Doha", "Design hotel & suites", "hotel", { palette: PALETTES.night, blurb: "West Bay's design hotel with a rooftop pool." })),
  {
    id: "dq-westbay-lounge", name: "Sky Lounge West Bay", kind: "club",
    blurb: "West Bay's late-night lounge: DJs, a dancefloor and the skyline.",
    venues: [venue("Sky Lounge West Bay", "Nightclub & lounge", "club", { feature: "skyline" })],
  },
  {
    id: "dq-westbay-beach", name: "West Bay Beach", kind: "park",
    blurb: "A sandy beach below the towers, facing the bay.",
    venues: [venue("West Bay Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },
  {
    id: "dq-westbay-dining", name: "West Bay Waterfront Dining", kind: "food-hall",
    blurb: "Terraces on the water under the skyline.",
    venues: [venue("Bay Seafood House", "Seafood", "restaurant"), venue("West Bay Café", "Café", "cafe")],
  },

  // ---------------------------------------------------------------- Katara
  {
    id: "dq-katara-amphitheatre", name: "Katara Amphitheatre", kind: "attraction",
    blurb: "A Greek-style amphitheatre facing the sea: concerts, opera and the Qatar Philharmonic.",
    venues: [venue("Katara Amphitheatre", "Open-air theatre", "club", {
      layout: "theatre", feature: "stage", palette: { floor: "#e8dcc4", wall: "#f5efe3", accent: MAROON }, role: "Usher", noJob: true,
      products: [ticket("katara:concert", "Concert ticket", 180, "Tonight's performance under the stars.", "🎻")],
      activities: [show("katara:concert", "Watch the concert", "🎻", 35, "fun", "clap")],
    })],
  },
  {
    id: "dq-katara-mosque", name: "Katara Mosque", kind: "attraction",
    blurb: "Katara's mosque, tiled all over in blue and gold mosaics. Modest dress, please.",
    venues: [venue("Katara Mosque", "Mosque", "hotel", {
      palette: { floor: "#f8fafc", wall: "#dbeafe", accent: "#1d4ed8" }, role: "Mosque guide", noJob: true, products: [],
      activities: [show("katara-mosque:visit", "Admire the blue mosaics", "🕌", 25, "social"), { id: "katara-mosque:reflect", label: "Sit and reflect", icon: "🤲", animation: "sit", reward: 15, need: { kind: "energy", amount: 15 } }],
    })],
  },
  {
    id: "dq-pigeon-towers", name: "Katara Pigeon Towers", kind: "attraction",
    blurb: "Tall mud-brick towers built for pigeons, full of birds, in Katara's lanes.",
    venues: [venue("Pigeon Towers", "Heritage", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Heritage guide", noJob: true, products: [],
      activities: [show("pigeon:feed", "Feed the pigeons", "🕊️", 15, "fun", "wave")],
    })],
  },
  {
    id: "dq-katara-plaza", name: "Katara Plaza", kind: "mall",
    blurb: "Katara's lanes of galleries, cafés and restaurants.",
    venues: [venue("Katara Art Gallery", "Art gallery", "luxury"), venue("Katara Karak", "Karak & sweets", "cafe"), venue("Katara Hills Restaurant", "Qatari & Levantine", "restaurant")],
  },
  {
    id: "dq-katara-beach", name: "Katara Beach", kind: "club",
    blurb: "Katara's beach: watersports, kayaks and daybeds.",
    venues: [plus(venue("Katara Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("katara-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), [])],
  },

  // ---------------------------------------------------------------- The Corniche & Doha Bay
  {
    id: "dq-mia", name: "Museum of Islamic Art", kind: "attraction",
    blurb: "I. M. Pei's stacked limestone cubes on their own island in the bay: 1,400 years of Islamic art.",
    venues: [venue("Museum of Islamic Art", "Museum", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#e7e2da", wall: "#f5f1ea", accent: "#0f3d5e" }, role: "Museum guide", noJob: true,
      products: [ticket("mia:entry", "Museum entry", 50, "The galleries and the atrium.", "🏺")],
      activities: [show("mia:tour", "Walk the galleries", "🏺", 30), show("mia:atrium", "Look up into the atrium's dome", "✨", 20)],
    })],
  },
  {
    id: "dq-nmoq", name: "National Museum of Qatar", kind: "attraction",
    blurb: "Jean Nouvel's 'desert rose': curving discs round the old palace, telling Qatar's story.",
    venues: [venue("National Museum of Qatar", "Museum", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#e8d5b5", wall: "#f3e7d3", accent: "#8a5a2b" }, role: "Museum guide", noJob: true,
      products: [ticket("nmoq:entry", "Museum entry", 50, "From the desert to the pearl divers to today.", "🌹")],
      activities: [show("nmoq:tour", "Walk through Qatar's story", "🌹", 30)],
    })],
  },
  {
    id: "dq-mia-park", name: "MIA Park & Bazaar", kind: "park",
    blurb: "The park round the museum: lawns on the bay, kite flying and the weekend bazaar.",
    venues: [venue("MIA Park", "Park & bazaar", "hotel", {
      layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true,
      products: [{ id: "miapark:bazaar-crafts", name: "Bazaar handicrafts", price: 60, icon: "🧺", station: "counter", desc: "From the weekend stalls." }],
      activities: [show("miapark:kite", "Fly a kite over the bay", "🪁", 20, "fun", "wave"), show("miapark:picnic", "Picnic on the lawn", "🧺", 15, "social", "sit")],
    })],
  },
  {
    id: "dq-corniche-dining", name: "Corniche Seafood Grills", kind: "food-hall",
    blurb: "Hammour, prawns and machboos along the Corniche.",
    venues: [venue("Corniche Fish Market Grill", "Seafood", "restaurant"), venue("Machboos House", "Qatari", "restaurant"), venue("Corniche Karak", "Karak & chapati", "cafe")],
  },
  {
    id: "dq-banana-island-pier", name: "Banana Island Ferry", kind: "attraction",
    blurb: "The pier for the boat to Banana Island, the resort island in the bay.",
    venues: [venue("Banana Island Ferry", "Ferry pier", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Ferry crew", noJob: true, products: [ticket("banana:ferry", "Ferry to Banana Island", 150, "Return boat across the bay.", "⛴️")] })],
  },
  {
    id: "dq-dhow-harbour", name: "Dhow Harbour", kind: "attraction",
    blurb: "Wooden dhows moored on the Corniche: sail the bay at sunset.",
    venues: [{ ...venue("Sunset Dhow Cruise", "Dhow cruise", "hotel", {
      layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true,
      products: [ticket("dhow:cruise", "Sunset dhow cruise", 120, "An hour round the bay as West Bay lights up.", "⛵")],
      activities: [show("dhow:sail", "Sail the bay on a dhow", "⛵", 30, "fun", "sit")],
    }) }],
  },
  {
    id: "dq-corniche-promenade", name: "Corniche Promenade", kind: "park",
    blurb: "Seven kilometres of palm-lined promenade round Doha Bay, for walking, running and cycling.",
    venues: [venue("Corniche Promenade", "Promenade", "hotel", {
      layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [],
      activities: [show("corniche:walk", "Walk the Corniche at sunset", "🌅", 20, "energy", "wave"), { id: "corniche:run", label: "Run the Corniche", icon: "🏃", animation: "clap", reward: 20, need: { kind: "fun", amount: 20 } }],
    })],
  },

  // ---------------------------------------------------------------- Souq Waqif & Msheireb
  {
    id: "dq-souq-waqif", name: "Souq Waqif", kind: "mall",
    blurb: "The old market: mud-plastered lanes and timber beams, spices, oud, textiles, pottery and the evening crowds.",
    venues: [
      venue("Spice Souq", "Spices & dates", "supermarket", { blurb: "Saffron, cardamom, dried limes and dates in open sacks." }),
      venue("Oud & Perfume Souq", "Arabian fragrance", "fragrance"),
      venue("Textile Souq", "Abayas, kanduras & fabrics", "fashion"),
      venue("Souq Pottery & Crafts", "Handicrafts", "home"),
      venue("Souq Karak Corner", "Karak & regag bread", "cafe"),
    ],
  },
  {
    id: "dq-state-mosque", name: "Imam Muhammad ibn Abd al-Wahhab Mosque", kind: "attraction",
    blurb: "Qatar's State Grand Mosque: 90 sand-coloured domes over a vast courtyard. Modest dress, please.",
    venues: [venue("State Grand Mosque", "Mosque", "hotel", {
      palette: { floor: "#f5efe3", wall: "#efe3c8", accent: "#a16207" }, role: "Mosque guide", noJob: true, products: [],
      activities: [show("statemosque:tour", "Take the guided tour", "🕌", 35, "social"), { id: "statemosque:reflect", label: "Sit and reflect", icon: "🤲", animation: "sit", reward: 15, need: { kind: "energy", amount: 15 } }],
    })],
  },
  {
    id: "dq-msheireb", name: "Msheireb Downtown", kind: "mall",
    blurb: "The rebuilt old quarter: shaded lanes, the Msheireb Museums in four heritage houses, galleries and cafés.",
    venues: [
      venue("Msheireb Museums", "Heritage museums", "hotel", { layout: "lobby", feature: "exhibits", palette: PALETTES.oud, role: "Museum guide", noJob: true, products: [ticket("msheireb:museums", "Museums entry", 0, "Four heritage houses, free.", "🏛️")], activities: [show("msheireb:houses", "Walk through the heritage houses", "🏛️", 25)] }),
      venue("Msheireb Galleria", "Concept store", "luxury"), venue("Msheireb Café", "Café", "cafe"), spa("Msheireb Hammam & Spa"),
    ],
  },
  {
    id: "dq-falcon-souq", name: "Falcon Souq & Falcon Hospital", kind: "attraction",
    blurb: "Hooded falcons on their perches, the falconers' shops and the hospital that cares for them.",
    venues: [venue("Falcon Souq", "Falcons & falconry", "hotel", {
      layout: "lobby", palette: PALETTES.oud, role: "Falconer", noJob: true,
      products: [ticket("falcon:hold", "Hold a falcon", 50, "On a falconer's glove, with a photo.", "🦅"), { id: "falcon:hood", name: "Hand-stitched falcon hood", price: 220, icon: "🎁", station: "counter", desc: "Leather, made in the souq." }],
      activities: [show("falcon:show", "Watch the falconers", "🦅", 30, "fun", "clap"), show("falcon:hospital", "Visit the falcon hospital", "🩺", 25)],
    })],
  },
  {
    id: "dq-gold-souq", name: "Gold Souq", kind: "mall",
    blurb: "Lanes of gold shops: 22-carat chains, bangles and bridal sets.",
    venues: [venue("Gold Souq", "Jewellery & gold", "jewellery"), venue("Pearl Merchants", "Natural Gulf pearls", "jewellery")],
  },
  single("dq-souq-hotel", "Souq Waqif Boutique Hotels", "hotel", venue("Souq Waqif Boutique Hotels", "Heritage hotel & suites", "hotel", {
    palette: PALETTES.oud, blurb: "Rooms in the old souq's restored houses, with courtyards and wooden doors.",
  })),
  {
    id: "dq-souq-dining", name: "Souq Waqif Restaurants", kind: "food-hall",
    blurb: "Qatari, Persian, Moroccan and Yemeni kitchens along the souq's main lane.",
    venues: [venue("Souq Machboos", "Qatari", "restaurant"), venue("Persian Kebab House", "Persian", "restaurant"), venue("Moroccan Riad", "Moroccan", "restaurant"), venue("Souq Luqaimat", "Sweets & karak", "cafe")],
  },
  single("dq-mandarin-msheireb", "Mandarin Oriental Doha", "hotel", venue("Mandarin Oriental Doha", "Hotel & suites", "hotel", { palette: PALETTES.luxury, blurb: "In the heart of Msheireb, with a rooftop pool over the old town." })),

  // ---------------------------------------------------------------- Aspire Zone
  single("dq-torch", "The Torch Doha", "hotel", venue("The Torch Doha", "Torch tower hotel & suites", "hotel", { palette: PALETTES.night, blurb: "The 300 m torch over Aspire Zone, with a revolving restaurant near the top." })),
  {
    id: "dq-khalifa-stadium", name: "Khalifa International Stadium", kind: "attraction",
    blurb: "Qatar's national stadium under its great arch: football nights and athletics.",
    venues: [venue("Khalifa International Stadium", "Stadium", "hotel", {
      layout: "lobby", palette: { floor: "#1f3b2a", wall: "#e5e7eb", accent: MAROON }, role: "Stadium guide", noJob: true,
      products: [ticket("khalifa:match", "Match ticket", 150, "A league night under the arch.", "⚽")],
      activities: [show("khalifa:match", "Watch the match", "⚽", 35, "fun", "clap")],
    })],
  },
  {
    id: "dq-villaggio", name: "Villaggio Mall", kind: "mall",
    blurb: "An Italian village of a mall, with a painted sky and a canal you ride in a gondola.",
    venues: [
      plus(venue("Villaggio Canal", "Canal & gondolas", "hotel", {
        layout: "lobby", palette: { floor: "#e7d7b8", wall: "#f3e1c5", accent: "#2563eb" }, role: "Gondolier", noJob: true,
        products: [ticket("villaggio:gondola", "Gondola ride", 30, "Along the canal under the painted sky.", "🛶")],
      }), [show("villaggio:gondola", "Ride a gondola on the canal", "🛶", 25, "fun", "sit")]),
      venue("Villaggio Fashion", "Fashion", "fashion"), venue("Villaggio Luxury", "Luxury fashion", "luxury"), venue("Villaggio Electronics", "Electronics", "electronics"),
      venue("Villaggio Food Court", "Food court", "restaurant"),
    ],
  },
  {
    id: "dq-aspire-park", name: "Aspire Park", kind: "park",
    blurb: "Doha's biggest park: a lake, running tracks and families at the weekend.",
    venues: [venue("Aspire Park", "Park", "hotel", {
      layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [],
      activities: [show("aspire:lake", "Walk round the lake", "🦆", 15, "energy", "wave"), { id: "aspire:run", label: "Run the park's track", icon: "🏃", animation: "clap", reward: 20, need: { kind: "fun", amount: 20 } }],
    })],
  },
  {
    id: "dq-sports-museum", name: "Qatar Olympic & Sports Museum", kind: "attraction",
    blurb: "The sports museum in the shape of five rings at Khalifa Stadium: interactive galleries for every sport.",
    venues: [venue("Qatar Olympic & Sports Museum", "Museum", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#e5e7eb", wall: "#f8fafc", accent: MAROON }, role: "Museum guide", noJob: true,
      products: [ticket("sportsmuseum:entry", "Museum entry", 50, "The galleries and the interactive zone.", "🏅")],
      activities: [show("sportsmuseum:tour", "Try the interactive sports galleries", "🏅", 30, "fun", "clap")],
    })],
  },
  {
    id: "dq-aspire-gym", name: "Aspire Active Gym", kind: "attraction",
    blurb: "The sports zone's gym, with a ring.",
    venues: [venue("Aspire Active Gym", "Gym", "sports", { role: "Personal trainer", activities: gymActivities("aspire-active", true) })],
  },

  // ---------------------------------------------------------------- Education City & Al Rayyan
  {
    id: "dq-qnl", name: "Qatar National Library", kind: "attraction",
    blurb: "Rem Koolhaas's library: one great hall of white terraced shelves, and the old manuscripts below.",
    venues: [venue("Qatar National Library", "Library", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#f1f5f9", wall: "#ffffff", accent: "#0f766e" }, role: "Librarian", noJob: true,
      products: [{ id: "qnl:card", name: "Library card", price: 0, icon: "🪪", station: "reception", desc: "Free for everyone.", service: true }],
      activities: [{ id: "qnl:read", label: "Read in the great hall", icon: "📖", animation: "sit", reward: 15, need: { kind: "energy", amount: 15 } }, show("qnl:heritage", "See the heritage manuscripts", "📜", 25), { id: "qnl:study", label: "Study a course", icon: "🎓", href: "/academics/onebrain" }],
    })],
  },
  {
    id: "dq-education-city", name: "Education City Campus", kind: "attraction",
    blurb: "Branch campuses of the world's universities round the Oxygen Park: business, engineering, medicine and more.",
    venues: [
      venue("Education City Lecture Hall", "University campus", "hotel", {
        layout: "lobby", palette: { floor: "#e7e5e4", wall: "#f8fafc", accent: MAROON }, role: "Lecturer", noJob: true,
        products: [{ id: "edu:hoodie", name: "Education City hoodie", price: 140, icon: "🧥", station: "counter", desc: "From the campus shop." }],
        activities: [
          { id: "edu:business", label: "Study business, real estate & law", icon: "🎓", href: "/academics/aud" },
          { id: "edu:tech", label: "Study cybersecurity, healthcare & logistics", icon: "🔬", href: "/academics/ud" },
          { id: "edu:new", label: "Take AI, coding & marketing", icon: "💡", href: "/academics/onebrain" },
          { id: "edu:library", label: "Study in the library", icon: "📖", animation: "sit", reward: 10, need: { kind: "energy", amount: 10 } },
        ],
      }),
      venue("Oxygen Park Café", "Campus café", "cafe"),
    ],
  },
  {
    id: "dq-al-rayyan-racecourse", name: "Al Rayyan Racecourse", kind: "attraction", route: "/racing/horse",
    blurb: "The Qatar Racing & Equestrian Club's racecourse: pick a horse and race your friends, live.",
    venues: [venue("Al Rayyan Racecourse", "Horse racing", "electronics", { role: "Race steward", noJob: true })],
  },
  {
    id: "dq-shahaniya-camel-track", name: "Al Shahaniya Camel Racetrack", kind: "attraction", route: "/racing/camel",
    blurb: "Qatar's camel racetrack in the desert: pick a racing camel, steer its robot jockey and race your friends.",
    venues: [venue("Al Shahaniya Camel Racetrack", "Camel racing", "electronics", { role: "Race steward", noJob: true })],
  },

  // ---------------------------------------------------------------- the desert
  {
    id: "dq-inland-sea-camp", name: "Inland Sea Desert Camp", kind: "attraction",
    blurb: "Khor Al Adaid, where the dunes run down into the sea: dune bashing, camels, sandboarding and a Bedouin night.",
    venues: [venue("Inland Sea Desert Camp", "Desert camp", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Safari guide", noJob: true,
      products: [ticket("inlandsea:safari", "Inland Sea safari with dinner", 350, "4x4 over the dunes to the sea, a swim, a camel ride and dinner.", "🐪")],
      activities: [show("inlandsea:dunes", "Dune-bash down to the Inland Sea", "🚙", 45, "fun", "clap"), show("inlandsea:swim", "Swim where the desert meets the sea", "🌊", 30, "fun", "wave"), show("inlandsea:camel", "Ride a camel", "🐪", 25, "fun", "wave")],
    })],
  },
  single("dq-desert-resort", "Sealine Desert Resort", "hotel", venue("Sealine Desert Resort", "Desert beach resort & suites", "hotel", { palette: PALETTES.oud, blurb: "On the sand at Sealine, between the dunes and the sea." })),
  {
    id: "dq-zubarah", name: "Al Zubarah Fort", kind: "attraction",
    blurb: "The UNESCO pearling town's fort in the north: square towers, thick walls and the old town's ruins.",
    venues: [venue("Al Zubarah Fort", "Fort & UNESCO site", "hotel", {
      layout: "lobby", palette: PALETTES.oud, role: "Heritage guide", noJob: true,
      products: [ticket("zubarah:entry", "Fort entry", 0, "The fort and its museum, free.", "🏰")],
      activities: [show("zubarah:tour", "Tour the fort and the pearling town", "🏰", 30)],
    })],
  },
  {
    id: "dq-sealine-beach", name: "Sealine Beach", kind: "park",
    blurb: "Where the dunes reach the sea in the south.",
    venues: [venue("Sealine Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },
  {
    id: "dq-dunes", name: "Singing Sand Dunes", kind: "attraction",
    blurb: "The dunes that hum when you slide down them.",
    venues: [venue("Singing Sand Dunes", "Dunes", "hotel", {
      layout: "outdoor", palette: PALETTES.oud, role: "Desert guide", noJob: true, products: [ticket("dunes:board", "Sandboard hire", 60, "Slide down and hear them sing.", "🏂")],
      activities: [show("dunes:slide", "Slide down and hear the dunes sing", "🏜️", 35, "fun", "clap")],
    })],
  },
  {
    id: "dq-banana-island", name: "Banana Island Resort", kind: "hotel",
    blurb: "The resort island shaped like a banana in Doha Bay: villas over the water, a beach and a spa.",
    venues: [venue("Banana Island Resort", "Island resort & villas", "hotel", { palette: PALETTES.lobby, blurb: "Overwater villas and a lagoon beach in the bay." })],
  },
];

// Hotels, built like Dubai's and Abu Dhabi's: a lobby with this hotel's own rooms and suite and a transfer from DOH,
// an all-day restaurant, the beach for a beach resort, and the pool.
const ROOMS: Record<string, [room: number, suite: string, suitePrice: number]> = {
  "dq-marsa-arabia": [2100, "Royal suite", 10500], "dq-katara-towers": [2400, "Crescent suite", 12500], "dq-sheraton": [900, "Bay suite", 3600],
  "dq-w-doha": [1100, "Marvelous suite", 4800], "dq-souq-hotel": [700, "Courtyard suite", 2600], "dq-mandarin-msheireb": [1500, "Msheireb suite", 6400],
  "dq-torch": [800, "Torch suite", 3400], "dq-desert-resort": [1200, "Dune villa", 5200], "dq-banana-island": [1800, "Overwater villa", 8800],
};
for (const p of DQ_PLACES) {
  if (p.kind !== "hotel" || p.venues.length !== 1) continue;
  const [main] = p.venues;
  const [room, suite, suitePrice] = ROOMS[p.id] ?? [900, "Suite", 3800];
  const lobbyId = `${main.id}-lobby-reception`;
  const lobbyVenue = venue(`${p.name} Lobby & Reception`, "Reception · rooms & concierge", "hotel", {
    palette: main.palette, blurb: `Check in, book a room or ask the concierge at ${p.name}. ${main.blurb}`,
    products: [
      { id: `${lobbyId}:room`, name: "Deluxe room, 1 night", price: room, icon: "🛏️", station: "reception", desc: "A king bed and a view of the water.", service: true },
      { id: `${lobbyId}:suite`, name: `${suite}, 1 night`, price: suitePrice, icon: "🌅", station: "reception", desc: "A separate living room and butler service.", service: true },
      { id: `${lobbyId}:transfer`, name: "Airport limousine", price: 300, icon: "🚘", station: "reception", desc: "A chauffeur to or from DOH.", service: true },
    ],
  });
  const dining = venue(`${p.name} · All-day Dining`, "All-day dining", "restaurant", { palette: main.palette });
  p.venues = [lobbyVenue, dining, pool(`${p.name} Pool`)];
}

// Doha's words for what the shared kit says about Dubai (as Abu Dhabi's: the hotel job's fountain, the yacht's course
// past JBR, Wild Wadi's ride names, "Dubai heat"). Copies: the kit's objects are Dubai's too.
const LOCAL: [RegExp, string][] = [
  [/Race the Jumeirah Sceirah/g, "Race the twin free-fall slides"], [/Ride Tantrum Alley/g, "Ride the tornado slides"],
  [/Ride Burj Surj/g, "Ride the giant bowl"], [/Float Juha's Journey/g, "Float the lazy river"], [/Wild Wadi's lazy river/g, "The lazy river"],
  [/Breakers Bay/g, "the wave pool"], [/Wipeout FlowRider/g, "FlowRider"],
  [/best Fountain show view\?/g, "best view of the bay?"], [/Waterfront terrace or a fountain-view room/g, "The terrace or a bay-view room"],
  [/a view of the fountain/g, "a view of the bay"], [/Fountain-view suite/g, "Bay-view suite"],
  [/Burj Khalifa view/g, "bay view"], [/Burj views/g, "bay views"],
  [/past JBR and Ain Dubai/g, "along the Doha coast"], [/Dubai Harbour/g, "the marina"],
  [/Dubai heat/g, "Gulf heat"], [/Build Dubai's skyline/g, "Build Doha's skyline"], [/A Dubai souvenir/g, "A Doha souvenir"],
  [/\bDXB\b/g, "DOH"],
];
const local = (t: string) => LOCAL.reduce((x, [rx, to]) => x.replace(rx, to), t);
for (const p of DQ_PLACES) {
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

registerCityPlaces(DQ_PLACES);
