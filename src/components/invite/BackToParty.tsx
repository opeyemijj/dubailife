"use client";

// On the map or at home while a party you're going to (or hosting) is on: one tap back in. Guests don't have to find
// the place and travel again; the host goes home.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { kindOf, myInvites, partyDoor, isPartyEnded, type InviteRow } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";
import { endPartyNow, primePartyAudio } from "./PartyHere";

// Ones you closed with ✕: never shown again (on this device).
const HIDDEN = "dl_hidden_back";
const readHidden = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN) ?? "[]"); } catch { return []; } };

export function BackToParty() {
  const [hidden, setHidden] = useState<string[]>(() => (typeof window === "undefined" ? [] : readHidden()));
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const router = useRouter();
  const [live, setLive] = useState<{ row: InviteRow; hosting: boolean } | null>(null);
  // Get party music ready to play from the first tap in the game.
  useEffect(() => { primePartyAudio(); }, []);
  const here = /^\/(explore|home)\b/.test(path);
  useEffect(() => {
    if (!citizen?.id || !here) return;
    let alive = true;
    const load = async () => {
      const r = await myInvites();
      const now = Date.now();
      const on = (x: InviteRow) => !!x.route && Date.parse(x.startsAt) <= now && Date.parse(x.endsAt) > now;
      const shown = (x: InviteRow) => on(x) && !readHidden().includes(x.code) && !isPartyEnded(x.code);
      const mine = r.hosting.find(shown);
      const going = r.invited.find((x) => x.status === "going" && shown(x));
      if (alive) setLive(going ? { row: going, hosting: false } : mine ? { row: mine, hosting: true } : null);
    };
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => { alive = false; clearTimeout(first); clearInterval(every); };
  }, [citizen?.id, here]);

  // The host is already at their party when they're home.
  if (!live || !here || hidden.includes(live.row.code) || (live.hosting && path.startsWith("/home") && live.row.route?.startsWith("/property/"))) return null;
  const k = kindOf(live.row.kind);
  const go = () => {
    gameAudio.playClickSound();
    router.push(live.hosting && live.row.route?.startsWith("/property/") ? "/home" : partyDoor(live.row.route!));
  };
  const close = async () => {
    // The host closing it ends the party (for everyone); a guest just hides it.
    if (live.hosting) {
      if (!confirm(`End your party "${live.row.title}" now? Everyone there is told.`)) return;
      if (!(await endPartyNow(live.row.code))) { window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "Couldn't end the party. Try again." })); return; }
      window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🎉 Party ended. Thanks for hosting!" }));
    }
    const next = [...new Set([...hidden, live.row.code])].slice(-100);
    setHidden(next);
    try { localStorage.setItem(HIDDEN, JSON.stringify(next)); } catch { /* storage blocked */ }
  };
  return (
    <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+7.5rem)] z-[58] max-w-[min(300px,calc(100vw-1.5rem))] flex items-center h-11 rounded-full bg-fuchsia-600 text-white shadow-xl text-sm font-black">
      <button onClick={go} className="flex items-center gap-2 h-full pl-3 pr-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
        <span className="truncate">{k.icon} Back to {live.row.title}</span>
      </button>
      <button onClick={close} aria-label={live.hosting ? `End your party: ${live.row.title}` : `Hide: back to ${live.row.title}`} className="w-9 h-9 mr-1 shrink-0 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="w-4 h-4" /></button>
    </div>
  );
}
