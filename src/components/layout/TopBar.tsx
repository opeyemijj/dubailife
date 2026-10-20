"use client";

import Link from "next/link";
import { Coins, Bell, Users } from "lucide-react";
import { NeedsDock } from "@/components/life/NeedsDock";
import { useCitizen } from "@/lib/citizenStore";
import { useOnlineCount, formatOnline } from "@/lib/presence";

export interface TopBarProps {
  walletBalance?: number;
}

export function TopBar({ walletBalance: walletOverride }: TopBarProps) {
  const { citizen } = useCitizen();
  const walletBalance = walletOverride ?? citizen?.balance ?? 0;
  const onlineCount = useOnlineCount();

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Left: the citizen's needs; tapping opens their profile, needs, goals and skills */}
        <NeedsDock dark />

        {/* Center: Live Online Players Pill */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
          <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight">
            {formatOnline(onlineCount)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider hidden xs:inline sm:inline">
            Online
          </span>
        </div>

        {/* Right: Economy & Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/wallet" aria-label="Wallet" className="flex items-center gap-1.5 sm:gap-2 bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg hover:bg-white/10 transition-colors">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide font-mono">
              {walletBalance.toLocaleString()}
            </span>
            <span className="hidden sm:inline text-[10px] font-bold text-amber-200/70">virtual AED</span>
          </Link>
          
          <Link
            href="/phone?tab=alerts"
            aria-label="Notifications"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/15 flex items-center justify-center relative hover:bg-white/10 transition-colors shadow-lg active:scale-90"
          >
            <Bell className="w-4 h-4 text-white" />
          </Link>
        </div>

      </div>
    </div>
  );
}
