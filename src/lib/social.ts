"use client";

// Social, phase 1 (migration 20270120000000_social_posts.sql): players' own posts (a caption and a snap taken in the
// game, with the place), comments and replies, likes on comments, deleting and reporting, and the notices for likes,
// comments, replies, mentions and follows. Snaps go to the public "snaps" bucket under the player's own folder.

import { supabase } from "@/lib/supabase/client";
import { reportUser, type ReportReason } from "@/lib/safety";
import type { AvatarLookProps } from "@/components/avatar/roster";
import type { FeedPost } from "@/lib/cityFeed";
import RULES from "@/data/social/rules.json";

export const SOCIAL_RULES = RULES;

const ERR: Record<string, string> = {
  too_long: "That's too long.",
  no_links: "Links aren't allowed in posts and comments.",
  no_numbers: "Phone numbers aren't allowed. Keep chatting in the game.",
  blocked_words: "Please keep it friendly: that has a word we don't allow.",
  empty: "Write something or add a snap.",
  slow_down: "You're posting a lot. Take a breather and try again later.",
  blocked: "You can't do that with this player.",
  no_post: "That post has gone.",
  no_comment: "That comment has gone.",
  bad_image: "That snap couldn't be used. Take another.",
};
const friendly = (m: string) => ERR[Object.keys(ERR).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong. Try again.";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

/** A snap's public address. */
export const snapUrl = (path: string) => supabase().storage.from("snaps").getPublicUrl(path.replace(/^snaps\//, "")).data.publicUrl;

/** Uploads a snap (a JPEG from the game) to my folder; returns its path for create_post. */
export async function uploadSnap(userId: string, blob: Blob): Promise<{ path?: string; error?: string }> {
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase().storage.from("snaps").upload(`${userId}/${name}`, blob, { contentType: "image/jpeg", upsert: false });
  return error ? { error: "Couldn't upload the snap. Check your connection." } : { path: `snaps/${userId}/${name}` };
}

export const createPost = (text: string, image: string | null, place: string | null, placeName: string | null) =>
  call<number>("create_post", { p_text: text, p_image: image, p_place: place, p_place_name: placeName });
export const deletePost = (id: number) => call<null>("delete_post", { p_post: id });
export const getPost = (id: number) => call<FeedPost | null>("get_post", { p_post: id });
export const userPosts = (userId: string, before?: number) => call<FeedPost[]>("user_posts", { p_user: userId, p_before: before ?? null });

export interface Comment {
  id: number; parentId: number | null; body: string; at: string;
  user: { id: string; username: string; name?: string | null; look?: AvatarLookProps | null };
  likes: number; liked: boolean; mine: boolean;
}
export const loadComments = (postId: number) => call<Comment[]>("post_comments", { p_post: postId });
export const addComment = (postId: number, text: string, parentId?: number | null) => call<number>("add_comment", { p_post: postId, p_text: text, p_parent: parentId ?? null });
export const deleteComment = (id: number) => call<null>("delete_comment", { p_comment: id });
export const likeComment = (id: number) => call<boolean>("like_comment", { p_comment: id });

/** Report a post or a comment (it goes to the moderators with what it was). */
export const reportContent = (authorId: string, what: "post" | "comment", id: number, reason: ReportReason = "harassment", text?: string) =>
  reportUser(authorId, reason, `${what}:${id}`, text?.slice(0, 300));

export interface SocialNotice {
  id: number; kind: "like" | "comment" | "reply" | "mention" | "follow" | "comment_like";
  postId: number | null; commentId: number | null; snippet: string | null; at: string; read: boolean;
  actor: { id: string; username: string; look?: AvatarLookProps | null };
  image: string | null;
}
export const myNotices = () => call<SocialNotice[]>("my_social_notifications", { p_limit: 50 });
export const socialUnread = () => call<number>("social_unread", {});
export const markSocialRead = () => call<null>("mark_social_read", {});

/** What a notice says. */
export function noticeText(n: SocialNotice): { icon: string; text: string } {
  const who = `@${n.actor.username}`;
  switch (n.kind) {
    case "like": return { icon: "❤️", text: `${who} liked your post` };
    case "comment": return { icon: "💬", text: `${who} commented: ${n.snippet ?? ""}` };
    case "reply": return { icon: "↩️", text: `${who} replied: ${n.snippet ?? ""}` };
    case "mention": return { icon: "📣", text: `${who} mentioned you: ${n.snippet ?? ""}` };
    case "comment_like": return { icon: "❤️", text: `${who} liked your comment: ${n.snippet ?? ""}` };
    case "follow": return { icon: "➕", text: `${who} started following you` };
  }
}
