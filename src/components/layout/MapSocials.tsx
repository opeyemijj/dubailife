"use client";

// Follow us, on the map: a small row with the game's accounts (all @dubailifeapp), just above the bottom bar.

import { SITE } from "@/lib/site";

export function MapSocials() {
  return (
    <div className="absolute right-3 sm:right-6 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] z-20 pointer-events-auto">
      <div className="flex items-center gap-2 h-7 pl-2.5 pr-3 rounded-full bg-white/85 backdrop-blur-md border border-white shadow-md text-[10px] font-bold text-slate-500">
        <span className="hidden min-[360px]:inline">Follow @dubailifeapp</span>
        {SITE.socials.map((s) => (
          <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer me" className="text-slate-700 hover:text-slate-950">{s.label}</a>
        ))}
      </div>
    </div>
  );
}
