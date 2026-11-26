"use client";

// Penalty Shootout: five kicks each, in a full stadium. Your kick: tap where you want it on the goal, then stop the
// power bar in the green (too soft and the keeper gets there, too hard and it flies over). Their kick: dive left,
// stay or dive right as the taker strikes it; watch his run-up, it gives the side away (less so at higher levels).
// Level by level the keeper reads you better and the takers hide their side. Sudden death if it's level after five.

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { starsFor } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { applyShake, shake, useGameFrame } from "../../stage";
import { Ball, cheer, PITCH, Player, StadiumScene, useCrowd, type StadiumTheme } from "./StadiumScene";

const GOAL_Z = -PITCH.l / 2;
const SPOT_Z = GOAL_Z + 11;
/** Their taker's shot to `side`, against your dive: a save if you guessed right (most of the time), now and then over. */
function theirShot(side: Side, dive: Side): Kick {
  const x = side * (1.6 + Math.random() * 1.6) + (side === 0 ? (Math.random() - 0.5) * 1.2 : 0);
  const miss = Math.random() < 0.08;
  const result: Kick["result"] = miss ? "over" : dive === side ? (Math.random() < 0.85 ? "save" : "goal") : "goal";
  return { by: "them", x, y: miss ? 2.9 : 0.3 + Math.random() * 1.8, t: 0, dive, result };
}

/** Their taker picks a side; his run-up leans to it, or (more often at higher levels) the other way as a bluff. */
function theirRunUp(level: number): { side: Side; lean: Side } {
  const side = ([-1, 0, 1] as Side[])[Math.floor(Math.random() * 3)];
  const honest = Math.random() < Math.max(0.35, 0.9 - level * 0.06);
  return { side, lean: honest ? side : ([-1, 0, 1] as Side[]).filter((s) => s !== side)[Math.floor(Math.random() * 2)] };
}

const LEVELS = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, label: ["Friendly", "League", "League", "Cup", "Cup", "Semi-final", "Semi-final", "Final", "Final", "Legend"][i] }));

type Side = -1 | 0 | 1;
/** One kick in flight: from the spot to (x, y) on the goal, and where the keeper went. */
interface Kick { by: "you" | "them"; x: number; y: number; t: number; dive: Side; result: null | "goal" | "save" | "over" | "post" }

export default function PenaltyGame({ params, onClose, onShare }: ArcadeGameProps) {
  const stadium = String(params?.stadium ?? "the stadium");
  const theme = (params?.theme as StadiumTheme) ?? "classic";
  return (
    <GameShell
      game="penalty"
      title="Penalty Shootout"
      venue={stadium}
      levels={LEVELS}
      howTo={[
        { icon: "🎯", text: "Your kick: tap where you want it on the goal, then stop the power bar in the green." },
        { icon: "🧤", text: "Their kick: dive left, stay, or dive right. Watch the run-up for a hint." },
        { icon: "⚽", text: "Five each. Level after five? Sudden death." },
      ]}
      onClose={onClose}
      onShare={onShare}
    >
      {(api) => <Shootout api={api} stadium={stadium} theme={theme} />}
    </GameShell>
  );
}

function Shootout({ api, stadium, theme }: { api: ShellApi; stadium: string; theme: StadiumTheme }) {
  const crowd = useCrowd();
  const callouts = useCallouts();
  const level = api.level;
  const [turn, setTurn] = useState<"you" | "them">("you");
  const [step, setStep] = useState<"aim" | "power" | "fly" | "dive">("aim");
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [tally, setTally] = useState({ you: [] as boolean[], them: [] as boolean[] });
  const [points, setPoints] = useState(0);
  const pts = useRef(0);
  const kick = useRef<Kick | null>(null);
  const [powerStart, setPowerStart] = useState(0);
  // Their taker's tell: which way his run-up leans (true to his side, or a bluff at higher levels).
  const [tell, setTell] = useState<Side>(0);
  const theirSide = useRef<Side>(0);
  const done = useRef(false);
  const [goal, setGoal] = useState<GoalRect>({ l: 0.1, t: 0.3, w: 0.8, h: 0.27 });
  const onGoalRect = (r: GoalRect) => setGoal((g) => (Math.abs(g.l - r.l) + Math.abs(g.t - r.t) + Math.abs(g.w - r.w) + Math.abs(g.h - r.h) > 0.004 ? r : g));

  const add = (n: number) => { pts.current += n; setPoints(pts.current); };

  const finishIfOver = (t: { you: boolean[]; them: boolean[] }) => {
    const y = t.you.filter(Boolean).length, th = t.them.filter(Boolean).length;
    const n = Math.min(t.you.length, t.them.length);
    let over = false;
    if (t.you.length <= 5 && t.them.length <= 5) {
      // Decided early when one side can't catch up.
      const yLeft = 5 - t.you.length, thLeft = 5 - t.them.length;
      over = y + yLeft < th || th + thLeft < y;
      if (t.you.length === 5 && t.them.length === 5) over = y !== th;
    } else if (t.you.length === t.them.length) over = y !== th;
    if (!over || done.current) return false;
    done.current = true;
    const won = y > th;
    if (won) { add(500); cheer(crowd.current, 4); }
    callouts.push(won ? "YOU WIN!" : "Beaten…", won ? "great" : "bad");
    sfx(won ? "win" : "lose");
    const score = pts.current;
    setTimeout(() => api.finish({
      score, stars: starsFor(score, [600, 1200, 2000]), level,
      headline: `${won ? "Won" : "Lost"} ${y}–${th} on penalties`,
      stats: [{ label: "Scored", value: `${t.you.filter(Boolean).length}/${t.you.length}` }, { label: "Saved", value: `${t.them.filter((g) => !g).length}/${t.them.length}` }, { label: "Kicks", value: String(n) }],
      share: `I ${won ? "won" : "lost"} a penalty shootout ${y}–${th} at ${stadium}`,
    }), 1600);
    return true;
  };

  // Their kick: a run-up with a tell, then a short window to dive.
  const startTheirKick = () => {
    const { side, lean } = theirRunUp(level);
    theirSide.current = side;
    setTell(lean);
    setStep("dive");
    // Too slow to dive: you stay where you are.
    setTimeout(() => takeTheirShot(0), Math.max(900, 1700 - level * 70));
  };
  const next = (t: { you: boolean[]; them: boolean[] }, after: "you" | "them") => {
    if (finishIfOver(t)) return;
    setTimeout(() => {
      kick.current = null; setAim(null);
      if (after === "you") { setTurn("them"); startTheirKick(); } else { setTurn("you"); setStep("aim"); }
    }, 1400);
  };

  const resolve = (k: Kick) => {
    const scored = k.result === "goal";
    const t = { ...tally, [k.by]: [...tally[k.by], scored] };
    setTally(t);
    if (k.by === "you") {
      if (scored) { add(200); callouts.push("GOAL!!", "great"); sfx("roar"); haptic(60); shake(0.1); cheer(crowd.current, 2.5); }
      else callouts.push(k.result === "save" ? "Saved!" : k.result === "post" ? "Off the post!" : "Over the bar!", "bad");
    } else {
      if (!scored) { add(200); callouts.push(k.result === "save" ? "WHAT A SAVE!" : "Missed!", "great"); sfx("roar"); haptic(50); cheer(crowd.current, 2.5); }
      else callouts.push("They score", "bad");
    }
    next(t, k.by);
  };

  // Your kick: aim (tap on the goal), then power.
  const tapGoal = (e: React.PointerEvent<HTMLDivElement>) => {
    if (turn !== "you" || step !== "aim" || api.phase !== "play") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 7.32, y = (1 - (e.clientY - r.top) / r.height) * 2.44;
    setAim({ x, y }); setStep("power"); setPowerStart(performance.now()); haptic(8);
  };
  const strike = () => {
    if (step !== "power" || !aim) return;
    const p = powerAt(performance.now() - powerStart);
    // Power decides height error and pace: under 0.35 is a soft one the keeper reaches, over 0.85 flies high.
    const lift = p > 0.85 ? (p - 0.85) * 14 : 0;
    const wobble = (Math.random() - 0.5) * (0.6 + Math.abs(p - 0.65) * 2);
    const x = aim.x + wobble, y = Math.max(0.15, aim.y + lift + (Math.random() - 0.5) * 0.3);
    // The keeper guesses (better with level), and reaches anything soft or near the middle on his side.
    const want: Side = x < -1.2 ? -1 : x > 1.2 ? 1 : 0;
    const read = Math.random() < 0.2 + level * 0.045;
    const dive: Side = read ? want : ([-1, 0, 1] as Side[])[Math.floor(Math.random() * 3)];
    const reach = p < 0.35 ? 3.3 : 2.4 - Math.max(0, p - 0.6);
    let result: Kick["result"];
    if (y > 2.44 || Math.abs(x) > 3.66) result = Math.abs(x) < 3.9 && y < 2.65 ? "post" : "over";
    else if (dive === want && Math.abs(x - dive * 2.2) < reach && !(y > 2.0 && Math.abs(x) > 2.9)) result = "save";
    else result = "goal";
    kick.current = { by: "you", x, y, t: 0, dive, result };
    setStep("fly"); sfx("punch"); haptic(20);
  };
  const dive = (side: Side) => {
    if (turn !== "them" || step !== "dive") return;
    takeTheirShot(side);
  };
  const takeTheirShot = (yourDive: Side) => {
    if (kick.current) return;
    kick.current = theirShot(theirSide.current, yourDive);
    setStep("fly"); sfx("punch");
  };
  return (
    <>
      <GameStage camera={{ position: [0, 1.8, SPOT_Z + 6], fov: 50 }} background="#0b1630" environment={0.3}>
        <StadiumScene theme={theme} crowd={crowd}>
          <PenaltyWorld kick={kick} turn={turn} onGoalRect={onGoalRect} tell={step === "dive" ? tell : 0} onLanded={resolve} />
        </StadiumScene>
      </GameStage>
      {callouts.node}

      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 flex justify-center pointer-events-none z-10">
        <div className="rounded-2xl bg-black/70 text-white px-3 py-2 space-y-1 text-sm font-black">
          <Row label="You" kicks={tally.you} />
          <Row label="Them" kicks={tally.them} />
        </div>
      </div>
      <div className="absolute top-[max(5.2rem,calc(env(safe-area-inset-top)+4.4rem))] left-3 z-10 pointer-events-none"><Pill icon="⚽" label="Points" value={points.toLocaleString()} tone="gold" /></div>

      {/* Aiming: the goal mouth, overlaid where it sits on screen. */}
      {turn === "you" && step === "aim" && api.phase === "play" && (
        <div onPointerDown={tapGoal} style={{ left: `${goal.l * 100}%`, top: `${goal.t * 100}%`, width: `${goal.w * 100}%`, height: `${goal.h * 100}%` }} className="absolute z-20 rounded-sm border-2 border-dashed border-amber-300/90 bg-white/10 cursor-crosshair">
          <span className="absolute -bottom-9 inset-x-0 text-center text-white font-black drop-shadow">🎯 Tap where to shoot</span>
        </div>
      )}
      {turn === "you" && step === "power" && <PowerBar start={powerStart} onStrike={strike} />}
      {turn === "them" && step === "dive" && (
        <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 px-4">
          <p className="text-center text-white font-black mb-2 drop-shadow">🧤 Dive! {tell !== 0 ? `(he's leaning ${tell < 0 ? "left" : "right"}…)` : "(he's looking straight at you…)"}</p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            {([[-1, "⬅️ Left"], [0, "⏺ Stay"], [1, "Right ➡️"]] as Array<[Side, string]>).map(([s, l]) => (
              <button key={s} onPointerDown={() => dive(s)} className="h-20 rounded-2xl bg-sky-500 text-white text-lg font-black shadow-xl active:scale-95">{l}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, kicks }: { label: string; kicks: boolean[] }) {
  const shown = Math.max(5, kicks.length);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-11">{label}</span>
      {Array.from({ length: shown }, (_, i) => <span key={i} className={`w-4 h-4 rounded-full ${i >= kicks.length ? "bg-white/20" : kicks[i] ? "bg-emerald-400" : "bg-rose-500"}`} />)}
    </div>
  );
}

/** Power: up and down, 1.1 seconds each way. */
const powerAt = (ms: number) => { const c = (ms / 1100) % 2; return c < 1 ? c : 2 - c; };

function PowerBar({ start, onStrike }: { start: number; onStrike: () => void }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => { let r = 0; const f = () => { setNow(performance.now()); r = requestAnimationFrame(f); }; r = requestAnimationFrame(f); return () => cancelAnimationFrame(r); }, []);
  const p = powerAt(now - start);
  return (
    <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 px-4 flex flex-col items-center gap-2">
      <div className="relative w-full max-w-sm h-6 rounded-full bg-white/20 overflow-hidden">
        <div className="absolute inset-y-0 bg-emerald-500/70" style={{ left: "50%", width: "35%" }} />
        <div className="absolute inset-y-0 left-0 bg-amber-300" style={{ width: `${p * 100}%` }} />
      </div>
      <button onPointerDown={onStrike} className="w-full max-w-sm h-20 rounded-3xl bg-emerald-600 text-white text-2xl font-black shadow-2xl active:scale-95">⚽ SHOOT!</button>
    </div>
  );
}

/** Where the goal mouth sits on screen, as fractions of the view (left, top, width, height). */
export interface GoalRect { l: number; t: number; w: number; h: number }
const corner = new THREE.Vector3();
function goalOnScreen(camera: THREE.Camera): GoalRect {
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[-3.66, 0], [3.66, 0], [-3.66, 2.44], [3.66, 2.44]]) {
    corner.set(x, y, GOAL_Z).project(camera);
    xs.push((corner.x + 1) / 2); ys.push((1 - corner.y) / 2);
  }
  const l = Math.min(...xs), t = Math.min(...ys);
  return { l, t, w: Math.max(...xs) - l, h: Math.max(...ys) - t };
}
/** A wider lens on a tall phone screen, so the whole goal fits across it. */
function fitLens(camera: THREE.Camera) {
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return;
  const fov = cam.aspect < 0.8 ? 62 : 46;
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}

/** One frame at the goal end: the camera, the taker's run-up, the ball in flight and the keeper's dive. Returns the kick that has landed. */
interface KickFrame { k: Kick | null; dt: number; t: number; yours: boolean; tell: Side; camera: THREE.Camera; target: THREE.Vector3; ball: THREE.Group | null; keeper: THREE.Group | null; taker: THREE.Group | null; landed: Kick | null; onLanded: (k: Kick) => void; onGoalRect: (r: GoalRect) => void }
function kickFrame(f: KickFrame): Kick | null {
  const { k, dt, t, yours, tell, camera, target, ball, keeper, taker, landed, onLanded } = f;
  // Their kicks are taken at the same goal; the camera moves behind the keeper (you) instead.
  if (yours) { camera.position.set(0, 1.55, SPOT_Z + 2.6); target.set(0, 1.0, GOAL_Z); }
  else {
    // In goal: you see through the keeper's eyes, and the view goes with your dive.
    const d = k ? Math.min(1, k.t / 0.4) : 0;
    const kx = k ? k.dive * 2.2 * d : 0;
    camera.position.set(kx, 1.7 + (k ? Math.sin(d * Math.PI) * 0.5 - d * 0.6 * Math.abs(k.dive) : 0), GOAL_Z + 0.7);
    target.set(kx * 0.4, 0.9, SPOT_Z);
  }
  fitLens(camera);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  if (yours && !k) f.onGoalRect(goalOnScreen(camera));
  applyShake(camera);
  // The taker: on the spot, swaying towards his tell during the run-up.
  if (keeper) keeper.visible = yours;
  if (taker) {
    taker.visible = !yours;
    taker.position.set(-1.4 + (k ? Math.min(1.2, k.t * 6) : 0), 0, SPOT_Z + 2.2 - (k ? Math.min(1.6, k.t * 8) : 0));
    taker.rotation.z = !yours && !k ? -tell * 0.18 * (0.6 + 0.4 * Math.sin(t * 5)) : 0;
  }
  if (!k) {
    if (ball) ball.position.set(0, 0.22, SPOT_Z);
    if (keeper) { keeper.position.set(Math.sin(t * 2) * 0.4, 0, GOAL_Z + 0.4); keeper.rotation.z = 0; }
    return null;
  }
  k.t += dt;
  const p = Math.min(1, k.t / 0.55);
  if (ball) {
    const endZ = k.result === "save" ? GOAL_Z + 0.6 : GOAL_Z - (k.result === "goal" ? 0.9 : 0.2);
    ball.position.set(k.x * p, 0.22 + (k.y - 0.22) * p + Math.sin(p * Math.PI) * 0.4, SPOT_Z + (endZ - SPOT_Z) * p);
    if (p === 1 && k.result === "save") ball.position.z = GOAL_Z + 0.6 + (k.t - 0.55) * 6;
  }
  if (keeper) {
    const d = Math.min(1, k.t / 0.4);
    keeper.position.set(k.dive * 2.2 * d, Math.sin(d * Math.PI) * 0.5, GOAL_Z + 0.4);
    keeper.rotation.z = -k.dive * 1.2 * d;
  }
  if (p === 1 && landed !== k) { onLanded(k); return k; }
  return landed;
}

/** The goal end: the taker, the keeper, the ball in flight; the camera behind the taker (yours) or the keeper (theirs). */
function PenaltyWorld({ kick, turn, tell, onLanded, onGoalRect }: { kick: React.MutableRefObject<Kick | null>; turn: "you" | "them"; tell: Side; onLanded: (k: Kick) => void; onGoalRect: (r: GoalRect) => void }) {
  const camera = useThree((s) => s.camera);
  const ball = useRef<THREE.Group | null>(null);
  const keeper = useRef<THREE.Group | null>(null);
  const taker = useRef<THREE.Group | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const landed = useRef<Kick | null>(null);

  useGameFrame((dt, t) => { landed.current = kickFrame({ k: kick.current, dt, t, yours: turn === "you", tell, camera, target, ball: ball.current, keeper: keeper.current, taker: taker.current, landed: landed.current, onLanded, onGoalRect }); });

  return (
    <group>
      <group ref={keeper}><Player kit="#facc15" shorts="#111827" keeper /></group>
      <group ref={taker}><Player kit={turn === "you" ? "#8a1538" : "#f8fafc"} shorts="#f8fafc" /></group>
      <Ball at={ball} />
      {/* The penalty spot. */}
      <mesh position={[0, 0.02, SPOT_Z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.15, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
  );
}
