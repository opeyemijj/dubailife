"use client";

// Requests for someone who's away (idle, not connected): dance, sit at my table, come over. Saved for 5 minutes with a
// push notification, and handed to them when they're back, where they pop up like any invite. See *_away.sql.

import { supabase } from "@/lib/supabase/client";
import { sendPushNotification } from "@/lib/push/client";

export type LiveKind = "join" | "dance" | "table";
export interface SavedRequest { id: number; kind: LiveKind; table: string | null; at: string; from: { id: string; username: string } }

export const LIVE_REQUEST_MINUTES = 5;
const ASK: Record<LiveKind, string> = { dance: "to dance", table: "to sit at their table", join: "to come over" };
export const askText = (kind: LiveKind) => ASK[kind];

/** Saves the request and pings their phone. Returns its id, or null if it couldn't be saved. */
export async function sendLiveRequest(room: string, to: string, kind: LiveKind, from: string, place: string, table?: string): Promise<number | null> {
  const { data, error } = await supabase().rpc("send_live_request", { p_room: room, p_to: to, p_kind: kind, p_table: table ?? null });
  if (error) return null;
  void sendPushNotification(to, {
    title: `${kind === "dance" ? "💃" : kind === "table" ? "🪑" : "🙌"} @${from} asked you ${ASK[kind]}`,
    body: `At ${place}. Come back in the next ${LIVE_REQUEST_MINUTES} minutes to answer.`,
    url: typeof window === "undefined" ? "/" : window.location.pathname,
    tag: `live-${data}`,
  });
  return data as number;
}

/** Back from being away: the requests waiting for me here (each handed over once). */
export async function takeLiveRequests(room: string): Promise<SavedRequest[]> {
  const { data } = await supabase().rpc("take_live_requests", { p_room: room });
  return (data as SavedRequest[] | null) ?? [];
}

/** For whoever asked: "pending", "delivered" (they came back and saw it) or "expired". */
export async function liveRequestStatus(id: number): Promise<string | null> {
  const { data } = await supabase().rpc("live_request_status", { p_id: id });
  return (data as string | null) ?? null;
}
