"use client";

// The invite draw's popup for returning players (lib/draw): "Invite 10 friends via WhatsApp and win AED 5,000 in our
// January Draw", with one clear call to action (WhatsApp, your link added), your progress, and how it works. It opens
// by itself once a visit, on its own (it takes a turn in lib/popups, so nothing else opens on top of it), and from
// the 🎟️ button on the map's rail.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useCitizen } from "@/lib/citizenStore";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { openWhatsApp } from "@/lib/bigMissions";
import { DRAW, DRAW_EVENT, DRAW_SESSION_KEY, drawOpen, isReturning, logInvite, useDraw, type MyDraw } from "@/lib/draw";
import { gameAudio } from "@/utils/gameAudio";
import { InviteCodeCard } from "@/components/invite/InviteCodeCard";

/** Pages it never opens by itself on: the back office, signing in and setting up, and the legal pages. */
const QUIET = /^\/(admin|auth|onboarding|verify-email|reset-password|privacy|terms|cookies|prize-rules|community-guidelines|delete-account|unsubscribe|legal|dev)\b/;

export function DrawPopupHost() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const data = useDraw(citizen?.id);
  const [asked, setAsked] = useState(false);
  // Opened from the rail's button (the popup's own turn opens it by itself).
  const [manual, setManual] = useState(false);
  const eligible = !!citizen && drawOpen() && isReturning(citizen.createdAt) && path !== "/" && !QUIET.test(path);

  // Once a visit, a moment after you're in, while you haven't got all your entries yet... and it's the only one up.
  useEffect(() => {
    if (!eligible || asked) return;
    let seen = "";
    try { seen = sessionStorage.getItem(DRAW_SESSION_KEY) ?? ""; } catch { /* storage blocked */ }
    if (seen === citizen?.id) return;
    const t = setTimeout(() => setAsked(true), 1500);
    return () => clearTimeout(t);
  }, [eligible, asked, citizen?.id]);
  const turn = usePopupTurn("invite-draw", asked && eligible, POPUP.live);
  useEffect(() => {
    if (!turn) return;
    try { sessionStorage.setItem(DRAW_SESSION_KEY, citizen?.id ?? "1"); } catch { /* storage blocked */ }
  }, [turn, citizen?.id]);
  // From the rail's 🎟️ button.
  useEffect(() => {
    const f = () => setManual(true);
    window.addEventListener(DRAW_EVENT, f);
    return () => window.removeEventListener(DRAW_EVENT, f);
  }, []);

  if (!(turn || manual) || !citizen) return null;
  // Closing hands the turn back (the next popup in line can open) and doesn't come back this visit.
  const close = () => { setManual(false); setAsked(false); try { sessionStorage.setItem(DRAW_SESSION_KEY, citizen.id); } catch { /* storage blocked */ } };
  return <DrawSheet data={data} username={citizen.username} onClose={close} />;
}

function DrawSheet({ data, username, onClose }: { data: MyDraw | null; username: string; onClose: () => void }) {
  useEffect(() => { logInvite("view"); }, []);
  const joined = data?.joined ?? 0, pending = data?.pending ?? 0, entries = data?.entries ?? 0;
  const inThisRound = joined % DRAW.target, toGo = DRAW.target - inThisRound;
  const whatsapp = () => { gameAudio.playClickSound(); logInvite("whatsapp"); openWhatsApp(DRAW.message, username); };
  const later = () => { logInvite("later"); onClose(); };
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[320] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Invite ${DRAW.target} friends and win AED ${DRAW.prizeAed.toLocaleString()}`}>
        <div className="relative w-full sm:max-w-md max-h-[94dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 text-white shadow-2xl px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
          <button onClick={later} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <p className="text-6xl">🎟️</p>
          <p className="mt-2 text-xs font-black tracking-[0.25em] text-emerald-300">{DRAW.title.toUpperCase()}</p>
          <h2 className="mt-2 text-[1.9rem] leading-[1.1] font-black">
            Invite {DRAW.target} friends via WhatsApp and win <span className="text-amber-300">AED {DRAW.prizeAed.toLocaleString()}</span>
          </h2>
          <p className="mt-2 text-sm text-slate-300">Every {DRAW.target} friends who join Dubai Life with your link is one entry in our {DRAW.title}, drawn on {DRAW.drawDate}. More friends, more entries.</p>

          {/* Your progress to the next entry. */}
          <div className="mt-4 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3">
            <div className="flex justify-center gap-1.5 flex-wrap">
              {Array.from({ length: DRAW.target }, (_, i) => (
                <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i < inThisRound ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white/40"}`}>{i < inThisRound ? "✓" : i + 1}</span>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-300">
              {entries > 0 ? `🎉 ${entries} entr${entries === 1 ? "y" : "ies"} in the draw · ` : ""}{toGo} more friend{toGo === 1 ? "" : "s"} for {entries > 0 ? "another" : "your"} entry
              {pending > 0 ? ` · ${pending} signed up, not counted yet` : ""}
            </p>
          </div>

          {/* The one thing to do. */}
          <button onClick={whatsapp} className="mt-4 w-full h-16 rounded-2xl bg-[#25D366] text-white text-lg font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 active:scale-[0.98]">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" /></svg>
            Invite friends on WhatsApp
          </button>
          {/* No WhatsApp (or rather not): the code, the link, or any other app. */}
          <div className="mt-3"><InviteCodeCard username={username} message={DRAW.message} onShared={() => logInvite("copy")} /></div>
          <button onClick={later} className="mt-1 w-full h-10 text-xs font-bold text-slate-400">Maybe later</button>

          <p className="mt-2 text-[11px] text-slate-500">
            A friend counts once they sign up with your link, verify their email and play for {DRAW.joinMinutes} minutes. Free to enter, {DRAW.title} closes {DRAW.drawDate}. <Link href="/prize-rules#draw" className="underline">Rules</Link>
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}
