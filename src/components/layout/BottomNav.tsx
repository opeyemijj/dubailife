"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, User } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { moodOf } from "@/lib/dubaiClock";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { openLife } from "@/components/life/LifeHub";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { MoodFace } from "@/components/layout/TopBar";
import { gameAudio } from "@/utils/gameAudio";
import { illnessOf, useServices } from "@/lib/cityServices";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  const onMap = isActive("/explore") && !!citizen?.id;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto">
        <ServiceAlert />
        {onMap && <YouChip />}
        <div className="flex items-center gap-2.5">
          <nav className="flex-1 h-[60px] bg-white/95 backdrop-blur-2xl border border-white rounded-full p-1.5 flex items-center pointer-events-auto shadow-[0_8px_28px_rgba(15,23,42,0.25)]">
            <NavItem href="/home" icon={<Home className="w-6 h-6" />} label="Home" active={isActive("/home")} />
            <NavItem href="/profile" icon={<User className="w-6 h-6" />} label="Me" active={isActive("/profile")} />
            <NavItem href="/explore" icon={<Map className="w-6 h-6" />} label="Map" active={isActive("/explore")} />
          </nav>
          <PhoneButton unread={unread} />
        </div>
      </div>
    </div>
  );
}

/** Your face and how you feel, just above the bar on the map; tapping opens your needs. */
function YouChip() {
  const { citizen } = useCitizen();
  const life = useLifeLoop();
  const mood = moodOf(citizen, !!useServices(citizen?.id)?.illness);
  const visa = life && life.visaTier !== "GOLDEN" ? visaInfo(life.visaTier) : null;
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openLife("needs"); }}
      aria-label={`You feel ${mood.label}. Open your needs`}
      className="pointer-events-auto mb-2 flex items-center gap-1.5 active:scale-95 transition-transform"
    >
      <span className="w-12 h-12 rounded-full ring-[3px] ring-white shadow-lg overflow-hidden bg-rose-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rosterThumb(presetFor(citizen?.look ?? { gender: "woman" }))} alt="" className="w-full h-full object-cover object-top" />
      </span>
      <span className="h-10 pl-2.5 pr-3.5 rounded-full bg-amber-50/95 shadow-md flex items-center gap-1.5 font-bold text-slate-800">
        <MoodFace mood={mood} className="w-5 h-5" /> {mood.label}
      </span>
      {visa && life && life.visaDaysLeft <= 10 && (
        <span className={`h-10 px-3 rounded-full shadow-md flex items-center font-bold text-sm ${life.visaDaysLeft <= 5 ? "bg-rose-500 text-white" : "bg-white/95 text-slate-800"}`}>
          {visa.icon} {life.visaDaysLeft}d
        </span>
      )}
    </button>
  );
}

/** Ill, arrested, or patients and clients waiting: one card above the bar that opens the right app. */
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

/** The round button that brings your phone up over the page. */
function PhoneButton({ unread }: { unread: number }) {
  return (
    <button
      onClick={() => openPhone()}
      aria-label={unread ? `Phone: ${unread} unread` : "Phone"}
      className="relative pointer-events-auto w-[60px] h-[60px] shrink-0 rounded-full bg-white shadow-[0_8px_28px_rgba(15,23,42,0.25)] flex items-center justify-center overflow-hidden active:scale-90 transition-transform"
    >
      <span className="block w-7 h-11 rounded-[7px] border-[3px] border-slate-900 bg-gradient-to-b from-sky-400 via-violet-500 to-fuchsia-500 rotate-[14deg] translate-y-1.5 flex items-start justify-center pt-1.5">
        <span className="w-3.5 h-3 rounded-full bg-white text-[7px] leading-3 text-violet-600 font-black text-center">···</span>
      </span>
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center ring-2 ring-white">
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
