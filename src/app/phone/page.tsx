"use client";

// The citizen's phone: real conversations (kept 7 days), friends and people to find, and alerts
// for money, knocks and friend requests — all live from the database.

import { askForPush } from "@/lib/push/engage";
import { useCitizen } from "@/lib/citizenStore";
import { getPlace } from "@/lib/city/places";
import { addGuest, flatTitle, myFlats, type FlatView } from "@/lib/city/flats";
import { sendMoney } from "@/lib/room";
import { markRead, useUnreadCounts } from "@/lib/unread";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, BellRing, Lightbulb, MessageSquare, Search, Send, UserPlus, Users } from "lucide-react";
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
import {
  getNotificationPermission,
  isPushSupported,
  sendPushNotification,
  subscribeToPush,
  testPushNotification,
  unsubscribeFromPush,
} from "@/lib/push/client";

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
  const unread = useUnreadCounts(me);
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
            <span className="flex items-center gap-2">
              <span className={`flex-1 min-w-0 text-sm truncate ${unread[c.with.id] ? "text-white font-bold" : "text-white/60"}`}>{c.last.from_id === me ? "You: " : ""}{c.last.body}</span>
              {unread[c.with.id] ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{unread[c.with.id]}</span> : null}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** "📍 … · /explore?open=dubai-mall" → the invite text and where it goes. */
function parseInvite(body: string): { text: string; href: string } | null {
  const m = body.match(/^(.*?)\s*·\s*(\/(?:explore|place|property)\S*)$/);
  return m ? { text: m[1], href: m[2] } : null;
}

function Thread({ me, other, online, onBack }: { me: string; other: string; online: ReadonlySet<string>; onBack: () => void }) {
  const { citizen } = useCitizen();
  const router = useRouter();
  const [who, setWho] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [paying, setPaying] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contacts([other]).then((m) => setWho(m.get(other) ?? null));
    loadConversation(me, other).then(setMessages);
    void markRead(other);
    return onIncoming(me, (m) => {
      if (m.from_id !== other) return;
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      void markRead(other);
    });
  }, [me, other]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const post = async (body: string) => {
    const m = await sendMessage(me, other, body);
    if (m) { setFailed(false); setMessages((list) => [...list, m]); }
    else setFailed(true);
    return !!m;
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    if (!(await post(body))) setText(body);
  };
  // Where I am, as an invite they can tap.
  const here = citizen?.location?.placeId ? getPlace(citizen.location.placeId) : null;
  const invite = () => here && post(`📍 Come and join me at ${here.name} · /explore?open=${here.id}`);

  // The home I live in (rented, or owned and not let out): inviting them adds them to its guest list,
  // so they can walk straight in, and sends a link that takes them to the door.
  const [home, setHome] = useState<FlatView | null>(null);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  useEffect(() => {
    myFlats(me).then((fs) => setHome(fs.find((f) => f.tenant_id === me) ?? fs.find((f) => f.owner_id === me && !f.tenant_id && !f.tenant_npc) ?? null));
  }, [me]);
  const inviteHome = async () => {
    if (!home || !who) return;
    const res = await addGuest(home.id, who.username, false);
    if (!res.ok) { setInviteNote(res.error); return; }
    const where = [flatTitle({ ...home, residentName: null }), getPlace(home.building_id)?.name].filter(Boolean).join(", ");
    if (await post(`🏠 Come over to my place: ${where} · /property/${home.building_id}/${encodeURIComponent(home.unit)}`)) {
      setInviteNote(`@${who.username} is on your guest list and can come straight in.`);
    }
  };

  return (
    // Fixed to the screen: the header stays at the top, the input at the very bottom.
    <main className="fixed inset-0 h-[100dvh] bg-zinc-950 text-white flex flex-col">
      <header className="shrink-0 bg-zinc-950/95 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
        {who && <Face c={who} online={online.has(who.username)} size={40} />}
        <div className="min-w-0">
          <div className="font-bold truncate">{who?.name ?? "…"}</div>
          <div className="text-[11px] text-sky-300">{who ? `@${who.username}` : ""}{who && online.has(who.username) ? " · online" : ""}</div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-1.5 max-w-md w-full mx-auto">
        {messages.length === 0 && <p className="text-center text-sm text-white/40 py-10">Say hello 👋</p>}
        {messages.map((m) => {
          const mine = m.from_id === me;
          const inv = parseInvite(m.body);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm break-words ${mine ? "bg-sky-500 rounded-br-md" : "bg-white/10 rounded-bl-md"}`}>
                {inv ? inv.text : m.body}
                {inv && !mine && <button onClick={() => router.push(inv.href)} className="mt-1.5 block w-full h-8 rounded-lg bg-white text-sky-600 text-xs font-black">{inv.href.startsWith("/property") ? "Go to their home" : "Go there"}</button>}
                <div className="text-[10px] mt-0.5 text-white/60">{when(m.created_at)}{m.place ? ` · ${m.place}` : ""}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="shrink-0 border-t border-white/10 bg-zinc-950 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto px-3 pt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setPaying(true)} className="shrink-0 h-8 px-3 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">💸 Send money</button>
          <button onClick={() => post("👋")} className="shrink-0 h-8 px-3 rounded-full bg-white/10 text-xs font-bold">👋 Wave</button>
          {home && <button onClick={inviteHome} className="shrink-0 h-8 px-3 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">🏠 Invite to my home</button>}
          {here && <button onClick={invite} className="shrink-0 h-8 px-3 rounded-full bg-sky-500/15 text-sky-300 text-xs font-bold">📍 Invite to {here.name}</button>}
          <button onClick={() => router.push("/explore")} className="shrink-0 h-8 px-3 rounded-full bg-white/10 text-xs font-bold">🗺️ Find a place to meet</button>
        </div>
        <form onSubmit={send} className="max-w-md mx-auto px-3 pt-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={who ? `Message @${who.username}` : "Message"} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-base outline-none" />
          <button className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center" aria-label="Send"><Send className="w-4 h-4" /></button>
        </form>
        {inviteNote && <p className="text-center text-xs text-amber-200 pt-1">{inviteNote}</p>}
        {failed && <p className="text-center text-xs text-rose-300 pt-1">Couldn&apos;t send — check your connection and try again.</p>}
      </div>
      {paying && who && <PayFriend to={who} balance={citizen?.balance ?? 0} onDone={(amount) => { setPaying(false); if (amount) void post(`💸 Sent you AED ${amount.toLocaleString()}`); }} />}
    </main>
  );
}

/** Send money to someone from a conversation. */
function PayFriend({ to, balance, onDone }: { to: Contact; balance: number; onDone: (amount: number | null) => void }) {
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setBusy(true);
    const e = await sendMoney({ userId: to.id, username: to.username, name: to.name, x: 0, z: 0, animation: "idle" }, amount, "Phone");
    setBusy(false);
    if (e) setError(e);
    else onDone(amount);
  };
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-end sm:items-center justify-center p-2" onClick={() => onDone(null)}>
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg">Send money to @{to.username}</h3>
        <div className="grid grid-cols-4 gap-2">
          {[50, 100, 500, 1000].map((a) => <button key={a} onClick={() => setAmount(a)} className={`h-10 rounded-xl text-sm font-black ${amount === a ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>{a}</button>)}
        </div>
        <label className="flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-3">
          <span className="text-xs font-black text-slate-400">AED</span>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="flex-1 text-base font-black outline-none bg-transparent" />
        </label>
        <p className="text-xs text-slate-500">You have AED {balance.toLocaleString()} (virtual)</p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={busy || amount < 1 || amount > balance} onClick={pay} className="w-full h-12 rounded-xl bg-emerald-500 disabled:opacity-50 text-white font-black">{busy ? "Sending…" : `Send AED ${amount.toLocaleString()}`}</button>
      </div>
    </div>
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

  const { citizen } = useRequireCitizen();
  const add = async (c: Contact) => {
    const { error } = await supabase().from("friendships").insert({ user_id: me, friend_id: c.id });
    if (!error) {
      setTimeout(() => askForPush({ icon: "🤝", title: "Friend request sent", text: `Turn on notifications to know the moment @${c.username} accepts.` }), 1500);
      void sendPushNotification(
        c.id,
        {
          title: "New Friend Request 🤝",
          body: `@${citizen?.username || "A citizen"} wants to be friends with you!`,
          url: "/phone?tab=alerts",
          tag: `friend-req-${me}`,
        },
        me
      );
    } else if (/\bblocked\b/.test(error.message)) {
      window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "You can't add them." }));
    }
    void refresh();
  };
  const accept = async (f: Friendship) => {
    const { error } = await supabase().from("friendships").update({ status: "accepted" }).eq("user_id", f.user_id).eq("friend_id", me);
    if (!error) {
      void sendPushNotification(
        f.user_id,
        {
          title: "Friend Request Accepted 🤝",
          body: `@${citizen?.username || "Your friend"} accepted your friend request!`,
          url: "/phone?tab=contacts",
          tag: `friend-acc-${me}`,
        },
        me
      );
    }
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

function PushSettingsCard({ me }: { me: string }) {
  const [permission, setPermission] = useState<string>("default");
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
  }, []);

  if (!supported) {
    return (
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3 space-y-1 text-xs">
        <div className="font-bold text-amber-300">📱 Home Screen Required on iPhone</div>
        <p className="text-white/70 text-[11px]">
          To receive push notifications on iOS, tap the browser <b>Share</b> button and select <b>Add to Home Screen</b>. Then open the app from your Home Screen!
        </p>
      </div>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    setTestMessage(null);
    if (permission === "granted") {
      await unsubscribeFromPush(me);
      setPermission("default");
    } else {
      const res = await subscribeToPush(me);
      if (res.ok) {
        setPermission("granted");
      } else {
        alert(res.error || "Permission could not be enabled.");
      }
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTestSent(true);
    setTestMessage("Sending test notification to your device…");
    const res = await testPushNotification(me);
    if (res?.ok && res?.result?.sent > 0) {
      setTestMessage("Delivered! Check your lock screen / notification banner.");
    } else {
      const err = res?.error || (res?.result?.failed ? "Delivery failed by push gateway." : "No registered device found. Try turning notifications off then on again.");
      setTestMessage(err);
    }
    setTimeout(() => setTestSent(false), 5000);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/20 mb-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className={`w-4 h-4 ${permission === "granted" ? "text-emerald-400" : "text-amber-400"}`} />
          <span className="text-xs font-black">
            Push Notifications: {permission === "granted" ? "Enabled 🔔" : "Disabled 🔕"}
          </span>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition ${
            permission === "granted"
              ? "bg-white/10 hover:bg-white/20 text-white/80"
              : "bg-sky-500 hover:bg-sky-400 text-white"
          }`}
        >
          {loading ? "…" : permission === "granted" ? "Turn Off" : "Turn On"}
        </button>
      </div>
      <p className="text-[11px] text-white/60">
        Receive lock screen & banner pop-ups for friend requests, direct messages, and door knocks on your phone.
      </p>
      {permission === "granted" && (
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <button
            onClick={handleTest}
            disabled={testSent}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 active:scale-95 transition"
          >
            {testSent ? "Testing…" : "Send test notification"}
          </button>
          {testMessage && (
            <p className="text-[10px] text-sky-200/80 bg-sky-950/40 px-2 py-1 rounded-lg">
              {testMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
          ? { id: `t${t.id}`, icon: "💸", title: `${name(t.from_id)} sent you AED ${Number(t.amount).toLocaleString()}`, detail: t.place ?? undefined, at: t.created_at }
          : { id: `t${t.id}`, icon: "📤", title: `You sent ${name(t.to_id)} AED ${Number(t.amount).toLocaleString()}`, detail: t.place ?? undefined, at: t.created_at }),
        ...(knocks.data ?? []).map((k) => k.visitor_id === me
          ? { id: `k${k.id}`, icon: k.status === "approved" ? "🚪" : k.status === "denied" ? "🙅" : "✊", title: `You knocked at ${flatName(k.flat_id)}`, detail: k.status === "pending" ? "Waiting for an answer" : k.status === "approved" ? "They let you in" : "Not this time", at: k.created_at }
          : { id: `k${k.id}`, icon: "✊", title: `${k.visitor_name} knocked at your home`, detail: `${flatName(k.flat_id)} · ${k.status}`, at: k.created_at }),
        ...(requests.data ?? []).map((r) => ({ id: `f${r.user_id}`, icon: "🤝", title: `${name(r.user_id)} wants to be friends`, detail: "Accept in the People tab", at: r.created_at })),
      ];
      setAlerts(list.sort((a, b) => b.at.localeCompare(a.at)));
    })();
  }, [me]);

  const grouped = useMemo(() => alerts ?? [], [alerts]);
  return (
    <div className="space-y-2">
      <PushSettingsCard me={me} />
      {alerts === null ? (
        <p className="text-sm text-white/50 text-center py-8">Loading…</p>
      ) : grouped.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <div className="text-4xl">🔔</div>
          <p className="text-sm text-white/60">Nothing yet.</p>
          <p className="text-xs text-white/40">Money, knocks on your door and friend requests show up here.</p>
        </div>
      ) : (
        grouped.map((a) => (
          <div key={a.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl leading-none mt-0.5">{a.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold">{a.title}</span>
              {a.detail && <span className="block text-xs text-white/50 capitalize-first">{a.detail}</span>}
            </span>
            <span className="text-[11px] text-white/40 shrink-0">{when(a.at)}</span>
          </div>
        ))
      )}
    </div>
  );
}
