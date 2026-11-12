"use client";
/* eslint-disable react-hooks/immutability */

// Arriving at a home up a tower (any flat above the ground floor: viewing one, visiting a friend, a tower off the
// map): you're in the marble lobby; call the lift and walk over, the doors open with a ding, step in, press your
// floor on the panel, the doors close and the counter climbs (longer the higher you go), and the doors open on your
// corridor; you walk up to the flat's door. Skip goes straight in.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarLookProps } from "@/components/avatar/CitizenAvatar";
import { gameAudio } from "@/utils/gameAudio";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { useScreenBusy } from "@/lib/popups";

// The ride, step by step: each step starts when the last ends (or when you tap), and the scene draws it from the
// step and how long it's been going.
type Step = "lobby" | "walk" | "open" | "board" | "panel" | "close" | "ride" | "arrive" | "out" | "done";
const LENGTH: Record<Exclude<Step, "lobby" | "panel" | "done" | "ride">, number> = { walk: 1.6, open: 0.8, board: 1.2, close: 0.8, arrive: 0.7, out: 1.7 };
/** The ride itself: a little longer the higher you go (and never dull). */
const rideLength = (floor: number) => Math.min(4.5, Math.max(1.6, 1.1 + floor * 0.07));
const NEXT: Partial<Record<Step, Step>> = { walk: "open", open: "board", board: "panel", close: "ride", ride: "arrive", arrive: "out", out: "done" };

const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

export function TowerArrival({ floor, unit, tower, look, onDone }: { floor: number; unit: string; tower: string; look?: AvatarLookProps; onDone: () => void }) {
  // On screen: popups that open by themselves wait until it's over (lib/popups).
  useScreenBusy(true);
  const [step, setStep] = useState<Step>("lobby");
  const stepRef = useRef<{ step: Step; at: number }>({ step: "lobby", at: 0 });
  // How far through the ride (0..1), for the floor counter: set by the ride's timer.
  const [rideK, setRideK] = useState(0);
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; }, [onDone]);
  const go = (next: Step) => { stepRef.current = { step: next, at: performance.now() }; setStep(next); };
  const ride = rideLength(floor);

  // Timed steps move on by themselves; a ding as the doors open (going in, and at your floor).
  useEffect(() => {
    if (step === "lobby" || step === "panel") return;
    if (step === "done") { finish.current(); return; }
    if (step === "open" || step === "arrive") { try { gameAudio.sfx("chime"); } catch { /* no audio */ } }
    const ms = (step === "ride" ? ride : LENGTH[step as keyof typeof LENGTH]) * 1000;
    const t = setTimeout(() => go(NEXT[step]!), ms);
    // The floor counter, while riding.
    const started = performance.now();
    const tick = step === "ride" ? setInterval(() => setRideK(smooth((performance.now() - started) / 1000 / ride)), 100) : null;
    return () => { clearTimeout(t); if (tick) clearInterval(tick); };
  }, [step, ride]);

  const call = () => { if (stepRef.current.step !== "lobby") return; gameAudio.playClickSound(); go("walk"); };
  const press = () => { if (stepRef.current.step !== "panel") return; gameAudio.playClickSound(); go("close"); };
  const skip = () => { if (stepRef.current.step !== "done") go("done"); };

  const riding = step === "ride" ? rideK : step === "arrive" || step === "out" || step === "done" ? 1 : 0;
  const shown = step === "ride" ? String(Math.max(1, Math.round(floor * riding))) : riding >= 1 ? String(floor) : "G";
  const caption = step === "lobby" ? `${tower} · Lobby` : step === "walk" || step === "open" ? "Calling the lift…"
    : step === "board" || step === "panel" ? "Press your floor" : step === "close" || step === "ride" ? "Going up…" : `Floor ${floor} · ${unit}`;
  // The panel: a few floors round yours, yours lit up (the others do nothing: this is your stop).
  const panel = useMemo(() => {
    const top = Math.max(floor + 2, 6);
    const from = Math.max(1, Math.min(floor - 3, top - 7));
    return Array.from({ length: 8 }, (_, i) => from + i).filter((f) => f <= top).reverse();
  }, [floor]);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900" role="dialog" aria-label={`Taking the lift to ${unit}`}>
      <Canvas shadows={false} dpr={[1, 1.75]} camera={{ fov: 72, position: [0.4, 2.3, 9.6], near: 0.05, far: 80 }}>
        <PerfProbe scene="TowerArrival" />
        <Scene look={look} unit={unit} stepRef={stepRef} ride={ride} onCall={call} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-black/70 px-4 py-2 text-white shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 font-mono text-2xl font-black tabular-nums">
            <span className={step === "ride" ? "animate-pulse text-amber-300" : "text-amber-300"}>▲</span>
            <span aria-live="polite">{shown}</span>
          </div>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-900 shadow">{caption}</div>
      </div>

      {step === "lobby" && (
        <button onClick={call} className="absolute left-1/2 -translate-x-1/2 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] h-14 px-7 rounded-full bg-amber-400 text-slate-950 text-base font-black shadow-2xl active:scale-95 animate-pulse">
          🛗 Call the lift
        </button>
      )}
      {step === "panel" && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-3xl bg-slate-800/95 p-3 shadow-2xl ring-1 ring-white/10">
          <p className="mb-2 text-center text-[11px] font-black text-white/70">Your floor</p>
          <div className="grid grid-cols-2 gap-2">
            {panel.map((f) => (
              <button key={f} onClick={f === floor ? press : undefined} aria-label={f === floor ? `Floor ${f}: go` : `Floor ${f}`}
                className={`h-12 w-12 rounded-full font-mono text-lg font-black ring-2 ${f === floor ? "bg-amber-400 text-slate-950 ring-amber-200 animate-pulse" : "bg-slate-700 text-white/40 ring-white/10"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={skip} className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-slate-900 shadow-lg active:scale-95">
        Skip ›
      </button>
    </div>
  );
}

function Scene({ look, unit, stepRef, ride, onCall }: { look?: AvatarLookProps; unit: string; stepRef: React.RefObject<{ step: Step; at: number }>; ride: number; onCall: () => void }) {
  const me = useRef<THREE.Group>(null);
  const doorL = useRef<THREE.Mesh>(null);
  const doorR = useRef<THREE.Mesh>(null);
  const button = useRef<THREE.MeshStandardMaterial>(null);
  const lobby = useRef<THREE.Group>(null);
  const corridor = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"walk" | "idle">("idle");
  const animRef = useRef<"walk" | "idle">("idle");
  const { camera } = useThree();
  const look3 = useMemo(() => new THREE.Vector3(0, 1.2, 4), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const want3 = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const { step, at } = stepRef.current;
    const e = (performance.now() - at) / 1000;
    const k = (len: number) => smooth(e / len);
    // The doors: shut in the lobby, open as you arrive, shut for the ride, open on your floor.
    const open = step === "open" ? k(LENGTH.open) : step === "board" || step === "panel" ? 1 : step === "close" ? 1 - k(LENGTH.close)
      : step === "arrive" ? k(LENGTH.arrive) : step === "out" || step === "done" ? 1 : 0;
    if (doorL.current) doorL.current.position.x = -0.5 - open * 0.95;
    if (doorR.current) doorR.current.position.x = 0.5 + open * 0.95;
    // The call button lights up once pressed.
    if (button.current) button.current.emissiveIntensity = step === "lobby" ? 0.3 + Math.abs(Math.sin(performance.now() / 300)) * 0.5 : 1.4;
    // The lobby is behind the doors until they shut; the corridor after.
    const upstairs = step === "ride" || step === "arrive" || step === "out" || step === "done";
    if (lobby.current) lobby.current.visible = !upstairs;
    if (corridor.current) corridor.current.visible = upstairs;

    let z: number, face: number, walking: boolean;
    if (step === "lobby") { z = 6; face = Math.PI; walking = false; }
    else if (step === "walk") { z = THREE.MathUtils.lerp(6, -1.7, k(LENGTH.walk)); face = Math.PI; walking = e < LENGTH.walk - 0.05; }
    else if (step === "open") { z = -1.7; face = Math.PI; walking = false; }
    else if (step === "board") {
      // In, then round to face the doors.
      z = THREE.MathUtils.lerp(-1.7, -3.85, smooth(e / (LENGTH.board * 0.6)));
      face = Math.PI * (1 - smooth((e - LENGTH.board * 0.55) / (LENGTH.board * 0.45)));
      walking = e < LENGTH.board * 0.6;
    } else if (step === "out" || step === "done") { z = THREE.MathUtils.lerp(-3.85, 3.4, step === "done" ? 1 : k(LENGTH.out)); face = 0; walking = step === "out" && e < LENGTH.out - 0.05; }
    else { z = -3.85; face = 0; walking = false; }
    if (me.current) { me.current.position.set(0, 0, z); me.current.rotation.y = face; }
    const want = walking ? "walk" : "idle";
    if (want !== animRef.current) { animRef.current = want; setAnim(want); }

    // Camera: behind me in the lobby; in the cabin's back corner from boarding to arriving (looking at the doors);
    // behind me again in the corridor. Eased the same at any frame rate.
    if (step === "lobby" || step === "walk" || step === "open") { want3.set(0.4, 2.3, z + 3.6); aim.set(0, 1.2, z - 2); }
    else if (step === "out" || step === "done") { want3.set(0.3, 2.1, Math.max(z - 3, -4.9)); aim.set(0, 1.2, z + 2.5); }
    else {
      want3.set(-0.72, 2.25, -5.0); aim.set(0.2, 1.15, -2.9);
      if (step === "ride") want3.y += Math.sin(e * 30) * 0.004 * (e < ride - 0.3 ? 1 : 0);
    }
    const ease = 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    camera.position.lerp(want3, ease);
    look3.lerp(aim, ease);
    camera.lookAt(look3);
  });

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#fff7e6", "#3b3024", 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={0.9} />

      <group ref={me}>
        <Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense>
      </group>

      {/* The lift: a brushed-steel cabin with a mirror, a handrail and a lit ceiling, open towards +z. */}
      <group position={[0, 0, -4.1]}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, 2]} /><meshStandardMaterial color="#3f3f46" roughness={0.4} /></mesh>
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, 2]} /><meshStandardMaterial color="#e5e7eb" emissive="#fff7e0" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 1.3, -1]}><boxGeometry args={[2.1, 2.6, 0.05]} /><meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.15} /></mesh>
        <mesh position={[-1.05, 1.3, 0]}><boxGeometry args={[0.05, 2.6, 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.3} /></mesh>
        <mesh position={[1.05, 1.3, 0]}><boxGeometry args={[0.05, 2.6, 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.3} /></mesh>
        <mesh position={[0, 0.95, -0.94]}><boxGeometry args={[1.8, 0.05, 0.05]} /><meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.2} /></mesh>
        {/* The panel inside, by the doors. */}
        <mesh position={[0.92, 1.25, 0.6]}><boxGeometry args={[0.04, 0.5, 0.22]} /><meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} /></mesh>
        <pointLight position={[0, 2.4, 0]} intensity={0.8} distance={4} color="#fff3d6" />
      </group>

      {/* The lift doors and their frame, in the wall at z = -3.1; tap them (or the call button) to call it. */}
      <group position={[0, 0, -3.1]}>
        <mesh ref={doorL} position={[-0.5, 1.2, 0]} onClick={(e) => { e.stopPropagation(); onCall(); }}><boxGeometry args={[1, 2.4, 0.06]} /><meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.25} /></mesh>
        <mesh ref={doorR} position={[0.5, 1.2, 0]} onClick={(e) => { e.stopPropagation(); onCall(); }}><boxGeometry args={[1, 2.4, 0.06]} /><meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.25} /></mesh>
        <mesh position={[0, 2.55, 0.02]}><boxGeometry args={[2.4, 0.3, 0.1]} /><meshStandardMaterial color="#b8860b" metalness={0.8} roughness={0.3} /></mesh>
        {/* The call button beside the doors. */}
        <group position={[1.45, 1.15, 0.09]} onClick={(e) => { e.stopPropagation(); onCall(); }}>
          <mesh><boxGeometry args={[0.18, 0.3, 0.03]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.25} /></mesh>
          <mesh position={[0, 0.03, 0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.02, 20]} /><meshStandardMaterial ref={button} color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.4} /></mesh>
        </group>
        {/* The wall either side of the doors (both sides). */}
        <mesh position={[-3.6, 2.1, 0.02]}><boxGeometry args={[5, 4.2, 0.12]} /><meshStandardMaterial color="#e7dccb" /></mesh>
        <mesh position={[3.6, 2.1, 0.02]}><boxGeometry args={[5, 4.2, 0.12]} /><meshStandardMaterial color="#e7dccb" /></mesh>
        <mesh position={[0, 3.45, 0.02]}><boxGeometry args={[2.2, 1.5, 0.12]} /><meshStandardMaterial color="#e7dccb" /></mesh>
      </group>

      <group ref={lobby}><Lobby /></group>
      <group ref={corridor} visible={false}><Corridor unit={unit} /></group>
    </>
  );
}

/** A Dubai tower lobby: cream marble floor, a gold-trimmed reception desk, palms in planters, glass at the front. */
function Lobby() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}><planeGeometry args={[12, 11]} /><meshStandardMaterial color="#efe6d6" roughness={0.18} metalness={0.1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.5]}><planeGeometry args={[1.6, 8]} /><meshStandardMaterial color="#1f2937" roughness={0.3} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.2, 2]}><planeGeometry args={[12, 11]} /><meshStandardMaterial color="#f8f4ec" /></mesh>
      <mesh position={[-6, 2.1, 2]}><boxGeometry args={[0.1, 4.2, 11]} /><meshStandardMaterial color="#d9cbb3" /></mesh>
      <mesh position={[6, 2.1, 2]}><boxGeometry args={[0.1, 4.2, 11]} /><meshStandardMaterial color="#d9cbb3" /></mesh>
      {/* The glass front with the street light coming in. */}
      <mesh position={[0, 2.1, 7.5]}><boxGeometry args={[12, 4.2, 0.05]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.35} emissive="#e0f2fe" emissiveIntensity={0.5} /></mesh>
      {/* Reception. */}
      <mesh position={[-3.6, 0.55, 1.2]}><boxGeometry args={[1, 1.1, 3]} /><meshStandardMaterial color="#3b2f2a" roughness={0.4} /></mesh>
      <mesh position={[-3.6, 1.12, 1.2]}><boxGeometry args={[1.1, 0.05, 3.1]} /><meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.2} /></mesh>
      {/* Palms in planters. */}
      {[[-4.8, 5.5], [4.8, 5.5], [4.8, -1.8], [-4.8, -1.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.4, 0.32, 0.7, 16]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
          <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.06, 0.08, 1.6, 8]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
          <mesh position={[0, 2.3, 0]}><coneGeometry args={[0.9, 0.6, 8]} /><meshStandardMaterial color="#15803d" /></mesh>
        </group>
      ))}
      {/* A couple of lounge chairs and downlights. */}
      {[[3.4, 2.2], [3.4, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}><boxGeometry args={[0.9, 0.7, 0.9]} /><meshStandardMaterial color="#a8a29e" /></mesh>
      ))}
      {[-2, 2, 6].map((z) => <pointLight key={z} position={[0, 3.9, z]} intensity={0.5} distance={6} color="#fff1d6" />)}
    </group>
  );
}

/** The residents' corridor: carpet, wall lights and the flat's door with its number. */
function Corridor({ unit }: { unit: string }) {
  const plate = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 96;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1c1917"; g.fillRect(0, 0, 256, 96);
    // The flat's number, or a venue's name, shrunk to fit the plate.
    const label = unit.replace(/^Apt\s*/, "");
    g.font = "bold 44px sans-serif";
    const size = Math.max(14, Math.min(44, Math.floor(44 * 232 / Math.max(1, g.measureText(label).width))));
    g.fillStyle = "#facc15"; g.font = `bold ${size}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(label, 128, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [unit]);
  useEffect(() => () => plate.dispose(), [plate]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}><planeGeometry args={[3, 7.6]} /><meshStandardMaterial color="#7c2d12" roughness={0.9} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0.6]}><planeGeometry args={[3, 7.6]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
      <mesh position={[-1.5, 1.4, 0.6]}><boxGeometry args={[0.08, 2.8, 7.6]} /><meshStandardMaterial color="#e7e0d4" /></mesh>
      <mesh position={[1.5, 1.4, 0.6]}><boxGeometry args={[0.08, 2.8, 7.6]} /><meshStandardMaterial color="#e7e0d4" /></mesh>
      {/* Neighbours' doors along the sides. */}
      {[-1.2, 1.8].map((z) => [-1.45, 1.45].map((x) => (
        <mesh key={`${x}${z}`} position={[x, 1.05, z]}><boxGeometry args={[0.04, 2.1, 1]} /><meshStandardMaterial color="#57534e" /></mesh>
      )))}
      {/* Your door at the end, with its number. */}
      <mesh position={[0, 1.1, 4.4]}><boxGeometry args={[1.2, 2.2, 0.1]} /><meshStandardMaterial color="#3f2a1d" roughness={0.5} /></mesh>
      <mesh position={[0.42, 1.05, 4.33]}><sphereGeometry args={[0.05, 12, 8]} /><meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 1.75, 4.33]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.5, 0.19]} /><meshBasicMaterial map={plate} /></mesh>
      <mesh position={[0, 1.4, 4.5]}><boxGeometry args={[3, 2.8, 0.08]} /><meshStandardMaterial color="#e7e0d4" /></mesh>
      {[-1.5, 1, 3.5].map((z) => <pointLight key={z} position={[0, 2.6, z]} intensity={0.45} distance={4} color="#ffe8c2" />)}
    </group>
  );
}
