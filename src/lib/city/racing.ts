// The race days (src/app/racing) side by side on the Global Village & Desert Horizon plain (unlabelled, where the
// airport plain was): the Autodrome's car
// circuit, Meydan Racecourse for horses, the Al Marmoom camel racetrack and the superbike circuit. Laid out in code
// (like the Palm), so the map editor doesn't save copies of them. What's inside each is in places.ts. (The Autodrome
// also keeps its building on Sheikh Zayed Road.)

export const RACING_ENTITIES = [
  { id: "autodrome-circuit", name: "Dubai Autodrome Circuit", type: "race-circuit", virtualX: 1992, virtualY: 133, width: 400, height: 220, interactive: true, generated: true },
  { id: "meydan-racecourse", name: "Meydan Racecourse", type: "racecourse", virtualX: 2552, virtualY: 133, width: 400, height: 220, interactive: true, generated: true },
  { id: "al-marmoom-camel-racetrack", name: "Al Marmoom Camel Racetrack", type: "camel-track", virtualX: 3102, virtualY: 133, width: 400, height: 220, interactive: true, generated: true },
  { id: "superbike-circuit", name: "Superbike Circuit", type: "bike-circuit", virtualX: 3652, virtualY: 133, width: 400, height: 220, interactive: true, generated: true },
];
