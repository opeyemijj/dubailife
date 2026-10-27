"use client";

// Runs on every page while signed in: a proposal arrives full screen, a date request as a note at the top,
// and someone who signed up from a wedding invitation is taken back to that wedding.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useCitizen } from "@/lib/citizenStore";
import { datePlaceOf, respond, ringOf, useLove } from "@/lib/love";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { PENDING_WEDDING } from "./WeddingPage";

export function LoveListener() {
  const { citizen, needsOnboarding } = useCitizen();
  const love = useLove(citizen?.id);
  const router = useRouter();
  const pathname = usePathname();
  const [seen, setSeen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  // Back from signing up through a wedding invitation (once onboarding is done).
  useEffect(() => {
    if (!citizen?.id || needsOnboarding || pathname.startsWith("/onboarding") || pathname.startsWith("/wedding")) return;
    let code: string | null = null;
    try { code = localStorage.getItem(PENDING_WEDDING); } catch { /* storage off */ }
    if (code) router.push(`/wedding/${code}`);
  }, [citizen?.id, needsOnboarding, pathname, router]);

  const proposal = love?.incoming.find((q) => q.kind === "propose" && !seen.includes(q.id));
  const date = love?.incoming.find((q) => q.kind === "date" && !seen.includes(q.id));
  if (!proposal && !date) return null;

  if (proposal) {
    const answer = async (yes: boolean) => {
      setBusy(true);
      await respond(proposal.id, yes);
      setBusy(false);
      setSeen((s) => [...s, proposal.id]);
    };
    return (
      <ModalPortal>
        <div role="dialog" aria-modal="true" aria-label="A proposal" className="fixed inset-0 z-[220] bg-gradient-to-b from-rose-900/95 via-rose-700/95 to-amber-600/95 text-white flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5 animate-[sheetUp_0.4s_ease-out]">
            <div className="text-7xl">{ringOf(proposal.ring)?.icon ?? "💍"}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rosterThumb(presetFor(proposal.from.look ?? { gender: "man" }))} alt="" className="w-28 h-28 mx-auto rounded-full object-cover object-top ring-4 ring-white/80" />
            <h2 className="text-3xl font-black leading-tight">@{proposal.from.username} is asking you to marry them</h2>
            <p className="text-white/85">{ringOf(proposal.ring)?.name} · {datePlaceOf(proposal.place)?.label}</p>
            {proposal.message && <p className="text-xl italic">&ldquo;{proposal.message}&rdquo;</p>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button disabled={busy} onClick={() => answer(false)} className="h-14 rounded-full bg-white/20 font-semibold text-lg">Not yet</button>
              <button disabled={busy} onClick={() => answer(true)} className="h-14 rounded-full bg-white text-rose-600 font-black text-lg">Yes! 💍</button>
            </div>
            <button onClick={() => setSeen((s) => [...s, proposal.id])} className="text-sm text-white/70">Decide later (it&apos;s in Hayati)</button>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <div className="fixed top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] inset-x-0 z-[140] px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto flex items-center gap-3 p-2.5 rounded-[24px] bg-white text-slate-900 shadow-xl">
        <span className="text-3xl pl-1">💌</span>
        <p className="flex-1 min-w-0 font-semibold leading-tight">@{date!.from.username} asked you out</p>
        <button onClick={() => { setSeen((s) => [...s, date!.id]); openPhone("hayati"); }} className="h-10 px-4 rounded-full bg-rose-500 text-white font-semibold">Answer</button>
        <button onClick={() => setSeen((s) => [...s, date!.id])} aria-label="Later" className="w-8 h-8 rounded-full text-slate-400">✕</button>
      </div>
    </div>
  );
}
