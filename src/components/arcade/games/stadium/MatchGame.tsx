"use client";

// Match Night: a league match from your seat in the stands. Pick who you support and predict the result, then watch
// 90 minutes (about two minutes of real time): 22 players, the ball passed, dribbled and shot, the crowd round you.
// And join in: hit the chants on the beat, stand up as the Mexican wave reaches your section, and roar your striker
// on at a big chance (the louder the roar, the better the chance: a quiet crowd lets the chance go). Points for
// every chant, wave and roar, your team's goals, and a correct prediction.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { ROSTER } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { starsFor } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { applyShake, shake, slowMo, stageFx, useGameFrame } from "../../stage";
import { Ball, PITCH, Player, StadiumScene, useCrowd, type CrowdState, type StadiumTheme } from "./StadiumScene";

const REAL_SECONDS = 120;
const TEAMS: Record<string, { kit: string; shorts: string }> = {
  "Al Sadd": { kit: "#f8fafc", shorts: "#1f2937" }, "Al Rayyan": { kit: "#dc2626", shorts: "#111827" }, "Al Duhail": { kit: "#b91c1c", shorts: "#f8fafc" },
  "Al Gharafa": { kit: "#facc15", shorts: "#1d4ed8" }, "Al Wakrah": { kit: "#0ea5e9", shorts: "#f8fafc" }, "Qatar SC": { kit: "#7c3aed", shorts: "#f8fafc" },
  "Al Arabi": { kit: "#991b1b", shorts: "#f8fafc" }, "Umm Salal": { kit: "#f97316", shorts: "#111827" },
};
const bumpRoar = (c: { roar: number }) => { c.roar += 1; };
const kitOf = (t: string) => TEAMS[t] ?? { kit: "#e5e7eb", shorts: "#1f2937" };

/** The match, shared between the 3D world (which plays it) and the HUD (which shows it and feeds it the crowd). */
interface Sim {
  minute: number; score: [number, number]; half: 1 | 2;
  ball: THREE.Vector3; target: THREE.Vector3; carrier: { team: 0 | 1; i: number }; speed: number;
  /** A big chance under way: whose, when it's decided, and the roar for it so far. */
  chance: null | { team: 0 | 1; until: number; roar: number };
  /** What's happening for the HUD to react to (a goal, a save, half-time…), oldest first. */
  events: Array<{ kind: "goal" | "miss" | "save" | "half" | "full" | "chance" | "wave" | "chant"; team?: 0 | 1 }>;
  nextChant: number; nextWave: number; nextChance: number; waveStart: number | null; over: boolean; t: number;
}
const formation = (team: 0 | 1): Array<[number, number]> => {
  const d = team === 0 ? 1 : -1;
  // A 4-4-2: the keeper, four at the back, four in midfield, two up front (x across, z along, own goal at +z for team 0).
  return [[0, 48], [-22, 32], [-8, 34], [8, 34], [22, 32], [-22, 12], [-8, 14], [8, 14], [22, 12], [-8, -4], [8, -4]].map(([x, z]) => [x, z * d] as [number, number]);
};

export default function MatchGame({ params, onClose, onShare }: ArcadeGameProps) {
  const stadium = String(params?.stadium ?? "the stadium");
  const theme = (params?.theme as StadiumTheme) ?? "classic";
  const home = String(params?.home ?? "Al Sadd"), away = String(params?.away ?? "Al Rayyan");
  return (
    <GameShell
      game="stadium"
      title="Match Night"
      venue={`${home} v ${away} · ${stadium}`}
      howTo={[
        { icon: "🙋", text: "Pick your team and predict the result before kick-off." },
        { icon: "🥁", text: "Chants: tap as each beat lands on the ring. Mexican wave: stand when it reaches your section." },
        { icon: "📣", text: "Big chance! Tap fast to roar your striker on. The louder the crowd, the better the chance." },
      ]}
      onClose={onClose}
      onShare={onShare}
    >
      {(api) => <Match api={api} stadium={stadium} theme={theme} home={home} away={away} />}
    </GameShell>
  );
}

function Match({ api, stadium, theme, home, away }: { api: ShellApi; stadium: string; theme: StadiumTheme; home: string; away: string }) {
  const crowd = useCrowd();
  const sim = useRef<Sim>({
    minute: 0, score: [0, 0], half: 1, ball: new THREE.Vector3(0, 0.22, 0), target: new THREE.Vector3(0, 0.22, 0), carrier: { team: 0, i: 9 }, speed: 9,
    chance: null, events: [], nextChant: 14, nextWave: 34, nextChance: 10, waveStart: null, over: false, t: 0,
  });
  const callouts = useCallouts();
  const [stage, setStage] = useState<"pick" | "play" | "done">("pick");
  const [support, setSupport] = useState<0 | 1>(0);
  const [predict, setPredict] = useState<"home" | "draw" | "away" | null>(null);
  const [view, setView] = useState({ minute: 0, score: [0, 0] as [number, number] });
  const [points, setPoints] = useState(0);
  const pts = useRef(0);
  const add = (n: number) => { pts.current += n; setPoints(pts.current); };
  const stats = useRef({ chants: 0, waves: 0, roars: 0 });
  // The HUD's prompts: a chant (its beats and when each lands), the wave at your section, a big chance.
  const [chant, setChant] = useState<null | { words: string; beats: number[]; hit: number }>(null);
  const [waveHere, setWaveHere] = useState<null | { until: number }>(null);
  const [chance, setChance] = useState<null | { mine: boolean; until: number }>(null);
  const [, tick] = useState(0);
  const [roars, setRoars] = useState(0);

  // Read the match ten times a second: the clock, the score, and what just happened.
  useEffect(() => {
    if (stage !== "play") return;
    const id = setInterval(() => {
      const s = sim.current;
      setView({ minute: Math.min(90, Math.floor(s.minute)), score: [...s.score] as [number, number] });
      tick((n) => n + 1);
      while (s.events.length) {
        const e = s.events.shift()!;
        if (e.kind === "goal") {
          const mine = e.team === support;
          callouts.push(mine ? "GOAL!!" : "Goal for them…", mine ? "great" : "bad");
          sfx("roar"); haptic(mine ? 60 : 20);
          if (mine) { add(250); shake(0.12); }
          crowd.current.jumpUntil = s.t + 3.2;
        } else if (e.kind === "save" || e.kind === "miss") callouts.push(e.kind === "save" ? "Saved!" : "Wide!", "info");
        else if (e.kind === "half") callouts.push("Half-time", "info");
        else if (e.kind === "chance") {
          const mine = e.team === support;
          setChance({ mine, until: s.chance?.until ?? s.t + 2.6 }); setRoars(0);
          callouts.push(mine ? "BIG CHANCE! ROAR!" : "They're through! Make noise!", mine ? "great" : "bad");
          slowMo(0.35, 2.4);
        } else if (e.kind === "chant") {
          const words = ["Yalla, yalla!", "Allez, allez!", "We are the champions!", "Olé, olé!"][Math.floor(Math.random() * 4)];
          setChant({ words, beats: [1.1, 1.9, 2.7, 3.5].map((b) => performance.now() + b * 1000), hit: 0 });
        } else if (e.kind === "wave") setWaveHere({ until: performance.now() + 1600 });
        else if (e.kind === "full") {
          const [h, a] = s.score;
          const result = h > a ? "home" : h < a ? "away" : "draw";
          if (predict === result) { add(400); callouts.push("You called it! +400", "great"); }
          setStage("done");
          const score = pts.current;
          setTimeout(() => api.finish({
            score, stars: starsFor(score, [700, 1500, 2500]),
            headline: `${home} ${h}–${a} ${away}`,
            stats: [{ label: "Chants", value: String(stats.current.chants) }, { label: "Waves", value: String(stats.current.waves) }, { label: "Roars", value: String(stats.current.roars) }, { label: "Prediction", value: predict === result ? "Right ✓" : "Wrong" }],
            share: `I watched ${home} ${h}–${a} ${away} at ${stadium} and scored ${score.toLocaleString()} for crowd noise`,
          }), 1800);
        }
      }
      // Prompts time out.
      const now = performance.now();
      setChant((c) => (c && now > c.beats[c.beats.length - 1] + 600 ? null : c));
      setWaveHere((w) => (w && now > w.until ? null : w));
      setChance((c) => (c && s.t > c.until ? null : c));
    }, 100);
    return () => clearInterval(id);
  }, [stage, support, predict]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapChant = () => {
    if (!chant) return;
    const now = performance.now();
    const beat = chant.beats.find((b) => Math.abs(b - now) < 260);
    if (beat !== undefined) {
      const perfect = Math.abs(beat - now) < 110;
      add(perfect ? 100 : 60); stats.current.chants++; haptic(15);
      callouts.push(perfect ? "PERFECT!" : "Good!", perfect ? "great" : "good");
      setChant({ ...chant, beats: chant.beats.filter((b) => b !== beat), hit: chant.hit + 1 });
    } else callouts.push("Off the beat", "bad");
  };
  const standUp = () => { if (!waveHere) return; add(150); stats.current.waves++; callouts.push("WAVE! +150", "great"); haptic(30); setWaveHere(null); };
  const roar = () => {
    const c = sim.current.chance;
    if (!c) return;
    bumpRoar(c); stats.current.roars++; add(10); haptic(8); setRoars((n) => n + 1);
  };

  return (
    <>
      <GameStage camera={{ position: [PITCH.w / 2 + 20, 12, 0], fov: 55 }} background="#0b1630" environment={0.3}>
        <StadiumScene theme={theme} crowd={crowd}>
          <MatchWorld sim={sim} crowd={crowd} playing={stage === "play" && api.phase === "play"} home={home} away={away} />
        </StadiumScene>
      </GameStage>
      {callouts.node}

      {/* The scoreboard. */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 flex justify-center pointer-events-none z-10">
        <div className="flex items-center gap-2 rounded-2xl bg-black/70 text-white px-3 py-2 font-black text-sm sm:text-base">
          <span className="w-3 h-3 rounded-full" style={{ background: kitOf(home).kit }} />{home}
          <span className="px-2 tabular-nums text-amber-300">{view.score[0]}–{view.score[1]}</span>{away}
          <span className="w-3 h-3 rounded-full" style={{ background: kitOf(away).kit }} />
          <span className="ml-2 text-xs text-white/70 tabular-nums">{view.minute}&apos;</span>
        </div>
      </div>
      <div className="absolute top-[max(3.8rem,calc(env(safe-area-inset-top)+3rem))] left-3 z-10 pointer-events-none"><Pill icon="📣" label="Crowd points" value={points.toLocaleString()} tone="gold" /></div>

      {/* Before kick-off: your team and your prediction. */}
      {stage === "pick" && api.phase === "play" && (
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 rounded-3xl bg-white text-slate-900 p-4 space-y-3 shadow-2xl max-w-md mx-auto">
          <p className="font-black">Who do you support?</p>
          <div className="grid grid-cols-2 gap-2">
            {[home, away].map((t, i) => (
              <button key={t} onClick={() => setSupport(i as 0 | 1)} className={`h-12 rounded-2xl border-2 font-black ${support === i ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
                <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ background: kitOf(t).kit, outline: "1px solid #0003" }} />{t}
              </button>
            ))}
          </div>
          <p className="font-black">Predict the result (+400 if right)</p>
          <div className="grid grid-cols-3 gap-2">
            {(["home", "draw", "away"] as const).map((r) => (
              <button key={r} onClick={() => setPredict(r)} className={`h-11 rounded-xl border-2 text-sm font-black ${predict === r ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>{r === "home" ? `${home} win` : r === "away" ? `${away} win` : "Draw"}</button>
            ))}
          </div>
          <button disabled={!predict} onClick={() => { setStage("play"); sfx("airhorn"); callouts.push("Kick-off!", "info"); }} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-40">Kick-off</button>
        </div>
      )}

      {/* The crowd's moments: one big button for whatever's happening, so it's easy on a phone. */}
      {stage === "play" && (chance || chant || waveHere) && (
        <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-2 px-4">
          {chance ? (
            <button onPointerDown={roar} className={`w-full max-w-sm h-24 rounded-3xl text-white text-2xl font-black shadow-2xl active:scale-95 animate-pulse ${chance.mine ? "bg-emerald-600" : "bg-rose-600"}`}>
              {chance.mine ? "📣 ROAR! Tap tap tap!" : "📣 Make noise! Put them off!"}
              <span className="block text-sm font-bold opacity-90">Roar: {roars}</span>
            </button>
          ) : waveHere ? (
            <button onPointerDown={standUp} className="w-full max-w-sm h-24 rounded-3xl bg-amber-400 text-slate-950 text-2xl font-black shadow-2xl active:scale-95 animate-bounce">🙌 STAND UP NOW!</button>
          ) : chant ? (
            <button onPointerDown={tapChant} className="relative w-28 h-28 rounded-full bg-fuchsia-600 text-white font-black shadow-2xl active:scale-95">
              <ChantRing beats={chant.beats} />
              <span className="relative text-sm leading-tight px-2 block">🥁 {chant.words}</span>
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}

/** The chant's timing ring: it shrinks onto the button for each beat; tap as it lands. */
function ChantRing({ beats }: { beats: number[] }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => { let r = 0; const f = () => { setNow(performance.now()); r = requestAnimationFrame(f); }; r = requestAnimationFrame(f); return () => cancelAnimationFrame(r); }, []);
  const next = beats.find((b) => b > now - 150);
  if (next === undefined) return null;
  const p = Math.max(0, Math.min(1, (next - now) / 800));
  return <span className="absolute inset-0 rounded-full border-4 border-white/90 pointer-events-none" style={{ transform: `scale(${1 + p * 0.9})`, opacity: 1 - p * 0.5 }} />;
}

/** One frame of the match: the clock, the crowd's moments, the chances, the ball, the players and your view. */
interface MatchFrame { s: Sim; crowd: CrowdState; dt: number; t: number; playing: boolean; shapes: Array<Array<[number, number]>>; pos: THREE.Vector3[]; players: Array<THREE.Group | null>; ball: THREE.Group | null; look: THREE.Vector3; camera: THREE.Camera }
function matchFrame(f: MatchFrame) {
const { s, crowd, dt, t, playing, shapes, pos, players, ball, look, camera } = f;
  s.t = t;
  if (playing && !s.over) {
    s.minute += (dt * 90) / REAL_SECONDS;
    if (s.half === 1 && s.minute >= 45) { s.half = 2; s.events.push({ kind: "half" }); s.ball.set(0, 0.22, 0); s.target.set(0, 0.22, 0); s.carrier = { team: 1, i: 9 }; }
    if (s.minute >= 90) { s.over = true; s.events.push({ kind: "full" }); }
    // The crowd's moments, on their own clocks.
    if (t > s.nextChant) { s.events.push({ kind: "chant" }); s.nextChant = t + 16 + Math.random() * 8; }
    if (t > s.nextWave && s.waveStart === null) { s.waveStart = t; }
    if (s.waveStart !== null) {
      const a = ((t - s.waveStart) / 6) * Math.PI * 2 - Math.PI * 0.6;
      crowd.waveAt = a;
      // It reaches your seat (angle 0, on the near side) about a third of the way round.
      if (a > -0.15 && a < -0.15 + (dt / 6) * Math.PI * 2 + 0.001) s.events.push({ kind: "wave" });
      if (t - s.waveStart > 6) { s.waveStart = null; crowd.waveAt = null; s.nextWave = t + 26 + Math.random() * 10; }
    }
    // A big chance: decided when its window closes, by the roar for it.
    if (s.chance && t > s.chance.until) {
      const c = s.chance;
      const p = Math.min(0.75, 0.22 + c.roar * 0.03);
      const goal = Math.random() < p;
      const goalZ = c.team === 0 ? -PITCH.l / 2 : PITCH.l / 2;
      s.target.set((Math.random() - 0.5) * 5, goal ? 1 : 2.6, goalZ - Math.sign(goalZ) * (goal ? -0.6 : 0.3));
      s.speed = 30;
      if (goal) { s.score[c.team]++; s.events.push({ kind: "goal", team: c.team }); } else s.events.push({ kind: Math.random() < 0.6 ? "save" : "miss" });
      s.chance = null;
      s.carrier = { team: (1 - c.team) as 0 | 1, i: 0 };
    } else if (!s.chance && t > s.nextChance && s.minute > 3 && s.minute < 88) {
      const team: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
      s.chance = { team, until: t + 2.6, roar: 0 };
      s.carrier = { team, i: 9 };
      s.target.set((Math.random() - 0.5) * 14, 0.22, team === 0 ? -PITCH.l / 2 + 14 : PITCH.l / 2 - 14);
      s.speed = 11;
      s.events.push({ kind: "chance", team });
      s.nextChance = t + 9 + Math.random() * 9;
    }
    // The ball moves to its target; there, the carrier passes on (forwards, mostly).
    const toTarget = s.target.clone().sub(s.ball);
    const d = toTarget.length();
    if (d > 0.3) s.ball.addScaledVector(toTarget.normalize(), Math.min(d, s.speed * dt));
    else if (!s.chance) {
      const form = shapes[s.carrier.team];
      const fwd = s.carrier.team === 0 ? -1 : 1;
      // Lose it sometimes; otherwise pass to a teammate a bit further forward.
      if (Math.random() < 0.18) s.carrier = { team: (1 - s.carrier.team) as 0 | 1, i: 5 + Math.floor(Math.random() * 6) };
      else s.carrier = { team: s.carrier.team, i: 1 + Math.floor(Math.random() * 10) };
      const [fx, fz] = form[s.carrier.i] ?? [0, 0];
      const push = (s.ball.z * fwd) / (PITCH.l / 2);
      s.target.set(THREE.MathUtils.clamp(fx + (Math.random() - 0.5) * 10, -PITCH.w / 2 + 2, PITCH.w / 2 - 2), 0.22, THREE.MathUtils.clamp(fz * 0.8 + fwd * (6 + Math.random() * 12) + push * 4, -PITCH.l / 2 + 4, PITCH.l / 2 - 4));
      s.speed = 8 + Math.random() * 6;
    }
    if (s.ball.y > 0.22 && d < 0.3) s.ball.y = Math.max(0.22, s.ball.y - dt * 4);
  }
  // Players: their place in the shape, pulled towards the ball; the nearest of each team runs at it.
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 11; i++) {
      const k = team * 11 + i, p = pos[k], [fx, fz] = shapes[team][i];
      const keeper = i === 0;
      const tx = keeper ? THREE.MathUtils.clamp(s.ball.x * 0.2, -3, 3) : fx * 0.7 + s.ball.x * 0.3;
      const tz = keeper ? fz : fz * 0.6 + s.ball.z * 0.4;
      const chasing = s.carrier.team === team && s.carrier.i === i;
      const gx = chasing ? s.ball.x : tx, gz = chasing ? s.ball.z + (team === 0 ? 0.6 : -0.6) : tz;
      const vx = gx - p.x, vz = gz - p.z, len = Math.hypot(vx, vz);
      const sp = chasing ? 8 : 4.5;
      if (len > 0.05) { p.x += (vx / len) * Math.min(len, sp * dt); p.z += (vz / len) * Math.min(len, sp * dt); }
      const g = players[k];
      if (g) {
        g.position.set(p.x, Math.abs(Math.sin(t * 9 + k)) * (len > 0.3 ? 0.08 : 0), p.z);
        g.rotation.y = Math.atan2(vx, vz);
      }
    }
  }
  if (ball) ball.position.copy(s.ball);
  // The camera: your seat in the side stand, following the play a little.
  look.lerp(new THREE.Vector3(s.ball.x * 0.6, 0, s.ball.z * 0.7), 0.05);
  camera.position.set(PITCH.w / 2 + 22, 13, look.z * 0.25);
  camera.lookAt(look);
  applyShake(camera);
}

/** The fans in the seats beside and in front of yours: real people, who stand and wave when the crowd celebrates. */
const NEAR_FANS: Array<[number, number, number]> = [[0, 9.6, 2.75], [0, 9.6, 1.25], [0, 9.6, 3.5], [0, 9.6, 0.5], [-1.6, 8.55, 1.6], [-1.6, 8.55, 2.4], [-1.6, 8.55, 3.2]];
function Neighbours({ crowd }: { crowd: React.MutableRefObject<CrowdState> }) {
  const [cheering, setCheering] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setCheering(stageFx.clock < crowd.current.jumpUntil), 250);
    return () => clearInterval(t);
  }, [crowd]);
  return (
    <Suspense fallback={null}>
      {NEAR_FANS.map(([dx, y, z], i) => {
        const r = ROSTER[(i * 5 + 2) % ROSTER.length];
        return (
          <group key={i} position={[PITCH.w / 2 + 19 + dx, y, z]} rotation={[0, -Math.PI / 2, 0]}>
            <CitizenAvatar look={{ gender: r.gender, preset: r.id }} animation={cheering ? (i % 2 ? "wave" : "clap") : "sit"} />
          </group>
        );
      })}
    </Suspense>
  );
}

/** Plays the match in 3D: the players hold their shape and follow the ball, which is passed, dribbled and shot. */
function MatchWorld({ sim, crowd, playing, home, away }: { sim: React.MutableRefObject<Sim>; crowd: React.MutableRefObject<CrowdState>; playing: boolean; home: string; away: string }) {
  const camera = useThree((s) => s.camera);
  const players = useRef<Array<THREE.Group | null>>([]);
  const ballRef = useRef<THREE.Group | null>(null);
  const shapes = useMemo(() => [formation(0), formation(1)], []);
  const pos = useMemo(() => shapes.flatMap((f) => f.map(([x, z]) => new THREE.Vector3(x, 0, z))), [shapes]);
  const look = useMemo(() => new THREE.Vector3(), []);
  const { citizen } = useCitizen();

  useGameFrame((dt, t) => matchFrame({ s: sim.current, crowd: crowd.current, dt, t, playing, shapes, pos, players: players.current, ball: ballRef.current, look, camera }));

  return (
    <group>
      {pos.map((_, k) => {
        const team = k < 11 ? 0 : 1, i = k % 11;
        const kit = kitOf(team === 0 ? home : away);
        return <group key={k} ref={(g) => { players.current[k] = g; }}><Player kit={kit.kit} shorts={kit.shorts} keeper={i === 0} skin={["#c58c5a", "#8d5524", "#e0ac69", "#f1c27d"][k % 4]} /></group>;
      })}
      <Ball at={ballRef} />
      {/* You, in your seat in the stand, with real fans round you. */}
      <group position={[PITCH.w / 2 + 19, 9.6, 2]} rotation={[0, -Math.PI / 2, 0]}>
        <CitizenAvatar look={citizen?.look ?? { gender: "man" }} animation="sit" />
      </group>
      <Neighbours crowd={crowd} />
    </group>
  );
}
