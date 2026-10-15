"use client";

// Chess: standard rules (chess.js). Seat 0 plays white. The computer looks two moves ahead and values
// material and piece placement, with a little randomness so games differ.

import { useMemo, useState } from "react";
import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import type { BoardProps, GameModule } from "./types";

export interface ChessState { fen: string; last?: [string, string] }

const init = (): ChessState => ({ fen: new Chess().fen() });
const turnOf = (s: ChessState) => (s.fen.split(" ")[1] === "w" ? 0 : 1);

function result(s: ChessState) {
  const g = new Chess(s.fen);
  if (g.isCheckmate()) return { winners: [g.turn() === "w" ? 1 : 0] };
  if (g.isDraw() || g.isStalemate() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) return { winners: [] };
  return null;
}

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
/** Material, plus a small bonus for central squares (pawns and knights especially). */
function evaluate(g: Chess, side: Color) {
  let score = 0;
  const board = g.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const centre = 3.5 - Math.max(Math.abs(3.5 - r), Math.abs(3.5 - c));
    const v = VALUE[p.type] + (p.type === "p" || p.type === "n" ? centre * 8 : centre * 3);
    score += p.color === side ? v : -v;
  }
  return score;
}

function search(g: Chess, depth: number, alpha: number, beta: number, side: Color): number {
  if (g.isCheckmate()) return g.turn() === side ? -100000 : 100000;
  if (g.isDraw()) return 0;
  if (depth === 0) return evaluate(g, side);
  const moves = g.moves();
  const max = g.turn() === side;
  let best = max ? -Infinity : Infinity;
  for (const m of moves) {
    g.move(m);
    const v = search(g, depth - 1, alpha, beta, side);
    g.undo();
    if (max) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

function ai(s: ChessState): ChessState {
  const g = new Chess(s.fen);
  const side = g.turn();
  const moves = g.moves({ verbose: true });
  let best = moves[0], bestV = -Infinity;
  for (const m of moves) {
    g.move(m.san);
    const v = search(g, 2, -Infinity, Infinity, side) + Math.random() * 12;
    g.undo();
    if (v > bestV) { bestV = v; best = m; }
  }
  g.move(best.san);
  return { fen: g.fen(), last: [best.from, best.to] };
}

const GLYPH: Record<string, string> = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };
const FILES = "abcdefgh";

function Board({ state, me, onMove, canMove }: BoardProps<ChessState>) {
  const g = useMemo(() => new Chess(state.fen), [state.fen]);
  const [sel, setSel] = useState<Square | null>(null);
  const targets = useMemo(() => (sel ? new Set(g.moves({ square: sel, verbose: true }).map((m) => m.to)) : new Set<string>()), [g, sel]);
  const flip = me === 1;
  const mine: Color = me === 0 ? "w" : "b";
  const myTurn = canMove && g.turn() === mine;

  const tap = (sq: Square) => {
    if (!myTurn) return;
    const p = g.get(sq);
    if (sel && targets.has(sq)) {
      const next = new Chess(state.fen);
      next.move({ from: sel, to: sq, promotion: "q" });
      setSel(null);
      onMove({ fen: next.fen(), last: [sel, sq] });
      return;
    }
    setSel(p && p.color === mine ? sq : null);
  };

  const rows = flip ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="max-w-[min(92vw,520px)] mx-auto">
      <p className="text-center text-sm font-bold mb-2">{g.isCheck() ? "Check! " : ""}{myTurn ? "Your move" : "Waiting for the other side…"}</p>
      <div className="grid grid-cols-8 rounded-xl overflow-hidden border-4 border-amber-900 shadow-xl aspect-square">
        {rows.map((r) => cols.map((c) => {
          const sq = `${FILES[c]}${r + 1}` as Square;
          const p = g.get(sq);
          const dark = (r + c) % 2 === 0;
          const last = state.last?.includes(sq);
          return (
            <button key={sq} onClick={() => tap(sq)} className={`relative flex items-center justify-center text-[min(9vw,46px)] leading-none ${dark ? "bg-amber-700" : "bg-amber-100"} ${sel === sq ? "ring-4 ring-inset ring-sky-400" : ""} ${last ? "after:absolute after:inset-0 after:bg-yellow-300/35" : ""}`}>
              {p && <span className={p.color === "w" ? "text-white [text-shadow:0_1px_2px_#000,0_0_1px_#000]" : "text-slate-900"}>{GLYPH[p.color + p.type]}</span>}
              {targets.has(sq) && <span className={`absolute rounded-full ${p ? "inset-1 border-4 border-sky-500/70" : "w-1/4 h-1/4 bg-sky-500/70"}`} />}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

export const chess: GameModule<ChessState> = { init, turnOf, ai, result, Board };
