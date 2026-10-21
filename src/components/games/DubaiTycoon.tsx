"use client";

// Dubai Tycoon: a property board game round 28 squares of Dubai. Roll two dice and move; buy the
// districts and metro stations you land on and collect rent from anyone who lands there. Own both
// districts of a colour to double the rent and build villas (up to three). Lucky Souk cards, Salik
// and DEWA bills (into the Free Majlis pot) and the speed camera keep it moving. Run out of money and
// you're out; the last player standing wins, or the richest after 30 rounds.

import { useState } from "react";
import type { BoardProps, GameModule } from "./types";

type Kind = "go" | "prop" | "metro" | "chance" | "tax" | "jail" | "parking" | "camera";
interface Sq { name: string; short: string; kind: Kind; group?: number; price?: number; tax?: number }

const GROUPS = ["#92400e", "#38bdf8", "#ec4899", "#f97316", "#dc2626", "#facc15", "#16a34a", "#1e3a8a"];
const P = (name: string, short: string, group: number, price: number): Sq => ({ name, short, kind: "prop", group, price });
const M = (name: string, short: string): Sq => ({ name, short, kind: "metro", price: 2000 });
const C: Sq = { name: "Lucky Souk", short: "Souk", kind: "chance" };

const BOARD: Sq[] = [
  { name: "Start · collect AED 2,000", short: "START", kind: "go" },
  P("Deira", "Deira", 0, 600), C, P("International City", "Intl City", 0, 600),
  { name: "Salik toll", short: "Salik", kind: "tax", tax: 500 }, M("Metro · Union", "Union"), P("Al Barsha", "Barsha", 1, 1000),
  { name: "Traffic Court (just visiting)", short: "COURT", kind: "jail" },
  P("JVC", "JVC", 1, 1000), P("Al Quoz", "Al Quoz", 2, 1400), C, P("Mirdif", "Mirdif", 2, 1400), M("Metro · Mall of the Emirates", "MoE"), P("JLT", "JLT", 3, 1800),
  { name: "Free Majlis · collect the pot", short: "MAJLIS", kind: "parking" },
  P("The Greens", "Greens", 3, 1800), P("Dubai Hills", "Hills", 4, 2200), C, P("Business Bay", "Bus. Bay", 4, 2200),
  { name: "DEWA bill", short: "DEWA", kind: "tax", tax: 1000 }, P("JBR", "JBR", 5, 2600),
  { name: "Speed camera · go to the Traffic Court", short: "CAMERA", kind: "camera" },
  P("Dubai Marina", "Marina", 5, 2600), P("City Walk", "City Walk", 6, 3000), M("Metro · Expo 2020", "Expo"), P("DIFC", "DIFC", 6, 3000),
  P("Palm Jumeirah", "Palm", 7, 3500), P("Downtown Dubai", "Downtown", 7, 4000),
];
const JAIL = 7;
const START_CASH = 15000;
const SALARY = 2000;
const MAX_ROUNDS = 30;
const RENT_X = [1, 5, 15, 40];
export const TOKENS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];

export interface TycoonState {
  cash: number[];
  pos: number[];
  out: boolean[];
  jail: number[];
  owner: (number | null)[];
  villas: number[];
  turn: number;
  phase: "roll" | "buy" | "manage";
  dice: [number, number] | null;
  doubles: number;
  again: boolean;
  rolls: number;
  pot: number;
  round: number;
  log: string[];
  card: string | null;
  winner: number | null;
}

const init = (seats: number): TycoonState => ({
  cash: Array(seats).fill(START_CASH), pos: Array(seats).fill(0), out: Array(seats).fill(false), jail: Array(seats).fill(0),
  owner: BOARD.map(() => null), villas: BOARD.map(() => 0),
  turn: 0, phase: "roll", dice: null, doubles: 0, again: false, rolls: 0, pot: 0, round: 1, log: ["Everyone starts with AED 15,000."], card: null, winner: null,
});

const fmt = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const villaCost = (sq: Sq) => Math.round((sq.price ?? 0) / 2);
const groupOf = (g: number) => BOARD.map((s, i) => (s.group === g ? i : -1)).filter((i) => i >= 0);
const ownsGroup = (s: TycoonState, seat: number, g: number) => groupOf(g).every((i) => s.owner[i] === seat);

function rentFor(s: TycoonState, i: number): number {
  const sq = BOARD[i], o = s.owner[i];
  if (o === null) return 0;
  if (sq.kind === "metro") return 250 * 2 ** (BOARD.filter((x, j) => x.kind === "metro" && s.owner[j] === o).length - 1);
  const base = Math.round((sq.price ?? 0) / 10);
  if (s.villas[i] > 0) return base * RENT_X[s.villas[i]];
  return ownsGroup(s, o, sq.group!) ? base * 2 : base;
}

export function netWorth(s: TycoonState, seat: number) {
  if (s.out[seat]) return 0;
  return s.cash[seat] + BOARD.reduce((t, sq, i) => (s.owner[i] === seat ? t + (sq.price ?? 0) + s.villas[i] * villaCost(sq) : t), 0);
}

const log = (s: TycoonState, line: string): TycoonState => ({ ...s, log: [line, ...s.log].slice(0, 6) });
const copy = (s: TycoonState): TycoonState => ({ ...s, cash: [...s.cash], pos: [...s.pos], out: [...s.out], jail: [...s.jail], owner: [...s.owner], villas: [...s.villas] });
const active = (s: TycoonState) => s.out.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);

/** Takes money from a seat (to another seat, the pot, or the bank), selling to cover it if needed. */
function pay(s0: TycoonState, from: number, amount: number, to: number | "pot" | null, names: string[]): TycoonState {
  let s = copy(s0);
  s.cash[from] -= amount;
  if (typeof to === "number") s.cash[to] += amount;
  else if (to === "pot") s.pot += amount;
  if (s.cash[from] >= 0) return s;
  // Sell villas, then districts, back to the bank at half price.
  const mine = BOARD.map((_, i) => i).filter((i) => s.owner[i] === from).sort((a, b) => (BOARD[a].price ?? 0) - (BOARD[b].price ?? 0));
  for (const i of mine) while (s.villas[i] > 0 && s.cash[from] < 0) { s.villas[i]--; s.cash[from] += villaCost(BOARD[i]) / 2; }
  for (const i of mine) if (s.cash[from] < 0) { s.owner[i] = null; s.cash[from] += (BOARD[i].price ?? 0) / 2; s = log(s, `${names[from]} sold ${BOARD[i].name} to cover debts.`); }
  if (s.cash[from] < 0) {
    s.out[from] = true; s.cash[from] = 0;
    s = log(s, `💸 ${names[from]} is bankrupt!`);
    const left = active(s);
    if (left.length === 1) s.winner = left[0];
  }
  return s;
}

const CARDS: Array<{ text: string; apply: (s: TycoonState, seat: number, names: string[]) => TycoonState }> = [
  { text: "Dubai Shopping Festival raffle win! Collect AED 1,500.", apply: (s, p) => { const n = copy(s); n.cash[p] += 1500; return n; } },
  { text: "Speeding fine on Sheikh Zayed Road. Pay AED 800.", apply: (s, p, names) => pay(s, p, 800, "pot", names) },
  { text: "Advance to Start. Collect AED 2,000.", apply: (s, p) => { const n = copy(s); n.pos[p] = 0; n.cash[p] += SALARY; return n; } },
  { text: "Caught by the speed camera. Go to the Traffic Court.", apply: (s, p) => { const n = copy(s); n.pos[p] = JAIL; n.jail[p] = 1; n.again = false; return n; } },
  { text: "DEWA refund. Collect AED 500.", apply: (s, p) => { const n = copy(s); n.cash[p] += 500; return n; } },
  { text: "Bonus from your Dubai job! Collect AED 1,000.", apply: (s, p) => { const n = copy(s); n.cash[p] += 1000; return n; } },
  { text: "AC repairs: pay AED 200 for every villa you own.", apply: (s, p, names) => pay(s, p, 200 * BOARD.reduce((t, _, i) => t + (s.owner[i] === p ? s.villas[i] : 0), 0), "pot", names) },
  { text: "It's your birthday! Collect AED 300 from every player.", apply: (s, p, names) => { let n = s; for (const o of active(s)) if (o !== p) n = pay(n, o, 300, p, names); return n; } },
  { text: "Take the metro to Downtown Dubai.", apply: (s, p, names) => { const n = copy(s); n.pos[p] = 27; return land(n, p, names, true); } },
  { text: "Wrong exit! Go back 3 squares.", apply: (s, p, names) => { const n = copy(s); n.pos[p] = (n.pos[p] + 25) % 28; return land(n, p, names, true); } },
];

/** What happens on the square a seat has landed on. */
function land(s0: TycoonState, p: number, names: string[], fromCard = false): TycoonState {
  let s = s0;
  const i = s.pos[p], sq = BOARD[i];
  if (sq.kind === "prop" || sq.kind === "metro") {
    const o = s.owner[i];
    if (o === null) return { ...s, phase: "buy" };
    if (o !== p && !s.out[o]) {
      const rent = rentFor(s, i);
      s = log(pay(s, p, rent, o, names), `${names[p]} paid ${fmt(rent)} rent to ${names[o]} for ${sq.name}.`);
    }
  } else if (sq.kind === "tax") {
    s = log(pay(s, p, sq.tax!, "pot", names), `${names[p]} paid the ${sq.name}: ${fmt(sq.tax!)}.`);
  } else if (sq.kind === "parking" && s.pot > 0) {
    const n = copy(s); n.cash[p] += n.pot; s = log({ ...n, pot: 0 }, `🎉 ${names[p]} collected the Free Majlis pot: ${fmt(s.pot)}!`);
  } else if (sq.kind === "camera") {
    const n = copy(s); n.pos[p] = JAIL; n.jail[p] = 1; s = log({ ...n, again: false }, `📸 ${names[p]} was caught by the speed camera.`);
  } else if (sq.kind === "chance" && !fromCard) {
    const card = CARDS[Math.floor(Math.random() * CARDS.length)];
    s = log(card.apply({ ...s, card: card.text }, p, names), `🃏 ${names[p]}: ${card.text}`);
    if (s.phase === "buy") return s;
  }
  return { ...s, phase: "manage" };
}

function roll(s0: TycoonState, names: string[]): TycoonState {
  const p = s0.turn;
  let s = copy(s0);
  s.card = null;
  if (s.jail[p] > 0) {
    s.jail[p]--;
    return endTurn(log(s, `${names[p]} spends a turn at the Traffic Court.`), true);
  }
  const d: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  const doubles = d[0] === d[1] ? s.doubles + 1 : 0;
  s = { ...s, dice: d, doubles, again: doubles > 0, rolls: s.rolls + 1 };
  if (doubles === 3) {
    s.pos[p] = JAIL; s.jail[p] = 1;
    return { ...log(s, `${names[p]} rolled three doubles: off to the Traffic Court.`), again: false, phase: "manage" };
  }
  const to = s.pos[p] + d[0] + d[1];
  if (to >= 28) { s.cash[p] += SALARY; s = log(s, `${names[p]} passed Start: +${fmt(SALARY)}.`); }
  s.pos[p] = to % 28;
  s = log(s, `${names[p]} rolled ${d[0]} + ${d[1]} to ${BOARD[s.pos[p]].name}.`);
  return land(s, p, names);
}

function buy(s0: TycoonState, names: string[]): TycoonState {
  const p = s0.turn, i = s0.pos[p], sq = BOARD[i];
  if (s0.owner[i] !== null || s0.cash[p] < (sq.price ?? 0)) return { ...s0, phase: "manage" };
  const s = copy(s0);
  s.cash[p] -= sq.price!; s.owner[i] = p;
  return log({ ...s, phase: "manage" }, `🏷️ ${names[p]} bought ${sq.name} for ${fmt(sq.price!)}.`);
}

const canBuild = (s: TycoonState, p: number, i: number) => {
  const sq = BOARD[i];
  return sq.kind === "prop" && s.owner[i] === p && ownsGroup(s, p, sq.group!) && s.villas[i] < 3 && s.cash[p] >= villaCost(sq);
};

function build(s0: TycoonState, i: number, names: string[]): TycoonState {
  const p = s0.turn;
  if (!canBuild(s0, p, i)) return s0;
  const s = copy(s0);
  s.cash[p] -= villaCost(BOARD[i]); s.villas[i]++;
  return log(s, `🏡 ${names[p]} built a villa in ${BOARD[i].name}.`);
}

function endTurn(s0: TycoonState, skip = false): TycoonState {
  if (s0.winner !== null) return s0;
  if (s0.again && !skip && !s0.out[s0.turn]) return { ...s0, phase: "roll", again: false };
  const n = s0.out.length;
  let t = s0.turn, round = s0.round;
  do { t = (t + 1) % n; if (t === 0) round++; } while (s0.out[t]);
  const s: TycoonState = { ...s0, turn: t, phase: "roll", doubles: 0, again: false, round };
  if (round > MAX_ROUNDS) {
    const worth = s.out.map((_, i) => netWorth(s, i));
    return { ...s, winner: worth.indexOf(Math.max(...worth)) };
  }
  return s;
}

/** Log lines name players by seat ("{2}"); the board fills in their names, so everyone reads them right. */
const SEATS = (n: number) => Array.from({ length: n }, (_, i) => `{${i}}`);
const fill = (line: string, names: string[]) => line.replace(/\{(\d)\}/g, (_, d) => names[Number(d)] ?? "Someone");

/** One step for the computer: roll, decide whether to buy, build where it can, then end its turn. */
function ai(s: TycoonState, seat: number): TycoonState {
  const names = SEATS(s.cash.length);
  if (s.phase === "roll") return roll(s, names);
  if (s.phase === "buy") {
    const sq = BOARD[s.pos[seat]];
    return s.cash[seat] - (sq.price ?? 0) >= 1500 ? buy(s, names) : log({ ...s, phase: "manage" }, `{${seat}} passed on ${sq.name}.`);
  }
  const spot = BOARD.map((_, i) => i).find((i) => canBuild(s, seat, i) && s.cash[seat] - villaCost(BOARD[i]) >= 2500);
  return spot !== undefined ? build(s, spot, names) : endTurn(s);
}

const turnOf = (s: TycoonState) => (s.winner === null ? s.turn : null);
const result = (s: TycoonState) => (s.winner === null ? null : { winners: [s.winner], scores: s.cash.map((_, i) => netWorth(s, i)) });

// ---------------------------------------------------------------- board

/** Square index → [row, col] on an 8×8 ring, Start in the bottom-right corner, going clockwise. */
function cellOf(i: number): [number, number] {
  if (i <= 7) return [7, 7 - i];
  if (i <= 14) return [7 - (i - 7), 0];
  if (i <= 21) return [0, i - 14];
  return [i - 21, 7];
}
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const Die = ({ n }: { n: number }) => (
  <div className="w-10 h-10 rounded-lg bg-white border-2 border-slate-300 shadow grid grid-cols-3 grid-rows-3 p-1.5 gap-0.5">
    {Array.from({ length: 9 }, (_, k) => <span key={k} className={`rounded-full ${PIPS[n]?.includes(k) ? "bg-slate-900" : ""}`} />)}
  </div>
);
const ICON: Partial<Record<Kind, string>> = { go: "🏁", chance: "🃏", tax: "🧾", jail: "🚓", parking: "☕", camera: "📸", metro: "🚇" };

function Board({ state, me, seats, onMove, canMove }: BoardProps<TycoonState>) {
  const [picked, setPicked] = useState<number | null>(null);
  const names = SEATS(seats.length);
  const shown = seats.map((x, i) => (i === me ? "You" : x.name));
  const myTurn = canMove && state.turn === me && state.winner === null;
  const here = BOARD[state.pos[me]];
  const sel = picked ?? state.pos[state.turn];
  const sq = BOARD[sel];
  const buildable = BOARD.map((_, i) => i).filter((i) => canBuild(state, me, i));
  return (
    <div className="max-w-[min(96vw,640px)] mx-auto space-y-3">
      <div className="relative grid grid-cols-8 grid-rows-8 aspect-square rounded-2xl overflow-hidden border-4 border-emerald-900 bg-emerald-50 shadow-xl">
        {BOARD.map((b, i) => {
          const [r, c] = cellOf(i);
          const o = state.owner[i];
          const on = state.pos.map((p, s) => (p === i && !state.out[s] ? s : -1)).filter((s) => s >= 0);
          return (
            <button key={i} onClick={() => setPicked(i)} style={{ gridRow: r + 1, gridColumn: c + 1 }}
              className={`relative flex flex-col items-stretch border border-emerald-900/20 bg-white text-[7px] sm:text-[9px] leading-tight font-bold text-slate-700 overflow-hidden ${sel === i ? "ring-2 ring-inset ring-sky-500 z-10" : ""}`}>
              {b.group !== undefined ? <span className="h-[18%] shrink-0" style={{ background: GROUPS[b.group] }} /> : <span className="text-center text-sm sm:text-lg leading-none pt-0.5">{ICON[b.kind]}</span>}
              <span className="px-0.5 pt-0.5 text-center truncate">{b.short}</span>
              {b.price && <span className="text-center text-[6px] sm:text-[8px] text-slate-500 font-mono">{b.price >= 1000 ? `${b.price / 1000}k` : b.price}</span>}
              {state.villas[i] > 0 && <span className="text-center text-[8px] sm:text-[10px] leading-none">{"🏠".repeat(state.villas[i])}</span>}
              {o !== null && <span className="absolute top-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1 ring-white" style={{ background: TOKENS[o] }} />}
              <span className="absolute bottom-0.5 left-0.5 flex gap-px">
                {on.map((s) => <span key={s} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border border-white shadow transition-all" style={{ background: TOKENS[s] }} />)}
              </span>
            </button>
          );
        })}
        {/* Centre: dice, the current card and what's happening */}
        <div className="col-start-2 col-end-8 row-start-2 row-end-8 p-2 sm:p-4 flex flex-col items-center justify-center gap-2 text-center">
          <div className="font-black text-emerald-900 text-base sm:text-2xl tracking-tight">DUBAI TYCOON</div>
          {state.dice && <div key={state.rolls} className="flex gap-2 animate-in zoom-in-50 duration-300"><Die n={state.dice[0]} /><Die n={state.dice[1]} /></div>}
          {state.card && <div className="rounded-xl bg-amber-100 border border-amber-300 px-2 py-1 text-[10px] sm:text-xs font-bold text-amber-900 max-w-[90%]">🃏 {state.card}</div>}
          <div className="text-[10px] sm:text-xs text-slate-600 space-y-0.5 max-h-20 overflow-hidden">{state.log.slice(0, 3).map((l, k) => <p key={k} className={k ? "opacity-60" : "font-bold"}>{fill(l, shown)}</p>)}</div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-500">Round {state.round}/{MAX_ROUNDS} · Majlis pot {fmt(state.pot)}</div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {state.cash.map((cash, s) => (
          <div key={s} className={`rounded-xl px-3 py-2 text-xs font-bold border-2 ${state.turn === s ? "border-slate-900 bg-white" : "border-transparent bg-slate-100"} ${state.out[s] ? "opacity-40 line-through" : ""}`}>
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: TOKENS[s] }} />{shown[s]}
            <div className="font-mono text-sm text-slate-900">{fmt(cash)}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {myTurn && (
        <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-2">
          {state.phase === "roll" && <button onClick={() => onMove(roll(state, names))} className="w-full h-12 rounded-xl bg-emerald-600 text-white font-black">🎲 {state.jail[me] ? "Serve your turn at the court" : "Roll the dice"}</button>}
          {state.phase === "buy" && (
            <div className="flex gap-2">
              <button disabled={state.cash[me] < (here.price ?? 0)} onClick={() => onMove(buy(state, names))} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-40">Buy {here.name} · {fmt(here.price ?? 0)}</button>
              <button onClick={() => onMove(log({ ...state, phase: "manage" }, `${names[me]} passed on ${here.name}.`))} className="h-12 px-4 rounded-xl bg-slate-100 font-black">Pass</button>
            </div>
          )}
          {state.phase === "manage" && (
            <>
              {buildable.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {buildable.map((i) => <button key={i} onClick={() => onMove(build(state, i, names))} className="h-9 px-3 rounded-lg text-xs font-black text-white" style={{ background: GROUPS[BOARD[i].group!] }}>🏡 Villa in {BOARD[i].short} · {fmt(villaCost(BOARD[i]))}</button>)}
                </div>
              )}
              <button onClick={() => onMove(endTurn(state))} className="w-full h-12 rounded-xl bg-slate-900 text-white font-black">{state.again ? "Doubles! Roll again" : "End turn"}</button>
            </>
          )}
        </div>
      )}
      {!myTurn && state.winner === null && <p className="text-center text-sm font-bold text-slate-500">{shown[state.turn]}&apos;s turn…</p>}

      {/* The square you tapped (or the current one) */}
      <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm flex items-center gap-3">
        <span className="w-3 self-stretch rounded-full" style={{ background: sq.group !== undefined ? GROUPS[sq.group] : "#cbd5e1" }} />
        <div className="flex-1 min-w-0">
          <div className="font-black">{sq.name}</div>
          <div className="text-xs text-slate-500">
            {sq.price ? `${fmt(sq.price)} · ` : ""}
            {sq.kind === "prop" ? `rent ${fmt(Math.round(sq.price! / 10))}, both in colour ×2, villas ×5/×15/×40 · villa ${fmt(villaCost(sq))}` : sq.kind === "metro" ? "rent 250 / 500 / 1,000 for 1 / 2 / 3 stations" : sq.kind === "tax" ? `pay ${fmt(sq.tax!)} into the Free Majlis pot` : ""}
          </div>
        </div>
        {state.owner[sel] !== null && <span className="text-xs font-black px-2 py-1 rounded-full text-white" style={{ background: TOKENS[state.owner[sel]!] }}>{shown[state.owner[sel]!]} · rent {fmt(rentFor(state, sel))}</span>}
      </div>
    </div>
  );
}

export const tycoon: GameModule<TycoonState> = { init: (n) => init(n), turnOf, ai, result, Board, delay: () => 700 };
