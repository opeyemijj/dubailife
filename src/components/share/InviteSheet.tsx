"use client";

// Invite friends to a party or a Space, outside the app (requirements R9): WhatsApp first, then the phone's share
// sheet, or the link copied. The link signs a new player up and takes them straight in (?go=), counts them as the
// host's invite (?ref= for new players, ?via= for everyone: public.came_via), and so toward the host's rewards.

import { useState } from "react";
import { Copy, MessageCircle, Share2, X } from "lucide-react";
import { SITE } from "@/lib/site";
import { useScreenBusy } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";

export type InviteKind = "party" | "space" | "race";

/** The link: the landing page, which remembers who invited them and where to go. */
export function inviteUrl(me: string, path: string, kind: InviteKind, ref: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : SITE.url;
  const q = new URLSearchParams({ ref: me, go: path, via: `${me}:${kind}:${ref}` });
  return `${origin}/?${q.toString()}`;
}

export function InviteSheet({ me, kind, refId, path, title, onClose, progress }: {
  me: string; kind: InviteKind; refId: string; path: string; title: string; onClose: () => void;
  /** e.g. "3 of 10 friends here" */
  progress?: string;
}) {
  useScreenBusy(true);
  const [note, setNote] = useState<string | null>(null);
  const url = inviteUrl(me, path, kind, refId);
  const text = kind === "party"
    ? `I'm hosting a party in ${SITE.name} right now: "${title}". Come join me! 🎉`
    : kind === "race"
    ? `Race me at Dubai Autodrome in ${SITE.name}! ${title} 🏁 Bring your car.`
    : `I'm live on ${SITE.name} Spaces: "${title}". Come listen and talk with us! 🎙️`;

  const whatsapp = () => {
    gameAudio.playClickSound();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
    setNote("Sent to WhatsApp. Pick a chat or group.");
  };
  const share = async () => {
    gameAudio.playClickSound();
    if (navigator.share) {
      try { await navigator.share({ title: SITE.name, text, url }); setNote("Shared."); return; } catch { /* cancelled */ }
    }
    await copy();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text} ${url}`); setNote("Link copied. Paste it anywhere."); } catch { setNote("Couldn't copy. Long-press the link below."); }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Invite friends">
        <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-2xl">
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <div className="pr-8">
            <h2 className="text-xl font-black">Invite friends</h2>
            <p className="text-sm text-slate-600">
              {kind === "race" ? "Send the link to friends with cars. They join your race in one tap." : <>{kind === "party" ? "10 friends at your party pays AED 10M." : "20 listeners pays AED 10M."} Each friend who comes from your link pays AED 1M.</>}
            </p>
            {progress && <p className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{progress}</p>}
          </div>
          <button onClick={whatsapp} className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2"><MessageCircle className="w-5 h-5" /> Invite on WhatsApp</button>
          <div className="flex gap-2">
            <button onClick={() => void share()} className="flex-1 h-11 rounded-2xl bg-slate-100 font-black text-sm flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" /> Share</button>
            <button onClick={() => void copy()} className="flex-1 h-11 rounded-2xl bg-slate-100 font-black text-sm flex items-center justify-center gap-1.5"><Copy className="w-4 h-4" /> Copy link</button>
          </div>
          <p className="text-[11px] text-slate-400 break-all select-all">{url}</p>
          {note && <p className="text-xs font-bold text-emerald-700">{note}</p>}
        </div>
      </div>
    </ModalPortal>
  );
}
