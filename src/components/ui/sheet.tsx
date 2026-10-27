"use client";

// The white bottom sheet used over the map on phones (a centred card on wider screens): a grab handle,
// an icon, a title and subtitle, a close button and a scrolling body. The map stays visible above it.

import { useEffect } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "./modal-portal";

export function Sheet({ icon, title, subtitle, onClose, children, footer, dim = false, z = "z-[180]" }: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  /** Pinned under the scrolling body (e.g. the Go button). */
  footer?: React.ReactNode;
  /** Darken the map behind; off by default so you still see where you are. */
  dim?: boolean;
  z?: string;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${z} flex items-end sm:items-center justify-center sm:p-6`}>
        <div className={`absolute inset-0 ${dim ? "bg-slate-950/50" : "bg-slate-950/10 sm:bg-slate-950/40"}`} onClick={onClose} aria-hidden />
        <div role="dialog" aria-modal="true" className="relative w-full sm:max-w-lg bg-white text-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-12px_40px_rgba(15,23,42,0.25)] max-h-[72dvh] sm:max-h-[85vh] flex flex-col animate-[sheetUp_0.25s_ease-out]">
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" aria-hidden />
          <div className="flex items-center gap-3 px-5 pt-3 sm:pt-5 pb-3">
            {icon && <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-3xl shrink-0">{icon}</span>}
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-2xl leading-tight tracking-tight">{title}</h2>
              {subtitle && <p className="text-[15px] text-slate-500 truncate">{subtitle}</p>}
            </div>
            {onClose && <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0" aria-label="Close"><X className="w-6 h-6" /></button>}
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-4 space-y-4">{children}</div>
          {footer && <div className="px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100">{footer}</div>}
          {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
        </div>
      </div>
    </ModalPortal>
  );
}

/** A soft grey chip, like the activities in a venue sheet. */
export function SheetChip({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  const cls = `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[15px] text-left ${active ? "bg-sky-50 ring-2 ring-sky-500 text-slate-900" : "bg-slate-100 text-slate-700"}`;
  return onClick ? <button onClick={onClick} className={`${cls} hover:bg-slate-200 active:scale-95 transition-transform`}>{children}</button> : <span className={cls}>{children}</span>;
}
