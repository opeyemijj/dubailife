"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronRight, ChevronUp, Flame, Frown, Gift, Laugh, ListChecks, MapPin, Meh, Plus, Smile, Smartphone, Sun, Moon, Thermometer, User, Users, Volume2, Wallet, X, Sparkles, Lightbulb } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useOnlineCount, formatOnline } from "@/lib/presence";
import { dubaiTime, moodOf, useNow, type Mood } from "@/lib/dubaiClock";
import { useLifeLoop, visaInfo } from "@/lib/lifeLoop";
import { lifeOf } from "@/lib/life";
import { openLife } from "@/components/life/LifeHub";
import { openDiscover } from "@/lib/discover";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { openSheet } from "@/components/layout/HudSheets";
import { gameAudio } from "@/utils/gameAudio";
import { useServices } from "@/lib/cityServices";
import { useEmbedded } from "@/components/layout/Embed";

export interface TopBarProps {
  walletBalance?: number;
}

/** Big amounts shortened for the pill: 10,863,950 → 10.8M. */
const short = (n: number) =>
  n >= 1e9 ? `${(Math.floor(n / 1e8) / 10).toFixed(1)}B` : n >= 1e6 ? `${(Math.floor(n / 1e5) / 10).toFixed(1)}M` : n >= 1e4 ? `${Math.floor(n / 1000)}K` : n.toLocaleString();


export function MoodFace({ mood, className = "w-5 h-5" }: { mood: Mood; className?: string }) {
  const Icon = mood.face === "happy" ? Laugh : mood.face === "fine" ? Smile : mood.face === "low" ? Meh : mood.face === "sick" ? Thermometer : Frown;
  return <Icon className={`${className} ${mood.tone}`} aria-label={mood.label} />;
}

export function TopBar({ walletBalance: walletOverride }: TopBarProps) {
  const { citizen } = useCitizen();
  const walletBalance = walletOverride ?? citizen?.balance ?? 0;
  const now = useNow();
  const t = now ? dubaiTime(now) : null;
  const mood = moodOf(citizen, !!useServices(citizen?.id)?.illness);
  const [open, setOpen] = useState(false);
  if (useEmbedded()) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none select-none text-slate-900">
      {/* One slim bar, like Home's: time and mood, the status chevron, alerts and the wallet. */}
      <div className="max-w-4xl mx-auto pointer-events-auto flex items-center justify-between gap-2 bg-white/95 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] pl-3 pr-1.5 py-1.5 rounded-full">
        <button
          onClick={() => { gameAudio.playClickSound(); setOpen((o) => !o); }}
          aria-label="Time, weather and mood"
          className="flex items-center gap-1.5 min-w-0 active:scale-95 transition-transform"
        >
          {t?.night ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
          <span className="text-sm font-black tabular-nums leading-none">{t?.clock ?? "--:--"}<span className="text-[9px] font-bold text-slate-500 ml-0.5">{t?.ampm}</span></span>
          <span className="hidden min-[360px]:flex items-center text-[10px] font-bold text-orange-500"><Thermometer className="w-3 h-3" />{t ? `${t.tempC}°` : ""}</span>
          <span className="w-px h-3.5 bg-slate-200" />
          <MoodFace mood={mood} className="w-4 h-4" />
        </button>

        <button
          onClick={() => { gameAudio.playClickSound(); setOpen((o) => !o); }}
          aria-label={open ? "Close status" : "Open status"}
          aria-expanded={open}
          className={`h-8 w-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all ${open ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/phone?tab=alerts" aria-label="Notifications" className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90">
            <Bell className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 h-8 pl-2.5 pr-0.5 rounded-full bg-amber-50 border border-amber-200">
            <Link href="/wallet" aria-label={`Wallet: AED ${walletBalance.toLocaleString()}`} className="text-[13px] font-black tabular-nums text-amber-900">
              <span className="text-[9px] font-bold text-amber-700 mr-0.5">AED</span>{short(walletBalance)}
            </Link>
            <Link href="/wallet" aria-label="Add money" className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center active:scale-90">
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>

      {open && <StatusPanel onClose={() => setOpen(false)} mood={mood} balance={walletBalance} />}
    </div>
  );
}

/** The panel under the chevron: the day at a glance and quick switches. */
function StatusPanel({ onClose, mood, balance }: { onClose: () => void; mood: Mood; balance: number }) {
  const { citizen } = useCitizen();
  const now = useNow();
  const t = now ? dubaiTime(now) : null;
  const life = useLifeLoop();
  const online = useOnlineCount();
  const goal = lifeOf(citizen).wishes[0];
  const [music, setMusic] = useState(() => !gameAudio.getIsMuted());
  const visa = life && life.visaTier !== "GOLDEN" ? visaInfo(life.visaTier) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = (fn: () => void) => () => { gameAudio.playClickSound(); onClose(); fn(); };

  return (
    <>
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Your day" className="relative pointer-events-auto mt-2 mx-auto max-w-md bg-white rounded-[28px] shadow-[0_18px_50px_rgba(15,23,42,0.35)] max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="text-4xl font-black tracking-tight tabular-nums leading-none">{t?.clock}<span className="text-base ml-1">{t?.ampm}</span></div>
            <div className="text-sm text-slate-500 mt-1">{t?.date} · Dubai · {t?.tempC}°C</div>
          </div>
          <span className={`w-12 h-12 rounded-full flex items-center justify-center ${t?.night ? "bg-indigo-100" : "bg-amber-100"}`}>
            {t?.night ? <Moon className="w-6 h-6 text-indigo-500" /> : <Sun className="w-6 h-6 text-amber-500" />}
          </span>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <Row icon={<Gift className="w-5 h-5" />} title={goal ? `${goal.icon} ${goal.label}` : citizen?.job ? "Pick a goal" : "Get a job"} sub={goal ? `Your next goal · AED ${goal.reward.toLocaleString()}` : "Your next goal"}
          href={goal?.href ?? (citizen?.job ? undefined : "/jobs")} onClick={goal?.href || !citizen?.job ? onClose : act(() => openLife("goals"))} />
        <Row icon={<Flame className="w-5 h-5 text-orange-500" />} title={life ? `${life.streak}-day streak` : "Streak"} sub={visa && life ? `${visa.label} · ${life.visaDaysLeft} days left` : "Streak & visa"} onClick={act(() => openLife(visa ? "visa" : "season"))} />
        <Row icon={<MoodFace mood={mood} />} title={mood.label} sub={mood.face === "sick" ? "See a doctor on Dubai Health" : "See what you need"} onClick={act(() => (mood.face === "sick" ? openPhone("clinic") : openLife("needs")))} />
        <Row icon={<Wallet className="w-5 h-5" />} title={`AED ${balance.toLocaleString()}`} sub="Your wallet" href="/wallet" onClick={onClose}
          trailing={<span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]"><Plus className="w-5 h-5" strokeWidth={3} /></span>} />
        <Row icon={<Users className="w-5 h-5" />} title={<><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />{formatOnline(online)} online now</>} sub="Real people in Dubai" onClick={act(() => openPhone())} />
        <Row icon={<Volume2 className="w-5 h-5" />} title="Music" sub="Map, club and radio music"
          trailing={<Toggle on={music} onChange={(on) => { gameAudio.setMuted(!on); setMusic(on); }} label="Music" />} />

        <div className="grid grid-cols-3 gap-2 p-3">
          <Tile icon={<ListChecks className="w-5 h-5" />} label="To do" onClick={act(() => openDiscover("do"))} />
          <Tile icon={<MapPin className="w-5 h-5" />} label="Places" onClick={act(() => openDiscover("places"))} />
          <Tile icon={<Smartphone className="w-5 h-5" />} label="Phone" onClick={act(() => openPhone())} />
          <Tile icon={<Sparkles className="w-5 h-5" />} label="What's new" onClick={act(() => openSheet("whats-new"))} />
          <Tile icon={<Lightbulb className="w-5 h-5" />} label="Suggest" onClick={act(() => openSheet("suggest"))} />
          <Tile icon={<User className="w-5 h-5" />} label="Profile" href="/profile" onClick={onClose} />
        </div>
      </div>
    </>
  );
}

function Row({ icon, title, sub, href, onClick, trailing }: { icon: React.ReactNode; title: React.ReactNode; sub: string; href?: string; onClick?: () => void; trailing?: React.ReactNode }) {
  const body = (
    <>
      <span className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-[15px] truncate">{title}</span>
        <span className="block text-xs text-slate-500 truncate">{sub}</span>
      </span>
      {trailing ?? (onClick || href ? <ChevronRight className="w-5 h-5 text-slate-400" /> : null)}
    </>
  );
  const cls = "w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 text-left hover:bg-slate-50 active:bg-slate-100";
  if (href) return <Link href={href} onClick={onClick} className={cls}>{body}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${on ? "bg-emerald-600" : "bg-slate-200"}`}>
      <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

function Tile({ icon, label, href, onClick }: { icon: React.ReactNode; label: string; href?: string; onClick: () => void }) {
  const cls = "flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold active:scale-95 transition-transform";
  return href ? <Link href={href} onClick={onClick} className={cls}>{icon}{label}</Link> : <button onClick={onClick} className={cls}>{icon}{label}</button>;
}
