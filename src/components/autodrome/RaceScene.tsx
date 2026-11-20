"use client";

// The race at Dubai Autodrome, live: everyone on the grid in their own car, the countdown to the same moment for all
// (the server's start time), then laps of the circuit. You drive yours (a steering wheel and gas and brake pedals on a
// phone, arrows or WASD on a keyboard); the others are where their last update put them, carrying on at their speed between
// updates (three a second each, on the Realtime channel race:<code>). Engines are synthesized (lib/raceAudio):
// yours in full, theirs louder as they get close. Crossing the line after the last lap records your time.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { paintedCar, type Car } from "@/lib/cars";
import { CarModel } from "@/components/cars/CarModel";
import { SteeringWheel } from "@/components/cars/SteeringWheel";
import { PerfProbe } from "@/components/perf/PerfProbe";
import { canvasQuality } from "@/lib/device";
import {
  bikePerf, cornerGrip, gearbox, lapTime, mountOf, perfOf, ridePerf, sportDef, step, stride, trackOf, trackPose,
  type DriveInput, type Racer, type RideState, type Sport, type Track,
} from "@/lib/autodrome";
import { Crowd, Hooves, RemoteEngine, V10, setRaceVolume } from "@/lib/raceAudio";
import { BikeModel, CamelModel, HorseModel, silksFor, type Motion } from "@/components/racing/Mounts";

interface Remote { dist: number; offset: number; speed: number; at: number; done?: boolean }
/** How often each car sends its position: three times a second with a few cars, down to once a second with ten or
    more, so a full grid stays within the Realtime message budget (10 cars × 1 a second × 9 listeners, plus anyone watching). Between
    updates the others carry on along the track at their speed, so they still move smoothly. */
const sendEvery = (cars: number) => Math.max(333, Math.min(1000, cars * 100));

/** Where each starts: cars and bikes two by two behind the line; horses and camels side by side across the track, as
    from the starting stalls. */
const gridSpot = (i: number, sport: Sport = "car", hw = 9) =>
  sport === "horse" || sport === "camel" ? { dist: -4, offset: -hw + 1.6 + (i % 10) * 2.15 } : { dist: -12 - (sport === "bike" ? 7 : 10) * Math.floor(i / 2), offset: i % 2 === 0 ? -3.5 : 3.5 };
/** Racing on legs, not wheels. */
const onLegs = (sport?: Sport) => sport === "horse" || sport === "camel";
/** How much room each takes (m): length along the track and width across it, for bumping into each other. */
const BODY: Record<Sport, { l: number; w: number }> = { car: { l: 4.5, w: 2.0 }, bike: { l: 2.1, w: 0.9 }, horse: { l: 2.5, w: 1.0 }, camel: { l: 3.0, w: 1.1 } };
/** The others' state as each phone last told us. */
type Mine = RideState & { rpm: number; gear: number };

// ---------------------------------------------------------------- the circuit

function Circuit({ track }: { track: Track }) {
  const theme = track.def.theme;
  const hw = track.halfWidth;
  const railed = !!theme.surface;
  const { road, kerbs, rails, infield, line } = useMemo(() => {
    const S = track.samples, N = S.length;
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
    // A rail standing along the track: a white strip at rail height (both faces), over posts.
    const rail = (offset: number) => {
      const pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= N; i++) {
        const s = S[i % N];
        const a = s.p.clone().addScaledVector(s.n, offset);
        pos.push(a.x, 0.95, a.z, a.x, 1.2, a.z);
        if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const red = new THREE.Color(theme.kerb), white = new THREE.Color("#f8fafc");
    const kerbColor = (i: number) => (Math.floor(i / 3) % 2 ? red : white);
    // Turf is mown in stripes; dirt and sand are raked, a little uneven.
    const surf = new THREE.Color(theme.surface ?? "#2b2d31");
    const turf = theme.surface && new THREE.Color(theme.surface).g > new THREE.Color(theme.surface).r;
    const surfColor = (i: number) => turf ? surf.clone().multiplyScalar(Math.floor(i / 6) % 2 ? 1.0 : 0.86) : surf.clone().multiplyScalar(0.94 + 0.06 * Math.sin(i * 1.7));
    // Inside an oval: its own infield (grass, or sand), just inside the inner rail.
    let field: THREE.ShapeGeometry | null = null;
    if (railed) {
      const pts = S.map((s) => { const q = s.p.clone().addScaledVector(s.n, hw + 2); return new THREE.Vector2(q.x, -q.z); });
      field = new THREE.ShapeGeometry(new THREE.Shape(pts));
    }
    return {
      road: ribbon(-hw, hw, theme.surface ? surfColor : undefined),
      kerbs: railed ? [] : [ribbon(hw, hw + 1.4, kerbColor, 0.16), ribbon(-hw - 1.4, -hw, kerbColor, 0.16)],
      rails: railed ? [rail(hw + 0.4), rail(-hw - 0.4)] : [],
      infield: field,
      line: trackPose(track, 0, 0),
    };
  }, [track, theme.kerb, theme.surface, hw, railed]);
  // The start/finish line: a chequered strip across the track.
  const checker = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 16;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 8, y * 8, 8, 8); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  }, []);
  const stands = theme.stands ?? "autodrome";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[track.centre[0], -0.2, track.centre[1]]} receiveShadow>
        <planeGeometry args={[Math.max(2400, track.radius * 6), Math.max(2400, track.radius * 6)]} />
        <meshStandardMaterial color={theme.ground} roughness={theme.scenery === "palms" ? 0.35 : 1} />
      </mesh>
      {/* Inside the circuit: grass, a plaza, sand. */}
      {infield ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} geometry={infield}><meshStandardMaterial color={theme.infield} roughness={1} /></mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[track.centre[0], -0.05, track.centre[1]]}>
          <circleGeometry args={[track.radius * 0.72, 48]} />
          <meshStandardMaterial color={theme.infield} roughness={1} />
        </mesh>
      )}
      <mesh geometry={road} receiveShadow>{theme.surface ? <meshStandardMaterial vertexColors roughness={1} /> : <meshStandardMaterial color="#2b2d31" roughness={0.85} />}</mesh>
      {kerbs.map((k, i) => <mesh key={i} geometry={k}><meshStandardMaterial vertexColors roughness={0.7} /></mesh>)}
      {rails.map((r, i) => <mesh key={i} geometry={r}><meshStandardMaterial color="#ffffff" roughness={0.4} side={THREE.DoubleSide} /></mesh>)}
      {railed && <RailPosts track={track} />}
      {!railed && (
        <mesh position={[line.p.x, 0.2, line.p.z]} rotation={[-Math.PI / 2, 0, -line.yaw + Math.PI / 2]}>
          <planeGeometry args={[hw * 2, 3]} />
          <meshStandardMaterial map={checker} />
        </mesh>
      )}
      {railed ? (
        // The winning post on the inside rail, and a white line across.
        <group position={[line.p.x, 0, line.p.z]} rotation={[0, line.yaw, 0]}>
          <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.35, hw * 2]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh position={[-hw - 1.2, 2.5, 0]}><cylinderGeometry args={[0.12, 0.12, 5, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[-hw - 1.2, 5.2, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.7, 20]} /><meshStandardMaterial color="#dc2626" side={THREE.DoubleSide} /></mesh>
        </group>
      ) : (
        <group position={[line.p.x, 0, line.p.z]} rotation={[0, line.yaw, 0]}>
          <mesh position={[-hw - 1.5, 4, 0]}><boxGeometry args={[0.6, 8, 0.6]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[hw + 1.5, 4, 0]}><boxGeometry args={[0.6, 8, 0.6]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, 8, 0]}><boxGeometry args={[hw * 2 + 4, 1.6, 0.8]} /><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></mesh>
        </group>
      )}
      {stands === "meydan" ? <MeydanStand sign={theme.sign} color={theme.signColor} /> : stands === "marmoom" ? <MarmoomStand track={track} sign={theme.sign} color={theme.signColor} /> : <Stands sign={theme.sign} color={theme.signColor} />}
      <Scenery track={track} />
    </group>
  );
}

/** The rail posts, every 6 m both sides (one instanced mesh). */
function RailPosts({ track }: { track: Track }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: THREE.Vector3[] = [];
    const every = Math.max(1, Math.round((6 / track.length) * track.N));
    for (let i = 0; i < track.N; i += every) for (const side of [1, -1]) out.push(track.samples[i].p.clone().addScaledVector(track.samples[i].n, side * (track.halfWidth + 0.4)));
    return out;
  }, [track]);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach((p, i) => { o.position.set(p.x, 0.55, p.z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color="#f1f5f9" /></instancedMesh>;
}

/** A sign painted once. */
function useSign(text: string, color: string, w = 512, h = 64) {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff"; g.font = `900 ${Math.round(h * (text.length > 16 ? 0.5 : 0.62))}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h * 0.54);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, color, w, h]);
}

/** Meydan's grandstand along the home straight: a kilometre of tiered seats under a crescent roof of white panels
    with a gold edge, the crowd in the lower tiers, and the giant screen across in the infield. */
function MeydanStand({ sign: text, color }: { sign: string; color: string }) {
  const sign = useSign(text, color);
  const crowd = useMemo(() => ["#f43f5e", "#f8fafc", "#facc15", "#38bdf8", "#a3e635", "#f8fafc", "#fb923c"], []);
  const panels = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const x = -260 + i * 26;
    // The crescent: highest in the middle, sweeping down at the ends.
    const k = (x - 120) / 420;
    return { x, h: 30 - 16 * k * k };
  }), []);
  return (
    <group>
      {/* Tiered seating, with the crowd. */}
      {[0, 1, 2].map((t) => (
        <group key={t}>
          <mesh position={[120, 2 + t * 5, -26 - t * 7]}><boxGeometry args={[780, 4 + t * 0.2, 8]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
          <mesh position={[120, 4.3 + t * 5, -23 - t * 7]} rotation={[-0.35, 0, 0]}><boxGeometry args={[776, 0.5, 6]} /><meshStandardMaterial color={crowd[t]} /></mesh>
        </group>
      ))}
      <mesh position={[120, 12, -52]}><boxGeometry args={[800, 24, 12]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      {/* Glass boxes along the top. */}
      <mesh position={[120, 20, -45.6]}><boxGeometry args={[760, 6, 0.4]} /><meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.15} /></mesh>
      {/* The crescent roof: panels cantilevered over the stands, edged in gold. */}
      {panels.map((p) => (
        <group key={p.x} position={[p.x, p.h, -36]}>
          <mesh rotation={[0.18, 0, 0]}><boxGeometry args={[25, 0.6, 34]} /><meshStandardMaterial color="#f8fafc" roughness={0.35} /></mesh>
          <mesh position={[0, -0.9, 16.6]}><boxGeometry args={[25, 1.4, 0.6]} /><meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.25} /></mesh>
        </group>
      ))}
      <mesh position={[120, 9, -21.7]}><planeGeometry args={[60, 7]} /><meshBasicMaterial map={sign} /></mesh>
      {/* The screen in the infield, facing the stands. */}
      <group position={[180, 0, 120]}>
        <mesh position={[0, 7, 0]}><boxGeometry args={[3, 14, 3]} /><meshStandardMaterial color="#334155" /></mesh>
        <mesh position={[0, 18, 0]}><boxGeometry args={[60, 14, 1.2]} /><meshStandardMaterial color="#0f172a" emissive="#1d4ed8" emissiveIntensity={0.35} /></mesh>
      </group>
    </group>
  );
}

/** Al Marmoom: a shaded stand by the finish, and the road outside the rail where the owners drive their 4x4s
    alongside the camels, steering the robot jockeys. */
function MarmoomStand({ track, sign: text, color }: { track: Track; sign: string; color: string }) {
  const sign = useSign(text, color);
  const road = useMemo(() => {
    const S = track.samples, N = S.length, pos: number[] = [], idx: number[] = [];
    const a0 = -(track.halfWidth + 6), a1 = -(track.halfWidth + 13);
    for (let i = 0; i <= N; i++) {
      const s = S[i % N];
      const a = s.p.clone().addScaledVector(s.n, a0), b = s.p.clone().addScaledVector(s.n, a1);
      pos.push(a.x, 0.1, a.z, b.x, 0.1, b.z);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [track]);
  return (
    <group>
      <mesh geometry={road}><meshStandardMaterial color="#3f3f46" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <group position={[160, 0, -44]}>
        {[0, 1, 2, 3].map((t) => <mesh key={t} position={[0, 1 + t * 1.6, -t * 2.4]}><boxGeometry args={[180, 2, 3]} /><meshStandardMaterial color="#e7e5e4" /></mesh>)}
        {[-80, -40, 0, 40, 80].map((x) => <mesh key={x} position={[x, 6, -2]}><cylinderGeometry args={[0.4, 0.4, 12, 8]} /><meshStandardMaterial color="#a8a29e" /></mesh>)}
        <mesh position={[0, 12.2, -3]}><boxGeometry args={[190, 0.6, 14]} /><meshStandardMaterial color="#b45309" /></mesh>
        <mesh position={[0, 10.5, 4.2]}><planeGeometry args={[50, 5.5]} /><meshBasicMaterial map={sign} /></mesh>
      </group>
    </group>
  );
}

/** Grandstands and the pit building along the main straight. */
function Stands({ sign: text, color }: { sign: string; color: string }) {
  const crowd = useMemo(() => ["#f43f5e", "#22d3ee", "#facc15", "#a3e635", "#f8fafc", "#fb923c"], []);
  // The sign on the pit building, painted once.
  const sign = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = color; g.fillRect(0, 0, 512, 64);
    g.fillStyle = "#ffffff"; g.font = `900 ${text.length > 16 ? 32 : 40}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, color]);
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

/** What stands around each track (the same every time): Motor City's towers, the Marina's skyscrapers close in, dunes,
    mountains, or palms along the sea wall. */
function Scenery({ track }: { track: Track }) {
  const kind = track.def.theme.scenery;
  const items = useMemo(() => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const [cx, cz] = track.centre, R = track.radius;
    const ring = (n: number, from: number, to: number) => Array.from({ length: n }, () => {
      const a = rnd() * Math.PI * 2, r = R + from + rnd() * (to - from);
      return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, r1: rnd(), r2: rnd() };
    });
    if (kind === "palms") {
      // Palms just inside the track, every so often.
      const S = track.samples;
      return Array.from({ length: 44 }, (_, i) => {
        const s = S[Math.floor((i / 44) * S.length)];
        const side = i % 2 ? 1 : -1;
        const p = s.p.clone().addScaledVector(s.n, side * 30);
        return { x: p.x, z: p.z, r1: rnd(), r2: rnd() };
      }).concat(ring(14, 700, 1100));
    }
    return ring(kind === "marina" ? 60 : kind === "towers" ? 70 : 40, kind === "marina" ? 260 : 450, kind === "marina" ? 700 : 900);
  }, [track, kind]);
  if (kind === "dunes") return <group>{items.map((t, i) => <mesh key={i} position={[t.x, 0, t.z]} scale={[90 + t.r1 * 120, 18 + t.r2 * 40, 60 + t.r2 * 90]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={t.r1 > 0.5 ? "#e0b872" : "#d4a85f"} roughness={1} /></mesh>)}</group>;
  if (kind === "mountains") return <group>{items.map((t, i) => <mesh key={i} position={[t.x, 0, t.z]}><coneGeometry args={[120 + t.r1 * 160, 160 + t.r2 * 340, 7]} /><meshStandardMaterial color={t.r2 > 0.6 ? "#7c6f62" : "#94877a"} flatShading roughness={1} /></mesh>)}</group>;
  if (kind === "palms") return <group>{items.map((t, i) => i < 44 ? <Palm key={i} x={t.x} z={t.z} h={9 + t.r1 * 5} /> : <mesh key={i} position={[t.x, 60 + t.r1 * 80, t.z]}><boxGeometry args={[40, 120 + t.r1 * 160, 40]} /><meshStandardMaterial color="#f1e7d6" /></mesh>)}</group>;
  const marina = kind === "marina";
  return <group>{items.map((t, i) => {
    const h = marina ? 120 + t.r1 * 300 : 40 + t.r1 * 220, w = marina ? 24 + t.r2 * 26 : 20 + t.r2 * 40;
    const c = marina ? ["#60a5fa", "#93c5fd", "#1e3a8a", "#cbd5e1"][Math.floor(t.r2 * 4)] : ["#94a3b8", "#cbd5e1", "#64748b", "#e2e8f0"][Math.floor(t.r2 * 4)];
    return <mesh key={i} position={[t.x, h / 2, t.z]}><boxGeometry args={[w, h, w]} /><meshStandardMaterial color={c} metalness={marina ? 0.3 : 0} roughness={marina ? 0.3 : 0.8} /></mesh>;
  })}</group>;
}

function Palm({ x, z, h }: { x: number; z: number; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.35, 0.5, h, 6]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.cos(k * 1.26) * 2, h, Math.sin(k * 1.26) * 2]} rotation={[Math.sin(k * 1.26) * 0.9, 0, -Math.cos(k * 1.26) * 0.9]}>
          <boxGeometry args={[0.5, 0.15, 4.5]} /><meshStandardMaterial color="#15803d" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the racers and the camera

/** Dust and smoke: soft puffs that rise, spread and fade in a second or so (one pool of points for everyone). Hooves
    kick up the turf or the sand behind them; sliding tyres smoke grey; running off the track throws up sand. */
function Dust({ emits, color }: { emits: React.RefObject<{ x: number; z: number; v: number; smoke: boolean }[]>; color: string }) {
  const N = 260;
  const ref = useRef<THREE.Points>(null);
  const state = useRef({ life: new Float32Array(N), vel: new Float32Array(N * 3), next: 0 });
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-9999), 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("alpha", new THREE.Float32BufferAttribute(new Float32Array(N), 1));
    return g;
  }, []);
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  // Each puff fades out and grows as it goes.
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } },
    transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: `attribute float alpha; varying float vA; varying vec3 vC;
      void main() { vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.6 * (2.0 - alpha) * (300.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC;
      void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA * 0.55); if (gl_FragColor.a < 0.01) discard; }`,
  }), [tex]);
  const base = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.25), [color]);
  const grey = useMemo(() => new THREE.Color("#d4d4d8"), []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const g = pts.geometry, st = state.current;
    const pos = g.attributes.position as THREE.BufferAttribute, col = g.attributes.color as THREE.BufferAttribute, al = g.attributes.alpha as THREE.BufferAttribute;
    const { life, vel } = st;
    for (const e of emits.current) {
      const n = e.smoke ? 2 : Math.min(3, 1 + Math.floor(e.v / 8));
      for (let k = 0; k < n; k++) {
        const i = st.next; st.next = (st.next + 1) % N;
        life[i] = 1;
        al.setX(i, 1);
        pos.setXYZ(i, e.x + (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.3, e.z + (Math.random() - 0.5) * 1.2);
        vel[i * 3] = (Math.random() - 0.5) * 1.5; vel[i * 3 + 1] = 0.6 + Math.random() * 1.2; vel[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        const c = e.smoke ? grey : base;
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    emits.current.splice(0);
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt * 0.9;
      if (life[i] <= 0) { pos.setXYZ(i, 0, -9999, 0); al.setX(i, 0); continue; }
      pos.setXYZ(i, pos.getX(i) + vel[i * 3] * dt, pos.getY(i) + vel[i * 3 + 1] * dt, pos.getZ(i) + vel[i * 3 + 2] * dt);
      al.setX(i, life[i]);
    }
    for (const a of [pos, col, al]) a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} material={material} frustumCulled={false} />
  );
}

/** What a racer rides, from the race's sport: their car, or the horse, camel or superbike they picked. */
function Ride({ sport, racer, index, motion }: { sport: Sport; racer: Racer; index: number; motion: React.RefObject<Motion> }) {
  const silks = useMemo(() => silksFor(racer.username), [racer.username]);
  const m = mountOf(sport, racer.mount) ?? sportDef(sport)?.mounts[0];
  if (sport === "horse") return <HorseModel coat={m?.coat ?? "#5b3018"} mane={m?.mane ?? "#120c08"} silks={silks} number={index + 1} motion={motion} />;
  if (sport === "camel") return <CamelModel coat={m?.coat ?? "#c9a066"} silks={silks} number={index + 1} motion={motion} />;
  if (sport === "bike") return <BikeModel color={m?.color ?? "#dc2626"} silks={silks} number={index + 1} motion={motion} />;
  const car = paintedCar(racer.car, racer.color) as (Car & { model3d?: string }) | undefined;
  return car ? <CarModel car={car} plate={racer.plate ?? "DXB"} /> : null;
}

/** The owner's 4x4 on the road outside the rail, keeping up with their camel. */
const SUV = paintedCar("toyota-land-cruiser", "#f8fafc") as (Car & { model3d?: string }) | undefined;

function Racers({ track, racers, me, mine, remotes, startsAtRef, sport, spectator, devProbe }: {
  track: Track; racers: Racer[]; me: string; mine: React.RefObject<Mine>;
  remotes: React.RefObject<Map<string, Remote>>; startsAtRef: React.RefObject<number>; sport: Sport;
  /** Watching, not riding: the camera follows whoever is in front (mine holds the leader's place). */
  spectator?: boolean;
  /** Development preview: expose each racer's lean and turn rate on window.__kin. */
  devProbe?: boolean;
}) {
  const groups = useRef(new Map<string, THREE.Group>());
  const escorts = useRef(new Map<string, THREE.Group>());
  const camPos = useRef(new THREE.Vector3(-30, 6, 0));
  const engines = useRef(new Map<string, RemoteEngine>());
  const legs = onLegs(sport);
  /** Each racer's heading, sideways speed, turn rate and lean, smoothed frame to frame. */
  const kin = useRef(new Map<string, { offset: number; heading: number; lat: number; latPrev?: number; omega: number; lean: number }>());
  const meLean = useRef(0);
  /** Where dust or smoke comes up this frame (read by Dust). */
  const dust = useRef<{ x: number; z: number; v: number; smoke: boolean }[]>([]);
  const baseFov = useRef<number | null>(null);
  const camYaw = useRef<number | null>(null);
  const tops = useMemo(() => new Map(racers.map((r) => [r.id, sport === "bike" ? bikePerf(r.mount).top : perfOf(r.car, r.tune).top])), [racers, sport]);
  // Each racer's speed and lean, read by its model every frame.
  const motions = useMemo(() => new Map(racers.map((r) => [r.id, { current: { speed: 0, lean: 0 } } as React.RefObject<Motion>])), [racers]);

  useEffect(() => {
    const e = engines.current;
    return () => { e.forEach((x) => x.stop()); e.clear(); };
  }, []);

  useFrame(({ camera }, dt) => {
    const now = Date.now();
    const meState = mine.current;
    let mePos: THREE.Vector3 | null = null;
    racers.forEach((r, i) => {
      const g = groups.current.get(r.id);
      if (!g) return;
      let dist: number, offset: number, speed: number;
      if (r.id === me) { dist = meState.dist; offset = meState.offset; speed = meState.speed; }
      else {
        const R = remotes.current.get(r.id);
        if (!R) { const gs = gridSpot(i, sport, track.halfWidth); dist = gs.dist; offset = gs.offset; speed = 0; }
        else {
          // Carry on at their speed since their last update (up to a second and a half), then ease towards it.
          const ahead = R.done ? 0 : Math.min(1.5, (now - R.at) / 1000) * R.speed;
          dist = R.dist + ahead; offset = R.offset; speed = R.speed;
          const shown = (g.userData.dist as number | undefined) ?? dist;
          dist = shown + (dist - shown) * Math.min(1, dt * 6);
          const shownO = (g.userData.offset as number | undefined) ?? offset;
          offset = shownO + (offset - shownO) * Math.min(1, dt * 5);
        }
        g.userData.dist = dist; g.userData.offset = offset;
        // Their engine, by distance from me.
        if (!legs && now >= startsAtRef.current - 3000) {
          let eng = engines.current.get(r.id);
          if (!eng) { try { eng = new RemoteEngine(); engines.current.set(r.id, eng); } catch { /* no audio */ } }
          const p = trackPose(track, dist, offset).p;
          const mp = trackPose(track, meState.dist, meState.offset).p;
          eng?.update(gearbox(speed, tops.get(r.id) ?? 60).rpm, p.distanceTo(mp));
        }
      }
      const pose = trackPose(track, dist, offset);
      g.position.set(pose.p.x, 0.12, pose.p.z);
      // Pointing where it's going: the track's direction, turned by how fast it's moving across it (no crabbing
      // sideways); a car or bike sliding wide has its tail out. The turn rate leans a bike into it (tan θ = vω/g),
      // and a horse or camel a little.
      const k = kin.current.get(r.id) ?? { offset, heading: pose.yaw, lat: 0, omega: 0, lean: 0 };
      const lat = (offset - k.offset) / Math.max(1e-3, dt);
      k.lat += (Math.max(-12, Math.min(12, lat)) - k.lat) * Math.min(1, dt * 8);
      let slide = 0;
      if (!legs) {
        const perfR = sport === "bike" ? bikePerf(r.mount) : perfOf(r.car, r.tune);
        const excess = Math.max(0, speed * speed * Math.abs(pose.curv) - cornerGrip(perfR));
        slide = r.id === me ? meState.drift : Math.min(1, excess / 8);
      }
      const heading = pose.yaw - Math.atan2(k.lat, Math.max(speed, 3)) - Math.sign(pose.curv) * slide * 0.38;
      let dh = heading - k.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      k.omega += (dh / Math.max(1e-3, dt) - k.omega) * Math.min(1, dt * 6);
      k.heading = heading; k.offset = offset;
      // Leaning to balance the cornering force: the bend's (v²κ) plus any sideways push from steering across the track.
      const latAcc = (k.lat - (k.latPrev ?? k.lat)) / Math.max(1e-3, dt);
      k.latPrev = k.lat;
      const leanK = sport === "bike" ? 1 : sport === "horse" ? 0.3 : sport === "camel" ? 0.2 : 0;
      const sideG = (speed * speed * pose.curv + Math.max(-8, Math.min(8, latAcc))) / 9.81;
      k.lean += (Math.max(-1.0, Math.min(1.0, Math.atan(sideG))) * leanK - k.lean) * Math.min(1, dt * 7);
      kin.current.set(r.id, k);
      if (devProbe) (window as unknown as { __kin?: unknown }).__kin = Object.fromEntries([...kin.current].map(([id, x]) => [id, { lean: +x.lean.toFixed(2), omega: +x.omega.toFixed(2), v: +(motions.get(id)?.current?.speed ?? 0).toFixed(1), curv: +trackPose(track, (groups.current.get(id)?.userData.dist as number) ?? meState.dist, 0).curv.toFixed(4) }]));
      g.rotation.y = heading;
      const mo = motions.get(r.id)?.current;
      if (mo) { mo.speed = speed; mo.lean = k.lean; }
      if (r.id === me) meLean.current = k.lean;
      // Dust from the hooves, smoke from sliding tyres, sand off the track.
      const offTrack = Math.abs(offset) > track.halfWidth;
      if (legs ? speed > 4 : slide > 0.3 || (offTrack && speed > 5)) dust.current.push({ x: pose.p.x, z: pose.p.z, v: speed, smoke: !legs && !offTrack });
      const esc = escorts.current.get(r.id);
      if (esc) {
        const ep = trackPose(track, dist - 6, -(track.halfWidth + 9.5));
        esc.position.set(ep.p.x, 0.12, ep.p.z);
        esc.rotation.y = ep.yaw;
      }
      if (r.id === me) mePos = pose.p;
    });
    // The chase camera: behind and above you (or the leader, when watching), looking up the track; closer for a horse,
    // a camel or a bike.
    if (mePos || spectator) {
      const back = legs ? 8.5 : sport === "bike" ? 7.5 : 11, up = legs ? 3.6 : sport === "bike" ? 2.7 : 4.2;
      // A chase camera on your heading, swinging round after you with a little lag, so you see yourself turn in; it
      // looks between where you're pointing and where the track goes.
      const at = trackPose(track, meState.dist, meState.offset);
      const myHeading = spectator ? at.yaw : (kin.current.get(me)?.heading ?? at.yaw);
      if (camYaw.current === null) camYaw.current = myHeading;
      let dy = myHeading - camYaw.current;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      camYaw.current += dy * Math.min(1, dt * (legs ? 3.5 : 4.5));
      const fx = Math.sin(camYaw.current), fz = Math.cos(camYaw.current);
      const road = trackPose(track, meState.dist + (legs ? 12 : 14), meState.offset).p;
      const ahead = new THREE.Vector3((at.p.x + fx * 14 + road.x) / 2, 0, (at.p.z + fz * 14 + road.z) / 2);
      const want = new THREE.Vector3(at.p.x - fx * back, up + Math.min(meState.speed, 80) * 0.01, at.p.z - fz * back);
      camPos.current.lerp(want, Math.min(1, dt * 8));
      camera.position.copy(camPos.current);
      // Riding a horse or camel, the camera rides its stride.
      if (legs) camera.position.y += Math.sin((meState.dist / (sport === "horse" ? 7 : 4)) * Math.PI * 4) * Math.min(0.07, meState.speed * 0.004);
      camera.lookAt(ahead.x, legs ? 1.7 : 1.2, ahead.z);
      // On a bike, the horizon tilts a little with the lean.
      if (sport === "bike") camera.rotateZ(meLean.current * 0.3);
      // The faster you go, the wider the view.
      const cam = camera as THREE.PerspectiveCamera;
      if (baseFov.current === null) baseFov.current = cam.fov;
      const fov = baseFov.current + Math.min(1, meState.speed / (legs ? 18 : 75)) * (legs ? 6 : 12);
      if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
    }
  });

  return (
    <>
      <Dust emits={dust} color={legs ? (track.def.theme.surface ?? "#c9a066") : track.def.theme.ground} />
      {racers.map((r, i) => (
        <group key={r.id}>
          <group ref={(g) => { if (g) groups.current.set(r.id, g); else groups.current.delete(r.id); }}>
            {/* Each loads on its own, so its name label isn't torn down while the model arrives. */}
            <Suspense fallback={null}><Ride sport={sport} racer={r} index={i} motion={motions.get(r.id)!} /></Suspense>
            {r.id !== me && <NameTag name={r.username} y={legs ? 3.4 : 2.7} />}
          </group>
          {sport === "camel" && SUV && (
            <group ref={(g) => { if (g) escorts.current.set(r.id, g); else escorts.current.delete(r.id); }}>
              <Suspense fallback={null}><CarModel car={SUV} plate={r.username.slice(0, 7).toUpperCase()} /></Suspense>
            </group>
          )}
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- the race

export function RaceScene({ code, me, racers, laps, track: trackId, sport = "car", startsAt, onFinish, onLeave, devBots, devStart }: {
  /** me not among the racers: watching (follow the leader, no controls, nothing sent). */
  code: string; me: string; racers: Racer[]; laps: number;
  /** Which track (lib/autodrome ALL_TRACKS). */
  track?: string;
  /** car (default), bike, horse or camel. */
  sport?: Sport;
  /** When the race starts, on this device's clock (already corrected for the server's). */
  startsAt: number;
  onFinish: (ms: number) => void; onLeave: () => void;
  /** Development preview only: the others driven by simple bots on this device, and where everyone starts (m along). */
  devBots?: boolean; devStart?: number;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const legs = onLegs(sport);
  const spectator = !racers.some((r) => r.id === me);
  const myIndex = Math.max(0, racers.findIndex((r) => r.id === me));
  const myCar = racers[myIndex]?.car ?? "nissan-sunny";
  const myMount = racers[myIndex]?.mount ?? null;
  const myTune = racers[myIndex]?.tune;
  const perf = useMemo(() => (sport === "bike" ? bikePerf(myMount) : perfOf(myCar, myTune)), [sport, myMount, myCar, myTune]);
  const ride = useMemo(() => ridePerf(sport, myMount), [sport, myMount]);
  const track = useMemo(() => trackOf(trackId), [trackId]);
  const mine = useRef<Mine>({ ...gridSpot(myIndex, sport, track.halfWidth), ...(devStart ? { dist: devStart } : {}), speed: 0, drift: 0, wall: 0, rpm: 1000, gear: 1, stamina: 1, tired: false });
  const input = useRef<DriveInput>({ throttle: 0, brake: 0, steer: 0 });
  const remotes = useRef(new Map<string, Remote>());
  const startsAtRef = useRef(startsAt);
  const finished = useRef<number | null>(null);
  const L = track.length;
  const [hud, setHud] = useState({ speed: 0, gear: 1, lap: 1, pos: 1, time: 0, count: 6, done: null as number | null, left: 6, dots: [] as { id: string; x: number; y: number; me: boolean }[], order: [] as string[], stamina: 1, tired: false, draft: false, togo: 0, bend: null as null | { dir: "left" | "right"; brake: boolean; tight: boolean } });
  const [sound, setSound] = useState(true);
  const draftRef = useRef(0);

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

  // Your engine (a car or a bike), or your mount's hooves; and the crowd.
  const engine = useRef<V10 | null>(null);
  const hooves = useRef<Hooves | null>(null);
  const crowd = useRef<Crowd | null>(null);
  useEffect(() => {
    try { crowd.current = new Crowd(); } catch { crowd.current = null; }
    if (!spectator) {
      try {
        if (legs) hooves.current = new Hooves(sport === "horse" ? 4 : 2, sport === "horse" ? 6.5 : 3.6, sport === "camel");
        else engine.current = new V10();
      } catch { engine.current = null; hooves.current = null; }
    }
    return () => { engine.current?.stop(); engine.current = null; hooves.current?.stop(); hooves.current = null; crowd.current?.stop(); crowd.current = null; };
  }, [spectator, legs, sport]);

  const lastBump = useRef(0);
  const bikeSteer = useRef(0);
  // Development preview: the others driven here by bots (braking for the bends, keeping to a lane; horses and camels
  // on the rail, pushing for home in the last 700 m), as if their phones were sending their positions.
  const bots = useRef(new Map<string, Mine>());
  const driveBots = useCallback((dt: number, now: number) => {
    racers.forEach((r, i) => {
      if (r.id === me) return;
      let b = bots.current.get(r.id);
      if (!b) { b = { ...gridSpot(i, sport, track.halfWidth), ...(devStart ? { dist: devStart - 7 * i, offset: (i % 2 ? 2.5 : -2.5) } : {}), speed: devStart ? 12 : 0, drift: 0, wall: 0, rpm: 0, gear: 1, stamina: 1, tired: false }; bots.current.set(r.id, b); }
      if (onLegs(sport)) {
        const lane = track.halfWidth - 1.6 - i * 1.3;
        const next = stride(track, b, { throttle: laps * L - b.dist < 700 ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, (lane - b.offset) * 0.6)) }, ridePerf(sport, r.mount), dt);
        Object.assign(b, next);
      } else {
        const p = sport === "bike" ? bikePerf(r.mount) : perfOf(r.car, r.tune);
        const g = cornerGrip(p) * 0.95;
        let vMax = 999;
        for (let a = 0; a < 160; a += 4) { const k = Math.abs(trackPose(track, b.dist + a, 0).curv); if (k > 1e-4) vMax = Math.min(vMax, Math.sqrt(g / k + 32 * a)); }
        const brake = b.speed > vMax ? 1 : 0;
        const lane = i % 2 ? 2.5 : -2.5;
        Object.assign(b, step(track, b, { throttle: brake ? 0 : 1, brake, steer: Math.max(-1, Math.min(1, (lane - b.offset) * 0.4)) }, p, dt));
      }
      remotes.current.set(r.id, { dist: b.dist, offset: b.offset, speed: b.speed, at: now });
    });
  }, [racers, me, sport, track, laps, L, devStart]);

  // Racing: a fixed-rate loop, so every phone races the same.
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const now = Date.now();
      const s = mine.current;
      // The crowd: a murmur, swelling to a roar over the last 400 m (of the leader, when watching).
      crowd.current?.update(now < startsAtRef.current ? 0.1 : Math.max(0.12, (s.dist - (laps * L - 400)) / 400));
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
      if (!go && finished.current === null) {
        // Before the lights: revving on the line (or waiting in the stalls).
        if (!legs) {
          const rev = input.current.throttle > 0 ? 6500 : 1100;
          s.rpm += (rev - s.rpm) * Math.min(1, dt * 6);
          engine.current?.update(s.rpm, input.current.throttle, 1, 0);
        }
      } else if (legs) {
        // In another runner's slipstream: up to 10 m behind one, nearly in line.
        let draft = 0;
        remotes.current.forEach((R) => {
          const gap = R.dist + (R.done ? 0 : Math.min(1.5, (now - R.at) / 1000) * R.speed) - s.dist;
          if (gap > 1.5 && gap < 10 && Math.abs(R.offset - s.offset) < 2.2) draft = Math.max(draft, 1 - (gap - 1.5) / 8.5);
        });
        draftRef.current = draft;
        const next = stride(track, s, finished.current !== null ? { throttle: 0, brake: 1, steer: 0 } : inp, ride, dt, draft);
        Object.assign(s, next);
        hooves.current?.update(next.speed);
        if (finished.current === null && s.dist >= laps * L) {
          finished.current = now - startsAtRef.current;
          onFinish(finished.current);
        }
      } else {
        // A bike's left and right buttons are on or off: ease into the lean, as a rider tips it in.
        if (sport === "bike") bikeSteer.current += (inp.steer - bikeSteer.current) * Math.min(1, dt * 7);
        const next = step(track, s, sport === "bike" ? { ...inp, steer: bikeSteer.current } : inp, perf, dt);
        const gb = gearbox(next.speed, perf.top);
        if (next.wall && !s.wall) engine.current?.thud();
        Object.assign(s, next, { rpm: gb.rpm, gear: gb.gear });
        engine.current?.update(gb.rpm, finished.current !== null ? 0 : inp.throttle, gb.gear, next.drift);
        if (finished.current === null && s.dist >= laps * L) {
          finished.current = now - startsAtRef.current;
          onFinish(finished.current);
        }
      }
      // Bumping into the others: alongside, you're nudged apart; tucked up behind one, you're held up until you
      // find a way round (so you can be boxed in on the rail).
      if (go) {
        const body = BODY[sport];
        remotes.current.forEach((R) => {
          if (R.done) return;
          const rd = R.dist + Math.min(1.5, (now - R.at) / 1000) * R.speed;
          const dd = rd - s.dist, doff = s.offset - R.offset;
          if (Math.abs(dd) >= body.l || Math.abs(doff) >= body.w) return;
          const overlap = body.w - Math.abs(doff);
          if (Math.abs(dd) < body.l * 0.55) s.offset += (doff >= 0 ? 1 : -1) * Math.min(overlap, 0.6) * 0.5;
          else if (dd > 0) { s.speed = Math.min(s.speed, R.speed * 0.97); s.dist = Math.min(s.dist, rd - body.l * 0.98); }
          if (!legs && now - lastBump.current > 600) { lastBump.current = now; engine.current?.thud(); s.speed *= 0.97; }
        });
      }
      if (devBots && now >= startsAtRef.current) driveBots(dt, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [track, perf, ride, legs, laps, L, onFinish, spectator, sport, devBots, driveBots]);

  const minimap = useMemo(() => {
    const xs = track.samples.map((s) => s.p.x), zs = track.samples.map((s) => s.p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const k = 100 / Math.max(maxX - minX, maxZ - minZ);
    const pt = (x: number, z: number) => [(x - minX) * k + 4, (z - minZ) * k + 4] as const;
    return { d: track.samples.map((s, i) => `${i ? "L" : "M"}${pt(s.p.x, s.p.z).join(",")}`).join(" ") + "Z", pt };
  }, [track]);

  /** The next bend in the 160 m ahead (cars and bikes): which way it goes, whether it's tight, and whether you're
      coming in too fast to make it (the speed the tyres allow there, allowing for braking at 1.6 g on the way). */
  const bendAhead = useCallback((dist: number, speed: number) => {
    const g = cornerGrip(perf);
    let vMax = Infinity, k = 0;
    for (let a = 0; a < 160; a += 4) {
      const c = trackPose(track, dist + a, 0).curv;
      if (Math.abs(c) > 1 / 140) {
        if (Math.abs(c) > Math.abs(k)) k = c;
        vMax = Math.min(vMax, Math.sqrt(g / Math.abs(c) + 32 * a));
      }
    }
    if (!k) return null;
    // Curvature > 0 bends to the right (towards +n).
    return { dir: k > 0 ? "right" as const : "left" as const, brake: speed > vMax * 1.04, tight: Math.abs(k) > 1 / 45 };
  }, [perf, track]);

  // The HUD, ten times a second.
  useEffect(() => {
    const t = setInterval(() => {
      const s = mine.current;
      const all = racers.map((r) => (r.id === me ? s.dist : (remotes.current.get(r.id)?.dist ?? gridSpot(racers.indexOf(r), sport, track.halfWidth).dist)));
      const pos = 1 + all.filter((d, i) => racers[i].id !== me && d > s.dist).length;
      const now = Date.now();
      const dots = racers.map((r, i) => {
        const at = trackPose(track, all[i], 0).p;
        const [x, y] = minimap.pt(at.x, at.z);
        return { id: r.id, x, y, me: r.id === me };
      });
      setHud({
        speed: Math.round(s.speed * 3.6), gear: s.gear, lap: Math.max(1, Math.min(laps, Math.floor(Math.max(0, s.dist) / L) + 1)),
        pos, time: Math.max(0, (finished.current ?? now - startsAtRef.current)), count: racers.length, done: finished.current,
        left: Math.ceil((startsAtRef.current - now) / 1000), dots,
        order: racers.map((r, i) => ({ u: r.username, d: all[i] })).sort((a, b) => b.d - a.d).map((x) => x.u),
        stamina: s.stamina, tired: s.tired, draft: draftRef.current > 0.2, togo: Math.max(0, Math.round(laps * L - s.dist)),
        bend: legs || spectator ? null : bendAhead(s.dist, s.speed),
      });
    }, 100);
    return () => clearInterval(t);
  }, [track, racers, me, laps, L, minimap, sport, legs, spectator, bendAhead]);
  const countdown = hud.left;

  // Keyboard: arrows or WASD, space to brake (or to ease a horse or camel).
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
      <Canvas dpr={quality.dpr} camera={{ fov: legs ? 58 : 62, near: 0.3, far: 2600, position: [-30, 6, 0] }} gl={{ powerPreference: quality.powerPreference }}>
        <PerfProbe scene={sport === "car" ? "Autodrome" : `Racing ${sport}`} />
        <color attach="background" args={[track.def.theme.sky]} />
        <fog attach="fog" args={[track.def.theme.fog, 400, Math.max(1600, track.radius * 3.5)]} />
        <hemisphereLight args={["#ffffff", "#c2a37a", 0.8]} />
        <directionalLight position={[300, 400, -200]} intensity={1.5} />
        <Suspense fallback={null}>
          <Circuit track={track} />
          <Racers track={track} racers={racers} me={me} mine={mine} remotes={remotes} startsAtRef={startsAtRef} sport={sport} spectator={spectator} devProbe={devBots} />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-start justify-between pointer-events-none">
        <div className="rounded-2xl bg-slate-950/75 text-white px-3 py-2 space-y-0.5">
          {spectator
            ? <p className="text-sm font-black leading-none">👀 Watching</p>
            : <p className="text-2xl font-black leading-none">P{hud.pos}<span className="text-sm text-white/60">/{hud.count}</span></p>}
          <p className="text-xs font-bold text-white/80">{laps > 1 ? `Lap ${hud.lap}/${laps} · ` : ""}{track.def.name}</p>
          <p className="text-xs font-mono text-white/80">{lapTime(hud.time)}</p>
          {legs && !spectator && <p className="text-[11px] font-bold text-white/70">{hud.togo} m to go</p>}
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
            <p className="text-8xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">{countdown > 5 ? (legs ? sportDef(sport)?.icon : "🏁") : countdown}</p>
            <p className="mt-2 text-white font-black drop-shadow">{spectator ? "The race is about to start" : legs ? "In the stalls. Save your push for the finish!" : "Hold the gas to rev it"}</p>
          </div>
        </div>
      )}
      {countdown <= 0 && countdown > -1 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-6xl font-black text-emerald-400 drop-shadow-lg text-center">{legs ? "And they're off!" : "GO!"}</p></div>}
      {/* The bend ahead, and a warning when you're too fast for it. */}
      {hud.bend && countdown <= 0 && hud.done === null && (
        <div className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+7rem)] inset-x-0 flex justify-center pointer-events-none">
          <div className={`rounded-2xl px-3 py-1.5 flex items-center gap-2 font-black text-sm ${hud.bend.brake ? "bg-rose-600 text-white animate-pulse" : "bg-slate-950/70 text-white"}`}>
            <span className="text-xl leading-none">{hud.bend.dir === "left" ? (hud.bend.tight ? "⤺" : "↰") : (hud.bend.tight ? "⤻" : "↱")}</span>
            <span>{hud.bend.brake ? "BRAKE!" : hud.bend.tight ? "Tight bend" : "Bend"}</span>
          </div>
        </div>
      )}
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

      {/* Riding a horse or a camel: steer across the track, and push (or ease) it; its stamina is the bar. */}
      {!spectator && legs && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 flex items-end justify-between gap-2">
          <div className="flex gap-2">
            <Hold k="steer" v={-1} set={setInput} label="Left" className="w-16 h-20 rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 text-white text-2xl font-black active:bg-white/40">◀</Hold>
            <Hold k="steer" v={1} set={setInput} label="Right" className="w-16 h-20 rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 text-white text-2xl font-black active:bg-white/40">▶</Hold>
          </div>
          <div className="pointer-events-none rounded-2xl bg-slate-950/75 text-white px-3 py-2 text-center mb-1 min-w-[6.5rem]">
            <p className="text-2xl font-black tabular-nums leading-none">{hud.speed}<span className="text-[10px] text-white/60"> km/h</span></p>
            <div className="mt-1.5 h-2.5 rounded-full bg-white/15 overflow-hidden">
              <div className={`h-full rounded-full ${hud.tired ? "bg-rose-500" : hud.stamina < 0.3 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.round(hud.stamina * 100)}%` }} />
            </div>
            <p className={`text-[10px] font-black mt-0.5 ${hud.tired ? "text-rose-300" : "text-white/60"}`}>{hud.tired ? "TIRED · let it breathe" : hud.draft ? "STAMINA · slipstream 💨" : "STAMINA"}</p>
          </div>
          <div className="flex gap-2 items-end">
            <Hold k="brake" v={1} set={setInput} label="Ease" className="w-16 h-20 rounded-2xl bg-sky-500/90 text-white font-black text-sm active:bg-sky-500">EASE</Hold>
            <Hold k="throttle" v={1} set={setInput} label="Push" className="w-20 h-24 rounded-2xl bg-emerald-500/90 text-white font-black active:bg-emerald-500">{sport === "horse" ? "PUSH 🏇" : "PUSH 🐪"}</Hold>
          </div>
        </div>
      )}

      {/* The speedo, and the controls on a phone. */}
      {!spectator && !legs && <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 flex items-end justify-between">
        {/* A car: a real wheel (turn it with your thumb; how far you turn it is how hard you steer, and it centres
            itself). A bike: left and right buttons to lean it over. */}
        {sport === "bike" ? (
          <div className="flex gap-2">
            <Hold k="steer" v={-1} set={setInput} label="Left" className="w-16 h-20 rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 text-white text-3xl font-black active:bg-white/45">◀</Hold>
            <Hold k="steer" v={1} set={setInput} label="Right" className="w-16 h-20 rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 text-white text-3xl font-black active:bg-white/45">▶</Hold>
          </div>
        ) : (
          <SteeringWheel size={132} className="bg-white/25 backdrop-blur-sm ring-1 ring-white/40" onSteer={onSteer} />
        )}
        <div className="pointer-events-none rounded-2xl bg-slate-950/75 text-white px-4 py-2 text-center mb-1">
          <p className="text-3xl font-black tabular-nums leading-none">{hud.speed}</p>
          <p className="text-[10px] font-bold text-white/60">KM/H · GEAR {hud.gear}</p>
        </div>
        <div className="flex gap-2 items-end">
          <Hold k="brake" v={1} set={setInput} label="Brake" className="w-16 h-20 rounded-2xl bg-rose-500/90 text-white font-black text-sm active:bg-rose-500">BRAKE</Hold>
          <Hold k="throttle" v={1} set={setInput} label="Gas" className="w-20 h-24 rounded-2xl bg-emerald-500/90 text-white font-black active:bg-emerald-500">{sport === "bike" ? "THROTTLE" : "GAS"}</Hold>
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
function NameTag({ name, y = 2.7 }: { name: string; y?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(2,6,23,0.8)";
    g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill();
    g.fillStyle = "#ffffff"; g.font = "900 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(`@${name}`.slice(0, 16), 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [name]);
  // Hidden when it's right by the camera (a runner alongside), so it never fills the screen.
  const ref = useRef<THREE.Sprite>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => { const s = ref.current; if (s) s.visible = s.getWorldPosition(v).distanceTo(camera.position) > 9; });
  return <sprite ref={ref} position={[0, y, 0]} scale={[3.2, 0.8, 1]}><spriteMaterial map={tex} depthWrite={false} transparent /></sprite>;
}
