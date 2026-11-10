"use client";

// The party board's controls (the board itself is 3D, PartyGameBoard): "Let's play" picks a game, and the card
// shows who's playing, whose turn it is and the turn clock, with Join, Play the computer, cheering, predicting
// the winner, Watch (the camera glides to the board) and clearing it.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PARTY_GAMES, SIDES, TURN_LIMIT_MS, resultText, turnOf, turnText, type PartyGameId, type PartyGames } from "@/lib/partyGames";
import { gameAudio } from "@/utils/gameAudio";
import type { PoolState } from "@/components/games/Pool";

const SEAT_COLOR: Record<PartyGameId, [string, string]> = {
  connect4: ["#dc2626", "#facc15"],
  chess: ["#f8f4ea", "#1c1917"],
  ludo: ["#dc2626", "#eab308"],
  pool: ["#16a34a", "#2563eb"],
};
const CHEERS = ["👏", "🔥", "😱", "🎉"];

export function PartyGamePicker({ pg, onClose, onStarted }: { pg: PartyGames; onClose: () => void; onStarted: () => void }) {
  const running = pg.snap && !pg.snap.over;
  const go = (id: PartyGameId, ai: boolean) => {
    gameAudio.playClickSound();
    pg.start(id, ai);
    onStarted();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[10060] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-4 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-black">🎲 Let&apos;s play a game</h3>
            <p className="text-[11px] text-slate-500">It goes up outside the house for everyone at the party to watch. The first guest to join plays you.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-600 font-black text-xs" aria-label="Close">✕</button>
        </div>
        {running ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900">
            {PARTY_GAMES[pg.snap!.game].icon} A game of {PARTY_GAMES[pg.snap!.game].name} is on. Watch it, or play the winner when it&apos;s over.
          </div>
        ) : (
          (Object.keys(PARTY_GAMES) as PartyGameId[]).map((id) => (
            <div key={id} className="rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
              <span className="text-3xl">{PARTY_GAMES[id].icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm">{PARTY_GAMES[id].name}</div>
                <div className="text-[11px] text-slate-500">{PARTY_GAMES[id].blurb}</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => go(id, false)} className="h-8 px-3 rounded-full bg-fuchsia-600 text-white text-[11px] font-black active:scale-95">Play a guest</button>
                <button onClick={() => go(id, true)} className="h-7 px-3 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black active:scale-95">vs computer</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PartyGameCard({ pg, me, isHost, present, onWatch, compact = false }: {
  /** Clear screen: just a pill (whose turn), tap it for the full card. */
  compact?: boolean;
  pg: PartyGames;
  me: string | null;
  isHost: boolean;
  /** Who's in the room right now (user ids), to tell when a player has left. */
  present: string[];
  onWatch: () => void;
}) {
  const [clock, setClock] = useState(0);
  // Shrunk by hand, or by the clear screen (until tapped open).
  const [smallSet, setSmall] = useState<boolean | null>(null);
  const [compactWas, setCompactWas] = useState(compact);
  if (compactWas !== compact) { setCompactWas(compact); setSmall(null); }
  const small = smallSet ?? compact;
  const s = pg.snap;
  useEffect(() => {
    if (!s || s.over) return;
    const tick = () => setClock(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [s?.id, s?.over]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return null;
  const info = PARTY_GAMES[s.game];
  const turn = turnOf(s);
  const [a, b] = s.players;
  const playing = pg.mySeat >= 0;
  const left = clock ? Math.max(0, Math.ceil((s.turnAt + TURN_LIMIT_MS - clock) / 1000)) : 90;
  const other = playing ? s.players[1 - pg.mySeat] : null;
  const otherGone = !!other && !other.ai && !present.includes(other.id);
  const canClaim = playing && !s.over && !!b && turn !== pg.mySeat && (otherGone || left === 0);
  const mine = me ? pg.predictions[me] : undefined;
  const tally = [0, 1].map((seat) => Object.values(pg.predictions).filter((x) => x === seat).length);
  const colors = SEAT_COLOR[s.game];

  const res = resultText(s, pg.mySeat);
  const status = res ? `${res.icon} ${res.title}`
    : !b ? (a.id === me ? "Waiting for a guest to join…" : "Needs a second player")
    : turn === pg.mySeat ? (s.game === "ludo" ? "Your turn: tap the big die" : s.game === "chess" ? "Your turn: tap a piece"
      : s.game === "pool" ? "Your turn: press on the felt, drag back, let go" : "Your turn: tap a column")
    : turnText(s, pg.mySeat);
  // Pool: who has solids or stripes, and the last shot's foul.
  const pool = s.game === "pool" ? (s.state as PoolState) : null;

  if (small) {
    return (
      <button onClick={() => setSmall(false)} className="fixed left-3 top-[calc(env(safe-area-inset-top)+10.5rem)] z-30 h-10 pl-3 pr-4 rounded-full bg-slate-950/90 text-white shadow-xl text-xs font-black flex items-center gap-1.5">
        {info.icon} {s.over ? info.name : turnText(s, pg.mySeat) || info.name}
      </button>
    );
  }

  return (
    <div className="fixed left-3 top-[calc(env(safe-area-inset-top)+10.5rem)] z-30 w-[15.5rem] max-w-[calc(100vw-5.5rem)] rounded-2xl bg-slate-950/90 text-white shadow-2xl backdrop-blur-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{info.icon}</span>
        <span className="font-black text-sm flex-1 truncate">{info.name}</span>
        <button onClick={() => setSmall(true)} className="w-6 h-6 rounded-full bg-white/10 text-[10px] font-black" aria-label="Make smaller">–</button>
      </div>
      <div className="space-y-1">
        {[a, b].map((p, seat) => (
          <div key={seat} className={`flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-bold ${turn === seat && !s.over ? "bg-white/15 ring-1 ring-amber-300" : "bg-white/5"}`}>
            <span className="w-3 h-3 rounded-full ring-1 ring-white/40" style={{ background: colors[seat] }} />
            <span className="flex-1 truncate">{p ? (p.ai ? `🤖 ${p.username}` : p.id === me ? "You" : `${SIDES[s.game][seat]} · @${p.username}`) : "Open seat"}{pool?.groups[seat] ? ` · ${pool.groups[seat]}` : ""}</span>
            {tally[seat] > 0 && <span className="text-[10px] text-amber-300">🔮 {tally[seat]}</span>}
            {turn === seat && !s.over && b && <span className={`text-[10px] font-mono ${left <= 15 ? "text-rose-300" : "text-white/60"}`}>{left}s</span>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-amber-200 font-bold">{status}</p>
      {pool?.shot?.note && !s.over && <p className="text-[10px] text-white/60">🎱 {pool.shot.note}</p>}
      {s.over && mine !== undefined && <p className="text-[11px] font-bold">{s.over.winners[0] === mine ? "🎯 You called it!" : "😅 Your prediction missed."}</p>}

      <div className="relative h-0">
        {pg.cheers.map((c, i) => (
          <span key={c.id} className="absolute -top-16 text-2xl animate-[party-cheer_2.4s_ease-out_forwards]" style={{ left: `${10 + ((i * 37) % 80)}%` }}>{c.emoji}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!s.over && !b && me && a.id !== me && (
          <button onClick={() => { gameAudio.playClickSound(); pg.join(); onWatch(); }} className="h-8 px-3 rounded-full bg-fuchsia-600 text-[11px] font-black active:scale-95">🙋 Join the game</button>
        )}
        {!s.over && !b && a.id === me && (
          <button onClick={() => { gameAudio.playClickSound(); pg.playComputer(); }} className="h-8 px-3 rounded-full bg-white/15 text-[11px] font-black active:scale-95">🤖 Play the computer</button>
        )}
        <button onClick={onWatch} className="h-8 px-3 rounded-full bg-white/15 text-[11px] font-black active:scale-95">👀 Watch</button>
        {canClaim && (
          <button onClick={() => { gameAudio.playClickSound(); pg.claim(); }} className="h-8 px-3 rounded-full bg-emerald-600 text-[11px] font-black active:scale-95">🏳️ {otherGone ? "They left: claim win" : "Out of time: claim win"}</button>
        )}
        {/* Either player (or the host) can end it; waiting alone, the starter just takes it down. */}
        {!s.over && b && (playing || isHost) && (
          <button onClick={() => { gameAudio.playClickSound(); pg.end(); }} className="h-8 px-3 rounded-full bg-rose-600/90 text-[11px] font-black active:scale-95">⏹️ End game</button>
        )}
        {!s.over && !b && (playing || isHost) && (
          <button onClick={() => { gameAudio.playClickSound(); pg.clear(); }} className="h-8 px-3 rounded-full bg-white/10 text-[11px] font-black text-white/80 active:scale-95">🧹 Clear board</button>
        )}
      </div>

      {/* Watching: cheer a player on, and call the winner (once both are seated). */}
      {!playing && !s.over && b && (
        <div className="space-y-1.5 border-t border-white/10 pt-2">
          <div className="flex gap-1">
            {CHEERS.map((emoji) => (
              <button key={emoji} data-emoji={emoji} onClick={(e) => pg.cheer(e.currentTarget.dataset.emoji!, turn ?? 0)} className="w-9 h-8 rounded-full bg-white/10 text-base active:scale-90">{emoji}</button>
            ))}
          </div>
          {mine === undefined ? (
            <div className="flex gap-1">
              {[a, b].map((p, seat) => (
                <button key={seat} data-seat={seat} onClick={(e) => { gameAudio.playClickSound(); pg.predict(Number(e.currentTarget.dataset.seat)); }}
                  className="flex-1 h-8 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black truncate px-2 active:scale-95">🔮 {SIDES[s.game][seat]} wins</button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/60">🔮 You picked {SIDES[s.game][mine]}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The result, for everyone at the party, as soon as a game ends: who won (from where you're standing: "You win!",
 * "You lose", or "Red wins!"), then Rematch (the two players again), Play another (the picker) or Close.
 */
export function PartyGameResult({ pg, isHost, onPickAnother }: { pg: PartyGames; isHost: boolean; onPickAnother: () => void }) {
  const s = pg.snap;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const res = s ? resultText(s, pg.mySeat) : null;
  const sound = s?.over ? `${s.id}:${pg.mySeat}` : "";
  useEffect(() => {
    if (!sound || !res) return;
    if (s?.over?.ended) gameAudio.sfx("notice");
    else if (res.won || pg.mySeat < 0) gameAudio.sfx(res.title === "It's a draw" ? "draw" : "win");
    else gameAudio.sfx("lose");
  }, [sound]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !res || dismissed === s.id) return null;
  const playing = pg.mySeat >= 0;
  const both = !!s.players[1];
  const close = () => {
    gameAudio.playClickSound();
    // The players and the host take the board down for everyone; anyone else just closes this.
    if (playing || isHost) pg.clear();
    else setDismissed(s.id);
  };
  // Straight into the page body, above everything else on screen (sheets, the feed, the side bar).
  return createPortal(
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+5rem)] z-[10050] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-950/95 text-white shadow-2xl ring-2 ring-amber-300/70 p-5 text-center animate-in zoom-in-90 duration-300">
        {res.won && (
          <div className="pointer-events-none absolute inset-0">
            {["🎉", "✨", "🎊", "⭐", "🎉", "✨", "🎊", "⭐"].map((e, i) => (
              <span key={i} className="absolute text-xl animate-[party-cheer_2.4s_ease-out_infinite]" style={{ left: `${6 + i * 12}%`, bottom: "8%", animationDelay: `${(i % 4) * 0.35}s` }}>{e}</span>
            ))}
          </div>
        )}
        <div className="text-6xl leading-none">{res.icon}</div>
        <p className={`mt-2 text-3xl font-black ${res.won ? "text-amber-300" : "text-white"}`}>{res.title}</p>
        <p className="mt-1 text-xs text-white/60">{res.sub}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button disabled={!playing || !both} onClick={() => { gameAudio.playClickSound(); pg.rematch(); }}
            className="h-11 rounded-2xl bg-fuchsia-600 text-xs font-black active:scale-95 disabled:opacity-30">🔁 Rematch</button>
          <button onClick={() => { gameAudio.playClickSound(); setDismissed(s.id); onPickAnother(); }}
            className="h-11 rounded-2xl bg-white/15 text-xs font-black active:scale-95">🎲 Play another</button>
          <button onClick={close} className="h-11 rounded-2xl bg-white/10 text-xs font-black text-white/80 active:scale-95">✕ Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
