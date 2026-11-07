"use client";

// Direct messages between citizens, saved for 7 days (public.messages). The phone lists the
// conversations; rooms in venues and homes use the same table for their chat.

import { onUserEvent } from "@/lib/userChannel";
import { chatRefused } from "@/lib/safety";
import { askForPush } from "@/lib/push/engage";
import { supabase } from "@/lib/supabase/client";
import { gainSkill, lifeEvent } from "@/lib/life";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { sendPushNotification } from "@/lib/push/client";

export const MESSAGE_DAYS = 7;

export interface Contact {
  id: string;
  username: string;
  name: string;
  look?: AvatarLookProps;
}

export interface Message {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  place: string | null;
  created_at: string;
}

export interface Conversation {
  with: Contact;
  last: Message;
  count: number;
}

const since = () => new Date(Date.now() - MESSAGE_DAYS * 86400000).toISOString();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public profile details for some citizens, by id or username. */
export async function contacts(idsOrUsernames: string[]): Promise<Map<string, Contact>> {
  const cleaned = [...new Set(idsOrUsernames.map((s) => s.trim().replace(/^@/, "")).filter(Boolean))];
  if (!cleaned.length) return new Map();

  const uuids = cleaned.filter((s) => UUID_REGEX.test(s));
  const usernames = cleaned.filter((s) => !UUID_REGEX.test(s));

  const queries: Promise<{ data: any[] | null }>[] = [];
  if (uuids.length) {
    queries.push(Promise.resolve(supabase().from("profiles").select("id, username, display_name, citizen").in("id", uuids)));
  }
  if (usernames.length) {
    queries.push(Promise.resolve(supabase().from("profiles").select("id, username, display_name, citizen").in("username", usernames)));
  }

  const results = await Promise.all(queries);
  const map = new Map<string, Contact>();

  for (const res of results) {
    for (const p of res.data ?? []) {
      const contact: Contact = {
        id: p.id,
        username: p.username,
        name: p.display_name,
        look: (p.citizen as { look?: AvatarLookProps } | null)?.look,
      };
      map.set(p.id, contact);
      map.set(p.username, contact);
      map.set(`@${p.username}`, contact);
      map.set(p.username.toLowerCase(), contact);
      map.set(`@${p.username.toLowerCase()}`, contact);
    }
  }

  return map;
}

/** Everyone I've talked to, newest conversation first. */
export async function listConversations(me: string): Promise<Conversation[]> {
  const { data } = await supabase()
    .from("messages")
    .select("id, from_id, to_id, body, place, created_at")
    .or(`from_id.eq.${me},to_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(1000);
  const byPerson = new Map<string, { last: Message; count: number }>();
  for (const m of (data ?? []) as Message[]) {
    const other = m.from_id === me ? m.to_id : m.from_id;
    const c = byPerson.get(other);
    if (c) c.count++;
    else byPerson.set(other, { last: m, count: 1 });
  }
  const people = await contacts([...byPerson.keys()]);
  return [...byPerson.entries()].flatMap(([id, c]) => {
    const who = people.get(id);
    return who ? [{ with: who, ...c }] : [];
  });
}

/** One conversation, all messages from all time, oldest first. */
export async function loadConversation(me: string, other: string): Promise<Message[]> {
  const cleanOther = other.trim().replace(/^@/, "");
  let otherId = cleanOther;
  let otherUsername = cleanOther.toLowerCase();

  // Resolve target citizen info (support lookup by UUID or username)
  if (UUID_REGEX.test(cleanOther)) {
    const { data: prof } = await supabase().from("profiles").select("id, username").eq("id", cleanOther).maybeSingle();
    if (prof?.username) {
      otherUsername = prof.username.toLowerCase();
    }
  } else {
    const { data: prof } = await supabase().from("profiles").select("id, username").ilike("username", cleanOther).maybeSingle();
    if (prof?.id) {
      otherId = prof.id;
      otherUsername = (prof.username ?? cleanOther).toLowerCase();
    }
  }

  const map = new Map<string, Message>();

  // 1. Targeted indexed queries for all sent and received messages (no limits, no postgrest compound or bugs)
  if (UUID_REGEX.test(otherId) && UUID_REGEX.test(me)) {
    const [sent, received] = await Promise.all([
      supabase().from("messages").select("id, from_id, to_id, body, place, created_at").eq("from_id", me).eq("to_id", otherId).order("created_at", { ascending: true }),
      supabase().from("messages").select("id, from_id, to_id, body, place, created_at").eq("from_id", otherId).eq("to_id", me).order("created_at", { ascending: true }),
    ]);
    for (const m of (sent.data ?? []) as Message[]) map.set(m.id, m);
    for (const m of (received.data ?? []) as Message[]) map.set(m.id, m);
  }

  // 2. Also query by account history to catch any messages stored by username or loose ID
  const { data: generalData } = await supabase()
    .from("messages")
    .select("id, from_id, to_id, body, place, created_at")
    .or(`from_id.eq.${me},to_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(1000);

  for (const m of (generalData ?? []) as Message[]) {
    const isFromMe = m.from_id === me;
    const isToMe = m.to_id === me;
    const isWithOther =
      m.from_id === otherId ||
      m.to_id === otherId ||
      m.from_id === cleanOther ||
      m.to_id === cleanOther ||
      m.from_id.toLowerCase() === otherUsername ||
      m.to_id.toLowerCase() === otherUsername;

    if ((isFromMe || isToMe) && isWithOther) {
      map.set(m.id, m);
    }
  }

  // Return all messages sorted chronologically (oldest first)
  return [...map.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/** Sends a chat message (and a push). `pushUrl` makes the push open somewhere else, like a game room. */
export async function sendMessage(me: string, to: string, body: string, place: string | null = null, pushUrl?: string): Promise<Message | null> {
  const cleanTo = to.trim().replace(/^@/, "");
  let targetId = cleanTo;

  if (!UUID_REGEX.test(cleanTo)) {
    const { data: prof } = await supabase().from("profiles").select("id").ilike("username", cleanTo).maybeSingle();
    if (prof?.id) {
      targetId = prof.id;
    }
  }

  const row = { id: crypto.randomUUID(), from_id: me, to_id: targetId, body, place };
  const { error } = await supabase().from("messages").insert(row);
  if (error) chatRefused(error);
  if (!error) {
    lifeEvent("chat", targetId);
    gainSkill("charisma", 6);
    setTimeout(() => askForPush({ icon: "💬", title: "Know when they reply", text: "Turn on notifications to see replies the moment they arrive, even when the app is closed." }), 1200);
    void (async () => {
      try {
        const { data: myProf } = await supabase().from("profiles").select("username").eq("id", me).maybeSingle();
        const senderName = myProf?.username ? `@${myProf.username}` : "A citizen";
        void sendPushNotification(
          targetId,
          {
            title: `Message from ${senderName}`,
            body: body.length > 80 ? body.slice(0, 77) + "…" : body,
            url: pushUrl ?? `/phone?tab=chats&chat=${me}`,
            tag: `chat-${me}`,
          },
        );
      } catch {}
    })();
  }
  return error ? null : { ...row, created_at: new Date().toISOString() };
}

/** Calls back for every message sent to me, until the returned function is called. */
export function onIncoming(me: string, cb: (m: Message) => void) {
  // On my own channel: the database sends me each message addressed to me.
  return onUserEvent<Message>(me, "messages", (e) => { if (e.eventType === "INSERT" && e.new && e.new.to_id === me) cb(e.new); });
}

/** Finds citizens by username or name (for starting a chat, adding a friend or inviting to a game). */
export async function findPeople(query: string, me: string): Promise<Contact[]> {
  const q = query.trim().replace(/^@/, "").replace(/[%_,()]/g, "");
  if (q.length < 2) return [];
  const { data } = await supabase().from("profiles").select("id, username, display_name, citizen")
    .or(`username.ilike.${q}%,display_name.ilike.%${q}%`).neq("id", me).limit(10);
  return (data ?? []).map((p) => ({ id: p.id, username: p.username, name: p.display_name, look: (p.citizen as { look?: AvatarLookProps } | null)?.look }));
}
