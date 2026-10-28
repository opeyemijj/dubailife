"use client";

// A car dealership or rental branch in 3D: a glass-fronted showroom with a polished floor, the brand's
// colours, and every car on its own lit turntable. Pick a car to bring it centre stage; take it for a
// test drive on Sheikh Zayed Road; then rent it (day, week or month) or buy it (insured and registered).
// Both need the driving license from the Driving Academy.

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { canvasQuality } from "@/lib/device";
import { useCitizen } from "@/lib/citizenStore";
import { aed, buyCar, buyTotal, CARS, insuranceFor, rentCar, rentCarFake, rentCost, returnCar, useGarage, type Car, type Shop } from "@/lib/cars";
import { reloadServices } from "@/lib/cityServices";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { ArrestScene } from "./ArrestScene";
import { gameAudio } from "@/utils/gameAudio";
import { CarModel } from "./CarModel";
import { TestDrive } from "./TestDrive";

function Room({ shop }: { shop: Shop }) {
  const W = 22, D = 16;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[W, D]} /><meshPhysicalMaterial color="#e5e7eb" roughness={0.12} metalness={0.15} clearcoat={1} /></mesh>
      {/* back wall in the brand colour, side walls white, the glass front behind the camera */}
      <mesh position={[0, 3.5, -D / 2]}><boxGeometry args={[W, 7, 0.2]} /><meshStandardMaterial color={shop.color} roughness={0.5} /></mesh>
      <mesh position={[0, 5.4, -D / 2 + 0.12]}><boxGeometry args={[W * 0.7, 1.2, 0.04]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * W / 2, 3.5, 0]}><boxGeometry args={[0.2, 7, D]} /><meshStandardMaterial color="#f8fafc" roughness={0.6} /></mesh>)}
      {/* ceiling light strips */}
      {[-4, 0, 4].map((z) => <mesh key={z} position={[0, 6.95, z]}><boxGeometry args={[W * 0.8, 0.05, 0.3]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.5} /></mesh>)}
      <pointLight position={[0, 6, 0]} intensity={60} distance={30} />
      {/* the welcome desk */}
      <mesh position={[W / 2 - 3, 0.55, -D / 2 + 2.2]}><boxGeometry args={[3, 1.1, 0.9]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      <mesh position={[W / 2 - 3, 1.12, -D / 2 + 2.2]}><boxGeometry args={[3.1, 0.05, 1]} /><meshStandardMaterial color={shop.color} /></mesh>
    </group>
  );
}

function Turntable({ car, x, z, active, onPick }: { car: Car; x: number; z: number; active: boolean; onPick: () => void }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * (active ? 0.35 : 0.08); });
  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onPick(); }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh position={[0, 0.06, 0]} receiveShadow><cylinderGeometry args={[3, 3.1, 0.12, 48]} /><meshStandardMaterial color={active ? "#111827" : "#1f2937"} metalness={0.6} roughness={0.25} /></mesh>
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.85, 3, 64]} /><meshBasicMaterial color={active ? "#22d3ee" : "#475569"} /></mesh>
      <group ref={g} position={[0, 0.12, 0]}><CarModel car={car} /></group>
      {active && <spotLight position={[0, 6, 2]} angle={0.5} penumbra={0.6} intensity={80} distance={14} target-position={[x, 0, z]} />}
    </group>
  );
}

function CameraTo({ x, z }: { x: number; z: number }) {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useFrame((_, dt) => {
    if (!controls) return;
    controls.target.lerp(new THREE.Vector3(x, 0.8, z), Math.min(1, dt * 3));
    controls.update();
  });
  return null;
}

export function Showroom({ shop }: { shop: Shop }) {
  const { citizen } = useCitizen();
  const { garage, reload } = useGarage(citizen?.id);
  const quality = useMemo(() => canvasQuality(), []);
  const [pick, setPick] = useState(0);
  const [days, setDays] = useState(CARS.rentDays[0]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [driving, setDriving] = useState(false);
  const [arrested, setArrested] = useState(false);
  const car = shop.cars[pick];
  const spots = shop.cars.map((_, i) => ({ x: (i - (shop.cars.length - 1) / 2) * 6.6, z: i % 2 ? -1.6 : 0.4 }));
  const licensed = !!garage?.licence;
  const balance = citizen?.balance ?? 0;
  const price = shop.rent ? rentCost(car, days) + CARS.deposit : buyTotal(car);

  if (driving) return <TestDrive car={car} look={citizen?.look} onDone={() => setDriving(false)} />;
  if (arrested) return <ArrestScene look={citizen?.look} onDone={() => { setArrested(false); void reloadServices(); openPhone("court"); }} />;

  // No license, at a rental counter: the risky option. Usually the agent spots it and calls the police.
  const tryFake = async () => {
    if (!confirm("Show a fake driving license? If they spot it, Dubai Police will arrest you: hours in custody, a lawyer, and a big fine.")) return;
    setBusy(true);
    const r = await rentCarFake(shop.id, car.id, days);
    setBusy(false);
    if (r.error) return setNote({ ok: false, text: r.error });
    if (r.data?.caught) { setArrested(true); return; }
    gameAudio.playCoinSound();
    void reload();
    setNote({ ok: true, text: `😅 The agent didn't look closely. The ${car.make} ${car.model} is yours for ${days} day${days > 1 ? "s" : ""}… for now.` });
  };

  const act = async () => {
    setBusy(true);
    const r = shop.rent ? await rentCar(shop.id, car.id, days) : await buyCar(shop.id, car.id);
    setBusy(false);
    if (r.error) return setNote({ ok: false, text: r.error });
    gameAudio.playCoinSound();
    void reload();
    setNote({ ok: true, text: shop.rent
      ? `🔑 Your ${car.make} ${car.model} is ready for ${days} day${days > 1 ? "s" : ""}. Bring it back any time for your deposit.`
      : `🎉 You own a ${car.make} ${car.model}! Plate ${(r.data as { plate: string }).plate}, insured and registered for a year.` });
  };

  return (
    <main className="fixed inset-0 bg-slate-900 select-none">
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [0, 4.6, 14], fov: 50 }}>
        <color attach="background" args={["#0f172a"]} />
        <StudioEnvironment intensity={0.9} />
        <hemisphereLight args={["#ffffff", "#94a3b8", 0.8]} />
        <directionalLight position={[4, 9, 6]} intensity={1.6} castShadow />
        <Suspense fallback={null}>
          <Room shop={shop} />
          {shop.cars.map((c, i) => <Turntable key={c.id} car={c} x={spots[i].x} z={spots[i].z} active={i === pick} onPick={() => { gameAudio.playClickSound(); setPick(i); }} />)}
          <group position={[spots[pick].x + 3.2, 0, spots[pick].z + 2.2]} rotation={[0, -0.8, 0]}><CitizenAvatar look={{ gender: "man", preset: "Business_Male_04" }} animation="talk" /></group>
          <group position={[spots[pick].x - 2.6, 0, spots[pick].z + 3]} rotation={[0, 2.5, 0]}><CitizenAvatar look={citizen?.look} animation="idle" /></group>
        </Suspense>
        <CameraTo x={spots[pick].x} z={spots[pick].z} />
        <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={20} minPolarAngle={0.5} maxPolarAngle={1.45} />
      </Canvas>

      <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-center gap-2">
        <Link href="/explore" className="h-10 px-4 rounded-full bg-white/95 font-bold text-slate-800 flex items-center shadow">← Exit</Link>
        <div className="flex-1 min-w-0 bg-white/95 text-slate-900 rounded-full px-4 h-10 flex items-center gap-2 shadow">
          <span>{shop.icon}</span><span className="font-black truncate">{shop.name}</span>
          <span className="text-xs text-slate-500 truncate hidden sm:inline">· {shop.rent ? "Car rental" : "Dealership"} · not affiliated</span>
        </div>
      </header>

      {/* the car you're looking at, and renting or buying it */}
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto bg-white text-slate-900 rounded-[28px] shadow-2xl p-4 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {shop.cars.map((c, i) => (
              <button key={c.id} onClick={() => { gameAudio.playClickSound(); setPick(i); setNote(null); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold ${i === pick ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{c.make} {c.model}</button>
            ))}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl font-black leading-tight">{car.make} {car.model}</p>
              <p className="text-sm text-slate-500">{car.kind} · {car.seats} seats · top speed {car.top} km/h</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-black text-emerald-700">{shop.rent ? aed(car.day) : aed(car.price)}</p>
              <p className="text-xs text-slate-500">{shop.rent ? "per day" : "price"}</p>
            </div>
          </div>
          {shop.rent ? (
            <div className="grid grid-cols-3 gap-1.5">
              {CARS.rentDays.map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`py-2 rounded-2xl text-sm font-semibold ${days === d ? "bg-emerald-50 ring-2 ring-emerald-500" : "bg-slate-100"}`}>
                  {d === 1 ? "1 day" : d === 7 ? "1 week" : "1 month"}<span className="block text-xs text-slate-500">{aed(rentCost(car, d))}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Includes a year&apos;s insurance ({aed(insuranceFor(car))}) and RTA registration ({aed(CARS.registration)}).</p>
          )}
          {note && <p className={`rounded-2xl px-3 py-2 text-sm font-semibold ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}
          {/* Until the garage loads (or if it can't), the buttons still show: the server checks the license. */}
          {garage && !licensed ? (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm space-y-2">
              <p className="font-semibold text-amber-900">🪪 You need a driving license to {shop.rent ? "rent" : "buy"} a car.</p>
              <Link href="/driving" className="block text-center h-11 leading-[2.75rem] rounded-full bg-amber-500 text-white font-black">Go to the Driving Academy</Link>
              {shop.rent && <button disabled={busy} onClick={tryFake} className="w-full h-10 rounded-full bg-white border border-rose-200 text-rose-700 text-sm font-semibold">🕶️ Show a fake license (risky)</button>}
            </div>
          ) : shop.rent && garage?.rental ? (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm space-y-2">
              <p>You&apos;re renting a car until {new Date(garage.rental.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.</p>
              <button disabled={busy} onClick={async () => { setBusy(true); const r = await returnCar(); setBusy(false); void reload(); if (r.data?.caught) { setArrested(true); return; } setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: `Returned. Your ${aed(garage.rental!.deposit)} deposit is back.` }); }} className="w-full h-11 rounded-full bg-slate-900 text-white font-semibold">Return it and get the deposit back</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { gameAudio.playClickSound(); setDriving(true); }} className="h-14 rounded-full bg-slate-100 font-semibold">🛞 Test drive</button>
              <button disabled={busy || balance < price} onClick={act} className="h-14 rounded-full bg-emerald-700 text-white font-semibold disabled:opacity-50 shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]">
                {shop.rent ? `Rent · ${aed(price)}` : `Buy · ${aed(price)}`}
              </button>
            </div>
          )}
          {shop.rent && licensed && !garage?.rental && <p className="text-center text-[11px] text-slate-400">Includes a {aed(CARS.deposit)} deposit, returned when you bring the car back.</p>}
          {garage?.licence && <p className="text-center text-[11px] text-slate-400">🪪 License {garage.licence.number}</p>}
        </div>
      </div>
    </main>
  );
}
