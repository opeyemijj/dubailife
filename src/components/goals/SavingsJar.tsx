"use client";

// The savings jar, in the Wallet: money kept out of your spending, which counts toward the Save up goal.
// Move some in or take some out at any time.

import { useEffect, useState } from "react";
import { PiggyBank } from "lucide-react";
import { moveSavings, mySavings } from "@/lib/missions";
import { gameAudio } from "@/utils/gameAudio";

export function SavingsJar({ me, balance }: { me: string | undefined; balance: number }) {
  const [jar, setJar] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (me) void mySavings().then((s) => setJar(s?.amount ?? 0)); }, [me]);

  const move = async (dir: 1 | -1) => {
    const n = Math.floor(Number(amount));
    if (!n || n <= 0) { setNote("Enter an amount in AED."); return; }
    setBusy(true); setNote(null);
    const r = await moveSavings(dir * n);
    setBusy(false);
    if (r.error) { setNote(r.error); return; }
    gameAudio.playCoinSound();
    setJar(r.data ?? 0); setAmount("");
  };
  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 p-5 shadow-xl space-y-3">
      <div className="flex items-center gap-3">
        <PiggyBank className="w-8 h-8" />
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-white/75">Savings jar</p>
          <p className="text-3xl font-black">AED {(jar ?? 0).toLocaleString()}</p>
        </div>
      </div>
      <p className="text-xs font-bold text-white/80">Money you&apos;ve put aside. It counts toward your Save up goal; on payday you can drop some straight in.</p>
      <div className="flex gap-2">
        <input id="savings-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="AED" aria-label="Amount in AED"
          className="flex-1 min-w-0 h-11 rounded-2xl bg-white/15 px-3 font-black placeholder:text-white/50 outline-none focus:bg-white/25" />
        <button disabled={busy} onClick={() => move(1)} className="h-11 px-3 rounded-2xl bg-white text-emerald-800 text-sm font-black disabled:opacity-60">Save</button>
        <button disabled={busy || !jar} onClick={() => move(-1)} className="h-11 px-3 rounded-2xl bg-black/20 text-sm font-black disabled:opacity-40">Take out</button>
      </div>
      {note && <p className="text-xs font-bold text-amber-100">{note}</p>}
      {jar !== null && balance > 0 && <p className="text-[11px] text-white/70">Wallet AED {balance.toLocaleString()} · total AED {(balance + jar).toLocaleString()}</p>}
    </section>
  );
}
