import { useState, useEffect } from "react";
import { Coins, Star, Bell, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface TopBarProps {
  walletBalance?: number;
  userName?: string;
  userLevel?: number;
  avatarUrl?: string;
  onlinePlayers?: number;
}

export function TopBar({
  walletBalance = 50000,
  userName = "James",
  userLevel = 17,
  avatarUrl = "https://i.pravatar.cc/150?u=james",
  onlinePlayers: initialOnline = 1428
}: TopBarProps) {
  const [onlineCount, setOnlineCount] = useState(initialOnline);

  // Gentle live fluctuation (citizens entering / leaving Dubai)
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(1200, prev + delta);
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Left: User Profile & Level */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-zinc-950/80 backdrop-blur-xl border border-white/15 p-1 pr-3 sm:pr-4 rounded-full shadow-lg">
          <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-white/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-white leading-none">{userName}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span className="text-[10px] sm:text-xs text-amber-400 font-bold leading-none">Lv. {userLevel}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Online Players Pill */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
          <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight">
            {onlineCount.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider hidden xs:inline sm:inline">
            Online
          </span>
        </div>

        {/* Right: Economy & Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-black text-emerald-400 tracking-wide font-mono">
              {walletBalance.toLocaleString()} <span className="text-[10px] sm:text-xs font-bold text-emerald-300/80">AED</span>
            </span>
          </div>
          
          <button 
            aria-label="Notifications"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/15 flex items-center justify-center relative hover:bg-white/10 transition-colors shadow-lg active:scale-90"
          >
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-zinc-950" />
          </button>
        </div>

      </div>
    </div>
  );
}
