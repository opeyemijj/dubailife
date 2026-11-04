"use client";
/* eslint-disable react-hooks/immutability */

// Arriving at a flat in a tower that isn't on the map (lib/city/partyHome.ts): you walk through the marble lobby into
// the lift, the doors close and the floor counter climbs to your floor, then the doors open on the corridor and you
// walk up to the flat's door. About 7 seconds; Skip goes straight in.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarLookProps } from "@/components/avatar/CitizenAvatar";
import { gameAudio } from "@/utils/gameAudio";

// The timeline, in seconds.
const LOBBY_END = 2.8;   // walked into the lift
const CLOSE_END = 3.6;   // doors shut
const RIDE_END = 5.6;    // arrived at the floor
const OPEN_END = 6.2;    // doors open on the corridor
const DONE = 7.8;        // at the flat's door

const smooth = (a: number, b: number, t: number) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

/** How far open the lift doors are (0 shut, 1 open) at time t. */
function doorsOpen(t: number) {
  if (t < LOBBY_END) return smooth(0.8, 1.6, t);
  if (t < CLOSE_END) return 1 - smooth(LOBBY_END, CLOSE_END, t);
  if (t < RIDE_END) return 0;
  return smooth(RIDE_END, OPEN_END, t);
}

export function TowerArrival({ floor, unit, tower, look, onDone }: { floor: number; unit: string; tower: string; look?: AvatarLookProps; onDone: () => void }) {
  const start = useRef<number | null>(null);
  const [t, setT] = useState(0);
  const done = useRef(false);
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; }, [onDone]);
  // The DOM overlay (floor counter, captions) ticks ten times a second; the 3D scene reads the clock every frame.
  const ready = () => { if (start.current == null) start.current = performance.now(); };
  useEffect(() => {
    const fallback = setTimeout(ready, 6000);
    const id = setInterval(() => {
      if (start.current == null) return;
      const s = (performance.now() - start.current) / 1000;
      setT(s);
      if (s >= DONE && !done.current) { done.current = true; finish.current(); }
    }, 100);
    return () => { clearInterval(id); clearTimeout(fallback); };
  }, []);
  const dinged = useRef(false);
  useEffect(() => {
    if (t >= RIDE_END && !dinged.current) { dinged.current = true; try { gameAudio.playClickSound(); } catch { /* no audio */ } }
  }, [t]);

  const shown = t < CLOSE_END ? "G" : t < RIDE_END ? String(Math.max(1, Math.round(floor * smooth(CLOSE_END, RIDE_END - 0.2, t)))) : String(floor);
  const caption = t < LOBBY_END ? `${tower} · Lobby` : t < RIDE_END ? "Going up…" : `Floor ${floor} · ${unit}`;
  const skip = () => { if (!done.current) { done.current = true; finish.current(); } };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900" role="dialog" aria-label={`Taking the lift to ${unit}`}>
      <Canvas shadows={false} dpr={[1, 1.75]} camera={{ fov: 72, position: [0.4, 2.3, 9.6], near: 0.05, far: 80 }}>
        <Scene look={look} unit={unit} startRef={start} onReady={ready} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-black/70 px-4 py-2 text-white shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 font-mono text-2xl font-black tabular-nums">
            <span className={t >= CLOSE_END && t < RIDE_END ? "animate-pulse text-amber-300" : "text-amber-300"}>▲</span>
            <span aria-live="polite">{shown}</span>
          </div>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-900 shadow">{caption}</div>
      </div>
      <button onClick={skip} className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-slate-900 shadow-lg active:scale-95">
        Skip ›
      </button>
    </div>
  );
}

/** Mounts once its Suspense siblings (the avatar) have loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

function Scene({ look, unit, startRef, onReady }: { look?: AvatarLookProps; unit: string; startRef: React.RefObject<number | null>; onReady: () => void }) {
  const me = useRef<THREE.Group>(null);
  const doorL = useRef<THREE.Mesh>(null);
  const doorR = useRef<THREE.Mesh>(null);
  const lobby = useRef<THREE.Group>(null);
  const corridor = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"walk" | "idle">("walk");
  const animRef = useRef<"walk" | "idle">("walk");
  const { camera } = useThree();
  const look3 = useMemo(() => new THREE.Vector3(0, 1.2, 4), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const want3 = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const t = startRef.current == null ? 0 : (performance.now() - startRef.current) / 1000;
    const open = doorsOpen(t);
    if (doorL.current) doorL.current.position.x = -0.5 - open * 0.95;
    if (doorR.current) doorR.current.position.x = 0.5 + open * 0.95;
    // The lobby is behind the doors until they shut; the corridor after.
    if (lobby.current) lobby.current.visible = t < CLOSE_END + 0.2;
    if (corridor.current) corridor.current.visible = t >= CLOSE_END;

    let z: number, face: number, walking: boolean;
    if (t < LOBBY_END) {
      // Walk from the entrance into the lift (facing the back of the lobby, -z).
      z = THREE.MathUtils.lerp(6, -3.85, smooth(0, LOBBY_END, t));
      face = Math.PI;
      walking = t < LOBBY_END - 0.05;
    } else if (t < OPEN_END) {
      z = -3.85;
      // Turn round to face the doors.
      face = Math.PI * (1 - smooth(LOBBY_END, LOBBY_END + 0.5, t));
      walking = false;
    } else {
      // Out along the corridor to the flat's door.
      z = THREE.MathUtils.lerp(-3.85, 3.4, smooth(OPEN_END, DONE - 0.1, t));
      face = 0;
      walking = t < DONE - 0.15;
    }
    if (me.current) { me.current.position.set(0, 0, z); me.current.rotation.y = face; }
    const want = walking ? "walk" : "idle";
    if (want !== animRef.current) { animRef.current = want; setAnim(want); }

    // Camera: behind me in the lobby; in the cabin's back corner during the ride (looking at the doors); behind me
    // again in the corridor. Eased the same at any frame rate.
    if (t < LOBBY_END) {
      want3.set(0.4, 2.3, z + 3.6);
      aim.set(0, 1.2, z - 2);
    } else if (t < OPEN_END) {
      want3.set(-0.72, 2.25, -5.0);
      aim.set(0.2, 1.15, -2.9);
      if (t > CLOSE_END && t < RIDE_END) want3.y += Math.sin(t * 30) * 0.004;
    } else {
      want3.set(0.3, 2.1, Math.max(z - 3, -4.9));
      aim.set(0, 1.2, z + 2.5);
    }
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    camera.position.lerp(want3, k);
    look3.lerp(aim, k);
    camera.lookAt(look3);
  });

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#fff7e6", "#3b3024", 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={0.9} />

      <group ref={me}>
        <Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /><Ready onReady={onReady} /></Suspense>
      </group>

      {/* The lift: a brushed-steel cabin with a mirror, a handrail and a lit ceiling, open towards +z. */}
      <group position={[0, 0, -4.1]}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, 2]} /><meshStandardMaterial color="#3f3f46" roughness={0.4} /></mesh>
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, 2]} /><meshStandardMaterial color="#e5e7eb" emissive="#fff7e0" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 1.3, -1]}><boxGeometry args={[2.1, 2.6, 0.05]} /><meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.15} /></mesh>
        <mesh position={[-1.05, 1.3, 0]}><boxGeometry args={[0.05, 2.6, 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.3} /></mesh>
        <mesh position={[1.05, 1.3, 0]}><boxGeometry args={[0.05, 2.6, 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.3} /></mesh>
        <mesh position={[0, 0.95, -0.94]}><boxGeometry args={[1.8, 0.05, 0.05]} /><meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.2} /></mesh>
        <pointLight position={[0, 2.4, 0]} intensity={0.8} distance={4} color="#fff3d6" />
      </group>

      {/* The lift doors and their frame, in the wall at z = -3.1. */}
      <group position={[0, 0, -3.1]}>
        <mesh ref={doorL} position={[-0.5, 1.2, 0]}><boxGeometry args={[1, 2.4, 0.06]} /><meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.25} /></mesh>
        <mesh ref={doorR} position={[0.5, 1.2, 0]}><boxGeometry args={[1, 2.4, 0.06]} /><meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.25} /></mesh>
        <mesh position={[0, 2.55, 0.02]}><boxGeometry args={[2.4, 0.3, 0.1]} /><meshStandardMaterial color="#b8860b" metalness={0.8} roughness={0.3} /></mesh>
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
    g.fillStyle = "#facc15"; g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(unit.replace(/^Apt\s*/, ""), 128, 50);
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
