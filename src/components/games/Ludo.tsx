"use client";

// Ludo for 2–4 players on the classic 15×15 board. Roll a 6 to bring a token out; go once round the
// 52-square track and up your home column. Landing on a lone rival (off the safe squares) sends it home.
// A 6 gives another roll (three 6s in a row ends the turn).

import type { BoardProps, GameModule } from "./types";

/** A token's progress: -1 in the yard, 0–50 on the track (from its start), 51–55 home column, 56 home. */
export interface LudoState {
  /** Colour index (0 red, 1 green, 2 yellow, 3 blue) per seat. */
  colors: number[];
  tokens: number[][];
  turn: number;
  dice: number | null;
  sixes: number;
  winner: number | null;
  /** The last roll (still shown after a turn passes with no move). */
  lastDice: number | null;
  /** Bumps on every roll so everyone sees the dice animate. */
  rollId: number;
}

const COLORS = ["#dc2626", "#16a34a", "#eab308", "#2563eb"];
const LIGHT = ["#fecaca", "#bbf7d0", "#fef08a", "#bfdbfe"];
const HOME = 56;

// The track as [row, col] on a 15×15 grid, clockwise from red's start square.
const TRACK: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];
const HOME_COLUMN: Array<Array<[number, number]>> = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];
const YARD: Array<Array<[number, number]>> = [
  [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
  [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
  [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const abs = (color: number, pos: number) => (pos + color * 13) % 52;

function init(seats: number): LudoState {
  const colors = seats === 2 ? [0, 2] : seats === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return { colors, tokens: colors.map(() => [-1, -1, -1, -1]), turn: 0, dice: null, sixes: 0, winner: null, lastDice: null, rollId: 0 };
}

/** Tokens the current player can move with this roll. */
function movable(s: LudoState, seat: number, dice: number) {
  return s.tokens[seat].map((p, i) => (p === -1 ? (dice === 6 ? i : -1) : p !== HOME && p + dice <= HOME ? i : -1)).filter((i) => i >= 0);
}

function roll(s: LudoState): LudoState {
  const dice = 1 + Math.floor(Math.random() * 6);
  const sixes = dice === 6 ? s.sixes + 1 : 0;
  const base = { ...s, lastDice: dice, rollId: s.rollId + 1 };
  // Three sixes in a row, or nothing to move: the turn passes.
  if (sixes === 3 || !movable(s, s.turn, dice).length) return { ...base, dice: null, sixes: 0, turn: (s.turn + 1) % s.tokens.length };
  return { ...base, dice, sixes };
}

function move(s: LudoState, token: number): LudoState {
  const seat = s.turn, color = s.colors[seat], dice = s.dice!;
  const tokens = s.tokens.map((t) => t.slice());
  const from = tokens[seat][token];
  const to = from === -1 ? 0 : from + dice;
  tokens[seat][token] = to;
  // Capture a lone rival on a non-safe track square.
  if (to <= 50 && !SAFE.has(abs(color, to))) {
    tokens.forEach((list, other) => {
      if (other === seat) return;
      const here = list.map((p, i) => (p >= 0 && p <= 50 && abs(s.colors[other], p) === abs(color, to) ? i : -1)).filter((i) => i >= 0);
      if (here.length === 1) list[here[0]] = -1;
    });
  }
  const won = tokens[seat].every((p) => p === HOME);
  const again = dice === 6 && !won;
  return { ...s, tokens, dice: null, turn: again ? seat : (seat + 1) % tokens.length, sixes: again ? s.sixes : 0, winner: won ? seat : null };
}

/** Roll, then pick: capture > reach home > leave the yard > advance the token furthest along. */
function ai(s: LudoState, seat: number): LudoState {
  if (s.dice === null) return roll(s);
  const options = movable(s, seat, s.dice);
  if (!options.length) return { ...s, dice: null, sixes: 0, turn: (seat + 1) % s.tokens.length };
  const color = s.colors[seat];
  const scoreOf = (i: number) => {
    const from = s.tokens[seat][i], to = from === -1 ? 0 : from + s.dice!;
    let v = from;
    if (to === HOME) v += 500;
    if (from === -1) v += 300;
    if (to <= 50 && !SAFE.has(abs(color, to)) && s.tokens.some((list, o) => o !== seat && list.some((p) => p >= 0 && p <= 50 && abs(s.colors[o], p) === abs(color, to)))) v += 800;
    if (to <= 50 && SAFE.has(abs(color, to))) v += 60;
    return v;
  };
  return move(s, options.sort((a, b) => scoreOf(b) - scoreOf(a))[0]);
}

const turnOf = (s: LudoState) => (s.winner === null ? s.turn : null);
const result = (s: LudoState) => (s.winner === null ? null : { winners: [s.winner], scores: s.tokens.map((t) => t.filter((p) => p === HOME).length) });

function cellOf(color: number, pos: number, token: number): [number, number] {
  if (pos === -1) return YARD[color][token];
  if (pos <= 50) return TRACK[abs(color, pos)];
  if (pos < HOME) return HOME_COLUMN[color][pos - 51];
  return [7, 7];
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Board({ state, me, seats, onMove, canMove }: BoardProps<LudoState>) {
  const myTurn = canMove && state.turn === me && state.winner === null;
  const options = myTurn && state.dice !== null ? movable(state, me, state.dice) : [];
  const myColor = state.colors[me];
  const cell = 100 / 15;
  return (
    <div className="max-w-[min(94vw,560px)] mx-auto space-y-3">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
        {seats.map((s, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full text-white" style={{ background: COLORS[state.colors[i]], opacity: state.turn === i ? 1 : 0.45 }}>
            {i === me ? "You" : s.name} · {state.tokens[i].filter((p) => p === HOME).length}/4 home
          </span>
        ))}
      </div>
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-4 border-slate-800 bg-white shadow-xl">
        {/* the four yards */}
        {[[0, 0], [0, 9], [9, 9], [9, 0]].map(([r, c], k) => (
          <div key={k} className="absolute" style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${6 * cell}%`, height: `${6 * cell}%`, background: COLORS[k] }}>
            <div className="absolute inset-[16%] rounded-xl bg-white/90" />
          </div>
        ))}
        {/* track squares */}
        {TRACK.map(([r, c], i) => {
          const start = [0, 13, 26, 39].indexOf(i);
          return <div key={i} className="absolute border border-slate-300 flex items-center justify-center text-[10px]" style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${cell}%`, height: `${cell}%`, background: start >= 0 ? LIGHT[start] : "#fff" }}>{SAFE.has(i) && start < 0 ? "★" : ""}</div>;
        })}
        {HOME_COLUMN.map((col, k) => col.map(([r, c], i) => <div key={`${k}-${i}`} className="absolute border border-slate-300" style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${cell}%`, height: `${cell}%`, background: COLORS[k] }} />))}
        {/* the finish triangle in the middle */}
        <div className="absolute" style={{ top: `${6 * cell}%`, left: `${6 * cell}%`, width: `${3 * cell}%`, height: `${3 * cell}%`, background: `conic-gradient(from 225deg, ${COLORS[1]} 0 25%, ${COLORS[2]} 0 50%, ${COLORS[3]} 0 75%, ${COLORS[0]} 0)` }} />
        {/* tokens */}
        {state.tokens.map((list, seat) => list.map((pos, t) => {
          const color = state.colors[seat];
          const [r, c] = cellOf(color, pos, t);
          const can = seat === me && options.includes(t);
          const spread = pos === HOME ? (t - 1.5) * 0.35 : 0;
          return (
            <button key={`${seat}-${t}`} disabled={!can} onClick={() => onMove(move(state, t))}
              className={`absolute rounded-full border-2 border-white shadow-md transition-all duration-300 ${can ? "ring-4 ring-slate-900 animate-pulse z-10" : ""}`}
              style={{ top: `${(r + 0.15 + (pos === HOME ? 0.3 : 0)) * cell}%`, left: `${(c + 0.15 + spread) * cell}%`, width: `${cell * 0.7}%`, height: `${cell * 0.7}%`, background: COLORS[color] }}
              aria-label={can ? "Move this token" : undefined} />
          );
        }))}
      </div>
      <div className="flex items-center justify-center gap-4">
        <div key={state.rollId} className="w-14 h-14 rounded-xl bg-white border-2 border-slate-300 shadow grid grid-cols-3 grid-rows-3 p-2 gap-1 animate-in zoom-in-50 duration-300">
          {Array.from({ length: 9 }, (_, i) => <span key={i} className={`rounded-full ${(state.dice ?? state.lastDice) && PIPS[(state.dice ?? state.lastDice)!].includes(i) ? "bg-slate-900" : ""}`} />)}
        </div>
        {myTurn && state.dice === null && <button onClick={() => onMove(roll(state))} className="h-12 px-6 rounded-2xl text-white font-black" style={{ background: COLORS[myColor] }}>Roll the dice</button>}
        {myTurn && state.dice !== null && <span className="text-sm font-bold">Tap a glowing token to move {state.dice}</span>}
        {!myTurn && state.winner === null && <span className="text-sm font-bold text-slate-500">{seats[state.turn]?.name ?? "…"}&apos;s turn</span>}
      </div>
    </div>
  );
}

export const ludo: GameModule<LudoState> = { init: (n) => init(n), turnOf, ai, result, Board };
