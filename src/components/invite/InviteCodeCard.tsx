"use client";

// Your invite link, for friends who don't use WhatsApp (or you'd rather not): copy it, or share it any other way (the
// phone's share sheet: SMS, Telegram, Instagram, email…). The link carries your referral code (?ref=), so whoever
// signs up with it counts as your friend.

import { useState } from "react";
import { inviteLink } from "@/lib/bigMissions";
import { gameAudio } from "@/utils/gameAudio";

export function InviteCodeCard({ username, message, onShared, dark = true }: {
  username: string;
  /** The message that goes with the link when it's shared. */
  message: string;
  /** Told what was done (for the back office's funnel). */
  onShared?: (how: "copy" | "share") => void;
  dark?: boolean;
}) {
  const [done, setDone] = useState(false);
  const link = inviteLink(username);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${message.trim()}\n${link}`);
      gameAudio.playClickSound(); onShared?.("copy"); setDone(true); setTimeout(() => setDone(false), 1800);
    } catch { /* not allowed */ }
  };
  const share = async () => {
    gameAudio.playClickSound();
    if (navigator.share) {
      try { await navigator.share({ title: "Dubai Life", text: message.trim(), url: link }); onShared?.("share"); return; } catch { /* cancelled */ return; }
    }
    void copy();
  };
  const box = dark ? "bg-white/[0.07] ring-1 ring-white/10" : "bg-slate-50 ring-1 ring-slate-200";
  const sub = dark ? "text-slate-400" : "text-slate-500";
  const btn = dark ? "bg-white/15 text-white" : "bg-slate-900 text-white";
  return (
    <div className="space-y-2 text-left">
      <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${box}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-wider ${sub}`}>Your invite link</p>
          <a href={link} onClick={(e) => { e.preventDefault(); void copy(); }} className="block text-xs font-bold underline truncate">{link.replace(/^https?:\/\//, "")}</a>
        </div>
        <button onClick={() => void copy()} className={`h-9 px-3 rounded-xl text-xs font-black ${btn}`}>{done ? "Copied ✓" : "Copy link"}</button>
      </div>
      <button onClick={() => void share()} className={`w-full h-11 rounded-2xl text-sm font-black ${dark ? "bg-white/10" : "bg-slate-100 text-slate-900"}`}>📤 Share another way (SMS, Telegram, Instagram…)</button>
      <p className={`text-[11px] ${sub}`}>Your link carries your referral code: whoever signs up with it counts as your friend.</p>
    </div>
  );
}
