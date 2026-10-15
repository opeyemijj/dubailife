"use client";

// Trivia Quiz: ten questions, 15 seconds each, faster correct answers score more. Everyone in a room
// gets the same questions (from the room's seed) and plays at the same time.

import { useEffect, useMemo, useRef, useState } from "react";
import { seeded, shuffle } from "@/lib/games/rooms";
import type { BoardProps, GameModule } from "./types";

type Q = [question: string, answers: [string, string, string, string], correct: number];

// Well-established facts only; answers are shuffled when shown.
const BANK: Q[] = [
  ["What is the tallest building in the world?", ["Burj Khalifa", "Shanghai Tower", "Merdeka 118", "One World Trade Center"], 0],
  ["Which emirate is Dubai's southern neighbour, home to the UAE capital?", ["Abu Dhabi", "Sharjah", "Ajman", "Fujairah"], 0],
  ["What is the currency of the UAE?", ["Dirham", "Riyal", "Dinar", "Pound"], 0],
  ["In which year was the United Arab Emirates founded?", ["1971", "1961", "1981", "1991"], 0],
  ["What shape is Palm Jumeirah?", ["A palm tree", "A star", "A crescent moon only", "A falcon"], 0],
  ["Which Dubai hotel is shaped like a sail?", ["Burj Al Arab", "Atlantis, The Palm", "Jumeirah Beach Hotel", "Address Downtown"], 0],
  ["What is the national bird of the UAE?", ["Falcon", "Eagle", "Flamingo", "Peacock"], 0],
  ["What is Dubai's famous choreographed water show called?", ["The Dubai Fountain", "The Palm Fountain", "Burj Waterworks", "Creek Lights"], 0],
  ["Which waterway runs through old Dubai?", ["Dubai Creek", "Dubai River", "Gulf Canal", "Al Khor Lake"], 0],
  ["What are the traditional wooden boats crossing Dubai Creek called?", ["Abras", "Gondolas", "Junks", "Feluccas"], 0],
  ["Which museum in Dubai looks like a silver ring covered in Arabic calligraphy?", ["Museum of the Future", "Louvre Abu Dhabi", "Etihad Museum", "Dubai Museum"], 0],
  ["What is the official language of the UAE?", ["Arabic", "English", "Urdu", "Persian"], 0],
  ["Which sea or gulf lies off Dubai's coast?", ["Arabian (Persian) Gulf", "Red Sea", "Caspian Sea", "Mediterranean Sea"], 0],
  ["Dubai's main airport has which code?", ["DXB", "DBX", "DUB", "UAE"], 0],
  ["What is the name of the waterpark at Atlantis, The Palm?", ["Aquaventure", "Wild Wadi", "Laguna", "Yas Waterworld"], 0],
  ["Which planet is known as the Red Planet?", ["Mars", "Venus", "Jupiter", "Mercury"], 0],
  ["How many continents are there?", ["7", "5", "6", "8"], 0],
  ["What is the largest ocean on Earth?", ["Pacific", "Atlantic", "Indian", "Arctic"], 0],
  ["Which gas do plants absorb from the air?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], 0],
  ["What is the chemical symbol for gold?", ["Au", "Ag", "Go", "Gd"], 0],
  ["How many players does a football (soccer) team have on the pitch?", ["11", "10", "9", "12"], 0],
  ["Who painted the Mona Lisa?", ["Leonardo da Vinci", "Michelangelo", "Raphael", "Van Gogh"], 0],
  ["What is the boiling point of water at sea level in Celsius?", ["100°C", "90°C", "110°C", "80°C"], 0],
  ["Which is the longest river in Africa?", ["Nile", "Congo", "Niger", "Zambezi"], 0],
  ["How many sides does a hexagon have?", ["6", "5", "7", "8"], 0],
  ["Which country hosted the 2022 FIFA World Cup?", ["Qatar", "Saudi Arabia", "UAE", "Russia"], 0],
  ["What is the hardest natural substance?", ["Diamond", "Gold", "Iron", "Quartz"], 0],
  ["Which planet is the largest in our solar system?", ["Jupiter", "Saturn", "Neptune", "Earth"], 0],
  ["Which animal is known as the 'ship of the desert'?", ["Camel", "Horse", "Oryx", "Donkey"], 0],
  ["What is the UAE's national animal?", ["Arabian oryx", "Camel", "Falcon", "Gazelle"], 0],
  ["How many emirates make up the UAE?", ["7", "5", "6", "9"], 0],
  ["What do you call a word that reads the same backwards?", ["Palindrome", "Anagram", "Acronym", "Homonym"], 0],
  ["What is the square root of 144?", ["12", "14", "11", "16"], 0],
  ["Which instrument has 88 keys?", ["Piano", "Organ", "Accordion", "Harpsichord"], 0],
  ["In chess, which piece can only move diagonally?", ["Bishop", "Rook", "Knight", "King"], 0],
  ["In which city is the Eiffel Tower?", ["Paris", "Rome", "London", "Madrid"], 0],
  ["Which fruit are dates in the UAE grown on?", ["Date palms", "Fig trees", "Olive trees", "Vines"], 0],
  ["What is the freezing point of water in Fahrenheit?", ["32°F", "0°F", "100°F", "12°F"], 0],
  ["Which continent is Egypt in?", ["Africa", "Asia", "Europe", "Oceania"], 0],
  ["What is the smallest prime number?", ["2", "1", "3", "5"], 0],
  ["Which organ pumps blood around the body?", ["Heart", "Liver", "Lungs", "Kidney"], 0],
  ["How many minutes are in a day?", ["1,440", "1,200", "1,600", "960"], 0],
  ["What colour do you get by mixing blue and yellow?", ["Green", "Purple", "Orange", "Brown"], 0],
  ["Which traditional Emirati garment do men often wear?", ["Kandura", "Kimono", "Sari", "Poncho"], 0],
  ["Dubai Metro's first line, opened in 2009, is which colour?", ["Red", "Green", "Blue", "Gold"], 0],
];

export interface TriviaState {
  seed: number;
  questions: number[];
  scores: (number | null)[];
}

const ROUNDS = 10;
const SECONDS = 15;

function init(seats: number, seed: number): TriviaState {
  const r = seeded(seed);
  return { seed, questions: shuffle(BANK.map((_, i) => i), r).slice(0, ROUNDS), scores: Array(seats).fill(null) };
}

/** The computer answers about 60–80% right, at a human-ish pace. */
function ai(state: TriviaState, seat: number): TriviaState {
  const r = seeded(state.seed + seat * 977);
  const skill = 0.6 + r() * 0.2;
  let score = 0;
  for (let i = 0; i < ROUNDS; i++) if (r() < skill) score += 100 + Math.round((1 - r() * 0.8) * SECONDS * 10);
  return finish(state, seat, score);
}

function finish(state: TriviaState, seat: number, score: number): TriviaState {
  const scores = state.scores.slice();
  scores[seat] = score;
  return { ...state, scores };
}

function result(state: TriviaState) {
  if (state.scores.some((s) => s === null)) return null;
  const s = state.scores as number[];
  const best = Math.max(...s);
  const winners = s.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  return { winners: winners.length === s.length ? [] : winners, scores: s };
}

function Board({ state, me, onFinish }: BoardProps<TriviaState>) {
  const r = useMemo(() => seeded(state.seed * 31 + 7), [state.seed]);
  // Each question's answers in a shuffled order (the same for everyone in the room).
  const rounds = useMemo(() => state.questions.map((qi) => {
    const [q, answers, correct] = BANK[qi];
    const order = shuffle([0, 1, 2, 3], r);
    return { q, answers: order.map((i) => answers[i]), correct: order.indexOf(correct) };
  }), [state.questions, r]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const done = state.scores[me] !== null;
  const sent = useRef(false);

  useEffect(() => {
    if (done || picked !== null) return;
    // Out of time counts as a wrong answer.
    const t = setTimeout(() => { if (left <= 1) setPicked(-1); setLeft((s) => s - 1); }, 1000);
    return () => clearTimeout(t);
  }, [left, picked, done]);

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => {
      if (i + 1 < rounds.length) { setI(i + 1); setPicked(null); setLeft(SECONDS); }
      else if (!sent.current) { sent.current = true; onFinish?.(score); }
    }, 1300);
    return () => clearTimeout(t);
  }, [picked, i, rounds.length, score, onFinish]);

  if (done) return <p className="text-center font-black text-lg py-10">You scored {state.scores[me]} · waiting for the others…</p>;
  const cur = rounds[i];
  const answer = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === cur.correct) setScore((s) => s + 100 + left * 10);
  };
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm font-bold text-slate-500">
        <span>Question {i + 1} / {rounds.length}</span>
        <span className="font-mono">{score} pts</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-pink-500 transition-all duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
      <h2 className="text-xl sm:text-2xl font-black leading-snug min-h-[4rem]">{cur.q}</h2>
      <div className="grid gap-2">
        {cur.answers.map((a, k) => {
          const show = picked !== null;
          const tone = !show ? "bg-white hover:bg-pink-50 border-slate-200" : k === cur.correct ? "bg-emerald-500 text-white border-emerald-500" : k === picked ? "bg-rose-500 text-white border-rose-500" : "bg-white opacity-60 border-slate-200";
          return <button key={k} onClick={() => answer(k)} className={`min-h-14 px-4 rounded-2xl border-2 text-left font-bold transition-colors ${tone}`}>{a}</button>;
        })}
      </div>
      {picked === -1 && <p className="text-center text-sm font-bold text-rose-600">Time&apos;s up!</p>}
    </div>
  );
}

export const trivia: GameModule<TriviaState> = { init, ai, finish, result, Board };
