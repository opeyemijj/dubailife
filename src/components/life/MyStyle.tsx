"use client";

// The equipped season title (and Plus) under your name in the life panel. Tap to open the Season tab.

import { useEffect, useState } from "react";
import { cosmeticName, mySeason } from "@/lib/seasons";

export function MyStyle({ onOpen }: { onOpen: () => void }) {
  const [style, setStyle] = useState<{ title: string | null; plus: boolean } | null>(null);
  useEffect(() => {
    void mySeason().then((s) => s && setStyle({ title: s.cosmetics.find((c) => c.equipped && c.id.startsWith("title:"))?.id ?? null, plus: s.plus }));
  }, []);
  if (!style || (!style.title && !style.plus)) return null;
  return (
    <button onClick={onOpen} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      {style.plus && <span>✨ Plus</span>}{style.plus && style.title && <span>·</span>}{style.title && <span>🏷️ {cosmeticName(style.title).name}</span>}
    </button>
  );
}
