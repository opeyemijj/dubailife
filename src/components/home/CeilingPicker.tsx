"use client";

// Choosing the ceiling: its design and its paint (src/data/home/ceilings.json). Seen overhead in the Inside and Eye
// views. Used by the decoration catalogue (the owner) and the look sheet (a shared home).

import { CEILING_FINISHES, CEILING_PAINTS, DEFAULT_CEILING_COLOR, type CeilingFinish, type HomeStyle } from "@/lib/furniture";

/** A little picture of each design, as seen looking up. */
function swatch(finish: CeilingFinish, color: string): React.CSSProperties {
  switch (finish) {
    case "tray": return { background: `linear-gradient(${color},${color}) center/62% 62% no-repeat, radial-gradient(circle, #ffd9a0 0 55%, transparent 56%) center/70% 70% no-repeat, ${color}`, boxShadow: "inset 0 0 0 5px rgba(0,0,0,0.08)" };
    case "coffered": return { background: `repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 16px), repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 16px), ${color}` };
    case "beams": return { background: `repeating-linear-gradient(90deg, #5b3a24 0 5px, ${color} 5px 18px)` };
    case "arabesque": return { background: `radial-gradient(circle, transparent 0 6px, #c9a24a 6px 8px, transparent 8px 10px, #c9a24a 10px 11px, transparent 11px), ${color}` };
    case "stars": return { background: `radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 2px), radial-gradient(circle at 70% 20%, #fde68a 0 1px, transparent 2px), radial-gradient(circle at 45% 70%, #fff 0 1px, transparent 2px), radial-gradient(circle at 85% 75%, #fff 0 1px, transparent 2px), radial-gradient(circle at 10% 80%, #fff 0 1px, transparent 2px), ${color}` };
    default: return { background: `radial-gradient(circle at 25% 50%, #fffbeb 0 2px, transparent 3px), radial-gradient(circle at 75% 50%, #fffbeb 0 2px, transparent 3px), ${color}` };
  }
}

export function CeilingPicker({ style, onChange, formatPrice = (p) => (p ? `AED ${p.toLocaleString()}` : "Free") }: {
  style: HomeStyle;
  onChange: (change: Partial<HomeStyle>, price: number, label: string) => void;
  formatPrice?: (p: number) => string;
}) {
  const finish = style.ceiling ?? "flat";
  const color = style.ceilingColor ?? DEFAULT_CEILING_COLOR;
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-black text-slate-800">Ceiling</div>
        <p className="text-[11px] text-slate-500 leading-snug">See it overhead in the Inside and Eyes views. Chandeliers hang from it.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CEILING_FINISHES.map((f) => {
          const on = finish === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={on}
              onClick={() => onChange({ ceiling: f.id }, f.price, `Ceiling: ${f.label}`)}
              className={`p-2.5 rounded-2xl border text-left transition-all disabled:opacity-100 ${on ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-200" : "border-slate-200 hover:bg-slate-50 active:scale-95"}`}
              title={f.desc}
            >
              <span className="block h-8 rounded-lg mb-1.5 border border-black/5" style={swatch(f.id, color)} />
              <span className="block text-xs font-black text-slate-900 leading-tight truncate">{f.icon} {f.label}</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">{on ? "Overhead now" : formatPrice(f.price)}</span>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] font-black text-slate-600">Ceiling paint</div>
      <div className="grid grid-cols-4 gap-1.5">
        {CEILING_PAINTS.map((p) => {
          const on = color.toLowerCase() === p.color.toLowerCase();
          return (
            <button
              key={p.id}
              type="button"
              disabled={on}
              onClick={() => onChange({ ceilingColor: p.color }, p.price, `Ceiling painted ${p.label}`)}
              className={`rounded-xl border p-1.5 text-left disabled:opacity-100 ${on ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}
            >
              <span className="block h-7 rounded-lg border border-black/5" style={{ background: p.color }} />
              <span className="block text-[10px] font-black mt-1 leading-tight truncate">{p.label}</span>
              <span className="text-[9px] font-mono text-emerald-600">{on ? "✓" : formatPrice(p.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
