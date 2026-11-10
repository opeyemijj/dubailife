"use client";

// An event hall, live (/hall/<booking>): a hotel ballroom you walk around in 3D, with the guests there now. The
// host decorates it like a home (the store's event pieces, floors, walls and ceiling), or hires a player interior
// decorator to do it, and runs the day's moments for everyone: the zaffa, the first dance, cutting the cake and
// the bouquet toss, which the guests race to catch. Guests arrive from the event's party invite.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Package, RotateCcw, RotateCw, X } from "lucide-react";
import { ApartmentRoom, type CandidatePlacement, type Person, type PlacingState } from "@/components/home/ApartmentRoom";
import { HomeLookSheet } from "@/components/home/HomeLookSheet";
import { adjustBalance, useCitizen } from "@/lib/citizenStore";
import { hallById, hallSpace, saveHallSpace, type HallSpace } from "@/lib/halls";
import { decorators, requestHallDecorator, type DecoratorPro } from "@/lib/decorator";
import { recordGameResult } from "@/lib/arcade";
import { useRoom, type Received } from "@/lib/room";
import { CATALOG, getCatalogItem, HOUSING_CONFIGS, withHomeItems, type CatalogItem, type HomeStyle, type OwnedFurniture, type Placement, type Rotation } from "@/lib/furniture";
import { gameAudio, haptic, sfx } from "@/utils/gameAudio";

const aed = (n: number) => `AED ${n.toLocaleString()}`;
const newUid = (id: string) => `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const STORE_CATEGORIES = ["events", "lighting", "decor", "luxury", "living", "dining"];
type Moment = "zaffa" | "dance" | "cake" | "bouquet";
const MOMENTS: Array<{ id: Moment; icon: string; label: string; say: string }> = [
  { id: "zaffa", icon: "🥁", label: "Zaffa", say: "🥁 The zaffa! Drums and dancers lead the way in" },
  { id: "dance", icon: "💃", label: "First dance", say: "💃 The first dance. Everyone to the floor!" },
  { id: "cake", icon: "🎂", label: "Cut the cake", say: "🎂 The cake is cut!" },
  { id: "bouquet", icon: "💐", label: "Bouquet toss", say: "💐 The bouquet is in the air. Catch it!" },
];

export default function HallPage() {
  const { id } = useParams<{ id: string }>();
  // Development only: /hall/demo opens a pretend booking you host, so the hall can be checked without one.
  const demo = id === "demo" && process.env.NODE_ENV !== "production";
  const booking = Number(id);
  const signedIn = useCitizen();
  const router = useRouter();
  // Signed out: to the log-in popup (the demo excepted).
  useEffect(() => {
    if (!demo && signedIn.hydrated && !signedIn.isLoggedIn) router.replace("/?login=true");
  }, [demo, signedIn.hydrated, signedIn.isLoggedIn, router]);
  const citizen = signedIn.citizen ?? (demo ? { id: "demo", username: "you", name: "You", balance: 500000, look: undefined } as unknown as NonNullable<typeof signedIn.citizen> : null);
  const [space, setSpace] = useState<HallSpace | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [furniture, setFurniture] = useState<OwnedFurniture[]>([]);
  const [style, setStyle] = useState<HomeStyle | null>(null);
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [candidate, setCandidate] = useState<CandidatePlacement | null>(null);
  const [sheet, setSheet] = useState<"store" | "storage" | "look" | "decorator" | null>(null);
  const [cat, setCat] = useState("events");
  const [turns, setTurns] = useState(0);
  const [view, setView] = useState<"above" | "inside" | "eye">("above");
  const [toast, setToast] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [mood, setMood] = useState<"idle" | "dance" | "clap">("idle");
  const [where, setWhere] = useState({ x: 0, z: 3, yaw: Math.PI, walking: false });
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  // The bouquet in the air (catching is open), and who caught it.
  const [airborne, setAirborne] = useState(false);
  const [done, setDone] = useState<Moment[]>([]);
  const firstCatch = useRef<string | null>(null);

  const say = (text: string) => { setToast(text); setTimeout(() => setToast(null), 2800); };
  const flash = (text: string) => { setBanner(text); setTimeout(() => setBanner((b) => (b === text ? null : b)), 6000); };

  // Loaded on arrival, and again whenever the host or their decorator saves (reload bumps `version`).
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    const fetch = demo
      ? Promise.resolve({ data: { id: 0, hall: "baniyas-ballroom", title: "Leila & Omar's wedding", type: "wedding", startsAt: new Date(Date.now() - 600_000).toISOString(), endsAt: new Date(Date.now() + 3_600_000).toISOString(), guests: 100, code: "DEMO", design: null, isHost: true, host: { id: "demo", username: "you" }, decorating: null } as HallSpace, error: undefined })
      : hallSpace(booking);
    void fetch.then((r) => {
      if (!live) return;
      if (!r.data) { setFailed(r.error ?? "This event isn't on any more."); return; }
      setSpace(r.data);
      setFurniture(withHomeItems(r.data.design?.furniture ?? [], "ballroom"));
      setStyle(r.data.design?.style ?? HOUSING_CONFIGS.ballroom.finish);
    });
    return () => { live = false; };
  }, [booking, version, demo]);
  // The clock, for whether the event is on (checked every half minute).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const emitRef = useRef<((e: Parameters<ReturnType<typeof useRoom>["emit"]>[0]) => void) | null>(null);

  // The live room: everyone here, and the host's moments as they happen.
  const onEvent = (e: Received) => {
    if (e.type === "home") { load(); return; }
    if (e.type === "hall_moment") {
      const m = MOMENTS.find((x) => x.id === e.moment);
      if (e.moment === "bouquet" && e.caught) { flash(`💐 @${e.caught} caught the bouquet!`); sfx("applause"); setAirborne(false); return; }
      if (m) flash(m.say);
      if (e.moment === "zaffa") { sfx("mgKick"); setMood("dance"); setTimeout(() => setMood("idle"), 15_000); }
      if (e.moment === "dance") { setMood("dance"); setTimeout(() => setMood("idle"), 25_000); }
      if (e.moment === "cake") { sfx("applause"); setMood("clap"); setTimeout(() => setMood("idle"), 5_000); }
      if (e.moment === "bouquet") { sfx("mgServe"); setAirborne(true); setTimeout(() => setAirborne(false), 3200); }
      return;
    }
    if (e.type === "bouquet_catch" && space?.isHost && !firstCatch.current) {
      firstCatch.current = e.from.username;
      emitRef.current?.({ type: "hall_moment", hall: space.hall, moment: "bouquet", caught: e.from.username });
      flash(`💐 @${e.from.username} caught the bouquet!`);
      sfx("applause");
      return;
    }
    const text = e.type === "chat" ? e.text : e.type === "wave" ? "👋" : null;
    if (!text) return;
    setBubbles((b) => ({ ...b, [e.from.userId]: text }));
    setTimeout(() => setBubbles((b) => { const n = { ...b }; if (n[e.from.userId] === text) delete n[e.from.userId]; return n; }), 6000);
  };
  const room = useRoom(space ? `hall:${space.id}` : null, { x: where.x, z: where.z, face: where.yaw, animation: where.walking ? "walk" : mood }, onEvent);
  useEffect(() => { emitRef.current = room.emit; });

  // The host's changes are saved as they go, and everyone here sees the new version.
  const saveKey = JSON.stringify([furniture.filter((f) => f.placement), style]);
  const loaded = useRef(false);
  useEffect(() => {
    if (!space?.isHost || !style || demo) return;
    if (!loaded.current) { loaded.current = true; return; }
    const t = setTimeout(() => {
      void saveHallSpace(space.id, { furniture: furniture.filter((f) => !f.uid.startsWith("builtin:") || f.placement), style }).then((r) => {
        if (!r.error) room.emit({ type: "home" });
      });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saves when the design changes
  }, [saveKey, space?.isHost]);

  if (failed) {
    return (
      <main className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-4xl">🎊</p>
          <p className="font-black text-lg">{failed}</p>
          <Link href="/explore" className="block h-12 leading-[3rem] rounded-2xl bg-emerald-600 text-white font-black">Back to the city</Link>
        </div>
      </main>
    );
  }
  if (!space || !style || !citizen) return <main className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white font-bold">Arriving at the hall…</main>;

  const hall = hallById(space.hall);
  const host = space.isHost;
  const live = clock >= Date.parse(space.startsAt) && clock <= Date.parse(space.endsAt);
  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const storage = furniture.filter((f) => !f.placement);

  const guests: Person[] = room.peers.map((p) => ({
    look: p.look, position: [p.x, p.lift ?? 0, p.z], rotation: p.face ?? 0, animation: p.animation,
    label: `${p.away ? "💤 " : ""}@${p.username}${p.userId === space.host.id ? " · host" : ""}`, bubble: bubbles[p.userId],
  }));

  const buy = (item: CatalogItem) => {
    if (!demo && !adjustBalance(-item.price)) { say(`You need ${aed(item.price)} for that.`); return; }
    const uid = newUid(item.id);
    setFurniture((f) => [...f, { uid, itemId: item.id, placement: null }]);
    setSheet(null);
    setPlacing({ uid, itemId: item.id, rot: 0 });
    gameAudio.playCoinSound();
  };
  const place = (uid: string, placement: Placement) => {
    setFurniture((list) => list.map((f) => (f.uid === uid ? { ...f, placement } : f)));
    setPlacing(null);
    gameAudio.playClickSound();
  };
  const pickUp = (uid: string) => {
    const f = furniture.find((x) => x.uid === uid);
    if (!f) return;
    setPlacing({ uid, itemId: f.itemId, rot: f.placement?.kind === "floor" ? f.placement.rot : 0, layer: f.placement?.kind === "floor" ? f.placement.layer : undefined });
  };
  const putAway = () => {
    if (!placing) return;
    const uid = placing.uid;
    setFurniture((list) => list.map((f) => (f.uid === uid ? { ...f, placement: null } : f)));
    setPlacing(null);
    say("Moved to the hall's storage.");
  };
  const donePlacing = () => {
    if (!placing) return;
    if (candidate) { if (!candidate.isValid) { say("It doesn't fit there. Try a green spot."); return; } place(placing.uid, candidate.placement); return; }
    const current = furniture.find((f) => f.uid === placing.uid)?.placement;
    if (current) place(placing.uid, current); else setPlacing(null);
  };
  const restyle = (change: Partial<HomeStyle>, price: number, label: string) => {
    if (price > 0 && !adjustBalance(-price)) { say(`You need ${aed(price)} for that.`); return; }
    setStyle({ ...style, ...change });
    say(label);
  };
  const moment = (m: Moment) => {
    if (!live) { say("The moments start when the event does."); return; }
    haptic(15);
    room.emit({ type: "hall_moment", hall: space.hall, moment: m });
    // The host sees it too (the room doesn't echo your own events).
    onEvent({ type: "hall_moment", hall: space.hall, moment: m, id: "me", from: { userId: citizen.id, username: citizen.username, name: citizen.name, x: where.x, z: where.z, animation: "idle" }, at: 0 } as Received);
    if (m === "bouquet") firstCatch.current = null;
    if (!done.includes(m)) setDone([...done, m]);
  };
  const endEvent = () => {
    const pieces = furniture.filter((f) => f.placement).length;
    const score = room.peers.length * 120 + done.length * 200 + pieces * 25;
    const stars = done.length >= 3 && room.peers.length >= 3 ? 3 : done.length >= 2 && room.peers.length >= 1 ? 2 : done.length >= 1 ? 1 : 0;
    room.emit({ type: "hall_moment", hall: space.hall, moment: "end" });
    void recordGameResult("hall", score, stars, 0).then((o) => say(o.reward > 0 ? `What a night! +${aed(o.reward)}` : "What a night!"));
    sfx("applause");
  };
  const catchIt = () => {
    if (!airborne) return;
    room.emit({ type: "bouquet_catch", hall: space.hall });
    haptic(20); sfx("mgPerfect");
    say("You reached for it…");
  };

  return (
    <main className="fixed inset-0 bg-stone-200 overflow-hidden select-none">
      <ApartmentRoom
        look={citizen.look}
        furniture={furniture}
        placing={placing}
        decorating={host && !placing && !sheet}
        turns={turns}
        housingTier="ballroom"
        view={view}
        onGhostChange={setCandidate}
        onPlace={place}
        onPickUp={pickUp}
        onPlaceBlocked={() => say("It doesn't fit there. Try a green spot.")}
        homeStyle={style}
        people={guests}
        myAnimation={mood === "idle" ? undefined : mood}
        onMove={(x, z, yaw, walking) => setWhere({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, yaw: Math.round(yaw * 100) / 100, walking })}
        paused={!!sheet}
      />

      {/* What's on */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex justify-center pointer-events-none">
        <div className="w-full max-w-md rounded-2xl bg-white/95 text-slate-900 shadow-xl px-4 py-2.5 flex items-center gap-3 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">🎊 {space.title}</p>
            <p className="text-[11px] text-slate-500 truncate">{hall?.name} · hosted by @{space.host.username} · {room.peers.length + 1} here · {live ? "on now" : `starts ${new Date(space.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`}</p>
          </div>
          <Link href="/explore" className="text-xs font-bold text-slate-500 shrink-0">Leave</Link>
        </div>
      </div>
      <div className="absolute right-3 top-[30%] flex flex-col gap-2">
        <button onClick={() => setTurns((t) => t - 1)} aria-label="Rotate left" className="w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-slate-700"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={() => setTurns((t) => t + 1)} aria-label="Rotate right" className="w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-slate-700"><RotateCw className="w-4 h-4" /></button>
        <button onClick={() => setView((v) => (v === "above" ? "inside" : v === "inside" ? "eye" : "above"))} aria-label="Change view" className="w-10 h-10 rounded-full bg-white/95 shadow-lg text-[10px] font-black text-slate-700">{view === "above" ? "👁️" : view === "inside" ? "🧍" : "🗺️"}</button>
      </div>

      {banner && <div className="absolute top-24 inset-x-3 z-30 flex justify-center pointer-events-none"><p className="max-w-md rounded-2xl bg-amber-400 text-amber-950 font-black text-center px-4 py-3 shadow-xl animate-[arcade-pop_0.6s_ease-out]">{banner}</p></div>}
      {toast && <div className="absolute top-40 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">{toast}</div>}
      {airborne && (
        <button onPointerDown={catchIt} className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-pink-500 text-white font-black text-3xl shadow-[0_0_40px_rgba(236,72,153,0.8)] animate-pulse">💐<span className="block text-lg">CATCH!</span></button>
      )}

      {/* The host's tools (placing, or the toolbar); a guest's simple bar */}
      {host && placing && placingItem ? (
        <div className="absolute bottom-3 inset-x-3 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl p-3 space-y-2">
            <p className="text-sm font-black">{placingItem.icon} {placingItem.name}: tap or drag to move, then Done</p>
            <div className="flex gap-2">
              {placingItem.kind !== "wall" && <button onClick={() => setPlacing((p) => (p ? { ...p, rot: ((p.rot + 1) % 4) as Rotation } : p))} className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-black">Rotate</button>}
              <button onClick={putAway} className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Storage</button>
              <button onClick={donePlacing} className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5"><Check className="w-4 h-4 stroke-[3]" /> Done</button>
            </div>
          </div>
        </div>
      ) : host ? (
        <div className="absolute bottom-3 inset-x-3 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl p-3 space-y-2">
            {live ? (
              <div className="grid grid-cols-4 gap-1.5">
                {MOMENTS.map((m) => <button key={m.id} onClick={() => moment(m.id)} className={`h-14 rounded-xl text-xs font-black ${done.includes(m.id) ? "bg-amber-100 text-amber-900" : "bg-amber-400 text-amber-950"}`}><span className="block text-xl">{m.icon}</span>{m.label}</button>)}
              </div>
            ) : <p className="text-[11px] text-center text-slate-500">Dress the hall before your guests arrive. Tap anything to move it.</p>}
            <div className="grid grid-cols-4 gap-1.5">
              <button onClick={() => setSheet("store")} className="h-11 rounded-xl bg-emerald-600 text-white text-xs font-black">🛍️ Store</button>
              <button onClick={() => setSheet("look")} className="h-11 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">🎨 Look</button>
              <button onClick={() => setSheet("storage")} className="h-11 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">📦 {storage.length}</button>
              <button onClick={() => setSheet("decorator")} className="h-11 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">🧑‍🎨 Hire</button>
            </div>
            {space.decorating && <p className="text-[11px] text-center text-emerald-700">🧑‍🎨 @{space.decorating.decorator} is {space.decorating.status === "working" ? "decorating" : "considering the job"}</p>}
            {live && <button onClick={endEvent} className="w-full h-10 rounded-xl bg-slate-900 text-white text-xs font-black">🎆 End the night</button>}
            <p className="text-[10px] text-center text-slate-400">Invite code {space.code}: guests come straight here.</p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 inset-x-3 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white/95 text-slate-900 shadow-xl p-3 grid grid-cols-3 gap-2">
            <button onClick={() => { setMood("dance"); setTimeout(() => setMood("idle"), 20_000); }} className="h-11 rounded-xl bg-pink-500 text-white text-xs font-black">💃 Dance</button>
            <button onClick={() => { setMood("clap"); setTimeout(() => setMood("idle"), 4_000); sfx("clap"); }} className="h-11 rounded-xl bg-amber-400 text-amber-950 text-xs font-black">👏 Cheer</button>
            <button onClick={() => room.emit({ type: "wave" })} className="h-11 rounded-xl bg-sky-100 text-sky-900 text-xs font-black">👋 Wave</button>
          </div>
        </div>
      )}

      {sheet === "look" && <HomeLookSheet style={style} onChange={restyle} onClose={() => setSheet(null)} />}
      {sheet && sheet !== "look" && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div className="w-full max-w-md max-h-[80dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-lg">{sheet === "store" ? "Store" : sheet === "storage" ? "The hall's storage" : "Hire a decorator"}</p>
              <button onClick={() => setSheet(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            {sheet === "store" && (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1">{STORE_CATEGORIES.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-black capitalize ${cat === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{c}</button>)}</div>
                <div className="grid grid-cols-2 gap-2">
                  {CATALOG.filter((c) => c.category === cat).map((item) => (
                    <button key={item.id} disabled={item.price > (citizen.balance ?? 0)} onClick={() => buy(item)} className="rounded-2xl border border-slate-200 p-2.5 text-left disabled:opacity-40">
                      <span className="block text-2xl">{item.icon}</span>
                      <span className="block text-xs font-black leading-tight mt-1">{item.name}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-600">{aed(item.price)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {sheet === "storage" && (storage.length === 0 ? <p className="text-sm text-slate-500 py-4 text-center">Nothing in storage.</p> : (
              <div className="grid grid-cols-2 gap-2">
                {storage.map((f) => { const item = getCatalogItem(f.itemId); return <button key={f.uid} onClick={() => { setSheet(null); setPlacing({ uid: f.uid, itemId: f.itemId, rot: 0 }); }} className="rounded-2xl border border-slate-200 p-2.5 text-left"><span className="block text-2xl">{item?.icon}</span><span className="block text-xs font-black leading-tight mt-1">{item?.name}</span></button>; })}
              </div>
            ))}
            {sheet === "decorator" && <HireDecorator booking={space.id} busy={!!space.decorating} onDone={(m) => { say(m); setSheet(null); load(); }} />}
          </div>
        </div>
      )}
    </main>
  );
}

/** Pick a player decorator, set a budget: they get a request, and their work comes to this hall when done. */
function HireDecorator({ booking, busy, onDone }: { booking: number; busy: boolean; onDone: (message: string) => void }) {
  const [pros, setPros] = useState<DecoratorPro[] | null>(null);
  const [budget, setBudget] = useState(25000);
  const [pick, setPick] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { void decorators().then((r) => setPros(r.data ?? [])); }, []);
  if (busy) return <p className="text-sm text-slate-600">A decorator is already on this hall.</p>;
  if (!pros) return <p className="text-sm text-slate-500">Finding decorators…</p>;
  if (!pros.length) return <p className="text-sm text-slate-500">No interior decorators are working right now. Decorate it yourself from the store, or try later.</p>;
  const hire = async () => {
    if (!pick) return;
    setMsg("Sending…");
    const r = await requestHallDecorator(pick, booking, budget, null);
    if (r.error) { setMsg(r.error); return; }
    onDone("Request sent. Your budget and their fee are held until they finish.");
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">Players with the interior decorator job. They walk into this hall and decorate it within your budget; what they don&apos;t spend comes back to you.</p>
      {pros.map((p) => (
        <button key={p.id} onClick={() => setPick(p.id)} className={`w-full rounded-2xl border p-3 text-left flex justify-between ${pick === p.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
          <span className="font-black text-sm">@{p.username}</span><span className="text-xs font-mono text-emerald-700">fee {aed(p.fee)}</span>
        </button>
      ))}
      <div className="flex gap-1.5">{[10000, 25000, 50000, 100000].map((b) => <button key={b} onClick={() => setBudget(b)} className={`flex-1 rounded-xl py-2 text-xs font-black border ${budget === b ? "bg-slate-900 text-white" : "border-slate-200"}`}>{aed(b)}</button>)}</div>
      <button disabled={!pick} onClick={() => void hire()} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-40">Hire with a {aed(budget)} budget</button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
