"use client";

// Lets residents answer knocks wherever they are in the app.

import { askForPush } from "@/lib/push/engage";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { respondEntry } from "@/lib/city/flats";

interface Knock { id: string; flat_id: string; visitor_name: string; note: string | null }

export function KnockListener() {
  const { citizen } = useCitizen();
  const [knocks, setKnocks] = useState<Knock[]>([]);

  useEffect(() => {
    if (!citizen) return;
    // Pending knocks from before this page loaded.
    supabase().from("entry_requests").select("id, flat_id, visitor_name, note").eq("status", "pending").neq("visitor_id", citizen.id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .then(({ data }) => data && setKnocks(data as Knock[]));
    // Row-level security only delivers knocks on homes this citizen lives in.
    const channel = supabase()
      .channel(`knocks-${citizen.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "entry_requests" }, (payload) => {
        const k = payload.new as Knock & { status: string; visitor_id: string };
        if (k.status === "pending" && k.visitor_id !== citizen.id) {
          setKnocks((list) => [...list.filter((x) => x.id !== k.id), k]);
          setTimeout(() => askForPush({ icon: "🚪", title: "Someone's at your door", text: "Turn on notifications so you hear every knock, even when the app is closed." }), 6000);
        }
      })
      .subscribe();
    return () => { supabase().removeChannel(channel); };
  }, [citizen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!knocks.length) return null;
  const answer = async (k: Knock, approve: boolean) => {
    setKnocks((list) => list.filter((x) => x.id !== k.id));
    await respondEntry(k.id, approve);
  };
  return (
    <div className="fixed bottom-24 right-3 z-[100] space-y-2 w-[300px] max-w-[92vw]">
      {knocks.map((k) => (
        <div key={k.id} className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-3">
          <div className="text-sm font-black">✊ {k.visitor_name} is knocking</div>
          <div className="text-[11px] text-slate-500">at {k.flat_id.split(":")[0].replace(/-/g, " ")} · {k.flat_id.split(":")[1]}{k.note ? ` — “${k.note}”` : ""}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => answer(k, true)} className="flex-1 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black">Let in</button>
            <button onClick={() => answer(k, false)} className="flex-1 py-1.5 rounded-xl bg-slate-100 text-xs font-bold">Not now</button>
          </div>
        </div>
      ))}
    </div>
  );
}
