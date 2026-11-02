"use client";

// Tapping a school in Academic City: what it is and what you can study there, then a button to go in.

import { useRouter } from "next/navigation";
import { GraduationCap, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { getCampus, getCoursesByCampus } from "@/lib/city/academic";

export function CampusCard({ campusId, name, onClose }: { campusId?: string; name: string; onClose: () => void }) {
  const router = useRouter();
  const campus = campusId ? getCampus(campusId) : undefined;
  const courses = campusId ? getCoursesByCampus(campusId) : [];
  const driving = campusId === "driving";
  const route = driving ? "/driving" : campusId ? `/academics/${campusId}` : "/academics";
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[160] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={name} onClick={onClose}>
        <div className="relative w-full max-w-md bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-3 pr-10">
            <span className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl shrink-0">{campus?.crestIcon ?? (driving ? "🚗" : "🎓")}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-black leading-tight">{campus?.name ?? name}</h2>
              {campus?.badge && <p className="text-xs font-bold text-slate-500">{campus.badge}</p>}
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{campus?.description ?? campus?.tagline ?? (driving ? "Pass the eye test, theory and parking to get your license, then drive your own car around Dubai." : "Study in Academic City to unlock better jobs and better visas.")}</p>
          {courses.length > 0 && (
            <ul className="space-y-1">
              {courses.slice(0, 4).map((c) => <li key={c.id} className="text-sm font-bold flex gap-2"><GraduationCap className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />{c.title}</li>)}
              {courses.length > 4 && <li className="text-xs text-slate-500 pl-6">and {courses.length - 4} more</li>}
            </ul>
          )}
          <button onClick={() => { onClose(); router.push(route); }} className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black">Go to {campus?.shortName ?? name} ›</button>
          {campus && campusId !== "onebrain" && <p className="text-[10px] text-center text-slate-400">The courses and certificates here are part of the game, not offered by or affiliated with this school.</p>}
        </div>
      </div>
    </ModalPortal>
  );
}
