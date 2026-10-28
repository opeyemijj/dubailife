"use client";

// Life & Fun: this weekend's card (two different fun things on Saturday or Sunday, building a weekend
// streak) and the fun goals by category: love, nightlife, beach and outdoors, staycations and treats.

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { claimFun, FUN, useFun, type FunStatus } from "@/lib/fun";
import { gameAudio } from "@/utils/gameAudio";

export function WeekendCard({ status, dark }: { status: FunStatus; dark?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const w = status.weekend;
  const done = new Set(w.done);
  const ready = done.size >= FUN.weekend.need && !w.claimed;
  const sat = new Date(`${w.saturday}T12:00:00+04:00`);
  const when = w.now ? "This weekend" : `Next weekend · Sat ${sat.getUTCDate()} ${sat.toLocaleString("en-GB", { month: "short", timeZone: "Asia/Dubai" })}`;
  const collect = async () => {
    setBusy(true);
    const r = await claimFun("weekend");
    setBusy(false);
    if (r.error) { setNote(r.error); return; }
    gameAudio.playCoinSound();
    setNote(`+${r.data} XP. Great weekend!`);
  };
  return (
    <div className={`rounded-3xl p-3 space-y-2 ${dark ? "bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white" : "bg-gradient-to-br from-fuchsia-50 to-orange-50 text-slate-900"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">🎉 {when}</p>
          <p className="font-black leading-tight">Do {FUN.weekend.need} fun things on Saturday or Sunday</p>
        </div>
        {status.streak > 0 && <span className="text-xs font-black rounded-full bg-black/15 px-2 py-1">🔥 {status.streak} weekend{status.streak > 1 ? "s" : ""}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FUN.weekend.options.map((o) => (
          <span key={o.id} className={`text-xs font-bold rounded-full px-2.5 py-1 ${done.has(o.id) ? "bg-emerald-500 text-white" : dark ? "bg-white/15" : "bg-white"}`}>
            {done.has(o.id) ? "✓" : o.icon} {o.title}
          </span>
        ))}
      </div>
      {ready && <button onClick={collect} disabled={busy} className="w-full h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm disabled:opacity-60">🎁 Collect {FUN.weekend.xp} XP</button>}
      {w.claimed && <p className="text-xs font-bold opacity-80">✓ Weekend done. See you next weekend!</p>}
      {note && <p className="text-xs font-black">{note}</p>}
    </div>
  );
}

export function FunGoals() {
  const { citizen } = useCitizen();
  const { status, error, reload } = useFun(citizen?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [gained, setGained] = useState<Record<string, number>>({});
  if (!status && error) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-white/70">Couldn&apos;t load Life &amp; Fun right now.</p>
        <button onClick={() => void reload()} className="h-10 px-5 rounded-full bg-white/10 font-black text-sm">Try again</button>
      </div>
    );
  }
  if (!status) return <p className="text-center text-white/50 py-8">Loading…</p>;
  const prog = Object.fromEntries(status.goals.map((g) => [g.id, g]));
  const collect = async (id: string) => {
    setBusy(id);
    const r = await claimFun(`goal:${id}`);
    setBusy(null);
    if (r.data !== undefined) { gameAudio.playCoinSound(); setGained((x) => ({ ...x, [id]: r.data! })); }
  };

  return (
    <div className="space-y-4">
      <WeekendCard status={status} dark />
      {FUN.categories.map((c) => (
        <section key={c.id} className="space-y-2">
          <div>
            <h2 className="font-black text-lg">{c.icon} {c.title}</h2>
            <p className="text-xs text-white/50">{c.blurb}</p>
          </div>
          {FUN.goals.filter((g) => g.category === c.id).map((g) => {
            const p = prog[g.id] ?? { progress: 0, claimed: false };
            const done = p.progress >= g.count;
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="text-2xl">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight">{g.title}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${(p.progress / g.count) * 100}%` }} /></div>
                  <p className="text-[11px] text-white/50 mt-1">{p.progress}/{g.count} · {g.xp} XP{gained[g.id] !== undefined ? ` · +${gained[g.id]} collected` : ""}</p>
                </div>
                {p.claimed ? <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-4 h-4" /></span>
                  : done ? <button disabled={busy === g.id} onClick={() => collect(g.id)} className="h-9 px-3 rounded-full bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-60">Collect</button>
                  : <Link href={g.href} className="h-9 px-3 rounded-full bg-white/10 text-xs font-black flex items-center">Go</Link>}
              </div>
            );
          })}
        </section>
      ))}
      <p className="text-center text-[11px] text-white/40">Fun goals count when you go into a beach, club, waterpark, restaurant or attraction in the game, or book a hotel night. Brunch counts Friday to Sunday.</p>
    </div>
  );
}
