"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, Bell, Users, LogOut, User } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCitizen, signOut } from "@/lib/citizenStore";
import { useOnlineCount, formatOnline } from "@/lib/presence";

export interface TopBarProps {
  walletBalance?: number;
  userName?: string;
  avatarUrl?: string;
}

export function TopBar({
  walletBalance: walletOverride,
  userName: userNameOverride,
  avatarUrl: avatarOverride,
}: TopBarProps) {
  const { citizen } = useCitizen();
  const walletBalance = walletOverride ?? citizen?.balance ?? 0;
  const userName = userNameOverride ?? citizen?.name ?? "Citizen";
  const avatarUrl = avatarOverride ?? rosterThumb(presetFor(citizen?.look ?? { gender: "woman" }));
  const onlineCount = useOnlineCount();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Left: User Profile & Level */}
        <div className="relative">
        {menuOpen && <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="relative flex items-center gap-2 sm:gap-2.5 bg-zinc-950/80 hover:bg-zinc-900 backdrop-blur-xl border border-white/15 p-1 pr-3 sm:pr-4 rounded-full shadow-lg text-left transition-colors"
        >
          <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-white/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-white leading-none">{userName}</span>
            {citizen?.username && <span className="text-[10px] sm:text-xs text-sky-300 font-bold leading-none mt-0.5">@{citizen.username}</span>}
          </div>
        </button>

        {menuOpen && (
          <div role="menu" className="absolute top-full left-0 mt-2 w-44 bg-zinc-950/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-1.5 text-sm font-bold text-white">
            <Link href="/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
              <User className="w-4 h-4 text-zinc-400" /> My profile
            </Link>
            <button role="menuitem" onClick={() => { setMenuOpen(false); signOut(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        )}
        </div>

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
            <span className="hidden sm:inline text-[10px] font-bold text-amber-200/70">D-Coins</span>
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
