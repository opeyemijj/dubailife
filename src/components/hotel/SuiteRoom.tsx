"use client";

// Inside your hotel suite, in 3D: the home's room engine (ApartmentRoom, the 1-bedroom layout in marble and gold)
// with the suite's own pieces (SuiteExtras: terrace jacuzzi, spa corner and steam room, gaming lounge, minibar).
// Walk round with the stick; each thing to do moves the camera there, plays it out, and tops up your needs
// (src/data/hotels/suites.json). Room service arrives at the door (charged to you).

import { useRef, useState } from "react";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { MoveStick } from "@/components/street/StreetWorld";
import { SUITE_SPOTS, SuiteExtras } from "./SuiteExtras";
import { HOTELS, type SuiteActivity } from "@/lib/hotels";
import { boostNeed, type NeedKey } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";

const SPOT: Record<string, [number, number]> = {
  sleep: SUITE_SPOTS.bed, jacuzzi: SUITE_SPOTS.jacuzzi, massage: SUITE_SPOTS.massage, steam: SUITE_SPOTS.steam,
  games: SUITE_SPOTS.games, minibar: SUITE_SPOTS.minibar,
};
/** Where you stand or sit for each (beside the massage table rather than inside it, in the jacuzzi's middle). */
const STAND_AT: Record<string, [number, number]> = {
  sleep: [SUITE_SPOTS.bed[0], SUITE_SPOTS.bed[1] + 0.2], jacuzzi: SUITE_SPOTS.jacuzzi, massage: SUITE_SPOTS.massage,
  steam: SUITE_SPOTS.steam, games: [SUITE_SPOTS.games[0] + 0.75, SUITE_SPOTS.games[1]], minibar: [SUITE_SPOTS.minibar[0] + 0.7, SUITE_SPOTS.minibar[1]],
};
/** The avatar while doing it (there's no drinking clip: a chatty sip). */
const ANIM: Record<string, AvatarAnimation> = { sleep: "sleep", sit: "sit", drink: "talk" };

export function SuiteRoom({ look, suite, onToast }: { look?: AvatarLookProps; suite: string; onToast: (t: string) => void }) {
  const stick = useRef<{ x: number; y: number; sprint?: boolean }>({ x: 0, y: 0 });
  const [doing, setDoing] = useState<string | null>(null);
  // From above (the whole suite at once, like a dollhouse) or inside, over your shoulder.
  const [view, setView] = useState<"above" | "inside">("above");
  const [focus, setFocus] = useState<{ n: number; at: [number, number] } | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sleeping is in the bed itself (the room engine walks you there and lays you down); everything else gets you up.
  const [seat, setSeat] = useState<{ n: number; sit: boolean; on: "chair" | "bed" } | undefined>(undefined);
  const inBed = useRef(false);
  const gold = suite !== "deluxe";

  const run = (a: SuiteActivity) => {
    gameAudio.playClickSound();
    if (timer.current) clearTimeout(timer.current);
    setDoing(a.id);
    setFocus((f) => ({ n: (f?.n ?? 0) + 1, at: SPOT[a.id] ?? [0, 0] }));
    if (a.id === "sleep") { setSeat((s) => ({ n: (s?.n ?? 0) + 1, sit: true, on: "bed" })); inBed.current = true; }
    else if (inBed.current) { setSeat((s) => ({ n: (s?.n ?? 0) + 1, sit: false, on: "bed" })); inBed.current = false; }
    boostNeed(a.need as NeedKey, a.amount);
    const also = (a as SuiteActivity & { also?: { need: string; amount: number } }).also;
    if (also) boostNeed(also.need as NeedKey, also.amount);
    onToast(`${a.icon} ${a.label}: +${a.amount} ${a.need}${also ? `, +${also.amount} ${also.need}` : ""}`);
    timer.current = setTimeout(() => setDoing(null), 8000);
  };
  const current = HOTELS.activities.find((a) => a.id === doing);

  return (
    <div className="fixed inset-0">
      <ApartmentRoom
        housingTier="one_bedroom"
        view={view}
        look={look}
        homeStyle={{ floor: gold ? "black-marble" : "white-marble", wall: gold ? "#2a2520" : "#f5f1ea", panels: true, ceiling: "coffered", bedding: "#f8fafc" }}
        extras={<SuiteExtras active={doing} gold={gold} />}
        stick={stick}
        focus={focus}
        goTo={focus && doing !== "sleep" ? { n: focus.n, at: STAND_AT[doing ?? ""] ?? focus.at } : undefined}
        seatCall={seat}
        myAnimation={current && current.id !== "sleep" ? ANIM[current.animation] : undefined}
        loadingLabel="Going up to your suite…"
      />
      {view === "inside" && (
        <div className="absolute left-4 bottom-[max(7.5rem,calc(env(safe-area-inset-bottom)+7rem))] z-30">
          <MoveStick controls={stick} allowRun={false} />
        </div>
      )}
      <button onClick={() => setView(view === "above" ? "inside" : "above")}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 h-11 px-4 rounded-full bg-slate-950/85 text-white text-xs font-black shadow-lg">
        {view === "above" ? "🚶 Walk inside" : "🏠 See the whole suite"}
      </button>
      <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto max-w-xl flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {HOTELS.activities.map((a) => (
            <button key={a.id} onClick={() => run(a)}
              className={`shrink-0 rounded-2xl px-3 py-2 text-left shadow-lg ${doing === a.id ? "bg-amber-400 text-slate-950" : "bg-white/95 text-slate-900"}`}>
              <span className="block text-xl leading-none">{a.icon}</span>
              <span className="block text-xs font-black mt-1 whitespace-nowrap">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
