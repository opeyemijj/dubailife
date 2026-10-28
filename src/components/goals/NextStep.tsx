"use client";

// The goal you're on now, on the map and at home: a small pill ("Get a job · 1/3") that opens to the goal's
// steps, each with a button to go and do it, and the reward to collect when they're done. Sits under the
// first-day checklist while that's still running.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useFirstDayActive } from "@/components/life/FirstDay";
import { currentGoal, goalDone, lifeProgress, stepDone, useGoals } from "@/lib/goals";
import { gameAudio } from "@/utils/gameAudio";
import { GoalSteps } from "./GoalSteps";
import { DailyMissions } from "./DailyMissions";
import { collectable, useMissions } from "@/lib/missions";

export function NextStep() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const { status } = useGoals(citizen?.id);
  const firstDay = useFirstDayActive();
  const { missions } = useMissions(citizen?.id);
  const todo = missions ? missions.missions.filter((m) => !m.done).length : null;
  const [open, setOpen] = useState(false);
  const [won, setWon] = useState<{ aed: number; xp: number; next?: string } | null>(null);
  const atHome = path.startsWith("/home");
  if (!citizen?.id || !status?.order || !/^\/(explore|home)\b/.test(path)) return null;

  const goal = currentGoal(status);
  const done = goal ? goal.steps.filter((s) => stepDone(status, s)).length : 0;
  const ready = !!goal && goalDone(status, goal);
  // On the map it sits under the Search button (and the first-day checklist while that's running).
  const place = `fixed z-[59] w-[min(320px,calc(100vw-1.5rem))] flex flex-col ${atHome ? "right-3 items-end" : "left-3 items-start"} ${atHome ? (firstDay ? "top-[calc(env(safe-area-inset-top)+8.5rem)]" : "top-[calc(env(safe-area-inset-top)+5.25rem)]")
    : firstDay ? "top-[calc(env(safe-area-inset-top)+10.25rem)]" : "top-[calc(env(safe-area-inset-top)+7.5rem)]"}`;

  if (!goal) {
    return (
      <div className={place}>
        <Link href="/goals" className="flex items-center gap-2 h-11 pl-3 pr-4 rounded-full shadow-xl font-black text-sm bg-white text-slate-900">🏆 Every goal reached</Link>
      </div>
    );
  }

  return (
    <div className={place}>
      {!open ? (
        <button onClick={() => { gameAudio.playClickSound(); setOpen(true); }}
          className={`flex items-center gap-2 h-11 pl-3 pr-4 rounded-full shadow-xl font-black text-sm ${ready || collectable(missions) ? "bg-amber-400 text-slate-950 animate-bounce" : "bg-white text-slate-900"}`}>
          <span>{ready ? "🎁" : goal.icon}</span>
          {ready ? `${goal.title}: collect` : `${goal.title} · ${done}/${goal.steps.length}`}
          {todo !== null && <span className="ml-1 rounded-full bg-violet-600 text-white text-[10px] px-1.5 py-0.5">☀️ {3 - todo}/3</span>}
        </button>
      ) : (
        <div className="rounded-3xl bg-white text-slate-900 shadow-2xl p-4 space-y-2.5 w-full">
          <div className="flex items-start gap-2">
            <span className="text-2xl">{goal.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Your goal now</p>
              <p className="font-black leading-tight">{goal.title}</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Minimise"><ChevronDown className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-500">{goal.why}</p>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(done / goal.steps.length) * 100}%` }} /></div>
          <GoalSteps goal={goal} status={status} onGo={() => setOpen(false)}
            onClaimed={(r) => setWon({ ...r, next: currentGoal({ ...status, claimed: [...status.claimed, goal.id] })?.title })} />
          {won && (
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <p className="font-black text-amber-700">🎉 +AED {won.aed.toLocaleString()} · +{won.xp} XP</p>
              {won.next && <p className="text-xs text-slate-600">Next up: <b>{won.next}</b></p>}
            </div>
          )}
          <div className="border-t border-slate-100 pt-2.5"><DailyMissions onGo={() => setOpen(false)} /></div>
          <Link href="/goals" className="flex items-center justify-between text-xs font-black text-teal-700">
            <span>All my goals</span><span>Your Dubai story: {Math.round(lifeProgress(status) * 100)}%</span>
          </Link>
        </div>
      )}
    </div>
  );
}
