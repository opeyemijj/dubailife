"use client";

// A player's own post in the City feed or on their profile: who and where, the snap, the caption (@mentions open
// profiles), and like, comment and share. My own posts can be deleted; anyone else's can be reported.

import { useState } from "react";
import { Heart, MapPin, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { ProfileLink } from "@/components/social/ProfileLink";
import { RichText } from "@/components/social/RichText";
import { CommentsSheet } from "@/components/social/CommentsSheet";
import { ago, likePost, type FeedPost } from "@/lib/cityFeed";
import { deletePost, reportContent, snapUrl } from "@/lib/social";
import { gameAudio } from "@/utils/gameAudio";

export function PostCard({ post, onChange, onDeleted, openComments = false }: {
  post: FeedPost; onChange: (patch: Partial<FeedPost>) => void; onDeleted?: () => void;
  /** Open its comments straight away (arriving from a notice). */
  openComments?: boolean;
}) {
  const [comments, setComments] = useState(openComments);
  const [menu, setMenu] = useState(false);
  const d = post.data as { text?: string; image?: string; place?: string; placeName?: string };
  const like = async () => {
    gameAudio.playClickSound();
    const liked = await likePost(post.id);
    if (liked !== null) onChange({ liked, likes: Math.max(0, post.likes + (liked ? 1 : -1)) });
  };
  const share = async () => {
    const url = `${window.location.origin}/city?post=${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Dubai Life", text: d.text?.slice(0, 80) ?? `@${post.actor.username} on Dubai Life`, url });
      else { await navigator.clipboard.writeText(url); window.alert("Link copied."); }
    } catch { /* closed */ }
  };
  const remove = async () => {
    setMenu(false);
    if (!window.confirm("Delete this post?")) return;
    await deletePost(post.id);
    onDeleted?.();
  };
  const report = async () => {
    setMenu(false);
    if (!window.confirm(`Report @${post.actor.username}'s post to the moderators?`)) return;
    await reportContent(post.actor.id, "post", post.id, "harassment", d.text);
    window.alert("Thanks. The moderators will look at it.");
  };
  return (
    <article className="rounded-3xl bg-white/[0.06] border border-white/10 overflow-hidden">
      <header className="flex items-center gap-3 p-3">
        <ProfileLink username={post.actor.username} className="shrink-0 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rosterThumb(presetFor(post.actor.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-700 block" />
        </ProfileLink>
        <div className="flex-1 min-w-0">
          <ProfileLink username={post.actor.username} className="block text-sm font-black text-fuchsia-300 truncate" />
          <p className="text-[11px] text-white/50 truncate flex items-center gap-1">{d.placeName && <><MapPin className="w-3 h-3" />{d.placeName} · </>}{ago(post.at)}</p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center" aria-label="More"><MoreHorizontal className="w-4 h-4" /></button>
          {menu && (
            <div className="absolute right-0 top-10 z-10 w-40 rounded-2xl bg-white text-slate-900 shadow-xl overflow-hidden">
              {post.mine ? <button onClick={() => void remove()} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600">Delete post</button>
                : <button onClick={() => void report()} className="w-full text-left px-4 py-3 text-sm font-bold">Report post</button>}
              <button onClick={() => setMenu(false)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-500 border-t border-slate-100">Cancel</button>
            </div>
          )}
        </div>
      </header>
      {d.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={snapUrl(d.image)} alt={d.text ?? "A snap from Dubai Life"} loading="lazy" className="w-full max-h-[70vh] object-cover bg-slate-800" onDoubleClick={() => { if (!post.liked) void like(); }} />
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1">
          <button onClick={() => void like()} aria-pressed={post.liked} aria-label={post.liked ? "Unlike" : "Like"}
            className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-sm font-bold ${post.liked ? "bg-rose-500/20 text-rose-300" : "bg-white/5 text-white/70"}`}>
            <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />{post.likes > 0 ? post.likes : ""}
          </button>
          <button onClick={() => setComments(true)} className="h-9 px-3 rounded-full bg-white/5 text-white/70 flex items-center gap-1.5 text-sm font-bold" aria-label="Comments">
            <MessageCircle className="w-4 h-4" />{post.comments ? post.comments : ""}
          </button>
          <button onClick={() => void share()} className="h-9 px-3 rounded-full bg-white/5 text-white/70 flex items-center gap-1.5 text-sm font-bold" aria-label="Share"><Share2 className="w-4 h-4" /></button>
        </div>
        {d.text && <p className="text-[15px] leading-snug"><ProfileLink username={post.actor.username} className="font-black mr-1.5" /><RichText text={d.text} /></p>}
        {(post.comments ?? 0) > 0 && <button onClick={() => setComments(true)} className="text-sm text-white/50">View {post.comments === 1 ? "1 comment" : `all ${post.comments} comments`}</button>}
      </div>
      {comments && <CommentsSheet post={post} onClose={() => setComments(false)} onCount={(n) => { if (n !== post.comments) onChange({ comments: n }); }} />}
    </article>
  );
}
