"use client";

// Moving in, in 3D: you walk down the corridor to your front door (up the garden path for a house), the door
// swings open and you step inside. Then the real home opens.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { doorThud, footstep } from "@/components/transit/transitAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { canvasQuality } from "@/lib/device";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { useScreenBusy } from "@/lib/popups";

const OUTDOOR = ["townhouse", "villa"];
const WALK_END = 4.4;
const DOOR_END = 5.6;
const INSIDE_END = 7;
const camTarget = new THREE.Vector3();

/** Mounts once the avatar has loaded (they share a Suspense): the walk starts then, not while it's invisible. */
function Loaded({ onLoaded }: { onLoaded: () => void }) {
  useEffect(onLoaded, [onLoaded]);
  return null;
}

function Walk({ look, outdoor, onInside }: { look: AvatarLookProps; outdoor: boolean; onInside: () => void }) {
  const me = useRef<THREE.Group>(null);
  const door = useRef<THREE.Group>(null);
  const t = useRef(-1);
  const stride = useRef(0);
  const opened = useRef(false);
  const inside = useRef(false);
  const [anim, setAnim] = useState<AvatarAnimation>("walk");
  useFrame(({ camera }, dt) => {
    if (t.current < 0) return;
    t.current += dt;
    const T = t.current;
    if (me.current) {
      if (T < WALK_END) {
        // Along the corridor to the door.
        const k = T / WALK_END;
        me.current.position.set(-0.2, 0, -9 + 9.4 * k);
        me.current.rotation.y = 0;
        const b = Math.floor(stride.current);
        stride.current += dt * 1.9;
        if (Math.floor(stride.current) !== b) footstep("stone", 0.2);
      } else if (T < DOOR_END) {
        // Turn to the door and wait for it.
        me.current.rotation.y = -Math.min(1, (T - WALK_END) / 0.4) * (Math.PI / 2);
        if (anim !== "idle") setAnim("idle");
      } else {
        // Step inside.
        const k = Math.min(1, (T - DOOR_END) / (INSIDE_END - DOOR_END));
        me.current.position.set(-0.2 - 3 * k, 0, 0.4);
        if (anim !== "walk") setAnim("walk");
      }
    }
    if (T > WALK_END + 0.4 && !opened.current) { opened.current = true; doorThud(); }
    if (door.current) door.current.rotation.y = Math.min(1, Math.max(0, (T - WALK_END - 0.4) / 0.8)) * 1.7;
    if (T > INSIDE_END && !inside.current) { inside.current = true; onInside(); }
    // Behind you down the corridor, then over your shoulder at the door.
    const atDoor = Math.min(1, Math.max(0, (T - WALK_END) / 1));
    const z = me.current?.position.z ?? 0;
    camTarget.set(0.25 + 1.1 * atDoor, 1.75, z - 3.1 + 2.9 * atDoor);
    camera.position.lerp(camTarget, Math.min(1, dt * 4));
    camera.lookAt(-0.2 - 1.5 * atDoor, 1.1, z + 3 - 2.9 * atDoor);
  });
  const wall = outdoor ? "#4d7c4a" : "#efe8dc";
  return (
    <>
      <color attach="background" args={[outdoor ? "#a9d8f0" : "#e7e0d5"]} />
      <hemisphereLight args={["#ffffff", outdoor ? "#7c9a5e" : "#c9b99f", 1.1]} />
      <directionalLight position={[3, 6, -2]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}><planeGeometry args={[outdoor ? 3 : 3.6, 24]} /><meshStandardMaterial color={outdoor ? "#d8cdb8" : "#cbbfa8"} roughness={0.6} /></mesh>
      {outdoor && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -3]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#6fa35c" /></mesh>}
      {/* the far side, the end of the corridor, and your side with a gap for your door */}
      <mesh position={[1.8, 1.5, -3]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[24, 3]} /><meshStandardMaterial color={wall} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.5, 3.5]} rotation={[0, Math.PI, 0]}><planeGeometry args={[3.6, 3]} /><meshStandardMaterial color={outdoor ? "#f4efe6" : wall} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-1.8, 1.5, -5.65]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[11.1, 3]} /><meshStandardMaterial color={outdoor ? "#f4efe6" : wall} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-1.8, 1.5, 2.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.6, 3]} /><meshStandardMaterial color={outdoor ? "#f4efe6" : wall} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-1.8, 2.55, 0.4]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.0, 0.9]} /><meshStandardMaterial color={outdoor ? "#f4efe6" : wall} side={THREE.DoubleSide} /></mesh>
      {/* neighbours' doors, and the corridor lights */}
      {[-7, -3].map((z) => <mesh key={z} position={[1.78, 1.05, z]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1, 2.1]} /><meshStandardMaterial color={outdoor ? "#3f6a3c" : "#7c5a3a"} /></mesh>)}
      {!outdoor && [-7, -2].map((z) => <pointLight key={z} position={[0, 2.8, z]} intensity={8} distance={7} color="#fff1d6" />)}
      {/* your door, hinged at one side, and the warm room behind it */}
      <group ref={door} position={[-1.8, 0, -0.1]}>
        <mesh position={[0, 1.05, 0.5]}><boxGeometry args={[0.06, 2.1, 1]} /><meshStandardMaterial color="#5b3a29" /></mesh>
        <mesh position={[0.05, 1.05, 0.85]}><sphereGeometry args={[0.04, 10, 10]} /><meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} /></mesh>
      </group>
      <mesh position={[-4.2, 1.5, 0.4]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[6, 3]} /><meshBasicMaterial color="#fff3d6" /></mesh>
      <mesh position={[-3, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.4, 4]} /><meshStandardMaterial color="#d4b48c" /></mesh>
      <group ref={me} position={[-0.2, 0, -9]}>
        <Suspense fallback={null}>
          <CitizenAvatar look={look} animation={anim} />
          <Loaded onLoaded={() => { if (t.current < 0) t.current = 0; }} />
        </Suspense>
      </group>
    </>
  );
}

export function MoveInWalk({ look, homeId, homeLabel, caption, onDone }: { look: AvatarLookProps; homeId: string; homeLabel: string; caption?: string; onDone: () => void }) {
  // On screen: popups that open by themselves wait until it's over (lib/popups).
  useScreenBusy(true);
  const quality = useMemo(() => canvasQuality(), []);
  const [fading, setFading] = useState(false);
  const finished = useRef(false);
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; }, [onDone]);
  const leave = () => {
    if (finished.current) return;
    finished.current = true;
    finish.current();
  };
  const inside = () => {
    setFading(true);
    setTimeout(leave, 500);
  };
  // If the 3D can't run on this device, you still get home.
  useEffect(() => {
    const t = setTimeout(leave, 20000);
    return () => clearTimeout(t);
  }, []);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[210] bg-stone-200" role="dialog" aria-modal="true" aria-label="Moving in">
        <Canvas dpr={quality.dpr} camera={{ position: [0.25, 1.75, -12], fov: 55 }}>
          <PerfProbe scene="MoveInWalk" />
          <Walk look={look} outdoor={OUTDOOR.includes(homeId)} onInside={inside} />
        </Canvas>
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] inset-x-3 flex justify-center pointer-events-none">
          <p className="max-w-sm rounded-2xl bg-white px-4 py-2.5 font-semibold text-slate-900 shadow-xl">🔑 {caption ?? `Welcome to your new home: ${homeLabel}`}</p>
        </div>
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-500 ${fading ? "opacity-100" : "opacity-0"}`} />
        <button onClick={leave} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 h-11 px-5 rounded-full bg-white/90 font-bold text-slate-800 shadow-lg">Skip ›</button>
      </div>
    </ModalPortal>
  );
}
