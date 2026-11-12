"use client";

// The middle-right bar used in homes (and anywhere else with lots of buttons): round icon buttons stacked
// vertically, and a popover that opens to their left. Keeps the screen clear (user, 2026-11-04).

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { useScreenBusy } from "@/lib/popups";

// ---------------------------------------------------------------- the tap gesture

const TAP = "dubai:tap";
/** Shows the tap gesture (a ripple and a finger) where the screen was touched. */
export const showTap = (x: number, y: number) => window.dispatchEvent(new CustomEvent(TAP, { detail: { x, y } }));

/** Mounted once (app layout): draws the tap gestures. */
export function TapLayer() {
  const [taps, setTaps] = useState<Array<{ id: number; x: number; y: number }>>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const id = ++n;
      setTaps((t) => [...t, { id, x, y }]);
      setTimeout(() => setTaps((t) => t.filter((k) => k.id !== id)), 650);
    };
    window.addEventListener(TAP, on);
    return () => window.removeEventListener(TAP, on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden>
      {taps.map((t) => (
        <span key={t.id} className="absolute" style={{ left: t.x, top: t.y }}>
          <span className="absolute -left-6 -top-6 w-12 h-12 rounded-full border-4 border-white/90 bg-white/30 animate-[dl-tap_0.6s_ease-out_forwards]" />
          <span className="absolute -left-3 -top-1 text-2xl animate-[dl-finger_0.6s_ease-out_forwards]">👆</span>
        </span>
      ))}
      <style>{`@keyframes dl-tap{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.6);opacity:0}}@keyframes dl-finger{0%{transform:translateY(8px) scale(1.1);opacity:1}60%{transform:translateY(0) scale(.95);opacity:1}100%{opacity:0}}`}</style>
    </div>
  );
}

/**
 * For a menu that should close itself once something in it is tapped: shows the tap, then calls `close` a moment
 * later. Items that open something living inside the menu (mark them `data-keep-menu`) leave it open.
 */
export function tapThenClose(close: () => void, delay = 380) {
  return (e: MouseEvent) => {
    const el = e.target as HTMLElement;
    if (!el.closest("button, a, [role=button]")) return;
    showTap(e.clientX, e.clientY);
    if (el.closest("[data-keep-menu]")) return;
    setTimeout(close, delay);
  };
}

/** Floating items to the left of the bar (pills, no panel), closing once one is tapped. */
export function FloatMenu({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  // Open: popups that open by themselves wait until it's closed (lib/popups).
  useScreenBusy(true);
  return (
    <>
      <button aria-label={`Close ${label}`} className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div role="menu" aria-label={label} onClickCapture={tapThenClose(onClose)}
        className="fixed right-[5.25rem] top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 max-h-[74dvh] overflow-y-auto pointer-events-auto pr-1 py-1">
        {children}
      </div>
    </>
  );
}

export function SideBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto ${className}`}>
      {children}
    </div>
  );
}

export function SideButton({ icon, label, onClick, active, badge, tone = "light" }: {
  icon: ReactNode; label: string; onClick: () => void; active?: boolean; badge?: number; tone?: "light" | "dark" | "party";
}) {
  const base = tone === "dark" ? "bg-slate-900 text-white" : tone === "party" ? "bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white" : "bg-white/95 text-slate-800";
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={active}
      className={`relative w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-lg active:scale-90 transition-transform ${active ? "bg-emerald-600 text-white ring-2 ring-white" : base}`}>
      {icon}
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

/** A panel that opens to the left of the bar. Tapping outside closes it. */
export function SidePopover({ title, onClose, children, dark }: { title: string; onClose: () => void; children: ReactNode; dark?: boolean }) {
  // Open: popups that open by themselves wait until it's closed (lib/popups).
  useScreenBusy(true);
  return (
    <>
      <button aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div role="dialog" aria-label={title} onClickCapture={tapThenClose(onClose)}
        className={`fixed right-[4.25rem] top-1/2 -translate-y-1/2 z-40 w-[min(17.5rem,calc(100vw-5.5rem))] max-h-[min(75dvh,34rem)] overflow-y-auto rounded-3xl shadow-2xl p-3 pointer-events-auto ${dark ? "bg-slate-950/95 text-white" : "bg-white text-slate-900"}`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-sm font-black">{title}</p>
          <button onClick={onClose} aria-label={`Close ${title}`} className={`w-7 h-7 rounded-full flex items-center justify-center ${dark ? "bg-white/10" : "bg-slate-100"}`}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1.5">{children}</div>
      </div>
    </>
  );
}

export type ViewMode = "above" | "inside" | "eye" | "boat";
const VIEWS: Record<ViewMode, { icon: string; label: string }> = {
  above: { icon: "🏠", label: "Above" }, inside: { icon: "👤", label: "Inside" }, eye: { icon: "👁️", label: "Eyes" }, boat: { icon: "🛥️", label: "Boat" },
};
/** One button for the views: shows the one you're in; each tap moves to the next (Above → Inside → Eyes …). */
export function ViewCycle({ view, views = ["above", "inside", "eye"], onChange, big }: { view: ViewMode; views?: ViewMode[]; onChange: (v: ViewMode) => void; big?: boolean }) {
  const next = views[(views.indexOf(view) + 1) % views.length];
  const v = VIEWS[view];
  return (
    <button onClick={(e) => { showTap(e.clientX, e.clientY); onChange(next); }} aria-label={`${v.label} view. Tap for ${VIEWS[next].label}`} title={`Tap for ${VIEWS[next].label} view`}
      className={`relative ${big ? "w-14 h-14 rounded-[18px] text-[10px]" : "w-11 h-11 rounded-full text-[9px]"} bg-white/95 text-slate-800 shadow-xl flex flex-col items-center justify-center font-black active:scale-90 transition-transform`}>
      <span className={big ? "text-xl leading-none" : "text-base leading-none"}>{v.icon}</span>{v.label}
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center ring-2 ring-white">↻</span>
    </button>
  );
}
