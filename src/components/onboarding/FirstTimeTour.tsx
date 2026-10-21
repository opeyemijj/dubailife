"use client";

// A short tour for new citizens, shown once on the map after they move in.

import { useEffect, useState } from "react";
import { useCitizen } from "@/lib/citizenStore";
import { ModalPortal } from "@/components/ui/modal-portal";

const STEPS = [
  { icon: "👋", title: "Welcome to cometodubai.app", text: "You're now a citizen of Downtown Dubai. Everyone you see in venues is a real player." },
  { icon: "📱", title: "Install App & Notifications", text: "Add cometodubai.app to your Home Screen (Share → Add to Home Screen on iPhone) and turn on notifications so friend requests and messages pop up even when the game is closed!" },
  { icon: "🗺️", title: "Go anywhere", text: "Pinch and drag the map, then tap a building to go inside — malls, clubs, restaurants, hotels and pools. Walk there or take a taxi." },
  { icon: "🚶", title: "Move around inside", text: "In a venue, tap the floor to walk, tap counters to shop or order, and tap people to chat. Clubs have a live DJ and a dance floor." },
  { icon: "🛍️", title: "Shop, eat and work", text: "Buy food, clothes and furniture with virtual AED. Talk to staff to get a job and earn wages every shift." },
  { icon: "🍾", title: "Meet people", text: "Chat, wave, dance together, buy someone a drink or send money. Order bottle service and the whole club will know." },
  { icon: "🏠", title: "Your home", text: "Decorate your apartment, invite friends over, or rent and buy flats around the city." },
  { icon: "📱", title: "Phone & wallet", text: "Your phone has messages, friends and the ideas board. The red badge means someone wrote to you. Top up virtual AED in your wallet." },
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
    if (!done) setOpen(true);
  }, [citizen?.id, key]);

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
