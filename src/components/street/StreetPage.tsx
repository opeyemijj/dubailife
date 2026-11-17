"use client";

// /street?from=<place or building>&v=<venue>&home=1 : out of the door you came from, onto the street. The real
// places nearby line it in order; walk to one with the stick, or ask "Where to?".

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Search, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useRoom } from "@/lib/room";
import { PLACES, getPlace } from "@/lib/city/places";
import { distanceMetres, entranceOf, getEntity, HOME_SPOT } from "@/lib/city/geo";
import { isDirty } from "@/components/avatar/Flies";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";
import { areaLabel, buyAtShop, shopKind, streetArea, streetShops, type ShopKind } from "@/lib/city/streetShops";
import { genericArea, isGenericHome } from "@/lib/city/partyHome";
import { getHousingTierFromText, HOUSING_CONFIGS } from "@/lib/furniture";
import { DriveSheet } from "@/components/home/DriveSheet";
import { drivables, useGarage } from "@/lib/cars";
import { useNow } from "@/lib/dubaiClock";
import { StreetScene, MoveStick, STREET_LIMIT_X, type AutoWalk, type Controls, type StreetDoor } from "./StreetWorld";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";

const ON_STREET = 14;
/** Walking pace for "how long on foot" (metres a minute). */
const WALK_M_PER_MIN = 80;

const placeHref = (id: string) => {
  const p = getPlace(id);
  if (!p) return "/explore";
  return p.route ?? (p.venues.length > 1 ? `/explore?open=${p.id}` : `/place/${p.id}/${p.venues[0].id}`);
};
const KIND_ICON: Record<string, string> = { mall: "🛍️", "food-hall": "🍽️", hotel: "🏨", club: "🪩", attraction: "🎡", park: "🌴", residential: "🏢", home: "🏠" };
const placeIcon = (id: string) => KIND_ICON[getPlace(id)?.kind ?? ""] ?? "📍";

export function StreetPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from") ?? "";
  const venue = sp.get("v");
  const fromHome = sp.get("home") === "1";
  const { citizen } = useCitizen();

  // Homes not on the map (or a starter home) step out at the generic home spot.
  const origin = useMemo(() => entranceOf(from) ?? (fromHome ? HOME_SPOT : null), [from, fromHome]);
  const originName = getPlace(from)?.name ?? (fromHome ? "Home" : getEntity(from)?.name ?? "Where you were");
  // Which part of Dubai this is: the home's area (a starter home in Deira) or where on the map.
  const homeArea = fromHome ? (sp.get("area") ?? (isGenericHome(from) ? genericArea(from) : HOUSING_CONFIGS[getHousingTierFromText(citizen?.home ?? "studio")]?.area)) : undefined;
  // Where you live decides the street: a villa or townhouse opens onto a villa community, a flat onto towers.
  const villas = sp.get("villa") === "1" || (fromHome && !isGenericHome(from) && /villa|townhouse/.test(getHousingTierFromText(citizen?.home ?? "studio")) && !sp.get("area"));
  const area = useMemo(() => streetArea(origin, homeArea), [origin, homeArea]);
  const [shopAt, setShopAt] = useState<StreetDoor | null>(null);
  // Your plot (from home): what's outside your villa, and your car (owned or rented; none if you have none).
  const homeExt = useMemo(() => (sp.get("ext") ?? "").split(",").filter(Boolean), [sp]);
  const { garage } = useGarage(citizen?.id);
  const nowCar = useNow();
  const myCar = useMemo(() => { const d = drivables(garage, nowCar)[0]; return d ? { car: d.car, plate: d.plate } : null; }, [garage, nowCar]);
  const [driveOpen, setDriveOpen] = useState(false);
  const [shopNote, setShopNote] = useState<string | null>(null);
  // My own door, then the nearest places along the street (alternating sides), in their real order.
  const doors = useMemo<StreetDoor[]>(() => {
    const mine: StreetDoor = { id: "mine", name: fromHome ? "Home" : originName, icon: fromHome ? "🏠" : placeIcon(from), metres: 0,
      href: fromHome ? "/home" : venue ? `/place/${from}/${venue}` : placeHref(from), x: 15, z: 6, mine: true };
    if (!origin) return [mine];
    const near = PLACES.filter((p) => p.id !== from)
      .map((p) => ({ p, at: entranceOf(p.id) }))
      .filter((x): x is { p: typeof x.p; at: { x: number; y: number } } => !!x.at)
      .map((x) => ({ ...x, m: distanceMetres(origin, x.at) }))
      .sort((a, b) => a.m - b.m)
      .slice(0, ON_STREET);
    const places = near.map((x, i): StreetDoor => ({ id: x.p.id, name: x.p.name, icon: placeIcon(x.p.id), metres: x.m, href: placeHref(x.p.id), x: i % 2 ? -15 : 15, z: -30 - i * 34 }));
    // The local shops of this area across the road from each real place (karak, baqala, grill, gym…).
    const locals = streetShops(area, villas ? Math.min(3, near.length) : near.length, from).map((sh, i): StreetDoor => {
      const k = shopKind(sh.kind);
      return { id: `shop-${i}`, name: sh.name, icon: k.icon, metres: 25 + i * 34, href: "", x: i % 2 ? 15 : -15, z: -30 - i * 34, shop: sh.kind, color: k.color };
    });
    // Your own villa's plot: walk up to your car (and drive off) or your pool.
    const extras: StreetDoor[] = [];
    if (villas && fromHome && myCar) extras.push({ id: "my-car", name: `Your ${myCar.car.make} ${myCar.car.model}`, icon: "🚗", metres: 0, href: "", x: 15, z: mine.z - 8.5, prop: "car" });
    if (villas && fromHome && homeExt.includes("pool")) extras.push({ id: "my-pool", name: "Your pool", icon: "🏊", metres: 0, href: "/home?use=pool", x: 15, z: mine.z + 8.5, prop: "pool" });
    return [mine, ...extras, ...places, ...locals];
  }, [from, venue, fromHome, origin, originName, area, villas, myCar, homeExt]);

  const controls = useRef<Controls>({ x: 0, y: 0 });
  const auto = useRef<AutoWalk | null>(null);
  const [run, setRun] = useState(false);
  const [near, setNear] = useState<StreetDoor | null>(null);
  const [where, setWhere] = useState(false);
  const [q, setQ] = useState("");
  const [trip, setTrip] = useState<{ name: string; minutes: number; href: string } | null>(null);

  // Out here with whoever else stepped out of the same place.
  const [me, setMe] = useState({ x: 12.8, z: 4.5, face: Math.PI, animation: "idle" as AvatarAnimation });
  const room = useRoom(from ? `street:${from}` : null, { ...me, dirty: isDirty(citizen?.needs?.hygiene) });
  const onMove = (x: number, z: number, face: number, moving: boolean, running: boolean) =>
    setMe({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, face: Math.round(face * 100) / 100, animation: moving ? (running ? "run" : "walk") : "idle" });

  const go = (href: string) => { gameAudio.playClickSound(); router.push(href); };
  // "Where to?" on this street: walk there by yourself (along the pavement), then in through the door.
  const walkTo = (d: StreetDoor) => {
    setWhere(false);
    const side = Math.sign(d.x);
    auto.current = { points: [[side * 12.6, me.z], [side * 12.6, d.z], [side * STREET_LIMIT_X, d.z]], run, then: () => (d.prop === "car" ? setDriveOpen(true) : d.shop ? (setShopNote(null), setShopAt(d)) : go(d.href)) };
    gameAudio.playClickSound();
  };
  // Further away: the walk fast-forwarded, or a taxi.
  const far = useMemo(() => {
    if (!origin) return [];
    const term = q.trim().toLowerCase();
    return PLACES.filter((p) => p.id !== from && !doors.some((d) => d.id === p.id) && (!term || p.name.toLowerCase().includes(term)))
      .map((p) => ({ p, at: entranceOf(p.id) }))
      .filter((x): x is { p: typeof x.p; at: { x: number; y: number } } => !!x.at)
      .map((x) => ({ id: x.p.id, name: x.p.name, m: distanceMetres(origin, x.at) }))
      .sort((a, b) => a.m - b.m).slice(0, 25);
  }, [origin, q, from, doors]);
  const walkFar = (name: string, m: number, href: string) => {
    setWhere(false);
    const minutes = Math.max(1, Math.round(m / WALK_M_PER_MIN));
    setTrip({ name, minutes, href });
    // The walk itself, sped up (a few seconds), then you're there.
    setTimeout(() => { setTrip(null); go(href); }, Math.min(9000, 2500 + minutes * 120));
  };

  return (
    <main className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none bg-sky-200 text-slate-900 overscroll-none">
      <StreetScene villas={villas} lot={villas && fromHome ? { pool: homeExt.includes("pool"), car: homeExt.includes("carpark") || homeExt.includes("garage") ? myCar : null } : undefined} doors={doors} look={citizen?.look} dirty={isDirty(citizen?.needs?.hygiene)} controls={controls} run={run} auto={auto} peers={room.peers} onMove={onMove} onNear={setNear} />

      <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 z-30 flex items-center gap-2 pointer-events-none">
        <button onClick={() => go(doors[0].href)} className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center" aria-label={`Back inside ${doors[0].name}`}><ArrowLeft className="w-4 h-4" /></button>
        <div className="pointer-events-auto bg-white/95 rounded-2xl shadow-lg px-3 py-1.5 min-w-0">
          <div className="font-black text-sm truncate">🚶 Outside {originName}</div>
          <div className="text-[11px] text-slate-500 truncate">{villas ? "Villa community" : areaLabel(area)} · {room.peers.length ? `${room.peers.length} out here with you` : "walk anywhere or tap Where to?"}</div>
        </div>
        <div className="flex-1" />
        <button onClick={() => setWhere(true)} className="pointer-events-auto h-10 px-4 rounded-full bg-slate-900 text-white shadow-lg flex items-center gap-1.5 text-xs font-black"><MapPin className="w-4 h-4" /> Where to?</button>
      </header>

      {near && !trip && (
        <button onClick={() => (near.prop === "car" ? (gameAudio.playClickSound(), setDriveOpen(true)) : near.shop ? (gameAudio.playClickSound(), setShopNote(null), setShopAt(near)) : go(near.href))} className="absolute right-4 bottom-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] z-30 h-12 px-5 rounded-full bg-emerald-500 text-white font-black shadow-2xl text-sm animate-in fade-in">
          {near.mine ? `🚪 Back inside ${near.name}` : near.prop === "car" ? `🚗 Get in your car` : near.prop === "pool" ? `🏊 Go for a swim` : near.shop ? `${near.icon} ${near.name}` : `🚪 Go into ${near.icon} ${near.name}`}
        </button>
      )}

      {driveOpen && <DriveSheet car={myCar?.car ?? null} onClose={() => setDriveOpen(false)} />}
      {shopAt?.shop && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={shopAt.name} onClick={() => setShopAt(null)}>
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white" style={{ background: shopAt.color }}>{shopAt.icon}</span>
              <div className="flex-1 min-w-0"><p className="font-black text-lg truncate">{shopAt.name}</p><p className="text-xs text-slate-500">{shopKind(shopAt.shop as ShopKind).label} · AED {(citizen?.balance ?? 0).toLocaleString()}</p></div>
              <button onClick={() => setShopAt(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            {shopKind(shopAt.shop as ShopKind).items.map((it) => (
              <button key={it.id} onClick={() => { const r = buyAtShop(it); if (r.ok) gameAudio.playCoinSound(); setShopNote(r.message); }}
                className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-left active:scale-[0.99]">
                <span className="text-2xl">{it.icon}</span>
                <span className="flex-1 min-w-0"><span className="block font-black text-sm">{it.label}</span><span className="block text-[11px] text-slate-500">{it.pantry ? "For your pantry at home" : it.need ? `+${it.amount} ${it.need}` : ""}</span></span>
                <span className="text-sm font-black text-emerald-700">AED {it.price}</span>
              </button>
            ))}
            {shopNote && <p className="rounded-2xl bg-emerald-50 text-emerald-900 text-sm font-bold px-3 py-2">{shopNote}</p>}
          </div>
        </div>
      )}

      {/* The stick on the left thumb, RUN on the right. */}
      <div className="absolute left-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30"><MoveStick controls={controls} run={run} onRun={() => setRun((r) => !r)} /></div>

      {where && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Where to?" onClick={() => setWhere(false)}>
          <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">📍 Where to?</p>
              <button onClick={() => setWhere(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">On this street: walk there yourself</p>
            {doors.filter((d) => !d.mine).sort((a, b) => b.z - a.z).map((d) => (
              <button key={d.id} onClick={() => walkTo(d)} className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-left">
                <span className="text-2xl">{d.icon}</span>
                <span className="flex-1 min-w-0"><span className="block font-black truncate">{d.name}</span><span className="block text-xs text-slate-500">{Math.max(1, Math.round(d.metres / WALK_M_PER_MIN))} min walk</span></span>
                <span className="text-xs font-black text-emerald-700">🚶 Walk</span>
              </button>
            ))}
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 pt-2">Further away</p>
            <label className="flex items-center gap-2 h-11 rounded-xl bg-slate-50 border border-slate-200 px-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Dubai" className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold" />
            </label>
            {far.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                <span className="text-xl">{placeIcon(f.id)}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-black truncate">{f.name}</span><span className="block text-[11px] text-slate-500">{(f.m / 1000).toFixed(1)} km · {Math.round(f.m / WALK_M_PER_MIN)} min on foot</span></span>
                <button onClick={() => walkFar(f.name, f.m, placeHref(f.id))} className="h-8 px-2.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">🚶 Walk</button>
                <button onClick={() => { setWhere(false); openPhone("rides"); }} className="h-8 px-2.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">🚕 Taxi</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {trip && (
        <div className="fixed inset-0 z-[210] bg-slate-950/70 flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full text-center space-y-3">
            <div className="text-5xl animate-bounce">🚶</div>
            <p className="text-xl font-black">Walking to {trip.name}</p>
            <p className="text-slate-500">About {trip.minutes} min on foot through Dubai…</p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 animate-[grow_6s_linear_forwards]" style={{ width: "100%" }} /></div>
          </div>
        </div>
      )}
    </main>
  );
}
