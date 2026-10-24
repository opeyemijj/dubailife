"use client";

// On-screen controls and read-outs for a ride (the ride itself plays in 3D in RideRig): the ride's name and
// what's happening, speed and time, a big action button (hold to cross your arms, tap to stroke, push off,
// jump or tuck), steering and tricks on the FlowRider, "Get out" for the river, floats and waves, and the
// result card at the end. Space, the arrow keys (↑ for a trick) and Esc work too.

import { useEffect, useRef, useState } from "react";
import type { RideDef } from "@/lib/city/rides";
import { rideIO, type RideResult, type RideTelemetry } from "./rideIO";

const LEAVABLE = new Set(["river", "float", "waves", "flowrider", "sunbathe", "sandcastle", "jetski", "paddle", "kitesurf"]);
/** Rides steered with ◀ ▶ (and the arrow keys). */
const STEERED = new Set(["jetski", "paddle"]);

export function RideHUD({ ride, result, isBest, reward, onAgain, onDone }: {
  ride: RideDef;
  result: RideResult | null;
  /** The result beat the player's best on this ride. */
  isBest: boolean;
  /** What the ride paid out ("+AED 60 · fun +40"), shown on the result card. */
  reward: string | null;
  onAgain: () => void;
  onDone: () => void;
}) {
  const [t, setT] = useState<RideTelemetry>(() => ({ ...rideIO.tele }));
  const [now, setNow] = useState(0);
  const [pressed, setPressed] = useState(false);

  // Read what the ride is doing a few times a second.
  useEffect(() => {
    const id = setInterval(() => { setT({ ...rideIO.tele }); setNow(performance.now()); }, 90);
    return () => clearInterval(id);
  }, []);

  // Held counts whenever the ride asks for a hold (even if pressed before it asked); a press is also a tap.
  const press = (down: boolean) => {
    setPressed(down);
    rideIO.input.down = down;
    if (down) rideIO.input.taps++;
  };
  const steer = (dir: number) => { rideIO.input.steer = dir; };
  const pressRef = useRef(press);
  useEffect(() => { pressRef.current = press; });

  // Keyboard: Space = the action button, ←/→ steer, ↑ = trick, Esc = get out. These keys are caught before
  // the app's own shortcuts, and nothing else on the page keeps focus (Space would press it too).
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const OURS = new Set(["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "Escape"]);
    const down = (e: KeyboardEvent) => {
      if (!OURS.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === "Space") pressRef.current(true);
      if (e.code === "ArrowLeft") rideIO.input.steer = -1;
      if (e.code === "ArrowRight") rideIO.input.steer = 1;
      if (e.code === "ArrowUp") rideIO.input.tricks++;
      if (e.code === "Escape" && LEAVABLE.has(ride.kind)) rideIO.input.exit = true;
    };
    const up = (e: KeyboardEvent) => {
      if (!OURS.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Space") pressRef.current(false);
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") rideIO.input.steer = 0;
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [ride.kind]);

  const flashing = t.flash && now - t.flashAt < 1400;
  const score = scoreLabel(ride, t);

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-950/40 backdrop-blur-[2px]">
        <div className="w-full max-w-sm rounded-[2rem] bg-white text-slate-900 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="text-center space-y-1">
            <div className="text-4xl">{ride.icon}</div>
            <h2 className="text-lg font-black leading-tight">{result.headline ?? ride.label}</h2>
            <div className="text-2xl tracking-widest" aria-label={`${result.stars} of 3 stars`}>{[1, 2, 3].map((n) => <span key={n} className={n <= result.stars ? "" : "opacity-20 grayscale"}>⭐</span>)}</div>
            {isBest && <div className="inline-block rounded-full bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-0.5">🏅 New personal best!</div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {result.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
                <div className="text-base font-black">{s.value}</div>
              </div>
            ))}
          </div>
          {reward && <p className="text-center text-sm font-black text-emerald-700">{reward}</p>}
          {ride.fact && <p className="text-center text-[11px] text-slate-500">{ride.fact}</p>}
          <div className="flex gap-2">
            <button onClick={onAgain} className="flex-1 h-12 rounded-2xl bg-sky-600 text-white font-black">↻ Again</button>
            <button onClick={onDone} className="flex-1 h-12 rounded-2xl bg-slate-100 font-black text-slate-700">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none">
      {/* what's happening */}
      <div className="absolute top-3 inset-x-3 flex justify-center">
        <div className="pointer-events-auto max-w-md w-full rounded-2xl bg-slate-950/80 text-white px-3.5 py-2.5 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ride.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black truncate">{ride.label}</div>
              <div className="text-[11px] text-sky-200 truncate">{t.phase}</div>
            </div>
            {LEAVABLE.has(ride.kind) && (
              <button onClick={() => { rideIO.input.exit = true; }} className="shrink-0 h-8 px-3 rounded-xl bg-white/15 text-xs font-black">Get out</button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-300">
            {(t.speedKmh > 0 || t.topKmh > 0) && <span>🚀 <b className="text-white text-sm">{Math.round(t.speedKmh)}</b> km/h</span>}
            {t.time > 0 && <span>⏱ <b className="text-white">{t.time.toFixed(1)}</b> s</span>}
            {score && <span>{score}</span>}
            {t.bpm > 0 && <span>❤️ <b className="text-rose-300">{t.bpm}</b> bpm</span>}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-sky-400 transition-[width] duration-100" style={{ width: `${Math.round(Math.min(1, t.progress) * 100)}%` }} /></div>
        </div>
      </div>

      {t.countdown > 0 && <div className="absolute inset-0 flex items-center justify-center"><div key={t.countdown} className="text-7xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] animate-in zoom-in duration-200">{t.countdown}</div></div>}
      {flashing && <div className="absolute top-[30%] inset-x-0 text-center"><span className="inline-block rounded-2xl bg-white/95 px-4 py-2 text-lg font-black text-slate-900 shadow-xl animate-in zoom-in duration-150">{t.flash}</span></div>}

      {/* FlowRider: balance bar, steering and tricks */}
      {ride.kind === "flowrider" && (
        <div className="absolute bottom-28 inset-x-0 flex flex-col items-center gap-3">
          <div className="relative w-64 h-3 rounded-full bg-gradient-to-r from-rose-500 via-emerald-400 to-rose-500 shadow">
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-6 rounded-md bg-white border-2 border-slate-900 shadow transition-[left] duration-75" style={{ left: `calc(${(t.balance + 1) * 50}% - 8px)` }} />
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
            <HoldButton label="◀ Lean" onChange={(d) => steer(d ? -1 : 0)} />
            <button onPointerDown={() => { rideIO.input.tricks++; }} className="h-14 px-5 rounded-2xl bg-amber-400 text-slate-950 font-black shadow-lg active:scale-95">🤙 Trick</button>
            <HoldButton label="Lean ▶" onChange={(d) => steer(d ? 1 : 0)} />
          </div>
        </div>
      )}

      {/* Jet ski and paddleboard: steering */}
      {STEERED.has(ride.kind) && (
        <div className={`absolute ${t.prompt ? "bottom-32" : "bottom-10"} inset-x-0 flex justify-center gap-24 pointer-events-auto`}>
          <HoldButton label="◀ Left" onChange={(d) => steer(d ? -1 : 0)} />
          <HoldButton label="Right ▶" onChange={(d) => steer(d ? 1 : 0)} />
        </div>
      )}

      {/* Kitesurf: the power meter to time a pop */}
      {ride.kind === "kitesurf" && (
        <div className="absolute bottom-32 inset-x-0 flex flex-col items-center gap-1">
          <div className="text-[11px] font-black text-white drop-shadow">Kite power</div>
          <div className="w-64 h-3 rounded-full bg-white/30 overflow-hidden shadow"><div className="h-full bg-gradient-to-r from-sky-400 via-amber-300 to-rose-500" style={{ width: `${Math.round((t.balance + 1) * 50)}%` }} /></div>
        </div>
      )}

      {/* the action button */}
      {t.prompt && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
          <button
            onPointerDown={(e) => { e.preventDefault(); press(true); }}
            onPointerUp={() => press(false)}
            onPointerLeave={() => pressed && press(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`pointer-events-auto touch-none h-20 min-w-48 px-6 rounded-[1.75rem] font-black text-lg shadow-2xl transition-transform ${pressed ? "scale-95 bg-emerald-500 text-white" : "bg-white text-slate-900"}`}
          >
            {t.holdButton ? (pressed ? "🙅 Holding…" : `✋ ${t.prompt}`) : `👆 ${t.prompt}`}
          </button>
        </div>
      )}
    </div>
  );
}

function HoldButton({ label, onChange }: { label: string; onChange: (down: boolean) => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onChange(true); }}
      onPointerUp={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="touch-none h-14 px-5 rounded-2xl bg-white text-slate-900 font-black shadow-lg active:scale-95 active:bg-sky-100"
    >
      {label}
    </button>
  );
}

/** The ride-specific number shown while riding. */
function scoreLabel(ride: RideDef, t: RideTelemetry): string | null {
  switch (ride.kind) {
    case "race": return t.phase.startsWith("Tap") ? `💥 ${t.score} pushes` : null;
    case "waves": return `🌊 ${t.score}/${t.count} jumped`;
    case "flowrider": return `🏄 ${t.score} pts · 💥 ${t.count}/3`;
    case "river": return `🔁 Lap ${t.count + 1}`;
    case "sunbathe": return `☀️ Tan ${t.score}%`;
    case "jetski":
    case "paddle": return `🟡 ${t.score}/${t.count} buoys`;
    case "kitesurf": return `🪁 ${t.score} pts · ${t.count} jumps`;
    case "volleyball": return `🏐 You ${t.score} – ${t.count} Them`;
    case "sandcastle": return `🏰 Stage ${t.score}/5`;
    default: return null;
  }
}
