"use client";

// A game's room in Game City: pick how to play (against the computer, quick match, a private room with a
// code, or join a friend's code), play, see the result, and the Hall of Fame. "Back to Game City" returns
// to the district on the map. Results are saved to the player's profile and the leaderboard.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, Copy, Crown, History, Link2, Loader2, Lock, MessageCircle, Send, Share2, Trophy, Users, X, Zap } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { gameInfo, tileId, type GameId, type GameInfo } from "@/lib/games/registry";
import {
  clearSave, createRoom, gameFee, hallOfFame, joinRoom, leaveRoom, loadSave, moveRoom, myOpenRooms, myStats, payGameFee, quickMatch, recordResult, saveGame,
  startRoom, useRoomChat, useRoomLive, type GameRoom, type HallRow, type MyStats, type Outcome, type SavedGame,
} from "@/lib/games/rooms";
import { supabase } from "@/lib/supabase/client";
import { presetFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { gameAudio } from "@/utils/gameAudio";
import { MODULES } from "./index";
import type { Result, Seat } from "./types";

type View =
  | { kind: "menu" }
  | { kind: "ai"; opponents: number; resume?: unknown }
  | { kind: "room"; room: GameRoom };

export function GameRoomPage({ game }: { game: string }) {
  const info = gameInfo(game);
  const { citizen, hydrated } = useRequireCitizen();
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "menu" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [fee, setFee] = useState<number | null>(null);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [openRooms, setOpenRooms] = useState<GameRoom[]>([]);
  // Leaving a game in progress asks first.
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);
  const [inGame, setInGame] = useState(false);

  // The fee, any saved game against the computer and rooms still open — refreshed on the menu.
  useEffect(() => {
    if (view.kind !== "menu" || !info) return;
    void gameFee().then(setFee);
    void loadSave(info.id).then(setSaved);
    void myOpenRooms().then((rooms) => setOpenRooms(rooms.filter((r) => r.game === info.id)));
  }, [view.kind, info]);

  // The browser's own back/close asks too while a game is on.
  useEffect(() => {
    if (!inGame) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [inGame]);

  /** Pays the fee, then starts a fresh game against the computer. */
  const startAi = async (opponents: number) => {
    if (!info) return;
    gameAudio.playClickSound();
    setBusy(`ai-${opponents}`); setError(null);
    const e = await payGameFee(info.id);
    setBusy(null);
    if (e) { setError(e); return; }
    await clearSave(info.id);
    setView({ kind: "ai", opponents });
  };

  const enter = useCallback(async (p: Promise<{ data?: GameRoom; error?: string }>, label: string) => {
    setBusy(label); setError(null);
    const { data, error: e } = await p;
    setBusy(null);
    if (e || !data) { setError(e ?? "Something went wrong."); return; }
    setView({ kind: "room", room: data });
  }, []);

  // Invite links: /games/<game>?room=CODE
  const invite = params.get("room");
  useEffect(() => {
    if (!invite || !citizen) return;
    const t = setTimeout(() => { void enter(joinRoom(invite), "join"); router.replace(`/games/${game}`); }, 0);
    return () => clearTimeout(t);
  }, [invite, citizen, enter, router, game]);

  if (!info) return <Shell><p className="font-black">This game doesn&apos;t exist.</p><BackToCity /></Shell>;
  if (!hydrated || !citizen) return <Shell><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></Shell>;

  return (
    <main className="min-h-[100dvh] bg-slate-50 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-3 sm:px-6 h-14 pt-[env(safe-area-inset-top)] box-content">
          <BackToCity game={info.id} guard={inGame ? (go) => setConfirmLeave(() => go) : undefined} />
          <span className="text-2xl">{info.icon}</span>
          <h1 className="font-black text-lg truncate">{info.name}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 space-y-5">
        {view.kind === "menu" && (
          <>
            <Hero info={info} />
            <p className="text-sm font-bold text-slate-600 text-center">
              {fee === null ? "…" : fee > 0 ? <>Each game costs <span className="text-slate-900">AED {fee.toLocaleString()}</span> in virtual AED · you have AED {(citizen.balance ?? 0).toLocaleString()}</> : "Games are free right now"}
            </p>
            {error && (
              <p className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm p-3">
                {error} {/virtual AED/.test(error) && <Link href="/wallet" className="underline">Open wallet</Link>}
              </p>
            )}
            {(saved || openRooms.length > 0) && (
              <section className="rounded-3xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <h3 className="font-black flex items-center gap-2"><History className="w-5 h-5 text-amber-600" /> Continue where you left off</h3>
                {saved && (
                  <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
                    <Bot className="w-5 h-5 text-slate-500" />
                    <span className="flex-1 text-sm font-bold">Your game vs {saved.seats > 2 ? `${saved.seats - 1} computers` : "the computer"}<span className="block text-[11px] font-normal text-slate-500">Saved {new Date(saved.updated_at).toLocaleString()}</span></span>
                    <button onClick={() => setView({ kind: "ai", opponents: saved.seats - 1, resume: saved.state })} className="h-10 px-4 rounded-xl bg-amber-500 text-white text-sm font-black">Continue</button>
                  </div>
                )}
                {openRooms.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                    <Users className="w-5 h-5 text-slate-500" />
                    <span className="flex-1 text-sm font-bold">Room {r.code} · {r.players.length} players<span className="block text-[11px] font-normal text-slate-500">{r.status === "playing" ? "Game in progress" : "Waiting to start"}</span></span>
                    <button onClick={() => setView({ kind: "room", room: r })} className="h-10 px-4 rounded-xl bg-amber-500 text-white text-sm font-black">Rejoin</button>
                  </div>
                ))}
              </section>
            )}
            <section className="grid sm:grid-cols-2 gap-3">
              {info.minPlayers === 1 && (
                <div className="sm:col-span-2 rounded-3xl p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-2 border-purple-400 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                      {info.icon}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-purple-300">Instant Arcade Solo Run</div>
                      <h3 className="text-xl font-black">Play Single Player</h3>
                      <p className="text-xs text-slate-300 max-w-md">
                        {info.id === "candy"
                          ? "Match candies, cascade sweet combos, and reach 3 stars across 25 moves."
                          : info.id === "tetris"
                          ? "Rotate and drop falling tetrominoes, clear lines, and beat your high score."
                          : "Play classic solo mode by yourself to set new high scores and climb the leaderboards."}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={!!busy}
                    onClick={() => void startAi(0)}
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-400/30 transition-transform active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>{busy === "ai-0" ? "Starting…" : "▶ Play Single Player"}</span>
                  </button>
                </div>
              )}
              <ModeCard
                icon={<Bot className="w-5 h-5" />}
                title={info.minPlayers === 1 ? "Race vs AI Bots" : "Play solo vs AI"}
                text={info.minPlayers === 1 ? "Race against computer opponents to see who gets the highest score." : "Practice against the computer, any time."}
              >
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: info.maxPlayers - 1 }, (_, i) => i + 1).map((n) => (
                    <button key={n} disabled={!!busy} onClick={() => void startAi(n)} className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-60">
                      {busy === `ai-${n}` ? "…" : `vs ${n} AI`}
                    </button>
                  ))}
                </div>
              </ModeCard>
              <ModeCard icon={<Zap className="w-5 h-5" />} title="Quick match" text="Join an open game with other players, or open one and wait.">
                <button disabled={!!busy} onClick={() => enter(quickMatch(info.id, 2), "quick")} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-black disabled:opacity-60">
                  {busy === "quick" ? "Finding a game…" : "Find a game"}
                </button>
              </ModeCard>
              <ModeCard icon={<Users className="w-5 h-5" />} title="Create a room" text="Get a code and invite friends to play with you.">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: info.maxPlayers - 1 }, (_, i) => i + 2).map((n) => (
                    <button key={n} disabled={!!busy} onClick={() => enter(createRoom(info.id, false, n), "create")} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-black disabled:opacity-60">
                      {info.maxPlayers > 2 ? `${n} players` : "Create room"}
                    </button>
                  ))}
                </div>
              </ModeCard>
              <ModeCard icon={<Lock className="w-5 h-5" />} title="Join with a code" text="Got a code from a friend? Enter it here.">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) void enter(joinRoom(code), "join"); }}>
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className="w-32 h-10 rounded-xl border border-slate-300 px-3 font-mono font-black tracking-widest uppercase" />
                  <button disabled={!!busy || code.trim().length < 4} className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-50">{busy === "join" ? "…" : "Join"}</button>
                </form>
              </ModeCard>
            </section>
            <HallOfFame game={info.id} />
          </>
        )}

        {view.kind === "ai" && (
          <AiGame info={info} userId={citizen.id} me={{ name: citizen.name, username: citizen.username, look: citizen.look }} opponents={view.opponents} resume={view.resume}
            onPlaying={setInGame} onAgain={() => void startAi(view.opponents)} onExit={() => { setInGame(false); setView({ kind: "menu" }); }} />
        )}

        {view.kind === "room" && (
          <RoomGame info={info} initial={view.room} myId={citizen.id} myUsername={citizen.username} onPlaying={setInGame} onExit={() => { setInGame(false); setView({ kind: "menu" }); }} />
        )}
      </div>
      {confirmLeave && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-3 text-center">
            <h3 className="font-black text-lg">Leave this game?</h3>
            <p className="text-sm text-slate-600">{view.kind === "room" ? "The game stays open — you can rejoin it from this game's menu." : "Your game is saved — you can continue it later from this game's menu."}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLeave(null)} className="flex-1 h-12 rounded-2xl bg-slate-100 font-black">Keep playing</button>
              <button onClick={() => { const go = confirmLeave; setConfirmLeave(null); setInGame(false); go(); }} className="flex-1 h-12 rounded-2xl bg-rose-600 text-white font-black">Leave</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------- playing against the computer

function AiGame({ info, userId, me, opponents, resume, onPlaying, onAgain, onExit }: { info: GameInfo; userId: string; me: Seat; opponents: number; resume?: unknown; onPlaying: (on: boolean) => void; onAgain: () => void; onExit: () => void }) {
  const mod = MODULES[info.id];
  const seats: Seat[] = useMemo(() => [me, ...Array.from({ length: opponents }, (_, i) => ({ name: opponents > 1 ? `Computer ${i + 1}` : "Computer", ai: true }))], [me, opponents]);
  const [round, setRound] = useState(0);
  const [state, setState] = useState(() => resume ?? mod.init(seats.length, Math.floor(Math.random() * 1e9)));
  const result = mod.result(state);
  const thinking = useRef(false);

  // Saved as you play, so it can be continued later; cleared once it's over.
  useEffect(() => {
    onPlaying(!result);
    const t = setTimeout(() => { void (result ? clearSave(info.id) : saveGame(userId, info.id, seats.length, state)); }, 400);
    return () => clearTimeout(t);
  }, [state, result, info.id, userId, seats.length, onPlaying]);

  // Race games: the computers play their rounds straight away.
  useEffect(() => {
    if (mod.turnOf) return;
    let alive = true;
    (async () => {
      let s = state;
      for (let seat = 1; seat < seats.length; seat++) s = await mod.ai(s, seat);
      if (alive) setState((cur: typeof state) => { let next = cur; for (let seat = 1; seat < seats.length; seat++) next = mod.finish!(next, seat, (s as { scores: number[] }).scores[seat]); return next; });
    })();
    return () => { alive = false; };
    // Once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Turn games: the computer moves when it's its turn.
  useEffect(() => {
    if (!mod.turnOf || result) return;
    const turn = mod.turnOf(state);
    if (turn === null || turn === 0 || thinking.current) return;
    thinking.current = true;
    const t = setTimeout(async () => {
      const next = await mod.ai(state, turn);
      thinking.current = false;
      setState(next);
    }, mod.delay ? mod.delay(state) : 650);
    return () => { clearTimeout(t); thinking.current = false; };
  }, [state, mod, result]);

  // Play again pays for the new game (through the parent) and starts fresh.
  const again = () => { onAgain(); setState(mod.init(seats.length, Math.floor(Math.random() * 1e9))); setRound((r) => r + 1); };
  return (
    <>
      <PlayerStrip seats={seats} me={0} turn={mod.turnOf?.(state) ?? null} />
      {result ? (
        <ResultCard info={info} result={result} seats={seats} me={0} mode="ai" onAgain={again} onExit={onExit} />
      ) : (
        <mod.Board state={state} me={0} seats={seats} canMove={!mod.turnOf || mod.turnOf(state) === 0}
          onMove={(next) => setState(next)}
          onFinish={(score) => setState((cur: typeof state) => mod.finish!(cur, 0, score))} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- playing with others

function RoomGame({ info, initial, myId, myUsername, onPlaying, onExit }: { info: GameInfo; initial: GameRoom; myId: string; myUsername: string; onPlaying: (on: boolean) => void; onExit: () => void }) {
  const mod = MODULES[info.id];
  const [room, setRoom] = useRoomLive(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const over = !room || room.status === "done" || (!!room.state && !!mod.result(room.state));
  useEffect(() => { onPlaying(!over); }, [over, onPlaying]);
  if (!room) return <div className="text-center space-y-3 py-10"><p className="font-black">This room has closed.</p><button onClick={onExit} className="h-11 px-5 rounded-xl bg-slate-900 text-white font-black">Back to the game menu</button></div>;
  const me = Math.max(0, room.players.findIndex((p) => p.id === myId));
  const seats: Seat[] = room.players.map((p) => ({ name: p.name || p.username, username: p.username, look: p.look }));
  const host = room.host_id === myId;

  if (room.status === "lobby") {
    const link = typeof window !== "undefined" ? `${window.location.origin}/games/${info.id}?room=${room.code}` : "";
    const share = async () => {
      try { await navigator.share?.({ title: `Play ${info.name} with me in Come To Dubai`, url: link }); } catch { /* cancelled */ }
    };
    return (
      <section className="rounded-3xl bg-white border border-slate-200 p-5 space-y-4 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{room.is_public ? "Waiting for players" : "Private room"}</p>
        <p className="font-mono font-black text-4xl tracking-[0.3em]">{room.code}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => navigator.clipboard?.writeText(room.code)} className="h-10 px-3 rounded-xl bg-slate-100 font-bold text-sm flex items-center gap-1.5"><Copy className="w-4 h-4" /> Copy code</button>
          <button onClick={() => navigator.clipboard?.writeText(link)} className="h-10 px-3 rounded-xl bg-slate-100 font-bold text-sm flex items-center gap-1.5"><Link2 className="w-4 h-4" /> Copy invite link</button>
          {typeof navigator !== "undefined" && "share" in navigator && <button onClick={share} className="h-10 px-3 rounded-xl bg-slate-100 font-bold text-sm flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Share</button>}
        </div>
        <PlayerStrip seats={seats} me={me} turn={null} slots={room.max_players} />
        {host ? (
          <button disabled={room.players.length < info.minPlayers || saving}
            onClick={async () => { setSaving(true); const { error: e } = await startRoom(room.id, mod.init(room.players.length, Math.floor(Math.random() * 1e9))); setSaving(false); if (e) setError(e); }}
            className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black disabled:bg-slate-300">
            {room.players.length < info.minPlayers ? "Waiting for another player…" : `Start the game · ${room.players.length} players`}
          </button>
        ) : <p className="text-sm font-bold text-slate-500">Waiting for the host to start…</p>}
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button onClick={async () => { await leaveRoom(room.id); onExit(); }} className="text-sm font-bold text-slate-500 underline">Leave room</button>
        <RoomChat roomId={room.id} myId={myId} myUsername={myUsername} />
      </section>
    );
  }

  const state = room.state;
  const result = state ? mod.result(state) : null;
  const myTurn = mod.turnOf ? mod.turnOf(state) === me : true;

  const commit = async (next: unknown) => {
    setSaving(true); setError(null);
    const done = !!mod.result(next);
    const { data, error: e } = await moveRoom(room.id, room.version, next, done);
    setSaving(false);
    if (e) setError(e); else if (data) setRoom(data);
  };
  // Race games: add my score to the latest state, retrying if someone else saved first.
  const finishRace = async (score: number) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data: latest } = await supabase().from("game_rooms").select("*").eq("id", room.id).maybeSingle();
      if (!latest) return;
      const cur = latest as GameRoom;
      const next = mod.finish!(cur.state, me, score);
      const { data, error: e } = await moveRoom(room.id, cur.version, next, !!mod.result(next));
      if (data) { setRoom(data); return; }
      if (e && !/moved first/.test(e)) { setError(e); return; }
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    }
  };

  return (
    <>
      <PlayerStrip seats={seats} me={me} turn={mod.turnOf?.(state) ?? null} />
      {result ? (
        <ResultCard info={info} result={result} seats={seats} me={me} mode="multiplayer" roomId={room.id} onAgain={onExit} onExit={onExit} />
      ) : state ? (
        <mod.Board state={state} me={me} seats={seats} canMove={myTurn && !saving} onMove={commit} onFinish={(score) => void finishRace(score)} />
      ) : null}
      {error && <p className="text-center text-sm font-bold text-rose-600">{error}</p>}
      <RoomChat roomId={room.id} myId={myId} myUsername={myUsername} floating />
    </>
  );
}

/** Chat for everyone in the room. In a game it's a button that opens a panel, with a badge for new lines. */
function RoomChat({ roomId, myId, myUsername, floating = false }: { roomId: string; myId: string; myUsername: string; floating?: boolean }) {
  const { lines, send } = useRoomChat(roomId);
  const [open, setOpen] = useState(!floating);
  const [text, setText] = useState("");
  const [seen, setSeen] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: 1e6 }); }, [lines.length, open]);
  const unread = open ? 0 : Math.max(0, lines.length - seen);
  const submit = async (body: string) => { setText(""); const e = await send(myId, myUsername, body); setErr(e); };
  const panel = (
    <div className={`bg-white text-left ${floating ? "rounded-3xl shadow-2xl border border-slate-200 w-[min(92vw,360px)]" : "rounded-2xl border border-slate-200"}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <MessageCircle className="w-4 h-4 text-indigo-600" /><span className="flex-1 font-black text-sm">Room chat</span>
        {floating && <button onClick={() => { setOpen(false); setSeen(lines.length); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close chat"><X className="w-4 h-4" /></button>}
      </div>
      <div ref={list} className="h-48 overflow-y-auto p-3 space-y-1.5">
        {lines.length === 0 && <p className="text-xs text-slate-400 text-center mt-14">Say hi to the table 👋</p>}
        {lines.map((l) => (
          <div key={l.id} className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${l.user_id === myId ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100"}`}>
            {l.user_id !== myId && <span className="block text-[10px] font-black text-indigo-700">@{l.username}</span>}{l.body}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 px-3 pb-2">
        {["👋", "😂", "🔥", "GG", "Nice move!"].map((q) => <button key={q} onClick={() => void submit(q)} className="h-8 px-2.5 rounded-full bg-slate-100 text-xs font-bold">{q}</button>)}
      </div>
      <form className="flex gap-2 p-3 pt-1" onSubmit={(e) => { e.preventDefault(); void submit(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Message the room…" className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-base sm:text-sm" />
        <button disabled={!text.trim()} className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Send"><Send className="w-4 h-4" /></button>
      </form>
      {err && <p className="px-3 pb-2 text-xs font-bold text-rose-600">{err}</p>}
    </div>
  );
  if (!floating) return panel;
  return (
    // Above the keyboard-shortcuts button that sits in the corner on larger screens.
    <div className="fixed right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] md:bottom-16 z-30 flex flex-col items-end gap-2">
      {open && panel}
      {!open && (
        <button onClick={() => setOpen(true)} className="relative h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center" aria-label="Open room chat">
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-rose-500 text-xs font-black flex items-center justify-center ring-2 ring-white">{unread}</span>}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function ResultCard({ info, result, seats, me, mode, roomId, onAgain, onExit }: { info: GameInfo; result: Result; seats: Seat[]; me: number; mode: "ai" | "multiplayer"; roomId?: string; onAgain: () => void; onExit: () => void }) {
  const isSolo = seats.length === 1;
  const outcome: Outcome = isSolo ? "win" : result.winners.length === 0 ? "draw" : result.winners.includes(me) ? "win" : "loss";
  const saved = useRef(false);
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    void recordResult(info.id, mode, outcome, result.scores?.[me] ?? (outcome === "win" ? 1 : 0), roomId);
    if (outcome === "win") gameAudio.playCoinSound();
  }, [info.id, mode, outcome, result, me, roomId]);

  const finalScore = result.scores?.[me];

  return (
    <section className="rounded-3xl p-6 text-center space-y-4 border-2 shadow-xl" style={{ background: info.bg, color: info.fg, borderColor: info.accent }}>
      <div className="text-6xl">{isSolo ? "🎉" : outcome === "win" ? "🏆" : outcome === "draw" ? "🤝" : "💪"}</div>
      <h2 className="text-3xl font-black">
        {isSolo ? "Run Complete!" : outcome === "win" ? "You win!" : outcome === "draw" ? "It's a draw" : `${result.winners.map((w) => seats[w]?.name).join(" & ")} wins`}
      </h2>
      {finalScore !== undefined ? (
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur border border-black/10 inline-block shadow-inner">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">Your Final Score</div>
          <div className="text-3xl font-black font-mono text-slate-900 mt-0.5">{finalScore.toLocaleString()} pts</div>
        </div>
      ) : null}
      {!isSolo && result.scores && (
        <div className="flex flex-wrap justify-center gap-2">
          {seats.map((s, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-white/70 text-slate-900 font-black text-sm">{i === me ? "You" : s.name}: {result.scores![i]}</span>)}
        </div>
      )}
      <p className="text-sm font-bold opacity-80">Saved to your profile and the {info.name} Hall of Fame.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onAgain} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors">
          {isSolo ? "Play again" : mode === "ai" ? "Play again" : "Back to the game menu"}
        </button>
        {mode === "ai" && <button onClick={onExit} className="h-12 px-6 rounded-2xl bg-white text-slate-900 font-black border border-slate-300 hover:bg-slate-50 transition-colors">Game menu</button>}
      </div>
    </section>
  );
}

function Avatar({ look, name, ai }: { look?: AvatarLookProps | null; name: string; ai?: boolean }) {
  if (ai) return <span className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center"><Bot className="w-5 h-5 text-slate-600" /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return look ? <img src={rosterThumb(presetFor(look))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-200" /> : <span className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center font-black">{name.slice(0, 1)}</span>;
}

function PlayerStrip({ seats, me, turn, slots }: { seats: Seat[]; me: number; turn: number | null; slots?: number }) {
  if (seats.length === 1) {
    const s = seats[0];
    return (
      <div className="flex justify-center items-center gap-2">
        <div className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border-2 border-purple-500/40 bg-white text-slate-900 shadow-sm">
          <Avatar look={s.look} name={s.name} ai={s.ai} />
          <div className="text-left">
            <span className="text-xs font-black block leading-tight">{s.name}</span>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Single Player Solo Run</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {seats.map((s, i) => (
        <div key={i} className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 bg-white ${turn === i ? "border-emerald-500" : "border-slate-200"}`}>
          <Avatar look={s.look} name={s.name} ai={s.ai} />
          <span className="text-sm font-black">{i === me ? "You" : s.name}{s.username && i !== me ? <span className="block text-[10px] font-bold text-slate-500">@{s.username}</span> : null}</span>
        </div>
      ))}
      {slots && Array.from({ length: Math.max(0, slots - seats.length) }, (_, i) => (
        <div key={`open-${i}`} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 border-dashed border-slate-300 text-slate-400 text-sm font-bold">
          <span className="w-10 h-10 rounded-full bg-slate-100" /> Open seat
        </div>
      ))}
    </div>
  );
}

function HallOfFame({ game }: { game: GameId }) {
  const [rows, setRows] = useState<HallRow[] | null>(null);
  const [mine, setMine] = useState<MyStats | null>(null);
  useEffect(() => { void hallOfFame(game).then(setRows); void myStats(game).then(setMine); }, [game]);
  return (
    <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="font-black flex-1">Hall of Fame</h2>
        {mine && <span className="text-xs font-bold text-slate-500">You: {mine.wins}W · {mine.losses}L{mine.draws ? ` · ${mine.draws}D` : ""}</span>}
      </div>
      {rows === null ? <p className="p-4 text-sm text-slate-500">Loading…</p>
        : rows.length === 0 ? <p className="p-4 text-sm text-slate-500">No games recorded yet — be the first on the board!</p>
        : (
          <ol>
            {rows.map((r, i) => (
              <li key={r.user_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
                <span className="w-6 text-center font-black text-slate-400">{i === 0 ? <Crown className="w-5 h-5 text-amber-500 mx-auto" /> : i + 1}</span>
                <Avatar look={r.look} name={r.name} />
                <span className="flex-1 min-w-0"><span className="block font-black text-sm truncate">{r.name}</span><span className="block text-[11px] text-slate-500">@{r.username}</span></span>
                <span className="text-right text-xs font-bold text-slate-600">{r.wins} wins · {r.played} played<span className="block font-black text-slate-900">{r.points} pts</span></span>
              </li>
            ))}
          </ol>
        )}
      <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50">Points: a win against players 3, against the computer 1, a draw 1.</p>
    </section>
  );
}

function Hero({ info }: { info: GameInfo }) {
  return (
    <section className="rounded-3xl p-5 sm:p-6 flex gap-4 items-center" style={{ background: info.bg, color: info.fg }}>
      <span className="text-6xl sm:text-7xl shrink-0">{info.icon}</span>
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-black">{info.name}</h2>
        <p className="font-bold opacity-80">
          {info.tagline} · {info.minPlayers === 1 ? `Solo & Multiplayer (1–${info.maxPlayers} players)` : info.minPlayers === info.maxPlayers ? `${info.minPlayers} players` : `${info.minPlayers}–${info.maxPlayers} players`}
        </p>
        <p className="text-sm mt-2 opacity-90">{info.rules}</p>
      </div>
    </section>
  );
}

function ModeCard({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">{icon}</span><h3 className="font-black">{title}</h3></div>
      <p className="text-sm text-slate-500">{text}</p>
      {children}
    </div>
  );
}

/** Back to the game's tile on the map. With `guard`, asks before leaving a game in progress. */
function BackToCity({ game, guard }: { game?: GameId; guard?: (go: () => void) => void }) {
  const router = useRouter();
  const href = game ? `/explore?at=${tileId(game)}` : "/explore";
  return (
    <Link href={href} onClick={(e) => { if (!guard) return; e.preventDefault(); guard(() => router.push(href)); }} className="h-10 pl-2 pr-3 rounded-full bg-slate-900 text-white text-sm font-black flex items-center gap-1 shrink-0">
      <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">Back to</span> Game City
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100dvh] flex items-center justify-center p-6"><div className="text-center space-y-4">{children}</div></main>;
}
