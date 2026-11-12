"use client";

// Smart Yard (Driving Academy stage 3) — Upgraded to full 3D!
// Steer a 3D RTA learner car into the glowing green parking bay without touching 3D traffic cones,
// boundary curbs, or parked cars, then stop straight inside the bay.
// Two tasks: Task 1 (90° bay parking) and Task 2 (Parallel parking).
// Driven with the touch SteeringWheel, GAS, and BRAKE (hold when stopped to reverse) or arrow keys.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "@/components/cars/CarModel";
import { SteeringWheel } from "@/components/cars/SteeringWheel";
import { sensorBeep } from "@/components/transit/transitAudio";
import { CARS } from "@/lib/cars";
import { canvasQuality } from "@/lib/device";
import { PerfProbe } from "@/components/perf/PerfProbe";

const W = 340, H = 440, CAR_W = 22, CAR_L = 40, WHEELBASE = 30;
// 10 canvas units = 1 metre in 3D so CAR_L (40) = 4.0m and CAR_W (22) = 2.2m
const SCALE = 0.1;
const to3D = (x: number, y: number): [number, number] => [(x - W / 2) * SCALE, (y - H / 2) * SCALE];

type Rect = { x: number; y: number; w: number; h: number };
interface Task {
  name: string;
  start: { x: number; y: number; a: number };
  bay: Rect;
  bayAngle: number;
  cones: Array<[number, number]>;
  parked: Rect[];
}

const TASKS: Task[] = [
  {
    name: "90° bay parking",
    start: { x: 80, y: 380, a: 0 },
    bay: { x: 230, y: 70, w: 44, h: 62 },
    bayAngle: 0,
    cones: [[226, 66], [278, 66], [226, 136], [278, 136]],
    parked: [{ x: 172, y: 70, w: 44, h: 62 }, { x: 286, y: 70, w: 44, h: 62 }],
  },
  {
    name: "Parallel parking",
    start: { x: 160, y: 400, a: 0 },
    bay: { x: 276, y: 150, w: 40, h: 78 },
    bayAngle: 0,
    cones: [[272, 146], [320, 146], [272, 232], [320, 232]],
    parked: [{ x: 276, y: 60, w: 40, h: 76 }, { x: 276, y: 242, w: 40, h: 76 }],
  },
];

const corners = (x: number, y: number, a: number): Array<[number, number]> => {
  const s = Math.sin(a), c = Math.cos(a), hw = CAR_W / 2, hl = CAR_L / 2;
  return [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([dx, dy]) => [x + dx * c - dy * s, y + dx * s + dy * c]);
};
const inRect = ([px, py]: [number, number], r: Rect, pad = 0) =>
  px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;

function Cone3D({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
        <meshStandardMaterial color="#ea580c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.17, 0.7, 16]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.14, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function YardScene({
  task,
  carRef,
  camMode,
}: {
  task: Task;
  carRef: React.RefObject<{ x: number; y: number; a: number; v: number; braking: boolean; inside: boolean }>;
  camMode: "chase" | "overhead";
}) {
  const playerGroup = useRef<THREE.Group>(null);
  const bayMat = useRef<THREE.MeshStandardMaterial>(null);
  const learnerCar = useMemo(() => ({ ...CARS.cars[0], color: "#0ea5e9", model3d: "compact" }), []);
  const parkedCarA = useMemo(() => ({ ...CARS.cars[1], color: "#64748b", model3d: "sedan" }), []);
  const parkedCarB = useMemo(() => ({ ...CARS.cars[2], color: "#475569", model3d: "suv" }), []);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const c = carRef.current;
    if (!c || !playerGroup.current) return;
    const [wx, wz] = to3D(c.x, c.y);
    // In 2D: a=0 faces -y (-Z in 3D). CarModel faces +Z at rotY=0, so rotY = Math.PI - c.a
    const rotY = Math.PI - c.a;
    playerGroup.current.position.set(wx, 0, wz);
    playerGroup.current.rotation.set(0, rotY, 0);

    if (bayMat.current) {
      bayMat.current.color.set(c.inside ? "#4ade80" : "#22c55e");
      bayMat.current.emissiveIntensity = c.inside ? 0.9 : 0.35;
    }

    if (camMode === "overhead") {
      camera.position.lerp(new THREE.Vector3(0, 42, 6), Math.min(1, dt * 5));
      camera.lookAt(0, 0, 0);
    } else {
      // Dynamic 3D chase camera behind the car (shifts slightly higher when reversing so you see the bay clearly)
      const rev = c.v < -0.5;
      const dist = rev ? 9.5 : 10.5;
      const height = rev ? 9.2 : 6.8;
      const backX = wx + Math.sin(rotY) * -dist * 0.45;
      const backZ = wz + Math.cos(rotY) * -dist * 0.45 + 6.5;
      camera.position.lerp(new THREE.Vector3(backX, height, backZ), Math.min(1, dt * 4.5));
      const [bx, bz] = to3D(task.bay.x + task.bay.w / 2, task.bay.y + task.bay.h / 2);
      camera.lookAt((wx * 2 + bx) / 3, 0.6, (wz * 2 + bz) / 3);
    }
  });

  const [bayX, bayZ] = to3D(task.bay.x + task.bay.w / 2, task.bay.y + task.bay.h / 2);
  const bayW = task.bay.w * SCALE;
  const bayH = task.bay.h * SCALE;

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <hemisphereLight args={["#e0f2fe", "#334155", 1.25]} />
      <directionalLight position={[12, 24, 14]} intensity={1.6} castShadow />

      {/* Asphalt Yard Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * SCALE, H * SCALE]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* Yard Boundary Curbs */}
      {[
        [0, -H * SCALE * 0.5, W * SCALE + 0.6, 0.35, 0.4],
        [0, H * SCALE * 0.5, W * SCALE + 0.6, 0.35, 0.4],
        [-W * SCALE * 0.5, 0, 0.4, 0.35, H * SCALE],
        [W * SCALE * 0.5, 0, 0.4, 0.35, H * SCALE],
      ].map(([x, z, bw, bh, bd], i) => (
        <mesh key={i} position={[x, bh / 2, z]}>
          <boxGeometry args={[bw, bh, bd]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.5} />
        </mesh>
      ))}

      {/* Center Dashed Road Line */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0, 0.015, (-H * 0.42 + i * 38) * SCALE]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 1.8]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>
      ))}

      {/* Glowing Target Green Bay */}
      <group position={[bayX, 0.02, bayZ]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bayW, bayH]} />
          <meshStandardMaterial
            ref={bayMat}
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.35}
            transparent
            opacity={0.42}
          />
        </mesh>
        {/* Crisp Bay Border */}
        <mesh position={[0, 0.02, -bayH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bayW, 0.16]} />
          <meshBasicMaterial color="#4ade80" />
        </mesh>
        <mesh position={[0, 0.02, bayH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bayW, 0.16]} />
          <meshBasicMaterial color="#4ade80" />
        </mesh>
        <mesh position={[-bayW / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, bayH]} />
          <meshBasicMaterial color="#4ade80" />
        </mesh>
        <mesh position={[bayW / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, bayH]} />
          <meshBasicMaterial color="#4ade80" />
        </mesh>
      </group>

      {/* 3D Orange Cones */}
      {task.cones.map(([cx, cy], idx) => {
        const [x3, z3] = to3D(cx, cy);
        return <Cone3D key={idx} x={x3} z={z3} />;
      })}

      {/* 3D Parked Obstacle Cars */}
      {task.parked.map((p, idx) => {
        const [px, pz] = to3D(p.x + p.w / 2, p.y + p.h / 2);
        return (
          <group key={idx} position={[px, 0, pz]} rotation={[0, Math.PI, 0]}>
            <Suspense fallback={null}>
              <CarModel car={idx % 2 === 0 ? parkedCarA : parkedCarB} plate={`RTA ${idx + 10}`} />
            </Suspense>
          </group>
        );
      })}

      {/* Player's 3D RTA Learner Car */}
      <group ref={playerGroup}>
        <Suspense fallback={null}>
          <CarModel car={learnerCar} plate="LEARNER" />
        </Suspense>
        {/* RTA Roof Learner Sign */}
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[0.55, 0.24, 0.18]} />
          <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </>
  );
}

export function SmartYard({ onDone }: { onDone: (passed: boolean) => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const wheel = useRef(0);
  const [task, setTask] = useState(0);
  const [status, setStatus] = useState<"driving" | "crashed" | "parked" | "timeout">("driving");
  const [secs, setSecs] = useState(90);
  const [run, setRun] = useState(0);
  const [gear, setGear] = useState<{ g: "D" | "R" | "P"; kmh: number }>({ g: "P", kmh: 0 });
  const [sensorDist, setSensorDist] = useState<number>(99);
  const [camMode, setCamMode] = useState<"chase" | "overhead">("chase");

  const carRef = useRef({
    x: TASKS[0].start.x,
    y: TASKS[0].start.y,
    a: TASKS[0].start.a,
    v: 0,
    braking: false,
    inside: false,
  });

  useEffect(() => {
    const t = TASKS[task];
    const car = { ...t.start, v: 0 };
    carRef.current = { ...car, braking: false, inside: false };
    let last = performance.now(),
      parkedFor = 0,
      left = 90,
      raf = 0,
      ended = false,
      beepAt = 0,
      hudAt = 0,
      near = 99,
      steer = 0,
      braking = false;
    const end = (s: typeof status) => {
      if (ended) return;
      ended = true;
      setStatus(s);
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!ended) {
        const k = keys.current;
        braking = false;
        if (k.up) {
          if (car.v < -1) {
            car.v = Math.min(0, car.v + 220 * dt);
            braking = true;
          } else car.v = Math.min(90, car.v + 120 * dt);
        } else if (k.down) {
          if (car.v > 1) {
            car.v = Math.max(0, car.v - 220 * dt);
            braking = true;
          } else car.v = Math.max(-50, car.v - 90 * dt);
        } else car.v *= Math.pow(0.15, dt);
        if (Math.abs(car.v) < 0.5 && !k.up && !k.down) car.v = 0;

        steer = k.left || k.right ? (k.left ? -0.55 : 0) + (k.right ? 0.55 : 0) : wheel.current * 0.55;
        car.a += (car.v / WHEELBASE) * Math.tan(steer) * dt;
        car.x += car.v * Math.sin(car.a) * dt;
        car.y -= car.v * Math.cos(car.a) * dt;

        const cs = corners(car.x, car.y, car.a);
        const box = { x: car.x - CAR_L, y: car.y - CAR_L, w: CAR_L * 2, h: CAR_L * 2 };
        const hitWall = cs.some(([px, py]) => px < 0 || px > W || py < 0 || py > H);
        const hitParked = t.parked.some((p) => cs.some((c) => inRect(c, p, -3)));
        const hitCone = t.cones.some(
          ([cx, cy]) =>
            inRect([cx, cy], box) &&
            (cs.some(([px, py]) => Math.hypot(px - cx, py - cy) < 7) ||
              (() => {
                const s = Math.sin(-car.a),
                  c = Math.cos(-car.a),
                  dx = cx - car.x,
                  dy = cy - car.y;
                const lx = dx * c - dy * s,
                  ly = dx * s + dy * c;
                return Math.abs(lx) < CAR_W / 2 + 5 && Math.abs(ly) < CAR_L / 2 + 5;
              })())
        );
        if (hitWall || hitParked || hitCone) end("crashed");

        near = 99;
        for (const [px, py] of cs) {
          near = Math.min(near, px, W - px, py, H - py);
          for (const [cx, cy] of t.cones) near = Math.min(near, Math.hypot(px - cx, py - cy) - 6);
          for (const p of t.parked) near = Math.min(near, Math.max(p.x - px, px - (p.x + p.w), p.y - py, py - (p.y + p.h), 0));
        }
        if (Math.abs(car.v) > 2 && near < 26 && now - beepAt > Math.max(70, near * 14)) {
          beepAt = now;
          sensorBeep();
        }

        const inside = cs.every((c) => inRect(c, t.bay));
        const angleOff = Math.abs((((car.a - t.bayAngle) % Math.PI) + Math.PI * 1.5) % Math.PI - Math.PI / 2);
        const aligned = inside && angleOff < 0.22;
        if (aligned && Math.abs(car.v) < 4) {
          parkedFor += dt;
          if (parkedFor > 0.8) end("parked");
        } else parkedFor = 0;

        carRef.current = { ...car, braking, inside: aligned };

        if (now - hudAt > 120) {
          hudAt = now;
          setGear({ g: car.v < -0.5 ? "R" : car.v > 0.5 ? "D" : "P", kmh: Math.round(Math.abs(car.v) / 6) });
          setSensorDist(Math.round(near));
        }

        left -= dt;
        if (left <= 0) end("timeout");
        setSecs(Math.max(0, Math.ceil(left)));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const m: Record<string, keyof typeof keys.current> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (m[e.key]) {
        e.preventDefault();
        keys.current[m[e.key]] = down;
      }
    };
    const kd = key(true),
      ku = key(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [task, run]);

  const retry = () => {
    keys.current = { up: false, down: false, left: false, right: false };
    setStatus("driving");
    setRun((r) => r + 1);
  };
  const next = () => {
    if (task + 1 < TASKS.length) {
      setTask(task + 1);
      retry();
    } else onDone(true);
  };
  const pedal = (k: "up" | "down", body: React.ReactNode, cls: string, label: string) => (
    <button
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        keys.current[k] = true;
      }}
      onPointerUp={() => {
        keys.current[k] = false;
      }}
      onPointerLeave={() => {
        keys.current[k] = false;
      }}
      onPointerCancel={() => {
        keys.current[k] = false;
      }}
      className={`rounded-2xl text-white font-black select-none touch-none flex flex-col items-center justify-center leading-tight shadow-[inset_0_-5px_0_rgba(0,0,0,0.3)] active:scale-95 ${cls}`}
    >
      {body}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-black">
        <span>
          Task {task + 1}/{TASKS.length}: {TASKS[task].name}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCamMode((m) => (m === "chase" ? "overhead" : "chase"))}
            className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-sky-300"
          >
            🎥 {camMode === "chase" ? "3D Chase Cam" : "Top-Down Cam"}
          </button>
          <span className={secs <= 15 ? "text-rose-400" : "text-slate-300"}>⏱ {secs}s</span>
        </div>
      </div>

      <div className="relative mx-auto w-full h-[340px] sm:h-[380px] rounded-2xl overflow-hidden border border-white/15 bg-slate-950 shadow-inner">
        <Canvas dpr={quality.dpr} shadows={quality.shadows} camera={{ position: [0, 12, 16], fov: 46 }}>
          <PerfProbe scene="SmartYard" />
          <YardScene task={TASKS[task]} carRef={carRef} camMode={camMode} />
        </Canvas>

        {/* Live Ultrasonic Parking Sensor Bar */}
        {sensorDist < 26 && status === "driving" && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/85 border border-white/15 text-[11px] font-black flex items-center gap-1.5 pointer-events-none">
            <span className={`w-2 h-2 rounded-full animate-ping ${sensorDist < 10 ? "bg-rose-500" : "bg-amber-400"}`} />
            <span className={sensorDist < 10 ? "text-rose-300" : "text-amber-300"}>
              SENSOR: {(sensorDist * 0.1).toFixed(1)}m
            </span>
          </div>
        )}

        {status !== "driving" && (
          <div className="absolute inset-0 rounded-2xl bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center p-4">
            <p className="text-4xl">{status === "parked" ? "✅" : status === "crashed" ? "💥" : "⏰"}</p>
            <p className="font-black text-xl">
              {status === "parked" ? "Perfectly Parked in 3D!" : status === "crashed" ? "You touched an obstacle" : "Out of time"}
            </p>
            {status === "parked" ? (
              <button onClick={next} className="h-12 px-6 rounded-2xl bg-emerald-500 text-slate-950 font-black">
                {task + 1 < TASKS.length ? "Next task ›" : "Finish Smart Yard"}
              </button>
            ) : (
              <button onClick={retry} className="h-12 px-6 rounded-2xl bg-white text-slate-950 font-black">
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Steer into the glowing green bay and come to a full stop. Tap <b>🎥 Cam</b> to switch between 3D Chase and Top-Down views.
      </p>

      <div className="flex items-end gap-3">
        <SteeringWheel
          size={136}
          className="bg-white/10 ring-1 ring-white/15"
          onSteer={(v) => {
            wheel.current = v;
          }}
        />
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black">
            {(["P", "R", "D"] as const).map((g) => (
              <span
                key={g}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  gear.g === g ? (g === "R" ? "bg-white text-slate-900" : "bg-emerald-500 text-slate-950") : "bg-white/10 text-white/40"
                }`}
              >
                {g}
              </span>
            ))}
            <span className="ml-1 tabular-nums text-white/70">{gear.kmh} km/h</span>
          </div>
          <div className="flex items-end gap-2">
            {pedal(
              "down",
              <>
                <span className="text-xs">BRAKE</span>
                <span className="text-[9px] font-bold text-white/80">hold to reverse ↩</span>
              </>,
              `w-[76px] h-16 ${gear.g === "R" ? "bg-slate-700" : "bg-rose-600"}`,
              "Brake, or hold when stopped to reverse"
            )}
            {pedal("up", <span className="text-xs">GAS</span>, "w-[72px] h-24 bg-emerald-600", "Accelerate")}
          </div>
        </div>
      </div>
    </div>
  );
}
