import Link from "next/link";
import { Home, Map, Users, Smartphone, User } from "lucide-react";

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-4 flex items-center justify-between pointer-events-auto">
        <NavItem href="/home" icon={<Home className="w-6 h-6" />} label="Home" />
        <NavItem href="/explore" icon={<Map className="w-6 h-6" />} label="Explore" active />
        <NavItem href="/social" icon={<Users className="w-6 h-6" />} label="Social" />
        <NavItem href="/phone" icon={<Smartphone className="w-6 h-6" />} label="Phone" />
        <NavItem href="/profile" icon={<User className="w-6 h-6" />} label="Profile" />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 ${active ? 'text-blue-400' : 'text-gray-400 hover:text-white transition-colors'}`}>
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}
