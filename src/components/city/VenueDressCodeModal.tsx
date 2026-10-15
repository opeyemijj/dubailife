"use client";

import React from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { Sparkles, Shirt, ArrowRight, CheckCircle2, ShieldAlert, X } from "lucide-react";
import type { Place, Venue } from "@/lib/city/types";
import { getVenueDressCode } from "@/lib/city/dressCodes";
import { useRouter } from "next/navigation";

export const PENDING_VENUE_KEY = "cometodubai_pending_venue";

export interface PendingVenue {
  placeId: string;
  placeName: string;
  venueId: string;
  venueName: string;
  route: string;
  dressCodeTitle: string;
}

export function savePendingVenue(destination: PendingVenue) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PENDING_VENUE_KEY, JSON.stringify(destination));
    } catch {}
  }
}

export function getPendingVenue(): PendingVenue | null {
  if (typeof window !== "undefined") {
    try {
      const data = localStorage.getItem(PENDING_VENUE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearPendingVenue() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PENDING_VENUE_KEY);
    } catch {}
  }
}

interface VenueDressCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place;
  venue: Venue;
  onContinueCurrent: () => void;
}

export function VenueDressCodeModal({
  open,
  onOpenChange,
  place,
  venue,
  onContinueCurrent,
}: VenueDressCodeModalProps) {
  const router = useRouter();
  const dressCode = getVenueDressCode(venue);

  if (!open) return null;

  const handleChangeOutfit = () => {
    savePendingVenue({
      placeId: place.id,
      placeName: place.name,
      venueId: venue.id,
      venueName: venue.name,
      route: `/place/${place.id}/${venue.id}`,
      dressCodeTitle: dressCode.title,
    });
    onOpenChange(false);
    router.push("/home?wardrobe=open");
  };

  const handleKeepOutfit = () => {
    onOpenChange(false);
    onContinueCurrent();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-6 animate-in fade-in-0 duration-150">
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />

        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full sm:max-w-md bg-slate-900 text-white border border-white/10 shadow-2xl rounded-[32px] p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors z-20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Glow ambient background */}
          <div
            className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: dressCode.color }}
          />

          <div className="relative space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>{venue.category}</span>
                  <span>•</span>
                  <span>{place.name}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {venue.name}
                </h2>
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/10 shrink-0"
                style={{ backgroundColor: `${dressCode.color}25` }}
              >
                {dressCode.icon}
              </div>
            </div>

            {/* Dress Code Recommendation Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-black px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: dressCode.color }}
                >
                  {dressCode.badge}
                </span>
                <span className="text-xs font-bold text-white/90">
                  Suggested: {dressCode.title}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {dressCode.recommendation}
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-400 text-center">
              Would you like to change into an outfit you own before heading in?
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleChangeOutfit}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Shirt className="w-4 h-4" />
                <span>Change Outfit at Home</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={handleKeepOutfit}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Keep Current Outfit & Enter</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
