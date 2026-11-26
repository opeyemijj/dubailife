// Abu Dhabi's places (ids "ad-…"): what's inside each building on its map (./map.ts), built from the same kit as
// Dubai's (lib/city/places placeKit: the same shops, menus, staff, jobs, hotels with suites, yachts and races) but
// kept out of Dubai's lists (registered with registerCityPlaces, found by getPlace). Homes in its towers and villas
// are rows in the flats table like Dubai's (supabase *_abu_dhabi.sql), so renting, buying and decorating just work.

import { placeKit, registerCityPlaces } from "@/lib/city/places";
import { quickCourseActivities } from "@/lib/academy/quickData";
import { getCoursesByCampus } from "@/lib/city/academic";
import { GAMES } from "@/lib/games/registry";
import type { Place, Venue, VenueActivity } from "@/lib/city/types";

const { venue, spa, pool, single, ticket, yacht, gymActivities, PALETTES } = placeKit;

const swim: VenueActivity[] = [{ id: "swim", label: "Swim in the Gulf", icon: "🏊", animation: "wave", need: { kind: "fun", amount: 25 } }];
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

/** A watersports beach: jet skis (ridden in 3D on the beach), flyboards, banana boats and parasailing. */
function watersports(id: string, name: string, blurb: string): Place {
  return { id, name, kind: "club", blurb, venues: [venue(name, "Watersports beach", "hotel", {
    layout: "beach", palette: PALETTES.park, role: "Watersports instructor", noJob: true, blurb,
    products: [ticket(`${id}:jetski`, "Jet ski, 30 minutes", 250, "A jet ski with a safety briefing.", "🚤"), ticket(`${id}:flyboard`, "Flyboard, 20 minutes", 350, "Fly over the water.", "🌊"), ticket(`${id}:banana`, "Banana boat ride", 80, "Hang on, for up to six.", "🍌"), ticket(`${id}:parasail`, "Parasailing", 300, "High over the water behind a speedboat.", "🪂")],
    activities: [...swim, { id: `${id}:parasail`, label: "Parasail over the water", icon: "🪂", animation: "wave", reward: 35, need: { kind: "fun", amount: 30 } }],
  })] };
}

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
    id: "ad-auh-airport", name: "Abu Dhabi International Airport (AUH)", kind: "attraction", route: "/fly",
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
    blurb: "82 white marble domes, four minarets, the world's largest hand-knotted carpet and a 12 m crystal chandelier. Modest dress, please.",
    venues: [
      // The main prayer hall, built as itself (components/interior/abuDhabi/scenes "szgm-prayer-hall").
      { ...venue("Main Prayer Hall", "Mosque · the prayer hall", "hotel", {
        layout: "mosque", palette: { floor: "#f8fafc", wall: "#f8fafc", accent: "#c9a24a" }, role: "Mosque guide", noJob: true,
        blurb: "White Italian marble, 96 columns inlaid with mother-of-pearl vines under gilded palm capitals, the 99 Names of Allah on the qibla wall, the great carpet and the chandelier.",
        products: [
          { id: "szgm:abaya", name: "Abaya or kandura for your visit", price: 0, icon: "🧕", station: "reception", desc: "Free to borrow at the visitor centre: modest dress, shoulders and knees covered.", service: true },
          { id: "szgm:tour-book", name: "Free guided tour", price: 0, icon: "🕌", station: "tickets", desc: "The architecture, the carpet, the chandeliers and the calligraphy with a guide.", service: true },
        ],
        activities: [
          { id: "szgm:tour", label: "Take the guided tour", icon: "🕌", animation: "talk", reward: 40, need: { kind: "social", amount: 25 }, desc: "Under the chandelier, across the carpet, to the qibla wall and its 99 Names." },
          { id: "szgm:reflect", label: "Sit and reflect", icon: "🤲", animation: "sit", reward: 20, need: { kind: "energy", amount: 20 } },
        ],
      }), scene: "szgm-prayer-hall" },
      // The Sahn, the courtyard (scene "szgm-courtyard").
      { ...venue("The Courtyard", "Mosque · the Sahn and its reflecting water", "hotel", {
        layout: "outdoor", palette: { floor: "#f6f4ee", wall: "#fbfbf8", accent: "#c9a24a" }, role: "Mosque guide", noJob: true, products: [],
        blurb: "The world's largest marble mosaic, flowers inlaid in coloured marble, between the arcades and their reflecting pools.",
        activities: [
          { id: "szgm:courtyard", label: "Walk the floral marble courtyard", icon: "🌸", animation: "talk", reward: 25, need: { kind: "fun", amount: 20 } },
          { id: "szgm:pools", label: "Photograph the domes in the reflecting pools", icon: "📸", animation: "clap", reward: 20, need: { kind: "fun", amount: 20 } },
          { id: "szgm:dusk", label: "Watch the domes light up at dusk", icon: "🌙", animation: "sit", reward: 20, need: { kind: "energy", amount: 15 }, desc: "The lights follow the moon: the domes glow brighter as it waxes." },
        ],
      }), scene: "szgm-courtyard" },
    ],
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
  // ---------------------------------------------------------------- driving school and Game City
  drivingSchool("ad-driving-school", "Capital Driving School", "Mussafah's driving school: the eye test, theory and the Smart Yard for your licence."),
  gameCity("ad-game-city", "Game City Abu Dhabi", "Ludo, chess and all of Game City's games: play your friends live."),
  // ---------------------------------------------------------------- the wider city: everyday life
  neighbourhood("ad-khalidiyah-centre", "Khalidiyah Neighbourhood Centre", "Al Khalidiyah's shops for every day."),
  neighbourhood("ad-mbz-centre", "MBZ Neighbourhood Centre", "Mohammed Bin Zayed City's local shops."),
  neighbourhood("ad-shakhbout-centre", "Shakhbout Neighbourhood Centre", "Shakhbout City's local shops."),
  neighbourhood("ad-maryah-centre", "Maryah Neighbourhood Centre", "The everyday shops under Al Maryah's towers."),
  neighbourhood("ad-masdar-centre", "Masdar Neighbourhood Centre", "Masdar City's local shops."),
  neighbourhood("ad-zahiyah-centre", "Zahiyah Neighbourhood Centre", "Al Zahiyah's shops for every day."),
  neighbourhood("ad-shams-centre", "Shams Neighbourhood Centre", "The shops at the foot of the Shams towers."),
  neighbourhood("ad-falah-centre", "Al Falah Neighbourhood Centre", "Al Falah's local shops."),
  clinic("ad-mbz-clinic", "MBZ Family Clinic", "The family clinic for MBZ City."),
  clinic("ad-cleveland-clinic", "Cleveland Clinic Abu Dhabi", "The island's big hospital, on Al Maryah."),
  clinic("ad-rahba-hospital", "Al Rahba Hospital", "The hospital for the northern suburbs."),
  clinic("ad-shams-clinic", "Shams Medical Centre", "The medical centre among the Shams towers."),
  park("ad-hudayriyat-bike", "Hudayriyat Bike Park", "Cycle tracks, a pump track and a skate park on Hudayriyat.", [{ id: "hudayriyat:cycle", label: "Ride the cycle tracks", icon: "🚴", animation: "clap", reward: 25, need: { kind: "fun", amount: 25 } }]),
  park("ad-mbz-park", "MBZ Central Park", "Lawns and a playground for MBZ City's families."),
  park("ad-shakhbout-park", "Shakhbout Park", "A neighbourhood park with a running track."),
  park("ad-jubail-golf", "Jubail Island Golf Club", "Fairways between the mangroves.", [{ id: "jubail:golf", label: "Play nine holes", icon: "⛳", animation: "clap", reward: 30, need: { kind: "fun", amount: 30 } }]),
  park("ad-masdar-park", "Masdar Park", "Shaded gardens cooled by Masdar's wind tower."),
  park("ad-reem-central-park", "Reem Central Park", "The green heart of Al Reem, between the towers."),
  park("ad-falah-park", "Al Falah Park", "A big family park."),
  watersports("ad-hudayriyat-jetski", "Hudayriyat Jet Ski & Watersports", "Jet skis and flyboards off Hudayriyat's beach."),
  watersports("ad-khalidiyah-jetski", "Khalidiyah Jet Ski", "Jet skis along the Corniche, the skyline behind you."),
  watersports("ad-jubail-jetski", "Jubail Island Jet Ski", "Jet skis through the channels round Jubail Island."),

  // ---------------------------------------------------------------- the wider city: places to go
  {
    id: "ad-surf-abu-dhabi", name: "Surf Abu Dhabi", kind: "attraction",
    blurb: "One of the world's biggest wave pools, on Hudayriyat Island: the same wave, every time.",
    venues: [venue("Surf Abu Dhabi", "Wave pool", "hotel", {
      layout: "lobby", palette: { floor: "#0e7490", wall: "#cffafe", accent: "#0891b2" }, role: "Surf coach", noJob: true,
      products: [ticket("surf:lesson", "Beginner surf lesson", 450, "A coach, a board and the gentle waves.", "🏄"), ticket("surf:session", "Surf session", 650, "An hour on the big waves.", "🌊")],
      activities: [{ id: "surf:ride", label: "Catch a wave", icon: "🏄", animation: "clap", reward: 45, need: { kind: "fun", amount: 45 } }, { id: "surf:watch", label: "Watch the surfers from the deck", icon: "🍹", animation: "sit", reward: 10, need: { kind: "energy", amount: 10 } }],
    })],
  },
  {
    id: "ad-marsana", name: "Marsana Beach Dining", kind: "food-hall",
    blurb: "Hudayriyat's waterfront of restaurants and cafés on the sand.",
    venues: [venue("Marsana Seafood", "Seafood", "restaurant"), venue("Marsana Burgers", "Burgers", "restaurant"), venue("Marsana Coffee", "Café", "cafe")],
  },
  { id: "ad-hudayriyat-beach", name: "Hudayriyat Beach", kind: "park", blurb: "A long, calm public beach on Hudayriyat.", venues: [venue("Hudayriyat Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })] },
  { id: "ad-hudayriyat-marina", name: "Hudayriyat Marina", kind: "attraction", blurb: "Yachts for a party round the island.", venues: [partyYacht("Hudayriyat Party Cruiser", 3000, 25, "A party deck and a slide into the sea.")] },
  {
    id: "ad-khalidiyah-mall", name: "Khalidiyah Mall", kind: "mall", blurb: "The west island's family mall.",
    venues: [venue("Khalidiyah Fashion", "Fashion", "fashion"), venue("Khalidiyah Hypermarket", "Supermarket", "supermarket"), venue("Khalidiyah Toys", "Toys", "toys"), venue("Khalidiyah Food Court", "Food court", "restaurant")],
  },
  { id: "ad-bateen-marina", name: "Al Bateen Marina", kind: "attraction", blurb: "The yacht marina of Al Bateen, for parties on the water.", venues: [partyYacht("Bateen Sunset Party Yacht", 3400, 30, "Sunset along the Corniche with your guests."), yacht("Bateen Riva 50", 2400, 8, "A fast day-cruiser.")] },
  { id: "ad-bateen-wharf", name: "Bateen Wharf", kind: "food-hall", blurb: "Restaurants on the old boatyard wharf.", venues: [venue("Wharf Grill", "Grill", "restaurant"), venue("Wharf Café", "Café", "cafe")] },
  { id: "ad-khalidiyah-beach", name: "Khalidiyah Beach", kind: "park", blurb: "A public beach at the west end of the Corniche.", venues: [venue("Khalidiyah Beach", "Public beach", "hotel", { layout: "beach", products: [], palette: PALETTES.park, role: "Lifeguard", noJob: true, activities: swim })] },
  {
    id: "ad-mazyad-mall", name: "Mazyad Mall", kind: "mall", blurb: "MBZ City's big mall.",
    venues: [venue("Mazyad Fashion", "Fashion", "fashion"), venue("Mazyad Electronics", "Electronics", "electronics"), venue("Mazyad Hypermarket", "Supermarket", "supermarket"), venue("Mazyad Food Court", "Food court", "restaurant")],
  },
  { id: "ad-mussafah-hyper", name: "Mussafah Hypermarket", kind: "mall", blurb: "The big hypermarket for Mussafah's homes.", venues: [venue("Mussafah Hypermarket", "Supermarket", "supermarket"), venue("Mussafah Mobile & Electronics", "Electronics", "electronics")] },
  { id: "ad-jubail-mangroves", name: "Jubail Mangrove Park", kind: "park", blurb: "Boardwalks and kayaks through Jubail's mangroves.", venues: [venue("Jubail Mangrove Park", "Mangroves", "hotel", { layout: "outdoor", palette: PALETTES.park, role: "Ranger", noJob: true, products: [ticket("jubail:kayak", "Kayak tour", 140, "Through the mangrove channels.", "🛶")], activities: [{ id: "jubail:boardwalk", label: "Walk the mangrove boardwalk", icon: "🌿", animation: "wave", reward: 15, need: { kind: "energy", amount: 15 } }, { id: "jubail:kayak", label: "Kayak the channels", icon: "🛶", animation: "wave", reward: 30, need: { kind: "fun", amount: 30 } }] })] },
  { id: "ad-jubail-beach-club", name: "Jubail Beach Club", kind: "club", blurb: "An island beach club.", venues: [venue("Jubail Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("jubail-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), pool("Jubail Beach Club Pool")] },
  { id: "ad-jubail-marina", name: "Jubail Marina", kind: "attraction", blurb: "Yachts and parties off Jubail Island.", venues: [partyYacht("Jubail Island Party Yacht", 3200, 25, "A party round the island at sunset.")] },
  single("ad-four-seasons-ad", "Four Seasons Abu Dhabi", "hotel", venue("Four Seasons Abu Dhabi", "Hotel tower & suites", "hotel", { palette: PALETTES.luxury, blurb: "On Al Maryah Island, over the promenade and the water." })),
  { id: "ad-maryah-plaza", name: "Maryah Plaza", kind: "mall", blurb: "Al Maryah's mall and dining plaza.", venues: [venue("Maryah Plaza Fashion", "Fashion", "fashion"), venue("Maryah Plaza Beauty", "Beauty", "beauty"), venue("Maryah Plaza Café", "Café", "cafe")] },
  { id: "ad-maryah-promenade", name: "Maryah Promenade Dining", kind: "food-hall", blurb: "Terraces along Al Maryah's waterfront promenade.", venues: [venue("Promenade Steakhouse", "Steakhouse", "restaurant"), venue("Promenade Sushi", "Japanese", "restaurant"), venue("Promenade Gelato", "Gelato", "cafe")] },
  { id: "ad-maryah-pier", name: "Maryah Yacht Pier", kind: "attraction", blurb: "Yacht parties from the heart of the city.", venues: [partyYacht("Maryah Skyline Party Yacht", 3600, 30, "Past the towers with the lights on.")] },
  { id: "ad-maryah-beach-club", name: "Maryah Island Beach Club", kind: "club", blurb: "A city beach club under the towers.", venues: [venue("Maryah Beach", "Beach club", "hotel", { layout: "beach", products: daybeds("maryah-beach"), palette: PALETTES.park, role: "Beach host", noJob: true, activities: swim }), pool("Maryah Beach Club Pool")] },
  {
    id: "ad-masdar-city", name: "Masdar City", kind: "attraction",
    blurb: "The low-carbon city by the airport: shaded lanes, solar roofs, a wind tower and Khalifa University's research campus.",
    venues: [venue("Masdar City", "Sustainable city", "hotel", {
      layout: "lobby", feature: "exhibits", palette: { floor: "#e7e2d4", wall: "#f5efe3", accent: "#15803d" }, role: "City guide", noJob: true,
      products: [ticket("masdar:tour", "Masdar City tour", 60, "The wind tower, the solar roofs and the driverless pods.", "🌱")],
      activities: [{ id: "masdar:tour", label: "Tour the low-carbon city", icon: "🌱", animation: "talk", reward: 25, need: { kind: "fun", amount: 20 } }, ...quickCourseActivities("ad-khalifa-university").slice(0, 1)],
    })],
  },
  { id: "ad-deerfields", name: "Deerfields Mall", kind: "mall", blurb: "The northern suburbs' mall.", venues: [venue("Deerfields Fashion", "Fashion", "fashion"), venue("Deerfields Hypermarket", "Supermarket", "supermarket"), venue("Deerfields Food Court", "Food court", "restaurant")] },
  {
    id: "ad-abu-dhabi-mall", name: "Abu Dhabi Mall", kind: "mall", blurb: "The Tourist Club Area's big mall, by the Beach Rotana.",
    venues: [venue("Abu Dhabi Mall Fashion", "Fashion", "fashion"), venue("Abu Dhabi Mall Luxury", "Luxury fashion", "luxury"), venue("Abu Dhabi Mall Electronics", "Electronics", "electronics"), venue("Abu Dhabi Mall Toys", "Toys", "toys"), venue("Abu Dhabi Mall Food Court", "Food court", "restaurant")],
  },
  single("ad-beach-rotana", "Beach Rotana", "hotel", venue("Beach Rotana", "Beach hotel & suites", "hotel", { palette: PALETTES.lobby, blurb: "A city beach hotel joined to Abu Dhabi Mall." })),
  { id: "ad-mina-fish-market", name: "Mina Zayed Fish Market", kind: "food-hall", blurb: "Pick the morning's catch and have it cooked next door.", venues: [venue("Mina Fish Market", "Fresh fish", "supermarket"), venue("Mina Fish Grill", "Seafood", "restaurant")] },
  { id: "ad-iranian-souq", name: "Iranian Souq", kind: "mall", blurb: "Pots, carpets, spices and plants by the port.", venues: [venue("Iranian Souq Housewares", "Home & carpets", "home"), venue("Iranian Souq Spices", "Spices & dates", "supermarket")] },
  { id: "ad-mina-dhows", name: "Mina Zayed Dhow Harbour", kind: "attraction", blurb: "Trading dhows moored at the port: sail the harbour.", venues: [{ ...venue("Mina Dhow Cruise", "Dhow cruise", "hotel", { layout: "yacht", feature: "skyline", palette: { floor: "#a16207", wall: "#fef3c7", accent: "#92400e" }, role: "Captain", noJob: true, products: [ticket("mina:dhow", "Dhow dinner cruise", 160, "Two hours with dinner on deck.", "⛵")], activities: [{ id: "mina:sail", label: "Sail the harbour on a dhow", icon: "⛵", animation: "sit", reward: 25, need: { kind: "fun", amount: 25 } }] }) }] },
  { id: "ad-mina-yachts", name: "Mina Zayed Yacht Club", kind: "attraction", blurb: "Party yachts from the port.", venues: [partyYacht("Mina Superyacht Royale", 9000, 40, "The port's biggest: a party for forty."), partyYacht("Mina Party Catamaran", 2600, 20, "A wide deck for dancing.")] },
  { id: "ad-boutik-mall", name: "Boutik Mall", kind: "mall", blurb: "Al Reem's neighbourhood mall.", venues: [venue("Boutik Fashion", "Fashion", "fashion"), venue("Boutik Supermarket", "Supermarket", "supermarket"), venue("Boutik Café", "Café", "cafe")] },
  { id: "ad-saadiyat-party-marina", name: "Saadiyat Superyacht Party Marina", kind: "club", blurb: "A floating marina out on the Gulf: superyachts for parties under the stars.", venues: [partyYacht("Saadiyat Superyacht Celeste", 11000, 50, "Three decks, a pool on the top deck and the lights of Saadiyat."), partyYacht("Saadiyat Party Catamaran", 2800, 20, "Dancing on a wide deck.")] },
  { id: "ad-yas-party-marina", name: "Yas Floating Party Marina", kind: "club", blurb: "Floating on the Gulf off Yas: party yachts with the circuit lit up behind.", venues: [partyYacht("Yas Party Superyacht", 9800, 40, "DJs, lights and Yas on the horizon."), partyYacht("Yas Sunset Party Yacht", 3400, 25, "A sunset party on the water.")] },
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
          // Quick courses taught on this campus (enrol, three lessons, a quiz, a certificate: lib/academy/quick).
          ...quickCourseActivities(id),
          // Every course from its partner campuses, each opening straight to that course (lib/city/academic).
          ...courses.flatMap((c) => campusCourses(id, c.campus)),
          ...courses.map((c, i): VenueActivity => ({ id: `${id}:study-${i}`, label: `${c.label}: see all`, icon: c.icon, href: `/academics/${c.campus}` })),
          { id: `${id}:library`, label: "Study in the library", icon: "📖", animation: "sit", reward: 10, need: { kind: "energy", amount: 10 } },
        ],
      }),
      venue(`${name} Campus Café`, "Campus café", "cafe"),
    ],
  };
}

/** A campus's courses (books left out), as activities opening each course. */
function campusCourses(placeId: string, campus: string): VenueActivity[] {
  return getCoursesByCampus(campus).filter((c) => !c.author)
    .map((c) => ({ id: `${placeId}:course:${c.id}`, label: `Course: ${c.title} · AED ${c.tuitionFee.toLocaleString()}`, icon: c.icon, href: `/academics/course/${c.id}` }));
}

/** A driving school: the same licence as Dubai's Driving Academy (eye test, theory, Smart Yard: /driving). */
function drivingSchool(id: string, name: string, blurb: string): Place {
  return {
    id, name, kind: "attraction", blurb,
    venues: [venue(name, "Driving school", "hotel", {
      layout: "lobby", palette: { floor: "#e2e8f0", wall: "#f8fafc", accent: "#f59e0b" }, role: "Driving instructor", noJob: true,
      blurb: "Pass the eye test, the theory exam and the Smart Yard to get your licence. It's valid in every city.",
      products: [],
      activities: [
        { id: `${id}:licence`, label: "Get your driving licence: eye test, theory, Smart Yard", icon: "🪪", href: "/driving" },
        { id: `${id}:theory`, label: "Revise road rules in the classroom", icon: "📘", animation: "sit", reward: 10, need: { kind: "energy", amount: 10 } },
      ],
    })],
  };
}

/** Game City: every game in Dubai's Game City, each opening its room (/games/<id>) to play friends live. */
function gameCity(id: string, name: string, blurb: string): Place {
  return {
    id, name, kind: "attraction", blurb,
    venues: [venue(name, "Game City", "electronics", {
      role: "Game host", noJob: true, products: [], blurb: "Pick a game and play your friends live.",
      activities: GAMES.map((g): VenueActivity => ({ id: `${id}:${g.id}`, label: `Play ${g.name}: ${g.tagline}`, icon: g.icon, href: `/games/${g.id}` })),
    })],
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
