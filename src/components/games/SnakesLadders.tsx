"use client";

// Snakes & Ladders for 2–4 players on the classic 100-square board (rows snake back and forth from the
// bottom). Land on a ladder's foot to climb, a snake's head to slide. You need the exact roll to land on 100.

import type { BoardProps, GameModule } from "./types";

export interface SnakesState { pos: number[]; turn: number; winner: number | null; lastDice: number | null; rollId: number; event?: string }

// Ladders (from → to) and snakes (head → tail), as on the common board.
const LADDERS: Record<number, number> = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const SNAKES: Record<number, number> = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const COLORS = ["#dc2626", "#2563eb", "#16a34a", "#eab308"];

const init = (seats: number): SnakesState => ({ pos: Array(seats).fill(0), turn: 0, winner: null, lastDice: null, rollId: 0 });

function roll(s: SnakesState): SnakesState {
  const dice = 1 + Math.floor(Math.random() * 6);
  const pos = s.pos.slice();
  const from = pos[s.turn];
  let to = from + dice, event: string | undefined;
  if (to > 100) { to = from; event = "needs an exact roll"; }
  else if (LADDERS[to]) { event = `climbed a ladder to ${LADDERS[to]}! 🪜`; to = LADDERS[to]; }
  else if (SNAKES[to]) { event = `slid down a snake to ${SNAKES[to]} 🐍`; to = SNAKES[to]; }
  pos[s.turn] = to;
  const won = to === 100;
  // A 6 rolls again.
  const next = won || dice !== 6 ? (s.turn + 1) % pos.length : s.turn;
  return { pos, turn: next, winner: won ? s.turn : null, lastDice: dice, rollId: s.rollId + 1, event: event ? `${["Red", "Blue", "Green", "Yellow"][s.turn]} ${event}` : undefined };
}

const turnOf = (s: SnakesState) => (s.winner === null ? s.turn : null);
const result = (s: SnakesState) => (s.winner === null ? null : { winners: [s.winner], scores: s.pos });

/** Square n (1–100) to [row from top, column]. */
function cell(n: number): [number, number] {
  const i = n - 1, rowFromBottom = Math.floor(i / 10), col = rowFromBottom % 2 === 0 ? i % 10 : 9 - (i % 10);
  return [9 - rowFromBottom, col];
}
const centre = (n: number) => { const [r, c] = cell(n); return [c * 10 + 5, r * 10 + 5]; };
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Board({ state, me, seats, onMove, canMove }: BoardProps<SnakesState>) {
  const myTurn = canMove && state.turn === me && state.winner === null;
  return (
    <div className="max-w-[min(94vw,540px)] mx-auto space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden border-4 border-lime-900 shadow-xl">
        <div className="grid grid-cols-10 h-full">
          {Array.from({ length: 100 }, (_, k) => {
            const r = Math.floor(k / 10), c = k % 10;
            const n = Array.from({ length: 100 }, (_, x) => x + 1).find((x) => { const [rr, cc] = cell(x); return rr === r && cc === c; })!;
            return <div key={k} className="relative text-[9px] sm:text-[11px] font-black text-lime-950/60 p-0.5" style={{ background: (r + c) % 2 ? "#ecfccb" : "#d9f99d" }}>{n}</div>;
          })}
        </div>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          {Object.entries(LADDERS).map(([a, b]) => {
            const [x1, y1] = centre(+a), [x2, y2] = centre(+b), dx = y2 - y1, dy = x1 - x2, l = Math.hypot(dx, dy) || 1, ox = (dx / l) * 1.6, oy = (dy / l) * 1.6;
            return (
              <g key={a} stroke="#92400e" strokeWidth="0.9" strokeLinecap="round">
                <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} /><line x1={x1 - ox} y1={y1 - oy} x2={x2 - ox} y2={y2 - oy} />
                {Array.from({ length: Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 5)) }, (_, i) => { const rungs = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 5)); const t = (i + 0.5) / rungs; const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; return <line key={i} x1={x + ox} y1={y + oy} x2={x - ox} y2={y - oy} />; })}
              </g>
            );
          })}
          {Object.entries(SNAKES).map(([a, b]) => {
            const [x1, y1] = centre(+a), [x2, y2] = centre(+b), mx = (x1 + x2) / 2 + (y2 - y1) * 0.2, my = (y1 + y2) / 2 - (x2 - x1) * 0.2;
            return (
              <g key={a}>
                <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} stroke="#15803d" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
                <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} stroke="#bbf7d0" strokeWidth="0.6" fill="none" strokeDasharray="1.5 2" />
                <circle cx={x1} cy={y1} r="2" fill="#166534" /><circle cx={x1 - 0.6} cy={y1 - 0.5} r="0.4" fill="#fff" /><circle cx={x1 + 0.6} cy={y1 - 0.5} r="0.4" fill="#fff" />
              </g>
            );
          })}
          {state.pos.map((p, i) => {
            if (p === 0) return null;
            const [x, y] = centre(p);
            return <circle key={i} cx={x + (i % 2 ? 2 : -2)} cy={y + (i > 1 ? 2 : -2)} r="2.6" fill={COLORS[i]} stroke="#fff" strokeWidth="0.7" className="transition-all duration-500" />;
          })}
        </svg>
      </div>
      <p className="text-center text-sm font-bold min-h-5">{state.event ?? ""}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div key={state.rollId} className="w-14 h-14 rounded-xl bg-white border-2 border-slate-300 shadow grid grid-cols-3 grid-rows-3 p-2 gap-1 animate-in zoom-in-50 duration-300">
          {Array.from({ length: 9 }, (_, i) => <span key={i} className={`rounded-full ${state.lastDice && PIPS[state.lastDice].includes(i) ? "bg-slate-900" : ""}`} />)}
        </div>
        {myTurn ? <button onClick={() => onMove(roll(state))} className="h-12 px-6 rounded-2xl text-white font-black" style={{ background: COLORS[me] }}>Roll the dice</button>
          : state.winner === null && <span className="text-sm font-bold text-slate-500">{seats[state.turn]?.name ?? "…"}&apos;s turn</span>}
        <div className="flex gap-1.5 text-xs font-bold">{seats.map((s, i) => <span key={i} className="px-2 py-1 rounded-full text-white" style={{ background: COLORS[i] }}>{i === me ? "You" : s.name}: {state.pos[i] || "start"}</span>)}</div>
      </div>
    </div>
  );
}

export const snakes: GameModule<SnakesState> = { init: (n) => init(n), turnOf, ai: (s) => roll(s), result, Board };
