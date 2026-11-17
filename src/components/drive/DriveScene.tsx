"use client";

// Driving a real road (lib/city/drives): your own car on Sheikh Zayed Road or the Palm, from the exit you joined at
// to the one you're leaving by. The towers either side, the flyovers and the tunnel are OpenStreetMap's, loaded a
// piece at a time as you go. Traffic keeps to its lanes (and comes the other way across the barrier), green gantries
// count down the exits, and yours turns amber. A steering wheel and pedals (or the keys), the V10, and Cruise to hold
// 100 km/h in your lane. Skip whenever you like.
//
// Traffic (lib/city/traffic) is the city's own cars, keeping their distance and changing lanes only into a gap.
//
// Like every scene here, it moves three.js objects (and the camera) frame by frame, outside React's render.
/* eslint-disable react-hooks/immutability */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { carOf, type Car } from "@/lib/cars";
import { CarModel, carLength } from "@/components/cars/CarModel";
import { TrafficCar } from "@/components/cars/TrafficCar";
import { SteeringWheel } from "@/components/cars/SteeringWheel";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { canvasQuality } from "@/lib/device";
import { gearbox, perfOf, type DriveInput } from "@/lib/autodrome";
import { V10, setRaceVolume } from "@/lib/raceAudio";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { City, Palms } from "@/components/street/OsmWorld";
import { laneCentres, LANE_W, loadPiece, roadStep, type Corridor, type Leg, type RoadPath, type RoadState } from "@/lib/city/drives";
import { freeSpot, spawnTraffic, stepTraffic, trafficLooks, type Vehicle } from "@/lib/city/traffic";
import { OSM_ATTRIBUTION, OSM_COPYRIGHT_URL, type OsmArea } from "@/lib/city/osmDistrict";

const CRUISE = 100 / 3.6;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };


// ---------------------------------------------------------------- the road surface, lines, barriers, tunnel

/** Built once per leg along your side of the road (and the other side next to it): the full-width carriageway,
    its lane lines and edge lines, the barriers, and a tunnel's walls and roof. */
function useRoadGeometry(own: RoadPath, other: RoadPath, from: number, to: number) {
  return useMemo(() => {
    const asphalt: number[] = [], lines: number[] = [], yellow: number[] = [], barrier: number[] = [], tunnel: number[] = [];
    const v = new THREE.Vector3(), w = new THREE.Vector3();
    const strip = (out: number[], road: RoadPath, s0: number, s1: number, off0: number, off1: number, lift: number) => {
      const a0 = road.pose(s0, off0, v).p.clone(), a1 = road.pose(s0, off1, v).p.clone();
      const b0 = road.pose(s1, off0, w).p.clone(), b1 = road.pose(s1, off1, w).p.clone();
      // Wound to face up (left edge to right edge, going forward).
      out.push(a0.x, a0.y + lift, a0.z, b1.x, b1.y + lift, b1.z, b0.x, b0.y + lift, b0.z, a0.x, a0.y + lift, a0.z, a1.x, a1.y + lift, a1.z, b1.x, b1.y + lift, b1.z);
    };
    const wall = (out: number[], road: RoadPath, s0: number, s1: number, off: number, h0: number, h1: number) => {
      const a = road.pose(s0, off, v).p.clone(), b = road.pose(s1, off, w).p.clone();
      out.push(a.x, a.y + h0, a.z, b.x, b.y + h0, b.z, b.x, b.y + h1, b.z, a.x, a.y + h0, a.z, b.x, b.y + h1, b.z, a.x, a.y + h1, a.z);
    };
    const lo = Math.max(0, from - 300), hi = Math.min(own.length, to + 400), STEP = 4;
    for (let s = lo; s < hi; s += STEP) {
      const e = Math.min(hi, s + STEP), hw = own.halfWidth(s), lanes = own.lanesAt(s);
      strip(asphalt, own, s, e, -hw - 1.4, hw + 1.4, 0.11);
      // Lane lines: dashed (3 m in every 12).
      if (s % 12 < STEP) for (let i = 1; i < lanes; i++) { const o = -hw + LANE_W * i; strip(lines, own, s, Math.min(e, s + 3), o - 0.08, o + 0.08, 0.14); }
      strip(yellow, own, s, e, -hw - 0.25, -hw - 0.1, 0.14);
      strip(lines, own, s, e, hw + 0.1, hw + 0.25, 0.14);
      // Barriers: the median on the left, a kerb wall on the right.
      wall(barrier, own, s, e, -hw - 1.4, 0, 1.0);
      wall(barrier, own, s, e, hw + 1.4, 0, 0.9);
      // Below ground (an underpass or the way into a tunnel): retaining walls up to street level.
      const dip = Math.min(own.pose(s).p.y, own.pose(e).p.y);
      if (dip < -0.4) {
        for (const side of [-1, 1]) {
          const a = own.pose(s, side * (hw + 1.5), v).p.clone(), b = own.pose(e, side * (hw + 1.5), w).p.clone();
          barrier.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, 0.3, b.z, a.x, a.y, a.z, b.x, 0.3, b.z, a.x, 0.3, a.z);
        }
      }
      if (own.pose(s).tunnel) {
        wall(tunnel, own, s, e, -hw - 1.5, 0, 6.5);
        wall(tunnel, own, s, e, hw + 1.5, 0, 6.5);
        strip(tunnel, own, s, e, -hw - 1.5, hw + 1.5, 6.5);
      }
    }
    // The other carriageway, across the median.
    const oFrom = other.nearestAll(own.pose(lo).p.x, own.pose(lo).p.z), oTo = other.nearestAll(own.pose(hi).p.x, own.pose(hi).p.z);
    for (let s = Math.min(oFrom, oTo); s < Math.max(oFrom, oTo); s += STEP) {
      const e = s + STEP, hw = other.halfWidth(s);
      strip(asphalt, other, s, e, -hw - 1.4, hw + 1.4, 0.1);
      if (s % 12 < STEP) for (let i = 1; i < other.lanesAt(s); i++) { const o = -hw + LANE_W * i; strip(lines, other, s, Math.min(e, s + 3), o - 0.08, o + 0.08, 0.13); }
    }
    const geo = (arr: number[], up: boolean) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      if (up) { const nrm = new Float32Array(arr.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); }
      else g.computeVertexNormals();
      return g;
    };
    return { asphalt: geo(asphalt, true), lines: geo(lines, true), yellow: geo(yellow, true), barrier: geo(barrier, false), tunnel: geo(tunnel, false) };
  }, [own, other, from, to]);
}

function RoadSurface({ own, other, from, to, night }: { own: RoadPath; other: RoadPath; from: number; to: number; night: boolean }) {
  const g = useRoadGeometry(own, other, from, to);
  useEffect(() => () => { Object.values(g).forEach((x) => x.dispose()); }, [g]);
  const flat = (color: string, off: number, emissive = "#000") => <meshStandardMaterial color={color} emissive={emissive} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={off} polygonOffsetUnits={off} />;
  return (
    <group>
      <mesh geometry={g.asphalt} raycast={() => null}>{flat(night ? "#34373d" : "#43474f", -8)}</mesh>
      <mesh geometry={g.lines} raycast={() => null}>{flat("#f8fafc", -9, night ? "#666" : "#000")}</mesh>
      <mesh geometry={g.yellow} raycast={() => null}>{flat("#facc15", -9, night ? "#5a4a00" : "#000")}</mesh>
      <mesh geometry={g.barrier} raycast={() => null}><meshStandardMaterial color={night ? "#8b8b88" : "#d4d0c8"} roughness={0.95} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.tunnel} raycast={() => null}><meshStandardMaterial color="#b8b4aa" emissive="#3a3020" roughness={0.8} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- gantries

function signTex(lines: string[], bg: string) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 64px system-ui, sans-serif"; g.fillText(lines[0], 512, 90, 960);
  g.font = "700 46px system-ui, sans-serif"; g.fillText(lines[1] ?? "", 512, 180, 960);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function Gantry({ road, s, title, sub, mine }: { road: RoadPath; s: number; title: string; sub: string; mine: boolean }) {
  const pose = useMemo(() => road.pose(s), [road, s]);
  const hw = road.halfWidth(s);
  const tex = useMemo(() => signTex([title, sub], mine ? "#d97706" : "#047857"), [title, sub, mine]);
  useEffect(() => () => tex.dispose(), [tex]);
  // Facing the traffic coming towards it.
  return (
    <group position={[pose.p.x, pose.p.y, pose.p.z]} rotation={[0, pose.yaw, 0]}>
      {[-hw - 1.8, hw + 1.8].map((x) => <mesh key={x} position={[x, 4, 0]}><boxGeometry args={[0.5, 8, 0.5]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} /></mesh>)}
      <mesh position={[0, 7.6, 0]}><boxGeometry args={[hw * 2 + 4, 0.4, 0.4]} /><meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[hw * 0.35, 6.6, -0.3]} rotation={[0, Math.PI, 0]}><planeGeometry args={[11, 2.75]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- cars

// ---------------------------------------------------------------- the driver (physics, camera, traffic)

const OWN_CARS = 16, ONCOMING = 10;

function Driver({ own, other, start, end, carId, plate, input, cruise, st, hud, engine, onArrive }: {
  own: RoadPath; other: RoadPath; start: number; end: number; carId: string; plate: string;
  input: React.RefObject<DriveInput & { touched: number }>; cruise: React.RefObject<boolean>; st: React.RefObject<RoadState & { gear: number; rpm: number; fs: number }>;
  hud: React.RefObject<{ tunnel: boolean }>; engine: React.RefObject<V10 | null>; onArrive: () => void;
}) {
  const car = useMemo(() => carOf(carId) as (Car & { model3d?: string }) | undefined, [carId]);
  const perf = useMemo(() => perfOf(carId), [carId]);
  const myLen = car ? carLength(car) : 4.7;
  const camera = useThree((s) => s.camera);
  const me = useRef<THREE.Group>(null);
  // Your side's traffic, spread out lane by lane around you (moved frame by frame; the list itself never changes).
  const bots = useMemo(() => spawnTraffic(own, start - 150, start + 900, 5, 1).filter((v) => Math.abs(v.s - start) > 22).slice(0, OWN_CARS), [start, own]);
  const looks = useMemo(() => trafficLooks(OWN_CARS, 7), []);
  const onLooks = useMemo(() => trafficLooks(ONCOMING, 91), []);
  const oncoming = useRef<Vehicle[]>([]);
  const otherS = useRef(-1);
  const botRefs = useRef<Array<THREE.Group | null>>([]), onRefs = useRef<Array<THREE.Group | null>>([]);
  const arrived = useRef(false);
  const meV = useRef<Vehicle>({ s: start, offset: 0, target: 0, speed: 0, want: 30, len: myLen, think: 0 });
  const camPos = useRef(new THREE.Vector3()), camLook = useRef(new THREE.Vector3());
  const tmp = useMemo(() => new THREE.Vector3(), []), tmp2 = useMemo(() => new THREE.Vector3(), []);
  const ground = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(0.05, raw), now = clock.elapsedTime;
    const S = st.current, inp = input.current;
    // Cruise: hold 100 in your lane (easing off for the car in front) unless you're on the pedals or the wheel.
    const live = { throttle: inp.throttle, brake: inp.brake, steer: inp.steer };
    if (cruise.current && !inp.throttle && !inp.brake) {
      const lead = bots.reduce<Vehicle | null>((b, v) => (v.s > S.s && Math.abs(v.offset - S.offset) < 1.9 && (!b || v.s < b.s) ? v : b), null);
      const gap = lead ? lead.s - lead.len / 2 - (S.s + myLen / 2) : Infinity;
      const want = gap < 12 + S.speed * 1.3 ? Math.min(CRUISE, (lead?.speed ?? CRUISE) - (gap < 8 + S.speed * 0.8 ? 2 : 0)) : CRUISE;
      live.throttle = S.speed < want - 0.5 ? 0.7 : 0; live.brake = S.speed > want + 1.5 ? Math.min(1, (S.speed - want) / 6) : 0;
    }
    if (cruise.current && !inp.steer && performance.now() - inp.touched > 1500) {
      const lanes = laneCentres(own.lanesAt(S.s));
      const target = lanes.reduce((b, o) => (Math.abs(o - S.offset) < Math.abs(b - S.offset) ? o : b), lanes[0]);
      live.steer = THREE.MathUtils.clamp((target - S.offset) * 0.8, -1, 1);
    }
    const next = roadStep(S, live, perf, own, dt);
    // You can't drive through anyone: alongside (changing lanes into them) or into the back of them.
    for (const b of bots) {
      const ds = b.s - next.s, dOff = Math.abs(b.offset - next.offset), touch = (b.len + myLen) / 2 + 0.3;
      if (Math.abs(ds) < touch && dOff < 1.95) {
        if (ds > 0) { next.s = b.s - touch; if (next.speed > b.speed) { if (next.speed - b.speed > 3) engine.current?.thud(); next.speed = b.speed * 0.95; } }
        else if (Math.abs(S.offset - b.offset) >= 1.95) { next.offset = S.offset; } // side by side: you stay in your lane
        else { b.s = next.s - touch; b.speed = Math.min(b.speed, next.speed); }
      }
    }
    if (next.wall && !S.wall && S.speed > 8) engine.current?.thud();
    const gb = gearbox(next.speed, perf.top / 0.82);
    Object.assign(S, next, { gear: gb.gear, rpm: gb.rpm });
    engine.current?.update(gb.rpm, live.throttle, gb.gear, 0);
    Object.assign(meV.current, { s: S.s, offset: S.offset, target: S.offset, speed: S.speed });

    const pose = own.pose(S.s, S.offset, tmp);
    hud.current.tunnel = pose.tunnel;
    const o = me.current;
    if (o) {
      o.position.set(pose.p.x, pose.p.y + 0.12, pose.p.z);
      o.rotation.set(-pose.pitch, pose.yaw + THREE.MathUtils.clamp(live.steer * 0.08 * Math.min(1, S.speed / 10), -0.1, 0.1), 0, "YXZ");
    }
    // The chase camera: behind and above, looking down the road.
    const back = own.pose(Math.max(0, S.s - 10), S.offset * 0.85, tmp2).p;
    // Down in an underpass the camera comes below street level too (looking down the cutting, not at the street over it).
    const camY = pose.p.y < -0.8 ? Math.min(back.y + 4.2, -0.25) : back.y + 4.2;
    camPos.current.lerp(tmp2.set(back.x, camY, back.z), camPos.current.lengthSq() ? Math.min(1, dt * 5) : 1);
    const ahead = own.pose(Math.min(own.length, S.s + 18), S.offset * 0.6, tmp2).p;
    camLook.current.lerp(tmp2.set(ahead.x, ahead.y + 1.2, ahead.z), camLook.current.lengthSq() ? Math.min(1, dt * 6) : 1);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
    if (ground.current) ground.current.position.set(Math.round(pose.p.x / 50) * 50, 0, Math.round(pose.p.z / 50) * 50);

    // Your side's traffic: keeping its distance, changing lanes when there's room, and you're one of the cars.
    stepTraffic(bots, own, dt, [meV.current], now);
    bots.forEach((b, i) => {
      // Far behind you or far ahead: rejoin the road somewhere near you where there's room.
      if (b.s < S.s - 260 || b.s > S.s + 1100) {
        const ahead = b.s < S.s;
        for (let t = 0; t < 6; t++) {
          const s = ahead ? S.s + 500 + hash(i * 7 + t + now) * 450 : S.s - 160 - hash(i + t + now) * 60;
          const lane = freeSpot(bots.filter((x) => x !== b), own, s, [meV.current], 35, i + t);
          if (lane !== null && s > 0 && s < own.length) { Object.assign(b, { s, offset: lane, target: lane, speed: b.want * (ahead ? 0.85 : 1) }); break; }
        }
      }
      const g = botRefs.current[i];
      if (g) { const p = own.pose(b.s, b.offset, tmp).p; const ps = own.pose(b.s); g.position.set(p.x, p.y + 0.12, p.z); g.rotation.set(-ps.pitch, ps.yaw + (b.target - b.offset) * -0.06, 0, "YXZ"); g.visible = b.s > 2 && b.s < own.length - 5; }
    });
    // Coming the other way, across the barrier (the same rules on their side).
    otherS.current = other.nearest(pose.p.x, pose.p.z, otherS.current < 0 ? other.nearestAll(pose.p.x, pose.p.z) : otherS.current, 120);
    if (!oncoming.current.length) oncoming.current = spawnTraffic(other, otherS.current - 900, otherS.current + 150, 2, 99).slice(0, ONCOMING);
    const on = oncoming.current;
    stepTraffic(on, other, dt, [], now);
    on.forEach((b, i) => {
      if (b.s > otherS.current + 300 || b.s < otherS.current - 1400) {
        for (let t = 0; t < 6; t++) {
          const s = otherS.current - 700 - hash(i * 5 + t + now) * 500;
          const lane = freeSpot(on.filter((x) => x !== b), other, s, [], 35, i + t);
          if (lane !== null && s > 0) { Object.assign(b, { s, offset: lane, target: lane, speed: b.want }); break; }
        }
      }
      const g = onRefs.current[i];
      if (g) { const p = other.pose(b.s, b.offset, tmp).p; const ps = other.pose(b.s); g.position.set(p.x, p.y + 0.12, p.z); g.rotation.set(-ps.pitch, ps.yaw, 0, "YXZ"); g.visible = b.s > 2 && b.s < other.length - 2; }
    });

    if (!arrived.current && S.s >= end - 6) { arrived.current = true; onArrive(); }
  });

  return (
    <group>
      <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><planeGeometry args={[6000, 6000]} /><meshStandardMaterial color="#e4d5b7" roughness={1} /></mesh>
      <group ref={me}><Suspense fallback={null}>{car && <CarModel car={car} plate={plate} />}</Suspense></group>
      <Suspense fallback={null}>
        {looks.map((l, i) => <group key={`b${i}`} ref={(g) => { botRefs.current[i] = g; }} visible={false}><TrafficCar look={l} /></group>)}
        {onLooks.map((l, i) => <group key={`o${i}`} ref={(g) => { onRefs.current[i] = g; }} visible={false}><TrafficCar look={l} /></group>)}
      </Suspense>
    </group>
  );
}

// ---------------------------------------------------------------- the pieces of city round you

function Pieces({ corridor, st, own }: { corridor: Corridor; st: React.RefObject<{ s: number }>; own: RoadPath }) {
  const [areas, setAreas] = useState<Array<{ k: number; a: OsmArea }>>([]);
  const night = useMemo(() => dubaiSky() === "night", []);
  useEffect(() => {
    let live = true;
    const want = new Set<number>();
    const tick = () => {
      // Where you are, measured along the forward road (the pieces are cut along it).
      const p = own.pose(st.current.s).p;
      const f = own === corridor.fwd ? st.current.s : corridor.fwd.nearestAll(p.x, p.z);
      const need = corridor.chunks.filter((c) => c.s0 < f + 1700 && c.s1 > f - 600).map((c) => c.k);
      const fresh = need.filter((k) => !want.has(k));
      need.forEach((k) => want.add(k));
      [...want].forEach((k) => { if (!need.includes(k)) want.delete(k); });
      for (const k of fresh) loadPiece(corridor.id, k).then((a) => { if (live && a && want.has(k)) setAreas((cur) => (cur.some((x) => x.k === k) ? cur : [...cur, { k, a }])); });
      setAreas((cur) => (cur.every((x) => want.has(x.k)) ? cur : cur.filter((x) => want.has(x.k))));
    };
    const t0 = setTimeout(tick, 0);
    const t = setInterval(tick, 1500);
    return () => { live = false; clearTimeout(t0); clearInterval(t); };
  }, [corridor, st, own]);
  return <>{areas.map(({ k, a }) => <group key={k}><City d={a} night={night} ground={false} /><Palms d={a} /></group>)}</>;
}

// ---------------------------------------------------------------- the scene and the dashboard

export function DriveScene({ corridor, leg, carId, plate, destination, onArrive, onSkip }: {
  corridor: Corridor; leg: Leg; carId: string; plate: string; destination: string; onArrive: () => void; onSkip: () => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const a = corridor.exits.find((e) => e.id === leg.a), b = corridor.exits.find((e) => e.id === leg.b);
  const forward = !a || !b || a.sF <= b.sF;
  const own = forward ? corridor.fwd : corridor.back, other = forward ? corridor.back : corridor.fwd;
  const start = Math.max(0, (forward ? a?.sF : a?.sB) ?? 0), end = Math.min(own.length - 1, (forward ? b?.sF : b?.sB) ?? own.length - 1);
  const st = useRef<RoadState & { gear: number; rpm: number; fs: number }>({ s: start, offset: laneCentres(own.lanesAt(start)).at(-2) ?? 0, speed: 18, wall: 0, gear: 3, rpm: 3000, fs: 0 });
  const input = useRef<DriveInput & { touched: number }>({ throttle: 0, brake: 0, steer: 0, touched: 0 });
  const cruise = useRef(true);
  const [cruiseOn, setCruiseOn] = useState(true);
  const hudRef = useRef({ tunnel: false });
  const [hud, setHud] = useState({ kmh: 0, gear: 3, left: end - start, tunnel: false });
  const [sound, setSound] = useState(true);
  const engine = useRef<V10 | null>(null);

  useEffect(() => {
    // About a third of the Autodrome's volume: this is a drive, not a race.
    try { engine.current = new V10(0.35); } catch { engine.current = null; }
    return () => { engine.current?.stop(); engine.current = null; };
  }, []);
  useEffect(() => {
    const t = setInterval(() => { const S = st.current; setHud({ kmh: Math.round(S.speed * 3.6), gear: S.gear, left: Math.max(0, end - S.s), tunnel: hudRef.current.tunnel }); }, 150);
    return () => clearInterval(t);
  }, [end]);
  // Keys: arrows or WASD, space to brake.
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      input.current.throttle = keys.has("arrowup") || keys.has("w") ? 1 : 0;
      input.current.brake = keys.has("arrowdown") || keys.has("s") || keys.has(" ") ? 1 : 0;
      input.current.steer = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
      if (input.current.steer) input.current.touched = performance.now();
    };
    const down = (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); apply(); if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); apply(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  const onSteer = useCallback((v: number) => { input.current.steer = v; if (v) input.current.touched = performance.now(); }, []);
  const hold = (k: "throttle" | "brake") => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); input.current[k] = 1; },
    onPointerUp: () => { input.current[k] = 0; }, onPointerCancel: () => { input.current[k] = 0; }, onPointerLeave: () => { input.current[k] = 0; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  // Exits on your way (the gantry 300 m before each), yours amber.
  const gantries = useMemo(() => corridor.exits.map((e) => ({ e, s: (forward ? e.sF : e.sB) - 300 }))
    .filter(({ e, s }) => s > start - 50 && s < end && e.id !== leg.a), [corridor, forward, start, end, leg.a]);
  const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900 select-none touch-none">
      <Canvas dpr={quality.dpr} camera={{ fov: 64, near: 0.4, far: 3200, position: [0, 5, 0] }} gl={{ powerPreference: quality.powerPreference }}>
        <PerfProbe scene="Drive" />
        <SkyAndLight sky={sky} />
        <fog attach="fog" args={[night ? "#16213a" : "#dbe7f3", 500, 2400]} />
        <ambientLight intensity={night ? 0.9 : 0.35} color={night ? "#9fb3d9" : "#ffffff"} />
        <Pieces corridor={corridor} st={st} own={own} />
        <RoadSurface own={own} other={other} from={start} to={end} night={night} />
        {gantries.map(({ e, s }) => <Gantry key={e.id} road={own} s={s} title={`${e.id === leg.b ? "⬈ YOUR EXIT" : "⬈ EXIT"} · 300 m`} sub={e.name} mine={e.id === leg.b} />)}
        <Driver own={own} other={other} start={start} end={end} carId={carId} plate={plate} input={input} cruise={cruise} st={st} hud={hudRef} engine={engine} onArrive={onArrive} />
      </Canvas>

      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="rounded-2xl bg-emerald-800/90 text-white px-3 py-2 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">{corridor.name}{hud.tunnel ? " · in the tunnel" : ""}</p>
          <p className="text-sm font-black truncate">Exit: {b?.name ?? destination}</p>
          <p className="text-xs font-bold text-white/80">{km(hud.left)} to go · then {destination}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <button onClick={onSkip} className="h-9 px-3 rounded-full bg-slate-950/80 text-white text-xs font-black">Skip ⏭</button>
          <button onClick={() => { setSound(!sound); setRaceVolume(!sound); }} className="h-9 px-3 rounded-full bg-slate-950/75 text-white text-xs font-black">{sound ? "🔊" : "🔇"}</button>
        </div>
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 flex items-end justify-between">
        <SteeringWheel size={128} className="bg-white/25 backdrop-blur-sm ring-1 ring-white/40" onSteer={onSteer} />
        <div className="flex flex-col items-center gap-1.5 mb-1">
          <button onClick={() => { cruise.current = !cruiseOn; setCruiseOn(!cruiseOn); }}
            className={`h-8 px-3 rounded-full text-[11px] font-black ${cruiseOn ? "bg-sky-500 text-white" : "bg-slate-950/70 text-white/80"}`}>{cruiseOn ? "CRUISE 100 ✓" : "CRUISE"}</button>
          <div className="pointer-events-none rounded-2xl bg-slate-950/75 text-white px-4 py-2 text-center">
            <p className="text-3xl font-black tabular-nums leading-none">{hud.kmh}</p>
            <p className="text-[10px] font-bold text-white/60">KM/H · GEAR {hud.gear}</p>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <button aria-label="Brake" {...hold("brake")} className="w-16 h-20 rounded-2xl bg-rose-500/90 text-white font-black text-sm active:bg-rose-500">BRAKE</button>
          <button aria-label="Gas" {...hold("throttle")} className="w-20 h-24 rounded-2xl bg-emerald-500/90 text-white font-black active:bg-emerald-500">GAS</button>
        </div>
      </div>
      <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer" className="absolute right-2 bottom-0.5 rounded bg-white/70 px-1.5 text-[9px] font-semibold text-slate-700">{OSM_ATTRIBUTION}</a>
    </div>
  );
}
