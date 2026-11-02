"use client";

// Hiring an interior decorator at home: a budget, an optional style, and a request to any player with the job. A
// banner says how it's going; when they've finished and you're home, the new look is in and you get your key back.

import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useNow } from "@/lib/dubaiClock";
import { useCitizen } from "@/lib/citizenStore";
import { useServices } from "@/lib/cityServices";
import { broadcastCityPulse, usePresentCitizens } from "@/lib/presence";
import type { HousingTier } from "@/lib/furniture";
import { applyDecor, cancelDecor, DECORATORS, decorators, requestDecorator, studioOf, type DecoratorPro, type DecorJob } from "@/lib/decorator";
import { gameAudio } from "@/utils/gameAudio";

const aed = (n: number) => `AED ${n.toLocaleString()}`;

// ---------------------------------------------------------------- choosing a decorator

export function DecoratorSheet({ tier, onClose, onHired }: { tier: HousingTier; onClose: () => void; onHired?: () => void }) {
  const { citizen } = useCitizen();
  const online = usePresentCitizens();
  const svc = useServices(citizen?.id);
  const [pros, setPros] = useState<DecoratorPro[] | null>(null);
  const [budget, setBudget] = useState(DECORATORS.budget.presets[1]);
  const [brief, setBrief] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void decorators().then((r) => setPros(r.data ?? [])); }, []);

  const send = async (pro: DecoratorPro) => {
    setError(null);
    if ((citizen?.balance ?? 0) < budget + pro.fee) { setError(`You need ${aed(budget + pro.fee)} for that: the budget plus their fee.`); return; }
    setBusy(true);
    const r = await requestDecorator(pro.id, tier, budget, brief);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playCoinSound();
    broadcastCityPulse({
      kind: "decor",
      icon: "🧑‍🎨",
      title: `@${citizen?.username ?? "someone"} wants @${pro.username} to decorate!`,
      subtitle: `Budget ${aed(budget)} · Fee ${aed(pro.fee)} waiting in Decor App`,
      href: "phone:decor",
      cta: "Open Decor ›",
      from: citizen?.username ?? "someone",
    });
    onHired?.();
    setSent(pro.username);
  };
  // Every player working as a decorator, the ones in the game right now first.
  const isOnline = (u: string) => online.some((p) => p.username === u);
  const sorted = [...(pros ?? [])].sort((a, b) => Number(isOnline(b.username)) - Number(isOnline(a.username)) || a.fee - b.fee);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Hire an interior decorator" onClick={onClose}>
        <div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">🧑‍🎨</span>
            <div className="flex-1">
              <h3 className="text-lg font-black leading-tight">Hire an interior decorator</h3>
              <p className="text-xs text-slate-500">They come to your home, buy from the store with your budget and arrange it all. Whatever they don&apos;t spend comes back to you.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-500" aria-label="Close">✕</button>
          </div>

          {sent ? (
            <div className="rounded-3xl bg-emerald-50 p-4 text-center space-y-2">
              <p className="text-4xl">🔑</p>
              <p className="font-black text-lg leading-tight">Request sent to @{sent}</p>
              <p className="text-sm text-slate-600">Once they accept, they&apos;ll let themselves in and get to work. You&apos;ll see the result when they&apos;ve finished. Your AED is held until then, and you can cancel any time before they accept.</p>
              <button onClick={onClose} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">Done</button>
            </div>
          ) : (
            <>
              <section className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Your budget</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {DECORATORS.budget.presets.map((b) => (
                    <button key={b} onClick={() => setBudget(b)} className={`h-10 rounded-xl text-xs font-black ${budget === b ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>{(b / 1000)}k</button>
                  ))}
                </div>
                <input inputMode="numeric" aria-label="Budget in AED" value={budget || ""} onChange={(e) => setBudget(Math.min(DECORATORS.budget.max, Number(e.target.value.replace(/[^0-9]/g, ""))))}
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold outline-none" placeholder={`AED ${DECORATORS.budget.min.toLocaleString()} or more`} />
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Style you&apos;d like (optional)</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <button onClick={() => setBrief(null)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-black ${!brief ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>Their choice</button>
                  {DECORATORS.studios.map((s) => (
                    <button key={s.id} onClick={() => setBrief(s.id)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-black ${brief === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{s.icon} {s.title}</button>
                  ))}
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Interior decorators</p>
                {pros === null && <p className="text-sm text-slate-500">Finding decorators…</p>}
                {pros !== null && sorted.length === 0 && svc?.service !== "decorator" && <p className="text-sm text-slate-500">No players have the Interior decorator job yet. Check back soon, or take the job yourself on the Job Board.</p>}
                {sorted.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5">
                    <span className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl">🧑‍🎨</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">@{p.username} {isOnline(p.username) && <span className="text-[10px] font-black text-emerald-600">● online</span>}</p>
                      <p className="text-[11px] text-slate-500">Fee {aed(p.fee)} · total held {aed(budget + p.fee)}</p>
                    </div>
                    <button disabled={busy || budget < DECORATORS.budget.min} onClick={() => send(p)} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">🔑 Send request</button>
                  </div>
                ))}
                {svc?.service === "decorator" && (
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 opacity-70">
                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">🧑‍🎨</span>
                    <p className="flex-1 min-w-0 font-black text-sm truncate">@{citizen?.username}</p>
                    <span className="text-[11px] font-bold text-slate-500">That&apos;s you</span>
                  </div>
                )}
              </section>
              {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

// ---------------------------------------------------------------- while they work, and the reveal

/** How your decorator job is going, and the reveal (with your key back) once it's done and you're home. */
export function DecoratorStatus({ tier, job, reload }: { tier: HousingTier; job: DecorJob | null; reload: () => void }) {
  const now = useNow();
  const [reveal, setReveal] = useState<{ title: string; placed: number; stored: number; by: string; left: number } | null>(null);
  const applying = useRef(false);
  // Jobs a Local studio took before decorators became players only still finish here.
  const ready = !!job && job.tier === tier && (job.ready || (job.status === "working" && !job.decorator && !!job.readyAt && now > 0 && Date.parse(job.readyAt) <= now));
  useEffect(() => {
    if (!ready || !job || applying.current) return;
    applying.current = true;
    void applyDecor(job).then((r) => {
      applying.current = false;
      if (r) { gameAudio.playCoinSound(); setReveal({ ...r, by: job.decorator ? `@${job.decorator}` : (job.studio ? studioOf(job.studio)?.decorator : null) ?? "your decorator", left: job.plan ? job.budget - job.spent : 0 }); }
      reload();
    });
  }, [ready, job, reload]);

  if (reveal) {
    return (
      <div className="fixed inset-x-3 bottom-[max(6rem,calc(env(safe-area-inset-bottom)+6rem))] z-[195] flex justify-center">
        <div className="w-full max-w-md rounded-[26px] bg-white p-4 shadow-2xl space-y-2 text-slate-900 animate-[sheetUp_0.3s_ease-out]">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">✨ Your new home</p>
          <p className="font-black text-lg leading-tight">{reveal.title}, by {reveal.by}</p>
          <p className="text-sm text-slate-600">New floors and walls, and {reveal.placed} piece{reveal.placed === 1 ? "" : "s"} placed{reveal.stored ? ` (${reveal.stored} in your storage: there wasn't room)` : ""}. Move anything in Decorate.</p>
          {reveal.left > 0 && <p className="text-sm font-black text-emerald-700">+{aed(reveal.left)} of your budget came back to your wallet.</p>}
          <button onClick={() => setReveal(null)} className="w-full h-11 rounded-2xl bg-emerald-600 text-white font-black">🔑 Take your key back</button>
        </div>
      </div>
    );
  }
  if (!job) return null;
  const studio = job.studio ? studioOf(job.studio) : null;
  const elsewhere = job.tier !== tier ? " your other home" : "";
  const overdue = job.status === "working" && !!job.decorator && !!job.acceptedAt && now > Date.parse(job.acceptedAt) + DECORATORS.abandonHours * 3_600_000;
  const mins = job.readyAt && now ? Math.max(0, Math.ceil((Date.parse(job.readyAt) - now) / 60000)) : null;
  const text = job.status === "requested"
    ? `🔑 Waiting for @${job.decorator} to accept`
    : job.decorator
      ? `🧑‍🎨 @${job.decorator} is decorating${elsewhere} · budget ${aed(job.budget)}`
      : `🧑‍🎨 ${studio?.decorator ?? "Your decorator"} is decorating${elsewhere} · ${mins ? `ready in ${mins} min` : "almost done"}`;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(max(0.75rem,env(safe-area-inset-top))+7rem)] z-[45] flex items-center gap-2">
      <p className="rounded-full bg-white/95 shadow-lg px-4 py-2 text-xs font-black text-slate-800 whitespace-nowrap">{text}</p>
      {(job.status === "requested" || overdue) && (
        <button onClick={async () => { await cancelDecor(job.id); reload(); }} className="rounded-full bg-white/95 shadow-lg px-3 py-2 text-xs font-black text-rose-600">Cancel</button>
      )}
    </div>
  );
}
