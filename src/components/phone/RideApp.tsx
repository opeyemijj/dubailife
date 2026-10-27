"use client";

// Rides on the phone. Car: pick where to, choose a class, and the driver drops you at the entrance
// (priced with the Dubai taxi tariff times the class). Metro: the nearest stations, stops and Silver or
// Gold fare, then the ride itself plays out in 3D. Every place is listed, more loading as you scroll.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCitizen, adjustBalance, updateCitizen } from "@/lib/citizenStore";
import { PLACES } from "@/lib/city/places";
import { distanceMetres, entranceOf, HOME_SPOT } from "@/lib/city/geo";
import { metroPlan, taxiQuote } from "@/lib/transit";
import { gameAudio } from "@/utils/gameAudio";
import APPS from "@/data/phone/apps.json";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

const KIND_ICON: Record<string, string> = { mall: "🛍️", "food-hall": "🍽️", hotel: "🏨", club: "🪩", attraction: "🎡", park: "🌳", residential: "🏢", home: "🏡" };
const PAGE = 30;

export type MetroTrip = { fromMap: string; toMap: string; gold: boolean; placeId: string };

export function RideApp({ onBack, onClose, onMetro }: { onBack: () => void; onClose: () => void; onMetro: (trip: MetroTrip) => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const from = citizen?.location ?? HOME_SPOT;
  const [mode, setMode] = useState<"car" | "metro">("car");
  const [q, setQ] = useState("");
  const [to, setTo] = useState<string | null>(null);
  const [cls, setCls] = useState(APPS.rides.classes[0].id);
  const [gold, setGold] = useState(false);
  const [riding, setRiding] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);

  const places = useMemo(() => PLACES.filter((p) => p.kind !== "home" && entranceOf(p.id))
    .map((p) => ({ p, metres: distanceMetres(from, entranceOf(p.id)!) }))
    .filter(({ p }) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.metres - b.metres), [from, q]);

  // Load the next page of places when the end of the list scrolls into view.
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setShown((n) => n + PAGE); }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [to, mode, places.length]);

  const dest = to ? places.find((x) => x.p.id === to) ?? null : null;
  const fare = (metres: number, mult: number) => Math.round(taxiQuote(metres).total * mult);
  const mins = (metres: number) => Math.max(3, Math.round(3 + metres / 1000 / 35 * 60));
  const plan = useMemo(() => (dest ? metroPlan(from, entranceOf(dest.p.id)!) : null), [dest, from]);

  const bookCar = () => {
    if (!dest) return;
    const c = APPS.rides.classes.find((x) => x.id === cls)!;
    if (!adjustBalance(-fare(dest.metres, c.multiplier))) return setNote("Not enough AED in your wallet.");
    gameAudio.playCoinSound();
    setRiding(`${c.icon} Your driver is on the way…`);
    setTimeout(() => setRiding(`${c.icon} On the way to ${dest.p.name}…`), 1800);
    setTimeout(() => {
      const at = entranceOf(dest.p.id)!;
      updateCitizen((x) => ({ ...x, location: { ...at, placeId: dest.p.id } }));
      onClose();
      router.push(`/place/${dest.p.id}`);
    }, 4200);
  };

  const list = (
    <>
      <label className="flex items-center gap-2 h-12 px-4 rounded-full bg-slate-100">
        <Search className="w-5 h-5 text-slate-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Where to?" className="flex-1 bg-transparent outline-none text-lg" />
      </label>
      {places.slice(0, shown).map(({ p, metres }) => (
        <button key={p.id} onClick={() => setTo(p.id)} className="w-full flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80 text-left">
          <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-xl">{KIND_ICON[p.kind]}</span>
          <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{p.name}</span><span className="block text-sm text-slate-500">{(metres / 1000).toFixed(1)} km</span></span>
          {mode === "car" && <span className="font-semibold text-slate-600">{aed(fare(metres, 1))}</span>}
        </button>
      ))}
      {shown < places.length ? <div ref={more} className="py-4 text-center text-sm text-slate-400">Loading more places…</div>
        : <p className="py-3 text-center text-sm text-slate-400">{places.length} places</p>}
    </>
  );

  return (
    <AppScreen title={APPS.rides.app.name} onBack={dest && !riding ? () => setTo(null) : onBack} accent="text-emerald-600">
      {!riding && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100">
          {(["car", "metro"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`h-10 rounded-full font-semibold ${mode === m ? "bg-white shadow" : "text-slate-500"}`}>{m === "car" ? "🚗 Car" : "🚇 Metro"}</button>
          ))}
        </div>
      )}

      {riding ? (
        <Card className="bg-emerald-50 text-center py-10">
          <div className="text-6xl animate-bounce">🚗</div>
          <p className="font-semibold text-lg">{riding}</p>
        </Card>
      ) : !dest ? list : mode === "car" ? (
        <>
          <Card className="bg-emerald-50">
            <p className="text-slate-500">To</p>
            <p className="text-xl font-black">{KIND_ICON[dest.p.kind]} {dest.p.name}</p>
            <p className="text-slate-500">{(dest.metres / 1000).toFixed(1)} km · about {mins(dest.metres)} min</p>
          </Card>
          {note && <Note ok={false}>{note}</Note>}
          {APPS.rides.classes.map((c) => (
            <button key={c.id} onClick={() => setCls(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-[22px] text-left ${cls === c.id ? "bg-emerald-50 ring-2 ring-emerald-500" : "bg-slate-100/80"}`}>
              <span className="text-3xl">{c.icon}</span>
              <span className="flex-1"><span className="block font-semibold">{c.name}</span><span className="block text-sm text-slate-500">{c.note}</span></span>
              <span className="font-black">{aed(fare(dest.metres, c.multiplier))}</span>
            </button>
          ))}
          <Big onClick={bookCar} disabled={(citizen?.balance ?? 0) < fare(dest.metres, APPS.rides.classes.find((c) => c.id === cls)!.multiplier)}>
            Book {APPS.rides.classes.find((c) => c.id === cls)!.name}
          </Big>
        </>
      ) : plan && plan.from.map && plan.to.map ? (
        <>
          <Card className="bg-red-50">
            <p className="text-slate-500">Red Line to</p>
            <p className="text-xl font-black">{KIND_ICON[dest.p.kind]} {dest.p.name}</p>
            <ol className="text-sm text-slate-600 space-y-1 pt-1">
              <li>🚶 Walk {Math.round(plan.walkTo)} m to <strong>{plan.from.en}</strong></li>
              <li>🚇 {plan.stops} stop{plan.stops > 1 ? "s" : ""} to <strong>{plan.to.en}</strong></li>
              <li>🚶 Walk {Math.round(plan.walkFrom)} m to the entrance</li>
            </ol>
          </Card>
          {([false, true] as const).map((g) => (
            <button key={String(g)} onClick={() => setGold(g)} className={`w-full flex items-center gap-3 p-3 rounded-[22px] text-left ${gold === g ? "bg-red-50 ring-2 ring-red-500" : "bg-slate-100/80"}`}>
              <span className="text-3xl">{g ? "🥇" : "🥈"}</span>
              <span className="flex-1"><span className="block font-semibold">{g ? "Gold Class" : "Silver"}</span><span className="block text-sm text-slate-500">{g ? "The quiet front carriage, leather seats" : "Standard carriages"}</span></span>
              <span className="font-black">{aed(g ? plan.gold : plan.silver)}</span>
            </button>
          ))}
          <Big tone="red" disabled={(citizen?.balance ?? 0) < (gold ? plan.gold : plan.silver)} onClick={() => onMetro({ fromMap: plan.from.map!, toMap: plan.to.map!, gold, placeId: dest.p.id })}>
            Ride the Metro · {aed(gold ? plan.gold : plan.silver)}
          </Big>
        </>
      ) : (
        <Card><p className="font-semibold">No Metro station near {dest.p.name}.</p><p className="text-slate-500">Take a car instead.</p><Big onClick={() => setMode("car")}>Switch to car</Big></Card>
      )}
    </AppScreen>
  );
}
