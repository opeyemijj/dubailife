"use client";

// Setting your goals: shown once to every signed-in player who hasn't made a plan yet (straight after signup
// for new players, on next login for everyone else), and again whenever they choose to change the order.
// Over the rooftop scene: a welcome, then the goals in order (a home and a job first, a license before a
// car), then "plan locked in" with the first goal's button.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Lock } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { DEFAULT_ORDER, goalClaimed, goalDone, goalOf, GOALS, orderProblem, setGoals, useGoals, type GoalId } from "@/lib/goals";
import { gameAudio } from "@/utils/gameAudio";

const PlanScene = dynamic(() => import("./PlanScene").then((m) => m.PlanScene), { ssr: false });

/** Open the goal order to change it (from the Goals page or the Next step card). */
export const openGoalSetup = () => window.dispatchEvent(new CustomEvent("dubai:goal-setup"));

// Not over signup, the landing page or the account screens.
const QUIET = /^\/($|onboarding|auth|reset-password|verify-email|s\/|admin)/;

export function GoalSetup() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "/";
  const { status } = useGoals(citizen?.id);
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState<"welcome" | "order" | "done">("welcome");
  const [order, setOrder] = useState<GoalId[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const open = () => { setEditing(true); setStage("order"); setOrder(null); setNote(null); };
    window.addEventListener("dubai:goal-setup", open);
    return () => window.removeEventListener("dubai:goal-setup", open);
  }, []);

  const firstTime = !!status && !status.order;
  // Stays up after locking in (the plan has been saved by then) until you leave the "plan locked in" card.
  if (!citizen?.id || !status || QUIET.test(path) || !(firstTime || editing || stage === "done")) return null;
  const list = order ?? status.order ?? DEFAULT_ORDER;
  const pinned = (id: string) => (GOALS.pinned as string[]).includes(id);

  const move = (i: number, d: -1 | 1) => {
    const next = list.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    const problem = orderProblem(next);
    if (problem) { setNote(problem); return; }
    gameAudio.playClickSound();
    setNote(null);
    setOrder(next);
  };
  const lock = async () => {
    setBusy(true);
    const r = await setGoals(list);
    setBusy(false);
    if (r.error) { setNote(r.error); return; }
    gameAudio.playCoinSound();
    setStage("done");
  };
  const close = () => { setEditing(false); setStage("welcome"); setOrder(null); };
  // The first goal still to do (a done one may be waiting to be collected, like your home).
  const first = list.map(goalOf).find((g) => !!g && !goalClaimed(status, g.id) && !goalDone(status, g));
  const toCollect = list.map(goalOf).find((g) => !!g && !goalClaimed(status, g.id) && goalDone(status, g));

  return (
    <div className="fixed inset-0 z-[205] bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label="Your Dubai plan">
      <PlanScene look={citizen.look} celebrating={stage === "done"} />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 top-[max(1rem,env(safe-area-inset-top))] flex flex-col justify-end p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md w-full mx-auto">
          {stage === "welcome" && (
            <div className="rounded-[28px] bg-white text-slate-900 p-5 space-y-3 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-teal-700">Your Dubai plan</p>
              <h2 className="text-2xl font-black leading-tight">What do you want from Dubai?</h2>
              <p className="text-sm text-slate-600">Most people who move here want a job first. Then a better one, a car, friends, savings, and maybe love. Put your goals in the order you want to live them.</p>
              <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-3">
                <span className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center"><Check className="w-5 h-5" /></span>
                <div className="text-sm"><b>Get a place to live</b><br /><span className="text-slate-600">Done: you moved in{citizen.home ? ` to ${citizen.home}` : ""}.</span></div>
              </div>
              <button onClick={() => { gameAudio.playClickSound(); setStage("order"); }} className="w-full h-12 rounded-2xl bg-teal-600 text-white font-black">Set my goals</button>
            </div>
          )}

          {stage === "order" && (
            <div className="rounded-[28px] bg-white text-slate-900 p-4 space-y-2 shadow-2xl max-h-[78vh] flex flex-col">
              <div className="px-1">
                <h2 className="text-xl font-black leading-tight">Put your goals in order</h2>
                <p className="text-xs text-slate-500">A home and a job come first. Move the rest with the arrows.</p>
              </div>
              <ol className="space-y-1.5 overflow-y-auto pr-1">
                {list.map((id, i) => {
                  const g = goalOf(id)!;
                  const done = goalClaimed(status, id) || goalDone(status, g);
                  const fixed = pinned(id);
                  return (
                    <li key={id} className={`flex items-center gap-2.5 rounded-2xl p-2 ${fixed ? "bg-teal-50" : "bg-slate-50"}`}>
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${done ? "bg-teal-600 text-white" : "bg-white text-teal-700 border border-teal-200"}`}>{done ? <Check className="w-4 h-4" /> : i + 1}</span>
                      <span className="text-lg">{g.icon}</span>
                      <span className="flex-1 min-w-0 text-sm font-bold leading-tight">{g.title}</span>
                      {fixed ? <Lock className="w-4 h-4 text-teal-600 mr-2" aria-label="Fixed" /> : (
                        <span className="flex gap-1">
                          <button aria-label={`Move ${g.title} up`} disabled={i <= GOALS.pinned.length} onClick={() => move(i, -1)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                          <button aria-label={`Move ${g.title} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs font-bold text-amber-700 min-h-4 px-1" aria-live="polite">{note}</p>
              <div className="flex gap-2">
                {editing && <button onClick={close} className="h-12 px-4 rounded-2xl bg-slate-100 font-black text-slate-700">Cancel</button>}
                <button onClick={lock} disabled={busy} className="flex-1 h-12 rounded-2xl bg-teal-600 text-white font-black disabled:opacity-60">{busy ? "Saving…" : editing && status.order ? "Save my order" : "Lock in my plan"}</button>
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="rounded-[28px] bg-white text-slate-900 p-5 space-y-3 shadow-2xl text-center">
              <p className="text-4xl">🎯</p>
              <h2 className="text-2xl font-black leading-tight">{editing && status.setAt ? "Plan updated" : "Plan locked in"}</h2>
              {!(editing && status.setAt) && <p className="text-sm font-black text-amber-600">+{GOALS.planXp} XP</p>}
              {first && <p className="text-sm text-slate-600">First up: <b>{first.icon} {first.title}</b>. {first.why}</p>}
              {toCollect && <p className="text-xs font-bold text-teal-700">🎁 {toCollect.title} is done: collect AED {toCollect.aed.toLocaleString()} from your goal card.</p>}
              <div className="flex gap-2">
                <button onClick={close} className="h-12 px-4 rounded-2xl bg-slate-100 font-black text-slate-700">Later</button>
                {first?.id === "job"
                  ? <Link href="/jobs" onClick={close} className="flex-1 h-12 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center">💼 Find a job</Link>
                  : <Link href="/goals" onClick={close} className="flex-1 h-12 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center">See my goals</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
