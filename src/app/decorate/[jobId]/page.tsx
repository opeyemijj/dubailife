"use client";

// A decorator at work: walk into the client's home in 3D, buy from the store with their budget, move things around
// and change the floors and walls. It's saved as you go, on the job rather than in their home; they see it when you finish.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Package, RotateCcw, RotateCw, X } from "lucide-react";
import { ApartmentRoom, type PlacingState, type CandidatePlacement } from "@/components/home/ApartmentRoom";
import { MoveInWalk } from "@/components/onboarding/MoveInWalk";
import { ExteriorSheet } from "@/components/home/ExteriorSheet";
import { useRequireCitizen } from "@/lib/citizenStore";
import { completeDecor, decorHome, saveDecor, studioOf, type DecorHome, type DecorPlan } from "@/lib/decorator";
import {
  CATALOG, FLOOR_FINISHES, getCatalogItem, hasPlot, HOUSING_CONFIGS, PANELS_PRICE, SHOP_CATEGORIES, WALL_PAINTS, withHomeItems,
  type CatalogItem, type HomeStyle, type OwnedFurniture, type Placement, type Rotation,
} from "@/lib/furniture";
import { gameAudio } from "@/utils/gameAudio";

const aed = (n: number) => `AED ${n.toLocaleString()}`;
const newUid = (id: string) => `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function DecoratePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { citizen } = useRequireCitizen();
  const [home, setHome] = useState<DecorHome | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [inside, setInside] = useState(false);
  const [furniture, setFurniture] = useState<OwnedFurniture[]>([]);
  const [style, setStyle] = useState<HomeStyle | null>(null);
  const [bought, setBought] = useState<Record<string, number>>({});
  const [spent, setSpent] = useState(0);
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [store, setStore] = useState<"shop" | "storage" | "style" | "outside" | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [find, setFind] = useState("");
  const [turns, setTurns] = useState(0);
  const [level, setLevel] = useState(0);
  const [room, setRoom] = useState("living");
  const [candidatePlacement, setCandidatePlacement] = useState<CandidatePlacement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ fee: number; back: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void decorHome(Number(jobId)).then((r) => {
      if (!live) return;
      const h = r.data;
      if (!h) { setFailed(r.error ?? "This job is no longer open."); return; }
      setHome(h);
      setFurniture(withHomeItems(h.plan?.furniture ?? h.furniture, h.tier));
      setStyle(h.plan?.style ?? h.style ?? (HOUSING_CONFIGS[h.tier] ?? HOUSING_CONFIGS.studio).finish);
      setBought(h.plan?.bought ?? {});
      setSpent(h.spent);
    });
    return () => { live = false; };
  }, [jobId]);

  // Saved as you go, so you can leave and come back.
  const plan = useCallback((): DecorPlan | null => (style ? { furniture, style, bought } : null), [furniture, style, bought]);
  const loaded = useRef(false);
  useEffect(() => {
    const p = plan();
    if (!home || !p || finished) return;
    if (!loaded.current) { loaded.current = true; return; }
    const t = setTimeout(() => void saveDecor(home.id, p, spent), 1200);
    return () => clearTimeout(t);
  }, [home, plan, spent, finished]);

  const say = (text: string) => { setToast(text); setTimeout(() => setToast(null), 2600); };

  if (failed) {
    return (
      <main className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-4xl">🔑</p>
          <p className="font-black text-lg">{failed}</p>
          <Link href="/explore" className="block h-12 leading-[3rem] rounded-2xl bg-emerald-600 text-white font-black">Back to the city</Link>
        </div>
      </main>
    );
  }
  if (!home || !style || !citizen) return <main className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white font-bold">Heading over…</main>;

  if (!inside) {
    return <MoveInWalk look={citizen.look ?? { gender: "woman" }} homeId={home.tier} homeLabel="" caption={`You have @${home.client}'s key. Budget ${aed(home.budget - spent)}.`} onDone={() => setInside(true)} />;
  }

  const left = home.budget - spent;
  const config = HOUSING_CONFIGS[home.tier] ?? HOUSING_CONFIGS.studio;
  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const brief = home.brief ? studioOf(home.brief) : null;
  const storage = furniture.filter((f) => !f.placement);

  const buy = (item: CatalogItem) => {
    if (item.price > left) { say(`That's over what's left of the budget (${aed(left)}).`); return; }
    const uid = newUid(item.id);
    setFurniture((f) => [...f, { uid, itemId: item.id, placement: null }]);
    setBought((b) => ({ ...b, [uid]: item.price }));
    setSpent((s) => s + item.price);
    setStore(null);
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
    gameAudio.playClickSound();
    setPlacing({ uid, itemId: f.itemId, rot: f.placement?.kind === "floor" ? f.placement.rot : 0, layer: f.placement?.kind === "floor" ? f.placement.layer : undefined });
  };
  const putAway = () => {
    if (!placing) return;
    const uid = placing.uid;
    setFurniture((list) => list.map((f) => (f.uid === uid ? { ...f, placement: null } : f)));
    setPlacing(null);
    say("Moved to their storage.");
  };
  // Something you bought on this job can go back to the store, and the money back into the budget.
  const giveBack = () => {
    if (!placing) return;
    const uid = placing.uid;
    const price = bought[uid] ?? 0;
    setFurniture((list) => list.filter((f) => f.uid !== uid));
    setBought((b) => { const next = { ...b }; delete next[uid]; return next; });
    setSpent((s) => s - price);
    setPlacing(null);
    say(`Returned. +${aed(price)} back in the budget.`);
  };
  const restyle = (change: Partial<HomeStyle>, price: number) => {
    if (price > left) { say(`That's over what's left of the budget (${aed(left)}).`); return; }
    setStyle({ ...style, ...change });
    setSpent((s) => s + price);
    gameAudio.playCoinSound();
  };
  const finish = async () => {
    setBusy(true);
    const r = await completeDecor(home.id, { furniture, style, bought }, spent);
    setBusy(false);
    if (r.error) { say(r.error); return; }
    gameAudio.playCoinSound();
    setFinished({ fee: r.data ?? home.fee, back: left });
  };

  const handleDonePlacing = () => {
    if (!placing) return;
    if (candidatePlacement) {
      if (!candidatePlacement.isValid) {
        say("It doesn't fit there. Try a green spot.");
        return;
      }
      place(placing.uid, candidatePlacement.placement);
      return;
    }
    const current = furniture.find((f) => f.uid === placing.uid)?.placement;
    if (current) place(placing.uid, current);
    else setPlacing(null);
  };

  return (
    <main className="fixed inset-0 bg-stone-200 overflow-hidden select-none">
      <ApartmentRoom
        look={citizen.look}
        furniture={furniture}
        placing={placing}
        decorating={!placing && !store && !finished}
        turns={turns}
        housingTier={home.tier}
        upView={!!config.rooms?.length || !!config.levels?.length}
        view="above"
        activeRoomId={room}
        onSelectRoom={setRoom}
        onGhostChange={setCandidatePlacement}
        onPlace={place}
        onPickUp={pickUp}
        onPlaceBlocked={() => say("It doesn't fit there. Try a green spot.")}
        level={level}
        onChangeLevel={setLevel}
        homeStyle={style}
      />

      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 flex justify-center pointer-events-none">
        <div className="w-full max-w-md rounded-2xl bg-white/95 text-slate-900 shadow-xl px-4 py-2.5 flex items-center gap-3 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">@{home.client}&apos;s home{brief ? ` · ${brief.icon} ${brief.title}` : ""}</p>
            <p className="text-[11px] text-slate-500">Budget left <b className="text-emerald-700">{aed(left)}</b> of {aed(home.budget)} · your fee {aed(home.fee)}</p>
          </div>
          <Link href="/explore" className="text-xs font-bold text-slate-500 shrink-0">Leave</Link>
        </div>
      </div>

      <div className="absolute right-3 top-[36%] -translate-y-1/2 flex flex-col gap-2">
        <button onClick={() => setTurns((t) => t - 1)} aria-label="Rotate room left" className="w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-slate-700"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={() => setTurns((t) => t + 1)} aria-label="Rotate room right" className="w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-slate-700"><RotateCw className="w-4 h-4" /></button>
      </div>

      {store === "outside" && (
        <ExteriorSheet owned={style.exterior ?? []} payer="the budget" onClose={() => setStore(null)}
          onAdd={(id, price, name) => { restyle({ exterior: [...(style.exterior ?? []), id] }, price); say(`${name} added outside.`); }} />
      )}
      {toast && <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">{toast}</div>}

      {placing && placingItem ? (
        <div className="absolute bottom-3 inset-x-3 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl p-3 space-y-2">
            <p className="text-sm font-black">{placingItem.icon} {placingItem.name}: tap or drag to move, then tap Done</p>
            <div className="flex gap-2">
              {placingItem.kind !== "wall" && <button onClick={() => setPlacing((p) => (p ? { ...p, rot: ((p.rot + 1) % 4) as Rotation } : p))} className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-black">Rotate</button>}
              {placingItem.kind !== "wall" && <button onClick={() => setPlacing((p) => (p ? { ...p, layer: Math.min(6, (p.layer ?? 0) + 1) } : p))} aria-label="Bring forward" className="w-11 h-10 rounded-xl bg-slate-100 text-sm font-black">⬆</button>}
              {placingItem.kind !== "wall" && <button onClick={() => setPlacing((p) => (p ? { ...p, layer: Math.max(-3, (p.layer ?? 0) - 1) } : p))} aria-label="Send back" className="w-11 h-10 rounded-xl bg-slate-100 text-sm font-black">⬇</button>}
              {bought[placing.uid] !== undefined
                ? <button onClick={giveBack} className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold">Return to store</button>
                : <button onClick={putAway} className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Storage</button>}
              <button onClick={handleDonePlacing} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"><Check className="w-4 h-4 stroke-[3]" /> Done</button>
            </div>
          </div>
        </div>
      ) : !finished && (
        <div className="absolute bottom-3 inset-x-3 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl p-3 space-y-2">
            <p className="text-[11px] text-center text-slate-500">Tap anything in the room to move it.</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setStore("shop")} className="h-11 rounded-xl bg-emerald-600 text-white text-xs font-black">🛋️ Store</button>
              <button onClick={() => setStore("style")} className="h-11 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">🎨 Floors &amp; walls</button>
              <button onClick={() => setStore("storage")} className="h-11 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">📦 Storage · {storage.length}</button>
            </div>
            {/* Townhouses and villas: the pool, garage, garden… outside, from the same budget. */}
            {hasPlot(home.tier) && <button onClick={() => setStore("outside")} className="w-full h-10 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black">🏡 Outside: pool, garage, garden{style.exterior?.length ? ` · ${style.exterior.length} added` : ""}</button>}
            <button disabled={busy} onClick={finish} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black disabled:opacity-60">{busy ? "Finishing…" : `✨ Finish and earn ${aed(home.fee)}`}</button>
          </div>
        </div>
      )}

      {store && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Store" onClick={() => setStore(null)}>
          <div className="w-full max-w-md max-h-[80dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-lg">{store === "shop" ? "Store" : store === "style" ? "Floors & walls" : "Their storage"}</p>
              <span className="text-xs font-bold text-emerald-700 ml-auto mr-3">{aed(left)} left</span>
              <button onClick={() => setStore(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            {store === "shop" && (
              <>
                <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search the store" aria-label="Search the store"
                  className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-bold outline-none" />
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {[{ id: "all", label: "All", icon: "🛍️" }, ...SHOP_CATEGORIES].map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-black ${cat === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{c.icon} {c.label}</button>)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CATALOG.filter((c) => (cat === "all" || c.category === cat) && (!find.trim() || `${c.name} ${c.desc}`.toLowerCase().includes(find.trim().toLowerCase()))).map((item) => (
                    <button key={item.id} disabled={item.price > left} onClick={() => buy(item)} className="rounded-2xl border border-slate-200 p-2.5 text-left disabled:opacity-40">
                      <span className="block text-2xl">{item.icon}</span>
                      <span className="block text-xs font-black leading-tight mt-1">{item.name}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-600">{aed(item.price)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {store === "storage" && (
              storage.length === 0 ? <p className="text-sm text-slate-500 py-4 text-center">Nothing in storage.</p> : (
                <div className="grid grid-cols-2 gap-2">
                  {storage.map((f) => {
                    const item = getCatalogItem(f.itemId);
                    return <button key={f.uid} onClick={() => { setStore(null); setPlacing({ uid: f.uid, itemId: f.itemId, rot: 0 }); }} className="rounded-2xl border border-slate-200 p-2.5 text-left"><span className="block text-2xl">{item?.icon}</span><span className="block text-xs font-black leading-tight mt-1">{item?.name}</span></button>;
                  })}
                </div>
              )
            )}
            {store === "style" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {FLOOR_FINISHES.map((f) => <button key={f.id} disabled={style.floor === f.id || f.price > left} onClick={() => restyle({ floor: f.id }, f.price)} className={`rounded-2xl border p-2.5 text-left disabled:opacity-60 ${style.floor === f.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}><span className="block text-xs font-black">{f.label}</span><span className="text-[11px] font-mono font-bold text-emerald-600">{style.floor === f.id ? "In the home" : aed(f.price)}</span></button>)}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {WALL_PAINTS.map((w) => { const on = style.wall.toLowerCase() === w.color.toLowerCase(); return <button key={w.id} disabled={on || w.price > left} onClick={() => restyle({ wall: w.color }, w.price)} className={`rounded-2xl border p-1.5 disabled:opacity-60 ${on ? "border-emerald-500" : "border-slate-200"}`}><span className="block h-8 rounded-lg border border-black/5" style={{ background: w.color }} /><span className="block text-[10px] font-black mt-1 leading-tight">{w.label}</span><span className="text-[9px] font-mono text-emerald-600">{aed(w.price)}</span></button>; })}
                </div>
                {!style.panels && <button disabled={PANELS_PRICE > left} onClick={() => restyle({ panels: true }, PANELS_PRICE)} className="w-full rounded-2xl border border-slate-200 p-3 text-left disabled:opacity-50"><span className="block text-xs font-black">🏛️ Panelled walls &amp; cove lighting</span><span className="text-[11px] font-mono font-bold text-emerald-600">{aed(PANELS_PRICE)}</span></button>}
              </>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Job finished">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 text-center space-y-2">
            <p className="text-4xl">✨</p>
            <p className="font-black text-xl">Job done!</p>
            <p className="text-3xl font-black text-emerald-600">+{aed(finished.fee)}</p>
            <p className="text-sm text-slate-600">@{home.client} will see their new home next time they&apos;re there{finished.back > 0 ? `, and ${aed(finished.back)} of the budget went back to them` : ""}.</p>
            <Link href="/explore" className="block h-12 leading-[3rem] rounded-2xl bg-emerald-600 text-white font-black">Back to the city</Link>
          </div>
        </div>
      )}
    </main>
  );
}
