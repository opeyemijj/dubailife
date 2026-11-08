"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Plus,
  Sparkles,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  Hammer,
  Compass,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  CommunityIdea,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  listIdeas,
  submitIdea,
  voteOnIdea,
} from "@/lib/feedback";
import { askSocialPush } from "@/lib/push/engage";
import { supabase } from "@/lib/supabase/client";

interface FeedbackBoardProps {
  initialUserId?: string;
  isEmbedded?: boolean;
}

export function FeedbackBoard({ initialUserId, isEmbedded = false }: FeedbackBoardProps) {
  const [userId, setUserId] = useState<string | undefined>(initialUserId);
  const [ideas, setIdeas] = useState<CommunityIdea[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<"top" | "newest" | "oldest">("top");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  // Detect authenticated user if not provided
  useEffect(() => {
    if (!initialUserId) {
      supabase().auth.getUser().then(({ data }) => {
        if (data.user?.id) setUserId(data.user.id);
      });
    }
  }, [initialUserId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listIdeas({
        category,
        status: statusFilter,
        sort,
        userId,
      });
      setIdeas(data);
    } catch {
      setToast({ message: "Unable to load feedback items right now.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [category, statusFilter, sort, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Vote handler
  const handleVote = async (idea: CommunityIdea, direction: 1 | -1) => {
    if (!userId) {
      setToast({ message: "Sign in to vote on community ideas!", tone: "error" });
      return;
    }

    const currentVote = idea.user_vote ?? 0;
    const isRemoving = currentVote === direction;
    const newVote = isRemoving ? 0 : direction;
    const scoreDelta = isRemoving ? -direction : (direction - currentVote);

    // Optimistic update
    setIdeas((prev) =>
      prev
        ? prev.map((item) =>
            item.id === idea.id
              ? {
                  ...item,
                  votes: item.votes + scoreDelta,
                  user_vote: newVote,
                }
              : item
          )
        : null
    );

    try {
      const result = await voteOnIdea(idea.id, direction, currentVote);
      setIdeas((prev) =>
        prev
          ? prev.map((item) =>
              item.id === idea.id
                ? {
                    ...item,
                    votes: result.votes,
                    user_vote: result.user_vote,
                  }
                : item
            )
          : null
      );
    } catch {
      // Revert on error
      setToast({ message: "Could not record vote. Please retry.", tone: "error" });
      void loadData();
    }
  };

  // Filtered list
  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    if (!searchQuery.trim()) return ideas;
    const q = searchQuery.toLowerCase().trim();
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.body && i.body.toLowerCase().includes(q)) ||
        (i.team_note && i.team_note.toLowerCase().includes(q))
    );
  }, [ideas, searchQuery]);

  // Status statistics for roadmap counter
  const statusCounts = useMemo(() => {
    const counts = { planned: 0, in_progress: 0, shipped: 0, under_review: 0 };
    if (!ideas) return counts;
    ideas.forEach((i) => {
      if (i.status in counts) {
        counts[i.status as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [ideas]);

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-6 ${isEmbedded ? "p-1" : "p-4 sm:p-6"}`}>
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-[200] max-w-sm rounded-2xl p-4 shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
            toast.tone === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/40 text-rose-200"
          }`}
        >
          <span className="text-xl">{toast.tone === "success" ? "✓" : "⚠️"}</span>
          <p className="text-sm font-semibold flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      {!isEmbedded && (
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dubai Life Community Roadmap</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Citizen Feedback &amp; Feature Requests
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Shape the virtual city with us. Upvote features you want, propose house parties, yacht clubs, and economic
                upgrades. Ideas with the highest citizen votes are prioritized by our engineering team!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsSubmitOpen(true)}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Propose an Idea</span>
              </button>
            </div>
          </div>

          {/* Quick Roadmap Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-white/10">
            <div
              onClick={() => setStatusFilter("planned")}
              className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 cursor-pointer transition-colors ${
                statusFilter === "planned" ? "ring-2 ring-violet-400 bg-violet-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                <Clock className="w-4 h-4" />
                <span>Planned</span>
              </div>
              <p className="text-xl font-black text-white mt-1">{statusCounts.planned}</p>
            </div>

            <div
              onClick={() => setStatusFilter("in_progress")}
              className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 cursor-pointer transition-colors ${
                statusFilter === "in_progress" ? "ring-2 ring-amber-400 bg-amber-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Hammer className="w-4 h-4" />
                <span>In Progress</span>
              </div>
              <p className="text-xl font-black text-white mt-1">{statusCounts.in_progress}</p>
            </div>

            <div
              onClick={() => setStatusFilter("shipped")}
              className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-colors ${
                statusFilter === "shipped" ? "ring-2 ring-emerald-400 bg-emerald-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Shipped</span>
              </div>
              <p className="text-xl font-black text-white mt-1">{statusCounts.shipped}</p>
            </div>

            <div
              onClick={() => setStatusFilter("under_review")}
              className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-500/40 cursor-pointer transition-colors ${
                statusFilter === "under_review" ? "ring-2 ring-sky-400 bg-sky-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                <Compass className="w-4 h-4" />
                <span>Under Review</span>
              </div>
              <p className="text-xl font-black text-white mt-1">{statusCounts.under_review}</p>
            </div>
          </div>
        </header>
      )}

      {/* Embedded Quick Action Header (When inside Phone tab or drawer) */}
      {isEmbedded && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xl shrink-0">
              💡
            </div>
            <div>
              <h2 className="font-black text-white text-base">Community Ideas</h2>
              <p className="text-xs text-white/60">Vote on features &amp; see what&apos;s shipping next</p>
            </div>
          </div>
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0 hover:bg-amber-300"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Propose</span>
          </button>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search community ideas, yachts, clubs, spaces..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 self-start sm:self-auto shrink-0">
            {(
              [
                ["top", "🔥 Top Voted"],
                ["newest", "✨ Newest"],
                ["oldest", "🕰️ Oldest"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  sort === key ? "bg-amber-400 text-slate-950 font-black shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories horizontally scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {Object.entries(FEEDBACK_CATEGORIES).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                category === key
                  ? "bg-slate-100 text-slate-950 font-black ring-2 ring-white/30"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {Object.entries(FEEDBACK_STATUSES).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                statusFilter === key
                  ? `${item.tone} font-black ring-1 ring-white/20`
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Feed */}
      <section className="space-y-3" aria-label="Community ideas list">
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading citizen proposals…</p>
          </div>
        )}

        {!loading && filteredIdeas.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4 bg-slate-950/40">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center text-3xl mx-auto">
              💡
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">No ideas found in this view</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Be the pioneer who proposes the first feature here! Suggest a venue, party mode, or mechanic.
              </p>
            </div>
            <button
              onClick={() => setIsSubmitOpen(true)}
              className="h-10 px-5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Propose Idea Now</span>
            </button>
          </div>
        )}

        {!loading &&
          filteredIdeas.map((idea) => {
            const statusConfig = FEEDBACK_STATUSES[idea.status] ?? FEEDBACK_STATUSES.open;
            const categoryConfig = FEEDBACK_CATEGORIES[idea.category] ?? { label: idea.category, icon: "💡" };
            const isUpvoted = idea.user_vote === 1;
            const isDownvoted = idea.user_vote === -1;

            return (
              <article
                key={idea.id}
                className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 p-4 transition-all duration-200 flex gap-3.5 sm:gap-4 items-start"
              >
                {/* Voting column */}
                <div className="flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 shrink-0 w-12 sm:w-14 shadow-inner">
                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => void handleVote(idea, 1)}
                    aria-label={`Upvote idea: ${idea.title}`}
                    className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isUpvoted
                        ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                        : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                    }`}
                  >
                    <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Net Score */}
                  <span
                    className={`text-xs sm:text-sm font-black py-1 select-none tabular-nums ${
                      idea.votes > 0
                        ? "text-amber-300"
                        : idea.votes < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {idea.votes}
                  </span>

                  {/* Downvote Button */}
                  <button
                    type="button"
                    onClick={() => void handleVote(idea, -1)}
                    aria-label={`Downvote idea: ${idea.title}`}
                    className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isDownvoted
                        ? "bg-rose-500 text-white font-black shadow-md scale-105"
                        : "text-slate-400 hover:text-rose-300 hover:bg-slate-800"
                    }`}
                  >
                    <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Content details */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Category & Status badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border ${statusConfig.tone}`}
                    >
                      {statusConfig.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium bg-slate-800/60 px-2 py-0.5 rounded-md">
                      <span>{categoryConfig.icon}</span>
                      <span>{categoryConfig.label}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
                      {new Date(idea.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Title & Body */}
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-amber-200 transition-colors">
                    {idea.title}
                  </h3>

                  {idea.body && (
                    <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {idea.body}
                    </p>
                  )}

                  {/* Team Note Banner if team replied */}
                  {idea.team_note && (
                    <div className="mt-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-transparent border border-emerald-500/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dubai Life Development Team:</span>
                      </div>
                      <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                        {idea.team_note}
                      </p>
                    </div>
                  )}

                  {/* Author credit & Mobile date */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Proposed by @{idea.author_display_name || idea.author_username || "citizen"}
                    </span>
                    <span className="sm:hidden">
                      {new Date(idea.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
      </section>

      {/* Submit Idea Modal */}
      {isSubmitOpen && (
        <SubmitIdeaModal
          onClose={() => setIsSubmitOpen(false)}
          onSuccess={() => {
            setIsSubmitOpen(false);
            setToast({ message: "Thank you! Your idea has been posted to the board.", tone: "success" });
            setSort("newest");
            void loadData();
            setTimeout(() => {
              askSocialPush({
                icon: "💡",
                title: "Follow your proposal",
                text: "Turn on notifications to be alerted the moment developers review, reply, or ship your feature!",
              });
            }, 1600);
          }}
        />
      )}
    </div>
  );
}

function SubmitIdeaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4) {
      setError("Please provide a title with at least 4 characters.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await submitIdea(title, body, category);
    setBusy(false);

    if (!res.ok) {
      setError(res.error || "Failed to submit. Please check your connection.");
      return;
    }
    onSuccess();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-[28px] sm:rounded-3xl p-6 text-white space-y-4 shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 id="submit-modal-title" className="text-lg font-black">
              Propose Feature or Improvement
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              {Object.entries(FEEDBACK_CATEGORIES)
                .filter(([k]) => k !== "all")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add Dubai Marina Mega Yacht Party with DJ Booth"
              className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400">Keep it clear and specific (4–120 characters).</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300">
              Details &amp; Value to Dubai Life
            </label>
            <textarea
              rows={4}
              maxLength={1500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe how it works: What can avatars do? What are the rewards? How does it connect with friends or spaces?"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400">Optional, up to 1,500 characters.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || title.trim().length < 4}
              className="h-11 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? "Submitting…" : "Publish Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
