"use client";

// Dubai Police and the courts on the phone. Suspects: why the money is held, hire a lawyer (a player
// lawyer, Legal Aid or Senior Counsel), and go to court. Lawyers: their clients and the defence.
// Officers: the arrests they made.

import { useEffect, useState } from "react";
import { adjustBalance, useCitizen } from "@/lib/citizenStore";
import { useOnlineUsernames } from "@/lib/presence";
import { goToCourt, hireLawyer, prepareDefence, professionals, SERVICES, setServiceFee, useServices, type CaseView, type Professional } from "@/lib/cityServices";
import { gameAudio } from "@/utils/gameAudio";
import { useNow } from "@/lib/dubaiClock";
import { useGarage, reportStolenCar, carOf } from "@/lib/cars";
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
  const { garage, reload: reloadGarage } = useGarage(citizen?.id);
  const s = useServices(citizen?.id);
  const open = s?.cases.filter((c) => c.status === "open") ?? [];
  const past = s?.cases.filter((c) => c.status !== "open") ?? [];
  const stolenVehicles = (garage?.owned ?? []).filter((o) => o.isStolen || o.recoveredAt);
  // #10: Interactive Courthouse (OBJECTION! Evidence QTE, Citizen Jury Tug-of-War & Pre-Nup/Asset Split Slider)
  const [courtTab, setCourtTab] = useState<"objection" | "jury" | "prenup">("objection");
  const [objectionSolved, setObjectionSolved] = useState(false);
  const [juryMeter, setJuryMeter] = useState(58);
  const [juryRewarded, setJuryRewarded] = useState(false);
  const [assetSplit, setAssetSplit] = useState(50);
  const [prenupSigned, setPrenupSigned] = useState(false);

  return (
    <AppScreen title="Dubai Police" onBack={onBack} accent="text-blue-700">
      {/* 🚨 Dubai Police Stolen Vehicle Dispatch & GPS Recovery Tracker */}
      <Card className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-xl border border-blue-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 text-lg">🚔</span>
            <div>
              <p className="font-black text-sm text-white">Stolen Vehicle Dispatch &amp; Tracking</p>
              <p className="text-[11px] text-blue-200">Dubai Police Automated Highway APB System</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
            RTA Connected
          </span>
        </div>

        {stolenVehicles.length === 0 ? (
          <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 text-xs text-blue-200 flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span>All your registered vehicles are secure in your home driveway/garage.</span>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {stolenVehicles.map((v) => {
              const c = carOf(v.car);
              return (
                <div key={v.id} className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-white text-sm block">{c?.make} {c?.model}</span>
                      <span className="text-[10px] text-slate-300 font-mono">Plate: {v.plate}</span>
                    </div>
                    {v.isStolen ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                        STOLEN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                        RECOVERED
                      </span>
                    )}
                  </div>

                  {v.isStolen ? (
                    <>
                      <p className="text-[11px] text-rose-300 font-bold">
                        {v.reportedStolenAt
                          ? "🚨 Official Police APB Active: Highway patrol interceptors are scanning traffic."
                          : "⚠️ Vehicle hotwired! File an official report now to dispatch police interceptors."}
                      </p>
                      {!v.reportedStolenAt ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await reportStolenCar(v.id);
                            if (!res.error) {
                              gameAudio.playCoinSound();
                              window.dispatchEvent(new CustomEvent("dubai:toast", {
                                detail: "🚨 Dubai Police APB dispatched! Patrols scanning traffic."
                              }));
                              void reloadGarage();
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all"
                        >
                          🚨 Dispatch Dubai Police APB (Report Stolen)
                        </button>
                      ) : (
                        <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-500/40 text-[11px] flex items-center justify-between text-blue-200 font-mono">
                          <span>📡 Salik GPS: Sheikh Zayed Rd</span>
                          <span className="text-emerald-400 font-bold animate-pulse">LIVE TRACKING</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-200 font-bold">
                      🎉 Suspect apprehended! Car safely returned to your driveway with full fuel.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {s?.service === "lawyer" && <LawyerDesk />}
      {s?.service === "police" && (
        <Card className="bg-blue-50">
          <p className="font-black text-lg">🚓 Your arrests</p>
          {(s.arrests ?? []).length === 0 ? <p className="text-slate-500">None this week. Suspicious transfers are assigned to officers on the force automatically; you earn {aed(SERVICES.police.officerBounty)} for each one the court finds guilty.</p>
            : s.arrests.map((a) => <p key={a.id} className="flex justify-between"><span>@{a.suspect} · {aed(a.held)}</span><span className="font-semibold">{a.status === "open" ? "Awaiting court" : a.status === "guilty" ? "Guilty · bounty paid" : "Cleared"}</span></p>)}
        </Card>
      )}

      {/* #10: Interactive Dubai Courthouse: OBJECTION!, Citizen Jury Tug-of-War & Civil Pre-Nup/Asset Split */}
      <Card className="bg-gradient-to-br from-amber-50 via-slate-50 to-indigo-50 border border-amber-300/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-base text-slate-900">⚖️ Interactive Dubai Courthouse</p>
            <p className="text-xs text-slate-600">Slam OBJECTION!, vote on the Citizen Jury Tug-of-War &amp; draft Civil Pre-Nups!</p>
          </div>
          <span className="text-2xl">🏛️</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "objection" as const, label: "❗ OBJECTION!" },
            { id: "jury" as const, label: "⚖️ Jury Vote" },
            { id: "prenup" as const, label: "📜 Pre-Nup Split" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                gameAudio.playClickSound();
                setCourtTab(t.id);
              }}
              className={`py-2 rounded-xl text-xs font-black ${
                courtTab === t.id ? "bg-slate-900 text-amber-300" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {courtTab === "objection" && (
          <div className="p-3 rounded-2xl bg-white border border-amber-200 space-y-2">
            <div className="text-xs font-black text-slate-900">
              Docket #DXB-409: Witness claims the suspect was in Deira at 23:00, but Salik Toll Gate logged their G-Wagon on Palm Jumeirah at 23:01!
            </div>
            {!objectionSolved ? (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCoinSound();
                  setObjectionSolved(true);
                  adjustBalance(200);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow active:scale-95"
              >
                ❗ SLAM &ldquo;OBJECTION!&rdquo; — Present Salik Toll Receipt (+AED 200)
              </button>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black">
                <span>👨‍⚖️ Judge Sustained! Contradiction Exposed (+AED 200)</span>
                <button type="button" onClick={() => setObjectionSolved(false)} className="underline">Next</button>
              </div>
            )}
          </div>
        )}

        {courtTab === "jury" && (
          <div className="p-3 rounded-2xl bg-white border border-indigo-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-emerald-700">🟢 Clear ({juryMeter}%)</span>
              <span className="text-slate-500">Live Citizen Jury Tug-of-War</span>
              <span className="text-rose-700">🔴 Guilty ({100 - juryMeter}%)</span>
            </div>
            <div className="h-3 rounded-full bg-rose-500 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${juryMeter}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClickSound();
                  setJuryMeter((m) => Math.min(95, m + 8));
                  if (!juryRewarded) {
                    setJuryRewarded(true);
                    adjustBalance(150);
                  }
                }}
                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs active:scale-95"
              >
                🟢 Vote Innocent (+AED 150)
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClickSound();
                  setJuryMeter((m) => Math.max(5, m - 8));
                  if (!juryRewarded) {
                    setJuryRewarded(true);
                    adjustBalance(150);
                  }
                }}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs active:scale-95"
              >
                🔴 Vote Guilty (+AED 150)
              </button>
            </div>
          </div>
        )}

        {courtTab === "prenup" && (
          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-900">
              <span>📜 Civil Pre-Nup / Settlement Asset Split</span>
              <span className="text-indigo-700">{assetSplit}% / {100 - assetSplit}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={assetSplit}
              onChange={(e) => {
                setAssetSplit(Number(e.target.value));
                setPrenupSigned(false);
              }}
              className="w-full accent-indigo-600"
            />
            <button
              type="button"
              onClick={() => {
                gameAudio.playCoinSound();
                setPrenupSigned(true);
              }}
              className="w-full py-2 rounded-xl bg-slate-900 text-amber-300 font-black text-xs active:scale-95"
            >
              {prenupSigned
                ? `✅ Notarized by Dubai Civil Court (${assetSplit}% / ${100 - assetSplit}%)`
                : `🖋️ Notarize ${assetSplit}% / ${100 - assetSplit}% Civil Agreement`}
            </button>
          </div>
        )}
      </Card>

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
        <div className="rounded-2xl bg-white p-2.5"><p className="text-slate-500">{c.kind === "fake_licence" ? "Charge" : "Held"}</p><p className="font-black">{c.kind === "fake_licence" ? "Fake license" : aed(c.held)}</p></div>
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
