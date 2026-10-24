"use client";

// The public scam check: one scenario at a time, three choices, then the red flags. Nothing is saved.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Briefcase, Compass, Home, Share2, Shield, Trophy } from "lucide-react";
import SCAMS from "@/data/scams/scams.json";
import { useCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";

const CHOICES = [
  { id: "comply", label: (s: (typeof SCAMS.scams)[number]) => s.comply },
  { id: "report", label: () => "Report it" },
  { id: "ignore", label: (s: (typeof SCAMS.scams)[number]) => (s.channel === "call" ? "Hang up" : "Ignore it") },
] as const;

export function ScamCheck({ start, referrer }: { start: string; referrer: string | null }) {
  const { citizen } = useCitizen();
  const first = Math.max(0, SCAMS.scams.findIndex((s) => s.id === start));
  const [i, setI] = useState(first);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState({ safe: 0, seen: 0 });
  const s = SCAMS.scams[i % SCAMS.scams.length];
  const safe = pick && pick !== "comply";

  const choose = (id: string) => { setPick(id); setScore((x) => ({ safe: x.safe + (id === "comply" ? 0 : 1), seen: x.seen + 1 })); };
  const next = () => { setPick(null); setI(i + 1); };
  const share = async () => {
    const url = `${window.location.origin}/scam-check?s=${s.id}${referrer ? `&r=${referrer}` : ""}`;
    const text = "Would you fall for this scam? Take the 30-second check 🛡️";
    if (navigator.share) { try { await navigator.share({ title: "Scam check", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); alert("Link copied. Send it to someone you care about."); } catch { /* blocked */ }
  };
  const join = referrer ? `/?signup=true&ref=${referrer}` : "/?signup=true";

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white px-4 py-[max(1rem,env(safe-area-inset-top))] pb-32">
      <div className="max-w-md mx-auto space-y-4">
        {/* TOP NAVIGATION / EXIT HEADER */}
        <header className="flex items-center justify-between pb-1">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-slate-200 transition-all active:scale-95 shadow-md"
            aria-label="Back to Dubai City Map"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Map</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/home"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-300 transition-all active:scale-95"
              title="My Home"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-300 transition-all active:scale-95"
              title="City Map"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Map</span>
            </Link>
          </div>
        </header>

        <section className="text-center space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Dubai Life · Scam check</p>
          <h1 className="text-2xl font-black">Would you fall for it?</h1>
          <p className="text-sm text-slate-400">Real scam patterns, fake senders. Nothing you tap here is real or saved.</p>
          {score.seen > 0 && <p className="text-xs font-bold text-emerald-300">You stayed safe {score.safe} of {score.seen}</p>}
        </section>

        <div className="rounded-3xl bg-slate-900 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">SIMULATION</span>
            <span className="text-xs text-slate-400">{s.channel === "call" ? "📞 Incoming call" : s.channel === "telegram" ? "✈️ Telegram" : "💬 Message"}</span>
          </div>
          <p className="font-black">{s.sender}</p>
          {s.lines.map((l, k) => <p key={k} className={`text-sm leading-relaxed ${s.channel === "call" ? "italic text-white/90" : "rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5"}`}>{s.channel === "call" ? `“${l}”` : l}</p>)}
        </div>

        {!pick ? (
          <div className="grid gap-2">
            {CHOICES.map((c) => <button key={c.id} onClick={() => choose(c.id)} className="h-12 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-sm">{c.label(s)}</button>)}
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-3xl p-4 text-center ${safe ? "bg-emerald-600/20 border border-emerald-500/40" : "bg-rose-600/20 border border-rose-500/40"}`}>
              <p className="text-3xl">{safe ? "🛡️" : "😬"}</p>
              <p className="font-black text-lg">{safe ? (pick === "report" ? "Reported. Perfect." : "Safe! Reporting is even better.") : "That was a scam"}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">Red flags</p>
              {s.redFlags.map((f) => <p key={f} className="text-sm">✗ {f}</p>)}
              <p className="text-sm text-white/80 pt-2 border-t border-white/10 mt-2">{s.realWorld}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={share} className="h-12 rounded-2xl bg-sky-500 font-black text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Send to family</button>
              <button onClick={next} className="h-12 rounded-2xl bg-white/10 font-black text-sm">Next scam →</button>
            </div>
          </div>
        )}

        {/* EXPLICIT EXIT & NAVIGATION CTA */}
        <div className="space-y-2 pt-2">
          <Link
            href="/explore"
            className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Return to Dubai City Map</span>
          </Link>

          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400 pt-1">
            <Link href="/home" className="hover:text-white transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-amber-400" /> My Home
            </Link>
            <span>•</span>
            <Link href="/jobs" className="hover:text-white transition-colors flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Jobs
            </Link>
            <span>•</span>
            <Link href="/tournament" className="hover:text-white transition-colors flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Tournament
            </Link>
          </div>
        </div>

        {/* Guest conversion banner or signed in citizen status */}
        {!citizen ? (
          <Link href={join} className="block rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-slate-950 shadow-xl transition-all hover:opacity-95">
            <span className="block font-black text-lg">Live the full Dubai life, free</span>
            <span className="block text-sm font-bold">Start with AED 50,000, beat the visa clock, catch scammers for bounties. 21+.</span>
          </Link>
        ) : (
          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Signed in as @{citizen.username}</span>
            </div>
            <Link href="/explore" className="text-xs font-black text-emerald-400 hover:underline">
              Open Map →
            </Link>
          </div>
        )}
      </div>

      {/* Persistent bottom navigation dock for active citizens */}
      {citizen && <BottomNav />}
    </main>
  );
}
