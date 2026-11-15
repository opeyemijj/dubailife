"use client";

// People to meet: this week's top users (never empty: last week's when this week has nobody yet), the richest, Big
// Givers, and who's online and available to chat right now. Each with Add friend and Message. Shown as a page
// (/top), and by itself as the first thing a player sees: on a new player's first arrival home, at each player's
// first visit of the week, and when they're back after a week away (TopUsersWelcome).

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, MessageCircle, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";
import { presetFor, rosterThumb, type AvatarLookProps } from "@/components/avatar/roster";
import { shortAed } from "@/lib/cityFeed";
import { getPlace } from "@/lib/city/places";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { ModalPortal } from "@/components/ui/modal-portal";
import { checkRewardsNow } from "@/components/social/RewardCelebration";

export type TopTab = "week" | "rich" | "givers" | "online";
type FriendStatus = "friends" | "requested" | "incoming" | null;
interface TopRow {
  id: string; username: string; look?: AvatarLookProps | null; friend?: FriendStatus;
  score?: number; hosted?: number; guests?: number; spaces?: number; listeners?: number; wins?: number; invited?: number; gave?: number;
  total?: number; gifts?: number; drops?: number;
  period?: "this_week" | "last_week" | "month" | "active" | "ever"; placeId?: string | null;
}

const RPC: Record<TopTab, string> = { week: "top_users_week", rich: "richest_users", givers: "big_givers_week", online: "online_players" };
async function loadTop(tab: TopTab): Promise<TopRow[]> {
  const { data } = await supabase().rpc(RPC[tab], tab === "online" ? { p_limit: 30 } : { p_limit: 10 });
  return (data ?? []) as TopRow[];
}

/** Send a friend request, or accept theirs. Returns the status now. */
export async function addFriend(id: string): Promise<FriendStatus> {
  const { data, error } = await supabase().rpc("add_friend", { p_user: id });
  return error ? null : ((data as FriendStatus) ?? null);
}

/** Why they're on the list, in a few words. */
function reason(r: TopRow, tab: TopTab): string {
  if (tab === "online") {
    const place = r.placeId ? getPlace(r.placeId)?.name : null;
    return place ? `Online now · at ${place}` : "Online now";
  }
  if (tab === "rich") return `Net worth AED ${shortAed(Number(r.total ?? 0))}`;
  if (tab === "givers") {
    const bits = [r.gifts ? `gifts AED ${shortAed(Number(r.gifts))}` : "", r.drops ? `cash drops AED ${shortAed(Number(r.drops))}` : ""].filter(Boolean);
    const when = r.period === "last_week" ? " last week" : r.period === "month" ? " this month" : r.period === "ever" ? "" : " this week";
    return `Gave AED ${shortAed(Number(r.total ?? 0))}${when}${bits.length ? ` (${bits.join(", ")})` : ""}`;
  }
  if (r.period === "active") return "One of the most active players";
  const bits: string[] = [];
  if (r.hosted) bits.push(`hosted ${r.hosted} part${r.hosted === 1 ? "y" : "ies"}`);
  if (r.guests) bits.push(`${r.guests} guest${r.guests === 1 ? "" : "s"}`);
  if (r.spaces) bits.push(`${r.spaces} Space${r.spaces === 1 ? "" : "s"}`);
  if (r.wins) bits.push(`${r.wins} win${r.wins === 1 ? "" : "s"}`);
  if (r.invited) bits.push(`brought ${r.invited} friend${r.invited === 1 ? "" : "s"}`);
  if (r.gave) bits.push(`gave AED ${shortAed(Number(r.gave))}`);
  const s = bits.join(" · ");
  return s ? s[0].toUpperCase() + s.slice(1) : "Active this week";
}

const INTRO: Record<TopTab, string> = {
  week: "Who did the most with other players since Monday. They host the best parties and Spaces.",
  rich: "The richest make it rain. Add them as friends so you never miss a cash drop at their parties and Spaces.",
  givers: "Who gave the most to other players this week: gifts and cash drops at parties. The top 3 wear the Generous badge.",
  online: "Real players in the city right now. Say hi: tap Message to start a chat.",
};
const PERIOD: Record<string, Record<string, string>> = {
  week: {
    last_week: "Nobody's on the board yet this week, so here are last week's top users.",
    month: "A quiet week so far: here are the top users of the last 30 days.",
    active: "A quiet week so far: here are the most active players.",
  },
  givers: {
    last_week: "Nobody has given anything yet this week, so here are last week's Big Givers.",
    month: "A quiet week so far: here are the Big Givers of the last 30 days.",
    ever: "Here are the biggest givers of all time. Make it rain this week to top the list.",
  },
};

export function TopUsersList({ start = "week", dark = false, onAdded }: { start?: TopTab; dark?: boolean; onAdded?: () => void }) {
  const { citizen } = useCitizen();
  const router = useRouter();
  const [tab, setTab] = useState<TopTab>(start);
  const [rows, setRows] = useState<TopRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadTop(tab).then((r) => { if (live) setRows(r); });
    // Who's online changes: fresh every 30 seconds while that tab is open.
    const every = tab === "online" ? setInterval(() => void loadTop(tab).then((r) => { if (live) setRows(r); }), 30_000) : null;
    return () => { live = false; if (every) clearInterval(every); };
  }, [tab]);

  const others = (rows ?? []).filter((r) => r.id !== citizen?.id);
  const add = async (id: string) => {
    setBusy(id);
    gameAudio.playClickSound();
    const st = await addFriend(id);
    setBusy(null);
    if (st) { setRows((cur) => cur?.map((r) => (r.id === id ? { ...r, friend: st } : r)) ?? cur); onAdded?.(); }
  };
  const message = (id: string) => { gameAudio.playClickSound(); router.push(`/phone?tab=chats&chat=${id}`); };

  const card = dark ? "bg-white/[0.06] border border-white/10" : "bg-slate-50";
  const muted = dark ? "text-white/55" : "text-slate-500";
  const pill = `h-9 px-3 rounded-full text-xs font-black flex items-center gap-1 ${dark ? "bg-white/10 text-white/70" : "bg-slate-200 text-slate-600"}`;
  const period = others[0]?.period;
  const note = period ? PERIOD[tab]?.[period] : undefined;
  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-4 gap-1 rounded-2xl p-1 ${dark ? "bg-white/5" : "bg-slate-100"}`} role="tablist">
        {([["week", "🏆 Top"], ["rich", "💎 Richest"], ["givers", "💸 Givers"], ["online", "💬 Online"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setRows(null); setTab(id); }}
            className={`h-10 rounded-xl text-[13px] font-black ${tab === id ? (id === "online" ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-950") : muted}`}>{label}</button>
        ))}
      </div>
      <p className={`text-xs ${muted}`}>{note ?? INTRO[tab]}</p>
      {rows === null ? (
        <p className={`text-center py-6 text-sm ${muted}`}>Loading…</p>
      ) : others.length === 0 ? (
        <p className={`text-center py-6 text-sm ${muted}`}>
          {tab === "givers" ? "Nobody has given anything yet this week. Make it rain at a party and you're first."
            : tab === "online" ? "Nobody else is online right now. Check back soon, or invite a friend."
            : "Nobody to show yet."}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {others.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-2.5 rounded-2xl p-2.5 ${card}`}>
              {tab !== "online" && <span className={`w-5 text-center text-sm font-black ${i < 3 ? "text-amber-500" : muted}`}>{i + 1}</span>}
              <Link href={`/u/${r.username}`} className="relative shrink-0" aria-label={`@${r.username}'s profile`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rosterThumb(presetFor(r.look ?? { gender: "woman" }))} alt="" className="w-10 h-10 rounded-full object-cover object-top bg-slate-300" />
                {tab === "online" && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
              </Link>
              <span className="flex-1 min-w-0">
                <Link href={`/u/${r.username}`} className="block font-black truncate hover:underline">@{r.username}{tab === "givers" && i < 3 && (!period || period === "this_week") && <span className="ml-1.5 align-middle rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">💛 Generous</span>}</Link>
                <span className={`block text-xs truncate ${muted}`}>{reason(r, tab)}</span>
              </span>
              {r.friend === "friends" ? <span className={pill}><Check className="w-3.5 h-3.5" /> Friends</span>
                : r.friend === "requested" ? <span className={pill}>Requested</span>
                : (
                  <button onClick={() => void add(r.id)} disabled={busy === r.id} aria-label={r.friend === "incoming" ? `Accept @${r.username}` : `Add @${r.username} as a friend`}
                    className="h-9 px-3 rounded-full bg-sky-500 text-white text-xs font-black flex items-center gap-1 disabled:opacity-60">
                    <UserPlus className="w-3.5 h-3.5" />{r.friend === "incoming" ? "Accept" : "Add"}
                  </button>
                )}
              <button onClick={() => message(r.id)} aria-label={`Message @${r.username}`}
                className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center"><MessageCircle className="w-4 h-4" /></button>
            </li>
          ))}
        </ol>
      )}
      {tab !== "online" && <Link href="/wiki/top-users" className={`block text-center text-sm font-black ${dark ? "text-amber-300" : "text-amber-700"}`}>How do I get on this list? ›</Link>}
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
  const title = mode === "new" ? "Meet Dubai's top users" : mode === "back" ? "Welcome back! Here's who's on top now" : "Top users this week";
  const sub2 = mode === "new"
    ? "Add them as friends and say hi. They know where the best parties are."
    : "The players everyone's talking about. Add them as friends so you don't miss their parties.";
  const bonus = mode === "new" ? "Add 5 as friends and get AED 1M." : null;
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
          <TopUsersList onAdded={() => {
            setFollowed((f) => f + 1);
            // Adding 5 as friends when you join pays once (the database checks).
            void supabase().rpc("claim_follow_reward").then(({ data }) => { if (Number(data) > 0) checkRewardsNow(); });
          }} />
          <button onClick={close} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">
            {followed > 0 ? `Done · ${followed} friend request${followed === 1 ? "" : "s"} sent` : "Maybe later"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
