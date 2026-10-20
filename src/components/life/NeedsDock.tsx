"use client";

// The needs dock: your face and six mini meters. Tapping it opens the life panel (needs, goals,
// skills, people, career). Light on the home screen, dark in the top bar over the map.

import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { DEFAULT_NEEDS, useCitizen, type NeedKey } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import { openLife } from "./LifeHub";

const METERS: Array<[NeedKey, string]> = [["hunger", "🍩"], ["energy", "⚡"], ["fun", "🎉"], ["social", "💬"], ["hygiene", "🧼"], ["bladder", "🚽"]];

/** Green when fine, amber when getting low, red when urgent. */
const tone = (v: number) => (v >= 50 ? "bg-emerald-500" : v >= 25 ? "bg-amber-400" : "bg-rose-500");

export function NeedsDock({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { citizen } = useCitizen();
  const needs = { ...DEFAULT_NEEDS, ...citizen?.needs };
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openLife("needs"); }}
      aria-label="Your needs, goals and skills"
      className={`flex items-center gap-2 p-1 sm:p-1.5 pr-2.5 sm:pr-3.5 rounded-full shadow-lg active:scale-[0.97] transition-all text-left backdrop-blur-xl ${dark ? "bg-zinc-950/80 hover:bg-zinc-900 border border-white/15" : "bg-white/95 hover:bg-white border border-white shadow-2xl"} ${className}`}
    >
      <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-emerald-500 overflow-hidden shrink-0 ${dark ? "bg-zinc-800" : "bg-slate-100"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rosterThumb(presetFor(citizen?.look ?? { gender: "woman" }))} alt="" className="w-full h-full object-cover object-top" />
      </span>
      <span className="grid grid-cols-3 gap-x-1.5 sm:gap-x-2.5 gap-y-1 text-[8px] sm:text-[9px] leading-none">
        {METERS.map(([k, icon]) => (
          <span key={k} className="flex items-center gap-0.5 sm:gap-1">
            <span>{icon}</span>
            <span className={`w-5 sm:w-10 h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/15" : "bg-slate-200"}`}>
              <span className={`block h-full rounded-full ${tone(needs[k])}`} style={{ width: `${needs[k]}%` }} />
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}
