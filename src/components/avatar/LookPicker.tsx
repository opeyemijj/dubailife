"use client";

// Pick a face (the citizen) and, separately, an outfit (any same-gender citizen's clothes).
// Used in onboarding and on the profile.

import { Check } from "lucide-react";
import { presetFor, rosterFor, rosterThumb, type AvatarLookProps } from "./roster";

export function LookPicker({ look, onChange, dark = false }: { look: AvatarLookProps; onChange: (look: AvatarLookProps) => void; dark?: boolean }) {
  const face = presetFor(look);
  const wear = look.wear ?? face;
  const label = dark ? "text-white/60" : "text-slate-500";
  const tile = (active: boolean) => `relative rounded-2xl overflow-hidden border-2 bg-slate-800 transition-all ${active ? "border-emerald-500 ring-2 ring-emerald-500/30" : dark ? "border-transparent hover:border-white/30" : "border-transparent hover:border-slate-300"}`;
  const tick = <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>;
  const people = rosterFor(look.gender);
  return (
    <div className="space-y-4">
      <div>
        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${label}`}>Face</div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {people.map((r) => {
            const active = !look.custom && face === r.id;
            return (
              <button key={r.id} onClick={() => onChange({ ...look, preset: r.id, custom: undefined, wear: look.wear === r.id ? undefined : look.wear })} className={tile(active)} aria-label={`Face: ${r.label}`}>
                {/* Head and shoulders only */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(r.id)} alt="" className="w-full aspect-square object-cover object-[50%_8%] scale-[1.9] origin-top" loading="lazy" />
                {active && tick}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${label}`}>Outfit</div>
        <p className={`text-[11px] mb-2 ${dark ? "text-white/40" : "text-slate-400"}`}>Change clothes any time — your face stays the same.</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {people.map((r) => {
            const active = !look.custom && wear === r.id;
            return (
              <button key={r.id} onClick={() => onChange({ ...look, custom: undefined, wear: r.id === face ? undefined : r.id })} className={tile(active)} aria-label={`Outfit: ${r.label}`}>
                {/* The clothes, not the face */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(r.id)} alt="" className="w-full aspect-[3/4] object-cover object-[50%_75%]" loading="lazy" />
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] font-bold px-1.5 pt-4 pb-1 leading-tight">{r.label}</span>
                {active && tick}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
