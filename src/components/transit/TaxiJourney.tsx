"use client";

// A Dubai Taxi ride in 3D: wait at the kerb while a cream taxi pulls in, climb into the back as the door
// opens, the driver greets you, buckle up, and the meter starts at the flag-fall. Then Sheikh Zayed Road:
// the meter ticking, lane changes with the indicator, a Salik gate's beep on longer trips, small talk from
// the driver. Watch from the back seat, the side window or outside. At the end, pull over, pay (card or
// cash, tip if you like) and step out.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { ModalPortal } from "@/components/ui/modal-portal";
import { TAXI, taxiQuote } from "@/lib/transit";
import { BurjKhalifa, CityBlocks, dubaiSky, laneX, Road, ROAD, SalikGate, Sedan, SkyAndLight, Traffic, type District, type Travel } from "./TransitWorld";
import { announce, doorThud, indicatorTick, isTransitMuted, meterTick, nolTap, salikBeep, setLoopSpeed, setTransitMuted, startLoop, stopLoops, stopSpeech, warmUpVoices } from "./transitAudio";

type Stage = "kerb" | "pullup" | "board" | "ride" | "arrive" | "pay" | "done";
type View = "seat" | "window" | "outside";

const VMAX = 24, ACCEL = 3;
/** Real kilometres become this many scene metres, so a cross-town trip lasts about a minute. */
const M_PER_KM = 130;
const KERB_LANE = 4;
const PAVE_X = ROAD.half + ROAD.median / 2 + 1.6;

interface Hud { stage: Stage; meter: number; speed: number; km: number; message: string; subtitle: string; progress: number }

export function TaxiJourney({ metres, destination, look, onPay, onArrive, onCancel }: {
  metres: number; destination: string; look?: AvatarLookProps;
  /** Charges the fare (with any tip); false when the citizen can't pay. */
  onPay: (amount: number) => boolean;
  onArrive: () => void;
  onCancel: () => void;
}) {
  const quote = useMemo(() => taxiQuote(metres), [metres]);
  const sky = useMemo(() => dubaiSky(), []);
  // Dubai's taxi firms each have their own roof colour; which one turns up depends on the trip.
  const roof = TAXI.roofs[Math.round(metres) % TAXI.roofs.length];
  // About 15 s to 75 s of driving, however far the trip.
  const length = Math.min(1700, Math.max(260, quote.km * M_PER_KM));
  const travel = useRef({ s: 0, speed: 0 });
  const taxiRef = useRef({ z: 90, x: laneX(KERB_LANE), door: 0, lane: KERB_LANE });
  const directorRef = useRef<{ stage: Stage; t: number; said: number; salik: boolean; tick: number }>({ stage: "kerb", t: 0, said: -1, salik: false, tick: 0 });
  const firstHud: Hud = { stage: "kerb", meter: quote.flag, speed: 0, km: 0, message: "", subtitle: "", progress: 0 };
  const hudRef = useRef<Hud>(firstHud);
  const [shown, setShown] = useState<Hud>(firstHud);
  const [view, setView] = useState<View>("seat");
  const [muted, setMuted] = useState(isTransitMuted());
  const [tip, setTip] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { warmUpVoices(); const id = setInterval(() => setShown({ ...hudRef.current }), 120); return () => { clearInterval(id); stopLoops(); stopSpeech(); }; }, []);

  const hail = () => { directorRef.current = { stage: "pullup", t: 0, said: -1, salik: false, tick: 0 }; hudRef.current.stage = "pullup"; };
  const pay = (how: "card" | "cash") => {
    if (!onPay(quote.total + tip)) { setError("Payment declined — not enough AED in your wallet."); return; }
    if (how === "card") nolTap();
    doorThud();
    announce([{ text: tip ? "Thank you so much! Have a lovely day." : "Thank you, have a nice day!", lang: "en" }], undefined, "driver");
    hudRef.current.stage = "done";
    setShown({ ...hudRef.current });
  };
  const skip = () => {
    // Skipping still pays the fare (no tip).
    stopLoops(); stopSpeech();
    if (!onPay(quote.total)) { setError("Not enough AED for the fare."); return; }
    onArrive();
  };

  const districtAt = (p: number): District => { const f = p / length; return f < 0.25 ? "burj" : f < 0.5 ? "lowrise" : f < 0.75 ? "towers" : "marina"; };
  const salikAt = length * 0.42;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] bg-slate-950 select-none">
        <Canvas camera={{ fov: 62, near: 0.05, far: 900, position: [PAVE_X + 3, 2.2, 10] }} dpr={[1, 1.75]}>
          <SkyAndLight sky={sky} />
          <Road travel={travel} sky={sky} />
          <Traffic travel={travel} avoid={taxiRef} />
          <CityBlocks travel={travel} sky={sky} districtAt={districtAt} />
          <BurjKhalifa travel={travel} p={120} x={-150} />
          {quote.salik > 0 && <SalikGate travel={travel} p={salikAt} />}
          <TheTaxi taxiRef={taxiRef} roof={roof} inside={view !== "outside" && ["ride", "arrive", "pay"].includes(shown.stage)} meter={shown.meter} />
          <Rider look={look} taxiRef={taxiRef} directorRef={directorRef} />
          <Director travelRef={travel} taxiRef={taxiRef} directorRef={directorRef} hudRef={hudRef} quote={quote} length={length} salikAt={salikAt} view={view} />
        </Canvas>

        {/* Top: where you're going, the meter, the speed */}
        <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
          <div className="w-full max-w-xl rounded-2xl bg-slate-950/85 text-white shadow-2xl backdrop-blur px-4 py-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚕</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate">Dubai Taxi · to {destination}</div>
                <div className="text-[11px] text-slate-300 truncate">≈ {quote.km.toFixed(1)} km · AED {quote.flag.toFixed(2)} flag-fall · AED {TAXI.perKm.toFixed(2)}/km{quote.salik ? ` · Salik AED ${quote.salik}` : ""}</div>
              </div>
              <div className="rounded-lg bg-black px-2.5 py-1 font-mono text-lg font-black text-emerald-400 tabular-nums">{shown.meter.toFixed(2)}</div>
              <button onClick={() => { const m = !muted; setMuted(m); setTransitMuted(m); }} className="w-8 h-8 rounded-lg bg-white/10 text-sm" aria-label={muted ? "Sound on" : "Sound off"}>{muted ? "🔇" : "🔊"}</button>
              {!["pay", "done"].includes(shown.stage) && (
                <button onClick={() => (shown.stage === "kerb" || shown.stage === "pullup" ? onCancel() : skip())} className="h-8 px-2.5 rounded-lg bg-white/10 text-xs font-black">{shown.stage === "kerb" || shown.stage === "pullup" ? "Cancel" : "Skip ⏭"}</button>
              )}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-amber-400 transition-[width] duration-100" style={{ width: `${Math.round(shown.progress * 100)}%` }} /></div>
            {shown.stage === "ride" && <div className="mt-1.5 text-[11px] text-slate-300">🛣️ Sheikh Zayed Road · {Math.round(shown.speed)} km/h · {shown.km.toFixed(1)} km</div>}
          </div>
        </div>

        {shown.message && <div className="absolute top-32 inset-x-0 text-center pointer-events-none"><span className="inline-block rounded-2xl bg-white/95 px-4 py-2 text-sm font-black text-slate-900 shadow-xl">{shown.message}</span></div>}
        {shown.subtitle && <div className="absolute bottom-28 inset-x-0 text-center pointer-events-none px-6"><span className="inline-block rounded-xl bg-black/75 px-3 py-1.5 text-sm text-white">🧔 {shown.subtitle}</span></div>}

        <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] inset-x-3 flex flex-col items-center gap-2">
          {error && <p className="rounded-xl bg-rose-600 text-white text-xs font-black px-3 py-2">{error}</p>}
          {shown.stage === "kerb" && <button onClick={hail} className="h-16 px-6 rounded-[1.5rem] bg-amber-400 text-slate-950 font-black text-lg shadow-2xl active:scale-95">✋ Hail a taxi</button>}
          {shown.stage === "ride" && (
            <div className="flex flex-wrap justify-center gap-2">
              {(["seat", "window", "outside"] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`h-10 px-3.5 rounded-xl text-xs font-black shadow-lg ${view === v ? "bg-amber-400 text-slate-950" : "bg-white/90 text-slate-900"}`}>
                  {v === "seat" ? "🪑 Back seat" : v === "window" ? "🪟 Side window" : "🎥 Outside"}
                </button>
              ))}
            </div>
          )}
          {shown.stage === "pay" && (
            <div className="w-full max-w-sm rounded-[1.75rem] bg-white text-slate-900 shadow-2xl p-5 space-y-3">
              <div className="text-center"><div className="text-3xl">🧾</div><h2 className="text-lg font-black">We&apos;re here: {destination}</h2></div>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between"><dt className="text-slate-500">Meter</dt><dd className="font-bold">AED {quote.meter.toFixed(2)}</dd></div>
                {quote.salik > 0 && <div className="flex justify-between"><dt className="text-slate-500">Salik toll</dt><dd className="font-bold">AED {quote.salik.toFixed(2)}</dd></div>}
                {tip > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tip</dt><dd className="font-bold">AED {tip.toFixed(2)}</dd></div>}
                <div className="flex justify-between border-t border-slate-100 pt-1"><dt className="font-black">Total</dt><dd className="font-black">AED {(quote.total + tip).toFixed(2)}</dd></div>
              </dl>
              <div className="flex gap-1.5">{[0, 5, 10].map((t) => <button key={t} onClick={() => setTip(t)} className={`flex-1 h-9 rounded-xl text-xs font-black ${tip === t ? "bg-amber-400" : "bg-slate-100"}`}>{t ? `Tip AED ${t}` : "No tip"}</button>)}</div>
              <div className="flex gap-2">
                <button onClick={() => pay("card")} className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black">💳 Card</button>
                <button onClick={() => pay("cash")} className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white font-black">💵 Cash</button>
              </div>
            </div>
          )}
          {shown.stage === "done" && (
            <div className="w-full max-w-sm rounded-[1.75rem] bg-white text-slate-900 shadow-2xl p-5 space-y-3 text-center">
              <div className="text-4xl">🚕</div>
              <h2 className="text-lg font-black">Thanks for riding with Dubai Taxi</h2>
              <p className="text-sm text-slate-500">{quote.km.toFixed(1)} km · paid AED {(quote.total + tip).toFixed(2)}</p>
              <button onClick={onArrive} className="w-full h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">Step out at {destination}</button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

/** A meter display drawn on a canvas (green digits on black). */
function MeterScreen({ value }: { value: number }) {
  const canvas = useMemo(() => { const c = document.createElement("canvas"); c.width = 256; c.height = 96; return c; }, []);
  const tex = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => {
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#050505"; g.fillRect(0, 0, 256, 96);
    g.fillStyle = "#22c55e"; g.font = "bold 54px monospace"; g.textAlign = "right"; g.textBaseline = "middle";
    g.fillText(value.toFixed(2), 240, 54);
    g.font = "bold 18px sans-serif"; g.textAlign = "left"; g.fillStyle = "#16a34a"; g.fillText("AED", 12, 22);
    if (mat.current?.map) mat.current.map.needsUpdate = true;
  }, [value, canvas]);
  return <mesh><planeGeometry args={[0.32, 0.12]} /><meshBasicMaterial ref={mat} map={tex} toneMapped={false} /></mesh>;
}

/** The taxi: outside, a cream saloon with its coloured roof; inside, the cabin seen from the back seat. */
function TheTaxi({ taxiRef, roof, inside, meter }: { taxiRef: React.RefObject<{ z: number; x: number; door: number }>; roof: string; inside: boolean; meter: number }) {
  const g = useRef<THREE.Group>(null);
  const door = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = taxiRef.current;
    if (!g.current || !t) return;
    g.current.position.set(t.x, 0, t.z);
    if (door.current) door.current.rotation.y = -t.door * 1.1;
  });
  return (
    <group ref={g}>
      <group visible={!inside}>
        <Sedan color="#f5e6c8" taxiRoof={roof} />
        {/* the rear kerb-side door, hinged at its front edge */}
        <group position={[0.92, 0, 0.05]}><group ref={door}><mesh position={[0.02, 0.85, 0.55]}><boxGeometry args={[0.06, 0.9, 1.05]} /><meshStandardMaterial color="#f5e6c8" metalness={0.4} roughness={0.35} /></mesh></group></group>
      </group>
      {inside && (
        <group>
          {/* floor, roof lining, the backs of the front seats, dashboard and windscreen frame */}
          <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.7, 4]} /><meshStandardMaterial color="#1f2937" /></mesh>
          <mesh position={[0, 1.5, 0.2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.7, 2.6]} /><meshStandardMaterial color="#d6d3d1" side={THREE.DoubleSide} /></mesh>
          {[-0.42, 0.42].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.72, -0.35]}><boxGeometry args={[0.5, 0.55, 0.1]} /><meshStandardMaterial color="#292524" /></mesh>
              <mesh position={[x, 1.12, -0.38]}><boxGeometry args={[0.24, 0.18, 0.08]} /><meshStandardMaterial color="#292524" /></mesh>
            </group>
          ))}
          <mesh position={[0, 0.82, -1.3]}><boxGeometry args={[1.7, 0.35, 0.5]} /><meshStandardMaterial color="#111827" /></mesh>
          {[-0.82, 0.82].map((x) => <mesh key={x} position={[x, 1.15, -1.25]} rotation={[0.45, 0, 0]}><boxGeometry args={[0.08, 0.75, 0.08]} /><meshStandardMaterial color="#111827" /></mesh>)}
          <mesh position={[0, 1.52, -1.0]}><boxGeometry args={[1.7, 0.06, 0.3]} /><meshStandardMaterial color="#111827" /></mesh>
          {/* steering wheel (left-hand drive), the mirror, and the meter on the dash */}
          <mesh position={[-0.42, 0.98, -1.05]} rotation={[1.1, 0, 0]}><torusGeometry args={[0.18, 0.025, 8, 24]} /><meshStandardMaterial color="#0b0b0b" /></mesh>
          <mesh position={[0, 1.4, -1.08]}><boxGeometry args={[0.24, 0.07, 0.03]} /><meshStandardMaterial color="#0b0b0b" metalness={0.5} /></mesh>
          <group position={[0.12, 1.05, -1.06]} rotation={[-0.35, 0, 0]}><MeterScreen value={meter} /></group>
          {/* the driver */}
          <Suspense fallback={null}><group position={[-0.42, 0.18, -0.55]} rotation={[0, Math.PI, 0]}><CitizenAvatar look={{ gender: "man", preset: "Male_Adult_08" }} animation="sit" /></group></Suspense>
        </group>
      )}
    </group>
  );
}

/** The citizen on the pavement, then stepping into the taxi (and out at the other end). */
function Rider({ look, taxiRef, directorRef }: { look?: AvatarLookProps; taxiRef: React.RefObject<{ x: number; z: number }>; directorRef: React.RefObject<{ stage: Stage; t: number }> }) {
  const g = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"idle" | "walk" | "wave">("idle");
  const [visible, setVisible] = useState(true);
  useFrame(() => {
    const d = directorRef.current, grp = g.current, t = taxiRef.current;
    if (!d || !grp || !t) return;
    const kerb = new THREE.Vector3(PAVE_X, 0.16, 1.2);
    const door = new THREE.Vector3(t.x + 0.95, 0, t.z + 0.6);
    let next: "idle" | "walk" | "wave" = "idle";
    if (d.stage === "kerb") { grp.position.copy(kerb); grp.rotation.y = Math.PI / 2 + 0.6; }
    else if (d.stage === "pullup") { grp.position.copy(kerb); grp.rotation.y = Math.PI / 2 + 0.6; next = d.t < 2.5 ? "wave" : "idle"; }
    else if (d.stage === "board") {
      const k = Math.max(0, Math.min(1, (d.t - 0.6) / 1.4));
      grp.position.lerpVectors(kerb, door, k);
      grp.rotation.y = -Math.PI / 2;
      next = k > 0 && k < 1 ? "walk" : "idle";
    } else if (d.stage === "pay" || d.stage === "done") {
      grp.position.copy(new THREE.Vector3(PAVE_X, 0.16, t.z + 0.4)); grp.rotation.y = Math.PI / 2;
    }
    const show = d.stage === "kerb" || d.stage === "pullup" || (d.stage === "board" && d.t < 2.1) || d.stage === "done";
    if (show !== visible) setVisible(show);
    if (next !== anim) setAnim(next);
  });
  return <group ref={g} visible={visible}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>;
}

/** Runs the ride: pulling in, boarding, the drive with its meter and events, pulling over. Moves the camera. */
function Director({ travelRef, taxiRef, directorRef, hudRef, quote, length, salikAt, view }: {
  travelRef: Travel; taxiRef: React.RefObject<{ z: number; x: number; door: number; lane: number }>;
  directorRef: React.RefObject<{ stage: Stage; t: number; said: number; salik: boolean; tick: number }>; hudRef: React.RefObject<Hud>;
  quote: ReturnType<typeof taxiQuote>; length: number; salikAt: number; view: View;
}) {
  const camera = useThree((s) => s.camera);
  const camPos = useRef(new THREE.Vector3(PAVE_X + 3, 2.2, 10));
  const look = useRef(new THREE.Vector3());
  const lane = useRef({ from: KERB_LANE, to: KERB_LANE, t: 1, nextChange: 9 });
  const talk = useRef<string[]>([...TAXI.smallTalk]);
  // A different order of chat each ride.
  useEffect(() => { talk.current.sort(() => Math.random() - 0.5); }, []);

  useFrame((_, rawDt) => {
    const d = directorRef.current, h = hudRef.current, tx = taxiRef.current, tr = travelRef.current;
    if (!d || !h || !tx || !tr) return;
    const dt = Math.min(rawDt, 0.05);
    d.t += dt;
    const go = (stage: Stage) => { d.stage = stage; d.t = 0; h.stage = stage; };
    const say = (line: string) => { h.subtitle = line; announce([{ text: line, lang: "en" }], undefined, "driver"); };

    switch (d.stage) {
      case "kerb":
        h.message = "You're on the pavement — hail a passing taxi";
        break;
      case "pullup": {
        h.message = "";
        // Pulls in from behind and brakes beside you.
        const k = Math.min(1, d.t / 4);
        tx.z = 90 * (1 - k) ** 2 + 0.2;
        tx.x = laneX(KERB_LANE);
        if (k >= 1) { go("board"); doorThud(); }
        break;
      }
      case "board":
        tx.door = d.t < 1.8 ? Math.min(1, d.t / 0.5) : Math.max(0, 1 - (d.t - 1.8) / 0.4);
        if (d.t > 2.2 && d.said < 0) { d.said = 0; doorThud(); say(TAXI.greetings[Math.floor(Math.random() * TAXI.greetings.length)]); h.message = "🔒 Seatbelt on · the meter starts"; }
        if (d.t > 4.6) { h.message = ""; startLoop("road", 0.08); meterTick(); go("ride"); }
        break;
      case "ride": {
        const remaining = length - tr.s;
        const want = Math.min(VMAX, Math.sqrt(Math.max(0, 2 * ACCEL * remaining)));
        tr.speed = want > tr.speed ? Math.min(want, tr.speed + ACCEL * dt) : want;
        tr.s = Math.min(length, tr.s + tr.speed * dt);
        setLoopSpeed("road", tr.speed / VMAX);
        h.speed = (tr.speed / VMAX) * 90;
        const f = tr.s / length;
        h.progress = f; h.km = quote.km * f;
        // The meter climbs from the flag-fall to the fare, ticking at each AED 0.50.
        const m = Math.max(quote.flag, Math.round((quote.flag + (quote.meter - quote.flag) * f) * 2) / 2);
        if (m > h.meter) { h.meter = m; meterTick(); }
        // Lane changes now and then (out of the kerb lane first), with the indicator.
        const L = lane.current;
        if (d.t > L.nextChange && remaining > 120 && L.t >= 1) {
          L.from = L.to; L.to = L.from === KERB_LANE ? 2 : Math.max(1, Math.min(3, L.from + (Math.random() < 0.5 ? -1 : 1))); L.t = 0;
          L.nextChange = d.t + 9 + Math.random() * 8;
        }
        if (remaining <= 120 && L.to !== KERB_LANE && L.t >= 1) { L.from = L.to; L.to = KERB_LANE; L.t = 0; }
        if (L.t < 1) {
          L.t = Math.min(1, L.t + dt / 2.4);
          if (Math.floor(d.t * 2.5) !== d.tick) { d.tick = Math.floor(d.t * 2.5); indicatorTick(); }
        }
        tx.lane = L.to;
        tx.x = THREE.MathUtils.lerp(laneX(L.from), laneX(L.to), L.t * L.t * (3 - 2 * L.t));
        tx.z = 0;
        // Salik.
        if (quote.salik && !d.salik && tr.s >= salikAt) { d.salik = true; salikBeep(); h.message = `🟢 Salik gate · +AED ${quote.salik}`; }
        if (d.salik && tr.s > salikAt + 60 && h.message.startsWith("🟢")) h.message = "";
        // Small talk every so often.
        const slot = Math.floor(d.t / 14);
        if (slot >= 1 && slot !== d.said && talk.current.length) { d.said = slot; say(talk.current.shift()!); }
        if (h.subtitle && d.t % 14 > 6) h.subtitle = "";
        if (remaining < 0.05) { tr.speed = 0; h.speed = 0; stopLoops(); h.meter = quote.meter; go("arrive"); say("Here we are!"); }
        break;
      }
      case "arrive":
        if (d.t > 1.6) { h.subtitle = ""; go("pay"); }
        break;
    }

    // The camera.
    const riding = d.stage === "ride" || d.stage === "arrive" || d.stage === "pay";
    let pos: THREE.Vector3, at: THREE.Vector3;
    // From the back seat (behind the front passenger seat), looking between the front seats down the road.
    if (riding && view === "seat") { pos = new THREE.Vector3(tx.x + 0.22, 1.34, tx.z + 0.6); at = new THREE.Vector3(tx.x - 0.1, 1.05, tx.z - 14); }
    else if (riding && view === "window") { pos = new THREE.Vector3(tx.x + 0.5, 1.2, tx.z + 0.55); at = new THREE.Vector3(tx.x + 12, 1.6, tx.z - 3); }
    // Outside: following from behind and above, off towards the middle of the road.
    else if (riding) { pos = new THREE.Vector3(tx.x - 2.2, 4.4, tx.z + 11); at = new THREE.Vector3(tx.x, 0.9, tx.z - 8); }
    else { pos = new THREE.Vector3(PAVE_X + 3.2, 2.3, 7.5); at = new THREE.Vector3(laneX(KERB_LANE), 1, -2); }
    const snap = riding && view !== "outside";
    camPos.current.lerp(pos, snap ? 1 : 1 - Math.exp(-dt * 3));
    look.current.lerp(at, snap ? 1 : 1 - Math.exp(-dt * 3));
    camera.position.copy(camPos.current);
    camera.lookAt(look.current);
  });
  return null;
}
