"use client";

// Dubai Health on the phone. Patients: see a player doctor (their fee is held until they treat you) or a
// Local doctor straight away. Doctors: the patients waiting for you, your fee, and the prescription.

import { useEffect, useState } from "react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { useOnlineUsernames } from "@/lib/presence";
import { cancelConsult, illnessOf, localClinic, professionals, requestDoctor, SERVICES, setServiceFee, treatPatient, useServices, type Professional } from "@/lib/cityServices";
import { gameAudio } from "@/utils/gameAudio";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

export function ClinicApp({ onBack }: { onBack: () => void }) {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  const online = useOnlineUsernames();
  const [doctors, setDoctors] = useState<Professional[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ill = illnessOf(s?.illness?.kind);

  useEffect(() => { void professionals("doctor").then((r) => setDoctors(r.data ?? [])); }, []);
  const run = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
    if (!r.error) gameAudio.playCoinSound();
  };
  // Doctors on shift (online) first.
  const sorted = (doctors ?? []).slice().sort((a, b) => Number(online.has(b.username)) - Number(online.has(a.username)));

  return (
    <AppScreen title="Dubai Health" onBack={onBack} accent="text-teal-600">
      {note && <Note ok={note.ok}>{note.text}</Note>}

      {s?.service === "doctor" && <DoctorDesk />}

      {ill ? (
        <Card className="bg-lime-50">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl">{ill.icon}</span>
            <div className="flex-1">
              <p className="font-black text-lg">{ill.name}</p>
              <p className="text-slate-500">{ill.how} Your needs drop {SERVICES.illness.drainMultiplier}× faster until you&apos;re treated.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-teal-50">
          <p className="font-black text-lg">💚 You&apos;re healthy</p>
          <p className="text-slate-600">Bad street food, being run down (hungry and unwashed) or the summer midday sun can make you ill. When it happens, come here.</p>
        </Card>
      )}

      {ill && s?.waiting && (
        <Card>
          <p className="font-semibold">⏳ Waiting for Dr @{s.waiting.doctor}</p>
          <p className="text-slate-500">{aed(s.waiting.fee)} is held and paid when they treat you. You can cancel any time for a full refund.</p>
          <Big tone="light" disabled={busy} onClick={() => run(() => cancelConsult(s.waiting!.id), "Cancelled. Your money is back.")}>Cancel and get a refund</Big>
        </Card>
      )}

      {ill && !s?.waiting && (
        <>
          <Card>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl">🏥</span>
              <div className="flex-1"><p className="font-semibold">Clinic · Local doctor</p><p className="text-sm text-slate-500">Seen right now</p></div>
              <p className="font-black">{aed(SERVICES.illness.localClinicFee)}</p>
            </div>
            <Big disabled={busy || (citizen?.balance ?? 0) < SERVICES.illness.localClinicFee} onClick={() => run(localClinic, "🩺 Treated. You're feeling better already.")}>See a doctor now</Big>
          </Card>
          <h3 className="font-semibold text-slate-500 px-1 pt-1">Player doctors</h3>
          {doctors === null ? <p className="text-slate-400 px-1">Loading…</p> : sorted.length === 0 ? (
            <p className="text-slate-500 px-1">No player doctors yet. Become one: Jobs → Dubai Health (needs a degree).</p>
          ) : sorted.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(presetFor(d.look ?? { gender: "woman" }))} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">Dr @{d.username}</p>
                  <p className={`text-sm ${online.has(d.username) ? "text-emerald-600" : "text-slate-400"}`}>{online.has(d.username) ? "● On duty now" : "Off duty: may take a while"}</p>
                </div>
                <p className="font-black">{aed(d.fee)}</p>
              </div>
              <Big tone="blue" disabled={busy || (citizen?.balance ?? 0) < d.fee} onClick={() => run(() => requestDoctor(d.id), `Request sent to Dr @${d.username}. Your fee is held until you're treated.`)}>Book Dr @{d.username}</Big>
            </Card>
          ))}
        </>
      )}
    </AppScreen>
  );
}

/** For players who work as doctors. */
function DoctorDesk() {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  const [fee, setFee] = useState<string>("");
  const [treating, setTreating] = useState<number | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const { min, max } = SERVICES.illness.fee;

  const prescribe = async (id: number, t: number) => {
    const r = await treatPatient(id, t);
    if (r.error) return setNote({ ok: false, text: r.error });
    if (!r.data) return setNote({ ok: false, text: "That's not the right treatment for this illness. Look again." });
    gameAudio.playCoinSound();
    setTreating(null);
    setNote({ ok: true, text: "✅ Patient treated. Your fee is in your wallet." });
  };

  return (
    <Card className="bg-teal-50">
      <p className="font-black text-lg">🩺 Your patients</p>
      {note && <Note ok={note.ok}>{note.text}</Note>}
      {(s?.patients ?? []).length === 0 ? <p className="text-slate-500">Nobody waiting. Patients who book you appear here.</p> : s!.patients.map((p) => {
        const k = illnessOf(p.kind);
        return (
          <div key={p.id} className="rounded-2xl bg-white p-3 space-y-2">
            <div className="flex items-center gap-2"><span className="text-2xl">{k?.icon}</span><p className="flex-1 font-semibold">@{p.patient} · {k?.name}</p><p className="font-black text-emerald-700">{aed(p.fee)}</p></div>
            {treating === p.id ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">{k?.how} Prescribe:</p>
                {SERVICES.illness.treatments.map((t, i) => <button key={t} onClick={() => void prescribe(p.id, i)} className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-teal-400">{t}</button>)}
              </div>
            ) : <Big tone="green" onClick={() => setTreating(p.id)}>Examine @{p.patient}</Big>}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 flex-1">Your fee: <strong>{aed(s?.fee ?? SERVICES.illness.fee.default)}</strong></span>
        <input value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`${min}–${max}`} className="w-24 h-10 rounded-xl border border-slate-200 px-2 text-center" />
        <button onClick={async () => { const r = await setServiceFee(Number(fee)); setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: "Fee updated." }); setFee(""); }} disabled={!fee} className="h-10 px-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-40">Set</button>
      </div>
    </Card>
  );
}
