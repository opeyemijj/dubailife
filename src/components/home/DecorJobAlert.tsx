"use client";

// For players working as interior decorators: an alert when someone hires you (you have a little while to
// pick up their key before a Local takes the job), opening the Decor app.

import { useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { useServices } from "@/lib/cityServices";
import { decorJobsForMe, studioOf, type DecorRequest } from "@/lib/decorator";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { phoneRing } from "@/components/transit/transitAudio";

const SEEN = "dl_decor_seen";

export function DecorJobAlert() {
  const { citizen } = useCitizen();
  const svc = useServices(citizen?.id);
  const [job, setJob] = useState<DecorRequest | null>(null);
  const on = svc?.service === "decorator";
  useEffect(() => {
    if (!on) return;
    const check = async () => {
      const r = await decorJobsForMe();
      let seen: number[] = [];
      try { seen = JSON.parse(sessionStorage.getItem(SEEN) ?? "[]"); } catch { /* storage blocked */ }
      const next = (r.data ?? []).find((j) => j.status === "requested" && !seen.includes(j.id));
      if (next) {
        try { sessionStorage.setItem(SEEN, JSON.stringify([...seen, next.id])); } catch { /* storage blocked */ }
        phoneRing();
        setJob(next);
      }
    };
    const first = setTimeout(() => void check(), 3000);
    const every = setInterval(() => void check(), 30000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [on]);

  if (!job) return null;
  const s = studioOf(job.studio);
  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[210] flex justify-center">
      <div className="w-full max-w-md rounded-[24px] bg-white text-slate-900 shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-2 text-sm font-black">🧑‍🎨 New decorating job</div>
        <div className="p-4 space-y-1">
          <p className="font-black leading-tight">@{job.client} wants a {s?.icon} {s?.title ?? "new"} home</p>
          <p className="text-sm text-slate-600">Fee AED {job.fee.toLocaleString()}. Pick up their key soon, or a Local takes the job.</p>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => setJob(null)} className="flex-1 h-11 rounded-full bg-slate-100 font-black text-slate-700">Later</button>
          <button onClick={() => { setJob(null); openPhone("decor"); }} className="flex-1 h-11 rounded-full bg-emerald-600 text-white font-black">Open Decor</button>
        </div>
      </div>
    </div>
  );
}
