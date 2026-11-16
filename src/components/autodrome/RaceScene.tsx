"use client";

// The race at Dubai Autodrome, live: everyone on the grid in their own car, the countdown to the same moment for all
// (the server's start time), then laps of the circuit. You drive yours (a steering wheel and gas and brake pedals on a
// phone, arrows or WASD on a keyboard); the others are where their last update put them, carrying on at their speed between
// updates (three a second each, on the Realtime channel race:<code>). Engines are synthesized (lib/raceAudio):
// yours in full, theirs louder as they get close. Crossing the line after the last lap records your time.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { carOf, type Car } from "@/lib/cars";
import { CarModel } from "@/components/cars/CarModel";
import { SteeringWheel } from "@/components/cars/SteeringWheel";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { canvasQuality } from "@/lib/device";
import { TRACK, TRACK_HALF_WIDTH, gearbox, lapTime, perfOf, step, trackPose, type DriveInput, type DriveState, type Racer } from "@/lib/autodrome";
import { RemoteEngine, V10, setRaceVolume } from "@/lib/raceAudio";

interface Remote { dist: number; offset: number; speed: number; at: number; done?: boolean }
/** How often each car sends its position: three times a second with a few cars, down to once a second with ten or
    more, so a full grid stays within the Realtime message budget (10 cars × 1 a second × 9 listeners, plus anyone watching). Between
    updates the others carry on along the track at their speed, so they still move smoothly. */
const sendEvery = (cars: number) => Math.max(333, Math.min(1000, cars * 100));

/** Where each car starts: two by two behind the line. */
const gridSpot = (i: number) => ({ dist: -12 - 10 * Math.floor(i / 2), offset: i % 2 === 0 ? -3.5 : 3.5 });

// ---------------------------------------------------------------- the circuit

function Circuit() {
  const { road, kerbs, line } = useMemo(() => {
    const S = TRACK.samples, N = S.length;
    // Layers well apart (sand, grass, road, kerbs, line), so no phone's depth buffer mixes them up.
    const ribbon = (inner: number, outer: number, colorAt?: (i: number) => THREE.Color, y = 0.12) => {
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      for (let i = 0; i <= N; i++) {
        const s = S[i % N];
        const a = s.p.clone().addScaledVector(s.n, inner), b = s.p.clone().addScaledVector(s.n, outer);
        pos.push(a.x, y, a.z, b.x, y, b.z);
        const c = colorAt ? colorAt(i) : new THREE.Color("#ffffff");
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const red = new THREE.Color("#dc2626"), white = new THREE.Color("#f8fafc");
    const kerbColor = (i: number) => (Math.floor(i / 3) % 2 ? red : white);
    return {
      road: ribbon(-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH),
      kerbs: [ribbon(TRACK_HALF_WIDTH, TRACK_HALF_WIDTH + 1.4, kerbColor, 0.16), ribbon(-TRACK_HALF_WIDTH - 1.4, -TRACK_HALF_WIDTH, kerbColor, 0.16)],
      line: trackPose(0, 0),
    };
  }, []);
  // The start/finish line: a chequered strip across the track.
  const checker = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 16;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 8, y * 8, 8, 8); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[250, -0.2, 330]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#d6b98c" roughness={1} />
      </mesh>
      {/* Grass inside the circuit. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[230, -0.05, 330]}>
        <circleGeometry args={[330, 48]} />
        <meshStandardMaterial color="#5f8f3a" roughness={1} />
      </mesh>
      <mesh geometry={road} receiveShadow><meshStandardMaterial color="#2b2d31" roughness={0.85} /></mesh>
      {kerbs.map((k, i) => <mesh key={i} geometry={k}><meshStandardMaterial vertexColors roughness={0.7} /></mesh>)}
      <mesh position={[line.p.x, 0.2, line.p.z]} rotation={[-Math.PI / 2, 0, -line.yaw + Math.PI / 2]}>
        <planeGeometry args={[TRACK_HALF_WIDTH * 2, 3]} />
        <meshStandardMaterial map={checker} />
      </mesh>
      {/* The gantry over the line. */}
      <group position={[line.p.x, 0, line.p.z]} rotation={[0, line.yaw, 0]}>
        <mesh position={[-TRACK_HALF_WIDTH - 1.5, 4, 0]}><boxGeometry args={[0.6, 8, 0.6]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[TRACK_HALF_WIDTH + 1.5, 4, 0]}><boxGeometry args={[0.6, 8, 0.6]} /><meshStandardMaterial color="#111827" /></mesh>
        <mesh position={[0, 8, 0]}><boxGeometry args={[TRACK_HALF_WIDTH * 2 + 4, 1.6, 0.8]} /><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></mesh>
      </group>
      <Stands />
      <Skyline />
    </group>
  );
}

/** Grandstands and the pit building along the main straight. */
function Stands() {
  const crowd = useMemo(() => ["#f43f5e", "#22d3ee", "#facc15", "#a3e635", "#f8fafc", "#fb923c"], []);
  // The sign on the pit building, painted once.
  const sign = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#dc2626"; g.fillRect(0, 0, 512, 64);
    g.fillStyle = "#ffffff"; g.font = "900 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("DUBAI AUTODROME", 256, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group>
      {[40, 130, 220, 310].map((x, i) => (
        <group key={x} position={[x, 0, -34]}>
          <mesh position={[0, 4, 0]}><boxGeometry args={[80, 8, 14]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
          <mesh position={[0, 8.6, 3]} rotation={[-0.5, 0, 0]}><boxGeometry args={[78, 0.6, 10]} /><meshStandardMaterial color={crowd[i % crowd.length]} /></mesh>
          <mesh position={[0, 12, -4]}><boxGeometry args={[82, 0.4, 16]} /><meshStandardMaterial color="#0f172a" /></mesh>
        </group>
      ))}
      <mesh position={[180, 5, 30]}><boxGeometry args={[300, 10, 18]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      <mesh position={[180, 10.4, 30]}><boxGeometry args={[300, 0.8, 22]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh position={[180, 14, 21]}><planeGeometry args={[60, 7]} /><meshBasicMaterial map={sign} /></mesh>
    </group>
  );
}

/** Motor City and the towers in the distance (the same every time). */
const TOWERS = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 70 }, () => {
    const a = rnd() * Math.PI * 2, r = 900 + rnd() * 400;
    return { x: 250 + Math.cos(a) * r, z: 330 + Math.sin(a) * r, w: 20 + rnd() * 40, h: 40 + rnd() * 220, c: ["#94a3b8", "#cbd5e1", "#64748b", "#e2e8f0"][Math.floor(rnd() * 4)] };
  });
})();
function Skyline() {
  return <group>{TOWERS.map((t, i) => <mesh key={i} position={[t.x, t.h / 2, t.z]}><boxGeometry args={[t.w, t.h, t.w]} /><meshStandardMaterial color={t.c} /></mesh>)}</group>;
}

// ---------------------------------------------------------------- the cars and the camera

function Cars({ racers, me, mine, remotes, startsAtRef, laps, spectator }: {
  racers: Racer[]; me: string; mine: React.RefObject<DriveState & { rpm: number; gear: number }>;
  remotes: React.RefObject<Map<string, Remote>>; startsAtRef: React.RefObject<number>; laps: number;
  /** Watching, not driving: the camera follows whoever is in front (mine holds the leader's place). */
  spectator?: boolean;
}) {
  const groups = useRef(new Map<string, THREE.Group>());
  const camera = useThree((s) => s.camera);
  const camPos = useRef(new THREE.Vector3(-30, 6, 0));
  const engines = useRef(new Map<string, RemoteEngine>());
  const perfs = useMemo(() => new Map(racers.map((r) => [r.id, perfOf(r.car)])), [racers]);

  useEffect(() => {
    const e = engines.current;
    return () => { e.forEach((x) => x.stop()); e.clear(); };
  }, []);

  useFrame((_, dt) => {
    const now = Date.now();
    const meState = mine.current;
    let mePos: THREE.Vector3 | null = null;
    for (const r of racers) {
      const g = groups.current.get(r.id);
      if (!g) continue;
      let dist: number, offset: number, speed: number;
      if (r.id === me) { dist = meState.dist; offset = meState.offset; speed = meState.speed; }
      else {
        const R = remotes.current.get(r.id);
        const i = racers.indexOf(r);
        if (!R) { const gs = gridSpot(i); dist = gs.dist; offset = gs.offset; speed = 0; }
        else {
          // Carry on at their speed since their last update (up to a second and a half), then ease towards it.
          const ahead = R.done ? 0 : Math.min(1.5, (now - R.at) / 1000) * R.speed;
          dist = R.dist + ahead; offset = R.offset; speed = R.speed;
          const shown = (g.userData.dist as number | undefined) ?? dist;
          dist = shown + (dist - shown) * Math.min(1, dt * 6);
        }
        g.userData.dist = dist;
        // Their engine, by distance from me.
        if (now >= startsAtRef.current - 3000) {
          let eng = engines.current.get(r.id);
          if (!eng) { try { eng = new RemoteEngine(); engines.current.set(r.id, eng); } catch { /* no audio */ } }
          const p = trackPose(dist, offset).p;
          const mp = trackPose(meState.dist, meState.offset).p;
          eng?.update(gearbox(speed, perfs.get(r.id)?.top ?? 60).rpm, p.distanceTo(mp));
        }
      }
      const pose = trackPose(dist, offset);
      g.position.set(pose.p.x, 0.12, pose.p.z);
      g.rotation.y = pose.yaw;
      if (r.id === me) mePos = pose.p;
    }
    // The chase camera: behind and above your car (or the leader, when watching), looking up the track.
    if (mePos || spectator) {
      const ahead = trackPose(meState.dist + 14, meState.offset * 0.6).p;
      const behind = trackPose(meState.dist - 11, meState.offset).p;
      camPos.current.lerp(new THREE.Vector3(behind.x, 4.2 + Math.min(meState.speed, 80) * 0.01, behind.z), Math.min(1, dt * 5));
      camera.position.copy(camPos.current);
      camera.lookAt(ahead.x, 1.2, ahead.z);
    }
    void laps;
  });

  return (
    <>
      {racers.map((r) => {
        const car = carOf(r.car) as (Car & { model3d?: string }) | undefined;
        if (!car) return null;
        return (
          <group key={r.id} ref={(g) => { if (g) groups.current.set(r.id, g); else groups.current.delete(r.id); }}>
            {/* Each car loads on its own, so its name label isn't torn down while the model arrives. */}
            <Suspense fallback={null}><CarModel car={car} plate={r.plate ?? "DXB"} /></Suspense>
            {r.id !== me && <NameTag name={r.username} />}
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- the race

export function RaceScene({ code, me, racers, laps, startsAt, onFinish, onLeave }: {
  /** me not among the racers: watching (follow the leader, no controls, nothing sent). */
  code: string; me: string; racers: Racer[]; laps: number;
  /** When the race starts, on this device's clock (already corrected for the server's). */
  startsAt: number;
  onFinish: (ms: number) => void; onLeave: () => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const spectator = !racers.some((r) => r.id === me);
  const myIndex = Math.max(0, racers.findIndex((r) => r.id === me));
  const myCar = racers[myIndex]?.car ?? "nissan-sunny";
  const perf = useMemo(() => perfOf(myCar), [myCar]);
  const mine = useRef<DriveState & { rpm: number; gear: number }>({ ...gridSpot(myIndex), speed: 0, drift: 0, wall: 0, rpm: 1000, gear: 1 });
  const input = useRef<DriveInput>({ throttle: 0, brake: 0, steer: 0 });
  const remotes = useRef(new Map<string, Remote>());
  const startsAtRef = useRef(startsAt);
  const finished = useRef<number | null>(null);
  const L = TRACK.length;
  const [hud, setHud] = useState({ speed: 0, gear: 1, lap: 1, pos: 1, time: 0, count: 6, done: null as number | null, left: 6, dots: [] as { id: string; x: number; y: number; me: boolean }[], order: [] as string[] });
  const [sound, setSound] = useState(true);

  useEffect(() => { startsAtRef.current = startsAt; }, [startsAt]);

  // Positions over Realtime: mine out three times a second, theirs in.
  useEffect(() => {
    const ch: RealtimeChannel = supabase().channel(`race:${code}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as { u: string; d: number; o: number; v: number; f?: boolean };
      if (!p?.u || p.u === me) return;
      remotes.current.set(p.u, { dist: p.d, offset: p.o, speed: p.v, at: Date.now(), done: !!p.f });
    }).subscribe();
    // Watching: listen only.
    const send = spectator ? null : setInterval(() => {
      const s = mine.current;
      void ch.send({ type: "broadcast", event: "pos", payload: { u: me, d: Math.round(s.dist * 10) / 10, o: Math.round(s.offset * 10) / 10, v: Math.round(s.speed * 10) / 10, f: finished.current !== null } });
    }, sendEvery(racers.length));
    return () => { if (send) clearInterval(send); void supabase().removeChannel(ch); };
  }, [code, me, racers.length, spectator]);

  // Your engine.
  const engine = useRef<V10 | null>(null);
  useEffect(() => {
    if (spectator) return;
    try { engine.current = new V10(); } catch { engine.current = null; }
    return () => { engine.current?.stop(); engine.current = null; };
  }, [spectator]);

  // Driving: a fixed-rate loop, so every phone drives the same.
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const now = Date.now();
      const s = mine.current;
      // Watching: "mine" is the leader's place on the track, so the camera and the sound follow the race.
      if (spectator) {
        let best: Remote | null = null;
        remotes.current.forEach((R) => { if (!best || R.dist > best.dist) best = R; });
        const lead = best as Remote | null;
        if (lead) {
          const ahead = lead.done ? 0 : Math.min(1.5, (now - lead.at) / 1000) * lead.speed;
          s.dist += (lead.dist + ahead - s.dist) * Math.min(1, dt * 6);
          s.offset += (lead.offset - s.offset) * Math.min(1, dt * 4);
          s.speed = lead.speed;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const go = now >= startsAtRef.current && finished.current === null;
      const inp = go ? input.current : { throttle: 0, brake: 1, steer: 0 };
      // Before the lights: revving on the line.
      if (!go && finished.current === null) {
        const rev = input.current.throttle > 0 ? 6500 : 1100;
        s.rpm += (rev - s.rpm) * Math.min(1, dt * 6);
        engine.current?.update(s.rpm, input.current.throttle, 1, 0);
      } else {
        const next = step(s, inp, perf, dt);
        const gb = gearbox(next.speed, perf.top);
        if (next.wall && !s.wall) engine.current?.thud();
        Object.assign(s, next, { rpm: gb.rpm, gear: gb.gear });
        engine.current?.update(gb.rpm, finished.current !== null ? 0 : inp.throttle, gb.gear, next.drift);
        if (finished.current === null && s.dist >= laps * L) {
          finished.current = now - startsAtRef.current;
          onFinish(finished.current);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [perf, laps, L, onFinish, spectator]);

  const minimap = useMemo(() => {
    const xs = TRACK.samples.map((s) => s.p.x), zs = TRACK.samples.map((s) => s.p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const k = 100 / Math.max(maxX - minX, maxZ - minZ);
    const pt = (x: number, z: number) => [(x - minX) * k + 4, (z - minZ) * k + 4] as const;
    return { d: TRACK.samples.map((s, i) => `${i ? "L" : "M"}${pt(s.p.x, s.p.z).join(",")}`).join(" ") + "Z", pt };
  }, []);

  // The HUD, ten times a second.
  useEffect(() => {
    const t = setInterval(() => {
      const s = mine.current;
      const all = racers.map((r) => (r.id === me ? s.dist : (remotes.current.get(r.id)?.dist ?? gridSpot(racers.indexOf(r)).dist)));
      const pos = 1 + all.filter((d, i) => racers[i].id !== me && d > s.dist).length;
      const now = Date.now();
      const dots = racers.map((r, i) => {
        const [x, y] = minimap.pt(trackPose(all[i], 0).p.x, trackPose(all[i], 0).p.z);
        return { id: r.id, x, y, me: r.id === me };
      });
      setHud({
        speed: Math.round(s.speed * 3.6), gear: s.gear, lap: Math.max(1, Math.min(laps, Math.floor(Math.max(0, s.dist) / L) + 1)),
        pos, time: Math.max(0, (finished.current ?? now - startsAtRef.current)), count: racers.length, done: finished.current,
        left: Math.ceil((startsAtRef.current - now) / 1000), dots,
        order: racers.map((r, i) => ({ u: r.username, d: all[i] })).sort((a, b) => b.d - a.d).map((x) => x.u),
      });
    }, 100);
    return () => clearInterval(t);
  }, [racers, me, laps, L, minimap]);
  const countdown = hud.left;

  // Keyboard: arrows or WASD, space to brake.
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      input.current.throttle = keys.has("ArrowUp") || keys.has("w") || keys.has("W") ? 1 : 0;
      input.current.brake = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || keys.has(" ") ? 1 : 0;
      input.current.steer = (keys.has("ArrowRight") || keys.has("d") || keys.has("D") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => { keys.add(e.key); apply(); if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.key); apply(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const setInput = useCallback((k: keyof DriveInput, v: number) => { input.current[k] = v; }, []);
  const onSteer = useCallback((v: number) => { input.current.steer = v; }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900 select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ fov: 62, near: 0.5, far: 2600, position: [-30, 6, 0] }} gl={{ powerPreference: quality.powerPreference }}>
        <PerfProbe scene="Autodrome" />
        <color attach="background" args={["#9fd3f5"]} />
        <fog attach="fog" args={["#cfe8f7", 400, 1600]} />
        <hemisphereLight args={["#ffffff", "#c2a37a", 0.8]} />
        <directionalLight position={[300, 400, -200]} intensity={1.5} />
        <Suspense fallback={null}>
          <Circuit />
          <Cars racers={racers} me={me} mine={mine} remotes={remotes} startsAtRef={startsAtRef} laps={laps} spectator={spectator} />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-start justify-between pointer-events-none">
        <div className="rounded-2xl bg-slate-950/75 text-white px-3 py-2 space-y-0.5">
          {spectator
            ? <p className="text-sm font-black leading-none">👀 Watching</p>
            : <p className="text-2xl font-black leading-none">P{hud.pos}<span className="text-sm text-white/60">/{hud.count}</span></p>}
          <p className="text-xs font-bold text-white/80">Lap {hud.lap}/{laps}</p>
          <p className="text-xs font-mono text-white/80">{lapTime(hud.time)}</p>
        </div>
        <svg viewBox="0 0 108 108" className="w-24 h-24 rounded-2xl bg-slate-950/60">
          <path d={minimap.d} fill="none" stroke="#e2e8f0" strokeWidth="3" />
          {hud.dots.map((d) => <circle key={d.id} cx={d.x} cy={d.y} r={d.me ? 5 : 4} fill={d.me ? "#ef4444" : "#facc15"} stroke="#0f172a" strokeWidth="1" />)}
        </svg>
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <button onClick={onLeave} className="h-9 px-3 rounded-full bg-slate-950/75 text-white text-xs font-black">Leave</button>
          <button onClick={() => { setSound(!sound); setRaceVolume(!sound); }} className="h-9 px-3 rounded-full bg-slate-950/75 text-white text-xs font-black">{sound ? "🔊" : "🔇"}</button>
        </div>
      </div>

      {countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-8xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">{countdown > 5 ? "🏁" : countdown}</p>
            <p className="mt-2 text-white font-black drop-shadow">{spectator ? "The race is about to start" : "Hold the gas to rev it"}</p>
          </div>
        </div>
      )}
      {countdown <= 0 && countdown > -1 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-7xl font-black text-emerald-400 drop-shadow-lg">GO!</p></div>}
      {hud.done !== null && (
        <div className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none">
          <div className="rounded-3xl bg-slate-950/85 text-white px-6 py-4 text-center">
            <p className="text-sm font-black text-amber-300">FINISHED</p>
            <p className="text-4xl font-black">P{hud.pos}</p>
            <p className="font-mono">{lapTime(hud.done)}</p>
            <p className="text-xs text-white/60 mt-1">Waiting for the others…</p>
          </div>
        </div>
      )}

      {/* Watching: the standings, leader first. */}
      {spectator && (
        <div className="absolute left-3 bottom-[max(1rem,env(safe-area-inset-bottom))] rounded-2xl bg-slate-950/80 text-white px-3 py-2 space-y-0.5 pointer-events-none">
          {hud.order.map((u, i) => <p key={u} className={`text-xs font-black ${i === 0 ? "text-amber-300" : "text-white/85"}`}>{i + 1}. @{u}</p>)}
        </div>
      )}

      {/* The speedo, and the controls on a phone. */}
      {!spectator && <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 flex items-end justify-between">
        {/* A real wheel: turn it with your thumb; how far you turn it is how hard you steer, and it centres itself. */}
        <SteeringWheel size={132} className="bg-white/25 backdrop-blur-sm ring-1 ring-white/40" onSteer={onSteer} />
        <div className="pointer-events-none rounded-2xl bg-slate-950/75 text-white px-4 py-2 text-center mb-1">
          <p className="text-3xl font-black tabular-nums leading-none">{hud.speed}</p>
          <p className="text-[10px] font-bold text-white/60">KM/H · GEAR {hud.gear}</p>
        </div>
        <div className="flex gap-2 items-end">
          <Hold k="brake" v={1} set={setInput} label="Brake" className="w-16 h-20 rounded-2xl bg-rose-500/90 text-white font-black text-sm active:bg-rose-500">BRAKE</Hold>
          <Hold k="throttle" v={1} set={setInput} label="Gas" className="w-20 h-24 rounded-2xl bg-emerald-500/90 text-white font-black active:bg-emerald-500">GAS</Hold>
        </div>
      </div>}
    </div>
  );
}

/** A control you hold: down sets it, up (or sliding off) lets go. */
function Hold({ k, v, set, label, className, children }: { k: keyof DriveInput; v: number; set: (k: keyof DriveInput, v: number) => void; label: string; className: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} className={className}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(k, v); }}
      onPointerUp={() => set(k, 0)} onPointerCancel={() => set(k, 0)} onPointerLeave={() => set(k, 0)}
      onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  );
}

/** "@name" floating over a car: painted once into a sprite (cheaper than a page element per car). */
function NameTag({ name }: { name: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(2,6,23,0.8)";
    g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill();
    g.fillStyle = "#ffffff"; g.font = "900 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(`@${name}`.slice(0, 16), 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [name]);
  return <sprite position={[0, 2.7, 0]} scale={[3.2, 0.8, 1]}><spriteMaterial map={tex} depthWrite={false} transparent /></sprite>;
}
