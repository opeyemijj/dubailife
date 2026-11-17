"use client";

// Choosing a car's colour: the factory colour first, then the paint chart (cars.json → paints). Used at the
// dealership (free, when you buy) and at the paint shop in Phone → Cars (a respray, RESPRAY_COST).

import { PAINTS, paintName } from "@/lib/cars";

export function PaintPicker({ factory, value, onChange, size = "md" }: {
  /** The car's own colour, offered as "Factory". */ factory: string;
  /** The chosen paint (null: factory). */ value: string | null;
  onChange: (hex: string | null) => void;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const swatch = (hex: string, label: string, chosen: boolean, pick: () => void) => (
    <button key={label} type="button" onClick={pick} aria-label={label} aria-pressed={chosen} title={label}
      className={`shrink-0 ${dot} rounded-full border border-black/10 shadow-inner transition-transform ${chosen ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "hover:scale-105"}`}
      style={{ background: hex }} />
  );
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Colour</p>
        <p className="text-xs font-bold text-slate-600 truncate">{value ? paintName(value) : "Factory colour"}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto py-1.5 px-1 -mx-1 [scrollbar-width:none]">
        {swatch(factory, "Factory colour", value === null, () => onChange(null))}
        <span className="shrink-0 w-px bg-slate-200 mx-0.5" aria-hidden />
        {PAINTS.filter((p) => p.hex.toLowerCase() !== factory.toLowerCase()).map((p) => swatch(p.hex, p.name, value?.toLowerCase() === p.hex.toLowerCase(), () => onChange(p.hex)))}
      </div>
    </div>
  );
}
