"use client";

// A post's comments: replies one level deep under the comment they answer, likes on each, reply (mentioning them),
// delete my own (or any on my post), report someone else's. @mentions in comments notify those players.

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Send, X } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { ProfileLink } from "@/components/social/ProfileLink";
import { RichText } from "@/components/social/RichText";
import { addComment, deleteComment, likeComment, loadComments, reportContent, SOCIAL_RULES, type Comment } from "@/lib/social";
import { sendPushNotification } from "@/lib/push/client";
import { ago, type FeedPost } from "@/lib/cityFeed";
import { useCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";

export function CommentsSheet({ post, onClose, onCount }: { post: FeedPost; onClose: () => void; onCount?: (n: number) => void }) {
  const { citizen } = useCitizen();
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const r = await loadComments(post.id);
    setList(r.data ?? []);
    onCount?.((r.data ?? []).length);
  }, [post.id, onCount]);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setError(null);
    const r = await addComment(post.id, text, replyTo?.id ?? null);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    gameAudio.playClickSound();
    // A push to the post's author (and the person replied to), as chat messages do.
    const me = citizen?.username ?? "Someone";
    if (post.actor.id !== citizen?.id) void sendPushNotification(post.actor.id, { title: `💬 @${me} commented`, body: text.slice(0, 120), url: `/city?post=${post.id}`, tag: `post-${post.id}` });
    if (replyTo && replyTo.user.id !== citizen?.id && replyTo.user.id !== post.actor.id) void sendPushNotification(replyTo.user.id, { title: `↩️ @${me} replied`, body: text.slice(0, 120), url: `/city?post=${post.id}`, tag: `post-${post.id}` });
    setText(""); setReplyTo(null);
    void load();
  };
  const like = async (c: Comment) => {
    const r = await likeComment(c.id);
    if (r.data === undefined) return;
    setList((cur) => cur?.map((x) => (x.id === c.id ? { ...x, liked: !!r.data, likes: Math.max(0, x.likes + (r.data ? 1 : -1)) } : x)) ?? cur);
  };
  const remove = async (c: Comment) => {
    if (!window.confirm("Delete this comment?")) return;
    await deleteComment(c.id);
    void load();
  };
  const report = async (c: Comment) => {
    if (!window.confirm(`Report @${c.user.username}'s comment to the moderators?`)) return;
    await reportContent(c.user.id, "comment", c.id, "harassment", c.body);
    window.alert("Thanks. The moderators will look at it.");
  };
  const reply = (c: Comment) => {
    setReplyTo(c);
    setText((t) => (t.includes(`@${c.user.username}`) ? t : `@${c.user.username} ${t}`));
    input.current?.focus();
  };

  const top = (list ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: number) => (list ?? []).filter((c) => c.parentId === id);
  const row = (c: Comment, nested = false) => (
    <div key={c.id} className={`flex gap-2.5 ${nested ? "ml-10" : ""}`}>
      <ProfileLink username={c.user.username} className="shrink-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rosterThumb(presetFor(c.user.look ?? { gender: "woman" }))} alt="" className={`${nested ? "w-7 h-7" : "w-9 h-9"} rounded-full object-cover object-top bg-slate-200 block`} />
      </ProfileLink>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug"><ProfileLink username={c.user.username} className="font-black mr-1.5" /><RichText text={c.body} /></p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-bold">
          <span>{ago(c.at)}</span>
          <button onClick={() => reply(c)}>Reply</button>
          {(c.mine || post.mine) ? <button onClick={() => void remove(c)}>Delete</button> : <button onClick={() => void report(c)}>Report</button>}
        </div>
      </div>
      <button onClick={() => void like(c)} aria-label={c.liked ? "Unlike" : "Like"} className={`shrink-0 flex flex-col items-center text-[10px] font-bold ${c.liked ? "text-rose-500" : "text-slate-300"}`}>
        <Heart className={`w-4 h-4 ${c.liked ? "fill-current" : ""}`} />{c.likes > 0 ? c.likes : ""}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Comments">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-md bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] flex flex-col max-h-[85dvh]">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-slate-100">
          <h2 className="flex-1 font-black">Comments{list ? ` · ${list.length}` : ""}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 min-h-[30dvh] overflow-y-auto px-4 py-3 space-y-3">
          {list === null ? <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
            : top.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No comments yet. Be the first.</p>
            : top.map((c) => <div key={c.id} className="space-y-2.5">{row(c)}{repliesOf(c.id).map((r) => row(r, true))}</div>)}
        </div>
        <div className="border-t border-slate-100 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1.5">
          {replyTo && <p className="text-[11px] text-slate-500 px-1">Replying to <b>@{replyTo.user.username}</b> · <button className="underline" onClick={() => { setReplyTo(null); setText(""); }}>cancel</button></p>}
          {error && <p className="text-xs font-bold text-rose-600 px-1">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
            <input ref={input} value={text} onChange={(e) => setText(e.target.value.slice(0, SOCIAL_RULES.commentMax))} placeholder="Add a comment…"
              className="flex-1 h-11 rounded-full bg-slate-100 px-4 text-base outline-none" />
            <button disabled={busy || !text.trim()} className="w-11 h-11 rounded-full bg-fuchsia-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Send"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
