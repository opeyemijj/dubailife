"use client";

// A short tour for new citizens, shown once on the map after they move in.

import { useEffect, useState } from "react";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";
import { ModalPortal } from "@/components/ui/modal-portal";

// Four short steps; everything else is learned by playing (the first-day checklist guides what to do).
const STEPS = [
  { icon: "👋", title: "Welcome to Dubai", text: "Players and Locals (our hosts, tagged Local) fill the city. Your visa clock and wallet are at the top." },
  { icon: "🗺️", title: "Go anywhere", text: "Pinch and drag the map, then tap a building to go inside: malls, clubs, restaurants, hotels and Academic City." },
  { icon: "🚶", title: "Inside a venue", text: "Tap the floor to walk, counters to shop or order, staff to ask for a job, and people to chat." },
  { icon: "🌅", title: "Your first day", text: "Follow the checklist in the corner for an AED 10,000 bonus. Settings → How Dubai works explains visas, jobs and prizes any time." },
];

export function FirstTimeTour() {
  const { citizen } = useCitizen();
  const key = `tour-done:${citizen?.id ?? ""}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!citizen?.id) return;
    let done = false;
    try { done = localStorage.getItem(key) === "1"; } catch { /* storage blocked */ }
    // Reads browser storage once the citizen is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!done && isNewCitizen(citizen)) setOpen(true);
  }, [citizen?.id, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    setOpen(false);
    try { localStorage.setItem(key, "1"); } catch { /* storage blocked */ }
  };
  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[190] bg-slate-950/60 flex items-end sm:items-center justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-label="Tour">
        <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-2xl p-6 text-center space-y-3">
          <div className="text-5xl">{s.icon}</div>
          <h2 className="text-xl font-black">{s.title}</h2>
          <p className="text-sm text-slate-600 min-h-[60px]">{s.text}</p>
          <div className="flex justify-center gap-1.5 py-1">
            {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-200"}`} />)}
          </div>
          <div className="flex gap-2">
            {!last && <button onClick={finish} className="flex-1 h-12 rounded-2xl bg-slate-100 font-bold">Skip</button>}
            <button onClick={() => (last ? finish() : setStep(step + 1))} className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white font-black">{last ? "Let's go" : "Next"}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
