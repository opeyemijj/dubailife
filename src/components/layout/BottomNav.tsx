"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Map, MapPin, Smartphone, User } from "lucide-react";
import { openDiscover, placesLeftCount, toTryCount, useDiscover } from "@/lib/discover";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  useDiscover();
  const toTry = citizen?.id ? toTryCount() : 0;
  const placesLeft = citizen?.id ? placesLeftCount(citizen.visited) : 0;
  const onMap = isActive("/explore") && !!citizen?.id;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto bg-zinc-950/90 backdrop-blur-2xl border border-white/15 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between pointer-events-auto shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        <NavItem href="/home" icon={<Home className="w-5 h-5 sm:w-6 sm:h-6" />} label="Home" active={isActive("/home")} />
        {onMap ? (
          // Already on the map, so the Explore button gives way to the two Discover lists.
          <>
            <NavButton onClick={() => openDiscover("do")} icon={<ListChecks className="w-5 h-5 sm:w-6 sm:h-6" />} label="To do" badge={toTry} badgeLabel={`${toTry} things to try`} />
            <NavButton onClick={() => openDiscover("places")} icon={<MapPin className="w-5 h-5 sm:w-6 sm:h-6" />} label="Places" badge={placesLeft} badgeLabel={`${placesLeft} places to visit`} />
          </>
        ) : (
          <NavItem href="/explore" icon={<Map className="w-5 h-5 sm:w-6 sm:h-6" />} label="Explore" active={isActive("/explore")} />
        )}
        <NavItem href="/phone" icon={<Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />} label="Phone" active={isActive("/phone")} badge={unread} />
        <NavItem href="/profile" icon={<User className="w-5 h-5 sm:w-6 sm:h-6" />} label="Profile" active={isActive("/profile")} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active, badge = 0 }: { href: string; icon: React.ReactNode; label: string; active?: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] rounded-xl transition-all active:scale-90 ${
        active
          ? 'text-sky-400 font-bold drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]'
          : 'text-zinc-400 hover:text-white'
      }`}
    >
      <div className={`relative p-1 rounded-xl transition-colors ${active ? 'bg-sky-500/15' : ''} ${badge ? 'text-white animate-pulse' : ''}`}>
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-zinc-950" aria-label={`${badge} unread messages`}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] tracking-tight leading-none">{label}</span>
    </Link>
  );
}

function NavButton({ onClick, icon, label, badge = 0, badgeLabel }: { onClick: () => void; icon: React.ReactNode; label: string; badge?: number; badgeLabel?: string }) {
  return (
    <button onClick={onClick} aria-label={badge ? `${label}: ${badgeLabel ?? badge}` : label}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] rounded-xl transition-all active:scale-90 text-zinc-400 hover:text-white">
      <div className="relative p-1 rounded-xl">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-zinc-950">{badge > 99 ? "99+" : badge}</span>
        )}
      </div>
      <span className="text-[10px] tracking-tight leading-none">{label}</span>
    </button>
  );
}
