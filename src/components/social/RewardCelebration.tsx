"use client";

// A reward for taking part (requirements R5) has been paid: celebrate it. The database pays (settle_social_rewards,
// every 5 minutes, and game wins as they happen); this looks for new ones every minute and shows each in turn
// (lib/popups), with what it was for and the way to the next one.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen, useCitizen } from "@/lib/citizenStore";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { shortAed } from "@/lib/cityFeed";
import { ModalPortal } from "@/components/ui/modal-portal";

interface Paid { id: number; kind: string; amount: number; why: string }

const NEXT: Record<string, { text: string; href: string }> = {
  party: { text: "Bring more friends next time: 10 friends pays AED 10M.", href: "/wiki/top-users#rewards" },
  space: { text: "20 listeners pays AED 10M. Share your Space link on WhatsApp.", href: "/wiki/top-users#rewards" },
  invite_join: { text: "Every friend who joins from your invite pays AED 1M.", href: "/wiki/top-users#rewards" },
  signup: { text: "Every new player who joins with your link pays AED 2M.", href: "/wiki/top-users#rewards" },
  game_win: { text: "Your first 5 wins against real players each day pay AED 1M.", href: "/games/ludo" },
  attend: { text: "Host your own party next: 10 friends pays AED 10M.", href: "/wiki/top-users#rewards" },
  follow_top: { text: "Now host a party: 10 friends pays AED 10M.", href: "/wiki/top-users#rewards" },
};

/** Ask the database for rewards not yet celebrated, now (also after following the top users). */
export const checkRewardsNow = () => window.dispatchEvent(new CustomEvent("dubai:check-rewards"));

export function RewardCelebration() {
  const { citizen } = useCitizen();
  const id = citizen?.id;
  const [queue, setQueue] = useState<Paid[]>([]);

  useEffect(() => {
    if (!id) return;
    let live = true;
    const check = async () => {
      const { data } = await supabase().rpc("my_unseen_rewards");
      const rows = (data ?? []) as Paid[];
      if (!live || !rows.length) return;
      setQueue((q) => [...q, ...rows.filter((r) => !q.some((x) => x.id === r.id))]);
      void refreshCitizen();
    };
    const first = setTimeout(() => void check(), 4000);
    const every = setInterval(() => void check(), 60_000);
    const now = () => void check();
    window.addEventListener("dubai:check-rewards", now);
    return () => { live = false; clearTimeout(first); clearInterval(every); window.removeEventListener("dubai:check-rewards", now); };
  }, [id]);

  const top = queue[0];
  // Someone's waiting on you level: a reward lands right after the moment it was earned.
  const turn = usePopupTurn("reward", !!top, POPUP.live);
  useEffect(() => { if (turn && top) gameAudio.playCoinSound(); }, [turn, top]);
  if (!top || !turn) return null;
  const next = NEXT[top.kind];
  const done = () => setQueue((q) => q.slice(1));
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[197] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Reward">
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={done} aria-hidden />
        <div className="relative w-full max-w-sm rounded-[28px] bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 p-6 text-center space-y-3 shadow-2xl animate-[sheetUp_0.3s_ease-out]">
          <p className="text-6xl">💰</p>
          <p className="text-xs font-black uppercase tracking-widest">Reward</p>
          <p className="text-5xl font-black tabular-nums">+AED {shortAed(top.amount)}</p>
          <p className="font-bold">You {top.why}.</p>
          {next && <p className="text-sm text-slate-900/80">{next.text}</p>}
          <div className="flex gap-2 pt-1">
            {next && <Link href={next.href} onClick={done} className="flex-1 h-12 leading-[3rem] rounded-2xl bg-white/70 font-black text-sm">How it works</Link>}
            <button onClick={done} className="flex-1 h-12 rounded-2xl bg-slate-950 text-white font-black">Collect</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
