"use client";

// Dubai Autodrome (src/app/autodrome): the circuit, how each car drives on it, and the races (lobby, start, finish:
// supabase/migrations/*_autodrome.sql). Up to 10 cars, an entry fee each and prizes from the pot (src/data/autodrome/entry.json). During a race, positions go player to player on the Realtime
// channel race:<code>, three times a second with a few cars and once a second with a full grid; between updates each
// car carries on along the track at its last speed, so it moves smoothly without flooding the channel.

import * as THREE from "three";
import { supabase } from "@/lib/supabase/client";
import { carOf, type Car } from "@/lib/cars";
import type { AvatarLookProps } from "@/components/avatar/roster";
import TRACKS_DATA from "@/data/autodrome/tracks.json";
import TUNING from "@/data/cars/tuning.json";
import SPORTS_DATA from "@/data/racing/sports.json";

// ---------------------------------------------------------------- the circuits

export interface TrackTheme {
  ground: string; infield: string; sky: string; fog: string; kerb: string; scenery: "towers" | "marina" | "dunes" | "mountains" | "palms"; sign: string; signColor: string;
  /** The racing surface (tarmac when absent): turf, dirt or sand, with white rails instead of kerbs. */
  surface?: string;
  /** What lines the home straight: the Autodrome's grandstands and pits, Meydan's crescent grandstand, or Al Marmoom's stand. */
  stands?: "autodrome" | "meydan" | "marmoom";
}
export interface TrackDef { id: string; /** Absent: a circuit (cars and superbikes). */ sport?: string; name: string; place: string; blurb: string; minLapMs: number; /** Metres either side of the centre line (9 on the circuits). */ halfWidth?: number; theme: TrackTheme; points: number[][] }
/** Every track (src/data/autodrome/tracks.json); each starts on a straight past the grandstands. */
export const ALL_TRACKS = TRACKS_DATA.tracks as TrackDef[];
/** The circuits, for cars (and superbikes). */
export const TRACKS = ALL_TRACKS.filter((t) => !t.sport);
export const DEFAULT_TRACK = "grand-prix";
export const trackDef = (id?: string | null) => ALL_TRACKS.find((t) => t.id === id) ?? TRACKS[0];
/** The tracks a sport races on: the Meydan courses for horses, Al Marmoom for camels, the circuits for cars and bikes. */
export const tracksFor = (sport?: Sport | null) => (sport === "horse" || sport === "camel" ? ALL_TRACKS.filter((t) => t.sport === sport) : TRACKS);

export const TRACK_HALF_WIDTH = 9;
const WALL = 16;

export interface TrackSample { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; curv: number }
export interface Track { def: TrackDef; curve: THREE.CatmullRomCurve3; length: number; samples: TrackSample[]; N: number; centre: [number, number]; radius: number; halfWidth: number }

const built = new Map<string, Track>();
/** A track's centre line, sampled (built once per track). */
export function trackOf(id?: string | null): Track {
  const def = trackDef(id);
  const done = built.get(def.id);
  if (done) return done;
  const curve = new THREE.CatmullRomCurve3(def.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
  const length = curve.getLength();
  const N = 900;
  const samples: TrackSample[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).normalize();
    // Left-hand normal on the ground.
    const n = new THREE.Vector3(-t.z, 0, t.x);
    samples.push({ p, t, n, curv: 0 });
  }
  // Signed curvature from the turn between neighbouring tangents.
  for (let i = 0; i < N; i++) {
    const a = samples[(i - 3 + N) % N].t, b = samples[(i + 3) % N].t;
    const ang = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
    samples[i].curv = ang / ((6 / N) * length);
  }
  const xs = samples.map((s) => s.p.x), zs = samples.map((s) => s.p.z);
  const centre: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const radius = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
  const track = { def, curve, length, samples, N, centre, radius, halfWidth: def.halfWidth ?? TRACK_HALF_WIDTH };
  built.set(def.id, track);
  return track;
}

/** Where a distance along the circuit and an offset across it put you: position, heading and the curve there. */
export function trackPose(track: Track, dist: number, offset: number) {
  const L = track.length;
  const s = ((dist % L) + L) % L;
  const f = (s / L) * track.N;
  const i = Math.floor(f) % track.N, j = (i + 1) % track.N, k = f - Math.floor(f);
  const A = track.samples[i], B = track.samples[j];
  const p = A.p.clone().lerp(B.p, k);
  const t = A.t.clone().lerp(B.t, k).normalize();
  const n = new THREE.Vector3(-t.z, 0, t.x);
  p.addScaledVector(n, offset);
  return { p, t, yaw: Math.atan2(t.x, t.z), curv: A.curv + (B.curv - A.curv) * k };
}

// ---------------------------------------------------------------- driving

/** The stages a car has had in the tuning garage (0 to 3 each). */
export interface Tune { engine: number; turbo: number; tyres: number }
export const NO_TUNE: Tune = { engine: 0, turbo: 0, tyres: 0 };
export interface TunePart { id: keyof Tune; name: string; icon: string; stat: string; blurb: string; stages: string[]; costPct: number[]; boost: number[] }
export const TUNE_PARTS = TUNING.parts as TunePart[];
/** The total gain (%) a part gives at a stage. */
export const tuneBoost = (part: keyof Tune, stage: number) => (stage > 0 ? TUNE_PARTS.find((p) => p.id === part)?.boost[Math.min(3, stage) - 1] ?? 0 : 0);
/** What the next stage costs for this car (null at the top stage): the same sum as car_tune_cost() on the server. */
export function tuneCost(carId: string, part: keyof Tune, stage: number): number | null {
  const p = TUNE_PARTS.find((x) => x.id === part), c = carOf(carId);
  if (!p || !c || stage >= 3) return null;
  return Math.max(TUNING.minCost, Math.round((c.price * p.costPct[stage]) / 100 / 100) * 100);
}

export interface CarPerf { top: number; accel: number; grip: number }
/** How a car drives here (m/s, m/s²): its real top speed (a little less on a circuit), and acceleration and grip
    by kind: a supercar pulls hardest and holds the corners best. The tuning garage adds to each (engine → top speed,
    turbo → acceleration, tyres → grip). */
export function perfOf(carId: string, tune?: Tune | null): CarPerf {
  const c = carOf(carId) as (Car & { model3d?: string }) | undefined;
  const kind = c?.model3d ?? "sedan";
  const top = ((c?.top ?? 190) / 3.6) * 0.82;
  const accel = kind === "supercar" ? 13.5 : (c?.top ?? 0) >= 290 ? 12 : kind === "sport-sedan" ? 9.5 : kind === "cybertruck" ? 10 : kind === "suv" ? 8.5 : 8;
  const grip = kind === "supercar" ? 1.25 : kind === "sport-sedan" ? 1.05 : kind === "suv" ? 0.85 : 0.95;
  const t = tune ?? NO_TUNE;
  return {
    top: top * (1 + tuneBoost("engine", t.engine) / 100),
    accel: accel * (1 + tuneBoost("turbo", t.turbo) / 100),
    grip: grip * (1 + tuneBoost("tyres", t.tyres) / 100),
  };
}

export interface DriveState { dist: number; offset: number; speed: number; drift: number; wall: number; /** Sliding sideways (m/s, + to the right). */ slip?: number }
export interface DriveInput { throttle: number; brake: number; steer: number }

/** How hard a car or bike can corner (m/s²): its grip × g (about 1.4 g for a supercar, 1.1 g for a family car), less off
    the tarmac. Above it the tyres give up. */
export const cornerGrip = (perf: CarPerf, off = false) => perf.grip * 9.81 * 1.15 * (off ? 0.55 : 1);

/** One step of driving: speed from throttle, brake and drag; steering across the track. Following a bend takes v²κ of
    grip: within the tyres' grip the car holds its line (with a gentle push wide near the limit, so you feel it coming);
    beyond it the car slides to the outside, scrubs speed and steers less, until you slow down. So you brake before
    the bend and power out of it. Off the tarmac is slow and slippery; the walls bounce you off and slow you, without
    stopping you dead. */
/** Tuning for how a slide plays out (exported so the sums can be tried in a simulation). */
export const SLIDE = { push: 2.5, scrub: 0.65, offDrag: 9 };
export function step(track: Track, s: DriveState, input: DriveInput, perf: CarPerf, dt: number): DriveState {
  let { speed, offset } = s;
  let slip = s.slip ?? 0;
  const pose = trackPose(track, s.dist, offset);
  const off = Math.abs(offset) > track.halfWidth;
  const top = off ? Math.min(perf.top, 22) : perf.top;
  if (input.throttle > 0) speed += perf.accel * input.throttle * Math.max(0, 1 - speed / top) * dt;
  if (input.brake > 0) speed -= 20 * input.brake * dt;
  speed -= (1.2 + speed * speed * 0.0006 + (off ? SLIDE.offDrag : 0)) * dt;
  // The bend: what following it takes, against what the tyres can give.
  const grip = cornerGrip(perf, off);
  const need = speed * speed * Math.abs(pose.curv);
  const excess = Math.max(0, need - grip);
  const out = -Math.sign(pose.curv);
  slip += out * excess * SLIDE.push * dt;
  slip *= Math.exp(-(excess > 0 ? 0.7 : 4.5) * dt);
  speed -= excess * SLIDE.scrub * dt;
  speed = Math.max(0, speed);
  // Steering moves you across (faster means more of it per second, up to a point); less of it while sliding.
  const bite = (off ? 0.6 : 1) / (1 + (2 * excess) / grip);
  offset += (input.steer * Math.min(speed, 40) * 0.28 * bite + slip) * dt;
  offset += out * Math.pow(Math.min(1, need / grip), 3) * 1.1 * dt;
  const drift = Math.min(1, (excess + Math.abs(slip) * 2) / 8);
  let wall = 0;
  const W = track.halfWidth + WALL - TRACK_HALF_WIDTH;
  if (Math.abs(offset) > W) {
    offset = Math.sign(offset) * W;
    // A hit slows you once; scraping along it keeps slowing you.
    speed *= s.wall ? 1 - 1.2 * dt : 0.62;
    slip = -slip * 0.2;
    wall = 1;
  }
  return { dist: s.dist + speed * dt, offset, speed, drift, wall, slip };
}

/** The gear and engine speed for a road speed: seven gears, revving to 8,500. */
export function gearbox(speed: number, top: number) {
  const tops = [0.2, 0.33, 0.46, 0.59, 0.72, 0.86, 1.02].map((f) => f * top);
  let g = tops.findIndex((t) => speed < t * 0.97);
  if (g < 0) g = 6;
  const lo = g === 0 ? 0 : tops[g - 1] * 0.62;
  const rpm = 1000 + Math.max(0, Math.min(1, (speed - lo) / (tops[g] - lo))) * 7600;
  return { gear: g + 1, rpm };
}

// ---------------------------------------------------------------- horses, camels and superbikes

export type Sport = "car" | "bike" | "horse" | "camel";
export interface Mount {
  id: string; name: string; breed: string; blurb: string;
  /** Horses and camels: coat and mane colours. Superbikes: the paint. */
  coat?: string; mane?: string; color?: string;
  /** km/h flat out, m/s², and (horses and camels) seconds of pushing and how well it holds a line; (bikes) grip. */
  top: number; accel: number; stamina?: number; agility?: number; grip?: number;
}
export interface SportDef {
  id: Exclude<Sport, "car">; name: string; short: string; icon: string; venue: string; place: string; mapId: string;
  rider: "jockey" | "robot" | "rider"; laps: number[]; pick: string; tagline: string; blurb: string; gradient: string; accent: string; mounts: Mount[];
}
/** The sports raced on a mount from the venue's stable or paddock (src/data/racing/sports.json). */
export const SPORTS = SPORTS_DATA.sports as SportDef[];
export const sportDef = (id?: string | null) => SPORTS.find((s) => s.id === id);
export const mountOf = (sport: string | null | undefined, id: string | null | undefined) => sportDef(sport)?.mounts.find((m) => m.id === id);
/** Ridden like a car: a superbike's top speed (a little less on a circuit), acceleration and grip. */
export function bikePerf(id?: string | null): CarPerf {
  const m = mountOf("bike", id) ?? SPORTS.find((s) => s.id === "bike")!.mounts[0];
  return { top: (m.top / 3.6) * 0.82, accel: m.accel, grip: m.grip ?? 1 };
}

export interface RidePerf { top: number; accel: number; stamina: number; agility: number }
export const ridePerf = (sport: string | null | undefined, id?: string | null): RidePerf => {
  const m = mountOf(sport, id) ?? sportDef(sport)?.mounts[0];
  return { top: (m?.top ?? 60) / 3.6, accel: m?.accel ?? 5, stamina: m?.stamina ?? 40, agility: m?.agility ?? 1 };
};
export interface RideState extends DriveState { /** 0 (spent) to 1 (fresh). */ stamina: number; /** Spent: it can only canter until it gets its breath back. */ tired: boolean }
/** Pushing one: hold it (throttle) to go flat out, which uses stamina; let it go to cruise (getting a little breath
    back); ease it (brake) to save it. Spent, it can only canter until it recovers a third. In the slipstream of another
    runner (draft 0 to 1) it goes a touch faster and tires less. The bends push it wide (less with agility), and the
    inside line is shorter: hugging the rail saves ground. The rails slow it if you lean on them. */
export function stride(track: Track, s: RideState, input: DriveInput, m: RidePerf, dt: number, draft = 0): RideState {
  let { speed, offset, stamina, tired } = s;
  const pose = trackPose(track, s.dist, offset);
  const push = input.throttle > 0 && !tired, ease = input.brake > 0;
  const top = m.top * (1 + 0.03 * draft);
  const target = tired ? top * 0.62 : push ? top : ease ? top * 0.7 : top * 0.86;
  const dv = target - speed;
  speed += dv > 0 ? Math.min(dv, m.accel * dt * Math.max(0.25, 1 - (0.6 * speed) / top)) : Math.max(dv, -3 * dt);
  const per = dt / m.stamina;
  if (push) stamina -= per * (1 - 0.35 * draft);
  else stamina += per * (tired ? 0.3 : ease ? 0.55 : 0.12);
  if (stamina <= 0) { stamina = 0; tired = true; }
  if (tired && stamina >= 0.3) tired = false;
  stamina = Math.min(1, stamina);
  offset += input.steer * Math.min(speed, 14) * 0.45 * m.agility * dt;
  offset -= ((speed * speed * pose.curv) / (4 * m.agility)) * dt;
  let wall = 0;
  const W = track.halfWidth - 0.8;
  if (Math.abs(offset) > W) { offset = Math.sign(offset) * W; speed -= speed * 1.5 * dt; wall = 1; }
  const lane = Math.min(1.15, Math.max(0.85, 1 - offset * pose.curv));
  return { dist: s.dist + (speed * dt) / lane, offset, speed, drift: 0, wall, stamina, tired };
}

// ---------------------------------------------------------------- races

export type PrizeMode = "winner" | "top3";
export interface Racer { id: string; username: string; look: AvatarLookProps | null; /** Horses, camels and bikes: what they ride (Mount id); car is then empty. */ mount?: string | null; car: string; /** Its paint (null: factory). */ color?: string | null; plate: string | null; finishMs: number | null; place: number | null; prize?: number | null; /** Its tuning-garage stages. */ tune?: Tune | null }
export interface RaceView {
  code: string; hostId: string; host: string; laps: number; /** car (absent), bike, horse or camel. */ sport?: Sport; /** The track (ALL_TRACKS). */ track?: string; max: number; status: "lobby" | "racing" | "done" | "cancelled"; startsAt: string | null; now: string; racers: Racer[];
  /** What each driver pays to join, the split, and the pot so far (all of it paid out). */
  entryFee: number; prizeMode: PrizeMode; pot: number; split: number[];
}
export interface OpenRace { code: string; host: string; look: AvatarLookProps | null; laps: number; sport?: Sport; track?: string; status: string; racers: number; max: number; entryFee: number; prizeMode: PrizeMode; pot: number }
export interface RaceCar { id: number; car: string; plate: string | null; color?: string | null; tune?: Tune | null }

const ERR: Record<string, string> = {
  no_car: "You need a car of your own (not impounded) to race. Get one from a dealer on Sheikh Zayed Road.",
  race_full: "This race is full.",
  race_started: "This race has already started.",
  need_two: "You need at least one other driver to start.",
  not_host: "Only the host can start the race.",
  no_race: "That race doesn't exist any more.",
  insufficient_funds: "You don't have enough for the entry fee.",
  bad_fee: "Pick one of the entry fees.",
  bad_track: "Pick one of the tracks.",
  bad_mount: "Pick one from the stable.",
  bad_sport: "That's not a race you can ride in.",
  wrong_sport: "That race is for a different sport.",
};
const friendly = (m: string) => ERR[Object.keys(ERR).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}
export const myRaceCars = () => call<RaceCar[]>("my_race_cars", {});
export const openRaces = () => call<OpenRace[]>("open_races", {});
export const createRace = (car: number, laps: number, fee: number, mode: PrizeMode, track: string = DEFAULT_TRACK) => call<string>("create_race", { p_car: car, p_laps: laps, p_fee: fee, p_mode: mode, p_track: track });
export const joinRace = (code: string, car: number) => call<null>("join_race", { p_code: code, p_car: car });
/** Horses, camels and superbikes: open a race on a mount from the stable, or join one (or change mount) with one. */
export const createSportRace = (sport: Exclude<Sport, "car">, mount: string, laps: number, fee: number, mode: PrizeMode, track: string) =>
  call<string>("create_sport_race", { p_sport: sport, p_mount: mount, p_laps: laps, p_fee: fee, p_mode: mode, p_track: track });
export const joinSportRace = (code: string, mount: string) => call<null>("join_sport_race", { p_code: code, p_mount: mount });
/** My friends to invite to a horse, camel or bike race (no car needed). */
export const raceFriends = () => call<{ id: string; username: string; look: AvatarLookProps | null; online: boolean; car: string | null }[]>("race_friends", {});
export const leaveRace = (code: string) => call<null>("leave_race", { p_code: code });
export const startRace = (code: string) => call<string>("start_race", { p_code: code });
export const finishRace = (code: string, ms: number) => call<number>("finish_race", { p_code: code, p_ms: Math.round(ms) });
export const raceView = (code: string) => call<RaceView | null>("race_view", { p_code: code });
export const friendsWithCars = () => call<{ id: string; username: string; look: AvatarLookProps | null; online: boolean; car: string | null }[]>("friends_with_cars", {});

/** "1:23.4" */
export const lapTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;

/** What each place wins from the pot: winner takes all, or the 1st/2nd/3rd split (a share nobody claims goes to 1st). */
export function prizesFor(pot: number, mode: PrizeMode, split: number[], cars: number): number[] {
  if (mode === "winner") return [pot];
  const places = Math.max(1, Math.min(3, cars));
  const shares = split.slice(0, places).map((p) => Math.floor((pot * p) / 100));
  shares[0] += pot - shares.reduce((a, b) => a + b, 0);
  return shares;
}
