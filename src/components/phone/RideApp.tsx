"use client";

// Ride hailing on the phone: pick where to, choose a car, and the driver takes you there. Priced from the
// real distance with the Dubai taxi tariff (src/data/transit/transit.json) times the car class.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCitizen, adjustBalance, updateCitizen } from "@/lib/citizenStore";
import { PLACES } from "@/lib/city/places";
import { distanceMetres, entranceOf, HOME_SPOT } from "@/lib/city/geo";
import { taxiQuote } from "@/lib/transit";
import { gameAudio } from "@/utils/gameAudio";
import APPS from "@/data/phone/apps.json";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

const KIND_ICON: Record<string, string> = { mall: "🛍️", "food-hall": "🍽️", hotel: "🏨", club: "🪩", attraction: "🎡", park: "🌳", residential: "🏢", home: "🏡" };

export function RideApp({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const from = citizen?.location ?? HOME_SPOT;
  const [q, setQ] = useState("");
  const [to, setTo] = useState<string | null>(null);
  const [cls, setCls] = useState(APPS.rides.classes[0].id);
  const [riding, setRiding] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const places = useMemo(() => PLACES.filter((p) => p.kind !== "home" && entranceOf(p.id))
    .map((p) => ({ p, metres: distanceMetres(from, entranceOf(p.id)!) }))
    .filter(({ p }) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.metres - b.metres), [from, q]);
  const dest = to ? places.find((x) => x.p.id === to) ?? null : null;
  const fare = (metres: number, mult: number) => Math.round(taxiQuote(metres).total * mult);
  const mins = (metres: number) => Math.max(3, Math.round(3 + metres / 1000 / 35 * 60));

  const book = () => {
    if (!dest) return;
    const c = APPS.rides.classes.find((x) => x.id === cls)!;
    const price = fare(dest.metres, c.multiplier);
    if (!adjustBalance(-price)) return setNote("Not enough AED in your wallet.");
    gameAudio.playCoinSound();
    setRiding(`${c.icon} Your driver is on the way to take you to ${dest.p.name}…`);
    // The ride itself is short: a moment to arrive, then you're dropped at the entrance.
    setTimeout(() => setRiding(`${c.icon} On the way to ${dest.p.name}…`), 1800);
    setTimeout(() => {
      const at = entranceOf(dest.p.id)!;
      updateCitizen((x) => ({ ...x, location: { ...at, placeId: dest.p.id } }));
      onClose();
      router.push(`/place/${dest.p.id}`);
    }, 4200);
  };

  return (
    <AppScreen title={APPS.rides.app.name} onBack={dest && !riding ? () => setTo(null) : onBack} accent="text-emerald-600">
      {riding ? (
        <Card className="bg-emerald-50 text-center py-10">
          <div className="text-6xl animate-bounce">🚗</div>
          <p className="font-semibold text-lg">{riding}</p>
        </Card>
      ) : dest ? (
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
          <Big onClick={book} disabled={(citizen?.balance ?? 0) < fare(dest.metres, APPS.rides.classes.find((c) => c.id === cls)!.multiplier)}>
            Book {APPS.rides.classes.find((c) => c.id === cls)!.name}
          </Big>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 h-12 px-4 rounded-full bg-slate-100">
            <Search className="w-5 h-5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where to?" className="flex-1 bg-transparent outline-none text-lg" />
          </label>
          {places.slice(0, 60).map(({ p, metres }) => (
            <button key={p.id} onClick={() => setTo(p.id)} className="w-full flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80 text-left">
              <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-xl">{KIND_ICON[p.kind]}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{p.name}</span><span className="block text-sm text-slate-500">{(metres / 1000).toFixed(1)} km</span></span>
              <span className="font-semibold text-slate-600">{aed(fare(metres, 1))}</span>
            </button>
          ))}
        </>
      )}
    </AppScreen>
  );
}
