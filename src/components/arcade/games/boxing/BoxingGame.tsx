"use client";

// Celebrity Boxing at Coca-Cola Arena: a live 3-round fight, read the opponent's tells, slip and duck, counter
// for double damage, land the star punch, get up off the canvas. Two ways in: the career ladder (nine Local
// fighters, one rung per level) or a challenge to another player, who is fought as a stand-in at their real
// fitness level. The fight logic is fight.ts; this file is the scene, the camera, the controls and the HUD.

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { useGameProgress } from "@/lib/arcade";
import { skillLevel, skillXp } from "@/lib/life";
import { bodyOf, boxingBonus } from "@/lib/body";
import { supabase } from "@/lib/supabase/client";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Meter, Pill, useCallouts } from "../../hud";
import { applyShake, shake, slowMo, useGameFrame } from "../../stage";
import { Arena } from "./Arena";
import { Boxer } from "./Boxer";
import { MoveStick } from "@/components/street/StreetWorld";
import { FIGHT_RULES, facing, levelFor, newFight, scoreFight, step, type Dodge, type FightEvent, type FightInput, type FightState, type Punch } from "./fight";

interface Opponent { name: string; username?: string; look?: AvatarLookProps; local: boolean }
/** Input waiting for the next fight step: one-shot punches and dodges, and the held block. */
type Queued = FightInput & { punchQ?: Punch; dodgeQ?: Dodge; starQ?: boolean };

const GLOVES_KEY = "dubailife:boxing-gloves";
/** The punch buttons, bottom right. */
const PUNCH_PAD: Array<{ punch: Punch; icon: string; label: string }> = [
  { punch: "straight", icon: "👊", label: "Punch" },
  { punch: "onetwo", icon: "👊👊", label: "One-two" },
  { punch: "upper", icon: "⬆️", label: "Uppercut" },
  { punch: "body", icon: "🎯", label: "Body shot" },
];
/** Footwork keys held down (WASD), read by the fight clock each frame. */
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const keysHeld = new Set<string>();
const readGlove = () => { try { return localStorage.getItem(GLOVES_KEY); } catch { return null; } };
const saveGlove = (id: string) => { try { localStorage.setItem(GLOVES_KEY, id); } catch { /* private window */ } };

/** A challenged player's stand-in fights at their real level: fitness sets hands and stamina, gaming how well they read you. */
const levelFromSkills = (fitness: number, gaming: number) => Math.max(1, Math.min(9, 2 + Math.floor(fitness * 0.5 + gaming * 0.2)));

export default function BoxingGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("boxing");
  const challenge = params?.opponent as { username?: string; name?: string; look?: AvatarLookProps } | undefined;
  const [standIn, setStandIn] = useState<number | null>(null);
  const [rung, setRung] = useState<number | null>(null);
  const [gloveId, setGloveId] = useState<string>(() => readGlove() ?? "red");
  const gender = citizen?.look?.gender === "man" ? "man" : "woman";

  // The challenged player's skills, for their stand-in's level.
  useEffect(() => {
    if (!challenge?.username) return;
    let live = true;
    void supabase().from("profiles").select("citizen").eq("username", challenge.username).maybeSingle().then(({ data }) => {
      const skills = (data?.citizen as { life?: { skills?: Record<string, { xp: number; lastUsed: string }> } } | null)?.life?.skills ?? {};
      const lv = (id: string) => skillLevel(skillXp(skills[id])).level;
      if (live) setStandIn(levelFromSkills(lv("fitness"), lv("gaming")));
    });
    return () => { live = false; };
  }, [challenge?.username]);

  const unlocked = Math.min(FIGHT_RULES.levels.length, progress.level + 1);
  const careerLevel = rung ?? unlocked;
  const level = challenge ? (standIn ?? 3) : careerLevel;
  const opponent: Opponent = useMemo(() => {
    if (challenge) return { name: challenge.name ?? `@${challenge.username}`, username: challenge.username, look: challenge.look, local: false };
    const c = FIGHT_RULES.career[careerLevel - 1][gender];
    return { name: c.name, look: { gender, preset: c.preset }, local: true };
  }, [challenge, careerLevel, gender]);
  const gloves = FIGHT_RULES.gloves.filter((g) => g.level <= progress.level);
  const glove = (gloves.find((g) => g.id === gloveId) ?? gloves[0] ?? FIGHT_RULES.gloves[0]).color;

  return (
    <GameShell
      game="boxing"
      title={challenge ? `You vs ${opponent.name}` : "Celebrity Boxing"}
      venue="Coca-Cola Arena"
      howTo={[
        { icon: "👀", text: "Watch for the tell: a glowing glove and a dipped shoulder mean a punch is coming. A crouch means an uppercut." },
        { icon: "↔️", text: "Swipe to a screen edge to slip away from it (or ◀ ▶). Swipe down to duck. Ducking an uppercut hurts." },
        { icon: "💥", text: "Dodge just in time and the opponent is open: punch now for double damage and charge your star punch." },
        { icon: "👊", text: "Punch pad: Punch, One-two (left then right, two hits), Uppercut and Body shot. Or tap the ring: left for a jab, right for a straight, swipe sideways for a hook, up for an uppercut. Hold two fingers to block." },
        { icon: "🎯", text: "Body shots are hard to block and wind them: their next wind-ups come slower. A one-two's second punch often gets through a guard." },
        { icon: "🕹️", text: "Move with the stick (WASD on a keyboard): push up to step in, sideways to circle. Punches only land in range, and moving off a punch's line makes it miss. Hooks follow you, so slip those." },
        { icon: "🪢", text: "Don't get pinned on the ropes: every punch hurts more there. Moving costs a little stamina." },
        { icon: "😮‍💨", text: "Punching into a guard gets punished, and a tired boxer hits soft. Pick your moments." },
      ]}
      levels={challenge ? undefined : FIGHT_RULES.career.map((c) => ({ n: c.n, label: FIGHT_RULES.levels[c.n - 1].label }))}
      onLevel={setRung}
      onClose={onClose}
      onShare={onShare}
      intro={
        <div className="space-y-2">
          <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-3">
            <span className="text-3xl">🥊</span>
            <div className="min-w-0">
              <p className="font-black truncate">{opponent.name}</p>
              {opponent.local
                ? <p className="text-xs text-white/60"><span className="rounded bg-amber-400/90 text-amber-950 px-1.5 py-0.5 text-[10px] font-black mr-1">Local</span>{FIGHT_RULES.levels[level - 1].label} · level {level}</p>
                : <p className="text-xs text-white/60">Their stand-in, fighting at their real fitness · level {standIn ?? "…"}</p>}
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-[10px] font-black uppercase text-white/50 mr-1">Gloves</span>
            {FIGHT_RULES.gloves.map((g) => {
              const open = g.level <= progress.level;
              return (
                <button key={g.id} disabled={!open} onClick={() => { setGloveId(g.id); saveGlove(g.id); }} title={open ? g.label : `Win level ${g.level} to unlock`}
                  className={`w-8 h-8 rounded-full border-2 ${g.color === glove ? "border-white scale-110" : "border-white/20"} ${open ? "" : "opacity-30"}`} style={{ background: g.color }} aria-label={g.label} />
              );
            })}
          </div>
        </div>
      }
    >
      {(api) => <Bout key={`${level}:${opponent.name}`} api={api} level={level} me={citizen?.look} myName={citizen?.username ? `@${citizen.username}` : "You"} opponent={opponent} glove={glove} career={!challenge} body={boxingBonus(bodyOf(citizen))} />}
    </GameShell>
  );
}

// ---------------------------------------------------------------- the bout

interface Hud {
  me: number; myStamina: number; staminaMax: number; op: number; opMax: number; star: number; round: number; clock: number;
  phase: FightState["phase"]; getUp: FightState["getUp"]; combo: number; open: boolean;
}

function Bout({ api, level, me, myName, opponent, glove, career, body }: { api: ShellApi; level: number; me?: AvatarLookProps; myName: string; opponent: Opponent; glove: string; career: boolean; body: { stamina: number; power: number } }) {
  const lv = levelFor(level);
  const [initial] = useState(() => newFight(lv, body));
  const opMax = initial.op.hp;
  const fightRef = useRef<FightState>(initial);
  const inputRef = useRef<Queued>({ blocking: false, taps: 0 });
  // The analog stick: footwork round the ring (MoveStick writes x, y in -1..1; up = in towards them).
  const stickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const eventsRef = useRef<FightEvent[]>([]);
  const hypeRef = useRef(0);
  const [hud, setHud] = useState<Hud>(() => snapshot(initial, opMax));
  const callouts = useCallouts();
  const ended = useRef(false);
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; });

  // Read the fight for the HUD a few times a second, and turn its events into callouts.
  useEffect(() => {
    const id = setInterval(() => {
      setHud(snapshot(fightRef.current, opMax));
      for (const e of eventsRef.current.splice(0)) {
        const text = calloutFor(e, fightRef.current);
        if (text) callouts.push(text.text, text.tone);
      }
      const s = fightRef.current;
      if (s.phase === "over" && !ended.current) {
        ended.current = true;
        // A beat to watch the finish, then the result card.
        setTimeout(() => {
          const { score, stars } = scoreFight(s);
          const r = s.result!;
          const how = r.method === "Decision" ? "on points" : `by ${r.method} in round ${r.round}`;
          apiRef.current.finish({
            score, stars, level: career && r.win ? level : 0,
            headline: r.win ? (r.method === "Decision" ? "You win on points!" : `${r.method}! You win in round ${r.round}`) : `${opponent.name} wins ${how}`,
            stats: [
              { label: "Landed", value: `${s.stats.landed}/${s.stats.thrown}` },
              { label: "Counters", value: String(s.stats.counters) },
              { label: "Dodged", value: String(s.stats.dodged) },
            ],
            share: r.win ? `🥊 I beat ${opponent.name} ${how} at Coca-Cola Arena on Dubai Life` : `🥊 I went the distance with ${opponent.name} at Coca-Cola Arena on Dubai Life`,
          });
        }, 2600);
      }
    }, 90);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one ticker for the bout; it reads refs
  }, []);

  // Keyboard: WASD footwork, J jab, K straight, L one-two, B body shot, U/I hooks, O uppercut, Space star, Shift block, ←/Q ↓/C →/E dodges.
  useEffect(() => {
    const keys: Record<string, () => void> = {
      KeyJ: () => { inputRef.current.punchQ = "jab"; }, KeyK: () => { inputRef.current.punchQ = "straight"; },
      KeyL: () => { inputRef.current.punchQ = "onetwo"; }, KeyB: () => { inputRef.current.punchQ = "body"; },
      KeyU: () => { inputRef.current.punchQ = "hookL"; }, KeyI: () => { inputRef.current.punchQ = "hookR"; }, KeyO: () => { inputRef.current.punchQ = "upper"; },
      Space: () => { inputRef.current.starQ = true; },
      ArrowLeft: () => { inputRef.current.dodgeQ = "slipL"; }, KeyQ: () => { inputRef.current.dodgeQ = "slipL"; },
      ArrowRight: () => { inputRef.current.dodgeQ = "slipR"; }, KeyE: () => { inputRef.current.dodgeQ = "slipR"; },
      ArrowDown: () => { inputRef.current.dodgeQ = "duck"; }, KeyC: () => { inputRef.current.dodgeQ = "duck"; },
    };
    const down = (e: KeyboardEvent) => {
      if (MOVE_KEYS.has(e.code)) { keysHeld.add(e.code); e.preventDefault(); return; }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") { inputRef.current.blocking = true; return; }
      if (fightRef.current.phase === "meDown") { inputRef.current.taps++; return; }
      if (e.repeat) return;
      const f = keys[e.code];
      if (f) { e.preventDefault(); f(); }
    };
    const up = (e: KeyboardEvent) => { keysHeld.delete(e.code); if (e.code === "ShiftLeft" || e.code === "ShiftRight") inputRef.current.blocking = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { keysHeld.clear(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Touch: taps, swipes and two-finger block over the whole ring.
  const pointers = useRef(new Map<number, { x: number; y: number; t: number }>());
  const onDown = (e: ReactPointerEvent) => {
    if (fightRef.current.phase === "meDown") { inputRef.current.taps++; haptic(6); return; }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (pointers.current.size >= 2) inputRef.current.blocking = true;
  };
  const onUp = (e: ReactPointerEvent) => {
    const start = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (inputRef.current.blocking) { if (pointers.current.size < 2) inputRef.current.blocking = false; return; }
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, w = window.innerWidth;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) inputRef.current.punchQ = e.clientX < w / 2 ? "jab" : "straight";
    else if (Math.abs(dy) > Math.abs(dx)) { if (dy < 0) inputRef.current.punchQ = "upper"; else inputRef.current.dodgeQ = "duck"; }
    else if (e.clientX < w * 0.14) inputRef.current.dodgeQ = "slipL";
    else if (e.clientX > w * 0.86) inputRef.current.dodgeQ = "slipR";
    else inputRef.current.punchQ = dx < 0 ? "hookR" : "hookL";
  };
  // The buttons (they stop the press reaching the gesture layer underneath).
  const onSlipL = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.dodgeQ = "slipL"; haptic(5); };
  const onDuck = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.dodgeQ = "duck"; haptic(5); };
  const onSlipR = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.dodgeQ = "slipR"; haptic(5); };
  const onStar = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.starQ = true; haptic(5); };
  // The punch pad: one punch, the one-two, the uppercut and the body shot.
  const onPunch = (e: ReactPointerEvent<HTMLButtonElement>) => { e.stopPropagation(); inputRef.current.punchQ = e.currentTarget.dataset.punch as Punch; haptic(5); };
  const onBlockDown = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.blocking = true; };
  const onBlockUp = (e: ReactPointerEvent) => { e.stopPropagation(); inputRef.current.blocking = false; };
  const stopHere = (e: ReactPointerEvent) => e.stopPropagation();

  const playing = api.phase === "play";
  const s = hud;
  const clock = Math.max(0, Math.ceil(FIGHT_RULES.roundSeconds - s.clock));

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [1.05, 2.25, 4.1], fov: 48 }} background="#05070d" environment={0.2}>
        <Arena hypeRef={hypeRef} />
        <group position={[0, 0.205, 0]}>
          <Boxer side="me" look={me} fightRef={fightRef} glove={glove} />
          <Boxer side="op" look={opponent.look} fightRef={fightRef} glove={opponent.local ? "#111827" : "#7c3aed"} />
        </group>
        <Director fightRef={fightRef} inputRef={inputRef} eventsRef={eventsRef} hypeRef={hypeRef} level={lv} playing={playing} stickRef={stickRef} />
      </GameStage>

      {/* Gestures over the ring */}
      <div className="absolute inset-0 z-10 touch-none" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} />

      {/* Top: both fighters, the round and the clock */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 grid grid-cols-[1fr_auto_1fr] gap-2 items-start pointer-events-none">
        <div className="space-y-1">
          <p className="text-[11px] font-black truncate">{myName}</p>
          <Meter value={s.me / FIGHT_RULES.hp} color="#22c55e" />
          <Meter value={s.myStamina / s.staminaMax} color="#38bdf8" warnBelow={FIGHT_RULES.stamina.tiredBelow / s.staminaMax} />
        </div>
        <div className="text-center pt-0.5">
          <Pill value={`R${s.round} · ${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, "0")}`} />
          {s.combo >= 3 && <p className="mt-1 text-amber-300 font-black text-sm">x{s.combo}</p>}
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[11px] font-black truncate">{opponent.local && <span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[9px] mr-1">Local</span>}{opponent.name}</p>
          <Meter value={s.op / s.opMax} color="#ef4444" flip />
          {s.open && <p className="text-[10px] font-black text-emerald-300 animate-pulse">OPEN · counter now!</p>}
        </div>
      </div>

      {callouts.node}

      {/* Bottom: the dodges over the footwork stick on the left; the punches, block and star punch on the right */}
      {playing && (s.phase === "fight") && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] flex items-end justify-between pointer-events-none">
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
            <div className="flex gap-1">
              <button onPointerDown={onSlipL} className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur font-black text-base" aria-label="Slip left">◀</button>
              <button onPointerDown={onDuck} className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur font-black text-base" aria-label="Duck">▼</button>
              <button onPointerDown={onSlipR} className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur font-black text-base" aria-label="Slip right">▶</button>
            </div>
            <div onPointerDown={stopHere} onPointerUp={stopHere}>
              <MoveStick controls={stickRef} allowRun={false} scale={0.75} label={false} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {PUNCH_PAD.map((b) => (
              <button key={b.punch} data-punch={b.punch} onPointerDown={onPunch} aria-label={b.label}
                className="h-12 w-[5.25rem] rounded-2xl bg-rose-600/85 backdrop-blur font-black text-[11px] leading-tight flex flex-col items-center justify-center active:scale-95">
                <span className="text-base leading-none">{b.icon}</span>{b.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 items-end">
            <button
              onPointerDown={onBlockDown}
              onPointerUp={onBlockUp}
              onPointerLeave={onBlockUp}
              className="h-12 px-3 rounded-2xl bg-sky-500/80 font-black text-xs" aria-label="Block (hold)">🛡️ BLOCK</button>
          <button
            onPointerDown={onStar}
            disabled={s.star < 1}
            className={`pointer-events-auto w-16 h-16 rounded-full font-black text-2xl border-4 transition ${s.star >= 1 ? "bg-amber-400 border-amber-200 animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.8)]" : "bg-black/50 border-white/15"}`}
            style={s.star < 1 ? { background: `conic-gradient(#fbbf24 ${s.star * 360}deg, rgba(0,0,0,0.5) 0deg)` } : undefined}
            aria-label="Star punch">⭐</button>
          </div>
          </div>
        </div>
      )}

      {/* On the canvas: tap to get up before ten */}
      {s.phase === "meDown" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-red-950/30 pointer-events-none">
          <p className="text-7xl font-black tabular-nums drop-shadow-lg">{s.getUp.count}</p>
          <p className="text-2xl font-black animate-pulse">TAP TAP TAP to get up!</p>
          <div className="w-64"><Meter value={s.getUp.taps / Math.max(1, s.getUp.need)} color="#facc15" warnBelow={0} /></div>
        </div>
      )}
      {s.phase === "opDown" && (
        <div className="absolute inset-x-0 top-[38%] z-30 text-center pointer-events-none">
          <p className="text-6xl font-black tabular-nums drop-shadow-lg">{s.getUp.count}</p>
          <p className="text-lg font-black text-amber-300">Stay down…</p>
        </div>
      )}
      {s.phase === "rest" && (
        <div className="absolute inset-x-0 top-[34%] z-30 text-center pointer-events-none">
          <p className="text-4xl font-black drop-shadow-lg">End of round {s.round}</p>
          <p className="text-sm text-white/70 mt-1">Catch your breath. Round {s.round + 1} next.</p>
        </div>
      )}
      {playing && s.round === 1 && s.clock < 6 && s.phase === "fight" && (
        <p className="absolute inset-x-0 bottom-[14rem] z-20 text-center text-xs text-white/75 pointer-events-none px-4">Stick: move and circle · pad: punch, one-two, uppercut, body shot · swipe sideways: hook</p>
      )}
    </div>
  );
}

function snapshot(s: FightState, opMax: number): Hud {
  return { me: s.me.hp, myStamina: s.me.stamina, staminaMax: FIGHT_RULES.stamina.max * s.myStamina, op: s.op.hp, opMax, star: s.star, round: s.round, clock: s.phase === "fight" ? s.t : s.clockAtCount, phase: s.phase, getUp: { ...s.getUp }, combo: s.combo, open: s.t < s.openUntil && s.phase === "fight" };
}

function calloutFor(e: FightEvent, s: FightState): { text: string; tone: "good" | "great" | "bad" | "info" } | null {
  switch (e.kind) {
    case "counter": return { text: `COUNTER! -${e.amount}`, tone: "great" };
    case "dodged": return { text: e.text === "duck" ? "DUCKED!" : e.text === "range" ? "MISSED YOU!" : "SLIPPED!", tone: "good" };
    case "interrupt": return { text: "INTERRUPTED!", tone: "great" };
    case "star": return { text: `⭐ STAR PUNCH -${e.amount}`, tone: "great" };
    case "knockdown": return e.who === "op" ? { text: "KNOCKDOWN!", tone: "great" } : { text: "YOU'RE DOWN!", tone: "bad" };
    case "ko": return e.who === "me" ? { text: s.result?.method === "TKO" ? "TKO!" : "KNOCKOUT!", tone: "great" } : { text: "KNOCKED OUT", tone: "bad" };
    case "decision": return { text: s.result?.win ? "YOU WIN ON POINTS" : "LOST ON POINTS", tone: s.result?.win ? "great" : "bad" };
    case "tired": return { text: "Tired… breathe", tone: "info" };
    case "feint": return { text: "Feint!", tone: "info" };
    case "whiff": return { text: "Out of range: step in", tone: "info" };
    case "ropes": return { text: "On the ropes! Move!", tone: "bad" };
    case "bell": return e.text?.startsWith("Round") ? { text: `🔔 ${e.text.toUpperCase()}`, tone: "info" } : null;
    case "body": return { text: `BODY SHOT! -${e.amount} · winded`, tone: "good" };
    case "hit": return s.combo >= 4 && s.combo % 2 === 0 ? { text: `x${s.combo} COMBO`, tone: "good" } : null;
    default: return null;
  }
}

// ---------------------------------------------------------------- inside the canvas: the fight clock, effects and camera

function Director({ fightRef, inputRef, eventsRef, hypeRef, level, playing, stickRef }: {
  stickRef: RefObject<{ x: number; y: number }>;
  fightRef: RefObject<FightState>;
  inputRef: RefObject<Queued>;
  eventsRef: RefObject<FightEvent[]>;
  hypeRef: RefObject<number>;
  level: ReturnType<typeof levelFor>;
  playing: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0, 1.4, -0.6), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const orbit = useRef(0);

  useGameFrame((dt, t) => {
    const s = fightRef.current, inp = inputRef.current;
    if (playing && s.phase !== "over") {
      // The stick, or WASD on a keyboard.
      const k = keysHeld, kx = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0), ky = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
      const move = kx || ky ? { x: kx, y: ky } : { x: stickRef.current?.x ?? 0, y: stickRef.current?.y ?? 0 };
      const step_in: FightInput = { punch: inp.punchQ, dodge: inp.dodgeQ, star: inp.starQ, blocking: inp.blocking, taps: inp.taps, move };
      inp.punchQ = undefined; inp.dodgeQ = undefined; inp.starQ = undefined; inp.taps = 0;
      step(s, dt, step_in, level);
      for (const e of s.events) {
        eventsRef.current.push(e);
        switch (e.kind) {
          case "body": sfx("mgKick"); shake(0.05); hypeRef.current = Math.min(1, hypeRef.current + 0.08); break;
          case "hit": sfx("mgThud"); if (s.combo >= 2) sfx(`mgHit${Math.min(7, s.combo)}`); shake(0.03); hypeRef.current = Math.min(1, hypeRef.current + 0.05); break;
          case "counter": sfx("mgPerfect"); shake(0.08); hypeRef.current = Math.min(1, hypeRef.current + 0.2); haptic(15); break;
          case "star": sfx("mgStar"); slowMo(0.2, 0.9); shake(0.22); hypeRef.current = 1; haptic(40); break;
          case "taken": sfx("mgThud"); shake(0.12); haptic(25); break;
          case "blocked": sfx("clack"); break;
          case "dodged": sfx("mgHit3"); hypeRef.current = Math.min(1, hypeRef.current + 0.08); break;
          case "interrupt": sfx("mgPerfect"); break;
          case "knockdown": sfx("roar"); slowMo(0.25, 1.4); shake(0.3); hypeRef.current = 1; haptic(60); break;
          case "ko": sfx("airhorn"); sfx("applause"); slowMo(0.3, 1.6); hypeRef.current = 1; break;
          case "decision": sfx("applause"); hypeRef.current = 0.8; break;
          case "bell": sfx("chime"); break;
          case "feint": case "tired": case "ropes": sfx("warn"); break;
          case "whiff": sfx("rustle"); break;
          default: break;
        }
      }
    }

    // The camera: over your shoulder, following your slips; circling the ring once the fight is over.
    if (s.phase === "over") {
      orbit.current += dt * 0.35;
      target.set(Math.sin(orbit.current) * 3.4, 2.1, Math.cos(orbit.current) * 3.4);
      look.set(0, 1.2, 0);
    } else {
      const slip = s.dodge && s.dodge.move !== "duck" ? (s.dodge.move === "slipL" ? -0.25 : 0.25) : 0;
      const duck = s.dodge?.move === "duck" ? -0.2 : 0;
      const down = s.phase === "meDown" ? 0.5 : 0;
      // Back and to the right of your shoulder, so the opponent (and their tells) stay in clear view, turning
      // with you as you circle.
      const { fx, fz } = facing(s);
      const rx = -fz, rz = fx;
      const [mx, mz] = s.pos.me, [ox, oz] = s.pos.op;
      const back = 3.48 + down, right = 1.05 + slip;
      // Kept out of the crowd (within 4.4 m of the middle), and lifted over a corner post when it swings near one.
      let cx = mx - fx * back + rx * right, cz = mz - fz * back + rz * right;
      const r = Math.hypot(cx, cz);
      if (r > 4.4) { cx *= 4.4 / r; cz *= 4.4 / r; }
      const post = Math.hypot(Math.abs(cx) - 2.6, Math.abs(cz) - 2.6);
      const lift = Math.max(0, 1.3 - post) * 1.4;
      target.set(cx, 2.25 + duck + down + lift + Math.sin(t * 1.3) * 0.02, cz);
      look.set(ox - rx * 0.2, 1.25, oz - rz * 0.2);
    }
    camera.position.lerp(target, Math.min(1, dt * (s.phase === "over" ? 1.5 : 8)));
    camera.lookAt(look);
    applyShake(camera);
  });
  return null;
}
