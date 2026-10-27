"use client";

// Runs on every page while signed in: a game invite arrives as a card at the top with Join (straight
// into the room) or Not now. Unanswered invites show when the app opens (if the room is still waiting);
// each invite is also a chat message with a Join button, and its push opens the room directly.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { contacts } from "@/lib/messages";
import { answerInvite } from "@/lib/games/rooms";
import { GAMES } from "@/lib/games/registry";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { ModalPortal } from "@/components/ui/modal-portal";
import { gameAudio } from "@/utils/gameAudio";

interface Invite { id: number; game: string; code: string; from: { username: string; look?: { gender: "woman" | "man"; preset?: string } } }

export function GameInviteListener() {
  const { citizen } = useCitizen();
  const me = citizen?.id;
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (!me) return;
    const db = supabase();
    // Invites not answered yet (sent while the app was closed), for rooms still waiting for players.
    void (async () => {
      const { data } = await db.from("game_invites").select("id, from_id, game, code, room_id").eq("to_id", me).eq("status", "sent").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return;
      const { data: open } = await db.from("game_rooms").select("id").in("id", data.map((i) => i.room_id)).eq("status", "lobby");
      const waiting = data.filter((i) => open?.some((r) => r.id === i.room_id));
      if (!waiting.length) return;
      const who = await contacts(waiting.map((i) => i.from_id));
      setInvites((l) => [...l, ...waiting.filter((i) => !l.some((x) => x.id === i.id)).map((i) => ({ id: i.id, game: i.game, code: i.code, from: { username: who.get(i.from_id)?.username ?? "someone", look: who.get(i.from_id)?.look } }))]);
    })();
    const ch = db.channel(`game-invites-${me}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_invites", filter: `to_id=eq.${me}` }, async (p) => {
        const row = p.new as { id: number; from_id: string; game: string; code: string; status: string };
        if (!row?.id || row.status !== "sent") return;
        const who = (await contacts([row.from_id])).get(row.from_id);
        gameAudio.playConfirmSound();
        try { navigator.vibrate?.([80, 50, 80]); } catch { /* not supported */ }
        setInvites((l) => [...l.filter((i) => i.id !== row.id), { id: row.id, game: row.game, code: row.code, from: { username: who?.username ?? "someone", look: who?.look } }]);
      })
      .subscribe();
    return () => { void db.removeChannel(ch); };
  }, [me]);

  if (!invites.length) return null;
  const dismiss = (id: number) => setInvites((l) => l.filter((i) => i.id !== id));

  return (
    <ModalPortal>
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[200] w-[min(94vw,400px)] space-y-2">
        {invites.map((inv) => {
          const g = GAMES.find((x) => x.id === inv.game);
          return (
            <div key={inv.id} role="alert" className="flex items-center gap-3 p-3 rounded-[24px] bg-white text-slate-900 shadow-2xl border border-slate-100 animate-[sheetUp_0.25s_ease-out]">
              <span className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(presetFor(inv.from.look ?? { gender: "woman" }))} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-slate-100" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: g?.bg ?? "#f1f5f9" }}>{g?.icon ?? "🎲"}</span>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-black leading-tight truncate">@{inv.from.username} invited you</p>
                <p className="text-sm text-slate-500 truncate">to play {g?.name ?? "a game"}</p>
              </div>
              <button
                onClick={() => { void answerInvite(inv.id, true); dismiss(inv.id); router.push(`/games/${inv.game}?room=${inv.code}`); }}
                className="h-11 px-4 rounded-full bg-emerald-600 text-white font-black shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)] active:scale-95"
              >
                Join
              </button>
              <button onClick={() => { void answerInvite(inv.id, false); dismiss(inv.id); }} aria-label="Not now" className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </ModalPortal>
  );
}
