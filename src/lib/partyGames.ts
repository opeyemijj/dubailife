"use client";

// Party games: during a house party any guest can start a two-player game (Connect Four, chess, Ludo or pool) and it
// appears in 3D outside the house (on a glass deck over the pool, on the lawn, or on a terrace beside a flat) for
// everyone at the party to watch. Nobody owns it: it's on demand, one board at a time.
//
// It lives in the party's live room (flat:<id>): every change is a full snapshot with a sequence number, so the
// newest one wins on every screen, and the players re-send it every few seconds so late arrivals see the board.
// The rules are the Game City modules (src/components/games), so the computer opponent is the same one.

import { useCallback, useEffect, useRef, useState } from "react";
import { MODULES } from "@/components/games";
import type { Received, RoomEvent } from "@/lib/room";

export type PartyGameId = "connect4" | "chess" | "ludo" | "pool";

export const PARTY_GAMES: Record<PartyGameId, { name: string; icon: string; blurb: string }> = {
  // Pool first: it's the table standing outside at every party.
  pool: { name: "Pool", icon: "🎱", blurb: "8-ball on a full-size table outside" },
  connect4: { name: "Connect Four", icon: "🔴", blurb: "Giant frame: four in a row wins" },
  chess: { name: "Garden chess", icon: "♟️", blurb: "Life-size pieces on the deck" },
  ludo: { name: "Ludo", icon: "🎲", blurb: "Roll the giant die, race home" },
};

export interface PartyPlayer { id: string; username: string; ai?: boolean }

export interface PartyGameSnap {
  id: string;
  game: PartyGameId;
  /** Bumps on every change; the highest wins. */
  seq: number;
  /** Who made this change (breaks ties). */
  by: string;
  players: [PartyPlayer, PartyPlayer | null];
  state: unknown;
  startedAt: number;
  /** When the current turn began (for the turn clock). */
  turnAt: number;
  /** Set once it's over: the winning seats (empty = a draw), and whether it was claimed (the other player left). */
  over?: { winners: number[]; claimed?: boolean; ended?: boolean } | null;
}

/** How long a turn can sit before the other player can claim the game. */
export const TURN_LIMIT_MS = 90_000;
const RESEND_MS = 6_000;
const AI = (game: PartyGameId): PartyPlayer => ({ id: "ai", username: game === "chess" ? "Coach" : "Computer", ai: true });

const now = () => Date.now();

/** Whether an incoming snapshot replaces the one I have. */
function wins(a: PartyGameSnap, b: PartyGameSnap | null) {
  if (!b) return true;
  if (a.id === b.id) return a.seq > b.seq || (a.seq === b.seq && a.by < b.by);
  // A new game after a finished one; between two running games, the first one started stays.
  if (b.over) return a.startedAt > b.startedAt;
  if (a.over) return false;
  return a.startedAt < b.startedAt || (a.startedAt === b.startedAt && a.id < b.id);
}

export function turnOf(s: PartyGameSnap): number | null {
  if (s.over) return null;
  return MODULES[s.game].turnOf?.(s.state) ?? null;
}

/** Each side's colour, which is how people watching tell the players apart. */
export const SIDES: Record<PartyGameId, [string, string]> = {
  connect4: ["Red", "Yellow"], chess: ["White", "Black"], ludo: ["Red", "Yellow"], pool: ["Green", "Blue"],
};

/** Whose turn, from where I'm standing: "Your turn" / "Their turn" for the players, the colour for everyone else. */
export function turnText(s: PartyGameSnap, mySeat: number): string {
  const t = turnOf(s);
  if (t === null) return "";
  if (!s.players[1]) return "Waiting for a player";
  if (mySeat >= 0) return t === mySeat ? "Your turn" : "Their turn";
  return `${SIDES[s.game][t]}'s turn`;
}

/** The result, from where I'm standing. */
export function resultText(s: PartyGameSnap, mySeat: number): { icon: string; title: string; sub: string; won: boolean } | null {
  if (!s.over) return null;
  const w = s.over.winners;
  const name = PARTY_GAMES[s.game].name;
  if (s.over.ended) {
    const by = s.by === s.players[mySeat]?.id ? "you" : s.players.some((p) => p?.id === s.by) ? (mySeat >= 0 ? "them" : `${SIDES[s.game][s.players.findIndex((p) => p?.id === s.by)]}`) : "the host";
    return { icon: "⏹️", title: "Game ended", sub: `${name} · ended by ${by}`, won: false };
  }
  if (!w.length) return { icon: "🤝", title: "It's a draw", sub: name, won: false };
  const winner = s.players[w[0]];
  const how = s.over.claimed ? " (the other player left)" : "";
  if (mySeat >= 0) return w[0] === mySeat ? { icon: "🏆", title: "You win!", sub: `${name}${how}`, won: true } : { icon: "😞", title: "You lose", sub: `${name}${how}`, won: false };
  return { icon: "🏆", title: `${SIDES[s.game][w[0]]} wins!`, sub: `${winner?.ai ? winner.username : `@${winner?.username}`} · ${name}${how}`, won: true };
}

export interface Cheer { id: string; emoji: string; who: string; seat: number; at: number }

/**
 * The party board, for one party room. `receive` goes first in the room's onEvent (true = it was a party game
 * event); `bindEmit` is the room's emit (set after useRoom, since the room needs onEvent first).
 */
export function usePartyGames({ me, isHost, present }: { me: { id: string; username: string } | null; isHost: boolean; present: string[] }) {
  const [snap, setSnap] = useState<PartyGameSnap | null>(null);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const snapRef = useRef<PartyGameSnap | null>(null);
  const emitRef = useRef<((e: RoomEvent) => void) | null>(null);
  useEffect(() => { snapRef.current = snap; }, [snap]);

  const bindEmit = useCallback((emit: (e: RoomEvent) => void) => { emitRef.current = emit; }, []);

  const addCheer = useCallback((c: Omit<Cheer, "id" | "at">) => {
    const id = Math.random().toString(36).slice(2);
    setCheers((list) => [...list.slice(-7), { ...c, id, at: now() }]);
    setTimeout(() => setCheers((list) => list.filter((x) => x.id !== id)), 2600);
  }, []);

  const receive = useCallback((e: Received): boolean => {
    if (e.type === "party_game") {
      if (e.snap === null) {
        if (snapRef.current && snapRef.current.id === e.clearedId) { snapRef.current = null; setSnap(null); setPredictions({}); }
      } else if (wins(e.snap, snapRef.current)) {
        if (snapRef.current?.id !== e.snap.id) setPredictions({});
        snapRef.current = e.snap;
        setSnap(e.snap);
      }
      return true;
    }
    if (e.type === "party_cheer") {
      if (snapRef.current?.id === e.gameId) addCheer({ emoji: e.emoji, who: e.from.username, seat: e.seat });
      return true;
    }
    if (e.type === "party_sync") {
      // A new arrival: the players send the board now (or the host, when no player is here).
      const cur = snapRef.current;
      if (cur && me && (cur.players.some((p) => p && !p.ai && p.id === me.id) || isHost)) emitRef.current?.({ type: "party_game", snap: cur });
      return true;
    }
    if (e.type === "party_predict") {
      if (snapRef.current?.id === e.gameId) setPredictions((p) => ({ ...p, [e.from.userId]: e.seat }));
      return true;
    }
    return false;
  }, [addCheer, me, isHost]);

  /** Mine to set: apply it here and send it to everyone. */
  const publish = useCallback((next: PartyGameSnap | null, clearedId?: string) => {
    snapRef.current = next;
    setSnap(next);
    emitRef.current?.({ type: "party_game", snap: next, clearedId });
  }, []);

  const mySeat = snap && me ? snap.players.findIndex((p) => p && !p.ai && p.id === me.id) : -1;

  const start = useCallback((game: PartyGameId, vsComputer = false) => {
    if (!me) return;
    const cur = snapRef.current;
    if (cur && !cur.over) return;
    const t = now();
    publish({
      id: `${me.id.slice(0, 8)}-${t.toString(36)}`, game, seq: 1, by: me.id,
      players: [{ id: me.id, username: me.username }, vsComputer ? AI(game) : null],
      state: MODULES[game].init(2, Math.floor(Math.random() * 1e9)), startedAt: t, turnAt: t, over: null,
    });
  }, [me, publish]);

  const bump = useCallback((cur: PartyGameSnap, patch: Partial<PartyGameSnap>): PartyGameSnap => ({ ...cur, ...patch, seq: cur.seq + 1, by: me?.id ?? "?" }), [me]);

  /** Take the empty seat. */
  const join = useCallback(() => {
    const cur = snapRef.current;
    if (!me || !cur || cur.over || cur.players[1] || cur.players[0].id === me.id) return;
    publish(bump(cur, { players: [cur.players[0], { id: me.id, username: me.username }], turnAt: now() }));
  }, [me, publish, bump]);

  /** The starter gives up waiting: the computer takes the other seat. */
  const playComputer = useCallback(() => {
    const cur = snapRef.current;
    if (!me || !cur || cur.over || cur.players[1] || cur.players[0].id !== me.id) return;
    publish(bump(cur, { players: [cur.players[0], AI(cur.game)], turnAt: now() }));
  }, [me, publish, bump]);

  /** The same game again with the same two players, the other one starting. */
  const rematch = useCallback(() => {
    const cur = snapRef.current;
    if (!me || !cur || !cur.over || !cur.players[1] || !cur.players.some((p) => p && p.id === me.id)) return;
    const t = now();
    const [a, b] = cur.players;
    publish({
      id: `${me.id.slice(0, 8)}-${t.toString(36)}`, game: cur.game, seq: 1, by: me.id,
      players: b.ai ? [a, b] : [b, a],
      state: MODULES[cur.game].init(2, Math.floor(Math.random() * 1e9)), startedAt: t, turnAt: t, over: null,
    });
  }, [me, publish]);

  /** A move: the full new game state. */
  const move = useCallback((state: unknown) => {
    const cur = snapRef.current;
    if (!cur || cur.over) return;
    const res = MODULES[cur.game].result(state);
    const prevTurn = turnOf(cur);
    const next = bump(cur, { state, over: res ? { winners: res.winners } : null });
    if (MODULES[cur.game].turnOf?.(state) !== prevTurn) next.turnAt = now();
    publish(next);
  }, [bump, publish]);

  /** The other player left or ran out the clock: the game is mine. */
  const claim = useCallback(() => {
    const cur = snapRef.current;
    if (!cur || cur.over || mySeat < 0) return;
    const next = bump(cur, { over: { winners: [mySeat], claimed: true } });
    publish(next);
  }, [mySeat, bump, publish]);

  /** Either player (or the host) stops the game: no winner, and everyone gets the result card to play again. */
  const end = useCallback(() => {
    const cur = snapRef.current;
    if (!cur || cur.over || !me) return;
    publish(bump(cur, { over: { winners: [], ended: true } }));
  }, [me, publish, bump]);

  const clear = useCallback(() => {
    const cur = snapRef.current;
    if (cur) publish(null, cur.id);
  }, [publish]);

  const cheer = useCallback((emoji: string, seat: number) => {
    const cur = snapRef.current;
    if (!cur || !me) return;
    addCheer({ emoji, who: me.username, seat });
    emitRef.current?.({ type: "party_cheer", gameId: cur.id, seat, emoji });
  }, [me, addCheer]);

  const predict = useCallback((seat: number) => {
    const cur = snapRef.current;
    if (!cur || !me) return;
    setPredictions((p) => ({ ...p, [me.id]: seat }));
    emitRef.current?.({ type: "party_predict", gameId: cur.id, seat });
  }, [me]);

  // Just arrived at the party: ask for the board, so a game already on shows up at once.
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => emitRef.current?.({ type: "party_sync" }), 2500);
    return () => clearTimeout(t);
  }, [me]);

  // The computer's moves, made by the human who started the game.
  const aiKey = snap ? `${snap.id}:${snap.seq}` : "";
  useEffect(() => {
    const cur = snapRef.current;
    if (!cur || cur.over || !me) return;
    const aiSeat = cur.players.findIndex((p) => p?.ai);
    if (aiSeat < 0 || cur.players[1 - aiSeat]?.id !== me.id || turnOf(cur) !== aiSeat) return;
    const mod = MODULES[cur.game];
    // Wait for the last shot to stop rolling (pool), then a moment to "think".
    const wait = Math.max(mod.delay?.(cur.state) ?? 0, cur.game === "ludo" ? 900 : 1100);
    const t = setTimeout(async () => {
      const latest = snapRef.current;
      if (!latest || latest.id !== cur.id || latest.seq !== cur.seq) return;
      move(await mod.ai(latest.state, aiSeat));
    }, wait);
    return () => clearTimeout(t);
  }, [aiKey, me, move]);

  // Re-send the board for anyone who just walked in: the players do it, or the host when nobody's playing.
  const presentKey = present.join(",");
  useEffect(() => {
    if (!snap || !me) return;
    const playing = snap.players.some((p) => p && !p.ai && p.id === me.id);
    const playersHere = snap.players.some((p) => p && !p.ai && (p.id === me.id || present.includes(p.id)));
    if (!playing && !(isHost && !playersHere)) return;
    const t = setInterval(() => { const cur = snapRef.current; if (cur) emitRef.current?.({ type: "party_game", snap: cur }); }, RESEND_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- presentKey stands for present
  }, [snap?.id, me?.id, isHost, presentKey]);

  return { snap, mySeat, cheers, predictions, receive, bindEmit, start, join, playComputer, move, claim, clear, cheer, predict, rematch, end };
}

export type PartyGames = ReturnType<typeof usePartyGames>;
