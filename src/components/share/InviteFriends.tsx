"use client";

// Invite friends (US-7.2): your link, what it pays, and who joined through it.

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { gameAudio } from "@/utils/gameAudio";

interface Mine { reward: number; invited: Array<{ username: string; rewarded: boolean }> }

export function InviteFriends({ username }: { username: string }) {
  const [mine, setMine] = useState<Mine | null>(null);
  useEffect(() => { void supabase().rpc("my_referrals").then(({ data }) => data && setMine(data as Mine)); }, []);

  const invite = async () => {
    gameAudio.playClickSound();
    const url = `${window.location.origin}/?ref=${username}`;
    const text = `Come live in Dubai with me 🏙️ We both get AED ${(mine?.reward ?? 0).toLocaleString()} once you've played 3 days.`;
    if (navigator.share) { try { await navigator.share({ title: "Dubai Life", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Invite link copied" }));
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-100 p-4 space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">💌</span>
        <div className="flex-1">
          <p className="font-black leading-tight">Invite friends</p>
          <p className="text-xs text-slate-600">You both get AED {(mine?.reward ?? 0).toLocaleString()} when they&apos;ve played 3 days and verified their email.</p>
        </div>
      </div>
      <button onClick={invite} className="w-full h-11 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Send my invite link</button>
      {mine && mine.invited.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mine.invited.map((i) => (
            <span key={i.username} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${i.rewarded ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600"}`}>@{i.username} {i.rewarded ? "✓ paid" : "· playing"}</span>
          ))}
        </div>
      )}
    </div>
  );
}
