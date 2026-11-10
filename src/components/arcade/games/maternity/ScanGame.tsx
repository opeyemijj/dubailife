"use client";

// A pregnancy scan at the hospital: drag the probe over the bump (and tilt it) to find the baby on the
// ultrasound, which sharpens as you get close, then:
//   1 first scan: hold steady on the heartbeat;
//   2 anatomy scan: measure the head and the thigh bone with two taps each;
//   3 growth scan: measure the head, then take the photo when the picture is clearest.
// The ultrasound is drawn on a canvas shown on the scan room's monitor (and full size for measuring).

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { recordScan, useFamily, type Child } from "@/lib/love";
import { starsFor } from "@/lib/arcade";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Meter, Pill, useCallouts } from "../../hud";
import { applyShake, useGameFrame } from "../../stage";
import { Bed, ClinicRoom, demoChild, expecting, HOSPITAL_NAMES, Monitor, nextScan } from "./Clinic";

const STAGES = [
  { name: "First scan", task: "Find the baby, then hold steady on the heartbeat for three seconds." },
  { name: "Anatomy scan", task: "Find the baby, then measure the head and the thigh bone: tap each end." },
  { name: "Growth scan", task: "Find the baby, measure the head, then take the photo when it's clearest." },
];
const SIZE = 320;

export default function ScanGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const family = useFamily(citizen?.id);
  const hospital = (params?.hospital as string) ?? "latifa-hospital";
  const [now] = useState(() => Date.now());
  const child = demoChild(params, citizen?.id ?? "demo", params?.stage ? [1, 2, 3].filter((x) => x < Number(params.stage)) : []) ?? expecting(family?.children, citizen?.id);
  const next = child ? nextScan(child, now) : null;
  const stage = next && "stage" in next ? next.stage : 0;
  const blocked = !family && !params?.demo ? "Checking your family…"
    : !child ? "Scans are for parents expecting a baby. Start a family in the Family app."
    : !next ? "All three scans are done. Next: the birth, from a day before the due date."
    : "opensAt" in next ? `The next scan opens ${new Date(next.opensAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.`
    : null;

  return (
    <GameShell
      game="scan"
      title={stage ? STAGES[stage - 1].name : "Pregnancy scan"}
      venue={HOSPITAL_NAMES[hospital]}
      howTo={[
        { icon: "🩺", text: "Drag on the bump to move the probe; ◀ ▶ tilt it. The picture sharpens as you find the baby." },
        { icon: "🎯", text: stage ? STAGES[stage - 1].task : "Each scan opens on its day of the pregnancy." },
      ]}
      blocked={blocked}
      onClose={onClose}
      onShare={onShare}
    >
      {(api) => child && stage ? <Scan api={api} stage={stage} child={child} hospital={hospital} mumLook={child.mother.look ?? (citizen?.id === child.mother.id ? citizen?.look : undefined)} /> : null}
    </GameShell>
  );
}

interface ScanState {
  t: number;
  phase: "find" | "hold" | "measure" | "photo" | "done";
  probe: { x: number; y: number; a: number };
  target: { x: number; y: number; a: number };
  clarity: number;
  foundAt: number;
  steady: number; holdTime: number;
  measures: Array<{ label: string; a: [number, number]; b: [number, number]; got: Array<[number, number]> }>;
  accuracy: number[];
  photo: number;
}

function Scan({ api, stage, child, hospital, mumLook }: { api: ShellApi; stage: number; child: Child; hospital: string; mumLook?: AvatarLookProps }) {
  // The ultrasound is drawn on this canvas: shown on the 3D monitor, and full size while measuring.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const versionRef = useRef(0);
  const [initial] = useState<ScanState>(() => ({
    t: 0, phase: "find", probe: { x: 0, y: 0, a: 0 },
    target: { x: (Math.random() - 0.5) * 1.3, y: (Math.random() - 0.5) * 1.1, a: (Math.random() - 0.5) * 1.4 },
    clarity: 0, foundAt: 0, steady: 0, holdTime: 0,
    measures: stage === 2
      // The ends as drawn by drawUltrasound with the picture held still (head circle, thigh ellipse).
      ? [{ label: "Head", a: [0.34, 0.42], b: [0.62, 0.42], got: [] }, { label: "Thigh bone", a: [0.466, 0.786], b: [0.654, 0.854], got: [] }]
      : stage === 3 ? [{ label: "Head", a: [0.34, 0.42], b: [0.62, 0.42], got: [] }] : [],
    accuracy: [], photo: 0,
  }));
  const stateRef = useRef<ScanState>(initial);
  const [view, setView] = useState<ScanState>(initial);
  const callouts = useCallouts();
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; });
  const ended = useRef(false);
  const playing = api.phase === "play";

  // The HUD copy, the heartbeat sound, and the end of the scan.
  useEffect(() => {
    let raf = 0, beat = 0;
    const loop = () => {
      const s = stateRef.current;
      setView({ ...s, probe: { ...s.probe } });
      if (s.clarity > 0.5 && s.phase !== "done" && performance.now() > beat) { sfx("tap"); beat = performance.now() + 400; }
      if (s.phase === "done" && !ended.current) {
        ended.current = true;
        const findScore = Math.max(0, 35 - s.foundAt * 2);
        const rest = stage === 1 ? s.steady * 65 : (s.accuracy.reduce((a, b) => a + b, 0) / Math.max(1, s.accuracy.length)) * (stage === 3 ? 45 : 65) + (stage === 3 ? s.photo * 20 : 0);
        const score = Math.round(Math.min(100, findScore + rest));
        void recordScan(child.id, stage, hospital);
        setTimeout(() => apiRef.current.finish({
          score, stars: starsFor(score, [45, 70, 88]),
          headline: stage === 1 ? "There's the heartbeat ❤️" : stage === 2 ? `It's a ${child.gender}! 💕` : "Your baby's first photo 📸",
          stats: [{ label: "Found in", value: `${s.foundAt.toFixed(1)}s` }, { label: stage === 1 ? "Steady" : "Accuracy", value: `${Math.round((stage === 1 ? s.steady : s.accuracy[0] ?? 0) * 100)}%` }, { label: "Scan", value: `${stage} of 3` }],
          share: stage === 2 ? `💕 Our baby's anatomy scan at ${HOSPITAL_NAMES[hospital]}: it's a ${child.gender}!` : `🩺 ${STAGES[stage - 1].name} done at ${HOSPITAL_NAMES[hospital]} on Dubai Life`,
        }), 1200);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one loop per scan; it reads refs
  }, []);

  // Dragging on the bump moves the probe.
  const last = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: ReactPointerEvent) => { last.current = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: ReactPointerEvent) => {
    if (!last.current) return;
    const s = stateRef.current;
    s.probe.x = Math.max(-1, Math.min(1, s.probe.x + ((e.clientX - last.current.x) / window.innerWidth) * 2.6));
    s.probe.y = Math.max(-1, Math.min(1, s.probe.y + ((e.clientY - last.current.y) / (window.innerHeight * 0.4)) * 1.6));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { last.current = null; };
  const onTilt = (e: ReactPointerEvent<HTMLElement>) => { const s = stateRef.current; s.probe.a = Math.max(-1, Math.min(1, s.probe.a + Number(e.currentTarget.dataset.d) * 0.15)); haptic(4); };
  // Measuring: tap the ends on the ultrasound.
  const onMeasure = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    const m = s.measures.find((x) => x.got.length < 2);
    if (s.phase !== "measure" || !m) return;
    const r = e.currentTarget.getBoundingClientRect();
    m.got.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
    sfx("tap");
    if (m.got.length === 2) {
      const err = (Math.hypot(m.got[0][0] - m.a[0], m.got[0][1] - m.a[1]) + Math.hypot(m.got[1][0] - m.b[0], m.got[1][1] - m.b[1])) / 2;
      const swapped = (Math.hypot(m.got[0][0] - m.b[0], m.got[0][1] - m.b[1]) + Math.hypot(m.got[1][0] - m.a[0], m.got[1][1] - m.a[1])) / 2;
      const acc = Math.max(0, 1 - Math.min(err, swapped) / 0.12);
      s.accuracy.push(acc);
      callouts.push(acc > 0.8 ? `${m.label}: spot on` : acc > 0.5 ? `${m.label}: close` : `${m.label}: a bit off`, acc > 0.8 ? "great" : acc > 0.5 ? "good" : "bad");
      if (s.measures.every((x) => x.got.length === 2)) s.phase = stage === 3 ? "photo" : "done";
    }
  };
  const onPhoto = () => {
    const s = stateRef.current;
    if (s.phase !== "photo") return;
    s.photo = s.clarity;
    sfx("chime");
    callouts.push(s.clarity > 0.85 ? "Beautiful photo 📸" : "Photo taken", s.clarity > 0.85 ? "great" : "good");
    s.phase = "done";
  };

  const s = view;
  const measuring = s.phase === "measure";
  const current = s.measures.find((x) => x.got.length < 2);

  return (
    <div className="absolute inset-0 bg-slate-100">
      <div className="absolute inset-x-0 top-0 h-[55%]">
        <GameStage camera={{ position: [0.3, 1.6, 2.4], fov: 45 }} background="#f1f5f9" environment={0.5}>
          <ClinicRoom />
          <Bed position={[-0.2, 0, -0.6]} />
          <group position={[-0.6, 0.62, -0.6]} rotation={[0, Math.PI / 2, -0.55]}><CitizenAvatar look={mumLook} animation="sit" /></group>
          <Monitor canvasRef={canvasRef} position={[1.2, 1.55, -1.4]} rotation={[0, -0.35, 0]} size={[1.1, 1.1]} version={versionRef} />
          <ScanTicker stateRef={stateRef} canvasRef={canvasRef} versionRef={versionRef} stage={stage} playing={playing} />
        </GameStage>
      </div>

      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex gap-2 pointer-events-none">
        <Pill icon="🩺" value={STAGES[stage - 1].name} />
        <Pill icon="✨" value={`${Math.round(s.clarity * 100)}%`} tone="gold" />
      </div>
      {callouts.node}

      {/* The bump: drag to move the probe */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] z-10 bg-gradient-to-b from-slate-200 to-slate-300 touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[78%] max-w-sm aspect-[5/3] rounded-[50%] bg-gradient-to-b from-[#e8b796] to-[#c98f6b] shadow-inner" />
        <div className="absolute w-10 h-14 rounded-xl bg-slate-50 border-2 border-sky-400 shadow-lg pointer-events-none"
          style={{ left: `calc(50% + ${s.probe.x * 34}% - 20px)`, top: `calc(44% + ${s.probe.y * 26}% - 28px)`, transform: `rotate(${s.probe.a * 30}deg)` }} />
        <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2">
          <button data-d={-1} onPointerDown={onTilt} className="w-12 h-12 rounded-2xl bg-white shadow font-black text-slate-700" aria-label="Tilt left">◀</button>
          <div className="flex-1 text-slate-700">
            {s.phase === "find" && <p className="text-center text-sm font-black">Find the baby</p>}
            {s.phase === "hold" && <Meter label="Hold steady on the heartbeat" value={s.holdTime / 3} color="#ec4899" warnBelow={0} />}
            {s.phase === "photo" && <button onPointerDown={onPhoto} className="w-full h-12 rounded-2xl bg-pink-500 text-white font-black">📸 Take the photo</button>}
          </div>
          <button data-d={1} onPointerDown={onTilt} className="w-12 h-12 rounded-2xl bg-white shadow font-black text-slate-700" aria-label="Tilt right">▶</button>
        </div>
      </div>

      {/* Measuring: the ultrasound full size; tap each end */}
      <div className={measuring ? "absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-3 p-4" : "hidden"}>
          {measuring && <p className="text-white font-black">Measure the {current?.label.toLowerCase()}: tap {current && current.got.length === 0 ? "one end" : "the other end"}</p>}
          <div className="relative w-full max-w-sm aspect-square" onPointerDown={onMeasure}>
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full rounded-2xl" />
            {s.measures.flatMap((m) => m.got).map(([x, y], i) => <span key={i} className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-yellow-300" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />)}
          </div>
      </div>
    </div>
  );
}

/** Inside the canvas: clarity from the probe, the phase changes, drawing the ultrasound, and the camera. */
function ScanTicker({ stateRef, canvasRef, versionRef, stage, playing }: { stateRef: RefObject<ScanState>; canvasRef: RefObject<HTMLCanvasElement | null>; versionRef: RefObject<number>; stage: number; playing: boolean }) {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0.4, 1.2, -1), []);
  const home = useMemo(() => new THREE.Vector3(0.3, 1.6, 2.4), []);
  const prev = useRef({ x: 0, y: 0 });
  useGameFrame((dt, t) => {
    const s = stateRef.current;
    if (playing && s.phase !== "done") {
      s.t += dt;
      const dist = Math.hypot(s.probe.x - s.target.x, s.probe.y - s.target.y);
      const tilt = Math.abs(s.probe.a - s.target.a);
      const raw = Math.max(0, 1 - dist * 1.5) * Math.max(0.15, 1 - tilt * 0.9);
      s.clarity += (raw - s.clarity) * Math.min(1, dt * 6);
      const moved = Math.hypot(s.probe.x - prev.current.x, s.probe.y - prev.current.y) / Math.max(dt, 0.001);
      prev.current = { x: s.probe.x, y: s.probe.y };
      if (s.phase === "find" && s.clarity > 0.82) {
        s.foundAt = s.t;
        s.phase = stage === 1 ? "hold" : "measure";
        sfx("mgPerfect"); haptic(20);
      } else if (s.phase === "hold") {
        // Steady: little movement and a clear picture; the hold fills while it is.
        const steadyNow = s.clarity > 0.7 && moved < 0.35 ? 1 : 0;
        s.holdTime = Math.max(0, s.holdTime + (steadyNow ? dt : -dt * 0.5));
        s.steady = Math.min(1, s.steady * 0.995 + steadyNow * 0.005 + (steadyNow ? 0.004 : 0));
        if (s.holdTime >= 3) { s.steady = Math.max(s.steady, 0.4 + Math.min(0.6, 3 / Math.max(3, s.t - s.foundAt))); s.phase = "done"; }
      } else if (s.phase === "photo" && s.t - s.foundAt > 40) s.phase = "done";
      if (s.phase === "find" && s.t > 60) { s.foundAt = 60; s.phase = stage === 1 ? "hold" : "measure"; }
    }
    // While measuring or taking the photo the picture holds still, clear.
    const clarity = s.phase === "measure" ? 1 : s.clarity;
    if (canvasRef.current) drawUltrasound(canvasRef.current, s, clarity, t, stage);
    versionRef.current++;
    camera.position.lerp(home, Math.min(1, dt * 2));
    camera.lookAt(look);
    applyShake(camera);
  });
  return null;
}

/** The ultrasound: a fan of speckle, and the baby, blurred and offset by how far the probe is from it. */
function drawUltrasound(c: HTMLCanvasElement, s: ScanState, clarity: number, t: number, stage: number) {
  const g = c.getContext("2d");
  if (!g) return;
  const W = c.width, cx = W / 2;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, W);
  g.save();
  g.beginPath(); g.moveTo(cx, 10); g.arc(cx, 10, W * 0.95, Math.PI / 2 - 0.7, Math.PI / 2 + 0.7); g.closePath(); g.clip();
  const grad = g.createRadialGradient(cx, 10, 10, cx, 10, W);
  grad.addColorStop(0, "#3a3a3a"); grad.addColorStop(1, "#111");
  g.fillStyle = grad; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
  // The baby: centred when the probe is on it; drifts off and blurs as it moves away.
  const still = s.phase === "measure" || s.phase === "photo" || s.phase === "done";
  const ox = still ? 0 : (s.target.x - s.probe.x) * W * 0.5, oy = still ? 0 : (s.target.y - s.probe.y) * W * 0.45;
  g.translate(cx + ox, W * 0.55 + oy);
  if (!still) g.rotate((s.target.a - s.probe.a) * 0.8);
  g.filter = `blur(${(1 - clarity) * 9}px)`;
  g.globalAlpha = 0.25 + clarity * 0.75;
  g.fillStyle = "#d4d4d4"; g.strokeStyle = "#f5f5f5"; g.lineWidth = 3;
  const sc = stage === 1 ? 0.7 : 1;
  g.beginPath(); g.arc(-W * 0.02 * sc, -W * 0.13 * sc, W * 0.14 * sc, 0, Math.PI * 2); g.fill(); g.stroke(); // head
  g.beginPath(); g.ellipse(W * 0.04 * sc, W * 0.1 * sc, W * 0.13 * sc, W * 0.17 * sc, 0.3, 0, Math.PI * 2); g.fill(); // body
  if (stage > 1) { g.beginPath(); g.ellipse(W * 0.06, W * 0.27, W * 0.1, W * 0.03, 0.35, 0, Math.PI * 2); g.fill(); } // leg / thigh bone
  // The heart flickering.
  const beat = (Math.sin(t * Math.PI * 2 * 2.5) + 1) / 2;
  g.fillStyle = `rgba(255,255,255,${0.4 + beat * 0.6})`;
  g.beginPath(); g.arc(W * 0.02 * sc, W * 0.04 * sc, W * 0.025 * sc, 0, Math.PI * 2); g.fill();
  g.restore();
  g.filter = "none"; g.globalAlpha = 1;
  g.fillStyle = "#9ca3af"; g.font = "11px monospace";
  g.fillText(`DUBAI LIFE · OB ${["", "8W", "20W", "32W"][stage]}`, 8, W - 10);
  if (clarity > 0.5) g.fillText(`FHR ${148 + Math.round(Math.sin(t) * 4)} bpm`, W - 92, W - 10);
}
