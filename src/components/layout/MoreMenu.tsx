"use client";

// More: every place to go, from anywhere: Me, Available to chat, Goals, To do, Top users, City, Spaces, Games, Jobs,
// Wallet, Invite friends, How to play. The bottom bar's More button, the More button at home and the floating one
// (on venues and other pages without the bar) all open this. A tap anywhere outside closes it.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { BedDouble, BookOpen, Briefcase, Flag, Flame, Gamepad2, LayoutGrid, ListChecks, MessageCircle, Mic, Target, Trophy, User, UserPlus, Wallet, X } from "lucide-react";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { useCitizen } from "@/lib/citizenStore";
import { openDiscover, toTryCount, useDiscover } from "@/lib/discover";
import { openLife } from "@/components/life/LifeHub";
import { inviteFriends } from "@/lib/invite";
import { usePhoneButtonsShown } from "@/lib/phoneButtons";
import { useScreenBusy } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useCurrentCity } from "@/lib/city/presence";

export const openMore = () => window.dispatchEvent(new CustomEvent("dubai:open-more"));

/** The count shown on any More button: things still to try. */
export function useMoreBadge(): number {
  useDiscover();
  // Things to try in the city you're in (lib/guide/cityGuide).
  const city = useCurrentCity().city;
  return toTryCount(city);
}

/** The menu itself: mounted once, near the root. */
export function MoreSheet() {
  const { citizen } = useCitizen();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const count = useMoreBadge();
  useScreenBusy(open);
  useEffect(() => {
    const show = () => { setNote(null); setOpen(true); };
    window.addEventListener("dubai:open-more", show);
    return () => window.removeEventListener("dubai:open-more", show);
  }, []);
  if (!open || !citizen?.id) return null;
  const go = (fn: () => void) => { gameAudio.playClickSound(); setOpen(false); fn(); };
  const items: { id: string; icon: React.ReactNode; label: string; badge?: number; tone: string; run: () => void }[] = [
    { id: "me", icon: <User className="w-5 h-5" />, label: "Me", tone: "bg-slate-100 text-slate-700", run: () => openLife("profile") },
    { id: "chat", icon: <MessageCircle className="w-5 h-5" />, label: "Available to chat", tone: "bg-emerald-100 text-emerald-700", run: () => router.push("/top?tab=online") },
    { id: "goals", icon: <Target className="w-5 h-5" />, label: "Goals", tone: "bg-teal-100 text-teal-700", run: () => router.push("/goals") },
    { id: "todo", icon: <ListChecks className="w-5 h-5" />, label: "To do", badge: count, tone: "bg-lime-100 text-lime-700", run: () => openDiscover("do") },
    { id: "top", icon: <Trophy className="w-5 h-5" />, label: "Top users", tone: "bg-amber-100 text-amber-700", run: () => router.push("/top") },
    { id: "city", icon: <Flame className="w-5 h-5" />, label: "City", tone: "bg-fuchsia-100 text-fuchsia-700", run: () => router.push("/city") },
    { id: "spaces", icon: <Mic className="w-5 h-5" />, label: "Spaces", tone: "bg-purple-100 text-purple-700", run: () => openPhone("spaces") },
    { id: "games", icon: <Gamepad2 className="w-5 h-5" />, label: "Games", tone: "bg-green-100 text-green-700", run: () => openPhone("games") },
    { id: "race", icon: <Flag className="w-5 h-5" />, label: "Car race", tone: "bg-red-100 text-red-700", run: () => router.push("/autodrome") },
    { id: "horse-race", icon: <span className="text-lg leading-none">🏇</span>, label: "Horse race", tone: "bg-emerald-100 text-emerald-700", run: () => router.push("/racing/horse") },
    { id: "camel-race", icon: <span className="text-lg leading-none">🐪</span>, label: "Camel race", tone: "bg-amber-100 text-amber-700", run: () => router.push("/racing/camel") },
    { id: "bike-race", icon: <span className="text-lg leading-none">🏍️</span>, label: "Superbikes", tone: "bg-sky-100 text-sky-700", run: () => router.push("/racing/bike") },
    { id: "hotels", icon: <BedDouble className="w-5 h-5" />, label: "Hotels", tone: "bg-amber-100 text-amber-700", run: () => router.push("/hotels") },
    { id: "jobs", icon: <Briefcase className="w-5 h-5" />, label: "Jobs", tone: "bg-sky-100 text-sky-700", run: () => router.push("/jobs") },
    { id: "wallet", icon: <Wallet className="w-5 h-5" />, label: "Wallet", tone: "bg-orange-100 text-orange-700", run: () => router.push("/wallet") },
    {
      id: "invite", icon: <UserPlus className="w-5 h-5" />, label: "Invite friends", tone: "bg-violet-100 text-violet-700",
      run: async () => {
        const r = await inviteFriends(citizen.username);
        if (r === "copied") { setNote("Invite link copied. Send it to your friends!"); setOpen(true); }
      },
    },
    { id: "wiki", icon: <BookOpen className="w-5 h-5" />, label: "How to play", tone: "bg-yellow-100 text-yellow-700", run: () => router.push("/wiki") },
  ];
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[175] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="More">
        {/* A tap anywhere outside the menu closes it. */}
        <div className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,23,42,0.3)] animate-[sheetUp_0.2s_ease-out]">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-lg font-black text-slate-900">More</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {items.map((it) => (
              <button key={it.id} onClick={() => go(it.run)} className="relative flex flex-col items-center gap-1.5 rounded-2xl p-2 hover:bg-slate-50 active:scale-95 transition-transform">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${it.tone}`}>{it.icon}</span>
                <span className="text-[11px] font-black text-slate-800 leading-tight text-center">{it.label}</span>
                {it.badge ? <span className="absolute top-1 right-2 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{it.badge > 99 ? "99+" : it.badge}</span> : null}
              </button>
            ))}
          </div>
          {note && <p className="px-1 pt-2 text-xs font-bold text-violet-700">{note}</p>}
          {/* About and the socials (they were under the bar on the map). */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
            <Link href="/about" onClick={() => setOpen(false)} className="hover:text-slate-800">About</Link>
            {SITE.socials.map((n) => <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">{n.label}</a>)}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/** On pages without the bottom bar or their own More (venues, places, journeys): under the floating phone button. */
export function MoreFab() {
  const { citizen } = useCitizen();
  const others = usePhoneButtonsShown();
  const pathname = usePathname() ?? "";
  const count = useMoreBadge();
  if (!citizen?.id || others > 0 || pathname.startsWith("/admin")) return null;
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openMore(); }}
      aria-label={count ? `More, ${count} to try` : "More"}
      title="More"
      className="dl-hide-clean fixed right-3 top-[calc(50%+2rem)] z-30 w-12 h-12 rounded-full bg-slate-950/90 text-white shadow-xl border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
    >
      <LayoutGrid className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
