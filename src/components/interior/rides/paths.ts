// The shapes of the waterpark and pool pieces, shared by the scenery that draws them (scenery.tsx,
// layouts.tsx) and the ride engine that moves riders along them (tracks.ts), so riders follow exactly the
// slides and water on screen. Units are metres; slide points are relative to the slide tower.

export type P3 = [number, number, number];

/** Height of the tower's top platform (where every slide starts). */
export const TOWER_TOP = 7.8;

export const SLIDE_POINTS: Record<"twistA" | "twistB" | "drop", P3[]> = {
  twistA: [[0.7, 7.8, 0], [3, 6.8, 0.6], [3.8, 5, -1.4], [2.2, 3.4, -2.6], [3.6, 1.6, -1.2], [5.4, 0.45, 0.8]],
  twistB: [[-0.7, 7.8, 0], [-3, 6.6, -0.8], [-3.8, 4.6, 1.2], [-2.2, 3, 2.6], [-3.8, 1.4, 3.4], [-5.4, 0.45, 4.4]],
  // the drop slide: almost straight down, then out through the shark lagoon
  drop: [[0, 7.8, 0.8], [0, 7.2, 1.6], [0, 3, 3.4], [0, 0.9, 5.2], [0, 0.45, 7.6]],
};
/** The second lane of a twin race slide sits this far to the side of the drop slide. */
export const TWIN_LANE = 0.75;
export const SLIDE_RADIUS = 0.34;
/** The raft slide's tube is wide enough for a ring raft. */
export const RAFT_RADIUS = 0.62;

/** The splash pools where each slide comes out (centre, width, depth), relative to the tower. */
export const SPLASH_POOLS: Record<"twistA" | "twistB" | "drop", { at: [number, number]; w: number; d: number }> = {
  twistA: { at: [5.6, 1.4], w: 3.4, d: 2.6 },
  twistB: { at: [-5.8, 5], w: 3.4, d: 2.6 },
  drop: { at: [0, 8.4], w: 3, d: 2.2 },
};

/** The stairs up the front of the tower, off to the side of the drop slide (relative to the tower). */
export const STAIRS_X = -1.05;
export const STAIRS: { foot: P3; top: P3 } = { foot: [STAIRS_X, 0, 6.3], top: [STAIRS_X, TOWER_TOP, 1.25] };

/** Where things stand in the waterpark (venue coordinates, metres). */
export const WATERPARK = {
  size: [28, 26] as [number, number],
  tower: [3, -6] as [number, number],
  wavePool: { at: [-7.6, -6.4] as [number, number], w: 9, d: 7 },
  river: { at: [-8.2, 4.4] as [number, number], radius: 3.4 },
  smallRiver: { at: [9.6, 2.6] as [number, number], radius: 2.4 },
  flowRider: { at: [10.2, -8] as [number, number], w: 3.2, d: 5.4 },
};

/** The pool on a pool deck (venue coordinates): sky pools sit further back, against the skyline. */
export function poolDeckPool(sky: boolean, kids: boolean) {
  return { at: [0, sky ? -4.2 : -2.2] as [number, number], w: kids ? 7 : 10, d: kids ? 3.2 : 4.6 };
}

/** Speed of the waves in a wave pool (m/s) and how many roll across at once: WavePool and the wave ride share them. */
export const WAVE_SPEED = 1.2;
export const WAVE_COUNT = 3;
/** Where wave `i` is at time t (z relative to the pool's centre). */
export const waveZ = (t: number, i: number, d: number) => ((t * WAVE_SPEED + i * (d / WAVE_COUNT)) % d) - d / 2;

/** Pool decks: sky pools (against the skyline) and kids' splash pools are laid out differently. */
export const isSkyPool = (v: { name: string; feature?: string }) => v.feature === "skyline" || /sky|cloud|aura|terrace/i.test(v.name);
export const isKidsPool = (v: { name: string }) => /kids/i.test(v.name);

/** The beach (venue coordinates): sand from the back (+z) down to the shoreline, then the sea out to -z. */
export const BEACH = {
  size: [22, 20] as [number, number],
  /** The sea starts beyond this z. */
  shore: -3,
  /** The swimming area's buoy line. */
  buoyZ: -8.5,
  /** Lounger sets along the sand, facing the sea. */
  loungers: [[-5.6, 0.6], [-2.4, 0.4], [0.8, 0.4], [4, 0.6], [6.8, 1.6]] as Array<[number, number]>,
  /** The volleyball net (centre; it runs along x, 6 m wide). */
  net: [3.6, 5.4] as [number, number],
  /** Where swimmers go in, water sports start and sandcastles get built. */
  swimX: 7.2,
  sportsX: -4.5,
  castle: [1.6, -1.7] as [number, number],
};

/** The ice rink (venue coordinates): the ice, the skating loop round it and the gate onto it. */
export const RINK = {
  size: [18, 14] as [number, number],
  ice: { at: [0, -1] as [number, number], w: 13, d: 7 },
  /** Skaters go round an oval inside the boards (half-widths). */
  loop: { rx: 5.1, rz: 2.4 },
  /** The gap in the boards where skaters step on. */
  gate: [-4, 2.5] as [number, number],
};

/** Brass Monkey's bowling alley: lanes running away from the bowler (-z), and the karaoke stage. */
export const BOWLING = {
  size: [16, 15] as [number, number],
  /** Lane centres (x); the first is the player's. */
  lanes: [-0.8, -2.8, -4.8],
  laneWidth: 1.06,
  foulZ: 3.2,
  /** The head pin (the others stand behind it, towards -z). */
  headPinZ: -5.6,
  pinSpacing: 0.3,
  stage: { at: [4.6, -3.6] as [number, number], w: 3.8, d: 2.6, h: 0.35 },
};
/** The ten pins: rows of 1, 2, 3, 4 behind the head pin (x and z offsets from the head pin). */
export const PIN_SPOTS: Array<[number, number]> = [0, 1, 2, 3].flatMap((r) => Array.from({ length: r + 1 }, (_, i) => [(i - r / 2) * BOWLING.pinSpacing, -r * BOWLING.pinSpacing * 0.866] as [number, number]));
/** Set while the player is bowling on lane 1, so the lane's resting pins step aside for the live ones. */
export const LANE_IN_USE = { current: false };

/** Dubai time is evening (disco skating, karaoke nights). */
export function dubaiEvening(now = new Date()) {
  const h = (now.getUTCHours() + 4) % 24;
  return h >= 18 || h < 2;
}
