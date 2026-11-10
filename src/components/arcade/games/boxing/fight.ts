// The boxing match itself, as plain logic (no 3D, no React): two fighters, the opponent's moves with their
// tells, your punches and defence, stamina, counters, the star punch, knockdowns and the judges. The scene and
// HUD read the state each frame and draw it; `step` advances it by game time. Numbers: data/arcade/boxing.json.

import RULES from "@/data/arcade/boxing.json";

export type Punch = "jab" | "straight" | "hookL" | "hookR" | "upper" | "onetwo" | "body";
export type OppMove = "jab" | "hookL" | "hookR" | "upper" | "combo";
export type Dodge = "slipL" | "slipR" | "duck";
export type Level = (typeof RULES.levels)[number];

export interface FightEvent {
  kind: "hit" | "body" | "taken" | "blocked" | "dodged" | "counter" | "interrupt" | "star" | "knockdown" | "down" | "up" | "bell" | "tired" | "ko" | "decision" | "feint" | "whiff" | "ropes";
  /** Who it's about: "me" (the player) or "op". */
  who?: "me" | "op";
  amount?: number;
  text?: string;
}

export interface Fighter {
  hp: number;
  stamina: number;
  /** Knockdowns this round, and in the fight. */
  kdRound: number;
  kdTotal: number;
  /** Damage dealt this round (for the judges) and in the fight. */
  dealtRound: number;
  dealt: number;
}

/** A spot on the canvas (m from the centre): x across, z towards the player's corner. */
export type Spot = [number, number];

export interface FightState {
  phase: "fight" | "meDown" | "opDown" | "rest" | "over";
  /** Where each fighter stands (footwork), and how fast they're moving (for the scene's step bounce). */
  pos: { me: Spot; op: Spot };
  speed: { me: number; op: number };
  round: number;
  /** Seconds into this round (or into the rest, or the count). */
  t: number;
  me: Fighter;
  op: Fighter;
  /** Your punch in motion: which, and how far through it (seconds). */
  punch: { move: Punch; at: number; landed: boolean; star: boolean; hit: number } | null;
  /** A body shot landed: the opponent is winded (slower wind-ups) until this round time. */
  windedUntil: number;
  /** Your dodge: which, and how far through it; then the recovery before another. */
  dodge: { move: Dodge; at: number } | null;
  /** Holding block. */
  blocking: boolean;
  /** A live bout: the other player's dodge (the single-player opponent never dodges). */
  opDodge?: { move: Dodge; at: number } | null;
  /** The opponent's attack: which, its phase and how far through it, the hand it comes from (screen side). */
  opAttack: { move: OppMove; phase: "tell" | "strike"; at: number; tell: number; hit: number; feint: boolean; punish?: boolean; aim?: Spot } | null;
  /** Seconds until the opponent's next attack starts. */
  opWait: number;
  /** The opponent is open to counters until this round time, and staggered (can't attack or block) until this. */
  openUntil: number;
  stunUntil: number;
  /** The opponent is blocking this punch (decided as your punch starts). */
  opBlocking: boolean;
  /** Your recoil after being hit (seconds left), for the scene. */
  recoil: number;
  opRecoil: number;
  /** 0..1, the star punch meter. */
  star: number;
  combo: number;
  /** Your punches blocked in a row (the opponent punishes mashing). */
  blockedRun: number;
  /** Getting up off the canvas: taps so far and taps needed; the referee's count. */
  getUp: { taps: number; need: number; count: number };
  /** The round clock when a knockdown stopped it (it resumes from here). */
  clockAtCount: number;
  /** Your gym training (lib/body): stamina pool and recovery, and punch power, as multipliers. */
  myStamina: number;
  myPower: number;
  /** Judges' points per round: [me, op]. */
  cards: Array<[number, number]>;
  result: { win: boolean; method: "KO" | "TKO" | "Decision"; round: number } | null;
  stats: { thrown: number; landed: number; counters: number; dodged: number; blockedByMe: number; interrupts: number; stars: number };
  /** What happened this step, for sounds, callouts and shake. */
  events: FightEvent[];
}

export interface FightInput {
  /** A punch asked for this step (ignored while one is already in motion, while dodging or down). */
  punch?: Punch;
  /** Use the star punch (when the meter is full; it replaces the next punch). */
  star?: boolean;
  dodge?: Dodge;
  blocking: boolean;
  /** Taps to get up, when down. */
  taps: number;
  /** The analog stick (-1..1): x circles right, y steps in (towards the opponent). */
  move?: { x: number; y: number };
}

export const FIGHT_RULES = RULES;
export const levelFor = (n: number): Level => RULES.levels[Math.max(0, Math.min(RULES.levels.length - 1, n - 1))];

const fresh = (): Fighter => ({ hp: RULES.hp, stamina: RULES.stamina.max, kdRound: 0, kdTotal: 0, dealtRound: 0, dealt: 0 });

export function newFight(level?: Level, body: { stamina: number; power: number } = { stamina: 1, power: 1 }): FightState {
  const op = fresh();
  op.hp = Math.round(RULES.hp * (level?.hpScale ?? 1));
  const me = fresh();
  me.stamina = RULES.stamina.max * body.stamina;
  return {
    phase: "fight", round: 1, t: 0, me, op, pos: { me: [0, 0.62], op: [0, -0.62] }, speed: { me: 0, op: 0 }, myStamina: body.stamina, myPower: body.power, punch: null, dodge: null, blocking: false, opAttack: null,
    opWait: 1.6, openUntil: 0, stunUntil: 0, windedUntil: 0, opBlocking: false, recoil: 0, opRecoil: 0, star: 0, combo: 0, blockedRun: 0,
    getUp: { taps: 0, need: 0, count: 0 }, clockAtCount: 0, cards: [], result: null,
    stats: { thrown: 0, landed: 0, counters: 0, dodged: 0, blockedByMe: 0, interrupts: 0, stars: 0 }, events: [],
  };
}

const FW = RULES.footwork;
/** Distance between the fighters, and the unit vector from me to the opponent. */
export function facing(s: FightState) {
  const dx = s.pos.op[0] - s.pos.me[0], dz = s.pos.op[1] - s.pos.me[1];
  const d = Math.max(0.001, Math.hypot(dx, dz));
  return { d, fx: dx / d, fz: dz / d };
}
const clampRing = (p: Spot) => { p[0] = Math.max(-FW.ringHalf, Math.min(FW.ringHalf, p[0])); p[1] = Math.max(-FW.ringHalf, Math.min(FW.ringHalf, p[1])); };
/** Backed onto the ropes: near any edge of the canvas. */
export const onRopes = (p: Spot) => Math.max(Math.abs(p[0]), Math.abs(p[1])) > FW.ringHalf - FW.ropes;
const inReach = (s: FightState, move: string) => facing(s).d <= FW.reach * ((FW.reachScale as Record<string, number>)[move] ?? 1);

/** The opponent's punch is thrown where you were: its aim follows you, but only so fast. */
function trackAim(s: FightState, dt: number) {
  const a = s.opAttack;
  if (!a?.aim) return;
  const dx = s.pos.me[0] - a.aim[0], dz = s.pos.me[1] - a.aim[1], d = Math.hypot(dx, dz);
  const k = Math.min(d, ((FW.track as Record<string, number>)[a.move] ?? 1.2) * dt);
  if (d > 0) { a.aim[0] += (dx / d) * k; a.aim[1] += (dz / d) * k; }
}
const offAim = (s: FightState) => !!s.opAttack?.aim && Math.hypot(s.pos.me[0] - s.opAttack.aim[0], s.pos.me[1] - s.opAttack.aim[1]) > FW.hitRadius;

/** Both fighters' footwork for one step: you on the stick, the opponent stalking (and stepping in to strike). */
function footwork(s: FightState, dt: number, input: FightInput, level: Level) {
  const { d, fx, fz } = facing(s);
  // Me: forward is towards the opponent, sideways circles them; slower backing off, punching or ducking.
  const mx = input.move?.x ?? 0, my = input.move?.y ?? 0;
  const mag = Math.min(1, Math.hypot(mx, my));
  let v = FW.speed * (s.punch ? FW.punchingScale : 1) * (s.dodge ? 0.5 : 1) * (s.me.stamina < RULES.stamina.tiredBelow ? 0.7 : 1);
  if (my < 0) v *= FW.backScale + (1 - FW.backScale) * (1 - Math.abs(my) / Math.max(mag, 0.001));
  const rx = -fz, rz = fx; // my right
  const before: Spot = [s.pos.me[0], s.pos.me[1]];
  s.pos.me[0] += (rx * mx + fx * my) * v * dt;
  s.pos.me[1] += (rz * mx + fz * my) * v * dt;
  clampRing(s.pos.me);
  if (mag > 0.05) s.me.stamina = Math.max(0, s.me.stamina - FW.staminaPerSecond * mag * dt);
  s.speed.me = Math.hypot(s.pos.me[0] - before[0], s.pos.me[1] - before[1]) / dt;

  // The opponent: holds its preferred distance, steps in on a wind-up, drifts round you, off the ropes.
  const a = s.opAttack;
  const want = a ? FW.preferred - 0.12 : FW.preferred;
  const stunned = s.t < s.stunUntil;
  const pace = (a ? FW.opStepIn : FW.opSpeed) * (1 + FW.opSpeedPerLevel * (level.n - 1)) * (stunned ? 0.3 : 1);
  const gap = d - want;
  const along = Math.max(-1, Math.min(1, gap * 3)) * pace; // + = towards me
  const side = a ? 0 : Math.sin(s.t * 0.8 + s.round) * FW.circle;
  const ob: Spot = [s.pos.op[0], s.pos.op[1]];
  s.pos.op[0] += (-fx * along + rx * side) * dt;
  s.pos.op[1] += (-fz * along + rz * side) * dt;
  // Off its own ropes, towards the middle.
  if (onRopes(s.pos.op)) { s.pos.op[0] -= Math.sign(s.pos.op[0]) * 0.6 * dt; s.pos.op[1] -= Math.sign(s.pos.op[1]) * 0.6 * dt; }
  clampRing(s.pos.op);
  s.speed.op = Math.hypot(s.pos.op[0] - ob[0], s.pos.op[1] - ob[1]) / dt;

  // Never inside each other: too close, both are pushed apart.
  const f2 = facing(s);
  if (f2.d < FW.close) {
    const push = (FW.close - f2.d) / 2;
    s.pos.me[0] -= f2.fx * push; s.pos.me[1] -= f2.fz * push;
    s.pos.op[0] += f2.fx * push; s.pos.op[1] += f2.fz * push;
    clampRing(s.pos.me); clampRing(s.pos.op);
  }
}

/** A random pick by weight. `rand` is 0..1. */
function pick(weights: Record<string, number>, rand: number): OppMove {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k as OppMove; }
  return entries[entries.length - 1][0] as OppMove;
}

/** Ends the round for the judges: 10 to the fighter who did more damage, 9 to the other, a point off per knockdown. */
function scoreRound(s: FightState) {
  const me = s.me.dealtRound, op = s.op.dealtRound;
  let a = me >= op ? 10 : 9, b = op > me ? 10 : 9;
  if (me === op) { a = 10; b = 10; }
  a -= s.me.kdRound; b -= s.op.kdRound;
  s.cards.push([Math.max(6, a), Math.max(6, b)]);
}

function finish(s: FightState, win: boolean, method: "KO" | "TKO" | "Decision") {
  s.phase = "over";
  s.result = { win, method, round: s.round };
  s.punch = null; s.opAttack = null;
  s.events.push({ kind: method === "Decision" ? "decision" : "ko", who: win ? "me" : "op" });
}

/** Knocks a fighter down: the count starts (or it's over at the third knockdown of a round). */
function knockDown(s: FightState, who: "me" | "op") {
  const f = who === "me" ? s.me : s.op;
  f.kdRound++; f.kdTotal++;
  s.punch = null; s.opAttack = null; s.dodge = null;
  s.events.push({ kind: "knockdown", who });
  if (f.kdRound >= RULES.knockdown.tkoAt) { finish(s, who === "op", "TKO"); return; }
  s.phase = who === "me" ? "meDown" : "opDown";
  s.clockAtCount = s.t;
  s.t = 0;
  s.getUp = { taps: 0, need: RULES.knockdown.tapsBase + RULES.knockdown.tapsPerKnockdown * (f.kdTotal - 1), count: 0 };
}

function standUp(s: FightState, who: "me" | "op", level: Level) {
  const f = who === "me" ? s.me : s.op;
  f.hp = RULES.knockdown.getUpHp[Math.min(f.kdTotal - 1, RULES.knockdown.getUpHp.length - 1)] * (who === "op" ? level.hpScale : 1);
  f.stamina = RULES.stamina.max * 0.7 * (who === "me" ? s.myStamina : 1);
  s.phase = "fight";
  // The round clock carries on from where the knockdown stopped it.
  s.t = s.clockAtCount;
  s.opWait = 1.4;
  s.events.push({ kind: "up", who });
}

/**
 * Advances the fight by dt game seconds with this step's input. `level` sets how the opponent fights;
 * `rand` supplies randomness (Math.random in play, seeded in tests).
 */
export function step(s: FightState, dt: number, input: FightInput, level: Level, rand: () => number = Math.random): FightState {
  s.events = [];
  if (s.phase === "over") return s;
  s.recoil = Math.max(0, s.recoil - dt);
  s.opRecoil = Math.max(0, s.opRecoil - dt);

  // ---- Between rounds: recover a little, then the bell.
  if (s.phase === "rest") {
    s.t += dt;
    if (s.t >= RULES.restSeconds) {
      s.round++;
      s.phase = "fight"; s.t = 0; s.opWait = 1.5;
      s.me.kdRound = 0; s.op.kdRound = 0; s.me.dealtRound = 0; s.op.dealtRound = 0;
      s.me.stamina = RULES.stamina.max * s.myStamina;
      s.pos = { me: [0, 0.62], op: [0, -0.62] };
      s.events.push({ kind: "bell", text: `Round ${s.round}` });
    }
    return s;
  }

  // ---- On the canvas: the count, and (for you) tapping to get up.
  if (s.phase === "meDown" || s.phase === "opDown") {
    s.t += dt;
    s.getUp.count = Math.min(10, Math.floor(s.t / RULES.knockdown.countStep) + 1);
    if (s.phase === "meDown") {
      s.getUp.taps += input.taps;
      if (s.getUp.taps >= s.getUp.need && s.getUp.count < 10) { standUp(s, "me", level); return s; }
      if (s.t >= RULES.knockdown.countStep * 10) finish(s, false, "KO");
    } else {
      // The opponent beats the count unless it's their third knockdown of the fight, getting up later each time.
      const upAt = s.op.kdTotal >= 3 ? 99 : 3 + s.op.kdTotal * 2 + Math.floor(rand() * 2);
      if (s.getUp.count >= upAt) { standUp(s, "op", level); return s; }
      if (s.t >= RULES.knockdown.countStep * 10) finish(s, true, "KO");
    }
    return s;
  }

  // ---- The round.
  s.t += dt;
  const cost = RULES.player;
  footwork(s, dt, input, level);
  trackAim(s, dt);

  // Stamina comes back when you're not punching or blocking.
  if (!s.punch && !input.blocking) s.me.stamina = Math.min(RULES.stamina.max * s.myStamina, s.me.stamina + RULES.stamina.regenPerSecond * s.myStamina * dt);
  s.blocking = input.blocking && !s.dodge && !s.punch;

  // Dodges: a short active window, then a recovery when you can't dodge again.
  if (s.dodge) {
    s.dodge.at += dt;
    if (s.dodge.at >= RULES.dodge.active + RULES.dodge.recover) s.dodge = null;
  } else if (input.dodge && !s.punch) {
    s.dodge = { move: input.dodge, at: 0 };
  }

  // Your punches.
  if (!s.punch && !s.dodge && (input.punch || (input.star && s.star >= 1))) {
    const star = !!input.star && s.star >= 1;
    const move: Punch = star ? "upper" : input.punch!;
    const tired = s.me.stamina < RULES.stamina.tiredBelow;
    s.me.stamina = Math.max(0, s.me.stamina - cost[move].cost);
    s.punch = { move, at: 0, landed: false, star, hit: 0 };
    if (star) s.star = 0;
    s.stats.thrown++;
    // Whether the opponent gets a glove up is decided as the punch starts; a tired punch is easier to block.
    const open = s.t < s.openUntil || s.t < s.stunUntil;
    const attacking = !!s.opAttack;
    const low = (cost[move] as { blockScale?: number }).blockScale ?? 1;
    s.opBlocking = !open && !attacking && !star && rand() < level.blockChance * low * (tired ? 1.8 : 1);
    if (tired) s.events.push({ kind: "tired" });
  }
  if (s.punch) {
    const p = s.punch, def = cost[p.move];
    const time = def.time * (s.me.stamina < RULES.stamina.tiredBelow ? 1.35 : 1);
    p.at += dt;
    // When each hit lands: one punch at 55% of its time; a one-two's jab at 38% and its straight at 85%.
    const hits = (def as { hits?: number }).hits ?? 1;
    const moments = hits === 2 ? [0.38, 0.85] : [0.55];
    while (s.punch && p.hit < hits && p.at >= time * moments[p.hit]) {
      p.hit++;
      if (p.hit === hits) p.landed = true;
      // The one-two's straight follows the jab through: a guard that stopped the jab only stops it some of the time.
      if (p.hit === 2) s.opBlocking = s.opBlocking && rand() < ((def as { secondBlock?: number }).secondBlock ?? 1);
      if (!inReach(s, p.move)) {
        // Out of range: it whiffs (the star punch is kept for the next one in range).
        s.combo = 0;
        if (p.star) s.star = 1;
        s.events.push({ kind: "whiff" });
        continue;
      }
      const counter = s.t < s.openUntil;
      const tired = s.me.stamina < RULES.stamina.tiredBelow;
      let dmg = (p.star ? RULES.star.damage : def.damage * (tired ? 0.5 : 1)) * s.myPower;
      if (s.opBlocking) {
        dmg *= 0.15;
        s.events.push({ kind: "blocked", who: "op" });
        s.combo = 0;
        // Punching into a guard gets punished: a fast jab straight back.
        if (++s.blockedRun >= RULES.punish.after && !s.opAttack) {
          s.blockedRun = 0;
          s.opAttack = { move: "jab", phase: "tell", at: 0, tell: RULES.punish.tell * level.tellScale, hit: 0, feint: false, punish: true, aim: [s.pos.me[0], s.pos.me[1]] };
        }
      } else {
        s.blockedRun = 0;
        if (counter) { dmg *= RULES.counter.multiplier; s.stats.counters++; s.star = Math.min(1, s.star + RULES.star.fillPerCounter); s.events.push({ kind: "counter", amount: Math.round(dmg) }); }
        // Hitting the opponent mid-wind-up can stop the attack.
        if (s.opAttack?.phase === "tell" && rand() < level.interruptChance) {
          s.opAttack = null; s.opWait = 0.9; s.stunUntil = s.t + 0.45; s.stats.interrupts++;
          s.events.push({ kind: "interrupt" });
        }
        s.combo++;
        if (p.hit === hits) s.stats.landed++;
        if (p.star) { s.stats.stars++; s.events.push({ kind: "star", amount: Math.round(dmg) }); }
        else if (p.move === "body") {
          // Winded: their wind-ups come slower for a few seconds.
          s.windedUntil = s.t + ((def as { winds?: number }).winds ?? 3);
          s.events.push({ kind: "body", who: "op", amount: Math.round(dmg) });
        } else s.events.push({ kind: "hit", who: "op", amount: Math.round(dmg) });
        s.opRecoil = 0.25;
      }
      s.op.hp = Math.max(0, s.op.hp - dmg);
      s.me.dealtRound += dmg; s.me.dealt += dmg;
      if (s.op.hp <= 0) { knockDown(s, "op"); return s; }
    }
    if (p.at >= time) s.punch = null;
  }

  // The opponent: wait, wind up (the tell), strike.
  if (!s.opAttack) {
    if (s.t >= s.stunUntil) s.opWait -= dt;
    if (s.opWait <= 0) {
      const move = pick(level.weights, rand());
      const m = RULES.opponent[move];
      const tell = m.tell * level.tellScale * (0.85 + rand() * 0.3) * (s.t < s.windedUntil ? 1.25 : 1);
      s.opAttack = { move, phase: "tell", at: 0, tell, hit: 0, feint: rand() < level.feint, aim: [s.pos.me[0], s.pos.me[1]] };
    }
  } else {
    const a = s.opAttack, m = RULES.opponent[a.move];
    a.at += dt;
    if (a.phase === "tell" && a.at >= a.tell) {
      if (a.feint) {
        // A feint: the wind-up, then nothing. Dodging early wasted your dodge.
        s.events.push({ kind: "feint" });
        s.opAttack = null;
        s.opWait = 0.25 + rand() * 0.3;
      } else {
        a.phase = "strike"; a.at = 0;
      }
    }
    if (s.opAttack && a.phase === "strike") {
      const hits = "hits" in m ? (m as { hits: number }).hits : 1;
      const gap = "gap" in m ? (m as { gap: number }).gap : 0;
      // Each hit of the attack lands at its moment in the strike.
      while (a.hit < hits && a.at >= m.strike * 0.5 + a.hit * gap) {
        a.hit++;
        const dodging = s.dodge && s.dodge.at < RULES.dodge.active ? s.dodge.move : null;
        if (!inReach(s, a.move) || offAim(s)) {
          // Stepped out of range: it misses, and they're open, as after a dodge.
          s.stats.dodged++;
          s.star = Math.min(1, s.star + RULES.star.fillPerDodge);
          s.openUntil = s.t + RULES.counter.window;
          s.events.push({ kind: "dodged", text: "range" });
        } else if (dodging && m.beatenBy.includes(dodging)) {
          s.stats.dodged++;
          s.star = Math.min(1, s.star + RULES.star.fillPerDodge);
          s.openUntil = s.t + RULES.counter.window;
          s.events.push({ kind: "dodged", text: dodging });
        } else {
          let dmg = m.damage * level.damageScale * (a.punish ? RULES.punish.damageScale : 1);
          // Pinned on the ropes, every punch hurts more.
          if (onRopes(s.pos.me)) { dmg *= FW.ropesDamage; if (a.hit === 1) s.events.push({ kind: "ropes" }); }
          if (dodging === "duck" && "duckTakes" in m) dmg *= (m as { duckTakes: number }).duckTakes;
          if (s.blocking && !dodging) {
            dmg *= m.blockKeeps;
            s.me.stamina = Math.max(0, s.me.stamina - RULES.stamina.blockCost);
            s.stats.blockedByMe++;
            s.events.push({ kind: "blocked", who: "me" });
          }
          if (dmg > 0) {
            s.me.hp = Math.max(0, s.me.hp - dmg);
            s.op.dealtRound += dmg; s.op.dealt += dmg;
            s.recoil = 0.3;
            s.combo = 0;
            s.punch = null;
            s.events.push({ kind: "taken", amount: Math.round(dmg) });
            if (s.me.hp <= 0) { knockDown(s, "me"); return s; }
          }
        }
      }
      if (a.at >= m.strike + gap * (hits - 1) + 0.12) {
        s.opAttack = null;
        s.opWait = level.gap[0] + rand() * (level.gap[1] - level.gap[0]);
      }
    }
  }

  // The bell.
  if (s.t >= RULES.roundSeconds) {
    scoreRound(s);
    if (s.round >= RULES.rounds) {
      const [a, b] = s.cards.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
      finish(s, a > b || (a === b && s.me.dealt >= s.op.dealt), "Decision");
    } else {
      s.phase = "rest"; s.t = 0; s.punch = null; s.opAttack = null; s.dodge = null;
      s.events.push({ kind: "bell", text: "End of the round" });
    }
  }
  return s;
}

/** The round's score and stars once it's over. */
export function scoreFight(s: FightState) {
  const r = s.result;
  const score = Math.round(
    s.me.dealt * 10 + s.stats.counters * 150 + s.stats.dodged * 40 + s.op.kdTotal * 1000 - s.me.kdTotal * 300
    + (r?.win ? (r.method === "Decision" ? 2000 : 3000 + (RULES.rounds - r.round) * 500) : 0),
  );
  const stars = r?.win ? (r.method === "Decision" ? 2 : 3) : s.me.dealt >= RULES.hp * 0.9 ? 1 : 0;
  return { score: Math.max(0, score), stars };
}
