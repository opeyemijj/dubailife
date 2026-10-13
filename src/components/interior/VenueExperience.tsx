"use client";

// Inside a venue: the 3D room plus everything you can do there — browse each station, inspect and
// compare products, try accessories on, buy (with confirmation), talk to staff, apply for a job,
// work shifts and join activities.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Check, LogOut, MessageCircle, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import type { Place, Product, StationKind, Venue } from "@/lib/city/types";
import { adjustBalance, boostNeed, updateCitizen, useCitizen, type InventoryItem } from "@/lib/citizenStore";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { gameAudio } from "@/utils/gameAudio";
import { InteriorScene, type DeliveryDef, type WalkTarget } from "./InteriorScene";
import { VenueRadio } from "./VenueRadio";
import { VenueAbout, VenueLoadingCard } from "./VenueOwnerLayer";
import { countVisit, useVenuePublic, venueKey, withOwnerContent } from "@/lib/venueContent";
import { befriend, sendMoney, useRoom, type Peer, type Received } from "@/lib/room";
import { PeerPanel, type SocialContext } from "@/components/social/PeerPanel";
import { SocialFeed } from "@/components/social/SocialFeed";
import { serveKindOf, type ServeKind, type ServedDef } from "./served";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import { approachPoint, buildPlan, seatAt, servingSpot, toRoom, type StationDef } from "./layouts";

const SHIFT_COOLDOWN_MS = 10 * 60 * 1000;
const aed = (n: number) => (n === 0 ? "Free" : `${n.toLocaleString()} D-Coins`);

type Panel =
  | { kind: "station"; station: StationDef }
  | { kind: "product"; product: Product; compareWith?: Product }
  | { kind: "confirm"; product: Product }
  | { kind: "staff" }
  | { kind: "search" }
  | { kind: "interview"; step: number; score: number }
  | { kind: "shift"; step: number; correct: number }
  | { kind: "bag" }
  | { kind: "peer"; userId: string; startIn?: "menu" | "chat" }
  | null;

const ANCHORS: StationKind[] = ["till", "reception", "menu", "counter", "bar", "tickets"];
/** Bottle-service hosts: the roster's two party looks. */
const HOSTS = ["Female_Party_01", "Female_Party_02"];
/** Drink colours by product, so an espresso martini doesn't look like a cosmopolitan. */
const TINT: Record<string, string> = { "espresso-martini": "#3b2416", "mocktail-club": "#a3e635", cocktail: "#f472b6", soft: "#dc2626", mocktail: "#fb923c" };
const SPARKLE_SECONDS = 14;
const BUBBLE_MS = 6000;

export function VenueExperience({ place, venue: baseVenue }: { place: Place; venue: Venue }) {
  // The venue as its verified owner has set it up (their items, description), if they have.
  const key = venueKey(place.id, baseVenue.id);
  const pub = useVenuePublic(key);
  const venue = useMemo(() => withOwnerContent(baseVenue, pub?.content), [baseVenue, pub?.content]);
  const [aboutOpen, setAboutOpen] = useState(false);
  useEffect(() => { countVisit(key); }, [key]);
  const router = useRouter();
  const { citizen } = useCitizen();
  const plan = useMemo(() => buildPlan(venue), [venue]);

  const [walkTo, setWalkTo] = useState<WalkTarget | null>(null);
  const [, setPending] = useState<{ key: number; open: () => void } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [playerAnimation, setPlayerAnimation] = useState<AvatarAnimation>("idle");
  const [tryOn, setTryOn] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rewarded, setRewarded] = useState<Set<string>>(new Set());
  // What's been served this visit, and bottle service on its way.
  const [served, setServed] = useState<ServedDef[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryDef[]>([]);
  const [myTable, setMyTable] = useState<string | null>(null);
  const [seatLift, setSeatLift] = useState(0);
  const servedAt = useRef(new Map<string, number>());
  const bottleSpots = useRef(new Map<string, Array<[number, number, number]>>());

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  };

  // Products sold at a station. The first pay point also sells anything without a station of its own.
  const stationKinds = useMemo(() => new Set(plan.stations.map((s) => s.kind)), [plan]);
  const anchorId = plan.stations.find((s) => ANCHORS.includes(s.kind))?.id;
  const productsAt = (s: StationDef) =>
    venue.products.filter((p) => p.station === s.kind || (s.id === anchorId && !stationKinds.has(p.station)));
  const activitiesAt = (s: StationDef) =>
    (venue.activities ?? []).filter((a) => (a.animation === "dance" ? "dancefloor" : a.animation === "sit" ? "booth" : "exhibit") === s.kind);

  // Accessories the citizen is wearing, plus anything being tried on.
  const inventory = useMemo(() => citizen?.inventory ?? [], [citizen?.inventory]);
  const worn = useMemo(() => {
    const ids = new Set(citizen?.worn ?? []);
    const kinds = inventory.filter((i) => ids.has(i.uid) && i.wearable).map((i) => i.wearable!);
    if (tryOn?.wearable) return [...kinds.filter((k) => k !== tryOn.wearable), tryOn.wearable];
    return kinds;
  }, [citizen?.worn, inventory, tryOn]);

  const walkThen = useCallback((point: [number, number], open: () => void, face?: number) => {
    const key = Date.now();
    setPlayerAnimation("idle");
    setWalkTo({ point, key, face });
    setPending({ key, open });
  }, []);

  const onArrive = useCallback((key: number) => {
    setPending((p) => {
      if (p && p.key === key) p.open();
      return null;
    });
  }, []);

  const openStation = (s: StationDef) => {
    gameAudio.playClickSound();
    setActiveStation(s.id);
    setPanel(null);
    walkThen(approachPoint(s, 0.85), () => setPanel({ kind: "station", station: s }));
  };

  const openStaff = () => {
    gameAudio.playClickSound();
    const [x, z] = plan.staff.position;
    const r = plan.staff.rotation;
    walkThen([x + Math.sin(r) * 1.9, z + Math.cos(r) * 1.9], () => { setNow(Date.now()); setPanel({ kind: "staff" }); });
  };

  // ---------------------------------------------------------------- serving

  /** Walks the citizen to their seat at a table or booth and sits them down. */
  const sitAt = (table: StationDef) => {
    const seat = seatAt(venue, table);
    if (!seat) return;
    setMyTable(table.id);
    const [x, , z] = toRoom(table, [seat.local[0], 0, seat.local[1]]);
    walkThen([x, z], () => { setSeatLift(seat.lift); setPlayerAnimation("sit"); }, seat.facing);
  };

  /** The next free spot on a station's surface, in room coordinates. */
  const nextSpot = (s: StationDef) => {
    const n = servedAt.current.get(s.id) ?? 0;
    servedAt.current.set(s.id, n + 1);
    return toRoom(s, servingSpot(venue, s, n));
  };

  /**
   * Puts what was bought where it belongs: drinks on the bar in front of you; food ordered at a
   * counter in a restaurant or café goes to your table; bottle service is brought to your booth.
   */
  const serve = (product: Product, kind: ServeKind) => {
    const here = plan.stations.find((s) => s.id === activeStation) ?? plan.stations.find((s) => s.id === anchorId);
    if (!here) return;
    const tables = plan.stations.filter((s) => s.kind === "booth");
    const toTable = here.kind === "booth" || (venue.layout === "dining" && here.kind !== "bar" && tables.length > 0);
    const station = here.kind === "booth" ? here : toTable ? tables.find((t) => t.id === myTable) ?? tables[0] : here;
    const id = `${product.id}-${Date.now().toString(36)}`;
    if (toTable) sitAt(station);

    if (kind === "bottle") {
      const bar = plan.stations.find((s) => s.kind === "bar");
      const from = bar ? approachPoint(bar, 1.1) : plan.entrance;
      bottleSpots.current.set(id, HOSTS.map(() => nextSpot(station)));
      setDeliveries((d) => [...d, {
        id,
        from,
        hosts: HOSTS.map((preset, i) => {
          const [x, , z] = toRoom(station, [i === 0 ? -0.42 : 0.42, 0, 1.75]);
          return { preset, stand: [x, z], face: station.rotation + Math.PI };
        }),
      }]);
      return;
    }
    const base = product.id.split(":").pop() ?? "";
    setServed((list) => [...list, { id, kind, position: nextSpot(station), rotation: station.rotation + Math.PI + (list.length % 3) * 0.5, tint: TINT[base] }].slice(-14));
  };

  const onPlaced = useCallback((deliveryId: string, host: number) => {
    const spot = bottleSpots.current.get(deliveryId)?.[host];
    if (!spot) return;
    setServed((list) => [...list, { id: `${deliveryId}-${host}`, kind: "bottle" as const, position: spot, rotation: 0, sparkle: SPARKLE_SECONDS }].slice(-14));
    if (host === 0) {
      gameAudio.playCoinSound();
      boostNeed("social", 25);
      boostNeed("fun", 15);
      setToast("🍾 Your bottles have arrived — enjoy! · social +25 · fun +15");
      setTimeout(() => setToast((t) => (t?.startsWith("🍾 Your bottles") ? null : t)), 4000);
    }
  }, []);

  const onDeliveryDone = useCallback((deliveryId: string) => {
    bottleSpots.current.delete(deliveryId);
    setDeliveries((d) => d.filter((x) => x.id !== deliveryId));
  }, []);

  // Counts toward "places visited" on the profile.
  useEffect(() => {
    const key = `${place.id}/${venue.id}`;
    updateCitizen((c) => (c.visited?.includes(key) ? c : { ...c, visited: [...(c.visited ?? []), key].slice(-500) }));
  }, [place.id, venue.id]);

  // ---------------------------------------------------------------- people nearby

  // Everyone comes in by the same door, so each citizen steps in at their own spot beside it.
  const spawn = useMemo<[number, number]>(() => {
    const id = citizen?.id ?? "";
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const slot = Math.abs(h) % 7;
    return [plan.entrance[0] + (slot - 3) * 0.8, plan.entrance[1] - (slot % 2) * 0.6];
  }, [citizen?.id, plan.entrance]);
  // What others see of me: where I'm standing or heading, and what I'm doing.
  const me = { x: walkTo?.point[0] ?? spawn[0], z: walkTo?.point[1] ?? spawn[1], face: walkTo?.face, animation: playerAnimation };
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const bubble = useCallback((who: string, text: string) => {
    setBubbles((b) => ({ ...b, [who]: text }));
    setTimeout(() => setBubbles((b) => {
      if (b[who] !== text) return b;
      const next = { ...b };
      delete next[who];
      return next;
    }), BUBBLE_MS);
  }, []);
  const social: SocialContext = venue.layout === "club" ? "club" : venue.layout === "dining" ? "dining" : "venue";
  // Something to buy for someone here: a cocktail at a club, the cheapest treat at a café.
  const treat = useMemo(() => {
    const served = venue.products.filter((p) => serveKindOf(p) && serveKindOf(p) !== "bottle");
    if (social === "club") return served.find((p) => serveKindOf(p) === "cocktail") ?? served[0] ?? null;
    return served.slice().sort((a, b) => a.price - b.price)[0] ?? null;
  }, [venue.products, social]);

  /** Walks up to someone (stopping a step short, facing them), then runs `then`. */
  const approach = (p: { x: number; z: number }, then: () => void) => {
    const dx = me.x - p.x, dz = me.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const stop: [number, number] = [p.x + (dx / d) * 1.1, p.z + (dz / d) * 1.1];
    walkThen(stop, then, Math.atan2(p.x - stop[0], p.z - stop[1]));
  };

  const openPeer = (p: Peer) => {
    gameAudio.playClickSound();
    setActiveStation(null);
    approach(p, () => setPanel({ kind: "peer", userId: p.userId }));
  };

  /** The nearest bar, table or counter to someone: where a drink bought for them is put down. */
  const surfaceNear = (x: number, z: number) => {
    const surfaces = plan.stations.filter((s) => ["bar", "booth", "menu", "counter", "till", "reception"].includes(s.kind));
    return surfaces.sort((a, b) => Math.hypot(a.position[0] - x, a.position[1] - z) - Math.hypot(b.position[0] - x, b.position[1] - z))[0];
  };

  const treatPeer = (p: Peer) => {
    if (!treat) return;
    const kind = serveKindOf(treat);
    if (!kind || !adjustBalance(-treat.price)) { say(`Not enough D-Coins — you need ${aed(treat.price)}.`); return; }
    gameAudio.playCoinSound();
    const station = surfaceNear(p.x, p.z);
    const position = station ? nextSpot(station) : ([p.x, 1.1, p.z] as [number, number, number]);
    const base = treat.id.split(":").pop() ?? "";
    setServed((list) => [...list, { id: `gift-${Date.now().toString(36)}`, kind, position, rotation: 0, tint: TINT[base] }].slice(-14));
    emit({ type: "gift", gift: { name: treat.name, icon: treat.icon, serve: kind, position } }, p.userId);
    say(`${treat.icon} You bought @${p.username} a ${treat.name.toLowerCase()}`);
    setPanel(null);
  };

  // React to what others send me, as it arrives.
  const onRoomEvent = (e: Received) => {
    if (e.type === "chat") bubble(e.from.userId, e.text);
    if (e.type === "wave") bubble(e.from.userId, "👋");
    if (e.type === "money") gameAudio.playCoinSound();
    if (e.type === "gift" && e.gift.position && e.gift.serve) {
      const gift = e.gift;
      boostNeed("social", 10);
      setServed((list) => [...list, { id: e.id, kind: gift.serve as ServeKind, position: gift.position!, rotation: 0 }].slice(-14));
    }
    if (e.type === "accept" && e.kind === "dance") { setPlayerAnimation("dance"); boostNeed("fun", 10); }
  };
  const room = useRoom(`venue:${place.id}/${venue.id}`, me, onRoomEvent);
  const { peers, events, emit, myId } = room;
  const [clock, setClock] = useState(0);
  // Re-check "typing…" each second while a conversation is open.
  useEffect(() => {
    if (panel?.kind !== "peer") return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [panel?.kind]);

  const acceptInvite = (e: Received & { type: "invite" }) => {
    emit({ type: "accept", kind: e.kind }, e.from.userId);
    approach(e.from, () => {
      if (e.kind === "dance") { setPlayerAnimation("dance"); boostNeed("fun", 10); }
      boostNeed("social", 8);
    });
  };

  const peerPanel = panel?.kind === "peer" ? peers.find((p) => p.userId === panel.userId) : undefined;

  // ---------------------------------------------------------------- buying

  const buy = (product: Product) => {
    if (!citizen) return;
    if (product.price > 0 && !adjustBalance(-product.price)) {
      say(`Not enough D-Coins — you need ${aed(product.price)}.`);
      return;
    }
    gameAudio.playCoinSound();
    const item: InventoryItem = {
      uid: `${product.id}-${Date.now().toString(36)}`,
      productId: product.id,
      storeId: venue.id,
      name: product.name,
      price: product.price,
      boughtAt: new Date().toISOString(),
      icon: product.icon,
      wearable: product.wearable,
      service: product.service,
    };
    const serveKind = serveKindOf(product);
    if (serveKind) serve(product, serveKind);
    if (serveKind === "bottle") {
      updateCitizen((c) => ({ ...c, inventory: [...(c.inventory ?? []), item] }));
      say("🍾 Bottle service is on its way to your table…");
    } else if (product.consumable) {
      boostNeed(product.consumable.need, product.consumable.amount);
      if (!serveKind) {
        setPlayerAnimation(venue.layout === "dining" ? "sit" : "clap");
        setTimeout(() => setPlayerAnimation("idle"), 3500);
      }
      say(`${product.icon} ${serveKind ? "Served" : "Enjoyed"}: ${product.name} · ${product.consumable.need} +${product.consumable.amount}`);
      if (product.service) updateCitizen((c) => ({ ...c, inventory: [...(c.inventory ?? []), item] }));
    } else {
      updateCitizen((c) => ({
        ...c,
        inventory: [...(c.inventory ?? []), item],
        // Wear an accessory straight away if it was being tried on.
        worn: product.wearable && tryOn?.id === product.id ? [...(c.worn ?? []), item.uid] : c.worn,
      }));
      say(product.service ? `✅ Booked: ${product.name}` : `🛍️ Bought ${product.name} — it's in your bag.`);
    }
    setTryOn(null);
    setPanel(null);
  };

  // ---------------------------------------------------------------- jobs

  const job = venue.job;
  const worksHere = citizen?.job?.storeId === venue.id;
  // Measured when the staff conversation opens.
  const [now, setNow] = useState(0);
  const nextShiftIn = citizen?.job?.lastShiftAt ? Math.max(0, new Date(citizen.job.lastShiftAt).getTime() + SHIFT_COOLDOWN_MS - now) : 0;

  const finishInterview = (score: number) => {
    if (!job) return;
    if (score >= 2) {
      updateCitizen((c) => ({ ...c, job: { storeId: venue.id, storeName: venue.name, role: job.role, wage: job.wage } }));
      gameAudio.playCoinSound();
      say(`🎉 You're hired as ${job.role} at ${venue.name}! Wage ${job.wage} D-Coins per shift.`);
    } else {
      say("Thanks for coming in — not this time. You can apply again later.");
    }
    setPanel(null);
  };

  const finishShift = (correct: number) => {
    if (!job || !citizen?.job) return;
    const pay = Math.round((job.wage * correct) / job.shift.length);
    if (pay > 0) adjustBalance(pay);
    updateCitizen((c) => (c.job ? { ...c, job: { ...c.job, lastShiftAt: new Date().toISOString() } } : c));
    boostNeed("energy", -15);
    gameAudio.playCoinSound();
    say(`Shift done: ${correct}/${job.shift.length} customers happy · earned ${pay} D-Coins.`);
    setPanel(null);
  };

  // ---------------------------------------------------------------- activities

  const startActivity = (a: NonNullable<Venue["activities"]>[number], at?: StationDef) => {
    setPanel(null);
    // Sitting means going to the seat first, not sitting down on the spot.
    if (a.animation === "sit" && at && seatAt(venue, at)) sitAt(at);
    else setPlayerAnimation(a.animation ?? "idle");
    if (a.reward && !rewarded.has(a.id)) {
      adjustBalance(a.reward);
      setRewarded(new Set(rewarded).add(a.id));
      say(`${a.icon} ${a.label} — challenge complete! +${a.reward} D-Coins`);
    } else {
      say(`${a.icon} ${a.label}`);
    }
    boostNeed("fun", 8);
    if (a.animation !== "dance" && a.animation !== "sit") setTimeout(() => setPlayerAnimation("idle"), 4000);
  };

  // ---------------------------------------------------------------- render helpers

  const closeAll = () => { setPanel(null); setTryOn(null); setActiveStation(null); };
  const rowProps = {
    tryingOn: tryOn?.id ?? null,
    onOpen: (p: Product) => setPanel({ kind: "product", product: p }),
    onTry: (p: Product) => setTryOn(tryOn?.id === p.id ? null : p),
    onBuy: (p: Product) => setPanel({ kind: "confirm", product: p }),
  };

  let sheet: React.ReactNode = null;
  if (panel?.kind === "station") {
    const s = panel.station;
    const products = productsAt(s);
    const activities = activitiesAt(s);
    const ownedWearables = inventory.filter((i) => i.wearable);
    sheet = (
      <Sheet onClose={closeAll} title={s.label} subtitle={venue.name}>
        {s.kind === "fitting" && (
          <>
            <p className="text-xs text-slate-500">Try accessories on your avatar here. Clothing comes with your citizen&apos;s outfit and can&apos;t be swapped on avatars yet — you can still buy it.</p>
            {venue.products.filter((p) => p.wearable).map((p) => <ProductRow key={p.id} p={p} {...rowProps} />)}
            {ownedWearables.length > 0 && <button onClick={() => setPanel({ kind: "bag" })} className="w-full py-2 rounded-xl bg-slate-100 text-xs font-black text-slate-700">Your accessories ({ownedWearables.length})</button>}
          </>
        )}
        {activities.map((a) => (
          <button key={a.id} onClick={() => startActivity(a, s)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-left">
            <span className="text-2xl">{a.icon}</span>
            <span className="flex-1 font-black text-sm text-slate-900">{a.label}</span>
            {a.reward ? <span className="text-[11px] font-black text-emerald-600">+{a.reward} D-Coins</span> : null}
          </button>
        ))}
        {s.kind === "booth" && venue.layout === "dining" && (
          <button onClick={() => { setPanel(null); sitAt(s); say("🪑 You take a seat. Order at the counter and it'll be brought to this table."); }} className="w-full p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-left font-black text-sm">🪑 Sit down</button>
        )}
        {s.kind !== "fitting" && products.map((p) => <ProductRow key={p.id} p={p} {...rowProps} />)}
        {s.kind !== "fitting" && products.length === 0 && activities.length === 0 && s.kind !== "booth" && <p className="text-xs text-slate-500">Nothing here right now.</p>}
      </Sheet>
    );
  } else if (panel?.kind === "product") {
    const p = panel.product;
    const comparable = p.specs ? venue.products.filter((x) => x.specs && x.id !== p.id) : [];
    const other = panel.compareWith;
    const keys = [...new Set([...Object.keys(p.specs ?? {}), ...Object.keys(other?.specs ?? {})])];
    sheet = (
      <Sheet onClose={closeAll} title={p.name} subtitle={`${venue.name} · ${aed(p.price)}`} onBack={() => setPanel(null)}>
        <div className="text-6xl text-center py-2">{p.icon}</div>
        <p className="text-sm text-slate-600">{p.desc}</p>
        {keys.length > 0 && (
          <table className="w-full text-xs">
            <thead><tr className="text-slate-400"><th className="text-left font-bold py-1">Spec</th><th className="text-left font-bold">{p.name}</th>{other && <th className="text-left font-bold">{other.name}</th>}</tr></thead>
            <tbody>{keys.map((k) => <tr key={k} className="border-t border-slate-100"><td className="py-1 font-bold text-slate-500">{k}</td><td className="font-bold text-slate-900">{p.specs?.[k] ?? "—"}</td>{other && <td className="font-bold text-slate-900">{other.specs?.[k] ?? "—"}</td>}</tr>)}
              {other && <tr className="border-t border-slate-100"><td className="py-1 font-bold text-slate-500">Price</td><td className="font-black text-emerald-600">{aed(p.price)}</td><td className="font-black text-emerald-600">{aed(other.price)}</td></tr>}
            </tbody>
          </table>
        )}
        {comparable.length > 0 && (
          <select value={other?.id ?? ""} onChange={(e) => setPanel({ kind: "product", product: p, compareWith: comparable.find((x) => x.id === e.target.value) })} className="w-full h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold px-2">
            <option value="">Compare with…</option>
            {comparable.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        <div className="flex gap-2 pt-1">
          {p.wearable && <button onClick={() => setTryOn(tryOn?.id === p.id ? null : p)} className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-900 text-sm font-black">{tryOn?.id === p.id ? "Take off" : "Try on"}</button>}
          <button onClick={() => setPanel({ kind: "confirm", product: p })} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black">{p.service ? "Book" : "Buy"} · {aed(p.price)}</button>
        </div>
      </Sheet>
    );
  } else if (panel?.kind === "confirm") {
    const p = panel.product;
    const after = (citizen?.balance ?? 0) - p.price;
    sheet = (
      <Sheet onClose={closeAll} title={p.service ? "Confirm booking" : "Confirm purchase"} onBack={() => setPanel({ kind: "product", product: p })}>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-3xl">{p.icon}</span>
          <div className="flex-1"><div className="font-black text-slate-900">{p.name}</div><div className="text-[11px] text-slate-500">{venue.name}</div></div>
        </div>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-black">{aed(p.price)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Paid with</dt><dd className="font-bold">D-Coins wallet</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Balance after</dt><dd className={`font-black ${after < 0 ? "text-rose-600" : "text-slate-900"}`}>{after.toLocaleString()} D-Coins</dd></div>
        </dl>
        {after < 0 && <p className="text-xs font-bold text-rose-600">You don&apos;t have enough D-Coins for this.</p>}
        <button disabled={after < 0} onClick={() => buy(p)} className="w-full py-3 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black">Confirm · {aed(p.price)}</button>
      </Sheet>
    );
  } else if (panel?.kind === "staff") {
    const featured = [...venue.products].filter((p) => !p.service).sort((a, b) => b.price - a.price)[Math.min(1, venue.products.length - 1)] ?? venue.products[0];
    sheet = (
      <Sheet onClose={closeAll} title={venue.staff.role} subtitle={venue.name}>
        <div className="p-3 rounded-2xl bg-slate-100 text-sm text-slate-700">“{venue.staff.greeting}”</div>
        {featured && <button onClick={() => setPanel({ kind: "product", product: featured })} className="w-full text-left p-3 rounded-2xl border border-slate-200 text-sm font-bold">✨ What do you recommend?</button>}
        <button onClick={() => setPanel({ kind: "search" })} className="w-full text-left p-3 rounded-2xl border border-slate-200 text-sm font-bold">🔎 Can you help me find something?</button>
        {job && worksHere && (
          <button disabled={nextShiftIn > 0} onClick={() => setPanel({ kind: "shift", step: 0, correct: 0 })} className="w-full text-left p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-bold disabled:opacity-60">
            🧑‍💼 Start my shift ({job.role}, {job.wage} D-Coins){nextShiftIn > 0 ? ` — next shift in ${Math.ceil(nextShiftIn / 60000)} min` : ""}
          </button>
        )}
        {job && !worksHere && (
          <button onClick={() => setPanel({ kind: "interview", step: 0, score: 0 })} className="w-full text-left p-3 rounded-2xl border border-slate-200 text-sm font-bold">
            💼 Are you hiring? <span className="text-slate-500 font-normal">— {job.role}, {job.wage} D-Coins/shift{citizen?.job ? ` (you'd leave ${citizen.job.storeName})` : ""}</span>
          </button>
        )}
        {!job && <p className="text-xs text-slate-500 px-1">No vacancies here at the moment.</p>}
        <button onClick={() => setPanel(null)} className="w-full p-2.5 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">👋 Thanks, bye</button>
      </Sheet>
    );
  } else if (panel?.kind === "search") {
    const q = query.trim().toLowerCase();
    const results = venue.products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    sheet = (
      <Sheet onClose={closeAll} title="Find something" subtitle={venue.name} onBack={() => setPanel({ kind: "staff" })}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this store…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />
        </div>
        {results.map((p) => <ProductRow key={p.id} p={p} {...rowProps} />)}
        {results.length === 0 && <p className="text-xs text-slate-500">Nothing matches “{query}”.</p>}
      </Sheet>
    );
  } else if (panel?.kind === "interview" && job) {
    const q = job.interview[panel.step];
    sheet = (
      <Sheet onClose={closeAll} title={`Interview · ${job.role}`} subtitle={`Question ${panel.step + 1} of ${job.interview.length}`} onBack={() => setPanel({ kind: "staff" })}>
        <p className="text-sm font-bold text-slate-900">{q.q}</p>
        {q.options.map((o, i) => (
          <button key={o} onClick={() => {
            const score = panel.score + (i === q.answer ? 1 : 0);
            if (panel.step + 1 < job.interview.length) setPanel({ kind: "interview", step: panel.step + 1, score });
            else finishInterview(score);
          }} className="w-full text-left p-3 rounded-2xl border border-slate-200 text-sm font-bold hover:bg-slate-50">{o}</button>
        ))}
      </Sheet>
    );
  } else if (panel?.kind === "shift" && job) {
    const task = job.shift[panel.step];
    const right = venue.products.find((p) => p.id === task.productId);
    const decoys = venue.products.filter((p) => p.id !== task.productId && !p.service).slice(0, 2);
    const options = right ? [right, ...decoys].sort((a, b) => a.name.localeCompare(b.name)) : decoys;
    sheet = (
      <Sheet onClose={closeAll} title={`Shift · ${job.role}`} subtitle={`Customer ${panel.step + 1} of ${job.shift.length}`}>
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm"><strong>{task.customer}:</strong> “I&apos;m looking for {task.wants}.”</div>
        {options.map((p) => (
          <button key={p.id} onClick={() => {
            const correct = panel.correct + (p.id === task.productId ? 1 : 0);
            say(p.id === task.productId ? "😊 Perfect choice!" : `🤔 They wanted ${right?.name}.`);
            if (panel.step + 1 < job.shift.length) setPanel({ kind: "shift", step: panel.step + 1, correct });
            else finishShift(correct);
          }} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 text-left text-sm font-bold hover:bg-slate-50">
            <span className="text-xl">{p.icon}</span>{p.name}
          </button>
        ))}
      </Sheet>
    );
  } else if (panel?.kind === "bag") {
    const wornIds = new Set(citizen?.worn ?? []);
    sheet = (
      <Sheet onClose={closeAll} title="Your bag" subtitle={`${inventory.length} item${inventory.length === 1 ? "" : "s"}`}>
        {inventory.length === 0 && <p className="text-xs text-slate-500">Things you buy around the city appear here.</p>}
        {[...inventory].reverse().map((i) => (
          <div key={i.uid} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-2xl w-9 text-center">{i.icon ?? "🛍️"}</span>
            <div className="flex-1 min-w-0"><div className="font-black text-sm truncate">{i.name}</div><div className="text-[11px] text-slate-500">{i.service ? "Booking" : "Item"} · {aed(i.price)}</div></div>
            {i.wearable && (
              <button onClick={() => updateCitizen((c) => ({ ...c, worn: wornIds.has(i.uid) ? (c.worn ?? []).filter((x) => x !== i.uid) : [...(c.worn ?? []).filter((x) => (c.inventory ?? []).find((y) => y.uid === x)?.wearable !== i.wearable), i.uid] }))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${wornIds.has(i.uid) ? "bg-amber-400 text-slate-900" : "bg-white border border-slate-200"}`}>
                {wornIds.has(i.uid) ? "Wearing ✓" : "Wear"}
              </button>
            )}
          </div>
        ))}
      </Sheet>
    );
  }

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden select-none font-sans bg-black text-slate-900">
      <InteriorScene
        venue={venue}
        plan={plan}
        look={citizen?.look}
        worn={worn}
        playerAnimation={playerAnimation}
        playerLift={playerAnimation === "sit" ? seatLift : 0}
        start={spawn}
        walkTo={walkTo}
        onArrive={onArrive}
        onStation={openStation}
        onStaff={openStaff}
        staffAnimation={panel?.kind === "staff" || panel?.kind === "interview" ? "talk" : "idle"}
        highlight={activeStation}
        served={served}
        deliveries={deliveries}
        onPlaced={onPlaced}
        onDeliveryDone={onDeliveryDone}
        peers={peers}
        peerBadges={room.unread}
        bubbles={bubbles}
        onPeer={openPeer}
      />

      <SceneLoadingOverlay label={`Entering ${venue.name}`} />
      <VenueLoadingCard venueKey={key} venueName={venue.name} pub={pub} />
      {aboutOpen && pub && <VenueAbout venueName={venue.name} pub={pub} onClose={() => setAboutOpen(false)} />}
      <VenueRadio venue={venue} compact={!!panel} />

      {/* Header */}
      <header className="absolute top-3 inset-x-3 z-30 flex items-center gap-2 pointer-events-none">
        <button onClick={() => router.push(place.venues.length > 1 ? `/explore?open=${place.id}` : `/explore?at=${place.id}`)} className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center" aria-label={place.venues.length > 1 ? `Back to ${place.name} directory` : "Leave"}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="pointer-events-auto bg-white/95 rounded-2xl shadow-lg px-3 py-1.5 min-w-0">
          <div className="font-black text-sm text-slate-900 truncate flex items-center gap-1">
            {venue.name}
            {pub?.claimed && <button onClick={() => setAboutOpen(true)} className="text-[10px] font-black text-sky-600 bg-sky-50 rounded-full px-1.5 py-0.5" aria-label="About this verified business">✓ Verified · About</button>}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{venue.category}{venue.zone ? ` · ${venue.zone}` : ""} · {place.name}</div>
        </div>
        <div className="flex-1" />
        <div className="pointer-events-auto bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1.5 text-xs font-black font-mono shadow">{(citizen?.balance ?? 0).toLocaleString()} D-Coins</div>
        <button onClick={() => setPanel({ kind: "bag" })} className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center" aria-label="Your bag"><ShoppingBag className="w-4 h-4" /></button>
        <button onClick={() => router.push(`/explore?at=${place.id}`)} className="pointer-events-auto h-10 px-3 rounded-full bg-slate-900 text-white shadow-lg flex items-center gap-1.5 text-xs font-black" aria-label="Exit to the city">
          <LogOut className="w-3.5 h-3.5" /> Exit
        </button>
      </header>

      {/* Quick actions */}
      {!panel && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 pointer-events-auto">
          <button onClick={openStaff} className="h-11 px-4 rounded-full bg-white/95 shadow-xl text-xs font-black flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Talk to {venue.staff.role.toLowerCase()}</button>
          {job && <button onClick={openStaff} className="h-11 px-4 rounded-full bg-white/95 shadow-xl text-xs font-black flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {worksHere ? "Work a shift" : "Jobs"}</button>}
          {playerAnimation !== "idle" && <button onClick={() => setPlayerAnimation("idle")} className="h-11 px-4 rounded-full bg-amber-400 shadow-xl text-xs font-black flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Stop</button>}
        </div>
      )}
      {!panel && <p className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-20 text-[11px] font-bold text-white/90 bg-black/40 rounded-full px-3 py-1 pointer-events-none">Tap a display, counter or person to interact · drag to look around</p>}

      {sheet}
      {peerPanel && (
        <PeerPanel
          key={peerPanel.userId}
          peer={peerPanel}
          context={social}
          balance={citizen?.balance ?? 0}
          treat={treat}
          onClose={() => setPanel(null)}
          messages={room.messages.filter((m) => m.with === peerPanel.userId)}
          typing={room.isTyping(peerPanel.userId, clock)}
          onTyping={() => room.typingTo(peerPanel.userId)}
          onThread={(open) => room.openThread(open ? peerPanel.userId : null)}
          startIn={panel?.kind === "peer" ? panel.startIn : undefined}
          unread={room.unread[peerPanel.userId] ?? 0}
          onChat={(text) => { room.say(peerPanel.userId, text, venue.name); bubble("me", text); }}
          onSendMoney={async (amount) => {
            const error = await sendMoney(peerPanel, amount, venue.name);
            if (!error) {
              emit({ type: "money", amount }, peerPanel.userId);
              gameAudio.playCoinSound();
              say(`💸 Sent ${amount.toLocaleString()} D-Coins to @${peerPanel.username}`);
            }
            return error;
          }}
          onWave={() => {
            setPlayerAnimation("wave");
            setTimeout(() => setPlayerAnimation((a) => (a === "wave" ? "idle" : a)), 2500);
            emit({ type: "wave" }, peerPanel.userId);
            bubble("me", "👋");
            setPanel(null);
          }}
          onInvite={(kind) => {
            emit({ type: "invite", kind }, peerPanel.userId);
            say(kind === "dance" ? `💃 Asked @${peerPanel.username} to dance` : `🙌 Invited @${peerPanel.username} over`);
            setPanel(null);
          }}
          onTreat={() => treatPeer(peerPanel)}
          onFriend={async () => {
            if (!myId) return "Log in to add friends.";
            const r = await befriend(myId, peerPanel);
            if (r === "sent") emit({ type: "friend" }, peerPanel.userId);
            return r === "friends" ? `You and @${peerPanel.username} are now friends 🤝` : r === "sent" ? "Friend request sent" : "Couldn't send the request — try again.";
          }}
        />
      )}
      <SocialFeed
        events={events}
        readingWith={panel?.kind === "peer" ? panel.userId : null}
        onReply={(e) => { const p = peers.find((x) => x.userId === e.from.userId); if (p) setPanel({ kind: "peer", userId: p.userId, startIn: "chat" }); }}
        onAccept={acceptInvite}
        onFriend={async (e) => { if (myId) { const r = await befriend(myId, e.from); say(r === "friends" ? `🤝 You and @${e.from.username} are now friends` : "Couldn't add them — try again."); } }}
      />
      {peers.length > 0 && !panel && (
        <div className="absolute left-3 top-[68px] sm:top-20 z-30 bg-sky-500/90 text-white rounded-full px-3 py-1 text-[11px] font-black shadow-lg pointer-events-none">
          👥 {peers.length} {peers.length === 1 ? "person" : "people"} here · tap them to say hi
        </div>
      )}

      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}
    </main>
  );
}

function ProductRow({ p, tryingOn, onOpen, onTry, onBuy }: { p: Product; tryingOn: string | null; onOpen: (p: Product) => void; onTry: (p: Product) => void; onBuy: (p: Product) => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
      <span className="text-2xl w-9 text-center">{p.icon}</span>
      <button onClick={() => onOpen(p)} className="flex-1 min-w-0 text-left">
        <div className="font-black text-sm text-slate-900 truncate">{p.name}</div>
        <div className="text-[11px] text-slate-500 truncate">{p.desc}</div>
        <div className="text-xs font-mono font-black text-emerald-600">{aed(p.price)}</div>
      </button>
      <div className="flex flex-col gap-1">
        {p.wearable && (
          <button onClick={() => onTry(p)} className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${tryingOn === p.id ? "bg-amber-400 text-slate-900" : "bg-white border border-slate-200 text-slate-700"}`}>
            {tryingOn === p.id ? "Take off" : "Try on"}
          </button>
        )}
        <button onClick={() => onBuy(p)} className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black">
          {p.service ? (p.price ? "Book" : "Request") : "Buy"}
        </button>
      </div>
    </div>
  );
}

function Sheet({ title, subtitle, children, onBack, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-20 sm:bottom-4 sm:w-[380px] z-40 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl sm:rounded-3xl rounded-t-3xl shadow-2xl border border-white max-h-[62vh] sm:max-h-full flex flex-col">
        <div className="flex items-start gap-2 p-4 pb-2">
          {onBack && <button onClick={onBack} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto px-4 pb-4 space-y-2">{children}</div>
      </div>
    </div>
  );
}
