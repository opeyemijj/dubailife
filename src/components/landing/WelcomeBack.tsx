"use client";

// The front page for someone already signed in: their own home in 3D under the Dubai Life name, and one
// big Continue back into the city. Logging out and the official accounts sit underneath.

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { signOut, type Citizen } from "@/lib/citizenStore";
import { useLifeLoop } from "@/lib/lifeLoop";
import { getHousingTierFromText, HOUSING_CONFIGS, withHomeItems } from "@/lib/furniture";
import { SITE } from "@/lib/site";
import { gameAudio } from "@/utils/gameAudio";

// The 3D room is the heaviest part of the page, so it loads after the card is on screen.
const ApartmentRoom = dynamic(() => import("@/components/home/ApartmentRoom").then((m) => m.ApartmentRoom), { ssr: false, loading: () => null });

const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : n >= 1e4 ? `${Math.round(n / 1000)}k` : n.toLocaleString());

export function WelcomeBack({ citizen }: { citizen: Citizen }) {
  const router = useRouter();
  const life = useLifeLoop();
  const tier = getHousingTierFromText((life?.blueprint?.housing || citizen.home || "studio").toLowerCase());
  const style = citizen.homeStyle?.[tier] ?? (HOUSING_CONFIGS[tier] ?? HOUSING_CONFIGS.studio).finish;
  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "short" });

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 text-slate-900 select-none">
      {/* Your home, a little below the middle, behind everything. */}
      <div className="absolute inset-x-0 top-[14%] bottom-[24%] pointer-events-none">
        <ApartmentRoom housingTier={tier} furniture={withHomeItems(citizen.furniture ?? [], tier)} homeStyle={style} look={citizen.look} background="transparent" loadingLabel="Opening your home" />
      </div>

      <header className="relative z-10 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-192.png" alt="" width={64} height={64} className="mx-auto w-16 h-16 rounded-2xl shadow-lg" />
        <h1 className="mt-3 text-5xl sm:text-6xl font-black tracking-tight leading-none">Dubai Life</h1>
        <p className="mt-2 text-lg text-slate-600">Live your Dubai story.</p>
      </header>

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] p-4 space-y-3">
          <div className="flex items-center gap-3 p-2.5 rounded-[24px] bg-slate-50">
            <span className="w-14 h-14 rounded-full overflow-hidden bg-sky-100 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rosterThumb(presetFor(citizen.look ?? { gender: "woman" }))} alt="" className="w-full h-full object-cover object-top" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-semibold truncate">{citizen.username}</div>
              <div className="text-slate-500 truncate">{today} · AED {short(citizen.balance)}</div>
            </div>
          </div>
          <button
            onClick={() => { gameAudio.playClickSound(); router.push("/explore"); }}
            className="w-full h-16 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-2xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.22)] transition-all"
          >
            Continue
          </button>
          <div className="flex items-center justify-between px-1 text-[15px]">
            <span className="text-slate-500 truncate">Signed in as <strong className="text-slate-900">@{citizen.username}</strong></span>
            <button onClick={signOut} className="font-semibold text-sky-600 hover:underline shrink-0">Log out</button>
          </div>
        </div>

        <nav aria-label="Dubai Life on social media" className="mt-3 flex items-center justify-center gap-2">
          <Link href="/about" className="h-11 px-4 rounded-full bg-white/90 shadow flex items-center gap-1.5 font-semibold text-slate-700">
            <BadgeCheck className="w-5 h-5 text-emerald-600" /> Official
          </Link>
          {SITE.socials.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer me" aria-label={`Dubai Life on ${s.label === "𝕏" ? "X" : s.label}`}
              className="w-11 h-11 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-900">
              <SocialIcon label={s.label} />
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}

function SocialIcon({ label }: { label: string }) {
  if (label === "Instagram") {
    return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  }
  if (label === "LinkedIn") return <span className="font-black text-lg leading-none" aria-hidden>in</span>;
  if (label === "TikTok") {
    return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z" /></svg>;
}
