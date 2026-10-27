"use client";

// The race itself: everyone on the start line on Financial Centre Road, the countdown, then the course
// past Burj Khalifa, Sheikh Zayed Road, the Dubai Frame, the Museum of the Future and DIFC and back to
// The Dubai Mall. You run at a steady pace and go faster by tapping in rhythm; everyone else is shown
// where their last saved progress puts them, moving on at race pace in between. Locals jog along for
// company but aren't in the race.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm } from "@/components/home/RunJourney";
import { footstep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { MARATHON, raceClock, reportProgress, serverNow, shownKm, type Overview } from "@/lib/marathon";
import { gameAudio } from "@/utils/gameAudio";

const COURSE = MARATHON.courseMetres;
const ROAD_W = 16;
const laneOf = (bib: number) => ((bib * 37) % 13) - 6; // spread across the road
const rand = (i: number, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- the course

function signTexture(text: string, sub: string) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#064e3b"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#facc15"; g.fillRect(0, 226, 1024, 30);
  g.fillStyle = "#ffffff"; g.font = "900 96px sans-serif"; g.textAlign = "center"; g.fillText(text, 512, 120);
  g.font = "700 48px sans-serif"; g.fillStyle = "#a7f3d0"; g.fillText(sub, 512, 196);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Gantry({ at, name, sub }: { at: number; name: string; sub: string }) {
  const tex = useMemo(() => signTexture(name, sub), [name, sub]);
  return (
    <group position={[at, 0, 0]}>
      {[-ROAD_W / 2 - 0.5, ROAD_W / 2 + 0.5].map((z) => <mesh key={z} position={[0, 3.5, z]}><boxGeometry args={[0.4, 7, 0.4]} /><meshStandardMaterial color="#e5e7eb" metalness={0.6} roughness={0.3} /></mesh>)}
      <mesh position={[0, 6.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[ROAD_W, 4]} /><meshStandardMaterial map={tex} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.3} /></mesh>
    </group>
  );
}

function Tower({ x, z, h, w = 14, color = "#cbd5e1" }: { x: number; z: number; h: number; w?: number; color?: string }) {
  const tiers = 5;
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: tiers }, (_, i) => (
        <mesh key={i} position={[0, (h / tiers) * (i + 0.5), 0]} castShadow><boxGeometry args={[w * (1 - i * 0.16), h / tiers, w * (1 - i * 0.16)]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.25} /></mesh>
      ))}
      <mesh position={[0, h + h * 0.12, 0]}><cylinderGeometry args={[0.3, 0.8, h * 0.25, 8]} /><meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} /></mesh>
    </group>
  );
}

/** The course near you: road, barriers, crowds, palms and towers in 100 m pieces, only those in view. */
function Course({ chunk, night }: { chunk: number; night: boolean }) {
  const chunks = [chunk - 1, chunk, chunk + 1, chunk + 2, chunk + 3].filter((c) => c >= -1 && c * 100 < COURSE + 200);
  return (
    <group>
      {chunks.map((c) => (
        <group key={c} position={[c * 100, 0, 0]}>
          <mesh position={[50, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, ROAD_W]} /><meshStandardMaterial color="#3f3f46" roughness={0.9} /></mesh>
          {[-ROAD_W / 2 + 0.3, ROAD_W / 2 - 0.3].map((z) => <mesh key={z} position={[50, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 0.25]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
          {/* the blue racing line down the middle */}
          <mesh position={[50, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 0.35]} /><meshStandardMaterial color="#0ea5e9" /></mesh>
          {/* pavements, barriers with sponsor boards, and cheering crowds */}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[50, 0.05, side * (ROAD_W / 2 + 4)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 8]} /><meshStandardMaterial color="#d6cdb8" /></mesh>
              <mesh position={[50, 0.55, side * (ROAD_W / 2 + 0.4)]}><boxGeometry args={[100, 1, 0.12]} /><meshStandardMaterial color={c % 2 ? "#059669" : "#f8fafc"} /></mesh>
              {Array.from({ length: 14 }, (_, i) => (
                <mesh key={i} position={[i * 7 + rand(c * 31 + i, side) * 4, 0.85, side * (ROAD_W / 2 + 1.4 + rand(c + i, side + 2) * 2)]}>
                  <capsuleGeometry args={[0.25, 0.9, 4, 8]} /><meshStandardMaterial color={["#f43f5e", "#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#f8fafc"][(c + i) % 6]} />
                </mesh>
              ))}
              {[10, 45, 80].map((x) => <StreetPalm key={x} x={x} z={side * (ROAD_W / 2 + 6)} h={7} />)}
              {[0, 50].map((x) => <Lamp key={x} x={x} z={side * (ROAD_W / 2 + 5)} night={night} />)}
              <Building x={50} z={side * (ROAD_W / 2 + 22)} w={26} d={16} h={30 + rand(c, side) * 60} color={["#e2e8f0", "#cbd5e1", "#f1f5f9", "#dbeafe"][(c + (side > 0 ? 1 : 0)) % 4]} facing={side > 0 ? -1 : 1} night={night} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Landmarks() {
  return (
    <group>
      {MARATHON.landmarks.map((l) => <Gantry key={l.at} at={Math.min(l.at, COURSE)} name={l.name.toUpperCase()} sub={`${shownKm(l.at)} km`} />)}
      {/* Burj Khalifa over the first stretch, the Frame and the Museum further on */}
      <Tower x={700} z={-120} h={420} w={30} color="#dbe4ee" />
      <group position={[2300, 0, 90]}>
        {[-20, 20].map((z) => <mesh key={z} position={[0, 75, z]}><boxGeometry args={[12, 150, 8]} /><meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.25} /></mesh>)}
        <mesh position={[0, 146, 0]}><boxGeometry args={[12, 8, 48]} /><meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.25} /></mesh>
      </group>
      <mesh position={[3100, 40, -90]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[38, 16, 16, 40]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} /></mesh>
      {/* start and finish arches */}
      {[0, COURSE].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, ROAD_W]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- runners

function Tag({ text, kind }: { text: string; kind: "me" | "player" | "local" }) {
  return (
    // A fixed small size wherever the runner is, so someone beside the camera doesn't fill the screen.
    <Html position={[0, 2.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-black shadow opacity-90 ${kind === "me" ? "bg-emerald-500 text-white" : kind === "local" ? "bg-amber-400 text-slate-900" : "bg-sky-500 text-white"}`}>{text}</div>
    </Html>
  );
}

/** Someone else in the race, gliding toward their latest saved distance and on at race pace. */
function Other({ r, live }: { r: { bib: number; username: string; look: AvatarLookProps | null; distance: number; finishMs: number | null }; live: boolean }) {
  const g = useRef<THREE.Group>(null);
  const shown = useRef(r.distance);
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = r.finishMs ? COURSE : r.distance + (live ? MARATHON.baseSpeed * 1.2 : 0);
    shown.current += Math.max(0, Math.min((target - shown.current) * Math.min(1, dt * 1.5), MARATHON.maxSpeed * dt));
    g.current.position.set(Math.min(COURSE + 6, shown.current), 0, laneOf(r.bib));
  });
  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group rotation={[0.15, 0, 0]}><Suspense fallback={null}><CitizenAvatar look={r.look ?? { gender: "man" }} animation={live && !r.finishMs ? "run" : "idle"} /></Suspense></group>
      <Tag text={`#${r.bib} @${r.username}`} kind="player" />
    </group>
  );
}

function LocalRunner({ i, startMs, live }: { i: number; startMs: number; live: boolean }) {
  const local = LOCALS[(i * 7) % LOCALS.length];
  const pace = 5.2 + rand(i, 9) * 2.2;
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const t = live ? (serverNow() - startMs) / 1000 : 0;
    g.current.position.set(Math.min(COURSE + 6, Math.max(0, t) * pace), 0, ((i * 5) % 13) - 6.5);
  });
  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group rotation={[0.15, 0, 0]}><Suspense fallback={null}><CitizenAvatar look={local.look} animation={live ? "run" : "idle"} /></Suspense></group>
      <Tag text={`${local.name} · Local`} kind="local" />
    </group>
  );
}

// ---------------------------------------------------------------- you

interface MeState { s: number; boost: number; stride: number; reported: number; finished: boolean }

function Me({ look, bib, live, start, taps, onDistance, onChunk, onFinish }: {
  look?: AvatarLookProps; bib: number; live: boolean; start: { s: number; finished: boolean }; taps: number;
  onDistance: (s: number) => void; onChunk: (c: number) => void; onFinish: (ms: number | null) => void;
}) {
  const me = useRef<MeState>({ s: start.s, boost: 0, stride: 0, reported: 0, finished: start.finished });
  // Each tap on RUN (counted by the screen) is a burst of speed, up to the top pace.
  const seenTaps = useRef(taps);
  useEffect(() => {
    const extra = taps - seenTaps.current;
    seenTaps.current = taps;
    if (extra > 0 && !me.current.finished) me.current.boost = Math.min(MARATHON.maxSpeed - MARATHON.baseSpeed, me.current.boost + extra * MARATHON.tapBoost);
  }, [taps]);
  const lastShown = useRef(0);
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const look3 = useRef(new THREE.Vector3(10, 1.2, 0));
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  const chunk = useRef(-99);
  const lastSend = useRef(0);

  useFrame((_, dt) => {
    const M = me.current;
    if (!g.current) return;
    const running = live && !M.finished;
    if (running) {
      M.boost = Math.max(0, M.boost - dt * 1.6);
      M.s = Math.min(COURSE, M.s + dt * Math.min(MARATHON.maxSpeed, MARATHON.baseSpeed + M.boost));
      const before = Math.floor(M.stride);
      M.stride += dt * (2.6 + M.boost * 0.15);
      if (Math.floor(M.stride) !== before) footstep("pavement", 0.7);
      // Save progress every couple of seconds; the server's cap is the truth.
      if (performance.now() - lastSend.current > 2000 || M.s >= COURSE) {
        lastSend.current = performance.now();
        const sent = M.s;
        void reportProgress(sent).then((r) => {
          if (!r) return;
          if (r.distance < sent - 30) M.s = r.distance;
          if (r.finishMs && !M.finished) { M.finished = true; onFinish(r.finishMs); }
        });
      }
    }
    const want: AvatarAnimation = M.finished ? "clap" : running ? "run" : "idle";
    if (want !== anim) setAnim(want);
    g.current.position.set(M.s, 0, laneOf(bib));
    if (body.current) {
      body.current.position.y = running ? Math.abs(Math.sin(M.stride * Math.PI)) * 0.04 : 0;
      body.current.rotation.x += ((running ? 0.17 : 0) - body.current.rotation.x) * Math.min(1, dt * 6);
    }
    if (performance.now() - lastShown.current > 150) { lastShown.current = performance.now(); onDistance(M.s); }
    const c = Math.floor(M.s / 100);
    if (c !== chunk.current) { chunk.current = c; onChunk(c); }
    // Close behind, a little to the side so the pack ahead shows.
    camera.position.lerp(new THREE.Vector3(M.s - 4.5, 2.6, laneOf(bib) + 1.2), Math.min(1, dt * 3));
    look3.current.lerp(new THREE.Vector3(M.s + 6, 1.3, laneOf(bib)), Math.min(1, dt * 4));
    camera.lookAt(look3.current);
  });

  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group ref={body}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
      <Tag text={`#${bib} You`} kind="me" />
    </group>
  );
}

// ---------------------------------------------------------------- the race screen

export function MarathonRace({ o, myId, look, onExit, onFinished }: { o: Overview; myId: string; look?: AvatarLookProps; onExit: () => void; onFinished: (ms: number, place: number) => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const startMs = Date.parse(o.race);
  const mine = o.me!;
  const [start] = useState(() => ({ s: Number(mine.distance), finished: !!mine.finishMs }));
  const [myS, setMyS] = useState(start.s);
  const [taps, setTaps] = useState(0);
  const [chunk, setChunk] = useState(0);
  const [clock, setClock] = useState(() => serverNow());
  const [finish, setFinish] = useState<number | null>(mine.finishMs);
  const [pressed, setPressed] = useState(false);

  useEffect(() => { const t = setInterval(() => setClock(serverNow()), 200); return () => clearInterval(t); }, []);
  const live = clock >= startMs;
  const countdown = Math.ceil((startMs - clock) / 1000);

  const tap = () => {
    if (!live || finish) return;
    setTaps((n) => n + 1);
    setPressed(true); setTimeout(() => setPressed(false), 90);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // Position: finishers by time, then everyone else by distance (you included, at your live distance).
  const others = o.runners.filter((r) => r.id !== myId);
  const place = finish
    ? 1 + others.filter((r) => r.finishMs !== null && r.finishMs < finish).length
    : 1 + others.filter((r) => r.finishMs !== null || r.distance > myS).length;
  const next = MARATHON.landmarks.find((l) => l.at > myS);

  return (
    <div className="fixed inset-0 z-[180] bg-black select-none">
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [-5, 2.6, 0], fov: 60, far: 1500 }} onPointerDown={tap}>
        <SkyAndLight sky={sky} />
        <ambientLight intensity={night ? 0.9 : 0.3} color={night ? "#c7d2fe" : "#ffffff"} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE / 2, -0.02, 0]}><planeGeometry args={[COURSE + 800, 600]} /><meshStandardMaterial color="#cdbf9f" roughness={1} /></mesh>
        <Course chunk={chunk} night={night} />
        <Landmarks />
        {others.map((r) => <Other key={r.id} r={r} live={live} />)}
        {Array.from({ length: 8 }, (_, i) => <LocalRunner key={i} i={i} startMs={startMs} live={live} />)}
        <Me look={look} bib={mine.bib} live={live} start={start} taps={taps} onDistance={setMyS} onChunk={setChunk}
          onFinish={(ms) => { gameAudio.playCoinSound(); setFinish(ms); if (ms) onFinished(ms, place); }} />
        <pointLight position={[myS, 6, 0]} intensity={night ? 60 : 10} distance={30} color="#ffe2b0" />
      </Canvas>

      {/* Race card: distance, time, place and the next landmark */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[24px] shadow-xl px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">🏅 {MARATHON.name}</p>
              <p className="text-xs text-slate-500 truncate">{live ? (next ? `Next: ${next.icon} ${next.name}` : "Final straight!") : "On the start line"}</p>
            </div>
            <div className="text-right tabular-nums">
              <p className="font-black text-lg leading-none">{shownKm(myS)}<span className="text-xs text-slate-500"> / {shownKm(COURSE)} km</span></p>
              <p className="text-xs text-slate-500">{live ? raceClock(finish ?? clock - startMs) : "--:--"} · {place}{["th", "st", "nd", "rd"][place % 10 > 3 || Math.floor(place / 10) % 10 === 1 ? 0 : place % 10]} of {others.length + 1}</p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(myS / COURSE) * 100}%` }} /></div>
        </div>
      </div>

      {!live && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            <p className="text-xl font-black">Starting in</p>
            <p className="text-8xl font-black tabular-nums">{countdown > 60 ? raceClock(countdown * 1000) : countdown}</p>
            <p className="font-semibold">Tap in rhythm to run faster</p>
          </div>
        </div>
      )}

      {live && !finish && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-0 flex items-center justify-center gap-3">
          <button onClick={onExit} className="h-12 px-4 rounded-full bg-white/90 font-bold text-slate-700">Leave</button>
          <button onPointerDown={(e) => { e.stopPropagation(); tap(); }} className={`w-28 h-28 rounded-full bg-emerald-600 text-white text-2xl font-black shadow-[inset_0_-6px_0_rgba(0,0,0,0.25)] transition-transform ${pressed ? "scale-90" : ""}`}>RUN</button>
        </div>
      )}

      {finish && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-[28px] shadow-2xl p-5 space-y-3 text-center animate-[sheetUp_0.25s_ease-out]">
            <div className="text-5xl">{place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] : "🏅"}</div>
            <p className="text-2xl font-black">You finished {place}{["th", "st", "nd", "rd"][place % 10 > 3 || Math.floor(place / 10) % 10 === 1 ? 0 : place % 10]}!</p>
            <p className="text-slate-500">{shownKm(COURSE)} km in {raceClock(finish)}{place <= 3 ? ` · AED ${MARATHON.prizes[place - 1].toLocaleString()} prize after the race` : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={async () => {
                const text = `I ran the ${MARATHON.name} in ${raceClock(finish)} and finished ${place}! Run with me next Friday 🏃`;
                const url = `${window.location.origin}/marathon`;
                if (navigator.share) { try { await navigator.share({ title: MARATHON.name, text, url }); } catch { /* cancelled */ } }
                else { try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ } }
              }} className="h-14 rounded-full bg-slate-100 font-semibold">Share</button>
              <button onClick={onExit} className="h-14 rounded-full bg-emerald-700 text-white font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
