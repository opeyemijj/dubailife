"use client";

// Gets people to the race: when you're signed up and it starts within 15 minutes (or is on), a banner on
// every page takes you to the start line; the day before, the map nudges you to sign up.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { MARATHON, phaseOf, raceClock, serverNow, useMarathon } from "@/lib/marathon";

const NUDGE_KEY = "dubai_marathon_nudge";

export function MarathonBanner() {
  const { citizen } = useCitizen();
  const o = useMarathon(citizen?.id);
  const router = useRouter();
  const pathname = usePathname();
  const [now, setNow] = useState(() => serverNow());
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(serverNow()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setTimeout(() => { try { setHidden(sessionStorage.getItem(NUDGE_KEY)); } catch { /* storage off */ } }, 0); return () => clearTimeout(t); }, []);

  if (!o || !citizen || pathname.startsWith("/marathon")) return null;
  const phase = phaseOf(o, now);
  const left = Date.parse(o.race) - now;
  const running = !!o.me && !o.me.finishMs && (phase === "soon" || phase === "live");
  const nudge = !o.me && phase === "open" && left < 86_400_000 && pathname === "/explore" && hidden !== o.race;
  if (!running && !nudge) return null;

  return (
    <div className="fixed top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] inset-x-0 z-[150] px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto flex items-center gap-3 p-2.5 pl-3 rounded-[24px] bg-emerald-700 text-white shadow-xl">
        <span className="text-3xl">🏅</span>
        <div className="flex-1 min-w-0">
          <p className="font-black leading-tight truncate">{running ? (phase === "live" ? "The marathon is on!" : `Marathon starts in ${raceClock(left)}`) : `${MARATHON.name} tomorrow`}</p>
          <p className="text-xs text-emerald-100 truncate">{running ? `Bib #${o.me!.bib} · head to the start line` : `${o.entrants} running · free · win AED ${MARATHON.prizes[0].toLocaleString()}`}</p>
        </div>
        <button onClick={() => router.push("/marathon")} className="h-10 px-4 rounded-full bg-white text-emerald-800 font-black shrink-0">{running ? "Go" : "Sign up"}</button>
        {nudge && <button onClick={() => { try { sessionStorage.setItem(NUDGE_KEY, o.race); } catch { /* storage off */ } setHidden(o.race); }} aria-label="Not now" className="w-7 h-7 rounded-full text-emerald-100">✕</button>}
      </div>
    </div>
  );
}
