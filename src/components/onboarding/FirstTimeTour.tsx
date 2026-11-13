"use client";

// Once per login on the map, for everyone: what's new if there's something you haven't seen, then slides that each
// take you somewhere to do something (src/data/guide/first-city.json). Swipe or drag between them.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FIRST_CITY from "@/data/guide/first-city.json";
import NEWS from "@/data/guide/whats-new.json";
import { openSheet, SEEN_KEY } from "@/components/layout/HudSheets";
import { isNewCitizen, useCitizen } from "@/lib/citizenStore";
import { POPUP, usePopupTurn } from "@/lib/popups";
import { inviteFriends } from "@/lib/invite";
import { goalClaimed, goalDone, goalOf, useGoals, type GoalId } from "@/lib/goals";
import { ModalPortal } from "@/components/ui/modal-portal";

const SLIDES = FIRST_CITY.slides as (typeof FIRST_CITY.slides[number] & { goal?: GoalId })[];
const SEEN = "map-actions-seen";
/** Set when the tour was finished in this visit (Discover then waits for the next one). */
export const TOUR_NOW = "map-tour-finished-now";
type Slide = { icon: string; title: string; text: string; cta: string; href?: string; isNews?: boolean };
type NewsItem = { id: string; icon: string; title: string; text: string; cta?: string; href?: string };
const SWIPE_PX = 50;

export function FirstTimeTour() {
  const router = useRouter();
  const { citizen } = useCitizen();
  const key = `tour-done:${citizen?.id ?? ""}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dx, setDx] = useState(0);
  const [showNews, setShowNews] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  const { status: goals } = useGoals(citizen?.id);
  const createdAt = citizen?.createdAt;

  // Once per login. It waits its turn (lib/popups): the goals, the morning scene and setting up the app go first,
  // and this comes last, so whatever came before, the player ends up with something to go and do.
  useEffect(() => {
    if (!citizen?.id) return;
    try { if (sessionStorage.getItem(SEEN) === "1") return; } catch { /* storage blocked */ }
    // A beat first, so everything due as the map opens is in line ahead of it.
    const start = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN, "1");
        const settled = !!createdAt && Date.now() - Date.parse(createdAt) > 2 * 86_400_000;
        setShowNews(settled && localStorage.getItem(SEEN_KEY) !== NEWS.items[0]?.id);
      } catch { /* storage blocked */ }
      setOpen(true);
    }, 2500);
    return () => clearTimeout(start);
  }, [citizen?.id, createdAt]);
  const popupTurn = usePopupTurn("first-tour", open, POPUP.promo);

  // What's new goes first, if there's something you haven't seen (new players have enough to take in).
  const news = NEWS.items[0] as NewsItem | undefined;
  const slides: Slide[] = [
    ...(news && showNews ? [{ icon: news.icon, title: news.title, text: news.text, cta: news.cta ?? "See what's new", href: news.href, isNews: true }] : []),
    ...SLIDES.filter((x) => { const g = x.goal ? goalOf(x.goal) : null; return !g || !(goalClaimed(goals, g.id) || goalDone(goals, g)); }),
  ];

  const finish = () => {
    setOpen(false);
    try {
      localStorage.setItem(key, "1");
      // A new player's Discover suggestions wait for another visit: one guide at a time.
      if (isNewCitizen(citizen)) sessionStorage.setItem(TOUR_NOW, "1");
      if (news && showNews) localStorage.setItem(SEEN_KEY, news.id);
    } catch { /* storage blocked */ }
  };
  if (!open || !popupTurn) return null;
  const at = Math.min(step, slides.length - 1);
  const s = slides[at];
  const last = at === slides.length - 1;
  const go = () => {
    finish();
    if (s.href) router.push(s.href);
    else openSheet("whats-new");
  };
  const endDrag = () => {
    if (!drag.current) return;
    if (dx <= -SWIPE_PX && !last) setStep(at + 1);
    if (dx >= SWIPE_PX && at > 0) setStep(at - 1);
    dragged.current = drag.current.moved;
    drag.current = null;
    setDx(0);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[190] bg-slate-950/60 flex items-end sm:items-center justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-label="What to do in Dubai">
        <div
          className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-2xl p-6 text-center space-y-3 touch-pan-y select-none cursor-grab active:cursor-grabbing"
          style={{ transform: `translateX(${(dx < 0 ? last : at === 0) ? dx * 0.25 : dx}px)`, transition: dx ? "none" : "transform 0.2s ease-out" }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, moved: false }; dragged.current = false; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const move = e.clientX - d.x;
            if (!d.moved && Math.abs(move) > 6) {
              d.moved = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (d.moved) setDx(move);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // A swipe isn't a tap on whatever it ended over.
          onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}
        >
          {s.isNews && <p className="text-xs font-black uppercase tracking-widest text-amber-600">What&apos;s new</p>}
          <div className="text-5xl">{s.icon}</div>
          <h2 className="text-xl font-black">{s.title}</h2>
          <p className="text-sm text-slate-600 min-h-[60px]">{s.text}</p>
          <button onClick={go} className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black">{s.cta} ›</button>
          {/* On every slide: the game is the other players. */}
          <div className="rounded-2xl bg-violet-50 p-2.5 text-left flex items-center gap-2">
            <span className="flex-1 text-xs font-bold text-violet-900">{invited ?? FIRST_CITY.together}</span>
            <button
              onClick={async () => {
                const r = await inviteFriends(citizen?.username);
                setInvited(r === "copied" ? "Invite link copied. Send it to your friends!" : r === "shared" ? "Nice! The more friends, the more fun." : "Couldn't share just now. Try again.");
              }}
              className="shrink-0 h-9 px-3 rounded-full bg-violet-600 text-white text-xs font-black"
            >
              👥 Invite friends
            </button>
          </div>
          <div className="flex justify-center gap-1.5 py-1">
            {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === at ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-200"}`} />)}
          </div>
          <div className="flex gap-2">
            <button onClick={finish} className="flex-1 h-11 rounded-2xl bg-slate-100 font-bold text-sm">Explore the map</button>
            {!last && <button onClick={() => setStep(at + 1)} className="flex-1 h-11 rounded-2xl bg-slate-100 font-black text-sm">More ideas ›</button>}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
