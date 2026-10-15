"use client";

// Snake: steer with arrow keys, swipes or the on-screen pad. Eat dates to grow; it speeds up as you
// grow. Hitting a wall or yourself ends the run. Everyone in a room gets the same food sequence.

import { useEffect, useRef, useState } from "react";
import { seeded } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

export interface SnakeState { seed: number; scores: (number | null)[] }

const N = 18;
type P = [number, number];

const init = (seats: number, seed: number): SnakeState => ({ seed, scores: Array(seats).fill(null) });
function finish(s: SnakeState, seat: number, score: number): SnakeState { const scores = s.scores.slice(); scores[seat] = score; return { ...s, scores }; }
function ai(s: SnakeState, seat: number): SnakeState { const r = seeded(s.seed + seat * 53); return finish(s, seat, Math.round(8 + r() * 22) * 10); }
function result(s: SnakeState) {
  if (s.scores.some((x) => x === null)) return null;
  const v = s.scores as number[], best = Math.max(...v);
  const w = v.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
  return { winners: w.length === v.length ? [] : w, scores: v };
}

function Board({ state, me, onFinish }: BoardProps<SnakeState>) {
  const [snake, setSnake] = useState<P[]>([[9, 9], [9, 8], [9, 7]]);
  const [food, setFood] = useState<P>([4, 4]);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const dir = useRef<P>([0, 1]);
  const queued = useRef<P | null>(null);
  const rand = useRef(seeded(state.seed));
  const sent = useRef(false);
  const done = state.scores[me] !== null;

  const turn = (d: P) => {
    const cur = queued.current ?? dir.current;
    if (d[0] === -cur[0] && d[1] === -cur[1]) return;
    queued.current = d;
    setStarted(true);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const m: Record<string, P> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] };
      if (m[e.key]) { e.preventDefault(); turn(m[e.key]); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    if (!started || over || done) return;
    const speed = Math.max(70, 160 - snake.length * 4);
    const t = setTimeout(() => {
      if (queued.current) { dir.current = queued.current; queued.current = null; }
      const head: P = [snake[0][0] + dir.current[0], snake[0][1] + dir.current[1]];
      const ate = head[0] === food[0] && head[1] === food[1];
      const body = ate ? snake : snake.slice(0, -1);
      if (head[0] < 0 || head[0] >= N || head[1] < 0 || head[1] >= N || body.some(([r, c]) => r === head[0] && c === head[1])) { setOver(true); return; }
      const next = [head, ...body];
      setSnake(next);
      if (ate) {
        setScore((s) => s + 10);
        let f: P;
        do { f = [Math.floor(rand.current() * N), Math.floor(rand.current() * N)]; } while (next.some(([r, c]) => r === f[0] && c === f[1]));
        setFood(f);
      }
    }, speed);
    return () => clearTimeout(t);
  }, [snake, food, started, over, done]);

  // Report the score once, a moment after the crash (not cancelled by re-renders).
  const report = useRef(onFinish);
  useEffect(() => { report.current = onFinish; });
  useEffect(() => {
    if (over && !sent.current) { sent.current = true; setTimeout(() => report.current?.(score), 900); }
  }, [over, score]);

  // Swipes
  const touch = useRef<P | null>(null);
  if (done) return <p className="text-center font-black text-lg py-10">You scored {state.scores[me]} · waiting for the others…</p>;
  return (
    <div className="max-w-[min(92vw,460px)] mx-auto space-y-3 select-none">
      <div className="flex justify-between text-sm font-bold"><span className="font-mono text-green-700">{score} pts</span><span className="text-slate-500">{over ? "Crashed!" : started ? "" : "Press an arrow or swipe to start"}</span></div>
      <div className="relative aspect-square rounded-2xl bg-green-950 border-4 border-green-800 shadow-xl touch-none"
        onTouchStart={(e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) turn(Math.abs(dx) > Math.abs(dy) ? [0, dx > 0 ? 1 : -1] : [dy > 0 ? 1 : -1, 0]);
          touch.current = null;
        }}>
        <span className="absolute text-[min(5vw,22px)] leading-none" style={{ left: `${(food[1] / N) * 100}%`, top: `${(food[0] / N) * 100}%`, width: `${100 / N}%`, height: `${100 / N}%` }}>🌴</span>
        {snake.map(([r, c], i) => (
          <span key={i} className={`absolute rounded-[30%] ${i === 0 ? "bg-lime-300" : "bg-green-500"}`} style={{ left: `${(c / N) * 100 + 0.4}%`, top: `${(r / N) * 100 + 0.4}%`, width: `${100 / N - 0.8}%`, height: `${100 / N - 0.8}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
        <span /><button onClick={() => turn([-1, 0])} className="h-12 rounded-xl bg-slate-200 font-black">▲</button><span />
        <button onClick={() => turn([0, -1])} className="h-12 rounded-xl bg-slate-200 font-black">◀</button>
        <button onClick={() => turn([1, 0])} className="h-12 rounded-xl bg-slate-200 font-black">▼</button>
        <button onClick={() => turn([0, 1])} className="h-12 rounded-xl bg-slate-200 font-black">▶</button>
      </div>
    </div>
  );
}

export const snake: GameModule<SnakeState> = { init, ai, finish, result, Board };
