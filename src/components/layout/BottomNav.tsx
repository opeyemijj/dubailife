"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Map, Smartphone, User, X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { openLife } from "@/components/life/LifeHub";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";
import { SITE } from "@/lib/site";
import { illnessOf, useServices } from "@/lib/cityServices";
import { useEmbedded } from "@/components/layout/Embed";
import { useMissions } from "@/lib/missions";
import { dismissCityPulse, useCityPulse, usePresentCitizens } from "@/lib/presence";
import { gatherings, SLOT_MS } from "@/lib/locals";
import { PLACES } from "@/lib/city/places";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  const onMap = isActive("/explore") && !!citizen?.id;
  // Inside the in-game phone the page around it already has the bar.
  if (useEmbedded()) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto">
        <LivePulseBanner />
        <ServiceAlert />
        {onMap && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <VisaChip />
            <HotspotChip />
          </div>
        )}
        {/* One white bar: the buttons and, on the map, the About and social links under them. */}
        <div className={`bg-white/95 backdrop-blur-2xl border border-white pointer-events-auto shadow-[0_8px_28px_rgba(15,23,42,0.25)] ${onMap ? "rounded-[30px]" : "rounded-full"}`}>
          <nav className="h-[60px] p-1.5 flex items-center">
            <NavItem href="/home" icon={<Home className="w-6 h-6" />} label="Home" active={isActive("/home")} />
            <NavItem href="/explore" icon={<Map className="w-6 h-6" />} label="Map" active={isActive("/explore")} />
            <button
              onClick={() => {
                gameAudio.playClickSound();
                openLife("profile");
              }}
              aria-label="Me"
              className={`h-full rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isActive("/profile") ? "flex-[1.6] bg-emerald-50 text-emerald-700 font-bold text-lg" : "flex-1 text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-6 h-6" />
              {isActive("/profile") && <span>Me</span>}
            </button>
            <PhoneButton unread={unread} />
          </nav>
          {onMap && <MapFooter />}
        </div>
      </div>
    </div>
  );
}

/** Under the bar on the map: the same About and social links as the signed-out landing page. */
function MapFooter() {
  return (
    <div className="flex items-center justify-center gap-3 pb-2 -mt-0.5 text-xs font-bold text-slate-500">
      <Link href="/about" className="hover:text-slate-800 transition-colors">About</Link>
      {SITE.socials.map((n) => <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">{n.label}</a>)}
    </div>
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

/** Funnels online players into the same 3D room: picks the busiest live player venue or the 15-min Happy Hour Hotspot. */
function HotspotChip() {
  const router = useRouter();
  const present = usePresentCitizens();
  const slot = Math.floor(Date.now() / SLOT_MS);
  const topGathering = gatherings(slot)[0];

  // Count real players by venuePath or placeId
  const pathCounts: Record<string, number> = {};
  for (const p of present) {
    if (p.venuePath && p.venuePath.startsWith("/place/")) {
      pathCounts[p.venuePath] = (pathCounts[p.venuePath] ?? 0) + 1;
    } else if (p.placeId) {
      const place = PLACES.find((x) => x.id === p.placeId);
      const firstVenue = place?.venues.find((v) => !v.comingSoon);
      if (place && firstVenue) {
        const vp = `/place/${place.id}/${firstVenue.id}`;
        pathCounts[vp] = (pathCounts[vp] ?? 0) + 1;
      }
    }
  }

  let bestHref = topGathering ? `/place/${topGathering.place.id}/${topGathering.venue.id}` : "/explore";
  let bestName = topGathering?.venue.name ?? "Dubai Mall";
  let liveCount = 0;

  for (const [vp, c] of Object.entries(pathCounts)) {
    if (c > liveCount) {
      liveCount = c;
      bestHref = vp;
      const [, , pid, vid] = vp.split("/");
      const pl = PLACES.find((x) => x.id === pid);
      const vn = pl?.venues.find((v) => v.id === vid);
      if (vn) bestName = vn.name;
    }
  }

  const totalCrowd = liveCount + 5; // 5 hosts + live citizens

  return (
    <button
      onClick={() => {
        gameAudio.playClickSound();
        router.push(bestHref);
      }}
      title={`Teleport to ${bestName} — Live Happy Hour Hotspot (1.5× Crowd Bonus)`}
      className="pointer-events-auto h-9 px-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg flex items-center gap-1.5 font-black text-xs active:scale-95 transition-transform max-w-[54vw] sm:max-w-none"
    >
      <span className="shrink-0">🔥</span>
      <span className="truncate">{bestName}</span>
      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-slate-950/20 text-[10px] font-black">
        {totalCrowd} here · 1.5×
      </span>
    </button>
  );
}

/** On the map: a compact "Next Reward / Visa" micro-progress pill so players always see their closest goal. */
function VisaChip() {
  const { citizen } = useCitizen();
  const life = useLifeLoop();
  const { missions } = useMissions(citizen?.id);
  const visa = life && life.visaTier !== "GOLDEN" ? visaInfo(life.visaTier) : null;

  if (visa && life && life.visaDaysLeft <= 10) {
    return (
      <button
        onClick={() => { gameAudio.playClickSound(); openLife("visa"); }}
        aria-label={`${visa.label}: ${life.visaDaysLeft} days left`}
        className={`pointer-events-auto h-9 px-3 rounded-full shadow-md flex items-center gap-1 font-bold text-xs sm:text-sm active:scale-95 ${life.visaDaysLeft <= 5 ? "bg-rose-500 text-white" : "bg-white/95 text-slate-800"}`}
      >
        {visa.icon} Visa: {life.visaDaysLeft}d left
      </button>
    );
  }

  if (!missions || missions.box.claimed) return null;
  const doneCount = missions.missions.filter((m) => m.done).length;
  const pct = Math.min(100, Math.round((doneCount / 3) * 100));
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openLife("goals"); }}
      aria-label={`Daily Mystery Vault: ${doneCount} of 3 missions complete`}
      className="pointer-events-auto h-9 px-3 rounded-full bg-slate-900/95 text-white border border-white/15 shadow-lg flex items-center gap-1.5 font-bold text-xs active:scale-95"
    >
      <span>🎁</span>
      <span className="truncate">{doneCount >= 3 ? "Unlock Vault!" : `${doneCount}/3 Vault`}</span>
      <span className="w-8 sm:w-10 h-2 rounded-full bg-white/15 overflow-hidden shrink-0">
        <span className="block h-full bg-amber-400 transition-all" style={{ width: `${Math.max(15, pct)}%` }} />
      </span>
    </button>
  );
}

function ServiceAlert() {
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
