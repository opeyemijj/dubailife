"use client";

// The race itself: everyone on the start line on Financial Centre Road, the countdown, then the course
// past Burj Khalifa, Sheikh Zayed Road, the Dubai Frame, the Museum of the Future and DIFC and back to
// The Dubai Mall. You control the run: a stick steers across the road and sets your pace (walk to run), and
// SPRINT goes flat out while your stamina lasts; run out and you hit the wall until you've recovered. Water
// stations refill you, crowd boosts on the road speed you up, cones and puddles trip you, and running close
// behind someone saves energy. Everyone else is shown where their last saved progress puts them, moving on at
// race pace in between. Locals jog along for company (mind them, they're in the way) but aren't in the race.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm } from "@/components/home/RunJourney";
import { doorThud, footstep, nolTap, salikBeep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { MARATHON, raceClock, reportProgress, serverNow, shownKm, type Overview } from "@/lib/marathon";
import { gameAudio } from "@/utils/gameAudio";

const COURSE = MARATHON.courseMetres;
const ROAD_W = 16;
const laneOf = (bib: number) => ((bib * 37) % 13) - 6; // spread across the road
const rand = (i: number, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const { pace: PACE, stamina: STAMINA, course: C } = MARATHON;
const LANE_LIMIT = ROAD_W / 2 - 1;

/** What's on the road: the same for everyone, so it's a fair race. */
interface Item { id: string; kind: "water" | "boost" | "cone" | "puddle"; at: number; z: number; half: number }
const ITEMS: Item[] = (() => {
  const out: Item[] = [];
  for (let at = C.waterFrom, i = 0; at < COURSE; at += C.waterEvery, i++) for (const side of [-1, 1]) out.push({ id: `w${i}${side}`, kind: "water", at, z: side * (LANE_LIMIT - 0.6), half: 1.5 });
  for (let at = C.boostFrom, i = 0; at < COURSE; at += C.boostEvery, i++) out.push({ id: `b${i}`, kind: "boost", at, z: (rand(i, 21) - 0.5) * 10, half: 1.5 });
  for (let at = C.obstacleFrom, i = 0; at < COURSE - 60; at += C.obstacleEvery, i++) {
    if (C.waterEvery && Math.abs(((at - C.waterFrom) % C.waterEvery)) < 12) continue;
    out.push({ id: `o${i}`, kind: i % 3 === 2 ? "puddle" : "cone", at, z: (rand(i, 33) - 0.5) * 12, half: i % 3 === 2 ? 1.5 : 0.8 });
  }
  return out;
})();
const localPace = (i: number) => 5.2 + rand(i, 9) * 2.2;
const localLane = (i: number) => ((i * 5) % 13) - 6.5;

// ---------------------------------------------------------------- the course

function signTexture(text: string, sub: string) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#064e3b"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#facc15"; g.fillRect(0, 226, 1024, 30);
  g.fillStyle = "#ffffff"; g.font = "900 96px sans-serif"; g.textAlign = "center"; g.fillText(text, 512, 120);
  g.font = "700 48px sans-serif"; g.fillStyle = "#a7f3d0"; g.fillText(sub, 512, 196);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Gantry({ at, name, sub }: { at: number; name: string; sub: string }) {
  const tex = useMemo(() => signTexture(name, sub), [name, sub]);
  return (
    <group position={[at, 0, 0]}>
      {[-ROAD_W / 2 - 0.5, ROAD_W / 2 + 0.5].map((z) => <mesh key={z} position={[0, 3.5, z]}><boxGeometry args={[0.4, 7, 0.4]} /><meshStandardMaterial color="#e5e7eb" metalness={0.6} roughness={0.3} /></mesh>)}
      <mesh position={[0, 6.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[ROAD_W, 4]} /><meshStandardMaterial map={tex} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.3} /></mesh>
    </group>
  );
}

function Tower({ x, z, h, w = 14, color = "#cbd5e1" }: { x: number; z: number; h: number; w?: number; color?: string }) {
  const tiers = 5;
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: tiers }, (_, i) => (
        <mesh key={i} position={[0, (h / tiers) * (i + 0.5), 0]} castShadow><boxGeometry args={[w * (1 - i * 0.16), h / tiers, w * (1 - i * 0.16)]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.25} /></mesh>
      ))}
      <mesh position={[0, h + h * 0.12, 0]}><cylinderGeometry args={[0.3, 0.8, h * 0.25, 8]} /><meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} /></mesh>
    </group>
  );
}

/** The course near you: road, barriers, crowds, palms and towers in 100 m pieces, only those in view. */
function Course({ chunk, night }: { chunk: number; night: boolean }) {
  const chunks = [chunk - 1, chunk, chunk + 1, chunk + 2, chunk + 3].filter((c) => c >= -1 && c * 100 < COURSE + 200);
  return (
    <group>
      {chunks.map((c) => (
        <group key={c} position={[c * 100, 0, 0]}>
          <mesh position={[50, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, ROAD_W]} /><meshStandardMaterial color="#3f3f46" roughness={0.9} /></mesh>
          {[-ROAD_W / 2 + 0.3, ROAD_W / 2 - 0.3].map((z) => <mesh key={z} position={[50, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 0.25]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
          {/* the blue racing line down the middle */}
          <mesh position={[50, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 0.35]} /><meshStandardMaterial color="#0ea5e9" /></mesh>
          {/* pavements, barriers with sponsor boards, and cheering crowds */}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[50, 0.05, side * (ROAD_W / 2 + 4)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 8]} /><meshStandardMaterial color="#d6cdb8" /></mesh>
              <mesh position={[50, 0.55, side * (ROAD_W / 2 + 0.4)]}><boxGeometry args={[100, 1, 0.12]} /><meshStandardMaterial color={c % 2 ? "#059669" : "#f8fafc"} /></mesh>
              {Array.from({ length: 14 }, (_, i) => (
                <mesh key={i} position={[i * 7 + rand(c * 31 + i, side) * 4, 0.85, side * (ROAD_W / 2 + 1.4 + rand(c + i, side + 2) * 2)]}>
                  <capsuleGeometry args={[0.25, 0.9, 4, 8]} /><meshStandardMaterial color={["#f43f5e", "#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#f8fafc"][(c + i) % 6]} />
                </mesh>
              ))}
              {[10, 45, 80].map((x) => <StreetPalm key={x} x={x} z={side * (ROAD_W / 2 + 6)} h={7} />)}
              {[0, 50].map((x) => <Lamp key={x} x={x} z={side * (ROAD_W / 2 + 5)} night={night} />)}
              <Building x={50} z={side * (ROAD_W / 2 + 22)} w={26} d={16} h={30 + rand(c, side) * 60} color={["#e2e8f0", "#cbd5e1", "#f1f5f9", "#dbeafe"][(c + (side > 0 ? 1 : 0)) % 4]} facing={side > 0 ? -1 : 1} night={night} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Landmarks() {
  return (
    <group>
      {MARATHON.landmarks.map((l) => <Gantry key={l.at} at={Math.min(l.at, COURSE)} name={l.name.toUpperCase()} sub={`${shownKm(l.at)} km`} />)}
      {/* Burj Khalifa over the first stretch, the Frame and the Museum further on */}
      <Tower x={700} z={-120} h={420} w={30} color="#dbe4ee" />
      <group position={[2300, 0, 90]}>
        {[-20, 20].map((z) => <mesh key={z} position={[0, 75, z]}><boxGeometry args={[12, 150, 8]} /><meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.25} /></mesh>)}
        <mesh position={[0, 146, 0]}><boxGeometry args={[12, 8, 48]} /><meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.25} /></mesh>
      </group>
      <mesh position={[3100, 40, -90]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[38, 16, 16, 40]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} /></mesh>
      {/* start and finish arches */}
      {[0, COURSE].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, ROAD_W]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- runners

function Tag({ text, kind }: { text: string; kind: "me" | "player" | "local" }) {
  return (
    // A fixed small size wherever the runner is, so someone beside the camera doesn't fill the screen.
    <Html position={[0, 2.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-black shadow opacity-90 ${kind === "me" ? "bg-emerald-500 text-white" : kind === "local" ? "bg-amber-400 text-slate-900" : "bg-sky-500 text-white"}`}>{text}</div>
    </Html>
  );
}

/** Someone else in the race, gliding toward their latest saved distance and on at race pace. */
function Other({ r, live }: { r: { bib: number; username: string; look: AvatarLookProps | null; distance: number; finishMs: number | null }; live: boolean }) {
  const g = useRef<THREE.Group>(null);
  const shown = useRef(r.distance);
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = r.finishMs ? COURSE : r.distance + (live ? PACE.run : 0);
    shown.current += Math.max(0, Math.min((target - shown.current) * Math.min(1, dt * 1.5), MARATHON.maxSpeed * dt));
    g.current.position.set(Math.min(COURSE + 6, shown.current), 0, laneOf(r.bib));
  });
  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group rotation={[0.15, 0, 0]}><Suspense fallback={null}><CitizenAvatar look={r.look ?? { gender: "man" }} animation={live && !r.finishMs ? "run" : "idle"} /></Suspense></group>
      <Tag text={`#${r.bib} @${r.username}`} kind="player" />
    </group>
  );
}

function LocalRunner({ i, startMs, live }: { i: number; startMs: number; live: boolean }) {
  const local = LOCALS[(i * 7) % LOCALS.length];
  const pace = localPace(i);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const t = live ? (serverNow() - startMs) / 1000 : 0;
    g.current.position.set(Math.min(COURSE + 6, Math.max(0, t) * pace), 0, localLane(i));
  });
  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group rotation={[0.15, 0, 0]}><Suspense fallback={null}><CitizenAvatar look={local.look} animation={live ? "run" : "idle"} /></Suspense></group>
      <Tag text={`${local.name} · Local`} kind="local" />
    </group>
  );
}

// ---------------------------------------------------------------- on the road

function RoadItem({ item, takenRef }: { item: Item; takenRef: React.RefObject<Set<string>> }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.visible = !takenRef.current.has(item.id);
    if (item.kind === "boost") g.current.children[0].rotation.z = clock.elapsedTime * 2;
  });
  return (
    <group ref={g} position={[item.at, 0, item.z]}>
      {item.kind === "water" && (
        <>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.4, 1, 2.6]} /><meshStandardMaterial color="#0ea5e9" /></mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((z) => <mesh key={z} position={[0, 1.12, z]}><cylinderGeometry args={[0.12, 0.09, 0.24, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
        </>
      )}
      {item.kind === "boost" && (
        <>
          <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.6, 0.12, 10, 32]} /><meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5, 3]} /><meshStandardMaterial color="#facc15" transparent opacity={0.55} /></mesh>
        </>
      )}
      {item.kind === "cone" && [-0.5, 0.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.4, 0]}><coneGeometry args={[0.24, 0.8, 12]} /><meshStandardMaterial color="#f97316" /></mesh>
          <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.5, 0.06, 0.5]} /><meshStandardMaterial color="#1f2937" /></mesh>
        </group>
      ))}
      {item.kind === "puddle" && <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1, 1]}><circleGeometry args={[1.4, 24]} /><meshStandardMaterial color="#38bdf8" metalness={0.7} roughness={0.08} transparent opacity={0.8} /></mesh>}
    </group>
  );
}

// ---------------------------------------------------------------- you

/** What the stick and the sprint button are doing (read by the run every frame). */
export interface Controls { x: number; y: number; sprint: boolean }
export interface RunState { speed: number; stamina: number; status: "walk" | "jog" | "run" | "sprint" | "wall" | "stumble"; draft: boolean; boost: boolean }

function Me({ look, bib, live, start, startMs, controlsRef, others, takenRef, onDistance, onChunk, onFinish, onRun, onEvent }: {
  look?: AvatarLookProps; bib: number; live: boolean; start: { s: number; finished: boolean }; startMs: number; controlsRef: React.RefObject<Controls>;
  others: Array<{ distance: number; bib: number }>; takenRef: React.RefObject<Set<string>>;
  onDistance: (s: number) => void; onChunk: (c: number) => void; onFinish: (ms: number | null) => void; onRun: (r: RunState) => void; onEvent: (text: string, good: boolean) => void;
}) {
  const me = useRef({ s: start.s, z: laneOf(bib), v: 0, stamina: 100, wall: false, stumble: 0, boost: 0, bump: 0, stride: 0, finished: start.finished, shake: 0, yaw: 0 });
  const lastShown = useRef(0);
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const look3 = useRef(new THREE.Vector3(10, 1.2, 0));
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  const chunk = useRef(-99);
  const lastSend = useRef(0);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const M = me.current;
    if (!g.current) return;
    const running = live && !M.finished;
    const c = controlsRef.current;
    let status: RunState["status"] = "jog", draft = false;
    if (running) {
      // Pace: the stick up runs, down walks; SPRINT flat out until the stamina's gone, then you've hit the wall.
      const y = c.y;
      let want = y >= 0 ? PACE.jog + (PACE.run - PACE.jog) * y : PACE.jog + (PACE.jog - PACE.walk) * y;
      status = y > 0.3 ? "run" : y < -0.3 ? "walk" : "jog";
      if (M.wall) { if (M.stamina >= STAMINA.wallRecoverAt) M.wall = false; else { want = PACE.walk; status = "wall"; } }
      if (!M.wall && c.sprint && M.stamina > 0) { want = PACE.sprint; status = "sprint"; }
      M.stumble = Math.max(0, M.stumble - dt); M.boost = Math.max(0, M.boost - dt); M.bump = Math.max(0, M.bump - dt);
      if (M.stumble > 0) { want = PACE.walk * 0.6; status = "stumble"; }
      else if (M.boost > 0) want += C.boostSpeed;
      M.v += (Math.min(want, MARATHON.maxSpeed) - M.v) * Math.min(1, dt * (want < M.v ? 3 : 1.6));
      // Close behind someone? Less wind, less effort.
      draft = others.some((o) => o.distance - M.s > 0.8 && o.distance - M.s < 4 && Math.abs(laneOf(o.bib) - M.z) < 1.3);
      const t = (serverNow() - startMs) / 1000;
      for (let i = 0; i < 8 && !draft; i++) { const d = t * localPace(i) - M.s; if (d > 0.8 && d < 4 && Math.abs(localLane(i) - M.z) < 1.3) draft = true; }
      const rate = status === "sprint" ? -STAMINA.sprintDrain : status === "run" ? -STAMINA.runDrain : status === "jog" ? STAMINA.jogGain : STAMINA.walkGain;
      M.stamina = Math.max(0, Math.min(100, M.stamina + (rate < 0 && draft ? rate * STAMINA.draftSaving : rate) * dt));
      if (M.stamina <= 0 && !M.wall) { M.wall = true; onEvent("🥵 You hit the wall! Walk it off.", false); }
      // Steering: you can only change line while you're moving.
      const lat = c.x * Math.min(4, 1 + M.v * 0.4);
      M.z = Math.max(-LANE_LIMIT, Math.min(LANE_LIMIT, M.z + lat * dt));
      M.yaw += (-c.x * 0.45 - M.yaw) * Math.min(1, dt * 8);
      M.s = Math.min(COURSE, M.s + M.v * dt);
      const before = Math.floor(M.stride);
      M.stride += dt * (1.4 + M.v * 0.2);
      if (Math.floor(M.stride) !== before) footstep("pavement", Math.min(1, M.v / 10));
      // What's on the road where you are.
      for (const it of ITEMS) {
        if (Math.abs(it.at - M.s) > 1.3 || takenRef.current.has(it.id) || Math.abs(it.z - M.z) > it.half) continue;
        takenRef.current.add(it.id);
        if (it.kind === "water") { M.stamina = Math.min(100, M.stamina + C.waterStamina); nolTap(); onEvent(`💧 Water! +${C.waterStamina} stamina`, true); }
        else if (it.kind === "boost") { M.boost = C.boostSeconds; salikBeep(); onEvent("⚡ The crowd lifts you!", true); }
        else { M.stumble = C.stumbleSeconds; M.shake = 1; doorThud(); onEvent(it.kind === "cone" ? "🚧 You clipped a cone!" : "💦 Slipped in a puddle!", false); }
      }
      // Run into a Local and you both lose your stride.
      if (M.bump <= 0) for (let i = 0; i < 8; i++) {
        if (Math.abs(t * localPace(i) - M.s) < 0.9 && Math.abs(localLane(i) - M.z) < 0.7) { M.bump = 2.5; M.v *= 0.55; M.shake = 0.6; doorThud(); onEvent("Oof! Mind the runners.", false); break; }
      }
      // Save progress every couple of seconds; the server's cap is the truth.
      if (performance.now() - lastSend.current > 2000 || M.s >= COURSE) {
        lastSend.current = performance.now();
        const sent = M.s;
        void reportProgress(sent).then((r) => {
          if (!r) return;
          if (r.distance < sent - 30) M.s = r.distance;
          if (r.finishMs && !M.finished) { M.finished = true; onFinish(r.finishMs); }
        });
      }
    }
    const want: AvatarAnimation = M.finished ? "clap" : running ? (M.v < PACE.walk + 0.5 ? "walk" : "run") : "idle";
    if (want !== anim) setAnim(want);
    g.current.position.set(M.s, 0, M.z);
    if (body.current) {
      body.current.position.y = running ? Math.abs(Math.sin(M.stride * Math.PI)) * 0.04 : 0;
      body.current.rotation.x += ((running ? Math.min(0.25, M.v * 0.02) : 0) - body.current.rotation.x) * Math.min(1, dt * 6);
      body.current.rotation.y = M.yaw;
    }
    if (performance.now() - lastShown.current > 150) {
      lastShown.current = performance.now();
      onDistance(M.s);
      onRun({ speed: M.v, stamina: M.stamina, status, draft, boost: M.boost > 0 });
    }
    const ch = Math.floor(M.s / 100);
    if (ch !== chunk.current) { chunk.current = ch; onChunk(ch); }
    // Behind you, swinging with your line and pulling back as you speed up.
    M.shake = Math.max(0, M.shake - dt * 2);
    const j = M.shake ? (Math.random() - 0.5) * M.shake * 0.25 : 0;
    camera.position.lerp(new THREE.Vector3(M.s - 5 - M.v * 0.12, 2.7 + j, M.z * 0.82 + j), Math.min(1, dt * 4));
    look3.current.lerp(new THREE.Vector3(M.s + 8, 1.2, M.z * 0.9 + c.x * 1.5), Math.min(1, dt * 5));
    camera.lookAt(look3.current);
  });

  return (
    <group ref={g} rotation={[0, Math.PI / 2, 0]}>
      <group ref={body}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
      <Tag text={`#${bib} You`} kind="me" />
    </group>
  );
}

/** The stick: drag sideways to steer, up to run, down to walk. It springs back when you let go. */
function Stick({ controlsRef }: { controlsRef: React.RefObject<Controls> }) {
  const knob = useRef<HTMLSpanElement>(null);
  const R = 52;
  const set = (x: number, y: number) => {
    controlsRef.current.x = x; controlsRef.current.y = y;
    if (knob.current) knob.current.style.transform = `translate(${x * R}px, ${-y * R}px)`;
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (b.left + b.width / 2)) / R, dy = -(e.clientY - (b.top + b.height / 2)) / R;
    const l = Math.hypot(dx, dy), k = l > 1 ? 1 / l : 1;
    set(dx * k, dy * k);
  };
  return (
    <div aria-label="Steer and set your pace" className="relative w-36 h-36 rounded-full bg-white/25 backdrop-blur-sm ring-2 ring-white/50 touch-none select-none flex items-center justify-center"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") move(e); }}
      onPointerUp={() => set(0, 0)} onPointerCancel={() => set(0, 0)}>
      <span className="absolute top-1.5 text-[10px] font-black text-white">RUN</span>
      <span className="absolute bottom-1.5 text-[10px] font-black text-white">WALK</span>
      <span className="absolute left-2 text-white font-black">‹</span>
      <span className="absolute right-2 text-white font-black">›</span>
      <span ref={knob} className="w-14 h-14 rounded-full bg-white shadow-xl pointer-events-none" />
    </div>
  );
}

// ---------------------------------------------------------------- the race screen

export function MarathonRace({ o, myId, look, onExit, onFinished }: { o: Overview; myId: string; look?: AvatarLookProps; onExit: () => void; onFinished: (ms: number, place: number) => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const startMs = Date.parse(o.race);
  const mine = o.me!;
  const [start] = useState(() => ({ s: Number(mine.distance), finished: !!mine.finishMs }));
  const [myS, setMyS] = useState(start.s);
  const controls = useRef<Controls>({ x: 0, y: 0, sprint: false });
  const taken = useRef(new Set<string>());
  const [run, setRun] = useState<RunState>({ speed: 0, stamina: 100, status: "jog", draft: false, boost: false });
  const [event, setEvent] = useState<{ text: string; good: boolean } | null>(null);
  const [chunk, setChunk] = useState(0);
  const [clock, setClock] = useState(() => serverNow());
  const [finish, setFinish] = useState<number | null>(mine.finishMs);

  useEffect(() => { const t = setInterval(() => setClock(serverNow()), 200); return () => clearInterval(t); }, []);
  const live = clock >= startMs;
  const countdown = Math.ceil((startMs - clock) / 1000);

  // The countdown's last three seconds, then the gun.
  const beeped = useRef(99);
  useEffect(() => {
    if (countdown <= 3 && countdown < beeped.current && countdown > 0) { beeped.current = countdown; salikBeep(); }
    if (countdown <= 0 && beeped.current > 0 && beeped.current !== 99) { beeped.current = 0; doorThud(); }
  }, [countdown]);
  useEffect(() => { if (!event) return; const t = setTimeout(() => setEvent(null), 1800); return () => clearTimeout(t); }, [event]);
  // Keyboard: arrows or WASD for the stick, Shift or Space to sprint.
  useEffect(() => {
    const k = (e: KeyboardEvent, on: boolean) => {
      const c = controls.current, key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") c.x = on ? -1 : c.x < 0 ? 0 : c.x;
      else if (key === "arrowright" || key === "d") c.x = on ? 1 : c.x > 0 ? 0 : c.x;
      else if (key === "arrowup" || key === "w") c.y = on ? 1 : c.y > 0 ? 0 : c.y;
      else if (key === "arrowdown" || key === "s") c.y = on ? -1 : c.y < 0 ? 0 : c.y;
      else if (key === "shift" || key === " ") c.sprint = on;
      else return;
      e.preventDefault();
    };
    const d = (e: KeyboardEvent) => k(e, true), u = (e: KeyboardEvent) => k(e, false);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  // Position: finishers by time, then everyone else by distance (you included, at your live distance).
  const others = o.runners.filter((r) => r.id !== myId);
  const place = finish
    ? 1 + others.filter((r) => r.finishMs !== null && r.finishMs < finish).length
    : 1 + others.filter((r) => r.finishMs !== null || r.distance > myS).length;
  const next = MARATHON.landmarks.find((l) => l.at > myS);

  return (
    <div className="fixed inset-0 z-[180] bg-black select-none">
      <Canvas shadows={quality.shadows ? { type: THREE.PCFShadowMap } : false} dpr={quality.dpr} camera={{ position: [-5, 2.6, 0], fov: 60, far: 1500 }}>
        <SkyAndLight sky={sky} />
        <ambientLight intensity={night ? 0.9 : 0.3} color={night ? "#c7d2fe" : "#ffffff"} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE / 2, -0.02, 0]}><planeGeometry args={[COURSE + 800, 600]} /><meshStandardMaterial color="#cdbf9f" roughness={1} /></mesh>
        <Course chunk={chunk} night={night} />
        <Landmarks />
        {others.map((r) => <Other key={r.id} r={r} live={live} />)}
        {Array.from({ length: 8 }, (_, i) => <LocalRunner key={i} i={i} startMs={startMs} live={live} />)}
        {ITEMS.filter((it) => it.at > (chunk - 1) * 100 && it.at < (chunk + 4) * 100).map((it) => <RoadItem key={it.id} item={it} takenRef={taken} />)}
        <Me look={look} bib={mine.bib} live={live} start={start} startMs={startMs} controlsRef={controls} others={others} takenRef={taken} onDistance={setMyS} onChunk={setChunk}
          onRun={setRun} onEvent={(text, good) => setEvent({ text, good })}
          onFinish={(ms) => { gameAudio.playCoinSound(); setFinish(ms); if (ms) onFinished(ms, place); }} />
        <pointLight position={[myS, 6, 0]} intensity={night ? 60 : 10} distance={30} color="#ffe2b0" />
      </Canvas>

      {/* Race card: distance, time, place and the next landmark */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[24px] shadow-xl px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">🏅 {MARATHON.name}</p>
              <p className="text-xs text-slate-500 truncate">{live ? (next ? `Next: ${next.icon} ${next.name}` : "Final straight!") : "On the start line"}</p>
            </div>
            <div className="text-right tabular-nums">
              <p className="font-black text-lg leading-none">{shownKm(myS)}<span className="text-xs text-slate-500"> / {shownKm(COURSE)} km</span></p>
              <p className="text-xs text-slate-500">{live ? raceClock(finish ?? clock - startMs) : "--:--"} · {place}{["th", "st", "nd", "rd"][place % 10 > 3 || Math.floor(place / 10) % 10 === 1 ? 0 : place % 10]} of {others.length + 1}</p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(myS / COURSE) * 100}%` }} /></div>
        </div>
      </div>

      {!live && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            <p className="text-xl font-black">Starting in</p>
            <p className="text-8xl font-black tabular-nums">{countdown > 60 ? raceClock(countdown * 1000) : countdown}</p>
            <p className="font-semibold">Stick: steer and set your pace · SPRINT while your stamina lasts</p>
          </div>
        </div>
      )}

      {live && !finish && (
        <>
          {/* Stamina, pace and what you're doing */}
          <div className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+6rem)] inset-x-3 pointer-events-none">
            <div className="max-w-md mx-auto bg-slate-950/70 backdrop-blur-sm text-white rounded-2xl px-3 py-2 flex items-center gap-3">
              <span className="text-xl font-black tabular-nums leading-none">{(run.speed * 1.5).toFixed(1)}<span className="text-[10px] font-bold text-white/60"> km/h</span></span>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-black">
                  <span>{{ walk: "🚶 WALKING", jog: "🏃 JOGGING", run: "🏃 RUNNING", sprint: "⚡ SPRINT", wall: "🥵 THE WALL", stumble: "😵 STUMBLE" }[run.status]}{run.boost ? " · BOOST" : ""}{run.draft ? " · DRAFTING" : ""}</span>
                  <span className="tabular-nums">{Math.round(run.stamina)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/20 overflow-hidden"><div className={`h-full rounded-full ${run.stamina < 25 ? "bg-rose-500" : run.stamina < 55 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${run.stamina}%` }} /></div>
              </div>
            </div>
            {event && <p className={`mx-auto mt-2 w-fit rounded-full px-4 py-1.5 text-sm font-black shadow-xl ${event.good ? "bg-emerald-500 text-white" : "bg-rose-600 text-white"}`}>{event.text}</p>}
          </div>
          <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] flex items-end justify-between">
            <Stick controlsRef={controls} />
            <div className="flex flex-col items-end gap-3">
              <button onClick={onExit} className="h-10 px-4 rounded-full bg-white/85 text-sm font-bold text-slate-700">Leave</button>
              <button aria-label="Sprint" onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.preventDefault(); controls.current.sprint = true; }} onPointerUp={() => { controls.current.sprint = false; }} onPointerLeave={() => { controls.current.sprint = false; }} onPointerCancel={() => { controls.current.sprint = false; }}
                className={`w-28 h-28 rounded-full text-white text-xl font-black touch-none select-none shadow-[inset_0_-6px_0_rgba(0,0,0,0.25)] active:scale-95 ${run.status === "wall" ? "bg-slate-600" : "bg-emerald-600"}`}>SPRINT</button>
            </div>
          </div>
        </>
      )}

      {finish && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-[28px] shadow-2xl p-5 space-y-3 text-center animate-[sheetUp_0.25s_ease-out]">
            <div className="text-5xl">{place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] : "🏅"}</div>
            <p className="text-2xl font-black">You finished {place}{["th", "st", "nd", "rd"][place % 10 > 3 || Math.floor(place / 10) % 10 === 1 ? 0 : place % 10]}!</p>
            <p className="text-slate-500">{shownKm(COURSE)} km in {raceClock(finish)}{place <= 3 ? ` · AED ${MARATHON.prizes[place - 1].toLocaleString()} prize after the race` : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={async () => {
                const text = `I ran the ${MARATHON.name} in ${raceClock(finish)} and finished ${place}! Run with me next Friday 🏃`;
                const url = `${window.location.origin}/marathon`;
                if (navigator.share) { try { await navigator.share({ title: MARATHON.name, text, url }); } catch { /* cancelled */ } }
                else { try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ } }
              }} className="h-14 rounded-full bg-slate-100 font-semibold">Share</button>
              <button onClick={onExit} className="h-14 rounded-full bg-emerald-700 text-white font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
