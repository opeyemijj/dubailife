"use client";

// Where each Local in this venue is right now: dancing on the floor, at the bar, in a booth,
// browsing a counter or just standing around. Worked out from the clock, so every phone shows them
// in (nearly) the same places; each one moves on every half minute or so, at their own moment.

import { useEffect, useMemo, useState } from "react";
import type { Venue } from "@/lib/city/types";
import type { Peer } from "@/lib/room";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { localsAt, rand, type Local } from "@/lib/locals";
import { approachPoint, seatsAt, toRoom, type Plan } from "./layouts";

const BEAT_MS = 30_000;

interface Spot { x: number; z: number; face: number; animation: AvatarAnimation; lift?: number; seat?: boolean }

function spotsFor(venue: Venue, plan: Plan): Spot[] {
  const spots: Spot[] = [];
  const [w, d] = plan.size;
  for (const s of plan.stations) {
    const toward = s.rotation + Math.PI;
    if (s.kind === "dancefloor") {
      for (const [dx, dz] of [[-1.3, -1.1], [0, -1.3], [1.3, -1.1], [-1.4, 0.2], [0.1, 0.1], [1.4, 0.3], [-0.7, 1.3], [0.8, 1.3]]) {
        spots.push({ x: s.position[0] + dx, z: s.position[1] + dz, face: Math.atan2(-dx, -dz), animation: "dance" });
      }
    } else if (s.kind === "booth") {
      for (const seat of seatsAt(venue, s)) {
        const [x, , z] = toRoom(s, [seat.local[0], 0, seat.local[1]]);
        spots.push({ x, z, face: seat.facing, animation: "sit", lift: seat.lift, seat: true });
      }
    } else if (s.kind === "bar") {
      for (const dx of [-1.1, 0, 1.1]) {
        const [x, , z] = toRoom(s, [dx, 0, 1.0]);
        spots.push({ x, z, face: toward, animation: dx === 0 ? "idle" : "talk" });
      }
    } else if (s.kind !== "dj" && s.kind !== "fitting") {
      const [x, z] = approachPoint(s, 1.2);
      spots.push({ x, z, face: toward, animation: "idle" });
    }
  }
  // A few places to just hang out, chatting.
  for (let i = 0; i < 4; i++) {
    const x = (rand(`${venue.id}:fx${i}`) - 0.5) * (w - 3);
    const z = (rand(`${venue.id}:fz${i}`) - 0.5) * (d - 4);
    spots.push({ x, z, face: rand(`${venue.id}:ff${i}`) * Math.PI * 2, animation: i % 2 ? "talk" : "idle" });
  }
  return spots;
}

/** The Locals in this venue as people in the room. `others` are real people whose seats they leave free. */
export function useLocalsInRoom(placeId: string, venue: Venue, plan: Plan, others: Array<{ x: number; z: number }>) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, []);

  const spots = useMemo(() => spotsFor(venue, plan), [venue, plan]);
  const locals = useMemo(() => (now ? localsAt(placeId, venue.id, now) : []), [placeId, venue.id, now]);
  const beats = locals.map((l) => Math.floor((now + rand(l.id) * BEAT_MS) / BEAT_MS)).join(",");
  const othersKey = others.map((o) => `${o.x.toFixed(1)},${o.z.toFixed(1)}`).join(";");

  const peers = useMemo<Peer[]>(() => {
    if (!spots.length) return [];
    const near = (s: Spot) => others.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 0.6);
    const taken = new Set<number>();
    const beatOf = beats.split(",");
    return locals.map((l, i) => {
      let n = Math.floor(rand(`${l.id}:${beatOf[i]}`) * spots.length);
      for (let k = 0; k < spots.length && (taken.has(n) || (spots[n].seat && near(spots[n]))); k++) n = (n + 1) % spots.length;
      taken.add(n);
      const s = spots[n];
      return { userId: l.id, username: l.username, name: l.name, look: l.look, x: s.x, z: s.z, face: s.face, animation: s.animation, lift: s.lift };
    });
    // othersKey stands in for `others` so a new array each render doesn't reshuffle anyone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, locals, beats, othersKey]);

  return { locals, peers, now } as { locals: Local[]; peers: Peer[]; now: number };
}
