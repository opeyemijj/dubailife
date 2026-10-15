"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Compass, HelpCircle, Check, Sparkles, Footprints, 
  Wine, UtensilsCrossed, Shirt, Music, MessageSquare 
} from "lucide-react";
import type { Venue } from "@/lib/city/types";

interface VenueGuideModalProps {
  venue: Venue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenueGuideModal({ venue, open, onOpenChange }: VenueGuideModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const layout = venue.layout;
  const storageKey = `venue_guide_seen_${layout}`;

  const handleClose = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
    }
    onOpenChange(false);
  };

  const isClub = layout === "club";
  const isDining = layout === "dining";
  const isFashion = layout === "boutique" || venue.category.toLowerCase().includes("fashion");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border border-white/10 shadow-2xl w-[94vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] p-6 sm:p-7">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-lg">
              {isClub ? "🪩" : isDining ? "🍽️" : isFashion ? "👗" : "🏛️"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
                <Sparkles className="w-3 h-3" />
                <span>Venue Interaction Guide</span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight">
                {isClub
                  ? "Nightclub & VIP Lounge Guide"
                  : isDining
                  ? "Dining & Social Guide"
                  : isFashion
                  ? "Boutique & Fitting Room Guide"
                  : `Welcome to ${venue.name}`}
              </h2>
              <p className="text-xs text-slate-400">
                Quick guide on controls, features, and interactions here.
              </p>
            </div>
          </div>

          {/* Interactive features list */}
          <div className="space-y-2.5">
            {isClub && (
              <>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">💃</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Dance Floor</span>
                    <span className="text-slate-400">
                      Tap the dance floor or the bottom Dance button to party with other citizens.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🍸</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Drinks & Socialize</span>
                    <span className="text-slate-400">
                      Walk to the bar to order cocktails. Your avatar will hold the drink and drink visibly in real-time.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🍾</span>
                  <div className="text-xs">
                    <span className="font-bold text-amber-300 block">VIP Bottle Service</span>
                    <span className="text-slate-400">
                      Order bottle service at your booth. Sparklers arrive with hosts, an announcement banner flashes your @username, and your table is marked with a VIP label!
                    </span>
                  </div>
                </div>
              </>
            )}

            {isDining && (
              <>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🪑</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Table Seating</span>
                    <span className="text-slate-400">
                      Tap any dining table or booth to sit down comfortably with friends or other diners.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🍽️</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Dishes & Dining Animation</span>
                    <span className="text-slate-400">
                      Order from the menu: food items appear on your table, triggering visible eating animations seen by everyone.
                    </span>
                  </div>
                </div>
              </>
            )}

            {isFashion && (
              <>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">👗</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">3D Fitting Room</span>
                    <span className="text-slate-400">
                      Inspect and try on complete outfits, tops, trousers, dresses, and accessories on your 3D avatar with 360° rotation.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🛍️</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Permanent Wardrobe</span>
                    <span className="text-slate-400">
                      Items you buy are saved permanently in your wardrobe at home to wear whenever you want.
                    </span>
                  </div>
                </div>
              </>
            )}

            {!isClub && !isDining && !isFashion && (
              <>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">🚶</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Walk & Explore</span>
                    <span className="text-slate-400">
                      Tap the floor to walk anywhere, or tap stations (counters, exhibits) to interact with them.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                  <span className="text-xl">💼</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Staff & Jobs</span>
                    <span className="text-slate-400">
                      Talk to venue staff to apply for role-play jobs and work paid shifts to earn AED!
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Controls Quick Reference */}
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Camera & Navigation Controls</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div>• <b>Tap Floor / Station</b>: Walk there</div>
              <div>• <b>Drag Screen</b>: Orbit camera 360°</div>
              <div>• <b>Pinch / Scroll</b>: Zoom in & out</div>
              <div>• <b>Tap Citizens</b>: Chat & treat</div>
            </div>
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="dontShow"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
            <label htmlFor="dontShow" className="text-xs font-semibold text-slate-400 cursor-pointer select-none">
              Don’t show this guide again for this venue type
            </label>
          </div>

          {/* Got it button */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Got It — Let’s Go!</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
