"use client";

// Today's three missions (new every day at 09:00 Dubai time), each with a button to go and do it, and a
// Collect button for their XP; doing all three opens the mystery box. Used in the Next step card and on
// the Goals page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { claimMissions, collectable, MISSIONS, missionOf, useMissions } from "@/lib/missions";
import { gameAudio } from "@/utils/gameAudio";
import { MysteryBox } from "./MysteryBox";

const left = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export function DailyMissions({ dark, onGo }: { dark?: boolean; onGo?: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const { missions } = useMissions(citizen?.id);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState<{ aed: number; xp: number } | null>(null);
  const [gained, setGained] = useState<number | null>(null);
  if (!missions) return null;
  const done = missions.missions.filter((m) => m.done).length;

  const collect = async () => {
    setBusy(true);
    const r = await claimMissions();
    setBusy(false);
    if (!r.data) return;
    if (r.data.box) setBox({ aed: r.data.box, xp: MISSIONS.box.xp });
    else { gameAudio.playCoinSound(); setGained(r.data.xp); setTimeout(() => setGained(null), 2500); }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-black uppercase tracking-widest ${dark ? "text-white/60" : "text-violet-700"}`}>Today&apos;s missions · {done}/3</p>
        {now > 0 && <p className={`text-[10px] font-bold ${dark ? "text-white/40" : "text-slate-400"}`}>New in {left(missions.nextAt, now)}</p>}
      </div>
      {missions.missions.map((m) => {
        const meta = missionOf(m.id);
        if (!meta) return null;
        return (
          <button key={m.id} disabled={m.done} onClick={() => { gameAudio.playClickSound(); onGo?.(); router.push(meta.href); }}
            className={`w-full flex items-center gap-2.5 rounded-2xl p-2.5 text-left ${m.done ? (dark ? "bg-violet-500/20" : "bg-violet-50") : dark ? "bg-white/5" : "bg-slate-50 hover:bg-slate-100"}`}>
            <span className="text-lg w-6 text-center">{meta.icon}</span>
            <span className={`flex-1 min-w-0 text-sm font-bold ${m.done ? "line-through opacity-50" : ""}`}>{meta.title}</span>
            {m.done ? <Check className="w-4 h-4 text-violet-500" /> : <span className="text-[11px] font-black text-amber-500">+{MISSIONS.xp}</span>}
            {!m.done && <ChevronRight className="w-4 h-4 opacity-40" />}
          </button>
        );
      })}
      {collectable(missions) && (
        <button onClick={collect} disabled={busy} className="w-full h-11 rounded-2xl bg-violet-600 text-white font-black disabled:opacity-60">
          {busy ? "Collecting…" : missions.box.ready && !missions.box.claimed ? "🎁 Collect and open the mystery box" : "Collect mission XP"}
        </button>
      )}
      {missions.box.claimed && <p className={`text-center text-[11px] font-bold ${dark ? "text-white/50" : "text-slate-500"}`}>🎁 Today&apos;s box: AED {(missions.box.aed ?? 0).toLocaleString()}. New missions tomorrow at 9am.</p>}
      {!missions.box.ready && <p className={`text-center text-[11px] ${dark ? "text-white/40" : "text-slate-400"}`}>Do all three to open the mystery box</p>}
      {gained !== null && <p className="text-center text-xs font-black text-amber-500">+{gained} XP</p>}
      {box && <MysteryBox prize={box.aed} xp={box.xp} onDone={() => setBox(null)} />}
    </div>
  );
}
