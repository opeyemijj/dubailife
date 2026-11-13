"use client";

// Arriving home: what's new and plenty of things to do next, one tap away, so nobody is left wondering what to
// do. Comes back each time you open the app or log in, until you close it. Swipe the row, or drag it with a mouse.
// Actions come from src/data/home/home-actions.json.

import { useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import ACTIONS from "@/data/home/home-actions.json";
import NEWS from "@/data/guide/whats-new.json";
import { openSheet } from "@/components/layout/HudSheets";
import { useCitizen } from "@/lib/citizenStore";
import { inviteFriends } from "@/lib/invite";
import { currentGoal, goalDone, stepDone, useGoals, type GoalStep } from "@/lib/goals";
import { openGoalSetup } from "@/components/goals/GoalSetup";
import { openLife } from "@/components/life/LifeHub";
import { useRouter } from "next/navigation";

export const HOME_ACTIONS_HIDDEN = "home-actions-hidden";
const tile = "shrink-0 w-[7.5rem] rounded-2xl bg-slate-50 hover:bg-slate-100 p-2.5 text-left select-none";

export function HomeActions({ onShop }: { onShop: () => void }) {
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(HOME_ACTIONS_HIDDEN) === "1"; } catch { return false; } });
  const { citizen } = useCitizen();
  const [copied, setCopied] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { status } = useGoals(citizen?.id);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  if (hidden) return null;
  const hide = () => {
    setHidden(true);
    try { sessionStorage.setItem(HOME_ACTIONS_HIDDEN, "1"); } catch { /* storage blocked */ }
  };
  const news = NEWS.items[0];
  return (
    <div className="fixed inset-x-3 bottom-[8.25rem] sm:bottom-36 z-30 flex justify-center pointer-events-none">
      <div className="w-full max-w-xl rounded-[24px] bg-white/95 backdrop-blur text-slate-900 shadow-xl p-3 space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-black">{ACTIONS.title}</p>
          <button onClick={hide} aria-label="Hide suggestions" className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-3.5 h-3.5" /></button>
        </div>
        <NextUp status={status} onGo={(s) => { if (!s) router.push("/goals"); else if (s.action === "visa") openLife("visa"); else if (s.href) router.push(s.href); }} />
        {news && (
          <button onClick={() => openSheet("whats-new")} className="w-full flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-left">
            <span className="text-lg">{news.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700">What&apos;s new</span>
              <span className="block text-xs font-black truncate">{news.title}</span>
            </span>
            <span className="font-black text-amber-700">›</span>
          </button>
        )}
        <div
          ref={row}
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => { if (e.pointerType === "mouse" && row.current) drag.current = { x: e.clientX, left: row.current.scrollLeft, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !row.current) return;
            if (Math.abs(e.clientX - d.x) > 6) d.moved = true;
            row.current.scrollLeft = d.left - (e.clientX - d.x);
          }}
          onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
          onPointerLeave={() => { drag.current = null; }}
          // A drag isn't a tap on whatever it ended over.
          onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}
          onDragStart={(e) => e.preventDefault()}
        >
          {ACTIONS.actions.map((a) => {
            const body = (
              <>
                <span className="block text-2xl leading-none">{a.icon}</span>
                <span className="block text-xs font-black mt-1.5 leading-tight">{a.label}</span>
                <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">{a.text}</span>
              </>
            );
            return a.href
              ? <Link key={a.id} href={a.href} className={tile}>{body}</Link>
              : <button key={a.id} onClick={a.action === "invite" ? async () => setCopied((await inviteFriends(citizen?.username)) === "copied") : onShop} className={tile}>{body}</button>;
          })}
        </div>
        {copied && <p className="text-xs font-bold text-violet-700 px-1">Invite link copied. Send it to your friends!</p>}
      </div>
    </div>
  );
}

/** The one thing to do next, at the top: the next step of your current goal (or setting your goals). */
function NextUp({ status, onGo }: { status: ReturnType<typeof useGoals>["status"]; onGo: (s: GoalStep | null) => void }) {
  if (!status) return null;
  const cls = "w-full flex items-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 text-left";
  if (!status.order) {
    return (
      <button onClick={openGoalSetup} className={cls}>
        <span className="text-xl">🎯</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-100">Your next step</span>
          <span className="block text-sm font-black">Set your goals for Dubai</span>
        </span>
        <span className="font-black">›</span>
      </button>
    );
  }
  const goal = currentGoal(status);
  if (!goal) return null;
  const ready = goalDone(status, goal);
  const step = (goal.steps as GoalStep[]).find((s) => !stepDone(status, s));
  if (!ready && !step) return null;
  return (
    <button onClick={() => onGo(ready || !step ? null : step)} className={cls}>
      <span className="text-xl">{ready ? "🎁" : goal.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-100">{ready ? `${goal.title}: done` : `Your next step · ${goal.title}`}</span>
        <span className="block text-sm font-black truncate">{ready ? "Collect your reward" : step!.title}</span>
      </span>
      <span className="font-black">›</span>
    </button>
  );
}
