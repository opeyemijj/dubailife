"use client";

// What you can do at a party: free food and drinks (they fill your needs), dance, your phone (to chat and invite),
// and for the host, lights out (the
// room goes dark and the decorations glow) and getting everyone dancing. Both reach everyone in the room at once;
// the lights are also saved, for people who arrive later. Everyone sees a bubble when you do something.

import { useState } from "react";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { boostNeed } from "@/lib/citizenStore";
import { PARTIES, setPartyLights, type PartyHere } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

const A = PARTIES.actions;
type NeedKey = Parameters<typeof boostNeed>[0];

export function PartyActions({ party, lightsOut, onLights, onDance, announce, broadcast, className = "" }: {
  party: PartyHere;
  lightsOut: boolean;
  onLights: (out: boolean) => void;
  onDance: (seconds: number) => void;
  /** Tell the others in the room (a bubble over you). */
  announce: (text: string) => void;
  /** Tell everyone in the room right now (lights, dancing). */
  broadcast: (action: "lights" | "dance", on?: boolean) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const treat = (id: "food" | "drinks") => {
    const a = A[id];
    boostNeed(a.need as NeedKey, a.amount);
    gameAudio.playCoinSound();
    announce(a.say);
    setBusy(id);
    setTimeout(() => setBusy(null), 1500);
  };
  const dance = () => {
    boostNeed(A.dance.need as NeedKey, A.dance.amount);
    gameAudio.playClickSound();
    announce(A.dance.say);
    onDance(A.dance.seconds);
  };
  const lights = async () => {
    const out = !lightsOut;
    onLights(out);
    broadcast("lights", out);
    gameAudio.playClickSound();
    await setPartyLights(party.code, out);
  };
  const btn = "h-12 min-w-[4.25rem] px-2 rounded-2xl bg-white/95 text-slate-900 shadow-lg flex flex-col items-center justify-center text-[10px] font-black active:scale-95 transition-transform";
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 flex gap-1.5 ${className}`} role="toolbar" aria-label="Party actions">
      <button onClick={() => treat("food")} disabled={busy === "food"} className={btn}><span className="text-lg leading-none">{A.food.icon}</span>{busy === "food" ? "Yum!" : "Food"}</button>
      <button onClick={() => treat("drinks")} disabled={busy === "drinks"} className={btn}><span className="text-lg leading-none">{A.drinks.icon}</span>{busy === "drinks" ? "Cheers!" : "Drinks"}</button>
      <button onClick={dance} className={btn}><span className="text-lg leading-none">{A.dance.icon}</span>Dance</button>
      <button onClick={() => openPhone()} className={btn}><span className="text-lg leading-none">📱</span>Phone</button>
      {party.isHost && (
        <button onClick={() => { dance(); broadcast("dance"); }} className={btn}><span className="text-lg leading-none">🪩</span>Everyone</button>
      )}
      {party.isHost && (
        <button onClick={lights} className={`${btn} ${lightsOut ? "!bg-slate-900 !text-amber-300" : ""}`}>
          <span className="text-lg leading-none">{lightsOut ? "💡" : "🌙"}</span>{lightsOut ? "Lights on" : "Lights out"}
        </button>
      )}
    </div>
  );
}
