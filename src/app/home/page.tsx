"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Volume2, VolumeX, Plus, Eye, Check, ChevronUp, ChevronDown,
  Home, ShoppingBag, Map, Smartphone, Sparkles, X, Megaphone,
  RotateCw, Keyboard
} from "lucide-react";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { gameAudio } from "@/utils/gameAudio";

export default function HomePage() {
  const router = useRouter();

  // Citizen data loaded from storage
  const [citizen, setCitizen] = useState<any>(null);
  const [cleanScreen, setCleanScreen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(true);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // In-game dynamic needs
  const [needs, setNeeds] = useState({
    hunger: 92,
    energy: 85,
    fun: 80,
    social: 65,
    hygiene: 90,
    bladder: 88,
  });

  // Wallet
  const [walletBalance, setWalletBalance] = useState(50000);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dubai_citizen");
      const logged = localStorage.getItem("dubai_logged_in") === "true";
      if (!stored || !logged) {
        router.replace("/?signup=true");
        return;
      }
      const parsed = JSON.parse(stored);
      setCitizen(parsed);
      if (parsed.balance) setWalletBalance(parsed.balance);
    } catch {
      router.replace("/?signup=true");
      return;
    }

    setIsAudioMuted(gameAudio.getIsMuted());
  }, [router]);

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleInteractObject = (type: "cooler" | "bed" | "chair" | "door") => {
    gameAudio.playClickSound();

    if (type === "cooler") {
      setNeeds(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 15) }));
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
    <main className="relative w-screen h-[100dvh] bg-[#788e6e] overflow-hidden select-none font-sans touch-none">
      
      {/* 3D Isometric Apartment Interior */}
      <ApartmentRoom 
        look={citizen?.look} 
        onInteractObject={handleInteractObject} 
      />

      {/* TOP BAR (Image 2) */}
      {!cleanScreen && (
        <header className="absolute top-3 sm:top-5 left-0 w-full z-40 pointer-events-none px-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto bg-white/95 hover:bg-white backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-3 sm:px-4 py-2 rounded-full transition-all">
            
            {/* Clock & Mood */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-800">
              <span className="flex items-center gap-1 font-mono">
                🌙 Mon 12 · 5:40 AM
              </span>
              <div className="w-[1px] h-3.5 bg-slate-200" />
              <span className="flex items-center gap-1 text-emerald-600 font-extrabold text-xs">
                🙂 Happy
              </span>
            </div>

            {/* Online stats (Center) */}
            <div className="hidden xs:flex sm:flex items-center gap-2 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>35.5m</span>
              </div>
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-600 font-extrabold">10k online</span>
            </div>

            {/* Audio Toggle & Wallet Pill (Right) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextMuted = gameAudio.toggleMute();
                  setIsAudioMuted(nextMuted);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isAudioMuted ? "Unmute" : "Mute"}
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-3 py-1 rounded-full text-xs sm:text-sm font-black font-mono shadow-sm">
                <span>AED {walletBalance.toLocaleString()}</span>
                <button
                  onClick={() => {
                    setWalletBalance(prev => prev + 10000);
                    showToast("💳 Topped up 10,000 AED into your wallet!");
                  }}
                  className="w-4 h-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xs ml-0.5 active:scale-90"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            </div>

          </div>
        </header>
      )}

      {/* TOP LEFT QUESTS & OBJECTIVES (Image 2) */}
      {!cleanScreen && (
        <div className="absolute top-16 sm:top-20 left-3 sm:left-6 z-30 pointer-events-auto space-y-1.5">
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

          <button
            onClick={() => setCleanScreen(!cleanScreen)}
            className="flex items-center gap-1 bg-white/90 hover:bg-white px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm border border-slate-200 transition-colors"
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
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-white p-2 pr-3.5 rounded-full shadow-2xl">
            {/* Avatar Head Circle */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-emerald-500 overflow-hidden bg-slate-100 flex items-center justify-center text-lg shadow-sm">
              {citizen?.look?.gender === "man" ? "🧔🏾" : "👩🏾"}
            </div>

            {/* 6 Mini Needs Meters */}
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-1 text-[9px] font-bold text-slate-600">
              <div className="flex items-center gap-1">
                <span>🍩</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${needs.hunger}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>⚡</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${needs.energy}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>🎉</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${needs.fun}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>💬</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${needs.social}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>🧼</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${needs.hygiene}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>🚽</span>
                <div className="w-8 sm:w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${needs.bladder}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Image 2) */}
      {!cleanScreen && (
        <div className="fixed bottom-3 sm:bottom-5 left-0 w-full z-40 pointer-events-none px-4">
          <div className="max-w-xs sm:max-w-sm mx-auto bg-white/95 backdrop-blur-2xl border border-white shadow-[0_16px_48px_rgba(0,0,0,0.25)] rounded-full p-1.5 flex items-center justify-between pointer-events-auto">
            {/* Home (Active) */}
            <button className="flex-1 py-2 px-3 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            {/* Buy Furniture */}
            <button 
              onClick={() => setBuyModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Buy</span>
            </button>

            {/* Map (Routes to /explore) */}
            <button 
              onClick={() => router.push("/explore")}
              className="flex-1 py-2 px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>

            {/* Phone */}
            <button 
              onClick={() => router.push("/phone")}
              className="flex-1 py-2 px-3 rounded-full hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
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
      <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-md z-50 rounded-3xl p-6 sm:p-7 text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-2xl flex items-center justify-center shadow-sm border border-amber-100">
              📣
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Welcome to Dubai Life!
              </h3>
              <p className="text-xs text-slate-400 font-semibold">From the Dubai Life team</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your starter residence in <strong>{citizen?.home || "Dubai"}</strong> is ready and your initial starter grant of <strong>AED {walletBalance.toLocaleString()}</strong> has been credited to your account!
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
        </DialogContent>
      </Dialog>

      {/* 2. BUY FURNITURE MODAL */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-md max-h-[85dvh] overflow-y-auto z-50 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Apartment Furniture Shop</h3>
            <span className="text-xs font-mono font-bold text-emerald-600">AED {walletBalance.toLocaleString()}</span>
          </div>

          <div className="space-y-3 pt-3">
            {[
              { id: "sofa", name: "Modern Velvet Sofa", price: 3500, icon: "🛋️", desc: "Super comfortable for guests." },
              { id: "tv", name: "65-Inch Smart 4K TV", price: 4200, icon: "📺", desc: "Watch live Dubai City broadcasts." },
              { id: "carpet", name: "Silk Persian Carpet", price: 2800, icon: "🧶", desc: "Luxurious handcrafted weave." },
              { id: "artwork", name: "Burj Khalifa Sunset Painting", price: 1500, icon: "🖼️", desc: "Original high-rise acrylic artwork." },
            ].map(item => (
              <div key={item.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900">{item.name}</h4>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                    <span className="text-xs font-mono font-extrabold text-emerald-600 mt-0.5 block">AED {item.price.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (walletBalance >= item.price) {
                      setWalletBalance(prev => prev - item.price);
                      showToast(`🎉 Purchased ${item.name}! Added to your apartment.`);
                      setBuyModalOpen(false);
                    } else {
                      showToast("⚠️ Not enough AED in your wallet!");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-95"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

    </main>
  );
}
