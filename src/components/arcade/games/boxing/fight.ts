// The boxing match itself, as plain logic (no 3D, no React): two fighters, the opponent's moves with their
// tells, your punches and defence, stamina, counters, the star punch, knockdowns and the judges. The scene and
// HUD read the state each frame and draw it; `step` advances it by game time. Numbers: data/arcade/boxing.json.

import RULES from "@/data/arcade/boxing.json";

export type Punch = "jab" | "straight" | "hookL" | "hookR" | "upper";
export type OppMove = "jab" | "hookL" | "hookR" | "upper" | "combo";
export type Dodge = "slipL" | "slipR" | "duck";
export type Level = (typeof RULES.levels)[number];

export interface FightEvent {
  kind: "hit" | "taken" | "blocked" | "dodged" | "counter" | "interrupt" | "star" | "knockdown" | "down" | "up" | "bell" | "tired" | "ko" | "decision" | "feint";
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

export interface FightState {
  phase: "fight" | "meDown" | "opDown" | "rest" | "over";
  round: number;
  /** Seconds into this round (or into the rest, or the count). */
  t: number;
  me: Fighter;
  op: Fighter;
  /** Your punch in motion: which, and how far through it (seconds). */
  punch: { move: Punch; at: number; landed: boolean; star: boolean } | null;
  /** Your dodge: which, and how far through it; then the recovery before another. */
  dodge: { move: Dodge; at: number } | null;
  /** Holding block. */
  blocking: boolean;
  /** The opponent's attack: which, its phase and how far through it, the hand it comes from (screen side). */
  opAttack: { move: OppMove; phase: "tell" | "strike"; at: number; tell: number; hit: number; feint: boolean; punish?: boolean } | null;
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
    phase: "fight", round: 1, t: 0, me, op, myStamina: body.stamina, myPower: body.power, punch: null, dodge: null, blocking: false, opAttack: null,
    opWait: 1.6, openUntil: 0, stunUntil: 0, opBlocking: false, recoil: 0, opRecoil: 0, star: 0, combo: 0, blockedRun: 0,
    getUp: { taps: 0, need: 0, count: 0 }, clockAtCount: 0, cards: [], result: null,
    stats: { thrown: 0, landed: 0, counters: 0, dodged: 0, blockedByMe: 0, interrupts: 0, stars: 0 }, events: [],
  };
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
    s.punch = { move, at: 0, landed: false, star };
    if (star) s.star = 0;
    s.stats.thrown++;
    // Whether the opponent gets a glove up is decided as the punch starts; a tired punch is easier to block.
    const open = s.t < s.openUntil || s.t < s.stunUntil;
    const attacking = !!s.opAttack;
    s.opBlocking = !open && !attacking && !star && rand() < level.blockChance * (tired ? 1.8 : 1);
    if (tired) s.events.push({ kind: "tired" });
  }
  if (s.punch) {
    const p = s.punch, def = cost[p.move];
    const time = def.time * (s.me.stamina < RULES.stamina.tiredBelow ? 1.35 : 1);
    p.at += dt;
    if (!p.landed && p.at >= time * 0.55) {
      p.landed = true;
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
          s.opAttack = { move: "jab", phase: "tell", at: 0, tell: RULES.punish.tell * level.tellScale, hit: 0, feint: false, punish: true };
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
        s.stats.landed++;
        if (p.star) { s.stats.stars++; s.events.push({ kind: "star", amount: Math.round(dmg) }); }
        else s.events.push({ kind: "hit", who: "op", amount: Math.round(dmg) });
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
      const tell = m.tell * level.tellScale * (0.85 + rand() * 0.3);
      s.opAttack = { move, phase: "tell", at: 0, tell, hit: 0, feint: rand() < level.feint };
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
        if (dodging && m.beatenBy.includes(dodging)) {
          s.stats.dodged++;
          s.star = Math.min(1, s.star + RULES.star.fillPerDodge);
          s.openUntil = s.t + RULES.counter.window;
          s.events.push({ kind: "dodged", text: dodging });
        } else {
          let dmg = m.damage * level.damageScale * (a.punish ? RULES.punish.damageScale : 1);
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
