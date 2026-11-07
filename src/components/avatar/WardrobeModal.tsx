"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, ArrowRight, Shirt, Sparkles, Palette, Crown, Trophy } from "lucide-react";
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
import { useCitizen, updateCitizen, adjustBalance } from "@/lib/citizenStore";
import { getPendingVenue, clearPendingVenue, type PendingVenue } from "@/components/city/VenueDressCodeModal";
import { useRouter } from "next/navigation";
import { gameAudio } from "@/utils/gameAudio";
import type { Accessory } from "@/lib/city/types";

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

type CameraFocusMode = "full" | "head" | "shoes" | "hands";

const CAMERA_PRESETS: Record<
  CameraFocusMode,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  full: { pos: [0, 0.08, 4.4], target: [0, 0.08, 0] },
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
  const [activeTab, setActiveTab] = useState<"outfits" | "colors" | "wigs" | "shoes" | "nails">("outfits");
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
  const handleSelectTab = (tab: "outfits" | "colors" | "wigs" | "shoes" | "nails") => {
    setActiveTab(tab);
    if (tab === "nails" && selectedLook.gender === "woman") {
      setPreviewAnim("wave");
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

  // Owned accessories from inventory
  const ownedAccessories = (citizen?.inventory ?? []).filter((item) => item.wearable);

  const activeAccessories: Accessory[] = ownedAccessories
    .filter((item) => selectedWorn.includes(item.uid) && item.wearable)
    .map((item) => item.wearable as Accessory);

  const toggleAccessory = (uid: string) => {
    setSelectedWorn((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
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
    setSelectedLook((prev) => ({
      ...prev,
      custom: undefined,
      wear: r.id === face ? undefined : r.id,
      primaryColor: r.defaultPrimaryColor ?? prev.primaryColor,
      secondaryColor: r.defaultSecondaryColor ?? prev.secondaryColor,
      wigId: r.defaultWigId ?? prev.wigId,
    }));
  };

  const handleSelectSubItem = (
    kind: "wigId" | "shoeId" | "nailId",
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
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
          {/* 3D Turntable Preview */}
          <div className="md:col-span-5 relative h-80 sm:h-96 md:h-auto md:min-h-[500px] bg-gradient-to-b from-slate-950/80 to-slate-900 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center">
            <div className="absolute inset-0">
              <Canvas
                camera={{ position: [0, 0.08, 4.4], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
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
            {/* Camera Framing Zoom Presets (Full Body / Head & Cap / Shoes / Nails) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 bg-black/55 backdrop-blur-md p-1 rounded-full border border-white/10">
              {(
                [
                  { id: "full" as const, label: "🔍 Full" },
                  { id: "head" as const, label: gender === "woman" ? "👑 Head" : "🧢 Cap" },
                  { id: "shoes" as const, label: gender === "woman" ? "👠 Heels" : "👞 Shoes" },
                  ...(gender === "woman" ? [{ id: "hands" as const, label: "💅 Nails" }] : []),
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    setCameraFocus(cam.id);
                    if (cam.id === "hands") setPreviewAnim("wave");
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
              Drag to inspect 360° · Pinch/scroll to zoom
            </span>
          </div>

          {/* Wardrobe Selector */}
          <div className="md:col-span-7 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[52vh] md:max-h-[560px]">
            {/* Category Tabs — strictly separated by gender */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                {
                  id: "outfits" as const,
                  label: gender === "woman" ? "Outfits & Bridal" : "Outfits & Groom",
                  icon: gender === "woman" ? "👗" : "🤵",
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
                  ? [{ id: "nails" as const, label: "Nails & Bling", icon: "💅" }]
                  : ownedAccessories.length > 0
                  ? [{ id: "nails" as const, label: "Watches & Bling", icon: "⌚" }]
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
                              primaryColor: undefined,
                              secondaryColor: undefined,
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
                            primaryColor: undefined,
                            secondaryColor: undefined,
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
                    {/* Step 1: Select 3D Acrylic Nail Shape */}
                    <div className="grid grid-cols-2 gap-2">
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
