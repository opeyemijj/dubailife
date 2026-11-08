"use client";

// Getting players to install the app and turn on notifications: asks at moments when notifications
// obviously help ("@sara just messaged you"), pays a one-time AED bonus for each (server-checked), and
// when notifications are blocked shows the exact steps to unblock them on this device.

import { supabase } from "@/lib/supabase/client";
import { SITE } from "@/lib/site";
import { getNotificationPermission, isPushSupported, isStandalonePwa, subscribeToPush } from "./client";

export type Platform = "ios-browser" | "ios-app" | "android" | "mac-safari" | "desktop";

export function platform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return isStandalonePwa() ? "ios-app" : "ios-browser";
  if (/android/i.test(ua)) return "android";
  if (/macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg|firefox/i.test(ua)) return "mac-safari";
  return "desktop";
}

/** Where this device stands: notifications already on, can ask, blocked, or (iPhone browser) needs installing first. */
export type PushStatus = "on" | "ask" | "blocked" | "install-first" | "unsupported";

export function pushStatus(): PushStatus {
  const p = platform();
  if (p === "ios-browser") return "install-first";
  if (!isPushSupported()) return "unsupported";
  const perm = getNotificationPermission();
  return perm === "granted" ? "on" : perm === "denied" ? "blocked" : "ask";
}

/** Step-by-step instructions to unblock notifications on this device. */
export function unblockSteps(): { where: string; steps: string[] } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  switch (platform()) {
    case "ios-app":
      return { where: "iPhone", steps: ["Open the Settings app", "Scroll down and tap Notifications", `Tap ${SITE.shortName}`, "Turn on Allow Notifications"] };
    case "android":
      return /samsungbrowser/i.test(ua)
        ? { where: "Samsung Internet", steps: ["Tap the menu (☰) then Settings", "Tap Sites and downloads → Notifications", "Find this site and switch it on"] }
        : { where: "Android", steps: ["Tap the lock or settings icon left of the address bar", "Tap Permissions → Notifications", "Choose Allow", "If it's still off: Settings → Apps → Chrome → Notifications → turn on"] };
    case "mac-safari":
      return { where: "Safari", steps: ["Open Safari → Settings (⌘,)", "Go to Websites → Notifications", "Set this site to Allow"] };
    default:
      return /firefox/i.test(ua)
        ? { where: "Firefox", steps: ["Click the lock icon left of the address bar", "Next to Send Notifications, clear the Blocked setting", "Reload the page and turn notifications on"] }
        : { where: "your browser", steps: ["Click the lock or settings icon left of the address bar", "Find Notifications and choose Allow", "Reload the page"] };
  }
}

// ---------------------------------------------------------------- bonuses

let amounts: Promise<{ install: number; push: number }> | null = null;
export const bonusAmounts = () =>
  (amounts ??= Promise.resolve(supabase().rpc("app_bonus_amounts")).then(({ data }) => ({
    install: Number((data as Record<string, number> | null)?.install ?? 0),
    push: Number((data as Record<string, number> | null)?.push ?? 0),
  })));

/** Claims a one-time bonus. Resolves to the AED paid (0 if already claimed or not earned yet). */
export async function claimBonus(kind: "install" | "push"): Promise<number> {
  const { data, error } = await supabase().rpc("claim_app_bonus", { p_kind: kind });
  if (error || !data) return 0;
  const { refreshCitizen } = await import("@/lib/citizenStore");
  refreshCitizen();
  return Number(data);
}

/** Turns notifications on (must be called from a tap) and claims the bonus. */
export async function enablePush(userId?: string): Promise<{ ok: boolean; bonus: number; blocked: boolean }> {
  const res = await subscribeToPush(userId);
  if (!res.ok) return { ok: false, bonus: 0, blocked: getNotificationPermission() === "denied" };
  // The subscription is saved server-side before the bonus is checked.
  await new Promise((r) => setTimeout(r, 600));
  return { ok: true, bonus: await claimBonus("push"), blocked: false };
}

// ---------------------------------------------------------------- when to ask

const LAST_ASK = "dl_push_ask_at";
const ASKS_TODAY_KEY = "dl_push_asks_today_json";
const DISMISSALS_KEY = "dl_push_dismiss_stats";
const MIN_GAP_MS = 2.5 * 3_600_000; // 2.5 hours minimum between contextual prompts
const MAX_PER_DAY = 2; // Up to 2 high-intent social prompts per day
const DISMISS_LIMIT = 3; // 3 dismissals pause non-forced prompts for 14 days
const FATIGUE_PAUSE_MS = 14 * 86_400_000; // 14 days cooldown after 3 dismissals

interface DailyAsks {
  date: string;
  count: number;
  lastAt: number;
}

interface DismissalStats {
  count: number;
  lastDismissedAt: number;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyAsks(): DailyAsks {
  try {
    const raw = localStorage.getItem(ASKS_TODAY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyAsks;
      if (parsed.date === getTodayString()) return parsed;
    }
  } catch {
    /* ignore storage errors */
  }
  return { date: getTodayString(), count: 0, lastAt: 0 };
}

function getDismissalStats(): DismissalStats {
  try {
    const raw = localStorage.getItem(DISMISSALS_KEY);
    if (raw) return JSON.parse(raw) as DismissalStats;
  } catch {
    /* ignore storage errors */
  }
  return { count: 0, lastDismissedAt: 0 };
}

export function recordSocialPromptDismissal() {
  try {
    const stats = getDismissalStats();
    stats.count += 1;
    stats.lastDismissedAt = Date.now();
    localStorage.setItem(DISMISSALS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

/** Whether a helpful-moment ask may be shown now: notifications not on, not fatigued, within daily cap. */
export function mayAsk(isHighIntentSocial: boolean = false): boolean {
  const s = pushStatus();
  if (s === "on" || s === "unsupported") return false;

  const dismissals = getDismissalStats();
  if (dismissals.count >= DISMISS_LIMIT) {
    if (Date.now() - dismissals.lastDismissedAt < FATIGUE_PAUSE_MS) {
      return false; // Respect user preference after multiple dismissals
    }
  }

  const today = getDailyAsks();
  const maxAllowed = isHighIntentSocial ? MAX_PER_DAY : 1;
  if (today.count >= maxAllowed) return false;

  const gap = Date.now() - today.lastAt;
  return gap > MIN_GAP_MS;
}

export function markAsked() {
  try {
    const today = getDailyAsks();
    today.count += 1;
    today.lastAt = Date.now();
    localStorage.setItem(ASKS_TODAY_KEY, JSON.stringify(today));
    localStorage.setItem(LAST_ASK, String(Date.now()));
  } catch {
    /* ignore storage blocked */
  }
}

export interface AskReason {
  icon: string;
  title: string;
  text: string;
  actionLabel?: string;
}

/** Ask at a helpful moment (e.g. after receiving a message or door knock). */
export function askForPush(reason: AskReason) {
  if (typeof window === "undefined" || !mayAsk(false)) return;
  window.dispatchEvent(new CustomEvent("dubai:ask-push", { detail: reason }));
}

/** Ask during a high-intent social action (sending DM, friend request, party invite, mic stage). */
export function askSocialPush(reason: AskReason) {
  if (typeof window === "undefined" || !mayAsk(true)) return;
  window.dispatchEvent(new CustomEvent("dubai:ask-push", { detail: { ...reason, highIntent: true } }));
}

/** Open the coach on purpose (from a settings button): ignores the rate limit. */
export function openPushCoach(reason?: AskReason) {
  window.dispatchEvent(new CustomEvent("dubai:ask-push", { detail: { force: true, ...reason } }));
}
