"use client";

// Classic Tetris: Rotate and drop falling tetromino blocks (I, J, L, O, S, T, Z)
// to fill complete horizontal lines. Clear lines to score points and advance levels.
// Features ghost piece landing projection, hold slot, next preview, and hard drop!

import { useEffect, useRef, useState, useCallback } from "react";
import { seeded } from "@/lib/games/rooms";
import { arcadeAudio } from "./arcadeAudio";
import type { BoardProps, GameModule } from "./types";

export interface TetrisState {
  seed: number;
  scores: (number | null)[];
}

const COLS = 10;
const ROWS = 20;

// Tetromino Shapes [rotations][row][col]
type Matrix = number[][];

interface TetrominoDef {
  name: string;
  color: string;
  border: string;
  glow: string;
  shapes: Matrix[];
}

const TETROMINOES: Record<number, TetrominoDef> = {
  1: {
    name: "I",
    color: "bg-cyan-400",
    border: "border-cyan-200",
    glow: "shadow-[0_0_8px_#22d3ee]",
    shapes: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    ],
  },
  2: {
    name: "O",
    color: "bg-yellow-400",
    border: "border-yellow-200",
    glow: "shadow-[0_0_8px_#facc15]",
    shapes: [
      [[2, 2], [2, 2]],
    ],
  },
  3: {
    name: "T",
    color: "bg-purple-500",
    border: "border-purple-300",
    glow: "shadow-[0_0_8px_#c084fc]",
    shapes: [
      [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
      [[0, 3, 0], [0, 3, 3], [0, 3, 0]],
      [[0, 0, 0], [3, 3, 3], [0, 3, 0]],
      [[0, 3, 0], [3, 3, 0], [0, 3, 0]],
    ],
  },
  4: {
    name: "S",
    color: "bg-green-500",
    border: "border-green-300",
    glow: "shadow-[0_0_8px_#4ade80]",
    shapes: [
      [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
      [[0, 4, 0], [0, 4, 4], [0, 0, 4]],
      [[0, 0, 0], [0, 4, 4], [4, 4, 0]],
      [[4, 0, 0], [4, 4, 0], [0, 4, 0]],
    ],
  },
  5: {
    name: "Z",
    color: "bg-rose-500",
    border: "border-rose-300",
    glow: "shadow-[0_0_8px_#f87171]",
    shapes: [
      [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
      [[0, 0, 5], [0, 5, 5], [0, 5, 0]],
      [[0, 0, 0], [5, 5, 0], [0, 5, 5]],
      [[0, 5, 0], [5, 5, 0], [5, 0, 0]],
    ],
  },
  6: {
    name: "J",
    color: "bg-blue-600",
    border: "border-blue-300",
    glow: "shadow-[0_0_8px_#60a5fa]",
    shapes: [
      [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
      [[0, 6, 6], [0, 6, 0], [0, 6, 0]],
      [[0, 0, 0], [6, 6, 6], [0, 0, 6]],
      [[0, 6, 0], [0, 6, 0], [6, 6, 0]],
    ],
  },
  7: {
    name: "L",
    color: "bg-orange-500",
    border: "border-orange-300",
    glow: "shadow-[0_0_8px_#fb923c]",
    shapes: [
      [[0, 0, 7], [7, 7, 7], [0, 0, 0]],
      [[0, 7, 0], [0, 7, 0], [0, 7, 7]],
      [[0, 0, 0], [7, 7, 7], [7, 0, 0]],
      [[7, 7, 0], [0, 7, 0], [0, 7, 0]],
    ],
  },
};

const init = (seats: number, seed: number): TetrisState => ({
  seed,
  scores: Array(seats).fill(null),
});

function finish(s: TetrisState, seat: number, score: number): TetrisState {
  const scores = s.scores.slice();
  scores[seat] = score;
  return { ...s, scores };
}

function ai(s: TetrisState, seat: number): TetrisState {
  const r = seeded(s.seed + seat * 83);
  // Competitive AI scores between 2,200 and 5,800 points
  const aiScore = Math.round(220 + r() * 360) * 10;
  return finish(s, seat, aiScore);
}

function result(s: TetrisState) {
  if (s.scores.some((x) => x === null)) return null;
  const v = s.scores as number[];
  const best = Math.max(...v);
  const w = v.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
  return { winners: w.length === v.length && v.length > 1 ? [] : w, scores: v };
}

interface Piece {
  type: number;
  rotation: number;
  x: number;
  y: number;
}

function Board({ state, me, onFinish }: BoardProps<TetrisState>) {
  const [board, setBoard] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );

  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<number>(1);
  const [holdPieceType, setHoldPieceType] = useState<number | null>(null);
  const [canHold, setCanHold] = useState(true);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isOver, setIsOver] = useState(false);
  const [clearedLineAlert, setClearedLineAlert] = useState<string | null>(null);

  const rand = useRef(seeded(state.seed));
  const bag = useRef<number[]>([]);
  const report = useRef(onFinish);
  useEffect(() => { report.current = onFinish; });
  const done = state.scores[me] !== null;

  // 7-Bag randomizer
  const getNextFromBag = useCallback((): number => {
    if (bag.current.length === 0) {
      const newBag = [1, 2, 3, 4, 5, 6, 7];
      // Fisher-Yates shuffle
      for (let i = newBag.length - 1; i > 0; i--) {
        const j = Math.floor(rand.current() * (i + 1));
        [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
      }
      bag.current = newBag;
    }
    return bag.current.pop()!;
  }, []);

  // Check collision between a piece and the board
  const checkCollision = useCallback((piece: Piece, testBoard: number[][]): boolean => {
    const shape = TETROMINOES[piece.type].shapes[piece.rotation % TETROMINOES[piece.type].shapes.length];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const boardX = piece.x + c;
          const boardY = piece.y + r;
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return true;
          }
          if (boardY >= 0 && testBoard[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Spawn new piece
  const spawnPiece = useCallback((typeToSpawn?: number): boolean => {
    const type = typeToSpawn ?? nextPieceType;
    const nextType = getNextFromBag();
    setNextPieceType(nextType);

    const initialPiece: Piece = {
      type,
      rotation: 0,
      x: type === 2 ? 4 : 3, // O piece is 2 wide
      y: 0,
    };

    if (checkCollision(initialPiece, board)) {
      setIsOver(true);
      return false;
    }

    setCurrentPiece(initialPiece);
    setCanHold(true);
    return true;
  }, [nextPieceType, getNextFromBag, checkCollision, board]);

  // Initial setup
  useEffect(() => {
    const first = getNextFromBag();
    const second = getNextFromBag();
    setNextPieceType(second);
    setCurrentPiece({
      type: first,
      rotation: 0,
      x: first === 2 ? 4 : 3,
      y: 0,
    });
  }, [getNextFromBag]);

  // Lock piece, clear lines, and advance level
  const lockPiece = useCallback((pieceToLock: Piece) => {
    arcadeAudio.playTetrisDrop();
    const nextBoard = board.map((row) => row.slice());
    const shape = TETROMINOES[pieceToLock.type].shapes[pieceToLock.rotation % TETROMINOES[pieceToLock.type].shapes.length];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const boardY = pieceToLock.y + r;
          const boardX = pieceToLock.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            nextBoard[boardY][boardX] = pieceToLock.type;
          }
        }
      }
    }

    // Check full horizontal lines
    let fullRows = 0;
    const filteredBoard: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      if (nextBoard[r].every((cell) => cell !== 0)) {
        fullRows++;
      } else {
        filteredBoard.push(nextBoard[r]);
      }
    }

    // Add empty rows on top
    while (filteredBoard.length < ROWS) {
      filteredBoard.unshift(Array(COLS).fill(0));
    }

    if (fullRows > 0) {
      if (fullRows === 4) {
        arcadeAudio.playTetrisFanfare();
        setClearedLineAlert("TETRIS! +800");
      } else {
        arcadeAudio.playLineClear();
        setClearedLineAlert(`+${fullRows * 100 * level}`);
      }
      setTimeout(() => setClearedLineAlert(null), 1000);

      // Scoring table
      const linePoints = [0, 100, 300, 500, 800][fullRows] * level;
      const newLines = lines + fullRows;
      const newLevel = Math.floor(newLines / 10) + 1;

      setScore((s) => s + linePoints);
      setLines(newLines);
      setLevel(newLevel);
    }

    setBoard(filteredBoard);

    // Spawn next piece
    const spawned = spawnPiece();
    if (!spawned) {
      setIsOver(true);
      setTimeout(() => {
        report.current?.(score);
      }, 1000);
    }
  }, [board, lines, level, score, spawnPiece]);

  // Calculate Ghost position (where piece lands if hard dropped)
  const getGhostY = useCallback((): number => {
    if (!currentPiece) return 0;
    let ghostY = currentPiece.y;
    while (!checkCollision({ ...currentPiece, y: ghostY + 1 }, board)) {
      ghostY++;
    }
    return ghostY;
  }, [currentPiece, board, checkCollision]);

  // Movement & Rotation Controls
  const moveSideways = useCallback((dx: number) => {
    if (!currentPiece || isOver || done) return;
    const testPiece: Piece = { ...currentPiece, x: currentPiece.x + dx };
    if (!checkCollision(testPiece, board)) {
      arcadeAudio.playTetrisMove();
      setCurrentPiece(testPiece);
    }
  }, [currentPiece, isOver, done, checkCollision, board]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || isOver || done) return;
    arcadeAudio.playTetrisRotate();
    const shapes = TETROMINOES[currentPiece.type].shapes;
    const newRot = (currentPiece.rotation + 1) % shapes.length;

    // Standard wall kick attempts: 0, -1, +1, -2, +2
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      const testPiece: Piece = { ...currentPiece, rotation: newRot, x: currentPiece.x + kick };
      if (!checkCollision(testPiece, board)) {
        setCurrentPiece(testPiece);
        return;
      }
    }
  }, [currentPiece, isOver, done, checkCollision, board]);

  const softDrop = useCallback(() => {
    if (!currentPiece || isOver || done) return;
    const testPiece: Piece = { ...currentPiece, y: currentPiece.y + 1 };
    if (!checkCollision(testPiece, board)) {
      setCurrentPiece(testPiece);
      setScore((s) => s + 1); // Soft drop bonus
    } else {
      lockPiece(currentPiece);
    }
  }, [currentPiece, isOver, done, checkCollision, board, lockPiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || isOver || done) return;
    const ghostY = getGhostY();
    const dropDistance = ghostY - currentPiece.y;
    const droppedPiece: Piece = { ...currentPiece, y: ghostY };
    setScore((s) => s + dropDistance * 2); // Hard drop bonus
    lockPiece(droppedPiece);
  }, [currentPiece, isOver, done, getGhostY, lockPiece]);

  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || isOver || done) return;
    arcadeAudio.playTetrisMove();
    setCanHold(false);

    if (holdPieceType === null) {
      setHoldPieceType(currentPiece.type);
      spawnPiece();
    } else {
      const prevHold = holdPieceType;
      setHoldPieceType(currentPiece.type);
      const newPiece: Piece = {
        type: prevHold,
        rotation: 0,
        x: prevHold === 2 ? 4 : 3,
        y: 0,
      };
      setCurrentPiece(newPiece);
    }
  }, [currentPiece, canHold, isOver, done, holdPieceType, spawnPiece]);

  // Gravity fall timer
  useEffect(() => {
    if (!currentPiece || isOver || done) return;
    // Speed decreases as level increases (800ms down to 100ms)
    const speed = Math.max(100, 800 - (level - 1) * 65);
    const interval = setInterval(() => {
      softDrop();
    }, speed);
    return () => clearInterval(interval);
  }, [currentPiece, isOver, done, level, softDrop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOver || done) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          moveSideways(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          moveSideways(1);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          rotatePiece();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          softDrop();
          break;
        case " ":
          hardDrop();
          break;
        case "c":
        case "C":
        case "Shift":
          holdPiece();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveSideways, rotatePiece, softDrop, hardDrop, holdPiece, isOver, done]);

  interface DisplayCell {
    color: string;
    border: string;
    glow: string;
    isGhost?: boolean;
  }

  // Render composite display board with ghost piece and active piece
  const renderBoard = (): DisplayCell[][] => {
    const display: DisplayCell[][] = board.map((row) =>
      row.map((cell) => {
        if (cell !== 0 && TETROMINOES[cell]) {
          return {
            color: TETROMINOES[cell].color,
            border: TETROMINOES[cell].border,
            glow: TETROMINOES[cell].glow,
          };
        }
        return { color: "bg-slate-950/60", border: "border-white/5", glow: "" };
      })
    );

    if (currentPiece) {
      // Draw Ghost Piece
      const ghostY = getGhostY();
      const ghostShape = TETROMINOES[currentPiece.type].shapes[currentPiece.rotation % TETROMINOES[currentPiece.type].shapes.length];
      for (let r = 0; r < ghostShape.length; r++) {
        for (let c = 0; c < ghostShape[r].length; c++) {
          if (ghostShape[r][c] !== 0) {
            const gy = ghostY + r;
            const gx = currentPiece.x + c;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS && display[gy][gx].color === "bg-slate-950/60") {
              display[gy][gx] = {
                color: "bg-white/10",
                border: "border-white/40 border-dashed",
                glow: "",
                isGhost: true,
              };
            }
          }
        }
      }

      // Draw Active Piece
      const shape = TETROMINOES[currentPiece.type].shapes[currentPiece.rotation % TETROMINOES[currentPiece.type].shapes.length];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const py = currentPiece.y + r;
            const px = currentPiece.x + c;
            if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
              display[py][px] = {
                color: TETROMINOES[currentPiece.type].color,
                border: TETROMINOES[currentPiece.type].border,
                glow: TETROMINOES[currentPiece.type].glow,
              };
            }
          }
        }
      }
    }

    return display;
  };

  const displayGrid = renderBoard();

  if (done) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-cyan-950/40 border border-cyan-500/30 text-center space-y-2">
        <div className="text-4xl">🕹️</div>
        <h3 className="text-xl font-black text-cyan-300">Run Complete!</h3>
        <p className="font-mono text-2xl font-black text-amber-300">{state.scores[me]} pts</p>
        <p className="text-xs text-slate-400">
          {state.scores.length === 1 ? "Locking in your high score…" : "Waiting for other players to lock in their scores…"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[min(94vw,440px)] mx-auto space-y-3 select-none pb-4">
      {/* Top HUD: Score, Lines, Level, Hold, Next Preview */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-900 border border-white/10 shadow-xl text-center text-xs">
        {/* Hold Box */}
        <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hold</div>
          <div className="h-8 flex items-center justify-center">
            {holdPieceType ? (
              <span className="font-black text-xs text-amber-300">{TETROMINOES[holdPieceType].name}</span>
            ) : (
              <span className="text-slate-600 text-xs">—</span>
            )}
          </div>
        </div>

        {/* Score & Level */}
        <div className="p-2 rounded-xl bg-gradient-to-b from-cyan-950/60 to-slate-950 border border-cyan-500/30 space-y-0.5">
          <div className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Score</div>
          <div className="font-mono text-base font-black text-white leading-tight">{score.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-400">Level {level} · {lines} lines</div>
        </div>

        {/* Next Box */}
        <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Next</div>
          <div className="h-8 flex items-center justify-center">
            <span className="font-black text-xs text-cyan-300">{TETROMINOES[nextPieceType].name}</span>
          </div>
        </div>
      </div>

      {/* Tetris Board Matrix */}
      <div className="relative mx-auto w-[min(88vw,280px)] aspect-[10/20] rounded-2xl bg-slate-950 border-4 border-cyan-500/50 shadow-2xl p-1 overflow-hidden">
        <div className="grid grid-cols-10 grid-rows-20 gap-0.5 w-full h-full">
          {displayGrid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`w-full h-full rounded-sm border ${cell.border} ${cell.color} ${cell.glow} transition-colors duration-75`}
              />
            ))
          )}
        </div>

        {/* Line Clear Banner Popup */}
        {clearedLineAlert && (
          <div className="absolute inset-x-0 top-1/3 py-2 bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 text-slate-950 text-center font-black text-base shadow-lg animate-bounce tracking-widest uppercase">
            {clearedLineAlert}
          </div>
        )}

        {/* Game Over Screen */}
        {isOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">💀</span>
            <div className="text-lg font-black text-rose-400 tracking-wider">GAME OVER</div>
            <div className="font-mono text-xl font-black text-amber-300">{score.toLocaleString()} PTS</div>
            <div className="text-[11px] text-slate-400">Submitting final arcade score…</div>
          </div>
        )}
      </div>

      {/* Responsive Touch Controls for Mobile */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-5 gap-1.5 max-w-[min(90vw,340px)] mx-auto">
          {/* Hold */}
          <button
            onClick={holdPiece}
            disabled={!canHold || isOver}
            className="h-11 rounded-xl bg-white/10 active:bg-white/20 border border-white/10 text-xs font-black flex items-center justify-center text-slate-300 disabled:opacity-30 shadow"
            aria-label="Hold Piece"
          >
            HOLD
          </button>

          {/* Left */}
          <button
            onClick={() => moveSideways(-1)}
            disabled={isOver}
            className="h-11 rounded-xl bg-slate-800 active:bg-slate-700 border border-white/20 text-base font-black flex items-center justify-center text-white shadow"
            aria-label="Move Left"
          >
            ◀
          </button>

          {/* Rotate */}
          <button
            onClick={rotatePiece}
            disabled={isOver}
            className="h-11 rounded-xl bg-cyan-600 active:bg-cyan-500 border border-cyan-400 text-base font-black flex items-center justify-center text-white shadow shadow-cyan-600/40"
            aria-label="Rotate"
          >
            ↻
          </button>

          {/* Right */}
          <button
            onClick={() => moveSideways(1)}
            disabled={isOver}
            className="h-11 rounded-xl bg-slate-800 active:bg-slate-700 border border-white/20 text-base font-black flex items-center justify-center text-white shadow"
            aria-label="Move Right"
          >
            ▶
          </button>

          {/* Hard Drop */}
          <button
            onClick={hardDrop}
            disabled={isOver}
            className="h-11 rounded-xl bg-amber-500 active:bg-amber-400 border border-amber-300 text-xs font-black flex items-center justify-center text-slate-950 shadow shadow-amber-500/40"
            aria-label="Hard Drop"
          >
            DROP
          </button>
        </div>

        {/* Soft Drop button */}
        <div className="max-w-[min(90vw,340px)] mx-auto">
          <button
            onClick={softDrop}
            disabled={isOver}
            className="w-full h-10 rounded-xl bg-white/5 active:bg-white/15 border border-white/10 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 shadow"
          >
            <span>▼ Soft Drop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const tetris: GameModule<TetrisState> = { init, ai, finish, result, Board };
