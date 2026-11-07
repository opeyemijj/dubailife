"use client";

// What you can do with someone nearby: talk, pay, wave, invite, befriend — plus what fits the
// place (buy them a drink at a club, treat them at a café).

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, Flag, HandCoins, MessageCircle, Send, X } from "lucide-react";
import { broadcastRoomEvent, type ChatMessage, type Peer } from "@/lib/room";
import { loadConversation } from "@/lib/messages";
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
  peer, context, balance, treat, onClose, onChat, onSendMoney, onWave, onInvite, onTreat, onFriend, onSlap, onFight, onSpray, canInviteToTable = false,
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
  /** Auto-walk close to peer and deliver slap */
  onSlap?: (peer: Peer) => void;
  /** Auto-walk close to peer and brawl/fight */
  onFight?: (peer: Peer) => void;
  /** Auto-walk close to peer and spray banknotes */
  onSpray?: (peer: Peer, amount: number) => void;
  /** I'm seated at a table or booth, so I can invite them to it. */
  canInviteToTable?: boolean;
  onTreat?: () => void;
  onFriend: () => Promise<string>;
}) {
  const { citizen } = useCitizen();
  const [mode, setMode] = useState<"menu" | "chat" | "money" | "safety" | "spray">(startIn);
  const [boxingOpen, setBoxingOpen] = useState(false);
  const [boxingPending, setBoxingPending] = useState(false);
  const [boxingTimer, setBoxingTimer] = useState(15);
  const [sprayDenom, setSprayDenom] = useState(10000);
  const [sprayedTotal, setSprayedTotal] = useState(0);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const thread = useRef<HTMLDivElement>(null);

  // Load all conversation history directly from database
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (citizen?.id && peer?.userId) {
      loadConversation(citizen.id, peer.userId).then((list) => {
        setDbMessages(
          list.map((m) => ({
            id: m.id,
            with: peer.userId,
            mine: m.from_id === citizen.id,
            text: m.body,
            at: Date.parse(m.created_at),
          }))
        );
      });
    }
  }, [citizen?.id, peer?.userId, mode]);

  // Combine database history with live room messages so no messages are ever missing
  const allMessages = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of dbMessages) map.set(m.id, m);
    for (const m of messages) map.set(m.id, m);
    return [...map.values()].sort((a, b) => a.at - b.at);
  }, [dbMessages, messages]);

  useEffect(() => {
    if (mode !== "chat") return;
    onThread(true);
    return () => onThread(false);
  }, [mode, onThread]);

  // Keep the newest line in view.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [allMessages.length, typing, mode]);
  // Countdown timer for pending boxing challenge
  useEffect(() => {
    if (!boxingPending) return;
    const interval = setInterval(() => {
      setBoxingTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setBoxingPending(false);
          setNote(`⏱️ Challenge timed out. @${peer.username} did not respond. No fight.`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [boxingPending, peer.username]);

  // Listen for boxing challenge response (acceptance or decline)
  useEffect(() => {
    const onRoomAction = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        event?: {
          type?: string;
          challengerId?: string;
          challengerUsername?: string;
          opponentId?: string;
          opponentUsername?: string;
        };
      }>).detail;
      const t = detail?.event?.type;
      if (!t) return;
      const isMyChallenge =
        detail?.event?.challengerId === (citizen?.id ?? "me") ||
        detail?.event?.challengerUsername === citizen?.username;

      if (!isMyChallenge) return;

      if (t === "boxing_accept") {
        gameAudio.playConfirmSound();
        setBoxingPending(false);
        setNote(`🔔 Bout accepted by @${peer.username}! Entering the 3D Boxing Ring!`);
        setBoxingOpen(true);
      } else if (t === "boxing_decline") {
        gameAudio.playClickSound();
        setBoxingPending(false);
        setNote(`❌ @${peer.username} declined the boxing challenge. No fight.`);
      }
    };
    window.addEventListener("cometodubai:room-action", onRoomAction);
    return () => window.removeEventListener("cometodubai:room-action", onRoomAction);
  }, [citizen?.id, citizen?.username, peer.username]);

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

  const myWalletBalance = balance ?? citizen?.balance ?? 0;

  const pay = async () => {
    if (amount > myWalletBalance) {
      setNote(`You cannot send more than your current wallet balance (AED ${myWalletBalance.toLocaleString()}).`);
      return;
    }
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
              {action("💬", unread ? `Chat · ${unread} new` : "Chat", () => setMode("chat"), allMessages.length ? `“${allMessages[allMessages.length - 1].text}”` : `Say something to @${peer.username}`)}
              {action("💸", "Send money", () => setMode("money"), "Straight from your wallet")}
              {context === "club" && treat && onTreat && action("🍸", `Buy them a ${treat.name.toLowerCase()}`, onTreat, `AED ${treat.price} · served at the bar`)}
              {context === "dining" && treat && onTreat && action(treat.icon, `Treat them to ${treat.name.toLowerCase()}`, onTreat, `AED ${treat.price}`)}
              {canInviteToTable && action("🪑", "Invite to my table", () => onInvite("table"), peer.away ? AWAY_NOTE : "They'll take a free seat with you if they accept")}
              {context === "club" && action("💃", "Dance together", () => onInvite("dance"), peer.away ? AWAY_NOTE : "You'll dance facing each other")}
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
                boxingPending ? `⏳ Waiting for @${peer.username}... (${boxingTimer}s)` : `Challenge to Celebrity Boxing`,
                () => {
                  if (boxingPending) {
                    setBoxingPending(false);
                    broadcastRoomEvent({
                      type: "boxing_decline",
                      challengerId: citizen?.id ?? "me",
                      opponentId: peer.userId,
                      opponentUsername: peer.username,
                    });
                    setNote("✕ Boxing challenge cancelled.");
                    return;
                  }
                  if ((citizen?.balance ?? 0) < 2500) {
                    setNote("⚠️ You need at least AED 2,500 in your wallet to stake this bout purse!");
                    return;
                  }
                  gameAudio.playClickSound();
                  broadcastRoomEvent({
                    type: "boxing_challenge",
                    targetId: peer.userId,
                    targetUsername: peer.username,
                    challengerId: citizen?.id ?? "me",
                    challengerUsername: citizen?.username ?? "you",
                    challengerName: citizen?.name ?? "Fighter",
                    purse: 2500,
                    challengerLook: citizen?.look,
                  });
                  setBoxingPending(true);
                  setBoxingTimer(15);
                  setNote(`🥊 Bout challenge sent to @${peer.username}! Waiting for them to accept the AED 2,500 match...`);
                },
                boxingPending ? "Tap to cancel challenge" : "Requires opponent to accept before entering ring"
              )}
              {action(
                "👋⚡",
                `Slap @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  onClose();
                  if (onSlap) {
                    onSlap(peer);
                  } else {
                    broadcastRoomEvent({ type: "slap", targetId: peer.userId, targetUsername: peer.username });
                  }
                },
                "Auto-walk up to them in anger and deliver a direct slap"
              )}
              {action(
                "🥊💥",
                `Fight @${peer.username} (1v1 Brawl)`,
                () => {
                  gameAudio.playClickSound();
                  onClose();
                  if (onFight) {
                    onFight(peer);
                  } else {
                    broadcastRoomEvent({ type: "brawl", targetId: peer.userId, targetUsername: peer.username });
                  }
                },
                "Auto-walk up to them in anger before breaking into a brawl"
              )}
              {action(
                "👊🔥",
                `Rally Gang Beat vs @${peer.username}`,
                () => {
                  gameAudio.playClickSound();
                  onClose();
                  if (onFight) {
                    onFight(peer);
                  }
                  broadcastRoomEvent({
                    type: "gang_beat",
                    targetId: peer.userId,
                    targetUsername: peer.username,
                    allies: [citizen?.username ?? "you"],
                  });
                },
                "Auto-walk close and call players to jump them together"
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
              {allMessages.length === 0 && <p className="text-[11px] text-slate-400 text-center py-6">No messages yet. Say hi to @{peer.username} 👋</p>}
              {allMessages.map((m) => (
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
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Wallet Transfer</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span>Your Balance:</span>
                <span className="font-mono font-black text-slate-900">AED {myWalletBalance.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { label: "1K", val: 1_000 },
                  { label: "10K", val: 10_000 },
                  { label: "100K", val: 100_000 },
                  { label: "1M", val: 1_000_000 },
                  { label: "50M", val: 50_000_000 },
                ].filter((p) => p.val <= myWalletBalance).map((a) => (
                  <button key={a.label} onClick={() => { setAmount(a.val); setNote(null); }} className={`h-9 rounded-xl text-xs font-black ${amount === a.val ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-800"}`}>{a.label}</button>
                ))}
                <button onClick={() => { setAmount(myWalletBalance); setNote(null); }} className={`h-9 rounded-xl text-xs font-black ${amount === myWalletBalance ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>MAX</button>
              </div>
              <label className={`flex items-center gap-2 h-11 rounded-xl border px-3 ${amount > myWalletBalance ? "border-rose-400 bg-rose-50/50" : "border-slate-200"}`}>
                <span className="text-xs font-black text-slate-400">AED</span>
                <input
                  type="number"
                  min={1}
                  max={myWalletBalance}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)));
                    setNote(null);
                  }}
                  className="flex-1 text-base font-black outline-none bg-transparent"
                />
                <button type="button" onClick={() => { setAmount(myWalletBalance); setNote(null); }} className="text-[11px] font-black text-emerald-600 hover:text-emerald-700">MAX</button>
              </label>
              {amount > myWalletBalance && (
                <p className="text-[11px] font-bold text-rose-600">
                  Cannot exceed wallet balance of AED {myWalletBalance.toLocaleString()}
                </p>
              )}
              <button
                disabled={busy || amount < 1 || amount > myWalletBalance}
                onClick={pay}
                className="w-full h-12 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black flex items-center justify-center gap-2"
              >
                <HandCoins className="w-4 h-4" /> {busy ? "Sending…" : amount > myWalletBalance ? "Insufficient Balance" : `Send AED ${amount.toLocaleString()} to @${peer.username}`}
              </button>
              {note && <p className="text-xs font-bold text-rose-600 text-center">{note}</p>}
            </>
          )}

          {mode === "spray" && (
            <div className="space-y-3 text-center py-1">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-700">
                💸 Lagos Owambe & VIP Money Spraying
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[10000, 100000, 1000000, 1000000000, 50000000000].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSprayDenom(d)}
                    className={`h-9 rounded-xl text-[11px] font-black ${
                      sprayDenom === d ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {d >= 1_000_000_000 ? `${d / 1_000_000_000}B` : d >= 1_000_000 ? `${d / 1_000_000}M` : d >= 1000 ? `${d / 1000}k` : d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={sprayDenom > myWalletBalance}
                onClick={async () => {
                  if (sprayDenom > myWalletBalance) {
                    setNote(`You only have AED ${myWalletBalance.toLocaleString()} in your wallet.`);
                    return;
                  }
                  if (onSpray) {
                    onSpray(peer, sprayDenom);
                    setSprayedTotal((s) => s + sprayDenom);
                    setNote(`💸✨ Auto-walking close to spray AED ${sprayDenom.toLocaleString()} on @${peer.username}!`);
                    return;
                  }
                  let err = await onSendMoney(sprayDenom);
                  if (err && adjustBalance(-sprayDenom)) {
                    err = null;
                  }
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
                <span>{sprayDenom > myWalletBalance ? "INSUFFICIENT BALANCE TO SPRAY" : `FLICK / SPRAY AED ${sprayDenom.toLocaleString()} NOTE`}</span>
                <span className="text-[11px] text-emerald-100">
                  Total Sprayed on @${peer.username}: AED {sprayedTotal.toLocaleString()} · Min AED 10,000
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
