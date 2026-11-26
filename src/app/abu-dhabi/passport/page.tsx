"use client";

// The Abu Dhabi Passport: your stamp book. Each landmark's signature thing (a tour, a ride, a kayak through the
// mangroves) stamps it; the book pays at 4, 8 and 12 stamps and makes you an Abu Dhabi Explorer at 16
// (lib/city/abuDhabi/passport). A missing stamp is a tap away: it opens the trip there on the map.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { PASSPORT, PASSPORT_SIZE, usePassport } from "@/lib/city/abuDhabi/passport";
import { useCurrentCity } from "@/lib/city/presence";

export default function PassportPage() {
  useRequireCitizen();
  const mine = usePassport();
  const here = useCurrentCity();
  const count = mine?.size ?? 0;
  const inAbuDhabi = here.city === "abu-dhabi";
  const next = PASSPORT.rewards.find((r) => r.at > count);

  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-b from-teal-950 via-slate-950 to-slate-950 text-white pb-32">
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href={inAbuDhabi ? "/abu-dhabi" : "/explore"} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black leading-tight">Abu Dhabi Passport</h1>
            <p className="text-xs text-white/60">{count} of {PASSPORT_SIZE} stamps</p>
          </div>
        </header>

        {/* The cover: progress and what the next stamps pay. */}
        <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-900 border border-amber-300/30 p-5 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">United Arab Emirates · Abu Dhabi</p>
          <p className="mt-1 text-xl font-black">{count >= PASSPORT_SIZE ? `🏅 ${PASSPORT.title}` : "Collect a stamp at every landmark"}</p>
          <div className="mt-3 h-2.5 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full bg-amber-300 transition-all" style={{ width: `${(count / PASSPORT_SIZE) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {PASSPORT.rewards.map((r) => (
              <div key={r.at} className={`rounded-xl py-1.5 ${count >= r.at ? "bg-amber-300 text-slate-950" : "bg-black/25 text-white/80"}`}>
                <p className="text-[10px] font-black">{r.at} stamps</p>
                <p className="text-xs font-black">{r.title ? "🏅 + " : ""}AED {r.aed.toLocaleString()}</p>
              </div>
            ))}
          </div>
          {next && <p className="mt-2 text-xs text-teal-100">{next.at - count} more for AED {next.aed.toLocaleString()}{next.title ? ` and the ${PASSPORT.title} title` : ""}.</p>}
          {!inAbuDhabi && <p className="mt-2 text-xs font-bold text-amber-200">Stamps are collected in Abu Dhabi: fly there from DXB Terminal 3.</p>}
        </section>

        {/* The pages: every stamp, collected or still to get. */}
        <section className="grid grid-cols-2 gap-2.5">
          {PASSPORT.stamps.map((s, i) => {
            const got = !!mine?.has(s.id);
            const body = (
              <>
                <div className={`mx-auto w-16 h-16 rounded-full border-[3px] border-dashed flex items-center justify-center text-3xl ${got ? "border-rose-500 bg-rose-50" : "border-white/20 bg-white/5 grayscale opacity-60"}`}
                  style={got ? { transform: `rotate(${(i % 5) * 7 - 14}deg)` } : undefined}>{s.icon}</div>
                <p className={`mt-2 text-sm font-black leading-tight ${got ? "text-slate-900" : ""}`}>{s.name}</p>
                <p className={`text-[11px] leading-snug ${got ? "text-rose-700 font-bold" : "text-white/60"}`}>{got ? "✓ Stamped" : s.how}</p>
              </>
            );
            const cls = `rounded-2xl p-3 text-center ${got ? "bg-[#fdf6e3] text-slate-900" : "bg-white/5 border border-white/10"}`;
            return got || !inAbuDhabi
              ? <div key={s.id} className={cls}>{body}</div>
              : <Link key={s.id} href={`/abu-dhabi?to=${s.place}`} className={`${cls} active:scale-[0.98]`}>{body}<p className="mt-1 text-[10px] font-black text-amber-300">Go there ›</p></Link>;
          })}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
