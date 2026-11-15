"use client";

// The City Feed (requirements R4) and Follow (R3). Posts are written by the database from what really happened
// (migration 20270109000000_city_feed.sql); this reads them, follows people, likes posts, and says what each post
// reads as and where its button goes.

import { supabase } from "@/lib/supabase/client";
import { gameInfo } from "@/lib/games/registry";
import CARS from "@/data/cars/cars.json";
import type { AvatarLookProps } from "@/components/avatar/roster";

export type FeedKind = "party" | "win" | "arrived" | "home" | "car" | "gift" | "married" | "hired" | "reward" | "rain" | "race";
export type FeedScope = "all" | "following";

export interface FeedPerson { id: string; username: string; name?: string | null; look?: AvatarLookProps | null }
export interface FeedPost {
  id: number;
  kind: FeedKind;
  data: Record<string, unknown>;
  n: number;
  at: string;
  actor: FeedPerson;
  other: { id: string; username: string } | null;
  likes: number;
  liked: boolean;
  iFollow: boolean;
}
export interface LiveParty { inviteId: number; title: string | null; partyKind: string; route: string | null; host: string; hostId: string; look?: AvatarLookProps | null; arrived: number }

export async function loadFeed(scope: FeedScope, before?: number): Promise<FeedPost[]> {
  const { data, error } = await supabase().rpc("city_feed", { p_scope: scope, p_before: before ?? null, p_limit: 30 });
  if (error) return [];
  return (data ?? []) as FeedPost[];
}

export async function loadLiveParties(): Promise<LiveParty[]> {
  const { data } = await supabase().rpc("live_parties");
  return (data ?? []) as LiveParty[];
}

/** Follow one or more players. Returns how many were newly followed. */
export async function follow(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const { data } = await supabase().rpc("follow_users", { p_users: ids });
  window.dispatchEvent(new CustomEvent("dubai:follows-changed"));
  return Number(data ?? 0);
}

export async function unfollow(id: string) {
  await supabase().rpc("unfollow_user", { p_user: id });
  window.dispatchEvent(new CustomEvent("dubai:follows-changed"));
}

export async function likePost(id: number): Promise<boolean | null> {
  const { data, error } = await supabase().rpc("like_post", { p_post: id });
  return error ? null : !!data;
}

export const FEED_CATEGORIES = [
  { id: "money", label: "Homes, cars and gifts" },
  { id: "games", label: "Game wins" },
  { id: "parties", label: "Parties I host" },
  { id: "life", label: "Life news (new job, wedding, arriving)" },
] as const;

export async function myFeedHidden(): Promise<string[]> {
  const { data } = await supabase().from("feed_prefs").select("hide").maybeSingle();
  return (data?.hide as string[] | undefined) ?? [];
}
export async function setFeedHidden(hide: string[]) {
  await supabase().rpc("set_feed_hidden", { p_hide: hide });
}

/** "12M", "2.5M", "850k". */
export function shortAed(n: number): string {
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

const PARTY_WORD: Record<string, string> = { house_party: "a house party", pool_party: "a pool party", club_night: "a club night", seminar: "a seminar" };

/** A car's name from its id (any dealer's list in src/data/cars/cars.json). */
export function carName(id: string): string {
  const seen = new Set<unknown>();
  const find = (v: unknown): string | null => {
    if (!v || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) { for (const x of v) { const r = find(x); if (r) return r; } return null; }
    const o = v as Record<string, unknown>;
    if (o.id === id && typeof o.make === "string") return `${o.make} ${String(o.model ?? "")}`.trim();
    if (o.id === id && typeof o.name === "string") return o.name;
    for (const x of Object.values(o)) { const r = find(x); if (r) return r; }
    return null;
  };
  return find(CARS) ?? "a new car";
}

export interface PostView { icon: string; text: string; action?: { label: string; href?: string; follow?: boolean; like?: boolean } }

/** What a post says, and its button. */
export function describePost(p: FeedPost, now = Date.now()): PostView {
  const who = `@${p.actor.username}`;
  const d = p.data;
  switch (p.kind) {
    case "party": {
      const live = Date.parse(String(d.startsAt ?? "")) <= now && now < (d.endsAt ? Date.parse(String(d.endsAt)) : Date.parse(String(d.startsAt ?? "")) + 3 * 3_600_000);
      const what = PARTY_WORD[String(d.partyKind)] ?? "a party";
      const title = d.title ? `: "${String(d.title)}"` : "";
      return { icon: "🎉", text: `${who} ${live ? "is hosting" : "is throwing"} ${what}${title}`, action: d.route ? { label: live ? "Join" : "See it", href: String(d.route) } : undefined };
    }
    case "win": {
      const g = gameInfo(String(d.game));
      return { icon: "🏆", text: `${who} won ${p.n > 1 ? `${p.n} games of` : "at"} ${g?.name ?? String(d.game)}`, action: { label: `Challenge @${p.actor.username}`, href: `/games/${String(d.game)}` } };
    }
    case "arrived":
      return { icon: "✈️", text: `${who} just arrived in Dubai`, action: p.iFollow ? { label: "Say hi", like: true } : { label: "Welcome · Follow", follow: true } };
    case "home": {
      const type = String(d.type ?? "home").replace(/_/g, " ");
      const href = d.buildingId && d.unit ? `/property/${String(d.buildingId)}/${encodeURIComponent(String(d.unit))}` : undefined;
      return { icon: "🏡", text: `${who} bought a ${type}${d.price ? ` for AED ${shortAed(Number(d.price))}` : ""}`, action: href ? { label: "Visit", href } : { label: "Congratulate", like: true } };
    }
    case "car":
      return { icon: "🚗", text: `${who} bought ${carName(String(d.car))}${d.price ? ` for AED ${shortAed(Number(d.price))}` : ""}`, action: { label: "Congratulate", like: true } };
    case "gift":
      return { icon: "💸", text: `${who} gave ${p.other ? `@${p.other.username}` : "someone"} AED ${shortAed(Number(d.amount ?? 0))}`, action: { label: "Congratulate", like: true } };
    case "married":
      return { icon: "💍", text: `${who} and ${p.other ? `@${p.other.username}` : "their partner"} got married`, action: { label: "Congratulate", like: true } };
    case "hired":
      return { icon: "💼", text: `${who} got a job${d.title ? ` as ${String(d.title)}` : ""}${d.venture ? ` at ${String(d.venture)}` : ""}`, action: { label: "Congratulate", like: true } };
    case "race":
      return {
        icon: "🏁",
        text: `${who} won a ${Number(d.racers ?? 2)}-car race at Dubai Autodrome in a ${carName(String(d.car))}${d.ms ? ` (${Math.floor(Number(d.ms) / 60000)}:${String(Math.floor((Number(d.ms) % 60000) / 1000)).padStart(2, "0")})` : ""}`,
        action: { label: `Race @${p.actor.username}`, href: "/autodrome" },
      };
    case "rain":
      return {
        icon: "💸",
        text: `${who} made it rain AED ${shortAed(Number(d.total ?? 0))} at ${p.other ? `@${p.other.username}'s` : "a"} party${d.title ? ` "${String(d.title)}"` : ""}`,
        action: d.code ? { label: "Go to the party", href: `/i/${String(d.code)}` } : { label: "Congratulate", like: true },
      };
    case "reward":
      return { icon: "💰", text: `${who} earned AED ${shortAed(Number(d.amount ?? 0))}: ${String(d.why ?? "a reward")}`, action: { label: "How?", href: "/wiki/top-users" } };
    default:
      return { icon: "✨", text: `${who} did something new` };
  }
}

/** "now", "5m", "3h", "2d". */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
