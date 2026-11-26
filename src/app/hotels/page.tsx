"use client";

// Hotels: every hotel on the map, each with its luxury suites to book (BookSuite), and your current stay at the top.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { BookSuite } from "@/components/hotel/BookSuite";
import { hotelsIn, HOTELS, myStay, suiteOf, timeLeft, type Stay } from "@/lib/hotels";
import { CITIES } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";

export default function HotelsPage() {
  useRequireCitizen();
  const [stay, setStay] = useState<Stay | null>(null);
  const [q, setQ] = useState("");
  const [booking, setBooking] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => { void myStay().then((r) => setStay(r.data ?? null)); }, []);
  // The hotels of the city you're in (you book a hotel where it is: public.hotel_stay_in_city).
  const { city } = useCurrentCity();
  const shown = hotelsIn(city).filter((h) => !q.trim() || `${h.name} ${h.blurb}`.toLowerCase().includes(q.trim().toLowerCase()));
  const from = Math.min(...HOTELS.suites.map((s) => s.perNight));

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-amber-500/25 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href={CITIES[city].path} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black leading-tight">Hotels</h1>
            <p className="text-xs text-white/60">Luxury suites from AED {from.toLocaleString()} a night</p>
          </div>
        </header>

        {stay && (
          <Link href={`/hotel/${stay.id}`} className="block rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-300 text-slate-950 p-4">
            <p className="text-xs font-black uppercase tracking-widest">Your stay</p>
            <p className="text-lg font-black">{suiteOf(stay.suite)?.icon} {suiteOf(stay.suite)?.name}</p>
            <p className="text-sm font-semibold">{stay.hotel_name} · room {stay.room} · {timeLeft(stay)}</p>
            <p className="mt-2 font-black">{stay.status === "booked" ? "Check in ›" : "Go up to your suite ›"}</p>
          </Link>
        )}

        <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-1.5">
          <p className="font-black">Every suite has</p>
          <p className="text-sm text-white/75">🛏️ a king bed · 🛁 a jacuzzi on the terrace · 💆 a spa room with massage and steam · 🎮 a gaming lounge · 🍾 a minibar · 🛎️ room service</p>
        </section>

        <label className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10">
          <Search className="w-4 h-4 text-white/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hotels" className="flex-1 bg-transparent outline-none text-sm font-semibold placeholder:text-white/40" />
        </label>

        <div className="space-y-2">
          {shown.map((h) => (
            <div key={h.id} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 flex items-center gap-3">
              <span className="text-2xl">🏨</span>
              <div className="flex-1 min-w-0">
                <p className="font-black truncate">{h.name}</p>
                <p className="text-xs text-white/60 line-clamp-2">{h.blurb}</p>
              </div>
              <button onClick={() => setBooking({ id: h.id, name: h.name })} disabled={!!stay}
                className="h-9 px-3 shrink-0 rounded-full bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-40">Book</button>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm text-white/60 text-center py-6">No hotel matches “{q}”.</p>}
        </div>
      </div>
      {booking && <BookSuite placeId={booking.id} hotel={booking.name} onClose={() => setBooking(null)} />}
      <BottomNav />
    </main>
  );
}
