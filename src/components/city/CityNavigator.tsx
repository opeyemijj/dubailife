"use client";

// Choosing a destination in a building and travelling to it across the city map.
//   directory (stores / vendors / facilities / flats) → journey (walk · taxi · direct) → arrive → enter

import { Sheet, SheetChip } from "@/components/ui/sheet";
import { ModalPortal } from "@/components/ui/modal-portal";
import { ArrivalScene, type ParkedCar } from "./ArrivalScene";
import { usePresentCitizens } from "@/lib/presence";
import { localsAt } from "@/lib/locals";
import { useNow } from "@/lib/dubaiClock";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Car, DoorOpen, Footprints, Home, KeyRound, Link2, Loader2, Search, TrainFront, Zap } from "lucide-react";
import type { Place, Venue } from "@/lib/city/types";
import { distanceMetres, entranceOf } from "@/lib/city/geo";
import { buyFlat, flatRoute, flatTitle, listFlats, rentFlat, type FlatView } from "@/lib/city/flats";
import { adjustBalance, refreshCitizen, updateCitizen, useCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import { VenueDressCodeModal } from "./VenueDressCodeModal";
import { TaxiJourney } from "@/components/transit/TaxiJourney";
import { MetroJourney } from "@/components/transit/MetroJourney";
import { instantFare, metroPlan, stationPoint, taxiQuote } from "@/lib/transit";
import { DriveJourney } from "@/components/cars/DriveJourney";
import { drivables, fuelFor, useGarage, type Drivable } from "@/lib/cars";
import { reloadServices } from "@/lib/cityServices";
import { openPhone } from "@/components/layout/PhoneOverlay";

export type TravelMode = "walk" | "taxi" | "metro" | "direct" | "drive";

export interface Destination {
  place: Place;
  label: string;
  route: string;
}

interface Props {
  place: Place;
  /** Skip straight to the journey for this venue (e.g. from "Plan the journey"). */
  journeyVenueId?: string;
  playerPos: { x: number; y: number };
  /** Animate the citizen on the map; resolves when the trip is over. */
  onTravel: (to: { x: number; y: number }, mode: TravelMode, durationMs: number) => Promise<void>;
  onClose: () => void;
}

const aed = (n: number) => `AED ${n.toLocaleString()}`;

/** Dubai taxi: flag-fall (AED 5, 5.50 at night), ~AED 2.20/km, AED 12 minimum, plus Salik on longer trips
    (the tariff lives in src/data/transit/transit.json). */
export const taxiFare = (metres: number) => taxiQuote(metres).total;
const walkMinutes = (metres: number) => Math.max(1, Math.round(metres / 1.35 / 60));
const taxiMinutes = (metres: number) => Math.max(3, Math.round(3 + metres / 1000 / 30 * 60));

export function CityNavigator({ place, journeyVenueId, playerPos, onTravel, onClose }: Props) {
  const router = useRouter();
  const initial = journeyVenueId ? place.venues.find((v) => v.id === journeyVenueId) : undefined;
  const [destination, setDestination] = useState<Destination | null>(
    initial ? { place, label: initial.name, route: `/place/${place.id}/${initial.id}` } : null,
  );
  const [travelling, setTravelling] = useState<TravelMode | null>(null);
  // A taxi ride is played out in 3D (TaxiJourney), then the citizen is moved there.
  const [taxi, setTaxi] = useState<{ to: { x: number; y: number }; metres: number } | null>(null);
  // A metro trip: walk to the station, ride (MetroJourney), walk on to the place.
  const [metro, setMetro] = useState<{ plan: NonNullable<ReturnType<typeof metroPlan>>; to: { x: number; y: number }; gold: boolean } | null>(null);
  const { citizen } = useCitizen();
  const [dressCodeVenue, setDressCodeVenue] = useState<Venue | null>(null);
  // The last few metres in 3D before going in (venues; homes open straight away).
  const [arriving, setArriving] = useState<{ taxi: boolean; own?: ParkedCar } | null>(null);
  const enter = (taxi: boolean, own?: ParkedCar) => {
    if (destination?.route.startsWith("/place/") || destination?.route.startsWith("/cars/")) setArriving({ taxi, own });
    else if (destination) router.push(destination.route);
  };
  // Your own car (or your rental), driven there yourself (DriveJourney).
  const { garage, reload: reloadGarage } = useGarage(citizen?.id);
  const now = useNow();
  // Only with a driving license (a car rented on a fake one stays parked here).
  const licensed = garage ? !!garage.licence : null;
  const myCars = useMemo(() => (garage?.licence ? drivables(garage, now) : []), [garage, now]);
  const [drive, setDrive] = useState<{ to: { x: number; y: number }; metres: number } | null>(null);

  const go = async (mode: TravelMode) => {
    if (!destination) return;
    const to = entranceOf(place.id) ?? playerPos;
    const metres = distanceMetres(playerPos, to);
    if (mode === "taxi") { gameAudio.playClickSound(); setTaxi({ to, metres }); return; }
    if (mode === "drive") { gameAudio.playClickSound(); setDrive({ to, metres }); return; }
    if (mode === "metro") {
      const plan = metroPlan(playerPos, to);
      if (!plan) return;
      gameAudio.playClickSound();
      // Walk to the station first (shown on the map), then the ride itself.
      setTravelling("walk");
      await onTravel(stationPoint(plan.from), "walk", Math.min(6000, Math.max(1500, plan.walkTo * 6)));
      setTravelling(null);
      setMetro({ plan, to, gold: metroGold });
      return;
    }
    // Skipping the trip costs a premium; only walking is free.
    if (mode === "direct" && !adjustBalance(-instantFare(metres))) return;
    gameAudio.playClickSound();
    setTravelling(mode);
    // Real minutes are compressed so the trip plays in a few seconds.
    const ms = mode === "direct" ? 0 : mode === "walk" ? Math.min(9000, Math.max(2200, metres * 9)) : Math.min(5000, Math.max(1800, metres * 2.5));
    await onTravel(to, mode, ms);
    updateCitizen((c) => ({ ...c, location: { ...to, placeId: place.id } }));
    setTravelling(null);
    enter(false);
  };

  const [metroGold, setMetroGold] = useState(false);
  const arriveByMetro = async () => {
    if (!metro || !destination) return;
    const { plan, to } = metro;
    setMetro(null);
    setTravelling("walk");
    await onTravel(stationPoint(plan.to), "direct", 0);
    await onTravel(to, "walk", Math.min(6000, Math.max(1500, plan.walkFrom * 6)));
    updateCitizen((c) => ({ ...c, location: { ...to, placeId: place.id } }));
    setTravelling(null);
    enter(false);
  };
  if (arriving && destination) {
    return (
      <ModalPortal>
        <ArrivalScene place={place} label={destination.label} look={citizen?.look} taxi={arriving.taxi} own={arriving.own} onDone={() => router.push(destination.route)} />
      </ModalPortal>
    );
  }
  if (drive && destination && myCars.length) {
    const arriveByCar = async (d: Drivable) => {
      const to = drive.to;
      setDrive(null);
      void reloadGarage();
      await onTravel(to, "direct", 0);
      updateCitizen((c) => ({ ...c, location: { ...to, placeId: place.id } }));
      enter(false, { car: d.car, plate: d.plate });
    };
    return (
      <ModalPortal>
        <DriveJourney
          drivables={myCars}
          metres={drive.metres}
          destination={destination.label === place.name ? place.name : `${destination.label}, ${place.name}`}
          look={citizen?.look}
          balance={citizen?.balance ?? 0}
          onArrive={arriveByCar}
          onArrested={() => { setDrive(null); void reloadGarage(); void reloadServices(); onClose(); openPhone("court"); }}
          onCancel={() => { setDrive(null); void reloadGarage(); }}
        />
      </ModalPortal>
    );
  }
  if (metro && destination) {
    return (
      <MetroJourney
        fromMap={metro.plan.from.map!}
        toMap={metro.plan.to.map!}
        gold={metro.gold}
        look={citizen?.look}
        onPay={(fare) => adjustBalance(-fare)}
        onArrive={arriveByMetro}
        onCancel={() => setMetro(null)}
      />
    );
  }

  const arriveByTaxi = async () => {
    if (!taxi || !destination) return;
    const to = taxi.to;
    setTaxi(null);
    setTravelling("taxi");
    await onTravel(to, "taxi", 500);
    updateCitizen((c) => ({ ...c, location: { ...to, placeId: place.id } }));
    setTravelling(null);
    enter(true);
  };
  if (taxi && destination) {
    return (
      <TaxiJourney
        metres={taxi.metres}
        destination={destination.label === place.name ? place.name : `${destination.label}, ${place.name}`}
        look={citizen?.look}
        onPay={(amount) => adjustBalance(-amount)}
        onArrive={arriveByTaxi}
        onCancel={() => setTaxi(null)}
      />
    );
  }

  // While travelling, get out of the way so the trip across the map is visible.
  if (travelling && destination) {
    return (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <div className="bg-white text-slate-900 rounded-full shadow-2xl px-4 py-2 flex items-center gap-2 text-sm font-black">
          <span className="text-xl">{travelling === "taxi" ? "🚕" : travelling === "walk" ? "🚶" : "✨"}</span>
          {travelling === "taxi" ? "Taxi to" : travelling === "walk" ? "Walking to" : "Heading to"} {destination.place.name}…
        </div>
      </div>
    );
  }

  const back = destination && !travelling && !journeyVenueId
    ? <button onClick={() => setDestination(null)} className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-6 h-6" /></button>
    : KIND_ICON[place.kind];
  return (
    // A bottom sheet over the map (above the top bar and bottom nav), so you still see where it is.
    <>
    {!dressCodeVenue && (
      <Sheet
        icon={back}
        title={destination ? destination.label : place.name}
        subtitle={destination ? `at ${place.name}` : kindLine(place)}
        onClose={travelling ? undefined : onClose}
      >
        {destination ? (
          <Journey destination={destination} playerPos={playerPos} travelling={travelling} onGo={go} gold={metroGold} onGold={setMetroGold} cars={myCars} licensed={licensed} />
        ) : (
          <>
            <PlaceIntro place={place} onPick={(v) => setDressCodeVenue(v)} />
            {place.kind === "residential" || place.kind === "home" ? (
              <FlatsDirectory place={place} onPick={(f) => setDestination({ place, label: flatTitle(f), route: flatRoute(f) })} />
            ) : place.route ? (
              // Its own 3D page (a car showroom): straight to the journey, no dress code.
              <button onClick={() => setDestination({ place, label: place.name, route: place.route! })} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center gap-2"><DoorOpen className="w-4 h-4" /> Go to {place.name}</button>
            ) : place.venues.length === 1 ? (
              <SingleVenue venue={place.venues[0]} showBlurb={place.venues[0].blurb !== place.blurb} onGo={() => setDressCodeVenue(place.venues[0])} />
            ) : (
              <Directory place={place} onPick={(v) => setDressCodeVenue(v)} />
            )}
          </>
        )}
      </Sheet>
    )}
    {dressCodeVenue && (
      <VenueDressCodeModal
        open={!!dressCodeVenue}
        onOpenChange={(open) => !open && setDressCodeVenue(null)}
        place={place}
        venue={dressCodeVenue}
        onContinueCurrent={() => {
          const v = dressCodeVenue;
          setDressCodeVenue(null);
          setDestination({ place, label: v.name, route: `/place/${place.id}/${v.id}` });
        }}
      />
    )}
    </>
  );
}

// ---------------------------------------------------------------- about the place

const KIND_ICON: Record<Place["kind"], string> = { mall: "🛍️", "food-hall": "🍽️", hotel: "🏨", club: "🪩", attraction: "🎡", park: "🌳", residential: "🏢", home: "🏡" };
const KIND_NAME: Record<Place["kind"], string> = { mall: "Shopping mall", "food-hall": "Food hall", hotel: "Hotel", club: "Nightlife", attraction: "Attraction", park: "Park", residential: "Homes", home: "Homes" };

function kindLine(place: Place) {
  const open = place.venues.filter((v) => !v.comingSoon).length;
  if (place.venues.length <= 1) return place.venues[0]?.category ?? KIND_NAME[place.kind];
  const noun = place.kind === "hotel" ? "places inside" : place.kind === "food-hall" ? "kitchens" : place.kind === "mall" ? "stores" : "venues";
  return `${KIND_NAME[place.kind]} · ${open} ${noun}`;
}

/** What the place is, a link to share it, things to do there and who's there now. */
function PlaceIntro({ place, onPick }: { place: Place; onPick: (v: Venue) => void }) {
  const { citizen } = useCitizen();
  const present = usePresentCitizens();
  const now = useNow();
  const players = present.filter((p) => p.placeId === place.id && p.username !== citizen?.username);
  const locals = now ? [...new Map(place.venues.flatMap((v) => localsAt(place.id, v.id, now)).map((l) => [l.id, l])).values()] : [];
  // Things to do: each venue's activities (one venue: its own), at most ten, each once.
  const todo = [...new Map(place.venues.filter((v) => !v.comingSoon).flatMap((v) => (v.activities ?? []).map((a) => [a.label, { a, v }] as const))).values()].slice(0, 10);

  const share = async () => {
    const url = `${window.location.origin}/place/${place.id}`;
    const text = `Meet me at ${place.name} in Dubai Life`;
    if (navigator.share) { try { await navigator.share({ title: place.name, text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* clipboard blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Link copied. Paste it anywhere to share." }));
  };

  return (
    <>
      <div className="space-y-2">
        <p className="text-[17px] text-slate-500 leading-relaxed">{place.blurb}</p>
        <button onClick={share} className="flex items-center gap-2 text-[17px] font-semibold text-sky-600 hover:underline text-left"><Link2 className="w-5 h-5 shrink-0" /> Share a link to {place.name}</button>
      </div>
      {todo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {todo.map(({ a, v }) => <SheetChip key={a.label} onClick={() => onPick(v)}><span>{a.icon}</span>{a.label}</SheetChip>)}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-[15px] font-semibold text-slate-500">Here now</h3>
        {players.length + locals.length === 0 ? (
          <p className="text-sm text-slate-400">Nobody&apos;s here right now. Be the first, and share the link so friends can join you.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.slice(0, 8).map((p) => (
              <span key={p.username} className="inline-flex items-center gap-2 pl-1 pr-3.5 h-11 rounded-full bg-slate-100">
                <Face src={p.preset ? rosterThumb(p.preset) : null} online />
                <span className="font-semibold">@{p.username}</span>
              </span>
            ))}
            {locals.slice(0, Math.max(0, 8 - players.length)).map((l) => (
              <span key={l.id} className="inline-flex items-center gap-2 pl-1 pr-2 h-11 rounded-full bg-slate-100">
                <Face src={rosterThumb(presetFor(l.look))} />
                <span className="font-semibold">{l.name}</span>
                <span className="text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Local</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Face({ src, online }: { src: string | null; online?: boolean }) {
  return (
    <span className="relative w-9 h-9 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="w-9 h-9 rounded-full object-cover object-top bg-white" /> : <span className="block w-9 h-9 rounded-full bg-slate-300" />}
      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-100" />}
    </span>
  );
}

// ---------------------------------------------------------------- directory

function Directory({ place, onPick }: { place: Place; onPick: (v: Venue) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const categories = place.categories ?? [...new Set(place.venues.map((v) => v.category))];
  const results = place.venues.filter((v) => (!cat || v.category === cat) && (!q.trim() || `${v.name} ${v.category}`.toLowerCase().includes(q.trim().toLowerCase())));
  const noun = place.kind === "hotel" ? "facilities" : place.kind === "food-hall" ? "kitchens" : "stores";
  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${place.venues.length} ${noun}…`} className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />
      </div>
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <Chip active={!cat} onClick={() => setCat(null)}>All</Chip>
          {categories.filter((c) => place.venues.some((v) => v.category === c)).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</Chip>)}
        </div>
      )}
      {results.map((v) => (
        <button key={v.id} disabled={v.comingSoon} onClick={() => onPick(v)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-left disabled:opacity-60 disabled:hover:bg-slate-50">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: v.palette.accent === "#111111" ? "#334155" : v.palette.accent }}>{v.name.slice(0, 1)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm truncate">{v.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{v.category}{v.zone ? ` · ${v.zone}` : ""}</div>
          </div>
          {v.comingSoon ? <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">Coming soon</span> : <span className="text-xs font-black text-emerald-600">Visit ›</span>}
        </button>
      ))}
      {results.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No {noun} match “{q}”.</p>}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{children}</button>;
}

function SingleVenue({ venue, showBlurb, onGo }: { venue: Venue; showBlurb: boolean; onGo: () => void }) {
  return (
    <>
      {showBlurb && <p className="text-sm text-slate-600">{venue.blurb}</p>}
      <div className="space-y-1.5">
        {venue.products.slice(0, 4).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm"><span>{p.icon}</span><span className="flex-1 font-bold">{p.name}</span><span className="font-mono font-black text-emerald-600">{p.price ? aed(p.price) : "Free"}</span></div>
        ))}
      </div>
      <button onClick={onGo} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center gap-2"><DoorOpen className="w-4 h-4" /> Go to {venue.name}</button>
    </>
  );
}

// ---------------------------------------------------------------- flats

function FlatsDirectory({ place, onPick }: { place: Place; onPick: (f: FlatView) => void }) {
  const { citizen } = useCitizen();
  const [flats, setFlats] = useState<FlatView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "rent" | "sale">("all");
  const [selected, setSelected] = useState<FlatView | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    listFlats(place.id).then((f) => live && setFlats(f)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [place.id, reload]);

  if (error) return <p className="text-sm text-rose-600">Couldn&apos;t load the flats: {error}</p>;
  if (!flats) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (selected) {
    return <FlatDetail flat={selected} me={citizen?.id ?? null} onBack={() => setSelected(null)} onVisit={() => onPick(selected)} onChanged={(f) => { setSelected(f); setReload((r) => r + 1); }} />;
  }

  const shown = flats.filter((f) => filter === "all" || (filter === "rent" ? ["rent", "rent_or_sale"].includes(f.listing) : ["sale", "rent_or_sale"].includes(f.listing)));
  const forRent = flats.filter((f) => ["rent", "rent_or_sale"].includes(f.listing)).length;
  const forSale = flats.filter((f) => ["sale", "rent_or_sale"].includes(f.listing)).length;
  return (
    <>
      {flats.length > 1 && (
        <div className="flex gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All {flats.length}</Chip>
          <Chip active={filter === "rent"} onClick={() => setFilter("rent")}>For rent {forRent}</Chip>
          <Chip active={filter === "sale"} onClick={() => setFilter("sale")}>For sale {forSale}</Chip>
        </div>
      )}
      {shown.map((f) => {
        const mine = !!citizen && (f.owner_id === citizen.id || f.tenant_id === citizen.id);
        return (
          <button key={f.id} onClick={() => setSelected(f)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${mine ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:bg-slate-100"}`}>
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">{f.property_type === "Villa" || f.property_type === "Townhouse" ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}</span>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate">{flatTitle(f)}{mine ? " (yours)" : ""}</div>
              <div className="text-[11px] text-slate-500 truncate">{f.property_type} · {f.size_sqft.toLocaleString()} sq ft{f.view ? ` · ${f.view}` : ""}</div>
            </div>
            <ListingBadge f={f} />
          </button>
        );
      })}
      {shown.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Nothing matches that filter right now.</p>}
    </>
  );
}

function ListingBadge({ f }: { f: FlatView }) {
  if (f.listing === "rent" || f.listing === "rent_or_sale") return <span className="text-[10px] font-black bg-sky-100 text-sky-800 px-2 py-1 rounded-lg whitespace-nowrap">{aed(f.rent_price!)}/mo</span>;
  if (f.listing === "sale") return <span className="text-[10px] font-black bg-violet-100 text-violet-800 px-2 py-1 rounded-lg whitespace-nowrap">For sale</span>;
  return <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">{f.vacant ? "Not listed" : "Occupied"}</span>;
}

function FlatDetail({ flat, me, onBack, onVisit, onChanged }: { flat: FlatView; me: string | null; onBack: () => void; onVisit: () => void; onChanged: (f: FlatView) => void }) {
  const { citizen } = useCitizen();
  const [confirm, setConfirm] = useState<"rent" | "buy" | null>(null);
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mine = !!me && (flat.owner_id === me || flat.tenant_id === me);
  const canRent = ["rent", "rent_or_sale"].includes(flat.listing) && !mine;
  const canBuy = ["sale", "rent_or_sale"].includes(flat.listing) && flat.owner_id !== me;
  const balance = citizen?.balance ?? 0;
  const cost = confirm === "rent" ? (flat.rent_price ?? 0) * months : flat.sale_price ?? 0;

  const doIt = async () => {
    setBusy(true);
    setMessage(null);
    const res = confirm === "rent" ? await rentFlat(flat.id, months) : await buyFlat(flat.id);
    setBusy(false);
    if (!res.ok) return setMessage(res.error);
    gameAudio.playCoinSound();
    await refreshCitizen();
    setConfirm(null);
    setMessage(confirm === "rent" ? "🔑 Lease signed — it's your home now." : "🏠 Purchase complete — you own this home.");
    const fresh = (await listFlats(flat.building_id)).find((f) => f.id === flat.id);
    if (fresh) onChanged(fresh);
  };

  const status = mine ? (flat.owner_id === me ? "You own this home" : "You rent this home")
    : flat.residentName ? `Lived in by ${flat.residentName}${flat.tenant_npc || flat.tenant_id ? " (rented)" : ""}`
    : "Vacant";

  return (
    <>
      <button onClick={onBack} className="text-xs font-bold text-slate-500 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> All homes</button>
      <h3 className="font-black text-lg">{flatTitle(flat)}</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Fact k="Type" v={flat.property_type} />
        <Fact k="Size" v={`${flat.size_sqft.toLocaleString()} sq ft`} />
        {flat.floor ? <Fact k="Floor" v={String(flat.floor)} /> : null}
        {flat.view ? <Fact k="View" v={flat.view} /> : null}
        <Fact k="Status" v={status} />
        <Fact k="Visitors" v={flat.vacant ? "Open for viewings" : flat.access === "public" ? "Open house" : flat.access === "private" ? "Knock to enter" : flat.access === "friends" ? "Friends only" : "Invite only"} />
        {flat.listing !== "none" && flat.rent_price && ["rent", "rent_or_sale"].includes(flat.listing) ? <Fact k="Rent" v={`${aed(flat.rent_price)} / month · paid upfront`} /> : null}
        {flat.listing !== "none" && flat.sale_price && ["sale", "rent_or_sale"].includes(flat.listing) ? <Fact k="Price" v={aed(flat.sale_price)} /> : null}
      </dl>
      {message && <p className="text-sm font-bold text-slate-800 bg-slate-100 rounded-xl px-3 py-2">{message}</p>}

      {confirm ? (
        <div className="p-3 rounded-2xl border border-slate-200 space-y-2">
          <div className="font-black">{confirm === "rent" ? "Confirm lease" : "Confirm purchase"}</div>
          {confirm === "rent" && (
            <label className="flex items-center justify-between text-sm font-bold">Lease length
              <select value={months} onChange={(e) => setMonths(+e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2">
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
              </select>
            </label>
          )}
          <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-black">{aed(cost)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Paid with</span><span className="font-bold">virtual AED wallet</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Balance after</span><span className={`font-black ${balance - cost < 0 ? "text-rose-600" : ""}`}>{aed(balance - cost)}</span></div>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-sm">Cancel</button>
            <button disabled={busy || balance < cost} onClick={doIt} className="flex-1 py-2.5 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black text-sm">{busy ? "Processing…" : `Pay ${aed(cost)}`}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {mine && <button onClick={onVisit} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /> Go home</button>}
          {!mine && (
            <button onClick={onVisit} className="w-full py-3 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-2">
              <DoorOpen className="w-4 h-4" /> {flat.vacant ? "Go and view it" : flat.access === "public" ? "Visit" : "Go and knock"}
            </button>
          )}
          {canRent && <button onClick={() => setConfirm("rent")} className="w-full py-3 rounded-xl bg-sky-500 text-white font-black">Rent · {aed(flat.rent_price!)}/month</button>}
          {canBuy && <button onClick={() => setConfirm("buy")} className="w-full py-3 rounded-xl bg-violet-600 text-white font-black">Buy · {aed(flat.sale_price!)}</button>}
          {!canRent && !canBuy && !mine && <p className="text-xs text-slate-500 text-center">This home isn&apos;t on the market.</p>}
        </div>
      )}
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="p-2 rounded-xl bg-slate-50"><dt className="text-[10px] uppercase font-bold text-slate-400">{k}</dt><dd className="font-bold text-slate-900 leading-tight">{v}</dd></div>;
}

// ---------------------------------------------------------------- journey

function Journey({ destination, playerPos, travelling, onGo, gold, onGold, cars, licensed }: {
  destination: Destination; playerPos: { x: number; y: number }; travelling: TravelMode | null; onGo: (m: TravelMode) => void;
  gold: boolean; onGold: (g: boolean) => void; cars: Drivable[]; licensed: boolean | null;
}) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const to = entranceOf(destination.place.id) ?? playerPos;
  const metres = useMemo(() => distanceMetres(playerPos, to), [playerPos, to]);
  const here = metres < 40;
  const fare = taxiFare(metres);
  const instant = instantFare(metres);
  const plan = useMemo(() => metroPlan(playerPos, to), [playerPos, to]);
  const metroCost = plan ? (gold ? plan.gold : plan.silver) : 0;
  const dist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
  const metroMinutes = plan ? Math.round(walkMinutes(plan.walkTo) + plan.stops * 2.5 + 4 + walkMinutes(plan.walkFrom)) : 0;
  const km = metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres / 10) * 10} m`;

  if (travelling) {
    return (
      <div className="py-6 text-center space-y-2">
        <div className="text-4xl animate-bounce">{travelling === "taxi" ? "🚕" : travelling === "walk" ? "🚶" : "✨"}</div>
        <p className="font-black">{travelling === "taxi" ? "Your taxi is on the way…" : travelling === "walk" ? "Walking there…" : "Heading in…"}</p>
        <p className="text-xs text-slate-500">You&apos;ll arrive at the entrance of {destination.place.name}.</p>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-slate-600">{here ? `You're right outside ${destination.place.name}.` : `${destination.place.name} is ${km} away.`}</p>
      {here ? (
        <Option icon={<DoorOpen className="w-5 h-5" />} title="Walk in" note="You're at the entrance" onClick={() => onGo("walk")} primary />
      ) : (
        <>
          <Option icon={<Footprints className="w-5 h-5" />} title="Walk" note={`≈ ${walkMinutes(metres)} min · free`} onClick={() => onGo("walk")} primary={metres < 1200 && !cars.length} />
          {cars.length > 0 && (
            <Option
              icon={<span className="text-lg">🚗</span>}
              title={cars.length === 1 ? `Drive your ${cars[0].car.make} ${cars[0].car.model}` : "Drive your car"}
              note={`≈ ${taxiMinutes(metres)} min · you drive · ${cars[0].car.electric ? "⚡ battery" : "⛽ fuel"} ${Math.round(cars[0].fuel)}%${cars[0].fuel < fuelFor(cars[0].car, metres) + 1 ? ` (${cars[0].car.electric ? "charge" : "fill up"} on the way)` : ""}`}
              onClick={() => onGo("drive")}
              primary
            />
          )}
          {licensed === false && (
            // No license, no driving: the option is there but off, with the way to get one.
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-3 opacity-60">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200 text-lg">🚗</span>
                <div className="flex-1"><div className="font-black text-sm">Drive yourself</div><div className="text-[11px] text-slate-600">You need a UAE driving license to drive in Dubai</div></div>
                <span className="text-lg">🔒</span>
              </div>
              <button onClick={() => router.push("/driving")} className="w-full h-11 rounded-full bg-amber-500 text-white font-black text-sm">🪪 Go to driving school &amp; get your license</button>
            </div>
          )}
          <Option icon={<Car className="w-5 h-5" />} title="Dubai Taxi" note={`≈ ${taxiMinutes(metres)} min · ${aed(fare)} (12 minimum)`} onClick={() => onGo("taxi")} disabled={(citizen?.balance ?? 0) < fare} primary={metres >= 1200 && !cars.length} />
          {plan ? (
            <>
              <Option
                icon={<TrainFront className="w-5 h-5" />}
                title="Walk to the nearest metro + ride"
                note={`≈ ${metroMinutes} min · walk ${dist(plan.walkTo)} to ${plan.from.en} → ${plan.stops} stop${plan.stops > 1 ? "s" : ""} to ${plan.to.en} → walk ${dist(plan.walkFrom)} · ${aed(metroCost)}`}
                onClick={() => onGo("metro")}
                disabled={(citizen?.balance ?? 0) < metroCost}
              />
              <div className="flex gap-1.5 pl-14">
                {([false, true] as const).map((g) => (
                  <button key={String(g)} onClick={() => onGold(g)} className={`h-7 px-2.5 rounded-lg text-[11px] font-black ${gold === g ? (g ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-white") : "bg-slate-100 text-slate-600"}`}>
                    {g ? `🥇 Gold · ${aed(plan.gold)}` : `🥈 Silver · ${aed(plan.silver)}`}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
      {!here && (
        <Option icon={<Zap className="w-5 h-5" />} title="Go directly" note={`Arrive instantly · ${aed(instant)} premium`} onClick={() => onGo("direct")} disabled={(citizen?.balance ?? 0) < instant} />
      )}
    </>
  );
}

function Option({ icon, title, note, onClick, disabled, primary }: { icon: React.ReactNode; title: string; note: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left disabled:opacity-50 ${primary ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${primary ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"}`}>{icon}</span>
      <div className="flex-1"><div className="font-black text-sm">{title}</div><div className="text-[11px] text-slate-500">{note}</div></div>
    </button>
  );
}
