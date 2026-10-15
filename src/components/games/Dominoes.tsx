"use client";

// Dominoes: double-six draw game for 2–4 players. Play a tile matching an open end; if you can't,
// draw from the boneyard; if it's empty, pass. First to empty their hand wins; if everyone is blocked,
// the lowest hand wins.

import { useState } from "react";
import { seeded, shuffle } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

type Tile = [number, number];

export interface DominoState {
  hands: Tile[][];
  boneyard: Tile[];
  /** The line of play, each tile oriented left to right. */
  chain: Tile[];
  turn: number;
  /** Players in a row who couldn't play (everyone passing = blocked). */
  passes: number;
  winner: number | null | "draw";
  log?: string;
}

const ALL: Tile[] = [];
for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) ALL.push([a, b]);

function init(seats: number, seed: number): DominoState {
  const tiles = shuffle(ALL, seeded(seed));
  const per = seats === 2 ? 7 : 5;
  const hands = Array.from({ length: seats }, (_, i) => tiles.slice(i * per, (i + 1) * per));
  // The highest double starts.
  let turn = 0, best = -1;
  hands.forEach((h, i) => h.forEach(([a, b]) => { if (a === b && a > best) { best = a; turn = i; } }));
  return { hands, boneyard: tiles.slice(seats * per), chain: [], turn, passes: 0, winner: null };
}

const ends = (s: DominoState): [number, number] | null => (s.chain.length ? [s.chain[0][0], s.chain[s.chain.length - 1][1]] : null);
const pips = (h: Tile[]) => h.reduce((n, [a, b]) => n + a + b, 0);

/** Where a tile can go: "left", "right", or both. */
function placesFor(s: DominoState, t: Tile): Array<"left" | "right"> {
  const e = ends(s);
  if (!e) return ["right"];
  const out: Array<"left" | "right"> = [];
  if (t[0] === e[0] || t[1] === e[0]) out.push("left");
  if (t[0] === e[1] || t[1] === e[1]) out.push("right");
  return out;
}

function play(s: DominoState, seat: number, index: number, side: "left" | "right"): DominoState {
  const hands = s.hands.map((h) => h.slice());
  const [t] = hands[seat].splice(index, 1);
  const e = ends(s);
  const chain = s.chain.slice();
  if (!e) chain.push(t);
  else if (side === "left") chain.unshift(t[1] === e[0] ? t : [t[1], t[0]]);
  else chain.push(t[0] === e[1] ? t : [t[1], t[0]]);
  const next: DominoState = { ...s, hands, chain, passes: 0, turn: (seat + 1) % hands.length, log: undefined };
  if (!hands[seat].length) next.winner = seat;
  return next;
}

function draw(s: DominoState, seat: number): DominoState {
  const hands = s.hands.map((h) => h.slice());
  const boneyard = s.boneyard.slice();
  hands[seat].push(boneyard.pop()!);
  return { ...s, hands, boneyard };
}

function pass(s: DominoState, seat: number): DominoState {
  const passes = s.passes + 1;
  const next: DominoState = { ...s, passes, turn: (seat + 1) % s.hands.length, log: "passed" };
  if (passes >= s.hands.length) {
    // Blocked: the lowest hand wins (a tie is a draw).
    const totals = s.hands.map(pips);
    const low = Math.min(...totals);
    const lows = totals.map((t, i) => (t === low ? i : -1)).filter((i) => i >= 0);
    next.winner = lows.length === 1 ? lows[0] : "draw";
  }
  return next;
}

const canPlay = (s: DominoState, seat: number) => s.hands[seat].some((t) => placesFor(s, t).length);

/** Draw until something fits (or pass), then play the heaviest tile that fits. */
function ai(s0: DominoState, seat: number): DominoState {
  let s = s0;
  while (!canPlay(s, seat) && s.boneyard.length) s = draw(s, seat);
  if (!canPlay(s, seat)) return pass(s, seat);
  let best = -1, bestPips = -1;
  s.hands[seat].forEach((t, i) => { if (placesFor(s, t).length && t[0] + t[1] > bestPips) { best = i; bestPips = t[0] + t[1]; } });
  return play(s, seat, best, placesFor(s, s.hands[seat][best])[0]);
}

const turnOf = (s: DominoState) => (s.winner === null ? s.turn : null);
function result(s: DominoState) {
  if (s.winner === null) return null;
  return { winners: s.winner === "draw" ? [] : [s.winner], scores: s.hands.map((h) => -pips(h)) };
}

const DOTS: Record<number, number[]> = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Half({ n }: { n: number }) {
  return (
    <span className="grid grid-cols-3 grid-rows-3 w-full aspect-square p-[12%] gap-[6%]">
      {Array.from({ length: 9 }, (_, i) => <span key={i} className={`rounded-full ${DOTS[n].includes(i) ? "bg-slate-900" : ""}`} />)}
    </span>
  );
}
function Domino({ t, vertical = false, small = false, onClick, glow = false }: { t: Tile; vertical?: boolean; small?: boolean; onClick?: () => void; glow?: boolean }) {
  const size = small ? "w-6" : "w-9 sm:w-11";
  return (
    <button onClick={onClick} disabled={!onClick} className={`${size} ${vertical ? "flex-col" : "flex-row !w-auto"} flex shrink-0 bg-white rounded-md border-2 ${glow ? "border-emerald-500 ring-2 ring-emerald-300 -translate-y-1" : "border-slate-300"} shadow transition-transform`}>
      <span className={vertical ? size : small ? "w-6" : "w-9 sm:w-11"}><Half n={t[0]} /></span>
      <span className={vertical ? "h-px bg-slate-300 mx-1" : "w-px bg-slate-300 my-1"} />
      <span className={vertical ? size : small ? "w-6" : "w-9 sm:w-11"}><Half n={t[1]} /></span>
    </button>
  );
}

function Board({ state, me, seats, onMove, canMove }: BoardProps<DominoState>) {
  const [choose, setChoose] = useState<number | null>(null);
  const mine = state.hands[me] ?? [];
  const myTurn = canMove && state.turn === me && state.winner === null;
  const can = myTurn && canPlay(state, me);
  const tap = (i: number) => {
    if (!myTurn) return;
    const where = placesFor(state, mine[i]);
    if (!where.length) return;
    if (where.length === 2 && ends(state)![0] !== ends(state)![1]) { setChoose(i); return; }
    onMove(play(state, me, i, where[0]));
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
        {seats.map((s, i) => (
          <span key={i} className={`px-2.5 py-1 rounded-full ${state.turn === i && state.winner === null ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>{i === me ? "You" : s.name} · {state.hands[i].length} tiles</span>
        ))}
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Boneyard {state.boneyard.length}</span>
      </div>
      <div className="min-h-32 rounded-3xl bg-teal-800 p-3 sm:p-4 flex flex-wrap justify-center content-center gap-1 shadow-inner">
        {state.chain.length === 0 ? <span className="text-teal-100 font-bold text-sm self-center">Play the first tile</span>
          : state.chain.map((t, i) => <Domino key={i} t={t} small vertical={t[0] === t[1]} />)}
      </div>
      {choose !== null && (
        <div className="flex justify-center gap-2">
          <button onClick={() => { onMove(play(state, me, choose, "left")); setChoose(null); }} className="h-11 px-4 rounded-xl bg-teal-600 text-white font-black">◀ Left end</button>
          <button onClick={() => { onMove(play(state, me, choose, "right")); setChoose(null); }} className="h-11 px-4 rounded-xl bg-teal-600 text-white font-black">Right end ▶</button>
        </div>
      )}
      <p className="text-center text-sm font-bold">{myTurn ? (can ? "Your turn — tap a glowing tile" : state.boneyard.length ? "Nothing fits — draw a tile" : "Nothing fits — pass") : state.winner === null ? `${seats[state.turn]?.name ?? "…"} is playing…` : ""}</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {mine.map((t, i) => <Domino key={`${t[0]}-${t[1]}`} t={t} vertical glow={myTurn && placesFor(state, t).length > 0} onClick={myTurn ? () => tap(i) : undefined} />)}
      </div>
      {myTurn && !can && (
        <div className="flex justify-center">
          {state.boneyard.length
            ? <button onClick={() => onMove(draw(state, me))} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black">Draw a tile</button>
            : <button onClick={() => onMove(pass(state, me))} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black">Pass</button>}
        </div>
      )}
    </div>
  );
}

export const dominoes: GameModule<DominoState> = { init, turnOf, ai, result, Board };
