"use client";

// One goal's steps, each with a button to go and do it, and the reward to collect when they're all done.
// Used by the Next step card and the Goals page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { openLife } from "@/components/life/LifeHub";
import { claimGoal, goalClaimed, goalDone, stepDone, type Goal, type GoalStatus, type GoalStep } from "@/lib/goals";
import { gameAudio } from "@/utils/gameAudio";

export function GoalSteps({ goal, status, onClaimed, onGo }: { goal: Goal; status: GoalStatus; onClaimed?: (r: { aed: number; xp: number }) => void; onGo?: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claimed = goalClaimed(status, goal.id);
  const ready = !claimed && goalDone(status, goal);
  const save = goal.id === "save" ? Number(status.checks.saveTarget ?? 0) : 0;

  const go = (s: GoalStep) => {
    gameAudio.playClickSound();
    onGo?.();
    if (s.action === "visa") openLife("visa");
    else if (s.href) router.push(s.href);
  };
  const claim = async () => {
    setBusy(true); setError(null);
    const r = await claimGoal(goal.id);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playCoinSound();
    if (r.data) onClaimed?.(r.data);
  };

  return (
    <div className="space-y-1.5">
      {(goal.steps as GoalStep[]).map((s) => {
        const ok = claimed || stepDone(status, s);
        return (
          <button key={s.id} disabled={ok} onClick={() => go(s)} className={`w-full flex items-center gap-2.5 rounded-2xl p-2.5 text-left ${ok ? "bg-teal-50" : "bg-slate-50 hover:bg-slate-100"}`}>
            <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${ok ? "bg-teal-600 text-white" : "border-2 border-slate-300"}`}>{ok && <Check className="w-3.5 h-3.5" />}</span>
            <span className={`flex-1 min-w-0 text-sm font-bold ${ok ? "text-slate-400 line-through" : "text-slate-900"}`}>
              {s.title}{s.done === "saved" && save ? ` (AED ${save.toLocaleString()})` : ""}
            </span>
            {!ok && <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
        );
      })}
      {ready && (
        <button onClick={claim} disabled={busy} className="w-full h-12 rounded-2xl bg-amber-400 text-slate-950 font-black disabled:opacity-60 animate-[pulse_1.6s_ease-in-out_infinite]">
          {busy ? "Collecting…" : `🎁 Collect AED ${goal.aed.toLocaleString()} + ${goal.xp} XP`}
        </button>
      )}
      {claimed && <p className="text-center text-xs font-black text-teal-700">✓ Goal reached. Reward collected.</p>}
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}
