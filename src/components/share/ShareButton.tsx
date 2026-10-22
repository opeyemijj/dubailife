"use client";

import { Share2 } from "lucide-react";
import type { MomentId } from "@/lib/share/moments";
import { shareMoment } from "@/lib/share/share";
import { gameAudio } from "@/utils/gameAudio";

/** "Share" for a story moment (visa, licence, graduation, scam, league…). */
export function ShareButton({ moment, text, v, l, className = "", label = "Share" }: { moment: MomentId; text: string; v?: number; l?: string; className?: string; label?: string }) {
  return (
    <button onClick={() => { gameAudio.playClickSound(); void shareMoment(moment, text, { v, l }); }}
      className={`inline-flex items-center justify-center gap-2 font-black ${className || "h-11 px-5 rounded-2xl bg-sky-500 text-white text-sm"}`}>
      <Share2 className="w-4 h-4" /> {label}
    </button>
  );
}
