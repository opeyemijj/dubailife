"use client";

// The goal you're on now, on the map: a round icon with its progress ("1/3") that opens to the goal's
// steps, each with a button to go and do it, and the reward to collect when they're done.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { currentGoal, goalDone, lifeProgress, stepDone, useGoals } from "@/lib/goals";
import { gameAudio } from "@/utils/gameAudio";
import { GoalSteps } from "./GoalSteps";
import { DailyMissions } from "./DailyMissions";
import { WeekendCard } from "./FunGoals";
import { useFun } from "@/lib/fun";
import { collectable, useMissions } from "@/lib/missions";
import { RailButton, railTop } from "@/components/layout/mapRail";

export function NextStep() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const { status } = useGoals(citizen?.id);
  const { missions } = useMissions(citizen?.id);
  const todo = missions ? missions.missions.filter((m) => !m.done).length : null;
  // On Saturdays and Sundays the weekend card joins the goal and the missions.
  const { status: fun } = useFun(citizen?.id);
  const weekend = fun?.weekend.now && !fun.weekend.claimed ? fun : null;
  const [open, setOpen] = useState(false);
  const [won, setWon] = useState<{ aed: number; xp: number; next?: string } | null>(null);
  // On the maps only (Dubai's and Abu Dhabi's); at home your goal is in the Life panel's Goals tab.
  if (!citizen?.id || !status?.order || !/^\/(explore|abu-dhabi)\/?$/.test(path)) return null;

  const goal = currentGoal(status);
  const done = goal ? goal.steps.filter((s) => stepDone(status, s)).length : 0;
  const ready = !!goal && goalDone(status, goal);
  // The first of the map's round buttons down the left (layout/mapRail); opened, the panel starts there.
  const place = `fixed z-[59] w-[min(340px,calc(100vw-1.5rem))] flex flex-col left-3 items-start`;

  if (!goal) return <Link href="/goals" aria-label="Every goal reached" style={{ top: railTop(0) }} className="fixed left-3 z-[58] w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-2xl">🏆</Link>;

  return (
    <div className={place} style={{ top: railTop(0) }}>
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      {!open ? (
        // One round icon with its progress as a badge ("1/4"); it glows when there's a reward to collect.
        <RailButton n={0} icon={ready ? "🎁" : goal.icon} badge={ready ? "!" : `${done}/${goal.steps.length}`}
          label={ready ? `${goal.title}: collect your reward` : `Your goal: ${goal.title}, ${done} of ${goal.steps.length} done${todo !== null ? `; daily missions ${3 - todo} of 3` : ""}`}
          tone={ready || collectable(missions) ? "bg-amber-400 text-slate-950" : "bg-white text-slate-900"} alert={ready || collectable(missions)}
          onClick={() => { gameAudio.playClickSound(); setOpen(true); }} />
      ) : (
        <div className="rounded-3xl bg-white text-slate-900 shadow-2xl p-4 space-y-2.5 w-full max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-9rem)] overflow-y-auto overscroll-contain">
          <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 -mx-4 -mt-4 px-4 pt-4 pb-2 border-b border-slate-100 flex items-start gap-2 rounded-t-3xl shadow-sm">
            <span className="text-2xl">{goal.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Your goal now</p>
              <p className="font-black leading-tight text-sm sm:text-base">{goal.title}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Minimise"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 pt-1">{goal.why}</p>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(done / goal.steps.length) * 100}%` }} />
          </div>
          <GoalSteps
            goal={goal}
            status={status}
            onGo={() => setOpen(false)}
            onClaimed={(r) => setWon({ ...r, next: currentGoal({ ...status, claimed: [...status.claimed, goal.id] })?.title })}
          />
          {won && (
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <p className="font-black text-amber-700">🎉 +AED {won.aed.toLocaleString()} · +{won.xp} XP</p>
              {won.next && <p className="text-xs text-slate-600">Next up: <b>{won.next}</b></p>}
            </div>
          )}
          <div className="border-t border-slate-100 pt-2.5">
            <DailyMissions onGo={() => setOpen(false)} />
          </div>
          {weekend && <WeekendCard status={weekend} />}
          <div className="border-t border-slate-100 pt-2 pb-1">
            <Link href="/goals" className="flex items-center justify-between text-xs font-black text-teal-700 hover:text-teal-800">
              <span>All my goals ›</span>
              <span>Your Dubai story: {Math.round(lifeProgress(status) * 100)}%</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
