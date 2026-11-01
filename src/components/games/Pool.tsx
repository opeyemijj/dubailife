"use client";

// Pool (8-ball) — Upgraded with a full 3D Billiard Lounge Table + Live 3D Player Avatars!
// Uses the same deterministic 2D physics (friction, cushions, ball-to-ball collisions, 6 pockets)
// so multiplayer replays stay 100% synced, while rendering glossy 3D spheres, a 3D wooden table,
// 3D cue stick, and player avatars cheering/watching beside the table. Includes a one-tap 3D / 2D toggle.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { canvasQuality } from "@/lib/device";
import { useCitizen } from "@/lib/citizenStore";
import { broadcastCityPulse } from "@/lib/presence";
import { LOCALS } from "@/lib/locals";
import { gameAudio } from "@/utils/gameAudio";
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
export const poolDelay = (s: PoolState) => (s.shot?.ms ?? 0) + 700;

// ---------------------------------------------------------------- 2D & 3D rendering

const BALL_COLORS = ["#fafaf9", "#facc15", "#2563eb", "#dc2626", "#7c3aed", "#f97316", "#16a34a", "#7f1d1d", "#111827"];
const colorOf = (n: number) => BALL_COLORS[n === 8 ? 8 : n > 8 ? n - 8 : n];

// 1000x500 table -> 3.0m x 1.5m 3D table at y = 0.82m
const S3 = 0.003;
const to3 = (x: number, y: number): [number, number] => [(x - W / 2) * S3, (y - H / 2) * S3];
const TABLE_Y = 0.82;
const BALL_R3 = R * S3 * 1.12;

function Pool3DScene({
  livePosRef,
  ns,
  aim,
  myLook,
  turn,
}: {
  livePosRef: React.RefObject<Array<[number, number]>>;
  ns: number[];
  aim: { angle: number; power: number } | null;
  myLook?: any;
  turn: number;
}) {
  const ballsGroup = useRef<THREE.Group>(null);
  const cueStick = useRef<THREE.Group>(null);
  const aimLine = useRef<THREE.Mesh>(null);
  const rivalLook = useMemo(() => LOCALS[4].look, []);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const pos = livePosRef.current;
    if (pos && ballsGroup.current) {
      ballsGroup.current.children.forEach((child, idx) => {
        const p = pos[idx];
        if (!p || p[0] < -100) {
          child.visible = false;
          return;
        }
        child.visible = true;
        const [x3, z3] = to3(p[0], p[1]);
        child.position.set(x3, TABLE_Y + BALL_R3, z3);
      });
    }

    const cuePos = pos?.[0];
    if (aim && cuePos && cuePos[0] > -100) {
      const [cx, cz] = to3(cuePos[0], cuePos[1]);
      if (cueStick.current) {
        cueStick.current.visible = true;
        const back = (28 + aim.power * 110) * S3;
        cueStick.current.position.set(cx - Math.cos(aim.angle) * back, TABLE_Y + BALL_R3 * 1.15, cz - Math.sin(aim.angle) * back);
        cueStick.current.rotation.set(0, -aim.angle, -0.09);
      }
      if (aimLine.current) {
        aimLine.current.visible = true;
        const len = 1.15;
        aimLine.current.position.set(cx + Math.cos(aim.angle) * (len / 2), TABLE_Y + 0.008, cz + Math.sin(aim.angle) * (len / 2));
        aimLine.current.rotation.set(-Math.PI / 2, 0, -aim.angle);
      }
    } else {
      if (cueStick.current) cueStick.current.visible = false;
      if (aimLine.current) aimLine.current.visible = false;
    }

    // Elevated lounge perspective so the entire table and standing avatars are visible
    camera.position.lerp(new THREE.Vector3(0, 3.05, 1.95), Math.min(1, dt * 4));
    camera.lookAt(0, TABLE_Y - 0.05, -0.1);
  });

  return (
    <>
      <color attach="background" args={["#090d16"]} />
      <hemisphereLight args={["#fef3c7", "#1e293b", 1.1]} />
      <spotLight position={[0, 4.2, 0]} angle={0.75} penumbra={0.5} intensity={45} color="#fffbeb" castShadow />
      <pointLight position={[-2, 2.5, -1.5]} intensity={10} color="#38bdf8" />

      {/* Lounge Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.6} />
      </mesh>

      {/* 3D Billiard Table */}
      <group position={[0, 0, 0]}>
        {/* Table Legs */}
        {[
          [-1.25, -0.55],
          [1.25, -0.55],
          [-1.25, 0.55],
          [1.25, 0.55],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, TABLE_Y / 2, lz]}>
            <cylinderGeometry args={[0.1, 0.08, TABLE_Y, 16]} />
            <meshStandardMaterial color="#29180c" roughness={0.5} />
          </mesh>
        ))}
        {/* Mahogany Body & Rails */}
        <mesh position={[0, TABLE_Y - 0.09, 0]} castShadow receiveShadow>
          <boxGeometry args={[W * S3 + 0.14, 0.18, H * S3 + 0.14]} />
          <meshStandardMaterial color="#451a03" roughness={0.35} metalness={0.15} />
        </mesh>
        {/* Emerald Felt Surface */}
        <mesh position={[0, TABLE_Y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[(W - RAIL * 1.6) * S3, (H - RAIL * 1.6) * S3]} />
          <meshStandardMaterial color="#15803d" roughness={0.85} />
        </mesh>
        {/* 6 Pockets */}
        {POCKETS.map(([px, py], i) => {
          const [x3, z3] = to3(px, py);
          return (
            <mesh key={i} position={[x3, TABLE_Y + 0.004, z3]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[POCKET * S3 * 1.05, 20]} />
              <meshBasicMaterial color="#050505" />
            </mesh>
          );
        })}
      </group>

      {/* Aim Line on Felt */}
      <mesh ref={aimLine} visible={false}>
        <planeGeometry args={[1.15, 0.018]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.85} />
      </mesh>

      {/* 3D Cue Stick */}
      <group ref={cueStick} visible={false}>
        <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.016, 1.1, 12]} />
          <meshStandardMaterial color="#fde68a" roughness={0.3} />
        </mesh>
      </group>

      {/* 16 Glossy 3D Billiard Balls */}
      <group ref={ballsGroup}>
        {ns.map((n) => (
          <mesh key={n} castShadow>
            <sphereGeometry args={[BALL_R3, 20, 20]} />
            <meshPhysicalMaterial
              color={colorOf(n)}
              roughness={0.12}
              metalness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
        ))}
      </group>

      {/* Player & Opponent 3D Avatars Watching Tableside */}
      <group position={[-1.05, 0, -1.18]} rotation={[0, 0.25, 0]}>
        <Suspense fallback={null}>
          <CitizenAvatar look={myLook} animation={turn === 0 ? "wave" : "idle"} />
        </Suspense>
      </group>
      <group position={[1.05, 0, -1.18]} rotation={[0, -0.25, 0]}>
        <Suspense fallback={null}>
          <CitizenAvatar look={rivalLook} animation={turn === 1 ? "talk" : "idle"} />
        </Suspense>
      </group>
    </>
  );
}

function draw(ctx: CanvasRenderingContext2D, scale: number, positions: Array<[number, number]>, ns: number[], aim: { angle: number; power: number } | null, cue: [number, number] | null) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#5b3a1e"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#15803d"; ctx.fillRect(RAIL - 6, RAIL - 6, W - 2 * RAIL + 12, H - 2 * RAIL + 12);
  ctx.fillStyle = "#16a34a"; ctx.fillRect(RAIL, RAIL, W - 2 * RAIL, H - 2 * RAIL);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(HEAD[0], RAIL); ctx.lineTo(HEAD[0], H - RAIL); ctx.stroke();
  for (const [px, py] of POCKETS) { ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(px, py, POCKET, 0, Math.PI * 2); ctx.fill(); }
  if (aim && cue) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cue[0], cue[1]); ctx.lineTo(cue[0] + Math.cos(aim.angle) * 420, cue[1] + Math.sin(aim.angle) * 420); ctx.stroke(); ctx.setLineDash([]);
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
  const { citizen } = useCitizen();
  const quality = useMemo(() => canvasQuality(), []);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  const [dpr] = useState(() => (typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1)));
  const [playing, setPlaying] = useState(false);
  const [aim, setAim] = useState<{ angle: number; power: number } | null>(null);
  const [mode3D, setMode3D] = useState(true);
  const seen = useRef<number>(state.shot?.id ?? 0);
  const ns = useMemo(() => state.balls.map((b) => b.n), [state.balls]);
  const scale = (width / W) * dpr;
  const cue = state.balls.find((b) => b.n === 0)!;

  // Live ball positions shared with the 3D scene
  const livePosRef = useRef<Array<[number, number]>>(state.balls.map((b) => [b.in ? -999 : b.x, b.y]));

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const latest = useRef({ state, scale, ns, aim });
  useEffect(() => { latest.current = { state, scale, ns, aim }; });
  const shotId = state.shot?.id ?? 0;

  // Replay a new shot (once), updating both 3D livePosRef and 2D canvas if visible
  useEffect(() => {
    const shot = latest.current.state.shot;
    if (!shot || shot.id === seen.current) return;
    seen.current = shot.id;
    const sim = simulate(shot.from, shot.angle, shot.power);
    gameAudio.sfx("cue");
    if (sim.firstHit !== null) setTimeout(() => gameAudio.sfx("clack"), 80);
    if (sim.potted.length > 0) setTimeout(() => gameAudio.sfx("pocket"), Math.max(180, Math.round((sim.frames.length * 1000) / 110)));
    const order = shot.from.map((b) => b.n);
    let f = 0, raf = 0;
    setPlaying(true);
    const tick = () => {
      const { state: s, scale: sc, ns: n } = latest.current;
      const ctx = canvas.current?.getContext("2d");
      if (f < sim.frames.length) {
        livePosRef.current = sim.frames[f];
        if (ctx) draw(ctx, sc, sim.frames[f], order, null, null);
        f++;
        raf = requestAnimationFrame(tick);
        return;
      }
      const rest = s.balls.map((b): [number, number] => [b.in ? -999 : b.x, b.y]);
      livePosRef.current = rest;
      if (ctx) draw(ctx, sc, rest, n, null, null);
      setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); seen.current = -1; setPlaying(false); };
  }, [shotId]);

  useEffect(() => {
    if (playing) return;
    const rest = state.balls.map((b): [number, number] => [b.in ? -999 : b.x, b.y]);
    livePosRef.current = rest;
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, scale, rest, ns, aim, aim ? [cue.x, cue.y] : null);
  }, [state, scale, ns, aim, cue.x, cue.y, playing, mode3D]);

  const myTurn = canMove && !playing && state.turn === me && state.winner === null;
  const toTable = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const onPointer = (e: React.PointerEvent<HTMLElement>) => {
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
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <div className="flex flex-wrap gap-1.5">
          {seats.map((s, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-full ${state.turn === i && state.winner === null ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}>
              {i === me ? "You" : s.name}{state.groups[i] ? ` · ${state.groups[i]}` : ""}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => {
              gameAudio.playClickSound();
              broadcastCityPulse({
                kind: "game",
                icon: "🎱",
                title: `@${citizen?.username ?? "someone"} opened a 3D 8-Ball Pool Challenge!`,
                subtitle: "Step up to the 3D Pool Table for +30 League pts!",
                href: "/games/pool",
                cta: "Play Now ›",
                from: citizen?.username ?? "someone",
              });
              const refPart = citizen?.username ? `ref=${encodeURIComponent(citizen.username)}&` : "";
              const url = `${window.location.origin}/?${refPart}go=${encodeURIComponent("/games/pool")}`;
              const text = `Play me in 3D 8-Ball Pool in Dubai Life! 🎱 Tap to join my table right now:`;
              if (navigator.share) {
                try { await navigator.share({ title: "3D Pool Challenge · Dubai Life", text, url }); return; } catch { /* cancelled */ }
              }
              try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ }
              window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🎱 3D Pool challenge broadcast & link copied!" }));
            }}
            className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] active:scale-95"
          >
            📲 Challenge Friend
          </button>
          <button
            onClick={() => setMode3D((v) => !v)}
            className="px-3 py-1 rounded-full bg-slate-900 text-amber-300 font-black text-[11px]"
          >
            {mode3D ? "🎱 3D Lounge View" : "📐 2D Top View"}
          </button>
        </div>
      </div>

      <div
        ref={wrap}
        className="w-full relative rounded-2xl overflow-hidden shadow-xl select-none"
        style={{ height: Math.max(240, Math.round(width * 0.56)), touchAction: "none" }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onPointer(e); }}
        onPointerMove={onPointer}
        onPointerUp={release}
        onPointerCancel={() => setAim(null)}
      >
        {mode3D ? (
          <Canvas dpr={quality.dpr} shadows={quality.shadows} camera={{ position: [0, 3.05, 1.95], fov: 42 }}>
            <Pool3DScene livePosRef={livePosRef} ns={ns} aim={aim} myLook={citizen?.look} turn={state.turn} />
          </Canvas>
        ) : (
          <canvas
            ref={canvas}
            width={Math.round(width * dpr)}
            height={Math.round((width / 2) * dpr)}
            style={{ width, height: width / 2 }}
            className="w-full h-full"
          />
        )}
      </div>

      <p className="text-center text-sm font-bold min-h-5">
        {state.shot?.note && !playing ? `${state.shot.note} · ` : ""}
        {playing ? "…" : myTurn ? (aim ? `Power ${Math.round(aim.power * 100)}% — let go to shoot` : `Your shot${myGroup ? ` (${cleared(state.balls, myGroup) ? "the 8-ball" : myGroup})` : ""} — drag anywhere on the table to aim`) : state.winner === null ? `${seats[state.turn]?.name ?? "…"} is shooting…` : ""}
      </p>
    </div>
  );
}

export const pool: GameModule<PoolState> = { init, turnOf, ai, result, Board, delay: poolDelay };
