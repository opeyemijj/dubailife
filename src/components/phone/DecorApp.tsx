"use client";

// Decor: the interior decorator's app. Requests from players (accept or decline), and the way into their home to
// spend their budget and do the work (/decorate/<job>).
// Your fee is set here. Not a decorator? How to become one.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { setServiceFee, useServices } from "@/lib/cityServices";
import { acceptDecor, declineDecor, decorJobsForMe, DECORATORS, studioOf, type DecorRequest } from "@/lib/decorator";
import { gameAudio } from "@/utils/gameAudio";
import { AppScreen, Big, Card, Note } from "./AppScreen";

const aed = (n: number) => `AED ${n.toLocaleString()}`;

export function DecorApp({ onBack, onClose }: { onBack: () => void; onClose?: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const svc = useServices(citizen?.id);
  const isDecorator = svc?.service === "decorator";
  const [jobs, setJobs] = useState<DecorRequest[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [fee, setFee] = useState("");

  const load = useCallback(async () => { const r = await decorJobsForMe(); setJobs(r.data ?? []); }, []);
  useEffect(() => {
    if (!isDecorator) return;
    const t = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 20000);
    return () => { clearTimeout(t); clearInterval(every); };
  }, [isDecorator, load]);

  if (!svc) return <AppScreen title="Decor" onBack={onBack}><p className="text-center text-slate-500 py-8">Loading…</p></AppScreen>;
  if (!isDecorator) {
    return (
      <AppScreen title="Decor" onBack={onBack} accent="text-emerald-700">
        <Card className="bg-emerald-50">
          <p className="text-3xl">🧑‍🎨</p>
          <p className="font-black text-lg leading-tight">Decorate other players&apos; homes</p>
          <p className="text-slate-600">{DECORATORS.career.name} hires Interior decorators ({aed(Math.round((DECORATORS.career.weeklyWage * 52) / 12 / 100) * 100)} a month). Players send you requests with a budget. You go to their home, buy from the store, arrange it all and earn the fee you set.</p>
          <Big onClick={() => { onClose?.(); router.push("/jobs"); }}>Apply on the Job Board</Big>
        </Card>
        <p className="text-center text-xs text-slate-400">Want your own home decorated? Go home and tap Employ Decorator.</p>
      </AppScreen>
    );
  }

  const goTo = (j: DecorRequest) => { onClose?.(); router.push(`/decorate/${j.id}`); };
  const accept = async (j: DecorRequest) => {
    const r = await acceptDecor(j.id);
    if (r.error) { setNote({ ok: false, text: r.error }); void load(); return; }
    gameAudio.playCoinSound();
    goTo(j);
  };
  const decline = async (j: DecorRequest) => {
    const r = await declineDecor(j.id);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: `You turned down @${j.client}'s job. They got their AED back.` });
    void load();
  };
  const saveFee = async () => {
    const n = Math.floor(Number(fee));
    if (!n || n < DECORATORS.fee.min || n > DECORATORS.fee.max) { setNote({ ok: false, text: `Set a fee between ${aed(DECORATORS.fee.min)} and ${aed(DECORATORS.fee.max)}.` }); return; }
    const r = await setServiceFee(n);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: `Your fee is now ${aed(n)}.` });
    setFee("");
  };

  return (
    <AppScreen title="Decor" onBack={onBack} accent="text-emerald-700">
      <Card className="bg-emerald-50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧑‍🎨</span>
          <div className="flex-1"><p className="font-black">Interior decorator</p><p className="text-sm text-slate-600">Your fee: <b>{aed(svc.fee ?? DECORATORS.fee.default)}</b> a job</p></div>
        </div>
        <div className="flex gap-2">
          <input id="decor-fee" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^0-9]/g, ""))} placeholder={`${DECORATORS.fee.min}–${DECORATORS.fee.max}`} aria-label="Your fee in AED"
            className="flex-1 min-w-0 h-11 rounded-full bg-white px-4 font-bold outline-none" />
          <button onClick={saveFee} className="h-11 px-4 rounded-full bg-emerald-700 text-white font-bold">Set fee</button>
        </div>
      </Card>

      {note && <Note ok={note.ok}>{note.text}</Note>}

      {jobs === null ? <p className="text-center text-slate-500 py-6">Loading jobs…</p>
        : jobs.length === 0 ? <p className="text-center text-slate-500 py-6">No jobs right now. When a player sends you a request, it shows up here (and you&apos;ll get an alert).</p>
        : jobs.map((j) => {
          const s = j.studio ? studioOf(j.studio) : null;
          return (
            <Card key={j.id}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{s?.icon ?? "🏠"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black leading-tight">@{j.client}&apos;s home</p>
                  <p className="text-sm text-slate-600">{s ? `They'd like: ${s.title}` : "Style is your choice"}</p>
                  <p className="text-sm font-bold text-emerald-700">Budget {aed(j.budget)} · your fee {aed(j.fee)}</p>
                </div>
              </div>
              {j.status === "requested" ? (
                <div className="flex gap-2">
                  <button onClick={() => decline(j)} className="h-12 px-4 rounded-full bg-white font-black text-slate-600">Decline</button>
                  <div className="flex-1"><Big onClick={() => accept(j)}>🔑 Accept and go there</Big></div>
                </div>
              ) : (
                <Big onClick={() => goTo(j)}>🏠 Go to @{j.client}&apos;s home · AED {(j.budget - j.spent).toLocaleString()} left</Big>
              )}
            </Card>
          );
        })}
    </AppScreen>
  );
}
