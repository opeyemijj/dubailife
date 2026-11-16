"use client";

// Cookie consent: essential cookies (staying signed in, game settings) are always on; analytics (Microsoft Clarity)
// only starts once a player accepts. The choice is kept for 12 months (dl-cookie-consent), and can be changed from
// the Cookie Policy (CookieSettingsButton) at any time. See src/app/cookies.

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

export type Consent = "analytics" | "essential";
const KEY = "dl-cookie-consent";
const YEAR = 365 * 86_400_000;

function read(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { c: Consent; at: number };
    return Date.now() - v.at < YEAR ? v.c : null;
  } catch { return null; }
}
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function setConsent(c: Consent) {
  try { localStorage.setItem(KEY, JSON.stringify({ c, at: Date.now() })); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
/** The choice made (null: not asked yet). */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(sub, read, () => undefined);
}
export const openCookieSettings = () => window.dispatchEvent(new CustomEvent("dubai:cookie-settings"));

export function CookieConsent() {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener("dubai:cookie-settings", open);
    return () => window.removeEventListener("dubai:cookie-settings", open);
  }, []);
  if (consent === undefined || (consent !== null && !reopened)) return null;
  const choose = (c: Consent) => { setConsent(c); setReopened(false); };
  return (
    <div className="fixed inset-x-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:left-auto sm:right-4 sm:bottom-4 sm:w-[24rem] z-[240] rounded-3xl bg-slate-950/95 text-white border border-white/10 shadow-2xl p-4 space-y-3" role="region" aria-label="Cookie choice">
      <p className="text-sm font-black">🍪 Cookies</p>
      <p className="text-xs text-white/75 leading-relaxed">
        We use essential cookies to keep you signed in and remember your settings. With your OK we also use Microsoft
        Clarity to see how the game is used, so we can fix problems. No advertising. <Link href="/cookies" className="underline">Cookie Policy</Link>
      </p>
      <div className="flex gap-2">
        <button onClick={() => choose("essential")} className="flex-1 h-10 rounded-2xl bg-white/10 text-xs font-black">Essential only</button>
        <button onClick={() => choose("analytics")} className="flex-1 h-10 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-black">Accept analytics</button>
      </div>
    </div>
  );
}

/** On the Cookie Policy: the current choice and a button to change it. */
export function CookieSettingsButton() {
  const consent = useConsent();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <span className="text-sm">Your choice: <strong>{consent === "analytics" ? "essential and analytics" : consent === "essential" ? "essential only" : "not made yet"}</strong></span>
      <button onClick={openCookieSettings} className="h-9 px-4 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">Change cookie settings</button>
    </div>
  );
}
