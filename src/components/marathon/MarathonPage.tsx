"use client";

// The race page, opened from the phone's Events app, the reminder banner or a shared link: the next race
// and a countdown, signing up (and your bib), inviting friends, who's running, last week's podium, and
// the start line once the race is about to begin.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { DEFAULT_NEEDS, updateCitizen, useCitizen, type NeedKey } from "@/lib/citizenStore";
import { gainSkill, lifeEvent } from "@/lib/life";
import { MARATHON, phaseOf, raceClock, raceDate, raceLink, register, serverNow, shownKm, useMarathon } from "@/lib/marathon";
import { gameAudio } from "@/utils/gameAudio";

// The 3D race loads only when it's needed.
const MarathonRace = dynamic(() => import("./MarathonRace").then((m) => m.MarathonRace), { ssr: false });

const DONE_KEY = "dubai_marathon_done";

export function MarathonPage() {
  const router = useRouter();
  const { citizen, hydrated, isLoggedIn } = useCitizen();
  const o = useMarathon(citizen?.id);
  const [now, setNow] = useState(() => serverNow());
  const [racing, setRacing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(serverNow()), 1000); return () => clearInterval(t); }, []);
  // Not signed in (e.g. from a shared link): sign up first, keeping the friend who shared it as referrer.
  useEffect(() => {
    if (!hydrated || isLoggedIn) return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    router.replace(`/?signup=true${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`);
  }, [hydrated, isLoggedIn, router]);

  if (!o || !citizen) return <Shell><p className="text-center text-slate-500 py-20">Loading the race…</p></Shell>;

  const phase = phaseOf(o, now);
  const start = Date.parse(o.race);
  const left = start - now;
  const countdown = left > 86_400_000 ? `${Math.floor(left / 86_400_000)}d ${Math.floor((left % 86_400_000) / 3_600_000)}h` : raceClock(left);
  const canRace = !!o.me && (phase === "soon" || phase === "live");

  if (racing && o.me) {
    return <MarathonRace o={o} myId={citizen.id} look={citizen.look} onExit={() => setRacing(false)} onFinished={() => {
      // The run's effects, once per race.
      let done: string | null = null;
      try { done = localStorage.getItem(DONE_KEY); } catch { /* storage off */ }
      if (done === o.race) return;
      try { localStorage.setItem(DONE_KEY, o.race); } catch { /* storage off */ }
      updateCitizen((c) => {
        const needs = { ...DEFAULT_NEEDS, ...c.needs };
        for (const [k, v] of Object.entries(MARATHON.effects) as Array<[NeedKey, number]>) needs[k] = Math.max(0, Math.min(100, needs[k] + v));
        return { ...c, needs };
      });
      gainSkill("fitness", MARATHON.fitnessXp);
      lifeEvent("workout");
    }} />;
  }

  const signUp = async () => {
    setBusy(true);
    const r = await register();
    setBusy(false);
    if (r.error) return setNote(r.error);
    gameAudio.playCoinSound();
    setNote(`You're in! Your bib is #${r.bib}. Invite friends to run with you.`);
  };
  const share = async () => {
    const url = raceLink(citizen.username);
    const text = `I'm running the ${MARATHON.name} on ${raceDate(o.race)}. Come run with me 🏃`;
    if (navigator.share) { try { await navigator.share({ title: MARATHON.name, text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setNote("Link copied. Send it to your friends."); } catch { /* blocked */ }
  };

  return (
    <Shell>
      <div className="rounded-[32px] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white p-6 space-y-3 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Every Friday · free</p>
        <h1 className="text-3xl font-black leading-tight">🏅 {MARATHON.name}</h1>
        <p className="text-emerald-50">{shownKm(MARATHON.courseMetres)} km past Burj Khalifa, Sheikh Zayed Road, the Dubai Frame and the Museum of the Future, finishing at The Dubai Mall.</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-2.5"><p className="text-[11px] text-emerald-100">Starts</p><p className="font-black text-sm leading-tight">{phase === "live" ? "Now!" : countdown}</p></div>
          <div className="rounded-2xl bg-white/15 p-2.5"><p className="text-[11px] text-emerald-100">Runners</p><p className="font-black text-lg leading-tight">{o.entrants}</p></div>
          <div className="rounded-2xl bg-white/15 p-2.5"><p className="text-[11px] text-emerald-100">Winner gets</p><p className="font-black text-sm leading-tight">AED {MARATHON.prizes[0].toLocaleString()}</p></div>
        </div>
        <p className="text-sm text-emerald-50">{raceDate(o.race)} (Dubai time)</p>
      </div>

      {note && <p className="rounded-2xl bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-semibold">{note}</p>}

      <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
        {o.me ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center"><span className="text-[9px] font-bold text-slate-400">BIB</span><span className="text-2xl font-black leading-none">{o.me.bib}</span></span>
              <div className="flex-1"><p className="font-black text-lg">You&apos;re running</p><p className="text-sm text-slate-500">Be at the start line a few minutes before {new Date(o.race).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "numeric", minute: "2-digit" })}.</p></div>
            </div>
            {canRace
              ? <button onClick={() => { gameAudio.playClickSound(); setRacing(true); }} className="w-full h-16 rounded-full bg-emerald-700 text-white text-xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)]">{phase === "live" ? "Join the race now" : "Go to the start line"}</button>
              : <p className="text-center text-sm text-slate-500">The start line opens 15 minutes before the race.</p>}
          </>
        ) : phase === "live" || phase === "over" ? (
          <p className="text-slate-600">This week&apos;s race has started. Sign-ups for next Friday open after it finishes.</p>
        ) : (
          <button disabled={busy} onClick={signUp} className="w-full h-16 rounded-full bg-emerald-700 text-white text-xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)] disabled:opacity-60">Sign up · free</button>
        )}
        <button onClick={share} className="w-full h-12 rounded-full bg-slate-100 font-semibold">📣 Invite friends to run with you</button>
        <p className="text-xs text-slate-400 text-center">How it works: everyone starts together. Steer and set your pace with the stick, sprint while your stamina lasts, grab water, hit the crowd boosts and dodge the cones. Top 3 win AED {MARATHON.prizes.map((p) => p.toLocaleString()).join(" / ")}; every finisher gets a medal and +{MARATHON.finisherPoints} points.</p>
      </section>

      <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
        <p className="font-black text-lg">Runners · {o.entrants}</p>
        {o.runners.length === 0 ? <p className="text-slate-500">Nobody yet. Be the first, and bring friends.</p> : o.runners.slice(0, 50).map((r, i) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="w-6 text-right text-sm font-black text-slate-400">{phase === "live" || r.finishMs ? i + 1 : ""}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-9 h-9 rounded-full object-cover object-top bg-slate-100" />
            <span className="flex-1 min-w-0 font-semibold truncate">#{r.bib} @{r.username}</span>
            <span className="text-sm text-slate-500 tabular-nums">{r.finishMs ? raceClock(r.finishMs) : phase === "live" ? `${shownKm(r.distance)} km` : ""}</span>
          </div>
        ))}
      </section>

      {o.last && o.last.podium.length > 0 && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-2">
          <p className="font-black text-lg">Last week&apos;s podium</p>
          {o.last.podium.map((p, i) => (
            <p key={p.username} className="flex items-center gap-2"><span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span><span className="flex-1 font-semibold">@{p.username}</span><span className="tabular-nums text-slate-500">{raceClock(p.finishMs)}</span></p>
          ))}
          <p className="text-xs text-slate-400">{o.last.finishers} finishers</p>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 to-white text-slate-900">
      <div className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 space-y-4">
        <Link href="/explore" className="inline-block text-sm font-semibold text-slate-500">← Dubai Life</Link>
        {children}
      </div>
    </main>
  );
}
