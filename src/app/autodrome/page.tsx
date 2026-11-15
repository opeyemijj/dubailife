"use client";

// Dubai Autodrome, Motor City: open a race with one of your cars and invite friends, or join one that's waiting.
// The race itself is at /autodrome/<code>.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { carName } from "@/lib/cityFeed";
import { createRace, joinRace, myRaceCars, openRaces, type OpenRace, type RaceCar } from "@/lib/autodrome";
import { gameAudio } from "@/utils/gameAudio";

export default function AutodromePage() {
  useRequireCitizen();
  const router = useRouter();
  const [cars, setCars] = useState<RaceCar[] | null>(null);
  const [car, setCar] = useState<number | null>(null);
  const [laps, setLaps] = useState(3);
  const [races, setRaces] = useState<OpenRace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void myRaceCars().then((r) => { if (!live) return; setCars(r.data ?? []); setCar(r.data?.[0]?.id ?? null); });
    const load = () => void openRaces().then((r) => { if (live) setRaces(r.data ?? []); });
    load();
    const every = setInterval(load, 5000);
    return () => { live = false; clearInterval(every); };
  }, []);

  const open = async () => {
    if (!car) return;
    setBusy(true); setError(null); gameAudio.playClickSound();
    const r = await createRace(car, laps);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't open a race."); return; }
    router.push(`/autodrome/${r.data}`);
  };
  const join = async (code: string) => {
    if (!car) { setError("You need a car of your own to race."); return; }
    setBusy(true); setError(null); gameAudio.playClickSound();
    const r = await joinRace(code, car);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    router.push(`/autodrome/${code}`);
  };

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-red-600/30 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black leading-tight">Dubai Autodrome</h1>
            <p className="text-xs text-white/60">Motor City · 2.9 km circuit</p>
          </div>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-red-600 to-rose-800 p-5 space-y-3 shadow-xl">
          <p className="text-4xl">🏁</p>
          <h2 className="text-xl font-black leading-tight">Race your friends in your own car</h2>
          <p className="text-sm text-white/85">Open a race, invite friends who have cars, and go wheel to wheel live. Faster cars pull harder and hold the corners better.</p>
          {cars === null ? <p className="text-sm text-white/70">Checking your garage…</p> : cars.length === 0 ? (
            <div className="rounded-2xl bg-black/25 p-3 text-sm space-y-2">
              <p className="font-bold">You need a car of your own to race (not impounded).</p>
              <Link href="/explore" className="inline-block h-10 leading-10 px-4 rounded-full bg-white text-slate-950 font-black text-sm">Find a dealer on Sheikh Zayed Road ›</Link>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Your car</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {cars.map((c) => (
                    <button key={c.id} onClick={() => setCar(c.id)} className={`shrink-0 rounded-2xl px-3 py-2 text-left ${car === c.id ? "bg-white text-slate-950" : "bg-black/25"}`}>
                      <span className="block text-sm font-black">{carName(c.car)}</span>
                      <span className="block text-[11px] opacity-70">{c.plate}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70">Laps</p>
                {[1, 3, 5].map((n) => <button key={n} onClick={() => setLaps(n)} className={`w-10 h-9 rounded-xl font-black text-sm ${laps === n ? "bg-white text-slate-950" : "bg-black/25"}`}>{n}</button>)}
              </div>
              <button onClick={() => void open()} disabled={busy || !car} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black disabled:opacity-60">{busy ? "Opening…" : "Open a race"}</button>
            </>
          )}
          {error && <p className="text-sm font-bold text-amber-200">{error}</p>}
        </section>

        <section className="space-y-2">
          <h2 className="font-black">Races now</h2>
          {races.length === 0 ? <p className="text-sm text-white/60">No races open. Open one and invite your friends.</p> : races.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-700" />
              <div className="flex-1 min-w-0">
                <p className="font-black truncate">@{r.host}&apos;s race</p>
                <p className="text-xs text-white/60">{r.laps} lap{r.laps === 1 ? "" : "s"} · {r.racers}/{r.max} cars · {r.status === "racing" ? "racing now" : "on the grid"}</p>
              </div>
              {r.status === "lobby" && r.racers < r.max
                ? <button onClick={() => void join(r.code)} disabled={busy || !car} className="h-9 px-4 rounded-full bg-red-600 text-white text-xs font-black disabled:opacity-50">Join</button>
                : <Link href={`/autodrome/${r.code}`} className="h-9 leading-9 px-4 rounded-full bg-white/10 text-xs font-black">Watch</Link>}
            </div>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
