"use client";

// Memory Match: 16 face-down cards, 8 pairs of Dubai icons. Flip two at a time; matches stay up. Score
// rewards few flips and a fast finish. Everyone in a room gets the same layout.

import { useEffect, useRef, useState } from "react";
import { seeded, shuffle } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

export interface MemoryState { seed: number; scores: (number | null)[] }

/** The current time (kept outside the component: reading the clock isn't part of rendering). */
const clock = () => Date.now();

const ICONS = ["🏙️", "🐪", "🌴", "⛵", "🕌", "🦅", "☕", "🏝️"];

const init = (seats: number, seed: number): MemoryState => ({ seed, scores: Array(seats).fill(null) });
function finish(s: MemoryState, seat: number, score: number): MemoryState { const scores = s.scores.slice(); scores[seat] = score; return { ...s, scores }; }
function ai(s: MemoryState, seat: number): MemoryState { const r = seeded(s.seed + seat * 29); return finish(s, seat, 450 + Math.round(r() * 350)); }
function result(s: MemoryState) {
  if (s.scores.some((x) => x === null)) return null;
  const v = s.scores as number[], best = Math.max(...v);
  const w = v.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
  return { winners: w.length === v.length ? [] : w, scores: v };
}

function Board({ state, me, onFinish }: BoardProps<MemoryState>) {
  const [cards] = useState(() => shuffle([...ICONS, ...ICONS], seeded(state.seed)));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [flips, setFlips] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const sent = useRef(false);
  const done = state.scores[me] !== null;

  useEffect(() => {
    if (startedAt === null || matched.size === cards.length) return;
    const t = setInterval(() => setSeconds(Math.floor((clock() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt, matched.size, cards.length]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const t = setTimeout(() => {
      if (cards[a] === cards[b]) setMatched((m) => new Set([...m, a, b]));
      setOpen([]);
    }, cards[a] === cards[b] ? 350 : 800);
    return () => clearTimeout(t);
  }, [open, cards]);

  const score = Math.max(0, 1000 - Math.max(0, flips - 8) * 25 - seconds * 4);
  // Report the score once, a moment after the last pair (not cancelled by re-renders).
  const report = useRef(onFinish);
  useEffect(() => { report.current = onFinish; });
  useEffect(() => {
    if (matched.size === cards.length && !sent.current) { sent.current = true; setTimeout(() => report.current?.(score), 700); }
  }, [matched.size, cards.length, score]);

  if (done) return <p className="text-center font-black text-lg py-10">You scored {state.scores[me]} · waiting for the others…</p>;
  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.has(i)) return;
    if (startedAt === null) setStartedAt(clock());
    if (open.length === 1) setFlips((f) => f + 1);
    setOpen((o) => [...o, i]);
  };
  return (
    <div className="max-w-[min(92vw,460px)] mx-auto space-y-3">
      <div className="flex justify-between text-sm font-bold"><span>{flips} flips · {seconds}s</span><span className="font-mono text-orange-700">{score} pts</span></div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((icon, i) => {
          const up = open.includes(i) || matched.has(i);
          return (
            <button key={i} onClick={() => flip(i)} className={`aspect-square rounded-2xl text-4xl sm:text-5xl flex items-center justify-center shadow-md transition-all duration-300 ${up ? "bg-white rotate-0" : "bg-gradient-to-br from-orange-400 to-rose-500 [transform:rotateY(180deg)]"} ${matched.has(i) ? "ring-4 ring-emerald-400 opacity-80" : ""}`}>
              {up ? icon : <span className="text-white/80 text-2xl font-black">DL</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const memory: GameModule<MemoryState> = { init, ai, finish, result, Board };
