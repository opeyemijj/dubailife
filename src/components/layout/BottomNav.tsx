"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Flame, Home, LayoutGrid, ListChecks, Map, Smartphone, Trophy, User, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { inviteFriends } from "@/lib/invite";
import { describePost, loadFeed, loadLiveParties } from "@/lib/cityFeed";
import { useCitizen } from "@/lib/citizenStore";
import { openDiscover, toTryCount, useDiscover } from "@/lib/discover";
import { useUnreadTotal } from "@/lib/unread";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { openLife } from "@/components/life/LifeHub";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";
import { SITE } from "@/lib/site";
import { illnessOf, useServices } from "@/lib/cityServices";
import { useEmbedded } from "@/components/layout/Embed";
import { usePhoneButtonHere } from "@/lib/phoneButtons";
import { useMissions } from "@/lib/missions";
import { dismissCityPulse, useCityPulse } from "@/lib/presence";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  const onMap = isActive("/explore") && !!citizen?.id;
  const embedded = useEmbedded();
  // This bar has the phone, so the floating phone button isn't needed.
  usePhoneButtonHere(!embedded);
  // Inside the in-game phone the page around it already has the bar.
  if (embedded) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none">
      <div className="max-w-md mx-auto">
        <LivePulseBanner />
        <ServiceAlert />
        {onMap && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <VisaChip />
          </div>
        )}
        {onMap && <CityStrip />}
        {/* One white bar: the buttons and, on the map, the About and social links under them. */}
        <div className={`bg-white/95 backdrop-blur-2xl border border-white pointer-events-auto shadow-[0_8px_28px_rgba(15,23,42,0.25)] ${onMap ? "rounded-[30px]" : "rounded-full"}`}>
          <nav className="relative h-[60px] p-1.5 flex items-center">
            <NavItem href="/home" icon={<Home className="w-6 h-6" />} label="Home" active={isActive("/home")} />
            <NavItem href="/explore" icon={<Map className="w-6 h-6" />} label="Map" active={isActive("/explore")} />
            {citizen?.id && <CityButton active={isActive("/city")} />}
            <PhoneButton unread={unread} />
            {citizen?.id && <MoreButton active={isActive("/top") || isActive("/wiki")} />}
          </nav>
          {onMap && <MapFooter />}
        </div>
      </div>
    </div>
  );
}

/** On the map: the newest thing happening in the City, one line, a tap away (requirements R4). */
function CityStrip() {
  const [line, setLine] = useState<{ icon: string; text: string } | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const [posts, parties] = await Promise.all([loadFeed("all"), loadLiveParties()]);
      if (!live) return;
      const p = parties[0];
      if (p) { setLine({ icon: "🎉", text: `@${p.host} is hosting ${p.title ? `"${p.title}"` : "a party"} · ${p.arrived} there` }); return; }
      const first = posts.find((x) => Date.now() - Date.parse(x.at) < 6 * 3_600_000);
      setLine(first ? describePost(first) : null);
    };
    const first = setTimeout(() => void load(), 2500);
    const every = setInterval(() => void load(), 120_000);
    return () => { live = false; clearTimeout(first); clearInterval(every); };
  }, []);
  if (!line) return null;
  return (
    <Link href="/city" className="pointer-events-auto mb-2 flex items-center gap-2 rounded-full bg-slate-950/80 backdrop-blur text-white px-3.5 py-2 text-xs font-bold shadow-lg">
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
      <span className="shrink-0">{line.icon}</span>
      <span className="flex-1 min-w-0 truncate">{line.text}</span>
      <span className="shrink-0 text-fuchsia-300">City ›</span>
    </Link>
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

/** More: Me, To do, Top users, Invite friends, How to play, in a small panel above the bar. Counts inside show on it. */
function MoreButton({ active }: { active: boolean }) {
  useDiscover();
  const count = toTryCount();
  const router = useRouter();
  const { citizen } = useCitizen();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const go = (fn: () => void) => { gameAudio.playClickSound(); setOpen(false); fn(); };
  const items: { id: string; icon: React.ReactNode; label: string; sub: string; badge?: number; run: () => void }[] = [
    { id: "me", icon: <User className="w-5 h-5" />, label: "Me", sub: "Profile, look and settings", run: () => openLife("profile") },
    { id: "todo", icon: <ListChecks className="w-5 h-5" />, label: "To do", sub: "Things to try, with rewards", badge: count, run: () => openDiscover("do") },
    { id: "top", icon: <Trophy className="w-5 h-5" />, label: "Top users", sub: "This week's top and the richest", run: () => router.push("/top") },
    {
      id: "invite", icon: <UserPlus className="w-5 h-5" />, label: "Invite friends", sub: "WhatsApp, share or copy your link",
      run: async () => {
        const r = await inviteFriends(citizen?.username);
        if (r === "copied") { setNote("Invite link copied. Send it to your friends!"); setOpen(true); }
      },
    },
    { id: "wiki", icon: <BookOpen className="w-5 h-5" />, label: "How to play", sub: "The wiki, and how to get to the top", run: () => router.push("/wiki") },
  ];
  return (
    <>
      <button
        onClick={() => { gameAudio.playClickSound(); setNote(null); setOpen((o) => !o); }}
        aria-label={count ? `More, ${count} to try` : "More"}
        aria-expanded={open}
        className={`relative h-full rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 ${
          active || open ? "flex-[1.6] bg-emerald-50 text-emerald-700 font-bold text-lg" : "flex-1 text-slate-600 hover:text-slate-900"
        }`}
      >
        <LayoutGrid className="w-6 h-6" />
        {(active || open) && <span>More</span>}
        {count > 0 && !open && (
          <span className="absolute top-1 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[-1] pointer-events-auto" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute bottom-[calc(100%+0.5rem)] right-0 w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl bg-white shadow-[0_12px_40px_rgba(15,23,42,0.3)] p-2 pointer-events-auto animate-[sheetUp_0.18s_ease-out]" role="menu">
            {items.map((it) => (
              <button key={it.id} role="menuitem" onClick={() => go(it.run)} className="w-full flex items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-slate-50">
                <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">{it.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-slate-900 leading-tight">{it.label}</span>
                  <span className="block text-xs text-slate-500 truncate">{it.sub}</span>
                </span>
                {it.badge ? <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">{it.badge > 99 ? "99+" : it.badge}</span> : null}
              </button>
            ))}
            {note && <p className="px-3 pb-2 text-xs font-bold text-violet-700">{note}</p>}
          </div>
        </>
      )}
    </>
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
