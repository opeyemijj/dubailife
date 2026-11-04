"use client";

// Outside the house (townhouses and villas): add a pool, garage, driveway, garden, BBQ or majlis. Used by the
// owner (paid from their balance) and by a decorator they hired (paid from the job's budget). Optional: a home
// doesn't need any of them.

import { X } from "lucide-react";
import { EXTERIOR } from "@/lib/furniture";

export function ExteriorSheet({ owned, onAdd, onRemove, onClose, payer, onHire }: {
  owned: string[];
  onAdd: (id: string, price: number, name: string) => void;
  onRemove?: (id: string, name: string) => void;
  onClose: () => void;
  /** Who pays: "your balance" or "the budget". */
  payer: string;
  /** Hand it to a decorator instead (owner only). */
  onHire?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[210] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Outside the house" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-black">🏡 Outside the house</p>
            <p className="text-xs text-slate-500">Optional. Paid from {payer}. Tap the view to see it round the house.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        {EXTERIOR.items.map((it) => {
          const have = owned.includes(it.id);
          return (
            <div key={it.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${have ? "bg-emerald-50" : "bg-slate-50"}`}>
              <span className="text-2xl">{it.icon}</span>
              <span className="flex-1 min-w-0"><span className="block font-black text-sm">{it.name}</span><span className="block text-[11px] text-slate-500">{it.desc}</span></span>
              {have ? (
                onRemove
                  ? <button onClick={() => onRemove(it.id, it.name)} className="h-9 px-3 rounded-full bg-white text-slate-600 text-xs font-black border border-slate-200">Remove</button>
                  : <span className="text-xs font-black text-emerald-700">✓ Added</span>
              ) : (
                <button onClick={() => onAdd(it.id, it.price, it.name)} className="h-9 px-3 rounded-full bg-emerald-600 text-white text-xs font-black whitespace-nowrap">Add · AED {it.price.toLocaleString()}</button>
              )}
            </div>
          );
        })}
        {onHire && (
          <button onClick={onHire} className="w-full h-11 rounded-2xl bg-slate-900 text-white text-sm font-black">🧑‍🎨 Have a decorator do it</button>
        )}
      </div>
    </div>
  );
}
