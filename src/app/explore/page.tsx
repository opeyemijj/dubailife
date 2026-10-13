"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRequireCitizen } from "@/lib/citizenStore";
import dynamic from "next/dynamic";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Search, Coffee, Music, ShoppingBag, Trophy, Navigation, Home, X, SlidersHorizontal, Building2, Building, Sparkles } from "lucide-react";

const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap").then((mod) => mod.InteractiveMap),
  { ssr: false, loading: () => <SmallLoader label="Loading Downtown Dubai" /> }
);

export default function ExplorePage() {
  return (
    <Suspense fallback={<SmallLoader label="Loading Downtown Dubai" />}>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const params = useSearchParams();
  const to = params.get("to");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  useRequireCitizen();

  const filters = [
    { id: "all", label: "All Venues", icon: <Navigation className="w-3.5 h-3.5" /> },
    { id: "malls", label: "Shopping Malls", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: "clubs", label: "Clubs & Nightlife", icon: <Music className="w-3.5 h-3.5" /> },
    { id: "food", label: "Dining & Cafes", icon: <Coffee className="w-3.5 h-3.5" /> },
    { id: "attractions", label: "Tourist Attractions", icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
    { id: "hotels", label: "Hotels & Resorts", icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: "towers", label: "High-Rise Towers", icon: <Building className="w-3.5 h-3.5" /> },
    { id: "villas", label: "Luxury Villas", icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: "houses", label: "Residential Homes", icon: <Home className="w-3.5 h-3.5" /> },
  ];

  return (
    <main className="relative h-screen w-screen bg-[#d6bc8a] overflow-hidden flex flex-col font-sans select-none touch-none overscroll-none">
      {/* 2D Isometric Interactive Map Background */}
      <InteractiveMap 
        hideTopHUD={true} 
        activeFilter={activeFilter} 
        searchQuery={searchQuery} 
        openPlaceId={params.get("open") ?? undefined}
        journeyTo={to ? { placeId: to, venueId: params.get("venue") ?? undefined } : undefined}
        atPlaceId={params.get("at") ?? undefined}
      />

      {/* Top Navigation HUD with Safe Area Padding */}
      <TopBar />

      {/* Floating Search & Discovery Bar (Mobile First & Non-Intrusive) */}
      <div className="absolute top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] left-0 w-full z-20 pointer-events-none px-3 sm:px-6">
        <div className="max-w-md mx-auto w-full pointer-events-auto space-y-2">
          
          {/* Glass Search Input */}
          <div className="relative shadow-2xl flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Burj Khalifa, Ting Irie, villas..." 
              className="w-full h-11 sm:h-12 pl-11 pr-20 bg-slate-950/85 hover:bg-slate-950/95 focus:bg-slate-950 backdrop-blur-xl border border-white/20 text-white text-xs sm:text-sm rounded-2xl placeholder:text-slate-400 font-bold focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-xl"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-all"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all sm:hidden ${
                  isFilterExpanded || (activeFilter !== "all")
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "bg-white/10 hover:bg-white/20 text-white/80"
                }`}
                title="Toggle Filters"
                aria-label="Toggle Filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {/* Category Filter Pills (Always visible on tablets/desktops, collapsible or scrollable on mobile) */}
          <div className={`overflow-x-auto pb-1 scrollbar-hide transition-all duration-200 ${
            isFilterExpanded ? "flex gap-1.5" : "hidden sm:flex gap-1.5"
          }`}>
            {filters.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(isActive && f.id !== "all" ? "all" : f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-xl shadow-lg transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-300 text-white font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                      : "bg-slate-950/80 border-white/15 text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Persistent Bottom Bar with Safe Area Insets */}
      <BottomNav />
    </main>
  );
}
