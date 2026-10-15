"use client";

// Sea Battle (battleship): each side's fleet of five is placed at random on a 10×10 sea. Take turns firing;
// a hit earns another shot. Sink the whole enemy fleet to win. The computer hunts at random (on a
// checkerboard) until it hits, then works along the ship.

import { seeded } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

const N = 10;
const FLEET = [5, 4, 3, 3, 2];
const NAMES = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];

/** Ships as lists of cell indexes (r * 10 + c), per seat. */
export interface SeaState {
  ships: number[][][];
  /** Shots each seat has fired at the other's sea: 0 not yet, 1 miss, 2 hit. */
  shots: number[][];
  turn: number;
  winner: number | null;
  last?: { by: number; cell: number; hit: boolean; sunk?: string };
}

function place(r: () => number): number[][] {
  const taken = new Set<number>();
  return FLEET.map((len) => {
    for (;;) {
      const down = r() < 0.5;
      const row = Math.floor(r() * (down ? N - len + 1 : N)), col = Math.floor(r() * (down ? N : N - len + 1));
      const cells = Array.from({ length: len }, (_, i) => (row + (down ? i : 0)) * N + col + (down ? 0 : i));
      if (cells.every((c) => !taken.has(c))) { cells.forEach((c) => taken.add(c)); return cells; }
    }
  });
}

function init(_seats: number, seed: number): SeaState {
  const r = seeded(seed);
  return { ships: [place(r), place(r)], shots: [Array(N * N).fill(0), Array(N * N).fill(0)], turn: 0, winner: null };
}

const sunk = (ship: number[], shots: number[]) => ship.every((c) => shots[c] === 2);

function fire(s: SeaState, cell: number): SeaState {
  const me = s.turn, foe = 1 - me;
  if (s.shots[me][cell] || s.winner !== null) return s;
  const shots = s.shots.map((x) => x.slice());
  const hit = s.ships[foe].some((ship) => ship.includes(cell));
  shots[me][cell] = hit ? 2 : 1;
  const ship = s.ships[foe].findIndex((sh) => sh.includes(cell));
  const justSunk = hit && sunk(s.ships[foe][ship], shots[me]) ? NAMES[ship] : undefined;
  const won = s.ships[foe].every((sh) => sunk(sh, shots[me]));
  return { ...s, shots, winner: won ? me : null, turn: hit && !won ? me : foe, last: { by: me, cell, hit, sunk: justSunk } };
}

function ai(s: SeaState, seat: number): SeaState {
  const mine = s.shots[seat], foe = s.ships[1 - seat];
  // Hits on ships not yet sunk: shoot next to them (along the line if there are two).
  const open = foe.filter((sh) => !sunk(sh, mine)).flatMap((sh) => sh.filter((c) => mine[c] === 2));
  const free = (c: number) => c >= 0 && c < N * N && !mine[c];
  if (open.length) {
    const candidates: number[] = [];
    for (const c of open) {
      const r = Math.floor(c / N), col = c % N;
      for (const [rr, cc] of [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]]) if (rr >= 0 && rr < N && cc >= 0 && cc < N && free(rr * N + cc)) candidates.push(rr * N + cc);
    }
    const lined = candidates.filter((n) => open.every((o) => Math.floor(o / N) === Math.floor(n / N)) || open.every((o) => o % N === n % N));
    const pick = (lined.length ? lined : candidates)[Math.floor(Math.random() * (lined.length || candidates.length))];
    if (pick !== undefined) return fire(s, pick);
  }
  const hunt = mine.map((v, c) => (!v && (Math.floor(c / N) + (c % N)) % 2 === 0 ? c : -1)).filter((c) => c >= 0);
  const any = mine.map((v, c) => (!v ? c : -1)).filter((c) => c >= 0);
  const list = hunt.length ? hunt : any;
  return fire(s, list[Math.floor(Math.random() * list.length)]);
}

const turnOf = (s: SeaState) => (s.winner === null ? s.turn : null);
const result = (s: SeaState) => (s.winner === null ? null : { winners: [s.winner], scores: s.shots.map((sh) => sh.filter((v) => v === 2).length) });

function Grid({ cells, onCell, small = false }: { cells: Array<{ ship: boolean; shot: number; sunkShip: boolean }>; onCell?: (i: number) => void; small?: boolean }) {
  return (
    <div className={`grid grid-cols-10 gap-[2px] p-1.5 rounded-2xl bg-sky-900 ${small ? "w-full max-w-[220px]" : "w-full"}`}>
      {cells.map((c, i) => (
        <button key={i} disabled={!onCell || c.shot > 0} onClick={() => onCell?.(i)}
          className={`aspect-square rounded-[3px] flex items-center justify-center text-[10px] sm:text-xs font-black ${c.sunkShip ? "bg-rose-700" : c.ship ? "bg-slate-400" : "bg-sky-600"} ${onCell && !c.shot ? "hover:bg-sky-400" : ""}`}>
          {c.shot === 2 ? "💥" : c.shot === 1 ? <span className="w-1.5 h-1.5 rounded-full bg-white/80" /> : null}
        </button>
      ))}
    </div>
  );
}

function Board({ state, me, onMove, canMove }: BoardProps<SeaState>) {
  const foe = 1 - me;
  const myTurn = canMove && state.turn === me && state.winner === null;
  const enemy = Array.from({ length: N * N }, (_, i) => {
    const ship = state.ships[foe].find((sh) => sh.includes(i));
    return { ship: false, shot: state.shots[me][i], sunkShip: !!ship && sunk(ship, state.shots[me]) };
  });
  const own = Array.from({ length: N * N }, (_, i) => {
    const ship = state.ships[me].find((sh) => sh.includes(i));
    return { ship: !!ship, shot: state.shots[foe][i], sunkShip: !!ship && sunk(ship, state.shots[foe]) };
  });
  const left = state.ships[foe].filter((sh) => !sunk(sh, state.shots[me])).length;
  const l = state.last;
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <p className="text-center text-sm font-bold min-h-5">
        {l ? `${l.by === me ? "You" : "They"} ${l.hit ? (l.sunk ? `sank ${l.by === me ? "their" : "your"} ${l.sunk}!` : "hit!") : "missed."} ` : ""}
        {myTurn ? "Fire at the enemy's waters" : state.winner === null ? "The enemy is aiming…" : ""}
      </p>
      <div className="grid sm:grid-cols-[1fr_220px] gap-4 items-start">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Enemy waters · {left} ships left</p>
          <Grid cells={enemy} onCell={myTurn ? (i) => onMove(fire(state, i)) : undefined} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Your fleet</p>
          <Grid cells={own} small />
        </div>
      </div>
    </div>
  );
}

export const battleship: GameModule<SeaState> = { init, turnOf, ai, result, Board };
