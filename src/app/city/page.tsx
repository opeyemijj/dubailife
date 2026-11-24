"use client";
import { ProfileLink } from "@/components/social/ProfileLink";

// The City Feed (requirements R4): what players are doing right now, each post with a button that takes you there.
// Live now at the top (parties and Spaces happening this minute), then Following (people you follow and your friends)
// or Everyone. Posts come from the database (lib/cityFeed.ts); players choose what of theirs is shared.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Heart, MessageCircle, Settings2, Trophy } from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { PostComposer } from "@/components/social/PostComposer";
import { CommentsSheet } from "@/components/social/CommentsSheet";
import { getPost } from "@/lib/social";
import { useRequireCitizen } from "@/lib/citizenStore";
import { BottomNav } from "@/components/layout/BottomNav";
import { presetFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { joinSpace, useSpacesStore } from "@/lib/spaces";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";
import {
  FEED_CATEGORIES, ago, describePost, follow, likePost, loadFeed, loadLiveParties, myFeedHidden, setFeedHidden,
  type FeedPost, type FeedScope, type LiveParty,
} from "@/lib/cityFeed";

export default function CityPage() {
  return <Suspense><City /></Suspense>;
}

const SEEN = "city-feed-seen";

function Face({ look, size = 44 }: { look?: AvatarLookProps | null; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={rosterThumb(presetFor(look ?? { gender: "woman" }))} alt="" width={size} height={size}
      className="rounded-full object-cover object-top bg-slate-700 shrink-0" style={{ width: size, height: size }} />
  );
}

function City() {
  const { citizen } = useRequireCitizen();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params?.get("tab");
  const [scope, setScope] = useState<FeedScope>(tab === "following" ? "following" : tab === "posts" ? "posts" : "all");
  const [compose, setCompose] = useState(false);
  const [commentsOn, setCommentsOn] = useState<FeedPost | null>(null);
  // A post opened from a link or a notice: shown on top of the feed with its comments.
  const postId = Number(params?.get("post")) || null;
  const [opened, setOpened] = useState<FeedPost | null>(null);
  useEffect(() => {
    if (!postId || !citizen?.id) return;
    let live = true;
    void getPost(postId).then((r) => { if (live) setOpened(r.data ?? null); });
    return () => { live = false; };
  }, [postId, citizen?.id]);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [more, setMore] = useState(true);
  const [parties, setParties] = useState<LiveParty[]>([]);
  const [settings, setSettings] = useState(false);
  const { rooms } = useSpacesStore();
  const spaces = rooms.filter((r) => !r.scheduledFor && !r.isPrivate);

  const load = useCallback(async (s: FeedScope) => {
    const [p, live] = await Promise.all([loadFeed(s), loadLiveParties()]);
    setPosts(p);
    setMore(p.length >= 30);
    setParties(live);
    try { if (p[0]) localStorage.setItem(SEEN, String(p[0].id)); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent("dubai:city-seen"));
  }, []);

  useEffect(() => {
    if (!citizen?.id) return;
    const t = setTimeout(() => void load(scope), 0);
    // Fresh posts every minute while it's open.
    const every = setInterval(() => void load(scope), 60_000);
    return () => { clearTimeout(t); clearInterval(every); };
  }, [citizen?.id, scope, load]);

  const loadMore = async () => {
    const last = posts?.at(-1);
    if (!last) return;
    const next = await loadFeed(scope, last.id);
    setPosts((cur) => [...(cur ?? []), ...next]);
    setMore(next.length >= 30);
  };

  const update = (id: number, patch: Partial<FeedPost>) => setPosts((cur) => cur?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? cur);
  const act = async (p: FeedPost) => {
    const v = describePost(p);
    gameAudio.playClickSound();
    if (v.action?.href) { router.push(v.action.href); return; }
    if (v.action?.follow) {
      await follow([p.actor.id]);
      setPosts((cur) => cur?.map((x) => (x.actor.id === p.actor.id ? { ...x, iFollow: true } : x)) ?? cur);
      return;
    }
    if (v.action?.like && !p.liked) {
      const liked = await likePost(p.id);
      if (liked !== null) update(p.id, { liked, likes: p.likes + (liked ? 1 : -1) });
    }
  };
  const toggleLike = async (p: FeedPost) => {
    const liked = await likePost(p.id);
    if (liked !== null) update(p.id, { liked, likes: Math.max(0, p.likes + (liked ? 1 : -1)) });
  };

  return (
    <main className="relative min-h-[100dvh] bg-slate-950 text-white pb-32">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-fuchsia-500/20 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] space-y-4">
        <header className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl font-black flex-1">City</h1>
          <Link href="/top" className="h-10 px-3 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Top users</Link>
          <button onClick={() => setSettings(true)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="What I share"><Settings2 className="w-4 h-4" /></button>
        </header>

        {(parties.length > 0 || spaces.length > 0) && (
          <section className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-rose-300 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live now</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {parties.map((p) => (
                <button key={`p${p.inviteId}`} onClick={() => p.route && router.push(p.route)} className="shrink-0 w-44 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-rose-600 p-3 text-left">
                  <div className="flex items-center gap-2"><Face look={p.look} size={32} /><span className="text-xs font-black truncate"><ProfileLink username={p.host} /></span></div>
                  <p className="mt-2 text-sm font-black leading-tight line-clamp-2">🎉 {p.title || "House party"}</p>
                  <p className="mt-1 text-[11px] text-white/80">{p.arrived} there · Join ›</p>
                </button>
              ))}
              {spaces.map((r) => (
                <button key={`s${r.id}`} onClick={() => { if (joinSpace(r.id).ok) openPhone("spaces"); }} className="shrink-0 w-44 rounded-2xl bg-gradient-to-br from-purple-700 to-slate-900 p-3 text-left">
                  <p className="text-xs font-black truncate">🎙️ <ProfileLink username={r.hostUsername} /></p>
                  <p className="mt-2 text-sm font-black leading-tight line-clamp-2">{r.title}</p>
                  <p className="mt-1 text-[11px] text-white/80">{r.participants.length} listening · Listen ›</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <button onClick={() => setCompose(true)} className="w-full flex items-center gap-3 rounded-3xl bg-white/[0.06] border border-white/10 p-3 text-left">
          <Face look={citizen?.look} size={40} />
          <span className="flex-1 text-sm text-white/50">Share a moment from the city…</span>
          <span className="h-9 px-3 rounded-full bg-fuchsia-600 text-sm font-black flex items-center gap-1.5"><Camera className="w-4 h-4" /> Post</span>
        </button>

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1" role="tablist">
          {([["all", "Everyone"], ["following", "Following"], ["posts", "Posts"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={scope === id} onClick={() => { setPosts(null); setScope(id); }}
              className={`h-10 rounded-xl text-sm font-black ${scope === id ? "bg-fuchsia-500" : "text-white/60"}`}>{label}</button>
          ))}
        </div>

        {posts === null ? (
          <p className="text-center text-white/60 py-10">Loading the city…</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-4xl">🌆</p>
            <p className="font-black">{scope === "following" ? "Nothing from people you follow yet" : scope === "posts" ? "No posts yet" : "Quiet right now"}</p>
            <p className="text-sm text-white/60">{scope === "following" ? "Follow this week's top users to fill your feed." : scope === "posts" ? "Snap a moment at a party, on the yacht or at the races and post it." : "Host a party and it shows up here."}</p>
            <Link href="/top" className="inline-block h-11 leading-[2.75rem] px-5 rounded-full bg-amber-400 text-slate-950 font-black">See top users</Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {posts.map((p) => {
              if (p.kind === "post") return (
                <li key={p.id}><PostCard post={p} onChange={(patch) => update(p.id, patch)} onDeleted={() => setPosts((cur) => cur?.filter((x) => x.id !== p.id) ?? cur)} /></li>
              );
              const v = describePost(p);
              return (
                <li key={p.id} className="rounded-3xl bg-white/[0.06] border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-3">
                    {/* Tap a player: their profile, with Message first. */}
                    <Link href={`/u/${p.actor.username}`} aria-label={`@${p.actor.username}'s profile`}><Face look={p.actor.look} /></Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${p.actor.username}`} className="text-sm font-black text-fuchsia-300">@{p.actor.username}</Link>
                      <p className="text-[15px] leading-snug"><span className="mr-1">{v.icon}</span>{v.text}</p>
                      <p className="text-xs text-white/45 mt-0.5">{ago(p.at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.action && !(v.action.follow && p.iFollow) && !(v.action.like && p.liked) && p.actor.id !== citizen?.id && (
                      <button onClick={() => void act(p)} className="h-9 px-4 rounded-full bg-white text-slate-950 text-sm font-black">{v.action.label}</button>
                    )}
                    <button onClick={() => void toggleLike(p)} aria-pressed={p.liked} aria-label={p.liked ? "Unlike" : "Like"}
                      className={`ml-auto h-9 px-3 rounded-full flex items-center gap-1.5 text-sm font-bold ${p.liked ? "bg-rose-500/20 text-rose-300" : "bg-white/5 text-white/60"}`}>
                      <Heart className={`w-4 h-4 ${p.liked ? "fill-current" : ""}`} />{p.likes > 0 ? p.likes : ""}
                    </button>
                    <button onClick={() => setCommentsOn(p)} aria-label="Comments" className="h-9 px-3 rounded-full flex items-center gap-1.5 text-sm font-bold bg-white/5 text-white/60">
                      <MessageCircle className="w-4 h-4" />{p.comments ? p.comments : ""}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {posts && posts.length > 0 && more && (
          <button onClick={() => void loadMore()} className="w-full h-11 rounded-full bg-white/10 font-black text-sm">Show more</button>
        )}
      </div>
      {settings && <ShareSettings onClose={() => setSettings(false)} />}
      {compose && <PostComposer snap={null} onClose={() => setCompose(false)} onPosted={() => { setCompose(false); setPosts(null); if (scope === "posts") void load("posts"); else setScope("posts"); }} />}
      {commentsOn && <CommentsSheet post={commentsOn} onClose={() => setCommentsOn(null)} onCount={(n) => update(commentsOn.id, { comments: n })} />}
      {opened && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Post">
          <div className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 space-y-3">
            <button onClick={() => { setOpened(null); router.replace("/city"); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
            {opened.kind === "post"
              ? <PostCard post={opened} openComments onChange={(patch) => setOpened({ ...opened, ...patch })} onDeleted={() => { setOpened(null); router.replace("/city"); }} />
              : <div className="rounded-3xl bg-white/[0.06] border border-white/10 p-4"><p className="text-sm font-black text-fuchsia-300"><ProfileLink username={opened.actor.username} /></p><p className="text-[15px] mt-1">{describePost(opened).icon} {describePost(opened).text}</p><button onClick={() => setCommentsOn(opened)} className="mt-3 h-9 px-4 rounded-full bg-white/10 text-sm font-bold">💬 Comments</button></div>}
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}

/** What of mine shows in the feed. */
function ShareSettings({ onClose }: { onClose: () => void }) {
  const [hide, setHide] = useState<string[] | null>(null);
  useEffect(() => { void myFeedHidden().then(setHide); }, []);
  const toggle = async (id: string) => {
    if (!hide) return;
    const next = hide.includes(id) ? hide.filter((x) => x !== id) : [...hide, id];
    setHide(next);
    await setFeedHidden(next);
  };
  return (
    <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="What I share">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
        <h2 className="text-xl font-black">What I share in the City</h2>
        <p className="text-sm text-slate-500">Turn off anything you&apos;d rather keep to yourself. Where you are is never shared.</p>
        {hide === null ? <p className="text-sm text-slate-400">Loading…</p> : FEED_CATEGORIES.map((c) => {
          const on = !hide.includes(c.id);
          return (
            <button key={c.id} onClick={() => void toggle(c.id)} aria-pressed={on} className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left">
              <span className="flex-1 text-sm font-bold">{c.label}</span>
              <span className={`w-12 h-7 rounded-full p-1 transition-colors ${on ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} /></span>
            </button>
          );
        })}
        <button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Done</button>
      </div>
    </div>
  );
}
