"use client";

import { MoveStick } from "@/components/street/StreetWorld";
import { isDirty } from "@/components/avatar/Flies";
import { askLogout } from "@/components/layout/LogoutConfirm";
import { DecoratorSheet, DecoratorStatus } from "@/components/home/Decorator";
import { HomeActions } from "@/components/home/HomeActions";
import { useCleanScreen } from "@/lib/cleanScreen";
import { usePhoneButtonHere } from "@/lib/phoneButtons";
import { MoveInGuide } from "@/components/home/MoveInGuide";
import { PartySheet } from "@/components/invite/PartySheet";
import { FloatMenu, SideBar, SideButton, SidePopover, ViewCycle } from "@/components/layout/SideBar";
import { ExteriorSheet } from "@/components/home/ExteriorSheet";
import { PartyBanner, usePartyHere } from "@/components/invite/PartyHere";
import { PartyPeople } from "@/components/invite/PartyPeople";
import { PartyActions } from "@/components/invite/PartyActions";
import { drinkInHand, PartyHostesses, usePartyDrink, type HostessRun } from "@/components/invite/PartyHostess";
import { faceNearest, partyMood } from "@/lib/invites";
import { spotsFor } from "@/components/property/PropertyRoute";
import { useRoom } from "@/lib/room";
import { AppSetup, needsAppSetup } from "@/components/pwa/AppSetup";
import { inviteFriends } from "@/lib/invite";
import { useMyDecor } from "@/lib/decorator";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { compact, useSiteStats } from "@/lib/siteStats";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Volume2, VolumeX, Plus, Eye, EyeOff, Menu, ChevronUp, ChevronDown,
  Home, ShoppingBag, Map, Smartphone, Sparkles, X, Megaphone,
  RotateCw, RotateCcw, Keyboard, Move, Package, LogOut, Shirt, Bell
} from "lucide-react";
import { ApartmentRoom, type Person, type PlacingState } from "@/components/home/ApartmentRoom";
import { stageOf, useFamily } from "@/lib/love";
import { useNow } from "@/lib/dubaiClock";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { gameAudio } from "@/utils/gameAudio";
import { isNewCitizen, useRequireCitizen, adjustBalance, buyFurniture, setFurniturePlacement, updateCitizen, DEFAULT_NEEDS, type Needs } from "@/lib/citizenStore";
import {
  CATALOG, FLOOR_FINISHES, PANELS_PRICE, SHOP_CATEGORIES, WALL_PAINTS, getCatalogItem, getHousingTierFromText, hasPlot, housingTierFor, withHomeItems, HOUSING_CONFIGS,
  type CatalogItem, type HomeStyle, type Interaction, type Placement, type Rotation, type HousingTier, type HomeActivityDef, type ShopCategory,
} from "@/lib/furniture";
import { flatRoute, getFlat, myFlats, type FlatView } from "@/lib/city/flats";
import { areaFor, hasRoom, myPartyHome, preparePartyHome, towerName } from "@/lib/city/partyHome";
import { getEntity } from "@/lib/city/geo";
import { openLife } from "@/components/life/LifeHub";
import { useOnlineCount, useOnlineUsernames, formatOnline } from "@/lib/presence";
import { matesInRoom, useBedspace } from "@/lib/bedspace";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { useUnreadTotal } from "@/lib/unread";
import { useLifeLoop } from "@/lib/lifeLoop";
import { WardrobeModal } from "@/components/avatar/WardrobeModal";
import { getPendingVenue } from "@/components/city/VenueDressCodeModal";
import { gainSkill, lifeEvent } from "@/lib/life";
import { FixtureProgress, FixtureSheet, completeFixtureAction } from "@/components/home/FixtureSheet";
import { applyRun, RUNS, RunJourney, type RouteId } from "@/components/home/RunJourney";
import { Sheet } from "@/components/ui/sheet";
import { fixturesFor, type Fixture, type FixtureAction } from "@/lib/homeFixtures";

/** Small previews of the floor finishes in the Style tab. */
const FLOOR_SWATCH: Record<string, string> = {
  oak: "repeating-linear-gradient(0deg,#c8935f 0 10px,#b98250 10px 11px)",
  walnut: "repeating-linear-gradient(0deg,#5b3a24 0 10px,#3f2818 10px 11px)",
  herringbone: "repeating-linear-gradient(45deg,#b98a57 0 8px,#a97a49 8px 16px),#b98a57",
  "white-oak": "repeating-linear-gradient(0deg,#e6d6bb 0 10px,#d8c4a5 10px 11px)",
  "grey-oak": "repeating-linear-gradient(0deg,#a8a198 0 10px,#8f887e 10px 11px)",
  teak: "repeating-linear-gradient(0deg,#a86b35 0 10px,#8f5729 10px 11px)",
  "herringbone-white": "repeating-linear-gradient(45deg,#e8dcc6 0 8px,#d9caae 8px 16px),#e8dcc6",
  "green-marble": "linear-gradient(135deg,#1f4d3a 40%,#e1f0e6 45%,#1f4d3a 50%)",
  "rose-marble": "linear-gradient(135deg,#e8c8c0 40%,#a8786f 45%,#e8c8c0 50%)",
  terrazzo: "radial-gradient(circle at 20% 30%,#c97b63 2px,transparent 3px),radial-gradient(circle at 70% 60%,#7a8b99 2px,transparent 3px),radial-gradient(circle at 45% 80%,#d9b44a 2px,transparent 3px),#ece6dc",
  slate: "linear-gradient(90deg,#3b3f45 49%,#2c2f34 50%,#3b3f45 51%)",
  travertine: "repeating-linear-gradient(0deg,#dfcfb3 0 6px,#d3c09f 6px 8px)",
  "white-marble": "linear-gradient(135deg,#f5f3ef 40%,#c9c9cf 45%,#f5f3ef 50%)",
  "black-marble": "linear-gradient(135deg,#17171a 40%,#d9d9d9 44%,#17171a 48%)",
};

function HomeMenuRow({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 p-3 text-left active:scale-[0.99]">
      <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-sm truncate">{title}</span>
        <span className="block text-[11px] text-slate-500 truncate">{text}</span>
      </span>
      <span className="text-slate-400 font-black">›</span>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { citizen } = useRequireCitizen();
  const walletBalance = citizen?.balance ?? 0;
  const onlineCount = useOnlineCount();
  const { visits } = useSiteStats();
  const [cleanScreen, setCleanScreen] = useState(false);
  useCleanScreen(cleanScreen);
  // The home's own bottom bar has the phone.
  usePhoneButtonHere();
  const [wardrobeModalOpen, setWardrobeModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get("wardrobe") === "open" || !!getPendingVenue()) {
      setWardrobeModalOpen(true);
    }
  }, [searchParams]);
  // Dubai time, ticking every minute.
  const [clock, setClock] = useState<string>("");
  useEffect(() => {
    const fmt = () => setClock(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()));
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, []);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // The kitchen or bathroom fixture being used, and the action under way.
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [running, setRunning] = useState<FixtureAction | null>(null);
  // Which fixture it's at (the shower runs while you're in it).
  const [usingFixture, setUsingFixture] = useState<string | null>(null);
  // Walk to a fixture of this kind and use it (the shower from "Morning Shower").
  // Outside the house: pool, garage, garden… (townhouses and villas).
  const [exteriorOpen, setExteriorOpen] = useState(false);
  // The 🎉 Party panel on the side bar.
  const [partyPanel, setPartyPanel] = useState(false);
  const [fixtureCall, setFixtureCall] = useState<{ n: number; kind: string } | undefined>(undefined);
  // Going for a run: choosing the route, then the run itself.
  const [runPicker, setRunPicker] = useState(false);
  const [runRoute, setRunRoute] = useState<RouteId>("citywalk");
  const [runDistance, setRunDistance] = useState(RUNS.distances[0]);
  const [onRun, setOnRun] = useState(false);
  const [shopTab, setShopTab] = useState<"shop" | "storage" | "style">("shop");
  const [shopCat, setShopCat] = useState<ShopCategory | "all">("all");
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [decorating, setDecorating] = useState(false);
  // An interior decorator: choosing one, and whether one is at work here (then the style is theirs to set).
  // Opened from a decorator's hire-me link (/home?hire=<username>).
  const [decoratorOpen, setDecoratorOpen] = useState(() => !!searchParams?.get("hire"));
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(() => searchParams?.get("party") === "1");
  const hireParam = searchParams?.get("hire") ?? null;
  const { job: decorJob, reload: reloadDecor } = useMyDecor(citizen?.id);
  const [turns, setTurns] = useState(0);

  const life = useLifeLoop();
  // Owned and rented properties from the city map (`flats` table).
  const [flats, setFlats] = useState<FlatView[] | null>(null);
  useEffect(() => {
    if (!citizen?.id) return;
    let live = true;
    void myFlats(citizen.id).then((list) => {
      if (live) setFlats(list);
    });
    return () => { live = false; };
  }, [citizen?.id]);

  // Rank properties so owned mansions/villas/penthouses lead by default unless the player picked another.
  const TIER_RANK: Record<HousingTier, number> = {
    bed_space: 1,
    studio: 2,
    one_bedroom: 3,
    two_bedroom: 4,
    three_bedroom: 5,
    duplex: 6,
    townhouse: 7,
    penthouse: 8,
    villa: 9,
  };
  const sortedFlats = React.useMemo(() => {
    if (!flats) return [];
    return [...flats].sort((a, b) => {
      const aOwned = a.owner_id === citizen?.id ? 1 : 0;
      const bOwned = b.owner_id === citizen?.id ? 1 : 0;
      if (aOwned !== bOwned) return bOwned - aOwned;
      const aTier = housingTierFor(a.property_type, a.bedrooms);
      const bTier = housingTierFor(b.property_type, b.bedrooms);
      return TIER_RANK[bTier] - TIER_RANK[aTier];
    });
  }, [flats, citizen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFlat = React.useMemo(() => {
    if (!sortedFlats.length) return null;
    if (citizen?.activeFlatId === "starter") return null;
    if (citizen?.activeFlatId) {
      const match = sortedFlats.find((f) => f.id === citizen.activeFlatId);
      if (match) return match;
    }
    return sortedFlats[0];
  }, [sortedFlats, citizen?.activeFlatId]);

  const rawTier = (citizen?.home || life?.blueprint?.housing || "studio").toLowerCase();
  const housingTier: HousingTier = activeFlat
    ? housingTierFor(activeFlat.property_type, activeFlat.bedrooms)
    : getHousingTierFromText(rawTier);
  // A bed space is shared with up to three other players, each at their own bed.
  const bedspace = useBedspace(housingTier === "bed_space");
  const onlineNames = useOnlineUsernames();
  const unread = useUnreadTotal(citizen?.id);

  const housingConfig = HOUSING_CONFIGS[housingTier] ?? HOUSING_CONFIGS.studio;
  const activeBuildingName = activeFlat ? (getEntity(activeFlat.building_id)?.name ?? activeFlat.building_id.replace(/-/g, " ")) : null;
  const activeHomeTitle = activeFlat
    ? (/^\d/.test(activeFlat.unit) ? `${activeFlat.property_type} ${activeFlat.unit}` : activeFlat.property_type)
    : housingConfig.label;
  const activeHomeArea = activeFlat
    ? `${activeBuildingName}${activeFlat.owner_id === citizen?.id ? " · Owned" : " · Rented"}`
    : housingConfig.area;
  // Two-storey homes (duplex, townhouse, penthouse, villa) show one floor at a time.
  const levels = housingConfig.levels;
  const [level, setLevel] = useState(0);
  const rooms = levels ? levels[Math.min(level, levels.length - 1)].rooms : housingConfig.rooms;
  const isMultiRoom = !!rooms?.length;
  const homeStyle: HomeStyle = citizen?.homeStyle?.[housingTier] ?? housingConfig.finish;
  const [upView, setUpView] = useState(isMultiRoom);
  // Looking down on the home, or over the shoulder in the room.
  const [view, setView] = useState<"above" | "inside" | "eye">("above");
  // Inside and Eye views: the stick (with RUN) to walk anywhere yourself.
  const stick = useRef<{ x: number; y: number; sprint?: boolean }>({ x: 0, y: 0 });
  const [stickRun, setStickRun] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string>("living");
  const [ritualsExpanded, setRitualsExpanded] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);

  useEffect(() => {
    setLevel(0);
    if (isMultiRoom) {
      setUpView(true);
      setActiveRoomId("living");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingTier]);

  /** Go to another floor: you arrive on the hall downstairs or the landing upstairs. */
  const changeLevel = (n: number) => {
    if (!levels || n === level || n < 0 || n >= levels.length) return;
    setPlacing(null);
    setLevel(n);
    setActiveRoomId(n > 0 ? "landing" : "hall");
  };

  /** Re-finish the home (floor, paint, panelling), paying for the change. */
  const restyle = (change: Partial<HomeStyle>, price: number, label: string) => {
    if (decorJob) { showToast("🧑‍🎨 Your decorator is working on the look right now."); return; }
    if (price > 0 && !adjustBalance(-price)) {
      showToast("⚠️ Not enough AED in your wallet!");
      return;
    }
    updateCitizen((c) => ({ ...c, homeStyle: { ...c.homeStyle, [housingTier]: { ...homeStyle, ...change } } }));
    gameAudio.playCoinSound();
    showToast(`✨ ${label}${price ? ` · AED ${price.toLocaleString()}` : ""}`);
  };

  const furniture = citizen?.furniture ?? [];
  // A new player's first job here: buy something, move things or hire a decorator. Their goals wait for that,
  // and follow as soon as they've done it (on leaving home, if they don't tap through to them here).
  const decorFirst = !!citizen?.decorFirst && isNewCitizen(citizen);
  const [triedMoving, setTriedMoving] = useState(false);
  useEffect(() => {
    if (!decorating) return;
    const t = setTimeout(() => setTriedMoving(true), 0);
    return () => clearTimeout(t);
  }, [decorating]);
  // Straight after moving in, getting the app comes first (installing, then notifications).
  const [appSetupOpen, setAppSetupOpen] = useState(false);
  useEffect(() => {
    if (!decorFirst) return;
    const t = setTimeout(() => { if (needsAppSetup()) setAppSetupOpen(true); }, 0);
    return () => clearTimeout(t);
  }, [decorFirst]);
  const decorated = triedMoving || !!decorJob
    || furniture.some((f) => !f.uid.startsWith("builtin:") && f.placement)
    || Object.keys(citizen?.homeStyle ?? {}).length > 0;
  const finishDecorFirst = () => updateCitizen((c) => ({ ...c, decorFirst: false }));
  useEffect(() => {
    if (!decorFirst || !decorated) return;
    return () => updateCitizen((c) => ({ ...c, decorFirst: false }));
  }, [decorFirst, decorated]);
  // No home on the map: the home you live in gets a generic address on your first party (lib/city/partyHome.ts).
  // During a party you and your guests share its live room, like any other home.
  const [starterHome, setStarterHome] = useState<FlatView | null>(null);
  useEffect(() => {
    if (activeFlat || !citizen?.id) return;
    let live = true;
    void myPartyHome().then((f) => { if (live) setStarterHome(f); });
    return () => { live = false; };
  }, [activeFlat, citizen?.id]);
  const homeOff = !activeFlat && starterHome && housingTierFor(starterHome.property_type, starterHome.bedrooms) === housingTier ? starterHome : null;
  const partyFlat = activeFlat ?? homeOff;
  const prepareHome = async () => {
    const r = await preparePartyHome(housingTier, furniture);
    if (!("error" in r)) void getFlat(r.id).then((f) => f && setStarterHome(f));
    return r;
  };
  // Your children at home, at their age: a newborn lying down, a crawler sitting, then up and about, growing taller
  // each week (Family app for their care). Tap one to open the Family app.
  const family = useFamily(citizen?.id);
  const nowMs = useNow();
  const kidsAtHome: Person[] = (family?.children ?? []).filter((c) => c.born).slice(0, 6).map((c, i) => {
    const { weeks, stage } = stageOf(c, nowMs);
    const scale = Math.min(0.75, 0.32 + weeks * 0.05);
    return {
      look: { gender: c.gender === "girl" ? "woman" : "man" },
      position: [-1.6 + (i % 3) * 0.9, 0, 1.6 + Math.floor(i / 3) * 0.9] as [number, number, number],
      rotation: Math.PI,
      animation: stage.id === "newborn" ? "sleep" : stage.id === "crawling" ? "sit" : weeks < 4 ? "wave" : "idle",
      scale,
      label: `${stage.icon} ${c.name ?? (c.gender === "girl" ? "Baby girl" : "Baby boy")} · ${stage.label}`,
      onClick: () => openPhone("hayati"),
    };
  });
  const shareHome = async () => {
    gameAudio.playClickSound();
    if (!partyFlat) {
      const r = await inviteFriends(citizen?.username);
      if (r === "copied") showToast("Invite link copied. Send it to your friends!");
      return;
    }
    const refPart = citizen?.username ? `ref=${encodeURIComponent(citizen.username)}&` : "";
    const url = `${window.location.origin}/?${refPart}go=${encodeURIComponent(flatRoute(partyFlat))}`;
    const text = `Come and visit my ${activeHomeTitle} (${activeHomeArea}) in Dubai Life!`;
    if (navigator.share) {
      try { await navigator.share({ title: activeHomeTitle, text, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); showToast("Invite link copied. Send it to your friends!"); } catch { /* blocked */ }
  };
  // A party on at this home right now (yours): its decorations go up.
  const party = usePartyHere(partyFlat ? flatRoute(partyFlat) : null, false);
  // During your party you're in the same live room as your guests (the one they join at your door): you see them
  // and they see you.
  const [dancing, setDancing] = useState(false);
  const [pose, setPose] = useState<"sit" | "sleep" | null>(null);
  const [lightsSet, setLightsSet] = useState<boolean | null>(null);
  const lightsOut = lightsSet ?? !!party?.lightsOut;
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  // Hostesses bringing drinks to whoever ordered.
  const [runs, setRuns] = useState<HostessRun[]>([]);
  const serve = (id: string, name: string, to: [number, number]) => setRuns((r) => [...r, { id: `${id}-${Date.now()}`, name, to, who: id }].slice(-6));
  // The drink the hostess hands me, held for the rest of the party.
  const [drink, handDrink] = usePartyDrink();
  // Sit: walk to the nearest free seat (the room finds it). Each tap is a new ask.
  const [seatCall, setSeatCall] = useState<{ n: number; sit: boolean } | undefined>(undefined);
  const askSeat = (sit: boolean) => setSeatCall((c) => ({ n: (c?.n ?? 0) + 1, sit }));
  const myMood = dancing ? "dance" : pose ?? (party && citizen ? partyMood(citizen.id) : "idle");
  // Where I am, shared when I set off and when I stop, so my guests see me move.
  const [where, setWhere] = useState<{ x: number; z: number; yaw: number; walking: boolean; lift?: number; rest?: "sit" | "sleep" }>({ x: -3.25, z: 0, yaw: 0, walking: false });
  // Sent when I set off (where I'm heading) and when I stop: everyone else walks me there in between.
  const onMove = (x: number, z: number, yaw: number, walking: boolean, lift?: number, rest?: "sit" | "sleep") => {
    setWhere({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, yaw: Math.round(yaw * 100) / 100, walking, lift: lift ? Math.round(lift * 100) / 100 : undefined, rest });
  };
  const partyRoom = useRoom(party && partyFlat ? `flat:${partyFlat.id}` : null, { x: where.x, z: where.z, face: where.yaw, animation: where.walking ? "walk" : where.rest ?? myMood, lift: where.lift, level, hold: drink ?? undefined, dirty: isDirty(citizen?.needs?.hygiene) }, (e) => {
    // Drinks: the hostess goes to wherever they are.
    if (e.type === "party" && e.action === "drinks") serve(e.from.userId, e.from.username, [e.from.x, e.from.z]);
    const text = e.type === "chat" ? e.text : e.type === "wave" ? "👋" : null;
    if (!text) return;
    setBubbles((b) => ({ ...b, [e.from.userId]: text }));
    setTimeout(() => setBubbles((b) => { const next = { ...b }; if (next[e.from.userId] === text) delete next[e.from.userId]; return next; }), 6000);
  });
  // At a party in a home off the map, guests see the host's furniture: moving things round updates their copy.
  const furnitureKey = JSON.stringify(furniture.filter((f) => f.placement));
  useEffect(() => {
    if (!party?.isHost || activeFlat || !homeOff) return;
    const t = setTimeout(() => { void preparePartyHome(housingTier, furniture); }, 2000);
    return () => clearTimeout(t);
  }, [furnitureKey, party?.isHost, !!activeFlat, homeOff?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const dance = (seconds: number) => { setPose(null); setDancing(true); setTimeout(() => setDancing(false), seconds * 1000); };
  // One spot each, so nobody stands on anyone else.
  const guestSpots = spotsFor(partyRoom.peers.map((p) => p.userId));
  // Only the guests on the floor I'm on.
  const guests: Person[] = partyRoom.peers.filter((p) => (p.level ?? 0) === level).map((p) => ({
    look: p.look,
    position: Number.isFinite(p.x) ? [p.x, p.lift ?? 0, p.z] : guestSpots.get(p.userId)!,
    holding: drinkInHand(p.hold)?.prop,
    carryMode: drinkInHand(p.hold)?.mode,
    dirty: p.dirty,
    // Facing whoever's nearest, so they dance with each other.
    rotation: p.face ?? faceNearest([p.x, 0, p.z], [[where.x, 0, where.z], ...partyRoom.peers.map((o) => [o.x, 0, o.z] as [number, number, number])]) ?? 0,
    animation: p.animation,
    label: `${p.away ? "💤 " : ""}@${p.username}`,
    bubble: bubbles[p.userId],
    onClick: () => setGuestId(p.userId),
  }));
  const [guestId, setGuestId] = useState<string | null>(null);
  const openShop = () => { setShopTab("shop"); setBuyModalOpen(true); };
  const stored = withHomeItems(furniture, housingTier).filter((f) => !f.placement);
  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const placingIsPlaced = !!(placing && furniture.find((f) => f.uid === placing.uid)?.placement);

  // Wellbeing meters live on the citizen, so food bought around the city counts here too.
  const needs = { ...DEFAULT_NEEDS, ...citizen?.needs };
  const setNeeds = (fn: (n: Needs) => Needs) => updateCitizen((c) => ({ ...c, needs: fn({ ...DEFAULT_NEEDS, ...c.needs }) }));

  const handleTriggerHomeActivity = (act: HomeActivityDef) => {
    // A shower is taken in the shower: walk into the bathroom and use it (its sheet does the rest).
    if (/shower/i.test(act.id) && fixturesFor(housingTier, level).some((f) => f.kind === "shower")) {
      gameAudio.playClickSound();
      setFixtureCall((c) => ({ n: (c?.n ?? 0) + 1, kind: "shower" }));
      return;
    }
    if (act.cost && walletBalance < act.cost) {
      showToast("⚠️ Not enough AED in your wallet!");
      return;
    }
    if (act.cost) {
      adjustBalance(-act.cost);
    }
    gameAudio.playClickSound();
    setNeeds((prev) => ({
      ...prev,
      [act.need.kind]: Math.min(100, (prev[act.need.kind] ?? 70) + act.need.amount),
    }));
    if (act.statBoost) {
      gainSkill(act.statBoost.name as any, act.statBoost.amount);
    }
    showToast(`${act.icon} ${act.label} · +${act.need.amount} ${act.need.kind.toUpperCase()}`);
  };


  useEffect(() => {
    setIsAudioMuted(gameAudio.getIsMuted());
  }, []);

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const startPlacing = (uid: string, itemId: string, rot: Rotation = 0) => {
    setBuyModalOpen(false);
    setPlacing({ uid, itemId, rot });
  };

  const handleBuy = (item: CatalogItem) => {
    const uid = buyFurniture(item.id, item.price);
    if (!uid) {
      showToast("⚠️ Not enough AED in your wallet!");
      return;
    }
    gameAudio.playCoinSound();
    startPlacing(uid, item.id);
    showToast(`🎉 Bought ${item.name}! ${item.kind === "wall" ? "Tap a wall" : "Tap the floor"} to place it.`);
  };

  const handlePlace = (uid: string, placement: Placement) => {
    setFurniturePlacement(uid, placement, housingTier);
    setPlacing(null);
    gameAudio.playClickSound();
  };

  const handlePickUp = (uid: string) => {
    const f = withHomeItems(furniture, housingTier).find((x) => x.uid === uid);
    if (!f) return;
    gameAudio.playClickSound();
    setPlacing({ uid, itemId: f.itemId, rot: f.placement?.kind === "floor" ? f.placement.rot : 0 });
  };

  const rotatePlacing = () => setPlacing((p) => (p ? { ...p, rot: (((p.rot + 1) % 4) as Rotation) } : p));

  const storePlacing = () => {
    if (!placing) return;
    setFurniturePlacement(placing.uid, null, housingTier);
    setPlacing(null);
    showToast("📦 Moved to storage. Open Buy → Storage to place it again.");
  };

  // Keyboard shortcuts while placing: R rotates, Esc cancels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!placing) return;
      if (e.key === "r" || e.key === "R") rotatePlacing();
      if (e.key === "Escape") setPlacing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing]);

  const handleInteractObject = (type: Interaction) => {
    gameAudio.playClickSound();

    if (type === "cooler") {
      setNeeds(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 15) }));
      lifeEvent("cook");
      gainSkill("cooking", 12);
      showToast("🍎 Ate a healthy snack from the cooler! Hunger restored.");
    } else if (type === "bed") {
      setNeeds(prev => ({ ...prev, energy: Math.min(100, prev.energy + 20) }));
      showToast("😴 Took a relaxing power nap. Energy restored!");
    } else if (type === "chair") {
      setNeeds(prev => ({ ...prev, fun: Math.min(100, prev.fun + 10) }));
      showToast("🪑 Sat down to unwind. Fun increased!");
    } else if (type === "door") {
      router.push("/explore");
    } else if (type === "stairs") {
      showToast(level === 0 ? "🪜 Heading upstairs…" : "🪜 Heading downstairs…");
    }
  };

  return (
    // Pinned to the screen so Safari never scrolls the page (which turns taps into scrolls).
    <main className="fixed inset-0 w-screen h-[100dvh] bg-[#788e6e] overflow-hidden overscroll-none select-none font-sans touch-none">
      
      {/* 3D Isometric Apartment Interior */}
      <ApartmentRoom
        people={[...matesInRoom(bedspace, onlineNames, (m) => router.push(`/phone?tab=chats&chat=${m.id}`)), ...guests, ...kidsAtHome]}
        look={citizen?.look}
        furniture={furniture}
        placing={placing}
        decorating={decorating}
        turns={turns}
        housingTier={housingTier}
        upView={upView}
        view={view}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onPlace={handlePlace}
        onPickUp={handlePickUp}
        onPlaceBlocked={() => showToast("🚫 It doesn't fit there. Try a green spot.")}
        onInteractObject={handleInteractObject}
        onUseFixture={(f) => setFixture(f)}
        using={usingFixture}
        fixtureCall={fixtureCall}
        level={level}
        onChangeLevel={changeLevel}
        homeStyle={homeStyle}
        partyDecor={party?.decor}
        lightsOut={!!party && lightsOut}
        myAnimation={party ? myMood : undefined}
        onMove={party ? onMove : undefined}
        seatCall={party ? seatCall : undefined}
        holding={party ? drinkInHand(drink) : undefined}
        dirty={isDirty(citizen?.needs?.hygiene)}
        stick={view !== "above" ? stick : undefined}
        stickRun={stickRun}
        extras={<PartyHostesses runs={runs} onArrive={(r) => { if (r.who === citizen?.id) handDrink(); }} onDone={(id) => setRuns((r) => r.filter((x) => x.id !== id))} />}
      />

      {view !== "above" && !placing && !decorating && !cleanScreen && (
        <div className="absolute left-4 bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+6rem))] z-30"><MoveStick controls={stick} run={stickRun} onRun={() => setStickRun((r) => !r)} /></div>
      )}
      {/* Middle right (user, 2026-11-04): ☰ Menu (everything about the home), 🎉 Party (during a party), the three views,
          the phone, and the clean-screen eye. Outside and Rituals are at the bottom right, beside the stick. */}
      <SideBar>
        {!cleanScreen && <SideButton icon={<Menu className="w-5 h-5" />} label="Menu" tone="dark" active={homeMenuOpen} onClick={() => { gameAudio.playClickSound(); setPartyPanel(false); setHomeMenuOpen((o) => !o); }} />}
        {!cleanScreen && party && <SideButton icon="🎉" label="Party" tone="party" active={partyPanel} onClick={() => { gameAudio.playClickSound(); setHomeMenuOpen(false); setPartyPanel((o) => !o); }} />}
        {!cleanScreen && <ViewCycle view={view} onChange={(v) => { gameAudio.playClickSound(); setView(v as "above" | "inside" | "eye"); setUpView(false); }} />}
        {!cleanScreen && <SideButton icon={<Smartphone className="w-5 h-5" />} label={unread ? `Phone: ${unread} unread` : "Phone"} badge={unread} onClick={() => openPhone()} />}
        <SideButton icon={cleanScreen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} label={cleanScreen ? "Show everything" : "Clean screen"} onClick={() => { setHomeMenuOpen(false); setPartyPanel(false); setCleanScreen((c) => !c); }} />
      </SideBar>
      {partyPanel && party && !cleanScreen && (
        <FloatMenu label="Party" onClose={() => setPartyPanel(false)}>
          <PartyActions list party={party} lightsOut={lightsOut} onLights={setLightsSet} onDance={(sec) => { if (where.rest) askSeat(false); dance(sec); }} pose={dancing ? "dance" : pose} onPose={(x) => { setDancing(false); setPose(x === "dance" ? null : x); if (x === "sit" || pose === "sit") askSeat(x === "sit"); }} announce={(text) => partyRoom.emit({ type: "chat", text })} broadcast={(action, on) => { partyRoom.emit({ type: "party", action, on }); if (action === "drinks") serve(citizen?.id ?? "me", citizen?.username ?? "you", [where.x, where.z]); }} />
        </FloatMenu>
      )}
      {/* Bottom right, beside the stick: going outside. */}
      {!cleanScreen && !placing && (
        <button onClick={() => { gameAudio.playClickSound(); router.push(`/street?home=1&from=${encodeURIComponent(activeFlat?.building_id ?? "home")}&area=${encodeURIComponent(activeFlat ? activeBuildingName ?? housingConfig.area : housingConfig.area)}${hasPlot(housingTier) ? "&villa=1" : ""}`); }}
          className="fixed right-3 bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+4.75rem))] sm:bottom-24 z-30 h-11 pl-3 pr-4 rounded-full bg-emerald-600 text-white shadow-lg flex items-center gap-1.5 font-black text-sm active:scale-95" aria-label="Go outside">
          🚪 <span>Outside</span>
        </button>
      )}

      {/* Decorate mode banner */}
      {decorating && !placing && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-950/90 backdrop-blur-md text-white text-xs sm:text-sm font-bold pl-4 pr-1.5 py-1.5 rounded-full shadow-2xl">
          <Move className="w-4 h-4 text-emerald-400" />
          <span>Tap any item in your home (bed, chair, sofa, table, fridge) to move or rotate it</span>
          <button onClick={() => setDecorating(false)} className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black">Done</button>
        </div>
      )}

      {/* Placement toolbar */}
      {placing && placingItem && (
        <div className="fixed bottom-3 sm:bottom-5 left-0 w-full z-50 px-3 pointer-events-none">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-white shadow-[0_16px_48px_rgba(0,0,0,0.25)] rounded-3xl p-3 pointer-events-auto space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{placingItem.icon}</span>
              <div className="min-w-0">
                <div className="font-black text-sm text-slate-900 truncate">{placingItem.name}</div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {placingItem.kind === "wall" ? "Tap a wall to hang it." : "Tap the floor to place it."} Green means it fits.
                  <span className="hidden sm:inline"> R rotates · Esc cancels.</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {placingItem.kind !== "wall" && (
                <button onClick={rotatePlacing} className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95">
                  <RotateCw className="w-3.5 h-3.5" /> Rotate
                </button>
              )}
              <button onClick={storePlacing} className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95">
                <Package className="w-3.5 h-3.5" /> Store
              </button>
              <button onClick={() => setPlacing(null)} className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95">
                <X className="w-3.5 h-3.5" /> {placingIsPlaced ? "Cancel move" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR (Image 2) */}
      {!cleanScreen && (
        <header className="absolute top-[max(0.75rem,env(safe-area-inset-top))] sm:top-5 left-0 w-full z-40 pointer-events-none px-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto bg-white/95 hover:bg-white backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] pl-1.5 pr-2.5 sm:pr-4 py-1.5 rounded-full transition-all">
            
            {/* Avatar (Opens Profile, Visa & Budget, League Modal) + Clock & Mood */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm font-bold text-slate-800 min-w-0">
              <button
                onClick={() => {
                  gameAudio.playClickSound();
                  openLife("profile");
                }}
                title="Open Profile, Visa & Budget, and League"
                aria-label="Open Profile, Visa & Budget, and League"
                className="relative flex items-center gap-1.5 pr-2 pl-0.5 py-0.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 border border-slate-200/80 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rosterThumb(presetFor(citizen?.look ?? { gender: "woman" }))}
                    alt=""
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover object-top bg-sky-100 ring-2 ring-amber-400"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                      life && life.visaTier !== "GOLDEN" && life.visaDaysLeft <= 7 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                </div>
                {life ? (
                  <span className="hidden xs:flex flex-col items-start leading-none">
                    <span className="text-[10px] font-black text-slate-900 flex items-center gap-0.5">
                      🔥{life.streak}d
                    </span>
                    <span
                      className={`text-[8px] font-extrabold ${
                        life.visaTier !== "GOLDEN" && life.visaDaysLeft <= 7 ? "text-rose-600" : "text-slate-500"
                      }`}
                    >
                      {life.visaTier === "GOLDEN" ? "Golden" : `${life.visaDaysLeft}d visa`}
                    </span>
                  </span>
                ) : (
                  <span className="hidden xs:inline text-[10px] font-black text-slate-800">Profile</span>
                )}
              </button>

              <span className="flex items-center gap-1 font-mono whitespace-nowrap">
                {(() => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "numeric", hour12: false }).format(new Date())); return h >= 6 && h < 19 ? "☀️" : "🌙"; })()} {clock}
              </span>
              <div className="w-[1px] h-3.5 bg-slate-200" />
              {(() => {
                const avg = (needs.hunger + needs.energy + needs.fun + needs.social + needs.hygiene + needs.bladder) / 6;
                const [label, tone] = avg >= 70 ? ["🙂 Happy", "text-emerald-600"] : avg >= 40 ? ["😐 Okay", "text-amber-600"] : ["😟 Low", "text-rose-600"];
                return <button onClick={() => { gameAudio.playClickSound(); openLife("needs"); }} className={`flex items-center gap-1 font-extrabold text-xs whitespace-nowrap ${tone} hover:opacity-80 cursor-pointer`}><span>{label.split(" ")[0]}</span><span className="hidden xs:inline sm:inline">{label.split(" ")[1]}</span></button>;
              })()}
            </div>

            {/* Online stats (Center) */}
            <div className="hidden xs:flex sm:flex items-center gap-2 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{compact(visits)}</span>
              </div>
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-600 font-extrabold">{formatOnline(onlineCount)} online</span>
            </div>

            {/* Audio Toggle & Wallet Pill (Right) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextMuted = gameAudio.toggleMute();
                  setIsAudioMuted(nextMuted);
                }}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isAudioMuted ? "Unmute" : "Mute"}
                aria-label={isAudioMuted ? "Unmute" : "Mute"}
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <Link href="/wallet" className="flex items-center gap-1.5 whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-black font-mono shadow-sm" aria-label="Wallet">
                <span className="sm:hidden">AED {new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(walletBalance)}</span>
                <span className="hidden sm:inline">AED {walletBalance.toLocaleString()}</span>
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center ml-0.5"><Plus className="w-3 h-3 stroke-[3]" /></span>
              </Link>

              <button
                onClick={() => askLogout()}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </header>
      )}

      {/* Floors and rooms, one scrolling row. Everything else about the home is in the menu on the right. */}
      {!cleanScreen && !party && (levels || (rooms && rooms.length > 0)) && (
        <div className="absolute top-[4.5rem] sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[96vw]">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-slate-200 overflow-x-auto [scrollbar-width:none]">
            {levels?.map((l, i) => (
              <button
                key={l.label}
                onClick={() => { changeLevel(i); gameAudio.playClickSound(); }}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${level === i ? "bg-amber-400 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {l.icon} {l.label}
              </button>
            ))}
            {levels && rooms && rooms.length > 0 && <span className="shrink-0 w-px h-5 bg-slate-200 mx-0.5" />}
            {rooms?.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveRoomId(r.id); gameAudio.playClickSound(); }}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all flex items-center gap-1 ${activeRoomId === r.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {party && partyFlat && <PartyPeople room={partyRoom} place={activeHomeTitle} peerId={guestId} setPeerId={setGuestId} say={showToast} />}
      {party && !cleanScreen && <PartyBanner party={party} className="top-[calc(max(0.75rem,env(safe-area-inset-top))+7.25rem)]" />}
      {partyOpen && <PartySheet
        flat={activeFlat ? { id: activeFlat.id, route: flatRoute(activeFlat), title: activeHomeTitle, area: activeHomeArea }
          : hasRoom(housingTier) ? { id: homeOff?.id ?? "", route: homeOff ? flatRoute(homeOff) : "", title: housingConfig.label, area: homeOff ? towerName(homeOff.building_id) : `${areaFor(housingTier)} Residences`, prepare: prepareHome }
          : null}
        noRoom={!activeFlat && !hasRoom(housingTier) ? "A shared bed space isn't a room of your own. Move to a studio or bigger to host." : undefined}
        onClose={() => setPartyOpen(false)} />}
      {homeMenuOpen && !cleanScreen && (
        <SidePopover title="Your home" onClose={() => setHomeMenuOpen(false)}>
            <HomeMenuRow icon={housingConfig.icon} title={activeHomeTitle} text={`${activeHomeArea} · Switch home`} onClick={() => { setHomeMenuOpen(false); setTierModalOpen(true); }} />
            {hasPlot(housingTier) && <HomeMenuRow icon="🏡" title="Outside the house" text="Add a pool, garage, garden or car park" onClick={() => { setHomeMenuOpen(false); setExteriorOpen(true); }} />}
            <HomeMenuRow icon="🧑‍🎨" title={decorJob ? "Decorator at work" : "Employ a decorator"} text={decorJob ? "See how it's going" : "A player decorates with your budget"} onClick={() => { setHomeMenuOpen(false); setDecoratorOpen(true); }} />
            <HomeMenuRow icon="🎉" title="Throw a house party" text="Pick a time and send invite links" onClick={() => { setHomeMenuOpen(false); setPartyOpen(true); }} />
            {partyFlat && <HomeMenuRow icon="💌" title="Invite a player to your home" text="Pick someone from your chats" onClick={() => { setHomeMenuOpen(false); router.push("/phone?tab=chats"); }} />}
            <HomeMenuRow icon="🔗" title={partyFlat ? "Share an invite link" : "Invite a friend to Dubai Life"} text={partyFlat ? "Send it to anyone" : "Throw a party to have people over"} onClick={() => { setHomeMenuOpen(false); void shareHome(); }} />
            {housingConfig.hasDollhouseUpView && <HomeMenuRow icon={upView ? "🔍" : "📐"} title={upView ? "Focus on one room" : "See the whole floor"} text="Change the view" onClick={() => { setUpView(!upView); setHomeMenuOpen(false); }} />}
            {/* During a party the floors and rooms strip would sit under the party banner: it's here instead. */}
            {party && (levels || (rooms && rooms.length > 0)) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {levels?.map((l, i) => (
                  <button key={l.label} onClick={() => changeLevel(i)} className={`px-2.5 h-8 rounded-full text-[11px] font-black ${level === i ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}>{l.icon} {l.label}</button>
                ))}
                {rooms?.map((r) => (
                  <button key={r.id} onClick={() => setActiveRoomId(r.id)} className={`px-2.5 h-8 rounded-full text-[11px] font-black ${activeRoomId === r.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{r.icon} {r.label}</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button onClick={() => setTurns((t) => t - 1)} className="h-10 rounded-2xl bg-slate-100 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"><RotateCcw className="w-4 h-4" /> Turn left</button>
              <button onClick={() => setTurns((t) => t + 1)} className="h-10 rounded-2xl bg-slate-100 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"><RotateCw className="w-4 h-4" /> Turn right</button>
            </div>
        </SidePopover>
      )}

      {exteriorOpen && (
        <ExteriorSheet owned={homeStyle.exterior ?? []} payer="your balance"
          onAdd={(id, price, name) => restyle({ exterior: [...(homeStyle.exterior ?? []), id] }, price, `${name} added outside`)}
          onRemove={(id, name) => restyle({ exterior: (homeStyle.exterior ?? []).filter((x) => x !== id) }, 0, `${name} removed`)}
          onHire={() => { setExteriorOpen(false); setDecoratorOpen(true); }}
          onClose={() => setExteriorOpen(false)} />
      )}
      {/* An interior decorator at work here, and the reveal when they're done; choosing one. */}
      {!cleanScreen && <DecoratorStatus tier={housingTier} job={decorJob} reload={reloadDecor} />}
      {decoratorOpen && <DecoratorSheet tier={housingTier} preselect={hireParam} onClose={() => setDecoratorOpen(false)} onHired={() => { setBuyModalOpen(false); void reloadDecor(); }} />}

      {/* RELATABLE HOME ACTIVITIES DOCK (Collapsible Floating Pill / Expanded Drawer) */}
      {!cleanScreen && !placing && (
        <div className={`fixed z-30 pointer-events-auto ${ritualsExpanded ? "bottom-[4.85rem] sm:bottom-24 left-1/2 -translate-x-1/2" : "right-3 bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+8rem))] sm:bottom-40"}`}>
          {!ritualsExpanded ? (
            <button
              onClick={() => {
                gameAudio.playClickSound();
                setRitualsExpanded(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl border border-white/20 hover:border-amber-400/60 transition-all active:scale-95 group hover:shadow-amber-500/10 cursor-pointer"
              title="Open Home Rituals & Activities (Tap to expand)"
              aria-label="Open Home Rituals & Activities"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="text-[11px] font-black tracking-wide text-white">Rituals</span>
              <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                +{housingConfig.activities.length}
              </span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          ) : (
            <div className="max-w-[94vw] sm:max-w-xl w-[94vw] sm:w-[32rem] px-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-white/95 backdrop-blur-2xl border border-white shadow-[0_16px_48px_rgba(0,0,0,0.22)] rounded-2xl p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Home Rituals & Activities</span>
                    {rooms && (
                      <span className="text-[10px] text-slate-400 font-semibold">({rooms?.find(r => r.id === activeRoomId)?.label ?? "All"})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Replenish Vitals</span>
                    <button
                      onClick={() => {
                        gameAudio.playClickSound();
                        setRitualsExpanded(false);
                      }}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Collapse Rituals"
                      aria-label="Collapse Rituals"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Today's to-dos live here rather than as cards over the room . */}
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div className={`flex items-center gap-2 p-2 rounded-xl border ${needs.hunger < 50 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"}`}>
                      <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm shrink-0">🍎</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-800 leading-tight">Eat something</div>
                        <div className="text-[9px] text-slate-400 font-medium truncate">Tap the fridge or kitchen</div>
                      </div>
                    </div>
                    <button onClick={() => { gameAudio.playClickSound(); setRitualsExpanded(false); setRunPicker(true); }} className="col-span-2 flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-left active:scale-[0.98]">
                      <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm shrink-0">🏃</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black text-slate-800 leading-tight">Go for a run</div>
                        <div className="text-[9px] text-slate-500 font-medium truncate">City Walk, JBR Beach Walk or round the block</div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">+Fun</span>
                    </button>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0">💎</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-800 leading-tight">Daily gem hunt</div>
                        <div className="text-[9px] text-slate-400 font-medium truncate">Find today&apos;s gem around the city</div>
                      </div>
                    </div>
                  </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(rooms
                    ? housingConfig.activities.filter((a) => !a.room || a.room === activeRoomId || a.room === "living" || a.room === "bedroom")
                    : housingConfig.activities
                  ).slice(0, 4).map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleTriggerHomeActivity(act)}
                      className="flex flex-col items-start p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 text-left transition-all active:scale-95 group"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xl group-hover:scale-110 transition-transform">{act.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/60 px-1 py-0.5 rounded">
                          +{act.need.amount} {act.need.kind}
                        </span>
                      </div>
                      <div className="text-[11px] font-black text-slate-800 leading-tight truncate w-full">{act.label}</div>
                      <div className="text-[9px] text-slate-400 font-medium truncate w-full">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Image 2) */}
      {!cleanScreen && !placing && (
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-5 left-0 w-full z-40 pointer-events-none px-4">
          <div className="max-w-sm sm:max-w-2xl mx-auto bg-white/95 backdrop-blur-2xl border border-white shadow-[0_16px_48px_rgba(0,0,0,0.25)] rounded-full p-1.5 flex items-center justify-between pointer-events-auto">
            {/* Home (Active) */}
            <button className="flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full bg-slate-900 text-white font-black text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-md">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            {/* Buy Furniture */}
            <button 
              onClick={() => setBuyModalOpen(true)}
              className="flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Buy</span>
            </button>

            {/* Wardrobe: change clothes */}
            <button
              onClick={() => setWardrobeModalOpen(true)}
              className="flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Wardrobe</span>
            </button>

            {/* Decorate: move furniture */}
            <button
              onClick={() => setDecorating((d) => !d)}
              className={`flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full font-bold text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors ${decorating ? "bg-emerald-500 text-white" : "hover:bg-slate-100 text-slate-700"}`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Decorate</span>
            </button>

            {/* Map (Routes to /explore) */}
            <button 
              onClick={() => router.push("/explore")}
              className="flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>

          </div>
        </div>
      )}

      {/* Floating Interactive Toast */}
      {runPicker && (
        <Sheet icon="🏃" title="Go for a run" subtitle="Out of your front door and back" onClose={() => setRunPicker(false)}>
          <div className="space-y-2">
            {RUNS.routes.map((r) => (
              <button key={r.id} onClick={() => setRunRoute(r.id as RouteId)} className={`w-full flex items-center gap-3 p-3 rounded-[22px] text-left ${runRoute === r.id ? "bg-emerald-50 ring-2 ring-emerald-500" : "bg-slate-100/80"}`}>
                <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl">{r.icon}</span>
                <span className="flex-1 min-w-0"><span className="block font-semibold">{r.name}</span><span className="block text-sm text-slate-500">{r.desc}</span></span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {RUNS.distances.map((d) => (
              <button key={d} onClick={() => setRunDistance(d)} className={`h-14 rounded-full font-semibold ${runDistance === d ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                {runRoute === "block" ? `${d * 2} m loop` : `${d} m out and back`}
              </button>
            ))}
          </div>
          <button onClick={() => { gameAudio.playClickSound(); setRunPicker(false); setOnRun(true); }} className="w-full h-14 rounded-full bg-emerald-700 text-white text-lg font-semibold shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]">Start running</button>
        </Sheet>
      )}
      {onRun && (
        <RunJourney route={runRoute} distance={runDistance} look={citizen?.look} onDone={(r) => {
          applyRun(r);
          setOnRun(false);
          if (r.fraction > 0.05) showToast(`🏃 ${r.metres} m run · ${r.fraction >= 1 ? "great work!" : "cut short, still counts"}`);
        }} />
      )}

      {fixture && !running && (
        <FixtureSheet fixture={fixture} onClose={() => setFixture(null)} onStart={(a) => { gameAudio.playClickSound(); setRunning(a); setUsingFixture(fixture.id); setFixture(null); }} />
      )}
      {running && (
        <div className="absolute left-3 top-[max(7.5rem,calc(env(safe-area-inset-top)+7rem))] z-40 pointer-events-auto">
          <FixtureProgress
            key={running.id}
            action={running}
            onCancel={() => { setRunning(null); setUsingFixture(null); }}
            onDone={() => { completeFixtureAction(running); showToast(`${running.icon} ${running.label}: done`); setRunning(null); setUsingFixture(null); }}
          />
        </div>
      )}

      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {citizen && !decorFirst && !party && !cleanScreen && !placing && !decorating && <HomeActions onShop={openShop} />}
      {decorFirst && appSetupOpen && citizen && <AppSetup userId={citizen.id} onClose={() => setAppSetupOpen(false)} />}
      {decorFirst && !appSetupOpen && !cleanScreen && !placing && !decorating && !buyModalOpen && !decoratorOpen && (
        <MoveInGuide
          name={citizen?.username ?? ""}
          decorated={decorated}
          hired={!!decorJob}
          onShop={openShop}
          onMove={() => setDecorating(true)}
          onDecorator={() => setDecoratorOpen(true)}
          onDone={finishDecorFirst}
        />
      )}

      {/* 2. BUY FURNITURE MODAL */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-md max-h-[85dvh] overflow-y-auto z-50 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Apartment Furniture Shop</h3>
            <span className="text-xs font-mono font-bold text-emerald-600">AED {walletBalance.toLocaleString()}</span>
          </div>

          <div className="flex gap-1 p-1 mt-3 bg-slate-100 rounded-xl text-xs font-black">
            <button onClick={() => setShopTab("shop")} className={`flex-1 py-1.5 rounded-lg ${shopTab === "shop" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>Shop</button>
            <button onClick={() => setShopTab("storage")} className={`flex-1 py-1.5 rounded-lg ${shopTab === "storage" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>Storage{stored.length ? ` (${stored.length})` : ""}</button>
            <button onClick={() => setShopTab("style")} className={`flex-1 py-1.5 rounded-lg ${shopTab === "style" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>✨ Style</button>
          </div>

          {shopTab === "style" ? (
            <div className="pt-3 space-y-4">
              {decorJob ? (
                <section className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  🧑‍🎨 Your decorator has the key and is working on the look. You can change the style again once they&apos;re done.
                </section>
              ) : (
                <button onClick={() => setDecoratorOpen(true)} className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-left flex items-center gap-3 active:scale-[0.99]">
                  <span className="text-2xl">🧑‍🎨</span>
                  <span className="flex-1">
                    <span className="block font-black text-sm">Hire an interior decorator</span>
                    <span className="block text-[11px] text-white/80">Set a budget, and a player does it all while you&apos;re out.</span>
                  </span>
                  <span className="text-lg">›</span>
                </button>
              )}
              <section>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Flooring</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FLOOR_FINISHES.map((f) => {
                    const current = homeStyle.floor === f.id;
                    return (
                      <button
                        key={f.id}
                        disabled={current}
                        onClick={() => restyle({ floor: f.id }, f.price, `New floor: ${f.label}`)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${current ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50 active:scale-95"}`}
                      >
                        <span className={`block h-8 rounded-lg mb-1.5`} style={{ background: FLOOR_SWATCH[f.id] }} />
                        <span className="block text-[11px] font-black text-slate-900 leading-tight">{f.label}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600">{current ? "In your home" : f.price ? `AED ${f.price.toLocaleString()}` : "Free"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Wall paint</h4>
                <div className="grid grid-cols-4 gap-2">
                  {WALL_PAINTS.map((w) => {
                    const current = homeStyle.wall.toLowerCase() === w.color;
                    return (
                      <button
                        key={w.id}
                        disabled={current}
                        title={w.label}
                        onClick={() => restyle({ wall: w.color }, w.price, `Walls painted ${w.label}`)}
                        className={`p-1.5 rounded-2xl border text-center transition-all ${current ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50 active:scale-95"}`}
                      >
                        <span className="block h-8 rounded-lg border border-black/5" style={{ background: w.color }} />
                        <span className="block text-[10px] font-black text-slate-800 mt-1 leading-tight">{w.label}</span>
                        <span className="text-[9px] font-mono font-bold text-emerald-600">{current ? "✓" : w.price ? `AED ${w.price.toLocaleString()}` : "Free"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900">🏛️ Panelled walls & cove lighting</h4>
                  <p className="text-[11px] text-slate-500">Raised panels, a chair rail, crown moulding and a warm LED cove.</p>
                </div>
                <button
                  onClick={() => restyle({ panels: !homeStyle.panels }, homeStyle.panels ? 0 : PANELS_PRICE, homeStyle.panels ? "Panelling removed" : "Walls panelled")}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap active:scale-95 ${homeStyle.panels ? "bg-slate-100 text-slate-700" : "bg-emerald-500 text-white"}`}
                >
                  {homeStyle.panels ? "Remove" : `AED ${PANELS_PRICE.toLocaleString()}`}
                </button>
              </section>
            </div>
          ) : shopTab === "shop" ? (
            <div className="space-y-2.5 pt-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {[{ id: "all" as const, label: "All", icon: "🛍️" }, ...SHOP_CATEGORIES].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setShopCat(c.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap border ${shopCat === c.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              {CATALOG.filter((item) => shopCat === "all" || item.category === shopCat).map(item => {
                const owned = furniture.filter((f) => f.itemId === item.id).length;
                return (
                  <div key={item.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="min-w-0">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900">{item.name}</h4>
                        <p className="text-[11px] text-slate-500">{item.desc}{owned ? ` · ${owned} owned` : ""}</p>
                        <span className="text-xs font-mono font-extrabold text-emerald-600 mt-0.5 block">AED {item.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuy(item)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-95"
                    >
                      Buy
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5 pt-3">
              {stored.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">Nothing in storage. Items you buy or store from the room appear here.</p>
              )}
              {stored.map((f) => {
                const item = getCatalogItem(f.itemId);
                if (!item) return null;
                return (
                  <div key={f.uid} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">{item.name}</h4>
                    </div>
                    <button
                      onClick={() => startPlacing(f.uid, f.itemId)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all active:scale-95"
                    >
                      Place
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. MY PROPERTIES (OWNED & RENTED) SWITCHER MODAL */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-md max-h-[85dvh] overflow-y-auto z-50 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🏠</span> My Properties
              </h3>
              <p className="text-xs text-slate-500">Switch between your owned & rented residences in Dubai</p>
            </div>
            <button onClick={() => setTierModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 pt-3">
            {/* Prominent Employ Interior Decorator CTA */}
            <button
              onClick={() => {
                setTierModalOpen(false);
                setDecoratorOpen(true);
                gameAudio.playClickSound();
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-left flex items-center gap-3 shadow-md active:scale-[0.99] transition-transform cursor-pointer"
            >
              <span className="text-2xl">🧑‍🎨</span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-xs sm:text-sm">
                  {decorJob ? "Interior Decorator at Work" : "Employ an Interior Decorator"}
                </span>
                <span className="block text-[11px] text-white/85">
                  {decorJob
                    ? "Your decorator has the key and is transforming this home."
                    : "Drop your key — they'll shop, paint and furnish your home."}
                </span>
              </span>
              <span className="text-lg font-black">›</span>
            </button>

            {/* Owned & Rented Properties from `flats` */}
            {sortedFlats.length > 0 ? (
              sortedFlats.map((f) => {
                const isOwned = f.owner_id === citizen?.id;
                const fTier = housingTierFor(f.property_type, f.bedrooms);
                const cfg = HOUSING_CONFIGS[fTier] ?? HOUSING_CONFIGS.studio;
                const bldgName = getEntity(f.building_id)?.name ?? f.building_id.replace(/-/g, " ");
                const isCurrent = activeFlat?.id === f.id;
                const unitLabel = /^\d/.test(f.unit) ? `${f.property_type} · Unit ${f.unit}` : `${f.property_type} (${f.unit})`;

                return (
                  <div
                    key={f.id}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => {
                        updateCitizen((c) => ({
                          ...c,
                          activeFlatId: f.id,
                          home: `${cfg.label}, ${bldgName}`,
                        }));
                        if (cfg.rooms?.length || cfg.levels) {
                          setUpView(true);
                          setActiveRoomId(fTier === "one_bedroom" ? "bedroom" : "living");
                        } else {
                          setUpView(false);
                        }
                        setTierModalOpen(false);
                        showToast(`Switched home to ${unitLabel} at ${bldgName}!`);
                        gameAudio.playConfirmSound();
                      }}
                      className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{cfg.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900 flex flex-wrap items-center gap-1.5">
                            <span className="truncate">{unitLabel}</span>
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                isOwned ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {isOwned ? "Owned" : "Rented"}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-200/70 px-1.5 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {bldgName} · {f.size_sqft?.toLocaleString() ?? ""} sq ft
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isOwned ? (
                          <div className="text-[11px] font-black text-emerald-700">Deed Owned</div>
                        ) : (
                          <>
                            <div className="text-xs font-black text-slate-900">
                              AED {(f.rent_price ?? cfg.monthly).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">/month</div>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Holiday Home Subletting Payout for Extra Owned Properties (24h Return Hook) */}
                    {isOwned && !isCurrent && (() => {
                      const subletYield = Math.max(250, Math.round((cfg.monthly || 6000) / 18));
                      const dayBucket = Math.floor(Date.now() / 86_400_000);
                      const claimKey = `dl_sublet:${f.id}:${dayBucket}`;
                      let claimedToday = false;
                      try { claimedToday = localStorage.getItem(claimKey) === "1"; } catch { /* blocked */ }
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-600">
                            🏖️ Holiday Home Guest Payout: <b className="text-emerald-700">+AED {subletYield.toLocaleString()}/day</b>
                          </span>
                          {claimedToday ? (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                              ✓ Collected today
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try { localStorage.setItem(claimKey, "1"); } catch { /* blocked */ }
                                adjustBalance(subletYield);
                                gameAudio.playCoinSound();
                                showToast(`💸 Collected +AED ${subletYield.toLocaleString()} Holiday Home rent from ${unitLabel}!`);
                                setTurns((n) => n + 1);
                              }}
                              className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] shrink-0 active:scale-95 transition-transform"
                            >
                              Collect +AED {subletYield.toLocaleString()}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            ) : (
              /* Fallback when the player hasn't rented or bought a map property yet: show their current starter/blueprint residence */
              (() => {
                const starterTier = getHousingTierFromText(citizen?.home || life?.blueprint?.housing || "studio");
                const h = HOUSING_CONFIGS[starterTier] ?? HOUSING_CONFIGS.studio;
                return (
                  <div className="p-3.5 rounded-2xl border border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{h.icon}</span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>{h.label}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded-full">
                            Rented
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{h.area}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">AED {h.monthly.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">/month</div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Option to switch back to starter residence if they own/rent flats but want their starter apartment */}
            {sortedFlats.length > 0 && (() => {
              const starterTier = getHousingTierFromText(life?.blueprint?.housing || "studio");
              const h = HOUSING_CONFIGS[starterTier] ?? HOUSING_CONFIGS.studio;
              const isStarterActive = !activeFlat;
              return (
                <button
                  onClick={() => {
                    updateCitizen((c) => ({
                      ...c,
                      activeFlatId: "starter",
                      home: `${h.label}, ${h.area.split(" · ")[0]}`,
                    }));
                    setTierModalOpen(false);
                    showToast(`Switched to ${h.label}!`);
                    gameAudio.playConfirmSound();
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isStarterActive
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{h.icon}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{h.label}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          Blueprint Residence
                        </span>
                        {isStarterActive && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{h.area}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">AED {h.monthly.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">/month</div>
                  </div>
                </button>
              );
            })()}

            <Link
              href="/explore"
              onClick={() => setTierModalOpen(false)}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Map className="w-4 h-4" />
              <span>Find More Villas, Mansions & Flats on the Map</span>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wardrobe & Outfit Changes */}
      <WardrobeModal open={wardrobeModalOpen} onOpenChange={setWardrobeModalOpen} />

    </main>
  );
}
