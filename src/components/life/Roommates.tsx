"use client";

// Your roommates (design spec 20.1): players sharing your bed space, matched by the server.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isBlockedError } from "@/lib/safety";

interface Mate { id: string; username: string; name: string; lastActive: string | null; friend: boolean }

export function Roommates({ me, onClose }: { me: string; onClose: () => void }) {
  const [mates, setMates] = useState<Mate[] | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());
  useEffect(() => { void supabase().rpc("my_roommates").then(({ data }) => setMates((data as Mate[]) ?? [])); }, []);
  if (!mates || mates.length === 0) return null;

  const add = async (m: Mate) => {
    const { error } = await supabase().from("friendships").insert({ user_id: me, friend_id: m.id });
    if (!error || /duplicate/.test(error.message)) setAsked(new Set([...asked, m.id]));
    else if (isBlockedError(error)) window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "You can't add them." }));
  };
  const seen = (iso: string | null) => {
    if (!iso) return "new";
    const d = Math.floor((now - Date.parse(iso)) / 86_400_000);
    return d <= 0 ? "played today" : d === 1 ? "played yesterday" : `played ${d} days ago`;
  };

  return (
    <section className="pt-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">🛏️ Your roommates · {mates.length}</h3>
      <div className="space-y-2">
        {mates.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-3xl bg-amber-50 p-3">
            <div className="flex-1 min-w-0"><div className="font-bold truncate">{m.name}</div><div className="text-xs text-slate-500 truncate">@{m.username} · {seen(m.lastActive)}</div></div>
            {m.friend ? <Link href="/phone" onClick={onClose} className="text-[11px] font-black px-3 py-1.5 rounded-full bg-white">Message</Link>
              : asked.has(m.id) ? <span className="text-[11px] font-bold text-emerald-700">Request sent</span>
              : <button onClick={() => add(m)} className="text-[11px] font-black px-3 py-1.5 rounded-full bg-slate-900 text-white">Add friend</button>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5">You share a bed space. Move out in your Blueprint to leave.</p>
    </section>
  );
}
