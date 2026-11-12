"use client";

import React, { useState } from "react";
import { X, Key, ShieldAlert, Sparkles, AlertTriangle, Flame } from "lucide-react";
import { carOf, type ParkedCarView, attemptStealCar } from "@/lib/cars";
import { gameAudio } from "@/utils/gameAudio";
import { useScreenBusy } from "@/lib/popups";

export interface VehicleTheftModalProps {
  parkedCar: ParkedCarView;
  flatId: string;
  onClose: () => void;
  onSuccess: (stolen: { carId: number; car: string; plate: string; fuel: number; ownerUsername: string }) => void;
  say: (text: string) => void;
}

export function VehicleTheftModal({
  parkedCar,
  flatId,
  onClose,
  onSuccess,
  say,
}: VehicleTheftModalProps) {
  // On screen: popups that open by themselves wait until it's over (lib/popups).
  useScreenBusy(true);
  const [wireStep, setWireStep] = useState<"ready" | "hotwiring" | "done">("ready");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const car = carOf(parkedCar.car);

  const startHotwire = async () => {
    setBusy(true);
    setError(null);
    setWireStep("hotwiring");
    gameAudio.playClickSound();

    // Hotwire sound & delay for interactive suspense
    setTimeout(async () => {
      const res = await attemptStealCar(flatId, parkedCar.id);
      setBusy(false);

      if (res.error) {
        setWireStep("ready");
        setError(res.error);
        say(`🚫 Failed to hotwire: ${res.error}`);
        return;
      }

      setWireStep("done");
      gameAudio.playCoinSound();
      say(`🚨 Alarm blaring! Hotwired @${parkedCar.ownerUsername}'s ${car?.make || "car"}!`);

      // Dispatch global alarm event for nearby players
      window.dispatchEvent(new CustomEvent("dubai:toast", {
        detail: `🚨 VEHICLE THEFT: You hotwired @${parkedCar.ownerUsername}'s ${car?.make} ${car?.model}! Speed away!`
      }));

      setTimeout(() => {
        onSuccess(res.data!);
        onClose();
      }, 900);
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 text-lg">
              <Key className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Grand Theft Auto · Hotwire
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                Attempt to steal parked vehicle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vehicle Spec Card */}
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-inner space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Target Vehicle
                </span>
                <h4 className="text-lg font-black leading-tight text-white">
                  {car?.make} {car?.model}
                </h4>
                <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                  Plate: {parkedCar.plate}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-md border border-white/10"
                style={{ background: car?.color ?? "#1e293b" }}
              >
                🚗
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Registered Owner</span>
                <span className="font-bold text-emerald-400">@{parkedCar.ownerUsername}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Estimated Value</span>
                <span className="font-bold text-amber-300">
                  AED {parkedCar.price.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-xs text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-rose-950 leading-tight">
                Anti-Theft Police Threat Warning
              </p>
              <p className="text-[11px] text-rose-800 leading-normal">
                If @{parkedCar.ownerUsername} reports this car stolen, Dubai Police APB will flag your vehicle on all highway Salik cameras. 3D Police Interceptors will chase and arrest you!
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Wire Hotwiring Interactive Animation */}
          {wireStep === "hotwiring" && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-3 text-amber-400">
                <Flame className="w-5 h-5 animate-bounce" />
                <span className="text-xs font-black tracking-wider uppercase">
                  Stripping Ignition Wires… Sparking Starter!
                </span>
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-rose-500 animate-pulse w-3/4 transition-all duration-1000" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={startHotwire}
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {busy ? "Hotwiring Ignition…" : "⚡ Hotwire Ignition & Grand Theft Vehicle"}
              </span>
            </button>

            <button
              onClick={onClose}
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-colors"
            >
              Walk Away (Leave Vehicle)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
