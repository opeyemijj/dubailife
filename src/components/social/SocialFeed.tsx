"use client";

// Incoming messages, gifts and invites (money has its own app-wide notice) from people in the same room, as small cards that
// fade on their own (invites wait a little longer for an answer).

import { useEffect, useState } from "react";
import type { Received } from "@/lib/room";

const LIFE_MS = 7000;
const INVITE_MS = 15000;

function describe(e: Received): { icon: string; text: string } {
  const who = `@${e.from.username}`;
  switch (e.type) {
    case "chat": return { icon: "💬", text: `${who}: ${e.text}` };
    case "wave": return { icon: "👋", text: `${who} waved at you` };
    case "money": return { icon: "💸", text: `${who} sent you AED ${e.amount.toLocaleString()}` };
    case "gift": return { icon: e.gift.icon, text: `${who} bought you a ${e.gift.name.toLowerCase()}` };
    case "invite": return { icon: e.kind === "dance" ? "💃" : "🙌", text: e.kind === "dance" ? `${who} wants to dance with you` : `${who} invited you to join them` };
    case "accept": return { icon: "✅", text: `${who} accepted — ${e.kind === "dance" ? "time to dance!" : "they're on their way"}` };
    case "friend": return { icon: "🤝", text: `${who} sent you a friend request` };
    case "typing": return { icon: "✍️", text: `${who} is typing…` };
    case "bottle": return { icon: "🍾", text: `${who} ordered bottle service!` };
  }
}

export function SocialFeed({ events, onAccept, onFriend, onReply, readingWith }: {
  events: Received[];
  onAccept: (e: Received & { type: "invite" }) => void;
  onFriend: (e: Received) => void;
  /** Opens the conversation with whoever sent a message. */
  onReply: (e: Received) => void;
  /** The conversation on screen; its messages don't need a card. */
  readingWith?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const visible = events.filter((e) => !done.has(e.id) && !(e.type === "chat" && e.from.userId === readingWith) && e.type !== "money" && e.type !== "bottle" && now - e.at < (e.type === "invite" || e.type === "friend" ? INVITE_MS : LIFE_MS)).slice(-3);
  const dismiss = (id: string) => setDone((d) => new Set(d).add(id));
  if (visible.length === 0) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-28 z-40 w-[min(360px,calc(100vw-24px))] space-y-2 pointer-events-none">
      {visible.map((e) => {
        const { icon, text } = describe(e);
        return (
          <div key={e.id} className={`pointer-events-auto flex items-center gap-2 bg-slate-950/90 backdrop-blur-md text-white rounded-2xl px-3 py-2 shadow-2xl border ${e.type === "chat" ? "border-sky-400 ring-2 ring-sky-400/60 animate-[pulse_1s_ease-in-out_3]" : "border-white/10"}`}>
            <span className="text-lg">{icon}</span>
            <span className="flex-1 min-w-0 text-xs font-bold break-words">{text}</span>
            {e.type === "invite" && (
              <button onClick={() => { onAccept(e); dismiss(e.id); }} className="h-7 px-2.5 rounded-full bg-emerald-500 text-[11px] font-black">Accept</button>
            )}
            {e.type === "chat" && (
              <button onClick={() => { onReply(e); dismiss(e.id); }} className="h-7 px-2.5 rounded-full bg-sky-500 text-[11px] font-black">Reply</button>
            )}
            {e.type === "friend" && (
              <button onClick={() => { onFriend(e); dismiss(e.id); }} className="h-7 px-2.5 rounded-full bg-emerald-500 text-[11px] font-black">Add back</button>
            )}
            <button onClick={() => dismiss(e.id)} className="h-7 w-7 rounded-full bg-white/10 text-[11px] font-black" aria-label="Dismiss">✕</button>
          </div>
        );
      })}
    </div>
  );
}
