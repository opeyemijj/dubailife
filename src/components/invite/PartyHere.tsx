"use client";

// A party on where you are: its decorations (for the 3D room), a banner with who's here and an invite button, and
// checking you in when you arrive as a guest.

import { useEffect, useState } from "react";
import Link from "next/link";
import { arriveAt, partyHere, shareInvite, kindOf, type PartyHere } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

export function usePartyHere(route: string | null, arrive: boolean): PartyHere | null {
  const [party, setParty] = useState<PartyHere | null>(null);
  useEffect(() => {
    if (!route) return;
    let live = true;
    let checkedIn = false;
    const load = async () => {
      const p = await partyHere(route);
      if (!live) return;
      setParty(p);
      if (p && arrive && !p.isHost && !checkedIn) {
        checkedIn = true;
        const r = await arriveAt(route);
        if (r && live) {
          gameAudio.playCoinSound();
          window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🎉 You're at @${r.host}'s ${r.title}!${r.points ? ` +${r.points} points` : ""}` }));
          setParty(await partyHere(route));
        }
      }
    };
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => { live = false; clearTimeout(first); clearInterval(every); };
  }, [route, arrive]);
  return party;
}

export function PartyBanner({ party, className = "" }: { party: PartyHere; className?: string }) {
  const [copied, setCopied] = useState(false);
  const k = kindOf(party.kind);
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-xl pl-3 pr-1 py-1 max-w-[94vw] ${className}`}>
      <Link href={`/i/${party.code}`} className="min-w-0 flex-1 text-xs font-black truncate">
        {k.icon} {party.isHost ? "Your" : `@${party.host}'s`} {party.title} · {party.arrived} here
      </Link>
      <button
        onClick={async () => { const r = await shareInvite(party.code, `Come to ${party.title} on Dubai Life!`); setCopied(r === "copied"); }}
        className="shrink-0 h-7 px-3 rounded-full bg-white text-fuchsia-700 text-[11px] font-black"
      >
        {copied ? "Copied!" : "Invite"}
      </button>
    </div>
  );
}
