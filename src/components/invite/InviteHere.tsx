"use client";

// "Invite": bring someone to where you are (a venue, a course, a campus, the marathon…). Players by username, friends
// or chats get it in their Invites app with a notification; anyone else gets the link (WhatsApp, or any app), signs up
// (crediting you) and lands right here.

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useCitizen } from "@/lib/citizenStore";
import { createVisit } from "@/lib/invites";
import { inviteFriends } from "@/lib/invite";
import { gameAudio } from "@/utils/gameAudio";
import { InviteSheet } from "./InviteSheet";

export function InviteHere({ title, label = "", route, text, className = "", compact, children }: {
  /** What they're invited to: "Grand Pool Club", "Real Estate & Property Investment". */
  title: string;
  /** Where or what it is, under the title on the invite page: "Atlantis · Pool". */
  label?: string;
  /** The page (this one by default). */
  route?: string;
  /** The message sent with the link. */
  text?: string;
  className?: string;
  /** Just the icon on phones. */
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const { citizen } = useCitizen();
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const open = async () => {
    gameAudio.playClickSound();
    // Not signed in: the plain invite to the game.
    if (!citizen?.id) { void inviteFriends(); return; }
    setBusy(true);
    const r = await createVisit(route ?? `${window.location.pathname}${window.location.search}`, title, label);
    setBusy(false);
    if (r.code) setCode(r.code);
    else { setNote(r.error ?? "Couldn't make the link."); setTimeout(() => setNote(null), 3000); }
  };
  return (
    <>
      <button onClick={open} disabled={busy} aria-label={`Invite people to ${title}`}
        className={className || "h-10 px-3 rounded-full bg-fuchsia-600 text-white shadow-lg flex items-center gap-1.5 text-xs font-black disabled:opacity-60"}>
        {children ?? <><UserPlus className="w-4 h-4" /> <span className={compact ? "hidden sm:inline" : ""}>Invite</span></>}
      </button>
      {note && <span className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[220] rounded-full bg-slate-950 text-white text-xs font-bold px-3 py-2">{note}</span>}
      {code && <InviteSheet code={code} title={title} text={text ?? `📍 Come and see ${title} with me on Dubai Life!`} onClose={() => setCode(null)} />}
    </>
  );
}
