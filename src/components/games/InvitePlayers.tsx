"use client";

// In a game room's lobby: search anyone by username or name and invite them. They get a live alert, a
// chat message with a Join button (so it's there later) and a push that drops them straight into the room.

import { useEffect, useState } from "react";
import { Search, Send, Check } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { findPeople, sendMessage, type Contact } from "@/lib/messages";
import { inviteToRoom } from "@/lib/games/rooms";

import { useOnlineUsernames } from "@/lib/presence";
import type { GameInfo } from "@/lib/games/registry";

export function InvitePlayers({ info, roomId, code, myId, inRoom }: { info: GameInfo; roomId: string; code: string; myId: string; myUsername?: string; inRoom: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [sent, setSent] = useState<Record<string, "sending" | "sent" | string>>({});
  const online = useOnlineUsernames();

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const t = setTimeout(() => { void findPeople(q, myId).then(setResults); }, 250);
    return () => clearTimeout(t);
  }, [q, myId]);

  const invite = async (c: Contact) => {
    setSent((s) => ({ ...s, [c.id]: "sending" }));
    const r = await inviteToRoom(roomId, c.id);
    if (r.error) return setSent((s) => ({ ...s, [c.id]: r.error! }));
    setSent((s) => ({ ...s, [c.id]: "sent" }));
    // Also in your chat with them, so it's waiting there later; its push opens the room directly.
    void sendMessage(myId, c.id, `${info.icon} Come play ${info.name} with me! · /games/${info.id}?room=${code}`, null, `/games/${info.id}?room=${code}`);
  };

  const shown = results.filter((c) => !inRoom.includes(c.id))
    .sort((a, b) => Number(online.has(b.username)) - Number(online.has(a.username)));

  return (
    <div className="text-left space-y-2">
      <p className="text-sm font-black text-slate-700">Invite players</p>
      <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-100">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a username or name" className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold" />
      </label>
      {q.trim().length >= 2 && shown.length === 0 && <p className="text-xs text-slate-400 px-1">Nobody by that name yet. Share the invite link instead.</p>}
      {shown.map((c) => {
        const st = sent[c.id];
        return (
          <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50">
            <span className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rosterThumb(presetFor(c.look ?? { gender: "woman" }))} alt="" className="w-9 h-9 rounded-full object-cover object-top bg-white" />
              {online.has(c.username) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-50" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-black truncate">@{c.username}</span>
              <span className="block text-[11px] text-slate-500 truncate">{c.name}{online.has(c.username) ? " · online" : ""}</span>
            </span>
            {st === "sent" ? <span className="text-xs font-black text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Invited</span>
              : st && st !== "sending" ? <span className="text-[11px] font-bold text-rose-600 max-w-[45%] text-right">{st}</span>
              : <button disabled={st === "sending"} onClick={() => invite(c)} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Invite</button>}
          </div>
        );
      })}
    </div>
  );
}
