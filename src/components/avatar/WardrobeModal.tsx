"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, ArrowRight, Shirt, Sparkles, Palette, Crown, Trophy, ShoppingBag } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CitizenAvatar, StudioEnvironment, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import {
  CULTURAL_TABS,
  FABRIC_PALETTE,
  OCCASIONS,
  computeClosetValue,
  JEWELRY_CATALOG,
  jewelryFor,
  nailsFor,
  outfitsFor,
  presetFor,
  rosterThumb,
  shoesFor,
  wigsFor,
  outfitById,
  type AvatarLookProps,
  type CulturalHeritage,
  type Occasion,
  type OutfitEntry,
  type WardrobeSubItem,
} from "@/components/avatar/roster";
import { DRESS_CODES, type DressCodeType } from "@/lib/city/dressCodes";
import { useCitizen, updateCitizen, adjustBalance, type InventoryItem } from "@/lib/citizenStore";
import { FASHION_CATALOG } from "@/lib/fashionCatalog";
import { getPendingVenue, clearPendingVenue, type PendingVenue } from "@/components/city/VenueDressCodeModal";
import { useRouter } from "next/navigation";
import { gameAudio } from "@/utils/gameAudio";
import type { Accessory } from "@/lib/city/types";
import { canvasQuality, isEcoMode, toggleEcoMode } from "@/lib/device";

/** Which occasions suit each venue dress code. */
const SUITS: Record<DressCodeType, Occasion[]> = {
  club_chic: ["night", "formal", "bridal"],
  smart_casual: ["work", "formal", "night", "traditional"],
  beachwear: ["beach"],
  fashion_forward: ["night", "formal", "bridal", "traditional"],
  casual_modest: ["everyday", "traditional", "work", "bridal"],
};
const suitsFor = (title?: string): Occasion[] => {
  const code = Object.values(DRESS_CODES).find((d) => d.title === title);
  return code ? SUITS[code.type] : [];
};

const OWNED_CLOSET_KEY = "dl_owned_closet_v1";

function loadOwnedCloset(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OWNED_CLOSET_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveOwnedCloset(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OWNED_CLOSET_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore storage errors
  }
}

type CameraFocusMode = "full" | "jewelry" | "head" | "shoes" | "hands";

export type ShoppedCategory = "all" | "outfits" | "shoes" | "accessories" | "bags" | "beauty";

export const SHOPPED_CATEGORIES: Array<{ id: ShoppedCategory; label: string; icon: string }> = [
  { id: "all", label: "All Items", icon: "✨" },
  { id: "outfits", label: "Clothes", icon: "👗" },
  { id: "shoes", label: "Shoes", icon: "👠" },
  { id: "accessories", label: "Accessories", icon: "🕶️" },
  { id: "bags", label: "Bags & Luxury", icon: "👜" },
  { id: "beauty", label: "Beauty & Scent", icon: "💄" },
];

/** Differentiates items bought at malls and retail stores from nightlife/club purchases. */
export function isMallStoreItem(item: InventoryItem): boolean {
  if (item.service) return false;

  const store = (item.storeId || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const id = (item.productId || "").toLowerCase();

  // Exclude club-specific store venues unless explicitly a wearable fashion accessory
  if (
    store.includes("club") ||
    store.includes("nightclub") ||
    store.includes("lounge") ||
    store.includes("pub") ||
    store.includes("disco") ||
    store.includes("beach-club") ||
    store.includes("bar")
  ) {
    if (!item.wearable && !FASHION_CATALOG.some((f) => f.id === item.productId)) {
      return false;
    }
  }

  // Exclude club drinks, cocktails, bottle service, champagne, tickets
  if (
    name.includes("bottle service") ||
    name.includes("champagne") ||
    name.includes("cocktail") ||
    name.includes("mocktail") ||
    name.includes("martini") ||
    name.includes("vodka") ||
    name.includes("whiskey") ||
    name.includes("tequila") ||
    name.includes("beer") ||
    name.includes("wine") ||
    name.includes("entry ticket") ||
    name.includes("vip table") ||
    name.includes("dj gift") ||
    name.includes("shot") ||
    id.includes("cocktail") ||
    id.includes("bottle") ||
    id.includes("entry") ||
    id.includes("vip-table") ||
    id.includes("dj-gift")
  ) {
    return false;
  }

  return true;
}

/** Determines the subcategory of a mall/store item for user filtering. */
export function getShoppedCategory(item: InventoryItem): "outfits" | "shoes" | "accessories" | "bags" | "beauty" {
  const matchingFashion = FASHION_CATALOG.find((f) => f.id === item.productId);
  const name = item.name.toLowerCase();
  const w = item.wearable;

  if (matchingFashion?.category === "shoes" || /shoe|heel|boot|sneaker|loafer|sandal|slide/i.test(name)) {
    return "shoes";
  }
  if (w === "handbag" || /bag|tote|clutch|handbag|wallet|purse|backpack|luggage/i.test(name)) {
    return "bags";
  }
  if (
    w === "sunglasses" ||
    w === "watch" ||
    w === "necklace" ||
    w === "cap" ||
    w === "headphones" ||
    matchingFashion?.category === "accessories" ||
    /glass|shade|watch|necklace|bracelet|earring|ring|hat|cap|scarf|belt|jewel|gold|silver|diamond/i.test(name)
  ) {
    return "accessories";
  }
  if (/perfume|oud|fragrance|scent|lipstick|cosmetic|skincare|serum|mist|cream|palette/i.test(name)) {
    return "beauty";
  }
  return "outfits";
}

const CAMERA_PRESETS: Record<
  CameraFocusMode,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  full: { pos: [0, 0.08, 4.4], target: [0, 0.08, 0] },
  jewelry: { pos: [0, 0.42, 1.45], target: [0, 0.35, 0] },
  head: { pos: [0, 0.62, 1.45], target: [0, 0.56, 0] },
  shoes: { pos: [0.18, -0.48, 1.55], target: [0, -0.72, 0.04] },
  hands: { pos: [0.18, 0.14, 1.45], target: [0, 0.06, 0.04] },
};

function CameraFocusRig({ focus }: { focus: CameraFocusMode }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const desiredPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.full.pos));
  const desiredTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS.full.target));
  const transitioning = useRef(false);

  useEffect(() => {
    const preset = CAMERA_PRESETS[focus];
    desiredPos.current.set(...preset.pos);
    desiredTarget.current.set(...preset.target);
    transitioning.current = true;
  }, [focus]);

  useFrame((state, dt) => {
    const ctrl = controlsRef.current;
    if (!ctrl || !transitioning.current) return;
    const step = Math.min(1, dt * 6.5);
    state.camera.position.lerp(desiredPos.current, step);
    ctrl.target.lerp(desiredTarget.current, step);
    ctrl.update();
    if (
      state.camera.position.distanceTo(desiredPos.current) < 0.015 &&
      ctrl.target.distanceTo(desiredTarget.current) < 0.015
    ) {
      transitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      onStart={() => {
        transitioning.current = false;
      }}
      enablePan={false}
      enableZoom={false}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      minDistance={0.75}
      maxDistance={6.0}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.65}
    />
  );
}

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;

interface WardrobeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WardrobeModal({ open, onOpenChange }: WardrobeModalProps) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const [pending, setPending] = useState<PendingVenue | null>(null);

  const initialLook = citizen?.look ?? { gender: "woman", bodyType: "Hourglass" };
  const [selectedLook, setSelectedLook] = useState<AvatarLookProps>(initialLook);
  const [selectedWorn, setSelectedWorn] = useState<string[]>(citizen?.worn ?? []);
  const [ownedCloset, setOwnedCloset] = useState<string[]>([]);
  const [ecoMode, setEcoModeState] = useState(() => isEcoMode());
  const quality = useMemo(() => canvasQuality(), [ecoMode]);
  const [activeTab, setActiveTab] = useState<"outfits" | "jewelry" | "shopped" | "colors" | "wigs" | "shoes" | "nails">("outfits");
  const [jewelryFilter, setJewelryFilter] = useState<"all" | "necklace" | "watch" | "bracelet_ring">("all");
  const [cameraFocus, setCameraFocus] = useState<CameraFocusMode>("full");
  const [cultureFilter, setCultureFilter] = useState<"all" | CulturalHeritage>("all");
  const [previewAnim, setPreviewAnim] = useState<AvatarAnimation>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [runwayResult, setRunwayResult] = useState<{
    myScore: number;
    rivalScore: number;
    won: boolean;
    reward: number;
  } | null>(null);

  // Gamified Color Studio: Couture Airbrush & Dye Mini-Game state
  const [dyeZone, setDyeZone] = useState<"primary" | "secondary">("primary");
  const [dyeFinish, setDyeFinish] = useState<"silk" | "velvet" | "metallic" | "gold_thread">("silk");
  const [airbrushPressure, setAirbrushPressure] = useState<number>(0);
  const [dyeMastered, setDyeMastered] = useState<boolean>(false);

  // Gamified Nail Salon: 5-Finger Painting & UV LED Gel Cure state (Ladies Only)
  const [fingerCoats, setFingerCoats] = useState<number[]>([2, 2, 2, 2, 2]);
  const [fingerGems, setFingerGems] = useState<boolean[]>([false, true, false, true, false]);
  const [nailArtFinish, setNailArtFinish] = useState<"gold_foil" | "diamond_studs" | "french_ombre" | "chrome_glaze">("diamond_studs");
  const [uvCureProgress, setUvCureProgress] = useState<number>(0);
  const [uvCuring, setUvCuring] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const p = getPendingVenue();
      setPending(p);
      if (citizen?.look) setSelectedLook(citizen.look);
      if (citizen?.worn) setSelectedWorn(citizen.worn);
      setOwnedCloset(loadOwnedCloset());
      setRunwayResult(null);
      setCameraFocus("full");
      setAirbrushPressure(0);
      setDyeMastered(false);
    }
  }, [open, citizen]);

  // Tab selection keeps the avatar comfortably framed in full body view
  const handleSelectTab = (tab: "outfits" | "jewelry" | "shopped" | "colors" | "wigs" | "shoes" | "nails") => {
    setActiveTab(tab);
    if (tab === "jewelry") {
      setCameraFocus("jewelry");
      setPreviewAnim("spray_money");
    } else if (tab === "nails" && selectedLook.gender === "woman") {
      setPreviewAnim("wave");
    } else if (tab === "shopped") {
      setCameraFocus("full");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const gender = selectedLook.gender;
  const face = presetFor(selectedLook);
  const currentWear = selectedLook.wear ?? face;
  const all = outfitsFor(gender);
  const suits = suitsFor(pending?.dressCodeTitle);
  const [picked, setOccasion] = useState<"all" | "suits" | Occasion | null>(null);
  const occasion = picked ?? (pending && suits.length ? "suits" : "all");

  const shown = all.filter((o) => {
    const occMatch =
      occasion === "all"
        ? true
        : occasion === "suits"
        ? suits.includes(o.occasion)
        : o.occasion === occasion;
    if (!occMatch) return false;
    if (occasion === "traditional" && cultureFilter !== "all") {
      return o.culture === cultureFilter;
    }
    return true;
  });

  const wornNow = all.find((o) => o.id === currentWear);
  const wearOutfit = outfitById(selectedLook.wear);
  const closetValue = computeClosetValue(selectedLook, ownedCloset);

  // Filter out club drinks, bottle service & tickets; keep only mall & retail store items
  const mallInventory: InventoryItem[] = useMemo(() => {
    const raw = citizen?.inventory ?? [];
    return raw.filter(isMallStoreItem);
  }, [citizen?.inventory]);

  const [shoppedCategory, setShoppedCategory] = useState<ShoppedCategory>("all");

  const filteredShoppedItems = useMemo(() => {
    if (shoppedCategory === "all") return mallInventory;
    return mallInventory.filter((item) => getShoppedCategory(item) === shoppedCategory);
  }, [mallInventory, shoppedCategory]);

  const shoppedCategoryCounts = useMemo(() => {
    const counts: Record<ShoppedCategory, number> = {
      all: mallInventory.length,
      outfits: 0,
      shoes: 0,
      accessories: 0,
      bags: 0,
      beauty: 0,
    };
    for (const item of mallInventory) {
      const cat = getShoppedCategory(item);
      counts[cat]++;
    }
    return counts;
  }, [mallInventory]);

  // Owned accessories from mall inventory
  const ownedAccessories = mallInventory.filter((item) => item.wearable);

  const activeAccessories: Accessory[] = ownedAccessories
    .filter((item) => selectedWorn.includes(item.uid) && item.wearable)
    .map((item) => item.wearable as Accessory);

  const toggleAccessory = (uid: string) => {
    setSelectedWorn((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleToggleShoppedItem = (item: InventoryItem) => {
    const matchingFashion = FASHION_CATALOG.find((f) => f.id === item.productId);
    if (matchingFashion?.lookWear) {
      if (selectedLook.wear === matchingFashion.lookWear) {
        setSelectedLook((prev) => ({ ...prev, wear: undefined }));
        showToast(`Removed ${item.name}`);
      } else {
        setSelectedLook((prev) => ({ ...prev, wear: matchingFashion.lookWear }));
        gameAudio.playClickSound();
        showToast(`👗 Put on ${item.name}!`);
      }
    } else if (item.wearable) {
      const isAlreadyWorn = selectedWorn.includes(item.uid);
      toggleAccessory(item.uid);
      if (!isAlreadyWorn) {
        gameAudio.playClickSound();
        showToast(`✨ Equipped ${item.name}!`);
      } else {
        showToast(`Removed ${item.name}`);
      }
    } else {
      gameAudio.playClickSound();
      showToast(`🛍️ ${item.name} from ${item.storeId ? item.storeId.replace(/-/g, " ") : "The Dubai Mall"}`);
    }
  };

  const contentScrollRef = useRef<HTMLDivElement>(null);
  const outfitsSectionRef = useRef<HTMLDivElement>(null);
  const [scrolledToOutfits, setScrolledToOutfits] = useState(false);

  const scrollToOutfits = () => {
    outfitsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAvatar = () => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectOutfit = (r: OutfitEntry) => {
    const isOwned = !r.price || ownedCloset.includes(r.id) || currentWear === r.id;
    if (!isOwned && r.price) {
      if ((citizen?.balance ?? 0) < r.price) {
        showToast(`⚠️ Need AED ${r.price.toLocaleString()} to unlock ${r.label}`);
        return;
      }
      adjustBalance(-r.price);
      const next = [...ownedCloset, r.id];
      setOwnedCloset(next);
      saveOwnedCloset(next);
      gameAudio.playCoinSound();
      showToast(`🛍️ Purchased ${r.label} (+${r.closetValue ?? 150} CV)!`);
    } else {
      gameAudio.playClickSound();
    }
    // Reset custom tint when switching outfits: each clothing has its own state and colors do not spill over
    setSelectedLook((prev) => ({
      ...prev,
      custom: undefined,
      wear: r.id === face ? undefined : r.id,
      primaryColor: r.defaultPrimaryColor,
      secondaryColor: r.defaultSecondaryColor,
      wigId: r.defaultWigId ?? prev.wigId,
    }));
  };

  const handleSelectSubItem = (
    kind: "wigId" | "shoeId" | "nailId" | "jewelryId",
    item: WardrobeSubItem
  ) => {
    const currentId = selectedLook[kind] ?? (kind === "wigId" ? wearOutfit?.defaultWigId : undefined);
    if (currentId === item.id) {
      setSelectedLook((prev) => ({ ...prev, [kind]: kind === "wigId" ? "none" : undefined }));
      if (kind === "wigId") {
        setSelectedWorn((prev) =>
          prev.filter((id) => !ownedAccessories.find((a) => a.uid === id && a.wearable === "cap"))
        );
        showToast(gender === "woman" ? "✨ Wig removed · Natural hair restored" : "✨ Cap removed · Natural hair restored");
      } else if (kind === "jewelryId") {
        showToast("✨ Luxury jewelry unequipped");
      }
      return;
    }
    const isOwned = ownedCloset.includes(item.id);
    if (!isOwned && item.price > 0) {
      if ((citizen?.balance ?? 0) < item.price) {
        showToast(`⚠️ Need AED ${item.price.toLocaleString()} for ${item.label}`);
        return;
      }
      adjustBalance(-item.price);
      const next = [...ownedCloset, item.id];
      setOwnedCloset(next);
      saveOwnedCloset(next);
      gameAudio.playCoinSound();
      showToast(`✨ Unlocked ${item.label} (+${item.closetValue} CV)!`);
    } else {
      gameAudio.playClickSound();
    }
    setSelectedLook((prev) => ({
      ...prev,
      [kind]: item.id,
      ...(kind === "nailId" ? { nailColor: item.color } : {}),
    }));
  };

  const handleRunwayWalkOff = () => {
    setPreviewAnim("dance");
    gameAudio.playClickSound();
    const myScore = Math.min(
      99,
      Math.round(
        68 +
          Math.min(22, closetValue / 45) +
          (selectedLook.primaryColor ? 4 : 0) +
          (selectedLook.jewelryId ? 4 : 0) +
          (selectedLook.wigId ? 3 : 0) +
          (selectedLook.shoeId ? 3 : 0) +
          (selectedLook.nailId ? 2 : 0)
      )
    );
    const rivalScore = Math.round(66 + ((Date.now() / 1000) % 21));
    const won = myScore >= rivalScore;
    const reward = won ? 250 : 50;
    adjustBalance(reward);
    if (won) gameAudio.playCoinSound();
    setRunwayResult({ myScore, rivalScore, won, reward });
    setTimeout(() => setPreviewAnim("idle"), 3500);
  };

  const handleSaveAndContinue = () => {
    updateCitizen((c) => ({
      ...c,
      look: selectedLook,
      worn: selectedWorn,
    }));

    if (pending) {
      const targetRoute = pending.route;
      clearPendingVenue();
      onOpenChange(false);
      router.push(targetRoute);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border border-white/10 shadow-2xl w-[95vw] max-w-2xl sm:max-w-4xl max-h-[92vh] overflow-hidden rounded-[32px] p-0 flex flex-col">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
              <Shirt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Luxury Wardrobe & Couture Studio</span>
                <span className="text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                  💎 CV {closetValue.toLocaleString()}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {gender === "woman"
                  ? "Ladies' Couture · Customize fabric colors, cultural attire, bridal gowns, wigs, heels & acrylic nails"
                  : "Gentlemen's Bespoke · Customize fabric colors, cultural attire, groom regalia, caps, fades & designer shoes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
              AED {(citizen?.balance ?? 0).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={handleRunwayWalkOff}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Runway Walk-Off</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="bg-amber-500/20 border-b border-amber-400/30 px-4 py-2 text-xs font-black text-amber-200 text-center">
            {toast}
          </div>
        )}

        {runwayResult && (
          <div className="bg-gradient-to-r from-fuchsia-950/90 via-purple-950/90 to-slate-900 border-b border-fuchsia-500/30 px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="font-bold">
              {runwayResult.won ? "🏆 RUNWAY WINNER!" : "✨ RUNWAY SHOWCASE:"} Your Score{" "}
              <span className="text-amber-300 font-black">{runwayResult.myScore}/100</span> vs Rival{" "}
              <span className="text-slate-300 font-black">{runwayResult.rivalScore}/100</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black">
              +AED {runwayResult.reward}
            </span>
          </div>
        )}

        {/* Pending Venue Banner if arrived from dress code prompt */}
        {pending && (
          <div className="bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-base">📍</span>
              <span className="font-bold text-slate-300">
                Changing for:{" "}
                <span className="text-white font-extrabold">{pending.venueName}</span>
                <span className="text-emerald-400 font-medium ml-1">
                  ({pending.dressCodeTitle})
                </span>
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Venue Pending
            </span>
          </div>
        )}

        {/* Main Content: Avatar 3D Preview (Left/Top) + Wardrobe Items (Right/Bottom) */}
        <div
          ref={contentScrollRef}
          onScroll={(e) => {
            const top = e.currentTarget.scrollTop;
            setScrolledToOutfits(top > 140);
          }}
          className="flex-1 overflow-y-auto scroll-smooth overscroll-contain grid grid-cols-1 md:grid-cols-12 relative"
        >
          {/* 3D Turntable Preview */}
          <div className="md:col-span-5 relative h-72 sm:h-80 md:h-auto md:min-h-[500px] shrink-0 bg-gradient-to-b from-slate-950/80 to-slate-900 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center">
            <div className="absolute inset-0" style={{ touchAction: "pan-y" }}>
              <Canvas
                camera={{ position: [0, 0.08, 4.4], fov: 38 }}
                dpr={quality.dpr}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: quality.powerPreference,
                }}
              >
                <ambientLight intensity={1.25} />
                <directionalLight position={[2, 4, 3]} intensity={1.9} />
                <directionalLight position={[-2, 2, -2]} intensity={0.85} />
                <StudioEnvironment intensity={0.65} />
                <Suspense fallback={null}>
                  <CitizenAvatar
                    look={selectedLook}
                    accessories={activeAccessories}
                    animation={previewAnim}
                    position={[0, -0.85, 0]}
                  />
                </Suspense>
                <CameraFocusRig focus={cameraFocus} />
              </Canvas>
            </div>

            {/* Quick jump to outfits button for mobile */}
            <button
              type="button"
              onClick={scrollToOutfits}
              className="md:hidden absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs flex items-center gap-1.5 shadow-xl active:scale-95 transition-all"
            >
              <span>👗 See Outfits</span>
              <span>↓</span>
            </button>
            <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
              {(["idle", "dance", "wave", "spray_money"] as AvatarAnimation[]).map((anim) => (
                <button
                  key={anim}
                  type="button"
                  onClick={() => setPreviewAnim(anim)}
                  className={`px-2 py-1 rounded-full text-[10px] font-black uppercase transition ${
                    previewAnim === anim
                      ? "bg-amber-400 text-slate-950 shadow"
                      : "bg-black/50 text-white/80 hover:bg-black/70"
                  }`}
                >
                  {anim === "spray_money" ? "💸 Spray" : anim}
                </button>
              ))}
            </div>
            {/* Battery Saver / Eco Mode toggle pill */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => {
                  const next = toggleEcoMode();
                  setEcoModeState(next);
                  showToast(next ? "🔋 Eco Mode ON: Lightweight 3D saves battery" : "⚡ Full Quality 3D Mode active");
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition ${
                  ecoMode
                    ? "bg-emerald-500 text-white shadow ring-2 ring-emerald-400/40"
                    : "bg-black/50 text-slate-300 hover:text-white border border-white/10"
                }`}
                title="Toggle Battery Saver / Eco Mode (lighter 3D to save battery and network)"
              >
                <span>{ecoMode ? "🔋 Eco ON" : "⚡ Eco Mode"}</span>
              </button>
            </div>
            {/* Camera Framing Zoom Presets (Full Body / Jewelry / Head & Cap / Shoes / Nails / Watch) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 bg-black/55 backdrop-blur-md p-1 rounded-full border border-white/10 max-w-[95%] overflow-x-auto">
              {(
                [
                  { id: "full" as const, label: "🔍 Full" },
                  { id: "jewelry" as const, label: "💎 Jewelry" },
                  { id: "head" as const, label: gender === "woman" ? "👑 Head" : "🧢 Cap" },
                  { id: "shoes" as const, label: gender === "woman" ? "👠 Heels" : "👞 Shoes" },
                  ...(gender === "woman"
                    ? [{ id: "hands" as const, label: "💅 Nails" }]
                    : [{ id: "hands" as const, label: "⌚ Watch" }]),
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    setCameraFocus(cam.id);
                    if (cam.id === "hands") setPreviewAnim("wave");
                    if (cam.id === "jewelry") setPreviewAnim("spray_money");
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap transition ${
                    cameraFocus === cam.id
                      ? "bg-emerald-500 text-white shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full pointer-events-none">
              Drag horizontally to inspect 360° · Swipe vertically to scroll
            </span>
          </div>

          {/* Wardrobe Selector */}
          <div
            ref={outfitsSectionRef}
            className="md:col-span-7 p-4 sm:p-5 space-y-4 md:overflow-y-auto md:max-h-[620px]"
          >
            {/* Category Tabs — strictly separated by gender */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                {
                  id: "outfits" as const,
                  label: gender === "woman" ? "Outfits & Bridal" : "Outfits & Groom",
                  icon: gender === "woman" ? "👗" : "🤵",
                },
                {
                  id: "jewelry" as const,
                  label: "Luxury Jewelry",
                  icon: "💎",
                },
                {
                  id: "shopped" as const,
                  label: `Shopped (${mallInventory.length})`,
                  icon: "🛍️",
                },
                { id: "colors" as const, label: "Color Studio", icon: "🎨" },
                {
                  id: "wigs" as const,
                  label: gender === "woman" ? "Wigs & Crowns" : "Hair & Caps",
                  icon: gender === "woman" ? "💇‍♀️" : "🧢",
                },
                {
                  id: "shoes" as const,
                  label: gender === "woman" ? "Heels & Shoes" : "Shoes & Loafers",
                  icon: gender === "woman" ? "👠" : "👞",
                },
                ...(gender === "woman"
                  ? [{ id: "nails" as const, label: "Nails & Art", icon: "💅" }]
                  : []),
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition ${
                    activeTab === t.id
                      ? "bg-amber-400 text-slate-950 shadow"
                      : "bg-white/10 text-slate-300 hover:bg-white/15"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {activeTab === "outfits" && (
              <div>
                {pending && wornNow && suits.length > 0 && (
                  <p
                    className={`text-[11px] font-bold mb-2 ${
                      suits.includes(wornNow.occasion) ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    {suits.includes(wornNow.occasion)
                      ? `✓ ${wornNow.label} suits ${pending.venueName}`
                      : `${wornNow.label} isn't quite right for ${pending.venueName}. Try one that suits it.`}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pb-2.5">
                  {[
                    ...(pending && suits.length
                      ? [{ id: "suits" as const, label: "Suits the venue", icon: "✅" }]
                      : []),
                    { id: "all" as const, label: "All", icon: "✨" },
                    ...OCCASIONS.filter((o) => all.some((x) => x.occasion === o.id)).map((o) =>
                      o.id === "bridal" && gender === "man"
                        ? { ...o, label: "Groom & Couture", icon: "🤵" }
                        : o
                    ),
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOccasion(o.id)}
                      className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-black whitespace-nowrap transition-colors ${
                        occasion === o.id
                          ? "bg-emerald-500 text-white"
                          : "bg-white/10 text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>

                {/* Cultural Heritage Sub-Filter when browsing Traditional */}
                {occasion === "traditional" && (
                  <div className="flex flex-wrap gap-1.5 pb-3">
                    {CULTURAL_TABS.map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setCultureFilter(ct.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black transition ${
                          cultureFilter === ct.id
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {ct.flag} {ct.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Dedicated Color Swatches Bar */}
                <div className="mb-3 p-3 rounded-2xl bg-slate-800/90 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      <span>Color Swatches</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-300 cursor-pointer bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded-lg border border-white/10 transition">
                        <span>Custom</span>
                        <input
                          type="color"
                          value={selectedLook.primaryColor ?? wornNow?.defaultPrimaryColor ?? "#1e3a8a"}
                          onChange={(e) => {
                            setDyeZone("primary");
                            setSelectedLook((prev) => ({ ...prev, primaryColor: e.target.value }));
                          }}
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                          title="Pick custom color"
                        />
                      </label>
                      {selectedLook.primaryColor && (
                        <button
                          type="button"
                          onClick={() => {
                            gameAudio.playClickSound();
                            setSelectedLook((prev) => ({
                              ...prev,
                              primaryColor: wornNow?.defaultPrimaryColor,
                              secondaryColor: wornNow?.defaultSecondaryColor,
                            }));
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {FABRIC_PALETTE.map((sw) => {
                      const active = (selectedLook.primaryColor ?? wornNow?.defaultPrimaryColor) === sw.hex;
                      return (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() => {
                            setDyeZone("primary");
                            gameAudio.playClickSound();
                            setSelectedLook((prev) => ({ ...prev, primaryColor: sw.hex }));
                          }}
                          title={sw.label}
                          className={`shrink-0 w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center shadow-md ${
                            active ? "border-white scale-110 ring-2 ring-white/50" : "border-white/20 hover:scale-105"
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        >
                          {active && <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {shown.map((r) => {
                    const active = currentWear === r.id;
                    const isOwned = !r.price || ownedCloset.includes(r.id) || active;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-label={r.label}
                        title={r.label}
                        onClick={() => handleSelectOutfit(r)}
                        className={`relative rounded-2xl overflow-hidden border-2 bg-slate-800 transition-all text-left ${
                          active
                            ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02]"
                            : "border-transparent hover:border-white/20"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rosterThumb(r.id)}
                          alt={r.label}
                          className="w-full aspect-[3/4] object-cover object-[50%_75%]"
                          loading="lazy"
                        />
                        {r.defaultPrimaryColor && (
                          <span
                            className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-white shadow"
                            style={{ backgroundColor: r.defaultPrimaryColor }}
                          />
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-white text-[10px] font-bold px-1.5 pt-4 pb-1 leading-tight">
                          <span className="block truncate">{r.label}</span>
                          {!isOwned && r.price && (
                            <span className="text-amber-300 font-black">
                              AED {r.price.toLocaleString()}
                            </span>
                          )}
                        </span>
                        {active && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mall Wardrobe Shopping Callout */}
                <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <span className="text-xl p-1.5 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0">🛍️</span>
                    <div>
                      <p className="font-bold text-amber-200">Looking for more designer outfits & accessories?</p>
                      <p className="text-[11px] text-slate-400">You can shop for exclusive collections at The Dubai Mall and city shopping centers for your wardrobe.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push("/place/dubai-mall");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shrink-0 active:scale-95 transition flex items-center gap-1.5 self-end sm:self-auto shadow-sm"
                  >
                    <span>Shop at Dubai Mall</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "jewelry" && (
              <div className="space-y-4">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-400/30 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">💎</span>
                      <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                        Haute Horlogerie &amp; Luxury Jewelry
                      </h3>
                      <span className="text-[10px] font-mono font-bold bg-amber-400/25 border border-amber-400/40 text-amber-200 px-2 py-0.5 rounded-full">
                        City of Gold
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {gender === "woman"
                        ? "Curated 18K/24K gold chokers, certified diamond pendants, Colombian emeralds & luxury Swiss timepieces."
                        : "Curated 24K Miami Cuban chains, Swiss horology timepieces, diamond iced links & royal chieftaincy regalia."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClickSound();
                        setCameraFocus(cameraFocus === "jewelry" ? "full" : "jewelry");
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black hover:bg-amber-500/30 transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{cameraFocus === "jewelry" ? "Zoom Out" : "Zoom Jewelry"}</span>
                    </button>
                  </div>
                </div>

                {/* Subcategory Filter Pills */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    { id: "all" as const, label: "All Luxury Pieces", icon: "✨" },
                    {
                      id: "necklace" as const,
                      label: gender === "woman" ? "Necklaces & Chokers" : "Chains & Collars",
                      icon: "📿",
                    },
                    { id: "watch" as const, label: "Swiss Timepieces", icon: "⌚" },
                    { id: "bracelet_ring" as const, label: "Bracelets & Rings", icon: "💍" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        gameAudio.playClickSound();
                        setJewelryFilter(cat.id);
                      }}
                      className={`h-8 px-3 rounded-full text-[11px] font-black whitespace-nowrap transition-colors flex items-center gap-1 ${
                        jewelryFilter === cat.id
                          ? "bg-amber-400 text-slate-950 shadow"
                          : "bg-white/10 text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Jewelry Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Bare / No Jewelry option */}
                  {(() => {
                    const isBare = !selectedLook.jewelryId || selectedLook.jewelryId === "none";
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLook((prev) => ({
                            ...prev,
                            jewelryId: undefined,
                          }));
                          gameAudio.playClickSound();
                          showToast("✨ Bare look (No jewelry equipped)");
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition ${
                          isBare
                            ? "bg-emerald-500/20 border-emerald-400 text-white"
                            : "bg-slate-800/70 border-white/10 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-2xl">✨</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">No Jewelry / Bare</div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            Minimal Clean Look
                          </div>
                        </div>
                        {isBare && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })()}

                  {/* Filtered jewelry items */}
                  {jewelryFor(gender)
                    .filter((j) => {
                      if (jewelryFilter === "all") return true;
                      if (jewelryFilter === "necklace") return j.category === "necklace";
                      if (jewelryFilter === "watch") return j.category === "watch";
                      if (jewelryFilter === "bracelet_ring")
                        return j.category === "bracelet" || j.category === "ring";
                      return true;
                    })
                    .map((j) => {
                      const active = selectedLook.jewelryId === j.id;
                      const isOwned = ownedCloset.includes(j.id) || active;
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => {
                            if (j.category === "watch") {
                              setCameraFocus("hands");
                              setPreviewAnim("wave");
                            } else {
                              setCameraFocus("jewelry");
                              setPreviewAnim("spray_money");
                            }
                            handleSelectSubItem("jewelryId", j);
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                            active
                              ? "bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-400"
                              : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800 hover:border-white/20"
                          }`}
                        >
                          <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10">
                            {j.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {j.brand && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-300/90 bg-amber-400/15 px-1.5 py-0.5 rounded">
                                  {j.brand}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-black truncate text-white">{j.label}</div>
                            <div className="text-[10px] text-amber-300 font-bold flex items-center gap-2 mt-0.5">
                              <span>
                                {isOwned
                                  ? `Owned · +${j.closetValue} CV`
                                  : `AED ${j.price.toLocaleString()} · +${j.closetValue} CV`}
                              </span>
                            </div>
                          </div>
                          {active && <Check className="w-4 h-4 text-amber-400 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {activeTab === "shopped" && (
              <div className="space-y-3.5">
                {/* Mobile-Friendly Mall Wardrobe Banner */}
                <div className="rounded-2xl p-3 sm:p-4 bg-gradient-to-r from-amber-950/70 via-purple-950/60 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl sm:text-2xl p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0">🛍️</span>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-amber-200 truncate flex items-center gap-1.5">
                        <span>Mall &amp; Retail Store Purchases</span>
                      </h3>
                      <p className="text-[11px] text-slate-300 truncate">
                        Clothing, footwear, watches &amp; luxury accessories from Dubai malls
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        router.push("/place/dubai-mall");
                      }}
                      className="px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 transition"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Dubai Mall</span>
                    </button>
                  </div>
                </div>

                {/* Subcategory Filter Pills Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 -mx-1 px-1">
                  {SHOPPED_CATEGORIES.map((cat) => {
                    const count = shoppedCategoryCounts[cat.id];
                    const isActive = shoppedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          gameAudio.playClickSound();
                          setShoppedCategory(cat.id);
                        }}
                        className={`h-9 px-3 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
                          isActive
                            ? "bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/30 font-black"
                            : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/10"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive ? "bg-slate-950 text-amber-300" : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Content: Shopped Items Grid OR Empty State */}
                {mallInventory.length === 0 ? (
                  <div className="py-12 px-6 rounded-3xl border border-dashed border-white/15 bg-slate-950/40 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
                      🛍️
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-base font-black text-white">Your Shopping Bag is Empty</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        You haven&apos;t bought any clothes, jewelry, or accessories from retail stores yet. Visit <span className="text-amber-300 font-bold">The Dubai Mall</span>, Zara, Chanel, or city shopping centers to purchase new items for your wardrobe!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        router.push("/place/dubai-mall");
                      }}
                      className="mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 text-xs font-black shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-2"
                    >
                      <span>Go to The Dubai Mall 🛍️</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : filteredShoppedItems.length === 0 ? (
                  <div className="py-10 px-4 rounded-2xl border border-dashed border-white/10 text-center space-y-2.5 bg-slate-950/30">
                    <span className="text-3xl">🛍️</span>
                    <h4 className="text-sm font-black text-white">No items in this category</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      You haven&apos;t bought any {SHOPPED_CATEGORIES.find((c) => c.id === shoppedCategory)?.label.toLowerCase()} from malls yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShoppedCategory("all")}
                      className="mt-1 px-4 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                    >
                      Show All Shopped Items ({mallInventory.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                      <span className="font-bold text-slate-300">
                        {filteredShoppedItems.length} {filteredShoppedItems.length === 1 ? "item" : "items"}
                        {shoppedCategory !== "all" && ` in ${SHOPPED_CATEGORIES.find((c) => c.id === shoppedCategory)?.label}`}
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">Tap any item to wear or equip</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredShoppedItems.map((item) => {
                        const isAccessoryWorn = item.wearable && selectedWorn.includes(item.uid);
                        const matchingFashion = FASHION_CATALOG.find((f) => f.id === item.productId);
                        const isOutfitWorn = matchingFashion?.lookWear && selectedLook.wear === matchingFashion.lookWear;
                        const isEquipped = isAccessoryWorn || isOutfitWorn;
                        const cat = getShoppedCategory(item);

                        return (
                          <div
                            key={item.uid}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                              isEquipped
                                ? "bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                                : "bg-slate-800/70 border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-2xl shrink-0">
                                {item.icon ?? (cat === "shoes" ? "👠" : cat === "bags" ? "👜" : cat === "accessories" ? "🕶️" : cat === "beauty" ? "💄" : "👗")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs sm:text-sm font-black text-white truncate leading-tight">{item.name}</h4>
                                  {isEquipped && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black shrink-0 flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      <span>Wearing</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-amber-300 font-bold font-mono">AED {item.price.toLocaleString()}</span>
                                  <span>·</span>
                                  <span className="text-slate-400 truncate max-w-[120px]">{item.storeId ? item.storeId.replace(/-/g, " ") : "Mall Store"}</span>
                                  {item.wearable && (
                                    <>
                                      <span>·</span>
                                      <span className="text-emerald-400 font-bold capitalize">{item.wearable}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                              <span className="text-[10px] text-slate-500">
                                {item.boughtAt ? new Date(item.boughtAt).toLocaleDateString() : "Mall Collection"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleShoppedItem(item)}
                                className={`min-h-[38px] px-4 py-1.5 rounded-xl font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 ${
                                  isEquipped
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm"
                                }`}
                              >
                                {isEquipped ? "Remove" : "Wear / Equip"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "colors" && (
              <div className="space-y-4">
                {/* Gamified Couture Airbrush & Dye Studio */}
                <div className="bg-gradient-to-br from-fuchsia-950/70 via-slate-900 to-amber-950/40 border border-fuchsia-500/30 rounded-2xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                        <span>🎨 Bespoke Airbrush & Dye Studio</span>
                        {dyeMastered && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px]">
                            ✓ Master Tailor Finish
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Select garment zone & fabric weave, then pump the airbrush into the{" "}
                        <span className="text-amber-300 font-black">85%–100% Sweet Spot</span> for +AED 120!
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDyeZone("primary");
                          setCameraFocus("full");
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                          dyeZone === "primary"
                            ? "bg-amber-400 text-slate-950"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        👗 Primary Outfit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDyeZone("secondary");
                          setCameraFocus("head");
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                          dyeZone === "secondary"
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {gender === "woman" ? "👑 Gele / Veil" : "🧢 Cap / Trim"}
                      </button>
                    </div>
                  </div>

                  {/* Luxury Weave & Finish Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: "silk" as const, label: "✨ Silk Sheen" },
                        { id: "velvet" as const, label: "👑 Velvet Matte" },
                        { id: "metallic" as const, label: "💎 Metallic Brocade" },
                        { id: "gold_thread" as const, label: "🌟 24K Gold Thread" },
                      ] as const
                    ).map((fin) => (
                      <button
                        key={fin.id}
                        type="button"
                        onClick={() => {
                          setDyeFinish(fin.id);
                          gameAudio.playClickSound();
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition ${
                          dyeFinish === fin.id
                            ? "bg-fuchsia-500/25 border-fuchsia-400 text-white"
                            : "bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {fin.label}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Airbrush Pressure Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-300">
                        Airbrush Coat Saturation:{" "}
                        <span className="text-amber-300 font-black">{airbrushPressure}%</span>
                      </span>
                      <span className="text-emerald-300 font-black">Target: 85%–100%</span>
                    </div>
                    <div className="relative h-3.5 rounded-full bg-slate-950 overflow-hidden border border-white/10">
                      {/* Target Sweet Spot Zone */}
                      <div
                        className="absolute inset-y-0 bg-emerald-500/25 border-l-2 border-emerald-400"
                        style={{ left: "85%", width: "15%" }}
                      />
                      <div
                        className="h-full transition-all duration-200 rounded-full"
                        style={{
                          width: `${airbrushPressure}%`,
                          backgroundColor:
                            dyeZone === "primary"
                              ? selectedLook.primaryColor ?? "#059669"
                              : selectedLook.secondaryColor ?? "#d4af37",
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          gameAudio.playClickSound();
                          const next = Math.min(100, airbrushPressure + 25);
                          setAirbrushPressure(next);
                          if (next >= 85 && !dyeMastered) {
                            setDyeMastered(true);
                            adjustBalance(120);
                            gameAudio.playCoinSound();
                            setPreviewAnim("dance");
                            setTimeout(() => setPreviewAnim("idle"), 2600);
                            showToast(
                              `🎨 Master Tailor Dye Locked (${dyeFinish.replace("_", " ")})! +AED 120 Bonus!`
                            );
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white text-xs font-black shadow active:scale-95 transition"
                      >
                        💨 Spray Airbrush Coat (+25%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAirbrushPressure(0);
                          setDyeMastered(false);
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold"
                      >
                        Reset Coat
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Outfit Fabric Swatches + Custom Color */}
                <div className="bg-slate-800/70 border border-white/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Palette className="w-4 h-4" />
                      <span>Primary Outfit Fabric Color</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedLook.primaryColor ?? "#059669"}
                        onChange={(e) => {
                          setDyeZone("primary");
                          setCameraFocus("full");
                          setSelectedLook((prev) => ({ ...prev, primaryColor: e.target.value }));
                        }}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        title="Pick any custom fabric color"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLook((prev) => ({
                            ...prev,
                            primaryColor: wornNow?.defaultPrimaryColor,
                            secondaryColor: wornNow?.defaultSecondaryColor,
                          }))
                        }
                        className="text-[11px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Reset Original
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {FABRIC_PALETTE.map((sw) => {
                      const active = selectedLook.primaryColor === sw.hex;
                      return (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() => {
                            setDyeZone("primary");
                            setCameraFocus("full");
                            gameAudio.playClickSound();
                            setSelectedLook((prev) => ({ ...prev, primaryColor: sw.hex }));
                          }}
                          title={sw.label}
                          className={`h-9 rounded-xl border-2 transition flex items-center justify-center ${
                            active ? "border-white scale-105 shadow-lg" : "border-white/15"
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        >
                          {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Headgear / Cap / Trim Accent Swatches + Custom Color */}
                <div className="bg-slate-800/70 border border-white/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      <span>
                        {gender === "woman"
                          ? "Headgear / Gele / Veil Accent Color"
                          : "Cap / Turban / Trim Accent Color"}
                      </span>
                    </span>
                    <input
                      type="color"
                      value={selectedLook.secondaryColor ?? "#d4af37"}
                      onChange={(e) => {
                        setDyeZone("secondary");
                        setSelectedLook((prev) => ({ ...prev, secondaryColor: e.target.value }));
                      }}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      title="Pick any custom accent color"
                    />
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {FABRIC_PALETTE.map((sw) => {
                      const active = selectedLook.secondaryColor === sw.hex;
                      return (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() => {
                            setDyeZone("secondary");
                            gameAudio.playClickSound();
                            setSelectedLook((prev) => ({ ...prev, secondaryColor: sw.hex }));
                          }}
                          title={sw.label}
                          className={`h-9 rounded-xl border-2 transition flex items-center justify-center ${
                            active ? "border-white scale-105 shadow-lg" : "border-white/15"
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        >
                          {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "wigs" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2">
                  <span>
                    {gender === "woman"
                      ? "👑 3D Wigs, Gele, Okuku & Bridal Crowns sit snugly on your avatar's head."
                      : "🧢 3D Fila Caps, Igbo Red Caps, Ghutra & Fades fit your avatar's head snugly."}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {Boolean(
                      (selectedLook.wigId && selectedLook.wigId !== "none") ||
                      (!selectedLook.wigId && wearOutfit?.defaultWigId)
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLook((prev) => ({ ...prev, wigId: "none" }));
                          setSelectedWorn((prev) =>
                            prev.filter(
                              (id) => !ownedAccessories.find((a) => a.uid === id && a.wearable === "cap")
                            )
                          );
                          gameAudio.playClickSound();
                          showToast(
                            gender === "woman"
                              ? "✨ Natural hair restored (No wig)"
                              : "✨ Natural hair restored (No cap)"
                          );
                        }}
                        className="text-rose-400 hover:text-rose-300 font-black text-[10px] bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg transition"
                      >
                        {gender === "woman" ? "✕ Remove Wig" : "✕ Remove Cap"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCameraFocus(cameraFocus === "head" ? "full" : "head")}
                      className="text-amber-300 font-black underline"
                    >
                      {cameraFocus === "head" ? "Zoom Out" : "Zoom Head"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Primary Option: Natural Hair / No Cap / No Wig */}
                  {(() => {
                    const isNone =
                      selectedLook.wigId === "none" ||
                      (!selectedLook.wigId && !wearOutfit?.defaultWigId);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLook((prev) => ({ ...prev, wigId: "none" }));
                          setSelectedWorn((prev) =>
                            prev.filter(
                              (id) => !ownedAccessories.find((a) => a.uid === id && a.wearable === "cap")
                            )
                          );
                          gameAudio.playClickSound();
                          showToast(
                            gender === "woman"
                              ? "✨ Natural hair restored (No wig)"
                              : "✨ Natural hair restored (No cap)"
                          );
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                          isNone
                            ? "bg-emerald-500/20 border-emerald-400 text-white"
                            : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-2xl">✨</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">
                            {gender === "woman" ? "Natural Hair (No Wig)" : "Natural Hair (No Cap)"}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            Default Natural Look
                          </div>
                        </div>
                        {isNone && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })()}

                  {wigsFor(gender).map((w) => {
                    const active =
                      selectedLook.wigId === w.id ||
                      (!selectedLook.wigId && wearOutfit?.defaultWigId === w.id);
                    const isOwned = ownedCloset.includes(w.id) || active;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          handleSelectSubItem("wigId", w);
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                          active
                            ? "bg-emerald-500/20 border-emerald-400 text-white"
                            : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-2xl">{w.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">{w.label}</div>
                          <div className="text-[10px] text-amber-300 font-bold">
                            {isOwned ? `Owned · +${w.closetValue} CV` : `AED ${w.price.toLocaleString()} · +${w.closetValue} CV`}
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "shoes" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2">
                  <span>
                    {gender === "woman"
                      ? "👠 3D Stiletto Heels, Red Bottoms & Bridal Pumps fit flush on your feet."
                      : "👞 3D Velvet Loafers, Patent Oxfords, High-Tops & Mojari shoes wrap your feet."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCameraFocus(cameraFocus === "shoes" ? "full" : "shoes")}
                    className="text-amber-300 font-black underline shrink-0 ml-2"
                  >
                    {cameraFocus === "shoes" ? "Zoom Out" : "Zoom Shoes"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shoesFor(gender).map((s) => {
                    const active = selectedLook.shoeId === s.id;
                    const isOwned = ownedCloset.includes(s.id) || active;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          handleSelectSubItem("shoeId", s);
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                          active
                            ? "bg-emerald-500/20 border-emerald-400 text-white"
                            : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">{s.label}</div>
                          <div className="text-[10px] text-amber-300 font-bold">
                            {isOwned ? `Owned · +${s.closetValue} CV` : `AED ${s.price.toLocaleString()} · +${s.closetValue} CV`}
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "nails" && (
              <div className="space-y-4">
                {gender === "woman" && (
                  <>
                    {/* Step 1: Select Acrylic Nail Shape or Natural Bare Nails */}
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const isBare = !selectedLook.nailId || selectedLook.nailId === "none";
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLook((prev) => ({
                                ...prev,
                                nailId: undefined,
                                nailColor: undefined,
                              }));
                              setFingerCoats([0, 0, 0, 0, 0]);
                              setFingerGems([false, false, false, false, false]);
                              setUvCureProgress(0);
                              gameAudio.playClickSound();
                              showToast("✨ Natural bare nails restored (No acrylics)");
                            }}
                            className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                              isBare
                                ? "bg-emerald-500/20 border-emerald-400 text-white"
                                : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-2xl">💅</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black truncate">Natural Bare Nails</div>
                              <div className="text-[10px] text-emerald-400 font-bold">
                                Clean Natural Fingernails
                              </div>
                            </div>
                            {isBare && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })()}
                      {nailsFor(gender).map((n) => {
                        const active = selectedLook.nailId === n.id;
                        const isOwned = ownedCloset.includes(n.id) || active;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setCameraFocus("hands");
                              setPreviewAnim("wave");
                              handleSelectSubItem("nailId", n);
                            }}
                            className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                              active
                                ? "bg-emerald-500/20 border-emerald-400 text-white"
                                : "bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-2xl">{n.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black truncate">{n.label}</div>
                              <div className="text-[10px] text-amber-300 font-bold">
                                {isOwned ? `Owned · +${n.closetValue} CV` : `AED ${n.price.toLocaleString()} · +${n.closetValue} CV`}
                              </div>
                            </div>
                            {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Step 2 & 3: Gamified 5-Finger Nail Painting & UV LED Gel Cure Studio */}
                    <div className="bg-gradient-to-br from-pink-950/70 via-slate-900 to-fuchsia-950/60 border border-pink-500/30 rounded-2xl p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                            <span>💅 5-Finger Nail Art & UV Gel Salon</span>
                            {uvCureProgress === 100 && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px]">
                                ✨ UV Gel Cured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Pick a polish color, tap each finger to brush 2 coats & add 3D gems, then cure under UV LED!
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedLook.nailColor ?? "#ec4899"}
                            onChange={(e) => {
                              const hex = e.target.value;
                              setCameraFocus("hands");
                              setPreviewAnim("wave");
                              setSelectedLook((prev) => ({
                                ...prev,
                                nailId: prev.nailId ?? "pink_coffin_xl",
                                nailColor: hex,
                              }));
                              setUvCureProgress(0);
                            }}
                            className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            title="Custom Nail Polish Color"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              gameAudio.playClickSound();
                              setFingerCoats([2, 2, 2, 2, 2]);
                              setSelectedLook((prev) => ({
                                ...prev,
                                nailId: prev.nailId ?? "pink_coffin_xl",
                                nailColor: prev.nailColor ?? "#ec4899",
                              }));
                            }}
                            className="px-2.5 py-1 rounded-xl bg-pink-500/25 border border-pink-400/40 text-pink-200 text-[10px] font-black hover:bg-pink-500/35 transition"
                          >
                            🖌️ Brush All 5
                          </button>
                        </div>
                      </div>

                      {/* Nail Polish Swatches */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {FABRIC_PALETTE.map((sw) => {
                          const active = (selectedLook.nailColor ?? "#ec4899") === sw.hex;
                          return (
                            <button
                              key={sw.id}
                              type="button"
                              onClick={() => {
                                gameAudio.playClickSound();
                                setCameraFocus("hands");
                                setPreviewAnim("wave");
                                setSelectedLook((prev) => ({
                                  ...prev,
                                  nailId: prev.nailId ?? "pink_coffin_xl",
                                  nailColor: sw.hex,
                                }));
                                setUvCureProgress(0);
                              }}
                              title={sw.label}
                              className={`h-7 rounded-lg border transition flex items-center justify-center ${
                                active ? "border-white scale-105 shadow" : "border-white/15"
                              }`}
                              style={{ backgroundColor: sw.hex }}
                            >
                              {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Nail Art Finish Selector */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {(
                          [
                            { id: "diamond_studs" as const, label: "💎 Swarovski Gems" },
                            { id: "gold_foil" as const, label: "✨ 24K Gold Foil" },
                            { id: "french_ombre" as const, label: "🌸 French Ombré" },
                            { id: "chrome_glaze" as const, label: "🌈 Chrome Glaze" },
                          ] as const
                        ).map((art) => (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => {
                              setNailArtFinish(art.id);
                              gameAudio.playClickSound();
                            }}
                            className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition ${
                              nailArtFinish === art.id
                                ? "bg-pink-500/30 border-pink-400 text-white"
                                : "bg-slate-900/70 border-white/10 text-slate-300"
                            }`}
                          >
                            {art.label}
                          </button>
                        ))}
                      </div>

                      {/* Interactive 5-Finger Hand Painting Canvas */}
                      <div className="grid grid-cols-5 gap-2 pt-1">
                        {FINGER_NAMES.map((fName, idx) => {
                          const coats = fingerCoats[idx] ?? 0;
                          const hasGem = fingerGems[idx] ?? false;
                          const polishHex = selectedLook.nailColor ?? "#ec4899";
                          return (
                            <div
                              key={fName}
                              className="bg-slate-950/75 border border-white/10 rounded-2xl p-2 flex flex-col items-center gap-1.5"
                            >
                              {/* Sculpted Acrylic Nail Visual */}
                              <button
                                type="button"
                                onClick={() => {
                                  gameAudio.playClickSound();
                                  setCameraFocus("hands");
                                  setPreviewAnim("wave");
                                  setSelectedLook((prev) => ({
                                    ...prev,
                                    nailId: prev.nailId ?? "pink_coffin_xl",
                                    nailColor: polishHex,
                                  }));
                                  setFingerCoats((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = copy[idx] >= 2 ? 1 : (copy[idx] ?? 0) + 1;
                                    return copy;
                                  });
                                }}
                                title={`Paint ${fName} Nail`}
                                className="relative w-9 h-14 rounded-t-full rounded-b-lg border-2 border-white/25 flex flex-col items-center justify-center transition transform active:scale-95 overflow-hidden shadow-inner"
                                style={{
                                  backgroundColor:
                                    coats === 0
                                      ? "#334155"
                                      : coats === 1
                                      ? `${polishHex}99`
                                      : polishHex,
                                  boxShadow:
                                    uvCureProgress === 100
                                      ? `0 0 14px ${polishHex}`
                                      : undefined,
                                }}
                              >
                                {/* Gloss highlight */}
                                <span className="absolute top-1.5 left-1.5 w-1.5 h-5 rounded-full bg-white/45" />
                                {nailArtFinish === "french_ombre" && (
                                  <span className="absolute top-0 inset-x-0 h-3.5 bg-white/85" />
                                )}
                                {hasGem && (
                                  <span className="text-xs drop-shadow">
                                    {nailArtFinish === "gold_foil" ? "✨" : "💎"}
                                  </span>
                                )}
                              </button>
                              <span className="text-[10px] font-black text-slate-200">{fName}</span>
                              <span className="text-[9px] font-bold text-pink-300">
                                {coats === 0 ? "Bare" : coats === 1 ? "1 Coat" : "2 Coats ✓"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  gameAudio.playClickSound();
                                  setFingerGems((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = !copy[idx];
                                    return copy;
                                  });
                                }}
                                className={`w-full py-0.5 rounded-lg text-[9px] font-black border transition ${
                                  hasGem
                                    ? "bg-amber-400/20 border-amber-400/50 text-amber-200"
                                    : "bg-white/5 border-white/10 text-slate-400"
                                }`}
                              >
                                {hasGem ? "💎 Gem On" : "+ Gem"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Step 3: UV LED Gel Lamp Cure Action */}
                      <div className="pt-1 space-y-1.5">
                        {uvCuring || uvCureProgress > 0 ? (
                          <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden border border-purple-400/40">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-pink-400 transition-all duration-300"
                              style={{ width: `${uvCureProgress}%` }}
                            />
                          </div>
                        ) : null}
                        <button
                          type="button"
                          disabled={uvCuring}
                          onClick={() => {
                            setCameraFocus("hands");
                            setPreviewAnim("wave");
                            setFingerCoats([2, 2, 2, 2, 2]);
                            setSelectedLook((prev) => ({
                              ...prev,
                              nailId: prev.nailId ?? "pink_coffin_xl",
                              nailColor: prev.nailColor ?? "#ec4899",
                            }));
                            setUvCuring(true);
                            setUvCureProgress(35);
                            gameAudio.playClickSound();
                            setTimeout(() => setUvCureProgress(75), 300);
                            setTimeout(() => {
                              setUvCureProgress(100);
                              setUvCuring(false);
                              adjustBalance(150);
                              gameAudio.playCoinSound();
                              showToast(
                                "🟣 UV LED Gel Cured! Glossy 3D Acrylic Set locked +AED 150 Salon Bonus!"
                              );
                            }, 700);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-fuchsia-500/25 active:scale-98 transition"
                        >
                          {uvCuring
                            ? "🟣 Curing Under UV LED Lamp..."
                            : uvCureProgress === 100
                            ? "✨ Re-Cure Under UV LED Lamp (+AED 150 Bonus Earned)"
                            : "🟣 Cure All 5 Nails Under UV LED Lamp (+AED 150 Bonus)"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Owned Accessories */}
                {ownedAccessories.length > 0 && (
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jewelry & Accessories</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ownedAccessories.map((item) => {
                        const active = selectedWorn.includes(item.uid);
                        return (
                          <button
                            key={item.uid}
                            type="button"
                            onClick={() => toggleAccessory(item.uid)}
                            className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                              active
                                ? "bg-emerald-500/20 border-emerald-500 text-white"
                                : "bg-slate-800/60 border-white/5 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-xl">{item.icon ?? "✨"}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400 capitalize">
                                {item.wearable}
                              </div>
                            </div>
                            {active && (
                              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Quick Jump Back to Avatar Pill (Mobile) */}
        {scrolledToOutfits && (
          <button
            type="button"
            onClick={scrollToAvatar}
            className="md:hidden fixed sm:absolute bottom-20 right-4 z-40 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-black text-white border border-white/20 font-black text-xs flex items-center gap-1.5 shadow-2xl backdrop-blur-md active:scale-95 transition-all"
          >
            <span>🧍 View Avatar</span>
            <span className="text-emerald-400 font-black">↑</span>
          </button>
        )}

        {/* Footer Confirmation Bar */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAndContinue}
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all ml-auto"
          >
            {pending ? (
              <>
                <span>Confirm & Head to {pending.venueName}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Look (💎 CV {closetValue.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
