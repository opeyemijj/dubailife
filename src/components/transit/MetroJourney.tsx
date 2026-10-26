"use client";

// Riding the Dubai Metro in 3D: tap your Nol card at the gate, wait on the platform while the next train is
// announced, watch it glide in, board as the doors chime open, and ride the Red Line viaduct along Sheikh
// Zayed Road. Choose the driverless front window, a side window or a view from outside. The train calls at
// every station on the way with its "next station" and "this is" announcements (English, then Arabic) and
// the door chimes, until you step off at your stop.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { ModalPortal } from "@/components/ui/modal-portal";
import { METRO, metroFare, metroRoute, phrase, type MetroStation } from "@/lib/transit";
import { BurjKhalifa, CityBlocks, dubaiSky, MetroStation as Station, MetroTrain, Road, SkyAndLight, Traffic, VIADUCT, Viaduct, type District, type Travel } from "./TransitWorld";
import { announce, doorsClosing, doorsOpening, isTransitMuted, nolTap, setLoopSpeed, setTransitMuted, startLoop, stopLoops, stopSpeech, warmUpVoices } from "./transitAudio";

type Stage = "gate" | "waiting" | "boarding" | "riding" | "dwell" | "arriving" | "done";
type View = "front" | "window" | "outside";

/** Metres between stations in the scene (real gaps are 1–2 km; this keeps each hop to ~20 s). */
const HOP = 300;
const VMAX = 25, ACCEL = 2.2;
/** The train stands with its middle at z = 0 when stopped (it's five 17 m cars: 0..68 from its front). */
const TRAIN_Z = -34;
const PLAT_X = VIADUCT.x + 1.65;

interface Hud {
  stage: Stage; next: string; nextAr: string; stopIndex: number; speed: number; countdown: number; doorsOpen: boolean; message: string;
}

export function MetroJourney({ fromMap, toMap, gold, look, onPay, onArrive, onCancel }: {
  fromMap: string; toMap: string; gold: boolean; look?: AvatarLookProps;
  /** Charges the fare; false when the citizen can't pay. */
  onPay: (fare: number) => boolean;
  onArrive: () => void;
  onCancel: () => void;
}) {
  const route = useMemo(() => metroRoute(fromMap, toMap), [fromMap, toMap]);
  const stops = route?.stops ?? [];
  const fare = metroFare(Math.max(1, stops.length - 1), gold);
  const sky = useMemo(() => dubaiSky(), []);
  const travel = useRef({ s: 0, speed: 0 });
  const doorOpen = useRef(0);
  const trainZ = useRef(260);
  const [view, setView] = useState<View>("front");
  const [fast, setFast] = useState(false);
  const [muted, setMuted] = useState(isTransitMuted());
  const firstHud: Hud = { stage: "gate", next: stops[1]?.en ?? "", nextAr: stops[1]?.ar ?? "", stopIndex: 0, speed: 0, countdown: 0, doorsOpen: false, message: "" };
  const hud = useRef<Hud>(firstHud);
  const [shown, setShown] = useState<Hud>(firstHud);
  const [error, setError] = useState<string | null>(null);
  const director = useRef<{ stage: Stage; t: number; k: number; announced: number }>({ stage: "gate", t: 0, k: 1, announced: -1 });

  useEffect(() => { warmUpVoices(); const id = setInterval(() => setShown({ ...hud.current }), 120); return () => { clearInterval(id); stopLoops(); stopSpeech(); }; }, []);

  const pay = () => {
    if (!onPay(fare)) { setError("Not enough AED on your Nol card — top up your wallet first."); return; }
    nolTap();
    setError(null);
    director.current = { stage: "waiting", t: 0, k: 1, announced: -1 };
    hud.current.stage = "waiting";
  };

  if (!route) return null;
  const origin = stops[0], dest = stops[stops.length - 1];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] bg-slate-950 select-none">
        <Canvas camera={{ fov: 60, near: 0.1, far: 900, position: [PLAT_X + 5, VIADUCT.deck + 3, 16] }} dpr={[1, 1.75]}>
          <SkyAndLight sky={sky} />
          <Road travel={travel} sky={sky} />
          <Traffic travel={travel} />
          <Viaduct travel={travel} />
          <CityBlocks travel={travel} sky={sky} districtAt={(p) => districtAt(stops, p)} />
          {stops.some((s) => s.landmark === "burj") && <BurjKhalifa travel={travel} p={stops.findIndex((s) => s.landmark === "burj") * HOP + 70} x={95} />}
          {stops.map((st, k) => <Station key={st.id} travel={travel} p={k * HOP} en={st.en} ar={st.ar} doorOpen={doorOpen} />)}
          <TrainOnTrack trainZ={trainZ} doorOpen={doorOpen} inside={view !== "outside" && ["riding", "dwell"].includes(shown.stage)} gold={gold} />
          <Passenger look={look} director={director} />
          <Director stops={stops} gold={gold} towards={route.towards} travelRef={travel} doorOpenRef={doorOpen} trainZRef={trainZ} directorRef={director} hudRef={hud} fast={fast} view={view} onDone={() => setShown({ ...hud.current, stage: "done" })} />
        </Canvas>

        {/* Top: the line, where it's going, the next stop */}
        <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
          <div className="w-full max-w-xl rounded-2xl bg-slate-950/85 text-white shadow-2xl backdrop-blur px-4 py-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-red-600 text-[11px] font-black">M</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate">{METRO.line} · towards {route.towards.en} {gold && <span className="ml-1 text-amber-300">· Gold Class</span>}</div>
                <div className="text-[11px] text-slate-300 truncate">
                  {shown.stage === "gate" ? `${origin.en} → ${dest.en} · ${stops.length - 1} stops · AED ${fare}` : shown.stage === "done" ? `Arrived: ${dest.en}` : `Next: ${shown.next} · ${shown.nextAr}`}
                </div>
              </div>
              <button onClick={() => { const m = !muted; setMuted(m); setTransitMuted(m); }} className="w-8 h-8 rounded-lg bg-white/10 text-sm" aria-label={muted ? "Sound on" : "Sound off"}>{muted ? "🔇" : "🔊"}</button>
              {shown.stage !== "done" && <button onClick={() => { stopLoops(); stopSpeech(); if (shown.stage === "gate") onCancel(); else onArrive(); }} className="h-8 px-2.5 rounded-lg bg-white/10 text-xs font-black">{shown.stage === "gate" ? "Cancel" : "Skip ⏭"}</button>}
            </div>
            {/* the route strip */}
            <div className="mt-2.5 flex items-center gap-0.5">
              {stops.map((st, k) => (
                <div key={st.id} className="flex-1 flex items-center gap-0.5" title={st.en}>
                  <div className={`w-2.5 h-2.5 shrink-0 rounded-full border-2 ${k < shown.stopIndex ? "bg-red-500 border-red-500" : k === shown.stopIndex ? "bg-white border-red-500 scale-125" : "bg-slate-700 border-slate-500"}`} />
                  {k < stops.length - 1 && <div className={`h-0.5 flex-1 ${k < shown.stopIndex ? "bg-red-500" : "bg-slate-600"}`} />}
                </div>
              ))}
            </div>
            {["riding", "dwell"].includes(shown.stage) && <div className="mt-1.5 text-[11px] text-slate-300">🚇 {Math.round(shown.speed)} km/h · stop {shown.stopIndex} of {stops.length - 1}</div>}
          </div>
        </div>

        {shown.message && <div className="absolute top-36 inset-x-0 text-center pointer-events-none"><span className="inline-block rounded-2xl bg-white/95 px-4 py-2 text-sm font-black text-slate-900 shadow-xl">{shown.message}</span></div>}
        {shown.countdown > 0 && shown.stage === "waiting" && <PlatformBoard towards={route.towards.en} seconds={shown.countdown} />}

        {/* Bottom: what to do now, the view and fast-forward */}
        <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] inset-x-3 flex flex-col items-center gap-2">
          {error && <p className="rounded-xl bg-rose-600 text-white text-xs font-black px-3 py-2">{error}</p>}
          {shown.stage === "gate" && (
            <button onClick={pay} className="h-16 px-6 rounded-[1.5rem] bg-white text-slate-900 font-black text-lg shadow-2xl active:scale-95">💳 Tap your Nol card · AED {fare}</button>
          )}
          {["riding", "dwell"].includes(shown.stage) && (
            <div className="flex flex-wrap justify-center gap-2">
              {(["front", "window", "outside"] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`h-10 px-3.5 rounded-xl text-xs font-black shadow-lg ${view === v ? "bg-red-600 text-white" : "bg-white/90 text-slate-900"}`}>
                  {v === "front" ? "🚇 Front window" : v === "window" ? "🪟 Side window" : "🎥 Outside"}
                </button>
              ))}
              <button onClick={() => setFast((f) => !f)} className={`h-10 px-3.5 rounded-xl text-xs font-black shadow-lg ${fast ? "bg-amber-400 text-slate-950" : "bg-white/90 text-slate-900"}`}>⏩ {fast ? "Fast ×4" : "Fast-forward"}</button>
            </div>
          )}
          {shown.stage === "done" && (
            <div className="w-full max-w-sm rounded-[1.75rem] bg-white text-slate-900 shadow-2xl p-5 space-y-3 text-center">
              <div className="text-4xl">🚇</div>
              <h2 className="text-lg font-black">You&apos;ve arrived at {dest.en}</h2>
              <p className="text-sm text-slate-500">{stops.length - 1} stops on the {METRO.line} · AED {fare} {gold ? "Gold" : "Silver"} fare</p>
              <button onClick={onArrive} className="w-full h-12 rounded-2xl bg-red-600 text-white font-black">Step out into {dest.en.split("/")[0]}</button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

const districtAt = (stops: MetroStation[], p: number): District => stops[Math.max(0, Math.min(stops.length - 1, Math.round(p / HOP)))]?.landmark ?? "towers";

/** The platform's departure board: the next train, its destination and the minutes to go. */
function PlatformBoard({ towards, seconds }: { towards: string; seconds: number }) {
  return (
    <div className="absolute top-40 inset-x-0 flex justify-center pointer-events-none">
      <div className="rounded-xl bg-black/90 border border-slate-700 px-4 py-2 font-mono text-amber-300 shadow-2xl min-w-64">
        <div className="flex justify-between text-[11px] text-slate-400"><span>PLATFORM 1</span><span>الرصيف ١</span></div>
        <div className="flex justify-between gap-6 text-sm font-bold"><span>{towards}</span><span>{seconds > 3 ? `${seconds}s` : "Arriving"}</span></div>
      </div>
    </div>
  );
}

/** The train on the viaduct: arriving along the track, then fixed while the world moves past it. When
    riding inside, the outer shell is hidden and the cabin is drawn instead. */
function TrainOnTrack({ trainZ, doorOpen, inside, gold }: { trainZ: React.RefObject<number>; doorOpen: React.RefObject<number>; inside: boolean; gold: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.position.z = trainZ.current ?? TRAIN_Z; });
  return (
    <group ref={g} position={[VIADUCT.x, VIADUCT.deck - 0.4, TRAIN_Z]}>
      <group visible={!inside}><MetroTrain doorOpen={doorOpen} /></group>
      {inside && <Cabin gold={gold} />}
    </group>
  );
}

/** Inside the front car: windows all round, the big driverless front window, seats, poles, lights and a few
    fellow passengers. (Car-local: length along z, front at -z.) */
function Cabin({ gold }: { gold: boolean }) {
  const L = 16.5, W = 1.42;
  const trim = gold ? "#b08d57" : "#cbd5e1";
  const seat = gold ? "#3f2d1a" : "#1e3a8a";
  const pillars = Array.from({ length: 8 }, (_, i) => -L / 2 + 1 + i * 2.1);
  return (
    <group>
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W * 2, L]} /><meshStandardMaterial color={gold ? "#5b4636" : "#64748b"} /></mesh>
      <mesh position={[0, 3.3, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W * 2, L]} /><meshStandardMaterial color="#f1f5f9" side={THREE.DoubleSide} /></mesh>
      {/* light strips */}
      {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 3.28, 0]}><boxGeometry args={[0.18, 0.02, L - 1]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} /></mesh>)}
      {/* walls: panels below and above the windows, pillars between them */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * W, 1.02, 0]}><boxGeometry args={[0.06, 0.85, L]} /><meshStandardMaterial color={trim} /></mesh>
          <mesh position={[k * W, 2.95, 0]}><boxGeometry args={[0.06, 0.7, L]} /><meshStandardMaterial color={trim} /></mesh>
          {pillars.map((z) => <mesh key={z} position={[k * W, 2, z]}><boxGeometry args={[0.07, 1.3, 0.3]} /><meshStandardMaterial color={trim} /></mesh>)}
          {/* bench seats along the wall */}
          <mesh position={[k * (W - 0.28), 1.0, 1.5]}><boxGeometry args={[0.48, 0.12, L - 5]} /><meshStandardMaterial color={seat} /></mesh>
          <mesh position={[k * (W - 0.05), 1.35, 1.5]}><boxGeometry args={[0.08, 0.6, L - 5]} /><meshStandardMaterial color={seat} /></mesh>
        </group>
      ))}
      {/* grab poles */}
      {[-4, 0, 4].map((z) => <mesh key={z} position={[0, 1.95, z]}><cylinderGeometry args={[0.025, 0.025, 2.7, 8]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>)}
      {/* the front: a low rail before the big window, its frame */}
      <mesh position={[0, 1.15, -L / 2 + 0.3]}><boxGeometry args={[W * 2, 0.08, 0.08]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} /></mesh>
      <mesh position={[0, 3.05, -L / 2]}><boxGeometry args={[W * 2, 0.5, 0.1]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0.85, -L / 2]}><boxGeometry args={[W * 2, 0.5, 0.1]} /><meshStandardMaterial color="#111827" /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * (W - 0.1), 2, -L / 2]}><boxGeometry args={[0.2, 1.8, 0.1]} /><meshStandardMaterial color="#111827" /></mesh>)}
      {/* a screen with the route over the doors */}
      <mesh position={[W - 0.04, 2.75, -L / 4]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.2, 0.25]} /><meshStandardMaterial color="#0f172a" emissive="#ef4444" emissiveIntensity={0.4} /></mesh>
      <Suspense fallback={null}>
        <group position={[-(W - 0.55), 0.6, 3]} rotation={[0, Math.PI / 2, 0]}><CitizenAvatar look={{ gender: "woman", preset: "Female_Adult_06" }} animation="sit" /></group>
        <group position={[W - 0.55, 0.6, 5]} rotation={[0, -Math.PI / 2, 0]}><CitizenAvatar look={{ gender: "man", preset: "Male_Adult_08" }} animation="sit" /></group>
        <group position={[0.35, 0.6, 0.4]} rotation={[0, Math.PI, 0]}><CitizenAvatar look={{ gender: "man", preset: "Male_Adult_04" }} animation="idle" /></group>
      </Suspense>
    </group>
  );
}

/** The citizen: on the platform before boarding, walking on, and stepping off at the end. */
function Passenger({ look, director }: { look?: AvatarLookProps; director: React.RefObject<{ stage: Stage; t: number }> }) {
  const g = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"idle" | "walk">("idle");
  const [visible, setVisible] = useState(true);
  const deck = VIADUCT.deck + 1.1;
  const onPlatform = new THREE.Vector3(PLAT_X + 1.6, deck, 2);
  // The front car's rear door (the cabin you ride in).
  const atDoor = new THREE.Vector3(VIADUCT.x + 0.3, deck - 0.5, -29.9);
  useFrame(() => {
    const d = director.current, grp = g.current;
    if (!d || !grp) return;
    let walking = false;
    if (d.stage === "gate" || d.stage === "waiting") { grp.position.copy(onPlatform); grp.rotation.y = -Math.PI / 2; }
    else if (d.stage === "boarding") {
      // Walk to the door and on board once it's open.
      const k = Math.max(0, Math.min(1, (d.t - 1.4) / 2.2));
      grp.position.lerpVectors(onPlatform, atDoor, k);
      grp.rotation.y = Math.atan2(atDoor.x - onPlatform.x, atDoor.z - onPlatform.z);
      walking = k > 0 && k < 1;
    } else if (d.stage === "arriving") {
      const k = Math.max(0, Math.min(1, (d.t - 2.6) / 2.2));
      grp.position.lerpVectors(atDoor, onPlatform, k);
      grp.rotation.y = Math.atan2(onPlatform.x - atDoor.x, onPlatform.z - atDoor.z);
      walking = k > 0 && k < 1;
    }
    const show = d.stage !== "riding" && d.stage !== "dwell" && !(d.stage === "boarding" && d.t > 3.7);
    if (show !== visible) setVisible(show);
    if ((walking ? "walk" : "idle") !== anim) setAnim(walking ? "walk" : "idle");
  });
  return <group ref={g} visible={visible}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>;
}

/** Runs the journey: the gate, the wait, boarding, each hop and stop, arrival. Also moves the camera. */
function Director({ stops, gold, towards, travelRef, doorOpenRef, trainZRef, directorRef, hudRef, fast, view, onDone }: {
  stops: MetroStation[]; gold: boolean; towards: { en: string; ar: string }; travelRef: Travel; doorOpenRef: React.RefObject<number>; trainZRef: React.RefObject<number>;
  directorRef: React.RefObject<{ stage: Stage; t: number; k: number; announced: number }>; hudRef: React.RefObject<Hud>; fast: boolean; view: View; onDone: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const look = useRef(new THREE.Vector3());
  const camPos = useRef(new THREE.Vector3(PLAT_X + 5, VIADUCT.deck + 3, 16));
  const doors = useRef<"open" | "closed" | "opening" | "closing">("closed");
  const last = stops.length - 1;
  const rec = (st: MetroStation, kind: "next" | "this") => `/audio/metro/${st.id}-${kind}.mp3`;

  const openDoors = () => { doors.current = "opening"; doorsOpening(); };
  const closeDoors = () => {
    doors.current = "closing"; doorsClosing();
    announce([{ text: phrase("closingEn"), lang: "en" }, { text: phrase("closingAr"), lang: "ar" }]);
  };

  useFrame((_, rawDt) => {
    const d = directorRef.current, h = hudRef.current;
    if (!d || !h) return;
    const dt = Math.min(rawDt, 0.05) * (fast && (d.stage === "riding" || d.stage === "dwell") ? 4 : 1);
    d.t += dt;
    const tr = travelRef.current!;

    // Doors slide over ~1.2 s.
    const dk = doorOpenRef.current ?? 0;
    if (doors.current === "opening") { doorOpenRef.current = Math.min(1, dk + dt / 1.2); if (doorOpenRef.current >= 1) doors.current = "open"; }
    if (doors.current === "closing") { doorOpenRef.current = Math.max(0, dk - dt / 1.2); if (doorOpenRef.current <= 0) doors.current = "closed"; }
    h.doorsOpen = doors.current !== "closed";

    const go = (stage: Stage) => { d.stage = stage; d.t = 0; h.stage = stage; };

    switch (d.stage) {
      case "gate":
        h.message = "";
        break;
      case "waiting": {
        const WAIT = 10;
        h.countdown = Math.max(0, Math.ceil(WAIT - d.t));
        if (d.announced < 0 && d.t > 0.8) {
          d.announced = 0;
          announce([
            { text: phrase("welcomeEn"), lang: "en" },
            { text: phrase("arrivingEn", { towards: towards.en }), lang: "en" },
            { text: phrase("arrivingAr", { towardsAr: towards.ar }), lang: "ar" },
          ]);
        }
        // The train glides in over the last 6 seconds, braking to a stop.
        const k = Math.max(0, Math.min(1, (d.t - (WAIT - 6)) / 6));
        trainZRef.current = TRAIN_Z + 260 * (1 - k) ** 2;
        setLoopSpeed("train", (1 - k) * 0.6);
        if (k > 0 && d.announced === 0) { d.announced = 1; startLoop("train", 0.1); }
        if (d.t >= WAIT) { h.countdown = 0; trainZRef.current = TRAIN_Z; openDoors(); go("boarding"); h.message = gold ? "✨ Gold Class: the front cabin" : "Mind the gap between the train and the platform"; }
        break;
      }
      case "boarding":
        if (d.t > 1.4 && d.t < 1.5 && gold) announce([{ text: phrase("goldEn"), lang: "en" }]);
        if (d.t > 4.4 && doors.current === "open") { closeDoors(); h.message = ""; }
        if (d.t > 7.2 && doors.current === "closed") {
          d.k = 1; d.announced = -1; go("riding");
        }
        break;
      case "riding": {
        const target = d.k * HOP;
        const remaining = target - tr.s;
        const want = Math.min(VMAX, Math.sqrt(Math.max(0, 2 * ACCEL * remaining)));
        tr.speed = want > tr.speed ? Math.min(want, tr.speed + ACCEL * dt) : want;
        tr.s = Math.min(target, tr.s + tr.speed * dt);
        setLoopSpeed("train", tr.speed / VMAX);
        h.speed = (tr.speed / VMAX) * 80;
        const next = stops[d.k];
        h.next = next.en; h.nextAr = next.ar; h.stopIndex = Math.floor(tr.s / HOP + 0.0001);
        // "The next station is…", soon after leaving (only the last stop when fast-forwarding).
        if (d.announced !== d.k && d.t > 1.5 && (!fast || d.k === last)) {
          d.announced = d.k;
          announce([{ text: phrase("nextEn", { en: next.en }), lang: "en" }, { text: phrase("nextAr", { ar: next.ar }), lang: "ar" }], rec(next, "next"));
        }
        if (remaining < 0.02) {
          tr.speed = 0; tr.s = target; h.speed = 0; h.stopIndex = d.k;
          const lines = [{ text: phrase("thisEn", { en: next.en }), lang: "en" as const }, { text: phrase("thisAr", { ar: next.ar }), lang: "ar" as const }];
          if (d.k === last) {
            announce([...lines, { text: phrase("doorsEn"), lang: "en" }], rec(next, "this"));
            openDoors(); go("arriving"); h.message = `📍 ${next.en}`;
          } else {
            if (!fast) announce(lines, rec(next, "this"));
            openDoors(); go("dwell"); h.message = `📍 ${next.en}`;
          }
        }
        break;
      }
      case "dwell":
        if (d.t > 3.2 && doors.current === "open") { closeDoors(); h.message = ""; }
        if (d.t > 5.6 && doors.current === "closed") { d.k++; go("riding"); }
        break;
      case "arriving":
        setLoopSpeed("train", 0);
        if (d.t > 5.4) { stopLoops(); go("done"); onDone(); }
        break;
    }

    // The camera.
    const deck = VIADUCT.deck;
    const front = TRAIN_Z - 8.25;
    let pos: THREE.Vector3, at: THREE.Vector3;
    const riding = d.stage === "riding" || d.stage === "dwell";
    if (riding && view === "front") { pos = new THREE.Vector3(VIADUCT.x, deck + 1.85, front + 1.6); at = new THREE.Vector3(VIADUCT.x, deck + 0.9, front - 60); }
    // Standing by the window, looking out over Sheikh Zayed Road.
    else if (riding && view === "window") { pos = new THREE.Vector3(VIADUCT.x + 0.6, deck + 2.05, front + 6); at = new THREE.Vector3(VIADUCT.x + 30, deck - 3, front - 6); }
    // Outside: a drone shot from beside and behind the train, which fills the middle of the screen.
    else if (riding) { pos = new THREE.Vector3(VIADUCT.x + 10, deck + 6, 40); at = new THREE.Vector3(VIADUCT.x, deck + 1.5, 0); }
    // Boarding: along the platform, watching you step through the open doors.
    else if (d.stage === "boarding") { pos = new THREE.Vector3(PLAT_X + 3.2, deck + 2.6, -14); at = new THREE.Vector3(VIADUCT.x + 1, deck + 1.3, -29); }
    else { pos = new THREE.Vector3(PLAT_X + 5.5, deck + 2.9, 15); at = new THREE.Vector3(VIADUCT.x - 1, deck + 1.6, -10); }
    // Snap into the cabin views; glide everywhere else.
    const snap = riding && view !== "outside";
    camPos.current.lerp(pos, snap ? 1 : 1 - Math.exp(-dt * 3));
    look.current.lerp(at, snap ? 1 : 1 - Math.exp(-dt * 3));
    camera.position.copy(camPos.current);
    camera.lookAt(look.current);
  });
  return null;
}
