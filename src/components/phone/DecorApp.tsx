"use client";

// Decor: the interior decorator's app. Jobs from players who've hired you (pick up their key within the time
// or a Local takes it), the look they chose, and the finishing touch you add to finish the job and get paid.
// Your fee is set here. Not a decorator? How to become one.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { setServiceFee, useServices } from "@/lib/cityServices";
import { acceptDecor, decorJobsForMe, DECORATORS, finishDecor, studioOf, type DecorRequest } from "@/lib/decorator";
import { CATALOG, FLOOR_FINISHES, WALL_PAINTS } from "@/lib/furniture";
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
  const [pick, setPick] = useState<Record<number, string>>({});
  const [fee, setFee] = useState("");
  const now = useNow();

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
          <p className="text-slate-600">{DECORATORS.career.name} hires Interior decorators ({aed(Math.round((DECORATORS.career.weeklyWage * 52) / 12 / 100) * 100)} a month). Players hire you for the fee you set, hand you their key, and you finish the look.</p>
          <Big onClick={() => { onClose?.(); router.push("/jobs"); }}>Apply on the Job Board</Big>
        </Card>
        <p className="text-center text-xs text-slate-400">Want your own home decorated? Go home → Buy → ✨ Style.</p>
      </AppScreen>
    );
  }

  const accept = async (j: DecorRequest) => {
    const r = await acceptDecor(j.id);
    if (r.error) { setNote({ ok: false, text: r.error }); void load(); return; }
    gameAudio.playClickSound();
    setNote({ ok: true, text: `🔑 You have @${j.client}'s key. Choose your finishing touch and finish the job.` });
    void load();
  };
  const finish = async (j: DecorRequest) => {
    const touch = pick[j.id];
    if (!touch) { setNote({ ok: false, text: "Choose a finishing touch first." }); return; }
    const r = await finishDecor(j.id, touch);
    if (r.error) { setNote({ ok: false, text: r.error }); return; }
    gameAudio.playCoinSound();
    setNote({ ok: true, text: `✨ Done! @${j.client}'s home is ready. ${r.data ? `You earned ${aed(r.data)}.` : ""}` });
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
        : jobs.length === 0 ? <p className="text-center text-slate-500 py-6">No jobs right now. When a player hires you, it shows up here (and you&apos;ll get an alert).</p>
        : jobs.map((j) => {
          const s = studioOf(j.studio);
          if (!s) return null;
          const left = now ? Math.max(0, DECORATORS.acceptMinutes - Math.floor((now - Date.parse(j.createdAt)) / 60000)) : DECORATORS.acceptMinutes;
          return (
            <Card key={j.id}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black leading-tight">@{j.client} · {s.title}</p>
                  <p className="text-sm text-slate-600">{FLOOR_FINISHES.find((f) => f.id === s.floor)?.label}, {WALL_PAINTS.find((w) => w.id === s.wall)?.label.toLowerCase()} walls{s.panels ? ", panelling" : ""} · {s.items.map((i) => CATALOG.find((c) => c.id === i)?.icon).join(" ")}</p>
                  <p className="text-sm font-bold text-emerald-700">Fee {aed(j.fee)}</p>
                </div>
              </div>
              {j.status === "requested" ? (
                <>
                  <p className="text-xs text-amber-700 font-bold">Pick up the key within {left} min, or a Local takes the job.</p>
                  <Big onClick={() => accept(j)}>🔑 Pick up the key</Big>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold">Your finishing touch: one piece you add to the look.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {s.touches.map((t) => {
                      const item = CATALOG.find((c) => c.id === t);
                      if (!item) return null;
                      return (
                        <button key={t} onClick={() => setPick((p) => ({ ...p, [j.id]: t }))}
                          className={`rounded-2xl p-2 text-center ${pick[j.id] === t ? "bg-emerald-600 text-white" : "bg-white"}`}>
                          <span className="block text-2xl">{item.icon}</span>
                          <span className="block text-[11px] font-bold leading-tight">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Big onClick={() => finish(j)} disabled={!pick[j.id]}>✨ Finish and hand back the key</Big>
                </>
              )}
            </Card>
          );
        })}
    </AppScreen>
  );
}
