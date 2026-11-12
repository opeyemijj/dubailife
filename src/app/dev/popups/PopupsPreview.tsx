"use client";

import { useState } from "react";
import { POPUP, usePopupTurn, useScreenBusy } from "@/lib/popups";

const TESTS: Array<{ id: string; priority: number; label: string }> = [
  { id: "promo-whats-new", priority: POPUP.promo, label: "What's new (promo)" },
  { id: "daily-morning", priority: POPUP.daily, label: "Morning (daily)" },
  { id: "hint-two-finger", priority: POPUP.hint, label: "Two-finger hint (hint)" },
  { id: "live-knock", priority: POPUP.live, label: "Knock (live)" },
  { id: "urgent-labour", priority: POPUP.urgent, label: "Labour (urgent)" },
];

function TestPopup({ id, priority, label, want, onClose }: { id: string; priority: number; label: string; want: boolean; onClose: () => void }) {
  const turn = usePopupTurn(id, want, priority);
  if (!want || !turn) return null;
  return (
    <div role="dialog" data-test-popup={id} className="fixed inset-x-6 top-24 z-50 rounded-2xl bg-white text-slate-900 p-4 shadow-2xl">
      <p className="font-black">{label}</p>
      <button onClick={onClose} className="mt-2 h-10 px-4 rounded-xl bg-slate-900 text-white">Close {id}</button>
    </div>
  );
}

function Menu({ onClose }: { onClose: () => void }) {
  useScreenBusy(true);
  return <div className="fixed inset-x-6 bottom-6 z-50 rounded-2xl bg-amber-200 p-4"><button onClick={onClose}>Close menu</button></div>;
}

export function PopupsPreview() {
  const [want, setWant] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState(false);
  return (
    <main className="min-h-screen bg-slate-800 p-4 space-y-2">
      <button onClick={() => setWant(Object.fromEntries(TESTS.map((t) => [t.id, true])))} className="h-10 px-4 rounded-xl bg-emerald-500 font-black">Fire all</button>
      <button onClick={() => { setMenu(true); setWant((w) => ({ ...w, "late-payday": true })); }} className="h-10 px-4 rounded-xl bg-amber-400 font-black">Open menu, then payday</button>
      {TESTS.map((t) => <TestPopup key={t.id} {...t} want={!!want[t.id]} onClose={() => setWant((w) => ({ ...w, [t.id]: false }))} />)}
      <TestPopup id="late-payday" priority={POPUP.daily} label="Payday (arrives while a menu is open)" want={!!want["late-payday"]} onClose={() => setWant((w) => ({ ...w, "late-payday": false }))} />
      {menu && <Menu onClose={() => setMenu(false)} />}
    </main>
  );
}
