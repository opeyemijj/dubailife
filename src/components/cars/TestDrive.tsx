"use client";

// A test drive: you at the wheel of the car, out of the showroom and along Sheikh Zayed Road past the towers
// and the Salik gate, with the engine rising as you pick up speed. Hold the accelerator to go, let go to
// slow down; the camera sits behind the car. About 40 seconds, or stop any time.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { CityBlocks, dubaiSky, Road, SalikGate, SkyAndLight, Traffic, BurjKhalifa, laneX } from "@/components/transit/TransitWorld";
import { salikBeep, setLoopSpeed, startLoop, stopLoops } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import type { Car } from "@/lib/cars";
import { CarModel } from "./CarModel";

const LANE = 2;
const LENGTH = 1400;

function Drive({ car, travelRef, throttleRef, onSpeed }: { car: Car; travelRef: React.RefObject<{ s: number; speed: number }>; throttleRef: React.RefObject<boolean>; onSpeed: (kmh: number, s: number) => void }) {
  const me = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const top = car.top / 3.6;           // m/s
  const last = useRef(0);
  const salik = useRef(false);
  useFrame((_, dt) => {
    const T = travelRef.current;
    const accel = car.low ? 9 : car.suv ? 5 : 6.5;
    T.speed = throttleRef.current ? Math.min(top * 0.55, T.speed + accel * dt) : Math.max(0, T.speed - 4 * dt);
    T.s += T.speed * dt;
    setLoopSpeed("road", Math.min(1, T.speed / (top * 0.55)));
    if (!salik.current && T.s > 600) { salik.current = true; salikBeep(); }
    if (me.current) me.current.position.set(laneX(LANE), 0, 0);
    // The road moves past the car (the world scrolls), so the car and camera stay put.
    // Behind and above the car (forward is -z on this road), pulling back a little with speed.
    camera.position.lerp(new THREE.Vector3(laneX(LANE) - 1.6, 3.2, 8.5 + T.speed * 0.05), Math.min(1, dt * 2));
    camera.lookAt(laneX(LANE), 1, -8);
    if (performance.now() - last.current > 120) { last.current = performance.now(); onSpeed(T.speed * 3.6, T.s); }
  });
  return (
    <group ref={me} rotation={[0, Math.PI, 0]}>
      <CarModel car={car} plate="TEST" />
      {/* Street lighting on your car, so it shows after dark. */}
      <pointLight position={[0, 4, 1]} intensity={30} distance={12} color="#fff3dc" />
    </group>
  );
}

export function TestDrive({ car, onDone }: { car: Car; look?: AvatarLookProps; onDone: () => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const travel = useRef({ s: 0, speed: 0 });
  const throttle = useRef(false);
  const [kmh, setKmh] = useState(0);
  const [dist, setDist] = useState(0);
  useEffect(() => { startLoop("road", 0.12); return () => stopLoops(); }, []);
  useEffect(() => { if (dist >= LENGTH) onDone(); }, [dist, onDone]);

  return (
    <div className="fixed inset-0 z-[180] bg-black select-none">
      <Canvas dpr={quality.dpr} camera={{ position: [0, 3.2, 8.5], fov: 58, near: 0.05, far: 900 }}>
        <SkyAndLight sky={sky} />
        <Road travel={travel} sky={sky} />
        <CityBlocks travel={travel} sky={sky} districtAt={(p) => (p < 0.3 ? "burj" : p < 0.7 ? "towers" : "marina")} />
        <BurjKhalifa travel={travel} p={200} />
        <SalikGate travel={travel} p={600} />
        <Traffic travel={travel} />
        <Drive car={car} travelRef={travel} throttleRef={throttle} onSpeed={(k, s) => { setKmh(Math.round(k)); setDist(s); }} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3">
        <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[22px] shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-2xl">🛞</span>
          <div className="flex-1 min-w-0"><p className="font-black leading-tight truncate">Test drive · {car.make} {car.model}</p><p className="text-xs text-slate-500">Sheikh Zayed Road · {(dist / 1000).toFixed(1)} km</p></div>
          <p className="font-black text-2xl tabular-nums">{kmh}<span className="text-xs text-slate-500"> km/h</span></p>
        </div>
      </div>
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-0 flex items-center justify-center gap-3">
        <button onClick={onDone} className="h-12 px-5 rounded-full bg-white/90 font-bold text-slate-800">Back to the showroom</button>
        <button onPointerDown={() => { throttle.current = true; }} onPointerUp={() => { throttle.current = false; }} onPointerLeave={() => { throttle.current = false; }} onPointerCancel={() => { throttle.current = false; }}
          className="w-28 h-28 rounded-full bg-emerald-600 text-white text-lg font-black shadow-[inset_0_-6px_0_rgba(0,0,0,0.25)] active:scale-95">HOLD<br />to drive</button>
      </div>
    </div>
  );
}
