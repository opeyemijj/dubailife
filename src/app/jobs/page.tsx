"use client";

// The Dubai Job Board (design spec section 10): jobs posted by player ventures. Apply, get hired, clock in
// one shift a day, and get paid every Friday at 17:00 GST from the venture's own takings.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { aed, applyJob, companyIcon, daysUntil, endJob, jobBoard, myEconomy, VENTURES, ventureType, workShift, type BoardJob, type Economy } from "@/lib/economy";
import { gameAudio } from "@/utils/gameAudio";

export default function JobBoardPage() {
  useRequireCitizen();
  const [eco, setEco] = useState<Economy | null>(null);
  const [jobs, setJobs] = useState<BoardJob[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [e, j] = await Promise.all([myEconomy(), jobBoard()]);
    if (e.data) setEco(e.data);
    if (j.data) setJobs(j.data);
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const say = (ok: boolean, text: string) => setNote({ ok, text });
  const shift = async () => {
    const r = await workShift();
    if (r.error) return say(false, r.error);
    gameAudio.playCoinSound();
    say(true, `Shift done: ${r.data!.shifts}/${r.data!.shiftsPerWeek} this week. +20 career points.`);
    void load();
  };
  const apply = async (id: number) => {
    const r = await applyJob(id);
    if (r.error) return say(false, r.error);
    gameAudio.playClickSound();
    say(true, jobs?.find((j) => j.id === id)?.system ? "You're hired! Work your first shift below." : "Application sent. The crew will review it.");
    void load();
  };
  const quit = async () => {
    if (!confirm("Quit your job? Earlier weeks are paid now, but shifts worked this week won't be.")) return;
    const r = await endJob();
    if (r.error) return say(false, r.error);
    say(true, "You've left your job."); void load();
  };
  const statusOf = (id: number) => eco?.applications.find((a) => a.jobId === id)?.status;

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-black">💼 Dubai Job Board</h1>
            <p className="text-xs text-slate-400">City companies and ventures run by players</p>
          </div>
          <Link href="/ventures" className="text-xs font-black px-3 py-2 rounded-full bg-white/10">My ventures</Link>
        </div>

        {eco?.job && (
          <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{ventureType(eco.job.ventureType)?.icon ?? "💼"}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-white/70">Your job</p>
                <p className="font-black text-lg leading-tight">{eco.job.title} · {eco.job.venture}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-black/20 p-2"><p className="text-[10px] text-white/70">Weekly wage</p><p className="font-black text-sm">{aed(eco.job.weeklyWage)}</p></div>
              <div className="rounded-2xl bg-black/20 p-2"><p className="text-[10px] text-white/70">Shifts</p><p className="font-black text-sm">{eco.job.shifts}/{eco.job.shiftsPerWeek}</p></div>
              <div className="rounded-2xl bg-black/20 p-2"><p className="text-[10px] text-white/70">Payday in</p><p className="font-black text-sm">{daysUntil(eco.job.nextPayroll, now)}</p></div>
            </div>
            {eco.job.owed > 0 && <p className="text-xs font-bold text-amber-200">The venture still owes you {aed(eco.job.owed)}. It&apos;s paid when the takings cover it.</p>}
            <button disabled={eco.job.workedToday} onClick={shift} className="w-full h-12 rounded-2xl bg-white text-emerald-800 font-black disabled:opacity-60">
              {eco.job.workedToday ? "✅ Today's shift done" : "Work today's shift"}
            </button>
            <button onClick={quit} className="w-full text-xs font-bold text-white/70">Quit this job</button>
          </section>
        )}

        {note && <p className={`text-sm font-bold text-center ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</p>}

        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Open jobs</h2>
          {jobs === null ? <p className="text-sm text-slate-500">Loading…</p>
            : jobs.length === 0 ? (
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300 space-y-2">
                <p>No jobs open right now. Ask staff at any café or shop on the map, or be the first employer in the city.</p>
                <Link href="/ventures" className="inline-block font-black text-sky-300">Start a venture and hire people →</Link>
              </div>
            ) : jobs.map((j) => {
              const st = statusOf(j.id);
              return (
                <div key={j.id} className="flex items-center gap-3 rounded-2xl bg-slate-900 border border-white/10 p-3.5">
                  <span className="text-2xl">{(j.system ? companyIcon(j.venture) : ventureType(j.ventureType)?.icon) ?? <Briefcase className="w-5 h-5" />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-sm">{j.title} · {j.venture}</span>
                    {j.system && <span className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 mb-0.5">Always hiring · instant start</span>}
                    <span className="block text-[11px] text-slate-400">{aed(j.weeklyWage)}/week · {j.shiftsPerWeek} shift{j.shiftsPerWeek === 1 ? "" : "s"} · {VENTURES.requirements[j.requirement]}</span>
                  </span>
                  {j.mine ? <span className="text-[10px] font-bold text-slate-500">Your venture</span>
                    : st === "pending" ? <span className="text-[11px] font-bold text-amber-300">Applied</span>
                    : st === "hired" ? <span className="text-[11px] font-bold text-emerald-300">Hired</span>
                    : <button disabled={!!eco?.job} onClick={() => apply(j.id)} className="text-xs font-black px-3 py-1.5 rounded-full bg-sky-500 disabled:opacity-30">{st === "rejected" ? "Reapply" : "Apply"}</button>}
                </div>
              );
            })}
        </section>
        <p className="text-[11px] text-slate-500 text-center">A job at a player venture also counts for the Employment visa. Pay comes only from what the venture earns.</p>
      </div>
      <BottomNav />
    </main>
  );
}
