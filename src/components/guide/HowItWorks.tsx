"use client";

// "How life in Dubai works" (src/data/guide/how-it-works.json): a compact overview for the onboarding
// "Your Dubai" step, and the full guide on /guide with links into each part of the game.

import Link from "next/link";
import { useState } from "react";
import GUIDE from "@/data/guide/how-it-works.json";
import { openLife } from "@/components/life/LifeHub";
import type { LifeTab } from "@/components/life/LifePanel";

const LADDER = [["🛬", "Visit", "30 days"], ["🎓", "Student", "study"], ["💼", "Employment", "get a job"], ["🧑‍💻", "Freelance", "earn"], ["🌟", "Golden", "10 years"]];

/** The tournament prize as it stands today: non-cash until the cash start date, then AED 5,000. */
export function prizeText(now: number) {
  const t = GUIDE.tournament;
  return now >= Date.parse(t.cashFrom)
    ? `AED ${t.cashAed.toLocaleString()} in cash`
    : `${t.nonCash} now, and AED ${t.cashAed.toLocaleString()} in cash from January 2027`;
}

function VisaLadder() {
  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl bg-sky-50 border border-sky-100 p-2.5">
      {LADDER.map(([icon, name, how], i) => (
        <div key={name} className="flex items-center gap-1 min-w-0">
          <div className="text-center min-w-0">
            <div className="text-lg leading-none">{icon}</div>
            <div className="text-[10px] font-black text-slate-800 truncate">{name}</div>
            <div className="text-[9px] text-slate-500 truncate">{how}</div>
          </div>
          {i < LADDER.length - 1 && <span className="text-slate-300 text-xs">›</span>}
        </div>
      ))}
    </div>
  );
}

/** Onboarding: everything you can do, at a glance. */
export function GuideOverview() {
  const [now] = useState(() => Date.now());
  return (
    <div className="space-y-3">
      <VisaLadder />
      <div className="grid grid-cols-2 gap-2">
        {GUIDE.sections.filter((s) => s.id !== "visa").map((s) => (
          <div key={s.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <div className="text-xl">{s.icon}</div>
            <div className="text-xs font-black text-slate-900 mt-1">{s.title}</div>
            <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.summary}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-3.5 text-slate-950">
        <div className="text-sm font-black">🏆 Win the monthly tournament</div>
        <div className="text-xs font-bold mt-0.5">The top player each month wins {prizeText(now)}. Free to enter, 21+.</div>
      </div>
      <p className="text-[11px] text-slate-500 text-center">You can read all of this again any time in <b>How Dubai works</b> (Settings).</p>
    </div>
  );
}

/** The full guide, with a way into each part of the game. */
export function GuideFull({ onNavigate }: { onNavigate?: () => void }) {
  const [now] = useState(() => Date.now());
  const [open, setOpen] = useState<string | null>("visa");
  return (
    <div className="space-y-2.5">
      <p className="text-sm text-slate-300">{GUIDE.intro}</p>
      <VisaLadder />
      {GUIDE.sections.map((s) => {
        const isOpen = open === s.id;
        return (
          <section key={s.id} className="rounded-3xl bg-slate-900 border border-white/10 overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : s.id)} className="w-full flex items-center gap-3 p-4 text-left">
              <span className="text-2xl">{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-black">{s.title}</span>
                <span className="block text-xs text-slate-400">{s.summary}</span>
              </span>
              <span className="text-slate-500">{isOpen ? "⌄" : "›"}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                <ul className="space-y-1.5">
                  {s.points.map((pt) => <li key={pt} className="text-sm text-slate-200 leading-relaxed">• {pt.replace("{prize}", prizeText(now))}</li>)}
                </ul>
                {"href" in s.cta && s.cta.href
                  ? <Link href={s.cta.href} onClick={onNavigate} className="inline-block mt-1 text-xs font-black px-4 py-2 rounded-full bg-emerald-500 text-slate-950">{s.cta.label} →</Link>
                  : <button onClick={() => { onNavigate?.(); openLife(s.cta.action as LifeTab); }} className="mt-1 text-xs font-black px-4 py-2 rounded-full bg-emerald-500 text-slate-950">{s.cta.label} →</button>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
