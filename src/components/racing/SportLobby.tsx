"use client";
import { ProfileLink } from "@/components/social/ProfileLink";

// A sport's lobby: Meydan for horses, Al Marmoom for camels, the Autodrome's paddock for superbikes. Pick a mount from
// the stable (no need to own one), a track, laps, the entry fee and the prize split, and open a race to invite friends
// to, or join one that's waiting. The race itself is at /racing/<sport>/<code> (components/racing/RaceRoom).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { refreshCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { shortAed } from "@/lib/cityFeed";
import {
  SPORTS, createSportRace, joinSportRace, openRaces, prizesFor, sportDef, trackDef, trackOf, tracksFor,
  type Mount, type OpenRace, type PrizeMode, type SportDef,
} from "@/lib/autodrome";
import ENTRY from "@/data/autodrome/entry.json";
import { gameAudio } from "@/utils/gameAudio";

/** A mount's strengths as bars, scaled across its stable (so the differences show). */
function Stats({ sport, m }: { sport: SportDef; m: Mount }) {
  const keys: { k: keyof Mount; label: string }[] = sport.id === "bike"
    ? [{ k: "top", label: "Top speed" }, { k: "accel", label: "Acceleration" }, { k: "grip", label: "Grip" }]
    : [{ k: "top", label: "Speed" }, { k: "accel", label: "Acceleration" }, { k: "stamina", label: "Stamina" }, { k: "agility", label: "Cornering" }];
  return (
    <div className="space-y-1 mt-1.5">
      {keys.map(({ k, label }) => {
        const vals = sport.mounts.map((x) => Number(x[k] ?? 0));
        const lo = Math.min(...vals), hi = Math.max(...vals), v = Number(m[k] ?? 0);
        const pct = hi === lo ? 70 : 35 + (65 * (v - lo)) / (hi - lo);
        return (
          <div key={String(k)} className="flex items-center gap-2">
            <span className="w-20 text-[10px] font-bold opacity-70">{label}</span>
            <span className="flex-1 h-1.5 rounded-full bg-black/15 overflow-hidden"><span className="block h-full rounded-full bg-current" style={{ width: `${pct}%` }} /></span>
          </div>
        );
      })}
    </div>
  );
}

const TIPS: Record<string, string[]> = {
  horse: [
    "Hold PUSH to go flat out: it burns stamina. Let go and your horse cruises and gets a little breath back.",
    "Run out of stamina and your horse can only canter until it recovers. Save your push for the final furlongs.",
    "Keep to the inside rail through the bends: it's the shortest way round.",
    "Sit just behind another horse to ride its slipstream: you tire less.",
  ],
  camel: [
    "Camels have stamina to burn, but not forever: push in bursts, and keep something for the home straight.",
    "EASE gets your camel's breath back fastest. Use it on the long straights if you're far ahead or far behind.",
    "Hug the inside rail round the bends, and tuck in behind a rival to tire less.",
  ],
  bike: [
    "Superbikes pull harder than any car but have less grip: brake before the bend, then open the throttle on the way out.",
    "Steer with the wheel (or the arrow keys). Go too fast into a corner and you run wide onto the run-off.",
  ],
};

export function SportLobby({ sport: sportId }: { sport: string }) {
  useRequireCitizen();
  const router = useRouter();
  const sport = sportDef(sportId)!;
  const tracks = tracksFor(sport.id);
  const [mount, setMount] = useState(sport.mounts[0].id);
  const [track, setTrack] = useState(tracks[0].id);
  const [laps, setLaps] = useState(sport.laps[0]);
  const [fee, setFee] = useState(ENTRY.fees[1]);
  const [mode, setMode] = useState<PrizeMode>("winner");
  const [races, setRaces] = useState<OpenRace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => void openRaces().then((r) => { if (live) setRaces((r.data ?? []).filter((x) => x.sport === sport.id)); });
    load();
    const every = setInterval(load, 5000);
    return () => { live = false; clearInterval(every); };
  }, [sport.id]);

  const open = async () => {
    setBusy(true); setError(null); gameAudio.playClickSound();
    const r = await createSportRace(sport.id, mount, laps, fee, mode, track);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't open a race."); return; }
    void refreshCitizen();
    router.push(`/racing/${sport.id}/${r.data}`);
  };
  const join = async (code: string, entry: number) => {
    if (entry > 0 && !window.confirm(`Join for AED ${entry.toLocaleString()}? You get it back if you leave before the start.`)) return;
    setBusy(true); setError(null); gameAudio.playClickSound();
    const r = await joinSportRace(code, mount);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    void refreshCitizen();
    router.push(`/racing/${sport.id}/${code}`);
  };
  const chosen = sport.mounts.find((m) => m.id === mount)!;

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className={`absolute top-0 inset-x-0 h-80 bg-gradient-to-b ${sport.gradient} opacity-40 pointer-events-none`} />
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black leading-tight truncate">{sport.venue}</h1>
            <p className="text-xs text-white/60">{sport.place} · {sport.name}</p>
          </div>
        </header>

        {/* The other race days. */}
        <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Link href="/autodrome" className="shrink-0 h-9 px-3 rounded-full bg-white/10 text-xs font-black flex items-center">🏁 Cars</Link>
          {SPORTS.map((s) => (
            <Link key={s.id} href={`/racing/${s.id}`} aria-current={s.id === sport.id ? "page" : undefined}
              className={`shrink-0 h-9 px-3 rounded-full text-xs font-black flex items-center ${s.id === sport.id ? "bg-white text-slate-950" : "bg-white/10"}`}>{s.icon} {s.short.replace(" race", "s")}</Link>
          ))}
        </nav>

        <section className={`rounded-3xl bg-gradient-to-br ${sport.gradient} p-5 space-y-3 shadow-xl`}>
          <p className="text-4xl">{sport.icon}</p>
          <h2 className="text-xl font-black leading-tight">{sport.tagline}</h2>
          <p className="text-sm text-white/85">{sport.blurb}</p>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">{sport.pick} (from the {sport.id === "bike" ? "paddock" : "stable"})</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {sport.mounts.map((m) => (
                <button key={m.id} onClick={() => { gameAudio.playClickSound(); setMount(m.id); }} aria-pressed={mount === m.id}
                  className={`shrink-0 w-44 rounded-2xl p-2.5 text-left ${mount === m.id ? "bg-white text-slate-950" : "bg-black/25"}`}>
                  <span className="flex items-center gap-1.5 text-sm font-black leading-tight">
                    <span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ background: m.coat ?? m.color }} />{m.name}
                  </span>
                  <span className="block text-[10px] opacity-70 mt-0.5">{m.breed}</span>
                  <Stats sport={sport} m={m} />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/80 mt-1">{chosen.blurb}</p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Track</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {tracks.map((t) => (
                <button key={t.id} onClick={() => { gameAudio.playClickSound(); setTrack(t.id); }} aria-pressed={track === t.id}
                  className={`shrink-0 w-36 rounded-2xl p-2 text-left ${track === t.id ? "bg-white text-slate-950" : "bg-black/25"}`}>
                  <TrackShape id={t.id} className={`w-full h-14 ${track === t.id ? "text-emerald-700" : "text-white/80"}`} />
                  <span className="block text-xs font-black leading-tight mt-1">{t.name}</span>
                  <span className="block text-[10px] opacity-70">{(trackOf(t.id).length / 1000).toFixed(1)} km a lap</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/75 mt-1">{trackDef(track).blurb}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/70">Laps</p>
            {sport.laps.map((n) => <button key={n} onClick={() => setLaps(n)} className={`w-10 h-9 rounded-xl font-black text-sm ${laps === n ? "bg-white text-slate-950" : "bg-black/25"}`}>{n}</button>)}
            <p className="text-[11px] text-white/70">{((trackOf(track).length * laps) / 1000).toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Entry fee (every rider pays it; it all goes to the prizes)</p>
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
            {fee > 0 && <p className="mt-1 text-[11px] text-white/75">With 10 riders the pot is AED {shortAed(fee * 10)}: {prizesFor(fee * 10, mode, ENTRY.split, 10).map((p, i) => `${["1st", "2nd", "3rd"][i]} AED ${shortAed(p)}`).join(", ")}. A dead heat splits it.</p>}
          </div>
          <button onClick={() => void open()} disabled={busy} className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black disabled:opacity-60">{busy ? "Opening…" : fee ? `Open a race on ${chosen.name} · AED ${shortAed(fee)}` : `Open a free race on ${chosen.name}`}</button>
          {error && <p className="text-sm font-bold text-amber-200">{error}</p>}
        </section>

        <section className="space-y-2">
          <h2 className="font-black">Races now</h2>
          {races.length === 0 ? <p className="text-sm text-white/60">No {sport.short.toLowerCase()}s open. Open one and invite your friends.</p> : races.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-700" />
              <div className="flex-1 min-w-0">
                <p className="font-black truncate"><ProfileLink username={r.host} />&apos;s race</p>
                <p className="text-xs text-white/60">{trackDef(r.track).name} · {r.laps} lap{r.laps === 1 ? "" : "s"} · {r.racers}/{r.max} riders · {r.entryFee ? `AED ${shortAed(r.entryFee)} entry` : "free"} · {r.prizeMode === "winner" ? "winner takes all" : "top 3 paid"} · {r.status === "racing" ? "racing now" : "waiting"}</p>
                {r.pot > 0 && <p className="text-xs font-black text-amber-300">Pot AED {shortAed(r.pot)}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {r.status === "lobby" && r.racers < r.max && <button onClick={() => void join(r.code, r.entryFee)} disabled={busy} className="h-9 px-3 rounded-full bg-emerald-600 text-white text-xs font-black disabled:opacity-50">Join</button>}
                <Link href={`/racing/${sport.id}/${r.code}`} className="h-9 leading-9 px-3 rounded-full bg-white/10 text-xs font-black">{r.status === "lobby" ? "See it" : "👀 Watch"}</Link>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-1.5">
          <h2 className="font-black">How to win</h2>
          {(TIPS[sport.id] ?? []).map((t) => <p key={t} className="text-sm text-white/75">• {t}</p>)}
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
