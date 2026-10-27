"use client";

// The phone in your hand: opens over the map (the round phone button, or "dubai:open-phone") with a
// home screen of apps. Apps open their pages; Games opens a list inside the phone.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { openDiscover } from "@/lib/discover";
import { openLife } from "@/components/life/LifeHub";
import { GAMES } from "@/lib/games/registry";
import { dubaiTime, useNow } from "@/lib/dubaiClock";
import { gameAudio } from "@/utils/gameAudio";
import { openSheet } from "@/components/layout/HudSheets";
import { useServices } from "@/lib/cityServices";
import { JobsApp } from "@/components/phone/JobsApp";
import { ClinicApp } from "@/components/phone/ClinicApp";
import { PoliceApp } from "@/components/phone/PoliceApp";
import { DeliveryApp } from "@/components/phone/DeliveryApp";
import { RideApp } from "@/components/phone/RideApp";
import APPS from "@/data/phone/apps.json";

/** Opens the phone, on an app's screen if given. */
export const openPhone = (app?: Screen) => window.dispatchEvent(new CustomEvent("dubai:open-phone", { detail: app }));

/** Apps that open inside the phone (the rest open their page). */
type Screen = "home" | "games" | "jobs" | "clinic" | "court" | "food" | "grocery" | "rides" | `store:${string}`;

interface App { id: string; name: string; icon: string; bg: string; href?: string; screen?: Screen; run?: () => void; badge?: number; isNew?: boolean }

export function PhoneOverlay() {
  const { citizen } = useCitizen();
  const [open, setOpen] = useState<Screen | null>(null);
  useEffect(() => {
    const show = (e: Event) => { gameAudio.playClickSound(); setOpen((e as CustomEvent<Screen | undefined>).detail ?? "home"); };
    window.addEventListener("dubai:open-phone", show);
    return () => window.removeEventListener("dubai:open-phone", show);
  }, []);
  if (!open || !citizen?.id) return null;
  return <Phone key={open} me={citizen.id} start={open} onClose={() => setOpen(null)} />;
}

function Phone({ me, start, onClose }: { me: string; start: Screen; onClose: () => void }) {
  const router = useRouter();
  const unread = useUnreadTotal(me);
  const services = useServices(me);
  const now = useNow();
  const t = now ? dubaiTime(now) : null;
  const [q, setQ] = useState("");
  const [screen, setScreen] = useState<Screen>(start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clinicBadge = (services?.illness ? 1 : 0) + (services?.patients.length ?? 0);
  const courtBadge = (services?.cases.filter((c) => c.status === "open").length ?? 0) + (services?.clients.filter((c) => c.status === "open" && c.defence === null).length ?? 0);
  const apps: App[] = useMemo(() => [
    // The apps people in Dubai open every day.
    { id: "food", name: APPS.delivery.app.name, icon: APPS.delivery.app.icon, bg: APPS.delivery.app.bg, screen: "food", isNew: true },
    ...APPS.delivery.stores.filter((st) => st.home).map((st): App => ({ id: st.id, name: st.name, icon: st.icon, bg: st.bg, screen: `store:${st.id}`, isNew: true })),
    { id: "rides", name: APPS.rides.app.name, icon: APPS.rides.app.icon, bg: APPS.rides.app.bg, screen: "rides", isNew: true },
    { id: "grocery", name: APPS.grocery.app.name, icon: APPS.grocery.app.icon, bg: APPS.grocery.app.bg, screen: "grocery", isNew: true },
    { id: "police", name: "Dubai Police", icon: "🚓", bg: "from-blue-700 to-slate-900", screen: "court", badge: courtBadge, isNew: true },
    { id: "health", name: "Dubai Health", icon: "🩺", bg: "from-teal-400 to-cyan-700", screen: "clinic", badge: clinicBadge, isNew: true },
    { id: "messages", name: "Messages", icon: "💬", bg: "from-sky-400 to-blue-600", href: "/phone", badge: unread },
    { id: "jobs", name: "Jobs", icon: "💼", bg: "from-emerald-400 to-emerald-700", screen: "jobs" },
    { id: "wallet", name: "Wallet", icon: "💳", bg: "from-amber-300 to-orange-500", href: "/wallet" },
    { id: "games", name: "Games", icon: "🎱", bg: "from-emerald-500 to-green-800", screen: "games" },
    { id: "metro", name: "Map", icon: "🗺️", bg: "from-cyan-300 to-teal-600", href: "/explore" },
    { id: "people", name: "People", icon: "👥", bg: "from-violet-400 to-purple-700", href: "/phone?tab=contacts" },
    { id: "todo", name: "To do", icon: "✅", bg: "from-lime-300 to-green-600", run: () => openDiscover("do") },
    { id: "places", name: "Places", icon: "📍", bg: "from-rose-400 to-red-600", run: () => openDiscover("places") },
    { id: "uni", name: "Academy", icon: "🎓", bg: "from-indigo-400 to-indigo-700", href: "/academics" },
    { id: "driving", name: "Driving", icon: "🚗", bg: "from-slate-500 to-slate-800", href: "/driving" },
    { id: "business", name: "Business", icon: "🏪", bg: "from-fuchsia-400 to-pink-600", href: "/business" },
    { id: "ventures", name: "Ventures", icon: "📈", bg: "from-teal-400 to-emerald-700", href: "/ventures" },
    { id: "tournament", name: "Tournament", icon: "🏆", bg: "from-yellow-300 to-amber-600", href: "/tournament" },
    { id: "goals", name: "Goals", icon: "🎯", bg: "from-green-400 to-emerald-600", run: () => openLife("goals") },
    { id: "skills", name: "Skills", icon: "⭐", bg: "from-orange-300 to-orange-600", run: () => openLife("skills") },
    { id: "scams", name: "Scam Check", icon: "🛡️", bg: "from-red-400 to-rose-700", href: "/scam-check" },
    { id: "news", name: "What's new", icon: "✨", bg: "from-violet-300 to-indigo-500", run: () => openSheet("whats-new") },
    { id: "ideas", name: "Ideas", icon: "💡", bg: "from-yellow-200 to-amber-400", run: () => openSheet("suggest") },
    { id: "alerts", name: "Alerts", icon: "🔔", bg: "from-rose-300 to-pink-600", href: "/phone?tab=alerts" },
    { id: "guide", name: "Guide", icon: "🧭", bg: "from-sky-300 to-cyan-600", href: "/guide" },
    { id: "profile", name: "Profile", icon: "🙂", bg: "from-zinc-300 to-zinc-500", href: "/profile" },
  ], [unread, clinicBadge, courtBadge]);

  const home = () => setScreen("home");
  // App screens are white, so the status bar and home bar turn dark on them.
  const light = screen !== "home" && screen !== "games";
  const shown = q.trim() ? apps.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase())) : apps;
  const launch = (a: App) => {
    gameAudio.playClickSound();
    if (a.screen) { setScreen(a.screen); return; }
    if (a.run) { onClose(); a.run(); return; }
    onClose();
    if (a.href) router.push(a.href);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="absolute inset-0 bg-slate-950/25" onClick={onClose} aria-hidden />
        <button onClick={onClose} className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-10 -translate-y-1/2 h-12 px-5 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl flex items-center gap-2 active:scale-95">
          <X className="w-5 h-5" /> Close
        </button>
        <div role="dialog" aria-modal="true" aria-label="Your phone"
          className="relative w-[min(92vw,400px)] h-[min(100%,820px)] rounded-[48px] bg-slate-900 p-[10px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] animate-[sheetUp_0.25s_ease-out]">
          <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-gradient-to-b from-emerald-800 via-emerald-600 to-emerald-50 text-white flex flex-col">
            {/* Skyline at the foot of the wallpaper. */}
            <svg className="absolute bottom-0 inset-x-0 w-full h-28 text-emerald-900/25 pointer-events-none" viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden>
              <path fill="currentColor" d="M0 110V80h30V60h20v20h25V40h18v40h22V20l8-18 8 18v60h25V55h30v25h20V45h22v35h30V65h25v15h30V50h20v30h17v30z" />
            </svg>
            <div className={`relative z-10 flex items-center justify-between px-7 pt-4 pb-2 text-sm font-bold ${light ? "text-slate-900" : ""}`}>
              <span className="tabular-nums">{t ? `${t.clock}${t.ampm}` : ""}</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-3 w-28 h-7 rounded-full bg-slate-950" aria-hidden />
              <span className="flex items-center gap-1.5">●●● 5G <span className="inline-block w-6 h-3 rounded-[3px] border-2 border-current relative"><span className="absolute inset-0.5 right-1 bg-current rounded-[1px]" /></span></span>
            </div>

            {screen === "jobs" ? <JobsApp onBack={home} />
            : screen === "clinic" ? <ClinicApp onBack={home} />
            : screen === "court" ? <PoliceApp onBack={home} />
            : screen === "food" ? <DeliveryApp mode="food" onBack={home} />
            : screen === "grocery" ? <DeliveryApp mode="grocery" onBack={home} />
            : screen.startsWith("store:") ? <DeliveryApp mode="food" storeId={screen.slice(6)} onBack={home} />
            : screen === "rides" ? <RideApp onBack={home} onClose={onClose} />
            : screen === "games" ? (
              <div className="relative flex-1 overflow-y-auto px-5 pb-10">
                <button onClick={home} className="flex items-center gap-1 font-bold text-white/90 mb-3"><ChevronLeft className="w-5 h-5" /> Home</button>
                <h2 className="text-3xl font-black mb-3">Games</h2>
                <div className="space-y-2">
                  {GAMES.map((g) => (
                    <button key={g.id} onClick={() => { onClose(); router.push(`/games/${g.id}`); }} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/90 text-slate-900 text-left active:scale-[0.98]">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: g.bg }}>{g.icon}</span>
                      <span className="flex-1 min-w-0"><span className="block font-black">{g.name}</span><span className="block text-xs text-slate-500 truncate">{g.tagline}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
                <div className="pt-4">
                  <div className="text-7xl font-black tracking-tight tabular-nums leading-none">{t?.clock}</div>
                  <div className="text-lg text-white/90 mt-2">{t?.date} · Dubai</div>
                </div>
                {unread > 0 && (
                  <button onClick={() => { onClose(); router.push("/phone"); }} className="mt-4 w-full flex items-center gap-3 p-3 pr-2 rounded-3xl bg-white text-slate-900 text-left shadow-lg">
                    <span className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center text-xl">💬</span>
                    <span className="flex-1 font-bold leading-tight">{unread} unread message{unread > 1 ? "s" : ""}</span>
                    <span className="h-10 px-4 rounded-full bg-sky-500 text-white font-black flex items-center">Read ›</span>
                  </button>
                )}
                <label className="mt-4 flex items-center gap-2 h-12 px-4 rounded-full bg-white/25 backdrop-blur text-white">
                  <Search className="w-5 h-5 shrink-0" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-white/80 text-base" />
                </label>
                <div className="grid grid-cols-4 gap-x-3 gap-y-4 mt-5">
                  {shown.map((a) => (
                    <button key={a.id} onClick={() => launch(a)} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                      <span className={`relative w-[62px] h-[62px] max-w-full aspect-square rounded-[18px] bg-gradient-to-br ${a.bg} flex items-center justify-center text-3xl shadow-[0_4px_10px_rgba(0,0,0,0.25)]`}>
                        {a.icon}
                        {a.badge ? <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">{a.badge > 99 ? "99+" : a.badge}</span>
                          : a.isNew ? <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">NEW</span> : null}
                      </span>
                      <span className="max-w-full px-1.5 rounded-md bg-slate-900/45 text-[12px] font-semibold leading-tight truncate">{a.name}</span>
                    </button>
                  ))}
                </div>
                {shown.length === 0 && <p className="text-center text-white/90 font-bold mt-8">No app called “{q}”.</p>}
              </div>
            )}
            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 rounded-full z-10 ${light ? "bg-slate-800" : "bg-white/80"}`} aria-hidden />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
