"use client";
/* eslint-disable react-hooks/immutability */

// Sail the yacht yourself: out of Dubai Harbour, round the buoys past JBR and Ain Dubai, and back to the dock.
// The stick steers (left and right) and sets the throttle (up and down); keys work too (WASD or arrows).
// Every buoy rounded in order counts; the time is your score.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MoveStick, type Controls } from "@/components/street/StreetWorld";
import { MarinaSkyline } from "@/components/interior/scenery";
import { gameAudio } from "@/utils/gameAudio";
import { PerfProbe } from "@/components/perf/PerfProbe";

/** The course: buoys to round in order, then the dock. Metres, the harbour at the origin. */
const BUOYS: Array<[number, number]> = [[0, -60], [-45, -130], [-20, -210], [50, -190], [70, -110], [30, -40]];
const DOCK: [number, number] = [0, 6];
const MAX_SPEED = 22; // m/s at full throttle (about 43 knots: a fast yacht)

export interface SailResult { seconds: number; buoys: number; finished: boolean }

export function SailJourney({ name, onDone }: { name: string; onDone: (r: SailResult) => void }) {
  const controls = useRef<Controls>({ x: 0, y: 0 });
  const state = useRef({ x: 0, z: 0, yaw: Math.PI, speed: 0, next: 0, start: 0, done: false });
  const [hud, setHud] = useState({ next: 0, speed: 0, seconds: 0 });
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; }, [onDone]);

  // Keys, for desktop.
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      controls.current.x = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
      controls.current.y = (keys.has("ArrowUp") || keys.has("w") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("s") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => { keys.add(e.key); apply(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.key); apply(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // The HUD a few times a second (and the clock starts now).
  useEffect(() => {
    state.current.start = performance.now();
    const id = setInterval(() => {
      const s = state.current;
      setHud({ next: s.next, speed: Math.round(Math.abs(s.speed) * 1.94), seconds: Math.round((performance.now() - s.start) / 1000) });
    }, 200);
    return () => clearInterval(id);
  }, []);

  const end = (finished: boolean) => {
    const s = state.current;
    if (s.done) return;
    s.done = true;
    finish.current({ seconds: Math.round((performance.now() - s.start) / 1000), buoys: Math.min(s.next, BUOYS.length), finished });
  };

  const target = hud.next < BUOYS.length ? `Buoy ${hud.next + 1} of ${BUOYS.length}` : "Back to the dock";
  return (
    <div className="fixed inset-0 z-[120] bg-sky-300" role="dialog" aria-label={`Sailing ${name}`}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 62, position: [0, 9, 22], near: 0.5, far: 900 }}>
        <PerfProbe scene="SailJourney" />
        <Sea state={state} controls={controls} onDock={() => { gameAudio.playCoinSound(); end(true); }} onBuoy={() => gameAudio.playClickSound()} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-center gap-2">
        <div className="flex-1 rounded-2xl bg-slate-950/85 text-white px-3 py-2">
          <p className="text-sm font-black">⛵ {name}</p>
          <p className="text-[11px] text-sky-200">{target} · {hud.speed} knots · {hud.seconds}s</p>
        </div>
        <button onClick={() => end(false)} className="h-11 px-4 rounded-full bg-white text-slate-900 font-black text-sm shadow">Stop</button>
      </div>
      <p className="absolute top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))] inset-x-0 text-center text-[11px] font-bold text-white drop-shadow">Push up to go, left and right to steer. Round the orange buoys in order.</p>
      <div className="absolute left-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))]"><MoveStick controls={controls} /></div>
    </div>
  );
}

function Sea({ state, controls, onDock, onBuoy }: { state: React.RefObject<{ x: number; z: number; yaw: number; speed: number; next: number; start: number; done: boolean }>; controls: React.RefObject<Controls>; onDock: () => void; onBuoy: () => void }) {
  const boat = useRef<THREE.Group>(null);
  const wake = useRef<THREE.Mesh>(null);
  const buoys = useRef<Array<THREE.Mesh | null>>([]);
  const water = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = state.current, c = controls.current;
    if (!s || s.done) return;
    // Throttle eases the speed up and down; steering turns faster when moving.
    const want = Math.max(-0.3, c.y) * MAX_SPEED;
    s.speed += (want - s.speed) * Math.min(1, dt * 0.8);
    s.yaw -= c.x * dt * (0.4 + Math.min(1, Math.abs(s.speed) / 8) * 0.9) * Math.sign(s.speed || 1);
    s.x += Math.sin(s.yaw) * s.speed * dt;
    s.z += Math.cos(s.yaw) * s.speed * dt;
    // Rounding the next buoy.
    if (s.next < BUOYS.length) {
      const [bx, bz] = BUOYS[s.next];
      if (Math.hypot(s.x - bx, s.z - bz) < 14) { s.next++; onBuoy(); }
    } else if (Math.hypot(s.x - DOCK[0], s.z - DOCK[1]) < 12 && Math.abs(s.speed) < 9) {
      onDock();
    }
    const b = boat.current;
    if (b) {
      b.position.set(s.x, Math.sin(clock.elapsedTime * 1.6) * 0.12, s.z);
      b.rotation.set(Math.sin(clock.elapsedTime * 1.3) * 0.02, s.yaw, -c.x * Math.min(1, Math.abs(s.speed) / MAX_SPEED) * 0.12);
    }
    if (wake.current) {
      wake.current.position.set(s.x - Math.sin(s.yaw) * 10, -0.45, s.z - Math.cos(s.yaw) * 10);
      wake.current.rotation.set(-Math.PI / 2, 0, -s.yaw);
      (wake.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.35, (Math.abs(s.speed) / MAX_SPEED) * 0.35);
    }
    buoys.current.forEach((m, i) => {
      if (!m) return;
      (m.material as THREE.MeshStandardMaterial).color.set(i < s.next ? "#22c55e" : i === s.next ? "#f97316" : "#fdba74");
      m.position.y = Math.sin(clock.elapsedTime * 2 + i) * 0.15;
    });
    if (water.current) (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.16 + Math.sin(clock.elapsedTime * 0.8) * 0.05;
    // The camera behind and above, looking ahead.
    const back = new THREE.Vector3(s.x - Math.sin(s.yaw) * 22, 9, s.z - Math.cos(s.yaw) * 22);
    camera.position.lerp(back, 1 - Math.exp(-dt * 3));
    look.lerp(new THREE.Vector3(s.x + Math.sin(s.yaw) * 10, 1, s.z + Math.cos(s.yaw) * 10), 1 - Math.exp(-dt * 4));
    camera.lookAt(look);
  });
  return (
    <>
      <color attach="background" args={["#7dd3fc"]} />
      <fog attach="fog" args={["#bae6fd", 180, 700]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[40, 80, 20]} intensity={1.1} />
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -100]}>
        <planeGeometry args={[1600, 1600]} /><meshStandardMaterial color="#0369a1" emissive="#0ea5e9" emissiveIntensity={0.16} metalness={0.2} roughness={0.2} />
      </mesh>
      {/* the harbour: a breakwater and the dock (green when it's time to come back) */}
      <mesh position={[-30, 0.4, 14]}><boxGeometry args={[50, 1.6, 3]} /><meshStandardMaterial color="#d6d3d1" /></mesh>
      <mesh position={[DOCK[0], 0.1, DOCK[1] + 6]}><boxGeometry args={[14, 0.6, 4]} /><meshStandardMaterial color="#a16207" /></mesh>
      {BUOYS.map(([x, z], i) => (
        <mesh key={i} ref={(m) => { buoys.current[i] = m; }} position={[x, 0, z]}><sphereGeometry args={[1.4, 16, 12]} /><meshStandardMaterial color="#f97316" /></mesh>
      ))}
      <group position={[0, 0, -260]}><MarinaSkyline /></group>
      <group ref={boat}><YachtModel /></group>
      <mesh ref={wake}><planeGeometry args={[3.2, 9]} /><meshBasicMaterial color="#f0f9ff" transparent opacity={0} /></mesh>
    </>
  );
}

/** The yacht seen from outside: white hull, dark glass and a flybridge. Bow towards +z. */
function YachtModel() {
  const bow = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2.4, 0); shape.lineTo(0, 4.5); shape.lineTo(2.4, 0); shape.lineTo(-2.4, 0);
    return new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: false });
  }, []);
  return (
    <group>
      <mesh position={[0, 0.4, -1]}><boxGeometry args={[4.8, 1.8, 12]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
      <mesh geometry={bow} position={[0, -0.5, 5]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
      <mesh position={[0, -0.35, -1]}><boxGeometry args={[4.85, 0.25, 12.05]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
      <mesh position={[0, 1.9, 0.5]}><boxGeometry args={[3.6, 1.4, 5]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
      <mesh position={[0, 1.95, 3.02]}><planeGeometry args={[3.2, 0.9]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.1} /></mesh>
      <mesh position={[0, 2.75, -0.2]}><boxGeometry args={[4, 0.15, 6]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
    </group>
  );
}
