"use client";

// RTA fines as they're issued: a parking inspector's ticket (not paying, or parked outside the bay) turns up
// a few minutes after you've walked away from the car. Checks every 30 seconds while you're signed in (which
// also charges any fine that has just come due), and shows each new one once.

import { useCallback, useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { aed, myFines, seenFines, type Fine } from "@/lib/cars";
import { openPhone } from "@/components/layout/PhoneOverlay";

const ICON: Record<Fine["kind"], string> = { speeding: "📸", parking_unpaid: "🅿️", bad_parking: "🚧" };

export function FineNotice() {
  const { citizen } = useCitizen();
  const [fresh, setFresh] = useState<Fine[]>([]);
  const check = useCallback(async () => {
    const { data } = await myFines();
    if (data) setFresh(data.filter((f) => !f.seen));
  }, []);
  useEffect(() => {
    if (!citizen?.id) return;
    const first = setTimeout(() => void check(), 4000);
    const every = setInterval(() => void check(), 30000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [citizen?.id, check]);

  const f = fresh[0];
  if (!f) return null;
  const done = (open: boolean) => {
    void seenFines([f.id]);
    setFresh((x) => x.slice(1));
    if (open) openPhone("cars");
  };
  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[210] flex justify-center animate-[sheetUp_0.25s_ease-out]">
      <div className="w-full max-w-md rounded-[24px] bg-white shadow-2xl overflow-hidden text-slate-900">
        <div className="bg-rose-600 text-white px-4 py-2 flex items-center gap-2 text-sm font-black">🚨 Dubai RTA · Fine issued</div>
        <div className="p-4 flex items-start gap-3">
          <span className="text-3xl">{ICON[f.kind]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg leading-tight">{aed(f.amount)}</p>
            <p className="text-sm text-slate-600">{f.reason}{f.place ? ` at ${f.place}` : ""}.</p>
            <p className="text-xs text-slate-400">{new Date(f.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {f.paid >= f.amount ? "paid from your wallet" : f.paid > 0 ? `${aed(f.paid)} paid, the rest waived` : "couldn't be taken: your wallet is empty"}</p>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => done(true)} className="flex-1 h-11 rounded-full bg-slate-100 font-black text-slate-700">My fines</button>
          <button onClick={() => done(false)} className="flex-1 h-11 rounded-full bg-rose-600 text-white font-black">OK</button>
        </div>
      </div>
    </div>
  );
}
