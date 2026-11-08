"use client";

// "Get the full Dubai Life": a new player's first stop at home, straight after moving in. Install the app and turn
// on notifications, with the steps for this browser (src/data/guide/app-setup.json). Each step ticks itself off;
// on an iPhone the second step happens in the installed app. "Later" hides it until the next visit.

import { useEffect, useState } from "react";
import { Bell, Check, Plus, Share, X } from "lucide-react";
import SETUP from "@/data/guide/app-setup.json";
import { ModalPortal } from "@/components/ui/modal-portal";
import { promptInstall, useInstallState } from "@/lib/install";
import { enablePush, pushStatus, unblockSteps, type PushStatus } from "@/lib/push/engage";
import { gameAudio } from "@/utils/gameAudio";

const LATER = "app-setup-later";
type Guide = keyof typeof SETUP.install;

function whichGuide(): Guide {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /crios/i.test(ua) ? "iosChrome" : "iosSafari";
  if (/android/i.test(ua)) return /samsungbrowser/i.test(ua) ? "samsung" : "androidChrome";
  if (/edg\//i.test(ua)) return "desktopEdge";
  if (/chrome|chromium/i.test(ua)) return "desktopChrome";
  if (/safari/i.test(ua) && /macintosh/i.test(ua)) return "macSafari";
  return "other";
}

/** Whether this device still needs setting up (and wasn't put off this visit). */
export function needsAppSetup(): boolean {
  try { if (sessionStorage.getItem(LATER) === "1") return false; } catch { /* storage blocked */ }
  const push = pushStatus();
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone || (push !== "on" && push !== "unsupported");
}

const Icon = ({ text }: { text: string }) => {
  const parts = text.split(/(\{share\}|\{plus\}|\{menu\})/);
  return (
    <>
      {parts.map((p, i) =>
        p === "{share}" ? (
          <Share key={i} className="inline w-4 h-4 mx-0.5 -mt-0.5 text-sky-600" />
        ) : p === "{plus}" ? (
          <Plus key={i} className="inline w-4 h-4 mx-0.5 -mt-0.5 text-sky-600" />
        ) : p === "{menu}" ? (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-slate-900 text-xs leading-none">
            ≡
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
};

export function AppSetup({ userId, onClose }: { userId: string; onClose: () => void }) {
  const install = useInstallState();
  const [guide, setGuide] = useState<Guide>("other");
  const [push, setPush] = useState<PushStatus>("unsupported");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Read the browser once it's here, and again now and then (a setting may be changed in another tab).
    const read = () => { setGuide(whichGuide()); setPush(pushStatus()); };
    const t = setTimeout(read, 0);
    const every = setInterval(read, 1500);
    return () => { clearTimeout(t); clearInterval(every); };
  }, []);

  const installed = install === "installed";
  // Browsers that can't install (like Firefox on a computer) only need notifications.
  const canInstall = guide !== "other";
  const installDone = installed || !canInstall;
  const pushDone = push === "on" || push === "unsupported";
  const steps = SETUP.install[guide];

  const later = () => {
    try { sessionStorage.setItem(LATER, "1"); } catch { /* storage blocked */ }
    onClose();
  };
  const turnOn = async () => {
    setBusy(true);
    await enablePush(userId);
    setBusy(false);
    setPush(pushStatus());
    gameAudio.playCoinSound();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[195] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Get the app">
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer" onClick={later} aria-hidden />
        <div className="w-full max-w-md max-h-[94dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 shadow-2xl relative z-10">
          {/* Top Right Close Button */}
          <button
            type="button"
            onClick={later}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-1.5 pt-1">
            <p className="text-4xl">📲</p>
            <h2 className="text-2xl font-black leading-tight pr-6 pl-6">{SETUP.title}</h2>
            <p className="text-sm text-slate-600">{SETUP.why}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SETUP.perks.map((p) => <p key={p} className="rounded-xl bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-700">{p}</p>)}
          </div>

          <section className={`rounded-2xl border p-3.5 space-y-2.5 ${installDone ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${installDone ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"}`}>{installDone ? <Check className="w-4 h-4" /> : 1}</span>
              <p className="font-black flex-1">{installed ? "App installed" : canInstall ? "Install the app" : "Install (not in this browser)"}</p>
            </div>
            {!installDone && (install === "prompt" ? (
              <button onClick={() => void promptInstall()} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">Install Dubai Life</button>
            ) : (
              <div className="space-y-2.5">
                {guide === "iosSafari" && (
                  <div className="rounded-xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/safari-bar-guide.jpg"
                      alt="Safari Address Bar with ≡ menu button"
                      className="w-full h-auto object-contain block"
                    />
                    <p className="text-[10px] text-center text-slate-500 py-1 bg-slate-100 font-medium">
                      Tap the <strong className="text-slate-900 font-bold">≡</strong> icon inside the bottom address bar
                    </p>
                  </div>
                )}
                <ol className="space-y-1.5">
                  {steps.map((st, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>
                        <Icon text={st} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {!canInstall && <p className="text-xs text-slate-500">{SETUP.install.other[0]}. Notifications still work here.</p>}
          </section>

          <section className={`rounded-2xl border p-3.5 space-y-2.5 ${pushDone ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${pushDone ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"}`}>{pushDone ? <Check className="w-4 h-4" /> : 2}</span>
              <p className="font-black flex-1">{push === "on" ? "Notifications on" : push === "unsupported" ? "Notifications (not in this browser)" : "Turn on notifications"}</p>
            </div>
            {push === "ask" && (
              <>
                <button onClick={turnOn} disabled={busy} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"><Bell className="w-4 h-4" /> {busy ? "Turning on…" : "Turn on notifications"}</button>
                <p className="text-[11px] text-slate-400 text-center">Your browser asks you to confirm: tap Allow. Only messages, knocks, events and reminders, never spam.</p>
              </>
            )}
            {push === "install-first" && <p className="text-sm text-slate-600">On iPhone this works once the app is installed: open Dubai Life from your Home Screen and you&apos;ll finish here.</p>}
            {push === "blocked" && (
              <>
                <p className="text-sm font-bold">They&apos;re blocked in {unblockSteps().where}. To allow them:</p>
                <ol className="space-y-1.5">{unblockSteps().steps.map((st, i) => <li key={i} className="flex gap-2.5 text-sm"><span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>{st}</li>)}</ol>
              </>
            )}
          </section>

          {installDone && pushDone ? (
            <button onClick={onClose} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black">You&apos;re all set. Let&apos;s go!</button>
          ) : (
            <button onClick={later} className="w-full text-sm font-bold text-slate-400 py-1">I&apos;ll miss out for now</button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
