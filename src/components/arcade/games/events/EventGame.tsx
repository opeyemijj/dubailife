"use client";

// Event halls: plan an event in a hotel ballroom and run it.
//   Your own event: book the hall (date, guests, vendors; a party invite is made so friends come), then design it.
//   Event planner job: Local clients' briefs (type, theme, budget), one after another.
// The game: dress the hall (a piece for each slot, to the theme and within budget), seat the guests (friends
// together, feuds apart), then the moments of the day: the zaffa on the drums, the first dance, cutting the
// cake, and the bouquet toss (real physics). The design and score are saved to your booking.

import { useEffect, useRef, useState } from "react";
import HALLS from "@/data/venues/halls.json";
import { useCitizen } from "@/lib/citizenStore";
import { useGameProgress } from "@/lib/arcade";
import { bookHall, bookingCost, hallById, myHallBookings, saveHallDesign, type HallBooking } from "@/lib/halls";
import { haptic, sfx } from "@/utils/gameAudio";
import type { ArcadeGameProps } from "../../ArcadeHost";
import { GameShell, type ShellApi } from "../../GameShell";
import { GameStage } from "../../GameStage";
import { Pill, useCallouts } from "../../hud";
import { preloadPhysics } from "../../launcher";
import { shake, slowMo } from "../../stage";
import { Ballroom, TABLES, type Shot } from "./Ballroom";

type Brief = { type: string; theme: string; budget: number; client: string; guests: number; booking?: HallBooking };
const typeOf = (id: string) => HALLS.types.find((t) => t.id === id) ?? HALLS.types[0];
const themeOf = (id: string) => HALLS.themes.find((t) => t.id === id) ?? HALLS.themes[0];
const aed = (n: number) => `AED ${n.toLocaleString()}`;

export default function EventGame({ params, onClose, onShare }: ArcadeGameProps) {
  const { citizen } = useCitizen();
  const progress = useGameProgress("hall");
  const hall = hallById((params?.hall as string) ?? "baniyas-ballroom") ?? HALLS.halls[0];
  const career = !!params?.career;
  const [bookings, setBookings] = useState<HallBooking[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // Booking form (your own event).
  // Opened from the wedding planner (Family): a wedding; else a birthday to start with.
  const [type, setType] = useState(() => (typeof params?.type === "string" && HALLS.types.some((t: { id: string }) => t.id === params.type) ? params.type : "birthday"));
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState(50);
  const [vendors, setVendors] = useState<string[]>(["catering", "dj"]);
  const [title, setTitle] = useState("");
  const [theme] = useState(HALLS.themes[0].id);
  const [msg, setMsg] = useState<string | null>(null);

  const [opened] = useState(() => Date.now());
  useEffect(() => { if (!career) void myHallBookings().then((r) => setBookings(r.data ?? [])); }, [career]);
  const mine = bookings?.find((b) => b.hall === hall.id && Date.parse(b.endsAt) > opened) ?? null;

  const level = picked ?? Math.min(HALLS.clients.length, progress.level + 1);
  const client = HALLS.clients[level - 1];
  const brief: Brief | null = career
    ? { type: client.type, theme: client.theme, budget: client.budget, client: client.client, guests: 100 }
    : mine ? { type: mine.type, theme, budget: Math.max(30000, Math.round(mine.cost * 0.4)), client: "Your event", guests: mine.guests, booking: mine } : null;
  const cost = bookingCost(hall, guests, vendors);

  const book = async () => {
    if (!when) { setMsg("Pick a date and time."); return; }
    setMsg("Booking…");
    const r = await bookHall(hall.id, type, new Date(when), guests, vendors, title || `${typeOf(type).label} at ${hall.name}`);
    if (r.error) { setMsg(r.error); return; }
    setMsg(`Booked! Invite code ${r.data!.code}: guests come straight into the hall. Go in to dress it.`);
    void myHallBookings().then((x) => setBookings(x.data ?? []));
  };

  return (
    <GameShell
      game="hall"
      title={career ? `${client.client}: ${typeOf(client.type).label}` : mine ? `${mine.title}` : `Plan an event · ${hall.name}`}
      venue={hall.name}
      howTo={[
        { icon: "🎨", text: "Dress the hall: pick a piece for the stage, aisle, tables, ceiling and entrance. Match the theme, stay in budget." },
        { icon: "🪑", text: "Seat the guests: friends together, feuds apart." },
        { icon: "🎉", text: "Run the day: the zaffa on the beat, the first dance, cut the cake straight, and toss the bouquet." },
      ]}
      levels={career ? HALLS.clients.map((c) => ({ n: c.n, label: c.client })) : undefined}
      onLevel={setPicked}
      preload={preloadPhysics}
      // Your own event is decorated and hosted in the hall itself (/hall/<booking>); this screen books it.
      blocked={career ? null : bookings === null ? "Loading your bookings…" : mine ? "Your hall is booked. Go in to decorate it and host your guests." : "Book the hall above to start planning."}
      onClose={onClose}
      onShare={onShare}
      intro={career ? (
        <p className="rounded-2xl bg-white/5 p-3 text-sm"><span className="rounded bg-amber-400/90 text-amber-950 px-1 text-[10px] font-black mr-1">Local</span>
          {client.client} want a <b>{typeOf(client.type).label.toLowerCase()}</b>, theme <b>{themeOf(client.theme).label}</b>, budget {aed(client.budget)} for decor.</p>
      ) : mine ? (
        <div className="rounded-2xl bg-white/5 p-3 space-y-2 text-sm">
          <p>{typeOf(mine.type).icon} <b>{mine.title}</b> · {new Date(mine.startsAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {mine.guests} guests · invite <b>{mine.code}</b></p>
          <a href={`/hall/${mine.id}`} onClick={() => onClose()} className="block text-center h-11 leading-[2.75rem] rounded-xl bg-amber-400 text-amber-950 font-black">🎊 Go into your hall</a>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/5 p-3 space-y-2 text-sm">
          <div className="flex gap-1.5 flex-wrap">{HALLS.types.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} className={`rounded-full px-2.5 py-1 text-xs font-black border ${type === t.id ? "bg-amber-400 text-amber-950 border-amber-300" : "border-white/20"}`}>{t.icon} {t.label}</button>
          ))}</div>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Event title" className="w-full h-10 rounded-xl px-3 text-slate-900" />
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full h-10 rounded-xl px-3 text-slate-900" />
          <div className="flex gap-1.5">{HALLS.guestOptions.filter((g) => g <= hall.capacity).map((g) => (
            <button key={g} onClick={() => setGuests(g)} className={`flex-1 rounded-xl py-1.5 text-xs font-black border ${guests === g ? "bg-amber-400 text-amber-950 border-amber-300" : "border-white/20"}`}>{g} guests</button>
          ))}</div>
          <div className="grid grid-cols-2 gap-1">{HALLS.vendors.map((v) => (
            <label key={v.id} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={vendors.includes(v.id)} onChange={(e) => setVendors(e.target.checked ? [...vendors, v.id] : vendors.filter((x) => x !== v.id))} />{v.icon} {v.label}</label>
          ))}</div>
          <button onClick={() => void book()} className="w-full h-11 rounded-xl bg-emerald-500 text-emerald-950 font-black">Book for {aed(cost)}</button>
          {msg && <p className="text-xs text-amber-200">{msg}</p>}
        </div>
      )}
    >
      {(api) => brief ? <Event key={`${brief.client}:${level}:${theme}`} api={api} brief={brief} level={career ? level : 0} hosts={citizen?.look ? [citizen.look] : []} hallName={hall.name} /> : null}
    </GameShell>
  );
}

// ---------------------------------------------------------------- the event

type Part = "design" | "seating" | "moments" | "done";
type Moment = "zaffa" | "dance" | "cake" | "bouquet";

function Event({ api, brief, level, hosts, hallName }: { api: ShellApi; brief: Brief; level: number; hosts: Parameters<typeof Ballroom>[0]["hosts"]; hallName: string }) {
  const theme = themeOf(brief.theme);
  const moments = typeOf(brief.type).moments as Moment[];
  const [part, setPart] = useState<Part>("design");
  const [slot, setSlot] = useState(HALLS.slots[0].id);
  const [props, setProps] = useState<Record<string, string>>({});
  const [seats, setSeats] = useState<Array<string | null>>(() => Array(TABLES.length * 3).fill(null));
  const [holding, setHolding] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [momentScore, setMomentScore] = useState<number[]>([]);
  const throwRef = useRef<{ dir: number; power: number; at: number } | null>(null);
  const landRef = useRef<[number, number] | null>(null);
  const callouts = useCallouts();
  const playing = api.phase === "play";

  const spent = Object.values(props).reduce((s, id) => s + (HALLS.props.find((p) => p.id === id)?.price ?? 0), 0);
  const matched = Object.values(props).filter((id) => HALLS.props.find((p) => p.id === id)?.themes.includes(theme.id)).length;
  const guests = HALLS.guests.slice(0, seats.length);
  const seating = seatingScore(seats);

  const finishAll = (scores: number[]) => {
    const design = (matched / HALLS.slots.length) * 400 + (spent <= brief.budget ? 200 : Math.max(0, 200 - ((spent - brief.budget) / brief.budget) * 400));
    const seat = Math.max(0, Math.min(300, 150 + seating * 15));
    const mom = (scores.reduce((a, b) => a + b, 0) / Math.max(1, moments.length)) * 400;
    const score = Math.round(design + seat + mom);
    const stars = score >= 1050 ? 3 : score >= 800 ? 2 : score >= 500 ? 1 : 0;
    if (brief.booking) void saveHallDesign(brief.booking.id, { theme: theme.id, props, tables: TABLES.map((_, t) => seats.slice(t * 3, t * 3 + 3).filter((x): x is string => !!x)) }, score);
    setPart("done");
    sfx("applause");
    setTimeout(() => api.finish({
      score, stars, level: stars > 0 ? level : 0,
      headline: stars === 3 ? "The talk of Dubai! 🎉" : stars === 2 ? "A lovely event" : stars === 1 ? "The guests had a good time" : "Some guests left early",
      stats: [{ label: "Theme", value: `${matched}/${HALLS.slots.length}` }, { label: "Budget", value: spent <= brief.budget ? "On budget" : "Over" }, { label: "Seating", value: seating >= 0 ? `+${seating}` : String(seating) }],
      share: `🎊 ${brief.client === "Your event" ? "Our" : `${brief.client}'s`} ${typeOf(brief.type).label.toLowerCase()} at ${hallName}: ${score.toLocaleString()} on Dubai Life`,
    }), 1500);
  };

  const momentDone = (score: number) => {
    const next = [...momentScore, score];
    setMomentScore(next);
    callouts.push(score > 0.8 ? "Perfect moment!" : score > 0.5 ? "Lovely" : "The guests smile politely", score > 0.8 ? "great" : score > 0.5 ? "good" : "info");
    if (mi + 1 >= moments.length) finishAll(next);
    else setMi(mi + 1);
  };

  const shot: Shot = part === "design" ? "design" : part === "seating" ? "tables" : moments[mi] === "bouquet" ? "toss" : "stage";

  return (
    <div className="absolute inset-0">
      <GameStage camera={{ position: [0, 7.5, 11], fov: 50 }} background="#1c1917" environment={0.5}>
        <Ballroom shot={shot} theme={theme.colors} props={props} guests={brief.guests} hosts={hosts} throwRef={throwRef} landRef={landRef} paused={!playing} />
      </GameStage>
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 flex flex-wrap gap-2 pointer-events-none">
        <Pill icon="🎨" value={theme.label} />
        <Pill icon="💰" value={`${aed(spent)} / ${aed(brief.budget)}`} tone={spent > brief.budget ? "dark" : "gold"} />
        {part === "seating" && <Pill icon="🪑" value={seating >= 0 ? `+${seating}` : seating} />}
      </div>
      {callouts.node}

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] space-y-2 max-h-[55%] overflow-y-auto">
        {part === "design" && (
          <>
            <div className="flex gap-1.5 overflow-x-auto">{HALLS.slots.map((s) => (
              <button key={s.id} onClick={() => setSlot(s.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border ${slot === s.id ? "bg-white text-slate-900" : props[s.id] ? "bg-emerald-600/80 border-emerald-400" : "bg-black/50 border-white/20"}`}>{props[s.id] ? "✓ " : ""}{s.label}</button>
            ))}</div>
            <div className="grid grid-cols-2 gap-1.5">{HALLS.props.filter((p) => p.slot === slot).map((p) => {
              const fits = p.themes.includes(theme.id);
              return (
                <button key={p.id} onClick={() => { setProps({ ...props, [slot]: p.id }); sfx("tap"); haptic(5); }}
                  className={`rounded-xl p-2 text-left border ${props[slot] === p.id ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-black/60 border-white/15"}`}>
                  <span className="block text-xs font-black">{p.label}</span>
                  <span className="text-[10px] opacity-80">{aed(p.price)} {fits ? "· fits the theme ✨" : ""}</span>
                </button>
              );
            })}</div>
            <button disabled={Object.keys(props).length < HALLS.slots.length} onClick={() => { setPart("seating"); sfx("chime"); }} className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black disabled:opacity-40">Seat the guests</button>
          </>
        )}

        {part === "seating" && (
          <>
            <p className="text-xs text-white/80 text-center">Tap a guest, then a seat. ❤️ likes · ⚡ feud</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{guests.filter((g) => !seats.includes(g.name)).map((g) => (
              <button key={g.name} onClick={() => setHolding(g.name)} className={`shrink-0 rounded-xl px-2 py-1 text-left border text-[11px] ${holding === g.name ? "bg-amber-400 text-amber-950" : "bg-black/60 border-white/15"}`}>
                <b>{g.name}</b><span className="block opacity-75">❤️ {g.likes.join(", ")}{g.feud ? ` · ⚡ ${g.feud}` : ""}</span>
              </button>
            ))}</div>
            <div className="grid grid-cols-3 gap-1.5">{TABLES.map((_, t) => (
              <div key={t} className="rounded-xl bg-black/60 border border-white/15 p-1.5">
                <p className="text-[10px] font-black text-white/60">Table {t + 1}</p>
                {[0, 1, 2].map((k) => {
                  const i = t * 3 + k;
                  return (
                    <button key={k} onClick={() => {
                      const next = [...seats];
                      if (holding) { const was = next.indexOf(holding); if (was >= 0) next[was] = null; next[i] = holding; setHolding(null); sfx("tap"); }
                      else if (next[i]) { setHolding(next[i]); next[i] = null; }
                      setSeats(next.map((x, j) => (j !== i && x === next[i] && x ? null : x)));
                    }} className="block w-full mt-0.5 rounded-lg bg-white/10 px-1.5 py-1 text-[11px] text-left truncate">{seats[i] ?? "·"}</button>
                  );
                })}
              </div>
            ))}</div>
            <button disabled={seats.some((x) => !x)} onClick={() => { setPart("moments"); sfx("chime"); }} className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black disabled:opacity-40">Start the event</button>
          </>
        )}

        {part === "moments" && playing && (
          <MomentPlay key={mi} moment={moments[mi]} onDone={momentDone} throwRef={throwRef} landRef={landRef} />
        )}
      </div>
    </div>
  );
}

/** Friends at the same table score, feuds at the same table cost. */
function seatingScore(seats: Array<string | null>) {
  let s = 0;
  for (let t = 0; t < TABLES.length; t++) {
    const at = seats.slice(t * 3, t * 3 + 3).filter((x): x is string => !!x);
    for (const n of at) {
      const g = HALLS.guests.find((x) => x.name === n);
      if (!g) continue;
      s += g.likes.filter((l) => at.includes(l)).length;
      if (g.feud && at.includes(g.feud)) s -= 3;
    }
  }
  return s;
}

// ---------------------------------------------------------------- the moments of the day

const ARROWS = ["⬅️", "⬆️", "⬇️", "➡️"];
/** The first dance's steps, one per beat (index into ARROWS). */
const DANCE = [0, 2, 1, 3, 1, 0, 3, 2];

function MomentPlay({ moment, onDone, throwRef, landRef }: { moment: Moment; onDone: (score: number) => void; throwRef: React.RefObject<{ dir: number; power: number; at: number } | null>; landRef: React.RefObject<[number, number] | null> }) {
  const [hits, setHits] = useState<number[]>([]);
  const [now, setNow] = useState(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const BEATS = 8, GAP = 0.6;
  const [aim, setAim] = useState(0);
  const [cuts, setCuts] = useState<number[]>([]);
  const [thrown, setThrown] = useState(false);

  useEffect(() => {
    startRef.current = performance.now();
    let raf = 0;
    const loop = () => { setNow((performance.now() - startRef.current) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const finish = (score: number) => { if (doneRef.current) return; doneRef.current = true; onDone(Math.max(0, Math.min(1, score))); };

  // Rhythm moments end after the last beat; the bouquet when it lands.
  useEffect(() => {
    if ((moment === "zaffa" || moment === "dance") && now > 1 + BEATS * GAP + 0.6) finish(hits.filter((x) => x > 0).reduce((a, b) => a + b, 0) / BEATS);
    if (moment === "bouquet" && thrown && landRef.current) {
      const [x, z] = landRef.current;
      // The single friends wait in the middle, two tables back.
      finish(1 - Math.min(1, Math.hypot(x - 0, z - 2.8) / 3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checked each frame
  }, [now]);

  const beatAt = (i: number) => 1 + i * GAP;
  const tapBeat = (dir?: number) => {
    const i = Math.round((now - 1) / GAP);
    if (i < 0 || i >= BEATS || hits[i] !== undefined) return;
    const off = Math.abs(now - beatAt(i));
    const right = moment === "zaffa" || dir === DANCE[i];
    const score = !right ? 0 : off < 0.08 ? 1 : off < 0.16 ? 0.6 : 0;
    const next = [...hits]; next[i] = score; setHits(next);
    sfx(score >= 1 ? "mgPerfect" : score > 0 ? `mgHit${(i % 7) + 1}` : "warn");
    if (score >= 1) shake(0.03);
  };

  if (moment === "zaffa" || moment === "dance") {
    return (
      <div className="space-y-2">
        <p className="text-center font-black">{moment === "zaffa" ? "🥁 The zaffa: tap on every drum beat" : "💃 The first dance: the step shown, on the beat"}</p>
        <div className="relative h-12 rounded-2xl bg-black/60 overflow-hidden">
          <div className="absolute left-[20%] inset-y-0 w-1 bg-white/80" />
          {Array.from({ length: BEATS }).map((_, i) => (
            <div key={i} className={`absolute top-2 w-8 h-8 -ml-4 rounded-full flex items-center justify-center ${hits[i] === undefined ? "bg-amber-400" : hits[i] > 0 ? "bg-emerald-400 opacity-40" : "bg-rose-500 opacity-40"}`}
              style={{ left: `${20 + (beatAt(i) - now) * 30}%` }}>{moment === "dance" ? ARROWS[DANCE[i]] : "🥁"}</div>
          ))}
        </div>
        {moment === "zaffa"
          ? <button onPointerDown={() => tapBeat()} className="w-full h-16 rounded-2xl bg-amber-500 text-amber-950 font-black text-xl">DUM!</button>
          : <div className="grid grid-cols-4 gap-1.5">{ARROWS.map((a, d) => <button key={a} onPointerDown={() => tapBeat(d)} className="h-14 rounded-2xl bg-pink-500 text-2xl">{a}</button>)}</div>}
      </div>
    );
  }

  if (moment === "cake") {
    // The knife sweeps across; tap when it's on the mark. Three cuts.
    const pos = 0.5 + 0.5 * Math.sin(now * 2.6);
    const cut = () => {
      if (cuts.length >= 3) return;
      const next = [...cuts, Math.abs(pos - 0.5)];
      setCuts(next); sfx("clack"); haptic(10);
      if (next.length === 3) { slowMo(0.5, 0.5); finish(1 - next.reduce((a, b) => a + b, 0) / 3 / 0.25); }
    };
    return (
      <div className="space-y-2">
        <p className="text-center font-black">🎂 Cut the cake: tap when the knife is on the gold mark ({cuts.length}/3)</p>
        <div className="relative h-14 rounded-2xl bg-pink-100 overflow-hidden">
          <div className="absolute left-1/2 inset-y-0 w-1 -ml-0.5 bg-amber-500" />
          <div className="absolute inset-y-1 w-1.5 bg-slate-700 rounded" style={{ left: `calc(${pos * 100}% - 3px)` }} />
        </div>
        <button onPointerDown={cut} className="w-full h-14 rounded-2xl bg-pink-500 font-black text-lg">🔪 Cut</button>
      </div>
    );
  }

  // The bouquet: aim across and set the power (it swings), then throw.
  const power = 0.5 + 0.5 * Math.sin(now * 3.1);
  return (
    <div className="space-y-2">
      <p className="text-center font-black">💐 Toss the bouquet to the single friends in the middle</p>
      <input type="range" min={-1} max={1} step={0.05} value={aim} onChange={(e) => setAim(Number(e.target.value))} className="w-full" disabled={thrown} />
      <div className="h-3 rounded-full bg-black/50 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${power * 100}%` }} /></div>
      <button disabled={thrown} onPointerDown={() => { throwRef.current = { dir: aim, power, at: performance.now() }; setThrown(true); sfx("mgServe"); haptic(15); }}
        className="w-full h-14 rounded-2xl bg-rose-500 font-black text-lg disabled:opacity-50">{thrown ? "In the air…" : "Throw!"}</button>
    </div>
  );
}
