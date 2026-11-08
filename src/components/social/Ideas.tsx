"use client";

// Community ideas board: suggest improvements, vote for the ones you want, and follow what the
// team decides. Shown as a tab on the phone, beside chats.

import { useCallback, useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Lightbulb, Plus, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { voteOnIdea } from "@/lib/feedback";

interface Idea { id: string; author_id: string; title: string; body: string | null; category: string; status: string; team_note: string | null; votes: number; created_at: string; user_vote?: number }

export const IDEA_CATEGORIES: Record<string, string> = {
  general: "General",
  parties: "Parties & Yachts",
  places: "Districts & Places",
  avatars: "Avatars & Style",
  social: "Social & Spaces",
  economy: "Careers & Wealth",
  minigames: "Mini-Games",
  bugs: "Fixes & Bugs",
};
export const IDEA_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "Open", tone: "bg-white/10 text-white/70" },
  under_review: { label: "Under review", tone: "bg-sky-500/20 text-sky-300" },
  planned: { label: "Planned", tone: "bg-violet-500/20 text-violet-300" },
  in_progress: { label: "In progress", tone: "bg-amber-500/20 text-amber-300" },
  shipped: { label: "Shipped 🎉", tone: "bg-emerald-500/20 text-emerald-300" },
  declined: { label: "Not planned", tone: "bg-rose-500/20 text-rose-300" },
};

export function Ideas({ me }: { me: string }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<"top" | "new" | "shipped">("top");
  const [writing, setWriting] = useState(false);

  const load = useCallback(async () => {
    const db = supabase();
    let q = db.from("ideas").select("id, author_id, title, body, category, status, team_note, votes, created_at").eq("hidden", false).limit(100);
    q = sort === "new" ? q.order("created_at", { ascending: false }) : sort === "shipped" ? q.eq("status", "shipped").order("updated_at", { ascending: false }) : q.order("votes", { ascending: false }).order("created_at", { ascending: false });
    const [{ data }, { data: votes }] = await Promise.all([q, db.from("idea_votes").select("idea_id, direction").eq("user_id", me)]);
    const list = (data as Idea[]) ?? [];
    setIdeas(list);
    const voteMap: Record<string, number> = {};
    (votes ?? []).forEach((v) => { voteMap[v.idea_id] = v.direction ?? 1; });
    setUserVotes(voteMap);
    const ids = [...new Set(list.map((i) => i.author_id))];
    if (ids.length) {
      const { data: people } = await db.from("profiles").select("id, username").in("id", ids);
      setNames(Object.fromEntries((people ?? []).map((p) => [p.id, p.username])));
    }
  }, [me, sort]);

  useEffect(() => { void load(); }, [load]);

  const handleVote = async (idea: Idea, direction: 1 | -1) => {
    const cur = userVotes[idea.id] ?? 0;
    const isRemoving = cur === direction;
    const nextVote = isRemoving ? 0 : direction;
    const delta = isRemoving ? -direction : (direction - cur);

    setUserVotes((v) => ({ ...v, [idea.id]: nextVote }));
    setIdeas((l) => l?.map((i) => (i.id === idea.id ? { ...i, votes: i.votes + delta } : i)) ?? null);

    const res = await voteOnIdea(idea.id, direction, cur);
    setIdeas((l) => l?.map((i) => (i.id === idea.id ? { ...i, votes: res.votes } : i)) ?? null);
    setUserVotes((v) => ({ ...v, [idea.id]: res.user_vote }));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-sky-500/10 border border-white/10 p-4 flex items-center gap-3">
        <Lightbulb className="w-8 h-8 text-amber-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-black">Help shape Dubai Life</div>
          <p className="text-xs text-white/60">Suggest a place, a feature or a fix. The most-voted ideas get built first.</p>
        </div>
        <button onClick={() => setWriting(true)} className="h-10 px-3 rounded-xl bg-white text-zinc-950 text-xs font-black flex items-center gap-1 shrink-0"><Plus className="w-4 h-4" /> Idea</button>
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex gap-1.5">
          {([["top", "Top"], ["new", "New"], ["shipped", "Shipped"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} className={`h-8 px-3 rounded-full text-xs font-bold ${sort === id ? "bg-white text-zinc-950" : "bg-white/5 text-white/70"}`}>{label}</button>
          ))}
        </div>
        <Link href="/feedback" className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-bold">
          <span>Full Board</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      {ideas === null && <p className="text-sm text-white/50 text-center py-8">Loading…</p>}
      {ideas?.length === 0 && <p className="text-sm text-white/50 text-center py-8">No ideas here yet — be the first.</p>}
      {ideas?.map((i) => {
        const myVote = userVotes[i.id] ?? 0;
        const st = IDEA_STATUS[i.status] ?? IDEA_STATUS.open;
        return (
          <div key={i.id} className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 shrink-0 flex flex-col items-center justify-center bg-black/40 rounded-xl py-1 border border-white/5">
              <button
                onClick={() => void handleVote(i, 1)}
                aria-label="Upvote"
                className={`w-8 h-6 rounded flex items-center justify-center transition-colors ${myVote === 1 ? "text-amber-400 bg-amber-400/20" : "text-white/40 hover:text-white"}`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className={`text-xs font-black my-0.5 ${i.votes > 0 ? "text-amber-300" : i.votes < 0 ? "text-rose-400" : "text-white/60"}`}>
                {i.votes}
              </span>
              <button
                onClick={() => void handleVote(i, -1)}
                aria-label="Downvote"
                className={`w-8 h-6 rounded flex items-center justify-center transition-colors ${myVote === -1 ? "text-rose-400 bg-rose-400/20" : "text-white/40 hover:text-white"}`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${st.tone}`}>{st.label}</span>
                <span className="text-[10px] text-white/40">{IDEA_CATEGORIES[i.category] ?? i.category}</span>
              </div>
              <div className="font-bold mt-1">{i.title}</div>
              {i.body && <p className="text-sm text-white/60 whitespace-pre-wrap">{i.body}</p>}
              {i.team_note && <p className="mt-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-200"><b>Team:</b> {i.team_note}</p>}
              <div className="text-[11px] text-white/40 mt-1">@{names[i.author_id] ?? "citizen"} · {new Date(i.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        );
      })}
      {writing && <NewIdea onClose={() => setWriting(false)} onPosted={() => { setWriting(false); setSort("new"); void load(); }} />}
    </div>
  );
}

function NewIdea({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase().rpc("post_idea", { p_title: title, p_body: body, p_category: category });
    setBusy(false);
    if (err) setError(/too_many/.test(err.message) ? "You've shared 5 ideas today — come back tomorrow." : "Couldn't post. Titles need at least 4 characters.");
    else onPosted();
  };
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2">
      <form onSubmit={post} className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-5 space-y-3 text-white">
        <div className="flex items-center"><h2 className="flex-1 font-black text-lg">Share an idea</h2><button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-2 text-sm">
          {Object.entries(IDEA_CATEGORIES).map(([k, v]) => <option key={k} value={k} className="text-zinc-900">{v}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="Your idea in a sentence" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm outline-none" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} rows={5} placeholder="Tell us more (optional): what would it look like, why would it help?" className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm outline-none" />
        {error && <p className="text-sm font-bold text-rose-300">{error}</p>}
        <button disabled={busy || title.trim().length < 4} className="w-full h-11 rounded-xl bg-amber-400 disabled:opacity-50 text-zinc-950 font-black">{busy ? "Posting…" : "Post idea"}</button>
      </form>
    </div>
  );
}
