"use client";

// The network side of a live bout (duel.ts): a Supabase Realtime channel per bout, `boxing:<boutId>`.
// The challenger's phone (the host, side 0) runs the fight and streams it, snapshot and events, a dozen times a
// second; the other phone (side 1) sends its inputs as they happen (punches and dodges at once, the guard and the
// stick when they change) and draws the snapshots, easing positions and running clocks on between them. Both say
// "ready" once they're in the ring, and the bell goes when both are. A phone that goes quiet for
// `forfeitSeconds` (or leaves) loses the bout.

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import RULES from "@/data/arcade/boxing.json";
import { supabase } from "@/lib/supabase/client";
import { eventFor, forfeit, newDuel, stepDuel, viewFor, type DuelEvent, type DuelState } from "./duel";
import type { FightEvent, FightInput, FightState, Punch, Dodge, Spot } from "./fight";

export interface LiveBoutConfig { boutId: string; host: boolean }
type Body = { stamina: number; power: number };

type Msg =
  | { k: "ready"; body: Body }
  | { k: "go" }
  | { k: "s"; st: DuelState; ev: DuelEvent[] }
  | { k: "i"; p?: Punch; d?: Dodge; st?: boolean; b: boolean; tp: number; mv: { x: number; y: number } }
  | { k: "bye" };

export interface LiveLink {
  /** Waiting for the other player; fighting; they left (the bout is mine). */
  status: "waiting" | "fighting" | "left";
  /** Advance one frame: the host steps the bout, the guest sends inputs and draws the latest snapshot. */
  drive: (dt: number, local: FightInput, view: FightState) => void;
}

const now = () => Date.now();
const D = RULES.duel;

export function useLiveBout(cfg: LiveBoutConfig | null, playing: boolean, body: Body): React.RefObject<LiveLink | null> {
  const link = useRef<LiveLink | null>(null);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; });

  useEffect(() => {
    if (!cfg) return;
    const host = cfg.host;
    let ch: RealtimeChannel | null = null;
    let ready = false;
    const send = (m: Msg) => { if (ready) void ch?.send({ type: "broadcast", event: "m", payload: m }); };

    // Shared state of the link.
    let started = false;
    let lastHeard = now();
    let lastReady = 0;
    // Host: the bout, the guest's body and inputs, outgoing events, the snapshot clock.
    let duel: DuelState | null = null;
    let guestBody: Body | null = null;
    let guestReady = false;
    const remote: FightInput & { punchQ?: Punch; dodgeQ?: Dodge; starQ?: boolean } = { blocking: false, taps: 0, move: { x: 0, y: 0 } };
    let outEvents: DuelEvent[] = [];
    let sinceSnap = 0;
    // Guest: the latest snapshot, events to play, smoothed positions, what was last sent.
    let latest: DuelState | null = null;
    let inEvents: DuelEvent[] = [];
    const shown: { me: Spot | null; op: Spot | null } = { me: null, op: null };
    let sent = { b: false, x: 0, y: 0, at: 0 };

    const l: LiveLink = {
      status: "waiting",
      drive: (dt, local, view) => {
        const t = now();
        // "Ready" once in the ring, every second until the bout starts.
        if (!started && playingRef.current && t - lastReady > 1000) { lastReady = t; send({ k: "ready", body }); }

        if (host) {
          if (!started && playingRef.current && guestReady) {
            started = true;
            duel = newDuel([body, guestBody ?? { stamina: 1, power: 1 }]);
            lastHeard = t;
            l.status = "fighting";
            send({ k: "go" });
          }
          if (!duel) return;
          if (started && duel.phase !== "over" && t - lastHeard > D.forfeitSeconds * 1000) { forfeit(duel, 0); l.status = "left"; }
          const theirs: FightInput = { punch: remote.punchQ, dodge: remote.dodgeQ, star: remote.starQ, blocking: remote.blocking, taps: remote.taps, move: remote.move };
          remote.punchQ = undefined; remote.dodgeQ = undefined; remote.starQ = undefined; remote.taps = 0;
          if (duel.phase !== "over") stepDuel(duel, dt, [local, theirs]);
          outEvents.push(...duel.events);
          viewFor(duel, 0, view);
          sinceSnap += dt;
          if (sinceSnap >= 1 / D.snapshotHz || duel.phase === "over") {
            sinceSnap = 0;
            send({ k: "s", st: duel, ev: outEvents });
            outEvents = [];
          }
          return;
        }

        // Guest: inputs out (one-shots at once; the guard and stick when they change, at most ~10 a second).
        const mv = local.move ?? { x: 0, y: 0 };
        const oneShot = !!(local.punch || local.dodge || local.star || local.taps);
        const changed = local.blocking !== sent.b || Math.abs(mv.x - sent.x) > 0.15 || Math.abs(mv.y - sent.y) > 0.15;
        if (started && (oneShot || (changed && t - sent.at > 90) || t - sent.at > 1000)) {
          send({ k: "i", p: local.punch, d: local.dodge, st: local.star || undefined, b: local.blocking, tp: local.taps, mv });
          sent = { b: local.blocking, x: mv.x, y: mv.y, at: t };
        }
        if (started && l.status === "fighting" && t - lastHeard > D.forfeitSeconds * 1000) {
          l.status = "left";
          if (latest && latest.phase !== "over") { forfeit(latest, 1); inEvents.push(...latest.events); }
        }
        if (!latest) return;
        // Between snapshots the clocks run on, so punches and the round clock move smoothly.
        if (latest.phase === "fight" || latest.phase === "rest" || latest.phase === "down") latest.t += dt;
        for (const f of latest.f) { if (f.punch) f.punch.at += dt; if (f.dodge) f.dodge.at += dt; f.recoil = Math.max(0, f.recoil - dt); }
        latest.events = inEvents;
        inEvents = [];
        viewFor(latest, 1, view);
        // Positions ease towards the latest snapshot.
        const ease = (cur: Spot | null, to: Spot): Spot => {
          if (!cur) return [to[0], to[1]];
          const k = Math.min(1, dt * 14);
          return [cur[0] + (to[0] - cur[0]) * k, cur[1] + (to[1] - cur[1]) * k];
        };
        shown.me = ease(shown.me, latest.f[1].pos);
        shown.op = ease(shown.op, latest.f[0].pos);
        view.pos = { me: shown.me, op: shown.op };
      },
    };
    link.current = l;

    ch = supabase().channel(`boxing:${cfg.boutId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "m" }, ({ payload }) => {
      const m = payload as Msg;
      lastHeard = now();
      if (m.k === "bye") {
        // Gone before the end: the bout is mine. (After the end it's just goodbye.)
        if (host && duel && duel.phase !== "over") { forfeit(duel, 0); l.status = "left"; }
        if (!host && latest && latest.phase !== "over") { forfeit(latest, 1); inEvents.push(...latest.events); l.status = "left"; }
        return;
      }
      if (host) {
        if (m.k === "ready") { guestReady = true; guestBody = m.body; }
        if (m.k === "i") {
          if (m.p) remote.punchQ = m.p;
          if (m.d) remote.dodgeQ = m.d;
          if (m.st) remote.starQ = true;
          remote.taps += m.tp;
          remote.blocking = m.b;
          remote.move = m.mv;
        }
        return;
      }
      if (m.k === "go") { started = true; l.status = "fighting"; }
      if (m.k === "s") {
        if (!started) { started = true; l.status = "fighting"; }
        latest = m.st;
        inEvents.push(...m.ev);
      }
    });
    ch.subscribe((status) => { ready = status === "SUBSCRIBED"; });
    return () => {
      // Leaving mid-bout tells the other phone at once (before the bell there's nothing to forfeit).
      if (started) send({ k: "bye" });
      link.current = null;
      const c = ch;
      ch = null;
      // Removed now, not later: a channel for the same bout opened next (a remount) shares the topic, and a late
      // removal would close that one too.
      if (c) void supabase().removeChannel(c);
    };
    // The bout's channel lives as long as the bout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.boutId, cfg?.host]);

  return link;
}

/** Events from a live view, already as this side reads them (viewFor maps them). */
export type LiveEvents = FightEvent[];
export { eventFor };
