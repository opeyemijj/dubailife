"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Trophy, Flame, Zap, Coffee, Music, Camera, Check, X, Dumbbell, Award, Compass, Heart } from "lucide-react";
import type { VenueActivity } from "@/lib/city/types";
import { gameAudio } from "@/utils/gameAudio";

export type ActivityCategory = "dance" | "workout" | "taste" | "explore";

export interface ActivityExperienceProps {
  activity: VenueActivity;
  venueName: string;
  onActionHit: (category: ActivityCategory, rating: "perfect" | "great" | "good") => void;
  onFinish: (stats: { score: number; maxCombo: number; stars: number }) => void;
  onClose: () => void;
}

export function detectActivityCategory(a: VenueActivity): ActivityCategory {
  const text = `${a.id} ${a.label} ${a.desc ?? ""}`.toLowerCase();
  if (a.animation === "dance" || /dance|beat|party|music|dj|show|concert|cheer|sing|karaoke/i.test(text)) {
    return "dance";
  }
  if (/workout|jog|run|calisthenics|fitness|skate|swim|kitesurf|bike|spin|stretch|gym/i.test(text)) {
    return "workout";
  }
  if (/taste|coffee|karak|luqaimat|burger|dine|tea|croissant|food|pizza|drink|sip|cocktail|spritz|salmon|indomie|meal/i.test(text)) {
    return "taste";
  }
  return "explore";
}

export function ActivityExperienceOverlay({
  activity,
  venueName,
  onActionHit,
  onFinish,
  onClose,
}: ActivityExperienceProps) {
  const category = detectActivityCategory(activity);

  // Experience session state
  const [stage, setStage] = useState<"intro" | "playing" | "summary">("intro");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; key: number } | null>(null);
  const [progress, setProgress] = useState(0); // 0 to 100%

  // Mini-game specific values
  // Mode A: Dance Beat Ring Pulse (0 to 1 scale)
  const [beatPulse, setBeatPulse] = useState(0);
  // Mode B: Workout Power Needle (0 to 100%)
  const [needlePos, setNeedlePos] = useState(20);
  const needleDir = useRef<"up" | "down">("up");
  // Mode C: Taste actions count
  const [tasteReps, setTasteReps] = useState(0);

  // Intro countdown
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (stage !== "intro") return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setStage("playing");
          gameAudio.playConfirmSound();
          return 0;
        }
        gameAudio.playClickSound();
        return c - 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [stage]);

  // Main game loops
  useEffect(() => {
    if (stage !== "playing") return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // 1. Dance Beat Pulse (approx 124 BPM)
      if (category === "dance") {
        setBeatPulse((p) => (p + dt * 1.85) % 1);
      }

      // 2. Workout Needle Oscillation (sweeps back and forth)
      if (category === "workout") {
        setNeedlePos((prev) => {
          let next = prev + (needleDir.current === "up" ? 1 : -1) * dt * 90;
          if (next >= 100) {
            next = 100;
            needleDir.current = "down";
          } else if (next <= 0) {
            next = 0;
            needleDir.current = "up";
          }
          return next;
        });
      }

      // Progress bar advancing slowly over time if idle
      setProgress((p) => {
        const next = p + dt * 2.5;
        if (next >= 100) {
          triggerSummary();
          return 100;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [stage, category]);

  const triggerSummary = useCallback(() => {
    setStage("summary");
    gameAudio.playCoinSound();
    const finalStars = score >= 500 ? 3 : score >= 200 ? 2 : 1;
    onFinish({ score, maxCombo, stars: finalStars });
  }, [score, maxCombo, onFinish]);

  // Handle player interactions
  const handleAction = useCallback(() => {
    if (stage !== "playing") return;

    let rating: "perfect" | "great" | "good" = "good";
    let pts = 50;

    if (category === "dance") {
      // Beat ring is between 0.75 and 0.95 for perfect hit
      if (beatPulse >= 0.78 && beatPulse <= 0.94) {
        rating = "perfect";
        pts = 100;
      } else if (beatPulse >= 0.65 && beatPulse <= 0.98) {
        rating = "great";
        pts = 65;
      } else {
        rating = "good";
        pts = 35;
      }
    } else if (category === "workout") {
      // Green sweet spot is between 65% and 85%
      if (needlePos >= 68 && needlePos <= 82) {
        rating = "perfect";
        pts = 100;
      } else if (needlePos >= 55 && needlePos <= 92) {
        rating = "great";
        pts = 65;
      } else {
        rating = "good";
        pts = 35;
      }
    } else if (category === "taste") {
      setTasteReps((r) => r + 1);
      rating = "perfect";
      pts = 75;
    } else {
      rating = "great";
      pts = 60;
    }

    // Audio & Combo multiplier
    if (rating === "perfect") {
      gameAudio.playConfirmSound();
      setFeedback({ text: "PERFECT! 🔥", color: "text-amber-300", key: Date.now() });
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
    } else if (rating === "great") {
      gameAudio.playClickSound();
      setFeedback({ text: "GREAT! ✨", color: "text-emerald-300", key: Date.now() });
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
    } else {
      gameAudio.playClickSound();
      setFeedback({ text: "NICE! 👍", color: "text-sky-300", key: Date.now() });
      setCombo(0);
    }

    const multiplier = 1 + Math.min(3, Math.floor(combo / 3) * 0.5);
    setScore((s) => s + Math.round(pts * multiplier));
    setProgress((p) => Math.min(100, p + 12));

    onActionHit(category, rating);
  }, [stage, category, beatPulse, needlePos, combo, onActionHit]);

  // Spacebar keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleAction();
      } else if (e.code === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction, onClose]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-3 sm:p-6 select-none font-sans">
      {/* 1. TOP HEADER BANNER */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-slate-950/85 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
          <span className="text-2xl animate-bounce">{activity.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white leading-tight">{activity.label}</h2>
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full">
                3D Interactive Experience
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{venueName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stage === "playing" && (
            <button
              onClick={triggerSummary}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs px-3.5 py-2 rounded-2xl shadow-lg border border-emerald-400 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finish Early</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
            title="Exit Activity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CENTER STAGE COUNTDOWN (INTRO) */}
      {stage === "intro" && (
        <div className="my-auto mx-auto pointer-events-auto text-center space-y-3 animate-in zoom-in-75 duration-300">
          <div className="text-7xl sm:text-8xl font-black text-amber-400 drop-shadow-[0_8px_30px_rgba(251,191,36,0.6)] animate-pulse">
            {countdown > 0 ? countdown : "GO!"}
          </div>
          <div className="bg-slate-950/80 backdrop-blur-md px-5 py-2 rounded-full text-white text-xs sm:text-sm font-bold border border-white/10 shadow-xl">
            {category === "dance" ? "🎵 Tap to the beat when the rings align!" : category === "workout" ? "💪 Tap power reps in the green zone!" : "✨ Savor the authentic experience!"}
          </div>
        </div>
      )}

      {/* 3. DYNAMIC FLOATING FEEDBACK POPUP */}
      {stage === "playing" && feedback && (
        <div
          key={feedback.key}
          className="my-auto mx-auto pointer-events-none text-center animate-in zoom-in-90 fade-out duration-500"
        >
          <span className={`text-3xl sm:text-4xl font-black tracking-wider ${feedback.color} drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]`}>
            {feedback.text}
          </span>
          {combo > 1 && (
            <div className="text-sm font-black text-amber-300 drop-shadow mt-1">
              🔥 {combo}x COMBO!
            </div>
          )}
        </div>
      )}

      {/* 4. SUMMARY MODAL CARD (FINISHED) */}
      {stage === "summary" && (
        <div className="my-auto mx-auto pointer-events-auto w-full max-w-sm bg-slate-950/95 backdrop-blur-2xl border-2 border-amber-400/80 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-400 space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mx-auto flex items-center justify-center text-3xl shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">
              EXPERIENCE COMPLETED
            </div>
            <h3 className="text-xl font-black text-white leading-tight">{activity.label}</h3>
            <p className="text-xs text-slate-400 mt-1">{venueName}</p>
          </div>

          {/* Star Rating */}
          <div className="flex items-center justify-center gap-1.5 text-2xl text-amber-400 py-1">
            <span>⭐</span>
            <span>⭐</span>
            <span>{score >= 350 ? "⭐" : "✨"}</span>
          </div>

          {/* Score & Combo Breakdown */}
          <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-2xl p-3 text-left">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Final Score</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Max Combo</div>
              <div className="text-lg font-black text-amber-300 font-mono">{maxCombo}x 🔥</div>
            </div>
          </div>

          {/* Rewards Received */}
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-2.5 text-xs text-emerald-200 font-bold flex items-center justify-around">
            {activity.reward && activity.reward > 0 && (
              <span className="flex items-center gap-1 text-amber-300 font-black">
                <span>🪙</span> +{activity.reward} AED
              </span>
            )}
            {activity.need && (
              <span className="flex items-center gap-1 text-emerald-300 font-black">
                <span>✨</span> +{activity.need.amount} {activity.need.kind}
              </span>
            )}
            <span className="flex items-center gap-1 text-sky-300 font-black">
              <span>🌟</span> +20 XP
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl transition-all active:scale-95"
          >
            Collect Rewards & Continue
          </button>
        </div>
      )}

      {/* 5. BOTTOM INTERACTIVE GAME CONTROLS (PLAYING STAGE) */}
      {stage === "playing" && (
        <div className="w-full max-w-md mx-auto pointer-events-auto space-y-2">
          {/* Progress & Multiplier bar */}
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-black">Score</span>
              <span className="font-mono font-black text-emerald-400">{score}</span>
            </div>
            {/* Progress bar */}
            <div className="w-32 bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-1 font-mono font-black text-amber-300">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>{combo}x</span>
            </div>
          </div>

          {/* GAME CONTROLLER BY CATEGORY */}
          {category === "dance" && (
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
              {/* Expanding Rhythm Ring Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Target Sweet Spot Ring */}
                <div className="absolute inset-1 rounded-full border-4 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] animate-pulse" />
                {/* Expanding Pulse Ring */}
                <div
                  className="absolute rounded-full border-4 border-emerald-400 transition-transform duration-75"
                  style={{
                    width: `${Math.round(24 + beatPulse * 72)}px`,
                    height: `${Math.round(24 + beatPulse * 72)}px`,
                    opacity: 1 - beatPulse * 0.4,
                  }}
                />
                <span className="text-3xl animate-bounce">💃</span>
              </div>

              <button
                onClick={handleAction}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 hover:opacity-95 active:scale-95 text-white font-black text-base shadow-[0_8px_30px_rgba(217,70,239,0.5)] border border-white/30 transition-all flex items-center justify-center gap-2"
              >
                <Music className="w-5 h-5 animate-spin" />
                <span>HIT THE BEAT!</span>
                <span className="text-[10px] text-white/80 font-normal bg-black/30 px-2 py-0.5 rounded-full hidden sm:inline">Spacebar</span>
              </button>
            </div>
          )}

          {category === "workout" && (
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
              {/* Needle Power Gauge */}
              <div className="w-full relative h-7 bg-slate-900 border border-white/20 rounded-full overflow-hidden flex items-center">
                {/* Optimal Power Green Zone (65% to 85%) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/60 border-x-2 border-emerald-300"
                  style={{ left: "65%", width: "20%" }}
                />
                {/* Moving Needle */}
                <div
                  className="absolute top-0 bottom-0 w-3 bg-amber-400 shadow-[0_0_12px_#fbbf24] rounded-full transition-all duration-75"
                  style={{ left: `${needlePos}%`, transform: "translateX(-50%)" }}
                />
              </div>

              <button
                onClick={handleAction}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 hover:opacity-95 active:scale-95 text-slate-950 font-black text-base shadow-[0_8px_30px_rgba(249,115,22,0.5)] border border-white/30 transition-all flex items-center justify-center gap-2"
              >
                <Dumbbell className="w-5 h-5" />
                <span>POWER STRIDE / REP!</span>
                <span className="text-[10px] text-slate-900 font-bold bg-white/40 px-2 py-0.5 rounded-full hidden sm:inline">Spacebar</span>
              </button>
            </div>
          )}

          {category === "taste" && (
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-3.5 rounded-3xl shadow-2xl flex items-center justify-between gap-2">
              <button
                onClick={handleAction}
                className="flex-1 py-3 px-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg border border-amber-300/40 transition-all flex items-center justify-center gap-1.5"
              >
                <Coffee className="w-4 h-4" />
                <span>Savor Sip ({tasteReps})</span>
              </button>

              <button
                onClick={handleAction}
                className="flex-1 py-3 px-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg border border-emerald-300/40 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Relish Flavor</span>
              </button>

              <button
                onClick={handleAction}
                className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs shadow-md border border-white/10 transition-all flex items-center justify-center gap-1"
                title="Foodie Story Snapshot"
              >
                <Camera className="w-4 h-4 text-sky-400" />
              </button>
            </div>
          )}

          {category === "explore" && (
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-3.5 rounded-3xl shadow-2xl flex items-center gap-2">
              <button
                onClick={handleAction}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg border border-sky-300/40 transition-all flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 animate-spin" />
                <span>DISCOVER & INTERACT</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

