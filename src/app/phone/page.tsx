"use client";

// The citizen's phone: real conversations (kept 7 days), friends and people to find, and alerts
// for money, knocks and friend requests — all live from the database.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, Lightbulb, MessageSquare, Search, Send, UserPlus, Users } from "lucide-react";
import { Ideas } from "@/components/social/Ideas";
import { useRequireCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { SmallLoader } from "@/components/GameLoadingScreen";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useOnlineUsernames } from "@/lib/presence";
import {
  MESSAGE_DAYS, contacts, findPeople, listConversations, loadConversation, onIncoming, sendMessage,
  type Contact, type Conversation, type Message,
} from "@/lib/messages";

type Tab = "chats" | "ideas" | "contacts" | "alerts";

export default function PhonePage() {
  return (
    <Suspense fallback={<SmallLoader label="Opening your phone" />}>
      <Phone />
    </Suspense>
  );
}

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
};

function Face({ c, online, size = 48 }: { c: Pick<Contact, "look" | "name">; online?: boolean; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rosterThumb(presetFor(c.look ?? { gender: "woman" }))} alt="" className="w-full h-full rounded-full object-cover object-top bg-slate-800 ring-1 ring-white/10" />
      {online !== undefined && <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-zinc-950 ${online ? "bg-emerald-400" : "bg-zinc-600"}`} />}
    </span>
  );
}

function Phone() {
  const { citizen } = useRequireCitizen();
  const me = citizen?.id;
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "chats";
  const chatWith = params.get("chat");
  const online = useOnlineUsernames();
  const go = (next: { tab?: Tab; chat?: string | null }) => {
    const q = new URLSearchParams();
    q.set("tab", next.tab ?? tab);
    if (next.chat) q.set("chat", next.chat);
    router.replace(`/phone?${q.toString()}`, { scroll: false });
  };

  if (!me) return <main className="min-h-screen bg-zinc-950" />;
  if (chatWith) return <Thread me={me} other={chatWith} online={online} onBack={() => go({ chat: null })} />;

  return (
    <main className="relative min-h-screen bg-zinc-950 flex flex-col pb-28 text-white">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-sky-900/30 to-transparent pointer-events-none" />
      <header className="relative z-10 pt-14 px-5 pb-4 max-w-md mx-auto w-full">
        <h1 className="text-3xl font-black tracking-tight">Phone</h1>
        <p className="text-sm text-white/50">Messages are kept for {MESSAGE_DAYS} days.</p>
      </header>
      <div className="relative z-10 max-w-md mx-auto w-full px-4">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-4">
          {([["chats", "Chats", MessageSquare], ["ideas", "Ideas", Lightbulb], ["contacts", "People", Users], ["alerts", "Alerts", Bell]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => go({ tab: id })} className={`h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors ${tab === id ? "bg-white text-zinc-950" : "text-white/70 hover:bg-white/5"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        {tab === "chats" && <Chats me={me} online={online} open={(id) => go({ chat: id })} />}
        {tab === "ideas" && <Ideas me={me} />}
        {tab === "contacts" && <People me={me} online={online} open={(id) => go({ chat: id })} />}
        {tab === "alerts" && <Alerts me={me} />}
      </div>
      <BottomNav />
    </main>
  );
}

// ---------------------------------------------------------------- chats

function Chats({ me, online, open }: { me: string; online: ReadonlySet<string>; open: (id: string) => void }) {
  const [list, setList] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const refresh = useCallback(() => { listConversations(me).then(setList); }, [me]);
  useEffect(() => {
    refresh();
    return onIncoming(me, refresh);
  }, [me, refresh]);

  const shown = (list ?? []).filter((c) => !q || `${c.with.name} ${c.with.username} ${c.last.body}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 h-12 rounded-xl bg-white/5 border border-white/10 px-3">
        <Search className="w-4 h-4 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40" />
      </label>
      {list === null && <p className="text-sm text-white/50 text-center py-8">Loading…</p>}
      {list?.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <div className="text-4xl">💬</div>
          <p className="text-sm text-white/60">No conversations this week.</p>
          <p className="text-xs text-white/40">Tap someone in a venue to chat, or find people in the People tab.</p>
        </div>
      )}
      {shown.map((c) => (
        <button key={c.with.id} onClick={() => open(c.with.id)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition-colors">
          <Face c={c.with} online={online.has(c.with.username)} />
          <span className="flex-1 min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="font-bold truncate">{c.with.name}</span>
              <span className="text-[11px] text-sky-300 truncate">@{c.with.username}</span>
              <span className="ml-auto text-[11px] text-white/40 shrink-0">{when(c.last.created_at)}</span>
            </span>
            <span className="block text-sm text-white/60 truncate">{c.last.from_id === me ? "You: " : ""}{c.last.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Thread({ me, other, online, onBack }: { me: string; other: string; online: ReadonlySet<string>; onBack: () => void }) {
  const [who, setWho] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contacts([other]).then((m) => setWho(m.get(other) ?? null));
    loadConversation(me, other).then(setMessages);
    return onIncoming(me, (m) => { if (m.from_id === other) setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m])); });
  }, [me, other]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const m = await sendMessage(me, other, body);
    if (m) { setFailed(false); setMessages((list) => [...list, m]); }
    else { setFailed(true); setText(body); }
  };

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 px-3 py-3 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
        {who && <Face c={who} online={online.has(who.username)} size={40} />}
        <div className="min-w-0">
          <div className="font-bold truncate">{who?.name ?? "…"}</div>
          <div className="text-[11px] text-sky-300">{who ? `@${who.username}` : ""}{who && online.has(who.username) ? " · online" : ""}</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 max-w-md w-full mx-auto">
        {messages.length === 0 && <p className="text-center text-sm text-white/40 py-10">Say hello 👋</p>}
        {messages.map((m) => {
          const mine = m.from_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm break-words ${mine ? "bg-sky-500 rounded-br-md" : "bg-white/10 rounded-bl-md"}`}>
                {m.body}
                <div className="text-[10px] mt-0.5 text-white/60">{when(m.created_at)}{m.place ? ` · ${m.place}` : ""}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="sticky bottom-0 bg-zinc-950/95 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2 max-w-md w-full mx-auto">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={who ? `Message @${who.username}` : "Message"} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-sm outline-none" />
        <button className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center" aria-label="Send"><Send className="w-4 h-4" /></button>
      </form>
      {failed && <p className="text-center text-xs text-rose-300 pb-2">Couldn&apos;t send — check your connection and try again.</p>}
    </main>
  );
}

// ---------------------------------------------------------------- people

interface Friendship { user_id: string; friend_id: string; status: "pending" | "accepted" }

function People({ me, online, open }: { me: string; online: ReadonlySet<string>; open: (id: string) => void }) {
  const [rows, setRows] = useState<Friendship[] | null>(null);
  const [people, setPeople] = useState<Map<string, Contact>>(new Map());
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Contact[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase().from("friendships").select("user_id, friend_id, status").or(`user_id.eq.${me},friend_id.eq.${me}`);
    const list = (data ?? []) as Friendship[];
    setPeople(await contacts(list.map((f) => (f.user_id === me ? f.friend_id : f.user_id))));
    setRows(list);
  }, [me]);
  // Loads once on open; state is set when the queries resolve.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const t = setTimeout(() => { findPeople(q, me).then(setFound); }, 250);
    return () => clearTimeout(t);
  }, [q, me]);

  const other = (f: Friendship) => people.get(f.user_id === me ? f.friend_id : f.user_id);
  const friends = (rows ?? []).filter((f) => f.status === "accepted");
  const incoming = (rows ?? []).filter((f) => f.status === "pending" && f.friend_id === me);
  const outgoing = (rows ?? []).filter((f) => f.status === "pending" && f.user_id === me);
  const known = new Set((rows ?? []).map((f) => (f.user_id === me ? f.friend_id : f.user_id)));

  const add = async (c: Contact) => {
    await supabase().from("friendships").insert({ user_id: me, friend_id: c.id });
    void refresh();
  };
  const accept = async (f: Friendship) => {
    await supabase().from("friendships").update({ status: "accepted" }).eq("user_id", f.user_id).eq("friend_id", me);
    void refresh();
  };

  const row = (c: Contact | undefined, action: React.ReactNode, key: string) => c && (
    <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
      <Face c={c} online={online.has(c.username)} size={44} />
      <span className="flex-1 min-w-0">
        <span className="block font-bold truncate">{c.name}</span>
        <span className="block text-[11px] text-sky-300 truncate">@{c.username}{online.has(c.username) ? " · online" : ""}</span>
      </span>
      {action}
    </div>
  );
  const btn = (label: string, onClick: () => void, primary = false) => (
    <button onClick={onClick} className={`h-9 px-3 rounded-xl text-xs font-bold ${primary ? "bg-sky-500" : "bg-white/10"}`}>{label}</button>
  );

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 h-12 rounded-xl bg-white/5 border border-white/10 px-3">
        <UserPlus className="w-4 h-4 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find people by @username" className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40" />
      </label>
      {found.length > 0 && <section className="space-y-2">{found.map((c) => row(c, <div className="flex gap-1.5">{btn("Message", () => open(c.id))}{!known.has(c.id) && btn("Add", () => add(c), true)}</div>, `f-${c.id}`))}</section>}

      {incoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">Friend requests</h3>
          {incoming.map((f) => row(other(f), btn("Accept", () => accept(f), true), `i-${f.user_id}`))}
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">Friends</h3>
        {rows === null ? <p className="text-sm text-white/50 px-1">Loading…</p> : friends.length === 0 ? (
          <p className="text-sm text-white/50 px-1">No friends yet. Meet people in venues, or search above.</p>
        ) : friends
          .slice()
          .sort((a, b) => Number(online.has(other(b)?.username ?? "")) - Number(online.has(other(a)?.username ?? "")))
          .map((f) => row(other(f), btn("Message", () => open(other(f)!.id), true), `a-${f.user_id}-${f.friend_id}`))}
      </section>
      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">Waiting for them</h3>
          {outgoing.map((f) => row(other(f), <span className="text-[11px] text-white/40">Pending</span>, `o-${f.friend_id}`))}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- alerts

interface Alert { id: string; icon: string; title: string; detail?: string; at: string }

function Alerts({ me }: { me: string }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    const db = supabase();
    (async () => {
      const [transfers, knocks, requests] = await Promise.all([
        db.from("transfers").select("id, from_id, to_id, amount, place, created_at").order("created_at", { ascending: false }).limit(30),
        db.from("entry_requests").select("id, visitor_id, visitor_name, flat_id, status, created_at").order("created_at", { ascending: false }).limit(30),
        db.from("friendships").select("user_id, created_at").eq("friend_id", me).eq("status", "pending"),
      ]);
      const ids = [...(transfers.data ?? []).flatMap((t) => [t.from_id, t.to_id]), ...(requests.data ?? []).map((r) => r.user_id)];
      const who = await contacts(ids);
      const name = (id: string) => `@${who.get(id)?.username ?? "someone"}`;
      const flatName = (id: string) => `${id.split(":")[0].replace(/-/g, " ")} · ${id.split(":")[1]}`;
      const list: Alert[] = [
        ...(transfers.data ?? []).map((t) => t.to_id === me
          ? { id: `t${t.id}`, icon: "💸", title: `${name(t.from_id)} sent you ${Number(t.amount).toLocaleString()} D-Coins`, detail: t.place ?? undefined, at: t.created_at }
          : { id: `t${t.id}`, icon: "📤", title: `You sent ${name(t.to_id)} ${Number(t.amount).toLocaleString()} D-Coins`, detail: t.place ?? undefined, at: t.created_at }),
        ...(knocks.data ?? []).map((k) => k.visitor_id === me
          ? { id: `k${k.id}`, icon: k.status === "approved" ? "🚪" : k.status === "denied" ? "🙅" : "✊", title: `You knocked at ${flatName(k.flat_id)}`, detail: k.status === "pending" ? "Waiting for an answer" : k.status === "approved" ? "They let you in" : "Not this time", at: k.created_at }
          : { id: `k${k.id}`, icon: "✊", title: `${k.visitor_name} knocked at your home`, detail: `${flatName(k.flat_id)} · ${k.status}`, at: k.created_at }),
        ...(requests.data ?? []).map((r) => ({ id: `f${r.user_id}`, icon: "🤝", title: `${name(r.user_id)} wants to be friends`, detail: "Accept in the People tab", at: r.created_at })),
      ];
      setAlerts(list.sort((a, b) => b.at.localeCompare(a.at)));
    })();
  }, [me]);

  const grouped = useMemo(() => alerts ?? [], [alerts]);
  if (alerts === null) return <p className="text-sm text-white/50 text-center py-8">Loading…</p>;
  if (grouped.length === 0) return (
    <div className="text-center py-10 space-y-2">
      <div className="text-4xl">🔔</div>
      <p className="text-sm text-white/60">Nothing yet.</p>
      <p className="text-xs text-white/40">Money, knocks on your door and friend requests show up here.</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {grouped.map((a) => (
        <div key={a.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-2xl leading-none mt-0.5">{a.icon}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold">{a.title}</span>
            {a.detail && <span className="block text-xs text-white/50 capitalize-first">{a.detail}</span>}
          </span>
          <span className="text-[11px] text-white/40 shrink-0">{when(a.at)}</span>
        </div>
      ))}
    </div>
  );
}
