"use client";

// The middle-right bar used in homes (and anywhere else with lots of buttons): round icon buttons stacked
// vertically, and a popover that opens to their left. Keeps the screen clear (user, 2026-11-04).

import type { ReactNode } from "react";
import { X } from "lucide-react";

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
  return (
    <>
      <button aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div role="dialog" aria-label={title}
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
