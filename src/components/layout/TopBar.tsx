import { Coins, Star, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TopBar() {
  return (
    <div className="fixed top-0 left-0 w-full z-50 px-4 pt-6 pb-2 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Left: User Profile & Level */}
        <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 p-1.5 pr-4 rounded-full">
          <Avatar className="w-10 h-10 border border-white/20">
            <AvatarImage src="https://i.pravatar.cc/150?u=james" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-none">James</span>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium leading-none">Lv. 17</span>
            </div>
          </div>
        </div>

        {/* Right: Economy & Notifications */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-full">
            <Coins className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white tracking-wide">42,500</span>
          </div>
          
          <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center relative hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-black rounded-full" />
          </button>
        </div>

      </div>
    </div>
  );
}
