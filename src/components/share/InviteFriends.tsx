"use client";

// Invite friends (US-7.2) + Contextual Viral Deep-Links:
// Lets players share specific multiplayer invitations (Move to Dubai, 3D Pool Challenge,
// Venture Co-Founder Crew, or Open House Visit) via WhatsApp, iMessage, or copy link.

import { useEffect, useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { gameAudio } from "@/utils/gameAudio";

interface Mine { reward: number; invited: Array<{ username: string; rewarded: boolean }> }

const INVITE_MODES = [
  {
    id: "city",
    icon: "🏙️",
    label: "Live in Dubai",
    go: "",
    desc: (reward: number) => `Come live in Dubai with me 🏙️ We both get AED ${reward.toLocaleString()} once you've played 3 days!`,
  },
  {
    id: "pool",
    icon: "🎱",
    label: "3D Pool Match",
    go: "/games/pool",
    desc: (reward: number) => `Play me in 3D 8-Ball Pool in Dubai Life 🎱 Jump straight to my table (plus AED ${reward.toLocaleString()} bonus)!`,
  },
  {
    id: "venture",
    icon: "🏢",
    label: "Venture Crew",
    go: "/ventures",
    desc: (reward: number) => `Co-found a Dubai Venture with me 🏢 Each partner boosts daily profit up to 3× (plus AED ${reward.toLocaleString()} bonus)!`,
  },
  {
    id: "home",
    icon: "🏠",
    label: "Visit My Home",
    go: "/home",
    desc: (reward: number) => `Come visit my 3D home in Dubai Life 🏠 Doors are open right now!`,
  },
] as const;

export function InviteFriends({ username }: { username: string }) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [modeId, setModeId] = useState<(typeof INVITE_MODES)[number]["id"]>("city");
  useEffect(() => { void supabase().rpc("my_referrals").then(({ data }) => data && setMine(data as Mine)); }, []);

  const activeMode = INVITE_MODES.find((m) => m.id === modeId) ?? INVITE_MODES[0];
  const rewardAed = mine?.reward ?? 2500;

  const buildSharePayload = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cometodubai.com";
    const goParam = activeMode.go ? `&go=${encodeURIComponent(activeMode.go)}` : "";
    const url = `${origin}/?ref=${encodeURIComponent(username)}${goParam}`;
    const text = activeMode.desc(rewardAed);
    return { url, text };
  };

  const invite = async () => {
    gameAudio.playClickSound();
    const { url, text } = buildSharePayload();
    if (navigator.share) { try { await navigator.share({ title: "Dubai Life", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Invite link copied" }));
  };

  const shareWhatsApp = () => {
    gameAudio.playClickSound();
    const { url, text } = buildSharePayload();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
  };

  const copyLinkOnly = async () => {
    gameAudio.playClickSound();
    const { url, text } = buildSharePayload();
    try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "🔗 Invite link copied to clipboard" }));
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-emerald-50/70 to-amber-50/60 border border-sky-100 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl shrink-0">💌</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black leading-tight text-slate-900">Invite & Play Together</p>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              +AED {rewardAed.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            You both get AED {rewardAed.toLocaleString()} after 3 days — plus <b className="text-slate-800">+25% Crowd Bonus</b> when in the same 3D room!
          </p>
        </div>
      </div>

      {/* Contextual Deep-Link Mode Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {INVITE_MODES.map((m) => {
          const active = m.id === modeId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { gameAudio.playClickSound(); setModeId(m.id); }}
              className={`px-2.5 py-2 rounded-2xl text-left border transition-all active:scale-95 ${
                active
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
              }`}
            >
              <span className="text-base block leading-none">{m.icon}</span>
              <span className="text-[11px] font-black block mt-1 truncate">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons: Share / WhatsApp / Copy */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={invite}
          className="flex-1 h-11 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Share2 className="w-4 h-4" /> Share {activeMode.label}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="h-11 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          title="Send on WhatsApp"
        >
          <MessageCircle className="w-4 h-4" /> <span className="hidden xs:inline">WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={copyLinkOnly}
          className="w-11 h-11 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-black flex items-center justify-center shrink-0 active:scale-95"
          title="Copy invite link"
          aria-label="Copy invite link"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {mine && mine.invited.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {mine.invited.map((i) => (
            <span key={i.username} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${i.rewarded ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600"}`}>
              @{i.username} {i.rewarded ? "✓ paid" : "· playing"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
