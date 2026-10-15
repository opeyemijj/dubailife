"use client";

// Pool (8-ball) on a canvas table with simple real physics: friction, cushions, ball-to-ball collisions
// and six pockets. Drag back from anywhere to aim (the cue points from your finger through the white)
// and set power; let go to shoot. Every shot is saved with its aim and power and replayed for everyone.

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardProps, GameModule } from "./types";

interface Ball { n: number; x: number; y: number; in: boolean }
type Group = "solids" | "stripes";

export interface PoolState {
  balls: Ball[];
  turn: number;
  groups: (Group | null)[];
  winner: number | null;
  /** The last shot, replayed for everyone: where the balls started, aim, power and how long it ran. */
  shot?: { id: number; by: number; from: Ball[]; angle: number; power: number; ms: number; note?: string };
}

// ---------------------------------------------------------------- table and physics (table units)

const W = 1000, H = 500, RAIL = 34, R = 11, POCKET = 24;
const POCKETS: Array<[number, number]> = [[RAIL, RAIL], [W / 2, RAIL - 6], [W - RAIL, RAIL], [RAIL, H - RAIL], [W / 2, H - RAIL + 6], [W - RAIL, H - RAIL]];
const MAX_SPEED = 1700, FRICTION = 230, STEP = 1 / 240;
const HEAD: [number, number] = [250, H / 2];

function rack(): Ball[] {
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const balls: Ball[] = [{ n: 0, x: HEAD[0], y: HEAD[1], in: false }];
  let k = 0;
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
    balls.push({ n: order[k++], x: 700 + row * R * 1.75, y: H / 2 + (i - row / 2) * R * 2.02, in: false });
  }
  return balls;
}

interface Sim { balls: Ball[]; frames: Array<Array<[number, number]>>; potted: number[]; firstHit: number | null }

/** Runs a shot to rest. Frames are recorded at 60 per second for the replay. */
function simulate(start: Ball[], angle: number, power: number): Sim {
  const b = start.map((x) => ({ ...x, vx: 0, vy: 0 }));
  const cue = b.find((x) => x.n === 0)!;
  cue.vx = Math.cos(angle) * power * MAX_SPEED;
  cue.vy = Math.sin(angle) * power * MAX_SPEED;
  const frames: Array<Array<[number, number]>> = [];
  const potted: number[] = [];
  let firstHit: number | null = null;
  for (let step = 0; step < 240 * 14; step++) {
    let moving = false;
    for (const p of b) {
      if (p.in) continue;
      const v = Math.hypot(p.vx, p.vy);
      if (v === 0) continue;
      const nv = Math.max(0, v - FRICTION * STEP);
      if (nv < 3) { p.vx = 0; p.vy = 0; continue; }
      moving = true;
      p.vx *= nv / v; p.vy *= nv / v;
      p.x += p.vx * STEP; p.y += p.vy * STEP;
      // pockets
      if (POCKETS.some(([px, py]) => Math.hypot(p.x - px, p.y - py) < POCKET)) { p.in = true; p.vx = 0; p.vy = 0; potted.push(p.n); continue; }
      // cushions
      if (p.x < RAIL + R) { p.x = RAIL + R; p.vx = Math.abs(p.vx) * 0.82; }
      if (p.x > W - RAIL - R) { p.x = W - RAIL - R; p.vx = -Math.abs(p.vx) * 0.82; }
      if (p.y < RAIL + R) { p.y = RAIL + R; p.vy = Math.abs(p.vy) * 0.82; }
      if (p.y > H - RAIL - R) { p.y = H - RAIL - R; p.vy = -Math.abs(p.vy) * 0.82; }
    }
    // ball-to-ball (equal masses, near-elastic)
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
      const p = b[i], q = b[j];
      if (p.in || q.in) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d >= 2 * R || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
      const overlap = (2 * R - d) / 2;
      p.x -= nx * overlap; p.y -= ny * overlap; q.x += nx * overlap; q.y += ny * overlap;
      if (rel <= 0) continue;
      const k = rel * 0.97;
      p.vx -= k * nx; p.vy -= k * ny; q.vx += k * nx; q.vy += k * ny;
      if (firstHit === null && (p.n === 0 || q.n === 0)) firstHit = p.n === 0 ? q.n : p.n;
      moving = true;
    }
    if (step % 4 === 0) frames.push(b.map((p) => [p.in ? -999 : p.x, p.y]));
    if (!moving) break;
  }
  return { balls: b.map(({ n, x, y, in: i }) => ({ n, x, y, in: i })), frames, potted, firstHit };
}

// ---------------------------------------------------------------- rules

const groupOf = (n: number): Group | null => (n >= 1 && n <= 7 ? "solids" : n >= 9 ? "stripes" : null);
const cleared = (balls: Ball[], g: Group | null) => !!g && balls.filter((b) => groupOf(b.n) === g).every((b) => b.in);

function shoot(s: PoolState, angle: number, power: number): PoolState {
  const seat = s.turn, other = (seat + 1) % 2;
  const sim = simulate(s.balls, angle, power);
  const balls = sim.balls.map((b) => ({ ...b }));
  const groups = s.groups.slice() as (Group | null)[];
  const mine = groups[seat];
  const scratch = sim.potted.includes(0);
  if (scratch) {
    // Respot the white on the head spot (or the nearest free place behind it).
    const cue = balls.find((b) => b.n === 0)!;
    cue.in = false; cue.y = HEAD[1];
    cue.x = HEAD[0];
    while (balls.some((b) => b.n !== 0 && !b.in && Math.hypot(b.x - cue.x, b.y - cue.y) < 2 * R + 1)) cue.x -= 2 * R;
  }
  const objectPots = sim.potted.filter((n) => n !== 0 && n !== 8);
  let winner: number | null = null, note: string | undefined;
  if (sim.potted.includes(8)) {
    winner = cleared(s.balls, mine) && !scratch ? seat : other;
    note = winner === seat ? "Potted the 8-ball!" : "Potted the 8-ball too early";
  }
  if (!mine && objectPots.length) {
    groups[seat] = groupOf(objectPots[0]);
    groups[other] = groups[seat] === "solids" ? "stripes" : "solids";
  }
  const target = groups[seat];
  const wrongFirst = !!mine && sim.firstHit !== null && sim.firstHit !== 8 && groupOf(sim.firstHit) !== mine;
  const potOwn = objectPots.some((n) => !target || groupOf(n) === target);
  const keep = !scratch && !wrongFirst && potOwn && winner === null;
  if (scratch) note = "Scratch — the white went in";
  else if (sim.firstHit === null) note = "Missed everything";
  else if (wrongFirst) note = "Foul — hit the other group first";
  const ms = Math.round((sim.frames.length * 1000) / 60);
  return {
    balls, groups, winner, turn: keep ? seat : other,
    shot: { id: (s.shot?.id ?? 0) + 1, by: seat, from: s.balls, angle, power, ms, note },
  };
}

function init(): PoolState {
  return { balls: rack(), turn: 0, groups: [null, null], winner: null };
}

/** Pick the easiest pot: aim at the ghost-ball position for each target ball and pocket. */
function ai(s: PoolState, seat: number): PoolState {
  const cue = s.balls.find((b) => b.n === 0)!;
  const mine = s.groups[seat];
  const targets = s.balls.filter((b) => !b.in && b.n !== 0 && (cleared(s.balls, mine) ? b.n === 8 : b.n !== 8 && (!mine || groupOf(b.n) === mine)));
  let best: { angle: number; power: number; cost: number } | null = null;
  for (const t of targets) for (const [px, py] of POCKETS) {
    const tp = Math.hypot(px - t.x, py - t.y);
    const gx = t.x - ((px - t.x) / tp) * 2 * R, gy = t.y - ((py - t.y) / tp) * 2 * R;
    const cg = Math.hypot(gx - cue.x, gy - cue.y);
    const aim = Math.atan2(gy - cue.y, gx - cue.x), path = Math.atan2(py - t.y, px - t.x);
    const cut = Math.abs(Math.atan2(Math.sin(path - aim), Math.cos(path - aim)));
    if (cut > 1.2) continue;
    // Skip shots with a ball in the way of the white.
    const blocked = s.balls.some((o) => !o.in && o.n !== 0 && o.n !== t.n && distToSegment(o.x, o.y, cue.x, cue.y, gx, gy) < 2 * R);
    if (blocked) continue;
    const cost = cut * 300 + cg * 0.4 + tp * 0.5;
    if (!best || cost < best.cost) best = { angle: aim, power: Math.min(1, 0.32 + (cg + tp) / 1500), cost };
  }
  if (!best) {
    const t = targets.sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y))[0] ?? s.balls.find((b) => !b.in && b.n !== 0)!;
    best = { angle: Math.atan2(t.y - cue.y, t.x - cue.x), power: 0.6, cost: 0 };
  }
  return shoot(s, best.angle + (Math.random() - 0.5) * 0.035, best.power);
}

function distToSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

const turnOf = (s: PoolState) => (s.winner === null ? s.turn : null);
const result = (s: PoolState) => (s.winner === null ? null : { winners: [s.winner] });
/** Wait for the last shot to finish rolling before the computer plays. */
export const poolDelay = (s: PoolState) => (s.shot?.ms ?? 0) + 700;

// ---------------------------------------------------------------- drawing

const BALL_COLORS = ["#fafaf9", "#facc15", "#2563eb", "#dc2626", "#7c3aed", "#f97316", "#16a34a", "#7f1d1d", "#111827"];
const colorOf = (n: number) => BALL_COLORS[n === 8 ? 8 : n > 8 ? n - 8 : n];

function draw(ctx: CanvasRenderingContext2D, scale: number, positions: Array<[number, number]>, ns: number[], aim: { angle: number; power: number } | null, cue: [number, number] | null) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  // wood rail, felt, cushions
  ctx.fillStyle = "#5b3a1e"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#15803d"; ctx.fillRect(RAIL - 6, RAIL - 6, W - 2 * RAIL + 12, H - 2 * RAIL + 12);
  ctx.fillStyle = "#16a34a"; ctx.fillRect(RAIL, RAIL, W - 2 * RAIL, H - 2 * RAIL);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(HEAD[0], RAIL); ctx.lineTo(HEAD[0], H - RAIL); ctx.stroke();
  for (const [px, py] of POCKETS) { ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(px, py, POCKET, 0, Math.PI * 2); ctx.fill(); }
  // aim line
  if (aim && cue) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cue[0], cue[1]); ctx.lineTo(cue[0] + Math.cos(aim.angle) * 420, cue[1] + Math.sin(aim.angle) * 420); ctx.stroke(); ctx.setLineDash([]);
    // the cue stick behind the white
    const back = 24 + aim.power * 120;
    ctx.strokeStyle = "#d6a76c"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cue[0] - Math.cos(aim.angle) * back, cue[1] - Math.sin(aim.angle) * back); ctx.lineTo(cue[0] - Math.cos(aim.angle) * (back + 300), cue[1] - Math.sin(aim.angle) * (back + 300)); ctx.stroke();
  }
  positions.forEach(([x, y], i) => {
    if (x < -100) return;
    const n = ns[i];
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.arc(x + 2, y + 3, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = n > 8 ? "#fafaf9" : colorOf(n); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    if (n > 8) { ctx.fillStyle = colorOf(n); ctx.fillRect(x - R, y - R * 0.5, 2 * R, R); }
    if (n > 0) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, R * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#111"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n), x, y + 0.5); }
  });
}

function Board({ state, me, seats, onMove, canMove }: BoardProps<PoolState>) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  // Sharp on high-density screens (capped at 2× to save memory).
  const [dpr] = useState(() => (typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1)));
  const [playing, setPlaying] = useState(false);
  const [aim, setAim] = useState<{ angle: number; power: number } | null>(null);
  const seen = useRef<number>(state.shot?.id ?? 0);
  const ns = useMemo(() => state.balls.map((b) => b.n), [state.balls]);
  const scale = (width / W) * dpr;
  const cue = state.balls.find((b) => b.n === 0)!;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The latest values for the animation loop, without restarting it.
  const latest = useRef({ state, scale, ns, aim });
  useEffect(() => { latest.current = { state, scale, ns, aim }; });
  const shotId = state.shot?.id ?? 0;

  // Replay a new shot (once), then show where the balls ended up.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const shot = latest.current.state.shot;
    if (!ctx || !shot || shot.id === seen.current) return;
    seen.current = shot.id;
    const sim = simulate(shot.from, shot.angle, shot.power);
    const order = shot.from.map((b) => b.n);
    let f = 0, raf = 0;
    setPlaying(true);
    const tick = () => {
      const { state: s, scale: sc, ns: n } = latest.current;
      if (f < sim.frames.length) { draw(ctx, sc, sim.frames[f], order, null, null); f++; raf = requestAnimationFrame(tick); return; }
      draw(ctx, sc, s.balls.map((b) => [b.in ? -999 : b.x, b.y]), n, null, null);
      setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); seen.current = -1; setPlaying(false); };
  }, [shotId]);

  // The table at rest (and the aim line while aiming).
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || playing) return;
    draw(ctx, scale, state.balls.map((b) => [b.in ? -999 : b.x, b.y]), ns, aim, aim ? [cue.x, cue.y] : null);
  }, [state, scale, ns, aim, cue.x, cue.y, playing]);

  const myTurn = canMove && !playing && state.turn === me && state.winner === null;
  const toTable = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const onPointer = (e: React.PointerEvent) => {
    if (!myTurn || (e.type === "pointermove" && !aim && e.buttons === 0)) return;
    const [x, y] = toTable(e);
    const angle = Math.atan2(cue.y - y, cue.x - x);
    const power = Math.min(1, Math.max(0.05, Math.hypot(cue.x - x, cue.y - y) / 320));
    setAim({ angle, power });
  };
  const release = () => {
    if (!aim || !myTurn) return;
    const a = aim;
    setAim(null);
    onMove(shoot(state, a.angle, a.power));
  };
  const myGroup = state.groups[me];
  return (
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
        {seats.map((s, i) => (
          <span key={i} className={`px-2.5 py-1 rounded-full ${state.turn === i && state.winner === null ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}>
            {i === me ? "You" : s.name}{state.groups[i] ? ` · ${state.groups[i]}` : ""}
          </span>
        ))}
      </div>
      <div ref={wrap} className="w-full">
        <canvas ref={canvas} width={Math.round(width * dpr)} height={Math.round((width / 2) * dpr)}
          style={{ width, height: width / 2, touchAction: "none" }} className="rounded-2xl shadow-xl"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); onPointer(e); }} onPointerMove={onPointer} onPointerUp={release} onPointerCancel={() => setAim(null)} />
      </div>
      <p className="text-center text-sm font-bold min-h-5">
        {state.shot?.note && !playing ? `${state.shot.note} · ` : ""}
        {playing ? "…" : myTurn ? (aim ? `Power ${Math.round(aim.power * 100)}% — let go to shoot` : `Your shot${myGroup ? ` (${cleared(state.balls, myGroup) ? "the 8-ball" : myGroup})` : ""} — drag back from the white to aim`) : state.winner === null ? `${seats[state.turn]?.name ?? "…"} is shooting…` : ""}
      </p>
    </div>
  );
}

export const pool: GameModule<PoolState> = { init, turnOf, ai, result, Board, delay: poolDelay };
