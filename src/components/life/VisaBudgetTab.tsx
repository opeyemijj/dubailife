"use client";

// The "Visa & budget" tab of the life panel (design spec sections 5 and 11): the visa clock and ladder,
// Runway Days with the Expat Trap warning, and the Sustainability Blueprint editor.

import { ShareButton } from "@/components/share/ShareButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import {
  BLUEPRINT, VISAS, claimVisa, dailyBurn, earnsYield, isExpatTrap, monthlyCost, optionsFor, runwayDays, saveBlueprint,
  syncLife, useLifeLoop, visaInfo, visaProgress, type Blueprint, type BlueprintKind, type VisaProgress, type VisaTier,
} from "@/lib/lifeLoop";
import { GoldenLife } from "./GoldenLife";
import { gameAudio } from "@/utils/gameAudio";

const KINDS: Array<{ kind: BlueprintKind; title: string }> = [
  { kind: "housing", title: "Housing" }, { kind: "commute", title: "Getting around" },
  { kind: "telecom", title: "Phone plan" }, { kind: "fitness", title: "Wellness & fitness" },
];
const ORDER: VisaTier[] = ["VISIT", "STUDENT", "EMPLOYMENT", "FREELANCE", "GOLDEN"];
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

export function VisaBudgetTab({ onClose }: { onClose: () => void }) {
  const { citizen } = useCitizen();
  const life = useLifeLoop();
  useEffect(() => { if (!life) void syncLife(); }, [life]);
  const [vp, setVp] = useState<VisaProgress | null>(null);
  useEffect(() => { void visaProgress().then(setVp); }, [life?.visaTier]);

  const [draft, setDraft] = useState<Blueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [granted, setGranted] = useState<VisaTier | null>(null);

  if (!life || !citizen) return <p className="text-sm text-slate-500 py-8 text-center">Loading your visa and budget…</p>;

  const bp: Blueprint = draft ?? life.blueprint ?? (BLUEPRINT.default as Blueprint);
  const editing = !!draft || !life.blueprint;
  const monthly = editing ? monthlyCost(bp, life.hasHome) : life.monthly;
  const daily = dailyBurn(monthly);
  const runway = runwayDays(life.balance, daily);
  const visa = visaInfo(life.visaTier);
  const hasLicence = !!life.hasLicence;

  const pick = (kind: BlueprintKind, id: string) => { gameAudio.playClickSound(); setNote(null); setDraft({ ...bp, [kind]: id }); };
  const save = async () => {
    setBusy(true);
    const err = await saveBlueprint(bp);
    setBusy(false);
    if (err) setNote({ ok: false, text: err });
    else { gameAudio.playConfirmSound(); setDraft(null); setNote({ ok: true, text: "Blueprint saved. Costs are charged at 09:00 GST on days you play." }); }
  };
  const claim = async (tier: VisaTier) => {
    setBusy(true);
    const err = await claimVisa(tier);
    setBusy(false);
    if (err) setNote({ ok: false, text: err });
    else { gameAudio.playConfirmSound(); setGranted(tier); setNote({ ok: true, text: `🎉 ${visaInfo(tier).label} granted!` }); }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Visa */}
      <section className={`rounded-3xl p-4 ${life.visaDaysLeft === 0 && visa.overstay ? "bg-rose-50 border border-rose-200" : "bg-sky-50 border border-sky-100"}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{visa.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Your visa</p>
            <p className="font-black text-lg leading-tight">{visa.label}</p>
          </div>
          {life.visaTier !== "GOLDEN" && (
            <div className="text-right">
              <p className={`text-2xl font-black ${life.visaDaysLeft <= 5 ? "text-rose-600" : "text-slate-900"}`}>{life.visaDaysLeft}</p>
              <p className="text-[10px] font-bold text-slate-500">days left</p>
            </div>
          )}
        </div>
        {visa.days > 0 && life.visaTier !== "GOLDEN" && (
          <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
            <div className={`h-full rounded-full ${life.visaDaysLeft <= 5 ? "bg-rose-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, (life.visaDaysLeft / visa.days) * 100)}%` }} />
          </div>
        )}
        {life.visaDaysLeft === 0 && visa.overstay
          ? <p className="mt-2 text-xs font-bold text-rose-700">You&apos;re overstaying: AED {VISAS.overstayFinePerDay} is fined each day you play. Move up the ladder below to stop it.</p>
          : <p className="mt-2 text-[11px] text-slate-500">The clock only runs on days you play. In-game status, not immigration advice.</p>}
      </section>

      {/* Ladder */}
      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Visa ladder</h3>
        <ol className="space-y-1.5">
          {ORDER.map((id) => {
            const t = visaInfo(id);
            const rank = ORDER.indexOf(id), mine = ORDER.indexOf(life.visaTier);
            // Only offer "Apply" when the player qualifies; otherwise the step shows what's still needed.
            const qualifies = !vp ? false
              : id === "STUDENT" ? vp.course
              : id === "EMPLOYMENT" ? vp.employed
              : id === "FREELANCE" ? vp.earned >= 360000 && vp.degree
              : id === "GOLDEN" ? vp.property - vp.purchased >= 2000000 || (vp.honours && vp.venture)
              : false;
            const claimable = qualifies && (rank > mine || (id === "STUDENT" && rank === mine && life.visaDaysLeft < 30));
            const bar = (label: string, have: number, need: number) => (
              <span className="block mt-1">
                <span className="flex justify-between text-[10px] font-bold text-slate-500"><span>{label}</span><span>{Math.round(Math.max(0, Math.min(have, need))).toLocaleString()} / {need.toLocaleString()}</span></span>
                <span className="block h-1.5 rounded-full bg-white overflow-hidden"><span className="block h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (Math.max(0, have) / need) * 100)}%` }} /></span>
              </span>
            );
            return (
              <li key={id} className={`flex items-center gap-3 rounded-2xl p-3 ${rank === mine ? "bg-slate-900 text-white" : rank < mine ? "bg-emerald-50" : "bg-slate-50"}`}>
                <span className="text-xl">{rank < mine ? "✅" : t.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black">{t.tier}. {t.label}</span>
                  <span className={`block text-[11px] ${rank === mine ? "text-white/70" : "text-slate-500"}`}>{t.howTo}</span>
                  {vp && rank > mine && id === "FREELANCE" && <>{bar("AED earned", vp.earned, 360000)}<span className="block text-[10px] font-bold text-slate-500">{vp.degree ? "✅ Degree" : "⬜ A university or accelerator degree"}</span></>}
                  {vp && rank > mine && id === "GOLDEN" && <>{bar("Property (earned AED)", vp.property - vp.purchased, 2000000)}<span className="block text-[10px] font-bold text-slate-500">or {vp.honours ? "✅" : "⬜"} honours + {vp.venture ? "✅" : "⬜"} a venture with staff</span></>}
                </span>
                {!claimable && rank > mine && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-200 text-slate-500">Not yet</span>}
                {claimable && <button disabled={busy} onClick={() => claim(id)} className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-600 text-white">{rank === mine ? "Renew" : "Apply"}</button>}
              </li>
            );
          })}
        </ol>
        <div className="flex gap-2 mt-2">
          <Link href="/academics" onClick={onClose} className="flex-1 text-center text-xs font-black py-2 rounded-xl bg-slate-100">🎓 Academic City</Link>
          <Link href="/jobs" onClick={onClose} className="flex-1 text-center text-xs font-black py-2 rounded-xl bg-slate-100">💼 Job Board</Link>
          <Link href="/ventures" onClick={onClose} className="flex-1 text-center text-xs font-black py-2 rounded-xl bg-slate-100">🏢 Ventures</Link>
          <Link href="/driving" onClick={onClose} className="flex-1 text-center text-xs font-black py-2 rounded-xl bg-slate-100">🚗 {hasLicence ? "Licence" : "Driving"}</Link>
        </div>
      </section>

      {life.visaTier === "GOLDEN" && <GoldenLife me={citizen.id} />}

      {/* Runway */}
      <section className={`rounded-3xl p-4 ${isExpatTrap(runway) ? "bg-amber-50 border-2 border-amber-400 animate-pulse [animation-iteration-count:3]" : "bg-slate-50"}`}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] font-bold text-slate-500">Wallet</p><p className="font-black">{aed(life.balance)}</p></div>
          <div><p className="text-[10px] font-bold text-slate-500">Daily burn</p><p className="font-black">{aed(daily)}</p></div>
          <div><p className="text-[10px] font-bold text-slate-500">Runway</p><p className={`font-black ${isExpatTrap(runway) ? "text-amber-700" : "text-emerald-700"}`}>{Number.isFinite(runway) ? `${runway} days` : "∞"}</p></div>
        </div>
        {isExpatTrap(runway) && (
          <div className="mt-3 space-y-1.5">
            <p className="text-sm font-black text-amber-800">⚠️ Expat Trap warning: under {BLUEPRINT.rules.expatTrapDays} days of runway</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setDraft({ ...bp, housing: "bed_space", commute: "metro_card", telecom: "prepaid", fitness: "calisthenics" })} className="text-xs font-black px-3 py-1.5 rounded-full bg-white border border-amber-300">🏠 Cheaper Blueprint</button>
              <Link href="/explore" onClick={onClose} className="text-xs font-black px-3 py-1.5 rounded-full bg-white border border-amber-300">💼 Take a shift</Link>
              <Link href="/home" onClick={onClose} className="text-xs font-black px-3 py-1.5 rounded-full bg-white border border-amber-300">🛋️ Sell an item</Link>
            </div>
          </div>
        )}
        {earnsYield(runway) && life.debt === 0 && (
          <div className="mt-2 flex items-center gap-2">
            <p className="flex-1 text-xs font-bold text-emerald-700">🌱 90+ days of runway: you earn the Financial Discipline Yield each week.</p>
            {runway < 100000 && <ShareButton moment="runway" v={runway} text={`${runway} days of runway in Dubai 📈`} className="h-8 px-3 rounded-full bg-emerald-600 text-white text-xs" />}
          </div>
        )}
        {life.debt > 0 && <p className="mt-2 text-xs font-bold text-rose-700">You owe {aed(life.debt)} in living costs. It&apos;s taken automatically once you have the AED.</p>}
        {life.streak > 1 && <p className="mt-2 text-xs font-bold text-slate-600">🔥 {life.streak}-day streak</p>}
      </section>

      {/* Blueprint */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Sustainability Blueprint</h3>
          {!editing && <button onClick={() => setDraft(bp)} className="text-xs font-black text-sky-600">Edit</button>}
        </div>
        {!life.blueprint && <p className="text-sm text-slate-600 mb-2">Choose your lifestyle. Your monthly costs ÷ 30 is your daily burn, charged at 09:00 GST on days you play.</p>}
        <div className="space-y-3">
          {KINDS.map(({ kind, title }) => (
            <div key={kind}>
              <p className="text-[11px] font-black text-slate-500 mb-1">{title}</p>
              {kind === "housing" && life.hasHome
                ? <p className="text-xs rounded-2xl bg-emerald-50 text-emerald-800 font-bold p-3">🏡 You have a home in the city, so housing here is free. You pay your home&apos;s own rent.</p>
                : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {optionsFor(kind).map((o) => {
                      const locked = !!o.needsLicence && !hasLicence;
                      const on = bp[kind] === o.id;
                      return (
                        <button key={o.id} disabled={!editing || locked} onClick={() => pick(kind, o.id)}
                          className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left border ${on ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"} ${locked ? "opacity-40" : ""} ${!editing && !on ? "hidden" : ""}`}>
                          <span className="text-lg">{o.icon}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold">{o.label}</span>
                            <span className={`block text-[11px] ${on ? "text-white/70" : "text-slate-500"}`}>{locked ? "Needs a driving license: get one at the Driving Academy" : o.area ?? o.detail}</span>
                          </span>
                          <span className="text-xs font-black">{o.monthly ? aed(o.monthly) : "Free"}<span className="font-bold opacity-60">/mo</span></span>
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          ))}
          <div>
            <p className="text-[11px] font-black text-slate-500 mb-1">Family support sent home</p>
            <div className="rounded-2xl bg-white border border-slate-200 p-3">
              <input type="range" disabled={!editing} min={BLUEPRINT.remittance.min} max={BLUEPRINT.remittance.max} step={BLUEPRINT.remittance.step}
                value={bp.remittance} onChange={(e) => setDraft({ ...bp, remittance: Number(e.target.value) })} className="w-full accent-emerald-600" />
              <p className="text-sm font-black text-right">{aed(bp.remittance)}<span className="font-bold text-slate-400">/mo</span></p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-slate-900 text-white p-3 flex items-center justify-between">
          <span className="text-sm font-bold">Monthly {aed(monthly)} · daily {aed(daily)}</span>
          <span className="text-sm font-black">{Number.isFinite(runway) ? `${runway} days runway` : "∞ runway"}</span>
        </div>
        {editing && (
          <div className="flex gap-2 mt-2">
            {life.blueprint && <button onClick={() => { setDraft(null); setNote(null); }} className="flex-1 h-11 rounded-2xl bg-slate-100 font-black text-sm">Cancel</button>}
            <button disabled={busy} onClick={save} className="flex-1 h-11 rounded-2xl bg-emerald-600 text-white font-black text-sm disabled:opacity-60">{busy ? "Saving…" : life.blueprint ? "Save Blueprint" : "Start my life in Dubai"}</button>
          </div>
        )}
      </section>
      {note && <p className={`text-sm font-bold text-center ${note.ok ? "text-emerald-700" : "text-rose-600"}`}>{note.text}</p>}
      {granted && <div className="text-center"><ShareButton moment="visa" l={granted} text={`I just got my ${visaInfo(granted).label} in Dubai Life 🛂`} /></div>}
    </div>
  );
}
