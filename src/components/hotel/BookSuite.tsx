"use client";

// Booking a luxury suite at a hotel: pick the suite and the nights, pay, then check in at the front desk and go up
// to your room (src/app/hotel/[stayId]).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { refreshCitizen, useCitizen } from "@/lib/citizenStore";
import { HOTELS, bookHotel } from "@/lib/hotels";
import { useScreenBusy } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";

const aed = (n: number) => `AED ${n.toLocaleString()}`;

export function BookSuite({ placeId, hotel, onClose }: { placeId: string; hotel: string; onClose: () => void }) {
  useScreenBusy(true);
  const router = useRouter();
  const { citizen } = useCitizen();
  const [suite, setSuite] = useState(HOTELS.suites[0].id);
  const [nights, setNights] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = HOTELS.suites.find((s) => s.id === suite)!;
  const total = chosen.perNight * nights;
  const balance = citizen?.balance ?? 0;

  const book = async () => {
    setBusy(true); setError(null); gameAudio.playClickSound();
    const r = await bookHotel(placeId, hotel, suite, nights);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't book."); return; }
    gameAudio.playCoinSound();
    void refreshCitizen();
    onClose();
    router.push(`/hotel/${r.data}`);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Book a suite at ${hotel}`}>
        <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-2xl">
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <div className="pr-8">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">🏨 {hotel}</p>
            <h2 className="text-2xl font-black leading-tight">Book a luxury suite</h2>
            <p className="text-sm text-slate-600">Every suite has a king bed, a jacuzzi on the terrace, a spa room and a gaming lounge. Check in and it&apos;s yours to live in.</p>
          </div>
          <div className="space-y-2">
            {HOTELS.suites.map((s) => (
              <button key={s.id} onClick={() => setSuite(s.id)} className={`w-full rounded-2xl p-3 text-left border-2 ${suite === s.id ? "border-amber-400 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="flex-1 font-black">{s.name}</span>
                  <span className="font-black text-amber-700 text-sm">{aed(s.perNight)}<span className="text-[10px] text-slate-500 font-bold"> /night</span></span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{s.blurb}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">{s.perks.map((p) => <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 flex items-center gap-0.5"><Check className="w-2.5 h-2.5 text-emerald-600" />{p}</span>)}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Nights</p>
            {HOTELS.nights.map((n) => <button key={n} onClick={() => setNights(n)} className={`w-11 h-10 rounded-xl font-black text-sm ${nights === n ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{n}</button>)}
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">{nights} night{nights === 1 ? "" : "s"} · {chosen.name}</span>
            <span className="font-black">{aed(total)}</span>
          </div>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <button onClick={() => void book()} disabled={busy || total > balance} className="w-full h-12 rounded-2xl bg-amber-500 text-slate-950 font-black disabled:opacity-50">
            {busy ? "Booking…" : total > balance ? `You need ${aed(total)}` : `Pay ${aed(total)} & check in`}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
