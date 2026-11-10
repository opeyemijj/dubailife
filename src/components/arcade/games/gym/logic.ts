// The gym's six stations as plain logic, advanced by game time: the scene and HUD read the state and draw it.
// Each station's score is what data/arcade/gym.json grades into stars.

import GYM from "@/data/arcade/gym.json";

export type StationId = "treadmill" | "squat" | "bag" | "rower" | "spin" | "yoga";
export const STATIONS = GYM.stations as Array<{ id: StationId; name: string; icon: string; stat: "strength" | "stamina" | "flexibility"; seconds: number; stars: [number, number, number]; gain: number; how: string }>;
export const stationById = (id: StationId) => STATIONS.find((s) => s.id === id)!;

export interface Flash { text: string; tone: "good" | "great" | "bad" | "info" }

/** What the player did since the last step. */
export interface GymInput {
  /** Taps (treadmill strides, squat lifts). */
  taps: number;
  /** Held down (rower drive, spin climbs). */
  held: boolean;
  /** Horizontal drag since the last step, in screen widths (squat balance), or the drag vector (yoga). */
  dragX: number;
  dragY: number;
  /** Bag: punches thrown (0 jab, 1 cross, 2 left hook, 3 right hook). Spin: lanes tapped (0..2). */
  hits: number[];
}
export const noInput = (): GymInput => ({ taps: 0, held: false, dragX: 0, dragY: 0, hits: [] });

interface Base { t: number; seconds: number; score: number; done: boolean; flashes: Flash[]; combo: number; best: number }
const base = (seconds: number): Base => ({ t: 0, seconds, score: 0, done: false, flashes: [], combo: 0, best: 0 });

// ---------------------------------------------------------------- treadmill: rhythm taps hold the pace; outrun the sandstorm

export interface Treadmill extends Base { kind: "treadmill"; speed: number; target: number; sprint: boolean; strides: number[]; distance: number; stormGap: number; caught: number }
export const newTreadmill = (seconds: number): Treadmill => ({ ...base(seconds), kind: "treadmill", speed: 0, target: 9, sprint: false, strides: [], distance: 0, stormGap: 40, caught: 0 });

function stepTreadmill(s: Treadmill, dt: number, inp: GymInput, level: number) {
  for (let i = 0; i < inp.taps; i++) s.strides.push(s.t);
  s.strides = s.strides.filter((x) => s.t - x < 1.2);
  // Cadence (strides a second over the last 1.2 s) sets the speed: about 2.6 a second holds a 10 km/h jog.
  const cadence = s.strides.length / 1.2;
  s.speed += (cadence * 3.9 - s.speed) * Math.min(1, dt * 3);
  // Jog and sprint blocks of ten seconds; sprints get faster with level.
  const sprint = Math.floor(s.t / 10) % 2 === 1;
  if (sprint !== s.sprint) s.flashes.push(sprint ? { text: "🌪️ SANDSTORM! SPRINT!", tone: "bad" } : { text: "Jog and breathe", tone: "info" });
  s.sprint = sprint;
  s.target = sprint ? 13 + level * 0.4 : 9;
  s.distance += (s.speed / 3.6) * dt;
  // The storm moves at the target pace: fall behind the target and it closes in.
  s.stormGap += ((s.speed - s.target) / 3.6) * dt;
  s.stormGap = Math.min(60, s.stormGap);
  const onPace = Math.abs(s.speed - s.target) < 1.5 || s.speed > s.target;
  s.combo = onPace ? s.combo + dt : 0;
  if (s.stormGap <= 0) { s.caught++; s.stormGap = 25; s.flashes.push({ text: "Caught by the storm!", tone: "bad" }); }
  s.score = Math.round(s.distance - s.caught * 30);
}

// ---------------------------------------------------------------- squat: tap in the green zone, keep the bar level

export interface Squat extends Base { kind: "squat"; weight: number; reps: number; failed: number; marker: number; zone: number; tilt: number; tiltV: number; repAt: number; good: boolean }
export const newSquat = (seconds: number, strength: number): Squat => ({ ...base(seconds), kind: "squat", weight: 40 + Math.round(strength / 2), reps: 0, failed: 0, marker: 0, zone: 0.32, tilt: 0, tiltV: 0, repAt: -9, good: false });

function stepSquat(s: Squat, dt: number, inp: GymInput, level: number) {
  // The marker sweeps up and down the bar; faster as reps go on.
  const speed = 1.4 + s.reps * 0.08 + level * 0.05;
  s.marker = 0.5 + 0.5 * Math.sin(s.t * speed * Math.PI);
  // The bar drifts off level; drag to bring it back.
  s.tiltV += (Math.sin(s.t * 1.7 + s.reps) * 0.6 + (Math.random() - 0.5) * 0.8) * dt * (0.6 + s.reps * 0.08);
  s.tiltV *= Math.exp(-dt * 1.5);
  s.tilt += s.tiltV * dt * 2 - inp.dragX * 3.2;
  if (Math.abs(s.tilt) > 1) {
    s.failed++; s.tilt = 0; s.tiltV = 0; s.combo = 0;
    s.flashes.push({ text: "Bar tipped! Spotter saves it", tone: "bad" });
  }
  const lifting = s.t - s.repAt < 1.1;
  if (inp.taps > 0 && !lifting) {
    s.repAt = s.t;
    const off = Math.abs(s.marker - 0.5);
    if (off < s.zone / 2) {
      const perfect = off < s.zone / 6;
      s.good = true; s.reps++; s.combo++;
      s.score += Math.round(s.weight * (perfect ? 1.6 : 1) * (1 + Math.min(5, s.combo) * 0.1));
      s.flashes.push(perfect ? { text: `PERFECT REP · ${s.weight} kg`, tone: "great" } : { text: `Rep ${s.reps}`, tone: "good" });
      // Every third clean rep, more weight on the bar; every rep, a little more tired.
      if (s.reps % 3 === 0) { s.weight += 10; s.flashes.push({ text: `+10 kg → ${s.weight} kg`, tone: "info" }); }
      s.zone = Math.max(0.1, s.zone - 0.018);
    } else {
      s.good = false; s.failed++; s.combo = 0;
      s.flashes.push({ text: "Missed the drive", tone: "bad" });
    }
  }
}

// ---------------------------------------------------------------- heavy bag: the right punch on the beat

export interface Bag extends Base { kind: "bag"; bpm: number; beats: Array<{ at: number; punch: number; hit: "" | "perfect" | "good" | "miss" }>; lastHit: { punch: number; at: number; power: number } | null; perfects: number }
export function newBag(seconds: number, level: number): Bag {
  const bpm = 100 + Math.min(40, level * 4);
  const gap = 60 / bpm;
  const beats: Bag["beats"] = [];
  // A pattern of punches with rests, longer combos as it goes on.
  let seed = 3 + level;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let at = 2; at < seconds - 0.5; at += gap) {
    const bar = Math.floor(at / (gap * 4));
    if (rand() < 0.22 - Math.min(0.15, bar * 0.01)) continue;
    beats.push({ at, punch: Math.floor(rand() * 4), hit: "" });
  }
  return { ...base(seconds), kind: "bag", bpm, beats, lastHit: null, perfects: 0 };
}

function stepBag(s: Bag, _dt: number, inp: GymInput) {
  for (const punch of inp.hits) {
    // The nearest beat not yet played, within the timing window.
    const b = s.beats.find((x) => !x.hit && Math.abs(x.at - s.t) < 0.2);
    if (!b) { s.combo = 0; s.flashes.push({ text: "Off beat", tone: "bad" }); continue; }
    const off = Math.abs(b.at - s.t);
    if (punch !== b.punch) { b.hit = "miss"; s.combo = 0; s.flashes.push({ text: "Wrong punch", tone: "bad" }); continue; }
    b.hit = off < 0.08 ? "perfect" : "good";
    s.combo++;
    s.best = Math.max(s.best, s.combo);
    if (b.hit === "perfect") s.perfects++;
    const mult = 1 + Math.min(20, s.combo) * 0.1;
    s.score += Math.round((b.hit === "perfect" ? 100 : 60) * mult);
    s.lastHit = { punch, at: s.t, power: b.hit === "perfect" ? 1 : 0.6 };
    if (s.combo > 0 && s.combo % 10 === 0) s.flashes.push({ text: `x${s.combo} COMBO`, tone: "great" });
    else if (b.hit === "perfect") s.flashes.push({ text: "PERFECT", tone: "great" });
  }
  // Beats that slipped past unplayed are misses.
  for (const b of s.beats) if (!b.hit && s.t - b.at > 0.2) { b.hit = "miss"; s.combo = 0; }
}

// ---------------------------------------------------------------- rower: long smooth strokes in rhythm

export interface Rower extends Base { kind: "rower"; driving: boolean; phaseAt: number; boat: number; distance: number; ghost: number; ghostPace: number; strokes: number; quality: number; finished: boolean }
export const newRower = (seconds: number, best: number): Rower => ({ ...base(seconds), kind: "rower", driving: false, phaseAt: 0, boat: 0, distance: 0, ghost: 0, ghostPace: Math.max(7, (best || 380) / seconds), strokes: 0, quality: 0, finished: false });
const RACE = 500;

/** How good a phase length was: 1 inside the ideal range, falling off either side. */
const fit = (x: number, lo: number, hi: number) => (x < lo ? Math.max(0, 1 - (lo - x) / lo) : x > hi ? Math.max(0, 1 - (x - hi) / hi) : 1);

function stepRower(s: Rower, dt: number, inp: GymInput) {
  if (inp.held && !s.driving) {
    // The catch: how well-timed the recovery was.
    const rec = fit(s.t - s.phaseAt, 0.9, 1.5);
    s.driving = true; s.phaseAt = s.t; s.quality = rec;
  } else if (!inp.held && s.driving) {
    // The finish: the drive's length, and the stroke's push.
    const drive = fit(s.t - s.phaseAt, 0.55, 0.95);
    const q = (drive * 0.6 + s.quality * 0.4);
    s.driving = false; s.phaseAt = s.t; s.strokes++;
    s.boat += 4 + q * 6;
    s.combo = q > 0.8 ? s.combo + 1 : 0;
    s.flashes.push(q > 0.85 ? { text: "SMOOTH STROKE", tone: "great" } : q > 0.6 ? { text: "Good", tone: "good" } : { text: s.t - s.phaseAt < 0.5 ? "Too short" : "Rushed", tone: "bad" });
  }
  // The boat glides and slows between strokes.
  s.boat *= Math.exp(-dt * 0.55);
  if (!s.finished) {
    s.distance = Math.min(RACE, s.distance + s.boat * dt);
    s.ghost = Math.min(RACE, s.ghost + s.ghostPace * dt);
    if (s.distance >= RACE) { s.finished = true; s.done = true; s.flashes.push({ text: "🏁 FINISHED!", tone: "great" }); }
  }
  // Score: the distance, plus time left at the finish.
  s.score = Math.round(s.distance + (s.finished ? Math.max(0, s.seconds - s.t) * 5 : 0));
}

// ---------------------------------------------------------------- spin: beats down three lanes, with held climbs

export interface Spin extends Base { kind: "spin"; notes: Array<{ at: number; lane: number; len: number; hit: "" | "perfect" | "good" | "miss" | "holding"; held: number }> }
export function newSpin(seconds: number, level: number): Spin {
  const gap = 60 / (110 + level * 3);
  let seed = 5 + level;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const notes: Spin["notes"] = [];
  for (let at = 2.2; at < seconds - 1; at += gap) {
    const r = rand();
    if (r < 0.25) continue;
    // Every so often a climb: hold through it.
    if (r > 0.93) { notes.push({ at, lane: 1, len: gap * 4, hit: "", held: 0 }); at += gap * 4; continue; }
    notes.push({ at, lane: Math.floor(rand() * 3), len: 0, hit: "", held: 0 });
  }
  return { ...base(seconds), kind: "spin", notes };
}

function stepSpin(s: Spin, dt: number, inp: GymInput) {
  for (const lane of inp.hits) {
    const n = s.notes.find((x) => !x.hit && x.lane === lane && Math.abs(x.at - s.t) < 0.16);
    if (!n) { s.combo = 0; continue; }
    const off = Math.abs(n.at - s.t);
    n.hit = n.len ? "holding" : off < 0.08 ? "perfect" : "good";
    s.combo++;
    s.best = Math.max(s.best, s.combo);
    s.score += Math.round((off < 0.08 ? 100 : 60) * (1 + Math.min(30, s.combo) * 0.05));
    if (s.combo % 15 === 0) s.flashes.push({ text: `x${s.combo} STREAK`, tone: "great" });
  }
  for (const n of s.notes) {
    if (n.hit === "holding") {
      // Climbs: keep holding until the end of the bar; letting go early ends it.
      if (inp.held) { n.held += dt; s.score += Math.round(dt * 120); }
      if (!inp.held || s.t > n.at + n.len) { n.hit = n.held >= n.len * 0.85 ? "perfect" : "good"; if (n.hit === "perfect") s.flashes.push({ text: "CLIMB!", tone: "great" }); }
    } else if (!n.hit && s.t - n.at > 0.16) { n.hit = "miss"; s.combo = 0; }
  }
}

// ---------------------------------------------------------------- yoga: keep the dot in the circle

export interface Yoga extends Base { kind: "yoga"; x: number; y: number; vx: number; vy: number; inside: number; pose: number }
export const newYoga = (seconds: number): Yoga => ({ ...base(seconds), kind: "yoga", x: 0, y: 0, vx: 0, vy: 0, inside: 0, pose: 0 });
export const YOGA_POSES = ["Mountain", "Tree", "Warrior II", "Eagle", "Dancer"];

function stepYoga(s: Yoga, dt: number, inp: GymInput, level: number) {
  const pose = Math.min(YOGA_POSES.length - 1, Math.floor(s.t / (s.seconds / YOGA_POSES.length)));
  if (pose !== s.pose) { s.pose = pose; s.flashes.push({ text: YOGA_POSES[pose], tone: "info" }); }
  // The wobble: a drifting push that grows with each pose (and level).
  const w = (0.55 + pose * 0.28 + level * 0.04);
  s.vx += (Math.sin(s.t * 1.3 + pose) + (Math.random() - 0.5) * 1.6) * w * dt;
  s.vy += (Math.cos(s.t * 1.1 + pose * 2) + (Math.random() - 0.5) * 1.6) * w * dt;
  // Your drag pushes back.
  s.vx += inp.dragX * 9; s.vy += inp.dragY * 9;
  s.vx *= Math.exp(-dt * 1.8); s.vy *= Math.exp(-dt * 1.8);
  s.x = Math.max(-1.4, Math.min(1.4, s.x + s.vx * dt));
  s.y = Math.max(-1.4, Math.min(1.4, s.y + s.vy * dt));
  if (Math.hypot(s.x, s.y) < 0.45) s.inside += dt;
  s.score = Math.round((s.inside / Math.max(0.001, s.t)) * 100);
}

// ----------------------------------------------------------------

export type StationSim = Treadmill | Squat | Bag | Rower | Spin | Yoga;

export function newSim(id: StationId, opts: { level: number; strength: number; best: number }): StationSim {
  const sec = stationById(id).seconds;
  switch (id) {
    case "treadmill": return newTreadmill(sec);
    case "squat": return newSquat(sec, opts.strength);
    case "bag": return newBag(sec, opts.level);
    case "rower": return newRower(sec, opts.best);
    case "spin": return newSpin(sec, opts.level);
    case "yoga": return newYoga(sec);
  }
}

/** Advances a station by dt; returns true once it's over. */
export function stepSim(s: StationSim, dt: number, inp: GymInput, level: number): boolean {
  s.flashes = [];
  if (s.done) return true;
  s.t += dt;
  switch (s.kind) {
    case "treadmill": stepTreadmill(s, dt, inp, level); break;
    case "squat": stepSquat(s, dt, inp, level); break;
    case "bag": stepBag(s, dt, inp); break;
    case "rower": stepRower(s, dt, inp); break;
    case "spin": stepSpin(s, dt, inp); break;
    case "yoga": stepYoga(s, dt, inp, level); break;
  }
  if (s.t >= s.seconds) s.done = true;
  return s.done;
}
