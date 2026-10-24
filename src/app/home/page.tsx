"use client";

import { useFirstDayActive } from "@/components/life/FirstDay";
import { ModalPortal } from "@/components/ui/modal-portal";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { compact, useSiteStats } from "@/lib/siteStats";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Volume2, VolumeX, Plus, Eye, Check, ChevronUp, ChevronDown,
  Home, ShoppingBag, Map, Smartphone, Sparkles, X, Megaphone,
  RotateCw, RotateCcw, Keyboard, Move, Package, LogOut, Shirt, Bell
} from "lucide-react";
import { ApartmentRoom, type PlacingState } from "@/components/home/ApartmentRoom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { gameAudio } from "@/utils/gameAudio";
import { isNewCitizen, useRequireCitizen, adjustBalance, buyFurniture, setFurniturePlacement, signOut, updateCitizen, DEFAULT_NEEDS, type Needs } from "@/lib/citizenStore";
import { CATALOG, getCatalogItem, withHomeItems, HOUSING_CONFIGS, type CatalogItem, type Placement, type Rotation, type HousingTier, type HomeActivityDef } from "@/lib/furniture";
import { useOnlineCount, formatOnline } from "@/lib/presence";
import { useLifeLoop } from "@/lib/lifeLoop";
import { WardrobeModal } from "@/components/avatar/WardrobeModal";
import { getPendingVenue } from "@/components/city/VenueDressCodeModal";
import { NeedsDock } from "@/components/life/NeedsDock";
import { gainSkill, lifeEvent } from "@/lib/life";
import BLUEPRINT from "@/data/life/blueprint.json";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { citizen } = useRequireCitizen();
  const walletBalance = citizen?.balance ?? 0;
  const onlineCount = useOnlineCount();
  const { visits } = useSiteStats();
  const [cleanScreen, setCleanScreen] = useState(false);
  const [wardrobeModalOpen, setWardrobeModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get("wardrobe") === "open" || !!getPendingVenue()) {
      setWardrobeModalOpen(true);
    }
  }, [searchParams]);
  const firstDayActive = useFirstDayActive();
  // The welcome only appears the first time this citizen opens their home.
  const [welcomeModalOpen, setWelcomeModalOpenState] = useState(false);
  const welcomeKey = `welcome-seen:${citizen?.id ?? ""}`;
  useEffect(() => {
    if (!citizen?.id) return;
    let seen = false;
    try { seen = localStorage.getItem(welcomeKey) === "1"; } catch { /* storage blocked */ }
    // Reads browser storage once the citizen is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!seen && isNewCitizen(citizen)) setWelcomeModalOpenState(true);
  }, [citizen?.id, welcomeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const setWelcomeModalOpen = (open: boolean) => {
    setWelcomeModalOpenState(open);
    if (!open) { try { localStorage.setItem(welcomeKey, "1"); } catch { /* storage blocked */ } }
  };
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
  const [shopTab, setShopTab] = useState<"shop" | "storage">("shop");
  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [turns, setTurns] = useState(0);

  const life = useLifeLoop();
  const rawTier = (life?.blueprint?.housing || citizen?.home || "studio").toLowerCase();
  const housingTier: HousingTier = 
    rawTier.includes("bed_space") || rawTier.includes("bed space") || rawTier.includes("shared") ? "bed_space"
    : rawTier.includes("three_bedroom") || rawTier.includes("3-bedroom") || rawTier.includes("3 bedroom") ? "three_bedroom"
    : rawTier.includes("two_bedroom") || rawTier.includes("2-bedroom") || rawTier.includes("2 bedroom") ? "two_bedroom"
    : rawTier.includes("one_bedroom") || rawTier.includes("1-bedroom") || rawTier.includes("1 bedroom") ? "one_bedroom"
    : rawTier.includes("penthouse") ? "penthouse"
    : rawTier.includes("villa") ? "villa"
    : "studio";

  const housingConfig = HOUSING_CONFIGS[housingTier] ?? HOUSING_CONFIGS.studio;
  const isMultiRoom = housingTier === "one_bedroom" || housingTier === "two_bedroom" || housingTier === "three_bedroom";
  const [upView, setUpView] = useState(isMultiRoom);
  const [activeRoomId, setActiveRoomId] = useState<string>(housingTier === "one_bedroom" ? "bedroom" : "living");
  const [ritualsExpanded, setRitualsExpanded] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);

  useEffect(() => {
    if (isMultiRoom) {
      setUpView(true);
      setActiveRoomId(housingTier === "one_bedroom" ? "bedroom" : "living");
    }
  }, [housingTier, isMultiRoom]);

  const furniture = citizen?.furniture ?? [];
  const stored = withHomeItems(furniture, housingTier).filter((f) => !f.placement);
  const placingItem = placing ? getCatalogItem(placing.itemId) : undefined;
  const placingIsPlaced = !!(placing && furniture.find((f) => f.uid === placing.uid)?.placement);

  // Wellbeing meters live on the citizen, so food bought around the city counts here too.
  const needs = { ...DEFAULT_NEEDS, ...citizen?.needs };
  const setNeeds = (fn: (n: Needs) => Needs) => updateCitizen((c) => ({ ...c, needs: fn({ ...DEFAULT_NEEDS, ...c.needs }) }));

  const handleTriggerHomeActivity = (act: HomeActivityDef) => {
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

  const handleInteractObject = (type: "cooler" | "bed" | "chair" | "door") => {
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
    }
  };

  return (
    // Pinned to the screen so Safari never scrolls the page (which turns taps into scrolls).
    <main className="fixed inset-0 w-screen h-[100dvh] bg-[#788e6e] overflow-hidden overscroll-none select-none font-sans touch-none">
      
      {/* 3D Isometric Apartment Interior */}
      <ApartmentRoom
        look={citizen?.look}
        furniture={furniture}
        placing={placing}
        decorating={decorating}
        turns={turns}
        housingTier={housingTier}
        upView={upView}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onPlace={handlePlace}
        onPickUp={handlePickUp}
        onPlaceBlocked={() => showToast("🚫 It doesn't fit there. Try a green spot.")}
        onInteractObject={handleInteractObject}
      />

      {/* Camera controls */}
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setTurns((t) => t - 1)}
          className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 transition-all"
          title="Rotate room left"
          aria-label="Rotate room left"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTurns((t) => t + 1)}
          className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 transition-all"
          title="Rotate room right"
          aria-label="Rotate room right"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <span className="hidden sm:block text-[10px] font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded-full text-center leading-tight">Drag to<br />look around</span>
      </div>

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
          <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto bg-white/95 hover:bg-white backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-3 sm:px-4 py-2 rounded-full transition-all">
            
            {/* Clock & Mood */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-800">
              <span className="flex items-center gap-1 font-mono whitespace-nowrap">
                {(() => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "numeric", hour12: false }).format(new Date())); return h >= 6 && h < 19 ? "☀️" : "🌙"; })()} {clock}
              </span>
              <div className="w-[1px] h-3.5 bg-slate-200" />
              {(() => {
                const avg = (needs.hunger + needs.energy + needs.fun + needs.social + needs.hygiene + needs.bladder) / 6;
                const [label, tone] = avg >= 70 ? ["🙂 Happy", "text-emerald-600"] : avg >= 40 ? ["😐 Okay", "text-amber-600"] : ["😟 Low", "text-rose-600"];
                return <span className={`flex items-center gap-1 font-extrabold text-xs whitespace-nowrap ${tone}`}><span>{label.split(" ")[0]}</span><span className="hidden xs:inline sm:inline">{label.split(" ")[1]}</span></span>;
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
                onClick={signOut}
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

      {/* TOP HOUSING STATUS & MULTI-ROOM PILLS */}
      {!cleanScreen && (
        <div className="absolute top-[4.5rem] sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 max-w-[96vw] px-2">
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-xl text-white pl-3.5 pr-2 py-1.5 rounded-full shadow-2xl border border-white/10 text-xs font-bold">
            <button
              onClick={() => {
                setTierModalOpen(true);
                gameAudio.playClickSound();
              }}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
              title="Change or inspect housing tier"
            >
              <span className="text-sm">{housingConfig.icon}</span>
              <span className="font-extrabold text-amber-300">{housingConfig.label}</span>
              <span className="text-slate-400 text-[10px] hidden xs:inline">• {housingConfig.area}</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400/80 ml-0.5" />
            </button>
            {housingConfig.hasDollhouseUpView && (
              <button
                onClick={() => {
                  setUpView(!upView);
                  gameAudio.playClickSound();
                }}
                className={`ml-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
                  upView ? "bg-emerald-500 text-white shadow-sm" : "bg-white/20 text-slate-200 hover:bg-white/30"
                }`}
              >
                {upView ? "📐 Up-View (All Rooms)" : "🔍 In-Room Focus"}
              </button>
            )}
          </div>

          {/* Room Pills for Multi-Room Layouts (1-Bed, 2-Bed, 3-Bed) */}
          {housingConfig.rooms && housingConfig.rooms.length > 0 && (
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-slate-200 overflow-x-auto max-w-[92vw]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1.5 pr-0.5">Rooms:</span>
              {housingConfig.rooms.map((r) => {
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
        </div>
      )}

      {/* TOP LEFT QUESTS & OBJECTIVES (Image 2) */}
      {!cleanScreen && (
        <div className="absolute top-[4.75rem] sm:top-24 left-3 sm:left-6 z-30 pointer-events-auto space-y-1.5">
          {/* Quiet while the first-day checklist is running, so new players see one clear set of goals. */}
          {!firstDayActive && <>
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-100 text-xs font-bold text-slate-800 max-w-[280px]">
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs shrink-0">🍎</span>
            <div className="truncate">
              <div className="leading-tight">Eat something</div>
              <div className="text-[10px] text-slate-400 font-semibold">Tap the cooler or stove</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-100 text-xs font-bold text-slate-800 max-w-[280px]">
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs shrink-0">💎</span>
            <div className="truncate">
              <div className="leading-tight">Daily gem hunt</div>
              <div className="text-[10px] text-slate-400 font-semibold">7758 found · next prize AED 3,000</div>
            </div>
          </div>
          </>}

          <button
            onClick={() => setCleanScreen(!cleanScreen)}
            className="flex items-center gap-1 bg-white/90 hover:bg-white px-3 py-2 rounded-full text-[11px] font-bold text-slate-600 shadow-sm border border-slate-200 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Clean screen</span>
          </button>
        </div>
      )}

      {cleanScreen && (
        <button
          onClick={() => setCleanScreen(false)}
          className="absolute top-4 left-4 z-40 bg-white/90 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-md border border-slate-200 flex items-center gap-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Show UI</span>
        </button>
      )}

      {/* BOTTOM LEFT: CITIZEN VITALS & NEEDS HUD (Image 2) */}
      {!cleanScreen && (
        <div className="absolute bottom-20 sm:bottom-24 left-3 sm:left-6 z-30 pointer-events-auto">
          {/* The dock opens your needs, goals, skills, people and career. */}
          <NeedsDock />
        </div>
      )}

      {/* RELATABLE HOME ACTIVITIES DOCK (Collapsible Floating Pill / Expanded Drawer) */}
      {!cleanScreen && !placing && (
        <div className="fixed bottom-[4.85rem] sm:bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
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
                    {housingConfig.rooms && (
                      <span className="text-[10px] text-slate-400 font-semibold">({housingConfig.rooms?.find(r => r.id === activeRoomId)?.label ?? "All"})</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(housingConfig.rooms
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
          <div className="max-w-sm sm:max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-white shadow-[0_16px_48px_rgba(0,0,0,0.25)] rounded-full p-1.5 flex items-center justify-between pointer-events-auto">
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

            {/* Phone */}
            <button 
              onClick={() => router.push("/phone")}
              className="flex-1 min-h-[48px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Interactive Toast */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* 1. FIRST ARRIVAL / REGULATIONS POPUP (Image 1) */}
      {/* First visit only. A plain card (not a dialog) so nothing is left covering the screen once it's closed. */}
      {welcomeModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome to mydubailife.app">
            <div className="absolute inset-0 bg-black/30" onClick={() => setWelcomeModalOpen(false)} aria-hidden />
            <div className="relative bg-white text-slate-900 shadow-2xl w-[92vw] max-w-md rounded-3xl p-6 sm:p-7 text-left space-y-4">
              <button onClick={() => setWelcomeModalOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600" aria-label="Close">✕</button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-2xl flex items-center justify-center shadow-sm border border-amber-100">
              📣
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Welcome to mydubailife.app!
              </h3>
              <p className="text-xs text-slate-400 font-semibold">From the mydubailife.app team</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your starter residence in <strong>{citizen?.home || "Dubai"}</strong> is ready, and you have <strong>AED {walletBalance.toLocaleString()}</strong> in your wallet to get started.
          </p>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-black">◆</span>
              <span><strong>Your Apartment:</strong> Tap the cooler to eat, the bed to rest, or the door to step out into the city.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-black">◆</span>
              <span><strong>City Map:</strong> Explore Downtown Dubai, ride the Metro, discover luxury clubs, and build your fortune!</span>
            </div>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-900 leading-relaxed">
            🌅 <strong>Your first day:</strong> plan your budget, work a shift, pass a lesson and add a friend. The checklist in the corner pays a bonus when you finish.
            <button onClick={() => router.push("/guide")} className="block mt-1.5 font-black text-sky-700">📖 How Dubai works: visas, jobs and prizes ›</button>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/25 transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <span>Explore the City</span>
              <span>›</span>
            </button>
            <button
              onClick={() => setWelcomeModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-98"
            >
              Got it
            </button>
          </div>
                    </div>
          </div>
        </ModalPortal>
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
          </div>

          {shopTab === "shop" ? (
            <div className="space-y-2.5 pt-3">
              {CATALOG.map(item => {
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

      {/* 3. HOUSING TIER SELECTOR & PREVIEW MODAL */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-md max-h-[85dvh] overflow-y-auto z-50 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🏙️</span> Dubai Housing Tiers
              </h3>
              <p className="text-xs text-slate-500">Select your residence type to explore its 3D layout & rooms</p>
            </div>
            <button onClick={() => setTierModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 pt-3">
            {BLUEPRINT.housing.map((h) => {
              const isCurrent = h.id === housingTier;
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    updateCitizen((c) => ({ ...c, home: `${h.label}, ${h.area.split(" · ")[0]}` }));
                    if (h.id === "one_bedroom" || h.id === "two_bedroom" || h.id === "three_bedroom") {
                      setUpView(true);
                      setActiveRoomId(h.id === "one_bedroom" ? "bedroom" : "living");
                    } else {
                      setUpView(false);
                    }
                    setTierModalOpen(false);
                    showToast(`Switched home to ${h.label}!`);
                    gameAudio.playConfirmSound();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{h.icon}</span>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <span>{h.label}</span>
                        {isCurrent && (
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
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Wardrobe & Outfit Changes */}
      <WardrobeModal open={wardrobeModalOpen} onOpenChange={setWardrobeModalOpen} />

    </main>
  );
}
