"use client";

// Connect Four: 7 columns × 6 rows. Seat 0 plays red, seat 1 yellow. The computer searches five moves
// ahead (negamax with alpha-beta), scoring open lines, and prefers the middle columns.

import type { BoardProps, GameModule } from "./types";

export interface C4State { grid: number[][]; turn: number; winner: number | null | "draw"; last?: [number, number]; line?: Array<[number, number]> }

const ROWS = 6, COLS = 7;
const init = (): C4State => ({ grid: Array.from({ length: ROWS }, () => Array(COLS).fill(-1)), turn: 0, winner: null });

const dropRow = (g: number[][], c: number) => { for (let r = ROWS - 1; r >= 0; r--) if (g[r][c] === -1) return r; return -1; };

function lineAt(g: number[][], r: number, c: number): Array<[number, number]> | null {
  const p = g[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells: Array<[number, number]> = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function drop(s: C4State, c: number): C4State {
  const r = dropRow(s.grid, c);
  if (r < 0 || s.winner !== null) return s;
  const grid = s.grid.map((row) => row.slice());
  grid[r][c] = s.turn;
  const line = lineAt(grid, r, c);
  const full = grid[0].every((x) => x !== -1);
  return { grid, turn: 1 - s.turn, last: [r, c], winner: line ? s.turn : full ? "draw" : null, line: line ?? undefined };
}

/** Scores every window of four for `me`. */
function evaluate(g: number[][], me: number) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (g[r][3] === me) score += 4;
  const win = (cells: number[]) => {
    const mine = cells.filter((x) => x === me).length, theirs = cells.filter((x) => x === 1 - me).length;
    if (mine && theirs) return 0;
    return mine === 3 ? 6 : mine === 2 ? 2 : theirs === 3 ? -8 : theirs === 2 ? -2 : 0;
  };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 3 < COLS) score += win([g[r][c], g[r][c + 1], g[r][c + 2], g[r][c + 3]]);
    if (r + 3 < ROWS) score += win([g[r][c], g[r + 1][c], g[r + 2][c], g[r + 3][c]]);
    if (r + 3 < ROWS && c + 3 < COLS) score += win([g[r][c], g[r + 1][c + 1], g[r + 2][c + 2], g[r + 3][c + 3]]);
    if (r + 3 < ROWS && c - 3 >= 0) score += win([g[r][c], g[r + 1][c - 1], g[r + 2][c - 2], g[r + 3][c - 3]]);
  }
  return score;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6];
function negamax(g: number[][], player: number, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return evaluate(g, player);
  let best = -Infinity, any = false;
  for (const c of ORDER) {
    const r = dropRow(g, c);
    if (r < 0) continue;
    any = true;
    g[r][c] = player;
    const v = lineAt(g, r, c) ? 10000 + depth : -negamax(g, 1 - player, depth - 1, -beta, -alpha);
    g[r][c] = -1;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return any ? best : 0;
}

function ai(s: C4State): C4State {
  const g = s.grid.map((row) => row.slice());
  let bestC = 3, bestV = -Infinity;
  for (const c of ORDER) {
    const r = dropRow(g, c);
    if (r < 0) continue;
    g[r][c] = s.turn;
    const v = (lineAt(g, r, c) ? 100000 : -negamax(g, 1 - s.turn, 4, -Infinity, Infinity)) + Math.random();
    g[r][c] = -1;
    if (v > bestV) { bestV = v; bestC = c; }
  }
  return drop(s, bestC);
}

const turnOf = (s: C4State) => (s.winner === null ? s.turn : null);
const result = (s: C4State) => (s.winner === null ? null : { winners: s.winner === "draw" ? [] : [s.winner] });

const DISC = ["#dc2626", "#facc15"];
function Board({ state, me, onMove, canMove }: BoardProps<C4State>) {
  const myTurn = canMove && state.turn === me && state.winner === null;
  const win = new Set(state.line?.map(([r, c]) => `${r},${c}`));
  return (
    <div className="max-w-[min(94vw,520px)] mx-auto space-y-3">
      <p className="text-center text-sm font-bold">{myTurn ? <>Your turn — tap a column <span className="inline-block w-3 h-3 rounded-full align-middle" style={{ background: DISC[me] }} /></> : state.winner === null ? "Waiting for the other player…" : ""}</p>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-3xl bg-blue-700 shadow-xl">
        {Array.from({ length: COLS }, (_, c) => (
          <button key={c} disabled={!myTurn || dropRow(state.grid, c) < 0} onClick={() => onMove(drop(state, c))} className="flex flex-col gap-1.5 sm:gap-2 rounded-xl hover:bg-blue-600 disabled:hover:bg-transparent">
            {state.grid.map((row, r) => (
              <span key={r} className={`aspect-square w-full rounded-full shadow-inner transition-all ${win.has(`${r},${c}`) ? "ring-4 ring-white" : ""} ${state.last?.[0] === r && state.last?.[1] === c ? "animate-in slide-in-from-top-8 duration-300" : ""}`}
                style={{ background: row[c] === -1 ? "#0f172a" : DISC[row[c]] }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

export const connect4: GameModule<C4State> = { init, turnOf, ai, result, Board };
