"use client";

// Runs on every page while signed in: needs drop a little each minute, the life panel opens from the
// needs dock or the S key ("dubai:open-skills"), and level-ups show a short toast.

import { supabase } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { tickNeeds } from "@/lib/life";
import { currentLife, dailyBurn, runwayDays, syncIfDue, syncLife, visaInfo, type LifeStatus, type LifeTick } from "@/lib/lifeLoop";
import { ModalPortal } from "@/components/ui/modal-portal";
import type { LifeTab } from "./LifePanel";

// The panel brings in the city directory and course list, so it loads the first time it's opened.
const LifePanel = dynamic(() => import("./LifePanel").then((m) => m.LifePanel), { ssr: false });

/** Opens the life panel, on a tab if given. */
export const openLife = (tab?: LifeTab) => window.dispatchEvent(new CustomEvent("dubai:open-skills", { detail: tab }));

export function LifeHub() {
  const { citizen } = useCitizen();
  const signedIn = !!citizen?.id;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LifeTab>("needs");
  const [toast, setToast] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<(LifeStatus & LifeTick) | null>(null);

  // The 09:00 GST living-cost tick is settled when the app opens and when it comes back into view.
  useEffect(() => {
    if (!signedIn) return;
    const after = (r: (LifeStatus & LifeTick) | null) => {
      if (!r) return;
      if (r.ticks >= 2 && (r.charged ?? 0) > 0) setWelcome(r);
      else if (r.ticks === 1 && (r.paid ?? 0) > 0) {
        const runway = runwayDays(r.balance, r.daily);
        window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `☀️ Living costs AED ${r.paid!.toLocaleString()} paid · ${Number.isFinite(runway) ? `${runway} days runway` : "runway ∞"}` }));
      }
      // No Blueprint yet: once a visit, open the Visa & budget tab when the screen is clear.
      if (!r.blueprint) {
        try { if (sessionStorage.getItem("dl_blueprint_prompt")) return; } catch { /* storage blocked */ }
        const t = setInterval(() => {
          // Chosen meanwhile (for example during onboarding): nothing to prompt.
          if (currentLife()?.blueprint) { clearInterval(t); return; }
          if (dialogOpen()) return;
          clearInterval(t);
          try { sessionStorage.setItem("dl_blueprint_prompt", "1"); } catch { /* storage blocked */ }
          openLife("visa");
        }, 6000);
      }
    };
    void syncLife().then((r) => after(r as (LifeStatus & LifeTick) | null));
    // Redeem an invite saved on the landing page.
    try {
      const ref = localStorage.getItem("dl_ref");
      if (ref) void supabase().rpc("claim_referral", { p_username: ref }).then(() => { try { localStorage.removeItem("dl_ref"); } catch { /* blocked */ } });
    } catch { /* storage blocked */ }
    const onShow = () => { if (document.visibilityState === "visible") void syncIfDue().then((r) => after(r as (LifeStatus & LifeTick) | null)); };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    tickNeeds();
    const t = setInterval(() => tickNeeds(), 60_000);
    return () => clearInterval(t);
  }, [signedIn]);

  useEffect(() => {
    const show = (e: Event) => {
      const want = (e as CustomEvent<LifeTab | undefined>).detail;
      if (typeof want === "string") setTab(want);
      setOpen((o) => (typeof want === "string" ? true : !o));
    };
    const say = (e: Event) => {
      setToast(String((e as CustomEvent).detail));
      setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener("dubai:open-skills", show);
    window.addEventListener("dubai:toast", say);
    return () => { window.removeEventListener("dubai:open-skills", show); window.removeEventListener("dubai:toast", say); };
  }, []);

  const close = useCallback(() => setOpen(false), []);
  if (!signedIn) return null;
  return (
    <>
      {open && <LifePanel open tab={tab} onTab={setTab} onClose={close} />}
      {welcome && <WelcomeBack r={welcome} onClose={() => setWelcome(null)} />}
      {toast && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[170] px-4 py-2 rounded-full bg-slate-950/90 text-white text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-2 pointer-events-none">
          {toast}
        </div>
      )}
    </>
  );
}

/** After an absence: one card with what was charged, what was earned and one suggested next step. */
function WelcomeBack({ r, onClose }: { r: LifeStatus & LifeTick; onClose: () => void }) {
  const runway = runwayDays(r.balance, r.daily || dailyBurn(r.monthly));
  const visa = visaInfo(r.visaTier);
  const next = r.visaDaysLeft <= 5 && visa.overstay
    ? { text: "Your visa is running out. Graduate or get hired to move up.", tab: "visa" as const, cta: "See the visa ladder" }
    : Number.isFinite(runway) && runway < 14
      ? { text: "Your runway is short. Cut costs or take a shift.", tab: "visa" as const, cta: "Fix my budget" }
      : { text: "Pick up where you left off: today's wishes are waiting.", tab: "goals" as const, cta: "See today's goals" };
  const row = (label: string, value: string, tone = "") => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"><span className="text-sm text-slate-600">{label}</span><span className={`text-sm font-black ${tone}`}>{value}</span></div>
  );
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[175] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Welcome back">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
          <div className="text-center"><div className="text-4xl">👋</div><h3 className="font-black text-xl">Welcome back to Dubai</h3>
            <p className="text-xs text-slate-500">You were away {r.ticks} days. Only {r.charged} {r.charged === 1 ? "day was" : "days were"} charged.</p></div>
          <div className="rounded-2xl bg-slate-50 px-3">
            {row("Living costs", `−AED ${(r.livingCost ?? 0).toLocaleString()}`, "text-rose-600")}
            {(r.fines ?? 0) > 0 && row("Overstay fines", `−AED ${r.fines!.toLocaleString()}`, "text-rose-600")}
            {(r.yield ?? 0) > 0 && row("Discipline Yield", `+AED ${r.yield!.toLocaleString()}`, "text-emerald-600")}
            {r.debt > 0 && row("Still owed", `AED ${r.debt.toLocaleString()}`, "text-rose-600")}
            {row("Wallet", `AED ${r.balance.toLocaleString()}`)}
            {row("Runway", Number.isFinite(runway) ? `${runway} days` : "∞")}
            {r.visaTier !== "GOLDEN" && row(visa.label, `${r.visaDaysLeft} days left`, r.visaDaysLeft <= 5 ? "text-rose-600" : "")}
            {r.visaExpired && row("Visa ended", `${visaInfo(r.visaExpired).label} → Visit`, "text-amber-600")}
          </div>
          <p className="text-sm font-bold text-center">{next.text}</p>
          <button onClick={() => { onClose(); openLife(next.tab); }} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">{next.cta}</button>
          <button onClick={onClose} className="w-full text-xs font-bold text-slate-400">Close</button>
        </div>
      </div>
    </ModalPortal>
  );
}
