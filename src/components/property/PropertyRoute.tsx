"use client";

// A flat or home: travel there, get through the door (access rules / knocking), then see the saved
// interior. Residents and editors can furnish it; owners manage access, guests and listings.

import { MoveStick } from "@/components/street/StreetWorld";
import { isDirty } from "@/components/avatar/Flies";
import { InviteHere } from "@/components/invite/InviteHere";
import { BottomNav } from "@/components/layout/BottomNav";
import { BELOW_SPACE_TOP, PartyBanner, usePartyHere } from "@/components/invite/PartyHere";
import { PartyActions } from "@/components/invite/PartyActions";
import { usePartyBoard } from "@/components/party/usePartyBoard";
import { drinkInHand, PartyHostesses, usePartyDrink, type HostessRun } from "@/components/invite/PartyHostess";
import { faceNearest, PARTIES, partyMood } from "@/lib/invites";
import { askForPush } from "@/lib/push/engage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DoorClosed, Eye, EyeOff, KeyRound, Loader2, LogOut, Menu, Settings2, ShoppingBag, Smartphone, UserPlus, X, Shirt } from "lucide-react";
import { useCleanScreen } from "@/lib/cleanScreen";
import { FloatMenu, SideBar, SideButton, SidePopover, ViewCycle } from "@/components/layout/SideBar";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { useUnreadTotal } from "@/lib/unread";
import { ApartmentRoom, type PlacingState } from "@/components/home/ApartmentRoom";
import { CATALOG, getCatalogItem, housingTierFor, withHomeItems, HOUSING_CONFIGS, type CatalogItem, type OwnedFurniture, type Placement, type Rotation, type HousingTier, type HomeStyle } from "@/lib/furniture";
import { adjustBalance, useCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { getEntity } from "@/lib/city/geo";
import { isGenericHome, towerName } from "@/lib/city/partyHome";
import { TowerArrival } from "./TowerArrival";
import { HomeLookSheet } from "@/components/home/HomeLookSheet";
import { FixtureProgress, FixtureSheet, completeFixtureAction } from "@/components/home/FixtureSheet";
import type { Fixture, FixtureAction } from "@/lib/homeFixtures";
import {
  ACCESS_LABEL, addGuest, flatRoute, flatTitle, getFlat, getInterior, listFlat, listGuests, removeGuest, requestEntry, saveInteriorFull, setAccess, watchRequest,
  type Access, type FlatView, type Listing, myFlats,
} from "@/lib/city/flats";
import { ROSTER, presetFor, rosterThumb } from "@/components/avatar/roster";
import { openLife } from "@/components/life/LifeHub";
import { gameAudio } from "@/utils/gameAudio";
import { befriend, sendMoney, useRoom, type Received } from "@/lib/room";
import { PeerPanel } from "@/components/social/PeerPanel";
import { SocialFeed } from "@/components/social/SocialFeed";
import type { Person } from "@/components/home/ApartmentRoom";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { WardrobeModal } from "@/components/avatar/WardrobeModal";
import { DecorationCatalogue } from "@/components/home/DecorationCatalogue";
import { myHousehold, type SharedHome } from "@/lib/love";
import { getFlatParkedCar, carOf, type ParkedCarView, type Drivable, useGarage } from "@/lib/cars";
import { VehicleTheftModal } from "@/components/cars/VehicleTheftModal";
import { DriveSheet } from "@/components/home/DriveSheet";
import { DriveJourney } from "@/components/cars/DriveJourney";
import { ModalPortal } from "@/components/ui/modal-portal";

/** Unique id for a newly bought piece of furniture. */
const newUid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

type Door = { state: "checking" } | { state: "closed"; reason: string } | { state: "knocking"; requestId: string } | { state: "denied" } | { state: "open"; canEdit: boolean; reason: string };

export function PropertyRoute({ buildingId, unit }: { buildingId: string; unit: string }) {
  const router = useRouter();
  const { citizen, hydrated } = useRequireCitizen();
  const flatId = `${buildingId}:${unit}`;
  // Homes off the map ("home-al-barsha") have a generic address and no building on the map: you're there as soon as
  // you open the link (see lib/city/partyHome.ts).
  const generic = isGenericHome(buildingId);
  const building = useMemo(() => getEntity(buildingId) ?? (generic ? { name: towerName(buildingId) } : undefined), [buildingId, generic]);
  const [flat, setFlat] = useState<FlatView | null | undefined>(undefined);
  const [door, setDoor] = useState<Door>({ state: "checking" });
  const [furniture, setFurniture] = useState<OwnedFurniture[]>([]);
  // The home's look (floor, walls, panels, bedding), saved with its furniture: one version for everyone here.
  const [style, setStyle] = useState<Partial<HomeStyle> | null>(null);
  // A flat in a tower off the map: you come in through the lobby and take the lift up first (once per visit).
  const [upstairs, setUpstairs] = useState(false);

  const load = useCallback(async () => {
    const f = await getFlat(flatId);
    setFlat(f);
    if (!f) return;
    const res = await getInterior(flatId);
    if (res.ok) {
      setFurniture(res.data.interior?.furniture ?? []);
      setStyle(res.data.interior?.style ?? null);
      let canEdit = res.data.can_edit;
      if (!canEdit) {
        try {
          const hh = await myHousehold();
          if (hh.some((h) => h.flat === flatId)) {
            canEdit = true;
          }
        } catch {
          /* ignore */
        }
      }
      setDoor({ state: "open", canEdit, reason: canEdit ? "resident" : res.data.reason });
    } else {
      setDoor({ state: "closed", reason: res.error.replace(/^access_denied:/, "") });
    }
  }, [flatId]);

  const atBuilding = generic || citizen?.location?.placeId === buildingId;
  // Fetches the flat once the citizen has arrived; state is set when the request resolves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hydrated && citizen && atBuilding) void load();
  }, [hydrated, citizen?.id, atBuilding, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hydrated && citizen && building && !atBuilding && !generic) router.replace(`/explore?open=${buildingId}`);
  }, [hydrated, citizen, building, atBuilding, buildingId, router, generic]);

  if (!hydrated || !citizen) return <Blank />;
  if (!building) return <Card><h1 className="text-xl font-black">This home doesn&apos;t exist</h1><Link href="/explore" className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">Back to the city</Link></Card>;

  // Not there yet: the effect above opens the building's description on the map.
  if (!atBuilding) return <Blank spinner />;

  if (flat === undefined || door.state === "checking") return <Blank spinner />;
  if (generic && flat && !upstairs) {
    return <TowerArrival floor={flat.floor ?? 12} unit={flat.unit} tower={building.name ?? "Residences"} look={citizen.look} onDone={() => setUpstairs(true)} />;
  }
  if (flat === null) return <Card><h1 className="text-xl font-black">That home isn&apos;t in this building</h1><Link href={`/explore?open=${buildingId}`} className="mt-4 inline-block px-4 py-2 rounded-xl bg-emerald-500 text-white font-black">See the homes here</Link></Card>;

  if (door.state !== "open") {
    return <DoorStep flat={flat} door={door} setDoor={setDoor} onEnter={load} buildingName={building.name ?? ""} />;
  }

  return (
    <Inside
      flat={flat}
      me={citizen.id}
      canEdit={door.canEdit}
      reason={door.reason}
      furniture={furniture}
      setFurniture={setFurniture}
      look={citizen.look}
      lookOfHome={style}
      setLookOfHome={setStyle}
      onExit={() => router.push(generic ? "/explore" : `/explore?at=${buildingId}`)}
      onChanged={load}
    />
  );
}

// ---------------------------------------------------------------- the door

function DoorStep({ flat, door, setDoor, onEnter, buildingName }: { flat: FlatView; door: Door; setDoor: (d: Door) => void; onEnter: () => void; buildingName: string }) {
  const [error, setError] = useState<string | null>(null);
  const resident = flat.residentName ?? "the resident";

  const { citizen: visitor } = useCitizen();
  useEffect(() => {
    if (door.state !== "knocking" || !visitor?.id) return;
    return watchRequest(visitor.id, door.requestId, (status) => {
      if (status === "approved") onEnter();
      else if (status === "denied") setDoor({ state: "denied" });
    });
  }, [door, onEnter, setDoor, visitor?.id]);

  const knock = async () => {
    setError(null);
    gameAudio.playClickSound();
    const res = await requestEntry(flat.id);
    if (!res.ok) return setError(res.error);
    if (res.data.status === "approved") onEnter();
    else if (res.data.status === "denied") setDoor({ state: "denied" });
    else {
      setDoor({ state: "knocking", requestId: res.data.id });
      setTimeout(() => askForPush({ icon: "🚪", title: `You knocked on ${resident}'s door`, text: "Turn on notifications to know the moment they let you in, even if you leave this screen." }), 1500);
    }
  };

  const reason = door.state === "closed" ? door.reason : null;
  return (
    <Card>
      <DoorClosed className="w-10 h-10 text-slate-700 mx-auto" />
      <h1 className="text-lg font-black mt-2">{flatTitle(flat)}</h1>
      <p className="text-xs text-slate-500">{buildingName}</p>
      <div className="mt-4 space-y-2">
        {door.state === "knocking" ? (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> You knocked. Waiting for {resident} to answer…
          </div>
        ) : door.state === "denied" ? (
          <p className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700">{resident} isn&apos;t taking visitors right now.</p>
        ) : reason === "friends" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">This home is for {resident}&apos;s friends only.</p>
        ) : reason === "invite" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">Only guests {resident} has invited can come in.</p>
        ) : reason === "not_listed" ? (
          <p className="p-3 rounded-2xl bg-slate-100 text-sm font-bold">This home is empty and not open for viewings.</p>
        ) : (
          <button onClick={knock} className="w-full py-3 rounded-xl bg-slate-900 text-white font-black">✊ Knock on the door</button>
        )}
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <Link href={isGenericHome(flat.building_id) ? "/explore" : `/explore?open=${flat.building_id}`} className="block w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">{isGenericHome(flat.building_id) ? "Back to the city" : "Back to the building"}</Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- inside

function Inside({ flat, me, canEdit, reason, furniture, setFurniture, look, onExit, onChanged, lookOfHome, setLookOfHome }: {
  flat: FlatView; me: string; canEdit: boolean; reason: string; furniture: OwnedFurniture[];
  setFurniture: (f: OwnedFurniture[]) => void; look?: import("@/components/avatar/roster").AvatarLookProps; onExit: () => void; onChanged: () => void;
  /** The home's floor, walls, panels and bedding (saved with the furniture: one version for everyone). */
  lookOfHome: Partial<HomeStyle> | null; setLookOfHome: (s: Partial<HomeStyle>) => void;
}) {
  // A party on here: decorations, a banner, and (for a guest) checking in.
  const party = usePartyHere(flatRoute(flat), true);
  // The side bar's open panel.
  const [panel, setPanel] = useState<"menu" | "party" | null>(null);
  // Clear screen: only the room (and the party game's own card) on screen; on a phone it comes on as a game starts.
  const [cleanScreen, setCleanScreen] = useState(false);
  useCleanScreen(cleanScreen);
  const unreadAll = useUnreadTotal(me);
  const [dancing, setDancing] = useState(false);
  const [pose, setPose] = useState<"sit" | "sleep" | null>(null);
  const dance = (seconds: number) => { setPose(null); setDancing(true); setTimeout(() => setDancing(false), seconds * 1000); };
  // The host's lights switch, the moment they flip it (late arrivals get it from the party itself).
  const [lightsSet, setLightsSet] = useState<boolean | null>(null);
  const lightsOut = !!party && (lightsSet ?? !!party.lightsOut);
  // Hostesses bringing drinks: to whoever ordered (you stand by the door's side of the room when it's you).
  const [runs, setRuns] = useState<HostessRun[]>([]);
  const serve = (id: string, name: string, to: [number, number]) => setRuns((r) => [...r, { id: `${id}-${Date.now()}`, name, to, who: id }].slice(-6));
  // The drink the hostess hands me, held for the rest of the party.
  const [drink, handDrink] = usePartyDrink();
  // Sit: walk to the nearest free seat (the room finds it). Each tap is a new ask.
  const [seatCall, setSeatCall] = useState<{ n: number; sit: boolean } | undefined>(undefined);
  const askSeat = (sit: boolean) => setSeatCall((c) => ({ n: (c?.n ?? 0) + 1, sit }));
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [turns, setTurns] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManager = flat.owner_id === me || flat.tenant_id === me;
  const isOwner = flat.owner_id === me;

  const say = (t: string) => { setToast(t); setTimeout(() => setToast((x) => (x === t ? null : x)), 3000); };

  // Every change to the layout is saved to the flat, so visitors see exactly this.
  const commit = (next: OwnedFurniture[], nextLook: Partial<HomeStyle> | null = lookOfHome) => {
    setFurniture(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // The furniture and the look together, so nobody's change wipes the other's; then everyone here reloads it.
      const res = await saveInteriorFull(flat.id, { furniture: next, style: nextLook ?? undefined, shared: true });
      if (!res.ok) say(`Couldn't save: ${res.error}`);
      else room.emit({ type: "home" });
    }, 500);
  };
  const [lookOpen, setLookOpen] = useState(false);
  const router = useRouter();
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [myResidences, setMyResidences] = useState<Array<{ id: string; label: string; route: string; active: boolean; isShared?: boolean }>>([]);
  const [parkedCar, setParkedCar] = useState<ParkedCarView | null>(null);
  const [theftModal, setTheftModal] = useState<ParkedCarView | null>(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [stolenDrive, setStolenDrive] = useState<Drivable | null>(null);
  const { garage } = useGarage(me);

  const refreshParkedCar = useCallback(async () => {
    try {
      const res = await getFlatParkedCar(flat.id);
      if (res.data) setParkedCar(res.data);
      else setParkedCar(null);
    } catch {
      /* ignore */
    }
  }, [flat.id]);

  useEffect(() => {
    void refreshParkedCar();
  }, [refreshParkedCar]);

  useEffect(() => {
    (async () => {
      try {
        const flats = await myFlats(me);
        const hh = await myHousehold();
        const list: Array<{ id: string; label: string; route: string; active: boolean; isShared?: boolean }> = [];
        for (const f of flats) {
          list.push({
            id: f.id,
            label: `${f.property_type || "Apartment"} (${f.unit})`,
            route: flatRoute(f),
            active: f.id === flat.id,
          });
        }
        for (const h of hh) {
          if (!list.some((x) => x.id === h.flat)) {
            list.push({
              id: h.flat,
              label: `Marital Home (${h.type || "Unit"} ${h.unit})`,
              route: `/property/${h.building}/${h.unit}`,
              active: h.flat === flat.id,
              isShared: true,
            });
          }
        }
        setMyResidences(list);
      } catch {
        /* ignore */
      }
    })();
  }, [flat.id]);
  // The kitchen, bathroom and things in the home (TV, aquarium, dining table, counter): anyone here can use them.
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [running, setRunning] = useState<FixtureAction | null>(null);
  const [usingFixture, setUsingFixture] = useState<string | null>(null);
  const restyle = (change: Partial<HomeStyle>, price: number, label: string) => {
    if (price > 0 && !adjustBalance(-price)) return say("⚠️ Not enough AED.");
    const next = { ...homeLook, ...change };
    setLookOfHome(next);
    commit(furniture, next);
    gameAudio.playCoinSound();
    say(`✨ ${label}${price ? ` · AED ${price.toLocaleString()}` : ""}`);
  };

  const buy = (item: CatalogItem) => {
    if (!adjustBalance(-item.price)) return say("⚠️ Not enough AED.");
    gameAudio.playCoinSound();
    const uid = newUid(item.id);
    commit([...furniture, { uid, itemId: item.id, placement: null }]);
    setShopOpen(false);
    setPlacing({ uid, itemId: item.id, rot: 0 });
  };

  const place = (uid: string, placement: Placement | null) => {
    commit(withHomeItems(furniture, housingTier).map((f) => (f.uid === uid ? { ...f, placement } : f)));
    setPlacing(null);
  };

  // The NPC resident is home when you visit them.
  const resident = useMemo<Person[]>(() => {
    const npc = flat.tenant_npc ?? (flat.tenant_id ? null : flat.owner_npc);
    if (!npc || isManager) return [];
    let h = 0;
    for (const c of npc) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = ROSTER[h % ROSTER.length];
    return [{ look: { gender: r.gender, preset: r.id }, position: [-1.2, 0, 0.6], rotation: Math.PI / 3, animation: "wave" }];
  }, [flat, isManager]);

  // ------------------------------------------------ other citizens here right now

  const { citizen } = useCitizen();
  const mySpot = spotFor(me);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const bubble = useCallback((who: string, text: string) => {
    setBubbles((b) => ({ ...b, [who]: text }));
    setTimeout(() => setBubbles((b) => {
      if (b[who] !== text) return b;
      const next = { ...b };
      delete next[who];
      return next;
    }), 6000);
  }, []);
  // At a party everyone dances (some sit) unless they're doing something else.
  const myMood = dancing ? "dance" : pose ?? (party ? partyMood(me) : "idle");
  // Where I am, shared when I set off and when I stop, so everyone sees me move.
  const [where, setWhere] = useState<{ x: number; z: number; yaw: number; walking: boolean; lift?: number; rest?: "sit" | "sleep" }>({ x: mySpot[0], z: mySpot[2], yaw: 0, walking: false });
  // Which floor I'm on: people upstairs aren't shown downstairs, and the other way round.
  const [level, setLevel] = useState(0);
  // Sent when I set off (where I'm heading) and when I stop: everyone else walks me there in between.
  const onMove = (x: number, z: number, yaw: number, walking: boolean, lift?: number, rest?: "sit" | "sleep") => {
    setWhere({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, yaw: Math.round(yaw * 100) / 100, walking, lift: lift ? Math.round(lift * 100) / 100 : undefined, rest });
  };
  const partyGameReceive = useRef<((e: Received) => boolean) | null>(null);
  const room = useRoom(`flat:${flat.id}`, { x: where.x, z: where.z, face: where.yaw, animation: where.walking ? "walk" : where.rest ?? myMood, lift: where.lift, level, hold: drink ?? undefined, dirty: isDirty(citizen?.needs?.hygiene) }, (e: Received) => {
    // The party game outside (its own store).
    if (partyGameReceive.current?.(e)) return;
    if (e.type === "chat") bubble(e.from.userId, e.text);
    if (e.type === "wave") bubble(e.from.userId, "👋");
    if ((e as unknown as { type: string; thief?: string }).type === "car_stolen") {
      say(`🚨 VEHICLE ALARM TRIGGERED! @${(e as unknown as { thief?: string }).thief || "Someone"} hotwired the car!`);
      void refreshParkedCar();
    }
    // Someone changed the home: the one version, reloaded for everyone here.
    if (e.type === "home") onChanged();
    if (e.type === "party") {
      if (e.action === "lights") setLightsSet(!!e.on);
      else if (e.action === "drinks") serve(e.from.userId, e.from.username, [e.from.x, e.from.z]);
      else { dance(PARTIES.actions.dance.seconds); bubble(e.from.userId, "🪩 Everyone dance!"); }
    }
  });
  const [peerId, setPeerId] = useState<string | null>(null);
  const [startChat, setStartChat] = useState(false);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!peerId) return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [peerId]);
  const peer = room.peers.find((p) => p.userId === peerId);
  // Spots are handed out over everyone here (me included), so nobody stands on anyone else.
  const spots = spotsFor([me, ...room.peers.map((p) => p.userId)]);
  const spotOf = (id: string) => spots.get(id) ?? spotFor(id);
  const people: Person[] = [
    ...resident,
    ...room.peers.filter((p) => (p.level ?? 0) === level).map((p): Person => ({
      look: p.look,
      position: Number.isFinite(p.x) ? [p.x, p.lift ?? 0, p.z] : spotOf(p.userId),
      holding: drinkInHand(p.hold)?.prop,
      carryMode: drinkInHand(p.hold)?.mode,
      dirty: p.dirty,
      rotation: p.face ?? (party ? faceNearest([p.x, 0, p.z], [[where.x, 0, where.z], ...room.peers.map((o) => [o.x, 0, o.z] as [number, number, number])]) : undefined) ?? Math.atan2(-p.x, -p.z),
      animation: p.animation,
      label: `${p.away ? "💤 " : ""}@${p.username}${room.unread[p.userId] ? ` · 💬${room.unread[p.userId]}` : ""}`,
      bubble: bubbles[p.userId],
      onClick: () => { setStartChat(false); setPeerId(p.userId); },
    })),
  ];

  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const banner = isManager ? null
    : reason === "viewing" ? "🔑 Viewing — this home is on the market. Look around before you rent or buy."
    : canEdit ? `🛠️ ${flat.residentName ?? "The owner"} lets you redecorate here.`
    : `👋 You're visiting ${flat.residentName ?? "someone"}'s home. Look around — you can't change anything.`;

  // Townhouses, villas and penthouses are two-storey whatever their bedrooms; then it goes by bedrooms.
  const housingTier: HousingTier = housingTierFor(flat.property_type, flat.bedrooms);

  const housingConfig = HOUSING_CONFIGS[housingTier] ?? HOUSING_CONFIGS.studio;
  // The home's look as saved (or as it came).
  const homeLook: HomeStyle = { ...housingConfig.finish, ...lookOfHome };
  const levels = housingConfig.levels;
  const rooms = levels ? levels[Math.min(level, levels.length - 1)].rooms : housingConfig.rooms;
  const changeLevel = (n: number) => {
    if (!levels || n === level || n < 0 || n >= levels.length) return;
    setPlacing(null);
    setLevel(n);
    setActiveRoomId(n > 0 ? "landing" : "hall");
  };
  const isMultiRoom = !!rooms?.length;
  const [upView, setUpView] = useState(isMultiRoom);
  // Looking down on the home, or over the shoulder in the room.
  const [view, setView] = useState<"above" | "inside" | "eye">("above");
  // A two-player game outside the house, on demand: any guest starts one and everyone at the party watches.
  const partyBoard = usePartyBoard({
    active: !!party,
    meId: me,
    meName: citizen?.username,
    isHost: !!party?.isHost,
    present: room.peers.map((p) => p.userId),
    tier: housingTier,
    exterior: homeLook.exterior ?? [],
    lightsOut,
    level,
    clean: cleanScreen,
    onGameStart: () => { setPanel(null); setCleanScreen(true); },
    onWatch: () => { if (level !== 0) changeLevel(0); setView("above"); setUpView(false); },
  });
  useEffect(() => {
    partyGameReceive.current = partyBoard.pg.receive;
    partyBoard.pg.bindEmit(room.emit);
  });
  const stick = useRef<{ x: number; y: number; sprint?: boolean }>({ x: 0, y: 0 });
  const [stickRun, setStickRun] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string>("living");

  useEffect(() => {
    if (isMultiRoom) {
      setUpView(true);
      setActiveRoomId("living");
    }
  }, [housingTier, isMultiRoom]);

  return (
    <main className="fixed inset-0 w-screen h-[100dvh] overflow-hidden overscroll-none bg-[#788e6e] text-slate-900 select-none">
      <ApartmentRoom
        paused={
          wardrobeOpen ||
          shopOpen ||
          lookOpen ||
          propertiesOpen ||
          manageOpen ||
          Boolean(theftModal) ||
          driveOpen ||
          Boolean(stolenDrive)
        }
        loadingLabel={`Opening ${flatTitle(flat)}`}
        look={look}
        homeStyle={homeLook}
        ownCar={parkedCar && !parkedCar.isStolen ? { car: carOf(parkedCar.car)!, plate: parkedCar.plate } : null}
        onUseFixture={(f) => {
          if (f.kind === "car") {
            if (!parkedCar || parkedCar.isStolen) {
              say("🚗 Driveway is empty (vehicle is in use or was stolen).");
              return;
            }
            if (parkedCar.canDrive) {
              setDriveOpen(true);
            } else if (parkedCar.canSteal) {
              setTheftModal(parkedCar);
            } else {
              say(`🔒 Locked · Registered to @${parkedCar.ownerUsername}`);
            }
            return;
          }
          setFixture(f);
        }}
        using={usingFixture}
        activity={running?.serve}
        furniture={furniture}
        placing={placing}
        decorating={decorating}
        turns={turns}
        people={people}
        housingTier={housingTier}
        upView={upView}
        view={view}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        level={level}
        onChangeLevel={changeLevel}
        onPlace={(uid, p) => place(uid, p)}
        onPickUp={(uid) => { const f = withHomeItems(furniture, housingTier).find((x) => x.uid === uid); if (f) setPlacing({ uid, itemId: f.itemId, rot: f.placement?.kind === "floor" ? f.placement.rot : 0, layer: f.placement?.kind === "floor" ? f.placement.layer : undefined }); }}
        onPlaceBlocked={() => say("🚫 It doesn't fit there.")}
        partyDecor={party?.decor}
        lightsOut={lightsOut}
        myAnimation={party ? myMood : undefined}
        startAt={[mySpot[0], mySpot[2]]}
        onMove={onMove}
        seatCall={seatCall}
        holding={drinkInHand(drink)}
        dirty={isDirty(citizen?.needs?.hygiene)}
        stick={view !== "above" ? stick : undefined}
        stickRun={stickRun}
        extras={<><PartyHostesses runs={runs} onArrive={(r) => { if (r.who === me) handDrink(); }} onDone={(id) => setRuns((r) => r.filter((x) => x.id !== id))} />{partyBoard.board}</>}
        extraZones={partyBoard.zones}
        focus={partyBoard.focus}
        poolCovered={partyBoard.poolCovered}
        clean={cleanScreen}
      />
      {partyBoard.ui}
      {party && !cleanScreen && <PartyBanner party={party} hostAway={!room.peers.some((p) => p.username === party.host)} className={BELOW_SPACE_TOP} />}

      {!cleanScreen && <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 z-30 flex items-center gap-2">
        <button onClick={onExit} className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center" aria-label="Leave"><ArrowLeft className="w-4 h-4" /></button>
        <div className="bg-white rounded-2xl shadow-lg px-3 py-1.5 min-w-0 flex-1 sm:flex-none">
          <div className="font-black text-sm truncate">{flatTitle(flat)}</div>
          <div className="text-[11px] text-slate-500 truncate">{flat.property_type} · {flat.size_sqft.toLocaleString()} sq ft{flat.view ? ` · ${flat.view}` : ""}</div>
        </div>
        <div className="hidden sm:block flex-1" />
        {/* Your money, always in sight (short on phones: 2.2M). */}
        <Link href="/wallet" className="h-10 shrink-0 px-3 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-lg flex items-center text-xs font-black font-mono whitespace-nowrap" aria-label="Wallet">
          <span className="sm:hidden">AED {new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(citizen?.balance ?? 0)}</span>
          <span className="hidden sm:inline">AED {(citizen?.balance ?? 0).toLocaleString()}</span>
        </Link>
        <button
          onClick={() => { gameAudio.playClickSound(); openLife("profile"); }}
          className="h-10 pl-1 pr-2.5 rounded-full bg-white shadow-lg flex items-center gap-1.5 text-xs font-black active:scale-95 transition-transform"
          title="Open Profile, Visa & Budget, and League"
          aria-label="Open Profile, Visa & Budget, and League"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rosterThumb(presetFor(look ?? { gender: "woman" }))} alt="" className="w-7 h-7 rounded-full object-cover object-top bg-sky-100 ring-2 ring-amber-400" />
          <span className="hidden sm:inline">Profile</span>
        </button>
        <button
          onClick={() => setWardrobeOpen(true)}
          className="h-10 px-3 rounded-full bg-white shadow-lg flex items-center gap-1.5 text-xs font-black active:scale-95 transition-transform"
          aria-label="Open Wardrobe"
        >
          <Shirt className="w-4 h-4 text-purple-600" />
          <span className="hidden sm:inline">Wardrobe</span>
        </button>
        <InviteHere title={flatTitle(flat)} label={`${flat.property_type} · ${flat.size_sqft.toLocaleString()} sq ft`} text={`🏠 Come and see ${flatTitle(flat)} with me on Dubai Life!`} compact
          className="h-10 w-10 sm:w-auto shrink-0 justify-center sm:px-3 rounded-full bg-fuchsia-600 text-white shadow-lg flex items-center gap-1.5 text-xs font-black" />
        {isManager && <button onClick={() => setManageOpen(true)} className="h-10 w-10 sm:w-auto shrink-0 justify-center sm:px-3 rounded-full bg-white shadow-lg flex items-center gap-1.5 text-xs font-black" aria-label="Manage"><Settings2 className="w-4 h-4" /> <span className="hidden sm:inline">Manage</span></button>}
        <button onClick={onExit} className="h-10 w-10 sm:w-auto shrink-0 justify-center sm:px-3 rounded-full bg-slate-900 text-white shadow-lg flex items-center gap-1.5 text-xs font-black" aria-label="Exit"><LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exit</span></button>
      </header>}

      {/* Multi-Room Navigation & Cutaway View Pills */}
      {rooms && rooms.length > 0 && !party && !cleanScreen && (
        <div className="absolute top-[4.65rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-slate-200 overflow-x-auto max-w-[94vw]">
          <button
            onClick={() => setUpView(!upView)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
              upView ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {upView ? "📐 All Rooms" : "🔍 Room Focus"}
          </button>
          {levels?.map((l, i) => (
            <button
              key={l.label}
              onClick={() => { changeLevel(i); gameAudio.playClickSound(); }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${level === i ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}
            >
              {l.icon} {l.label}
            </button>
          ))}
          <div className="w-[1px] h-3 bg-slate-200" />
          {rooms.map((r) => {
            const isSelected = activeRoomId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveRoomId(r.id);
                  gameAudio.playClickSound();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm scale-105"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {view !== "above" && !placing && !decorating && !cleanScreen && (
        <div className="absolute left-4 bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+6rem))] z-30"><MoveStick controls={stick} allowRun={false} /></div>
      )}
      {banner && !cleanScreen && <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950/85 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl max-w-[92vw] text-center">{banner}</div>}

      {/* Middle right: ☰ Menu (rooms, turning the room), 🎉 Party, the three views and the phone; Outside at the
          bottom right (user, 2026-11-04). */}
      <SideBar>
        {!cleanScreen && <SideButton icon={<Menu className="w-5 h-5" />} label="Menu" tone="dark" active={panel === "menu"} onClick={() => setPanel((x) => (x === "menu" ? null : "menu"))} />}
        {party && !cleanScreen && <SideButton icon="🎉" label="Party" tone="party" active={panel === "party"} onClick={() => setPanel((x) => (x === "party" ? null : "party"))} />}
        {!cleanScreen && <ViewCycle view={view} onChange={(v) => { setView(v as "above" | "inside" | "eye"); setUpView(false); }} />}
        {!cleanScreen && <SideButton icon={<Smartphone className="w-5 h-5" />} label={unreadAll ? `Phone: ${unreadAll} unread` : "Phone"} badge={unreadAll} onClick={() => openPhone()} />}
        {/* Clear screen / unclear screen */}
        <SideButton icon={cleanScreen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} label={cleanScreen ? "Unclear screen: show everything" : "Clear screen"}
          onClick={() => { setPanel(null); setCleanScreen((c) => !c); }} />
      </SideBar>
      {panel === "party" && party && (
        <FloatMenu label="Party" onClose={() => setPanel(null)}>
          <PartyActions list party={party} onPlayBoard={() => { setPanel(null); partyBoard.openPicker(); }} lightsOut={lightsOut} onLights={setLightsSet} onDance={(sec) => { if (where.rest) askSeat(false); dance(sec); }} pose={dancing ? "dance" : pose} onPose={(x) => { setDancing(false); setPose(x === "dance" ? null : x); if (x === "sit" || pose === "sit") askSeat(x === "sit"); }} announce={(text) => room.emit({ type: "chat", text })} broadcast={(action, on) => { room.emit({ type: "party", action, on }); if (action === "drinks") serve(me, citizen?.username ?? "you", [where.x, where.z]); }} />
        </FloatMenu>
      )}
      {panel === "menu" && (
        <SidePopover title={flatTitle(flat)} onClose={() => setPanel(null)}>
          <button onClick={() => { setPanel(null); setWardrobeOpen(true); }} className="w-full h-11 rounded-2xl bg-purple-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95">👗 My Wardrobe &amp; Outfits</button>
          <button onClick={() => { setPanel(null); setPropertiesOpen(true); }} className="w-full h-11 rounded-2xl bg-slate-900 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95">🏠 My Properties &amp; Residences</button>
          {canEdit && <button onClick={() => setLookOpen(true)} className="w-full h-11 rounded-2xl bg-emerald-600 text-white text-xs font-black">🎨 Floors, walls &amp; bedding</button>}
          {(levels || (rooms && rooms.length > 0)) && (
            <div className="flex flex-wrap gap-1">
              {rooms && rooms.length > 0 && <button onClick={() => setUpView(!upView)} className={`px-2.5 h-8 rounded-full text-[11px] font-black ${upView ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"}`}>{upView ? "📐 All rooms" : "🔍 One room"}</button>}
              {levels?.map((l, i) => (
                <button key={l.label} onClick={() => changeLevel(i)} className={`px-2.5 h-8 rounded-full text-[11px] font-black ${level === i ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}>{l.icon} {l.label}</button>
              ))}
              {rooms?.map((r) => (
                <button key={r.id} onClick={() => setActiveRoomId(r.id)} className={`px-2.5 h-8 rounded-full text-[11px] font-black ${activeRoomId === r.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{r.icon} {r.label}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button onClick={() => setTurns((t) => t - 1)} className="h-10 rounded-2xl bg-slate-100 text-xs font-black active:scale-95">⟲ Turn left</button>
            <button onClick={() => setTurns((t) => t + 1)} className="h-10 rounded-2xl bg-slate-100 text-xs font-black active:scale-95">⟳ Turn right</button>
          </div>
        </SidePopover>
      )}
      {!placing && (
        <Link href={`/street?from=${encodeURIComponent(flat.building_id)}${isGenericHome(flat.building_id) ? "&home=1" : ""}${/villa|townhouse/i.test(flat.property_type) ? "&villa=1" : ""}`}
          className="fixed right-3 bottom-[max(6.25rem,calc(env(safe-area-inset-bottom)+5.75rem))] z-30 h-11 pl-3 pr-4 rounded-full bg-emerald-600 text-white shadow-lg flex items-center gap-1.5 font-black text-sm active:scale-95" aria-label="Go outside">🚪 <span>Outside</span></Link>
      )}

      {fixture && !running && (
        <FixtureSheet fixture={fixture} onClose={() => setFixture(null)} onStart={(a) => { gameAudio.playClickSound(); setRunning(a); setUsingFixture(fixture.id); setFixture(null); }} />
      )}
      {running && (
        <div className="absolute left-3 top-[max(7.5rem,calc(env(safe-area-inset-top)+7rem))] z-40 pointer-events-auto">
          <FixtureProgress key={running.id} action={running}
            onCancel={() => { setRunning(null); setUsingFixture(null); }}
            onDone={() => { completeFixtureAction(running); say(`${running.icon} ${running.label}: done`); setRunning(null); setUsingFixture(null); }} />
        </div>
      )}
      {lookOpen && canEdit && <HomeLookSheet style={homeLook} onChange={restyle} onClose={() => setLookOpen(false)} />}
      {/* The usual bottom bar (Home, Map, To do, Me), so you can always get back to the city. */}
      {!placing && !peer && <BottomNav />}

      {canEdit && !placing && (
        <div className="absolute bottom-[6.25rem] left-1/2 -translate-x-1/2 z-30 flex gap-2">
          <button onClick={() => setShopOpen(true)} className="h-11 px-4 rounded-full bg-white shadow-xl text-xs font-black flex items-center gap-1.5"><ShoppingBag className="w-4 h-4" /> Buy furniture</button>
          <button onClick={() => setDecorating((d) => !d)} className={`h-11 px-4 rounded-full shadow-xl text-xs font-black ${decorating ? "bg-emerald-500 text-white" : "bg-white"}`}>{decorating ? "Done decorating" : "Decorate"}</button>
        </div>
      )}

      {placing && placingItem && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-2">
          <span className="text-2xl">{placingItem.icon}</span>
          <span className="text-xs font-bold">{placingItem.kind === "wall" ? "Tap a wall" : "Tap the floor"} to place</span>
          {placingItem.kind !== "wall" && <button onClick={() => setPlacing({ ...placing, rot: (((placing.rot + 1) % 4) as Rotation) })} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">Rotate</button>}
          {placingItem.kind !== "wall" && <button onClick={() => setPlacing({ ...placing, layer: Math.min(6, (placing.layer ?? 0) + 1) })} aria-label="Bring forward" className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-black">⬆</button>}
          {placingItem.kind !== "wall" && <button onClick={() => setPlacing({ ...placing, layer: Math.max(-3, (placing.layer ?? 0) - 1) })} aria-label="Send back" className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-black">⬇</button>}
          <button onClick={() => place(placing.uid, null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold">Store</button>
          <button onClick={() => setPlacing(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
        </div>
      )}

      <DecorationCatalogue
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        walletBalance={citizen?.balance ?? 0}
        storedItems={withHomeItems(furniture, housingTier).filter((f) => !f.placement)}
        homeStyle={homeLook}
        onRestyle={restyle}
        onSelectItem={(item) => buy(item)}
        onPlaceStored={(f) => { setShopOpen(false); setPlacing({ uid: f.uid, itemId: f.itemId, rot: 0 }); }}
      />
      <WardrobeModal open={wardrobeOpen} onOpenChange={setWardrobeOpen} />
      {propertiesOpen && (
        <Modal title="My Residences &amp; Properties" onClose={() => setPropertiesOpen(false)}>
          <div className="space-y-2 p-1">
            <p className="text-xs text-slate-500 font-medium mb-3">
              Switch freely between your owned/rented properties and your marital shared home.
            </p>
            {myResidences.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                No other properties registered yet.
              </div>
            ) : (
              myResidences.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    setPropertiesOpen(false);
                    if (!res.active) {
                      router.push(res.route);
                    }
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between border text-left transition-all ${
                    res.active
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200"
                      : "border-slate-200 hover:bg-slate-50 active:scale-95"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{res.isShared ? "💍" : "🏠"}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">{res.label}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {res.isShared ? "Shared Couple Home" : "Owned / Rented Flat"}
                      </div>
                    </div>
                  </div>
                  {res.active ? (
                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-600">
                      Go here ›
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {manageOpen && <Manage flat={flat} isOwner={isOwner} onClose={() => setManageOpen(false)} onChanged={onChanged} say={say} />}

      {peer && (
        <PeerPanel
          key={peer.userId}
          peer={peer}
          context="home"
          balance={citizen?.balance ?? 0}
          startIn={startChat ? "chat" : "menu"}
          unread={room.unread[peer.userId] ?? 0}
          messages={room.messages.filter((m) => m.with === peer.userId || m.with === peer.username || m.with?.toLowerCase() === peer.username.toLowerCase())}
          typing={room.isTyping(peer.userId, clock)}
          onTyping={() => room.typingTo(peer.userId)}
          onThread={(open) => room.openThread(open ? peer.userId : null)}
          onClose={() => setPeerId(null)}
          onChat={(text) => room.say(peer.userId, text, flatTitle(flat))}
          onSendMoney={async (amount) => {
            const error = await sendMoney(peer, amount, flatTitle(flat));
            if (!error) { room.emit({ type: "money", amount }, peer.userId); gameAudio.playCoinSound(); say(`💸 Sent AED ${amount.toLocaleString()} to @${peer.username}`); }
            return error;
          }}
          onWave={() => { room.emit({ type: "wave" }, peer.userId); say(`👋 You waved at @${peer.username}`); setPeerId(null); }}
          onInvite={() => {}}
          onFriend={async () => {
            const r = await befriend(me, peer);
            if (r === "sent") room.emit({ type: "friend" }, peer.userId);
            return r === "friends" ? `You and @${peer.username} are now friends 🤝` : r === "sent" ? "Friend request sent" : r === "blocked" ? "You can't add them." : "Couldn't send the request — try again.";
          }}
        />
      )}
      <SocialFeed
        events={room.events}
        readingWith={peerId}
        onAccept={() => {}}
        onReply={(e) => { setStartChat(true); setPeerId(e.from.userId); }}
        onFriend={async (e) => { const r = await befriend(me, e.from); say(r === "friends" ? `🤝 You and @${e.from.username} are now friends` : "Couldn't add them — try again."); }}
      />
      {room.peers.length > 0 && !peer && (
        <div className="absolute left-3 bottom-20 z-30 bg-sky-500/90 text-white rounded-full px-3 py-1 text-[11px] font-black shadow-lg pointer-events-none">
          👥 {room.peers.length} {room.peers.length === 1 ? "person" : "people"} here · tap them to say hi
        </div>
      )}

      {theftModal && (
        <VehicleTheftModal
          parkedCar={theftModal}
          flatId={flat.id}
          onClose={() => setTheftModal(null)}
          onSuccess={(stolen) => {
            room.emit({ type: "car_stolen", thief: citizen?.username });
            void refreshParkedCar();
            const carDef = carOf(stolen.car);
            if (carDef) {
              setStolenDrive({
                kind: "stolen",
                id: stolen.carId,
                car: carDef,
                plate: stolen.plate,
                fuel: Number(stolen.fuel),
                isStolen: true,
                isReportedStolen: false,
                stolenFromUser: stolen.ownerUsername,
              });
            }
          }}
          say={say}
        />
      )}

      {driveOpen && (
        <DriveSheet
          car={parkedCar?.car ? carOf(parkedCar.car) ?? null : null}
          onClose={() => setDriveOpen(false)}
        />
      )}

      {stolenDrive && (
        <ModalPortal>
          <DriveJourney
            drivables={[stolenDrive]}
            metres={3200}
            destination="Sheikh Zayed Road Getaway"
            look={look}
            balance={citizen?.balance ?? 0}
            hasLicence={!!garage?.licence}
            onArrive={() => {
              setStolenDrive(null);
              say("💨 You sped away into city traffic!");
              router.push("/explore");
            }}
            onArrested={() => {
              setStolenDrive(null);
              say("🚨 Intercepted by Dubai Police!");
              openPhone("court");
            }}
            onCancel={() => setStolenDrive(null)}
          />
        </ModalPortal>
      )}

      {toast && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 text-white text-sm font-bold px-4 py-2 rounded-full shadow-2xl">{toast}</div>}
    </main>
  );
}

/** Where a citizen stands while in someone's home: a spot picked from their id, the same for everyone. */
// Where visitors stand: in pairs across the middle of the room (so they dance with each other), never on top of each
// other, your own avatar or the resident. Everyone is given a spot in username order, so it's the same on every screen.
const PAIR_CENTRES: Array<[number, number]> = [[0.4, 0.8], [0.4, -0.8], [2.0, 0.8], [2.0, -0.8], [0.4, 2.4], [0.4, -2.4], [2.0, 2.4], [2.0, -2.4], [-1.2, -0.8], [-1.2, 2.4], [-1.2, -2.4], [3.4, 0]];
const KEEP_CLEAR: Array<[number, number]> = [[-3.25, 0], [-1.2, 0.6]];
const SPOTS: Array<[number, number, number]> = PAIR_CENTRES
  .flatMap(([x, z]) => [[x - 0.45, z], [x + 0.45, z]] as Array<[number, number]>)
  .filter(([x, z]) => KEEP_CLEAR.every(([cx, cz]) => Math.hypot(x - cx, z - cz) > 0.8))
  .map(([x, z]) => [x, 0, z]);

/** Everyone's spot: one each, the first ones in pairs. */
export function spotsFor(userIds: string[]): Map<string, [number, number, number]> {
  const sorted = [...new Set(userIds)].sort();
  return new Map(sorted.map((id, i) => [id, SPOTS[i % SPOTS.length]]));
}
/** One person's own spot, by name (where they first appear before anyone moves). */
export function spotFor(userId: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return SPOTS[Math.abs(h) % SPOTS.length];
}

// ---------------------------------------------------------------- owner tools

function Manage({ flat, isOwner, onClose, onChanged, say }: { flat: FlatView; isOwner: boolean; onClose: () => void; onChanged: () => void; say: (t: string) => void }) {
  const [access, setAccessState] = useState<Access>(flat.access);
  const [guests, setGuests] = useState<Awaited<ReturnType<typeof listGuests>>>([]);
  const [username, setUsername] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [listing, setListing] = useState<Listing>(flat.listing);
  const [rent, setRent] = useState(String(flat.rent_price ?? ""));
  const [sale, setSale] = useState(String(flat.sale_price ?? ""));
  const [busy, setBusy] = useState(false);

  const refreshGuests = useCallback(() => { listGuests(flat.id).then(setGuests); }, [flat.id]);
  useEffect(refreshGuests, [refreshGuests]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return say(`⚠️ ${(res as { error: string }).error}`);
    say(okMsg);
    onChanged();
  };

  return (
    <Modal title="Manage your home" onClose={onClose}>
      <section className="space-y-1.5">
        <h4 className="text-xs font-black uppercase text-slate-400">Who can come in</h4>
        {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
          <label key={a} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold cursor-pointer ${access === a ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
            <input type="radio" name="access" checked={access === a} onChange={() => { setAccessState(a); void run(() => setAccess(flat.id, a), "Access updated."); }} />
            {ACCESS_LABEL[a]}
          </label>
        ))}
      </section>

      <section className="space-y-1.5 pt-2">
        <h4 className="text-xs font-black uppercase text-slate-400">Guests</h4>
        <p className="text-[11px] text-slate-500">Invited guests can always come in. Give someone “can edit” to let them redecorate.</p>
        {guests.map((g) => (
          <div key={g.user_id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 font-bold">@{g.profiles?.username ?? "?"} {g.can_edit && <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 rounded">can edit</span>}</span>
            <button onClick={async () => { await removeGuest(flat.id, g.user_id); refreshGuests(); }} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center" aria-label="Remove guest"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="flex-1 h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />
          <label className="flex items-center gap-1 text-[11px] font-bold"><input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> can edit</label>
          <button disabled={!username.trim() || busy} onClick={() => run(async () => { const r = await addGuest(flat.id, username, canEdit); if (r.ok) { setUsername(""); refreshGuests(); } return r; }, "Guest added.")} className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-1 disabled:opacity-50"><UserPlus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </section>

      {isOwner && (
        <section className="space-y-1.5 pt-2">
          <h4 className="text-xs font-black uppercase text-slate-400">Put it on the market</h4>
          <select value={listing} onChange={(e) => setListing(e.target.value as Listing)} className="w-full h-9 rounded-xl border border-slate-200 px-2 text-sm font-bold">
            <option value="none">Not listed</option>
            <option value="rent">For rent</option>
            <option value="sale">For sale</option>
            <option value="rent_or_sale">For rent or sale</option>
          </select>
          {(listing === "rent" || listing === "rent_or_sale") && <input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ""))} placeholder="Monthly rent (virtual AED)" className="w-full h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />}
          {(listing === "sale" || listing === "rent_or_sale") && <input inputMode="numeric" value={sale} onChange={(e) => setSale(e.target.value.replace(/\D/g, ""))} placeholder="Sale price (virtual AED)" className="w-full h-9 px-3 rounded-xl bg-slate-100 text-sm font-bold outline-none" />}
          <button disabled={busy} onClick={() => run(() => listFlat(flat.id, listing, rent ? +rent : null, sale ? +sale : null), listing === "none" ? "Taken off the market." : "Listing updated.")} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black disabled:opacity-50">Save listing</button>
        </section>
      )}
      {!isOwner && <p className="text-[11px] text-slate-500 pt-2 flex items-center gap-1"><KeyRound className="w-3 h-3" /> You rent this home{flat.tenant_until ? ` until ${new Date(flat.tenant_until).toLocaleDateString()}` : ""}. Only the owner can list it.</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------- bits

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center p-4 pb-2"><h3 className="flex-1 font-black">{title}</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button></div>
        <div className="overflow-y-auto px-4 pb-4 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">{children}</div>
    </main>
  );
}

function Blank({ spinner }: { spinner?: boolean }) {
  return <SmallLoader label={spinner ? "Walking up to the door…" : "Getting you there…"} />;
}
