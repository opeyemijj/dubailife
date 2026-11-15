"use client";

// Top users this week and the richest users (requirements R6): the lists, Follow and Follow all. Shown as a page
// (/top), and by itself as the first thing a player sees: on a new player's first arrival home, at each player's
// first visit of the week, and when they're back after a week away (TopUsersWelcome).

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";
import { presetFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { follow, shortAed } from "@/lib/cityFeed";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { checkRewardsNow } from "@/components/social/RewardCelebration";

export type TopTab = "week" | "rich" | "givers";
interface TopRow {
  id: string; username: string; look?: AvatarLookProps | null; iFollow: boolean;
  score?: number; hosted?: number; guests?: number; wins?: number; invited?: number; gave?: number;
  total?: number; gifts?: number; drops?: number;
}

async function loadTop(tab: TopTab): Promise<TopRow[]> {
  const fn = tab === "week" ? "top_users_week" : tab === "rich" ? "richest_users" : "big_givers_week";
  const { data } = await supabase().rpc(fn, { p_limit: 10 });
  return (data ?? []) as TopRow[];
}

/** Why they're on the list, in a few words. */
function reason(r: TopRow, tab: TopTab): string {
  if (tab === "rich") return `Net worth AED ${shortAed(Number(r.total ?? 0))}`;
  if (tab === "givers") {
    const bits = [r.gifts ? `gifts AED ${shortAed(Number(r.gifts))}` : "", r.drops ? `cash drops AED ${shortAed(Number(r.drops))}` : ""].filter(Boolean);
    return `Gave AED ${shortAed(Number(r.total ?? 0))} this week${bits.length ? ` (${bits.join(", ")})` : ""}`;
  }
  const bits: string[] = [];
  if (r.hosted) bits.push(`hosted ${r.hosted} part${r.hosted === 1 ? "y" : "ies"}`);
  if (r.guests) bits.push(`${r.guests} guest${r.guests === 1 ? "" : "s"}`);
  if (r.wins) bits.push(`${r.wins} win${r.wins === 1 ? "" : "s"}`);
  if (r.invited) bits.push(`brought ${r.invited} friend${r.invited === 1 ? "" : "s"}`);
  if (r.gave) bits.push(`gave AED ${shortAed(Number(r.gave))}`);
  const s = bits.join(" · ");
  return s ? s[0].toUpperCase() + s.slice(1) : "Active this week";
}

export function TopUsersList({ start = "week", dark = false, onFollowed }: { start?: TopTab; dark?: boolean; onFollowed?: (n: number) => void }) {
  const { citizen } = useCitizen();
  const [tab, setTab] = useState<TopTab>(start);
  const [rows, setRows] = useState<TopRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void loadTop(tab).then((r) => { if (live) setRows(r); });
    return () => { live = false; };
  }, [tab]);

  const others = (rows ?? []).filter((r) => r.id !== citizen?.id);
  const notYet = others.filter((r) => !r.iFollow);
  const followIds = async (ids: string[]) => {
    if (!ids.length) return;
    setBusy(true);
    gameAudio.playClickSound();
    const n = await follow(ids);
    setBusy(false);
    setRows((cur) => cur?.map((r) => (ids.includes(r.id) ? { ...r, iFollow: true } : r)) ?? cur);
    onFollowed?.(n);
  };

  const card = dark ? "bg-white/[0.06] border border-white/10" : "bg-slate-50";
  const muted = dark ? "text-white/55" : "text-slate-500";
  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-3 gap-1 rounded-2xl p-1 ${dark ? "bg-white/5" : "bg-slate-100"}`} role="tablist">
        {([["week", "🏆 Top"], ["rich", "💎 Richest"], ["givers", "💸 Big Givers"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setRows(null); setTab(id); }}
            className={`h-10 rounded-xl text-sm font-black ${tab === id ? "bg-amber-400 text-slate-950" : muted}`}>{label}</button>
        ))}
      </div>
      <p className={`text-xs ${muted}`}>
        {tab === "week" ? "Who did the most with other players since Monday. They host the best parties and Spaces."
          : tab === "rich" ? "The richest make it rain. Follow them so you never miss a cash drop at their parties and Spaces."
          : "Who gave the most to other players this week: gifts and cash drops at parties. The top 3 wear the Generous badge."}
      </p>
      {rows === null ? (
        <p className={`text-center py-6 text-sm ${muted}`}>Loading…</p>
      ) : others.length === 0 ? (
        <p className={`text-center py-6 text-sm ${muted}`}>{tab === "week" ? "Nobody yet this week. Host a party and you could be first." : tab === "givers" ? "Nobody has given anything yet this week. Make it rain at a party and you're first." : "Nobody to show yet."}</p>
      ) : (
        <>
          {notYet.length > 1 && (
            <button onClick={() => void followIds(notYet.map((r) => r.id))} disabled={busy}
              className="w-full h-11 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-60">
              {busy ? "Following…" : `Follow all ${notYet.length}`}
            </button>
          )}
          <ol className="space-y-1.5">
            {others.map((r, i) => (
              <li key={r.id} className={`flex items-center gap-3 rounded-2xl p-2.5 ${card}`}>
                <span className={`w-6 text-center text-sm font-black ${i < 3 ? "text-amber-500" : muted}`}>{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-300 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-black truncate">@{r.username}{tab === "givers" && i < 3 && <span className="ml-1.5 align-middle rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">💛 Generous</span>}</span>
                  <span className={`block text-xs truncate ${muted}`}>{reason(r, tab)}</span>
                </span>
                {r.iFollow ? (
                  <span className={`h-9 px-3 rounded-full text-xs font-black flex items-center gap-1 ${dark ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-600"}`}><Check className="w-3.5 h-3.5" /> Following</span>
                ) : (
                  <button onClick={() => void followIds([r.id])} disabled={busy} className="h-9 px-4 rounded-full bg-sky-500 text-white text-xs font-black disabled:opacity-60">Follow</button>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      <Link href="/wiki/top-users" className={`block text-center text-sm font-black ${dark ? "text-amber-300" : "text-amber-700"}`}>How do I get on this list? ›</Link>
    </div>
  );
}

// ---------------------------------------------------------------- shown by itself

const SEEN_WEEK = (id: string) => `top-week:${id}`;
const LAST_VISIT = (id: string) => `last-visit:${id}`;
/** Monday's date in Dubai: the week this is. */
function weekKey(now = Date.now()): string {
  const d = new Date(now + 4 * 3_600_000); // Dubai is UTC+4 all year
  const day = (d.getUTCDay() + 6) % 7; // Monday 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

// Whether the welcome is waiting to show (null until it has looked): home keeps its move-in guide back meanwhile,
// so the top users come first.
let pending: boolean | null = null;
const listeners = new Set<() => void>();
const setPending = (v: boolean) => { if (pending !== v) { pending = v; listeners.forEach((l) => l()); } };
const sub = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useTopUsersPending(): boolean | null {
  return useSyncExternalStore(sub, () => pending, () => null);
}

export function TopUsersWelcome() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const id = citizen?.id;
  const [mode, setMode] = useState<"new" | "week" | "back" | null>(null);
  const here = /^\/(home|explore)\b/.test(path);

  useEffect(() => {
    if (!id) { setPending(false); return; }
    let want: "new" | "week" | "back" | null = null;
    try {
      const last = Number(localStorage.getItem(LAST_VISIT(id)) ?? 0);
      const seenWeek = localStorage.getItem(SEEN_WEEK(id));
      if (!seenWeek && isNewCitizen(citizen)) want = "new";
      else if (last && Date.now() - last >= 7 * 86_400_000) want = "back";
      else if (seenWeek !== weekKey()) want = "week";
      localStorage.setItem(LAST_VISIT(id), String(Date.now()));
    } catch { /* storage blocked: skip it */ }
    const t = setTimeout(() => { setMode(want); setPending(!!want); }, 0);
    return () => clearTimeout(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // First in line on the map or at home (lib/popups), ahead of today's popups.
  const turn = usePopupTurn("top-users", !!mode && here, POPUP.live);
  const [followed, setFollowed] = useState(0);
  const close = () => {
    if (id) { try { localStorage.setItem(SEEN_WEEK(id), weekKey()); } catch { /* storage blocked */ } }
    setMode(null);
    setPending(false);
  };
  if (!mode || !here || !turn) return null;
  const title = mode === "new" ? "Follow Dubai's top users" : mode === "back" ? "Welcome back! Here's who's on top now" : "Top users this week";
  const sub2 = mode === "new"
    ? "Follow them to see what's hot, find the best parties, and get to know the city."
    : "The players everyone's talking about. Follow them so you don't miss their parties.";
  const bonus = mode === "new" ? "Follow 5 or more and get AED 1M." : null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[196] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} aria-hidden />
        <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-2xl">
          <button onClick={close} aria-label="Close" className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <div className="pr-8">
            <p className="text-3xl">🏆</p>
            <h2 className="text-2xl font-black leading-tight">{title}</h2>
            <p className="text-sm text-slate-600">{sub2}</p>
            {bonus && <p className="mt-1 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">💰 {bonus}</p>}
          </div>
          <TopUsersList onFollowed={(n) => {
            setFollowed((f) => f + n);
            // Following 5 when you join pays once (the database checks).
            void supabase().rpc("claim_follow_reward").then(({ data }) => { if (Number(data) > 0) checkRewardsNow(); });
          }} />
          <button onClick={close} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">
            {followed > 0 ? `Done · following ${followed}` : "Maybe later"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
