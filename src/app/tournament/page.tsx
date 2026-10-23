"use client";

// The monthly tournament (design spec section 13): free to enter, skill only, points from what you do.

import { emailStatus, sendVerification } from "@/lib/email";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { monthName, submitPrizeDetails, tournamentView, type TournamentView } from "@/lib/tournament";

const PILLARS: Array<[keyof NonNullable<TournamentView["mine"]>, string, string]> = [
  ["learning", "🎓", "Learning"], ["scam", "🛡️", "Scam defence"], ["wellbeing", "✨", "Wellbeing"], ["career", "💼", "Career & play"],
];

export default function TournamentPage() {
  useRequireCitizen();
  const [t, setT] = useState<TournamentView | null>(null);
  const [now] = useState(() => Date.now());
  const load = useCallback(async () => setT(await tournamentView()), []);
  useEffect(() => { const x = setTimeout(() => void load(), 0); return () => clearTimeout(x); }, [load]);

  const left = t ? Math.max(0, Date.parse(t.freezesAt) - now) : 0;
  const d = Math.floor(left / 86_400_000), h = Math.floor((left % 86_400_000) / 3_600_000);

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1"><h1 className="text-xl font-black">🏆 Monthly tournament</h1><p className="text-xs text-slate-400">Free to enter · skill only · 21+</p></div>
          <Link href="/tournament/rules" className="text-xs font-black px-3 py-2 rounded-full bg-white/10">Rules</Link>
        </div>

        {!t ? <p className="text-sm text-slate-500">Loading…</p> : (
          <>
            {t.lastWinner?.mine && <WinnerClaim w={t.lastWinner} onDone={load} />}

            <section className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-white/80">{monthName(t.month)}</p>
              <p className="text-2xl font-black leading-tight">{t.prize.kind === "cash" ? `AED ${t.prize.aed.toLocaleString()} cash prize` : "This month's prize"}</p>
              {t.prize.kind === "noncash" && <p className="text-sm text-white/90">{t.prize.text}</p>}
              {t.prize.kind === "noncash" && <p className="text-xs text-white/80 mt-1">The AED 5,000 cash prize starts with the {monthName(t.cashFrom)} tournament.</p>}
              <p className="text-xs font-bold text-white/80 mt-2">Leaderboard freezes in {d}d {h}h (23:59:59 GST, last day of the month)</p>
            </section>

            <section className="rounded-3xl bg-slate-900 border border-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Your score</p>
              {t.mine ? (
                <>
                  <div className="flex items-end gap-2 mb-3"><span className="text-4xl font-black">{t.mine.total.toLocaleString()}</span><span className="text-sm text-slate-400 mb-1">/ 10,000 · rank #{t.mine.rank}</span></div>
                  <div className="space-y-2">
                    {PILLARS.map(([k, icon, label]) => (
                      <div key={k}>
                        <div className="flex justify-between text-xs font-bold"><span>{icon} {label}</span><span>{(t.mine![k] as number).toLocaleString()} / 2,500</span></div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${((t.mine![k] as number) / 2500) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-slate-400">Score your first points this month to appear: pass a lesson, report a scam, win a multiplayer game or work a shift.</p>}
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Top 50</p>
              {t.standings.length === 0 ? <p className="text-sm text-slate-500">No scores yet this month.</p> : (
                <ol className="space-y-1">
                  {t.standings.map((s) => (
                    <li key={s.username} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${s.me ? "bg-amber-500 text-slate-950" : "bg-white/5"}`}>
                      <span className="w-7 text-center font-black text-sm">{s.rank <= 3 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}</span>
                      <span className="flex-1 font-bold text-sm truncate">@{s.username}{s.me ? " (you)" : ""}</span>
                      <span className="font-black text-sm">{s.total.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {t.lastWinner && !t.lastWinner.mine && t.lastWinner.username && (
              <p className="text-xs text-center text-slate-400"><Trophy className="inline w-3 h-3" /> {monthName(t.lastWinner.month)}: {t.lastWinner.username ? `@${t.lastWinner.username}` : "no winner"} {t.lastWinner.status === "paid" ? "· prize delivered" : t.lastWinner.status === "no_winner" ? "" : "· being verified"}</p>
            )}
            <p className="text-[11px] text-slate-500 text-center">Points come only from actions the game records. Buying AED never adds points. Winners must be 21+, verify their ID and hold one account. Apple and Google are not sponsors.</p>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function WinnerClaim({ w, onDone }: { w: NonNullable<TournamentView["lastWinner"]>; onDone: () => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [payout, setPayout] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  useEffect(() => { void emailStatus().then((s) => setVerified(s?.verified ?? false)); }, []);
  const cash = w.prize === "cash";

  if (w.status !== "awaiting_details") {
    return (
      <section className="rounded-3xl bg-emerald-600 p-4">
        <p className="font-black text-lg">🏆 You won {monthName(w.month)}!</p>
        <p className="text-sm text-white/90">{w.status === "under_review" ? "We're checking your details. You'll hear from us within 3 days." : w.status === "verified" ? "Verified! Your prize is on its way (within 14 days)." : w.status === "paid" ? "Your prize has been delivered. Congratulations!" : "This prize couldn't be confirmed."}</p>
      </section>
    );
  }
  return (
    <section className="rounded-3xl bg-emerald-600 p-4 space-y-2.5">
      <p className="font-black text-lg">🏆 You won {monthName(w.month)}!</p>
      <p className="text-sm text-white/90">To receive your {cash ? `AED ${Number(w.aed).toLocaleString()} prize` : "prize"}, confirm who you are. Your ID is stored privately and only used for this check.</p>
      {verified === false && (
        <div className="rounded-xl bg-white/15 p-3 text-sm">
          <b>First, verify your email.</b> Prizes are only paid to verified accounts.
          <button onClick={async () => setErr((await sendVerification()).text)} className="block mt-2 h-9 px-4 rounded-full bg-white text-emerald-800 font-black text-xs">Send me the link</button>
        </div>
      )}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name exactly as on your ID" className="w-full h-11 rounded-xl px-3 text-base text-slate-900" />
      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country of residence" className="w-full h-11 rounded-xl px-3 text-base text-slate-900" />
      <textarea value={payout} onChange={(e) => setPayout(e.target.value)} rows={2} placeholder={cash ? "Bank name and IBAN for the transfer" : "Phone number or email so we can arrange your prize"} className="w-full rounded-xl px-3 py-2 text-base text-slate-900" />
      <label className="block text-sm font-bold">Photo of your Emirates ID or passport
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block mt-1 text-xs" />
      </label>
      {err && <p className="text-xs font-bold text-rose-100">{err}</p>}
      <button disabled={busy || name.trim().length < 3 || payout.trim().length < 5 || !file} onClick={async () => {
        setBusy(true); setErr(null);
        const e = await submitPrizeDetails(w.month, name, country, payout, file!);
        setBusy(false);
        if (e) setErr(e); else onDone();
      }} className="w-full h-12 rounded-2xl bg-white text-emerald-800 font-black disabled:opacity-50">{busy ? "Sending…" : "Send for verification"}</button>
    </section>
  );
}
