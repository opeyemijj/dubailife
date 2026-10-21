"use client";

// Draw & Guess: players take turns drawing a secret word while everyone else types guesses. Faster
// correct guesses score more (100–300); the artist gets 50 for each player who gets it. Everyone draws
// twice (up to 12 rounds). Against the computer, the computer draws by sketching the word's picture
// (outline first, then colour) and the computer players guess while you draw.
//
// In a room the artist's client saves the strokes and ends the round; guessers record their guess with
// the race-game "finish" path (merged into the latest state), so nobody's guess is lost.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardProps, GameModule } from "./types";

interface Stroke { id: string; c: string; w: number; p: number[] }

export interface DrawState {
  seed: number;
  order: number[];
  round: number;
  rounds: number;
  drawer: number;
  word: number;
  startedAt: number;
  strokes: Stroke[];
  /** Points each seat got this round for guessing (null = not yet). */
  guessed: (number | null)[];
  scores: number[];
  over: boolean;
}

const WORDS: Array<[string, string]> = [
  ["camel", "🐪"], ["palm tree", "🌴"], ["sun", "☀️"], ["house", "🏠"], ["car", "🚗"], ["cat", "🐱"], ["fish", "🐟"], ["apple", "🍎"],
  ["pizza", "🍕"], ["guitar", "🎸"], ["rocket", "🚀"], ["umbrella", "☂️"], ["star", "⭐"], ["moon", "🌙"], ["sailboat", "⛵"], ["tree", "🌳"],
  ["flower", "🌸"], ["banana", "🍌"], ["heart", "❤️"], ["clock", "⏰"], ["phone", "📱"], ["glasses", "👓"], ["top hat", "🎩"], ["key", "🔑"],
  ["light bulb", "💡"], ["airplane", "✈️"], ["bicycle", "🚲"], ["football", "⚽"], ["cake", "🎂"], ["ice cream", "🍦"], ["crown", "👑"], ["mountain", "⛰️"],
  ["snowman", "⛄"], ["ghost", "👻"], ["robot", "🤖"], ["dog", "🐶"], ["mosque", "🕌"], ["rainbow", "🌈"], ["cactus", "🌵"], ["octopus", "🐙"],
  ["butterfly", "🦋"], ["pineapple", "🍍"], ["anchor", "⚓"], ["trophy", "🏆"], ["balloon", "🎈"], ["castle", "🏰"], ["whale", "🐳"], ["burger", "🍔"],
  ["coffee", "☕"], ["camera", "📷"], ["tent", "⛺"], ["snail", "🐌"], ["shark", "🦈"], ["dolphin", "🐬"], ["falcon", "🦅"], ["diamond", "💎"],
];

const DURATION = 75_000;
/** Read the clock outside rendering. */
const clock = () => Date.now();
const hash = (n: number) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };

function init(seats: number, seed: number): DrawState {
  const order = WORDS.map((_, i) => i).sort((a, b) => hash(seed + a * 97) - hash(seed + b * 97));
  return { seed, order, round: 0, rounds: Math.min(12, seats * 2), drawer: 0, word: order[0], startedAt: clock(), strokes: [], guessed: Array(seats).fill(null), scores: Array(seats).fill(0), over: false };
}

function nextRound(s: DrawState): DrawState {
  const round = s.round + 1;
  if (round >= s.rounds) return { ...s, over: true };
  const n = s.scores.length;
  return { ...s, round, drawer: round % n, word: s.order[round % s.order.length], startedAt: clock(), strokes: [], guessed: Array(n).fill(null) };
}

/** A correct guess worth `points`; the artist gets 50. A score of -1 means "the round ran out" (anyone may end it). */
function finish(s: DrawState, seat: number, points: number): DrawState {
  if (s.over) return s;
  if (points === -1) return clock() > s.startedAt + DURATION + 4000 ? nextRound(s) : s;
  if (seat === s.drawer || s.guessed[seat] !== null) return s;
  const guessed = [...s.guessed]; guessed[seat] = points;
  const scores = [...s.scores]; scores[seat] += points; scores[s.drawer] += 50;
  return { ...s, guessed, scores };
}

const everyoneGuessed = (s: DrawState) => s.guessed.every((g, i) => i === s.drawer || g !== null);

/** Computer drawer's "move": end its round once time is up (the drawing itself is animated on screen). */
const ai = (s: DrawState) => nextRound(s);
const delay = (s: DrawState) => (everyoneGuessed(s) ? 1800 : Math.max(300, s.startedAt + DURATION - clock()));
const turnOf = (s: DrawState) => (s.over ? null : s.drawer);
const result = (s: DrawState) => {
  if (!s.over) return null;
  const best = Math.max(...s.scores);
  const w = s.scores.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
  return { winners: w.length === s.scores.length ? [] : w, scores: s.scores };
};

/** When a computer guesser gets it this round (ms after the start), or never. */
function aiGuessAt(s: DrawState, seat: number): number | null {
  const r = hash(s.seed + s.round * 131 + seat * 17);
  if (r < 0.2) return null;
  return Math.round(DURATION * (0.2 + 0.65 * hash(s.seed + s.round * 7 + seat * 911)));
}
const pointsAt = (ms: number) => 100 + Math.round(200 * Math.max(0, 1 - ms / DURATION));
const norm = (t: string) => t.toLowerCase().replace(/[^a-z]/g, "");
function nearly(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// ---------------------------------------------------------------- the computer's sketch

/** Points to sketch an emoji: its outline (traced round the middle), then dabs of colour inside. */
function sketchOf(emoji: string): Array<[number, number, string, number]> {
  if (typeof document === "undefined") return [];
  const N = 120, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${N * 0.82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(emoji, N / 2, N / 2 + 4);
  const { data } = g.getImageData(0, 0, N, N);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : data[(y * N + x) * 4 + 3]);
  const col = (x: number, y: number) => { const k = (y * N + x) * 4; return `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`; };
  const edge: Array<[number, number]> = [], fillPts: Array<[number, number]> = [];
  let cx = 0, cy = 0, n = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (a(x, y) < 128) continue;
    cx += x; cy += y; n++;
    if (a(x - 1, y) < 128 || a(x + 1, y) < 128 || a(x, y - 1) < 128 || a(x, y + 1) < 128) edge.push([x, y]);
    else if (x % 4 === 0 && y % 4 === 0) fillPts.push([x, y]);
  }
  if (!n) return [];
  cx /= n; cy /= n;
  edge.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  // Fit the square sketch into the 4:3 canvas (1000 × 750 units), centred.
  const s = 700 / N, ox = (1000 - 700) / 2, oy = 25;
  return [
    ...edge.filter((_, i) => i % 2 === 0).map(([x, y]) => [ox + x * s, oy + y * s, "#1f2937", 7] as [number, number, string, number]),
    ...fillPts.sort((p, q) => p[1] - q[1] || p[0] - q[0]).map(([x, y]) => [ox + x * s, oy + y * s, col(x, y), 22] as [number, number, string, number]),
  ];
}

// ---------------------------------------------------------------- board

const COLORS = ["#111827", "#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#92400e", "#ffffff"];
const SIZES = [6, 14, 28];

function Board({ state, me, seats, onMove, onFinish, canMove }: BoardProps<DrawState>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [now, setNow] = useState(() => clock());
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [guess, setGuess] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const mine = useRef<Map<string, Stroke>>(new Map());
  const drawing = useRef<Stroke | null>(null);
  const [pending, setPending] = useState(0);
  const latest = useRef({ state, onMove, onFinish });
  useEffect(() => { latest.current = { state, onMove, onFinish }; });

  const [word, emoji] = WORDS[state.word];
  const drawer = state.drawer;
  const iDraw = drawer === me;
  const aiDraws = !!seats[drawer]?.ai;
  const elapsed = Math.max(0, now - state.startedAt);
  const left = Math.max(0, Math.ceil((DURATION - elapsed) / 1000));
  const shown = seats.map((x, i) => (i === me ? "You" : x.name));

  useEffect(() => { const t = setInterval(() => setNow(clock()), 250); return () => clearInterval(t); }, []);
  // A new round: forget my strokes from the last one.
  useEffect(() => { mine.current = new Map(); drawing.current = null; const t = setTimeout(() => { setGuess(""); setNote(null); }, 0); return () => clearTimeout(t); }, [state.round]);

  // ---- drawing on the canvas
  const sketch = useMemo(() => (aiDraws ? sketchOf(emoji) : []), [aiDraws, emoji]);
  const paint = useCallback(() => {
    const cv = canvas.current, g = cv?.getContext("2d");
    if (!cv || !g) return;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, cv.width, cv.height);
    const k = cv.width / 1000;
    g.lineCap = "round"; g.lineJoin = "round";
    if (aiDraws) {
      const count = Math.floor(sketch.length * Math.min(1, elapsed / (DURATION * 0.72)));
      // Colour first (underneath), then the outline on top, joining neighbouring outline points into lines.
      for (let i = 0; i < count; i++) {
        const [x, y, c, w] = sketch[i];
        if (w === 7) continue;
        g.fillStyle = c; g.globalAlpha = 0.85; g.beginPath(); g.arc(x * k, y * k, (w / 2) * k, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1; g.strokeStyle = "#1f2937"; g.lineWidth = 7 * k;
      for (let i = 1; i < count; i++) {
        const [x0, y0, , w0] = sketch[i - 1], [x1, y1, , w1] = sketch[i];
        if (w0 !== 7 || w1 !== 7 || Math.hypot(x1 - x0, y1 - y0) > 40) continue;
        g.beginPath(); g.moveTo(x0 * k, y0 * k); g.lineTo(x1 * k, y1 * k); g.stroke();
      }
      return;
    }
    const ids = new Set(mine.current.keys());
    const strokes = [...state.strokes.filter((s) => !ids.has(s.id)), ...mine.current.values()];
    for (const s of strokes) {
      g.strokeStyle = s.c; g.lineWidth = s.w * k;
      g.beginPath();
      for (let i = 0; i < s.p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, s.p[i] * k, s.p[i + 1] * k);
      if (s.p.length === 2) g.lineTo(s.p[0] * k + 0.1, s.p[1] * k);
      g.stroke();
    }
  }, [aiDraws, sketch, elapsed, state.strokes]);
  const paintRef = useRef(paint);
  useEffect(() => { paintRef.current = paint; paint(); }, [paint, pending]);

  // Keep the canvas sharp at its on-screen size.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const fit = () => { const w = cv.clientWidth * Math.min(2, window.devicePixelRatio || 1); cv.width = w; cv.height = w * 0.75; paintRef.current(); };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // If a save lost a race with someone's guess, send my strokes again once the latest state arrives.
  useEffect(() => {
    if (!iDraw) return;
    const saved = new Map(state.strokes.map((x) => [x.id, x.p.length]));
    const missing = [...mine.current.values()].some((x) => saved.get(x.id) !== x.p.length);
    if (missing) { const t = setTimeout(() => setPending((n) => n + 1), 0); return () => clearTimeout(t); }
  }, [state.strokes, iDraw]);

  // Save my strokes (merged with whatever is saved already) a couple of times a second while drawing.
  useEffect(() => {
    if (!iDraw || !canMove || !pending) return;
    const t = setTimeout(() => {
      const { state: s, onMove: move } = latest.current;
      const ids = new Set(mine.current.keys());
      move({ ...s, strokes: [...s.strokes.filter((x) => !ids.has(x.id)), ...mine.current.values()] });
      setPending(0);
    }, 450);
    return () => clearTimeout(t);
  }, [pending, iDraw, canMove]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 750)];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!iDraw || state.over) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s: Stroke = { id: `${me}-${clock().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, c: color, w: size, p: point(e) };
    drawing.current = s; mine.current.set(s.id, s); setPending((n) => n + 1);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = drawing.current;
    if (!s) return;
    const [x, y] = point(e);
    const lx = s.p[s.p.length - 2], ly = s.p[s.p.length - 1];
    if (Math.hypot(x - lx, y - ly) < 6) return;
    const next = { ...s, p: [...s.p, x, y] };
    drawing.current = next; mine.current.set(s.id, next); setPending((n) => n + 1);
  };
  const up = () => { drawing.current = null; };
  const clear = () => { mine.current = new Map(); onMove({ ...state, strokes: [] }); };

  // ---- the artist ends the round when time's up or everyone has guessed (once per round; the
  // timers only depend on whether the round is due, not on the ticking clock)
  const allIn = everyoneGuessed(state);
  const due = !state.over && (elapsed >= DURATION || (allIn && elapsed > 1500));
  useEffect(() => {
    if (!iDraw || aiDraws || !due) return;
    const round = state.round;
    const t = setTimeout(() => {
      const cur = latest.current.state;
      if (cur.round === round && !cur.over) latest.current.onMove(nextRound(cur));
    }, allIn ? 1500 : 0);
    return () => clearTimeout(t);
  }, [iDraw, aiDraws, due, allIn, state.round]);
  // If the artist has gone quiet, anyone can move the game on after the round runs out.
  const stale = !state.over && elapsed >= DURATION + 5000;
  useEffect(() => {
    if (iDraw || aiDraws || !stale) return;
    const t = setTimeout(() => latest.current.onFinish?.(-1), Math.random() * 1500);
    return () => clearTimeout(t);
  }, [iDraw, aiDraws, stale, state.round]);

  // ---- computer guessers (games against the computer)
  useEffect(() => {
    if (state.over) return;
    for (let seat = 0; seat < seats.length; seat++) {
      if (!seats[seat].ai || seat === drawer || state.guessed[seat] !== null) continue;
      const at = aiGuessAt(state, seat);
      // They need something to look at when it's your turn to draw.
      if (at !== null && elapsed >= at && (aiDraws || state.strokes.length >= 2)) {
        latest.current.onMove(finish(state, seat, pointsAt(at)));
        return;
      }
    }
  }, [elapsed, seats, drawer, state, aiDraws]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const g = norm(guess);
    if (!g || iDraw || state.guessed[me] !== null) return;
    setGuess("");
    if (g === norm(word)) { onFinish?.(pointsAt(elapsed)); setNote(`🎉 Got it! +${pointsAt(elapsed)}`); }
    else setNote(nearly(g, norm(word)) ? "😮 So close!" : `❌ Not "${guess.trim()}"`);
  };

  // The word as blanks, with letters revealed as time runs down.
  const reveal = elapsed > DURATION * 0.75 ? 2 : elapsed > DURATION * 0.5 ? 1 : 0;
  const hint = word.split("").map((ch, i) => (ch === " " ? "  " : iDraw || state.guessed[me] !== null || i < reveal ? ch : "_")).join(" ");

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-2.5">
        <span className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${left <= 10 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{left}</span>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Round {state.round + 1}/{state.rounds} · {iDraw ? "you're drawing" : `${shown[drawer]} is drawing`}</div>
          <div className="font-mono font-black text-xl sm:text-2xl tracking-wider text-slate-900">{iDraw ? `Draw: ${word}` : hint}</div>
        </div>
      </div>

      <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className={`w-full aspect-[4/3] rounded-2xl border-4 border-amber-200 bg-white shadow-lg touch-none ${iDraw ? "cursor-crosshair" : ""}`} />

      {iDraw ? (
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label={c === "#ffffff" ? "Eraser" : `Colour ${c}`} className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-slate-900 scale-110" : "border-slate-200"}`} style={{ background: c }}>{c === "#ffffff" ? "🧽" : ""}</button>)}
          <span className="w-px h-8 bg-slate-200 mx-1" />
          {SIZES.map((w) => <button key={w} onClick={() => setSize(w)} aria-label={`Brush ${w}`} className={`w-9 h-9 rounded-full flex items-center justify-center ${size === w ? "bg-slate-900" : "bg-slate-100"}`}><span className="rounded-full" style={{ width: w / 2 + 3, height: w / 2 + 3, background: size === w ? "#fff" : "#334155" }} /></button>)}
          <button onClick={clear} className="ml-auto h-9 px-3 rounded-full bg-rose-50 text-rose-600 text-xs font-black">Clear</button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input value={guess} onChange={(e) => setGuess(e.target.value)} disabled={state.guessed[me] !== null} maxLength={40} autoComplete="off"
            placeholder={state.guessed[me] !== null ? "You got it! Wait for the others…" : "Type your guess…"} className="flex-1 h-12 rounded-xl border border-slate-200 px-3 text-base" />
          <button disabled={!guess.trim() || state.guessed[me] !== null} className="h-12 px-5 rounded-xl bg-amber-500 text-white font-black disabled:opacity-40">Guess</button>
        </form>
      )}
      {note && <p className="text-center text-sm font-bold">{note}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.scores.map((sc, s) => (
          <div key={s} className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between ${s === drawer ? "bg-amber-100" : state.guessed[s] !== null ? "bg-emerald-100" : "bg-slate-100"}`}>
            <span className="truncate">{s === drawer ? "✏️ " : state.guessed[s] !== null ? "✅ " : ""}{shown[s]}</span>
            <span className="font-mono">{sc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const draw: GameModule<DrawState> = { init, turnOf, ai, finish, delay, result, Board };
