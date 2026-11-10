"use client";

// "Contractions have started!": once a day before the due date, an alert to both parents (once per baby on this
// device), sending the mother to the delivery suite at Latifa Hospital (or Dubai Hospital) and the father to
// be with her. The baby is still born on time if nobody goes.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { useFamily, type Child } from "@/lib/love";
import { expecting, labourOpensAt } from "@/components/arcade/games/maternity/Clinic";
import { phoneRing } from "@/components/transit/transitAudio";

const SEEN = "dl_labour_seen";

export function LabourAlert() {
  const { citizen } = useCitizen();
  const family = useFamily(citizen?.id);
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const me = citizen?.id;

  useEffect(() => {
    const check = () => {
      const c = expecting(family?.children, me);
      if (!c || Date.now() < labourOpensAt(c)) return;
      let seen: number[] = [];
      try { seen = JSON.parse(sessionStorage.getItem(SEEN) ?? "[]"); } catch { /* storage blocked */ }
      if (seen.includes(c.id)) return;
      try { sessionStorage.setItem(SEEN, JSON.stringify([...seen, c.id])); } catch { /* storage blocked */ }
      phoneRing();
      setChild(c);
    };
    const first = setTimeout(check, 2500);
    const every = setInterval(check, 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [family, me]);

  if (!child) return null;
  const mother = child.mother.id === me;
  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[210] flex justify-center">
      <div className="w-full max-w-md rounded-[24px] bg-white text-slate-900 shadow-2xl overflow-hidden">
        <div className="bg-pink-600 text-white px-4 py-2 text-sm font-black">👶 Contractions have started!</div>
        <div className="p-4 space-y-1">
          <p className="font-black leading-tight">{mother ? "It's time. Head to the delivery suite." : `@${child.mother.username} is in labour. Be there with her.`}</p>
          <p className="text-sm text-slate-600">Latifa Women and Children Hospital in Bur Dubai, or Dubai Hospital in Deira.</p>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => setChild(null)} className="flex-1 h-11 rounded-full bg-slate-100 font-black text-slate-700">Later</button>
          <button onClick={() => { setChild(null); router.push("/place/latifa-hospital"); }} className="flex-1 h-11 rounded-full bg-pink-600 text-white font-black">Go to the hospital</button>
        </div>
      </div>
    </div>
  );
}
