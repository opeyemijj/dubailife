"use client";

// A Space is live: everyone on the map or at home sees it and can join in one tap, without opening the phone first.

import { usePathname } from "next/navigation";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { useCitizen } from "@/lib/citizenStore";
import { joinSpace, useSpacesStore } from "@/lib/spaces";
import { gameAudio } from "@/utils/gameAudio";

export function LiveSpaceBanner() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const { rooms, activeSpaceId } = useSpacesStore();
  if (!citizen?.id || activeSpaceId || !/^\/(explore|home)\b/.test(path)) return null;
  const live = rooms.filter((r) => r.hostId !== citizen.id);
  const room = [...live].sort((a, b) => b.participants.length - a.participants.length)[0];
  if (!room) return null;
  const join = () => {
    gameAudio.playClickSound();
    if (joinSpace(room.id).ok) openPhone("spaces");
  };
  return (
    <button onClick={join} className="fixed left-3 top-[calc(env(safe-area-inset-top)+11.5rem)] z-[58] max-w-[min(320px,calc(100vw-1.5rem))] flex items-center gap-2 h-11 pl-3 pr-4 rounded-full bg-rose-600 text-white shadow-xl text-sm font-black">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
      <span className="truncate">Live: {room.title}</span>
      <span className="shrink-0 text-xs text-white/85">{live.length > 1 ? `+${live.length - 1} more · ` : ""}Join ›</span>
    </button>
  );
}
