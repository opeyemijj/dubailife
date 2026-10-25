"use client";

// On-screen controls and read-outs for a ride (the ride itself plays in 3D in RideRig): the ride's name and
// what's happening, speed and time, a big action button (hold to cross your arms, tap to stroke, push off,
// jump or tuck), steering and tricks on the FlowRider, "Get out" for the river, floats and waves, and the
// result card at the end. Space, the arrow keys (↑ for a trick) and Esc work too.

import { useEffect, useRef, useState } from "react";
import type { RideDef } from "@/lib/city/rides";
import type { Product } from "@/lib/city/types";
import { serveKindOf } from "../served";
import { rideIO, type Arrow, type RideResult, type RideTelemetry } from "./rideIO";

const ARROW_ICON: Record<Arrow, string> = { left: "⬅️", up: "⬆️", right: "➡️", down: "⬇️" };
const KEY_ARROW: Record<string, Arrow> = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" };

const LEAVABLE = new Set(["observe", "tunnel", "river", "float", "waves", "flowrider", "sunbathe", "sandcastle", "jetski", "paddle", "kitesurf", "skate", "karaoke", "treatment", "jacuzzi", "facemask"]);
/** Rides steered with ◀ ▶ (and the arrow keys). */
const STEERED = new Set(["jetski", "paddle"]);

export function RideHUD({ ride, result, isBest, reward, onAgain, onDone, menu = [], balance = 0 }: {
  ride: RideDef;
  /** What a meal can be ordered from, and what the citizen has to spend. */
  menu?: Product[];
  balance?: number;
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
  const [tip, setTip] = useState(false);
  const [shutter, setShutter] = useState(0);

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
    const OURS = new Set(["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape"]);
    const down = (e: KeyboardEvent) => {
      if (!OURS.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      // Dance-off: the arrow keys are the moves.
      if (ride.kind === "danceoff" && KEY_ARROW[e.code]) { rideIO.input.moveDir = KEY_ARROW[e.code]; rideIO.input.moves++; return; }
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

      {t.countdown > 0 && ride.kind !== "trolley" && <div className="absolute inset-0 flex items-center justify-center"><div key={t.countdown} className="text-7xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] animate-in zoom-in duration-200">{t.countdown}</div></div>}
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

      {/* Skating: lean into the corners, and how wobbly you are */}
      {ride.kind === "skate" && (
        <div className="absolute bottom-32 inset-x-0 flex flex-col items-center gap-2">
          {ride.id !== "skate-penguin" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-white drop-shadow">Wobble</span>
              <div className="w-48 h-3 rounded-full bg-white/30 overflow-hidden shadow"><div className={`h-full transition-[width] duration-100 ${t.balance > 0.7 ? "bg-rose-500" : t.balance > 0.4 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.round(t.balance * 100)}%` }} /></div>
            </div>
          )}
          <div className="pointer-events-auto"><HoldButton label="↶ Lean into the bend" onChange={(d) => steer(d ? -1 : 0)} /></div>
        </div>
      )}

      {/* Bowling: the aim (left to right) or power meter */}
      {t.meterLabel && (
        <div className="absolute bottom-32 inset-x-0 flex flex-col items-center gap-1">
          <div className="text-[11px] font-black text-white drop-shadow">{t.meterLabel}</div>
          <div className="relative w-64 h-4 rounded-full bg-white/30 shadow overflow-hidden">
            {t.meterLabel === "Heat" && <div className="absolute inset-y-0 bg-emerald-400/70" style={{ left: "70%", width: "20%" }} />}
            {t.meterLabel === "Aim" ? (
              <>
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 bg-emerald-400/60" />
                <div className="absolute top-0 bottom-0 w-2 rounded bg-white border border-slate-900" style={{ left: `calc(${(t.meter + 1) * 50}% - 4px)` }} />
              </>
            ) : (
              <div className={`relative h-full ${t.meterLabel === "Breath" ? "bg-sky-400" : "bg-gradient-to-r from-sky-400 via-amber-300 to-rose-500"} ${t.meterLabel === "Heat" ? "opacity-80" : ""}`} style={{ width: `${Math.round(t.meter * 100)}%` }} />
            )}
          </div>
        </div>
      )}

      {/* Spa: the breathing guide */}
      {t.breath >= 0 && (
        <div className="absolute bottom-36 inset-x-0 flex flex-col items-center gap-1">
          <div className="w-24 h-24 flex items-center justify-center">
            <div className={`rounded-full border-4 border-white transition-colors ${pressed ? "bg-emerald-400/50" : "bg-sky-400/40"}`} style={{ width: `${30 + t.breath * 66}px`, height: `${30 + t.breath * 66}px` }} />
          </div>
          <div className="text-xs font-black text-white drop-shadow">{t.breath > 0.92 ? "Hold…" : t.breath < 0.08 ? "…" : "Breathe with the circle"}</div>
        </div>
      )}

      {/* Karaoke and the dance-off: the beat */}
      {(ride.kind === "karaoke" || ride.kind === "danceoff") && <BeatRing />}

      {/* Dance-off: the next move, and the four move buttons */}
      {ride.kind === "danceoff" && (
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-3 pointer-events-auto">
          {t.arrow && <div className="text-5xl drop-shadow-lg">{ARROW_ICON[t.arrow]}</div>}
          <div className="flex gap-2">
            {(["left", "up", "down", "right"] as Arrow[]).map((a) => (
              <button key={a} onPointerDown={(e) => { e.preventDefault(); rideIO.input.moveDir = a; rideIO.input.moves++; }}
                className={`touch-none w-16 h-16 rounded-2xl text-3xl shadow-lg active:scale-90 ${t.arrow === a ? "bg-fuchsia-500" : "bg-white"}`}>{ARROW_ICON[a]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Meal: the menu */}
      {t.panel === "menu" && <MenuPanel menu={menu} balance={balance} />}
      {t.panel === "photo" && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-auto">
          <button onClick={() => { rideIO.input.photos++; if (ride.kind !== "observe") setShutter(Date.now()); }} className="h-16 px-6 rounded-[1.5rem] bg-white text-slate-900 font-black text-base shadow-2xl active:scale-95">
            {ride.kind === "facemask" ? "🤳 Take a selfie" : ride.kind === "observe" ? "🎯 That's it!" : ride.kind === "tunnel" ? `📸 Snap the ${ride.target ?? "shark"}` : "📸 Take a food photo"}
          </button>
        </div>
      )}
      {/* Trolley dash: the list to memorise */}
      {ride.kind === "trolley" && t.countdown > 0 && t.phase.startsWith("📝") && (
        <div className="absolute inset-x-3 top-36 flex justify-center">
          <div className="rounded-2xl bg-white/95 text-slate-900 shadow-2xl px-4 py-3 space-y-1 max-w-sm">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500">📝 Remember the aisles!</div>
            {t.phase.replace("📝 Remember: ", "").split(" · ").map((line) => <div key={line} className="text-sm font-bold">{line}</div>)}
          </div>
        </div>
      )}
      {/* Telescope crosshair */}
      {ride.kind === "observe" && t.panel === "photo" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[min(70vw,360px)] aspect-square rounded-full border-[10px] border-slate-950/70 shadow-[0_0_0_200vmax_rgba(2,6,23,0.55)] relative">
            <div className="absolute left-1/2 top-[10%] bottom-[10%] w-0.5 -translate-x-1/2 bg-white/80" />
            <div className="absolute top-1/2 left-[10%] right-[10%] h-0.5 -translate-y-1/2 bg-white/80" />
          </div>
        </div>
      )}
      {/* Wax figures: pick the pose */}
      {t.options.length > 0 && (
        <div className="absolute bottom-8 inset-x-3 flex flex-wrap justify-center gap-2 pointer-events-auto">
          {t.options.map((o, i) => <button key={o} onClick={() => { rideIO.input.choice = i; }} className="h-14 px-4 rounded-2xl bg-white text-slate-900 font-black shadow-lg active:scale-95">{o}</button>)}
        </div>
      )}
      {/* A fade to black and back (into the tunnel, into VR) */}
      {t.fadeAt > 0 && now - t.fadeAt < 900 && <div className="absolute inset-0 bg-slate-950" style={{ opacity: 1 - Math.abs((now - t.fadeAt) / 450 - 1) }} />}
      {shutter > 0 && <div key={shutter} className="absolute inset-0 bg-white animate-out fade-out duration-500 fill-mode-forwards pointer-events-none" />}
      {t.panel === "bill" && (
        <div className="absolute bottom-32 inset-x-0 flex justify-center pointer-events-auto">
          <div className="rounded-2xl bg-white/95 shadow-xl px-4 py-3 text-slate-900 text-center space-y-2 min-w-56">
            <div className="text-xs font-bold text-slate-500">Your bill</div>
            <div className="text-2xl font-black">AED {Math.round(t.bill * (tip ? 1.1 : 1))}</div>
            <label className="flex items-center justify-center gap-2 text-xs font-bold">
              <input type="checkbox" checked={tip} onChange={(e) => { setTip(e.target.checked); rideIO.input.tip = e.target.checked; }} /> Add a 10% tip
            </label>
          </div>
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

/** The menu for a sit-down meal: pick a dish and a drink (what you can afford), then order. */
function MenuPanel({ menu, balance }: { menu: Product[]; balance: number }) {
  const [picked, setPicked] = useState<string[]>([]);
  const isDrink = (p: Product) => !["plate", "dessert", "pastry", "teaset"].includes(serveKindOf(p) ?? "plate");
  const total = picked.reduce((sum, id) => sum + (menu.find((p) => p.id === id)?.price ?? 0), 0);
  const toggle = (p: Product) => setPicked((list) => {
    if (list.includes(p.id)) return list.filter((x) => x !== p.id);
    // One dish and one drink.
    const rest = list.filter((id) => { const q = menu.find((m) => m.id === id); return q && isDrink(q) !== isDrink(p); });
    return [...rest, p.id];
  });
  const section = (drinks: boolean) => menu.filter((p) => isDrink(p) === drinks).slice(0, 6);
  return (
    <div className="absolute inset-x-3 bottom-4 flex justify-center pointer-events-auto">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white text-slate-900 shadow-2xl p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        <div className="text-center"><div className="text-lg font-black">📜 Menu</div><div className="text-[11px] text-slate-500">Pick a dish and a drink · you have AED {Math.floor(balance).toLocaleString()}</div></div>
        {([false, true] as const).map((drinks) => section(drinks).length > 0 && (
          <div key={String(drinks)} className="space-y-1.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">{drinks ? "Drinks" : "Food"}</div>
            {section(drinks).map((p) => {
              const on = picked.includes(p.id);
              const tooMuch = !on && total + p.price - (picked.map((id) => menu.find((m) => m.id === id)).find((q) => q && isDrink(q) === drinks)?.price ?? 0) > balance;
              return (
                <button key={p.id} disabled={tooMuch} onClick={() => toggle(p)} className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm disabled:opacity-40 ${on ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                  <span className="text-xl">{p.icon}</span><span className="flex-1 font-bold">{p.name}</span><span className="text-xs font-black">AED {p.price}</span>
                </button>
              );
            })}
          </div>
        ))}
        <button onClick={() => { rideIO.input.order = picked; }} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">
          {picked.length ? `Order · AED ${total}` : "Just water, thanks"}
        </button>
      </div>
    </div>
  );
}

/** A ring that pulses on every karaoke beat (drawn every frame without re-rendering). */
function BeatRing() {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const { beatStart, beatGap } = rideIO.tele;
      const el = ring.current;
      if (el) {
        const since = performance.now() - beatStart;
        if (!beatStart || since < -beatGap) el.style.opacity = "0";
        else {
          // Shrinks onto the target as the beat lands.
          const phase = (((since % beatGap) + beatGap) % beatGap) / beatGap;
          el.style.opacity = "1";
          el.style.transform = `scale(${1 + (1 - phase) * 0.9})`;
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="absolute bottom-36 inset-x-0 flex justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-fuchsia-400 bg-fuchsia-400/20" />
        <div ref={ring} className="absolute inset-0 rounded-full border-4 border-white" style={{ opacity: 0 }} />
      </div>
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
    case "skate": return `🔁 ${t.score} laps · 💥 ${t.count} falls`;
    case "spin": return `🌀 ${t.score} now · best ${t.count}`;
    case "bowling": return `🎳 ${t.score} pts · frame ${Math.min(3, t.count + 1)}/3`;
    case "karaoke": return `🎤 ${t.score}% · streak ${t.count}`;
    case "danceoff": return `🕺 You ${t.score}% – ${t.count}% Rival`;
    case "dj": return `🔥 Hype ${t.score}% · drop ${Math.min(4, t.count + 1)}/4`;
    case "meal": return t.bill ? `🧾 AED ${t.bill}` : null;
    case "chefshow": return `🍤 ${t.score}/${t.count} caught`;
    case "treatment": return `🧘 Calm ${t.score}%`;
    case "observe": return t.panel === "photo" ? `🎯 ${t.score}/${t.count} found` : t.score ? `🛗 Floor ${t.score}` : null;
    case "glassbridge": return t.count ? `😮‍💨 ${t.score}/${t.count} cracks survived` : null;
    case "tunnel": return `📸 Best ${t.score}% · ${t.count} shots left`;
    case "vrdrop": return t.score ? `📏 ${t.score} m` : null;
    case "techdemo": return t.score ? `⏱ avg ${t.score} ms` : null;
    default: return null;
  }
}
