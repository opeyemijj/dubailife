"use client";

// Your goals: the whole plan in your order, how far through your Dubai story you are, each goal's steps
// with a button to go and do them, rewards to collect, and changing the order.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ListOrdered } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { GoalSteps } from "@/components/goals/GoalSteps";
import { openGoalSetup } from "@/components/goals/GoalSetup";
import { DailyMissions } from "@/components/goals/DailyMissions";
import { FunGoals } from "@/components/goals/FunGoals";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { currentGoal, DEFAULT_ORDER, goalClaimed, goalDone, goalOf, lifeProgress, stepDone, useGoals, type Goal } from "@/lib/goals";

export default function GoalsPage() {
  return <Suspense><Goals /></Suspense>;
}

function Goals() {
  const { citizen } = useRequireCitizen();
  // Two tabs: the life path in order, and Life & Fun (?tab=fun).
  const params = useSearchParams();
  const [tab, setTab] = useState<"path" | "fun">(params?.get("tab") === "fun" ? "fun" : "path");
  const { status } = useGoals(citizen?.id);
  const now = currentGoal(status);
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = openId ?? now?.id ?? null;
  const order = (status?.order ?? DEFAULT_ORDER).map(goalOf).filter((g): g is Goal => !!g);
  const pct = Math.round(lifeProgress(status) * 100);

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-28">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-teal-500/20 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-6 space-y-5">
        <header className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl font-black flex-1">My goals</h1>
          {tab === "path" && status?.order && <button onClick={openGoalSetup} className="h-10 px-3 rounded-full bg-white/10 text-xs font-black flex items-center gap-1.5"><ListOrdered className="w-4 h-4" /> Change order</button>}
        </header>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1" role="tablist">
          {([["path", "🧭 Life path"], ["fun", "🎉 Life & Fun"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-10 rounded-xl text-sm font-black ${tab === id ? (id === "fun" ? "bg-fuchsia-500" : "bg-teal-500") : "text-white/60"}`}>{label}</button>
          ))}
        </div>

        {tab === "fun" ? <FunGoals /> : <>
        <section className="rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-700 p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-wider text-white/70">Your Dubai story</p>
          <p className="text-4xl font-black">{pct}%</p>
          <div className="mt-2 h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-sm text-white/85">{now ? <>Now: <b>{now.icon} {now.title}</b></> : "Every goal reached. Dubai is yours."}</p>
        </section>

        {status?.order && <section className="rounded-3xl bg-white/5 border border-white/10 p-3"><DailyMissions dark /></section>}

        {!status ? <p className="text-center text-white/50 py-8">Loading your goals…</p> : (
          <ol className="space-y-2">
            {order.map((g, i) => {
              const claimed = goalClaimed(status, g.id);
              const ready = !claimed && goalDone(status, g);
              const done = g.steps.filter((s) => stepDone(status, s)).length;
              const open = shown === g.id;
              return (
                <li key={g.id} className={`rounded-3xl ${open ? "bg-white text-slate-900" : "bg-white/5 border border-white/10"}`}>
                  <button onClick={() => setOpenId(open ? "" : g.id)} className="w-full flex items-center gap-3 p-3 text-left">
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-black text-sm ${claimed ? "bg-teal-500 text-white" : open ? "bg-teal-50 text-teal-700" : "bg-white/10"}`}>{claimed ? <Check className="w-4 h-4" /> : i + 1}</span>
                    <span className="text-xl">{g.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black leading-tight">{g.title}</span>
                      <span className={`block text-xs ${open ? "text-slate-500" : "text-white/50"}`}>
                        {claimed ? "Reached" : ready ? "Ready to collect 🎁" : `${done}/${g.steps.length} steps · AED ${g.aed.toLocaleString()} + ${g.xp} XP`}
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-sm text-slate-600">{g.why}</p>
                      <GoalSteps goal={g} status={status} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        </>}
        {tab === "path" && citizen?.dream && <p className="text-center text-xs text-white/50">Your dream: <b className="text-white/80">{citizen.dream}</b>. Every goal moves you closer.</p>}
      </div>
      <BottomNav />
    </main>
  );
}
