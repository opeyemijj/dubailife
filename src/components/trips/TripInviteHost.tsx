"use client";

// A partner's trip invite (lib/trips): "@you booked you on the flight to Doha for your honeymoon". Accepting books the
// seat beside theirs (already paid) and opens the journey (/fly?trip=…); declining sends the fare back to them.

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useCitizen } from "@/lib/citizenStore";
import { CITIES } from "@/lib/city/cities";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { purposeOf, refreshTrips, respondTrip, useTrips } from "@/lib/trips";
import { gameAudio } from "@/utils/gameAudio";

const QUIET = /^\/(admin|auth|onboarding|fly|dev)\b/;

export function TripInviteHost() {
  const router = useRouter();
  const path = usePathname() ?? "";
  const { citizen } = useCitizen();
  const trips = useTrips(citizen?.id);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invite = trips?.invites.find((i) => !dismissed.includes(i.trip)) ?? null;
  const turn = usePopupTurn("trip-invite", !!invite && !QUIET.test(path), POPUP.live);
  if (!turn || !invite || !citizen) return null;

  const p = purposeOf(invite.purpose);
  const answer = async (accept: boolean) => {
    setBusy(true); setError(null);
    const r = await respondTrip(invite.trip, accept);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playClickSound();
    setDismissed((d) => [...d, invite.trip]);
    void refreshTrips(citizen.id);
    if (accept && r.data) router.push(`/fly?trip=${invite.trip}`);
  };
  const hours = Math.max(1, Math.round((Date.parse(invite.expiresAt) - Date.parse(new Date().toISOString())) / 3_600_000));
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[320] bg-black/70 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Trip invite">
        <div className="w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] bg-white text-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center space-y-3">
          <p className="text-5xl">{p.icon}✈️</p>
          <h2 className="text-2xl font-black leading-tight">@{invite.by.username} booked you on a trip to {CITIES[invite.to].name}!</h2>
          <p className="text-sm text-slate-600">
            {p.label} · Dubai Life Airways from {CITIES[invite.from].name}, {invite.class} class, in the seat next to theirs
            {invite.kids > 0 ? `, with ${invite.kids} of your children` : ""}. Your ticket&apos;s paid for.
          </p>
          {error && <p className="rounded-xl bg-rose-50 text-rose-700 text-sm font-bold px-3 py-2">{error}</p>}
          <button disabled={busy} onClick={() => void answer(true)} className="w-full h-14 rounded-2xl bg-teal-700 text-white text-lg font-black disabled:opacity-50">✈️ Accept & fly</button>
          <button disabled={busy} onClick={() => void answer(false)} className="w-full h-11 rounded-2xl bg-slate-100 text-sm font-black disabled:opacity-50">Not this time</button>
          <button onClick={() => setDismissed((d) => [...d, invite.trip])} className="text-xs font-bold text-slate-400">Decide later · the invite lasts about {hours} more hour{hours === 1 ? "" : "s"}</button>
        </div>
      </div>
    </ModalPortal>
  );
}
