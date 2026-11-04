"use client";

// A Space is live: everyone on the map or at home sees it and can join in one tap, without opening the phone first.

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { partyDoor } from "@/lib/invites";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { useCitizen } from "@/lib/citizenStore";
import { joinSpace, useSpacesStore } from "@/lib/spaces";
import { gameAudio } from "@/utils/gameAudio";

// Spaces you closed this banner for: never shown again (on this device).
const HIDDEN = "dl_hidden_spaces";
const readHidden = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN) ?? "[]"); } catch { return []; } };

export function LiveSpaceBanner() {
  const [hidden, setHidden] = useState<string[]>(() => (typeof window === "undefined" ? [] : readHidden()));
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const { rooms, activeSpaceId } = useSpacesStore();
  const router = useRouter();
  if (!citizen?.id || activeSpaceId || !/^\/(explore|home)\b/.test(path)) return null;
  const live = rooms.filter((r) => r.hostId !== citizen.id && !hidden.includes(r.id));
  const room = [...live].sort((a, b) => b.participants.length - a.participants.length)[0];
  if (!room) return null;
  const join = () => {
    gameAudio.playClickSound();
    // A party's Space: go to the party (you join its Space there).
    if (room.partyRoute) { router.push(room.partyHost === citizen.username && room.partyRoute.startsWith("/property/") ? "/home" : partyDoor(room.partyRoute)); return; }
    if (joinSpace(room.id).ok) openPhone("spaces");
  };
  const close = () => {
    const next = [...new Set([...hidden, room.id])].slice(-100);
    setHidden(next);
    try { localStorage.setItem(HIDDEN, JSON.stringify(next)); } catch { /* storage blocked */ }
  };
  return (
    <div className="fixed left-3 top-[calc(env(safe-area-inset-top)+11.5rem)] z-[58] max-w-[min(340px,calc(100vw-1.5rem))] flex items-center h-11 rounded-full bg-rose-600 text-white shadow-xl text-sm font-black">
      <button onClick={join} className="flex items-center gap-2 h-full pl-3 pr-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
        <span className="truncate">Live: {room.title}</span>
        <span className="shrink-0 text-xs text-white/85">{live.length > 1 ? `+${live.length - 1} more · ` : ""}Join ›</span>
      </button>
      <button onClick={close} aria-label={`Hide ${room.title}`} className="w-9 h-9 mr-1 shrink-0 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="w-4 h-4" /></button>
    </div>
  );
}
