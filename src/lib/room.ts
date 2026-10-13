"use client";

// Who else is in the same room (a venue or someone's home), and what they're saying and doing.
// Each room is a Supabase Realtime channel: presence carries every citizen's position, look and
// animation; broadcasts carry chat, waves, gifts and invites. Money goes through the database
// (send_money) so balances stay authoritative; the broadcast only tells the other side to look.
// Chat is also saved (public.messages, kept for 7 days): the broadcast is the instant copy and
// shares the saved message's id, so history and live lines never double up.

import { markRead } from "@/lib/unread";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen, useCitizen } from "@/lib/citizenStore";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { AvatarAnimation } from "@/components/avatar/CitizenAvatar";

export interface Peer {
  userId: string;
  username: string;
  name: string;
  look?: AvatarLookProps;
  /** Where they're standing or heading, in room coordinates. */
  x: number;
  z: number;
  face?: number;
  animation: AvatarAnimation;
  /** Raised off the floor while sitting on a sofa. */
  lift?: number;
}

export interface Gift {
  name: string;
  icon: string;
  /** How it's served (cocktail, coffee…), and where it was put down for them. */
  serve?: string;
  position?: [number, number, number];
}

export type RoomEvent =
  | { type: "chat"; text: string }
  | { type: "typing" }
  | { type: "wave" }
  | { type: "money"; amount: number }
  | { type: "gift"; gift: Gift }
  | { type: "invite"; kind: "join" | "dance" | "table"; table?: string }
  | { type: "served"; item: { id: string; kind: string; position: [number, number, number]; rotation: number; tint?: string } }
  | { type: "bottle"; station: string }
  | { type: "accept"; kind: "join" | "dance" | "table"; spot?: [number, number] }
  | { type: "friend" };

export type Received = RoomEvent & { id: string; from: Peer; to?: string; at: number };

/** A line in a one-to-one conversation. */
export interface ChatMessage {
  id: string;
  /** The other person in the conversation. */
  with: string;
  mine: boolean;
  text: string;
  at: number;
  /** Couldn't be saved (shown so the sender can try again). */
  failed?: boolean;
}

const TYPING_MS = 3000;
/** Window event announcing money from someone in the same room. */
export const MONEY_EVENT = "cometodubai:money";
const HISTORY_DAYS = 7;

/** Adds messages to a conversation list, skipping ones already there, oldest first. */
function merge(list: ChatMessage[], more: ChatMessage[]) {
  const seen = new Set(list.map((m) => m.id));
  const added = more.filter((m) => !seen.has(m.id));
  if (!added.length) return list;
  return [...list, ...added].sort((a, b) => a.at - b.at).slice(-300);
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export interface Me {
  x: number;
  z: number;
  face?: number;
  animation: AvatarAnimation;
  lift?: number;
}

const send = (channel: RealtimeChannel | null, payload: unknown) =>
  channel?.send({ type: "broadcast", event: "evt", payload }).catch(() => {});

/**
 * Joins a room. `roomId` null means not in one. Returns the other citizens here, recent events
 * (for me or for everyone), and a way to send events.
 */
export function useRoom(roomId: string | null, me: Me, onEvent?: (e: Received) => void) {
  const { citizen } = useCitizen();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [events, setEvents] = useState<Received[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // When each person last typed to me, and how many of their messages I haven't read.
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const reading = useRef<string | null>(null);
  const handler = useRef(onEvent);
  useEffect(() => { handler.current = onEvent; }, [onEvent]);
  const channel = useRef<RealtimeChannel | null>(null);
  const ready = useRef(false);
  const self = useRef<Peer | null>(null);

  const myId = citizen?.id ?? null;
  // Selfie avatars live in the creator's browser, so others see their base look.
  const look = citizen?.look ? { ...citizen.look, custom: undefined } : undefined;
  const profile = citizen ? { userId: citizen.id, username: citizen.username, name: citizen.name, look } : null;

  // What others see of me.
  useEffect(() => {
    if (!profile) return;
    self.current = { ...profile, x: me.x, z: me.z, face: me.face, animation: me.animation, lift: me.lift };
    if (ready.current) channel.current?.track(self.current).catch(() => {});
    // profile is rebuilt every render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId, profile?.username, profile?.name, citizen?.look, me.x, me.z, me.face, me.animation, me.lift]);

  useEffect(() => {
    if (!roomId || !myId) return;
    const ch = supabase().channel(`room:${roomId}`, { config: { presence: { key: myId }, broadcast: { self: false } } });
    channel.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Peer>();
      // One entry per citizen (a second tab of the same person shows once).
      const list = Object.entries(state)
        .filter(([key]) => key !== myId)
        .map(([, metas]) => metas[metas.length - 1])
        .filter((p): p is Peer & { presence_ref: string } => !!p && !!p.userId);
      setPeers(list.map((p) => ({ userId: p.userId, username: p.username, name: p.name, look: p.look, x: p.x, z: p.z, face: p.face, animation: p.animation, lift: p.lift })));
    });
    ch.on("broadcast", { event: "evt" }, ({ payload }) => {
      const e = { ...(payload as Received), at: Date.now() };
      if (e.to && e.to !== myId) return;
      const from = e.from.userId;
      if (e.type === "typing") {
        setTyping((t) => ({ ...t, [from]: e.at }));
        return;
      }
      if (e.type === "chat") {
        setTyping((t) => ({ ...t, [from]: 0 }));
        setMessages((m) => merge(m, [{ id: e.id, with: from, mine: false, text: e.text, at: e.at }]));
        if (reading.current !== from) setUnread((u) => ({ ...u, [from]: (u[from] ?? 0) + 1 }));
      }
      setEvents((list) => [...list.slice(-39), e]);
      if (e.type === "money") {
        refreshCitizen();
        // The app-wide notice shows it now, rather than waiting for the database event.
        window.dispatchEvent(new CustomEvent(MONEY_EVENT, { detail: { from: e.from.username, amount: e.amount } }));
      }
      handler.current?.(e);
    });
    ch.subscribe((status) => {
      ready.current = status === "SUBSCRIBED";
      if (ready.current && self.current) ch.track(self.current).catch(() => {});
    });
    return () => {
      ready.current = false;
      channel.current = null;
      setPeers([]);
      supabase().removeChannel(ch);
    };
  }, [roomId, myId]);

  /** Sends an event to one citizen (`to`) or the whole room. */
  const emit = (event: RoomEvent, to?: string, id = newId()) => {
    if (!self.current) return;
    send(channel.current, { ...event, id, from: self.current, to });
  };

  /** Sends a chat line: shown at once, delivered live, and saved for a week. */
  const say = (to: string, text: string, place?: string) => {
    if (!myId) return;
    const id = newId();
    setMessages((m) => merge(m, [{ id, with: to, mine: true, text, at: Date.now() }]));
    emit({ type: "chat", text }, to, id);
    supabase().from("messages").insert({ id, from_id: myId, to_id: to, body: text, place: place ?? null }).then(({ error }) => {
      if (error) setMessages((m) => m.map((x) => (x.id === id ? { ...x, failed: true } : x)));
    });
  };

  /** Loads the last week of a conversation from the database. */
  const loadThread = useCallback(async (other: string) => {
    if (!myId) return;
    const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString();
    const { data } = await supabase()
      .from("messages")
      .select("id, from_id, to_id, body, created_at")
      .or(`and(from_id.eq.${myId},to_id.eq.${other}),and(from_id.eq.${other},to_id.eq.${myId})`)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) return;
    setMessages((m) => merge(m, data.map((r) => ({ id: r.id, with: other, mine: r.from_id === myId, text: r.body, at: Date.parse(r.created_at) }))));
  }, [myId]);

  // Throttled: at most one typing signal a second.
  const lastTyping = useRef(0);
  const typingTo = (to: string) => {
    const now = Date.now();
    if (now - lastTyping.current < 1000) return;
    lastTyping.current = now;
    emit({ type: "typing" }, to);
  };

  /** Marks a conversation as open (and read) while it's on screen; null when closed. */
  const openThread = useCallback((userId: string | null) => {
    reading.current = userId;
    if (!userId) return;
    setUnread((u) => (u[userId] ? { ...u, [userId]: 0 } : u));
    void markRead(userId);
    void loadThread(userId);
  }, [loadThread]);

  const isTyping = (userId: string, now: number) => now - (typing[userId] ?? 0) < TYPING_MS;

  return { peers, events, emit, myId, messages, say, typingTo, isTyping, unread, openThread };
}

/** Pays another citizen. Resolves to an error message, or null when it went through. */
export async function sendMoney(to: Peer, amount: number, place: string): Promise<string | null> {
  const { error } = await supabase().rpc("send_money", { p_to: to.userId, p_amount: amount, p_place: place });
  refreshCitizen();
  if (!error) return null;
  return /insufficient_funds/.test(error.message) ? "You don't have enough AED for that."
    : /too_many/.test(error.message) ? "Slow down — try again in a minute."
    : /amount_out_of_range/.test(error.message) ? "Send between 1 and AED 1,000,000."
    : "The transfer didn't go through. Please try again.";
}

/** Sends (or accepts) a friend request. */
export async function befriend(myId: string, other: Peer): Promise<"sent" | "friends" | "error"> {
  const db = supabase();
  // If they already asked me, accept theirs.
  const { data: theirs } = await db.from("friendships").select("status").eq("user_id", other.userId).eq("friend_id", myId).maybeSingle();
  if (theirs) {
    const { error } = await db.from("friendships").update({ status: "accepted" }).eq("user_id", other.userId).eq("friend_id", myId);
    return error ? "error" : "friends";
  }
  const { error } = await db.from("friendships").insert({ user_id: myId, friend_id: other.userId });
  return error && !/duplicate/.test(error.message) ? "error" : "sent";
}
