import Link from "next/link";
import { Home, Map, Users, Smartphone, User } from "lucide-react";

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto bg-zinc-950/90 backdrop-blur-2xl border border-white/15 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between pointer-events-auto shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        <NavItem href="/home" icon={<Home className="w-5 h-5 sm:w-6 sm:h-6" />} label="Home" />
        <NavItem href="/explore" icon={<Map className="w-5 h-5 sm:w-6 sm:h-6" />} label="Explore" active />
        <NavItem href="/social" icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />} label="Social" />
        <NavItem href="/phone" icon={<Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />} label="Phone" />
        <NavItem href="/profile" icon={<User className="w-5 h-5 sm:w-6 sm:h-6" />} label="Profile" />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] rounded-xl transition-all active:scale-90 ${
        active 
          ? 'text-sky-400 font-bold drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]' 
          : 'text-zinc-400 hover:text-white'
      }`}
    >
      <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-sky-500/15' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] tracking-tight leading-none">{label}</span>
    </Link>
  );
}
