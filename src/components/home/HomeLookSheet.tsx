"use client";

// The look of a home: floor, wall paint, panelling and bed sheets. Used where the home is shared (living together,
// or a guest allowed to decorate), so whoever changes it changes it for everyone.

import { X } from "lucide-react";
import { BEDDING, FLOOR_FINISHES, PANELS_PRICE, WALL_PAINTS, type HomeStyle } from "@/lib/furniture";

export function HomeLookSheet({ style, onChange, onClose }: {
  style: HomeStyle;
  /** A change and its price (paid by whoever makes it). */
  onChange: (change: Partial<HomeStyle>, price: number, label: string) => void;
  onClose: () => void;
}) {
  const bedding = style.bedding ?? BEDDING[0].color;
  return (
    <div className="fixed inset-0 z-[210] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Floors, walls and bedding" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black">🎨 Floors, walls &amp; bedding</p>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">🛏️ Bed sheets</h4>
          <div className="grid grid-cols-4 gap-1.5">
            {BEDDING.map((b) => {
              const on = bedding.toLowerCase() === b.color.toLowerCase();
              return (
                <button key={b.id} disabled={on} onClick={() => onChange({ bedding: b.color }, b.price, `New sheets: ${b.label}`)} className={`rounded-xl border p-1.5 text-left disabled:opacity-100 ${on ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}>
                  <span className="block h-7 rounded-lg border border-black/5" style={{ background: b.color }} />
                  <span className="block text-[10px] font-black mt-1 leading-tight">{b.label}</span>
                  <span className="text-[9px] font-mono text-emerald-600">{on ? "✓" : b.price ? `AED ${b.price}` : "Free"}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">🪵 Floor</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {FLOOR_FINISHES.map((f) => {
              const on = style.floor === f.id;
              return (
                <button key={f.id} disabled={on} onClick={() => onChange({ floor: f.id }, f.price, `New floor: ${f.label}`)} className={`rounded-xl border p-2 text-left ${on ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                  <span className="block text-xs font-black">{f.label}</span>
                  <span className="text-[10px] font-mono text-emerald-600">{on ? "In the home" : f.price ? `AED ${f.price.toLocaleString()}` : "Free"}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">🎨 Walls</h4>
          <div className="grid grid-cols-4 gap-1.5">
            {WALL_PAINTS.map((w) => {
              const on = style.wall.toLowerCase() === w.color.toLowerCase();
              return (
                <button key={w.id} disabled={on} onClick={() => onChange({ wall: w.color }, w.price, `Walls painted ${w.label}`)} className={`rounded-xl border p-1.5 ${on ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}>
                  <span className="block h-7 rounded-lg border border-black/5" style={{ background: w.color }} />
                  <span className="block text-[10px] font-black mt-1 leading-tight">{w.label}</span>
                </button>
              );
            })}
          </div>
        </section>
        <button onClick={() => onChange({ panels: !style.panels }, style.panels ? 0 : PANELS_PRICE, style.panels ? "Panelling removed" : "Walls panelled")}
          className="w-full rounded-2xl border border-slate-200 p-3 text-left">
          <span className="block text-xs font-black">🏛️ {style.panels ? "Remove the panelled walls" : "Panelled walls & cove lighting"}</span>
          <span className="text-[11px] font-mono text-emerald-600">{style.panels ? "Free" : `AED ${PANELS_PRICE.toLocaleString()}`}</span>
        </button>
      </div>
    </div>
  );
}
