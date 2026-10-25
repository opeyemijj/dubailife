"use client";

// Rides acted out in 3D: the citizen climbs the tower, lies back and drops down the slide, spins down
// in a ring or raft, races the twin lane, floats the lazy river, jumps waves, surfs the FlowRider, swims
// laps, cannonballs and lounges on a float. Each kind of ride is a short script of steps (walk, climb, get
// ready, ride, splash, swim out). Speeds come from gravity along the real slide shape; the camera
// follows the rider. The on-screen controls (RideHUD) talk to this through rideIO.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CitizenAvatar, DEFAULT_LOOK, type AvatarAnimation, type BodyPose } from "@/components/avatar/CitizenAvatar";
import { OUTFITS, type AvatarLookProps } from "@/components/avatar/roster";
import type { Accessory, Product } from "@/lib/city/types";
import { HandHeldProp, ServedItem, serveKindOf, type ServeKind } from "../served";
import type { RideDef } from "@/lib/city/rides";
import { AquariumTunnel, BowlingBall, CityBelow, CourseBuoy, FlamingoFloat, GlassBridge, GlassCrack, GlassLift, Plinth, Steam, tunnelCreatureAt, JetSki, Microphone, Paddleboard, Pin, RingTube, SandCastle, SkatePenguin, SurfKite } from "../scenery";
import { BEACH, BOWLING, CLUB, DINING, LIFT_IN_USE, LOBBY, SHOPS, SPA, WAX_IN_USE, dubaiEvening, LANE_IN_USE, PIN_SPOTS, TOWER_TOP, WATERPARK, waveZ } from "./paths";
import { flash, rideIO, type Arrow, type RideResult } from "./rideIO";
import type { Track } from "./tracks";

/** A ride under way; `start` is where the citizen stood when it began. Remount the rig (key) per ride.
    `menu` is what a meal can be ordered from (what the citizen can afford). */
export interface ActiveRide { ride: RideDef; track: Track; key: number; start: [number, number]; menu?: Product[] }

type Prop = "ring" | "raft" | "float" | "board" | "jetski" | "sup" | "kiteboard" | "penguin" | null;
type Look = { anim: AvatarAnimation; pose?: BodyPose; body: "stand" | "lie" | "prone"; prop: Prop; shades?: boolean; hold?: "ball" | "mic"; carry?: "eat" | "drink"; mask?: boolean; recline?: number; headset?: boolean;
  /** Wearing an outfit other than their own (trying one on), or extra pieces (jewellery being tried). */
  wear?: string; acc?: Accessory[]; trolley?: number };
/** Someone else in the scene for a ride (a host, waiter, chef, dancer or fan): looks and what they do. */
type CastMember = { id: string; gender: "woman" | "man"; preset: string; anim: AvatarAnimation; pose?: BodyPose; hold?: ServeKind };
/** Bits of the scene a ride changes now and then (the next buoy, the castle's stage, the other player's pose,
    how the karaoke crowd is reacting). */
type Ui = {
  gate: number; castle: number; opp?: Look; crowd?: AvatarAnimation; cast?: CastMember[]; steamAt?: [number, number, number];
  /** Rides that go up: the lift's height, the city below (centred where), the bridge and its cracks. */
  liftY?: number; city?: [number, number]; bridge?: boolean; crackAt?: [number, number, number] | null;
  /** Shops: aisle signs, the demo screen's colour. */
  aisles?: boolean; screen?: string;
  /** The aquarium tunnel, the wax figures' plinths, and the VR world. */
  tunnel?: boolean; plinths?: Array<[number, number]>; vr?: boolean; dishes?: Array<{ id: string; kind: ServeKind; at: [number, number, number] }>; strobeAt?: number; shrimp?: boolean };
/** A live bowling pin: standing, or falling over (when, and which way). */
interface LivePin { x: number; z: number; down: boolean; gone: boolean; t: number; dir: number }
const G = 9.81;
/** Rides are shown a little slower than life so they can be enjoyed (a 30 m drop is over in seconds). */
const SLOW = 0.55;
const WALK = 1.6;
const GUESTS = [
  { gender: "woman" as const, preset: "Female_Adult_01" },
  { gender: "man" as const, preset: "Male_Adult_08" },
  { gender: "woman" as const, preset: "Female_Adult_05" },
];

interface Ctx {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  /** Extra spin of the rider about their own up axis (rings and rafts). */
  spin: number;
  /** Time in the current step, and since the ride proper started (-1 before). */
  t: number;
  rideStart: number;
  clock: number;
  speed: number;
  top: number;
  look: (l: Look) => void;
  splash: (at: THREE.Vector3, size: number, color?: string) => void;
  /** "side": from the side, away from the tower (riding and waiting at the top); "chase": from behind;
      "fixed": from `camAt` looking at `camLook` (a TV view of a court). */
  cam: "chase" | "side" | "fixed";
  camAt?: THREE.Vector3;
  camLook?: THREE.Vector3;
  ui: (u: Partial<Ui>) => void;
  /** The volleyball or bowling ball, when there is one in play. */
  ball?: THREE.Vector3;
  /** The pins on the player's bowling lane. */
  pins?: LivePin[];
  /** Where each cast member is (moved every frame), and the cast as shown. */
  actors: Record<string, { pos: THREE.Vector3; yaw: number }>;
  cast: CastMember[];
  /** Things that carry on alongside the script (a waiter walking back to the kitchen); done when they return true. */
  tasks: Array<(c: Ctx, dt: number) => boolean>;
  opp?: { pos: THREE.Vector3; quat: THREE.Quaternion; s: number; v: number; done: number };
  data: Record<string, number>;
}
interface Step { enter?: (c: Ctx) => void; update: (c: Ctx, dt: number) => boolean }

// ---------------------------------------------------------------- the cast (other people in a ride)

/** Adds or updates a cast member (where they are, how they look). */
function setCast(c: Ctx, m: CastMember, at?: THREE.Vector3, yaw?: number) {
  if (at) c.actors[m.id] = { pos: at.clone(), yaw: yaw ?? c.actors[m.id]?.yaw ?? 0 };
  else if (yaw !== undefined && c.actors[m.id]) c.actors[m.id].yaw = yaw;
  const i = c.cast.findIndex((x) => x.id === m.id);
  c.cast = i < 0 ? [...c.cast, m] : c.cast.map((x, k) => (k === i ? m : x));
  c.ui({ cast: c.cast });
}
const castLook = (c: Ctx, id: string, change: Partial<CastMember>) => {
  const m = c.cast.find((x) => x.id === id);
  if (m && (Object.keys(change) as Array<keyof CastMember>).some((k) => m[k] !== change[k])) setCast(c, { ...m, ...change });
};
/** Walks a cast member towards a point; true once there. */
function stepActor(c: Ctx, id: string, to: THREE.Vector3, speed: number, dt: number): boolean {
  const a = c.actors[id];
  if (!a) return true;
  const d = Math.hypot(to.x - a.pos.x, to.z - a.pos.z);
  if (d < 0.04) { castLook(c, id, { anim: "idle" }); return true; }
  castLook(c, id, { anim: "walk" });
  a.yaw = Math.atan2(to.x - a.pos.x, to.z - a.pos.z);
  const k = Math.min(1, (speed * dt) / d);
  a.pos.x += (to.x - a.pos.x) * k; a.pos.z += (to.z - a.pos.z) * k;
  return false;
}

// ---------------------------------------------------------------- frames and helpers

const UP = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const xAxis = new THREE.Vector3();
/** Orientation with +z along `fwd` and +y as close to `up` as possible. */
function frame(q: THREE.Quaternion, fwd: THREE.Vector3, up: THREE.Vector3) {
  const z = fwd.clone().normalize();
  const y = up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize();
  xAxis.crossVectors(y, z).normalize();
  m4.makeBasis(xAxis, y, z);
  q.setFromRotationMatrix(m4);
}
const yawQ = (q: THREE.Quaternion, yaw: number) => q.setFromAxisAngle(UP, yaw);
const flatYaw = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
const ease = (x: number) => x * x * (3 - 2 * x);
/** Turns the rider to face down the slide (feet first) before they lie back or sit in. */
const faceDownSlide = (c: { pos: THREE.Vector3; quat: THREE.Quaternion }, track: Track) => {
  const ahead = track.path!.getPointAt(Math.min(1, (track.startU ?? 0) + 0.06));
  yawQ(c.quat, flatYaw(c.pos, ahead));
};

/** Walks along a polyline (stairs included) at walking pace, facing the way they go. */
function walk(points: () => THREE.Vector3[], speed = WALK, anim: AvatarAnimation = "walk"): Step {
  let pts: THREE.Vector3[] = [];
  let i = 0;
  return {
    enter: (c) => { pts = [c.pos.clone(), ...points()]; i = 1; c.look({ anim, body: "stand", prop: null }); },
    update: (c, dt) => {
      let left = speed * dt;
      while (left > 0 && i < pts.length) {
        const to = pts[i];
        const d = c.pos.distanceTo(to);
        if (d > 1e-3) yawQ(c.quat, flatYaw(c.pos, to));
        if (d <= left) { c.pos.copy(to); left -= d; i++; } else { c.pos.lerp(to, left / d); left = 0; }
      }
      return i >= pts.length;
    },
  };
}

/** Waits (posed) for `seconds`, or until `until` says so. */
function wait(seconds: number, enter?: (c: Ctx) => void, tick?: (c: Ctx, dt: number) => void): Step {
  return { enter, update: (c, dt) => { tick?.(c, dt); return c.t >= seconds; } };
}

/**
 * Rides a curve under gravity: lying back feet first, sitting in a ring, or in the raft. The rider rests on
 * the bottom of the tube; rings and rafts spin as they go.
 */
function slide(track: Track, mode: "lie" | "ring" | "raft", ride: RideDef, opts: { v0?: () => number; formHold?: boolean } = {}): Step {
  const path = track.path!;
  const L = path.getLength();
  const R = track.radius ?? 0.34;
  let s = 0, v = 1.2, prevH = 0;
  const up = new THREE.Vector3(0, 1, 0);
  const scale = Math.sqrt((ride.realHeight ?? TOWER_TOP) / TOWER_TOP);
  const place = (u: number, pos: THREE.Vector3, quat: THREE.Quaternion, upRef: THREE.Vector3, lift: number) => {
    const p = path.getPointAt(Math.min(u, 1));
    const tan = path.getTangentAt(Math.min(u, 1));
    const flatUp = UP.clone().sub(tan.clone().multiplyScalar(tan.y));
    if (flatUp.lengthSq() > 0.02) upRef.copy(flatUp.normalize());
    // Sitting riders sit upright-ish; lying riders follow the tube.
    frame(quat, mode === "lie" ? tan : new THREE.Vector3(tan.x, tan.y * 0.5, tan.z), upRef);
    pos.copy(p).addScaledVector(upRef, -R + lift);
  };
  // The sit clip puts the hips ~0.46 m above the feet; lying riders' backs are ~0.11 m below theirs.
  const lift = mode === "lie" ? 0.11 : -0.3;
  return {
    enter: (c) => {
      c.cam = "side";
      s = (track.startU ?? 0) * L; v = opts.v0?.() ?? 1.2; prevH = path.getPointAt(track.startU ?? 0).y;
      c.rideStart = c.clock; c.data.held = 0;
      c.look({ anim: mode === "lie" ? "sleep" : "sit", pose: mode === "lie" ? (opts.formHold ? "armsCrossed" : "armsUp") : "grip", body: mode === "lie" ? "lie" : "stand", prop: mode === "lie" ? null : mode });
      if (c.opp) { c.opp.s = 0; c.opp.v = 1.4 + Math.random() * 0.9; c.opp.done = 0; }
    },
    update: (c, dt) => {
      const u = s / L;
      const h = path.getPointAt(Math.min(u, 1)).y;
      v = Math.max(1.1, Math.sqrt(Math.max(0, v * v + 2 * G * (prevH - h) * 0.92)) * (1 - 0.05 * dt));
      prevH = h;
      s += v * dt * SLOW;
      place(s / L, c.pos, c.quat, up, lift);
      if (mode !== "lie") c.spin += dt * (mode === "raft" ? 1.6 : 2.6) * (0.4 + v / 8);
      if (opts.formHold && rideIO.input.down) c.data.held += dt;
      c.speed = v * scale * 3.6;
      c.top = Math.max(c.top, c.speed);
      rideIO.tele.progress = Math.min(1, s / L);
      // The other lane in a race.
      const o = c.opp;
      if (o && track.lane2 && !o.done) {
        const L2 = track.lane2.getLength();
        const h0 = track.lane2.getPointAt(Math.min(o.s / L2, 1)).y;
        o.s += o.v * dt * SLOW;
        const h1 = track.lane2.getPointAt(Math.min(o.s / L2, 1)).y;
        o.v = Math.max(1.1, Math.sqrt(Math.max(0, o.v * o.v + 2 * G * (h0 - h1) * 0.9)) * (1 - 0.05 * dt));
        const p = track.lane2.getPointAt(Math.min(o.s / L2, 1));
        const tan = track.lane2.getTangentAt(Math.min(o.s / L2, 1));
        frame(o.quat, tan, UP.clone().sub(tan.clone().multiplyScalar(tan.y)).lengthSq() > 0.02 ? UP.clone().sub(tan.clone().multiplyScalar(tan.y)) : new THREE.Vector3(0, 0, -1));
        o.pos.copy(p).addScaledVector(UP, -R + 0.11);
        if (o.s >= L2) o.done = c.clock - c.rideStart;
      }
      if (s >= L) c.data.endAt = c.clock;
      return s >= L;
    },
  };
}

/** Lands in the water with a splash. */
function splashDown(size = 1): Step {
  return {
    enter: (c) => { c.cam = "chase"; c.splash(c.pos.clone().setY(0.05), size); c.speed = 0; c.look({ anim: "swim", pose: "swim", body: "prone", prop: null }); flash(size > 2.5 ? "💦 SPLASH!" : "💦 Splash!"); },
    update: (c) => c.t > 0.5,
  };
}

/** Swims (face down, freestyle) to a point, then climbs out onto the side. */
function swimTo(to: () => [number, number], speed = 1.1): Step[] {
  let target = new THREE.Vector3();
  return [
    {
      enter: (c) => { const [x, z] = to(); target = new THREE.Vector3(x, 0, z); c.pos.y = 0; c.look({ anim: "swim", pose: "swim", body: "prone", prop: null }); },
      update: (c, dt) => {
        // Swim to the wall just inside the edge.
        const d = Math.hypot(target.x - c.pos.x, target.z - c.pos.z);
        if (d > 1e-3) yawQ(c.quat, flatYaw(c.pos, target));
        const step = Math.min(d, speed * dt);
        if (d > 0) { c.pos.x += ((target.x - c.pos.x) / d) * step; c.pos.z += ((target.z - c.pos.z) / d) * step; }
        // Feet lead the body's origin, so stop once the head reaches the wall.
        return d < 1.1;
      },
    },
    { enter: (c) => { c.pos.set(target.x, 0, target.z); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.25 },
  ];
}

/** A jump from the edge into the water: optionally tucked into a cannonball at the top. */
function jump(to: () => THREE.Vector3, apex: number, seconds: number, tuck: boolean): Step {
  let from = new THREE.Vector3();
  let dest = new THREE.Vector3();
  return {
    enter: (c) => { from = c.pos.clone(); dest = to(); c.data.tapsAtJump = rideIO.input.taps; c.data.tuckAt = -1; c.look({ anim: "idle", pose: tuck ? undefined : "armsUp", body: "stand", prop: null }); },
    update: (c) => {
      const k = Math.min(1, c.t / seconds);
      c.pos.lerpVectors(from, dest, k);
      c.pos.y = from.y + (dest.y - from.y) * k + apex * 4 * k * (1 - k);
      if (tuck && c.data.tuckAt < 0 && rideIO.input.taps > c.data.tapsAtJump) {
        c.data.tuckAt = k;
        c.look({ anim: "sit", pose: "tuck", body: "stand", prop: null });
      }
      return k >= 1;
    },
  };
}

// ---------------------------------------------------------------- the scripts

function script(ride: RideDef, track: Track, result: (r: RideResult) => void, menu: Product[] = [], gender: "woman" | "man" = "woman"): Step[] {
  const tele = rideIO.tele;
  const climb: Step[] = track.climb ? [
    { enter: (c) => { tele.phase = "Climbing the tower"; tele.prompt = ""; c.look({ anim: "walk", body: "stand", prop: null }); }, update: () => true },
    walk(() => track.climb!),
  ] : [];
  const exitWater = () => track.exit;
  const finishSwim = (extra: () => RideResult) => [
    ...swimTo(exitWater),
    { enter: () => { tele.phase = "Done"; tele.prompt = ""; result(extra()); }, update: () => false },
  ];
  const formStars = (form: number) => (form >= 0.85 ? 3 : form >= 0.5 ? 2 : 1);
  const timeStr = (s: number) => `${s.toFixed(1)} s`;
  const kmh = (n: number) => `${Math.round(n)} km/h`;

  switch (ride.kind) {
    case "drop":
    case "tube":
    case "raft": {
      const lie = ride.kind === "drop";
      const start = track.path!.getPointAt(track.startU ?? 0);
      return [
        ...climb,
        walk(() => [start.clone()]),
        wait(lie ? 2.6 : 2.2, (c) => {
          c.cam = "side";
          faceDownSlide(c, track);
          tele.phase = lie ? "Lie back, cross your arms…" : ride.kind === "raft" ? "Everyone in the raft!" : "Sit in the ring…";
          tele.prompt = lie ? "Hold to keep your arms crossed" : "";
          tele.holdButton = lie;
          c.look({ anim: lie ? "sleep" : "sit", pose: lie ? "armsCrossed" : "grip", body: lie ? "lie" : "stand", prop: lie ? null : ride.kind === "raft" ? "raft" : "ring" });
        }, (c) => { tele.countdown = Math.max(0, Math.ceil(2.2 - c.t)); }),
        { enter: () => { tele.countdown = 0; tele.phase = "Riding!"; }, update: () => true },
        slide(track, lie ? "lie" : ride.kind === "raft" ? "raft" : "ring", ride, { formHold: lie }),
        splashDown(lie ? 3 : 2),
        ...finishSwim(() => {
          const c = ctxRef.current!;
          const t = (c.data.endAt ?? c.clock) - c.rideStart;
          const form = lie ? Math.min(1, (c.data.held ?? 0) / Math.max(0.1, t)) : 1;
          return {
            rideId: ride.id, stars: lie ? formStars(form) : 3,
            stats: [{ label: "Top speed", value: kmh(c.top) }, { label: "Ride time", value: timeStr(t) }, ...(lie ? [{ label: "Form", value: `${Math.round(form * 100)}%` }] : [])],
            best: { value: Math.round(c.top), label: kmh(c.top) },
          };
        }),
      ];
    }
    case "capsule": {
      // The capsule stands beside the slide's first point; the floor drops into the tube below it.
      const capsule = track.path!.getPointAt(0).clone().add(new THREE.Vector3(0.35, 0, 0.55));
      const start = track.path!.getPointAt(track.startU ?? 0);
      return [
        ...climb,
        walk(() => [capsule.clone().setY(TOWER_TOP)]),
        wait(4, (c) => {
          c.cam = "side";
          tele.phase = "In the launch capsule…"; tele.prompt = "Hold to keep your arms crossed"; tele.holdButton = true;
          // Face out of the tower, towards the camera.
          if (track.centre) yawQ(c.quat, Math.atan2(c.pos.x - track.centre[0], c.pos.z - track.centre[1]));
          c.look({ anim: "idle", pose: "armsCrossed", body: "stand", prop: null });
        }, (c) => { tele.countdown = Math.max(0, Math.ceil(4 - c.t)); tele.bpm = Math.round(88 + c.t * 22 + Math.sin(c.t * 9) * 3); }),
        { enter: () => { tele.countdown = 0; tele.phase = "TRAPDOOR!"; flash("😱 The floor drops!"); }, update: (c, dt) => { c.pos.y -= dt * 4; c.pos.lerp(start, Math.min(1, dt * 6)); return c.t > 0.3; } },
        slide(track, "lie", ride, { formHold: true }),
        splashDown(3),
        ...finishSwim(() => {
          const c = ctxRef.current!;
          const t = (c.data.endAt ?? c.clock) - c.rideStart;
          const form = Math.min(1, (c.data.held ?? 0) / Math.max(0.1, t));
          return { rideId: ride.id, stars: formStars(form), stats: [{ label: "Top speed", value: kmh(c.top) }, { label: "Heart rate", value: `${tele.bpm} bpm` }, { label: "Form", value: `${Math.round(form * 100)}%` }], best: { value: Math.round(c.top), label: kmh(c.top) } };
        }),
      ];
    }
    case "race": {
      const start = track.path!.getPointAt(track.startU ?? 0);
      let push = 0;
      return [
        ...climb,
        walk(() => [start.clone()]),
        wait(2.6, (c) => {
          c.cam = "side";
          faceDownSlide(c, track);
          tele.phase = "Tap fast to push off!"; tele.prompt = "Tap to push off"; tele.holdButton = false;
          c.data.tapBase = rideIO.input.taps;
          c.look({ anim: "sleep", pose: "armsCrossed", body: "lie", prop: null });
        }, (c) => { tele.countdown = Math.max(0, Math.ceil(2.6 - c.t)); push = rideIO.input.taps - (c.data.tapBase ?? 0); tele.score = push; }),
        { enter: () => { tele.countdown = 0; tele.phase = "GO!"; tele.prompt = ""; flash(push >= 10 ? "🚀 Monster push!" : "Go!"); }, update: () => true },
        slide(track, "lie", ride, { v0: () => 1.2 + Math.min(push, 16) * 0.13 }),
        splashDown(3),
        ...finishSwim(() => {
          const c = ctxRef.current!;
          const mine = c.data.endAt - c.rideStart;
          const theirs = c.opp?.done || mine + 0.4 + Math.random();
          const won = mine <= theirs;
          return {
            rideId: ride.id, stars: won ? (push >= 10 ? 3 : 2) : 1, headline: won ? "🏆 You won the race!" : "😅 Beaten by a nose",
            stats: [{ label: "Your time", value: timeStr(mine) }, { label: "Other lane", value: timeStr(theirs) }, { label: "Top speed", value: kmh(c.top) }],
            best: { value: mine, label: timeStr(mine), lowerIsBetter: true },
          };
        }),
      ];
    }
    case "river": {
      const path = track.path!;
      const L = path.getLength();
      let s = 0;
      const MAX_LAPS = 2;
      return [
        {
          enter: (c) => {
            tele.phase = "Drifting down the river"; tele.prompt = ""; c.rideStart = c.clock;
            c.look({ anim: "sit", pose: "grip", body: "stand", prop: "ring" });
          },
          update: (c, dt) => {
            s += 0.75 * dt;
            const u = (s / L) % 1;
            const p = path.getPointAt(u);
            const tan = path.getTangentAt(u);
            frame(c.quat, new THREE.Vector3(tan.x, 0, tan.z), UP);
            c.pos.set(p.x, -0.28 + Math.sin(c.clock * 1.6) * 0.03, p.z);
            c.spin += dt * 0.25;
            tele.count = Math.floor(s / L);
            tele.progress = (s / L) / MAX_LAPS;
            c.speed = 0;
            return rideIO.input.exit || s >= L * MAX_LAPS;
          },
        },
        { enter: (c) => { c.spin = 0; c.pos.y = 0; c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.2 },
        walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
        { enter: () => {
          const laps = tele.count;
          result({ rideId: ride.id, stars: laps >= 2 ? 3 : laps >= 1 ? 2 : 1, stats: [{ label: "Laps", value: String(laps) }, { label: "Chill time", value: timeStr(ctxRef.current!.clock - ctxRef.current!.rideStart) }] });
        }, update: () => false },
      ];
    }
    case "waves": {
      const { at, d } = WATERPARK.wavePool;
      const into = track.path!.getPointAt(1);
      let airborne = -1, jumped = 0, waves = 0;
      const prevSide: number[] = [];
      return [
        walk(() => [into.clone()], 1.1),
        {
          enter: (c) => {
            tele.phase = "Jump each wave as it reaches you"; tele.prompt = "Tap to jump"; tele.holdButton = false;
            c.rideStart = c.clock; c.data.tapBase = rideIO.input.taps; yawQ(c.quat, Math.PI);
            c.look({ anim: "idle", pose: "balance", body: "stand", prop: null });
          },
          update: (c) => {
            // Jump when tapped: a jump lasts 0.7 s, then a moment to find your feet (so mashing doesn't work).
            const landed = c.data.landedAt ?? -9;
            if (rideIO.input.taps > c.data.tapBase) {
              if (airborne < 0 && c.clock - landed > 0.45) airborne = c.clock;
              c.data.tapBase = rideIO.input.taps;
            }
            const air = airborne >= 0 ? (c.clock - airborne) / 0.7 : -1;
            if (air >= 1) { airborne = -1; c.data.landedAt = c.clock; }
            c.pos.y = -0.85 + (air >= 0 && air < 1 ? 0.7 * 4 * air * (1 - air) : Math.sin(c.clock * 2) * 0.05);
            for (let i = 0; i < 3; i++) {
              const side = Math.sign(at[1] + waveZ(c.clock, i, d) - c.pos.z);
              if (prevSide[i] !== undefined && prevSide[i] < 0 && side > 0) {
                waves++;
                // Only a wave that passes under the middle of the jump is cleared.
                if (air >= 0.15 && air <= 0.85) { jumped++; flash("🌊 Cleared it!"); } else { flash("💦 Wave in the face!"); c.splash(c.pos.clone().setY(0.1), 0.8); }
              }
              prevSide[i] = side;
            }
            tele.score = jumped; tele.count = waves; tele.progress = waves / 8;
            return rideIO.input.exit || waves >= 8;
          },
        },
        { enter: (c) => { c.pos.y = 0; tele.prompt = ""; c.look({ anim: "walk", body: "stand", prop: null }); }, update: () => true },
        walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])], 1.1),
        { enter: () => result({ rideId: ride.id, stars: jumped >= 7 ? 3 : jumped >= 4 ? 2 : 1, stats: [{ label: "Waves jumped", value: `${jumped} / ${waves}` }], best: { value: jumped, label: `${jumped} waves` } }), update: () => false },
      ];
    }
    case "flowrider": {
      const { at, w, d } = track.water!;
      let x = 0, vx = 0, drift = 0, points = 0, wipeouts = 0, trickT = -1, down = -1, tricksSeen = 0;
      const slopeY = (z: number) => { const v = (d / 2 - z) / d; return 0.15 + Math.pow(Math.max(0, v), 2.2) * 1.6; };
      const DURATION = 30;
      return [
        walk(() => [new THREE.Vector3(at[0], 0.15, at[1] + d / 2 - 0.2)], 1.2),
        {
          enter: (c) => {
            tele.phase = "Keep your balance!"; tele.prompt = ""; c.rideStart = c.clock; tricksSeen = rideIO.input.tricks;
            yawQ(c.quat, Math.PI);
            c.look({ anim: "idle", pose: "balance", body: "stand", prop: "board" });
          },
          update: (c, dt) => {
            const time = c.clock - c.rideStart;
            if (down >= 0) {
              // Wiped out: tumble down the slope, then get back on.
              c.pos.z = Math.min(at[1] + d / 2 - 0.2, c.pos.z + dt * 2.5);
              c.pos.y = slopeY(c.pos.z - at[1]) + 0.05;
              if (c.clock - down > 1.6) { down = -1; x = 0; vx = 0; c.look({ anim: "idle", pose: "balance", body: "stand", prop: "board" }); }
            } else {
              // The water pushes the board off balance; steering fights it.
              drift += (Math.random() - 0.5) * dt * 3.2;
              drift = THREE.MathUtils.clamp(drift * (1 - dt * 0.4), -1.4, 1.4);
              vx += (drift - rideIO.input.steer * 2.4 - vx * 1.8) * dt * 2.2;
              x += vx * dt;
              tele.balance = THREE.MathUtils.clamp(x / (w / 2 - 0.3), -1, 1);
              if (Math.abs(tele.balance) >= 1) {
                wipeouts++; down = c.clock; drift = 0; flash("🌊 Wipeout!");
                c.look({ anim: "sleep", body: "lie", prop: null });
              } else {
                points += dt * (1 - Math.abs(tele.balance)) * 10;
                const z = at[1] + 0.2 + Math.sin(time * 0.7) * 0.6;
                c.pos.set(at[0] + x, slopeY(z - at[1]), z);
                if (rideIO.input.tricks > tricksSeen && trickT < 0) { tricksSeen = rideIO.input.tricks; trickT = c.clock; }
                if (trickT >= 0) {
                  const k = (c.clock - trickT) / 0.9;
                  c.spin = Math.PI * 2 * ease(Math.min(1, k));
                  if (k >= 1) { trickT = -1; c.spin = 0; if (Math.abs(tele.balance) < 0.6) { points += 25; flash("🤙 Trick landed! +25"); } else flash("Sketchy landing…"); }
                }
              }
            }
            c.data.lean = down >= 0 ? 0 : -tele.balance * 0.35;
            tele.score = Math.round(points); tele.count = wipeouts; tele.progress = time / DURATION; tele.time = time;
            return rideIO.input.exit || wipeouts >= 3 || time >= DURATION;
          },
        },
        { enter: (c) => { c.spin = 0; c.data.lean = 0; c.look({ anim: "walk", body: "stand", prop: null }); c.pos.y = 0; }, update: () => true },
        walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
        { enter: () => result({ rideId: ride.id, stars: points >= 200 ? 3 : points >= 100 ? 2 : 1, stats: [{ label: "Surf score", value: String(Math.round(points)) }, { label: "Wipeouts", value: String(wipeouts) }], best: { value: Math.round(points), label: `${Math.round(points)} pts` } }), update: () => false },
      ];
    }
    case "swim": {
      const path = track.path!;
      const a = path.getPointAt(0), b = path.getPointAt(1);
      let leg = 0, v = 0.6, lastTap = -1, taps = 0, perfect = 0;
      // From a beach you wade in; from a pool edge you dive.
      const getIn: Step[] = track.wade
        ? [walk(() => [a.clone().setY(0)], 1.0), splashDown(0.5)]
        : [jump(() => a.clone().setY(0), 0.5, 0.6, false), splashDown(1)];
      return [
        ...getIn,
        {
          enter: (c) => { tele.phase = track.wade ? "Swim out to the buoys and back" : "Swim a lap there and back"; tele.prompt = "Tap in rhythm to stroke"; tele.holdButton = false; c.rideStart = c.clock; taps = rideIO.input.taps; },
          update: (c, dt) => {
            // Each tap is a stroke; strokes 0.35–0.9 s apart are in rhythm and count double.
            if (rideIO.input.taps > taps) {
              taps = rideIO.input.taps;
              const gap = lastTap < 0 ? 0.6 : c.clock - lastTap;
              const good = gap > 0.35 && gap < 0.9;
              v += good ? 0.5 : 0.18;
              if (good) { perfect++; if (perfect % 4 === 0) flash("💪 Perfect rhythm!"); }
              lastTap = c.clock;
            }
            v = THREE.MathUtils.clamp(v - dt * 0.55, 0.35, 2.4);
            const to = leg === 0 ? b : a;
            const d = Math.hypot(to.x - c.pos.x, to.z - c.pos.z);
            yawQ(c.quat, flatYaw(c.pos, to));
            const step = Math.min(d, v * dt);
            c.pos.x += ((to.x - c.pos.x) / Math.max(d, 1e-3)) * step;
            c.pos.z += ((to.z - c.pos.z) / Math.max(d, 1e-3)) * step;
            // Turn at the wall once the head reaches it (the body's origin is at the feet).
            if (d < 1.2) { if (leg === 0) { leg = 1; flash("↩️ Tumble turn!"); c.splash(c.pos.clone(), 0.6); } else return true; }
            c.speed = v * 3.6; c.top = Math.max(c.top, c.speed);
            tele.progress = (leg + (1 - d / a.distanceTo(b))) / 2;
            return false;
          },
        },
        { enter: (c) => { c.data.endAt = c.clock; tele.prompt = ""; }, update: () => true },
        ...finishSwim(() => {
          const c = ctxRef.current!;
          const t = c.data.endAt - c.rideStart;
          const par = a.distanceTo(b) * 1.4;
          return { rideId: ride.id, stars: t < par ? 3 : t < par * 1.5 ? 2 : 1, stats: [{ label: track.wade ? "There and back" : "Lap time", value: timeStr(t) }, { label: "Strokes in rhythm", value: String(perfect) }], best: { value: t, label: timeStr(t), lowerIsBetter: true } };
        }),
      ];
    }
    case "cannonball": {
      const water = track.water!;
      const edge = new THREE.Vector3(water.at[0], 0, water.at[1] + water.d / 2 + 0.1);
      const into = new THREE.Vector3(water.at[0], 0, water.at[1] + water.d / 2 - 1.5);
      let size = 1;
      return [
        walk(() => [new THREE.Vector3(water.at[0], 0, water.at[1] + water.d / 2 + 1.6)]),
        wait(1.2, (c) => { tele.phase = "Run, jump… tuck at the top!"; tele.prompt = "Tap to tuck"; tele.holdButton = false; yawQ(c.quat, Math.PI); c.look({ anim: "idle", body: "stand", prop: null }); }),
        walk(() => [edge.clone()], 3.4),
        { enter: (c) => { c.rideStart = c.clock; }, update: () => true },
        jump(() => into.clone(), 1.5, 1.1, true),
        {
          enter: (c) => {
            // A tuck right at the top of the jump makes the biggest splash.
            const at = c.data.tuckAt;
            const q = at < 0 ? 0 : Math.max(0, 1 - Math.abs(at - 0.5) / 0.45);
            size = 0.8 + q * 4.2;
            c.data.quality = q;
            tele.prompt = "";
          },
          update: () => true,
        },
        { enter: (c) => { c.splash(c.pos.clone().setY(0.05), size); flash(size > 4 ? "🌊 MEGA SPLASH!" : size > 2.5 ? "💦 Big splash!" : "💧 Little splash"); c.look({ anim: "swim", pose: "swim", body: "prone", prop: null }); c.pos.y = 0; }, update: (c) => c.t > 0.7 },
        ...finishSwim(() => ({
          rideId: ride.id, stars: size > 4 ? 3 : size > 2.5 ? 2 : 1,
          stats: [{ label: "Splash height", value: `${size.toFixed(1)} m` }, { label: "Tuck timing", value: `${Math.round((ctxRef.current!.data.quality ?? 0) * 100)}%` }],
          best: { value: Math.round(size * 10) / 10, label: `${size.toFixed(1)} m` },
        })),
      ];
    }
    case "float": {
      const water = track.water!;
      const into = track.path!.getPointAt(0);
      const MAX = 40;
      return [
        jump(() => into.clone().setY(0.25), 0.3, 0.5, false),
        {
          enter: (c) => { tele.phase = "Floating… pure bliss"; tele.prompt = ""; c.rideStart = c.clock; c.look({ anim: "sleep", body: "lie", prop: "float" }); },
          update: (c, dt) => {
            const t = c.clock - c.rideStart;
            // A slow figure-of-eight drift around the pool.
            const x = water.at[0] + Math.sin(t * 0.18) * (water.w / 2 - 1.4);
            const z = water.at[1] + Math.sin(t * 0.36) * (water.d / 2 - 1.1);
            const tx = Math.cos(t * 0.18) * 0.18 * (water.w / 2 - 1.4), tz = Math.cos(t * 0.36) * 0.36 * (water.d / 2 - 1.1);
            c.pos.set(x, 0.25 + Math.sin(t * 1.3) * 0.03, z);
            frame(c.quat, new THREE.Vector3(tx, 0, tz).normalize(), UP);
            c.spin += dt * 0.1;
            tele.progress = t / MAX; tele.time = t;
            return rideIO.input.exit || t >= MAX;
          },
        },
        { enter: (c) => { c.spin = 0; c.pos.y = 0; }, update: () => true },
        ...finishSwim(() => ({ rideId: ride.id, stars: 3, stats: [{ label: "Time afloat", value: timeStr(ctxRef.current!.clock - ctxRef.current!.rideStart) }] })),
      ];
    }
    case "sunbathe": return sunbathe(ride, track, result);
    case "jetski":
    case "paddle": return drive(ride, track, result);
    case "kitesurf": return kitesurf(ride, track, result);
    case "volleyball": return volleyball(ride, track, result);
    case "sandcastle": return sandcastle(ride, track, result);
    case "skate": return skate(ride, track, result);
    case "spin": return figureSpin(ride, track, result);
    case "bowling": return bowling(ride, track, result);
    case "karaoke": return karaoke(ride, track, result);
    case "danceoff": return danceOff(ride, track, result);
    case "dj": return djSet(ride, track, result);
    case "meal": return meal(ride, track, result, menu);
    case "chefshow": return chefShow(ride, track, result);
    case "treatment": return treatment(ride, track, result);
    case "sauna": return sauna(ride, track, result);
    case "plunge": return plunge(ride, track, result);
    case "jacuzzi": return jacuzzi(ride, track, result);
    case "facemask": return faceMask(ride, track, result);
    case "observe": return observe(ride, track, result);
    case "glassbridge": return glassBridge(ride, track, result);
    case "tunnel": return aquariumTunnel(ride, track, result);
    case "waxselfie": return waxSelfies(ride, track, result);
    case "vrdrop": return vrDrop(ride, track, result);
    case "stylist": return styleChallenge(ride, track, result, gender);
    case "trolley": return trolleyDash(ride, track, result, menu);
    case "perfume": return perfumeTest(ride, track, result);
    case "jewelguess": return jewelGuess(ride, track, result, menu);
    case "techdemo": return techDemo(ride, track, result);
  }
}

// ---------------------------------------------------------------- beach scripts

const secs = (s: number) => `${s.toFixed(1)} s`;
/** How far a lounger's sunbather is tilted head-up, onto the backrest (radians). */
const LOUNGER_RECLINE = 0.22;

/** Shades on, lie back on the lounger; turn over halfway or burn. */
function sunbathe(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const lie = track.lie!;
  const feet = new THREE.Vector3(...lie.feet);
  let tan = 0, turned = false, burnt = false, taps = 0;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    {
      enter: (c) => {
        c.pos.copy(feet); yawQ(c.quat, lie.yaw); c.rideStart = c.clock; taps = rideIO.input.taps;
        tele.phase = "Soaking up the sun…"; tele.prompt = ""; tele.holdButton = false;
        c.look({ anim: "sleep", body: "lie", prop: null, shades: true, recline: LOUNGER_RECLINE });
      },
      update: (c, dt) => {
        tan = Math.min(100, tan + dt * 5);
        tele.score = Math.round(tan); tele.progress = tan / 100;
        if (!turned && tan >= 40) {
          tele.phase = tan < 60 ? "Turn over now!" : "Turn over — you're burning!";
          tele.prompt = "Turn over";
          if (rideIO.input.taps > taps) {
            turned = true; tele.prompt = ""; tele.phase = "Tanning your back…";
            flash(tan <= 60 ? "😎 Perfect timing!" : "😬 A bit pink…");
            if (tan > 60) burnt = true;
            // Face down, head still on the backrest end.
            yawQ(c.quat, lie.yaw + Math.PI);
            c.pos.copy(feet).setY(feet.y + 0.02);
            c.look({ anim: "sleep", body: "prone", prop: null, shades: true });
          }
          if (tan >= 70 && !burnt) { burnt = true; flash("🔥 Sunburn!"); }
        }
        return rideIO.input.exit || tan >= 100;
      },
    },
    { enter: (c) => { c.pos.set(track.exit[0], 0, track.exit[1]); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.3 },
    { enter: (c) => result({
      rideId: ride.id, stars: turned && !burnt ? 3 : turned ? 2 : 1, headline: burnt ? "🦞 Sunburnt!" : tan >= 100 ? "😎 Golden tan!" : undefined,
      stats: [{ label: "Tan", value: `${Math.round(tan)}%` }, { label: "Turned over", value: turned ? "Yes" : "No" }, { label: "Time", value: secs(c.clock - c.rideStart) }],
    }), update: () => false },
  ];
}

/** Jet ski slalom or paddleboard course: steer round the buoys in order, then back to the beach. */
function drive(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const ski = ride.kind === "jetski";
  const gates = (track.gates ?? []).map(([x, z]) => new THREE.Vector3(x, 0, z));
  const home = new THREE.Vector3(track.start![0], 0, track.start![1]);
  const { shore } = BEACH;
  let heading = Math.PI, speed = 0, idx = 0, hit = 0, lastTap = -1, taps = 0, lastSpray = 0, done = false;
  return [
    walk(() => [home.clone()], 1.2),
    {
      enter: (c) => {
        c.rideStart = c.clock; c.cam = "chase"; taps = rideIO.input.taps;
        heading = flatYaw(c.pos, gates[0] ?? home);
        tele.phase = ski ? "Steer through the gates!" : "Paddle round the buoys"; tele.prompt = ski ? "" : "Tap to paddle"; tele.holdButton = false;
        c.look(ski ? { anim: "sit", pose: "grip", body: "stand", prop: "jetski" } : { anim: "idle", pose: "grip", body: "stand", prop: "sup" });
        c.ui({ gate: 0 });
      },
      update: (c, dt) => {
        // Steering: ← turns left, → right.
        heading -= rideIO.input.steer * (ski ? 1.5 : 1.2) * dt;
        if (ski) speed = Math.min(6.5, speed + dt * 3);
        else {
          // Each paddle stroke pushes; strokes in rhythm push harder.
          if (rideIO.input.taps > taps) {
            taps = rideIO.input.taps;
            const gap = lastTap < 0 ? 0.7 : c.clock - lastTap;
            speed = Math.min(2.4, speed + (gap > 0.4 && gap < 1.1 ? 0.55 : 0.25));
            lastTap = c.clock;
          }
          speed = Math.max(0, speed - dt * 0.35);
        }
        const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
        c.pos.addScaledVector(fwd, speed * dt);
        // Stay at sea: out of the beach, inside the zone.
        if (c.pos.z > shore - 0.5 && fwd.z > 0 && idx < gates.length) { c.pos.z = shore - 0.5; speed *= 0.5; }
        c.pos.x = THREE.MathUtils.clamp(c.pos.x, -10.5, 10.5);
        c.pos.z = Math.max(c.pos.z, -28);
        c.pos.y = ski ? 0.16 + Math.sin(c.clock * 5) * 0.03 * Math.min(1, speed / 4) : 0.12 + Math.sin(c.clock * 1.6) * 0.03;
        yawQ(c.quat, heading);
        // Spray behind a moving jet ski.
        if (ski && speed > 3 && c.clock - lastSpray > 0.22) { lastSpray = c.clock; c.splash(c.pos.clone().addScaledVector(fwd, -1).setY(0.05), 0.5); }
        // Gates in order (one missed is skipped when you reach the next).
        const g = gates[idx];
        if (g) {
          if (c.pos.distanceTo(g.clone().setY(c.pos.y)) < (ski ? 1.8 : 1.5)) { idx++; hit++; flash(`✅ Buoy ${hit}/${gates.length}`); c.ui({ gate: idx }); }
          else if (gates[idx + 1] && c.pos.distanceTo(gates[idx + 1].clone().setY(c.pos.y)) < 1.6) { idx += 2; hit++; flash("❌ Missed one!"); c.ui({ gate: idx }); }
          if (idx >= gates.length) { tele.phase = "Back to the beach!"; flash("🏁 Head back to the beach"); }
        } else if (c.pos.distanceTo(home.clone().setY(c.pos.y)) < 1.6 || c.pos.z > shore - 0.6) {
          done = true;
        }
        // The scene is small: speeds read as the real thing (a jet ski does about 70 km/h).
        c.speed = speed * 3.6 * (ski ? 3 : 1);
        c.top = Math.max(c.top, c.speed);
        tele.score = hit; tele.count = gates.length; tele.progress = idx / Math.max(1, gates.length);
        return done || rideIO.input.exit;
      },
    },
    { enter: (c) => { c.data.endAt = c.clock; c.speed = 0; c.pos.y = 0; tele.prompt = ""; c.look({ anim: "walk", body: "stand", prop: null }); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: (c) => {
      const t = c.data.endAt - c.rideStart;
      result({
        rideId: ride.id, stars: hit === gates.length ? (t < (ski ? 24 : 40) ? 3 : 2) : 1,
        stats: [{ label: "Buoys", value: `${hit}/${gates.length}` }, { label: "Time", value: secs(t) }, ...(ski ? [{ label: "Top speed", value: `${Math.round(c.top)} km/h` }] : [])],
        best: hit === gates.length ? { value: t, label: secs(t), lowerIsBetter: true } : undefined,
      });
    }, update: () => false },
  ];
}

/** Ride along under the kite; pop when the power peaks for a big jump, tap again in the air to spin. */
function kitesurf(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const DURATION = 30;
  const home = new THREE.Vector3(track.start![0], 0, track.start![1]);
  let dir = 1, x = 0, y = 0, vy = 0, air = false, spins = 0, spinT = -1, points = 0, jumps = 0, best = 0, taps = 0, crashT = -1, lastSpray = 0;
  const Z = -14.5, G2 = 9.81 * 0.55; // out past the parked jet skis
  return [
    walk(() => [home.clone()], 1.2),
    {
      enter: (c) => {
        c.rideStart = c.clock; c.cam = "chase"; taps = rideIO.input.taps; x = c.pos.x;
        c.data.lookUp = 2.2; c.data.camDist = 6.5; // pulled back and up, so the kite's in the shot
        tele.phase = "Pop when the power peaks!"; tele.prompt = "Tap to jump"; tele.holdButton = false;
        c.look({ anim: "idle", pose: "balance", body: "stand", prop: "kiteboard" });
      },
      update: (c, dt) => {
        const time = c.clock - c.rideStart;
        // Back and forth across the bay, turning at each end.
        x += dir * 5 * dt;
        if (Math.abs(x) > 8.5) { dir = -dir; x = Math.sign(x) * 8.5; }
        const z = THREE.MathUtils.lerp(home.z, Z, Math.min(1, time / 3));
        const power = (Math.sin(time * 2.1) + 1) / 2;
        tele.balance = power * 2 - 1;
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        if (crashT >= 0) {
          if (c.clock - crashT > 1.4) { crashT = -1; c.look({ anim: "idle", pose: "balance", body: "stand", prop: "kiteboard" }); }
        } else if (!air) {
          if (tapped) {
            // A pop right at peak power sends you highest.
            const h = 0.6 + power * power * 3.6;
            vy = Math.sqrt(2 * G2 * h); air = true; jumps++; spins = 0;
            best = Math.max(best, h);
            flash(h > 3.4 ? "🚀 Massive air!" : h > 2 ? "🪁 Nice pop!" : "Little hop");
            c.data.jumpH = h;
          }
        } else if (tapped && spinT < 0) {
          spinT = c.clock;
        }
        if (air) {
          y += vy * dt; vy -= G2 * dt;
          if (spinT >= 0) {
            const k = (c.clock - spinT) / 0.75;
            c.spin = Math.PI * 2 * ease(Math.min(1, k));
            if (k >= 1) { spins++; spinT = -1; c.spin = 0; }
          }
          if (y <= 0) {
            y = 0; air = false;
            if (spinT >= 0) { spinT = -1; c.spin = 0; crashT = c.clock; flash("💥 Crashed the landing!"); c.splash(c.pos.clone().setY(0.05), 1.4); c.look({ anim: "sleep", body: "lie", prop: null }); }
            else { const gained = Math.round((c.data.jumpH ?? 1) * 10 + spins * 25); points += gained; if (spins) flash(`🌀 ${spins} spin${spins > 1 ? "s" : ""}! +${gained}`); c.splash(c.pos.clone().setY(0.05), 0.8); }
          }
        }
        if (!air && crashT < 0 && c.clock - lastSpray > 0.3) { lastSpray = c.clock; c.splash(c.pos.clone().setY(0.05), 0.35); }
        c.pos.set(x, 0.12 + y, z);
        yawQ(c.quat, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        c.speed = 5 * 3.6 * 1.6; c.top = c.speed;
        tele.score = points; tele.count = jumps; tele.progress = time / DURATION; tele.time = time;
        return !air && (rideIO.input.exit || time >= DURATION);
      },
    },
    { enter: (c) => { c.spin = 0; c.speed = 0; c.pos.y = 0; tele.prompt = ""; c.look({ anim: "swim", pose: "swim", body: "prone", prop: null }); }, update: () => true },
    ...swimTo(() => track.exit),
    { enter: () => result({
      rideId: ride.id, stars: points >= 220 ? 3 : points >= 110 ? 2 : 1,
      stats: [{ label: "Points", value: String(points) }, { label: "Jumps", value: String(jumps) }, { label: "Biggest air", value: `${best.toFixed(1)} m` }],
      best: { value: points, label: `${points} pts` },
    }), update: () => false },
  ];
}

/** A rally match against a guest over the net: first to 5. Tap just as the ball reaches you. */
function volleyball(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const them = new THREE.Vector3(track.spots!.them![0], 0, track.spots!.them![1]);
  const netX = track.spots!.centre![0];
  const WIN = 5;
  type Flight = { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number; apex: number; toMe: boolean; spike: boolean };
  let fl: Flight | null = null, mine = 0, theirs = 0, taps = 0, pauseUntil = 0, serving: "me" | "them" = "me", hits = 0, spikes = 0, judged = false;
  // Arms go up for a hit and come back down once the ball's away (set once, not every frame).
  let myArms = false, theirArms = false;
  const arms = (c: Ctx, who: "me" | "them", up: boolean) => {
    if (who === "me" && myArms !== up) { myArms = up; c.look({ anim: "idle", pose: up ? "armsUp" : undefined, body: "stand", prop: null }); }
    if (who === "them" && theirArms !== up) { theirArms = up; c.ui({ opp: { anim: "idle", pose: up ? "armsUp" : undefined, body: "stand", prop: null } }); }
  };
  const ball = new THREE.Vector3();
  const launch = (c: Ctx, from: THREE.Vector3, toMe: boolean, spike: boolean) => {
    const lx = netX + (Math.random() - 0.5) * 4.4;
    const to = new THREE.Vector3(lx, 1.05, toMe ? me.z : them.z);
    fl = { from: from.clone().setY(2.1), to, t0: c.clock, dur: spike ? 0.8 : 1.25, apex: spike ? 2.8 : 3.7, toMe, spike };
    judged = false;
  };
  const point = (c: Ctx, forMe: boolean, why: string) => {
    if (forMe) mine++; else theirs++;
    flash(why);
    fl = null; pauseUntil = c.clock + 1.3; serving = forMe ? "me" : "them";
  };
  return [
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; c.ball = ball;
        // A TV view from the side of the court: both players and the net.
        c.cam = "fixed";
        c.camAt = new THREE.Vector3(netX + 7.5, 3.4, (me.z + them.z) / 2 + 1.2);
        c.camLook = new THREE.Vector3(netX, 1.2, (me.z + them.z) / 2);
        yawQ(c.quat, Math.PI);
        c.opp = { pos: them.clone().add(new THREE.Vector3(1.2, 0, 0)), quat: new THREE.Quaternion().setFromAxisAngle(UP, 0), s: 0, v: 0, done: 0 };
        c.ui({ opp: { anim: "idle", body: "stand", prop: null } });
        c.look({ anim: "idle", body: "stand", prop: null });
        tele.phase = "Your serve"; tele.prompt = "Tap to serve"; tele.holdButton = false;
      },
      update: (c, dt) => {
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        const o = c.opp!;
        if (!fl) {
          if (c.clock < pauseUntil) { ball.set(0, -5, 0); return false; }
          if (mine >= WIN || theirs >= WIN) return true;
          if (serving === "me") {
            tele.phase = "Your serve"; tele.prompt = "Tap to serve";
            ball.copy(c.pos).setY(2.1);
            if (tapped) { launch(c, c.pos, false, false); arms(c, "me", true); tele.prompt = ""; }
          } else {
            tele.phase = "Their serve…"; tele.prompt = "";
            ball.copy(o.pos).setY(2.1);
            if (c.clock > pauseUntil + 0.8) { launch(c, o.pos, true, false); arms(c, "them", true); }
          }
          return false;
        }
        const f: Flight = fl;
        const k = (c.clock - f.t0) / f.dur;
        ball.lerpVectors(f.from, f.to, Math.min(k, 1.4));
        ball.y = f.from.y + (f.to.y - f.from.y) * k + f.apex * 4 * k * (1 - k);
        // Whoever's receiving runs under it.
        const runner = f.toMe ? c.pos : o.pos;
        const dx = f.to.x - runner.x;
        runner.x += Math.sign(dx) * Math.min(Math.abs(dx), 3.2 * dt);
        if (f.toMe) {
          const left = (1 - k) * f.dur;
          tele.phase = left < 0.55 ? "NOW!" : "Get under it…"; tele.prompt = "Tap to hit";
          if (tapped && !judged) {
            judged = true;
            const off = Math.abs(left);
            if (off <= 0.3) {
              const spike = off <= 0.12;
              hits++; if (spike) spikes++;
              flash(spike ? "💥 SPIKE!" : "🏐 Nice dig!");
              arms(c, "me", true);
              launch(c, ball, false, spike);
            } else { flash(left > 0 ? "Too early!" : "Too late!"); }
          }
          if (k >= 1.15 && fl === f) point(c, false, "😩 Their point");
        } else {
          tele.prompt = ""; tele.phase = "Their side…";
          if (k >= 0.92 && !judged) {
            judged = true;
            // They return most balls, fewer of your spikes.
            if (Math.random() < (f.spike ? 0.45 : 0.82)) { arms(c, "them", true); launch(c, ball, true, Math.random() < 0.2); }
          }
          if (k >= 1.15 && fl === f) point(c, true, "🎉 Your point!");
        }
        if (k > 0.3) { arms(c, f.toMe ? "them" : "me", false); }
        tele.score = mine; tele.count = theirs; tele.progress = Math.max(mine, theirs) / WIN;
        return false;
      },
    },
    { enter: (c) => { ball.set(0, -5, 0); c.data.endAt = c.clock; tele.prompt = ""; c.cam = "chase"; c.look({ anim: mine > theirs ? "dance" : "idle", body: "stand", prop: null }); }, update: (c) => c.t > 1.4 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: mine > theirs ? "🏆 You won the match!" : "😅 They took it this time",
      stars: mine > theirs ? (theirs <= 2 ? 3 : 2) : 1,
      stats: [{ label: "Score", value: `${mine} – ${theirs}` }, { label: "Good hits", value: String(hits) }, { label: "Spikes", value: String(spikes) }],
      best: { value: spikes, label: `${spikes} spikes` },
    }), update: () => false },
  ];
}

/** Pat the sand in a steady rhythm: the castle grows (and stays on the beach for this visit). */
function sandcastle(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const at = track.spots!.centre!;
  const LIMIT = 25, FULL = 25;
  let built = 0, taps = 0, lastTap = -1, stage = 0;
  return [
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps;
        yawQ(c.quat, flatYaw(c.pos, new THREE.Vector3(at[0], 0, at[1])));
        c.pos.y = -0.32;
        // Watched from the water's edge: the builder's face and the castle going up.
        c.cam = "fixed";
        c.camAt = new THREE.Vector3(at[0] + 1.6, 1.7, at[1] - 2.4);
        c.camLook = new THREE.Vector3(at[0], 0.35, at[1] + 0.4);
        tele.phase = "Pat the sand in a steady rhythm"; tele.prompt = "Tap to build"; tele.holdButton = false;
        c.look({ anim: "sit", pose: "grip", body: "stand", prop: null });
      },
      update: (c) => {
        const time = c.clock - c.rideStart;
        if (rideIO.input.taps > taps) {
          taps = rideIO.input.taps;
          const gap = lastTap < 0 ? 0.6 : c.clock - lastTap;
          built += gap < 0.22 ? 0.25 : gap < 1 ? 1 : 0.6;
          if (gap < 0.22) flash("Careful — gently!");
          lastTap = c.clock;
          const next = Math.min(5, Math.floor((built / FULL) * 5 + 0.0001));
          if (next > stage) { stage = next; c.ui({ castle: stage }); flash(["", "🏖️ A mound!", "🧱 Walls up!", "🏰 Towers!", "🌊 Moat dug!", "🚩 Flag on top!"][stage]); }
        }
        tele.score = stage; tele.progress = Math.min(1, built / FULL); tele.time = time;
        return stage >= 5 || rideIO.input.exit || time >= LIMIT;
      },
    },
    { enter: (c) => { c.pos.y = 0; c.data.stage = stage; tele.prompt = ""; c.look({ anim: "clap", body: "stand", prop: null }); }, update: (c) => c.t > 1.2 },
    { enter: (c) => { c.cam = "chase"; }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: (c) => result({
      rideId: ride.id, headline: stage >= 5 ? "🏰 A proper castle!" : undefined,
      stars: stage >= 5 ? 3 : stage >= 3 ? 2 : 1,
      stats: [{ label: "Built", value: ["Nothing yet", "A mound", "Walls", "Towers", "A moat", "Flag and all"][stage] }, { label: "Time", value: secs(c.clock - c.rideStart) }],
      keep: stage > 0 ? { castle: { at, stage } } : undefined,
    }), update: () => false },
  ];
}

// ---------------------------------------------------------------- ice rink

/** Laps of the rink: tap in rhythm to push, hold Lean through the corners or wobble and fall. */
function skate(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const penguin = ride.id === "skate-penguin";
  const loop = track.path!;
  const L = loop.getLength();
  const DURATION = 45;
  const onIce = new THREE.Vector3(track.spots!.me[0], 0.02, track.spots!.me[1]);
  let s = 0, v = 0, taps = 0, lastTap = -1, wobble = 0, falls = 0, downAt = -1;
  const skating = (): Look => (penguin ? { anim: "skate", pose: "grip", body: "stand", prop: "penguin" } : { anim: "skate", pose: "balance", body: "stand", prop: null });
  return [
    walk(() => [onIce.clone(), loop.getPointAt(0).clone().setY(0.02)], 0.9),
    {
      enter: (c) => {
        c.rideStart = c.clock; c.cam = "chase"; c.data.camDist = 5; taps = rideIO.input.taps;
        tele.phase = penguin ? "Push your penguin round the rink" : "Tap to push · hold Lean in the corners"; tele.prompt = "Tap to push"; tele.holdButton = false;
        if (dubaiEvening()) flash("🪩 Disco night on the ice!");
        c.look(skating());
      },
      update: (c, dt) => {
        const time = c.clock - c.rideStart;
        if (downAt >= 0) {
          // Picking yourself up off the ice.
          if (c.clock - downAt > 1.6) { downAt = -1; wobble = 0; c.look(skating()); }
          tele.time = time;
          return false;
        }
        if (rideIO.input.taps > taps) {
          taps = rideIO.input.taps;
          const gap = lastTap < 0 ? 0.7 : c.clock - lastTap;
          v += gap > 0.4 && gap < 1.1 ? (penguin ? 0.45 : 0.8) : 0.3;
          lastTap = c.clock;
        }
        const lean = rideIO.input.steer !== 0;
        v = Math.max(0, Math.min(penguin ? 2.4 : 5.5, v - dt * (0.3 + (lean ? 0.3 : 0))));
        s += v * dt;
        const u = (s / L) % 1;
        const tan = loop.getTangentAt(u);
        const ahead = loop.getTangentAt((u + 0.02) % 1);
        // How hard the bend is (turn per metre) times speed²: what throws you off balance.
        const bend = tan.angleTo(ahead) / (0.02 * L);
        if (!penguin) {
          const push = bend * v * v * (lean ? 0.12 : 1) * 0.45;
          wobble = Math.max(0, wobble + (push - 0.45) * dt + (Math.random() - 0.5) * dt * 0.3);
          if (wobble >= 1) {
            falls++; downAt = c.clock; v = 0; flash("💥 Down you go!");
            c.look({ anim: "sleep", body: "lie", prop: null });
          }
        }
        const p = loop.getPointAt(u);
        c.pos.set(p.x, 0.02, p.z);
        frame(c.quat, new THREE.Vector3(tan.x, 0, tan.z), UP);
        // Lean into the bend when leaning; otherwise a gentle side-to-side glide.
        c.data.lean = lean ? 0.28 : Math.sin(c.clock * 3.2) * 0.07 * Math.min(1, v / 2);
        c.speed = v * 3.6 * 1.4; c.top = Math.max(c.top, c.speed);
        tele.balance = Math.min(1, wobble);
        tele.score = Math.floor(s / L); tele.count = falls; tele.progress = time / DURATION; tele.time = time;
        return rideIO.input.exit || time >= DURATION;
      },
    },
    { enter: (c) => { c.data.lean = 0; c.speed = 0; tele.prompt = ""; c.look({ anim: "skate", pose: penguin ? "grip" : "balance", body: "stand", prop: penguin ? "penguin" : null }); }, update: () => true },
    walk(() => [onIce.clone(), new THREE.Vector3(track.exit[0], 0, track.exit[1])], 0.9),
    { enter: (c) => {
      const laps = Math.floor(s / L);
      result({
        rideId: ride.id, stars: laps >= 3 && falls === 0 ? 3 : laps >= 2 ? 2 : 1,
        stats: [{ label: "Laps", value: String(laps) }, { label: "Falls", value: String(falls) }, { label: "Top speed", value: `${Math.round(c.top)} km/h` }],
        best: { value: laps, label: `${laps} laps` },
      });
    }, update: () => false },
  ];
}

/** Hold to wind up a spin in the middle of the ice; let go before you're dizzy. Best of three. */
function figureSpin(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const onIce = new THREE.Vector3(track.spots!.me[0], 0.02, track.spots!.me[1]);
  const mid = new THREE.Vector3(track.spots!.centre![0], 0.02, track.spots!.centre![1]);
  let tries = 0, best = 0, spinning = false, holdFrom = 0, w = 0, angle = 0, pauseUntil = 0, dizzy = false;
  return [
    walk(() => [onIce.clone(), mid.clone()], 0.9),
    {
      enter: (c) => {
        c.rideStart = c.clock; yawQ(c.quat, 0);
        c.cam = "fixed";
        c.camAt = mid.clone().add(new THREE.Vector3(2.6, 2.3, 4));
        c.camLook = mid.clone().add(new THREE.Vector3(0, 1, 0));
        tele.phase = "Spin 1 of 3: hold to spin, let go before you're dizzy"; tele.prompt = "Hold to spin"; tele.holdButton = true;
        c.look({ anim: "idle", pose: "balance", body: "stand", prop: null });
      },
      update: (c, dt) => {
        if (c.clock < pauseUntil) return false;
        if (dizzy) { dizzy = false; c.look({ anim: "idle", pose: "balance", body: "stand", prop: null }); }
        if (tries >= 3) return true;
        if (!spinning && rideIO.input.down) { spinning = true; holdFrom = c.clock; w = 0; angle = 0; c.look({ anim: "idle", pose: "armsUp", body: "stand", prop: null }); }
        if (spinning) {
          w = Math.min(19, w + dt * 9);
          angle += w * dt;
          c.spin = angle;
          const held = c.clock - holdFrom;
          const revs = Math.floor(angle / (Math.PI * 2));
          tele.score = revs;
          if (held > 3.3) {
            spinning = false; tries++; c.spin = 0; dizzy = true; pauseUntil = c.clock + 1.6;
            flash("😵 Too dizzy, you fell!");
            c.look({ anim: "sleep", body: "lie", prop: null });
          } else if (!rideIO.input.down) {
            spinning = false; tries++; c.spin = 0; pauseUntil = c.clock + 1.2;
            best = Math.max(best, revs);
            flash(revs >= 8 ? `🌟 ${revs} rotations, superb!` : `🌀 ${revs} rotations`);
            c.look({ anim: "idle", pose: "balance", body: "stand", prop: null });
          }
        }
        tele.phase = tries < 3 ? `Spin ${tries + 1} of 3: hold to spin, let go before you're dizzy` : "Done";
        tele.count = best; tele.progress = tries / 3;
        return tries >= 3 && c.clock >= pauseUntil;
      },
    },
    { enter: (c) => { c.cam = "chase"; tele.prompt = ""; c.look({ anim: "skate", pose: "balance", body: "stand", prop: null }); }, update: () => true },
    walk(() => [onIce.clone(), new THREE.Vector3(track.exit[0], 0, track.exit[1])], 0.9),
    { enter: () => result({
      rideId: ride.id, stars: best >= 8 ? 3 : best >= 5 ? 2 : 1, headline: best >= 8 ? "🌟 Olympic spin!" : undefined,
      stats: [{ label: "Best spin", value: `${best} rotations` }], best: { value: best, label: `${best} rotations` },
    }), update: () => false },
  ];
}

// ---------------------------------------------------------------- Brass Monkey

/** Three frames: lock in your line, then your power; the ball rolls and the pins fly. */
function bowling(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const { foulZ, headPinZ, laneWidth } = BOWLING;
  const laneX = track.spots!.centre![0];
  const stand = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const FRAMES = 3;
  const frames: number[][] = [];
  let frame_ = 0, ball = 0, phase: "aim" | "power" | "run" | "roll" | "settle" = "aim", taps = 0, aim = 0, power = 0, t0 = 0, bx = 0, rollFrom = 0, target = 0, gutter = false;
  let strikes = 0, spares = 0;
  const ballPos = new THREE.Vector3(0, -5, 0);
  const pins: LivePin[] = PIN_SPOTS.map(([x, z]) => ({ x, z, down: false, gone: false, t: 0, dir: 0 }));
  const rack = () => pins.forEach((p) => { p.down = false; p.gone = false; p.t = 0; });
  const knock = (c: Ctx, x: number, pow: number) => {
    // Pins in the ball's path go down; each one fallen can take out the pins behind it.
    const pocket = Math.abs(x) >= 0.04 && Math.abs(x) <= 0.16;
    const chance = 0.35 + pow * 0.45 + (pocket ? 0.25 : 0);
    const hit = (p: LivePin, dir: number) => { if (!p.down && !p.gone) { p.down = true; p.t = c.clock + Math.random() * 0.25; p.dir = dir; } };
    pins.forEach((p) => { if (Math.abs(p.x - x) < 0.17) hit(p, Math.sign(p.x - x) || (Math.random() < 0.5 ? -1 : 1)); });
    for (let pass = 0; pass < 3; pass++) {
      pins.forEach((a) => { if (!a.down) return; pins.forEach((b) => { if (b.z < a.z - 0.05 && Math.abs(b.x - a.x) <= 0.2 && Math.random() < chance) hit(b, Math.sign(b.x - a.x) || a.dir); }); });
    }
    if (pocket && pow > 0.75 && Math.random() < 0.5) pins.forEach((p) => hit(p, Math.sign(p.x) || 1));
  };
  const total = () => {
    // Strikes and spares earn the next balls' pins on top (within these three frames).
    const balls = frames.flat();
    let sum = 0, i = 0;
    for (const f of frames) {
      if (f[0] === 10) { sum += 10 + (balls[i + 1] ?? 0) + (balls[i + 2] ?? 0); i += 1; }
      else if ((f[0] ?? 0) + (f[1] ?? 0) === 10) { sum += 10 + (balls[i + 2] ?? 0); i += 2; }
      else { sum += (f[0] ?? 0) + (f[1] ?? 0); i += f.length; }
    }
    return sum;
  };
  return [
    walk(() => [stand.clone()], 1.2),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; c.ball = ballPos; c.pins = pins; LANE_IN_USE.current = true;
        yawQ(c.quat, Math.PI);
        c.cam = "fixed";
        // High and to the right of the bowler: the whole lane down to the pins stays in view.
        c.camAt = new THREE.Vector3(laneX + 1.4, 3.1, foulZ + 5.4);
        c.camLook = new THREE.Vector3(laneX - 0.1, 0.2, headPinZ + 1.4);
        c.look({ anim: "idle", body: "stand", prop: null, hold: "ball" });
      },
      update: (c, dt) => {
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        const time = c.clock;
        if (phase === "aim") {
          aim = Math.sin(time * 2.4);
          tele.meterLabel = "Aim"; tele.meter = aim; tele.prompt = "Tap to lock your line"; tele.phase = `Frame ${frame_ + 1} · ball ${ball + 1}`;
          if (tapped) { phase = "power"; t0 = time; }
        } else if (phase === "power") {
          power = (Math.sin((time - t0) * 3.6 - Math.PI / 2) + 1) / 2;
          tele.meterLabel = "Power"; tele.meter = power; tele.prompt = "Tap for power";
          if (tapped) { phase = "run"; t0 = time; tele.prompt = ""; tele.meterLabel = ""; c.look({ anim: "walk", pose: "throw", body: "stand", prop: null, hold: "ball" }); }
        } else if (phase === "run") {
          // The approach: a few steps up to the foul line, swinging the ball through.
          const k = Math.min(1, (time - t0) / 0.8);
          c.pos.z = stand.z - k * 1.3;
          if (k >= 1) {
            phase = "roll"; t0 = time; rollFrom = laneX + 0.15;
            target = aim * 0.42 + (power > 0.85 ? -0.05 : 0);
            gutter = Math.abs(target) > laneWidth / 2 - 0.05;
            bx = target;
            c.look({ anim: "idle", pose: "throw", body: "stand", prop: null });
          }
        } else if (phase === "roll") {
          const speed = 6 + power * 3;
          const dist = foulZ - headPinZ + 1.4;
          const k = Math.min(1, ((time - t0) * speed) / dist);
          const x = gutter ? laneX + Math.sign(target) * (laneWidth / 2 + 0.12) : rollFrom + (laneX + target - rollFrom) * k;
          ballPos.set(gutter && k > 0.3 ? x : rollFrom + (x - rollFrom) * Math.min(1, k / 0.3), 0.11, foulZ - 0.1 - k * dist);
          if (!gutter && !c.data.knocked && ballPos.z <= headPinZ + 0.1) { c.data.knocked = 1; knock(c, bx, power); }
          c.speed = speed * 3.6; c.top = Math.max(c.top, c.speed);
          if (k >= 1) { phase = "settle"; t0 = time; ballPos.set(0, -5, 0); c.speed = 0; }
        } else if (phase === "settle" && time - t0 > 1.4) {
          c.data.knocked = 0;
          const downNow = pins.filter((p) => p.down && !p.gone).length;
          const f = frames[frame_] ?? (frames[frame_] = []);
          f.push(downNow);
          const strike = ball === 0 && downNow === 10;
          const spare = ball === 1 && f[0] + downNow === 10;
          if (strike) { strikes++; flash("💥 STRIKE!"); } else if (spare) { spares++; flash("🎯 SPARE!"); } else flash(gutter ? "😬 Gutter ball" : downNow === 0 ? "Missed them all…" : `${downNow} pin${downNow > 1 ? "s" : ""}`);
          // The fallen pins are swept away; a new rack after a strike or the second ball.
          pins.forEach((p) => { if (p.down) p.gone = true; });
          if (strike || ball === 1) { frame_++; ball = 0; rack(); } else ball++;
          tele.score = total(); tele.count = frame_; tele.progress = frame_ / FRAMES;
          c.pos.copy(stand);
          if (frame_ >= FRAMES) return true;
          phase = "aim";
          c.look({ anim: "idle", body: "stand", prop: null, hold: "ball" });
        }
        return false;
      },
    },
    { enter: (c) => { LANE_IN_USE.current = false; c.cam = "chase"; tele.meterLabel = ""; tele.prompt = ""; c.look({ anim: total() >= 50 ? "dance" : "idle", body: "stand", prop: null }); }, update: (c) => c.t > 1.2 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const score = total();
      result({
        rideId: ride.id, headline: strikes ? `💥 ${strikes} strike${strikes > 1 ? "s" : ""}!` : undefined,
        stars: score >= 60 ? 3 : score >= 35 ? 2 : 1,
        stats: [{ label: "Score", value: String(score) }, { label: "Strikes", value: String(strikes) }, { label: "Spares", value: String(spares) }],
        best: { value: score, label: `${score} points` },
      });
    }, update: () => false },
  ];
}

const SONGS = ["Marina Lights", "Midnight on Sheikh Zayed Road", "Sand & Neon", "Golden Hour Groove", "Dhow Cruise Disco", "Desert Stars"];

/** Take the mic: tap on every beat. A streak gets the crowd clapping, then dancing. */
function karaoke(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const { stage } = BOWLING;
  const spot = new THREE.Vector3(track.spots!.me[0], stage.h, track.spots!.me[1]);
  const BEATS = 24, GAP = 600;
  const song = SONGS[Math.floor(Math.random() * SONGS.length)];
  let taps = 0, points = 0, streak = 0, bestStreak = 0, perfect = 0, crowd: AvatarAnimation = "idle";
  const judged = new Set<number>();
  const cheer = (c: Ctx) => {
    const next: AvatarAnimation = streak >= 8 ? "dance" : streak >= 3 ? "clap" : "idle";
    if (next !== crowd) { crowd = next; c.ui({ crowd }); }
  };
  return [
    walk(() => [new THREE.Vector3(stage.at[0] - 0.6, 0, stage.at[1] + stage.d / 2 + 0.2), spot.clone()], 1.1),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; yawQ(c.quat, 0);
        c.cam = "fixed";
        c.camAt = spot.clone().add(new THREE.Vector3(-1.4, 1.5, 4.6));
        c.camLook = spot.clone().add(new THREE.Vector3(0, 1.1, 0));
        tele.phase = `🎵 ${song}`; tele.prompt = "Tap on the beat"; tele.holdButton = false;
        tele.beatStart = performance.now() + 2000; tele.beatGap = GAP;
        c.look({ anim: "talk", pose: "mic", body: "stand", prop: null, hold: "mic" });
        c.ui({ crowd: "idle" });
      },
      update: (c) => {
        const now = performance.now();
        const beatAt = (i: number) => tele.beatStart + i * GAP;
        const count = Math.ceil((tele.beatStart - now) / 1000);
        tele.countdown = now < tele.beatStart ? Math.max(1, count) : 0;
        if (rideIO.input.taps > taps) {
          taps = rideIO.input.taps;
          // Judge against the nearest beat not yet sung.
          const i = Math.round((now - tele.beatStart) / GAP);
          if (i >= 0 && i < BEATS && !judged.has(i)) {
            judged.add(i);
            const off = Math.abs(now - beatAt(i));
            if (off < 100) { points += 100; streak++; perfect++; if (streak % 4 === 0) flash(`🔥 ${streak} in a row!`); }
            else if (off < 200) { points += 60; streak++; }
            else { streak = 0; flash("🎶 Off-beat"); }
            bestStreak = Math.max(bestStreak, streak);
            cheer(c);
          }
        }
        // A beat that went by unsung breaks the streak.
        const passed = Math.floor((now - tele.beatStart - 250) / GAP);
        for (let i = 0; i <= Math.min(passed, BEATS - 1); i++) if (!judged.has(i)) { judged.add(i); streak = 0; cheer(c); }
        tele.score = Math.round((points / (BEATS * 100)) * 100); tele.count = streak; tele.progress = Math.max(0, (now - tele.beatStart) / (BEATS * GAP));
        return now > beatAt(BEATS - 1) + 600 || rideIO.input.exit;
      },
    },
    { enter: (c) => { tele.prompt = ""; tele.beatStart = 0; c.look({ anim: tele.score >= 60 ? "wave" : "idle", body: "stand", prop: null, hold: "mic" }); c.ui({ crowd: tele.score >= 60 ? "clap" : "idle" }); }, update: (c) => c.t > 1.4 },
    walk(() => [new THREE.Vector3(stage.at[0] - 0.6, 0, stage.at[1] + stage.d / 2 + 0.2), new THREE.Vector3(track.exit[0], 0, track.exit[1])], 1.1),
    { enter: () => {
      const acc = tele.score;
      result({
        rideId: ride.id, headline: acc >= 85 ? "🎤 The crowd loved it!" : acc >= 60 ? "👏 Solid performance" : "🙈 Maybe next time…",
        stars: acc >= 85 ? 3 : acc >= 60 ? 2 : 1,
        stats: [{ label: "Song", value: song }, { label: "Accuracy", value: `${acc}%` }, { label: "Perfect beats", value: String(perfect) }, { label: "Best streak", value: String(bestStreak) }],
        best: { value: acc, label: `${acc}%` },
      });
    }, update: () => false },
  ];
}

// ---------------------------------------------------------------- nightclubs

const MOVE_POSE: Record<Arrow, BodyPose> = { up: "armsUp", left: "balance", right: "armsCrossed", down: "grip" };
const ARROWS: Arrow[] = ["left", "up", "right", "down"];
const FANS = [
  { gender: "woman" as const, preset: "Female_Adult_01" }, { gender: "man" as const, preset: "Male_Adult_08" },
  { gender: "woman" as const, preset: "Female_Adult_05" }, { gender: "man" as const, preset: "Male_Adult_10" },
];

/** Face off on the dance floor: hit each move on the beat; a fan circle cheers the better dancer. */
function danceOff(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const them = new THREE.Vector3(track.spots!.them![0], 0, track.spots!.them![1]);
  const mid = new THREE.Vector3(track.spots!.centre![0], 0, track.spots!.centre![1]);
  const BEATS = 16, GAP = 560;
  const moves = Array.from({ length: BEATS }, () => ARROWS[Math.floor(Math.random() * 4)]);
  const judged = new Set<number>(), oppDone = new Set<number>();
  let seen = 0, mine = 0, theirs = 0, streak = 0, best = 0, fans: AvatarAnimation = "clap";
  return [
    walk(() => [me.clone()], 1.3),
    {
      enter: (c) => {
        c.rideStart = c.clock; seen = rideIO.input.moves;
        yawQ(c.quat, flatYaw(me, them));
        c.cam = "fixed";
        c.camAt = mid.clone().add(new THREE.Vector3(0.6, 3.2, 5.4));
        c.camLook = mid.clone().add(new THREE.Vector3(0, 1, 0));
        setCast(c, { id: "rival", gender: "man", preset: "Male_Adult_04", anim: "dance" }, them, flatYaw(them, me));
        FANS.forEach((f, i) => {
          const a = Math.PI * 0.15 + (i / FANS.length) * Math.PI * 0.7 + Math.PI;
          const at = mid.clone().add(new THREE.Vector3(Math.cos(a) * 2.6, 0, -Math.sin(a) * 2.6));
          setCast(c, { id: `fan${i}`, ...f, anim: "clap" }, at, flatYaw(at, mid));
        });
        tele.phase = "Hit each move on the beat!"; tele.prompt = ""; tele.beatStart = performance.now() + 2200; tele.beatGap = GAP;
        c.look({ anim: "dance", body: "stand", prop: null });
      },
      update: (c) => {
        const now = performance.now();
        const at = (i: number) => tele.beatStart + i * GAP;
        tele.countdown = now < tele.beatStart ? Math.max(1, Math.ceil((tele.beatStart - now) / 1000)) : 0;
        const next = Math.max(0, Math.ceil((now - tele.beatStart - 160) / GAP));
        tele.arrow = next < BEATS ? moves[next] : "";
        if (rideIO.input.moves > seen) {
          seen = rideIO.input.moves;
          const i = Math.round((now - tele.beatStart) / GAP);
          if (i >= 0 && i < BEATS && !judged.has(i)) {
            judged.add(i);
            const off = Math.abs(now - at(i));
            if (rideIO.input.moveDir === moves[i] && off < 160) {
              mine += off < 80 ? 100 : 60; streak++; best = Math.max(best, streak);
              if (streak % 4 === 0) flash(`🔥 ${streak} combo!`);
              c.look({ anim: "dance", pose: MOVE_POSE[moves[i]], body: "stand", prop: null });
            } else { streak = 0; flash(rideIO.input.moveDir === moves[i] ? "⏱ Off the beat" : "❌ Wrong move"); }
          }
        }
        // Beats gone by: missed ones break your combo; the rival hits most of theirs.
        for (let i = 0; i < BEATS; i++) {
          if (now < at(i) + 200) break;
          if (!judged.has(i)) { judged.add(i); streak = 0; }
          if (!oppDone.has(i)) {
            oppDone.add(i);
            if (Math.random() < 0.74) { theirs += Math.random() < 0.5 ? 100 : 60; castLook(c, "rival", { pose: MOVE_POSE[ARROWS[Math.floor(Math.random() * 4)]] }); }
          }
        }
        const lead: AvatarAnimation = streak >= 5 ? "dance" : "clap";
        if (lead !== fans) { fans = lead; FANS.forEach((_, i) => castLook(c, `fan${i}`, { anim: fans })); }
        tele.score = Math.round((mine / (BEATS * 100)) * 100); tele.count = Math.round((theirs / (BEATS * 100)) * 100);
        tele.progress = Math.max(0, (now - tele.beatStart) / (BEATS * GAP));
        return now > at(BEATS - 1) + 700 || rideIO.input.exit;
      },
    },
    {
      enter: (c) => {
        tele.arrow = ""; tele.beatStart = 0;
        const won = mine >= theirs;
        c.look({ anim: won ? "dance" : "idle", pose: won ? "armsUp" : undefined, body: "stand", prop: null });
        castLook(c, "rival", { anim: won ? "clap" : "dance", pose: won ? undefined : "armsUp" });
        FANS.forEach((_, i) => castLook(c, `fan${i}`, { anim: won ? "dance" : "clap" }));
        flash(won ? "🏆 The crowd picks you!" : "😤 The crowd picks your rival");
      },
      update: (c) => c.t > 1.8,
    },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const me_ = tele.score, them_ = tele.count, won = me_ >= them_;
      result({
        rideId: ride.id, headline: won ? "🏆 You won the dance-off!" : "😤 So close!",
        stars: won ? (me_ >= 80 ? 3 : 2) : 1,
        stats: [{ label: "You", value: `${me_}%` }, { label: "Rival", value: `${them_}%` }, { label: "Best combo", value: String(best) }],
        best: { value: me_, label: `${me_}%` },
      });
    }, update: () => false },
  ];
}

/** Take the decks: build each track up and drop it at the peak. Four drops. */
function djSet(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const floor = new THREE.Vector3(CLUB.floor.at[0], 0, CLUB.floor.at[1]);
  const DROPS = 4, BUILD = 3.4;
  let drop = 0, buildFrom = 0, taps = 0, hype = 20, perfect = 0, pauseUntil = 0;
  const crowd = (c: Ctx, pose?: BodyPose) => Array.from({ length: 6 }, (_, i) => castLook(c, `clubber${i}`, { anim: "dance", pose }));
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, me.z), me.clone()], 1.2),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; buildFrom = c.clock + 1.2;
        yawQ(c.quat, flatYaw(me, floor));
        c.cam = "fixed";
        c.camAt = floor.clone().add(new THREE.Vector3(2, 2.6, 4.4));
        c.camLook = new THREE.Vector3(CLUB.dj[0], 1.3, CLUB.dj[1]);
        const looks = [...FANS, { gender: "woman" as const, preset: "Female_Adult_06" }, { gender: "man" as const, preset: "Male_Adult_04" }];
        looks.forEach((f, i) => {
          const at = floor.clone().add(new THREE.Vector3(((i % 3) - 1) * 1.3 + (Math.floor(i / 3) ? 0.6 : 0), 0, Math.floor(i / 3) * 1.3 - 0.4));
          setCast(c, { id: `clubber${i}`, ...f, anim: "dance" }, at, flatYaw(at, me));
        });
        tele.phase = `🎧 Track 1 of ${DROPS}: wait for the peak…`; tele.prompt = "DROP IT!"; tele.holdButton = false;
        c.look({ anim: "dance", pose: "grip", body: "stand", prop: null });
      },
      update: (c) => {
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        if (c.clock < pauseUntil) { tele.meterLabel = ""; return false; }
        if (drop >= DROPS) return true;
        const k = (c.clock - buildFrom) / BUILD;
        tele.meterLabel = "Build-up"; tele.meter = Math.max(0, Math.min(1, k));
        const fire = (q: number) => {
          drop++; pauseUntil = c.clock + 1.8; buildFrom = pauseUntil + 0.4;
          const gain = q >= 0.93 ? 25 : q >= 0.75 ? 15 : q > 0 ? 5 : -10;
          hype = Math.max(0, Math.min(100, hype + gain));
          if (q >= 0.93) { perfect++; flash("💥 PERFECT DROP!"); } else if (q >= 0.75) flash("🔊 Big drop!"); else if (q > 0) flash("😬 Too early…"); else flash("🙉 Missed the drop!");
          if (q >= 0.75) { c.ui({ strobeAt: c.clock }); crowd(c, "armsUp"); c.look({ anim: "dance", pose: "armsUp", body: "stand", prop: null }); }
          tele.phase = drop < DROPS ? `🎧 Track ${drop + 1} of ${DROPS}: wait for the peak…` : "🎧 Last tune…";
        };
        if (tapped && k > 0) fire(Math.min(1, k));
        else if (k > 1.15) fire(0);
        if (c.clock > pauseUntil - 0.2 && c.clock < pauseUntil) { crowd(c); c.look({ anim: "dance", pose: "grip", body: "stand", prop: null }); }
        tele.score = Math.round(hype); tele.count = drop; tele.progress = drop / DROPS;
        return false;
      },
    },
    { enter: (c) => { tele.meterLabel = ""; tele.prompt = ""; c.look({ anim: "wave", body: "stand", prop: null }); }, update: (c) => c.t > 1.4 },
    walk(() => [new THREE.Vector3(track.approach[0], 0, me.z), new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: hype >= 85 ? "🔥 The floor went wild!" : hype >= 55 ? "🎶 Good set!" : "🦗 Tough crowd…",
      stars: hype >= 85 ? 3 : hype >= 55 ? 2 : 1,
      stats: [{ label: "Crowd hype", value: `${Math.round(hype)}%` }, { label: "Perfect drops", value: `${perfect}/${DROPS}` }],
      best: { value: Math.round(hype), label: `${Math.round(hype)}% hype` },
    }), update: () => false },
  ];
}

// ---------------------------------------------------------------- restaurants

/** A sit-down meal: shown to a table, order, the waiter brings it, eat (photo optional), pay the bill. */
function meal(ride: RideDef, track: Track, result: (r: RideResult) => void, menu: Product[]): Step[] {
  const tele = rideIO.tele;
  const seat = track.seat!;
  const chair = new THREE.Vector3(seat.at[0], 0, seat.at[1]);
  const table = new THREE.Vector3(seat.table[0], 0, seat.table[1]);
  const desk = new THREE.Vector3(DINING.reception[0], 0, DINING.reception[1] - 0.6);
  const pass = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  const toSeat = chair.clone().sub(table).setY(0).normalize();
  const side = new THREE.Vector3(toSeat.z, 0, -toSeat.x);
  const beside = table.clone().addScaledVector(side, 0.85);
  let ordered: Product[] = [];
  let photoAt = -1;
  const bill = () => ordered.reduce((s, p) => s + p.price, 0);
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    {
      enter: (c) => {
        setCast(c, { id: "host", gender: "woman", preset: "Female_Adult_05", anim: "talk" }, desk, flatYaw(desk, c.pos));
        tele.phase = "“Welcome! Table for one? Right this way.”"; tele.prompt = "";
      },
      update: (c) => c.t > 1.4,
    },
    {
      // The host leads the way; you follow.
      enter: (c) => { c.look({ anim: "walk", body: "stand", prop: null }); },
      update: (c, dt) => {
        const hostThere = stepActor(c, "host", chair.clone().addScaledVector(side, 0.9).addScaledVector(toSeat, 0.4), 1.4, dt);
        const d = Math.hypot(chair.x - c.pos.x, chair.z - c.pos.z);
        if (c.t > 0.6 && d > 0.04) {
          yawQ(c.quat, flatYaw(c.pos, chair));
          const k = Math.min(1, (1.3 * dt) / d);
          c.pos.x += (chair.x - c.pos.x) * k; c.pos.z += (chair.z - c.pos.z) * k;
        }
        return hostThere && d <= 0.04;
      },
    },
    {
      enter: (c) => {
        c.pos.copy(chair); yawQ(c.quat, seat.yaw);
        c.look({ anim: "sit", body: "stand", prop: null });
        castLook(c, "host", { anim: "talk" });
        c.cam = "fixed";
        c.camAt = table.clone().addScaledVector(side, -2.4).addScaledVector(toSeat, 1.6).add(new THREE.Vector3(0, 2.2, 0));
        c.camLook = table.clone().add(new THREE.Vector3(0, 0.9, 0));
        // The host heads back to the desk while you read the menu.
        c.tasks.push((cc, dt) => cc.t > 1 && stepActor(cc, "host", desk, 1.4, dt));
        tele.phase = "What would you like?"; tele.panel = "menu"; rideIO.input.order = null;
      },
      update: () => rideIO.input.order !== null,
    },
    {
      enter: (c) => {
        ordered = (rideIO.input.order ?? []).map((id) => menu.find((p) => p.id === id)).filter((p): p is Product => !!p);
        tele.panel = ""; tele.bill = bill();
        tele.phase = ordered.length ? "Your order's on its way…" : "Just water? Coming right up.";
        const first = ordered.map(serveKindOf).find((k): k is ServeKind => !!k) ?? "soda";
        setCast(c, { id: "waiter", gender: "man", preset: "Male_Adult_08", anim: "walk", hold: first }, pass, flatYaw(pass, beside));
      },
      update: (c, dt) => stepActor(c, "waiter", beside, 1.3, dt),
    },
    {
      enter: (c) => {
        // Plates go down in front of you; drinks to the side.
        let n = 0;
        const dishes = (ordered.length ? ordered : [{ id: "water" } as Product]).map((p) => {
          const kind = (p.id === "water" ? "soda" : serveKindOf(p)) ?? "plate";
          const drink = !["plate", "dessert", "pastry", "teaset"].includes(kind);
          const at = table.clone().addScaledVector(toSeat, drink ? 0.18 : 0.2).addScaledVector(side, drink ? 0.22 : (n++ - 0.5) * 0.12).setY(0.78);
          return { id: p.id, kind, at: [at.x, at.y, at.z] as [number, number, number] };
        });
        c.ui({ dishes });
        castLook(c, "waiter", { anim: "talk", hold: undefined, pose: undefined });
        flash("🍽️ Enjoy your meal!");
        c.tasks.push((cc, dt) => cc.t > 1.2 && stepActor(cc, "waiter", pass, 1.3, dt));
      },
      update: (c) => c.t > 1.2,
    },
    {
      enter: (c) => {
        c.rideStart = c.clock; photoAt = -1;
        tele.phase = "Bon appétit! Snap a photo for your story?"; tele.panel = "photo"; rideIO.input.photos = 0;
        const eating = ordered.some((p) => ["plate", "dessert", "pastry"].includes(serveKindOf(p) ?? ""));
        c.look({ anim: "sit", body: "stand", prop: null, carry: eating ? "eat" : "drink" });
      },
      update: (c) => {
        if (rideIO.input.photos > 0 && photoAt < 0) { photoAt = c.clock; flash("📸 Posted to your story!"); }
        tele.progress = Math.min(1, c.t / 10); tele.time = c.t;
        return c.t > 10;
      },
    },
    {
      enter: (c) => {
        c.look({ anim: "sit", body: "stand", prop: null });
        c.ui({ dishes: [] });
        tele.phase = "Ready for the bill?"; tele.panel = "bill"; tele.prompt = "Pay the bill"; tele.holdButton = false;
        c.data.taps = rideIO.input.taps;
        setCast(c, { id: "waiter", gender: "man", preset: "Male_Adult_08", anim: "walk" }, c.actors.waiter?.pos ?? pass);
      },
      update: (c, dt) => { stepActor(c, "waiter", beside, 1.3, dt); return rideIO.input.taps > c.data.taps; },
    },
    {
      enter: (c) => {
        tele.panel = ""; tele.prompt = "";
        flash(rideIO.input.tip ? "🙏 “Thank you so much!”" : "“Thank you, see you again!”");
        castLook(c, "waiter", { anim: rideIO.input.tip ? "wave" : "talk" });
        c.look({ anim: "idle", body: "stand", prop: null });
        c.pos.addScaledVector(toSeat, 0.4);
      },
      update: (c) => c.t > 1.2,
    },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const total = Math.round(bill() * (rideIO.input.tip ? 1.1 : 1));
      result({
        rideId: ride.id, headline: rideIO.input.tip ? "🙏 The staff loved you" : "😋 Lovely meal",
        stars: ordered.length ? (rideIO.input.tip ? 3 : 2) : 1,
        stats: [
          { label: "You had", value: ordered.length ? ordered.map((p) => p.name).join(", ") : "Water" },
          { label: "Bill", value: `AED ${total}${rideIO.input.tip ? " (tip incl.)" : ""}` },
          { label: "Food photo", value: photoAt >= 0 ? "Posted 📸" : "None" },
        ],
        charge: total, ate: ordered.map((p) => p.id),
      });
    }, update: () => false },
  ];
}

/** Front-row seat at the grill: the chef flips, flames roar, and shrimp come flying. Catch them! */
function chefShow(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const grill = new THREE.Vector3(track.spots!.centre![0], 0.95, track.spots!.centre![1]);
  const chefAt = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  const TOSSES = 6, EVERY = 2.6, FLIGHT = 0.95;
  const shrimp = new THREE.Vector3(0, -5, 0);
  let toss = -1, tossAt = 0, taps = 0, caught = 0, judged = true, falling = false;
  return [
    walk(() => [me.clone()]),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; c.ball = shrimp;
        yawQ(c.quat, flatYaw(me, grill));
        setCast(c, { id: "chef", gender: "man", preset: "Male_Adult_10", anim: "talk" }, chefAt, flatYaw(chefAt, me));
        c.cam = "fixed";
        c.camAt = grill.clone().add(new THREE.Vector3(2.3, 1, 2.2));
        c.camLook = grill.clone().add(new THREE.Vector3(0, 0.2, 0.4));
        tele.phase = "🔥 Onion volcano!"; tele.prompt = ""; c.ui({ shrimp: true });
        c.splash(grill.clone(), 2.2, "#f97316");
        c.look({ anim: "clap", body: "stand", prop: null });
      },
      update: (c) => {
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        const t = c.clock - c.rideStart - 1.6;
        const n = Math.floor(t / EVERY);
        if (n > toss && n < TOSSES) {
          // The chef flips a shrimp your way, with a burst of flame.
          toss = n; tossAt = c.clock; judged = false; falling = false;
          castLook(c, "chef", { anim: "idle", pose: "armsUp" });
          c.splash(grill.clone(), 1.2, "#f97316");
          tele.phase = `🍤 Shrimp ${toss + 1} of ${TOSSES}: catch it!`; tele.prompt = "Catch it!";
          c.look({ anim: "idle", body: "stand", prop: null });
        }
        if (toss >= 0 && !judged) {
          const k = (c.clock - tossAt) / FLIGHT;
          const mouth = me.clone().add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(grill.clone().setY(0).sub(me.clone().setY(0)).normalize(), 0.25);
          shrimp.lerpVectors(grill, mouth, Math.min(k, 1));
          shrimp.y = grill.y + (mouth.y - grill.y) * Math.min(k, 1) + 0.9 * 4 * k * (1 - k);
          if (k > 0.4) castLook(c, "chef", { anim: "talk", pose: undefined });
          if (tapped) {
            judged = true;
            if (k > 0.72 && k < 1.12) { caught++; flash("😋 Caught it!"); shrimp.set(0, -5, 0); c.look({ anim: "clap", body: "stand", prop: null }); }
            else { flash(k <= 0.72 ? "Too early!" : "Too late!"); falling = true; }
          } else if (k > 1.15) { judged = true; falling = true; flash("🫣 Dropped it!"); }
          tele.prompt = judged ? "" : "Catch it!";
        }
        if (falling) { shrimp.y -= 0.05; if (shrimp.y < 0) { falling = false; shrimp.set(0, -5, 0); } }
        tele.score = caught; tele.count = Math.max(0, toss + 1); tele.progress = (toss + 1) / TOSSES;
        return toss >= TOSSES - 1 && judged && !falling && c.clock - tossAt > FLIGHT + 0.8;
      },
    },
    { enter: (c) => { tele.prompt = ""; c.ui({ shrimp: false }); castLook(c, "chef", { anim: "wave", pose: undefined }); c.look({ anim: "clap", body: "stand", prop: null }); }, update: (c) => c.t > 1.4 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: caught >= 5 ? "🍤 Shrimp-catching champion!" : undefined,
      stars: caught >= 5 ? 3 : caught >= 3 ? 2 : 1,
      stats: [{ label: "Caught", value: `${caught}/${TOSSES}` }], best: { value: caught, label: `${caught} caught` },
    }), update: () => false },
  ];
}

// ---------------------------------------------------------------- spa

/** Breathing with the guide: hold while it grows, let go while it shrinks. Returns calm gained this frame. */
function breathe(c: Ctx, dt: number, period = 6): number {
  const t = c.clock - c.rideStart;
  const b = (Math.sin((t / period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const rising = Math.cos((t / period) * Math.PI * 2 - Math.PI / 2) > 0;
  rideIO.tele.breath = b;
  // Near the turn-around either way is fine.
  const ok = b < 0.08 || b > 0.92 || rideIO.input.down === rising;
  return ok ? dt : 0;
}

/** Massage or hammam scrub: face down on the bed while the therapist works; breathe with the guide. */
function treatment(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const lie = track.lie!;
  const hammam = ride.track === "bed2";
  const LEN = 30;
  let calm = 0;
  const bed = new THREE.Vector3(track.centre![0], 0, track.centre![1]);
  const by = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    {
      enter: (c) => {
        c.rideStart = c.clock;
        c.pos.set(...lie.feet); yawQ(c.quat, lie.yaw);
        c.look({ anim: "sleep", body: "prone", prop: null });
        setCast(c, { id: "therapist", gender: "woman", preset: "Female_Adult_05", anim: "talk", pose: "grip" }, by, flatYaw(by, bed));
        c.cam = "fixed";
        c.camAt = bed.clone().add(new THREE.Vector3(-0.6, 2.4, 2.8));
        c.camLook = bed.clone().add(new THREE.Vector3(0, 0.7, 0));
        if (hammam) c.ui({ steamAt: [bed.x, SPA.bedTop, bed.z] });
        tele.phase = hammam ? "Steam, black soap, the kessa glove… breathe slowly" : "Breathe with the circle"; tele.prompt = "Hold to breathe in"; tele.holdButton = true;
      },
      update: (c, dt) => {
        calm += breathe(c, dt);
        const t = c.clock - c.rideStart;
        // The therapist kneads: hands press, then lift.
        castLook(c, "therapist", { pose: Math.floor(t / 1.4) % 2 ? "tuck" : "grip" });
        // Their hands work down your back.
        const a = c.actors.therapist;
        if (a) a.pos.x = by.x - 0.5 + Math.sin(t * 0.4) * 0.5;
        tele.score = Math.round((calm / Math.max(1, t)) * 100); tele.progress = t / LEN; tele.time = t;
        return t >= LEN || rideIO.input.exit;
      },
    },
    { enter: (c) => { tele.breath = -1; tele.prompt = ""; c.ui({ steamAt: undefined }); castLook(c, "therapist", { anim: "wave", pose: undefined }); c.pos.set(track.exit[0], 0, track.exit[1]); c.look({ anim: "idle", body: "stand", prop: null }); flash("✨ You feel brand new"); }, update: (c) => c.t > 1.2 },
    { enter: () => {
      const pct = tele.score;
      result({
        rideId: ride.id, headline: pct >= 80 ? "🧘 Total bliss" : pct >= 50 ? "😌 Nicely relaxed" : "😬 Still a bit tense…",
        stars: pct >= 80 ? 3 : pct >= 50 ? 2 : 1, stats: [{ label: "Calm", value: `${pct}%` }],
        best: { value: pct, label: `${pct}% calm` },
      });
    }, update: () => false },
  ];
}

/** The sauna: the heat climbs; leave in the green zone, not before, not after. */
function sauna(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const { at, d } = SPA.sauna;
  const door = new THREE.Vector3(at[0], 0, at[1] + d / 2 + 0.1);
  const bench = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const FULL = 32;
  let heat = 0, taps = 0, fainted = false;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1]), door.clone(), bench.clone()]),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; yawQ(c.quat, 0);
        c.look({ anim: "sit", body: "stand", prop: null });
        c.cam = "fixed";
        c.camAt = new THREE.Vector3(at[0] + 0.55, 1.7, at[1] + d / 2 - 0.15);
        c.camLook = bench.clone().add(new THREE.Vector3(0, 0.8, 0));
        c.ui({ steamAt: [at[0] + 0.7, 0.7, at[1] + d / 2 - 0.4] });
        tele.phase = "Feel the heat… leave in the green zone"; tele.prompt = "Leave now"; tele.holdButton = false;
      },
      update: (c, dt) => {
        heat = Math.min(1, heat + dt / FULL);
        tele.meterLabel = "Heat"; tele.meter = heat;
        tele.progress = heat; tele.time = c.clock - c.rideStart;
        if (heat > 0.85 && Math.floor(c.clock * 2) % 2) c.look({ anim: "sit", pose: "armsCrossed", body: "stand", prop: null });
        if (heat >= 1) { fainted = true; flash("🥵 Too hot! Out you go!"); return true; }
        return rideIO.input.taps > taps;
      },
    },
    { enter: (c) => { tele.meterLabel = ""; tele.prompt = ""; c.ui({ steamAt: undefined }); c.look({ anim: "walk", body: "stand", prop: null }); }, update: () => true },
    walk(() => [door.clone(), new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const pct = Math.round(heat * 100);
      const zone = !fainted && heat >= 0.7 && heat <= 0.9;
      result({
        rideId: ride.id, headline: fainted ? "🥵 Overheated!" : zone ? "🔥 Perfectly cooked" : heat < 0.7 ? "🥶 Barely warmed up" : "😅 Just in time",
        stars: zone ? 3 : fainted || heat < 0.45 ? 1 : 2, stats: [{ label: "Heat", value: `${pct}%` }, { label: "Time inside", value: secs(heat * FULL) }],
      });
    }, update: () => false },
  ];
}

/** The cold plunge: in you go, and tap to keep breathing for ten seconds. */
function plunge(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const water = track.water!;
  const into = new THREE.Vector3(water.at[0] + 1.3, -0.8, water.at[1]);
  const LEN = 10;
  let air = 1, taps = 0, lasted = 0, gaveUp = false;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    jump(() => into.clone(), 0.6, 0.6, false),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; yawQ(c.quat, 0);
        c.splash(into.clone().setY(0.35), 1.6);
        c.look({ anim: "idle", pose: "armsCrossed", body: "stand", prop: null });
        c.cam = "fixed";
        c.camAt = into.clone().add(new THREE.Vector3(0.4, 2.2, 2.8));
        c.camLook = into.clone().add(new THREE.Vector3(0, 1.2, 0));
        tele.phase = "🥶 SO COLD! Keep breathing!"; tele.prompt = "Tap to breathe"; tele.holdButton = false;
        flash("🧊 Brrrr!");
      },
      update: (c, dt) => {
        const t = c.clock - c.rideStart;
        if (rideIO.input.taps > taps) { taps = rideIO.input.taps; air = Math.min(1, air + 0.12); }
        air = Math.max(0, air - dt * 0.45);
        // Shivering.
        c.data.lean = Math.sin(c.clock * 40) * 0.04;
        tele.meterLabel = "Breath"; tele.meter = air;
        lasted = t; tele.progress = t / LEN; tele.time = t;
        if (air <= 0) { gaveUp = true; flash("😵 Out you get!"); return true; }
        return t >= LEN;
      },
    },
    { enter: (c) => { c.data.lean = 0; tele.meterLabel = ""; tele.prompt = ""; c.pos.set(track.exit[0], 0, track.exit[1]); c.look({ anim: gaveUp ? "idle" : "clap", body: "stand", prop: null }); }, update: (c) => c.t > 0.8 },
    { enter: () => result({
      rideId: ride.id, headline: gaveUp ? "🥶 Too cold for you!" : "💪 Ice-cold warrior",
      stars: gaveUp ? 1 : air > 0.4 ? 3 : 2, stats: [{ label: "Lasted", value: `${Math.min(LEN, lasted).toFixed(1)} s` }],
      best: { value: Math.round(Math.min(LEN, lasted) * 10) / 10, label: `${Math.min(LEN, lasted).toFixed(1)} s` },
    }), update: () => false },
  ];
}

/** Sink into the bubbles; get out whenever you like. */
function jacuzzi(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const { at } = SPA.jacuzzi;
  const seat = new THREE.Vector3(track.spots!.me[0], -0.22, track.spots!.me[1]);
  const LEN = 30;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    jump(() => seat.clone(), 0.35, 0.5, false),
    {
      enter: (c) => {
        c.rideStart = c.clock; yawQ(c.quat, Math.PI / 2);
        c.look({ anim: "sit", body: "stand", prop: null });
        c.cam = "fixed";
        c.camAt = new THREE.Vector3(at[0] + 2.2, 1.9, at[1] + 2);
        c.camLook = new THREE.Vector3(at[0], 0.6, at[1]);
        tele.phase = "🫧 Aaaah… pure relaxation"; tele.prompt = "";
      },
      update: (c) => {
        const t = c.clock - c.rideStart;
        tele.progress = t / LEN; tele.time = t;
        return t >= LEN || rideIO.input.exit;
      },
    },
    { enter: (c) => { c.pos.set(track.exit[0], 0, track.exit[1]); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.5 },
    { enter: (c) => {
      const t = Math.min(LEN, c.clock - c.rideStart);
      result({ rideId: ride.id, stars: t >= 25 ? 3 : t >= 12 ? 2 : 1, stats: [{ label: "Soaked for", value: secs(t) }] });
    }, update: () => false },
  ];
}

/** Lie back with a face mask and cucumbers on your eyes; take a selfie for your story. */
function faceMask(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const lie = track.lie!;
  const LEN = 20;
  let selfie = false;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    {
      enter: (c) => {
        c.rideStart = c.clock; rideIO.input.photos = 0;
        c.pos.set(...lie.feet); yawQ(c.quat, lie.yaw);
        c.look({ anim: "sleep", body: "lie", prop: null, mask: true, recline: LOUNGER_RECLINE });
        // Filmed from beside the lounger, looking at the face.
        c.cam = "fixed";
        const headDir = new THREE.Vector3(-Math.sin(lie.yaw), 0, -Math.cos(lie.yaw));
        const side = new THREE.Vector3(headDir.z, 0, -headDir.x);
        const head = c.pos.clone().addScaledVector(headDir, 1.5).setY(c.pos.y + 0.5);
        c.camAt = head.clone().addScaledVector(headDir, -0.5).addScaledVector(side, 1.3).add(new THREE.Vector3(0, 0.9, 0));
        c.camLook = head.clone();
        tele.phase = "🥒 Cucumbers on… relax"; tele.panel = "photo"; tele.prompt = "";
      },
      update: (c) => {
        const t = c.clock - c.rideStart;
        if (rideIO.input.photos > 0 && !selfie) { selfie = true; flash("🤳 Selfie posted to your story!"); }
        tele.progress = t / LEN; tele.time = t;
        return t >= LEN || rideIO.input.exit;
      },
    },
    { enter: (c) => { tele.panel = ""; c.pos.set(track.exit[0], 0, track.exit[1]); c.look({ anim: "idle", body: "stand", prop: null }); flash("✨ Glowing!"); }, update: (c) => c.t > 1 },
    { enter: () => result({ rideId: ride.id, headline: "✨ Skin: glowing", stars: selfie ? 3 : 2, stats: [{ label: "Selfie", value: selfie ? "Posted 🤳" : "None" }] }), update: () => false },
  ];
}

// ---------------------------------------------------------------- attractions

/** The lift (or wheel cabin) up: rises with the floor count, shows the city as it clears the roof. */
function liftUp(ride: RideDef, track: Track, up = true): Step {
  const top = LOBBY.liftTop;
  const [lx, lz] = track.spots!.me;
  return {
    enter: (c) => {
      c.cam = "fixed"; c.data.snap = 0;
      rideIO.tele.phase = up ? (ride.floors ? "Going up…" : "The cabin climbs…") : "Going back down…"; rideIO.tele.prompt = "";
      c.look({ anim: "idle", body: "stand", prop: null });
      yawQ(c.quat, Math.PI / 4);
    },
    update: (c) => {
      const k = Math.min(1, c.t / (up ? 7 : 4.5));
      const y = up ? top * ease(k) : top * (1 - ease(k));
      c.pos.set(lx, y, lz);
      c.ui({ liftY: y });
      if (ride.floors) rideIO.tele.score = Math.round((y / top) * ride.floors);
      c.camAt = new THREE.Vector3(lx + 4.5, y + 2.6, lz + 5.5);
      c.camLook = new THREE.Vector3(lx, y + 1, lz);
      return k >= 1;
    },
  };
}

/** Up to the deck, then a telescope that pans the horizon: tap when a landmark is in the crosshair. */
function observe(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const marks = ride.landmarks ?? [];
  const [lx, lz] = track.spots!.me;
  const LIMIT = 50, PAN = 22; // seconds, degrees a second
  let found = 0, idx = 0, taps = 0, view = 0, misses = 0;
  const bearingOf = (yawDeg: number) => ((yawDeg % 360) + 360) % 360;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1]), new THREE.Vector3(lx, 0, lz)]),
    { enter: (c) => c.ui({ city: [lx, lz], liftY: 0 }), update: () => true },
    liftUp(ride, track, true),
    {
      enter: (c) => {
        c.rideStart = c.clock; taps = rideIO.input.taps; view = marks[0] ? marks[0].bearing - 150 : 0;
        c.data.snap = 1; tele.panel = "photo"; tele.prompt = "";
        tele.phase = marks[0] ? `🔭 Find: ${marks[0].name}` : "Enjoy the view";
        c.look({ anim: "idle", body: "stand", prop: null });
      },
      update: (c, dt) => {
        view += PAN * dt;
        const yaw = (view * Math.PI) / 180;
        const eye = new THREE.Vector3(lx, LOBBY.liftTop + 1.65, lz);
        const fwd = new THREE.Vector3(Math.sin(yaw), -0.22, -Math.cos(yaw)).normalize();
        // Just in front of the face (looking through the telescope, not the back of the head).
        c.camAt = eye.clone().addScaledVector(fwd, 0.5);
        c.camLook = eye.clone().addScaledVector(fwd, 10);
        yawQ(c.quat, Math.atan2(fwd.x, fwd.z));
        // A tap (the camera button) checks the crosshair against the landmark being looked for.
        if (rideIO.input.photos > taps) {
          taps = rideIO.input.photos;
          const m = marks[idx];
          if (m) {
            const off = Math.abs(((bearingOf(view) - m.bearing + 540) % 360) - 180);
            if (off < 9) {
              found++; idx++; flash(`🎯 Found ${m.name}!`);
              tele.phase = marks[idx] ? `🔭 Find: ${marks[idx].name}` : "🔭 All found — enjoy the view!";
            } else { misses++; flash(off < 25 ? "Close — a little more…" : "Not that one"); }
          }
        }
        tele.score = found; tele.count = marks.length; tele.progress = (c.clock - c.rideStart) / LIMIT; tele.time = c.clock - c.rideStart;
        // All found: enjoy the view a moment longer, then head down.
        if (idx >= marks.length) {
          if (c.data.doneAt === undefined) c.data.doneAt = c.clock - c.rideStart;
          return c.clock - c.rideStart - c.data.doneAt > 2.5;
        }
        return c.clock - c.rideStart >= LIMIT || rideIO.input.exit;
      },
    },
    { enter: (c) => { c.data.snap = 0; tele.panel = ""; }, update: () => true },
    liftUp(ride, track, false),
    { enter: (c) => c.ui({ city: undefined, liftY: undefined }), update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: (c) => result({
      rideId: ride.id, headline: found === marks.length ? "🔭 Spotted them all!" : undefined,
      stars: found === marks.length ? (misses <= 1 ? 3 : 2) : found ? 2 : 1,
      stats: [{ label: "Landmarks", value: `${found}/${marks.length}` }, { label: "Time", value: secs(Math.min(LIMIT, c.data.doneAt ?? LIMIT)) }],
      best: found === marks.length ? { value: Math.round(c.data.doneAt ?? LIMIT), label: secs(c.data.doneAt ?? LIMIT), lowerIsBetter: true } : undefined,
    }), update: () => false },
  ];
}

/** Up to the top of the Frame and across the glass bridge: hold to walk; when the glass cracks, let go! */
function glassBridge(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const [lx, lz] = track.spots!.me;
  const top = LOBBY.liftTop, LEN = LOBBY.bridge;
  let x = 0, crackAt = -1, freezeOk = false, cracks = 0, frozen = 0, screamed = 0, nextCrack = 2.5, walking = false;
  return [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1]), new THREE.Vector3(lx, 0, lz)]),
    { enter: (c) => c.ui({ city: [lx, lz], liftY: 0, bridge: true }), update: () => true },
    liftUp(ride, track, true),
    {
      enter: (c) => {
        c.rideStart = c.clock; x = 0; yawQ(c.quat, -Math.PI / 2);
        tele.phase = "Hold to walk across… freeze if the glass cracks!"; tele.prompt = "Hold to walk"; tele.holdButton = true;
        c.cam = "fixed";
      },
      update: (c, dt) => {
        const now = c.clock - c.rideStart;
        if (crackAt >= 0) {
          // You have 0.7 s to stop dead.
          if (!rideIO.input.down) freezeOk = true;
          if (c.clock - crackAt > 0.7) {
            if (freezeOk) { frozen++; flash("😮‍💨 Phew… it's just an effect!"); }
            else { screamed++; flash("😱 AAAH!"); c.look({ anim: "idle", pose: "armsUp", body: "stand", prop: null }); }
            crackAt = -1; c.ui({ crackAt: null }); nextCrack = now + 2 + Math.random() * 2.5;
          }
        } else {
          walking = rideIO.input.down;
          if (walking) x = Math.min(LEN - 0.6, x + dt * 0.9);
          c.look(walking ? { anim: "walk", body: "stand", prop: null } : { anim: "idle", body: "stand", prop: null });
          if (walking && now >= nextCrack && x < LEN - 1.5) {
            crackAt = c.clock; freezeOk = false; cracks++;
            flash("💥 CRACK!");
            c.ui({ crackAt: [lx - x - 0.5, top + 0.01, lz] });
          }
        }
        c.pos.set(lx - x - 0.8, top, lz);
        c.camAt = new THREE.Vector3(c.pos.x + 3.4, top + 2.2, lz + 3.6);
        c.camLook = c.pos.clone().add(new THREE.Vector3(-1, -0.3, 0));
        tele.progress = x / (LEN - 0.6); tele.score = frozen; tele.count = cracks; tele.time = now;
        return x >= LEN - 0.6;
      },
    },
    { enter: (c) => { tele.prompt = ""; c.ui({ crackAt: null }); flash("🎉 Made it across!"); c.look({ anim: "clap", body: "stand", prop: null }); }, update: (c) => c.t > 1.2 },
    {
      // Back along the bridge to the lift.
      enter: (c) => { c.look({ anim: "walk", body: "stand", prop: null }); yawQ(c.quat, Math.PI / 2); },
      update: (c, dt) => { c.pos.x = Math.min(lx, c.pos.x + dt * 2.2); c.camAt = new THREE.Vector3(c.pos.x + 3.4, top + 2.2, lz + 3.6); c.camLook = c.pos.clone(); return c.pos.x >= lx; },
    },
    liftUp(ride, track, false),
    { enter: (c) => c.ui({ city: undefined, liftY: undefined, bridge: false }), update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const calm = cracks ? Math.round((frozen / cracks) * 100) : 100;
      result({
        rideId: ride.id, headline: screamed ? "😱 Nerves of… jelly" : "🧊 Nerves of steel",
        stars: screamed === 0 ? 3 : calm >= 50 ? 2 : 1,
        stats: [{ label: "Cracks", value: String(cracks) }, { label: "Kept your cool", value: `${calm}%` }],
        best: { value: calm, label: `${calm}% calm` },
      });
    }, update: () => false },
  ];
}

/** Through the tunnel: snap the star creature when it's right in your viewfinder. */
function aquariumTunnel(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const door = new THREE.Vector3(track.approach[0], 0, track.approach[1]);
  const start = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const end = new THREE.Vector3(track.spots!.them![0], 0, track.spots!.them![1]);
  const centre = new THREE.Vector3(track.spots!.centre![0], 0, track.spots!.centre![1]);
  const L = 14;
  const MAX = 3;
  let shots = 0, best = 0, seen = 0;
  const target = ride.target ?? "shark";
  return [
    walk(() => [door.clone()]),
    { enter: (c) => { tele.fadeAt = performance.now(); c.ui({ tunnel: true }); }, update: (c) => c.t > 0.45 },
    {
      enter: (c) => {
        c.pos.copy(start); yawQ(c.quat, Math.PI); c.rideStart = c.clock; seen = rideIO.input.photos;
        c.cam = "fixed"; c.data.snap = 0;
        tele.phase = `📸 Snap the ${target} when it's in the frame (${MAX} shots)`; tele.panel = "photo";
        c.look({ anim: "walk", body: "stand", prop: null });
      },
      update: (c, dt) => {
        const d = c.pos.z - end.z;
        if (d > 0.05) c.pos.z -= Math.min(d, dt * 0.55);
        // Behind and above you, looking up the tunnel: the creatures pass overhead.
        const eye = c.pos.clone().add(new THREE.Vector3(0.35, 1.35, 2.6));
        const look = c.pos.clone().add(new THREE.Vector3(0, 2.3, -5));
        c.camAt = eye; c.camLook = look;
        if (rideIO.input.photos > seen && shots < MAX) {
          seen = rideIO.input.photos; shots++;
          const who = tunnelCreatureAt(c.clock, L).add(centre);
          const fwd = look.clone().sub(eye).normalize();
          const to = who.clone().sub(eye);
          const angle = (fwd.angleTo(to) * 180) / Math.PI;
          const q = to.length() < 10 && angle < 16 ? 1 - angle / 16 : 0;
          best = Math.max(best, q);
          flash(q > 0.7 ? `📸 Amazing ${target} shot!` : q > 0.3 ? `📸 Got the ${target}!` : q > 0 ? "📸 Just the tail…" : "📸 Missed it — just fish");
          if (shots >= MAX) tele.panel = "";
        }
        tele.score = Math.round(best * 100); tele.count = MAX - shots; tele.progress = 1 - d / (start.z - end.z); tele.time = c.clock - c.rideStart;
        return d <= 0.05 || rideIO.input.exit;
      },
    },
    { enter: (c) => { tele.panel = ""; tele.fadeAt = performance.now(); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.45 },
    { enter: (c) => { c.ui({ tunnel: false }); c.pos.copy(door); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const pct = Math.round(best * 100);
      result({
        rideId: ride.id, headline: pct >= 70 ? `📸 Postcard-perfect ${target}!` : pct > 0 ? `📸 You got the ${target}` : `🐟 The ${target} got away`,
        stars: pct >= 70 ? 3 : pct > 0 ? 2 : 1, stats: [{ label: "Best photo", value: `${pct}%` }, { label: "Photos taken", value: String(shots) }],
        best: { value: pct, label: `${pct}%` },
      });
    }, update: () => false },
  ];
}

const WAX_POSES: Array<{ label: string; pose: BodyPose }> = [
  { label: "🙌 Arms up", pose: "armsUp" }, { label: "🙅 Arms crossed", pose: "armsCrossed" },
  { label: "🤸 Arms out", pose: "balance" }, { label: "🎤 Mic in hand", pose: "mic" },
];
const WAX_FIGURES = [
  { title: "Pop star", gender: "woman" as const, preset: "Female_Adult_01" },
  { title: "Football legend", gender: "man" as const, preset: "Male_Adult_08" },
  { title: "Movie star", gender: "man" as const, preset: "Male_Adult_04" },
];

/** Strike the wax figure's pose before the flash: three figures, three selfies. */
function waxSelfies(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const spots = LOBBY.wax;
  let matched = 0;
  const poses = WAX_FIGURES.map(() => WAX_POSES[Math.floor(Math.random() * WAX_POSES.length)]);
  const steps: Step[] = [{
    enter: (c) => {
      c.ui({ plinths: spots });
      WAX_FIGURES.forEach((f, i) => {
        const at = new THREE.Vector3(spots[i][0], 0.39, spots[i][1]);
        setCast(c, { id: `wax${i}`, gender: f.gender, preset: f.preset, anim: "idle", pose: poses[i].pose }, at, 0);
      });
    },
    update: () => true,
  }];
  WAX_FIGURES.forEach((f, i) => {
    const fig = new THREE.Vector3(spots[i][0], 0, spots[i][1]);
    const stand = fig.clone().add(new THREE.Vector3(0.75, 0, 0.6));
    let deadline = 0;
    steps.push(
      walk(() => [stand.clone()]),
      {
        enter: (c) => {
          yawQ(c.quat, 0);
          // Both face the camera, out in front of them.
          if (c.actors[`wax${i}`]) c.actors[`wax${i}`].yaw = 0;
          c.cam = "fixed";
          c.camAt = fig.clone().add(new THREE.Vector3(0.4, 1.7, 3.6));
          c.camLook = fig.clone().add(new THREE.Vector3(0.4, 1.2, 0));
          tele.options = WAX_POSES.map((p) => p.label); rideIO.input.choice = -1;
          tele.phase = `🤳 The ${f.title}: copy the pose!`; deadline = c.clock + 3.5;
          c.look({ anim: "idle", body: "stand", prop: null });
        },
        update: (c) => {
          tele.countdown = Math.max(0, Math.ceil(deadline - c.clock));
          if (rideIO.input.choice >= 0 && tele.options.length) {
            const pick = WAX_POSES[rideIO.input.choice];
            tele.options = [];
            c.look({ anim: "idle", pose: pick.pose, body: "stand", prop: null });
            if (pick.pose === poses[i].pose) { matched++; flash("📸 Twinning!"); } else flash("📸 …not quite the same pose");
            c.data.shotAt = c.clock;
          }
          if (c.clock >= deadline && tele.options.length) { tele.options = []; flash("📸 Too slow — caught mid-pose!"); c.data.shotAt = c.clock; }
          return !tele.options.length && c.clock - (c.data.shotAt ?? c.clock) > 1.3;
        },
      },
      {
        // On to the next figure, the camera following again.
        enter: (c) => { tele.countdown = 0; c.cam = "chase"; tele.phase = i < WAX_FIGURES.length - 1 ? "🚶 On to the next figure…" : "📸 That's the set!"; c.look({ anim: "idle", body: "stand", prop: null }); },
        update: () => true,
      },
    );
  });
  steps.push(
    { enter: (c) => { c.cam = "chase"; c.ui({ plinths: [] }); WAX_FIGURES.forEach((_, i) => { c.cast = c.cast.filter((m) => m.id !== `wax${i}`); }); c.ui({ cast: c.cast }); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: matched === 3 ? "🤳 Three perfect twins!" : undefined,
      stars: matched === 3 ? 3 : matched >= 1 ? 2 : 1, stats: [{ label: "Poses matched", value: `${matched}/3` }, { label: "Selfies", value: "3 posted 🤳" }],
      best: { value: matched, label: `${matched}/3` },
    }), update: () => false },
  );
  return steps;
}

/** Headset on, step off a supertall tower in VR, and hold Brake to stop just above the ground. */
function vrDrop(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const [wx, wz] = LOBBY.vrWorld;
  const H = LOBBY.vrTower;
  const SHOWN = 828 / H; // the height shown as the real tower's metres
  const spot = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  let y = H, v = 0, crashed = false, stopAt = -1;
  const g = 9.81 * 0.6, brake = g * 3.2;
  return [
    walk(() => [spot.clone()]),
    { enter: (c) => { c.look({ anim: "idle", body: "stand", prop: null, headset: true }); tele.phase = "Headset on…"; }, update: (c) => c.t > 1.2 },
    { enter: (c) => { tele.fadeAt = performance.now(); c.ui({ vr: true, city: [wx, wz] }); }, update: (c) => c.t > 0.45 },
    {
      enter: (c) => {
        c.pos.set(wx, H, wz + 3); yawQ(c.quat, 0); c.data.snap = 1;
        c.cam = "fixed";
        tele.phase = "🥽 828 m up. Step off when you're ready…"; tele.prompt = "Jump!"; tele.holdButton = false; c.data.taps = rideIO.input.taps;
        c.look({ anim: "idle", pose: "balance", body: "stand", prop: null, headset: true });
      },
      update: (c) => {
        c.camAt = c.pos.clone().add(new THREE.Vector3(2.5, 2.5, 5)); c.camLook = c.pos.clone().add(new THREE.Vector3(0, -6, -2));
        return rideIO.input.taps > c.data.taps;
      },
    },
    {
      enter: (c) => {
        c.rideStart = c.clock; tele.phase = "FALLING! Hold Brake to stop just above the ground"; tele.prompt = "Hold to brake"; tele.holdButton = true;
        c.look({ anim: "idle", pose: "balance", body: "prone", prop: null, headset: true });
      },
      update: (c, dt) => {
        v += (g - (rideIO.input.down ? brake : 0)) * dt;
        if (v < 0) { v = 0; if (stopAt < 0) stopAt = y; }
        if (stopAt >= 0) { y = Math.max(0, y - dt * 2); } else y -= v * dt;
        c.pos.set(wx, Math.max(0.1, y) + 0.3, wz + 3);
        c.camAt = c.pos.clone().add(new THREE.Vector3(0, 4, 3)); c.camLook = c.pos.clone().add(new THREE.Vector3(0, -8, -1));
        c.speed = v * 3.6 * SHOWN * 0.35; c.top = Math.max(c.top, c.speed);
        tele.score = Math.max(0, Math.round(y * SHOWN)); tele.progress = 1 - y / H;
        if (y <= 0 && stopAt < 0) { crashed = v > 2.5; if (!crashed) stopAt = 0; return true; }
        return stopAt >= 0 && y <= 0;
      },
    },
    { enter: (c) => { flash(crashed ? "💥 SPLAT! (Good thing it's VR)" : stopAt * SHOWN <= 40 ? "🎯 Perfect landing!" : "🪂 Safe… but you stopped way up high"); c.look({ anim: crashed ? "idle" : "clap", body: "stand", prop: null, headset: true }); c.pos.y = 0; c.speed = 0; tele.prompt = ""; }, update: (c) => c.t > 1.6 },
    { enter: () => { tele.fadeAt = performance.now(); }, update: (c) => c.t > 0.45 },
    { enter: (c) => { c.data.snap = 0; c.cam = "chase"; c.ui({ vr: false, city: undefined }); c.pos.copy(spot); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.6 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: (c) => {
      const stopM = Math.round(Math.max(0, stopAt) * SHOWN);
      result({
        rideId: ride.id, headline: crashed ? "💥 Splat! (only VR)" : stopM <= 40 ? "🎯 Inch-perfect stop!" : "🪂 You lived!",
        stars: crashed ? 1 : stopM <= 40 ? 3 : stopM <= 150 ? 2 : 1,
        stats: [{ label: "Stopped at", value: crashed ? "The ground 😬" : `${stopM} m up` }, { label: "Top speed", value: `${Math.round(c.top)} km/h` }],
        best: crashed ? undefined : { value: stopM, label: `${stopM} m`, lowerIsBetter: true },
      });
    }, update: () => false },
  ];
}

// ---------------------------------------------------------------- shops

const OCCASION_BRIEF: Record<string, string> = {
  work: "a big meeting in DIFC", night: "a night out at a rooftop club", formal: "a wedding at the Burj Al Arab",
  beach: "a day at the beach club", sport: "a morning run on Kite Beach", traditional: "Eid with the family", everyday: "brunch in the Marina",
};

/** The stylist names an occasion; pick an outfit, change, and walk it to the mirror. Three looks. */
function styleChallenge(ride: RideDef, track: Track, result: (r: RideResult) => void, gender: "woman" | "man"): Step[] {
  const tele = rideIO.tele;
  const runway = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const door = new THREE.Vector3(track.spots!.them![0], 0, track.spots!.them![1]);
  const stylistAt = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  const mine = OUTFITS.filter((o) => o.gender === gender && o.occasion !== "uniform");
  const occasions = [...new Set(mine.map((o) => o.occasion))].filter((o) => OCCASION_BRIEF[o]).sort(() => Math.random() - 0.5).slice(0, 3);
  let right = 0;
  const steps: Step[] = [
    walk(() => [runway.clone()]),
    { enter: (c) => { setCast(c, { id: "stylist", gender: "woman", preset: "Female_Adult_05", anim: "talk" }, stylistAt, flatYaw(stylistAt, runway)); }, update: () => true },
  ];
  occasions.forEach((occ, round) => {
    // One outfit that fits the occasion and two that don't, shuffled.
    const good = mine.filter((o) => o.occasion === occ);
    const bad = mine.filter((o) => o.occasion !== occ).sort(() => Math.random() - 0.5).slice(0, 2);
    const choices = [good[Math.floor(Math.random() * good.length)], ...bad].sort(() => Math.random() - 0.5);
    let picked = -1;
    steps.push(
      {
        enter: (c) => {
          c.cam = "fixed";
          c.camAt = runway.clone().add(new THREE.Vector3(0.6, 1.7, 3.6));
          c.camLook = runway.clone().add(new THREE.Vector3(0.5, 1.1, 0));
          tele.phase = `👗 Look ${round + 1}/3: "Something for ${OCCASION_BRIEF[occ]}"`;
          tele.options = choices.map((o) => o.label); rideIO.input.choice = -1;
          castLook(c, "stylist", { anim: "talk" });
        },
        update: () => { if (rideIO.input.choice >= 0) { picked = rideIO.input.choice; tele.options = []; return true; } return false; },
      },
      walk(() => [door.clone()]),
      { enter: (c) => { tele.fadeAt = performance.now(); tele.phase = "Changing…"; c.data.changeAt = c.clock; }, update: (c) => c.t > 0.45 },
      { enter: (c) => { tele.phase = `👠 Walk the ${choices[picked].label.toLowerCase()} to the mirror`; c.look({ anim: "walk", body: "stand", prop: null, wear: choices[picked].id }); }, update: (c) => c.t > 0.5 },
      walk(() => [runway.clone()], 1.2),
      {
        // The runway turn in front of the mirror.
        enter: (c) => { yawQ(c.quat, 0); c.look({ anim: "idle", pose: "balance", body: "stand", prop: null, wear: choices[picked].id }); },
        update: (c) => {
          c.spin = Math.PI * 2 * ease(Math.min(1, c.t / 1.2));
          if (c.t >= 1.2 && !c.data[`judged${round}`]) {
            c.data[`judged${round}`] = 1; c.spin = 0;
            const ok = choices[picked].occasion === occ;
            if (ok) right++;
            flash(ok ? "😍 “Perfect for it!”" : "🤔 “Hmm… not quite the vibe”");
            castLook(c, "stylist", { anim: ok ? "clap" : "talk" });
          }
          return c.t > 2.4;
        },
      },
    );
  });
  steps.push(
    { enter: (c) => { tele.phase = "Back into your own clothes…"; tele.fadeAt = performance.now(); }, update: (c) => c.t > 0.45 },
    { enter: (c) => { c.look({ anim: "idle", body: "stand", prop: null }); c.cam = "chase"; castLook(c, "stylist", { anim: "wave" }); }, update: (c) => c.t > 0.6 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: right === 3 ? "💅 Style icon!" : right >= 2 ? "👌 Great eye" : "🙈 Fashion is hard",
      stars: right === 3 ? 3 : right >= 1 ? 2 : 1, stats: [{ label: "Looks nailed", value: `${right}/3` }], best: { value: right, label: `${right}/3` },
    }), update: () => false },
  );
  return steps;
}

const PRODUCT_EMOJI = (p: Product) => p.icon || "🛍️";

/** Memorise the list (with aisles), then push the trolley to each aisle from memory; scan it all at the till. */
function trolleyDash(ride: RideDef, track: Track, result: (r: RideResult) => void, products: Product[]): Step[] {
  const tele = rideIO.tele;
  const { aisles, till } = SHOPS.market;
  const pool = products.filter((p) => !p.service).sort(() => Math.random() - 0.5);
  const list = pool.slice(0, Math.min(4, pool.length)).map((p) => ({ p, aisle: Math.floor(Math.random() * aisles.length) }));
  const front = (i: number) => new THREE.Vector3(aisles[i][0], 0, aisles[i][1] + 1.0);
  let wrong = 0, got = 0;
  const steps: Step[] = [
    walk(() => [new THREE.Vector3(track.approach[0], 0, track.approach[1])]),
    {
      enter: (c) => {
        c.rideStart = c.clock; c.ui({ aisles: true });
        c.look({ anim: "idle", pose: "grip", body: "stand", prop: null, trolley: 0 });
        tele.phase = "📝 Remember: " + list.map((x) => `${PRODUCT_EMOJI(x.p)} ${x.p.name} → aisle ${x.aisle + 1}`).join(" · ");
        tele.countdown = 5;
      },
      update: (c) => { tele.countdown = Math.max(0, Math.ceil(5 - c.t)); return c.t >= 5; },
    },
  ];
  list.forEach((item, k) => {
    let target = -1;
    steps.push(
      {
        enter: () => { tele.countdown = 0; tele.phase = `🛒 Which aisle for ${PRODUCT_EMOJI(item.p)} ${item.p.name}?`; tele.options = aisles.map((_, i) => `Aisle ${i + 1}`); rideIO.input.choice = -1; },
        update: () => { if (rideIO.input.choice >= 0) { target = rideIO.input.choice; tele.options = []; return true; } return false; },
      },
      walk(() => [front(target)], 1.7, "walk"),
      {
        enter: (c) => {
          yawQ(c.quat, Math.PI);
          if (target === item.aisle) { got++; flash(`✅ ${item.p.name} in the trolley`); c.look({ anim: "idle", pose: "armsUp", body: "stand", prop: null, trolley: got }); }
          else { wrong++; flash(`❌ Not in aisle ${target + 1}! It was aisle ${item.aisle + 1}`); }
        },
        update: (c) => c.t > 0.8,
      },
      // A wrong guess means a trip to the right aisle too.
      { enter: () => {}, update: () => true },
      walk(() => (target === item.aisle ? [] : [front(item.aisle)]), 1.7),
      {
        enter: (c) => { if (target !== item.aisle) { got++; c.look({ anim: "idle", pose: "armsUp", body: "stand", prop: null, trolley: got }); } tele.progress = (k + 1) / (list.length + 1); },
        update: (c) => c.t > (target === item.aisle ? 0 : 0.6),
      },
    );
  });
  let scanned = 0, taps = 0;
  steps.push(
    walk(() => [new THREE.Vector3(till[0] - 1, 0, till[1] - 0.2)], 1.7),
    {
      enter: (c) => { yawQ(c.quat, Math.PI / 2); taps = rideIO.input.taps; tele.phase = "🧾 Self-checkout: scan everything!"; tele.prompt = "Tap to scan"; tele.holdButton = false; c.look({ anim: "idle", pose: "grip", body: "stand", prop: null, trolley: got }); },
      update: (c) => {
        if (rideIO.input.taps > taps) { taps = rideIO.input.taps; scanned++; flash(`📟 Beep! ${scanned}/${list.length}`); c.look({ anim: "idle", pose: "grip", body: "stand", prop: null, trolley: Math.max(0, got - scanned) }); }
        tele.progress = (list.length + scanned / list.length) / (list.length + 1);
        return scanned >= list.length;
      },
    },
    { enter: (c) => { c.data.endAt = c.clock; tele.prompt = ""; c.ui({ aisles: false }); flash("🛍️ All paid!"); c.look({ anim: "idle", body: "stand", prop: null }); }, update: (c) => c.t > 0.8 },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: (c) => {
      const t = c.data.endAt - c.rideStart;
      result({
        rideId: ride.id, headline: wrong === 0 ? "🧠 Memory of an elephant!" : undefined,
        stars: wrong === 0 ? 3 : wrong <= 1 ? 2 : 1,
        stats: [{ label: "Right first time", value: `${list.length - wrong}/${list.length}` }, { label: "Time", value: secs(t) }],
        best: wrong === 0 ? { value: t, label: secs(t), lowerIsBetter: true } : undefined,
      });
    }, update: () => false },
  );
  return steps;
}

const SCENTS = [
  { label: "🪵 Oud", hint: "Warm, smoky and woody: the soul of Arabian perfume", mist: "#b45309" },
  { label: "🌹 Rose", hint: "Sweet, soft and deeply floral", mist: "#f472b6" },
  { label: "🍋 Citrus", hint: "Fresh, zesty and bright, like a lemon grove", mist: "#facc15" },
  { label: "🌸 Jasmine", hint: "Heady white flowers on a summer night", mist: "#f8fafc" },
];

/** Spray three testers and name each scent family from its description. */
function perfumeTest(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const adv = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  const rounds = [...SCENTS].sort(() => Math.random() - 0.5).slice(0, 3);
  let right = 0;
  const steps: Step[] = [
    walk(() => [me.clone()]),
    {
      enter: (c) => {
        yawQ(c.quat, Math.PI);
        setCast(c, { id: "advisor", gender: "woman", preset: "Female_Adult_01", anim: "talk" }, adv, flatYaw(adv, me));
        c.cam = "fixed";
        c.camAt = me.clone().add(new THREE.Vector3(-1.5, 1.8, 2));
        c.camLook = me.clone().add(new THREE.Vector3(0, 1.3, -0.7));
      },
      update: () => true,
    },
  ];
  rounds.forEach((sc, i) => {
    steps.push(
      {
        enter: (c) => {
          c.look({ anim: "idle", pose: "mic", body: "stand", prop: null });
          c.splash(me.clone().add(new THREE.Vector3(0.25, 1.45, -0.35)), 0.7, sc.mist);
          tele.phase = `🌸 Tester ${i + 1}/3: "${sc.hint}"`;
          tele.options = SCENTS.map((x) => x.label); rideIO.input.choice = -1;
        },
        update: (c) => {
          if (rideIO.input.choice >= 0 && tele.options.length) {
            tele.options = [];
            const ok = SCENTS[rideIO.input.choice].label === sc.label;
            if (ok) right++;
            flash(ok ? `👃 Yes, ${sc.label}!` : `👃 That was ${sc.label}`);
            castLook(c, "advisor", { anim: ok ? "clap" : "talk" });
            c.look({ anim: "idle", body: "stand", prop: null });
            c.data.answered = c.clock;
          }
          return !tele.options.length && c.clock - c.data.answered > 1.4;
        },
      },
    );
  });
  steps.push(
    { enter: (c) => { c.cam = "chase"; castLook(c, "advisor", { anim: "wave" }); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: right === 3 ? "👃 A true nose!" : undefined,
      stars: right === 3 ? 3 : right >= 1 ? 2 : 1, stats: [{ label: "Scents named", value: `${right}/3` }], best: { value: right, label: `${right}/3` },
    }), update: () => false },
  );
  return steps;
}

/** Try on three pieces in the mirror and guess each one's price. */
function jewelGuess(ride: RideDef, track: Track, result: (r: RideResult) => void, products: Product[]): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const jeweller = new THREE.Vector3(track.staffFrom![0], 0, track.staffFrom![1]);
  const pieces = products.filter((p) => !p.service && p.price > 0).sort(() => Math.random() - 0.5).slice(0, 3);
  const round = (n: number) => (n >= 10000 ? Math.round(n / 1000) * 1000 : n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10);
  let right = 0;
  const steps: Step[] = [
    walk(() => [me.clone()]),
    {
      enter: (c) => {
        yawQ(c.quat, Math.PI);
        // On the stool at the counter.
        c.pos.y = 0.29;
        c.look({ anim: "sit", body: "stand", prop: null });
        setCast(c, { id: "jeweller", gender: "man", preset: "Male_Adult_08", anim: "talk" }, jeweller, 0);
        c.cam = "fixed";
        c.camAt = me.clone().add(new THREE.Vector3(1.4, 1.7, 1.5));
        c.camLook = me.clone().add(new THREE.Vector3(0, 1.2, -0.4));
      },
      update: () => true,
    },
  ];
  pieces.forEach((p, i) => {
    const prices = [p.price, round(p.price * (0.35 + Math.random() * 0.2)), round(p.price * (2.2 + Math.random() * 1.2))].sort(() => Math.random() - 0.5);
    steps.push({
      enter: (c) => {
        c.look({ anim: "sit", body: "stand", prop: null, acc: p.wearable ? [p.wearable] : undefined });
        c.splash(me.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.35, "#fde68a");
        tele.phase = `💎 ${p.icon} ${p.name}: what does it cost?`;
        tele.options = prices.map((x) => `AED ${x.toLocaleString()}`); rideIO.input.choice = -1;
      },
      update: (c) => {
        if (rideIO.input.choice >= 0 && tele.options.length) {
          tele.options = [];
          const ok = prices[rideIO.input.choice] === p.price;
          if (ok) right++;
          flash(ok ? "💎 Spot on!" : `💸 It's AED ${p.price.toLocaleString()}`);
          castLook(c, "jeweller", { anim: ok ? "clap" : "talk" });
          c.data.answered = c.clock;
        }
        return !tele.options.length && c.clock - c.data.answered > 1.5;
      },
    });
  });
  steps.push(
    { enter: (c) => { c.pos.y = 0; c.cam = "chase"; c.look({ anim: "idle", body: "stand", prop: null }); castLook(c, "jeweller", { anim: "wave" }); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => result({
      rideId: ride.id, headline: right === pieces.length ? "💎 You know your sparkle!" : undefined,
      stars: right === pieces.length ? 3 : right >= 1 ? 2 : 1, stats: [{ label: "Prices guessed", value: `${right}/${pieces.length}` }], best: { value: right, label: `${right}/${pieces.length}` },
    }), update: () => false },
  );
  return steps;
}

/** Tap the instant the demo screen turns green. Five rounds; too early is a foul. */
function techDemo(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
  const tele = rideIO.tele;
  const me = new THREE.Vector3(track.spots!.me[0], 0, track.spots!.me[1]);
  const ROUNDS = 5;
  const times: number[] = [];
  let round = 0, goAt = 0, armedAt = 0, taps = 0, fouls = 0, state: "wait" | "go" | "show" = "show";
  return [
    walk(() => [me.clone()]),
    {
      enter: (c) => {
        yawQ(c.quat, Math.PI); taps = rideIO.input.taps;
        c.look({ anim: "idle", pose: "grip", body: "stand", prop: null });
        c.cam = "fixed";
        c.camAt = me.clone().add(new THREE.Vector3(1.1, 1.8, 1.9));
        c.camLook = me.clone().add(new THREE.Vector3(0, 1.4, -1));
        tele.prompt = "Tap!"; tele.holdButton = false;
        armedAt = c.clock + 0.8;
      },
      update: (c) => {
        const tapped = rideIO.input.taps > taps;
        if (tapped) taps = rideIO.input.taps;
        if (state === "show") {
          if (c.clock >= armedAt) { state = "wait"; goAt = c.clock + 1.2 + Math.random() * 2.2; c.ui({ screen: "#dc2626" }); tele.phase = `🎮 Round ${round + 1}/${ROUNDS}: wait for green…`; }
        } else if (state === "wait") {
          if (tapped) { fouls++; flash("⛔ Too early!"); c.ui({ screen: "#f97316" }); state = "show"; armedAt = c.clock + 1.2; }
          else if (c.clock >= goAt) { state = "go"; c.ui({ screen: "#22c55e" }); tele.phase = "🟢 NOW!"; }
        } else if (state === "go" && tapped) {
          const ms = Math.round((c.clock - goAt) * 1000);
          times.push(ms); round++;
          flash(ms < 250 ? `⚡ ${ms} ms!` : `${ms} ms`);
          c.ui({ screen: "#1e293b" }); state = "show"; armedAt = c.clock + 1;
        }
        tele.progress = round / ROUNDS; tele.score = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        return round >= ROUNDS;
      },
    },
    { enter: (c) => { tele.prompt = ""; c.ui({ screen: undefined }); c.cam = "chase"; c.look({ anim: "idle", body: "stand", prop: null }); }, update: () => true },
    walk(() => [new THREE.Vector3(track.exit[0], 0, track.exit[1])]),
    { enter: () => {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length));
      result({
        rideId: ride.id, headline: avg < 260 ? "⚡ Lightning reflexes!" : undefined,
        stars: avg < 260 && fouls === 0 ? 3 : avg < 380 ? 2 : 1,
        stats: [{ label: "Average", value: `${avg} ms` }, { label: "Best", value: `${Math.min(...times)} ms` }, { label: "False starts", value: String(fouls) }],
        best: { value: avg, label: `${avg} ms`, lowerIsBetter: true },
      });
    }, update: () => false },
  ];
}

// The context is read by result builders in the scripts (created once per ride).
const ctxRef: { current: Ctx | null } = { current: null };

// ---------------------------------------------------------------- splash particles

interface Burst { at: THREE.Vector3; size: number; born: number; color?: string }
function Splashes({ bursts }: { bursts: Burst[] }) {
  const N = 26;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: N * 4 }, () => [Math.random(), Math.random(), Math.random()]), []);
  const tint = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    let k = 0;
    for (const b of bursts.slice(-4)) {
      const t = clock.getElapsedTime() - b.born;
      for (let i = 0; i < N; i++, k++) {
        const [a, r, h] = seeds[k];
        const ang = a * Math.PI * 2;
        const out = (0.6 + r) * b.size * 0.6;
        const up = (1.2 + h * 2) * Math.sqrt(b.size);
        dummy.position.set(b.at.x + Math.cos(ang) * out * t, b.at.y + up * t - 4.9 * t * t, b.at.z + Math.sin(ang) * out * t);
        const alive = t < 1.4 && dummy.position.y > -0.05;
        // Small droplets: a bigger splash throws them higher and wider rather than making them bigger.
        dummy.scale.setScalar(alive ? (0.035 + 0.008 * b.size) * (0.6 + r * 0.8) * (1 - t / 1.6) : 0);
        dummy.updateMatrix();
        m.setMatrixAt(k, dummy.matrix);
        m.setColorAt(k, tint.set(b.color ?? "#e0f2fe"));
      }
    }
    for (; k < N * 4; k++) { dummy.scale.setScalar(0); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N * 4]} raycast={() => null}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.85} roughness={0.1} />
    </instancedMesh>
  );
}

/** Rings spreading on the water around a swimmer or floater. */
function Ripples({ target, on }: { target: React.RefObject<THREE.Group | null>; on: boolean }) {
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = rings.current, t = target.current;
    if (!g || !t) return;
    g.visible = on;
    g.position.set(t.position.x, 0.06, t.position.z);
    g.children.forEach((c, i) => {
      const k = ((clock.getElapsedTime() * 0.7 + i / 3) % 1);
      c.scale.setScalar(0.4 + k * 1.6);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    });
  });
  return (
    <group ref={rings}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.55, 0.62, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The player's lane pins: standing, toppling the way they were hit, then swept away. */
function LivePins({ at }: { at: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const pins = ctxRef.current?.pins;
    const g = group.current;
    if (!g || !pins) return;
    g.children.forEach((child, i) => {
      const p = pins[i];
      if (!p) return;
      child.visible = !p.gone;
      const k = p.down ? Math.min(1, Math.max(0, (clock.getElapsedTime() - p.t) / 0.35)) : 0;
      child.position.set(p.x + p.dir * k * 0.18, 0, p.z - k * 0.12);
      child.rotation.set(-k * 0.5, 0, -p.dir * k * (Math.PI / 2));
    });
  });
  return <group ref={group} position={at}>{PIN_SPOTS.map((_, i) => <group key={i}><Pin /></group>)}</group>;
}

/** A cast member: placed every frame from the ride's script, dressed and posed by it. */
function Actor({ m }: { m: CastMember }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = ctxRef.current?.actors[m.id];
    if (!g.current || !a) return;
    g.current.position.copy(a.pos);
    g.current.rotation.set(0, a.yaw, 0);
  });
  return (
    <group ref={g}>
      <Suspense fallback={null}>
        <CitizenAvatar look={{ gender: m.gender, preset: m.preset }} animation={m.anim} pose={m.pose} holding={m.hold ? <HandHeldProp kind={m.hold} /> : undefined} />
      </Suspense>
    </group>
  );
}

/** A shopping trolley with as many items in it as have been picked up. */
function Trolley({ items }: { items: number }) {
  const colors = ["#dc2626", "#16a34a", "#f59e0b", "#2563eb", "#a855f7"];
  return (
    <group>
      <mesh position={[0, 0.65, 0]}><boxGeometry args={[0.55, 0.4, 0.8]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} wireframe /></mesh>
      <mesh position={[0, 0.46, 0]}><boxGeometry args={[0.55, 0.02, 0.8]} /><meshStandardMaterial color="#64748b" metalness={0.7} /></mesh>
      <mesh position={[0, 0.95, -0.42]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.6, 8]} /><meshStandardMaterial color="#ef4444" /></mesh>
      {[[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]].map(([x, z], i) => <mesh key={i} position={[x, 0.06, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.04, 12]} /><meshStandardMaterial color="#111827" /></mesh>)}
      {Array.from({ length: Math.min(items, 5) }, (_, i) => <mesh key={i} position={[((i % 2) - 0.5) * 0.24, 0.56 + Math.floor(i / 2) * 0.12, (i % 3 - 1) * 0.2]}><boxGeometry args={[0.18, 0.16, 0.14]} /><meshStandardMaterial color={colors[i]} /></mesh>)}
    </group>
  );
}

/** A hanging aisle sign ("Aisle 3"). */
function AisleSign({ n }: { n: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 96;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0f766e"; g.fillRect(0, 0, 256, 96);
    g.fillStyle = "#ffffff"; g.font = "bold 52px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`Aisle ${n}`, 128, 50);
    return new THREE.CanvasTexture(c);
  }, [n]);
  return <mesh><planeGeometry args={[1.1, 0.42]} /><meshStandardMaterial map={tex} side={THREE.DoubleSide} /></mesh>;
}

/** A white strobe flash over the dance floor when the DJ drops the track. */
function Strobe({ at }: { at: number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() - at;
    if (light.current) light.current.intensity = t >= 0 && t < 1.2 ? (Math.floor(t * 12) % 2 ? 0 : 60) : 0;
  });
  return <pointLight ref={light} position={[CLUB.floor.at[0], 4, CLUB.floor.at[1]]} color="#ffffff" distance={14} intensity={0} />;
}

/** Guests in front of the karaoke stage, reacting to the singer, under a spotlight. */
function KaraokeCrowd({ anim }: { anim: AvatarAnimation }) {
  const { stage } = BOWLING;
  const people = [
    { gender: "woman" as const, preset: "Female_Adult_01", x: -1.1 },
    { gender: "man" as const, preset: "Male_Adult_08", x: 0 },
    { gender: "woman" as const, preset: "Female_Adult_05", x: 1.1 },
  ];
  return (
    <group position={[stage.at[0], 0, stage.at[1] + stage.d / 2 + 1.6]}>
      {people.map((p, i) => (
        <group key={i} position={[p.x, 0, (i % 2) * 0.4]} rotation={[0, Math.PI, 0]}>
          <Suspense fallback={null}><CitizenAvatar look={{ gender: p.gender, preset: p.preset }} animation={anim} /></Suspense>
        </group>
      ))}
      {/* the spotlight on the singer */}
      <mesh position={[0, 2.4, -stage.d / 2 - 1.4]}><coneGeometry args={[0.8, 3.6, 24, 1, true]} /><meshBasicMaterial color="#fde68a" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the rig

export function RideRig({ active, look, worn, onEnd }: {
  active: ActiveRide;
  look?: AvatarLookProps;
  worn?: Accessory[];
  onEnd: (r: RideResult) => void;
}) {
  const { ride, track, start } = active;
  const body = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const oppBody = useRef<THREE.Group>(null);
  const [lk, setLk] = useState<Look>({ anim: "walk", body: "stand", prop: null });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [ui, setUi] = useState<Ui>({ gate: 0, castle: 0 });
  const ballRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const clock = useThree((s) => s.clock);
  const ended = useRef(false);

  // The ride's running state: built once per ride, then advanced every frame.
  const state = useRef<{ ctx: Ctx; steps: Step[]; i: number } | null>(null);
  useEffect(() => {
    const ctx: Ctx = {
      pos: new THREE.Vector3(start[0], 0, start[1]),
      quat: new THREE.Quaternion(),
      spin: 0, t: 0, rideStart: -1, clock: 0, speed: 0, top: 0, data: {}, cam: "chase", actors: {}, cast: [], tasks: [],
      look: (l) => setLk(l),
      ui: (u) => setUi((prev) => ({ ...prev, ...u })),
      splash: (at, size, color) => setBursts((b) => [...b.slice(-3), { at, size, born: clock.getElapsedTime(), color }]),
      opp: ride.kind === "race" && track.lane2 ? { pos: track.lane2.getPointAt(0).clone(), quat: new THREE.Quaternion(), s: 0, v: 0, done: 0 } : undefined,
    };
    ctxRef.current = ctx;
    // The script reports its result once; the camera glides back before it's shown.
    const steps = script(ride, track, (r) => { if (!ended.current) { ended.current = true; camBack.current = 0; pendingResult.current = r; } }, active.menu, (look ?? DEFAULT_LOOK).gender);
    state.current = { ctx, steps, i: -1 };
    // The lobby's lift and wax figures are the ride's own while it runs.
    if (ride.kind === "observe" || ride.kind === "glassbridge") LIFT_IN_USE.current = true;
    if (ride.kind === "waxselfie") WAX_IN_USE.current = true;
    return () => { if (ctxRef.current === ctx) ctxRef.current = null; state.current = null; LANE_IN_USE.current = false; LIFT_IN_USE.current = false; WAX_IN_USE.current = false; };
  }, [ride, track, start, clock, active.menu, look?.gender]);

  // The chase camera: remembers the player's view and gives it back when the ride ends.
  const saved = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; limits: number[] } | null>(null);
  const camPos = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());
  const camBack = useRef(-1);
  const pendingResult = useRef<RideResult | null>(null);
  /* eslint-disable react-hooks/immutability -- the camera and controls are three.js objects driven per frame */
  useEffect(() => {
    if (!controls) return;
    saved.current = {
      pos: camera.position.clone(), target: controls.target.clone(),
      limits: [controls.minPolarAngle, controls.maxPolarAngle, controls.minAzimuthAngle, controls.maxAzimuthAngle, controls.minDistance, controls.maxDistance],
    };
    camPos.current.copy(camera.position);
    camLook.current.copy(controls.target);
    controls.enabled = false;
    return () => {
      const s = saved.current;
      if (!s) return;
      [controls.minPolarAngle, controls.maxPolarAngle, controls.minAzimuthAngle, controls.maxAzimuthAngle, controls.minDistance, controls.maxDistance] = s.limits;
      controls.enabled = true;
    };
  }, [camera, controls]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const run = state.current;
    if (!run) return;
    const c = run.ctx;
    c.clock = clock.getElapsedTime();
    // Run the script.
    if (run.i < 0) { run.i = 0; c.t = 0; run.steps[0]?.enter?.(c); }
    const step = run.steps[run.i];
    if (step) {
      c.t += dt;
      if (step.update(c, dt) && run.i < run.steps.length - 1) {
        run.i++; c.t = 0; run.steps[run.i].enter?.(c);
      }
    }
    if (c.tasks.length) c.tasks = c.tasks.filter((task) => !task(c, dt));
    if (c.rideStart >= 0 && !ended.current) rideIO.tele.time = c.clock - c.rideStart;
    rideIO.tele.speedKmh = c.speed;
    rideIO.tele.topKmh = c.top;

    // Place the rider.
    const g = body.current;
    if (g) {
      g.position.copy(c.pos);
      g.quaternion.copy(c.quat);
    }
    if (spinner.current) spinner.current.rotation.set(0, c.spin, c.data.lean ?? 0);
    if (oppBody.current && c.opp) { oppBody.current.position.copy(c.opp.pos); oppBody.current.quaternion.copy(c.opp.quat); }
    if (ballRef.current) { ballRef.current.visible = !!c.ball && c.ball.y > -1; if (c.ball) ballRef.current.position.copy(c.ball); }

    // Camera: behind and above the rider, a little to the side; back to the player's view at the end.
    if (controls && saved.current) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(c.quat).setY(0);
      if (fwd.lengthSq() < 1e-3) fwd.set(0, 0, 1);
      fwd.normalize();
      const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const riding = c.speed > 1;
      let want: THREE.Vector3;
      if (c.cam === "fixed" && c.camAt) {
        want = c.camAt.clone();
      } else if (c.cam === "side") {
        // Out from the tower's middle towards the rider and beyond, so it looks back at them from outside
        // every slide (straight out of the front, the open stairs side, when they're in the middle).
        const centre = track.centre ? new THREE.Vector3(track.centre[0], 0, track.centre[1]) : c.pos.clone().addScaledVector(fwd, -1);
        const out = c.pos.clone().sub(centre).setY(0);
        if (out.lengthSq() < 0.6) out.set(0, 0, 1);
        out.normalize();
        want = c.pos.clone().addScaledVector(out, 5.4).add(new THREE.Vector3(0, 1.4, 0));
        want.y = Math.max(want.y, 1.6);
      } else {
        const dist = c.data.camDist ?? 5.6;
        want = c.pos.clone().addScaledVector(fwd, -dist).addScaledVector(side, dist * 0.45).add(new THREE.Vector3(0, 2.8, 0));
        // Never below the ground (in the water after a splash).
        want.y = Math.max(want.y, 2.4);
      }
      const lookAt = c.cam === "fixed" && c.camLook ? c.camLook.clone() : c.pos.clone().add(new THREE.Vector3(0, c.data.lookUp ?? 0.6, 0));
      if (camBack.current >= 0) {
        camBack.current += dt;
        const k = Math.min(1, camBack.current / 0.9);
        camPos.current.lerp(saved.current.pos, ease(k) * 0.35 + k * 0.1);
        camLook.current.lerp(saved.current.target, ease(k) * 0.35 + k * 0.1);
        if (k >= 1 && pendingResult.current) {
          camera.position.copy(saved.current.pos);
          controls.target.copy(saved.current.target);
          const r = pendingResult.current;
          pendingResult.current = null;
          onEnd(r);
        }
      } else if (c.data.snap) {
        // Driven directly (a telescope, a free-fall): no smoothing.
        camPos.current.copy(want);
        camLook.current.copy(lookAt);
      } else {
        const k = 1 - Math.exp(-dt * (riding ? 5 : 2.5));
        camPos.current.lerp(want, k);
        camLook.current.lerp(lookAt, Math.min(1, k * 1.6));
      }
      camera.position.copy(camPos.current);
      controls.target.copy(camLook.current);
      camera.lookAt(camLook.current);
    }
  });
  /* eslint-enable react-hooks/immutability */

  // How far the face is from the feet (along the body), for the face mask.
  const faceAt = look?.gender === "man" ? 1.6 : 1.5;
  // Lying flat; `recline` lifts the head end (on a lounger's backrest).
  const rec = lk.recline ?? 0;
  const bodyRot: [number, number, number] = lk.body === "lie" ? [-Math.PI / 2 + rec, 0, 0] : lk.body === "prone" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <>
      <group ref={body}>
        <group ref={spinner}>
          <Suspense fallback={null}>
            <CitizenAvatar
              look={lk.wear ? { ...(look ?? DEFAULT_LOOK), wear: lk.wear } : look}
              accessories={[...new Set([...(worn ?? []), ...(lk.shades ? ["sunglasses" as const] : []), ...(lk.acc ?? [])])]}
              animation={lk.anim}
              pose={lk.pose}
              rotation={bodyRot}
              holding={lk.hold === "ball" ? <BowlingBall /> : lk.hold === "mic" ? <Microphone /> : undefined}
              carryMode={lk.carry}
            />
          </Suspense>
          {lk.prop === "ring" && <group position={[0, 0.38, -0.12]}><RingTube color={ride.kind === "river" ? "#f97316" : "#0ea5e9"} /></group>}
          {lk.prop === "raft" && (
            <group position={[0, 0.38, 0.35]}>
              <RingTube color="#facc15" radius={0.85} />
              {/* other guests sharing the raft, facing in */}
              {GUESTS.map((gst, i) => {
                const a = Math.PI + (i - 1) * 1.15;
                return (
                  <group key={i} position={[Math.sin(a) * 0.62, -0.68, Math.cos(a) * 0.62]} rotation={[0, a + Math.PI, 0]}>
                    <Suspense fallback={null}><CitizenAvatar look={{ gender: gst.gender, preset: gst.preset }} animation="sit" pose="armsUp" /></Suspense>
                  </group>
                );
              })}
            </group>
          )}
          {lk.prop === "float" && <group position={[0, -0.2, -0.75]}><FlamingoFloat /></group>}
          {lk.prop === "board" && (
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><boxGeometry args={[0.5, 1.3, 0.05]} /><meshStandardMaterial color="#f59e0b" /></mesh>
          )}
          {/* Sitting astride the jet ski (its seat is under the hips). */}
          {lk.prop === "jetski" && <group position={[0, -0.3, -0.05]}><JetSki color="#e11d48" /></group>}
          {lk.prop === "sup" && <group position={[0, -0.04, 0.15]}><Paddleboard /></group>}
          {lk.prop === "penguin" && <group position={[0, 0, 0.62]}><SkatePenguin /></group>}
          {lk.trolley !== undefined && <group position={[0, 0, 0.75]}><Trolley items={lk.trolley} /></group>}
          {/* VR headset on the face */}
          {lk.headset && (
            <mesh position={lk.body === "prone" ? [0, -0.12, faceAt] : [0, faceAt + 0.02, 0.1]} rotation={lk.body === "prone" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
              <boxGeometry args={[0.2, 0.1, 0.11]} /><meshStandardMaterial color="#111827" />
            </mesh>
          )}
          {/* Face mask and cucumber slices on the face (lying face up, perhaps reclined) */}
          {lk.mask && (
            <group position={[0, faceAt * Math.sin(rec) + 0.1 * Math.cos(rec), -faceAt * Math.cos(rec) + 0.1 * Math.sin(rec)]} rotation={[rec, 0, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.25, 1]}><circleGeometry args={[0.085, 20]} /><meshStandardMaterial color="#86efac" roughness={0.9} /></mesh>
              {[-0.035, 0.035].map((x) => (
                <mesh key={x} position={[x, 0.008, -0.02]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.028, 16]} /><meshStandardMaterial color="#4ade80" /></mesh>
              ))}
            </group>
          )}
          {lk.prop === "kiteboard" && (
            <group>
              <mesh position={[0, -0.06, 0]}><boxGeometry args={[1.3, 0.04, 0.42]} /><meshStandardMaterial color="#facc15" /></mesh>
              {/* the kite flies high and ahead, its lines down to the bar */}
              <group position={[0.6, 4.6, 4.2]}><SurfKite to={[-0.6, -3.5, -3.8]} /></group>
            </group>
          )}
        </group>
      </group>
      {ride.kind === "race" && (
        <group ref={oppBody}>
          <Suspense fallback={null}><CitizenAvatar look={{ gender: "man", preset: "Male_Adult_04" }} animation="sleep" pose="armsCrossed" rotation={[-Math.PI / 2, 0, 0]} /></Suspense>
        </group>
      )}
      {/* The other player (volleyball) */}
      {ride.kind === "volleyball" && (
        <group ref={oppBody}>
          <Suspense fallback={null}><CitizenAvatar look={{ gender: "woman", preset: "Female_Adult_05" }} animation={ui.opp?.anim ?? "idle"} pose={ui.opp?.pose} /></Suspense>
        </group>
      )}
      {ride.kind === "volleyball" && <mesh ref={ballRef} visible={false}><sphereGeometry args={[0.12, 16, 12]} /><meshStandardMaterial color="#fde047" /></mesh>}
      {ride.kind === "bowling" && (
        <>
          <mesh ref={ballRef} visible={false} castShadow><sphereGeometry args={[0.11, 20, 16]} /><meshStandardMaterial color="#7c3aed" roughness={0.15} metalness={0.3} /></mesh>
          <LivePins at={[BOWLING.lanes[0], 0.02, BOWLING.headPinZ]} />
        </>
      )}
      {ride.kind === "karaoke" && <KaraokeCrowd anim={ui.crowd ?? "idle"} />}
      {ui.cast?.map((m) => <Actor key={m.id} m={m} />)}
      {ui.dishes?.map((d) => <ServedItem key={d.id} def={{ id: d.id, kind: d.kind, position: d.at, rotation: 0 }} />)}
      {ride.kind === "chefshow" && ui.shrimp && (
        <mesh ref={ballRef} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.05, 0.022, 8, 12, Math.PI * 1.4]} /><meshStandardMaterial color="#fb923c" /></mesh>
      )}
      {ui.strobeAt !== undefined && <Strobe at={ui.strobeAt} />}
      {ui.steamAt && <group position={ui.steamAt}><Steam w={1.2} d={1} rate={1.4} /></group>}
      {/* Rides that go up: the lift or cabin, the city around, the Frame's glass bridge */}
      {ui.liftY !== undefined && track.spots && (
        <group position={[track.spots.me[0], ui.liftY, track.spots.me[1]]}><GlassLift capsule={ride.id === "ain-dubai"} /></group>
      )}
      {ui.city && (
        <group position={[ui.city[0], 0, ui.city[1]]}>
          <CityBelow landmarks={ui.vr ? [] : ride.landmarks} seaBearing={ride.id === "view-palm" || ride.id === "ain-dubai" ? 0 : 300} />
          {/* VR: the supertall tower you jump from */}
          {ui.vr && <mesh position={[0, LOBBY.vrTower / 2, 0]}><boxGeometry args={[5, LOBBY.vrTower, 5]} /><meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.25} /></mesh>}
        </group>
      )}
      {ui.bridge && track.spots && (
        <group position={[track.spots.me[0] - 0.75, LOBBY.liftTop, track.spots.me[1]]}><GlassBridge length={LOBBY.bridge} cracks={ui.crackAt ? 1 : 0} /></group>
      )}
      {ui.crackAt && <group position={ui.crackAt}><GlassCrack /></group>}
      {ui.tunnel && <group position={[LOBBY.tunnel.centre[0], 0, LOBBY.tunnel.centre[1]]}><AquariumTunnel length={14} target={ride.target ?? "shark"} /></group>}
      {ui.plinths?.map(([x, z], i) => <group key={i} position={[x, 0, z]}><Plinth /></group>)}
      {ui.aisles && SHOPS.market.aisles.map(([x, z], i) => <group key={i} position={[x, 2.5, z + 0.4]}><AisleSign n={i + 1} /></group>)}
      {ui.screen && (
        <mesh position={[SHOPS.tech.table[0], 1.55, SHOPS.tech.table[1] - 0.2]}><planeGeometry args={[1.2, 0.7]} /><meshStandardMaterial color={ui.screen} emissive={ui.screen} emissiveIntensity={0.9} /></mesh>
      )}
      {/* Course buoys (jet ski, paddleboard): the next one glows */}
      {track.gates?.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}><CourseBuoy next={i === ui.gate} done={i < ui.gate} /></group>
      ))}
      {ride.kind === "sandcastle" && ui.castle > 0 && track.spots?.centre && (
        <group position={[track.spots.centre[0], 0, track.spots.centre[1]]}><SandCastle stage={ui.castle} /></group>
      )}
      <Ripples target={body} on={lk.body === "prone" || lk.prop === "float" || lk.prop === "ring"} />
      <Splashes bursts={bursts} />
    </>
  );
}
