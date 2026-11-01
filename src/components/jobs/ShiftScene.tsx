"use client";

// Working your daily shift, in 3D: instead of a single button tap, you step onto the job floor for a fast,
// tactile 35-second mobile-friendly mini-game. Serve guests at the counter, check clients in, or dispatch
// orders by tapping the glowing action targets when customers walk up. Hit combos for a cash tip bonus +
// a 20% chance of a Dubai VIP Encounter (Royal / Crypto Whale / Talent Scout tip)!

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { ModalPortal } from "@/components/ui/modal-portal";
import { footstep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { adjustBalance, boostNeed, useCitizen } from "@/lib/citizenStore";
import { gainSkill, type SkillId } from "@/lib/life";
import { aed, companyIcon, ventureType, workShift, type MyJob } from "@/lib/economy";
import { usePresentCitizens } from "@/lib/presence";
import { gameAudio } from "@/utils/gameAudio";

interface StationOrder {
  slot: number; // 0 = left, 1 = center, 2 = right
  icon: string;
  label: string;
  vip: boolean;
  expiresAt: number;
  guestIdx: number;
}

const STATION_X = [-2.2, 0, 2.2] as const;

const SHIFT_THEMES: Record<string, {
  accent: string;
  wall: string;
  floor: string;
  items: Array<{ icon: string; label: string }>;
  skill: SkillId;
}> = {
  cafe: {
    accent: "#d97706",
    wall: "#292524",
    floor: "#e7e5e4",
    items: [
      { icon: "☕", label: "Saffron Karak" },
      { icon: "🥐", label: "Pistachio Croissant" },
      { icon: "🧋", label: "Iced Spanish Latte" },
      { icon: "🍰", label: "Kunafa Cheesecake" },
    ],
    skill: "cooking",
  },
  hospitality: {
    accent: "#0d9488",
    wall: "#0f172a",
    floor: "#f1f5f9",
    items: [
      { icon: "🔑", label: "Penthouse Keycard" },
      { icon: "🥂", label: "Welcome Mocktail" },
      { icon: "🧳", label: "VIP Suite Check-In" },
      { icon: "🛎️", label: "Concierge Booking" },
    ],
    skill: "charisma",
  },
  delivery: {
    accent: "#0284c7",
    wall: "#1e293b",
    floor: "#cbd5e1",
    items: [
      { icon: "🥡", label: "Downtown Express Bag" },
      { icon: "🍕", label: "Marina Hot Box" },
      { icon: "📦", label: "DIFC Courier Parcel" },
      { icon: "🍔", label: "JBR Late Night Order" },
    ],
    skill: "fitness",
  },
  corporate: {
    accent: "#4f46e5",
    wall: "#0f172a",
    floor: "#e2e8f0",
    items: [
      { icon: "📊", label: "Q4 Market Deck" },
      { icon: "💼", label: "Client Portfolio" },
      { icon: "⚖️", label: "Contract Brief" },
      { icon: "🩺", label: "Priority Case File" },
    ],
    skill: "hustle",
  },
};

function themeForJob(job: MyJob) {
  const v = `${job.venture} ${job.ventureType} ${job.title}`.toLowerCase();
  if (/cafe|karak|food|bistro|chef|barista|server/.test(v)) return SHIFT_THEMES.cafe;
  if (/delivery|metro|tour|driver|captain|yacht/.test(v)) return SHIFT_THEMES.delivery;
  if (/analytic|tech|health|court|police|doctor|lawyer|developer/.test(v)) return SHIFT_THEMES.corporate;
  return SHIFT_THEMES.hospitality;
}

function bannerTexture(icon: string, venture: string, title: string, accent: string) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = accent;
  g.fillRect(0, 0, 768, 160);
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.fillRect(0, 118, 768, 42);
  g.fillStyle = "#ffffff";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.font = "84px sans-serif";
  g.fillText(icon, 28, 66);
  g.font = "900 44px sans-serif";
  g.fillText(venture.slice(0, 22), 130, 54);
  g.fillStyle = "#fef08a";
  g.font = "700 24px sans-serif";
  g.fillText(`LIVE SHIFT · ${title.toUpperCase()}`, 132, 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Workplace3D({
  job,
  look,
  targetSlot,
  orders,
  servingSlot,
}: {
  job: MyJob;
  look?: AvatarLookProps;
  targetSlot: number;
  orders: StationOrder[];
  servingSlot: number | null;
}) {
  const theme = useMemo(() => themeForJob(job), [job]);
  const icon = companyIcon(job.venture) ?? ventureType(job.ventureType)?.icon ?? "💼";
  const sign = useMemo(() => bannerTexture(icon, job.venture, job.title, theme.accent), [icon, job.venture, job.title, theme.accent]);

  const meRef = useRef<THREE.Group>(null);
  const [myAnim, setMyAnim] = useState<AvatarAnimation>("idle");
  const stride = useRef(0);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = meRef.current;
    if (!g) return;
    const goalX = STATION_X[targetSlot] ?? 0;
    const dx = goalX - g.position.x;
    if (Math.abs(dx) > 0.06) {
      g.position.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 4.5);
      g.rotation.y = dx > 0 ? Math.PI * 0.35 : -Math.PI * 0.35;
      if (myAnim !== "walk") setMyAnim("walk");
      const before = Math.floor(stride.current);
      stride.current += dt * 3.2;
      if (Math.floor(stride.current) !== before) footstep("stone", 0.18);
    } else {
      g.position.x = goalX;
      g.rotation.y = 0;
      const want: AvatarAnimation = servingSlot === targetSlot ? "wave" : "idle";
      if (myAnim !== want) setMyAnim(want);
    }

    // Smooth dynamic mobile camera that tracks the player slightly from the front-above
    const camTarget = new THREE.Vector3(g.position.x * 0.35, 3.1, 5.4);
    camera.position.lerp(camTarget, Math.min(1, dt * 3.5));
    camera.lookAt(g.position.x * 0.25, 1.05, 0.2);
  });

  return (
    <>
      <color attach="background" args={[theme.wall]} />
      <hemisphereLight args={["#ffffff", "#94a3b8", 1.15]} />
      <directionalLight position={[4, 9, 6]} intensity={1.5} castShadow />
      <pointLight position={[0, 3.5, 1.2]} intensity={20} distance={10} color="#fff7ed" />

      {/* Floor & Back Wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color={theme.floor} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 2.6, -2.5]}>
        <planeGeometry args={[18, 5.5]} />
        <meshStandardMaterial color={theme.wall} roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.35, -2.42]}>
        <planeGeometry args={[6.4, 1.35]} />
        <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.22} />
      </mesh>

      {/* Main Service Counter with 3 glowing station pads */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.2, 0.96, 1.0]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <boxGeometry args={[6.35, 0.06, 1.12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
        </mesh>

        {STATION_X.map((x, idx) => {
          const order = orders.find((o) => o.slot === idx);
          const isServing = servingSlot === idx;
          return (
            <group key={idx} position={[x, 1.02, 0]}>
              {/* Station mat / tray */}
              <mesh>
                <cylinderGeometry args={[0.42, 0.45, 0.04, 24]} />
                <meshStandardMaterial
                  color={isServing ? "#22c55e" : order ? (order.vip ? "#f59e0b" : "#38bdf8") : "#475569"}
                  emissive={isServing ? "#22c55e" : order ? (order.vip ? "#f59e0b" : "#0ea5e9") : "#000000"}
                  emissiveIntensity={order || isServing ? 0.8 : 0}
                />
              </mesh>
              {/* 3D Prop on counter when an order is active */}
              {order && (
                <group position={[0, 0.16, 0]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.16, 0.13, 0.28, 16]} />
                    <meshStandardMaterial color={order.vip ? "#fbbf24" : "#ffffff"} metalness={order.vip ? 0.7 : 0.1} roughness={0.25} />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}
      </group>

      {/* Player Avatar behind the counter */}
      <group ref={meRef} position={[0, 0, -1.05]}>
        <Suspense fallback={null}>
          <CitizenAvatar look={look} animation={myAnim} />
        </Suspense>
      </group>

      {/* Customer Avatars in front of the counter for each active order */}
      {STATION_X.map((x, idx) => {
        const order = orders.find((o) => o.slot === idx);
        if (!order) return null;
        const guestLook = LOCALS[order.guestIdx % LOCALS.length].look;
        return (
          <group key={`${idx}-${order.guestIdx}`} position={[x, 0, 1.35]} rotation={[0, Math.PI, 0]}>
            <Suspense fallback={null}>
              <CitizenAvatar look={guestLook} animation={servingSlot === idx ? "clap" : "talk"} />
            </Suspense>
            {/* VIP Golden Halo ring on the floor */}
            {order.vip && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.48, 0.62, 28]} />
                <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

const SHIFT_DURATION = 28; // Fast, punchy 28-second shift

export function ShiftScene({
  job,
  look,
  onDone,
  onCancel,
}: {
  job: MyJob;
  look?: AvatarLookProps;
  onDone: (summary: { shifts: number; shiftsPerWeek: number; bonusAed: number; vipNote: string | null }) => void;
  onCancel: () => void;
}) {
  const quality = useMemo(() => canvasQuality(), []);
  const theme = useMemo(() => themeForJob(job), [job]);
  const [phase, setPhase] = useState<"playing" | "finishing" | "done">("playing");
  const [secsLeft, setSecsLeft] = useState(SHIFT_DURATION);
  const [targetSlot, setTargetSlot] = useState(1);
  const [servingSlot, setServingSlot] = useState<number | null>(null);
  const [orders, setOrders] = useState<StationOrder[]>([]);
  const [servedCount, setServedCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [tipsAed, setTipsAed] = useState(0);
  const [vipBonus, setVipBonus] = useState<{ aed: number; text: string } | null>(null);
  const [floatingText, setFloatingText] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<{ shifts: number; shiftsPerWeek: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { citizen } = useCitizen();
  const present = usePresentCitizens();
  const coopMultiplier = Math.min(1.6, 1 + Math.max(1, present.length) * 0.15);

  const shareCoworkerInvite = async () => {
    gameAudio.playClickSound();
    const refPart = citizen?.username ? `ref=${encodeURIComponent(citizen.username)}&` : "";
    const url = `${window.location.origin}/?${refPart}go=${encodeURIComponent("/jobs")}`;
    const text = `Come work shifts with me at ${job.venture} in Dubai Life! 💼 Each co-worker boosts venture revenue by +0.5× (up to 3×) and gives us Co-Op Tip Multipliers!`;
    if (navigator.share) {
      try { await navigator.share({ title: `${job.venture} · Dubai Life`, text, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Co-worker invite link copied!" }));
  };

  const guestSeq = useRef(1);

  // Spawn customers across the 3 counter slots
  useEffect(() => {
    if (phase !== "playing") return;
    const spawn = () => {
      setOrders((curr) => {
        if (curr.length >= 3) return curr;
        const freeSlots = [0, 1, 2].filter((s) => !curr.some((o) => o.slot === s));
        if (!freeSlots.length) return curr;
        const slot = freeSlots[Math.floor(Math.random() * freeSlots.length)];
        const item = theme.items[Math.floor(Math.random() * theme.items.length)];
        const vip = Math.random() < 0.25;
        guestSeq.current += 1;
        return [
          ...curr,
          {
            slot,
            icon: item.icon,
            label: item.label,
            vip,
            expiresAt: Date.now() + (vip ? 6500 : 8000),
            guestIdx: guestSeq.current * 7,
          },
        ];
      });
    };
    spawn();
    const iv = setInterval(spawn, 1900);
    return () => clearInterval(iv);
  }, [phase, theme.items]);

  // Countdown timer & expire missed orders
  useEffect(() => {
    if (phase !== "playing") return;
    const iv = setInterval(() => {
      const now = Date.now();
      setOrders((curr) => {
        const expired = curr.some((o) => now > o.expiresAt);
        if (expired) setCombo(0);
        return curr.filter((o) => now <= o.expiresAt);
      });
      setSecsLeft((s) => {
        if (s <= 1) {
          setPhase("finishing");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Settle the shift with the server when the timer completes
  useEffect(() => {
    if (phase !== "finishing") return;
    let mounted = true;
    (async () => {
      const r = await workShift();
      if (!mounted) return;
      if (r.error) {
        setErrorMsg(r.error);
        setPhase("done");
        return;
      }
      // Roll for a variable-ratio Dubai VIP Encounter (25% chance if served >= 4 orders)
      let vip: { aed: number; text: string } | null = null;
      if (servedCount >= 4 && Math.random() < 0.35) {
        const encounters = [
          { aed: 450, text: "🌟 A DIFC Royal Advisor loved your speed and left a crisp AED 450 tip!" },
          { aed: 600, text: "💎 A Crypto Whale in a G-Wagon tipped you AED 600 on the spot!" },
          { aed: 350, text: "🎬 A Dubai Marina influencer filmed your service — +AED 350 viral bonus!" },
        ];
        vip = encounters[Math.floor(Math.random() * encounters.length)];
        setVipBonus(vip);
      }
      const totalBonus = tipsAed + (vip?.aed ?? 0);
      if (totalBonus > 0) adjustBalance(totalBonus);
      gainSkill(theme.skill, 18 + Math.min(20, servedCount * 2));
      boostNeed("social", 12);
      gameAudio.playCoinSound();
      setServerResult({ shifts: r.data!.shifts, shiftsPerWeek: r.data!.shiftsPerWeek });
      setPhase("done");
    })();
    return () => {
      mounted = false;
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleServeSlot = (slot: number) => {
    if (phase !== "playing") return;
    setTargetSlot(slot);
    const order = orders.find((o) => o.slot === slot);
    if (!order) {
      gameAudio.playClickSound();
      return;
    }
    setServingSlot(slot);
    setTimeout(() => setServingSlot((s) => (s === slot ? null : s)), 450);
    setOrders((curr) => curr.filter((o) => o.slot !== slot));

    const nextCombo = combo + 1;
    const baseTip = order.vip ? 45 : 20;
    const earned = Math.round((baseTip + Math.min(40, (nextCombo - 1) * 5)) * coopMultiplier);
    setCombo(nextCombo);
    setServedCount((n) => n + 1);
    setTipsAed((t) => t + earned);
    setFloatingText(`${order.vip ? "👑 VIP " : ""}+AED ${earned}${nextCombo > 1 ? ` · ${nextCombo}× COMBO!` : ""} (${coopMultiplier.toFixed(2)}× Co-Op)`);
    gameAudio.playCoinSound();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[210] bg-slate-950 text-white select-none overflow-hidden" role="dialog" aria-modal="true" aria-label="Work shift in 3D">
        <Canvas dpr={quality.dpr} shadows={quality.shadows} camera={{ position: [0, 3.2, 5.5], fov: 48 }} className="!absolute inset-0">
          <Workplace3D job={job} look={look} targetSlot={targetSlot} orders={orders} servingSlot={servingSlot} />
        </Canvas>

        {/* Top Mobile HUD */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-xl">
            <span className="text-xl">{companyIcon(job.venture) ?? ventureType(job.ventureType)?.icon ?? "💼"}</span>
            <div>
              <div className="text-xs font-black leading-tight truncate max-w-[140px]">{job.venture}</div>
              <div className="text-[10px] font-bold text-emerald-400">{job.title} · 🔥 {coopMultiplier.toFixed(2)}× Co-Op</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-right">
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-300">Shift Tips</div>
              <div className="text-sm font-black text-amber-200 tabular-nums">+{aed(tipsAed)}</div>
            </div>
            <div className={`px-3.5 py-1.5 rounded-2xl backdrop-blur-md border font-black text-center ${secsLeft <= 7 ? "bg-rose-600/90 border-rose-400 animate-pulse" : "bg-slate-950/85 border-white/15"}`}>
              <div className="text-[9px] uppercase tracking-wider text-white/70">Time</div>
              <div className="text-sm tabular-nums">{secsLeft}s</div>
            </div>
          </div>
        </div>

        {/* Floating Combo & Tip Toast */}
        {floatingText && phase === "playing" && (
          <div key={servedCount} className="absolute top-24 inset-x-0 flex justify-center pointer-events-none animate-bounce">
            <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-lg">
              {floatingText}
            </span>
          </div>
        )}

        {/* Bottom Thumb-Friendly 3-Station Action Controls */}
        {phase === "playing" && (
          <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
            <div className="max-w-md mx-auto space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-300">
                <span>Tap glowing stations to serve customers!</span>
                <span className="text-emerald-300 font-black">Served: {servedCount} {combo > 1 ? `· 🔥 ${combo}×` : ""}</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[0, 1, 2].map((slot) => {
                  const order = orders.find((o) => o.slot === slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => handleServeSlot(slot)}
                      className={`relative h-24 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all active:scale-95 border-2 ${
                        order
                          ? order.vip
                            ? "bg-gradient-to-b from-amber-500 to-orange-600 border-yellow-300 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.5)]"
                            : "bg-gradient-to-b from-sky-500 to-blue-600 border-sky-300 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]"
                          : "bg-white/10 border-white/15 text-slate-400"
                      }`}
                    >
                      {order ? (
                        <>
                          {order.vip && (
                            <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                              👑 VIP 2× Tip
                            </span>
                          )}
                          <span className="text-3xl leading-none mb-1">{order.icon}</span>
                          <span className="text-[11px] font-black leading-tight line-clamp-2">{order.label}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl opacity-40">🛎️</span>
                          <span className="text-[10px] font-bold mt-1">Counter {slot + 1}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={onCancel} className="text-xs font-bold text-slate-400 px-2 py-1">
                  Cancel shift
                </button>
                <button
                  onClick={() => setPhase("finishing")}
                  className="text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-3 py-1.5 rounded-full"
                >
                  Finish & Clock Out Early ›
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shift Complete Modal Overlay */}
        {phase !== "playing" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              {phase === "finishing" ? (
                <div className="py-8 space-y-2">
                  <div className="text-4xl animate-bounce">💼</div>
                  <p className="font-black text-lg">Clocking out your shift…</p>
                </div>
              ) : errorMsg ? (
                <>
                  <div className="text-4xl">⚠️</div>
                  <p className="font-black text-lg text-rose-300">{errorMsg}</p>
                  <button onClick={onCancel} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black">
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="text-5xl">🎉</div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Shift Complete</p>
                    <h3 className="text-2xl font-black mt-0.5">{job.title}</h3>
                    <p className="text-xs text-slate-400">{job.venture}</p>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Weekly shifts</span>
                      <span className="font-black text-white">
                        {serverResult?.shifts ?? job.shifts + 1}/{serverResult?.shiftsPerWeek ?? job.shiftsPerWeek}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Customers served</span>
                      <span className="font-black text-white">{servedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Instant cash tips</span>
                      <span className="font-black text-emerald-400">+{aed(tipsAed)}</span>
                    </div>
                    {vipBonus && (
                      <div className="pt-2 border-t border-white/10 text-left">
                        <p className="text-xs font-black text-amber-300">{vipBonus.text}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={shareCoworkerInvite}
                    className="w-full h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-300 font-black text-xs active:scale-95 transition-transform"
                  >
                    📲 Recruit Co-Worker (+0.5× Venture Revenue)
                  </button>

                  <button
                    onClick={() =>
                      onDone({
                        shifts: serverResult?.shifts ?? job.shifts + 1,
                        shiftsPerWeek: serverResult?.shiftsPerWeek ?? job.shiftsPerWeek,
                        bonusAed: tipsAed + (vipBonus?.aed ?? 0),
                        vipNote: vipBonus?.text ?? null,
                      })
                    }
                    className="w-full h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black text-base active:scale-95 transition-transform"
                  >
                    Collect {tipsAed + (vipBonus?.aed ?? 0) > 0 ? `+${aed(tipsAed + (vipBonus?.aed ?? 0))} & ` : ""}Finish
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
