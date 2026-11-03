"use client";

// The phone, from anywhere: a floating button on pages without their own (a venue, a place, a journey), with
// how many messages are unread. Steps aside for a clean screen.

import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { useUnreadTotal } from "@/lib/unread";
import { usePhoneButtonsShown } from "@/lib/phoneButtons";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";

export function PhoneFab() {
  const { citizen } = useCitizen();
  const unread = useUnreadTotal(citizen?.id);
  const others = usePhoneButtonsShown();
  const pathname = usePathname();
  if (!citizen?.id || others > 0 || pathname.startsWith("/admin")) return null;
  return (
    <button
      onClick={() => { gameAudio.playClickSound(); openPhone(); }}
      aria-label={unread ? `Phone: ${unread} unread` : "Phone"}
      title="Phone"
      className="dl-hide-clean fixed right-3 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-950/90 text-white shadow-xl border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
    >
      <Smartphone className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
