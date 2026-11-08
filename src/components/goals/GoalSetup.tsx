"use client";

// Setting your goals: shown once to every signed-in player who hasn't made a plan yet (straight after signup
// for new players, on next login for everyone else), and again whenever they choose to change the order.
// Over the rooftop scene: straight to the goals in order (a home and a job first, a license before a car),
// then a new plan heads straight out to the city. New players see it once they've decorated.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Lock, X } from "lucide-react";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";
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
  const router = useRouter();
  const { status } = useGoals(citizen?.id);
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<GoalId[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const open = () => { setEditing(true); setOrder(null); setNote(null); setDismissed(false); };
    window.addEventListener("dubai:goal-setup", open);
    return () => window.removeEventListener("dubai:goal-setup", open);
  }, []);

  const firstTime = !!status && !status.order;
  // A new player decorates first (src/components/home/MoveInGuide.tsx); the goals follow.
  if (citizen?.decorFirst && isNewCitizen(citizen) && firstTime && !editing) return null;
  if (!citizen?.id || !status || QUIET.test(path) || !(firstTime || editing)) return null;
  if (dismissed && !editing) return null;
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
    // Keep user in their home (do not kick them to /explore)
    close();
  };
  const close = () => {
    setEditing(false);
    setOrder(null);
    setDismissed(true);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("dubai_goals_configured", "true"); } catch {}
      window.dispatchEvent(new CustomEvent("dubai:goal-setup-completed"));
    }
  };
  return (
    <div className="fixed inset-0 z-[205] bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label="Your Dubai plan">
      <PlanScene look={citizen.look} celebrating={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 top-[max(1rem,env(safe-area-inset-top))] flex flex-col justify-end p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md w-full mx-auto">
          <div className="rounded-[28px] bg-white text-slate-900 p-4 space-y-2 shadow-2xl max-h-[78vh] flex flex-col relative">
            <div className="px-1 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-black leading-tight">
                  {firstTime ? "Let's get busy in Dubai! What are your goals?" : "Put your goals in order"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {firstTime ? "Put them in the order you want. " : ""}A home and a job come first. Move the rest with the arrows.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
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
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="h-12 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 transition-colors cursor-pointer"
              >
                {editing ? "Cancel" : "Set later"}
              </button>
              <button
                onClick={lock}
                disabled={busy}
                className="flex-1 h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black disabled:opacity-60 transition-colors cursor-pointer"
              >
                {busy ? "Saving…" : editing && status.order ? "Save my order" : "Lock in my plan"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
