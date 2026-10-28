"use client";

// Smart Yard (Driving Academy stage 3): a top-down parking test. Steer a car into the marked bay without
// touching cones, walls or parked cars, then stop straight inside it. Two tasks: a 90° bay, then a
// parallel bay. Driven like a real car: the steering wheel, GAS, and BRAKE (hold it when stopped to reverse),
// with brake and reverse lights and parking sensors that beep faster as you get close. Arrow keys work too.

import { useEffect, useRef, useState } from "react";
import { SteeringWheel } from "@/components/cars/SteeringWheel";
import { sensorBeep } from "@/components/transit/transitAudio";

const W = 340, H = 440, CAR_W = 22, CAR_L = 40, WHEELBASE = 30;
type Rect = { x: number; y: number; w: number; h: number };
interface Task { name: string; start: { x: number; y: number; a: number }; bay: Rect; bayAngle: number; cones: Array<[number, number]>; parked: Rect[] }

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
const inRect = ([px, py]: [number, number], r: Rect, pad = 0) => px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;

export function SmartYard({ onDone }: { onDone: (passed: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef({ up: false, down: false, left: false, right: false });
  /** The on-screen wheel: -1 full left .. 1 full right. */
  const wheel = useRef(0);
  const [task, setTask] = useState(0);
  const [status, setStatus] = useState<"driving" | "crashed" | "parked" | "timeout">("driving");
  const [secs, setSecs] = useState(90);
  const [run, setRun] = useState(0);
  const [gear, setGear] = useState<{ g: "D" | "R" | "P"; kmh: number }>({ g: "P", kmh: 0 });

  useEffect(() => {
    const t = TASKS[task];
    const car = { ...t.start, v: 0 };
    let last = performance.now(), parkedFor = 0, left = 90, raf = 0, ended = false, beepAt = 0, hudAt = 0, near = 99, steer = 0, braking = false;
    const end = (s: typeof status) => { if (ended) return; ended = true; setStatus(s); };
    const ctx = canvas.current!.getContext("2d")!;

    const draw = () => {
      ctx.fillStyle = "#334155"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#f8fafc55"; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#22c55e33"; ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2;
      ctx.fillRect(t.bay.x, t.bay.y, t.bay.w, t.bay.h); ctx.strokeRect(t.bay.x, t.bay.y, t.bay.w, t.bay.h);
      ctx.fillStyle = "#64748b"; for (const p of t.parked) { ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6); }
      ctx.fillStyle = "#f97316"; for (const [cx, cy] of t.cones) { ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.a);
      // Wheels (the front pair turn with the steering), the body, glass, and the lights at each end.
      ctx.fillStyle = "#0f172a";
      for (const [wx, wy, turn] of [[-CAR_W / 2 - 1, -CAR_L / 2 + 8, 1], [CAR_W / 2 + 1, -CAR_L / 2 + 8, 1], [-CAR_W / 2 - 1, CAR_L / 2 - 8, 0], [CAR_W / 2 + 1, CAR_L / 2 - 8, 0]]) {
        ctx.save(); ctx.translate(wx, wy); ctx.rotate(turn ? steer : 0); ctx.fillRect(-2.5, -5, 5, 10); ctx.restore();
      }
      ctx.fillStyle = "#0ea5e9"; ctx.beginPath(); ctx.roundRect(-CAR_W / 2, -CAR_L / 2, CAR_W, CAR_L, 5); ctx.fill();
      ctx.fillStyle = "#e0f2fe"; ctx.fillRect(-CAR_W / 2 + 3, -CAR_L / 2 + 6, CAR_W - 6, 7);
      ctx.fillStyle = "#bae6fd"; ctx.fillRect(-CAR_W / 2 + 3, CAR_L / 2 - 10, CAR_W - 6, 5);
      ctx.fillStyle = "#fef9c3"; ctx.fillRect(-CAR_W / 2 + 2, -CAR_L / 2, 5, 2.5); ctx.fillRect(CAR_W / 2 - 7, -CAR_L / 2, 5, 2.5);
      ctx.fillStyle = car.v < -0.5 ? "#ffffff" : braking || Math.abs(car.v) < 0.5 ? "#ef4444" : "#7f1d1d";
      ctx.fillRect(-CAR_W / 2 + 2, CAR_L / 2 - 2.5, 5, 2.5); ctx.fillRect(CAR_W / 2 - 7, CAR_L / 2 - 2.5, 5, 2.5);
      ctx.restore();
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!ended) {
        const k = keys.current;
        // GAS pulls forward (and brakes you while reversing); BRAKE slows you, then reverses once you've stopped.
        braking = false;
        if (k.up) { if (car.v < -1) { car.v = Math.min(0, car.v + 220 * dt); braking = true; } else car.v = Math.min(90, car.v + 120 * dt); }
        else if (k.down) { if (car.v > 1) { car.v = Math.max(0, car.v - 220 * dt); braking = true; } else car.v = Math.max(-50, car.v - 90 * dt); }
        else car.v *= Math.pow(0.15, dt);
        if (Math.abs(car.v) < 0.5 && !k.up && !k.down) car.v = 0;
        steer = k.left || k.right ? (k.left ? -0.55 : 0) + (k.right ? 0.55 : 0) : wheel.current * 0.55;
        car.a += (car.v / WHEELBASE) * Math.tan(steer) * dt;
        car.x += car.v * Math.sin(car.a) * dt;
        car.y -= car.v * Math.cos(car.a) * dt;

        const cs = corners(car.x, car.y, car.a);
        const box = { x: car.x - CAR_L, y: car.y - CAR_L, w: CAR_L * 2, h: CAR_L * 2 };
        const hitWall = cs.some(([px, py]) => px < 0 || px > W || py < 0 || py > H);
        const hitParked = t.parked.some((p) => cs.some((c) => inRect(c, p, -3)));
        const hitCone = t.cones.some(([cx, cy]) => inRect([cx, cy], box) && (cs.some(([px, py]) => Math.hypot(px - cx, py - cy) < 7) ||
          // cone centre inside the car body
          (() => { const s = Math.sin(-car.a), c = Math.cos(-car.a), dx = cx - car.x, dy = cy - car.y; const lx = dx * c - dy * s, ly = dx * s + dy * c; return Math.abs(lx) < CAR_W / 2 + 5 && Math.abs(ly) < CAR_L / 2 + 5; })()));
        if (hitWall || hitParked || hitCone) end("crashed");

        // Parking sensors: the nearest cone, parked car or wall, beeping faster as it gets closer.
        near = 99;
        for (const [px, py] of cs) {
          near = Math.min(near, px, W - px, py, H - py);
          for (const [cx, cy] of t.cones) near = Math.min(near, Math.hypot(px - cx, py - cy) - 6);
          for (const p of t.parked) near = Math.min(near, Math.max(p.x - px, px - (p.x + p.w), p.y - py, py - (p.y + p.h), 0));
        }
        if (Math.abs(car.v) > 2 && near < 26 && now - beepAt > Math.max(70, near * 14)) { beepAt = now; sensorBeep(); }
        if (now - hudAt > 120) { hudAt = now; setGear({ g: car.v < -0.5 ? "R" : car.v > 0.5 ? "D" : "P", kmh: Math.round(Math.abs(car.v) / 6) }); }

        const inside = cs.every((c) => inRect(c, t.bay));
        const angleOff = Math.abs(((car.a - t.bayAngle) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2);
        if (inside && Math.abs(car.v) < 4 && angleOff < 0.22) { parkedFor += dt; if (parkedFor > 0.8) end("parked"); } else parkedFor = 0;

        left -= dt;
        if (left <= 0) end("timeout");
        setSecs(Math.max(0, Math.ceil(left)));
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const m: Record<string, keyof typeof keys.current> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (m[e.key]) { e.preventDefault(); keys.current[m[e.key]] = down; }
    };
    const kd = key(true), ku = key(false);
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [task, run]);

  const retry = () => { keys.current = { up: false, down: false, left: false, right: false }; setStatus("driving"); setRun((r) => r + 1); };
  const next = () => {
    if (task + 1 < TASKS.length) { setTask(task + 1); retry(); } else onDone(true);
  };
  const pedal = (k: "up" | "down", body: React.ReactNode, cls: string, label: string) => (
    <button aria-label={label} onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); keys.current[k] = true; }}
      onPointerUp={() => { keys.current[k] = false; }} onPointerLeave={() => { keys.current[k] = false; }} onPointerCancel={() => { keys.current[k] = false; }}
      className={`rounded-2xl text-white font-black select-none touch-none flex flex-col items-center justify-center leading-tight shadow-[inset_0_-5px_0_rgba(0,0,0,0.3)] active:scale-95 ${cls}`}>{body}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-black">
        <span>Task {task + 1}/{TASKS.length}: {TASKS[task].name}</span>
        <span className={secs <= 15 ? "text-rose-400" : "text-slate-300"}>⏱ {secs}s</span>
      </div>
      <div className="relative mx-auto" style={{ width: W, maxWidth: "100%" }}>
        <canvas ref={canvas} width={W} height={H} className="w-full rounded-2xl border border-white/10" />
        {status !== "driving" && (
          <div className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-3 text-center p-4">
            <p className="text-3xl">{status === "parked" ? "✅" : status === "crashed" ? "💥" : "⏰"}</p>
            <p className="font-black text-lg">{status === "parked" ? "Parked!" : status === "crashed" ? "You touched an obstacle" : "Out of time"}</p>
            {status === "parked"
              ? <button onClick={next} className="h-11 px-6 rounded-2xl bg-emerald-500 text-slate-950 font-black">{task + 1 < TASKS.length ? "Next task" : "Finish Smart Yard"}</button>
              : <button onClick={retry} className="h-11 px-6 rounded-2xl bg-white text-slate-950 font-black">Try again</button>}
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Stop straight inside the green bay. Touching a cone, wall or parked car fails the try. Hold BRAKE when stopped to reverse. Arrow keys work too.</p>
      <div className="flex items-end gap-3">
        <SteeringWheel size={136} className="bg-white/10 ring-1 ring-white/15" onSteer={(v) => { wheel.current = v; }} />
        <div className="flex-1 flex flex-col items-center gap-2">
          {/* the gear and speed */}
          <div className="flex items-center gap-1.5 text-xs font-black">
            {(["P", "R", "D"] as const).map((g) => <span key={g} className={`w-7 h-7 rounded-lg flex items-center justify-center ${gear.g === g ? (g === "R" ? "bg-white text-slate-900" : "bg-emerald-500 text-slate-950") : "bg-white/10 text-white/40"}`}>{g}</span>)}
            <span className="ml-1 tabular-nums text-white/70">{gear.kmh} km/h</span>
          </div>
          <div className="flex items-end gap-2">
            {pedal("down", <><span className="text-xs">BRAKE</span><span className="text-[9px] font-bold text-white/80">hold to reverse ↩</span></>, `w-[76px] h-16 ${gear.g === "R" ? "bg-slate-700" : "bg-rose-600"}`, "Brake, or hold when stopped to reverse")}
            {pedal("up", <span className="text-xs">GAS</span>, "w-[72px] h-24 bg-emerald-600", "Accelerate")}
          </div>
        </div>
      </div>
    </div>
  );
}
