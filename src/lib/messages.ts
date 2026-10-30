"use client";

// Direct messages between citizens, saved for 7 days (public.messages). The phone lists the
// conversations; rooms in venues and homes use the same table for their chat.

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

/** Public profile details for some citizens, by id. */
export async function contacts(ids: string[]): Promise<Map<string, Contact>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await supabase().from("profiles").select("id, username, display_name, citizen").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, { id: p.id, username: p.username, name: p.display_name, look: (p.citizen as { look?: AvatarLookProps } | null)?.look }]));
}

/** Everyone I've talked to this week, newest conversation first. */
export async function listConversations(me: string): Promise<Conversation[]> {
  const { data } = await supabase()
    .from("messages")
    .select("id, from_id, to_id, body, place, created_at")
    .or(`from_id.eq.${me},to_id.eq.${me}`)
    .gte("created_at", since())
    .order("created_at", { ascending: false })
    .limit(500);
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

/** One conversation this week, oldest first. */
export async function loadConversation(me: string, other: string): Promise<Message[]> {
  const { data } = await supabase()
    .from("messages")
    .select("id, from_id, to_id, body, place, created_at")
    .or(`and(from_id.eq.${me},to_id.eq.${other}),and(from_id.eq.${other},to_id.eq.${me})`)
    .gte("created_at", since())
    .order("created_at", { ascending: true })
    .limit(300);
  return (data ?? []) as Message[];
}

/** Sends a chat message (and a push). `pushUrl` makes the push open somewhere else, like a game room. */
export async function sendMessage(me: string, to: string, body: string, place: string | null = null, pushUrl?: string): Promise<Message | null> {
  const row = { id: crypto.randomUUID(), from_id: me, to_id: to, body, place };
  const { error } = await supabase().from("messages").insert(row);
  if (error) chatRefused(error);
  if (!error) {
    lifeEvent("chat", to);
    gainSkill("charisma", 6);
    setTimeout(() => askForPush({ icon: "💬", title: "Know when they reply", text: "Turn on notifications to see replies the moment they arrive, even when the app is closed." }), 1200);
    void (async () => {
      try {
        const { data: myProf } = await supabase().from("profiles").select("username").eq("id", me).maybeSingle();
        const senderName = myProf?.username ? `@${myProf.username}` : "A citizen";
        void sendPushNotification(
          to,
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
  const channel = supabase()
    .channel(`inbox-${me}-${Math.random().toString(36).slice(2, 7)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `to_id=eq.${me}` }, (p) => cb(p.new as Message))
    .subscribe();
  return () => { supabase().removeChannel(channel); };
}

/** Finds citizens by username or name (for starting a chat, adding a friend or inviting to a game). */
export async function findPeople(query: string, me: string): Promise<Contact[]> {
  const q = query.trim().replace(/^@/, "").replace(/[%_,()]/g, "");
  if (q.length < 2) return [];
  const { data } = await supabase().from("profiles").select("id, username, display_name, citizen")
    .or(`username.ilike.${q}%,display_name.ilike.%${q}%`).neq("id", me).limit(10);
  return (data ?? []).map((p) => ({ id: p.id, username: p.username, name: p.display_name, look: (p.citizen as { look?: AvatarLookProps } | null)?.look }));
}
