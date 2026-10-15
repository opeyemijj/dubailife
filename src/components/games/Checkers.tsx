"use client";

// Checkers (English draughts) on the dark squares of an 8×8 board. Men move diagonally forward; kings
// both ways. Captures are compulsory and chain — a piece that has just captured must keep jumping while
// it can. Reach the far row to be crowned. Seat 0 (red) moves up from the bottom. The computer looks
// three moves ahead.

import { useState } from "react";
import type { BoardProps, GameModule } from "./types";

/** 64 squares: "" empty, "r"/"R" red man/king (seat 0), "b"/"B" black (seat 1). */
export interface CheckersState { board: string[]; turn: number; winner: number | null | "draw"; chain: number | null; last?: [number, number]; quiet: number }

const own = (p: string, seat: number) => !!p && (seat === 0 ? p.toLowerCase() === "r" : p.toLowerCase() === "b");
const dirs = (p: string): Array<[number, number]> => (p === "R" || p === "B" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : p === "r" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

function init(): CheckersState {
  const board = Array(64).fill("");
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8), c = i % 8;
    if ((r + c) % 2 === 1) { if (r < 3) board[i] = "b"; else if (r > 4) board[i] = "r"; }
  }
  return { board, turn: 0, winner: null, chain: null, quiet: 0 };
}

interface Move { from: number; to: number; jump: number | null }

function movesFrom(board: string[], i: number): Move[] {
  const p = board[i], r = Math.floor(i / 8), c = i % 8, out: Move[] = [];
  for (const [dr, dc] of dirs(p)) {
    const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
    if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
    const mid = r1 * 8 + c1;
    if (!board[mid]) out.push({ from: i, to: mid, jump: null });
    else if (r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && !board[r2 * 8 + c2] && board[mid].toLowerCase() !== p.toLowerCase()) out.push({ from: i, to: r2 * 8 + c2, jump: mid });
  }
  return out;
}

/** Legal moves for whoever's turn it is (jumps only, if any jump exists; only the chaining piece mid-chain). */
function legal(s: CheckersState): Move[] {
  const pieces = s.chain !== null ? [s.chain] : s.board.map((p, i) => (own(p, s.turn) ? i : -1)).filter((i) => i >= 0);
  const all = pieces.flatMap((i) => movesFrom(s.board, i));
  const jumps = all.filter((m) => m.jump !== null);
  return jumps.length || s.chain !== null ? jumps : all;
}

function apply(s: CheckersState, m: Move): CheckersState {
  const board = s.board.slice();
  let p = board[m.from];
  board[m.from] = "";
  if (m.jump !== null) board[m.jump] = "";
  const row = Math.floor(m.to / 8);
  const crowned = (p === "r" && row === 0) || (p === "b" && row === 7);
  if (crowned) p = p.toUpperCase();
  board[m.to] = p;
  // Keep jumping with the same piece if it can (a freshly crowned piece's turn ends).
  if (m.jump !== null && !crowned && movesFrom(board, m.to).some((x) => x.jump !== null)) {
    return { ...s, board, chain: m.to, last: [m.from, m.to], quiet: 0 };
  }
  const next: CheckersState = { board, turn: 1 - s.turn, chain: null, winner: null, last: [m.from, m.to], quiet: m.jump !== null ? 0 : s.quiet + 1 };
  if (!legal(next).length) next.winner = s.turn;
  else if (next.quiet >= 80) next.winner = "draw";
  return next;
}

function score(board: string[], seat: number) {
  let v = 0;
  for (const p of board) if (p) v += (own(p, seat) ? 1 : -1) * (p === p.toUpperCase() ? 3 : 1);
  return v;
}

function search(s: CheckersState, depth: number, seat: number): number {
  if (s.winner !== null) return s.winner === "draw" ? 0 : s.winner === seat ? 1000 : -1000;
  if (depth === 0) return score(s.board, seat);
  const vals = legal(s).map((m) => search(apply(s, m), s.chain !== null ? depth : depth - 1, seat));
  return s.turn === seat ? Math.max(...vals) : Math.min(...vals);
}

function ai(s: CheckersState): CheckersState {
  const seat = s.turn;
  let best: Move | null = null, bestV = -Infinity;
  for (const m of legal(s)) {
    const v = search(apply(s, m), 3, seat) + Math.random() * 0.5;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best ? apply(s, best) : s;
}

const turnOf = (s: CheckersState) => (s.winner === null ? s.turn : null);
const result = (s: CheckersState) => (s.winner === null ? null : { winners: s.winner === "draw" ? [] : [s.winner] });

function Board({ state, me, onMove, canMove }: BoardProps<CheckersState>) {
  const [sel, setSel] = useState<number | null>(null);
  const myTurn = canMove && state.turn === me && state.winner === null;
  const moves = myTurn ? legal(state) : [];
  const from = state.chain ?? sel;
  const targets = new Map(moves.filter((m) => m.from === from).map((m) => [m.to, m]));
  const movable = new Set(moves.map((m) => m.from));
  const flip = me === 1;
  const order = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));
  return (
    <div className="max-w-[min(92vw,520px)] mx-auto space-y-3">
      <p className="text-center text-sm font-bold">{myTurn ? (state.chain !== null ? "Keep jumping!" : moves.some((m) => m.jump !== null) ? "You must capture" : "Your move") : state.winner === null ? "Waiting for the other side…" : ""}</p>
      <div className="grid grid-cols-8 aspect-square rounded-xl overflow-hidden border-4 border-amber-950 shadow-xl">
        {order.map((i) => {
          const r = Math.floor(i / 8), c = i % 8, dark = (r + c) % 2 === 1, p = state.board[i];
          const target = targets.get(i);
          return (
            <button key={i} disabled={!dark || !myTurn}
              onClick={() => { if (target) { onMove(apply(state, target)); setSel(null); } else if (movable.has(i) && state.chain === null) setSel(i); }}
              className={`relative flex items-center justify-center ${dark ? "bg-amber-900" : "bg-amber-100"} ${state.last?.includes(i) ? "after:absolute after:inset-0 after:bg-yellow-300/25" : ""}`}>
              {p && (
                <span className={`w-[78%] h-[78%] rounded-full border-4 shadow-md flex items-center justify-center text-amber-300 text-lg ${p.toLowerCase() === "r" ? "bg-red-600 border-red-800" : "bg-slate-900 border-slate-700"} ${from === i ? "ring-4 ring-sky-400" : movable.has(i) && myTurn && state.chain === null ? "ring-2 ring-white/70" : ""}`}>
                  {p === p.toUpperCase() ? "♛" : ""}
                </span>
              )}
              {target && <span className="absolute w-1/3 h-1/3 rounded-full bg-sky-400/80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const checkers: GameModule<CheckersState> = { init, turnOf, ai, result, Board };
