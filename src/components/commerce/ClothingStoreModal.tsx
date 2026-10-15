"use client";

import React, { useState, Suspense, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  ShoppingBag, Check, Sparkles, RotateCw, ZoomIn, 
  Shirt, Eye, ShieldCheck, Tag, X, ChevronRight 
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CitizenAvatar, StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { useCitizen, updateCitizen, adjustBalance, type InventoryItem } from "@/lib/citizenStore";
import { 
  FASHION_CATALOG, FASHION_CATEGORIES, 
  type FashionCategory, type FashionItem 
} from "@/lib/fashionCatalog";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { Accessory } from "@/lib/city/types";
import { gameAudio } from "@/utils/gameAudio";

interface ClothingStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName?: string;
}

export function ClothingStoreModal({
  open,
  onOpenChange,
  storeName = "Dubai Fashion Avenue",
}: ClothingStoreModalProps) {
  const { citizen } = useCitizen();
  const balance = citizen?.balance ?? 0;

  const [category, setCategory] = useState<FashionCategory | "all">("all");
  const [selectedItem, setSelectedItem] = useState<FashionItem>(FASHION_CATALOG[0]);
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Initial user look
  const initialLook = citizen?.look ?? { gender: "woman", bodyType: "Hourglass" };
  const [previewLook, setPreviewLook] = useState<AvatarLookProps>(initialLook);

  // Active preview accessories
  const initialAccessories: Accessory[] = useMemo(() => {
    const ids = new Set(citizen?.worn ?? []);
    return (citizen?.inventory ?? [])
      .filter((i) => ids.has(i.uid) && i.wearable)
      .map((i) => i.wearable as Accessory);
  }, [citizen?.worn, citizen?.inventory]);

  const [previewAccessories, setPreviewAccessories] = useState<Accessory[]>(initialAccessories);

  // Items currently owned by user
  const ownedItemIds = useMemo(() => {
    return new Set((citizen?.inventory ?? []).map((i) => i.productId));
  }, [citizen?.inventory]);

  const filteredCatalog = useMemo(() => {
    const gender = previewLook.gender;
    return FASHION_CATALOG.filter((item) => {
      const matchCat = category === "all" || item.category === category;
      const matchGender = item.gender === "unisex" || item.gender === gender;
      return matchCat && matchGender;
    });
  }, [category, previewLook.gender]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Try-on item (combines outfits and accessories)
  const handleTryOn = (item: FashionItem) => {
    setSelectedItem(item);
    gameAudio.playClickSound();

    if (item.lookWear) {
      setPreviewLook((prev) => ({
        ...prev,
        custom: undefined,
        wear: item.lookWear,
      }));
    }

    if (item.accessory) {
      const acc = item.accessory;
      setPreviewAccessories((prev) => {
        if (prev.includes(acc)) return prev;
        return [...prev, acc];
      });
    }
  };

  const handleRemoveAccessory = (acc: Accessory) => {
    setPreviewAccessories((prev) => prev.filter((a) => a !== acc));
  };

  const handleResetOutfit = () => {
    setPreviewLook(initialLook);
    setPreviewAccessories(initialAccessories);
    showToast("Reset to your current outfit");
  };

  // Purchase item and persist to permanent wardrobe
  const handleBuy = () => {
    if (!citizen) return;
    if (balance < selectedItem.price) {
      showToast(`⚠️ Insufficient funds! You need AED ${selectedItem.price.toLocaleString()}`);
      return;
    }

    setPurchasing(true);
    const success = adjustBalance(-selectedItem.price);
    if (!success) {
      setPurchasing(false);
      showToast("⚠️ Transaction declined. Please check wallet.");
      return;
    }

    gameAudio.playCoinSound();

    const uniqueId = `wardrobe-${selectedItem.id}-${Date.now().toString(36)}`;
    const inventoryItem: InventoryItem = {
      uid: uniqueId,
      productId: selectedItem.id,
      storeId: "dubai-fashion-store",
      name: selectedItem.name,
      price: selectedItem.price,
      boughtAt: new Date().toISOString(),
      icon: selectedItem.icon,
      wearable: selectedItem.accessory,
    };

    updateCitizen((c) => ({
      ...c,
      inventory: [...(c.inventory ?? []), inventoryItem],
      // If equipping immediately
      look: selectedItem.lookWear ? { ...c.look, custom: undefined, wear: selectedItem.lookWear, gender: previewLook.gender } : c.look,
      worn: selectedItem.accessory ? [...(c.worn ?? []), uniqueId] : c.worn,
    }));

    setPurchasing(false);
    showToast(`🎉 Purchased ${selectedItem.name}! Saved to your permanent wardrobe.`);
  };

  const isSelectedOwned = ownedItemIds.has(selectedItem.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border border-white/10 shadow-2xl w-[96vw] max-w-5xl max-h-[92vh] overflow-hidden rounded-[32px] p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">{storeName}</h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  3D Fitting Room
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Try on virtual fashion, combine pieces, and build your Dubai wardrobe
              </p>
            </div>
          </div>

          {/* Wallet Balance Pill */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full px-3 py-1.5 text-xs font-black font-mono shadow-sm">
            AED {balance.toLocaleString()}
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="bg-slate-950/30 border-b border-white/5 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {FASHION_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-white text-slate-900 shadow-md font-black"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left: 3D Avatar Fitting Room Turntable (5 cols) */}
          <div className="lg:col-span-5 relative h-72 sm:h-80 lg:h-full bg-gradient-to-b from-slate-950/90 via-slate-900 to-slate-950 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10">
            {/* Turntable Canvas */}
            <div className="absolute inset-0">
              <Canvas
                camera={{ position: [0, 1.25, 2.6], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={1.2} />
                <directionalLight position={[2, 4, 3]} intensity={1.9} />
                <directionalLight position={[-2, 2, -2]} intensity={0.9} />
                <pointLight position={[0, 2.5, 1]} intensity={2} color="#fef08a" />
                <StudioEnvironment intensity={0.65} />
                <Suspense fallback={null}>
                  <CitizenAvatar
                    look={previewLook}
                    accessories={previewAccessories}
                    animation="idle"
                    position={[0, -0.9, 0]}
                  />
                </Suspense>
                <OrbitControls
                  enablePan={false}
                  minDistance={1.4}
                  maxDistance={3.8}
                  minPolarAngle={Math.PI / 4}
                  maxPolarAngle={Math.PI / 1.8}
                />
              </Canvas>
            </div>

            {/* Turntable overlay helper */}
            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-xl p-2 text-[10px] text-slate-300 font-bold border border-white/5 space-y-1 pointer-events-none">
              <div>🔄 Drag avatar to inspect 360°</div>
              <div>👗 Wearing: {previewLook.wear ?? "Default"}</div>
              {previewAccessories.length > 0 && (
                <div className="text-amber-400">
                  + {previewAccessories.join(", ")}
                </div>
              )}
            </div>

            {/* Reset button */}
            <button
              onClick={handleResetOutfit}
              className="absolute bottom-3 left-3 py-1.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] backdrop-blur-md border border-white/10 transition-all flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right: Products Browser & Details (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-900/60">
            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCatalog.map((item) => {
                  const isSelected = selectedItem.id === item.id;
                  const isOwned = ownedItemIds.has(item.id);
                  const isEquipped =
                    (item.lookWear && previewLook.wear === item.lookWear) ||
                    (item.accessory && previewAccessories.includes(item.accessory));

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleTryOn(item)}
                      className={`relative group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-slate-800 border-amber-500 ring-2 ring-amber-500/20 shadow-lg scale-[1.02]"
                          : "bg-slate-800/60 border-white/5 hover:border-white/20 hover:bg-slate-800"
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex flex-col items-end gap-1">
                          {isEquipped && (
                            <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                              Equipped
                            </span>
                          )}
                          {isOwned && (
                            <span className="text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-md">
                              Owned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div className="space-y-1 mb-3">
                        <div className="text-xs font-black text-white leading-tight line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                          {item.desc}
                        </div>
                      </div>

                      {/* Bottom Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-black">
                        <span className="text-amber-400 font-mono">
                          AED {item.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-white flex items-center">
                          Try on <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl">{selectedItem.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">
                    {selectedItem.name}
                  </div>
                  <div className="text-xs font-black text-amber-400 font-mono">
                    AED {selectedItem.price.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSelectedOwned ? (
                  <button
                    disabled
                    className="py-3 px-5 rounded-2xl bg-white/10 text-slate-400 font-bold text-xs flex items-center gap-2 cursor-not-allowed"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>In Your Wardrobe</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={purchasing || balance < selectedItem.price}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy for AED {selectedItem.price.toLocaleString()}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl">
            {toast}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
