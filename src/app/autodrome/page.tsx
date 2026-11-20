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
import { carOf } from "@/lib/cars";
import { SPORTS, createRace, DEFAULT_TRACK, joinRace, myRaceCars, openRaces, prizesFor, trackDef, trackOf, TRACKS, type OpenRace, type PrizeMode, type RaceCar } from "@/lib/autodrome";
import { refreshCitizen } from "@/lib/citizenStore";
import { shortAed } from "@/lib/cityFeed";
import ENTRY from "@/data/autodrome/entry.json";
import { gameAudio } from "@/utils/gameAudio";

export default function AutodromePage() {
  useRequireCitizen();
  const router = useRouter();
  const [cars, setCars] = useState<RaceCar[] | null>(null);
  const [car, setCar] = useState<number | null>(null);
  const [laps, setLaps] = useState(3);
  const [fee, setFee] = useState(ENTRY.fees[1]);
  const [mode, setMode] = useState<PrizeMode>("winner");
  const [track, setTrack] = useState(DEFAULT_TRACK);
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
    const r = await createRace(car, laps, fee, mode, track);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't open a race."); return; }
    void refreshCitizen();
    router.push(`/autodrome/${r.data}`);
  };
  const join = async (code: string, entry: number) => {
    if (!car) { setError("You need a car of your own to race."); return; }
    if (entry > 0 && !window.confirm(`Join for AED ${entry.toLocaleString()}? You get it back if you leave before the start.`)) return;
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
            <p className="text-xs text-white/60">Motor City · {TRACKS.length} tracks</p>
          </div>
          <Link href="/garage" className="h-10 px-3 rounded-full bg-white/10 text-xs font-black flex items-center gap-1.5">🔧 Garage</Link>
        </header>

        {/* The other race days: superbikes here, horses at Meydan, camels at Al Marmoom. */}
        <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="shrink-0 h-9 px-3 rounded-full bg-white text-slate-950 text-xs font-black flex items-center">🏁 Cars</span>
          {SPORTS.map((s) => <Link key={s.id} href={`/racing/${s.id}`} className="shrink-0 h-9 px-3 rounded-full bg-white/10 text-xs font-black flex items-center">{s.icon} {s.short.replace(" race", "s")}</Link>)}
        </nav>

        <section className="rounded-3xl bg-gradient-to-br from-red-600 to-rose-800 p-5 space-y-3 shadow-xl">
          <p className="text-4xl">🏁</p>
          <h2 className="text-xl font-black leading-tight">Race your friends in your own car</h2>
          <p className="text-sm text-white/85">Open a race (up to 10 cars), invite friends who have cars, and go wheel to wheel live. Everyone pays the entry fee; the winner takes the pot (or 1st, 2nd and 3rd share it).</p>
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
                      <span className="flex items-center gap-1.5 text-sm font-black"><span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ background: c.color ?? carOf(c.car)?.color ?? "#94a3b8" }} />{carName(c.car)}</span>
                      <span className="block text-[11px] opacity-70">{c.plate}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Track</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {TRACKS.map((t) => (
                    <button key={t.id} onClick={() => { gameAudio.playClickSound(); setTrack(t.id); }} aria-pressed={track === t.id}
                      className={`shrink-0 w-36 rounded-2xl p-2 text-left ${track === t.id ? "bg-white text-slate-950" : "bg-black/25"}`}>
                      <TrackShape id={t.id} className={`w-full h-14 ${track === t.id ? "text-red-600" : "text-white/80"}`} />
                      <span className="block text-xs font-black leading-tight mt-1">{t.name}</span>
                      <span className="block text-[10px] opacity-70">{t.place} · {(trackOf(t.id).length / 1000).toFixed(1)} km</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/75 mt-1">{trackDef(track).blurb}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70">Laps</p>
                {[1, 3, 5].map((n) => <button key={n} onClick={() => setLaps(n)} className={`w-10 h-9 rounded-xl font-black text-sm ${laps === n ? "bg-white text-slate-950" : "bg-black/25"}`}>{n}</button>)}
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Entry fee (every driver pays it; it all goes to the prizes)</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {ENTRY.fees.map((f) => <button key={f} onClick={() => setFee(f)} className={`shrink-0 h-9 px-3 rounded-xl font-black text-xs ${fee === f ? "bg-white text-slate-950" : "bg-black/25"}`}>{f ? `AED ${shortAed(f)}` : "Free"}</button>)}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Prizes</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([["winner", "🏆 Winner takes all"], ["top3", `🥇🥈🥉 ${ENTRY.split.join(" / ")}`]] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setMode(m)} className={`h-10 rounded-xl font-black text-xs ${mode === m ? "bg-white text-slate-950" : "bg-black/25"}`}>{label}</button>
                  ))}
                </div>
                {fee > 0 && <p className="mt-1 text-[11px] text-white/75">With 10 drivers the pot is AED {shortAed(fee * 10)}: {prizesFor(fee * 10, mode, ENTRY.split, 10).map((p, i) => `${["1st", "2nd", "3rd"][i]} AED ${shortAed(p)}`).join(", ")}.</p>}
              </div>
              <button onClick={() => void open()} disabled={busy || !car} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black disabled:opacity-60">{busy ? "Opening…" : fee ? `Open a race · pay AED ${shortAed(fee)} to enter` : "Open a free race"}</button>
            </>
          )}
          {error && <p className="text-sm font-bold text-amber-200">{error}</p>}
        </section>

        <section className="space-y-2">
          <h2 className="font-black">Races now</h2>
          {races.filter((r) => !r.sport || r.sport === "car").length === 0 ? <p className="text-sm text-white/60">No races open. Open one and invite your friends.</p> : races.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-700" />
              <div className="flex-1 min-w-0">
                <p className="font-black truncate">@{r.host}&apos;s race</p>
                <p className="text-xs text-white/60">{trackDef(r.track).name} · {r.laps} lap{r.laps === 1 ? "" : "s"} · {r.racers}/{r.max} cars · {r.entryFee ? `AED ${shortAed(r.entryFee)} entry` : "free"} · {r.prizeMode === "winner" ? "winner takes all" : "top 3 paid"} · {r.status === "racing" ? "racing now" : "on the grid"}</p>
                {r.pot > 0 && <p className="text-xs font-black text-amber-300">Pot AED {shortAed(r.pot)}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {r.status === "lobby" && r.racers < r.max && car && <button onClick={() => void join(r.code, r.entryFee)} disabled={busy} className="h-9 px-3 rounded-full bg-red-600 text-white text-xs font-black disabled:opacity-50">Join</button>}
                <Link href={`/autodrome/${r.code}`} className="h-9 leading-9 px-3 rounded-full bg-white/10 text-xs font-black">{r.status === "lobby" ? "See it" : "👀 Watch"}</Link>
              </div>
            </div>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

/** A track's outline, for picking one. */
function TrackShape({ id, className }: { id: string; className?: string }) {
  const t = trackOf(id);
  const xs = t.samples.map((s) => s.p.x), zs = t.samples.map((s) => s.p.z);
  const minX = Math.min(...xs), minZ = Math.min(...zs), k = 96 / Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ);
  const w = (Math.max(...xs) - minX) * k, h = (Math.max(...zs) - minZ) * k;
  const d = t.samples.filter((_, i) => i % 6 === 0).map((s, i) => `${i ? "L" : "M"}${((s.p.x - minX) * k + (100 - w) / 2).toFixed(1)},${((s.p.z - minZ) * k + (100 - h) / 2).toFixed(1)}`).join(" ") + "Z";
  return <svg viewBox="0 0 100 100" className={className} aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" /></svg>;
}
