"use client";

// Discover: "To do" (what to do, where and why: src/data/guide/activities.json) and "Places to visit"
// (every place, club, bar and lounge in the city: src/data/guide/places-to-visit.json). Opened from the
// map's bottom bar, plus a one-time pop-up on the map that suggests the first few. Items tick themselves off.

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, EyeOff, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { dialogOpen, isNewCitizen, useCitizen } from "@/lib/citizenStore";
import { activities, markSeen, refreshDiscover, setHidden, toTryCount, useDiscover, type ActivityView } from "@/lib/discover";
import { openLife } from "@/components/life/LifeHub";
import type { LifeTab } from "@/components/life/LifePanel";
import { prizeText } from "@/components/guide/HowItWorks";
import { GAMES } from "@/lib/games/registry";
import { getPlace } from "@/lib/city/places";
import ACTIVITIES from "@/data/guide/activities.json";
import VISIT from "@/data/guide/places-to-visit.json";
import { gameAudio } from "@/utils/gameAudio";

const INTRO = "dl_discover_intro";   // {count, at}

/** A fresh order on every visit: a seeded shuffle, so the order holds steady while the sheet is open. */
function shuffled<T>(items: T[], seed: number): T[] {
  let x = (seed >>> 0) || 1;   // unsigned: XOR-ed seeds can be negative
  const rand = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const newSeed = () => Math.floor(Math.random() * 4294967295) + 1;
type Spot = (typeof VISIT.places)[number];

/** "What / Where / Why" lines shared by both lists. */
function Lines({ where, why, what, points }: { where?: string; why?: string; what?: string; points?: string }) {
  return (
    <div className="mt-1 space-y-0.5 text-xs leading-snug">
      {what && <p className="text-slate-700"><b className="text-slate-900">What:</b> {what}</p>}
      {where && <p className="text-slate-600"><b className="text-slate-900">📍 Where:</b> {where}</p>}
      {why && <p className="text-slate-600"><b className="text-slate-900">💡 Why:</b> {why}</p>}
      {points && <p className="font-black text-amber-700">🏆 {points}</p>}
    </div>
  );
}

function TodoRow({ a, now, onGo, onHide }: { a: ActivityView; now: number; onGo: () => void; onHide?: () => void }) {
  const { item } = a;
  const router = useRouter();
  const go = () => {
    gameAudio.playClickSound();
    if (item.done === "seen") markSeen(item.id);
    onGo();
    if ("href" in item && item.href) router.push(item.href);
    else if ("action" in item && item.action) setTimeout(() => openLife(item.action as LifeTab), 150);
  };
  return (
    <div className={`rounded-2xl border p-3 ${a.done ? "bg-emerald-50/60 border-emerald-100" : "bg-white border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${a.done ? "text-emerald-800" : "text-slate-900"}`}>{item.title}{a.done && <Check className="inline w-4 h-4 ml-1 text-emerald-600" />}</p>
          {!a.done && <Lines where={item.where} why={item.why.replace("{prize}", prizeText(now))} points={"points" in item ? item.points : undefined} />}
          {"games" in item && item.games && !a.done && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.games.map((g) => { const game = GAMES.find((x) => x.id === g); return game && (
                <Link key={g} href={`/games/${g}`} onClick={onGo} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100">{game.icon} {game.name}</Link>
              ); })}
            </div>
          )}
        </div>
        {!a.done && (
          <div className="shrink-0 flex flex-col items-end gap-1.5 max-w-[42%]">
            <button onClick={go} className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-600 text-white text-right">{item.go}</button>
            {onHide && <button onClick={onHide} className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5" aria-label={`Hide ${item.title}`}><EyeOff className="w-3 h-3" /> Hide</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/** One place (or a club, bar or lounge inside one). Ticks off once you've walked in. */
function PlaceRow({ spot, visited, onGo }: { spot: Spot; visited: boolean; onGo: () => void }) {
  const router = useRouter();
  const [pid, vid] = spot.id.split("/");
  const place = getPlace(pid);
  const venue = vid ? place?.venues.find((v) => v.id === vid) : null;
  if (!place || (vid && !venue)) return null;
  return (
    <div className={`rounded-2xl border p-3 flex items-start gap-3 ${visited ? "bg-emerald-50/60 border-emerald-100" : "bg-white border-slate-200"}`}>
      <span className="text-2xl leading-none mt-0.5">{spot.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-black text-sm ${visited ? "text-emerald-800" : "text-slate-900"}`}>Visit {venue?.name ?? place.name}{visited && <Check className="inline w-4 h-4 ml-1 text-emerald-600" />}</p>
        <Lines what={spot.what} where={spot.where} why={spot.why} />
      </div>
      <button onClick={() => { gameAudio.playClickSound(); onGo(); router.push(vid ? `/place/${pid}/${vid}` : `/place/${pid}`); }}
        className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-full ${visited ? "bg-slate-100 text-slate-600" : "bg-sky-600 text-white"}`}>{visited ? "Again" : "Go"}</button>
    </div>
  );
}

const Chips = ({ items, value, onChange, tone }: { items: string[]; value: string | null; onChange: (c: string | null) => void; tone: string }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
    {[null, ...items].map((c) => (
      <button key={c ?? "all"} onClick={() => onChange(c)} className={`shrink-0 h-8 px-3 rounded-full text-xs font-bold border ${value === c ? `${tone} text-white border-transparent` : "bg-white border-slate-200"}`}>{c ?? "All"}</button>
    ))}
  </div>
);

export function DiscoverHost() {
  const { citizen } = useCitizen();
  const path = usePathname();
  const router = useRouter();
  useDiscover();
  const [sheet, setSheet] = useState(false);
  const [intro, setIntro] = useState(false);
  const [tab, setTab] = useState<"do" | "places">("do");
  const [todoCat, setTodoCat] = useState<string | null>(null);
  const [placeCat, setPlaceCat] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [seed, setSeed] = useState(newSeed);
  const signedIn = !!citizen?.id;

  useEffect(() => {
    if (!signedIn) return;
    void refreshDiscover(true);
    const open = (e: Event) => {
      void refreshDiscover(true);
      setTab((e as CustomEvent<"do" | "places">).detail === "places" ? "places" : "do");
      setSeed(newSeed()); setIntro(false); setSheet(true);
    };
    window.addEventListener("dubai:open-discover", open);
    return () => window.removeEventListener("dubai:open-discover", open);
  }, [signedIn]);

  // The first-visit pop-up on the map: once after the tour, and once more after 3 days if most starter things
  // are still untried. Never on top of another dialog.
  useEffect(() => {
    if (!signedIn || !path?.startsWith("/explore")) return;
    let shown: { count: number; at: number } = { count: 0, at: 0 };
    try { shown = JSON.parse(localStorage.getItem(INTRO) ?? "null") ?? shown; } catch { /* storage blocked */ }
    if (shown.count >= 2 || (shown.count === 1 && Date.now() - shown.at < 3 * 86_400_000)) return;
    const t = setInterval(() => {
      if (dialogOpen()) return;
      try { if (isNewCitizen(citizen) && localStorage.getItem(`tour-done:${citizen?.id}`) !== "1") return; } catch { /* storage blocked */ }
      if (toTryCount() === 0) return;   // still loading, or nothing left to suggest
      clearInterval(t);
      if (shown.count === 1 && activities().filter((x) => x.item.core && !x.done && !x.hidden).length < 3) return;
      try { localStorage.setItem(INTRO, JSON.stringify({ count: shown.count + 1, at: Date.now() })); } catch { /* storage blocked */ }
      setSeed(newSeed()); setIntro(true);
    }, 5000);
    return () => clearInterval(t);
  }, [signedIn, path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!signedIn || (!sheet && !intro)) return null;
  // Mixed up on every visit (not grouped by category); things still to try stay above finished ones.
  const list = shuffled(activities(), seed);
  const todo = list.filter((a) => !a.done && !a.hidden);
  const done = list.filter((a) => a.done);
  const hidden = list.filter((a) => !a.done && a.hidden);
  const close = () => { setSheet(false); setIntro(false); };
  const visited = (id: string) => (citizen?.visited ?? []).some((k) => (id.includes("/") ? k === id : k === id || k.startsWith(`${id}/`)));
  const allSpots = shuffled(VISIT.places, seed ^ 0x5bd1e995);
  const placesLeft = allSpots.filter((sp) => !visited(sp.id)).length;
  const spots = allSpots.filter((sp) => !placeCat || sp.category === placeCat);
  const todoShown = todo.filter((a) => !todoCat || a.item.cat === todoCat);
  const openAll = (t: "do" | "places") => { setIntro(false); setTab(t); setSheet(true); };
  const showIntro = intro && !sheet;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[165] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Things you can do">
        <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
        <div className="relative w-full sm:max-w-lg bg-slate-50 text-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[88dvh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 pb-[env(safe-area-inset-bottom)]">
          <button onClick={close} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-600 shadow" aria-label="Close"><X className="w-4 h-4" /></button>
          <header className="px-5 pt-5 pb-3 pr-14">
            <h2 className="text-xl font-black">{showIntro ? "Things you can do in Dubai" : tab === "do" ? "Things to do" : "Places to visit"}</h2>
            <p className="text-sm text-slate-500">{showIntro ? "A few ideas to start. Find everything under To do and Places on the bottom bar." : tab === "do" ? `${todo.length} to try · ${done.length} done` : `${VISIT.places.length - placesLeft} of ${VISIT.places.length} visited`}</p>
            {!showIntro && (
              <div className="flex gap-1.5 mt-3 bg-white rounded-full p-1 border border-slate-200">
                {([["do", `✅ To do · ${todo.length}`], ["places", `📍 Places · ${placesLeft}`]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`flex-1 h-9 rounded-full text-xs font-black ${tab === id ? "bg-slate-900 text-white" : "text-slate-600"}`}>{label}</button>
                ))}
              </div>
            )}
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 space-y-2">
            {(tab === "do" || showIntro) && (
              <button onClick={() => { close(); router.push("/tournament"); }} className="w-full text-left rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-3.5 text-slate-950">
                <span className="block text-sm font-black">🏆 Everything here scores points</span>
                <span className="block text-xs font-bold mt-0.5">More points, better chance of winning the monthly tournament: {prizeText(now)}. Free, 21+ ›</span>
              </button>
            )}
            {showIntro ? (
              <>
                {todo.slice(0, 4).map((a) => <TodoRow key={a.item.id} a={a} now={now} onGo={close} />)}
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 pt-2">Places to visit</p>
                {allSpots.filter((sp) => !visited(sp.id)).slice(0, 3).map((sp) => <PlaceRow key={sp.id} spot={sp} visited={false} onGo={close} />)}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => openAll("do")} className="h-12 rounded-2xl bg-slate-900 text-white font-black text-xs">All things to do ({todo.length})</button>
                  <button onClick={() => openAll("places")} className="h-12 rounded-2xl bg-sky-600 text-white font-black text-xs">All places ({placesLeft})</button>
                </div>
              </>
            ) : tab === "places" ? (
              <>
                <Chips items={VISIT.categories} value={placeCat} onChange={setPlaceCat} tone="bg-sky-600" />
                {[...spots.filter((sp) => !visited(sp.id)), ...spots.filter((sp) => visited(sp.id))].map((sp) => <PlaceRow key={sp.id} spot={sp} visited={visited(sp.id)} onGo={close} />)}
              </>
            ) : (
              <>
                <Chips items={ACTIVITIES.categories} value={todoCat} onChange={setTodoCat} tone="bg-emerald-600" />
                {todoShown.map((a) => <TodoRow key={a.item.id} a={a} now={now} onGo={close} onHide={() => setHidden(a.item.id, true)} />)}
                {todoShown.length === 0 && <p className="text-sm text-slate-500 text-center py-4">All done here. Pick another category.</p>}
                {done.length > 0 && !todoCat && (
                  <>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 pt-3">Done</p>
                    {done.map((a) => <TodoRow key={a.item.id} a={a} now={now} onGo={close} />)}
                  </>
                )}
                {hidden.length > 0 && !todoCat && (
                  <div className="pt-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Hidden</p>
                    <div className="flex flex-wrap gap-1.5">{hidden.map((a) => <button key={a.item.id} onClick={() => setHidden(a.item.id, false)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200">{a.item.icon} {a.item.title} · show</button>)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
