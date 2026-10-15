"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Sparkles, ArrowRight, Shirt, Compass } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CitizenAvatar, StudioEnvironment } from "@/components/avatar/CitizenAvatar";
import { presetFor, rosterFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { useCitizen, updateCitizen } from "@/lib/citizenStore";
import { getPendingVenue, clearPendingVenue, type PendingVenue } from "@/components/city/VenueDressCodeModal";
import { useRouter } from "next/navigation";
import type { Accessory } from "@/lib/city/types";

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

  useEffect(() => {
    if (open) {
      const p = getPendingVenue();
      setPending(p);
      if (citizen?.look) setSelectedLook(citizen.look);
      if (citizen?.worn) setSelectedWorn(citizen.worn);
    }
  }, [open, citizen]);

  const gender = selectedLook.gender;
  const face = presetFor(selectedLook);
  const currentWear = selectedLook.wear ?? face;
  const people = rosterFor(gender);

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
      <DialogContent className="bg-slate-900 text-white border border-white/10 shadow-2xl w-[95vw] max-w-2xl max-h-[92vh] overflow-hidden rounded-[32px] p-0 flex flex-col">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
              <Shirt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Your Wardrobe</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Switch into any of your owned outfits & accessories
              </p>
            </div>
          </div>
        </div>

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
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2">
          {/* 3D Turntable Preview */}
          <div className="relative h-64 md:h-auto bg-gradient-to-b from-slate-950/80 to-slate-900 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center">
            <div className="absolute inset-0">
              <Canvas
                camera={{ position: [0, 1.2, 2.5], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={1.2} />
                <directionalLight position={[2, 4, 3]} intensity={1.8} />
                <directionalLight position={[-2, 2, -2]} intensity={0.8} />
                <StudioEnvironment intensity={0.6} />
                <Suspense fallback={null}>
                  <CitizenAvatar
                    look={selectedLook}
                    accessories={activeAccessories}
                    animation="idle"
                    position={[0, -0.85, 0]}
                  />
                </Suspense>
                <OrbitControls
                  enablePan={false}
                  minDistance={1.4}
                  maxDistance={3.6}
                  minPolarAngle={Math.PI / 4}
                  maxPolarAngle={Math.PI / 1.8}
                />
              </Canvas>
            </div>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full pointer-events-none">
              Drag to inspect 360°
            </span>
          </div>

          {/* Wardrobe Selector */}
          <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[50vh] md:max-h-[550px]">
            {/* Outfits Category */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Owned Outfits</span>
                <span className="text-[10px] text-slate-500 font-bold">{people.length} available</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {people.map((r) => {
                  const active = currentWear === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        setSelectedLook((prev) => ({
                          ...prev,
                          custom: undefined,
                          wear: r.id === face ? undefined : r.id,
                        }))
                      }
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
                      <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white text-[10px] font-bold px-1.5 pt-4 pb-1 leading-tight truncate">
                        {r.label}
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

            {/* Owned Accessories */}
            {ownedAccessories.length > 0 && (
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Accessories
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ownedAccessories.map((item) => {
                    const active = selectedWorn.includes(item.uid);
                    return (
                      <button
                        key={item.uid}
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
        </div>

        {/* Footer Confirmation Bar */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
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
                <span>Save Outfit</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
