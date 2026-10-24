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
import { CitizenAvatar, type AvatarAnimation, type BodyPose } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { Accessory } from "@/lib/city/types";
import type { RideDef } from "@/lib/city/rides";
import { CourseBuoy, FlamingoFloat, JetSki, Paddleboard, RingTube, SandCastle, SurfKite } from "../scenery";
import { BEACH, TOWER_TOP, WATERPARK, waveZ } from "./paths";
import { flash, rideIO, type RideResult } from "./rideIO";
import type { Track } from "./tracks";

/** A ride under way; `start` is where the citizen stood when it began. Remount the rig (key) per ride. */
export interface ActiveRide { ride: RideDef; track: Track; key: number; start: [number, number] }

type Prop = "ring" | "raft" | "float" | "board" | "jetski" | "sup" | "kiteboard" | null;
type Look = { anim: AvatarAnimation; pose?: BodyPose; body: "stand" | "lie" | "prone"; prop: Prop; shades?: boolean };
/** Bits of the scene a ride changes now and then (the next buoy, the castle's stage, the other player's pose). */
type Ui = { gate: number; castle: number; opp?: Look };
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
  splash: (at: THREE.Vector3, size: number) => void;
  /** "side": from the side, away from the tower (riding and waiting at the top); "chase": from behind;
      "fixed": from `camAt` looking at `camLook` (a TV view of a court). */
  cam: "chase" | "side" | "fixed";
  camAt?: THREE.Vector3;
  camLook?: THREE.Vector3;
  ui: (u: Partial<Ui>) => void;
  /** The volleyball, when there is one in play. */
  ball?: THREE.Vector3;
  opp?: { pos: THREE.Vector3; quat: THREE.Quaternion; s: number; v: number; done: number };
  data: Record<string, number>;
}
interface Step { enter?: (c: Ctx) => void; update: (c: Ctx, dt: number) => boolean }

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

function script(ride: RideDef, track: Track, result: (r: RideResult) => void): Step[] {
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
  }
}

// ---------------------------------------------------------------- beach scripts

const secs = (s: number) => `${s.toFixed(1)} s`;

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
        c.look({ anim: "sleep", body: "lie", prop: null, shades: true });
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

// The context is read by result builders in the scripts (created once per ride).
const ctxRef: { current: Ctx | null } = { current: null };

// ---------------------------------------------------------------- splash particles

interface Burst { at: THREE.Vector3; size: number; born: number }
function Splashes({ bursts }: { bursts: Burst[] }) {
  const N = 26;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: N * 4 }, () => [Math.random(), Math.random(), Math.random()]), []);
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
      }
    }
    for (; k < N * 4; k++) { dummy.scale.setScalar(0); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N * 4]} raycast={() => null}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshStandardMaterial color="#e0f2fe" transparent opacity={0.85} roughness={0.1} />
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
      spin: 0, t: 0, rideStart: -1, clock: 0, speed: 0, top: 0, data: {}, cam: "chase",
      look: (l) => setLk(l),
      ui: (u) => setUi((prev) => ({ ...prev, ...u })),
      splash: (at, size) => setBursts((b) => [...b.slice(-3), { at, size, born: clock.getElapsedTime() }]),
      opp: ride.kind === "race" && track.lane2 ? { pos: track.lane2.getPointAt(0).clone(), quat: new THREE.Quaternion(), s: 0, v: 0, done: 0 } : undefined,
    };
    ctxRef.current = ctx;
    // The script reports its result once; the camera glides back before it's shown.
    const steps = script(ride, track, (r) => { if (!ended.current) { ended.current = true; camBack.current = 0; pendingResult.current = r; } });
    state.current = { ctx, steps, i: -1 };
    return () => { if (ctxRef.current === ctx) ctxRef.current = null; state.current = null; };
  }, [ride, track, start, clock]);

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

  const bodyRot: [number, number, number] = lk.body === "lie" ? [-Math.PI / 2, 0, 0] : lk.body === "prone" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <>
      <group ref={body}>
        <group ref={spinner}>
          <Suspense fallback={null}>
            <CitizenAvatar look={look} accessories={lk.shades && !worn?.includes("sunglasses") ? [...(worn ?? []), "sunglasses"] : worn} animation={lk.anim} pose={lk.pose} rotation={bodyRot} />
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
