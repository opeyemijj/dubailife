"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { adjustBalance, boostNeed, useCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import { Shield, Flame, Zap, Trophy, X } from "lucide-react";

export interface BoxingOpponent {
  userId?: string;
  username: string;
  name: string;
  look?: AvatarLookProps;
}

interface CelebrityBoxingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponent: BoxingOpponent;
  initialPurse?: number;
  onBroadcastResult?: (summary: string) => void;
}

const PURSE_OPTIONS = [500, 2500, 10000, 50000];

function BoxingRing3D({
  myLook,
  oppLook,
  myAnim,
  oppAnim,
  myOffset,
  oppOffset,
}: {
  myLook?: AvatarLookProps;
  oppLook?: AvatarLookProps;
  myAnim: AvatarAnimation;
  oppAnim: AvatarAnimation;
  myOffset: number;
  oppOffset: number;
}) {
  return (
    <group>
      {/* Ring Canvas Mat */}
      <mesh position={[0, -0.92, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.16, 3.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.83, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.05, 32]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {/* 4 Corner Posts */}
      {(
        [
          [-2.05, 0, -1.45, "#ef4444"],
          [2.05, 0, -1.45, "#3b82f6"],
          [-2.05, 0, 1.45, "#f8fafc"],
          [2.05, 0, 1.45, "#f8fafc"],
        ] as const
      ).map(([x, , z, col], i) => (
        <mesh key={i} position={[x, -0.25, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.35, 12]} />
          <meshStandardMaterial color={col} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      {/* Ring Ropes */}
      {[-0.55, -0.25, 0.05].map((y, rIdx) => (
        <group key={rIdx} position={[0, y, 0]}>
          <mesh position={[0, 0, -1.45]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 4.1, 8]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
          <mesh position={[0, 0, 1.45]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 4.1, 8]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
        </group>
      ))}

      {/* Player Fighter (Left / Red Corner) */}
      <Suspense fallback={null}>
        <group position={[-0.75 + myOffset, -0.84, 0]} rotation={[0, Math.PI / 2, 0]}>
          <CitizenAvatar look={myLook} animation={myAnim} />
        </group>
        {/* Opponent Fighter (Right / Blue Corner) */}
        <group position={[0.75 + oppOffset, -0.84, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <CitizenAvatar
            look={oppLook ?? { gender: "man", preset: "Male_Adult_10" }}
            animation={oppAnim}
          />
        </group>
      </Suspense>
    </group>
  );
}

export function CelebrityBoxingModal({
  open,
  onOpenChange,
  opponent,
  initialPurse = 2500,
  onBroadcastResult,
}: CelebrityBoxingModalProps) {
  const { citizen } = useCitizen();
  const [stage, setStage] = useState<"lobby" | "fight" | "ko">("lobby");
  const [purse, setPurse] = useState(initialPurse);
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(30);
  const [myHp, setMyHp] = useState(100);
  const [oppHp, setOppHp] = useState(100);
  const [myStamina, setMyStamina] = useState(100);
  const [superMeter, setSuperMeter] = useState(0);
  const [guarding, setGuarding] = useState(false);
  const [dodging, setDodging] = useState(false);
  const [myAnim, setMyAnim] = useState<AvatarAnimation>("box");
  const [oppAnim, setOppAnim] = useState<AvatarAnimation>("box");
  const [myOffset, setMyOffset] = useState(0);
  const [oppOffset, setOppOffset] = useState(0);
  const [commentary, setCommentary] = useState("🔔 Touch gloves and come out swinging!");
  const [winner, setWinner] = useState<"me" | "opp" | null>(null);

  useEffect(() => {
    if (open) {
      setStage("lobby");
      setRound(1);
      setTimer(30);
      setMyHp(100);
      setOppHp(100);
      setMyStamina(100);
      setSuperMeter(0);
      setWinner(null);
      setMyAnim("box");
      setOppAnim("box");
      setCommentary("🔔 Touch gloves and come out swinging!");
    }
  }, [open]);

  // Round clock + stamina regen + AI/Opponent counter-attacks
  useEffect(() => {
    if (!open || stage !== "fight") return;
    const t = setInterval(() => {
      setMyStamina((s) => Math.min(100, s + 9));
      setTimer((sec) => {
        if (sec <= 1) {
          if (round < 3) {
            setRound((r) => r + 1);
            setMyHp((h) => Math.min(100, h + 12));
            setCommentary(`🔔 Round ${round + 1}! Corner team restores +12 HP!`);
            return 30;
          } else {
            // Judges' decision after 3 rounds
            const won = myHp >= oppHp;
            finishBout(won ? "me" : "opp");
            return 0;
          }
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage, round, myHp, oppHp]);

  // Opponent attack cadence every 1.35s
  useEffect(() => {
    if (!open || stage !== "fight") return;
    const ai = setInterval(() => {
      setOppOffset(-0.22);
      setTimeout(() => setOppOffset(0), 240);
      if (dodging) {
        setSuperMeter((m) => Math.min(100, m + 25));
        setCommentary(`💨 CLEAN SLIP! You dodged @${opponent.username}'s hook (+25% Super)!`);
        return;
      }
      const rawDmg = 6 + Math.floor(Math.random() * 8);
      const dmg = guarding ? Math.max(2, Math.round(rawDmg * 0.25)) : rawDmg;
      setMyHp((prev) => {
        const next = Math.max(0, prev - dmg);
        if (next <= 0) {
          finishBout("opp");
        }
        return next;
      });
      if (guarding) {
        setCommentary(`🛡️ Blocked @${opponent.username}'s punch (-${dmg} HP)`);
      } else {
        setCommentary(`💥 @${opponent.username} lands a combo (-${dmg} HP)!`);
      }
    }, 1350);
    return () => clearInterval(ai);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage, guarding, dodging, opponent.username]);

  const finishBout = (who: "me" | "opp") => {
    setStage("ko");
    setWinner(who);
    if (who === "me") {
      setMyAnim("dance");
      setOppAnim("sleep");
      adjustBalance(purse);
      boostNeed("fun", 35);
      gameAudio.playCoinSound();
      setCommentary(`🏆 KNOCKOUT VICTORY! You won AED ${purse.toLocaleString()} Purse!`);
      onBroadcastResult?.(
        `🥊🏆 Knocked out @${opponent.username} in Celebrity Boxing and won AED ${purse.toLocaleString()}!`
      );
    } else {
      setMyAnim("sleep");
      setOppAnim("dance");
      setCommentary(`😵 Down for the count! @${opponent.username} takes the belt.`);
      onBroadcastResult?.(
        `🥊 Went toe-to-toe with @${opponent.username} in the Celebrity Boxing Ring!`
      );
    }
  };

  const startFight = () => {
    if ((citizen?.balance ?? 0) < purse) {
      setCommentary(`⚠️ You need AED ${purse.toLocaleString()} in your wallet to stake this purse!`);
      return;
    }
    gameAudio.playClickSound();
    setStage("fight");
  };

  const throwPunch = (kind: "jab" | "cross" | "uppercut") => {
    if (stage !== "fight") return;
    const cost = kind === "jab" ? 12 : kind === "cross" ? 20 : 0;
    if (kind === "uppercut" && superMeter < 100) return;
    if (myStamina < cost) {
      setCommentary("😮‍💨 Low stamina! Hold Guard or Dodge to recover!");
      return;
    }
    gameAudio.playClickSound();
    setGuarding(false);
    setMyStamina((s) => Math.max(0, s - cost));
    setMyOffset(0.26);
    setTimeout(() => setMyOffset(0), 220);

    const dmg =
      kind === "jab"
        ? 8 + Math.floor(Math.random() * 5)
        : kind === "cross"
        ? 14 + Math.floor(Math.random() * 7)
        : 34;
    if (kind === "uppercut") {
      setSuperMeter(0);
    } else {
      setSuperMeter((m) => Math.min(100, m + (kind === "jab" ? 18 : 28)));
    }

    setOppHp((prev) => {
      const next = Math.max(0, prev - dmg);
      if (next <= 0) {
        finishBout("me");
      }
      return next;
    });

    setCommentary(
      kind === "uppercut"
        ? `🔥👑 DUBAI HAYMAKER UPPERCUT! -${dmg} HP on @${opponent.username}!`
        : kind === "cross"
        ? `💥 Heavy Right Cross lands flush (-${dmg} HP)!`
        : `👊 Snappy Left Jab connects (-${dmg} HP)!`
    );
  };

  const triggerDodge = () => {
    if (stage !== "fight" || dodging) return;
    gameAudio.playClickSound();
    setDodging(true);
    setMyOffset(-0.18);
    setTimeout(() => {
      setDodging(false);
      setMyOffset(0);
    }, 650);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 text-white border border-amber-500/30 shadow-2xl w-[95vw] max-w-2xl rounded-[32px] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-950/90 via-slate-900 to-blue-950/90 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              🥊 Coca-Cola Arena · Dubai Celebrity Boxing
            </div>
            <h2 className="text-base sm:text-lg font-black">
              @{citizen?.username ?? "you"} <span className="text-amber-400">VS</span> @{opponent.username}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              Purse: AED {purse.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HUD Bars */}
        <div className="px-4 pt-3 grid grid-cols-12 gap-2 items-center bg-slate-900/90">
          <div className="col-span-5 space-y-1">
            <div className="flex justify-between text-[11px] font-black">
              <span className="text-red-400">YOU</span>
              <span>{myHp} HP</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-all duration-200"
                style={{ width: `${myHp}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>⚡ Stamina {myStamina}%</span>
              <span className="text-amber-300">🔥 Super {superMeter}%</span>
            </div>
          </div>

          <div className="col-span-2 text-center">
            <div className="text-[10px] font-black text-amber-400 uppercase">RD {round}/3</div>
            <div className="text-lg font-black font-mono">{timer}s</div>
          </div>

          <div className="col-span-5 space-y-1">
            <div className="flex justify-between text-[11px] font-black">
              <span>{oppHp} HP</span>
              <span className="text-sky-400">@{opponent.username}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-l from-sky-500 to-indigo-400 transition-all duration-200 ml-auto"
                style={{ width: `${oppHp}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3D Boxing Ring Viewport */}
        <div className="relative h-64 sm:h-72 bg-gradient-to-b from-slate-900 to-black">
          <Canvas camera={{ position: [0, 0.9, 3.6], fov: 38 }}>
            <ambientLight intensity={1.1} />
            <spotLight position={[0, 5, 2]} intensity={3.5} angle={0.6} penumbra={0.5} />
            <pointLight position={[-2, 2, 1]} intensity={1.5} color="#ef4444" />
            <pointLight position={[2, 2, 1]} intensity={1.5} color="#3b82f6" />
            <StudioEnvironment intensity={0.5} />
            <BoxingRing3D
              myLook={citizen?.look}
              oppLook={opponent.look}
              myAnim={myAnim}
              oppAnim={oppAnim}
              myOffset={myOffset}
              oppOffset={oppOffset}
            />
            <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={1.1} maxPolarAngle={1.5} />
          </Canvas>
          <div className="absolute bottom-2 inset-x-3 text-center">
            <span className="inline-block bg-black/75 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-amber-200">
              {commentary}
            </span>
          </div>
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-950 border-t border-white/10 space-y-3">
          {stage === "lobby" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300">Select Fight Purse:</span>
                <div className="flex gap-1.5">
                  {PURSE_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurse(p)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition ${
                        purse === p ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300"
                      }`}
                    >
                      AED {p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={startFight}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-sm shadow-lg active:scale-98"
              >
                🔔 Touch Gloves & Start Round 1 (Purse: AED {purse.toLocaleString()})
              </button>
            </div>
          )}

          {stage === "fight" && (
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => throwPunch("jab")}
                className="py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex flex-col items-center gap-1 active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>Left Jab</span>
              </button>
              <button
                type="button"
                onClick={() => throwPunch("cross")}
                className="py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex flex-col items-center gap-1 active:scale-95"
              >
                <Flame className="w-4 h-4" />
                <span>Right Cross</span>
              </button>
              <button
                type="button"
                disabled={superMeter < 100}
                onClick={() => throwPunch("uppercut")}
                className="py-3 rounded-2xl bg-amber-400 disabled:opacity-35 text-slate-950 font-black text-xs flex flex-col items-center gap-1 active:scale-95"
              >
                <Trophy className="w-4 h-4" />
                <span>KO Uppercut</span>
              </button>
              <button
                type="button"
                onClick={triggerDodge}
                className="py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex flex-col items-center gap-1 active:scale-95"
              >
                <span>💨</span>
                <span>Slip / Weave</span>
              </button>
              <button
                type="button"
                onClick={() => setGuarding((g) => !g)}
                className={`py-3 rounded-2xl font-black text-xs flex flex-col items-center gap-1 active:scale-95 ${
                  guarding ? "bg-emerald-500 text-slate-950 ring-2 ring-white" : "bg-slate-800 text-slate-200"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{guarding ? "Guarding" : "High Guard"}</span>
              </button>
            </div>
          )}

          {stage === "ko" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStage("lobby");
                  setMyHp(100);
                  setOppHp(100);
                  setRound(1);
                  setTimer(30);
                  setMyAnim("box");
                  setOppAnim("box");
                }}
                className="flex-1 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                🥊 Rematch @{opponent.username}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-black text-xs"
              >
                Leave Ring {winner === "me" ? `(+AED ${purse.toLocaleString()})` : ""}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

