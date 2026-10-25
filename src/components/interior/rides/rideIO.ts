// The link between the ride in the 3D scene (RideRig) and its on-screen controls (RideHUD): the HUD
// writes the player's input, the rig writes what's happening. A plain mutable object, read every frame by
// the rig and a few times a second by the HUD, so neither re-renders the other. One ride runs at a time.

export interface RideInput {
  /** The main button (or Space) is held down right now: arms crossed on a drop… */
  down: boolean;
  /** Taps on the main button since the ride started (strokes, push-offs, spins, jumps…). */
  taps: number;
  /** FlowRider steering: -1 left, 0 none, 1 right. */
  steer: number;
  /** Tricks asked for on the FlowRider. */
  tricks: number;
  /** Leave the ride now (rivers, floats, wave pool). */
  exit: boolean;
  /** Dance-off moves pressed (a count) and the last one's direction. */
  moves: number;
  moveDir: Arrow | "";
  /** Meal: the dishes ordered (product ids), once ordered. */
  order: string[] | null;
  /** Meal: food photos taken, and whether to leave a tip. */
  photos: number;
  tip: boolean;
  /** Wax figures: the pose picked (index into tele.options), -1 for none yet. */
  choice: number;
}
export type Arrow = "left" | "up" | "right" | "down";

export interface RideTelemetry {
  /** What's happening, for the HUD: climbing, ready, riding, splash, swimming, done… */
  phase: string;
  /** What the main button does right now ("Hold to cross your arms", "Tap to stroke"…); empty hides it. */
  prompt: string;
  /** Whether the main button is a hold (true) or taps (false). */
  holdButton: boolean;
  /** Countdown shown big in the middle (3, 2, 1), 0 for none. */
  countdown: number;
  speedKmh: number;
  topKmh: number;
  /** Seconds since the ride itself started. */
  time: number;
  /** 0..1 along the ride. */
  progress: number;
  /** Ride-specific score (form %, splash size, waves jumped, surf points…). */
  score: number;
  /** FlowRider balance, -1..1 (0 is centred). */
  balance: number;
  /** Heart rate in the launch capsule. */
  bpm: number;
  /** FlowRider wipeouts, or laps of a river. */
  count: number;
  /** A short message to flash ("Perfect stroke!", "Wipeout!"). */
  flash: string;
  flashAt: number;
  /** A meter the HUD shows (bowling aim -1..1 or power 0..1), with its label; empty label hides it. */
  meter: number;
  meterLabel: string;
  /** Karaoke: when the first beat lands (performance.now()) and the gap between beats (ms). */
  beatStart: number;
  beatGap: number;
  /** Dance-off: the move to hit on the next beat. */
  arrow: Arrow | "";
  /** Extra controls the HUD shows: the menu, the photo button, the bill. */
  panel: "" | "menu" | "photo" | "bill";
  /** Meal: the bill so far (AED). */
  bill: number;
  /** Spa breathing guide: 0 (out) to 1 (in), -1 hidden. */
  breath: number;
  /** Choices to pick from (wax-figure poses), and a fade to black (performance.now() it started, 0 none). */
  options: string[];
  fadeAt: number;
}

export interface RideResult {
  rideId: string;
  /** Headline numbers for the result card, in order. */
  stats: Array<{ label: string; value: string }>;
  /** 1..3 */
  stars: number;
  /** For a personal best: the number compared (higher is better) and how to show it. */
  best?: { value: number; label: string; lowerIsBetter?: boolean };
  /** Won a race, or similar. */
  headline?: string;
  /** What the venue charges at the end (the meal's bill, tip included). */
  charge?: number;
  /** The dishes eaten (product ids): they feed the citizen's needs. */
  ate?: string[];
  /** Something the ride leaves behind in the venue for the rest of the visit (a sandcastle). */
  keep?: { castle?: { at: [number, number]; stage: number } };
}

export const rideIO: { input: RideInput; tele: RideTelemetry } = {
  input: { down: false, taps: 0, steer: 0, tricks: 0, exit: false, moves: 0, moveDir: "", order: null, photos: 0, tip: false, choice: -1 },
  tele: freshTelemetry(),
};

function freshTelemetry(): RideTelemetry {
  return { phase: "", prompt: "", holdButton: false, countdown: 0, speedKmh: 0, topKmh: 0, time: 0, progress: 0, score: 0, balance: 0, bpm: 0, count: 0, flash: "", flashAt: 0, meter: 0, meterLabel: "", beatStart: 0, beatGap: 0, arrow: "", panel: "", bill: 0, breath: -1, options: [], fadeAt: 0 };
}

export function resetRideIO() {
  rideIO.input = { down: false, taps: 0, steer: 0, tricks: 0, exit: false, moves: 0, moveDir: "", order: null, photos: 0, tip: false, choice: -1 };
  rideIO.tele = freshTelemetry();
}

export function flash(msg: string) {
  rideIO.tele.flash = msg;
  rideIO.tele.flashAt = performance.now();
}
