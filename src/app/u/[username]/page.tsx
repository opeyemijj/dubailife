"use client";

// A player's profile: who they are, their net worth, their homes (with the address in the city), cars, job, partner,
// followers and friends, where they rank, and what they've been doing. Message them, add them as a friend, follow
// them. Data: public.public_profile (nothing if either has blocked the other; where they are now is never shown).

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MessageCircle, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRequireCitizen } from "@/lib/citizenStore";
import { presetFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { BottomNav } from "@/components/layout/BottomNav";
import { addFriend } from "@/components/social/TopUsers";
import { ago, carName, describePost, follow, shortAed, unfollow, type FeedPost } from "@/lib/cityFeed";
import { getEntity } from "@/lib/city/geo";
import { isGenericHome, towerName } from "@/lib/city/partyHome";
import { gameAudio } from "@/utils/gameAudio";
import { carOf, paintName } from "@/lib/cars";
import { snapUrl, userPosts } from "@/lib/social";
import { PostCard } from "@/components/social/PostCard";
import { PASSPORT, PASSPORT_SIZE } from "@/lib/city/abuDhabi/passport";

interface Profile {
  id: string; username: string; name: string | null; look: AvatarLookProps | null; joined: string; online: boolean; lastSeen: string | null;
  isMe: boolean | null;
  worth: { total: number; cash: number; homes: number; cars: number };
  homes: { buildingId: string; unit: string; type: string; bedrooms: number | null; view: string | null; owned: boolean }[];
  starterHome: string | null;
  cars: { car: string; price: number | null; plate: string | null; color?: string | null }[];
  job: { title: string; venture: string | null } | null;
  partner: { username: string; status: string } | null;
  followers: number; following: number; friends: number;
  iFollow: boolean; friend: "friends" | "requested" | "incoming" | null; generous: boolean;
  wins: number; partiesHosted: number; topRank: number | null; richRank: number | null;
  recent: { id: number; kind: FeedPost["kind"]; data: Record<string, unknown>; n: number; at: string; other: { id: string; username: string } | null }[];
}

const address = (h: Profile["homes"][number]) => {
  const building = getEntity(h.buildingId)?.name ?? (isGenericHome(h.buildingId) ? towerName(h.buildingId) : h.buildingId);
  const unit = /^\d/.test(h.unit) ? `Apartment ${h.unit}` : h.unit.startsWith("PH") ? `Penthouse ${h.unit.slice(2)}` : h.unit;
  return `${unit}, ${building}`;
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  useRequireCitizen();
  const router = useRouter();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Stamps in the Abu Dhabi Passport: a full book is the Abu Dhabi Explorer title.
  const [stamps, setStamps] = useState(0);
  const load = useCallback(async () => {
    const { data } = await supabase().rpc("public_profile", { p_username: decodeURIComponent(username) });
    const prof = (data as Profile | null) ?? null;
    setP(prof);
    if (prof?.id) void supabase().rpc("passport_count", { p_user: prof.id }).then(({ data: n }) => setStamps(Number(n ?? 0)));
  }, [username]);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  if (p === undefined) return <Shell><p className="text-center text-white/60 py-16">Loading…</p></Shell>;
  if (p === null) return <Shell><p className="text-center text-white/60 py-16">We couldn&apos;t find @{decodeURIComponent(username)}.</p></Shell>;

  const message = () => { gameAudio.playClickSound(); router.push(`/phone?tab=chats&chat=${p.id}`); };
  const friend = async () => {
    setBusy(true); gameAudio.playClickSound();
    const st = await addFriend(p.id);
    setBusy(false);
    if (st) setP({ ...p, friend: st, friends: p.friends + (st === "friends" ? 1 : 0) });
  };
  const toggleFollow = async () => {
    setBusy(true); gameAudio.playClickSound();
    if (p.iFollow) await unfollow(p.id); else await follow([p.id]);
    setBusy(false);
    setP({ ...p, iFollow: !p.iFollow, followers: p.followers + (p.iFollow ? -1 : 1) });
  };
  const seen = p.online ? "Available to chat" : p.lastSeen ? `Last seen ${ago(p.lastSeen)} ago` : null;

  return (
    <Shell>
      <section className="rounded-[28px] bg-gradient-to-br from-fuchsia-600/30 via-slate-900 to-slate-900 border border-white/10 p-5 text-center space-y-3">
        <div className="relative mx-auto w-28 h-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))} alt="" className="w-28 h-28 rounded-full object-cover object-top bg-slate-700 ring-4 ring-white/10" />
          {p.online && <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />}
        </div>
        <div>
          <h1 className="text-2xl font-black leading-tight">{p.name || `@${p.username}`}</h1>
          <p className="text-sm text-white/60">@{p.username}{seen ? ` · ${seen}` : ""}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {p.topRank && <Link href="/top" className="rounded-full bg-amber-400/20 text-amber-200 px-2.5 py-1 text-xs font-black">🏆 #{p.topRank} top user</Link>}
          {p.richRank && p.richRank <= 10 && <Link href="/top?tab=rich" className="rounded-full bg-sky-400/20 text-sky-200 px-2.5 py-1 text-xs font-black">💎 #{p.richRank} richest</Link>}
          {stamps >= PASSPORT_SIZE && <span className="rounded-full bg-teal-400/20 text-teal-100 px-2.5 py-1 text-xs font-black">🏅 {PASSPORT.title}</span>}
          {p.generous && <Link href="/top?tab=givers" className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-black">💛 Generous</Link>}
          {p.partner && <Link href={`/u/${p.partner.username}`} className="rounded-full bg-rose-400/20 text-rose-200 px-2.5 py-1 text-xs font-black">💍 {p.partner.status === "married" ? "Married to" : p.partner.status === "engaged" ? "Engaged to" : "Dating"} @{p.partner.username}</Link>}
        </div>
        {!p.isMe && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button onClick={message} className="h-11 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" /> Message</button>
            {p.friend === "friends" ? <span className="h-11 rounded-2xl bg-white/10 font-black text-sm flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Friends</span>
              : p.friend === "requested" ? <span className="h-11 rounded-2xl bg-white/10 font-black text-sm flex items-center justify-center">Requested</span>
              : <button onClick={() => void friend()} disabled={busy} className="h-11 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"><UserPlus className="w-4 h-4" /> {p.friend === "incoming" ? "Accept" : "Add friend"}</button>}
            <button onClick={() => void toggleFollow()} disabled={busy} className={`h-11 rounded-2xl font-black text-sm disabled:opacity-60 ${p.iFollow ? "bg-white/10" : "bg-white text-slate-950"}`}>{p.iFollow ? "Following" : "Follow"}</button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-1 pt-1 text-center">
          {([["Friends", p.friends], ["Followers", p.followers], ["Following", p.following], ["Wins", p.wins]] as const).map(([k, v]) => (
            <div key={k}><p className="text-lg font-black tabular-nums">{v}</p><p className="text-[11px] text-white/50">{k}</p></div>
          ))}
        </div>
      </section>

      <PostsGrid userId={p.id} mine={!!p.isMe} />

      <Card title="💰 Net worth" right={`AED ${shortAed(p.worth.total)}`}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {([["Cash", p.worth.cash], ["Homes", p.worth.homes], ["Cars", p.worth.cars]] as const).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/5 p-2.5"><p className="font-black">AED {shortAed(v)}</p><p className="text-[11px] text-white/50">{k}</p></div>
          ))}
        </div>
      </Card>

      <Card title="🏡 Home">
        {p.homes.length ? p.homes.map((h, i) => (
          <Link key={i} href={`/property/${h.buildingId}/${encodeURIComponent(h.unit)}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <span className="flex-1 min-w-0">
              <span className="block font-black truncate">{address(h)}</span>
              <span className="block text-xs text-white/50">{h.owned ? "Owns" : "Rents"} · {h.type.replace(/_/g, " ")}{h.bedrooms ? ` · ${h.bedrooms} bed` : ""}{h.view ? ` · ${h.view} view` : ""}</span>
            </span>
            <span className="text-xs font-black text-fuchsia-300">Visit ›</span>
          </Link>
        )) : <p className="text-sm text-white/60">{p.starterHome ? `Lives in a starter home: ${p.starterHome}` : "No home yet."}</p>}
      </Card>

      <Card title="🚗 Cars" right={p.cars.length ? String(p.cars.length) : undefined}>
        {p.cars.length ? (
          <div className="grid grid-cols-2 gap-2">
            {p.cars.map((c, i) => (
              <div key={i} className="rounded-2xl bg-white/5 p-3">
                <p className="font-black text-sm leading-tight flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-white/30 shrink-0" style={{ background: c.color ?? carOf(c.car)?.color ?? "#94a3b8" }} title={paintName(c.color)} />
                  {carName(c.car)}
                </p>
                <p className="text-[11px] text-white/50">{c.plate ? `${c.plate} · ` : ""}{c.price ? `AED ${shortAed(c.price)}` : ""}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-white/60">No car yet.</p>}
      </Card>

      <Card title="💼 Work and life">
        <ul className="space-y-1.5 text-sm">
          <li>{p.job ? <>Works as <b>{p.job.title}</b>{p.job.venture ? <> at <b>{p.job.venture}</b></> : null}</> : "Looking for work"}</li>
          <li>Hosted <b>{p.partiesHosted}</b> part{p.partiesHosted === 1 ? "y" : "ies"} · won <b>{p.wins}</b> game{p.wins === 1 ? "" : "s"} against real players</li>
          <li>In Dubai since {new Date(p.joined).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</li>
        </ul>
      </Card>

      {p.recent.length > 0 && (
        <Card title="✨ Recently">
          <ul className="space-y-2">
            {p.recent.map((r) => {
              const v = describePost({ ...r, actor: { id: p.id, username: p.username, look: p.look }, likes: 0, liked: false, iFollow: p.iFollow });
              return <li key={r.id} className="text-sm text-white/85"><span className="mr-1">{v.icon}</span>{v.text} <span className="text-white/40 text-xs">· {ago(r.at)}</span></li>;
            })}
          </ul>
        </Card>
      )}
    </Shell>
  );
}

/** Their posts as a grid of snaps (text-only posts as a caption tile). Tap one to open it with its comments. */
function PostsGrid({ userId, mine }: { userId: string; mine: boolean }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [open, setOpen] = useState<FeedPost | null>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let live = true;
    void userPosts(userId).then((r) => { if (live) { setPosts(r.data ?? []); setMore((r.data ?? []).length >= 30); } });
    return () => { live = false; };
  }, [userId]);
  const loadMore = async () => {
    const last = posts?.at(-1);
    if (!last) return;
    const r = await userPosts(userId, last.id);
    setPosts((cur) => [...(cur ?? []), ...(r.data ?? [])]);
    setMore((r.data ?? []).length >= 30);
  };
  if (posts === null) return null;
  if (posts.length === 0 && !mine) return null;
  const patch = (id: number, x: Partial<FeedPost>) => {
    setPosts((cur) => cur?.map((q) => (q.id === id ? { ...q, ...x } : q)) ?? cur);
    setOpen((o) => (o && o.id === id ? { ...o, ...x } : o));
  };
  return (
    <Card title="📸 Posts" right={posts.length ? String(posts.length) + (more ? "+" : "") : undefined}>
      {posts.length === 0 ? (
        <p className="text-sm text-white/60">No posts yet. Tap 📸 at a party, on a yacht or at the races to share a moment, or post from the <Link href="/city?tab=posts" className="underline">City</Link>.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1 -mx-1">
          {posts.map((q) => {
            const d = q.data as { text?: string; image?: string };
            return (
              <button key={q.id} onClick={() => setOpen(q)} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 text-left" aria-label={d.text ?? "Post"}>
                {d.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={snapUrl(d.image)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  : <span className="block p-2 text-[11px] leading-snug text-white/80 line-clamp-5">{d.text}</span>}
                {(q.likes > 0 || (q.comments ?? 0) > 0) && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-slate-950/70 px-1.5 text-[10px] font-bold">{q.likes > 0 ? `♥ ${q.likes}` : ""}{(q.comments ?? 0) > 0 ? ` 💬 ${q.comments}` : ""}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {more && <button onClick={() => void loadMore()} className="w-full h-10 rounded-full bg-white/10 text-sm font-black">Show more</button>}
      {open && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Post">
          <div className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 space-y-3">
            <button onClick={() => setOpen(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
            <PostCard post={open} onChange={(x) => patch(open.id, x)} onDeleted={() => { setPosts((cur) => cur?.filter((q) => q.id !== open.id) ?? cur); setOpen(null); }} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-3">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/city"))} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
        {children}
      </div>
      <BottomNav />
    </main>
  );
}

function Card({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/[0.06] border border-white/10 p-4 space-y-2.5">
      <div className="flex items-center justify-between"><h2 className="font-black">{title}</h2>{right && <span className="font-black text-amber-300">{right}</span>}</div>
      {children}
    </section>
  );
}
