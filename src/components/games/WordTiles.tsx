"use client";

// Word Tile Challenge: everyone gets the same seven letter tiles and 90 seconds to make as many words
// (3+ letters) as they can. Words are checked against a public-domain dictionary (Webster's 2nd, in
// public/games/words.txt), loaded only when the game opens.

import { useEffect, useMemo, useRef, useState } from "react";
import { seeded } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

export interface WordState {
  seed: number;
  letters: string[];
  scores: (number | null)[];
}

const SECONDS = 90;
const VALUE: Record<string, number> = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 };
const VOWELS = "aaaeeeiioou";
const CONSONANTS = "bbccddfgghjklllmmnnnpprrrssssttttvwyz";

/** Letter score plus a bonus for length (7-letter words are worth the most). */
export const wordScore = (w: string) => [...w].reduce((s, c) => s + (VALUE[c] ?? 1), 0) + [0, 0, 0, 0, 2, 5, 10, 20][w.length];

function init(seats: number, seed: number): WordState {
  const r = seeded(seed);
  const pick = (from: string) => from[Math.floor(r() * from.length)];
  const letters = [pick(VOWELS), pick(VOWELS), pick(VOWELS), pick(CONSONANTS), pick(CONSONANTS), pick(CONSONANTS), pick(CONSONANTS)];
  return { seed, letters, scores: Array(seats).fill(null) };
}

let dictionary: Promise<Set<string>> | null = null;
export const loadWords = () => (dictionary ??= fetch("/games/words.txt").then((r) => r.text()).then((t) => new Set(t.split("\n").filter(Boolean))));

/** Words that can be made from these tiles (each tile used at most once). */
function playable(words: Set<string>, letters: string[]) {
  const pool: Record<string, number> = {};
  for (const l of letters) pool[l] = (pool[l] ?? 0) + 1;
  const out: string[] = [];
  for (const w of words) {
    if (w.length > letters.length) continue;
    const need: Record<string, number> = {};
    let ok = true;
    for (const c of w) { need[c] = (need[c] ?? 0) + 1; if (need[c] > (pool[c] ?? 0)) { ok = false; break; } }
    if (ok) out.push(w);
  }
  return out;
}

/** The computer finds a share of the possible words, favouring common short ones. */
async function ai(state: WordState, seat: number): Promise<WordState> {
  const words = playable(await loadWords(), state.letters);
  const r = seeded(state.seed + seat * 131);
  const share = 0.18 + r() * 0.17;
  const score = words.filter((w) => r() < share * (w.length <= 4 ? 1.3 : 0.7)).reduce((s, w) => s + wordScore(w), 0);
  return finish(state, seat, score);
}

function finish(state: WordState, seat: number, score: number): WordState {
  const scores = state.scores.slice();
  scores[seat] = score;
  return { ...state, scores };
}

function result(state: WordState) {
  if (state.scores.some((s) => s === null)) return null;
  const s = state.scores as number[];
  const best = Math.max(...s);
  const winners = s.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  return { winners: winners.length === s.length ? [] : winners, scores: s };
}

function Board({ state, me, onFinish }: BoardProps<WordState>) {
  const [words, setWords] = useState<Set<string> | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [order, setOrder] = useState(() => state.letters.map((_, i) => i));
  const [picked, setPicked] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const done = state.scores[me] !== null;
  const sent = useRef(false);
  const total = useMemo(() => found.reduce((s, w) => s + wordScore(w), 0), [found]);

  useEffect(() => { void loadWords().then(setWords); }, []);
  useEffect(() => {
    if (!words || done) return;
    if (left <= 0) { if (!sent.current) { sent.current = true; onFinish?.(total, found); } return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, words, done, total, found, onFinish]);

  if (done) return <p className="text-center font-black text-lg py-10">You scored {state.scores[me]} · waiting for the others…</p>;
  if (!words) return <p className="text-center font-bold py-10 text-slate-500">Loading the dictionary…</p>;

  const current = picked.map((i) => state.letters[i]).join("");
  const submit = () => {
    const w = current;
    setPicked([]);
    if (w.length < 3) return setNote("Words need 3 letters or more");
    if (found.includes(w)) return setNote("Already found");
    if (!words.has(w)) return setNote(`"${w.toUpperCase()}" isn't in the dictionary`);
    setFound((f) => [w, ...f]);
    setNote(`+${wordScore(w)} · ${w.toUpperCase()}`);
  };
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="font-mono text-indigo-700">{total} pts · {found.length} words</span>
        <span className={`font-mono ${left <= 10 ? "text-rose-600" : "text-slate-500"}`}>{left}s</span>
      </div>
      <div className="h-14 rounded-2xl bg-white border-2 border-indigo-200 flex items-center justify-center gap-1 text-3xl font-black tracking-widest text-indigo-900">
        {current.toUpperCase() || <span className="text-base font-bold text-slate-400 tracking-normal">Tap tiles to make a word</span>}
      </div>
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {order.map((i) => {
          const used = picked.includes(i);
          return (
            <button key={i} disabled={used} onClick={() => setPicked((p) => [...p, i])}
              className={`relative w-11 h-12 sm:w-14 sm:h-16 rounded-xl font-black text-2xl sm:text-3xl shadow-[0_4px_0_#a16207] transition-all ${used ? "bg-amber-100 text-amber-300 translate-y-1 shadow-none" : "bg-amber-300 text-amber-950 active:translate-y-1 active:shadow-none"}`}>
              {state.letters[i].toUpperCase()}
              <span className="absolute bottom-0.5 right-1 text-[9px] font-black">{VALUE[state.letters[i]]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setPicked((p) => p.slice(0, -1))} className="h-12 px-4 rounded-2xl bg-slate-100 font-bold">⌫</button>
        <button onClick={() => { setPicked([]); setOrder((o) => [...o].sort(() => Math.random() - 0.5)); }} className="h-12 px-4 rounded-2xl bg-slate-100 font-bold">Shuffle</button>
        <button onClick={submit} className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-black">Submit word</button>
      </div>
      {note && <p className="text-center text-sm font-bold text-slate-600">{note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {found.map((w) => <span key={w} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-black uppercase">{w} · {wordScore(w)}</span>)}
      </div>
      <button onClick={() => setLeft(0)} className="w-full h-11 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500">I&apos;m done — finish now</button>
    </div>
  );
}

export const word: GameModule<WordState> = { init, ai, finish, result, Board };
