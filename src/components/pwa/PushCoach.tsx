"use client";

// The push coach: a bottom sheet that asks for notifications at helpful moments (a friend request, a
// message, a door knock, enrolling, getting hired), shows iPhone install steps when the app has to be
// installed first, and walks players through unblocking notifications in their settings. Also pays the
// one-time install bonus the first time the installed app is opened.

import { useEffect, useState } from "react";
import { Bell, Check, Settings, Share, SquarePlus, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { isStandalonePwa } from "@/lib/push/client";
import { bonusAmounts, claimBonus, enablePush, markAsked, pushStatus, unblockSteps, type AskReason, type PushStatus } from "@/lib/push/engage";
import { gameAudio } from "@/utils/gameAudio";

type Ask = AskReason & { force?: boolean };

export function PushCoach() {
  const { citizen } = useCitizen();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [status, setStatus] = useState<PushStatus>("ask");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [bonus, setBonus] = useState({ install: 0, push: 0 });
  const [stillBlocked, setStillBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { void bonusAmounts().then(setBonus); }, []);

  // Notifications already allowed: quietly make sure this device's subscription is saved on the server
  // (no popup — permission is already granted), and credit the bonus if it's due.
  useEffect(() => {
    if (!citizen?.id || pushStatus() !== "on") return;
    void enablePush(citizen.id).then((r) => {
      if (r.bonus > 0) window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🔔 Notifications on · +AED ${r.bonus.toLocaleString()} bonus!` }));
    });
  }, [citizen?.id]);

  // The installed app's first launch: pay the install bonus, then (if notifications aren't on) ask.
  useEffect(() => {
    if (!citizen?.id || !isStandalonePwa()) return;
    let live = true;
    void claimBonus("install").then((paid) => {
      if (!live) return;
      if (paid > 0) {
        gameAudio.playCoinSound();
        window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `📲 App installed · +AED ${paid.toLocaleString()} bonus!` }));
      }
      const s = pushStatus();
      if (paid > 0 && (s === "ask" || s === "blocked")) {
        setTimeout(() => setAsk({ icon: "🔔", title: "One more step", text: "Turn on notifications so messages, friend requests and door knocks reach you even when the app is closed.", force: true }), 1500);
      }
    });
    return () => { live = false; };
  }, [citizen?.id]);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Ask>).detail ?? {};
      const s = pushStatus();
      if (s === "on" && !d.force) return;
      if (s === "unsupported") return;
      // Never on top of another dialog unless asked for on purpose.
      if (!d.force && dialogOpen()) return;
      if (!d.force) markAsked();
      setStatus(s); setDone(null); setStillBlocked(false); setFailed(false);
      setAsk({ icon: d.icon ?? "🔔", title: d.title ?? "Stay in the loop", text: d.text ?? "Get messages, friend requests and door knocks even when the app is closed.", force: d.force });
    };
    window.addEventListener("dubai:ask-push", on);
    return () => window.removeEventListener("dubai:ask-push", on);
  }, []);

  if (!ask || !citizen) return null;
  const close = () => setAsk(null);
  const turnOn = async () => {
    setBusy(true); setFailed(false);
    const r = await Promise.race([enablePush(citizen.id), new Promise<{ ok: false; bonus: 0; blocked: false }>((res) => setTimeout(() => res({ ok: false, bonus: 0, blocked: false }), 15000))]);
    setBusy(false);
    if (r.ok) {
      gameAudio.playCoinSound();
      setStatus("on");
      setDone(r.bonus > 0 ? `Notifications are on · +AED ${r.bonus.toLocaleString()} bonus!` : "Notifications are on.");
      setTimeout(close, 2600);
    } else if (r.blocked) setStatus("blocked");
    else setFailed(true);
  };
  const steps = unblockSteps();

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[175] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
          <button onClick={close} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600" aria-label="Close"><X className="w-4 h-4" /></button>

          {done ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-7 h-7 text-emerald-600" /></div>
              <p className="font-black text-lg">{done}</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 pr-10">
                <span className="text-3xl leading-none">{ask.icon}</span>
                <div>
                  <h3 className="font-black text-lg leading-tight">{ask.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{ask.text}</p>
                </div>
              </div>

              {status === "ask" && (
                <>
                  {bonus.push > 0 && <p className="rounded-2xl bg-amber-50 text-amber-800 text-sm font-bold px-3 py-2">🎁 Turn them on and get a one-time <b>AED {bonus.push.toLocaleString()}</b> bonus.</p>}
                  <button onClick={turnOn} disabled={busy} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60">
                    <Bell className="w-4 h-4" /> {busy ? "Turning on…" : "Turn on notifications"}
                  </button>
                  {failed && <p className="text-[12px] text-rose-600 font-bold text-center">Couldn&apos;t turn them on in this browser. Try again, or open the app in Chrome or Safari.</p>}
                  <p className="text-[11px] text-slate-400 text-center">Your browser will ask you to confirm. Only messages, requests, knocks and reminders, never spam.</p>
                </>
              )}

              {status === "install-first" && (
                <>
                  <p className="text-sm font-bold">On iPhone, notifications only work in the installed app:</p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5"><span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0"><Share className="w-4 h-4" /></span>Tap <b>Share</b> in Safari&apos;s toolbar</li>
                    <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5"><span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0"><SquarePlus className="w-4 h-4" /></span>Tap <b>Add to Home Screen</b>, then <b>Add</b></li>
                    <li className="flex items-center gap-3 rounded-2xl bg-emerald-50 text-emerald-800 p-2.5"><span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></span>Open it from your Home Screen and allow notifications</li>
                  </ol>
                  {(bonus.install > 0 || bonus.push > 0) && <p className="rounded-2xl bg-amber-50 text-amber-800 text-sm font-bold px-3 py-2">🎁 Bonuses: <b>AED {bonus.install.toLocaleString()}</b> for installing + <b>AED {bonus.push.toLocaleString()}</b> for notifications.</p>}
                  <button onClick={close} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Got it</button>
                </>
              )}

              {status === "blocked" && (
                <>
                  <p className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-slate-500" /> Notifications are blocked on {steps.where}. To turn them on:</p>
                  <ol className="space-y-2 text-sm">
                    {steps.steps.map((st, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>{st}
                      </li>
                    ))}
                  </ol>
                  {bonus.push > 0 && <p className="text-[12px] text-amber-700 font-bold">🎁 Then come back and tap below to collect your AED {bonus.push.toLocaleString()} bonus.</p>}
                  {stillBlocked && <p className="text-[12px] text-rose-600 font-bold">Still blocked here. After changing the setting, reload the page (or reopen the app) and try again.</p>}
                  <button onClick={() => { const s = pushStatus(); if (s === "blocked") { setStillBlocked(true); return; } setStatus(s); void turnOn(); }}
                    className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">I&apos;ve turned them on</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
