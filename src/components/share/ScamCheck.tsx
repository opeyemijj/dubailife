"use client";

// The public scam check: one scenario at a time, three choices, then the red flags. Nothing is saved.

import Link from "next/link";
import { useState } from "react";
import { Share2 } from "lucide-react";
import SCAMS from "@/data/scams/scams.json";

const CHOICES = [
  { id: "comply", label: (s: (typeof SCAMS.scams)[number]) => s.comply },
  { id: "report", label: () => "Report it" },
  { id: "ignore", label: (s: (typeof SCAMS.scams)[number]) => (s.channel === "call" ? "Hang up" : "Ignore it") },
] as const;

export function ScamCheck({ start, referrer }: { start: string; referrer: string | null }) {
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
    <main className="min-h-[100dvh] bg-slate-950 text-white px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto space-y-4">
        <header className="text-center space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Come To Dubai · Scam check</p>
          <h1 className="text-2xl font-black">Would you fall for it?</h1>
          <p className="text-sm text-slate-400">Real scam patterns, fake senders. Nothing you tap here is real or saved.</p>
          {score.seen > 0 && <p className="text-xs font-bold text-emerald-300">You stayed safe {score.safe} of {score.seen}</p>}
        </header>

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

        <Link href={join} className="block rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-slate-950">
          <span className="block font-black text-lg">Live the full Dubai life, free</span>
          <span className="block text-sm font-bold">Start with AED 50,000, beat the visa clock, catch scammers for bounties. 21+.</span>
        </Link>
      </div>
    </main>
  );
}
