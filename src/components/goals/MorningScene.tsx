"use client";

// Good morning: once a game day (they start at 09:00 Dubai time), the first time you open the map or your
// home. You're asleep in bed with the sun coming up through the window; the phone on the nightstand buzzes,
// you get up, and today's three missions are on the screen.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePathname } from "next/navigation";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { phoneRing } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { useGoals } from "@/lib/goals";
import { useMissions } from "@/lib/missions";
import { DailyMissions } from "./DailyMissions";

function Bedroom({ look, upRef }: { look?: AvatarLookProps; upRef: React.RefObject<number> }) {
  const me = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  useFrame(({ camera }, dt) => {
    t.current += dt;
    const up = upRef.current;
    // The phone's screen lights up and pulses while it buzzes.
    if (screen.current) screen.current.emissiveIntensity = up ? 1.2 : 0.4 + (Math.sin(t.current * 10) > 0 ? 1.4 : 0);
    if (me.current) {
      if (!up) { me.current.position.set(0, 0.62, -0.1); me.current.rotation.set(-Math.PI / 2, 0, 0); }
      else {
        // Up and standing beside the bed, stretching.
        me.current.position.lerp(new THREE.Vector3(1.55, 0, 1.55), Math.min(1, dt * 3));
        me.current.rotation.set(0, -0.5, 0);
        if (anim !== "wave") setAnim("wave");
      }
    }
    const cam = up ? new THREE.Vector3(3.8, 2.3, 5.2) : new THREE.Vector3(1.9, 3.4, 2.2);
    camera.position.lerp(cam, Math.min(1, dt * 1.8));
    camera.lookAt(up ? 0.9 : 0, up ? 0.7 : 0.5, up ? 0.2 : -0.4);
  });
  return (
    <>
      <color attach="background" args={["#1c1917"]} />
      <ambientLight intensity={0.35} color="#ffe4c4" />
      {/* the sunrise through the window */}
      <directionalLight position={[-3, 3, -4]} intensity={2.2} color="#ffb070" />
      <pointLight position={[1.6, 1.3, -1.6]} intensity={6} distance={4} color="#ffd8a8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 9]} /><meshStandardMaterial color="#a8a29e" roughness={0.7} /></mesh>
      <mesh position={[0, 1.6, -2.2]}><planeGeometry args={[9, 3.2]} /><meshStandardMaterial color="#e7e0d5" /></mesh>
      <mesh position={[-3, 1.6, 0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#e2d9cc" /></mesh>
      <mesh position={[-2.98, 1.7, -0.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.8, 1.4]} /><meshStandardMaterial color="#fdba74" emissive="#fb923c" emissiveIntensity={1.4} /></mesh>
      {/* bed: frame, mattress, duvet, pillows, headboard */}
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[1.9, 0.44, 2.3]} /><meshStandardMaterial color="#57534e" /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.8, 0.16, 2.2]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
      <mesh position={[0, 0.6, 0.35]}><boxGeometry args={[1.84, 0.08, 1.5]} /><meshStandardMaterial color="#64748b" roughness={0.9} /></mesh>
      {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 0.66, -0.85]}><boxGeometry args={[0.7, 0.14, 0.4]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      <mesh position={[0, 0.95, -1.15]}><boxGeometry args={[1.9, 1.1, 0.1]} /><meshStandardMaterial color="#44403c" /></mesh>
      {/* nightstand with the phone and a lamp */}
      <mesh position={[1.35, 0.28, -0.9]}><boxGeometry args={[0.55, 0.56, 0.45]} /><meshStandardMaterial color="#78716c" /></mesh>
      <mesh position={[1.35, 0.57, -0.85]}><boxGeometry args={[0.1, 0.012, 0.19]} /><meshStandardMaterial ref={screen} color="#0f172a" emissive="#60a5fa" emissiveIntensity={1} /></mesh>
      <mesh position={[1.45, 0.75, -1.0]}><cylinderGeometry args={[0.1, 0.13, 0.25, 12]} /><meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.6} /></mesh>
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
    </>
  );
}

const KEY = (day: number) => `dl_morning:${day}`;

export function MorningScene() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const { status } = useGoals(citizen?.id);
  const { missions } = useMissions(citizen?.id);
  const quality = useMemo(() => canvasQuality(), []);
  const up = useRef(0);
  const [show, setShow] = useState(false);
  const [awake, setAwake] = useState(false);

  // Once a game day, on the map or at home, when nothing else is on screen.
  useEffect(() => {
    if (!missions || !status?.order || !/^\/(explore|home)\b/.test(path)) return;
    let seen = false;
    try { seen = localStorage.getItem(KEY(missions.day)) === "1"; } catch { seen = true; }
    if (seen) return;
    const t = setTimeout(() => { if (!dialogOpen()) { setShow(true); try { localStorage.setItem(KEY(missions.day), "1"); } catch { /* storage blocked */ } } }, 1200);
    return () => clearTimeout(t);
  }, [missions, status?.order, path]);
  useEffect(() => {
    if (!show) return;
    phoneRing();
    const t = setTimeout(() => { up.current = 1; setAwake(true); }, 2600);
    return () => clearTimeout(t);
  }, [show]);

  if (!show || !citizen) return null;
  const name = (citizen.username ?? "").replace(/^@/, "");
  return (
    <div className="fixed inset-0 z-[204] bg-stone-900 text-white" role="dialog" aria-modal="true" aria-label="Good morning">
      <Canvas dpr={quality.dpr} camera={{ position: [1.9, 3.4, 2.2], fov: 50 }} className="!absolute inset-0">
        <Bedroom look={citizen.look} upRef={up} />
      </Canvas>
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] inset-x-0 text-center pointer-events-none">
        <p className="text-xs font-black uppercase tracking-widest text-amber-300">9:00 AM · Dubai</p>
        <p className="text-2xl font-black">{awake ? `Good morning${name ? `, ${name}` : ""} ☀️` : "📳 Bzzz…"}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto space-y-2">
          {awake && (
            <div className="rounded-[26px] bg-white text-slate-900 p-4 shadow-2xl animate-[sheetUp_0.25s_ease-out]">
              <DailyMissions onGo={() => setShow(false)} />
            </div>
          )}
          <button onClick={() => setShow(false)} className="w-full h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">{awake ? "Let's go" : "Skip"}</button>
        </div>
      </div>
    </div>
  );
}
