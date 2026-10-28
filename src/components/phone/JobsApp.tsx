"use client";

// Jobs on the phone: your job (work today's shift, payday), then every open job. Applying starts with a
// three-question interview; pass and city companies hire you on the spot, player ventures review you.

import { useCallback, useEffect, useState } from "react";
import { aed as aedEco, applyJob, companyIcon, daysUntil, endJob, jobBoard, myEconomy, VENTURES, ventureType, workShift, type BoardJob, type Economy } from "@/lib/economy";
import { gameAudio } from "@/utils/gameAudio";
import { InterviewScene } from "@/components/jobs/InterviewScene";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { monthlyPay, qualifiesFor, studyFor, useGoals } from "@/lib/goals";
import { AppScreen, Big, Card, Note } from "./AppScreen";

const SERVICE_LINE: Record<string, string> = {
  doctor: "Treat sick players in the Clinic app and keep the fee you set.",
  police: "Make arrests on suspicious transfers and earn a bounty when a case is won.",
  lawyer: "Players with a court date hire you for the fee you set. Prepare their defence.",
};

export function JobsApp({ onBack, onClose }: { onBack: () => void; onClose?: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const { status: goals } = useGoals(citizen?.id);
  const [eco, setEco] = useState<Economy | null>(null);
  const [jobs, setJobs] = useState<BoardJob[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [interview, setInterview] = useState<BoardJob | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [e, j] = await Promise.all([myEconomy(), jobBoard()]);
    if (e.data) setEco(e.data);
    if (j.data) setJobs(j.data);
    else { setJobs([]); setNote({ ok: false, text: j.error ?? "Couldn't load jobs. Try again in a moment." }); }
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const apply = async (j: BoardJob) => {
    const r = await applyJob(j.id);
    if (r.error) return setNote({ ok: false, text: r.error });
    gameAudio.playCoinSound();
    setNote({ ok: true, text: j.system ? `🎉 You're hired as ${j.title} at ${j.venture}. Work your first shift above.` : `Interview passed. ${j.venture} will review your application.` });
    void load();
  };
  const shift = async () => {
    const r = await workShift();
    if (r.error) return setNote({ ok: false, text: r.error });
    gameAudio.playCoinSound();
    setNote({ ok: true, text: `Shift done: ${r.data!.shifts}/${r.data!.shiftsPerWeek} this week. Paid on Friday.` });
    void load();
  };
  const quit = async () => {
    if (!confirm("Quit your job? Earlier weeks are paid now, but shifts worked this week won't be.")) return;
    const r = await endJob();
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: "You've left your job." });
    void load();
  };
  const statusOf = (id: number) => eco?.applications.find((a) => a.jobId === id)?.status;

  return (
    <AppScreen title="Jobs" onBack={onBack}>
      {eco?.job && (
        <Card className="bg-emerald-50">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl">{companyIcon(eco.job.venture) ?? ventureType(eco.job.ventureType)?.icon ?? "💼"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-700 font-semibold">Your job</p>
              <p className="font-black text-lg leading-tight">{eco.job.title}</p>
              <p className="text-slate-500 truncate">{eco.job.venture}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-white p-2"><p className="text-slate-500">Weekly</p><p className="font-black">{aedEco(eco.job.weeklyWage)}</p></div>
            <div className="rounded-2xl bg-white p-2"><p className="text-slate-500">Shifts</p><p className="font-black">{eco.job.shifts}/{eco.job.shiftsPerWeek}</p></div>
            <div className="rounded-2xl bg-white p-2"><p className="text-slate-500">Payday</p><p className="font-black">{daysUntil(eco.job.nextPayroll, now)}</p></div>
          </div>
          <Big onClick={shift} disabled={eco.job.workedToday}>{eco.job.workedToday ? "✅ Today's shift done" : "Work today's shift"}</Big>
          <button onClick={quit} className="w-full text-sm font-semibold text-slate-500">Quit this job</button>
        </Card>
      )}

      {note && <Note ok={note.ok}>{note.text}</Note>}

      {/* The interview is played in 3D at the recruitment centre; it hires you when you pass. */}
      {interview && (
        <InterviewScene job={interview} look={citizen?.look} onDone={(hired) => {
          setInterview(null);
          if (hired) setNote({ ok: true, text: `🎉 You're hired as ${interview.title} at ${interview.venture}. Work your first shift above.` });
          void load();
        }} />
      )}

      {jobs === null ? <p className="text-slate-500 text-center py-8">Loading jobs…</p> : jobs.filter((j) => !j.mine).map((j) => {
        const st = statusOf(j.id);
        const locked = !!eco?.job;
        return (
          <Card key={j.id}>
            <div className="flex items-start gap-3">
              <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl shrink-0">{(j.system ? companyIcon(j.venture) : ventureType(j.ventureType)?.icon) ?? "💼"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold leading-tight">{j.venture}</p>
                <p className="text-slate-500 leading-snug">Starts as {j.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-emerald-700">{aedEco(monthlyPay(j.weeklyWage))}</p>
                <p className="text-sm text-slate-500">a month</p>
              </div>
            </div>
            {j.service && <p className="text-slate-600 leading-snug">{SERVICE_LINE[j.service]}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>🕘 {j.shiftsPerWeek} shifts a week</span>
              {j.requirement !== "none" && <span>{qualifiesFor(j.requirement, goals) ? "✅" : "🔒"} {VENTURES.requirements[j.requirement]}</span>}
              {!j.system && <span>👥 Player business</span>}
            </div>
            {qualifiesFor(j.requirement, goals) === false && st !== "hired" && (
              <button onClick={() => { onClose?.(); router.push(studyFor(j.title)?.href ?? "/academics"); }} className="w-full rounded-2xl bg-amber-50 text-amber-800 p-3 text-left text-sm font-semibold">
                🎓 You don&apos;t qualify yet. Study <b>{studyFor(j.title)?.label ?? "at Academic City"}</b>, then come back ›
              </button>
            )}
            {st === "hired" ? <p className="text-center font-semibold text-emerald-700">Hired</p>
              : st === "pending" ? <p className="text-center font-semibold text-amber-600">Application sent · waiting for the owner</p>
              : j.interview === "failed" ? <p className="text-center text-slate-500">Interview failed today · try again tomorrow</p>
              : locked ? <p className="text-center text-slate-400 text-sm">Quit your job to apply</p>
              : <Big onClick={() => (j.interview === "passed" ? void apply(j) : setInterview(j))}>{j.interview === "passed" ? "Apply" : "Apply · take the interview"}</Big>}
          </Card>
        );
      })}
      <p className="text-center text-xs text-slate-400 px-4">Pay arrives every Friday at 5pm. A job counts toward the Employment visa.</p>
    </AppScreen>
  );
}
