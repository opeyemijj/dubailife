"use client";

// Dubai Autodrome (src/app/autodrome): the circuit, how each car drives on it, and the races (lobby, start, finish:
// supabase/migrations/*_autodrome.sql). Up to 10 cars, an entry fee each and prizes from the pot (src/data/autodrome/entry.json). During a race, positions go player to player on the Realtime
// channel race:<code>, three times a second with a few cars and once a second with a full grid; between updates each
// car carries on along the track at its last speed, so it moves smoothly without flooding the channel.

import * as THREE from "three";
import { supabase } from "@/lib/supabase/client";
import { carOf, type Car } from "@/lib/cars";
import type { AvatarLookProps } from "@/components/avatar/roster";

// ---------------------------------------------------------------- the circuit

/** The circuit's centre line (metres, x/z), clockwise from the start line on the main straight: a long straight,
    a hairpin, the esses, a sweeper and the back straight. About 2.9 km. */
const POINTS: [number, number][] = [
  [0, 0], [220, 0], [440, 0], [600, 10], [680, 80], [690, 190], [630, 270], [520, 290], [430, 340], [410, 440],
  [470, 540], [450, 640], [340, 690], [200, 660], [120, 560], [40, 470], [-90, 450], [-200, 380], [-240, 260],
  [-190, 150], [-230, 60], [-160, 0],
];
export const TRACK_HALF_WIDTH = 9;
const WALL = 16;

export interface TrackSample { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; curv: number }
export const TRACK = (() => {
  const curve = new THREE.CatmullRomCurve3(POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
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
  return { curve, length, samples, N };
})();

/** Where a distance along the circuit and an offset across it put you: position, heading and the curve there. */
export function trackPose(dist: number, offset: number) {
  const L = TRACK.length;
  const s = ((dist % L) + L) % L;
  const f = (s / L) * TRACK.N;
  const i = Math.floor(f) % TRACK.N, j = (i + 1) % TRACK.N, k = f - Math.floor(f);
  const A = TRACK.samples[i], B = TRACK.samples[j];
  const p = A.p.clone().lerp(B.p, k);
  const t = A.t.clone().lerp(B.t, k).normalize();
  const n = new THREE.Vector3(-t.z, 0, t.x);
  p.addScaledVector(n, offset);
  return { p, t, yaw: Math.atan2(t.x, t.z), curv: A.curv + (B.curv - A.curv) * k };
}

// ---------------------------------------------------------------- driving

export interface CarPerf { top: number; accel: number; grip: number }
/** How a car drives here (m/s, m/s²): its real top speed (a little less on a circuit), and acceleration and grip
    by kind: a supercar pulls hardest and holds the corners best. */
export function perfOf(carId: string): CarPerf {
  const c = carOf(carId) as (Car & { model3d?: string }) | undefined;
  const kind = c?.model3d ?? "sedan";
  const top = ((c?.top ?? 190) / 3.6) * 0.82;
  const accel = kind === "supercar" ? 13.5 : (c?.top ?? 0) >= 290 ? 12 : kind === "sport-sedan" ? 9.5 : kind === "suv" ? 8.5 : 8;
  const grip = kind === "supercar" ? 1.25 : kind === "sport-sedan" ? 1.05 : kind === "suv" ? 0.85 : 0.95;
  return { top, accel, grip };
}

export interface DriveState { dist: number; offset: number; speed: number; drift: number; wall: number }
export interface DriveInput { throttle: number; brake: number; steer: number }

/** One step of driving: speed from throttle, brake and drag; steering across the track; the corners pushing you wide
    the faster you take them (more grip, less push); off the tarmac is slow, and the walls stop you. */
export function step(s: DriveState, input: DriveInput, perf: CarPerf, dt: number): DriveState {
  let { speed, offset } = s;
  const pose = trackPose(s.dist, offset);
  const off = Math.abs(offset) > TRACK_HALF_WIDTH;
  const top = off ? Math.min(perf.top, 22) : perf.top;
  if (input.throttle > 0) speed += perf.accel * input.throttle * Math.max(0, 1 - speed / top) * dt;
  if (input.brake > 0) speed -= 20 * input.brake * dt;
  speed -= (1.2 + speed * speed * 0.0006 + (off ? 6 : 0)) * dt;
  speed = Math.max(0, speed);
  // Steering moves you across; faster means more of it per second, up to a point.
  offset += input.steer * Math.min(speed, 40) * 0.28 * dt;
  // Cornering: the curve pushes you to the outside, by speed² × curvature, less with grip.
  const push = speed * speed * pose.curv / (perf.grip * 9.5);
  offset -= push * dt * 0.9;
  const drift = Math.min(1, Math.abs(push) / 8);
  let wall = 0;
  if (Math.abs(offset) > WALL) { offset = Math.sign(offset) * WALL; speed *= 0.55; wall = 1; }
  return { dist: s.dist + speed * dt, offset, speed, drift, wall };
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

// ---------------------------------------------------------------- races

export type PrizeMode = "winner" | "top3";
export interface Racer { id: string; username: string; look: AvatarLookProps | null; car: string; plate: string | null; finishMs: number | null; place: number | null; prize?: number | null }
export interface RaceView {
  code: string; hostId: string; host: string; laps: number; max: number; status: "lobby" | "racing" | "done" | "cancelled"; startsAt: string | null; now: string; racers: Racer[];
  /** What each driver pays to join, the split, and the pot so far (all of it paid out). */
  entryFee: number; prizeMode: PrizeMode; pot: number; split: number[];
}
export interface OpenRace { code: string; host: string; look: AvatarLookProps | null; laps: number; status: string; racers: number; max: number; entryFee: number; prizeMode: PrizeMode; pot: number }
export interface RaceCar { id: number; car: string; plate: string | null }

const ERR: Record<string, string> = {
  no_car: "You need a car of your own (not impounded) to race. Get one from a dealer on Sheikh Zayed Road.",
  race_full: "This race is full.",
  race_started: "This race has already started.",
  need_two: "You need at least one other driver to start.",
  not_host: "Only the host can start the race.",
  no_race: "That race doesn't exist any more.",
  insufficient_funds: "You don't have enough for the entry fee.",
  bad_fee: "Pick one of the entry fees.",
};
const friendly = (m: string) => ERR[Object.keys(ERR).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}
export const myRaceCars = () => call<RaceCar[]>("my_race_cars", {});
export const openRaces = () => call<OpenRace[]>("open_races", {});
export const createRace = (car: number, laps: number, fee: number, mode: PrizeMode) => call<string>("create_race", { p_car: car, p_laps: laps, p_fee: fee, p_mode: mode });
export const joinRace = (code: string, car: number) => call<null>("join_race", { p_code: code, p_car: car });
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
