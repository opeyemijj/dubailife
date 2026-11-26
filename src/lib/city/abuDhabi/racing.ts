// Abu Dhabi's race venues, for the shared race pages (/racing/<sport>, /autodrome): the same races, opened from
// Abu Dhabi's own tracks, so the page says where you are. Dubai's names (data/racing/sports.json) are untouched.

export interface RaceVenueName { venue: string; place: string; tagline?: string; blurb?: string }

export const AD_RACE_VENUES: Record<string, RaceVenueName> = {
  horse: {
    venue: "Abu Dhabi Equestrian Club", place: "Al Mushrif",
    tagline: "Race a thoroughbred on the capital's turf",
    blurb: "Pick a horse from the stable, open a race and ride against your friends live. Push too early and your horse fades; save it for the final furlong.",
  },
  camel: {
    venue: "Al Wathba Camel Racetrack", place: "Al Wathba",
    tagline: "Steer your robot jockey round Al Wathba",
    blurb: "Pick a racing camel from the stable, open a race and steer its robot jockey against your friends live.",
  },
  bike: { venue: "Yas Marina Circuit", place: "Yas Island" },
};

/** The car circuit, in Abu Dhabi. */
export const AD_CIRCUIT: RaceVenueName = { venue: "Yas Marina Circuit", place: "Yas Island" };
