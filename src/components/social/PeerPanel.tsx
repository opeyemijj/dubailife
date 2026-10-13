"use client";

// What you can do with someone nearby: talk, pay, wave, invite, befriend — plus what fits the
// place (buy them a drink at a club, treat them at a café).

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, HandCoins, MessageCircle, Send, X } from "lucide-react";
import type { ChatMessage, Peer } from "@/lib/room";
import type { Product } from "@/lib/city/types";

export type SocialContext = "club" | "dining" | "home" | "venue";

const AMOUNTS = [20, 50, 100, 500];

export function PeerPanel({
  peer, context, balance, treat, onClose, onChat, onSendMoney, onWave, onInvite, onTreat, onFriend,
  messages, typing, onTyping, onThread, startIn = "menu", unread = 0,
}: {
  /** This conversation, oldest first. */
  messages: ChatMessage[];
  /** They're typing right now. */
  typing: boolean;
  onTyping: () => void;
  /** Told when the conversation is on screen (so it counts as read). */
  onThread: (open: boolean) => void;
  startIn?: "menu" | "chat" | "money";
  unread?: number;
  peer: Peer;
  context: SocialContext;
  balance: number;
  /** Something to buy them here (a cocktail, a coffee…). */
  treat?: Product | null;
  onClose: () => void;
  onChat: (text: string) => void;
  onSendMoney: (amount: number) => Promise<string | null>;
  onWave: () => void;
  onInvite: (kind: "join" | "dance") => void;
  onTreat?: () => void;
  onFriend: () => Promise<string>;
}) {
  const [mode, setMode] = useState<"menu" | "chat" | "money">(startIn);
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "chat") return;
    onThread(true);
    return () => onThread(false);
  }, [mode, onThread]);
  // Keep the newest line in view.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing, mode]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const action = (icon: string, label: string, onClick: () => void, hint?: string) => (
    <button onClick={onClick} className="flex items-center gap-3 w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-left active:scale-[0.99]">
      <span className="text-xl w-7 text-center">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-black text-slate-900">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500 truncate">{hint}</span>}
      </span>
    </button>
  );

  const pay = async () => {
    setBusy(true);
    const error = await onSendMoney(amount);
    setBusy(false);
    if (error) setNote(error);
    else { setNote(null); setMode("menu"); }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-20 sm:w-[360px] z-40 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[62vh] sm:max-h-[80vh] flex flex-col text-slate-900">
        <div className="flex items-center gap-2 p-4 pb-2">
          {mode !== "menu" && <button onClick={() => { setMode("menu"); setNote(null); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-white font-black flex items-center justify-center">{peer.name.slice(0, 1).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black leading-tight truncate">{peer.name}</div>
            <div className="text-[11px] font-bold text-sky-600">@{peer.username}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto p-4 pt-1 space-y-2">
          {mode === "menu" && (
            <>
              {action("💬", unread ? `Chat · ${unread} new` : "Chat", () => setMode("chat"), messages.length ? `“${messages[messages.length - 1].text}”` : `Say something to @${peer.username}`)}
              {action("💸", "Send money", () => setMode("money"), "Straight from your wallet")}
              {context === "club" && treat && onTreat && action("🍸", `Buy them a ${treat.name.toLowerCase()}`, onTreat, `AED ${treat.price} · served at the bar`)}
              {context === "dining" && treat && onTreat && action(treat.icon, `Treat them to ${treat.name.toLowerCase()}`, onTreat, `AED ${treat.price}`)}
              {context === "club" && action("💃", "Dance together", () => onInvite("dance"), "Invite them to the dance floor")}
              {context !== "home" && action("🙌", "Come join me", () => onInvite("join"), "They'll walk over if they accept")}
              {action("👋", "Wave", onWave)}
              {action("🤝", "Add friend", async () => setNote(await onFriend()), "Friends can visit each other's homes")}
              {note && <p className="text-xs font-bold text-emerald-700 text-center">{note}</p>}
            </>
          )}

          {mode === "chat" && (
            <div ref={thread} className="h-[34vh] sm:h-72 overflow-y-auto space-y-1.5 rounded-2xl bg-slate-50 p-2">
              {messages.length === 0 && <p className="text-[11px] text-slate-400 text-center py-6">No messages yet. Say hi to @{peer.username} 👋</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3 py-1.5 rounded-2xl text-sm break-words ${m.mine ? "bg-sky-500 text-white rounded-br-md" : "bg-white border border-slate-200 text-slate-900 rounded-bl-md"}`}>
                    {m.text}
                    <div className={`text-[9px] mt-0.5 ${m.mine ? "text-white/70" : "text-slate-400"}`}>
                      {new Date(m.at).toLocaleDateString() === new Date().toLocaleDateString() ? "" : `${new Date(m.at).toLocaleDateString([], { weekday: "short" })} `}
                      {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.failed ? " · not saved" : ""}
                    </div>
                  </div>
                </div>
              ))}
              {typing && <div className="text-[11px] text-slate-400 italic px-1">@{peer.username} is typing…</div>}
            </div>
          )}
          {mode === "chat" && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button onClick={() => setMode("money")} className="shrink-0 h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">💸 Send money</button>
              <button onClick={onWave} className="shrink-0 h-8 px-3 rounded-full bg-slate-100 text-xs font-bold">👋 Wave</button>
              {treat && onTreat && context !== "home" && <button onClick={onTreat} className="shrink-0 h-8 px-3 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{treat.icon} Treat them</button>}
              {context !== "home" && <button onClick={() => onInvite("join")} className="shrink-0 h-8 px-3 rounded-full bg-sky-50 text-sky-700 text-xs font-bold">🙌 Come join me</button>}
              {context === "club" && <button onClick={() => onInvite("dance")} className="shrink-0 h-8 px-3 rounded-full bg-fuchsia-50 text-fuchsia-700 text-xs font-bold">💃 Dance</button>}
            </div>
          )}
          {mode === "chat" && (
            <form
              onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; onChat(t); setText(""); }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={text}
                maxLength={160}
                onChange={(e) => { setText(e.target.value); if (e.target.value) onTyping(); }}
                placeholder={`Message @${peer.username}`}
                className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-base"
              />
              <button className="h-11 w-11 rounded-xl bg-sky-500 text-white flex items-center justify-center" aria-label="Send"><Send className="w-4 h-4" /></button>
            </form>
          )}
          {mode === "chat" && <p className="text-[11px] text-slate-500 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Live, and saved for 7 days so you can pick up later. Be kind.</p>}

          {mode === "money" && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map((a) => (
                  <button key={a} onClick={() => setAmount(a)} className={`h-10 rounded-xl text-sm font-black ${amount === a ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>{a}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-3">
                <span className="text-xs font-black text-slate-400">AED</span>
                <input type="number" min={1} max={10000000} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="flex-1 text-base font-black outline-none bg-transparent" />
              </label>
              <p className="text-[11px] text-slate-500">You have AED {balance.toLocaleString()} · after: AED {(balance - amount).toLocaleString()}</p>
              <button disabled={busy || amount < 1 || amount > balance} onClick={pay} className="w-full h-12 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black flex items-center justify-center gap-2">
                <HandCoins className="w-4 h-4" /> {busy ? "Sending…" : `Send AED ${amount.toLocaleString()} to @${peer.username}`}
              </button>
              {note && <p className="text-xs font-bold text-rose-600 text-center">{note}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
