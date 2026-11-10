"use client";

// The birth, in the delivery suite: contractions rise and fall on a wave. Between them, breathe with the guide
// (hold on the breath in, let go on the breath out) to stay calm; at each peak, push while the midwife's cue
// is in the green band, which is wider the calmer you are. Your partner squeezes your hand to calm the wave.
// When the baby comes the screen fades to white, then the baby is in your arms and you name them. Nothing is
// graphic; the camera stays on faces and hands. Played by the mother; the baby is born on time anyway if she
// never comes in (the hospital just adds the birth story and a healthy start).

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type ArmRig } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { deliverBaby, nameChild, useFamily, type Child } from "@/lib/love";
import { starsFor } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Meter, Pill, useCallouts } from "../../hud";
import { applyShake, slowMo, useGameFrame } from "../../stage";
import { Bed, ClinicRoom, demoChild, expecting, HOSPITAL_NAMES, labourOpensAt } from "./Clinic";

/** The top of a contraction, when pushing counts. About six good contractions bring the baby (around a minute). */
const PEAK = 0.6;
const MIDWIFE = { name: "Midwife Aisha", look: { gender: "woman" as const, preset: "Female_Adult_06" } };

export default function LabourGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const family = useFamily(citizen?.id);
  const hospital = (params?.hospital as string) ?? "latifa-hospital";
  const [now] = useState(() => Date.now());
  const child = demoChild(params, citizen?.id ?? "demo", [1, 2, 3]) ?? expecting(family?.children, citizen?.id);
  const mother = child && (citizen?.id ?? "demo") === child.mother.id;
  const opens = child ? labourOpensAt(child) : 0;
  const blocked = !family && !params?.demo ? "Checking your family…"
    : !child ? "The delivery suite is for mothers in labour. Start a family in the Family app."
    : !mother ? `The mother delivers the baby. Be there with @${child.mother.username} when it's time.`
    : now < opens ? `Not yet. Labour can start from ${new Date(opens).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.`
    : null;

  return (
    <GameShell
      game="labour"
      title="The birth"
      venue={HOSPITAL_NAMES[hospital]}
      howTo={[
        { icon: "🌬️", text: "Between contractions, breathe with the guide: hold on the breath in, let go on the breath out. Calm makes everything easier." },
        { icon: "💪", text: "At each peak, hold PUSH while the midwife's cue is in the green. Pushing out of time just tires you." },
        { icon: "🤝", text: "Tap Hold hands during a contraction: your partner's squeeze calms the wave." },
      ]}
      blocked={blocked}
      onClose={onClose}
      onShare={onShare}
    >
      {(api) => child && mother ? <Labour api={api} child={child} hospital={hospital} mumLook={citizen?.look} partnerLook={child.father.look} partner={child.father.username} /> : null}
    </GameShell>
  );
}

interface LabourState {
  t: number;
  progress: number;      // 0..100, to the birth
  calm: number;          // 0..1
  energy: number;        // 0..1
  contraction: number;   // 0..1 now
  breathIn: boolean;     // the guide says breathe in now
  syncFrames: number; totalFrames: number;
  pushGood: number; pushBad: number;
  cue: number;           // the midwife's cue, 0..1 across the gauge
  squeezeAt: number;
  born: boolean; bornAt: number;
  calmSum: number;
}

/** The contraction wave: closer together and stronger as labour goes on. */
function contractionAt(t: number) {
  const period = Math.max(6, 11 - t * 0.06);
  const phase = (t % period) / period;
  const strength = Math.min(1, 0.7 + t * 0.006);
  return phase < 0.55 ? Math.pow(Math.sin((phase / 0.55) * Math.PI), 2) * strength : 0;
}

function Labour({ api, child, hospital, mumLook, partnerLook, partner }: { api: ShellApi; child: Child; hospital: string; mumLook?: AvatarLookProps; partnerLook?: AvatarLookProps; partner: string }) {
  const [initial] = useState<LabourState>(() => ({ t: 0, progress: 0, calm: 0.6, energy: 1, contraction: 0, breathIn: true, syncFrames: 0, totalFrames: 0, pushGood: 0, pushBad: 0, cue: 0.5, squeezeAt: -9, born: false, bornAt: 0, calmSum: 0 }));
  const stateRef = useRef<LabourState>(initial);
  const inputRef = useRef({ breath: false, push: false, squeeze: false });
  const [view, setView] = useState<LabourState>(initial);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const callouts = useCallouts();
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; });
  const playing = api.phase === "play";
  const scoreRef = useRef(0);

  useEffect(() => {
    let raf = 0, said = 0;
    const loop = () => {
      const s = stateRef.current;
      setView({ ...s });
      if (s.born && !said) {
        said = 1;
        const calm = s.calmSum / Math.max(1, s.totalFrames);
        const pushAcc = s.pushGood / Math.max(1, s.pushGood + s.pushBad);
        scoreRef.current = Math.round(calm * 40 + pushAcc * 40 + Math.max(0, 20 - Math.max(0, s.t - 60) / 3));
        void deliverBaby(child.id, hospital, scoreRef.current);
        setTimeout(() => setNaming(true), 2600);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one loop per birth; it reads refs
  }, []);

  const done = () => {
    const n = name.trim();
    if (n) void nameChild(child.id, n);
    const s = stateRef.current;
    const who = n || (child.gender === "girl" ? "our baby girl" : "our baby boy");
    apiRef.current.finish({
      score: scoreRef.current, stars: starsFor(scoreRef.current, [40, 62, 80]),
      headline: `Welcome to the world, ${n || "little one"} 💕`,
      stats: [{ label: "Calm", value: `${Math.round((s.calmSum / Math.max(1, s.totalFrames)) * 100)}%` }, { label: "Good pushes", value: String(s.pushGood) }, { label: "Time", value: `${Math.round(s.t)}s` }],
      share: `👶 Welcome ${who}! Born at ${HOSPITAL_NAMES[hospital]} on Dubai Life 💕`,
    });
  };

  const hold = (key: "breath" | "push", on: boolean) => { inputRef.current[key] = on; if (on) haptic(5); };
  const onBreathDown = () => hold("breath", true);
  const onBreathUp = () => hold("breath", false);
  const onPushDown = () => hold("push", true);
  const onPushUp = () => hold("push", false);
  const onSqueeze = () => { inputRef.current.squeeze = true; haptic(12); };

  const s = view;
  const band = 0.18 + s.calm * 0.22;
  const peak = s.contraction > PEAK;

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [1.6, 1.7, 1.9], fov: 46 }} background="#e2e8f0" environment={0.5}>
        <ClinicRoom accent="#0ea5e9" />
        <Bed position={[0, 0, -0.4]} />
        <Family stateRef={stateRef} mumLook={mumLook} partnerLook={partnerLook} />
        <group position={[1.35, 0, 0.35]} rotation={[0, -2.3, 0]}><CitizenAvatar look={MIDWIFE.look} animation="talk" /></group>
        <LabourTicker stateRef={stateRef} inputRef={inputRef} playing={playing && !s.born} onFlash={(text, tone) => callouts.push(text, tone)} />
      </GameStage>

      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 space-y-1.5 pointer-events-none">
        <div className="flex gap-2"><Pill icon="👶" value={`${Math.round(s.progress)}%`} tone="gold" /><Pill value={<span><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[9px] mr-1">Local</span>{MIDWIFE.name}</span>} /></div>
        <Meter label="Calm" value={s.calm} color="#38bdf8" />
        <Meter label="Energy" value={s.energy} color="#22c55e" />
      </div>
      {callouts.node}

      {!s.born && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2">
          {/* The contraction wave and, at its peak, the midwife's cue */}
          <div className="rounded-2xl bg-black/55 p-2.5 space-y-1.5 pointer-events-none">
            <Meter label={peak ? "Contraction: PUSH with the cue!" : s.contraction > 0.2 ? "Contraction building… breathe" : "Rest and breathe"} value={s.contraction} color={peak ? "#f43f5e" : "#a78bfa"} warnBelow={0} />
            {peak && (
              <div className="relative h-6 rounded-full bg-white/10 overflow-hidden">
                <div className="absolute inset-y-0 bg-emerald-500/60" style={{ left: `${(0.5 - band / 2) * 100}%`, width: `${band * 100}%` }} />
                <div className="absolute inset-y-0 w-1.5 bg-white" style={{ left: `calc(${s.cue * 100}% - 3px)` }} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onPointerDown={onBreathDown} onPointerUp={onBreathUp} onPointerLeave={onBreathUp}
              className={`h-20 rounded-2xl font-black text-sm transition ${s.breathIn ? "bg-sky-400 text-sky-950 scale-105" : "bg-sky-900 text-sky-200 scale-95"}`}>
              🌬️ {s.breathIn ? "Breathe in (hold)" : "Breathe out (let go)"}
            </button>
            <button onPointerDown={onSqueeze} className="h-20 rounded-2xl bg-amber-400/90 text-amber-950 font-black text-sm">🤝 Hold hands<span className="block text-[10px] font-bold">@{partner}</span></button>
            <button onPointerDown={onPushDown} onPointerUp={onPushUp} onPointerLeave={onPushUp}
              className={`h-20 rounded-2xl font-black text-lg ${peak ? "bg-rose-500 animate-pulse" : "bg-rose-950/70 text-rose-200"}`}>💪 PUSH</button>
          </div>
        </div>
      )}

      {/* The moment: white, then the baby, then a name */}
      {s.born && (
        <div className="absolute inset-0 z-30 pointer-events-none bg-white animate-[arcade-fade_2.6s_ease-out_forwards]" />
      )}
      {naming && (
        <div className="absolute inset-x-0 bottom-0 z-40 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 to-transparent space-y-3">
          <p className="text-2xl font-black text-center">It&apos;s a {child.gender}! 💕</p>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="Their name"
            className="w-full h-12 rounded-2xl px-4 text-slate-900 font-bold" />
          <button onClick={done} className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black">{name.trim() ? `Welcome, ${name.trim()}` : "Name them later"}</button>
        </div>
      )}
    </div>
  );
}

/** Inside the canvas: the wave, breathing, pushing and the partner's squeeze, then the birth. */
function LabourTicker({ stateRef, inputRef, playing, onFlash }: { stateRef: RefObject<LabourState>; inputRef: RefObject<{ breath: boolean; push: boolean; squeeze: boolean }>; playing: boolean; onFlash: (text: string, tone: "good" | "great" | "bad" | "info") => void }) {
  const camera = useThree((st) => st.camera);
  const look = useMemo(() => new THREE.Vector3(-0.5, 1.1, -0.4), []);
  const home = useMemo(() => new THREE.Vector3(1.6, 1.7, 1.9), []);
  const cueRef = useRef({ v: 0.5, dir: 1 });
  const flashed = useRef(0);
  useGameFrame((dt) => {
    const s = stateRef.current, inp = inputRef.current;
    if (playing) {
      s.t += dt;
      const was = s.contraction;
      s.contraction = contractionAt(s.t);
      if (was < PEAK && s.contraction >= PEAK) { sfx("warn"); onFlash("Here it comes. PUSH with the cue", "info"); }
      // Breathing: a 5-second cycle (in 2.5, out 2.5); in sync when holding on the in and letting go on the out.
      s.breathIn = (s.t % 5) < 2.5;
      const sync = inp.breath === s.breathIn;
      s.totalFrames++;
      if (sync) s.syncFrames++;
      s.calm = Math.max(0, Math.min(1, s.calm + (sync ? 0.09 : -0.12) * dt - s.contraction * 0.05 * dt));
      // The squeeze calms the wave (once every few seconds).
      if (inp.squeeze) {
        inp.squeeze = false;
        if (s.t - s.squeezeAt > 3 && s.contraction > 0.2) { s.squeezeAt = s.t; s.calm = Math.min(1, s.calm + 0.15); onFlash("🤝 You've got this", "good"); sfx("chime"); }
      }
      // The midwife's cue sweeps the gauge during a peak.
      const c = cueRef.current;
      c.v += c.dir * dt * (0.6 + (1 - s.calm) * 0.6);
      if (c.v > 1 || c.v < 0) { c.dir *= -1; c.v = Math.max(0, Math.min(1, c.v)); }
      s.cue = c.v;
      const band = 0.18 + s.calm * 0.22;
      if (inp.push) {
        if (s.contraction > PEAK && Math.abs(s.cue - 0.5) < band / 2 && s.energy > 0.05) {
          s.progress = Math.min(100, s.progress + dt * 22);
          s.pushGood += dt;
          s.energy = Math.max(0, s.energy - dt * 0.08);
          if (s.t - flashed.current > 1.2) { flashed.current = s.t; onFlash("Good push!", "great"); haptic(10); }
        } else {
          s.pushBad += dt;
          s.energy = Math.max(0, s.energy - dt * 0.2);
          if (s.t - flashed.current > 1.5) { flashed.current = s.t; onFlash(s.contraction < PEAK ? "Wait for the contraction" : "With the cue", "bad"); }
        }
      } else s.energy = Math.min(1, s.energy + dt * (s.contraction < 0.2 ? 0.12 : 0.03));
      s.calmSum += s.calm;
      // If it's taking a long time, the midwife helps the baby along.
      if (s.t > 150) s.progress = Math.min(100, s.progress + dt * 4);
      if (s.progress >= 100 && !s.born) {
        s.born = true; s.bornAt = s.t;
        slowMo(0.3, 1.5); sfx("applause"); sfx("chime"); haptic(60);
      }
    }
    camera.position.lerp(home, Math.min(1, dt * 2));
    camera.lookAt(look);
    applyShake(camera);
  });
  return null;
}

/** Mum on the bed and the partner at her side holding her hand; once born, the baby in her arms. */
function Family({ stateRef, mumLook, partnerLook }: { stateRef: RefObject<LabourState>; mumLook?: AvatarLookProps; partnerLook?: AvatarLookProps }) {
  const mumRig = useRef<ArmRig | null>({ weight: 1, R: { upper: [-0.6, 0.6, 0.35], fore: [0.1, 0.8, -0.5] }, L: { upper: [-0.8, 0.2, 0.5], fore: [-0.2, 0.9, 0.2] } });
  const dadRig = useRef<ArmRig | null>({ weight: 1, R: { upper: [-0.6, 0.75, 0.1], fore: [-0.4, 0.9, -0.1] }, L: { upper: [-1, 0.05, 0.15], fore: [-0.95, 0.2, 0.05] } });
  const mum = useRef<THREE.Group>(null);
  const baby = useRef<THREE.Group>(null);
  useGameFrame((_, t) => {
    const s = stateRef.current, r = mumRig.current;
    if (!r || !mum.current) return;
    if (s.born) {
      // Cradling the baby.
      r.R = { upper: [-0.55, 0.6, 0.25], fore: [0.15, 0.55, -0.8] };
      r.L = { upper: [-0.55, 0.6, 0.25], fore: [0.15, 0.55, -0.8] };
      if (baby.current) baby.current.visible = true;
    } else {
      // Gripping through a contraction, then easing off.
      const k = s.contraction;
      r.L = { upper: [-0.8 + k * 0.3, 0.2 + k * 0.3, 0.5], fore: [-0.2 + k * 0.6, 0.9, 0.2] };
    }
    // Reclined against the raised bed head, curling forward a little through each contraction.
    mum.current.rotation.x = -0.55 + Math.sin(t * 1.4) * 0.01 + (s.born ? 0.1 : s.contraction * 0.12);
  });
  return (
    <group>
      {/* Facing the foot of the bed (+x), reclined in her own frame. */}
      <group position={[-0.62, 0.3, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        <group ref={mum}>
          <CitizenAvatar look={mumLook} animation="sit" rig={mumRig} />
          <group ref={baby} position={[0, 1.05, 0.32]} visible={false}>
            <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.08, 0.2, 4, 10]} /><meshStandardMaterial color="#fdf2f8" roughness={0.9} /></mesh>
            <mesh position={[0.17, 0.02, 0]}><sphereGeometry args={[0.065, 16, 12]} /><meshStandardMaterial color="#e0ac8a" roughness={0.7} /></mesh>
          </group>
        </group>
      </group>
      {/* The blanket over her legs */}
      <mesh position={[0.3, 0.84, -0.4]} castShadow><boxGeometry args={[1.25, 0.4, 0.9]} /><meshStandardMaterial color="#bae6fd" roughness={0.95} /></mesh>
      {/* The partner on the far side of the bed, holding her hand */}
      <group position={[-0.35, 0, -1.25]}><CitizenAvatar look={partnerLook} animation="idle" rig={dadRig} /></group>
    </group>
  );
}
