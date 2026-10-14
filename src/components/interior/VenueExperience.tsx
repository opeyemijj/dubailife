"use client";

// Inside a venue: the 3D room plus everything you can do there — browse each station, inspect and
// compare products, try accessories on, buy (with confirmation), talk to staff, apply for a job,
// work shifts and join activities.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Check, LogOut, Megaphone, MessageCircle, MessagesSquare, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import type { Place, Product, StationKind, Venue } from "@/lib/city/types";
import { adjustBalance, boostNeed, updateCitizen, useCitizen, type InventoryItem } from "@/lib/citizenStore";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import { gameAudio } from "@/utils/gameAudio";
import { InteriorScene, type DeliveryDef, type WalkTarget } from "./InteriorScene";
import { VenueRadio } from "./VenueRadio";
import { VenueAbout, VenueLoadingCard } from "./VenueOwnerLayer";
import { VenueWallAdModal } from "./VenueWallAdModal";
import { countVisit, useVenuePublic, venueKey, withOwnerContent } from "@/lib/venueContent";
import { befriend, sendMoney, useRoom, type Peer, type Received } from "@/lib/room";
import { PeerPanel, type SocialContext } from "@/components/social/PeerPanel";
import { SocialFeed } from "@/components/social/SocialFeed";
import { serveKindOf, type ServeKind, type ServedDef } from "./served";
import { SceneLoadingOverlay } from "@/components/GameLoadingScreen";
import { useLocalsInRoom } from "./localsInRoom";
import { claimGift, elsewhere, GIFT_AMOUNT, giftStatus, greeting, chatLine, inviteLine, rememberHop, takeHop, type Gathering, type GiftStatus, type Local } from "@/lib/locals";
import { approachPoint, buildPlan, seatsAt, servingSpot, toRoom, type StationDef } from "./layouts";

const SHIFT_COOLDOWN_MS = 10 * 60 * 1000;
const aed = (n: number) => (n === 0 ? "Free" : `AED ${n.toLocaleString()}`);

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
  | { kind: "local"; id: string }
  | null;

/** Something a Local offers without being asked: a gift, or to come along to another venue. */
type Offer = { local: Local; kind: "welcome" | "daily" } | { local: Local; kind: "invite"; to: Gathering; here: boolean };

const ANCHORS: StationKind[] = ["till", "reception", "menu", "counter", "bar", "tickets"];
/** Bottle-service hosts: the roster's two party looks. */
const HOSTS = ["Female_Party_01", "Female_Party_02"];
/** Drink colours by product, so an espresso martini doesn't look like a cosmopolitan. */
const TINT: Record<string, string> = { "espresso-martini": "#3b2416", "mocktail-club": "#a3e635", cocktail: "#f472b6", soft: "#dc2626", mocktail: "#fb923c" };
const SPARKLE_SECONDS = 14;
const BUBBLE_MS = 6000;
/** A fresh id for something bought or served. */
const uniqueId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function VenueExperience({ place, venue: baseVenue }: { place: Place; venue: Venue }) {
  // The venue as its verified owner has set it up (their items, description), if they have.
  const key = venueKey(place.id, baseVenue.id);
  const pub = useVenuePublic(key);
  const venue = useMemo(() => withOwnerContent(baseVenue, pub?.content), [baseVenue, pub?.content]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [wallAdOpen, setWallAdOpen] = useState(false);
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
  // My seat, when sitting at a table or booth.
  const [mySeat, setMySeat] = useState<{ table: string; index: number } | null>(null);
  const myTable = mySeat?.table ?? null;
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

  /** A seat at this table nobody else is in (keeps mine if I'm already there). */
  const freeSeat = (table: StationDef): number | null => {
    if (mySeat?.table === table.id) return mySeat.index;
    const seats = seatsAt(venue, table);
    const taken = (i: number) => {
      const [x, , z] = toRoom(table, [seats[i].local[0], 0, seats[i].local[1]]);
      return peersRef.current.some((p) => Math.hypot(p.x - x, p.z - z) < 0.45);
    };
    const i = seats.findIndex((_, n) => !taken(n));
    return i >= 0 ? i : null;
  };

  /** Walks to a free seat at a table or booth and sits. Returns the seat, or null if it's full. */
  const sitAt = (table: StationDef, opts: { then?: () => void } = {}): number | null => {
    const index = freeSeat(table);
    if (index === null) { say("That table is full."); return null; }
    const seat = seatsAt(venue, table)[index];
    setMySeat({ table: table.id, index });
    const [x, , z] = toRoom(table, [seat.local[0], 0, seat.local[1]]);
    walkThen([x, z], () => { setSeatLift(seat.lift); setPlayerAnimation("sit"); opts.then?.(); }, seat.facing);
    return index;
  };

  /** Opens the menu where food and drink are ordered (for someone already seated). */
  const openMenu = () => {
    const menu = plan.stations.find((s) => s.kind === "menu") ?? plan.stations.find((s) => s.id === anchorId);
    if (menu) { setActiveStation(menu.id); setPanel({ kind: "station", station: menu }); }
  };

  // ---------------------------------------------------------------- bottle service (seen by everyone)

  const [baller, setBaller] = useState<{ name: string; mine: boolean } | null>(null);
  const ownDeliveries = useRef(new Set<string>());

  /** Hosts carry sparkling bottles from the bar to a booth, with a banner naming who ordered. */
  const startBottleService = (station: StationDef, id: string, buyer: { username: string; mine: boolean }) => {
    const bar = plan.stations.find((s) => s.kind === "bar");
    const from = bar ? approachPoint(bar, 1.1) : plan.entrance;
    bottleSpots.current.set(id, HOSTS.map(() => nextSpot(station)));
    if (buyer.mine) ownDeliveries.current.add(id);
    setDeliveries((d) => [...d, {
      id,
      from,
      hosts: HOSTS.map((preset, i) => {
        const [x, , z] = toRoom(station, [i === 0 ? -0.42 : 0.42, 0, 1.75]);
        return { preset, stand: [x, z], face: station.rotation + Math.PI };
      }),
    }]);
    setBaller({ name: buyer.username, mine: buyer.mine });
    setTimeout(() => setBaller((b) => (b?.name === buyer.username ? null : b)), 9000);
  };

  /** The next free spot on a station's surface (at a table: in front of that seat), in room coordinates. */
  const nextSpot = (s: StationDef, seatIndex = 0) => {
    const key = `${s.id}:${seatIndex}`;
    const n = servedAt.current.get(key) ?? 0;
    servedAt.current.set(key, n + 1);
    return toRoom(s, servingSpot(venue, s, n, seatIndex));
  };

  /** Shows something served, here and for everyone else in the venue. */
  const placeServed = (def: ServedDef) => {
    setServed((list) => (list.some((x) => x.id === def.id) ? list : [...list, def].slice(-24)));
    emitRef.current?.({ type: "served", item: def });
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
    // Food goes to my table (the one I'm at, or the nearest with a free seat).
    const nearest = (list: StationDef[]) => list.slice().sort((a, b) => Math.hypot(a.position[0] - me.x, a.position[1] - me.z) - Math.hypot(b.position[0] - me.x, b.position[1] - me.z));
    const station = here.kind === "booth" ? here
      : toTable ? tables.find((t) => t.id === myTable) ?? nearest(tables).find((t) => freeSeat(t) !== null) ?? tables[0]
      : here;
    const id = uniqueId(product.id);
    const seatIndex = toTable ? (mySeat?.table === station.id ? mySeat.index : sitAt(station) ?? 0) : 0;

    if (kind === "bottle") {
      startBottleService(station, id, { username: citizen?.username ?? "you", mine: true });
      // Everyone in the club sees it arrive.
      emitRef.current?.({ type: "bottle", station: station.id });
      return;
    }
    const base = product.id.split(":").pop() ?? "";
    placeServed({ id, kind, position: nextSpot(station, seatIndex), rotation: station.rotation + Math.PI, tint: TINT[base] });
  };

  const onPlaced = useCallback((deliveryId: string, host: number) => {
    const spot = bottleSpots.current.get(deliveryId)?.[host];
    if (!spot) return;
    setServed((list) => [...list, { id: `${deliveryId}-${host}`, kind: "bottle" as const, position: spot, rotation: 0, sparkle: SPARKLE_SECONDS }].slice(-14));
    if (host === 0 && ownDeliveries.current.has(deliveryId)) {
      gameAudio.playCoinSound();
      boostNeed("social", 25);
      boostNeed("fun", 15);
      setToast("🍾 Your bottles have arrived — enjoy! · social +25 · fun +15");
      setTimeout(() => setToast((t) => (t?.startsWith("🍾 Your bottles") ? null : t)), 4000);
    }
  }, []);

  const onDeliveryDone = useCallback((deliveryId: string) => {
    bottleSpots.current.delete(deliveryId);
    ownDeliveries.current.delete(deliveryId);
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
  const me = { x: walkTo?.point[0] ?? spawn[0], z: walkTo?.point[1] ?? spawn[1], face: walkTo?.face, animation: playerAnimation, lift: playerAnimation === "sit" ? seatLift : 0 };
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

  // Tapping someone shows what you can do with them; you don't have to walk over.
  const openPeer = (p: Peer) => {
    gameAudio.playClickSound();
    setActiveStation(null);
    setPanel({ kind: "peer", userId: p.userId });
  };

  /** The nearest bar, table or counter to someone: where a drink bought for them is put down. */
  const surfaceNear = (x: number, z: number) => {
    const surfaces = plan.stations.filter((s) => ["bar", "booth", "menu", "counter", "till", "reception"].includes(s.kind));
    return surfaces.sort((a, b) => Math.hypot(a.position[0] - x, a.position[1] - z) - Math.hypot(b.position[0] - x, b.position[1] - z))[0];
  };

  const treatPeer = (p: Peer) => {
    if (!treat) return;
    const kind = serveKindOf(treat);
    if (!kind || !adjustBalance(-treat.price)) { say(`Not enough AED — you need ${aed(treat.price)}.`); return; }
    gameAudio.playCoinSound();
    const station = surfaceNear(p.x, p.z);
    // At a table it goes in front of their seat.
    let seatIndex = 0;
    if (station?.kind === "booth") {
      const seats = seatsAt(venue, station);
      seatIndex = seats.map((st, i) => [i, Math.hypot(...((([x, , z]) => [x - p.x, z - p.z])(toRoom(station, [st.local[0], 0, st.local[1]])) as [number, number]))] as const).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 0;
    }
    const position = station ? nextSpot(station, seatIndex) : ([p.x, 1.1, p.z] as [number, number, number]);
    const base = treat.id.split(":").pop() ?? "";
    const id = uniqueId("gift");
    placeServed({ id, kind, position, rotation: 0, tint: TINT[base] });
    emit({ type: "gift", gift: { name: treat.name, icon: treat.icon, serve: kind, position } }, p.userId);
    say(`${treat.icon} You bought @${p.username} a ${treat.name.toLowerCase()}`);
    setPanel(null);
  };

  // React to what others send me, as it arrives.
  const onRoomEvent = (e: Received) => {
    if (e.type === "chat") {
      bubble(e.from.userId, e.text);
      // A buzz on phones so a message isn't missed.
      try { navigator.vibrate?.(80); } catch { /* not supported */ }
    }
    if (e.type === "bottle") {
      const station = plan.stations.find((s) => s.id === e.station);
      if (station) startBottleService(station, e.id, { username: e.from.username, mine: false });
    }
    if (e.type === "served") {
      const item = e.item;
      setServed((list) => (list.some((x) => x.id === item.id) ? list : [...list, { ...item, kind: item.kind as ServeKind }].slice(-24)));
    }
    if (e.type === "accept" && e.kind === "table") say(`🪑 @${e.from.username} is coming to sit with you.`);
    if (e.type === "accept" && e.kind === "dance" && e.spot) {
      // Turn to face them and dance.
      const [sx, sz] = e.spot;
      walkThen([me.x, me.z], () => { setPlayerAnimation("dance"); boostNeed("fun", 10); }, Math.atan2(sx - me.x, sz - me.z));
    }
    if (e.type === "wave") bubble(e.from.userId, "👋");
    if (e.type === "money") gameAudio.playCoinSound();
    if (e.type === "gift") boostNeed("social", 10);
  };
  const room = useRoom(`venue:${place.id}/${venue.id}`, me, onRoomEvent);
  const { peers, events, emit, myId } = room;
  // Locals: Dubai Life's hosts, shown with a "Local" tag. They take seats too, so count them when finding one.
  const localsHere = useLocalsInRoom(place.id, venue, plan, [...peers, me]);
  const localPeers = localsHere.peers;
  const peersRef = useRef(peers);
  useEffect(() => { peersRef.current = [...peers, ...localPeers]; });
  // Lets earlier handlers (bottle service) broadcast once the room exists.
  const emitRef = useRef(emit);
  useEffect(() => { emitRef.current = emit; });
  const [clock, setClock] = useState(0);
  // Re-check "typing…" each second while a conversation is open.
  useEffect(() => {
    if (panel?.kind !== "peer") return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [panel?.kind]);

  const acceptInvite = (e: Received & { type: "invite" }) => {
    // Their table: take a free seat with them (in a restaurant, then order).
    const table = e.table ? plan.stations.find((s) => s.id === e.table) : undefined;
    if (e.kind === "table" && table) {
      const seat = sitAt(table, { then: () => { boostNeed("social", 8); if (venue.layout === "dining") openMenu(); } });
      if (seat !== null) emit({ type: "accept", kind: "table" }, e.from.userId);
      return;
    }
    // Dance: stand facing them, a step away, and both dance.
    if (e.kind === "dance") {
      const dx = me.x - e.from.x, dz = me.z - e.from.z;
      const d = Math.hypot(dx, dz) || 1;
      const spot: [number, number] = d < 0.01 ? [e.from.x, e.from.z + 0.9] : [e.from.x + (dx / d) * 0.9, e.from.z + (dz / d) * 0.9];
      emit({ type: "accept", kind: "dance", spot }, e.from.userId);
      walkThen(spot, () => { setPlayerAnimation("dance"); boostNeed("fun", 10); boostNeed("social", 6); }, Math.atan2(e.from.x - spot[0], e.from.z - spot[1]));
      return;
    }
    emit({ type: "accept", kind: e.kind }, e.from.userId);
    approach(e.from, () => boostNeed("social", 8));
  };

  // ---------------------------------------------------------------- Locals

  const [gifts, setGifts] = useState<GiftStatus | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [localChat, setLocalChat] = useState<Record<string, Array<{ mine: boolean; text: string }>>>({});
  const localTalk = (id: string, ...lines: Array<{ mine: boolean; text: string }>) =>
    setLocalChat((c) => ({ ...c, [id]: [...(c[id] ?? []), ...lines].slice(-20) }));
  const hasLocals = localsHere.locals.length > 0;

  // Followed a Local here: they pay you for coming. Then see which gifts are still to be had.
  useEffect(() => {
    let live = true;
    const hop = takeHop(key);
    (async () => {
      if (hop) {
        const error = await claimGift(hop, "hop", key);
        if (live && !error) {
          gameAudio.playCoinSound();
          setToast(`🎉 You made it! @${hop.username} sent you AED ${GIFT_AMOUNT.hop.toLocaleString()}`);
          setTimeout(() => setToast((t) => (t?.startsWith("🎉 You made it") ? null : t)), 4500);
        }
      }
      const status = await giftStatus();
      if (live) setGifts(status);
    })();
    return () => { live = false; };
  }, [key]);

  // Latest values for the timers below.
  const live = useRef({ locals: localsHere.locals, gifts, offer, panel, now: localsHere.now, username: citizen?.username ?? "" });
  useEffect(() => { live.current = { locals: localsHere.locals, gifts, offer, panel, now: localsHere.now, username: citizen?.username ?? "" }; });

  // On arrival a Local says hello and offers a gift; with nobody here, point to where they are.
  const greetReady = !!gifts && localsHere.now > 0;
  useEffect(() => {
    if (!greetReady) return;
    const t = setTimeout(() => {
      const { locals, gifts: g, now, username } = live.current;
      const first = locals[0];
      if (first) {
        bubble(first.id, greeting(first, username, venue.name));
        if (!g?.welcome || !g?.daily) setOffer({ local: first, kind: !g?.welcome ? "welcome" : "daily" });
      } else {
        const to = elsewhere(place.id, venue.id, now);
        if (to) setOffer({ local: to.locals[0], kind: "invite", to, here: false });
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [greetReady, bubble, place.id, venue.id, venue.name]);

  // Locals chat among themselves, and now and then invite you somewhere else.
  useEffect(() => {
    if (!hasLocals) return;
    let n = 0;
    const t = setInterval(() => {
      const { locals, gifts: g, offer: o, panel: p, now } = live.current;
      if (!locals.length) return;
      n++;
      const who = locals[n % locals.length];
      if (n % 4 === 0 && !o && !p && g && g.hops < 5) {
        const to = elsewhere(place.id, venue.id, now, who.id);
        if (to) {
          bubble(who.id, inviteLine(who, to.venue.name, n));
          setOffer({ local: who, kind: "invite", to, here: true });
          return;
        }
      }
      bubble(who.id, chatLine(who, n));
    }, 18000);
    return () => clearInterval(t);
  }, [hasLocals, bubble, place.id, venue.id]);

  const openLocal = (p: Peer) => {
    gameAudio.playClickSound();
    setActiveStation(null);
    setOffer(null);
    setPanel({ kind: "local", id: p.userId });
  };

  const takeGift = async (local: Local, kind: "welcome" | "daily") => {
    const error = await claimGift(local, kind);
    setOffer(null);
    if (!error) {
      gameAudio.playCoinSound();
      bubble(local.id, "Enjoy! 🥂");
      localTalk(local.id, { mine: false, text: `Here's AED ${GIFT_AMOUNT[kind].toLocaleString()} for you 🎁` });
      say(`💸 @${local.username} sent you AED ${GIFT_AMOUNT[kind].toLocaleString()}`);
      setGifts((g) => (g ? { ...g, [kind]: true } : g));
    } else if (error === "already") {
      setGifts(await giftStatus());
    } else {
      say(error);
    }
  };

  /** Goes with a Local to another venue (rewarded on arrival). */
  const goWith = (local: Local, to: Gathering) => {
    rememberHop(to.key, local.id);
    router.push(`/place/${to.place.id}/${to.venue.id}`);
  };

  const peerPanel = panel?.kind === "peer" ? peers.find((p) => p.userId === panel.userId) : undefined;
  const unreadHere = Object.values(room.unread).reduce((a, b) => a + b, 0);
  const [peopleOpen, setPeopleOpen] = useState(false);

  // ---------------------------------------------------------------- moving around

  /** Tapped a free spot on the floor: walk there (never on top of someone). */
  const onFloor = (pt: [number, number]) => {
    const [w, d] = plan.size;
    let x = Math.min(w / 2 - 0.5, Math.max(-w / 2 + 0.5, pt[0]));
    let z = Math.min(d / 2 - 0.4, Math.max(-d / 2 + 0.6, pt[1]));
    for (const p of [...peers, ...localPeers]) {
      const dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.65) {
        const push = (0.7 - dist) / (dist || 1);
        x += dist ? dx * push : 0.7;
        z += dist ? dz * push : 0;
      }
    }
    setPanel(null);
    setActiveStation(null);
    walkThen([x, z], () => {});
  };
  // Standing on the dance floor?
  const danceFloor = plan.stations.find((s) => s.kind === "dancefloor");
  const onDanceFloor = !!danceFloor && Math.abs(me.x - danceFloor.position[0]) < 2.6 && Math.abs(me.z - danceFloor.position[1]) < 2.6;

  // Phones: after the keyboard closes the page can be left scrolled; put it back.
  useEffect(() => {
    const reset = () => setTimeout(() => window.scrollTo(0, 0), 60);
    document.addEventListener("focusout", reset);
    return () => document.removeEventListener("focusout", reset);
  }, []);

  // ---------------------------------------------------------------- buying

  const buy = (product: Product) => {
    if (!citizen) return;
    if (product.price > 0 && !adjustBalance(-product.price)) {
      say(`Not enough AED — you need ${aed(product.price)}.`);
      return;
    }
    gameAudio.playCoinSound();
    const item: InventoryItem = {
      uid: uniqueId(product.id),
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
      say(`🎉 You're hired as ${job.role} at ${venue.name}! Wage AED ${job.wage} per shift.`);
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
    say(`Shift done: ${correct}/${job.shift.length} customers happy · earned AED ${pay}.`);
    setPanel(null);
  };

  // ---------------------------------------------------------------- activities

  const startActivity = (a: NonNullable<Venue["activities"]>[number], at?: StationDef) => {
    setPanel(null);
    // Sitting means going to the seat first, not sitting down on the spot.
    if (a.animation === "sit" && at && seatsAt(venue, at).length) sitAt(at);
    else setPlayerAnimation(a.animation ?? "idle");
    if (a.reward && !rewarded.has(a.id)) {
      adjustBalance(a.reward);
      setRewarded(new Set(rewarded).add(a.id));
      say(`${a.icon} ${a.label} — challenge complete! +AED ${a.reward}`);
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
            {a.reward ? <span className="text-[11px] font-black text-emerald-600">+AED {a.reward}</span> : null}
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
          <div className="flex justify-between"><dt className="text-slate-500">Paid with</dt><dd className="font-bold">virtual AED wallet</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Balance after</dt><dd className={`font-black ${after < 0 ? "text-rose-600" : "text-slate-900"}`}>AED {after.toLocaleString()}</dd></div>
        </dl>
        {after < 0 && <p className="text-xs font-bold text-rose-600">You don&apos;t have enough AED for this.</p>}
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
            🧑‍💼 Start my shift ({job.role}, AED {job.wage}){nextShiftIn > 0 ? ` — next shift in ${Math.ceil(nextShiftIn / 60000)} min` : ""}
          </button>
        )}
        {job && !worksHere && (
          <button onClick={() => setPanel({ kind: "interview", step: 0, score: 0 })} className="w-full text-left p-3 rounded-2xl border border-slate-200 text-sm font-bold">
            💼 Are you hiring? <span className="text-slate-500 font-normal">— {job.role}, AED {job.wage}/shift{citizen?.job ? ` (you'd leave ${citizen.job.storeName})` : ""}</span>
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
  } else if (panel?.kind === "local") {
    const lp = localPeers.find((p) => p.userId === panel.id);
    const local = localsHere.locals.find((l) => l.id === panel.id);
    if (lp && local) {
      const lines = localChat[local.id] ?? [];
      const to = elsewhere(place.id, venue.id, localsHere.now, local.id);
      const canHop = !!gifts && gifts.hops < 5;
      const reply = (mine: string, theirs: string) => { bubble("me", mine); bubble(local.id, theirs); localTalk(local.id, { mine: true, text: mine }, { mine: false, text: theirs }); };
      const chip = "p-3 rounded-2xl bg-slate-50 border border-slate-100 text-left text-sm font-black";
      sheet = (
        <Sheet onClose={closeAll} title={`@${local.username}`} subtitle="✨ Local · Dubai Life host">
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 rounded-xl p-2">Locals are Dubai Life&apos;s hosts, not real players. They show you around and hand out gifts.</p>
          {lines.length > 0 && (
            <div className="space-y-1.5">
              {lines.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${m.mine ? "ml-auto bg-sky-500 text-white" : "bg-amber-100 text-slate-900"}`}>{m.text}</div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => reply("Hey! 👋", greeting(local, citizen?.username ?? "", venue.name))} className={chip}>👋 Say hi</button>
            <button onClick={() => reply("What's good here?", chatLine(local, lines.length + 1))} className={chip}>💬 Chat</button>
            {to && <button onClick={() => reply("Where's everyone?", inviteLine(local, to.venue.name, lines.length))} className={chip}>🎉 Where&apos;s the party?</button>}
            {social === "club" && (
              <button onClick={() => { setPanel(null); approach(lp, () => { setPlayerAnimation("dance"); boostNeed("fun", 8); }); bubble(local.id, "Let's go! 💃"); }} className={chip}>💃 Dance together</button>
            )}
          </div>
          {gifts && !gifts.welcome && <button onClick={() => takeGift(local, "welcome")} className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black">🎁 Welcome gift · AED {GIFT_AMOUNT.welcome.toLocaleString()}</button>}
          {gifts && gifts.welcome && !gifts.daily && <button onClick={() => takeGift(local, "daily")} className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black">🎁 Today&apos;s gift · AED {GIFT_AMOUNT.daily.toLocaleString()}</button>}
          {gifts && gifts.welcome && gifts.daily && <p className="text-[11px] text-slate-500 text-center">You&apos;ve had today&apos;s gift. Come back tomorrow for another!</p>}
          {to && (
            <button onClick={() => goWith(local, to)} className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black">
              Go to {to.venue.name}{canHop ? ` · +AED ${GIFT_AMOUNT.hop.toLocaleString()}` : ""}
            </button>
          )}
        </Sheet>
      );
    } else {
      sheet = (
        <Sheet onClose={closeAll} title="They've moved on" subtitle="✨ Local">
          <p className="text-sm text-slate-500">This Local has gone somewhere else. Tap another one to say hi.</p>
        </Sheet>
      );
    }
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
    <main className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none font-sans bg-black text-slate-900 overscroll-none">
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
        locals={localPeers}
        onLocal={openLocal}
        onFloor={onFloor}
        onWallAdClick={() => setWallAdOpen(true)}
      />

      <SceneLoadingOverlay label={`Entering ${venue.name}`} />
      <VenueLoadingCard venueKey={key} venueName={venue.name} pub={pub} />
      {aboutOpen && pub && <VenueAbout venueName={venue.name} pub={pub} onClose={() => setAboutOpen(false)} />}
      <VenueWallAdModal venueId={venue.id} venueName={venue.name} open={wallAdOpen} onOpenChange={setWallAdOpen} />
      <VenueRadio venue={venue} compact={!!panel} />

      {/* Header */}
      <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 z-30 flex items-center gap-2 pointer-events-none">
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
        <div className="pointer-events-auto bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1.5 text-xs font-black font-mono shadow">AED {(citizen?.balance ?? 0).toLocaleString()}</div>
        <button onClick={() => setPanel({ kind: "bag" })} className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center" aria-label="Your bag"><ShoppingBag className="w-4 h-4" /></button>
        <button onClick={() => router.push(`/explore?at=${place.id}`)} className="pointer-events-auto h-10 px-3 rounded-full bg-slate-900 text-white shadow-lg flex items-center gap-1.5 text-xs font-black" aria-label="Exit to the city">
          <LogOut className="w-3.5 h-3.5" /> Exit
        </button>
      </header>

      {/* Quick actions */}
      {!panel && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-2 w-[min(96vw,560px)] pointer-events-auto">
          <button onClick={openStaff} className="h-11 px-4 rounded-full bg-white/95 shadow-xl text-xs font-black flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Talk to {venue.staff.role.toLowerCase()}</button>
          <button onClick={() => setWallAdOpen(true)} className="h-11 px-4 rounded-full bg-white/95 shadow-xl text-xs font-black flex items-center gap-1.5 text-slate-900 hover:bg-slate-50"><Megaphone className="w-4 h-4 text-amber-500" /> Wall Ad</button>
          {job && <button onClick={openStaff} className="h-11 px-4 rounded-full bg-white/95 shadow-xl text-xs font-black flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {worksHere ? "Work a shift" : "Jobs"}</button>}
          {onDanceFloor && playerAnimation !== "dance" && (
            <button onClick={() => { setPlayerAnimation("dance"); boostNeed("fun", 6); }} className="h-11 px-4 rounded-full bg-fuchsia-500 text-white shadow-xl text-xs font-black flex items-center gap-1.5">💃 Dance</button>
          )}
          {playerAnimation !== "idle" && <button onClick={() => setPlayerAnimation("idle")} className="h-11 px-4 rounded-full bg-amber-400 shadow-xl text-xs font-black flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Stop</button>}
          <button onClick={() => setPeopleOpen(true)} aria-label={`Chat${unreadHere ? `, ${unreadHere} unread` : ""}`}
            className={`relative h-11 w-11 shrink-0 rounded-full shadow-xl flex items-center justify-center ${unreadHere ? "bg-sky-500 text-white animate-pulse" : "bg-white/95"}`}>
            <MessagesSquare className="w-5 h-5" />
            {unreadHere > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">{unreadHere}</span>}
          </button>
        </div>
      )}

      {/* Who's here: open a chat with anyone in the venue */}
      {peopleOpen && (
        <Sheet onClose={() => setPeopleOpen(false)} title="People here" subtitle={peers.length ? `${peers.length} in ${venue.name}` : venue.name}>
          {peers.length === 0 && <p className="text-sm text-slate-500">No other players here right now. Invite a friend from your phone!</p>}
          {peers.map((p) => (
            <button key={p.userId} onClick={() => { setPeopleOpen(false); setPanel({ kind: "peer", userId: p.userId, startIn: "chat" }); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-left">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-white font-black flex items-center justify-center">{p.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 min-w-0"><span className="block font-black text-sm truncate">{p.name}</span><span className="block text-[11px] text-sky-600 font-bold">@{p.username}</span></span>
              {room.unread[p.userId] ? <span className="min-w-6 h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">{room.unread[p.userId]}</span> : <MessagesSquare className="w-4 h-4 text-slate-400" />}
            </button>
          ))}
          {localPeers.length > 0 && <p className="pt-2 text-[11px] font-black uppercase tracking-wide text-amber-600">Locals · Dubai Life hosts</p>}
          {localPeers.map((p) => (
            <button key={p.userId} onClick={() => { setPeopleOpen(false); openLocal(p); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100 text-left">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-slate-900 font-black flex items-center justify-center">✨</span>
              <span className="flex-1 min-w-0"><span className="block font-black text-sm truncate">{p.name}</span><span className="block text-[11px] text-amber-700 font-bold">@{p.username} · Local</span></span>
            </button>
          ))}
        </Sheet>
      )}

      {/* A Local's offer: a gift, or come along somewhere else */}
      {offer && !panel && (
        <div className="absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)] sm:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.75rem)] left-1/2 -translate-x-1/2 z-30 w-[min(92vw,400px)] pointer-events-auto">
          <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <span className="text-2xl">{offer.kind === "invite" ? "🎉" : "🎁"}</span>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-black text-sm leading-tight">
                {offer.kind === "invite"
                  ? offer.here ? `@${offer.local.username}: come to ${offer.to.venue.name}!` : `✨ ${offer.to.locals.length} Locals are at ${offer.to.venue.name}`
                  : `@${offer.local.username} wants to send you AED ${GIFT_AMOUNT[offer.kind].toLocaleString()}`}
              </div>
              <div className="opacity-80 font-bold">
                {offer.kind === "invite" ? (gifts && gifts.hops < 5 ? `Go now and get AED ${GIFT_AMOUNT.hop.toLocaleString()} when you arrive` : "Join them there") : offer.kind === "welcome" ? "A welcome gift from a Local" : "Your gift for today"}
              </div>
            </div>
            <button onClick={() => (offer.kind === "invite" ? goWith(offer.local, offer.to) : takeGift(offer.local, offer.kind))} className="px-3 py-2 rounded-xl bg-slate-950 text-white text-xs font-black shrink-0">
              {offer.kind === "invite" ? "Go" : "Accept"}
            </button>
            <button onClick={() => setOffer(null)} className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center shrink-0" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* Bottle service: everyone sees who's spending */}
      {baller && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[min(92vw,420px)]">
          <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 text-center px-4 py-3 shadow-2xl ring-4 ring-amber-300/50 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-2xl">🍾🎆🍾</div>
            <div className="font-black text-lg leading-tight">{baller.mine ? "You're the baller tonight!" : `@${baller.name} ordered bottle service!`}</div>
            <div className="text-xs font-bold opacity-80">{baller.mine ? "Bottles and sparklers are on their way to your booth" : "Big spender in the house 💸"}</div>
          </div>
        </div>
      )}
      {!panel && <p className="hidden sm:block absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-20 text-[11px] font-bold text-white/90 bg-black/40 rounded-full px-3 py-1 pointer-events-none whitespace-nowrap">Tap the floor to walk · tap a counter or person to interact · drag to look around</p>}

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
              say(`💸 Sent AED ${amount.toLocaleString()} to @${peerPanel.username}`);
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
          canInviteToTable={!!myTable && (venue.layout === "club" || venue.layout === "dining" || venue.layout === "lobby")}
          onInvite={(kind) => {
            emit({ type: "invite", kind, table: kind === "table" ? myTable ?? undefined : undefined }, peerPanel.userId);
            say(kind === "dance" ? `💃 Asked @${peerPanel.username} to dance` : kind === "table" ? `🪑 Invited @${peerPanel.username} to your table` : `🙌 Invited @${peerPanel.username} over`);
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
      {peers.length === 0 && localPeers.length > 0 && !panel && (
        <div className="absolute left-3 top-[124px] sm:top-20 z-30 bg-amber-400/95 text-slate-900 rounded-full px-3 py-1 text-[11px] font-black shadow-lg pointer-events-none">
          ✨ {localPeers.length} Locals here · tap one to say hi
        </div>
      )}
      {peers.length > 0 && !panel && (
        <div className="absolute left-3 top-[124px] sm:top-20 z-30 bg-sky-500/90 text-white rounded-full px-3 py-1 text-[11px] font-black shadow-lg pointer-events-none">
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
