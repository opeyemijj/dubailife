"use client";

// Big Missions: three one-off rewards for bringing friends in from outside the game (src/data/social/missions.json,
// paid by the database: settle_big_missions in *_big_missions.sql). The invite goes out on WhatsApp with your
// link (?ref=you); the message is pre-written and yours to change.

import { useEffect, useState } from "react";
import CONFIG from "@/data/social/missions.json";
import REWARDS from "@/data/social/rewards.json";
import { supabase } from "@/lib/supabase/client";
import { SITE } from "@/lib/site";

export const BIG_MISSIONS = CONFIG.missions;
export type BigMissionId = "invite5" | "party10" | "chain3";
export const BIG_TOTAL = BIG_MISSIONS.reduce((s, m) => s + m.aed, 0);
export interface MyBigMissions { progress: Record<BigMissionId, number>; paid: BigMissionId[]; inviteEarned?: number; eligible: boolean; verified: boolean }
/** Invite 5 friends: paid per friend as each joins (the signup reward, src/data/social/rewards.json), five make the 10M. */
export const PER_FRIEND = REWARDS.signup.aed;

/** "AED 10M". */
export const millions = (n: number) => `AED ${n >= 1e6 ? `${Math.round(n / 1e5) / 10}M` : n.toLocaleString()}`;

/** Your sign-up link: whoever joins with it counts as your friend. */
export const inviteLink = (username: string) => `${SITE.url}/?ref=${encodeURIComponent(username)}`;

const MSG_KEY = "dl_invite_msg";
/** The invite message: the one you last wrote, or the pre-written one. */
export function savedMessage(): string {
  try { return localStorage.getItem(MSG_KEY) || CONFIG.message; } catch { return CONFIG.message; }
}
export function saveMessage(text: string) {
  try { if (text.trim() && text !== CONFIG.message) localStorage.setItem(MSG_KEY, text); else localStorage.removeItem(MSG_KEY); } catch { /* storage blocked */ }
}
export const DEFAULT_MESSAGE = CONFIG.message;

/** Opens WhatsApp (the app on a phone, WhatsApp Web elsewhere) with the message and your link, to pick who gets it. */
export function openWhatsApp(text: string, username: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(`${text.trim()}\n${inviteLink(username)}`)}`;
  window.open(url, "_blank", "noopener");
}

let cache: { user: string; data: MyBigMissions } | null = null;
const listeners = new Set<() => void>();
export async function refreshBigMissions(user: string) {
  const { data } = await supabase().rpc("my_big_missions");
  if (data && data.progress && Array.isArray(data.paid)) { cache = { user, data: data as MyBigMissions }; listeners.forEach((f) => f()); }
}
/** My progress on the Big Missions (refreshed every minute while shown). */
export function useBigMissions(user: string | null | undefined): MyBigMissions | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!user) return;
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    void refreshBigMissions(user);
    const id = setInterval(() => void refreshBigMissions(user), 60000);
    return () => { listeners.delete(f); clearInterval(id); };
  }, [user]);
  return user && cache?.user === user ? cache.data : null;
}

/** What's still to earn. */
export const leftToEarn = (m: MyBigMissions | null) => BIG_MISSIONS.filter((x) => !m?.paid.includes(x.id as BigMissionId))
  .reduce((s, x) => s + (x.id === "invite5" ? Math.max(0, x.aed - (m?.inviteEarned ?? 0)) : x.aed), 0);

const OPEN = "dubai:big-missions";
export const openBigMissions = () => window.dispatchEvent(new CustomEvent(OPEN));
export const BIG_MISSIONS_EVENT = OPEN;
