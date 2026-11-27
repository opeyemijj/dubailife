"use client";

// The column of round icon buttons on the right of the map, together and centred top to bottom: Search and (in Abu Dhabi) the
// Passport (components/map/CityMapScreen), the goal (components/goals/NextStep), then the daily Vault, an expiring
// visa, a health or police alert and a live event (components/layout/BottomNav MapRail). Each is one icon with a
// badge, so the map stays clear; tapping it opens what it's about. The map's own buttons (places, the hotspot) come
// last in the same column (components/map/MapSideBar).

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The column itself: one box on the right edge, centred top to bottom, that every button drops into (in order), so
 *  they always sit together however many there are. Made once, on the first button. */
function railColumn(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById("map-rail");
  if (!el) {
    el = document.createElement("div");
    el.id = "map-rail";
    el.setAttribute("style", [
      "position:fixed", "right:0.4rem", "top:50%", "transform:translateY(-50%)", "z-index:58",
      "display:flex", "flex-direction:column", "align-items:flex-end", "gap:0.5rem",
      // Too many to fit (a small phone): the column scrolls rather than running off the screen.
      "max-height:calc(100dvh - 9rem)", "overflow-y:auto", "overflow-x:visible", "scrollbar-width:none",
      "padding:0.5rem 0.35rem 0.5rem 0.6rem", "pointer-events:none",
    ].join(";"));
    document.body.appendChild(el);
  }
  return el;
}

const noSubscribe = () => () => {};

/** Puts something in the column at its place (`order`: lower is higher up). */
export function RailSlot({ order, children }: { order: number; children: ReactNode }) {
  // The page's column (made on first use; none while rendering on the server).
  const col = useSyncExternalStore(noSubscribe, railColumn, () => null);
  if (!col) return null;
  return createPortal(<div style={{ order, pointerEvents: "auto" }}>{children}</div>, col);
}

/** Order in the column for the map's own buttons (places, the hotspot): after the rest. */
export const RAIL_LAST = 50;



/** The goal's slot on this map page: after Search, and after the Passport on Abu Dhabi's map. */
export const goalSlot = (path: string) => (/^\/abu-dhabi\/?$/.test(path) ? 2 : 1);

/** One round button in the column: an icon, a badge in its corner, a glow when it wants you. */
export function RailButton({ n, icon, badge, label, tone = "bg-white text-slate-900", alert = false, onClick }: {
  n: number; icon: ReactNode; badge?: string | null; label: string; tone?: string; alert?: boolean; onClick: () => void;
}) {
  return (
    <RailSlot order={n}>
    <button onClick={onClick} aria-label={label} title={label}
      className={`relative w-12 h-12 rounded-full shadow-xl border border-white/70 flex items-center justify-center text-2xl active:scale-90 transition-transform pointer-events-auto ${tone} ${alert ? "ring-4 ring-amber-300/70 animate-pulse" : ""}`}>
      <span className="leading-none">{icon}</span>
      {badge && (
        <span className="absolute -top-1 -left-1.5 min-w-[22px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white tabular-nums">{badge}</span>
      )}
    </button>
    </RailSlot>
  );
}
