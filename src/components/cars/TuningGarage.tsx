"use client";

// The tuning garage (/garage): one of your cars up on the ramp. Fit engine, turbo and tyre upgrades, three stages
// each (src/data/cars/tuning.json, charged by tune_car()), to race faster at the Autodrome, and respray it
// (set_car_color()). What each stage does to the car is in lib/autodrome perfOf.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ArrowLeft } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { canvasQuality } from "@/lib/device";
import { aed, carOf, myCarTuning, painted, paintName, RESPRAY_COST, setCarColor, tuneCar, useGarage, type Car, type CarTuning } from "@/lib/cars";
import { NO_TUNE, perfOf, tuneBoost, tuneCost, TUNE_PARTS, type Tune } from "@/lib/autodrome";
import { StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { gameAudio } from "@/utils/gameAudio";
import { useNow } from "@/lib/dubaiClock";
import { CarModel } from "./CarModel";
import { PaintPicker } from "./PaintPicker";

function Spin({ car }: { car: Car }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.3; });
  return <group ref={g}><CarModel car={car} /></group>;
}

function Workshop({ car }: { car: Car }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#3f3f46" roughness={0.6} metalness={0.2} /></mesh>
      {/* the lift's platform, yellow and black, and the tool wall behind */}
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[3, 0.16, 5.6]} /><meshStandardMaterial color="#facc15" /></mesh>
      <mesh position={[0, 3, -6]}><boxGeometry args={[16, 6, 0.2]} /><meshStandardMaterial color="#18181b" /></mesh>
      {[-5, -2.5, 0, 2.5, 5].map((x) => <mesh key={x} position={[x, 3.2, -5.85]}><boxGeometry args={[1.8, 2.4, 0.1]} /><meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.4} /></mesh>)}
      <mesh position={[0, 5.6, -5.85]}><boxGeometry args={[12, 0.08, 0.1]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.2} /></mesh>
      <group position={[0, 0.16, 0]}><Suspense fallback={null}><Spin car={car} /></Suspense></group>
    </group>
  );
}

/** A stat bar: the car as it came (grey) and with its upgrades (green). */
function Stat({ label, base, now, max, unit }: { label: string; base: number; now: number; max: number; unit: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-black"><span className="uppercase tracking-wider text-slate-400">{label}</span><span className="text-slate-700">{unit}{now > base + 0.01 ? <span className="text-emerald-600"> ▲</span> : null}</span></div>
      <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden mt-0.5">
        <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (now / max) * 100)}%` }} />
        <div className="absolute inset-y-0 left-0 bg-slate-400 rounded-full" style={{ width: `${Math.min(100, (base / max) * 100)}%` }} />
      </div>
    </div>
  );
}

export function TuningGarage() {
  const { citizen } = useRequireCitizen();
  const router = useRouter();
  const { garage, reload } = useGarage(citizen?.id);
  const [tuning, setTuning] = useState<CarTuning[] | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [paint, setPaint] = useState<string | null | undefined>(undefined);
  const quality = useMemo(() => canvasQuality(), []);
  const nowMs = useNow();

  const loadTuning = () => void myCarTuning().then((r) => setTuning(r.data ?? []));
  useEffect(() => { if (citizen?.id) { const t = setTimeout(loadTuning, 0); return () => clearTimeout(t); } }, [citizen?.id]);

  const cars = (garage?.owned ?? []).filter((o) => !o.isStolen && carOf(o.car));
  const mine = cars.find((o) => o.id === pick) ?? cars[0];
  const model = mine ? carOf(mine.car)! : null;
  const tune: Tune = tuning?.find((t) => t.id === mine?.id) ?? NO_TUNE;
  const impounded = !!(mine?.impoundedUntil && Date.parse(mine.impoundedUntil) > nowMs);
  const balance = citizen?.balance ?? 0;
  // The paint being tried (undefined: what it has now).
  const shownColor = paint === undefined ? mine?.color ?? null : paint;
  const base = model ? perfOf(model.id) : null, now = model ? perfOf(model.id, tune) : null;

  const choose = (id: number) => { gameAudio.playClickSound(); setPick(id); setPaint(undefined); setNote(null); };

  const fit = async (part: keyof Tune) => {
    if (!mine) return;
    setBusy(true); setNote(null);
    const r = await tuneCar(mine.id, part);
    setBusy(false);
    if (r.error) return setNote({ ok: false, text: r.error });
    gameAudio.playCoinSound();
    const p = TUNE_PARTS.find((x) => x.id === part)!;
    setNote({ ok: true, text: `${p.icon} ${p.stages[(r.data?.stage ?? 1) - 1]} fitted · ${aed(r.data?.cost ?? 0)}. ${p.stat} +${tuneBoost(part, r.data?.stage ?? 1)}% at the Autodrome.` });
    loadTuning();
  };
  const respray = async () => {
    if (!mine || paint === undefined) return;
    setBusy(true); setNote(null);
    const r = await setCarColor(mine.id, paint);
    setBusy(false);
    if (r.error) return setNote({ ok: false, text: r.error });
    gameAudio.playCoinSound();
    setNote({ ok: true, text: `🎨 Resprayed in ${paintName(paint)} · ${aed(RESPRAY_COST)}.` });
    setPaint(undefined);
    void reload();
  };

  return (
    <main className="fixed inset-0 bg-zinc-950 text-white flex flex-col select-none">
      <div className="relative h-[38dvh] shrink-0">
        {model && (
          <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [5.5, 3, 7], fov: 45 }}>
            <color attach="background" args={["#18181b"]} />
            <StudioEnvironment intensity={0.8} />
            <hemisphereLight args={["#ffffff", "#52525b", 0.7]} />
            <directionalLight position={[4, 8, 5]} intensity={1.6} castShadow />
            <pointLight position={[0, 5, 2]} intensity={40} distance={14} />
            <Workshop car={painted(model, shownColor)} />
            <OrbitControls makeDefault enablePan={false} minDistance={6} maxDistance={14} minPolarAngle={0.6} maxPolarAngle={1.4} target={[0, 0.8, 0]} />
          </Canvas>
        )}
        <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="Back" className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0 bg-white/95 text-slate-900 rounded-full px-4 h-10 flex items-center gap-2 shadow">
            <span>🔧</span><span className="font-black truncate">Tuning garage</span><span className="text-xs text-slate-500 truncate">· Al Quoz</span>
          </div>
          <Link href="/autodrome" className="h-10 px-3 rounded-full bg-red-600 text-xs font-black flex items-center shadow">🏁 Race</Link>
        </header>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-white text-slate-900 rounded-t-[28px] -mt-6 relative p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
        {garage === null ? <p className="text-sm text-slate-500">Opening the garage…</p> : !mine || !model || !base || !now ? (
          <div className="space-y-2 text-center py-6">
            <p className="text-4xl">🚗</p>
            <p className="font-black">You need a car of your own to tune.</p>
            <Link href="/explore" className="inline-block h-11 leading-[2.75rem] px-5 rounded-full bg-slate-900 text-white font-black text-sm">Find a dealer on Sheikh Zayed Road</Link>
          </div>
        ) : (
          <>
            {cars.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
                {cars.map((o) => (
                  <button key={o.id} onClick={() => choose(o.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${o.id === mine.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                    <span className="w-3 h-3 rounded-full border border-black/20" style={{ background: o.color ?? carOf(o.car)?.color }} />{carOf(o.car)?.make} {carOf(o.car)?.model}
                  </button>
                ))}
              </div>
            )}
            <div>
              <p className="text-xl font-black leading-tight">{model.make} {model.model}</p>
              <p className="text-sm text-slate-500">{model.kind} · plate {mine.plate}{impounded ? " · in the police impound" : ""}</p>
            </div>
            {/* How it races: as it came, and now */}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
              <Stat label="Top speed" base={base.top} now={now.top} max={95} unit={`${Math.round((now.top * 3.6) / 0.82)} km/h`} />
              <Stat label="Acceleration" base={base.accel} now={now.accel} max={18} unit={`+${tuneBoost("turbo", tune.turbo)}%`} />
              <Stat label="Grip" base={base.grip} now={now.grip} max={1.5} unit={`+${tuneBoost("tyres", tune.tyres)}%`} />
            </div>

            {note && <p className={`rounded-2xl px-3 py-2 text-sm font-semibold ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}

            {TUNE_PARTS.map((p) => {
              const stage = tune[p.id], cost = tuneCost(model.id, p.id, stage);
              return (
                <div key={p.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black">{p.name} <span className="text-xs font-semibold text-slate-400">· {p.stat}</span></p>
                      <p className="text-xs text-slate-500">{p.blurb}</p>
                    </div>
                    <div className="flex gap-1 pt-1" aria-label={`Stage ${stage} of 3`}>
                      {[1, 2, 3].map((n) => <span key={n} className={`w-2.5 h-6 rounded-full ${n <= stage ? "bg-emerald-500" : "bg-slate-200"}`} />)}
                    </div>
                  </div>
                  {cost === null ? (
                    <p className="text-xs font-black text-emerald-700">✅ Fully tuned: {p.stages[2]} (+{p.boost[2]}% {p.stat.toLowerCase()})</p>
                  ) : (
                    <button disabled={busy || impounded || balance < cost} onClick={() => void fit(p.id)}
                      className="w-full h-11 rounded-full bg-slate-900 text-white text-sm font-black disabled:opacity-40">
                      Fit {p.stages[stage]} · +{p.boost[stage]}% · {aed(cost)}
                    </button>
                  )}
                </div>
              );
            })}

            <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
              <p className="font-black">🎨 Paint shop</p>
              <PaintPicker factory={model.color} value={shownColor} onChange={(hex) => { gameAudio.playClickSound(); setPaint(hex); setNote(null); }} />
              <button disabled={busy || impounded || paint === undefined || paint === (mine.color ?? null) || balance < RESPRAY_COST} onClick={() => void respray()}
                className="w-full h-11 rounded-full bg-emerald-700 text-white text-sm font-black disabled:opacity-40">
                {paint === undefined || paint === (mine.color ?? null) ? "Pick a colour to respray" : `Respray in ${paintName(paint)} · ${aed(RESPRAY_COST)}`}
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400">Upgrades stay with the car and count in every race at the Autodrome.</p>
          </>
        )}
      </div>
    </main>
  );
}
