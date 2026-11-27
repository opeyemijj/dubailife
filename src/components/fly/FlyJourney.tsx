"use client";

// Flying to another city, in 3D from the kerb to the arrival hall: check in at the Dubai Life Airways counter
// (choose your cabin and pay: lib/flights), passport control's smart gates, duty free, the gate, down the jet bridge
// and aboard, then the flight itself (outside and inside views), touchdown and arrivals, where you take a taxi to a
// hotel or to a home to rent or buy in the city you've landed in.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Plane, Plane as PlaneIcon, Eye, Armchair } from "lucide-react";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import { ROSTER } from "@/components/avatar/roster";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { useCitizen, refreshCitizen } from "@/lib/citizenStore";
import { CITIES, type CityId } from "@/lib/city/cities";
import { hotelsIn } from "@/lib/hotels";
import { countryOf, myVisa, visaCountryFor, type Visa } from "@/lib/visas";
import { AIRLINE, FLIGHTS, arriveIn, bookFlight, buyDutyFree, cabinOf, flightNumber, flightProgress, routeOf, routesFrom, airportOf, type Booking, type CabinClass } from "@/lib/flights";
import { canvasQuality } from "@/lib/device";
import { gameAudio } from "@/utils/gameAudio";
import { FLOOR, SPOTS, Terminal } from "./Terminal";
import { FLIGHT_SECONDS, FlightScene } from "./Flight";
import { AirportWalk } from "./AirportWalk";

// "walk": the airport walk (./AirportWalk), where you walk the terminal yourself from check-in to the gate.
export type Stage = "checkin" | "walk" | "passport" | "dutyfree" | "gate" | "boarding" | "flight" | "arrived";
const WALK = 1.9;

/** Walks the avatar along waypoints at a steady pace, then calls back. */
function useWalker() {
  const [pose, setPose] = useState<{ x: number; z: number; yaw: number }>({ x: SPOTS.entrance[0], z: SPOTS.entrance[1], yaw: 0 });
  const [walking, setWalking] = useState(false);
  const route = useRef<{ pts: Array<[number, number]>; done?: () => void } | null>(null);
  const walkTo = (pts: Array<[number, number]>, done?: () => void) => { route.current = { pts: [...pts], done }; setWalking(true); };
  return { pose, setPose, walking, setWalking, route, walkTo };
}

function TerminalStage({ walker, look, gatesOpen, bridge, spin, from, to }: {
  walker: ReturnType<typeof useWalker>; look: Parameters<typeof CitizenAvatar>[0]["look"];
  gatesOpen: React.RefObject<number>; bridge: React.RefObject<number>; spin: React.RefObject<number>; from: string; to: string;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const last = useRef<THREE.Vector3 | null>(null);
  // eslint-disable-next-line react-hooks/immutability -- the camera, jet and walker are three.js objects and refs, moved every frame
  useFrame((_, dt) => {
    const r = walker.route.current;
    if (r && r.pts.length) {
      const [tx, tz] = r.pts[0];
      const p = walker.pose, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      const step = Math.min(d, WALK * Math.min(dt, 0.1));
      if (d < 0.05) {
        r.pts.shift();
        // eslint-disable-next-line react-hooks/immutability -- the walker's route is a ref, advanced each frame
        if (!r.pts.length) { walker.route.current = null; walker.setWalking(false); r.done?.(); }
      } else {
        walker.setPose({ x: p.x + (dx / d) * step, z: p.z + (dz / d) * step, yaw: Math.atan2(dx, dz) });
      }
    }
    // The camera follows you along the terminal, keeping its angle.
    const at = new THREE.Vector3(walker.pose.x, FLOOR + 1.4, walker.pose.z);
    if (controls) {
      if (!last.current) { camera.position.set(at.x - 7, at.y + 5, at.z - 9); last.current = at.clone(); }
      camera.position.add(at.clone().sub(last.current));
      controls.target.copy(at);
      controls.update();
      last.current.copy(at);
    }
  });
  return (
    <>
      <color attach="background" args={["#cfe6f5"]} />
      <Terminal from={from} to={to} gatesOpen={gatesOpen} bridge={bridge} spin={spin} />
      <Suspense fallback={null}>
        <CitizenAvatar look={look} animation={(walker.walking ? "walk" : "idle") as AvatarAnimation} pace={walker.walking ? WALK : undefined}
          position={[walker.pose.x, FLOOR, walker.pose.z]} rotation={[0, walker.pose.yaw, 0]} />
      </Suspense>
      <Travellers />
      {/* Your cabin bag, rolling along at your side. */}
      <group position={[walker.pose.x + Math.cos(walker.pose.yaw) * 0.45 - Math.sin(walker.pose.yaw) * 0.15, FLOOR, walker.pose.z - Math.sin(walker.pose.yaw) * 0.45 - Math.cos(walker.pose.yaw) * 0.15]} rotation={[0, walker.pose.yaw, 0]}>
        <mesh position={[0, 0.29, 0]}><boxGeometry args={[0.36, 0.48, 0.22]} /><meshStandardMaterial color="#1e293b" roughness={0.5} /></mesh>
        <mesh position={[0, 0.68, 0]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>
        <mesh position={[0, 0.84, 0]}><boxGeometry args={[0.22, 0.04, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>
      </group>
    </>
  );
}

/** Other travellers in the terminal: walking through duty free with their bags, and waiting in the gate's seats. */
const T_WALKS: Array<{ a: [number, number]; b: [number, number]; speed: number }> = [
  { a: [12, 40], b: [12, 62], speed: 1.2 }, { a: [-12, 62], b: [-12, 40], speed: 1.3 }, { a: [4, 41], b: [4, 61], speed: 1.1 },
  { a: [-4, 61], b: [-4, 41], speed: 1.25 }, { a: [-13, 44], b: [13, 44], speed: 1.15 },
];
/** Gate seats (the rows of chairs at x -12 + r·3.6, z 70 + k·1.1, facing the glass). */
const T_SEATED: Array<[number, number]> = [[-12, 71.1], [-8.4, 73.3], [-4.8, 70], [-1.2, 75.5], [2.4, 72.2], [-8.4, 76.6]];
function Travellers() {
  const groups = useRef<Array<THREE.Group | null>>([]);
  useFrame(({ clock }) => {
    T_WALKS.forEach((w, i) => {
      const g = groups.current[i];
      if (!g) return;
      const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = (clock.elapsedTime * w.speed + i * 9) % (2 * len), f = (d < len ? d : 2 * len - d) / len;
      g.position.set(w.a[0] + (w.b[0] - w.a[0]) * f, FLOOR, w.a[1] + (w.b[1] - w.a[1]) * f);
      g.rotation.y = Math.atan2(w.b[0] - w.a[0], w.b[1] - w.a[1]) + (d < len ? 0 : Math.PI);
    });
  });
  const lookOf = (i: number) => { const r = ROSTER[(i * 7 + 3) % ROSTER.length]; return { gender: r.gender, preset: r.id }; };
  return (
    <Suspense fallback={null}>
      {T_WALKS.map((w, i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }}>
          <CitizenAvatar look={lookOf(i)} animation="walk" pace={w.speed} />
          <mesh position={[0.4, 0.3, -0.2]}><boxGeometry args={[0.38, 0.5, 0.24]} /><meshStandardMaterial color={["#1e293b", "#b91c1c", "#0f766e", "#7c3aed"][i % 4]} /></mesh>
        </group>
      ))}
      {T_SEATED.map(([x, z], i) => (
        <group key={`s${i}`} position={[x, FLOOR, z]} rotation={[0, -Math.PI / 2, 0]}><CitizenAvatar look={lookOf(i + 10)} animation="sit" /></group>
      ))}
    </Suspense>
  );
}

export function FlyJourney({ from: fromCity, to: toCity, dev }: { from: CityId; to: CityId; /** Development preview: start at this step. */ dev?: { stage: Stage; inside?: boolean; t?: number } }) {
  // This trip, fixed for the whole journey: landing moves you to the other city, and nothing that changes then
  // (where the game says you are) may turn the arrival screen into the other city's.
  const [from] = useState(fromCity);
  // Where to: picked at the check-in counter (it starts at the link's or the cities strip's choice), then fixed once
  // you've checked in, whatever happens after (landing moves you to the other city).
  const [to, setTo] = useState(toCity);
  // Another country (Doha): a visa first (lib/visas). Looked up for the destination picked at the counter.
  const needVisa = visaCountryFor(to);
  const [visa, setVisa] = useState<Visa | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    if (needVisa) void myVisa(needVisa).then((v) => { if (live) setVisa(v); });
    return () => { live = false; };
  }, [needVisa]);
  const visaOk = !needVisa || visa?.status === "approved";
  const router = useRouter();
  const { citizen } = useCitizen();
  const route = routeOf(from, to);
  const walker = useWalker();
  const [stage, setStage] = useState<Stage>(dev?.stage ?? "checkin");
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bag, setBag] = useState<string[]>([]);
  const [inside, setInside] = useState(!!dev?.inside);
  const [phase, setPhase] = useState("Take-off roll");
  const [progress, setProgress] = useState(0);
  const gatesOpen = useRef(0), bridge = useRef(0.2), spin = useRef(6);
  const flightTime = useRef(dev?.t ?? 0);
  const quality = useMemo(() => canvasQuality(), []);
  const dep = airportOf(from), arr = airportOf(to);
  const look = citizen?.look ?? { gender: "woman" as const };

  // You start at the check-in counter (going to the airport takes you straight in: no kerb, no entrance).
  useEffect(() => {
    const spot = (dev ? ({ checkin: SPOTS.counter, passport: SPOTS.gatesFront, dutyfree: SPOTS.dutyFree, gate: SPOTS.gate, boarding: SPOTS.bridge } as Partial<Record<Stage, [number, number]>>)[dev.stage] : null) ?? SPOTS.counter;
    walker.setPose({ x: spot[0], z: spot[1], yaw: 0 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Touchdown: the server records the landing (that's what puts you in the other city: public.player_city), then
  // you're outside arrivals. It needs the flight's time in the air, so a tab left in the background is retried.
  const land = async () => {
    for (let attempt = 0; booking && attempt < 4; attempt++) {
      const r = await flightProgress(booking.id, "landed");
      if (!r.error) break;
      if (attempt === 3) { setError(`We couldn't record your landing (${r.error}). Try the flight again.`); return; }
      await new Promise((ok) => setTimeout(ok, 5000));
    }
    await arriveIn(to);
    gameAudio.sfx?.("chime");
    setStage("arrived");
  };
  // The flight's progress bar.
  useEffect(() => {
    if (stage !== "flight") return;
    const t = setInterval(() => {
      setProgress(Math.min(1, flightTime.current / FLIGHT_SECONDS));
      if (flightTime.current >= FLIGHT_SECONDS) {
        clearInterval(t);
        void land();
      }
    }, 250);
    return () => clearInterval(t);
  }, [stage, booking, to]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!route) return <main className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center">No flights on this route.</main>;

  const checkIn = async () => {
    setBusy(true); setError(null);
    const r = await bookFlight(from, to, cabin);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't book that."); return; }
    gameAudio.playCoinSound();
    void refreshCitizen();
    setBooking(r.data);
    // Walk the terminal yourself (check-in, passport control, security, your gate), or skip it (walkSkipped).
    setStage("walk");
  };
  /** Skipped the airport walk: the terminal walks you to passport control as before. */
  const walkSkipped = () => { setStage("passport"); walker.walkTo([[0, 22], SPOTS.gatesFront]); };
  /** Walked it yourself to the gate: straight onto the plane. */
  const walkDone = () => { walker.setPose({ x: SPOTS.gate[0], z: SPOTS.gate[1], yaw: 0 }); board(); };
  const scanPassport = () => {
    gameAudio.playClickSound();
    gatesOpen.current = 1;
    walker.walkTo([SPOTS.gatesThrough, [0, 42], SPOTS.dutyFree], () => { gatesOpen.current = 0; setStage("dutyfree"); });
  };
  const buy = async (id: string) => {
    setBusy(true); setError(null);
    const r = await buyDutyFree(id);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playCoinSound();
    void refreshCitizen();
    setBag((b) => [...b, id]);
  };
  // Round the tree column by the gate (x 8, z 78) and the seats, not through them.
  const toGate = () => { setStage("gate"); walker.walkTo([[0, 62], [4, 72], [9.6, 74], SPOTS.gate]); };
  const board = () => {
    gameAudio.playClickSound();
    if (booking) void flightProgress(booking.id, "boarded");
    setStage("boarding");
    bridge.current = 1;
    // Past the gate desk (x 10.5–11.5, z 78.5–81.5), through the doorway in the glass and down the jet bridge.
    walker.walkTo([[13, 84], SPOTS.bridge, [SPOTS.bridge[0] + 8, 84]], () => { flightTime.current = 0; spin.current = 40; setStage("flight"); });
  };

  const airportName = `${dep.name} · ${dep.terminal}`;
  const cityName = CITIES[to].name;
  // Arrival: where to go in the city you've landed in (its hotels and homes; lib/city/cities prefixes).
  const hereHotels = hotelsIn(to).slice(0, 8);

  if (stage === "walk" && booking) {
    return <AirportWalk from={from} to={to} seat={booking.seat} seed={booking.id} look={look} onDone={walkDone} onSkip={walkSkipped} />;
  }

  return (
    <main className="fixed inset-0 bg-slate-950 select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ position: [-7, FLOOR + 6, -6], fov: 50, near: 0.1, far: 60000 }} gl={{ powerPreference: quality.powerPreference }}>
        {stage === "flight" || stage === "arrived"
          ? <FlightScene to={to} cabin={booking?.class ?? cabin} view={{ inside }} timeRef={flightTime} onPhase={(p) => setPhase(p)} />
          : <TerminalStage walker={walker} look={look} gatesOpen={gatesOpen} bridge={bridge} spin={spin} from={dep.code} to={cityName} />}
        {/* Inside the cabin the seat camera is yours (drag to look); everywhere else the camera circles you or the jet. */}
        {!(stage === "flight" && inside) && (
          <OrbitControls key={stage === "flight" ? "flight" : "terminal"} makeDefault enablePan={false}
            minDistance={stage === "flight" ? 30 : 3} maxDistance={stage === "flight" ? 260 : 18} maxPolarAngle={stage === "flight" ? Math.PI : 1.45} />
        )}
      </Canvas>

      {/* Top: where you are */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="rounded-2xl bg-slate-950/80 text-white px-3 py-2 pointer-events-auto">
          <p className="text-[11px] font-bold text-teal-300 flex items-center gap-1"><PlaneIcon className="w-3 h-3" /> {AIRLINE.name}</p>
          <p className="text-sm font-black">{stage === "flight" ? `${flightNumber(from, to)} · ${dep.code} → ${arr.code}` : stage === "arrived" ? `Welcome to ${cityName}` : airportName}</p>
          {booking && <p className="text-[11px] text-white/70">Seat {booking.seat} · {cabinOf(booking.class).name}{bag.length ? ` · 🛍️ ${bag.length}` : ""}</p>}
        </div>
        {stage !== "flight" && stage !== "arrived" && (
          <button onClick={() => router.back()} className="h-9 px-3 rounded-full bg-slate-950/80 text-white text-xs font-black pointer-events-auto">Leave</button>
        )}
      </div>

      {/* Bottom: what to do at each step */}
      <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          {error && <p className="mb-2 rounded-xl bg-rose-600 text-white text-sm font-bold px-3 py-2">{error}</p>}

          {stage === "checkin" && !walker.walking && (
            <Panel title={`Check in · ${dep.code} to ${arr.code}`} sub={`${flightNumber(from, to)} · ${route.minutes} min · choose where and your cabin`}>
              {/* Where to: every city this airport flies to. */}
              {routesFrom(from).length > 1 && (
                <div className="flex gap-2">
                  {routesFrom(from).map((r) => {
                    const c = CITIES[r.to as CityId];
                    return (
                      <button key={r.to} onClick={() => { gameAudio.playClickSound(); setTo(r.to as CityId); try { sessionStorage.setItem("fly-to", r.to); } catch { /* storage blocked */ } }}
                        className={`flex-1 min-w-0 h-14 rounded-2xl border-2 flex flex-col items-center justify-center font-black text-sm ${to === r.to ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                        <span className="text-lg leading-none">{c.icon}</span>
                        <span className="truncate max-w-full px-1">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {FLIGHTS.classes.map((c) => (
                  <button key={c.id} onClick={() => setCabin(c.id as CabinClass)} className={`rounded-2xl p-2.5 text-left border-2 ${cabin === c.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                    <p className="text-xl">{c.icon}</p>
                    <p className="text-sm font-black">{c.name}</p>
                    <p className="text-xs font-black text-teal-700">AED {route.fares[c.id as CabinClass].toLocaleString()}</p>
                  </button>
                ))}
              </div>
              <ul className="text-xs text-slate-500 list-disc pl-4">{cabinOf(cabin).perks.map((p) => <li key={p}>{p}</li>)}</ul>
              {visaOk ? (
                <button disabled={busy} onClick={() => void checkIn()} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black disabled:opacity-50">
                  {busy ? "Checking in…" : `Pay AED ${route.fares[cabin].toLocaleString()} & check in`}
                </button>
              ) : (
                // No visa yet for this country: the application first (it comes back here when it's approved).
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 space-y-2">
                  <p className="text-sm font-black text-[#8a1538]">{countryOf(needVisa!).flag} You need a {countryOf(needVisa!).name} visa to fly to {CITIES[to].name}</p>
                  <p className="text-xs text-slate-600">{visa?.status === "review" ? "Your application is under review: usually about a minute." : `You live in the UAE. Apply online: a tourist e-visa is AED ${countryOf(needVisa!).kinds[0].fee}.`}</p>
                  <button onClick={() => router.push(`/visa/${needVisa}?then=${encodeURIComponent(`/fly?to=${to}`)}`)} className="w-full h-12 rounded-2xl bg-[#8a1538] text-white font-black">
                    {visa?.status === "review" ? "🛂 See your application" : `🛂 Apply for a ${countryOf(needVisa!).name} visa`}
                  </button>
                </div>
              )}
            </Panel>
          )}

          {stage === "passport" && !walker.walking && (
            <Panel title="Passport control" sub="Smart gate: scan your passport and look at the camera.">
              <button onClick={scanPassport} className="w-full h-12 rounded-2xl bg-blue-700 text-white font-black">🛂 Scan passport</button>
            </Panel>
          )}

          {stage === "dutyfree" && !walker.walking && (
            <Panel title="Duty free" sub="Something for the trip? Or straight to the gate.">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {FLIGHTS.dutyFree.map((d) => (
                  <button key={d.id} disabled={busy} onClick={() => void buy(d.id)} className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-left disabled:opacity-50">
                    <span className="text-lg mr-1">{d.icon}</span><span className="text-xs font-black">{d.name}</span>
                    <span className="block text-[11px] font-black text-amber-700">AED {d.price.toLocaleString()}{bag.includes(d.id) ? " · ✓ bought" : ""}</span>
                  </button>
                ))}
              </div>
              <button onClick={toGate} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Go to gate B12 ›</button>
            </Panel>
          )}

          {stage === "gate" && !walker.walking && (
            <Panel title={`Gate B12 · ${flightNumber(from, to)} to ${cityName}`} sub={booking ? `Now boarding · ${cabinOf(booking.class).name} · seat ${booking.seat}` : "Now boarding"}>
              <button onClick={board} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black">🎫 Board the plane</button>
            </Panel>
          )}

          {stage === "flight" && (
            <div className="rounded-3xl bg-slate-950/85 text-white p-3 space-y-2">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-black">{phase}</p>
                <div className="flex rounded-full bg-white/10 p-0.5">
                  <button onClick={() => setInside(false)} className={`h-8 px-3 rounded-full text-xs font-black flex items-center gap-1 ${!inside ? "bg-white text-slate-950" : ""}`}><Eye className="w-3.5 h-3.5" /> Outside</button>
                  <button onClick={() => setInside(true)} className={`h-8 px-3 rounded-full text-xs font-black flex items-center gap-1 ${inside ? "bg-white text-slate-950" : ""}`}><Armchair className="w-3.5 h-3.5" /> Inside</button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-white/70">
                <span>{dep.code}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/15 relative">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-teal-400" style={{ width: `${progress * 100}%` }} />
                  <Plane className="w-4 h-4 text-white absolute -top-1.5 rotate-45" style={{ left: `calc(${progress * 100}% - 8px)` }} />
                </div>
                <span>{arr.code}</span>
              </div>
              <p className="text-[11px] text-white/60">{inside ? "Drag to look round the cabin and out of the window." : "Drag to fly the camera round the jet."}</p>
            </div>
          )}

          {stage === "arrived" && (
            <Panel title={`Welcome to ${cityName} 🎉`} sub={`${arr.name}. Grab a taxi: to a hotel, or to find a home to rent or buy.`}>
              {hereHotels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">🏨 Taxi to a hotel</p>
                  <div className="grid grid-cols-2 gap-2">
                    {hereHotels.map((h) => (
                      <button key={h.id} onClick={() => router.push(`${CITIES[to].path}?to=${encodeURIComponent(h.id)}`)} className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-left text-xs font-black">🚕 {h.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => router.push(`/hotels?city=${to}`)} className="w-full h-11 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm">🏨 Book a hotel stay</button>
              <button onClick={() => router.push(`${CITIES[to].path}?filter=towers`)} className="w-full h-11 rounded-2xl bg-teal-700 text-white font-black text-sm">🏡 Find a home to rent or buy</button>
              {to === "abu-dhabi" && (
                <button onClick={() => router.push("/abu-dhabi/passport")} className="w-full h-11 rounded-2xl bg-teal-800 text-white font-black text-sm">🛂 Your Abu Dhabi Passport: 16 stamps to collect</button>
              )}
              <button onClick={() => router.push(CITIES[to].path)} className="w-full h-11 rounded-2xl bg-slate-900 text-white font-black text-sm">🗺️ Explore {cityName}</button>
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white text-slate-900 p-4 space-y-3 shadow-2xl">
      <div><p className="font-black text-lg leading-tight">{title}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
      {children}
    </div>
  );
}
