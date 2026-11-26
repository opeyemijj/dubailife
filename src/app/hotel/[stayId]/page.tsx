"use client";

// Your hotel stay: the front desk (check in, and your key card), then your suite in 3D (SuiteRoom) with room
// service and check-out. Booked from any hotel on the map, or from /hotels.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ConciergeBell, X } from "lucide-react";
import { boostNeed, refreshCitizen, useRequireCitizen, type NeedKey } from "@/lib/citizenStore";
import { HOTELS, checkIn, checkOut, roomService, stayById, suiteOf, timeLeft, type Stay } from "@/lib/hotels";
import { SuiteRoom } from "@/components/hotel/SuiteRoom";
import { gameAudio } from "@/utils/gameAudio";
import { cityOfPlace } from "@/lib/city/cities";
import { useCurrentCity } from "@/lib/city/presence";
import { AwayCard } from "@/components/city/CityGate";

export default function StayPage({ params }: { params: Promise<{ stayId: string }> }) {
  const { stayId } = use(params);
  const id = Number(stayId);
  const { citizen } = useRequireCitizen();
  const router = useRouter();
  const [stay, setStay] = useState<Stay | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const here = useCurrentCity();

  const load = useCallback(async () => { const r = await stayById(id); setStay(r.data ?? null); }, [id]);
  useEffect(() => { const t = setTimeout(() => void load(), 0); const tick = setInterval(() => setNow(Date.now()), 60_000); return () => { clearTimeout(t); clearInterval(tick); }; }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  if (stay === undefined) return <Lobby><p className="text-white/70">One moment…</p></Lobby>;
  // A stay in the other city: you check in (and sleep) where the hotel is.
  if (stay && here.ready && cityOfPlace(stay.place_id) !== here.city) return <AwayCard here={here.city} there={cityOfPlace(stay.place_id)} what={stay.hotel_name} />;
  if (stay === null) return <Lobby><p className="font-black">We couldn&apos;t find that booking.</p><Link href="/hotels" className="inline-block mt-3 h-11 leading-[2.75rem] px-5 rounded-full bg-amber-400 text-slate-950 font-black">Book a suite</Link></Lobby>;
  const suite = suiteOf(stay.suite);
  const over = stay.status === "checked_out" || Date.parse(stay.check_out_by) <= now;

  if (over) {
    return (
      <Lobby>
        <p className="text-4xl">🛎️</p>
        <p className="text-xl font-black">Thank you for staying at {stay.hotel_name}</p>
        <p className="text-sm text-white/70">Your {suite?.name ?? "suite"} stay has ended.</p>
        <Link href="/hotels" className="inline-block mt-3 h-11 leading-[2.75rem] px-5 rounded-full bg-amber-400 text-slate-950 font-black">Book another stay</Link>
      </Lobby>
    );
  }

  // The front desk: check in and get your key card.
  if (stay.status === "booked") {
    const doCheckIn = async () => {
      setBusy(true); gameAudio.playClickSound();
      const r = await checkIn(stay.id);
      setBusy(false);
      if (r.error) { setToast(r.error); return; }
      gameAudio.sfx("chime");
      void load();
    };
    return (
      <Lobby>
        <p className="text-xs font-black uppercase tracking-widest text-amber-300">Front desk · {stay.hotel_name}</p>
        <p className="text-2xl font-black leading-tight">Welcome, @{citizen?.username}</p>
        <p className="text-sm text-white/75">Your {suite?.icon} {suite?.name} is ready on floor {stay.room.slice(0, -2)}. {stay.nights} night{stay.nights === 1 ? "" : "s"}, paid in full.</p>
        <div className="mx-auto my-3 w-64 h-36 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-500 text-slate-900 p-4 text-left shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest">{stay.hotel_name}</p>
          <p className="mt-6 text-3xl font-black tracking-wider">ROOM {stay.room}</p>
          <p className="text-[11px] font-bold">{suite?.name}</p>
        </div>
        <button onClick={() => void doCheckIn()} disabled={busy} className="w-full h-12 rounded-2xl bg-amber-400 text-slate-950 font-black disabled:opacity-60">{busy ? "Checking in…" : "🔑 Check in & go up"}</button>
        {toast && <p className="text-sm font-bold text-rose-300">{toast}</p>}
      </Lobby>
    );
  }

  const order = async (item: (typeof HOTELS.roomService)[number]) => {
    setBusy(true);
    const r = await roomService(stay.id, item.id);
    setBusy(false);
    if (r.error) { setToast(r.error); return; }
    gameAudio.playCoinSound();
    boostNeed(item.need as NeedKey, item.amount);
    void refreshCitizen();
    setMenu(false);
    setToast(`${item.icon} ${item.name} is here. Enjoy! (+${item.amount} ${item.need})`);
  };
  const leave = async (andCheckOut: boolean) => {
    if (andCheckOut) {
      if (!window.confirm("Check out now? Nights you haven't used aren't refunded.")) return;
      await checkOut(stay.id);
    }
    router.push("/explore");
  };

  return (
    <main className="fixed inset-0 bg-slate-900">
      <SuiteRoom look={citizen?.look} suite={stay.suite} onToast={setToast} />
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 z-40 flex items-start gap-2">
        <button onClick={() => void leave(false)} aria-label="Leave the suite" className="w-10 h-10 shrink-0 rounded-full bg-slate-950/85 text-white flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0 rounded-2xl bg-slate-950/85 text-white px-3 py-1.5">
          <p className="text-sm font-black truncate">{suite?.icon} {suite?.name} · room {stay.room}</p>
          <p className="text-[11px] text-white/70 truncate">{stay.hotel_name} · {timeLeft(stay, now)}</p>
        </div>
        <button onClick={() => setMenu(true)} className="h-10 px-3 shrink-0 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1"><ConciergeBell className="w-4 h-4" /> Room service</button>
        <button onClick={() => void leave(true)} className="h-10 px-3 shrink-0 rounded-full bg-slate-950/85 text-white text-xs font-black">Check out</button>
      </div>
      {toast && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-950/90 text-white px-4 py-2 text-sm font-bold max-w-[92vw] text-center">{toast}</div>}
      {menu && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Room service">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenu(false)} aria-hidden />
          <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2">
            <button onClick={() => setMenu(false)} aria-label="Close" className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-black">🛎️ Room service</h2>
            <p className="text-sm text-slate-500">Brought to your door, charged to you.</p>
            {HOTELS.roomService.map((it) => (
              <button key={it.id} onClick={() => void order(it)} disabled={busy} className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 p-3 text-left disabled:opacity-60">
                <span className="text-2xl">{it.icon}</span>
                <span className="flex-1 font-bold text-sm">{it.name}<span className="block text-[11px] text-slate-500 font-semibold">+{it.amount} {it.need}</span></span>
                <span className="font-black text-sm">AED {it.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Lobby({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#2a2017] via-slate-950 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-2">{children}</div>
    </main>
  );
}
