"use client";

// The gym: pick a station (treadmill, squat rack, heavy bag, rower, spin class, yoga), play its short skill game
// in 3D, and the result builds a body stat (lib/body) that carries into boxing. Played at the real gyms on the
// map (Fitness First BurJuman and Dubai Marina Mall, UFC Gym JBR); the station logic is logic.ts, the 3D is
// GymScene.tsx, and this file is the controls and HUD for each station.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import GYM from "@/data/arcade/gym.json";
import { useCitizen } from "@/lib/citizenStore";
import { useGameProgress, starsFor } from "@/lib/arcade";
import { bodyOf, trainBody } from "@/lib/body";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Meter, Pill, useCallouts } from "../../hud";
import { preloadPhysics } from "../../launcher";
import { shake, useGameFrame } from "../../stage";
import { GymScene } from "./GymScene";
import { newSim, noInput, STATIONS, stationById, stepSim, YOGA_POSES, type GymInput, type StationId, type StationSim } from "./logic";

const ACCENT: Record<string, string> = { "fitness-first-burjuman": "#e11d48", "fitness-first-marina": "#e11d48", "ufc-gym-jbr": "#dc2626" };
const PUNCHES = [{ label: "JAB", key: "KeyJ" }, { label: "CROSS", key: "KeyK" }, { label: "L HOOK", key: "KeyU" }, { label: "R HOOK", key: "KeyI" }];

export default function GymGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("gym");
  const gymId = (params?.gym as string) ?? "fitness-first-burjuman";
  const gymName = (GYM.gyms as Record<string, string>)[gymId] ?? "The gym";
  const [station, setStation] = useState<StationId>((params?.station as StationId) ?? "treadmill");
  const body = bodyOf(citizen);
  const def = stationById(station);

  return (
    <GameShell
      game="gym"
      title={def.name}
      venue={gymName}
      howTo={[{ icon: def.icon, text: def.how }, { icon: "💪", text: `Builds ${def.stat}. Your body stats carry into boxing, and fade after a week without training.` }]}
      preload={preloadPhysics}
      onClose={onClose}
      onShare={onShare}
      intro={
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {STATIONS.map((s) => (
              <button key={s.id} onClick={() => setStation(s.id)}
                className={`rounded-xl p-2 text-left border ${station === s.id ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-white/5 border-white/10"}`}>
                <span className="text-xl">{s.icon}</span>
                <span className="block text-[11px] font-black leading-tight">{s.name.split(" · ")[1]}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {(["strength", "stamina", "flexibility"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-white/5 p-2">
                <p className="text-[10px] uppercase font-black text-white/50">{k}</p>
                <p className="font-black tabular-nums">{Math.round(body[k])}</p>
              </div>
            ))}
          </div>
        </div>
      }
    >
      {(api) => <Session key={station} api={api} station={station} look={citizen?.look} accent={ACCENT[gymId] ?? "#e11d48"} level={Math.max(1, progress.level)} strength={body.strength} best={progress.best} gymName={gymName} />}
    </GameShell>
  );
}

function Session({ api, station, look, accent, level, strength, best, gymName }: { api: ShellApi; station: StationId; look?: Parameters<typeof GymScene>[0]["look"]; accent: string; level: number; strength: number; best: number; gymName: string }) {
  const [initial] = useState(() => newSim(station, { level, strength, best: station === "rower" ? best : 0 }));
  const simRef = useRef<StationSim | null>(initial);
  const inputRef = useRef<GymInput>(noInput());
  const flashesRef = useRef<Array<{ text: string; tone: "good" | "great" | "bad" | "info" }>>([]);
  // What the HUD draws: a copy of the station taken each frame.
  const [view, setView] = useState<StationSim>(initial);
  const callouts = useCallouts();
  const ended = useRef(false);
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; });
  const playing = api.phase === "play";

  // Redraw the HUD every frame (rhythm lanes need it smooth), turn flashes into callouts, and end the session.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (simRef.current) setView({ ...simRef.current } as StationSim);
      for (const f of flashesRef.current.splice(0)) callouts.push(f.text, f.tone);
      const s = simRef.current;
      if (s?.done && !ended.current) {
        ended.current = true;
        const d = stationById(station);
        const stars = starsFor(s.score, d.stars);
        const after = stars > 0 ? trainBody(d.stat, d.gain * stars) : null;
        setTimeout(() => apiRef.current.finish({
          score: Math.max(0, s.score), stars,
          level: after ? Math.round((after.strength + after.stamina + after.flexibility) / 30) : 0,
          headline: stars === 3 ? "Beast mode! 💪" : stars === 2 ? "Strong session" : stars === 1 ? "Good work" : "Keep at it",
          stats: [
            { label: d.stat, value: after ? `${Math.round(after[d.stat])} (+${d.gain * stars})` : "–" },
            { label: "Best combo", value: String(s.best || s.combo || 0) },
            { label: "Station", value: d.icon },
          ],
          share: `💪 ${d.name}: ${s.score.toLocaleString()} at ${gymName} on Dubai Life`,
        }), 900);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one loop per session; it reads refs
  }, []);

  // Keyboard: Space taps / holds, arrows drag, J K U I punches, 1 2 3 spin lanes.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const inp = inputRef.current;
      const p = PUNCHES.findIndex((x) => x.key === e.code);
      if (p >= 0) inp.hits.push(p);
      else if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") inp.hits.push(Number(e.code.slice(5)) - 1);
      else if (e.code === "Space") { inp.taps++; inp.held = true; e.preventDefault(); }
      else if (e.code === "ArrowLeft") inp.dragX -= 0.04;
      else if (e.code === "ArrowRight") inp.dragX += 0.04;
      else if (e.code === "ArrowUp") inp.dragY -= 0.04;
      else if (e.code === "ArrowDown") inp.dragY += 0.04;
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") inputRef.current.held = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Touch: tap/hold anywhere, drag for balance.
  const last = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: ReactPointerEvent) => { inputRef.current.taps++; inputRef.current.held = true; last.current = { x: e.clientX, y: e.clientY }; haptic(4); };
  const onMove = (e: ReactPointerEvent) => {
    if (!last.current) return;
    inputRef.current.dragX += (e.clientX - last.current.x) / window.innerWidth;
    inputRef.current.dragY += (e.clientY - last.current.y) / window.innerHeight;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { inputRef.current.held = false; last.current = null; };
  // Punch and lane pads say which they are in data-i.
  const onPunch = (e: ReactPointerEvent<HTMLElement>) => { e.stopPropagation(); inputRef.current.hits.push(Number(e.currentTarget.dataset.i)); haptic(6); };
  const onLane = (e: ReactPointerEvent<HTMLElement>) => { e.stopPropagation(); inputRef.current.hits.push(Number(e.currentTarget.dataset.i)); inputRef.current.held = true; haptic(4); };

  const s = view;
  const left = Math.max(0, Math.ceil(s.seconds - s.t));

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 1.8, 3.4], fov: 50 }} background="#18181b" environment={0.35}>
        <GymScene look={look} station={station} simRef={simRef} accent={accent} paused={!playing} />
        <Ticker simRef={simRef} inputRef={inputRef} flashesRef={flashesRef} level={level} playing={playing} />
      </GameStage>

      <div className="absolute inset-0 z-10 touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />

      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex gap-2 items-center pointer-events-none">
        <Pill icon="⏱️" value={`${left}s`} />
        <Pill icon={stationById(station).icon} value={s.score.toLocaleString()} tone="gold" />
        {s.combo >= 3 && s.kind !== "treadmill" && <Pill value={`x${Math.floor(s.combo)}`} />}
      </div>
      {callouts.node}

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pointer-events-none">
        {s.kind === "treadmill" && (
          <div className="space-y-2">
            <Meter label={`Pace ${s.speed.toFixed(1)} km/h · target ${s.target.toFixed(0)}`} value={Math.min(1, s.speed / (s.target * 1.3))} color={s.speed >= s.target - 1.5 ? "#22c55e" : "#f59e0b"} warnBelow={0} />
            <Meter label={`Sandstorm ${Math.max(0, s.stormGap).toFixed(0)} m behind`} value={s.stormGap / 60} color="#d97706" />
            <p className="text-center text-sm font-black text-white/80">TAP TAP TAP in rhythm · {Math.round(s.distance)} m</p>
          </div>
        )}
        {s.kind === "squat" && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <p className="text-xs font-black">{s.weight} kg · rep {s.reps} · {s.failed} missed</p>
              {/* The level bubble: keep it in the middle */}
              <div className="relative h-5 rounded-full bg-black/50 border border-white/15">
                <div className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-emerald-500/30" />
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-sky-300" style={{ left: `calc(${50 + s.tilt * 46}% - 8px)` }} />
              </div>
              <p className="text-[11px] text-white/70">Drag to level the bar · tap when the marker&apos;s in the green</p>
            </div>
            <div className="relative w-8 h-40 rounded-full bg-black/50 border border-white/15 overflow-hidden">
              <div className="absolute inset-x-0 bg-emerald-500/60" style={{ top: `${(0.5 - s.zone / 2) * 100}%`, height: `${s.zone * 100}%` }} />
              <div className="absolute inset-x-0 h-1.5 bg-white" style={{ top: `calc(${s.marker * 100}% - 3px)` }} />
            </div>
          </div>
        )}
        {s.kind === "bag" && (
          <div className="space-y-2">
            <BeatTrack beats={s.beats} t={s.t} />
            <div className="grid grid-cols-4 gap-1.5 pointer-events-auto">
              {PUNCHES.map((p, i) => (
                <button key={p.label} data-i={i} onPointerDown={onPunch} className={`h-14 rounded-2xl font-black text-xs ${["bg-sky-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"][i]}`}>{p.label}</button>
              ))}
            </div>
          </div>
        )}
        {s.kind === "rower" && (
          <div className="space-y-2">
            <Meter label={`You ${Math.round(s.distance)} m`} value={s.distance / 500} color="#22c55e" warnBelow={0} />
            <Meter label={`Ghost ${Math.round(s.ghost)} m`} value={s.ghost / 500} color="#94a3b8" warnBelow={0} />
            <p className="text-center text-sm font-black text-white/85">{s.driving ? "DRIVE… let go to recover" : "Recover… hold to drive"} · {s.strokes} strokes</p>
          </div>
        )}
        {s.kind === "spin" && (
          <div className="pointer-events-auto">
            <SpinLanes notes={s.notes} t={s.t} onLane={onLane} />
          </div>
        )}
        {s.kind === "yoga" && (
          <p className="text-center text-lg font-black">{YOGA_POSES[s.pose]} · {s.score}% balanced</p>
        )}
      </div>
      {s.kind === "yoga" && (
        <div className="absolute left-1/2 top-[42%] z-20 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-2 border-white/25 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 w-[45%] h-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-emerald-400/70" />
          <div className="absolute w-6 h-6 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.9)]" style={{ left: `calc(${50 + (s.x / 1.4) * 50}% - 12px)`, top: `calc(${50 + (s.y / 1.4) * 50}% - 12px)` }} />
        </div>
      )}
    </div>
  );
}

/** Upcoming punches sliding to the hit line, coloured by punch. */
function BeatTrack({ beats, t }: { beats: Array<{ at: number; punch: number; hit: string }>; t: number }) {
  const colors = ["#0ea5e9", "#f43f5e", "#f59e0b", "#10b981"];
  return (
    <div className="relative h-12 rounded-2xl bg-black/55 border border-white/10 overflow-hidden">
      <div className="absolute left-[18%] inset-y-0 w-1 bg-white/80" />
      {beats.filter((b) => b.at - t > -0.3 && b.at - t < 2.4).map((b) => (
        <div key={b.at} className={`absolute top-2 w-8 h-8 -ml-4 rounded-full flex items-center justify-center text-[9px] font-black ${b.hit === "miss" ? "opacity-25" : b.hit ? "scale-125 opacity-0 transition" : ""}`}
          style={{ left: `${18 + (b.at - t) * 34}%`, background: colors[b.punch] }}>
          {PUNCHES[b.punch].label.split(" ").pop()}
        </div>
      ))}
    </div>
  );
}

/** Three lanes of beats falling to the line, with tall bars for climbs, and a tap pad under each lane. */
function SpinLanes({ notes, t, onLane }: { notes: Array<{ at: number; lane: number; len: number; hit: string }>; t: number; onLane: (e: ReactPointerEvent<HTMLElement>) => void }) {
  const H = 220, speed = 120; // px per second
  return (
    <div className="mx-auto max-w-xs">
      <div className="relative rounded-2xl bg-black/55 border border-white/10 overflow-hidden" style={{ height: H }}>
        {[1, 2].map((i) => <div key={i} className="absolute inset-y-0 w-px bg-white/10" style={{ left: `${(i * 100) / 3}%` }} />)}
        <div className="absolute inset-x-0 h-1 bg-white/80" style={{ top: H - 24 }} />
        {notes.filter((n) => n.at - t < H / speed && n.at + n.len - t > -0.3 && n.hit !== "perfect" && n.hit !== "good" || n.hit === "holding").map((n) => {
          const y = H - 24 - (n.at - t) * speed;
          const h = Math.max(16, n.len * speed);
          return (
            <div key={`${n.at}:${n.lane}`} className={`absolute rounded-lg ${n.hit === "miss" ? "opacity-25" : ""}`}
              style={{ left: `calc(${(n.lane * 100) / 3}% + 8px)`, width: `calc(${100 / 3}% - 16px)`, top: y - h + 8, height: h, background: n.len ? "linear-gradient(#a855f7,#ec4899)" : ["#22d3ee", "#facc15", "#f472b6"][n.lane] }} />
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        {[0, 1, 2].map((i) => <button key={i} data-i={i} onPointerDown={onLane} className="h-14 rounded-2xl bg-white/15 backdrop-blur font-black">{i + 1}</button>)}
      </div>
    </div>
  );
}

/** Inside the canvas: advances the station each frame from the input. */
function Ticker({ simRef, inputRef, flashesRef, level, playing }: { simRef: RefObject<StationSim | null>; inputRef: RefObject<GymInput>; flashesRef: RefObject<Array<{ text: string; tone: "good" | "great" | "bad" | "info" }>>; level: number; playing: boolean }) {
  useGameFrame((dt) => {
    const s = simRef.current;
    if (!s || !playing) return;
    const inp = inputRef.current;
    stepSim(s, dt, inp, level);
    for (const f of s.flashes) {
      flashesRef.current.push(f);
      if (f.tone === "great") { sfx("mgPerfect"); shake(0.04); } else if (f.tone === "bad") sfx("warn"); else if (f.tone === "good") sfx("mgHit2");
    }
    if (s.kind === "bag" && inp.hits.length && s.lastHit && s.t - s.lastHit.at < 0.05) { sfx("mgThud"); shake(0.03 * s.lastHit.power); }
    // One-shot input is used up; held and drag carry only what's new.
    inp.taps = 0; inp.hits = []; inp.dragX = 0; inp.dragY = 0;
  });
  return null;
}
