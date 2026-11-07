"use client";

// What you can do with someone nearby: talk, pay, wave, invite, befriend — plus what fits the
// place (buy them a drink at a club, treat them at a café).

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, Flag, HandCoins, MessageCircle, Send, X } from "lucide-react";
import { broadcastRoomEvent, type ChatMessage, type Peer } from "@/lib/room";
import type { Product } from "@/lib/city/types";
import { blockUser, REPORT_REASONS, reportUser, type ReportReason } from "@/lib/safety";
import { adjustBalance, boostNeed, useCitizen } from "@/lib/citizenStore";
import { CelebrityBoxingModal } from "@/components/games/CelebrityBoxingModal";
import { gameAudio } from "@/utils/gameAudio";

export type SocialContext = "club" | "dining" | "home" | "venue";

const AMOUNTS = [20, 50, 100, 500];

/** Asking someone who's away: it waits for them. */
const AWAY_NOTE = "💤 They're away: they'll see it when they're back (5 minutes)";

export function PeerPanel({
  peer, context, balance, treat, onClose, onChat, onSendMoney, onWave, onInvite, onTreat, onFriend, canInviteToTable = false,
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
  onInvite: (kind: "join" | "dance" | "table") => void;
  /** I'm seated at a table or booth, so I can invite them to it. */
  canInviteToTable?: boolean;
  onTreat?: () => void;
  onFriend: () => Promise<string>;
}) {
  const { citizen } = useCitizen();
  const [mode, setMode] = useState<"menu" | "chat" | "money" | "safety" | "rock" | "spray">(startIn);
  const [boxingOpen, setBoxingOpen] = useState(false);
  const [rockCombo, setRockCombo] = useState(0);
  const [sprayDenom, setSprayDenom] = useState(100);
  const [sprayedTotal, setSprayedTotal] = useState(0);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
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

  const report = async () => {
    if (!reason) return;
    setBusy(true);
    const error = await reportUser(peer.userId, reason, context, details);
    setBusy(false);
    setNote(error ?? "Thanks. Our team will review it within 24 hours.");
    if (!error) { setReason(null); setDetails(""); }
  };
  const block = async () => {
    setBusy(true);
    const error = await blockUser(peer.userId);
    setBusy(false);
    if (error) setNote(error); else onClose();
  };

  return (
    <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-20 sm:w-[360px] z-40 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[62vh] sm:max-h-[80vh] flex flex-col text-slate-900">
        <div className="flex items-center gap-2 p-4 pb-2">
          {mode !== "menu" && <button onClick={() => { setMode("menu"); setNote(null); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-white font-black flex items-center justify-center">{peer.name.slice(0, 1).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black leading-tight truncate">{peer.name}</div>
            <div className="text-[11px] font-bold text-sky-600">@{peer.username}{peer.away && <span className="ml-1.5 text-slate-500">· 💤 Away</span>}</div>
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
              {canInviteToTable && action("🪑", "Invite to my table", () => onInvite("table"), peer.away ? AWAY_NOTE : "They'll take a free seat with you if they accept")}
              {context === "club" && action("💃", "Dance together", () => onInvite("dance"), peer.away ? AWAY_NOTE : "You'll dance facing each other")}
              {action(
                "🍑",
                `Rock with @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  broadcastRoomEvent({ type: "rock", targetId: peer.userId, targetUsername: peer.username });
                  setRockCombo(1);
                  setMode("rock");
                },
                "2-Player Beat-Sync Party Rocking Dance (+Social & Hype)"
              )}
              {action(
                "💸",
                `Spray Money on @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  setSprayedTotal(0);
                  setMode("spray");
                },
                "Flick crisp AED bills into the air (Owambe & VIP style)"
              )}
              {action(
                "🥊",
                `Challenge to Celebrity Boxing`,
                () => {
                  gameAudio.playClickSound();
                  broadcastRoomEvent({ type: "boxing", targetId: peer.userId, targetUsername: peer.username, purse: 2500 });
                  setBoxingOpen(true);
                },
                "Enter the 3D Boxing Ring for a live prize purse bout"
              )}
              {action(
                "👋⚡",
                `Slap @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  broadcastRoomEvent({ type: "slap", targetId: peer.userId, targetUsername: peer.username });
                  setNote(`👋⚡ You slapped @${peer.username}! They have 1.2s to dodge or fight back!`);
                },
                "Triggers 1.2s reflex dodge QTE or 1v1 brawl"
              )}
              {action(
                "👊🔥",
                `Rally Gang Beat vs @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  broadcastRoomEvent({
                    type: "gang_beat",
                    targetId: peer.userId,
                    targetUsername: peer.username,
                    allies: [citizen?.username ?? "you"],
                  });
                  setNote(`👊🔥 Rallied the room to gang-jump @${peer.username}! Waiting for 2+ allies...`);
                },
                "Call 2+ players in the room to jump them together"
              )}
              {context !== "home" && !canInviteToTable && action("🙌", "Come join me", () => onInvite("join"), peer.away ? AWAY_NOTE : "They'll walk over if they accept")}
              {action("👋", "Wave", onWave)}
              {action("🤝", "Add friend", async () => setNote(await onFriend()), "Friends can visit each other's homes")}
              {note && <p className="text-xs font-bold text-emerald-700 text-center">{note}</p>}
              <button onClick={() => { setMode("safety"); setNote(null); }} className="flex items-center justify-center gap-1.5 w-full pt-1 text-[11px] font-bold text-slate-400 hover:text-rose-600">
                <Flag className="w-3 h-3" /> Report or block @{peer.username}
              </button>
            </>
          )}

          {mode === "safety" && (
            <>
              <p className="text-xs font-black text-slate-700">What&apos;s wrong?</p>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <button key={r.id} onClick={() => setReason(r.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold border ${reason === r.id ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-slate-50 border-slate-100"}`}>{r.label}</button>
                ))}
              </div>
              {reason && (
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={2}
                  placeholder="Anything we should know? (optional)" className="w-full rounded-xl border border-slate-200 p-2.5 text-base" />
              )}
              <button disabled={!reason || busy} onClick={report} className="w-full h-11 rounded-xl bg-rose-600 disabled:opacity-40 text-white font-black flex items-center justify-center gap-2">
                <Flag className="w-4 h-4" /> Send report
              </button>
              {note && <p className="text-xs font-bold text-slate-600 text-center">{note}</p>}
              <div className="border-t border-slate-100 pt-2">
                {confirmBlock ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">@{peer.username} won&apos;t be able to message you, add you, send you money or knock on your door. They aren&apos;t told.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmBlock(false)} className="flex-1 h-10 rounded-xl bg-slate-100 text-sm font-black">Cancel</button>
                      <button disabled={busy} onClick={block} className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-black">Block</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmBlock(true)} className="w-full h-10 rounded-xl bg-slate-100 text-sm font-black flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> Block @{peer.username}</button>
                )}
              </div>
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
              {canInviteToTable && <button onClick={() => onInvite("table")} className="shrink-0 h-8 px-3 rounded-full bg-sky-50 text-sky-700 text-xs font-bold">🪑 Join my table</button>}
              {context !== "home" && !canInviteToTable && <button onClick={() => onInvite("join")} className="shrink-0 h-8 px-3 rounded-full bg-sky-50 text-sky-700 text-xs font-bold">🙌 Come join me</button>}
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700">Quick Amount</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Zero Limit</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { label: "100", val: 100 },
                  { label: "1K", val: 1_000 },
                  { label: "10K", val: 10_000 },
                  { label: "100K", val: 100_000 },
                  { label: "1M", val: 1_000_000 },
                  { label: "MAX", val: Math.max(1, balance) },
                ].map((a) => (
                  <button key={a.label} onClick={() => setAmount(a.val)} className={`h-9 rounded-xl text-xs font-black ${amount === a.val ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>{a.label}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-3">
                <span className="text-xs font-black text-slate-400">AED</span>
                <input type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="flex-1 text-base font-black outline-none bg-transparent" />
                <button type="button" onClick={() => setAmount(Math.max(1, balance))} className="text-[11px] font-black text-emerald-600 hover:text-emerald-700">MAX</button>
              </label>
              <p className="text-[11px] text-slate-500">You have AED {balance.toLocaleString()} · after: AED {Math.max(0, balance - amount).toLocaleString()}</p>
              <button disabled={busy || amount < 1 || amount > balance} onClick={pay} className="w-full h-12 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black flex items-center justify-center gap-2">
                <HandCoins className="w-4 h-4" /> {busy ? "Sending…" : `Send AED ${amount.toLocaleString()} to @${peer.username}`}
              </button>
              {note && <p className="text-xs font-bold text-rose-600 text-center">{note}</p>}
            </>
          )}

          {mode === "rock" && (
            <div className="space-y-3 text-center py-2">
              <div className="text-xs font-black uppercase tracking-wider text-fuchsia-600">
                🍑 2-Player Party Rocking Beat-Sync
              </div>
              <p className="text-xs text-slate-600">
                Bending forward & rocking on the beat with <span className="font-black text-slate-900">@{peer.username}</span>! Tap on the rhythm pulse to build your Hype Combo!
              </p>
              <div className="py-3 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClickSound();
                    const next = rockCombo + 1;
                    setRockCombo(next);
                    boostNeed("fun", 6);
                    boostNeed("social", 6);
                    broadcastRoomEvent({ type: "rock", targetId: peer.userId, targetUsername: peer.username });
                    if (next % 5 === 0) {
                      adjustBalance(100);
                      gameAudio.playCoinSound();
                      setNote(`🔥 ${next}× ROCKING FEVER COMBO! Crowd throws +AED 100!`);
                    }
                  }}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white font-black shadow-xl ring-4 ring-fuchsia-300 active:scale-90 transition flex flex-col items-center justify-center"
                >
                  <span className="text-2xl">🍑🔥</span>
                  <span className="text-xs">TAP BEAT</span>
                  <span className="text-[11px] text-amber-100">Combo ×{rockCombo}</span>
                </button>
              </div>
              {note && <p className="text-xs font-black text-emerald-600">{note}</p>}
            </div>
          )}

          {mode === "spray" && (
            <div className="space-y-3 text-center py-1">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-700">
                💸 Lagos Owambe & VIP Money Spraying
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 500, 1000].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSprayDenom(d)}
                    className={`h-9 rounded-xl text-xs font-black ${
                      sprayDenom === d ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    AED {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={balance < sprayDenom}
                onClick={async () => {
                  const err = await onSendMoney(sprayDenom);
                  if (!err) {
                    gameAudio.playCoinSound();
                    setSprayedTotal((s) => s + sprayDenom);
                    broadcastRoomEvent({
                      type: "spray_money",
                      targetId: peer.userId,
                      targetUsername: peer.username,
                      amount: sprayDenom,
                    });
                  } else {
                    setNote(err);
                  }
                }}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 disabled:opacity-40 text-white font-black text-sm shadow-lg active:scale-95 transition flex flex-col items-center gap-1"
              >
                <span className="text-2xl">💸✨</span>
                <span>FLICK / SPRAY AED {sprayDenom.toLocaleString()} NOTE</span>
                <span className="text-[11px] text-emerald-100">
                  Total Sprayed on @{peer.username}: AED {sprayedTotal.toLocaleString()}
                </span>
              </button>
              {note && <p className="text-xs font-bold text-rose-600">{note}</p>}
            </div>
          )}
        </div>
      </div>

      <CelebrityBoxingModal
        open={boxingOpen}
        onOpenChange={setBoxingOpen}
        opponent={{
          userId: peer.userId,
          username: peer.username,
          name: peer.name,
          look: peer.look,
        }}
      />
    </div>
  );
}
