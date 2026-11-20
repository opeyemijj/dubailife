"use client";

// One race, any sport (its sport is the race's own): at Dubai Autodrome in cars or on superbikes, at Meydan on horses,
// at Al Marmoom on camels. The grid (who's in, in which car or on which mount), inviting friends (a message in the
// game, or WhatsApp), the host's Start, the race itself (RaceScene) and the results. Used by /autodrome/<code> and
// /racing/<sport>/<code>.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Share2 } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { carName } from "@/lib/cityFeed";
import { sendMessage } from "@/lib/messages";
import { InviteSheet } from "@/components/share/InviteSheet";
import { RaceScene } from "@/components/autodrome/RaceScene";
import { raceAudio } from "@/lib/raceAudio";
import {
  finishRace, friendsWithCars, joinRace, joinSportRace, lapTime, leaveRace, mountOf, myRaceCars, prizesFor, raceFriends, raceView, sportDef, startRace, trackDef,
  type RaceCar, type RaceView, type Racer,
} from "@/lib/autodrome";
import { refreshCitizen } from "@/lib/citizenStore";
import { shortAed } from "@/lib/cityFeed";
import { gameAudio } from "@/utils/gameAudio";

/** Where a sport's races live: the Autodrome for cars, /racing/<sport> for the rest. */
export const raceHome = (sport?: string | null) => (!sport || sport === "car" ? "/autodrome" : `/racing/${sport}`);
/** What someone rides in a race: their car, or the horse, camel or bike from the stable. */
const rideName = (sport: string | undefined, r: Pick<Racer, "car" | "mount">) => (!sport || sport === "car" ? carName(r.car) : mountOf(sport, r.mount)?.name ?? "");

export function RaceRoom({ code: raw }: { code: string }) {
  const code = raw.toUpperCase();
  const { citizen } = useRequireCitizen();
  const me = citizen?.id ?? "";
  const router = useRouter();
  const [view, setView] = useState<RaceView | null | undefined>(undefined);
  const [skew, setSkew] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [friends, setFriends] = useState<{ id: string; username: string; online: boolean; car: string | null }[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [cars, setCars] = useState<RaceCar[]>([]);
  const finishedSent = useRef(false);
  const [watching, setWatching] = useState(false);

  const load = useCallback(async () => {
    const r = await raceView(code);
    if (r.data) setSkew(Date.parse(r.data.now) - Date.now());
    setView(r.data ?? null);
  }, [code]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 2000);
    void myRaceCars().then((r) => setCars(r.data ?? []));
    return () => { clearTimeout(first); clearInterval(every); };
  }, [load]);
  // Friends to invite: those with a car for a car race; anyone for a horse, camel or bike race.
  const sportId = view?.sport ?? null;
  useEffect(() => {
    if (view === undefined) return;
    void (sportId && sportId !== "car" ? raceFriends() : friendsWithCars()).then((r) => setFriends(r.data ?? []));
  }, [sportId, view === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFinish = useCallback((ms: number) => {
    if (finishedSent.current) return;
    finishedSent.current = true;
    void finishRace(code, ms).then(() => void load());
  }, [code, load]);

  if (view === undefined) return <Shell><p className="text-center text-white/60 py-16">Loading the race…</p></Shell>;
  if (view === null || view.status === "cancelled") {
    const sd = sportDef(view?.sport);
    return <Shell><div className="text-center py-16 space-y-3"><p className="text-4xl">{sd?.icon ?? "🏁"}</p><p className="font-black">This race has closed.</p><Link href={raceHome(view?.sport)} className="inline-block h-11 leading-[2.75rem] px-5 rounded-full bg-red-600 font-black">Back to {sd?.venue ?? "the Autodrome"}</Link></div></Shell>;
  }
  const sport = view.sport ?? "car";
  const sd = sportDef(sport);
  const home = raceHome(sport);
  const venue = sd?.venue ?? "Dubai Autodrome";

  const inRace = view.racers.some((r) => r.id === me);
  const isHost = view.hostId === me;
  const myEntry = view.racers.find((r) => r.id === me);
  const startsAt = view.startsAt ? Date.parse(view.startsAt) - skew : 0;

  // Racing, and I'm in it: the race (after a tap, which lets the engines make sound).
  if (view.status === "racing" && inRace && !myEntry?.finishMs) {
    if (!ready) {
      return (
        <div className="fixed inset-0 z-[150] bg-gradient-to-b from-red-700 to-slate-950 text-white flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <p className="text-6xl">{sd?.icon ?? "🏁"}</p>
            <p className="text-2xl font-black">{sport === "horse" || sport === "camel" ? "You're in the stalls" : "You're on the grid"}</p>
            <p className="text-white/80">{trackDef(view.track).name} · {view.racers.length} {sport === "car" ? "cars" : "runners"} · {view.laps} lap{view.laps === 1 ? "" : "s"}</p>
            <button onClick={() => { raceAudio(); setReady(true); }} className="h-16 px-8 rounded-full bg-white text-slate-950 text-xl font-black animate-pulse">{sport === "horse" ? "🏇 Into the saddle" : sport === "camel" ? "🐪 To the 4x4" : sport === "bike" ? "🏍️ Fire it up" : "🔑 Start your engine"}</button>
          </div>
        </div>
      );
    }
    return <RaceScene code={code} me={me} racers={view.racers} laps={view.laps} track={view.track} sport={sport} startsAt={startsAt} onFinish={onFinish} onLeave={() => router.push(home)} />;
  }

  // Watching (not in the race): the race live, following the leader.
  if (view.status === "racing" && !inRace && watching) {
    return <RaceScene code={code} me={me} racers={view.racers} laps={view.laps} track={view.track} sport={sport} startsAt={startsAt} onFinish={() => {}} onLeave={() => setWatching(false)} />;
  }

  const join = async (ride: number | string) => {
    if (!inRace && view.entryFee > 0 && !window.confirm(`Join for AED ${view.entryFee.toLocaleString()}? You get it back if you leave before the start.`)) return;
    setBusy(true); setError(null);
    const r = typeof ride === "string" ? await joinSportRace(code, ride) : await joinRace(code, ride);
    setBusy(false);
    if (r.error) setError(r.error); else { void refreshCitizen(); void load(); }
  };
  const start = async () => {
    setBusy(true); setError(null); gameAudio.playClickSound();
    raceAudio();
    const r = await startRace(code);
    setBusy(false);
    if (r.error) setError(r.error); else { setReady(true); void load(); }
  };
  const leave = async () => { await leaveRace(code); router.push(home); };
  const invite = async (f: { id: string; username: string }) => {
    setSent((s) => ({ ...s, [f.id]: true }));
    const path = `${home}/${code}`;
    const url = `${window.location.origin}${path}`;
    await sendMessage(me, f.id, sport === "car" ? `🏁 Race me at Dubai Autodrome! Bring your car: ${url}` : `${sd?.icon} ${sd?.short} at ${venue}! Pick yours from the stable and race me: ${url}`, null, path);
  };
  const results = [...view.racers].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || (a.finishMs ?? 0) - (b.finishMs ?? 0));
  // Cars sharing a place: a dead heat (the same time to a tenth), and they split what those places pay.
  const tied = (place: number | null) => place !== null && view.racers.filter((x) => x.place === place).length > 1;
  const track = trackDef(view.track);

  return (
    <Shell home={home}>
      <section className={`rounded-3xl bg-gradient-to-br ${sd?.gradient ?? "from-red-600 to-rose-800"} p-5 space-y-1`}>
        <p className="text-xs font-black uppercase tracking-wider text-white/75">{venue} · {sd ? sd.short.toLowerCase() : "race"} {view.code}</p>
        <h1 className="text-2xl font-black">@{view.host}&apos;s race</h1>
        <p className="text-sm font-black">{sd?.icon ?? "🏁"} {track.name} <span className="font-semibold text-white/75">· {track.place}</span></p>
        <p className="text-sm text-white/85">{view.laps} lap{view.laps === 1 ? "" : "s"} · {view.racers.length}/{view.max} {sport === "car" ? "cars" : "runners"} · {view.status === "lobby" ? (sport === "horse" || sport === "camel" ? "going to the stalls" : "on the grid") : view.status === "racing" ? "racing now" : "finished"}</p>
      </section>

      <Prizes view={view} />

      {view.status === "done" || (view.status === "racing" && myEntry?.finishMs) ? (
        <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-2">
          <h2 className="font-black">{view.status === "done" ? "🏆 Results" : "🏁 You finished. Waiting for the others…"}</h2>
          {results.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 rounded-2xl p-2.5 ${r.place === 1 ? "bg-amber-400/20" : "bg-white/5"}`}>
              <span className="w-8 text-center text-xl font-black">{r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : r.place ?? "–"}</span>
              <Link href={`/u/${r.username}`} className="flex-1 min-w-0">
                <span className="block font-black truncate">@{r.username}</span>
                <span className="block text-xs text-white/60">{rideName(sport, r)}{tied(r.place) ? " · 🤝 dead heat, prize shared" : ""}</span>
              </Link>
              <span className="text-right">
                <span className="block font-mono text-sm">{r.finishMs ? lapTime(r.finishMs) : "racing…"}</span>
                {r.prize ? <span className="block text-xs font-black text-emerald-300">+AED {shortAed(r.prize)}</span> : null}
              </span>
            </div>
          ))}
          <Link href={home} className="block text-center h-11 leading-[2.75rem] rounded-2xl bg-red-600 font-black">Race again</Link>
        </section>
      ) : view.status === "racing" ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-white/70">This race is under way.</p>
          <button onClick={() => { raceAudio(); setWatching(true); }} className="h-12 px-6 rounded-full bg-red-600 font-black">👀 Watch it live</button>
        </div>
      ) : (
        <>
          <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-2">
            <h2 className="font-black">On the grid</h2>
            {view.racers.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                <span className="w-6 text-center text-sm font-black text-white/50">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-9 h-9 rounded-full object-cover object-top bg-slate-700" />
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">@{r.username}{r.id === view.hostId ? " · host" : ""}</p>
                  <p className="text-xs text-white/60">{sport === "car" ? `${carName(r.car)} · ${r.plate}` : `${rideName(sport, r)} · ${mountOf(sport, r.mount)?.breed ?? ""}`}</p>
                </div>
              </div>
            ))}
            {sd && (
              <div className="pt-1 space-y-1.5">
                <p className="text-xs font-black text-white/60">{inRace ? `Change ${sd.pick.toLowerCase()}:` : "Join on:"}</p>
                <div className="flex gap-2 flex-wrap">
                  {sd.mounts.map((m) => {
                    const mine = myEntry?.mount === m.id;
                    return <button key={m.id} onClick={() => void join(m.id)} disabled={busy || mine} className={`h-10 px-3 rounded-full text-xs font-black disabled:opacity-60 ${mine ? "bg-white text-slate-950" : "bg-red-600"}`}>{mine ? "✓ " : ""}{m.name}{!inRace && view.entryFee > 0 ? ` · AED ${shortAed(view.entryFee)}` : ""}</button>;
                  })}
                </div>
              </div>
            )}
            {!sd && !inRace && (cars.length ? (
              <div className="pt-1 space-y-1.5">
                <p className="text-xs font-black text-white/60">Join with:</p>
                <div className="flex gap-2 flex-wrap">
                  {cars.map((c) => <button key={c.id} onClick={() => void join(c.id)} disabled={busy} className="h-10 px-3 rounded-full bg-red-600 text-xs font-black disabled:opacity-60">{carName(c.car)}{view.entryFee > 0 ? ` · AED ${shortAed(view.entryFee)}` : ""}</button>)}
                </div>
              </div>
            ) : <p className="text-sm text-white/60">You need a car of your own to join.</p>)}
          </section>

          {inRace && (
            <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-black">{sport === "car" ? "Invite friends with cars" : "Invite friends"}</h2>
                <button onClick={() => setSharing(true)} className="h-9 px-3 rounded-full bg-[#25D366] text-white text-xs font-black flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> WhatsApp</button>
              </div>
              {friends.length === 0 ? <p className="text-sm text-white/60">{sport === "car" ? "None of your friends has a car yet. Share the link on WhatsApp." : "Share the link on WhatsApp: anyone can ride, no need to own one."}</p> : friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${f.online ? "bg-emerald-500" : "bg-slate-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate">@{f.username}</p>
                    <p className="text-xs text-white/60">{sport === "car" && f.car ? carName(f.car) : ""}{f.online ? `${sport === "car" && f.car ? " · " : ""}available to chat` : ""}</p>
                  </div>
                  {view.racers.some((r) => r.id === f.id) ? <span className="text-xs font-black text-emerald-400">On the grid</span>
                    : sent[f.id] ? <span className="text-xs font-black text-white/60">Invited ✓</span>
                    : <button onClick={() => void invite(f)} className="h-9 px-3 rounded-full bg-sky-500 text-xs font-black flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Invite</button>}
                </div>
              ))}
            </section>
          )}

          {error && <p className="text-sm font-bold text-amber-300 text-center">{error}</p>}
          {inRace && (
            <div className="flex gap-2">
              <button onClick={() => void leave()} className="flex-1 h-12 rounded-2xl bg-white/10 font-black">{isHost ? "Close race" : "Leave"}</button>
              {isHost ? (
                <button onClick={() => void start()} disabled={busy || view.racers.length < 2} className="flex-[2] h-12 rounded-2xl bg-red-600 font-black disabled:opacity-50">
                  {view.racers.length < 2 ? (sport === "car" ? "Waiting for drivers…" : "Waiting for riders…") : busy ? "Starting…" : `Start the race (${view.racers.length} ${sport === "car" ? "cars" : "runners"})`}
                </button>
              ) : <p className="flex-[2] h-12 rounded-2xl bg-white/5 text-sm font-bold flex items-center justify-center text-white/70">Waiting for @{view.host} to start</p>}
            </div>
          )}
        </>
      )}
      {sharing && citizen?.username && (
        <InviteSheet me={citizen.username} kind="race" refId={code} path={`${home}/${code}`} title={sport === "car" ? `${view.laps} laps at the Autodrome` : `${sd?.short} at ${venue}`} onClose={() => setSharing(false)} />
      )}
    </Shell>
  );
}

/** The pot and what each place wins: winner takes all, or the 1st/2nd/3rd split. All of it is paid out. */
function Prizes({ view }: { view: RaceView }) {
  const prizes = prizesFor(view.pot, view.prizeMode, view.split, view.racers.length);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-500/25 to-amber-900/10 border border-amber-400/30 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-black">💰 Prize pot</h2>
        <p className="text-xl font-black text-amber-300">AED {shortAed(view.pot)}</p>
      </div>
      <p className="text-xs text-white/70">
        {view.entryFee > 0 ? `Entry AED ${shortAed(view.entryFee)} a driver. ` : "Free to enter. "}
        {view.prizeMode === "winner" ? "Winner takes all." : `1st, 2nd and 3rd share it ${view.split.join(" / ")}.`}
        {view.entryFee > 0 ? " Leave the grid before the start and you get your entry back." : ""}
      </p>
      {view.pot > 0 && (
        <div className="flex gap-2">
          {prizes.map((p, i) => (
            <div key={i} className="flex-1 rounded-2xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg">{medal[i]}</p>
              <p className="font-black text-sm">AED {shortAed(p)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Shell({ children, home = "/autodrome" }: { children: React.ReactNode; home?: string }) {
  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-16">
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-3">
        <Link href={home} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></Link>
        {children}
      </div>
    </main>
  );
}
