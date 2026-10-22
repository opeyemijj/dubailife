"use client";

// Life after the Golden Visa (design spec 19.4, US-5.5): the Hall of Residents and newcomers to mentor.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Hall { count: number; residents: Array<{ username: string; name: string }> }
interface Newcomer { id: string; username: string; name: string; visa: string }

export function GoldenLife({ me }: { me: string }) {
  const [hall, setHall] = useState<Hall | null>(null);
  const [mentees, setMentees] = useState<Newcomer[]>([]);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  useEffect(() => {
    void supabase().rpc("hall_of_residents").then(({ data }) => data && setHall(data as Hall));
    void supabase().rpc("mentor_matches").then(({ data }) => setMentees((data as Newcomer[]) ?? []));
  }, []);

  const befriend = async (n: Newcomer) => {
    const { error } = await supabase().from("friendships").insert({ user_id: me, friend_id: n.id });
    if (!error || /duplicate/.test(error.message)) setAsked(new Set([...asked, n.id]));
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-50 border border-amber-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🌟</span>
        <div className="flex-1"><p className="font-black">Life after Golden</p><p className="text-xs text-amber-900/70">New goals for residents who made it</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/ventures" className="rounded-2xl bg-white p-3 text-sm font-bold">🏢 Grow a venture empire</Link>
        <Link href="/explore" className="rounded-2xl bg-white p-3 text-sm font-bold">🏙️ Build a property portfolio</Link>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-amber-900/70 mb-1.5">Mentor a newcomer</p>
        {mentees.length === 0 ? <p className="text-xs text-amber-900/70">No new arrivals right now. Check back later.</p>
          : mentees.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 mb-1">
              <span className="flex-1 text-sm"><b>{n.name}</b> <span className="text-slate-500">@{n.username} · {n.visa.toLowerCase()} visa</span></span>
              {asked.has(n.id) ? <span className="text-[11px] font-bold text-emerald-700">Request sent</span>
                : <button onClick={() => befriend(n)} className="text-[11px] font-black px-3 py-1.5 rounded-full bg-slate-900 text-white">Say hello</button>}
            </div>
          ))}
      </div>
      {hall && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-900/70 mb-1.5">Hall of Residents · {hall.count}</p>
          <div className="flex flex-wrap gap-1.5">{hall.residents.map((r) => <span key={r.username} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white">🌟 @{r.username}</span>)}</div>
        </div>
      )}
    </section>
  );
}
