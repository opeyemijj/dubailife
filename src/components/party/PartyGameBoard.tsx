"use client";

// The party game in 3D, outside the house (src/lib/partyGames.ts): on a glass deck over the pool when the home
// has one, on a lawn when it doesn't, and on a terrace beside a flat. Players tap the board itself: a column of
// the giant Connect Four frame, a garden chess piece then its square, the big Ludo die then a glowing token, or
// drag back on the pool table's felt to shoot.
// Everyone else at the party sees the same board move.

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Chess, type Square } from "chess.js";
import { c4Rules, type C4State } from "@/components/games/ConnectFour";
import { ludoRules, type LudoState } from "@/components/games/Ludo";
import type { ChessState } from "@/components/games/ChessGame";
import { pool as poolGame, type PoolState } from "@/components/games/Pool";
import { PoolTable3D } from "./PoolTable3D";
import { resultText, turnOf, turnText, type PartyGameId, type PartyGameSnap } from "@/lib/partyGames";

/** Each side's colour on the board (the dot beside "Their turn"). */
const SIDE_COLOR: Record<PartyGameId, [string, string]> = { connect4: ["#dc2626", "#facc15"], chess: ["#f8f4ea", "#1c1917"], ludo: ["#dc2626", "#eab308"], pool: ["#16a34a", "#2563eb"] };
import { gameAudio } from "@/utils/gameAudio";

/** Where the board stands: the pool's spot, east of the house (HomeGrounds GROUNDS.pool). */
export const PARTY_BOARD_AT: [number, number] = [10.5, 1];

type Tap = (e: ThreeEvent<MouseEvent>) => boolean;
/** A tap, not the end of a drag; stops it reaching the floor (which would walk you there). */
const tapped: Tap = (e) => { if (e.delta > 6) return false; e.stopPropagation(); return true; };

export function PartyGameBoard({ snap, mySeat, onMove, pool, grounds, lightsOut, onIdleTap }: {
  snap: PartyGameSnap | null;
  mySeat: number;
  onMove: (state: unknown) => void;
  /** The home has a pool here: the deck is glass over the water. */
  pool: boolean;
  /** A villa or townhouse plot (there's already ground outside); otherwise a terrace is built for the game. */
  grounds: boolean;
  lightsOut?: boolean;
  /** No game on: an empty Connect Four frame stands outside as an invitation; tapping it opens the picker. */
  onIdleTap?: () => void;
}) {
  if (!snap) return onIdleTap ? <IdleBoard pool={pool} grounds={grounds} lightsOut={lightsOut} onTap={onIdleTap} /> : null;
  const turn = turnOf(snap);
  const canMove = mySeat >= 0 && turn === mySeat && !!snap.players[1];
  const result = resultText(snap, mySeat);
  return (
    <group position={[PARTY_BOARD_AT[0], 0, PARTY_BOARD_AT[1]]}>
      <Deck pool={pool} grounds={grounds} />
      {lightsOut && <pointLight position={[0, 4, 0]} intensity={14} distance={9} color="#fde68a" />}
      <group position={[0, pool ? 0.14 : 0.05, 0]}>
        {snap.game === "connect4" && <ConnectFour3D state={snap.state as C4State} canMove={canMove} onMove={onMove} />}
        {snap.game === "chess" && <Chess3D state={snap.state as ChessState} canMove={canMove} mySeat={mySeat} onMove={onMove} />}
        {snap.game === "ludo" && <Ludo3D state={snap.state as LudoState} canMove={canMove} mySeat={mySeat} onMove={onMove} />}
        {snap.game === "pool" && <PoolTable3D state={snap.state as PoolState} canMove={canMove} onMove={onMove} cover={pool} />}
      </group>
      {/* Over the board, for everyone: whose turn (yours / theirs, or the colour), then the result, big. */}
      <Html position={snap.game === "connect4" ? [0, 3.6, 0] : snap.game === "pool" ? [0, 3.1, 0] : [-1.2, 2.3, -1.2]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        {result ? (
          <div className={`whitespace-nowrap rounded-2xl px-4 py-2 text-[22px] font-black shadow-2xl ring-2 ${result.won ? "bg-amber-400 text-slate-950 ring-amber-200 animate-pulse" : "bg-slate-950/90 text-white ring-white/30"}`}>
            {result.icon} {result.title}
          </div>
        ) : (
          <div className={`whitespace-nowrap rounded-full px-3 py-1 text-[14px] font-black shadow-lg ${canMove ? "bg-emerald-500 text-emerald-950 animate-pulse" : "bg-slate-950/80 text-white"}`}>
            {turn !== null && <span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle ring-1 ring-white/60" style={{ background: SIDE_COLOR[snap.game][turn] }} />}
            {turnText(snap, mySeat)}
          </div>
        )}
      </Html>
    </group>
  );
}

const stopDom = (e: React.PointerEvent) => e.stopPropagation();

/** A racked table: the invitation looks ready to break. */
const IDLE_POOL = poolGame.init(2, 0) as PoolState;

/**
 * The invitation: a pool table outside, racked, with "Let's play" (any game can be picked). On a swimming pool
 * it stands crosswise on the far-end coping (the water stays free to swim in); otherwise on the lawn or terrace.
 */
function IdleBoard({ pool, grounds, lightsOut, onTap }: { pool: boolean; grounds: boolean; lightsOut?: boolean; onTap: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <group position={[PARTY_BOARD_AT[0], 0, PARTY_BOARD_AT[1]]}>
      {!pool && <Deck pool={false} grounds={grounds} />}
      {lightsOut && <pointLight position={[0, 4, pool ? -4.1 : 0]} intensity={10} distance={8} color="#fde68a" />}
      <group position={[0, 0.05, pool ? -4.1 : 0]} scale={hover ? 1.04 : 1}
        onClick={(e) => { if (!tapped(e)) return; gameAudio.playClickSound(); onTap(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
        <PoolTable3D state={IDLE_POOL} canMove={false} onMove={() => {}} crosswise={pool} />
      </group>
      <Html position={[0, 2.9, pool ? -4.1 : 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        {/* Its taps stop here: without this they'd also reach the 3D scene underneath and walk you to that spot. */}
        <button onClick={(e) => { e.stopPropagation(); onTap(); }} onPointerDown={stopDom} onPointerUp={stopDom}
          className="whitespace-nowrap rounded-full bg-fuchsia-600 px-4 py-1.5 text-[15px] font-black text-white shadow-2xl ring-2 ring-white/70 animate-bounce">
          🎲 Let&apos;s play a game
        </button>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------- the deck

const glass = new THREE.MeshPhysicalMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.32, roughness: 0.05, transmission: 0.6, thickness: 0.05 });

function Deck({ pool, grounds }: { pool: boolean; grounds: boolean }) {
  if (pool) {
    // Glass over the pool (4 × 8 m), on a steel frame at the coping.
    return (
      <group>
        <mesh position={[0, 0.1, 0]} material={glass} receiveShadow><boxGeometry args={[4.5, 0.06, 8.5]} /></mesh>
        {[-2.25, 2.25].map((x) => <mesh key={x} position={[x, 0.08, 0]}><boxGeometry args={[0.08, 0.1, 8.5]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>)}
        {[-4.25, 4.25].map((z) => <mesh key={z} position={[0, 0.08, z]}><boxGeometry args={[4.5, 0.1, 0.08]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>)}
      </group>
    );
  }
  return (
    <group>
      {/* A flat's terrace (decking, planters and a glass rail) or a lawn on the plot. */}
      {!grounds && <mesh position={[-1, -0.03, 0]} receiveShadow><boxGeometry args={[9, 0.12, 9.5]} /><meshStandardMaterial color="#c8a27a" roughness={0.85} /></mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color={grounds ? "#65a30d" : "#e7d3b5"} roughness={0.95} />
      </mesh>
      {!grounds && (
        <>
          {[[3.45, 0, 0.06, 9.5], [-1, 4.7, 9, 0.06], [-1, -4.7, 9, 0.06]].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x, 0.55, z]} material={glass}><boxGeometry args={[w, 1, d]} /></mesh>
          ))}
          {[[3, 4.2], [3, -4.2], [-5, 4.2], [-5, -4.2]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.6, 0.5, 0.6]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
              <mesh position={[0, 0.85, 0]}><sphereGeometry args={[0.45, 12, 10]} /><meshStandardMaterial color="#4d7c0f" roughness={1} /></mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- Connect Four: a giant frame

const C4 = { cell: 0.42, r: 0.17, base: 0.35 };
const DISC = ["#dc2626", "#facc15"];
const c4x = (c: number) => (c - (c4Rules.COLS - 1) / 2) * C4.cell;
const c4y = (r: number) => C4.base + (c4Rules.ROWS - 1 - r) * C4.cell + C4.cell / 2;

function ConnectFour3D({ state, canMove, onMove }: { state: C4State; canMove: boolean; onMove: (s: C4State) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const frame = useMemo(() => {
    const W = c4Rules.COLS * C4.cell + 0.2, H = c4Rules.ROWS * C4.cell + 0.2;
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2, H); shape.lineTo(-W / 2, H); shape.lineTo(-W / 2, 0);
    for (let r = 0; r < c4Rules.ROWS; r++) for (let c = 0; c < c4Rules.COLS; c++) {
      const hole = new THREE.Path();
      hole.absarc(c4x(c), c4y(r) - C4.base + 0.1 - C4.cell / 2 + C4.cell / 2, C4.r + 0.01, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 20 });
    g.translate(0, C4.base - 0.1, -0.05);
    return g;
  }, []);
  useEffect(() => () => frame.dispose(), [frame]);
  const win = new Set(state.line?.map(([r, c]) => `${r},${c}`));
  const H = c4Rules.ROWS * C4.cell + 0.2;
  return (
    // Facing the usual camera (from the house side, south-west of the board).
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh geometry={frame} castShadow><meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.1} /></mesh>
      {/* The legs and feet */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (c4Rules.COLS * C4.cell / 2 + 0.16), 0, 0]}>
          <mesh position={[0, (H + C4.base) / 2, 0]}><boxGeometry args={[0.1, H + C4.base, 0.14]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
          <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.16, 0.08, 1]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
        </group>
      ))}
      {state.grid.map((row, r) => row.map((v, c) => v === -1 ? null : (
        <Disc key={`${r},${c}`} x={c4x(c)} y={c4y(r)} color={DISC[v]} glow={win.has(`${r},${c}`)} />
      )))}
      {/* The next disc, over the column you're aiming at */}
      {canMove && hover !== null && c4Rules.dropRow(state.grid, hover) >= 0 && (
        <mesh position={[c4x(hover), C4.base + H + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[C4.r, C4.r, 0.07, 24]} />
          <meshStandardMaterial color={DISC[state.turn]} transparent opacity={0.75} />
        </mesh>
      )}
      {/* Tap a column */}
      {Array.from({ length: c4Rules.COLS }, (_, c) => (
        <mesh key={c} position={[c4x(c), C4.base + H / 2 + 0.2, 0]}
          onPointerOver={canMove ? (e) => { e.stopPropagation(); setHover(c); } : undefined}
          onPointerOut={canMove ? () => setHover((h) => (h === c ? null : h)) : undefined}
          onClick={(e) => {
            if (!canMove || !tapped(e) || c4Rules.dropRow(state.grid, c) < 0) return;
            gameAudio.playClickSound();
            onMove(c4Rules.drop(state, c));
          }}>
          <boxGeometry args={[C4.cell, H + 0.5, 0.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A disc that falls into its slot when it first appears. */
function Disc({ x, y, color, glow }: { x: number; y: number; color: string; glow: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const fall = useRef({ y: y + 2.4, v: 0 });
  useFrame((st, dt) => {
    const m = ref.current, f = fall.current;
    if (m && glow) { const k = 1 + Math.abs(Math.sin(st.clock.elapsedTime * 5)) * 0.18; m.scale.set(k, 1, k); }
    if (!m || f.y === y) return;
    f.v += 14 * dt;
    f.y -= f.v * dt;
    if (f.y <= y) { f.y = y; if (f.v > 2) { f.v = -f.v * 0.2; f.y = y + 0.001; } else f.y = y; }
    m.position.y = f.y;
  });
  return (
    <mesh ref={ref} position={[x, y + 2.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[C4.r, C4.r, 0.07, 24]} />
      <meshStandardMaterial color={color} roughness={0.3} emissive={glow ? color : "#000"} emissiveIntensity={glow ? 0.8 : 0} />
    </mesh>
  );
}

// ---------------------------------------------------------------- garden chess

const SQ = 0.5;
const FILES = "abcdefgh";
const sqPos = (sq: string): [number, number] => [(FILES.indexOf(sq[0]) - 3.5) * SQ, (3.5 - (Number(sq[1]) - 1)) * SQ];

/** Lathe outlines (radius, height), in metres, for life-size garden pieces. */
const PROFILES: Record<string, Array<[number, number]>> = {
  p: [[0, 0], [0.16, 0], [0.16, 0.05], [0.11, 0.09], [0.07, 0.24], [0.11, 0.27], [0.06, 0.29], [0, 0.29]],
  r: [[0, 0], [0.18, 0], [0.18, 0.06], [0.13, 0.1], [0.11, 0.36], [0.15, 0.38], [0.15, 0.48], [0, 0.48]],
  n: [[0, 0], [0.18, 0], [0.18, 0.06], [0.13, 0.1], [0.1, 0.24], [0, 0.24]],
  b: [[0, 0], [0.17, 0], [0.17, 0.06], [0.12, 0.1], [0.07, 0.36], [0.11, 0.38], [0.1, 0.46], [0.05, 0.54], [0, 0.56]],
  q: [[0, 0], [0.19, 0], [0.19, 0.06], [0.13, 0.11], [0.08, 0.46], [0.14, 0.5], [0.12, 0.58], [0.15, 0.62], [0, 0.6]],
  k: [[0, 0], [0.19, 0], [0.19, 0.06], [0.13, 0.11], [0.08, 0.5], [0.14, 0.54], [0.11, 0.64], [0, 0.64]],
};
const latheCache = new Map<string, THREE.LatheGeometry>();
function lathe(t: string) {
  let g = latheCache.get(t);
  if (!g) { g = new THREE.LatheGeometry(PROFILES[t].map(([r, h]) => new THREE.Vector2(r, h)), 24); latheCache.set(t, g); }
  return g;
}

function Chess3D({ state, canMove, mySeat, onMove }: { state: ChessState; canMove: boolean; mySeat: number; onMove: (s: ChessState) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const game = useMemo(() => new Chess(state.fen), [state.fen]);
  const mine = mySeat === 0 ? "w" : "b";
  const targets = useMemo(() => (sel && canMove ? new Set(game.moves({ square: sel as Square, verbose: true }).map((m) => m.to)) : new Set<string>()), [sel, canMove, game]);
  const board = game.board();
  const check = game.inCheck() ? game.findPiece({ type: "k", color: game.turn() })[0] : null;

  const tapSquare = (sq: string) => {
    if (!canMove) return;
    const piece = game.get(sq as Square);
    if (sel && targets.has(sq)) {
      const g = new Chess(state.fen);
      g.move({ from: sel, to: sq, promotion: "q" });
      setSel(null);
      gameAudio.playClickSound();
      onMove({ fen: g.fen(), last: [sel, sq] });
      return;
    }
    setSel(piece && piece.color === mine ? sq : null);
  };

  return (
    <group>
      {/* The board: a raised plinth with marble squares */}
      <mesh position={[0, 0.03, 0]} receiveShadow><boxGeometry args={[8 * SQ + 0.3, 0.06, 8 * SQ + 0.3]} /><meshStandardMaterial color="#44403c" roughness={0.6} /></mesh>
      {Array.from({ length: 64 }, (_, i) => {
        const f = i % 8, r = Math.floor(i / 8) + 1, sq = `${FILES[f]}${r}`;
        const [x, z] = sqPos(sq);
        const dark = (f + r) % 2 === 1;
        const lit = sel === sq ? "#fbbf24" : targets.has(sq) ? "#86efac" : state.last?.includes(sq) ? "#fde68a" : check === sq ? "#f87171" : null;
        return (
          <mesh key={sq} position={[x, 0.065, z]} receiveShadow onClick={(e) => { if (tapped(e)) tapSquare(sq); }}>
            <boxGeometry args={[SQ * 0.98, 0.02, SQ * 0.98]} />
            <meshStandardMaterial color={lit ?? (dark ? "#57534e" : "#f5f5f4")} roughness={0.4} />
          </mesh>
        );
      })}
      {board.flat().map((p) => p && (
        <Piece key={`${p.square}`} type={p.type} white={p.color === "w"} at={sqPos(p.square)} picked={sel === p.square}
          onTap={(e) => { if (tapped(e)) tapSquare(p.square); }} />
      ))}
    </group>
  );
}

function Piece({ type, white, at, picked, onTap }: { type: string; white: boolean; at: [number, number]; picked: boolean; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const color = white ? "#f8f4ea" : "#1c1917";
  const mat = <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />;
  return (
    <group position={[at[0], 0.075 + (picked ? 0.18 : 0), at[1]]} rotation={[0, white ? Math.PI : 0, 0]} onClick={onTap}>
      <mesh geometry={lathe(type)} castShadow>{mat}</mesh>
      {type === "p" && <mesh position={[0, 0.35, 0]} castShadow><sphereGeometry args={[0.08, 16, 12]} />{mat}</mesh>}
      {type === "b" && <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.03, 8, 6]} />{mat}</mesh>}
      {type === "q" && Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i) * 0.12, 0.66, Math.sin(i) * 0.12]}><sphereGeometry args={[0.03, 8, 6]} />{mat}</mesh>
      ))}
      {type === "k" && (
        <group position={[0, 0.74, 0]}>
          <mesh><boxGeometry args={[0.04, 0.18, 0.04]} />{mat}</mesh>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.13, 0.04, 0.04]} />{mat}</mesh>
        </group>
      )}
      {type === "n" && (
        <group position={[0, 0.24, 0]}>
          <mesh position={[0, 0.14, -0.02]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[0.14, 0.3, 0.16]} />{mat}</mesh>
          <mesh position={[0, 0.25, 0.08]} rotation={[0.9, 0, 0]} castShadow><boxGeometry args={[0.12, 0.2, 0.12]} />{mat}</mesh>
          <mesh position={[0, 0.34, -0.06]}><boxGeometry args={[0.03, 0.08, 0.12]} /><meshStandardMaterial color={white ? "#d6d3d1" : "#44403c"} /></mesh>
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- Ludo: a deck-sized board and a giant die

const LC = 0.28; // a cell, m (15 × 15)
const lpos = (r: number, c: number): [number, number] => [(c + 0.5 - 7.5) * LC, (r + 0.5 - 7.5) * LC];

function ludoTexture() {
  const N = 15, px = 64, S = N * px;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  const { COLORS, LIGHT, TRACK, HOME_COLUMN, SAFE } = ludoRules;
  g.fillStyle = "#fffdf7"; g.fillRect(0, 0, S, S);
  const cell = (r: number, c: number, fill: string) => { g.fillStyle = fill; g.fillRect(c * px, r * px, px, px); g.strokeStyle = "#94a3b8"; g.lineWidth = 2; g.strokeRect(c * px + 1, r * px + 1, px - 2, px - 2); };
  // The yards: red top-left, green top-right, yellow bottom-right, blue bottom-left.
  [[0, 0], [0, 9], [9, 9], [9, 0]].forEach(([r, c], k) => {
    g.fillStyle = COLORS[k]; g.fillRect(c * px, r * px, 6 * px, 6 * px);
    g.fillStyle = "#fff"; g.beginPath(); g.roundRect(c * px + px, r * px + px, 4 * px, 4 * px, px * 0.5); g.fill();
    ludoRules.YARD[k].forEach(([yr, yc]) => { g.fillStyle = LIGHT[k]; g.beginPath(); g.arc((yc + 0.5) * px, (yr + 0.5) * px, px * 0.42, 0, Math.PI * 2); g.fill(); });
  });
  TRACK.forEach(([r, c], i) => {
    const start = [0, 13, 26, 39].indexOf(i);
    cell(r, c, start >= 0 ? COLORS[start] : "#fff");
    if (SAFE.has(i) && start < 0) { g.fillStyle = "#94a3b8"; g.font = `${px * 0.6}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("★", (c + 0.5) * px, (r + 0.55) * px); }
  });
  HOME_COLUMN.forEach((col, k) => col.forEach(([r, c]) => cell(r, c, COLORS[k])));
  // The finish: four triangles meeting in the middle.
  const m = [7.5 * px, 7.5 * px], a = 6 * px, b = 9 * px;
  ([[[a, a], [a, b], 0], [[a, a], [b, a], 1], [[b, a], [b, b], 2], [[a, b], [b, b], 3]] as Array<[number[], number[], number]>).forEach(([p, q, k]) => {
    g.fillStyle = COLORS[k]; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(m[0], m[1]); g.closePath(); g.fill();
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
/** Which way up shows each number (die faces: +y 1, -y 6, +x 3, -x 4, +z 2, -z 5). */
const FACE_UP: Record<number, [number, number, number]> = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0] };

function Ludo3D({ state, canMove, mySeat, onMove }: { state: LudoState; canMove: boolean; mySeat: number; onMove: (s: LudoState) => void }) {
  const tex = useMemo(() => ludoTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const options = canMove && state.dice !== null ? ludoRules.movable(state, mySeat, state.dice) : [];
  const canRoll = canMove && state.dice === null && state.winner === null;
  const size = 15 * LC;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} receiveShadow><boxGeometry args={[size + 0.2, 0.08, size + 0.2]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.082, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {state.tokens.map((list, seat) => list.map((pos, t) => {
        const color = state.colors[seat];
        const [r, c] = ludoRules.cellOf(color, pos, t);
        const [x, z] = lpos(r, c);
        // Tokens on the same square sit side by side.
        const twins = list.filter((p, i) => i < t && p === pos && pos >= 0).length;
        const can = seat === mySeat && options.includes(t);
        return (
          <LudoToken key={`${seat}-${t}`} x={x + (pos === ludoRules.HOME ? (t - 1.5) * 0.12 : twins * 0.07)} z={z + twins * 0.05} color={ludoRules.COLORS[color]} glow={can}
            onTap={(e) => { if (!can || !tapped(e)) return; gameAudio.playClickSound(); onMove(ludoRules.move(state, t)); }} />
        );
      }))}
      <Die value={state.dice ?? state.lastDice} rollId={state.rollId} ready={canRoll} color={ludoRules.COLORS[state.colors[state.turn]]}
        onTap={(e) => { if (!canRoll || !tapped(e)) return; gameAudio.playClickSound(); onMove(ludoRules.roll(state)); }} />
    </group>
  );
}

function LudoToken({ x, z, color, glow, onTap }: { x: number; z: number; color: string; glow: boolean; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = Math.min(1, dt * 8);
    g.position.x += (x - g.position.x) * k;
    g.position.z += (z - g.position.z) * k;
    const far = Math.hypot(x - g.position.x, z - g.position.z);
    g.position.y = 0.09 + Math.min(0.25, far * 0.5) + (glow ? Math.abs(Math.sin(st.clock.elapsedTime * 5)) * 0.06 : 0);
  });
  return (
    <group ref={ref} position={[x, 0.09, z]} onClick={onTap}>
      <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 0.12, 20]} /><meshStandardMaterial color={color} roughness={0.3} emissive={glow ? color : "#000"} emissiveIntensity={glow ? 0.5 : 0} /></mesh>
      <mesh position={[0, 0.17, 0]} castShadow><sphereGeometry args={[0.06, 16, 12]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>
      {glow && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><ringGeometry args={[0.11, 0.14, 24]} /><meshBasicMaterial color="#fff" /></mesh>}
    </group>
  );
}

/** The giant die beside the board: it tumbles on every roll and lands on the number. Tap it to roll. */
function Die({ value, rollId, ready, color, onTap }: { value: number | null; rollId: number; ready: boolean; color: string; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<THREE.Group>(null);
  const spin = useRef({ id: rollId, t: 1 });
  useFrame((st, dt) => {
    const g = ref.current, s = spin.current;
    if (!g) return;
    if (s.id !== rollId) { s.id = rollId; s.t = 0; }
    s.t = Math.min(1, s.t + dt * 1.6);
    const end = FACE_UP[value ?? 1];
    const left = 1 - s.t;
    g.rotation.set(end[0] + left * 9, end[1] + left * 6, end[2] + left * 7);
    g.position.y = 0.32 + Math.sin(s.t * Math.PI) * 0.7 + (ready && s.t >= 1 ? Math.abs(Math.sin(st.clock.elapsedTime * 3)) * 0.08 : 0);
  });
  const half = 0.25;
  const faces: Array<{ n: number; pos: [number, number, number]; rot: [number, number, number] }> = [
    { n: 1, pos: [0, half + 0.001, 0], rot: [-Math.PI / 2, 0, 0] }, { n: 6, pos: [0, -half - 0.001, 0], rot: [Math.PI / 2, 0, 0] },
    { n: 3, pos: [half + 0.001, 0, 0], rot: [0, Math.PI / 2, 0] }, { n: 4, pos: [-half - 0.001, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { n: 2, pos: [0, 0, half + 0.001], rot: [0, 0, 0] }, { n: 5, pos: [0, 0, -half - 0.001], rot: [0, Math.PI, 0] },
  ];
  return (
    <group position={[0.6, 0, 15 * LC / 2 + 0.65]}>
      <group ref={ref} onClick={onTap}>
        <mesh castShadow><boxGeometry args={[half * 2, half * 2, half * 2]} /><meshStandardMaterial color="#fafafa" roughness={0.25} /></mesh>
        {faces.map((f) => (
          <group key={f.n} position={f.pos} rotation={f.rot}>
            {PIPS[f.n].map(([a, b], i) => <mesh key={i} position={[a * 0.13, b * 0.13, 0]}><circleGeometry args={[0.045, 16]} /><meshBasicMaterial color={f.n === 1 ? "#dc2626" : "#111827"} /></mesh>)}
          </group>
        ))}
      </group>
      {ready && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[0.38, 0.46, 32]} /><meshBasicMaterial color={color} /></mesh>}
    </group>
  );
}
