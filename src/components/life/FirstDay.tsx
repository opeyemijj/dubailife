"use client";

// "Your first day in Dubai" (design spec section 19.4): a small checklist for new players on the map and at
// home. Four core steps pay a one-time reward, checked on the server (first_day_status / claim_first_day).

import { ShareButton } from "@/components/share/ShareButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, X } from "lucide-react";
import { isNewCitizen, refreshCitizen, useCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import { openPushCoach } from "@/lib/push/engage";
import { gameAudio } from "@/utils/gameAudio";
import FIRST_DAY from "@/data/life/first-day.json";
import { openLife } from "./LifeHub";

type Status = Record<string, boolean> & { reward?: number };

// Whether the first-day checklist is still running, so other screens can stay quiet meanwhile.
let firstDayActive = false;
const subs = new Set<() => void>();
const setActive = (v: boolean) => { if (v !== firstDayActive) { firstDayActive = v; subs.forEach((f) => f()); } };
export function useFirstDayActive() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => firstDayActive, () => false);
}
const HIDDEN = "dl_first_day_hidden";

export function FirstDay() {
  const { citizen } = useCitizen();
  const path = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(HIDDEN) === "1"; } catch { return false; } });
  const [paid, setPaid] = useState(0);
  const eligible = !!citizen?.id && isNewCitizen(citizen);

  const load = useCallback(async () => {
    const { data } = await supabase().rpc("first_day_status");
    if (data) { setStatus(data as Status); setActive(!(data as Status).claimed); }
  }, []);
  useEffect(() => {
    if (!eligible) return;
    const first = setTimeout(() => void load(), 0);
    const again = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", again);
    const t = setInterval(() => void load(), 60_000);
    return () => { clearTimeout(first); document.removeEventListener("visibilitychange", again); clearInterval(t); };
  }, [eligible, load, path]);

  if (!eligible || !status || hidden || (status.claimed && !paid) || !/^\/(explore|home)\b/.test(path ?? "")) return null;

  const core = FIRST_DAY.steps.filter((s) => !("optional" in s && s.optional));
  const done = core.filter((s) => status[s.id]).length;
  const ready = done === core.length && !status.claimed;

  const claim = async () => {
    const { data, error } = await supabase().rpc("claim_first_day");
    if (error) return void load();
    gameAudio.playCoinSound();
    setPaid(Number(data) || 0);
    setActive(false);
    refreshCitizen();
    setTimeout(() => setHidden(true), 4000);
  };

  return (
    // Top corner, clear of the needs dock and the bottom bars: right on Home, left under the map's top bar.
    <div className={`fixed top-[calc(env(safe-area-inset-top)+5.25rem)] z-[60] w-[min(300px,calc(100vw-1.5rem))] pointer-events-auto flex flex-col ${path?.startsWith("/home") ? "right-3 items-end" : "left-3 items-start"}`}>
      {!open ? (
        <button onClick={() => { gameAudio.playClickSound(); setOpen(true); }}
          className={`flex items-center gap-2 h-11 pl-3 pr-4 rounded-full shadow-xl font-black text-sm ${ready ? "bg-amber-400 text-slate-950 animate-bounce" : "bg-white text-slate-900"}`}>
          <span>🌅</span> {ready ? `Claim AED ${(status.reward ?? 0).toLocaleString()}` : `First day · ${done}/${core.length}`}
        </button>
      ) : (
        <div className="rounded-3xl bg-white text-slate-900 shadow-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌅</span>
            <div className="flex-1">
              <p className="font-black leading-tight">{FIRST_DAY.title}</p>
              <p className="text-[11px] text-slate-500">{paid ? "Reward paid. Enjoy Dubai!" : `Finish ${core.length} steps for AED ${(status.reward ?? 0).toLocaleString()}`}</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Minimise"><ChevronDown className="w-4 h-4" /></button>
            <button onClick={() => { setHidden(true); try { localStorage.setItem(HIDDEN, "1"); } catch { /* storage blocked */ } }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Hide"><X className="w-4 h-4" /></button>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(done / core.length) * 100}%` }} /></div>
          <ol className="space-y-1.5">
            {FIRST_DAY.steps.map((s) => {
              const ok = !!status[s.id];
              const go = () => {
                gameAudio.playClickSound();
                if ("action" in s && s.action === "visa") openLife("visa");
                if ("action" in s && s.action === "push") openPushCoach();
              };
              const body = (
                <>
                  <span className="text-lg w-6 text-center">{ok ? "✅" : s.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-bold ${ok ? "line-through text-slate-400" : ""}`}>{s.title}{"optional" in s && s.optional ? " (optional)" : ""}</span>
                    {!ok && <span className="block text-[11px] text-slate-500">{s.text}</span>}
                  </span>
                </>
              );
              const cls = "flex items-center gap-2.5 w-full text-left rounded-2xl p-2 bg-slate-50";
              return <li key={s.id}>{ok ? <div className={cls}>{body}</div> : "href" in s ? <Link href={s.href!} onClick={() => gameAudio.playClickSound()} className={cls}>{body}</Link> : <button onClick={go} className={cls}>{body}</button>}</li>;
            })}
          </ol>
          <Link href="/guide" className="block text-center text-xs font-black text-sky-600">📖 How Dubai works: visas, jobs, prizes ›</Link>
          {ready && <button onClick={claim} className="w-full h-11 rounded-2xl bg-amber-400 text-slate-950 font-black">Claim AED {(status.reward ?? 0).toLocaleString()}</button>}
          {paid > 0 && <p className="text-center text-sm font-black text-emerald-700">+AED {paid.toLocaleString()} added to your wallet 🎉</p>}
          {paid > 0 && <ShareButton moment="first-day" text="I survived my first day in Dubai 🌅" className="w-full h-10 rounded-2xl bg-sky-500 text-white text-sm" />}
        </div>
      )}
    </div>
  );
}
