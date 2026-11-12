"use client";

// The network side of a live bout (duel.ts): a Supabase Realtime channel per bout, `boxing:<boutId>`.
// One phone runs the fight and streams it (snapshot and events, a dozen times a second); the other sends its inputs
// as they happen (punches and dodges at once, the guard and the stick when they change) and draws the snapshots,
// easing positions and running clocks on between them. Both say "ready" once they're in the ring, with how strong
// the device is (lib/device deviceScore): the stronger phone runs the fight (the challenger's on a tie), and the
// bell goes when both are ready. The fight runs on its own clock in small fixed steps, apart from drawing, so a
// slow phone (or one drawing fewer frames) never slows the fight down or skips a dodge window. A phone that goes
// quiet for `forfeitSeconds` (or leaves) loses the bout.

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import RULES from "@/data/arcade/boxing.json";
import { supabase } from "@/lib/supabase/client";
import { deviceScore } from "@/lib/device";
import { eventFor, forfeit, newDuel, stepDuel, viewFor, type DuelEvent, type DuelState } from "./duel";
import type { Dodge, FightEvent, FightInput, FightState, Punch, Spot } from "./fight";

/** The bout, and whether I challenged (the tie-break for who runs it). */
export interface LiveBoutConfig { boutId: string; host: boolean }
type Body = { stamina: number; power: number };

type Msg =
  | { k: "ready"; body: Body; score: number }
  | { k: "go" }
  | { k: "s"; st: DuelState; ev: DuelEvent[] }
  | { k: "i"; p?: Punch; d?: Dodge; st?: boolean; b: boolean; tp: number; mv: { x: number; y: number } }
  | { k: "bye" };

export interface LiveLink {
  /** Waiting for the other player; fighting; they left (the bout is mine). */
  status: "waiting" | "fighting" | "left";
  /** Each drawn frame: my input for the fight, and the view to draw (the fight itself runs on its own clock). */
  drive: (dt: number, local: FightInput, view: FightState) => void;
}

const now = () => Date.now();
const D = RULES.duel;
/** The fight's fixed step (s), and the most it catches up in one go (after the phone was busy or hidden). */
const STEP = 1 / 120;
const MAX_CATCH_UP = 0.5;

type Pending = FightInput & { punchQ?: Punch; dodgeQ?: Dodge; starQ?: boolean };
const freshPending = (): Pending => ({ blocking: false, taps: 0, move: { x: 0, y: 0 } });
/** One step's input from what's waiting: the one-shots once, the held guard and stick as they are. */
function take(p: Pending): FightInput {
  const i: FightInput = { punch: p.punchQ, dodge: p.dodgeQ, star: p.starQ, blocking: p.blocking, taps: p.taps, move: p.move };
  p.punchQ = undefined; p.dodgeQ = undefined; p.starQ = undefined; p.taps = 0;
  return i;
}

export function useLiveBout(cfg: LiveBoutConfig | null, playing: boolean, body: Body): React.RefObject<LiveLink | null> {
  const link = useRef<LiveLink | null>(null);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; });

  useEffect(() => {
    if (!cfg) return;
    const myScore = deviceScore();
    let ch: RealtimeChannel | null = null;
    let ready = false;
    const send = (m: Msg) => { if (ready) void ch?.send({ type: "broadcast", event: "m", payload: m }); };

    let started = false;
    let lastHeard = now();
    let lastReady = 0;
    // Who runs the fight: decided once the other phone has said ready (and how strong it is).
    let theirs: { body: Body; score: number } | null = null;
    let iRun: boolean | null = null;
    const decide = () => {
      if (iRun !== null || !theirs) return;
      iRun = myScore > theirs.score || (myScore === theirs.score && cfg.host);
    };

    // Running it: the bout, both players' waiting input, events to send and to show, the fight's own clock.
    let duel: DuelState | null = null;
    const mine = freshPending(), remote = freshPending();
    let outEvents: DuelEvent[] = [];
    let showEvents: DuelEvent[] = [];
    let clockAt = 0, carry = 0, sinceSnap = 0;
    let ticker: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (!duel) return;
      const t = now();
      if (duel.phase !== "over" && t - lastHeard > D.forfeitSeconds * 1000) { forfeit(duel, 0); l.status = "left"; outEvents.push(...duel.events); showEvents.push(...duel.events); }
      const real = Math.min(MAX_CATCH_UP, (t - clockAt) / 1000);
      clockAt = t;
      carry += real;
      while (carry >= STEP && duel.phase !== "over") {
        carry -= STEP;
        stepDuel(duel, STEP, [take(mine), take(remote)]);
        if (duel.events.length) { outEvents.push(...duel.events); showEvents.push(...duel.events); }
      }
      sinceSnap += real;
      if (sinceSnap >= 1 / D.snapshotHz || duel.phase === "over") {
        sinceSnap = 0;
        send({ k: "s", st: duel, ev: outEvents });
        outEvents = [];
        if (duel.phase === "over" && ticker) { clearInterval(ticker); ticker = null; }
      }
    };

    // Not running it: the latest snapshot, events to play, smoothed positions, what was last sent.
    let latest: DuelState | null = null;
    let inEvents: DuelEvent[] = [];
    const shown: { me: Spot | null; op: Spot | null } = { me: null, op: null };
    let sent = { b: false, x: 0, y: 0, at: 0 };

    const l: LiveLink = {
      status: "waiting",
      drive: (dt, local, view) => {
        const t = now();
        // "Ready" once in the ring, every second until the bout starts.
        if (!started && playingRef.current && t - lastReady > 1000) { lastReady = t; send({ k: "ready", body, score: myScore }); }

        if (iRun) {
          if (!started && playingRef.current && theirs) {
            started = true;
            duel = newDuel([body, theirs.body]);
            lastHeard = t;
            clockAt = t;
            l.status = "fighting";
            send({ k: "go" });
            ticker = setInterval(tick, 1000 / 60);
          }
          if (!duel) return;
          // My input waits for the fight's next step; held things (guard, stick) as they are now.
          if (local.punch) mine.punchQ = local.punch;
          if (local.dodge) mine.dodgeQ = local.dodge;
          if (local.star) mine.starQ = true;
          mine.taps += local.taps;
          mine.blocking = local.blocking;
          mine.move = local.move;
          // What to draw: the fight as it is, with the events since the last frame.
          duel.events = showEvents;
          showEvents = [];
          viewFor(duel, 0, view);
          return;
        }

        // Inputs out (one-shots at once; the guard and stick when they change, at most ~10 a second).
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
      if (m.k === "ready") { if (!theirs) theirs = { body: m.body, score: m.score ?? 0 }; decide(); return; }
      if (m.k === "bye") {
        // Gone before the end: the bout is mine. (After the end it's just goodbye.)
        if (iRun && duel && duel.phase !== "over") { forfeit(duel, 0); outEvents.push(...duel.events); showEvents.push(...duel.events); l.status = "left"; }
        if (!iRun && latest && latest.phase !== "over") { forfeit(latest, 1); inEvents.push(...latest.events); l.status = "left"; }
        return;
      }
      if (iRun) {
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
      // The other phone runs it.
      if (m.k === "go") { iRun = false; started = true; l.status = "fighting"; }
      if (m.k === "s") {
        iRun = false;
        if (!started) { started = true; l.status = "fighting"; }
        latest = m.st;
        inEvents.push(...m.ev);
      }
    });
    ch.subscribe((status) => { ready = status === "SUBSCRIBED"; });
    return () => {
      // Leaving mid-bout tells the other phone at once (before the bell there's nothing to forfeit).
      if (started) send({ k: "bye" });
      if (ticker) clearInterval(ticker);
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
