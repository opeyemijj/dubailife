"use client";

// The phone's home screen in order of use: a fixed top row (Messages, Spaces, Wallet, City), then every other app
// by how much players use it (the last 14 days, everyone: public.app_popularity), nudged by this player's own use.
// Until there's enough data, a starting order. The order is worked out when the phone opens and never shuffles
// while it's open.

import { supabase } from "@/lib/supabase/client";

/** Always first, in this order. */
export const PHONE_TOP = ["messages", "spaces", "wallet", "city"];

/** Before there's 14 days of data: the likely order after the top row. */
const STARTING = ["games", "invites", "jobs", "metro", "people", "hayati", "cars", "food", "rides", "goals"];

/** Rarely opened: kept together in a "More" folder. */
export const PHONE_FOLDER = ["scams", "ideas", "news", "guide", "skills"];

/** Apps added recently show "New" for a week after this date (YYYY-MM-DD). */
export const PHONE_ADDED: Record<string, string> = {
  city: "2026-11-16",
};
export const isNewApp = (id: string, now = Date.now()) => {
  const at = PHONE_ADDED[id];
  return !!at && now - Date.parse(at) < 7 * 86_400_000;
};

const MINE = "phone-opens";
let popularity: Map<string, number> | null = null;
let loading: Promise<void> | null = null;

/** Everyone's use, fetched once a session. */
export function loadPopularity(): Promise<void> {
  if (popularity || loading) return loading ?? Promise.resolve();
  loading = (async () => {
    const { data } = await supabase().rpc("app_popularity");
    const rows = (data ?? []) as { app: string; players: number; opens: number }[];
    // Players weigh more than opens: one person opening an app 50 times shouldn't move it much.
    popularity = new Map(rows.map((r) => [r.app, Number(r.players) * 10 + Math.min(Number(r.opens), Number(r.players) * 20)]));
  })().catch(() => { popularity = new Map(); });
  return loading;
}

function mine(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(MINE) ?? "{}") as Record<string, number>; } catch { return {}; }
}

/** Counts an open: on the server (for everyone's order) and on this device (for this player's own). */
export function noteAppOpen(id: string) {
  void supabase().rpc("log_app_open", { p_app: id });
  try {
    const m = mine();
    m[id] = Math.min((m[id] ?? 0) + 1, 500);
    localStorage.setItem(MINE, JSON.stringify(m));
  } catch { /* storage blocked */ }
}

/** The ids in home-screen order: the top row, then by use; the folder's apps are left out (they go in More). */
export function orderApps(ids: string[]): string[] {
  const own = mine();
  const pop = popularity ?? new Map<string, number>();
  const enough = pop.size >= 8;
  const start = (id: string) => { const i = STARTING.indexOf(id); return i < 0 ? STARTING.length : i; };
  const score = (id: string) => (pop.get(id) ?? 0) + Math.min(own[id] ?? 0, 30) * 3;
  const rest = ids.filter((id) => !PHONE_TOP.includes(id) && !PHONE_FOLDER.includes(id));
  rest.sort((a, b) => (enough ? score(b) - score(a) : 0) || start(a) - start(b) || (own[b] ?? 0) - (own[a] ?? 0));
  return [...PHONE_TOP.filter((id) => ids.includes(id)), ...rest];
}
