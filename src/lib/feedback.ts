import { supabase } from "@/lib/supabase/client";

export interface CommunityIdea {
  id: string;
  title: string;
  body: string | null;
  category: string;
  status: "open" | "under_review" | "planned" | "in_progress" | "shipped" | "declined";
  team_note: string | null;
  votes: number;
  created_at: string;
  author_id: string;
  author_username?: string;
  author_display_name?: string;
  user_vote?: number; // 1 = upvoted, -1 = downvoted, 0 = none
}

export const FEEDBACK_CATEGORIES: Record<string, { label: string; icon: string }> = {
  all: { label: "All Categories", icon: "✨" },
  parties: { label: "Parties & Yachts", icon: "🛥️" },
  places: { label: "Districts & Places", icon: "🏙️" },
  avatars: { label: "Avatars & Style", icon: "👗" },
  social: { label: "Social & Spaces", icon: "🎙️" },
  economy: { label: "Careers & Wealth", icon: "💎" },
  minigames: { label: "Mini-Games & Events", icon: "🏎️" },
  bugs: { label: "Fixes & Polish", icon: "🛠️" },
  general: { label: "General", icon: "💡" },
};

export const FEEDBACK_STATUSES: Record<string, { label: string; tone: string; description: string }> = {
  all: { label: "All Statuses", tone: "bg-slate-800 text-slate-200 border-slate-700", description: "All community proposals" },
  planned: { label: "Planned", tone: "bg-violet-500/20 text-violet-300 border-violet-500/30", description: "Approved and slated on our build roadmap" },
  in_progress: { label: "In Progress", tone: "bg-amber-500/20 text-amber-300 border-amber-500/30", description: "Currently being built by the Dubai Life dev team" },
  shipped: { label: "Shipped 🎉", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", description: "Live in Dubai right now for all citizens" },
  under_review: { label: "Under Review", tone: "bg-sky-500/20 text-sky-300 border-sky-500/30", description: "Dubai engineering & design team reviewing feasibility" },
  open: { label: "New Ideas", tone: "bg-white/10 text-white/80 border-white/20", description: "Freshly submitted by citizens" },
};

/**
 * Fetch ideas with current user's vote status and author details.
 */
export async function listIdeas(options: {
  category?: string;
  status?: string;
  sort?: "top" | "newest" | "oldest";
  limit?: number;
  offset?: number;
  userId?: string;
}): Promise<CommunityIdea[]> {
  const db = supabase();
  const cat = options.category && options.category !== "all" ? options.category : null;
  const stat = options.status && options.status !== "all" ? options.status : null;
  const sort = options.sort ?? "top";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  // Try RPC function first
  try {
    const { data, error } = await db.rpc("list_community_ideas", {
      p_category: cat,
      p_status: stat,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    });

    if (!error && Array.isArray(data)) {
      return data as CommunityIdea[];
    }
  } catch {
    // Fall back to table query below
  }

  // Direct table query fallback
  let q = db
    .from("ideas")
    .select("id, author_id, title, body, category, status, team_note, votes, created_at")
    .eq("hidden", false);

  if (cat) q = q.eq("category", cat);
  if (stat) q = q.eq("status", stat);

  if (sort === "top") {
    q = q.order("votes", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "newest") {
    q = q.order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: true });
  }

  q = q.range(offset, offset + limit - 1);
  const { data: rows } = await q;
  if (!rows || rows.length === 0) return [];

  const userVotes: Record<string, number> = {};
  if (options.userId) {
    const { data: votes } = await db
      .from("idea_votes")
      .select("idea_id, direction")
      .eq("user_id", options.userId)
      .in("idea_id", rows.map((r) => r.id));
    (votes ?? []).forEach((v) => {
      userVotes[v.idea_id] = v.direction ?? 1;
    });
  }

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const { data: authors } = await db.from("profiles").select("id, username, display_name").in("id", authorIds);
  const authorMap: Record<string, { username: string; display_name: string }> = {};
  (authors ?? []).forEach((a) => {
    authorMap[a.id] = { username: a.username, display_name: a.display_name || a.username };
  });

  return rows.map((r) => ({
    ...r,
    author_username: authorMap[r.author_id]?.username,
    author_display_name: authorMap[r.author_id]?.display_name,
    user_vote: userVotes[r.id] ?? 0,
  }));
}

/**
 * Cast an upvote (+1) or downvote (-1).
 * Tapping the same direction again removes the vote.
 */
export async function voteOnIdea(
  ideaId: string,
  direction: 1 | -1,
  currentVote: number = 0
): Promise<{ votes: number; user_vote: number }> {
  const db = supabase();

  // Try RPC first
  try {
    const { data, error } = await db.rpc("vote_idea", {
      p_idea: ideaId,
      p_direction: direction,
    });
    if (!error && data && typeof data.votes === "number") {
      return { votes: data.votes, user_vote: data.user_vote ?? 0 };
    }
  } catch {
    // Fall back to legacy toggle_idea_vote if RPC is not present
  }

  // Fallback to toggle_idea_vote (upvote toggle)
  const { data } = await db.rpc("toggle_idea_vote", { p_idea: ideaId });
  const netVotes = typeof data === "number" ? data : 0;
  return {
    votes: netVotes,
    user_vote: currentVote === direction ? 0 : direction,
  };
}

/**
 * Submit a new community feature idea or feedback.
 */
export async function submitIdea(title: string, body: string, category: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabase();
  const { error } = await db.rpc("post_idea", {
    p_title: title.trim(),
    p_body: body.trim() || null,
    p_category: category,
  });

  if (error) {
    if (/too_many/.test(error.message)) {
      return { ok: false, error: "You have reached the daily idea limit (5 ideas/day). Please return tomorrow!" };
    }
    return { ok: false, error: error.message || "Failed to submit idea. Titles need at least 4 characters." };
  }
  return { ok: true };
}
