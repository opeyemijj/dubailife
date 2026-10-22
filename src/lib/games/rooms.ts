"use client";

// Rooms for playing together: create (public or private with a code), quick match, join by code, and
// take turns writing the game state. Everyone in the room watches the row through Realtime.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { GameId } from "./registry";

export interface RoomPlayer { id: string; username: string; name: string; look?: AvatarLookProps }

export interface GameRoom<S = unknown> {
  id: string;
  game: GameId;
  code: string;
  is_public: boolean;
  host_id: string;
  max_players: number;
  players: RoomPlayer[];
  status: "lobby" | "playing" | "done";
  state: S | null;
  version: number;
}

const friendly = (m: string) =>
  /room_not_found/.test(m) ? "No room with that code." : /room_full/.test(m) ? "That room is full." : /room_started/.test(m) ? "That game has already started."
  : /not_signed_in/.test(m) ? "Please log in to play with others." : /stale_move/.test(m) ? "Someone moved first — updating."
  : /cant_pay:(.*)/.test(m) ? `Not enough virtual AED to play: ${m.match(/cant_pay:([^"]*)/)?.[1]?.trim()}`
  : /insufficient_funds/.test(m) ? "You don't have enough virtual AED for this game. Top up in your wallet."
  : "Something went wrong. Please try again.";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

export const createRoom = (game: GameId, isPublic: boolean, max: number) => call<GameRoom>("create_game_room", { p_game: game, p_public: isPublic, p_max: max });
export const quickMatch = (game: GameId, max: number) => call<GameRoom>("quick_match", { p_game: game, p_max: max });
export const joinRoom = (code: string) => call<GameRoom>("join_game_room", { p_code: code });
export const leaveRoom = (id: string) => call<null>("leave_game_room", { p_room: id });
export const startRoom = <S,>(id: string, state: S) => call<GameRoom<S>>("start_game_room", { p_room: id, p_state: state });
export const moveRoom = <S,>(id: string, version: number, state: S, done = false) => call<GameRoom<S>>("game_move", { p_room: id, p_version: version, p_state: state, p_done: done });

/** A room kept up to date: changes from any player arrive through Realtime. */
export function useRoomLive<S>(initial: GameRoom<S> | null): [GameRoom<S> | null, (r: GameRoom<S>) => void] {
  const [room, setRoom] = useState<GameRoom<S> | null>(initial);
  const id = room?.id ?? initial?.id;
  useEffect(() => {
    if (!id) return;
    const ch = supabase()
      .channel(`game-room-${id}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${id}` }, (payload) => {
        if (payload.eventType === "DELETE") { setRoom(null); return; }
        const next = payload.new as GameRoom<S>;
        setRoom((cur) => (!cur || next.version >= cur.version ? next : cur));
      })
      .subscribe();
    // In case an update landed before the subscription did.
    void supabase().from("game_rooms").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setRoom((cur) => (!cur || (data as GameRoom<S>).version >= cur.version ? (data as GameRoom<S>) : cur));
    });
    return () => { supabase().removeChannel(ch); };
  }, [id]);
  return [room, (r) => setRoom((cur) => (!cur || r.version >= cur.version ? r : cur))];
}

// ---------------------------------------------------------------- results and Hall of Fame

export type Outcome = "win" | "loss" | "draw";

export async function recordResult(game: GameId, mode: "ai" | "multiplayer", outcome: Outcome, score: number, roomId?: string) {
  await supabase().rpc("record_game_result", { p_game: game, p_mode: mode, p_outcome: outcome, p_score: Math.round(score), p_room: roomId ?? null });
  const { gainSkill, lifeEvent } = await import("@/lib/life");
  lifeEvent("game");
  gainSkill("gaming", outcome === "win" ? 15 : 8);
}

export interface HallRow { user_id: string; username: string; name: string; look: AvatarLookProps | null; wins: number; played: number; best_score: number | null; points: number }
export async function hallOfFame(game: GameId): Promise<HallRow[]> {
  const { data } = await supabase().rpc("game_hall_of_fame", { p_game: game, p_limit: 20 });
  return (data as HallRow[]) ?? [];
}

export interface MyStats { wins: number; losses: number; draws: number; best_score: number | null }
export async function myStats(game: GameId): Promise<MyStats | null> {
  const { data } = await supabase().rpc("my_game_stats", { p_game: game });
  return ((data as MyStats[]) ?? [])[0] ?? null;
}

/** A small deterministic random generator (mulberry32), so every player in a room sees the same shuffle. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------- fee per game

let feeCache: Promise<number> | null = null;
/** What one game costs, in virtual AED. */
export const gameFee = () => (feeCache ??= Promise.resolve(supabase().rpc("game_fee")).then(({ data }) => Number(data ?? 0)));

/** Pays for a game against the computer. Null on success, or what went wrong. */
export async function payGameFee(game: GameId): Promise<string | null> {
  const { error } = await supabase().rpc("pay_game_fee", { p_game: game });
  const { refreshCitizen } = await import("@/lib/citizenStore");
  refreshCitizen();
  return error ? friendly(error.message) : null;
}

// ---------------------------------------------------------------- saved games (against the computer)

export interface SavedGame<S = unknown> { game: GameId; seats: number; state: S; updated_at: string }

export async function loadSave<S>(game: GameId): Promise<SavedGame<S> | null> {
  const { data } = await supabase().from("game_saves").select("game, seats, state, updated_at").eq("game", game).maybeSingle();
  return (data as SavedGame<S>) ?? null;
}

export async function saveGame(userId: string, game: GameId, seats: number, state: unknown) {
  await supabase().from("game_saves").upsert({ user_id: userId, game, seats, state, updated_at: new Date().toISOString() });
}

export async function clearSave(game: GameId) {
  await supabase().from("game_saves").delete().eq("game", game);
}

/** Rooms I'm still in (waiting or playing), to rejoin. */
export async function myOpenRooms(): Promise<GameRoom[]> {
  const { data } = await supabase().rpc("my_open_rooms");
  return (data as GameRoom[]) ?? [];
}

// ---------------------------------------------------------------- chat in a room

export interface ChatLine { id: number; user_id: string; username: string; body: string; created_at: string }

/** The room's chat: the last 50 lines, then new ones live. */
export function useRoomChat(roomId: string | null) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    void supabase().from("game_messages").select("id, user_id, username, body, created_at").eq("room_id", roomId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (alive && data) setLines((cur) => merge(cur, (data as ChatLine[]).reverse())); });
    const ch = supabase()
      .channel(`game-chat-${roomId}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_messages", filter: `room_id=eq.${roomId}` }, (payload) => setLines((cur) => merge(cur, [payload.new as ChatLine])))
      .subscribe();
    return () => { alive = false; supabase().removeChannel(ch); };
  }, [roomId]);
  const send = useCallback(async (userId: string, username: string, body: string) => {
    const text = body.trim().slice(0, 300);
    if (!text || !roomId) return null;
    const { data, error } = await supabase().from("game_messages").insert({ room_id: roomId, user_id: userId, username, body: text }).select("id, user_id, username, body, created_at").single();
    if (data) setLines((cur) => merge(cur, [data as ChatLine]));
    return !error ? null : /\bmuted\b/.test(error.message) ? "You're muted for 7 days for breaking the community rules." : "Couldn't send — slow down a little.";
  }, [roomId]);
  return { lines, send };
}

const merge = (cur: ChatLine[], more: ChatLine[]) => {
  const seen = new Set(cur.map((l) => l.id));
  return [...cur, ...more.filter((l) => !seen.has(l.id))].slice(-100);
};
