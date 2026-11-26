"use client";

// A visa application (/visa/qatar): pick the visa, say why you're going and where you'll stay, check your passport
// details, pay, and wait for the review; approved, your e-visa (its number and dates) lets you book the flight
// (lib/visas, public.apply_visa / my_visa). ?then= is where to go once you have it (the check-in counter).

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { refreshCitizen, useRequireCitizen } from "@/lib/citizenStore";
import { applyVisa, countryOf, myVisa, VISAS, type Visa, type VisaCountry } from "@/lib/visas";
import { hotelsIn } from "@/lib/hotels";
import type { CityId } from "@/lib/city/cities";
import { gameAudio } from "@/utils/gameAudio";

export default function VisaPage({ params }: { params: Promise<{ country: string }> }) {
  const { country: raw } = use(params);
  const country = (raw in VISAS.countries ? raw : "qatar") as VisaCountry;
  const c = countryOf(country);
  const { citizen } = useRequireCitizen();
  const router = useRouter();
  const then = useSearchParams().get("then");
  const [visa, setVisa] = useState<Visa | null | undefined>(undefined);
  const [kind, setKind] = useState(c.kinds[0].id);
  const [purpose, setPurpose] = useState(c.purposes[0]);
  const stays = useMemo(() => [...hotelsIn(c.city as CityId).map((h) => h.name), "With friends or family", "My own home there"], [c.city]);
  const [stay, setStay] = useState(stays[0]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { void myVisa(country).then(setVisa); }, [country]);
  // While it's under review: a live countdown, then ask again (the server approves it once the review is done).
  useEffect(() => {
    if (visa?.status !== "review") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    const ready = Date.parse(visa.ready_at) - Date.now();
    const ask = setTimeout(() => void myVisa(country).then((v) => { setVisa(v); if (v?.status === "approved") gameAudio.sfx?.("chime"); }), Math.max(1000, ready + 800));
    return () => { clearInterval(t); clearTimeout(ask); };
  }, [visa, country]);

  const chosen = c.kinds.find((k) => k.id === kind)!;
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await applyVisa(country, kind, purpose, stay);
    setBusy(false);
    if (r.error || !r.data) { setError(r.error ?? "Couldn't send the application."); return; }
    gameAudio.playCoinSound();
    void refreshCitizen();
    setVisa(r.data);
  };
  const left = visa?.status === "review" ? Math.max(0, Math.ceil((Date.parse(visa.ready_at) - now) / 1000)) : 0;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#5b0f26] via-slate-950 to-slate-950 text-white pb-16">
      <div className="max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black leading-tight">{c.flag} {c.name} visa</h1>
            <p className="text-xs text-white/60">{c.authority}</p>
          </div>
        </header>

        {visa === undefined ? <p className="text-white/60">One moment…</p> : visa ? (
          // ---------------------------------------------------------------- the application's status, or the visa
          <section className="rounded-3xl bg-[#fdf8f3] text-slate-900 p-5 space-y-3 shadow-2xl">
            {visa.status === "review" ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Under review</p>
                <p className="text-xl font-black">Your application is being checked</p>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-amber-500 transition-all" style={{ width: `${100 - (left / c.reviewSeconds) * 100}%` }} /></div>
                <p className="text-sm text-slate-600">Usually about a minute{left ? `: ${left}s to go` : ": nearly done"}. You can leave this page; it&apos;ll be ready when you come back.</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Approved</p>
                <div className="rounded-2xl border-2 border-[#8a1538] p-4 space-y-1 bg-white">
                  <p className="flex items-center justify-between"><span className="font-black">{c.flag} {c.name} · {c.kinds.find((k) => k.id === visa.kind)?.name}</span><span className="text-[10px] font-black text-[#8a1538]">E-VISA</span></p>
                  <p className="text-sm"><b>{citizen?.name ?? citizen?.username}</b></p>
                  <p className="text-xs text-slate-500">No. <b className="text-slate-900 tabular-nums">{visa.number}</b></p>
                  <p className="text-xs text-slate-500">Valid until <b className="text-slate-900">{visa.valid_until ? new Date(visa.valid_until).toLocaleDateString() : "–"}</b> · {visa.purpose} · {visa.stay}</p>
                </div>
                <button onClick={() => router.push(then ?? `/fly?to=${c.city}`)} className="w-full h-12 rounded-2xl bg-teal-700 text-white font-black">🛫 Continue to check-in</button>
              </>
            )}
          </section>
        ) : (
          // ---------------------------------------------------------------- the application, in three steps
          <section className="rounded-3xl bg-[#fdf8f3] text-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex gap-1.5">{[1, 2, 3].map((n) => <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "bg-[#8a1538]" : "bg-slate-200"}`} />)}</div>
            {step === 1 && (
              <>
                <p className="font-black text-lg">1 · Choose your visa</p>
                <p className="text-sm text-slate-600">You live in the UAE, so you need a visa to visit {c.name}.</p>
                {c.kinds.map((k) => (
                  <button key={k.id} onClick={() => setKind(k.id)} className={`w-full text-left rounded-2xl border-2 p-3 ${kind === k.id ? "border-[#8a1538] bg-rose-50" : "border-slate-200 bg-white"}`}>
                    <p className="flex justify-between font-black"><span>{k.name}</span><span>AED {k.fee.toLocaleString()}</span></p>
                    <p className="text-xs text-slate-500">{k.entries} · {k.days} days · {k.blurb}</p>
                  </button>
                ))}
                <button onClick={() => setStep(2)} className="w-full h-12 rounded-2xl bg-[#8a1538] text-white font-black">Next</button>
              </>
            )}
            {step === 2 && (
              <>
                <p className="font-black text-lg">2 · Your trip</p>
                <label className="block text-sm font-bold">Why are you going?
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-slate-300 bg-white px-3 text-base">
                    {c.purposes.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">Where will you stay?
                  <select value={stay} onChange={(e) => setStay(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-slate-300 bg-white px-3 text-base">
                    {stays.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 h-12 rounded-2xl bg-slate-100 font-bold">Back</button>
                  <button onClick={() => setStep(3)} className="flex-[2] h-12 rounded-2xl bg-[#8a1538] text-white font-black">Next</button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="font-black text-lg">3 · Passport and payment</p>
                <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm space-y-1">
                  <p className="flex justify-between"><span className="text-slate-500">Name</span><b>{citizen?.name ?? citizen?.username}</b></p>
                  <p className="flex justify-between"><span className="text-slate-500">Residence</span><b>United Arab Emirates</b></p>
                  <p className="flex justify-between"><span className="text-slate-500">Visa</span><b>{chosen.name} · {chosen.days} days</b></p>
                  <p className="flex justify-between"><span className="text-slate-500">Purpose</span><b>{purpose}</b></p>
                  <p className="flex justify-between gap-3"><span className="text-slate-500 shrink-0">Staying at</span><b className="text-right">{stay}</b></p>
                </div>
                {error && <p className="rounded-xl bg-rose-600 text-white text-sm font-bold px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex-1 h-12 rounded-2xl bg-slate-100 font-bold">Back</button>
                  <button disabled={busy} onClick={() => void submit()} className="flex-[2] h-12 rounded-2xl bg-[#8a1538] text-white font-black disabled:opacity-50">{busy ? "Sending…" : `Pay AED ${chosen.fee.toLocaleString()} & apply`}</button>
                </div>
              </>
            )}
          </section>
        )}
        <p className="text-center text-xs text-white/50">Dubai and Abu Dhabi are home: you need no visa to fly between them or back. <Link href="/explore" className="underline">Back to the map</Link></p>
      </div>
    </main>
  );
}
