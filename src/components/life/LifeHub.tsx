"use client";

// Runs on every page while signed in: needs drop a little each minute, the life panel opens from the
// needs dock or the S key ("dubai:open-skills"), and level-ups show a short toast.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { tickNeeds } from "@/lib/life";
import type { LifeTab } from "./LifePanel";

// The panel brings in the city directory and course list, so it loads the first time it's opened.
const LifePanel = dynamic(() => import("./LifePanel").then((m) => m.LifePanel), { ssr: false });

/** Opens the life panel, on a tab if given. */
export const openLife = (tab?: LifeTab) => window.dispatchEvent(new CustomEvent("dubai:open-skills", { detail: tab }));

export function LifeHub() {
  const { citizen } = useCitizen();
  const signedIn = !!citizen?.id;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LifeTab>("needs");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    tickNeeds();
    const t = setInterval(() => tickNeeds(), 60_000);
    return () => clearInterval(t);
  }, [signedIn]);

  useEffect(() => {
    const show = (e: Event) => {
      const want = (e as CustomEvent<LifeTab | undefined>).detail;
      if (typeof want === "string") setTab(want);
      setOpen((o) => (typeof want === "string" ? true : !o));
    };
    const say = (e: Event) => {
      setToast(String((e as CustomEvent).detail));
      setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener("dubai:open-skills", show);
    window.addEventListener("dubai:toast", say);
    return () => { window.removeEventListener("dubai:open-skills", show); window.removeEventListener("dubai:toast", say); };
  }, []);

  const close = useCallback(() => setOpen(false), []);
  if (!signedIn) return null;
  return (
    <>
      {open && <LifePanel open tab={tab} onTab={setTab} onClose={close} />}
      {toast && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[170] px-4 py-2 rounded-full bg-slate-950/90 text-white text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-2 pointer-events-none">
          {toast}
        </div>
      )}
    </>
  );
}
