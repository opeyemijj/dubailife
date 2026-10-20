"use client";

// Candy Crush (Candy Match): Swap adjacent candies to match 3 or more in a row or column.
// Match 4 to create a Striped Candy that clears a row or column.
// Match 5 to create a Rainbow Color Bomb that clears all candies of a chosen color!
// 25 moves to rack up the highest score with cascades and sweet combos!

import { useEffect, useRef, useState, useCallback } from "react";
import { seeded } from "@/lib/games/rooms";
import { arcadeAudio } from "./arcadeAudio";
import type { BoardProps, GameModule } from "./types";

export interface CandyState {
  seed: number;
  scores: (number | null)[];
}

const ROWS = 8;
const COLS = 8;
const MAX_MOVES = 25;

export interface CandyCell {
  id: number;
  color: number; // 0 to 5
  special?: "striped-h" | "striped-v" | "color-bomb" | "wrapped";
}

const CANDY_THEMES = [
  { name: "Strawberry", color: "#ef4444", bg: "from-red-500 to-rose-600", border: "#f87171", icon: "🍓" },
  { name: "Lemon", color: "#eab308", bg: "from-amber-400 to-yellow-500", border: "#fde047", icon: "🍋" },
  { name: "Lime", color: "#22c55e", bg: "from-green-500 to-emerald-600", border: "#86efac", icon: "🍏" },
  { name: "Berry", color: "#3b82f6", bg: "from-blue-500 to-indigo-600", border: "#93c5fd", icon: "🫐" },
  { name: "Grape", color: "#a855f7", bg: "from-purple-500 to-fuchsia-600", border: "#d8b4fe", icon: "🍇" },
  { name: "Orange", color: "#f97316", bg: "from-orange-500 to-amber-600", border: "#fdba74", icon: "🍊" },
];

const init = (seats: number, seed: number): CandyState => ({
  seed,
  scores: Array(seats).fill(null),
});

function finish(s: CandyState, seat: number, score: number): CandyState {
  const scores = s.scores.slice();
  scores[seat] = score;
  return { ...s, scores };
}

function ai(s: CandyState, seat: number): CandyState {
  const r = seeded(s.seed + seat * 71);
  // Competitive AI scores between 2,800 and 6,200 points
  const aiScore = Math.round(280 + r() * 340) * 10;
  return finish(s, seat, aiScore);
}

function result(s: CandyState) {
  if (s.scores.some((x) => x === null)) return null;
  const v = s.scores as number[];
  const best = Math.max(...v);
  const w = v.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
  return { winners: w.length === v.length && v.length > 1 ? [] : w, scores: v };
}

function Board({ state, me, onFinish }: BoardProps<CandyState>) {
  const [grid, setGrid] = useState<CandyCell[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [comboText, setComboText] = useState<{ text: string; key: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const nextId = useRef(1);
  const rand = useRef(seeded(state.seed));
  const report = useRef(onFinish);
  useEffect(() => { report.current = onFinish; });
  const done = state.scores[me] !== null;

  const getRandomColor = useCallback((): number => {
    return Math.floor(rand.current() * CANDY_THEMES.length);
  }, []);

  // Initialize board without initial match-3s
  const createInitialBoard = useCallback((): CandyCell[][] => {
    const board: CandyCell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        let color: number;
        do {
          color = getRandomColor();
        } while (
          (r >= 2 && board[r - 1][c].color === color && board[r - 2][c].color === color) ||
          (c >= 2 && board[r][c - 1].color === color && board[r][c - 2].color === color)
        );
        board[r][c] = { id: nextId.current++, color };
      }
    }
    return board;
  }, [getRandomColor]);

  useEffect(() => {
    setGrid(createInitialBoard());
  }, [createInitialBoard]);

  // Find all horizontal & vertical matches
  const findMatches = (currentGrid: CandyCell[][]) => {
    const matchedCoords = new Set<string>();
    const runs: { coords: [number, number][]; color: number; isHorizontal: boolean }[] = [];

    // Horizontal check
    for (let r = 0; r < ROWS; r++) {
      let runColor = -1;
      let runStart = 0;
      let runLen = 0;
      for (let c = 0; c < COLS; c++) {
        const color = currentGrid[r][c]?.color;
        if (color !== undefined && color === runColor && color >= 0) {
          runLen++;
        } else {
          if (runLen >= 3) {
            const coords: [number, number][] = [];
            for (let i = runStart; i < runStart + runLen; i++) {
              coords.push([r, i]);
              matchedCoords.add(`${r},${i}`);
            }
            runs.push({ coords, color: runColor, isHorizontal: true });
          }
          runColor = color;
          runStart = c;
          runLen = 1;
        }
      }
      if (runLen >= 3) {
        const coords: [number, number][] = [];
        for (let i = runStart; i < runStart + runLen; i++) {
          coords.push([r, i]);
          matchedCoords.add(`${r},${i}`);
        }
        runs.push({ coords, color: runColor, isHorizontal: true });
      }
    }

    // Vertical check
    for (let c = 0; c < COLS; c++) {
      let runColor = -1;
      let runStart = 0;
      let runLen = 0;
      for (let r = 0; r < ROWS; r++) {
        const color = currentGrid[r][c]?.color;
        if (color !== undefined && color === runColor && color >= 0) {
          runLen++;
        } else {
          if (runLen >= 3) {
            const coords: [number, number][] = [];
            for (let i = runStart; i < runStart + runLen; i++) {
              coords.push([i, c]);
              matchedCoords.add(`${i},${c}`);
            }
            runs.push({ coords, color: runColor, isHorizontal: false });
          }
          runColor = color;
          runStart = r;
          runLen = 1;
        }
      }
      if (runLen >= 3) {
        const coords: [number, number][] = [];
        for (let i = runStart; i < runStart + runLen; i++) {
          coords.push([i, c]);
          matchedCoords.add(`${i},${c}`);
        }
        runs.push({ coords, color: runColor, isHorizontal: false });
      }
    }

    return { matchedCoords, runs };
  };

  // Process cascades recursively
  const processCascades = useCallback(async (initialGrid: CandyCell[][], comboLevel = 1): Promise<{ finalGrid: CandyCell[][]; points: number }> => {
    let currentGrid = initialGrid.map((row) => row.slice());
    let totalPoints = 0;
    let stepCombo = comboLevel;

    while (true) {
      const { matchedCoords, runs } = findMatches(currentGrid);
      if (matchedCoords.size === 0) break;

      // Calculate score for this match cascade
      const basePoints = matchedCoords.size * 30 * stepCombo;
      totalPoints += basePoints;

      // Sound and visual combo text
      arcadeAudio.playComboChime(stepCombo);
      if (stepCombo >= 2) {
        const phrases = ["Sweet!", "Tasty!", "Delicious!", "Sugar Crush!", "Divine!"];
        const text = phrases[Math.min(stepCombo - 2, phrases.length - 1)];
        setComboText({ text: `${text} (${stepCombo}x)`, key: Date.now() });
      }

      // Check special candy creations (4-in-a-row -> striped, 5-in-a-row -> color bomb)
      const specialsToCreate: { r: number; c: number; special: "striped-h" | "striped-v" | "color-bomb"; color: number }[] = [];
      for (const run of runs) {
        if (run.coords.length === 4) {
          const mid = run.coords[1];
          specialsToCreate.push({
            r: mid[0],
            c: mid[1],
            special: run.isHorizontal ? "striped-v" : "striped-h",
            color: run.color,
          });
        } else if (run.coords.length >= 5) {
          const mid = run.coords[2];
          specialsToCreate.push({
            r: mid[0],
            c: mid[1],
            special: "color-bomb",
            color: -1, // Rainbow
          });
        }
      }

      // Mark matched cells as destroyed (-1)
      const nextGrid: CandyCell[][] = currentGrid.map((row) => row.slice());
      matchedCoords.forEach((coord) => {
        const [r, c] = coord.split(",").map(Number);
        // If cell had a special, trigger secondary explosions!
        const cell = nextGrid[r][c];
        if (cell.special === "striped-h") {
          arcadeAudio.playExplosion();
          for (let colIdx = 0; colIdx < COLS; colIdx++) matchedCoords.add(`${r},${colIdx}`);
        } else if (cell.special === "striped-v") {
          arcadeAudio.playExplosion();
          for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) matchedCoords.add(`${rowIdx},${c}`);
        } else if (cell.special === "color-bomb") {
          arcadeAudio.playExplosion();
          // Clear random color
          const targetColor = Math.floor(rand.current() * 6);
          for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
              if (nextGrid[i][j].color === targetColor) matchedCoords.add(`${i},${j}`);
            }
          }
        }
        nextGrid[r][c] = { id: 0, color: -1 };
      });

      // Gravity: drop candies down column by column
      for (let c = 0; c < COLS; c++) {
        let writeRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (nextGrid[r][c].color !== -1) {
            nextGrid[writeRow][c] = nextGrid[r][c];
            if (writeRow !== r) {
              nextGrid[r][c] = { id: 0, color: -1 };
            }
            writeRow--;
          }
        }
        // Fill top empty cells with new candies
        while (writeRow >= 0) {
          nextGrid[writeRow][c] = {
            id: nextId.current++,
            color: getRandomColor(),
          };
          writeRow--;
        }
      }

      // Place newly created specials
      for (const sp of specialsToCreate) {
        nextGrid[sp.r][sp.c] = {
          id: nextId.current++,
          color: sp.color,
          special: sp.special,
        };
      }

      currentGrid = nextGrid;
      stepCombo++;
      // Brief delay for visual cascade pacing
      await new Promise((resolve) => setTimeout(resolve, 180));
      setGrid(currentGrid.map((row) => row.slice()));
    }

    return { finalGrid: currentGrid, points: totalPoints };
  }, [getRandomColor]);

  // Handle candy selection and swapping
  const handleCellClick = async (r: number, c: number) => {
    if (animating || movesLeft <= 0 || isOver || done) return;

    if (!selected) {
      arcadeAudio.playCandyPop(1);
      setSelected([r, c]);
      return;
    }

    const [sr, sc] = selected;
    // Check adjacency (up, down, left, right)
    const isAdjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;

    if (!isAdjacent) {
      if (sr === r && sc === c) {
        setSelected(null);
      } else {
        arcadeAudio.playCandyPop(1);
        setSelected([r, c]);
      }
      return;
    }

    // Attempt Swap
    setSelected(null);
    setAnimating(true);
    arcadeAudio.playCandyPop(1.3);

    const testGrid = grid.map((row) => row.slice());
    const temp = testGrid[sr][sc];
    testGrid[sr][sc] = testGrid[r][c];
    testGrid[r][c] = temp;

    // Check if swap involves a color bomb
    const isColorBombSwap = temp.special === "color-bomb" || testGrid[sr][sc].special === "color-bomb";

    const { matchedCoords } = findMatches(testGrid);

    if (matchedCoords.size > 0 || isColorBombSwap) {
      // Valid move!
      setGrid(testGrid);
      const newMoves = movesLeft - 1;
      setMovesLeft(newMoves);

      const { finalGrid, points } = await processCascades(testGrid, 1);
      const finalScore = score + points;
      setScore(finalScore);
      setGrid(finalGrid);

      // Check if out of moves
      if (newMoves <= 0) {
        setIsOver(true);
        setTimeout(() => {
          report.current?.(finalScore);
        }, 1200);
      }
    } else {
      // Invalid swap: brief wiggle back
      setGrid(testGrid);
      setTimeout(() => {
        const revertGrid = grid.map((row) => row.slice());
        setGrid(revertGrid);
      }, 200);
    }

    setAnimating(false);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-pink-950/40 border border-pink-500/30 text-center space-y-2">
        <div className="text-4xl">🍬</div>
        <h3 className="text-xl font-black text-pink-300">Run Finished!</h3>
        <p className="font-mono text-2xl font-black text-amber-300">{state.scores[me]} pts</p>
        <p className="text-xs text-slate-400">
          {state.scores.length === 1 ? "Locking in your high score…" : "Waiting for other players to finish their sugar cascades…"}
        </p>
      </div>
    );
  }

  // Star goals: 1500, 3500, 6000
  const starCount = score >= 6000 ? 3 : score >= 3500 ? 2 : score >= 1500 ? 1 : 0;
  const progressPct = Math.min(100, Math.round((score / 6000) * 100));

  return (
    <div className="max-w-[min(94vw,460px)] mx-auto space-y-3 select-none pb-4">
      {/* Top Status Bar: Moves, Score, Star Progress */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/80 via-purple-950/80 to-slate-900 border border-pink-500/30 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍬</span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-pink-300">Candy Crush</div>
              <div className="text-lg font-black text-white leading-none font-mono">{score.toLocaleString()} pts</div>
            </div>
          </div>

          {/* Moves Badge */}
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Moves Left</div>
            <div className={`text-xl font-black font-mono leading-none ${movesLeft <= 5 ? "text-rose-400 animate-pulse" : "text-amber-300"}`}>
              {movesLeft}
            </div>
          </div>
        </div>

        {/* 3-Star Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-black">
            <span className="text-slate-400 flex items-center gap-1">
              <span>Goal: 6,000</span>
            </span>
            <div className="flex items-center gap-1">
              <span className={starCount >= 1 ? "text-amber-300 text-sm" : "text-slate-600 text-sm"}>★</span>
              <span className={starCount >= 2 ? "text-amber-300 text-sm" : "text-slate-600 text-sm"}>★</span>
              <span className={starCount >= 3 ? "text-amber-300 text-sm" : "text-slate-600 text-sm"}>★</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Floating Combo Callout */}
      {comboText && (
        <div
          key={comboText.key}
          className="text-center text-sm font-black text-pink-300 drop-shadow-[0_2px_8px_rgba(236,72,153,0.8)] animate-bounce"
        >
          ✨ {comboText.text} ✨
        </div>
      )}

      {/* 8x8 Interactive Candy Grid */}
      <div className="relative aspect-square p-2 rounded-3xl bg-slate-950/90 border-4 border-pink-500/40 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-8 grid-rows-8 gap-1.5 w-full h-full">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected && selected[0] === r && selected[1] === c;
              const theme = CANDY_THEMES[cell.color] ?? CANDY_THEMES[0];
              const isRainbow = cell.special === "color-bomb";

              return (
                <button
                  key={cell.id}
                  disabled={animating || movesLeft <= 0}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 select-none shadow-md ${
                    isRainbow
                      ? "bg-gradient-to-tr from-pink-500 via-yellow-400 to-cyan-400 animate-pulse border-2 border-white"
                      : `bg-gradient-to-br ${theme.bg} border-2 border-white/20`
                  } ${isSelected ? "ring-4 ring-white scale-105 z-10 brightness-125 shadow-lg shadow-pink-500/50" : "hover:brightness-110"}`}
                >
                  {/* Candy Icon */}
                  <span className="text-[min(4.8vw,22px)] leading-none drop-shadow">
                    {isRainbow ? "🍩" : theme.icon}
                  </span>

                  {/* Special Candy Overlay Badges */}
                  {cell.special === "striped-h" && (
                    <span className="absolute inset-x-0 h-1 bg-white/90 rounded-full shadow-[0_0_6px_#fff]" />
                  )}
                  {cell.special === "striped-v" && (
                    <span className="absolute inset-y-0 w-1 bg-white/90 rounded-full shadow-[0_0_6px_#fff]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Game Over / Sugar Crush Overlay */}
        {isOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-fade-in">
            <span className="text-4xl animate-bounce">🎉</span>
            <div className="text-xl font-black text-pink-300 tracking-wider">SUGAR CRUSH!</div>
            <div className="font-mono text-2xl font-black text-amber-300">{score.toLocaleString()} PTS</div>
            <div className="text-xs text-slate-300">Locking in final tournament score…</div>
          </div>
        )}
      </div>

      {/* Rules / Hint bar */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 text-center leading-relaxed">
        💡 <strong>How to play:</strong> Tap a candy, then tap an adjacent neighbor to swap. Match 4 for a Striped Candy or 5 for a Rainbow Donut!
      </div>
    </div>
  );
}

export const candy: GameModule<CandyState> = { init, ai, finish, result, Board };
