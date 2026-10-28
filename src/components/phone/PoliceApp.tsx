"use client";

// Dubai Police and the courts on the phone. Suspects: why the money is held, hire a lawyer (a player
// lawyer, Legal Aid or Senior Counsel), and go to court. Lawyers: their clients and the defence.
// Officers: the arrests they made.

import { useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { useOnlineUsernames } from "@/lib/presence";
import { goToCourt, hireLawyer, prepareDefence, professionals, SERVICES, setServiceFee, useServices, type CaseView, type Professional } from "@/lib/cityServices";
import { gameAudio } from "@/utils/gameAudio";
import { useNow } from "@/lib/dubaiClock";
import { AppScreen, aed, Big, Card, Note, Quiz } from "./AppScreen";

const LAWYER_NAME = { aid: "Legal Aid (Local)", senior: "Senior Counsel (Local)" } as const;
const until = (iso: string, now: number) => {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `in ${h}h ${m}m` : `in ${m}m`;
};

export function PoliceApp({ onBack }: { onBack: () => void }) {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  const open = s?.cases.filter((c) => c.status === "open") ?? [];
  const past = s?.cases.filter((c) => c.status !== "open") ?? [];

  return (
    <AppScreen title="Dubai Police" onBack={onBack} accent="text-blue-700">
      {s?.service === "lawyer" && <LawyerDesk />}
      {s?.service === "police" && (
        <Card className="bg-blue-50">
          <p className="font-black text-lg">🚓 Your arrests</p>
          {(s.arrests ?? []).length === 0 ? <p className="text-slate-500">None this week. Suspicious transfers are assigned to officers on the force automatically; you earn {aed(SERVICES.police.officerBounty)} for each one the court finds guilty.</p>
            : s.arrests.map((a) => <p key={a.id} className="flex justify-between"><span>@{a.suspect} · {aed(a.held)}</span><span className="font-semibold">{a.status === "open" ? "Awaiting court" : a.status === "guilty" ? "Guilty · bounty paid" : "Cleared"}</span></p>)}
        </Card>
      )}

      {open.map((c) => <OpenCase key={c.id} c={c} />)}
      {open.length === 0 && (
        <Card className="bg-blue-50">
          <p className="font-black text-lg">✅ No open cases</p>
          <p className="text-slate-600">Very large or unusual transfers may be looked into: over {aed(SERVICES.police.singleOver)} at once, over {aed(SERVICES.police.receivedDayOver)} received in a day, or big sums from brand-new accounts. If that happens the money is held and a judge decides within {SERVICES.police.hearingHours} hours.</p>
        </Card>
      )}
      {past.map((c) => (
        <Card key={c.id}>
          <p className="font-semibold">{c.status === "cleared" ? "⚖️ Case cleared" : "⚖️ Found guilty"}</p>
          <p className="text-slate-500 text-sm">{c.reason}</p>
          <p className="text-sm">{c.status === "cleared" ? `${aed(c.held)} was released to you.` : `${aed(c.held)} was confiscated${c.fine ? ` and you were fined ${aed(c.fine)}` : ""}.`}</p>
        </Card>
      ))}
    </AppScreen>
  );
}

function OpenCase({ c }: { c: CaseView }) {
  const { citizen } = useCitizen();
  const online = useOnlineUsernames();
  const [lawyers, setLawyers] = useState<Professional[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!c.lawyerKind) void professionals("lawyer").then((r) => setLawyers(r.data ?? [])); }, [c.lawyerKind]);
  const balance = citizen?.balance ?? 0;
  const now = useNow();

  const hire = async (kind: "player" | "aid" | "senior", id?: string, name?: string) => {
    setBusy(true);
    const r = await hireLawyer(c.id, kind, id);
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: `${name ?? LAWYER_NAME[kind as "aid" | "senior"]} is on your case.` });
  };
  const court = async () => {
    setBusy(true);
    const r = await goToCourt(c.id);
    setBusy(false);
    if (r.error) return setNote({ ok: false, text: r.error });
    if (r.data?.status === "cleared") gameAudio.playCoinSound();
  };

  const ready = c.defence !== null;
  return (
    <Card className="bg-rose-50">
      <div className="flex items-center gap-3">
        <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl">🚔</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg leading-tight">You&apos;ve been arrested{c.jailUntil && Date.parse(c.jailUntil) > now ? " · in custody" : ""}</p>
          <p className="text-slate-600 text-sm">{c.reason}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-white p-2.5"><p className="text-slate-500">{c.kind === "fake_licence" ? "Charge" : "Held"}</p><p className="font-black">{c.kind === "fake_licence" ? "Fake licence" : aed(c.held)}</p></div>
        <div className="rounded-2xl bg-white p-2.5"><p className="text-slate-500">Hearing</p><p className="font-black">{until(c.hearingAt, now)}</p></div>
      </div>
      <p className="text-sm text-slate-600">Arrested by {c.officer ? `Officer @${c.officer}` : "a Local officer"}. {c.kind === "fake_licence"
        ? "Hiring a lawyer gets you out of custody on bail. Guilty in court: an AED 25,000 fine. A good lawyer makes all the difference."
        : <>You can&apos;t send money until the judge rules. Cleared: the money is released. Guilty: it&apos;s confiscated and you&apos;re fined {SERVICES.police.finePercent}% of it. A good lawyer makes all the difference.</>}</p>
      {note && <Note ok={note.ok}>{note.text}</Note>}

      {c.lawyerKind ? (
        <>
          <p className="font-semibold">⚖️ {c.lawyerKind === "player" ? `Lawyer @${c.lawyer}` : LAWYER_NAME[c.lawyerKind]} · {ready ? `defence ready (${c.defence}/3)` : "preparing your defence…"}</p>
          <Big tone="dark" disabled={busy || (!ready && Date.parse(c.hearingAt) > now)} onClick={court}>{ready ? "Go to court now" : "Waiting for your lawyer"}</Big>
        </>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold">Hire a lawyer</p>
          {(lawyers ?? []).slice().sort((a, b) => Number(online.has(b.username)) - Number(online.has(a.username))).map((l) => (
            <button key={l.id} disabled={busy || balance < l.fee} onClick={() => void hire("player", l.id, `Lawyer @${l.username}`)}
              className="w-full flex items-center gap-2 px-3 py-3 rounded-2xl bg-white text-left disabled:opacity-50">
              <span className="flex-1"><span className="font-semibold">@{l.username}</span> <span className={`text-xs ${online.has(l.username) ? "text-emerald-600" : "text-slate-400"}`}>{online.has(l.username) ? "● online" : "offline"}</span></span>
              <span className="font-black">{aed(l.fee)}</span>
            </button>
          ))}
          <button disabled={busy || balance < SERVICES.law.legalAid.fee} onClick={() => void hire("aid")} className="w-full flex items-center gap-2 px-3 py-3 rounded-2xl bg-white text-left disabled:opacity-50">
            <span className="flex-1"><span className="font-semibold">Legal Aid</span> <span className="text-xs text-slate-500">Local · a basic defence</span></span><span className="font-black">{aed(SERVICES.law.legalAid.fee)}</span>
          </button>
          <button disabled={busy || balance < SERVICES.law.seniorCounsel.fee} onClick={() => void hire("senior")} className="w-full flex items-center gap-2 px-3 py-3 rounded-2xl bg-white text-left disabled:opacity-50">
            <span className="flex-1"><span className="font-semibold">Senior Counsel</span> <span className="text-xs text-slate-500">Local · a strong defence</span></span><span className="font-black">{aed(SERVICES.law.seniorCounsel.fee)}</span>
          </button>
          <p className="text-xs text-slate-500">No lawyer by the hearing? The judge rules without one, and that rarely goes well.</p>
        </div>
      )}
    </Card>
  );
}

/** For players who work as lawyers. */
function LawyerDesk() {
  const { citizen } = useCitizen();
  const s = useServices(citizen?.id);
  const [preparing, setPreparing] = useState<number | null>(null);
  const [fee, setFee] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const open = (s?.clients ?? []).filter((c) => c.status === "open");
  const now = useNow();

  return (
    <Card className="bg-amber-50">
      <p className="font-black text-lg">⚖️ Your clients</p>
      {note && <Note ok={note.ok}>{note.text}</Note>}
      {open.length === 0 ? <p className="text-slate-500">No clients right now. Players who are arrested can hire you for your fee.</p> : open.map((c) => (
        <div key={c.id} className="rounded-2xl bg-white p-3 space-y-2">
          <p className="font-semibold">@{c.client} · {aed(c.held)} held</p>
          <p className="text-sm text-slate-500">{c.reason} · hearing {until(c.hearingAt, now)}</p>
          {c.defence !== null ? <p className="text-sm font-semibold text-emerald-700">Defence filed: {c.defence}/3 strong points</p>
            : preparing === c.id ? (
              <Quiz title="Prepare the defence" intro="Each strong answer improves your client's chances." questions={SERVICES.law.defence}
                onCancel={() => setPreparing(null)} submitLabel="File the defence"
                onDone={async (a) => { setPreparing(null); const r = await prepareDefence(c.id, a); setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: `Defence filed: ${r.data}/3 strong points.` }); }} />
            ) : <Big onClick={() => setPreparing(c.id)}>Prepare the defence</Big>}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 flex-1">Your fee: <strong>{aed(s?.fee ?? SERVICES.law.fee.default)}</strong></span>
        <input value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`${SERVICES.law.fee.min}–${SERVICES.law.fee.max}`} className="w-28 h-10 rounded-xl border border-slate-200 px-2 text-center" />
        <button onClick={async () => { const r = await setServiceFee(Number(fee)); setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: "Fee updated." }); setFee(""); }} disabled={!fee} className="h-10 px-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-40">Set</button>
      </div>
    </Card>
  );
}
