"use client";

// "Loading map… 88%": shown while buildings coming into view are still being drawn and their pictures
// (ads, billboards) are still downloading. Hidden for blips shorter than a third of a second.

import { useEffect, useState } from "react";

export function MapLoadProgress({ rootRef, drawing }: { rootRef: React.RefObject<HTMLElement | null>; drawing: boolean }) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    let since = 0;
    const id = setInterval(() => {
      const imgs = rootRef.current ? [...rootRef.current.querySelectorAll("img")] : [];
      const done = imgs.filter((i) => i.complete).length;
      const busy = drawing || done < imgs.length;
      if (!busy) { since = 0; setPct(null); return; }
      since ||= Date.now();
      if (Date.now() - since < 350) return;
      // Drawing counts as the last tenth, so the number keeps moving while buildings appear.
      const share = imgs.length ? done / imgs.length : 1;
      setPct(Math.min(99, Math.round(share * (drawing ? 90 : 100))));
    }, 200);
    return () => clearInterval(id);
  }, [rootRef, drawing]);

  if (pct === null) return null;
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className="px-6 h-14 rounded-full bg-white/95 shadow-xl flex items-center text-lg font-semibold text-slate-700 tabular-nums">
        Loading map… {pct}%
      </div>
    </div>
  );
}
