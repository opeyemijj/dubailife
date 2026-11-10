// A live bout between two players (no 3D, no React, no network): both fighters are people, each with the same
// punches, dodges, guard, footwork and stamina as the single-player fight (fight.ts), and every punch has a short
// wind-up (its tell) so the other can read it. One phone (the challenger's, "side 0") runs this and streams it;
// `viewFor` turns it into the single-player FightState from either side, so the ring, the boxers, the camera and
// the HUD draw a live bout exactly as they draw a fight against the computer.

import RULES from "@/data/arcade/boxing.json";
import { onRopes, type Dodge, type FightEvent, type FightInput, type FightState, type OppMove, type Punch, type Spot } from "./fight";

export type Side = 0 | 1;
const D = RULES.duel;
const FW = RULES.footwork;
const P = RULES.player as Record<Punch, { time: number; cost: number; damage: number; hand: string; hits?: number; secondBlock?: number; blockScale?: number; winds?: number }>;

export interface DuelFighter {
  hp: number; stamina: number; pos: Spot; speed: number;
  /** The punch: its wind-up first (`at` < windUp), then the motion; hits counted as they land. */
  punch: { move: Punch; at: number; hit: number; star: boolean } | null;
  dodge: { move: Dodge; at: number } | null;
  blocking: boolean;
  recoil: number;
  /** This fighter can counter (they just made a punch miss) until this round time. */
  counterUntil: number;
  star: number; combo: number;
  kdRound: number; kdTotal: number; dealtRound: number; dealt: number;
  /** Gym training (lib/body), as multipliers. */
  staminaScale: number; power: number;
  stats: FightState["stats"];
}

export interface DuelEvent { kind: FightEvent["kind"]; side: Side; amount?: number; text?: string }

export interface DuelState {
  phase: "fight" | "down" | "rest" | "over";
  /** Who's on the canvas, while phase is "down". */
  downSide: Side;
  round: number; t: number; clockAtCount: number;
  getUp: { taps: number; need: number; count: number };
  f: [DuelFighter, DuelFighter];
  /** Judges' points per round, [side 0, side 1]. */
  cards: Array<[number, number]>;
  result: { winner: Side; method: "KO" | "TKO" | "Decision"; round: number; left?: boolean } | null;
  events: DuelEvent[];
}

const fighter = (pos: Spot, body: { stamina: number; power: number }): DuelFighter => ({
  hp: RULES.hp, stamina: RULES.stamina.max * body.stamina, pos, speed: 0, punch: null, dodge: null, blocking: false, recoil: 0,
  counterUntil: 0, star: 0, combo: 0, kdRound: 0, kdTotal: 0, dealtRound: 0, dealt: 0, staminaScale: body.stamina, power: body.power,
  stats: { thrown: 0, landed: 0, counters: 0, dodged: 0, blockedByMe: 0, interrupts: 0, stars: 0 },
});

export function newDuel(bodies: [{ stamina: number; power: number }, { stamina: number; power: number }]): DuelState {
  return {
    phase: "fight", downSide: 0, round: 1, t: 0, clockAtCount: 0, getUp: { taps: 0, need: 0, count: 0 },
    f: [fighter([0, 0.62], bodies[0]), fighter([0, -0.62], bodies[1])], cards: [], result: null, events: [],
  };
}

const other = (side: Side): Side => (side === 0 ? 1 : 0);
const clamp = (p: Spot) => { p[0] = Math.max(-FW.ringHalf, Math.min(FW.ringHalf, p[0])); p[1] = Math.max(-FW.ringHalf, Math.min(FW.ringHalf, p[1])); };
const tiredOf = (f: DuelFighter) => f.stamina < RULES.stamina.tiredBelow;

function facingFrom(s: DuelState, side: Side) {
  const a = s.f[side].pos, b = s.f[other(side)].pos;
  const dx = b[0] - a[0], dz = b[1] - a[1], d = Math.max(0.001, Math.hypot(dx, dz));
  return { d, fx: dx / d, fz: dz / d };
}

function move(s: DuelState, side: Side, input: FightInput, dt: number) {
  const f = s.f[side];
  const { fx, fz } = facingFrom(s, side);
  const mx = input.move?.x ?? 0, my = input.move?.y ?? 0, mag = Math.min(1, Math.hypot(mx, my));
  let v = FW.speed * (f.punch ? FW.punchingScale : 1) * (f.dodge ? 0.5 : 1) * (tiredOf(f) ? 0.7 : 1);
  if (my < 0) v *= FW.backScale + (1 - FW.backScale) * (1 - Math.abs(my) / Math.max(mag, 0.001));
  const rx = -fz, rz = fx;
  const before: Spot = [f.pos[0], f.pos[1]];
  f.pos[0] += (rx * mx + fx * my) * v * dt;
  f.pos[1] += (rz * mx + fz * my) * v * dt;
  clamp(f.pos);
  if (mag > 0.05) f.stamina = Math.max(0, f.stamina - FW.staminaPerSecond * mag * dt);
  f.speed = Math.hypot(f.pos[0] - before[0], f.pos[1] - before[1]) / dt;
}

function finish(s: DuelState, winner: Side, method: "KO" | "TKO" | "Decision", left = false) {
  s.phase = "over";
  s.result = { winner, method, round: s.round, left };
  s.f.forEach((f) => { f.punch = null; f.dodge = null; });
  s.events.push({ kind: method === "Decision" ? "decision" : "ko", side: winner });
}

/** The other player left (their phone stopped answering): the bout is the one still here's. */
export function forfeit(s: DuelState, winner: Side) {
  if (s.phase !== "over") finish(s, winner, "TKO", true);
}

function knockDown(s: DuelState, side: Side) {
  const f = s.f[side];
  f.kdRound++; f.kdTotal++;
  s.f.forEach((x) => { x.punch = null; x.dodge = null; });
  s.events.push({ kind: "knockdown", side });
  if (f.kdRound >= RULES.knockdown.tkoAt) { finish(s, other(side), "TKO"); return; }
  s.phase = "down"; s.downSide = side; s.clockAtCount = s.t; s.t = 0;
  s.getUp = { taps: 0, need: RULES.knockdown.tapsBase + RULES.knockdown.tapsPerKnockdown * (f.kdTotal - 1), count: 0 };
}

function scoreRound(s: DuelState) {
  const a = s.f[0].dealtRound, b = s.f[1].dealtRound;
  let x = a >= b ? 10 : 9, y = b > a ? 10 : 9;
  if (a === b) { x = 10; y = 10; }
  s.cards.push([Math.max(6, x - s.f[0].kdRound), Math.max(6, y - s.f[1].kdRound)]);
}

/** One fighter's punch, dodge and guard for this step; their hits resolved against the other. */
function fight(s: DuelState, side: Side, input: FightInput, dt: number) {
  const f = s.f[side], foe = s.f[other(side)];
  if (!f.punch && !input.blocking) f.stamina = Math.min(RULES.stamina.max * f.staminaScale, f.stamina + RULES.stamina.regenPerSecond * f.staminaScale * dt);
  f.blocking = input.blocking && !f.dodge && !f.punch;
  f.recoil = Math.max(0, f.recoil - dt);
  if (f.dodge) { f.dodge.at += dt; if (f.dodge.at >= RULES.dodge.active + RULES.dodge.recover) f.dodge = null; }
  else if (input.dodge && !f.punch) f.dodge = { move: input.dodge, at: 0 };

  if (!f.punch && !f.dodge && f.recoil <= 0 && (input.punch || (input.star && f.star >= 1))) {
    const star = !!input.star && f.star >= 1;
    const m: Punch = star ? "upper" : input.punch!;
    f.stamina = Math.max(0, f.stamina - P[m].cost);
    f.punch = { move: m, at: 0, hit: 0, star };
    if (star) f.star = 0;
    f.stats.thrown++;
    if (tiredOf(f)) s.events.push({ kind: "tired", side });
  }
  const p = f.punch;
  if (!p) return;
  const def = P[p.move], wind = (D.windUp as Record<string, number>)[p.move] ?? 0.25;
  const time = def.time * (tiredOf(f) ? 1.35 : 1);
  p.at += dt;
  const hits = def.hits ?? 1, moments = hits === 2 ? [0.38, 0.85] : [0.55];
  while (f.punch && p.hit < hits && p.at >= wind + time * moments[p.hit]) {
    p.hit++;
    const { d } = facingFrom(s, side);
    if (d > FW.reach * ((FW.reachScale as Record<string, number>)[p.move] ?? 1)) {
      f.combo = 0; if (p.star) f.star = 1;
      s.events.push({ kind: "whiff", side });
      continue;
    }
    const dodging = foe.dodge && foe.dodge.at < RULES.dodge.active ? foe.dodge.move : null;
    if (dodging && (D.beatenBy as Record<string, string[]>)[p.move]?.includes(dodging) && !p.star) {
      foe.stats.dodged++;
      foe.star = Math.min(1, foe.star + RULES.star.fillPerDodge);
      foe.counterUntil = s.t + RULES.counter.window;
      f.combo = 0;
      s.events.push({ kind: "dodged", side: other(side), text: dodging });
      continue;
    }
    const tired = tiredOf(f);
    let dmg = (p.star ? RULES.star.damage : def.damage * (tired ? 0.5 : 1)) * f.power;
    if (dodging === "duck" && p.move === "upper") dmg *= D.duckTakesUpper;
    const counter = s.t < f.counterUntil;
    if (foe.blocking && !p.star) {
      dmg *= (D.blockKeeps as Record<string, number>)[p.move] ?? 0.2;
      foe.stamina = Math.max(0, foe.stamina - RULES.stamina.blockCost);
      foe.stats.blockedByMe++;
      f.combo = 0;
      s.events.push({ kind: "blocked", side: other(side) });
    } else {
      if (counter) { dmg *= RULES.counter.multiplier; f.stats.counters++; f.star = Math.min(1, f.star + RULES.star.fillPerCounter); }
      if (onRopes(foe.pos)) { dmg *= FW.ropesDamage; s.events.push({ kind: "ropes", side: other(side) }); }
      // Caught mid-punch: their punch is knocked off.
      if (foe.punch && foe.punch.hit === 0) { foe.punch = null; f.stats.interrupts++; s.events.push({ kind: "interrupt", side }); }
      if (p.move === "body") foe.stamina = Math.max(0, foe.stamina - D.bodyDrain);
      f.combo++;
      if (p.hit === hits) f.stats.landed++;
      if (p.star) f.stats.stars++;
      foe.recoil = 0.28;
      s.events.push({ kind: p.star ? "star" : counter ? "counter" : p.move === "body" ? "body" : "hit", side, amount: Math.round(dmg) });
    }
    foe.hp = Math.max(0, foe.hp - dmg);
    f.dealtRound += dmg; f.dealt += dmg;
    if (foe.hp <= 0) { knockDown(s, other(side)); return; }
  }
  if (f.punch && p.at >= wind + time) f.punch = null;
}

/** Advances the bout by dt with both players' inputs ([side 0, side 1]). */
export function stepDuel(s: DuelState, dt: number, inputs: [FightInput, FightInput]): DuelState {
  s.events = [];
  if (s.phase === "over") return s;

  if (s.phase === "rest") {
    s.t += dt;
    if (s.t >= RULES.restSeconds) {
      s.round++; s.phase = "fight"; s.t = 0;
      s.f.forEach((f, i) => { f.kdRound = 0; f.dealtRound = 0; f.stamina = RULES.stamina.max * f.staminaScale; f.pos = i === 0 ? [0, 0.62] : [0, -0.62]; });
      s.events.push({ kind: "bell", side: 0, text: `Round ${s.round}` });
    }
    return s;
  }

  if (s.phase === "down") {
    s.t += dt;
    s.getUp.count = Math.min(10, Math.floor(s.t / RULES.knockdown.countStep) + 1);
    s.getUp.taps += inputs[s.downSide].taps;
    if (s.getUp.taps >= s.getUp.need && s.getUp.count < 10) {
      const f = s.f[s.downSide];
      f.hp = RULES.knockdown.getUpHp[Math.min(f.kdTotal - 1, RULES.knockdown.getUpHp.length - 1)];
      f.stamina = RULES.stamina.max * 0.7 * f.staminaScale;
      s.phase = "fight"; s.t = s.clockAtCount;
      s.events.push({ kind: "up", side: s.downSide });
    } else if (s.t >= RULES.knockdown.countStep * 10) finish(s, other(s.downSide), "KO");
    return s;
  }

  s.t += dt;
  move(s, 0, inputs[0], dt);
  move(s, 1, inputs[1], dt);
  // Never inside each other.
  const { d, fx, fz } = facingFrom(s, 0);
  if (d < FW.close) {
    const push = (FW.close - d) / 2;
    s.f[0].pos[0] -= fx * push; s.f[0].pos[1] -= fz * push; s.f[1].pos[0] += fx * push; s.f[1].pos[1] += fz * push;
    clamp(s.f[0].pos); clamp(s.f[1].pos);
  }
  // Both throw in the same instant: side order alternates by round so neither always lands first.
  const order: Side[] = s.round % 2 ? [0, 1] : [1, 0];
  for (const side of order) { if (s.phase !== "fight") break; fight(s, side, inputs[side], dt); }
  if (s.phase !== "fight") return s;

  if (s.t >= RULES.roundSeconds) {
    scoreRound(s);
    if (s.round >= RULES.rounds) {
      const [a, b] = s.cards.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
      finish(s, a > b || (a === b && s.f[0].dealt >= s.f[1].dealt) ? 0 : 1, "Decision");
    } else {
      s.phase = "rest"; s.t = 0; s.f.forEach((f) => { f.punch = null; f.dodge = null; });
      s.events.push({ kind: "bell", side: 0, text: "End of the round" });
    }
  }
  return s;
}

/** What the single-player opponent's move would be for each punch (how the boxer draws it). */
const AS_OPP: Record<Punch, OppMove> = { jab: "jab", straight: "jab", onetwo: "combo", hookL: "hookL", hookR: "hookR", upper: "upper", body: "jab" };

/** The bout as one side sees it: their fighter is "me", the other "op" (the scene and HUD's FightState). */
export function viewFor(s: DuelState, side: Side, into?: FightState): FightState {
  const me = s.f[side], op = s.f[other(side)];
  const wind = (m: Punch) => (D.windUp as Record<string, number>)[m] ?? 0.25;
  const mine = me.punch && me.punch.at >= wind(me.punch.move) ? { move: me.punch.move, at: me.punch.at - wind(me.punch.move), landed: me.punch.hit > 0, star: me.punch.star, hit: me.punch.hit } : null;
  const theirs = op.punch
    ? op.punch.at < wind(op.punch.move)
      ? { move: AS_OPP[op.punch.move], phase: "tell" as const, at: op.punch.at, tell: wind(op.punch.move), hit: 0, feint: false }
      : { move: AS_OPP[op.punch.move], phase: "strike" as const, at: op.punch.at - wind(op.punch.move), tell: wind(op.punch.move), hit: op.punch.hit, feint: false }
    : null;
  const fighterView = (f: DuelFighter) => ({ hp: f.hp, stamina: f.stamina, kdRound: f.kdRound, kdTotal: f.kdTotal, dealtRound: f.dealtRound, dealt: f.dealt });
  const v: FightState = {
    phase: s.phase === "down" ? (s.downSide === side ? "meDown" : "opDown") : s.phase,
    pos: { me: me.pos, op: op.pos }, speed: { me: me.speed, op: op.speed },
    round: s.round, t: s.t, me: fighterView(me), op: fighterView(op),
    punch: mine, windedUntil: 0, dodge: me.dodge, blocking: me.blocking, opAttack: theirs, opWait: 0,
    openUntil: me.counterUntil, stunUntil: 0, opBlocking: op.blocking, opDodge: op.dodge, recoil: me.recoil, opRecoil: op.recoil,
    star: me.star, combo: me.combo, blockedRun: 0, getUp: s.getUp, clockAtCount: s.clockAtCount,
    myStamina: me.staminaScale, myPower: me.power,
    cards: s.cards.map(([a, b]) => (side === 0 ? [a, b] : [b, a]) as [number, number]),
    result: s.result ? { win: s.result.winner === side, method: s.result.method, round: s.result.round } : null,
    stats: me.stats, events: s.events.map((e) => eventFor(e, side)).filter((e): e is FightEvent => !!e),
  };
  return into ? Object.assign(into, v) : v;
}

/** An event in the bout, as the single-player event it reads as from this side. */
export function eventFor(e: DuelEvent, side: Side): FightEvent | null {
  const mine = e.side === side;
  switch (e.kind) {
    case "hit": case "body": case "counter": case "star": return mine ? { kind: e.kind, who: "op", amount: e.amount } : { kind: "taken", amount: e.amount };
    case "dodged": return mine ? { kind: "dodged", text: e.text } : { kind: "whiff" };
    case "blocked": return { kind: "blocked", who: mine ? "me" : "op" };
    case "knockdown": case "up": return { kind: e.kind, who: mine ? "me" : "op" };
    case "ko": case "decision": return { kind: e.kind, who: mine ? "me" : "op" };
    case "whiff": case "tired": case "interrupt": return mine ? { kind: e.kind } : null;
    case "ropes": return mine ? { kind: "ropes" } : null;
    case "bell": return { kind: "bell", text: e.text };
    default: return null;
  }
}
