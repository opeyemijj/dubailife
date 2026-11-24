"use client";

// 📸 Snap: photographs the 3D scene on screen (with a camera flash), then offers to post it to the City.

import { useState } from "react";
import { Camera } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { getPlace } from "@/lib/city/places";
import { takeSnap, type Snap } from "@/lib/snap";
import { PostComposer } from "@/components/social/PostComposer";
import { gameAudio } from "@/utils/gameAudio";

export function SnapButton({ className = "", place: placeOverride, placeName: nameOverride }: { className?: string; place?: string | null; placeName?: string | null }) {
  const { citizen } = useCitizen();
  const [flash, setFlash] = useState(false);
  const [snap, setSnap] = useState<Snap | null>(null);
  const shoot = async () => {
    const placeId = placeOverride ?? citizen?.location?.placeId ?? null;
    const name = nameOverride ?? (placeId ? getPlace(placeId)?.name ?? null : null);
    gameAudio.playClickSound();
    setFlash(true);
    setTimeout(() => setFlash(false), 220);
    const s = await takeSnap(placeId, name);
    if (s) setSnap(s);
  };
  return (
    <>
      <button onClick={() => void shoot()} aria-label="Snap a photo to post"
        className={`w-12 h-12 rounded-full bg-white/95 text-slate-900 shadow-xl flex items-center justify-center active:scale-90 transition-transform ${className}`}>
        <Camera className="w-5 h-5" />
      </button>
      {flash && <div className="fixed inset-0 z-[250] bg-white pointer-events-none animate-[ping_0.25s_ease-out_1]" style={{ opacity: 0.8 }} />}
      {snap && <PostComposer snap={snap} onClose={() => setSnap(null)} />}
    </>
  );
}
