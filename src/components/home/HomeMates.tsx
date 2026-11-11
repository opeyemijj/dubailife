"use client";

// Who else is home (your partner, family, guests in the home's live room) when they're not where you can see
// them: on another floor ("@maryam is upstairs" · Go up), or, for the person you live with, not in right now.

import type { Peer } from "@/lib/room";

export function HomeMates({ peers, level, onGo, partner, className = "" }: {
  peers: Peer[];
  level: number;
  /** Go to that floor. */
  onGo: (level: number) => void;
  /** The person I live with: said when they're not home. */
  partner?: { id: string; username?: string } | null;
  className?: string;
}) {
  const elsewhere = peers.filter((p) => (p.level ?? 0) !== level);
  const partnerHome = !partner || peers.some((p) => p.userId === partner.id);
  if (!elsewhere.length && partnerHome) return null;
  const floor = (l: number) => (l > level ? "upstairs" : "downstairs");
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-1.5 max-w-[92vw] pointer-events-none ${className}`}>
      {elsewhere.map((p) => (
        <button key={p.userId} data-level={p.level ?? 0} onClick={(e) => onGo(Number(e.currentTarget.dataset.level))}
          className="pointer-events-auto h-8 pl-3 pr-1 rounded-full bg-slate-950/85 text-white text-[11px] font-black flex items-center gap-1.5 shadow-lg">
          @{p.username} is {floor(p.level ?? 0)}
          <span className="h-6 px-2.5 rounded-full bg-amber-400 text-slate-950 flex items-center">{(p.level ?? 0) > level ? "⬆️ Go up" : "⬇️ Go down"}</span>
        </button>
      ))}
      {!partnerHome && partner && (
        <span className="h-8 px-3 rounded-full bg-white/90 text-slate-700 text-[11px] font-bold flex items-center shadow">
          🏠 @{partner.username ?? "your partner"} isn&apos;t home right now
        </span>
      )}
    </div>
  );
}
