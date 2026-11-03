"use client";

// Inviting people to a party that's on (or coming up): by username, from your friends or from your recent chats,
// each with a notification and a place in their Invites app; or the link, on WhatsApp or anywhere.

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { contacts, listConversations, type Contact } from "@/lib/messages";
import { supabase } from "@/lib/supabase/client";
import { invitePlayer, shareInvite, whatsappLink } from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

async function friendsOf(me: string): Promise<Contact[]> {
  const { data } = await supabase().from("friendships").select("user_id, friend_id").or(`user_id.eq.${me},friend_id.eq.${me}`).eq("status", "accepted");
  const ids = (data ?? []).map((f) => (f.user_id === me ? f.friend_id : f.user_id) as string);
  return [...(await contacts(ids)).values()].sort((a, b) => a.username.localeCompare(b.username));
}

export function InviteSheet({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const { citizen } = useCitizen();
  const me = citizen?.id ?? "";
  const [tab, setTab] = useState<"friends" | "chats">("friends");
  const [friends, setFriends] = useState<Contact[] | null>(null);
  const [chats, setChats] = useState<Contact[] | null>(null);
  const [who, setWho] = useState("");
  const [sent, setSent] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!me) return;
    void friendsOf(me).then(setFriends);
    void listConversations(me).then((c) => setChats(c.map((x) => x.with)));
  }, [me]);

  const text = `🎉 Come to ${title} on Dubai Life!`;
  const invite = async (username: string) => {
    const u = username.trim().replace(/^@/, "").toLowerCase();
    if (!u) return;
    setSent((s) => ({ ...s, [u]: "…" }));
    const err = await invitePlayer(code, u, citizen?.username ?? "someone", title);
    setSent((s) => ({ ...s, [u]: err ? "" : "Invited ✓" }));
    if (err) setNote(err); else { setNote(null); gameAudio.playClickSound(); }
  };
  const list = tab === "friends" ? friends : chats;
  const shown = useMemo(() => (list ?? []).filter((c) => c.id !== me), [list, me]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[210] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Invite people" onClick={onClose}>
        <div className="w-full max-w-md max-h-[88dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <p className="text-lg font-black">Invite people</p>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-2">
            <input value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { void invite(who); setWho(""); } }} placeholder="@username" aria-label="Invite by username"
              className="flex-1 min-w-0 h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold outline-none" />
            <button onClick={() => { void invite(who); setWho(""); }} className="h-11 px-4 rounded-xl bg-fuchsia-600 text-white font-black">Invite</button>
          </div>
          {note && <p className="text-sm font-bold text-rose-600">{note}</p>}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {([["friends", "🤝 Friends"], ["chats", "💬 Chats"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-lg text-xs font-black ${tab === id ? "bg-white shadow" : "text-slate-500"}`}>{label}</button>
            ))}
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {list === null ? <p className="text-sm text-slate-500 p-2">Loading…</p>
              : !shown.length ? <p className="text-sm text-slate-500 p-2">{tab === "friends" ? "No friends yet. Invite by username or share the link." : "No chats this week."}</p>
              : shown.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-2">
                  <span className="w-9 h-9 rounded-full overflow-hidden bg-white shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rosterThumb(presetFor(c.look ?? { gender: "woman" }))} alt="" className="w-full h-full object-cover object-top" />
                  </span>
                  <p className="flex-1 min-w-0 font-black text-sm truncate">@{c.username}</p>
                  {sent[c.username] === "Invited ✓"
                    ? <span className="text-xs font-black text-emerald-600 px-2">Invited ✓</span>
                    : <button onClick={() => invite(c.username)} disabled={sent[c.username] === "…"} className="h-8 px-3 rounded-full bg-fuchsia-600 text-white text-xs font-black disabled:opacity-60">Invite</button>}
                </div>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a href={whatsappLink(code, text)} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-[#25D366] text-white font-black flex items-center justify-center text-sm">WhatsApp</a>
            <button onClick={async () => { const r = await shareInvite(code, text); if (r === "copied") setNote("Link copied. Paste it anywhere!"); }} className="h-11 rounded-xl bg-slate-900 text-white font-black text-sm">Share link</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
