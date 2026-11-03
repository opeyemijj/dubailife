"use client";

// On the map or at home while a party you're going to (or hosting) is on: one tap back in. Guests don't have to find
// the place and travel again; the host goes home.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { kindOf, myInvites, partyDoor, type InviteRow } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

export function BackToParty() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const router = useRouter();
  const [live, setLive] = useState<{ row: InviteRow; hosting: boolean } | null>(null);
  const here = /^\/(explore|home)\b/.test(path);
  useEffect(() => {
    if (!citizen?.id || !here) return;
    let alive = true;
    const load = async () => {
      const r = await myInvites();
      const now = Date.now();
      const on = (x: InviteRow) => !!x.route && Date.parse(x.startsAt) <= now && Date.parse(x.endsAt) > now;
      const mine = r.hosting.find(on);
      const going = r.invited.find((x) => x.status === "going" && on(x));
      if (alive) setLive(going ? { row: going, hosting: false } : mine ? { row: mine, hosting: true } : null);
    };
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => { alive = false; clearTimeout(first); clearInterval(every); };
  }, [citizen?.id, here]);

  // The host is already at their party when they're home.
  if (!live || !here || (live.hosting && path.startsWith("/home") && live.row.route?.startsWith("/property/"))) return null;
  const k = kindOf(live.row.kind);
  const go = () => {
    gameAudio.playClickSound();
    router.push(live.hosting && live.row.route?.startsWith("/property/") ? "/home" : partyDoor(live.row.route!));
  };
  return (
    <button onClick={go} className="fixed right-3 top-[calc(env(safe-area-inset-top)+7.5rem)] z-[58] max-w-[min(260px,calc(100vw-1.5rem))] flex items-center gap-2 h-11 pl-3 pr-4 rounded-full bg-fuchsia-600 text-white shadow-xl text-sm font-black">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
      <span className="truncate">{k.icon} Back to {live.row.title}</span>
    </button>
  );
}
