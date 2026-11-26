// Doha's race venues, for the shared race pages (/racing/<sport>, /autodrome), as Abu Dhabi's (../abuDhabi/racing).
import type { RaceVenueName } from "../abuDhabi/racing";

export const DQ_RACE_VENUES: Record<string, RaceVenueName> = {
  horse: { venue: "Al Rayyan Racecourse", place: "Al Rayyan", tagline: "Race a thoroughbred at the Qatar Racing & Equestrian Club", blurb: "Pick a horse from the stable, open a race and ride against your friends live. Push too early and your horse fades; save it for the final furlong." },
  camel: { venue: "Al Shahaniya Camel Racetrack", place: "Al Shahaniya", tagline: "Steer your robot jockey round Al Shahaniya", blurb: "Pick a racing camel from the stable, open a race and steer its robot jockey against your friends live." },
  bike: { venue: "Lusail International Circuit", place: "Lusail" },
};

export const DQ_CIRCUIT: RaceVenueName = { venue: "Lusail International Circuit", place: "Lusail" };
