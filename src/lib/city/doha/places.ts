// Doha's places (ids "dq-…"): what's inside each building on its map (./map.ts), from the same kit as Dubai's and
// Abu Dhabi's (lib/city/places placeKit: shops, menus, staff, jobs, yachts, pools, spas) but kept out of their lists
// (registerCityPlaces). Homes are rows in the flats table (supabase *_doha.sql). Every amenity: the airport, hotels
// and suites, malls and souqs, restaurants and cafés, clubs and lounges, beaches and beach clubs, marinas and yachts,
// museums and culture, mosques, parks, a waterpark, stadiums, the circuit, horse and camel racing, a gym, a spa,
// universities and the library, and the desert.

import { placeKit, registerCityPlaces } from "@/lib/city/places";
import { quickCourseActivities } from "@/lib/academy/quickData";
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
/** A neighbourhood centre: the everyday shops a family needs near home (a supermarket, a pharmacy, a salon, a café). */
function neighbourhood(id: string, name: string, blurb: string): Place {
  const short = name.replace(/ Neighbourhood Centre$/, "");
  return { id, name, kind: "mall", blurb, venues: [venue(`${short} Supermarket`, "Supermarket", "supermarket"), venue(`${short} Pharmacy`, "Pharmacy", "pharmacy"), venue(`${short} Salon & Barber`, "Salon & barber", "beauty"), venue(`${short} Café`, "Café", "cafe")] };
}
/** A clinic or hospital: a check-up with a doctor and the pharmacy. */
function clinic(id: string, name: string, blurb: string): Place {
  return {
    id, name, kind: "attraction", blurb,
    venues: [
      venue(`${name} Clinics`, "Clinic", "hotel", { layout: "lobby", palette: { floor: "#f1f5f9", wall: "#ffffff", accent: "#0f766e" }, role: "Nurse", noJob: true,
        products: [ticket(`${id}:checkup`, "General check-up", 200, "A doctor's check-up and advice.", "🩺"), ticket(`${id}:dental`, "Dental check-up", 250, "A clean and a check.", "🦷")],
        activities: [{ id: `${id}:checkup`, label: "See a doctor for a check-up", icon: "🩺", animation: "sit", reward: 0, need: { kind: "energy", amount: 25 } }] }),
      venue(`${name} Pharmacy`, "Pharmacy", "pharmacy"),
    ],
  };
}
/** A park: lawns, paths, a playground; walk, run or picnic. */
function park(id: string, name: string, blurb: string, extra: VenueActivity[] = []): Place {
  return { id, name, kind: "park", blurb, venues: [venue(name, "Park", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [],
    activities: [{ id: `${id}:walk`, label: "Walk in the park", icon: "🌳", animation: "wave", reward: 10, need: { kind: "energy", amount: 15 } }, { id: `${id}:run`, label: "Go for a run", icon: "🏃", animation: "clap", reward: 15, need: { kind: "fun", amount: 15 } }, { id: `${id}:picnic`, label: "Picnic with friends", icon: "🧺", animation: "sit", reward: 10, need: { kind: "social", amount: 20 } }, ...extra] })] };
}
/** A party yacht: the yacht for the evening, its party package (DJ, lights, catering) and the deck to dance on. */
function partyYacht(name: string, perHour: number, guests: number, blurb: string): Venue {
  const v = yacht(name, perHour, guests, blurb);
  const id = v.id;
  return {
    ...v,
    products: [
      ticket(`${id}:party`, `Host a yacht party: 3 hours, up to ${guests} guests`, perHour * 3, "The yacht, the crew, the sound system and the deck for your party.", "🎉"),
      ticket(`${id}:dj`, "DJ & party lights", 1500, "A DJ on deck and lights round the yacht.", "🎧"),
      ticket(`${id}:catering`, "Party platters & mocktails", 900, "Food and drinks for your guests.", "🍢"),
      ...v.products,
    ],
    activities: [...(v.activities ?? []), { id: `${id}:party`, label: "Party on deck", icon: "🎉", animation: "dance", reward: 30, need: { kind: "social", amount: 35 } }],
  };
}

/** A watersports centre: jet skis (ridden in 3D on the beach), flyboards, banana boats and parasailing, and a beach. */
function watersports(id: string, name: string, blurb: string): Place {
  return {
    id, name, kind: "club", blurb,
    venues: [venue(name, "Watersports beach", "hotel", {
      layout: "beach", palette: PALETTES.park, role: "Watersports instructor", noJob: true, blurb,
      products: [
        ticket(`${id}:jetski`, "Jet ski, 30 minutes", 250, "A jet ski with a safety briefing.", "🚤"),
        ticket(`${id}:flyboard`, "Flyboard, 20 minutes", 350, "Fly over the water on the jet of a jet ski.", "🌊"),
        ticket(`${id}:banana`, "Banana boat ride", 80, "Hang on, for up to six.", "🍌"),
        ticket(`${id}:parasail`, "Parasailing", 300, "High over the water behind a speedboat.", "🪂"),
      ],
      activities: [...swim, show(`${id}:parasail`, "Parasail over the water", "🪂", 35, "fun", "wave"), show(`${id}:flyboard`, "Fly a flyboard", "🌊", 35, "fun", "clap")],
    })],
  };
}
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
      activities: [...quickCourseActivities("dq-qnl"), { id: "qnl:read", label: "Read in the great hall", icon: "📖", animation: "sit", reward: 15, need: { kind: "energy", amount: 15 } }, show("qnl:heritage", "See the heritage manuscripts", "📜", 25), { id: "qnl:study", label: "Study a course", icon: "🎓", href: "/academics/onebrain" }],
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
          // Quick courses taught on this campus (lib/academy/quick).
          ...quickCourseActivities("dq-education-city"),
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
  // ---------------------------------------------------------------- the wider city: everyday life and parties
  neighbourhood("dq-mansoura-centre", "Mansoura Neighbourhood Centre", "Al Mansoura's shops for every day."),
  neighbourhood("dq-duhail-centre", "Al Duhail Neighbourhood Centre", "Al Duhail's local shops."),
  { id: "dq-wukair-mall", name: "Al Wukair Mall", kind: "mall", blurb: "The southern town's mall.", venues: [venue("Wukair Fashion", "Fashion", "fashion"), venue("Wukair Hypermarket", "Supermarket", "supermarket"), venue("Wukair Pharmacy", "Pharmacy", "pharmacy"), venue("Wukair Food Court", "Food court", "restaurant")] },
  clinic("dq-mansoura-clinic", "Al Mansoura Health Centre", "The health centre for the apartment quarter."),
  clinic("dq-wukair-clinic", "Al Wukair Health Centre", "The health centre for Al Wukair's families."),
  park("dq-mansoura-park", "Fereej Bin Mahmoud Park", "A green square among the apartment blocks."),
  park("dq-markhiya-park", "Al Markhiya Park", "A family park with a running track."),
  { id: "dq-mansoura-dining", name: "Mansoura Night Market", kind: "food-hall", blurb: "Street food stalls open late: shawarma, karak and sweets.", venues: [venue("Night Market Shawarma", "Shawarma", "restaurant"), venue("Night Market Karak", "Karak & sweets", "cafe")] },
  { id: "dq-lusail-marina-centre", name: "Lusail Marina Promenade", kind: "mall", blurb: "Shops and cafés along Lusail's marina.", venues: [venue("Marina Promenade Fashion", "Fashion", "fashion"), venue("Marina Promenade Supermarket", "Supermarket", "supermarket"), venue("Marina Promenade Café", "Café", "cafe")] },
  { id: "dq-lusail-yacht-club", name: "Lusail Yacht Club", kind: "attraction", blurb: "Yachts for parties on Lusail's waters.", venues: [partyYacht("Lusail Marina Party Yacht", 3600, 30, "A party past the Katara Towers."), yacht("Lusail Riva 56", 2600, 10, "A fast cruiser.")] },
  { id: "dq-lusail-marina-dining", name: "Marina Promenade Dining", kind: "food-hall", blurb: "Restaurants on the marina's boardwalk.", venues: [venue("Marina Seafood House", "Seafood", "restaurant"), venue("Marina Lebanese", "Lebanese", "restaurant")] },
  watersports("dq-lusail-jetski", "Lusail Marina Jet Ski", "Jet skis out of Lusail Marina, past Qetaifan Island."),
  { id: "dq-pearl-party-marina", name: "Pearl Superyacht Party Marina", kind: "club", blurb: "A floating marina on the Gulf off The Pearl: superyachts for parties under the stars.", venues: [partyYacht("Pearl Superyacht Celeste", 11000, 50, "Three decks, a pool on top and The Pearl's lights."), partyYacht("Pearl Party Catamaran", 2800, 20, "Dancing on a wide deck.")] },
  { id: "dq-lusail-party-marina", name: "Lusail Floating Party Marina", kind: "club", blurb: "Floating off Lusail: party yachts with the Katara Towers glowing behind.", venues: [partyYacht("Lusail Party Superyacht", 9800, 40, "DJs, lights and the Lusail skyline."), partyYacht("Lusail Sunset Party Yacht", 3400, 25, "A sunset party on the water.")] },

  // ---------------------------------------------------------------- watersports: jet skis, flyboards, parasailing
  ...[
    ["dq-lagoon-jetski", "Lagoon Jet Ski & Watersports", "Jet skis round the lagoon's canals and out past the towers."],
    ["dq-dafna-jetski", "Dafna Jet Ski & Flyboard", "Jet skis and flyboards off Al Dafna, with West Bay's skyline behind you."],
    ["dq-gewan-jetski", "Gewan Jet Ski, Flyboard & Parasail", "Race round Gewan Island, fly on a flyboard or parasail over the lagoon."],
    ["dq-wakrah-jetski", "Al Wakrah Jet Ski Beach", "Jet skis and banana boats off Al Wakrah's family beach."],
    ["dq-simaisma-jetski", "Simaisma Kitesurf & Jet Ski", "Kitesurfing in Simaisma's steady wind, and jet skis on the flat water."],
  ].map(([id, name, blurb]): Place => watersports(id, name, blurb)),

  // ---------------------------------------------------------------- West Bay Lagoon
  {
    id: "dq-lagoona-mall", name: "Lagoona Mall", kind: "mall",
    blurb: "The lagoon's mall at the foot of the Zigzag Towers: shops, a hypermarket and cafés.",
    venues: [venue("Lagoona Fashion", "Fashion", "fashion"), venue("Lagoona Hypermarket", "Supermarket", "supermarket"), venue("Lagoona Café", "Café", "cafe"), venue("Lagoona Electronics", "Electronics", "electronics")],
  },
  {
    id: "dq-lagoon-marina", name: "West Bay Lagoon Marina", kind: "attraction",
    blurb: "Motor yachts at the lagoon villas' own marina.",
    venues: [yacht("Lagoon Riva 56", 2600, 10, "A fast day-cruiser out of the lagoon to the open Gulf."), yacht("Legtaifiya Explorer", 5200, 18, "A big flybridge yacht with a slide off the deck.")],
  },
  {
    id: "dq-lagoon-beach", name: "Legtaifiya Beach", kind: "park",
    blurb: "A calm lagoon beach for families.",
    venues: [venue("Legtaifiya Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },

  // ---------------------------------------------------------------- Al Dafna
  single("dq-four-seasons", "Four Seasons Doha", "hotel", venue("Four Seasons Doha", "Beach hotel & suites", "hotel", { palette: PALETTES.luxury, blurb: "A marina, a private beach and a spa at the tip of West Bay." })),
  single("dq-intercontinental", "InterContinental Doha Beach", "hotel", venue("InterContinental Doha Beach", "Beach resort & suites", "hotel", { palette: PALETTES.lobby, blurb: "Doha's longest private beach, with pools and watersports." })),
  {
    id: "dq-dafna-beach-club", name: "Dafna Beach Club", kind: "club",
    blurb: "Daybeds, a pool and DJs on the beach at Al Dafna.",
    venues: [venue("Dafna Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("dafna-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), pool("Dafna Beach Club Pool")],
  },
  {
    id: "dq-al-bidda-park", name: "Al Bidda Park", kind: "park",
    blurb: "Doha's big central park on the Corniche: lawns, a lake and the fan zone of the World Cup.",
    venues: [venue("Al Bidda Park", "Park", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [], activities: [show("bidda:walk", "Walk the park's lake", "🌳", 15, "energy", "wave"), show("bidda:picnic", "Picnic on the lawns", "🧺", 15, "social", "sit")] })],
  },
  {
    id: "dq-dafna-marina", name: "Dafna Marina", kind: "attraction",
    blurb: "The Four Seasons' marina: yachts for the bay and the open Gulf.",
    venues: [yacht("Dafna Princess 70", 3600, 12, "Round the bay past the Museum of Islamic Art."), yacht("Diplomatic Superyacht", 9200, 28, "The marina's largest, for a party on the water.")],
  },

  // ---------------------------------------------------------------- Al Sadd
  {
    id: "dq-royal-plaza", name: "Royal Plaza", kind: "mall",
    blurb: "Al Sadd's luxury mall.",
    venues: [venue("Royal Plaza Luxury", "Luxury fashion", "luxury"), venue("Royal Plaza Jewellery", "Jewellery & watches", "jewellery"), venue("Royal Plaza Café", "Café", "cafe")],
  },
  {
    id: "dq-hamad-hospital", name: "Hamad General Hospital", kind: "attraction",
    blurb: "Doha's main hospital: the emergency department, clinics and a pharmacy.",
    venues: [venue("Hamad Pharmacy", "Pharmacy", "pharmacy"), venue("Hamad Clinics", "Clinic", "hotel", { layout: "lobby", palette: { floor: "#f1f5f9", wall: "#ffffff", accent: "#0f766e" }, role: "Nurse", noJob: true, products: [ticket("hamad:checkup", "General check-up", 200, "A doctor's check-up and advice.", "🩺")], activities: [{ id: "hamad:checkup", label: "Get a check-up", icon: "🩺", animation: "sit", reward: 0, need: { kind: "energy", amount: 25 } }] })],
  },
  {
    id: "dq-doha-quest", name: "Doha Quest (Doha Oasis)", kind: "attraction",
    blurb: "A huge indoor theme park in Doha Oasis, with a record-breaking roller coaster and a drop tower.",
    venues: [venue("Doha Quest", "Indoor theme park", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#1e1b4b", wall: "#312e81", accent: "#f472b6" }, role: "Ride host", noJob: true,
      products: [ticket("quest:day", "Day pass", 225, "Every ride, all day.", "🎢")],
      activities: [show("quest:coaster", "Ride the giant indoor roller coaster", "🎢", 50, "fun", "clap"), show("quest:drop", "Brave the drop tower", "🗼", 40, "fun", "clap")],
    })],
  },
  {
    id: "dq-jassim-stadium", name: "Jassim bin Hamad Stadium", kind: "attraction",
    blurb: "Al Sadd club's home ground: league football nights.",
    venues: [venue("Jassim bin Hamad Stadium", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#1f3b2a", wall: "#e5e7eb", accent: MAROON }, role: "Stadium steward", noJob: true, products: [ticket("jassim:match", "Match ticket", 80, "Tonight's league game.", "⚽")], activities: [show("jassim:match", "Watch the match", "⚽", 30, "fun", "clap")] })],
  },
  {
    id: "dq-sadd-dining", name: "Al Sadd Street Restaurants", kind: "food-hall",
    blurb: "Shawarma, biryani and grills on Al Sadd Street, open late.",
    venues: [venue("Sadd Shawarma", "Shawarma", "restaurant"), venue("Biryani House", "Indian", "restaurant"), venue("Sadd Karak", "Karak & chapati", "cafe")],
  },
  single("dq-millennium-sadd", "Millennium Hotel Doha", "hotel", venue("Millennium Hotel Doha", "City hotel & suites", "hotel", { palette: PALETTES.lobby, blurb: "In Al Sadd, a short walk from Royal Plaza." })),

  // ---------------------------------------------------------------- Al Gharrafa & Mall of Qatar
  {
    id: "dq-mall-of-qatar", name: "Mall of Qatar", kind: "mall",
    blurb: "Qatar's biggest mall: hundreds of shops, the Oasis atrium with its stage and a cinema.",
    venues: [
      venue("Mall of Qatar Fashion", "Fashion", "fashion"), venue("Mall of Qatar Luxury", "Luxury fashion", "luxury"), venue("Mall of Qatar Sports", "Sportswear", "sports"),
      venue("Mall of Qatar Electronics", "Electronics", "electronics"), venue("Mall of Qatar Hypermarket", "Supermarket", "supermarket"), venue("Mall of Qatar Toys", "Toys", "toys"),
      venue("Mall of Qatar Food Court", "Food court", "restaurant"),
      venue("Mall of Qatar Cinemas", "Cinema", "club", { role: "Cinema host", noJob: true, layout: "lobby", palette: PALETTES.night, feature: "stage", products: [ticket("moq-cinemas:ticket", "Movie ticket", 50, "Tonight's film."), ticket("moq-cinemas:vip", "VIP recliner", 140, "A recliner with service.", "🍿")] }),
    ],
  },
  {
    id: "dq-ahmad-stadium", name: "Ahmad bin Ali Stadium", kind: "attraction",
    blurb: "Al Rayyan's stadium, its façade patterned like the sand dunes and the desert's plants.",
    venues: [venue("Ahmad bin Ali Stadium", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#3b2a12", wall: "#e9d5b5", accent: MAROON }, role: "Stadium steward", noJob: true, products: [ticket("ahmad:match", "Match ticket", 90, "A league night.", "⚽")], activities: [show("ahmad:match", "Watch the match", "⚽", 30, "fun", "clap")] })],
  },
  {
    id: "dq-gharrafa-park", name: "Al Gharrafa Park", kind: "park",
    blurb: "A neighbourhood park with a running track and playgrounds.",
    venues: [venue("Al Gharrafa Park", "Park", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [], activities: [{ id: "gharrafa:run", label: "Run the track", icon: "🏃", animation: "clap", reward: 15, need: { kind: "fun", amount: 15 } }] })],
  },
  {
    id: "dq-gharrafa-dining", name: "Gharrafa Family Restaurants", kind: "food-hall",
    blurb: "Family restaurants for the compounds round Al Gharrafa.",
    venues: [venue("Gharrafa Grill", "Grills", "restaurant"), venue("Gharrafa Bakery", "Bakery & café", "cafe")],
  },

  // ---------------------------------------------------------------- Al Khor & Purple Island
  {
    id: "dq-al-bayt", name: "Al Bayt Stadium", kind: "attraction",
    blurb: "The stadium made like a vast Bedouin tent, bayt al sha'ar, striped in black and white; it opened the 2022 World Cup.",
    venues: [venue("Al Bayt Stadium", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#1f2937", wall: "#f5f5f4", accent: MAROON }, role: "Stadium guide", noJob: true, products: [ticket("albayt:tour", "Stadium tour", 80, "Inside the great tent.", "⛺"), ticket("albayt:match", "Match ticket", 150, "A night under the tent.", "⚽")], activities: [show("albayt:tour", "Tour the great tent", "⛺", 30), show("albayt:match", "Watch the match", "⚽", 35, "fun", "clap")] })],
  },
  {
    id: "dq-alkhor-park", name: "Al Khor Corniche Park", kind: "park",
    blurb: "Al Khor's seafront park, with a small zoo and the old watchtowers.",
    venues: [venue("Al Khor Corniche Park", "Park", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [], activities: [show("alkhor:towers", "Climb to the old watchtowers", "🗼", 20, "fun", "wave")] })],
  },
  single("dq-alkhor-resort", "Al Khor Resort", "hotel", venue("Al Khor Resort", "Seaside resort & suites", "hotel", { palette: PALETTES.lobby, blurb: "A quiet resort on the bay in the north." })),
  {
    id: "dq-purple-island", name: "Purple Island Mangroves", kind: "park",
    blurb: "Kayak through the mangroves of Jazirat Bin Ghanim, where flamingos and herons feed.",
    venues: [venue("Purple Island Kayaks", "Mangrove kayaking", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Kayak guide", noJob: true, products: [ticket("purple:kayak", "Kayak tour", 120, "Ninety minutes through the mangroves.", "🛶")], activities: [show("purple:kayak", "Kayak through the mangroves", "🛶", 35, "fun", "wave"), show("purple:birds", "Watch the flamingos", "🦩", 20, "fun", "wave")] })],
  },
  {
    id: "dq-alkhor-harbour", name: "Al Khor Fishing Harbour", kind: "attraction",
    blurb: "Fishing dhows unloading the catch, and boat trips out to sea.",
    venues: [{ ...venue("Al Khor Dhow Trip", "Dhow & fishing trip", "hotel", { layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true, products: [ticket("alkhor:fishing", "Fishing trip", 200, "Two hours out with lines and bait.", "🎣")], activities: [show("alkhor:fish", "Go fishing from the dhow", "🎣", 35, "fun", "sit")] }) }],
  },
  {
    id: "dq-alkhor-beach", name: "Al Khor Beach", kind: "park",
    blurb: "A long beach on Al Khor's bay.",
    venues: [venue("Al Khor Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },

  // ---------------------------------------------------------------- Gewan Island & Qetaifan North
  single("dq-rixos-qetaifan", "Rixos Gulf Qetaifan", "hotel", venue("Rixos Gulf Qetaifan", "Island resort & suites", "hotel", { palette: PALETTES.luxury, blurb: "On Qetaifan Island North, next to the waterpark." })),
  {
    id: "dq-gewan-boulevard", name: "Gewan Island Boulevard", kind: "food-hall",
    blurb: "Restaurants and cafés along Gewan's island boulevard.",
    venues: [venue("Gewan Seafood", "Seafood", "restaurant"), venue("Gewan Café", "Café", "cafe"), venue("Gewan Burger Co.", "Burgers", "restaurant")],
  },
  {
    id: "dq-gewan-beach-club", name: "Gewan Beach Club", kind: "club",
    blurb: "Gewan Island's beach club: daybeds, a pool and the lagoon.",
    venues: [venue("Gewan Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("gewan-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), pool("Gewan Beach Club Pool")],
  },
  {
    id: "dq-gewan-marina", name: "Gewan Marina", kind: "attraction",
    blurb: "The island's marina, a short sail from The Pearl.",
    venues: [yacht("Gewan Sunseeker 65", 3200, 12, "Round Gewan and The Pearl."), yacht("Crystal Lagoon Royale", 8600, 26, "A party yacht with a jacuzzi on the bow.")],
  },
  {
    id: "dq-winter-wonderland", name: "Winter Wonderland (Al Maha Island)", kind: "attraction",
    blurb: "The winter fun fair on Al Maha Island: rides, a big wheel, games and food stalls.",
    venues: [venue("Winter Wonderland", "Fun fair", "hotel", {
      layout: "outdoor", palette: { floor: "#1e1b4b", wall: "#312e81", accent: "#22d3ee" }, role: "Ride host", noJob: true,
      products: [ticket("wonderland:entry", "Entry & ride credits", 150, "Into the park with credits for the rides.", "🎡")],
      activities: [show("wonderland:wheel", "Ride the big wheel", "🎡", 30, "fun", "sit"), show("wonderland:coaster", "Ride the roller coaster", "🎢", 40, "fun", "clap"), show("wonderland:games", "Win a prize at the stalls", "🧸", 20, "fun", "clap")],
    })],
  },

  // ---------------------------------------------------------------- Old Airport & Al Hilal
  {
    id: "dq-hilal-hypermarket", name: "Al Hilal Hypermarket", kind: "mall",
    blurb: "The big neighbourhood hypermarket and its shops.",
    venues: [venue("Al Hilal Hypermarket", "Supermarket", "supermarket"), venue("Al Hilal Pharmacy", "Pharmacy", "pharmacy"), venue("Al Hilal Mobile Shop", "Electronics", "electronics")],
  },
  {
    id: "dq-974-stadium", name: "Stadium 974", kind: "attraction",
    blurb: "The stadium built from 974 shipping containers on the waterfront, made to be taken apart.",
    venues: [venue("Stadium 974", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#1f2937", wall: "#e5e7eb", accent: "#ea580c" }, role: "Stadium guide", noJob: true, products: [ticket("974:tour", "Stadium tour", 60, "Through the containers.", "📦")], activities: [show("974:tour", "Walk through the containers", "📦", 25)] })],
  },
  {
    id: "dq-hilal-dining", name: "Old Airport Karak Street", kind: "food-hall",
    blurb: "Late-night karak, paratha and chapati stands that never close.",
    venues: [venue("Karak Street", "Karak & paratha", "cafe"), venue("Old Airport Grill", "Grills", "restaurant")],
  },

  // ---------------------------------------------------------------- Al Wakrah
  {
    id: "dq-al-janoub", name: "Al Janoub Stadium", kind: "attraction",
    blurb: "Zaha Hadid's stadium shaped like the sails of a dhow.",
    venues: [venue("Al Janoub Stadium", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#1f3b2a", wall: "#f5f5f4", accent: MAROON }, role: "Stadium guide", noJob: true, products: [ticket("janoub:match", "Match ticket", 90, "A league night under the sails.", "⚽")], activities: [show("janoub:match", "Watch the match", "⚽", 30, "fun", "clap")] })],
  },
  {
    id: "dq-wakrah-souq", name: "Al Wakrah Souq", kind: "mall",
    blurb: "The old souq on the sea: mud-plastered lanes, shops and restaurants on the beach.",
    venues: [venue("Wakrah Spice Shop", "Spices & dates", "supermarket"), venue("Wakrah Perfumes", "Arabian fragrance", "fragrance"), venue("Wakrah Seafront Café", "Café", "cafe"), venue("Wakrah Machboos", "Qatari", "restaurant")],
  },
  single("dq-wakrah-resort", "Al Wakrah Beach Resort", "hotel", venue("Al Wakrah Beach Resort", "Beach resort & suites", "hotel", { palette: PALETTES.lobby, blurb: "On the sand beside Al Wakrah's souq." })),
  {
    id: "dq-wakrah-harbour", name: "Al Wakrah Dhow Harbour", kind: "attraction",
    blurb: "Old dhows moored by the souq: sail along the coast.",
    venues: [{ ...venue("Wakrah Dhow Cruise", "Dhow cruise", "hotel", { layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true, products: [ticket("wakrah:dhow", "Dhow cruise", 100, "An hour along the coast.", "⛵")], activities: [show("wakrah:sail", "Sail on a dhow", "⛵", 30, "fun", "sit")] }) }],
  },
  {
    id: "dq-wakrah-beach", name: "Al Wakrah Family Beach", kind: "park",
    blurb: "A shallow, calm family beach.",
    venues: [venue("Al Wakrah Family Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },
  {
    id: "dq-wakrah-fish", name: "Al Wakrah Fish Market Grill", kind: "food-hall",
    blurb: "Pick your fish at the market and have it grilled.",
    venues: [venue("Fish Market Grill", "Seafood", "restaurant")],
  },

  // ---------------------------------------------------------------- Umm Salal & Doha Festival City
  {
    id: "dq-festival-city", name: "Doha Festival City", kind: "mall",
    blurb: "The giant mall in the north, with an indoor snow park.",
    venues: [
      venue("Festival City Fashion", "Fashion", "fashion"), venue("Festival City Home", "Home", "home"), venue("Festival City Electronics", "Electronics", "electronics"),
      venue("Festival City Hypermarket", "Supermarket", "supermarket"), venue("Festival City Food Court", "Food court", "restaurant"),
      venue("Festival City Snow Park", "Indoor snow park", "club", { layout: "rink", role: "Snow host", noJob: true, blurb: "Snow, ice and sledges indoors in the desert." }),
    ],
  },
  {
    id: "dq-festival-park", name: "Festival City Theme Park", kind: "attraction",
    blurb: "The indoor theme park at Doha Festival City: coasters, go-karts and games.",
    venues: [venue("Festival City Theme Park", "Indoor theme park", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#7f1d1d", wall: "#fee2e2", accent: "#f59e0b" }, role: "Ride host", noJob: true,
      products: [ticket("festpark:day", "Day pass", 175, "Every ride.", "🎢")],
      activities: [show("festpark:karts", "Race the go-karts", "🏎️", 35, "fun", "clap"), show("festpark:coaster", "Ride the coaster", "🎢", 35, "fun", "clap")],
    })],
  },
  {
    id: "dq-umm-salal-fort", name: "Umm Salal Mohammed Fort", kind: "attraction",
    blurb: "A 19th-century fort of stone and mud with its tall watchtower.",
    venues: [venue("Umm Salal Mohammed Fort", "Fort", "hotel", { layout: "lobby", palette: PALETTES.oud, role: "Heritage guide", noJob: true, products: [ticket("ummsalal:entry", "Fort entry", 0, "Free.", "🏰")], activities: [show("ummsalal:tour", "Climb the watchtower", "🏰", 25)] })],
  },
  {
    id: "dq-ummsalal-dining", name: "Umm Salal Family Diner", kind: "food-hall",
    blurb: "A family diner for the northern suburbs.",
    venues: [venue("Umm Salal Diner", "Family diner", "restaurant")],
  },

  // ---------------------------------------------------------------- Al Thumama & Ain Khaled
  {
    id: "dq-al-thumama", name: "Al Thumama Stadium", kind: "attraction",
    blurb: "The stadium shaped like the gahfiya, the woven cap worn under the ghutra.",
    venues: [venue("Al Thumama Stadium", "Stadium", "hotel", { layout: "lobby", palette: { floor: "#1f3b2a", wall: "#f5f5f4", accent: MAROON }, role: "Stadium guide", noJob: true, products: [ticket("thumama:match", "Match ticket", 90, "A league night.", "⚽")], activities: [show("thumama:match", "Watch the match", "⚽", 30, "fun", "clap")] })],
  },
  {
    id: "dq-thumama-park", name: "Ain Khaled Park", kind: "park",
    blurb: "A green park for the villa compounds round it.",
    venues: [venue("Ain Khaled Park", "Park", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Park ranger", noJob: true, products: [], activities: [show("ainkhaled:walk", "Walk the park", "🌳", 15, "energy", "wave")] })],
  },

  // ---------------------------------------------------------------- Simaisma & Al Thakhira
  {
    id: "dq-thakhira", name: "Al Thakhira Mangroves", kind: "park",
    blurb: "Qatar's largest mangroves: kayak the channels at high tide.",
    venues: [venue("Al Thakhira Kayaks", "Mangrove kayaking", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Kayak guide", noJob: true, products: [ticket("thakhira:kayak", "Kayak tour", 130, "Through the mangrove channels.", "🛶")], activities: [show("thakhira:kayak", "Kayak the mangrove channels", "🛶", 35, "fun", "wave")] })],
  },
  {
    id: "dq-simaisma-beach", name: "Simaisma Beach", kind: "park",
    blurb: "A family beach and corniche on the coast road north.",
    venues: [venue("Simaisma Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })],
  },
  single("dq-zulal-resort", "Zulal Wellness Resort", "hotel", venue("Zulal Wellness Resort", "Wellness resort & suites", "hotel", { palette: PALETTES.park, blurb: "A wellness retreat on the northern coast, with traditional Arabic and Islamic medicine." })),
  {
    id: "dq-simaisma-harbour", name: "Simaisma Dhow Harbour", kind: "attraction",
    blurb: "Fishing dhows and boat trips out of Simaisma.",
    venues: [{ ...venue("Simaisma Boat Trip", "Dhow trip", "hotel", { layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true, products: [ticket("simaisma:boat", "Boat trip", 90, "An hour up the coast.", "⛵")], activities: [show("simaisma:sail", "Sail up the coast", "⛵", 25, "fun", "sit")] }) }],
  },
  {
    id: "dq-simaisma-camp", name: "Simaisma Desert Camp", kind: "attraction",
    blurb: "A camp on the dunes behind the coast: a fire, camels and dinner under the stars.",
    venues: [venue("Simaisma Desert Camp", "Desert camp", "hotel", { layout: "outdoor", palette: PALETTES.oud, role: "Camp host", noJob: true, products: [ticket("simcamp:night", "Desert night with dinner", 220, "Camels, a fire and a barbecue.", "🔥")], activities: [show("simcamp:camel", "Ride a camel", "🐪", 25, "fun", "wave"), { id: "simcamp:dinner", label: "Dinner by the fire", icon: "🔥", animation: "sit", reward: 15, need: { kind: "hunger", amount: 50 } }] })],
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
