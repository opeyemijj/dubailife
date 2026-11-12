"use client";

// Good morning: once a game day (they start at 09:00 Dubai time), the first time you open the map or your
// home. You're asleep in bed with the sun coming up through the window; the phone on the nightstand buzzes,
// you get up, and today's 7-Day Residency Stamp Card, Overnight Ledger ("While You Were Away"), and three
// daily missions are on the screen.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePathname } from "next/navigation";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { phoneRing } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { adjustBalance, dialogOpen, useCitizen } from "@/lib/citizenStore";
import { useGoals } from "@/lib/goals";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { useMissions } from "@/lib/missions";
import { gameAudio } from "@/utils/gameAudio";
import { DailyMissions } from "./DailyMissions";
import { PerfProbe } from "@/components/perf/PerfProbe";

const STAMP_REWARDS = [
  { day: 1, icon: "🚇", label: "Nol Top-Up", aed: 150 },
  { day: 2, icon: "☕", label: "Karak & Croissant", aed: 220 },
  { day: 3, icon: "🏎️", label: "Supercar Lease Bonus", aed: 500 },
  { day: 4, icon: "🛍️", label: "Mall Voucher", aed: 320 },
  { day: 5, icon: "🧑‍🎨", label: "Decor Grant", aed: 650 },
  { day: 6, icon: "🏖️", label: "VIP Beach Pass", aed: 800 },
  { day: 7, icon: "👑", label: "Golden Vault", aed: 2000 },
];

function Bedroom({ look, upRef }: { look?: AvatarLookProps; upRef: React.RefObject<number> }) {
  const me = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  const [anim, setAnim] = useState<AvatarAnimation>("idle");
  useFrame(({ camera }, dt) => {
    t.current += dt;
    const up = upRef.current;
    // The phone's screen lights up and pulses while it buzzes.
    if (screen.current) screen.current.emissiveIntensity = up ? 1.2 : 0.4 + (Math.sin(t.current * 10) > 0 ? 1.4 : 0);
    if (me.current) {
      if (!up) {
        // Feet at z = +0.95 so the head (at z - 1.7m when rotated -90° around X) rests right on the pillow at z = -0.78, y = 0.78.
        me.current.position.set(-0.22, 0.80, 0.95);
        me.current.rotation.set(-Math.PI / 2, 0, 0);
        if (anim !== "sleep") setAnim("sleep");
      } else {
        // Up and standing beside the bed, stretching.
        me.current.position.lerp(new THREE.Vector3(1.55, 0, 1.55), Math.min(1, dt * 3));
        me.current.rotation.set(0, -0.5, 0);
        if (anim !== "wave") setAnim("wave");
      }
    }
    const cam = up ? new THREE.Vector3(3.8, 2.3, 5.2) : new THREE.Vector3(1.8, 3.1, 2.0);
    camera.position.lerp(cam, Math.min(1, dt * 1.8));
    camera.lookAt(up ? 0.9 : -0.15, up ? 0.7 : 0.68, up ? 0.2 : -0.45);
  });
  return (
    <>
      <color attach="background" args={["#1c1917"]} />
      <ambientLight intensity={0.45} color="#ffe4c4" />
      {/* the sunrise through the window */}
      <directionalLight position={[-3, 3, -4]} intensity={2.2} color="#ffb070" />
      <pointLight position={[1.6, 1.3, -1.6]} intensity={6} distance={4} color="#ffd8a8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 9]} /><meshStandardMaterial color="#a8a29e" roughness={0.7} /></mesh>
      <mesh position={[0, 1.6, -2.2]}><planeGeometry args={[9, 3.2]} /><meshStandardMaterial color="#e7e0d5" /></mesh>
      <mesh position={[-3, 1.6, 0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#e2d9cc" /></mesh>
      <mesh position={[-2.98, 1.7, -0.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.8, 1.4]} /><meshStandardMaterial color="#fdba74" emissive="#fb923c" emissiveIntensity={1.4} /></mesh>
      {/* bed: frame, mattress, duvet, pillows, headboard */}
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[1.9, 0.44, 2.3]} /><meshStandardMaterial color="#57534e" /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.8, 0.16, 2.2]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
      <mesh position={[0, 0.6, 0.4]}><boxGeometry args={[1.84, 0.08, 1.35]} /><meshStandardMaterial color="#64748b" roughness={0.9} /></mesh>
      {[-0.4, 0.4].map((x) => <mesh key={x} position={[x, 0.64, -0.82]}><boxGeometry args={[0.72, 0.12, 0.42]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      <mesh position={[0, 0.95, -1.15]}><boxGeometry args={[1.9, 1.1, 0.1]} /><meshStandardMaterial color="#44403c" /></mesh>
      {/* nightstand with the phone and a lamp */}
      <mesh position={[1.35, 0.28, -0.9]}><boxGeometry args={[0.55, 0.56, 0.45]} /><meshStandardMaterial color="#78716c" /></mesh>
      <mesh position={[1.35, 0.57, -0.85]}><boxGeometry args={[0.1, 0.012, 0.19]} /><meshStandardMaterial ref={screen} color="#0f172a" emissive="#60a5fa" emissiveIntensity={1} /></mesh>
      <mesh position={[1.45, 0.75, -1.0]}><cylinderGeometry args={[0.1, 0.13, 0.25, 12]} /><meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.6} /></mesh>
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
    </>
  );
}

const KEY = (day: number) => `dl_morning:${day}`;
const STAMP_KEY = (day: number) => `dl_stamp_claimed:${day}`;

export function MorningScene() {
  const { citizen } = useCitizen();
  const life = useLifeLoop();
  const path = usePathname() ?? "";
  const { status } = useGoals(citizen?.id);
  const { missions } = useMissions(citizen?.id);
  const quality = useMemo(() => canvasQuality(), []);
  const up = useRef(0);
  const [show, setShow] = useState(false);
  const [awake, setAwake] = useState(false);
  const [stampClaimed, setStampClaimed] = useState(false);

  // Once a game day, on the map or at home, when nothing else is on screen.
  useEffect(() => {
    if (!missions || !status?.order || !/^\/(explore|home)\b/.test(path)) return;
    // Someone who has only just moved in hasn't slept here yet: their first morning is the next one.
    if (citizen?.createdAt && Date.now() - Date.parse(citizen.createdAt) < 6 * 3_600_000) return;
    let seen = false;
    try { seen = localStorage.getItem(KEY(missions.day)) === "1"; } catch { seen = true; }
    if (seen) return;
    const t = setTimeout(() => {
      if (!dialogOpen()) {
        setShow(true);
        try {
          localStorage.setItem(KEY(missions.day), "1");
          setStampClaimed(localStorage.getItem(STAMP_KEY(missions.day)) === "1");
        } catch { /* storage blocked */ }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [missions, status?.order, path, citizen?.createdAt]);

  useEffect(() => {
    if (!show) return;
    phoneRing();
    const t = setTimeout(() => { up.current = 1; setAwake(true); }, 2600);
    return () => clearTimeout(t);
  }, [show]);

  if (!show || !citizen) return null;
  const name = (citizen.username ?? "").replace(/^@/, "");
  const streak = Math.max(1, life?.streak ?? 1);
  const cycleDay = ((streak - 1) % 7) + 1;
  const todayStamp = STAMP_REWARDS[cycleDay - 1] ?? STAMP_REWARDS[0];
  const visa = life ? visaInfo(life.visaTier) : null;

  const claimStamp = () => {
    if (stampClaimed || !missions) return;
    setStampClaimed(true);
    adjustBalance(todayStamp.aed);
    gameAudio.playCoinSound();
    try { localStorage.setItem(STAMP_KEY(missions.day), "1"); } catch { /* blocked */ }
  };

  return (
    <div className="fixed inset-0 z-[204] bg-stone-900 text-white" role="dialog" aria-modal="true" aria-label="Good morning">
      <Canvas dpr={quality.dpr} camera={{ position: [1.9, 3.4, 2.2], fov: 50 }} className="!absolute inset-0">
        <PerfProbe scene="MorningScene" />
        <Bedroom look={citizen.look} upRef={up} />
      </Canvas>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 text-center pointer-events-none px-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">9:00 AM · Dubai · 🔥 {streak}-Day Streak</p>
        <p className="text-2xl font-black">{awake ? `Good morning${name ? `, ${name}` : ""} ☀️` : "📳 Bzzz…"}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[82dvh] overflow-y-auto">
        <div className="max-w-md mx-auto space-y-2.5">
          {awake && (
            <>
              {/* 7-Day Residency Stamp Card + Overnight Dubai Pulse */}
              <div className="rounded-[24px] bg-slate-950/90 backdrop-blur-xl border border-white/15 p-3.5 text-white shadow-2xl space-y-2.5 animate-[sheetUp_0.2s_ease-out]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">7-Day Dubai Residency Card</p>
                    <p className="text-xs text-slate-300">Day {cycleDay} of 7 · {todayStamp.label}</p>
                  </div>
                  {!stampClaimed ? (
                    <button
                      onClick={claimStamp}
                      className="px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs animate-pulse active:scale-95"
                    >
                      Claim +AED {todayStamp.aed}
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px]">
                      ✓ Stamp Claimed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {STAMP_REWARDS.map((r) => {
                    const done = r.day < cycleDay || (r.day === cycleDay && stampClaimed);
                    const current = r.day === cycleDay;
                    return (
                      <div
                        key={r.day}
                        className={`rounded-xl py-1.5 px-1 text-center border ${
                          current
                            ? "bg-amber-400/20 border-amber-400 text-amber-200"
                            : done
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        <div className="text-[9px] font-black">D{r.day}</div>
                        <div className="text-sm leading-tight my-0.5">{done ? "✅" : r.icon}</div>
                        <div className="text-[8px] font-bold truncate">{r.aed}</div>
                      </div>
                    );
                  })}
                </div>

                {life && (
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                    <span>🛂 {visa?.label ?? "Visa"}: <b className={life.visaDaysLeft <= 5 ? "text-rose-400" : "text-white"}>{life.visaTier === "GOLDEN" ? "10yr Golden" : `${life.visaDaysLeft}d left`}</b></span>
                    <span>💳 Living cost: <b className="text-amber-300">AED {life.daily}/day</b></span>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] bg-white text-slate-900 p-3.5 shadow-2xl animate-[sheetUp_0.25s_ease-out]">
                <DailyMissions onGo={() => setShow(false)} />
              </div>
            </>
          )}
          <button
            onClick={() => {
              if (!stampClaimed && awake) claimStamp();
              setShow(false);
            }}
            className="w-full h-12 rounded-2xl bg-amber-400 text-slate-950 font-black"
          >
            {awake ? (stampClaimed ? "Let's go" : `Collect +AED ${todayStamp.aed} & Start Day`) : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
