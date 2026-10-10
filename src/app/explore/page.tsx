"use client";

import dynamic from "next/dynamic";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Compass, MapPin, Search, Coffee, Music, ShoppingBag, Trophy, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";

const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap").then(mod => mod.InteractiveMap), { ssr: false });

export default function ExplorePage() {
  return (
    <main className="relative h-screen w-screen bg-black overflow-hidden flex flex-col font-sans">
      {/* 2D Map Background */}
      <InteractiveMap />

      <TopBar />

      {/* Floating UI Elements */}
      <div className="absolute top-24 left-0 w-full z-10 pointer-events-none px-6">
        
        {/* Search & Filters */}
        <div className="max-w-md mx-auto w-full pointer-events-auto space-y-4">
          <div className="relative shadow-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              placeholder="Search for players, venues, or events..." 
              className="w-full h-14 pl-14 bg-zinc-950/80 backdrop-blur-xl border-2 border-white/10 text-white rounded-[2rem] placeholder:text-gray-500 font-bold focus:outline-none focus:border-blue-500/50 transition-colors shadow-inner"
            />
          </div>
          
          {/* Game Style Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterPill icon={<Navigation className="w-4 h-4" />} label="Near Me" active />
            <FilterPill icon={<Trophy className="w-4 h-4" />} label="Quests" />
            <FilterPill icon={<Music className="w-4 h-4" />} label="Clubs" />
            <FilterPill icon={<ShoppingBag className="w-4 h-4" />} label="Malls" />
            <FilterPill icon={<Coffee className="w-4 h-4" />} label="Food" />
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function FilterPill({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold border backdrop-blur-md shadow-lg transition-all whitespace-nowrap active:scale-95 ${
      active 
        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
        : "bg-black/70 border-white/10 text-gray-300 hover:bg-black hover:text-white"
    }`}>
      {icon}
      {label}
    </button>
  );
}
