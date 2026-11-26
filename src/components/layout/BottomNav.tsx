"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flame, Home, LayoutGrid, Map, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { openMore, useMoreBadge } from "@/components/layout/MoreMenu";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { openLife } from "@/components/life/LifeHub";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";
import { illnessOf, useServices } from "@/lib/cityServices";
import { useEmbedded } from "@/components/layout/Embed";
import { usePhoneButtonHere } from "@/lib/phoneButtons";
import { useMissions } from "@/lib/missions";
import { dismissCityPulse, useCityPulse } from "@/lib/presence";
import { useCityMapPath } from "@/lib/city/presence";
import { goalSlot, RailButton, railTop } from "@/components/layout/mapRail";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  // Map is the map of the city you're in (Dubai's /explore, Abu Dhabi's /abu-dhabi: lib/city/presence).
  const mapPath = useCityMapPath();
  const onMap = isActive(mapPath) && !!citizen?.id;
  const embedded = useEmbedded();
  // This bar has the phone, so the floating phone button isn't needed.
  usePhoneButtonHere(!embedded);
  // Inside the in-game phone the page around it already has the bar.
  if (embedded) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto">
        {/* On the map these are round icons down the left (MapRail), so the map stays clear; elsewhere, banners. */}
        {onMap ? <MapRail /> : <><LivePulseBanner /><ServiceAlert /></>}
        {/* One white bar: the buttons and, on the map, the About and social links under them. */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white pointer-events-auto shadow-[0_8px_28px_rgba(15,23,42,0.25)] rounded-full">
          <nav className="relative h-[60px] p-1.5 flex items-center">
            <NavItem href="/home" icon={<Home className="w-6 h-6" />} label="Home" active={isActive("/home")} />
            <NavItem href={mapPath} icon={<Map className="w-6 h-6" />} label="Map" active={isActive(mapPath)} />
            {citizen?.id && <CityButton active={isActive("/city")} />}
            <PhoneButton unread={unread} />
            {citizen?.id && <MoreButton active={isActive("/top") || isActive("/wiki")} />}
          </nav>
        </div>
      </div>
    </div>
  );
}

/** The City Feed, with a dot when there's a post newer than the last one seen there. */
function CityButton({ active }: { active: boolean }) {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data } = await supabase().rpc("city_latest");
      let seen = 0;
      try { seen = Number(localStorage.getItem("city-feed-seen") ?? 0); } catch { /* storage blocked */ }
      if (live) setFresh(Number(data ?? 0) > seen);
    };
    const first = setTimeout(() => void check(), 3000);
    const every = setInterval(() => void check(), 120_000);
    const seenNow = () => setFresh(false);
    window.addEventListener("dubai:city-seen", seenNow);
    return () => { live = false; clearTimeout(first); clearInterval(every); window.removeEventListener("dubai:city-seen", seenNow); };
  }, []);
  return (
    <Link href="/city" aria-label={fresh ? "City, new posts" : "City"} aria-current={active ? "page" : undefined}
      className={`relative h-full rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 ${
        active ? "flex-[1.6] bg-fuchsia-50 text-fuchsia-700 font-bold text-lg" : "flex-1 text-slate-600 hover:text-slate-900"
      }`}>
      <Flame className="w-6 h-6" />
      {active && <span>City</span>}
      {fresh && !active && <span className="absolute top-2 left-1/2 ml-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
    </Link>
  );
}

/** More: opens the menu of everywhere to go (MoreMenu), with the To do count on it. */
function MoreButton({ active }: { active: boolean }) {
  const count = useMoreBadge();
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openMore(); }}
      aria-label={count ? `More, ${count} to try` : "More"}
      className={`relative h-full rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 ${
        active ? "flex-[1.6] bg-emerald-50 text-emerald-700 font-bold text-lg" : "flex-1 text-slate-600 hover:text-slate-900"
      }`}
    >
      <LayoutGrid className="w-6 h-6" />
      {active && <span>More</span>}
      {count > 0 && (
        <span className="absolute top-1 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** Live city-wide multiplayer event banner (Open House, VIP Bottle Service, 3D Pool Challenge, Decorator Dispatch). */
function LivePulseBanner() {
  const pulse = useCityPulse();
  const router = useRouter();
  if (!pulse) return null;

  return (
    <div className="pointer-events-auto mb-2 flex items-center gap-2.5 p-2 pl-3 rounded-[24px] bg-slate-950/95 text-white border border-amber-400/40 shadow-[0_8px_28px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
        {pulse.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-xs sm:text-sm text-amber-300 leading-tight truncate">{pulse.title}</span>
        <span className="block text-[11px] text-slate-300 truncate">{pulse.subtitle}</span>
      </span>
      <button
        onClick={() => {
          gameAudio.playClickSound();
          const to = pulse.href;
          dismissCityPulse();
          if (to === "phone:decor") openPhone("decor");
          else router.push(to);
        }}
        className="h-9 px-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs shrink-0 active:scale-95"
      >
        {pulse.cta}
      </button>
      <button
        onClick={() => dismissCityPulse()}
        aria-label="Dismiss alert"
        className="w-7 h-7 rounded-full text-slate-400 hover:text-white flex items-center justify-center shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** On the map: the daily Vault, an expiring visa, a health or police alert and a live event, each a round icon with
 *  a badge down the right (under the goal: layout/mapRail). A live event opens its banner beside the icon. */
function MapRail() {
  const { citizen } = useCitizen();
  const first = goalSlot(usePathname() ?? "") + 1;
  const life = useLifeLoop();
  const { missions } = useMissions(citizen?.id);
  const alert = useServiceAlert();
  const pulse = useCityPulse();
  const [pulseOpen, setPulseOpen] = useState(false);
  const visa = life && life.visaTier !== "GOLDEN" ? visaInfo(life.visaTier) : null;
  const items: { key: string; icon: string; badge: string; label: string; tone?: string; alert?: boolean; go: () => void }[] = [];
  if (missions && !missions.box.claimed) {
    const done = missions.missions.filter((m) => m.done).length;
    items.push({ key: "vault", icon: "🎁", badge: done >= 3 ? "!" : `${done}/3`, label: done >= 3 ? "Daily Vault: unlock it" : `Daily Vault: ${done} of 3 missions`, tone: "bg-slate-900 text-white", alert: done >= 3, go: () => openLife("goals") });
  }
  if (visa && life && life.visaDaysLeft <= 10) {
    items.push({ key: "visa", icon: "🛂", badge: `${life.visaDaysLeft}d`, label: `${visa.label}: ${life.visaDaysLeft} days left`, tone: life.visaDaysLeft <= 5 ? "bg-rose-500 text-white" : undefined, alert: life.visaDaysLeft <= 5, go: () => openLife("visa") });
  }
  if (alert) items.push({ key: "alert", icon: alert.icon, badge: "!", label: `${alert.title}: ${alert.text}`, go: () => openPhone(alert.app) });
  if (pulse) items.push({ key: "pulse", icon: pulse.icon, badge: "LIVE", label: pulse.title, alert: true, go: () => setPulseOpen((o) => !o) });
  const pulseAt = items.findIndex((it) => it.key === "pulse");
  return (
    <>
      {items.map((it, i) => <RailButton key={it.key} n={first + i} icon={it.icon} badge={it.badge} label={it.label} tone={it.tone} alert={it.alert} onClick={() => { gameAudio.playClickSound(); it.go(); }} />)}
      {pulse && pulseOpen && pulseAt >= 0 && (
        <div className="fixed right-[4.25rem] left-3 z-[58] pointer-events-auto" style={{ top: railTop(first + pulseAt) }} onClick={() => setPulseOpen(false)}>
          <LivePulseBanner />
        </div>
      )}
    </>
  );
}

/** What needs you at the doctor's or the police (being ill, arrested, a patient or a client waiting), if anything. */
function useServiceAlert() {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  if (!s) return null;
  const ill = illnessOf(s.illness?.kind);
  const open = s.cases.find((c) => c.status === "open");
  const alert = open
    ? { icon: "🚔", title: "You've been arrested", text: `AED ${open.held.toLocaleString()} held · ${open.lawyerKind ? "your lawyer is on it" : "get a lawyer before the hearing"}`, cta: "Police", app: "court" as const, tone: "bg-blue-700" }
    : ill ? { icon: ill.icon, title: ill.name, text: s.waiting ? `Waiting for Dr @${s.waiting.doctor}` : "See a doctor on Dubai Health", cta: "Doctor", app: "clinic" as const, tone: "bg-teal-600" }
    : s.patients.length ? { icon: "🩺", title: `${s.patients.length} patient${s.patients.length > 1 ? "s" : ""} waiting`, text: "They've paid; treat them to get it", cta: "Treat", app: "clinic" as const, tone: "bg-teal-600" }
    : s.clients.some((c) => c.status === "open" && c.defence === null) ? { icon: "⚖️", title: "A client needs you", text: "Prepare their defence before the hearing", cta: "Court", app: "court" as const, tone: "bg-amber-600" }
    : null;
  return alert;
}

function ServiceAlert() {
  const alert = useServiceAlert();
  if (!alert) return null;
  return (
    <div className="pointer-events-auto mb-2 flex items-center gap-3 p-2 pl-2.5 rounded-[26px] bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.22)]">
      <span className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shrink-0">{alert.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-slate-900 leading-tight truncate">{alert.title}</span>
        <span className="block text-sm text-slate-500 truncate">{alert.text}</span>
      </span>
      <button onClick={() => openPhone(alert.app)} className={`h-11 px-4 rounded-full text-white font-semibold shrink-0 active:scale-95 ${alert.tone}`}>{alert.cta}</button>
    </div>
  );
}

/** Your phone, beside your profile: it opens over the page. */
function PhoneButton({ unread }: { unread: number }) {
  return (
    <button
      onClick={() => openPhone()}
      aria-label={unread ? `Phone: ${unread} unread` : "Phone"}
      className="relative h-full flex-1 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
    >
      <Smartphone className="w-6 h-6" />
      {unread > 0 && (
        <span className="absolute top-1 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`h-full rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 ${
        active ? "flex-[1.6] bg-emerald-50 text-emerald-700 font-bold text-lg" : "flex-1 text-slate-600 hover:text-slate-900"
      }`}
    >
      {icon}
      {active && <span>{label}</span>}
    </Link>
  );
}
