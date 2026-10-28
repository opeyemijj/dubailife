"use client";

// Arrested: a Dubai Police car pulls up with its lights going and the siren on, two officers get out and
// walk over, you put your hands up, and they walk you to the car. Outside the rental branch for a fake
// licence; at the roadside beside your crashed car after an accident. About ten seconds; then the case is
// in the Dubai Police app (custody, a lawyer, the court).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm } from "@/components/home/RunJourney";
import { doorThud, footstep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { CarModel } from "./CarModel";
import { CARS, type Car } from "@/lib/cars";

// No police uniform in the avatar set: the pilot captain's dark uniform with epaulettes reads as an officer's.
const OFFICER: AvatarLookProps = { gender: "man", preset: "Male_Adult_08", wear: "Pilot_Male_01" };
const police = (CARS.cars.find((c) => c.id === "nissan-patrol") ?? CARS.cars[0]) as Car & { model3d?: string };

/** A short siren: two tones swapping, made in the browser. */
function useSiren(on: boolean) {
  useEffect(() => {
    if (!on || typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth"; g.gain.value = 0.04;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < 10; i++) o.frequency.setValueAtTime(i % 2 ? 960 : 720, t + i * 0.45);
    g.gain.setValueAtTime(0.04, t + 4.2); g.gain.linearRampToValueAtTime(0, t + 4.6);
    o.start(); o.stop(t + 4.7);
    return () => { try { o.stop(); } catch { /* already stopped */ } void ctx.close(); };
  }, [on]);
}

function PoliceCar({ carRef, lightsRef }: { carRef: React.RefObject<THREE.Group | null>; lightsRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={carRef}>
      <CarModel car={{ ...police, color: "#f8fafc" }} plate="POLICE" />
      {/* the green Dubai Police stripe and the light bar */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 1.0, 0.85, 0]}><boxGeometry args={[0.02, 0.22, 3.6]} /><meshStandardMaterial color="#047857" /></mesh>)}
      <group ref={lightsRef} position={[0, 2.05, 0.2]}>
        <mesh position={[-0.35, 0, 0]}><boxGeometry args={[0.6, 0.14, 0.3]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></mesh>
        <mesh position={[0.35, 0, 0]}><boxGeometry args={[0.6, 0.14, 0.3]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} /></mesh>
        <pointLight position={[-0.4, 0.4, 0]} intensity={20} distance={14} color="#ef4444" />
        <pointLight position={[0.4, 0.4, 0]} intensity={20} distance={14} color="#3b82f6" />
      </group>
    </group>
  );
}

/** What happened: the banner, the four things said, and your crashed car at the kerb (an accident). */
export interface ArrestStory { title: string; reason: string; lines: [string, string, string, string]; car?: Car & { model3d?: string }; plate?: string }
export const FAKE_LICENCE_ARREST: ArrestStory = {
  title: "Arrested", reason: "Using a fake driving licence",
  lines: ["🚨 Siren outside the rental office…", "Dubai Police. Stay where you are.", "This licence is fake. You're under arrest.", "You'll be held until a lawyer or the court sorts this out."],
};
export const accidentArrest = (car: Car, plate: string): ArrestStory => ({
  title: "Arrested", reason: "Causing a traffic accident", car, plate,
  lines: ["🚨 Dubai Police at the scene…", "Dubai Police. Step away from the vehicle.", "You caused this accident. You're under arrest.", "Your car goes to the impound. A lawyer or the court decides the rest."],
});

function Scene({ look, story, onSay, onDone }: { look?: AvatarLookProps; story: ArrestStory; onSay: (s: string | null) => void; onDone: () => void }) {
  const camera = useThree((s) => s.camera);
  const carRef = useRef<THREE.Group>(null);
  const lights = useRef<THREE.Group>(null);
  const me = useRef<THREE.Group>(null);
  const cop0Ref = useRef<THREE.Group>(null), cop1Ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  const step = useRef(-1);
  const sky = useMemo(() => dubaiSky(), []);
  const [myAnim, setMyAnim] = useState<AvatarAnimation>("talk");
  const [handsUp, setHandsUp] = useState(false);
  const [copAnim, setCopAnim] = useState<AvatarAnimation>("idle");
  const done = useRef(false);
  useSiren(true);

  useFrame((_, dt) => {
    t.current += dt;
    const T = t.current;
    // The beats: siren and the car pulling in (0–2.4 s), officers walking over (2.6–5), hands up and
    // the officer speaking (5–7.5), walked to the car (7.5–10).
    const s = T < 2.6 ? 0 : T < 5 ? 1 : T < 7.5 ? 2 : 3;
    if (s !== step.current) {
      step.current = s;
      onSay(story.lines[s]);
      if (s === 1) { doorThud(); setCopAnim("walk"); }
      if (s === 2) { setCopAnim("talk"); setMyAnim("idle"); setHandsUp(true); }
      if (s === 3) { setCopAnim("walk"); setMyAnim("walk"); setHandsUp(false); }
    }
    // The car brakes into the kerb.
    if (carRef.current) {
      const k = Math.min(1, T / 2.4);
      carRef.current.position.set(-18 + 15.5 * (1 - (1 - k) ** 3), 0, 1.2);
      carRef.current.rotation.y = Math.PI / 2;
    }
    if (lights.current) lights.current.children.forEach((c, i) => { (c as THREE.Object3D).visible = Math.floor(T * 6) % 2 === i % 2; });
    // Officers: out of the car to you, then all three back to the car.
    [cop0Ref, cop1Ref].forEach((r, i) => {
      const g = r.current;
      if (!g) return;
      const from = new THREE.Vector3(-2.2 + i * 1.2, 0, 2.6);
      const at = new THREE.Vector3(i ? 1.1 : -0.9, 0, 4.4);
      const back = new THREE.Vector3(-1.6 + i * 0.9, 0, 2.6);
      const p = s === 0 ? from : s === 1 ? from.clone().lerp(at, Math.min(1, (T - 2.6) / 2.4)) : s === 2 ? at : at.clone().lerp(back, Math.min(1, (T - 7.5) / 2.5));
      if (s === 1 || s === 3) { const d = p.clone().sub(g.position); if (d.lengthSq() > 1e-6) g.rotation.y = Math.atan2(d.x, d.z); }
      else g.rotation.y = Math.atan2(0 - g.position.x, 5.2 - g.position.z);
      g.position.copy(p);
      g.visible = s > 0;
    });
    if (me.current) {
      const pos = s < 3 ? new THREE.Vector3(0, 0, 5.2) : new THREE.Vector3(0, 0, 5.2).lerp(new THREE.Vector3(-0.4, 0, 2.6), Math.min(1, (T - 7.5) / 2.5));
      if (s === 3) { me.current.rotation.y = Math.PI; if (Math.floor(T * 1.8) !== Math.floor((T - dt) * 1.8)) footstep("stone", 0.2); }
      else me.current.rotation.y = s >= 1 ? Math.PI : Math.PI * 0.85;
      me.current.position.copy(pos);
    }
    // A wide shot from across the road, drifting in.
    // After an accident: low behind your crashed car in the foreground, the arrest beyond it.
    if (story.car) {
      camera.position.lerp(new THREE.Vector3(3.4, 4.6, -10.5 + Math.min(T, 8) * 0.15), Math.min(1, dt * 1.5));
      camera.lookAt(-0.8, 0.6, 3.6);
    } else {
      camera.position.lerp(new THREE.Vector3(4.5, 3.2, -3.5 + Math.min(T, 8) * 0.15), Math.min(1, dt * 1.5));
      camera.lookAt(-1, 1.2, 3.8);
    }
    if (T > 10.3 && !done.current) { done.current = true; onDone(); }
  });

  return (
    <>
      <SkyAndLight sky={sky} />
      <ambientLight intensity={sky === "night" ? 0.8 : 0.3} color={sky === "night" ? "#c7d2fe" : "#fff"} />
      <mesh position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 10]} /><meshStandardMaterial color="#3f3f46" /></mesh>
      <mesh position={[0, 0.06, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 6]} /><meshStandardMaterial color="#d6cdb8" /></mesh>
      <mesh position={[0, 0.08, 2.9]}><boxGeometry args={[120, 0.16, 0.25]} /><meshStandardMaterial color="#a8a29e" /></mesh>
      <Building x={0} z={12} w={14} d={8} h={10} color="#f1f5f9" facing={-1} night={sky === "night"} awning="#ff5f00" />
      {[-14, 14].map((x) => <Building key={x} x={x} z={12} w={12} d={8} h={24} color="#e7e1d6" facing={-1} night={sky === "night"} />)}
      {[-7, 7].map((x) => <StreetPalm key={x} x={x} z={3.6} h={6} />)}
      {[-10, 10].map((x) => <Lamp key={x} x={x} z={3.2} night={sky === "night"} />)}
      <PoliceCar carRef={carRef} lightsRef={lights} />
      {story.car && (
        // Your car where it stopped, nose dented in and the hazards blinking.
        <group position={[2.6, 0, -1.4]} rotation={[0, Math.PI / 2 + 0.35, 0.015]}>
          <CarModel car={story.car} plate={story.plate} />
          <Hazards />
        </group>
      )}
      <group ref={cop0Ref} visible={false}><Suspense fallback={null}><CitizenAvatar look={OFFICER} animation={copAnim} /></Suspense></group>
      <group ref={cop1Ref} visible={false}><Suspense fallback={null}><CitizenAvatar look={OFFICER} animation={copAnim} /></Suspense></group>
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={myAnim} pose={handsUp ? "armsUp" : undefined} /></Suspense></group>
    </>
  );
}

function Hazards() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.visible = Math.floor(clock.elapsedTime * 2.5) % 2 === 0; });
  return (
    <group ref={g}>
      {[[-0.8, 2.3], [0.8, 2.3], [-0.8, -2.35], [0.8, -2.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.78, z]}><boxGeometry args={[0.22, 0.1, 0.06]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={3} /></mesh>
      ))}
    </group>
  );
}

export function ArrestScene({ look, story = FAKE_LICENCE_ARREST, onDone }: { look?: AvatarLookProps; story?: ArrestStory; onDone: () => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const [say, setSay] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <Canvas dpr={quality.dpr} camera={{ position: [4.5, 3.2, -3.5], fov: 55 }}>
        <Scene look={look} story={story} onSay={setSay} onDone={onDone} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-rose-600 text-white rounded-[22px] shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-2xl">🚔</span>
          <div><p className="font-black leading-tight">{story.title}</p><p className="text-xs text-rose-100">{story.reason}</p></div>
        </div>
      </div>
      {say && <div className="absolute bottom-28 inset-x-3 flex justify-center pointer-events-none"><p className="max-w-sm rounded-2xl bg-white text-slate-900 px-4 py-2.5 font-semibold shadow-xl">💬 {say}</p></div>}
      <button onClick={onDone} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 h-11 px-5 rounded-full bg-white/90 font-bold text-slate-800">Skip ›</button>
    </div>
  );
}
