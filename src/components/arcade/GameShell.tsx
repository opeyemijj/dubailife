"use client";

// The frame every attraction game runs in, full screen: an intro card (how to play, your best, level and streak,
// this week's top three) while the game's heavy parts load, the 3-2-1 countdown, pause (button or Esc), and the
// result card, which records the round (src/lib/arcade.ts) and shows the stars, any new best and the AED paid.
// "Again" remounts the game for a fresh round.

import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play, Share2, Trophy, X } from "lucide-react";
import { arcadeGame, fetchLeaderboard, recordGameResult, useGameProgress, type ArcadeGameId, type Leaderboard, type RoundOutcome } from "@/lib/arcade";
import { sfx } from "@/utils/gameAudio";
import { Countdown, Stars } from "./hud";
import { resetStage, stageFx } from "./stage";

export interface RoundResult {
  score: number;
  stars: number;
  /** The level this round was played at (or reached). */
  level?: number;
  /** A big line on the result card ("KNOCKOUT in round 2!"). */
  headline?: string;
  stats?: Array<{ label: string; value: string }>;
  /** What sharing says ("I knocked out @sam in round 2 at Coca-Cola Arena"). */
  share?: string;
}

export type ShellPhase = "countdown" | "play" | "paused";

/** Rounds already ended (this shell's id and the round number), so a game calling finish twice records it once. */
const finishedRounds = new Set<string>();
let shellCount = 0;

export interface ShellApi {
  phase: ShellPhase;
  /** The level picked on the intro card (1 if the game has no levels). */
  level: number;
  /** End the round. */
  finish: (r: RoundResult) => void;
}

export function GameShell({ game, title, venue, howTo, preload, levels, onClose, onShare, intro, onLevel, blocked, children }: {
  game: ArcadeGameId;
  title: string;
  /** Where it's played ("Coca-Cola Arena"). */
  venue?: string;
  howTo: Array<{ icon: string; text: string }>;
  /** Fetches what the game needs before Play (the physics engine, models), so the countdown never waits. */
  preload?: () => Promise<unknown>;
  /** Levels to pick from on the intro card; levels above the player's reached level + 1 are locked. */
  levels?: Array<{ n: number; label: string }>;
  onClose: () => void;
  onShare?: (text: string) => void;
  /** Game-specific content on the intro card, above the Play button (an opponent card, a glove picker…). */
  intro?: ReactNode;
  /** Why the game can't be played right now (shown in place of Play), e.g. "You're not expecting a baby". */
  blocked?: string | null;
  /** Told when the player picks a level on the intro card. */
  onLevel?: (n: number) => void;
  /** The game: its GameStage and its own HUD. */
  children: (api: ShellApi) => ReactNode;
}) {
  const info = arcadeGame(game);
  const progress = useGameProgress(game);
  const [stage, setStage] = useState<"intro" | ShellPhase | "result">("intro");
  const [ready, setReady] = useState(!preload);
  const [round, setRound] = useState(0);
  // The level picked on the intro card; until one is picked, the highest unlocked.
  const [picked, setPicked] = useState<number | null>(null);
  // Unique for every opening of a game (useId repeats when the same game is closed and opened again).
  const [shellId] = useState(() => ++shellCount);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);

  // Load the heavy parts and this week's board while the intro card is up.
  useEffect(() => {
    let live = true;
    void fetchLeaderboard(game).then((b) => { if (live) setBoard(b); });
    if (preload) void preload().catch(() => undefined).then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [game, preload]);

  // No page scroll behind the game; Esc pauses and resumes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setStage((s) => (s === "play" ? "paused" : s === "paused" ? "play" : s));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { stageFx.paused = stage !== "play"; }, [stage]);

  const start = () => {
    resetStage();
    setResult(null);
    setOutcome(null);
    setRound((r) => r + 1);
    setStage("countdown");
    sfx("tap");
  };

  const unlocked = Math.max(1, progress.level + 1);
  const level = picked ?? Math.min(unlocked, levels?.length ?? 1);

  const finish = (r: RoundResult) => {
    const key = `${shellId}:${round}`;
    if (finishedRounds.has(key)) return;
    finishedRounds.add(key);
    setResult(r);
    setStage("result");
    sfx(r.stars >= 2 ? "win" : r.stars === 1 ? "chime" : "lose");
    void recordGameResult(game, r.score, r.stars, r.level ?? level).then((o) => {
      setOutcome(o);
      if (o.reward > 0) sfx("cash");
      void fetchLeaderboard(game).then(setBoard);
    });
  };

  const share = (text: string) => {
    if (onShare) return onShare(text);
    if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text }).catch(() => undefined);
  };

  const playing = stage === "countdown" || stage === "play" || stage === "paused" || stage === "result";

  return (
    <div className="fixed inset-0 z-[400] bg-black text-white select-none" role="dialog" aria-modal="true" aria-label={title}>
      {playing && (
        <div key={round} className="absolute inset-0">
          {children({ phase: stage === "result" ? "paused" : (stage as ShellPhase), level, finish })}
        </div>
      )}

      {stage === "countdown" && <Countdown onDone={() => setStage("play")} />}

      {(stage === "play" || stage === "countdown") && (
        <button
          onClick={() => setStage("paused")}
          aria-label="Pause"
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 w-10 h-10 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
        >
          <Pause className="w-5 h-5" />
        </button>
      )}

      {stage === "paused" && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xs space-y-2.5 text-center">
            <p className="text-2xl font-black mb-3">Paused</p>
            <button onClick={() => setStage("play")} className="w-full h-12 rounded-2xl bg-emerald-500 text-emerald-950 font-black flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Resume</button>
            <button onClick={start} className="w-full h-12 rounded-2xl bg-white/10 font-black">Restart</button>
            <button onClick={onClose} className="w-full h-12 rounded-2xl bg-white/10 font-black">Quit</button>
          </div>
        </div>
      )}

      {stage === "intro" && (
        <div className="absolute inset-0 z-40 overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-950 to-black">
          <div className="min-h-full flex flex-col justify-end sm:justify-center max-w-md mx-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] gap-4">
            <button onClick={onClose} aria-label="Close" className="self-end w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            <div>
              <div className="text-5xl mb-2">{info.icon}</div>
              {venue && <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">{venue}</p>}
              <h2 className="text-3xl font-black leading-tight">{title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/5 p-2.5"><p className="text-[10px] uppercase font-black text-white/50">Best</p><p className="text-lg font-black tabular-nums">{progress.best.toLocaleString()}</p></div>
              <div className="rounded-2xl bg-white/5 p-2.5"><p className="text-[10px] uppercase font-black text-white/50">Level</p><p className="text-lg font-black">{progress.level || "–"}</p></div>
              <div className="rounded-2xl bg-white/5 p-2.5"><p className="text-[10px] uppercase font-black text-white/50">Streak</p><p className="text-lg font-black">{progress.streak ? `🔥 ${progress.streak}` : "–"}</p></div>
            </div>
            <ul className="space-y-1.5">
              {howTo.map((h) => (
                <li key={h.text} className="flex gap-2.5 items-start text-sm text-white/85"><span className="text-lg leading-5">{h.icon}</span><span>{h.text}</span></li>
              ))}
            </ul>
            {levels && levels.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {levels.map((l) => {
                  const locked = l.n > unlocked;
                  return (
                    <button key={l.n} disabled={locked} onClick={() => { setPicked(l.n); onLevel?.(l.n); }}
                      className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs font-black border ${level === l.n ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-white/5 border-white/10"} ${locked ? "opacity-35" : ""}`}>
                      <span className="block text-[10px] opacity-70">{locked ? "🔒" : `Level ${l.n}`}</span>{l.label}
                    </button>
                  );
                })}
              </div>
            )}
            {intro}
            <LeaderboardMini board={board} />
            {blocked
              ? <p className="rounded-2xl bg-white/10 p-4 text-center text-sm font-bold">{blocked}</p>
              : (
                <button onClick={start} disabled={!ready}
                  className="h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 text-lg font-black shadow-lg shadow-orange-500/30 disabled:opacity-60 active:scale-[0.98] transition-transform">
                  {ready ? "Play" : "Loading…"}
                </button>
              )}
            <p className="text-center text-[11px] text-white/45">Up to AED {info.dailyCap.toLocaleString()} a day · {progress.earnedToday ? `AED ${progress.earnedToday.toLocaleString()} earned today` : "nothing earned yet today"}</p>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex flex-col justify-end sm:justify-center max-w-md mx-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] gap-3 text-center">
            <Stars n={result.stars} size="text-5xl justify-center" />
            {result.headline && <p className="text-2xl font-black leading-tight">{result.headline}</p>}
            <p className="text-5xl font-black tabular-nums">{result.score.toLocaleString()}</p>
            {outcome?.isBest && <p className="mx-auto rounded-full bg-amber-400 text-amber-950 px-3 py-1 text-xs font-black">🏆 New personal best</p>}
            {result.stats && (
              <div className="grid grid-cols-3 gap-2">
                {result.stats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/5 p-2"><p className="text-[10px] uppercase font-black text-white/50">{s.label}</p><p className="font-black">{s.value}</p></div>
                ))}
              </div>
            )}
            <p className="text-sm font-black text-emerald-300 min-h-5">
              {!outcome ? "Saving…" : outcome.reward > 0 ? `+AED ${outcome.reward.toLocaleString()}` : outcome.capped ? "Today's AED limit for this game is reached" : ""}
              {outcome && outcome.streak > 1 ? ` · 🔥 ${outcome.streak}-day streak` : ""}
            </p>
            <LeaderboardMini board={board} />
            <div className="grid grid-cols-3 gap-2">
              <button onClick={onClose} className="h-12 rounded-2xl bg-white/10 font-black">Done</button>
              <button onClick={() => share(result.share ?? `I scored ${result.score.toLocaleString()} in ${title} on Dubai Life`)} className="h-12 rounded-2xl bg-white/10 font-black flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" /> Share</button>
              <button onClick={start} className="h-12 rounded-2xl bg-amber-400 text-amber-950 font-black">Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardMini({ board }: { board: Leaderboard | null }) {
  if (!board || !board.top.length) return null;
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-left">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> This week</p>
      {board.top.slice(0, 3).map((r) => (
        <div key={r.username} className="flex justify-between text-sm py-0.5"><span className="font-bold truncate">{["🥇", "🥈", "🥉"].at(r.place - 1) ?? `${r.place}.`} @{r.username}</span><span className="font-black tabular-nums">{r.score.toLocaleString()}</span></div>
      ))}
      {board.me && board.me.place > 3 && <div className="flex justify-between text-sm pt-1 mt-1 border-t border-white/10 text-amber-300"><span className="font-bold">{board.me.place}. You</span><span className="font-black tabular-nums">{board.me.score.toLocaleString()}</span></div>}
    </div>
  );
}
