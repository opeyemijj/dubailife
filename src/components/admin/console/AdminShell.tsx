"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, CreditCard, Building2, Megaphone, Users, Settings, ScrollText, Map, LogOut, Menu, X, Lightbulb } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/claims", label: "Venue claims", icon: Building2 },
  { href: "/admin/ads", label: "Advertising", icon: Megaphone },
  { href: "/admin/citizens", label: "Citizens", icon: Users },
  { href: "/admin/ideas", label: "Community ideas", icon: Lightbulb },
  { href: "/admin/settings", label: "Prices & features", icon: Settings },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminShell({ email, role, children }: { email: string; role: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await supabase().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };
  const nav = (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-bold transition-colors ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
            <Icon className="w-4 h-4" /> {label}
          </Link>
        );
      })}
      <Link href="/admin/studio" className="flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-bold text-amber-300 hover:bg-white/5 mt-4">
        <Map className="w-4 h-4" /> Map studio ↗
      </Link>
    </nav>
  );
  return (
    <div className="min-h-[100dvh] bg-slate-50 lg:flex">
      <aside className={`fixed lg:sticky top-0 z-40 h-[100dvh] w-64 shrink-0 bg-slate-950 p-4 flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center">D</span>
          <div className="min-w-0">
            <div className="text-white font-black leading-tight">Admin</div>
            <div className="text-[11px] text-slate-400 truncate">{email}</div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden ml-auto text-slate-400" aria-label="Close menu"><X className="w-5 h-5" /></button>
        </div>
        {nav}
        <div className="mt-auto space-y-2">
          <div className="px-3 text-[11px] text-slate-500">Role: <span className="text-slate-300 font-bold">{role.replace("_", " ")}</span></div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-bold text-rose-300 hover:bg-white/5"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 h-14 px-4 flex items-center gap-3">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
          <span className="font-black">Admin</span>
        </header>
        <main className="p-4 sm:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
